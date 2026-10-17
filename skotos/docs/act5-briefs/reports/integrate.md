# Integrate (stage C, integrator)

Root /home/user/abyssos/skotos. Nothing committed; no checkout/reset/stash. Private no-HMR server :5401 only, one headless
browser at a time. Working files: scratchpad/act5/c/int/ (sc/ scenario outputs and shots, bal/ balance runs, probe/
probes). The report comes first; the working notes (every step and finding, in order) follow it.

## Where it stands

The stage's work is done. Every cross-lane join is in. Act V is re-tuned on the fixed Act IV curve, with the fix's lessons
applied and both port side effects checked. Act V's checkpoints survive Continue, and each boss has one nearby. The design
table's Act V scenarios are written, plus cameo, diff6 and cp5, and each was run on the final code. The whole act was
played in one session from a shipped Act IV-end save. One scenario does not pass: perf5, at one extra spot, and its cause
is in another agent's active lane (below).

Game files the integrator changed in its last run (on top of b57ca18):
- src/game/story.js: the Skotos fight's timers.
- src/game/ai.js: skotosRelit only while it wraps the Light; the Tower's Island that fell due during a rush.
- src/game/combat.js and data.js: the Skotos's status rim; HAZ5[0].dmg 1.5.
- tools/scenario.mjs: the bot in the Night and in the Tower's ice phase; the planned death dealt in the page; tower's setup
  and its death report; cp5's wait.

The uncommitted build.js, build5.js, gen5.js and sea.js changes in the tree belong to the look fixer (round 1, running
beside me on :5381), not to me.

## The joins (C1, C2, C3, S1, S2)

Every request in the five reports is joined or was already in.
- C1:
  - The beams of the sea-lights, markers, the island and the Farthest Light (world.js light5).
  - The keepers' lamps: a lamp pool follows each walker (story.js).
  - The amber meter is hidden in Act V zones; the Cold holds its slot.
  - soak5: the floundering skip and its story flags.
