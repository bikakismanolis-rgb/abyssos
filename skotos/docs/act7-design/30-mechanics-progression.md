# Act VII design, part 3: mechanics, progression at the cap, post-game, co-op, saves, blessings, music

«Πράξη VII: Οι Εφτά Κορυφές» / "Act VII: The Seven Peaks". Written to `docs/act7-briefs/decisions.md` (binding), on the
production proposal as the base, with the Names grafted from the systems proposal and Rested from the story proposal.
Every file and line cited was opened in this tree on 17 November 2026 (v22). No code was changed. Where something could
not be verified it says so, and the list is repeated in "Notes for the lead".

This part owns: the three mechanics, what is "loud", the Names and the Call, the Seven Fires, Rested, echoes, blessings,
legendaries, co-op, saves, music. It does **not** own the story, the zones and their layouts, the enemies' and bosses'
tables, the look or the stage plan. Where it needs something from those parts it names it.

Numbers are Warden difficulty («Φρυκτωρός») unless a row says otherwise. All of them are starting values for stages B
and C; the bands they must land in are the contract's (decisions.md, rules 1-4).

---

## Mechanics

**Three shipped systems, one new input each.** The Race is `tide.js`'s own-level channel moved by the hero's hand. The
Slide is `forge.js`'s flue fired by a trigger and not by a period. Sun and Shade is `light.js` asked the other way
round. Nothing here drains a meter, nothing stacks a damage multiplier, and no rule is needed to finish a boss: a player
who ignores all three finishes the act on Warden; one who uses them finishes it faster and safer.

**Taught one at a time, then combined** (the zones part holds the minute-by-minute table):
- the Race first, alone, in the Drowned Meadow and at the Race's bank;
- one rule per gully at the three weirs: a sleeping den (loud wakes it), a chute (the Slide), three Icebound in shade
  (Sun and Shade);
- all three together on the Chutes and the Sun-terraces at low stakes, then at Kallisto;
- `tarn` uses all three from its first step, and Kelados uses them all.

**No new buttons.** Turning a weir, melting ice, lighting a lookout and calling the names are the interact button. A
roll through a slide's front is the dodge. Everything else is where she stands.

**What does not run in Act VII:** `cold.js` (`coldAdd` returns unless the zone is a cold one, cold.js:35; `act7Enter`
sets `z.water` and never `z.cold`, as world.js:1150 and :1681 set both for Acts V and VI), `ice.js`, the Carried Fire
(`fireOn()` is 'under' only, light.js:138), the Names from Above, the Shroud (`shroudOn()` is 'ember' and 'under' only,
light.js:48).

### The Race («Το Ρέμα»)

The valley's river and the Hanging Lake. The brooks swell and fall by themselves; the river and the lake fall only when
the hero opens something, and they stay down.

**Rules.**
1. **Three kinds of water, read by colour and edge.** Dry ground; pale foaming water she can wade (depth under 0.45 m:
   move ×0.7, as shipped); deep blue water with a hard edge line that she cannot cross (0.45 m or more: the cell is
   closed, tide.js header lines 3 and 17-21).
2. **The brooks run on a clock** (`L.pocket` 1, `L.tideCfg = { phases: [50, 18, 34, 18], stepT: 4.5, hMax: 0.6 }`): 50 s
   low, 18 s rising in four steps of 0.15 m, 34 s high, 18 s falling. **120 s a cycle** (150 on Wanderer, 110 on Ash, 100
   on Skotos: `HAZ7.tide`).
3. **A roar comes 6 s before every rise** (8 s on Wanderer: `HAZ7.roar`), and the foam leads the grid by a step, so
   water that looks wadeable always is (tide.js:150-151).
4. **The Race and the lake do not move by themselves** (`L.pocket` 2, the own-level channel `z.tide.mere`,
   tide.js:168-182). The Race stands at **1.2 m** in the `spate` reading. **Each weir lowers it 0.3 m, for good:**
   1.2 → 0.9 → 0.6 → 0.3, at 0.1 m/s (two grid steps in 3 s, everywhere at once). The lake in `tarn` stands at 1.2 m and
   falls 0.3 m at each of Kelados's phase changes and to 0.3 m when the sluices open.
5. **A ford opens when the level less its bed is under 0.45 m.** The zones part gives the three fords their beds so
   that they open in order (west at 0.9, middle at 0.6, east at 0.3).
6. **Never under her feet** (shipped, unchanged): a step that would close her cell, or cut her off from ground the
   water never takes, holds her cells and a lane out for 6 s (`GRACE`, tide.js:40; `shelter`, tide.js:275-291); then a
   wave carries her along the lane, never over a wall and never faster than 9 m/s, for **6% of her life** (3 / 6 / 6 / 8
   / 10 / 12 by difficulty: `HAZ7.wash`).
7. **Water that rises over a camp takes the camp:** a foe on a closing cell is put on the nearest floor
   (`evict`, tide.js:340); swimmers and fliers keep the water. Gold and items slide to dry ground (`slideAll`, tide.js:353).
8. **A weir opened sends one surge pack** down the bank it drains (`floodWave`'s spawn rule, tide.js:482, called once
   by the weir and not by the clock).

**The first minute.** The causeway of the Drowned Meadow crosses one brook. The first roar is scripted for the moment
she reaches the planks: toast `q.brook` «Τα ρυάκια φουσκώνουν!» / "The brooks are rising!", the water climbs over the
planks for 34 s, and the goblins in the hut beside it are washed out onto her side. At the Race's bank Halda says the
act's rule (`d.halda.race`, the story part's) and the first-time hint shows: `hint.race` «Το ρέμα δεν πέφτει μόνο του.
Γύρνα τον τροχό.» / "The Race does not fall by itself. Turn the wheel." Each weir turned: toast `q.raceDown` «Το Ρέμα
έπεσε ένα σκαλί ({0}/3)» / "The Race is down a step ({0}/3)".

**The HUD.** The shipped tide dial (`tideDial`, tide.js:474) shows the brooks' clock and pulses for the roar. Beside it
three small notches show the Race's level, labelled `hud.race` «Ρέμα» / "Race". No new meter.

**What each class does.**
| class | with the water |
|---|---|
| Warden | Leap and Shield Charge cross a wading brook at full speed (a leap is never slowed); he fights with his back to rising water so the pack, not he, stands on the closing cells |
| Ranger | shoots across deep water (a closed water cell is low: sight and bolts pass over it, map.js:22-26, :40); a pack on the far bank of a rising brook is hers for 34 s. Vault carries her 6.5 m back over a wading strip |
| Mage | Frost Nova and Frozen Orb hold water at wading as shipped (`slushAt`, tide.js:396: r 5.5 for 8 s; r 1.2 for 6 s): a ford of his own across a **brook** at high water. Never across the Race or the lake (see the hard check below) |

**How enemies use it.** Goblin camps stand on cells the high water takes (rule 7 scatters them). Wolves keep the dry
knolls. A brook rising into a den wakes its bear (Sun and Shade, "How the three meet"). The surge pack of rule 8 is the
weir's own fight. Kallisto's bowl has its own stream; the bosses part owns it (see the fix below).

**In code.**
- `resetTide(z, { mere })` (tide.js:88-95) already takes the channel's level on entry. `act7Enter` calls it with
  `raceLevel(F) = 1.2 − 0.3 × (weirs open)` in `thaw` and the lake's level from its flags in `tarn`.
- The setter is the one the Ketos uses: `T.mere = { h, rate }` (`mereTo`, ai.js:4962, private to ai.js today): moved to
  tide.js as an export, `raceTo(h, rate = 0.1)`.
- **Fix (judge 2, P1): `haz()` reads `HAZ6` for every layout that carries `L.tideCfg`** (tide.js:51-60, line 55) and
  plays `iceGroan` as its bell (tide.js:142). It must read the zone's own act: `actHaz(act, diff)` (data.js:447) gains
  `HAZ7`, `haz()` asks it, and the row carries the warning's sound (`roarSfx: 'brookRoar'`).
