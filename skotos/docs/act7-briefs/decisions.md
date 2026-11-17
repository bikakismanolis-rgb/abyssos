# Act VII: the lead's decisions (17 November 2026)

The two judges disagree on the base (`judge-1.md`: the story proposal, 36.0 / 33.5 / 32.25; `judge-2.md`: the production
proposal, 38 / 34 / 32). The owner has said not to stop for questions today. These are the calls the design is written
to. Every one that is his to change is in `owner-questions-el.md` with its alternative.

## The base

**The production proposal, "The Seven Peaks" (the thaw), with the grafts below.** Why:
- It is the only spine whose three mechanics exist in the source today (judge 2's verification: 14 of 16 claims true).
- Nothing on its critical path is a download. Act VI's two gated downloads never arrived.
- **The story proposal's centre is a fire spreading in dry grass. In Greece that needs the owner's explicit yes
  (judge 1 §5.1), and he is not here to give it; its fire system is also 9-12 days of new module (judge 2).** So "The
  Unsleeping" is not cut and not halved: it is **kept whole as Act VIII's proposal**, with judge 1's seven changes and
  judge 2's "armed lanes on forge.js" as its starting notes.
- "The Twelve Nights" fails the brief's lesson 5 (a third night act) and is kept for a winter update or a later act.

## One choice per slot

| slot | decision | from |
|---|---|---|
| Title | «Πράξη VII: Οι Εφτά Κορυφές» / "Act VII: The Seven Peaks"; `game.sub7` «Ο Βορράς ξυπνά» / "The North wakes" | production; judge 2 |
| Spine | The thaw: the warmth of the First's relit fire rises through the mountain Gates and wakes a thousand winters of snow, a bear a month early, and the one the Stoneborn built their water-gates on. No villain. "You do not stop water, you show it a road." **Grafted inner line: the hero who cannot sleep**, told «Ξεκουράσου.» at last and keeping it | production; story (hook, home scene, the sleep) |
| The last line | The hero sleeps while someone else keeps the light; four seconds of black; then the game's first line again, «Ώστε ξύπνησες.» / "So you're awake." (`d.isarn.1`). «Ο Βορράς ξυπνά, και δεν φοβάται.» is the line before the sleep | story; judge 2 |
| Zone 1 | `thaw`, «Τα Λιόνερα» / "The Meltwaters", level 40, a spring morning, daylight | production |
| Zone 2 | `tarn`, «Η Κρεμαστή Λίμνη» / "The Hanging Lake", level 43, noon on a snowfield | production |
| Boss 1 | **Kallisto**, the Waking Bear, on `bear.glb` x2.1; not killed | production |
| Boss 2 | **Kelados**, the Sleeper under the Mountain, on `golem.glb` x2.3 with code ice, a snow cap and a pine; not killed; the block he throws stays as cover (Gremos's idea) | production; systems |
| Mechanic 1 | **The Race** (Το Ρέμα): `tide.js`'s own-level channel + the weirs | production |
| Mechanic 2 | **The Slide** (Η Κατολίσθηση): `forge.js` flues, armed (a cornice) and kicked by something loud; spent 45 s; foes take it in full, are carried to the lane's foot and Dazed | production; systems |
| Mechanic 3 | **Sun and Shade** (Ήλιος και Ίσκιος): `light.js` kind 'sun' | production |
| The cap | **The Names, seven**, three said at a time (slots free / 6 / 12 points; Kept and Deep), a free respec at q40; **the Call** (20 s, the same burst window for every class) made at a lookout hearth | systems, cut by both judges |
| Post-game | **The Seven Fires** ladder (six lookout holds and Arna's hill, ranked by difficulty), two echoes, **Rested** | production; story |
| Optional | The Seven Fires are the act's optional find (no separate collectible). The Seven Good Nights stay with Act VIII | judge 2 |
| Download | **None on the plan of record.** | both judges |

## Rules that go into the contract

1. **The boss law** (systems §2.4, §4; both judges): a heavy blow is a share of her life before armour, one row per
   difficulty in `HAZ7`, never multiplied by `DIFFS.dmg`; **no least-time lock of any kind**; every move in a range band
   with a count table; 4-10 blows landed a fight, each 12-18% on Warden difficulty, never over 20%; blows landed within
   +-30% across the three classes; bands 110-170 s (Kallisto) and 150-230 s (Kelados) on Warden difficulty; **run C**
   (the bot's damage doubled must bring the fight to 50-65% of its time) proves there is no hidden lock.
2. **Every regular enemy has one heavy telegraphed move** priced the same way. Zone danger is measured at G2, before a
   boss exists: 0.4-0.8 lives a run, lowest life 35-65%.
3. **Wanderer is pace, not telegraphs:** cooldowns x1.35, the heavy share halved, one move fewer a phase. Telegraphs
   never change with the difficulty (`data.js:32`).
4. **The damage anchor is Act V as measured** (about x1.45-2.1 of it for the act), with lowest life, deaths and seconds
   under 30% as the real gates. Act VI shipped at x1.9-5.8 of Act V; "x1.2-1.45 of the one before" read literally would
   repeat it.
5. **Tests that stay true:** the production proposal's four test rules (§7.3) word for word; `play7` from stage A; each
   soak run on a v22 hero at quest 39, never a fresh test hero.
6. **A fail-safe voice at both bosses** (story): Halda calls the phase's one thing from the rim, once a phase.
7. `SAVE_FMT` 2 in stage E's last commit; co-op `VER` 6, one bump.
8. **Water with care.** Greece has also buried people after floods. On screen: no house or village under water, nobody
   drowned, no one swept away; the water is in the mountains and the act is about letting it down safely. The stream
   under Whitecliff runs brown and loud in the hook and clear at the end; that is all the town sees.

## Canon to fix while writing (judge 1)

- The season: weeks pass after Act VI's midwinter (`d.hal.1`); say so in the hook's first line.
- The sky has been clear since quest 23 (`d.halda.stars`): no "first blue morning".
- Check who Halda is and where she stands in the shipped text before any line of hers is written (`d.halda6.v2`
  contradicts the production proposal's `d.halda7.4`).
- The Pass is «Ο παλιός δρόμος των Λιθογενών» (`zone.pass.s`): the Stoneborn built the Stair and the water-gates.
- Kelados and the Stoneborn water-gates are new lore: mark them as such, contradict no shipped line.

## The shipped-game traps found on the way (stage A, item 1)

`forge.js:63` (flues silent for every hero with `crownUnmade`); `forge.js:278` with `map.js:43` (a shard's cell closes
low: no cover); `coop.js:571`, `:650`, `:846-849` and `tide.js:51-60` (gated on `z.act6` / `HAZ6`); `world.js:1603`
and `coop.js:648` (the gust clock is the Farthest Light's); stale comments at `world.js:99` and `data.js:60-62`;
`PACK_ORDER` lists `silt` with no pack (`env.js:13`). Fixed already on 17 November: `ACT_FILES.act6` (v22.1).
