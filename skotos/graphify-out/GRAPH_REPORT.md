# Graph Report - skotos  (2026-10-27)

## Corpus Check
- 193 files · ~1,185,836 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: .jsonl 3, (none) 2, .patch 1)

## Summary
- 4242 nodes · 13506 edges · 189 communities (179 shown, 10 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 1839 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `85b6f49e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ai.js
- world.js
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
- Ice Floes
- light.js
- Music & Audio Data
- Package Dependencies
- Viewer Tools
- ../../src/game/save.js?tab=B
- Cinder Asset Packing
- Combat Behaviors
- Act Transitions & Cutscenes
- combat.js
- Sea & Sky Rendering
- Node Build Utilities
- P
- Engine work Act V needs
- gen5.js
- data.js
- Wood Asset Packing
- coop.js
- now
- Environment Loading
- spawnMonster
- test-migration.mjs
- Asset Download Scripts
- data.js
- people.js
- tide.js
- transport.js
- Animation Packing
- Bot Player AI
- Animation System
- GridMap
- Procedural Sound Synthesis
- replayOne
- projectiles.js
- t
- Character Packing
- pickups.js
- Soak Testing
- initNet
- Animation Baking
- genMelody
- test-saves.mjs
- damage
- farlight
- Props
- Audio Playback & Voices
- Balance Testing
- Parity Testing
- Music Sequencing
- Scenario Testing
- Playwright Scripts
- kits.js
- Creature Animation
- Person Animation
- angleDiff
- inZone
- Stage Act Script
- 5. Writing style
- hostTick
- Look Polish
- Act IV: The Ashen Forge
- skills.js
- ring
- Skotos: the difficulty curve as formulas, Acts I to IV
- t
- coop.mjs
- cold.js
- check-act3.mjs
- Porting the Act IV difficulty fix onto Act V (branch claude/sleepy-tesla-4030vd)
- Skotos Act V: code contract
- Skotos, Act IV: the mechanics audit
- textures.js
- S2 (story lane): HUD, panels, overlay, audio, difficulty texts
- The causes, ranked
- three
- Act V assets as built: the stage A verification
- Integrate (stage C, integrator)
- Shared names
- rr
- decal0
- buildLevel
- Act V look, fixer round 1 (progress notes first; the per-issue lines, metrics, perf, requests and shots at the end)
- Skotos, Act IV difficulty fix: release notes
- Skotos: simulated play, difficulty by zone and boss
- Verify, round 2: FAIL (Karthax, Ivar and all 12 scenario runs pass; 11 of 78 targets missed, all in the Forge's packs and one Field cell; the Warden class is not a step up on bosses)
- 1. Touchpoint checklist: everything an act wires
- C2: the enemies (combat, stage C)
- Gate G3 (stage B, Foundation): results and fixes
- Act IV fix: changes (base 7eded86, worktree pub/skotos; line numbers are the new file's)
- live-web.mjs
- What I built
- Act V release fixes (the last problems before Act V goes live)
- gen4.js
- Πράξη V: Η Παγωμένη Ακτή, σε μία σελίδα
- C3: the two bosses, the cameo poses, blessings and legendaries (combat, stage C)
- player.js
- Σκότος
- B1a: plumbing and generation (world, stage B)
- S1 (story lane): the story and its text
- clearFX
- B2a: sea.js (the water, the ice, the aurora, the beams) — report
- Co-op review fixes (progress notes)
- addTele
- Act VI: Beneath the Ice (proposal: systems-first)
- Stage C fixer: the three reviewers' 12 findings
- The code graph (graphify)
- lightAt
- Act V look, fixer round 2 (progress notes first; per-issue lines, perf and shots at the end)
- Act V look, fixer round 3 (progress notes first; per-issue lines, perf and shots at the end)
- glow
- f
- coop/progress.md
- coop/questions.md
- Act VI: Beneath the Ice (proposal, story-first)
- sendSnap
- ../../src/game/cloud.js?held
- nv
- refreezeAt
- Progression: Mastery, skill variants, later skills and the loadout
- live-supabase.mjs
- Progression: the artifact files changed against version 12
- test-sync.mjs
- floor
- Progression work: progress notes (for a restart)
- SupabaseTransport
- stillshots.mjs
- test-transport.mjs
- cloudsync.js
- map.js
- mkplan.mjs
- progression/questions.md
- sap.js
- light5
- .room
- screens.js
- cloudart.js
- 5. Writing style
- Act VI: Beneath the Ice
- Skotos co-op
- Act VI: Beneath the Ice (proposal: production-first)
- plunge
- weep
- tickLight
- Enemies
- drown
- relayOf
- 3. Unresolved threads Act V can pay off without retconning
- The coast's frame at q1: steps 1-3 of the plan, measured (24 October)
- Mechanics
- Act VI stage 0: the provenance gates of the two downloads
- Mechanics
- Co-op
- wire
- C1: mechanics and creature plumbing (combat, stage C)
- Enemies
- glow
- Πράξη VI «Κάτω από τον Πάγο»: πέντε αποφάσεις για σένα
- Assets
- Enemies
- Enemies
- Assets
- Co-op on Supabase (the public web build, later the Android app)
- lerp
- Plan: bring the Frozen Coast's perf5 frame under 1.15 × the Field at q1
- M
- atmos.js
- Story
- Cloud save: progress notes (session claude/skotos-cloudsave)
- createClient
- updateFX
- .join
- Story
- Net diet: progress notes (branch claude/skotos-net-diet)

## God Nodes (most connected - your core abstractions)
1. `emit()` - 217 edges
2. `clamp()` - 150 edges
3. `P()` - 117 edges
4. `later()` - 112 edges
5. `t()` - 109 edges
6. `tally()` - 96 edges
7. `angleTo()` - 90 edges
8. `glowBurst()` - 73 edges
9. `puff()` - 61 edges
10. `../../src/game/save.js?tab=B` - 60 edges

## Surprising Connections (you probably didn't know these)
- `npcs` --references--> `attachUpright()`  [INFERRED]
  docs/act6-briefs/proposal-production.md → src/game/actors.js
- `Built assets (details in `scratchpad/act3-assets.json`; a parallel workflow is polishing them, but names and clips stay)` --references--> `daze()`  [INFERRED]
  docs/act3-contract.md → src/game/ai.js
- `A4. Dash hits reach wider than their drawn telegraphs` --references--> `dashStep()`  [INFERRED]
  docs/act4-balance/final-plan.md → src/game/ai.js
- `8. Dash hits reach past their telegraphs (readability bug, shared code)` --references--> `dashStep()`  [INFERRED]
  docs/act4-balance/mechanics.md → src/game/ai.js
- `1. Karthax: what each phase does (design numbers)` --references--> `boss()`  [INFERRED]
  docs/act4-balance/mechanics.md → src/game/ai.js

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

## Communities (189 total, 10 thin omitted)

### Community 0 - "ai.js"
Cohesion: 0.03
Nodes (114): src/game/ai.js (the Act V block after sunkTick, "Act V: the Skotos's creatures and the coast's beasts"), Sealing the Breathing-holes (Οι Ανάσες): the Farthest Light (q28), Creatures (group `act6`), Expected assets, People (no new set), The silt pack (`silt`), dampAngle(), lieDown() (+106 more)

### Community 1 - "world.js"
Cohesion: 0.05
Nodes (96): A3. The waylamp checkpoint is lost on Continue, and waypoint 2 is never a respawn (and the Forge has none), 7. BUG: the waylamp checkpoint is lost on Continue, and waypoint 2 is never a respawn, 1.11 World-state flags, 2. Reusable systems, and how a frozen coast can use them, Map and runtime grids, Πώς δουλεύουν οι χαρακτήρες, Actor, createPlayer() (+88 more)

### Community 2 - "skillsx.js"
Cohesion: 0.09
Nodes (41): 5. The Ash-Fallen shield blocks every class's basic attack (design rule, phone-hostile), foes(), heroHit(), act(), circleHit(), handPoint(), ADD(), beamMesh() (+33 more)

### Community 3 - "Prop Mesh Builders"
Cohesion: 0.04
Nodes (91): `src/world/build5.js` (mine, ~900 lines), The rime pack (`rime`), Assets, Creatures (group `act5`, tools/creatures/act5/*.mjs, `ACT_FILES.act5`), Ground layers (pack `rime`, d 1024 / n 512), People (set `frost`, folk.mjs --set=frost; Quaternius Universal Base Characters and Modular Outfits, CC0, already shipped in people.glb and moves.bin; no download), Props (pack `rime`, tools/pack-rime.mjs; ≤ 70k triangles), Totals for the act (+83 more)

### Community 4 - "Rime Asset Packing"
Cohesion: 0.08
Nodes (63): aoTex(), applyLook(), atlas(), bakeAO(), bakeWorld(), boundsOf(), boxBlur(), cleanMarks() (+55 more)

### Community 5 - "killTele"
Cohesion: 0.08
Nodes (47): Stubbed or left for later, What is built, damp(), alive(), bcd(), bigs(), breachStep(), breachUp() (+39 more)

### Community 6 - "build.js"
Cohesion: 0.05
Nodes (96): icyMat(), mats5(), soloBatch(), act3Level(), act3Prop(), ACT4, act4Level(), act4Mats() (+88 more)

### Community 7 - "Visual Effects & Decals"
Cohesion: 0.14
Nodes (17): AMB5, breath(), decalGeo, footprint(), killTele0(), _pm, _pp, _pq (+9 more)

### Community 8 - "models.js"
Cohesion: 0.07
Nodes (56): 4. The level and difficulty curve so far, and Act V's levels, 5.1 Artifact as built now, 5.2 What each act loads (raw files / artifact / phone GPU textures), 5.3 Act V budget, 5.4 Contingency: unloading (1-2 d, only if the owner's phone struggles), 5. Performance and memory, 6.1 Node-only steps (Acts II-IV, no Blender), 6.2 Blender steps (+48 more)

### Community 9 - "Act Actor Spawning"
Cohesion: 0.06
Nodes (63): 1.7 Actors (`game/actors.js`), src/game/actors.js, act4Spawn(), act5Npc(), act5Spawn(), actSpawn(), allies(), amberCrown() (+55 more)

### Community 10 - "boot.js"
Cohesion: 0.12
Nodes (30): aimAtMouse(), IN, initInput(), joy, pollInput(), preloadModels(), shadowsInit(), updateShadows() (+22 more)

### Community 11 - "angleTo"
Cohesion: 0.12
Nodes (31): B. Karthax (the cliff: 44-70% of the excess), D. Ivar's Dark (9-23% of the excess; the Mage on Wanderer), angleTo(), ashBreath(), bodyLash(), breachTele(), clawSweep(), darkStep() (+23 more)

### Community 12 - "check-act4.mjs"
Cohesion: 0.12
Nodes (27): Expected assets (verify against `scratchpad/act4-assets.json` when it exists), File ownership (edit only your own files), Lead decisions (override the plan), Shared names, Skotos Act IV: code contract, Story (story), The level object L from gen4.js (world), Zones and exits (+19 more)

### Community 13 - "Inventory & Trading"
Cohesion: 0.10
Nodes (40): Audio, equip(), fromStash(), gamble(), gambleCost(), reforge(), reforgeCost(), sell() (+32 more)

### Community 14 - "Ice Floes"
Cohesion: 0.10
Nodes (35): Visuals (`build.js`, world), Tide and ice gameplay (ice.js, ai.js, skills.js), beamIce(), decay(), _e, FALLS, firmNear(), floeTick() (+27 more)

### Community 15 - "light.js"
Cohesion: 0.12
Nodes (16): aim(), attachCradle(), cradleMesh(), heroRing(), LAMPS, LIGHT, LT2, _rc (+8 more)

### Community 16 - "Music & Audio Data"
Cohesion: 0.05
Nodes (42): ANSWER, ARP6, ARP8, ASH_DAWN, ASH_PROGS, chordCache, COAST_LIT, COAST_PROGS (+34 more)

### Community 17 - "Package Dependencies"
Cohesion: 0.08
Nodes (26): @gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions, meshoptimizer, io, all, [path, ...names], pose() (+18 more)

### Community 18 - "Viewer Tools"
Cohesion: 0.09
Nodes (35): act4At(), fakeCinder(), hashA(), layout5(), props5(), startViewer(), loop(), startWorld() (+27 more)

### Community 19 - "../../src/game/save.js?tab=B"
Cohesion: 0.10
Nodes (44): Saves (world lane; the cloud-save line's change named here), Files, The rules, Tests, BOON, INV_SIZE, STASH_SIZE, cleanItem() (+36 more)

### Community 20 - "Cinder Asset Packing"
Cohesion: 0.10
Nodes (41): alongZ(), applyLook(), bakeWorld(), bellowsPose(), BONE, boundsOf(), boxBlur(), charCol() (+33 more)

### Community 21 - "Combat Behaviors"
Cohesion: 0.15
Nodes (39): Combat (combat), 1.8 AI behaviours and traits (`game/ai.js`), 3.3 Ice that cracks under weight (2-3 d), Combat, Balance (measured), The scaling table (data.js `COOP`), aggroCheck(), attackTick() (+31 more)

### Community 22 - "Act Transitions & Cutscenes"
Cohesion: 0.06
Nodes (120): 1.10 Story: quests and cinematics (`game/story.js`), Story (story lane, stage D), act4Death(), actDeath(), kill(), killed(), seeHero(), cradlePoint() (+112 more)

### Community 23 - "combat.js"
Cohesion: 0.08
Nodes (32): 3.11 Cold damage and warmth (1-1.5 d), src/game/combat.js, src/game/data.js (beyond DIFFS/HAZ5), src/game/sap.js, What I built, src/game/combat.js, The Sea-Lights and the Cold (Οι Φάροι και το Ψύχος): both zones and both fights, Combat (combat lane) (+24 more)

### Community 24 - "Sea & Sky Rendering"
Cohesion: 0.05
Nodes (56): 1.2 Level generation, 3.9 Under-water or under-ice spaces, `src/world/build.js` (mine), Open problems, 1. Ground: skip the ice-window outline where no window can be, 2. The ordered plan, 2. Vertex aurora only near the view (ground and sea), 3. Sea: skip terms where they are exactly zero (+48 more)

### Community 25 - "Node Build Utilities"
Cohesion: 0.08
Nodes (26): types, fitBounds(), flatten(), loadProp(), simplifyPrim(), transformAll(), triCount(), writePack() (+18 more)

### Community 26 - "P"
Cohesion: 0.08
Nodes (49): 6.4 The creature contract (`tools/creatures/README.md`, `gfx/creatures.js`), breakCage(), cageBlow(), callMourners(), chargeEnd(), consume(), crackLook(), crackStone() (+41 more)

### Community 27 - "Engine work Act V needs"
Cohesion: 0.06
Nodes (78): 6.2 How quests move (story.js), 1.1 Zones and exits, 1.4 Atmosphere and FX ambients, 1.5 Packs, people sets and creature groups: how they load and unload, 3.13 Act-agnostic plumbing for a fifth act (1.5-2 d), Calls in files I do not own (owners not running in stage B; the contract names them as B1's smallest changes), `src/world/sea.js` (new, ~870 lines), What I built (+70 more)

### Community 28 - "gen5.js"
Cohesion: 0.12
Nodes (39): bfs(), coastFaults(), coastHolds(), CORNER, dress5Coast(), dress5Far(), dressCoast(), fail() (+31 more)

### Community 29 - "data.js"
Cohesion: 0.06
Nodes (41): starterGear(), AFFIXES, BASES, BOONS, BUFFS, COOP, DODGE, GIFTS (+33 more)

### Community 30 - "Wood Asset Packing"
Cohesion: 0.11
Nodes (31): io, packLayer(), bake(), boxBlur(), cutGround(), deckOf(), dot(), dropLoose() (+23 more)

### Community 31 - "coop.js"
Cohesion: 0.06
Nodes (42): LOOKS, VIS, VIS_FOLLOW, blowCap(), coopK(), EVB, flushPulls(), foeNear() (+34 more)

### Community 32 - "now"
Cohesion: 0.22
Nodes (19): monsterXP(), besideHost(), interp(), killOk(), killPay(), lagOf(), now(), num() (+11 more)

### Community 33 - "Environment Loading"
Cohesion: 0.12
Nodes (25): bytes(), claim(), ENV, GLOW, LAMB, lambert(), loadEnv(), loadPack() (+17 more)

### Community 34 - "spawnMonster"
Cohesion: 0.14
Nodes (29): I. Risks, 1.9 Bosses, spawnMonster(), arena(), arenaR(), braziers(), brood(), callEater() (+21 more)

### Community 35 - "test-migration.mjs"
Cohesion: 0.07
Nodes (32): Why the server says who sent it, as(), bad(), burst, count(), db, endG(), err() (+24 more)

### Community 36 - "Asset Download Scripts"
Cohesion: 0.12
Nodes (26): ALLFB, download(), DRY, failed, fetchAmbientCG(), fetchPolyHaven(), fetchSketchfab(), FORCE (+18 more)

### Community 37 - "data.js"
Cohesion: 0.14
Nodes (38): Progression: the Lamplight track (progression lane), Saves, fmtK(), MAX_LEVEL, SKILL_MAX_RANK, SKILLS, VARIANT_RANK, VARIANTS (+30 more)

### Community 38 - "people.js"
Cohesion: 0.06
Nodes (51): ../assets/moves.bin?url, ../assets/people.glb?url, audit(), startCreatureView(), ACT_FILES, CAST, creatureModel(), CREATURES (+43 more)

### Community 39 - "tide.js"
Cohesion: 0.14
Nodes (30): The Black Water (tide.js, systems), HAZ5, BAY, cellsOf(), closeLane(), deepAt(), dryNear(), evict() (+22 more)

### Community 40 - "transport.js"
Cohesion: 0.11
Nodes (26): BAD, BUDGET, BURST, claim(), clientOpts(), coded(), diffNull(), ECON (+18 more)

### Community 41 - "Animation Packing"
Cohesion: 0.09
Nodes (24): BODY, chunks, emit(), findAnim(), handPose(), HANDS, head, header (+16 more)

### Community 42 - "Bot Player AI"
Cohesion: 0.19
Nodes (22): installBot(), attackable(), bfs(), chooseSkill(), count(), danger(), escape(), gear() (+14 more)

### Community 43 - "Animation System"
Cohesion: 0.07
Nodes (16): TAU, ACTIONS, b64i16(), CLIPS, getClip(), GRIP_STAFF_TILT, HOLD, HumanoidAnim (+8 more)

### Community 44 - "GridMap"
Cohesion: 0.15
Nodes (11): 2. The Forge's Breath, where it bites (design rule), Checked and fine (no change needed), Map (world), 3.2 Tides that move the walkable area (3-4 d), icemaw Παγολόχος / Icemaw (new=True), sunken Θαλασσόπνικτος (και Θαλασσόπνικτος Καμακάς) / Sunken (and Sunken Harpooner) (new=True), The Tide (Η Παλίρροια): the coast, and the Walking Tower's arena, The Breathing Ice (Ο Πάγος που Ανασαίνει): the Hollows, the Throat (+3 more)

### Community 45 - "Procedural Sound Synthesis"
Cohesion: 0.20
Nodes (17): ad(), bird(), creak(), exhale(), formant(), gull(), inhale(), kRate() (+9 more)

### Community 46 - "replayOne"
Cohesion: 0.43
Nodes (8): count(), fin(), fxArgs(), hurtOpts(), kindOk(), nums(), replayOne(), shotOpts()

### Community 47 - "projectiles.js"
Cohesion: 0.11
Nodes (26): Who ticks what each frame (no new call site), Done, For the lead, Porting the progression onto the Act V line: progress, Files changed (against HEAD 18e2359), Findings (one line each), Progression review: fixes (worktree prog/skotos, branch claude/skotos-progression, uncommitted), Re-runs (dev server :5297, tools/vite.nohmr.mjs; one browser at a time) (+18 more)

### Community 48 - "t"
Cohesion: 0.11
Nodes (30): The conflicts and how they were resolved, Code, bindButton(), victim(), gainMastery(), gainXP(), levelFx(), mxpToNext() (+22 more)

### Community 49 - "Character Packing"
Cohesion: 0.12
Nodes (14): argv, BASE, compose(), HEAD_JOINTS, headOnly(), hexRGB(), io, names (+6 more)

### Community 50 - "pickups.js"
Cohesion: 0.09
Nodes (38): fmt(), COLD, healHero(), addToBag(), itemColor(), itemName(), weaponLook(), add() (+30 more)

### Community 51 - "Soak Testing"
Cohesion: 0.16
Nodes (12): { chromium }, FATAL, FLAGS, iceSoak(), perf(), report, require, shotOf() (+4 more)

### Community 52 - "initNet"
Cohesion: 0.20
Nodes (11): downedTick(), initNet(), listing(), lobbyHosts(), relTo(), resolveNames(), respawnNow(), respawnSelf() (+3 more)

### Community 53 - "Animation Baking"
Cohesion: 0.15
Nodes (13): KEEP, [knightPath, skelPath], load(), MAP, out, poseAt(), qmul(), qnorm() (+5 more)

### Community 54 - "genMelody"
Cohesion: 0.18
Nodes (10): chance(), distCurve(), genMelody(), limiterCurve(), makeGraph(), g, makeIR(), nearest() (+2 more)

### Community 55 - "test-saves.mjs"
Cohesion: 0.08
Nodes (29): beats, World-state: the Call, the Stair, the Keels, the Throat, the Tiers, the Name (Το Κάλεσμα, η Σκάλα, οι Καρίνες, ο Λαιμός, οι Βαθμίδες, το Όνομα), CLEAR, CODE_RE, coded(), keptCode(), local(), normCode() (+21 more)

### Community 56 - "damage"
Cohesion: 0.12
Nodes (27): A1. Slag drips fall on Karthax's platform, statues, ghost pools and in the Hall of Moulds, A2. Elite affixes fire from a clinging Ember Tick or an airborne Ashwing, A4. Dash hits reach wider than their drawn telegraphs, A. Bugs (all from the diagnosis), C. The Forge's Breath (11-31% of the excess, nearly all of the Forge's own), F. Not changed, on purpose, G. Expected numbers afterwards, H. Verification (fast) (+19 more)

### Community 57 - "farlight"
Cohesion: 0.06
Nodes (54): Others, `src/gfx/fx.js` (mine): ambients `coast`, `coastFrozen` (diamond dust, no sea smoke), `farlight`, `blizzard`;, `src/world/atmos.js` (mine): `coast`, `coastCine`, `coastFrozen`, `coastAurora`, `farlight`, `farlightFight`,, `src/world/sea.js` (mine; B2a's file, changed in this run), `tools/scenario.mjs` (mine: the two appended scenarios), What I built, Lead decisions, Story (+46 more)

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
Cohesion: 0.10
Nodes (16): Bounds (so no visitor can fill the 500 MB free database), Identity and the save code, The web build (Supabase), What the owner or lead must run, fatalAll(), fatalNow(), watchFatal(), A4 (+8 more)

### Community 64 - "Playwright Scripts"
Cohesion: 0.20
Nodes (7): { chromium }, logs, require, steps, { chromium }, logs, require

### Community 65 - "kits.js"
Cohesion: 0.20
Nodes (11): ../assets/dungeon.glb?url, ../assets/grave.glb?url, ../assets/town.glb?url, KIT, KIT_SCALE, KITMAT, loading, loadKit() (+3 more)

### Community 68 - "angleDiff"
Cohesion: 0.20
Nodes (33): bottom (37) Ο Πάτος των Πυλών / The Bottom of the Gates, bottom (37) Ο Πάτος των Πυλών / The Bottom of the Gates, premise, angleDiff(), fbm(), genHalls(), genPass(), bandCells() (+25 more)

### Community 69 - "inZone"
Cohesion: 0.10
Nodes (35): tower (the bot was wrong, and the game had one bug in two places), amberLob(), brineSpit(), coilTick(), deadLanterns(), dropCoil(), dropLightIt(), dropWrap() (+27 more)

### Community 70 - "Stage Act Script"
Cohesion: 0.25
Nodes (7): all, DONE, FIND, LANES, LENS, meta, TODO

### Community 71 - "5. Writing style"
Cohesion: 0.09
Nodes (21): 0. The ten things that matter most, 1.1 The intro (intro.1-5), the only "official history", 1.2 The Breaking (a thousand years ago, on the Field of Ash), 1.3 The peoples, 1.4 The shards, their keepers and their wishes (all now unmade), 1.5 The beacons (φρυκτωρίες), 1.6 The Wayfarers (the rules the act set), 1.7 Timeline (+13 more)

### Community 72 - "hostTick"
Cohesion: 0.14
Nodes (19): iceDigest(), dropRemote(), ended(), guestTick(), hostGame(), hostPresence(), hostTick(), leaveGame() (+11 more)

### Community 73 - "Look Polish"
Cohesion: 0.50
Nodes (3): ISSUES, meta, rounds

### Community 75 - "Act IV: The Ashen Forge"
Cohesion: 0.06
Nodes (35): Act IV: The Ashen Forge, ashFallen Πεσμένος της Τέφρας (και Τοξότης της Τέφρας) / Ash-Fallen (and Ash-Fallen Bowman) (new=False), ashfield (22) Το Πεδίο της Τέφρας / The Field of Ash, ashsmith Τεφρομάστορας / Ashsmith (new=True), ashwing Τεφρόφτερος / Ashwing (new=True), Asset audit, beats, Blessings (+27 more)

### Community 76 - "skills.js"
Cohesion: 0.15
Nodes (31): Combat (owned by combat), E. The Field of Ash shields (1-24% of the excess; the Ranger), Porting onto the Act V branch (`claude/sleepy-tesla-4030vd`), shakeOff(), variantOf(), arcHit(), attackSpeed(), basicAttack() (+23 more)

### Community 77 - "ring"
Cohesion: 0.10
Nodes (52): Stubbed or left for stage C, The Cracking Ice (Ο Πάγος που Ραγίζει): the coast's shelves and Skerry Bay, every thin field on the Farthest Light, What Is Not Lit Is Forgotten (Ό,τι δεν Φωτίζεται Ξεχνιέται): every Act VI zone, The Ice Overhead (Ο Πάγος από Πάνω): the Keels, the Village square, the Hearth's east and west thirds, every `L.vault` patch, The game's hooks (for whoever changes these files), bigTele(), blackWave(), bodySlam() (+44 more)

### Community 78 - "Skotos: the difficulty curve as formulas, Acts I to IV"
Cohesion: 0.09
Nodes (22): 1. Experience and the hero's level, 2. How a monster's level is chosen, 3. The hero's power, 4. Monster power, 5.1 Each zone, each class, Warden and Wanderer, 5.2 Content only: the same hero against every zone, 5.3 Each boss, each class, Warden and Wanderer, 5.4 Act over act (each zone or boss over the one before it) (+14 more)

### Community 79 - "t"
Cohesion: 0.11
Nodes (47): tx(), backups(), backupsGone(), lang(), t(), canPlay(), joinGame(), party() (+39 more)

### Community 80 - "coop.mjs"
Cohesion: 0.12
Nodes (18): { chromium }, conn(), ev(), FATAL, hostPos(), ok(), on(), onConnection() (+10 more)

### Community 81 - "cold.js"
Cohesion: 0.26
Nodes (18): src/game/cold.js (new, ~150 lines), The Cold (cold.js, systems), The Cold (Ψύχος), carried over, coldAdd(), coldMul(), coldNoRegen(), coldZone(), frostbite() (+10 more)

### Community 82 - "check-act3.mjs"
Cohesion: 0.18
Nodes (11): add(), bad(), fails, GROUNDED, HARD, N4, NAMED, odd() (+3 more)

### Community 83 - "Porting the Act IV difficulty fix onto Act V (branch claude/sleepy-tesla-4030vd)"
Cohesion: 0.25
Nodes (7): 1. What applied cleanly, 3. Six difficulties («Σκότος», index 5), 5. Things the port does to Act V without code changes (for the Act V owner to know), 6. Unsure / left for the Act V owner, 7. Runtime check (private no-HMR server, port 5287, one browser at a time, stopped after), 8. Verification pass (second agent; files in `verifyport/`), Porting the Act IV difficulty fix onto Act V (branch claude/sleepy-tesla-4030vd)

### Community 84 - "Skotos Act V: code contract"
Cohesion: 0.22
Nodes (8): Creatures (group `act5`), Expected assets, File ownership (edit only your own files in your stage), People (set `frost`), Skotos Act V: code contract, Stage A outcome (lead decisions, 10 October), Stages and gates, length()

### Community 85 - "Skotos, Act IV: the mechanics audit"
Cohesion: 0.17
Nodes (11): 10. Fire arrows burn where they hit her (side effect), 11. Ashsmiths and the Hall of Moulds (design hot-spot), 12. Phone readability and control (qualitative), 1. Karthax: what each phase does (design numbers), 4. BUG: affixes fire from a tick on her back and from an Ashwing in the sky, 6. Ivar's Dark: the light is smaller than the distance he keeps (design numbers), 8. Dash hits reach past their telegraphs (readability bug, shared code), 9. Ember Ticks (design rule) (+3 more)

### Community 86 - "textures.js"
Cohesion: 0.15
Nodes (16): hash2(), noise2(), cache, canvas(), finish(), hashP(), MAKERS, masonry() (+8 more)

### Community 87 - "S2 (story lane): HUD, panels, overlay, audio, difficulty texts"
Cohesion: 0.12
Nodes (15): audio.js, Close, How it was tested, hud.js, Open problems, overlay.js / style.css, panels.js, Progress notes (as it went) (+7 more)

### Community 88 - "The causes, ranked"
Cohesion: 0.13
Nodes (14): 1. Karthax: the fight's numbers and structure (design/tuning). 44-70% of the excess, 2. The Forge's Breath (tuning/design). 11-31% of the excess, and nearly all of the Forge's, 3. Ivar (design). 9-23% of the excess, a local bump rather than the cliff, 4. The Field of Ash (design/readability). 1-24% of the excess, mostly in walked runs, 5. The level drift (levelling). A slope present in every act, small here, 6. Act III is the trough (design of the curve). Inflates the IV/III ratio by about ×1.8, 7. The bugs (bug). Under 5% of the measured damage, but bad for feel and retries, 8. Phone readability (readability). Not measured, adds on top of #1 and #2 (+6 more)

### Community 89 - "three"
Cohesion: 0.06
Nodes (26): dependencies, @supabase/supabase-js, three, devDependencies, @gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions, meshoptimizer (+18 more)

### Community 90 - "Act V assets as built: the stage A verification"
Cohesion: 0.18
Nodes (10): Act V assets as built: the stage A verification, Changes in this pass, Checks by asset, Creatures (`?cview`, numbers from the new `&audit` mode), How to repeat, Outcome, People (`?viewer`, and the creature viewer's new `&folk=` in the artifact), Props and layers (+2 more)

### Community 91 - "Integrate (stage C, integrator)"
Cohesion: 0.14
Nodes (13): Bugs found and fixed at their root (this run), Difficulty: Act V on the fixed curve, Fourth run (02:36, after a restart; the lead committed everything as b57ca18), Integrate (stage C, integrator), Joins to do (from the reports), Open, for others, Progress notes (as it goes; a restart resumes from here), Second run (21:32, after the lead's commits ef5d02b (my joins and scenarios) and c388c3c (the Act IV fix ported)) (+5 more)

### Community 92 - "Shared names"
Cohesion: 0.20
Nodes (9): Built assets (details in `scratchpad/act3-assets.json`; a parallel workflow is polishing them, but names and clips stay), File ownership (edit only your own files), Lead decisions (override the plan), Map (`src/world/map.js`, owned by world), Shared names, Skotos Act III: code contract, The level object L from gen3.js, Visuals (`src/world/build.js`, owned by world) (+1 more)

### Community 93 - "rr"
Cohesion: 0.16
Nodes (15): blood(), decal(), explosion0(), flash(), flash0(), freezeCrystals0(), glowBurst0(), hitFx() (+7 more)

### Community 94 - "decal0"
Cohesion: 0.22
Nodes (6): clearFX(), clearPrints(), decal0(), decalTexture(), ring0(), Trail

### Community 95 - "buildLevel"
Cohesion: 0.08
Nodes (31): 1.3 Build and visuals (`world/build.js`), 3.10 Swimming, 3.12 Walking on non-zero ground (0.5-1 d, only if the design wants real slopes on ice shelves), 3.1 Sea / water surface and shoreline (2-3 d), 3.4 Ice floes, 3.5 Aurora sky (1-1.5 d), 3.6 Falling snow (0-0.5 d), 3.7 Fog banks (0.5-1 d) (+23 more)

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
Cohesion: 0.05
Nodes (53): 1.12 Saves and migration, 1.13 HUD and UI, 1.14 Audio (`audio/audio.js`, all procedural WebAudio, no files), 1.15 Echoes (boss refights), 1.16 Credits, 1.17 Text (`src/i18n/text.js`, Greek first), 1.18 Debug views, 1.19 Scenarios and layout checks (+45 more)

### Community 101 - "C2: the enemies (combat, stage C)"
Cohesion: 0.20
Nodes (9): C2: the enemies (combat, stage C), Differences from the design (code is the truth; written down), How I tested it, Open problems, Progress notes, Requests for the story lane (not my files), src/game/data.js, src/game/projectiles.js, src/game/skills.js, src/i18n/text.js (+1 more)

### Community 102 - "Gate G3 (stage B, Foundation): results and fixes"
Cohesion: 0.20
Nodes (9): Artifact, Fixes (gate keeper; all in stage-B files), Gate G3 (stage B, Foundation): results and fixes, Left for later (not gate failures; for C or the review), Perf (perf5, final code, perf5b/perf5.txt), Scenarios (scen/summary.txt; one at a time, BASE :5341), Servers, The walk (shots/, phone q1 unless named d*) (+1 more)

### Community 103 - "Act IV fix: changes (base 7eded86, worktree pub/skotos; line numbers are the new file's)"
Cohesion: 0.22
Nodes (8): A. Bugs, Act IV fix: changes (base 7eded86, worktree pub/skotos; line numbers are the new file's), B. Karthax, C. The Forge's Breath, D. Ivar, E. The Field's shields, Notes, Tools

### Community 104 - "live-web.mjs"
Cohesion: 0.09
Nodes (25): { chromium }, click(), dist, env, ev(), FATAL, fps(), js (+17 more)

### Community 105 - "What I built"
Cohesion: 0.15
Nodes (14): B1b: runtime grids, the tide and the ice (world, stage B), Changes in files I do not own, How I tested it (scratch paths under scratchpad/act5/b/b1b/), Open problems, Stubbed or left for stage C, What I built, Findings, Left as is (noted, not in the findings) (+6 more)

### Community 106 - "Act V release fixes (the last problems before Act V goes live)"
Cohesion: 0.22
Nodes (8): 1. Frame time at the coast (perf5), 2. The Act V checkpoint after Continue (cp5), 3. Flaky scenarios, 4. Errors the tests could not see (#fatal), Act V release fixes (the last problems before Act V goes live), Files, holes (the test was wrong), Progress

### Community 107 - "gen4.js"
Cohesion: 0.21
Nodes (25): The level object L (gen5.js), Synthesis: base, grafts and fixes, bandCells(), C4, cellAt(), chestSpot(), clearLine(), craneSamples() (+17 more)

### Community 108 - "Πράξη V: Η Παγωμένη Ακτή, σε μία σελίδα"
Cohesion: 0.25
Nodes (7): Η ιστορία, Οι δύο περιοχές, Οι εχθροί και τα αφεντικά, Οι τρεις μηχανισμοί, Πράξη V: Η Παγωμένη Ακτή, σε μία σελίδα, Τι θα δείχνει καινούργιο, Τι χρειάζεται τη δική σου απόφαση

### Community 109 - "C3: the two bosses, the cameo poses, blessings and legendaries (combat, stage C)"
Cohesion: 0.25
Nodes (7): C3: the two bosses, the cameo poses, blessings and legendaries (combat, stage C), Difficulty (the owner's note: Act IV jumped; Act V must not), How it was tested, Open problems, Progress log (stamps before 12:10 were guessed and ran ahead of the clock), Requests for the other lanes, Stubs

### Community 110 - "player.js"
Cohesion: 0.17
Nodes (14): Enemies, hullLouse Σκαροψείρα / Hull-louse (new=True), iceSinger Ψάλτρια του Πάγου / Ice Singer (new=True), reefback Ξερόραχος / Reefback (new=True), rimeBear Πάγαρκτος / Rime Bear (new=False), skua Ληστόγλαρος / Skua (new=True), The protocol, takeEvents() (+6 more)

### Community 111 - "Σκότος"
Cohesion: 0.25
Nodes (7): Άδειες, Δομή, Εκτέλεση, Σκότος, Τι θα ανέβαζε κι άλλο το επίπεδο, Τι υπάρχει σε αυτή την έκδοση, Χειρισμός

### Community 112 - "B1a: plumbing and generation (world, stage B)"
Cohesion: 0.25
Nodes (8): B1a: plumbing and generation (world, stage B), Changes in files I do not own, How I tested it, Open problems, Stubbed or left for stage C (or B1b), What I built, crew(), creatureCount()

### Community 113 - "S1 (story lane): the story and its text"
Cohesion: 0.29
Nodes (6): Close, How it was tested (private no-HMR server :5381; one headless browser at a time), Requests for the combat lane (story listens/emits; stubs where noted), S1 (story lane): the story and its text, Stubs / open problems, What was built

### Community 114 - "clearFX"
Cohesion: 0.33
Nodes (3): initFX(), leafTexture(), Pool

### Community 115 - "B2a: sea.js (the water, the ice, the aurora, the beams) — report"
Cohesion: 0.33
Nodes (5): B2a: sea.js (the water, the ice, the aurora, the beams) — report, Changes in files I do not own, How I tested it, Open problems, Requests to other owners

### Community 116 - "Co-op review fixes (progress notes)"
Cohesion: 0.14
Nodes (13): Co-op review fixes (progress notes), Full test after the four passes — started, Full test — results, Pass "budget" (L3-01..L3-08) — started, Pass "budget" — one line per finding, Pass "safety" (L1-01..L1-10, L2-01, L2-09) — started, Pass "safety" — one line per finding, Pass "skeptic round 2" (L1-02, L1-05, L2-05, L3-04, L4-1, L4-2, L4-5, L1-07, L1-08, L2-04, L2-12, L3-03, L4-10) — started (+5 more)

### Community 117 - "addTele"
Cohesion: 0.47
Nodes (6): Touch and phone readability (rules the act keeps), addTele(), teleCircle0(), teleCone0(), teleLine0(), teleMat()

### Community 118 - "Act VI: Beneath the Ice (proposal: systems-first)"
Cohesion: 0.07
Nodes (26): Act VI: Beneath the Ice (proposal: systems-first), Asset audit, Assets, Blessings, Bosses, charybdis Χάρυβδη, το Στόμα της Θάλασσας / Charybdis, the Mouth of the Sea, Creatures (group `act6`, tools/creatures/act6/*.mjs, `ACT_FILES.act6`), ending (+18 more)

### Community 119 - "Stage C fixer: the three reviewers' 12 findings"
Cohesion: 0.50
Nodes (3): Findings, Re-runs on the fixed tree (private no-HMR :5461, one browser at a time; c/fix/sc, c/fix/queue.log), Stage C fixer: the three reviewers' 12 findings

### Community 120 - "The code graph (graphify)"
Cohesion: 0.50
Nodes (3): Keep it fresh, The code graph (graphify), Use

### Community 121 - "lightAt"
Cohesion: 0.50
Nodes (9): 2. The conflicts (9 hunks in 5 files) and how each was resolved, 4. Act V code changed to fit the fix, Porting onto the Act V branch (`/home/user/abyssos`, branch claude/sleepy-tesla-4030vd), shroudLook(), actHit(), breakGuard(), lampAt(), lightAt() (+1 more)

### Community 124 - "glow"
Cohesion: 0.33
Nodes (5): B2b: props, atmospheres, FX and the perf gate (sea, stage B) — report, Changes in files I do not own, How I tested it, Open problems and requests, Progress notes (as written during the run)

### Community 125 - "f"
Cohesion: 0.33
Nodes (3): ACT, out, rows

### Community 128 - "Act VI: Beneath the Ice (proposal, story-first)"
Cohesion: 0.09
Nodes (22): Act VI: Beneath the Ice (proposal, story-first), Asset audit, Assets, Blessings, Bosses, Creatures (group `act6`, tools/creatures/act6/*.mjs, `ACT_FILES.act6`), Echoes and post-game, ending (+14 more)

### Community 129 - "sendSnap"
Cohesion: 0.33
Nodes (10): actorEntry(), bits(), clipIdx(), guestPresence(), heroState(), packFx(), pickActors(), q() (+2 more)

### Community 130 - "../../src/game/cloud.js?held"
Cohesion: 0.22
Nodes (20): ../../src/game/cloud.js?held, changed(), claimCode(), CLOUD, codeKept(), due(), flush(), initCloud() (+12 more)

### Community 131 - "nv"
Cohesion: 0.15
Nodes (14): Music, Audio (story lane, D; the names other lanes call), Music, crackedBell(), forgetting(), jit(), keeperMotif(), metal() (+6 more)

### Community 132 - "refreezeAt"
Cohesion: 0.36
Nodes (10): Act V, What the host does for a guest (coop.js `guestEvent`), cellsIn(), crackCells(), crackCone(), crackLine(), crackRing(), refreezeAt() (+2 more)

### Community 133 - "Progression: Mastery, skill variants, later skills and the loadout"
Cohesion: 0.25
Nodes (7): Balance before and after, Mastery tracks, Numbers, Points and Mastery levels, Progression: Mastery, skill variants, later skills and the loadout, The later skills and variants at the dummies, What the player sees

### Community 134 - "live-supabase.mjs"
Cohesion: 0.09
Nodes (33): What the lead declares at publish, How to work, Open items, Skotos: handoff notes, State, Where everything stopped (24 October), Where everything stopped (27 October), Where things are (+25 more)

### Community 135 - "Progression: the artifact files changed against version 12"
Cohesion: 0.33
Nodes (5): Added (upload), Checks, index.html, Progression: the artifact files changed against version 12, Removed (set to null)

### Community 136 - "test-sync.mjs"
Cohesion: 0.13
Nodes (11): artifactDb(), clone(), device(), climb(), inTab(), mem, setup(), sync() (+3 more)

### Community 137 - "floor"
Cohesion: 0.17
Nodes (20): beats, Black-Water Memories (Μνήμες από μαύρο νερό): the four Drowned Lights, Difficulty: what each level does to Act VI, Engine work Act VI needs, floor (37) Ο Πάτος / The Nethermost, Forgetting (Η Λήθη): both zones and both fights, How the hero gets there from Whitecliff, Mechanics (+12 more)

### Community 138 - "Progression work: progress notes (for a restart)"
Cohesion: 0.40
Nodes (4): Design (decided), Done, Next, Progression work: progress notes (for a restart)

### Community 139 - "SupabaseTransport"
Cohesion: 0.10
Nodes (18): Before and after, Checked, Co-op on the free plan: the net diet (27 October 2026), Feel: what changed, and how it was checked, For the owner, What changed (`src/net/transport.js`, the economy; `src/net/coop.js`), What the monthly 2 million buys, Co-op: what the lead does at release (+10 more)

### Community 140 - "stillshots.mjs"
Cohesion: 0.16
Nodes (17): bench(), chunk(), CINE, COAST, CRC, crc32(), decodePNG(), DESK (+9 more)

### Community 141 - "test-transport.mjs"
Cohesion: 0.29
Nodes (18): fakeSupabase(), econTest(), leaveTest(), lobbyTest(), localTest(), ok(), oldWireTest(), bus (+10 more)

### Community 142 - "cloudsync.js"
Cohesion: 0.22
Nodes (17): cleanMeta(), dirty(), forAccount(), forked(), further(), HERO_ID, heroSum(), MAX_AWAY (+9 more)

### Community 143 - "map.js"
Cohesion: 0.50
Nodes (3): DX, DZ, WQ

### Community 144 - "mkplan.mjs"
Cohesion: 0.50
Nodes (3): FIGHTS, out, lvl()

### Community 147 - "sap.js"
Cohesion: 0.18
Nodes (16): rand, add(), addSapPool0(), addSapRing0(), clearSap(), dripFall(), drips, drop() (+8 more)

### Community 148 - "light5"
Cohesion: 0.20
Nodes (17): freezeCells(), getBeam(), act5Zone(), endSeal(), holeLamps(), light5(), marker5(), put() (+9 more)

### Community 149 - ".room"
Cohesion: 0.20
Nodes (9): Byte budget (measured), err(), Hub, later(), makePage(), page, reject(), endsTest() (+1 more)

### Community 150 - "screens.js"
Cohesion: 0.22
Nodes (13): CLASSES, DIFFS, newHero(), ICON, SLOT_ICON, hideScreen(), mainMenu(), screen() (+5 more)

### Community 151 - "cloudart.js"
Cohesion: 0.21
Nodes (12): claude.ai (the artifact), Cloud saves, Not verified, Tests, The capabilities to publish (the lead), artifactBackend(), chainOf(), CODE (+4 more)

### Community 152 - "5. Writing style"
Cohesion: 0.17
Nodes (13): 5.10 Names, 5.11 Key conventions (for the contract), 5.1 Voice, 5.2 Measured line lengths (text.js), 5.3 Dialogue, 5.4 Quest lines (q.N), 5.5 Toasts and event lines, 5.6 Act panels and the next-act line (+5 more)

### Community 153 - "Act VI: Beneath the Ice"
Cohesion: 0.17
Nodes (11): Act VI: Beneath the Ice, Asset audit, Blessings, Bosses, Decisions, Echoes and post-game, ketos Το Κήτος / The Ketos, Production plan: stages and gates (+3 more)

### Community 154 - "Skotos co-op"
Cohesion: 0.17
Nodes (11): How it plays, Inviting a friend on claude.ai, Quest credit (the decision), Skotos co-op, Tests, The shipped scenarios, The transports, Byte budget (+3 more)

### Community 155 - "Act VI: Beneath the Ice (proposal: production-first)"
Cohesion: 0.18
Nodes (10): Act VI: Beneath the Ice (proposal: production-first), Asset audit, Blessings, Bosses, Echoes and post-game, gleaner Αποφάγισσα, η Μάνα των Ψειρών / The Gleaner, Mother of Lice, Production plan: stages and gates, Risks (+2 more)

### Community 156 - "plunge"
Cohesion: 0.27
Nodes (11): ending, addFloes(), airborne(), batch(), dropFloes(), fall(), fx(), netIce() (+3 more)

### Community 157 - "weep"
Cohesion: 0.29
Nodes (10): Story (owned by story), Risks, What this design deliberately does not do, cellOf(), flood(), heart(), near(), weep() (+2 more)

### Community 158 - "tickLight"
Cohesion: 0.47
Nodes (10): src/game/light.js, Light: the Carried Fire, true and false light (light.js, systems; look's hooks), drink(), ember(), footIce(), heroLightR(), lanterns(), lightKind() (+2 more)

### Community 159 - "Enemies"
Cohesion: 0.20
Nodes (10): brooder Κλώσσα / Brooder (new=True), caller Ανώνυμη Καλούσα / Nameless Caller (new=True), Enemies, falselight Δολοφέγγης / Falselight (new=True), hullLouse Σκαροψείρα / Hull-louse (new=False), icemaw Παγολόχος / Icemaw (new=False), ketling Κητόπουλο / Ketling (boss add), lampman Πνιγμένος Φαροφύλακας / Drowned Lampman (new=True) (+2 more)

### Community 160 - "drown"
Cohesion: 0.22
Nodes (10): Co-op beneath the ice (up to four), Difficulty: what each level does to Act VI, Echoes and post-game, Engine work Act VI needs, Mechanics, Progression beneath the ice (Mastery, variants, later skills), The Tiers (Οι Βαθμίδες): the Shadow Gates' machinery as a place, The vulnerability rule (Act V's, with Act VI's statuses) (+2 more)

### Community 161 - "relayOf"
Cohesion: 0.24
Nodes (10): The review's fixes (27 October), heroAvatar(), refreshHeroLook(), addRemote(), lookHero(), nameOf(), own(), relayOf() (+2 more)

### Community 162 - "3. Unresolved threads Act V can pay off without retconning"
Cohesion: 0.22
Nodes (9): 3.A The fourth fire and whoever lit it, 3.B The sea and the coast, 3.C "North": where everyone goes in the end, 3.D Darkness, the Skotos, and light as protection, 3.E Cold and ice (a motif that has meant release until now), 3.F The forgotten, and a fourth people, 3.G People and promises left open, 3.H Lines that read wrongly once Act V exists (update, don't contradict) (+1 more)

### Community 163 - "The coast's frame at q1: steps 1-3 of the plan, measured (24 October)"
Cohesion: 0.22
Nodes (8): 1. Numbers, 2. What each step changed, 3. Why exact gates save nothing here, 4. The shots, 5. Derivative audit, 6. The scenarios (steps 1-3 applied), 7. Files, The coast's frame at q1: steps 1-3 of the plan, measured (24 October)

### Community 164 - "Mechanics"
Cohesion: 0.22
Nodes (9): Black-ice Memories (Μνήμες από μαύρο πάγο): the First's three hearths, Difficulty: what each level does to Act VI, Mechanics, The Black Water (Το Μαύρο Νερό): the Hollows, the Old Shore, the Heap, the Barrow, the Wood, the Stair, the Hearth, The Carried Fire (Η Φωτιά που Κουβαλάς): both zones and both fights, The Cold (Ψύχος), carried over, The Ice Overhead (Ο Πάγος από Πάνω): the Keels, the Village square, the Hearth's east and west thirds, every `L.vault` patch, The vulnerability rule (Act V's, with Act VI's statuses) (+1 more)

### Community 165 - "Act VI stage 0: the provenance gates of the two downloads"
Cohesion: 0.22
Nodes (8): Act VI stage 0: the provenance gates of the two downloads, Files, How each was checked, Limits of this check, Outcome, The look gates (27 October), The Pistosaur (the Ketos): pass, The Scorpion (the Falselight): pass, no doubt found

### Community 166 - "Mechanics"
Cohesion: 0.22
Nodes (9): Difficulty: what each level does to Act VI, Mechanics, Memories: black ice and black water, Progression beneath the ice (Mastery, variants, later skills), The Carried Fire (Η Φωτιά που Κουβαλάς): both zones and both fights, The Lost (Τα Χαμένα): seven to find (optional), The Names from Above (Τα Ονόματα από Πάνω): the Drained Sea, The vulnerability rule (Act V's, with Act VI's statuses) (+1 more)

### Community 167 - "Co-op"
Cohesion: 0.22
Nodes (8): Balance, Co-op, Saves, Tests, The blow cap (an anti-cheat change), The progression on the Act V line, What every page draws of the others, viewHero()

### Community 168 - "wire"
Cohesion: 0.28
Nodes (9): chunk(), fxFrom(), heldMove(), landsAt(), myKey(), onFloor(), onIce(), replayFx() (+1 more)

### Community 169 - "C1: mechanics and creature plumbing (combat, stage C)"
Cohesion: 0.25
Nodes (7): C1: mechanics and creature plumbing (combat, stage C), How I tested it (c/probe.mjs '<query>' steps.json outPrefix; q0 for function, q1 for looks; story flags in the query), Progress notes, Requests for the story lane (I did not touch these files), Stubbed or left for C2/C3 (my plumbing is ready for them), setBeamLen(), frostImage()

### Community 170 - "Enemies"
Cohesion: 0.25
Nodes (8): Enemies, faded Ξέθωρος / Faded (new=True), falselight Δολοφέγγης / Falselight (new=True), gateFallen Πεσμένος των Πυλών (και Τοξότης των Πυλών) / Gate-Fallen (and Gate-Fallen Bowman) (new=True), hullLouse Σκαροψείρα / Hull-louse (new=False), icemaw Παγολόχος / Icemaw (new=False), ketling Κητόπουλο / Ketling (boss add), sunken Θαλασσόπνικτος / Sunken (new=False)

### Community 171 - "glow"
Cohesion: 0.29
Nodes (7): Measured files, Open problems, The frost set, by scene, The rime pack, by prop, lampbearer Θαλασσόπνικτος Λυχνοφόρος / Sunken Lampbearer (new=True), lampbearer Θαλασσόπνικτος Λυχνοφόρος / Sunken Lampbearer (new=True), glow()

### Community 172 - "Πράξη VI «Κάτω από τον Πάγο»: πέντε αποφάσεις για σένα"
Cohesion: 0.29
Nodes (6): 1. Το τέλος: μένει κάποιος κάτω να φυλάει τη φωτιά της Πρώτης;, 2. Η θράκα του Κάρθαξ στον πάγο, 3. Πόσο σκληρό είναι το σκοτάδι κάτω από τον πάγο, 4. Οι Σκιοπύλες μετά το τέλος, 5. Νέο κομμάτι Μαεστρίας: «Λύχνος», Πράξη VI «Κάτω από τον Πάγο»: πέντε αποφάσεις για σένα

### Community 173 - "Assets"
Cohesion: 0.29
Nodes (7): Assets, Creatures (group `act6`, `ACT_FILES.act6 = ['louse', 'icemaw', 'tentacle', 'skotos', 'strider']`), Ground layers (pack `silt`, d 1024 / n 512), Kenney, Quaternius, Poly Pizza, People (no new set), Props (pack `silt`, tools/pack-silt.mjs, and the shipped `rime`), Totals for the act

### Community 174 - "Enemies"
Cohesion: 0.29
Nodes (7): Enemies, faded Ξέθωρος / Faded (new=True), gateFallen Πεσμένος των Πυλών (και Τοξότης των Πυλών) / Gate-Fallen (and Gate-Fallen Bowman) (new=True), hullLouse Σκαροψείρα / Hull-louse (new=False), icemaw Παγολόχος / Icemaw (new=False), strider Ξυλοπόδαρος / Stiltwalker (new=True), sunken Θαλασσόπνικτος / Sunken (new=False)

### Community 175 - "Enemies"
Cohesion: 0.29
Nodes (7): Enemies, forgetter Λησμονητής / Forgetter (new=True), lightdrinker Φωτοπότης / Lightdrinker (new=True), nameless Ανώνυμος / Nameless (new=True), Reused from Act V (new=False), rimeHanger Παγοκρέμαστος / Rime-hanger (new=True), siphon Σίφωνας / Siphon (new=True)

### Community 176 - "Assets"
Cohesion: 0.29
Nodes (7): Assets, Creatures (group `act6`, `ACT_FILES.act6 = ['louse', 'icemaw', 'tentacle', 'skotos', 'ketos', 'falselight']`), Ground layers (pack `silt`, d 1024 / n 512), Kenney, Quaternius, Poly Pizza, People (no new set), Props (pack `silt`, tools/pack-silt.mjs, and the shipped `rime`), Totals for the act

### Community 177 - "Co-op on Supabase (the public web build, later the Android app)"
Cohesion: 0.29
Nodes (6): Co-op on Supabase (the public web build, later the Android app), Costs and limits, Setting up a project, What is not done, and what is not verified, abortSignal(), channel()

### Community 178 - "lerp"
Cohesion: 0.29
Nodes (7): lerp(), sparkLook(), bolt(), bolt0(), decalBed(), sstep(), underWater()

### Community 179 - "Plan: bring the Frozen Coast's perf5 frame under 1.15 × the Field at q1"
Cohesion: 0.33
Nodes (5): 1. What the code says, and corrections to the brief, 3. Not worth it, and why, 4. How to verify, Plan: bring the Frozen Coast's perf5 frame under 1.15 × the Field at q1, The coast's frame at q1: a plan (static study, 24 October)

### Community 181 - "atmos.js"
Cohesion: 0.40
Nodes (5): ATMOS, _ca, _cb, heatAtmos(), mixHex()

### Community 182 - "Story"
Cohesion: 0.40
Nodes (5): npcs, premise, Story, twist, villain

### Community 183 - "Cloud save: progress notes (session claude/skotos-cloudsave)"
Cohesion: 0.40
Nodes (4): Cloud save: progress notes (session claude/skotos-cloudsave), Design (decided), Done (27 October), Second review fixed (27 October)

### Community 184 - "createClient"
Cohesion: 0.40
Nodes (3): @supabase/supabase-js, createClient(), SUPABASE

### Community 185 - "updateFX"
Cohesion: 0.40
Nodes (5): ambient(), emit(), emitAt(), tickPrints(), updateFX()

### Community 186 - ".join"
Cohesion: 0.40
Nodes (3): boxOf(), T, T

### Community 187 - "Story"
Cohesion: 0.50
Nodes (4): npcs, Story, twist, villain

### Community 188 - "Net diet: progress notes (branch claude/skotos-net-diet)"
Cohesion: 0.50
Nodes (3): Design (decided), Net diet: progress notes (branch claude/skotos-net-diet), Steps

## Knowledge Gaps
- **3 isolated node(s):** `../assets/dungeon.glb?url`, `../assets/grave.glb?url`, `../assets/town.glb?url`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1352 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `three` connect `three` to `ai.js`, `world.js`, `skillsx.js`, `Prop Mesh Builders`, `Rime Asset Packing`, `build.js`, `Visual Effects & Decals`, `models.js`, `Act Actor Spawning`, `boot.js`, `Ice Floes`, `light.js`, `Viewer Tools`, `sap.js`, `Cinder Asset Packing`, `Act Transitions & Cutscenes`, `combat.js`, `Sea & Sky Rendering`, `Node Build Utilities`, `Wood Asset Packing`, `Environment Loading`, `people.js`, `Animation Packing`, `Animation System`, `projectiles.js`, `pickups.js`, `atmos.js`, `kits.js`, `skills.js`, `t`, `textures.js`, `player.js`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `t()` (e.g. with `Visuals` and `The Black Water (tide.js, systems)`) actually correct?**
  _`t()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../assets/dungeon.glb?url`, `../assets/grave.glb?url`, `../assets/town.glb?url` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ai.js` be split into smaller, more focused modules?**
  _Cohesion score 0.030856149500217298 - nodes in this community are weakly interconnected._
- **Why does `clamp()` connect `Sea & Sky Rendering` to `ai.js`, `world.js`, `skillsx.js`, `sendSnap`, `refreezeAt`, `killTele`, `build.js`, `Visual Effects & Decals`, `Prop Mesh Builders`, `Act Actor Spawning`, `boot.js`, `angleTo`, `Ice Floes`, `light.js`, `Viewer Tools`, `../../src/game/save.js?tab=B`, `light5`, `Combat Behaviors`, `Act Transitions & Cutscenes`, `combat.js`, `Engine work Act V needs`, `gen5.js`, `data.js`, `tickLight`, `coop.js`, `now`, `relayOf`, `people.js`, `tide.js`, `wire`, `Animation System`, `replayOne`, `pickups.js`, `lerp`, `updateFX`, `Creature Animation`, `angleDiff`, `inZone`, `hostTick`, `skills.js`, `cold.js`, `textures.js`, `buildLevel`, `1. Touchpoint checklist: everything an act wires`, `What I built`, `gen4.js`, `player.js`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `world.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0474129045557617 - nodes in this community are weakly interconnected._
- **Why does `../../src/game/cloud.js?held` connect `../../src/game/cloud.js?held` to `test-sync.mjs`, `boot.js`, `Inventory & Trading`, `cloudsync.js`, `t`, `../../src/game/save.js?tab=B`, `test-saves.mjs`, `Act Transitions & Cutscenes`, `cloudart.js`, `data.js`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._