- **Fix (judge 2, P1): a zone has one own level.** Kallisto's stream must not be pocket 2, or raising it would raise the
  whole Race and shut the east ford behind the hero. It is pocket 1 (the brooks' clock), held for the fight by
  `T.force` (tide.js:126-131). That is the bosses part's to write; this part only fixes the rule.
- The Mere's level is never 0 here (`T.mere` is dropped when it drains to 0, tide.js:181): the Race's floor is 0.3 m.
- **Hard check for `check-act7` (zones part): no slush may bridge pocket 2.** `slushAt` skips cells with
  `L.pocket === 2` in an Act VII zone (one condition in `slushTick`'s cell loop), so neither the Mage nor a slide's
  tongue can ford the Race before its weir.

**Engine cost: 1 day** with its soak. **Co-op authority:** the host's clock and the host's level (see Co-op).

**Soak `race`** (stage B, on a v22 hero at quest 39 taken through the fixtures, never a fresh test hero): the Race at
1.2 / 0.9 / 0.6 / 0.3 from flags on entry; the fords open in order and never out of it; `map.ver` at most 4 bumps a
second; never a cell closed under the hero in 20 minutes of walking the banks through 10 cycles; the warning is
`brookRoar` and not `iceGroan`; the wash-out is the `HAZ7` row's; a Frost Nova on the Race leaves it closed; the level
on a guest's page equals the host's within one step.

### The Slide («Η Κατολίσθηση»)

A chute is a white lane down a slope with a cornice of hanging snow at its top and a standing horn-stone at its foot.
It is loaded or it is not. Something loud brings it down, on whoever is in the lane.

**Rules.**
1. **Armed or not: one shape to read.** A chute with a cornice is armed. No cornice, no slide. (Judge 2's call: no load
   table, no pips.) Every chute is armed when the zone is entered.
2. **Something loud near it brings it down.** A loud thing (the list below) kicks every armed chute whose horn-stone
   lies within the thing's reach (10 m or 6 m), or whose lane it happened in.
3. **Only in sun.** A cornice in shade holds: it creaks, sheds a puff of snow dust and stays (Sun and Shade, rule 4).
4. **2.8 s of warning, always.** A white telegraph runs the whole lane and a low crack ends on the fall
   (`BREATH.inhale`, forge.js:27; never shortened, on any difficulty: data.js:32's rule).
5. **The slide runs the lane in 1.2 s** (`BREATH.fire`) and strikes once everything in it that nothing solid shields.
6. **Cover is anything solid between the cornice and her:** a boulder, a thick trunk, a cliff corner, a Rock-roller's
   rock, the block Kelados throws. The lane's cover spots show as blue circles the first frame she stands in the lane
   during the warning (forge.js:78). A roll through the front takes nothing (`pl.iframes`, forge.js:112).
7. **On the hero: 14% of her life** (8 / 14 / 14 / 18 / 22 / 26: `HAZ7.slide`), a share whatever she wears, and a push
   down the lane. No stun, no bury: she keeps her buttons.
8. **On foes: in full.** **35% of a foe's own life** (20% for champions and rares), it is **carried to the lane's foot
   and Dazed for 1.5 s** (open to every blow at ×1.5, `daze`, ai.js:1885). Big and anchored foes are not carried; they
   are Dazed where they stand. Fliers are missed. A boss takes its own row (the bosses part; the production proposal's
   Kallisto row is 6% and 4 s).
9. **Spent for 45 s** (60 / 45 / 45 / 45 / 40 / 35: `HAZ7.rearm`) while the cornice grows back, drawn as the cap's
   scale from 0 to 1. A chute is one spend in a fight, not a button.
10. **The tongue.** The last third of the lane lies 8 s as slush (wading-slow). Where the lane ends in a brook, the
    tongue holds the brook at wading for those 8 s: a ford made by a slide.
11. **A slide is not loud.** One slide never sets off another.

**What counts as loud.** One table, `LOUD` in data.js, keyed by skill id (a variant takes its base's row) and by enemy
move id. The value is the reach in metres. The rule a player can say: *what shakes the ground or shouts is loud; what
can be pressed without a cooldown is not.*

| | loud at 10 m | loud at 6 m | not loud |
|---|---|---|---|
| **Warden** | Leap (landing), Earthsplitter (along its line), Shield Charge (where it ends), Iron Bulwark (its burst), Dawnbreaker (the third blow) | War Cry | the basic attack, Whirlwind |
| **Ranger** | | Arrow Rain (its centre), a Snare Trap when it springs, Siege Bolt where it bursts | the basic attack, Multishot, Piercing Shot, Vault, Storm of Hawks, the Spirit Wolf (its howl wakes a den at 12 m and kicks nothing) |
| **Mage** | Meteor (each stone of a Shower at 6 m), Void Rift (its collapse) | | the basic attack, Fireball, Chain Lightning, Frost Nova, Frozen Orb, Ray of Dawn |
| **enemies** | a Den-bear's charge ending against something solid; a Rock-roller's slam and its boulder landing; Kallisto's Roar and her Rear-and-slam; Kelados's Fist (every second one), his Stomp | | wolves, goblins, choughs, scorpions, the Snow-worm's burst |
| **never** | the Call; a slide; a falling rock; the hero's legendary slide (Legendaries) | | |

Each class has a loud skill on a cooldown of 3 s or more, so each can start a slide on purpose and none starts one by
accident with its filler. The Ranger's are the weakest reach on purpose: she starts slides from outside the lane.

**The first minute.** Weir 2's gully is crossed by one chute with a goblin pack camped in its lane and a boulder beside
the trail. Hint on first sight of an armed chute: `hint.slide` «Άσπρη λουρίδα με χιόνι που κρέμεται: μη στέκεσαι μέσα.
Ό,τι βροντά, το ρίχνει.» / "A white lane with snow hanging over it: don't stand in it. Anything loud brings it down."
Whatever heavy skill she opens the fight with kicks it; the blue circle is behind the boulder. The second hint, the
first time she is in a lane during the warning: `hint.slide2` «Πίσω από βράχο ή χοντρό κορμό, το χιόνι σε προσπερνά.»
/ "Behind a rock or a thick trunk, the snow goes round you." While she stands in a groaning lane the screen's edge
pulses white (the shipped `flueWarn` vignette, hud.js:474, tinted by the flue's kind) with `q.slide` «Κατολίσθηση!» /
"Slide!". A foe carried down shows `hud.swept` «Παρασύρθηκε» / "Swept down".

**What each class does.**
| class | the Slide |
|---|---|
| Warden | sets it off from inside the lane with a Leap and rolls through the front: the warning is 2.8 s and his roll comes back in 2.2 s (data.js:116). His question is timing |
| Ranger | sets it off from outside with an Arrow Rain on the horn-stone or a Snare the pack walks into; a snared foe in a lane stays in it. Her question is where the horn-stone is |
| Mage | Frost Nova pins the pack in the lane (2.2 s of freeze, data.js:100) and the Meteor that follows is the kick. His question is the order of two skills |
| anyone | a War Cry or a Meteor cast without looking up brings it down on the caster. The act's second lesson |

**How enemies use it.** A Rock-roller's slam and a Den-bear's missed charge are loud: a careless pull beside a chute
buries the puller. Both bosses kick chutes by their own tables (the bosses part), through the same function.

**In code** (forge.js, about 120 new lines).
- `startFlues(L.flues)` as shipped (forge.js:33-41). A chute is a flue record with `kind: 'snow'`, `horn: { x, z }` and
  no `period`; at start it gets `armed: true`, `rearm: 0`. A fire flue is untouched.
- In `tickFlues` (forge.js:60-90) the idle branch (line 68-71) asks the kind: a snow flue never counts down a period;
  it waits for `kickChute(f, o)`, which starts the shipped `inhale(f)` (forge.js:92). After the fire state it is spent
  for `HAZ7.rearm` and then armed again.
- **Fix (judge 2, P2): `forge.js:63` returns for every hero with `flags.crownUnmade`,** which every Act VII hero has
  (set for good at story.js:974 / :986 by the judge's reading). As shipped, no chute would ever fall. The test becomes
  `F.zone.id === 'forge' && G.hero.flags.crownUnmade` (the cold Forge already stops its own flues, world.js:876).
- A look table per kind where the literals are today: the telegraph's colour (forge.js:93, 0xff6a10 → white 0xf4f8ff
  with the 'day' telegraph's dark edge), the front's sheet (forge.js:102), the embers (forge.js:76) → alpha snow puffs
  from the alpha pool, the sounds (`bellowsInhale`, `bellowsRoar` → `corniceCrack`, `slideRoar`), no point light.
- `burn(f, front)` (forge.js:109-124) gets a snow branch: the hero's hit is `pl.hpMax × HAZ7.slide / 100` with
  `{ pure: true, slide: true, kx, kz }` (the Breath's own call shape, forge.js:115, without `burn`); the foes' loop
  (forge.js:118-123) drops the `fireproof` and `magma` tests and the quarter (`BREATH.monsters`, forge.js:28, :122) and
  applies rule 8, on the host only.
- **The 'loud' event.** One helper, `groundBlow(x, z, r, n, o)`, goes under the ground-blow sites that today ask
  `vaultOn()`: there are 16 uses of `vaultOn()` (skills.js:263, 293, 327, 367, 443; skillsx.js:187, 284, 369, 385, 423,
  443, 465, 521, 695, 758, 791), of which 13 are blows on the ground and three are light or slush hooks (the trap at
  695, the hawks at 758, the orb at 791). The helper does what each site does today (crack ice, or bring the vault
  down) and, in a zone with snow flues, calls `loud(x, z, LOUD[id])`. The loud skills that do not strike the ground
  (War Cry, Shield Charge, Iron Bulwark, Dawnbreaker, Void Rift, the Snare) call `loud()` at the line where they already
  act: six one-line calls. Enemy moves call it from ai.js at their slam. `loud` emits bus `'loud'` (x, z, r, src); the
  dens' wake test (Sun and Shade) listens to the same event.
- **Fix (judge 2, P3): a shard's cell closes low, so a slide passes over it.** `tickDrips` closes shard cells with
  `map.change(open, close)` (forge.js:278), whose third argument defaults to `low = true` (map.js:43), and a low cell
  does not block sight (map.js:22-26), which is what `inFlue` asks (forge.js:57). A shard record gains `solid: true`
  for rock and for Kelados's block; `tickDrips` closes those in a second batch with `low = false`. Act VI's icicles stay
  low, as designed. `drip` takes `o.shard: 'rock'` (forge.js:152, :173).
- The tongue: on dry ground, slush pools along the lane's last third (`addSapPool`, sap.js:88; `wadeAt` already
  answers 'slush' for a pool, tide.js:470); on tidal cells, `slushAt` (tide.js:396), which by itself changes only tidal
  cells. **Not verified:** `addSapPool`'s arguments were not read.
- `HAZ7` (data.js, beside `HAZ6` at :52): this part's rows are in the table below.

**Engine cost: 2-2.5 days** with the helper, the host's event and the soak.

**Co-op authority:** the host's. A chute's armed state, its kick and its fall are decided on the host; each page takes
its own hero's hit; the host alone hurts and carries monsters (see Co-op).

**Soak `slide`** (stage B, on a v22 hero at quest 39 with `crownUnmade` set, which is the point of it): a chute falls
only when armed, sunlit and kicked; never with less than 2.8 s of warning; each loud skill of each class kicks it and
each quiet one does not (the `LOUD` table walked row by row); a hero behind a boulder, behind a Rock-roller's rock and
behind Kelados's block takes nothing; a goblin in the lane loses 35% and ends Dazed within 3 m of the lane's foot; a
champion loses 20%; spent for 45 s and armed again; a slide does not kick its neighbour; a tongue never turns a Race
cell to wading; a guest's Leap kicks it through the host.

### Sun and Shade («Ήλιος και Ίσκιος»)

The daylight made into a rule. Everything is in sun except what stands in shade, and the ice cares which.

**Rules.**
1. **Shade is the exception.** A cell is in shade when the layout marks it (`L.shade`: under the north side of cliffs,
   in gullies, under thick pines) or when a cloud's shadow lies on it. Everything else is in sun.
2. **Clouds cross the map.** Three at a time (4 / 3 / 3 / 3 / 2 / 2: `HAZ7.clouds`), each a soft dark disc of r 9-14 m
   moving on a straight line with the wind at 1.2 m/s. A cloud takes 15-23 s to pass over a spot and its edge moves at a
   walk: she can keep inside it or step out of it.
3. **Ice sleeps in shade and wakes in sun.** An Icebound foe (a statue in a block of ice) wakes after **2 s of unbroken
   sun** (3 / 2 / 2 / 2 / 1.5 / 1: `HAZ7.sunWake`). In shade it sleeps for ever. A blow wakes it at once, as any statue.
4. **Snow holds in shade.** An armed cornice whose head is in shade cannot be kicked (the Slide, rule 3).
5. **She can wake ice herself.** Standing at an ice block with the Cradle for **1.5 s** (interact, prompt `ice.melt`
   «Λιώσε τον πάγο» / "Melt the ice") melts it. The Lamplight track shortens the channel: 1.5 s ÷ (1 + its bonus), so
   1.14 s at rank 40 (`lampBonus`, light.js:140). The same channel frees a winch.
6. **Choughs dive only at a hero in open sun.** Under a cloud or a tree they break off.
7. **It is never a damage rule.** Nothing takes more or less for where it stands. On Kelados shade is a breather, not a
   window (the bosses part).

**The first minute.** At the Race's bank one ice block with a Rock-roller in it stands on the trail in a cloud's
shadow. The cloud slides off it, two seconds pass, the ice cracks: `hint.sun` «Ο πάγος κοιμάται στον ίσκιο και ξυπνά
στον ήλιο.» / "Ice sleeps in shade and wakes in sun." At weir 3 three Icebound stand in the cliff's fixed shade with a
chute above them: she chooses to melt one at a time, or to leave them asleep. The first chough pack: `hint.shade`
«Κάτω από σύννεφο ή δέντρο, οι καλιακούδες σ' αφήνουν.» / "Under a cloud or a tree, the choughs leave you be."

**What she sees.** Under shade the screen eases toward the zone's shade atmosphere row over 0.6 s (`mixAtmos`, the
look part's rows). A cloud's shadow on the ground has an edge that moves: no rule here depends on colour alone.

**What each class does.**
| class | Sun and Shade |
|---|---|
| Warden | goes to the ice himself and wakes the Icebound one at a time, with a blow or the Cradle; fights choughs from under a tree |
| Ranger | wakes a Rock-roller from range with one bolt when a slide is armed over it; uses a cloud as cover from choughs while she shoots out of it; the Spirit Wolf is never dived on |
| Mage | **fire thaws:** his burning ground on an ice block counts as sun in shade and halves the wait (`fireAt`, light.js:86). **Frost re-freezes:** Frost Nova or Frozen Orb on an Icebound woken less than 3 s ago puts it back to sleep for 4 s, once each. He decides when the ice wakes and can take it back |

**How enemies use it.** Rock-rollers and their goblins are Icebound. Choughs are sun-hunters. Rock-scorpions go under
their stones in shade and come out with the sun. A cloud passing over a field of ice blocks wakes them edge first: the
fight arrives as a line. Kelados slows under a cloud (the bosses part).

**In code** (light.js, about 90 new lines).
- `ZONES[id].light = 'sun'` turns the system on (`lightKind`, light.js:41-45, reads any string).
- `shadeAt(x, z)`: `L.shade[i]`, or inside a pool with `p.shade`. `sunAt = !shadeAt`.
- **The 'sun' branches judge 2 lists (P4), all four:** `lightAt` (light.js:58) answers `!shadeAt(x, z)` on its first
  line, before the pools loop at :60 (a shade pool must never count as light); `heroLightR` (light.js:109) returns 0;
  `baseRing` (light.js:623) returns 0; `tickLight` (light.js:553) hides the ring and the Cradle and leaves
  `R.heroLight` alone (the scaling at its last lines would otherwise shrink the hero's light by a ring of 0).
- A cloud is `addLightPool(x, z, r, Infinity, 'cloud', { shade: true, light: false })` (light.js:325): no light of its
  own, and its own disc. The shipped dark-cored disc (`DISC6_FS`, light.js:462-467) is 82% violet-black: a cloud needs
  its own colour (blue-grey 0x1c2a3a) at about 0.3 alpha, normal blending. `B.drape` runs when a disc moves
  (light.js:575): fine for four discs.
- `tickClouds(dt)`: each cloud's position is a function of the zone's seed and one clock, `z.sunT`, on paths that
  repeat every 600 s. No random walk: two pages with the same clock draw the same clouds.
- The wake test in ai.js's statue tick (ai.js:81, `statueTick`): `sunAt` held for `HAZ7.sunWake`. The dens' wake: the
  `'loud'` event within 12 m, or water reaching the den's cell. The choughs' `shadeShy` in place of the Skua's
  `lightShy`. The chute's `sunAt(f.x, f.z)` in `kickChute`.
- 'Reduce flicker' (`G.settings.flicker`) also stills the clouds' edge shimmer.

**Engine cost: 2-2.5 days** with its soak. **If G2 shows nobody uses it:** the production proposal's cut 3 (a whole-zone
cloud every 45 s for 12 s); rules 3-6 stand unchanged, `tickClouds` becomes ten lines.

**Co-op authority:** the host's clock; every page draws the same clouds from it. Waking is the host's (monsters are).

**Soak `sun`** (stage B, v22 hero at quest 39): an Icebound sleeps under a cloud for 60 s and wakes within 3 s of sun;
a Cradle channel wakes it in 1.5 s and in 1.14 s with Lamplight at rank 40; a Mage's fire wakes it in shade; a Frost
Nova puts it back once; a chough breaks off within 1 s of shade; a kick under a cloud does not fall and the same kick
in sun does; the ring and the Cradle are not drawn and `R.heroLight.distance` is unchanged after 60 s in the zone; the
clouds' positions are equal on two pages within 0.5 m.

### How the three meet, and where they must not

They touch in exactly three places, each a sentence a player could say:
1. **Sun arms snow.** A cornice in a cloud's shade cannot be kicked.
2. **Snow becomes water.** A slide's tongue lies 8 s as slush, and over a brook it is a ford.
3. **Water wakes sleepers.** A brook rising into a den wakes its bear.

They must not: drain a meter; stack a multiplier; change by difficulty in anything but their numbers; be needed to
finish a boss; open the Race before its weir.

### This part's rows of `HAZ7` (data.js, beside `HAZ6`; indexed like `DIFFS`)

The boss rows (the heavy share, cooldowns, moves a phase) and the creatures' rows are the bosses and enemies part's.
Telegraph lengths are not in the table because they never change (data.js:32).

| key | what | Wanderer | Warden | Hero | Nightmare | Ash | Skotos |
|---|---|---|---|---|---|---|---|
| `tide` | the brooks' cycle (s) | 150 | 120 | 120 | 120 | 110 | 100 |
| `roar` | the warning before a rise (s) | 8 | 6 | 6 | 6 | 6 | 6 |
| `wash` | a wash-out (% of her life) | 3 | 6 | 6 | 8 | 10 | 12 |
| `slide` | a slide on the hero (% of her life) | 8 | 14 | 14 | 18 | 22 | 26 |
| `slideFoe` / `slideElite` | a slide on a foe / a champion or rare (% of its life) | 35 / 20 | 35 / 20 | 35 / 20 | 35 / 20 | 30 / 16 | 30 / 16 |
| `rearm` | a chute spent (s) | 60 | 45 | 45 | 45 | 40 | 35 |
| `clouds` | clouds on the map | 4 | 3 | 3 | 3 | 2 | 2 |
| `sunWake` | sun needed to wake the Icebound (s) | 3 | 2 | 2 | 2 | 1.5 | 1 |
| `hold` | a lookout's hold (s) / packs | 60 / 1 | 75 / 2 | 75 / 2 | 75 / 2 | 75 / 3 | 75 / 3 |

### Touch and phone readability (this part's rules)

1. One lane colour per danger, never shared: white for snow, blue for sluice water, the boss's red for its blows, each
   with the 'day' telegraph's dark edge.
2. An armed chute is a shape (the cornice), a deep ford is a hard edge line, a cloud is a moving edge: none is told by
   colour alone.
3. Interacts never stand in a lane, and never closer than 3 m to each other in an arena (hard checks, the zones part).
4. The Names add no button, no bar and no chip but one: the Call's 20 s shows in the shipped buff row (hud.js:167).

---

### The Names («Τα Ονόματα»)

**The complaint, in numbers.** A hero has 49 points at level 50 and one more for every Mastery level
(`pointsEarned`, progression.js:41). Ranks and variants take at most 36 (docs/progression/README.md, Numbers).
Everything after that goes into thirteen tracks of percentages (progression.js:9-25). No purchase after level 37
changes how the hero plays.

**The answer, in one sentence.** The hero says up to three Names; each Name is a rule about *how* she fights that pays
only when she fights that way; the slots and the depths are bought from the same pool of points as skills and Mastery.

**Seven Names**, fixed in the contract. Three are given at quest 40, three are read from flags the shipped game already
sets, one is earned in a fight.

| # | Name | how it is learnt | who it suits |
|---|---|---|---|
| 1 | «Άρνας» / Arna | given at q40 | every class; burst builds |
| 2 | «Ίσαρν» / Isarn | given at q40 | every class; the Warden most |
| 3 | «Φέρουσα» / Pherousa | given at q40 | Mage and Ranger (their pools refill); a Warden who shouts |
| 4 | «Έιναρ» / Einar | `flags.remembered`: the four Name-stones of Act V lit (story.js:1385) | Ranger, Mage |
| 5 | «Κήυκας» / Keyx | `flags.landing6`: his lantern hung at the Landing (story.js:2632) | Warden, Ranger (short dodge cooldowns), a brave Mage |
| 6 | «Άσγκερ» / Asger | `flags.asgerRest`: Asger freed among the Lost (story.js:2303) | Mage, Ranger |
| 7 | «Ίβαρ» / Ivar | his echo beaten once after q40 (the echo's kill branch, story.js:252-262; sets `ivarEcho7`) | Mage (the Ray), a planted Warden |

The names themselves are the shipped keys (`npc.arna`, `npc.einar`, `npc.keyx`, `npc.ivar`, text.js:520-521, :765,
:1329; Pherousa as `boon.bearer` spells her, text.js:1175). **Not verified:** the exact shipped key for Asger's name.

**Each Name: one rule Kept, one rule Deep, one number each.** The panel shows the two lines exactly as below.

| Name | Kept («Φυλαγμένο»): `name7.<id>.d` | Deep («Βαθύ»): `name7.<id>.d2` | during the Call |
|---|---|---|---|
| **Arna**: the opening | «Το πρώτο σου χτύπημα σε εχθρό με γεμάτη ζωή: +40%.» / "Your first hit on a foe at full life: +40%." | «Αν πέσει μέσα σε 4 δευτ., η πιο αργή σου δεξιότητα γυρίζει 15% πιο γρήγορα.» / "If it falls within 4 s, your slowest skill comes back 15% sooner." | every foe counts as at full life once each 3 s |
| **Isarn**: the flask | «Η φιάλη σου ξαναγεμίζει σε 12 δευτ., όχι 18.» / "Your flask refills in 12 s, not 18." | «Για 4 δευτ. αφού πιεις, πονάς 30% λιγότερο.» / "For 4 s after you drink, you are hurt 30% less." | the flask is ready at once and refills in 6 s |
| **Pherousa**: holding | «Όσο κρατάς 70 ή πάνω, χτυπάς +18%.» / "While you hold 70 or more, you hit +18%." | «Κι όσο το κρατάς, οι δεξιότητές σου κοστίζουν 15% λιγότερο.» / "And while you hold it, your skills cost 15% less." | her Fury, Energy or Mana cannot fall below 70 |
| **Einar**: distance | «Από μακριά, πάνω από 9 μ., χτυπάς +20%.» / "From afar, over 9 m, you hit +20%." | «Ένα κρίσιμο από μακριά αφήνει τον εχθρό Φανερωμένο για 2 δευτ.» / "A critical hit from afar leaves the foe Revealed for 2 s." | every foe counts as far |
| **Keyx**: the dodge | «Μετά από κάθε αποφυγή, το επόμενο χτύπημα μέσα σε 2 δευτ.: +60%.» / "After each dodge, your next hit within 2 s: +60%." | «Αποφυγή που περνά μέσα από χτύπημα γυρίζει αμέσως.» / "A dodge that passes through a blow comes back at once." | the dodge's cooldown is halved |
| **Asger**: the weave | «Κάθε δεξιότητα που δεν είναι η προηγούμενη: +10%. Ως τρεις.» / "Each skill that is not the one before it: +10%. Up to three." | «Στις τρεις, η απλή σου επίθεση δίνει διπλό πόρο.» / "At three, your basic attack gives twice the resource." | she is at three and nothing ends it |
| **Ivar**: the post | «Κάθε δευτερόλεπτο που δεν κουνιέσαι: +6% ζημιά, −5% πόνος. Ως τέσσερις φορές.» / "Each second you do not move: +6% damage, −5% hurt. Up to four times." | «Στις τέσσερις, τίποτα δεν σε σπρώχνει και κανένα χτύπημα δεν κόβει ό,τι κάνεις.» / "At four, nothing moves you and no blow breaks what you are doing." | she is at four, and moving does not end it |

Notes on the rules, so that each is one number and one hook:
- **Arna.** "At full life" is `target.hp >= target.hpMax` read before the blow lands, in the own-blow branch of
  `damage` (combat.js:66-72). The refund is taken in `kill` (combat.js:489) from the longest cooldown on her four
  buttons.
- **Isarn.** `POTION.cd` is 18 (data.js:448); the flask is `drinkPotion` (skills.js:489-493, the cooldown at :492).
  The 30% goes in `hurtHero` beside the other reductions (combat.js:157-160).
- **Pherousa.** Read in `heroHit` (combat.js:35-45) from `p.res`; the cost in `useSkill` (skills.js:182). The Warden's
  Fury fades by itself (`resRegen: -4`, data.js:68): for him the Name means "shout, then hit while it is high".
- **Einar.** Distance from her to the foe when the blow lands, in the own-blow branch. Revealed is the shipped status
  (`addVuln(target, 'revealed', 2)`, combat.js:304; ×1.25 from everyone). "Φανερωμένο" must be checked against the
  shipped word for Revealed.
- **Keyx.** `dodge` stamps a 2 s window (skills.js:451-462). "Passes through a blow" is the early return in `hurtHero`
  while `p.iframes > 0` (combat.js:146): that line refunds `pl.dodgeCd`, at most once a dodge.
- **Asger.** Counted on the shipped bus event `skillUsed` (skills.js:189). The stacks fall after 6 s without a skill.
  The basic attack is not a skill here: it neither adds nor ends.
- **Ivar.** Counted in the hero's tick (player.js): a second within 1 m of where the count began adds one; moving 3 m
  from that spot ends it. Whirlwind in place, the Ray of Dawn and every cast keep it. "Nothing moves you": pushes,
  pulls and a slide's push are ignored at four; the wash-out's lane is not (she is never left in closing water).

**No Name is a flat percentage.** Each names a way to play and pays only for it: opening, drinking, holding back,
distance, dodging, rotating, standing. **Two pairs fight each other on purpose:** Ivar against Keyx (stand or move) and
Pherousa against Asger for a Warden or a Mage who spends freely (hold or spend). Saying both is allowed and wasteful.

**Slots, depths, costs.**
| what | cost | rule |
|---|---|---|
| slot 1 | free | opens at q40 with Arna said in it |
| slot 2 | **6 points** | |
| slot 3 | **12 points** | |
| a Name made Deep | **8 points** each | permanent until a respec |
| changing which Names are said | free | **in the village only**, as variants are (docs/progression/questions.md, 3) |

- Three Deep Names said: 6 + 12 + 24 = **42 points**. Every Name Deep: 18 + 56 = 74.
- What a hero can afford on the first day: a level-50 hero with no Mastery has 49 points; one who bought every rank and
  variant has 13 left (slot 2 and most of a Deep); one who bought only the four skills on her buttons and their
  variants has about 27 (both slots and one Deep). The third Deep is Mastery levels: that is the tail.
- **A free respec at q40**, once per hero (`names.free`): `name7.free` «Η Χάλντα τρόχισε ό,τι ήξερες: ένα ξέχασμα
  χωρίς χρυσάφι.» / "Halda has put a new edge on what you knew: one unlearning, no gold." The shipped respec costs
  30,100 gold at level 50 (`respecCost`, progression.js:50). A respec gives back the slots' and depths' points too and
  keeps what is learnt; the said list shrinks to slot 1.
- **Against the old sinks.** Eight points of Might from rank 0 are about +18% damage always. A Deep Name is worth more
  than that when she plays its way and nothing when she does not.

**The panel (phone first, 844 × 390).** A third tab in the skills panel beside Skills and Mastery: `prog.tab.names`
«Ονόματα» / "Names" (`renderSkills`, progpanel.js:16-24; the tab buttons at :19, the `ptab` action at :104; the tab
is hidden before q40).
- Top row: the three slots as large round tiles (56 px), a locked slot showing its price, `name7.slot` «Άνοιξε θέση
  ({0} πόντοι)» / "Open a slot ({0} points)". Header `name7.h` «Τρία ονόματα τη φορά» / "Three names at a time", under
  it `name7.sub` «Κάθε όνομα που λες είναι ένας τρόπος να πολεμάς.» / "Each name you say is a way of fighting."
- Below: seven tiles in one row that scrolls sideways if it must. Learnt: lit. Deep: a second flame. Not learnt: dark,
  with the deed in one line (`name7.<id>.how`).
- Tap a tile: its two lines on the right, and two buttons: `name7.say` «Πες το» / "Say it" (it goes into the first
  free slot; tapping a full slot first chooses which to replace) or `name7.unsay` «Σώπασέ το» / "Leave it unsaid", and
  `name7.deepen` «Βάθυνέ το ({0} πόντοι)» / "Deepen it ({0} points)". Out of the village the Say button is greyed with
  `name7.town` «Τα ονόματα αλλάζουν μόνο στο χωριό» / "Names are changed only in the village" (`inTown`,
  progpanel.js:12). Deepening and opening a slot work anywhere, as ranks do.
- Three taps from the HUD to a changed build: skills button, Names tab, tile, Say.
- The deeds, as the dark tiles say them:
  - `name7.einar.how` «Άναψε τις τέσσερις Ονοματόπετρες της Ακτής.» / "Light the four Name-stones of the Coast."
  - `name7.keyx.how` «Κρέμασε το φανάρι του στη Σκάλα της Ακτής.» / "Hang his lantern at the Landing."
  - `name7.asger.how` «Βρες τον ανάμεσα στους Χαμένους, κάτω από τον πάγο.» / "Find him among the Lost, beneath the ice."
  - `name7.ivar.how` «Νίκησε την ηχώ του στο Τελευταίο Λυχνάρι.» / "Beat his echo at the Last Lamp."
  - `name7.locked` «Δεν ξέρεις ακόμα αυτό το όνομα.» / "You do not know this name yet."
- At q40, once: `name7.given` «Τρία ονόματα τα ξέρεις από πάντα: Άρνας, Ίσαρν, Φέρουσα.» / "Three names you have
  always known: Arna, Isarn, Pherousa." A Name learnt later: `name7.learnt` «Έμαθες ένα όνομα: {0}» / "You have learnt
  a name: {0}".

**Words.** The Names are *said* («λες») and *called* («φωνάζεις»). No word of the church register is used for them or
for the Call (judge 1 §5.2): nothing is invoked, prayed, chanted, vowed or commemorated; there is no rite in the panel.
The living are not on the list, nor the one name the game does not say.

**In code.**
- `src/game/names.js` (new, about 220 lines): the table `NAME7`, `learnNames(h)`, `sayName`, `deepen`, `openSlot`, the
  seven rules as small functions, the Call. **The module and its exports must not be called `NAMES`:** light.js:244
  already exports `NAMES` (Act VI's Names from Above) and co-op sends it as `o.n` (coop.js:651).
- One-line hooks in shipped code: `heroHit` (combat.js:35) for Pherousa, Asger and Ivar's multipliers; the own-blow
  branch of `damage` (combat.js:66-72) for Arna, Einar and Keyx; `hurtHero` (combat.js:143-168) for Isarn, Ivar and the
  dodged blow at :146; `kill` (combat.js:489) for Arna's refund; `useSkill` (skills.js:171-190) for Pherousa's cost and
  the weave; `dodge` (skills.js:451) and `drinkPotion` (skills.js:489); the hero's tick for the post.
- progression.js: `pointsSpent` (:42-48) adds 6 and 12 for slots 2 and 3 and 8 for each Deep; `respec` (:100-106) takes
  a `free` argument and resets `names.slots`, `names.deep`, `names.said`; `migrateHero` (:112) gives every hero
  `names = { learnt: [], said: [null, null, null], deep: [], slots: 1, free: 0 }`.
- `learnNames(h)` runs on every hero taken up and at q40, on **the hero's own record** (a co-op guest's `__real`),
  because a guest's `flags` are the host's copy (`viewHero`, coop.js:960-972).
- text.js: 32 keys for the Names and 6 for the Call (the table at the end).

**Engine cost: 5-6 days** with the `names` scenario (each rule asserted at a dummy, Kept and Deep, and the respec's
arithmetic) and run D.

**Run D: each Name is shown to do something, or it is cut.** (The Lamplight lesson made a rule: Act VI's thirteenth
track could not be measured.) Per class, the reference hero with no Name against each Name alone, Kept then Deep,
played its way by the bot, on one zone and one boss: 3 classes × 7 Names × 2 depths × 2 fights × 4 runs = **336 short
runs**, plus 24 of baseline.

| Name | the bot's play style (`job.play`) | passes when, played its way |
|---|---|---|
| Arna | `open`: picks a foe at full life when one is in reach | kills 6-14% faster Kept, 12-22% Deep, in the zone; within the spread at a boss outside a Call |
| Isarn | `drink`: drinks at 70% of life, not at 40% | lowest life 8-20 points higher, or one death fewer in twelve |
| Pherousa | `hold`: does not spend below 70 | 6-14% / 12-22% |
| Einar | `far`: keeps 10 m | 6-14% / 12-22% for Ranger and Mage |
| Keyx | `dodge`: rolls through a telegraph when a roll is ready | 6-14% / 12-22%, and no more blows landed than the baseline |
| Asger | `weave`: never the same skill twice running | 6-14% / 12-22% |
| Ivar | `stand`: does not move while a foe is in reach and no telegraph is under her | 6-14% / 12-22%, lowest life no worse |

- Played the wrong way, a Name must change nothing beyond the runs' spread.
- A Name must pass for at least two of the three classes. One that passes for none is cut before G3; one whose effect
  is over its band has its one number lowered, never a clause added.
- No Name ships without its play style in the bot.
- **Run E** (the six example builds, each against no Names, both zones and both bosses, 6 runs): a three-Name build
  played its way kills 15-30% faster with lowest life no worse. **Run F** re-runs Act V's and Act VI's Warden cells
  with the best build of each class and reports the change (expected ×1.15-1.3 faster; the acts' own bands are not
  re-tuned for it).

**Two example builds per class** (three Deep Names, 42 points; the rest in skills and Mastery).

| class | build | says | buttons | plays as |
|---|---|---|---|---|
| Warden | **The Post** | Ivar, Isarn, Pherousa | Ember Dance, Challenge, Iron Bulwark, Dawnbreaker | plants himself, taunts the pack onto him, spins in place at four; the shout's Fury keeps him over 70; drinks early and often. Every Fist ring and every charge asks whether he will give up four stacks |
| Warden | **The Roll** | Keyx, Arna, Asger | Shield Charge, Twin Leap, Earthsplitter, War Cry | rolls through the telegraph and has his roll back at once, hits for +60%, leaps to the next foe at full life for +40%, never the same skill twice. Every Leap is loud: he lives beside the chutes |
| Ranger | **The Far Shot** | Einar, Arna, Pherousa | Siege Bolt, Snare Trap, Vault, Spirit Wolf | stays beyond 9 m with Energy over 70 and opens every foe with one enormous bolt (×1.2 × 1.4 × 1.18). Useless inside 9 m: Vault is the build's life |
| Ranger | **The Weave** | Asger, Keyx, Isarn | Rain of Fire, Multishot, Snare Trap, Storm of Hawks | four skills one after another at three stacks, a roll through each blow, a flask every 12 s. The safest of the six |
| Mage | **The Lighthouse** | Ivar, Pherousa, Einar | Ray of Dawn, Blizzard, Void Rift, Frozen Orb | stands still at range with the Ray, Mana held over 70 by the cheaper costs. The purest stand-and-channel build the game has; a slide's lane is the one place it must never stand |
| Mage | **The Storm-step** | Asger, Keyx, Arna | Trident of Flame, Forked Lightning, Frost Nova, Meteor Shower | casts without stopping and never the same skill twice; blinks through blows for a free blink; the Meteor opens each pack at full life and kicks the chute over it |

**What is deliberately not added.**
| | | why |
|---|---|---|
| a fourteenth Mastery track | no | the thirteenth could not be measured; the Names make Wellspring, Focus and Stride worth buying |
| set bonuses | no | new item generation, tooltips, `cleanItem` rules and co-op checks, and they narrow builds |
| a second legendary slot | nothing to add | every slot already takes a legendary and every power is read (`s.legs`, stats.js:10, :18) |
| Tempering | no | cut by both judges; a patch may bring it |
| more than seven Names | no | fixed in the contract; five of the systems proposal's twelve are banked |
| a higher level cap, a new currency | no | Mastery is the cap's tail by design |

### The Call («Το Φώναγμα»)

The cap's planned burst, the same 20 s for every class. A lookout hearth is where a voice carries to the peaks.

**Rules.**
1. **At a burning lookout hearth** the prompt is `call.prompt` «Φώναξε τα ονόματα» / "Call the names". It is instant.
2. **For 20 s every Name she says acts as if its condition were met** (the last column of the Names' table). A Name's
   Deep rule applies only if she has made it Deep. Toast `call.on` «Τα ονόματά σου ακούγονται ως τις κορυφές» / "Your
   names carry to the peaks"; the buff row shows `hud.call` «Φώναγμα» / "The Call" with its seconds.
3. **A hero who says no Name** (a co-op guest who has not reached q40 in her own game) gets +30% damage for the 20 s:
   `call.none` «Δεν λες ακόμα κανένα όνομα. Η φωνή σου φτάνει κι έτσι.» / "You say no name yet. Your voice carries all
   the same."
4. **Once a hearth a visit**, as a shrine (`shrineSpent`, world.js:503): `call.spent` «Η φωτιά άκουσε ήδη τα ονόματά
   σου.» / "This fire has already heard your names." And never within 90 s of her last Call, so two hearths cannot be
   chained.
5. **Where.** The six lookouts, once their hearth burns (lit in this visit by a hold, or held before by this hero:
   the Seven Fires). **Each boss arena has one hearth of its own,** lit from the fight's start.
6. **In a boss fight the hearth flares again once, on the fight's own beat:** at Kallisto's last phase and the first
   time Kelados goes to his knees. A horn sounds, a blue circle shows round the hearth, Halda calls it from the rim
   (the fail-safe voice, decisions.md rule 6), and `call.again` «Η φωτιά φουντώνει ξανά: φώναξε!» / "The fire flares
   again: call!" At most two Calls a fight: 40 s of a fight of 110-230 s.
7. **The Call is not loud** and a lookout's hearth never stands in a lane: calling the names is never punished.
8. **The Call never lengthens a fight.** A boss's life is tuned by the bot without a Call; with both Calls used well
   the fight is 10-18% shorter. Run C stays the test for hidden locks.

**In code.** A `callFire` interact beside `shrine` (world.js:192-201; `useShrine`, world.js:493), one buff
`pl.buffs.call = 20` (the buff row lists `pl.buffs`, hud.js:167), read by names.js. About 0.5 day, counted in the
Names' 5-6.

**Co-op.** Each hero's own, at each hearth, as a shrine is (`GUEST_OK`, coop.js:1523, gains `callFire`). The flare in a
boss fight is the host's event; the Call is still each page's.

**What this needs from the others.** The zones part: `L.spots.lookouts[6]` with a hearth each, and one
`L.spots.callHearth` in each arena, 3 m from any other interact and out of every lane. The bosses part: the beat that
flares it, and Halda's line.

---

### The Seven Fires («Οι Εφτά Φωτιές»)

The ladder. The seven fires of `d.peaks.2` (text.js:1381) become seven small permanent ranks that ask the player to
come back on harder difficulties, which is where a capped hero's power is meant to be spent. It is the act's optional
find: there is no separate collectible.

**The six lookouts and Arna's hill.** Three lookouts («βίγλες») in `thaw`, three in `tarn`, each with a hearth and a
keeper stranded beside it. Arna's hill, over Whitecliff, is the seventh.

**Holding a lookout.**
1. Light the hearth: a 2 s touch that a blow breaks (`touch`, world.js:977), prompt `look.light` «Άναψε τη βίγλα» /
   "Light the lookout". The Call is hers from that moment.
2. **Hold it for 75 s** (60 on Wanderer): a hero must stay within 12 m of the hearth; `look.hold` «Κράτα τη βίγλα:
   {0}» / "Hold the lookout: {0}" counts down. Out of the ring for 6 s in all, or every hero down: the fire gutters,
   `look.lost` «Η φωτιά έσβησε. Ξαναδοκίμασε.» / "The fire is out. Try again.", and it can be lit again after 20 s.
3. **Waves:** a champion pack at 4 s (for certain, whatever the zone's champion odds); a second pack at 30 s (not on
   Wanderer; with a rare leader from Nightmare up); a third at 55 s on Ash and Skotos. They come up the approach the
   layout gives the lookout. This is Act IV's bellows wave (`bellowsWave`, world.js:1034) with a hearth in place of
   the bellows.
4. **Each lookout asks one thing of the terrain,** at 20 s:

| # | lookout | zone | what the hold asks |
|---|---|---|---|
| 1 | the west knoll in the flood | `thaw` | the brooks rise once, scripted: the knoll becomes an island of r 4 and the pack must wade to it |
| 2 | the shoulder between two chutes | `thaw` | both chutes are armed over the approach: kick one onto the second pack |
| 3 | the lip of the Sun-terraces | `thaw` | open sun: choughs with the pack, scorpions under the stones round the hearth; one cloud crosses |
| 4 | the rock island in the snow | `tarn` | chutes from both ridges cross the approach: stand between two lanes |
| 5 | the wheel-house corner | `tarn` | six Icebound round it in a cloud's shadow; the cloud leaves at 20 s |
| 6 | the skerry in the lake | `tarn` | reachable only after the lake's first fall; the causeway's clock covers the way out for the middle of the hold |

5. **Held:** `look.held` «Η βίγλα κρατήθηκε ({0})» / "The lookout is held ({0})" with the difficulty's name; the
   keeper waves from the rock; flag `look1..6` (the host's world).

**Ranks.** Each fire has a rank: **the highest difficulty on which this hero has held it** (1 Wanderer ... 6 Skotos).
`hero.fires = [r1, r2, r3, r4, r5, r6, r7]`. **Arna's hill takes the lowest of the other six**: it burns as bright as
the weakest, so the ladder has a capstone. `fires.arna` «Ο λόφος του Άρνα καίει όσο η πιο αδύναμη από τις έξι.» /
"Arna's hill burns as bright as the weakest of the six."

**What a rank gives: small, and capped.**
- **+0.5% damage and +0.5% life for each rank of each fire**, added to `dmgPct` and `lifePct` in `computeStats` beside
  the blessings (stats.js:29-35), so they add with Might and Vigor and do not multiply them.
- All seven at Warden: +7% / +7%. All seven at Skotos, the hard cap: **+21% / +21%**, over many sessions.
- A rank first reached also pays once: one item roll of rare or better at her level, and experience worth a quarter of
  her current Mastery level's bar (`mxpToNext`, data.js:373). A hold repeated at a rank she already has pays only what
  its packs drop.
- The panel line, on the Names tab's foot and on the map: `fires.h` «Οι Εφτά Φωτιές» / "The Seven Fires", `look.rank`
  «Φωτιά {0}/7 · βαθμός {1}» / "Fire {0} of 7 · rank {1}", `fires.d` «+{0}% ζημιά, +{0}% ζωή» / "+{0}% damage, +{0}%
  life".

**You can see it from home.** The six peaks over Whitecliff are `FAR_BEACONS` rows 7-12 (world.js:72-75, the `peak`
rows), drawn by `farFire` (world.js:79) through `setFar` (world.js:1997). Each sprite takes its lookout's rank: one
colour field and a scale of 1 + 0.06 × rank.

| rank | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| colour | the shipped orange, small | orange | amber-gold 0xffc050 | gold 0xffd870 | pale gold 0xffe8a8 | white-gold 0xfff4d8 | white, with a slow breath |

The west-to-east order of the six peaks is the order of the six lookouts. Arna's hill is the town's own beacon: its
flame takes the seventh rank's colour.

**All six on any difficulty** (every `fires[i] > 0`): the Act VII blessing is worth ×1.25 (the `REMEMBERED` constant,
data.js:353), flag `firesAll` for the story, toast `fires.all` «Και οι εφτά καίνε. Η ευλογία της άνοιξης δυναμώνει.» /
"All seven burn. The spring's blessing grows stronger.", and each keeper comes down to Whitecliff with one line (the
story part's). The ×1.25 is read from `hero.fires`, not from the flag, so a co-op guest keeps her own.

**Replay value, honestly.** It asks for six holds of about two minutes on each difficulty the player would play
anyway: 36 in all, each on that difficulty's own seed (`thaw@<diff>`, `tarn@<diff>`), under that difficulty's row
(two clouds and 26% slides on Skotos). It never gates the story. If it reads as a chore in playtest, the ranks collapse
to one (the production proposal's cut 2) and nothing else changes.

**In code.** A `lookHearth` interact and the hold's small state on the zone (world.js); `hero.fires`; one row in
stats.js; a colour field on the far fires; `HAZ7.hold`. **2 days** (of the 3 this part gives to the ladder, echoes
and Rested). Scenario `fires7`: a hold on each lookout; the waves; the rank written for every hero present; the bonus
in `G.stats`; the far fire's colour; the fail and the retry.

### Rested («Ξεκούραστος») — the owner's call

*This is in the design by the lead's decision and is the owner's to keep or strike (`owner-questions-el.md`). It costs
one day and stands alone.*

The story's last idea made the player's habit: close the game, somebody else keeps the light, and she comes back the
better for it.

**The rule.**
1. After `act7`, at level 50: when a hero is taken up, the time since she was last played is read from the record
   (`hero.played`, stamped on every save, save.js:97), before the first save of the session.
2. **Away for an hour or more, she is Rested: one kill for every 4 minutes away, to at most 120 kills** (eight hours:
   a night fills it). What was left from the last time is kept, to the same cap.
3. **While Rested, a kill's Mastery experience counts double**, and the count falls by one (`gainXP`, combat.js:642,
   at the cap's line :644). Nothing else changes: not loot, not gold, not damage.
4. On the first entry to the village with a count: `q.awake` «Ώστε ξύπνησες.» / "So you're awake." and then `q.rested`
   «Ξεκουράστηκες. Διπλή πείρα Μαεστρίας για {0} νίκες.» / "You have rested. Double Mastery experience for {0} kills."
   A chip in the buff row, `hud.rested` «Ξεκούραστος» / "Rested" (`hud.rested.r` «Ξεκούραστη» for the Ranger), with the
   kills left.
5. **No notifications. Nothing is lost by staying away, and nothing by playing on.** There is no streak, no calendar,
   no timer on screen. A week away gives what a night gives.

**What it is worth.** A level-50 kill on Warden is about 150-250 experience; the tenth Mastery level needs 19,644
(docs/progression/README.md). 120 doubled kills are about one extra Mastery level a night at that depth, less further
on: roughly one point for a night's sleep.

**Honest limits.** The clock is the device's. Set forward, it gives the night early; the cap and the size of the prize
make that not worth guarding. Set back, the time away is negative and counts as none. A hero restored from a backup or
merged from the cloud is stamped as played now (save.js:358, :403), so a restore never grants it. **Not verified:**
whether the cloud record carries a server time that could be used in place of the device's (`cloudsync.js` compares
`played`, lines 10-16).

**In code.** `hero.rest` (kills), computed in `startHero` (boot.js:203-215) before `hero.played` is written; two lines
in `gainXP`; the chip; the greeting. A guest's is her own (the reward's `gainXP`, coop.js:1272). **1 day** with the
`rested` scenario (a faked clock: 59 minutes gives none, 8 hours gives 120, a week gives 120, a clock set back gives
none).

### Echoes and post-game

**Echo refights,** as every act's: once a day each by the shipped rule, normal loot, no story consequence, at the
story fight's levels, after `act7`. `ECHO_PROMPT` (world.js:657) gains two rows; the echo handler's tint branch
(story.js:475-490) gains a fourth material, meltwater and mist.

| boss | where | prompt | look | the echo's own terms |
|---|---|---|---|---|
| Kallisto | the den, where she sleeps with the cub | `echo.kallisto` «Ξύπνα την αρκούδα» / "Wake the bear" | pale mist, 0xdfe8ee | she wakes hungry, fights as written and lies down again; the cub stays in the den. The bowl's chutes are armed for the echo whatever the reading |
| Kelados | his shoulder in the slope | `echo.kelados` «Χτύπα τον ώμο του βουνού» / "Strike the mountain's shoulder" | mist, 0xc8d8e0 | he dreams the fight: the lake as it now is, each sluice lever once, his blocks as cover |

Toasts: `echo.rise7` «Το νερό θυμάται τη μάχη...» / "The water remembers the fight..."; `echo.done7` «Η ηχώ σβήνει. Το
νερό θα θυμηθεί ξανά αύριο.» / "The echo fades. The water will remember again tomorrow." (the shipped pair's shape,
text.js:1350-1351). **Ivar's echo teaches his Name** the first time it is beaten after q40. **Not verified:** how "once
a day" is stored; no date code was found in `src/game`, only the visit's record (`it.used`, `it.fought`; wake.js:103,
:141). Act VII's echoes follow whatever the shipped ones do.

**What stays to play at the cap.**
- **Two zones that fight back.** The zones are measured at G2 to cost a capped hero 0.4-0.8 lives a run with a lowest
  life of 35-65% (decisions.md, rule 2), on the hero's own seeds by difficulty, in their after-the-act readings: the
  Race low and clear, the brooks still on their clock, the chutes and the clouds as before.
- **The Seven Fires:** 36 holds, a fire over the village for each.
- **The Names:** Ivar's echo, the Deep rules, a second build after a respec. Old tracks worth buying again.
- **Rested,** if the owner keeps it.
- **Two echoes and two legendaries** that change how a build plays.
- **The Shadow Gates, unchanged** (canon §4 item 18): same generator, packs, Guardian and loot; `gate7` asserts a
  tier's layout and packs equal the shipped ones for a seed. The Names are the hero's and work there as Mastery does;
  there is no lookout in a Gate, so there is no Call. The Gate panel gains nothing.
- **Not in this release:** Vows, the Calls board, the weekly Gate (a patch, after the owner has ruled on the Gates).

### Blessings

`BOONS[7]` (data.js:317-350, after the row at :346). Header `boon.h7` «Η φωτιά που ξυπνά» / "The fire that wakes",
after «Η εστία της Πρώτης» (text.js:1337). All three use stat keys `BOONS` already uses, two stats each, in Act VI's
power band. With all six lookouts held on any difficulty each is worth ×1.25, rounded down as stats.js:29 does; the
`.du` lines show those values.

| id | name | stats | ×1.25 | icon | quote (`.q`) |
|---|---|---|---|---|---|
| `thaw` | «Το Λιώσιμο» / "The Thaw" | `atkSpd` 8, `move` 6: `boon.thaw.d` «+8% ταχύτητα επίθεσης, +6% ταχύτητα κίνησης» / "+8% attack speed, +6% movement speed" | 10 / 7 | 'roll' | «Ό,τι πάγωσε, θυμάται πώς τρέχει.» / "What froze remembers how to run." |
| `den` | «Ο Ύπνος της Αρκούδας» / "The Bear's Sleep" | `lifePct` 12, `regen` 15: `boon.den.d` «+12% ζωή, +15 αναγέννηση ζωής» / "+12% life, +15 life regeneration" | 15 / 18 | 'shield' | «Κοιμήσου. Η άνοιξη ήρθε και χωρίς εσένα.» / "Sleep. Spring came without you too." |
| `sluice` | «Το Νερόθυρο» / "The Water-gate" | `area` 12, `cdr` 8: `boon.sluice.d` «+12% εμβέλεια, +8% μείωση επαναφόρτισης» / "+12% area, +8% cooldown reduction" | 15 / 10 | 'star' | «Το νερό δεν το σταματάς. Του δείχνεις δρόμο.» / "You don't stop water. You show it a road." |

The three are a choice between the act's three verbs: move, rest, direct. The Bear's Sleep is the pick for a Post
build, the Thaw for the Roll and the Weave, the Water-gate for the Far Shot and the Storm-step.

A seventh blessing is already "newer" to v22 without the format bump: `heroFits` refuses a blessing past the ones the
build knows (save.js:235). The wording of the stat lines must follow the shipped `boon.*.d` lines (text.js:1175).

### Legendaries

The two bosses' first-kill drops (`LEGENDARIES` with `drop: false`, data.js:418-443; `LEG_FROM`, data.js:445; the
drop itself at combat.js:564-566). Both work in every act. Each has one plain stat, given the way the shipped
Swiftboots' is (one line in `computeStats`, stats.js:25), since an item's own stats are rolled at random
(items.js:85-86).

| id | name | base | what it does | plain stat | from |
|---|---|---|---|---|---|
| `kallistoClaw` | «Το Νύχι της Καλλιστώς» / "Kallisto's Claw" | gloves, any class | **The bear's charge.** After she has run 8 m without stopping, her next blow lands for +50% and Dazes its target for 1 s (never a boss). Once each 6 s. | +8% attack speed | Kallisto's first fall (`LEG_FROM.kallisto`) |
| `mountainHeart` | «Η Καρδιά του Βουνού» / "The Mountain's Heart" | chest, any class | **Snow and water take no life from her:** a slide or a wash-out still moves her and costs nothing. **And each 8 s, her loud blow on the ground starts a small slide of her own** ahead of it: a lane of 8 m, 0.6 s of warning, 60% of her weapon's damage, and it carries what it hits to the lane's end. | +10% armour | Kelados's first fall (`LEG_FROM.kelados`) |

The lines as the item shows them:
- `leg.kallistoClaw.d` «Αφού τρέξεις 8 μ. χωρίς στάση, το επόμενο χτύπημά σου κάνει +50% ζημιά και ζαλίζει τον εχθρό
  για 1 δευτ. Μία φορά κάθε 6 δευτ. +8% ταχύτητα επίθεσης.» / "After you run 8 m without stopping, your next hit deals
  +50% damage and dazes the foe for 1 s. Once every 6 s. +8% attack speed."
- `leg.mountainHeart.d` «Το χιόνι και το νερό δεν σου παίρνουν ζωή. Κάθε 8 δευτ., το βαρύ σου χτύπημα στο έδαφος
  ρίχνει μπροστά του μια μικρή κατολίσθηση: 60% της ζημιάς του όπλου σου. +10% θωράκιση.» / "Snow and water take no
  life from you. Every 8 s, your heavy blow on the ground throws a small slide ahead of it: 60% of your weapon's
  damage. +10% armour."

Notes.
- **The Claw is not the production proposal's.** Its draft ("after a dodge, the next blow +60%") is now Keyx's Name
  word for word. The Claw takes the bear's own verb, the run. It suits the Roll and the Weave and fights Ivar's Name on
  purpose. Hook: a distance counter in the hero's tick, and the own-blow branch of `damage`.
- **The Heart** extends the Skerry Shell's rule (wash-outs and plunges, combat.js:151) to `o.slide`. "Her loud blow"
  is a skill of the 10 m column of the `LOUD` table. Her own slide is not loud, hurts no hero and is drawn in the
  hero's telegraph colour. It is the only way to carry a pack outside a chute, in any act.
- `legBack` (boot.js:255-262) gains `'kallisto'` and `'kelados'` in its list at :257.
- **Engine cost: 0.75 day** for both with `leg7`.

---

### Co-op

Co-op is host-led (docs/coop/README.md): the world and the story are the host's; each guest's hero, gear, Names, ranks
and rewards are her own. **One protocol bump: `VER` 5 → 6** (coop.js:46). A page on 5 and a page on 6 refuse each
other, as today.

**What a guest can do, and whose word decides.**

| thing | guest | authority | on the wire | shipped precedent |
|---|---|---|---|---|
| the brooks' clock | follows | host | `o.w[0]` as shipped (coop.js:646) | the tide |
| the Race's and the lake's level | follows | host | `o.w[5..6]` (coop.js:650; applied at :1148). **Both lines are gated on `z.act6`: widen to Act VII** | the Mere |
| a weir, a winch, a sluice lever | may turn it | host validates | the 'u' event (coop.js:851-863): `USE_U` (coop.js:1525) gains `weir7`, `winch7`, `lever7`; the thing's `lit` bit is "turned" | the hearthstones, the bells |
| a lookout's hearth | may light it | host validates; the hold is the host's | 'u', `lookHearth` | the same |
| the Call | her own | each page | none (`GUEST_OK`, coop.js:1523, gains `callFire`) | a shrine |
| a chute kicked by a guest's loud skill | asks | host decides (armed, sunlit, in reach) | a new op `'k'` `[x, z, r]` on the 'ic' event (coop.js:834-849), within 28 m of her stand-in, r at most 10, at most 2 a second | the vault's `'v'`, `'vl'`, `'vr'` (coop.js:847-849, all gated on `G.zone?.act6`: **widen**) |
| a chute's armed state and its fall | sees and takes her own hit | host | two bit masks in the snapshot (`o.c7`: armed, falling) and one reliable event when a chute begins its 2.8 s, with the time left | none: **flues are not in the protocol today** (no `flue` in coop.js; each page starts its own at a random phase, forge.js:36) |
| what a slide does to monsters | sees | host only | the puppets' positions and life | every blow |
| the clouds | sees the same ones | host's clock | one number, `o.w[7]`: `z.sunT` in tenths | the tide's clock |
| the Icebound waking | sees | host | actors, as shipped | statues |
| rock shards, Kelados's blocks, slush | sees and is blocked by them | host | `cells6` / `cells6Apply` (tide.js:433-442) on the 'i' topic; a shard carries one more bit, `solid`. **The sender is gated on `z.act6`** (coop.js:571): widen | Act VI's shards and slush |
| the Seven Fires | takes the rank | host announces the hold's end `[i, diff]`; each page writes its own hero's rank | one reliable event | the Lost's flags |
| the story's interacts (the q46 sluice, the cines' triggers, the keepers' talk) | no | host | | every act |
| the receding snow (`setThaw(k)`) | sees | from the host's flags on the world message | `worldOf` (coop.js:596-598) | `presenceAgain` |

`worldOf`'s `a` array (coop.js:598) and the `WORLD` set (coop.js:956) gain `act7`. `fires`, `names` and `rest` are
**not** in `WORLD`: they pass through `viewHero` to the guest's own record, as `mast` and `loadout` do.

**The blow cap and the Names.** `blowCap` (coop.js:776-781) allows 56 × the weapon's top damage a guest claims, within
its level's and Mastery's ceilings, times its claimed critical damage over a plain critical's. The comment above it
says the measured top (a critical Meteor under a War Cry and a shrine) is up to 150 × and sits just under the cap. The
Names multiply single hits: Arna ×1.4, Keyx ×1.6, Asger ×1.3, Ivar ×1.24, Einar ×1.2, Pherousa ×1.18. So:
- a guest's presence look (`lk`, coop.js:492) carries which Names she says and their depths, three bytes (`nm`);
- the host multiplies the cap by the product of **those three Names' ceilings from its own table**, at most
  ×2.92 (Keyx, Arna, Asger), never by a number the guest sends;
- the Call adds nothing to the ceiling: it makes conditions true, it does not raise a multiplier;
- the Claw's +50% is one more factor the host cannot see in the look. `coop.mjs act7` measures a guest's largest honest
  hit with the Claw and three Names under a Call against the cap; if it is refused, the cap's constant gets a ×1.5
  allowance in Act VII's release and the measurement is written beside it.
- The rate limits are unchanged.

**Deeds are not trusted either way.** A guest's `flags` are the host's copy, so a guest never learns a Name from the
host's flags: `learnNames` reads her own record. Ivar's echo beaten in a host's world is credited on the guest's own
record by the kill's reward message, as any kill is.

**Clamps on what the host does to a guest** gain one line: a slide's hit of at most 26% of her life and a push of at
most 6 m, at most one a second.

**Scaling.** `COOP` unchanged (data.js:17-27). A slide and a wash-out are shares of the life of the hero they land on,
so `COOP.dmg` does not multiply them. A hold's packs take `COOP.pack` as any pack. A party of four at a lookout holds
it for all four.

**Roles the systems invite.** The Warden stands in the lane and kicks it; the Ranger draws the pack into the lane with
a Snare and keeps the choughs off from under a cloud; the Mage pins the pack for the fall, thaws the Icebound when the
party is ready and re-freezes the one that woke early. Anyone turns the wheel while the others hold the bank.

**Budget.** Nothing new is sent per frame. A host snapshot grows by about 5 bytes (the two masks, the clouds' clock), a
guest's presence by 3. `coop.mjs act7` on `NET=supa ... four` re-measures against the 100 events a second during a
slide soak, with two chutes falling and a hold running.

**Scenarios.** `coop.mjs act7`: a guest turns a weir, pulls a lever, lights a lookout, kicks a chute through the host;
her Call is her own; the rank is written on both pages' heroes; her blow with three Names passes the cap and the same
blow ×3 is refused; a VER 5 page and a VER 6 page refuse each other. **Engine cost: 2-2.5 days.**

### Saves

**New hero fields.**
| field | default | written by |
|---|---|---|
| `act7` | −1 | `newHero` (state.js:29); the story's end |
| `fires` | `[0, 0, 0, 0, 0, 0, 0]` | a hold's end |
| `names` | `{ learnt: [], said: [null, null, null], deep: [], slots: 1, free: 0 }` | names.js |
| `rest` | 0 | `startHero`, `gainXP` |
| `boons[6]` | none | the act's blessing |
| flags | the story's chain; `look1..6`, `firesAll`; `ivarEcho7`; `legFrom_kallisto`, `legFrom_kelados` | |
| waypoints | `thaw`, `tarn` | |

**The migration,** in `startHero` beside the shipped ones (boot.js:203-215): `hero.act7 ??= -1`; `if (hero.act7 >= 0)
hero.flags.act7 = true`; `hero.fires ??= [...]` with each rank clamped to 0-6; `hero.rest ??= 0`. In `migrateHero`
(progression.js:112-125): `h.names ||= {...}`, unknown ids dropped, `said` cut to `slots`. `learnNames(h)` after both.
`migrateHero` already sets the points right "if the books disagree" (progression.js:123-124), and `pointsSpent` now
counts the Names, so the books agree.

**Order matters in two places.** Rested is computed before `hero.played` is stamped. And a hero's Names are learnt
from her own flags before `refreshStats`.

**`heroFits`** (save.js:223-239) needs no new rule: it already refuses a legendary or a blessing the build does not
know (:235, :239), and the two tables simply grow. `fires`, `names` and `rest` are cleaned, never a reason to refuse.

**`SAVE_FMT` 2, in stage E's last commit, and only there** (data.js:63; decisions.md rule 7).
- The rule written beside the constant: no public build may write 2 before a public build refuses it. v22 carries the
  refusal (save.js:231). So Act VII's release is the first that may write 2.
- **Why take it.** A v22 tab that met an Act VII hero through the cloud would clamp her quest (story.js:35), would not
  know her Names, and would **give her the Names' points back**: its `pointsSpent` does not count them and its
  `migrateHero` resets `points` to earned less spent. Written back, she would keep the slots and the points. With 2 the
  old tab refuses her cleanly ("newer") and the cloud's sync neither takes nor overwrites her (cloudsync.js:192-198).
- **How.** Stages A-D build with `SAVE_FMT` 1 so no test build can strand the owner's own heroes. The constant changes
  in stage E's last commit. The comment at data.js:59-62 ("2 once Act VI's fields ship") is corrected in the same
  commit: Act VI shipped at 1.
- **`save16`** runs both ways: a v22 hero at quest 39 loads, gains `act7: -1`, `fires`, `names` and `rest`, keeps her
  points to the unit, and keeps `fmt` 1 until the switch; with the switch she is written as 2; a build that reads 1
  refuses her as 'newer' and leaves the stored record byte for byte; a hero with three Deep Names respecs and has
  exactly `pointsEarned` points.
- **Residual risk:** a browser still holding a build older than v22 has no check. It was the same on 17 November.

**Engine cost: 0.75 day.**

---

## Music

**Four new procedural `THEMES` in audio.js and one variant** (audio.js:2342, in the house style: modal harmony, drones,
no samples, no files), about 16 sounds, and two motifs that need no new notes. audio.js plays one `THEMES` entry at a
time (act6-design, Music), so every quotation below is written into the new theme's own score.

**The mood: the first daylight act.** Six acts were minor, slow and low. This one is in bright modes (Lydian,
Mixolydian), with plucked and struck sounds in place of bowed drones, more air between the notes, and water as its
pulse. It must still sound like the same game: the lantern motif (`MOTIF`, audio.js:2231) is quoted once, in major, in
the first zone's theme. **No voices and no chant anywhere** (judge 1 §5.2).

**The water figure.** A running arpeggio in six, three notes up and three down. Its speed follows the water: a new
mood key, `race` (0-1, set from the Race's or the lake's level through `Audio.mood`, audio.js:3374; `MOOD`,
audio.js:2219), takes it from sixteenths at 1.2 m to quarter notes at 0.3 m. The player hears the river go down.

**The rest motif.** Act VI's hearth motif rises (G, B♭, D). Played falling (D, B♭, G) it is a thing lying down. It
sounds, on a soft horn, when Kallisto sits, when Kelados is given the word, and under the hero's own sleep. Rising
again with the major third (G, B, D) it is a hearth catching: every lookout lit plays it once.

| theme | where | idea |
|---|---|---|
| `thaw` | zone 1, «Τα Λιόνερα» | 6/8 at 104 bpm, G Lydian. Plucked strings and a hand drum over the water figure; a wooden flute answers every eight bars. In a fight the drum doubles and a low string ostinato enters on the root. When a weir opens, the figure slows by a step and the lantern motif sounds once, in major. No drone |
| `kallisto` | boss 1 | 4/4 at 132 bpm, E Dorian. Hand drums and one low horn; no melody but the horn's two notes. The drums drop out while she is dazed, so the opening the player made is heard. Phase 2 adds the water figure, fast. On her sitting down: the drums stop on the beat and the rest motif plays alone |
| `tarn` | zone 2, «Η Κρεμαστή Λίμνη» | 60 bpm, no beat, A Lydian. High, sparse and glassy: single struck notes with long tails over wind. Under a cloud a low-pass closes on the whole theme (a new mood key, `shade`) and opens when the sun returns. A slide's warning is answered by one low drum |
| `kelados` | boss 2 | 5/4 at 66 bpm, C Mixolydian. Slow and heavy: a stone struck on the first beat of each bar, low brass in fifths, a sub rumble on every tremor (`MOOD.sub`'s channel). Each plate of ice that falls takes one layer away, so the music thins as he wakes. Phase 3 brings the water figure in under it as the lake falls. At «Ξεκουράσου.» everything stops but the rest motif |
| `thawGreen` (variant) | both zones after the act | the `thaw` theme at 88 bpm with the water figure at rest (`race` 0) and the flute carrying the tune; `tarn` after the act plays it a fifth higher over its own wind |

**The ending.** No fanfare and no 'victory' theme. The lake's letting-down plays `thawGreen`'s first phrase. At home the
rest motif falls once under the child's good night; the four seconds of black are **silence**; on «Ώστε ξύπνησες.» one
plucked note of the lantern motif, and the town's theme resumes. The story part owns the scene; this is what it should
ask audio for.

**The Call:** a horn's open fifth, answered a second later, far off and quieter, once for each Name she says (one to
three answers). **A Name learnt:** one soft bell.

**Sounds (16):** `weirWheel`, `raceStep` (the river dropping a step), `brookRoar` (the 6 s warning: it replaces
`iceGroan` at tide.js:142 for this act), `corniceCrack`, `slideRoar`, `snowThump`, `iceBlockSplit`, `iceWake`,
`choughCall`, `cubCry`, `tremor`, `sluiceGate`, `winchChain`, `lakeOut`, `hearthCatch`, `callHorn`. Reused: `bearRoar`
(combat.js:27), the hearth crackle, `splash`, `washOut`, `shrine`.

**A trap.** The FX ambient key `'thaw'` is **taken**: Act VI's Bottom plays it once her fire is lit (world.js:1808;
fx.js:522, :622, :677). `ZONES.thaw.ambient` cannot be `'thaw'` as the production proposal writes it. Use `'melt'`
(and `'summit'` for `tarn`). The audio theme key `thaw` is free (no `thaw` in audio.js).

**Engine cost: 2-2.5 days.**

---

## New text keys this part introduces

Greek first, then English. The names of the seven are shipped keys and are not counted. The story's lines, the
zones', the monsters' and the quest lines belong to the other parts.

| # | key | Greek | English |
|---|---|---|---|
| 1 | `q.brook` | «Τα ρυάκια φουσκώνουν!» | "The brooks are rising!" |
| 2 | `hint.race` | «Το ρέμα δεν πέφτει μόνο του. Γύρνα τον τροχό.» | "The Race does not fall by itself. Turn the wheel." |
| 3 | `q.raceDown` | «Το Ρέμα έπεσε ένα σκαλί ({0}/3)» | "The Race is down a step ({0}/3)" |
| 4 | `hud.race` | «Ρέμα» | "Race" |
| 5 | `hint.slide` | «Άσπρη λουρίδα με χιόνι που κρέμεται: μη στέκεσαι μέσα. Ό,τι βροντά, το ρίχνει.» | "A white lane with snow hanging over it: don't stand in it. Anything loud brings it down." |
| 6 | `hint.slide2` | «Πίσω από βράχο ή χοντρό κορμό, το χιόνι σε προσπερνά.» | "Behind a rock or a thick trunk, the snow goes round you." |
| 7 | `q.slide` | «Κατολίσθηση!» | "Slide!" |
| 8 | `hud.swept` | «Παρασύρθηκε» | "Swept down" |
| 9 | `hint.sun` | «Ο πάγος κοιμάται στον ίσκιο και ξυπνά στον ήλιο.» | "Ice sleeps in shade and wakes in sun." |
| 10 | `hint.shade` | «Κάτω από σύννεφο ή δέντρο, οι καλιακούδες σ' αφήνουν.» | "Under a cloud or a tree, the choughs leave you be." |
| 11 | `ice.melt` | «Λιώσε τον πάγο» | "Melt the ice" |
| 12 | `prog.tab.names` | «Ονόματα» | "Names" |
| 13 | `name7.h` | «Τρία ονόματα τη φορά» | "Three names at a time" |
| 14 | `name7.sub` | «Κάθε όνομα που λες είναι ένας τρόπος να πολεμάς.» | "Each name you say is a way of fighting." |
| 15 | `name7.say` | «Πες το» | "Say it" |
| 16 | `name7.unsay` | «Σώπασέ το» | "Leave it unsaid" |
| 17 | `name7.deepen` | «Βάθυνέ το ({0} πόντοι)» | "Deepen it ({0} points)" |
| 18 | `name7.slot` | «Άνοιξε θέση ({0} πόντοι)» | "Open a slot ({0} points)" |
| 19 | `name7.kept` | «Φυλαγμένο» | "Kept" |
| 20 | `name7.deep` | «Βαθύ» | "Deep" |
| 21 | `name7.town` | «Τα ονόματα αλλάζουν μόνο στο χωριό» | "Names are changed only in the village" |
| 22 | `name7.locked` | «Δεν ξέρεις ακόμα αυτό το όνομα.» | "You do not know this name yet." |
| 23 | `name7.given` | «Τρία ονόματα τα ξέρεις από πάντα: Άρνας, Ίσαρν, Φέρουσα.» | "Three names you have always known: Arna, Isarn, Pherousa." |
| 24 | `name7.learnt` | «Έμαθες ένα όνομα: {0}» | "You have learnt a name: {0}" |
| 25 | `name7.free` | «Η Χάλντα τρόχισε ό,τι ήξερες: ένα ξέχασμα χωρίς χρυσάφι.» | "Halda has put a new edge on what you knew: one unlearning, no gold." |
| 26-32 | `name7.<id>.d` × 7 | the Kept lines, in the Names' table | |
| 33-39 | `name7.<id>.d2` × 7 | the Deep lines, in the Names' table | |
| 40-43 | `name7.<id>.how` × 4 | the deeds (Einar, Keyx, Asger, Ivar), under "The panel" | |
| 44 | `call.prompt` | «Φώναξε τα ονόματα» | "Call the names" |
| 45 | `call.on` | «Τα ονόματά σου ακούγονται ως τις κορυφές» | "Your names carry to the peaks" |
| 46 | `hud.call` | «Φώναγμα» | "The Call" |
| 47 | `call.none` | «Δεν λες ακόμα κανένα όνομα. Η φωνή σου φτάνει κι έτσι.» | "You say no name yet. Your voice carries all the same." |
| 48 | `call.spent` | «Η φωτιά άκουσε ήδη τα ονόματά σου.» | "This fire has already heard your names." |
| 49 | `call.again` | «Η φωτιά φουντώνει ξανά: φώναξε!» | "The fire flares again: call!" |
| 50 | `look.light` | «Άναψε τη βίγλα» | "Light the lookout" |
| 51 | `look.hold` | «Κράτα τη βίγλα: {0}» | "Hold the lookout: {0}" |
| 52 | `look.held` | «Η βίγλα κρατήθηκε ({0})» | "The lookout is held ({0})" |
| 53 | `look.lost` | «Η φωτιά έσβησε. Ξαναδοκίμασε.» | "The fire is out. Try again." |
| 54 | `look.rank` | «Φωτιά {0}/7 · βαθμός {1}» | "Fire {0} of 7 · rank {1}" |
| 55 | `fires.h` | «Οι Εφτά Φωτιές» | "The Seven Fires" |
| 56 | `fires.d` | «+{0}% ζημιά, +{0}% ζωή» | "+{0}% damage, +{0}% life" |
| 57 | `fires.arna` | «Ο λόφος του Άρνα καίει όσο η πιο αδύναμη από τις έξι.» | "Arna's hill burns as bright as the weakest of the six." |
| 58 | `fires.all` | «Και οι εφτά καίνε. Η ευλογία της άνοιξης δυναμώνει.» | "All seven burn. The spring's blessing grows stronger." |
| 59 | `q.awake` | «Ώστε ξύπνησες.» | "So you're awake." |
| 60 | `q.rested` | «Ξεκουράστηκες. Διπλή πείρα Μαεστρίας για {0} νίκες.» | "You have rested. Double Mastery experience for {0} kills." |
| 61 | `hud.rested` | «Ξεκούραστος» | "Rested" |
| 62 | `hud.rested.r` | «Ξεκούραστη» | "Rested" |
| 63 | `echo.kallisto` | «Ξύπνα την αρκούδα» | "Wake the bear" |
| 64 | `echo.kelados` | «Χτύπα τον ώμο του βουνού» | "Strike the mountain's shoulder" |
| 65 | `echo.rise7` | «Το νερό θυμάται τη μάχη...» | "The water remembers the fight..." |
| 66 | `echo.done7` | «Η ηχώ σβήνει. Το νερό θα θυμηθεί ξανά αύριο.» | "The echo fades. The water will remember again tomorrow." |
| 67 | `boon.h7` | «Η φωτιά που ξυπνά» | "The fire that wakes" |
| 68-71 | `boon.thaw`, `.d`, `.du`, `.q` | under Blessings (`.du`: «+10% ταχύτητα επίθεσης, +7% ταχύτητα κίνησης» / "+10% attack speed, +7% movement speed") | |
| 72-75 | `boon.den`, `.d`, `.du`, `.q` | under Blessings (`.du`: «+15% ζωή, +18 αναγέννηση ζωής» / "+15% life, +18 life regeneration") | |
| 76-79 | `boon.sluice`, `.d`, `.du`, `.q` | under Blessings (`.du`: «+15% εμβέλεια, +10% μείωση επαναφόρτισης» / "+15% area, +10% cooldown reduction") | |
| 80-81 | `leg.kallistoClaw`, `.d` | under Legendaries | |
| 82-83 | `leg.mountainHeart`, `.d` | under Legendaries | |

**Count: 83 keys, 166 strings.** Of them 32 are the Names' panel and rules, 6 the Call, 9 the Seven Fires, 4 Rested
(struck if the owner strikes it), 11 the mechanics, 4 the echoes, 13 the blessings, 4 the legendaries.

Two readers on every line. Three to check against the shipped vocabulary before stage D: the word for Revealed in
`name7.einar.d2`; "πόρος" for the resource in `name7.asger.d2` (the shipped lines name Fury, Energy and Mana by
`res.*`); the stat names in the blessings' lines.

---

## Engine items this part requires

| # | item | files | days |
|---|---|---|---|
| E1 | The traps, done first (part of the plumbing item): `forge.js:63` scoped to the Forge; `tide.js` `haz()` and `actHaz` given `HAZ7`, the warning's sound from the row; the `z.act6` gates at coop.js:571, :650, :846-849, :1148 widened; one `groundBlow()` helper under the 13 ground-blow sites; `mereTo` exported as `raceTo` | forge, tide, data, coop, skills, skillsx, ai | 0.75 |
| E2 | The Race | tide, world, data | 1 |
| E3 | The Slide: armed chutes, the kind's look table, the snow branch of `burn`, the `LOUD` table and `'loud'`, solid shards (`low = false`), the tongue, the host's event | forge, data, skills, skillsx, ai, sap | 2-2.5 |
| E4 | Sun and Shade: the four 'sun' branches, shade pools and their disc, `tickClouds`, the wake tests, `shadeShy` | light, ai, world | 2-2.5 |
| E5 | The Names: names.js, seven hooks, progression.js, the panel tab, the Call and its hearth, the blow cap's table, the `names` scenario, run D and its seven bot play styles | names, combat, skills, player, progression, progpanel, world, coop, tools | 5-6 |
| E6 | The Seven Fires (2), the echoes (0.25), Rested (1; the owner's call) | world, story, stats, data, boot, combat, hud | 3-3.25 |
| E7 | The two legendaries and the three blessings | data, stats, combat, player, forge, boot | 0.75 |
| E8 | Co-op, protocol 6 | net, tools/coop.mjs | 2-2.5 |
| E9 | Saves, `SAVE_FMT` 2 in the last commit, `save16` both ways | boot, progression, data, save | 0.75 |
| E10 | Audio: four themes, one variant, two mood keys, 16 sounds | audio | 2-2.5 |
| | **This part's total** | | **19.25-22.5** |

Judge 2's rows 7-9, 13, 14 and 16-18 sum to 17.75-20.25 days; the difference is E1 (a share of its plumbing row) and
E7 (which its table carries under the bosses). The cuts that touch this part, in the order to take them: Deep Names at launch (Kept only: 1.5 d); the fires' ranks by
difficulty to one rank (1 d); Rested (1 d); moving clouds to a whole-zone cloud (0.75 d); one theme (0.5 d).

---

## Notes for the lead

**1. Conflicts with `decisions.md`, and how this part resolved them.**
- **None on the slots.** Three places need a word:
- **"The Call ... made at a lookout hearth"** and judge 2's "each boss arena has one": the decision's table names only
  the lookouts. This part gives each arena a hearth of its own that flares once on the fight's beat, as judge 2 §4
  wrote, because without it the Call never meets a boss. If the lead reads the decision strictly, rule 5-6 of the Call
  is struck and nothing else moves.
- **The Greek for "the Call".** «Κάλεσμα» is taken twice in the shipped game: it is the Rallying Cry variant's name
  (`var.cry.rally`, text.js:86) and Act VI's world-state word. This part uses **«Το Φώναγμα»**. The owner may prefer
  another plain word; nothing else depends on it.
- **The legendary `kallistoClaw`** as the production proposal drafted it is the same rule as Keyx's Name. It is
  rewritten here (the run, not the dodge). The id and the name stand.
- **The mechanic's Greek name.** The production proposal's heading says «Η Χιονοστιβάδα»; decisions.md says «Η
  Κατολίσθηση». This part follows the decision. A Greek ear hears «κατολίσθηση» as a landslide of earth; for snow the
  everyday word is «χιονοστιβάδα». One for the owner's question list.
- **A slide on the hero is a pure share** (the Breath's and the wash-out's shipped shape), not "before armour". The
  boss law's "share before armour" is for blows; a hazard that armour shrinks stops pricing the terrain at the cap.

**2. What this part needs from the other three.**

*From the story part:*
- the q40 beat that gives the three Names and the free respec (one line of Halda's suits `name7.free`), and where the
  tab's first hint shows;
- one line for each of the six keepers when they come down, and Halda's fail-safe call for the hearth's flare at each
  boss;
- whether the Rested greeting may be «Ώστε ξύπνησες.» by itself (`q.awake`): the shipped `d.isarn.1` is longer
  («Ώστε ξύπνησες. Καλά. Δεν μας μένουν πολλά βράδια για αναμονή.», text.js:316), so the act's last line and this
  greeting both need a short key of their own, and they should be the same key;
- the ending's audio cues as written under Music.

*From the zones, enemies and bosses part:*
- `L.spots.lookouts[6]` with a hearth, a keeper's rock and an approach each, matching the table of what each hold
  asks; `L.spots.callHearth` in both arenas; none in a lane, all 3 m from another interact;
- every chute with `horn`, `cover` and at least one solid cover within 4 m of every trail cell it crosses; **no
  chute's lane touching a pocket 2 cell**; the first chute on the trail armed over a pack;
- `L.shade` and the trees that count as shade; the cloud lines' seeds and a gap of 20 s or more between clouds at
  every pack spot;
- the three fords' beds so that they open at 0.9, 0.6 and 0.3; Kallisto's stream as pocket 1 under `T.force`;
- each enemy's loud move id for the `LOUD` table, and the bosses' rows for a slide (the share of their life, the Daze);
- the bosses' rows of `HAZ7`; the echo terms above confirmed against the after-the-act readings (are the bowl's chutes
  drawn in the `green` reading?);
- the mapping of the six lookouts to the six peak sprites, west to east.

*From the production part:*
- the plumbing item to include E1, before any mechanic is built;
- `ZONES.thaw.ambient` renamed (the trap under Music);
- `fixtures7.mjs` to build its saves from a v22 hero with `crownUnmade`, `remembered`, `landing6` and `asgerRest`
  set, so that the soaks and the `names` scenario run on the hero the act will really meet;
- `balance-act.mjs`: the seven play styles, `job.names`, and the bot's two lessons this part adds (a white lane is
  harm; kick a chute when three or more foes stand in its lane and she does not);
- the 'day' telegraph's white variant for the lane and the cloud disc's colour at the stage-0 look gate.

**3. Engine items with days:** the table above (19.25-22.5 days for this part).

**4. Checked in the source (file:line), all as cited above.**
tide.js 17-21, 40, 51-60, 88-95, 126-131, 142, 150-151, 168-182, 275-291, 329-330, 340, 353, 396-412, 433-442,
470, 474, 482 · forge.js 27-28, 33-41, 36, 54-58, 60-90, 63, 76, 78, 92-98, 93, 102, 109-124, 152, 173, 230, 248,
262-279 · map.js 22-26, 40, 43 · light.js 41-45, 48, 58-74, 86, 109, 138, 140, 244, 325, 462-467, 553, 575, 623 ·
combat.js 27, 35-45, 64-72, 122-126, 143-168, 146, 151, 304, 489, 547, 564-566, 642-656, 658 · skills.js 163, 171-190,
182, 189, 263, 293, 327, 367, 443, 451-462, 489-493 · skillsx.js 187, 284, 369, 385, 423, 443, 465, 521, 695, 758, 791
· data.js 4-11, 17-27, 32, 34, 52, 59-63, 68, 75-107, 100, 116, 317-353, 371-373, 418-448 · progression.js 9-25, 41-50,
100-106, 112-125 · stats.js 10, 18, 25, 29, 35 · coop.js 46, 492, 571, 596-598, 646-651, 776-781, 834-849, 851-863,
956-972, 1148, 1272, 1523, 1525 · story.js 102, 252-262, 475-490, 1385, 2303, 2632 · world.js 44-64, 72-79, 192-201,
438, 493, 503, 657, 876, 977, 1034, 1150, 1681, 1808, 1997 · save.js 97, 223-239, 358, 403 · boot.js 192, 203-215,
255-262 · state.js 29 · cold.js 33-35 · ai.js 81, 1885, 4962 · sap.js 88 · progpanel.js 12, 16-24, 104 · hud.js 167,
474 · audio.js 2219, 2231, 2342, 3374 · fx.js 522, 622, 677 · text.js 86, 316, 520-521, 765, 1175, 1337, 1350-1351,
1381 · cloudsync.js 10-16, 192-198.

**5. Not verified.**
- `story.js:974 / :986` (where `crownUnmade` is set): taken from judge 2, not opened.
- `story.js:35` (the quest clamp): taken from the production proposal, not opened.
- `addSapPool`'s arguments (sap.js:88) and whether a slush pool slows a hero in a zone that is not a cold one.
- How far the Breath's `kx, kz` push carries (forge.js:115): "about 4 m" is a target for stage B.
- Whether a kill with no source pays experience and drops (the slide's foes; forge.js:122 passes `null` today). If it
  does not, the slide credits the hero who kicked it, and a foe's own kick credits the nearest hero.
- How "once a day" is stored for echoes (no date code found in `src/game`).
- The shipped key for Asger's name; the shipped Greek for Revealed and for a boss.
- Whether the presence look (`lk`) shows a guest's legendaries (for the Claw's allowance in the blow cap).
- Whether the cloud record carries a server time (Rested).
- `ai.js:81`'s statue tick was located, not read through: the sun test's exact place is stage B's.
- audio.js's "one theme at a time" is taken from act6-design's Music section, not re-read in the file.
- None of the numbers has met the bot. Every one is a starting value.

**6. Found on the way.**
- **The FX ambient key `'thaw'` is taken** (world.js:1808; fx.js:522, 622, 677). A zone whose ambient is `'thaw'` would
  play Act VI's lit-Bottom ambient.
- **light.js already exports `NAMES`** (light.js:244) and co-op sends it as `o.n`. The new module must use other names.
- **`slushAt` changes only tidal cells** (tide.js:396-412). The production proposal's "a slide's tongue lies as slush"
  does nothing on dry ground through that call; it needs sap.js's pools there.
- **The blow cap is 56 ×, not 14 ×** as the systems proposal says (coop.js:776-781), and the measured honest top is
  already close under it. The Names' table is needed, not optional.
- **A v22 build would refund the Names' points** to a hero written at format 1 (its `migrateHero` resets `points`).
  This is a second, concrete reason for `SAVE_FMT` 2, beside the one in the production proposal.
- **`vaultOn()` has 16 uses, 13 of them ground blows.** The helper goes under the 13; the other three (skillsx.js:695,
  758, 791) are light and slush hooks and stay as they are.
