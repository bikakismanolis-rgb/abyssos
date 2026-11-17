# Act VII — «Οι Εφτά Κορφές» / "The Seven Peaks": the design

17 November 2026. This file is the head of the design. The body is four parts, each written against
`docs/act7-briefs/decisions.md` and checked in the source:

| part | file | holds |
|---|---|---|
| 1 | `docs/act7-design/10-story.md` | premise, hook, quests 40-46 and end state 47, memories, ending, after-act lines, every story text key |
| 2 | `docs/act7-design/20-zones-enemies-bosses.md` | `thaw` and `tarn` in full, six lookouts, seven enemies, Kallisto, Kelados, `HAZ7` boss rows |
| 3 | `docs/act7-design/30-mechanics-progression.md` | the Race, the Slide, Sun and Shade, the Names, the Call, the Seven Fires, Rested, echoes, co-op, saves, music |
| 4 | `docs/act7-design/40-production.md` | daylight look, engine items, assets, memory, perf, stages and gates, release list, risks, cut order |

Where two parts disagree, **the rulings below decide**. Where a part disagrees with `decisions.md`, the ruling below
replaces that line of `decisions.md`. The contract (`docs/act7-contract.md`) is written from this file.

## The act in ten lines

1. Spring, weeks after Act VI. The warm Gates under the mountains melt the peaks' old snow too fast. No villain.
2. Two zones in daylight, the first in the game: `thaw` «Τα Λιόνερα» (level 40) and `tarn` «Η Κρεμαστή Λίμνη» (43).
3. The hero lowers the river by opening three weirs, then lets a hanging lake down by three winches.
4. Two bosses, neither killed: Kallisto, a bear woken a month early, and Kelados, the sleeper who is the dam.
5. Three mechanics on shipped systems: the Race (water level), the Slide (kicked snow chutes), Sun and Shade (clouds).
6. At the level cap the hero gains the Names: seven, three said at a time, and the Call at a lookout hearth.
7. After the act: the Seven Fires ladder at the lookouts, two echoes, Rested.
8. The hero, who has not slept for three nights, sleeps. The last line is «Ώστε ξύπνησες.»
9. No download. No new rendering system. About 65-75 focused days; the cut order brings it to about 56-66.
10. Water is handled with care: no house under water, nobody drowned, nobody swept away, on screen or in text.

## Rulings of the lead

### Names and words

