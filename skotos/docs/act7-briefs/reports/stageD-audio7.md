# Stage D — Act VII audio (music and sounds)

Files: `src/audio/audio.js` (additions only; no existing theme, sound, trim or limit changed), new `tools/audio7.mjs`.
Check: `node tools/audio7.mjs` (dev server on 5311; `LIVE=0` skips the real-time pass). Last run: **PASS**, 0 console errors.

## Ids added

### Themes (`Audio.music(id)`)

| id | what it sounds like |
|---|---|
| `thaw` | 6/8 at 104 bpm, G Lydian. Plucked strings strummed on each chord, a shepherd's frame drum on one and four, the water figure (three notes up, three down) running over it; a wooden flute answers every eight bars. No drone. In a fight (`Audio.intensity`) the drum doubles and a low string ostinato enters on G |
| `thawGreen` (the variant) | the same at 88 bpm: the water figure at rest (a note every fourth cell), the drum softer, the flute carrying the tune. Its first four bars are always the tune (`THAW_TUNE`): the lake's letting-down gets "thawGreen's first phrase" by starting it |
| `tarn` | 60 bpm, no beat, A Lydian. Overlapping breaths of wind; single struck glassy notes with long tails; a low struck note on each chord. In a fight a low string on the root and a far drum |
| `tarnGreen` (**invented id**) | `tarn` after the act: the Meltwaters' tune a fifth higher (D Lydian, played a fourth below so the flute is not shrill) over the same wind |
| `kallisto` | 4/4 at 132 bpm, E Dorian. Hand drums, a plucked bass, one low horn with two notes (E, B); no melody. Urgent, never dark |
| `kelados` | 5/4 at 66 bpm, C Mixolydian. A stone struck on the first beat, low brass in fifths, the ice ticking high above; it thins as the plates fall |

### Mood keys (`Audio.mood({...})`)

| key | range | effect |
|---|---|---|
| `race` (contract) | 0-1 | the water figure's speed in `thaw`: 1 = sixteenths (1.2 m), 0.67 = eighths, 0.33 = dotted eighths, 0 = quarters (0.3 m). Send `(level − 0.3) / 0.9`. **When it falls by a step the lantern motif sounds once, in major (G B A D), by itself**: no separate call for a weir |
| `shade` (contract) | 0-1 | a low-pass over `thaw`/`tarn` (and the green variants) under a cloud: 1 closes to 800 Hz. Cleared when another theme starts |
| `rest` (**invented**) | 0/1 | in `kallisto`/`kelados`: one last drum / stone on the beat, then the rest motif (D, B♭, G falling, soft horn) alone, then silence until the next `Audio.music`. Cleared by any theme change |
| `daze` (**invented**) | 0/1 | in `kallisto`: the drums drop out while she is dazed; set 1 at the Daze, 0 at its end |
| `slide` (**invented**, a moment) | 1 | in `tarn`: a slide's warning answered by one low drum |
| `hearth` (exists, a moment) | 1 | in `thaw`/`tarn`: a lookout lit, the hearth motif rising with the major third (G B D) |
| `sub` (exists) | 1 | in `kelados`: taken as a moment, one sub rumble for a tremor |
| `phase` (exists; `hud.js` sets it on `bossPhase`) | 0-2 | `kallisto`: ≥1 adds the fast water figure, 2 adds edge ticks. `kelados`: 0 all layers, 1 the ticking thins, 2 only stone and fifths plus the water figure under them |

### Sounds (`Audio.sfx(id, opts)`) — the contract's 16

| id | what it sounds like |
|---|---|
| `weirWheel` | a wooden wheel turned: the pawl clicking faster, the axle creaking, water beginning to run |
| `raceStep` | the river dropping a step: its rush falling in pitch, gurgles as the stones come up |
| `brookRoar` | the tide's warning in Act VII: water roaring down a gully, far then near, stones knocking in it (3.6 s; no bell, no groan) |
| `corniceCrack` | a dry snap, a second along the lip, the whump of the slab, crumbs |
| `slideRoar` | the slide running: a 3 s rush of snow, hiss at its front, the ground under it |
| `snowThump` | a soft heavy thump and powder settling |
| `iceBlockSplit` | a hard glassy crack through blue ice, the halves knocking apart |
| `iceWake` | ice ticking faster, a rising sung note, drips, then the weight stepping free |
| `choughCall` | a bright falling "chee-ow", often twice |
| `cubCry` | a small high bawl that breaks upward and falls; no growl |
| `tremor` | the ground moving: a sub drop, a rumble, loose stone jumping |
| `sluiceGate` | the gate's thunk, the board scraping up, then water let down the channel |
| `winchChain` | chain links over a drum one by one, the pawl, the timber taking it |
| `lakeOut` | the lake let down: a 5 s outrush, its note sinking, the last of it gurgling |
| `hearthCatch` | the draught taking the tinder, the first crackle, a warm low note |
| `callHorn` | a horn's open fifth (D-A), answered once 1 s after it ends, far off and quieter |

