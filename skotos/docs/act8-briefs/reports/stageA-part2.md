# Act VIII, the first half playable (21 November, later the same day)

**On `claude/sleepy-tesla-4030vd`. Not merged into `main`, not published.** A hero at Act VII's end can now play the
act's first half end to end: the hook in Whitecliff (quest 48), the Old South Road, the Tindergrass, the three banked
fires (49), Aithon on the Threshing Floor (50), and quest 51, which says in words that more is coming.

- **The Burn** (`forge.js`, kind `'burn'`; `BURN`, `TALLY8`, `inLane8`, `onBlack`): 8-17 lanes of standing stubble inside
  the fields (`gen8.js`), each taken by a gust once a hero has stood in it 0.5 s, the shipped 2.8 s inhale, one front,
  then black for the visit. The hero: `HAZ.slide` % of her life, pure. A foe: `slideFoe` / `slideElite`. On black nothing
  is touched. `build8.js` draws the stubble and the black (`lvl.act8.lanes[k].setBurnt`).
- **Bank and Wake** (`world.js` `hearth8`): each of the three hearths is woken once by hand (flags `ember1..3`, the cover
  stone laid by, the flame), and makes the Call as a lit lookout does.
- **The Order's people** (`data.js`): `wakeful`, `wakefulBow`, `waker` (the Ashsmith's `forger`: it mends the fallen),
  `drover`; `PACKS.order`, `orderRoad`; the first row of fields keeps the plain's wolves. `READY.plain` loads the `ash`
  people set and the creature group `act8` (the elk).
- **Aithon** (`ai.js` `AITHON`): the hart's charge, wheel, stamp and gore, and the Furrow (he calls one of the Floor's six
  strips; it burns and stays black; the fire strikes him for `slideShare` 6% and dazes him 3 s). Held back until the
  three fires are awake; `spare`: at 0 life `aithonRest`, his body stays.
- **Quests 48-51** (`story.js`, the last block) and their lines (`text8.js`).

**Tests** (`BASE=http://localhost:5311/ node tools/act8.mjs <name>`): `burn`, `hearth`, `road`, `aithon`, `spine` all
pass; `node tools/check-act8.mjs 300` 0 faults. Act VII's `slide`, `fires7`, `kallisto` pass on this tree.
Do not run `day0` with an out-dir argument left empty: it writes its pictures into `docs/act7-briefs/reports/stageA/day`.

**Known, to fix (the look gate has not been held):**
- Aithon reads as a white hart with antlers, not a dark bull: the creature's tint does not take on the elk as written. He
  needs his own regrade, a yoke, and no antlers if a body allows it.
- The drover (the Hammerhorn's body) reads as a demon, not a man of a school. The archers read green.
- The road's exit in Whitecliff stands between two houses.
- No balance pass: every number is Act VII's (`HAZ_ACT[8] = HAZ7`, Aithon's 1700 is Kallisto's order of size).
- Co-op: the lanes' gusts are the host's; a guest's page gets no `burnSpent` yet, and `hearth8` is each page's own. Protocol 7 is not written.
- The Burn re-arms on every entry (the black does not last between visits).
- Music and ambient are the Meltwaters'; no ember memories, no scenes, no people but Halda.

**Next:** zone 2 `vigil` (the House without windows, opening to daylight hall by hall) and Ragna; then stage D (the
story's scenes and lines, audio), the look gate, co-op, balance, stage E.