| thing | ruling |
|---|---|
| mechanic 2, Greek | **«Η Χιονοστιβάδα»** (snow), not «Η Κατολίσθηση» (earth). English stays "the Slide". On the owner's list |
| the Call, Greek | **«Το Φώναγμα»** («Κάλεσμα» is shipped twice). On the owner's list |
| the exit and camp "the Stair" | **«Η Νεροσκάλα» / "the Water-stair"**; exit key `exit.tarn`; shut line `d.waterStairShut`. The Pass keeps «Η Σκάλα των Γιγάντων» |
| "The Drowned Meadow" | **«Το Νερολίβαδο» / "The Water-meadow"**. No hut or fold stands in water anywhere |
| Kallisto | **«Καλλιστώ, η Αρκούδα που Ξύπνησε»** / "Kallisto, the Waking Bear" (part 1's Greek; part 2's is replaced) |
| Kelados | «Κέλαδος, ο Κοιμισμένος του Βουνού» / "Kelados, the Sleeper under the Mountain". "Kelados" is the shepherds' word; the Stoneborn say "the Sleeper" |
| player-facing water wording | water "drives out" foes. Never "drowned", "swept away", «πνίγηκε», «παρασύρθηκε» |
| act panel keys | `act7.*` (the shipped convention) |
| the last line and Rested's greeting | one key, `d.child7.wake` = «Ώστε ξύπνησες.» |
| FX ambient key for `thaw` | `'melt'` (`'thaw'` is Act VI's lit Bottom) |
| the Names' module | `src/game/names7.js`, exports prefixed `N7` (`NAMES` is taken in `light.js:244`) |
| echo prompts | "Remember Kallisto" / "Hear what the mountain dreams" (part 1); their rules are part 2's (each removes what the first fight taught) |

### Numbers

| question | ruling |
|---|---|
| the damage anchor against the bands | The bands are narrowed so both hold: zones 0.4-0.7 lives each; **Kallisto 4-6 blows landed, Kelados 5-8**. The ratio to Act V is **reported at G3, never gated**. G2 and G3 gate on lowest life, deaths and seconds under 30% |
| a heavy blow | **22% of life before armour** for a boss, **18%** for a regular creature, and a hard cap: no single blow lands over **20%** (part 2). The systems proposal's 26-30% is dropped |
| a slide on the hero | a pure share, **14%**, not reduced by armour (the wash-out's shape). On foes: **35% of their own life** (20% for champions, rares and big kinds), carried to the lane's foot, Dazed 1.5 s. The shipped flue's monster rule is not reused |
| boss life | × 340 (Kallisto) and × 480 (Kelados) as starting values; the bot sets them to the band's floor in run B |
| run C's knob | a new `job.dmgK` in `balance-act.mjs` (`gearK` is not a damage factor) |
| Wanderer profile hero | level 47 (Act VI's rule) |
| text budget | about 270 bilingual lines (part 1 has 192 keys, part 3 has 83), two readers on each |
| total cost | **65-75 focused days** (part 4's 61-71 plus the four days parts 2 and 3 found: the `share`/`cap` hurt path, cover blocks, the `spare` ending, seven bot play styles). Part 4's cut order stands and takes 9 |

### Design

| question | ruling |
|---|---|
| Kallisto's rising stream | **Cut** (part 2). A forced tide moves the Race's own cells too. Her stream only wades; phase 2 is «Στριμωγμένη» / "Cornered". Part 3's "pocket 1 under `T.force`" is struck. `perf7` spot 3 is "the Den with two slides and rocks" |
| the weirs' layout | Part 2's: weir 1 on the south bank, three in sequence, the Narrows gating the Den at level 0.3 |
| a hearth in each boss arena | **Yes**, one each, flaring once on the fight's beat. Neither fight needs it |
| Halda's fail-safe | She pulls one lever herself 25 s into Kelados's third phase if none was pulled; one call a phase, each fired once |
| Brokka | Stays in the Halls; her word comes through Halda. No `folk` set loads in town |
| the stream at Whitecliff | A water sound below the south wall and a strip of the melt shader outside the walkable cells: brown in the hook, clear at home. Checked at stage D; if it cannot be shown the lines stand as narration |
| the mason's marks | Six memories on the critical path (part 1), not optional finds |
| the Icebound | Do not wake at 4 m as the shipped statue does (`ai.js:957`): only sun wakes them |
| `play7` | A skeleton from stage A with named `todo` rows that fail G5 |
| `thaw`'s ground and trees | See the stage-0 finding below |

### Stage 0, first finding (already run)

`docs/act7-briefs/reports/stage0-look.md`: daylight reads well on open, light ground at quality 0 and 1, and does
**not** read under dense trees or on dark ground. So:

- `thaw` is open meadow and scree. No closed canopy over walkable ground; tree groups stand off the trail.
- `thaw`'s slot A must be a light ground. If tinted `leaves` stays dark under the sun, `thaw` loads `rime` for its
  snow (58 MB cold, under the 75 MB gate) and the optional `melt` meadow layer is built. Decided at G0 by `day0`.
- The fading-prop dither shows in daylight: softened for `'sun'` zones in the daylight item.
- Part 4's formal `day0` gate (five numbers, sixteen phone-emulated shots) still runs; this finding is its first input,
  and its `forest`-under-`thaw` shot is expected to fail as a zone picture and is kept only as the tree-shadow test.

### Trap fixes already made (17 November)

- `forge.js:63`: the flues stop for `crownUnmade` only in the Forge.
- Stale comments at `world.js:99` and `data.js:60-62` rewritten.

The rest of the list (part 4, item 1, both tables; part 3, E1) is stage A's first work.

## For the owner

`docs/act7-briefs/owner-questions-el.md`: eight short questions in Greek, each with the lead's recommendation.
Nothing in stages 0 and A waits for the answers.
