# Act VII design, part 20: Zones, Enemies, Bosses, Difficulty

«Πράξη VII: Οι Εφτά Κορυφές» / "Act VII: The Seven Peaks". Written 17 November 2026 to `docs/act7-briefs/decisions.md`
(binding), on the production proposal as the base, with the systems proposal's boss law, the story proposal's fail-safe
and both judges' fixes grafted in. Every `file:line` below was opened in this tree on that day; what was not opened is
listed under "Notes for the lead". No code was changed. `docs/act7-design/10-story.md` did not exist yet when this was
written: flags and scenes follow the base (§2.3) and decisions.md.

Three numbers that the rest of this part leans on, all measured (`docs/act6-briefs/balance/runs.jsonl`, the `hero` row
of the Warden-difficulty cells at levels 47-50, the bot's reference build):

| class | life | armour cut (`red`, `combat.js:155`) | block | sheet dps |
|---|---|---|---|---|
| Warden | 3,850-5,780 | 0.31-0.41 | 13-18% | 2,070-2,920 |
| Ranger | 2,670-4,390 | 0.24-0.32 | 0 | 1,860-3,000 |
| Mage | 3,150-4,060 | 0.19-0.32 | 0 | 2,000-2,580 |

- An ordinary blow at level 50 is `monsterDmg(50)` = 215 × the kind's `dmg` (`data.js:368`). Against these lives a
  goblin's is 4% before armour and a troll's slam (2.6 × 1.6) is 24%: the shipped big bodies already hit like heavies,
  the small ones are chip.
- A boss of life multiplier M at level 51 has M × 2,460 life (`data.js:367`). The same hero took the Tower (319,396
  life) in 71 / 47 / 39 s: an effective 4.5-8.2 thousand a second at level 43, about 6-9 thousand at 50.

---

## Zones

### How the hero gets there, and what does not change
- **Route:** Whitecliff → the `pass` waypoint → the goat track at the Pass's camp (exit `thaw`, locked `haldaOut`; an
  interact on cells that are already walkable, found as `ropeSpot` finds the rope hole, `gen6.js:1190`) → the
  Meltwaters → the cut stair behind the Den (exit `tarn`, locked `kallistoRest`) → the Hanging Lake. Home by waypoint.
- **Waypoints:** `thaw` (the Goat Track camp) and `tarn` (the Stair's Head). **Checkpoints** (`flags.cp7`, the `cp6`
  pattern, `world.js:1790-1799`): each camp, each lookout hearth once lit, and the mouth of each boss arena.
