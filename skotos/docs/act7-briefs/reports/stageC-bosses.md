# Stage C: Kallisto and Kelados (report)

Files: `src/game/ai.js` (`KALLISTO`, `KELADOS` and their helpers in the Act VII section; `AI.kallisto`, `AI.kelados`;
the `spare` rest), `src/game/data.js` (the two rows, as the contract gives them, plus `slideShare` / `slideDaze` that
`forge.js bury` reads), `src/gfx/creatures.js` (`CAST.kallisto = ['bear', 1]`, `CAST.kelados = ['golem', 1]`),
`src/game/actors.js` (`STAND_IN.kallisto = ['amberBear', 'troll']`, `STAND_IN.kelados = ['stonewarden', 'troll']`),
`tools/scenario7.mjs` (`setupBoss7`, `kallisto`, `kelados`). `LEG_FROM.kallisto` / `.kelados` were already in data.js.

## The boss law, as built

- Both run on the shipped `boss()` with tables shaped like the shipped ones (`phases: [0.66, 0.33]`, `wake`, `intro`,
  `onPhase`, `tick`, `moves`). No `hpFloor`, `lockPhase`, `*_MIN`, invulnerability or hold: the phase is life alone.
- **Entries are queued** (`onPhase` pushes one entry per threshold crossed, in order, onto `a.queue`); `boss()` plays a
  queued move before any other, while every blow still lands.
- **Every damaging move is one heavy blow**: `heavy7` with `share: HAZ7.bossHeavy, cap: HAZ7.cap, move: id`. The Charge's
  trample passes the same options through `startDash`'s `hitO`.
- **Pace**: `bcd7(s) = s x HAZ7.bossCd`; `cd7` applies it to every cooldown (and x1.4 for Kelados under a cloud).
- **Telegraphs**: each move's own wind-up as the table gives it; blows that land later than the move (a Rockfall, an Ice
  Block) are timed on the AI's own clock (`after7`), so no telegraph is a frame short.
- **At most two big telegraphs**: `bigs` / `bigTele` (the shipped Act V helpers); a chute or a sluice lane counts as one.
  The boss's own lingering telegraphs (a rock's circle, a block's, a Tremor's ring) hold back its next big move (`free7`)
  unless `HAZ7.overlap` allows it for that phase (Nightmare: last phase; Ash, Skotos: from phase 2).
- **By difficulty** (Wanderer through `HAZ7.less`): Kallisto has no Maul in phase 1, no Rockfall in phase 2, no second
  charge; Kelados's phase-1 Tremors shake no chute, the X is one lane, no Boulder roll. Ash: a Rockfall may be thrown in a
  Charge's wind-up in Kallisto's phase 3. Nightmare and up: an Ice Block may be thrown during the X. Skotos: every Tremor
  in Kelados's phase 3 shakes the X; Kallisto's rocks last 10 s. Chutes per call: the `HAZ7.bossChutes` row (+1 with three
  or four heroes, three at most).

## Kallisto (`KALLISTO`)

