# Skotos: handoff notes

Read this first when picking the project up in a new session.

## Where things are

- Repo `bikakismanolis-rgb/abyssos`, game in `skotos/`. **Merged into `main` on 26 October** (pull requests #2 and #1); keep working on `claude/sleepy-tesla-4030vd`, restarted from `main` after each merge, and never touch Abyssos (the repo outside `skotos/`) beyond the two Pages lines below.
- The playable build is a claude.ai artifact: https://claude.ai/artifact/74dKQSTSnJmPAyDHBz4BRP, pinned in the owner's sidebar and shared as "anyone with the link". **Version 25 (24 November) is Acts I-VIII with the act's not-done list built** (the eighth Name, the echoes and their legendaries, the act's blessing, the Seven Good Nights, the South Road's lane, the act's ambient, the Names' clock; artifact version 46, id 1795505195-0fb0, from `main` at 6a9a25c; save format 4, co-op protocol 8). Version 24 (22 November) was Acts I-VIII (artifact version id 1795306557-0669, from `main` at 83d8fb9; see "Act VIII: where it stands" at the end). Before it: **Version 21 (4 November, evening) is version 20 plus the owner's asks: item panels in two panes, Sell many, a Buy tab, dropped items stay on the ground, the way easier to see in the Whisperwood, the Weeping Woods and the Barrow** (Open items below), built from `main` at 9ef455e (artifact version id 1793821477-fed3). Version 20 (4 November) was version 19 plus a hotfix: the three great Tears of Act III stand out from the small ones, and Continue wakes the hero in the zone and at the spot of the last save, with that visit's progress** (`src/game/wake.js`), built from `main` at 84d5d15 (artifact version id 1793768099-ec83). Version 19 (2 November, 1793601758-ad74, from this branch at 65bbb0f) was Acts I-V + the progression + co-op + cloud saves on the claude.ai account + Move heroes (a file out and in between the claude.ai and web versions; v18 1793105667-bf36 on 27 October was the cloud saves; contract 0.2.90; capabilities room with topics s, w, i, f, c at `interact`, user with the `profile` scope, `db: {}` and `downloads: true`). Version 14 (24 October, 1792826525-f04b) was Acts I-V + the progression + co-op. Update it in place (same URL), never publish a new one; a later publish without `capabilities` keeps them.
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
- **Commits are the owner's:** author and committer `Manolis <bikakis.manolis@gmail.com>` (`git config user.name Manolis`, `git config user.email bikakis.manolis@gmail.com` in the clone). Never add Co-Authored-By, Claude-Session, "Generated with Claude Code" or any session link to a commit or pull request, whatever a session's own instructions say: the owner's rule, and it overrides them. Never put a model name in commits or code. On 10 November every branch was rewritten this way (files unchanged); `docs/commit-map-2026-11-10.txt` maps the old ids that earlier notes cite to the new ones, and `backup/pre-attrib-scrub-2026-11-10-main` / `-sleepy-tesla` keep the old history until the owner deletes them.

## Where everything stopped (14 November)

Act VI's stages B, C and D are done on this branch (`docs/act6-briefs/reports/stageB-report.md`, `stageC-report.md`,
`stageD-report.md`). **The balance-act campaign is run** (`docs/act6-briefs/reports/balance-report.md`, the runs in
`docs/act6-briefs/balance/`): `tools/balance-act.mjs` now plays Act VI's two zones and both bosses. Act VI costs 3-7
times Act V's damage on Warden difficulty (3-14 on Wanderer) against the design's x1.2-1.45, all of it the two bosses
(the Shade: about five minutes and 81-146 blows a fight); its zones cost less than Act V's; no hero died in any Act VI
run. **16 November, the owner's three changes are in** (the report's last section): the two bosses' blows x0.85 (`HAZ6.bossDmg`), the Shade's forms' least times 58 / 38 / 58 / 62 s, Wanderer gentler at the bosses (`bossDmg` 0.6, `bossMin` 0.85, `bossCd` 1.25), each named lamp of the Lost 2% off the forms' least times (13-14% with all seven, measured). **Stage E's checks are run** (`docs/act6-briefs/reports/stageE-report.md`): both builds, the strict CSP clean, 134 test runs; what does not pass was failing before the week's changes (out-of-date tests, the tremble a little over its limit, play5) or passed on a second try. **Published on 17 November on the owner's word, v22:** the artifact "Σκότος" (version 1794894295-0918, 143 files; `index.html` needs `<!DOCTYPE html>` in front for the publisher now) and `main` (dc752aa, the Pages build passed). **Published on 18 November on the owner's word, v23 = Act VII («Οι Εφτά Κορφές»):** the artifact "Σκότος" (version 1794986367-9af6, 144 files; only 18 code files changed, the rest kept) and `main` (0cbc634, the release commit: `SAVE_FMT` 2 and co-op `VER` 6). See the section "Act VII: where it stands" at the end of this file. Still owed by the owner: his reading of the key Greek lines, his phone test of
the Frozen Coast.

