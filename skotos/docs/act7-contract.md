# Skotos Act VII: code contract

«Πράξη VII: Οι Εφτά Κορυφές» / "Act VII: The Seven Peaks". Written 17 November 2026 from `docs/act7-design.md` (the head: the lead's rulings), `docs/act7-briefs/decisions.md`, the four parts in `docs/act7-design/` and `docs/act7-briefs/reports/stage0-look.md`. The shape is `docs/act6-contract.md`'s.

This file is the one reference for every name and number that two files or two builders must agree on. Builders code against it. Gates test against it. **Where this file and the design disagree, this file wins. Where the design and the shipped code disagree, the code is the truth:** follow the code and write the difference in your stage report. The design cites `file:line` at v22 (17 November); if a line has moved, find the name, not the number.

**Order of authority used to write it.** The head's rulings first. Then, by subject: part 1 (`10-story.md`) owns text and flags; part 2 (`20-zones-enemies-bosses.md`) owns zones, enemies and bosses; part 3 (`30-mechanics-progression.md`) owns mechanics, progression, co-op and saves; part 4 (`40-production.md`) owns engine, assets and gates. Then `decisions.md`. Every place where two parts disagreed and the head did not rule is listed at the end ("Choices made while writing the contract"). «pick» marks a name this contract chooses because no part names it. No number is invented: a number no file gives is written "set at stage X by Y" and listed at the end ("Numbers not yet set").

**Working rules** are Act VI's, unchanged (`act6-contract.md`, "Working rules for every lane"): never commit or push, one headless browser at a time, progress notes and stage reports in `docs/act7-briefs/reports/`, build before every commit. Numbers are Warden difficulty («Φρυκτωρός») unless a row says otherwise.

## The act in short (head, "The act in ten lines")

- Spring, weeks after Act VI. The warm Gates melt the peaks' old snow too fast. No villain. Nobody dies.
- Two zones in daylight: `thaw` (level 40) and `tarn` (level 43).
- Two bosses, neither killed: `kallisto` and `kelados`.
- Three mechanics on shipped systems: the Race (`tide.js`), the Slide (`forge.js`), Sun and Shade (`light.js`).
- At the cap: the Names (seven, three said at a time) and the Call. After the act: the Seven Fires, two echoes, Rested.
- No download. No new rendering system. 65-75 focused days; the cut order takes 9.

## Lead decisions (head, "Rulings of the lead"; decisions.md)

| subject | decision |
|---|---|
| Title | «Πράξη VII: Οι Εφτά Κορυφές» / "Act VII: The Seven Peaks"; `game.sub7` «Ο Βορράς ξυπνά» / "The North wakes" |
| Mechanic 2, Greek | «Η Χιονοστιβάδα». English "the Slide". Never «Η Κατολίσθηση» in a player-facing line |
| The Call, Greek | «Το Φώναγμα» |
| The exit and camp above the Den | «Η Νεροσκάλα» / "the Water-stair"; exit key `exit.tarn`; shut line `d.waterStairShut`. The Pass keeps «Η Σκάλα των Γιγάντων» |
| Area B of `thaw` | «Το Νερολίβαδο» / "The Water-meadow". No hut or fold stands in water anywhere |
| Kallisto | `mon.kallisto` «Καλλιστώ, η Αρκούδα που Ξύπνησε» / "Kallisto, the Waking Bear" |
| Kelados | `mon.kelados` «Κέλαδος, ο Κοιμισμένος του Βουνού» / "Kelados, the Sleeper under the Mountain". "Kelados" is the shepherds' word; the Stoneborn say "the Sleeper" |
| Water wording | water "drives out" foes. Never "drowned", "swept away", «πνίγηκε», «παρασύρθηκε» |
| Act panel keys | `act7.*` |
| The last line and Rested's greeting | one key, `d.child7.wake` = «Ώστε ξύπνησες.» / "So you're awake." |
| FX ambient for `thaw` | `'melt'` (`'thaw'` is Act VI's lit Bottom) |
| The Names' module | `src/game/names7.js`; every export starts with `N7` (`NAMES` is taken by `light.js`) |
| Echo prompts | part 1's text ("Remember Kallisto", "Hear what the mountain dreams"); part 2's rules |
| Kallisto's rising stream | cut. Her stream only wades. No water moves in her fight. Phase 2 is «Στριμωγμένη» / "Cornered" |
| The weirs | part 2's layout: weir 1 on the south bank, three in sequence, the Narrows gates the Den at level 0.3 |
| Arena hearths | one in each boss arena, flaring once on the fight's beat. Neither fight needs it |
| Halda's fail-safe | she pulls one lever herself 25 s into Kelados's third phase if none was pulled. One call a phase, each fired once |
| Brokka | stays in the Halls. No `folk` set loads in town |
| The stream at Whitecliff | a water sound below the south wall and a strip of the melt shader outside the walkable cells: brown in the hook, clear at home. Checked at stage D. If it cannot be shown the lines stand as narration |
| The mason's marks | six memories on the critical path, not optional finds |
| The Icebound | do not wake at 4 m as the shipped statue does. Only sun, a blow, fire or the Cradle wakes them |
| `play7` | a skeleton from stage A with named `todo` rows that fail G5 |
| `thaw`'s ground | open meadow and scree. No closed canopy over walkable ground. Slot A is a light ground (stage 0 finding, below) |
| Save and wire | `SAVE_FMT` 2 and co-op `VER` 6, both in stage E's last commit, one bump each |
| Canon | the hero never speaks. No line of the Skotos. No line says "Karthax". Isarn stays dead. Nothing in the act is of the dark. The Order of the Flame, Ragna, fire in grass and the child's name are Act VIII's and appear nowhere |

**Traps already fixed (17 November):** `forge.js:63` (flues stop for `crownUnmade` only in the Forge); stale comments at `world.js:99` and `data.js:60-62`. The rest of the trap list is stage A's first work (Plumbing, below).

## Stage 0 outcome so far (stage0-look.md; head, "Stage 0, first finding")

| finding | what it binds |
|---|---|
| Daylight reads on open, light ground at quality 0 and 1 | both zones go ahead in daylight |
| Daylight does not read under dense trees or on dark ground | `thaw` is open meadow and scree; tree groups stand off the trail; no closed canopy over walkable cells |
| The fading-prop dither shows in daylight | softened for `'sun'` zones in the daylight item (stage A); checked on a real phone at stage E |
| Telegraph red on warm ground is the weakest pair, still clear | keep the dark outline ring; re-check at stage C on the real ground. If it drops, shift `thaw`'s ground toward green-grey. Never change the telegraph colour |
| The warm `thaw` row tints the vignette pink at the corners | mild; no action |
| `thaw` slot A | must be a light ground. If tinted `leaves` stays dark under the sun, `thaw` loads `rime` for its snow (58 MB cold, under the 75 MB gate) and the optional `melt` meadow layer is built. Decided at G0 by `day0` |
| `day0`'s `forest`-under-`thaw` shot | expected to fail as a zone picture. Kept only as the tree-shadow test |

## Stages and gates (part 4, "Production plan"; numbers as the head rules them)

| stage | days | work (part 4's item numbers) | gate |
|---|---|---|---|
| **0. Decisions, contract, look gates, debts** | 2.5-3 | the owner's answers as they come; this contract; `day0`; the two boss bodies in the creature viewer; the seven old tests retired or repointed; `stage` / `until` / `--stale`; `tools/fixtures7.mjs` with `fx7_new` | **G0** |
| **A. The ground** | 18-21 | items 1-6: plumbing and traps, `gen7.js` and `check-act7`, daylight, `ground7` and `setThaw`, SEA_MELT and the phone's melt colours, `build7.js`; `play7` as a skeleton; first `perf7` and `mem7` | **G1** |
| **B. Systems and enemies** | 11.5-13.5 | items 7-11: the Race, the Slide, Sun and Shade, the seven enemies, `balance-act.mjs` for Act VII | **G2** |
| **C. Bosses, the Names, the ladder** | 14.5-16.5 | items 12-14: both bosses, the Names and the Call, lookouts, ranks, echoes, Rested | **G3** |
| **D. Story, text, music, co-op, saves** | 11.25-13.25 | items 15-18 | **G4** |
| **E. Release** | 3-4 | item 19's last part, item 20 | **G5** |

Part 4's rows sum to 61-71. The head adds four days (the `share`/`cap` hurt path, cover blocks, the `spare` ending, seven bot play styles) for **65-75**. Which stage each of the four days lands in is not set (see "Numbers not yet set").

**The gates, in numbers.**

| gate | passes when |
|---|---|
| **G0** | `day0` passes its five numbers at quality 0 and 1 on its four zones, or the haze fallback is written here. Kallisto ×2.1 and Kelados ×2.3 pass by eye, or their fallbacks are written here. `--stale` lists nothing but `day0`. Each of the seven old tests has its line here (Old tests, below). `melt` declared "in hand" or "not coming". `thaw` slot A decided |
| **G1** | `check-act7`: 300 seeds for each zone and reading (1,200 layouts), no hard failure, mean tries ≤ 3. `perf7` ≤ 1.00 of the Field at quality 1 at five spots with stand-in packs; quality 0 no slower than quality 1 + 5%; the desktop pass (quality 2, 1280 × 720) ≤ 1.15. `mem7` ≤ 75 MB of phone texture into each zone. `save16` (format 1 half). `gate7`. `ground7`. `play7` walks its skeleton end to end. `check-act6` and the seed-parity run clean after the helper move. `unload6` with its new leg (Pass → `thaw` → Pass). The owner's phone is asked for `tarn`'s spots 4 and 5. regress-A |
| **G2** | `race`, `slide`, `sun` soaks. `daytele`. `cast7` cold. `skillsfx` in a `'sun'` zone for each class. `perf7` again with real packs. **Zone danger in band before a boss exists** (run A; "Zone danger" below). `day0` deleted. regress-B |
| **G3** | Run B: both bosses in their bands ("The bosses" below). **Run C: the bot's damage doubled (`job.dmgK: 2`) brings each of the six Warden cells to 50-65% of its time.** Run D: every Name shown or cut. `kallisto`, `kelados`, `leg7`, `diff7`, `names7`, `fires7`. `coop.mjs bosses7` at two and four. The act's lives of damage over Act V's (1.13 / 1.17 / 1.23) is **reported, never gated**. regress-C |
| **G4** | `hook7`, `catch7`, `ending7`, `echo7`, `rested7`. `coop.mjs act7`, and `NET=supa` four players during a slide soak under 100 events a second. Two readers on every line. The owner reads the key Greek lines (the hook, Memory 6, Kelados's rest, the home scene). regress-D |
| **G5** | Every scenario of Acts I-VII, progression, co-op, saves and cloud passes, with no "out of date" row, nothing listed by `--stale`, and no `todo` row left in `play7`. Both builds. The strict-CSP check on desktop and phone emulation. `save16` both ways. The water-with-care checklist (below) signed. The owner's phone runs `perf7`'s five spots |

**Never cut:** the stage-0 look gate, `perf7`, `mem7`, balance runs A-C, `play7`, the four test rules, the proofreading, the phone's water path, `heavyZone` on `tarn`.

## New files

| file | holds |
|---|---|
| `src/world/gen7.js` | `genThaw`, `genTarn` |
| `src/world/build7.js` | `act7Prop`, `act7Level`, the cloud disc, Kelados's code parts |
| `src/game/names7.js` | the Names and the Call; exports prefixed `N7` |
| `tools/check-act7.mjs` | the layout checks |
| `tools/fixtures7.mjs` | the three fixtures |

## Shared names

### Zones, exits, waypoints (part 2, "Zones"; part 4, "Item 1 in full"; part 1, q41 and q43)

**ZONES** (`world.js`), two rows:

| zone | entry |
|---|---|
| `thaw` | `{ level: 40, music: 'thaw', ambient: 'melt', atmos: 'thaw', act: 7, pack: 'melt', light: 'sun' }` |
| `tarn` | `{ level: 43, music: 'tarn', ambient: 'summit', atmos: 'tarn', act: 7, pack: 'melt', light: 'sun' }` |

| what | `thaw` | `tarn` |
|---|---|---|
| name | `zone.thaw` «Τα Λιόνερα» / "The Meltwaters" | `zone.tarn` «Η Κρεμαστή Λίμνη» / "The Hanging Lake" |
| subtitle | `zone.thaw.s` «Εκεί που λιώνει το βουνό» / "Where the mountain melts" | `zone.tarn.s` «Χίλιοι χειμώνες νερό» / "A thousand winters of water" |
| time of day | a spring morning | noon on a snowfield |
| size in cells | 112 × 184 | 104 × 176 |
| north | z 0; the climb goes north | z 0 |
| `zonePacks` | `[]` (boot only); `['rime']` if G0 says so | `['rime']` |
| `READY.melt` | `{ folk: [], creatures: 'act7' }` | the same |
| `heavyZone` | off | **on** from the first build; off only if the owner's phone holds spots 4 and 5 without it (asked at G1) |
| `uSnow` | `min(0.45, k)` with `k` from `setThaw` | 1 |
| cold-start phone texture | about 16.5 MB (58 MB with `rime`) | about 58 MB |
| fight atmosphere | `thawFight`, zoom 1.2 | `tarnFight`, zoom 1.25 |
| entry | exit `exit.thaw` «Το Γιδόστρατο» / "The Goat Track" at the Pass's camp, locked on `haldaOut`; shut line `d.trackShut` | exit `exit.tarn` «Η Νεροσκάλα» / "The Water-stair" behind the Den, locked on `kallistoRest`; shut line `d.waterStairShut` |
| waypoint | `wp.thaw` «Το Γιδόστρατο» / "The Goat Track" (the camp) | `wp.tarn` «Η Κορφή της Νεροσκάλας» / "The Stair's Head" (the camp) |

- **Route.** Whitecliff → the `pass` waypoint → the goat track (an interact on cells already walkable, found as `ropeSpot` finds the rope hole) → `thaw` → the cut stair behind the Den → `tarn`. Home by waypoint.
- **Seeds.** `thaw@<diff>`, `tarn@<diff>`: `seedKey` gives Act VII a seed per difficulty. No older zone's layout changes; `gate7` asserts it.
- **Checkpoints.** `flags.cp7` (the `cp6` pattern): each camp, each lookout hearth once lit, the mouth of each boss arena.
- **`act7Zone`** sets `z.water = true` and `z.cells = true`, never `z.cold`. `shadeTick` and `placeCasks` run for any `z.water` zone: both are read at stage A and confirmed harmless in a `'sun'` zone before the flag is set.
- **Creature group.** `ACT_FILES.act7 = ['bear', 'golem', 'worm', 'skua']`. Wolves, goblins, the troll and the spider are boot bodies.
- **Monster level.** Monsters track the hero, so both zones are fought at 50 (52 from Nightmare up).
- **What does not run here:** `cold.js`, `ice.js`, the Carried Fire, the Names from Above, the Shroud, the light ring.

### Atmospheres (part 4, "The look: daylight")

Starting numbers; `day0` tunes them.

| key | `thaw` | `tarn` |
|---|---|---|
| fog, density | 0x9fb6c6, 0.012 | 0xc6d6e6, 0.010 |
| sky / ground (hemisphere) | 0xbcd6f2 / 0x4c5e38 | 0xd2e6ff / 0xa2b2ca |
| hemisphere | 1.25 | 1.1 |
| sun colour, strength | 0xfff0d2, 2.3 | 0xfff8ea, 2.1 |
| exposure | 1.0 | 0.92 |
| `heroI` | 0 | 0 |
| zoom | 1.05 | 1.05 |
| `sun` (new key; `R.sunOff`) | `[-18, 22, 10]` | `[-6, 32, 4]` |

- **Derived rows:** `thawShade`, `tarnShade` (hemisphere 0.95, sun 1.1, the same `sun`; eased with `mixAtmos` while the hero is under a cloud); `thawCine`, `tarnCine` (density 0.006, 0.005); `thawFight`, `tarnFight`; `tarnGold` (sun 0xffd49a at 1.7, sky 0xe8c8a0); `townMorning`, `townDusk` (the hook and the home scene; numbers set at stage D by story).
- **The shade ease time** differs between parts (0.6 s in part 3, a third of a second in part 4): see Choices.
- **Haze fallback** if `day0` fails after one day of tuning: fog 0x2a3440 at 0.014 for `thaw`, 0x34404e at 0.012 for `tarn`; sun, hemisphere and exposure kept. No other plan change.
- **The `'day'` telegraph.** Chosen inside `teleMat` from a module flag set at `zoneEnter`, never from the colour: nothing changes on the wire. Three lane colours that never share: **white** 0xf4f8ff for snow, **blue** for sluice water, **red** for a blow, each with the dark edge. `body.day` gives DOM numbers and names a 1 px dark text shadow.
- **Cloud disc:** blue-grey 0x1c2a3a at about 0.3 alpha, normal blending. Two discs at quality 0.
- **`setThaw(k)`** sets `WIND.uThaw` and nothing else (never `WIND.uAutumn`). `k`: 0.65 on first arrival, 0.45 / 0.3 / 0.15 after weirs 1 / 2 / 3, 0.05 in the `green` reading.
- **Ground slots (`ground7`).** `thaw`: A `leaves` under `hueA` [0.62, 1.0, 0.5] or `melt/meadow` (decided at G0), B `mud`, P `trail`, W `wall` at 4.4, thaw slot a white fake of A (or `rime/snow`). `tarn`: A `rime/snow`, B `rime/ice` and `rime/shore`, P `rime/snowTrod`, W `rime/seaCliff`, thaw slot `leaves` tinted green or `melt/meadow` in the `let` reading. No scree layer is loaded in `thaw`.
- **On a phone** none of G_WET, G_GLINT, G_AUR, G_WIN, G_EDGE is compiled and the water is `safeSea` with a melt colour pair and one step at 0.45 m (cache key `'safeSeaM'`). **No rule may depend on the wet rim, the glint or the water's colour.**

### The level object L (`gen7.js`; part 2, "What both layouts carry")

`genThaw(seed, { mode })` and `genTarn(seed, { mode })` «pick: the signature is gen6's». 24 tries at `seed + k·7919`, the last accepted; `L.tries` for `check-act7`'s mean. Shared helpers: `reach`, `nearReach`, `refugeNear`, `bfs`, `walk6`, `wideDry`. gen6's private helpers (`finish6`, `heights6`, `refuges`, `spotNear`, `lightUp`) move to `genlib.js` with `check-act6` and a seed-parity run in the same commit; if any Act VI layout moves, gen7 copies them and gen6 stays.

| field | type | meaning |
|---|---|---|
| `L.type` | `'thaw'` \| `'tarn'` | |
| `L.w`, `L.h` | | `thaw` 112 × 184; `tarn` 104 × 176 |
| `L.mode` | `'spate'` \| `'green'`; `'full'` \| `'let'` | the reading built |
| `L.tries` | number | |
| `L.cells`, `L.low`, `L.paint`, `L.hgt`, `L.props`, `L.lights`, `L.exits`, `L.packs`, `L.start`, `L.boss`, `L.spots` | as gen5 and gen6 | `L.low` also marks gorges and crevasses. `L.boss` is the arena `{ x, z, r }`: the Den r 17 at (56 ± 4, 22 ± 1); the Dam r 16 at (52 ± 3, 22 ± 1) |
| `L.bed` | Float32 w·h | metres in 0.15 steps; `BED_DRY` for dry ground |
| `L.pocket` | Uint8 w·h | 1 = on the brooks' clock; 2 = the own-level channel (the Race in `thaw`, the lake in `tarn`) |
| `L.tideCfg` | `{ phases: [50, 18, 34, 18], stepT: 4.5, hMax: 0.6 }` | the brooks' clock: 50 s low, 18 s rising in four steps of 0.15 m, 34 s high, 18 s falling |
| `L.thick`, `L.window`, `L.deck`, `L.sea` | Uint8 w·h, zero-filled | Act V's arrays, present so their readers work |
| `L.ice` | undefined | no ice mesh; `ice.js` never ticks |
| `L.flues` | `[{ x, z, dir, len, w, cover, kind, armed, horn }]` | chutes and sluice channels. `kind: 'snow' \| 'water'`. `horn: { x, z }` is the horn-stone's cell (snow) or the lever's (water). A snow flue has no `period` |
| `L.vault` | Uint8 w·h | patches of loose rock and ice under cliffs |
| `L.shade` | Uint8 w·h, **new** | 1 = fixed shade (under cliffs, in gullies, under thick pines) |
| `L.snow` | Uint8 w·h, **new** | 0 never snow; 1-3 snow bared when that many weirs are open; 4 snow until the after reading; 5 snow always. The Snow-worm's ground and the ground shader's snow mask read the same byte |
| `L.noCloud` | Uint8 w·h, **new** | 1 = no cloud's line may cover the cell (the Den's bowl and 4 m round it) |
| `L.packs` | `[{ x, z, n, tag, elite, dormant, tide, ... }]` | as gen5 and gen6 write them; spawned by `spawnPack` |

**A cell and water.** Wadeable while the level stands less than 0.45 m over its bed; closed from there up. A bed of −0.45 or lower is deep at every level.

### `L.spots` (the tests go by these names)

`spot(name)` is the only way a scenario goes anywhere (test rule 3). `name[i]` is 1-based in prose and in `spot('weir2')`; the array is 0-based.

**`thaw`** (part 2, "thaw"; part 1, Notes 3b):

| spot | type | meaning |
|---|---|---|
| `camp` | `{ x, z, r }` | the Goat Track camp, r 8, always dry: Halda's fire, the field anvil, the waypoint, the arrival cine's camera |
| `weirs` (`weir1`..`weir3`) | `[{ x, z }]` × 3 | each weir's wheel on its sill. Weir 1 on the Race's south bank at the west end; weir 2 in the middle gully (x 50-62); weir 3 in the east gully (x 90-100). The mason's mark and three memory figures are placed off this spot by story at stage D |
| `fords` (`ford1`..`ford3`) | `[{ x, z }]` × 3 | west, middle, east; beds 0.6, 0.3, 0.0 |
| `narrows` | `{ x, z }` | the one ford of the Narrows' moat (rows 54-58), open at level 0.3 |
| `lookouts` (`lookout1`..`lookout3`) | `[{ x, z }]` × 3 | each lookout's hearth: 1 the Meadow's west knoll, 2 the shoulder between two flank chutes, 3 the terraces' lip |
| `hornStones` | `[{ x, z, flue }]` | one per snow flue, at the lane's foot |
| `dens` | `[{ x, z }]` | den mouths of the Den-bear packs (weir 1, the west gully, the east wall of the terraces) |
| `slabs` | `[{ x, z }]` | flat stones the scorpion packs lie under |
| `iceblocks` | `[{ x, z }]` | the Icebound packs' blocks |
| `huts` | `[{ x, z }]` | shepherds' huts and the fold, **all on dry cells**, empty for the season |
| `arena` | `{ x, z, r }` | the Den's bowl, r 17 |
| `hearth` | `{ x, z }` | the arena hearth, south rim |
| `haldaRim` | `{ x, z, r }` | Halda's ledge, r 2, south-east rim, outside every lane and charge line, in sight of the bowl. The story's `haldaDen` is this spot |
| `den` | `{ x, z }` | the den's mouth in the north-east wall (blocked): the cub's spot, the echo's spot |
| `stair` | `{ x, z }` | the cut stair in the north-west wall: the exit to `tarn` |

**`tarn`** (part 2, "tarn"; part 1, Notes 3b):

| spot | type | meaning |
|---|---|---|
| `camp` | `{ x, z, r }` | the Stair's Head camp, r 8 at (52 ± 4, 166 ± 2) |
| `winches` (`winch1`..`winch3`) | `[{ x, z }]` × 3 | winch 1 in the wheel-house, in a chute's lane; winch 2 on the east pier; winch 3 on the jetty |
| `lookouts` (`lookout4`..`lookout6`) | `[{ x, z }]` × 3 | 4 a rock island in the Snowfield, 5 the wheel-house's surviving corner, 6 the skerry in the lake |
| `bridges` | `[{ x, z }]` × 2 | the two static snow bridges, 3 cells wide, never inside a lane (cut 3 removes them) |
| `piers` | `[{ x, z }]` | the row of seven stone piers |
| `levers` (`lever1`..`lever3`) | `[{ x, z }]` × 3 | on the rim at r 14, bearings 50°, 140°, 215° from north. Lever 3 stands on the strip the lake bares last |
| `seat` | `{ x, z }` | Kelados's seat, 2 cells out from the wall of ice |
| `plug` | `{ cells }` | the Dam's mouth: a 3-cell plug of ice, opened at `keladosWake` |
| `hearth` | `{ x, z }` | the arena hearth, south rim |
| `haldaRim` | `{ x, z, r }` | a pier stump, r 2, south-east rim. The story's `haldaDam` is this spot |
| `wheel` «pick» | `{ x, z }` | the great wheel at the Dam's west lip (q46), with the Water-stair's spillway in view |

Every hearth, wheel, winch, lever and horn-stone stands on a dry cell outside every lane, 3 m or more from any other interact.

### Readings, and the flags that choose them (part 2, "Two readings")

A reading is chosen from flags on every entry. The water's level is never a saved layout.

| zone | reading | when | what differs |
|---|---|---|---|
| `thaw` | `spate` | until `act7` | the Race at `raceLevel(F) = 1.2 − 0.3 × (weirs open)`; snow by `L.snow` and the weir count; all chutes armed; all packs |
| `thaw` | `green` | `act7` set | the Race at 0.3 and clear; snow only where `L.snow` is 5; the Meadow's chutes gone, the Den's three and four of the flank's stay; flowers; Kallisto asleep by the den with the cub; the same packs at the same counts |
| `tarn` | `full` | until `lakeLet` | the lake at 1.2; at 0.6 once `keladosRest`; the Dam's mouth plugged until `keladosWake` |
| `tarn` | `let` | `lakeLet` set | the lake at 0.3, a third of its size, a green rim round it; Kelados a moss-grown shape in the slope with a pine on his shoulder; lookout 6's causeway wadeable |

`act7Enter` calls `resetTide(z, { mere })` with that level. The Race's floor is 0.3: `T.mere` is never 0 here.

### Layout of `thaw` (part 2, "thaw")

| band | area | rows (z) | what it is |
|---|---|---|---|
| A | «Το Γιδόστρατο» / "The Goat Track" | 164-180 | the camp at (56 ± 6, 172 ± 3) |
| B | «Το Νερολίβαδο» / "The Water-meadow" | 122-164 | flat grass; 4-6 braided brooks (pocket 1, bed 0.3-0.75); 3-5 huts and a fold on dry knolls; two knolls; a dry causeway 3 cells wide with two plank bridges |
| C | «Το Ρέμα» / "The Race" | 104-122 | the river (pocket 2, bed −0.45) with three raised fords; weir 1 on its south bank |
| C′ | «Οι Ρεματιές» / "The Gullies" | 88-104 | three pockets of about 12 × 16 on the north bank: weir 2 (middle), weir 3 (east), a den and the trail up (west) |
| D | «Οι Σούδες» / "The Chutes" | 58-88 | a switchback 3 cells wide across the flank, crossed by 5-7 chutes |
| — | «Τα Στενά» / "The Narrows" | 54-58 | a moat 4 cells deep, an arm of the Race (pocket 2) with one ford |
| E | «Τα Προσήλια» / "The Sun-terraces" | 38-54 | warm flat rock, wholly in sun; slabs; two dens in the east wall |
| F | «Η Φωλιά» / "The Den" | 5-39 | the boss bowl, the den's mouth, the cut stair |

**The Race as a gate, lowered three times:**

| the Race | weirs open | what the camp reaches | the ford that opens (bed) |
|---|---|---|---|
| 1.2 | 0 | the south bank only: the Meadow, lookout 1, weir 1 | — |
| 0.9 | 1 | the north bank, the west gully, the lower Chutes, lookout 2, weir 2 | west (0.6) |
| 0.6 | 2 | the middle ford and the gravel bar to the east gully: weir 3 | middle (0.3) |
| 0.3 | 3 | the east ford and the Narrows: the Sun-terraces, lookout 3, the Den | east (0.0) |

**Each weir is one rule met alone:** weir 1 a Den-bear asleep 6 m from the wheel; weir 2 a chute armed from the zone's build with a goblin camp in its lane and its horn-stone beside the trail; weir 3 a Rock-roller in blue ice in the cliff's shade with two goblins, and a cloud line whose edge slides off the block within 20-40 s of arrival.

**Chutes:** 5-7 on the flank, one in the middle gully, three in the Den (60° apart). A lane is 4 cells wide and 22-30 long, from a cornice at the cliff to a horn-stone at its foot. **Clouds:** 3 (r 9-14 m, 1.2 m/s, seeded lines running west) cross B, D and E; none crosses the Den.

### Layout of `tarn` (part 2, "tarn")

| band | area | rows (z) | what it is |
|---|---|---|---|
| A | «Η Κορφή της Νεροσκάλας» / "The Stair's Head" | 158-174 | the camp, a wind-wall, Halda's fire |
| B | «Το Χιονοπέδιο» / "The Snowfield" | 110-158 | open snow; 4-6 chutes off the east and west ridges crossing the trail; two crevasses (`L.low`) with one snow bridge each; four rock islands |
| C | «Τα Παλιά Έργα» / "The Old Works" | 70-110 | channel walls, a roofless wheel-house (about 14 × 10), seven piers; winches 1 and 2 |
| D | «Ο Γιαλός της Λίμνης» / "The Lake Shore" | 38-70 | the lake over the west and centre (pocket 2; shelves at bed 0.9, 0.6, 0.3, then −0.45); a shingle shelf 10-14 cells wide down the east side; winch 3 on a jetty reached by a causeway on the clock (pocket 1) |
| E | «Το Φράγμα» / "The Dam" | 6-38 | the wall of ice (north, blocked), the seat, the lake's lip (west), three levers, two chutes as an X, the arena hearth |

- **At least 40% of walkable cells are bare rock, scree, lichened stone or shingle.** Snow lies only on the Snowfield, in the chutes and on north faces.
- **Each winch is one rule met alone:** winch 1 stands in a chute's lane; winch 2 freezes again whenever a cloud lies on it; winch 3's causeway is covered at the clock's top and bare at its low.
- **Chutes:** 4-6 in the Snowfield, one over winch 1, two at the Dam. **Clouds:** 3 cross the Snowfield and the Works; two lines cross the Dam so that a cloud lies on the arena's middle for about 15 s in every 50.
- **Lookout 6** is cut off until the lake stands at 0.6.

### Reach checks (`tools/check-act7.mjs`; part 2, "Reach checks")

Run after dressing, on both readings, with the clock at h 0 and at its top, and the own level at 1.2, 0.9, 0.6 and 0.3.

**Hard (any one fails the seed):**

| # | zone | check |
|---|---|---|
| H1 | `thaw` | the camp reaches exactly what the Race table allows at each level and nothing more: no way to weir 2 at 1.2, to weir 3 at 0.9, across the Narrows at 0.6 |
| H2 | both | the causeway, every wheel, winch, hearth, hut door, horn-stone, the camp and the exits stand on dry cells |
| H3 | both | every brook has a dry refuge of 3 × 3 within 12 m (`refugeNear`) |
| H4 | `thaw` | the Den's stream is never deep: its bed is at most 0.3 m under the clock's top |
| H5 | `thaw` | the Den: six boulders at r 9-13, no two closer than 5 m; every pair of the three lanes leaves a clear wedge of at least 6 × 6 cells; the arena hearth, the stair and `haldaRim` outside every lane |
| H6 | both | two interacts are never closer than 3 m; no interact stands in a lane |
| H7 | both | every trail cell inside a lane has cover that breaks `map.los` to the lane's mouth within 4 m (`inFlue`) |
| H8 | both | no lane crosses a camp, a wheel, a hearth or another interact; no lane touches a pocket 2 cell; a snow bridge is never inside a lane |
| H9 | `thaw` | at least two flank chutes have a pack spot in the lane and at least two have none |
| H10 | both | no carved feature within 3 cells of the frame |
| H11 | `tarn` | winch 3's causeway is reachable at the clock's low and never at its top |
| H12 | `tarn` | the three levers, the arena hearth and `haldaRim` reach each other round the rim at every lake level |
| H13 | `tarn` | at lake 1.2 the arena has at least r 12 of floor (r 14 at 0.9, r 16 at 0.6) |
| H14 | `tarn` | the Dam's two lanes always leave a quadrant of 6 × 6 cells clear |
| H15 | `tarn` | the seat is within 3.5 m of floor on its south side (a rooted Kelados is in a sword's reach) |
| H16 | `tarn` | at least 40% of walkable cells are not snow |
| H17 | both | no slush may bridge pocket 2: `slushAt` skips cells with `L.pocket === 2` in an Act VII zone |
| H18 | both | both generators are deterministic for a seed and mode; every field of the L table and every spot of the spot tables is present |

**Soft (reported, not failing a seed):** mean tries per seed above 3 (G1 fails on the mean over 300 seeds); a gap under 20 s between clouds at any pack spot; fewer than a third of the critical-path packs standing in or beside a lane.

**Runtime rule tied to the layout:** a thrown rock or block never lands on a cell a hero stands on, within 3 m of an interact, or beyond r 12 of an arena (so it cannot close the rim ring).

### Packs (`data.js` `PACKS`; part 2, "Packs")

| tag | made of (weights) | lead | dormant |
|---|---|---|---|
| `looters` | goblin 5, goblinMarksman 1.2, goblinShaman 0.8 | — | no |
| `hillWolves` | hillWolf 1 | — | no |
| `choughs` | chough 1 | — | no (they roost) |
| `den` | denBear 1, hillWolf 2 | denBear | yes |
| `shoreDen` | denBear 1, hillWolf 2 | denBear | no |
| `snowHunt` | snowWorm 2, hillWolf 1.5 | — | no |
| `icebound` | rockRoller 1, goblin 2 | rockRoller | yes (statue) |
| `slabs` | rockScorpion 1 | — | yes |
| `terrace` | goblin 3, goblinMarksman 2, rockScorpion 2 | — | no |
| `snowfield` | hillWolf 3, snowWorm 1.5, chough 2 | — | no |
| `worksMixed` | goblin 3, goblinMarksman 2, rockScorpion 2, chough 1 | — | no |

- `PACK_LEAD` gains `den`, `shoreDen`, `icebound`. `PACK_DORMANT` gains `den`, `icebound`, `slabs`.
- Two `world.js` branches for Act VII: the fallback for an unknown tag, and the champion's stand-in for a big kind (a champion pack here is never bears or trolls but `hillWolf`).
- Elites: the generator's 15% champion roll on a pack; the runtime roll 6% × the difficulty's `elite` × `HAZ7.champ`; a certain champion or rare pack at each lookout. A rare Den-bear and a rare Rock-roller come alone; a rare scorpion (the matriarch) comes with three minions.

**Placement** (`n` is the count before difficulty and co-op):

| zone | area | tag | n | spots | on the trail | notes |
|---|---|---|---|---|---|---|
| `thaw` | B | `looters` | 5-7 | 2 | 2 | at two huts on the causeway |
| `thaw` | B | `looters` | 5-6 | 1 | 0 | a camp on brook-side cells (`tide: true`): the brook's rise drives it out onto the causeway. No hut stands there |
| `thaw` | B | `hillWolves` | 4-5 | 1 | 1 | the east knoll |
| `thaw` | B | `choughs` | 5-6 | 1 | 0 | over the open meadow |
| `thaw` | C | `den` | 3 | 1 | 1 | weir 1 |
| `thaw` | C′ | `looters` | 6-7 | 1 | 1 | weir 2: the camp in the armed lane |
| `thaw` | C′ | `icebound` | 3 | 1 | 1 | weir 3 |
| `thaw` | C′ | `den` | 3 | 1 | 0 | the west gully |
| `thaw` | D | `snowHunt` | 3-4 | 2 | 2 | snow between the lanes |
| `thaw` | D | `icebound` | 3 | 1 | 1 | under the cliff, at the switchback's second turn |
| `thaw` | D | `choughs` | 5-6 | 1 | 0 | a dead pine above lookout 2 |
| `thaw` | E | `slabs` | 3-4 | 2 | 1 | under flat stones |
| `thaw` | E | `terrace` | 5-6 | 1 | 1 | a marksman on a ledge |
| `thaw` | E | `den` | 3 | 1 | 0 | the east wall |
| `tarn` | B | `snowfield` | 5-6 | 2 | 2 | |
| `tarn` | B | `snowHunt` | 3-4 | 1 | 0 | west of the first crevasse |
| `tarn` | B | `icebound` | 3 | 1 | 1 | the east ridge's shade, at the second lane |
| `tarn` | B | `choughs` | 6-7 | 1 | 0 | the rock island south of lookout 4 |
| `tarn` | C | `worksMixed` | 5-6 | 2 | 2 | on the channel walls |
| `tarn` | C | `icebound` | 3 | 1 | 1 | among the piers |
| `tarn` | C | `slabs` | 4 | 1 | 0 | under the wheel-house floor |
| `tarn` | D | `shoreDen` | 3 | 1 | 1 | a Den-bear awake and fishing |
| `tarn` | D | `slabs` | 3-4 | 1 | 1 | the shingle |
| `tarn` | D | `looters` | 5-6 | 1 | 1 | the causeway's head (`tide: true`) |
| `tarn` | D | `choughs` | 5-6 | 1 | 0 | the jetty's posts |

`tarn`'s rows give 13 pack spots, 9 on the critical path and 4 off it, as part 2 says. `thaw`'s rows give 17 spots (11 on the path, 6 off) against part 2's "fifteen, eleven on, four off": see "Numbers not yet set". The bot's zone run takes the first eight packs in reach.

### `HAZ7` (`data.js`, beside `HAZ5` and `HAZ6`; indexed like `DIFFS`)

One table, merged from part 2 ("Difficulty") and part 3 ("This part's rows of `HAZ7`"), with the head's numbers applied. `actHaz(act, diff)` gains the third act and is the only reader's door: `tide.js` `haz()`, `actors.js` `spawnMonster`, `combat.js` (Revealed's factor), `hud.js` (the tide's bell by `z.water`). Telegraph lengths are not in the table because they never change with difficulty.

| key | what | Wanderer | Warden | Hero | Nightmare | Ash | Skotos |
|---|---|---|---|---|---|---|---|
| (shipped `DIFFS`) | monster life / blows, for reference | 0.65 / 0.55 | 1 / 1 | 1.9 / 1.55 | 3.6 / 2.4 | 7 / 3.8 | 11 / 5.4 |
| `hp` | the act's regular creatures' life (×) | 1.5 | 1.8 | 1.8 | 1.8 | 1.8 | 1.8 |
| `dmg` | their ordinary blows (× `DIFFS.dmg`) | 1.5 | 1 | 1 | 1 | 1 | 1 |
| `heavy` | a regular creature's heavy blow (% of her life **before armour**) | 9 | **18** | 22 | 26 | 31 | 36 |
| `bossHeavy` | a boss's heavy blow (% before armour) | 11 | **22** | 27 | 32 | 38 | 44 |
| `cap` | the most one blow may take **after armour** (%) | 12 | **20** | 25 | 30 | 36 | 42 |
| `cd` | regular heavy moves' cooldowns (×) | 1.35 | 1 | 1 | 1 | 0.9 | 0.85 |
| `bossCd` | bosses' cooldowns (×), through `bcd7(s) = s × HAZ7.bossCd` | 1.35 | 1 | 1 | 0.9 | 0.85 | 0.8 |
| `less` | moves removed a boss phase | 1 | 0 | 0 | 0 | 0 | 0 |
| `bossChutes` «pick» | chutes a boss arms a call: phases 1-2 / phase 3 | 1 / 1 | 1 / 2 | 1 / 2 | 2 / 2 | 2 / 3 | 2 / 3 |
| `overlap` «pick» | two boss telegraphs may overlap | no | no | no | last phase | from phase 2 | from phase 2 |
| `blockT` «pick» | Kelados's thrown block or boulder lasts (s) | 30 | 30 | 30 | 30 | 25 | 20 |
| `slide` | a slide on the hero (% of her life, **pure**: armour does not reduce it) | 8 | **14** | 14 | 18 | 22 | 26 |
| `slideFoe` | a slide on a common foe (% of its own life) | 35 | **35** | 35 | 35 | 30 | 30 |
| `slideElite` | a slide on a champion, a rare or a `big` kind (% of its own life) | 20 | **20** | 20 | 20 | 16 | 16 |
| `rearm` | a chute spent (s) | 60 | 45 | 45 | 45 | 40 | 35 |
| `wash` | a wash-out, brook or sluice (% of her life, pure) | 3 | 6 | 6 | 8 | 10 | 12 |
| `tide` | the brooks' cycle (s) | 150 | 120 | 120 | 120 | 110 | 100 |
| `roar` | the warning before a rise (s) | 8 | 6 | 6 | 6 | 6 | 6 |
| `roarSfx` | the warning's sound | `'brookRoar'` on every difficulty | | | | | |
| `vault` «pick» | a falling rock or ice from `L.vault` (× the zone's blow) | 0.6 | 0.9 | 0.9 | 1.0 | 1.1 | 1.2 |
| `clouds` | clouds on the map | 4 | 3 | 3 | 3 | 2 | 2 |
| `sunWake` | unbroken sun to wake the Icebound (s) | 3 | 2 | 2 | 2 | 1.5 | 1 |
| `champ` | champion odds in the act's zones (×) | 1.2 | 1.5 | 1.5 | 1.5 | 1.6 | 1.7 |
| `hold` | a lookout's hold (s) / packs | 60 / 1 | 75 / 2 | 75 / 2 | 75 / 2 | 75 / 3 | 75 / 3 |
| — | a least time for a boss phase | **none: the column does not exist** | | | | | |

- **A share, not a multiple.** `hitHero` gains one option, `share`: the blow is her `hpMax` × the row's number before block and armour, then `min(amount, hpMax × cap)`. It is not `pure`: toughness still pays. It is never multiplied by `DIFFS.dmg`, by an elite's blow factor or by `COOP.dmg`.
- **What lands on Warden** on the measured heroes: a regular heavy 10.6-14.6%; a boss heavy 13.0-17.8%; never over 20%.
- **Kallisto's own rocks and a Rock-roller's rocks** last 20 s (Kallisto's 10 s on Skotos). They do not read `blockT`.
- **Wanderer is pace, not telegraphs:** cooldowns × 1.35, the heavy share halved, one move fewer a phase, one chute. The same warnings, to the tenth of a second.
- **Act VI's 11% boss-blow cap** (`combat.js:166`) stays Act VI's alone.

### The Race («Το Ρέμα»; `tide.js`; part 3, "The Race")

| # | rule (each is asserted by `race`, `check-act7` or `coop.mjs act7`) |
|---|---|
| R1 | Three kinds of ground: dry; wadeable water (depth under 0.45 m, move × 0.7); deep water (0.45 m or more: the cell is closed). The deep edge is a geometry fact, never told by colour alone |
| R2 | The brooks (`L.pocket` 1) run on `L.tideCfg`'s clock: `HAZ7.tide` seconds a cycle |
| R3 | A roar (`brookRoar`, never `iceGroan`) sounds `HAZ7.roar` seconds before every rise. The foam leads the grid by a step: water that looks wadeable always is |
| R4 | The Race and the lake (`L.pocket` 2, `z.tide.mere`) never move by themselves. The Race stands at 1.2 m in `spate`. Each weir lowers it 0.3 m for good (1.2 → 0.9 → 0.6 → 0.3) at 0.1 m/s, everywhere at once. The lake stands at 1.2 m, falls 0.3 m at each of Kelados's two phase changes, and to 0.3 m when the sluices open |
| R5 | The fords open in order (west at 0.9, middle at 0.6, east at 0.3) and never out of it |
| R6 | Never under her feet: a step that would close her cell, or cut her off from ground the water never takes, holds her cells and a lane out for 6 s (`GRACE`); then a wave carries her along the lane, never over a wall, never faster than 9 m/s, for `HAZ7.wash` |
| R7 | A foe on a closing cell is put on the nearest floor (`evict`): it is seen to climb out, never carried off. Swimmers and fliers keep the water. Gold and items slide to dry ground |
| R8 | A weir opened sends one surge pack down the bank it drains, once, called by the weir and not by the clock |
| R9 | No slush bridges pocket 2: neither a Frost Nova nor a slide's tongue turns a Race or lake cell to wading |
| R10 | `map.ver` bumps at most 4 times a second |
| R11 | The level on a guest's page equals the host's within one step |
| R12 | The level is read from flags on every entry (`raceLevel(F)`); `mereTo` moves from `ai.js` to `tide.js` as the export `raceTo(h, rate = 0.1)` |

- **Weir:** interact kind `weir7`, prompt `weir.turn`, a 2 s channel broken by a blow; flag `weirN` saved first.
- **HUD:** the shipped tide dial shows the brooks' clock and pulses for the roar. Three notches beside it show the Race's level, label `hud.race`. No new meter.
- **First minute:** the first roar is scripted for the moment she reaches the causeway's planks (toast `q.brook`); hint `hint.race` at the Race's bank.

### The Slide («Η Χιονοστιβάδα»; `forge.js`; part 3, "The Slide")

| # | rule (each is asserted by `slide`) |
|---|---|
| S1 | A chute is a flue with `kind: 'snow'`, a `horn` and no `period`. It is armed (a cornice is drawn) or spent (none). Every chute is armed when the zone is entered |
| S2 | Something loud kicks every armed chute whose horn-stone lies within the loud thing's reach (10 m or 6 m, the `LOUD` table), or whose lane it happened in |
| S3 | Only in sun: a cornice whose head (`f.x`, `f.z`) is in shade cannot be kicked. It creaks, sheds a puff and stays |
| S4 | 2.8 s of warning, always, on every difficulty: a white telegraph down the whole lane |
| S5 | The slide runs the lane in 1.2 s and strikes once everything in it that nothing solid shields |
| S6 | Cover is anything solid between the cornice and her: a boulder, a thick trunk, a cliff corner, a Rock-roller's rock, Kelados's block. Cover spots show as blue circles the first frame she stands in a warned lane. A roll through the front takes nothing |
| S7 | On the hero: `HAZ7.slide` of her life, pure, and a push down the lane. No stun, no bury |
| S8 | On a common foe: `HAZ7.slideFoe` of its own life, carried to the lane's foot (it ends within 3 m of it), Dazed 1.5 s (open to every blow at × 1.5). On a champion, a rare or a `big` kind: `HAZ7.slideElite`, Dazed 1.5 s; `big` and anchored foes are not carried. Fliers are missed. A Snow-worm under the lane is forced up. Applied on the host only. The shipped flue's monster rule (a quarter of a fifth of the hero's life) is not reused |
| S9 | On a boss: Kallisto 5% of her life and Buried 3 s; Kelados 4% and Dazed 2 s |
| S10 | Spent for `HAZ7.rearm` seconds; the cornice grows back as the cap's scale from 0 to 1 |
| S11 | The tongue: the lane's last third lies 8 s as slush. Over a brook (pocket 1) it holds the brook at wading for those 8 s. Never over pocket 2 |
| S12 | A slide is not loud. One slide never sets off another |
| S13 | Flues run for a hero with `crownUnmade` (the `forge.js:63` fix) |
| S14 | A rock or block shard closes its cells with `low = false` (`solid: true`); an icicle keeps `low = true`. A rock shard is cover and an icicle is not |
| S15 | One firing on two pages: the host decides armed, kicked and falling; each page takes its own hero's hit |

**`LOUD`** (`data.js`; keyed by skill id, a variant takes its base's row, and by enemy move id; the value is the reach in metres). `loud(x, z, r, src)` emits bus `'loud'`. One helper `groundBlow(x, z, r, n, o)` goes under the 13 ground-blow sites that ask `vaultOn()` today; six skills that do not strike the ground call `loud()` where they already act.

| | loud at 10 m | loud at 6 m | not loud |
|---|---|---|---|
| Warden | Leap (landing), Earthsplitter (along its line), Shield Charge (where it ends), Iron Bulwark (its burst), Dawnbreaker (the third blow) | War Cry | the basic attack, Whirlwind |
| Ranger | — | Arrow Rain (its centre), a Snare Trap when it springs, Siege Bolt where it bursts | the basic attack, Multishot, Piercing Shot, Vault, Storm of Hawks; the Spirit Wolf's howl wakes a den at 12 m and kicks nothing |
| Mage | Meteor (each stone of a Shower at 6 m), Void Rift (its collapse) | — | the basic attack, Fireball, Chain Lightning, Frost Nova, Frozen Orb, Ray of Dawn |
| enemies | a Den-bear's charge ending against something solid; a Rock-roller's slam and its boulder landing; a `thunder` champion's strike; Kallisto's Roar; every second Tremor of Kelados | — | wolves, goblins, choughs, scorpions, the Snow-worm's burst |
| never | the Call; a slide; a falling rock; the Mountain's Heart's own slide | | |

- **Looks by kind:** telegraph white 0xf4f8ff with the dark edge; alpha snow puffs; sounds `corniceCrack`, `slideRoar`; no point light.
- **Hints and HUD:** `hint.slide` on first sight of an armed chute; `hint.slide2` the first time she is in a warned lane; the `flueWarn` vignette pulses white with `q.slide`; a carried foe shows `hud.swept` (its text must be reworded: Choices).
- **If G2 shows nobody uses the shade,** cut 6 applies (Sun and Shade below); the Slide's rules do not change.

### Sun and Shade («Ήλιος και Ίσκιος»; `light.js`; part 3, "Sun and Shade")

| # | rule (each is asserted by `sun`) |
|---|---|
| U1 | `shadeAt(x, z)`: `L.shade[i]`, or inside a pool with `p.shade`. `sunAt = !shadeAt`. Everything else is in sun |
| U2 | `HAZ7.clouds` clouds, each a disc of r 9-14 m moving on a straight line at 1.2 m/s. A cloud takes 15-23 s to pass over a spot. A cloud never covers an `L.noCloud` cell |
| U3 | A cloud's position is a function of the zone's seed and one clock, `z.sunT`, on paths that repeat every 600 s. Two pages with the same clock draw the same clouds within 0.5 m |
| U4 | An Icebound sleeps in shade for ever (60 s under a cloud in the soak) and wakes after `HAZ7.sunWake` seconds of unbroken sun (within 3 s of sun on Warden). A blow wakes it at once. It does **not** wake when she walks near |
| U5 | The Cradle held at an ice block for 1.5 s (interact, prompt `ice.melt`) melts it: 1.5 s ÷ (1 + the Lamplight bonus), 1.14 s at rank 40. The same channel frees a winch |
| U6 | Fire thaws: a Mage's burning ground on a block counts as sun in shade and halves the wait. A `molten` champion's patch within 3 m halves it too |
| U7 | Frost re-freezes: Frost Nova or Frozen Orb on an Icebound woken less than 3 s ago puts it back to sleep for 4 s, once each |
| U8 | A chough dives only at a hero in open sun and breaks off within 1 s of shade |
| U9 | A Rock-scorpion on a shaded cell moves at × 0.6 and does not Sting |
| U10 | Sun and Shade is never a damage rule: nothing takes more or less for where it stands. On Kelados shade slows him (cooldowns × 1.4, walk × 0.7) and never changes what he takes |
| U11 | The four `'sun'` branches: `lightAt` answers `!shadeAt` on its first line; `heroLightR` returns 0; `baseRing` returns 0; `tickLight` hides the ring and the Cradle and leaves `R.heroLight` alone. `R.heroLight.distance` is unchanged after 60 s in the zone. No ring and no Shroud are drawn |
| U12 | 'Reduce flicker' (`G.settings.flicker`) also stills the clouds' edge shimmer |

- A cloud is `addLightPool(x, z, r, Infinity, 'cloud', { shade: true, light: false })`. Hints: `hint.sun`, `hint.shade`.
- **Where the three meet, and nowhere else:** sun arms snow (S3); snow becomes water (S11); water wakes sleepers (a brook rising into a den wakes its bear). They never drain a meter, stack a multiplier, change by difficulty in anything but their numbers, are needed to finish a boss, or open the Race before its weir.

### Enemies (`data.js` `MONSTERS`; part 2, "Enemies")

**Rules for all seven.** Nothing here is of the dark: no `shroud`, `unlit` or `unseen`. Each kind has one heavy move, and it opens the fight. Its telegraph is 0.9 s or more, red, never changed by difficulty or by the `fast` affix. It hits once for `HAZ7.heavy` of her life before armour and block, capped at `HAZ7.cap` after armour. Everything else is chip: an ordinary blow's `dmg × multiplier` is at most 1.9. A stun, a freeze or a fear breaks a wind-up. Life is × `HAZ7.hp`, so a pack lives 8-14 s. Every body is a shipped model: no new `CAST` row for a regular kind.

| id | name | body (model), scale, tint | loaded by; stand-in | AI reused | life / blow / speed | heavy move | telegraph | cooldown |
|---|---|---|---|---|---|---|---|---|
| `hillWolf` | «Ορεινός Λύκος» / "Mountain Wolf" | `wolf.glb` (`warg`), × 1.15, grey-brown | boot | `pounce` | 1.1 / 0.9 / 6.6 | **Long Pounce**: from 6-10 m, a line 10 × 1.8 m | 0.9 s crouch | one a pack each 6 s |
| `goblinMarksman` (with shipped `goblin`, `goblinShaman`) | «Καλικάντζαρος Σημαδευτής» / "Goblin Marksman" | `goblin.glb` | boot | `ranged`, `aimEvery: 3` | 0.6 / 0.7 / 4.0, reach 12 | **Aimed Bolt**: every third shot, a line 14 × 1.2 m; anything solid stops it | 0.9 s, standing still | every third shot (about 5 s) |
| `chough` | «Καλιακούδα» / "Chough" | `skua.glb` (`skua`), black | group `act7`; stand-in the boot spiderling | `bat` → `skua()`, `shadeShy` | 0.3 / 0.45 / 7.5 | **the Mob**: the flock stoops together through a circle of r 3 | 1.1 s, all crying | one a flock each 14 s |
| `denBear` | «Φωλιάρκουδα» / "Den-bear" | `bear.glb` (`rimeBear`), × 1.25, brown | group `act7`; stand-in the boot troll | `charger` | 4.2 / 1.5 / 5.6 | **Charge**: a line of up to 18 m, 3 m wide or more | 0.9 s rear | 5-7 s |
| `snowWorm` | «Χιονοσκώληκας» / "Snow-worm" | `worm.glb` (`deepworm`), white | group `act7`; stand-in the boot spider | `burrow` | 1.8 / 1.2 / 4.4 | **Burst**: up from under her, a circle of r 2.4 | 0.9 s | each surfacing, 6-9 s apart |
| `rockRoller` | «Πετροκυλιστής» / "Rock-roller" | `troll.glb` (`troll`), × 1.2, rimed grey | boot | `brute` | 7 / 1.4 / 3.2 | **Rolled Boulder**: a line 14 × 2.6 m at 12 m/s; the boulder stays 20 s | 1.2 s | 8 s |
| `rockScorpion` | «Πετροσκορπιός» / "Rock-scorpion" | `spider.glb` (`spider`), × 0.8, ochre | boot | `rootling`'s burst, then `melee` | 1.0 / 0.8 / 5.2 (3.1 in shade) | **Sting**: every third blow, a cone 2.6 m, 60° | 0.9 s, the tail raised | one a pack each 3 s |

Every heavy move's share is the one `HAZ7.heavy` row. The Greek names are a draft for the two proofreaders.

| id | details two files must agree on |
|---|---|
| `hillWolf` | The shipped pounce (3.5-7 m, × 1.3) stays as chip. One Long Pounce clock a pack. A leap that ends at a blocked cell or in a slide's tongue leaves it Dazed 1 s. Packs of four or five; six with `horde`. Cannot swim; wades a ford at × 0.75 |
| `goblinMarksman` | A `goblinArcher` row with `aimEvery: 3`. One marksman in five in a pack (two in `terrace` and `worksMixed`), always behind the line |
| `chough` | The Skua's row with `shadeShy` in place of `lightShy`; no Cold on the bite. Stoops two at a time only at a hero in open sun. The Mob: four or more circling a hero who has stood in open sun for 5 s; whoever is still in the circle and still in sun 1.1 s later takes one heavy blow; in shade nothing lands. Never more than seven. A slide passes under them |
| `denBear` | The charge ends Dazed 2 s against anything solid and in slush; that end is loud. Maul is chip (blow 1.5; the big maul × 1.25 = 1.9). Dormant with a `wake` of 5 m; also woken by a blow, by something loud within 12 m, or by the brook's water reaching its cell (`wake.tide`). Woken by water it rises calm and walks to dry ground. `big`: a slide takes `slideElite`, not carried |
| `snowWorm` | Tunnels only through cells where `L.snow` still holds for the current weir count. The acid bolt and poison pool are replaced by a slush spit: no damage, a wading circle of r 1.6 for 4 s. A hero on rock, on the trail or on bared grass cannot be burst; the worm surfaces at the snow's edge and spits from there for 5-8 s |
| `rockRoller` | Blow lowered from 2.6 to 1.4. The boulder strikes the first hero on its line and stops at the line's end or the first solid cell, where it stays as a rock: a 2 × 2 footprint closed with `low = false`. Three rocks at most from one troll. **Icebound:** spawns as a statue in blue ice; wakes by sun (U4), a blow, fire (U6) or the Cradle (U5); its pack-mates wake a beat after it. `big` |
| `rockScorpion` | The pack lies under flat stones and comes out together at 6 m or when one is struck (`burstPack`). The bite keeps the spider's poison as chip. Water over the slabs brings them out early and calm |

**Affixes** (as shipped unless said): a champion's or rare's heavy move is the same share; `fast` does not shorten a heavy wind-up; `molten` patches thaw (U6); `thunder` is loud at 10 m and kicks an armed, sunlit chute; `frozen` leaves slush for 4 s; `shielding`'s 2.5 s also hold against a slide.

`cast7` asserts each body and its stand-in in a cold session from each waypoint.

### Zone danger (part 2, "Zone danger"; the head's band; gated at G2 by run A)

One zone run of eight packs, Warden difficulty, the reference build at level 50, per zone and class.

| measure | target |
|---|---|
| lives of damage | **0.4-0.7** |
| lowest life (median over runs) | 35-65% |
| seconds under 30% of life (`under30S`) | 0-6 |
| deaths | 0-1 in the 36 runs of the two zones (0-3% of runs) |
| a pack's time (median) | 8-14 s |
| monster deaths owed to a slide or to water (`terrainKills`) | 15-35% |
| any single blow | never over 20% |
| across classes | lives within ± 30% of the three classes' mean |
| Wanderer | lives at most half of Warden's; lowest life 70% or more; no death in the 72 runs |

A lookout's hold is priced apart: 0.10-0.20 lives on Warden.

### The bosses (`ai.js`, `data.js`; part 2, "Bosses")

**The boss law.**

| # | rule |
|---|---|
| B1 | A heavy blow is `HAZ7.bossHeavy` of her life before armour and block, capped at `HAZ7.cap` after armour; never multiplied by `DIFFS.dmg` or `COOP.dmg` |
| B2 | Every damaging move is a heavy blow. No basic chip, no lingering ground, no add. The environment's two: a slide (`HAZ7.slide`, pure) and a wash-out (`HAZ7.wash`, pure) |
| B3 | No least-time lock of any kind: no `hpFloor`, `lockPhase`, `*_MIN` table, `bossMin` column, invulnerability or hold at a phase's turn. A phase turns on life alone (`phases: [0.66, 0.33]`). An entry move is queued (`a.queue`) and plays while the boss stays open to every blow; a hero who strikes through two thresholds at once gets both entries in order |
| B4 | Every move has a range band (any range; within reach; beyond 8 m) and each fight has a count table |
| B5 | Telegraphs are 0.9 s or more and never change with difficulty. At most two big telegraphs at once; a slide's or a sluice's lane counts as one |
| B6 | One window a phase, made by the mountain: a charge ended on stone, a slide, a sluice. Using it shortens the fight; not using it costs time only |
| B7 | One vulnerability at a time, × 1.5 |
| B8 | One boss actor (`G.bossActor`), never off screen, never untouchable. **Neither is killed** |
| B9 | Pace by difficulty goes through `bcd7`. `boss()` already runs its third phase a quarter faster: no table adds to that |
| B10 | Halda calls the phase's one thing from `haldaRim`, once a phase: 8 s into Kallisto's phase 1 and 10 s into Kelados's, and on the entry move of phases 2 and 3. Her one act: she pulls a lever herself 25 s into Kelados's phase 3 if none was pulled in that phase (`d.halda7.s3b`). It shortens nothing by rule |

**`spare`** (the ending of both). At 0 life a def with `spare: true` rests where it would die. The order: the rest flag is saved first; the `kill` event fires as for any boss, so the quest step, the loot and the first-kill legendary follow the shipped route; the body plays its rest clip, becomes an NPC body that nothing can target, and the story's scene takes over. There is never a corpse. The scenarios assert the drop, the flag, the quest step and that the body is still in the scene.

**Cover.** A rock or block left on the ground closes a 2 × 2 footprint with `low` false: sight, shots, a Tremor's ring and a slide's front stop at it. Mirrored to guests through `cells6` with the `solid` bit.

| | `kallisto` | `kelados` |
|---|---|---|
| def | `{ model: 'kallisto', hp: 340, dmg: 1.6, speed: 5.4, radius: 0.85, ai: 'kallisto', reach: 4.6, atk: 'smash', atkTime: 1.6, flesh: 'flesh', xp: 300, boss: true, big: true, swim: true, spare: true, sfx: 'bear', dieClip: 'daze', look: { scale: 2.1, tint: 0x3a2c22, tintAmt: 0.2 } }` | `{ model: 'kelados', hp: 480, dmg: 1.6, speed: 3.2, radius: 1.5, ai: 'kelados', reach: 9, atk: 'smash', atkTime: 1.8, flesh: 'stone', xp: 380, boss: true, big: true, spare: true, sfx: 'golem', dieClip: 'die', look: { scale: 2.3, tint: 0x8c9488, tintAmt: 0.5 } }` |
| body | `CAST.kallisto = ['bear', 1]`; `STAND_IN.kallisto = ['amberBear', 'troll']` | `CAST.kelados = ['golem', 1]`; `STAND_IN.kelados = ['stonewarden', 'troll']`; code parts: eight plates of blue ice, a snow cap, a pine on the left shoulder, moss |
| scale fallback (G0) | × 1.8 if her face blurs | a new body only if the gate says "the Stonewarden again" and a clean file is in hand that day |
| life | × 340 as a start; **the bot sets it to the band's floor in run B** | × 480 as a start; the same |
| level | `max(40 + 2, hero + 1)`; she joins the first-boss list | `max(43 + 3, hero + 1)` |
| table | `KALLISTO = { name: 'kallisto', phases: [0.66, 0.33], wake: 16, intro, onPhase, tick, moves }` | `KELADOS = { name: 'kelados', phases: [0.66, 0.33], wake: 22, ... }`; held by `a.holdWake` until `keladosWake` |
| clips | `rear` (charge), `howl` (roar), `attack2` (maul), `attack` (slam), `daze`, `hit` | `slam` (tremor), `attack` (sweep), `attack2` (throw, roll), `warcry` (entries), `die` held at its kneel |
| arena | the Den, r 17: six boulders at r 9-13, two fallen pines on the rim, three chutes 60° apart each with a horn-stone and one cover boulder, a head-stream 3 cells wide on the brooks' clock that only wades, two gravel bars | the Dam, r 16: the wall of ice and the seat (north), the lake's lip (west), three levers at r 14, three sluice channels, two chutes as an X, two cloud lines |
| phase 1 | «Πεινασμένη» / "Hungry" (100-66%): make her charge end on stone | «Δεμένος στον πάγο» / "Bound in ice" (100-66%): rooted at his seat (`a.rooted`); open the Foot-race under him |
| phase 2 | «Στριμωγμένη» / "Cornered" (66-33%): entry, she rears and brings two rocks into the bowl's middle (no blow; 6 m or more from every hero; they stay 20 s). Bring a slide down on her | «Λυμένος» / "Loosed" (66-33%): entry, two plates fall, the lake drops to 0.9, lever 2's ice falls, he walks (1.5 s, no blow). Draw him onto the Cross-race, then pull |
| phase 3 | «Το μικρό φωνάζει» / "The cub cries" (33-0%): entry, a Roar that arms two lanes. Stand where the second charge ends on stone | «Ξύπνιος» / "Awake" (33-0%): entry, four more plates fall, the lake at 0.6, lever 3's ice falls. The Long race |
| a slide on the boss | 5% of her life, Buried 3 s (× 1.5), when in a running lane and not behind cover | 4% of his life, Dazed 2 s |
| rest | `kallistoRest`; `daze` into a seated idle; then asleep by the den with the cub (bear × 0.35) | `keladosRest`; `die` held at the kneel, the last two plates fall; after `lakeLet` a statue in the slope under moss |
| time to rest (Warden, median of each class's six runs) | **110-170 s**; no run over 240 s or under 85 s | **150-230 s**; no run over 270 s or under 115 s |
| heavy blows landed | **4-6**, each 12-18% of her life, none over 20% | **5-8**, each 12-18%, none over 20% |
| lowest life (median) | 30-55% | 25-45% |
| seconds under 30% | 3-12 | 5-18 |
| deaths | 1-2 in the 18 runs; 0-1 in Wanderer's 36 | 1-3 in the 18 runs; 0-1 in Wanderer's 36 |
| Wanderer time ÷ Warden time | 0.7-0.9 | 0.7-0.9 |
| echo prompt | `echo.kallisto` «Θυμήσου την Καλλιστώ» / "Remember Kallisto" | `echo.kelados` «Άκου τι ονειρεύεται το βουνό» / "Hear what the mountain dreams" |
| echo rules | `green` bowl: no snow, no slides. The six boulders each break on the first charge that ends on them (`crackStone`): six windows, then none. Halda is not there; a rock falls by itself in front of the third charge with no Daze. `baseTint` 0xd8e4e8 at 1.1 | the lake as it is (0.3, the arena at its widest); all three levers bare from the start; his blocks and boulders shatter where they land (no cover). The lever fail-safe runs by itself. Tint: pale mist |
| first-kill legendary | `LEG_FROM.kallisto` → `kallistoClaw` | `LEG_FROM.kelados` → `mountainHeart` |

**G3 also gates, for each boss:** blows landed within ± 30% of the three classes' mean; the worst loss in any 3 s (`worst3`) at most 40%; run C at 50-65%; Wanderer's lives at most half of Warden's with lowest life 60% or more; at two and four players the bands × 1.0-1.25. A boss outside its band has its phase rules changed, not its numbers. First levers if the ± 30% gate fails at Kallisto: the Maul's cooldown 6 → 8 s, then the Rockfall's solo rule.

**Kallisto's moves** (cooldowns on Warden; × `HAZ7.bossCd` elsewhere):

| move | phases | telegraph | shape | band | what lands | cooldown |
|---|---|---|---|---|---|---|
| Maul | 1-3 | 0.9 s, `attack2` | a cone 4.6 m, 110° | within 6 m | heavy | 6 s |
| Charge | 1-3 | 1.0 s, `rear`; she wheels away first if nearer than 5 m | a line `min(22, d + 4)` × 5 m, run at 20 m/s | any | heavy and a push of 20 | 9 / 8 / 7 s by phase |
| Second charge | 3 | 1.0 s more, from where the first ended | as above | any | heavy | with the first |
| Roar | 1-3 | 1.2 s, `howl`, no blow; then the Slide's own 2.8 s lane | `HAZ7.bossChutes` chutes, the nearest armed ones to her | any | `HAZ7.slide` and carried 4 m down the lane | 16 / 14 / 12 s |
| Rear-and-slam | 2-3 | 1.1 s, `attack` | a circle of r 5.5 round her | within 7 m | heavy | 10 s |
| Rockfall | 2-3 | 1.2 s white-edged red circle | r 2.2 on the farthest hero beyond 8 m (solo: every third one falls on her wherever she is); the rock stays 20 s | beyond 8 m | heavy | 9 s |

- **Where a charge ends.** On a boulder, a pine, a rock or the cliff: Dazed 3.5 s (× 1.5). In a slide's tongue or any slush: Dazed 2 s. On open ground: nothing.
- **Count table, a full Warden fight** (phases of about 45, 50, 45 s): any range 27 (Charge × 5 / 5 / 4, slide × 3 a phase); within reach 14 (Maul × 3 / 3 / 2, Slam × 0 / 3 / 3); beyond 8 m 9 (Rockfall × 0 / 5 / 4).
- **By difficulty.** Wanderer: no Maul in phase 1, no Rockfall in phase 2, no second charge in phase 3; one chute throughout; life × 0.65 (`DIFFS.hp`). Hero: as Warden with the Hero share. Nightmare: two chutes from phase 2. Ash: in phase 3 a Rockfall may be thrown during a Charge's wind-up. Skotos: all three chutes in phase 3; rocks last 10 s.

**Kelados's moves:**

| move | phases | telegraph | shape | band | what lands | cooldown |
|---|---|---|---|---|---|---|
| Sweep | 1-3 | 1.0 s, `attack` | a cone 9 m, 100° | within 9 m | heavy and a push of 12 | 8 s |
| Tremor | 1-3 | 1.2 s, `slam`; then a white-edged red ring 1.2 m thick runs from r 4 to r 14 at 9 m/s | a ring: rolled or blinked through, or stood out behind a block | any | heavy to whoever it crosses in the open | 11 s |
| Ice Block | 1-3 | 1.3 s circle (0.5 s to tear it, 0.8 s in the air) | r 2.2 on the farthest hero beyond 8 m (solo: every third one on her wherever she is) | beyond 8 m | heavy; the block stays `HAZ7.blockT` as cover, three standing at most | 10 s |
| Chute | 1 | the Slide's 2.8 s lane | one lane, on every second Tremor | any | `HAZ7.slide` | with the Tremor |
| The X | 2-3 | 2.8 s lanes | both lanes, on every second Tremor; one quadrant always clear | any | `HAZ7.slide` | with the Tremor |
| Boulder roll | 2-3 | 1.0 s, `attack2` | a line 20 × 3 m; the boulder stays at its end `HAZ7.blockT` | any | heavy | 12 s |

- **A sluice** (the player's). Interact kind `lever7`, prompt «Τράβα τον μοχλό» / "Pull the lever", 1 s, broken by a blow. Then a **blue** lane for 2.8 s down the channel; then the water runs it in 1.2 s. Kelados in the channel goes to his knees for 5 s, Stunned (× 1.5); it takes none of his life. A hero in it is washed out: `HAZ7.wash` and 4 m down the lane. **Each lever once a fight**, for the whole party. A sluice channel is a flue with `kind: 'water'`.
- **The three channels,** each 4 m wide: 1 the Foot-race (east to west along the dam's foot, under his seat); 2 the Cross-race (from the lake's lip across the arena's middle to the east rim); 3 the Long race (north-west corner to south-east rim). Levers 2 and 3 stand in ice that falls at 66% and 33% of his life, never on a timer.
- **The ice is the life bar's picture:** two plates fall at 66%, four at 33%, the last two when he kneels.
- **Under a cloud** a Tremor shakes no chute loose (S3).
- **He must not play as the Stonewarden:** he never charges and never pulses.
- **Count table, a full Warden fight** (phases of about 60, 70, 60 s): any range 35 (Tremor × 5 / 6 / 6, chute × 2 then the X × 3 / 3, Boulder roll × 0 / 5 / 5); within 9 m 23 (Sweep × 7 / 8 / 8); beyond 8 m 18 (Ice Block × 6 a phase).
- **By difficulty.** Wanderer: phase 1's Tremors shake no chute loose; no Boulder roll; the X is one lane. Nightmare: an Ice Block may be thrown during the X in phase 3. Ash: the same overlap from phase 2. Skotos: every Tremor in phase 3 arms the X.

**Co-op at both** (part 2): life × `COOP.boss` (1.6 at two, 3.0 at four). A charge picks the hero farthest from her last target. With three or four heroes: a Rockfall or Ice Block falls on the farthest and, 1 s later, on the nearest shooter (five blocks may stand); the Roar arms one chute more (three at most). The Sweep turns to the hero with the most threat in reach. A downed hero in a lane is moved to its edge.

**The arena hearth and the Call** (part 3, "The Call", rule 6): each arena's `hearth` is lit from the fight's start, and flares again once: at Kallisto's last phase and the first time Kelados goes to his knees. A horn sounds, a blue circle shows round the hearth, toast `call.again`. At most two Calls a fight.
