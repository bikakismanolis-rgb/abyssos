# Act VII — stage D: the story (`story.js`, Act VII section)

17 November 2026. Built against `docs/act7-design.md`, `docs/act7-contract.md` (Story, catch-ups, events, open
questions) and `docs/act7-design/10-story.md`. The stage-A deeds for `weir7` / `winch7` keep their behaviour (flag
first, `raceTo`, toasts, quest steps); the scenes sit on top of them.

## What plays where

All in `src/game/story.js`, section "Act VII" (from about line 2780). Every flag is saved before its scene.

| beat | trigger | flag(s) saved first | quest | function |
|---|---|---|---|---|
| the hook: pre-dawn narration `d.spring.1-4`, the town turns to `ATMOS.townMorning`, the stream heard (`brookRoar`), seven day-smokes, the child `d.child7.1-3` | town entry with Act VI done, q39, no `call7`; or 2.1 s after `actClosed` / 2.3 s after `boonTaken` | `call7` | 40 | `hook7`, `springScene` |
| Halda at the staff `a1-a6`, the third peak's smoke stops (`d.smoke.1-2`, the lookout got clear), `a7-a8`; she walks out by the mountain road; her anvil stays (`anvil7`: `d.anvil7` then the reforge panel) | talk to Halda (`npcHasNews`: `call7 && !haldaOut`) | `haldaOut` | 41 | `haldaStaff`; `learn7` gives the three Names (`N7learn`) and toasts `name7.given`, `name7.free` |
| arrival at `thaw`: `d.thaw.1-2`, `ATMOS.thawCine` | entry, no `thawSeen` | `thawSeen` | 41 | `thawArrival` |
| Halda at the Goat Track camp `b1-b6` (Ranger `again.r`), then `again`; her stores (smith panel) | talk ("!" until `haldaCamp7`) | `haldaCamp7` | | `haldaTalk7` |
| a weir: flag, `raceTo`, `q.weirOpen`; then the next memory in stone in count order (order kept in `flags.weirs7`); `lamp.buff7` | bus `weir7` | `weirN` (then `mem_sN` at the memory's end) | third: `q.raceLow`, 42 | `on('weir7')`, `nextStone`, `playStone` |
| Halda on the bar before the Den `w1-w3` (Ranger `w3.r`) | talk ("!" until `haldaDen7`) | `haldaDen7` | | `haldaTalk7` |
| Kallisto's wake line `d.kall.0` | bus `bossIntro` (kind `kallisto`) | | | |
| Halda's calls `k1-k3` / `s1-s3`, each once a fight; phase 1 8 s / 10 s in (contract choice 10), phases 2-3 on entry | bus `boss7Phase` (kind, phase, actor) | | | `on('boss7Phase')` |
| Halda's one act: 25 s into Kelados's phase 3 with no lever pulled: `d.halda7.s3b`, bus `haldaLever` (lever, z) and `lever7` (so ai.js opens the channel) | timer from phase 3 | | | same |
| Kallisto's rest: `d.kall.1-3`, cub cry, Halda `k4`, `k5`; `q.stairOpen`; mood `rest`; the zone's theme after | bus `bossRest` `kallisto` | `kallistoRest` (if ai.js has not) | 43 | `kallistoRest7` |
| arrival at `tarn`: `d.tarn.1-2`, Halda `t0` | entry, no `tarnSeen` | `tarnSeen` | 44 | `tarnArrival` |
| Halda at the Stair's Head `t1-t6` (Mage `t4.m`), then `tagain(.m)` | talk ("!" until `haldaHead7`) | `haldaHead7` | | `haldaTalk7` |
| a winch: flag, `q.winchFree`, Memories 4-6 in count order (`flags.winchs7`) | bus `winch7` | `winchN`, `mem_sN` | 44 | `on('winch7')` |
| the wake after Memory 6: `d.kel.w1-w2`, shakes, `tremor`, Halda runs to the rim `s0`, then `s0b`; bus `keladosWake` | Memory 6 ends with three winches | `keladosWake` | 45 | `wake7` |
| Kelados's rest: `d.kel.r1-r5` (`r3` is «Ξεκουράσου.», sting `rest`), `q.keladosRest`; lake to 0.6 | bus `bossRest` `kelados` | `keladosRest` | 46 | `keladosRest7` |
| the great wheel (interact `sluice7`, `sluice.open`, at `L.spots.wheel`, made by `people7`): `sluiceGate`, `lakeOut`, `ATMOS.tarnGold`, the white thread and the rainbow (build7 props), `d.lake.1-2`, Halda `e1-e3`, `q.lakeLet`, `q.46b`, `tarnGreen`; Halda walks off | use | `lakeLet` | 46 (46b) | `on('sluice7')`, `lakeDress7` |
| home: `ATMOS.townDusk`, `d.home7.1` (soft stream), Halda `h1`, child `4-6`, `d.home7.2`, Halda `h2-h3`; the lantern (`setLantern('awake')`, `lanternWake` sfx, `d.home7.3-4`); child `7` with sting `rest`; the seven smokes turn to fires one by one (`softBell`); `d.home7.5`, `d.sleep7.1`, music off, `d.sleep7.2`; four seconds of black (title card with no text), bell at 3 s; morning, bed-roll, `lanternNote`, `d.child7.wake`, `town` theme; `actComplete(7)` (no `victory`), act panel `act7.*` | town entry after `lakeLet`; again on every entry until `h.act7 >= 0` (`z.home7`) | `home7` on arrival; `lanternWake` (`LANTERN_WAKE = true`, owner question 3) | 47 | `homeCine7` |

Who stands where: `world.js` `act7Presence` now calls `people7(z)` (Halda by `haldaSpot7`: camp → `haldaRim` after
three weirs → gone after `tarnSeen`; `tarn` camp → `haldaRim` after `keladosWake` → by the wheel after `keladosRest` →
gone after `lakeLet`; the `sluice7` interact; a lookout at each hut until `firesAll`). `town7(z)` (called from
`townFires`): Halda at the staff while `call7 && !haldaOut`, absent while `haldaOut && !lakeLet` with the `anvil7`
interact, the lantern `awake` with `lanternWake`, the six lookouts by the beacon with `firesAll`.

Lines: `talk7` / `news7` carry the barks during the act (Elianthe `v0`, child `bark`, villagers `v7.1`/`v7.2`, Leif
`v7`, Brokka `7.1-2` with "!", Elati `v7a`) and after it (Halda `v8` then `v9`, child `bark7`, Elianthe `v1`/`v2`,
villagers `v7.3`, Leif's father `v.son7`, Leif `bark7`, lookouts `vigla.1-6/1l/5b/done/home`, Brokka `7.3-4`, Elati
`v7(.r)`, Tamarisk `tam7.v1(.r)`, Selna, Tern, Alkyone, Glaukos `*.v7`). Ivar's echo fought to its end at q40+ saves
`ivarEcho7` and teaches his Name (names7 hook 5). `?nostory` moves flags and quests with no scene (rule 2).

## Scenarios (`tools/scenario7.mjs`, stage D, until E) — all pass on 5311

| scenario | fixture | result |
|---|---|---|
| `hook7` | `fx7_new('town')` (the v22 Act VI-end hero) | pass, 8/8 (migration, call, Halda's word, Names, anvil, bark, goat track) |
| `thaw7` | `fx7('haldaOut','thaw')` | pass, 9/9 (weirs taken 2,1,3: memories still 1,2,3) |
| `tarn7` | `fx7('kallistoRest','tarn')` | pass, 8/8 (winches 3,1,2; wake; calls; lever; rest) |
| `ending7` | `fx7('keladosRest','tarn')` → `act7` | pass, 6/6 (music log `tarnGreen, town, null, town`: no victory) |
| `catch7` | `fx7_new('town')&nostory`, 14 rows | pass, 14/14 (every row of the contract's table, reload with wake) |

Re-run, nothing broke: `hook6` pass, `ending6` pass, `catch6` pass, `title` runs (play, town), `save16` pass, `race`
pass **after one change to it**: `&nostory` added to its fixture query (its weirs now play memories, whose dialog pauses
the world; the test is the water's). Bosses' real `bossRest`/`boss7Phase` are driven on the bus in the scenarios.

## Hooks needed in other files

| file:line | add |
|---|---|
| `src/ui/hud.js:505` (`kill`: zone theme and `Audio.sting('victory')`) | skip both when `a.def?.spare` (Kallisto, Kelados): the story starts the zone theme after the rest scene (audio report) |
| `src/game/data.js` `BOONS` | a `7` row (`thaw`, `den`, `sluice`, keys already in text7): `offerBoons` now loops acts 1-7 |
| `src/world/build.js:3197` (staff `setLantern` colours `C`) | an `awake: [0xffd890, 0xffb860]` entry, a small steady flame (today it falls back to `gold`) |
| `src/world/build7.js` `denMouth` | `userData.setCub(b)` (the cub coming out; called guarded) |
| `src/net/coop.js` (a guest taken up) | names7 hook 4 on her own record (`learn7` is the host's page only) |

## Props / looks the scenes wait for (all guarded with `?.`)

The cub (`den.userData.setCub`); the lantern's `awake` state; one apple tree in blossom by the staff (`d.halda7.h1`);
the stream strip at Whitecliff (brown / clear): only the sound plays, the lines stand as narration; a slide sprite on
`FAR_BEACONS[9]` (snow particles stand in); Kallisto seated/asleep with the cub after the rest (ai.js's rest body).

## Text keys

Added (`50-text-extra.md`, new block): `npc.mason`, `npc.mason2`, `npc.masonOld`, `npc.shepherd` (the speakers'
names in the memories). Reworded: `d.halda7.k2` (10-story) to «Τη στρίμωξες, και τώρα είναι χειρότερη! Όταν σηκωθεί
στα πίσω πόδια, μακριά της!» / "You've cornered her, and she's worse for it! When she rears, get clear of her!" (the
contract: no water moves in her fight); `q.slide`, `hud.swept` in 30-mechanics' table (the lead's 50-text-extra
wording already overrides them). `node tools/text7-import.mjs`: 286 keys, no conflicts. CSS: `body.memory-stone` and
`#dialog[data-who="stoneMemory"]` in `src/ui/style.css`.

## Readings made / not done

- Flag names: the design's `haldaV8` is Act VI's flag already (story.js, Act VI talk); Halda's after-act first talk
  uses `haldaV9`, Elianthe's `elianteV9`. Order arrays `flags.weirs7` / `flags.winchs7`; `names7Told`.
- A memory owed plays itself 2 s after entry (no «Θυμήσου» prompt).
- Not done: the `echo.*` prompts (bosses' builder); the Rested greeting (mechanics'); Halda's field anvil props.
