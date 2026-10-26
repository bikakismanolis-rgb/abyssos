# Skotos Act V ("The Frozen Coast"): engine brief

Design input for the Act V plan. It covers how an act is wired end to end, what a frozen coast can reuse, what is missing (with costs), the level curve, the memory and size budget, and the asset pipeline. Paths are relative to `skotos/` and line numbers are as of this session (the Act IV finale, quest 23). Nothing in the repository was changed.

How the numbers were got:
- The artifact was built into the scratch folder: `vite build --mode artifact --outDir <scratch>/dist-artifact`, then `node tools/make-artifact.mjs <scratch>/artifact <scratch>/dist-artifact`.
- GLB triangles, textures and clips come from `tools/glbinfo.mjs`. The GPU estimate script is `<scratch>/act5/gpu.mjs`. It has to run from inside `skotos/` to resolve `node_modules`, so it ran from a temporary copy in `tools/`, which was deleted afterwards (`git status` is clean).
- Layer sizes were read with PIL.
- Network checks were plain HTTP status probes through the proxy.

---

## 0. Ten facts that shape Act V

1. **All walkable floor is at y = 0.** In `gen4.js:101-113` `terrain()` sets every floor corner to 0. Holes sink and solid ground rises, but only as visuals. Actors are drawn at `a.y || 0` (`ai.js:104`, `player.js:113`), and blob shadows sit at y 0.04 (`actors.js:93`). So tidal flats, ice shelves and decks cannot have real height without new engine work (§3.12). A water surface *above* the floor (y 0.05 to 0.35) gives wading for free.
2. **The gameplay camera never sees the sky.** It sits at pitch 0.95 rad with a 38° vertical FOV (`gfx.js:16,46,211`), so the top of the screen still looks about 35° below the horizon, and `scene.background` is the fog colour (`gfx.js:125`). An aurora shows up in play only as light and as reflections in water or ice. As a sky it appears only in cinematics that lower the pitch (`c.pitch`, `boot.js:309-310`; Act III uses 0.34).
3. **The walk grid is static data with runtime patches.** `GridMap.open()` (`map.js:28-38`) bumps `ver` and resets the flow field. `setSolid()` (`map.js:25`) bumps `ver` but does **not** reset `flowT`, and there is no `close()`. Tides and breaking ice need a batched `close()`.
4. **Liquids are already done twice.** The lava sheet (`build.js:1319-1367`) and the Amber Mere (`build.js:1681-1755`) are both made of per-cell quads. The Mere also carries a shore-distance attribute (`aDep`), alpha fading at the bank, fresnel sky reflection and a sun glint, which makes it the best starting point for a cold sea. The decks over the amber (`L.deck`, `gen3.js:5,213`) are a ready pattern for piers.
5. **Light and Shroud is a finished, act-gated system.** `light.js` is switched on only for `ashfield` and `forge` (`light.js:17`). Sea-lights, warmth and "the Skotos is the dark" can all sit on it.
6. **The Forge's Breath (`forge.js`) is a generic telegraphed line hazard.** It has a fixed 2.0 s inhale, line-of-sight cover and a hit worth a share of max life. Storm surges, waves down a fjord and katabatic gusts are a recolour plus a damage swap.
7. **Statues frozen in ice are nearly free.** Any actor with `a.statue && !a.awake` stops animating and turns ice-blue `0x80c8ff` (`ai.js:108-112`); this is the Stonewarden's path (`actors.js:174`). The keepers' statue path (`actors.js:294-303`) wears any model.
8. **Nothing is ever unloaded.** Packs, people sets, creature templates and every visited zone stay resident for the session (`env.js:133-148`, `people.js:61-66`, `creatures.js:41-52`, `world.js:186`). A full run Acts I-IV holds about 560 MB of GPU texture on a phone (§5).
9. **Swimming is not available.** None of the 114 clips in `moves.bin` swims, and movement is 2D. Deep water is a wall, like lava. A fall through ice becomes a "plunge" event (§3.10).
10. **The artifact today:** 119 files, 53.5 MiB, the largest 3.64 MiB (`ash`). Each act adds about 10-11 MiB of artifact. bpy can be pip-installed in this container (§6.2), but Acts II-IV were built without Blender.

---

## 1. Touchpoint checklist: everything an act wires

`[ ]` marks what Act V must add or extend. The Act IV entry is the model to copy.

### 1.1 Zones and exits
- [ ] `ZONES` entries (`game/world.js:31-45`): `{ level, music, ambient (FX), atmos, act: 5, pack }`.
- [ ] Exits are data in the generator: `L.exits.push({ x, z, to, label, locked })` (Act IV: `gen4.js:483,486,866`; town `gen.js:398-399,468,481`). `createZone` turns them into interactables (`world.js:138`). `takeExit` checks `flags[locked]` and gives the refusal line from the `why` map (`world.js:351-360`).
- [ ] Arrival point: `enterZone` steps the hero in 2.5 m north or south of the exit whose `to` equals the zone she came from (`world.js:217-222`). The only east/west case is the town's west lane (`world.js:220`), so an Act V exit on a side wall needs its own case.
- [ ] Where Act V's road leaves from. "North of the Field of Ash" means `genAshfield` (north end: the Anvil Gate plaza, `gen4.js:166,263`, z ≈ 24 on a 112 × 192 map) or the Forge's crater. Rules:
  - Saved seeds must not change. Carve the new road **last**, with its own RNG and after the reach checks, the way the town did for Acts III and IV (`gen.js:458-481`) and the cranes did ("a saved seed's Forge is unchanged but for the cranes", HANDOFF).
  - Run a parity check over the seeds against `HEAD`.
  - Do **not** add the new exit to `tryAshfield`'s `need` list (`gen4.js:525-527`). That would make some old seeds retry into a different layout.
- [ ] A second waypoint inside a zone is possible: `camp2`, `'ashfield@2'` (`world.js:216,616-622,777-780`, `panels.js:163,277`).
- [ ] Waypoint list: the zone ids are hard-coded in `ui/panels.js:163`.
- [ ] Respawn checkpoints: `z.checkpoint` (`world.js:731`, `boot.js:156`). Use them for sea-lights.

### 1.2 Level generation
- [ ] A new `src/world/gen5.js`, mirroring `gen4.js`:
  - helpers `reach` (`:18`), `nearReach` (`:29`), `terrain` (`:101`) and `groundY` (`:118`);
  - a deterministic retry loop `seed + k*7919` that accepts the last try (`:149-152`, `:537-540`);
  - reach checks after dressing (`:523-529`, `:904-912`).
- [ ] The dispatch chain in `createZone` (`world.js:88-96`).
- [ ] The layout carries `cells`, `paint`, `low`, `lava`/`amberDeep`/`sap`/`deck` masks, `hgt`, `spots`, `packs`, `lights`, `props`, `exits` and `start` (`gen.js:4-5`, `gen4.js:1-9`). Act V adds masks such as `L.sea`, `L.tide` (the flood height per cell), `L.ice` and `L.thick`.
- [ ] `L.hgt` makes `buildGround` take the height path (`build.js:1088,1110-1129`). **Caveat:** `ground4()` returns the *Forge* config for any type that is not `ashfield` (`build.js:1075-1077`), so Act V needs its own `GROUND` entries or a `ground5`.
- [ ] Shadow Gates use only `genCrypt` and `genForest` (`world.js:96`). An Act V tier layout is optional.

### 1.3 Build and visuals (`world/build.js`)
- [ ] `buildLevel` (`:2703-2727`):
  - ground (`buildGround` `:1079`, `groundMat` `:1219` with its options: three layers plus a wall layer, a painted per-vertex mask `aSap` and a global blend `uAutumn`, `:1230-1240`);
  - `buildLava` (`:1319`), `buildAmber` (`:1681`), `addProp` (`:538`);
  - the per-act level hooks `act3Level` (`:1757`) and `act4Level` (`:2238`, gated by `ACT4` `:1957`);
  - `townBeyond` (`:2732`, ground running past the map edge into the fog: the pattern for a sea reaching the horizon).
