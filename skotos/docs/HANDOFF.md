# Skotos: handoff notes

Read this first when picking the project up in a new session.

## Where things are

- Repo `bikakismanolis-rgb/abyssos`, game in `skotos/`, working branch `claude/sleepy-tesla-4030vd` (pull request #2 into the branch of #1). Commit only there.
- The playable build is a private claude.ai artifact: https://claude.ai/artifact/74dKQSTSnJmPAyDHBz4BRP (version 10 at the time of writing). Update it in place (same URL), never publish a new one.
- The owner writes in Greek; answer in Greek. The game text is Greek and English (`src/i18n/text.js`).
- Design and contracts: `docs/act4-design.md` (the Act IV plan), `docs/act4-contract.md`, `docs/act3-contract.md`. README.md describes every act (in Greek). CREDITS.txt, `src/ui/credits.js` and `src/assets/*/CREDITS.txt` list every third-party asset.

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

## Open items

- Not yet confirmed on a real phone that the memory changes stop the crash at high quality.
- Optional: unload the people sets, packs and creature files of other acts when far from them (only if phones still crash).

## Done in the last session

- Ivar's Dark: in a boss's darkness the hero's own fire (a Mage's Meteor) counts as light only for its first 0.5 s (`FLARE`, light.js), so the braziers are the way through again.
- Karthax's cages: the Hammerfall's cooldown in the cages phase is `5 - 0.6 * (blows - 3)` s (5 s for three cracked statues, 3.2 s for six blows): all gifts taken ~30 s, all refused ~21 s as before. `GIFTS=taken|refused RUNS=n node tools/scenario.mjs cagetime <out>` measures it.
- Forge cranes: `craneSamples` (gen4.js) is the crane's footprint (girder local x -6.2..6.2, z -1..1.5; rails at |x| 6.0..6.25 from z -0.96 to 3.05, which must be buried); placed just before the dressing, off the slag, the bridges' approaches and the smiths' clutter, either way round, scale 1.6..0.8, from their own RNG. A saved seed's Forge is unchanged but for the cranes and the dressing round them (`/tmp` parity check against 4903c82: 0 differences). `check-act4.mjs` uses the same footprint (hard: craneOverLava, craneRailOverLava, craneRailBare).
- Pathing: `seek()` follows the hero's flow field only for a target at her side and nearer her than the actor; any other target gets `GridMap.stepToward` (a 41x41-cell BFS window of the actor's own, cached in `a.path` per target cell and `map.ver`), with `skirt()` past its reach. Pinned on a corner the straight line clips (clear() follows the centre, not the body), an actor takes the way round for 0.8 s. Anything that changes map cells at runtime must go through `map.open`/`setSolid` (they bump `map.ver`).
- Forgers kneel at a mould's rim by their own radius (`rimSpot` when clutter stands on the rim) and leave a mould they cannot get nearer to for 20 s.
- Every cinematic ends with 1 s of hero iframes (boot.js cineTick); rolls and blinks keep the longer iframes.
- Three adversarial review rounds (multi-agent) on these changes; the last found nothing new.
