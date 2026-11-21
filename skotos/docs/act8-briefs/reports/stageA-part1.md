# Act VIII, stage A, part 1 (21 November)

**Built and passing on `claude/sleepy-tesla-4030vd`. Not merged into `main`, not published.**

- The plan `docs/act8-design.md` and the owner's five questions `docs/act8-briefs/owner-questions-el.md` (each default is what is built).
- Zone `tinder` («Ο Ξερόκαμπος», level 46, daylight): `src/world/gen8.js` `genTinder` on gen7's frame (`daylight7`, `finish7`,
  `settle7`, exported from gen7.js). The North Camp (Halda, the waypoint), the South Road, ten stubble fields between dry-stone
  walls (one gate on the road, one pass to the next field, the far side the hill's rock), three banked hearths, sheaves as
  cover, three chests, the Threshing Floor (S.arena, L.boss), 17 packs.
- Props `src/world/build8.js` `act8Level` (walls and sheaves one mesh each, the hearths build7's lookout hearth under a cover stone), kept as `lvl.act8`.
- Ground `ground8` and `ACT8` in build.js (the code-made meadow read as stubble), sky `ATMOS.tinder`, `ZONES.tinder`,
  `act8Zone` / `act8Enter`, the waypoint and wake lists, `text8.js`.
- The way in: `southRoad(z)` puts «Ο Παλιός Νότιος Δρόμος» in Whitecliff once Act VII is done (`hero.act7 >= 0`).

**Checks:** `node tools/check-act8.mjs 300`: 0 hard faults (every spot reached; every field closed with its gates shut).
In the browser: `?auto=tinder&lvl=46&flags=act7&q=1` loads with no error, the title card, Halda, the packs fight; town →
South Road → Tindergrass → town. Older: `check-act7` passes, scenarios `title` and `day0` run.

**Stand-ins to replace:** the packs are Act VII's hill wolves (`PACKS.plainWolves`); the music and ambient are the
Meltwaters' after-act ones; `HAZ_ACT[8]` is `HAZ7`; the hearths and chests have no interact yet; the road's exit in
Whitecliff stands between two houses by the east wall and needs a proper gap and a signpost; the arena is bare.

**Next:** (1) the Burn on `forge.js`'s lanes inside the fields, with the black it leaves (stage 0's spike and stage B's
mechanic in one); (2) Bank and Wake at the three hearths; (3) zone 2 `vigil`; then the foes, Aithon, Ragna, the story.
