# Graph Report - skotos  (2026-10-24)

## Corpus Check
- 145 files · ~788,956 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 2, .jsonl 2, .patch 1)

## Summary
- 3357 nodes · 10945 edges · 128 communities (119 shown, 9 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 1067 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `03fd38d7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Monster AI & Bonds
- Actors & Spawning
- skills.js
- Prop Mesh Builders
- Rime Asset Packing
- spawnMonster
- Act Level Builders
- fx.js
- Creature Model Parts
- Act Actor Spawning
- Input & Boot
- P
- check-act4.mjs
- Inventory & Trading
- ice.js
- Cold Hazard System
- Music & Audio Data
- Package Dependencies
- Viewer Tools
- story.js
- Cinder Asset Packing
- Combat Behaviors
- Act Transitions & Cutscenes
- Combat & Damage
- Sea & Sky Rendering
- Node Build Utilities
- tally
- addLight
- Act 5 Level Generation
- projectiles.js
- Wood Asset Packing
- coop.js
- killTele
- Environment Loading
- Level Generation
- Zone Asset Loading
- Asset Download Scripts
- Game Data Definitions
- People Animations
- Act 4 Level Generation
- transport.js
- Animation Packing
- Bot Player AI
- anim.js
- GridMap
- Procedural Sound Synthesis
- Math & Noise Utilities
- sap.js
- pickups.js
- Character Packing
- Act 4 Props
- Soak Testing
- glowBurst
- Animation Baking
- Music Melody Generation
- Save & Screens
- forge.js
- farlight
- Props
- Audio Playback & Voices
- Balance Testing
- Parity Testing
- Music Sequencing
- Scenario Testing
- Playwright Scripts
- Model Kits Loading
- Creature Animation
- Person Animation
- occlude
- Impact Animation
- Stage Act Script
- 5. Writing style
- Audio Curves
- Look Polish
- Act IV: The Ashen Forge
- createZone
- lurker
- Skotos: the difficulty curve as formulas, Acts I to IV
- coopui.js
- coop.mjs
- cold.js
- check-act3.mjs
- lightAt
- disposeZone
- gfx.js
- textures.js
- S2 (story lane): HUD, panels, overlay, audio, difficulty texts
- The causes, ranked
- own
- Act V assets as built: the stage A verification
- Integrate (stage C, integrator)
- Shared names
- rr
- clearFX
- Skotos Act V ("The Frozen Coast"): engine brief
- Act V look, fixer round 1 (progress notes first; the per-issue lines, metrics, perf, requests and shots at the end)
- Skotos, Act IV difficulty fix: release notes
- Skotos: simulated play, difficulty by zone and boss
- Verify, round 2: FAIL (Karthax, Ivar and all 12 scenario runs pass; 11 of 78 targets missed, all in the Forge's packs and one Field cell; the Warden class is not a step up on bosses)
- 1. Touchpoint checklist: everything an act wires
- C2: the enemies (combat, stage C)
- Gate G3 (stage B, Foundation): results and fixes
- Act IV fix: changes (base 7eded86, worktree pub/skotos; line numbers are the new file's)
- lastFire
- C1: mechanics and creature plumbing (combat, stage C)
- Act V release fixes (the last problems before Act V goes live)
- Shared names
- Πράξη V: Η Παγωμένη Ακτή, σε μία σελίδα
- C3: the two bosses, the cameo poses, blessings and legendaries (combat, stage C)
- sapAt
- Εκτέλεση
- B1a: plumbing and generation (world, stage B)
- S1 (story lane): the story and its text
- Pool
- B2a: sea.js (the water, the ice, the aurora, the beams) — report
- remembered
- addTele
- updateFX
- Stage C fixer: the three reviewers' 12 findings
- The code graph (graphify)
- lerp
- Act V look, fixer round 2 (progress notes first; per-issue lines, perf and shots at the end)
- Act V look, fixer round 3 (progress notes first; per-issue lines, perf and shots at the end)
- Village
- WallCut
- progress.md
- questions.md

## God Nodes (most connected - your core abstractions)
1. `emit()` - 196 edges
2. `clamp()` - 136 edges
3. `later()` - 107 edges
4. `P()` - 99 edges
5. `tally()` - 96 edges
6. `angleTo()` - 87 edges
7. `t()` - 81 edges
8. `glowBurst()` - 70 edges
9. `puff()` - 60 edges
10. `RNG()` - 56 edges

## Surprising Connections (you probably didn't know these)
- `Creatures (group `act5`)` --references--> `skua()`  [INFERRED]
  docs/act5-contract.md → src/game/ai.js
- `Built assets (details in `scratchpad/act3-assets.json`; a parallel workflow is polishing them, but names and clips stay)` --references--> `daze()`  [INFERRED]
  docs/act3-contract.md → src/game/ai.js
- `A4. Dash hits reach wider than their drawn telegraphs` --references--> `dashStep()`  [INFERRED]
  docs/act4-balance/final-plan.md → src/game/ai.js
- `8. Dash hits reach past their telegraphs (readability bug, shared code)` --references--> `dashStep()`  [INFERRED]
  docs/act4-balance/mechanics.md → src/game/ai.js
- `The level object L from gen3.js` --references--> `boss()`  [INFERRED]
  docs/act3-contract.md → src/game/ai.js

## Import Cycles
- 3-file cycle: `src/game/combat.js -> src/game/light.js -> src/game/world.js -> src/game/combat.js`
- 3-file cycle: `src/game/ice.js -> src/game/light.js -> src/game/world.js -> src/game/ice.js`
- 3-file cycle: `src/game/light.js -> src/game/world.js -> src/game/projectiles.js -> src/game/light.js`
- 3-file cycle: `src/game/combat.js -> src/game/projectiles.js -> src/game/ice.js -> src/game/combat.js`
- 3-file cycle: `src/game/combat.js -> src/game/projectiles.js -> src/game/tide.js -> src/game/combat.js`
- 3-file cycle: `src/game/cold.js -> src/game/combat.js -> src/ui/overlay.js -> src/game/cold.js`
- 4-file cycle: `src/game/cold.js -> src/game/combat.js -> src/game/pickups.js -> src/ui/overlay.js -> src/game/cold.js`
- 4-file cycle: `src/game/combat.js -> src/game/light.js -> src/game/world.js -> src/game/forge.js -> src/game/combat.js`
- 4-file cycle: `src/game/forge.js -> src/game/projectiles.js -> src/game/light.js -> src/game/world.js -> src/game/forge.js`
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
- 5-file cycle: `src/game/combat.js -> src/game/projectiles.js -> src/game/light.js -> src/game/world.js -> src/game/forge.js -> src/game/combat.js`

## Communities (128 total, 9 thin omitted)

### Community 0 - "Monster AI & Bonds"
Cohesion: 0.04
Nodes (89): src/game/ai.js (the Act V block after sunkTick, "Act V: the Skotos's creatures and the coast's beasts"), dampAngle(), lieDown(), rebuildHash(), restoreRim(), AI, AI_LOG, AMARANTHE (+81 more)

### Community 1 - "Actors & Spawning"
Cohesion: 0.05
Nodes (98): A3. The waylamp checkpoint is lost on Continue, and waypoint 2 is never a respawn (and the Forge has none), 7. BUG: the waylamp checkpoint is lost on Continue, and waypoint 2 is never a respawn, 1.4 Atmosphere and FX ambients, 2. Reusable systems, and how a frozen coast can use them, Πώς δουλεύουν οι χαρακτήρες, flues(), setFlueHeat(), stopFlues() (+90 more)

### Community 2 - "skills.js"
Cohesion: 0.14
Nodes (35): Combat (owned by combat), E. The Field of Ash shields (1-24% of the excess; the Ranger), takeEvents(), foes(), heroHit(), shakeOff(), updatePlayer(), VB (+27 more)

### Community 3 - "Prop Mesh Builders"
Cohesion: 0.05
Nodes (71): `src/world/build5.js` (mine, ~900 lines), Lead decisions, packProp(), _a, anchorCode(), angD(), _b, beamOn() (+63 more)

### Community 4 - "Rime Asset Packing"
Cohesion: 0.08
Nodes (63): aoTex(), applyLook(), atlas(), bakeAO(), bakeWorld(), boundsOf(), boxBlur(), cleanMarks() (+55 more)

### Community 5 - "spawnMonster"
Cohesion: 0.09
Nodes (46): tower (the bot was wrong, and the game had one bug in two places), damp(), spawnMonster(), alive(), arena(), arenaR(), bcd(), bigs() (+38 more)

### Community 6 - "Act Level Builders"
Cohesion: 0.05
Nodes (82): 1.3 Build and visuals (`world/build.js`), 3.1 Sea / water surface and shoreline (2-3 d), 3.5 Aurora sky (1-1.5 d), beatPulse(), act3Level(), act3Prop(), ACT4, act4Level() (+74 more)

### Community 7 - "fx.js"
Cohesion: 0.13
Nodes (20): AMB5, decal(), decalGeo, explosion0(), flash(), flash0(), footprint(), killTele0() (+12 more)

### Community 8 - "Creature Model Parts"
Cohesion: 0.08
Nodes (49): 6.1 Node-only steps (Acts II-IV, no Blender), Creatures and people, The rime pack (`rime`), lantern(), bandParts(), barnacleParts(), body(), braidParts() (+41 more)

### Community 9 - "Act Actor Spawning"
Cohesion: 0.06
Nodes (62): Open problems, 1.7 Actors (`game/actors.js`), src/game/actors.js, act4Spawn(), act5Npc(), act5Spawn(), actSpawn(), allies() (+54 more)

### Community 10 - "Input & Boot"
Cohesion: 0.06
Nodes (56): aimAtMouse(), bindButton(), IN, initInput(), joy, pollInput(), preloadModels(), boot() (+48 more)

### Community 11 - "P"
Cohesion: 0.07
Nodes (88): B. Karthax (the cliff: 44-70% of the excess), D. Ivar's Dark (9-23% of the excess; the Mage on Wanderer), Stubbed or left for stage C, Balance (measured), The scaling table (data.js `COOP`), angleTo(), amberLob(), ashBreath() (+80 more)

### Community 12 - "check-act4.mjs"
Cohesion: 0.17
Nodes (22): Lead decisions (override the plan), Story (story), Zones and exits, 0. Ten facts that shape Act V, add(), ashfield(), bad(), cellOf() (+14 more)

### Community 13 - "Inventory & Trading"
Cohesion: 0.11
Nodes (40): Audio, fmtK(), addToBag(), equip(), fromStash(), gamble(), gambleCost(), reforge() (+32 more)

### Community 14 - "ice.js"
Cohesion: 0.05
Nodes (95): B1b: runtime grids, the tide and the ice (world, stage B), Calls in files I do not own (owners not running in stage B; the contract names them as B1's smallest changes), Changes in files I do not own, How I tested it (scratch paths under scratchpad/act5/b/b1b/), Open problems, Stubbed or left for stage C, What I built, Tide and ice gameplay (ice.js, ai.js, skills.js) (+87 more)

### Community 15 - "Cold Hazard System"
Cohesion: 0.13
Nodes (28): src/game/light.js, aim(), attachCradle(), clearLight(), cradleMesh(), discMesh(), drink(), dropBeam() (+20 more)

### Community 16 - "Music & Audio Data"
Cohesion: 0.05
Nodes (42): ANSWER, ARP6, ARP8, ASH_DAWN, ASH_PROGS, chordCache, COAST_LIT, COAST_PROGS (+34 more)

### Community 17 - "Package Dependencies"
Cohesion: 0.05
Nodes (39): dependencies, three, devDependencies, @gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions, meshoptimizer, vite (+31 more)

### Community 18 - "Viewer Tools"
Cohesion: 0.13
Nodes (30): audit(), startCreatureView(), act4At(), fakeCinder(), hashA(), layout5(), props5(), startViewer() (+22 more)

### Community 19 - "story.js"
Cohesion: 0.07
Nodes (55): 1.10 Story: quests and cinematics (`game/story.js`), monsterLevel(), spawnNpc(), grantBuff(), act4Begins(), ALTARS, autumnFalls(), BEACON (+47 more)

### Community 20 - "Cinder Asset Packing"
Cohesion: 0.10
Nodes (41): alongZ(), applyLook(), bakeWorld(), bellowsPose(), BONE, boundsOf(), boxBlur(), charCol() (+33 more)

### Community 21 - "Combat Behaviors"
Cohesion: 0.11
Nodes (46): Combat (combat), 1.8 AI behaviours and traits (`game/ai.js`), 3.3 Ice that cracks under weight (2-3 d), Combat, aggroCheck(), attackTick(), boss(), chainReach() (+38 more)

### Community 22 - "Act Transitions & Cutscenes"
Cohesion: 0.10
Nodes (69): 6.2 How quests move (story.js), 3.13 Act-agnostic plumbing for a fifth act (1.5-2 d), Story, ending, Music, skotos Το Σκότος / The Skotos, startHero(), inhale() (+61 more)

### Community 23 - "Combat & Damage"
Cohesion: 0.12
Nodes (30): 5. The Ash-Fallen shield blocks every class's basic attack (design rule, phone-hostile), 3.11 Cold damage and warmth (1-1.5 d), src/game/combat.js, src/game/combat.js, The Sea-Lights and the Cold (Οι Φάροι και το Ψύχος): both zones and both fights, COOP_K(), curl(), curlHit() (+22 more)

### Community 24 - "Sea & Sky Rendering"
Cohesion: 0.07
Nodes (61): Others, `src/world/build.js`, `src/world/sea.js` (new, ~870 lines), Stubbed or left for later, What I built, `src/world/build.js` (mine), `src/world/sea.js` (mine; B2a's file, changed in this run), Visuals (+53 more)

### Community 25 - "Node Build Utilities"
Cohesion: 0.08
Nodes (26): types, fitBounds(), flatten(), loadProp(), simplifyPrim(), transformAll(), triCount(), writePack() (+18 more)

### Community 26 - "tally"
Cohesion: 0.09
Nodes (47): 6.4 The creature contract (`tools/creatures/README.md`, `gfx/creatures.js`), near(), bowlStep(), breachUp(), breakCage(), cageBlow(), cagesBroken(), callMourners() (+39 more)

### Community 27 - "addLight"
Cohesion: 0.20
Nodes (24): 1.11 World-state flags, gorge(), cradlePoint(), actComplete(), beaconScene(), fireAnswers(), fireLeaves(), fourthOut() (+16 more)

### Community 28 - "Act 5 Level Generation"
Cohesion: 0.12
Nodes (39): bfs(), coastFaults(), coastHolds(), CORNER, dress5Coast(), dress5Far(), dressCoast(), fail() (+31 more)

### Community 29 - "projectiles.js"
Cohesion: 0.19
Nodes (17): Map and runtime grids, clearRemains(), dropRemains(), updateRemains(), tickIce(), area0(), endProj(), fire() (+9 more)

### Community 30 - "Wood Asset Packing"
Cohesion: 0.11
Nodes (31): io, packLayer(), bake(), boxBlur(), cutGround(), deckOf(), dot(), dropLoose() (+23 more)

### Community 31 - "coop.js"
Cohesion: 0.06
Nodes (79): ACT_DT, actorEntry(), addRemote(), chunk(), cleanItem(), clipIdx(), coopK(), dropRemote() (+71 more)

### Community 32 - "killTele"
Cohesion: 0.14
Nodes (25): What is built, clearFarLight(), coilTick(), dropCoil(), dropWrap(), dying(), fightCam(), handHole() (+17 more)

### Community 33 - "Environment Loading"
Cohesion: 0.11
Nodes (28): bytes(), claim(), ENV, envChest(), envMesh(), GLOW, LAMB, lambert() (+20 more)

### Community 34 - "Level Generation"
Cohesion: 0.23
Nodes (31): angleDiff(), fbm(), RNG(), genHalls(), genPass(), bandCells(), circleCells(), distFrom() (+23 more)

### Community 35 - "Zone Asset Loading"
Cohesion: 0.12
Nodes (18): makeAvatar(), ready(), standIn(), ACT_FILES, CAST, CREATURES, FILES, hasCreature() (+10 more)

### Community 36 - "Asset Download Scripts"
Cohesion: 0.12
Nodes (26): ALLFB, download(), DRY, failed, fetchAmbientCG(), fetchPolyHaven(), fetchSketchfab(), FORCE (+18 more)

### Community 37 - "Game Data Definitions"
Cohesion: 0.06
Nodes (42): RARE_A(), RARE_B(), starterGear(), AFFIXES, BASES, BOON, BOONS, BUFFS (+34 more)

### Community 38 - "People Animations"
Cohesion: 0.09
Nodes (25): ../assets/moves.bin?url, ../assets/people.glb?url, ACT_COPY, CLIPS, HOLD, _inv, LOOP, mergeGroup() (+17 more)

### Community 39 - "Act 4 Level Generation"
Cohesion: 0.19
Nodes (28): 1.2 Level generation, The level object L (gen5.js), Synthesis: base, grafts and fixes, bandCells(), C4, cellAt(), chestSpot(), clearLine() (+20 more)

### Community 40 - "transport.js"
Cohesion: 0.06
Nodes (43): Byte budget (measured), How it plays, Inviting a friend on claude.ai, Quest credit (the decision), Skotos co-op, Tests, The shipped scenarios, The transports (+35 more)

### Community 41 - "Animation Packing"
Cohesion: 0.09
Nodes (24): BODY, chunks, emit(), findAnim(), handPose(), HANDS, head, header (+16 more)

### Community 42 - "Bot Player AI"
Cohesion: 0.19
Nodes (22): installBot(), attackable(), bfs(), chooseSkill(), count(), danger(), escape(), gear() (+14 more)

### Community 43 - "anim.js"
Cohesion: 0.08
Nodes (16): TAU, ACTIONS, b64i16(), CLIPS, getClip(), GRIP_STAFF_TILT, HOLD, HumanoidAnim (+8 more)

### Community 44 - "GridMap"
Cohesion: 0.06
Nodes (30): 10. Fire arrows burn where they hit her (side effect), 11. Ashsmiths and the Hall of Moulds (design hot-spot), 12. Phone readability and control (qualitative), 1. Karthax: what each phase does (design numbers), 2. The Forge's Breath, where it bites (design rule), 4. BUG: affixes fire from a tick on her back and from an Ashwing in the sky, 6. Ivar's Dark: the light is smaller than the distance he keeps (design numbers), 8. Dash hits reach past their telegraphs (readability bug, shared code) (+22 more)

### Community 45 - "Procedural Sound Synthesis"
Cohesion: 0.20
Nodes (17): ad(), bird(), creak(), exhale(), formant(), gull(), inhale(), kRate() (+9 more)

### Community 46 - "Math & Noise Utilities"
Cohesion: 0.11
Nodes (10): clamp(), hash2(), noise2(), smooth(), QuadAnim, SpiderAnim, whaleCode(), ashRise() (+2 more)

### Community 47 - "sap.js"
Cohesion: 0.15
Nodes (18): rand, Actor, add(), addSapPool0(), addSapRing(), clearSap(), dripFall(), drips (+10 more)

### Community 48 - "pickups.js"
Cohesion: 0.10
Nodes (31): fmt(), heroAvatar(), refreshHeroLook(), COLD, healHero(), itemColor(), itemName(), weaponLook() (+23 more)

### Community 49 - "Character Packing"
Cohesion: 0.12
Nodes (14): argv, BASE, compose(), HEAD_JOINTS, headOnly(), hexRGB(), io, names (+6 more)

### Community 50 - "Act 4 Props"
Cohesion: 0.23
Nodes (18): jettyCode(), towerMesh(), act4Mats(), addProp4(), anvilGateFrame(), brazierFire(), cin4(), cinder() (+10 more)

### Community 51 - "Soak Testing"
Cohesion: 0.13
Nodes (15): fatalAll(), fatalNow(), watchFatal(), { chromium }, FATAL, FLAGS, iceSoak(), perf() (+7 more)

### Community 52 - "glowBurst"
Cohesion: 0.16
Nodes (20): 1. What applied cleanly, act4Death(), actDeath(), gainXP(), kill(), seeHero(), add(), dropGlobe() (+12 more)

### Community 53 - "Animation Baking"
Cohesion: 0.15
Nodes (13): KEEP, [knightPath, skelPath], load(), MAP, out, poseAt(), qmul(), qnorm() (+5 more)

### Community 54 - "Music Melody Generation"
Cohesion: 0.13
Nodes (16): chance(), crackedBell(), forgetting(), genMelody(), jit(), keeperMotif(), metal(), mf() (+8 more)

### Community 55 - "Save & Screens"
Cohesion: 0.19
Nodes (15): CLASSES, DIFFS, deleteHero(), G, newHero(), ICON, SLOT_ICON, hideScreen() (+7 more)

### Community 56 - "forge.js"
Cohesion: 0.12
Nodes (24): A1. Slag drips fall on Karthax's platform, statues, ghost pools and in the Hall of Moulds, A2. Elite affixes fire from a clinging Ember Tick or an airborne Ashwing, A4. Dash hits reach wider than their drawn telegraphs, A. Bugs (all from the diagnosis), C. The Forge's Breath (11-31% of the excess, nearly all of the Forge's own), F. Not changed, on purpose, G. Expected numbers afterwards, H. Verification (fast) (+16 more)

### Community 57 - "farlight"
Cohesion: 0.07
Nodes (40): 3.12 Walking on non-zero ground (0.5-1 d, only if the design wants real slopes on ice shelves), B2b: props, atmospheres, FX and the perf gate (sea, stage B) — report, Changes in files I do not own, How I tested it, Open problems and requests, Progress notes (as written during the run), `src/gfx/fx.js` (mine): ambients `coast`, `coastFrozen` (diamond dust, no sea smoke), `farlight`, `blizzard`;, `src/world/atmos.js` (mine): `coast`, `coastCine`, `coastFrozen`, `coastAurora`, `farlight`, `farlightFight`, (+32 more)

### Community 58 - "Props"
Cohesion: 0.05
Nodes (42): Act V asset scouting: The Frozen Coast, Anchors, Before any download, Black sand and shingle, Boss: big creature, Boss: humanoid-ish, Bosses, Chains (+34 more)

### Community 59 - "Audio Playback & Voices"
Cohesion: 0.23
Nodes (8): allow(), applyVolumes(), clamp(), makeNoise(), num(), playSfx(), playSting(), Voice

### Community 60 - "Balance Testing"
Cohesion: 0.13
Nodes (14): ACT, args, BOSS_ZONE, BOSSES, cfg, { chromium }, done, groups (+6 more)

### Community 61 - "Parity Testing"
Cohesion: 0.17
Nodes (7): add(), fails, fetch(), FOOT, keys, ROOT, tmp

### Community 62 - "Music Sequencing"
Cohesion: 0.15
Nodes (12): applyInt(), applyMood(), bassNote(), chooseProg(), chordOf(), drumStep(), killTheme(), pump() (+4 more)

### Community 63 - "Scenario Testing"
Cohesion: 0.12
Nodes (9): A4, A5, BOT5(), under(), { chromium }, FATAL, logs, require (+1 more)

### Community 64 - "Playwright Scripts"
Cohesion: 0.20
Nodes (7): { chromium }, logs, require, steps, { chromium }, logs, require

### Community 65 - "Model Kits Loading"
Cohesion: 0.13
Nodes (15): three, ../assets/dungeon.glb?url, ../assets/grave.glb?url, ../assets/town.glb?url, KIT, KIT_SCALE, KITMAT, loading (+7 more)

### Community 68 - "occlude"
Cohesion: 0.14
Nodes (18): 3.10 Swimming, 3.4 Ice floes, 3.6 Falling snow (0-0.5 d), 3.7 Fog banks (0.5-1 d), 3.8 Ships and wrecks (1.5-2.5 d), 3.9 Under-water or under-ice spaces, 3. What a frozen coast needs that does not exist yet, icyMat() (+10 more)

### Community 69 - "Impact Animation"
Cohesion: 0.31
Nodes (8): all, [path, ...names], pose(), qmul(), root, slerp(), visit(), vrot()

### Community 70 - "Stage Act Script"
Cohesion: 0.25
Nodes (7): all, DONE, FIND, LANES, LENS, meta, TODO

### Community 71 - "5. Writing style"
Cohesion: 0.05
Nodes (42): 0. The ten things that matter most, 1.1 The intro (intro.1-5), the only "official history", 1.2 The Breaking (a thousand years ago, on the Field of Ash), 1.3 The peoples, 1.4 The shards, their keepers and their wishes (all now unmade), 1.5 The beacons (φρυκτωρίες), 1.6 The Wayfarers (the rules the act set), 1.7 Timeline (+34 more)

### Community 72 - "Audio Curves"
Cohesion: 0.33
Nodes (5): distCurve(), limiterCurve(), makeGraph(), g, makeIR()

### Community 73 - "Look Polish"
Cohesion: 0.50
Nodes (3): ISSUES, meta, rounds

### Community 75 - "Act IV: The Ashen Forge"
Cohesion: 0.06
Nodes (35): Act IV: The Ashen Forge, ashFallen Πεσμένος της Τέφρας (και Τοξότης της Τέφρας) / Ash-Fallen (and Ash-Fallen Bowman) (new=False), ashfield (22) Το Πεδίο της Τέφρας / The Field of Ash, ashsmith Τεφρομάστορας / Ashsmith (new=True), ashwing Τεφρόφτερος / Ashwing (new=True), Asset audit, beats, Blessings (+27 more)

### Community 76 - "createZone"
Cohesion: 0.10
Nodes (34): 1.1 Zones and exits, Zones and exits, beats, coast (28) Η Παγωμένη Ακτή / The Frozen Coast, npcs, premise, Story, twist (+26 more)

### Community 77 - "lurker"
Cohesion: 0.11
Nodes (30): The Cracking Ice (Ο Πάγος που Ραγίζει): the coast's shelves and Skerry Bay, every thin field on the Farthest Light, breachAt(), breachCell(), bubbles(), goUnder(), harpoonEnd(), harpoonHit(), holeAt() (+22 more)

### Community 78 - "Skotos: the difficulty curve as formulas, Acts I to IV"
Cohesion: 0.07
Nodes (26): 1. Experience and the hero's level, 2. How a monster's level is chosen, 3. The hero's power, 4. Monster power, 5.1 Each zone, each class, Warden and Wanderer, 5.2 Content only: the same hero against every zone, 5.3 Each boss, each class, Warden and Wanderer, 5.4 Act over act (each zone or boss over the one before it) (+18 more)

### Community 79 - "coopui.js"
Cohesion: 0.20
Nodes (20): party(), respawnNow(), S, stale(), H, on(), build(), click() (+12 more)

### Community 80 - "coop.mjs"
Cohesion: 0.13
Nodes (19): { chromium }, conn(), ev(), FATAL, hostPos(), ok(), on(), onConnection() (+11 more)

### Community 81 - "cold.js"
Cohesion: 0.23
Nodes (19): src/game/cold.js (new, ~150 lines), src/game/data.js (beyond DIFFS/HAZ5), src/game/sap.js, What I built, coldAdd(), coldMul(), coldNoRegen(), coldZone() (+11 more)

### Community 82 - "check-act3.mjs"
Cohesion: 0.17
Nodes (17): add(), bad(), cellOf(), fails, flood(), GROUNDED, HARD, heart() (+9 more)

### Community 83 - "lightAt"
Cohesion: 0.21
Nodes (17): 2. The conflicts (9 hunks in 5 files) and how each was resolved, 3. Six difficulties («Σκότος», index 5), 4. Act V code changed to fit the fix, 5. Things the port does to Act V without code changes (for the Act V owner to know), 6. Unsure / left for the Act V owner, 7. Runtime check (private no-HMR server, port 5287, one browser at a time, stopped after), 8. Verification pass (second agent; files in `verifyport/`), Porting the Act IV difficulty fix onto Act V (branch claude/sleepy-tesla-4030vd) (+9 more)

### Community 84 - "disposeZone"
Cohesion: 0.12
Nodes (17): 1.5 Packs, people sets and creature groups: how they load and unload, Creatures (group `act5`), Expected assets, File ownership (edit only your own files in your stage), People (set `frost`), Shared names, Skotos Act V: code contract, Stage A outcome (lead decisions, 10 October) (+9 more)

### Community 85 - "gfx.js"
Cohesion: 0.13
Nodes (16): AUR_GREEN, hit, initGfx(), kick(), LIGHTS, ndc, onContextLost(), plane (+8 more)

### Community 86 - "textures.js"
Cohesion: 0.21
Nodes (16): cache, canvas(), finish(), hashP(), MAKERS, masonry(), masonryField(), masonryNormal() (+8 more)

### Community 87 - "S2 (story lane): HUD, panels, overlay, audio, difficulty texts"
Cohesion: 0.12
Nodes (15): audio.js, Close, How it was tested, hud.js, Open problems, overlay.js / style.css, panels.js, Progress notes (as it went) (+7 more)

### Community 88 - "The causes, ranked"
Cohesion: 0.13
Nodes (14): 1. Karthax: the fight's numbers and structure (design/tuning). 44-70% of the excess, 2. The Forge's Breath (tuning/design). 11-31% of the excess, and nearly all of the Forge's, 3. Ivar (design). 9-23% of the excess, a local bump rather than the cliff, 4. The Field of Ash (design/readability). 1-24% of the excess, mostly in walked runs, 5. The level drift (levelling). A slope present in every act, small here, 6. Act III is the trough (design of the curve). Inflates the IV/III ratio by about ×1.8, 7. The bugs (bug). Under 5% of the measured damage, but bad for feel and retries, 8. Phone readability (readability). Not measured, adds on top of #1 and #2 (+6 more)

### Community 89 - "own"
Cohesion: 0.21
Nodes (14): Findings, Left as is (noted, not in the findings), Re-runs (after all the fixes), Stage B fixer: the two reviewers' 9 findings, ICE, fireCage(), flame5(), flames() (+6 more)

### Community 90 - "Act V assets as built: the stage A verification"
Cohesion: 0.14
Nodes (13): Act V assets as built: the stage A verification, Changes in this pass, Checks by asset, Creatures (`?cview`, numbers from the new `&audit` mode), How to repeat, Measured files, Outcome, People (`?viewer`, and the creature viewer's new `&folk=` in the artifact) (+5 more)

### Community 91 - "Integrate (stage C, integrator)"
Cohesion: 0.14
Nodes (13): Bugs found and fixed at their root (this run), Difficulty: Act V on the fixed curve, Fourth run (02:36, after a restart; the lead committed everything as b57ca18), Integrate (stage C, integrator), Joins to do (from the reports), Open, for others, Progress notes (as it goes; a restart resumes from here), Second run (21:32, after the lead's commits ef5d02b (my joins and scenarios) and c388c3c (the Act IV fix ported)) (+5 more)

### Community 92 - "Shared names"
Cohesion: 0.17
Nodes (11): Built assets (details in `scratchpad/act3-assets.json`; a parallel workflow is polishing them, but names and clips stay), File ownership (edit only your own files), Lead decisions (override the plan), Map (`src/world/map.js`, owned by world), Shared names, Skotos Act III: code contract, Story (owned by story), The level object L from gen3.js (+3 more)

### Community 93 - "rr"
Cohesion: 0.20
Nodes (12): blood(), breath(), freezeCrystals0(), glowBurst0(), hitFx(), hitFx0(), iceShards0(), puff0() (+4 more)

### Community 94 - "clearFX"
Cohesion: 0.20
Nodes (7): clearFX(), clearPrints(), decal0(), decalBed(), decalTexture(), ring0(), Trail

### Community 95 - "Skotos Act V ("The Frozen Coast"): engine brief"
Cohesion: 0.18
Nodes (10): 4. The level and difficulty curve so far, and Act V's levels, 5.1 Artifact as built now, 5.2 What each act loads (raw files / artifact / phone GPU textures), 5.3 Act V budget, 5.4 Contingency: unloading (1-2 d, only if the owner's phone struggles), 5. Performance and memory, 6.2 Blender steps, 6.3 Where sources live (+2 more)

### Community 96 - "Act V look, fixer round 1 (progress notes first; the per-issue lines, metrics, perf, requests and shots at the end)"
Cohesion: 0.18
Nodes (10): Act V look, fixer round 1 (progress notes first; the per-issue lines, metrics, perf, requests and shots at the end), detail = mean |image - 6 px box blur| over the middle 50%; before = crit1/, after = r1/after/, same views and seeds), load 8.3: another workflow's browser ran beside it; the verdict is the median of per-cycle ratios to the Field), METRICS (r1/tools/metrics.py: near-black = max channel < 16/255 over the frame; centre = mean RGB of the middle 50%;, Not fixed and why (besides the requests), Per issue, one line each (B = the critic's crit1/<dir>/<name>, A = r1/after/<dir>/<name>, both under scratchpad/act5/look/), PERF (perf5, tools/scenario.mjs, phone 915x412 at 1.5, SwiftShader, 5 cycles; r1/perfH/perf5.txt, 04:49-04:58 Oct 17,, Progress notes (+2 more)

### Community 97 - "Skotos, Act IV difficulty fix: release notes"
Cohesion: 0.20
Nodes (9): Files (balance/), How this release was checked, In one paragraph, Left as it is, on purpose, Publishing, Skotos, Act IV difficulty fix: release notes, The numbers, before and after, What changed, file by file (+1 more)

### Community 98 - "Skotos: simulated play, difficulty by zone and boss"
Cohesion: 0.20
Nodes (9): Act IV under-levelled, pack by pack, and the bosses (hero at zone level − 3, item level 3 below that), Act IV under-levelled, zones walked (hero at zone level − 3, item level 3 below that), Act over act, Mage, Ranger, Skotos: simulated play, difficulty by zone and boss, Step by step (each zone over the one before, each boss over the one before), Warden (+1 more)

### Community 99 - "Verify, round 2: FAIL (Karthax, Ivar and all 12 scenario runs pass; 11 of 78 targets missed, all in the Forge's packs and one Field cell; the Warden class is not a step up on bosses)"
Cohesion: 0.20
Nodes (9): Bosses (lives a fight; before = sim.json -> after; W = Warden difficulty, Wa = Wanderer), Files (balance/), Next (ranked), Overshoot (task step 3), Scenarios (balance/scen-v2; every run exit 0, no page errors or warnings), Verdict, Verify, round 2: FAIL (Karthax, Ivar and all 12 scenario runs pass; 11 of 78 targets missed, all in the Forge's packs and one Field cell; the Warden class is not a step up on bosses), What round 2 found and changed (+1 more)

### Community 100 - "1. Touchpoint checklist: everything an act wires"
Cohesion: 0.20
Nodes (10): 1.12 Saves and migration, 1.13 HUD and UI, 1.14 Audio (`audio/audio.js`, all procedural WebAudio, no files), 1.15 Echoes (boss refights), 1.16 Credits, 1.17 Text (`src/i18n/text.js`, Greek first), 1.18 Debug views, 1.19 Scenarios and layout checks (+2 more)

### Community 101 - "C2: the enemies (combat, stage C)"
Cohesion: 0.20
Nodes (9): C2: the enemies (combat, stage C), Differences from the design (code is the truth; written down), How I tested it, Open problems, Progress notes, Requests for the story lane (not my files), src/game/data.js, src/game/projectiles.js, src/game/skills.js, src/i18n/text.js (+1 more)

### Community 102 - "Gate G3 (stage B, Foundation): results and fixes"
Cohesion: 0.20
Nodes (9): Artifact, Fixes (gate keeper; all in stage-B files), Gate G3 (stage B, Foundation): results and fixes, Left for later (not gate failures; for C or the review), Perf (perf5, final code, perf5b/perf5.txt), Scenarios (scen/summary.txt; one at a time, BASE :5341), Servers, The walk (shots/, phone q1 unless named d*) (+1 more)

### Community 103 - "Act IV fix: changes (base 7eded86, worktree pub/skotos; line numbers are the new file's)"
Cohesion: 0.22
Nodes (8): A. Bugs, Act IV fix: changes (base 7eded86, worktree pub/skotos; line numbers are the new file's), B. Karthax, C. The Forge's Breath, D. Ivar, E. The Field's shields, Notes, Tools

### Community 104 - "lastFire"
Cohesion: 0.28
Nodes (9): 1.9 Bosses, Sealing the Breathing-holes (Οι Ανάσες): the Farthest Light (q28), ivarDark(), lastFire(), isLamp(), lampNear(), setHeroLight(), setLightDark() (+1 more)

### Community 105 - "C1: mechanics and creature plumbing (combat, stage C)"
Cohesion: 0.22
Nodes (8): C1: mechanics and creature plumbing (combat, stage C), How I tested it (c/probe.mjs '<query>' steps.json outPrefix; q0 for function, q1 for looks; story flags in the query), Open problems, Progress notes, Requests for the story lane (I did not touch these files), Stubbed or left for C2/C3 (my plumbing is ready for them), setBeamLen(), frostImage()

### Community 106 - "Act V release fixes (the last problems before Act V goes live)"
Cohesion: 0.22
Nodes (8): 1. Frame time at the coast (perf5), 2. The Act V checkpoint after Continue (cp5), 3. Flaky scenarios, 4. Errors the tests could not see (#fatal), Act V release fixes (the last problems before Act V goes live), Files, holes (the test was wrong), Progress

### Community 107 - "Shared names"
Cohesion: 0.25
Nodes (7): Expected assets (verify against `scratchpad/act4-assets.json` when it exists), File ownership (edit only your own files), Map (world), Shared names, Skotos Act IV: code contract, The level object L from gen4.js (world), Visuals (`build.js`, world)

### Community 108 - "Πράξη V: Η Παγωμένη Ακτή, σε μία σελίδα"
Cohesion: 0.25
Nodes (7): Η ιστορία, Οι δύο περιοχές, Οι εχθροί και τα αφεντικά, Οι τρεις μηχανισμοί, Πράξη V: Η Παγωμένη Ακτή, σε μία σελίδα, Τι θα δείχνει καινούργιο, Τι χρειάζεται τη δική σου απόφαση

### Community 109 - "C3: the two bosses, the cameo poses, blessings and legendaries (combat, stage C)"
Cohesion: 0.25
Nodes (7): C3: the two bosses, the cameo poses, blessings and legendaries (combat, stage C), Difficulty (the owner's note: Act IV jumped; Act V must not), How it was tested, Open problems, Progress log (stamps before 12:10 were guessed and ran ahead of the clock), Requests for the other lanes, Stubs

### Community 110 - "sapAt"
Cohesion: 0.29
Nodes (8): Enemies, hullLouse Σκαροψείρα / Hull-louse (new=True), icemaw Παγολόχος / Icemaw (new=True), iceSinger Ψάλτρια του Πάγου / Ice Singer (new=True), reefback Ξερόραχος / Reefback (new=True), rimeBear Πάγαρκτος / Rime Bear (new=False), skua Ληστόγλαρος / Skua (new=True), sapAt()

### Community 111 - "Εκτέλεση"
Cohesion: 0.25
Nodes (7): Άδειες, Δομή, Εκτέλεση, Σκότος, Τι θα ανέβαζε κι άλλο το επίπεδο, Τι υπάρχει σε αυτή την έκδοση, Χειρισμός

### Community 112 - "B1a: plumbing and generation (world, stage B)"
Cohesion: 0.29
Nodes (6): B1a: plumbing and generation (world, stage B), Changes in files I do not own, How I tested it, Open problems, Stubbed or left for stage C (or B1b), What I built

### Community 113 - "S1 (story lane): the story and its text"
Cohesion: 0.29
Nodes (6): Close, How it was tested (private no-HMR server :5381; one headless browser at a time), Requests for the combat lane (story listens/emits; stubs where noted), S1 (story lane): the story and its text, Stubs / open problems, What was built

### Community 114 - "Pool"
Cohesion: 0.33
Nodes (3): initFX(), leafTexture(), Pool

### Community 115 - "B2a: sea.js (the water, the ice, the aurora, the beams) — report"
Cohesion: 0.33
Nodes (5): B2a: sea.js (the water, the ice, the aurora, the beams) — report, Changes in files I do not own, How I tested it, Open problems, Requests to other owners

### Community 116 - "remembered"
Cohesion: 0.47
Nodes (5): dropRemember(), remembered(), selnaFalter(), it, npc5()

### Community 117 - "addTele"
Cohesion: 0.60
Nodes (5): addTele(), teleCircle0(), teleCone0(), teleLine0(), teleMat()

### Community 118 - "updateFX"
Cohesion: 0.40
Nodes (5): ambient(), emit(), emitAt(), tickPrints(), updateFX()

### Community 119 - "Stage C fixer: the three reviewers' 12 findings"
Cohesion: 0.50
Nodes (3): Findings, Re-runs on the fixed tree (private no-HMR :5461, one browser at a time; c/fix/sc, c/fix/queue.log), Stage C fixer: the three reviewers' 12 findings

### Community 120 - "The code graph (graphify)"
Cohesion: 0.50
Nodes (3): Keep it fresh, The code graph (graphify), Use

### Community 121 - "lerp"
Cohesion: 0.50
Nodes (4): lerp(), bolt0(), sstep(), underWater()

## Knowledge Gaps
- **3 isolated node(s):** `../assets/dungeon.glb?url`, `../assets/grave.glb?url`, `../assets/town.glb?url`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1043 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `Model Kits Loading` to `Monster AI & Bonds`, `Actors & Spawning`, `skills.js`, `Prop Mesh Builders`, `Rime Asset Packing`, `Act Level Builders`, `fx.js`, `Creature Model Parts`, `Act Actor Spawning`, `Input & Boot`, `ice.js`, `Cold Hazard System`, `Package Dependencies`, `Viewer Tools`, `story.js`, `Cinder Asset Packing`, `Combat & Damage`, `Sea & Sky Rendering`, `Node Build Utilities`, `projectiles.js`, `Wood Asset Packing`, `Environment Loading`, `Zone Asset Loading`, `People Animations`, `Animation Packing`, `anim.js`, `sap.js`, `pickups.js`, `coopui.js`, `gfx.js`, `textures.js`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **What connects `../assets/dungeon.glb?url`, `../assets/grave.glb?url`, `../assets/town.glb?url` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Monster AI & Bonds` be split into smaller, more focused modules?**
  _Cohesion score 0.03576437587657784 - nodes in this community are weakly interconnected._
- **Why does `clamp()` connect `Math & Noise Utilities` to `Monster AI & Bonds`, `Actors & Spawning`, `skills.js`, `Prop Mesh Builders`, `spawnMonster`, `Act Level Builders`, `fx.js`, `Act Actor Spawning`, `Input & Boot`, `P`, `ice.js`, `Cold Hazard System`, `Viewer Tools`, `story.js`, `Combat Behaviors`, `Combat & Damage`, `Sea & Sky Rendering`, `Act 5 Level Generation`, `coop.js`, `killTele`, `Level Generation`, `Zone Asset Loading`, `Game Data Definitions`, `People Animations`, `Act 4 Level Generation`, `anim.js`, `pickups.js`, `Act 4 Props`, `glowBurst`, `farlight`, `Creature Animation`, `Person Animation`, `cold.js`, `gfx.js`, `rr`, `updateFX`, `lerp`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `Actors & Spawning` be split into smaller, more focused modules?**
  _Cohesion score 0.04968047825190682 - nodes in this community are weakly interconnected._
- **Why does `emit()` connect `Act Transitions & Cutscenes` to `Monster AI & Bonds`, `Actors & Spawning`, `skills.js`, `spawnMonster`, `Input & Boot`, `P`, `Inventory & Trading`, `ice.js`, `Cold Hazard System`, `story.js`, `Combat Behaviors`, `Combat & Damage`, `tally`, `addLight`, `coop.js`, `killTele`, `sap.js`, `pickups.js`, `glowBurst`, `Save & Screens`, `forge.js`, `createZone`, `coopui.js`, `cold.js`, `lastFire`, `remembered`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `skills.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14035087719298245 - nodes in this community are weakly interconnected._