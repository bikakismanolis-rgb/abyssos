# Act VIII, the second half and the release (21 November, night)

One session, no sub-agents, the owner not asked (his rule of the day: go on to the next step and report at the end).

## Built

- **Zone 2, `vigil`, «Ο Οίκος της Αγρύπνιας»** (level 49). `gen8.js genVigil`: the Yard (daylight, the waypoint, the way
  back), three feeder halls one after the other, each with its fire and a shut door in its south wall, then the Great
  Hall. `build8.js`: pillars, the fires (build7's lookout hearth, burning), stone doors, a dark veil over each roofed
  floor, the Great Hall's Flame and its eight pools of daylight. `world.js` (`vigilZone`, `vigilEnter`, `vigilFire`,
  `act8Tick`, `dark8`, `sun8`): under a roof whose fire burns the sky eases to `ATMOS.vigilDark` (the hero's own light
  comes back); a fire **banked by hand** (a 1.5 s touch that a blow breaks; flags `bank1..3`) drops that hall's
  shutters, puts it in daylight and opens its south door (the door's cells are shut on the map until then). The way in:
  `vigilRoad`, an exit at the south rim of the Threshing Floor, locked on `aithonRest`.
- **Ragna the Wakeful** (`ai.js RAGNA`, `data.js ragna`, on Arna's old body in the Order's wool, a white-lamped staff).
  Held back until the three halls are banked. Moves: the Lesson (three rings of white fire where the hero stands, four
  in her last phase), the Rule (a line of white fire the length of the hall), the Rod (her staff), the Roll-call from the
  second phase (two students from the walls), the Long Night from the third (the pools go out but two, for 7 s).
  **The shutters fall with her life** (one for each eighth: bus `ragnaShutter`), each a pool of daylight; **in daylight
  she drowses** (walks at 0.55, her cooldowns run slow, every blow tells 1.3 times). Blows cannot take her below a
  twentieth of her life: there **the Flame is bare to the hand** (a 2 s touch only a heavy blow breaks; bus `flame8`),
  and banked, she sleeps (`spare`, `ragnaRest`). After 30 s at her floor she nods (a daze of 6 s every 12), so the touch
  can always be made.
- **The look gate's two faults.** Aithon (`actors.js dressAithon`): the hart's antlers hidden, its glow put out, the hide
  near black on a body a third broader, two short pale horns with dark tips, a wooden yoke with its bows and an iron
  ring. The drover stands on the Ashsmith's body (a big man with a maul), no longer the Hammerhorn's horned thrall. The
  Order's people wear pale wool (the tint above 2 lifts a dark body; the archers no longer read green).
- **The story**, quests 51-55 (`story.js`, the last block; `text8.js`): Halda's lid at the North Camp, an ember memory
  at each of the three banked fires (the girl who would not bank the last coals: «Είναι η τελευταία»), a line after
  Aithon, two on arriving at the House, one at each hall, Ragna's lines by phase, in daylight, at her floor and nodding,
  the sleep (three lines), the morning (the Flame woken by hand, three lines), the act's panel, a line at home.
  `actComplete(8)`: `hero.act8`, `flags.act8`, quest 55; the title's subtitle `game.sub8`. `?nostory` moves the flags
  and plays no scene.
- **Music** (`audio.js`): `tinder`, `vigil`, `aithon`, `ragna`, on the shipped instruments; the two bosses stop on the
  rest motif (`MOOD.rest`). `tools/audio8.mjs`: none silent, none clipping, each within 3.5 dB of the Pass's theme.
- **Co-op** (protocol 7): the Burn's lanes armed and burning and the Great Hall's shutters and bare Flame in the
  snapshot (`o.c8`, `lanes8`, `hall8`); `act8Presence` lays the host's flags on a guest's zone (the fires, the doors and
  their cells); a guest's hand on a banked fire, a hall's fire or the Flame is done on the host (`'u'`); `act8` rides the
  world message. `node tools/coop.mjs act8`.
- **Balance** (`tools/balance-act.mjs` knows `tinder`, `vigil`, `aithon`, `ragna`; runs in `docs/act8-briefs/balance/`):
  `HAZ8` = Act VII's rows with the creatures' life x1.4 and blows x1.25 (`zoneAct` is 8 in the act's zones; before, no
  row applied and the Order's packs fell in a second or two). The Wakeful guard less (arc 0.9, k 0.55), fewer Wakers in
  the fields. Aithon 2000 life, blows 2.3, his pushes cut (7 and 4, were 18 and 12: a melee hero was thrown off him), his
  charge and wheel rarer, his own fire 9% and a 4 s daze. Ragna 2000 life.

## Measured (the bot, Warden difficulty, level 52, three runs a cell unless said)

| where | class | time (median) | lowest life, median | deaths |
|---|---|---|---|---|
| aithon | mage | 54 s to the rest | 72% (worst 51%) | 0 |
| aithon | ranger | 121 s to the rest | 84% (worst 78%) | 0 |
| aithon | warden | 281 s to the rest | 89% (worst 88%) | 0 |
| ragna | mage | 97 s to the rest | 62% (worst 37%) | 0 |
| ragna | ranger | 116 s to the rest | 88% (worst 55%) | 0 |
| ragna | warden | 139 s to the rest | 35% (worst 33%) | 0 |
| tinder | mage | 1.9 s a pack (8 packs) | 84% (worst 83%) | 0 |
| tinder | ranger | 2.5 s a pack (8 packs) | 80% (worst 67%) | 0 |
| tinder | warden | 12.0 s a pack (8 packs) | 47% (worst 32%) | 0 |
| vigil | mage | 1.9 s a pack (6 packs) | 95% (worst 95%) | 0 |
| vigil | ranger | 2.1 s a pack (6 packs) | 94% (worst 90%) | 0 |
| vigil | warden | 10.7 s a pack (6 packs) | 66% (worst 15%) | 0 |

(The two zones' other cells and the bosses were run before the last softening of the fields (`HAZ8` life x1.6 → x1.4, fewer archers and Wakers): the ranged classes' zone times there are a little long, the warden's rows are after it. Act VII's bands: a boss 110-230 s, a pack 8-14 s, lowest life 35-65% in a zone.)

No death at Wanderer or Warden in any boss run. At Nightmare a level-52 hero dies (it is under-levelled there, as in
the earlier acts' runs). The runs vary a lot from one to the next (three a cell): these are a first pass, not a
campaign.

## Tests

All on this tree, one at a time (two cores), on the no-HMR dev server; then both builds.

- **Act VIII's own** (`tools/act8.mjs`): `burn`, `hearth`, `road`, `aithon`, `spine`, `vigil`, `ragna`, `play8` (the whole
  act with its story on, from the hook to the act's panel): all pass. `check-act8.mjs 300`: 300 layouts of each zone, 0
  hard faults. `audio8.mjs`: pass. `coop.mjs act8`: pass.
- **The older acts** (`tools/scenario.mjs`): `title panels combat mage lord gate king weep amaranthe ashfield karthax
  coast skotos save13 save14 save15 save16 shop resume progpanel hook7 thaw7 tarn7 ending7 catch7 kallisto kelados slide
  fires7 sun rested7 gate7 race heavy7`: all pass (`resume`, twelve parts, needs about 35 minutes: it was cut by a
  15-minute limit the first time and passed whole when run alone). `check-act7`, `check-names7` (645 checks),
  `net/test-transport`: pass. Co-op `join loot revive world act7 act8 bosses`: pass. `scenario.mjs --stale`: nothing.
- **`echo7`** (Kallisto's echo breaking a Den boulder): 5 passes in 7 runs on this tree, 4 in 4 on the tree before this
  session. It draws a new layout and her own choices each run (the handoff already says it can miss), and nothing of
  this session touches the Meltwaters or her; but the count is what it is, and it is not explained.
- After the format bumps (`SAVE_FMT` 3, co-op `VER` 7, the last change): `save15`, `save16`, co-op `act7`, `act8`, `join`
  and `play8` again: pass.
- **Both builds** made (`npm run build:artifact`, no file over 16 MB; `vite build --mode web`). The built artifact under
  the strict CSP, on a desktop and on a touch-phone context: the title, the Tindergrass, the Vigil House and Whitecliff
  load with no CSP violation, no page error and no stand-in body; Aithon (dressed) and Ragna wake on their own bodies.
- **Not run:** the rest of Acts I-VI's scenarios (about a hundred), the timed ones (`perf7`, `mem7`, `perf5`), the soak,
  `nogl`, the cloud-save and transfer scenarios, the full balance campaign.

## Not done, known

- **The eighth Name** (the Order's founder) and **the Seven Good Nights**: not built. The design's cap layer for this act
  is absent; nothing else depends on it.
- **No echo** of Aithon or Ragna after the act, no first-kill legendary for either (`LEG_FROM` has no row).
- **The road's exit in Whitecliff** still stands between two houses by the east wall; no signpost.
- **Ambient** in both zones is the Meltwaters' (pollen), also inside the House.
- The Great Hall has no walls of its own to hang shutters on: the House is cut into the hill, and a shutter is told by
  its pool of daylight and the hall growing lighter.
- The music was measured, not heard. Nothing was played by hand: every check is the tests' and the bot's.
- No phone was held: the strict CSP was run on a touch context, not a device.
- The Burn re-arms on every entry (by the design: "spent for the visit").
- The balance is a first pass at one difficulty; the class gap at Aithon (the mage about a minute, the warden four or
  five) is the widest thing left.

## 24 November: the not-done list, built (two sessions)

The owner asked to go on with what this report lists as not done («πάμε στο 2»). Two sessions split it; one kept the
branch and the commits, the other sent its part as a patch (checked by the files' hashes on 49eed6e) and reviewed.

- **The eighth Name, «Γρηγορία» / "Grigoria"** (names7.js `founder`; 2c6b408). The girl of the second ember memory, now
  named there (`d.mem8.2c`), learnt with `mem8_2`. Kept: when one foe alone is left awake within 12 m of her, her blows on
  it +25% (asleep, under the ground, hidden or a prop: not counted; combat.js counts once a frame). Deep: that last foe
  hurts her 15% less. The Call: every foe is the last. Co-op byte 16 (+8 Deep), so a v23/v24 page reads no Name there
  (its blow cap only lower) and never another Name. The name is a default the owner can change (one text row).
- **The Names' clock** (boot.js; 2c6b408). `G.time` never advanced from v23 on: after one Call every Name's condition held
  (the Call's `until` was 20 on a clock standing at 0) and no second Call came (its 90 s never passed); Asger's weave never
  fell, Isarn's Deep window never shut. It now advances by the game's dt. The balance runs A-C say no Name
  (balance-act.mjs), so the measured numbers stand; players who used the Call were stronger than meant.
- **The echoes** (world.js `echoes8`, `echo8Set`, `echo8Clear`; story.js 'echo'; 5aeb5b8). After `act8`, once a day each:
  Aithon by the fallen yoke, his Floor's six strips armed again; Ragna at the Flame's basin, the Great Hall dark with its
  shutters up and the Flame burning, bare at her floor, banked to lay her down, then the hall light as the morning left it.
  Nothing of the story moves. Act VII's echoes now end with their own line (`echo.done7`; they said the amber's).
- **The first-fall legendaries** (data.js `LEG_FROM`; 5aeb5b8). **Blacksoles** (boots, Aithon): a blow that carries a burn
  and the burning it leaves x0.7, +10% move. **The Vigil Ring** (ring, Ragna): after 4 s without striking, a certain
  critical, +25% critical damage (thorns and a Challenge's return neither spend nor end the pause). An echo's first fall
  drops it too, so a v24 hero who beat them before gets it from the echo. `legBack` covers both.
- **Act VIII's blessing** (data.js `BOONS[8]`; 7743219): the act had none. «Το Καπάκι της Χάλντα» (life 12%, armour 12%),
  «Η Μικρή Φωτιά» (damage 10%, area 12%; the proposal's «Αντιπύρ» renamed by the act's rule 4), «Το Πρώτο Πρωί» (cooldowns
  8%, resource regeneration 15). Offered once `act8` is done, to a hero who finished the act in v24 as well. **A v24 page
  refuses a hero holding one** (save.js: `newer`), as it would a new save format.
- **The Seven Good Nights** (world.js `GN8`, `gnTick`, `gnSleep`; story.js 'gnSay'; 7743219). After the act, beside each of
  seven people a touch of a second («Σκέπασε τη φωτιά του / της»): one line each (the proposal's), and they lie down where
  they stand until the hero leaves the zone. Halda, Leif's father and Elianthe in Whitecliff; Brokka in the Halls; Elati in
  the Lanternglade; Glaukos at the Rope camp; Selna at the Farthest Light, last, once the other six sleep (Tern takes her
  watch). `gn_<who>`, the count as a toast; all seven, `gnAll`: the act's blessing x1.25 (`REMEMBERED`). Left out: the
  proposal's sleeping coals from side hearths (the act built no side hearths).
- **The South Road's lane** (the second session; bc67c69): out of Whitecliff's east street between the Stilt house and the
  Long house, through the palisade (gen.js, cut last with no draws), a signpost and a lamp, the exit at its end.
- **The act's own ambient** (the second session; bc67c69): 'tinder' (chaff and straw on the wind, dust over the stubble;
  nothing additive, no spark, no smoke), 'vigil' (dust in the light) and 'vigilDark' (soot, white motes), switched in the
  House by its dark.

**Tests** (dev server, no hot reload, one browser at a time, on the merged tree): `check-names7` (700); act8 `founder`,
`echo8`, `gn8` (new), `aithon`, `ragna`, `vigil`, `burn`, `road`, `spine` and `play8` (the whole act with its story):
pass; `coop.mjs act8`: pass; scenarios `save14`, `save16`, `title`, `panels`, `shop`: pass; `resume` failed its later
parts in one long run after the rest, and each part passed alone (crypt, pass, act4, act5, tower, act6). `act8 hearth`
fails on 49eed6e as on this tree (the town and back is too slow on SwiftShader for its waits): a test matter. The second
session's review: the Vigil Ring no longer counts what goes back at a striker by itself; a Good Night's touch stands at
their side (their talk, a shop for two of them, still wins straight in front), with a hint the first time; one asleep
keeps no talk whatever a presence pass writes. **Not checked in a browser:** the Good Nights outside Whitecliff (that
Brokka, Elati, Glaukos and Selna stand in their zones after the act with these kinds), the builds and the strict CSP.

