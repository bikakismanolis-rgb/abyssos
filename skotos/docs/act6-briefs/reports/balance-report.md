# Act VI: the balance-act campaign (report, 14 November 2026)

Branch `claude/sleepy-tesla-4030vd`. The step left after stages C and D (`stageC-report.md`, `stageD-report.md`, Left):
`tools/balance-act.mjs` extended to Act VI and run on Act V and Act VI with the same tree and bot. **No game code was
changed**: the tool, the plan, the runs and this report only. The owner decides what, if anything, is tuned.

Everything is in `docs/act6-briefs/balance/`: `mkplan.mjs` (the plan), `plan.json`, `runs.jsonl` (666 runs, no error, every
boss killed), `sum.mjs` (`node sum.mjs runs.jsonl`), `summary.md` (its tables in full).

## The answer

**Act VI costs the hero 3 to 7 times the damage Act V does on Warden difficulty, and 3 to 14 times on Wanderer. The
design's band is x1.2-1.45.** All of it is the two bosses, the Shade above all. The two zones cost less than Act V's.
**No hero died in any Act VI run** (378 runs), and her life never fell under 30%.

| class, difficulty | Act V zones / bosses / act | Act VI zones / bosses / act | VI over V: zones / bosses / **act** | deaths V / VI |
|---|---|---|---|---|
| warden, Warden | 0.79 / 0.17 / 1.13 | 0.26 / 1.63 / 3.52 | x0.33 / x9.71 / **x3.12** | 0 / 0 |
| ranger, Warden | 0.65 / 0.26 / 1.17 | 0.40 / 2.88 / 6.17 | x0.62 / x11.02 / **x5.27** | 0 / 0 |
| mage, Warden | 0.49 / 0.37 / 1.23 | 0.31 / 4.45 / 9.21 | x0.62 / x12.06 / **x7.48** | 0 / 0 |
| warden, Wanderer | 0.56 / 0.11 / 0.79 | 0.19 / 1.13 / 2.46 | x0.34 / x9.87 / **x3.11** | 0 / 0 |
| ranger, Wanderer | 0.45 / 0.13 / 0.71 | 0.34 / 2.53 / 5.39 | x0.76 / x19.07 / **x7.55** | 0 / 0 |
| mage, Wanderer | 0.27 / 0.15 / 0.57 | 0.20 / 3.92 / 8.04 | x0.73 / x26.00 / **x14.07** | 0 / 0 |

(Lives of damage a run, integrate.md's measure: a blow counts whether or not she heals it back. Zones: the two zones'
means summed; bosses: the mean of the two; the act: the four.)

## Why

| boss | kill s (Warden difficulty: warden / ranger / mage) | blows that land a fight | lives a fight | lowest life seen |
|---|---|---|---|---|
| the Tower (V) | 51-106 / 40-50 / 35-48 | 3 | 0.14 / 0.23 / 0.29 | 83-92% |
| the Skotos (V) | 91-172 / 59-91 / 74-84 | 4 | 0.20 / 0.29 / 0.45 | 80-91% |
| the Ketos (VI) | 140-149 / 132-163 / 145-217 | 15 | 0.42 / 1.15 / 1.56 | 68-92% |
| the Shade (VI) | 379-435 / 285-318 / 312-361 | 81-146 | 2.83 / 4.62 / 7.34 | 30-63% |

- **The fights are long whatever the hero's power.** Stage C's least time for each form and phase (`SHADE_MIN` 70 / 45 /
  70 / 75 s, `KETOS_MIN` 45 / 45 / 35 s) holds the Shade to about five minutes and the Ketos to about two and a half. At
  the profile level Act V's bosses fall in one to two minutes.
- **The Shade strikes far more often.** 81-146 blows land in a fight (the Barrow Lord's combo, the Weaver's bolts and web
  ground, the troll's smash and its thunder, the shadow's answers) against 3-4 in the Skotos's. Each is small: 2-6% of her
  life on average, none over the 11% cap but a few status ticks (13-14% on the Mage).
- **She heals most of it back** (life on hit, regeneration; a potion in one fight of three for the Mage, none for the
  others), which is why 3-7 lives of damage a fight ends with no death.
- **Wanderer is hardly gentler at the Shade:** 1.90 / 4.05 / 6.58 lives against Warden's 2.83 / 4.62 / 7.34, and the
  same number of blows. The time floors and the blows' rate do not change with the difficulty.
