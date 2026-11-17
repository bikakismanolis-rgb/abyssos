# Act VII — stage A: the two layouts (`src/world/gen7.js`) and their check

Date: 2026-11-17. Files: `src/world/gen7.js` (new), `tools/check-act7.mjs` (new). Nothing else was edited.
Result: 300 seeds × 4 (zone, reading), 0 hard failures, mean tries 1.06 (thaw) and 1.21 (tarn). Details at the end.

## What the module exports

| export | what it is |
|---|---|
| `genThaw(seed, { mode: 'spate' \| 'green' })` | `thaw`, 112 × 184 |
| `genTarn(seed, { mode: 'full' \| 'let' })` | `tarn`, 104 × 176 |
| `thawFaults(L)`, `tarnFaults(L)` | the reach and layout rules; an empty list means the layout holds |
| `walk7(L, h, mh)` | walk grid with the brooks at `h` and the own-level water at `mh` |
| `inLane(f, x, z, pad)`, `laneSeen(L, f, x, z)`, `laneCells`, `uncovered`, `losL` | a lane as `forge.js inFlue` and `map.los` read it |
| `cloudAt(c, t)`, `cloudGap(L, x, z)` | a cloud's place at clock `t`; the shortest sunny gap at a point |
| `LEVELS7` `[1.2, 0.9, 0.6, 0.3]`, `BROOK_TOP` 0.6, `MARGIN7` 6, `REJECT7` | constants and the reject counter |

Conventions are gen6's: seeds retry as `seed + k·7919`, 24 tries, the last accepted; `L.tries` reports the count;
no `Math.random`; a reading never changes the layout's cells except where listed below.

## The contract: fields of `L` (both zones)