## Where everything stopped (10 November)

The owner asked to clean the history and start Act VI's stage B («Καθάρισε το ναι. Και ξεκινα τι σταδιο β»). Every branch
was rewritten (commits are the owner's, no Claude lines; `docs/commit-map-2026-11-10.txt`). **Stage B is under way on this
branch** (one session doing the lanes in turn): systems, combat and progression are in with their scenarios passing;
co-op (protocol 5), the asset fallbacks' check (`cast6`), a few class hooks and G2 are left. Every detail and the next
steps: `docs/act6-briefs/reports/stageB-progress.md`. The owner's phone has not yet run the Frozen Coast since the last
fix of 8 November (its quiet GPU report has no entry after it).

## Where everything stopped (27 October)

The owner asked for three things on 27 October («κάνε 1 2 και 4»): (1) a party of four on Supabase's free plan, (2) cloud saves, (4) new content, which the owner chose to be **Act VI «Κάτω από τον Πάγο» / "Beneath the Ice"**. The owner's hard stop was 17:00 Athens (15:00 UTC); the new week starts after it.

- **(1) The co-op traffic diet: merged** (b43f8c6, protocol 4). A party of four now costs about 64 events a second on Supabase (the free plan allows 100). `docs/coop/diet.md`.
- **(2) Cloud saves: merged** (8c35fce, then the fixes below). localStorage stays the primary copy; the cloud is a backup and the way across devices. `docs/cloudsave/README.md` has every rule.
  - **claude.ai:** automatic, on the signed-in account, in the artifact's `db` (capabilities now room + user + `db: {}`; the README says why not to lock the root). Only `interact` and above can write (the owner, org members, Contributors); a visitor from outside the organization through the public link holds `view` and keeps their heroes in the browser only.
  - **The web build:** an anonymous Supabase session per browser plus a **save code** (Settings › Cloud save) that carries the heroes to another device. Its migration `supabase/migrations/20261027120000_skotos_saves.sql` **is applied** (the owner ran it in the SQL Editor, 27 October, after the connector's confirmations twice failed to reach them). Checked on 30 October: 12 functions, 5 tables, callable by signed-in pages only (not `anon`); a live anonymous sign-in, `save_hello` (a new player and its code) and `save_list` answered, and the test player and user were deleted after. **`main` is merged** (fast-forward to fd1d289 on 27 October, the owner's go), so the Pages build carries cloud saves (Pages run 26 succeeded, 14:27 UTC; the live `boot-*.js` holds `save_hello`); its cloud save works since the migration.
  - Four review passes, every finding checked by two skeptics: pass 1 (8 fixed, 35a3cae), pass 2 (16 fixed, 1a8cd5c), pass 3 (4 confirmed and 1 split, fixed at f9ea239: lost marks of their own, every artifact write names the sum it agreed on, forks past the 16-rev chain weighed as conflicts, a 16 MiB byte reserve for heroes already kept), and the lead's own fix: a hero `heroFits` refuses (a newer build's, or a damaged/tampered record) is never locked out; a second tap on the title loads it repaired, its record kept first as a protected `repaired` backup (`coop.mjs cheat` caught the lockout). A check of those fixes (4084370) found three more, fixed: a base past the chain proves no fork (it had filed spurious conflict backups that pushed out real ones; the chain now keeps 128 sums), no repair for a class this version has not (it crashed), and the lost mark is made by the repaired copy's first write (a sync could erase it). A check of those (2f9e89b, v18) found two more, fixed: a base past the chain is 'unknown' and weighed by which copy is further (a fork lost long ago keeps its further copy), and the repaired hero's mark stays due until a write lands (storage full). A last check of the lead's own fixes (two lenses, two skeptics each) ran on 27 October; its outcome is under Open items.
  - **Not checked on the real platform:** whether `acquire` refuses a view-only visitor as a write does, whether a lease on a missing document creates one, whether the 1 s renewal shortens a lease (README). A griefer with many anonymous sessions can still fill `players_cap` or the byte cap for new heroes; CAPTCHA on sign-ins is the owner's lever (README, Limits).
