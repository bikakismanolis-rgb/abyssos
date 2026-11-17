# Act VII design, part 4: the look, engine work, assets, production plan, risks

Written to `docs/act7-briefs/decisions.md` (binding), on the production proposal as the base and judge 2's §5 as the
skeleton. Every file and line cited was opened in this tree on 17 November 2026. Where the source says something other
than the proposal or the judges said, this part follows the source and says so. The story, the zones and their enemies
and bosses, and the mechanics, progression and co-op rules are the other three parts; this part only names what it
needs from them.

**Six things the source says that the briefs did not** (each is used below):

1. **On a phone the game draws none of Act V's water or ground extras.** `seaMat` returns `safeSea` whenever
   `R.mobile` is set (`sea.js:215`, `:655-675`): flat colour by depth, no texture read, no edge line. The ground's
   glint, wet rim, aurora and edge terms are all switched off by the same flag (`build.js:1498-1499`). So "SEA_MELT" and
   "G_WET shows where the water will come" are desktop pictures. The phone needs its own two colours and its own
   deep-water step, and perf7, which runs with `isMobile: true` (`scenario.mjs:4028`), measures the phone path.
2. **`setAutumn` is not only a ground blend.** It also puts out the seed-lanterns and thins the ambient effects
   (`build.js:1922-1926`; `gfx.js:232`, `:243`; `fx.js:442-456`). The receding snow must have its own uniform, not
   `WIND.uAutumn`.
3. **Entering `thaw` unloads the `deep` and `cinder` packs** (`unload.js:28`, `:57-63`), and the boot set has no scree
   and no snow layer (`src/assets/env/`: bark, blocks, cobble, flags, leaves, mcobble, mud, trail, wall). On a cold
   start `thaw` has no real snow texture unless it loads `rime`.
4. **The unload already covers a seventh act:** the test is `act < 5` (`unload.js:57`). Nothing to change there.
5. **Quality 0 has no shadow map at all** (`gfx.js:70`, `:97`). Daylight at quality 0 is the sun's shading without
   cast shadows, with the blob shadows under actors (`actors.js:87-91`).
6. **More `act6` gates than the trap list names:** `actors.js:172`, `combat.js:166`, `:288`, `hud.js:512-513`,
   `world.js:127`, `:283`, `:440`, `coop.js:598`, `:651`, `:956`, `:1006`, `:1104`, `:1110`, `:1148`. They are in
   item 1 below.

---

## The look: daylight

### What the engine draws today

- **Lights.** One hemisphere light, one directional light (called the moon), the hero's point light, and a fixed pool
  of 3 / 6 / 8 point lights by quality (`gfx.js:26`, `:92-116`). The count is the same in every zone, so a day costs no
  light.
- **The directional light's shadow.** PCF, a map of 1024 at quality 1 and 2048 at quality 2 (a phone keeps 1024 at
  both), a box of 40 m that follows the hero, none at quality 0 (`gfx.js:27`, `:70`, `:97-104`, `:319-322`). It is
  redrawn every frame wherever `moonI > 0` (`gfx.js:177-180`), which is the town, the forest, the Pass, the Weeping
  Woods, the Field and the coast today.
- **The light's direction is fixed in two places:** `(-12, 30, 8)` at set-up and `(c.x - 12, 30, c.z + 6)` each frame
  (`gfx.js:96`, `:321`).
- **An atmosphere is a row of numbers** (`atmos.js:7-62`) applied by `setAtmosphere` (`gfx.js:170-192`): fog colour and
  density, the two hemisphere colours and its strength, the sun's colour and strength, exposure, the hero's light, the
  zoom. The scene's background is the fog colour (`gfx.js:172`): there is no sky.
- **The brightest shipped row is the Weeping Woods:** hemisphere 1.05 and sun 1.55 at exposure 1.35 over a dark brown
  fog (`atmos.js:14`). Hemisphere plus sun, times exposure, is 3.51 there.
- **Tells and decals are additive:** telegraphs (`fx.js:322`), impact rings (`fx.js:226`), loot beams
  (`pickups.js:76`), the light ring (`build.js:3118`). Two shipped cures exist for bright or dark ground: the
  premultiplied dark-cored telegraph (TELE_DARK, `fx.js:301-321`) and the light ring's screen blend with a
  proportional fill on snow (`build.js:3120-3157`, a blend-state switch at `:3157`, no recompile).

### What changes

**The new rows** (starting numbers; the stage-0 gate tunes them):

| key | `thaw` (spring morning) | `tarn` (noon snowfield) | the Weeping Woods, for scale |
|---|---|---|---|
| fog, density | 0x9fb6c6, 0.012 | 0xc6d6e6, 0.010 | 0x33280f, 0.024 |
| sky / ground (hemisphere) | 0xbcd6f2 / 0x4c5e38 | 0xd2e6ff / 0xa2b2ca | 0xd8b070 / 0x2e200e |
| hemisphere | 1.25 | 1.1 | 1.05 |
| sun colour, strength | 0xfff0d2, 2.3 | 0xfff8ea, 2.1 | 0xffd898, 1.55 |
| exposure | 1.0 | 0.92 | 1.35 |
| (hemisphere + sun) × exposure | 3.55 | 2.94 | 3.51 |
| hero's light (`heroI`) | 0 | 0 | 22 |
| zoom | 1.05 | 1.05 | 1.05 |
| `sun` (new key) | [-18, 22, 10], 47° high | [-6, 32, 4], 77° high | fixed, 64° |

- **The amount of light is not new.** `thaw` is the Weeping Woods' total at a lower exposure, and `tarn` is under the
  town's (3.05). **What is new is a pale fog and pale ground**, which is why the risk is in the effects and not in the
  lights.
- **Derived rows:** `thawShade` and `tarnShade` (hemisphere 0.95, sun 1.1, a greyer sky; eased to over a third of a
  second with `mixAtmos`, `atmos.js:65-74`, while the hero stands under a cloud), `thawCine` and `tarnCine` (density
  0.006 and 0.005), `thawFight` and `tarnFight` (zoom 1.2 and 1.25), `tarnGold` for the ending (sun 0xffd49a at 1.7,
  sky 0xe8c8a0).
- **`a.sun`.** `setAtmosphere` keeps the row's offset in `R.sunOff`, and the two fixed places read it (`gfx.js:96`,
  `:321`). A row without the key keeps today's offset, so no shipped zone moves. `mixAtmos` copies anything that is not
  a number whole (`atmos.js:69`), so a mix never swings the sun: the shade rows carry the same `sun` as their zone.
- **`heroI: 0` is kept as 0** (`a.heroI ?? 30`, `gfx.js:183`). The hero's light stays in the scene at no strength; it
  saves nothing and costs nothing.
- **Exposure 0.92 on snow** follows Act V's own finding that snow gives back four times what ash does
  (`atmos.js:30-32`).
- **Fog.** At the play camera (pitch 0.95, a 38° lens, `gfx.js:21`, `:84`) the top of the screen meets the ground
  about 17 m away, so pale fog hides nothing in play. In a cine at density 0.006 the far plane at 160 m is still 40%
  visible, so each cine is framed against rising walls; half a day a cine is in the story item.

**Ground layers** (`ground7(type)`, beside `ground5` and `ground6`, `build.js:1144-1170`):

| slot | `thaw` | `tarn` |
|---|---|---|
| A | `leaves` (boot) under `hueA` [0.62, 1.0, 0.5], or `melt/meadow` if the optional pack exists | `rime/snow` |
| B | `mud` (boot). Not scree: no scree layer is loaded here (fact 3) | `rime/ice`, and `rime/shore` on the shore |
| P | `trail` (boot) | `rime/snowTrod` |
| W | `wall` (boot) at 4.4 | `rime/seaCliff` |
| thaw slot | a white `fake` of A (the `ground5` way, `build.js:1154`, `:1633`) | `leaves` tinted green, or `melt/meadow`, growing in round the lake in the `let` reading |