| field | type | meaning |
|---|---|---|
| `w, h, cells, paint, props, lights, packs, spots, exits, rooms` | as `gen.js base` | `lights` is empty (daylight) |
| `type`, `seed`, `mode`, `tries` | | `type` is `'thaw'` or `'tarn'` |
| `low` | Uint8 | 1 on a crevasse cell (`tarn` only); blocks feet, not sight |
| `bed`, `vbed` | Float32 | `BED_DRY` (9) on dry ground; 0.15 m steps on water cells; −0.45 is deep at every level |
| `pocket` | Uint8 | 1 = on the clock (brooks, Den stream, winch 3's causeway); 2 = the own-level channel (the Race, the lake) |
| `tideCfg` | `{ phases: [50, 18, 34, 18], stepT: 4.5, hMax: 0.6 }` | the brooks' clock |
| `own` | `{ levels: [1.2, 0.9, 0.6, 0.3], level }` | the reading's level before flags: 1.2 (`spate`, `full`), 0.3 (`green`, `let`). The game still sets it from flags through `resetTide(z, { mere })` |
| `thick, window, deck, sea, keel` | Uint8, all zero | Act V / VI readers find them; `L.ice` is undefined |
| `vault` + `spots.vaults` | Uint8 + rows `{ id, x, z, r, n }` | loose rock and ice under cliffs (5 patches a zone) |
| `flues` | array | see below |
| `trail` | Uint8 | cells of the trodden way (critical path, 3 wide) |
| `road` | `[{ x, z }]` | the way's polylines joined |
| `shade` | Uint8 | fixed shade |
| `snow` | Uint8 | 0 never; 1-3 bared with that many weirs; 4 until the after reading; 5 always |
| `noCloud` | Uint8 | cells no cloud may cover (the Den's bowl + 4 m; all zero in `tarn`) |
| `clouds` | array | `{ id, x, z, dx, dz, r, speed: 1.2, len, t0, scripted?, extra?, dam? }`; position = `cloudAt(c, t)` |
| `refuges` | `[{ x, z, r: 1.5 }]` | dry 3 × 3 near every piece of clock water |
| `start`, `boss` | | `boss = { x, z, r }` is the arena (r 17 Den, r 16 Dam) |
| `dist`, `hgt` | | as gen6; every walkable cell's corners are at y 0 (a corner shared with a crevasse sinks) |

### A flue record (`L.flues[k]`)

`{ id, x, z, dir, len, w: 4, kind: 'snow' | 'water', armed: true, horn: { x, z }, cover: [{ x, z, r }], area, green, pack, half?, weir?, winch?, lever?, name?, side?, boulder? }`

- `x, z` is the mouth (the cornice), on an open cell. `dir`: `sin` is +x, `cos` is +z (forge.js).
- `area`: `flank`, `gully`, `den` (thaw); `field`, `works`, `dam` (tarn).
- `green`: kept in the after reading of `thaw`. `pack`: a pack stands in the lane.
- `cover`: cells of the lane the mouth cannot see (the blue circles). Empty for the Dam's two chutes and the sluices.
- `kind: 'water'`: the three sluice channels, with `lever: 1..3` and `name` `footRace` / `crossRace` / `longRace`. No horn.

### A pack (`L.packs[k]`)

`{ x, z, n, tag, elite, area, trail, dormant?, tide?, lane?, lookout?, ice?, den?, wake?, weir?, ledge?, jetty? }`

`trail` true = on the critical path. `dormant` true on every `den`, `icebound` and `slabs` pack. `tide` true = stands
on clock water. `lookout: k` = the certain champion or rare pack at lookout k.

## Spots: `thaw`

| spot | shape | notes |
|---|---|---|
| `camp` | `{ x, z, r: 8 }` | (56 ± 6, 168 ± 2) |
| `waypoint` | `{ x, z }` | |
| `npcs` | `{ halda, fire, anvil }` | Halda at the camp, her fire, the field anvil |
| `weirs[3]` | `{ k, x, z, stand, mark, figures[3], bank, rule }` | `rule`: `wake`, `slide`, `sun` |
| `fords[3]` | `{ id, x, z, z0, z1, bed, opens }` | west 0.6 / middle 0.3 / east 0.0; `opens` 0.9 / 0.6 / 0.3 |
| `narrows` | same shape | bed 0.0, opens at 0.3 |
| `bar` | `{ x0, x1, z, bed: 0.3 }` | the gravel bar to the east gully |
| `lookouts[3]` | `{ k: 1..3, x, z, hearth, keeper, hut, woodpile, approach[2], pack: { tag, elite }, place, cutBy, peak, lanes? }` | `peak` 1..3 west to east |
| `callHearth` (= `hearth`) | `{ x, z }` | the Den's own, bearing 205°, r 14.5 |
| `haldaDen` (= `haldaRim`) | `{ x, z, r: 2, rot }` | ledge at bearing 135°, r 19: outside the radius, in sight of the centre |
| `den` | `{ x, z, mouth, cub, rot }` | NE wall, bearing 52° |
| `echo` | `{ x, z }` | where Kallisto sleeps in `green` |
| `stair` | `{ x, z }` | NW wall; the exit to `tarn` stands on it |
| `arena` | `{ x, z, r: 17, mouth }` | `mouth` is the checkpoint |
| `stream` | `{ z, bed: 0.3, bars[2] }` | clock water that only wades |
| `shallows` | `{ x, z }` | fish after `kallistoRest` |
| `boulders` | `{ x, z, cells, flue?, den? }` | six with `den: true`; one per flank and gully chute |
| `hornStones` | `{ x, z, flue }` | |
| `pines` | `{ x, z, fallen?, dead?, rot? }` | two fallen on the Den's rim |
| `dens` | `{ id, x, z, front, area, sleeper? }` | `weir1` (the sleeper), `westGully`, `east46`, `east51` |
| `iceblocks[2]` | `{ x, z, r, weir? }` | `[0]` is weir 3's |
| `slabs`, `ledges`, `huts`, `knolls[2]`, `bridges`, `chests[3]`, `brooks` (count) | | `huts`: `{ x, z, kind: 'hut' \| 'fold', door, tag? }`; `bridges`: `{ x, z, n, main }` |

Exits: `[0] { to: 'pass', label: 'exit.pass' }`, `[1] { to: 'tarn', label: 'exit.tarn', locked: 'kallistoRest' }`.

## Spots: `tarn`

| spot | shape | notes |
|---|---|---|
| `camp`, `waypoint`, `npcs { halda, fire, windWall }` | | camp (52 ± 4, 160 ± 2), r 8 |
| `winches[3]` | `{ k, x, z, stand, mark, figures[3], rule, lane? / pier? / jetty? }` | `rule`: `slide`, `sun`, `race` |
| `lookouts[3]` | as thaw, `k: 4..6` | 6 has `opens: 0.6` and `causeway` |
| `levers[3]` | `{ k, x, z, bearing, stand, channel, ice, at }` | r 14, bearings 50 / 140 / 215; `channel` is a flue id; `ice` true and `at` 0.66 / 0.33 on 2 and 3 |
| `seat` | `{ x, z, rot }` | open floor, 2 cells out from the wall, in the Foot-race |
| `iceWall` | `{ z, x0, x1, hgt: 9 }` | |
| `plug` | `{ x, z, cells[3] }` | shut in `full`, open in `let` |
| `callHearth` (= `hearth`) | | south rim |
| `haldaDam` (= `haldaRim`) | `{ x, z, r: 1.6, rot }` | stump at bearing 160°, r 17.2 |
| `wheel` | `{ x, z, stand, opens: 0.6 }` | west lip; reachable from lake 0.6 down |
| `spillway` | `{ x, z, rot }` | a point in the rock west of the lake's arm, 26 m from the Dam's centre |
| `arena` | `{ x, z, r: 16, floor: 12, mouth }` | |
| `lake` | `{ level, lip, shelves }` | |
| `causeway` | `{ x0, z0, x1, z1, bed: 0.15 }` | winch 3's, on the clock |
| `wheelHouse` | `{ x, z, w: 14, h: 10, door }` | |
| `piers[7]`, `walls`, `islands[4]`, `crevasses[2]`, `bridges[2]`, `hornStones`, `boulders`, `iceblocks[2]`, `slabs`, `chests[3]` | | `crevasses`: `{ z, x0, x1, side, bridge }` |

Exit: `[0] { to: 'thaw', label: 'exit.thaw' }`.

## Readings

| zone | reading | what changes |
|---|---|---|
| thaw | `green` | `own.level` 0.3; `L.flues` keeps the Den's three and four of the flank's (`green: true`), the gully's goes. Cells, spots, packs identical |
| tarn | `full` | the plug's 3 cells are blocked (world.js opens them at `keladosWake`) |
| tarn | `let` | plug open, `own.level` 0.3. Everything else identical |

## Departures from part 2, and why

1. **Rows shifted to respect the 6-cell frame.** thaw camp at z 168 ± 2 (not 172 ± 3), Den centre z 24.5 ± 1 (not 22 ± 1);
   tarn camp z 160 ± 2 (not 166 ± 2), Dam centre z 23.5 ± 1. With the spec's numbers the discs entered the frame.
2. **Brook beds are 0.15-0.45, not 0.3-0.75.** With the clock's top at 0.6 a bed of 0.3 or more never closes, but the
   design needs brooks that cut lookout 1 off and turn a camp out. Core 0.15 (closed only at the top), shoulders 0.3-0.45.
   Brooks are dry at the clock's low: the look builder may want a trickle drawn anyway.
3. **Plank bridges are clock cells at bed 0.45**, not dry ground: dry until the top, 0.15 m of wading at the top. The
   way is never shut. This keeps part 3's "the water climbs over the planks". There can be more than two bridges: the
   bank road crosses every brook; those on the causeway are marked `main`.
4. **17 pack spots in thaw (+3 lookouts), not 15.** Part 2's own table sums to 17.
5. **Flank: two legs of switchback and one rib**, not three legs; chutes are vertical (no slant), 21.7 m long (spec 22-30).
   The rib is open at every lane, so a chute is also a short cut.
6. **One boulder per chute, covering half the lane** (2 × 2, just above the first crossing). Its shadow runs the lane's
   whole length, so every lower crossing is covered by the same rock and the other half stays struck.
7. **Flank chute cornices are kept out of fixed shade** (a cornice in shade cannot be kicked). So "the Chutes' upper
   third in shade" is not built; shade is three cells under every cliff to the east, plus pines.
8. **Weir 3's ice block stands beside the cliff's shade, not in it**, or the cloud would not matter. The scripted cloud
   (`clouds` id `weir3`, r 14) leaves it after about 22 s.
9. **Lever 3 is dry and reachable at every lake level** (the hard check), at the edge of the strip the lake bares last,
   not on it. The lake's lip is the west sector, bearings 232-308.
10. **Lookout 6's way is the lake's own shelf (bed 0.3)**: shut above 0.6, wading at 0.6. No clock water on it, so
    "the causeway covers once during the hold" has to be scripted by the hold, or dropped.
11. **Snowfield: 4-5 chutes (spec 4-6)**, each with a rock spur of the ridge behind its cornice; the field is 64 cells
    wide, not 104.
12. **The Dam's two chutes have no cover in the layout** (Kelados's blocks are the cover); the Den's three have one
    boulder each.
13. **tarn's way down is labelled `exit.thaw`** ("The Goat Track"): no key exists for the stair seen from above.
14. **Winch 1**: a 2 × 1 rock on the lane's north edge gives a short shadow; where she stands to turn the winch is struck.

## Not done

- Nothing is wired into `world.js`, `build*.js`, `data.js` (not mine to edit): no dispatch, no `ZONES` rows, no `build7`.
- Props are minimal placeholders (`boulder`, `pine`, `fallenPine`, `hut`, `fold`, `pier`, `wall`, `wheelHouse`, `rock`,
  `stone`, `slab`, `bush`); story things are spots only.
- No place voices, no shrines, no `L.lights`.
- Slanted chutes, a third switchback leg, tree-shadow geometry: not built.
- The layouts were checked as data only. Nothing was looked at in the game.

## Check results

`node tools/check-act7.mjs` (300 seeds from 5, step 92821; each seed in both readings of both zones, plus a second
`spate` and `full` build for determinism), final run:

| | thaw | tarn |
|---|---|---|
| hard failures | 0 | 0 |
| oddities (soft) | 0 | 0 |
| mean tries | 1.06 | 1.21 |
| worst seed | 3 tries | 3 tries |
| time per build | about 120-180 ms | about 100-160 ms |
| packs | 20.0 (17 + 3 lookouts) | 16.0 (13 + 3 lookouts) |
| lanes | 9.9 | 10.4 (3 of them sluices) |
| clock water cells | 906 | 20 |
| own-level cells | 1532 | 1922 |
| bare dry floor | | 66% |

Tries thrown away over the 300 seeds: `islands` 168, `denBoulders` 51, `crevasses` 15, `early` 6.
The whole run takes about 5-7 minutes.

`node tools/check-act6.mjs` (300 seeds), run once after: no hard failures, no oddities, exit 0 (drained 1.30 tries,
bottom 1.21). gen6.js and genlib.js were not touched.

`GEN7=<path>` checks another copy of gen7.js, and
`globalThis.G7DEBUG = 1` before the import prints every rejected try's full fault list.