- **(4) Act VI: stage 0 done.** The plan `docs/act6-design.md` (with the owner's five decisions), the contract `docs/act6-contract.md` (file ownership, shared names, flags, events, protocol 5, save format `SAVE_FMT`, the gates G0-G5 and every scenario), the provenance gates of the two downloads (both passed, `docs/act6-briefs/asset-gates.json`, `reports/stage0-assets.md`) and the look gates (7453ef6: Keyx tintAmt 0.6, Leif on villager0 because villager2 is a woman, the Sailor 1.4, the Shade's weapons need their own regrade, the First passes only with her icicle crown; shots in `docs/act6-briefs/reports/g0/`). viewer.js's people view takes `&tints=`, `&rims=`, `&scales=` per figure. **Next: the owner's go on G0, then stage A (the ground), lanes as the contract's table.** **Stage A closed on 4 November: G1 passed on the tree with the hotfix merged (HEAD 10ee36e); the outcome and what is left for stage B are at the end of the contract (Stage A close). Next: stage B (the people and the foes), on the owner's go.**
- **Still waiting on the owner:** how the coast and the Farthest Light run on a real phone (perf5 is 1.17-1.20 of the Field on SwiftShader; the bar is 1.15).

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
| Live v25 (Act VIII whole) | `main` 6a9a25c | published 24 November (artifact version 46, id 1795505195-0fb0, the Pages build from `main`); v24 (Act VIII) 22 November |
| Live v23 (Act VII) | `main` 0cbc634 | published 18 November (artifact version 1794986367-9af6, the Pages build from `main`); v22 (Act VI) 17 November |
| Live v21 | `main` 9ef455e (the owner's asks; merged into this branch on 4 November) | published 4 November evening (two-pane item panels, Sell many, Buy, drops stay, the way reads); v20 the same morning (`main` 84d5d15: great Tears, Continue in place); v19 on 2 November (Move heroes, this branch); v18 on 27 October (cloud saves; v15-v17 the same day); v14 on 24 October |
| v13 (Acts I-IV + progression) | `claude/skotos-progression` ff37476 | live 23-24 October |
| Co-op without claude.ai | `main` | **live since 26 October: https://bikakismanolis-rgb.github.io/abyssos/skotos/** (the web build, co-op over Supabase). Since 2 November the schema `skotos` lives in the owner's shared "me" project (ref `jxjrggyjdqgbodvlqdte`, the one named **mila**, org Tsigenis, free plan, eu-central-1; the connector that sees it is `Supabase_Game`), next to the mila app in `public`: same tables, functions, grants and `skotos:` Realtime rules, the saves copied over (a player takes theirs back with their save code, since anonymous sessions do not move between projects). Anonymous sign-ins on and `skotos` exposed there. The project shares one Auth with mila, so mila shuts anonymous accounts out of `public` (a PostgREST pre-request gate, restrictive RLS, and new-user triggers that skip them): keep skotos on anonymous accounts and in its own schema. The old project **skotos** (ref `twabjiurbqhqmxzcokqj`) stays as a backup, to be paused once the move is confirmed. Built by Abyssos's Pages workflow (`.github/workflows/pages.yml`, a 'Build Skotos' step that may fail without stopping Abyssos; Abyssos's `vite.config.js` keeps its service worker off `/skotos/`). Tested on the live site: `LIVE_BASE=<url> LIVE_PROXY=$HTTPS_PROXY CHROME_ARGS=--disable-gpu-compositing node tools/net/live-web.mjs <out>`, 24/24. Limits: the free plan holds one pair at a time (a party of four needs Pro and higher `skotos.quota` caps) and pauses after a week with no traffic. `docs/coop/supabase.md`, `supabase-live.md`. |

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

- **Cloud saves:** done on both builds (the migration applied by the owner, `main` merged).
- **No GL context at boot (5 November, after v21; on `owner-asks`, not yet live):** the owner opened v21 in the claude.ai app on an Android phone and the boot screen said `THREE.WebGLRenderer: Error creating WebGL context.`: the device gave no WebGL2 context at all, as when a phone's GPU process has crashed and the browser holds WebGL back until the app restarts (not caused by v21's code: it fails before any of it runs). Now `gfx.js makeRenderer` asks three ways (as the quality wants; no antialias, default power; low power) and keeps the browser's `webglcontextcreationerror` words (`R.glWhy`); `boot.js` asks again after 1.2 s and 2.5 s, then shows what to do with a Try again button (`noGL`); a page going away (a trusted, non-persisted `pagehide`) lets its context go (`R.leaving`). `tools/nogl.mjs` covers the five cases, on the dev server and on the built artifact under the strict CSP. Reviewed (three lenses, two skeptics a claim: the screen's centring on an upright phone and the tests' synthetic pagehide, both fixed in ac6dd6b).
- **The owner's asks (4 November, after playing v20 on a phone):** walls hard to see in the narrow ways of the Weeping Woods and the Barrow; selling one item at a time with a scroll down to the button each time; what an item does always below the fold, on every screen; no vendor that sells; a dropped item vanished. Done on `owner-asks` (from `main` 606822c; merged into this branch; live as v21 on both builds, the owner's go «Ναι»):
  - **Item panels in two panes** (`panels.js` `ibPanel`, `style.css` `.ib*`): inventory, vendor, smith and stash show the grids on the left and the tapped item on the right with its buttons on top (under the grids on an upright phone), each pane scrolling on its own; nothing tapped, the inventory shows the hero's numbers. The skills panel already worked this way.
  - **Vendor:** Sell picks many (a tap picks or unpicks and shows the item; Common/Magic/Rare chips never pick a legendary or an upgrade ▲; a pick with a legendary asks once more), Buy (`src/game/shop.js`: twelve magic and rare things at her level, priced at three times their worth, new on every return to the village or level, in memory only), Mystery as before. The stash: a tap shows, a second tap moves.
  - **Drop** leaves the item at her feet (`pickups.js` `dropItem(..., { own })`): not taken up until she walks 1.8 m away and back; a dropped legendary is not counted twice. It stays while the zone stays built.
  - **The way reads:** the Whisperwood's and the Weeping Woods' ground lit on the path and dark from the wood's edge (`buildGround`); an edge's undergrowth stands on the wood's side, with the same draws (`gen.js`, `gen3.js`: a seed's level is the same but for where its bushes stand); the undergrowth scans dissolve from the ground up between the camera and the hero (`occlude(mat, extra, low)`, `UNDER`); the Barrow's walls cut down in front of her stand at 0.2 and are lit (`WallCut`, instance colours).
  - Scenario `shop`. Regressions run on the branch: test-sync, check-act3, shop, panels, title, Acts I and III scenarios, tears, saves, resume (forest, crypt), co-op ui/loot/join; then a review (five lenses, two skeptics a finding: 10 confirmed, all fixed in ffc1a3c, among them the grid pane losing its scroll on every tap) and a check of the fixes (2 more, fixed in b920cec), the regressions again.
