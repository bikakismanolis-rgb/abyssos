# Graph Report - skotos  (2026-10-24)

## Corpus Check
- 161 files · ~903,589 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: .jsonl 3, (none) 2, .patch 1)

## Summary
- 3599 nodes · 11862 edges · 147 communities (136 shown, 11 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 1209 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `51721c87`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ai.js
- Actors & Spawning
- skillsx.js
- Prop Mesh Builders
- Rime Asset Packing
- killTele
- build.js
- Visual Effects & Decals
- models.js
- Act Actor Spawning
- boot.js
- angleTo
- check-act4.mjs
- Inventory & Trading
- ice.js
- Cold Hazard System
- Music & Audio Data
- Package Dependencies
- Viewer Tools
- unmaking
- Cinder Asset Packing
- Combat Behaviors
- Act Transitions & Cutscenes
- combat.js
- Sea & Sky Rendering
- Node Build Utilities
- Encounter Spawning
- Cutscene Triggers & Dialogue
- gen5.js
- .add
- Wood Asset Packing
- coop.js
- now
- Environment Loading
- spawnMonster
- creatures.js
- Asset Download Scripts
- data.js
- People Animations
- tide.js
- Act 5 NPCs
- Animation Packing
- Bot Player AI
- Animation System
- GridMap
- Procedural Sound Synthesis
- clamp
- projectiles.js
- t
- Character Packing
- RNG
- Soak Testing
- hostTick
- Animation Baking
- genMelody
- act4Enter
- forge.js
- coast
- Props
- Audio Playback & Voices
- Balance Testing
- Parity Testing
- Music Sequencing
- Scenario Testing
- Playwright Scripts
- three
- Creature Animation
- Person Animation
- occlude
- Impact Animation
- Stage Act Script
- 5. Writing style
- guestEnter
- Look Polish
- Act IV: The Ashen Forge
- Engine work Act V needs
- ring
- Skotos: the difficulty curve as formulas, Acts I to IV
- coopui.js
- coop.mjs
- player.js
- check-act3.mjs
- Porting the Act IV difficulty fix onto Act V (branch claude/sleepy-tesla-4030vd)
- Skotos Act V: code contract
- Skotos, Act IV: the mechanics audit
- textures.js
- S2 (story lane): HUD, panels, overlay, audio, difficulty texts
- The causes, ranked
- tex
- Act V assets as built: the stage A verification
- Integrate (stage C, integrator)
- Shared names
- rr
- decal0
- 3. What a frozen coast needs that does not exist yet
- Act V look, fixer round 1 (progress notes first; the per-issue lines, metrics, perf, requests and shots at the end)
- Skotos, Act IV difficulty fix: release notes
- Skotos: simulated play, difficulty by zone and boss
- Verify, round 2: FAIL (Karthax, Ivar and all 12 scenario runs pass; 11 of 78 targets missed, all in the Forge's packs and one Field cell; the Warden class is not a step up on bosses)
- 1. Touchpoint checklist: everything an act wires
- C2: the enemies (combat, stage C)
- Gate G3 (stage B, Foundation): results and fixes
- Act IV fix: changes (base 7eded86, worktree pub/skotos; line numbers are the new file's)
- emit
- What I built
- Act V release fixes (the last problems before Act V goes live)
- Shared names
- Πράξη V: Η Παγωμένη Ακτή, σε μία σελίδα
- C3: the two bosses, the cameo poses, blessings and legendaries (combat, stage C)
- Act V: The Frozen Coast
- Σκότος
- B1a: plumbing and generation (world, stage B)
- S1 (story lane): the story and its text
- clearFX
- B2a: sea.js (the water, the ice, the aurora, the beams) — report
- Co-op review fixes (progress notes)
- addTele
- Skotos Act IV: the fix plan (single plan)
- Stage C fixer: the three reviewers' 12 findings
- The code graph (graphify)
- lightAt
- Act V look, fixer round 2 (progress notes first; per-issue lines, perf and shots at the end)
- Act V look, fixer round 3 (progress notes first; per-issue lines, perf and shots at the end)
- glow
- f
- coop/progress.md
- coop/questions.md
- nv
- sendSnap
- .play
- The scaling table (data.js `COOP`)
- refreezeAt
- Progression: Mastery, skill variants, later skills and the loadout
- Skotos: handoff notes
- Progression: the artifact files changed against version 12
- 5. The tables
- 6.1 Node-only steps (Acts II-IV, no Blender)
- Progression work: progress notes (for a restart)
- Progression review: fixes (worktree prog/skotos, branch claude/skotos-progression, uncommitted)
- 3. The hero's power
- 4. Monster power
- 3.11 Cold damage and warmth (1-1.5 d)
- map.js
- mkplan.mjs
- progression/questions.md

## God Nodes (most connected - your core abstractions)
1. `emit()` - 211 edges
2. `clamp()` - 147 edges
3. `P()` - 117 edges
4. `later()` - 112 edges
5. `tally()` - 96 edges
6. `t()` - 93 edges
7. `angleTo()` - 90 edges
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

## Communities (147 total, 11 thin omitted)

### Community 0 - "ai.js"
Cohesion: 0.03
Nodes (82): lieDown(), rebuildHash(), restoreRim(), AI, AI_LOG, AMARANTHE, ATK, ATK_SFX (+74 more)

### Community 1 - "Actors & Spawning"
Cohesion: 0.04
Nodes (103): 1.1 Zones and exits, 1.4 Atmosphere and FX ambients, 1.5 Packs, people sets and creature groups: how they load and unload, 3.13 Act-agnostic plumbing for a fifth act (1.5-2 d), Others, Shared names, Zones and exits, World-state: the Fourth Fire Goes Out, the Freeze, the Lights Answer, the Ice Goes Out (Η Τέταρτη Φωτιά Σβήνει, Το Πάγωμα, Τα Φώτα Απαντούν, Ο Πάγος Φεύγει) (+95 more)

### Community 2 - "skillsx.js"
Cohesion: 0.07
Nodes (81): Combat (owned by combat), E. The Field of Ash shields (1-24% of the excess; the Ranger), 5. The Ash-Fallen shield blocks every class's basic attack (design rule, phone-hostile), The protocol, Porting onto the Act V branch (`claude/sleepy-tesla-4030vd`), foes(), damage(), healHero() (+73 more)

### Community 3 - "Prop Mesh Builders"
Cohesion: 0.05
Nodes (73): `src/world/build5.js` (mine, ~900 lines), Assets, Creatures (group `act5`, tools/creatures/act5/*.mjs, `ACT_FILES.act5`), Ground layers (pack `rime`, d 1024 / n 512), People (set `frost`, folk.mjs --set=frost; Quaternius Universal Base Characters and Modular Outfits, CC0, already shipped in people.glb and moves.bin; no download), Props (pack `rime`, tools/pack-rime.mjs; ≤ 70k triangles), Totals for the act, packProp() (+65 more)

### Community 4 - "Rime Asset Packing"
Cohesion: 0.08
Nodes (64): aoTex(), applyLook(), atlas(), bakeAO(), bakeWorld(), boundsOf(), boxBlur(), cleanMarks() (+56 more)

### Community 5 - "killTele"
Cohesion: 0.06
Nodes (79): Stubbed or left for later, What is built, damp(), dampAngle(), alive(), amberLob(), bcd(), bigs() (+71 more)

### Community 6 - "build.js"
Cohesion: 0.04
Nodes (50): 1.3 Build and visuals (`world/build.js`), act3Level(), ACT4, act4Level(), ACT5, applyNight(), buildLava(), _c (+42 more)

### Community 7 - "Visual Effects & Decals"
Cohesion: 0.11
Nodes (24): AMB5, ambient(), decalGeo, emit(), flash0(), footprint(), FX, killTele0() (+16 more)

### Community 8 - "models.js"
Cohesion: 0.12
Nodes (38): Creatures and people, The rime pack (`rime`), lantern(), bandParts(), barnacleParts(), body(), braidParts(), buildAshspawn() (+30 more)

### Community 9 - "Act Actor Spawning"
Cohesion: 0.05
Nodes (68): Open problems, src/game/actors.js, act4Spawn(), act5Npc(), act5Spawn(), actSpawn(), allies(), amberCrown() (+60 more)

### Community 10 - "boot.js"
Cohesion: 0.06
Nodes (58): 1.12 Saves and migration, The game's hooks (for whoever changes these files), aimAtMouse(), IN, initInput(), joy, pollInput(), takeEvents() (+50 more)

### Community 11 - "angleTo"
Cohesion: 0.10
Nodes (42): B. Karthax (the cliff: 44-70% of the excess), D. Ivar's Dark (9-23% of the excess; the Mage on Wanderer), angleTo(), ashBreath(), blackWave(), breachTele(), briar(), clawSweep() (+34 more)

### Community 12 - "check-act4.mjs"
Cohesion: 0.17
Nodes (22): Lead decisions (override the plan), Story (story), Zones and exits, 0. Ten facts that shape Act V, add(), ashfield(), bad(), cellOf() (+14 more)

### Community 13 - "Inventory & Trading"
Cohesion: 0.08
Nodes (55): fmtK(), addToBag(), equip(), fromStash(), gamble(), gambleCost(), reforge(), reforgeCost() (+47 more)

### Community 14 - "ice.js"
Cohesion: 0.09
Nodes (47): Stubbed or left for stage C, Tide and ice gameplay (ice.js, ai.js, skills.js), addFloes(), airborne(), batch(), beamIce(), decay(), dropFloes() (+39 more)

### Community 15 - "Cold Hazard System"
Cohesion: 0.08
Nodes (37): C1: mechanics and creature plumbing (combat, stage C), How I tested it (c/probe.mjs '<query>' steps.json outPrefix; q0 for function, q1 for looks; story flags in the query), Open problems, Progress notes, Requests for the story lane (I did not touch these files), src/game/data.js (beyond DIFFS/HAZ5), src/game/light.js, src/game/sap.js (+29 more)

### Community 16 - "Music & Audio Data"
Cohesion: 0.05
Nodes (42): ANSWER, ARP6, ARP8, ASH_DAWN, ASH_PROGS, chordCache, COAST_LIT, COAST_PROGS (+34 more)

### Community 17 - "Package Dependencies"
Cohesion: 0.05
Nodes (39): dependencies, three, devDependencies, @gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions, meshoptimizer, vite (+31 more)

### Community 18 - "Viewer Tools"
Cohesion: 0.09
Nodes (45): hash2(), noise2(), audit(), startCreatureView(), act4At(), fakeCinder(), hashA(), layout5() (+37 more)

### Community 19 - "unmaking"
Cohesion: 0.10
Nodes (31): 1.10 Story: quests and cinematics (`game/story.js`), cradlePoint(), dropShard(), gone, autumnFalls(), dismiss(), ivarFalls(), karthaxFalls() (+23 more)

### Community 20 - "Cinder Asset Packing"
Cohesion: 0.10
Nodes (41): alongZ(), applyLook(), bakeWorld(), bellowsPose(), BONE, boundsOf(), boxBlur(), charCol() (+33 more)

### Community 21 - "Combat Behaviors"
Cohesion: 0.10
Nodes (51): Combat (combat), 1.8 AI behaviours and traits (`game/ai.js`), 3.3 Ice that cracks under weight (2-3 d), src/game/combat.js, tower (the bot was wrong, and the game had one bug in two places), Combat, hullLouse Σκαροψείρα / Hull-louse (new=True), aggroCheck() (+43 more)

### Community 22 - "Act Transitions & Cutscenes"
Cohesion: 0.08
Nodes (78): 6.2 How quests move (story.js), coast (28) Η Παγωμένη Ακτή / The Frozen Coast, takeRoot(), seeHero(), getBeam(), writeSave(), later(), grantBuff() (+70 more)

### Community 23 - "combat.js"
Cohesion: 0.09
Nodes (45): src/game/combat.js, actDeath(), actHit(), breakGuard(), clingHero(), COOP_K(), DIE_SFX, FLESH_DIE (+37 more)

### Community 24 - "Sea & Sky Rendering"
Cohesion: 0.06
Nodes (60): 3.1 Sea / water surface and shoreline (2-3 d), `src/world/build.js`, `src/world/sea.js` (new, ~870 lines), `src/world/build.js` (mine), `src/world/sea.js` (mine; B2a's file, changed in this run), Visuals, The look: what each image costs, ENV (+52 more)

### Community 25 - "Node Build Utilities"
Cohesion: 0.08
Nodes (26): types, fitBounds(), flatten(), loadProp(), simplifyPrim(), transformAll(), triCount(), writePack() (+18 more)

### Community 26 - "Encounter Spawning"
Cohesion: 0.07
Nodes (50): 6.4 The creature contract (`tools/creatures/README.md`, `gfx/creatures.js`), Stubbed or left for stage C, near(), breachUp(), chargeEnd(), crackStone(), darkStep(), daze() (+42 more)

### Community 27 - "Cutscene Triggers & Dialogue"
Cohesion: 0.28
Nodes (16): 1.11 World-state flags, skerryClose(), actComplete(), beaconScene(), fireAnswers(), fireLeaves(), fourthOut(), haldaCradle() (+8 more)

### Community 28 - "gen5.js"
Cohesion: 0.06
Nodes (104): 1.2 Level generation, 3.12 Walking on non-zero ground (0.5-1 d, only if the design wants real slopes on ice shelves), The level object L (gen5.js), Risks, Synthesis: base, grafts and fixes, angleDiff(), fbm(), smooth() (+96 more)

### Community 29 - ".add"
Cohesion: 0.14
Nodes (31): act3Prop(), amberMat(), anvilMesh(), bake(), Batch, bend(), cinMat(), cocoonProp() (+23 more)

### Community 30 - "Wood Asset Packing"
Cohesion: 0.11
Nodes (31): io, packLayer(), bake(), boxBlur(), cutGround(), deckOf(), dot(), dropLoose() (+23 more)

### Community 31 - "coop.js"
Cohesion: 0.06
Nodes (39): PACK_LEAD, PACKS, MAX_ILVL, LOOKS, VIS, VIS_FOLLOW, EVB, FXI (+31 more)

### Community 32 - "now"
Cohesion: 0.16
Nodes (27): besideHost(), chunk(), fxFrom(), gateOf(), heldMove(), hostPresence(), landsAt(), lit5() (+19 more)

### Community 33 - "Environment Loading"
Cohesion: 0.12
Nodes (26): bytes(), claim(), envChest(), envMesh(), GLOW, LAMB, lambert(), loadEnv() (+18 more)

### Community 34 - "spawnMonster"
Cohesion: 0.15
Nodes (25): spawnMonster(), arena(), arenaR(), braziers(), brood(), callEater(), callLampless(), callMourners() (+17 more)

### Community 35 - "creatures.js"
Cohesion: 0.11
Nodes (21): makeAvatar(), ready(), standIn(), ACT_FILES, CAST, creatureModel(), CREATURES, FILES (+13 more)

### Community 36 - "Asset Download Scripts"
Cohesion: 0.12
Nodes (26): ALLFB, download(), DRY, failed, fetchAmbientCG(), fetchPolyHaven(), fetchSketchfab(), FORCE (+18 more)

### Community 37 - "data.js"
Cohesion: 0.08
Nodes (58): Code, Saves, BASES, BOON, BOONS, BUFFS, COOP, DODGE (+50 more)

### Community 38 - "People Animations"
Cohesion: 0.09
Nodes (25): ../assets/moves.bin?url, ../assets/people.glb?url, ACT_COPY, CLIPS, HOLD, _inv, LOOP, mergeGroup() (+17 more)

### Community 39 - "tide.js"
Cohesion: 0.15
Nodes (33): BAY, cellsOf(), closeLane(), deepAt(), dryNear(), evict(), floodWave(), haz() (+25 more)

### Community 40 - "Act 5 NPCs"
Cohesion: 0.06
Nodes (45): Byte budget (measured), How it plays, Inviting a friend on claude.ai, Quest credit (the decision), Skotos co-op, Tests, The shipped scenarios, The transports (+37 more)

### Community 41 - "Animation Packing"
Cohesion: 0.09
Nodes (24): BODY, chunks, emit(), findAnim(), handPose(), HANDS, head, header (+16 more)

### Community 42 - "Bot Player AI"
Cohesion: 0.18
Nodes (23): installBot(), attackable(), bfs(), chooseSkill(), count(), danger(), escape(), gear() (+15 more)

### Community 43 - "Animation System"
Cohesion: 0.06
Nodes (23): TAU, heroAvatar(), refreshHeroLook(), weaponLook(), itemMesh(), mat(), ACTIONS, b64i16() (+15 more)

### Community 44 - "GridMap"
Cohesion: 0.17
Nodes (6): 3.2 Tides that move the walkable area (3-4 d), sunken Θαλασσόπνικτος (και Θαλασσόπνικτος Καμακάς) / Sunken (and Sunken Harpooner) (new=True), The Tide (Η Παλίρροια): the coast, and the Walking Tower's arena, Done in the last session, ashMoundParts(), GridMap

### Community 45 - "Procedural Sound Synthesis"
Cohesion: 0.20
Nodes (17): ad(), bird(), creak(), exhale(), formant(), gull(), inhale(), kRate() (+9 more)

### Community 46 - "clamp"
Cohesion: 0.17
Nodes (23): clamp(), clampPct(), blowCap(), coopK(), count(), fin(), foeNear(), fxArgs() (+15 more)

### Community 47 - "projectiles.js"
Cohesion: 0.06
Nodes (45): Map and runtime grids, Balance, Co-op, Done, For the lead, Porting the progression onto the Act V line: progress, Saves, Tests (+37 more)

### Community 48 - "t"
Cohesion: 0.12
Nodes (31): bindButton(), fmt(), vulnOf(), mxpToNext(), xpToNext(), slotSkill(), skillUnlocked(), npcName() (+23 more)

### Community 49 - "Character Packing"
Cohesion: 0.12
Nodes (14): argv, BASE, compose(), HEAD_JOINTS, headOnly(), hexRGB(), io, names (+6 more)

### Community 50 - "RNG"
Cohesion: 0.15
Nodes (29): RNG(), CODE5, jettyCode(), plateGeo(), shaftMesh(), timber(), towerMesh(), whaleCode() (+21 more)

### Community 51 - "Soak Testing"
Cohesion: 0.15
Nodes (12): { chromium }, FATAL, FLAGS, iceSoak(), perf(), report, require, shotOf() (+4 more)

### Community 52 - "hostTick"
Cohesion: 0.14
Nodes (18): iceDigest(), addRemote(), downedTick(), hostTick(), interp(), listing(), lobbyHosts(), lookHero() (+10 more)

### Community 53 - "Animation Baking"
Cohesion: 0.15
Nodes (13): KEEP, [knightPath, skelPath], load(), MAP, out, poseAt(), qmul(), qnorm() (+5 more)

### Community 54 - "genMelody"
Cohesion: 0.17
Nodes (11): chance(), distCurve(), forgetting(), genMelody(), limiterCurve(), makeGraph(), g, makeIR() (+3 more)

### Community 55 - "act4Enter"
Cohesion: 0.19
Nodes (21): A3. The waylamp checkpoint is lost on Continue, and waypoint 2 is never a respawn (and the Forge has none), 7. BUG: the waylamp checkpoint is lost on Continue, and waypoint 2 is never a respawn, addLightPool(), removeLightPool(), act4Enter(), act4Zone(), bellowsUse(), lampCheckpoint() (+13 more)

### Community 56 - "forge.js"
Cohesion: 0.28
Nodes (12): C. The Forge's Breath (11-31% of the excess, nearly all of the Forge's own), 3. BUG: slag drips fall wherever lava is near, including Karthax's platform, BREATH, burn(), drips(), F, fluePeriod(), inFlue() (+4 more)

### Community 57 - "coast"
Cohesion: 0.16
Nodes (22): `src/gfx/fx.js` (mine): ambients `coast`, `coastFrozen` (diamond dust, no sea smoke), `farlight`, `blizzard`;, `src/world/atmos.js` (mine): `coast`, `coastCine`, `coastFrozen`, `coastAurora`, `farlight`, `farlightFight`,, `tools/scenario.mjs` (mine: the two appended scenarios), What I built, Lead decisions, farlight (31) Ο Έσχατος Φάρος / The Farthest Light, How the hero gets there from Whitecliff, Zones (+14 more)

### Community 58 - "Props"
Cohesion: 0.05
Nodes (42): Act V asset scouting: The Frozen Coast, Anchors, Before any download, Black sand and shingle, Boss: big creature, Boss: humanoid-ish, Bosses, Chains (+34 more)

### Community 59 - "Audio Playback & Voices"
Cohesion: 0.24
Nodes (8): allow(), applyVolumes(), clamp(), makeNoise(), num(), playSfx(), playSting(), Voice

### Community 60 - "Balance Testing"
Cohesion: 0.14
Nodes (13): ACT, args, BOSS_ZONE, BOSSES, cfg, { chromium }, done, groups (+5 more)

### Community 61 - "Parity Testing"
Cohesion: 0.17
Nodes (7): add(), fails, fetch(), FOOT, keys, ROOT, tmp

### Community 62 - "Music Sequencing"
Cohesion: 0.29
Nodes (6): applyInt(), applyMood(), killTheme(), reap(), startTimer(), tick()

### Community 63 - "Scenario Testing"
Cohesion: 0.12
Nodes (12): fatalAll(), fatalNow(), watchFatal(), A4, A5, BOT5(), under(), { chromium } (+4 more)

### Community 64 - "Playwright Scripts"
Cohesion: 0.20
Nodes (7): { chromium }, logs, require, steps, { chromium }, logs, require

### Community 65 - "three"
Cohesion: 0.09
Nodes (20): three, ../assets/dungeon.glb?url, ../assets/grave.glb?url, ../assets/town.glb?url, KIT, KIT_SCALE, KITMAT, loading (+12 more)

### Community 68 - "occlude"
Cohesion: 0.53
Nodes (6): icyMat(), mats5(), envMats(), occlude(), wayMat(), worldMat()

### Community 69 - "Impact Animation"
Cohesion: 0.31
Nodes (8): all, [path, ...names], pose(), qmul(), root, slerp(), visit(), vrot()

### Community 70 - "Stage Act Script"
Cohesion: 0.25
Nodes (7): all, DONE, FIND, LANES, LENS, meta, TODO

### Community 71 - "5. Writing style"
Cohesion: 0.05
Nodes (42): 0. The ten things that matter most, 1.1 The intro (intro.1-5), the only "official history", 1.2 The Breaking (a thousand years ago, on the Field of Ash), 1.3 The peoples, 1.4 The shards, their keepers and their wishes (all now unmade), 1.5 The beacons (φρυκτωρίες), 1.6 The Wayfarers (the rules the act set), 1.7 Timeline (+34 more)

### Community 72 - "guestEnter"
Cohesion: 0.16
Nodes (18): The owner's decisions (9 October 2026), Difficulty: what each level does to Act V, disposeZone(), tickFades(), carryLoot(), dropRemote(), flushPulls(), goHome() (+10 more)

### Community 73 - "Look Polish"
Cohesion: 0.50
Nodes (3): ISSUES, meta, rounds

### Community 75 - "Act IV: The Ashen Forge"
Cohesion: 0.06
Nodes (35): Act IV: The Ashen Forge, ashFallen Πεσμένος της Τέφρας (και Τοξότης της Τέφρας) / Ash-Fallen (and Ash-Fallen Bowman) (new=False), ashfield (22) Το Πεδίο της Τέφρας / The Field of Ash, ashsmith Τεφρομάστορας / Ashsmith (new=True), ashwing Τεφρόφτερος / Ashwing (new=True), Asset audit, beats, Blessings (+27 more)

### Community 76 - "Engine work Act V needs"
Cohesion: 0.15
Nodes (27): Story, beats, Bosses, ending, Engine work Act V needs, Music, npcs, premise (+19 more)

### Community 77 - "ring"
Cohesion: 0.09
Nodes (54): src/game/ai.js (the Act V block after sunkTick, "Act V: the Skotos's creatures and the coast's beasts"), The Cracking Ice (Ο Πάγος που Ραγίζει): the coast's shelves and Skerry Bay, every thin field on the Farthest Light, bigTele(), bodySlam(), boilOut(), bowlStep(), breach(), breachAt() (+46 more)

### Community 78 - "Skotos: the difficulty curve as formulas, Acts I to IV"
Cohesion: 0.18
Nodes (10): 1. Experience and the hero's level, 2. How a monster's level is chosen, 6. Where the curve jumps, and by how much, 7. Assumptions and limits, Formulas, Skotos: the difficulty curve as formulas, Acts I to IV, The answer in short, The play-throughs (+2 more)

### Community 79 - "coopui.js"
Cohesion: 0.12
Nodes (35): canPlay(), ended(), hostGame(), initNet(), joinGame(), lobbyKey(), newCode(), party() (+27 more)

### Community 80 - "coop.mjs"
Cohesion: 0.13
Nodes (19): { chromium }, conn(), ev(), FATAL, hostPos(), ok(), on(), onConnection() (+11 more)

### Community 81 - "player.js"
Cohesion: 0.09
Nodes (37): src/game/cold.js (new, ~150 lines), The conflicts and how they were resolved, victim(), COLD, coldAdd(), coldMul(), coldNoRegen(), coldZone() (+29 more)

### Community 82 - "check-act3.mjs"
Cohesion: 0.14
Nodes (21): Story (owned by story), Zones, Εκτέλεση, add(), bad(), cellOf(), fails, flood() (+13 more)

### Community 83 - "Porting the Act IV difficulty fix onto Act V (branch claude/sleepy-tesla-4030vd)"
Cohesion: 0.22
Nodes (9): 1. What applied cleanly, 3. Six difficulties («Σκότος», index 5), 5. Things the port does to Act V without code changes (for the Act V owner to know), 6. Unsure / left for the Act V owner, 7. Runtime check (private no-HMR server, port 5287, one browser at a time, stopped after), 8. Verification pass (second agent; files in `verifyport/`), Porting the Act IV difficulty fix onto Act V (branch claude/sleepy-tesla-4030vd), di() (+1 more)

### Community 84 - "Skotos Act V: code contract"
Cohesion: 0.25
Nodes (7): Creatures (group `act5`), Expected assets, File ownership (edit only your own files in your stage), People (set `frost`), Skotos Act V: code contract, Stage A outcome (lead decisions, 10 October), Stages and gates

### Community 85 - "Skotos, Act IV: the mechanics audit"
Cohesion: 0.14
Nodes (13): 10. Fire arrows burn where they hit her (side effect), 11. Ashsmiths and the Hall of Moulds (design hot-spot), 12. Phone readability and control (qualitative), 1. Karthax: what each phase does (design numbers), 2. The Forge's Breath, where it bites (design rule), 4. BUG: affixes fire from a tick on her back and from an Ashwing in the sky, 6. Ivar's Dark: the light is smaller than the distance he keeps (design numbers), 8. Dash hits reach past their telegraphs (readability bug, shared code) (+5 more)

### Community 86 - "textures.js"
Cohesion: 0.24
Nodes (15): lerp(), cache, canvas(), finish(), hashP(), MAKERS, masonry(), masonryField() (+7 more)

### Community 87 - "S2 (story lane): HUD, panels, overlay, audio, difficulty texts"
Cohesion: 0.12
Nodes (15): audio.js, Close, How it was tested, hud.js, Open problems, overlay.js / style.css, panels.js, Progress notes (as it went) (+7 more)

### Community 88 - "The causes, ranked"
Cohesion: 0.13
Nodes (14): 1. Karthax: the fight's numbers and structure (design/tuning). 44-70% of the excess, 2. The Forge's Breath (tuning/design). 11-31% of the excess, and nearly all of the Forge's, 3. Ivar (design). 9-23% of the excess, a local bump rather than the cliff, 4. The Field of Ash (design/readability). 1-24% of the excess, mostly in walked runs, 5. The level drift (levelling). A slope present in every act, small here, 6. Act III is the trough (design of the curve). Inflates the IV/III ratio by about ×1.8, 7. The bugs (bug). Under 5% of the measured damage, but bad for feel and retries, 8. Phone readability (readability). Not measured, adds on top of #1 and #2 (+6 more)

### Community 89 - "tex"
Cohesion: 0.35
Nodes (11): tex(), fireCage(), flame5(), flames(), halo(), lanternRoom(), runeFace(), solid5() (+3 more)

### Community 90 - "Act V assets as built: the stage A verification"
Cohesion: 0.18
Nodes (10): Act V assets as built: the stage A verification, Changes in this pass, Checks by asset, Creatures (`?cview`, numbers from the new `&audit` mode), How to repeat, Outcome, People (`?viewer`, and the creature viewer's new `&folk=` in the artifact), Props and layers (+2 more)

### Community 91 - "Integrate (stage C, integrator)"
Cohesion: 0.14
Nodes (13): Bugs found and fixed at their root (this run), Difficulty: Act V on the fixed curve, Fourth run (02:36, after a restart; the lead committed everything as b57ca18), Integrate (stage C, integrator), Joins to do (from the reports), Open, for others, Progress notes (as it goes; a restart resumes from here), Second run (21:32, after the lead's commits ef5d02b (my joins and scenarios) and c388c3c (the Act IV fix ported)) (+5 more)

### Community 92 - "Shared names"
Cohesion: 0.22
Nodes (8): Built assets (details in `scratchpad/act3-assets.json`; a parallel workflow is polishing them, but names and clips stay), File ownership (edit only your own files), Lead decisions (override the plan), Map (`src/world/map.js`, owned by world), Shared names, Skotos Act III: code contract, The level object L from gen3.js, Visuals (`src/world/build.js`, owned by world)

### Community 93 - "rr"
Cohesion: 0.40
Nodes (6): blood(), bolt0(), glowBurst0(), hitFx0(), rr(), sparks0()

### Community 94 - "decal0"
Cohesion: 0.28
Nodes (5): decal0(), decalBed(), decalTexture(), ring0(), Trail

### Community 95 - "3. What a frozen coast needs that does not exist yet"
Cohesion: 0.12
Nodes (15): 3.10 Swimming, 3.4 Ice floes, 3.5 Aurora sky (1-1.5 d), 3.6 Falling snow (0-0.5 d), 3.7 Fog banks (0.5-1 d), 3.8 Ships and wrecks (1.5-2.5 d), 3.9 Under-water or under-ice spaces, 3. What a frozen coast needs that does not exist yet (+7 more)

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
Cohesion: 0.14
Nodes (14): 1.13 HUD and UI, 1.14 Audio (`audio/audio.js`, all procedural WebAudio, no files), 1.15 Echoes (boss refights), 1.16 Credits, 1.17 Text (`src/i18n/text.js`, Greek first), 1.18 Debug views, 1.19 Scenarios and layout checks, 1.20 Artifact build and publish (+6 more)

### Community 101 - "C2: the enemies (combat, stage C)"
Cohesion: 0.20
Nodes (9): C2: the enemies (combat, stage C), Differences from the design (code is the truth; written down), How I tested it, Open problems, Progress notes, Requests for the story lane (not my files), src/game/data.js, src/game/projectiles.js, src/game/skills.js, src/i18n/text.js (+1 more)

### Community 102 - "Gate G3 (stage B, Foundation): results and fixes"
Cohesion: 0.20
Nodes (9): Artifact, Fixes (gate keeper; all in stage-B files), Gate G3 (stage B, Foundation): results and fixes, Left for later (not gate failures; for C or the review), Perf (perf5, final code, perf5b/perf5.txt), Scenarios (scen/summary.txt; one at a time, BASE :5341), Servers, The walk (shots/, phone q1 unless named d*) (+1 more)

### Community 103 - "Act IV fix: changes (base 7eded86, worktree pub/skotos; line numbers are the new file's)"
Cohesion: 0.22
Nodes (8): A. Bugs, Act IV fix: changes (base 7eded86, worktree pub/skotos; line numbers are the new file's), B. Karthax, C. The Forge's Breath, D. Ivar, E. The Field's shields, Notes, Tools

### Community 104 - "emit"
Cohesion: 0.13
Nodes (27): 1.9 Bosses, 2. Reusable systems, and how a frozen coast can use them, Calls in files I do not own (owners not running in stage B; the contract names them as B1's smallest changes), breakCage(), cageBlow(), ivarDark(), lastFire(), say() (+19 more)

### Community 105 - "What I built"
Cohesion: 0.16
Nodes (12): B1b: runtime grids, the tide and the ice (world, stage B), Changes in files I do not own, How I tested it (scratch paths under scratchpad/act5/b/b1b/), Open problems, What I built, Findings, Left as is (noted, not in the findings), Re-runs (after all the fixes) (+4 more)

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

### Community 110 - "Act V: The Frozen Coast"
Cohesion: 0.11
Nodes (18): Act V: The Frozen Coast, Asset audit, Blessings, Echoes and post-game, Enemies, Ice Memories (Μνήμες από πάγο): the three coast sea-lights, and the Farthest Light, icemaw Παγολόχος / Icemaw (new=True), iceSinger Ψάλτρια του Πάγου / Ice Singer (new=True) (+10 more)

### Community 111 - "Σκότος"
Cohesion: 0.29
Nodes (6): Άδειες, Δομή, Σκότος, Τι θα ανέβαζε κι άλλο το επίπεδο, Τι υπάρχει σε αυτή την έκδοση, Χειρισμός

### Community 112 - "B1a: plumbing and generation (world, stage B)"
Cohesion: 0.29
Nodes (6): B1a: plumbing and generation (world, stage B), Changes in files I do not own, How I tested it, Open problems, Stubbed or left for stage C (or B1b), What I built

### Community 113 - "S1 (story lane): the story and its text"
Cohesion: 0.29
Nodes (6): Close, How it was tested (private no-HMR server :5381; one headless browser at a time), Requests for the combat lane (story listens/emits; stubs where noted), S1 (story lane): the story and its text, Stubs / open problems, What was built

### Community 114 - "clearFX"
Cohesion: 0.25
Nodes (4): clearFX(), clearPrints(), leafTexture(), Pool

### Community 115 - "B2a: sea.js (the water, the ice, the aurora, the beams) — report"
Cohesion: 0.29
Nodes (6): B2a: sea.js (the water, the ice, the aurora, the beams) — report, Changes in files I do not own, How I tested it, Open problems, Requests to other owners, What I built

### Community 116 - "Co-op review fixes (progress notes)"
Cohesion: 0.14
Nodes (13): Co-op review fixes (progress notes), Full test after the four passes — started, Full test — results, Pass "budget" (L3-01..L3-08) — started, Pass "budget" — one line per finding, Pass "safety" (L1-01..L1-10, L2-01, L2-09) — started, Pass "safety" — one line per finding, Pass "skeptic round 2" (L1-02, L1-05, L2-05, L3-04, L4-1, L4-2, L4-5, L1-07, L1-08, L2-04, L2-12, L3-03, L4-10) — started (+5 more)

### Community 117 - "addTele"
Cohesion: 0.60
Nodes (5): addTele(), teleCircle0(), teleCone0(), teleLine0(), teleMat()

### Community 118 - "Skotos Act IV: the fix plan (single plan)"
Cohesion: 0.18
Nodes (10): A1. Slag drips fall on Karthax's platform, statues, ghost pools and in the Hall of Moulds, A2. Elite affixes fire from a clinging Ember Tick or an airborne Ashwing, A4. Dash hits reach wider than their drawn telegraphs, A. Bugs (all from the diagnosis), F. Not changed, on purpose, G. Expected numbers afterwards, H. Verification (fast), Skotos Act IV: the fix plan (single plan) (+2 more)

### Community 119 - "Stage C fixer: the three reviewers' 12 findings"
Cohesion: 0.50
Nodes (3): Findings, Re-runs on the fixed tree (private no-HMR :5461, one browser at a time; c/fix/sc, c/fix/queue.log), Stage C fixer: the three reviewers' 12 findings

### Community 120 - "The code graph (graphify)"
Cohesion: 0.50
Nodes (3): Keep it fresh, The code graph (graphify), Use

### Community 121 - "lightAt"
Cohesion: 0.31
Nodes (11): I. Risks, 2. The conflicts (9 hunks in 5 files) and how each was resolved, 4. Act V code changed to fit the fix, Porting onto the Act V branch (`/home/user/abyssos`, branch claude/sleepy-tesla-4030vd), lightChannel(), shroudLook(), sideRush(), lampAt() (+3 more)

### Community 124 - "glow"
Cohesion: 0.20
Nodes (9): Measured files, The frost set, by scene, The rime pack, by prop, B2b: props, atmospheres, FX and the perf gate (sea, stage B) — report, Changes in files I do not own, How I tested it, Open problems and requests, Progress notes (as written during the run) (+1 more)

### Community 125 - "f"
Cohesion: 0.20
Nodes (6): Co-op: what the lead does at release, ACT, f(), out, rows, Byte budget

### Community 128 - "nv"
Cohesion: 0.20
Nodes (10): bassNote(), chooseProg(), chordOf(), drumStep(), MOTIF, nv(), phrase(), pump() (+2 more)

### Community 129 - "sendSnap"
Cohesion: 0.33
Nodes (10): actorEntry(), bits(), clipIdx(), guestPresence(), heroState(), packFx(), pickActors(), q() (+2 more)

### Community 131 - "The scaling table (data.js `COOP`)"
Cohesion: 0.25
Nodes (8): Balance (measured), The scaling table (data.js `COOP`), crackedBell(), jit(), keeperMotif(), metal(), mf(), sineLine()

### Community 132 - "refreezeAt"
Cohesion: 0.39
Nodes (8): Act V, cellsIn(), crackCells(), crackCone(), crackLine(), crackRing(), refreezeAt(), toHost()

### Community 133 - "Progression: Mastery, skill variants, later skills and the loadout"
Cohesion: 0.25
Nodes (7): Balance before and after, Mastery tracks, Numbers, Points and Mastery levels, Progression: Mastery, skill variants, later skills and the loadout, The later skills and variants at the dummies, What the player sees

### Community 134 - "Skotos: handoff notes"
Cohesion: 0.29
Nodes (6): How to work, Open items, Skotos: handoff notes, State, Where everything stopped (20 October, paused by the owner until next week), Where things are

### Community 135 - "Progression: the artifact files changed against version 12"
Cohesion: 0.33
Nodes (5): Added (upload), Checks, index.html, Progression: the artifact files changed against version 12, Removed (set to null)

### Community 136 - "5. The tables"
Cohesion: 0.40
Nodes (5): 5.1 Each zone, each class, Warden and Wanderer, 5.2 Content only: the same hero against every zone, 5.3 Each boss, each class, Warden and Wanderer, 5.4 Act over act (each zone or boss over the one before it), 5. The tables

### Community 137 - "6.1 Node-only steps (Acts II-IV, no Blender)"
Cohesion: 0.40
Nodes (5): 6.1 Node-only steps (Acts II-IV, no Blender), 6.2 Blender steps, 6.3 Where sources live, 6. The asset pipeline as it stands, maskParts()

### Community 138 - "Progression work: progress notes (for a restart)"
Cohesion: 0.40
Nodes (4): Design (decided), Done, Next, Progression work: progress notes (for a restart)

### Community 139 - "Progression review: fixes (worktree prog/skotos, branch claude/skotos-progression, uncommitted)"
Cohesion: 0.40
Nodes (4): Files changed (against HEAD 18e2359), Findings (one line each), Progression review: fixes (worktree prog/skotos, branch claude/skotos-progression, uncommitted), Re-runs (dev server :5297, tools/vite.nohmr.mjs; one browser at a time)

### Community 140 - "3. The hero's power"
Cohesion: 0.50
Nodes (4): 3. The hero's power, Gear (items.js), Skills and the calibrated rotation, Stats (stats.js:5-42)

### Community 141 - "4. Monster power"
Cohesion: 0.50
Nodes (4): 4. Monster power, Act IV's special multipliers, in formulas, The bosses (ai.js), as the model encodes them, The kinds, Act III against Act IV (data.js:77-102)

### Community 142 - "3.11 Cold damage and warmth (1-1.5 d)"
Cohesion: 0.50
Nodes (3): 3.11 Cold damage and warmth (1-1.5 d), freshStatus(), uid()

### Community 143 - "map.js"
Cohesion: 0.50
Nodes (3): DX, DZ, WQ

## Knowledge Gaps
- **3 isolated node(s):** `../assets/dungeon.glb?url`, `../assets/grave.glb?url`, `../assets/town.glb?url`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1098 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `three` to `ai.js`, `Actors & Spawning`, `skillsx.js`, `Prop Mesh Builders`, `Rime Asset Packing`, `build.js`, `Visual Effects & Decals`, `models.js`, `Act Actor Spawning`, `boot.js`, `ice.js`, `Cold Hazard System`, `Package Dependencies`, `Viewer Tools`, `Cinder Asset Packing`, `Act Transitions & Cutscenes`, `combat.js`, `Sea & Sky Rendering`, `Node Build Utilities`, `Wood Asset Packing`, `Environment Loading`, `creatures.js`, `People Animations`, `Animation Packing`, `Animation System`, `projectiles.js`, `coopui.js`, `player.js`, `textures.js`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **What connects `../assets/dungeon.glb?url`, `../assets/grave.glb?url`, `../assets/town.glb?url` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ai.js` be split into smaller, more focused modules?**
  _Cohesion score 0.03365253077975376 - nodes in this community are weakly interconnected._
- **Why does `clamp()` connect `clamp` to `ai.js`, `Actors & Spawning`, `skillsx.js`, `.play`, `refreezeAt`, `killTele`, `sendSnap`, `Visual Effects & Decals`, `build.js`, `Act Actor Spawning`, `boot.js`, `angleTo`, `Prop Mesh Builders`, `Inventory & Trading`, `ice.js`, `Cold Hazard System`, `Viewer Tools`, `unmaking`, `Combat Behaviors`, `Act Transitions & Cutscenes`, `combat.js`, `Sea & Sky Rendering`, `gen5.js`, `.add`, `coop.js`, `now`, `creatures.js`, `People Animations`, `tide.js`, `Animation System`, `projectiles.js`, `RNG`, `hostTick`, `Creature Animation`, `Person Animation`, `guestEnter`, `player.js`, `What I built`, `lightAt`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `Actors & Spawning` be split into smaller, more focused modules?**
  _Cohesion score 0.044322344322344324 - nodes in this community are weakly interconnected._
- **Why does `emit()` connect `emit` to `ai.js`, `Actors & Spawning`, `skillsx.js`, `killTele`, `boot.js`, `angleTo`, `Inventory & Trading`, `ice.js`, `Cold Hazard System`, `unmaking`, `Combat Behaviors`, `Act Transitions & Cutscenes`, `combat.js`, `Encounter Spawning`, `Cutscene Triggers & Dialogue`, `coop.js`, `now`, `spawnMonster`, `data.js`, `tide.js`, `clamp`, `projectiles.js`, `t`, `hostTick`, `act4Enter`, `forge.js`, `guestEnter`, `Engine work Act V needs`, `ring`, `coopui.js`, `player.js`, `1. Touchpoint checklist: everything an act wires`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `skillsx.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07277701778385773 - nodes in this community are weakly interconnected._