# Stage A: `build7.js`, Act VII's code props

17 November 2026. Files: `src/world/build7.js` (new), `tools/props7.mjs` (new), shots and `tris.json` in
`docs/act7-briefs/reports/props7/`. No other file was edited. Nothing in `build.js`, `light.js`, `world.js` or
`gen7.js` calls it yet: wiring is the world lane's.

## What was checked, and how

`node tools/props7.mjs` (dev server on 5311, headless Chromium, swiftshader), last full run: **all passed**.

- Every one of the 35 kinds returns a `THREE.Group` with children and `userData.kind`, at quality 1 and 0 (`flowers` is
  empty at quality 0 by the perf plan). An unknown kind is an empty group.
- Every setter in the table below was called in a shot or in the `act7Level` run. No page error, no console error.
- `act7Level` on a mock layout (the real zone's grid, gen7's spot names at the contract's counts), both readings of
  both zones; first states asserted; `dispose7` leaves nothing in the group; a layout with no spots and a `null`
  layout build nothing.
- 19 shots, each JPEG 150 KB or less. I looked at them and fixed what did not read (list at the end).
- **Not checked:** on a real gen7 layout (it did not exist), in a real `thaw`/`tarn` zone, on a phone, the tweens
  (`anim = true` paths ran only for `shatter`), Kelados's parts on the golem's body.

## Exports

| export | what |
|---|---|
| `act7Prop(kind, o)` | one prop, a Group with `userData.kind` and its setters |
| `act7Level(L, lvl, o)` | builds the layout's props, adds them to `lvl.group`, sets `lvl.act7`, returns the handles |
| `dispose7(handles)` | removes them, frees own geometries and materials, clears their `TICKS` |
| `cloudDisc(r, o)` | the cloud's shade (also `act7Prop('cloudDisc', { r })`) |
| `keladosParts(o)`, `keladosDress(bones, o)`, `KELADOS_SLOTS`, `KELADOS_FALL` | Kelados's code parts |
| `RANK7` | the seven flame colours by rank (contract F9) |
| `ACT7_KINDS`, `tris7(obj)` | the kinds' names; a triangle count with instances |

## The kinds

Local +z is the prop's front. Triangles are measured (`tris.json`), default options, instances counted.

| kind | options | setters (`userData`) | triangles |
|---|---|---|---|
| `weir` | `mark` 0-5, `great` (the Dam's great wheel, ×1.7) | `setTurn(k)`, `setOpen(b, anim)`, `setGlow(k)` (its mason's mark) | 520 |
| `logjam` | `n` logs (11) | | 264 |
| `hornStone` | | | 306 |
| `cornice` | `w` (4) | `setArmed(b)` (snow lip / bare rock), `setK(k)` (the cap growing back) | 272 |
| `snowTongue` | `len` (8), `w` (4), `k` | `setK(k)` | 100 |
| `iceBlock` | `size: 'small' \| 'big'`, `melt` | `setMelt(k)`, `shatter(done, dur)`, `reset()` | 60 (116 shattered) |
| `slab` | `open` | `setOpen(b, anim)` | 204 |
| `denMouth` | `blocked`, `s` | | 180 (288 blocked) |
| `fallenPine` | `len` (8) | | 300 |
| `lookHearth` | `lit`, `rank` | `setLit(b)`, `setRank(0..6)`, `flash(k)` | 672 |
| `arenaHearth` | `armed`, `lit` | `setArmed(b)`, `flare(done, dur)`, `setLit(b)` | 684 |
| `hut` | `snow` | | 248 |
| `fold` | `r` (3) | | 468 |
| `woodpile` | `half` | `setHalf(b)` | 400 (200 half) |
| `winch` | `ice` | `setIce(k)`, `setTurn(k)`, `setOpen(b, anim)` | 660 |
| `lever` | `pulled`, `ice` | `setPulled(b, anim)`, `setIce(k)` | 224 |
| `channel` | `len` (24), `w` (4) | | 384 at 24 m |
| `piers` | `at: [{x, z, h?, r?}]` or `n` (7), `gap` (4), `snow` | | 392 for seven |
| `snowBridge` | `len` (5), `w` (3) | | 48 |
| `icePlug` | `w` cells (3), `open` | `setOpen(b, anim)` | 120 |
| `iceWall` | `w` (26), `h` (9), `seat` metres out (2) | (`userData.seatAt`) | 464 |
| `coverRock` | | (`userData.h` 1.8, `w` 2) | 152 |
| `coverIce` | | (`userData.h` 2.0, `w` 2) | 48 |
| `boulder` | `r` (0.9) | `setRoll(a)` | 80 |
| `haldaLedge`, `haldaStump` | | (`userData.standAt`, `r` 2) | 152, 60 |
| `fieldAnvil`, `bedRoll` | | | 164, 188 |
| `markStone` | `mark` 0-5, `glow` | `setGlow(k)` | 28 |
| `flowers` | `at: [{x, y?, z}]` or `n`, `r`, `seed` | (`userData.count`) | 4 a card |
| `rainbow` | `w` (40) | `setK(k)` | 2 |
| `lakeThread` | `pts` or `len`, `drop`, `w` | `setK(k)` | 32 |
| `daySmoke` | `w`, `h`, `color` | `setK(k)` | a sprite |
| `cloudDisc` | `r`, `a`, `color`, `lift` | `setR(r)`, `setA(a)`, `setShimmer(b)`, `drape(L)` | 512 |
| `keladosParts` | `s` | `drop(i)`, `dropPhase(n)`, `setMoss(k)`, `reset()` | 691 (preview only) |

**Whole zone** (mock, contract's counts, three cloud discs): `thaw` 22,174 (`spate`) and 23,250 (`green`, 467 flower
cards at quality 1); `tarn` 20,454 (`full`) and 21,298 (`let`). The budget is 60,000.

## `act7Level(L, lvl, o)`

`lvl` is `buildLevel`'s `out` (or a Group). `o`: `clouds: n` (cloud discs to make, hidden; none by default),
`flowers: false`, `y: (x, z) => height`. Every spot is optional. World code:

```js
import { act7Level } from './build7.js';
if (ACT7.has(L.type)) act7Level(L, out);          // in buildLevel, beside act6Level; sets out.act7
// world.js: z.lvl.act7.weirs[i].mesh.userData.setOpen(true, true), ...lookouts[k].mesh.userData.setRank(r), etc.
```

The handles:

| key | shape | first state |
|---|---|---|
| `weirs` | `[{ i (1-3), x, z, mesh, jam }]` | shut in `spate`, open in `green`; `jam` only while shut |
| `lookouts` | `[{ i (1-6), x, z, mesh, hut, pile }]` | cold, rank 0; lookout 2 half a pile; `tarn` huts snowed |
| `horns` | `[{ flue, x, z, mesh }]` | |
| `cornices` | `[{ k (index in L.flues), x, z, mesh, tongue }]` | armed (`f.armed !== false`); tongue at k 0 over the lane's last third |
| `channels` | `[{ k, x, z, mesh }]` | one per `kind: 'water'` flue |
| `dens`, `slabs`, `iceblocks`, `huts`, `bridges` | `[{ x, z, mesh }]` | slabs shut, blocks whole |
| `winches` | `[{ i, x, z, mesh, mark }]` | frozen in `full`; free and turned in `let` |
| `levers` | `[{ i, x, z, mesh }]` | levers 2 and 3 iced in `full`; pulled in `let` |
| `hearth`, `halda`, `den`, `anvil`, `piers`, `wall`, `plug`, `wheel`, `flowers` | mesh or `null` | hearth armed; plug shut in `full` |
| `props` | `{ kind: [mesh] }` | `L.props` entries whose `t` is one of this file's kinds |
| `clouds` | `[mesh]` | hidden |
| `rainbow`, `thread` | `null` | the story builds them |
| `skipped` | `[name]` | what found no place |
| `all` | `[mesh]` | everything, for `dispose7` |

Placement rules I chose (gen7 may overrule by giving `rot` on a spot): a lookout's hut and a weir's log-jam go only on
a cell that is not walkable and not water, found near the spot; none found means it is skipped and named in `skipped`
(the mock skipped one lookout hut). A `huts` spot on a water cell is skipped. The wall of ice stands `seat.out ?? 2` m
north of `S.seat`.

## Kelados's parts

`keladosDress(avatar.bones, { s })` builds eight plates, the snow cap, the pine and three moss patches and parents each
to a golem bone by pattern (`Spine2`, `Head`, `shoulder.L/R`, `LowerArm.L/R`, `UpperLeg.L/R`); `K.missing` lists bones
not found. `K.dropPhase(1..3)` drops `KELADOS_FALL`'s rows (two, four, two); `K.drop(i)`; `K.setMoss(k)`;
`K.reset()`. **The offsets are a first guess, never seen on the body.**

## Daylight and the cloud disc

- Materials: `rock7` (natural rock) and `stone7` (dressed masonry) are `worldMat` on a loaded layer, Lambert fallback;
  wood, iron and cloth `solid7`; `snow7`; ice clear (`ice7`), thin (`ice7s`) and solid (`ice7o`). All in `MAT`, shared.
- The only additive thing is a flame. Each fire has a dark normal-blended sprite behind it. fx's orange fire particles
  are not used, because they hid the rank colour.
- The cloud disc is its own small shader (normal blending, 0x1c2a3a at 0.3, soft from 0.6 of the radius), not
  `light.js`'s disc: reusing that needed `light.js` edits. It is drawn without the depth test; with it the disc was cut
  by every rise in the ground.

## Shots (`docs/act7-briefs/reports/props7/`)

`01-weir`, `02-slide` (snow), `03-slide-thaw`, `04-ice`, `05-ice-snow` (+`-q0`), `06-dens`, `07-hearths`,
`08-hearths-snow` (+`-q0`), `09-keeper`, `10-works` (snow), `11-works-thaw`, `12-dam`, `13-wall`, `14-kelados`,
`15-meadow` (+`-q0`), `16-cloud-snow`. Town ground under `ATMOS.thaw`, the Pass's snow under `ATMOS.tarn`.

Fixed after looking: stone on the boot `wall` layer drew as dark brickwork (now `blocks`); wood too pale; the snow
tongue a flat white sheet (now lumped); shards black (no vertex colour); ice shells hid the winch; lever arm invisible
from above; horn-stone too small; rank colour hidden by the orange coal bed.

## Not done, and open

- Not wired into `buildLevel` / `world.js`; no interacts; no lights (the layout's `L.lights`).
- `rock7` in `thaw` uses `blocks`, not the cliff's `wall` layer: it may not match the cliffs. Look again in the real zone.
- The snow tongue is not draped: on a sloped lane it floats or sinks at its far end.
- The snow tongue and snow roofs still read near white with little relief.
- The open slab hides its hollow from the play camera.
- The cub is a creature, not built here. Day smoke is one sprite kind; nothing places it on `FAR_BEACONS`.
- The ice wall's top is out of frame in `13-wall`; its full height was not looked at.
- `flowers` falls back to a noise scatter over dry non-snow cells when `S.flowers` is absent: a guess at gen7.