- Each slot is a `lay4` chain down to a boot layer, as `ground5` and `ground6` are.
- **The thaw blend.** Today the extra layer is hard-wired: `ENV.layers.dryleaf`, driven by `WIND.uAutumn`
  (`build.js:1491`), mixed in by a noise mask and kept off the trodden path (`build.js:1598-1604`). Item 4 lets a
  ground config name the layer (`dryLayer`), its tint and **its own uniform** (`WIND.uThaw`, new), and
  `setThaw(k)` sets that uniform and nothing else (fact 2). `k`: 0.65 on first arrival, 0.45 / 0.3 / 0.15 after each
  weir, 0.05 in the `green` reading. It is still a uniform branch (`if (uAut > 0.001)`, `build.js:1600`), so it costs
  one more layer read wherever it is on, which is the Weeping Woods' cost.
- **Snow on props.** `WIND.uSnow` whitens the tops of trees and rocks in proportion to its value (`build.js:436-438`)
  and is set per zone (`world.js:282`). `tarn` sets 1. `thaw` sets `min(0.45, k)` so the pines lose their snow with
  the weirs and the value stays under the 0.5 at which the light ring changes blend (`build.js:3157`).
- **If the white fake reads as paint and not as snow** in `thaw` (stage A's look check), `zonePacks('thaw')` becomes
  `['rime']` and the slot takes `rime/snow`. It costs 41.5 MB of phone texture and no day; `thaw` then loads 58 MB
  cold, still under the 75 MB gate.
- **Defines.** G_AUR, G_WIN and G_EDGE off in both zones; G_GLINT on for `tarn` only; G_WET on (desktop, quality 1 and
  up: `build.js:1499`). **On a phone none of them is compiled** (fact 1), so no rule may depend on the wet rim.

**The meltwater.**

- Desktop: a define **SEA_MELT** beside SEA_BLACK in `seaMat` (`sea.js:211-223`, the cache key at `:213`): turquoise
  shallows to deep blue, the sun's glint kept, no aurora term, no light paths, no slush crust. It is its own program,
  never a uniform branch.
- **Phone: `safeSea` gains a melt pair of colours and one `step` at 0.45 m of depth** (`sea.js:655-675`; today its
  colours are fixed and near black, `:672`). No texture read, no derivative and no loop are added, which is the rule
  that function was written to after the owner's phone froze on the coast (`sea.js:650-654`). Its own cache key
  (`'safeSeaM'`).
- The Race's and the lake's own level is drawn through `uBayLevel`, already in both paths (`sea.js:239`, `:659`).
- `SEA.sky` stays off (`world.js:283`).

**Tells on bright ground** (the two shipped cures, keyed on the zone's light kind):

| what | today | in a `'sun'` zone |
|---|---|---|
| telegraphs (circle, cone, line) | additive, `fx.js:322` | a **'day' material**: the same colour as a rim and a front, over a normal-blended dark under-edge and a 30% dark fill, premultiplied in one pass (TELE_DARK's blend state, `fx.js:321`). Chosen inside `teleMat` from a module flag set at `zoneEnter`, **not from the colour**, so nothing changes on the wire: each page draws the mirror's telegraph in its own zone's material |
| the three lane colours | | white (snow), blue (sluice water), the boss's red: each keeps its colour in the rim; the dark edge is what reads on snow |
| impact rings | additive, `fx.js:226` | the same dark under-ring at 25% alpha, quality 1 and up; at quality 0 the ring's alpha × 1.6 |
| the light ring decal | additive; screen blend when `uSnow > 0.5` | not drawn (no ring in a 'sun' zone: `heroLightR` returns 0 for the kind) |
| lookout hearths' pools, runes, marks | additive discs | the screen blend and proportional fill of `build.js:3134-3157`, switched by the light kind as well as by `uSnow` |
| loot beams | two additive planes, `pickups.js:74-78` | a third, normal-blended plane behind them: a dark core at 35% alpha, 1.3 × the beam's width. Legendary beams (14 m high) are the test case on snow |
| damage numbers, names, bars | the page's own (DOM) | unchanged; they gain a 1 px dark text shadow under `body.day` |

**Cloud shade discs.** Three or four draped discs of r 9-14 m, normal-blended, a soft grey-blue at about 0.3 alpha.
They use the dark-cored disc's shader and blend state (`light.js:462-471`) with their own colour and core strength:
the shipped core is 82% violet-black (`uCoreA` 0.82, `light.js:471`) and would read as a hole. Two at quality 0.
`B.drape` runs when a pool moves (`light.js:335`); four discs on a mostly flat floor are within what the Carried Fire's
pools already cost.

**What is not drawn:** a sky in play; grass blades; water with height (the lake's thread in the last cine is a sprite
strip); reflections; any full-screen transparent layer; cast shadows at quality 0; a second shadow map; god rays;
cloud sprites overhead; a rainbow as anything but one arc sprite; the wet rim, the glint and the detailed water on a
phone.

### The stage-0 look gate (`day0`)

Run before any Act VII system exists. The only code it needs is data and three lines: the new rows in `atmos.js`,
the `a.sun` read in `gfx.js`, and the 'day' telegraph material behind a debug switch. Nothing in the game reads them.

- **Zones, by the world viewer's atmosphere override** (`?world=<zone>&atmos=<row>`, `viewer.js:168`, `:185`):
  - `forest` under `ATMOS.thaw`: grass, trees, tree shadows;
  - `pass` under `ATMOS.thaw` with `uSnow` 0.45: rock, a trail, patchy snow;
  - `farlight` under `ATMOS.tarn`: the worst case, snow and ice at noon. **This is also lesson 5's shot: does it read
    as Act V?**
  - `coast` under `ATMOS.tarn`: water beside snow.
- **In frame at the play camera:** three monsters (a wolf, a goblin, a troll), a red telegraph circle and a white
  line in the 'day' material beside the same two in the additive one, a light pool, a rare and a legendary loot beam,
  a floating damage number.
- **Qualities 0 and 1**, at 915 × 412 with a pixel ratio of 1.5 and `isMobile` (perf6's phone emulation), so the phone
  paths are the ones shot. 16 shots.
- **What passes, in numbers** (luminance sampled from the shot, as `darktele` and `shallowtele` do):
  1. the 'day' telegraph's rim against the ground beside it: a contrast of 3 : 1 or more on grass and on snow, at
     both qualities; the additive one is recorded beside it;
  2. the ground's mean luminance at or under 0.80 of white on snow and 0.55 on grass, so numbers, beams and rims keep
     headroom ("the brightest thing on screen is never the ground");
  3. each monster's body against the ground: a luminance difference of 0.15 or more;
  4. no clipped area over 2% of the screen;
  5. the legendary beam's edge found by the same contrast test on snow.
- **And by eye:** the lead, and the owner if he will look (four of the sixteen, on his phone), answer two questions:
  "is this day?" and "is `farlight` under the new row a different place from Act V?"
- **`day0` carries `stage: '0', until: 'B'`.** `daytele` replaces it at G2 on the real zones, and G2 fails while
  `day0` still exists.

**The fallback: Act III's sun over haze.** If the telegraph or the body test fails at either quality after one day of
tuning, both rows keep their sun, hemisphere and exposure and take a dark haze: fog 0x2a3440 at density 0.014 for
`thaw`, 0x34404e at 0.012 for `tarn`. That is the Weeping Woods' recipe (`atmos.js:14`), shipped since Act III. No
item, zone or day in the plan changes; the 'day' telegraph stays because it also helps on the haze. If the lesson-5
question fails for `tarn`, the zones writer's reading gains bare rock and scree in slot B and the `let` reading's
green rim from the first visit; that is a layout note, not engine work.

---

## Engine work

In dependency order. Days are focused days for one agent who knows the code. Every estimate starts from judge 2's §5
and is corrected where the source asked for it.

| # | item | files and functions | days |
|---|---|---|---|
| 0 | **Stage 0** (Production plan) | docs, `atmos.js`, `gfx.js`, `fx.js`, `tools/scenario.mjs` | 2.5-3 |
| 1 | **Plumbing for a seventh act, and the trap fixes** (list below) | world, story, boot, state, panels, hud, wake, creatures, data, forge, map, tide, coop, actors, combat, env, screens, viewer | 2.5-3 |
| 2 | **`gen7.js`**, `genThaw` and `genTarn` with two readings each, and `tools/check-act7.mjs`. First, gen6's private helpers both need (`finish6`, `heights6`, `refuges`, `spotNear`, `lightUp`: `gen6.js:97-201`) move to `genlib.js`, with `check-act6` and a seed-parity run in the same commit. If anything moves, gen7 copies them and gen6 stays as it is | gen7, genlib, gen6, tools | 6.5-7.5 |
| 3 | **Daylight:** the rows; `a.sun`; the 'day' telegraph material and its zone flag; the ring, decal and beam variants; `body.day`; the two fx ambients; smoke on the peaks by day (`farFire`, `world.js:79-90`, with a grey sprite) | atmos, gfx (`setAtmosphere`, `updateCamera`), fx (`teleMat`, the ring), build (`lightRing`), pickups (`dropItem`), world | 2.5-3 |
| 4 | **`ground7`, `dryLayer`, `WIND.uThaw`, `setThaw(k)`** with its easing; `uSnow` by zone and thaw | build (`groundMat` `:1476-1500`, `:1598-1604`), world (`:282`) | 1.25-1.5 |
| 5 | **SEA_MELT, and the melt colours in `safeSea`** | sea (`seaMat`, `safeSea`) | 0.75-1 |
| 6 | **`build7.js`:** `act7Prop` (weir wheel, log-jam, winch, lever, lookout hearth, ice block, cornice, snow tongue, den mouth, piers, flower cards, the rainbow arc), `act7Level`, the cloud disc, Kelados's ice plates, snow cap and pine | build7, light (disc colours) | 3-3.5 |
| 7 | **The Race:** the own-level channel from flags (`resetTide(z, { mere })`, `tide.js:88-95`; `mereTick`, `:174-181`); `haz()` given the act's row | tide, world, data | 1 |
| 8 | **The Slide:** an armed branch in `tickFlues`' idle state (`forge.js:60-90`); a look table per flue kind where the colours are literals today; monsters at × 1 (`BREATH.monsters` is 0.25, `forge.js:28`, `:122`); every hero struck, not only the page's own; **the host fires it** (flues are not in the protocol and start at a random phase on each page, `forge.js:36`); the 'loud' event from one helper under the 16 `vaultOn()` sites | forge, skills, skillsx, ai, coop | 2-2.5 |
| 9 | **Sun and Shade:** the 'sun' kind's branches in `lightAt` (`light.js:58`), `heroLightR` (`:109`), `baseRing` (`:623`) and `tickLight` (`:553-619`); the clouds' ticker on the host's zone clock; the wake input | light, ai, world | 2-2.5 |
| 10 | **Enemies:** the new defs and packs, one heavy telegraphed move each priced from `HAZ7`, the class hooks, `cast7` | data, ai, actors | 3.5-4 |
| 11 | **`balance-act.mjs` for Act VII:** `under30S`, `worst3`, heavy blows by move, the share of kills by terrain; the bot's lessons; **zone danger measured here** | tools | 2-2.5 |
| 12 | **Kallisto and Kelados** on the boss law; run C | ai, data, actors, build7 | 6-7 |
| 13 | **The Names (seven),** the panel tab, the Call at a lookout hearth, the blow cap's table; run D | progression, progpanel, stats, world, coop | 5-6 |
| 14 | **Lookouts, the hold event, ranks, the far fires' colours; two echoes; Rested** | world, story, data, stats, save | 3 |
| 15 | **Story and text** (the story part's beats and lines; two proofreaders) | story, text, world, actors | 6-7 |
| 16 | **Audio:** four themes, one variant, about 14 sounds. The tide's bell is `iceGroan` for Act VI only (`hud.js:512`): Act VII's roar is a new sound on the same event | audio, hud | 2-2.5 |
| 17 | **Co-op protocol 6** | coop, tools/coop.mjs | 2-2.5 |
| 18 | **Saves:** the migration, `heroFits`, `SAVE_FMT` 2 in the last commit, `save16` both ways | save, boot, state, data | 0.75 |
| 19 | **Scenarios, fixtures, `perf7`, `mem7`, the regress sets, `--stale`** | tools | 4-4.5 |
| 20 | **Release** | lead | 2.5-3 |
| | **Total** | | **61-71** |

### Item 1 in full

**The plumbing** (each beside its Act VI sibling):

- `world.js`: `ZONES.thaw` and `ZONES.tarn` (`act: 7`, `pack: 'melt'`, `light: 'sun'`; `:42-64`);
  `READY.melt = { folk: [], creatures: 'act7' }` (`:100`); **`zonePacks` is hard-coded for Act VI** (`act === 6 ?
  ['rime', p]`, `:101`): it gains `tarn → ['rime']` and `thaw → []`, plus `'melt'` on each only if that pack is ever
  built; the generator dispatch (`:155-158`); `act7Layout`, `act7Zone` (`:161-162`, `:225-226`), `act7Enter` (`:294-295`);
  **`seedKey` gives a per-difficulty seed only to Acts V and VI by name** (`:127`); `uSnow` and `heavyZone` (`:282`,
  `:298`); the default pack table falls back to `PACKS.sunkenCrew` for `act === 6` only (`:440`); `ECHO_PROMPT`
  (`:657`).
- `act7Zone` sets `z.water = true` and **not** `z.cold`. `z.water` is what turns on the tide dial (`hud.js:251`),
  the wash-out (`tide.js:120`), swimmers (`ai.js:119`) and dormant packs by table (`actors.js:234`). It also runs
  `shadeTick` (`ai.js:171`) and `placeCasks` (`sap.js:169`): **both must be read at stage A to confirm they are
  harmless in a 'sun' zone** (not opened for this part).
- `story.js`: the quest clamp 39 → 47 (`:35`); `actComplete(7)` (`:579-587`); `offerBoons`.
- `state.js:29` (`act7: -1`), `boot.js:211-212` (the migration), `panels.js:217-221` (the waypoint lists),
  `screens.js:69` (`game.sub7`), `wake.js:13` (`WAKE`), `viewer.js:168` (the world viewer).
- `creatures.js`: `ACT_FILES.act7 = ['bear', 'golem', 'worm', 'skua']` and the `CAST` rows (`:17-45`). With that row
  the unload of groups act2 and act3 keeps those four files (`unload.js:74`; `creatures.js:73-78`).
- `data.js`: `HAZ7`, and `actHaz` (`:447`, which knows only 5 and 6).
- `unload.js`: **nothing.** `(ZONES[id]?.act || 0) < 5` already takes a seventh act (`:57`).

**The traps of `decisions.md`, each with its fix:**

| trap | where | fix |
|---|---|---|
| flues silent for any hero with `crownUnmade` | `forge.js:63` | the test becomes "in the Forge's zone and `crownUnmade`" |
| a shard's cell closes low: sight, arrows and a flue's front pass over it | `forge.js:278` with `map.js:43` (`change(open, close, low = true)`), `map.js:25-29` | rock and ice-block shards close with `low = false`; icicles keep `true` |
| the tide reads `HAZ6` for any layout with its own clock | `tide.js:51-60` | the row comes from `actHaz(ZONES[id].act)` |
| the Mere's level and the cells' ops are sent and accepted only below the ice | `coop.js:571`, `:650`, `:846-849`, and on the guest `:1110`, `:1148` | one zone flag, `z.cells` (set by `act6Zone` and `act7Zone`), read at all seven |
| the gust clock is the Farthest Light's and assumes 40 s on both sides | `world.js:1603`, `coop.js:648` | not used by Act VII. The period becomes a field of `z.gust` read on both sides, and the clouds get their own clock (item 9) |
| stale comments | `world.js:99`, `data.js:60-62` | rewritten: the act6 row exists since v22.1; Act VI shipped at format 1 and 2 comes with Act VII |
| `PACK_ORDER` lists `silt` with no pack | `env.js:13` | a comment saying it works by `ground6`'s fallback chain; `'melt'` is appended **only** if the optional pack is built |

**More of the same kind, found for this part** (same item, same days):

| where | what it does today | fix |
|---|---|---|
| `actors.js:172` | the creatures' blow row: `HAZ6` if `z.act6`, `HAZ5` if `z.act5`, else none | `actHaz` by the zone's act, so `HAZ7`'s row is read |
| `combat.js:166` | the 11% cap on a boss's blow, Act VI only | left as it is. Act VII's boss blows are shares of life from `HAZ7` (the boss law); the contract says so |
| `combat.js:288` | Revealed's factor from `HAZ6` or `HAZ5` | `actHaz` |
| `hud.js:512-513` | the tide's bell and mood only if `z.act6` | by `z.water`, the sound from the zone |
| `coop.js:598`, `:956` | the world digest carries `act1..act6` | `act7` added (protocol 6) |
| `coop.js:1006` | presence by act, 3-6 | `act7Presence` |
| `coop.js:651`, `:1104` | the Names from Above | untouched: Act VI's own |
| `boot.js:289` | a phone warms its shaders before an Act V zone only | read at stage A: whether `tarn` needs the same (not opened beyond the line) |

---

## Assets

### What is shipped (listed from `src/assets/` on 17 November)

- **Boot:** `env.glb` and nine `env/` layers, `trees.glb`, `village.glb`, the kits (`dungeon.glb`, `town.glb`,
  `grave.glb`), `people.glb`, Act I's eight creature files.
- **Packs:** `deep`, `wood`, `cinder`, `rime` (each a `.glb` and a layer folder). `rime/` holds six layers: ice,
  planks, seaCliff, shore, snow, snowTrod. **There is no `silt` and no `melt`.**
- **People sets:** `folk`, `grove`, `ash`, `frost`.
- **Creatures:** 26 files. No `ketos`, no `falselight`, no scorpion.

### What loads in each zone

| | `thaw` | `tarn` |
|---|---|---|
| packs (`zonePacks`) | none: every prop and layer is boot-loaded | `rime` |
| kits | dungeon and town (boot): steps, sills, flagstones, piers | the same |
| folk sets (`READY.melt.folk`) | none. Halda is `people.glb`'s smith; the keepers are its villagers | none |
| creature group `act7` | `bear.glb` (7,508 triangles, eleven clips), `golem.glb` (16,061, nine clips), `worm.glb` (1,886), `skua.glb` (2,512); measured here with `tools/glbinfo.mjs` | the same |
| boot bodies used | wolf, goblin, troll, spider | the same |
| stand-ins (a cold session before the group lands) | every new kind's chain ends in a boot body (`actors.js:49-69`), asserted by `cast7` | |

Not loaded in either zone: `deep`, `wood`, `cinder`, `folk`, `grove`, `ash`, `frost`. The first six are let go on the
way in if a long session holds them (`unload.js:28`); `frost` is not in the unload's list and stays if it was loaded.

### Memory at a cold start (phone GPU texture on top of boot)

By the engine brief's rule (RGBA8 × 1.33, maps of 1024 halved; `engine.md:501`), from `glbinfo`'s map sizes.

| | into `thaw` | into `tarn` |
|---|---|---|
| packs | 0 | rime: props 24.75 + layers 16.75 = 41.5 (Act VI's measured figure) |
| people sets | 0 | 0 |
| group act7: bear 9.0, golem 4.2, worm 1.4, skua 1.4 | 16.0 | 16.0 |
| code textures (cloud disc, smoke, rainbow, a 256 flower atlas) | 0.5 | 0.5 |
| **plan of record** | **about 16.5 MB** | **about 58 MB** |
| if `thaw` must load `rime` for its snow (the look fallback) | about 58 MB | |
| with the optional `melt` pack (two layers, 5.6) | about 22 MB | about 63.5 MB |
| the frame's bar | 110 MB | 110 MB |
| **this act's gate, `mem7`** | **≤ 75 MB** | **≤ 75 MB** |
| Act VI, measured at G1 | 69 MB | |

- A session that played Act VI first already holds `rime`, so it adds 16.5 MB.
- **`mem7`** is `unload6`'s cold-start half given its own name (`scenario.mjs:3791-3845`: a WebGL hook counts the GPU
  bytes of every texture the registries hold, each uploaded, at quality 1). It makes one cold start into each zone
  from `fx7_new` and `fx7_mid` and reports the bytes by owner. `unload6`'s owner table lists creature groups up to
  act5 (`scenario.mjs:3828`): `mem7` adds act6 and act7, or its creature line reads as unowned.
- `unload6` itself gains one leg: Pass → `thaw` → Pass, since entering `thaw` lets `deep` go and the Pass must come
  back textured.

### The perf plan

- **`perf7` is `perf6`** (`scenario.mjs:3964-4265`, `tools/perf6-terms.mjs`) at five new spots: quality 1, 915 × 412 at
  a pixel ratio of 1.5, `isMobile`, adaptive resolution pinned, the Field of Ash drawn in the same cycle, the same
  three terms (`vsField`, `world`, `crowd`).
  1. the Drowned Meadow at the brooks' top, 25 actors: the tree-shadow worst case;
  2. the Chutes with two slides running, 20 actors;
  3. the Den in Kallisto's second phase: water, a slide, falling rocks;
  4. the Snowfield with four clouds, 20 actors;
  5. the Dam in Kelados's third phase: a sluice sheet and both chutes.
- **Bar: `vsField` and `world` ≤ 1.00 of the Field at quality 1 at every spot.** Quality 0 is measured as a floor (no
  slower than quality 1 + 5%). At the end of stage A with stand-in packs, again at G2 with the real ones.
- **For reference:** `perf6` at release measured 0.62-0.94 (`stageE-report.md`), and the Farthest Light, the same
  ground chain as `tarn`, measured 0.92-0.99 in Act V. The estimate for Act VII is 0.85-1.0; it is an estimate until
  `perf7` runs.
- **Because the run is phone-emulated, it measures `safeSea` and the ground without its extras** (fact 1). So one
  desktop pass is added at G1: the five spots at quality 2, 1280 × 720, not mobile, held to ≤ 1.15 of the Field drawn
  the same way. That is where SEA_MELT, G_WET and G_GLINT are actually paid.
- **Savings are defines, never uniform branches.** The one uniform branch in the plan is the thaw blend, inherited.
  If spot 1 or 4 is over the bar, the blend becomes a define for the `green` and `let` readings (where `k` is fixed).
- **`heavyZone`.** A phone draws Act V's zones at no more than 0.6 of its resolution, because water, ice and snow over
  the whole screen took the owner's phone's GPU down (`gfx.js:141-151`; set for `act === 5` only, `world.js:298`).
  **`tarn` is that picture, so `heavyZone` is on for `tarn` from the first build and off for `thaw`.** It comes off
  `tarn` only if the owner's phone holds the five spots without it, and that run is asked for at G1, not at G5.
- **Known unknowns and their fallbacks:** tree shadows in the Meadow (fallback: the trees stop casting at quality 1,
  blob shadows only); flower cards (off at quality 0, halved at quality 1); the cloud discs' drape (two discs).
- A full `perf6` run takes about 65 minutes on the gate machine (`scenario.mjs:4017`); `perf7` is budgeted the same
  and always runs alone.

### Asset audit

- **Nothing is downloaded on the plan of record.** Act VI's two gated downloads never arrived, and their sources
  (`/tmp/claude-0/sf/act6/`) are gone from this container.
- bear, golem, worm, skua: ok, shipped and credited in Acts II, III and V. Look gates at stage 0: Kallisto at × 2.1
  (`?cview&only=bear&scales=2.1`) and Kelados at × 2.3 with a grey tint, beside the 1.8 m reference at the play
  camera. Fallbacks: × 1.8 for the bear if her face blurs; for Kelados the judge's rule (a new body only if the gate
  says "the Stonewarden again" **and** a clean file is in hand that day).
- wolf, goblin, troll, spider, `people.glb`, env, trees, village, kits, `rime`: ok, shipped.
- **Optional, not on the plan: a `melt` ground pack** (`tools/pack-melt.mjs`, two CC0 layers at 1024 / 512 from Poly
  Haven or ambientCG: a meadow for slot A and a wet streambed for the bared shore).
  - Adds: about 0.5 MB raw (about 0.7 MiB of artifact, on 142 files and 64 MB), 5.6 MB of phone texture, 0.5 d, a
    `'melt'` entry in `PACK_ORDER`, and credits in the four places.
  - **Its gate, all four or it is not built:** the licence page read on the day; each layer shot on a flat test
    ground at the play camera at quality 0 and 1 with no visible tiling; `mem7` still ≤ 75 MB; and it is in hand
    before stage A closes. It is never waited for.
- CREDITS: no new entry on the plan of record.

---

## Production plan: stages and gates

Five stages after stage 0, each ending in a gate that must pass before the next starts. Each stage's report goes to
`docs/act7-briefs/reports/`. One browser per gate run and one owner per gate (HANDOFF's lesson).

### The four test rules (the production proposal's §7.3, word for word; they go into the contract)

1. **Fixtures, not bare zones.** Every scenario starts from one of three named saves built from flags by one file, `tools/fixtures7.mjs`: `fx7_new` (quest 39, the act not begun), `fx7_mid` (three weirs open, `kallistoRest`), `fx7_done` (`act7`). A scenario never assumes "the zone is empty" or "the door is still shut": it says which fixture it wants.
2. **A switch for what must be bare.** A stage-A test that needs an unfilled zone asks for it with `?nopacks&nostory`, a switch that stays supported for the act's life, in place of relying on the zone being empty that week. `ground7` and the look shots use it.
3. **Places by name, never by coordinate or by walking.** Tests go to `spot('weir2')`, not to (54, 92) and not along a path a later stage may gate.
4. **Every scenario carries `stage` and `until`.** `until: 'E'` is the default and means "true of the finished act". A test that is knowingly temporary says `until: 'B'`, and **the gate of that stage fails while any scenario with an expired `until` still exists**: it is deleted or rewritten in the commit that outdates it. `node tools/scenario.mjs --stale` lists them. The regress sets are built from the tags, not from hand-kept lists.

What this needs that does not exist today: `tools/fixtures7.mjs`; the `?nopacks&nostory` switch (neither word is in
`src/`); a `spot(name)` helper over `L.spots`; `stage` and `until` on scenario entries and the `--stale` flag
(`scenario.mjs` is a plain table of `{ q, run }`). All four are built in stage 0 and stage A's first two days.

**Rule 5 of `decisions.md` on top:** `fx7_new` is **a v22 hero at quest 39**: every Act I-VI flag in the order the
story saves them (`crownUnmade` among them, which is the flag `forge.js:63` tests), `fmt: 1`, **no `act7` field**, so
each run crosses the migration. No scenario of this act starts from a fresh test hero.

### Stages

| stage | days | work | gate |
|---|---|---|---|
| **0. Decisions, contract, look gates, debts** | 2.5-3 | the owner's answers as they come (never waited for); `docs/act7-contract.md`; `day0`; the two bodies in the creature viewer; the old tests retired or repointed (below); `stage` / `until` / `--stale`; `fixtures7.mjs` with `fx7_new` | **G0** |
| **A. The ground** | 18-21 | items 1-6; `play7` as a skeleton; `perf7` and `mem7` first runs | **G1** |
| **B. Systems and enemies** | 11.5-13.5 | items 7-11 | **G2** |
| **C. Bosses, the Names, the ladder** | 14.5-16.5 | items 12-14 | **G3** |
| **D. Story, text, music, co-op, saves** | 11.25-13.25 | items 15-18 | **G4** |
| **E. Release** | 3-4 | item 19's last part, item 20 | **G5** |

The stage rows include item 19's 4-4.5 days spread as 1.5 / 1 / 0.5 / 0.5 / 0.5-1.

**The gates, in numbers.**

- **G0.** `day0` passes its five numbers at quality 0 and 1 on all four zones, **or** the haze fallback is written into
  the contract. Kallisto × 2.1 and Kelados × 2.3 pass by eye, or their fallbacks are written. `--stale` runs and lists
  nothing but `day0`. Every one of the seven old tests has its line in the contract. `melt` declared "in hand" or
  "not coming".
- **G1.** `check-act7`: 300 seeds for each zone and reading (1,200 layouts), no hard failure, mean tries ≤ 3. `perf7`
  ≤ 1.00 at five spots with stand-in packs; the desktop pass ≤ 1.15. `mem7` ≤ 75 MB into each zone. `save16`
  (format 1 half). `gate7`. `ground7`. `play7` walks its skeleton end to end. `check-act6` and the parity run clean
  after the helper move. `unload6` with its new leg. **The owner's phone is asked for `tarn`'s spots 4 and 5 here.**
  regress-A.
- **G2.** `race`, `slide`, `sun` soaks. `daytele`. `cast7` cold. `skillsfx` in a 'sun' zone for each class. `perf7`
  again with real packs. **Zone danger in band before a boss exists** (run A): 0.4-0.8 lives a run, lowest life
  35-65% (median), 0-6 s under 30%, deaths in 0-3% of runs, 15-35% of kills by terrain, on Warden difficulty for each
  class. `day0` deleted. regress-B.
- **G3.** Run B: Kallisto 110-170 s and Kelados 150-230 s on Warden difficulty for the three classes, no run over 240
  and 270 s; 4-10 blows landed a fight, each 12-18% of her life and none over 20%; blows landed within ± 30% across
  the classes. **Run C: the bot's damage doubled brings each fight to 50-65% of its time.** Run D: every Name shown or
  cut. `kallisto`, `kelados`, `leg7`, `diff7`, `names7`, `fires7`. `coop.mjs bosses7` at two and four. regress-C.
- **G4.** `hook7`, `catch7`, `ending7`, `echo7`, `rested7`. `coop.mjs act7`, and `NET=supa` four players during a
  slide soak under the 100 events a second Act VI measured against. Two readers on every line. The owner reads the
  key Greek lines. regress-D.
- **G5.** Every scenario of Acts I-VII, progression, co-op, saves and cloud passes, **with no "out of date" row and
  nothing listed by `--stale`**. Both builds. The strict-CSP check on desktop and phone emulation. `save16` both
  ways. The owner's phone runs `perf7`'s five spots.

### Scenarios and tools, by stage

Every row obeys the four rules: the fixture is named, a bare zone is asked for by the switch, places are `spot()`
names, and `until` is `E` unless said.

| stage | name | fixture, switch | asserts |
|---|---|---|---|
| 0 | `day0` (`until: 'B'`) | the world viewer, no hero | the look gate's five numbers on four shipped zones at quality 0 and 1 |
| A | `check-act7` (tool) | none (generators only) | the zones part's reach checks at every water level and reading; the contract's fields; both generators deterministic; mean tries |
| A | `ground7` | `fx7_new`, `?nopacks&nostory` | each zone's ground program compiles with its define set at quality 0, 1 and 2 and as a phone; each slot's chain ends in a loaded layer; `uThaw` moves and `uAutumn` does not |
| A | `perf7`, `mem7` | `fx7_new`, `fx7_mid`; spots by name | Assets, above |
| A | `save16` | `fx7_new` | a v22 hero loads, gains `act7: -1` and the new fields, keeps `fmt` 1; the `fx7_done` hero's record is under 32 KiB (the cloud's cap is 96 KiB a hero, `docs/cloudsave/README.md:55`); at E, with the switch: written as 2, and refused as 'newer' by a build that reads 1 (`save.js:231`) |
| A | `gate7` | `fx7_done` | a Shadow Gate tier's layout and packs equal the shipped generator's for the same seed |
| A | `play7` | `fx7_new`, god-mode | a Warden walks the critical path to the end state by named spots. A skeleton at A (travel, exits, the two arenas reached), grown at every stage, complete at D. Each beat it cannot do yet is a named `todo` row that fails G5 |
| B | `race` | `fx7_new`, then flags | `map.ver` ≤ 4 bumps a second; the level 1.2 / 0.9 / 0.6 / 0.3 from flags; never a cell closed under the hero; the fords open in order; the level on a guest's page |
| B | `slide` | `fx7_new` | **flues run for a hero with `crownUnmade`**; a chute fires only armed, sunlit and kicked; never under 2.8 s of warning; a rock shard is cover and an icicle is not; a goblin in the lane takes the full blow, ends at the lane's foot, Dazed; spent 45 s; one firing on two pages |
| B | `sun` | `fx7_new` | an Icebound sleeps 60 s under a cloud and wakes within 3 s of sun; a chough breaks off in shade; the clouds' positions equal on two pages; no ring and no Shroud |
| B | `daytele` | `fx7_new`, `fx7_mid` | `day0`'s numbers on meadow and on snow at quality 0 and 1, for every tell of the act (the three lane colours, each enemy's heavy move, the bosses' moves as they land at C), the loot beams, and across the co-op mirror |
| B | `cast7` | `fx7_new`, cold sessions | every new kind's body, and its stand-in before the group lands, from the `thaw` and the `tarn` waypoint |
| B | balance run A | profile heroes | zone danger (G2) |
| C | `kallisto`, `kelados` | `fx7_new` + flags, `fx7_mid` | each class: the bands; one `G.bossActor`; the rest state and never a corpse; the `kill` event's drop, flag and quest step; a phase skipped by a strong hero still plays its entry; Halda's one call a phase |
| C | `leg7`, `diff7` | `fx7_mid` | one first-kill drop each; `HAZ7`'s rows on Wanderer and on Skotos; telegraph lengths unchanged; a heavy blow not multiplied by `DIFFS.dmg` |
| C | `names7` | `fx7_new` | the panel at 844 × 390; three said at a time; the slots' costs; the free respec at quest 40; the Call's 20 s the same for each class; an old save with none |
| C | `fires7` | `fx7_mid` | a hold: the wave, the rank written for every hero present, the bonus in `G.stats`, the far fire's colour |
| C | balance runs B, C, D | profile heroes | G3 |
| C | `coop.mjs bosses7` | | both fights at two and four; one kill paid once |
| D | `hook7` | `fx7_new` | the hook from a v22 hero; (b) from an Act VI-end save without `act7` |
| D | `catch7` | flags | every row of the catch-up table: the state just after each flag's save, a reload, the quest and the scene again |
| D | `ending7` | `fx7_mid` + flags | the sluices, the home scene, the sleep, the four seconds of black, the last line, the panels, `game.sub7` |
| D | `echo7`, `rested7` | `fx7_done` | both echoes once a day; Rested from `hero.played` and its greeting |
| D | `coop.mjs act7` | | a guest turns a weir, pulls a lever, kicks a chute through the host; the level and the clouds on the guest; **a `VER` 5 page and a `VER` 6 page refuse each other** (`coop.js:352`, `:361`) |
| E | everything | | G5 |

**Regress sets** are built from the tags (rule 4): regress-A is every scenario with `stage` ≤ A of any act that
touches what stage A touched (as Act VI's lists did by hand: `perf5`, `perf6`, `coast`, `tide`, `cast5`, `cast6`,
`shallowtele`, `darktele`, `ashfield`, `forge`, the saves, `title`, `panels`, the layout checks); each later set adds
its stage.

### Old tests retired or repointed in stage 0

| test | what `stageE-report.md` found | what is done |
|---|---|---|
| `ground6` (`scenario.mjs:3524`) | written for stage A's empty zones | **repointed:** run with `?nopacks&nostory`; kept, `until: 'E'` |
| `look6` (`:4281`) | the same | **retired by name.** Its pictures are `darktele`'s and `perf6`'s per-spot shots; the owner of stage 0 checks each of its assertions has a home before deleting it |
| `place6` (`:4572`) | walks to places the story now holds shut | **retired by name.** Layout is `check-act6`'s; placement after the story is `drained`, `catch6` and `lost6` |
| `resume`, part `fall`, check e (`:641`) | expects Continue in the Weeping Woods; main changed it on purpose | **the expectation is rewritten** to the village; the other eleven parts stay |
| `tremble6` (`:4379`) | a real overrun: 0.120 at quality 1 against the project's 0.10 | **fixed, 0.25 d:** the luminance tremble comes down until quality 1 is ≤ 0.10, the radius tremble carrying the read. If the owner would sooner keep the look, the limit is changed with his name beside it. Not left failing. Act VII adds no trembling pool |
| `play5` (`:3181`) | the bot stops at "the fall light and its memory" (`:3273`), on main too | **fixed, up to 0.5 d,** because `play7` is built on its walker. If it is not fixed in that time it is retired by name; `coast`, `tower`, `skotos` and `ending5` cross the same story |
| `diagcheck` (a tool, `tools/diagcheck.mjs`) | fails before that week's changes too; not looked into | **0.5 d to find out why.** If a lost context cannot be reproduced headless, it becomes a manual check in the release list and leaves the gate's set by name |

Also written down in the contract: Act VI's `play6` and `cp6` were named by its contract and never written (no entry
of either name in `scenario.mjs`). They are not written now. `play7` covers the walk from quest 39 on.

### The balance campaign

- **The hero** (the Act VI campaign's profile, `balance-report.md`, "How it was run"): gear four levels behind, one
  blessing an act, spare points in Might and Vigor, the first-kill legendary of every boss beaten. **Level 50 on
  Warden difficulty and above; 47 on Wanderer** (that campaign's "three levels lower"). Without Names for runs A-C.
- **n per cell:** 6 on Warden difficulty and above, 12 on Wanderer; seeds 1000 + r × 7919; eight packs a zone.
- **The metrics.** Shipped: `minLife`, `deaths`, `deathAt`, `potions`, `hits`, `maxHit`, lives of damage
  (`balance-act.mjs:381`, `:389`, `:670`, `:813-815`). New, all in the bot's own bookkeeping: **`under30S`** (seconds
  under 30% of life), **`worst3`** (the largest share of life lost in any 3 s), heavy blows by move, the share of
  kills by a slide or by water, blows by range band.
- **The bot's lessons,** each checked in a scenario before it is trusted in a campaign (Act VI lost a whole pass of
  324 runs to a bot that stood idle between packs):
  1. a white lane is harm, as a red one is;
  2. kick an armed, sunlit chute when three or more foes stand in its lane and she does not;
  3. go behind cover when a lane is warned;
  4. turn the weirs in order; at Kelados pull a lever when he stands in its channel;
  5. bait Kallisto's charge onto a boulder;
  6. fight what comes at her before walking on (kept from Act VI's fix).
- **The runs:**

| run | question | cells | runs |
|---|---|---|---|
| **A** (stage B, G2) | are the zones worth fighting at the cap? | 2 zones × 3 classes × difficulties 0, 1, 2 | 144 |
| **B** (stage C) | are the bosses in their bands, fair and deadly enough? | 2 bosses × 3 classes × difficulties 0, 1, 2, 4 | 180 |
| **C** (stage C) | is anything held by a clock? | B's Warden cells with the bot's damage doubled (`job.gearK`, shipped at `balance-act.mjs:83`): the time must fall to 50-65% | 36 |
| **D** (stage C) | does each Name do something, and not too much? | 3 classes × 7 Names × Kept and Deep × one zone and one boss × 4, against 36 runs without | about 370 |
| F | did Acts V and VI move under a three-Name build? | Act VI's plan, Warden cells | 126, reported |
| H | co-op | A's and B's Warden cells at `--coop 2` and `4` | 144, reported |

- About 1,000 runs. Act VI's 666 ran in a working day with the page reloaded every 40 jobs; this is two nights.
- **When:** zones at the end of stage B, on real packs and before a boss exists. Bosses in stage C on grey-box
  arenas, **before a cine, a line or a theme is attached to them** (the story proposal's §9.1 and judge 1's must-fix
  9). A boss outside its band then has its phase rules changed, not its numbers.
- **The damage anchor.** The act's lives of damage over Act V's as measured (1.13 / 1.17 / 1.23 lives on Warden
  difficulty) is **reported at G3, not gated**; the gates are lowest life, deaths and `under30S`. See the first note
  for the lead: the decided bands and the decided anchor do not meet across their whole range.

### The release checklist (learned from v22)

1. **Stage 0's debts are closed first** (the table above), so G5 can ask for "no out-of-date row" honestly.
2. **The creature group row.** `ACT_FILES.act7` exists and `cast7` passes **cold** from each waypoint. Act VI shipped
   without its row and a cold start drew every Act VI creature as a boot stand-in until v22.1 (`creatures.js:43-46`).
3. **The whole set runs two at a time; every failure is then run alone;** a failure alone is run twice more before
   it is called. `perf7`, `perf6`, `perf5`, `mem7`, `unload6`, `tremble6`, `play5`, `play7` and the soaks always run
   alone (two browsers skew the ratios). `fatalcheck` reports `pass: false` by design and is not a failure.
4. **A failure is run on the last release's code** before it is blamed on the act (v22 found six that were old).
5. **The time is written down.** v22's set was 134 runs (100 scenarios with class variants, 22 co-op, 12 tools); its
   report does not say how long that took. Act VII's will be about 165. Budget one and a half days of stage E for it,
   and record the wall time in the stage E report so Act VIII can plan.
6. **`SAVE_FMT` 2 and `VER` 6 in stage E's last commit;** `save16` both ways after it; the artifact and the web build
   go out the same day.
7. **DOCTYPE for the publisher.** `tools/make-artifact.mjs` writes a page fragment with no doctype by design
   (`make-artifact.mjs:1`, `:11`), and the publisher wants a document that begins `<!DOCTYPE html>`. The published
   `index.html` is checked for it as the release's last step before the upload. (The v22 note itself is the lead's;
   it is not in the repository.)
8. `npm run build:artifact` (every file under 16 MB), the strict-CSP run on desktop 1280 × 720 and a touch phone
   844 × 390 through both zones, no untextured model; `npm run build:web`; the files map with removed files null.
9. Credits in their four places if `melt` was built; otherwise unchanged.
10. The owner's phone: `perf7`'s five spots, with and without `heavyZone` on `tarn`, before any Play Store build.

### Total cost, and the cut order

| stage | days |
|---|---|
| 0 | 2.5-3 |
| A | 18-21 |
| B | 11.5-13.5 |
| C | 14.5-16.5 |
| D | 11.25-13.25 |
| E | 3-4 |
| **total** | **about 61-71** |

Judge 2 counted 57-66. The difference is what the source added: item 1's wider gate list (+0.5), the phone's water
path (+0.25), a heavy move on every enemy (+0.5), the test machinery that the four rules need and that does not exist
(+0.5), and stage 0's debts (+0.5). **Not counted:** the owner's phone runs and reading time, the machine time of the
balance nights, the Play Store packaging.

**The cut order** (taken from the top; each with what is lost):

| # | cut | saves | lost |
|---|---|---|---|
| 1 | Deep Names at launch (Kept only) | 1.5 | the second tier; run D halves |
| 2 | the lookouts' ranks by difficulty → one rank | 1 | the long ladder; the seven bonuses stay |
| 3 | crevasses and snow bridges | 1 | a piece of the Snowfield's layout and its reach checks |
| 4 | the two echoes, shipped in the first patch | 1 | two daily refights at launch |
| 5 | Rested, shipped in the first patch | 1 | the greeting and its bonus at launch |
| 6 | clouds that move → a whole-zone cloud every 45 s for 12 s (also the plan if G2 shows nobody uses the shade) | 0.75 | the tactical edge of a cloud |
| 7 | lookouts 6 → 4 | 0.75 | two hold events; the two bosses' first falls give those fires |
| 8 | the cub's cine and the rainbow → narration | 0.75 | two small pictures |
| 9 | one theme (`tarn` takes the `thaw` theme's variant) | 0.5 | a tune |
| 10 | the Rock-roller's boulders left as cover (Kelados's block stays) | 0.5 | one use of cover |
| 11 | the far fires' colour by rank | 0.25 | the ladder seen from home |
| | **total** | **9** | **brings 61-71 to about 52-62** |

Reaching 60 at the top of the band also needs gen7 to land at 6.5 and not 7.5.

**Never cut:** the stage-0 look gate, `perf7`, `mem7`, the balance runs A-C, `play7`, the four test rules, the
proofreading, the phone's water path, `heavyZone` on `tarn`.

---

## Risks

| # | risk | likelihood | cost if it happens | mitigation | the test that catches it |
|---|---|---|---|---|---|
| 1 | **Daylight washes out telegraphs, rings or loot on a phone** | medium | the act's look, or unfair blows | the 'day' material and the beam's dark core; exposure 0.92 on snow; the haze fallback with no plan change | `day0` (stage 0), `daytele` (G2) |
| 2 | **`tarn` reads as Act V by day** (lesson 5) | medium | half the act is a third blue zone | the `farlight`-under-`tarn` shot is put to the owner at stage 0; more bare rock and scree, a green rim from the first visit | `day0`'s by-eye question; the stage A look shots |
| 3 | **A phone heats or drops its context on snow and water over the whole screen** | medium | the owner's phone, as on the coast | `heavyZone` on `tarn` from the first build; the phone draws `safeSea` and none of the ground extras; his phone at G1 | `perf7` spots 4 and 5; the owner's run |
| 4 | **The phone's picture is not the designed one** (no wet rim, no glint, flat water) | high, by construction | a rule that depends on a desktop-only cue is unreadable | no rule depends on the wet rim; the deep-water step is in `safeSea`; every shot in `day0` and `daytele` is phone-emulated | `daytele`; `race` asserts the deep edge is a geometry fact, not a colour |
| 5 | **A boss with no lock falls in 40 s, or has no teeth** | medium | a finale that is over before its second phase | life set by the bot to the band's floor; blows as shares of life; a skipped phase still plays its entry | run B (band), run C (50-65%), `kallisto`, `kelados` |
| 6 | **The Names multiply the balance cells** | medium | a campaign that cannot finish, or a Name nobody can show | seven, fixed in the contract; one number each; run D or cut; cut 1 halves it | run D; `names7` |
| 7 | **Slides trivialise packs, or nobody uses them** | medium | zones too easy, or a dead mechanic | 45 s to re-arm; sunlit only; packs placed so about a third stand in a lane; the first chute on the trail pre-armed over a pack | run A's kills by terrain, 15-35% |
| 8 | **Floods are a sensitive subject** (rule 8: Greece has buried people after floods) | medium | hurt to players; a store listing that reads as news footage | on screen: no house or village under water, nobody drowned, nobody swept away; the two huts "in water to the sills" of the proposal are **removed**; the wash-out is the hero's stumble, never a body in a current; the town sees only a brown stream turn clear; no screenshot of rising water against a building; not launched or advertised beside a flood in the news | a release-checklist line; `hook7` and `ending7` assert the town's stream state and nothing else changes there; the owner reads the hook |
| 9 | **A seventh act's save grows past what the cloud takes** | low | a hero that stays local only | a hero is about 20 KB against a 96 KiB cap (`docs/cloudsave/README.md:55`); Act VII adds flags, seven ranks, the Names and up to twelve per-difficulty seeds, under 2 KB | `save16`'s 32 KiB line; `cloud`, `cloudweb`, `tools/cloud/test-saves.mjs` at G5 |
| 10 | **A v22 tab writes an Act VII hero back smaller** | low | a player's save | `SAVE_FMT` 2 in the last commit; v22 refuses 'newer' (`save.js:231`). A browser holding a build older than v22 has no check: the same residual risk as on 17 November | `save16` both ways |
| 11 | **Co-op protocol 6 against v22 clients** | low | a broken room | the bump is one; a mismatch is a clean leave with `coop.version` (`coop.js:361`) and the host does not list the guest (`:352`); both builds go out the same day | `coop.mjs act7`'s VER 5 / VER 6 case |
| 12 | **A trap from an older act silently disables a mechanic** | medium (seven found, fourteen more lines for this part) | a system that passes on a test hero and fails for every player | item 1 first; every soak on `fx7_new`, a v22 hero | `slide` asserts flues run with `crownUnmade`; `race` and `coop.mjs act7` assert the level on a guest |
| 13 | **Kelados reads as the Stonewarden** | medium | the finale's picture | scale, ice plates, the pine, a rooted first phase; the stage-0 body gate | the look gate, by eye |
| 14 | **The white fake does not read as snow in `thaw`** | medium | the receding snow, the act's world-state picture | load `rime` in `thaw` (58 MB, no day); `L.shade` as a second mask term | the stage A look shot; `ground7` |
| 15 | **gen7 runs over** (two zones × two readings × four water levels) | medium | 1-2 days | the estimate already carries judge 2's +1; mean tries reported from the first week; crevasses are cut 3 | `check-act7` |
| 16 | **Moving gen6's helpers changes an Act VI layout** | low | a saved seed's zone | the parity run in the same commit; otherwise gen7 copies them | `check-act6`, the parity run, `gate7` |
| 17 | **Stage tests go stale again** | medium without the rules | G5 with "out of date" rows, as v22 | the four rules; `--stale` fails a gate | `--stale` at every gate |
| 18 | **A flaky run hides a real failure** (`skotos`, `soak5`, `transfer`, `ketos` in v22) | medium | a release argued about, not measured | two at a time, then alone, then twice more; the timed ones always alone | the release checklist, items 3-5 |
| 19 | **Tree shadows in the Meadow cost more than the Field** | low-medium | `perf7` spot 1 | trees stop casting at quality 1 | `perf7` |
| 20 | **A non-lethal boss breaks the `kill` route** | low | loot or the quest not firing | the `kill` event fires as shipped; only the body's end differs | `kallisto`, `kelados`, `leg7` |
| 21 | **The container restarts mid-campaign** (HANDOFF) | high | lost runs | the plan file skips jobs already in the output (`balance-act.mjs:9`); progress notes each stage | the campaign's own count |

---

## What this design deliberately does not do

- No new rendering system, render target, post-process, depth texture or sky. No ceiling in play.
- No download on the plan of record, and no day that waits for one.
- No new people set, and none loaded in either zone.
- No detailed water, wet rim or glint on a phone, and no rule that needs one.
- No cast shadows at quality 0, and no second shadow map.
- No Cold, no thin ice, no Shroud, no ring to manage, no dark.
- No least-time lock, phase floor on a timer or lingering damage ground in either boss; the 11% blow cap of Act VI
  is not extended.
- No house or village under water, no one drowned, no one swept away.
- No change to how the Shadow Gates play (`gate7` holds it), and no change to any shipped zone's layout.
- No height for actors: the Stair is a kit prop and an exit; the floor stays flat.
- No raise of the level cap, no fourteenth Mastery track, no new currency.
- No fire system, no wind that pushes, no Vows: those belong to Act VIII's proposal and to a later patch.
- No test written against a zone "as it is this week", and no gate passed with an out-of-date row.
- No Blender step: every build is the Node pipeline of Acts II-VI.

---

## Notes for the lead

### Conflicts with `decisions.md`

1. **Rule 4's anchor against rules 1 and 2's bands.** Act V measured 1.13-1.23 lives of damage for the act on Warden
   difficulty (zones summed, plus the two bosses). Rules 1 and 2 decide zones at 0.4-0.8 lives each and bosses at 4-10
   blows of 12-18%. At the bottom of every band that is 0.8 + 0.96 = 1.76 lives, × 1.45-1.55 of Act V. In the middle
   (0.6 a zone; six and eight blows of 15%) it is 3.3 lives, about × 2.8. At the top it is 5.2, about × 4.4.
   **The decided × 1.45-2.1 holds only in the lower third of the decided bands.** This part therefore reports the
   ratio at G3 and gates on lowest life, deaths and `under30S`, as rule 4's own second half says. If the ratio is to
   be a gate, the blows landed must come down to about 4-6 a fight.
2. **"Fixed already: `ACT_FILES.act6`"**: confirmed (`creatures.js:43-46`). But `world.js:99`'s comment still says the
   opposite, and `unload6`'s owner table stops at act5 (`scenario.mjs:3828`).
3. **`world.js:1603` and `coop.js:648`** are listed as traps for stage A, but the decided act has no gusts. The fix
   is kept small (a field, a comment) and Act VII's clouds do not ride that clock.
4. **The trap list is not complete.** Fourteen more lines gate on `act6`, `act === 6` or the pair `HAZ5` / `HAZ6`
   (Engine work, item 1, second table). `actors.js:172` matters most: without it no creature of the act reads
   `HAZ7`'s row.
5. **Rule 8 against the base text.** The production proposal's Drowned Meadow has two huts "standing in water to the
   sills" (§3.1 B) and rule 4 of the Race says rising water "takes the goblins". The first is a house under water and
   is removed in Risks row 8. The second is for the zones writer: evicted foes should be seen to climb out, not to be
   carried off.
6. **"`play7` from stage A"** is kept, as a skeleton with named `todo` rows that fail G5. A full walk cannot exist
   before the story does.

### Needed from the other three parts

- **Story:** the flag chain in save order (it is `fixtures7.mjs`); the catch-up table (`catch7`'s rows); the line
  count (the plan assumes about 190-240 bilingual lines and five cines); the key Greek lines the owner reads; the
  town's stream as the only thing that changes in Whitecliff; where Halda stands at each boss (the fail-safe voice is
  asserted in `kallisto` and `kelados`).
- **Zones, enemies, bosses:** every `L.spots` name (tests go by name only); the reach checks as hard and soft lists
  for `check-act7`; the five `perf7` spots confirmed as each part's worst view; the pack table, with which packs are
  dormant; each enemy's one heavy move and its `HAZ7` share; the boss move tables with their range bands; whether
  `thaw` uses scree anywhere (none is loaded); the snow bridges and crevasses marked as cut 3.
- **Mechanics, progression, co-op:** the `HAZ7` table whole (`diff7` reads it); the Slide's host event and its op
  name; the clouds' clock field; the Names' save fields and their size; the blow cap's table for guests; the 'loud'
  helper's radius per skill; the protocol 6 field list; whether the Wanderer profile hero is 47 or 50.

### Could not verify (what was opened, and what was not)

- **Whether the pale rows read on a phone:** nothing bright has shipped; `day0` answers it. The numbers in the look
  table are starting points.
- **Whether a white `fake` of tinted `leaves` reads as snow** (`build.js:1633` read; never seen under a sun).
- **`shadeTick` (`ai.js:171`) and `placeCasks` (`sap.js:169`)** run for any `z.water` zone; their bodies were not
  opened. They must be read before `act7Zone` sets the flag.
- **`boot.js:289`'s `warm()`** (a phone warms shaders before an Act V zone): only the call line was read.
- **`cells6Apply` and `sane6`** (`coop.js:1110`): read at the gate only, not their bodies.
- **The blob shadows as a stand-in for tree shadows:** `actors.js:87-91` builds them for actors. No blob exists for
  trees; the fallback written here is "trees stop casting", not "trees get blobs".
- **The full test set's wall time:** not in `stageE-report.md`. The one and a half days are an estimate.
- **The DOCTYPE lesson:** `make-artifact.mjs` writes a fragment and says the host adds the doctype; no note about the
  v22 publish was found in `docs/`. The checklist line follows the lead's brief.
- **Memory figures** are computed from `glbinfo` map sizes by the engine brief's rule and from Act VI's measured
  `rime` figure; `mem7` measures them. `frost` staying resident in a long session (it is not in `unload.js:28`'s list)
  is outside the cold-start gate.
- **The tools named in the brief:** there is no `tools/build-artifact.mjs`; the script is `build:artifact` in
  `package.json`, which runs `tools/make-artifact.mjs`.
- **Cloud documents:** no per-field schema was found in `cloud.js`, `cloudsync.js`, `cloudsb.js` or `cloudart.js`
  (no `act6` in any of them); the hero is stored whole and `heroFits` is the guard. The 96 KiB cap is from
  `docs/cloudsave/README.md`.
