# Act VII — stage 0: the daylight pieces and the `day0` look gate

Date: 2026-11-17. Tool: `tools/scenario.mjs day0` (Playwright, chromium + swiftshader), run against an own no-HMR dev
server on port 5321 (`.nohmr.5321.local.mjs`, stopped after the run).

    BASE=http://localhost:5321/ node tools/scenario.mjs day0 docs/act7-briefs/reports/g0/day0

## Result: `tarn` passes on snow; `thaw` fails one number (monster body) on both stand-in grounds

Phone-emulated (915 × 412, pixel ratio 1.5, isMobile, `&mobile=1`: `R.mobile` true, the phone's shader paths).
Rows at the design's starting numbers; nothing was tuned in the end (see "Tuning").

| zone | row | q | 1 tele rim (additive beside it) | 2 ground luma | 3 body: warg / goblin / troll | 4 clipped % | 5 legendary beam step (WCAG) | verdict |
|---|---|---|---|---|---|---|---|---|
| forest | thaw | 1 | 3.25 : 1 (2.98) | 0.196 (≤ 0.55) | **0.004** / 0.153 / 0.279 | 0.05 | 0.76 (13.1) — not a snow zone | FAIL: body |
| pass | thaw | 1 | 3.77 : 1 (1.72) | 0.427 (≤ 0.80) | 0.268 / 0.181 / **0.007** | 0.60 | 0.61 (6.4) | FAIL: body |
| farlight | tarn | 1 | 7.17 : 1 (1.21) | 0.772 (≤ 0.80) | 0.576 / 0.387 / 0.349 | 1.55 | 0.20 (1.6) | PASS |
| coast | tarn | 1 | 6.37 : 1 (1.27) | 0.652 (≤ 0.80) | 0.509 / 0.340 / 0.256 | 0.72 | 0.53 (4.6) | PASS |
| forest | thaw | 0 | 3.34 : 1 (3.22) | 0.153 (≤ 0.55) | **0.001** / 0.157 / 0.336 | 0.42 | 0.39 (4.2) — not a snow zone | FAIL: body |
| pass | thaw | 0 | 4.08 : 1 (1.63) | 0.433 (≤ 0.80) | 0.335 / 0.196 / **0.025** | 0.67 | 0.65 (10.2) | FAIL: body |
| farlight | tarn | 0 | 7.62 : 1 (1.21) | 0.774 (≤ 0.80) | 0.600 / 0.424 / 0.368 | 1.60 | 0.20 (1.6) | PASS |
| coast | tarn | 0 | 7.00 : 1 (1.25) | 0.665 (≤ 0.80) | 0.553 / 0.401 / 0.270 | 0.77 | 0.52 (4.6) | PASS |

Bars: 1 ≥ 3 : 1; 2 ≤ 0.80 snow / ≤ 0.55 grass; 3 ≥ 0.15 each; 4 ≤ 2 %; 5 edge found on snow.
Raw numbers for every row (and the white line, the rare beam, the pre-checks): `g0/day0/day0.json`.

### How each number is read (so it can be argued with)

All from the drawn frame's own pixels (the full framebuffer read back right after the render the shot shows).

1. **Telegraph.** 24 points round the red circle (r 1.5 m, fill at 0.6). At each: WCAG contrast of the telegraph pixel
   against **the same pixel with the telegraph hidden** (the ground it lies on). Two bands are read, the colour rim
   (0.93 r) and the dark under-edge (0.85 r); the point's value is the better of the two; the number is the median.
   On snow it is the dark under-edge that carries it (edge 6-7 : 1, red rim alone 1.8-2.1 : 1); on dark grass it is the
   red rim (3.3 : 1, under-edge 1.2-1.3 : 1). The additive circle is read the same way at its own rim.
2. **Ground.** Mean luma (Rec. 709 on the displayed values, 0-1 of white) of ~750 floor points round the hero, before
   anything is added. Linear luminance is in the JSON beside it (`ground.lin`).
3. **Body.** Inside each monster's torso box, the pixels that change when the monster is hidden; the number is
   |mean luma with − mean luma without|. A cast shadow inside the box counts against it (quality 1).
4. **Clipped.** Share of the frame at luma ≥ 0.97. (Any single channel ≥ 254 is in the JSON: 1.4-3.6 %, the red rims.)
5. **Beam.** A horizontal profile across the legendary beam at 1.0 / 2.2 / 3.6 m, with and without it; "step" is the
   largest luma difference (dark core or bright centre) against what is behind; found at ≥ 0.10. **Read strictly as
   3 : 1 this fails on the worst case** (`farlight`, 1.6 : 1): a 35 % core cannot reach 3 : 1 on any ground, so I took
   "edge found" as a visible step and report the contrast beside it. The lead should confirm that reading.

### What the numbers say

- **The 'day' telegraph does its job.** On snow the additive circle is a pink wash at 1.2-1.7 : 1; the day form is
  3.8-7.6 : 1. On dark grass both pass and are about equal (the forest is dark enough for additive light).
- **`tarn` holds on the worst case**, but with little room: `farlight` on the phone's plain ice is 0.77 against the
  0.80 cap and 1.6 % clipped against 2 %. Any brighter exposure than 0.92 would break both.
- **Lesson 5 (is `farlight` under `tarn` a different place from Act V?)**: by eye yes, it is unmistakably day, but on
  a phone it is a flat pale-blue sheet with no relief (`day0-q*-farlight-tarn-plain.jpg`). That is the phone's plain
  ice, not the row. For the lead and the owner to judge.
- **`thaw` fails the body test, and it is not the light.** The two failures are one creature each whose own tone equals
  the ground's: the dark warg on dark leaf litter (0.19 on 0.19), the pale troll on grey half-lit snow (0.48 on 0.48).
  The other two creatures pass in each shot. `forest`/`thaw` was expected to fail as a picture (lead's stage-0 finding).
- **The lead's G0 question, "does tinted `leaves` stay dark under the sun?": yes.** `ground7('thaw')` on the forest's
  layout with no snow reads 0.22 luma at quality 1 and 0.17 at quality 0 (grass cap 0.55, so it is legal, but it is the
  same dark ground the warg vanished on). With the white thaw layer at k 0.65 it rises to 0.48 / 0.33.

### Tuning (one pass), and the recommendation

One pass was tried on `thaw`: the sun moved behind the scene (`sun: [-18, 22, -8]`) to darken the camera-facing sides.
The troll on the pass moved from 0.007 to 0.042 and the warg in the forest did not move (0.003). It was reverted; the
row is the design's again.

**Recommendation, not applied:** the design's haze fallback (`thaw` fog 0x2a3440 at 0.014) is the written next step
for a failed body test, but I do not expect it to cure this: haze changes the distance, not a creature standing 4 m
away on ground of its own tone. What the numbers point to instead is the lead's own ruling: give `thaw` a light slot A
(the `melt/meadow` layer, or `rime` snow) and keep Act VII's creatures clearly darker or lighter than it; then re-run
`day0` on the real ground at stage A. That is the lead's decision.

## Shots (`docs/act7-briefs/reports/g0/day0/`, JPEG, 38-144 KB each)

`day0-q{0,1}-{forest-thaw,pass-thaw,farlight-tarn,coast-tarn}-{plain,tells}.jpg` — 16 files. `plain`: the zone alone
under the row. `tells`: three monsters, the day circle (left) and the additive one (right), a white line in each
form, an impact ring round the hero, a light pool below her, a legendary beam (left) and a rare one (right).

## Regression (shipped picture unchanged)

- `shallowtele`: pass (tele 29.5, pool 14.9, cradle 9.4, tones 53.3, halo 1).
- `darktele`: pass, all beats, both qualities (the dark tell still premultiplied 205, the white circle still additive).
- `ground6`: skipped (known stale).
- By construction: a row without `sun` / `day` takes exactly the old offsets and never sets the flag; with the flag off
  every changed function takes its old branch (checked after a day row: flag off, `body.day` off, `uOccA` 0.82, sun
  offset (-12, 30, 6), moon at camera + (-12, 30, 6)).

## What changed, by file

- `src/world/atmos.js` — rows `thaw`, `tarn`, `thawShade`, `tarnShade`, `thawCine`, `tarnCine`, `thawFight`,
  `tarnFight`, `tarnGold`, `townMorning`, `townDusk`. New keys `sun: [x, y, z]` and `day: true`.
- `src/gfx/gfx.js` — `R.sunOff`, `R.day`; `setAtmosphere` (keeps the row's sun, sets the flag); `setupGfx` and
  `updateCamera` read `R.sunOff`; new exports `DAY`, `onDay`, `isDay`; `initGfx` honours `&mobile=1` when no option is
  passed (the viewer only; `boot.js` passes its own).
- `src/gfx/fx.js` — `TELE_DAY_FS` and the day branch in `teleMat`; `ring0` (dark under-ring at 25 % at quality ≥ 1,
  alpha × 1.6 at quality 0), `updateFX`, `clearFX`; `FX.teleAdd` (test switch: additive by day).
- `src/world/build.js` — `WIND.uThaw`, `WIND.uOccA`; `occlude` / `OCC_F` (dither ceiling 0.82 → 0.6 by day);
  `Village.update` (house fade 0.28 → 0.42 by day); `ground7`, `ACT7`, `GROUND7`, `setThaw`, `thawNow`, `thawTick`;
  `groundMat` (`dryLayer`, `dryTint`, `dryFake`, `dryU`, `rims`, a coverage mask for the thaw layer); the ground
  config pick in the ground builder; `lightRing` (screen blend by day).
- `src/world/sea.js` — `seaMat` (`o.melt`, define `SEA_MELT`, key `…m…`), `safeSea` (melt pair + one `step` at
  0.45 m, key `safeSeaM`), `buildSea` and `seaBeyond` read `L.melt`.
- `src/game/pickups.js` — new export `lootBeam(rar)` (the beam, taken out of `dropItem`), `coreTexture`; the day core.
- `tools/scenario.mjs` — scenario `day0` (`stage: '0', until: 'B'`).
- `.nohmr.5321.local.mjs` — the test server's config (new file).

## The API for other builders

- **Day flag:** `import { DAY, onDay, isDay } from '../gfx/gfx.js'`. `DAY.on` (boolean), `onDay(fn)` calls `fn(on)` now
  and on every change. It follows the applied atmosphere row's `day: true`; nothing else sets it. `world.js` needs to
  do nothing but apply a day row.
- **Thaw:** `import { setThaw, thawNow } from '../world/build.js'`. `setThaw(k)` eases (about 2 s to settle);
  `setThaw(k, true)` snaps (use at zone build). It writes `WIND.uThaw` only. `uSnow` stays `world.js`'s
  (`min(0.45, k)` for `thaw`, 1 for `tarn`).
- **Ground:** a layout of `type: 'thaw'` or `'tarn'` gets `ground7` automatically (`ACT7` is exported). `tarn` with
  `L.mode === 'shore'` takes the shore stone in slot B instead of ice.
- **Meltwater:** set **`L.melt = true`** on the layout before `buildLevel`. Desktop gets `SEA_MELT`, a phone
  `safeSeaM`. A layout with pockets keeps the pocket geometry and only changes its look.
- **Loot beam:** `lootBeam(rar)` in `pickups.js`; the day core is decided when the beam is made.

## Not done, or to check

- **`ui/style.css`** (the 1 px dark text shadow under `body.day`): not my file. The class is toggled; the rule is not
  written.
- **The fx ambients (`'melt'`), smoke on the peaks, the cloud shade discs, the hearths' pools / runes / marks in
  `light.js`**: not in this task's files. Only `lightRing` got the day blend.
- **The fade dither** lives in `build.js` and was softened there (numbers above), but only by number: nobody has looked
  at it on a real phone, and under the forest's closed canopy it is still very visible.
- **`ground7` and the meltwater are compiled and drawn, not judged.** Tested by building the forest's and the pass's
  layouts as `thaw` / `tarn` and the coast's with `L.melt` (desktop quality 1 and 2, phone 0 and 1: no shader errors;
  `uAutumn` untouched). The real zones do not exist yet, so the layer scales, tints and the patch mask are first
  guesses. `melt/meadow` does not exist: every chain ran on its fallback.
- **G_WET on Act VII ground** uses Act VI's wet-rim branch (`rims`). It needs bed data from the Race to show anything;
  untested with water.
- **`SEA_MELT` also drops the shore-ice plates** (beyond the design's list: aurora, light paths, slush). Say if they
  should stay.
- **`ACT7` is now exported from `build.js`**; if the plumbing item defines its own, one of the two should go.
- **A telegraph or beam made at night keeps its night form** if the row turns to day while it lives (and the reverse).
- Not shot: a floating damage number (the viewer has no overlay); a goblin / wolf / troll are the procedural rigs
  (`buildWarg` stands in for the wolf).
- Not tested: a real phone screen in sunlight.

---

# Real zones (stage A): the code-made meadow, the frame by day, creatures on the real ground

Date: 2026-11-17. `thaw` and `tarn` entered through the game's own test hook (`tools/fixtures7.mjs`: `fx7('thawSeen',
'thaw')`, `fx7('tarnSeen', 'tarn')`, seed 3), phone-emulated (915 × 412, ratio 1.5, isMobile), quality 0 and 1, own
server on 5321 (stopped).

    PART=real BASE=http://localhost:5321/ node tools/scenario.mjs day0      # real zones only (PART=viewer: the stage-0 part)

## What changed

- **`src/gfx/codetex.js` (new):** three tileable layers made in code from fixed seeds, no download: `meadow` (short
  blades laid as strokes, light yellow-green, a little straw, pale flower specks), `gravel` (two sizes of pebble over
  sand, Worley cells) and `crag` (pale bedded limestone with joints). Albedo plus a normal map (quality ≥ 1), 512 on a
  phone and 1024 otherwise. Nothing in a tile is broader than about a sixth of it, so no repeat shows at the play camera.
- **`src/gfx/env.js`:** `codeLayer(id, { mobile })` makes a layer on first ask and keeps it as `ENV.layers['melt/<id>']`
  (never under a bare name, so no older zone's chain can pick it up); `freeCodeLayers()` lets their GPU copies go.
- **`src/world/build.js`:**
  - `ground7('thaw')`: slot A `melt/meadow`, B `melt/gravel`, W `melt/crag`, P the boot trail lightened (`hueP`).
    The fake snow in the thaw slot is now whiter, so snow stays at least 0.2 lighter than grass.
  - The ground builder, Act VII only (`day7`):
    - the open floor is mostly grass, with gravel only where both noises run high;
    - gravel lies in the water's beds and a cell up their banks (the brooks, the Race, the fords);
    - **the frame:** rock outside the walked ground keeps 0.8 and more of its tone. The night rule darkens it with height
      to 0.36, and that rule drew the black corners.
  - `ground7('tarn')` gets `hueW` (the sea-cliff scan greyed and lifted to a sunlit granite).
  - A level that is not Act VII's calls `freeCodeLayers()`.
  - Night zones take none of these branches.
- **`tools/scenario.mjs` `day0`:** a `PART` switch and the real-zone part:
  - five spots: thaw meadow, thaw Race bank, thaw under the Chutes, tarn snowfield, tarn shore; the five numbers at each;
  - the body test on the act's six kinds, spawned with the game's own `spawnMonster` (so with their `look`);
  - on the meadow, the kinds on grass (`setThaw(0)`), on snow (`setThaw(1)`) and on the trail (two tests: the trail
    holds four kinds at a time);
  - the snow against the grass;
  - cloud discs hidden for the read (`CLOUDS=1` keeps them);
  - `TINT7='kind:rrggbb:amount,...'` tries a look before `data.js` takes it.
  - The body test now masks the creature by drawing it with colour writes off, so its own cast shadow stays in the
    "without" frame.
- `src/ui/style.css` has `body.day` rules, but **I did not write them** (someone else did; I have not touched that file).

## The numbers (shipped looks)

Body = |creature − what is behind it| in luma, bar 0.15. Order: hillWolf / goblin / rockRoller / rockScorpion /
chough / denBear. "off" means the chough's AI had flown it out of the read box; where it was in frame it read
0.32-0.60. Raw numbers in `stageA/day/day0-real.json`.

| spot | on | q | 1 tele (additive) | 2 ground | 3 body | 4 clip % | 5 beam |
|---|---|---|---|---|---|---|---|
| thaw meadow | as it lies | 1 | 4.20 (1.60) | 0.491 | 0.21 / **0.13** / 0.18 / 0.20 / off / 0.19 | 0.10 | 0.72 |
| thaw meadow | grass | 1 | | 0.481 | 0.20 / **0.10** / 0.18 / 0.20 / off / 0.22 | | |
| thaw meadow | snow | 1 | | 0.714 | 0.48 / 0.30 / 0.40 / 0.37 / off / 0.41 | | |
| thaw meadow | trail | 1 | | 0.533 | 0.43 / **0.05** / **0.11** / 0.20 / – / – | | |
| thaw meadow | trail (2) | 1 | | 0.547 | – / – / **0.149** / **0.145** / 0.32 / 0.39 | | |
| thaw Race bank | as it lies | 1 | 4.06 (1.71) | 0.481 | 0.25 / **0.02** / 0.21 / 0.19 / off / 0.19 | 0.19 | 0.49 |
| thaw Chutes | as it lies | 1 | 3.31 (1.55) | 0.572 | 0.19 / **0.04** / 0.23 / 0.19 / 0.47 / 0.39 | 0.17 | 0.72 |
| tarn snowfield | as it lies | 1 | 5.42 (1.59) | 0.616 | 0.30 / 0.19 / 0.38 / 0.25 / off / 0.40 | 0.25 | 0.31 |
| tarn shore | as it lies | 1 | 4.32 (2.02) | 0.528 | 0.34 / **0.02** / 0.19 / – / – / – | 0.77 | 0.44 |
| thaw meadow | as it lies | 0 | 4.21 (1.60) | 0.421 | 0.18 / **0.12** / 0.20 / 0.26 / off / 0.31 | 0.11 | 0.48 |
| thaw meadow | grass | 0 | | 0.406 | 0.19 / **0.12** / 0.19 / 0.25 / off / 0.29 | | |
| thaw meadow | snow | 0 | | 0.612 | 0.42 / 0.34 / 0.43 / 0.48 / off / 0.59 | | |
| thaw meadow | trail | 0 | | 0.529 | 0.45 / **0.03** / **0.12** / 0.34 / – / – | | |
| thaw meadow | trail (2) | 0 | | 0.552 | – / – / 0.16 / 0.20 / 0.49 / 0.41 | | |
| thaw Race bank | as it lies | 0 | 3.79 (1.65) | 0.485 | 0.23 / **0.13** / 0.21 / 0.26 / off / 0.24 | 0.18 | 0.43 |
| thaw Chutes | as it lies | 0 | **2.90** (1.39) | 0.499 | 0.22 / **0.00** / 0.24 / 0.24 / 0.60 / 0.26 | 0.16 | 0.73 |
| tarn snowfield | as it lies | 0 | 5.26 (1.54) | 0.641 | 0.38 / 0.32 / 0.41 / 0.46 / off / 0.41 | 0.26 | 0.28 |
| tarn shore | as it lies | 0 | 3.81 (2.03) | 0.521 | 0.39 / **0.04** / 0.21 / – / – / – | 0.82 | 0.44 |

- **Ground:** the meadow reads 0.41-0.49 (target 0.40-0.50, cap 0.55): PASS at every spot.
- **Snow against grass:** 0.233 at q1, 0.206 at q0 (bar 0.2): PASS, the q0 one narrowly.
- **The frame** (camp, q1, the four corner boxes, mean luma / share near black):
  - thaw: 0.34-0.51, 0 % near black;
  - tarn after `hueW`: 0.30-0.36, ≤ 1 % (before: 0.17-0.21 and 6-12 %).
  - Shots: `day-q1-thaw-camp.jpg`, `day-q1-tarn-camp.jpg`.
- **Telegraph** (≥ 3 : 1): passes everywhere but thaw Chutes at q0, 2.90 : 1 (FAIL by 0.1). That rim is the red on
  grass; on that spot the dark under-edge gives nothing.
- Clip ≤ 2 % and beam found: PASS everywhere.
- **Body: the goblin fails on every non-snow ground. hillWolf, denBear and the chough pass everywhere. rockRoller and
  rockScorpion fail only on the trail** (0.11-0.149).

## Suggested looks for `data.js` MONSTERS (tested with `TINT7`, q1, thaw and tarn; not applied)

| kind | shipped look | suggested | measured with it |
|---|---|---|---|
| rockRoller | tint 0x8c98a6 @ 0.6 | **tint 0x4e5660 @ 0.7** | 0.18-0.45 on every ground (trail 0.18 / 0.20): PASS |
| rockScorpion | tint 0xb08a4a @ 0.6 | **tint 0x5a3c22 @ 0.6** | 0.16-0.39 (trail 0.17 / 0.20): PASS |
| goblin | none (shared kind) | tint 0x1c2214 @ 0.8 | grass 0.25-0.27, snow 0.43, tarn snowfield 0.28; **trail 0.11, Race bank 0.14, Chutes 0.14, tarn shore 0.14: still fails** |

- **Goblin cannot be cured by a tint alone.** In the sun its darkest tinted body still reads about 0.18 of white, and the
  trail, gravel and shore behind it are 0.29-0.33. It misses by 0.01-0.04, and by 0.07 on the trail.
- Lightening the gravel (tried: behind it 0.33, and the meadow's mean rose so snow − grass fell to 0.197) does not
  help, so that change was reverted.
- Options, for the lead:
  - a pale rim on the Act VII goblin (`look.rim`, about 0xd8e0c0 at 0.8), so it reads by its edge;
  - accept 0.14 on mid-tone ground.
- **`goblin` is shared with Acts I-IV**: a `look` on `MONSTERS.goblin` would change every act's goblins. It needs an Act
  VII row (for example a `goblin7` that the act's packs name) or a per-act look.

## Shots (`docs/act7-briefs/reports/stageA/day/`, JPEG, 37-148 KB)

- Five spots × q0/q1:
  - `day-q{0,1}-thaw-meadow.jpg`
  - `-thaw-raceBank.jpg`
  - `-thaw-chutes.jpg`
  - `-tarn-snowfield.jpg`
  - `-tarn-shore.jpg`
- The kinds' matrix on the meadow:
  - `day-q{0,1}-thaw-meadow-on-grass.jpg`
  - `-on-snow.jpg`
  - `-on-trail.jpg`
  - `-on-trail2.jpg`
- The frame: `day-q1-{thaw,tarn}-camp.jpg`.
- Raw numbers: `day0-real.json` (the thaw rows from the full runs; the tarn rows re-run after the cliff change).

## Regression

`shallowtele` passes twice (cradle 7.6 and 8.9: the ring's own flicker range, written down in the scenario). Every
ground change is behind `ACT7.has(L.type)` or an Act VII config key.

## Not done, or to check

- **Goblin readability** (above): it needs the lead's choice.
- The Chutes telegraph at q0 is 2.90 : 1.
- The **`day0` viewer part was not re-run** after these changes. The changes are Act VII-only, so its stage-0 table
  above still stands.
- `townMorning` and `townDusk` do not get the lit frame: it is keyed on the zone type, not on `DAY.on`.
- The meadow on a real phone screen has not been looked at, and neither has its tiling at the Wanderer's zoom.
