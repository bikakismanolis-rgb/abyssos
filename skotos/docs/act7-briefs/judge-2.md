# Act VII: judge 2 (the engineer-producer's reading), 17 November 2026

Weights: feasibility on a phone ×2, story ×1, fun of play ×1, fit with the game and its canon ×1 (50 points).
Read in full: `brief.md`, the three proposals. Verified in the source: `tide.js`, `forge.js`, `cold.js`, `light.js`
(queries, lamps, pools, discs, tick), `gfx.js`, `atmos.js`, `fx.js` (telegraphs), `build.js` (ground5/6, the dry slot, the
ring on snow), `map.js`, `creatures.js`, `actors.js` (stand-ins), `world.js` (zones, READY, gusts, shrines), `coop.js`
(VER, the world state, the `act6` gates), `data.js` (HAZ rows, SAVE_FMT), `save.js`, `progression.js`,
`tools/balance-act.mjs`, the balance and stage E reports, the engine brief (§0, §5), the Act VI asset gates, and every
creature file with `tools/glbinfo.mjs`. No code was changed. Where I did not open something, the row says so.

---

## 1. Scores, ranking, base

| | feasibility (×2) | story | fun | fit | **total / 50** |
|---|---|---|---|---|---|
| **Production, "The Seven Peaks"** | 9 (18) | 6 | 7 | 7 | **38** |
| **Story, "The Unsleeping"** | 5 (10) | 9 | 7 | 8 | **34** |
| **Systems, "The Twelve Nights"** | 6 (12) | 6 | 9 | 5 | **32** |

**Why each score.**

