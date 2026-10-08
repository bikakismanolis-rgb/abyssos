# Skotos Act IV: code contract

The design lives in `scratchpad/act4-plan.md` (readable) and `scratchpad/act4.json` (key `plan`, plus `verdict`, the licence audit). This file fixes the lead decisions, shared names, file ownership and assets. Where this file and the plan disagree, this file wins.

Repo: `/home/user/abyssos/skotos`. Dev server: `http://localhost:5199`. Build check: `npx vite build --logLevel error`. Artifact check: `npm run build:artifact` (every file in `artifact/assets/` under 16 MB).

Act III is the model to mirror everywhere: `gen3.js`, `build.js` (act3Prop, setAutumn, the Act III ground), `world.js` (act3Zone, act3Presence, echoAt, openRootGate, witherWall, firstAutumn, zoneReady/zoneParts), `story.js` (quests 11-16, Tears, ladyFalls/autumnFalls, beaconScene(3), actComplete(3), offerBoons), `ai.js` (Act III AIs, HART/AMARANTHE boss tables), `sap.js`, `data.js`, `audio.js`, `tools/scenario.mjs` (weep, hart, heart, amaranthe, echo, ending3, cast3).

## Lead decisions (override the plan)

- **Names.** «Πράξη IV: Το Στάχτινο Καμίνι» / "Act IV: The Ashen Forge". Zones: `ashfield` «Το Πεδίο της Τέφρας» / "The Field of Ash" (level 22) and `forge` «Το Στάχτινο Καμίνι» / "The Ashen Forge" (level 25).
- **Act IV is the finale of the Ash Crown story.** Keep the plan's ending (the Unmaking, Isarn walks into the white fire, the Night Without Fires, fires lit by hand), the post-game (Shadow Gates from Isarn's planted staff, echo refights of Ivar and Karthax) and the one-line Act V seed (a fourth far fire with `newFire`). The act panel after Act IV says Act IV is complete, with the sub-line «Οι φωτιές ανάβουν ξανά, από ανθρώπινα χέρια» / "The fires are lit again, by human hands", and no "coming soon" teaser.
- **Canon.** Everything in the plan's story section, plus what the game already says (read `src/i18n/text.js`: intro.*, d.isarn.* including d1-d8 and after3, d.tear.breaking.*, d.lady.h2, d.amaranthe.die3/die4, d.brokka.*, act3.next). Arna is male («του Άρνα»). Isarn is about 110 and looks 70 (keepers age slowly). Karthax's wish: «Να μη με ξεχάσουν ποτέ». Isarn's wish at ten: «Μη με αφήσεις μόνο μαζί του». Ivar's line: «Ποτέ δεν σου μίλησα, γιε μου.»
- **Ranger kin.** The Ranger is Evergreen: Elati and the Amaranthe statue get `.r` line variants, as in Act III.
- **Assets** (being built now by the `act4-assets` workflow; its report goes to `scratchpad/act4-assets.json`). Use what actually exists; if an asset is missing or failed, use a STAND_IN fallback in `actors.js` and never break the game:
  - ashwing → caveBat (scaled up) or warg; smokeEater → a crawler people model or ghoul-like stand-in (spider is fine); emberTick → spiderling;
  - ash people → people.glb equivalents (lampless/ivar/arna → wayfarer, ashSpear → warden, ashDwarf → stoneborn (folk), ashBow → ranger, ashsmith → villager1);
  - hammerhorn → troll (retinted soot-black), karthax → moltenKing (folk) retinted black iron.
