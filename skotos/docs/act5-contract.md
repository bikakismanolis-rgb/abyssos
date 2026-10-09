# Skotos Act V: code contract

The design is `docs/act5-design.md`; the briefs it was built from are in `docs/act5-briefs/` (canon.md, engine.md, assets.md/json). This file fixes the owner's decisions, the lead decisions, the build stages and their gates, the shared names, file ownership and the expected assets. Where this file and the design disagree, this file wins. Where the design and the shipped code disagree, the code is the truth: follow the code, and write the difference down in your report.

Repo: `/home/user/abyssos/skotos`. The repository root (Abyssos, everything outside `skotos/`) is a different game: never read or touch it. Dev server: `http://localhost:5199` (shared by everyone; if it does not answer, start it detached with `cd /home/user/abyssos/skotos && (setsid nohup npx vite --port 5199 --strictPort > /tmp/claude-0/vite.log 2>&1 &)`; never kill it). For a private server use another port and `BASE=http://localhost:<port>/` with the tools. Build check: `npx vite build --logLevel error`. Artifact check: `npm run build:artifact` (every file in `artifact/assets/` under 16 MB). Scenarios: `node tools/scenario.mjs <name> <outdir>`.

## The owner's decisions (9 October 2026)

1. **Build the whole base design** as written: both zones (coast read two ways: tidal, then the frozen bay), 7 enemy entries (8 kinds), both bosses, the three mechanics, the world-state chain, the four coast Name-stones, three blessings, five themes, both echoes and the two boss legendaries.
2. **Difficulties, all three in:**
   - **Unlocks from any act** (design, Difficulty): `diffUnlocked` reads every `h['act' + n]`; pick.locked reworded.
   - **A fresh coast per difficulty:** the Act V seeds are keyed by difficulty (`coast@<diff>`, `farlight@<diff>`); layout only, the hero's story state is one for all difficulties. `diffChanged` (boot.js:172) disposes the zones it drops (`disposeZone`) instead of deleting them.
   - **The sixth difficulty «Σκότος» / "Skotos"** is in (it was stretch): `{ id: 'skotos', hp: 11, dmg: 5.4, xp: 6.5, gold: 5.4, loot: 4.6, elite: 2.1, leg: 4.6, color: '#4a5aa0', unlock: 'act5:ash' }`, diff.skotos «Σκότος» / "Skotos", diff.skotos.d «Εδώ ξεχνιούνται και οι ήρωες.» / "Here even heroes are forgotten." It unlocks when Act V is finished on Ash. The design's difficulty table already carries its column. Every per-difficulty table in the code (DIFFS consumers, hazard tables, scaling arrays, the waypoints chips, saves with `h.diff` up to 5, anything indexed by difficulty) must accept index 5; old saves are unaffected.
3. **English name of the fourth people: "Saltborn"** (Greek «Αλιγενείς»).
4. **Brokka and Elati come to the Skotos fight** (it was optional): in phase 3, when the keepers walk on with their lamps, Brokka carries Deepstone's fire and Elati the beacon-tree's, and each sets it to the Farthest Light with the keepers. **Lead decision on how:** they are NOT rebuilt into the frost set. They reuse the shipped people sets: Brokka from `folk` (folk.glb), Elati from `grove` (grove.glb), loaded by `farlight` only once the hero has reached q29 (`READY` for farlight gains `['folk', 'grove']` lazily at that point; a first trip already loads them through the Field). Their stand-ins are the boot-loaded people.glb 'smith' and 'ranger'. They are counted in `perf5` and in the memory report. New lines d.brokka.v3+, d.elati.v3+ (with `.r` for the Ranger), short, in the act's voice; they arrive with the keepers, they are not fighters (no hp, no AI beyond walkTo and a pose), and they go home after the act (their home lines change to match).
5. **Still out (stretch):** the coast's full frozen reading, the spring reading with `iceOut`, floes and the boat, the frozen sea's four Name-stones, the two extra legendaries, a Floe Run, ice tiers in the Shadow Gates, orca and gull ambience, the Rime Troll.
6. **Quality bar.** The owner wants to be impressed: graphics, story, movement, gameplay, involvement, replayability. Take the time it needs. Correctness first, then the look.

## Lead decisions

- **Names.** «Πράξη V: Η Παγωμένη Ακτή» / "Act V: The Frozen Coast". Zones `coast` «Η Παγωμένη Ακτή» / "The Frozen Coast" (level 28) and `farlight` «Ο Έσχατος Φάρος» / "The Farthest Light" (level 31). The pack is **`rime`** (`src/assets/rime.glb` + `src/assets/rime/*.webp`), the people set is **`frost`** (`src/assets/frost.glb`, `loadFolk('frost')`), the creature group is **`act5`** (`ACT_FILES.act5`).
- **Canon.** Everything in the design's Story section, plus what the game already says (`src/i18n/text.js`, and `docs/act5-briefs/canon.md`). The hero never speaks: everything the hero "says" is second-person narration. The word «Σκότος» is first said in the rite at the Landing. Isarn and Ivar stay dead.
- **Old saves.** A hero without the new fields reads as the Act IV end state: `h.act5` defaults to −1 (migrate like h.act4), questText clamps at 31, the bare `else` in `actComplete` no longer means Act IV.
- **Stand-ins everywhere.** A missing or failed asset never breaks the game: every STAND_IN chain ends in a boot-loaded or code-built model, and `cast5` covers it in a cold session.
- **Text.** Every new line in Greek and English in `src/i18n/text.js`, Greek first, in the style of the canon brief §5 (short, plain, poetic; quests are imperatives; memories in the present tense). Keep the existing typography of the file.
- **Code.** Match the surrounding code: its density, naming, comment style. No model names in code, comments or commits. Do not reformat files you do not own.
- **Never commit or push.** The lead commits between stages. Never `git checkout`/`reset`/`stash` files: other agents are working in the same tree.
- **Third-party assets.** CC0, CC-BY 4.0 or CC-BY 3.0 only, with clean provenance (no rips, no paid-pack re-uploads, no fan art of other IP), credited in `CREDITS.txt`, `src/ui/credits.js` and the pack's or folder's CREDITS.txt. Sources are downloaded to `/tmp/claude-0/sf/act5` (Sketchfab) and `/tmp/claude-0/ph` (Poly Haven, ambientCG), never into the repo.
- **The memory and frame budget** is the design's: ≤ 9 MB raw and ≤ 110 MB phone GPU for the act, measured, not estimated, before the bosses are built.