- **Production, feasibility 9.** Every file and line it cites is where it says (§2 below: 14 claims checked, 12 true, 2
  true with a small fix). The act is complete with no download. Its three mechanics really are one input each. One point
  off for four traps it did not see: `forge.js:63`, the shards' line of sight, the `act6` gates in `coop.js` and
  `tide.js`, and `heavyZone`. **Story 6:** a clean idea (the hero's gift has its price) and no opponent; it says so itself
  (§10.5.1). **Fun 7:** slides as a weapon and a river the player lowers are good; Sun and Shade is thin (its own §10.5.3);
  the Seven Fires are percentages again. **Fit 7:** spring after winter is right; but its second zone is a snowfield on the
  `rime` pack, which is half of lesson 5 not learnt, and its finale is the Act II golem.
- **Story, feasibility 5.** Its central mechanic is not what it says it is: `tide.js` cannot take a fire front (§2, S1),
  and the proposal admits it did not read the body (§6.1, "Not verified"). The first boss has no body: the bull is
  unscouted and the elk fallback has no charge, daze or lie-down clip. The cost is 15 days under. Memory and people are
  fine. **Story 9:** the best writing of the three by a distance, built from shipped keys (`intro.5`, `d.isarn.1`,
  `d.alk.a3`, `d.asger.2`), with an antagonist who is right about half of it. One point off for the subject (a grass fire
  walking on a village, for a Greek audience) and for standing close to the one thing canon forbids (a flame kept for an
  age). **Fun 7:** "the black is safe" and the back-burn are a real idea; but its boss numbers cannot produce the danger it
  promises (§3). **Fit 8.**
- **Systems, feasibility 6.** Nothing in it is hard for a phone to draw, and its bodies are all shipped. But it is 62-75
  days by its own count and 76-92 by mine, the wind is seven new effects in five files and not "one input", and the hero
  being pushed by weather under a thumb is the one mechanic of the three sets that could fail on the device. **Story 6:**
  the twelve nights and "you lit their home" are a good folk hook with a thin cast. **Fun 9:** the Names are the only real
  answer here to "points with nowhere to go", and its boss rules are the best written. **Fit 5:** night, snow and storm on
  the `rime` pack is a third blue-and-dark act (lesson 5, binding); Vows touch the Gates; it lengthens telegraphs on
  Wanderer against the standing rule (`data.js:32`); both bosses are Act I bodies blown up.

**Ranking:** Production, Story, Systems.

**The base: Production.** Five lines:
1. It is the only one whose engineering claims survive the source almost untouched, and the only one with no download on its critical path (Act VI's two never arrived; `src/assets/creatures/` confirms it).
2. Its first boss stands on a shipped body with every clip a charging boss needs (`bear.glb`: idle, walk, run, charge, attack, attack2, rear, howl, hit, daze, die).
3. Its daylight plan is the sound one, gated on shipped zones before any Act VII code, with a shipped fallback (Act III's sun over haze).
4. Its test plan is the only one that answers lesson 4 with a mechanism (fixtures, `?nopacks&nostory`, `until` tags that fail a gate).
5. Its two weak places are sockets it names itself (§10.5.3, §10.2 last line): the story and the cap layer drop in without moving a zone or a boss.

---

## 2. Verification table

Verdicts: **true** / **true, N d** (true with N focused days of engine work) / **not true**.

### Story ("The Unsleeping")

| # | claim | verdict | where |
|---|---|---|---|
| S1 | The Burn is `tide.js` "driven by wind over fuel instead of water over a bed"; lane, wash-out, dial and co-op clock "reused as they are" (§6.1) | **not true.** The tide is one scalar level against a per-cell threshold computed once from `L.bed` (`tide.js:68-78` `cellsOf`, `:83` `deepAt`, `:184-201` `batch`). Safe ground is "what the top level never takes" (`:211-231`). A front that closes a cell for 4 s, reopens it and never closes it again has no counterpart in any of these. What can be borrowed: `map.change` (`map.js:43-60`), the shelter idea (`:275-303`), `evict` (`:340`), the dial's HUD slot (`:474`). **A new module: 9-12 d** with its drawing, enemy hooks, co-op cells and the bot, not 4-5 | tide.js |
| S2 | Bank and Wake is one field on a lamp and one branch (§6.2) | **true, 2-2.5 d.** A lamp is `it.lit` + `it.lightR` on an interact (`light.js:77-79`, `:284-309`); the snuffer's walk is `ai.js:2693`. But the design has four states (banked, awake, unsleeping, and "sleepers within 10 m get up after 40 s"), not three | light.js |
| S3 | Sleep is the remains-and-reforge rule with a Waker on `forger` (§6.3) | **true, 1.5-2 d.** `forger` seeks `REMAINS` and mends in 2.2 s, three times at most (`ai.js:2937-2950`, `combat.js:422`). It also throws rivets (`ai.js:2940`): the Waker needs its own branch. The lie pose exists (`anim.js:74`, `people.js:361`) | ai.js |
| S4 | "The hero's point light is off by day, which saves a light" (§3.2) | **not true.** `R.heroLight` stays in the scene at intensity 0; the shader's light count does not change (`gfx.js:109-116`). No saving, no cost | gfx.js |
| S5 | Daylight is "0.5 d of tuning; no code" (§3.2 table) | **true for the lights, not for the effects.** Sun, sky and shadows are atmosphere numbers (`gfx.js:170-185`). Telegraphs, rings and light discs are additive (`fx.js:322`, `:226`; `light.js:473`) and its own fire line is drawn from the additive pool on gold straw in full sun. Its row 3 (2-2.5 d) covers the telegraph; nothing covers the fire | fx.js, light.js |
| S6 | Rested from `hero.played` (§6.3b) | **true, 1 d.** `save.js:97` stamps it on every save | save.js |
| S7 | `rl()` knows `.r` and `.m`, not `.w` | **true.** `story.js:102` | story.js |
| S8 | Aithon: a bull download, else the elk at ×1.25 | **no body today.** No bull is scouted (§5, "I cannot name a file"). `elk.glb` has idle, walk, run, leap, die, attack, rear, attack2, howl, paw, hit: no charge, no daze, no lie-down. The fallback is a look, not a boss | glbinfo |
| S9 | `ZONES.tinder` with no `pack`, and `ACT_FILES.act7` | **gap.** A creature group is found through `READY[ZONES[id].pack]` (`world.js:100`, `:113-116`). A zone with no pack loads no group. Production does this right (`pack: 'melt'`, `READY.melt`) | world.js |
| S10 | "the `uAutumn` pattern, build.js:1233"; "the lava sheet's path (build.js:1319)" | **stale line numbers.** `uAutumn` is `build.js:23` and `:1922-1924`; the dry slot is `:1491`. 1233 and 1319 are ground vertex shading. Taken from the Act V engine brief, not from the file | build.js |
| S11 | Memory "14-28 MB"; elk "about 7", skua "about 7", `chaff` "about 14" | **loose, harmless.** By the engine brief's rule (RGBA8 × 1.33, 1024 maps halved): elk 11.2 MB (eight maps at 512 on a phone), skua 1.4 MB (one 512 map), two layers 5.6 MB. About 18 MB with the elk; far under 110 either way | glbinfo |
| S12 | Bosses: "under 50% at least once in half the runs" with a largest blow of 12% and 8-10 blows landed (§5, §9.1b) | **does not add up.** Act V's bosses landed 3-4 blows and left her at 80-92% (balance-report, "Why"). Eight 12% blows over 150 s on a hero who heals chip back will not reach 50% | report |

### Production ("The Seven Peaks")

| # | claim | verdict | where |
|---|---|---|---|
| P1 | The Race is the Mere's own-level channel set from flags (§5.1) | **true, 1 d.** `z.tide.mere = { h, rate }`, `tide.js:88-95` (`resetTide(z, { mere })`), `:168-182`. Three small things: `haz()` reads `HAZ6` for any layout with `L.tideCfg` and plays `iceGroan` as its bell (`tide.js:51-60`, `:142`); the guest's copy is sent only `if (z.act6 && T)` (`coop.js:650`); and a zone has **one** such level, so Kallisto's head-stream "rising a step" raises the whole Race and shuts the east ford behind the hero | tide.js, coop.js |
| P2 | The Slide is a flue with a trigger (§5.2) | **true, 2-2.5 d.** The tick is `forge.js:60-90`; an armed branch in `idle` is a few lines. **But `forge.js:63` returns for any hero with `flags.crownUnmade`**, set for good at `story.js:974`/`:986`: as shipped, no flue breathes for any Act VII hero. Colours are literals (`:93`, `:102`); monsters take a quarter by `BREATH.monsters` (`:28`, `:122`); only the page's own hero is struck (`:112`). Flues are not in the co-op protocol at all (no `flue` in `coop.js`; each page starts its own at a random phase, `forge.js:36`): a kicked chute must be the host's event | forge.js |
| P3 | Shards and thrown blocks are cover from a slide (§3.2 E, §4.2 row 6, §4.5) | **not true as shipped.** A shard's cell is closed by `map.change(open, close)` (`forge.js:278`) with `low` left true (`map.js:43`), and a low cell does not block sight (`map.js:25-29`, `:88-95`), which is what `inFlue` asks (`forge.js:54-58`). A slide passes straight over a shard. Fix: close a rock's cell with `low = false`. 0.25 d | forge.js, map.js |
| P4 | Sun and Shade is `light.js` inverted (§5.3) | **true, 2-2.5 d.** Any `light` string turns the system on (`light.js:41-45`); `lightAt` (`:58-74`) takes a first-line branch. `tickLight` (`:553-617`) will draw the ring and the Cradle and scale the hero's light for an unknown kind unless `heroLightR` and `baseRing` (`:109`, `:623`) branch too. The dark-cored disc (`:462-467`) is 82% violet-black: a cloud needs its own colour and about 0.3 alpha. `B.drape` runs on every move (`:575`): fine for four discs on a flat floor | light.js |
| P5 | "The moon's shadow map already draws every frame wherever `moonI > 0`" | **true.** `gfx.js:177-180`. Town, forest, pass, the Weeping Woods, the Field and the coast all pay it today | gfx.js |
| P6 | `a.sun`: the light's offset is fixed at `gfx.js:96` and `:321` | **true** (the second is in `updateCamera`) | gfx.js |
| P7 | The light loop is the same count everywhere (`POOL_SIZE`, `gfx.js:26`) | **true.** Hemisphere + one directional + the hero's + 3 / 6 / 8 pooled, in every zone | gfx.js |
| P8 | TELE_DARK is the precedent for a 'day' telegraph (`fx.js:304-322`); the ring on snow is a screen blend (`build.js:3120-3157`) | **true, both.** One premultiplied pass; a blend-state switch with no recompile (`build.js:3155`) | fx.js, build.js |
| P9 | The dry slot is hard-wired to `ENV.layers.dryleaf` (`build.js:1491`); `ground7` follows ground5/6 (`:1144-1175`) | **true** | build.js |
| P10 | `bear.glb` has eleven clips; `golem.glb` 16k triangles and nine | **true.** bear: 7,508 triangles, the eleven named. golem: 16,061; walk, run, idle, attack, attack2, slam, warcry, hit, die | glbinfo |
| P11 | Memory: bear 9.0, golem 4.2, worm 1.4, skua 1.4; 24 MB into `thaw`, 65 MB into `tarn` | **true** (recomputed: 9.04, 4.17, 1.39, 1.39). With no download the totals are 16.5 and 58, a little better than its "18" and "59" | glbinfo |
| P12 | `SAVE_FMT` is 1 (`data.js:63`); the refusal is `save.js:231`; v22 is the first public build with it | **true** (stageE-report, "Built"). The bump belongs in this release | data.js, save.js |
| P13 | The Scorpion passed its gate on 27 October | **true** (`asset-gates.json` `falselight.verdict: pass`; `stage0-assets.md:15`, `:72`). **But its sources are gone:** `/tmp/claude-0/sf/act6/` does not exist in this container. It has to be fetched again | files |
| P14 | "No `src/assets/silt/`, no `pack-silt.mjs`", `PACK_ORDER` lists it (`env.js:13`) | **true** | env.js, ls |
| P15 | 'loud' from "the sites that ask `vaultOn()`" (four in skillsx.js) | **true, but there are 16 sites** (`skills.js:263`, `:293`, `:327`, `:367`, `:443`; `skillsx.js:187`, `:284`, `:369`, `:385`, `:423`, `:443`, `:465`, `:521`, `:791`...). Put one helper under them first | skills*.js |
| P16 | Perf 0.85-1.0 of the Field | **plausible, unmeasured.** Not said: `heavyZone` caps a phone at 0.6 resolution for Act V only (`world.js:298`, `gfx.js:141-151`) because "water, ice and snow over the whole screen took the owner's phone's GPU down". `tarn` is that kind of picture | gfx.js |

### Systems ("The Twelve Nights")

| # | claim | verdict | where |
|---|---|---|---|
| Y1 | Gusts exist with a warning; "I did not trace how they reach a guest" | **true, and they do reach a guest** (`coop.js:644-650`, `:1150-1154`). But the clock lives in `act5Tick`, returns unless `z.id === 'farlight'` (`world.js:1603`), and both sides assume 40 s (`coop.js:648`). Generalising it: 0.5 d | world.js, coop.js |
| Y2 | The lee as a mask read by `cold.js` | **true, 0.5 d.** Today it is bergs with the wind hard-coded west (`cold.js:66-74`); `haz()` picks HAZ5 or HAZ6 by `z.act6` (`:27`) | cold.js |
| Y3 | The wind is "cold.js's gusts plus a direction that pushes" (§2.1): shots, hero, foes, damage, knockbacks, edges, fires | **not one input.** A shot's speed is one multiplier (`projectiles.js:82-87`): true, 0.25 d. Nothing drifts an actor or the hero today: new terms in `player.js` and the AI's move step, on the host and on each guest. An edge kill reuses `o.drown` (`combat.js:508`, `:519`, `:553`): true. Seven effects, five files, plus the bot: **6-8 d**, not 3-4 | several |
| Y4 | Chutes are flues with a load (§2.2) | **true, 3-3.5 d.** Same traps as P2 (`forge.js:63`, no co-op). The per-skill load table is more to tune and to teach than production's armed-or-not | forge.js |
| Y5 | A Name-cairn is a shrine (§2.3) | **true, 1 d.** `world.js:192-201`, `:486-503`; a guest's own by `GUEST_OK` (`coop.js:1523`) | world.js |
| Y6 | The 11% cap is Act VI's only | **true.** `combat.js:166` tests `G.zone?.act6` | combat.js |
| Y7 | `boss()`, `hpFloor`, `KETOS_MIN`, `SHADE_MIN` | **true.** `ai.js:2556-2566`, `:4780`, `:5199` | ai.js |
| Y8 | The Names spend the one pool (`pointsSpent`, `respec`); a respec at 50 costs 30,100 gold | **true.** `progression.js:42-50`, `:100-106` | progression.js |
| Y9 | The bot already reports `minLife`, deaths, potions, per-pack rows | **true** (`balance-act.mjs:381`, `:389`, `:605`, `:813`). Seconds under 30% and the worst 3 s are new bookkeeping, as it says | tool |
| Y10 | "The bump is planned with Act VI's, not after it" (§10.1) | **not true.** Act VI shipped at format 1 (stageE-report). Production's reading is the right one | data.js |
| Y11 | Both zones on the `rime` pack, "less than the Drained Sea loaded"; not measured | **true only with its own READY row.** `READY.rime` brings the `frost` people (30.7 MB) and all of group act5 (`world.js:100`). With a row of its own: about 41.5 + 9.0 + 1.4 + 5 = 57 MB | world.js |
| Y12 | Lesson 5 | **not answered.** A night storm on snow is the picture of Act V | brief |

### Daylight: what it really costs on a phone

- **Lights and shadows: nothing new.** The scene is three.js's own hemisphere light, one directional light with a PCF
  shadow map (1024 on a phone, a 40 m box, `gfx.js:92-105`), the hero's point light and a fixed pool of 3 / 6 / 8 point
  lights. A day is numbers in a row of `ATMOS`. The Weeping Woods are already brighter than production's morning: hemi
  1.05 and sun 1.55 at exposure 1.35 (`atmos.js:14`) against 1.25 and 2.3 at 1.0. In lighting terms "day" shipped in
  Act III. Story's hemi 1.6 with sun 2.2 is a third above anything shipped and will clip on straw.
- **Fog and draw distance: only the cines.** At pitch 0.95 with a 38° lens the top of the screen meets the ground about
  17 m from the camera. In play, pale fog hides nothing and costs nothing. In a cine at density 0.006 the far plane
  (160 m) is still 40% visible (exp(−(0.006 × 160)²)), so the map's edge shows unless walls rise or the shot is framed.
  Budget half a day a cine. Both daylight proposals say this.
- **Draw calls: unchanged in play** (same frustum, same chunked instancers). Tree shadows in a meadow are the forest's.
- **The light-pool system does not assume a dark base in its rules, but it does in its pictures.** Discs, rings and
  telegraphs are additive; on bright ground they lose contrast. Two shipped cures exist: the premultiplied dark pass
  (TELE_DARK) and the screen blend for the ring on snow. Worst cases are snow at noon and gold straw.
- **Ground shading: the same shader**, one more layer read where the dry slot is on (the Weeping Woods' cost).
- **So the cost of daylight is 2.5-3 d of effects work and one look gate, not a rendering system.** Production's plan is
  sound: the day telegraph chosen by the zone's light kind, decals keyed off the kind, exposure 0.92 on snow, the gate run
  at stage 0 **on shipped zones by an atmosphere override**, and Act III's haze as the fallback. Story's plan has the same
  idea for telegraphs, but gates on a grey-box plain that must be built first, and has no answer for additive fire on
  bright straw (it needs alpha flames and the char doing the work).

---

## 3. Each proposal: keep, cut, and the estimates I do not believe

### Production (the base)
- **Keep whole:** both zones and their readings; the Race; the Slide; Kallisto; the stage plan and its gates; §7.3's four
  test rules and the stage-0 debts; §8.4 (saves); §6.3-6.4 (mem7 ≤ 75 MB, perf7's five spots); the cut order; §10.4.
- **Fix on the way in:** P1-P4, P13, P15, P16 above; the one-Mere-level clash in Kallisto's phase 2 (give the arena's
  stream to the brooks' clock, pocket 1, held by `T.force` for the fight, and leave the Race alone).
- **Cut:** the Scorpion build from the plan of record (its sources are gone; it comes back only if stage 0 has a spare
  day); the mason's marks; butterflies; the rainbow as anything but one sprite.
- **Do not believe:** gen7 at 5.5-6.5 (two readings × four water levels each: 6.5-7.5); the Slide at 1.5-2 (2-2.5 with
  the host's event); co-op at 1.5-2 (2-2.5: `coop.js:571`, `:650`, `:846-849` are all gated on `z.act6`). **Mine: 50-61
  as written** against its 47-59.

### Story
- **Graft, with where it attaches:**
  - The hero who cannot sleep, as the act's inner line: `d.morn.1` and the child's `d.child7.1-2` open production's
    q40 hook; the home scene (the child, "what will you do?", the hero's sleep, the four seconds of black) replaces
    production's q46-47 home beat. Kelados is already given «Ξεκουράσου.»: the hero says the word to a mountain and is
    then told it. This is the same story.
  - The last line «Ώστε ξύπνησες.» (`d.isarn.1`) after the sleep; production's «Ο Βορράς ξυπνά, και δεν φοβάται.»
    becomes the line before it.
  - Isarn's lantern woken and hung on the staff (two lines, one small light).
  - Rested (1 d), greeted by the same line.
  - Signe's fail-safe voice (one call a phase from the rim) becomes Halda's at both bosses. Its "fail-safe that does the
    phase's one thing for a player who does not" is a good rule for both fights.
- **Bank for Act VIII, whole:** the Order, Ragna, the Unsleeping, the Vigil House, the Seven Good Nights. It is the
  right next story and its own §1.2 says the road south is Act VIII. Built then, the Burn should be **armed lanes on
  `forge.js`** (a gust fires a lane of dry grass; a burnt lane is spent for the visit; a back-burn spends one on
  purpose), which is the Slide's code with fire's colours, and not cells on `tide.js`.
- **Cut:** the name card as free text at launch (the narration «Του λες το όνομά σου.» is complete without it); the
  Warden's `.w` lines.
- **Do not believe:** the Burn 4-5 (9-12); eight enemy kinds 3-4 (5-6: each carries a Burn hook and a sleep state);
  daylight 2-2.5 (3-4 with the fire); bosses 5-6 (6-8: a body to build or an elk to re-clip); scenarios and balance
  4.5-5.5 (6-7.5: nothing is said about teaching the bot fire); co-op 2-2.5 (3-4). **Mine: 62-74 as written** against
  its 47-58.

### Systems
- **Graft, with where it attaches:**
  - **Its boss law, into the contract's boss section:** a heavy blow is a share of her life before armour, one row per
    difficulty in `HAZ7`, never multiplied by `DIFFS.dmg`; a phase floor that lifts the moment the phase's first move has
    fired; every move assigned to a range band with a count table per boss; the gate "blows landed within ±30% across
    the three classes".
  - **Run C** (the bot's damage doubled must nearly halve the fight) as G3's test for hidden locks, and the new
    measures (`under30S`, `worst3`, heavy blows by move) in `balance-act.mjs`.
  - **The Names, cut to seven,** as the cap layer (§4), with the cairn's Call at production's lookout hearths.
  - "A slide carries foes to the lane's foot and Dazes them" (it bunches a pack where an area skill wants it).
- **Cut:** the wind's push on the hero and on foes (a later act, after a phone test of its own); Vows, the Calls, the
  Vigil (a post-release patch, after the owner rules on the Gates); Tempering; the per-skill load table; ×1.25
  telegraphs on Wanderer; both of its boss bodies.
- **Do not believe:** the wind 3-4 (6-8); the Names 7-8 (9-11 for twelve, with 576 runs of D); post-game 8 (9-11);
  balance 4-5 (6-7 for 1,780 runs and nine bot lessons). **Mine: 76-92 as written** against its 62-75.

---

## 4. The combination

**Title.** «Πράξη VII: Οι Εφτά Κορυφές» / "Act VII: The Seven Peaks". `game.sub7` «Ο Βορράς ξυπνά» / "The North wakes".

**Spine.** It is spring, and nothing in the North is sleeping as it should. The warm air of the lit Gates blows under a
thousand winters of snow; the hero has not slept for three nights and gets up to look at a fire that is burning; a bear
has woken a month early and hungry; and under the Hanging Lake the thaw is waking the one the Stoneborn built their
water-gates on and never once woke. Halda leaves her forge for the first time and climbs with the hero. They open the
old weirs and let the river down a step at a time, leave Kallisto asleep with her cub, and at the ice dam the hero
beats Kelados to his knees and gives him Isarn's word, «Ξεκουράσου.» The lake goes down in a thread. At home the child
asks what the hero will do now, answers for her, and says good night; the hero sleeps while someone else keeps the
light, and the act's last line is the game's first: «Ώστε ξύπνησες.»

| slot | choice | alternative (only where the owner should decide) |
|---|---|---|
| **zone 1** | `thaw`, «Τα Λιόνερα» / "The Meltwaters", level 40, a spring morning. Packs: `melt` (two optional CC0 layers; with none, tinted boot `leaves` and `mud`) over the boot `env`, `trees`, `village` and kits. Group act7: bear, golem, worm, skua. About 17-24 MB cold | — |
| **zone 2** | `tarn`, «Η Κρεμαστή Λίμνη» / "The Hanging Lake", level 43, noon. Packs: `rime` + `melt`. Same group. About 58-65 MB cold. `heavyZone` on until perf7 on the owner's phone says it can come off | — |
| **boss 1** | **Kallisto** on `bear.glb` at ×2.1 (shipped; stand-in `amberBear`, then the boot troll). Not killed | — |
| **boss 2** | **Kelados** on `golem.glb` at ×2.3 with code ice plates, a snow cap and a pine (shipped; stand-in `stonewarden`, then the troll). Not killed. From Gremos: the block thrown at the farthest hero stays as cover, and the bell of the Call rings when he kneels | a new downloaded body, only if the stage-0 look gate says "the Stonewarden again" **and** a clean file is in hand that day |
| **mechanic 1** | **The Race:** `tide.js`'s own-level channel + the weirs' flags. 1 d | — |
| **mechanic 2** | **The Slide:** `forge.js` flues, armed and kicked by something loud, spent 45 s; monsters at full strength, carried to the lane's foot and Dazed. 2-2.5 d | — |
| **mechanic 3** | **Sun and Shade:** `light.js` kind 'sun', shade pools that move, `L.shade`. 2-2.5 d. If G2 shows nobody uses it, production's cut 3 (a whole-zone cloud) | — |
| **cap / progression** | **The Names, seven** (Arna, Isarn, Pherousa at q40; Einar, Keyx, Asger from shipped flags; Ivar from his echo), three slots (free / 6 / 12 points), Kept and Deep (8), the free respec at q40. **The Call is made at a lookout hearth** (the six lookouts are the cairns; each boss arena has one). 5-6 d with its scenario and run D | the Seven Fires alone, as production wrote them (2-2.5 d), if he does not want a new layer to learn |
| **post-game** | **The Seven Fires ladder** (a lookout's rank is the highest difficulty it was held on; the fire over Whitecliff takes the rank's colour), two echoes, and **Rested** with its greeting. 3 d together | Vows on the Gates, in a patch after release, once he has ruled on canon §4 rule 18 |

**What the combination does not carry:** the Order and its fire (Act VIII), the wind's push, Vows, the Calls, the Vigil,
Tempering, the Scorpion, a typed name.

---

## 5. Engine work, stages, risks

### Engine work in dependency order (focused days)

| # | item | days |
|---|---|---|
| 0 | Stage 0: the owner's answers; the contract; the daylight gate on `?world=forest`, `pass`, `farlight` by override at quality 0 and 1; Kallisto ×2.1 and Kelados ×2.3 in the viewer; the stale tests retired or repointed | 2.5 |
| 1 | Plumbing for a seventh act (production's item 1), plus: `forge.js:63` scoped to the Forge; `tide.js` `haz()` and `actHaz` given `HAZ7`; the `z.act6` gates in `coop.js:571`, `:650`, `:846-849` widened; one `groundBlow()` helper under the 16 `vaultOn()` sites | 2-2.5 |
| 2 | `gen7.js`, two zones, two readings, `check-act7` (gen6's helpers moved to genlib with a parity run first) | 6.5-7.5 |
| 3 | Daylight: ATMOS rows, `a.sun`, the 'day' telegraph, decals keyed on the light kind, the 'sun' branches in `light.js` (`lightAt`, `heroLightR`, `baseRing`, `tickLight`), smoke on the peaks | 2.5-3 |
| 4 | `ground7`, `dryLayer`, `setThaw(k)` | 1.25-1.5 |
| 5 | SEA_MELT | 0.5-0.75 |
| 6 | `build7.js` props, the cloud disc, Kelados's ice | 3-3.5 |
| 7 | The Race | 1 |
| 8 | The Slide (host-fired in co-op; rock shards closed with `low = false`) | 2-2.5 |
| 9 | Sun and Shade | 2-2.5 |
| 10 | Enemies (four new defs, packs, `cast7`; the Rock-scorpion on the boot spider) | 3-3.5 |
| 11 | `balance-act.mjs`: Act VII, `under30S`, `worst3`, the bot's lessons (white lanes, kick a chute, weirs, levers); **zone danger measured here** | 2-2.5 |
| 12 | Kallisto, Kelados, on the systems proposal's boss law; run C | 6-7 |
| 13 | The Names (seven), the panel tab, the Call at lookouts, the blow cap's table; run D | 5-6 |
| 14 | Lookouts, the hold event, ranks, the far fires' colours; echoes; Rested | 3 |
| 15 | Story and text: production's beats with the story proposal's hook lines, home scene, sleep, lantern; two proofreaders | 6-7 |
| 16 | Audio | 2-2.5 |
| 17 | Co-op protocol 6 | 2-2.5 |
| 18 | Saves, `SAVE_FMT` 2 in the last commit, `save16` both ways | 0.75 |
| 19 | Scenarios, fixtures, perf7, mem7, regress sets | 4 |
| 20 | Release | 2.5-3 |
| | **Total** | **57-66** |

**Cuts that bring it to 52-60, in order:** Deep Names at launch (Kept only: 1.5 d); lookout ranks by difficulty to one
rank (1 d); crevasses and snow bridges (1 d); the two `melt` layers (0.5 d); one theme (0.5 d); the cub's cine (0.5 d).

### Stage plan
0. **Decisions and look gates** (2.5 d). G0: each gate passed or its fallback written into the contract.
A. **The ground** (items 1-6, `play7` skeleton; 16-19 d). G1: `check-act7` 300 seeds a zone and reading; perf7 ≤ 1.00; mem7 ≤ 75 MB; `save16`; `gate7`.
B. **Systems and enemies** (7-11; 10-12 d). G2: `race`, `slide`, `sun` soaks; `daytele`; `cast7`; **zone danger in band** (0.4-0.8 lives, lowest life 35-65%) before a boss exists.
C. **Bosses, Names, the ladder** (12-14; 14-16 d). G3: both bosses 2-4 min on Warden for three classes, blows within ±30% across classes, run C halves the fight, every Name shown by run D or cut.
D. **Story, text, music, co-op, saves** (15-18; 11-13 d). G4: `hook7`, `catch7`, `ending7`, `echo7`; `coop.mjs act7`; the owner reads the key lines.
E. **Release** (19 finished, 20; 3-4 d). G5: everything passes with no "out of date" row; the owner's phone runs perf7's five spots.

### Top eight risks

| # | risk | mitigation |
|---|---|---|
| 1 | Daylight washes out telegraphs and loot on snow at noon | The gate at stage 0 on shipped zones; `daytele`'s luminance samples at q0 and q1; exposure 0.92; fallback Act III's haze with no plan change |
| 2 | `tarn` reads as Act V by day (lesson 5) | Its stage-0 shot is `farlight` under `ATMOS.tarn`: the owner looks. If it reads blue, more bare rock and scree in slot B and the `let` reading's green rim from the first visit |
| 3 | `tarn` is heavy on the owner's phone (snow and water over the screen) | `heavyZone` on from the start; perf7 on his phone at G1, not G5 |
| 4 | Bosses with no time lock fall in 40 s, or have no teeth | Life set by the bot to the band's floor; heavy blows as shares so armour and healing cannot erase them; run C; G3 fails outside 2-4 min |
| 5 | Kelados reads as the Stonewarden | The look gate with ice, pine and scale; a rooted first phase the Stonewarden never had; the alternative body only if a file is in hand |
| 6 | The Names grow into twelve balance cells | Seven, fixed in the contract; one number each; run D or cut; no Name without its bot play style |
| 7 | The slide trivialises packs, or is never used | Production's measure (15-35% of kills by terrain); 45 s to re-arm; sunlit only; the first chute on the trail is pre-armed over a pack |
| 8 | A trap from an older act silently disables a mechanic (as `forge.js:63` would have) | Item 1's list is done first, and each soak (`race`, `slide`, `sun`) runs on a **v22 hero at quest 39**, never on a fresh test hero |

---

## 6. Decisions for the lead

| question | options | my call | why |
|---|---|---|---|
| Which spine? | the thaw (production); the Unsleeping (story); the twelve nights (systems) | **The thaw, with the hero's sleep grafted in** | The only spine whose mechanics exist. The Unsleeping needs a fire system that is 9-12 d of new module and a boss with no body |
| What happens to the Order's story? | drop; fold in; keep for Act VIII | **Keep whole for Act VIII** | It is the best writing on the table and the road south is its place. Halving it into this act would spend it |
| Daylight or a third night? | full day; sun over haze; night storm | **Full day, decided by eye at stage 0** | Lighting cost is nil (P5-P7); the risk is effects on bright ground, which has two shipped cures |
| The third mechanic | Sun and Shade; the wind; Bank and Wake | **Sun and Shade** | It makes the daylight a rule at 2-2.5 d. The wind is 6-8 d and a control risk; Bank and Wake belongs to the Order |
| A chute's trigger | armed-or-not (production); a load table per skill (systems) | **Armed-or-not** | One shape to read on a phone (a cornice or none); one bot lesson; no table to tune |
| Boss rules | production's six; story's fail-safes; systems' law | **Systems' law on production's fights, with story's fail-safes** | Shares of life are the only numbers here that can reach the brief's danger measures (S12) |
| The cap's reason | Seven Fires; the Names; Rested | **The Names (seven) + the ladder + Rested** | The ladder alone is percentages again. Seven Names is the smallest layer that changes how a hero plays |
| Post-game | Vows, Calls, Vigil; the ladder | **The ladder now; Vows in a patch** | Vows need the owner's ruling on the Gates and a regression test of an unvowed Gate first |
| `SAVE_FMT` | stay at 1; 2 at release | **2 in stage E's last commit** | Production's §8.4 is right; systems' note is wrong (Y10); story is silent |
| Co-op protocol | — | **VER 6, one bump** | All three agree. Chutes and the Race's level are the host's |
| The download | Scorpion; a giant; a bull; none | **None on the plan of record** | Act VI's two never arrived, and the Scorpion's sources are gone from this container |
| Whose test plan? | production's; story's `retire:` notes; systems' runs | **Production's §7.3, plus systems' runs C and D** | The first keeps tests true through the stages; the second proves the fights |
| Wanderer | longer telegraphs (systems); pace only | **Pace only** | "Telegraphs never change" is a rule since Act V (`data.js:32`). Cooldowns ×1.35, heavy share halved, a move fewer a phase |
| The hero's name | a typed card; narration | **Narration at launch** (owner may ask for the card) | A keyboard over a cine on a phone, free text in the record and in co-op, for one line |
| Is the boy Arna? Isarn's lantern? | — | **Owner's word** | Two lines of canon each; both are cheap and both are his |

### Found in the shipped game on the way (for the lead)

Nothing below breaks v22. Each is a trap for the next act.
1. **`forge.js:63`:** `tickFlues` returns for any hero with `flags.crownUnmade`. Right for the cold Forge; it would have
   silenced every flue-based mechanic in all three proposals. Scope it to the Forge's zone.
2. **`forge.js:278` with `map.js:43`:** a shard's cell is closed as a low cell, so sight, arrows and a flue's front pass
   over it. As designed for icicles; wrong for anything called cover.
3. **`world.js:99`'s comment** ("a group the build does not list yet loads nothing") is out of date since today's
   `ACT_FILES.act6` row. **`data.js:60-62`'s comment** ("2 once Act VI's fields ship") is out of date too: Act VI shipped
   at 1.
4. **`PACK_ORDER` lists `silt`** (`env.js:13`) and `zonePacks` asks for it, with no pack and no pack tool. It works by
   fallback; say so in the contract or build it.
5. **`world.js:1603` and `coop.js:648`:** the gust clock is the Farthest Light's alone and assumes 40 s on both sides.
6. **The Act VI gate sources** (`/tmp/claude-0/sf/act6/`) no longer exist. `asset-gates.json` still points at them.