- **Pack name.** The environment pack is **`cinder`** (`loadPack('cinder')`, `src/assets/cinder.glb` + `src/assets/cinder/*.webp`). The people set is **`ash`** (`loadFolk('ash')`, `src/assets/ash.glb`). Creature files `ashwing.glb`, `smokeeater.glb`, `embertick.glb` form the creature group **`act4`**.
- **zoneReady becomes a map** (world.js): `{ deep: { folk: ['folk'], creatures: 'act2' }, wood: { folk: ['grove'], creatures: 'act3' }, cinder: { folk: ['ash', 'folk', 'grove'], creatures: 'act4' } }` (folk for Brokka and the moltenKing statue, grove for Elati and the amaranthe statue). The `forge` zone also loads `loadPack('deep')` (lava/dslab layers and props). The barrowLord creature (the third statue) is loaded at boot. `zoneParts` follows the same map so the travel bar stays right.
- **Keeper statues (Karthax phase 2) use the real models at runtime**, frozen in a pose and tinted ash-grey (the existing `a.statue` frozen-tint path in ai.js / actors.js), as `node` actors. They are NOT baked into ash.glb.
- **Scope kept:** Light and Shroud with the Ember Cradle; the Crown's Offers (three altars, gifts with cages, Unbound ×1.5 on the Act IV blessing); the Forge's Breath and the Forge Heat with the three Great Bellows; the five Lamp Memories; the world states `fireTaken`, `crownUnmade`, `newFire`.
- **Simplifications allowed** (prefer them over fragile code): Lampless cones are a persistent additive cone mesh (no shadow casting); Ivar's braziers are interactables relit by a 1 s channel; Karthax's Tongs pull the hero toward the anvil along the line (a dash-like tween), then hit; the Unmaking is a `cine` with dialog steps and simple walkTo tweens (Isarn into the Forge Mouth, fading out); the Lampless following him may be 3-4 NPC actors fading out. The Ashwing is targetable only when grounded (a.airborne → hidden from targeting).
- **Hero statuses**: only two new ones. **Seen** (+15% damage taken, 6 s, eye icon) and **Clinging** (Ember Tick on the back: −25% move, a burn tick each second; a dodge throws all ticks off, stunned 1.5 s). No hero stun. The Shroud is a monster-side rule.
- **Difficulty.** The Forge's Breath is 20% of max life per breath (12% on the first difficulty); the 2.0 s inhale is never shortened.
- **Old saves.** A hero without the new flags reads as the Act III state. `h.act4` defaults to -1 (migrate like h.act3). questText clamps at 23.

## Shared names

### Zones and exits

| Zone | ZONES entry |
|---|---|
| ashfield | `{ level: 22, music: 'ashfield', ambient: 'ashfall', atmos: 'ashfield', act: 4, pack: 'cinder' }` |
| forge | `{ level: 25, music: 'forge', ambient: 'forge', atmos: 'forge', act: 4, pack: 'cinder' }` |

Atmospheres (`atmos.js`): `ashfield`, `ashfieldStars` (crownUnmade, before newFire), `ashfieldDawn` (newFire), `forge`, `forgeCold` (crownUnmade). FX ambients: `ashfall`, `ashfieldStars`, `ashfieldDawn`, `forge`, `forgeCold`.

Exits:
- **town:** `{ x: CX - 14, z: 4, to: 'ashfield', label: 'exit.ashfield', locked: 'act3' }` down the far side of the beacon hill (gen.js; keep the village layout intact; the label shows only once flags.act3; the story may also require fireTaken).
- **ashfield:** south to town (at the Dark Beacon); north `{ to: 'forge', label: 'exit.forge', locked: 'ivar' }` at the Anvil Gate.
- **forge:** south back to ashfield.

### The level object L from gen4.js (world)

`genAshfield(seed)` and `genForge(seed)` in the new `src/world/gen4.js`, deterministic retry loops like gen3 (seed + k*7919, last try accepted), and a reachability check after dressing (as tryHeart does now). Beyond the usual fields:

- `L.type`: `'ashfield'` | `'forge'`.
- ashfield:
  - `L.road`: the road painted as a ground mask (paint layer); `L.spots.camp` (Dark Beacon camp: Isarn, Brokka), `L.spots.darkBeacon {x,z}`;
  - `L.spots.lamps`: `[{ x, z, id: 'l1'..'l5', memory: true, r }]` (five story waylamps, ~25 m apart; 4 and 5 in the Lantern Graves), plus optional extra `L.spots.waylamps` without memory;
  - `L.spots.altars`: `[{ x, z, id: 'throne' | 'forge' | 'unfading', r }]` in three side hollows;
  - `L.spots.banners` (Field of Three Banners centre), `L.spots.drake` (bones), `L.lowEmber` (ember-sink low cells, use the lava surface), `L.spots.graves {x,z,r}`, `L.graveLanterns: [{x,y,z}]` (hundreds, instanced), `L.spots.hook` (Ivar's empty hook), `L.spots.patrols: [[{x,z},...], ...]` (Lampless loops), `L.spots.camp2` (Elati's camp, waypoint 2), `L.spots.npcs: { wayfarer, brokka, elati }`;
  - the Anvil Gate plaza: `L.boss` (centre, r 14), `L.spots.lastLamp {x,z}` (1x1 solid), `L.spots.braziers: [{x,z}] × 3`, `L.gate {x,z,cells}` (solid until flags.ivar; open with map.open).
