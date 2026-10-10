# Skotos: handoff notes

Read this first when picking the project up in a new session.

## Where things are

- Repo `bikakismanolis-rgb/abyssos`, game in `skotos/`, working branch `claude/sleepy-tesla-4030vd` (pull request #2 into the branch of #1). Commit only there.
- The playable build is a private claude.ai artifact: https://claude.ai/artifact/74dKQSTSnJmPAyDHBz4BRP (version 10 at the time of writing). Update it in place (same URL), never publish a new one.
- The owner writes in Greek; answer in Greek. The game text is Greek and English (`src/i18n/text.js`).
- **Act V is being built (paused on 10 October at the owner's request, to keep usage until the plan renews on Tuesday 13 October).** Its plan is `docs/act5-design.md`, its contract `docs/act5-contract.md` (the owner's decisions, the four stages and gates, file ownership, every shared name, and the stage-A outcome), the briefs and the measured asset report in `docs/act5-briefs/`, every stage's reports in `docs/act5-briefs/reports/`, and the workflow scripts of the running stages in `docs/act5-workflows/`. See "Act V: where it stopped" below.
- Design and contracts of earlier acts: `docs/act4-design.md` (the Act IV plan), `docs/act4-contract.md`, `docs/act3-contract.md`. README.md describes every act (in Greek). CREDITS.txt, `src/ui/credits.js` and `src/assets/*/CREDITS.txt` list every third-party asset.

## State

- Acts I-IV are complete. Act IV ("The Ashen Forge") is the finale of the Ash Crown story; quest 23 is the end state. Post-game: the Shadow Gates (endless tiers, from Isarn's planted staff after the finale) and echo refights of the Act III and Act IV bosses.
- Act IV went through a full review (41 confirmed findings, all fixed); every scenario passes.
- Recent fixes worth knowing: models must load textures through `src/gfx/gltf.js` (the artifact host's Content-Security-Policy blocks `blob:` fetches, which made every model white); phones decode large maps at half size and release decoded images after upload (memory); a "How to play" panel (title menu, pause menu, H key, shown once at the first game); the title tap no longer falls through to "Continue".

## How to work

- `cd skotos && npm install` if needed; dev server `npx vite --port 5199 --strictPort`.
- Scenarios (Playwright, headless swiftshader): `node tools/scenario.mjs <name> <outdir>`. Names: Act I `combat, ranger, mage, weaver, lord, ending, title, panels`; Act II `pass, stonewarden, halls, king, ending2, cast2, boons`; Act III `weep, hart, heart, amaranthe, echo, ending3, cast3`; Act IV `ashfield, ivar, forge, karthax, ending4, cast4, echo4`. Run the ones touched by a change, and the whole set before publishing.
- Views: `?auto=<zone>&lvl=N&q=1` jumps into a zone; `?world=<zone>&at=...` world viewer; `?cview&only=...` creature viewer; `?viewer&only=p:<name>` people viewer. `tools/shot.mjs` takes screenshots. `tools/check-act3.mjs` and `tools/check-act4.mjs` check the generated layouts over many seeds.
- Publishing: `npm run build:artifact` writes `skotos/artifact/` (index.html fragment + assets/*.js, every file under 16 MB). Before publishing, serve it with `node tools/csp-server.mjs skotos/artifact <port> "<csp>"` using a strict CSP (`default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self' data:; media-src 'self' data:; worker-src 'self' blob:`) and check in Playwright (desktop and an `isMobile`/`hasTouch` context) that there are no CSP violations and no white models. Then publish `skotos/artifact/index.html` to the artifact URL with a `files` map: upload only the changed hashed files and set the removed ones to null.
- Assets: CC-BY 4.0 or CC0 only, credited everywhere; no rips of commercial games or films (the owner wants a Play Store release). Builders live in `tools/creatures/**` and `tools/pack-*.mjs`; sources are downloaded to `/tmp/claude-0/sf` and `/tmp/claude-0/ph` (not in the repo).
- Commit messages end with the session's Co-Authored-By and Claude-Session lines; never put a model name in commits or code.

## Act V: where it stopped

The published artifact is still Acts I-IV (version 11). Act V is on the branch, unpublished.

- **Stage A, assets: done** (commit "Skotos: the Act V assets"). The frost people set, the rime pack, the creatures (crab, skotos, tentacle, icemaw, louse, skua; the Rime Bear reuses bear.glb); 7.6 MB raw, 93 MB phone GPU; credits complete. The Skotos is "Cloaked Figure" plus a code-built hood and arms (the design's squid sources failed the look gate).
- **Stage B, foundation: done** (commit "Skotos: Act V foundation (stage B)"). Plumbing, the Anvil's Neck (parity over 2000 seeds), gen5/genlib with check-act5 clean, tide.js and ice.js (soaks pass), sea.js and build5.js, perf5 and shallowtele passing, every shipped scenario passing.
- **Stage C, the act: about two thirds done, then stopped.** Done: C1 (Cold, beams, lamps, sap kinds, the vulnerability rule, the tide/ice gameplay hooks, creature plumbing), C2 (all eight enemy kinds), S1 (quests 24-31 and their text, tested with stand-in boss events), S2 (HUD, panels, overlay, the frost vignette, audio: themes, motif, sfx). Not done: C3 (the Walking Tower and the Skotos bosses, the cameo poses, BOONS[5], the legendaries; it had just started), then the integrator (the Act V scenarios and a full play-through), gate G4 and a review round.
- **Look polish: round 1 of 3 nearly done.** The critic found the act below the Acts III/IV floor at the gameplay camera (39 issues, 28 major: `reports/look-critic1.json`); the fixer had worked through most of them (`reports/look-round1.md`) when it stopped. Its perf5 re-run had not been done.
- **The working tree at the pause is committed** as "Skotos: Act V paused". The build passes; the scenarios were not re-run after the last edits.

**To resume** (in this session, or in a new one after reading this file and the contract):
1. `cd skotos && npm install`; start the shared dev server detached (the contract says how).
2. Stage C: run `docs/act5-workflows/stage-c-act.js` with the Workflow tool (args `{ scratch: <a scratch folder>, repo: "/home/user/abyssos/skotos" }`). In the same session it can resume run `wf_b36e26fb-c11` (C1, S1, S2 and C2 replay from cache). In a new session, first edit it so the lanes skip C1, S1, S2 and C2 (their reports are in `docs/act5-briefs/reports/`; point the later steps there instead of the scratch folder) and start at C3.
3. Look polish: `docs/act5-workflows/look-polish.js` (run `wf_abf08f0f-8bb` in the same session). In a new session, start at round 1's fixer re-check: run perf5 and shallowtele, then the critic's round 2.
4. Stage D: a review workflow (bug finders plus verifiers), the full regression (every Act I-V scenario, soak5, check-act4/5, parity), the strict-CSP artifact check on desktop and phone, then publish to the same artifact URL, update README, HANDOFF and the contract, and ask the owner to try it on the phone.

Memory: the container restarted twice during the night run (four agents with headless browsers). Since then agents keep one browser at a time and use a private no-HMR dev server (`npx vite --config tools/vite.nohmr.mjs --port <n>`) for long runs; no restart happened after that.

## Open items

- Act V (above).
- Acts I-IV: none known. The owner confirmed on a real phone (version 11) that high quality no longer crashes and runs smoothly.

## Done in the last session

- Ivar's Dark: in a boss's darkness the hero's own fire (a Mage's Meteor) counts as light only for its first 0.5 s (`FLARE`, light.js), so the braziers are the way through again.
- Karthax's cages: the Hammerfall's cooldown in the cages phase is `5 - 0.6 * (blows - 3)` s (5 s for three cracked statues, 3.2 s for six blows): all gifts taken ~30 s, all refused ~21 s as before. `GIFTS=taken|refused RUNS=n node tools/scenario.mjs cagetime <out>` measures it.
- Forge cranes: `craneSamples` (gen4.js) is the crane's footprint (girder local x -6.2..6.2, z -1..1.5; rails at |x| 6.0..6.25 from z -0.96 to 3.05, which must be buried); placed just before the dressing, off the slag, the bridges' approaches and the smiths' clutter, either way round, scale 1.6..0.8, from their own RNG. A saved seed's Forge is unchanged but for the cranes and the dressing round them (`/tmp` parity check against 4903c82: 0 differences). `check-act4.mjs` uses the same footprint (hard: craneOverLava, craneRailOverLava, craneRailBare).
- Pathing: `seek()` follows the hero's flow field only for a target at her side and nearer her than the actor; any other target gets `GridMap.stepToward` (a 41x41-cell BFS window of the actor's own, cached in `a.path` per target cell and `map.ver`), with `skirt()` past its reach. Pinned on a corner the straight line clips (clear() follows the centre, not the body), an actor takes the way round for 0.8 s. Anything that changes map cells at runtime must go through `map.open`/`setSolid` (they bump `map.ver`).
- Forgers kneel at a mould's rim by their own radius (`rimSpot` when clutter stands on the rim) and leave a mould they cannot get nearer to for 20 s.
- Every cinematic ends with 1 s of hero iframes (boot.js cineTick); rolls and blinks keep the longer iframes.
- Three adversarial review rounds (multi-agent) on these changes; the last found nothing new.