- **The zones are light:** the Drained Sea 0.05-0.12 lives a run, the Bottom 0.18-0.33 (its three black lamps and the
  Stair's crew included), against the coast's 0.06-0.42 and the Farthest Light's 0.37-0.43.

## Against G3's other lines

| line | result |
|---|---|
| The bot's reference build: the Ketos not under 50 s, the Shade not under 100 s | 130-217 s, 285-454 s: holds |
| Wanderer at 60% or more of the Warden time | holds (the times are the same) |
| No boss blow over 12% of her life | holds for blows (11% cap); status ticks reach 13-14% on the Mage at the Shade; in the zones single ticks reach 18% on the Mage |
| Acts IV and V with the Lamplight track at rank 40 | no cell moved out of its runs' spread; kill times the same (Act IV 60 / 23 / 27 s at rank 0, 52 / 23 / 23 s at 40; Act V 101 / 59 / 59 s, 103 / 61 / 59 s); no death. Whole act at rank 40 over rank 0: Act IV x1.09 / x0.86 / x1.06, Act V x1.42 / x0.89 / x0.72, on six runs a cell whose spread is as large as their mean: neither a rise nor a fall is shown |
| The Lost's seven lamps shorten the Shade by 10-15% | the Warden 400 -> 369 s (8%); the Ranger and the Mage not at all (301 -> 317 s, 342 -> 346 s): they are already at the forms' least time |

## How it was run

- **The hero** (integrate.md's normal-casual profile, as `docs/progression/balance5` ran it): gear four levels behind, one
  blessing an act, every point the four skills cannot take in Might and Vigor, the first-kill legendary of every boss
  beaten. Act V at the coast L42, the Tower L43, the Farthest Light L45, the Skotos L46; Act VI at the Drained Sea L47,
  the Ketos L48, the Bottom L49, the Shade L50; three levels lower on Wanderer. Warden difficulty six runs a cell,
  Wanderer twelve, seeds 1000 + r x 7919, eight packs a zone.
- **Act VI in the tool:** both zones past their arrivals under the Carried Fire's rules (a foe out of light Shrouded, a
  Lampbearer first, out of a Falselight's tell, the coal lit again at a true lamp when Out); the Bottom's three black
  lamps put out after its packs, then the Stair's crew; the Ketos and the Shade by the scenarios' bot's rules, the three
  wreck lanterns and the four hearthstones lit at the start as the scenarios set them.
- **Two faults of the tool found and fixed on the way** (both acts were run with the fixes):
  - a boss's own legendary (`LEG_FROM`) could be worn before its boss was beaten (the Shade's Ring at the Ketos);
  - the bot stood idle for the 8 s between packs while a foe woken beside her struck her. In the Bottom that was most of
    the zone's damage (a Gate-Fallen risen from its bones: the Warden 1.24 lives a run with the fault, 0.21 without; the
    Mage 2.56 and three deaths, then 0.18 and none). She now fights what comes at her before she walks on. The first
    pass's zone runs were thrown away and every zone run made again (324 runs).
- **Not in the fix's reach:** the Farthest Light's old pack time-outs (39 in its runs: a pack the bot cannot reach is given
  up after 150 s); they are Act V's and make its zones dearer, not cheaper.

## After it: the owner's three changes (16 November 2026)

The owner asked for three things: the bosses a little softer, the Shade gentler on the easy difficulty, and the Lost's
seven lamps to shorten the Shade for every class. Changed (`src/game/data.js` HAZ6, `actors.js` spawnMonster, `ai.js`):

- **`HAZ6.bossDmg`**, the two bosses' own blows (every form, every echo): x0.85 on every difficulty, x0.6 on Wanderer
  (a Wanderer blow was 0.83 of Warden's; it is 0.58 of it).
- **`SHADE_MIN`** 70 / 45 / 70 / 75 s -> 58 / 38 / 58 / 62 s. `KETOS_MIN` as it was (its fight is already at the foot of
  its 120-200 s band).
- **`HAZ6.bossMin`**, the least times by difficulty: x0.85 on Wanderer. **Wanderer's `bossCd`** 1 -> 1.25.
- **Each named lamp of the Lost that burns takes 2% off every form's least time** (all seven: 14%).

Measured again, the same plan's 126 boss runs (`balance/runs-after.jsonl`; lives of damage a fight, before -> after):

| boss, difficulty | warden | ranger | mage | kill s after (warden / ranger / mage) |
|---|---|---|---|---|
| the Ketos, Warden | 0.42 -> 0.42 | 1.15 -> 1.19 | 1.56 -> 1.15 | 141-165 / 132-144 / 140-168 |
| the Ketos, Wanderer | 0.37 -> 0.10 | 1.00 -> 0.47 | 1.27 -> 0.56 | 123-147 / 117-143 / 124-156 |
| the Shade, Warden | 2.83 -> 1.43 | 4.62 -> 3.39 | 7.34 -> 5.66 | 281-393 / 242-334 / 273-431 |
| the Shade, Wanderer | 1.90 -> 0.90 | 4.05 -> 1.73 | 6.58 -> 2.99 | 243-340 / 186-321 / 203-273 |

- The Shade on Wanderer now costs 63% / 51% / 53% of what it does on Warden (it was 67% / 88% / 90%), and falls in
  about 0.8 of the Warden time (the contract's 60% or more holds).
- The Ketos on Warden difficulty is hardly changed for the Warden and the Ranger: its blows on them are few and the
  bow's sit at the 11% cap, which the factor does not move.
- **The Lost's seven lamps** (Warden difficulty, six runs a cell, the median): the Warden 344 -> 296 s (14%), the Ranger
  272 -> 238 s (13%), the Mage 288 -> 249 s (14%). (By the mean the Mage shows 20%: one 431 s run without the lamps.)
- One death in the 126 runs: a Mage with the seven lamps, in the Shade's last form on Warden difficulty. The Mage
  against the Shade is still the hardest cell (5.66 lives a fight, her life as low as 35% without dying in the others).
- The act against Act V after the change, Warden difficulty: x1.9 / x4.3 / x5.8 (from x3.1 / x5.3 / x7.5); Wanderer:
  x1.5 / x3.6 / x6.6 (from x3.1 / x7.6 / x14.1). Still over the design's x1.2-1.45: the owner asked for a little.

## Not done

- **The echoes** (the Ketos at the neck arch, the Shade at the warm Gate ring): the tool does not call an echo. Their
  fights are the same bodies and rules as the ones measured.
- **No tuning.** Reaching x1.2-1.45 by the blows' size alone is not possible (it would need them about a tenth of what
  they are): the gap is the fights' length and the number of blows. The choices for the owner are in the hand-off.
- The proofreading pass, the owner's reading of the key lines, the owner's phone test of the Frozen Coast: as before.
