# Skotos: handoff notes

Read this first when picking the project up in a new session.

## Where things are

- Repo `bikakismanolis-rgb/abyssos`, game in `skotos/`, working branch `claude/sleepy-tesla-4030vd` (pull request #2 into the branch of #1). Commit only there.
- The playable build is a private claude.ai artifact: https://claude.ai/artifact/74dKQSTSnJmPAyDHBz4BRP, pinned in the owner's sidebar. **Version 12 (16 October) is Acts I-IV: commit 7eded86 plus the Act IV difficulty fix** (`docs/act4-balance/published-v12.patch`; why and what in `docs/act4-balance/README.md`). It was built from a worktree at 7eded86 so that the unfinished Act V stayed out; the same fix is ported into this branch (`docs/act4-balance/port.md`). Update it in place (same URL), never publish a new one.
- The owner writes in Greek; answer in Greek. The game text is Greek and English (`src/i18n/text.js`).
- **Act V is being built (paused on 10 October at the owner's request, to keep usage until the plan renews on Tuesday 13 October).** Its plan is `docs/act5-design.md`, its contract `docs/act5-contract.md` (the owner's decisions, the four stages and gates, file ownership, every shared name, and the stage-A outcome), the briefs and the measured asset report in `docs/act5-briefs/`, every stage's reports in `docs/act5-briefs/reports/`, and the workflow scripts of the running stages in `docs/act5-workflows/`. See "Act V: where it stopped" below.
- Design and contracts of earlier acts: `docs/act4-design.md` (the Act IV plan), `docs/act4-contract.md`, `docs/act3-contract.md`. README.md describes every act (in Greek). CREDITS.txt, `src/ui/credits.js` and `src/assets/*/CREDITS.txt` list every third-party asset.

## State

- Acts I-IV are complete. Act IV ("The Ashen Forge") is the finale of the Ash Crown story; quest 23 is the end state. Post-game: the Shadow Gates (endless tiers, from Isarn's planted staff after the finale) and echo refights of the Act III and Act IV bosses.
- Act IV went through a full review (41 confirmed findings, all fixed); every scenario passes.
- Recent fixes worth knowing: models must load textures through `src/gfx/gltf.js` (the artifact host's Content-Security-Policy blocks `blob:` fetches, which made every model white); phones decode large maps at half size and release decoded images after upload (memory); a "How to play" panel (title menu, pause menu, H key, shown once at the first game); the title tap no longer falls through to "Continue".

## How to work

- **The code graph:** `graphify-out/` maps the code (modules, functions, calls, named communities); `docs/GRAPH.md` says how to install graphify and query it (`graphify query "..."`, `explain`, `path`, `affected`). Use it to find where something lives and what a change touches before reading files, and refresh it (`graphify update .`) with your commits.

- `cd skotos && npm install` if needed; dev server `npx vite --port 5199 --strictPort`.
- Scenarios (Playwright, headless swiftshader): `node tools/scenario.mjs <name> <outdir>`. Names: Act I `combat, ranger, mage, weaver, lord, ending, title, panels`; Act II `pass, stonewarden, halls, king, ending2, cast2, boons`; Act III `weep, hart, heart, amaranthe, echo, ending3, cast3`; Act IV `ashfield, ivar, forge, karthax, ending4, cast4, echo4`. Run the ones touched by a change, and the whole set before publishing.
- Views: `?auto=<zone>&lvl=N&q=1` jumps into a zone; `?world=<zone>&at=...` world viewer; `?cview&only=...` creature viewer; `?viewer&only=p:<name>` people viewer. `tools/shot.mjs` takes screenshots. `tools/check-act3.mjs` and `tools/check-act4.mjs` check the generated layouts over many seeds.
- Publishing: `npm run build:artifact` writes `skotos/artifact/` (index.html fragment + assets/*.js, every file under 16 MB). Before publishing, serve it with `node tools/csp-server.mjs skotos/artifact <port> "<csp>"` using a strict CSP (`default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self' data:; media-src 'self' data:; worker-src 'self' blob:`) and check in Playwright (desktop and an `isMobile`/`hasTouch` context) that there are no CSP violations and no white models. Then publish `skotos/artifact/index.html` to the artifact URL with a `files` map: upload only the changed hashed files and set the removed ones to null.
- Assets: CC-BY 4.0 or CC0 only, credited everywhere; no rips of commercial games or films (the owner wants a Play Store release). Builders live in `tools/creatures/**` and `tools/pack-*.mjs`; sources are downloaded to `/tmp/claude-0/sf` and `/tmp/claude-0/ph` (not in the repo).
- Commit messages end with the session's Co-Authored-By and Claude-Session lines; never put a model name in commits or code.

## Where everything stopped (20 October, paused by the owner until next week)

Four lines of work. The published artifact is **version 12** (Acts I-IV with the Act IV difficulty fix); nothing below is published yet.

| line | branch | state |
|---|---|---|
| Act V (the Frozen Coast) | `claude/sleepy-tesla-4030vd` (this branch) | Stages A-C done and reviewed (`docs/act5-briefs/reports/`: integrate.md, stage-c-fixes.md). Look polish: rounds 1 and 2 done, round 3's fixer stopped during its final re-shoots (`reports/look-round3.md`; its work so far is committed). Left: gate G4 (every Act I-V scenario, soak5, check-act4/5, parity, the strict-CSP artifact, the memory report) and a final review. |
| Progression (Mastery, 24 skill variants, 9 later skills, the 4-button loadout) | `claude/skotos-progression` (from `claude/skotos-live` = version 12) | Built by a parallel session; an independent review found 21 problems, all fixed and committed (`docs/progression/review/fixes.md`). The release check was stopped part way: re-run every shipped scenario plus progpanel, progress and skillsfx, build the artifact, run the strict-CSP check, list the files against version 12 (`docs/progression/release.md`), then publish it as **version 13** from that branch. Then port it onto the Act V branch (`docs/progression/README.md` says how). |
| Co-op, up to 4 players | `claude/skotos-coop` (from 564162f of this branch) | Built and tested by a parallel session (`docs/coop/README.md`, `release.md`, `questions.md`). Left: merge it into this branch (resolve against stage C's later fixes and the look rounds), re-run its tests (`node tools/net/test-transport.mjs`, `node tools/coop.mjs …`), review it (above all the host's validation of what guests send), and publish with the `capabilities` object in its `release.md` (room topics s, w, i, f, c at `interact`, and `user` with the `profile` scope). |
| The code graph | this branch: `graphify-out/`, `docs/GRAPH.md` | Built on 20 October; refresh with `graphify update .` after the merges. |

The two parallel sessions are finished and idle: progression `session_01AQQxkmADsS4LmWLZPKr5CP`, co-op `session_01Vx2KGUsifJTJjaxdkfT6L6`.

**Order to resume:** (1) finish the progression release check and publish version 13; (2) finish Act V's look round 3 if needed, merge the co-op branch and port the progression onto this branch, then gate G4 and a final review over all of it; (3) publish version 14 (Acts I-V, progression, co-op) with the co-op capabilities, and tell the owner how to invite a friend (Share, Contributor access, the Co-op code).

Lessons from these weeks: the container restarts every few hours (not from memory: the log showed 3 of 15 GB in use), so agents keep progress notes and the lead checkpoints often; agents can read the owner's latest message and have twice stopped their own task because of an unrelated one, so their prompts must say that such messages are not addressed to them; one headless browser at a time, and a private no-HMR dev server (`npx vite --config tools/vite.nohmr.mjs --port <n>`) for long runs.

## Open items

- Act V, progression and co-op: see "Where everything stopped" above.
- Acts I-IV: none known. The owner confirmed on a real phone (version 11) that high quality no longer crashes and runs smoothly.

## Done in the last session

- Ivar's Dark: in a boss's darkness the hero's own fire (a Mage's Meteor) counts as light only for its first 0.5 s (`FLARE`, light.js), so the braziers are the way through again.
- Karthax's cages: the Hammerfall's cooldown in the cages phase is `5 - 0.6 * (blows - 3)` s (5 s for three cracked statues, 3.2 s for six blows): all gifts taken ~30 s, all refused ~21 s as before. `GIFTS=taken|refused RUNS=n node tools/scenario.mjs cagetime <out>` measures it.
- Forge cranes: `craneSamples` (gen4.js) is the crane's footprint (girder local x -6.2..6.2, z -1..1.5; rails at |x| 6.0..6.25 from z -0.96 to 3.05, which must be buried); placed just before the dressing, off the slag, the bridges' approaches and the smiths' clutter, either way round, scale 1.6..0.8, from their own RNG. A saved seed's Forge is unchanged but for the cranes and the dressing round them (`/tmp` parity check against 4903c82: 0 differences). `check-act4.mjs` uses the same footprint (hard: craneOverLava, craneRailOverLava, craneRailBare).
- Pathing: `seek()` follows the hero's flow field only for a target at her side and nearer her than the actor; any other target gets `GridMap.stepToward` (a 41x41-cell BFS window of the actor's own, cached in `a.path` per target cell and `map.ver`), with `skirt()` past its reach. Pinned on a corner the straight line clips (clear() follows the centre, not the body), an actor takes the way round for 0.8 s. Anything that changes map cells at runtime must go through `map.open`/`setSolid` (they bump `map.ver`).
- Forgers kneel at a mould's rim by their own radius (`rimSpot` when clutter stands on the rim) and leave a mould they cannot get nearer to for 20 s.
- Every cinematic ends with 1 s of hero iframes (boot.js cineTick); rolls and blinks keep the longer iframes.
- Three adversarial review rounds (multi-agent) on these changes; the last found nothing new.