**Invented sounds** (the design names the cue but the contract gives no id):
`callAnswer` (one more far answer: the second and third Name said), `softBell` (one soft bell: a Name learnt; the third
second of the black), `lanternNote` (one plucked note of the lantern motif, for «Ώστε ξύπνησες.»), `lanternWake`
(Isarn's lantern waking: a coal's breath, a small flame, a soft fifth).
**Invented sting:** `Audio.sting('rest')` — the rest motif once on a soft horn, ducking the music under it (the hero's own sleep, where no boss theme is playing).

Reused as the contract says: `bearRoar`, `fireCrackle`, `splash`, `washOut`, `shrine`.

## What the story / world / ui code must call

| when | call | owner |
|---|---|---|
| zone 1 / zone 2 | `ZONES.thaw.music = 'thaw'`, `ZONES.tarn.music = 'tarn'` (already in the contract's rows); after the act (`flags.act7` / `lakeLet`) use `'thawGreen'` / `'tarnGreen'` | world |
| the Race's or the lake's level changes, and on entering the zone | `Audio.mood({ race: clamp((level - 0.3) / 0.9, 0, 1) })` | tide / world |
| a cloud over the hero | `Audio.mood({ shade: 0..1 })` | world (clouds) |
| boss fights | add `kallisto`, `kelados` to `OWN_THEME` in `hud.js:484` so `bossIntro` plays them (the ids are the boss kinds); `bossPhase` already sends `phase` | ui |
| Kallisto dazed / the Daze ends | `Audio.mood({ daze: 1 })` / `({ daze: 0 })` | ai |
| `kallistoRest`, `keladosRest` («Ξεκουράσου.») | `Audio.mood({ rest: 1 })` while the boss theme still plays; start the zone's theme when the scene ends. `hud.js:497` (`kill`) starts the zone theme and the `victory` sting: these two bosses are spared, so skip both for them | story / ui |
| a tremor (Kelados's slam) | `Audio.sfx('tremor', { x, z })` and `Audio.mood({ sub: 1 })` | ai |
| a slide's warning in `tarn` | `Audio.sfx('corniceCrack', …)` and `Audio.mood({ slide: 1 })`; the run `slideRoar`, the foot `snowThump` | forge |
| the tide's warning | `hud.js:512` still plays `iceGroan` for `z.act7`: change to `Audio.sfx(HAZ7.roarSfx)` = `'brookRoar'` (and `tide.js:143` must not ring `tideBell`) | ui / tide |
| a lookout lit | `Audio.sfx('hearthCatch', { x, z })` and `Audio.mood({ hearth: 1 })` | story |
| the Call | `Audio.sfx('callHorn')`; for a second and third Name, `Audio.sfx('callAnswer')` about 3.4 s and 4.5 s after the horn (the first answer is inside `callHorn`, at 2.3 s) | names7 |
| a Name learnt | `Audio.sfx('softBell')` | names7 |
| the lake let down | `Audio.sfx('lakeOut')`, then `Audio.music('thawGreen')` | story |
| home: the child's good night | `Audio.sting('rest')` | story |
| home: the lantern | `Audio.sfx('lanternWake')` at `d.home7.3` | story |
| the black | `Audio.music(null)` 2.5 s before it (the cross-fade) so the four seconds are silence; `Audio.sfx('softBell')` at the third second; on `d.child7.wake` `Audio.sfx('lanternNote')`, then `Audio.music('town')` (`boot.js:368` already does on `actClosed`). `story.js:592` plays `'victory'` for an act with no theme of its own: Act VII must not (no fanfare) | story |

## Measurements (`node tools/audio7.mjs`, last run)

Offline: 12 s through the engine's own graph at music volume 0.5, mean of two renders (the scores are generative; a
single render moves about ±1 dB). Δ is against `pass`. "raw peak" is before the compressor and limiter.

| kind | id | rms dB | Δ dB | peak | raw peak | result |
|---|---|---|---|---|---|---|
| ref | pass | -18.9 | | 0.509 | 0.30 | |
| ref | forest | -16.5 | +2.4 | 0.614 | 0.32 | |
| old | town | -19.5 | -0.6 | 0.496 | 0.33 | |
| old | drained | -20.9 | -2.0 | 0.333 | 0.23 | |
| old | boss | -18.7 | +0.2 | 0.682 | 0.47 | |
| theme | thaw | -20.4 | -1.5 | 0.723 | 0.42 | ok |
| theme | thawGreen | -18.0 | +0.9 | 0.722 | 0.54 | ok |
| theme | tarn | -20.8 | -1.9 | 0.574 | 0.44 | ok |
| theme | tarnGreen | -17.8 | +1.1 | 0.596 | 0.37 | ok |
| theme | kallisto | -19.3 | -0.4 | 0.736 | 0.53 | ok |
| theme | kelados | -20.8 | -1.9 | 0.725 | 0.61 | ok |
| variant | thaw race 1 (spate) | -19.5 | -0.6 | 0.698 | 0.52 | ok |
| variant | thaw race 1, fight | -18.3 | +0.6 | 0.692 | 0.52 | ok |
| variant | tarn, fight | -18.5 | +0.4 | 0.753 | 0.66 | ok |
| variant | kallisto phase 2 / 3 | -18.9 / -19.0 | -0.0 / -0.1 | 0.735 | 0.71 | ok |
| variant | kallisto dazed | -21.2 | -2.3 | 0.621 | 0.43 | ok |
| variant | kelados phase 2 / 3 | -20.8 / -20.4 | -1.9 / -1.5 | 0.763 | 0.69 | ok |
| rest | kallisto / kelados with `rest` | motif heard, then silence (last 3 s of 14 below -66 dB) | | 0.157 / 0.313 | | ok |

Sounds (8 s offline; "loud" = loudest 50 ms window, the measure `TRIM` uses; existing sounds run -9 to -23 dB):

| id | loud dB | peak | | id | loud dB | peak |
|---|---|---|---|---|---|---|
| weirWheel | -13.4 | 0.542 | | cubCry | -15.1 | 0.440 |
| raceStep | -12.2 | 0.630 | | tremor | -9.4 | 0.670 |
| brookRoar | -9.9 | 0.793 | | sluiceGate | -12.0 | 0.599 |
| corniceCrack | -10.1 | 0.726 | | winchChain | -19.6 | 0.719 |
| slideRoar | -10.1 | 0.783 | | lakeOut | -9.7 | 0.824 |
| snowThump | -12.3 | 0.520 | | hearthCatch | -14.7 | 0.608 |
| iceBlockSplit | -17.0 | 0.609 | | callHorn | -16.6 | 0.388 |
| iceWake | -12.2 | 0.606 | | callAnswer | -23.2 | 0.161 |
| choughCall | -20.0 | 0.373 | | softBell | -19.4 | 0.287 |
| lanternNote | -14.1 | 0.372 | | lanternWake | -19.0 | 0.215 |
| sting `rest` | -17.1 | 0.263 | | | | |

Live (real-time, an analyser on the output, 12 s each): pass -18.9 dB; thaw -0.5, thawGreen +0.9, tarn -1.9, tarnGreen
+0.3, kallisto -1.0, kelados -2.0 dB against it; all peaks under 0.73. `town` and `drained` still start (8 and 5 voices
sounding). Every new sound and the sting heard once live. Unknown sfx / sting / theme / mood ids: silent, no throw, the
theme playing unchanged. Console errors: 0.

## Notes

- `setTheme` now also clears `rest`, `daze` and (outside the two sunlit zones) `shade`. No existing key or theme is touched.
- Not judged by ear: everything here is measured (level, peak, silence), not listened to. The owner should hear `thaw`,
  `kallisto` and `brookRoar` once before the act ships.
- `shade` is applied by the live engine's mood pass (`applyMood`); it was not measured offline.