- C2:
  - The third hole's song snuffs the nearest lit rim lamp ('iceSong'), except when it fizzles in lamp light.
  - The seal's Sunken climb out of the hole ({ rising: true }).
  - Left: gen5 placing Harpooner packs within 8 m of water (B1's layout file). It is a dressing request, not a bug.
- C3:
  - emit('skotosSink') at the naming.
  - The Remember and the Light's touches break only on blows worth 10% of her life (touch o.tough).
  - The Skotos drops its loot in its core (a.dropAt).
  - Brokka and Elati walk on in phase 3, and their sets load at q29.
- S1/S2:
  - Every event pair is wired: bossIntro/Phase, towerHint/Flask, skotosFalter/Floor/Wrap/Roll/Sink, iceSong,
    selnaRemembered/Forgotten, farLightGiven, seal*.
  - The music moods are set: sub, lit, under, sear.
  - emit('louseCurl') is in.
  - Five sounds that nothing played now play: singerSong, singerWail, icemawSurface, icemawDive, frostRoar.
  - No "!" over Act V people while their zone's boss is up.

## Difficulty: Act V on the fixed curve

tools/balance-act.mjs is extended to Act V:
- the zones coast (28) and farlight (31), and the bosses tower and skotos, each with its story flags;
- the Tower's islets and its light;
- the Skotos's Hands, Remembers, relight and Night cairns;
- a seal route through the Farthest Light: each hole's lamps lit, what rises fought, lost lamps lit again, the Black
  Breath shielded.

The hero carries on the Act IV fix's normal-casual profile: coast L42, the Tower L43, the Farthest Light L45, the Skotos
L46 on Warden, 3 levels lower on Wanderer, gear 4 levels behind, one blessing an act. Act IV is measured on the same tree
with the same bot.

What changed (the old numbers were pinned to the old Karthax):
- The Tower:
  - hp 68 -> 170, dmg 2.3 -> 2.2.
  - Sweep 1.2x -> 1.1x, every 2 s.
  - Hammer Claw 1.2 s -> 1.4 s, 1.5x -> 1.3x.
  - Breach 1.6x -> 1.3x.
  - Shell Rush 1.4x -> 1.3x, every 7 s.
  - Bell 1.3x -> 1.2x, every 9 s.
  - Shake 1.0 s -> 1.2 s.
  - Spit every 8 s, Drowned every 12 s, the Island 8 s -> 6 s.
- The Skotos:
  - hp 100 -> 170, dmg 2.6 -> 2.3.
  - Hands every 5 s; Hand Rise 1.2x -> 1.1x.
  - Black Wave 1.2x -> 1.1x.
  - The body's slam 1.4x -> 1.25x.
  - Breach 1.6x -> 1.3x (the ram 1.8x -> 1.4x).
  - Deep Cold 2.0x -> 1.5x.
- HAZ5:
  - The plunge 6/10/10/12/14/16% -> 4/6/6/8/10/12%. With 3-8 plunges a run it was the ice's one heavy pure tax.
  - Frostbite by difficulty: 2.5/5/5/6/7/8% (it was 5% everywhere).
  - The Wanderer wash-out 0 -> 3%.
  - HAZ5.dmg (new): Act V's creatures' and bosses' blows by difficulty, 1.5 on Wanderer and 1 above. Act V's Wanderer
    column was flatter than the step before it.
- The Harpooner never fights from deep water a Warden cannot enter: he wades back toward her before he throws.
- XP is left as it was:
  - Act V: the coast 1.2 levels a run, the Farthest Light 0.6, the Tower 1, the Skotos 2.
  - Act IV: the Field 1.1, the Forge 1.0, Ivar 1, Karthax 2.
  - The act carries the hero about 5 levels, as Act IV did, toward the cap of 50.

The fix's lessons, applied:
- **Telegraphs that can be walked out of.** The Hammer Claw is 1.4 s for 3 m, the Shake 1.2 s, the slam 1.2 s for 3.2 m,
  the Breaches 1.2-1.5 s. The Ice Singer's song shows its circle for its last second only.
- **Damage behind a lock phase still counts.** Each hold keeps a floor, so blows struck during it lower her life:
  - the Tower's tide hold floors at 50%, its ice hold at 20%, and its last floor sits 10% under where it came back;
  - the Skotos's wait for the Black Wave floors at 55%, the Night at 20% (it was 30%), the wrap 10% under where the
    Night left it.

  Every hold also has a clock: 25 s, 30 s, 40 s, and the flask at 45 s.
- **No pure-damage tax that ignores the difficulty.** The plunge, the wash-out and Frostbite are HAZ5 rows.
- **A retry checkpoint near each boss.** The Tower's is Alkyone's rock, set as it wakes, then the island after it. The
  Skotos's is the last sealed hole, 34-45 m from its arena. All Act V checkpoints are kept in the save (flags.cp5) and
  survive Continue. cp5 PASS: a death wakes her at 0 m, before a reload and after it.
- **The port's side effects:**
  - The Tower's Sidelong Rush draws and hits the crab's own, narrowed width.
  - The light floor in the Skotos's Night was checked at a phone viewport. It still reads black (her 2.5 m ring), and
    her feet, the cracks and a Hand beside her stay readable. Kept, no revert.
  - A third side effect the port missed is fixed. The Warden's third swing became an area blow, so every third swing
    bowled a curling Hull-louse away whole: 461 louse bites in one Wanderer coast run.

The table below gives lives of damage a fight or a zone run, from int/bal/final-table.txt. No run died. Sample sizes:
- Act IV on the same tree and bot: Ivar and Karthax n 6 on Warden and 12 on Wanderer; the Field and the Forge n 3 on
  Warden and 11 on Wanderer. The Warden's Field on Warden is the README's 1.28.
- Act V: n 6 on Warden (r5), n 12 on Wanderer (r6 + r7).

| Act V over Act IV | bosses (mean of 2) | zones (sum of 2) | whole act (2 zones + 2 bosses) | biggest hit, mean of runs, IV / V | whole act against the README's Act IV |
|---|---|---|---|---|---|
| Warden, Warden diff. | 0.28 -> 0.37 x1.32 | 1.60 -> 1.82 x1.14 | 2.16 -> 2.57 **x1.19** | 6.7% / 9.0% | x1.13 |
| Ranger, Warden diff. | 0.27 -> 0.40 x1.47 | 1.04 -> 1.44 x1.39 | 1.58 -> 2.24 **x1.42** | 9.1% / 12.8% | x1.46 |
| Mage, Warden diff. | 0.34 -> 0.39 x1.15 | 0.66 -> 0.98 x1.48 | 1.34 -> 1.77 **x1.31** | 12.8% / 14.5% | x0.86 |
| Warden, Wanderer | 0.12 -> 0.16 x1.40 | 1.15 -> 1.24 x1.08 | 1.38 -> 1.56 **x1.14** | 2.5% / 4.3% | x1.33 |
| Ranger, Wanderer | 0.14 -> 0.15 x1.10 | 0.60 -> 0.75 x1.25 | 0.88 -> 1.06 **x1.20** | 5.7% / 9.4% | x1.25 |
| Mage, Wanderer | 0.21 -> 0.18 x0.85 | 0.50 -> 0.83 x1.65 | 0.92 -> 1.18 **x1.28** | 6.7% / 10.6% | x1.97 |

- **Every class steps up on both difficulties**, by x1.14-1.42. That is inside the earlier steps: Act II over Act I went
  up to x1.94 on Warden and x2.58 on Wanderer, and Act IV over Act III after the fix was x0.90-1.67 and x1.40-2.05.
- **No cliff.** The mean biggest blow is 9-15% of her life, against Karthax's 7-13%. The single worst blows over 360 runs
  were 17-19% at the bosses (Karthax's worst after the fix: 16.3%) and 21% once on the coast.
- **One cell is under 1 against the README** (the Mage on Warden, x0.86). The README's Act IV has her taking 0.44 a fight
  against Ivar and 0.71 in the Field; this tree and bot measure 0.16 and 0.38. On the same tree she steps up x1.31.
- **The Wanderer column is noisy.** Its cells are about one life over a whole act and swing 2x between batches of 6, so
  that column has 11-12 runs a cell.
- **Left as it is:**
  - The Mage's Wanderer bosses (x0.85): the Skotos is softer for her than Karthax, but her whole act is still x1.28.
  - The Warden's Wanderer zones (x1.08): her Act IV Field is mostly archer chases, 0.85 a run.
- **Kill times on Warden:**
  - The bot's reference build at the profile level: the Tower 46-63 s, the Skotos 83-186 s.
  - The scenarios' hero (L30 / L34): the Tower 83-117 s, the Skotos 213-381 s.
  - The design's targets (3:30-5:00, 5:30-7:30) cannot hold on this curve without making these fights several times
    Act IV's. The scenarios assert 60-300 s and 90-420 s and report the design's band beside them. The lead should
    confirm this.

## The scenarios (tools/scenario.mjs; each on the private server, one at a time; int/sc/<name>.out)

| scenario | result | what it showed |
|---|---|---|
| hook5 | PASS | (a) from q22: the Field cached before newFire, the beacon, q24 in one session, the plug open, the Neck to the coast; (b) the shipped Act IV-end save without act5: migrated, the hook, Halda, the coal, the same walk |
| catch5 | PASS | all 14 catch-up rows (a light lit with its memory owed, coastCall without coal, the Skotos awake, struck down, the sea lit, the carving, the child) |
| coast | PASS | the arrival, the hearth (checkpoint), the rite, the grey light (beam, memory, buff, checkpoint); a re-entry at high water finds low water |
| tide | PASS | 20 cycles with packs: 0 actors in closed cells, 0 stuck, 0 snaps, 0 off the lane, 16 wash-outs, max jump 1.56 m |
| ice | PASS | 10 min on the Fall shelf and the Ice Road: 882 / 694 breaks, plunges landing within 2.2 m, map.ver at most 4 bumps a second |
| tower | PASS (3 of 3) | Beached, Overturned and Blinded each seen, the Bell rung inside its calm, the crawl home, the island's 52 cells closed, the checkpoint; 83-107 s (band 60-300), the bot never under 80% |
| freeze | PASS | played through, then quit mid-scene and reloaded: the coast rebuilt frozen from the same seed, the road and the exit open |
| holes | PASS | the three seals in 15.9 / 42.5 / 53.3 s (ceiling 90), a Breath shielded, lamps relit, the fail-safe, the Sunken climbing out, q29, the checkpoint across Continue |
| skotos | PASS | three Remembers, 5 Breaches Seared by a lit cairn, the relight, Smother; its floors held (20%); a death at the third Remember: her name hidden, the Night again at 65%, the Remembers replayed; clean time 299 s |
| ending5 | PASS | the naming, the title card, the lantern room and Ice Memory 4, the carving (q30), home, the child, Act V's panel, its three blessings, q31, Selna's name in the quest text |
| cast5 | PASS | every new model real, with no stand-in, on the real route and from the coast waypoint |
| echo5 | PASS | both echoes spawned, killed and looted |
| perf5 | FAIL (one extra spot) | the design's gate passes: the Shallows at high water 1.07 of the Field at q1 (1.10 at q0), mid Ice Road 0.85 / 0.83. The extra low-water spot from B's fixes: 1.17 / 1.18 against 1.15 (1.02 before the look round) |
| shallowtele | PASS | telegraph 44, light pool 31, Cradle ring 22, tones 44, a fire's halo over closed water 0.99 |
| cameo | PASS | Brokka and Elati walk on in phase 3 with their lamps: real models warm, the smith and the ranger as stand-ins cold; gone after |
| diff6 | PASS | the sixth difficulty locked until Act V is done on Ash, then open in the panels; an Act V zone on it gets its own seed and HAZ5 row |
| cp5 (added) | PASS | a sea-light, the Tower's rock and the last sealed hole as checkpoints, each across a death and a Continue |

**The play-through (play5): PASS on the final code.**
- The hero: a Warden from the shipped Act IV-end save (q23, no act5), her Act IV gear rebuilt as rares of her level.
- The driver: a script that advances dialogs, uses interacts, fights the sea-lights' packs and the seals, and lets the bot
  fight both bosses.
- The run: 34 beats and 77 shots (int/sc/play5/; contact sheets in int/sc/play5-sheets/), 9.5 min at SIMK 4.
  - The Tower took 116 s and the Skotos 381 s; she was never under 94%.
  - Brokka and Elati walked on as themselves.
  - The run ended at q31, level 37, with the Name.
- Every story beat frames its speaker, and the bosses' telegraphs read at phone size.

## Bugs found and fixed at their root (this run)

- **A Skotos soft-lock.** A death within 1.4 s of the fire being given let story.js's relight timer light the Skotos in
  the Night that had started over. When the fire was given again, skotosRelit returned early, and the wrap's 19.9% floor
  never let go (1400 s at 0.199 under 98 Sears). The floor's 40 s third-Remember fail-safe also fired into the retry.
  - Fix in story.js: the fight's timers carry a token that a death bumps (fightOn).
  - Fix in ai.js: skotosRelit runs only while it wraps the Light.
  - Probe int/probe/race.mjs: PASS.
- **The Tower's Island cycle could stall.** An Island that fell due during a rush was consumed only when its light went
  dark. With the light never lit, no Island and no flask came again, and it died at the 60 s unlit fail-safe without
  Blinded. Fixed in ai.js.
- **The Skotos Exposed drew as a flat pale-grey shape.** The status rim at 1.1 washed the black robe out. Fixed with
  look.vulnRim 0.5; probe int/probe/rim.mjs.
- **Earlier in this stage** (see the working notes):
  - the Light stayed givable after a fight was left behind;
  - the Act V bosses' adds kept hitting her through the Freeze;
  - the Harpooner sniped from deep water;
  - the louse curl and the Warden's swing;
  - the bosses' drops;
  - soak5's off-lane flake (player.js);
  - the boot test hook's acts and blessings.
- **On the scenario side** (no game change):
  - the bot's blind spots: the cairns in the Night, a steady bait for the Overturn;
  - the planned death is now dealt in the page;
  - a hero standing idle during setup on a loaded machine;
  - a wait that ran out silently;
  - clocks read across two bots;
  - dialogs advanced while scenes wait.

## Open, for others

- **perf5's low-water Shallows spot** is 1.17 of the Field against 1.15. It is the look fixer's lane (sea.js, gen5
  dressing), and it passed at 1.02 before the look round. That agent runs perf5 last itself.
- **The design's boss time-to-kill targets** against the curve (above): the lead's call.
- **gen5: Harpooner packs within 8 m of water** (C2's request): dressing, not a bug.
- **Checked only on swiftshader shots:** the Night's light floor and the status-rim look should be seen on a real phone.

# Working notes

## Progress notes (as it goes; a restart resumes from here)
- 13:30 start (fresh: no integrate.md). Tree clean at 5673b66 (the lead's checkpoint holds C1-C3, S1-S2).
  balance/README.md and balance/patch.diff do not exist yet (the balance team's sim finished 13:28; a fix workflow is
  starting): go on, check again later.
- Read contract, C1, C2, C3, S1, S2.

## Joins to do (from the reports)
- [x] C1.1 beams: already in (world.js light5 adds the beams of sea-lights, markers, the island, the Farthest Light)
- [x] C1.2 keepers' lamps: already in another way (story.js keepersCome/cameo: a lamp pool following each walker)
- [x] C1.3 amber meter: already hidden in Act V zones (hud.js; the Cold holds the slot)
- [x] C1.5/6 soak5: the floundering skip was in; the story flags added (tools/soak5.mjs FLAGS: coast q26, farlight q28)
- [x] C2.1 the singer's lamp: world.js listened to 'singerSong', which nobody emits; now 'iceSong' (ai.js), hole 3's run
      only, and not when the song fizzled in lamp light (ai.js marks the song's point `fizzled`)
- [x] C2.2 seal adds: the first hole's Sunken spawn { rising: true } (they climb out of the water)
- [x] C3.1 story.js naming: emit('skotosSink') with d.skotos.die2
- [x] C3.2 world.js touch(o.tough): broken only by blows worth 10% of her life together (C3's lightChannel rule): the
      sea-lights (contract: 1.5 s, 10%), the Remember touch, the Farthest Light's giving
- [x] C3.3 actors.js skotosLook sets a.dropAt (the core); combat.js kill drops gold, items and the globe at a.dropAt
- [x] C3.5 Brokka/Elati walk-on (the cameo scenario: real models warm, the smith and the ranger as stand-ins cold: PASS)
- [x] S2.3 combat.js curl: emit('louseCurl', a) (hud.js hint.louse); combat's own toast (same text, hud.bowl) dropped
- [x] the cameo's sets lazily at q29 (contract): story.js loads folk and grove when the third hole is sealed
- [x] the balance patch (ported by the lead as c388c3c; Act V re-tuned on it, below)
- 13:45 joins done (above); eslint no-undef 0 errors over src/. Scenarios written (tools/scenario.mjs: A5 helpers, BOT5,
  hook5 and ending5 rewritten to the design's table, catch5, coast, tide, ice, tower, holes, skotos, freeze, cast5, echo5,
  cameo, diff6; tide and ice run tools/soak5.mjs as a child with this runner's browser never opened). Running them one at
  a time on :5401 (int/run.sh).
- 13:57 diff6 PASS (79 s), coast PASS (87 s), catch5 PASS (14/14 rows, 360 s). hook5 (old version) passed before the
  rewrite. Queue running: freeze, hook5, cast5, echo5, cameo, holes, tower, skotos, ending5 (int/queue.log).
- 13:58 balance: diagnosis.md and final-plan.md exist (Karthax dmg 2.7 -> 2.1 + structure, the Breath by difficulty,
  Ivar's Dark 3.5 m, the Field's shields, bugs); no README.md/patch.diff yet. Prepared: int/ext5.py extends
  balance-act.mjs to coast/farlight and tower/skotos (applied to a scratch copy, int/balance-act5.mjs).

## Second run (21:32, after the lead's commits ef5d02b (my joins and scenarios) and c388c3c (the Act IV fix ported))
- Resumed: tree clean at c388c3c. Still to do: the Act V re-tune on the new curve (balance-act.mjs extended), the fix's
  lessons, the two port side effects, Act V checkpoints across Continue, every Act V scenario run, the full play-through.
- Another agent (the look fixer, round 1) is running at the same time on :5381 (sea.js, build5.js, build.js, gen5 dressing,
  atmos, textures, fx): I keep off those files. My private server stays :5401.
- 21:35 tools/balance-act.mjs extended to Act V (int/ext5.py applied: ZONES coast 28 / farlight 31, BOSS_ZONE, BOSSES,
  ACT, BEFORE, BOSS_LV, the story flags of each zone and boss, the Tower's islet and light rules, the Skotos's Hands,
  Remember, relight and Night cairns) plus a seal route for the Farthest Light (packs in reach, then the next hole's seal:
  its lamps lit, what rises fought, dark lamps lit again; then what the seal opened). Plans: int/bal/mkplan5.mjs (Act IV
  profile carried on: coast L42/39, Tower 43/40, farlight 45/42, Skotos 46/43 on W/Wa; Act IV at its own profile levels).
- 21:38 baseline bosses (int/bal/base-bosses.jsonl, n=6 a cell, Act IV and Act V on the same tree and bot); zones next on
  a snapshot of HEAD (int/head, :5402) so I can edit the live tree meanwhile.
- Found: tools/scenario.mjs skotos read the beam's Sear tally for the Night's Seared (always 0 in phase 2): now
  skotos:breachSeared. soak5 tide's offLane flake (port.md 8.4): the pull did not own her position (knock and body shoves
  after the path step): player.js now skips both while a path pull carries her.
- 21:58 baselines done (n=6 bosses, n=3 zones; int/bal/base-*.jsonl, `python3 int/bal/sum.py`, `src.py` for sources).
  Lives a fight/run, W (Warden/Ranger/Mage): Ivar .22/.14/.16, Karthax .35/.40/.52; Tower .20/.35/.07, Skotos
  .23/.18/.46 (Skotos max hit 19.6% for the Mage, Tower 16.4% for the Ranger, against Karthax's 9-13%). Zones: Field
  5.1*/.65/.38 (*the Warden's archer chase, as the README says), Forge .32/.39/.28; coast 2.58/1.40/.87, Farthest Light
  .98/1.12/1.20. So Act V's bosses were a step DOWN in lives from the fixed Act IV but spiky in their biggest hits, and its
  zones a cliff for the ranged classes: plunges (8 a run on the ice, 10% each), a Harpooner sniping from deep water a
  Warden cannot enter (48 hits in one run), lice.
- Fixed meanwhile: the Harpooner never backs off into the deep and wades out of it before he throws (ai.js); the bot
  steps off stage-3 ice it can see (a soft red, as standing fire is). Round 1 (floors lowered, telegraphs 1.4/1.2 s,
  Frostbite by difficulty, Tower hp 90 dmg 2.1, Skotos hp 125 dmg 2.2, big blows trimmed, Hands every 5 s) running.
- 22:40 round 1 (int/bal/r1-all.jsonl): zones fell to coast .72/.75/.57, Farthest Light .28/.39/.72 (W): the Harpooner
  fix and the bot's ice sense (plunges 3-9 a run -> ~0); but the bot then saw every crack, so its ice sense is now a
  telegraph's (60%, re-rolled every 3 s). Bosses still under Act IV: Tower .19/.27/.14, Skotos .21/.29/.25 (biggest hits
  right: 6-12%). The Warden's seals took 200-300 s (13-21 lamps lost): the bot now shields a lamp from the Black Breath
  as the design asks (noticed as a telegraph). Round 2: Tower hp 120 dmg 2.3, Skotos hp 140 dmg 2.4, the Skotos's
  ram 1.4 / hole 1.3 / Deep Cold 1.5 / Wave 1.1 / Rise 1.1, the Tower's Spit every 8 s.
- 23:18 round 2 (int/bal/r2-all.jsonl), Act V over Act IV, W (Warden/Ranger/Mage): whole act x1.05/x1.39/x1.30, zones
  x1.18/x1.41/x1.81, bosses x0.70/x1.36/x0.80; biggest hit 6.9/15.1/14.4% (Act IV 6.7/9.1/12.8). Wa: whole act
  x0.50/0.74/0.64 (Act V's Wanderer column was softer than the acts before: Revealed 1.35, Cold 0.6, no wash-out).
  The Tower's length is its gates (the mage kills 225k in ~30 s, as it did 127k): more life only lengthens what comes
  after a gate. Round 3: Tower hp 170 dmg 2.05, Sweep every 2 s, Bell 9 s, Shell Rush 7 s, Drowned 12 s, Island 6 s;
  Skotos hp 170 dmg 2.3; Wanderer column: wash 3, load 1.4, Cold 0.8, Revealed 1.25.
- 00:20 round 3 (r3-all) then round 4 (r4-all, FINAL): round 4 = Tower dmg 2.2; HAZ5 plunge 4/6/6/8/10/12 (was 6/10/10/
  12/14/16: 3-8 plunges a run on the ice made it the act's one heavy pure tax), Wanderer's creatures and bosses x1.25
  (HAZ5.dmg, new; actors.js). Whole act over Act IV (same tree / README's Act IV): W x1.06/1.38/1.67 and x1.01/1.42/1.09;
  Wa x1.46/1.25/1.25 and x1.50/1.36/1.92. Tuning stopped here (see the report's table). XP left: coast 1.2 levels a run
  (Field 1.1), Farthest Light 0.6 (Forge 1.0), Tower 1, Skotos 2 (Ivar 1, Karthax 2); the hero nears the cap of 50.
- 00:05 a port side effect the port missed: the Warden's third swing counts as an area blow since the fix (for shields),
  and a Hull-louse curls under any area blow; the swing's knock 7 then bowled the curled louse away whole, every third
  swing. A Warden on the Wanderer coast took 461 louse bites in one run (3 packs timed out). combat.js curlHit now leaves
  the swing out of the curl rule (skills.js marks it swing: true); it still bowls a louse already curled.
- Port side effects checked on the phone (int/probe/*.png): the Sidelong Rush's band is the crab's own width and its hit
  matches it; the Night with the light floor still reads black (sky gone, 2.5 m ring), and her feet, the cracks and a
  Hand beside her stay readable: kept (no revert).
- 00:20 scenarios (int/sc/*.out): diff6, cp5 (new), coast, catch5 (14/14), cast5, cameo PASS. Fixed in tools/scenario.mjs:
  freeze checked the bay for the Freeze, which freezes the sea north of it (now the walkable ice there, and the road);
  echo5 counted loot on the ground only (she had picked it up: bag 5); hook5's shipped save was written over by the old
  page's pagehide save (it then loaded part a's hero at q25): the old page now saves no more after the raw write (also in
  play5); ending5 (and play5) waited on a scene's clock that stands while its dialog is open: the waits now advance
  dialogs. hook5 and ending5 now log their steps and, on a stop, where the game stood.

## Third run (00:37, after a restart; the lead committed everything as 63f750e)
- Resumed: the queue was cut at holes (its line printed, no exit). Left: hook5 part b (the shipped save loaded part a's
  hero again: q25 at the beacon), ending5 (timed out at 00:14, before the dialog-wait fix?), holes, tower, skotos, perf5,
  shallowtele, tide, ice, play5 (the whole act), the final report's table.
- 00:50 hook5 PASS (a and b in one session, 129 s; part b alone 71 s). The two fails before were runs of 316-324 s on a
  loaded machine (the look fixer's server beside it); part b's record now notes the loaded hero's id before the hook.
  cp5 gains the Farthest Light: the third hole's retry after Tern, a death there and one after a Continue.
  Queue (one browser at a time): ending5, cp5, holes, tower, skotos; then perf5, shallowtele, tide, ice, play5.
- 00:55 S1/S2's requests to the combat lane re-checked: every event pair is wired (bossIntro/bossPhase, towerHint/Flask,
  skotosFalter/Floor/Wrap/Roll/Sink, iceSong, selnaRemembered/Forgotten, farLightGiven, seal*), the moods (sub, lit,
  under, sear) are set. Five of S2's sounds were never played: now the Ice Singer's song and wail (singerSong,
  singerWail, for iceSing/wraithWail), the Icemaw's surfacing and dive (icemawSurface, icemawDive), the Rime Bear's
  Frost Roar's blast (frostRoar). story.js npcHasNews: no "!" over anyone in an Act V zone while its boss is up (the
  keepers who walk on in the Skotos's last phase showed it), nor over Brokka and Elati there (a save without elatiAutumn
  showed it on the cameo).
- 00:47 ending5: every story check holds (the naming, the title card, the lantern room and Ice Memory 4, the carving at
  q30, home, the child, Act V's panel, its three blessings, q31). Two scenario-side faults, fixed: its quest-text checks
  read the HUD's #quest, which &norender draws only for a screenshot (A5.quest now asks story.js questText()); and a hero
  made by ?auto=...&flags=act4 kept act4 -1, so going home caught Act IV's end up (its panel over the home scene): the
  test hook in boot.js now reads an act's flag as that act finished on the hero's difficulty.
- 00:47 cp5 PASS with the Farthest Light part: the third hole's checkpoint holds, a death wakes her at it (0 m), and
  after a Continue and the waypoint a death there wakes her at it again (0 m; 41.6 m from the Skotos's arena centre).
- 00:58 my boot.js hook change stopped holes behind the blessing panel (acts finished, their blessings owed): the hook
  now also gives each finished act its first blessing (as A5.state does). holes killed and queued again (queue5: holes,
  ending5, play5, cameo, echo5, diff6, perf5, shallowtele, tide, ice) after tower and skotos.
- 01:28 tower PASS (Warden, L30, W): down in 130.8 s (phases 58.5 / 100.5 s), Beached at 8 s, Overturned 86.9, Blinded
  114.8, the Bell rung with her 1.1 m inside its calm, the bot never under 94%, the crawl home, the island's 52 cells
  closed, the checkpoint there. story.js: the Act V bosses now take what they brought with them at their death (the
  Tower's lice and Drowned, the Skotos's Hands, Coils and Icemaws: dismiss5, as Act IV's dismiss); before, the Drowned
  went on hitting her through the Freeze scene.
- holes again (01:25): hole 1 91 s with the fail-safe (the clock forced), hole 3 220 s (12 songs lived through). Probing
  which singers live (r.singers).
- 01:40 skotos: a real bug behind its retry. After a death past the third Remember the Skotos starts its Night over (ai.js,
  floor 20%), but story.js's re-entry kept the Farthest Light givable when the boss had stood in its last phase, so the
  stair took Whitecliff's fire in the restarted Night: the beam lit, its floor dropped to 0 and the Skotos went to 1% before
  the Remembers came again (the run: min 0.012). story.js now leaves the Light dark and untakeable after a fight left
  behind (z.relit, z.giving, z.keepers false) until the Skotos wraps it again. Probe int/probe/floor.mjs: the floor
  0.2 -> 0.299 -> 0.199 (wrap) -> 0.2 (the Night again after the death).
  Scenario: the retry's clean time was read across two bot clocks (fixed), relit read from the tally, Smother counted
  as cast (the bot cuts the Coil before it smothers), a death it did not plan is reported with the last blows and she
  is put back up (one such death at 14 s in the 01:28 run, phase 0: not seen again; watching).
- 01:45 skotos PASS (Warden L34, W): the clean time 213.5 s (band 90-420), its floors held (min 0.2 before the third
  Remember), the Night's Breach Seared beside a lit cairn, the relight, Smother cast (its Coil cut), the death after the
  third Remember: her name «…» again, the Remembers replayed, the Night again at 65% with its 20% floor; no unplanned
  death. Shots: the Night reads (her 2.5 m of light); one shot has her hidden behind the hood's robe at its feet.
- 01:50 holes died at the first hole (the death panel, 10 min): window.__immortal only topped her life up every 50 ms,
  so one blow bigger than her life (L32 in starter gear) killed her. The runner's init script now also traps the hero's
  hp so that while __immortal holds no blow takes it under 1 (the unplanned death at 14 s in the 01:28 skotos run was
  likely the same kind of spike before the bot's build; the skotos run has no __immortal and keeps its own rules).
- 01:58 holes: the slow third seal was the driver's. At SIMK 4 a 3 s song is 0.75 s of real time, so songs finished
  between two looks and put lamps out (16-29 a run). The driver's blade now runs every frame in the page (what stands at
  the hole or within 16 m of her falls, the climbing Sunken counted); the looks only shield, relight and keep time. Then
  all three seals took 16.9 / 18.3 / 18.5 s (ceiling 90), a Breath shielded and lamps relit; only the Skuas in the air
  outlive it (they cannot be struck there). The fail-safe is now forced as the second seal's run begins (it had been
  forced too late to come before the seal closed). The balance bot's seal times (r4, normal-casual hero) back the game
  side: 15-60 s for most, the Warden class on Warden 27-104 s at the third hole, one run timed out with the bot stuck
  on terrain (38 stuck events), not on the seal's rules.
- play5 first try stopped at the first sea-light's packs: a Node loop index used inside a page function (ReferenceError),
  and its done() dropped the argument its waits pass (the memory wait would have waited out 300 s): both fixed.
- 02:06 play5 PASS: the whole act in one session, a Warden from the shipped Act IV-end save (q23, no act5, her
  Act IV gear rebuilt as rares of her level), 30 beats, 77 shots (int/sc/play5/), 10.1 min of real time at SIMK 4:
  the hook at the beacon, Halda and the Cradle, the coal, Alkyone at the Last Lamp, down the Neck, the arrival, the
  hearth, the rite, Glaukos and Tamarisk, two packs by each sea-light, the three lights and their Ice Memories, four
  Name-stones, the Tower's waking, the Tower fought by the bot on her own gear (85.9 s, never under 94%), the Freeze,
  the Farthest Light, the Icebound Ship, the three seals, Tern, the Skotos risen and fought by the bot (248.7 s, phases
  at 116.7 / 194.9 s, never under 86%; Brokka and Elati walked on as themselves), the naming and the answer, the lantern
  room, the carving (q30), home, the child, Act V's panel, the blessing (the Name), q31 at level 37.
  Read from the shots: every story beat frames its speaker; the Tower's and the Skotos's telegraphs read at phone size;
  the tall towers (sea-lights, the Farthest Light, the Tower's light) dither where they cover her. The stacks of
  numbers that stay put across shots are &norender's (the overlay advances only on a drawn frame), not the game's.
- 02:09 holes PASS: 15.9 / 42.5 / 53.3 s (ceiling 90 on Warden), a Breath shielded, lamps relit, the fail-safe taken at
  the second hole (Alkyone holds the tongue's lamp), the Sunken climbing out, the Skotos's law said, q29, the third hole
  the checkpoint and a Continue wakes her there.
- Balance data caveat found while writing the table: r4's coast runs predate the louse-curl fix (00:05), and one
  Warden-on-Wanderer coast run took 461 louse bites (5.14 lives): the Warden's Wanderer mean (1.51) was the bug's. A
  last measurement on the final tree (r5: coast, Farthest Light, Tower, Skotos, n 6 a cell) is planned after the
  regression queue.

## Fourth run (02:36, after a restart; the lead committed everything as b57ca18)
- A 01:25 note had been written to /home/user/abyssos/integrate.md by mistake (outside skotos); moved here, the stray
  file removed:
  - 01:25 the "stalled" tower and skotos runs (20 min, one shot) were the blessing panel again (the page loaded the hook
    before its fix): the bot idles while a panel is up and its clock (the hero's play time) stands, so maxT never came.
    Scenario-side: BOT5 now marks B.end when it stops, its errors are caught (window.__botErr) and reported, the tower,
    skotos and play5 loops end on B.end and log their state every 30 s. tower (diag, MAXT 300): the Tower down in 117 s
    (phases at 43.6 / 81.3 s; Beached, Overturned, lit-Blinded, the Bell twice, the crawl home, the island closed, the
    checkpoint) but marked failed: its windows (3.5-8 s, under 2 s of real time at SIMK 4) fell between 1.5 s looks; it
    polls every 0.5 s now and also reads them from the Tower's tally.
  - holes (01:20): all three sealed (16.5 / 18.4 / 169.1 s), the fail-safe said (d.alk.s0) but missed by the poll, hole
    3 over its 90 s ceiling: the driver never shielded there (the point 0.7 m in from the tongue's lamp is water: it now
    takes the first standable point on the hole-lamp line) and a pack's Ice Singer beyond 22 m of the hole kept singing
    lamps out (12 songs): the driver now strikes down what stands within 16 m of her too; play5's seal driver likewise.
- The last queue (02:07-02:33) on the final code: holes, ending5, cameo, echo5, diff6, catch5 (14/14), hook5, coast,
  freeze, cast5, cp5, tower PASS; perf5 cut by the restart. Left: perf5, shallowtele, tide, ice, skotos again, r5 (the
  last balance measurement), the report's table, the final summary.
- 02:36-02:56 queue13 (int/sc): perf5 FAIL on one spot only (see below), shallowtele PASS (tele 44, pool 31, cradle 22,
  tones 44, halo 0.99), tide PASS (20 cycles, 16 wash-outs, 0 closed/stuck/snaps/offLane, max jump 1.56 m), ice PASS
  (coast 882 breaks, 13 plunges max 2.2 m, farlight 694 / 4, map.ver bumps max 4 a second), skotos FAIL (a real bug).
- perf5: coast at high water 1.067 of the Field (q1) and 1.098 (q0), mid Ice Road 0.845 / 0.83 (the design's two gate
  spots pass); coastLow (an extra spot the look round added: the same place at dead low water) 1.171 / 1.184 against the
  1.15 limit. The look fixer (round 1, its own server :5381 and browser, running now) owns sea.js/build5/gen5 dressing and
  runs perf5 last itself; its log shows coastLow 1.12-1.16 across its runs: left to it, written down as a request.
- skotos FAIL, a soft-lock: a death within 1.4 s of the fire being given (the scenario killed her the moment the third
  Remember was seen; the bot had just finished the stair's touch) left story.js's relight timer to emit 'farLightGiven'
  after ai.js had started the Night over: the Skotos took the beam in its Night (a.relit true, floor 0), and when it wrapped
  the Light again and the fire was given, skotosRelit returned early (already relit), so the wrap's floor (19.9%) never let
  go: 1400 s at 0.199 under 98 Sears. A second leftover: the floor's 40 s third-Remember fail-safe from the fight before
  fired into the retry (rem 3 at once: "name.arna", "d.selna.self", the Remembers not replayed). Fix: story.js fightOn(z),
  a token the death bumps; the fight's timers (the floor's Remember, the fire's climb and the Skotos's p3 line, the
  keepers' lines, walks and cairns, the cameo, Selna's return lines and toast) check it; ai.js skotosRelit only while it
  wraps the Light. Probe int/probe/race.mjs PASS: a death 5 s after the floor, 45 s on: rem 0; a death the frame the fire
  is given: floor 0.2, no beam, the Light dark; then the fight again, the fire, floor 0, struck down, skotosDown.
- 03:01 skotos again: the soft-lock gone (retry floor 0.2, the Remembers replayed, relit, struck down; clean 258.9 s),
  but no Breach Seared in the Night (two runs; 5-8 at 01:38). The game's rule holds (probe int/probe/night.mjs: 2 Seared
  of 3 Breaches); the scenario's bot only lit a cairn while no Hand was up and then chased Hands away from it. BOT5 now
  lights the nearest dark cairn when none burns and, while the Skotos is under, stands by the lit one (Alkyone's hint):
  3 of 4 Breaches Seared in the probe. Re-run queued, then r5.
- 03:05 skotos: 3 Breaches Seared in the Night, but no planned death: the bot gave the fire within one 1.5 s look of the
  third Remember (wrap, back and relit all at 145.1), so the death's condition was never seen. The scenario now deals the
  planned death in the page (a rAF watch: the frame Selna is back, before the fire). r5 (144 jobs) started 03:05; queued
  after it: skotos, ending5, cameo, echo5, catch5 (the story.js timers), play5 (the whole act again on the final tree).
- 03:34 r5 (final tree, n 6 a cell, 144 jobs, no deaths; int/bal/r5-sum.txt, r5-cmp.txt, r5-cmpref.txt). Act V over Act
  IV on the same tree and bot (whole act = 2 zones + 2 bosses): W Warden/Ranger/Mage x1.19/1.42/1.31 (bosses x1.32/1.47/
  1.15, zones x1.14/1.39/1.48); Wa x0.87/1.31/1.16 (bosses x1.13/1.06/0.61, zones x0.81/1.43/1.82). Biggest hit (W) 9.0/
  12.8/14.5% against Karthax's 6.7/9.1/12.8%. The louse fix took the Warden-on-Wanderer coast from 1.51 to 0.31 lives,
  which left her Wanderer act under Act IV's (whose Field of Ash costs her 0.72, n 3, mostly archer chases the README
  calls noise: 0.57 over its 10 runs). Act V's Wanderer bosses also stepped down for the Mage (x0.61).
- 03:40 HAZ5[0].dmg (Act V's creatures and bosses on Wanderer) 1.25 -> 1.5. r6 queued after queue16: Act V on Wanderer
  with r5's seeds (paired, 72 jobs) and Act IV's Field and Forge on Wanderer, 8 more runs each (a firmer reference).
- 03:36 skotos PASS: the planned death in the page at the third Remember (282.5 s; d.selna.p2 rightly unsaid: she died
  within its 1.4 s), her name hidden, the Night again at 65% with its 20% floor, the Remembers replayed, 5 Breaches Seared
  in the Night, the relight, Smother (its Coil cut), the roll, struck down; clean time 299.4 s (band 90-420), the bot
  never under 93%.
- 03:53 play5 PASS on the final tree (34 beats, 77 shots, 9.5 min at SIMK 4; the Tower 116.4 s, the Skotos 380.9 s, never
  under 94%). Contact sheets int/sc/play5-sheets/. Read: one thing read badly: the Skotos Exposed (a Breach not by a cairn,
  play5-61, skotos-1 of 02:53) drew as a flat pale-grey shape: combat.js addVuln sets the status rim at 1.1, and a pale
  blue-white rim at that strength washes the black robe out. Now look.vulnRim (data.js, the Skotos 0.5; others keep 1.1):
  probe int/probe/rim.mjs at 915x412 x1.5 (rim-sheet.jpg): plain violet edge, Exposed steel-blue, Seared copper, the hood
  dark in all three.
- 04:16 r6 (Wanderer, HAZ5[0].dmg 1.5; Act V with r5's seeds n 6, Act IV's Field and Forge 8 more runs): the same seeds
  did not pair (the sims diverge: Warden coast 0.31 -> 0.71). Act IV on Wanderer pooled (zones n 11, bosses n 6) against
  Act V r6: whole act x1.07 / 1.16 / 0.96. The cells are ~1 life over a whole act and swing 2x between batches: r7 (Act V
  on Wanderer n 6 more, Act IV's Wanderer bosses n 6 more) to firm them up before any further change.
- 04:45 r7 done; final pooled table int/bal/final-table.txt (cmpall.py): Act V over Act IV (same tree and bot), whole act:
  W x1.19 / 1.42 / 1.31, Wa x1.14 / 1.20 / 1.28 (Wanderer n 11-12 a cell); biggest hit W 9.0 / 12.8 / 14.5%. HAZ5[0].dmg
  1.5 kept. Against the README's Act IV: W x1.13 / 1.46 / 0.86 (the README's Mage Ivar 0.44 and Field 0.71 against this
  tree's 0.16 and 0.38), Wa x1.33 / 1.25 / 1.97.
- 04:50 re-runs on the final code: skotos PASS, diff6 PASS, tower FAIL (no Overturn), then a run where she died with no
  blow logged before the bot began: the scenario's setup leaves her idle by the Tower while its first look renders (seconds
  of play at load 8). tower: held up (__immortal) through the setup, a death now reported with its last blows and the run
  stopped (it used to stall 15 min on the panel). Of three more runs one failed with no Overturn and no light lit: a real
  bug: islandEnd's 12 s timer, landing in a rush, sets islandDue, which only towerDark consumed, so with its light never
  lit no Island (and no flask) ever came again; it died at the 60 s unlit fail-safe without Blinded. ai.js: an Island due
  and unlit starts at its first free moment. BOT5 keeps its thin-ice bait point 18 s (was 6), so the Shell Rushes come down
  one lane and web it (the bot's Overturns). Three tower runs queued.
- 05:40 tower 3 of 3 PASS after the Island fix and the bot's steadier bait (83-107 s; Beached, Overturned, Blinded each
  time; the bot never under 80%). echo5 PASS. cp5 FAIL once (382 s on a load of 8): its "Tower awake" wait (240 s) ran out
  silently before the waking scene ended, so the checkpoint was read before it was set; probe int/probe/rock.mjs: the
  waking sets the rock checkpoint on every seed tried (20-22). cp5 now waits 600 s and reports a wait that ran out
  (tw.timedOut) and, on a miss, when towerWake and cp5 were set (window.__cpLog); re-run PASS (124 s).
- Worst single blows over r5-r7: bosses 15-19% of her life in isolated runs (the Skotos on the Mage 18.6%, the Tower on
  the Ranger 16.9%; Karthax's worst after the fix 16.3%), 21% once on the coast; means 9-15%. No deaths in 360 runs.
- 05:50 done: the report written at the top of this file; private server :5401 stopped, no browser of mine left open.
