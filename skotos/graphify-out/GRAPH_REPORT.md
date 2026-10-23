# Graph Report - skotos  (2026-10-23)

## Corpus Check
- 154 files · ~813,823 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 2, .jsonl 2, .patch 1)

## Summary
- 3480 nodes · 11457 edges · 133 communities (123 shown, 10 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 1133 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0a33f03f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ai.js
- Actors & Spawning
- skillsx.js
- Prop Mesh Builders
- Rime Asset Packing
- towerPre
- build.js
- Visual Effects & Decals
- models.js
- Act Actor Spawning
- boot.js
- angleTo
- check-act4.mjs
- Inventory & Trading
- Ice Floes
- Cold Hazard System
- Music & Audio Data
- Package Dependencies
- Viewer Tools
- remembered
- Cinder Asset Packing
- Combat Behaviors
- Act Transitions & Cutscenes
- lightAt
- Sea & Sky Rendering
- Node Build Utilities
- Encounter Spawning
- Cutscene Triggers & Dialogue
- Act 5 Level Generation
- Tide System
- Wood Asset Packing
- transport.js
- tally
- Environment Loading
- clamp
- Engine work Act V needs
- Asset Download Scripts
- combat.js
- People Animations
- splash
- Act 5 NPCs
- Animation Packing
- Bot Player AI
- Animation System
- GridMap
- Procedural Sound Synthesis
- textures.js
- progpanel.js
- t
- Character Packing
- Props
- Soak Testing
- relEvent
- Animation Baking
- genMelody
- Save & Screens
- forge.js
- 5. Writing style
- unmaking
- Audio Playback & Voices
- Balance Testing
- Parity Testing
- Music Sequencing
- Scenario Testing
- Playwright Scripts
- Act IV: The Ashen Forge
- Creature Animation
- Person Animation
- coop.js
- Impact Animation
- Stage Act Script
- projectiles.js
- coopui.js
- Look Polish
- Skotos: the difficulty curve as formulas, Acts I to IV
- farlight
- check-act3.mjs
- coop.mjs
- 1. Touchpoint checklist: everything an act wires
- now
- cold.js
- Skotos, Act IV: the mechanics audit
- S2 (story lane): HUD, panels, overlay, audio, difficulty texts
- The causes, ranked
- Act V assets as built: the stage A verification
- Integrate (stage C, integrator)
- Creatures and people
- Skotos Act IV: the fix plan (single plan)
- What I built
- Act V look, fixer round 1 (progress notes first; the per-issue lines, metrics, perf, requests and shots at the end)
- hostTick
- guestEvent
- Shared names
- Skotos, Act IV difficulty fix: release notes
- Skotos: simulated play, difficulty by zone and boss
- Verify, round 2: FAIL (Karthax, Ivar and all 12 scenario runs pass; 11 of 78 targets missed, all in the Forge's packs and one Field cell; the Warden class is not a step up on bosses)
- Gate G3 (stage B, Foundation): results and fixes
- sapAt
- nv
- Act IV fix: changes (base 7eded86, worktree pub/skotos; line numbers are the new file's)
- Σκότος
- rig.js
- sendSnap
- Shared names
- The Tide (Η Παλίρροια): the coast, and the Walking Tower's arena
- Πράξη V: Η Παγωμένη Ακτή, σε μία σελίδα
- B1a: plumbing and generation (world, stage B)
- C3: the two bosses, the cameo poses, blessings and legendaries (combat, stage C)
- Skotos Act V: code contract
- Act V: The Frozen Coast
- The scaling table (data.js `COOP`)
- C2: the enemies (combat, stage C)
- curl
- S1 (story lane): the story and its text
- Skotos: handoff notes
- NodeAnim
- iron
- B1b: runtime grids, the tide and the ice (world, stage B)
- B2a: sea.js (the water, the ice, the aurora, the beams) — report
- B2b: props, atmospheres, FX and the perf gate (sea, stage B) — report
- Progression: the artifact files changed against version 12
- Progression work: progress notes (for a restart)
- Progression review: fixes (worktree prog/skotos, branch claude/skotos-progression, uncommitted)
- Stage C fixer: the three reviewers' 12 findings
- The code graph (graphify)
- Porting the progression onto the Act V line: progress
- map.js
- Act V look, fixer round 2 (progress notes first; per-issue lines, perf and shots at the end)
- Act V look, fixer round 3 (progress notes first; per-issue lines, perf and shots at the end)
- coop/progress.md
- coop/questions.md
- progression/questions.md

## God Nodes (most connected - your core abstractions)
1. `emit()` - 202 edges
2. `clamp()` - 139 edges
3. `P()` - 117 edges
4. `later()` - 111 edges
5. `tally()` - 96 edges
6. `angleTo()` - 90 edges
7. `t()` - 89 edges
8. `glowBurst()` - 73 edges
9. `puff()` - 61 edges
10. `shake()` - 58 edges

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

## Communities (133 total, 10 thin omitted)

### Community 0 - "ai.js"
Cohesion: 0.03
Nodes (91): What is built, AI, AI_LOG, AMARANTHE, ATK, ATK_SFX, beamTick(), BOND_RANK (+83 more)

### Community 1 - "Actors & Spawning"
Cohesion: 0.04
Nodes (95): A3. The waylamp checkpoint is lost on Continue, and waypoint 2 is never a respawn (and the Forge has none), 7. BUG: the waylamp checkpoint is lost on Continue, and waypoint 2 is never a respawn, 1.11 World-state flags, 1.6 Combat data (`game/data.js`), Others, Actor, createPlayer(), monsterLevel() (+87 more)

### Community 2 - "skillsx.js"
Cohesion: 0.06
Nodes (95): Combat (owned by combat), E. The Field of Ash shields (1-24% of the excess; the Ranger), 5. The Ash-Fallen shield blocks every class's basic attack (design rule, phone-hostile), 3.11 Cold damage and warmth (1-1.5 d), src/game/combat.js, The Sea-Lights and the Cold (Οι Φάροι και το Ψύχος): both zones and both fights, The protocol, Porting onto the Act V branch (`claude/sleepy-tesla-4030vd`) (+87 more)

### Community 3 - "Prop Mesh Builders"
Cohesion: 0.04
Nodes (97): `src/world/build5.js` (mine, ~900 lines), Findings, Left as is (noted, not in the findings), Re-runs (after all the fixes), Stage B fixer: the two reviewers' 9 findings, Assets, Creatures (group `act5`, tools/creatures/act5/*.mjs, `ACT_FILES.act5`), Ground layers (pack `rime`, d 1024 / n 512) (+89 more)

### Community 4 - "Rime Asset Packing"
Cohesion: 0.08
Nodes (63): aoTex(), applyLook(), atlas(), bakeAO(), bakeWorld(), boundsOf(), boxBlur(), cleanMarks() (+55 more)

### Community 5 - "towerPre"
Cohesion: 0.09
Nodes (43): Stubbed or left for later, Stubbed or left for stage C, damp(), dampAngle(), alive(), bcd(), bigs(), breachStep() (+35 more)

### Community 6 - "build.js"
Cohesion: 0.05
Nodes (99): 1.3 Build and visuals (`world/build.js`), 3.5 Aurora sky (1-1.5 d), jettyCode(), towerMesh(), act3Level(), act3Prop(), ACT4, act4Level() (+91 more)

### Community 7 - "Visual Effects & Decals"
Cohesion: 0.05
Nodes (64): chargeEnd(), crackStone(), louseOut(), openCells(), rushEnd(), skerryClose(), clingHero(), caltrops() (+56 more)

### Community 8 - "models.js"
Cohesion: 0.28
Nodes (22): body(), buildAshspawn(), buildGoblin(), buildHealer(), buildHeartroot(), buildMage(), buildRanger(), buildSkeleton() (+14 more)

### Community 9 - "Act Actor Spawning"
Cohesion: 0.06
Nodes (63): Open problems, src/game/actors.js, act4Spawn(), act5Spawn(), actSpawn(), allies(), amberCrown(), ashCrown() (+55 more)

### Community 10 - "boot.js"
Cohesion: 0.06
Nodes (59): 1.12 Saves and migration, three, aimAtMouse(), IN, initInput(), joy, pollInput(), takeEvents() (+51 more)

### Community 11 - "angleTo"
Cohesion: 0.08
Nodes (70): B. Karthax (the cliff: 44-70% of the excess), D. Ivar's Dark (9-23% of the excess; the Mage on Wanderer), angleTo(), amberLob(), ashBreath(), bigTele(), blackWave(), bodyLash() (+62 more)

### Community 12 - "check-act4.mjs"
Cohesion: 0.17
Nodes (22): Lead decisions (override the plan), Story (story), Zones and exits, 0. Ten facts that shape Act V, add(), ashfield(), bad(), cellOf() (+14 more)

### Community 13 - "Inventory & Trading"
Cohesion: 0.09
Nodes (50): addToBag(), equip(), fromStash(), gamble(), gambleCost(), reforge(), reforgeCost(), sell() (+42 more)

### Community 14 - "Ice Floes"
Cohesion: 0.08
Nodes (56): Stubbed or left for stage C, Tide and ice gameplay (ice.js, ai.js, skills.js), Done, addFloes(), airborne(), batch(), beamIce(), breakAt() (+48 more)

### Community 15 - "Cold Hazard System"
Cohesion: 0.12
Nodes (29): src/game/light.js, aim(), attachCradle(), clearLight(), cradleMesh(), discMesh(), drink(), dropBeam() (+21 more)

### Community 16 - "Music & Audio Data"
Cohesion: 0.05
Nodes (42): ANSWER, ARP6, ARP8, ASH_DAWN, ASH_PROGS, chordCache, COAST_LIT, COAST_PROGS (+34 more)

### Community 17 - "Package Dependencies"
Cohesion: 0.05
Nodes (39): dependencies, three, devDependencies, @gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions, meshoptimizer, vite (+31 more)

### Community 18 - "Viewer Tools"
Cohesion: 0.06
Nodes (64): audit(), startCreatureView(), act4At(), fakeCinder(), hashA(), layout5(), props5(), startViewer() (+56 more)

### Community 19 - "remembered"
Cohesion: 0.43
Nodes (6): dropRemember(), remembered(), selnaFalter(), it, npc5(), touch

### Community 20 - "Cinder Asset Packing"
Cohesion: 0.10
Nodes (41): alongZ(), applyLook(), bakeWorld(), bellowsPose(), BONE, boundsOf(), boxBlur(), charCol() (+33 more)

### Community 21 - "Combat Behaviors"
Cohesion: 0.14
Nodes (43): Combat (combat), 1.8 AI behaviours and traits (`game/ai.js`), 3.3 Ice that cracks under weight (2-3 d), Combat, aggroCheck(), attackTick(), boss(), chainTick() (+35 more)

### Community 22 - "Act Transitions & Cutscenes"
Cohesion: 0.10
Nodes (68): writeSave(), later(), grantBuff(), alkBeacon(), alkTalk(), ALTARS, BEACON, busy() (+60 more)

### Community 23 - "lightAt"
Cohesion: 0.21
Nodes (16): 1. What applied cleanly, 2. The conflicts (9 hunks in 5 files) and how each was resolved, 3. Six difficulties («Σκότος», index 5), 4. Act V code changed to fit the fix, 5. Things the port does to Act V without code changes (for the Act V owner to know), 6. Unsure / left for the Act V owner, 7. Runtime check (private no-HMR server, port 5287, one browser at a time, stopped after), 8. Verification pass (second agent; files in `verifyport/`) (+8 more)

### Community 24 - "Sea & Sky Rendering"
Cohesion: 0.05
Nodes (70): 3.10 Swimming, 3.1 Sea / water surface and shoreline (2-3 d), 3.4 Ice floes, 3.6 Falling snow (0-0.5 d), 3.7 Fog banks (0.5-1 d), 3.8 Ships and wrecks (1.5-2.5 d), 3.9 Under-water or under-ice spaces, 3. What a frozen coast needs that does not exist yet (+62 more)

### Community 25 - "Node Build Utilities"
Cohesion: 0.08
Nodes (26): types, fitBounds(), flatten(), loadProp(), simplifyPrim(), transformAll(), triCount(), writePack() (+18 more)

### Community 26 - "Encounter Spawning"
Cohesion: 0.11
Nodes (36): 1.9 Bosses, spawnMonster(), arena(), arenaR(), braziers(), breakCage(), brood(), cageBlow() (+28 more)

### Community 27 - "Cutscene Triggers & Dialogue"
Cohesion: 0.14
Nodes (33): cradlePoint(), act4Begins(), actComplete(), beaconScene(), brokkaArrives(), childTalk(), fireAnswers(), fireLeaves() (+25 more)

### Community 28 - "Act 5 Level Generation"
Cohesion: 0.10
Nodes (45): bfs(), coastFaults(), coastHolds(), CORNER, dress5Coast(), dress5Far(), dressCoast(), fail() (+37 more)

### Community 29 - "Tide System"
Cohesion: 0.15
Nodes (35): What I built, BAY, cellsOf(), closeLane(), deepAt(), dryNear(), evict(), floodWave() (+27 more)

### Community 30 - "Wood Asset Packing"
Cohesion: 0.11
Nodes (32): io, packLayer(), autumn(), bake(), boxBlur(), cutGround(), deckOf(), dot() (+24 more)

### Community 31 - "transport.js"
Cohesion: 0.06
Nodes (43): Byte budget (measured), How it plays, Inviting a friend on claude.ai, Quest credit (the decision), Skotos co-op, Tests, The shipped scenarios, The transports (+35 more)

### Community 32 - "tally"
Cohesion: 0.13
Nodes (27): 6.4 The creature contract (`tools/creatures/README.md`, `gfx/creatures.js`), lieDown(), restoreRim(), breachUp(), cagesBroken(), daze(), echoCairns(), emerge() (+19 more)

### Community 33 - "Environment Loading"
Cohesion: 0.08
Nodes (36): ../assets/dungeon.glb?url, ../assets/grave.glb?url, ../assets/town.glb?url, bytes(), claim(), envMesh(), GLOW, LAMB (+28 more)

### Community 34 - "clamp"
Cohesion: 0.09
Nodes (72): 1.1 Zones and exits, 1.2 Level generation, 3.12 Walking on non-zero ground (0.5-1 d, only if the design wants real slopes on ice shelves), The level object L (gen5.js), Risks, Synthesis: base, grafts and fixes, angleDiff(), clamp() (+64 more)

### Community 35 - "Engine work Act V needs"
Cohesion: 0.07
Nodes (54): 6.2 How quests move (story.js), 1.4 Atmosphere and FX ambients, 1.5 Packs, people sets and creature groups: how they load and unload, 3.13 Act-agnostic plumbing for a fifth act (1.5-2 d), Shared names, Story, The owner's decisions (9 October 2026), Zones and exits (+46 more)

### Community 36 - "Asset Download Scripts"
Cohesion: 0.12
Nodes (26): ALLFB, download(), DRY, failed, fetchAmbientCG(), fetchPolyHaven(), fetchSketchfab(), FORCE (+18 more)

### Community 37 - "combat.js"
Cohesion: 0.06
Nodes (44): COOP_K(), DIE_SFX, FLESH_DIE, gainMastery(), gainXP(), heroCrit(), HIT_SFX, levelFx() (+36 more)

### Community 38 - "People Animations"
Cohesion: 0.09
Nodes (25): ../assets/moves.bin?url, ../assets/people.glb?url, ACT_COPY, CLIPS, HOLD, _inv, LOOP, mergeGroup() (+17 more)

### Community 39 - "splash"
Cohesion: 0.08
Nodes (57): src/game/ai.js (the Act V block after sunkTick, "Act V: the Skotos's creatures and the coast's beasts"), The Cracking Ice (Ο Πάγος που Ραγίζει): the coast's shelves and Skerry Bay, every thin field on the Farthest Light, near(), rebuildHash(), boilOut(), bowlStep(), breach(), breachCell() (+49 more)

### Community 40 - "Act 5 NPCs"
Cohesion: 0.19
Nodes (8): 1.7 Actors (`game/actors.js`), act5Npc(), frozenLook(), ghostly(), keeper(), memoryLook(), getClip(), HumanoidAnim

### Community 41 - "Animation Packing"
Cohesion: 0.09
Nodes (23): BODY, chunks, emit(), findAnim(), handPose(), HANDS, head, header (+15 more)

### Community 42 - "Bot Player AI"
Cohesion: 0.19
Nodes (22): installBot(), attackable(), bfs(), chooseSkill(), count(), danger(), escape(), gear() (+14 more)

### Community 43 - "Animation System"
Cohesion: 0.07
Nodes (20): TAU, itemMesh(), mat(), ACTIONS, b64i16(), CLIPS, GRIP_STAFF_TILT, HOLD (+12 more)

### Community 45 - "Procedural Sound Synthesis"
Cohesion: 0.20
Nodes (17): ad(), bird(), creak(), exhale(), formant(), gull(), inhale(), kRate() (+9 more)

### Community 46 - "textures.js"
Cohesion: 0.14
Nodes (19): lerp(), smooth(), frostVignette(), sstep(), underWater(), cache, canvas(), finish() (+11 more)

### Community 47 - "progpanel.js"
Cohesion: 0.10
Nodes (47): Balance before and after, Code, Mastery tracks, Numbers, Points and Mastery levels, Progression: Mastery, skill variants, later skills and the loadout, Saves, The later skills and variants at the dummies (+39 more)

### Community 48 - "t"
Cohesion: 0.12
Nodes (31): bindButton(), fmt(), vulnOf(), mxpToNext(), xpToNext(), slotSkill(), skillUnlocked(), npcName() (+23 more)

### Community 49 - "Character Packing"
Cohesion: 0.12
Nodes (14): argv, BASE, compose(), HEAD_JOINTS, headOnly(), hexRGB(), io, names (+6 more)

### Community 50 - "Props"
Cohesion: 0.05
Nodes (42): Act V asset scouting: The Frozen Coast, Anchors, Before any download, Black sand and shingle, Boss: big creature, Boss: humanoid-ish, Bosses, Chains (+34 more)

### Community 51 - "Soak Testing"
Cohesion: 0.14
Nodes (13): browser, { chromium }, FATAL, FLAGS, iceSoak(), perf(), report, require (+5 more)

### Community 52 - "relEvent"
Cohesion: 0.18
Nodes (17): add(), beamTexture(), dropGlobe(), dropGold(), dropItem(), launch(), cleanItem(), downedTick() (+9 more)

### Community 53 - "Animation Baking"
Cohesion: 0.15
Nodes (13): KEEP, [knightPath, skelPath], load(), MAP, out, poseAt(), qmul(), qnorm() (+5 more)

### Community 54 - "genMelody"
Cohesion: 0.17
Nodes (11): chance(), distCurve(), forgetting(), genMelody(), limiterCurve(), makeGraph(), g, makeIR() (+3 more)

### Community 55 - "Save & Screens"
Cohesion: 0.16
Nodes (17): freshStatus(), deleteHero(), G, newHero(), uid(), vibrate(), clearLights(), ICON (+9 more)

### Community 56 - "forge.js"
Cohesion: 0.10
Nodes (33): C. The Forge's Breath (11-31% of the excess, nearly all of the Forge's own), 3. BUG: slag drips fall wherever lava is near, including Karthax's platform, 2. Reusable systems, and how a frozen coast can use them, act4Death(), monsterDmg(), BREATH, burn(), di() (+25 more)

### Community 57 - "5. Writing style"
Cohesion: 0.05
Nodes (42): 0. The ten things that matter most, 1.1 The intro (intro.1-5), the only "official history", 1.2 The Breaking (a thousand years ago, on the Field of Ash), 1.3 The peoples, 1.4 The shards, their keepers and their wishes (all now unmade), 1.5 The beacons (φρυκτωρίες), 1.6 The Wayfarers (the rules the act set), 1.7 Timeline (+34 more)

### Community 58 - "unmaking"
Cohesion: 0.15
Nodes (22): 1.10 Story: quests and cinematics (`game/story.js`), spawnNpc(), dropShard(), autumnFalls(), ivarFalls(), ladyFalls(), lastLamp(), npcHasNews() (+14 more)

### Community 59 - "Audio Playback & Voices"
Cohesion: 0.24
Nodes (8): allow(), applyVolumes(), clamp(), makeNoise(), num(), playSfx(), playSting(), Voice

### Community 60 - "Balance Testing"
Cohesion: 0.13
Nodes (14): ACT, args, BOSS_ZONE, BOSSES, cfg, { chromium }, done, groups (+6 more)

### Community 61 - "Parity Testing"
Cohesion: 0.17
Nodes (7): add(), fails, fetch(), FOOT, keys, ROOT, tmp

### Community 62 - "Music Sequencing"
Cohesion: 0.29
Nodes (6): applyInt(), applyMood(), killTheme(), reap(), startTimer(), tick()

### Community 63 - "Scenario Testing"
Cohesion: 0.11
Nodes (13): fatalFail(), watchBrowser(), watchFatal(), A4, A5, BOT5(), under(), browser (+5 more)

### Community 64 - "Playwright Scripts"
Cohesion: 0.20
Nodes (7): { chromium }, logs, require, steps, { chromium }, logs, require

### Community 65 - "Act IV: The Ashen Forge"
Cohesion: 0.06
Nodes (35): Act IV: The Ashen Forge, ashFallen Πεσμένος της Τέφρας (και Τοξότης της Τέφρας) / Ash-Fallen (and Ash-Fallen Bowman) (new=False), ashfield (22) Το Πεδίο της Τέφρας / The Field of Ash, ashsmith Τεφρομάστορας / Ashsmith (new=True), ashwing Τεφρόφτερος / Ashwing (new=True), Asset audit, beats, Blessings (+27 more)

### Community 68 - "coop.js"
Cohesion: 0.07
Nodes (30): LOOKS, VIS, VIS_FOLLOW, ACT_DT, coopK(), FXI, FXN, fxPos() (+22 more)

### Community 69 - "Impact Animation"
Cohesion: 0.31
Nodes (8): all, [path, ...names], pose(), qmul(), root, slerp(), visit(), vrot()

### Community 70 - "Stage Act Script"
Cohesion: 0.25
Nodes (7): all, DONE, FIND, LANES, LENS, meta, TODO

### Community 71 - "projectiles.js"
Cohesion: 0.11
Nodes (30): Map and runtime grids, Audio, clearRemains(), dropRemains(), updateRemains(), tickIce(), clearProjs(), fire0() (+22 more)

### Community 72 - "coopui.js"
Cohesion: 0.16
Nodes (26): hostGame(), initNet(), lobbyHosts(), lobbyPresence(), nameOf(), newCode(), party(), resolveNames() (+18 more)

### Community 73 - "Look Polish"
Cohesion: 0.50
Nodes (3): ISSUES, meta, rounds

### Community 75 - "Skotos: the difficulty curve as formulas, Acts I to IV"
Cohesion: 0.09
Nodes (22): 1. Experience and the hero's level, 2. How a monster's level is chosen, 3. The hero's power, 4. Monster power, 5.1 Each zone, each class, Warden and Wanderer, 5.2 Content only: the same hero against every zone, 5.3 Each boss, each class, Warden and Wanderer, 5.4 Act over act (each zone or boss over the one before it) (+14 more)

### Community 76 - "farlight"
Cohesion: 0.16
Nodes (20): `src/gfx/fx.js` (mine): ambients `coast`, `coastFrozen` (diamond dust, no sea smoke), `farlight`, `blizzard`;, `src/world/atmos.js` (mine): `coast`, `coastCine`, `coastFrozen`, `coastAurora`, `farlight`, `farlightFight`,, `tools/scenario.mjs` (mine: the two appended scenarios), What I built, Lead decisions, How the hero gets there from Whitecliff, add(), bad() (+12 more)

### Community 77 - "check-act3.mjs"
Cohesion: 0.16
Nodes (20): Story (owned by story), Zones, Εκτέλεση, add(), bad(), cellOf(), fails, flood() (+12 more)

### Community 78 - "coop.mjs"
Cohesion: 0.13
Nodes (19): { chromium }, conn(), ev(), FATAL, hostPos(), ok(), on(), onConnection() (+11 more)

### Community 79 - "1. Touchpoint checklist: everything an act wires"
Cohesion: 0.10
Nodes (19): 1.13 HUD and UI, 1.14 Audio (`audio/audio.js`, all procedural WebAudio, no files), 1.15 Echoes (boss refights), 1.16 Credits, 1.17 Text (`src/i18n/text.js`, Greek first), 1.18 Debug views, 1.19 Scenarios and layout checks, 1.20 Artifact build and publish (+11 more)

### Community 80 - "now"
Cohesion: 0.20
Nodes (20): chunk(), dropRemote(), flushPulls(), guestEnter(), guestTick(), hostPresence(), interp(), killPuppet() (+12 more)

### Community 81 - "cold.js"
Cohesion: 0.29
Nodes (16): src/game/cold.js (new, ~150 lines), coldAdd(), coldMul(), coldNoRegen(), coldZone(), frostbite(), haz(), lee() (+8 more)

### Community 82 - "Skotos, Act IV: the mechanics audit"
Cohesion: 0.13
Nodes (13): 10. Fire arrows burn where they hit her (side effect), 11. Ashsmiths and the Hall of Moulds (design hot-spot), 12. Phone readability and control (qualitative), 1. Karthax: what each phase does (design numbers), 2. The Forge's Breath, where it bites (design rule), 4. BUG: affixes fire from a tick on her back and from an Ashwing in the sky, 6. Ivar's Dark: the light is smaller than the distance he keeps (design numbers), 8. Dash hits reach past their telegraphs (readability bug, shared code) (+5 more)

### Community 83 - "S2 (story lane): HUD, panels, overlay, audio, difficulty texts"
Cohesion: 0.12
Nodes (15): audio.js, Close, How it was tested, hud.js, Open problems, overlay.js / style.css, panels.js, Progress notes (as it went) (+7 more)

### Community 84 - "The causes, ranked"
Cohesion: 0.13
Nodes (14): 1. Karthax: the fight's numbers and structure (design/tuning). 44-70% of the excess, 2. The Forge's Breath (tuning/design). 11-31% of the excess, and nearly all of the Forge's, 3. Ivar (design). 9-23% of the excess, a local bump rather than the cliff, 4. The Field of Ash (design/readability). 1-24% of the excess, mostly in walked runs, 5. The level drift (levelling). A slope present in every act, small here, 6. Act III is the trough (design of the curve). Inflates the IV/III ratio by about ×1.8, 7. The bugs (bug). Under 5% of the measured damage, but bad for feel and retries, 8. Phone readability (readability). Not measured, adds on top of #1 and #2 (+6 more)

### Community 85 - "Act V assets as built: the stage A verification"
Cohesion: 0.14
Nodes (13): Act V assets as built: the stage A verification, Changes in this pass, Checks by asset, Creatures (`?cview`, numbers from the new `&audit` mode), How to repeat, Measured files, Outcome, People (`?viewer`, and the creature viewer's new `&folk=` in the artifact) (+5 more)

### Community 86 - "Integrate (stage C, integrator)"
Cohesion: 0.14
Nodes (13): Bugs found and fixed at their root (this run), Difficulty: Act V on the fixed curve, Fourth run (02:36, after a restart; the lead committed everything as b57ca18), Integrate (stage C, integrator), Joins to do (from the reports), Open, for others, Progress notes (as it goes; a restart resumes from here), Second run (21:32, after the lead's commits ef5d02b (my joins and scenarios) and c388c3c (the Act IV fix ported)) (+5 more)

### Community 87 - "Creatures and people"
Cohesion: 0.15
Nodes (13): Creatures and people, The rime pack (`rime`), lantern(), bandParts(), barnacleParts(), braidParts(), capParts(), collarFurParts() (+5 more)

### Community 88 - "Skotos Act IV: the fix plan (single plan)"
Cohesion: 0.18
Nodes (10): A1. Slag drips fall on Karthax's platform, statues, ghost pools and in the Hall of Moulds, A2. Elite affixes fire from a clinging Ember Tick or an airborne Ashwing, A4. Dash hits reach wider than their drawn telegraphs, A. Bugs (all from the diagnosis), F. Not changed, on purpose, G. Expected numbers afterwards, H. Verification (fast), I. Risks (+2 more)

### Community 89 - "What I built"
Cohesion: 0.18
Nodes (10): C1: mechanics and creature plumbing (combat, stage C), How I tested it (c/probe.mjs '<query>' steps.json outPrefix; q0 for function, q1 for looks; story flags in the query), Progress notes, Requests for the story lane (I did not touch these files), src/game/data.js (beyond DIFFS/HAZ5), src/game/sap.js, Stubbed or left for C2/C3 (my plumbing is ready for them), What I built (+2 more)

### Community 90 - "Act V look, fixer round 1 (progress notes first; the per-issue lines, metrics, perf, requests and shots at the end)"
Cohesion: 0.18
Nodes (10): Act V look, fixer round 1 (progress notes first; the per-issue lines, metrics, perf, requests and shots at the end), detail = mean |image - 6 px box blur| over the middle 50%; before = crit1/, after = r1/after/, same views and seeds), load 8.3: another workflow's browser ran beside it; the verdict is the median of per-cycle ratios to the Field), METRICS (r1/tools/metrics.py: near-black = max channel < 16/255 over the frame; centre = mean RGB of the middle 50%;, Not fixed and why (besides the requests), Per issue, one line each (B = the critic's crit1/<dir>/<name>, A = r1/after/<dir>/<name>, both under scratchpad/act5/look/), PERF (perf5, tools/scenario.mjs, phone 915x412 at 1.5, SwiftShader, 5 cycles; r1/perfH/perf5.txt, 04:49-04:58 Oct 17,, Progress notes (+2 more)

### Community 91 - "hostTick"
Cohesion: 0.22
Nodes (11): The game's hooks (for whoever changes these files), heroAvatar(), refreshHeroLook(), iceDigest(), addRemote(), hostTick(), lookHero(), remotesTick() (+3 more)

### Community 92 - "guestEvent"
Cohesion: 0.22
Nodes (11): blowCap(), foeNear(), guestEvent(), nums(), over(), reject(), relTo(), replayFx() (+3 more)

### Community 93 - "Shared names"
Cohesion: 0.20
Nodes (9): Built assets (details in `scratchpad/act3-assets.json`; a parallel workflow is polishing them, but names and clips stay), File ownership (edit only your own files), Lead decisions (override the plan), Map (`src/world/map.js`, owned by world), Shared names, Skotos Act III: code contract, The level object L from gen3.js, Visuals (`src/world/build.js`, owned by world) (+1 more)

### Community 94 - "Skotos, Act IV difficulty fix: release notes"
Cohesion: 0.20
Nodes (9): Files (balance/), How this release was checked, In one paragraph, Left as it is, on purpose, Publishing, Skotos, Act IV difficulty fix: release notes, The numbers, before and after, What changed, file by file (+1 more)

### Community 95 - "Skotos: simulated play, difficulty by zone and boss"
Cohesion: 0.20
Nodes (9): Act IV under-levelled, pack by pack, and the bosses (hero at zone level − 3, item level 3 below that), Act IV under-levelled, zones walked (hero at zone level − 3, item level 3 below that), Act over act, Mage, Ranger, Skotos: simulated play, difficulty by zone and boss, Step by step (each zone over the one before, each boss over the one before), Warden (+1 more)

### Community 96 - "Verify, round 2: FAIL (Karthax, Ivar and all 12 scenario runs pass; 11 of 78 targets missed, all in the Forge's packs and one Field cell; the Warden class is not a step up on bosses)"
Cohesion: 0.20
Nodes (9): Bosses (lives a fight; before = sim.json -> after; W = Warden difficulty, Wa = Wanderer), Files (balance/), Next (ranked), Overshoot (task step 3), Scenarios (balance/scen-v2; every run exit 0, no page errors or warnings), Verdict, Verify, round 2: FAIL (Karthax, Ivar and all 12 scenario runs pass; 11 of 78 targets missed, all in the Forge's packs and one Field cell; the Warden class is not a step up on bosses), What round 2 found and changed (+1 more)

### Community 97 - "Gate G3 (stage B, Foundation): results and fixes"
Cohesion: 0.20
Nodes (9): Artifact, Fixes (gate keeper; all in stage-B files), Gate G3 (stage B, Foundation): results and fixes, Left for later (not gate failures; for C or the review), Perf (perf5, final code, perf5b/perf5.txt), Scenarios (scen/summary.txt; one at a time, BASE :5341), Servers, The walk (shots/, phone q1 unless named d*) (+1 more)

### Community 98 - "sapAt"
Cohesion: 0.22
Nodes (9): Enemies, icemaw Παγολόχος / Icemaw (new=True), iceSinger Ψάλτρια του Πάγου / Ice Singer (new=True), reefback Ξερόραχος / Reefback (new=True), rimeBear Πάγαρκτος / Rime Bear (new=False), skua Ληστόγλαρος / Skua (new=True), sunken Θαλασσόπνικτος (και Θαλασσόπνικτος Καμακάς) / Sunken (and Sunken Harpooner) (new=True), sapAt() (+1 more)

### Community 99 - "nv"
Cohesion: 0.20
Nodes (10): bassNote(), chooseProg(), chordOf(), drumStep(), MOTIF, nv(), phrase(), pump() (+2 more)

### Community 100 - "Act IV fix: changes (base 7eded86, worktree pub/skotos; line numbers are the new file's)"
Cohesion: 0.22
Nodes (8): A. Bugs, Act IV fix: changes (base 7eded86, worktree pub/skotos; line numbers are the new file's), B. Karthax, C. The Forge's Breath, D. Ivar, E. The Field's shields, Notes, Tools

### Community 101 - "Σκότος"
Cohesion: 0.22
Nodes (8): Άδειες, Δομή, Πώς δουλεύουν οι χαρακτήρες, Σκότος, Τι θα ανέβαζε κι άλλο το επίπεδο, Τι υπάρχει σε αυτή την έκδοση, Χειρισμός, walk()

### Community 102 - "rig.js"
Cohesion: 0.22
Nodes (7): _c, _e, G, _m, _p, _q, _s

### Community 103 - "sendSnap"
Cohesion: 0.36
Nodes (9): actorEntry(), clipIdx(), guestPresence(), heroState(), joinGame(), packFx(), q(), sendSnap() (+1 more)

### Community 104 - "Shared names"
Cohesion: 0.25
Nodes (7): Expected assets (verify against `scratchpad/act4-assets.json` when it exists), File ownership (edit only your own files), Map (world), Shared names, Skotos Act IV: code contract, The level object L from gen4.js (world), Visuals (`build.js`, world)

### Community 105 - "The Tide (Η Παλίρροια): the coast, and the Walking Tower's arena"
Cohesion: 0.50
Nodes (3): 3.2 Tides that move the walkable area (3-4 d), The Tide (Η Παλίρροια): the coast, and the Walking Tower's arena, Done in the last session

### Community 106 - "Πράξη V: Η Παγωμένη Ακτή, σε μία σελίδα"
Cohesion: 0.25
Nodes (7): Η ιστορία, Οι δύο περιοχές, Οι εχθροί και τα αφεντικά, Οι τρεις μηχανισμοί, Πράξη V: Η Παγωμένη Ακτή, σε μία σελίδα, Τι θα δείχνει καινούργιο, Τι χρειάζεται τη δική σου απόφαση

### Community 107 - "B1a: plumbing and generation (world, stage B)"
Cohesion: 0.29
Nodes (7): B1a: plumbing and generation (world, stage B), Changes in files I do not own, How I tested it, Open problems, Stubbed or left for stage C (or B1b), What I built, crew()

### Community 108 - "C3: the two bosses, the cameo poses, blessings and legendaries (combat, stage C)"
Cohesion: 0.25
Nodes (7): C3: the two bosses, the cameo poses, blessings and legendaries (combat, stage C), Difficulty (the owner's note: Act IV jumped; Act V must not), How it was tested, Open problems, Progress log (stamps before 12:10 were guessed and ran ahead of the clock), Requests for the other lanes, Stubs

### Community 109 - "Skotos Act V: code contract"
Cohesion: 0.25
Nodes (7): Creatures (group `act5`), Expected assets, File ownership (edit only your own files in your stage), People (set `frost`), Skotos Act V: code contract, Stage A outcome (lead decisions, 10 October), Stages and gates

### Community 110 - "Act V: The Frozen Coast"
Cohesion: 0.25
Nodes (7): Act V: The Frozen Coast, Asset audit, Blessings, Echoes and post-game, farlight (31) Ο Έσχατος Φάρος / The Farthest Light, Judges, Zones

### Community 111 - "The scaling table (data.js `COOP`)"
Cohesion: 0.25
Nodes (8): Balance (measured), The scaling table (data.js `COOP`), crackedBell(), jit(), keeperMotif(), metal(), mf(), sineLine()

### Community 112 - "C2: the enemies (combat, stage C)"
Cohesion: 0.29
Nodes (6): C2: the enemies (combat, stage C), Differences from the design (code is the truth; written down), How I tested it, Open problems, Progress notes, Requests for the story lane (not my files)

### Community 113 - "curl"
Cohesion: 0.33
Nodes (7): src/game/combat.js, src/game/data.js, src/game/projectiles.js, src/game/skills.js, src/i18n/text.js, What I built, hullLouse Σκαροψείρα / Hull-louse (new=True), curl(), curlHit()

### Community 114 - "S1 (story lane): the story and its text"
Cohesion: 0.29
Nodes (6): Close, How it was tested (private no-HMR server :5381; one headless browser at a time), Requests for the combat lane (story listens/emits; stubs where noted), S1 (story lane): the story and its text, Stubs / open problems, What was built

### Community 115 - "Skotos: handoff notes"
Cohesion: 0.29
Nodes (6): How to work, Open items, Skotos: handoff notes, State, Where everything stopped (20 October, paused by the owner until next week), Where things are

### Community 117 - "iron"
Cohesion: 0.33
Nodes (6): 6.1 Node-only steps (Acts II-IV, no Blender), collarParts(), cuffParts(), linkGeo(), maskParts(), iron()

### Community 118 - "B1b: runtime grids, the tide and the ice (world, stage B)"
Cohesion: 0.33
Nodes (5): B1b: runtime grids, the tide and the ice (world, stage B), Calls in files I do not own (owners not running in stage B; the contract names them as B1's smallest changes), Changes in files I do not own, How I tested it (scratch paths under scratchpad/act5/b/b1b/), Open problems

### Community 119 - "B2a: sea.js (the water, the ice, the aurora, the beams) — report"
Cohesion: 0.33
Nodes (5): B2a: sea.js (the water, the ice, the aurora, the beams) — report, Changes in files I do not own, How I tested it, Open problems, Requests to other owners

### Community 120 - "B2b: props, atmospheres, FX and the perf gate (sea, stage B) — report"
Cohesion: 0.33
Nodes (5): B2b: props, atmospheres, FX and the perf gate (sea, stage B) — report, Changes in files I do not own, How I tested it, Open problems and requests, Progress notes (as written during the run)

### Community 121 - "Progression: the artifact files changed against version 12"
Cohesion: 0.33
Nodes (5): Added (upload), Checks, index.html, Progression: the artifact files changed against version 12, Removed (set to null)

### Community 122 - "Progression work: progress notes (for a restart)"
Cohesion: 0.40
Nodes (4): Design (decided), Done, Next, Progression work: progress notes (for a restart)

### Community 123 - "Progression review: fixes (worktree prog/skotos, branch claude/skotos-progression, uncommitted)"
Cohesion: 0.40
Nodes (4): Files changed (against HEAD 18e2359), Findings (one line each), Progression review: fixes (worktree prog/skotos, branch claude/skotos-progression, uncommitted), Re-runs (dev server :5297, tools/vite.nohmr.mjs; one browser at a time)

### Community 124 - "Stage C fixer: the three reviewers' 12 findings"
Cohesion: 0.50
Nodes (3): Findings, Re-runs on the fixed tree (private no-HMR :5461, one browser at a time; c/fix/sc, c/fix/queue.log), Stage C fixer: the three reviewers' 12 findings

### Community 125 - "The code graph (graphify)"
Cohesion: 0.50
Nodes (3): Keep it fresh, The code graph (graphify), Use

### Community 126 - "Porting the progression onto the Act V line: progress"
Cohesion: 0.50
Nodes (3): In progress, Next, Porting the progression onto the Act V line: progress

### Community 127 - "map.js"
Cohesion: 0.50
Nodes (3): DX, DZ, WQ

## Knowledge Gaps
- **3 isolated node(s):** `../assets/dungeon.glb?url`, `../assets/grave.glb?url`, `../assets/town.glb?url`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1067 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `boot.js` to `ai.js`, `Actors & Spawning`, `skillsx.js`, `Prop Mesh Builders`, `Rime Asset Packing`, `build.js`, `Visual Effects & Decals`, `models.js`, `Act Actor Spawning`, `Ice Floes`, `Cold Hazard System`, `Package Dependencies`, `Viewer Tools`, `Cinder Asset Packing`, `Act Transitions & Cutscenes`, `Sea & Sky Rendering`, `Node Build Utilities`, `Wood Asset Packing`, `Environment Loading`, `combat.js`, `People Animations`, `Animation Packing`, `Animation System`, `textures.js`, `forge.js`, `projectiles.js`, `coopui.js`, `rig.js`?**
  _High betweenness centrality (0.190) - this node is a cross-community bridge._
- **What connects `../assets/dungeon.glb?url`, `../assets/grave.glb?url`, `../assets/town.glb?url` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ai.js` be split into smaller, more focused modules?**
  _Cohesion score 0.030235162374020158 - nodes in this community are weakly interconnected._
- **Why does `emit()` connect `Cutscene Triggers & Dialogue` to `ai.js`, `Actors & Spawning`, `skillsx.js`, `towerPre`, `Visual Effects & Decals`, `boot.js`, `angleTo`, `Inventory & Trading`, `Ice Floes`, `Cold Hazard System`, `remembered`, `Combat Behaviors`, `Act Transitions & Cutscenes`, `Encounter Spawning`, `Tide System`, `tally`, `clamp`, `Engine work Act V needs`, `combat.js`, `splash`, `progpanel.js`, `t`, `relEvent`, `Save & Screens`, `forge.js`, `unmaking`, `coop.js`, `projectiles.js`, `coopui.js`, `now`, `cold.js`, `guestEvent`, `sendSnap`, `curl`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `Actors & Spawning` be split into smaller, more focused modules?**
  _Cohesion score 0.04460340837365874 - nodes in this community are weakly interconnected._
- **Why does `clamp()` connect `clamp` to `ai.js`, `Actors & Spawning`, `skillsx.js`, `Prop Mesh Builders`, `towerPre`, `build.js`, `Visual Effects & Decals`, `Act Actor Spawning`, `boot.js`, `angleTo`, `Inventory & Trading`, `Ice Floes`, `Cold Hazard System`, `Viewer Tools`, `Combat Behaviors`, `Act Transitions & Cutscenes`, `Sea & Sky Rendering`, `Act 5 Level Generation`, `Tide System`, `Engine work Act V needs`, `combat.js`, `People Animations`, `splash`, `Animation System`, `textures.js`, `relEvent`, `forge.js`, `unmaking`, `Creature Animation`, `coop.js`, `now`, `cold.js`, `hostTick`, `guestEvent`, `sendSnap`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `skillsx.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0596039603960396 - nodes in this community are weakly interconnected._