- **Seeds per difficulty:** `thaw@<diff>`, `tarn@<diff>`. No older zone's layout changes; `gate7` asserts it.
- **A zone's row:** `ZONES.thaw = { level: 40, ..., act: 7, pack: 'melt', light: 'sun' }`, `ZONES.tarn = { level: 43,
  ... }` beside the rows at `world.js:42-63`. Monsters track the hero (`actors.js:161-164`), so both zones are fought
  at 50 (52 from Nightmare up).

### What both layouts carry (`genThaw`, `genTarn` in `src/world/gen7.js`)
Fields the shipped readers already know, so nothing downstream is new:
- `L.bed` in 0.15 m steps with `BED_DRY` for dry ground, `L.pocket` (1 = on the clock, 2 = the own-level channel),
  `L.tideCfg`; `L.thick`, `L.window`, `L.deck`, `L.sea` zero-filled and `L.ice` undefined (Act VI's arrangement,
  act6-design "Layout fields"). A cell is wadeable while the level stands less than 0.45 m over its bed and closed from
  there up (`genlib.js:65`); a bed of −0.45 or lower is deep at every level (`tide.js:73-74`).
- `L.flues` for chutes and sluice channels (mouth x, z, dir, len, w, cover; `forge.js:1`), each with `kind: 'snow' |
  'water'`, `armed`, `horn` (the horn-stone's cell).
- `L.vault` patches for loose rock and ice under cliffs (`forge.js:211`), `L.low` for gorges and crevasses.
- **New, written once by the generator:**
  - `L.shade` (Uint8): cells in fixed shade (under cliffs, in gullies, under thick pines).
  - `L.snow` (Uint8): 0 never snow; 1-3 snow that is bared when that many weirs are open; 4 snow until the after
    reading; 5 snow always (chutes, north faces). The Snow-worm's ground and the ground shader's snow mask read the
    same byte, so what is drawn white is what the worm can tunnel.
  - `L.noCloud` (Uint8): cells no cloud's line may cover (the Den's bowl and 4 m round it).
- `L.spots`: `camp`, `weirs[3]`, `fords[3]`, `narrows`, `lookouts[3]`, `hornStones`, `dens`, `slabs`, `iceblocks`,
  `huts`, `arena`, `hearth` (the arena's own), `haldaRim`, `den`, `stair` in `thaw`; `camp`, `winches[3]`,
  `lookouts[3]`, `bridges[2]`, `piers`, `levers[3]`, `seat` (Kelados), `plug`, `hearth`, `haldaRim` in `tarn`.
- `L.packs` entries as gen5 and gen6 write them: `{ x, z, n, tag, elite, dormant, tide, ... }` (`gen6.js:591`,
  `gen5.js:535-560`), spawned by `spawnPack` (`world.js:432-474`).
- Retries `seed + k·7919`, 24 tries, the last accepted; the shared helpers `reach`, `nearReach` (`genlib.js:9-20`),
  `refugeNear`, `bfs` (`gen5.js:775`, `:810`), `walk6`, `wideDry` (`gen6.js:67`, `:224`).

### thaw (40) «Τα Λιόνερα» / "The Meltwaters"

**The picture.** A green high valley on a spring morning, sun low in the east, long pine shadows on grass. Water
everywhere: braided brooks over a meadow, a river the colour of milk tea across the whole map, white snow lying in every
hollow and lane. Nothing is blue-black. The brightest thing on screen is never the ground (exposure 1.0, the hero's own
light off).

**Two readings.**
| reading | when | what differs |
|---|---|---|
| `spate` | from `thawSeen` until `act7` | the Race at 1.2 − 0.3 × (weirs open); snow by `L.snow` and the weir count (`setThaw` 0.65 / 0.45 / 0.3 / 0.15); chutes armed; all packs |
| `green` | after `act7` | the Race at 0.3 and clear; snow only where `L.snow` is 5; the Meadow's chutes gone, the Den's and four of the flank's stay; flowers; Kallisto asleep by the den with the cub (the echo's spot); the same packs at the same counts, for farming |

The Race's level is read from flags on every entry (`raceLevel(F)` into `resetTide(z, { mere })`, `tide.js:88-95`), so
the reading is never a saved layout.

**Layout.** 112 × 184 cells, south at the bottom, the climb north. Seven bands:

| | area | rows (z) | size in cells | what it is |
|---|---|---|---|---|
| A | «Το Γιδόστρατο» / "The Goat Track" | 164-180 | camp r 8 at (56 ± 6, 172 ± 3) | always dry; Halda's fire, the waypoint, the arrival cine looking north |
| B | «Το Πνιγμένο Λιβάδι» / "The Drowned Meadow" | 122-164 | 112 × 42 | flat grass, 4-6 braided brooks (pocket 1, bed 0.3-0.75), 3-5 shepherds' huts and a fold, two knolls, a dry causeway 3 cells wide with two plank bridges |
| C | «Το Ρέμα» / "The Race" | 104-122 | 112 × 18 | the river (pocket 2, bed −0.45) with three raised fords; **weir 1 on its south bank** at the west end |
| C′ | «Οι Ρεματιές» / "The Gullies" | 88-104 | three pockets of about 12 × 16 | the north bank; the middle gully (x 50-62, weir 2) and the east gully (x 90-100, weir 3); the west one holds a den and the trail up |
| D | «Οι Σούδες» / "The Chutes" | 58-88 | 112 × 30 | a switchback 3 cells wide across the steep flank, crossed by 5-7 chutes; boulders and thick pines beside it |
| — | «Τα Στενά» / "The Narrows" | 54-58 | a moat 4 cells deep | an arm of the Race (pocket 2) with one ford |
| E | «Τα Προσήλια» / "The Sun-terraces" | 38-54 | 112 × 16 | warm flat rock, wholly in sun; slabs, two dens in the east wall |
| F | «Η Φωλιά» / "The Den" | 5-39 | arena r 17 at (56 ± 4, 22 ± 1) | the boss bowl, the den's mouth, the cut stair |

**The path and its four gates.** The base put all three weirs north of a river that is closed at 1.2; that cannot be
walked. The weirs are therefore in sequence, each one opening the road to the next, and the river is a gate the player
lowers three times:

| the Race | weirs open | what opens | ford bed |
|---|---|---|---|
| 1.2 | 0 | the south bank only: the Meadow, lookout 1, **weir 1** | — |
| 0.9 | 1 | the **west ford**: the north bank, the west gully and its den, the lower Chutes, lookout 2, **weir 2** in the middle gully | 0.6 |
| 0.6 | 2 | the **middle ford** (a short way back to the camp) and the gravel bar to the east gully: **weir 3** | 0.3 |
| 0.3 | 3 | the **east ford** and **the Narrows**: the Sun-terraces, lookout 3, the Den | 0.0 |

Each ford is wading at its level and deep one step higher (bed 0.6 at 1.2 is 0.6 m of water; at 0.9, 0.3 m). The
Chutes can be explored from the first weir on; the Den cannot be reached before the third.

**The three weirs.** A Stoneborn wheel on a stone sill, a 2 s interact («Γύρνα τον τροχό» / "Turn the wheel"), broken by
a blow (the shipped rule for a touch that takes a moment, `combat.js:174-175`). Each has one set piece, one new rule and
nothing else on screen:
1. **Weir 1, the dormant wake.** A Den-bear asleep 6 m from the wheel. Walk softly round it or fight it: a loud skill
   within 12 m wakes it.
2. **Weir 2, the Slide.** The middle gully's own chute crosses between the trail and the wheel, **armed from the
   zone's build with a goblin camp standing in its lane** and its horn-stone beside the trail. Whatever loud skill the
   player opens with buries the camp; the cover boulder is on her side.
3. **Weir 3, Sun and Shade.** A Rock-roller in a block of blue ice under the cliff's shade, two goblins chipping at
   it. A cloud's line is laid so that its edge slides off the block within 20-40 s of her arrival.

**Chutes.** 5-7 on the flank (D), one in the middle gully, three in the Den. A lane 4 cells wide and 22-30 long,
downhill, from a cornice at the cliff to a horn-stone at its foot. Hard checks: every trail cell inside a lane has cover
that breaks `map.los` to the mouth within 4 m (`inFlue`, `forge.js:54-58`); no lane crosses a camp, a wheel, a hearth or
another interact; at least two flank chutes have a pack spot in the lane and at least two have none.

**Shade.** `L.shade` under the east cliff all morning (the sun is in the east: the gullies' east sides, the Narrows'
east bank, the Chutes' upper third). 3 clouds (r 9-14 m, 1.2 m/s, on seeded lines running west) cross B, D and E;
none crosses the Den (`L.noCloud`).

**Lookouts** (three of the six; the table for all six is below): 1 on the Meadow's west knoll, 2 on a shoulder between
two flank chutes, 3 at the terraces' lip.

**Set pieces the story needs** (from the base §2.3; the story part owns the scenes):
- the arrival: the whole valley of running water from the camp, pitch 0.3;
- a weir turned and the river dropping a step along its whole length at once (`uBayLevel`, `tide.js:45`, `:155`);
- the snow drawing back after each weir;
- Kallisto's rest: she sits; the cub comes out of the den's mouth and rubs against her (`kallistoRest`);
- Halda's rim spot at the Den (`S.haldaRim`: a ledge of r 2 on the south-east rim, outside every lane and every
  charge line, with line of sight to the bowl) for her calls.

**Light.** `ATMOS.thaw` as the base sets it (fog 0x9fb6c6 at 0.012, sun `[-18, 22, 10]`, exposure 1.0, heroI 0), with
`thawFight` (zoom 1.2) in the Den. No Cold, no thin ice, no Shroud, no ring.

**What loads.** Ground: `melt/meadow` (or boot `leaves` tinted green), `scree` or `mud`, `trail`, `wall`, and the snow
as a white fake of the meadow layer when `rime` is not resident. Props: boot `env`, `trees`, `village`, the kits; code
props from `build7.js`. Creatures: group `act7` = `['bear', 'golem', 'worm', 'skua']` (a new row beside
`creatures.js:35-45`); wolves, goblins, the troll and the spider are boot. About 17-24 MB cold (judge 2, P11).

**Packs.** Fifteen, and three more at the lookouts. `n` is the count before difficulty and co-op (`world.js:436`).

| area | tag | n | spots | on the trail | notes |
|---|---|---|---|---|---|
| B | `looters` | 5-7 | 2 | 2 | at two huts on the causeway |
| B | `looters` | 5-6 | 1 | 0 | in a hut standing in water (`tide: true`): the brook's rise empties it onto the causeway |
| B | `hillWolves` | 4-5 | 1 | 1 | the east knoll |
| B | `choughs` | 5-6 | 1 | 0 | over the open meadow |
| C | `den` | 3 | 1 | 1 | weir 1: the Den-bear dormant, two wolves 8 m off |
| C′ | `looters` | 6-7 | 1 | 1 | weir 2: the camp in the armed lane |
| C′ | `icebound` | 3 | 1 | 1 | weir 3: the Rock-roller in ice, two goblins |
| C′ | `den` | 3 | 1 | 0 | the west gully's den |
| D | `snowHunt` | 3-4 | 2 | 2 | snow between the lanes |
| D | `icebound` | 3 | 1 | 1 | under the cliff, beside the switchback's second turn |
| D | `choughs` | 5-6 | 1 | 0 | a dead pine above lookout 2 |
| E | `slabs` | 3-4 | 2 | 1 | under flat stones |
| E | `terrace` | 5-6 | 1 | 1 | goblins, a marksman on a ledge, two scorpions |
| E | `den` | 3 | 1 | 0 | the east wall |

Eleven on the critical path, four off it (the bot's eight-pack run takes the first eight in reach,
`balance-act.mjs:681`). Elites: the generator's own 15% champion roll on a pack (`gen6.js:591`), the runtime roll
(6% × the difficulty's `elite` × `HAZ7.champ`, `world.js:438`), and a certain champion or rare pack at each lookout.

**Reach checks (hard), after dressing.** With the brooks at h 0 and at their top, and the Race at 1.2, 0.9, 0.6, 0.3:
- the camp reaches exactly what the table above allows at that level and nothing more (no way to weir 2 at 1.2, to weir
  3 at 0.9, across the Narrows at 0.6);
- the causeway, every wheel, hearth, hut door, horn-stone, the camp and the exits on dry cells; every brook with a dry
  refuge of 3 × 3 within 12 m (`refugeNear`, the lane rule of `tide.js:11-15`);
- **the Den's stream never deep:** its bed is at most 0.3 m under the clock's top, so it only ever wades (see Kallisto);
- the Den: six boulders at r 9-13 no two closer than 5 m; every pair of the three lanes leaves a clear wedge of at least
  6 × 6 cells; the arena hearth, the stair and Halda's ledge outside every lane; two interacts never closer than 3 m;
- no carved feature within 3 cells of the frame; mean tries per seed above 3 is a soft failure.

**What a capped hero fights here.** A first run is 25-35 minutes. On the critical path: one bear's charge by a wheel,
one loaded lane, one troll in ice with a cloud coming, two worm bursts in the snow between lanes, a flock that mobs
anyone who stands in the open, scorpions that are slow in shade and fast in sun, and two packs with a marksman behind a
line of goblins. Each pack opens with its heavy move. The target and its sum are under "Zone danger" below.

### tarn (43) «Η Κρεμαστή Λίμνη» / "The Hanging Lake"

**The picture.** Noon above the tree line. A snowfield in full sun with cloud shadows crossing it, grey Stoneborn
masonry standing out of it in a row, and at the far end a lake the colour of a bird's egg behind a wall of old ice with
a seated shape inside it, visible from the first step. **Against "a third blue act" (judge 2, risk 2): at least 40% of
the walkable cells are bare rock, scree, lichened stone and shingle** (the Old Works and the Shore whole, rock islands
in the Snowfield); snow lies only on the Snowfield, in the chutes and on the north faces; exposure 0.92.

**Two readings.**
| reading | when | what differs |
|---|---|---|
| `full` | from `tarnSeen` | the lake at 1.2; after `keladosRest` at 0.6 (the fight lowers it); the Dam's mouth plugged with ice until `keladosWake` |
| `let` | after `lakeLet` | the lake at 0.3, a third of its size, a green rim of `melt/meadow` round it; Kelados a moss-grown shape in the slope with a pine on his shoulder (the echo's spot); lookout 6's causeway wadeable |

**Layout.** 104 × 176 cells, south at the bottom.

| | area | rows (z) | size | what it is |
|---|---|---|---|---|
| A | «Η Κορφή της Σκάλας» / "The Stair's Head" | 158-174 | camp r 8 at (52 ± 4, 166 ± 2) | the stair's top, a wind-wall, Halda's fire; the arrival cine at pitch 0.3 |
| B | «Το Χιονοπέδιο» / "The Snowfield" | 110-158 | 104 × 48 | open snow; 4-6 chutes off the east and west ridges crossing the trodden trail; two crevasses (`L.low`) with one static snow bridge each, 3 cells wide; four rock islands |
| C | «Τα Παλιά Έργα» / "The Old Works" | 70-110 | 104 × 40 | channel walls, a roofless wheel-house (about 14 × 10), a row of seven stone piers; **winch 1** in the wheel-house, **winch 2** on the east pier |
| D | «Ο Γιαλός της Λίμνης» / "The Lake Shore" | 38-70 | 104 × 32 | the tarn over the west and centre (pocket 2, shelves at bed 0.9, 0.6, 0.3, then −0.45); a shingle shelf 10-14 cells wide down the east side; **winch 3** on a jetty reached by a causeway on the clock (pocket 1) |
| E | «Το Φράγμα» / "The Dam" | 6-38 | arena r 16 at (52 ± 3, 22 ± 1) | the wall of ice (north, blocked, 9 m), Kelados's seat, the lake's lip (west), three levers, two chutes, the arena hearth |

**The path and its gates.** The camp → the Snowfield's trail (two lanes to cross, one crevasse to path round) → the
Old Works (winch 1, winch 2) → the Shore (winch 3) → the Dam. The Dam's mouth is a 3-cell plug of ice that opens at
`keladosWake` (`map.change`, the plug helper of `gen6.js:118`). Each winch is a 2 s channel with the Cradle, and each
is one rule met alone:
1. **Winch 1** stands in a chute's lane: thaw it between slides, or bring the slide down first.
2. **Winch 2** freezes again whenever a cloud lies on it: thaw it in sun.
3. **Winch 3** is out on the jetty; its causeway is covered at the clock's top and bare at its low.

**Chutes.** 4-6 in the Snowfield, one over winch 1, two at the Dam (an X across the arena). The snow bridges are never
inside a lane.

**Shade.** `L.shade` under both ridges' inner faces and behind the piers. 3 clouds cross the Snowfield and the Works;
**two lines cross the Dam**, timed so that a cloud lies on the arena's middle for about 15 s in every 50.

**Lookouts:** 4 on a rock island in the Snowfield, 5 on the wheel-house's surviving corner, 6 on a skerry in the lake,
cut off until the lake stands at 0.6 (after the boss): the reason to come back.

**Set pieces the story needs:** the arrival across the snow to the lake and the shape in the ice; a wheel that still
turns; the third winch and the mountain lifting its shoulder (`keladosWake`); the ice coming off Kelados in plates; a
sluice opened under his feet; Kelados kneeling and the word (`keladosRest`); the sluices and the lake going out in a
white thread (`lakeLet`). Halda's rim spot: a pier stump on the south-east rim, r 2.

**Light.** `ATMOS.tarn` as the base (fog 0xc6d6e6 at 0.010, sun `[-6, 32, 4]`, exposure 0.92), `tarnFight` zoom 1.25.
`heavyZone` on for this zone until perf7 on the owner's phone says otherwise (`world.js:298`; judge 2, P16).

**What loads.** `rime` (snow, ice, shore, cliffs, icicles) and `melt`; the dungeon kit for the Works (boot); group
`act7`. About 58-65 MB cold.

**Packs.** Thirteen, and three at the lookouts.

| area | tag | n | spots | on the trail | notes |
|---|---|---|---|---|---|
| B | `snowfield` | 5-6 | 2 | 2 | wolves, a worm, choughs overhead |
| B | `snowHunt` | 3-4 | 1 | 0 | the snow west of the first crevasse |
| B | `icebound` | 3 | 1 | 1 | the east ridge's shade, at the second lane |
| B | `choughs` | 6-7 | 1 | 0 | the rock island south of lookout 4 |
| C | `worksMixed` | 5-6 | 2 | 2 | goblins and marksmen on the channel walls, scorpions below |
| C | `icebound` | 3 | 1 | 1 | among the piers: its boulders become cover in the open |
| C | `slabs` | 4 | 1 | 0 | the nest under the wheel-house floor |
| D | `shoreDen` | 3 | 1 | 1 | a Den-bear awake and fishing, two wolves |
| D | `slabs` | 3-4 | 1 | 1 | the shingle |
| D | `looters` | 5-6 | 1 | 1 | the causeway's head (`tide: true`) |
| D | `choughs` | 5-6 | 1 | 0 | the jetty's posts |

Nine on the critical path, four off it.

**Reach checks (hard).** As `thaw`, with the lake at 1.2, 0.9, 0.6 and 0.3 and the clock at both ends: winch 3's
causeway reachable at the clock's low and never at its top; the three levers, the arena hearth and Halda's stump reach
each other round the rim at every lake level; at 1.2 the arena has at least r 12 of floor; every pair of the Dam's two
lanes leaves a quadrant of 6 × 6 cells clear; the seat within 3.5 m of floor on its south side (a melee hero must reach
him rooted); no thrown block can close the rim ring (blocks never land beyond r 12).

### The six lookouts («βίγλες»)
They are the Seven Fires' holds and the Call's hearths at once (decisions.md; the rules of the hold and of the Call are
the mechanics part's). This part fixes where they stand and what comes.

| # | zone, place | cut off by | the hold's pack (certain) | what the terrain does during the hold |
|---|---|---|---|---|
| 1 | `thaw`, the Meadow's west knoll (a dry rock, r 4) | the brooks at their top | `looters`, champion | the brooks rise once round the knoll |
| 2 | `thaw`, a shoulder between two flank chutes | snow | `hillWolves`, champion | one chute armed over the approach |
| 3 | `thaw`, the terraces' lip | nothing (the view) | `slabs`, rare (a matriarch at × 1.25) with a flock | open sun: no shade within 8 m |
| 4 | `tarn`, a rock island in the Snowfield | snow | `snowfield`, champion | two clouds cross in the 75 s |
| 5 | `tarn`, the wheel-house's corner | masonry | `icebound`, rare (the Rock-roller alone: a big rare comes alone, `world.js:462-463`) | its boulders stay as cover; winch 1's chute is in earshot |
| 6 | `tarn`, the skerry | the lake above 0.6 | `shoreDen`, rare | the causeway covers once |

Each hearth stands on a dry cell outside every lane, 3 m or more from any other interact. A hold is priced apart from
the zone run: 0.10-0.20 lives on Warden difficulty.

### Zone danger: the sum (measured at G2, before a boss exists)
| measure, one zone run of eight packs, Warden difficulty, the reference build at 50 | target |
|---|---|
| lives of damage | 0.4-0.8 |
| lowest life (median over runs) | 35-65% |
| seconds under 30% of life | 0-6 |
| deaths | 0-1 in the 36 runs of the two zones |
| a pack's time (median) | 8-14 s |
| monster deaths owed to a slide or to water | 15-35% |

How the numbers get there. A pack opens with its heavy move and gets a second after 6-8 s if it lives; eight packs
throw about sixteen. The bot avoids most; three to five land at 10.6-14.6% each (the 18% share after the table's armour
cuts): 0.35-0.7 lives. Chip adds 0.05-0.10; one slide taken in three runs adds 0.05. Two heavy blows inside three
seconds with chip between them is the 35-65% low. Act VI's zones failed this because nothing in them was priced against
her own life (0.05-0.33 lives a run, `balance-report.md`).

---

## Enemies

### Rules for the act's creatures
1. **Nothing here is of the dark.** No `shroud`, `unlit` or `unseen`; every creature is plain to see and aimable at all
   times (fliers hang low, as the Skua does).
2. **One heavy move each, and it opens the fight.** Telegraph 0.9 s or more, red, never changed by difficulty or by the
   `fast` affix (`startAttack` shortens a swing, `ai.js:316`; a heavy's wind-up is the move's own clock, as the bear's
   rear already is, `ai.js:656-658`). It hits once for `HAZ7.heavy` of **her** life before armour and block, never
   multiplied by `DIFFS.dmg`, by an elite's blow factor or by `COOP.dmg`, and never more than `HAZ7.cap` after armour.
3. **Everything else is chip:** an ordinary blow's `dmg × multiplier` is at most 1.9, which is 8% of the measured
   Mage's life after armour and under 4% of the Warden's. The big bodies' shipped numbers are lowered to meet it.
4. **A stun, a freeze or a fear breaks a wind-up** (the shipped rule, `ai.js:130`): every class has an answer besides
   moving.
5. **Hazards strike them as they strike her.** A slide takes a creature in the lane in full, carries it to the lane's
   foot and Dazes it (`daze`, `ai.js:1886`); what this part assumes of the mechanics part is in the notes.
6. **Life.** `HAZ7.hp` multiplies the act's regular creatures' life (1.8; 1.5 on Wanderer) so a pack lives 8-14 s
   against a capped hero and its heavy can come round twice. Act VI's eight packs fell in 19-66 s all told.
7. **Every model is shipped.** No new `CAST` row for a regular kind: each def names a shipped model id. `cast7` asserts
   each body and its stand-in cold.

### The seven entries

| # | id | name | body, scale, loaded by | AI reused | life / blow / speed | the heavy move | telegraph | cooldown |
|---|---|---|---|---|---|---|---|---|
| 1 | `hillWolf` | «Ορεινός Λύκος» / "Mountain Wolf" | `wolf.glb` (model `warg`), × 1.15, grey-brown; boot | `pounce` (`ai.js:434`) | 1.1 / 0.9 / 6.6 | **Long Pounce**: from 6-10 m, a line 10 × 1.8 m | 0.9 s crouch | one a pack each 6 s |
| 2 | `goblin`, `goblinShaman` (shipped), `goblinMarksman` | «Καλικάντζαρος», «Σαμάνος Καλικάντζαρος», **«Καλικάντζαρος Σημαδευτής» / "Goblin Marksman"** | `goblin.glb`; boot | `melee`, `caster`; `ranged` (`ai.js:392`) | marksman 0.6 / 0.7 / 4.0, reach 12 | **Aimed Bolt**: every third shot, a line 14 × 1.2 m | 0.9 s, standing still | every third shot (about 5 s) |
| 3 | `chough` | «Καλιακούδα» / "Chough" | `skua.glb` (model `skua`), black; group act7; stand-in the boot spiderling (`actors.js:61`) | `bat` → `skua()` (`ai.js:498-499`, `:1763`) | 0.3 / 0.45 / 7.5 | **the Mob**: the flock stoops together through a circle of r 3 | 1.1 s, all crying | one a flock each 14 s |
| 4 | `denBear` | «Φωλιάρκουδα» / "Den-bear" | `bear.glb` (model `rimeBear`), × 1.25, brown; group act7; stand-in the boot troll | `charger` (`ai.js:640`) | 4.2 / 1.5 / 5.6 | **Charge**: a line of up to 18 m, 3 m wide or more | 0.9 s rear | 5-7 s (`ai.js:659`) |
| 5 | `snowWorm` | «Χιονοσκώληκας» / "Snow-worm" | `worm.glb` (model `deepworm`), white; group act7; stand-in the boot spider | `burrow` (`ai.js:524`) | 1.8 / 1.2 / 4.4 | **Burst**: up from under her, a circle of r 2.4 | 0.9 s (`ai.js:535-547`) | each surfacing, 6-9 s apart |
| 6 | `rockRoller` | «Πετροκυλιστής» / "Rock-roller" | `troll.glb` (model `troll`), × 1.2, rimed grey; boot | `brute` (`ai.js:452`) | 7 / 1.4 / 3.2 | **Rolled Boulder**: a line 14 × 2.6 m; the boulder stays | 1.2 s | 8 s |
| 7 | `rockScorpion` | «Πετροσκορπιός» / "Rock-scorpion" | `spider.glb` (model `spider`), × 0.8, ochre; boot | `rootling`'s burst (`ai.js:612-619`), then `melee` | 1.0 / 0.8 / 5.2 (3.1 in shade) | **Sting**: every third blow, a cone 2.6 m, 60° | 0.9 s, the tail raised | one a pack each 3 s |

**The heavy share by difficulty** is one row for all seven (`HAZ7.heavy`: 9 / 18 / 22 / 26 / 31 / 36% before armour);
see Difficulty. On Warden difficulty it lands for 10.6-14.6%.

| # | Warden | Ranger | Mage | the Race | the Slide | Sun and Shade |
|---|---|---|---|---|---|---|
| 1 wolf | roll through the line; a boulder at his back Dazes the wolf | sidestep; Snare in the line | blink; Frost Nova on the croucher | cannot swim: deep water is a wall between you; wades a ford at × 0.75 (`combat.js:476`) | full; carried; Dazed | none: the plain one |
| 2 goblins | Leap onto the marksman | out-range it at 14 m, or break line of sight | Chain Lightning's jump reaches it | a rising brook puts a flooded camp out on the causeway (`evict`, `tide.js:340`) | full; the act's best slide target | none |
| 3 chough | fight under a pine; Bulwark for the Mob | shoot the flock while it bunches for the Mob | Nova as they stoop | none (fliers) | passes under them (`airborne`, `forge.js:120`) | all of it: they stoop only at a hero in open sun |
| 4 den-bear | stand before a boulder and step aside | the wolf's howl wakes it from 12 m; pull it into a lane | Nova's slush stops the charge dead | the brook rising into its den wakes it | 20% of its life, Dazed 2 s, not carried (`big`) | none |
| 5 snow-worm | step onto rock; strike it when it surfaces | the same; pin it while it is up | the same; fire on snow does nothing to it | none | a slide packs the snow: a worm under the lane is forced up, Dazed 2 s | its ground shrinks with every weir |
| 6 rock-roller | sidestep the line, then use the rock | she draws the boulders, so she builds the party's cover | blink; fire on the block wakes it early | wades, never swims | 20%, Dazed 2 s, not carried | **Icebound** |
| 7 scorpion | fight them in shade | kill them while they are slow | Nova holds them in the sun | water over the slabs brings them out | full; carried; Dazed | slow in shade, quick in sun |

### Rules, entry by entry

**1. Mountain Wolf.** The shipped pounce (3.5-7 m, no warning, × 1.3 of a 0.9 blow: chip) stays. New: when the pack's
clock allows (one clock a pack, the Rootlings' shriek pattern, `ai.js:631-632`) a wolf at 6-10 m with a clear line
crouches for 0.9 s behind a red line and leaps its length. It lands as the heavy blow on whoever is on the line. A leap
that ends at a blocked cell (a boulder, a pine, the cliff) or in a slide's tongue leaves it Dazed 1 s. Packs of four or
five; with `horde`, six. `vampiric` heals on a landed Long Pounce and on nothing else worth having (`combat.js:178`).

**2. The looters.** The pass goblins' line as shipped: `goblin` and `goblinShaman` (data rows `data.js:123`, `:125`)
are fodder and a healer, unchanged and without a heavy of their own. The entry's heavy is carried by one new kind, the
**Marksman**, a `goblinArcher` row (`data.js:124`) with `aimEvery: 3`: two ordinary bolts, then it plants its feet for
0.9 s behind a thin red line 14 m long and looses one bolt worth the heavy share. The every-third pattern is the
Harpooner's (`harpoonEvery`, `ai.js:393`). The line is a real shot: anything solid stops it. A pack has one marksman in
five (two in the `terrace` and `worksMixed` packs), always behind the line. Kill the shaman first, or the marksman: the
old question with a price on the second answer.

**3. Chough.** The Skua's row (`data.js:187`) with a black tint and `shadeShy` in place of `lightShy`. In a 'sun' zone
"light" is open sun, so the two tests in `skua()` that ask whether she stands in light (`ai.js:1799`, `:1824`) are read
the other way round: the flock circles out of reach, stoops two at a time (`diveToken`, `ai.js:1839-1844`) only at a
hero **in open sun**, and breaks off the moment she is under a cloud, a pine or a cliff. Their bites are the act's one
true chip (0.45). **The Mob:** when four or more of a flock are circling a hero who has stood in open sun for 5 s, the
whole flock cries and a red circle of r 3 appears where she stands; 1.1 s later they come through it together, low
enough to strike, and whoever is still in the circle and still in sun takes one heavy blow. In shade when it lands,
nothing lands. For the 1.1 s they are bunched at head height: the flock's weakest moment. Never more than seven. No
Cold on the bite (`coldBite` is dropped).

**4. Den-bear.** The `charger` as shipped, without the Rime Bear's roar and ice. The charge already ends Dazed 2 s
against anything solid and in slush (`ai.js:660`, `:1937-1957`); it becomes the heavy blow, and its end against a wall
is loud. The maul stays as chip (blow 1.5, the big maul × 1.25 = 1.9). **Dormant** in its den (`PACK_DORMANT`, a `wake`
of 5 m, `ai.js:82-99`), with three more ways to wake: struck; something loud within 12 m; the brook's water reaching its
cell (the `wake.tide` branch that wakes the Reefbacks, `ai.js:89`, `data.js:185`). Woken by water it rises calm and
walks to dry ground; woken by noise it comes at the noise. `shoreDen` at the lake is the same bear awake.

**5. Snow-worm.** The Deepworm (`data.js:140`) in white. It tunnels only through cells where `L.snow` still holds for
the current weir count; at the snow's edge it stops. The burst from under her is the heavy blow (the shipped circle and
0.9 s, a little wider). Up, it bites (chip) and spits: the acid bolt and its poison pool are replaced by a **slush
spit** that deals nothing and leaves a wading circle of r 1.6 for 4 s (`slushAt`, `tide.js:396`). A hero standing on
rock, on the trail or on bared grass cannot be burst; the worm surfaces at the snow's edge and spits at her from there
for 5-8 s, which is when it dies. As the weirs open its hunting ground shrinks; in the `green` reading it lives only on
the north faces.

**6. Rock-roller.** A troll (the shipped row is `data.js:130`) with its blow lowered from 2.6 to 1.4 so that its smash
and its every-third slam are chip (7.6% and under of the Mage's life) and loud. **Rolled Boulder:** at 4-14 m with a
clear line it heaves a boulder down a red line; the boulder runs it at 12 m/s, strikes the first hero on it for the
heavy share, and stops at the line's end or the first solid cell, where it **stays 20 s as a rock**: a 2 × 2 footprint
closed to feet, sight, shots and a slide's front (see the cover rule under Bosses). Three rocks at most from one
troll. **Icebound:** it spawns as a statue in a block of blue ice (the frozen crew's path, `ai.js:81`, `:954-971`) and
wakes when open sun has lain on its cell for `HAZ7.sunWake` seconds (2), when it is struck, when fire burns on its
block, or when the hero holds the Cradle to the block for 1.5 s. **Not when she walks near:** the shipped statue wakes
at 4 m (`ai.js:957`), and an Icebound must not, or the cloud's edge means nothing. Its pack-mates in the ice wake a beat
after it (`ai.js:961`).

**7. Rock-scorpion.** The forest spider at × 0.8 under an ochre tint, with the Rootlings' ambush: the pack lies under
flat stones and comes out together at 6 m or when one is struck (`burstPack`, `ai.js:616`). Its bite keeps the spider's
poison (`data.js:127`) as chip. **Sting:** every third blow the tail goes up for 0.9 s over a red cone and comes down
for the heavy share; one Sting a pack each 3 s, so three scorpions do not sting at once. **Cold-blooded:** on a shaded
cell its speed is × 0.6 and it does not Sting. A pack met under a cloud is a pack half disarmed; the same pack on the
Sun-terraces at noon is the zone's sharpest. Water over the slabs brings them out early and calm.

### Packs (`data.js` `PACKS`, beside the rows at `:232-298`)
| tag | made of (weights) | lead | dormant | plays as |
|---|---|---|---|---|
| `looters` | goblin 5, goblinMarksman 1.2, goblinShaman 0.8 | — | no | a line with one priced shot behind it |
| `hillWolves` | hillWolf 1 | — | no | find a boulder for your back |
| `choughs` | chough 1 | — | no (they roost) | fight in shade, or bait the Mob and punish it |
| `den` | denBear 1, hillWolf 2 | denBear | yes | wake it on your terms: softly, by noise from range, or with water |
| `shoreDen` | denBear 1, hillWolf 2 | denBear | no | the bear already up |
| `snowHunt` | snowWorm 2, hillWolf 1.5 | — | no | fight from rock, or kick the lane over them |
| `icebound` | rockRoller 1, goblin 2 | rockRoller | yes (statue) | kill the goblins before the sun reaches the block, or wake the troll under a cornice |
| `slabs` | rockScorpion 1 | — | yes | pick the shade |
| `terrace` | goblin 3, goblinMarksman 2, rockScorpion 2 | — | no | two priced things from two heights |
| `snowfield` | hillWolf 3, snowWorm 1.5, chough 2 | — | no | open snow in sun: everything at once, at low numbers |
| `worksMixed` | goblin 3, goblinMarksman 2, rockScorpion 2, chough 1 | — | no | the Works' walls are line-of-sight cover |

`PACK_LEAD` gains `den`, `shoreDen`, `icebound`; `PACK_DORMANT` gains `den`, `icebound`, `slabs`. Two shipped lines
need an Act VII branch: the fallback for an unknown tag (`world.js:440`) and the champion's stand-in for a big kind
(`world.js:452`): in these zones a champion pack is never bears or trolls but `hillWolf`.

### Elites and affixes (`ai.js:2085-2108`)
- A champion or a rare has the shipped life and chip factors (`actors.js:181-182`). **Its heavy move is the same
  share.** What makes it harder is that it lives long enough to use it four or five times.
- `fast`: its chip comes quicker; its heavy wind-up does not.
- `molten`: its fire patches thaw. An Icebound within 3 m of one wakes in half the time.
- `thunder`: a strike is loud: it kicks an armed, sunlit chute within 10 m, for whoever is in the lane.
- `frozen`: its orb leaves slush for 4 s, which stops a bear's charge as any slush does.
- `shielding`: 2.5 s that also hold against a slide. `teleporter`, `vampiric`, `horde`, `armored`: as shipped.
- Rare leads: a rare Den-bear and a rare Rock-roller come alone; a rare scorpion (the matriarch) with three minions.

---

## Bosses

### The law (decisions.md rule 1, written for these two fights)
1. **A heavy blow is `HAZ7.bossHeavy` of her life before armour and block**, one number a difficulty, never multiplied
   by `DIFFS.dmg` or `COOP.dmg`, capped at `HAZ7.cap` after armour. On Warden difficulty: 22% before, **13.0-17.8%
   landed** on the measured heroes, cap 20%. (The systems proposal's 26-30% would land 19-24% on the measured Mage.)
2. **Every damaging move is a heavy blow.** No basic chip, no lingering ground, no add that bites for 2%. The
   environment's two: a slide (`HAZ7.slide`, pure) and a wash-out (`HAZ7.wash`, pure).
3. **No least-time lock of any kind:** no `hpFloor`, no `lockPhase`, no `*_MIN` table, no `bossMin` column, no
   invulnerability, no hold at a phase's turn. A phase turns on life alone. Its entry move is queued (`a.queue`,
   `ai.js:2597`) and plays while the boss stays open to every blow; a hero who strikes through two thresholds at once
   gets both entries queued in order.
4. **Every move has a range band** (any range; within reach of the boss; beyond 8 m) and each fight has a count table.
   G3 gates blows landed within ± 30% of the three classes' mean.
5. **Telegraphs:** 0.9 s or more, never changed by difficulty. At most two big telegraphs at once, and a slide's or a
   sluice's lane counts as one.
6. **One window a phase, made by the mountain:** a charge ended on stone, a slide, a sluice. Using it shortens the
   fight; not using it costs time only. **Halda calls it once a phase from the rim and, once a phase, does it herself
   for a player who has not** (the story proposal's fail-safe). The arena hearth's Call arms on the window.
7. **One vulnerability at a time, × 1.5** (`daze`, `ai.js:1886-1898`; a boss's cap is 1.6, `combat.js:270`).
8. **One boss actor**, never off screen, never untouchable. **Neither is killed.**
9. **Pace by difficulty goes through one helper**, `bcd7(s) = s × HAZ7.bossCd`, as Acts V and VI did (`ai.js:3589`,
   `:4761`). `boss()` already runs its third phase a quarter faster (`ai.js:2573`): no cooldown in the tables below adds
   to that.

**Cover.** A rock or a block left on the ground closes a 2 × 2 footprint with `low` false, so sight, shots, a tremor
ring and a slide's front stop at it (judge 2, P3: a shipped shard closes its cell through `map.change`'s default,
`low = true`, `src/world/map.js:41`, and a low cell does not stop sight, `:22-26`: it gives no cover). Never on a cell a hero stands on (the shipped rule, `forge.js:196-199`), never within 3 m of an interact, never
beyond r 12 of an arena.

**Life, and why these starting numbers.** The base's × 230 and × 300 come to 566 and 738 thousand at level 51. At the
measured 6-9 thousand a second, with a boss that is struck three quarters of the time, they fall in 85-125 s and
110-165 s: under both bands. **Start Kallisto at × 340 (836 thousand) and Kelados at × 480 (1.18 million);** the bot
sets them to the middle of the bands at G3. The band is the rule, the multiplier is not.

### kallisto «Καλλιστώ, η Αρκούδα του Ξυπνήματος» / "Kallisto, the Waking Bear"

**Concept.** A great bear the thaw woke a month early, hungry, with a cub in the den behind her. Not evil and not
killed. She teaches the Slide and nothing else: no cloud crosses her bowl and no water moves in it. Tagline
`mon.kallisto.t` «Ξύπνησε νωρίς, και πεινάει.» / "She woke early, and she is hungry." No lines.

**Data.** `kallisto: { model: 'kallisto', hp: 340, dmg: 1.6, speed: 5.4, radius: 0.85, ai: 'kallisto', reach: 4.6,
atk: 'smash', atkTime: 1.6, flesh: 'flesh', xp: 300, boss: true, big: true, swim: true, spare: true, sfx: 'bear',
dieClip: 'daze', look: { scale: 2.1, tint: 0x3a2c22, tintAmt: 0.2 } }`. `CAST.kallisto = ['bear', 1]`;
`STAND_IN.kallisto = ['amberBear', 'troll']`. Level `max(40 + 2, hero + 1)`: she joins the first-boss list at
`world.js:415`. Table `KALLISTO = { name: 'kallisto', phases: [0.66, 0.33], wake: 16, intro, onPhase, tick, moves }`
run by `boss()` (`ai.js:2556`); `tick` is the Hart's wheel-away (`ai.js:2244-2251`, `:2300-2311`). Clips: `rear`
(charge), `howl` (roar), `attack2` (maul), `attack` (slam), `daze`, `hit`: all in `bear.glb` (judge 2, P10).

**Arena.** The Den, r 17.
- **Six boulders** at r 9-13 and **two fallen pines** on the rim: what a charge ends on.
- **Three chutes** fanning down from the north cliff 60° apart, each 4 m wide and the bowl long, each with a
  horn-stone at its foot and one boulder as cover beside it. Every pair leaves a clear wedge of 6 × 6 cells.
- **The head-stream** crosses west to east: a ribbon 3 cells wide that only wades, with two gravel bars. It is on the
  brooks' clock (pocket 1) and **never deep**. It slows a hero who fights in it to × 0.7 (`combat.js:476`) and not the
  bear (`swim`), so the fight is had on the bars and the banks. *(The base raised the Race a step in phase 2. The Race
  has one level for the whole zone, and judge 2's cure, the clock held by `force`, moves that level too: under a force
  the own-level cells follow the forced level, `tide.js:81-83`. So no water moves in this fight.)*
- **The den's mouth** in the north-east wall (blocked; the cub's spot). **The arena hearth** on the south rim.
  **Halda's ledge** on the south-east rim. The cut stair in the north-west wall.

**Phases.**

**Phase 1, «Πεινασμένη» / "Hungry" (100-66%).** The thing to do: **make her charge end on stone.**
- Maul, Charge, Roar (one chute).
- Halda's call, 8 s in (`d.halda.k1`: what it must say: "put a rock behind you").
- Fail-safe: 30 s without a Daze or a burial, and the next time Kallisto stands in an armed lane Halda strikes its
  horn-stone with her hammer. Once.

**Phase 2, «Στριμωγμένη» / "Cornered" (66-33%).** Entry: she rears and brings two rocks off the cliff into the bowl's
middle (no blow: both land 6 m or more from every hero, and stay 20 s as two more things to end a charge on). The thing
to do: **bring a slide down on her.**
- Adds Rear-and-slam (within reach) and Rockfall (beyond 8 m).
- Halda's call (`d.halda.k2`: "the white lane, when she stands in it").
- Fail-safe: 30 s as above.

**Phase 3, «Το μικρό φωνάζει» / "The cub cries" (33-0%).** Entry: the cub cries from the den; she answers with a Roar
that arms two lanes at once. The thing to do: **stand where the second charge ends on stone.**
- The Charge is doubled; the Roar arms two chutes.
- Halda's call (`d.halda.k3`: "twice: she comes twice").
- Fail-safe: 25 s.

**Moves** (names are internal; cooldowns on Warden difficulty, × `HAZ7.bossCd` elsewhere).

| move | phases | telegraph | shape | band | what lands | cooldown |
|---|---|---|---|---|---|---|
| **Maul** | 1-3 | 0.9 s, `attack2` | a cone 4.6 m, 110° | within 6 m | heavy | 6 s |
| **Charge** | 1-3 | 1.0 s, `rear`; she wheels away first if nearer than 5 m | a line `min(22, d + 4)` × 5 m, run at 20 m/s | any | heavy and a push of 20 | 9 / 8 / 7 s by phase |
| **Second charge** | 3 | 1.0 s more, from where the first ended (the `chain` of a move, `ai.js:2589-2591`) | as above | any | heavy | with the first |
| **Roar** | 1-3 | 1.2 s, `howl`, no blow; then the Slide's own 2.8 s white lane | 1 chute (2 in phase 3), the nearest armed ones to her | any | `HAZ7.slide` (14%, pure) and carried 4 m down the lane | 16 / 14 / 12 s |
| **Rear-and-slam** | 2-3 | 1.1 s, `attack` | a circle of r 5.5 round her | within 7 m | heavy | 10 s |
| **Rockfall** | 2-3 | 1.2 s white-edged red circle | a circle of r 2.2 on the farthest hero beyond 8 m (solo: every third one falls on her wherever she is); the rock stays 20 s | beyond 8 m | heavy | 9 s |

- **Where a charge ends.** On a boulder, a pine, a rock or the cliff: **Dazed 3.5 s** (× 1.5), the Hart's and the
  bears' rule (`startDash` with `daze`, `ai.js:2295`, `:1952-1956`). In a slide's tongue or any slush: Dazed 2 s
  (`ai.js:1957`). On open ground: nothing.
- **A slide on her.** In a lane when it runs and not behind cover: 5% of her life and **Buried 3 s** (Dazed, × 1.5).
  It is her own roar that brings it: stand so that the lane she arms is the one she will charge through.
- **The engineered opening** is a clean bait: a Daze of 3.5 s or a burial of 3 s, and the arena hearth's Call armed by
  the first of each phase. Three or four of them is about a quarter off the fight.

**Range bands, a full fight on Warden difficulty, by design** (phases of about 45, 50 and 45 s).

| | any range | within reach only | beyond 8 m only |
|---|---|---|---|
| Phase 1 | Charge × 5, slide × 3 | Maul × 3 | — |
| Phase 2 | Charge × 5, slide × 3 | Maul × 3, Slam × 3 | Rockfall × 5 |
| Phase 3 | Charge × 4 (eight lines), slide × 3 (two lanes) | Maul × 2, Slam × 3 | Rockfall × 4 |
| **sum** | **27** | **14** | **9** (three of them on a lone swordsman) |

In 140 s a swordsman is asked about 44 questions and a shooter about 36, one each three to four seconds, and the plan
is that **4-8 land**. The swordsman is asked more and owns every Daze; if the ± 30% gate fails, the first lever is the Maul's
cooldown (6 → 8 s), the second the Rockfall's solo rule.

**Numbers.**
| | Warden difficulty, the reference build at 50 |
|---|---|
| time to rest | 110-170 s (median of each class's six runs); no run over 240 s or under 85 s |
| heavy blows landed | 4-8, each 12-18% of her life, none over 20% |
| lowest life (median) | 30-55% |
| seconds under 30% | 3-12 |
| deaths | 1-2 in the 18 runs; 0-1 in Wanderer's 36 |
| Wanderer time ÷ Warden time | 0.7-0.9 |

**By difficulty** (pace and moves, never telegraphs).
| | what changes |
|---|---|
| Wanderer | cooldowns × 1.35; the heavy share 11%; a slide 8%; **one move fewer a phase:** no Maul in phase 1, no Rockfall in phase 2, no second charge in phase 3; the Roar arms one chute throughout; life × 0.65 (`DIFFS.hp`) |
| Warden, Hero | as written; Hero's share 27% |
| Nightmare | cooldowns × 0.9; the Roar arms two chutes from phase 2 |
| Ash | × 0.85; in phase 3 a Rockfall may be thrown during a Charge's wind-up (two telegraphs, the rule's limit) |
| Skotos | × 0.8; the Roar arms all three in phase 3; rocks last 10 s |

**Co-op.** Life × `COOP.boss` (1.6 at two, 3.0 at four, `data.js:19`). The share is of the life of the hero it lands
on, so nothing else scales it. A charge picks the hero farthest from her last target. With three or four heroes:
Rockfall falls on the farthest and, 1 s later, on the nearest shooter; the Roar arms one chute more (three at most). A
horn-stone struck by a guest's loud skill is the host's event. A downed hero in a lane is moved to its edge (Act VI's
rule for the black water). Each hero has her own Call at the hearth each time it arms. The bands hold at two and four
within × 1.0-1.25 (`--coop`, `balance-act.mjs:7-9`).

**The end.** At 0 life `spare` takes the place of dying: `kallistoRest` is saved first; the `kill` event fires as for
any boss, so the quest, the loot and the first-kill legendary follow the shipped route (`combat.js:565-567`); she plays
`daze` into a seated idle, becomes an NPC body that nothing can target, and the story's scene takes over (the cub).
There is never a corpse. The scenario asserts the drop, the flag, the quest step and that she is still in the scene.

**Why there is no least-time lock, and how run C proves it.** Nothing in her table reads a clock against her life:
phases are two thresholds; the two entry moves are queued and she can be struck through both; she has no floor and is
never immune; the wheel-away and the charges take time in proportion to the fight's length, not a fixed toll. The only
damage that does not scale with the hero is the slides' 5%, which makes a doubled hero's fight a little **more** than
half as long, never less responsive. **Run C:** each class's Warden-difficulty cell again with the bot's damage dealt
doubled (`job.dmgK: 2`); the median time must fall to 50-65% of the plain cell's. Above 65%, something is holding her
life and is found and removed before G3 closes.

**Echo.** «Ξύπνα την αρκούδα» / "Wake the bear", at the den after `act7`, once a day. The bowl is in its `green`
reading: **no snow, so no slides.** In their place the six boulders are old and each breaks on the first charge that
ends on it (the Hart's last run, `crackStone`, `ai.js:1961`): six windows, and then none. Halda is not there; her
fail-safe is a rock that falls by itself in front of the third charge with no Daze. Tint: meltwater and mist
(`baseTint` 0xd8e4e8 at 1.1). She lies down again. Toasts `echo.rise7`, `echo.done7` (the base's).

**First-kill legendary:** `LEG_FROM.kallisto` (the item is the mechanics part's).

### kelados «Κέλαδος, ο Κοιμισμένος του Βουνού» / "Kelados, the Sleeper under the Mountain"

**Concept.** The one the Stoneborn built their water-gates on and never once woke: stone and old ice the size of a
house, a cap of snow, a young pine on his left shoulder. The warmth wakes him; the hero does not kill him. His fight is
the act's three rules together: water under his feet, snow off his shoulders, a cloud that slows him. Tagline
`mon.kelados.t` «Το βουνό σηκώνει τον ώμο του.» / "The mountain lifts its shoulder." He does not speak. New lore,
marked as such (decisions.md, canon).

**Data.** `kelados: { model: 'kelados', hp: 480, dmg: 1.6, speed: 3.2, radius: 1.5, ai: 'kelados', reach: 9, atk:
'smash', atkTime: 1.8, flesh: 'stone', xp: 380, boss: true, big: true, spare: true, sfx: 'golem', dieClip: 'die', look:
{ scale: 2.3, tint: 0x8c9488, tintAmt: 0.5 } }`. `CAST.kelados = ['golem', 1]`; `STAND_IN.kelados = ['stonewarden',
'troll']`. Level `max(43 + 3, hero + 1)`. `KELADOS = { name: 'kelados', phases: [0.66, 0.33], wake: 22, ... }`; held
asleep by the story until `keladosWake` (`a.holdWake`, `ai.js:2560`), a statue behind the dam's ice until then. Code
parts on him: eight plates of blue ice, the snow cap, the pine, moss. Clips: `slam` (tremor), `attack` (sweep),
`attack2` (the throw and the roll), `warcry` (entries), `die` held at its kneel.

**He must not play as the Stonewarden** (`ai.js:2135-2180`: smash, stomp, boulder, charge, rockfall, pulse). He never
charges and never pulses; he is rooted for a third of the fight; what he throws stays; and the floor under him is the
player's weapon.

**Arena.** The Dam, r 16.
- **North:** the wall of ice and **his seat**, 2 cells out from it.
- **West:** the lake's lip. The lake falls a step with each phase (1.2 → 0.9 → 0.6, the own-level channel the Ketos
  lowered, `tide.js:168-182`), baring a strip of shore each time: r 12 of floor, then 14, then 16.
- **Three levers** on the rim at r 14, bearings 50°, 140° and 215° from north; the third stands on the strip the lake
  bares last. Each opens one **sluice channel**, a lane 4 m wide:
  1. **the Foot-race**, east to west along the dam's foot, under his seat;
  2. **the Cross-race**, from the lake's lip across the arena's middle to the east rim;
  3. **the Long race**, from the north-west corner to the south-east rim.
  Levers 2 and 3 stand in blocks of ice that fall away as his own plates do, at 66% and at 33%.
- **Two chutes** off the peak, either side of his seat, crossing the arena as an X.
- **The arena hearth** on the south rim. **Halda's stump** on the south-east rim. Two lines of cloud.

**A sluice** (the player's). «Τράβα τον μοχλό» / "Pull the lever": 1 s, broken by a blow. Then a **blue** lane for
2.8 s down the channel, then the lake's water runs it in 1.2 s. **Kelados in the channel goes to his knees for 5 s,
Stunned (× 1.5).** It takes none of his life. A hero in it is washed out: `HAZ7.wash` (6%, pure) and 4 m down the lane.
Each lever once a fight.

**Phases.**

**Phase 1, «Δεμένος στον πάγο» / "Bound in ice" (100-66%).** Rooted at his seat (`a.rooted`, the path `boss()` already
honours, `ai.js:2595`, `:2604`). The thing to do: **open the Foot-race under him.**
- Sweep, Tremor, Ice Block. Every second Tremor shakes one chute loose.
- Halda's call, 10 s in (`d.halda.s1`: "the gate under his seat").
- Fail-safe: 35 s with lever 1 unpulled, and Halda pulls it.

**Phase 2, «Λυμένος» / "Loosed" (66-33%).** Entry: two plates fall, the lake drops a step, lever 2's ice falls, he
tears free of the dam and walks (1.5 s, no blow). The thing to do: **draw him onto the Cross-race, then pull.**
- Adds the Boulder roll. Every second Tremor now arms both chutes, the X.
- Halda's call (`d.halda.s2`: "bring him to the stone channel").
- Fail-safe: 40 s with lever 2 unpulled; the next time he stands in its channel, Halda pulls.

**Phase 3, «Ξύπνιος» / "Awake" (33-0%).** Entry: four more plates fall, the lake at its lowest, lever 3's ice falls.
The thing to do: **the Long race.** Nothing new to learn: his moves at the third phase's shipped pace.
- Halda's call (`d.halda.s3`); fail-safe 35 s.

**Moves** (cooldowns on Warden difficulty).

| move | phases | telegraph | shape | band | what lands | cooldown |
|---|---|---|---|---|---|---|
| **Sweep** | 1-3 | 1.0 s, `attack` | a cone 9 m, 100° | within 9 m | heavy and a push of 12 | 8 s |
| **Tremor** | 1-3 | 1.2 s, `slam`; then a white-edged red ring 1.2 m thick runs from r 4 to r 14 at 9 m/s | a ring; rolled or blinked through, or stood out behind a block | any | heavy to whoever it crosses in the open | 11 s |
| **Ice Block** | 1-3 | 1.3 s circle (0.5 s to tear it, 0.8 s in the air: the Stonewarden's lob, `ai.js:2147-2153`, `lob`, `:1857`) | a circle of r 2.2 on the farthest hero beyond 8 m (solo: every third one on her wherever she is) | beyond 8 m | heavy; **the block stays 30 s as cover**, three standing at most | 10 s |
| **Chute** | 1 | the Slide's 2.8 s lane | one lane, on every second Tremor | any | `HAZ7.slide` | with the Tremor |
| **The X** | 2-3 | 2.8 s lanes | both lanes, on every second Tremor; one quadrant always clear | any | `HAZ7.slide` | with the Tremor |
| **Boulder roll** | 2-3 | 1.0 s, `attack2` | a line 20 × 3 m; the boulder stays at its end 30 s | any | heavy | 12 s |

- **The block is the fight's second idea** (Gremos's, from the systems proposal). The hero he throws at is the hero who
  is far away; what he throws becomes the party's shelter from his own Tremor and his own slides. A lone swordsman gets
  one in three.
- **A slide on him:** 4% of his life and Dazed 2 s.
- **Sun and Shade on him.** While a cloud's shade lies on him the ice grips again: his cooldowns × 1.4 and his walk
  × 0.7. **It never changes what he takes.** A cornice in shade cannot be shaken loose either, so a Tremor under a
  cloud brings no slide. The cloud is a breather the player can see coming, not a window.
- **The ice is the life bar's picture.** Two plates fall at 66%, four at 33%, the last two when he kneels.

**Range bands, a full fight on Warden difficulty, by design** (phases of about 60, 70 and 60 s).

| | any range | within 9 m only | beyond 8 m only |
|---|---|---|---|
| Phase 1 | Tremor × 5, chute × 2 | Sweep × 7 | Ice Block × 6 |
| Phase 2 | Tremor × 6, the X × 3, Boulder roll × 5 | Sweep × 8 | Ice Block × 6 |
| Phase 3 | Tremor × 6, the X × 3, Boulder roll × 5 | Sweep × 8 | Ice Block × 6 |
| **sum** | **35** | **23** | **18** (six of them on a lone swordsman) |

In 190 s a swordsman is asked about 64 and a shooter about 53, one each three to three and a half seconds. The plan is
that **6-10 land**.

**Numbers.**
| | Warden difficulty, the reference build at 50 |
|---|---|
| time to rest | 150-230 s; no run over 270 s or under 115 s |
| heavy blows landed | 6-10, each 12-18%, none over 20% |
| lowest life (median) | 25-45% |
| seconds under 30% | 5-18 |
| deaths | 1-3 in the 18 runs; 0-1 in Wanderer's 36 |
| Wanderer time ÷ Warden time | 0.7-0.9 |

**By difficulty.**
| | what changes |
|---|---|
| Wanderer | cooldowns × 1.35; the heavy share 11%; **one move fewer a phase:** phase 1's Tremors shake no chute loose, phases 2 and 3 have no Boulder roll, and the X is one lane; blocks last 30 s |
| Warden, Hero | as written |
| Nightmare | × 0.9; an Ice Block may be thrown during the X in phase 3 |
| Ash | × 0.85; the same overlap from phase 2; blocks last 25 s |
| Skotos | × 0.8; blocks last 20 s; every Tremor in phase 3 arms the X |

**Co-op.** Life × `COOP.boss`. Ice Block at the farthest hero and, with three or four, a second at the nearest shooter
1 s later (five blocks may stand). The Sweep turns to the hero with the most threat in reach. A lever is a guest-usable
interact through the `u` event, validated by the host as the hearthstones are (act6-design, Co-op); each lever is still
once a fight for the party. The lake's level is the host's (`o.w[5..6]`). The Call is each hero's own.

**The end.** At 0 life, `spare`: `keladosRest` saved first; `kill` fires; he kneels (`die`, held), the last two plates
fall, water runs between his fingers, and the story's scene takes over (the word). After `lakeLet` he is a statue in
the slope under moss.

**Why there is no least-time lock, and how run C proves it.** Three things here could hide one, and none does. (1) The
rooted first phase: he is rooted, not shielded; his seat is in reach of a sword (a hard check) and of every shot.
(2) The levers' ice: it falls on his life, at 66% and 33%, never on a timer, and a hero who never pulls a lever loses
only the three windows. (3) The lake's steps: they bare floor and one lever; no move waits for the water. The
fail-safes are clocks that **shorten** the fight. The cloud slows his hands, never the hero's. **Run C** as Kallisto's:
`job.dmgK: 2` on the three Warden-difficulty cells, the median at 50-65%. His kneels are 15 s of a 190 s fight at
× 1.5; a doubled hero sees fewer slides (4% each), so expect 52-58%.

**Echo.** «Χτύπα τον ώμο του βουνού» / "Strike the mountain's shoulder", at the slope after `act7`, once a day. He
dreams the fight: the lake as it now is (0.3, the arena at its widest), **all three levers bare from the start**, and
**his blocks and boulders shatter where they land** (no cover at all). The two things the player leaned on are swapped:
shelter is gone, the sluices are everything. Halda's fail-safes run by themselves. Tint: pale mist.

**First-kill legendary:** `LEG_FROM.kelados`.

### Difficulty

**`HAZ7`** (`data.js`, beside `HAZ5` and `HAZ6` at `:33-58`; indexed like `DIFFS`; `actHaz`, `:447`, gains the third
act). Telegraph lengths are not in the table because they never change (`data.js:32`).

| | Wanderer | Warden | Hero | Nightmare | Ash | Skotos |
|---|---|---|---|---|---|---|
| monster life / blows (shipped `DIFFS`) | 0.65 / 0.55 | 1 / 1 | 1.9 / 1.55 | 3.6 / 2.4 | 7 / 3.8 | 11 / 5.4 |
| **`hp`: the act's regular creatures' life (×)** | 1.5 | 1.8 | 1.8 | 1.8 | 1.8 | 1.8 |
| **`dmg`: their ordinary blows (× `DIFFS.dmg`)** | 1.5 | 1 | 1 | 1 | 1 | 1 |
| **`heavy`: a regular creature's heavy blow (% of her life before armour)** | 9 | 18 | 22 | 26 | 31 | 36 |
| **`bossHeavy`: a boss's** | 11 | 22 | 27 | 32 | 38 | 44 |
| **`cap`: the most one blow may take after armour (%)** | 12 | 20 | 25 | 30 | 36 | 42 |
| `cd`: regular heavy moves' cooldowns (×) | 1.35 | 1 | 1 | 1 | 0.9 | 0.85 |
| **`bossCd`: bosses' cooldowns (×)** | 1.35 | 1 | 1 | 0.9 | 0.85 | 0.8 |
| **`less`: moves removed a boss phase** | 1 | 0 | 0 | 0 | 0 | 0 |
| a boss's chutes a call, phases 1-2 / phase 3 | 1 / 1 | 1 / 2 | 1 / 2 | 2 / 2 | 2 / 3 | 2 / 3 |
| two boss telegraphs may overlap | no | no | no | last phase | from phase 2 | from phase 2 |
| a thrown block or rock lasts (s) | 30 | 30 | 30 | 30 | 25 | 20 |
| `slide`: on the hero (% of her life, pure) | 8 | 14 | 14 | 18 | 22 | 26 |
| a chute's re-arm (s) | 60 | 45 | 45 | 45 | 40 | 35 |
| `wash`: a wash-out, brook or sluice (%) | 3 | 6 | 6 | 8 | 10 | 12 |
| the brooks' cycle / the roar's lead (s) | 150 / 8 | 120 / 6 | 120 / 6 | 120 / 6 | 110 / 6 | 100 / 6 |
| a falling rock or ice from `L.vault` (× the zone's blow) | 0.6 | 0.9 | 0.9 | 1.0 | 1.1 | 1.2 |
| clouds on the map | 4 | 3 | 3 | 3 | 2 | 2 |
| `sunWake`: sun to wake the Icebound (s) | 3 | 2 | 2 | 2 | 1.5 | 1 |
| `champ`: champion odds in the act's zones (×) | 1.2 | 1.5 | 1.5 | 1.5 | 1.6 | 1.7 |
| **a least time for a boss phase** | **none: the column does not exist** | | | | | |

- **A share, not a multiple.** `hitHero` gains one option, `share`: the blow's size is her `hpMax` × the row's number
  before block and armour, then `min(amount, hpMax × cap)`. It is not `pure`: toughness still pays. On a guest the
  share crosses in the blow's options and is taken of the guest's own life on the guest's page (`HURT_KEYS`,
  `coop.js:889`, gains `share`; the guest clamps it to its row's `bossHeavy`).
- **Wanderer is a different fight:** half the share, a third longer between moves, a move fewer a phase, one chute.
  The same warnings, to the tenth of a second.
- **Where the rows are read.** `spawnMonster` picks an act's row by `G.zone.act6` / `.act5` (`actors.js:172-175`): it
  gains the Act VII zones' row for `hp` and `dmg`. Act VI's 11% cap is that act's alone (`combat.js:166`).

**The profile for the balance campaign** (`balance-report.md`, "How it was run", carried one act on).
| | Warden difficulty and above | Wanderer |
|---|---|---|
| level | 50 at all four cells | 47 / 48 / 49 / 50 (`thaw`, Kallisto, `tarn`, Kelados) |
| Mastery levels spent (`job.mlvl`, `job.mast`: Might and Vigor in turn) | 4 / 6 / 8 / 10 | 0 |
| gear | four levels behind, the best of four drops a slot (`gearK`, `balance-act.mjs:83`) | the same |
| blessings | one an act, six | the same |
| legendaries | each beaten boss's own; never a boss's own before it is beaten (the fault fixed in Act VI's run) | the same |
| Names | none in the gate cells; the mechanics part's runs D and E add them | none |
| runs | six a cell, seeds 1000 + r × 7919, eight packs a zone | twelve a cell |

Every soak and scenario starts from a v22 hero at quest 39 (decisions.md rule 5), never a fresh test hero: Act VII's
heroes all carry `crownUnmade`, the flag that silences every flue today (`forge.js:63`).

**G2, zones** (stage B's gate; no boss exists yet). Per zone and class on Warden difficulty: lives of damage 0.4-0.8;
lowest life (median) 35-65%; seconds under 30% 0-6; a pack's median time 8-14 s; 15-35% of monster deaths owed to a
slide or to water; no blow over 20%; deaths 0-1 in the 36 runs. Across classes: lives within ± 30% of the three
classes' mean. On Wanderer: lives at most half of Warden's, lowest life 70% or more, no death in the 72 runs.

**G3, bosses** (stage C's gate). The two "Numbers" tables above for each class; blows landed within ± 30% of the three
classes' mean at each boss; the worst loss in any 3 s at most 40%; **run C at 50-65%** for all six cells; Wanderer's
lives at most half of Warden's with lowest life 60% or more; at two and four players the bands × 1.0-1.25. The act
against Act V in lives of damage is reported beside them (see the first note for the lead).

**What the balance bot must learn** (page-side, `installBot`; each rule checked in a scenario before a campaign trusts
it: Act VI lost a whole pass to a bot that stood idle between packs).

| lesson | the rule for the bot | where it plugs in |
|---|---|---|
| white is harm, blue lanes too | a white or blue **lane** is avoided as a red one is; a blue **circle** stays safe | the telegraph scan, which sorts by colour and already maps a flue's telegraph to its flue (`balance-act.mjs:217-233`, `SAFE` at `:63`) |
| cover | in a lane with no way out in time, walk to the flue's nearest cover circle or the nearest block | the same scan's `cover` list |
| kick a chute | with three or more foes in an armed, sunlit lane and herself out of it, cast the loudest ready skill at the horn-stone | `ready()` (`:306`) |
| do not kick your own | no loud skill from inside an armed lane unless a dodge is ready | `ready()` |
| the bait | at Kallisto, stand with a boulder 3-6 m behind her on the charge's line and step aside at 0.5 s | the boss rules |
| shade | with a flock overhead and shade within 8 m, fight from the shade; leave a Mob's circle toward shade | the mover |
| rock | with a worm under the snow, stand on the nearest non-snow cell | the mover |
| the Icebound | kill the pack-mates first; never strike the block | the target chooser |
| the lever | at Kelados, pull the phase's lever when he stands in its channel and no telegraph is on her | the boss rules |
| the hearth | walk to the arena hearth when it arms | the route |
| zones start past their gates | a zone run's fixture has the three weirs open (the `ZFLAGS` table, `:157`) | the job |
| **run C's knob** | `job.dmgK` multiplies what the bot deals. `gearK` is the number of drops tried a slot (`:22`, `:50`, `:83`), not a damage factor, whatever the systems proposal's run table says | the bot's own bookkeeping |

**New measures** (the bot's bookkeeping, no game code): `under30S`; `worst3` (the largest share lost in any 3 s);
`heavy` (heavy blows landed, by move id, from the game's `tally`); `byBand` (blows landed within the boss's reach and
beyond 8 m); `slides` (kicked by her, by foes, taken); `terrainKills`. Already there: `minLife`, deaths, potions,
per-pack rows and times (`:381`, `:389`, `:605`, `:813-815`).

---

## Notes for the lead

### Conflicts with decisions.md, and what this part did about each
1. **The three danger targets do not add up to the anchor.** Zones at 0.4-0.8 lives each plus 4-10 boss blows of 12-18%
   is 1.5-3.9 lives for the act; the anchor (rule 4: × 1.45-2.1 of Act V's measured 1.13-1.23) is 1.7-2.5. All three
   hold only in the lower half: zones near 0.5 each, Kallisto at 4-6 landed, Kelados at 5-7. I kept every band as
   decided and wrote G3 so that lowest life, deaths and seconds under 30% gate, with the ratio reported. If the ratio
   must gate too, the boss bands should read 4-6 and 5-8.
2. **The share before armour.** The systems proposal's 26% and 30% assume an armour cut near a half. The measured cuts
   are 0.19-0.41, so those shares land 15-24% and break "never over 20%". This part uses 22% (18% for regular
   creatures) and a hard cap row.
3. **Kallisto's rising stream is cut.** Judge 2's fix (the clock held by `force`) does not leave the Race alone: a
   force moves the own-level cells too (`tide.js:81-83`, `:155`). Her bowl has a stream that only wades; phase 2 is
   named «Στριμωγμένη» / "Cornered", not "The water rises". perf7's spot 3 becomes "the Den with two slides and rocks".
4. **The base's weirs could not be reached** (all three north of a river closed at 1.2). Weir 1 is on the south bank
   and the three are in sequence; the Narrows is a new 4-row moat. The quest text of q41 is unchanged.
5. **Boss life starts at × 340 and × 480**, not the base's 230 and 300; the sum is under "Life".
6. **An arena hearth at each boss.** decisions.md says the Call is made at a lookout hearth; judge 2 adds "each boss
   arena has one". This part places one in each arena and arms it on the phase's window. Neither fight needs it.
7. **The echoes** differ from the base's ("fights as written"): each removes the thing the first fight taught.
8. **Names.** decisions.md calls mechanic 2 «Η Κατολίσθηση»; the base's heading says «Η Χιονοστιβάδα». This part says
   "the Slide" and leaves the Greek to the mechanics part.

### What this part needs from the other three

**From the story part (10).**
- Flags, saved before their scenes: `haldaOut`, `thawSeen`, `weir1..3`, `kallistoRest`, `tarnSeen`, `winch1..3`,
  `keladosWake`, `keladosRest`, `lakeLet`, `act7`; `look1..6`; `cp7`.
- Six call lines of Halda's and six fail-safe shouts (`d.halda.k1-k3`, `.k1b-.k3b`, `d.halda.s1-s3`, `.s1b-.s3b`), each
  saying the one thing named in its phase above. Check where she stands in the shipped text first (decisions.md, canon).
- Names and taglines for seven kinds (`mon.hillWolf`, `mon.goblinMarksman`, `mon.chough`, `mon.denBear`,
  `mon.snowWorm`, `mon.rockRoller`, `mon.rockScorpion`), the six phase names, the lever's and the wheel's prompts, three
  first-time toasts (a loaded lane, an Icebound, a Mob). The Greek here is a draft for the two proofreaders.
- **A name clash:** the Pass is already «Η Σκάλα των Γιγάντων» (`text.js:259`). The exit "the Stair" and the camp «Η
  Κορφή της Σκάλας» need another word or an explicit tie to it.
- The cub's scene and the word to Kelados happen on bodies that `spare` leaves standing: no scene may assume a corpse.

**From the mechanics part.**
- The Slide on creatures. This part assumes: 35% of a common's own life, 20% of a champion's, a rare's or a `big`
  kind's; carried to the lane's foot (not `big`); Dazed 1.5 s (2 s for `big`); 5% and Buried 3 s for Kallisto, 4% and
  Dazed 2 s for Kelados; a worm under the lane forced up. The shipped breath gives monsters a quarter of a fifth of the
  **hero's** life (`forge.js:27-28`, `:122`), which must not be reused.
- The `'loud'` event and its sources. Added here: a Den-bear's charge ending on stone, a Rock-roller's slam, the
  `thunder` affix, Kallisto's Roar, Kelados's Tremor; and that a Den-bear within 12 m wakes to it.
- `sunAt` / `shadeAt`, the clouds honouring `L.noCloud`, and the Dam's two cloud lines.
- The sluice as a flue of `kind: 'water'`.
- The Cradle's 1.5 s on an ice block; fire on a block; the arena hearth's arming call; the hold event at the lookouts.
- Which Names change what she takes: the share is priced before armour and block, and a Name should act where they do.

**From the production part.**
- gen7: the bands and gates above; `L.shade`, `L.snow`, `L.noCloud`; the reach matrix (two readings × four levels × the
  clock's two ends); the ground's snow mask reading `L.snow`.
- Props (`build7.js`): weir wheel and sill × 3; log-jam; horn-stone; cornice in two states (armed, spent) and the snow
  tongue; ice block in two sizes (a troll's, a lever's); slab stone; den mouth × 4; fallen pine; lookout hearth × 6 and
  arena hearth × 2; winch × 3; lever × 3 and three stone channels; the pier row; snow bridge × 2; the Dam's ice plug;
  the ice wall with its seat; Kelados's eight plates, snow cap, pine and moss; **a rock and an ice block of 2 × 2 cells,
  1.6 m high or more, that read as cover**; the rolled boulder; the cub (bear × 0.35); Halda's ledge and stump.
- Three lane colours that never share: white for snow, blue for a sluice, red for a blow, each with the 'day'
  telegraph's dark edge.
- `ATMOS.thawFight`, `tarnFight`; `heavyZone` for `tarn`; `ACT_FILES.act7 = ['bear', 'golem', 'worm', 'skua']`.

### Engine items this part requires, with my estimate
| # | item | files | days |
|---|---|---|---|
| 1 | `share` and `cap` in the hero's hurt path; `HURT_KEYS` + `share`; the tally of heavy blows by move | combat, ai, coop | 0.5 |
| 2 | `HAZ7`, `actHaz`, the Act VII row in `spawnMonster` (`hp`, `dmg`), `bcd7` | data, actors, ai | 0.25 |
| 3 | Rocks and blocks as cover: a 2 × 2 footprint closed with `low` false, timed, mirrored to guests as the shards are (`cells6`, `tide.js:433-442`) | forge, tide, coop | 0.5 |
| 4 | Seven entries: Long Pounce 0.4; Marksman 0.3; `shadeShy` and the Mob 0.6; Den-bear's wakes 0.4; Snow-worm (snow mask, slush spit, forced up) 0.6; Rock-roller (Icebound wake without proximity, Rolled Boulder) 1.0; scorpion (slab burst, Sting, cold-blooded) 0.5; packs, leads, the two `world.js` branches, `cast7` 0.4 | data, ai, actors, world | 4.2 |
| 5 | `spare`: a boss that rests where it would die, with the `kill` route intact | combat, ai, actors | 0.25 |
| 6 | Phase entries queued through skipped thresholds | ai | 0.1 |
| 7 | Kallisto with its scenario and echo | ai, data, world | 3 |
| 8 | Kelados with levers, channels, plates, the lake's steps, scenario and echo (judge 1's figure, not the base's 3-3.5) | ai, data, world, build7 | 4.5 |
| 9 | Halda's calls and fail-safes at both arenas; the arena hearths' arming | ai, world, story | 0.5 |
| 10 | The bot: twelve lessons, six measures, `dmgK`, Act VII's fixtures, the scenarios that prove each lesson | tools | 2.5-3 |
| | **total for this part's own work** | | **16.3-16.8** |

The base counted enemies 3-3.5, bosses 5.5-6.5 and balance 2.5-3 (11.5-13); judge 2 counted 3-3.5, 6-7 and 2-2.5.
This is about four days over both, almost all of it the heavy-move work on every entry and Kelados.

### What I could not verify (and where I looked)
- **The reference hero with Names.** The life, armour and dps figures are Act VI's runs (`runs.jsonl`, the first run's
  `hero` row of each cell). A three-Name hero is unmeasured; the life multipliers will move with it.
- **The bot's hit rate.** "4-8 of about 40 land" assumes it avoids about 85% of heavy moves; I did not read its `cfg.skill`
  or `react` defaults (`balance-act.mjs:669` reads them).
- **The clips as poses.** `glbinfo` names `daze` and `die` in `bear.glb` and `die` in `golem.glb` (judge 2, P10). I did
  not view them: whether `daze` holds as a seated bear and `die` has a usable kneel is stage 0's look gate.
- **Checked after the draft, and true:** a boss's radius is its def's × its scale (`actors.js:198`), so Kallisto is
  1.8 m and Kelados 3.45 m, and the shipped charge-line formula would draw her line 5.7 m wide (this part sets 5 m
  explicitly). A closed cell is `low` by default (`change(open, close, low = true)`, `src/world/map.js:41`) and a low
  cell does not stop sight (`:22-26`, `:88-95`): judge 2's P3 stands, and item 3 is one argument plus the footprint.
  Cold added in a zone without Cold is dropped (`cold.js:35`), so a wash-out's 20 is inert here.
- **The Rolled Boulder's body.** The Barrow Lord's wave is a projectile (`ai.js:2128`); I did not open
  `projectiles.js` to see whether a shot can leave a rock at its end. If not, it is a `dashStep`-style mover (0.25 d,
  inside item 4).
- **`light.js`.** I read its exports and the two `lightAt` calls in `skua()`; the 'sun' branch itself is judge 2's P4.
- **gen5 and gen6.** I read their pack emitters, helper index and reach-check lines, not the carving code; gen7's cost
  is the production part's.
- **The story part** did not exist; every scene hook above follows the base and decisions.md.
