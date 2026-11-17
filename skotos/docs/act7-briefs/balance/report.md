# Act VII: the first, reduced balance pass (17 November 2026)

`tools/balance-act.mjs` now plays both Act VII zones and both bosses. Reduced pass: 2 runs a cell (contract: 6), Warden
for the three classes, Wanderer for the warden class at the zones only. No game code changed by this work. Files in
`docs/act7-briefs/balance/`: `mkplan.mjs`, `plan.json` (32 jobs), `runs.jsonl` (the 32 runs, on the fixed code),
`sum.mjs` (`node sum.mjs runs.jsonl` prints every table below), `probes.jsonl` (lesson probes and diagnosis runs),
`runs-A-first.jsonl` (run A before the two fixes, the evidence for them). (Written by the balance agent; saved by the
lead, who applied lever 1 and 2's life change afterwards: see "After the pass" at the end.)

## The answer
- **Both bosses fall 3-7 times too fast.** Kallisto rests in 20-31 s (median by class; band 110-170 s), Kelados in
  32-86 s (band 150-230 s). Every boss time band fails, and so do lowest life, seconds under 30% and heavy blows landed,
  because the fights are short. No run died, none went under 60% life.
- **The zones are light.** Lowest life 83-95% (band 35-65%); lives 0.22-0.63 (band 0.4-0.7, 2 of 6 cells in); 0 s under
  30%; no death; no blow over 14%.
- **Slides kill nothing by themselves**: 0 of 665 zone deaths (493 in run A's Warden cells, 172 in Wanderer's) were a
  slide's blow. Counting foes that died within 6 s of a slide: thaw 0-2%, tarn 0-20% (band 15-35%).

## How it was run
- Fixtures from `tools/fixtures7.mjs`, with `&nostory`: the thaw at `weir3` (three weirs open, Race at 0.3), the tarn at
  `tarnSeen`, Kallisto at `weir3`, Kelados at `keladosWake`.
- Profile: level 50 on Warden, 47 on Wanderer. Gear four levels behind (`gearK` 4). Six blessings (Act VI's `bearer`).
  Each beaten boss's own legendary, never before it is beaten (the Claw only in the tarn and at Kelados). Spare points in
  Might and Vigor; Mastery `mlvl` 4/6/8/10 (thaw, Kallisto, tarn, Kelados) on Warden, 0 on Wanderer. No Names, no lookout
  ranks, no Rested.
- Zones: the first eight packs by walking distance from `L.start`, as the contract says. She is put 9 cells back from
  each pack, fights whatever comes, waits 8 s, goes on; a pack is given up after 150 s. Bosses: placed by the world itself
  (`z.bossSpot`). The run is timed from the wake and ends at the rest flag or `'bossRest'`. Run C doubles what she deals
  (`job.dmgK` 2).
- The bot notices a telegraph with a 0.6 chance after 0.45 s (shipped defaults); a page is reloaded every 40 jobs.
  Every batch waited for no perf7/mem7/coop run.
- Before run B the scenarios `kallisto` and `kelados` (CLS=warden) both passed.

## The lessons and their checks
| lesson | check | result |
|---|---|---|
| a white or blue lane is harm; the flue's cover when the open ground is farther | probe `lane`: put 40-75% down 12 lanes, chute run, every telegraph noticed | 12/12 out, none struck, 1 by cover |
| kick an armed sunlit chute with 3+ foes (a boss counts 3) in its lane, she out of every lane it would bring down | probe `kick`: 3 Stunned goblins in a lane, she 4-8 m from the horn-stone | 22/22 kicked (all classes), all 3 struck every time, never on her |
| a camp in a lane (weir 2) is come at from beside its horn-stone | thaw runs | every thaw run |
| no loud skill from inside an armed lane unless a dodge is ready | zone runs | held back 0-4 times a run |
| bait Kallisto onto a stone (3.3 m behind her on the line, charge ≤ 2.5 s from ready or her wheel's end) | run B | 8 of 15 charges ended on stone (7 on open ground) |
| pull a lever when Kelados is in its channel (1 s at it, a blow breaks it) | run B | 10 levers in 6 fights, 9 kneels |
| walk to the arena hearth on `'boss7Window'`, make the Call | run B | made in every fight (does nothing with no Name said) |
| Tremor ring (no fx telegraph; read from `__act7.HEAVY7`): roll or blink through it | run B | 11 rings rolled through in 6 fights; 2 stopped by cover |
| Icebound left in its ice: 6 s for the sun, then the Cradle (`iceMelt7`) | probes | used once |

## Run A: zones, Warden (2 runs a cell)
| cell | lives (0.4-0.7) | lowest life (35-65%) | s under 30% (0-6) | pack time, median (8-14 s) / combat s a pack | owed to slides (15-35%) | biggest blow (≤20%) |
|---|---|---|---|---|---|---|
| thaw warden | 0.39 fail | 86% fail | 0 pass | 6.1 / 11.8 fail | 1% fail | 10% pass |
| thaw ranger | 0.35 fail | 95% fail | 0 pass | 1.4 / 6.6 fail | 0% fail | 6% pass |
| thaw mage | 0.22 fail | 95% fail | 0 pass | 1.3 / 1.9 fail | 0% fail | 4% pass |
| tarn warden | 0.63 pass | 86% fail | 0 pass | 22.8 / 11.3 fail | 16% pass | 11% pass |
| tarn ranger | 0.51 pass | 83% fail | 0 pass | 4.9 / 4.2 fail | 9% fail | 12% pass |
| tarn mage | 0.36 fail | 86% fail | 0 pass | 3.1 / 4.8 fail | 8% fail | 14% pass |

Across classes (lives within ±30% of the mean): thaw fails (mage −31%), tarn passes. Deaths 0 in 12. Heavy blows landed
0-5 a cell (two runs); chip is 71-87% of zone damage. Wanderer, warden L47: thaw 0.32 lives (×0.82 of Warden), tarn 0.43
(×0.69). Both fail "at most half". Lowest life 91-94% passes; no death.

## Run B: bosses, Warden (2 runs a cell)
| cell | time to rest, median (runs) | heavy blows landed | lowest life | s under 30% | worst 3 s (≤40%) |
|---|---|---|---|---|---|
| Kallisto warden | 30.5 s (17-44) | 1.5 | 85% | 0 | 15% |
| Kallisto ranger | 29.6 s (26-33) | 0 | 100% | 0 | 0% |
| Kallisto mage | 20.5 s (20-21) | 1 | 91% | 0 | 35% |
| Kelados warden | 86.2 s (76-97) | 6.5 | 71% | 0 | 25% |
| Kelados ranger | 40.0 s (39-41) | 1.5 | 93% | 0 | 30% |
| Kelados mage | 31.9 s (32-32) | 2.5 | 82% | 0 | 22% |

Bands: Kallisto 110-170 s, 4-6 blows, lowest 30-55%, 3-12 s; Kelados 150-230 s, 5-8 blows, lowest 25-45%, 5-18 s. Every
time band fails; only Kelados-warden's blow count is in band. Blows across classes fail ±30% at both. Each blow 13-18% and
none over 20% (some Kelados blows 3-4%: block plus War Cry's own damage cut). Boss life at level 51: Kallisto 836k,
Kelados 1.18M. The warden deals 0.73-0.94M/min to Kelados against the ranged classes' 1.75-2.25M/min.

**Run C** (warden, damage ×2): Kallisto 30.5 → 16 and 24 s (66%), Kelados 86.2 → 28 and 48 s (44%); band 50-65%, both
just outside. With n=2 and fights this short, the fixed costs (bait waits, entries, lever walks) move the ratio. Nothing
suggests a time lock; re-measure after the life change.

## Found on the way (game side; fixed in 263a2dc, measured before the fix)
1. **War Cry frightened both bosses.** skills.js put fear on every foe in 7 m; ai.js runs `flee()` in place of a
   frightened actor's AI. So a rooted Kelados left his seat (trace: 53.5 → 44.9 m in phase 1), and the Foot-race ran
   under him without a kneel. Combat's own rule (`o.fear && !target.boss`) already exempted bosses. Fixed: no boss is
   frightened.
2. **A Snow-worm under bare ground never surfaced.** Its burst needed her on snow; its spit at the edge needed it blocked
   leaving snow. Trace: 120 s at 0.1 m under her, both cells bare. The pack never ended, and the choughs pecked her
   through two 150 s timeouts (tarn seed 1000: up to 6.9 lives a run, `runs-A-first.jsonl`). Fixed in ai.js
   snowUnder/burrow. The bot's workaround was removed, and run A was rerun on the fixed code: no pack timed out.

## What the bot cannot do (blind spots)
- No **shade under choughs** and no **rock over a worm** (contract lessons). The Mob's and the burst's circles are escaped
  as red circles.
- **Notice model:** 40% of telegraphs (lanes and rings included) are never noticed; her own kicks always are.
- **Walk between packs is not played**, so brooks, trail chutes and clouds on the way are mostly not met. The thaw's first
  eight packs lie on the Meadow and the Race, with one chute lane among them.
- The **Tremor ring** is rolled through only if the dodge is ready; she does not seek a block on purpose.
- **Lever:** pulled only when Kelados is in the channel at that moment; she does not lure him into one. Halda's phase-3
  lever is story and is not modelled (`&nostory`).
- **byBand** counts where she stood when a blow landed. Charges land in reach, so it reads "reach" for nearly all; use
  `heavyBy` (by move) instead.
- Out of scope this pass: Names, the Call's effect, co-op, difficulties above Warden, Wanderer at the bosses.

## Levers (recommendations; n=2, re-measure with n=6)
1. **Kallisto life ×5.4 (hp 340 → about 1830).** This is the contract's own lever ("the bot sets it to the band's floor in
   run B"). It brings the fastest class (mage, 20.5 s) to 110 s; linearly the warden goes to ~164 s and the ranger to
   ~159 s, all inside 110-170. Entries and bait waits make linear scaling a slight overestimate.
2. **Kelados life ×3.75 (hp 480 → about 1800), plus a phase-rule look at the warden.** No single life multiplier fits: the
   class spread is 2.7× (warden 86 s, ranger 40, mage 32). ×3.75 gives ranger ~150, mage ~120, warden ~323 (over 270). The
   warden deals less than half of what the ranged do there and takes his 9 m Sweeps (6 of her 13 blows). By the contract
   this is a phase-rule matter (e.g. the Sweep's reach or cooldown against a melee hero), not a number.
3. **Heavy blows and lowest life at the bosses:** re-measure after 1-2 first. They scale with fight length. Only if the
   ranger still lands none, take the contract's named levers: Rockfall's solo rule, then Maul cooldown 6 → 8 s.
4. **Slides: `HAZ7.slideFoe` 35 → 50 (Warden).** At 35% of a foe's own life a slide never killed in 665 deaths. At 50, a
   pack the bot has opened is finished by it. And/or part 4's risk-7 placement: about a third of packs in a lane, the
   first trail chute pre-armed over a pack, so the thaw's first eight packs meet more than one lane.
5. **Pack time and zone danger: `HAZ7.hp` is the contract's lever** ("Life is × HAZ7.hp, so a pack lives 8-14 s"). The
   ranged classes clear a pack in 2-7 s of combat, the warden in 11-12. ×1.5 (1.8 → 2.7) brings the ranged toward 8 s and
   gives packs time to throw their heavy moves, which is what lowers lowest life. The class gap itself (thaw mage −31%) is
   the larger problem and HAZ7 cannot close it.
6. **Wanderer zones: `HAZ7[0].dmg` 1.5 → 0.9.** Chip is 71-87% of zone damage. Wanderer's chip is 1.5 × 0.55 = 0.83 of
   Warden's, hence ×0.69-0.82. At 0.9 it is 0.5, the band's "at most half".

## After the pass (the lead, 17 November)

Lever 1 and lever 2's life change were applied (the contract's own boss lever): **Kallisto hp 340 → 1830, Kelados hp 480
→ 1800** (`data.js`). Run B again on that code, 12 runs (`runs-B-life.jsonl`; `node sum.mjs runs-B-life.jsonl`):

| boss, class | time to rest, median (runs) | band | heavy blows | lowest life |
|---|---|---|---|---|
| Kallisto warden | 189.7 s (152-228) | 110-170: over | 6.5 | 87% |
| Kallisto ranger | 124.3 s (56-193) | in | 9.0 | 79% |
| Kallisto mage | 117.7 s (97-138) | in | 8.0 | 74% |
| Kelados warden | 269.6 s (261-278) | 150-230: over | 17.5 | 70% |
| Kelados ranger | 111.8 s (93-131) | under | 9.0 | 83% |
| Kelados mage | 85.8 s (79-92) | under | 8.0 | 65% |

The fights now last about two minutes (Kelados's three classes average 156 s, inside his band) and land 6-17 heavy
blows, every blow under 20%. Still open, for the full campaign (6 runs a cell): **Kelados's class spread** (the warden
3× slower than the mage: she deals under half of the ranged damage there and takes his 9 m Sweeps; a phase-rule matter,
not a number) and **lowest life** (65-88% against 25-55%: no boss brings her low; the owner asked for gentler boss blows
in Act VI, so their share was not raised here). The zone levers (4-6) are left for the full campaign: the bot does not
walk between packs, which is where most of the act's lanes, brooks and clouds are met.

**Kelados's warden, one phase rule.** His Sweep's push of 12 threw a melee hero out of reach on every Sweep, and she walked
back through the Tremor's ring. With a push of 6 (`ai.js`, the contract's Sweep row updated), four warden runs on the same
seeds: 191, 236, 138, 338 s (median about 213) against 378, 446, 265, 222 s with 12 (`runs-kw-push6.jsonl`,
`runs-kw-push12.jsonl`; run alone, so with less noise than the batch). The ranged classes, who are rarely swept, are not
slowed by it. His class spread is now about 2.5× (mage 86 s, ranger 112 s, warden about 213 s): still for the full
campaign.

**Six runs a cell on the final code of the day** (Kallisto 1830, Kelados 1800, the Sweep's push 6; `mkplan6.mjs`,
`runs-B6.jsonl`, `runs-A6.jsonl`; `node sum.mjs runs-B6.jsonl`). The bot still does not walk between packs.

| boss, class | time to rest, median (range) | band | heavy blows | lowest life |
|---|---|---|---|---|
| Kallisto warden | 263 s (214-417) | 110-170: over | 23.5 | 78% |
| Kallisto ranger | 121 s (51-161) | in | 10 | 80% |
| Kallisto mage | 95 s (75-187) | under | 9.5 | 84% |
| Kelados warden | 266 s (191-455) | 150-230: over | 31 | 66% |
| Kelados ranger | 135 s (108-147) | under | 12 | 84% |
| Kelados mage | 130 s (77-171) | under | 11.5 | 74% |

| zone, class | lives (0.4-0.7) | lowest life (35-65%) | pack time (8-14 s) |
|---|---|---|---|
| thaw warden / ranger / mage | 0.51 / 0.24 / 0.43 | 90 / 95 / 90% | 8.6 / 2.1 / 1.3 s |
| tarn warden / ranger / mage | 0.98 / 0.53 / 0.46 | 86 / 87 / 87% | 18.3 / 4.0 / 3.4 s |

Wanderer (warden, L47): thaw ×0.57 of Warden's lives, tarn ×0.45 (band: at most half); lowest life 93-94%; no death in
any of the 84 runs. **What the numbers now say:** the life is about right on average (the ranged classes sit in or near
the bands), and the open matter is the **warden at the bosses**, 2-2.8 times slower than the ranged (Kallisto wheels
away whenever a hero is within 5 m and charges from 9 m; at Kelados she meets the Tremor's ring and the Sweep), and
**danger**: no fight brings a hero below about 65% (the owner is asked whether he wants the bosses harder; in Act VI he
asked for gentler blows). The zones' danger and pack time wait for the walk between packs in the bot.
