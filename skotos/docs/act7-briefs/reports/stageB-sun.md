# Stage B: Sun and Shade (the clouds) — report

Contract: `docs/act7-contract.md`, Sun and Shade U1-U3, U11, U12 and the Slide's S3. U4-U10 (the Icebound, the choughs, the
scorpions, Kelados) belong to the creature builders: they read what is built here.

## What was built

**`src/game/light.js`** (the four `'sun'` branches of U11; every other kind byte-for-byte as before):
- `lightAt`: first line `if (sun()) return !shadeAt(x, z);` (before the pools loop, so a shade pool never counts as light).
- `heroLightR` returns 0 and `baseRing` returns 0 for `'sun'`.
- `tickLight`: `on = lightOn() && pl && !sun()`, so the ring and the Cradle are hidden and the function returns before the
  `R.heroLight` scaling. The pools loop still runs (a cloud's shade is a pool).
- New exports: `shadeAt(x, z)` (U1: `L.shade[i]`, or inside a pool with `p.shade`) and `sunAt = !shadeAt`.
- `addLightPool(..., { shade: true })` sets `p.shade`.
- DEV handle `window.__light7` (ringShown, cradleShown, the queries) for the tests.

**`src/game/sun7.js`** (new, about 195 lines):

| export | what |
|---|---|
| `sunEnter(z)` | builds the clouds. Takes `HAZ7.clouds` of the wandering lines (no `scripted`, no `dam`) in generator order with the `extra` lines last. Then every `dam` line on top (Kelados's two). Then the `scripted` weir-3 line, which waits over its ice block until a hero comes within 24 m, runs its line once and is gone. Each cloud gets a shade pool (`addLightPool(x, z, r, Infinity, 'cloud', { shade: true, fx: false })`) and one of build7's `cloudDisc`s, drawn 1.35 × r so that the rule's edge lies half-way down the disc's fade. Installs `z.shadeAt`, `z.cloudAt`. Starts `z.sunT` at 0 on the zone's creation and keeps it across visits |
| `sunTick(z, dt)` | `z.sunT = (z.sunT + dt) mod 600`. Each cloud goes to gen7's `cloudAt(c, z.sunT)` (the line periods are 50/100/120 s and all divide 600). A cloud whose disc would cover an `L.noCloud` cell is off for that stretch (no shade, no disc). Discs are shown for the 4 nearest clouds (2 at quality 0) within 70 m, draped when they move. The hero's shade sends bus `'sunShade'`, eases the atmosphere and sets `Audio.mood({ shade })` |
| `sunLeave(z)` | puts the sky back to the sun row, sets mood shade 0, removes the pools and hides the discs |
| `setSunT(z, t)` | co-op: the host's clock |
| `cloudStart(z, id, t)` | co-op/story: sets a scripted cloud off at clock t |
| `cloudLines(L, n)`, `cloudPos(L, c, t, start)` | pure (no page state): which lines are sailed, and where one is |
| `shadeAt`, `sunAt` | re-exported from light.js |
| `sunAtmos(z, key)` | the story's or a boss's row to ease the shade from (`'thawFight'`, `'tarnGold'`; null = the zone's own). `false` = hands off during a scene, `true` = ours again |
| `sunHint(kind)` | emits `'hint7', kind` once per page |
| `SUN` | `{ period: 600, ease: 0.4, reach: 24, far: 70, hinted }` |

**Fields on the zone:** `z.sunT` (s, 0-600), `z.sun` (`{ clouds: [{ id, c, r, x, z, off, pool, mesh, scripted, dam }], k, shade, cloud, base, hold, started }`), `z.shadeAt(x, z)`, `z.cloudAt(x, z)` (returns the cloud or null; forge.js `corniceShade` reads it).

**The look under a cloud.** The atmosphere eases to `<zone>Shade` (`thawShade`, `tarnShade`) over 0.4 s with `mixAtmos` (smoothstep) and `setAtmosphere`; mixAtmos never swings the sun. `Audio.mood({ shade: 1|0 })` follows. With 'Reduce flicker' on, `setShimmer(false)` is applied on the next tick (U12).

**Bus events (new):**
- `'sunShade'` (inShade, underCloud, z): when the hero's own shade changes. inShade covers fixed shade or a cloud; underCloud covers a cloud only.
- `'hint7'`, `'sun'` | `'shade'`: once per page. `'shade'` fires on stepping into shade with a chough (or any `shadeShy` foe) within 14 m. `'sun'` fires on stepping out of shade within 14 m of an ice block.
- `'cloudStart'` (id, t, z): host only, when the weir-3 cloud sets off.

**`src/game/world.js`** (only the allowed lines):
- `light: 'sun'` on `ZONES.thaw` and `ZONES.tarn`.
- The import line `import { sunEnter, sunTick } from './sun7.js';` (needed for the two calls).
- `sunEnter(z);` in `act7Enter` and `sunTick(z, dt);` in `act7Tick`.

**`tools/scenario7.mjs`**: scenario `sun` (stage B, until E), from `fx7('thawSeen','thaw')` + `&nopacks`. `SHOTS=1` takes the two shots instead (quality 1, drawn, `&nostory`). `SHOTS=2` also writes a no-cloud shot of the same spot to `/tmp` for comparison.

## Results (BASE=http://localhost:5311/)

| scenario | result | notes |
|---|---|---|
| `sun` | **pass, 18/18 beats** (twice in a row) | lightKind `'sun'`. heroLightR 0. `R.heroLight.distance` 13 → 13 after 60.1 game-s. z.sunT advanced 60.13 s for 60.13 game-s. No ring, no Cradle (also with the ring forced into existence first). shadeAt true on L.shade and under a cloud's centre, false in the open (lightAt the inverse). Passing a spot: meadow 20.5 s (r 12.3), flank 17.5 s (r 10.4), terraces 15.0 s (r 9). L.noCloud: 906 cells, 0 covers in 925 cloud-samples over 600 s every 2 s (275 off-map samples), weir-3 cloud running. A barred cell under a cloud turns it off (no shade, no disc) and back. Two computations: worst 8.5e-14 m, clock round trip 0, period 600 exact. Counts: diff 0 → 4, diff 1 → 3, diff 4 → 2 (= HAZ7). Flicker uShim 1 → 0 → 1, 2 discs at q0. Under a cloud: 'sunShade' true then false, hemi 1.25 → 0.95, sun 2.3 → 1.1 and back, sunOff unchanged (-18, 22). S3: a chute under the `terraces` cloud creaks (0 kicks, armed, idle); the cloud gone, the same `loud()` fires it (inhale) |
| `slide` | pass on the A/B run, with the sun kind on and off. Two harness runs failed, each on a different beat (goblin share once, hero share once) | flaky on its own. With `light: 'sun'` stripped from world.js by a route the result is the same, so the failures are not from this work (ai.js was being edited by another builder during the runs) |
| `race` | fail: "weir 3 → 0.3" (mh stays 0.6) and "Den in reach at 0.3" | **same failure with `light: 'sun'` stripped** (A/B via page.route), so it is not from Sun and Shade. Weirs 1-2 pass. For the tide/story owner |
| `darktele` | pass | Act VI 'under' tells |
| `shallowtele` | pass | Act V 'sea': tele 28.7, pool 14.8, cradle 8.1 |
| `ivar` (Act IV 'ember') | as expected (no pass flag) | the dark at 3.5 m, the braziers unshroud, ivarDown, gate open, quest 20 |
| `carry` (Act VI 'under') | pass | FIRE meter, Dim/Out, heroLightR 0 at Out, own light 4 m |

## Shots (looked at)

`docs/act7-briefs/reports/stageB/sun/sun-meadow.jpg` (≈100 KB) and `sun-snow.jpg` (≈85 KB), quality 1, 1280 × 720. In each, the cloud's east edge is a metre west of the hero.
- **Meadow** (the three weirs open, so the grass is bared): the left half of the frame is cooler and greyer, grass and gravel alike. The edge is soft and passes under the hero. Measured against the same frame with no cloud: about −23 grey levels on the left, 0 on the right. It reads as a passing cloud's shadow, not a hole or a stain: the ground's texture shows through and the shadow also falls on the huts' roofs.
- **Snow** (the flank line): the snow and the cliff top on the left are grey-blue, with a broad soft edge across the middle (up to −42 at the darkest column, 0 on the right). Same reading.
- First pass: with the disc drawn at 1.22 × r the visible edge sat about a metre inside the rule's edge. It is now drawn at 1.35 × r.
- `SHOTS=1` finds its snow spot on most seeds. On some fixture seeds no wandering line crosses open snow and that shot reports "no spot".

## Hooks needed in other files (not mine; exact lines)

1. **HUD** (`src/ui/hud.js` or wherever `'hint7'` gets its listener; none exists yet, and forge's `'slide2'` needs it too):
   `on('hint7', (k) => emit('toast', t('hint.' + k)));`
2. **co-op, host snapshot** (`coop.js`, where `o.w` is written): `o.w[7] = Math.round((G.zone?.sunT || 0) * 10);`
   **guest** (where `o.w` is read): `if (G.zone?.sun && o.w[7] != null) setSunT(G.zone, o.w[7] / 10);` (import `setSunT` from `../game/sun7.js`).
   Weir 3's scripted cloud: host `on('cloudStart', (id, t) => send({ k: 'cloudStart', id, t }))`; guest `cloudStart(G.zone, id, t)`.
3. **The Icebound / chough / scorpion code (ai.js)**: read `G.zone.shadeAt?.(x, z)` (already done at ai.js:5648) or import `shadeAt` from light.js. Shade changes for the hero arrive on `'sunShade'`. If the first Icebound wake should carry `hint.sun` instead of the proxy above: `sunHint('sun')` from sun7.js (once per page, so calling both is harmless).
4. **story.js / the bosses**, setting a sky in a sun zone: call `sunAtmos(z, false)` before a scene's own `setAtmosphere` and `sunAtmos(z, true)` (or a row key such as `'thawFight'`) after. Otherwise the shade ease overwrites the scene's sky the next time the hero steps into or out of a cloud.
5. **world.js `leaveZone`** (optional): `sunLeave(G.zone)`. Without it nothing leaks: clearLight takes the pools and enterZone removes `z.extra`. Calling it also resets the music's low-pass and the sky row at once.

## Not done

- U4-U10 (the Icebound's wake, choughs, scorpions, Kelados under a cloud): the creature builders' items. The shade query and the event are ready.
- The ease time is 0.4 s per this task. The contract's choice 21 (0.6 s or a third of a second) is one number: `SUN.ease`.
- The guest side of the clouds' clock is not wired (hook 2). A guest's own clock also runs from 0, so until the hook lands the clouds differ between pages.
- Not run: `perf7` with four clouds; the shots on a real phone; `tarn` with its Dam lines.
- In fixed shade the Mage's fire on an ice block counting as sun (U6) is the Icebound's own timer, not `shadeAt`'s.