## Stages and gates

| stage | who | what | gate to pass before the next stage |
|---|---|---|---|
| A. Assets | asset workflow | downloaders, provenance and look gates, the frost set (first), the rime pack, the act5 creatures, credits | G1: crab and Skotos provenance and look gates passed or replaced; G2: frost set ≤ 25 measured textures; every asset in the viewer with its clips |
| B. Foundation | world (B1), sea (B2) | plumbing, the Field corridor, genlib/gen5, check-act5, GridMap.close, tide.js, ice.js, sea.js and its quality-0 paths, build5 props, atmospheres and FX, world.js wiring | G3: check-act5 and check-act4 (parity) clean over their seed sweeps; `perf5` within the Field of Ash + 15% at quality 1 under mobile emulation; every existing scenario still passes |
| C. Act | combat, story | Cold, beams, lamps, oil; the AIs and traits; the enemies; both bosses; story quests 24-31, text, HUD, panels, audio, difficulties, the cameo; the Act V scenarios | G4: every Act V scenario and every existing scenario passes; the measured memory report is within budget |
| D. Review | review workflow | adversarial review rounds, fixes, the full regression, the strict-CSP artifact check on desktop and mobile, publish | G5: the last review round finds nothing new; the artifact is published to the same URL |

Stages A and B run at the same time. Stage C starts when B's gate passes; it uses the real assets where they exist and the stand-ins where they do not.

## File ownership (edit only your own files in your stage)

| owner | stage | files |
|---|---|---|
| assets | A | `tools/creatures/act5/**` (new), `tools/creatures/act2/folk.mjs` (the `frost` set only), `tools/pack-rime.mjs` (new), `tools/fetch-act5.mjs` (new), `src/assets/frost.glb`, `src/assets/rime.glb`, `src/assets/rime/**`, `src/assets/creatures/{crab,skotos,tentacle,icemaw,louse,skua}.glb`, `src/gfx/creatures.js` (CAST and ACT_FILES entries only), `src/gfx/people.js` (the set entry only), `src/debug/creatureview.js` and the people part of `src/debug/viewer.js`, `CREDITS.txt`, `src/ui/credits.js`, `tools/creatures/README.md` |
| world (B1) | B | `src/world/genlib.js` (new), `src/world/gen4.js` (the corridor and the move to genlib only), `src/world/gen5.js` (new), `src/world/map.js`, `src/game/tide.js` (new), `src/game/ice.js` (new), `src/game/world.js`, `src/game/state.js`, `src/game/boot.js` (plumbing and the migration only), `src/ui/panels.js` (diffUnlocked and the waypoints only), `src/game/data.js` (ZONES-related and DIFFS only), `tools/check-act5.mjs` (new), a parity script under `tools/` |
| sea (B2) | B | `src/world/sea.js` (new), `src/world/build5.js` (new), `src/world/build.js`, `src/world/atmos.js`, `src/gfx/fx.js`, `src/gfx/env.js`, `src/gfx/gfx.js`, `src/gfx/textures.js`, the world part of `src/debug/viewer.js`, `tools/scenario.mjs` (only the new `perf5` and `shallowtele` scenarios, appended) |
| combat | C | `src/game/data.js` (beyond B1's part), `src/game/ai.js`, `src/game/actors.js`, `src/game/combat.js`, `src/game/player.js`, `src/game/projectiles.js`, `src/game/skills.js`, `src/game/stats.js`, `src/game/items.js`, `src/game/light.js`, `src/game/sap.js`, `src/game/cold.js` (new), `src/game/tide.js` and `src/game/ice.js` (gameplay hooks, after B), `src/gfx/models.js`, `src/gfx/creatures.js` (beyond the asset entries), `src/gfx/people.js` (beyond the set entry) |
| story | C | `src/game/story.js`, `src/i18n/text.js`, `src/audio/audio.js`, `src/ui/panels.js`, `src/ui/hud.js`, `src/ui/overlay.js`, `src/ui/screens.js`, `src/ui/style.css`, `src/game/boot.js`, `src/game/state.js`, `src/game/world.js` (presence, npcs, catch-ups; after B), `tools/scenario.mjs` (the Act V story scenarios), `README.md` |

If you need a change in a file you do not own, make the smallest change that unblocks you only when the file's owner is not running in your stage; otherwise write the request in your report and work around it with a stub in your own file.