- [ ] Props: `act3Prop` (`:1778`), `act4Prop` (`:2417`) and the `PROP4` table (`:2453`) return `Object3D`s whose `userData` carries `setLit`, `setOpen`, `open(dt)`, `breathe`, `melt` and similar. Add an `act5Prop`.
- [ ] World switches: `setAutumn` (`:1456`), `setNight` (`:2281`), `setHeat` (`:2296`), `setFlueGlow` (`:2305`). The uniforms live in `WIND` (`:18`; `uSnow`, `uWind`, `uAutumn`, `uTime`), `HEAT` (`:1955`) and `NIGHT` (`:1956`).
- [ ] `drapable`/`drape` (`:2670-2691`) lay decals over the L.hgt ground. Light pools, cones and the Cradle ring use them.
- [ ] Instancing: `Instancer` (`:409`) and `Batch` (`:499`). Prop footprints are blocked cells (`blockRect` `gen.js:51` takes a rotation).

### 1.4 Atmosphere and FX ambients
- [ ] `ATMOS` entries (`world/atmos.js:2-24`), plus variants for each world state (Act IV has `ashfieldStars`, `ashfieldDawn` and `forgeCold`; `heatAtmos` blends, `:27`).
- [ ] `enterZone` sets the ambient and the atmosphere (`world.js:196-211`). `WIND.uSnow` is switched on only for `pass` (`world.js:200`); extend it.
- [ ] Easing between states: `mixAtmos` (`world.js:529`, module-private) and `firstAutumn` (`world.js:512`). The easing uses `heatTo` and `updateAct4` (`world.js:853,966-973`).
- [ ] FX ambient particles (`gfx/fx.js:405-477`): the rate table is `:408-409`, then one branch per kind (`'snow'` `:422-427` already exists). Emitters such as `mist` and `lowmist` are at `fx.js:373,402`.

