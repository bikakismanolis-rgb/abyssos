# Skotos: handoff notes

Read this first when picking the project up in a new session.

## Where things are

- Repo `bikakismanolis-rgb/abyssos`, game in `skotos/`. **Merged into `main` on 26 October** (pull requests #2 and #1); keep working on `claude/sleepy-tesla-4030vd`, restarted from `main` after each merge, and never touch Abyssos (the repo outside `skotos/`) beyond the two Pages lines below.
- The playable build is a claude.ai artifact: https://claude.ai/artifact/74dKQSTSnJmPAyDHBz4BRP, pinned in the owner's sidebar and shared as "anyone with the link". **Version 14 (24 October) is Acts I-V + the progression + co-op**, built from this branch at bc5aba8-eacb5db (artifact version id 1792826525-f04b; contract 0.2.90; capabilities room with topics s, w, i, f, c at `interact`, and user with the `profile` scope). Update it in place (same URL), never publish a new one; a later publish without `capabilities` keeps them.
- The owner writes in Greek; answer in Greek. The game text is Greek and English (`src/i18n/text.js`).
- Act V: its plan is `docs/act5-design.md`, its contract `docs/act5-contract.md` (the owner's decisions, the stages, file ownership, every shared name), the briefs and asset report in `docs/act5-briefs/`, every stage's and review's reports in `docs/act5-briefs/reports/`. The progression: `docs/progression/` (README, port-act5.md). Co-op: `docs/coop/` (README, release.md, review-fixes.md).
- Design and contracts of earlier acts: `docs/act4-design.md` (the Act IV plan), `docs/act4-contract.md`, `docs/act3-contract.md`. README.md describes every act (in Greek). CREDITS.txt, `src/ui/credits.js` and `src/assets/*/CREDITS.txt` list every third-party asset.

## State

- Acts I-IV are complete. Act IV ("The Ashen Forge") is the finale of the Ash Crown story; quest 23 is the end state. Post-game: the Shadow Gates (endless tiers, from Isarn's planted staff after the finale) and echo refights of the Act III and Act IV bosses.
- Act IV went through a full review (41 confirmed findings, all fixed); every scenario passes.
- Recent fixes worth knowing: models must load textures through `src/gfx/gltf.js` (the artifact host's Content-Security-Policy blocks `blob:` fetches, which made every model white); phones decode large maps at half size and release decoded images after upload (memory); a "How to play" panel (title menu, pause menu, H key, shown once at the first game); the title tap no longer falls through to "Continue".

## How to work

- **The code graph:** `graphify-out/` maps the code (modules, functions, calls, named communities); `docs/GRAPH.md` says how to install graphify and query it (`graphify query "..."`, `explain`, `path`, `affected`). Use it to find where something lives and what a change touches before reading files, and refresh it (`graphify update .`) with your commits.

- `cd skotos && npm install` if needed; dev server `npx vite --port 5199 --strictPort`.
- Scenarios (Playwright, headless swiftshader): `node tools/scenario.mjs <name> <outdir>` (BASE=http://localhost:<port>/). Names: Act I `combat, ranger, mage, weaver, lord, ending, title, panels`; Act II `gate, pass, stonewarden, halls, king, ending2, cast2, boons`; Act III `weep, hart, heart, amaranthe, echo, ending3, cast3`; Act IV `ashfield, ivar, forge, karthax, ending4, cast4, echo4`; Act V `hook5, catch5, coast, tide, ice, tower, holes, skotos, freeze, ending5, cast5, echo5, cp5, cameo, diff6, shallowtele, perf5`; progression `progpanel, progress, skillsfx, skills5` (CLS=warden|ranger|mage), saves `save13, save14`. Co-op: `node tools/net/test-transport.mjs`, `node tools/coop.mjs join|pack|loot|revive|churn|hostleave|cheat|world|prog|act5|four|ui|ux|access|room|bosses <out>`. Also `tools/soak5.mjs all`, `check-act4.mjs`, `check-act5.mjs`, `parity-ashfield.mjs`. Every tool fails on the on-screen `#fatal` box (`tools/fatal.mjs`). Run the ones touched by a change, and the whole set before publishing.
- Views: `?auto=<zone>&lvl=N&q=1` jumps into a zone; `?world=<zone>&at=...` world viewer; `?cview&only=...` creature viewer; `?viewer&only=p:<name>` people viewer. `tools/shot.mjs` takes screenshots. `tools/check-act3.mjs` and `tools/check-act4.mjs` check the generated layouts over many seeds.
- Publishing: `npm run build:artifact` writes `skotos/artifact/` (index.html fragment + assets/*.js, every file under 16 MB). Before publishing, serve it with `node tools/csp-server.mjs skotos/artifact <port> "<csp>"` using a strict CSP (`default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self' data:; media-src 'self' data:; worker-src 'self' blob:`) and check in Playwright (desktop and an `isMobile`/`hasTouch` context) that there are no CSP violations and no white models. Then publish `skotos/artifact/index.html` to the artifact URL with a `files` map: upload only the changed hashed files and set the removed ones to null.
- Assets: CC-BY 4.0 or CC0 only, credited everywhere; no rips of commercial games or films (the owner wants a Play Store release). Builders live in `tools/creatures/**` and `tools/pack-*.mjs`; sources are downloaded to `/tmp/claude-0/sf` and `/tmp/claude-0/ph` (not in the repo).
- Commit messages end with the session's Co-Authored-By and Claude-Session lines; never put a model name in commits or code.

## Where everything stopped (24 October)

**All four lines of work are merged into this branch**: Act V (stages A-C, look rounds, the release fixes of
`claude/skotos-act5-fixes`: perf at the coast, cp5, holes, tower, `#fatal` in the tools), the progression (ported onto
Act V by `claude/skotos-act5-prog`: `docs/progression/port-act5.md`), and co-op (merged at ca88dd3, then reviewed: 42
findings fixed, `docs/coop/review-fixes.md`). Merge commits ba77c67 and c8069c2; the conflicts kept both sides (one
`#fatal` helper in `tools/fatal.mjs`; coop.js keeps protocol v2's per-guest queues and checks and adds the port's events).

After the merges, three review rounds, every finding checked by two skeptics, all fixed:
- the port's co-op traffic (a subagent): meshes of Storm of Hawks, Void Rift, Ray of Dawn and traps leaked every cast;
  guests' burns, pulls, taunts, refreezes, areas and telegraphs bounded; protocol **3**;
- the release tree on four lenses (saves, release fixes, progression in Act V, merge integrity): Continue with no
  weapon replaced (lost) the worn chest and shield (old, since v12); two tabs of one browser undid each other's hero;
  five variants dropped their skill's legendary (Dawnblade, Wayfarer's Staff, Storm Ring); Frost Nova closed a Hand's
  held hole; a Ray of Dawn ran on unseen after a scene; delayed landings fell in the next zone; Ember Dance's carried
  fire counted as light; a soak's `#fatal` did not fail `tide`/`ice`;
- the fixes themselves: burns charged by what a renewal adds; guest areas never move but tornadoes; `freshHero` (a
  hero taken up from the title is its stored record); Continue keeps the other page's last hero; every Hand's hole let go.
The co-op blow cap now covers an endgame hero (56x dm, a level ceiling of (12 + 9 x level) x 12 with Mastery) and a blow
past it lands as the cap instead of being dropped. New scenario `save14` (starter gear, two pages).

**Gate G4** (`scratchpad/g4/run.sh` in the session; the list is every scenario below): round 1 on the merged tree
passed everything but perf5; round 2 runs on the final code. **perf5:** the coast is 1.17-1.20 of the Field of Ash at q1
on a quiet machine, on the release-fixes branch and on this one alike (`git worktree` comparison, 2 x 9 cycles each);
the fixes session's 1.075 was measured with a second browser running beside it. The gate's bar is 1.15: left for a
later pass (the software renderer shades hidden fragments, so a real GPU may differ; ask the owner how the coast runs
on a phone).

**Published as version 14 on 24 October** after round 2 (81 runs: all passed but perf5, as above; `ice` and `shallowtele`
fixed and re-run: a plunge's fallback point past the 2 s, and the scenario's one-moment read of a flickering rim) and the
strict-CSP check of the built artifact (desktop and phone; title, town, coast, Farthest Light: no violation, no error,
no untextured model). Not yet checked on the published page: two signed-in accounts playing co-op through the
artifact's room (`docs/coop/release.md` step 3); the owner can do it with a friend. The coast plan's
steps 1-3 (`docs/act5-briefs/reports/coast-perf-plan.md`) were applied, kept the look (45 frozen views, `tools/stillshots.mjs`)
and saved nothing on SwiftShader, which skips a branch only when its body holds a loop: reverted
(`docs/act5-briefs/reports/coast-perf.md`). Its step 4 (a flat stand-in for the ground under closed water, gating the
lights' loop) is the one that could move perf5, at a ~1.5 sRGB-level change: wait for the owner's word on how the coast
runs on a phone before more work on a proxy. Watch item from the same report (section 5): implicit-LOD texture reads and
`fwidth` inside the water's `if (seaOn)` branch after its discard (and the ground's 0.56 m branch) are undefined on real
GPUs at the waterline's quads; two reviewers judged it a one-pixel, mostly transparent edge, not new. If the owner
reports sparkles along the water's edge on a phone, hoist those reads or use textureGrad with derivatives taken before
the discard.

| line | branch | state |
|---|---|---|
| Live v14 | `claude/sleepy-tesla-4030vd` (this branch) | published 24 October |
| v13 (Acts I-IV + progression) | `claude/skotos-progression` ff37476 | live 23-24 October |
| Co-op without claude.ai | `main` | **live since 26 October: https://bikakismanolis-rgb.github.io/abyssos/skotos/** (the web build, co-op over Supabase). Project **skotos** (ref `twabjiurbqhqmxzcokqj`, org Tsigenis, free plan, eu-central-1; the connector that sees it is `Supabase_Game`): the migration, anonymous sign-ins and the exposed `skotos` schema set by the owner; test users deleted. Built by Abyssos's Pages workflow (`.github/workflows/pages.yml`, a 'Build Skotos' step that may fail without stopping Abyssos; Abyssos's `vite.config.js` keeps its service worker off `/skotos/`). Tested on the live site: `LIVE_BASE=<url> LIVE_PROXY=$HTTPS_PROXY CHROME_ARGS=--disable-gpu-compositing node tools/net/live-web.mjs <out>`, 24/24. Limits: the free plan holds one pair at a time (a party of four needs Pro and higher `skotos.quota` caps) and pauses after a week with no traffic. `docs/coop/supabase.md`, `supabase-live.md`. |

Publishing v14: `npm run build:artifact`, the strict-CSP check (desktop and `isMobile`/`hasTouch`), then publish
`artifact/index.html` with a `files` map (the new hashed files, the removed ones null) and
`capabilities: { room: { topics: { s: 'interact', w: 'interact', i: 'interact', f: 'interact', c: 'interact' } }, user: { scopes: ['profile'] } }`.
To invite a friend: Share, invite at Contributor (or Editor); the friend opens the link signed in, picks a hero, Co-op,
enters the code. A public-link viewer plays alone.

Lessons from these weeks: the container restarts every few hours (not from memory: the log showed 3 of 15 GB in use),
so agents keep progress notes and the lead checkpoints often; agents can read the owner's latest message and have twice
stopped their own task because of an unrelated one, so their prompts must say that such messages are not addressed to
them; one headless browser at a time (two at once also skew perf ratios), and a private no-HMR dev server
(`npx vite --config tools/vite.nohmr.mjs --port <n>`) for long runs; `pgrep -f`/`pkill -f` match the calling shell:
kill by PIDs from `ps`.

## Open items

- perf5 at the coast (above). Two review findings judged not worth their code: the delayed blows of the base skills
  (only the later skills are guarded), and two pages playing the same hero (the last write wins).
- Acts I-IV: none known. The owner confirmed on a real phone (version 11) that high quality no longer crashes and runs smoothly.

## Done in the last session

- Ivar's Dark: in a boss's darkness the hero's own fire (a Mage's Meteor) counts as light only for its first 0.5 s (`FLARE`, light.js), so the braziers are the way through again.
- Karthax's cages: the Hammerfall's cooldown in the cages phase is `5 - 0.6 * (blows - 3)` s (5 s for three cracked statues, 3.2 s for six blows): all gifts taken ~30 s, all refused ~21 s as before. `GIFTS=taken|refused RUNS=n node tools/scenario.mjs cagetime <out>` measures it.
- Forge cranes: `craneSamples` (gen4.js) is the crane's footprint (girder local x -6.2..6.2, z -1..1.5; rails at |x| 6.0..6.25 from z -0.96 to 3.05, which must be buried); placed just before the dressing, off the slag, the bridges' approaches and the smiths' clutter, either way round, scale 1.6..0.8, from their own RNG. A saved seed's Forge is unchanged but for the cranes and the dressing round them (`/tmp` parity check against 4903c82: 0 differences). `check-act4.mjs` uses the same footprint (hard: craneOverLava, craneRailOverLava, craneRailBare).
- Pathing: `seek()` follows the hero's flow field only for a target at her side and nearer her than the actor; any other target gets `GridMap.stepToward` (a 41x41-cell BFS window of the actor's own, cached in `a.path` per target cell and `map.ver`), with `skirt()` past its reach. Pinned on a corner the straight line clips (clear() follows the centre, not the body), an actor takes the way round for 0.8 s. Anything that changes map cells at runtime must go through `map.open`/`setSolid` (they bump `map.ver`).
- Forgers kneel at a mould's rim by their own radius (`rimSpot` when clutter stands on the rim) and leave a mould they cannot get nearer to for 20 s.
- Every cinematic ends with 1 s of hero iframes (boot.js cineTick); rolls and blinks keep the longer iframes.
- Three adversarial review rounds (multi-agent) on these changes; the last found nothing new.
