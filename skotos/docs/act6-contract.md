# Skotos Act VI: code contract

The design is `docs/act6-design.md` (after its critic pass, with the owner's five answers recorded in "The owner's decisions (27 October)"); the three proposals and the owner's questions it was built from are in `docs/act6-briefs/`; a review pass against the code is applied throughout and listed at the end (Review pass). This file fixes the owner's decisions, the lead decisions, the stages and their gates, file ownership per lane, every shared name, every flag, hero field and event, the co-op protocol, the save migration, the quests and their catch-ups, the scenarios each gate runs and the expected assets. **Where this file and the design disagree, this file wins. Where the design and the shipped code disagree, the code is the truth:** follow the code and write the difference in your stage report. Every file:line below was read at HEAD **12e94d6** (27 October: the co-op traffic diet merged at b43f8c6, then stage 0's asset gates, docs only); only `src/net/*` moved since the design's commit 5dc2782, so its other line numbers hold. If a line has moved when you read it, find the name, not the number.

Repo `/home/user/abyssos/skotos`. The repository root (Abyssos, everything outside `skotos/`) is a different game: never read or touch it. Dev server `http://localhost:5199` (shared; if it does not answer, start it detached with `cd /home/user/abyssos/skotos && (setsid nohup npx vite --port 5199 --strictPort > /tmp/claude-0/vite.log 2>&1 &)`; never kill it). A private server on another port with `BASE=http://localhost:<port>/` for the tools. Build check `npx vite build --logLevel error`; artifact check `npm run build:artifact` (every file in `artifact/assets/` under 16 MB); web build `npm run build:web`. Scenarios `node tools/scenario.mjs <name> <outdir>`, co-op `node tools/coop.mjs <name>`, layouts `node tools/check-act6.mjs`. The code graph: `docs/GRAPH.md` (`/tmp/claude-0/graphifyenv/bin/graphify query "..."` from `skotos/`).

**Working rules for every lane** (HANDOFF's lessons):
- Never commit or push; the lead commits between stages. Never `git checkout`/`reset`/`stash`/`restore` a file: other agents work in the same tree. Never touch another branch's worktree.
- **One headless browser at a time** across all lanes (two at once also skew perf ratios). The soaks (`carry`, `blackwater`, `drips`), `perf6` and the boss scenarios run only in a gate run, which has one owner who starts it, reads it and reports it.
- The container restarts every few hours: keep progress notes in `docs/act6-briefs/reports/<lane>-progress.md` and write your stage report to `docs/act6-briefs/reports/<stage>-<lane>.md`.
- A message from the owner about something else is not addressed to you: do your task.
- Match the surrounding code (density, naming, comment style). No model names in code, comments or commits. Do not reformat files you do not own.

## The owner's decisions (27 October 2026)

All five questions of `act6-briefs/owner-questions-el.md` were answered with the recommendation. What each means for the code:

1. **The ending: no one stays below alone.** Glaukos climbs back up the rope (d.glaukos.e3) and is a visiting vendor at the Rope camp by day after the act; the First's fire is held by the names said every night above (`rollNames6`). Nothing is linked, kindled or sacrificed; no NPC is left at the Hearth but the sleeping First.
2. **The tyrant's ember does not speak.** The ember in the ice (flag `ember6`) is narration only: d.ember.n1, d.ember.n2, d.ember.n3. The two spoken lines d.ember.1 and d.ember.2 are **not written into text.js** (they stay in the design for the owner). No line names Karthax.
3. **The dark as designed.** The Carried Fire's ring is the meter, drained only by the dark's actions and refilled only at true fires; false light is dead still, cold and counts for nothing; the Faded are drawn faintly until they enter light, and solid from their wind-up within their reach + 1 m.
4. **The Shadow Gates nearly as they are.** In the base: the depth line (gate.depth, gate.bottom) on the Gate panel and the gate's HUD, and from tier 10 a 12% chance of one sleeping forgotten one by a dark lamp (hero field `gateFound`). Drowned tiers are out (stretch). The Gates' layouts, packs, Guardian and loot do not change (`gate6` asserts it).
5. **The Lamplight Mastery track is in**, with the Acts IV-V re-balance at rank 40 (G3).

**Still out (stretch):** Drowned tiers; the ember's spoken lines; the "pinch keels" second tide threshold; a thawed reading of the Drained Sea; the Faded Keeper, ambient fish, eels and bone fields; a Brokka and Elati cameo below the ice; a seventh difficulty; a bed-layer audio channel.

## Lead decisions

- **Names.** «Πράξη VI: Κάτω από τον Πάγο» / "Act VI: Beneath the Ice" (Latin VI). Zones `drained` «Η Στεγνή Θάλασσα» (level 34) and `bottom` «Ο Πάτος των Πυλών» (level 37). One new generator file `src/world/gen6.js`, one new build file `src/world/build6.js`. The pack is **`silt`** (`src/assets/silt.glb` only if it ever carries a prop, and `src/assets/silt/*.webp`), built by `tools/pack-silt.mjs`; there is **no new people set** (`frost` is reused); the creature group is **`act6`** (`ACT_FILES.act6`). The zone light kind is **`'under'`**.
- **The word `under`** already names two other things: the actor field `a.under` (underground or underwater, hidden and untargetable: actors.js:208, :368) and the audio mood `MOOD.under` (the Tower's shadow, audio.js:2108). The light kind is only ever read as `lightKind() === 'under'`; never write `a.under` or `MOOD.under` for it.
- **Canon.** The design's Story section, plus what the game already says (`src/i18n/text.js`). The hero never speaks; «Σκότος» is neuter, its lines lowercase with an opening ellipsis and its "i"; in English never "the First's fire" (always "her fire" or "Pherousa's fire/hearth"); no line says Karthax; Isarn stays dead and is not below.
- **Old saves.** A hero without the new fields reads as Act V's end state (quest 31, `seaLit` if it was set); `h.act6` defaults to −1; questText clamps at 39; `actComplete`'s bare `else` no longer means Act V (story.js:530).
- **Stand-ins everywhere.** A missing or failed asset never breaks the game: every STAND_IN chain ends in a boot-loaded or code-built model; `cast6` covers it in cold sessions.
- **Text.** Every new line in Greek and English in `src/i18n/text.js`, Greek first, in the canon's voice (short, plain, poetic; quests imperatives; memories in the present tense; folk with contractions in English: Glaukos, Alkyone, Tern, Tamarisk, Keyx, Leif, Halda, the Sailor; Selna, the First and Asger without).
- **Third-party assets.** CC0, CC-BY 4.0 or CC-BY 3.0 only, clean provenance, credited in `CREDITS.txt`, `src/ui/credits.js` and the pack's CREDITS.txt. Sources go to `/tmp/claude-0/sf/act6` (Sketchfab) and `/tmp/claude-0/ph` (Poly Haven, ambientCG), never into the repository, each with its provenance record beside it.
- **Budgets** (measured, not estimated): new raw files ≤ 2.2 MB (≈ 2.9 MiB of artifact); a cold start into Act VI ≤ 100 MB of phone texture (G1, against the 110 MB bar); new phone texture ≤ 16 MB (G2); perf6 ≤ 1.00 of the Field at q1 (G1, G2).
- **Protocol** (Co-op below): the diet took **VER 4** (coop.js:43, merged at b43f8c6). Act VI's wire is a delta on protocol 4 and ships as **VER 5**, one bump in the net lane.
- **Save format** (Saves below): heroes carry `fmt` (save format number); Act VI writes `fmt: 2`; a build that does not know a hero's format refuses it.

### What this contract changes in the design (found in the code)

| design says | the code at HEAD | this contract |
|---|---|---|
| three readers of the ice arrays need the `L.ice?.` guard (gen5 `tidal()`, sea.js `buildSea` "sea.js:610, 645-646", build.js `tidal5`) | sea.js:605 and :635 already return early without `L.ice`; the unguarded readers a layout with zero-filled `thick/window/deck/sea` and no `L.ice` reaches are **gen5.js:39 `tidal`**, **gen5.js:774 `firm`** (used by `refugeNear`, which gen6 calls), **gen5.js:787 `spineWhole`** (exported; its `okC`, for gen6's reach checks), **gen5.js:856 `flatSpot`** (the huts, boats and kelp gen6 places as gen5's), **build.js:1162** (`groundBeds`), **build.js:1209** (`tidal5`), **sea.js:809** (`buildSea`'s open-water list) | all seven take `L.ice?.[i]`; the world lane's grep at stage A adds any other it finds (Layout below) |
| twelve `crackAt` call sites (5 + 7) | thirteen ice calls: skills.js:235, 265 (crackLine), 298, 338, 414; skillsx.js:185 (**crackRing**, the Ring variant of Earthsplitter), 282, 367, 383, 421, 441 (crackLine), 463, 519 | `vaultAt` at all thirteen |
| `addLightPool` gains `o.flicker` (true light trembles) | `o.flicker` already exists: the pooled PointLight's flicker number (light.js:142, default 0.12; the beam pools pass 0.05, light.js:177) | the tremble is **`o.tremble`**; `o.flicker` keeps its meaning |
| "`fx: false` drops the decal too, light.js:139-141" | `o.fx === false` drops light and decal (light.js:140); `o.decal === false` keeps the light and drops the decal (light.js:143) | new **`o.light === false`**: the decal without a pooled light |
| Act VI memories use "the Lamp-Memory flow (story.js `on('lamp')`)" | `on('lamp')` (story.js:627) is Act IV's ash flow; Act V's black-ice flow is `playIce` (story.js:1276) with body class 'memory-ice' | `playDeep` built from `playIce` (Story) |
| migration "boot.js:98"; blessing loop boot.js:82 | the migration lives in `startHero` (boot.js:103; its act lines boot.js:114-123); the test hook's loop is boot.js:82 (`n <= 5`) | both to 6 |
| "the first-boss list (world.js:257)", "the champion chain (world.js:286)", "`why` map (:355)" | `spawnBoss`'s `first` list world.js:369 and its wake lines world.js:372-377; champion stand-in world.js:401; `nearestInteract` world.js:426; `why` map world.js:475; `ECHO_PROMPT` world.js:578 | cited here as they are |
| `legFrom_shade`; "`LEG_FROM` maps all six Shade kinds" | combat.js:529-531 keys the first-kill flag and `LEG_FROM` by `a.kind`, so a co-op host could get the Ring once per form-4 body | MONSTERS rows of the Shade carry **`legKey: 'shade'`**; combat.js:529-531 read `a.def.legKey ?? a.kind`; one flag `legFrom_shade`, one row `LEG_FROM.shade` |
| "`coop.js purseOf` lists every Shade kind and the Ketos" | the boss a kill is paid as is `ZONE_BOSS[zone] === kind` (coop.js:1093, one kind per zone) | `ZONE_BOSS` gains `drained: 'ketos', bottom: 'shade'`, compared against `MONSTERS[kind].legKey ?? kind` |
| new d.brokka.v3, d.brokka.v4, d.elati.v3 (.r); d.alk.k1-k3 | **d.brokka.v3, d.brokka.v4, d.elati.v3, d.elati.v4, d.alk.k1, d.alk.k2 ship** (Act V: text.js:894, 939, 895, 943, 905, 920) | renamed: d.brokka.v5 (after `call6`), d.brokka.v6 (after `herFire`), d.elati.v5 (+ .r), d.alk.l6.1-l6.3 (Text keys) |
| (not in the design) | `repairHero` keeps five blessings (save.js:84 `h.boons.slice(0, 5)`); the cloud-save line's `heroFits` refuses a sixth (`i >= 5`) | both read the number of acts with blessings (`Object.keys(BOONS).length`, 6) |
| (not in the design) | more Act V-only tests read `z.act5`: tide.js:94 (`tickWash`), sap.js:169 (`placeCasks`), hud.js:384-393 (questGoal), hud.js:467-468 (beam and snuff sounds), build.js:1431 (`cfg.act5` in the ground's defines) | listed in the `z.act5` table below |
| (not in the design) | the diet's `relayOf` rebuilds a relayed guest presence field by field and keeps `h.slice(0, 8)` (coop.js:308) | the ring byte at `h[8]` and the light pools `lp` are added to `relayOf` (Co-op) |
| six far fires on the peaks | `setFar` (world.js:1637) gives every far fire a PointLight of intensity 200, range 60 in `L.lights` | the six peaks (FAR_BEACONS 7-12) are sprite and emitter only, no `L.lights` entry («lead pick»: the town's six pooled lights stay for what is near) |

## Stages and gates

Five stages after a short stage 0, each ending in a gate that must pass before the next starts. Lanes in brackets run in parallel, one agent each.

| stage | days | lanes and work | gate |
|---|---|---|---|
| **0. Decisions, contract and look gates** | 2.5-3 | [lead] the owner's answers (done); this contract. [assets] the provenance gates of the Pistosaur (773667575a264c7baa4ec404115a044b) and the Scorpion (4c0fd62d33ab4d2592ee0a1d985a480d): the licence re-read on the download page, a reverse-image search of the thumbnail, a storefront check (Fab, CGTrader, Unity Asset Store), and for the Scorpion a check that "All That's Left" does not sell or claim it; results beside the sources in `/tmp/claude-0/sf/act6/provenance/<name>/` and in `docs/act6-briefs/asset-gates.json` (both **passed**, 12e94d6: Stage 0 outcome below); **any doubt takes the no-download body**. viewer.js's people view gains `&tints=<hex>:<amt>,...`; the runtime regrades seen side by side at gameplay pitch: the First beside Selna (`?viewer&only=p:selna&tints=9ab8d0:2.1`), the Faded beside the Sunken, Keyx, Leif, the Lampbearer, the Shade's four forms under the skin patch, the Icemaw at ×3.4 with a code lure (the Ketos's fallback). [perf] perf5's Field of Ash measured on the gate machine (the perf6 baseline) | **G0:** every look gate passed or its fallback chosen (written in `reports/stage0-assets.md`); each download's provenance passed or its no-download body taken; this contract written; the owner's go. The owner's phone run is an input if it arrives, never a blocker |
| **A. The ground** | 11.75-14.5 | [world] the plumbing (Engine work 1), the `z.act5` generalisation, gen6 both zones and modes, `tools/check-act6.mjs`, FAR_BEACONS 7-12 (world.js: the rows, `farFire`, `setFar`, `townFires`); [look] `ground6`, build6.js, SEA_BLACK, ICE_VAULT, true and false light's looks, the 'reduce flicker' setting, the 'dark' telegraph, atmospheres and fx ambients, every quality-0 path first; the tremble's luminance measured; [engine] the unload of Acts II-IV; perf6 with stand-in packs, calibrated against the Field on SwiftShader | **G1:** check-act6 (300 seeds per zone and mode) no hard failure, mean tries ≤ 3; **perf6 ≤ 1.00 of the Field at q1** at all five spots, q0 measured as a floor; a cold start's phone texture ≤ 100 MB; **unload6**; `save15`; the tremble under the flash threshold on a hearth's r 6 pool; **regress-A** (below) unchanged |
| **B. Systems and enemies** | 12.75-15.5 | [systems] the Carried Fire, the Black Water with slush, the Ice Overhead, the Names from Above, the Cold's sources; [combat] the traits, the 'lure' AI, the five new defs and the Ketling, the packs, the class hooks; [progression] the Lamplight track; [assets] the Ketos and the Falselight builds (or fallbacks), pack-silt, CREDITS; [net] co-op rows, protocol 5 | **G2:** `carry`, `blackwater`, `lure`, `names6`, `drips` soaks; `cast6` cold; `skillsfx` in an 'under' zone for each class; `coop.mjs act6`; `darktele`; `prog6`; new phone texture ≤ 16 MB; perf6 again with real packs; **regress-B** |
| **C. Bosses and balance** | 9.5-11 | [combat] the Ketos, the Shade; [balance] balance-act runs and tuning, the Acts IV-V re-run with Lamplight at rank 40 | **G3:** the time-to-kill bands on Warden for each class and the Shade's form-4 sub-band; Wanderer ≥ 60% of Warden; no blow over 12% of max life on Warden at L36/L40; the act's damage ratio over Act V in ×1.2-1.45; Acts IV and V inside their measured bands at rank 40; `ketos`, `shade`, `leg6`, `diff6b`; `coop.mjs bosses` at two and four players; the 'u' case in `coop.mjs cheat`; **regress-C** |
| **D. Story, text, music** | 7.5-9.5 | [story] quests 32-39, cines, catch-ups, the Lost, Keyx, the home cine, the Landing, the post-game find and the depth line; [text] about 267 lines; [audio] four themes, one variant, the hearth motif, 16 sfx | **G4:** `hook6`, `catch6`, `cp6`, `keyx6`, `lost6`, `ending6`, `echo6`, `gate6`, `drained`; two readers proofread every line against text.js's voice; the owner reads the key Greek lines (the naming, Keyx, the peaks, the last line); **regress-D** |
| **E. Release** | 3-4 | [lead] every scenario (Acts I-VI, progression, co-op, saves, cloud); `npm run build:artifact`, the strict-CSP check (`tools/csp-server.mjs`) on desktop and phone emulation; publish to the same artifact URL with the files map; `npm run build:web` | **G5:** everything passes; no CSP violation, no untextured model; **the owner's phone run** of both zones (perf6's five spots; the flicker with and without 'reduce flicker', `G.settings.flicker`) before any Play Store build |

The scenarios of each gate, with what each asserts, are under Scenarios at the end.

## File ownership

One owner per file for the whole act. A lane edits only the files it owns, plus the **hooks** listed for it in a shared file: one-line calls into its own files, or the named block it is given, at the named place, never a rewrite. A hook is added in the stage of the lane that needs it; the file's owner keeps it from then on. Anything else in a file you do not own: the smallest change that unblocks you, only when the file's owner is not running in your stage; otherwise a stub in your own file and a request in your report.

### The six shared files

| file | owner | hooks others may add |
|---|---|---|
| `src/game/world.js` | **world** (A), who keeps it through D | **story** (D): in `act6Zone` one call `story6Zone(z)`, in `act6Presence` one call `people6(z)`, in `townFires` one call `town6(z)` (the staff's mist and frost, the ember motes, Tamarisk and Leif in town), in `act5Presence`'s coast branch (world.js:1203) one call `coast6(z)` (the Landing: Keyx's lantern on the post, the bird, Alkyone's "!" until `landing6`), in `act3Presence` (world.js:586) one call `weep6(z)` (Tamarisk's epilogue in the wood); all five exported from story.js (the peaks' lit rule is world's own, below); new rows of the `why` map (world.js:475). **systems** (B): in `act6Enter` the calls `resetTide(z, { mere })` (exists; the option is new: The Black Water), `fireEnter(z)` (light.js), `vaultEnter(z)` (forge.js); in `act6Tick` the names' clock `namesTick(z, dt)` (light.js, below). **combat** (B, C): the champion stand-in row (world.js:401), the `first` list (world.js:369), the wake rows in `spawnBoss` beside world.js:372-377 (the Ketos `holdWake` until `ketosWake`, hidden under the Mere; each Shade form's body spawned held until `shadeWake`, the relay's later forms by ai.js), the `it.prio` rule in `nearestInteract` (world.js:426: an interactable with `it.prio` wins over a nearer one without), `ECHO_PROMPT` rows (world.js:578), the boss spots in `act6Zone` (`z.bossSpot` lines). **engine** (A): one call `unloadOld(id)` in `zoneReady` (world.js:96). **look** (A): nothing (props come through `act6Prop`; FAR_BEACONS, `farFire`, `setFar` and `townFires`, world.js:63, :67, :1637, :1624, are world's). |
| `src/game/story.js` | **story** (D) | **systems** (B): `export function rollNames6()` beside `rollNames` (story.js:1647), as written under Names from Above; story owns it from D. **combat** (C): nothing; the bosses emit the bus events below and story answers them. |
| `src/game/ai.js` | **combat** (B, C) | **world** (A): the two reads of the generalisation, ai.js:115 (`waterTick`) and ai.js:163 (`shadeTick`), `G.zone.act5` → `G.zone.water`. Nothing else: the traits, AIs and bosses are combat's, and their co-op target rules use `heroes()` (net/state.js:19) and the presence fields under Co-op. |
| `src/game/light.js` | **systems** (B) | **look** (A): in `addLightPool` (light.js:137) the options `tremble`, `fake`, `light: false`, `core`, and in `tickLight`'s pool loop (light.js:352-364) the tremble (reading `G.settings.flicker`) and the still rim; in `discMesh` (light.js:263) the normal-blended core variant. **progression** (B): `export function lampBonus()` (`G.stats?.ringPct \|\| 0`) and the Lamplight factor on the `LIGHT.base` line (light.js:348): `× (1 + lampBonus() / 100)`, held 0.5 m under the swell (systems writes the line's `'under'` reading, `fireMax()`, which already carries the factor). **world** (A): `lightKind()` returning `'under'` needs nothing (ZONES carries it). |
| `src/net/coop.js` | **net** (B, C) | none. Others write their requests in their reports; the bosses' relay fields are net's (C). |
| `src/world/build.js` | **look** (A) | none: build.js gains only `ACT6`, `ground6`, the X6 defines, the `L.ice?.` guards at build.js:1162 and :1209, and the call `act6Level(L, I, B, out)` in `buildLevel` (build.js:3107), all look's. |

**The generalisation's edits** (the `z.act5` table under Shared names) are the world lane's at stage A, as hooks in every file they touch (cold.js, hud.js, overlay.js, actors.js, ai.js, tide.js, sap.js), except build.js and sea.js, where look makes them; each file's owner keeps them from then on.

### Every other file

| lane | stage | files it owns |
|---|---|---|
| **world** | A (and its catch-up fixes after) | `src/world/gen6.js` (new), `src/world/gen5.js` (the `L.ice?.` guards at :39, :774, :787 and :856, and exports gen6 needs, nothing else), `src/world/genlib.js`, `src/world/map.js`, `src/game/state.js`, `src/game/boot.js` (the migration in `startHero`, the loop at :82, `diffChanged`), `src/game/save.js` (the `fmt` stamp and `repairHero`'s six blessings; the cloud-save line also edits this file: see Saves), `src/ui/panels.js` (the waypoint list at :171, `diffUnlocked` at :262 only), `tools/check-act6.mjs` (new), the world part of `src/debug/viewer.js` (generators for drained and bottom), `tools/scenario.mjs` (`save15`) |
| **look** | A | `src/world/build6.js` (new), `src/world/sea.js` (SEA_BLACK, slush crust, ICE_VAULT, the `L.ice?.` guard at :809), `src/world/atmos.js`, `src/gfx/fx.js` (the 'dark' telegraph, ambients `drained`, `bottom`, `thaw`, emitters, the bird), `src/gfx/gfx.js`, `src/gfx/textures.js`, `src/gfx/env.js` (`PACK_ORDER` gains `'silt'` last, env.js:13), `tools/scenario.mjs` (`darktele`) |
| **engine** | A | the unload: new exports `unloadPack(name)` (env.js), `unloadFolk(set)` (people.js), `unloadCreatures(set)` (creatures.js) and one call site `unloadOld(id)` in world.js's `zoneReady` (world.js:96, a hook given to engine); `tools/scenario.mjs` (`unload6`, `perf6`: its five spots, its calibration against the Field, run again at G2 with the real packs) |
| **systems** | B | `src/game/tide.js` (with `cells6`, the shards' and slush's one module), `src/game/cold.js`, `src/game/forge.js` (`drip`), `src/game/sap.js`, `src/game/ice.js` (idle in Act VI: no change expected), hooks in `src/ui/hud.js` (owned by story): the flame icon beside the Cold meter and the tide dial's violet pulse, `tools/scenario.mjs` (`carry`, `blackwater`, `drips`, `names6`) |
| **combat** | B, C | `src/game/data.js` (MONSTERS, PACKS, PACK_LEAD, PACK_DORMANT, HAZ6, BOONS[6], LEGENDARIES, LEG_FROM, BUFFS), `src/game/actors.js`, `src/game/combat.js` (systems may add the one Shroud line at :243), `src/game/player.js`, `src/game/projectiles.js`, `src/game/skills.js`, `src/game/skillsx.js`, `src/game/stats.js`, `src/game/items.js`, `src/gfx/models.js`, `src/gfx/people.js` (beyond the asset entries: the Faded's dissolve), `src/gfx/creatures.js` (MAP, HOLD, LOOP rows), `tools/scenario.mjs` (`lure`, `ketos`, `shade`, `leg6`, `diff6b`, `skillsfx` in an 'under' zone) |
| **progression** | B | `src/game/progression.js`, `src/ui/progpanel.js`, `tools/scenario.mjs` (`prog6`) |
| **assets** | 0, B | `tools/creatures/act6/**` (new), `tools/pack-silt.mjs` (new), `tools/fetch-act6.mjs` (new), `src/assets/creatures/{ketos,falselight}.glb`, `src/assets/silt/**`, `src/gfx/creatures.js` (CAST and ACT_FILES entries only; the stand-in rows in actors.js are combat's, Expected assets), the people part of `src/debug/viewer.js` (`tints=`), `src/debug/creatureview.js`, `CREDITS.txt`, `src/ui/credits.js`, `tools/creatures/README.md`, `tools/scenario.mjs` (`cast6`) |
| **net** | B, C | `src/net/coop.js`, `src/net/state.js`, `src/net/transport.js` (nothing expected), `tools/coop.mjs` (`act6`, the 'u' case in `cheat`, `bosses` rows), `docs/coop/README.md` (protocol 5) |
| **balance** | C | `tools/balance-act.mjs`, `docs/act6-briefs/balance/**` |
| **story** | D | `src/game/story.js`, `src/i18n/text.js`, `src/audio/audio.js`, `src/ui/panels.js` (beyond world's part), `src/ui/hud.js`, `src/ui/overlay.js`, `src/ui/screens.js`, `src/ui/style.css`, `src/game/boot.js` (the Gate find and depth line: `startGate`/`gateKill`, boot.js:218-247), `tools/scenario.mjs` (`hook6`, `catch6`, `drained`, `keyx6`, `lost6`, `ending6`, `echo6`, `gate6`, `cp6`), `README.md` |

**Hooks in the other lanes' files** (the same rule: one line or the named block, at the named place; the file's owner keeps it):

| file (owner) | lane, stage | hook |
|---|---|---|
| `src/game/stats.js` (combat) | progression, B | `ringPct: 0` in `computeStats`'s stat list (stats.js:10); without it `masteryStats` (progression.js:32) adds into `undefined` and the stat is NaN (`prog6` fails at G2) |
| `src/game/actors.js` (combat) | story, D | a block `// Act VI: story` holding `act6Npc(kind, a, av, o)` (the crown and brand, the beard and raised lamp, the hood and axe, the tints and veils of the NPC kinds under Story), called after `act5Npc` (actors.js:570); its `NPC_MODEL` rows (actors.js:542: `firstDeep: 'selna'`, `keyx: 'villager1'`, `leif: 'villager2'`, `sailor: 'villager0'`, `asger: 'wayfarer'`; `gateFaded` a villager by spot, as `'villager'`) and idles beside `NPC5` |
| `src/game/data.js` (combat) | world, A (or the cloud line's merge) | `export const SAVE_FMT = 1` (Saves; data.js imports nothing, so state.js and save.js both read it without a cycle) |
| `src/game/state.js` (world) | look, A | `flicker: false` in `G.settings` (state.js:12) |
| `src/ui/panels.js` (story; world's part above) | look, A | in `settings()` the row `set.flicker` (chips `flk:1`, `flk:0`) after the numbers row (panels.js:212), before the cloud line's `EXTRA.cloudRow` once merged; its `case 'flk'` beside panels.js:318-319 |

**Scenarios from other lanes:** eight lanes append to `tools/scenario.mjs`. Each lane's scenarios go in one block of its own marked `// Act VI: <lane>` (world, look, engine, systems, combat, progression, assets, story; net's are in `tools/coop.mjs`, under the same rule), appended at the end in the order the lanes land; a lane never edits another's block or the shipped scenarios.

**Text keys from other lanes:** each lane adds the keys it needs (mon.*, hud.*, hint.*, mast.*, set.*) at the end of text.js in a block marked `// Act VI: <lane>`, Greek first; story owns them from D and may reword them. A key a lane needs before it exists reads its English through `tx(key, el, en)` as combat.js does (combat.js:247).

**Audio names from other lanes:** combat and systems call `Audio.sfx(name)` with the names under Audio below; a missing sound is silent until story adds it in D.

## Shared names

These names bind every lane. «lead pick» marks a name or value this contract chooses where the design leaves it open or contradicts itself; it wins over the design. "exists" means the name ships and only gains what is written here.

### Zones, exits, waypoints, readings (world.js, world lane)

**ZONES** (world.js:39), two rows after `farlight`:

| zone | entry |
|---|---|
| drained | `{ level: 34, music: 'drained', ambient: 'drained', atmos: 'drained', act: 6, pack: 'silt', light: 'under', ring: 4.5 }` |
| bottom | `{ level: 37, music: 'bottom', ambient: 'bottom', atmos: 'bottom', act: 6, pack: 'silt', light: 'under', ring: 4.5 }` |

- **Loading.** `READY.silt = { folk: ['frost'], creatures: 'act6' }` (world.js:85); `zonePacks` (world.js:86) gives `['rime', 'silt']` for both. `zoneFolk` (world.js:87) adds `'frost'` to `weep` once `(h.act6 ?? −1) >= 0` (Tamarisk's epilogue), unless the memory check of `unload6` fails it (then her epilogue is Elati's line d.elati.tam6 and nothing loads). Town already loads `frost` from `alkyone` on (world.js:90), so the hook's Tamarisk costs nothing.
- **Seeds.** `seedFor` (world.js:106) keys `drained` and `bottom` by difficulty: `'drained@' + h.diff`, `'bottom@' + h.diff`. `h.wps` keeps the bare ids.
- **Generators.** `createZone` (world.js:116): `else if (id === 'drained') L = genDrained(seed, { mode: drainedMode() }); else if (id === 'bottom') L = genBottom(seed, { mode: bottomMode() });`, then `if (ZONES[id]?.act === 6) act6Layout(id, L)` beside world.js:137, and `if (ZONES[id].act === 6) act6Zone(z)` beside world.js:194.
- **Readings.** Exported from world.js: `drainedMode()` → `'mere' | 'dry'` (`flags.ketosDown`), `bottomMode()` → `'dark' | 'lit'` (`flags.herFire`). `createZone` stores `z.mode` for both (world.js:141); `enterZone`'s `stale` test (world.js:233) adds `(id === 'drained' && z.mode !== drainedMode()) || (id === 'bottom' && z.mode !== bottomMode())`.
- **The trio.** `act6Zone(z)` (build: props, interactables, NPC spots, voices, boss spots; story's `story6Zone(z)` hook), `act6Enter(z)` (every entry: atmosphere by state, ambient, `resetTide(z, { mere: 1.6 })` in `drained` while `!ketosDown` (else `resetTide(z)`), `fireEnter(z)`, `vaultEnter(z)`, the shadow-walls and the Heap's gaps opened from flags, the rite's clock, the checkpoint `cp6`, then `act6Presence(z)`), `act6Presence(z)` (what the story has lit or moved, on every entry and as it moves; story's `people6(z)` hook). `enterZone` calls `act6Enter` beside world.js:259 (`else if (Z.act === 6) act6Enter(z)`). The farlight zone's Act VI dressing (the rope hole, oil fire, winch, the rope exit, Selna, Alkyone, Glaukos and Tern at the hole, the warm glow under the ice after `herFire`, the beam's hold) is laid by **`act6Presence` called from `act5Presence`** (world.js:1200) on every farlight entry «lead pick», since the zone is cached and its layout must not change.
- **The tick.** `updateAct` (world.js:1572) runs `act6Tick(z, dt)` for act-6 zones as it runs `act5Tick` (world.js:1575): the shadow-walls' thinning, the names' clock (`namesTick`, light.js), the bells' cooldowns, the walks.
- **The zone flags** (the `z.act5` generalisation): `act5Zone` (world.js:1065) and `act6Zone` both set **`z.cold = true`** (the Cold runs) and **`z.water = true`** (black or sea water, its creatures, its dial, its wash) «lead pick: set in the zone functions, plain booleans on `z`». `z.act5` stays Act V's state object and Act V's marker; `z.act6` is Act VI's state object (below).

**Exits** (`{ x, z, to, label, locked, at? }`):

| from → to | where | entry |
|---|---|---|
| farlight → drained | the rope hole on the Light's Skerry's core | `{ x, z, to: 'drained', label: 'exit.rope', locked: 'coal6', act6: true }`, pushed once into `z.L.exits` and `z.interact` by `act6Presence` (so an arrival from `drained` finds it). The spot: a thick, walkable cell of `L.spots.core` at least 2.5 m from the door-stone's interact (world.js:1120) and 3 m from `L.spots.selnaPad`; `check-act6` asserts it on 300 farlight seeds «lead pick». Shut line `d.ropeShut` (the `why` map, world.js:475: `coal6: 'd.ropeShut'`) |
| drained → farlight | the rope's foot at the camp | `{ to: 'farlight', label: 'exit.ropeUp' }` |
| drained → bottom | the Well's mouth at the Mere's centre, mode `dry` only | `{ to: 'bottom', label: 'exit.well', locked: 'ketosDown' }`; in mode `mere` there is no exit, and `d.wellShut` is a place voice at the Mere's north edge (`z.voices`, r 4) |
| bottom → drained | the Well's foot | `{ to: 'drained', label: 'exit.well' }` |
| bottom → town | the Gate ring on the Hearth's south rim | `{ to: 'town', at: 'staff', label: 'exit.gateUp', locked: 'herFire' }`; `why`: `herFire: 'd.gateDark'` «lead pick: a new line «Το δαχτυλίδι είναι σκοτεινό.» / "The ring is dark."» |

- **The way home.** `takeExit` (world.js:471) sends `{ at: e.at || z.id }` (world.js:479; today `{ at: z.id }`). `enterZone`'s `at` (world.js:262-272) gains `else if (at === 'staff') at = { x: s.x, z: s.z + 2 }` with `s = z.L.spots.npcs.wayfarer`, where the planted staff stands (world.js:1698-1700); `ending6` asserts the hero within 3 m of it.
- **Waypoints.** `drained` (the Rope) and `bottom` (the Well's Foot), discovered on first arrival by story.js's zoneEnter rule (story.js:164, unchanged); panels.js's list (panels.js:171) appends `'drained', 'bottom'`, their sub-line `wp.drained`, `wp.bottom` as `wp.coast` (panels.js:172). The Gate ring is not a waypoint and the Gate panel never opens it.
- **Checkpoints** (`z.checkpoint`, kept in `flags.cp6[zone]` as `cp5`, world.js:1132): `checkpoint6(z, key)` with keys `camp` (always), `hearth1`-`hearth3` (`hearth6_k`), `wreck0`-`wreck2` (a lit wreck lantern), `lost0`-`lost3` (a lit lost light), `heap` (the Heap's north gap: the Ketos's retry, while `ketosWake && !ketosDown`), `well` (the Well's Foot), `stair` (the Stair's foot: the Shade's retry, while all three `blackLamp` flags and `!shadeDown`) «lead pick: the keys».
- **World lists.** `spawnBoss`'s `first` list (world.js:369) gains `ketos` (+2; the Shade's kinds get +3), and its wake rows (beside world.js:372-377) hold each of the act's bosses until its cine (combat's hook); the champion stand-in (world.js:401) is `'sunken'` for `drained` and `bottom`; `ECHO_PROMPT` (world.js:578) gains `ketos: 'echo.ketos', shade1: 'echo.shade'` «lead pick: the Shade's echo spawns form 1».
- **FAR_BEACONS** (world.js:63) gains indices 7-12, `seed: true`, orange (the default 0xffa040), with the design's offsets: 7 `{ dx: −70, dz: −30, y: 10, peak: true }`, 8 `{ dx: −22, dz: −62, y: 16, peak: true }`, 9 `{ dx: −6, dz: −50, y: 13, peak: true }`, 10 `{ dx: 8, dz: −58, y: 15, peak: true }`, 11 `{ dx: 26, dz: −50, y: 14, peak: true }`, 12 `{ dx: 66, dz: −38, y: 11, peak: true }`. `setFar` (world.js:1637) gives a `peak` no `L.lights` entry (sprite and emitter only). `farFire` (world.js:67) reads its period from **`s.userData.flash`** each frame (set from `o.flash` at creation) instead of the closure, so a live sprite can be held (0) and released. `townFires` (world.js:1624): `lit[4..6] = seaLit` as now, with `userData.flash = call6 && !herFire ? 0 : 12`; `lit[7..12] = (h.act6 ?? −1) >= 0` (lit in the home cine one by one, 1.2 s apart, then every night).
- **The farlight zone, by state:** the Farthest Light's beam (`light5`'s farLight beam, world.js:1191) held facing south (period `Infinity`, theta toward the hole) while `call6 && !herFire`. The ice's glows are the farlight ice mesh's own list (`z.lvl.ice.mesh.userData.glow`, 8 slots of (x, depth, z, k), filled from `L.spots.drowned` and written to `SEA.uGlow` while it draws, sea.js:1371-1381; `uGlowOn` is only the per-frame gate of the shader's loop): after `herFire` the slot after the last Drowned Light (gen5 places 3-4) is a warm, trembling glow at depth 12 under the hole; `nineLit` raises every Drowned Light's k from 1 to 1.6 (look tunes the number), whatever their count on that seed.

### The `z.act5` generalisation (world lane at stage A; the call sites' owners keep them)

Every site that today reads `z.act5` as "an Act V zone" and that Act VI needs reads the new zone flag instead. A site that means Act V's own state (its lights, lamps, cairns, the Skotos's fight) keeps `z.act5`.

| site (HEAD) | today | becomes | why Act VI needs it |
|---|---|---|---|
| cold.js:25 `coldZone` | `!!G.zone?.act5` | `!!G.zone?.cold` | the Cold below the ice |
| cold.js:57 zoneEnter reset | `if (!z?.act5) resetCold()` | `if (!z?.cold) resetCold()` | |
| cold.js:24 `haz()` | `HAZ5[diff]` | the act's row: `(ZONES[G.zone?.id]?.act === 6 ? HAZ6 : HAZ5)[diff]` (same `cold`, `frost` columns) | |
| hud.js:170 the amber/Cold slot | `!!G.zone?.act5` | `!!G.zone?.cold` | |
| hud.js:243 the tide dial | `G.zone?.act5 && ...` | `G.zone?.water && ...` | |
| hud.js:384-393 questGoal (`goal5`) | Act V's lights, door | unchanged; story adds `goal6` beside `goal5` (hud.js:374) | |
| hud.js:467-468 beam bell, lamp snuff sounds | `G.zone?.act5` | the snuff's (:468) `G.zone?.water`; the beam's (:467) unchanged | the Ketlings snuff lanterns |
| overlay.js:111 the frost overlay | `!!G.zone?.act5` | `!!G.zone?.cold` | |
| actors.js:160 the act's blows | `if (G.zone?.act5) dmg *= HAZ5[diff]?.dmg` | `const H = ZONES[G.zone?.id]?.act === 6 ? HAZ6 : G.zone?.act5 ? HAZ5 : null; if (H) dmg *= H[diff]?.dmg ?? 1` | HAZ6.dmg |
| actors.js:215 dormant packs | `G.zone?.act5 && pk && 'dormant' in pk` | `G.zone?.water && ...` | gen6's packs say `dormant` |
| ai.js:115 `waterTick` | `if (G.zone.act5)` | `if (G.zone.water)` | swimmers, the Sunken in shallows, the Icemaw, the Ketos, the Ketlings |
| ai.js:163 `shadeTick` | `if (G.zone.act5)` | `if (G.zone.water)` | the Icemaw's dark trail under the black water |
| tide.js:94 `tickWash` | `if (z?.act5)` | `if (z?.water)` | pickups washed off closing cells |
| sap.js:169 `placeCasks` | `if (z?.act5)` | `if (z?.water)` | the whale-oil casks at the Heap and the Hearth (it reads only `L.spots.casks`, sap.js:153: gen6 writes that list in both zones) |
| build.js:1431 the ground's defines | `v5: !!cfg.act5` | unchanged; Act VI's ground passes its own `cfg.act6` and the X6 set (Visuals) | |
| build.js:1188 the Act V ground beds | `ACT5.has(L.type)` | `ACT5.has(L.type) \|\| ACT6.has(L.type)` for `groundBeds`, `tidal5` and `vbay` only (G_WET needs `aBed`; `vbay` is `bayCorners(L)`, built in `drained` from the Mere's cells: The Black Water) | |
| coop.js:624 the lit things `l` | `z.act5 && z.id === 'farlight'` | unchanged for farlight; Act VI's masks are their own (Co-op) | |
| world.js:320 `storyOpenings` | farlight's holes | unchanged; Act VI's openings added below it (Co-op) | |
| world.js:1575 `updateAct` | `act5Tick` | `if (z?.act6 && pl) { act6Tick(z, dt); return; }` beside it | |
| world.js:247-248 `WIND.uSnow`, `SEA.sky` | `Z.act === 5` | unchanged (no snow and no aurora dome below the ice) | |
| world.js:361 the place voices' mute | `act === 5 ? ...` | gains `act === 6 ? !!F.herFire` | the Skotos's voices stop once her fire burns |
| story.js:1785 `enter5` | Act V's catch-ups | story adds `enter6(id, z)` after it (story.js:208) | |

**Unchanged** (they mean Act V's own state): world.js:320-321, 1141, 1170, 1175, 1201, 1235, 1345, 1467-1468, 1480; story.js:1246, 1283, 1502, 1516, 1588, 1619-1620, 1694, 1734; ai.js:4254, 4282, 4352, 4394, 4422, 4456, 4485, 4493; hud.js:384-393, 467; coop.js:624, 1071 (`lit5`); tide.js:116 (the bell on `z.act5.bell`).

`carry` and `blackwater` assert that the Cold builds and the dial shows in `drained`; `regress-A` asserts the coast and the farlight unchanged.

### The level object L (gen6.js, world lane)

`genDrained(seed, { mode })` and `genBottom(seed, { mode })`: 24 tries at seed + k·7919, the last accepted (gen5's loop); `L.tries` for check-act6's mean.

| field | type | meaning |
|---|---|---|
| `L.type` | `'drained'` \| `'bottom'` | |
| `L.w`, `L.h` | | drained 112 × 176, bottom 104 × 200; north is z 0 |
| `L.mode` | `'mere'` \| `'dry'`; `'dark'` \| `'lit'` | the reading built |
| `L.tries` | number | |
| `L.cells`, `L.low`, `L.paint`, `L.hgt`, `L.props`, `L.lights`, `L.exits`, `L.packs`, `L.start`, `L.boss`, `L.spots` | as gen5 | `L.lights` holds only Act VI's true lights that burn from build (braziers, fire-pots, the camp fires); `L.boss` the arena `{ x, z, r }` (the Heap r 20; the Hearth r 14) |
| `L.bed` | Float32 w·h | metres, quantised to 0.15; `BED_DRY` (genlib.js:6) for dry ground; the pockets and the Mere the only non-dry cells (gen5's names and sentinel, so tide.js, the water's `aBed` and G_WET read them as they are) |
| `L.vbed` | Float32 (w+1)·(h+1) | each corner's bed (the `aBed` attribute), as gen5 |
| `L.pocket` | Uint8 w·h | 1 a breathing pocket (the clock), 2 the Mere (its own level: the boss's water, The Black Water) |
| `L.vault` | Uint8 w·h | the vault patch a cell lies under (the low, thin vault: icicles): 0 none, 1..n the patch's id (n ≤ 255) |
| `L.keel` | Uint8 w·h | ice keels' footprints (blocked) |
| `L.thick`, `L.window`, `L.deck`, `L.sea` | Uint8 w·h, **zero-filled** | Act V's arrays, present so their readers work; never set |
| `L.ice` | **undefined** | so `buildLevel` builds no ice mesh (build.js:3118) and ice.js never ticks |
| `L.tideCfg` | `{ phases: [40, 27, 26, 27], stepT: 4.5, hMax: 0.9 }` | the Black Water's clock on Warden (tide.js scales it, below) |
| `L.stamps` | bottom only: `[{ kind: 'crypt' \| 'forest', x0, z0, w, h, flipZ: true, rooms, trail, door: {x,z}, end: {x,z} }]` | the windows `stamp()` laid |
| `L.walls` | bottom only: `[{ k: 0 \| 1 \| 2, cells: [[ix,iz]...] }]` | the Stair's three shadow-walls (3 × 14 cells each), closed at build, opened by `blackLamp<k>` |
| `L.gaps` | drained only: `[{ id: 'east' \| 'west', cells }]` | the Heap's 3-cell plugs, closed at `ketosWake` while `!ketosDown` |
| `L.refuges` | `[{ x, z, r }]` | every basin's dry refuge of 3 × 3 or more (tide.js's lane) |
| `L.spots.vaults` | `[{ id, x, z, r, n }]` | each vault patch: its id in `L.vault`, centre, radius, cell count (`vaultAt`'s once-per-patch rule and the high water's falls read them; check-act6 asserts one row per id, every cell of a patch within its r of its centre) |

**The Black Water's readers: the `L.ice?.` guard.** A layout with zero-filled `thick`, `window`, `deck`, `sea` and no `L.ice` throws at these unguarded reads, each of which becomes `L.ice?.[i]`: gen5.js:39 (`tidal`), gen5.js:774 (`firm`, through `refugeNear`), gen5.js:787 (`spineWhole`'s `okC`, for gen6's reach checks), gen5.js:856 (`flatSpot`, the huts, boats and kelp), build.js:1162 (`groundBeds`), build.js:1209 (`tidal5`), sea.js:809 (`buildSea`'s open cells). The world lane greps `L\.ice\[` over `src/` at stage A and guards any other reader an Act VI layout reaches (ice.js's readers are never reached: `z.ice` is never made); `regress-A` checks the coast's and farlight's frames unchanged (`perf5`, `coast`, `cast5`), and `blackwater` asserts no ice mesh in either zone.

**Drained spots** (`L.spots`; areas and positions are the design's Zones section):

| spot | shape | what |
|---|---|---|
| `camp` | {x,z,r: 9} | the Rope (56 ± 6, 18 ± 3), dry |
| `rope`, `waypoint` | {x,z} | the rope's foot (the exit up and the arrival cine); the waypoint beside it |
| `npcs` | `{ glaukos, tamarisk, brazier, heapRim: {x,z}, mere: {x,z} }` | the camp's two; Glaukos's spot on the Heap's north rim; his listening spot by the Mere after the fight |
| `sky` | [{x,z,r}] | skylights, r 3-5 (one of r 6 over the camp) |
| `trail` | [{x,z,rot}] 60-120 | the First's marks (decals), on dry cells only |
| `hearths` | [{ k: 1 \| 2 \| 3, x, z }] | the First's hearths: k 1 the Old Shore, 2 the Hollows' island, 3 the Keels |
| `lost` | [{ id: 'galini' \| 'twins' \| 'kranea' \| 'psamathe', x, z, rot, lamp: {x,z} }] | the toppled lights; `lamp` the lantern end (the interact, on a dry cell) |
| `sailor`, `asger` | {x,z,rot}; `{ x, z, rot, keel: {x,z,r}, brazier: {x,z} }` | the Sailor's deck; Asger's keel and its brazier |
| `lures` | [{x,z,bait: {x,z}}] | Falselight posts and their bait spots |
| `braziers` | [{x,z}] | Tamarisk's whale-oil braziers (true light r 4, from build), one on the Heap's north rim |
| `heap` | `{ x, z, r: 20, gap: {x,z} }` | the Wreck Heap; `gap` its north gap (the retry checkpoint) |
| `mere` | `{ x, z, r: 10, core: 5, lure: {x,z} }` | the Black Mere; the lure-rock at r 6 on its north side |
| `wreckLamps` | [{ i: 0 \| 1 \| 2, x, z, keyx: bool }] | at r 14 and 120°; `keyx` the one nearest the north gap |
| `bells` | [{ i, x, z, lamp: 0 \| 1 \| 2 }] ×2 | 3.2 m along the shore from their lantern, inside its r 4 pool, never within 3 m of its interact |
| `casks` | [{x,z}] ×4 | the shipped `placeCasks` (sap.js:153) reads `L.spots.casks` |
| `well` | {x,z,r: 2} | the Mere's centre: the Well's mouth (mode `dry`) |
| `arch` | `{ x, z, rot, cells }` | the Ketos's neck (2 × 14 blocked cells), mode `dry` |
| `keels` | [{x,z,r}] | 14-22 |
| `huts`, `boats`, `kelp` | as gen5's | dressing |
| `voices` | [{x,z,r,key}] ×5 | d.skotos6.w1-w4 (+ w4.r for the Ranger through `rl()`) |

**Bottom spots:**

| spot | shape | what |
|---|---|---|
| `camp`, `well`, `waypoint` | {x,z,r: 8}; {x,z} | the Well's Foot (52 ± 4, 16 ± 2); the exit up; the waypoint |
| `pit` | {x,z} | the Saltborn fire-pit Glaukos lights from the Cradle on arrival |
| `pots` | [{x,z}] | Glaukos's fire-pots (true light r 3, from build: the 15 m rule's lights) |
| `lamps` | [{ k: 0 \| 1 \| 2, x, z, place: 'barrow' \| 'wood' \| 'village', wall: k }] | the black lamps; k 2 is in Keyx's hand |
| `ember` | `{ x, z, pane: {x,z,rot} }` | the crypt stamp's smallest leaf room |
| `leif`, `glade` | `{ x, z, r: 4, fire: {x,z} }`; `{ x, z, r: 5 }` | carved by gen6 off the forest stamp's trail |
| `keyx` | `{ x, z, well: {x,z}, pool: {x,z,r: 4} }` | the village square's sunken well and the pocket he walks into |
| `houses` | [{x,z,rot,tilt,sink}] 6-8 | village.glb houses (boot), tilted and sunk |
| `chores` | [{x,z,rot,clip}] | the Faded's chores in the village |
| `stair` | `{ z0: 144, z1: 160, pools: [{x,z,r: 2.5}] ×2, foot: {x,z} }` | the Shadow Stair; `foot` the Shade's retry checkpoint |
| `hearth` | `{ x, z, r: 14, fire: {x,z}, first: {x,z,rot}, stones: [{i,x,z}] ×4, niches: [{id,x,z}] ×7, pools: [{x,z,r: 4}] ×2, casks: [{x,z}] ×4, ring: {x,z,rot} }` | the First's Hearth; `niches` ids in the Lost's order (galini, twins, kranea, psamathe, sailor, asger, leif) |
| `casks` | [{x,z}] ×4 | the Hearth's four again (the same objects as `hearth.casks`): `placeCasks` reads only `L.spots.casks` (sap.js:153) |
| `voices` | [{x,z,r,key}] ×3 | d.skotos6.w5-w7 |

**`stamp(L, sub, x0, z0, o)`** (gen6.js): copies a sub-layout's cells, paint, walls and props into the window `[x0, x0 + sub.w) × [z0, z0 + sub.h)`, `o.flipZ` mirroring it north-south; the window is sized from `sub.w`, `sub.h`. It drops `sub.exits`, `sub.packs`, `sub.boss`, `sub.spots.waypoint`, `shrines`, `chests`, every `sub.lights` entry and every prop that draws a light of its own (mounted torches, braziers, candles, campfires, glowing mushrooms: a list `LIT_PROPS` in gen6.js «lead pick»); it keeps `rooms` and `trail` (remapped) in `L.stamps`. The crypt: `genCrypt(seed ^ 0xB0770, { mw: 14, mh: 26, rooms: 6 })` (gen.js:211), 42 × 78; the wood: `genForest(seed ^ 0xF0E57, { w: 42, h: 78 })` (gen.js:64), 42 × 78; a sub-layout that fails its own reach, or a crypt with no leaf room, is redrawn with seed + 1. **gen.js does not change** (`gate6` asserts the Gates' layouts identical).

**check-act6.mjs** (check-act5's shape): 300 seeds per zone and mode (`mere`, `dry`; `dark`, `lit`), hard and soft sets, exit 1 on a hard failure, the mean tries per seed (above 3 a soft failure). The hard failures are the design's (Zones: reach checks for both zones), plus: the rope hole's spot on 300 farlight seeds (above); `L.ice` defined; any `L.pocket` cell without a bed below `BED_DRY`.

### Light: the Carried Fire, true and false light (light.js, systems; look's hooks)

- **The kind.** `lightKind()` (light.js:34) returns `'under'` for both zones from ZONES; `LIGHT.force = 'under'` turns Act VI's rules on anywhere for tests. `shroudOn()` (light.js:40) becomes `kind === 'ember' || kind === 'under'`. `drink()` (light.js:308) and the swell stay `'ember'`-only (the `ember()` test, light.js:41). `addLightPool`'s snow look (light.js:138) stays `'sea'`-only.
- **The Shroud in 'under' zones** (combat.js:243, systems' one hook): the test reads `(def.shroud || a.shrouded || (lightKind() === 'under' && def.unlit)) && !(a.unshroud > 0) && shroudOn()`, and its factor `0.3` reads `shroudK()` = `HAZ6[diff].shroud` in act-6 zones, 0.3 elsewhere (Act IV unchanged). A hit inside light in an 'under' zone also adds the vulnerability `revealed` for 3 s (the design's table; balance may drop it).

```
FIRE = { r, max, state: 'full' | 'dim' | 'out', t }   the page's own hero's ring (metres), live; state Dim below 1.5, Out at 0
fireOn()            lightKind() === 'under'
fireMax()           ZONES[id].ring x (1 + lampBonus() / 100): 4.5 m with the Lamplight track at 0
fireDrain(v, o)     r -= v x HAZ6[diff].coal (x 0.5 with the Lure-bone, never below 1.5 with the Shade's Ring); o.src for the log
fireFill(v)         r += v, never past FIRE.max; true light only
fireRelight()       Out -> 2.5 m, toast q.fireBack, bus 'fireBack'
fireEnter(z)        on every act-6 entry: FIRE.r = FIRE.max (a fresh coal from the camp), state 'full' «lead pick»
flareRing(r, t)     the ring drawn and counted at r for t s (War Cry 8 m, 3 s); never through S.over
ringOf(a)           the radius a hero's ring lights with: G.player -> FIRE.r (or a flare) + the chain; a remote stand-in -> a.ringR + the chain
setRemoteLight(a, r, pools)   another hero's ring radius and its up to three light pools, from its presence or the host's snapshot (net)
namesTick(z, dt)    the Names from Above's clock (drained only; below)
```

- **Where the ring is used.** `heroLightR()` (light.js:92) returns `ringOf(G.player)` in 'under' zones (a boss's `S.over` still wins elsewhere and is never set below the ice). `LIGHT.base` (light.js:348) reads `fireMax()` there. `lightAt` (light.js:47) counts `G.player`'s ring and every `NET.remotes` stand-in's `ringOf(a)` (on the host the guests, on a guest the host and the other guests), and every remote light pool `setRemoteLight` holds; `o.ring === false` still leaves out the page's own ring only. **The lantern chain:** `ringOf` adds 1 m for each other living hero within 6 m (at most +2 m); `FIRE.r` itself never changes for it.
- **Out** (r 0): the ring hidden; the hero's own light 4 m, written in `tickLight` after its shipped line (light.js:393) as `R.heroLight.distance = 4` while `FIRE.state === 'out'`, **never through `setHeroLight`** (it sets `S.over`, light.js:97, and `fireAt`'s boss-dark rule, light.js:69-70, would stop counting a Mage's burning ground). Cold gains doubled (cold.js reads `FIRE.state`); every `unlit` foe Shrouded wherever it stands; the Faded unseen; toast q.fireOut, bus 'fireOut'. Relight: a 1 s touch (`touch(1, it, y, done, { take: true })`, world.js:897) at any lit true light → `fireRelight()`; a Lampbearer's death relights it too.
- **Drains and fills** (each drain × HAZ6.coal; each fill as the table, × HAZ6.refill / 1.5 for standing in true light): the design's two tables (Mechanics: the Carried Fire) are the contract's. A pool counts as "true lamp light" for filling when `lampLightAt` (light.js:77) answers for it; skylights fill at 0.3 m/s through their `sky: true` pools; a burning cask is a fire area (`fireAt`, light.js:69).
- **Pool options** (`addLightPool(x, z, r, dur, tag, o)`, light.js:137; look adds them at A, systems keeps them):

| option | meaning |
|---|---|
| `o.tremble` (default: `o.lamp === true`) | true light: radius ±8% and the decal's intensity ±10% from band-limited noise in 3-7 Hz, a seed per pool (`p.seed`), never summed sines; with `G.settings.flicker` on ('reduce flicker', below), ±3% radius and no intensity swing. In `tickLight`'s pool loop (light.js:352-364) it replaces the shipped ±8% sine (light.js:362) for trembling pools |
| `o.fake: true` | false light: `lightAt`, `lampLightAt`, `warmAt` and the fills skip it; no disc pulse (the light.js:362 sine skipped); a hard rim; `o.core` |
| `o.light === false` | the decal without a pooled PointLight (`addLight` not called); false pools, skylights, the named niches and the peaks' far fires use it |
| `o.core: 'dark'` | `discMesh` (light.js:263) builds a two-layer disc: a normal-blended dark core (black-violet) under the additive rim (0x8a70ff), since an additive black draws nothing |
| `o.sky: true` | a skylight's pool (fills at 0.3 m/s, Cold −6/s, dims to half radius for 10 s at each high water) |

- **Lit things.** Act VI's lit interactables carry `it.lit && it.lightR` as Act V's do, so `lampAt` and `lampLightAt` count them: hearths r 6, braziers r 4, fire-pots r 3, hearthstones r 4, lost lights r 4, wreck lanterns r 4, named niches r 3 (as `light: false` pools), the centre fire r 5 (r 8 in its Flare), Keyx's lantern at the belt (a moving `tremble` pool r 1.5 that lights nothing for the rules: a look). Black lamps and the lures are `fake` pools and never `it.lit`.
- **Moving pools** (the wolf's lantern r 3.5, The Pack's three of r 2, The Alpha's r 5, Dawnbreaker's waves and the Ray of Dawn for 1 s along their path, a Bulwark ward's r 3): plain pools whose `x, z` the skill's own tick moves (the beam-pool pattern, light.js:177), `tremble: true`, `light: false` but the wolf's (it carries a PointLight, so it competes in the pool as a lamp).
- **Photosensitivity.** The tremble's luminance swing stays under 10% of maximum relative luminance on a hearth's r 6 pool at the gameplay camera (measured at G1, with and without 'reduce flicker'); the dark's telegraph rim pulses at 2 Hz (under 3 flashes a second).
- **'Reduce flicker'** (look, A; nothing ships it today): `G.settings.flicker` (true: reduced; default `false`, a hook in state.js:12), saved with the other settings; a Settings row `set.flicker` «Λιγότερο τρεμόπαιγμα» / "Reduce flicker" with the On/Off chips (a hook in panels.js `settings()`, File ownership); `tickLight`'s pool loop reads it each frame. It cuts only the pools' tremble; the sparks, the flame's sway and the sound stay.

### Visuals (look lane, stage A)

- **build.js:** `ACT6 = new Set(['drained', 'bottom'])` beside `ACT5` (build.js:2314); `ground6(type)` beside `ground5` (build.js:1123), its layers `'silt/silt'` (A and P, `dual`), `'rime/shore'` (B), `'silt/iceWall'` (W), each a chain ending in a boot layer (Expected assets); the X6 defines (`G_WET` on; `G_AUR`, `G_GLINT`, `G_WIN`, `G_EDGE` off) compiled per zone as X5's are (build.js:1431); in `buildLevel` (build.js:3107) `if (ACT6.has(L.type)) act6Level(L, I, B, out)` and `buildSea` over `L.pocket` cells only (its existing `L.bed` test, build.js:3117-3118, already builds it; `L.ice` stays undefined).
- **build6.js:** `act6Level(L, I, B, out)` places `L.props` (`t` a rime or silt prop through `packProp`, env.js:27; the boot sets' props for the stamped crypt and wood under the `'drowned:'` Instancer material prefix, black-blue, roughness 0.3, rime on top faces), and **`act6Prop(kind, o)`**, a `THREE.Object3D` with `userData.kind = kind` and a code fallback for every part:

| kind | userData |
|---|---|
| `hearth6` (a hearth ring of black stones, Act V's cairn builder) | `setLit(b)`, `fireY` |
| `brazier6` (whale-oil brazier; ×0.7 as Glaukos's fire-pot, `o.pot`) | `setLit(b)`, `fireY` |
| `blackLamp` (an iron cage on a pole: a normal-blended black-violet core sprite under an additive 0x8a70ff rim sprite, no light source) | `setLit(b)` (out: the cage dark), `flare(k)` |
| `shadowWall` (40 dark alpha particles over the band and a dark decal strip) | `thin(dur, done)` |
| `keel` (an env rock stretched tall in the `'icy:'` material, rime icicles round its top) | — |
| `skylight` (motes in a column, the decal is light.js's) | `dim(k)` |
| `toppledLight` (towerA/B/C on its side, `extras.top` as the lantern end) | `setLit(b)`, `fireY` |
| `stiltFrame`, `ropeWinch` (the rope, the winch post, the hole's oil fire) | — ; `setFire(b)` |
| `gateRing` (a black stone torus r 2.6, rune emissive, the Shadow Gate exit's ring fx) | `setWarm(k)` |
| `neckArch` (the Ketos's neck held in its `settle` pose as a static prop, or a code arch) | — |
| `hearthStone`, `nameLamp` (a rim niche with its name decal in the name-stone style, `o.id`) | `setLit(b)`, `fireY`; `setLit(b)` |
| `wreckLantern` (the rime `oilLamp` on a mast stump; `o.keyx` the carved gunwale decal) | `setLit(b)`, `fireY` |
| `shipBell` (a lathe bell in the bronze material) | `ring(k)` |
| `lurePost` (a dead lamp on a post) | — |
| `garland` (instanced tori in a dried-flower tint) | — |
| `emberPane` (a pane of clear ice with the ember sprite 0xff5a2a) | `setGlow(k)` (0: out) |
| `keyxLantern` (the true-flicker code lantern) | `setLit(b)` |
| `bird` (the 12-triangle blue bird on a spline) | `fly(path, dur, done)` |

- **sea.js:** define `SEA_BLACK` in `seaMat` (no aurora reflection, no light paths, no moon glint; the 0.45 m depth step and the edge kept) and its slush crust from `SEA.tSlush` «lead pick: an R8 w × h texture, 1 a slush cell, written by tide.js»; define `ICE_VAULT` on `iceMat` for the cinematics' vault quad (120 × 180 m at y 14, hidden while the camera pitch is above 0.4); the `L.ice?.` guard at sea.js:809. **The Mere's water:** `bayCorners(L)` (sea.js:616, coast-only today) also answers for `drained`, from the cells with `L.pocket[i] === 2` (cached as `L.bay5`), so the water's `aBay` (sea.js:872) and the ground's `vbay` (build.js:1188) stand the Mere at `SEA.uBayLevel` while every other pocket stands at `uLevel` (The Black Water); `bottom` has no Mere and gets `null`.
- **fx.js:** the **'dark' telegraph**: `teleCircle`, `teleCone` and `teleLine` (fx.js:303, :308, :313) take the colour `'dark'` (the string) and draw a normal-blended darkening core under a bright 0x8a70ff rim pulsing at 2 Hz, since `teleMat` is additive (fx.js:299) «lead pick: a colour value, so the co-op mirror (coop.js:1424 FXN) carries it with no new code». The grey-violet of the Shade's mirror moves is the colour `0x8a7aa8` (an ordinary additive telegraph). Ambients `drained`, `bottom`, `thaw` in a set `AMB6` beside `AMB5` (fx.js:612); emitters `motes` (silt, black motes rising), `drips` (the vault's, white), `emberMotes` (the Gate ring); `footprint` (fx.js:687) reused for the Faded; `breath` (fx.js:632) reused.
- **atmos.js:** `ATMOS.drained`, `drainedCine`, `mere`, `bottom`, `hearthDark`, `bottomLit`, with the design's numbers; hemi drift through the shipped `drift` key.
- **The Faded's look:** people.js's `uDissolve` (people.js:94) at 0.85 outside light with `uBurn` black (no ember edge), a tint toward the fog colour and Act IV's smoke; materials stay opaque. The marks: the decal pool's alpha × smoothstep on the distance to the hero against `uFireR` «lead pick: a shared uniform object `FIRE_U = { uFireR, uFireP }` exported from light.js, written in `tickLight`».

### The Black Water (tide.js, systems)

- **The zone config.** A layout with `L.tideCfg` runs the clock from it: `phases` and `stepT` × `k = HAZ6[diff].tide / 120` (150 s on Wanderer: [50, 33.75, 32.5, 33.75] and 5.625 s), `TOP = round(hMax / TIDE_STEP)` (6, genlib.js:64) in place of the constant 8 (tide.js:32); the bell's lead is `HAZ6.groan`, its sound `iceGroan` in place of `tideBell` (tide.js:116); the bus events `'tideBell'` and `'tideTurn'` are unchanged (the HUD dial pulses violet in act-6 zones). The wash-out is `HAZ6.wash`. `haz()` (tide.js:40) returns this merged row in act-6 zones.
- **The Mere's own level** «lead pick: a second level on Act V's bay channel, not a force». In tide.js a force *replaces* the clock: `tick` runs either its `T.force` branch or the clock's (tide.js:100-118); the steps, `tideBell` and `tideTurn` live in the clock's; `tideDial` (tide.js:356), `floodWave` (tide.js:364) and `safeOf` read `T.force`; `levelAt` (tide.js:60) gives every non-bay cell the one `T.h`. So **`T.force` stays the Walking Tower's and is never set in an act-6 zone**; the clock always runs below the ice, and the Mere has its own level beside it:
  - **The channel.** `cellsOf` (tide.js:47) builds `z.tideC.bay` from `L.pocket[i] === 2` in act-6 zones (from `inBay`, gen5.js:41, on the coast, unchanged).
  - **The force.** `TIDE.mere = { h, rate }` (null: none). Its grid level `T.mstep` / `T.mh = lv(T.mstep)` (0 when there is no Mere, so Act V reads as it does) moves one 0.15 m step each 0.15 / rate s toward `mere.h`, at most one a frame, in its own batch (`stepTo(z, k, true)`: the bay cells only, with the same shelter, lane, wash-out and evict rules); the clock's steps never touch a bay cell. `deepAt` and `levelAt` read, for a bay cell, `T.force ? T.h : T.mh` (its step `T.mstep`); for any other cell `T.h` as shipped. `safeOf`'s mask counts a bay cell as ground the water never takes only when its `thr` is above the Mere's top (`max(T.mstep, mere.h's step)`), its key gaining that top. `T.mu` is the Mere's seen level, ahead of or behind its grid as `T.u` is for the clock's.
  - **The look.** `SEA.uLevel` and `uWetLevel` follow the clock (`T.u`, `T.wet`) as shipped; `BAY` (`SEA.uBayLevel`, tide.js:37) is written `T.force ? T.u : T.mu` (Act V's line, tide.js:127, with 0 replaced by `T.mu`), read over the Mere's `aBay` and `vbay` (Visuals). `tideDial`, `floodWave`, the groan (`iceGroan`), `tideBell`, `tideTurn` and `Audio.mood({ tide })` follow the clock, never the Mere.
  - **Its life.** `resetTide(z, o)` (every entry) sets the Mere's step from `o.mere` (metres; 0 when absent) in the same batch as the clock's low water, and `TIDE.mere = o.mere ? { h: o.mere, rate: 0.3 } : null`; `act6Enter` passes `{ mere: 1.6 }` in `drained` while `!ketosDown`. In the fight the Ketos sets `TIDE.mere.h` down in three 0.25 m steps to 0.85 (one a second inside the arena, the grid following at `rate`); at its death `{ h: 0, rate: 0.3 }`, and null once its step is 0: the Mere's cells then stay at 0 under the clock, as Skerry Bay's do, for good. A reset (the retry from the three lanterns) sets `{ h: 1.6, rate: 2 }`.
  - **Asserted** by `blackwater`: the pockets (`L.pocket` 1) rise and fall with the clock while the Mere holds at 1.6; `uLevel` and `uBayLevel` apart; the dial's phase and the groan on the clock's times.
- **Slush:** `slushAt(x, z, r, t)` sets the cells in r to wading for t s whatever the level (Frost Nova and its variants 8 s, r 5.5; Frozen Orb 6 s, r 1.2, one call each 1.2 m of its trail); its own list of calls `{ id, x, z, r, end }` and their expiry, ticked in `tickTide`; walkability changes through `map.change` batched at most every 0.25 s (`map.ver` ≤ 4 bumps a second with the shards); the lane rule guards a hero when slush thaws under her (6 s of grace).
- **Co-op cells:** `cells6(z)` → `{ key, d: { s: [[ix, iz, t]...], l: [[x, z, r, t]...] } }` and `cells6Apply(z, d)` on a guest, both in **tide.js** «lead pick: one module for both kinds; it reads forge.js's exported shard list `SHARDS`». `s` the shards live (a cell each, `t` the tenths of a second left); `l` **the slush as its calls**, not its cells (`x`, `z`, `r` each `q(v, 10)`, `t` tenths left), so one Nova is one entry of about 20 bytes where its ~95 cells as triples were about 1.1 KB. `key` hashes the shards' and calls' ids, never `t`, so it changes only when one is added or ends. `cells6Apply` makes the guest's own slush calls and shards with their time left and changes its map in one batch. They ride the `i` topic (Co-op).

### The Ice Overhead (forge.js, systems)

- **`drip(x, z, r, dur, o)`** exported from forge.js, `slag()` (forge.js:136) rebuilt on it: `o.color` (white 0xe8f4ff for ice), `o.mult` (the zone blow × HAZ6.icicle), `o.cold` (+10), `o.burn` (slag's), `o.onLand(x, z)`, `o.shard` (a rime `icicle` shard prop left blocked on its cell for 20 s). It damages **every hero inside** through `heroes()` (net/state.js:19; `damage` routes a guest's stand-in to `hurtRemote`, combat.js:50), not only `G.player` (forge.js:145), and monsters inside take 8% of their life and a 1.5 s stun (`stunned` vulnerability ×1.5; the troll form 3 s).
- **`vaultAt(x, z, r, n)`**: n icicles on random `L.vault` cells within r + 1; at most one fall per vault patch (its id in `L.vault`) every 4 s. Called at the thirteen ice call sites of the skills when `lightKind() === 'under'` instead of `crackAt`/`crackLine`/`crackRing` (skills.js:235, 265, 298, 338, 414; skillsx.js:185, 282, 367, 383, 421, 441, 463, 519; combat's lines), with the design's counts; by monster slams (1); by the troll form's Vault Slam (3-5); at the start of each high water one per patch whose centre (`L.spots.vaults`) is within 20 m of the hero. A Gate-Fallen killed under a shard stays down.
- **`vaultEnter(z)`**: the shards cleared on entry. The skylights are `act6Zone`'s pools with `sky: true`. The shards (`SHARDS`, exported for `cells6`) and the falls' warnings tick in forge.js's own `tickDrips(dt)`, called from the first line of `tickFlues` (forge.js:53), before its no-flues return.

### The Names from Above (light.js `namesTick`, systems; story.js `rollNames6`)

```
NAMES = { t, on, end, list }   the clock (drained only), every HAZ6.namesEvery s, offset 30 s from the black water's rise
namesTick(z, dt)               from act6Tick: the low bell (sfx 'nameBell'), then bus 'namesFall' (z, list); the window
                               HAZ6.namesBase + 0.5 x min(4, flags.names.length) s from the first name; bus 'namesEnd'
rollNames6(after)              story.js: the list (after = the act is done)
```
`rollNames6(after)`, written once: `[F.nameBack ? 'name.first6' : 'name.first', 'name.einar', 'name.arna', ...(F.names || []).map((id) => 'name.' + id), 'name.ivar', 'name.isarn', ...F.lost6.map((id) => 'name.' + id), ...(after ? Array(Math.min(3, h.gateFound | 0)).fill('name.someone') : []), 'name.skotos', ...(after ? ['name.goodnight'] : [])]`, with `F.lost6` the Lost in the order freed (ids `galini`, `twins`, `kranea`, `psamathe`, `sailor`, `asger`, `leif`; `name.sailor` ships). During the window every hero's ring fills at `HAZ6.refill` m/s (on the host its guests' through their own pages: the window's start and end ride the snapshot, Co-op), every `listens` foe stops 3 s face up, Revealed and solid, once per window, and every `unlit` foe in the zone is Revealed (`a.revealed`, and the vulnerability `revealed`) for the window. The clock pauses while `G.bossActor` is set. The names fall as floating `say` lines 0.8 s apart (story's look, D; until then systems emits them as plain `say`). After the act, Selna's rite at the tower (world.js:1489-1491, every 90 s) says `rollNames6(true)` instead of `rollNames(true)` (story.js:1746).

### The Cold (cold.js, systems)

Unchanged rules; `coldZone()` and its reset read `z.cold` (table above); `haz()` the act's row. Sources below: wading +4/s (`pl.inWater`), the wash-out +20, a Black Flare +15 (`o.cold`), the Lampbearer's lantern blow +8, an icicle +10; every gain doubled while `FIRE.state === 'out'`. Sinks: −3/s dry, −12/s in `warmAt` (light.js:83, which counts every lit Act VI lamp kind and never a `fake` pool), −6/s in a skylight, −8/s in a fire area.

### Who ticks what each frame (no new call site)

boot.js's loop (boot.js:306-311) runs `updatePlayer` → `updateActors` → `updatePacks`, `updateAct` → `updateProjs`, `updateAreas`. Act VI's clocks sit inside ticks that already run there:
1. **`tickLight`** (player.js:153, inside `updatePlayer`): the Carried Fire's per-second drains and fills (wading −0.15 m/s, true light, skylights, the names' window), then its Dim and Out turns (bus `fireDim`, `fireOut`), `FIRE_U`, the pools' tremble. It runs **before `tickCold`** (player.js:154), which reads `FIRE.state` the same frame.
2. **`updateActors`**: the foes' drains (a Drink, a snap, a Gnaw) call `fireDrain` as they land.
3. **`act6Tick`** (from `updateAct`, world.js:1575): `namesTick`, the shadow-walls' thinning, the bells' cooldowns, the walks.
4. **`updateAreas`** (projectiles.js:219): `tickFlues` → its first line `tickDrips` (the shards' 20 s, the falls; forge.js), then **`tickTide`** (projectiles.js:225: the clock, the Mere's level, the slush's expiry and its batched `map.change`), then `tickIce` (idle below the ice).

No lane adds a line to player.js, projectiles.js or boot.js's loop for this.

### Combat (combat lane)

**HAZ6** (data.js, beside HAZ5 at data.js:34; indexed like DIFFS 0-5):

```
const H6 = (o) => Object.assign({ tide: 120, groan: 6, wash: 6, coal: 1, refill: 1.5, shroud: 0.3, icicle: 0.9, lampT: 2.0, bait: 0.8,
  namesEvery: 90, namesBase: 5, cold: 1, frost: 5, reveal: 1.25, bossCd: 1, adds: 0, dmg: 1 }, o);
export const HAZ6 = [
  H6({ tide: 150, groan: 8, wash: 3, coal: 0.6, refill: 2.0, shroud: 0.45, icicle: 0.6, lampT: 1.6, bait: 1.2, namesEvery: 75, namesBase: 6, cold: 0.8, frost: 2.5, reveal: 1.35, dmg: 1.5 }),
  H6({}), H6({}),
  H6({ wash: 8, coal: 1.15, refill: 1.4, icicle: 1.0, namesEvery: 100, cold: 1.15, frost: 6, bossCd: 0.9, adds: 1 }),
  H6({ tide: 110, wash: 10, coal: 1.3, refill: 1.3, icicle: 1.1, lampT: 2.2, bait: 0.7, namesEvery: 110, namesBase: 4.5, cold: 1.3, frost: 7, bossCd: 0.85, adds: 1 }),
  H6({ tide: 100, wash: 12, coal: 1.45, refill: 1.2, icicle: 1.2, lampT: 2.4, bait: 0.6, namesEvery: 120, namesBase: 4, cold: 1.45, frost: 8, bossCd: 0.8, adds: 2 })
];
```
(HAZ5's Wanderer `reveal` is 1.25 at HEAD, data.js:35, after Act V's tuning; HAZ6 starts at the design's 1.35 and balance may align it.) Telegraph durations never change. Code that today reads `HAZ5[diff]` for a rule Act VI shares reads the act's row (`actHaz()` «lead pick», exported from data.js: `ZONES` is world's, so it takes the act number: `actHaz(act)`).

**MONSTERS** (data.js:100; every `radius` pre-scale; numbers as in the design's Enemies and Bosses):

| id | model (CAST key) | ai | traits and key fields |
|---|---|---|---|
| `sunken`, `hullLouse`, `icemaw`, `skotosHand` | exist | exist | unchanged; the louse's `burst` takes `'vault'` from its pack spot |
| `lampbearer` | `sunken` (frost) | `tether` (ai.js:743) | `drinker: { rate: 0.5, t: 2.5, back: 1.0 }`, `tideWake`, `unlit`, weapon `'blackLamp'`, animSet `'singer'`, flesh `'drowned'` |
| `faded` | `faded` (people villager0-2 by spawn) | `melee` | `unseen`, `listens`, `unlit`, `touchEvery: 3` (the Forgetting Touch), look { tint 0x1a1c24, tintAmt 2.2, rim 0x8a9ab8, rimI 0.3 }, a code veil, flesh `'spirit'`; `chores` comes from the pack spot |
| `gateFallen`, `gateFallenBow` | `skeleton`, `skeletonArcher` (boot) | `melee`, `ranged` | `rises`, `lightRest`, `unlit`, the rime look |
| `falselight` | `falselight` (fallback `spider` ×0.8) | `lure` (new) | `lure: { r: 3, bait: 0.8, tell: 0.8, pull: 2, drain: 1.0 }` (bait × HAZ6.bait / 0.8), `unlit`, flesh `'chitin'` |
| `ketling` | `ketling` (CAST `['ketos', 0.6]`; fallback `icemaw` ×0.6, then `warg`) | `melee` | `swim`, `unlit`, `gnaw: 1` «lead pick: the design's `snuffLamp` trait is renamed: `snuffLamp` is light.js's function (light.js:116)» |
| `ketos` | `ketos` (fallback `icemaw` ×3.4, then `warg`) | `ketos` → `boss(KETOS)` | `boss`, `big`, `swim`, `anchored`, `underSpeed: 5.0`, `S.phases [0.65, 0.3]`, `dieClip: 'settle'`, `holdWake` until `ketosWake` ends, `legKey: 'ketos'` |
| `ketosHead` | `none` (no avatar) | `node` (ai.js:793) | the head's hit proxy: radius 1.2 after scale, `share: true` (every hit applied to `a.shareTo`, the Ketos, × its vulnerability), `noBar`, xp 0; spawned at a Seared or Exposed window's start, removed at its end |
| `ketosStalk` | `none` | `node` | the lure stalk's segment, three at once, each 4% of the Ketos's max life; a cut Blinds the Ketos 4 s |
| `shade1` | `barrowLord` | `shade` (`def.form` 1) | the relay's shared fields: `boss`, `shroud`, `S.phases [0.75, 0.5, 0.25]`, flesh `'spirit'`, `legKey: 'shade'`, `keepSkin` (the `skotosSkin` patch, sea.js:1669) |
| `shade2`, `shade3` | `weaver`, `troll` | `shade` (form 2, 3) | as `shade1` |
| `shade4w`, `shade4r`, `shade4m` | `warden`, `ranger`, `mage` (people.glb) | `shade` (form 4) | as `shade1`; the target's class body |

- **Traits** (def fields ai.js reads): `drinker`, `unseen` (drawn dissolved outside light, no health bar, solid from its wind-up whenever its target is within reach + 1 m; `nearestFoe`, skills.js:25, prefers a lit foe in range and falls back to an unseen one, never skips it), `lightRest` (a `rises` creature that dies inside true light or under a shard stays down; else it rises 4 s later at half life, once), `listens`, `lure`, `gnaw`, `touchEvery`, `share`, `noBar`, `legKey`, `keepSkin`, `form`. `a.under` keeps its meaning.
- **AIs** (the `AI` table, ai.js:343): new `lure`, `ketos: (a, dt, pl, d) => { ketosPre(a, dt, pl, d); return boss(a, dt, pl, d, KETOS); }`, `shade: (a, dt, pl, d) => boss(a, dt, pl, d, SHADE_FORM[a.def.form])` with `SHADE_FORM[1]` built on `LORD` (ai.js:1904), `SHADE_FORM[2]` on `WEAVER` (ai.js:1893), `SHADE_FORM[3]` on the brute with the Guardian's thunder affix, `SHADE_FORM[4]` the MIRROR form («lead pick: the name; `SHADE` is taken by the shipped `const SHADE = [0, 0, 0]`, ai.js:1467, the Icemaw shapes `shadeTick` fades, which stays as it is»); `boss()` (ai.js:2337) unchanged in shape.
- **Vulnerability** (combat.js `VULN`, combat.js:257): new `lit: { k: 0, key: 'hud.lit', rim: 0xffe0b0 }` and `stunned: { k: 1.5, key: 'hud.stunned', rim: 0xe0f0ff }`; `revealed`, `exposed`, `seared`, `blinded` exist. `vulnK` (combat.js:269) reads `k: 0` statuses from the act's row (`HAZ6.reveal` below the ice). The ×1.6 boss cap and `a.vulnWindow` (the Ketos's Blinded) as shipped.
- **PACKS, PACK_LEAD, PACK_DORMANT** (data.js:179, :236, :241): the design's ten tags `blackCrew`, `shoreFaded`, `keelLice`, `poolHunter`, `heapLice`, `lures`, `gateFallen`, `drownedWood`, `forgotten`, `stairCrew`; `PACK_LEAD.blackCrew = ['lampbearer']`, `PACK_LEAD.poolHunter = ['icemaw']`; `PACK_DORMANT` gains `blackCrew`, `gateFallen`, `forgotten`. A pack spot may carry `chores: true` (the village) and `burst: 'vault' | 'hull'`. Packs stay in every state.
- **BOONS[6]** (data.js:252): `{ id: 'bearer', icon: 'fire', stats: { area: 12, dmgPct: 10 } }`, `{ id: 'word', icon: 'shield', stats: { lifePct: 12, lifeOnHit: 12 } }`, `{ id: 'shade', icon: 'star', stats: { cdr: 8, critDmg: 20 } }`. stats.js:29 multiplies BOONS[6] by `REMEMBERED` (data.js:282) when `flags.lostAll`; panels.js `boonDesc` (panels.js:27) picks `.du` for it.
- **Legendaries** (data.js:347): `{ id: 'ketosLure', base: 'amulet', cls: null, v: 0.4, drop: false }`, `{ id: 'shadeRing', base: 'ring', cls: null, v: 1.5, drop: false }`; `LEG_FROM` (data.js:370) gains `ketos: 'ketosLure', shade: 'shadeRing'`; combat.js:529-531 read `const lk = a.def.legKey ?? a.kind` for the flag `'legFrom_' + lk` and `LEG_FROM[lk]`. Effects: the Lure-bone doubles the kill refill (+0.4 m) and halves a Drink, a snap and a Gnaw on its wearer; the Shade's Ring floors the Cradle at 1.5 m and makes its wearer's hits on Shrouded foes outside light ×0.5 instead of the act's Shroud.
- **Flesh, projectiles, areas:** flesh as the table; the Ketos's Black Spray `fire('blackGlob', ...)` lands a puddle `area('black', x, z, 2, 6, ...)` (×0.7 move, ring −0.15 m/s, Cold +4/s; no cell change) «lead pick: the names»; whale-oil casks as Act V's `oilCask` (sap.js:153; projectiles.js `area('fire', ..., { floats: true })`).
- **Scenario hooks:** `window.__act6` (`||= {}`), ai.js beside `window.__act5` (ai.js:49): `{ AI_LOG, FIRE, NAMES, lightAt, ringOf, addLightPool, addVuln, vuln, spawnMonster, spawnNpc, damage, slushAt, vaultAt, drip, cells6, rollNames6 }`; tide.js adds `tide`, light.js `fire`.

### The bosses (combat lane, stage C)

**The Ketos** (`KETOS` table, the design's three phases and moves). Shared names:
- `z.act6.mere = { lamps: [it ×3], bells: [it ×2], casks, phase, slams, cut, failT }`; the three wreck lanterns are interactables `wreckLantern` (`lit` from the player's touch; relit on a reset, since they were lit before the fight).
- The **Neck Strike's end**: the flame of the lit lantern whose pool its target stands in (Seared 3 s, 4 s in phase 3), else its target, else the lure pool its target stands in. Its target is `G.player` in single-player and the hero with the most threat (held ≥ 15 s) in co-op.
- **Sound** (phase 3): bus `'skillUsed'` (skills.js:183, which now carries `(i, id, aim)`: `emit('skillUsed', i, sk.id, aim)` «lead pick: two arguments added; nothing listens today») for the host's hero within 14 m; on the host, bus `'heroSound'` (actor) for a guest whose `f` look calls hold a `fire`, `area` or `tele*` entry (net). The bells are interactables `shipBell`; in phase 3 `nearestInteract` (world.js:426) prefers an interactable with `it.prio` over a nearer one without it «lead pick: `it.prio = 1` on the bells while phase 3; the line in `nearestInteract` is combat's hook in world.js».
- **Fail-safes:** three slams without a cut (Glaukos's flask: one segment burns away, Act V's flask); 45 s without a Seared (Glaukos rings a bell). Bus `'ketosFailsafe'` (a, 'flask' | 'bell').
- **Death:** bus `'kill'` (exists) for `a.kind === 'ketos'`; story writes `ketosDown` and `keyxLamp` together, first; the neck arch stays (`L.spots.arch`, mode `dry`).

**The Shade** (the relay):
- One shared life `z.act6.shade = { hp, max, form, retry }` carried across the six kinds; each form is spawned in its own body with that life and `G.bossActor` reassigned **in the same frame** the old form is removed (never two boss actors, never none: `shade` asserts it). A form swap never calls `kill()` (no reward, no `'kill'`, no first-kill drop); only the last form's death does, once.
- At each threshold `hpFloor = threshold − 0.001` for the 2.5 s turn beat (iframes, the boss bar shimmers), with a 30 s clock.
- **Retry:** a death in form 3 or 4 restarts at form 3 (`G.shadeRetry`, runtime only, cleared on leaving the zone); a quit restarts at form 1.
- **Form 4:** its target (the page's hero in single-player; in co-op the hero with the most threat, held ≥ 15 s) decides its kind (`shade4w|r|m`) and its point opposite across the centre fire (clamped 4-12 m, glide 7 m/s, never pushed) outside its two holds (the Lunge's 3 s landing 1.5 m past her, Lit while inside her ring; the answer's 2 s). **MIRROR:** on `'skillUsed'` (the host's hero) it answers 1.2 s later with the row of `MIRROR6[id]` «lead pick: the table's name» (the design's 21 rows, keyed by skill id, so every variant maps to its base); a guest target is answered from `MIRROR6_GUEST[cls]` (Warden spin, leap, line; Ranger fan, fall, line; Mage bolt, frost, fall) one move every 3.5 s. If two big telegraphs are up, it waits.
- **The Flare** fail-safe: 40 s with no Lit window → the centre fire's light r 8 for 10 s; bus `'shadeFlare'`. Its time left reaches the guests as `o.l[3]` (Co-op), whose pages fill their own rings and warmth from it.
- **The named lamps** (`nameLamp` niches) burn from the Lost's flags and are never snuffed; the four hearthstones (`hearthStone`) are snuffed by form 1's Snuff, webbed by form 2's Light-webs (`it.web`: its pool to nothing while it holds), out at form 4's start.
- Bus `'shadeForm'` (a, form) at each swap (story: the forms' shipped lines d.lord, d.weaver; Glaukos's calls).

**Echoes** (after `act6`, once a day): `echoAt(z, 'ketos', ...)` at the neck arch and `echoAt(z, 'shade1', ...)` at the Gate ring (world.js:579); story.js's echo branch (story.js:428) gains both tints (the Ketos 0xd0d8e8 at 1.2, rim 0xe0e8ff; the Shade 0x1a1c24, rim 0xd0d8ff) and the toasts `echo.rise6`, `echo.done6`.

### Progression: the Lamplight track (progression lane)

- `MASTERY` (progression.js:9) gains a 13th row **`{ id: 'lamp', stat: 'ringPct', max: 50, k: 40, icon: 'flame', pct: true }`**; computeStats (stats.js:10) gains `ringPct: 0` in its stat list. `lampBonus()` (light.js) reads `G.stats.ringPct`; a remote hero's bonus is inside its ring byte. Both lines are progression's hooks in other lanes' files (stats.js is combat's, light.js systems'; both run in B: File ownership), so progression never waits on a stub.
- It scales only the base ring: Act IV's `LIGHT.base` (6 m, capped 0.5 m under the swell, so 6 → 7.9 m at rank 40 never reaches the 9 m swell) and Act V's 4 m and Act VI's `FIRE.max`; never the swell, never a boss's `S.over` (Ivar's 3.5, Karthax's 0, the Skotos's), never `lightAt`'s other rules.
- progpanel.js: 13 tiles at 844 × 390 (`prog6`). Keys `mast.lamp`, `mast.lamp.d`. Respec (progression.js:97) returns it like the others; an old save reads `h.mast.lamp` as 0 (`migrateHero`, progression.js:109, needs no change: `pointsSpent` counts every id in `h.mast`).

### Story (story lane, stage D)

**Quests** (`questText`, story.js:31, clamps at **39**):

| q | zone | key | parameters, variants |
|---|---|---|---|
| 32 | town | `q.32` | |
| 33 | farlight | `q.33`; `q.33b` once `coal6` | |
| 34 | drained | `q.34` | {0} hearths lit /3 (`hearth6_1`-`3`); toast `q.hearthLit` {0}/3 |
| 35 | drained | `q.35` | |
| 36 | bottom | `q.36` | {0} black lamps out /3 (`blackLamp0`-`2`); toast `q.lampOut` {0}/3 |
| 37 | bottom | `q.37` | |
| 38 | bottom | `q.38`; `q.38b` once `herFire` | {0} the name: «…» until `nameBack`, then t('npc.first.named') |
| 39 | end | `q.39` | |

- **actComplete(6)** (story.js:522): `h.act6 = max(h.act6 ?? −1, h.diff)`, `h.quest = 39`, `flags.act6 = true`; the bare `else` (story.js:530) becomes `else if (act === 5)`; music `'pherousa'`; act panel keys `act6.done`, `act6.sub`, `act6.next` (panels.js `act()`, panels.js:227). **offerBoons** (story.js:501) loops `[1, 2, 3, 4, 5, 6]`; the header `boon.h6`.
- **The hook** `hook6(z)` (as `hook5`, story.js:1074): from `actClosed` and `boonTaken` (story.js:1090-1091) 2 s after Act V's panel closes, and on the next town entry for a save at q31 with `seaLit` and `h.act5 >= 0`; `call6` saved first.
- **The memories:** `playDeep(z, key, at, done)` «lead pick», built from Act V's `playIce` (story.js:1276), with body class `'memory-deep'` (the First's three, `d.deep.m1`-`m3`, narrator `deepMemory`) or `'memory-ink'` (Keyx's, `d.ink.k1`, narrator `inkMemory`); CSS in style.css beside `'memory-ice'`; each grants `BUFFS.memory` (data.js:290) with the toasts `lamp.buff6` «Μνήμη της Πρώτης» and `lamp.buffInk` «Μνήμη του ψαρά» (+12% damage, +8% move, 60 s).
- **Names:** `npcName(k)` (story.js:50) gains: `leif` → «…» until `leifName`; `asger` → t('npc.pilgrim') until his brazier is lit (a runtime `G.asgerLit` for his scene, then `asgerRest`); `first` → t('npc.first.named') once `nameBack`. hud.js, overlay.js and panels.js already go through `npcName`.
- **`rl()`** (story.js:84) reads `.r` and `.m` as shipped (d.first.1.m, d.asger.2.m, d.tam6.a0.r, d.tam.v1.r, d.elati.v5.r, d.tam6.home.r, d.skotos6.w4.r).
- **The title** (screens.js:68): `game.sub6` once `save.heroes.some((h) => (h.act6 ?? −1) >= 0)`, else `game.sub5`'s rule.
- **The Gate panel** (panels.js:179-183): after `act6`, the flavour line `gate.bottom` and the tier's depth `gate.depth` {0} tier {1} fathoms (8 + 6 × tier); the gate's HUD shows the same line. **The forgotten in the Gates:** `startGate` (boot.js:218) rolls, from tier 10 and after `act6`, a 12% chance of one sleeping, non-hostile Faded (an NPC kind `gateFaded`, not a monster) by a dark lamp in a side room; its interactable `gateLamp` (prompt `gate.lamp`, 1 s) frees it: toast `q.gateFound`, `h.gateFound += 1`, `writeSave()`; the host's in co-op. Nothing else in the level changes.

**Flags** (`hero.flags`; each saved before its scene plays, except the three pairs saved together, written in one `writeSave()`):

| flag | set |
|---|---|
| `call6` | the hook (q32), before its cine |
| `tam6` | Tamarisk's dialog at the staff ends (→ q33) |
| `coal6` | the coal taken from the Farthest Light |
| `drainedSeen` | before the Drained Sea's arrival cine |
| `teach6` | Glaukos's teach at the Rope camp ends (→ q34) «lead pick» |
| `names6` | the first window of the Names from Above heard (d.glaukos.n1 once) «lead pick» |
| `hearth6_1`, `hearth6_2`, `hearth6_3` | each of the First's hearths lit (k is the hearth's spot, not the order) |
| `hearths6` | array of hearth ks in the order lit (the memories play in this order) «lead pick» |
| `mem_d1`, `mem_d2`, `mem_d3` | each black-ice memory seen (d1 first, d3 last, whatever the hearths' order) |
| `gates6` | Glaukos's d.glaukos.d3-d5 said (→ q35) «lead pick» |
| `cp6` | `{ [zone]: key }`, the checkpoint to wake at (checkpoint keys above) |
| `wreck6` | array of the wreck lanterns lit before the fight (0-2) «lead pick» |
| `mem_k1` | the black-water memory seen |
| `ketosWake` | before the Ketos wakes (its cine) |
| `ketosDown` **with** `keyxLamp` | the Ketos's death, first |
| `bottomSeen` | before the Bottom's arrival cine «lead pick» |
| `blackLamp0`, `blackLamp1`, `blackLamp2` | each black lamp out (k the lamp's spot: 0 barrow, 1 wood, 2 village) |
| `blackLamp2` **with** `keyxFreed` | Keyx's lamp, by his lantern |
| `shadeWake` | before the Shade rises (its cine) |
| `shadeDown` | the Shade's end, first |
| `herFire` **with** `nameBack` | the relight, first |
| `homeGate` | the Gate ring taken; then `actComplete(6)` sets `act6` |
| `act6` | `actComplete(6)` |
| `landing6` | the Landing's lantern scene (after `act6`) |
| `leifHome` | Leif at his father's door (after `act6` and `leifName`) |
| `lost0`, `lost1`, `lost2`, `lost3` | the Lost Lights lit: 0 Galini's, 1 the twins', 2 Kranea's, 3 Psamathe's (the Sand Light) |
| `nineLit` | with `lost3` |
| `sailorAsked`, `sailorRest` | the Sailor asked his name (when Act V's stone was not lit); his rest |
| `asgerRest` | Asger freed |
| `leifLit` | Leif's fire lit (`leifFire`; a guest's touch through 'u' sets it on the host), saved at once so it burns for every page and after a reload «lead pick» |
| `leifAxe`, `leifName` | the axe taken; his father says his name |
| `lost6` | array of the Lost's ids in the order freed (`rollNames6`, the rim's niches) «lead pick» |
| `lostAll` | all seven (`lost0`-`3`, `sailorRest`, `asgerRest`, `leifName`) |
| `ember6`, `garland6` | the ember heard; the glade seen |
| `legFrom_ketos`, `legFrom_shade` | first kills (combat.js:529-531, by `legKey`) |
| talk flags | `glaukosB6` (the Well's Foot), `brokkaV5`, `brokkaV6`, `elatiV5`, `haldaV6`, `elianteV6`, `childV6`, `alkLamp6` (the "!" until `landing6`), `tamHome6`, `keyxTold` (the toast q.keyxLamp once): story's names for "this talk was had", in Act V's pattern (`brokkaV4`, story.js:75) |

Runtime only (never saved): `G.shadeRetry`, `z.act6.*` (the zone's state object: `{ hearths, lost, lures, wrecks, bells, lamps, walls, stones, niches, ring, ember, mere, shade, figs }`), a black lamp's channel, the Black Water's cycle, a boss's phase and form.

**Hero fields:** `act6` (the best difficulty Act VI was finished on, −1 if not), `gateFound` (the forgotten freed in the Gates, a count), `fmt` (the save format, below), and `mast.lamp` (the Lamplight rank, in the progression's mastery record).

**Catch-ups on zoneEnter** (`enter6(id, z)`, called after `enter5` at story.js:208; a flag saved before its scene is caught up quietly; the scene replays where the table says):

| state on entry | catch-up |
|---|---|
| town, q31, `seaLit`, `act5 >= 0`, no `call6` | the hook plays (q32) |
| `call6`, q < 32 | → 32; Tamarisk at the staff |
| `tam6`, q < 33 | → 33 |
| `coal6` | → 33b; the rope's exit unlocked (its `locked` is the flag) |
| `drainedSeen`, no `teach6` | Glaukos's d.glaukos.d1-d2b again at the camp, then `teach6` → 34 |
| a hearth lit whose memory is unseen (`hearths6.length` > memories seen) | that hearth offers «Θυμήσου» (`lamp.remember`); questGoal points at it |
| `hearth6_1`-`3` and `mem_d1`-`d3`, no `gates6` | d.glaukos.d3-d5, then `gates6` → 35 |
| Keyx's boat lantern lit (`wreck6` holds its i), no `mem_k1` | the lantern offers «Θυμήσου» |
| `ketosWake`, no `ketosDown` | the fight starts again from the three lanterns (relit on build); the Mere at 1.6 (`resetTide(z, { mere: 1.6 })`) |
| `ketosDown` (with `keyxLamp`) | → 36; the Drained Sea in mode `dry`, the arch, the Well open |
| `bottomSeen`, q < 36 | → 36 |
| `blackLamp0`-`2` all set | the Stair's walls open on build and entry; → 37 |
| `blackLamp2` (with `keyxFreed`) | Keyx gone from the square; his lamp lies dark |
| `leifLit`, no `leifAxe` | Leif's fire burns at the glade; the axe offered |
| `shadeWake`, no `shadeDown` | the fight starts again from form 1 |
| `shadeDown`, no `herFire` | → 38; the name stays «…» |
| `herFire` (with `nameBack`), no `homeGate` | the naming card again if unseen; → 38b; the Bottom in mode `lit` |
| `homeGate`, `act6 < 0` | the home cine, then `actComplete(6)` |
| `act6` and `keyxLamp`, no `landing6` | the Landing scene on the next coast entry |
| `leifName` and `act6`, no `leifHome` | Leif at his father's door on the next town entry |

Quitting mid-cine never strands a save; the black water, a channel, a boss's phase or form are runtime and the zones rebuild from their seeds. `catch6` sets the state just after each row's flag, reloads and asserts the quest and the scene.

**Interactables** (`z.interact`; story answers each kind with a bus event of the same name, emitted as `act5Zone`'s `inter` does, world.js:1067):

| kind | where | prompt key | what |
|---|---|---|---|
| `coal6` | the Farthest Light's door, after Selna's f3 | `coal6.take` | 1 s; `coal6`; the Cradle on the hip |
| `exit` (`exit.rope`) | the hole | `exit.rope` | locked `coal6` |
| `hearth6` | `spots.hearths` | `hearth6.light` | 1.5 s channel (`touch(..., { tough: true })`: broken by blows worth 10% of max life, world.js:893-909); pool r 6, checkpoint |
| `lostLight` | `spots.lost[].lamp` | `lost.light` | 1 s; pool r 4; the keeper's line as a toast-dialog |
| `sailor` (an NPC talk) | `spots.sailor` | `talk` | his three beats |
| `asgerBrazier` | `spots.asger.brazier` | `asger.light` | 1 s; the keel's window melts |
| `wreckLantern` | `spots.wreckLamps` | `wreck.light` | 1 s; pool r 4; the third plays `ketosWake` |
| `shipBell` | `spots.bells` | `bell.ring` | 0.5 s; phase 3 only; `it.prio` |
| `blackLamp` | `spots.lamps` (k 0, 1) | `blackLamp.out` | `HAZ6.lampT` s channel (tough), its Black Flare every 4 s; out: Cradle to full, the wall thins |
| `keyxGive` | Keyx (k 2) | `keyx.give` | the same channel; `blackLamp2` with `keyxFreed` (the kind is not the flag `keyxLamp`) |
| `leifFire`, `leifAxe` | `spots.leif.fire` | `leif.fire`, `leif.axe` | 1 s each; the fire sets `leifLit` (pool r 4, lit on build and entry from the flag) |
| `leifGive` | Leif's father in town (the d.v.3 villager) | `leif.give` | `leifName` |
| `ember6` | `spots.ember.pane` | `ember.listen` | 1 s; narration only |
| `hearthStone` | `spots.hearth.stones` | `stone6.light` | 1 s; pool r 4 |
| `firstFire` | the centre stone, after `shadeDown` | `first.relight` | 2.0 s; the naming |
| `exit` (`exit.gateUp`) | the Gate ring | `exit.gateUp` | locked `herFire`, `at: 'staff'` |
| `remember` | a lit hearth or Keyx's lantern with its memory unseen | `lamp.remember` (exists) | the memory |
| `gateLamp` | a Gate level's side room (post-game) | `gate.lamp` | 1 s; `gateFound` |
| `echo` | the neck arch; the Gate ring (after `act6`) | `echo.ketos`, `echo.shade` | `echoAt` (world.js:579) |
| `oilCask` | `spots.casks` | — | a breakable actor (sap.js:153) |

**NPC kinds** (`spawnNpc`, actors.js:544; `NPC_MODEL`, actors.js:542; the new kinds' rows and their code parts are story's `// Act VI: story` block in actors.js, with `act6Npc` called after `act5Npc` at actors.js:570, File ownership): `glaukos`, `tamarisk`, `selna`, `alkyone`, `tern`, `child` (exist); new `firstDeep` (model `selna`, the void-ice tint 0x9ab8d0 at 2.1, the icicle crown and the brand; Lie_Idle, Sit_Floor_Idle, Idle_Talking_Loop), `keyx` (villager1, the Faded's tint at half, a code beard, a lamp in the raised hand), `leif` (villager2 ×0.92, hood, axe), `sailor` (villager0, the Faded's tint at 0.9, no veil), `asger` (wayfarer, a russet robe tint, a code hood), `gateFaded`, `faded` figures for the memories; `first` (exists, the memory figure). Dialog speakers: these plus `deepMemory`, `inkMemory`, `skotos` (the black disc), `narrator`. `npcHasNews` (story.js:58) covers Tamarisk at the staff (`!tam6`), Glaukos at the camp (`!teach6`) and at the Well's Foot (`!glaukosB6`), Alkyone at the Landing (`act6 && keyxLamp && !landing6`), Leif's father (`leifAxe && !leifName`), and no one while a boss of the act is up.

**Cines:** the hook (`call6`, pitch 0.3); Selna's look down (pitch 0.85); the Drained Sea's arrival (`drainedSeen`, ATMOS `drainedCine`, pitch 0.2: the only time the vault is drawn); each hearth; `ketosWake` (pitch 0.3); the Mere's drain at 65% (3 s, pitch 0.45); the Ketos's death and the lantern; the Bottom's arrival (`bottomSeen`, pitch 0.25); each black lamp; Keyx; `shadeWake` (pitch 0.35); the Shade's end; `naming6` (pitch 0.3); the Gate ring; home with **`beaconScene(6, 'peaks')`** (story.js:462 gains `if (act === 6) { peaksAnswer(G.zone); return; }`); the Landing; Leif home.

**Text keys.** The design's families (Story: "New text keys beyond the lines above" and "Key families"), with these changes:
- **Renamed (collisions with shipped keys):** d.brokka.v3 → **d.brokka.v5** (after `call6`), d.brokka.v4 → **d.brokka.v6** (after `herFire`), d.elati.v3 (.r) → **d.elati.v5** (.r), d.alk.k1/k2/k3 → **d.alk.l6.1/l6.2/l6.3** (the Landing scene).
- **Replaced on purpose:** `act5.next` (text.js:740) takes the design's new line.
- **Not written:** d.ember.1, d.ember.2 (owner decision 2).
- **New, chosen here:** the prompt keys of the interactables table; `d.gateDark`; `lamp.buff6`, `lamp.buffInk`; `npc.pilgrim` «Προσκυνητής» / "A pilgrim"; `npc.first.named` (the design's); `hud.lit` «Φωτισμένο!» / "Lit!" for the Lit status, so it reads apart from Revealed's shipped `hud.inLight` «Στο φως!» «lead pick»; `hud.stunned` «Ζαλισμένο!» / "Stunned!"; `q.legBack` «Βρέθηκε ξανά: {0}.» / "Found again: {0}." (the legendaries' heal, Saves).
- **Shipped and reused** (do not redefine): name.first, name.einar, name.arna, name.ivar, name.isarn, name.skotos, name.keyx, name.sailor, npc.first, npc.glaukos, npc.tamarisk, npc.selna, npc.alkyone, npc.tern, npc.skotos, gate.guardianName, d.alk.gates, d.lord, d.weaver, d.staff, lamp.remember, and every line the design cites from Acts I-V.

### Events (bus, `ui/bus.js`)

New events, and shipped ones whose arguments change. "story" in the listener column means stage D answers it; until then nothing listens and the systems still work.

| event | args | emitted by | heard by |
|---|---|---|---|
| `coal6`, `hearth6`, `lostLight`, `asgerBrazier`, `wreckLantern`, `shipBell`, `blackLamp`, `keyxGive`, `leifFire`, `leifAxe`, `leifGive`, `ember6`, `hearthStone`, `firstFire`, `gateLamp` | `(it, z)` | world.js (`act6Zone`'s interactables), boot.js (`gateLamp`) | story (all); combat (`shipBell` in phase 3, `hearthStone`) |
| `fireDim`, `fireOut`, `fireBack` | `(r)` | light.js | hud.js (the flame icon), story (hints) |
| `namesFall`, `namesEnd` | `(z, list)`, `(z)` | light.js `namesTick` | ai.js (`listens`), story (the look, d.glaukos.n1), net (the window to guests) |
| `tideBell`, `tideTurn` (exist) | as shipped | tide.js | hud.js (the dial, violet below the ice), audio |
| `icicle` | `(x, z, hit)` | forge.js `drip` | ai.js (`lightRest`, the troll's stun), story (hint.drip once) |
| `slush` | `(x, z, r, t)` | tide.js `slushAt` | net (the `i` topic's `cells6`) |
| `drink` | `(a, on, target)` | ai.js (Lampbearer) | net (the guest's tether), audio |
| `lureSnap`, `lureOut` | `(a)` | ai.js | story (hint.flicker once) |
| `gnaw` | `(a, it)` | ai.js (Ketling) | world (the lantern's light), story |
| `lampSnuffed` (exists) | `(it, by)` | light.js `snuffLamp` | hud.js:468 (the sound, now in `z.water` zones) |
| `skillUsed` (exists, args added) | `(i, id, aim)` | skills.js:183 | ai.js (the Ketos's sound, the Shade's MIRROR) |
| `heroSound` | `(actor)` | net (a guest's cast seen in its `f`) | ai.js (the Ketos) |
| `bossIntro`, `bossPhase` (exist) | as shipped (ai.js:2350) | ai.js | story, hud.js:453 (`OWN_THEME`, hud.js:471, gains `ketos` and the six Shade kinds) |
| `ketosSeared`, `ketosBlind`, `ketosFailsafe`, `mereDrain` | `(a, ...)` | ai.js | story (Glaukos's calls), audio |
| `shadeForm`, `shadeFlare` | `(a, form)`, `(z)` | ai.js | story, audio |
| `kill` (exists) | `(a)` | combat.js | story (`ketosDown`+`keyxLamp`; `shadeDown` on the last form's kind) |
| `actClosed`, `boonTaken` (exist) | | panels.js | story (`hook6`) |
| `staff` (exists) | | world.js:1702 | story: d.staff6 before the Gates panel while `call6 && !herFire` |

### Co-op beneath the ice (net lane, stages B and C)

**Protocol.** The diet merged as protocol 4 (`VER = 4`, coop.js:43; its wire: bundles `b`, outboxes, `_o`, `relayOf`, documented in `docs/coop/diet.md`). **Act VI's fields are a delta on protocol 4 and ship as `VER = 5`**, bumped once in the net lane's change, so a page of 4 and a page of 5 never list or join each other (the diet's version handling, coop.js:43 and its `coop.version` path). If no public build (the web build or the artifact) has carried VER 4 when Act VI's net lane merges, the lead may keep 4 for both: the rule is one bump per public release, never two for one release. Every field below is added on all three transports alike (LocalTransport, the room, Supabase); on Supabase it rides the diet's bundles and outboxes with no new message.

| where | field | layout |
|---|---|---|
| guest presence `h` (coop.js:474 `heroState`) | the ring byte | `h[8] = round(ringOf(G.player) × 20)` (0-255: 0-12.75 m, the Lamplight bonus, a flare and the chain inside); missing reads as the zone's base ring |
| guest presence | `lp` | up to three light pools: `[x, z, r, ...]`, each `q(v, 10)`; the wolf's lantern, a Bulwark ward, the moving pools of Dawnbreaker and the Ray; absent when none |
| host snapshot `h` (coop.js:617) | the ring byte | `h[11]` after the clip fields `[8..10]`, the same encoding |
| host snapshot | `lp` | the host's own pools, the same layout |
| host snapshot `o.w` (coop.js:620) | the black water and the Mere | `o.w[0..3]` as shipped (the clock `T.t`; `T.force`'s h and rate, −1 and 0 below the ice; the gusts' on); `o.w[4]` stays the gust clock (coop.js:621-622, read by `worldState`, coop.js:1065) and is `null` where there is no `z.gust`; in act-6 zones **`o.w[5]` = `q(TIDE.mere.h, 100)`** (−1: no Mere force) and **`o.w[6]` = `q(TIDE.mere.rate, 1000)`**. `worldState` (coop.js:1052) sets `T.mere = { h, rate }` from them (null at −1) beside its `T.force`, and the guest's own tide.js steps the Mere's cells from it as the host's does |
| host snapshot `o.n` | the names' window | `[t left in the window (×10), the window's index]` while it is open; absent otherwise «lead pick» |
| host snapshot `o.l` | Act VI's lit things | in act-6 zones `[stones, wrecks, webs, flare]`: bit masks of the hearthstones lit (bit i), the wreck lanterns lit, the hearthstones webbed, and the Shade's Flare's tenths of a second left (0: none; the guest's centre fire at r 8 while it holds, for its ring's fill and warmth) (coop.js:624 builds Act V's for farlight only; Act VI's beside it). What a flag carries (Leif's fire, `leifLit`; the Lost; the hearths) rides the world `w`, not `o.l` |
| actor entries (coop.js:695 `actorEntry`) | flag bit 15 (32768) | lit on the host (`lightAt` at the actor with its pad): a guest draws a Faded solid if this bit or its own light says so |
| relayed guest presence (`relayOf`, coop.js:297) | `h[8]`, `lp` | `relayOf` keeps `h.slice(0, 9)` (coop.js:308) and rebuilds `lp` (at most nine finite numbers, each clamped); `RELAY_PRES` (640 bytes) holds |
| host → guest blow statuses (`HURT_KEYS`, coop.js:835; the guest's `HURT_MAX`, coop.js:1078) | `ring` | metres of ring drained by that blow, at most 1.5 a blow; the guest calls `fireDrain` |
| host → guest reliable event | `['dr', srcId, t]` | a Lampbearer's Drink on this guest: t seconds (at most 2.5; 0 ends it), at most two at once; the guest draws the tether and drains its own ring |
| guest → host blow options (`OPT_NUM`, coop.js:722; `NET.h.hitPuppet`, coop.js:1189) | `lit` | seconds the struck monster stays lit by the guest's light (at most 3: Snare's hold, the Hawks' stoop, Challenge's taunt, a guest-lit target); the host sets `a.litT` and its Shroud test reads it |
| guest → host reliable event | `[seq, 'u', thingId, seen]` | a guest uses a fight-and-route interactable: the host checks the guest's stand-in within 3 m (24 m with a line of sight for a cask, a Piercing Shot's reach), the thing in the state `seen` (0 dark, 1 lit), at most one every 0.5 s; then does it by its own rules |
| the world `w` (coop.js:572 `worldOf`; coop.js:900 `WORLD`; coop.js:921 `onWorld`) | `act6` | `a: [act1..act6]`, `'act6'` in `WORLD`, `act6: act(a[5])` in `onWorld` (coop.js:929); the guest keeps its own `lostAll` beside `unbound` and `remembered` (coop.js:927), as its blessings are its own; the flags carry the rest |
| the `i` topic (coop.js:557) | shards and slush | in act-6 zones the host sends `cells6(z)` (tide.js: the shards as cells, the slush as its calls, a key without the time left; The Black Water) on `i` as it sends the ice digest: when its key changes, at most twice a second, all of it every 3 s; the guest applies `cells6Apply`. It goes through `sendBig` (3.3 KB chunks, `must: true`, coop.js:579-581), so each send either takes room beside the snapshot (`ch.room()`, coop.js:614) or goes as a message of its own: small enough to ride beside it is the rule (Budget). **Never in the world `w`**, which goes whole whenever its key changes (coop.js:554) |

- **`thingId`** for 'u': `'stone:<i>'`, `'wreck:<i>'`, `'bell:<i>'`, `'cask:<i>'`, `'lost:<id>'`, `'asger'`, `'leif'`, and Act V's `'cairn:<i>'`, `'hole:<hole>.<i>'` «lead pick». `GUEST_OK` (coop.js:1410) is unchanged (a guest's own chests, shrines, stash); a new set `GUEST_U` holds the kinds `hearthStone`, `wreckLantern`, `shipBell`, `oilCask`, `lostLight`, `asgerBrazier`, `leifFire`, `cairn`, `holeLamp`, which `NET.h.canUse` (coop.js:1411) admits and `NET.h.guestUse` (coop.js:1417) turns into the guest's own touch, then 'u'. (Tamarisk's braziers and Glaukos's fire-pots burn from build and are not interactables: no `brazier6` interact, no thingId.) **What stays the host's:** the coal, the rope, the First's hearths and their memories, the black lamps and Keyx's lantern, the Sailor's and Leif's names, the ember, the relight, the Gate ring, the Gate find.
- **The vendors below the ice.** `NET.h.canUse`'s vendor list (coop.js:1414: smith, healer, brokka, elati) gains `'glaukos'`, `'tamarisk'` and `'selna'` (the Rope camp's two; Act V's shops of all three, story.js:992-1007, have the same gap today), and `guestUse` opens `'vendor'` with `{ npc: it.npc }` for them as it does for Brokka and Elati, so a guest gets the shop, not `coop.hostLeads`.
- **The host's `lightAt`** reads each guest's ring byte and pools (`setRemoteLight`), so a guest's wolf lantern lifts the Shroud on a host monster (`coop.mjs act6` asserts it); the host's monsters' drains reach a guest as `ring` and `dr` (`coop.mjs act6` asserts a guest's ring drains under a host Lampbearer's Drink); icicles damage every hero through `heroes()` and `hurtRemote`.
- **Bosses.** `ZONE_BOSS` (coop.js:1093) gains `drained: 'ketos', bottom: 'shade'`, compared with `MONSTERS[kind].legKey ?? kind` in `pupSeen` (coop.js:1097), so any Shade form is the zone's boss and the kill is paid once (`S.paid`). A Shade form swap is sent as the old id's entry once with the hidden bit (2), then dropped, and the new form as a new id with the boss bit (8192): a puppet always draws the right body (puppets are built from the snapshot's kind, `KINDS`, coop.js:46). The Ketos's head and stalk are invisible `node` puppets; a guest's blow on the head goes to the host and is shared to the Ketos. `coop.mjs bosses` asserts each swap seen and the kill paid once, at two and four players.
- **The Black Water, the Mere, the names:** the host's clocks, synced through `o.w` (the clock and the Mere's own level) and `o.n`; each page's lanes and wash-outs are its own hero's. A downed hero on a closing cell is moved along the lane to the nearest open cell.
- **storyOpenings** (world.js:311) gains: in `bottom`, `L.walls[k]` opened for each `blackLamp<k>`; in `drained`, the Heap's `L.gaps` closed while `ketosWake && !ketosDown` and opened otherwise («lead pick: storyOpenings may also close, for this pair»); `presenceAgain` (coop.js:942-952, which `onWorld` calls) gains `act === 6` → `act6Presence(z)` beside its `act === 5` line (coop.js:950).
- **Budget:** measured, not estimated, with `NET=supa node tools/coop.mjs four` (and `room`, and LocalTransport) in the Keels during the drip soak, a Mage casting Frost Novas: the host snapshot's bytes, the `i` bytes and messages a second, each guest's presence and its relayed copy. The bars are the diet's: a party of four **55-65 Realtime events a second** on Supabase (diet.md); **`ch.room()` ≥ 2.4 KB** beside each snapshot (the `i` sends ride beside it and never squeeze it to its floor or go as their own messages in the soak); **`relayStats.cut` = 0** (each guest's relayed presence, with `h[8]` and `lp`, under `RELAY_PRES` 640 bytes and the relay's 3072 bytes a second a guest, `RELAY_RATE`, transport.js:327); and the day caps (`skotos.quota`, 40 MiB a day for the project and for a user, diet.md): the stage report gives the party-of-four minutes a day before and after. Expected: about +10 to +16 bytes a host snapshot (`o.w[5..6]`, `o.l`, `o.n`), up to +20 bytes a guest presence, and `i` about 20 bytes a Nova and 12 a shard.
- **COOP** scaling (data.js:17) unchanged.

### Saves (world lane; the cloud-save line's change named here)

- **Migration** in `startHero` (boot.js:103), after Act V's lines (boot.js:122-123): `hero.act6 ??= −1; if (hero.act6 >= 0) hero.flags.act6 = true; hero.gateFound ??= 0; hero.fmt = SAVE_FMT;`, then the legendaries' heal (below). The test hook's loop (boot.js:82) runs to 6. **state.js** (state.js:28): a new hero gets `act6: −1, gateFound: 0, fmt: SAVE_FMT` (state.js imports `SAVE_FMT` from data.js). `diffUnlocked` (panels.js:262) takes the best of `act1`-`act6`.
- **repairHero** (save.js:84): `h.boons.slice(0, NBOONS)` with `NBOONS = Object.keys(BOONS).length` (6) «lead pick», so the sixth blessing survives a load.
- **A stale tab of a build from before Act VI** (before the cloud line too, so it has no format check) still writes every other stored hero back through `repairHero` on its next save (save.js:32-38): it cuts the sixth blessing, which heals (`offerBoons` offers a missing act's blessing again on the hero's next return, story.js:507), and `cleanItem` (items.js:114-115) demotes an unknown legendary to a rare, so **`ketosLure` and `shadeRing` would be lost for good** (`legFrom_*` is already set, so no first kill drops them again). «lead pick: healed on load, once each»: in `startHero`, after the migration, for each `k` of `ketos`, `shade` with `flags['legFrom_' + k]` set, no item in `inv`, `stash` or `equip` whose `leg === LEG_FROM[k]` and no `flags['legBack_' + k]`, the first-kill drop is rolled again (`makeItem(hero.level, { rar: 3, leg: LEG_FROM[k] })`) into the first free stash slot (else the inventory), toast `q.legBack`, and `flags['legBack_' + k] = true`, so a legendary sold or salvaged comes back at most once. `save15` asserts it.
- **The save format.** `SAVE_FMT` (**data.js**, exported «lead pick»: data.js imports nothing, so state.js and save.js both read it without the cycle an import of save.js from state.js would make) is the number of the save format this build reads: **1** for Acts I-V (a hero without `fmt` is 1), **2** with Act VI (`act6`, `gateFound`, the sixth blessing, `mast.lamp`, the Act VI flags). Every hero a build migrates or creates is stamped with its `SAVE_FMT`.
- **A newer format is refused.** The cloud-save line (`origin/claude/skotos-cloudsave`, 35a3cae, not yet merged) decides what a build keeps through `heroFits(h)` (its save.js:151): it refuses `'newer'` a hero whose class, difficulty, item base, legendary or blessing this build does not know. A hero in the middle of Act VI has none of those, so the format number must carry it: `heroFits` also refuses **`(h.fmt | 0) > SAVE_FMT`** as `'newer'`, and its blessing test reads `i >= NBOONS` instead of `i >= 5` (its save.js:156), or the Act VI build would refuse its own heroes. The title (screens.js) shows a stored hero with `heroFits(h) === 'newer'` as not playable here ("reload the page", the cloud line's text); and since a newer tab may write the record between the menu being drawn and the click, **`startHero` (boot.js:104) runs the same refusal on `freshHero`'s result** (save.js:52, which Continue, Co-op and the hero list all go through, screens.js:99, 101, 110): a `'newer'` hero is not played, the title is drawn again with the notice, nothing is written. So a stale tab never plays and re-saves a hero a newer build wrote; the cloud line already writes such a record back byte for byte. **In the cloud merge**, the conflict branch (the cloud line's cloudsync.js:183-188: after `fetch`, the work-sum push and the "further on" push) checks the fetched copy first: when `store.check(got.h) === 'newer'` it neither pulls nor pushes, reports `newer` and keeps the base, so **a copy of a lower `fmt` never replaces a higher one**, however far on or late played. The `cloudSame` push needs nothing more: a refused pull never sets the base (its `agree` is skipped), so the base's rev is never that of a copy this build could not keep; `pushOne` puts against the base's rev and is refused `conflict` by a newer copy. **Order:** `SAVE_FMT` (at 1), the `fmt` stamp and these checks go in with the cloud line's merge (the lead's, or the cloud line's owner on request), so that every public build from then on refuses a format it does not know; Act VI's world lane then bumps `SAVE_FMT` to 2. If Act VI's world lane lands first, it adds `SAVE_FMT` at 1 with the stamp, and the bump to 2 waits for the cloud line's checks; no public build may write `fmt` 2 before a public build refuses it. (A build from before the cloud line has no cloud copy to take; its only risk is a stale tab: the sixth blessing, healed by `offerBoons`, and the two legendaries, healed on load as above.)
- **What the cloud carries.** The cloud stores each hero's JSON text byte for byte (the artifact's `db` document `data`, Supabase's `data text`, the cloud line's README): Act VI's fields need **no schema or migration change** there, only the rules above. The cloud line's "further on" comparison (level, Mastery level, XP, Mastery XP, kills) is unchanged, and runs only between copies this build can keep (the conflict branch's check above comes first).
- **`save15`** (a new scenario, world lane) loads an Act V-end hero of the shipped format (no `act6`, no `fmt`, five blessings): it migrates with `fmt === SAVE_FMT` (1 until the bump, 2 after it: the scenario asserts 2 only once `SAVE_FMT` is 2), `act6` −1 and quest 31; an Act VI-end hero (six blessings, `mast.lamp` 12) loads with all six and its rank; one with `legFrom_ketos` and no `ketosLure` gets it back once, and not again on the next load. With the cloud line merged: a stored record made `'newer'` between the menu and the click is refused by `startHero` and not written; a cloud copy with `fmt` above `SAVE_FMT` is refused `newer` and kept byte for byte; **a page of format 1 whose local copy is further on and later played leaves a format-2 cloud copy in place** (no push, `newer` reported; also in `node tools/cloud/test-sync.mjs` and `cloud`).

### Audio (story lane, D; the names other lanes call)

- **THEMES** (audio.js:2217): `drained`, `ketos`, `bottom`, `shade`; the variant `pherousa` (of `sealit`, for the act's end); the hearth motif `MOTIF6 = [[55, 1.5], [58, 1.0], [62, 3.0]]` beside `MOTIF` (audio.js:2116) «lead pick: the name». MOOD (audio.js:2107) gains `deep` (0-1, the black water's height), `names` (0/1), `blind` (0/1, the Ketos's phase 3), `form` (0-4); `MOOD.under` keeps Act V's meaning.
- **SFX** (the design's sixteen): `iceGroan`, `icicleFall`, `icicleShatter`, `lampDrink`, `lampFlare`, `blackLampOut`, `fireDim`, `fireOut`, `fireRekindle`, `trueLamp`, `falseTone`, `lureSnap`, `ketosCall`, `ketosSlam`, `shipBell`, `shadeShift`, plus `nameBell` (the names' bell from above: `towerBell` pitched up) «lead pick». Reused: `splash`, the louse sounds, `sealBark`, `skotosRise`, `iceSing`, `towerBell`, `lanternDrink`.

## Expected assets

What stages 0 and B deliver, so the other lanes can reference it before it exists. Sources, licences and budgets are the design's Assets section. **Every chain ends in a boot-loaded or code-built model.**

### Creatures (group `act6`)

`ACT_FILES.act6 = ['louse', 'icemaw', 'tentacle', 'skotos', 'ketos', 'falselight']` (creatures.js:37). Each GLB follows the clip contract of creatures.js and tools/creatures/README.md (`extras: { hit, height, credit, walkSpeed, runSpeed }`, `keepMat` where stated).

| CAST key → [file, base] | clips | stand-in chain |
|---|---|---|
| `ketos` → ['ketos', 1] (≤ 15k faces, 1024 d, 512 n) | idle (in water), rise, lureDrift, strike, slam, thrash, dive, surface, blindListen, seared, settle (held: the arch), hit, die; for the Ketling: crawl, gnaw | `['icemaw', 'warg']`, `STAND_SCALE` 'ketos>icemaw' 0.94 (≈ ×3.4 under look.scale 3.6); the lure is code on any body |
| `ketling` → ['ketos', 0.6] (the same file; its own CAST key) | crawl, gnaw, hit, die (ketos.glb's) | `['icemaw', 'warg']`, `STAND_SCALE` 'ketling>icemaw' 0.6. (The key is `def.model + '>' + standIn`, actors.js:73-76: with the Ketling's model `ketos` a missing ketos.glb would draw it at 'ketos>icemaw' 0.94, hence the key of its own) |
| `falselight` → ['falselight', 1] (7.3k faces, 512 d, 256 n) | idleLure (tail high, still), walk, run, snap, sting, pinch, flee, hit, die | `['spider']`, `STAND_SCALE` 'falselight>spider' 0.8, `TINT_IN.falselight` [0xd8d4cc, 0.7]; the lure is code |
| `louse`, `icemaw`, `tentacle`, `skotos` | shipped | shipped |
| the Shade's forms, `gateFallen` | barrowLord, weaver, troll, skeleton, skeletonArcher (boot); warden, ranger, mage (people.glb) | none needed |

- `none` (the head and stalk nodes): no model, no avatar; actors.js spawns them without one «lead pick».
- If a provenance gate fails, its no-download body is the CAST row from the start (`ACT_FILES.act6` drops the file).
- **Combat's side:** `MAP`, `HOLD` (settle, idleLure), `LOOP` rows in creatures.js; the frost and rime materials' rules as Act V's (no roughness at load); and the stand-in rows in **actors.js** (combat's file; assets does not edit it), with the values above: `STAND_IN` (actors.js:49) `ketos: ['icemaw', 'warg'], ketling: ['icemaw', 'warg'], falselight: ['spider']`, `STAND_SCALE` (actors.js:65) `'ketos>icemaw': 0.94, 'ketling>icemaw': 0.6, 'falselight>spider': 0.8`, `TINT_IN` (actors.js:244) `falselight: [0xd8d4cc, 0.7]`. Assets' side is the CAST (with `ketling`) and ACT_FILES rows in creatures.js.

### People (no new set)

`frost` (frost.glb) holds Glaukos, Selna (and the First), Alkyone, Tern (and the child), Tamarisk, the Sunken (and the Lampbearer); people.glb (boot) holds the Faded, Keyx, Leif, the Sailor, Asger, the Gate-Fallen's bodies are skeleton.glb, and the Shade's last form. Every grade is runtime (people.js tints above 1 drain the colour first, people.js:87-91) with code parts (veils, beards, hoods, the axe, the crown and brand). The optional one-scene set `first6` (folk.mjs `--set=first6`, ≤ 6 measured textures) only if the First fails her look gate at G0.

### The silt pack (`silt`)

tools/pack-silt.mjs writes `src/assets/silt/<id>_d.webp`, `<id>_n.webp` (d 1024, n 512, AO baked) and `src/assets/silt/CREDITS.txt`; env.js `PACK_ORDER` (env.js:13) gains `'silt'` last; code reads `'silt/<name>'`.

| layer | source (to verify at stage 0) | used as | chain when missing |
|---|---|---|---|
| `silt` | Poly Haven `damp_beach_sand` or `coast_sand_01`-`05`, regraded dark grey-green | A, P (`dual`) | `silt/silt` → `rime/shore` (darkened) → `mud` |
| `iceWall` | ambientCG `Ice003` or `Ice004` | W, the vault's sides | `silt/iceWall` → `rime/ice` → `wall` |

No new prop: the rime pack (shipped) and Act I's boot sets carry every prop; the rest is code (Visuals, `act6Prop`).

## Scenarios

New scenarios (owners as in File ownership), each in `tools/scenario.mjs` unless named for `tools/coop.mjs` or `tools/check-act6.mjs`; what each asserts is the design's table (Engine work 20), with these additions:

| scenario | additions |
|---|---|
| `hook6` | (b) uses `save15`'s Act V-end hero of the shipped format |
| `catch6` | every row of the catch-up table above |
| `drained` | the rope hole's spot on the cached farlight zone, entered twice; no Faded blow while drawn unseen at a ring of 1.2 m |
| `blackwater` | `map.ver` ≤ 4 bumps a second with slush and shards; no ice mesh in either zone; the Cold and the dial in `drained`; the pockets rise and fall with the clock while the Mere holds at 1.6 (`uLevel` and `uBayLevel` apart), the dial's phase and the groan on the clock's times; after `ketosDown` the Mere at 0 under the clock |
| `carry` | `FIRE.r` within [0, `FIRE.max`] over the soak; Out sets `R.heroLight.distance` 4 and never `S.over`; a Mage's burning ground still light while Out; the chain in a two-page run (LocalTransport) |
| `names6` | the window 5 s with 0 Act V stones and 7 s with 4, unchanged with 0 and 7 Lost; `rollNames6` before and after the act; paused while `G.bossActor` is set |
| `drips` | `drip` hits every hero (a guest's stand-in through `hurtRemote`) |
| `ketos`, `shade` | as the design; `shade` asserts one `G.bossActor` every frame of every swap |
| `leg6` | one first-kill drop from the Shade whatever form 4's body (`legKey`) |
| `prog6` | 13 tiles; rank 40 grows Act IV's base ring to 7.9 m and never its 9 m swell; never a boss's `S.over`; `G.stats.ringPct` finite at rank 0 and 40 |
| `gate6` | a tier's layout and packs match the shipped generator's for the same seed (gen.js unchanged) |
| `save15` | Saves above |
| `coop.mjs act6` | a guest's wolf lantern lifts the Shroud on a host monster; a guest's ring drains under a host Lampbearer's Drink; 'u' lights a hearthstone and a cairn; the shards and slush reach a guest on `i`; the Mere's level reaches a guest (`o.w[5..6]`) while its clock runs with the host's; a guest at the Rope camp gets Glaukos's and Tamarisk's shops; Leif's fire (`leifLit`) and the Flare (`o.l[3]`) seen on a guest's page; a VER 4 page and a VER 5 page refuse each other; on `NET=supa ... four` the Budget's bars (events a second, `ch.room()`, `relayStats.cut`, bytes a second against the day caps) |

**Regressions each gate runs besides its own** (one browser, the gate's owner):
- **regress-A** (G1): `perf5`, `coast`, `tide`, `ice`, `cast5`, `shallowtele`, `ashfield`, `forge` (the Act IV ring and Shroud), `progpanel`, `save13`, `save14`, `title`, `panels`; `node tools/check-act5.mjs` and `tools/parity-ashfield.mjs` clean.
- **regress-B** (G2): regress-A, plus `skills5`, `skillsfx`, `combat`, `ranger`, `mage`, `progress`, `diff6` (Act V's), `cp5`; `node tools/coop.mjs` join, pack, world, cheat, act5, four, bosses on LocalTransport and `NET=supa` join, four, cheat; `node tools/net/test-transport.mjs`.
- **regress-C** (G3): regress-B, plus `tower`, `skotos`, `holes`, `freeze`, `ivar`, `karthax`, `echo5`, `echo4`; `tools/balance-act.mjs` on Acts IV and V at Lamplight rank 40.
- **regress-D** (G4): regress-C, plus `hook5`, `catch5`, `ending5`, `ending4`, `ending3`, `ending2`, `ending`, `cameo`, `gate`; with the cloud line merged, `cloud`, `cloudweb`, `node tools/cloud/test-sync.mjs`.
- **G5:** every scenario of Acts I-VI, progression, co-op, saves and cloud; `play5` and a full `play6` run as a Warden (the integrator's).

## Stage 0 outcome so far (27 October)

The record is `docs/act6-briefs/reports/stage0-assets.md` and `docs/act6-briefs/asset-gates.json` (commit 12e94d6).

- **Both downloads pass their provenance gates with no doubt found:** "Pistosaur Animated" by RickStikkelorum (773667575a264c7baa4ec404115a044b, CC-BY 4.0) for the Ketos and the Ketling, and "Scorpion" by anthonyvanoo (4c0fd62d33ab4d2592ee0a1d985a480d, CC-BY 4.0; "All That's Left" is a free game that neither sells nor claims it) for the Falselight. Neither no-download body is needed for provenance; the CAST rows above stand, with their stand-in chains kept for a failed load. Two later uncredited Sketchfab re-uploads of the Pistosaur exist: credit the 2019 original only.
- **The look gates are still to run** (G0): the First beside Selna, the Faded, Keyx, Leif, the Lampbearer, the Shade's forms, the Icemaw at ×3.4.
- **For the builds (assets lane, stage B):**
  - `ketos.mjs`: 16,664 → ≤ 15k triangles by thinning the two teeth rows (about 700 each) and the eyes (about 400), the skinned body kept whole (about 13.5k), cost measured before and after; the rigid teeth and eyes stay parented to the skull and jaw joints (the code lure's chain hangs from the skull joint, `joint19_044`); only the body's two maps kept (1024 d, its 2048 normal down to 512), the tongue, teeth and eyes flat with roughness set; its one clip `SwimmingBiting` becomes idle-in-water and every other clip is made in lib.mjs, the Ketling's crawl on the four flipper chains and its gnaw on the jaw. **The pistosaur's neck is short:** `rise` lifts the whole fore-body so it reads as a neck out of the water, checked at pitch 0.95 and in the cine.
  - `falselight.mjs`: the 7.3k faces kept; Walk for the skitter and, faster, the flee (timeScale fitted to speed 4.6 at ×1.6); idle-lure is Idle with the tail chain held high and still; the 52 helper bones and the dead scale keys stripped; **the metallicRoughness and the emissive maps dropped** (its yellow sting tip would read as true light; the code lure's cold glow replaces it); the lure anchors at the sting's end bone; the thin legs checked at ×1.6, pitch 0.95 and quality 0.
- **CREDITS** (CREDITS.txt, src/ui/credits.js): "Pistosaur Animated" by RickStikkelorum (ricksticky), https://sketchfab.com/3d-models/pistosaur-animated-773667575a264c7baa4ec404115a044b, CC-BY 4.0; "Scorpion" by anthonyvanoo, https://sketchfab.com/3d-models/scorpion-4c0fd62d33ab4d2592ee0a1d985a480d, CC-BY 4.0.

## Review pass (27 October)

A review of this contract against the code at 12e94d6 (and the cloud line at 35a3cae) changed it in these places; each is written into its section above, which is what binds:
- **The Mere has its own level** on Act V's bay channel (`TIDE.mere`, `T.mstep`/`T.mh`, `bay` from `L.pocket === 2`, `uBayLevel`, `bayCorners` for drained); `T.force` is never set below the ice, so the clock, its bell, its turns, the dial and the flood waves always run. It replaces `TIDE.force = { h, rate, pocket: 2 }`, which would have stopped the whole sea's clock. Its sync is `o.w[5..6]`; `o.w[4]` stays the gust clock.
- **Saves:** the cloud merge's conflict branch refuses a `newer` copy before it pulls or pushes (a lower `fmt` never replaces a higher one); `startHero` refuses a `newer` `freshHero` result, not only the title; a pre-cloud stale tab's loss of the two legendaries is healed on load, once each; `SAVE_FMT` lives in data.js; `save15` asserts `fmt === SAVE_FMT`.
- **Co-op:** `cells6` (tide.js only) sends the slush as its calls and a key without the time left; the Budget names the diet's bars (events a second, `ch.room()`, `relayStats.cut`, the day caps) and is measured on `NET=supa ... four` with Novas in the drip soak; no `brazier6` interact; `leifLit` and the Flare's `o.l[3]` added; the Rope camp's vendors open for a guest; `presenceAgain` cited for `onWorld`.
- **Hooks named** that lanes need in others' files: story's `coast6`, `weep6` (world.js) and `act6Npc` with its NPC rows (actors.js); combat's `spawnBoss` wake rows and the `nearestInteract` priority (world.js); progression's `lampBonus` and `LIGHT.base` factor (light.js) and `ringPct: 0` (stats.js); look's 'reduce flicker' (`G.settings.flicker`, state.js and panels.js); `SAVE_FMT` in data.js; a `// Act VI: <lane>` block for every lane's scenarios. FAR_BEACONS 7-12 are world's; `perf6` is engine's; the actors.js stand-in rows are combat's.
- **Smaller:** `SHADE_FORM` (not `SHADE`, taken at ai.js:1467); the Ketling's own CAST key `ketling` so its stand-in scale matches; `L.spots.casks` in bottom; the `L.ice?.` guard at gen5.js:787 and :856 too; `L.vault` as patch ids with `L.spots.vaults`; a frame-order list (Who ticks what each frame); the champion line world.js:401; G0's report `reports/stage0-assets.md`.