### 1.5 Packs, people sets and creature groups: how they load and unload
- Loading happens per zone, at first visit, under the travel fade (`boot.js:114-137`):
  - `zoneReady(id)` (`world.js:63-68`) loads `zonePacks(id)` (the zone's `pack`, plus `deep` for `forge`, `world.js:62`), then `READY[pack].folk` (people sets) and `READY[pack].creatures` (a creature group);
  - `READY` is the map at `world.js:61`, and `zoneParts` (`world.js:70`) sizes the loading bar.
- Boot loads Act I: the kits, `people.glb` + `moves.bin`, Act I creatures, `env`, `village` and `trees` (q ≥ 1) (`boot.js:58-61`). A story scene may load a set ad hoc; Brokka in town calls `loadFolk('folk')` (`story.js:507`).
- [ ] **Pack:** `loadPack(name)` (`gfx/env.js:133-148`) reads `src/assets/<name>.glb` and `src/assets/<name>/*_{d,n}.webp`, which the globs pick up automatically (`env.js:121-122`). Add the name to `PACK_ORDER` (`env.js:13`): a bare prop or layer name belongs to the earliest pack in that order.
- [ ] **People set:** `loadFolk(set)` (`gfx/people.js:61-66`). The file must be listed by name in the `SET_URLS` glob (`people.js:15`).
- [ ] **Creature group:** `ACT_FILES.act5` (`gfx/creatures.js:34-39`), plus `CAST` rows `model → [file, base scale]` (`creatures.js:18-30`). Files under `src/assets/creatures/` are globbed automatically (`creatures.js:13`).
- **Unloading does not exist.** Packs, sets and templates are cached promises. Zones stay in `G.zones` (`world.js:186`) with their meshes and actors.
  - `diffChanged` drops cached zones without `disposeZone()` (`boot.js:172`), so their GPU buffers wait for GC. Fix this if Act V adds big meshes.
  - If Act V needs headroom, see §5.4 for the unload option and its cost.

### 1.6 Combat data (`game/data.js`)
- [ ] `MONSTERS` (`:50-105`; Act IV `:88-102`). The fields are listed in §1.8.
- [ ] `PACKS` weights (`:106-149`). `PACK_LEAD` lists the leads that come first (`:151`), `PACK_DORMANT` the packs that lie disguised (`:154`), and `PACK_LINE` holds the shield-line formation (`:156`). `packKinds` is at `:158`.
- [ ] `BOONS[5]` (`:165-187`).
  - The Unbound ×1.5 bonus is wired only to `BOONS[4]` (`stats.js:24`, `panels.js:230`).
  - `offerBoons` loops over acts `[1, 2, 3, 4]` (`story.js:449`).
- [ ] The champion stand-in for big kinds is a chain per zone (`world.js:286`). The difficulty table is in §4.
- The curves (`:202-206`) need no change. `MAX_LEVEL` is 50.

### 1.7 Actors (`game/actors.js`)
- [ ] `STAND_IN` fallbacks (`:46-55`): every new model needs one, so a missing asset never breaks the game. `STAND_SCALE` is at `:57`.
- [ ] The tint a stand-in wears: `TINT_IN` (`:208`; a tint amount above 1 drains the colour first).
- [ ] A spawn hook like `act4Spawn` (`:209-225`; it fits cones, masks, shackles, crowns and keeper statues).
- [ ] `spawnNpc` cases (`:372-394`). The `ghostly()` look is at `:396`.
- Dormant and disguised spawn (`:186-205`): `def.wake` together with a pack in `PACK_DORMANT`. A `pose` adds a mound mesh.
- Level: `monsterLevel = max(zone.level, hero.level + (diff ≥ 3 ? 2 : 0))` (`:137-140`). Elite multipliers are at `:148-151`.

### 1.8 AI behaviours and traits (`game/ai.js`)
The behaviour table `AI` (`:255-726`), by its `def.ai` keys:
- **Commons:**
  - `melee` (`:256`): trait `spinEvery`, a 360° spin every n-th blow; trait `bashEvery`, a shield dash with push;
  - `ranged` (`:283`): aim, then fire `def.proj`; backs off under 4.5 m;
  - `caster` (`:304`): hexes and a heal pulse;
  - `pounce` (`:324`): a leap at 3.5-7 m;
  - `brute` (`:342`): wind-up, telegraphed cone, every third blow a slam. With trait `chain` it becomes `hammerhorn` (`:1884`, posted on a chain, `chainTick` `:1981`);
  - `wraith` (`:375`): blinks beside the hero;
  - `bat` (`:387`): flies, swoops, bites (trait `biteSlow`).
- **Act II:** `burrow` (`:410`): underground ridge, emerge, spit; `runepriest` (`:459`): wards kin and throws embers.
- **Act III:**
  - `hollow` (`:480`): takes root once when hurt; fire cracks it;
  - `rootling` (`:498`): under a mound, the pack bursts out, a shriek cone;
  - `charger` (`:526`): rear, charge, dazed against a wall or sap;
  - `skirmisher` (`:563`): shoots, hides in the trees, every third arrow pins;
  - `rooted` (`:594`): a turret with lash, spikes and sap weeping;
  - `tether` (`:636`): a Mourner's bond makes a guard immune;
  - `node` (`:686`): a Heartroot that feeds a boss or sprouts rootlings; keeper statues use it too.
- **Act IV:**
  - `watch` (`:1489`): patrol, cone, alarm, shroud;
  - `snuffer` (`:1545`): eats lamps, gorges, relights on death;
  - `diver` (`:1639`): airborne and untargetable, dive token, lands, a lamp blinds it;
  - `latcher` (`:1731`): clings to the hero's back;
  - `forger` (`:1789`): mends and reforges the remains of the fallen.
- **Bosses:** `weaver` (`:969`), `lord` (`:980`), `stonewarden` (`:992`), `molten` (`:1038`), `silverhorn` (`:1092`), `amaranthe` (`:1215`), `ivar` (`:1998`), `karthax` (`:2167`), all run by `boss()` (`:1414-1469`). `pet` uses `petAI` (`:919`).
- **Traits read from MONSTERS:**
  - ai.js: `reach`, `atk`, `atkTime`, `proj`, `poison`, `burns`, `drain`, `biteSlow`, `spinEvery`, `bashEvery`, `chain`, `float`, `anchored`, `burst`, `wake {d, clip, pose, sfx, t, speed}`, `guard {arc, k}`, `shroud`;
  - actors.js: `hunch`, `armor`, `shield`, `look {scale, tint, tintAmt, rim, rimI}`, `wlook`, `weapon`, `style`, `animSet`;
  - combat.js: `flesh`, `dieClip`, `dieSfx`, `sfx`, `deathSap`, `deathDust`, `deathFire`, `big`, `xp`, `boss`, `pet`;
  - only forge.js reads `fireproof`; only world.js reads `rises`.
  - **Two dead fields:** `armored` (on `ash`, `data.js:57`; `spawnMonster` reads `def.armor`, `actors.js:173`) and `heals` (on `goblinShaman`). Neither is read anywhere.
- **Elite affixes** (`data.js:199`, `ai.js:942-966`): `fast`, `vampiric`, `molten`, `frozen` (a frost orb), `shielding`, `teleporter`, `thunder`, `horde`, `armored`.
- **Shared helpers:**
  - `seek` (`:157`), `skirt` (`:182`), `aggroCheck` (13 m with line of sight, `:205`), `idle`, `startAttack`/`attackTick` (the `ATK` table `:23`);
  - `daze` (`:767`), `dashStep` and `startDash` (`:785-811`; `sapDaze` stops a charge in sap), `crackStone` (`:818`), `openCells` (`:834`);
  - `lob` (`:738`), `fly` (`:729`).
- `AI_LOG` (`:34`) and the DEV hooks `window.__act3`/`__act4` (`:36-39`) are what the scenarios read. Add `__act5`.

### 1.9 Bosses
- [ ] A boss table: `{ name, phases: [p1, p2], wake, intro(a), onPhase(a, ph, was), tick(a, dt, pl, d), moves: [{ id, when(a, d), cd | phaseCd[] | cdOf(a, ph), run(a, pl) → { t, fn, after, chain, chainFn, leap, noFace, stall } }] }`, run by `boss()` (`ai.js:1414`).
  - Engine hooks: `a.lockPhase`, `a.hpFloor` (a phase no single burst skips; set at spawn, `actors.js:221-222`), `a.holdWake` (the story keeps the boss asleep: Karthax, `world.js:261`), `a.dazed`, `a.ward`, `a.hidden`, `a.queue`.
  - Light overrides: `setHeroLight` and `setLightDark` (`light.js:50-52`).
- [ ] Spawn: `z.bossSpot` is set in the zone builder; `updatePacks` spawns it within 30 m (`world.js:255-263`).
  - Level: `max(zone.level + 2` for the first boss of an act, `+3` for the second, `, hero.level + 1)`.
  - The "first boss" list is hard-coded (`world.js:257`).
- One boss bar: `G.bossActor` (HUD). Statues and NPCs are not bosses.
- [ ] The death routes to story through the `kill` event, with a `kind === … && zone === …` branch per boss (`story.js:274-289`). Set a `…Down` flag at once so a game closed during the last words replays them (`story.js:153,159`).

### 1.10 Story: quests and cinematics (`game/story.js`)
- [ ] `questText` clamps at 23 (`:25`); raise it. Counters are formatted there (q12, 14, 18, 20).
- [ ] `setQuest(n)` (`:32`).
- [ ] Catch-ups on `zoneEnter`: flags were saved but the quest step was still on a timer (`:144-150`).
- [ ] `npcHasNews` (`:39-48`), `talk` (`:55`), `zoneEnter` greetings (`:120-168`) and `voice` (`:170`; place voices `z.voices`, muted per act at `world.js:266`).
- [ ] Cinematics: `emit('cine', { x, z, dur, zoom, pitch?, steps: [[t, fn]], until?, end })`, run by `cineTick` (`boot.js:174,299-318`).
  - The camera eases in over 1.6 s and out over 1.2 s; `pitch` lowers the camera toward the horizon.
  - A scene ends with 1 s of hero iframes.
  - Dialogs: `emit('dialog', { who, lines: [key | [key, who]], end })`. Ranger kin lines use `rl()`/`rls()` (`:50-51`).
- [ ] Scene helpers: `walkTo`, `stopWalk`, `vanish` and `growProp` (`world.js:905-952,483`), `walkPath` (`story.js:544`), `farFire` (`world.js:51`), `beaconScene(act, mode)` (`story.js:407`, the `BEACON` table `:401`), `fireStream` and `glowBurst` (fx.js).
- [ ] `actComplete(act)` (`:464-476`) writes `h.actN`, quest and flag; its last branch is hard-wired to act 4. It plays `newfire` or `victory` and opens the act panel (`panels.js:222-226` reads the keys `actN.done`, `.sub` and `.next`).
- [ ] The quest marker: `questGoal()` in `ui/hud.js:238-268`.

### 1.11 World-state flags
- The Act IV pattern (repeat it for Act V):
  - a flag is saved **first**, before its scene plays (`story.js:522`, `:860`, `:886`);
  - world.js reads flags on every zone build and entry (`act4Zone`/`act4Enter`/`act4Presence`, `world.js:582-709`; derived states `nightMode` and `forgeHeat`, `:551-554`);
  - quitting mid-scene never strands a save.
- Town switches: `townFires`, `setFar`, `setBeacon` and `townPresence` (`world.js:1003-1085`). `FAR_BEACONS[3]` is the `seed: true` fourth fire, lit by `newFire` (`world.js:49,1008`).
- Packs filtered by state: the Lampless are removed after the Unmaking (`world.js:674`).

### 1.12 Saves and migration
- One localStorage entry, `skotos.save.v1` (`game/save.js:4`), holding every hero. Hero record: `newHero` (`game/state.js:23-32`; act fields `:28`). Zone seeds are kept per hero in `h.seeds` (`world.js:72-76`).
- [ ] Add `act5: -1` to `newHero`. In the `startHero` migration (`boot.js:93-99`) add `hero.act5 ??= -1` and `if (hero.act5 >= 0) flags.act5 = true`.
- [ ] An Act IV hero at quest 23 with `newFire` must read as "Act IV done, Act V not begun". Tide, ice and floe states are runtime only; zones rebuild from the seed each session.
- Difficulty change wipes cached zones (`boot.js:172`).

### 1.13 HUD and UI
- [ ] The minimap repaints on `emit('mapChanged')` (`hud.js:179-195,271`). Its colours are floor or wall only; water needs a colour.
- [ ] Status meters:
  - the amber build-up meter (`hud.js:130-136`, `#amber`) is the template for a Cold meter;
  - the Clinging badge is at `hud.js:140-142`;
  - buffs, with the eye for Seen, at `hud.js:126`.
- [ ] Panels: waypoint list `panels.js:163`; act panel `:222-226`; blessing panel and Unbound flag `:229-230`; difficulty unlock `:245-249`.

### 1.14 Audio (`audio/audio.js`, all procedural WebAudio, no files)
- [ ] `THEMES` (`:1684`): 17 themes so far (title 1685, town 1713 … ashfield 1967, ivar 2001, forge 2025, karthax 2057, newfire 2080, victory 2100). A theme is `{ bpm, beats, sub, bpc, gain, scale (or a getter on MOOD), progs, drums, bar(S), step(S) }`.
- [ ] `MOOD` and `MOOD_RANGE` (`:1629-1632`), the story-driven state set through `Audio.mood({...})` (`:2338`).
- [ ] `SFX` (`:592`, 103 entries; Act IV's at `:1237-1325`), played by `Audio.sfx(name, {x, z, vol, pitch})` (`:2355`; unknown names are ignored). `STINGS` (`:1380`, 9 entries) are played by `Audio.sting` (`:2367`).
- Per-zone moods are set in the main loop (`boot.js:289-292`).

### 1.15 Echoes (boss refights)
- [ ] `echoAt(z, boss, x, z)` and `ECHO_PROMPT` (`world.js:458-463`), called from the zone builder once the boss is down (`world.js:426,450,634,655`).
- [ ] The `story.js` echo handler (`:376-398`) hard-codes the rise distance and the tint (`ash` means ivar or karthax, else amber). The `kill` handler does the same for echoes (`:183-191`). Add an Act V tint (frost or Skotos-black).
- Echoes are once a day and never touch the story (`it.used`).

### 1.16 Credits
- [ ] `src/ui/credits.js` arrays (headed `cr.*`), `CREDITS.txt`, the per-pack `src/assets/<pack>/CREDITS.txt` (the pack tools write it), the table in `tools/creatures/README.md` and the scene extras `credit`/`license` inside each GLB.

### 1.17 Text (`src/i18n/text.js`, Greek first)
- [ ] Key families:
  - `zone.<id>`, `zone.<id>.s`, `exit.<id>`;
  - `q.24…`;
  - `d.*` (and `.r` ranger variants);
  - `act5.done`, `.sub`, `.next`;
  - `boon.<id>`, `.d`, `.du`, `.q`;
  - `echo.<boss>`, `echo.rise5`, `echo.done5`;
  - `hud.*` for new statuses;
  - `load.*` and `cr.*` if needed.

### 1.18 Debug views
- [ ] World viewer: `?world=<zone>&seed=` (`debug/viewer.js:147-198`). It hard-codes its generators and its per-act pack loads (`:151,158`).
- Creature viewer `?cview&only=` (`debug/creatureview.js:16`), people viewer `?viewer&only=p:<name>`, zone jump `?auto=<zone>&lvl=N&q=1`.

### 1.19 Scenarios and layout checks
- [ ] Scenarios live in `tools/scenario.mjs` (Playwright at `/opt/node22/lib/node_modules/playwright`, `:4`; browsers at `$PLAYWRIGHT_BROWSERS_PATH`).
  - Each is `S.<name> = { q: 'auto=<zone>&sim=6&q=1&norender&lvl=N&cls=…', run(pg, shot) }`, with the `A4` helpers (dialog stepping, `say` capture, boss strike-down, `:12-31`).
  - Act IV set: `ashfield, ivar, forge, karthax, cagetime, ending4, cast4, echo4` (`:368-670`).
  - Act V needs about 7: coast, boss 1, zone 2, boss 2, ending5, cast5, echo5, plus a tide and ice soak.
- [ ] `tools/check-act5.mjs`, modelled on `check-act4.mjs`: sweep N seeds, sort failures into `hard` and `soft` sets, exit 1 on any hard one (`:1-17,140-141`).
  - Act V must check reachability at **both** tide extremes.
  - The thick-ice spine must stay unbreakable.

### 1.20 Artifact build and publish
- `npm run build:artifact`:
  - `vite build --mode artifact` inlines every asset into its own lazy JS chunk (`assetsInlineLimit: 1e8`, `vite.config.js:15`);
  - `tools/make-artifact.mjs` turns `dist-artifact/index.html` into a page fragment, rewrites `./assets/` to `assets/`, and copies the assets except `viewer*`.
- Every file must stay under 16 MB. Today the largest is 3.64 MiB, so one Act V GLB of up to about 10 MiB raw would still fit.
- Publishing (HANDOFF): run a strict-CSP local check with `tools/csp-server.mjs` (no CSP violations, no white models, desktop and mobile contexts), then update the artifact in place with a `files` map of only the changed hashes, and `null` for removed files.

---

## 2. Reusable systems, and how a frozen coast can use them

| System | Where | Frozen coast use | Change needed | Cost |
|---|---|---|---|---|
| **Light and Shroud** | `light.js` (zones `:17`; `lightAt` `:28`; `lampAt` `:40`; `heroLightR`/`setHeroLight`/`setLightDark` `:45-52`; lamps `isLamp`/`lampNear`/`snuffLamp`/`relightNear` `:57-82`; pools `addLightPool` `:87`, movable plain objects; Cradle `:131-158`, drink `:161`); shroud damage ×0.3 outside light, reveal 3 s (`combat.js:205-211`); `shroudLook` (`ai.js:119`) | **The Skotos is the dark.** Its spawn are Shrouded and the sea-lights are `it.lit && it.lightR` interactables. The Smoke-eater AI (`snuffer`) becomes something that douses sea-lights. `setHeroLight(2.5)` and `setLightDark` serve a boss's "under the ice" phase. A **lighthouse beam** is a pool moved round a circle each frame, or the Lampless cone (`actors.js:246`, `inCone` `ai.js:1473`). **Warmth** reads `lightAt` (fire, lamps, pools mean warm). | Make `ZONES` per-zone (`ZONES[id].light`); recolour the ring and Cradle (a keeper's lantern?); add a beam helper | 0.5-1 d |
| **Amber slowing and rooting** | `sap.js` (cell mask `L.sap` plus pools, `sapAt` `:44`, capped at 24, drips `:89-115`); hero build-up then root (`player.js:63-69`; `rootHero`/`freeHero` `combat.js:156-175`, root 1.2 s, then 1.8 s immune, a dodge breaks it); monster slow ×0.65 (`ai.js:79`, `combat.js:345`); a charge into sap is dazed (`ai.js:793,814`); HUD meter (`hud.js:130-136`) | **Slush or meltwater** (a mask plus pools) and **frost-lock**: stand in it, the meter fills, and the hero is frozen 1.2 s with an ice tint (swap `0xffb040` at `player.js:68`). Brutes charging into slush or onto thin ice slip and daze. Wading in shallow tide water reuses the slow branch. | Generalise colour, sfx and labels; second mask `L.slush`; per-zone pool look | 0.5-1 d |
| **The Forge's Breath** | `forge.js` (`BREATH` `:19`: 2.0 s inhale never shortened, 1.2 s fire, 20% max life (12% on Wanderer), monsters ¼, period 10 s, ≥ 4.5 s; cover by `map.los` `inFlue` `:41`; `startFlues`/`stopFlues`/`setFlueHeat`/`setFluePumping` `:22-38`; vents `:137-158`; slag drips `:109-135`); ticked from `updateAreas` (`projectiles.js:183`) | **A storm surge or rogue wave** running down a fjord channel (a line from the sea mouth, rocks as cover, push plus Cold instead of burn), **a katabatic gust** off a glacier, **ice geysers** (vents: a line through the hero every 12 s), **icicle falls** (the slag drips pattern: `slag(x, z, r, dur)` with a teleCircle, then impact). | Factor it into a parameterised "breath" module (colour, particles, sfx, damage opts, gate flag; today it stops on `flags.crownUnmade`, `:49`) | 1 d |
| **Act II snow, chasm and bridge** | `genPass` (`gen2.js:13-14` `L.low`/`L.chasm`, bridge `:64-80,131`); bridge prop (`build.js:885`); chasm mist emitter (`build.js:649`, fx `mist` `:402`); snow ambient (`fx.js:422-427`); `WIND.uSnow` (snow on tree tops and rock faces, `build.js:149,191,369-400`; set only for `pass`, `world.js:200`); `pass` ground with the deep pack's `snow` layer (`build.js:1058`) | Crevasses and fjord gorges (low cells: arrows and sight pass, feet do not), ice and rope bridges, spindrift, snow on everything | Turn `uSnow` on for Act V zones; new snow and ice layers in the pack | 0.25 d |
| **Lava surface** | `buildLava` (`build.js:1319-1367`): quads at y −0.32, `uHeat`, crust texture | The cheapest **black water with brash ice** for static channels (crust becomes floating ice, melt becomes dark water) | New palette and program key | 0.5 d |
| **Amber Mere** (the better water template) | `buildAmber` (`build.js:1681-1755`): shore-distance BFS, `aDep` attribute, alpha thinning at the bank, fresnel sky, glint, crowns mirrored; `L.deck` walkable decks over it (`gen3.js:5,213`) | **Sea, fjord water and shore** (§3.1); **piers and wreck decks** as deck cells | A cold shader variant and a tide uniform | in §3.1 |
| **Heat and night world switches** | `setHeat` / `heatAtmos` / `heatTo` with eased `updateAct4` (`build.js:2296`, `atmos.js:27`, `world.js:853,966`); `setNight` with stars, glow and lantern emissive (`build.js:2281-2293`); derived states (`world.js:551-554`); `act4Enter` reads flags (`world.js:660-689`) | `setTide(k)`, `setAurora(k)`, `setFreeze(state)` for the world-state change: the sea freezing over or the Skotos rising | Same pattern; a frost layer through `groundMat`'s `dry` / `uAutumn` global blend (`build.js:1233`) | 0.5-1 d |
| **Dormant enemies** | `PACK_DORMANT` with `def.wake {d, clip, pose, sfx, t}` (`data.js:154`, `actors.js:194-200`); wake on distance, a hit, or a pack-mate (`ai.js:59-65`); ash mound mesh (`M.ashMoundParts`) | **The drowned under snow mounds**, rising as the hero passes; with `pose: 'bonePile'`, `KK_Skeletons_Awaken_Floor` | Snow-mound geometry and a frost look | 0.25 d |
| **Statues** | `a.statue && !a.awake` is frozen with an ice-blue tint (`ai.js:108-112`); keeper statues wear any model with a pose (`actors.js:294-303`); only a scripted blow breaks them (`combat.js:49`); `node` AI | **Figures frozen in the ice**: enemies that thaw (fire or the story wakes them), keepers frozen at their posts, a boss phase like Karthax's cages | Wake rule for non-boss statues (`a.awake = true` on a condition) | 0.25 d |
| **Burrow, rootling, diver** | `ai.js:410,498,1639` | **Something under the ice**: a ridge of cracking ice hunts the hero and bursts up through it (burrow, breaking ice where it emerges); things waiting under ice holes (the rootling burst); **a diver** that goes under the water (untargetable while submerged, `a.airborne`/`a.hidden`) | Swap visuals; tie emergence to the ice system | 0.5 d each |
| **Cinematics** | `cine` (`boot.js:174,299-318`), `pitch`, `until`; `beaconScene` lean (`story.js:418-425`); far fires and sprites (`world.js:51,1015`) | The aurora reveal (lower `pitch` to about 0.1-0.2), sea-lights answering one by one down the coast (the `farFire` sprites and stagger of `fireAnswers`, `story.js:884-900`), the Skotos stirring under the ice (shake, light, crack decals) | none | 0 |
| **walkTo** | `world.js:905-952`: straight line, no pathing; `vanish` fades and removes; ticked in every zone (`updateAct4` runs `tickWalks` first, `:957`) | Keepers walking out on the ice, ghosts of drowned crews, NPCs boarding a boat | none (paths must be clear) | 0 |
| **Echoes, boss framework, guard/shield line, Seen, Clinging, remains** | `world.js:459`, `ai.js:1414`, `combat.js:181-291` | Echo refights; ice-shield guard lines; latching things (barnacle or ice leech) | none | 0 |

---

## 3. What a frozen coast needs that does not exist yet

Costs are focused days for one agent who knows the code, including scenario coverage but not assets. They are measured against Act IV pieces of similar weight: `light.js` 236 lines, `forge.js` 159, `gen4.js` 916.

| # | Feature | Honest cost | Risk |
|---|---|---|---|
| 3.1 | Sea / water surface and shoreline | 2-3 d | Medium (phone fill-rate) |
| 3.2 | Tides that move the walkable area | 3-4 d | Medium-high |
| 3.3 | Ice that cracks under weight | 2-3 d | Medium |
| 3.4 | Ice floes | 0.5 d (static), 1.5-2 d (discrete hops), 4-6 d (true drift) | Low / medium / high |
| 3.5 | Aurora sky | 1-1.5 d | Low |
| 3.6 | Falling snow | 0-0.5 d | None |
| 3.7 | Fog banks | 0.5-1 d | Low |
| 3.8 | Ships and wrecks | 1.5-2.5 d (pack + placement) | Low-medium (triangles) |
| 3.9 | Under-water / under-ice spaces | 3-5 d for a dry under-ice cavern zone; true underwater not feasible | Medium |
| 3.10 | Swimming | Not feasible; plunge instead (0.5 d) | n/a |
| 3.11 | Cold damage and warmth | 1-1.5 d | Low |
| 3.12 | Walking on non-zero ground (if wanted) | 0.5-1 d | Medium (touches everything that draws at y = 0) |
| 3.13 | Act-agnostic plumbing for a fifth act | 1.5-2 d | Low |

### 3.1 Sea / water surface and shoreline (2-3 d)
- Start from `buildAmber`: per-cell quads over sea cells, tidal cells and one cell beyond, plus a shore-distance BFS attribute. Add these:
  - a seabed attribute `aBed` from L.hgt and a uniform `uLevel` (the tide). Depth is `uLevel − aBed`, so foam at the waterline and the colour fade from shallow to deep follow the tide by themselves;
  - cheap vertex sines for swell;
  - fresnel to a sky colour that takes the aurora tint;
  - a moon glint, reusing the Mere's specular line.
- Run a far plane out to the horizon in the fog, the `townBeyond` trick (`build.js:2732`).
- **No real reflections or refraction.** There are no render targets and no depth texture.
- **Mobile:** keep the surface opaque except a narrow alpha band at the shore, so it is not a second full-screen transparent layer. Test at `q=0`.

### 3.2 Tides that move the walkable area (3-4 d)
- **Data:** `L.tide[i]`, the level at which cell i floods (Infinity for dry land). Two tiers:
  - **shallow:** walkable, wading slow ×0.6 through the sap branch, Cold builds;
  - **deep:** `cells = 0`, `low = 1`. Arrows and sight still pass, as over lava (`map.js:2,20-24`; projectiles use `blocks()`, `projectiles.js:103`).
- **Engine:** add `GridMap.close(cells, low = true)`. It sets cells to 0 and low to 1, bumps `ver` **once** and resets `flowT.x = -1`. `setSolid` resets neither the flow nor `low` (`map.js:25`).
  - Move the tide in **steps** (for example 0.1 m, never more than one step per 2-3 s).
  - Each step closes or opens the cells in its band, then fires `mapChanged`, which repaints the minimap.
- **How pathing reacts:**
  - The hero's flow field is a BFS capped at 45 cells, rebuilt within 0.2 s of a reset (`ai.js:46`, `map.js:96-120`). On a 112 × 192 map that is trivial.
  - `stepToward` keeps a 41 × 41 BFS window per actor, keyed by `map.ver` (`map.js:143-186`). Each `ver` bump makes every actor rebuild its window on its next non-hero seek: about 30 actors × 1,681 cells per step, spread over frames. That is fine at one step per second or slower, and **wrong per frame**.
  - `seek` tries a straight `clear()` line first (`ai.js:164`).
  - Actors caught in a closing cell are pushed out by `collide()` (`map.js:41-64`; a centre inside rock leaves by the nearest open side or `nearestFloor`).
  - The hero is snapped back to her previous position or the nearest floor within 48 cells (`player.js:103-110`).
- **Missing guards:**
  - Never close a cell under the hero without warning. Defer it while she stands in it, or turn it into a plunge.
  - Move pickups off flooding cells.
  - Interactables and story spots must be dry at high tide, or deliberately tide-locked.
- **Generator:** `gen5` must check `reach()` at low *and* high tide (`gen4.js:18`), and `check-act5` must sweep both.
- **Arrival in the zone:** `nearestFloor(at)` handles a flooded arrival (`world.js:223`).

### 3.3 Ice that cracks under weight (2-3 d)
- **Data:** an `L.ice` mask (thin ice over water) and `L.thick` (the critical path, never breaks). Runtime state per cell: 0 intact, 1-3 cracked, 4 broken.
- **Weight:**
  - each frame, add per-cell load from actors on it (hero 1, `big` ×3, boss slams and Hammerfall-like blows crack an area at once);
  - load decays when the cell is unweighted;
  - telegraph with crack sfx, particles and a crack look;
  - at stage 4, `map.close([[ix, iz]])`;
  - refreeze with `map.open` after N seconds, or never.
- **Look:**
  - either an instanced ice-tile mesh over the water (hide or tilt an instance when it breaks; cracks through a per-instance attribute), which is cleanest;
  - or write into a dynamic ground attribute: the ground is one (w + 1) × (h + 1) vertex grid, and an `aSap`-like attribute can be updated in place with `needsUpdate`.
  - The water surface (§3.1) must exist under every ice cell.
- **What falls through:**
  - The hero takes a plunge (§3.10).
  - Non-boss, non-floating monsters drown: `kill` with a splash. This is a tactic: lure brutes onto thin ice.
  - `charger` and `hammerhorn` dashes onto thin ice crack it ahead of them (`dashStep`, `ai.js:785`).

### 3.4 Ice floes
- **Static bobbing floes:** visual sway only, fixed walkable cells, sinking under overload through §3.3. 0.5 d.
- **Discrete hops** (recommended): a floe is a cell cluster that moves between anchor slots on a lane every period, with a 1.5 s telegraph.
  - Each hop is one `close`/`open` batch.
  - Actors standing on it are carried by the hop delta with a tween (the `pl.pull` tween, `player.js:76-81`).
  - 1.5-2 d.
- **True continuous drift that carries actors:** the grid would change every frame, the flow field and every window would churn, and the camera and actors would need sub-cell carry. 4-6 d, high risk on phones. Not recommended.

### 3.5 Aurora sky (1-1.5 d)
- A dome mesh with an animated curtain shader that follows the camera, `fog: false`, the `starField` pattern (`build.js:2265-2278`).
- It is seen only in cinematics at pitch ≲ 0.2, because of fact 0.2. In play it is felt as light:
  - slowly animated `R.hemi` / `R.moon` colours;
  - the aurora term in the water and ice shaders;
  - optional moving coloured bands on snow through a ground uniform.
- No new textures.

### 3.6 Falling snow (0-0.5 d)
- The `'snow'` ambient exists (`fx.js:422-427`), and so does `uSnow` on props.
- A whiteout or blizzard variant (denser, sideways, with a lower fog density through the atmosphere) is 0.25 d.
- The particle budget is FX pools of 1,200 / 2,400 / 3,500 additive and 500 / 1,000 / 1,600 alpha particles by quality (`fx.js:132-134`).

### 3.7 Fog banks (0.5-1 d)
- `FogExp2` is global, and there is no volumetric fog (unsuitable for phones). Banks are:
  - big slow alpha particles (`lowmist`-style, `fx.js:373`) drifting on a wind;
  - plus an eased fog density swing (expose `mixAtmos`, `world.js:529`).
- Gameplay: a bank cuts aggro range (`aggroCheck` 13 m, `ai.js:207`) and the hero's sight. It can carry the Shroud (§2).

### 3.8 Ships and wrecks (1.5-2.5 d)
- **Poly Haven (CC0) has them.** These are quick API probes, not a licence audit:
  - `dutch_ship_large_01` (111k polys), `dutch_ship_large_02` (97k) and `dutch_ship_medium` (69k), each about 34 m / 24 m long;
  - `ship_pinnace` (184k);
  - `modular_wooden_pier` (85k);
  - `wooden_lantern_01`, `Lantern_01`, `caged_hanging_light`, `lateral_sea_marker`, `ocean_buoy`, barrels, crates, `fishermans_hat`;
  - avoid the modern items (`lifebuoy`, `life_jacket`).
- Decimate each to ≤ 12k triangles (`envlib.mjs simplifyPrim`) and split into broken sections.
- **Walkable raised decks are impossible** (fact 0.1). Instead:
  - a keeled-over or half-sunk hull gives walls through `blockRect` footprints (`gen.js:51`);
  - its open belly is floor at y 0;
  - a stranded deck is a `deck`-cells pier (`L.deck` pattern);
  - masts and rigging are props.
- Ships afloat in the distance are visual-only, bobbing.

### 3.9 Under-water or under-ice spaces
- **True underwater** (3D swimming, buoyancy) is not feasible: the movement is 2D, `moves.bin` has no swim clips, and there are no render targets.
- **"Beneath the ice"** as a dry cavern zone works, in the vein of `heart` or `forge`:
  - an air pocket under the frozen sea;
  - blue light falling from an ice ceiling;
  - caustics as an animated term in `groundMat` (`build.js:1219`);
  - black water as holes;
  - the Skotos below.
- Generator plus visuals, 3-5 d. This fits a final zone well.

### 3.10 Swimming
- Not feasible (see 3.9). Use a **plunge** instead (0.5 d), when the hero's cell turns to water (ice breaks or the tide closes it):
  - a splash, then x% of max life plus a large Cold load;
  - she is pulled out at the last safe cell (a short ring buffer of safe positions), with 1 s iframes;
  - monsters drown.

### 3.11 Cold damage and warmth (1-1.5 d)
- What exists:
  - `status.chill` is a slot in `freshStatus` that nothing reads (`actors.js:106`);
  - the `chill` damage option only slows (`combat.js:88`);
  - hero freeze works (`combat.js:141`, `moveMul` 0 at `:341`) but has no ice tint and no meter.
- Build a Cold meter:
  - it fills in shallow water, wind, slush and fog, and drains near warmth (`lightAt`: fires, lamps, pools; §2);
  - at full it applies Frostbite, a damage-over-time in `tickStatus` (`combat.js:323`), and a frozen 1.2 s, the `rootHero` pattern with an ice tint;
  - the HUD shows it in the amber meter's place.
- Monsters with an `ice` flesh type need `HIT_SFX` and `DIE_SFX` entries and a death decal branch (`combat.js:23-25,372-376`).

### 3.12 Walking on non-zero ground (0.5-1 d, only if the design wants real slopes on ice shelves)
- Give actors a base y from `groundY` on the cells that need it:
  - avatar group y in `ai.js:104` and `player.js:113`;
  - blob shadows and rings (`actors.js:93-95`);
  - projectile spawn y;
  - telegraphs (use `drape`, `build.js:2678`).
- Recommendation: avoid it. Keep floors at 0 and fake depth with the water surface.

### 3.13 Act-agnostic plumbing for a fifth act (1.5-2 d)
- These places hard-code acts or zones:
  - world.js: `ZONES[id].act === 4` (`:151,210,266`), `READY` (`:61`), `zonePacks` (`:62`), the first-boss list (`:257`), the champion chain (`:286`), the `why` map (`:355`), `ECHO_PROMPT` (`:458`);
  - `light.js:17`; `build.js:1957`, `:1075`;
  - boot.js: `updateAct4` (`:269`), moods (`:289-292`), migration (`:93-99`);
  - story.js: `questText` (`:25`), the catch-ups (`:144-150`), echo tints (`:186,381`), `offerBoons` acts (`:449`), `actComplete` (`:464-469`);
  - `stats.js:24`; `panels.js:163,230`; `hud.js:238-268`; `viewer.js:147-198`; `state.js:28`.
- Either add `act5*` siblings, or generalise these to read `ZONES[id].act` and `ZONES[id].light`, the cleaner route.

**Total engine and world work, excluding assets, story text and music:**

| Item | Days |
|---|---|
| `gen5.js`, two zones | 6-8 |
| Visuals: ground configs, `act5Prop`, level hooks | 3-4 |
| Water | 2-3 |
| Tides | 3-4 |
| Ice cracking | 2-3 |
| Floe hops | 1.5-2 |
| Aurora, snow and fog | 2-3 |
| Cold | 1-1.5 |
| Plumbing | 1.5-2 |
| New AIs | ~0.5-1 each |
| 2 bosses | ~2-3 each |
| `check-act5` and scenarios | 2-3 |

That is roughly **30-40 days** of focused work for the full set. The cheapest credible frozen coast is water (3.1), stepped tides (3.2), cracking ice (3.3), static floes, snow, fog and cold. Leave out true drift and the under-ice zone (or make it the boss arena only).

---

## 4. The level and difficulty curve so far, and Act V's levels

**Zone levels** (`world.js:31-45`). Each act adds +3 per zone:

| Act | Zones |
|---|---|
| I | town 1, forest 1, crypt 4 |
| II | pass 10, halls 13 |
| III | weep 16, heart 19 |
| IV | ashfield 22, forge 25 |
| Shadow Gate | hero level + ⌊tier / 2⌋ (`boot.js:185`); monster hp × 1.14^tier, damage × √ of that (`world.js:281`, `actors.js:151`) |

**Scaling** (`data.js:202-206`, `actors.js:137-151`):
- Monster level is `max(zone level, hero level + 2 on Nightmare+)`. The zone level is a **floor**: monsters track the hero, and the zone only stops an over-levelled hero from steam-rolling.
- Bosses are `max(zone + 2 | +3, hero + 1)` (`world.js:258`; echoes the same, `story.js:393`).
- `monsterHP(L) = 22 + 7L + 0.8L²` and `monsterDmg(L) = 2.6 + 1.5L + 0.055L²`, times `def.hp`/`def.dmg`, times the difficulty factors.
- Elites: champion ×3 hp / ×1.25 damage; rare ×4.2 / ×1.4; minion ×1.3 / ×1.1.
- Item level is `max(zone, hero)` (`world.js:336`; `combat.js:388`).
- XP: `xpToNext(L) = 50 + 45·L^1.45`, `monsterXP = 6 + 2.5L`. **The level cap is 50** (`data.js:206`, `combat.js:460`).

| Level | xpToNext | Monster hp (×1) | Monster damage (×1) | Kills per level at ×1 xp |
|---|---|---|---|---|
| 22 | 4,029 | 563 | 62 | 66 |
| 25 | 4,839 | 697 | 75 | 71 |
| 28 | 5,694 | 845 | 88 | 75 |
| 31 | 6,592 | 1,008 | 102 | 79 |
| 34 | 7,529 | 1,185 | 117 | 83 |

**Difficulties** (`data.js:4-10`):

| Difficulty | Monster hp | Monster damage | Unlock |
|---|---|---|---|
| Wanderer | 0.65 | 0.55 | — |
| Warden | 1 | 1 | — |
| Hero | 1.9 | 1.55 | — |
| Nightmare | 3.6 | 2.4 | `act1:hero` |
| Ash | 7 | 3.8 | `act1:nightmare` |

- Unlocks look only at `h.act1` (`panels.js:245-249`).
- The difficulty also scales elite count and affixes (1 / 2 / 3 affixes, `world.js:271-283`) and loot, xp and gold.
- Act IV's hazards scale on difficulty too: the Breath takes 12% of max life on Wanderer and 20% otherwise.

**Boss hp multipliers so far:**

| Act | Boss | hp ×  |
|---|---|---|
| I | weaver | 38 |
| I | barrowLord | 55 |
| II | stonewarden | 46 |
| II | moltenKing | 72 |
| III | silverhorn | 52 |
| III | amaranthe | 80 |
| IV | ivar | 58 |
| IV | karthax | 95 |

Act IV commons sit at hp ×0.35-1.7, brutes at 4.5. Act IV scenarios run at hero levels 23-27 (`scenario.mjs:368-651`).

**Recommendation for Act V:**
- **Zone 1 at level 28, zone 2 at level 31.** This keeps the +3 cadence and leaves levels 31-50 for the Gates. Do not raise `MAX_LEVEL`.
- Bosses come out at about level 30 (first, +2) and about 34 (+3), or hero + 1.
- Boss hp multipliers about 65 for the first and 110-120 for the finale. Commons at ×0.4-1.9, brutes ×5-6.
- Scenarios at levels 28-29 and 31-33.
- Going from 28 to 31 is about 18k xp, roughly 240 common kills at ×1 xp plus elites and bosses. That matches Act IV's pace.
- Optional: unlock the next difficulty from any act's completion, not only Act I. Today a hero who started on Warden must replay Act I to reach Nightmare.

---

## 5. Performance and memory

### 5.1 Artifact as built now
- 119 files, **53.46 MiB**, the largest `ash-*.js` at 3.64 MiB. Every file is far under 16 MB.
- `index.html` is 3.6 KB, the boot chunk 424 KB, `anim` 1.71 MB, `build` 123 KB.
- The scripts are base64, so an asset costs about 1.33 × its raw size in the artifact. A loaded chunk's string stays referenced by its module for the session.

### 5.2 What each act loads (raw files / artifact / phone GPU textures)

Phone GPU textures are estimated as RGBA8 × 1.33 for mips, with maps of 1024 px or more halved, as `gltf.js:14-20` does on phones and on quality ≤ 1.

| Act | What | Raw | Artifact | Phone GPU tex |
|---|---|---|---|---|
| I (boot) | people 2.54 MB, moves 0.74, kits 2.7, env 1.52 + layers 2.27, village 2.66, trees 1.39, 8 creatures 3.80 | ≈ 17.6 MB | ≈ 22 MiB | ≈ 192 MB |
| II | deep 0.73 + layers 1.78, folk 1.99, 4 creatures 1.59 | 6.1 MB | ≈ 8 MiB | ≈ 88 MB |
| III | wood 2.25 + layers 1.62, grove 1.95, 5 creatures 2.42 | 8.2 MB | 10.5 MiB | ≈ 123 MB |
| IV | cinder 2.27 + layers 1.86, ash 2.86, 3 creatures 1.24 (+ deep, folk, grove if not loaded) | 8.2 MB | 10.2 MiB | ≈ 160 MB |

- **A full run Acts I-IV holds about 560 MB of GPU texture on a phone** (about 860 MB on desktop at high quality), plus geometry. Each people set is 157-221k triangles; packs are 27-59k.
- Nothing is ever released (fact 0.8). The owner's phone handles this today on high quality.

Heavy items:
- `ash.glb` has 55 textures at 512 px across 11 scenes, about 64 MB of GPU memory: every regraded character carries its own maps.
- `cinder.glb` has 88 textures, about 56 MB.
- `grove.glb` is about 50 MB.

Phone safeguards in place:
- mobile defaults to quality 1 (`boot.js:47`);
- half-size decode and image release after upload (`gltf.js:14-26`, `env.js:41-55`);
- Lambert instead of Standard materials on props at quality < 2 (`env.js:66-78`);
- the shadow map capped at 1024 (`gfx.js:62`) and the pixel ratio at 1.5 (`gfx.js:90`);
- adaptive resolution down to 0.55 (`gfx.js:106-120`);
- 3 / 6 / 8 pooled point lights (`gfx.js:21,74`);
- creature shadows only at quality 2 (`creatures.js:64`);
- actors stop thinking past 38 m (`ai.js:57`);
- a lost GL context saves and reloads one quality lower (`gfx.js:231-249`);
- `gltf.js:10` notes that a phone tab dies at about 1 GB.

### 5.3 Act V budget
Hold the whole act to **≤ 9 MB raw (≈ 12 MiB artifact) and ≤ 110 MB phone GPU texture**. A full run then stays near 670 MB, leaving headroom under the ~1 GB tab ceiling for geometry, render state and the JS heap.

| Item | Raw | Phone GPU | Limits |
|---|---|---|---|
| Environment pack (props) | ≤ 2.5 MB | ≤ 40 MB | ≤ 35 props; ≤ 70k triangles in the pack; hero wreck ≤ 12k, others ≤ 4k; textures 512 (1024 only for the hero wreck and rock); share atlases |
| Tiling layers (snow, wind-crust, ice, black shingle, wet sand, tidal rock, sea cliff, planking) | ≤ 1.8 MB | ≤ 25 MB | ≤ 9 layers; d 1024 / n 512, not n 1024 |
| People set | ≤ 2.5 MB | ≤ 30 MB | ≤ 9 scenes; ≤ 25 textures (one grade per faction, not per character); ≤ 200k triangles; rebinds ≤ 12k each |
| Creatures (3-4 GLBs) | ≤ 2.2 MB | ≤ 20 MB | 3-9k triangles each (boss creature ≤ 15k); textures 1024 base + 512 normal/ORM; ≤ 700 KB each |
| Shaders (water, ice, aurora) | — | about 0 | at most one 256² noise; no extra full-screen transparent layer on phones |

### 5.4 Contingency: unloading (1-2 d, only if the owner's phone struggles)
- When the hero enters an Act V zone:
  - drop `G.zones` of Acts II-IV through `disposeZone` (`world.js:236`), not `delete`;
  - dispose the textures and geometry of the `deep`, `wood`, `cinder`, `folk`, `grove` and `ash` templates;
  - clear the caches (`packs`, `sets`, `loads`) so a later visit reloads.
- This frees about 300 MB of phone GPU memory.
- Watch for stand-ins and NPCs of an Act V zone that use those sets (Brokka from `folk`, Elati from `grove`). Keep any set the act's `READY` lists.

---

## 6. The asset pipeline as it stands

### 6.1 Node-only steps (Acts II-IV, no Blender)
- **Libraries:**
  - `tools/creatures/act2/lib.mjs`: `normalise` (`:88`, Y up, +Z, feet on y 0, metres), `dropLoose`, `copyClip` (`:111`), `makeClip` (`:117`, procedural clips as rotations about character axes layered on a base clip), `addGrip` (`:167`), `finish`, `slimRig` (`:212`) and `fastest` (the strike moment);
  - `tools/envlib.mjs`: `packLayer` (AO baked), `loadProp`, `simplifyPrim` (meshopt), `writePack` (meshopt + quantize + WebP);
  - gltf-transform, meshoptimizer and **sharp** (present in `node_modules`) for every texture grade.
- **Creature scripts:** `tools/creatures/act2/*.mjs`, `act3/*.mjs`, `act4/*.mjs`. One script per creature; it grades textures, decimates, rebuilds rigs and makes every missing clip in code.
- **People:**
  - `tools/creatures/act2/folk.mjs --set=<name>` re-proportions `people.glb` scenes with `len`/`girth`/`size` tables (`morph`; tables at `:25` and `:550-560`);
  - it restyles hair and drops parts (`restyle`), recolours and grades (`grade`, `ashen`, `burn`, `barkify`);
  - it rebinds Mixamo-rigged bodies onto the people skeleton (`rebind` `:203`, the `MIXAMO` map `:163`), with `BONEMAPS` for other rigs (`:173`), `toBindPose` (`:186`) and per-recipe `prep`/`reweight`;
  - the sets are `SETS` (`:731`). A new set is a recipe table plus a `SET_URLS` entry.
- **Packs:** `tools/pack-<name>.mjs` (cinder, wood, deep, env, village, trees, kits), with `LAYERS[]` grade and quilt recipes and `PROPS[]` (`pack-cinder.mjs:31-55`).
- **People base:** `tools/pack-chars.mjs`, Quaternius Universal Base Characters and Modular Outfits from `srcDir/ubc, mco, hair, tex`, builds `people.glb`. `tools/pack-ue-anims.mjs` builds `moves.bin` (114 clips: UAL 1+2 plus retargeted KayKit `KK_*`).
- **People outfits are limited** to the 9 base scenes (warden, ranger, mage, wayfarer, smith, healer, villager0-2). Keepers of the sea-lights in wool and oilskin can be regrades of these. New garments mean re-running `pack-chars` with new Quaternius sources, or cloaks and caps made in code (`models.js veilParts`, `maskParts`, capes). `grade()` cannot add geometry.

### 6.2 Blender steps
- Only Act I used Blender: the `goblin`, `skeleton`, `troll`, `ashspawn`, `wight` (MPFB2 MakeHuman) and `wolf` folders (`*.py`: bake, build_base, clean, export, gen, renders). The README says they target bpy 4.2 / 5.0.
- Acts II-IV deliberately avoided Blender: "Blender is not installed, so nothing relies on auto-weights" (act4-design).
- **`pip install bpy` is viable here:**
  - Python 3.13.16; PyPI `bpy` 5.1.0-5.2.2 ship `cp313-manylinux_2_28_x86_64` wheels (5.2.2 is 383 MB);
  - glibc 2.39; X11, GL and xkbcommon libraries are present (`libEGL` is absent; that matters only for GPU drawing, so background operations and Cycles CPU should run, but verify);
  - the wheel host is reachable (HTTP 206); there is no EXTERNALLY-MANAGED marker; `python3 -m venv` works; about 29 GB of disk is free.
  - bpy 4.x needs Python 3.11, which is absent, so the old Act I scripts may need 5.x API fixes.
- **Worth Blender for Act V:** automatic weights for an unrigged scan, baking normals from a high-poly source, bendy-bone baking, and UV-preserving decimation of very dense ships. The Node path covers the rest.

### 6.3 Where sources live
- The scripts read sources from download folders outside the repository:
  - `/tmp/claude-0/sf/models/<folder>/model.glb` with `meta.json` (Sketchfab);
  - `/tmp/claude-0/ph/tex/<id>/<id>_{diff,nor_gl,arm}_1k.jpg`, `models/<id>/<id>_1k.gltf` and `dl_log.json` (Poly Haven);
  - see `pack-cinder.mjs:12-14,25-26`, `folk.mjs:323,367,723,726` and `ashwing.mjs:25`.
- **Both folders are gone in this container.** The downloaders the headers mention (`dl.py`, `ph_dl.py`) are not in the repository either, so they must be rewritten. This is simple:
  - Sketchfab: API v3 `/models/{uid}/download` with `Authorization: Token $SKETCHFAB_API_TOKEN`; the token is set in this environment;
  - Poly Haven: `api.polyhaven.com/files/{id}`.
- Rebuilding Act III or IV sets would also need `bark_brown_02` and the minotaur, overlord and lava_monster sources again.
- **Reachable through the proxy (HTTP 200):** api.sketchfab.com, api.polyhaven.com, ambientcg.com (CC0; it has `Ice001-004` and `Snow006/013/014`), quaternius.com, opengameart.org.
- **Poly Haven quick look (not a licence audit):**
  - textures: `snow_01`-`05`, `snow_floor`, `snow_field_aerial`, `coast_sand_01`-`05`, `coast_land_rocks_01`, `low_tide_rocks`, `damp_beach_sand`, `seaworn_stone_tiles`, `seaworn_sandstone_brick`, `weathered_planks`;
  - the ships and lanterns listed in §3.8.

### 6.4 The creature contract (`tools/creatures/README.md`, `gfx/creatures.js`)
- **Model:** one skinned character, Y up, facing +Z, feet on y 0, metres. Clips play in place and keep only rotations plus the hip or root translation.
- **Clips:**
  - required: `idle`, `walk`, `run`, `attack`, `attack2`, `hit`, `die`;
  - extras as the AI needs them (`shoot`, `cast`, `slam`, `warcry`, `pounce`, `howl`, `rear`, `spit`, `leap`, `rise`, `riseStand`, `bonePile`, `blink`; Act IV added `glide`, `dive`, `land`, `takeoff`, `perch`, `daze`, `consume`, `spawn`, `cling`, `charge`, `dormant`, `paw`);
  - logical actions map to clips with fallbacks in `MAP` (`creatures.js:106-120`), so a missing extra degrades gracefully.
- **Scene extras:** `{ hit: { clip: seconds }, height, walkSpeed, runSpeed, credit, license }`, plus optional `legSpan`/`length` for wide bodies (`creatures.js:71`).
- **Grips:** `grip_R` / `grip_L` empties under the hands; +Y runs along a held blade, +Z along the knuckles.
- **Scale:** the game scale is `CAST[model][1] × def.look.scale` (bosses 1.15-1.6). Weapons scale by height / 1.8 (`creatures.js:99`).
- **Budget:** WebP 1024 px base colour, 512 px normal and ORM; meshopt plus quantized geometry. Triangle counts in practice: 1.9k (worm) to 16k (golem); Act IV's three at 3.4k, 8.9k and 9k.
- **Fallback:** every model needs a `STAND_IN` in `actors.js:46-55`.
- **People contract:**
  - the UE skeleton of `people.glb`, so a person plays every `moves.bin` clip;
  - scene extras `height`, `credit`, `license`, `weaponScale`;
  - held items, masks, cloaks, crowns and chains are code (`gfx/models.js`) attached with `attachUpright` (`actors.js:316`);
  - boss rebinds used so far: Mixamo (Minotaur) and a `BONEMAPS` rename (Overlord). A non-Mixamo rig costs about 0.5-1 d of bone mapping and re-weighting.
- **Licences:** CC0, CC-BY 4.0 or CC-BY 3.0 only, credited in four places (§1.16). Check each source for re-uploads of paid packs, the way act4-design's asset audit did (it found a ripped dragon from three identical uploads).
