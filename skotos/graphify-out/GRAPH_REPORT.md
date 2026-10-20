# Graph Report - skotos  (2026-10-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2514 nodes · 8731 edges · 75 communities (72 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 188 edges (avg confidence: 0.85)
- Token cost: 39,673 input · 892 output

## Graph Freshness
- Built from commit: `564162f7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Monster AI & Bonds
- Actors & Spawning
- Enemy Death Effects
- Prop Mesh Builders
- Rime Asset Packing
- Boss Mechanics & Hazards
- Act Level Builders
- Visual Effects & Decals
- Creature Model Parts
- Act Actor Spawning
- Input & Boot
- Boss Attack Moves
- Act Verification Checks
- Inventory & Trading
- Ice Floes
- Cold Hazard System
- Music & Audio Data
- Package Dependencies
- Viewer Tools
- Story Events
- Cinder Asset Packing
- Combat Behaviors
- Act Transitions & Cutscenes
- Combat & Damage
- Sea & Sky Rendering
- Node Build Utilities
- Encounter Spawning
- Cutscene Triggers & Dialogue
- Act 5 Level Generation
- Tide System
- Wood Asset Packing
- Act 3 Props
- Boss Combo Attacks
- Environment Loading
- Level Generation
- Zone Asset Loading
- Asset Download Scripts
- Game Data Definitions
- People Animations
- Act 4 Level Generation
- Act 5 NPCs
- Animation Packing
- Bot Player AI
- Animation System
- Grid Map
- Procedural Sound Synthesis
- Math & Noise Utilities
- Item Generation
- HUD & Overlays
- Character Packing
- Act 4 Props
- Soak Testing
- Pickups & Loot Drops
- Animation Baking
- Music Melody Generation
- Save & Screens
- Forge Hazards
- Act 5 Sealing
- Act Ending Scenes
- Audio Playback & Voices
- Balance Testing
- Parity Testing
- Music Sequencing
- Scenario Testing
- Playwright Scripts
- Model Kits Loading
- Creature Animation
- Person Animation
- Materials & Shaders
- Impact Animation
- Stage Act Script
- Instanced Rendering
- Audio Curves
- Look Polish

## God Nodes (most connected - your core abstractions)
1. `emit()` - 174 edges
2. `clamp()` - 120 edges
3. `later()` - 105 edges
4. `P()` - 97 edges
5. `tally()` - 94 edges
6. `angleTo()` - 87 edges
7. `glowBurst()` - 69 edges
8. `t()` - 67 edges
9. `puff()` - 60 edges
10. `shake()` - 54 edges

## Surprising Connections (you probably didn't know these)
- `addProp()` --indirect_call--> `WOOD()`  [INFERRED]
  src/world/build.js → tools/pack-rime.mjs
- `boot()` --indirect_call--> `enterZone()`  [INFERRED]
  src/game/boot.js → src/game/world.js
- `boot()` --indirect_call--> `refreshStats()`  [INFERRED]
  src/game/boot.js → src/game/stats.js
- `startCreatureView()` --indirect_call--> `hasCreature()`  [INFERRED]
  src/debug/creatureview.js → src/gfx/creatures.js
- `viewAct5()` --indirect_call--> `toScreen()`  [INFERRED]
  src/debug/viewer.js → src/gfx/gfx.js

## Import Cycles
- 3-file cycle: `src/game/combat.js -> src/game/light.js -> src/game/world.js -> src/game/combat.js`
- 3-file cycle: `src/game/ice.js -> src/game/light.js -> src/game/world.js -> src/game/ice.js`
- 3-file cycle: `src/game/light.js -> src/game/world.js -> src/game/projectiles.js -> src/game/light.js`
- 3-file cycle: `src/game/combat.js -> src/game/projectiles.js -> src/game/ice.js -> src/game/combat.js`
- 3-file cycle: `src/game/combat.js -> src/game/projectiles.js -> src/game/tide.js -> src/game/combat.js`
- 3-file cycle: `src/game/cold.js -> src/game/combat.js -> src/ui/overlay.js -> src/game/cold.js`
- 4-file cycle: `src/game/cold.js -> src/game/combat.js -> src/game/pickups.js -> src/ui/overlay.js -> src/game/cold.js`
- 4-file cycle: `src/game/forge.js -> src/game/projectiles.js -> src/game/light.js -> src/game/world.js -> src/game/forge.js`
- 4-file cycle: `src/game/combat.js -> src/game/light.js -> src/game/world.js -> src/game/forge.js -> src/game/combat.js`
- 4-file cycle: `src/game/combat.js -> src/game/projectiles.js -> src/game/light.js -> src/game/world.js -> src/game/combat.js`
- 4-file cycle: `src/game/cold.js -> src/game/light.js -> src/game/world.js -> src/game/ice.js -> src/game/cold.js`
- 4-file cycle: `src/game/combat.js -> src/game/light.js -> src/game/world.js -> src/game/ice.js -> src/game/combat.js`
- 4-file cycle: `src/game/ice.js -> src/game/light.js -> src/game/world.js -> src/game/projectiles.js -> src/game/ice.js`
- 4-file cycle: `src/game/cold.js -> src/game/light.js -> src/game/world.js -> src/game/tide.js -> src/game/cold.js`
- 4-file cycle: `src/game/combat.js -> src/game/light.js -> src/game/world.js -> src/game/tide.js -> src/game/combat.js`
- 4-file cycle: `src/game/cold.js -> src/game/combat.js -> src/game/projectiles.js -> src/game/ice.js -> src/game/cold.js`
- 4-file cycle: `src/game/combat.js -> src/game/projectiles.js -> src/game/ice.js -> src/game/tide.js -> src/game/combat.js`
- 4-file cycle: `src/game/cold.js -> src/game/combat.js -> src/game/projectiles.js -> src/game/tide.js -> src/game/cold.js`
- 5-file cycle: `src/game/cold.js -> src/game/light.js -> src/game/world.js -> src/game/pickups.js -> src/ui/overlay.js -> src/game/cold.js`
- 5-file cycle: `src/game/forge.js -> src/game/projectiles.js -> src/game/ice.js -> src/game/light.js -> src/game/world.js -> src/game/forge.js`

## Communities (75 total, 3 thin omitted)

### Community 0 - "Monster AI & Bonds"
Cohesion: 0.03
Nodes (107): rebuildHash(), restoreRim(), AI, AI_LOG, AMARANTHE, ATK, ATK_SFX, bigs() (+99 more)

### Community 1 - "Actors & Spawning"
Cohesion: 0.05
Nodes (98): Actor, createPlayer(), monsterLevel(), rollAffixes(), spawnNpc(), packKinds(), flues(), setFlueHeat() (+90 more)

### Community 2 - "Enemy Death Effects"
Cohesion: 0.07
Nodes (74): foes(), near(), bowlStep(), dying(), elite(), kneel(), louseBurst(), pickBond() (+66 more)

### Community 3 - "Prop Mesh Builders"
Cohesion: 0.05
Nodes (72): packProp(), _a, anchorCode(), _b, bedAt(), bellMesh(), BERG, bergGeo() (+64 more)

### Community 4 - "Rime Asset Packing"
Cohesion: 0.08
Nodes (63): aoTex(), applyLook(), atlas(), bakeAO(), bakeWorld(), boundsOf(), boxBlur(), cleanMarks() (+55 more)

### Community 5 - "Boss Mechanics & Hazards"
Cohesion: 0.06
Nodes (67): alive(), bcd(), beamTick(), cagesBroken(), callDrowned(), cdm(), chargeEnd(), coilTick() (+59 more)

### Community 6 - "Act Level Builders"
Cohesion: 0.04
Nodes (53): beatPulse(), act5Level(), ACT4, act4Level(), ACT5, applyNight(), Batch, buildAmber() (+45 more)

### Community 7 - "Visual Effects & Decals"
Cohesion: 0.06
Nodes (50): lerp(), AMB5, ambient(), blood(), bolt(), breath(), clearFX(), clearPrints() (+42 more)

### Community 8 - "Creature Model Parts"
Cohesion: 0.08
Nodes (35): body(), buildAshspawn(), buildGoblin(), buildHealer(), buildHeartroot(), buildMage(), buildRanger(), buildSkeleton() (+27 more)

### Community 9 - "Act Actor Spawning"
Cohesion: 0.06
Nodes (55): act4Spawn(), act5Spawn(), actSpawn(), allies(), amberCrown(), ashCrown(), attachUpright(), battleLine() (+47 more)

### Community 10 - "Input & Boot"
Cohesion: 0.07
Nodes (52): aimAtMouse(), bindButton(), IN, initInput(), joy, pollInput(), takeEvents(), preloadModels() (+44 more)

### Community 11 - "Boss Attack Moves"
Cohesion: 0.09
Nodes (57): damp(), amberLob(), bigTele(), blackWave(), bodyLash(), bodySlam(), boilOut(), breach() (+49 more)

### Community 12 - "Act Verification Checks"
Cohesion: 0.07
Nodes (49): add(), bad(), cellOf(), fails, flood(), GROUNDED, HARD, heart() (+41 more)

### Community 13 - "Inventory & Trading"
Cohesion: 0.09
Nodes (46): Audio, fmt(), fmtK(), addToBag(), equip(), fromStash(), gamble(), gambleCost() (+38 more)

### Community 14 - "Ice Floes"
Cohesion: 0.09
Nodes (50): addFloes(), airborne(), batch(), beamIce(), cellsIn(), crackCells(), crackCone(), decay() (+42 more)

### Community 15 - "Cold Hazard System"
Cohesion: 0.08
Nodes (46): coldAdd(), coldMul(), coldNoRegen(), coldZone(), frostbite(), haz(), lee(), redUnder() (+38 more)

### Community 16 - "Music & Audio Data"
Cohesion: 0.05
Nodes (42): ANSWER, ARP6, ARP8, ASH_DAWN, ASH_PROGS, chordCache, COAST_LIT, COAST_PROGS (+34 more)

### Community 17 - "Package Dependencies"
Cohesion: 0.05
Nodes (39): dependencies, three, devDependencies, @gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions, meshoptimizer, vite (+31 more)

### Community 18 - "Viewer Tools"
Cohesion: 0.10
Nodes (40): audit(), startCreatureView(), act4At(), fakeCinder(), hashA(), layout5(), props5(), startViewer() (+32 more)

### Community 19 - "Story Events"
Cohesion: 0.07
Nodes (44): grantBuff(), act4Begins(), ALTARS, autumnFalls(), BEACON, brokkaArrives(), checkTears(), dismiss() (+36 more)

### Community 20 - "Cinder Asset Packing"
Cohesion: 0.10
Nodes (41): alongZ(), applyLook(), bakeWorld(), bellowsPose(), BONE, boundsOf(), boxBlur(), charCol() (+33 more)

### Community 21 - "Combat Behaviors"
Cohesion: 0.09
Nodes (45): dampAngle(), aggroCheck(), attackTick(), boss(), chainReach(), chainTick(), clampChain(), consume() (+37 more)

### Community 22 - "Act Transitions & Cutscenes"
Cohesion: 0.14
Nodes (45): writeSave(), later(), answer5(), busy(), cameo(), carve(), coastArrival(), dismiss5() (+37 more)

### Community 23 - "Combat & Damage"
Cohesion: 0.11
Nodes (42): act4Death(), actDeath(), actHit(), addRemains(), breakGuard(), clingHero(), curl(), curlHit() (+34 more)

### Community 24 - "Sea & Sky Rendering"
Cohesion: 0.07
Nodes (38): FX, groundBeds(), wetBeds(), BED_DRY, ICE_Y, AUR_COL, auroraSky(), bayCorners() (+30 more)

### Community 25 - "Node Build Utilities"
Cohesion: 0.08
Nodes (26): types, fitBounds(), flatten(), loadProp(), simplifyPrim(), transformAll(), triCount(), writePack() (+18 more)

### Community 26 - "Encounter Spawning"
Cohesion: 0.10
Nodes (40): spawnMonster(), arena(), arenaR(), braziers(), breakCage(), brood(), cageBlow(), callEater() (+32 more)

### Community 27 - "Cutscene Triggers & Dialogue"
Cohesion: 0.11
Nodes (39): lightChannel(), startHero(), cradlePoint(), actComplete(), alkBeacon(), alkTalk(), beaconScene(), childTalk() (+31 more)

### Community 28 - "Act 5 Level Generation"
Cohesion: 0.12
Nodes (38): bfs(), coastFaults(), coastHolds(), CORNER, dress5Coast(), dress5Far(), dressCoast(), fail() (+30 more)

### Community 29 - "Tide System"
Cohesion: 0.14
Nodes (35): BAY, cellsOf(), closeLane(), deepAt(), dryNear(), evict(), floodWave(), haz() (+27 more)

### Community 30 - "Wood Asset Packing"
Cohesion: 0.11
Nodes (31): io, packLayer(), bake(), boxBlur(), cutGround(), deckOf(), dot(), dropLoose() (+23 more)

### Community 31 - "Act 3 Props"
Cohesion: 0.16
Nodes (33): CODE5, soloBatch(), towerMesh(), act3Level(), act3Prop(), addProp(), amberMat(), anvilMesh() (+25 more)

### Community 32 - "Boss Combo Attacks"
Cohesion: 0.11
Nodes (33): angleTo(), ashBreath(), clawSweep(), clearFarLight(), comboStep(), diveTele(), echoCairns(), emberCombo() (+25 more)

### Community 33 - "Environment Loading"
Cohesion: 0.10
Nodes (27): bytes(), claim(), ENV, envChest(), envMesh(), GLOW, LAMB, lambert() (+19 more)

### Community 34 - "Level Generation"
Cohesion: 0.25
Nodes (28): angleDiff(), RNG(), genHalls(), genPass(), bandCells(), circleCells(), distFrom(), dryAt() (+20 more)

### Community 35 - "Zone Asset Loading"
Cohesion: 0.09
Nodes (29): makeAvatar(), ready(), standIn(), boot(), crew(), zoneFolk(), zonePacks(), zoneParts() (+21 more)

### Community 36 - "Asset Download Scripts"
Cohesion: 0.12
Nodes (26): ALLFB, download(), DRY, failed, fetchAmbientCG(), fetchPolyHaven(), fetchSketchfab(), FORCE (+18 more)

### Community 37 - "Game Data Definitions"
Cohesion: 0.09
Nodes (27): starterGear(), AFFIXES, BOON, BOONS, BUFFS, CLASSES, DODGE, GIFTS (+19 more)

### Community 38 - "People Animations"
Cohesion: 0.10
Nodes (26): ACT_COPY, addScenes(), CLIPS, HOLD, _inv, loadPeople(), LOOP, mergeGroup() (+18 more)

### Community 39 - "Act 4 Level Generation"
Cohesion: 0.21
Nodes (25): bandCells(), C4, cellAt(), chestSpot(), clearLine(), craneSamples(), genAshfield(), genForge() (+17 more)

### Community 40 - "Act 5 NPCs"
Cohesion: 0.12
Nodes (12): act5Npc(), frozenLook(), ghostly(), keeper(), lantern(), memoryLook(), statue(), Avatar (+4 more)

### Community 41 - "Animation Packing"
Cohesion: 0.09
Nodes (24): BODY, chunks, emit(), findAnim(), handPose(), HANDS, head, header (+16 more)

### Community 42 - "Bot Player AI"
Cohesion: 0.18
Nodes (23): installBot(), attackable(), bfs(), chooseSkill(), count(), danger(), escape(), gear() (+15 more)

### Community 43 - "Animation System"
Cohesion: 0.09
Nodes (14): TAU, ACTIONS, b64i16(), CLIPS, GRIP_STAFF_TILT, HOLD, LOOP, QuadAnim (+6 more)

### Community 44 - "Grid Map"
Cohesion: 0.14
Nodes (4): DX, DZ, GridMap, WQ

### Community 45 - "Procedural Sound Synthesis"
Cohesion: 0.20
Nodes (17): ad(), bird(), creak(), exhale(), formant(), gull(), inhale(), kRate() (+9 more)

### Community 46 - "Math & Noise Utilities"
Cohesion: 0.17
Nodes (13): clamp(), fbm(), hash2(), noise2(), smooth(), updateLights(), fallCode(), buildGround() (+5 more)

### Community 47 - "Item Generation"
Cohesion: 0.13
Nodes (19): rand, BASES, LEGENDARIES, SLOTS, STATS, ARMORS, clampPct(), JEWELRY (+11 more)

### Community 48 - "HUD & Overlays"
Cohesion: 0.15
Nodes (18): COLD, itemColor(), itemName(), updatePickups(), npcName(), frostVignette(), toScreen(), H (+10 more)

### Community 49 - "Character Packing"
Cohesion: 0.12
Nodes (14): argv, BASE, compose(), HEAD_JOINTS, headOnly(), hexRGB(), io, names (+6 more)

### Community 50 - "Act 4 Props"
Cohesion: 0.23
Nodes (18): jettyCode(), whaleCode(), act4Mats(), addProp4(), anvilGateFrame(), brazierFire(), cin4(), cinder() (+10 more)

### Community 51 - "Soak Testing"
Cohesion: 0.16
Nodes (11): { chromium }, FLAGS, iceSoak(), perf(), report, require, shotOf(), stats() (+3 more)

### Community 52 - "Pickups & Loot Drops"
Cohesion: 0.23
Nodes (16): add(), beamTexture(), clearPickups(), dropGlobe(), dropGold(), dropItem(), dropShard(), itemMesh() (+8 more)

### Community 53 - "Animation Baking"
Cohesion: 0.15
Nodes (12): KEEP, [knightPath, skelPath], MAP, out, poseAt(), qmul(), qnorm(), qslerp() (+4 more)

### Community 54 - "Music Melody Generation"
Cohesion: 0.13
Nodes (16): chance(), crackedBell(), forgetting(), genMelody(), jit(), keeperMotif(), metal(), mf() (+8 more)

### Community 55 - "Save & Screens"
Cohesion: 0.26
Nodes (13): DIFFS, deleteHero(), loadSave(), G, newHero(), hideScreen(), mainMenu(), screen() (+5 more)

### Community 56 - "Forge Hazards"
Cohesion: 0.23
Nodes (15): monsterDmg(), BREATH, burn(), di(), drips(), F, fluePeriod(), inFlue() (+7 more)

### Community 57 - "Act 5 Sealing"
Cohesion: 0.21
Nodes (15): freezeCells(), getBeam(), act5Enter(), checkpoint5(), endSeal(), holeLamps(), light5(), sealDone() (+7 more)

### Community 58 - "Act Ending Scenes"
Cohesion: 0.23
Nodes (15): ivarFalls(), lastLamp(), ternScene(), walkPath(), act4Presence(), bellowsBreathe(), bellowsWave(), breathe() (+7 more)

### Community 59 - "Audio Playback & Voices"
Cohesion: 0.23
Nodes (8): allow(), applyVolumes(), clamp(), makeNoise(), num(), playSfx(), playSting(), Voice

### Community 60 - "Balance Testing"
Cohesion: 0.14
Nodes (13): ACT, args, BOSS_ZONE, BOSSES, cfg, { chromium }, done, groups (+5 more)

### Community 61 - "Parity Testing"
Cohesion: 0.17
Nodes (7): add(), fails, fetch(), FOOT, keys, ROOT, tmp

### Community 62 - "Music Sequencing"
Cohesion: 0.15
Nodes (12): applyInt(), applyMood(), bassNote(), chooseProg(), chordOf(), drumStep(), killTheme(), pump() (+4 more)

### Community 63 - "Scenario Testing"
Cohesion: 0.17
Nodes (7): A4, A5, BOT5(), { chromium }, logs, require, S

### Community 64 - "Playwright Scripts"
Cohesion: 0.20
Nodes (7): { chromium }, logs, require, steps, { chromium }, logs, require

### Community 65 - "Model Kits Loading"
Cohesion: 0.24
Nodes (9): three, KIT, KIT_SCALE, KITMAT, loading, loadKit(), loadKits(), toFloat() (+1 more)

### Community 68 - "Materials & Shaders"
Cohesion: 0.33
Nodes (9): icyMat(), mats5(), envMats(), groundMat(), occlude(), Std(), wayMat(), worldMat() (+1 more)

### Community 69 - "Impact Animation"
Cohesion: 0.31
Nodes (8): all, [path, ...names], pose(), qmul(), root, slerp(), visit(), vrot()

### Community 70 - "Stage Act Script"
Cohesion: 0.25
Nodes (7): all, DONE, FIND, LANES, LENS, meta, TODO

### Community 71 - "Instanced Rendering"
Cohesion: 0.29
Nodes (4): Instancer, kitMaterial(), seedGlow(), treeMat()

### Community 72 - "Audio Curves"
Cohesion: 0.33
Nodes (5): distCurve(), limiterCurve(), makeGraph(), g, makeIR()

### Community 73 - "Look Polish"
Cohesion: 0.50
Nodes (3): ISSUES, meta, rounds

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `Model Kits Loading` to `Monster AI & Bonds`, `Actors & Spawning`, `Enemy Death Effects`, `Prop Mesh Builders`, `Rime Asset Packing`, `Act Level Builders`, `Visual Effects & Decals`, `Creature Model Parts`, `Act Actor Spawning`, `Input & Boot`, `Ice Floes`, `Cold Hazard System`, `Package Dependencies`, `Viewer Tools`, `Story Events`, `Cinder Asset Packing`, `Combat & Damage`, `Sea & Sky Rendering`, `Node Build Utilities`, `Wood Asset Packing`, `Environment Loading`, `Zone Asset Loading`, `People Animations`, `Animation Packing`, `Animation System`, `Pickups & Loot Drops`?**
  _High betweenness centrality (0.239) - this node is a cross-community bridge._
- **Should `Monster AI & Bonds` be split into smaller, more focused modules?**
  _Cohesion score 0.032432432432432434 - nodes in this community are weakly interconnected._
- **Why does `clamp()` connect `Math & Noise Utilities` to `Monster AI & Bonds`, `Actors & Spawning`, `Enemy Death Effects`, `Prop Mesh Builders`, `Boss Mechanics & Hazards`, `Act Level Builders`, `Visual Effects & Decals`, `Act Actor Spawning`, `Input & Boot`, `Boss Attack Moves`, `Ice Floes`, `Cold Hazard System`, `Viewer Tools`, `Story Events`, `Combat Behaviors`, `Combat & Damage`, `Sea & Sky Rendering`, `Act 5 Level Generation`, `Tide System`, `Act 3 Props`, `Boss Combo Attacks`, `Level Generation`, `Zone Asset Loading`, `People Animations`, `Act 4 Level Generation`, `Animation System`, `Item Generation`, `HUD & Overlays`, `Act 4 Props`, `Act 5 Sealing`, `Act Ending Scenes`, `Creature Animation`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `Actors & Spawning` be split into smaller, more focused modules?**
  _Cohesion score 0.04581634634051641 - nodes in this community are weakly interconnected._
- **Why does `emit()` connect `Cutscene Triggers & Dialogue` to `Monster AI & Bonds`, `Actors & Spawning`, `Enemy Death Effects`, `Boss Mechanics & Hazards`, `Input & Boot`, `Boss Attack Moves`, `Inventory & Trading`, `Ice Floes`, `Cold Hazard System`, `Story Events`, `Combat Behaviors`, `Act Transitions & Cutscenes`, `Combat & Damage`, `Encounter Spawning`, `Tide System`, `Boss Combo Attacks`, `Zone Asset Loading`, `HUD & Overlays`, `Pickups & Loot Drops`, `Save & Screens`, `Forge Hazards`, `Act 5 Sealing`, `Act Ending Scenes`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `Enemy Death Effects` be split into smaller, more focused modules?**
  _Cohesion score 0.06645569620253164 - nodes in this community are weakly interconnected._
- **Should `Prop Mesh Builders` be split into smaller, more focused modules?**
  _Cohesion score 0.0502283105022831 - nodes in this community are weakly interconnected._