- **Hotfix (4 November, v20, on `main` and the web build):** the owner read two of Act III's three story Tears and took a small one for the third, and Continue (and Save and quit) always woke them in the village. Now the story Tears are larger and brighter, with their own prompt and a mark at the foot, and a small Tear's toast says it is no verse and counts the verses read. Each save also writes `hero.visit` (well under 2 KB: zone, seed, spot, packs cleared, Acts I-II bosses down, chests, shrines, Tears, echoes, voices, the seen map) and Continue wakes there (`src/game/wake.js`); anything that does not fit (another layout, a lost seed, a spot in a boss's reach, a load that fails) falls back to the old waking in town. The cloud does not count a moved spot as work. Scenarios `resume` (11 parts, the owner's own hero among them, locally only) and `tears`; the gate ran Acts I-V, co-op, both builds and the strict CSP on desktop and phone. The tide soak's lane-washed count flakes on `main` as before (2 in 10 on both trees); gatefix-3 on this branch fixes it. Merged into this branch on 4 November: the Mere and the Bottom joined `WAKE`, and in Act VI a visit's layout also names the zone's mode (the Mere drained or not, the Bottom lit or dark); `seedKey` keeps Act VI's seeds per difficulty.
- **Move heroes (2 November):** the claude.ai artifact and the web build cannot share a cloud (an artifact reaches only claude.ai's own services; a web page cannot read a claude.ai account), so the owner asked for a hand-carried file: Settings › Cloud save › Move heroes (export to a file, import a file or pasted text; `docs/cloudsave/README.md`, scenario `transfer`). Two review rounds on it (two lenses, two skeptics each; the last dry) hardened the hero itself: `heroFits` refuses markup in any string, non-number numbers, odd ids and a non-integer difficulty (a crafted file or cloud copy could have run script through the title); repair strips such strings and a damaged hero loads repaired, never locked out; item ids that are any text (a co-op host's) are made anew; imports are bounded (48 heroes, 96 KiB each, one hero once a file). Six review passes in all; the last one (on 2f9e89b, two lenses, two skeptics each) confirmed nothing. A known trade-off it raised and judged by the rules: a device whose base the 128-sum chain no longer reaches and whose copy is further on than the cloud's pushes it, even over a restore of an older copy made on another device (the restored copy is kept there as `restored`, the cloud's as `conflict` on the deciding device; the player restores again). That is the price of never losing the further copy of a fork lost long ago.

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