- forge:
  - `L.spots.camp` (Brokka, waypoint) in the Hall of the Headless; `L.statues` (headless statues);
  - `L.flues: [{ x, z, dir, len, w, period, phase, gallery: 0|1|2 }]` (mouth position, direction in radians, length/width in metres), `L.spots.stations: [{ x, z, flue }]` (chained Hammerhorn posts);
  - `L.spots.bellows: [{ x, z, r, doors: [{x,z},{x,z}], id: 0|1|2 }]` (three Great Bellows chambers);
  - `L.plug: { x, z, cells }` (slag plug on the Great Stair, solid until heat 3);
  - `L.boss` (Anvil of the Crown centre, r 16), `L.spots.anvil {x,z}` (2x2 solid), `L.spots.mouth {x,z,r}` (Forge Mouth, low cells), `L.spots.cages: [{x,z,id:'lord'|'king'|'lady'}]` (west, east, north at r 10), `L.spots.ghosts: [{x,z}] × 4`;
  - `L.lava` / low cells as in halls; `L.spots.moulds` (casting pits).
- `L.spots.waypoint` in both.

### Map (world)

`map.open(cells)` (exists). `map.los` gives cover for the flues.

### Visuals (`build.js`, world)

- **`act4Prop(kind, o)`** returns a `THREE.Object3D`:
  - `'waylamp'`: has `userData.setLit(bool)` (dark until lit; a warm glow material + optional light handled by the caller), `'brazier'` (`setLit`), `'altar'` (headless statue on a plinth over a basin; `userData.setState('idle'|'taken'|'refused')`),
  - `'lastLamp'` (`setLit`), `'anvilGate'` (like deepGateDoors: `setOpen(b)`, `open(dt)` → done),
  - `'bellows'` (Great Bellows; `userData.breathe(k)` 0..1 squash), `'slagPlug'` (`melt()` over ~1.5 s), `'anvil'`, `'shardAnvil'`, `'forgeMouth'` (`setWhite(k)`),
  - `'cradle'` (the small iron brazier the hero carries on the hip: a group with a flame; combat parents it to the hero), `'crown'` (the Ash Crown: black iron ring with four sockets, `userData.setSockets(n)`), `'hook'`, `'staff'` (Isarn's planted staff with a lantern, `setLantern('gold'|'white'|'dark')`),
  - `'lightRing'` (a warm additive ground ring decal of radius 1, scaled by the caller), `'cone'` (a pale blue-white additive cone for Lampless lanterns, length 1 and half-angle set via `o.arc`; `userData.flash(k)`).
- **Ground** for ashfield/forge from the cinder layers (ashGround, ashTrod, scree, road, cliffRock / forgeTiles, forgeHerring, ironPlate, grate, rust) plus the deep pack's lava and dslab in forge. Ember sinks use the existing lava surface.
- **`setHeat(k)`** (0..3) for the forge: lava emissive, grate glow, fog warmth. **`setNight(mode)`** for ashfield: `'ash'` | `'stars'` | `'dawn'` (falling ash on/off, Graves lanterns lit at dawn).
- **FX** (`fx.js`): ambients above; `fireStream(from, to)` (particles from a fire into the Cradle), `coneMesh` if useful; telegraphs reuse teleLine/teleCircle/teleCone.

### Combat (combat)

**Monster ids** (`MONSTERS`):

| id | model | ai |
|---|---|---|
| lampless | ash `'lampless'` | `watch` (patrol + cone + alarm; shroud) |
| ashSpear | ash `'ashSpear'` | `melee` + guard + dormant wake |
| ashDwarf | ash `'ashDwarf'` | `melee` + guard + dormant wake |
| ashBow | ash `'ashBow'` | `ranged` (fire arrows leave fire patches) + dormant wake |
| smokeEater | creature `'smokeEater'` | `snuffer` |
| ashwing | creature `'ashwing'` | `diver` |
| emberTick | creature `'emberTick'` | `latcher` |
| ashsmith | ash `'ashsmith'` | `forger` |
| hammerhorn | ash `'hammerhorn'` | `brute` + chain trait |
| keeperStatue | the keeper's model (barrowLord / moltenKing / amaranthe), statue | `node` |
| ivar | ash `'ivar'`, boss | `ivar` |
| karthax | ash `'karthax'`, boss | `karthax` |

NPC kinds for spawnNpc: `wayfarer` (exists), `brokka` (folk), `elati` (grove), `arna`, `arnaOld`, `isarnBoy` (memory cines), `ivarGhost` (after his death), `wayfarerGhost` (Unmaking).

**Pack tags:** ashLine (Ash-Fallen line, dormant), ashBowmen, lamplessPatrol, snuffers, ticks, ashwing, smiths, stokers, mouldHall, bellowsWave.

**Light API** (new `src/game/light.js`, combat): `lightAt(x, z)` → bool; `addLightPool(x, z, r, dur, tag)`; `heroLightR()` (6 m, 9 m while swollen after drinking fire, a boss override 2.5 or 0 via `setHeroLight(r|null)`); `G.zone` lit interactables (`it.lit && it.lightR`) count. The Cradle drinks fire areas inside its ring (G.areas of kind 'fire'), swelling the ring to 9 m for 8 s.
**Shroud:** `def.shroud` or `a.shrouded` → 30% damage outside light unless `a.revealed > 0` (a hit inside light reveals for 3 s); hit text «Σκιασμένος». **Guard:** `def.guard {arc, k}`. **Seen** and **Clinging** as above.
**Forge breath** (new `src/game/forge.js`, combat): `startFlues(L.flues)`, `stopFlues()`, `setFlueHeat(k)`, `setFluePumping(i, bool)`; `tickFlues(dt)` called from the game loop like sap drips.
**Bosses:** `ivar` and `karthax` tables in ai.js with the plan's moves and phases; the existing hooks (onPhase, lockPhase, hpFloor, dazed, ward). Boss deaths reach story via the existing `kill` path, like silverhorn and amaranthe. `emit('bossPhase', a, phase)` is already emitted.
**Blessings:** `BOONS[4]`: wayfarer `{ move: 8, cdr: 10 }` icon 'roll'; lantern `{ crit: 6, critDmg: 25 }` icon 'star'; rest `{ lifePct: 15, regen: 15 }` icon 'shield'. The Unbound ×1.5 is applied in stats.js when `h.flags.unbound` (set by story) for the act-4 boon.
**Gifts:** stats.js reads `h.flags.gifts = { throne, forge, unfading }` ('taken' | 'refused') and adds the taken gifts as stat lines unless `flags.giftsTaken || flags.crownUnmade || h.quest >= 22` or the zone is a Shadow Gate: throne `{ armorPct: 25, lifePct: 10, move: -12 }`, forge `{ dmgPct: 20, critDmg: 15, armorPct: -20 }`, unfading `{ lifeOnHit: 15, regen: 15, atkSpd: -15 }`.
**Audio names** combat uses (story implements in audio.js): bellowsInhale, bellowsRoar, lanternDrink, chainRattle, chainSnap, shieldBlock, tickLatch, smokeGulp, ashwingScreech, crownCrack, hornCall, lampLight, statueBreak.

### Story (story)

- **Quests 17–22**, end state 23, as in the plan's beats. q18 counter `{0}/5` lamps.
- **Flags:** `act3` (exists), `fireTaken`, `lamp_l1..l5`, `gifts`, `unbound`, `ivar`, `bellows0..2`, `heat` (0..3), `plug`, `karthax`, `giftsTaken`, `crownUnmade`, `newFire`, `act4`; `h.act4`.
- **Interactables:** `waylamp` (light + checkpoint + memory), `altar` (offer panel: Accept/Refuse), `brazier` (Ivar's arena, relight 1 s channel), `bellows` (start the 20 s hold with Brokka), `echo` (Ivar at the Last Lamp, Karthax at the cold Anvil; reuse echoAt), `staff` (Isarn's planted staff after newFire: says «Ξεκουράσου.» and opens the Shadow Gates panel).
- **Cines:** `beaconScene(4, 'leave')` (q17), the Lamp Memories (the Amber Tear flow with a white-ash body class `memory-ash`), Ivar's death, the Unmaking (q21 end), `beaconScene(4, 'answer')` (q22), `actComplete(4)`, act panel act4 keys, `offerBoons` over [1,2,3,4].
- **walkTo(actor, x, z, speed)** (story helper; npc() has no locomotion).
- **Town in the dark:** while `fireTaken && !newFire` the beacon light/fire is off; villagers may hold torches; far fires as in the plan.
- **Music:** THEMES `ashfield`, `ivar`, `forge`, `karthax`, `newfire`; the lantern motif sting; `Audio.mood({ heat })`.

## File ownership (edit only your own files)

| Owner | Files |
|---|---|
| world | `src/world/gen4.js` (new), `src/world/gen.js` (town: the beacon-hill exit to ashfield only), `src/world/build.js`, `src/world/atmos.js`, `src/world/map.js`, `src/gfx/fx.js`, `src/gfx/env.js`, `src/gfx/gfx.js`, `src/debug/viewer.js` (world viewer for ashfield/forge; the people part is the asset builder's) |
| combat | `src/gfx/people.js` (beyond the set entry the asset builder adds), `src/game/data.js`, `src/game/stats.js`, `src/game/ai.js`, `src/game/combat.js`, `src/game/player.js`, `src/game/projectiles.js`, `src/game/skills.js`, `src/game/actors.js`, `src/game/light.js` (new), `src/game/forge.js` (new), `src/gfx/models.js`, `src/gfx/creatures.js`, `src/gfx/anim.js` (only if needed) |
| story | `src/game/story.js`, `src/game/world.js`, `src/game/state.js`, `src/game/boot.js`, `src/i18n/text.js`, `src/audio/audio.js`, `src/ui/panels.js`, `src/ui/hud.js`, `src/ui/overlay.js`, `src/ui/style.css`, `src/ui/credits.js`, `CREDITS.txt`, `README.md`, `tools/scenario.mjs` |

Asset files (`tools/creatures/**`, `src/assets/**`, `tools/pack-cinder.mjs`, `src/debug/viewer.js` people entries) belong to the asset workflow while it runs.

## Expected assets (verify against `scratchpad/act4-assets.json` when it exists)

- **Creatures** (CAST keys to add in creatures.js, ACT_FILES.act4 = ['ashwing', 'smokeeater', 'embertick']):
  - `ashwing` → ashwing.glb, ~3 m wingspan, flier conventions (bat): idle, walk, run, glide, dive, land, takeoff, attack, hit, die.
  - `smokeEater` → smokeeater.glb, ~1.2 m hunched: idle, walk, run, consume (loop), attack, attack2 (grab leap), hit, die; a throat emissive material.
  - `emberTick` → embertick.glb, ~0.5 m: idle, walk, run, spawn, attack, leap, cling (loop), hit, die.
- **People** `ash.glb` (loadFolk('ash')): lampless, ashSpear, ashDwarf, ashBow, ashsmith, ivar, arna, arnaOld, isarnBoy, hammerhorn (rebind, ~2.3 m), karthax (rebind or fallback, ~1.8× scale, weaponScale ~1.6). Masks, lanterns, crowns, chains and weapons are added in code.
- **Pack** `cinder`: layers ashGround, ashTrod, scree, road, cliffRock, forgeTiles, forgeHerring, ironPlate, grate, rust; props deadTree, deadTreeB, rockA..rockD, boulder, shield, sword, warhammer, mace, statue, lantern ('glow' material), cagedLight, barrel, crossPein, bullHead, drakeRibs, drakeSpine, drakeSkull, ruinedTower, brazier ('glow'), bellows, anvil, tongs, quench, toolRack, stump. Credits in `src/assets/cinder/CREDITS.txt`.