| move | function | as built |
|---|---|---|
| Maul | table `maul` | 0.9 s, cone 4.6 m / 110 degrees, within 6 m, 6 s |
| Charge | `kCharge`, `kWheel`, `kChargeEnd` | 1.0 s rear behind a `min(22, d + 4)` x 5 m line, 20 m/s, heavy + push 20; nearer than 5 m she wheels away first (the Hart's way, `KALLISTO.tick`); a boulder, pine, rock or the cliff: Dazed 3.5 s and loud (`LOUD.bearWall`); slush or a slide's tongue: Dazed 2 s; open ground: nothing; 9 / 8 / 7 s |
| Second charge | `kCharge(.., true)` as the first's `chain` | phase 3, 1.0 s more from where the first ended; not after a Daze |
| Roar | `kRoar` | 1.2 s `howl`, no blow; `fireFlue` on the `HAZ7.bossChutes` nearest armed Den chutes (their own 2.8 s lane); bus `'loud'` for the dens; 16 / 14 / 12 s |
| Rear-and-slam | table `slam` | phases 2-3, 1.1 s, r 5.5, within 7 m, 10 s |
| Rockfall | `rockfall7`, `throwAim` | phases 2-3, 1.2 s white-edged red circle r 2.2 on the farthest hero beyond 8 m (alone: every third one on her wherever she is); the rock stays 20 s as cover (`rock7`, 2 x 2, `low = false`); 9 s |
| entry, phase 2 | `kRocks` | she rears; two rocks into the bowl's middle, 6 m or more from every hero, no blow |
| entry, phase 3 | `kRoar(.., 'roar3')` | the Roar, with the phase-3 chute count |

A slide on her: `forge.js bury` reads `slideShare: 5`, `slideDaze: 3` (Buried 3 s, x1.5).

## Kelados (`KELADOS`, `keladosPre`)

| move | as built |
|---|---|
| Sweep | 1.0 s, cone 9 m / 100 degrees, heavy + push 12, 8 s |
| Tremor | 1.2 s `slam`, then a ring (`ring7`, ticked in `act7Tick`) from r 4 to r 14 at 9 m/s, 1.2 m thick; whoever it crosses with nothing solid between (`map.los`) takes the heavy blow; 11 s |
| Ice Block | 1.3 s circle (0.5 s tear + 0.8 s lob) r 2.2 on the farthest hero beyond 8 m (alone: every third on her); the block stays `HAZ7.blockT` as cover, three standing at most (five with three or four heroes; the oldest breaks); 10 s |
| Chute / the X | every second Tremor is loud (bus) and runs one Dam chute in phase 1, both after (one quadrant clear is the layout's); never under a cloud (`a.cloud7`) or on a shaded cornice |
| Boulder roll | phases 2-3, 1.0 s behind a 20 x 3 m line; the boulder stays `HAZ7.blockT`; 12 s |
| entries | `kEntry`: 1.5 s `warcry`, no blow; bus `'keladosPlates'` (2, then 6 fallen), the lake to 0.9 then 0.6 (`mereTo`), the next lever's ice falls (`bareLever`, bus `'lever7Bare'`), and he stands up (`a.rooted` off) |

- **Held** by `a.holdWake` until `keladosWake` (`keladosPre`, every frame); **rooted** at his seat in phase 1 (`a.rooted`).
- **Under a cloud** (`shade7` at his seat): cooldowns x1.4, walk x0.7, his Tremor shakes no chute.
- **The sluices**: bus `'lever7'` (it, z) runs the lever's channel (`L.spots.levers[k].channel`, an index into `L.flues`)
  with `fireFlue`; each lever once a fight; lever 2 only from phase 2, lever 3 from phase 3. The water never takes his life
  (he is put in the lane's `hit` set before it runs); in the channel when the front reaches him he kneels 5 s, Stunned
  (`kneel7`: `status.stun` 5, vulnerability `stunned`). The first kneel emits `'boss7Window'`.
- A slide on him: `slideShare: 4`, `slideDaze: 2`.

## `spare`

At 0 life the shipped `kill()` runs (the quest's hearing, the loot, the first-kill legendary through `LEG_FROM`). ai.js's
`'kill'` listener then saves `kallistoRest` / `keladosRest` (`writeSave`), clears the life bar, emits `'bossDown'` and
`'bossRest'` (kind, actor); for Kelados also `'keladosPlates'` 8. The body plays its `dieClip` (`daze` / `die`) and stays:
`dying()` hands a `spare` def to `restBody`, which never dissolves or removes it; being dead, nothing can strike or target it.
Story and Names: bus `'boss7Phase'` (kind, phase 1-3) on the intro and each entry; `'boss7Window'` (kind) at Kallisto's last
phase and Kelados's first kneel. Nothing more.

## Scenarios (stage C, `&nopacks&nostory`, spawned at `L.spots.arena` / `L.spots.seat`)

- `kallisto` (`fx7('weir3', 'thaw')`): **pass** for warden and ranger (15 beats each; see the last run for the mage below).
  One boss actor and the life bar's; phases at 66 / 33; every move's telegraph at or over the table's (Maul, Charge, second
  charge, Roar, Slam, Rockfall, both entries seen); every heavy blow 20.0% (bossHeavy 22 x her armour, held to the cap 20);
  on Skotos with no armour the Maul lands 42.0% (the cap); a charge into a Den boulder: Dazed 3.5 s; a slide (as her Roar
  calls it): 5.0% and Buried 3 s; struck 100 -> 30% in one blow: phase 3, `rocks2` then `roar3`, nine blows during them
  all landed; at 0 life the flag was already saved when a later 'kill' listener heard it, one kill, `'bossRest'`, the
  legendary flag, the body in the scene, a blow on it returns 0; no time lock (rested in 4.9 game-seconds, both entries).
- `kelados` (`fx7('keladosWake', 'tarn')`): **pass** for warden, ranger and mage (13 beats). Rooted (moved 0 m in phase 1);
  a Tremor behind a rock: nothing, in the open: the blow; lever 1: kneels 5 s Stunned, 0% of his life; lever 1 again
  refused, lever 2 refused at phase 1 and run at phase 2; entries walk him, lake 0.9 / 0.6, levers bared 1, 2, 3, plates
  0 / 2 / 6 / 8, one window; Sweep, Tremor, Ice Block, Boulder roll all at or over their telegraphs and 20% each; at most
  three blocks; the rest as Kallisto's; no time lock (10.8 s), both entries in order from one blow.
- Regressions after these changes: `heavy7`, `sleepers7`, `chough7`, `slide`, `race`, `save16`, `combat`, `hook6` pass.

## Hooks needed in files I do not own

- `world.js act7Zone` (the boss spots; until then the scenarios spawn the bosses themselves):
  `if (z.id === 'thaw' && !G.hero.flags.kallistoRest) z.bossSpot = { kind: 'kallisto', ...z.map.nearestFloor(S.arena.x, S.arena.z, 4) };`
  `if (z.id === 'tarn' && !G.hero.flags.keladosRest) z.bossSpot = { kind: 'kelados', ...z.map.nearestFloor(S.seat.x, S.seat.z, 4) };`
- `world.js spawnBoss`: add `|| z.bossSpot.kind === 'kallisto'` to `first` (her level `max(40 + 2, hero + 1)`; Kelados's
  `+3` is already the default).
- `forge.js bury`: a slide the hero kicked passes her as the blow's source, so her elite-damage bonus grows a boss's 5% /
  4% (6.9% for the fixture's +38%), and a champion's `slideElite` the same way. One line: for `a.boss || a.elite` call
  `damage(null, ...)` (or let `damage` skip the bonus on `o.slide`). The Roar's own slides pass Kallisto and are exact.
- The rest flag is saved inside the `'kill'` event (combat.js fires it; ai.js cannot run before it without a combat.js
  hook). Listeners registered before ai.js's (story.js's is) see the flag unset: the story should key the rest on
  `'bossRest'` (it already does, story.js:3117).
- Without `&nostory`, a story scene that waits on a dialog started a few seconds after Kallisto woke in the `weir3`
  fixture and held `G.mode = 'cine'` for good in a headless run (the AI clock stops): the story's to look at.

## Not done

- The echoes' rules (the green bowl, the six boulders cracking with `crackStone`, a rock falling by itself before the third
  charge; Kelados's blocks shattering, all levers bare): an echo fights by the main rules today.
- Co-op specifics: a charge on the hero farthest from her last target; the second Rockfall / Ice Block on the nearest
  shooter 1 s later; the Sweep on the most threat; a downed hero moved out of a lane. (The extra chute at three or four
  heroes and the five blocks are in.)
- The life bands (time to rest, blows landed, lowest life) are the balance bot's run B.
- The coordinator's `looter` row (an Act VII copy of `goblin` with the daylight look) and the swap of `goblin` for it in the
  `looters`, `icebound`, `terrace` and `worksMixed` packs, with `mon.looter` in `50-text-extra.md` and `text7-import`:
  not done. The edit was refused by the permission check (the packs, the design table and the generated text file are
  outside this builder's files). Done instead, inside my own rows: the Rock-roller tint 0x4e5660 at 0.7, the Rock-scorpion
  0x5a3c22 at 0.6, and the Marksman's look `{ tint: 0x1c2214, tintAmt: 0.8, rim: 0xd8e0c0, rimI: 0.3 }`.