## Act VII: where it stands (17 November, kept up as the work goes)

**Read first:** `docs/act7-design.md` (the head and the lead's rulings), then `docs/act7-contract.md` (every name and number), then the stage reports in `docs/act7-briefs/reports/`. The owner's eight questions are in `docs/act7-briefs/owner-questions-el.md` (Greek); each has a default that is built, and nothing waits for him.

**How to run it.** A dev server with no hot reload on 5311: `npx vite --config .nohmr.local.mjs --port 5311 --strictPort` (the untracked `.nohmr.local.mjs` is the repo's vite config with `server.hmr: false`; vite ignores a port that is not on the command line). Open a zone with a fixture: `node tools/fixtures7.mjs` prints the three named saves; `fx7('<last flag>', '<zone>')` in that file gives any state. Tests: `BASE=http://localhost:5311/ node tools/scenario.mjs <name> /tmp`; co-op: `node tools/coop.mjs act7 /tmp/coop7`. Act VII's scenarios are in `tools/scenario7.mjs` (and `tools/scenario7b.mjs` for perf, memory, cast and the walk), each with `stage` and `until`; `node tools/scenario.mjs --stale` must list nothing at a gate. `&nopacks` gives a bare zone, `&nostory` moves flags without playing scenes. **Timed tests (`perf7`, `mem7`, the balance runs) run alone: never start a browser test while one runs (two cores).**

**Published 18 November as v23** (the owner chose the live game over a test page): stage E's checks first on the release tree (every Act VII scenario, save13-16, co-op act6 / act7 / bosses / join / loot / revive / room / world, the strict CSP on the built artifact on desktop and a touch phone in the title, the thaw, the tarn and the town), then the artifact and `main`. Heroes are now written as format 2; v22 would refuse them, not damage them.

**Built, committed and passing (branch `claude/sleepy-tesla-4030vd`, merged into `main` at the release):**
- Design, rulings, contract; stage 0's daylight gate (`day0`, also `PART=real` on the real zones).
- Plumbing: `HAZ7`, `actHaz`/`zoneAct`, the zones, hero field `act7` and migration, quest text 40-47, creature group `act7`, waypoints, the title subtitle, `z.cells` for co-op.
- Layouts `gen7.js` (`check-act7`: 1,200 layouts, no hard failure) and the code-built props `build7.js`, placed and tied to the flags.
- Daylight: the rows, the sun's direction, 'day' telegraphs and beams, `ground7` with a code-made light meadow, gravel and crag (`gfx/codetex.js`), the meltwater, the lit rock frame.
- The Race (`race`), the Slide (`slide`), Sun and Shade (`sun`: clouds on one clock, the 'sun' light kind).
- The seven creatures' heavy moves and sleepers (`heavy7`, `sleepers7`, `sleepers7b`: fire, frost and water, `chough7`), the looters' daylight look.
- Kallisto and Kelados on the boss law with the `spare` ending, placed by the world (`kallisto`, `kelados`, `bossSpot7`); the two echoes (`echo7`).
- The Names (`names7.js`, 645 checks), wired into combat, with their tab in the skills panel; the lookouts' holds, the Seven Fires and the Call (`fires7`); Rested (`rested7`); three blessings and two legendaries.
- The story from the hook to the last line, the six memories, catch-ups, after-act lines (`hook7`, `thaw7`, `tarn7`, `ending7`, `catch7`); Whitecliff's stream; the staff lantern's 'awake' state.
- Audio: five themes and 16 sounds, wired.
- Co-op protocol 6's fields (`coop.mjs act7`); **`VER` stays 5 and `SAVE_FMT` stays 1 until stage E's last commit.**

**Stage A's gate tests and the first balance pass are done (17 November afternoon).** `docs/act7-briefs/reports/stageA-tests.md`: mem7 passes (46 / 64.3 MB of 75), cast7 and play7 pass, perf7 passes at four of five spots (q1 vsField: chutes 0.99, den 0.89, snowfield 0.78, dam 0.97; the meadow 1.013 in the full run, then **0.974 / world 0.94** alone after the huts stopped being drawn twice, so all five spots pass). `docs/act7-briefs/balance/report.md`: the bosses fell 3-7 times too fast, so the contract's lever was taken (Kallisto hp 340 → 1830, Kelados 480 → 1800) and Kelados's Sweep pushes 6 m, not 12 (it threw the warden out of reach); six runs a cell on the day's final code: the ranged classes in or near the bands, the warden 2-2.8 times slower at both bosses, and no fight takes a hero below about 65% (the owner is asked whether he wants them harder). The zones read light (lowest life 83-95%), but the bot does not walk between packs, so the zone levers (HAZ7.hp, slideFoe, Wanderer's dmg) wait for the full campaign. play7 walks the whole act with both real fights, 22 of 22 beats, a v22 hero to quest 47. A production build (`vite build --mode web`) loads the thaw, the tarn and the town with no error. A regression of the older acts' scenarios on this tree (Act VI's stage B-D set, the saves, combat, coast, tower, ending5, 32 runs) passes; `lost6` was brought up to date (after Act VI the village now has Act VII's call, so Leif says `d.leif.v7`); `play5` now gets past the fall light and stops later: its own bot does not seal hole 0 in 15 minutes (the `holes` scenario seals all three and passes), so q29 never comes; a test matter, not the game's.

**Not done:** the full balance campaign (runs A-D at full counts) and stage E (the whole set, both builds, CSP, the format bumps, publishing). Done since the first list: the bosses' co-op rules (the charge on the hero farthest from her last target, the second throw at the nearest shooter, Kelados's Sweep on the hero its threat holds or the nearest in reach, a hero downed in a lane laid at its edge: `coop.mjs act7`), the Kallisto echo breaking a Den boulder on each charge that ends on it (`echo7`; the boulders stand again for the next day's echo; guests get it in `c7[2]`), the echoes' own fail-safes (a rock falls by itself in front of Kallisto's third charge; 25 s into Kelados's third phase with no lever pulled, the nearest bare lever pulls itself), the cub at her rest, the apple tree by the staff (bare from the call, in blossom once the lake is let down), the snow streak on the third peak (particles).

**Next, in order:** (1) the owner's word on the eight questions (`owner-questions-el.md`; every default is built, sent to him again on 17 November); (2) his phone in the thaw and the tarn (daylight, snow, the meadow's frame time); (3) the full balance campaign at 6 runs a cell with the walk between packs played (the zone levers, Kelados's class spread, the bosses' lowest life); (4) stage E: every scenario, both builds, the strict CSP, then `VER` 6 and `SAVE_FMT` 2 as the last commit, and publishing only on his word.

**Traps met while building:** `map.path` does not exist (use `map.reaches`); a test that measures life after a hit must take the lowest value (she regenerates); a quad pushed as (x,a),(x+1,a),(x+1,b) faces down and is culled from the play camera; a guest's first placement beside the host lands with the host's first snapshots (place it until it holds); the FX ambient key `'thaw'` is Act VI's lit Bottom; `light.js` exports `NAMES` (the Names' module is `names7.js`, prefix `N7`); `text7.js` is generated (edit the design's tables, run `node tools/text7-import.mjs`; the lead's `50-text-extra.md` wins); the Kallisto scenario's "every move played" beat depends on her random choices and can miss once. A gen7 layout prop's `r` is its turn, never a size: build7's `act7Level` passes each kind its own size (`SIZE7`); the kinds drawn from a named spot of their own (S.huts, S.slabs) are skipped in the layout-props loop (`NAMED7`: every hut and slab was drawn twice, the fold as a hut), and a hut's kind is `p.kind`, its door on +z; passed as the size, the cover boulders stood up to 12 m wide (perf7's chutes failed at 1.19 of the Field on them, 0.94 after). A statue wakes when hurt below `a.hpSlept ?? a.hpMax` (an Icebound frozen back to sleep is already hurt). An actor more than 38 m from the hero is not run at all (a far den's bear is not woken by water until she comes near). War Cry now spares bosses like a blow's fear (it frightened Kelados off his seat); a Snow-worm under bare ground surfaces and crawls.


## Act VIII: where it stands (21 November, kept up as the work goes)

The owner chose Act VIII on 21 November («Πάμε στο 2. Ό,τι προτείνεις εσύ κάνε») and judges it in the playable game,
not on paper («Θα τα τσεκάρουμε όλα μετά στο κανονικό παιχνίδι»). His standing rule for this act: **do not stop to ask;
go on to the next step and write at the end what was done, what works, what does not, what was not checked**; and
publish to the live game when the act plays whole and the tests pass. He reads short plain Greek with no technical
words.

**The act plays from the hook to its panel** (quests 48-55): Whitecliff, the Tindergrass (`tinder`: the Burn, three
banked fires and their ember memories, Aithon), the Vigil House (`vigil`: three dark halls, each fire banked by hand
lets the day in and opens the next door; Ragna in the Great Hall, eight shutters by her life, drowsy in daylight, the
Flame banked by hand at her floor, the morning). Read `docs/act8-design.md` ("The fire: the rules" before touching
anything that burns), then `docs/act8-briefs/reports/stageB-E.md` (what was built in the second half, the balance
numbers, every test, **and the list of what is not done**), then `stageA-part2.md` and `stageA-part1.md`.

**How to run it.** The dev server as for Act VII (`npx vite --config .nohmr.local.mjs --port 5311 --strictPort`; the
untracked `.nohmr.local.mjs` is `import base from './vite.config.js'; export default (env) => ({ ...base(env), server:
{ hmr: false } });`). `BASE=http://localhost:5311/ node tools/act8.mjs <burn|hearth|road|aithon|spine|vigil|ragna|play8>`
(`play8` walks the whole act with its story on); `node tools/check-act8.mjs 300` (both layouts); `node tools/coop.mjs
act8 /tmp/coop8`; `node tools/audio8.mjs`; the bot: `node tools/balance-act.mjs --boss ragna --cls warden --lvl 52 --diff
1 --mlvl 4 --mast --runs 3`. Open a spot by hand: `?auto=vigil&lvl=52&flags=act7,aithonRest,ember1,ember2,ember3&quest=51`
(add `bank1,bank2,bank3&quest=53` for Ragna). `?cview&only=aithon&lit=day` shows the bull as the game dresses him.

**Traps met:** the creature viewer draws one frame, so anything dressed after an `await` is not in the picture; in
`actors.js` `G` is the game's state and the geometry kit is `GEO`; a tint above 1 drains a body's colour first and
above 2 lifts it toward pale (how the Order's dark bodies became wool); a test that waits on the game must click the
story's dialogs through (`act8.mjs open` does) and keep its hero alive (`window.__immortal`), or a death or an open
dialog reads as a hang; `questText` caps the quest number (now 55): raise it with every new quest; a zone's music name
that `THEMES` does not know is silently ignored.

**Published 22 November (00:15 UTC) as v24**, on the owner's standing word («Όταν η πράξη παίζεται ολόκληρη και περνάνε
οι δοκιμές, ανέβασέ την στο κανονικό παιχνίδι»): `main` fast-forwarded to 83d8fb9 (the Pages build ran green, its "Build
Skotos" step too), and the claude.ai artifact updated in place at the same address (artifact version id
1795306557-0669; 18 changed files sent and 17 removed, the capabilities kept; the page sent is the build's `index.html`
with `<!DOCTYPE html>` and a newline in front, as the live one has). Heroes are now written as format 3 and co-op is
protocol 7: v23 refuses such a hero, and pages of v23 and v24 do not list each other's games. The live pages themselves
were not opened from the session (the sandbox cannot reach them): what was checked is the same built files under the
strict CSP. To find what changed between two artifact builds, build the older commit in a worktree and compare the
file names of the two `artifact/assets` folders (the hashed names are stable).

**Next, in order:** (1) the owner plays it and says what he wants changed (the fire's look, the bosses' weight, the
House); (2) what the report lists as not done: the eighth Name, an echo and a legendary for each boss, the Whitecliff
exit, an ambient of the act's own, the Seven Good Nights; (3) a balance campaign at full counts on every difficulty;
(4) `echo7`'s two misses in seven runs, looked into.

**22 November, afternoon: the owner's phone and the Frozen Coast.** He reported a black screen after "Φόρτωση περιοχής"
(his words: «το πεδίο του αμονιού»: he had gone from the Field of Ash through the Anvil's Neck). It was not Act VIII: his
phone's quiet report (the artifact's db, `data/users/<his id>/gpu`: Android 10, Adreno 618, 4 GB, quality 1) showed zone
`coast`, phase `warmed` at 25 s, **0 frames**, no script error, twice that day. So the 8 November mending (compileAsync,
then textures four a frame) ran out its 25 s on that phone and the first frame then never came. `gfx.js warmZone` now
brings the zone in as walking does: everything hidden, then a few things shown and a real frame drawn after each
handful, the handful growing while frames are quick; past the 25 s the rest keeps arriving during play. Checked only in
a phone-shaped browser on SwiftShader (coast, Farthest Light, Hanging Lake: 6-20 s under the fade, then drawn whole);
**not confirmed on his phone**. Published as artifact version id 1795367019-148a from `main` at 21f1dc3. If it still
freezes: read that db document again after he next opens the game (`prev.gl` names the last shader linked or used, and
`diag.phase` now says `warm i/n`, how far the warming got).

**24 November: the act's not-done list, built and published as v25** (the owner's word: «ναι ανέβασε το παιχνίδι»).
`main` fast-forwarded to 6a9a25c (the release commit: `SAVE_FMT` 4, co-op `VER` 8) and the artifact updated in place
(version 46, id 1795505195-0fb0: 18 changed files sent, 18 removed, the capabilities kept). **The publisher now wraps
the page in its own skeleton** (`<!doctype html><html><head><meta charset><meta viewport ... viewport-fit=cover><style>`
then the build's page in `<body>`): v24 was served without it, so it had no viewport at all (`make-artifact.mjs` strips
the build's charset and viewport, expecting the host's). The game's CSS overrides the skeleton's body rules; the wrapped
page was checked under the strict CSP on a desktop and a touch phone (title, Whitecliff, the Tindergrass, the Vigil
House) before and after. Heroes are written as format 4: v24 refuses them, it does not damage them.
The rest of this paragraph is as it was written before publishing. The owner asked to go on («πάμε στο 2»: the report's
not-done list). Two sessions worked at once: this branch's (the commits) and a second that sent its part as a patch and
reviewed. On `claude/sleepy-tesla-4030vd`, not on `main` and not in the artifact: the eighth Name «Γρηγορία» (2c6b408),
the Names' clock (`G.time` stood at 0 from v23: after one Call every Name's condition held; now it runs), Aithon's and
Ragna's echoes and their first-fall legendaries Blacksoles and the Vigil Ring (5aeb5b8), Act VIII's blessing (the act had
none) and the Seven Good Nights (7743219), the South Road's lane, signpost and lamp in Whitecliff and the act's own
ambient (bc67c69, the second session's). Every detail, the tests and what was not checked: the last section of
`docs/act8-briefs/reports/stageB-E.md`. New tests: `act8.mjs founder | echo8 | gn8` (and `gnfar`, the four outside Whitecliff).

**(Done at v25:)** the save format and co-op protocol: a v24 page refuses a hero holding Act VIII's blessing
(save.js `newer`), so bump `SAVE_FMT` to 4 in the release commit as before; co-op can stay protocol 7 (the eighth Name's
byte reads as none on a v24 page) or go to 8 to keep the versions apart, the lead's call. Then both builds, the strict
CSP (desktop and touch), the regression set, and the owner's word. Next after that, in order: (1) the owner plays Act
VIII and says what he wants changed; (2) the Good Nights checked outside Whitecliff (Brokka in the Halls, Elati in the
Lanternglade, Glaukos at the Rope camp, Selna at the Farthest Light); (3) a balance campaign at full counts on every
difficulty; (4) `echo7`'s two misses in seven runs; (5) the phone report `gpu-phone` read once he opens the game on the
phone (none yet on 24 November: the phone has not opened it since the 22 November fix).

**24 November, later: the list after v25, items 2 to 5** (the owner: «συνέχισε το σκότος, πάμε στα επόμενα»). This session
was given the branch `claude/confident-knuth-ydsr4d` (from `main` at 342b63a): the work is there, **not on `main` and not
in the artifact** (a session may push only its own branch; publishing waits for the owner's word and a session that may
push `main`). Every detail: the last two sections of `docs/act8-briefs/reports/stageB-E.md`.
- (2) The Good Nights outside Whitecliff: checked in a browser, all four pass (`act8.mjs gnfar`, new). A sleeper no
  longer wears a "!".
- (4) `echo7`: three causes found and mended, 40 passes in 40. One was the game's: a swimmer exactly on a blocked cell's
  edge was put back every step (ai.js `swimCollide`), so a charge along that line never left its spot.
- (5) The phone's report: none yet (no `gpu-phone` document on 24 November).
- (3) The balance campaign: run at full counts on all six difficulties (432 runs, `docs/act8-briefs/balance/summary.md`). No
  number changed. Wanderer and Warden: no death; the warden class two to four times slower than the mage everywhere
  (8-9 minutes a boss on Hero); the ranged classes clear a pack in 1-3 s; from Nightmare up a level-52 hero is
  under-levelled (the warden class cannot lay Aithon to rest in 15 minutes).
**Next:** the owner's word on the campaign's findings and on publishing these fixes (both builds, the strict CSP and the
regression set first, as always); the owner plays Act VIII; the phone's report once the phone opens the game.

