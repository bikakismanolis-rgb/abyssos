# Act VII: judge 1 (story ×1.5, fun of play ×1.5, feasibility on a phone ×1, fit with the game and canon ×1)

17 November 2026. Read in full: `brief.md`, the three proposals, canon §0, §2, §4, §5, the top of `act6-design.md` with its
Story and ending, `balance-report.md`, the engine brief's facts and checklist. Every shipped key a proposal leans on was
looked up in `src/i18n/text.js`; all of them exist and say what the proposals quote. Source spot-checks: `tide.js`,
`forge.js`, `light.js`, `cold.js`, `ai.js`, `creatures.js`, `story.js`, `progression.js`, `combat.js`, `world/atmos.js`,
`gfx.js`. No code was changed.

Short names below: **Story** = "The Unsleeping", **Production** = "The Seven Peaks", **Systems** = "The Twelve Nights".

---

## 1. Scores, ranking, base

| | story ×1.5 | fun ×1.5 | feasibility ×1 | fit ×1 | **weighted total (of 50)** |
|---|---|---|---|---|---|
| **Story: The Unsleeping** | 9 → 13.5 | 7 → 10.5 | 5 | 7 | **36.0** |
| **Production: The Seven Peaks** | 5.5 → 8.25 | 6.5 → 9.75 | 8.5 | 7 | **33.5** |
| **Systems: The Twelve Nights** | 6.5 → 9.75 | 8 → 12.0 | 5.5 | 5 | **32.25** |

**Ranking: Story, Production, Systems.**

### Why each score

**Story proposal**
- **Story 9.** The only one of the three with an antagonist and an ending. It pays the game's oldest debts with shipped
  lines: intro.5 «Η δική σου φωτιά είναι η τελευταία» becomes the thought that made the Order's cage (§2.3 blow 1);
  the hero finally does what d.staff, d.selna.rest and d.first.7 told them (§2.4, q.46); the last line is the game's first,
  d.isarn.1 (§2.4). Ragna "is the hero in forty years" (§2.2) and the act answers her without proving her wrong («Τότε θα
  μας βρει ξεκούραστους»). One point off for the season and sky slips (section 2 below) and for leaning on about 240
  lines to land it.
- **Fun 7.** "What has burned will not burn twice" (§6.1 rule 3) is the best single rule in the three documents, and the
  enemies teach it (Cinderling starves on black, Yoke-ox stalls on black, §4). Aithon's arena gets safer as he burns it
  (§5), so the fight cannot drag. Against that: the regular enemies deal ordinary blows, so lesson 3 (zones worth
  fighting at the cap) rests on fronts that "do no damage to a hero who reads the gust" (§9.1b point 3); the Smoke meter
  (§6.1 rule 5) is a fourth meter after three acts of meters; Ragna's phase 3 is "wait" (§5); and the cap answer, Rested
  (§6.3b), gives more points and no new place to put them.
- **Feasibility 5.** The Burn is priced at 4-5 days as "a mode of tide.js" that the author did not read (§6.1 Engine).
  I read it: tide.js is 513 lines built round one water level over `L.bed`, the sea shader's uniforms and a BFS lane; a
  list of fronts walking over fuel shares the lane idea and little else. It is a new module, with per-cell flame quads,
  a char vertex attribute, a co-op cell sync and a soak. The bull is "not scouted; I cannot name a file" (§5 ASSET), and
  Act VI's two gated downloads were never built. Sleeping remains on people rigs, the 7-beat bar, the look gates and every
  memory figure are marked unverified (§9.3). The cost table has no Stage 0 row and no Release row (§9.1).
- **Fit 7.** Canon-dense and careful (§1.1, §2.3 "Nothing is retconned"). Lesson 5 is met in zone 1 (gold, black, red,
  blue sky). Lessons 1, 2 and 4 are answered (§9.1b). Marked down for the wildfire, for a church register a Greek ear
  will hear at once (section 5), for the closeness to the pattern canon §4 warns about, and because zone 2 is a dark
  house on Act I's crypt kit for most of its play (§3.3).

**Production proposal**
- **Story 5.5.** Honest about it: "no antagonist: no one" (§2.2), and its own critic pass calls it "a nature walk"
  (§10.5 point 1). Halda leaving her forge and «Το νερό δεν το σταματάς. Του δείχνεις δρόμο.» (§2.4) are good. The stake
  (a lake over Whitecliff) is never on screen. It turns Act VI's victory into a flood and spends «Ξεκουράσου» on a giant
  the player met ten minutes earlier (§2.4, d.kel.rest2).
- **Fun 6.5.** The Slide as a weapon you kick loose on purpose (§5.2) and weirs that lower a whole river (§5.1) are good
  toys; the minute-by-minute table (§3.3) is the best teaching plan of the three. Sun and Shade is thin by its own
  admission (§10.5 point 3). Kallisto is the White Hart's charge with a bear on it (§4.4 reuses HART). The Seven Fires
  (§8.1) is +0.5% a rank for repeating a 75-second hold on six difficulties: percentages again, and nowhere for points.
- **Feasibility 8.5.** The most checked document. Its claims hold in the tree: `bear.glb`, `golem.glb`, `worm.glb`,
  `skua.glb` are shipped; `HART` is at ai.js:2235; the own-level channel is tide.js:168-183; the sun's offset is fixed at
  gfx.js:96 and :321; the Weeping Woods' bright-sun-over-dark-haze fallback is atmos.js:14. It designs for zero downloads
  (§0 fact 1) and gates daylight on shipped zones before any Act VII code (§7.1). Not a 10 because daylight is still
  unproven and gen7 carries two readings × four water levels × two zones.
- **Fit 7.** Fits the frame exactly and breaks no hard canon I could find beyond one Halda line (section 2). But zone 2
  is snow, ice and Act V's `rime` pack again (§3.2): daylight, yes, and still white-blue. Lesson 5 is half met.

**Systems proposal**
- **Story 6.5.** Lean, with the best folk idea of the three: the game's goblins have been «Καλικάντζαροι» since Act I
  (mon.goblin), and the twelve nights take the word at its word (§1 Premise). The Chief's death («...κάτω... έχει φως
  τώρα... πού να πάμε...») and "leave them one dark hole" (§1 Ending) are real writing. But it has no arc for the hero,
  and Oreithyia is three ledger lines.
- **Fun 8.** The only proposal that answers the cap question properly: the Names (§5.2) are rules about how you fight,
  bought with the same points. Heavy blows as a share of life (§2.4), class tables by range band (§4.1, §4.2), run C as a
  test for hidden locks (§8.4). Marked down because the wind has seven separate effects (§2.1 rule 3), pushes the hero
  under the thumb, and changes shot range by ±30% under auto-aim; and because Gremos has six moves and a target of 11-16
  blows landed (§4.2), which is drifting back toward Act VI.
- **Feasibility 5.5.** 62-75 days by its own count (§10.1), 49-59 only after cutting most of the post-game. Twelve Names
  are twelve balance cells and 576 runs (§8.4 run D). Memory is "not measured" (§10.1). Rendering risk is low only
  because it draws Act V again.
- **Fit 5.** Lesson 5 is binding and this fails it outright: «Night, storm: the shipped blizzard ambient», no new ground
  pack, the `rime` pack, cold.js (§9.2, Scope). It is a third blue act. It also breaks the standing rule that telegraphs
  never change with difficulty (§2.4, owner question 3) and stretches canon in four places (section 2).

### The base, in five lines
1. **Take Story as the base.** With story and fun weighted 1.5 it wins by 2.5 points, and it is the only proposal that is
   an act of this game and not an interlude: an opponent, a turn, and an ending that closes seven acts.
2. Its look is the clearest break from ice and dark that the engine can draw, and its plain (αλώνια, καλαμιές, στάνη,
   στέρνα, πλάτανος) is the first place in the game that looks like Greece.
3. Its two weakest things are exactly what the other two do best: Production's zero-download posture, gates and test
   rules; Systems' Names, heavy-blow rule and balance plan. Both graft cleanly.
4. The spines of the other two cannot be grafted onto each other or onto this one; the mechanics and the plans can.
5. **The base is conditional:** the wildfire must be changed as section 5 says, and the cost is 58-70 days with the
   grafts, not 47-58. If the owner refuses fire in the open altogether, the named alternative is in section 4.

---

## 2. Each proposal: best ideas, weakest points, canon conflicts, estimates

### 2.1 Story: The Unsleeping

**Five best ideas (all kept; this is the base)**
| # | idea | where |
|---|---|---|
| 1 | intro.5 as the Order's founding thought, and d.isarn.1 as the act's last line | §2.3, §2.4: the spine |
| 2 | "The black is safe": burnt ground cannot burn twice; the hero's own fire that goes out by itself | §6.1 rules 3-4: mechanic 1, both zone 1 and Aithon |
| 3 | Nobody the hero beats dies; the fallen sleep; the Waker rings them up | §2.2, §6.3a: mechanic 3. Also the kindest thing here for a store age rating |
| 4 | Ragna and her answer; Ember Memory 5 mirroring d.lamp.m5.1-3 ("Isarn's promise was broken and Ragna's was kept, and the kept one is worse") | §2.2, §2.3 blow 3 |
| 5 | The Seven Good Nights: the optional find is also the after-state of every living character, on shipped waypoints with no asset | §7: the optional collectible |

**Five weakest points**
1. **The wildfire as written** (§2.1, §2.6 hook, §9.3). Section 5.
2. **The cap answer is not one.** Rested (§6.3b) doubles Mastery experience; the complaint is that the points have
   nowhere to go. "The Lamplight track's second use" is one number.
3. **Zones at the cap.** No regular enemy has a blow that matters (§4 data: dmg 0.6-1.9 on the ordinary curve). The
   balance report shows a capped hero heals that back. The target of 0.4-0.8 lives a run (§9.1b) has nothing behind it.
4. **Half the act is a dark interior on Act I's crypt kit, and the final boss is a woman the hero's size.** §3.3, §5
   Ragna. The owner asks for graphics; the finale's picture is a `healer` body with a stoop and a staff.
5. **Ragna's fairness and pace.** The Waker walks a gallery ring at r 13-15 (§5 arena): a Ranger or a Mage shoots him
   from where they stand, a Warden must leave the boss and run. Phase 3's instruction is "do less".

**Canon conflicts (key by key)**
| # | proposal line | shipped line | the conflict | fix |
|---|---|---|---|---|
| 1 | d.morn.2 «ο ουρανός... είναι γαλάζιος. Κανείς στο χωριό δεν θυμάται τέτοιο πρωί» | d.halda.stars, d.forge.cold, d.alk.b2 | The smoke has been gone and the stars visible since quest 23. Two acts of clear skies cannot be followed by "the first blue morning anyone remembers" | make it the first *warm* morning, or the first without snow cloud |
| 2 | "the winter is over", "spring grass", last year's dry grass; d.signe.a2 "three days ahead" after a march from the far south | d.hal.1 «Στην καρδιά του χειμώνα» (Act VI's opening) | Act VI ends in midwinter; the Order woke "the night the dark fell asleep" (d.signe.a4) and has since walked the length of the land. The hook cannot be three nights later | one narrated line of weeks passing; «Τρίτη νύχτα που δεν κοιμάσαι» then means three nights in a row |
| 3 | d.home7.2, d.selna.v7 "the Saltborn never once answered the Order" | d.alk.a3 | a3 is about the fires **on the peaks**. The Order's flame sat in a windowless house in the south: there was nothing to see or answer | the answer comes when the Order's coals first burn on a peak |
| 4 | d.home7.4 the hero relights Isarn's lantern | canon §0 item 7, §4 item 11 ("his dark lantern"); d.answer.0 | no contradiction of a line, but it changes a shipped icon | owner's word (the proposal's own question 5) |
| 5 | d.child7.9 the boy is "Arna" | npc.child; canon §2.1 (Arna, the first Wayfarer; Arna's hill) | no contradiction; a third Arna, and a fourth if the Names are grafted | another name |
| 6 | d.gn.brokka «Εκατό χρόνια κοιμόμουν...» | canon §4 item 8 | makes Brokka a century old; never stated | «Χρόνια» |
| 7 | "keepers" of a flame that must never go out; «η Αγρύπνια», "the watch is yours now" (d.coal.m5.2) | canon §4 IP list (no "Watch" order, "the watch does not end"; fire against dark "is close to Dark Souls") | not a conflict of fact; it walks on the line the brief draws | the vocabulary rules in section 5 |

The Order itself, the Mage's past, the Warden's "house that stayed" and the hero's typed name are **new canon, not
conflicts**: class.mage.d, d.alk.a5.m, d.first.1.m, d.asger.2 and d.asger.2.m all support them, and `rl()` (story.js:102)
does read `.m` and has no `.w`, as §2.7 says.

**Estimates I do not believe**
| item | claimed | mine | why |
|---|---|---|---|
| the Burn | 4-5 d | 7-9 d | a new module, its drawing, co-op cells, a soak; tide.js is not a host for it |
| gen7 | 7-8.5 d | 8-10 d | two unlike generators (an open plain with a fuel mask; a stamped interior), two readings each |
| story work | 4.5-5.5 d | 7-8 d | a hook, six cines, five memories, fourteen catch-up rows, a name card, the home scene |
| text | 2-2.5 d for 240 lines | 3.5-4 d | with two proofreaders |
| co-op | 2-2.5 d | 3-4 d | fronts and burnt cells are new shared state |
| missing rows | 0 | 4.5-5.5 d | Stage 0 and Release, which Production counts |
| **total** | **47-58** | **58-70** | |
Also not believed: "one creature download" as a plan. Build Aithon on a shipped body from the first day.

### 2.2 Production: The Seven Peaks

**Five best ideas, and where each attaches to the base**
| # | idea | where | attaches to |
|---|---|---|---|
| 1 | Design for zero downloads; a download is an upgrade, never a dependency | §0 fact 1, §10.1 | the base's assets: Aithon and the Yoke-ox on a shipped body |
| 2 | Daylight proven at Stage 0 on shipped zones by an atmosphere override, with the Weeping Woods' recipe as the fallback; the `'sun'` light kind, `a.sun`, the 'day' telegraph, decals on bright ground | §3.4, §7.1 | the Tindergrass, the House's `open` reading |
| 3 | Boss rules and bands; "the ice is the life bar's picture" | §4.3, §4.5 | both bosses; Ragna's shutters fall one by one as her life does |
| 4 | Tests that stay true: fixtures, `?nopacks&nostory`, places by name, `stage`/`until` with a gate that fails on an expired test; `play7` from Stage A | §7.3 | the contract, unchanged |
| 5 | Hazards as weapons at full strength, and zone danger measured at G2 before a boss is built | §4.1, §8.2 | the Burn strikes the Order's fire-things as it strikes the hero; the balance order |
Also keep: the save-format bump to 2 at this release (§8.4); the minute-by-minute teaching tables (§3.3); "nothing is
needed to finish a boss" (§5.5).

**Five weakest points**
1. No opponent and no stake on screen (§2.2; its own §10.5 point 1).
2. The finale is the Act II golem in a coat of ice (§4.5; its own §10.5 point 2). The Stonewarden is a built thing that
   speaks in capitals of "the king's word"; the same body as a living mountain will read as the Stonewarden.
3. Zone 2 is the `rime` pack in sunlight (§3.2). A noon snowfield after two ice acts is not the break lesson 5 asks for.
4. The Seven Fires (§8.1) is a percentage ladder and a repeat of one event; it gives a reason to replay and no place
   for points.
5. Sun and Shade is a mechanic players may never notice (§10.1 says so).

**Canon conflicts**
| # | proposal line | shipped line | the conflict |
|---|---|---|---|
| 1 | d.halda7.4 «Χρόνια έχω να βγω απ' το καμίνι» | d.halda6.v2 «όσο έλειπες, ανεβαίναμε στις κορυφές», d.halda.north | she has been up the peaks this winter and stood on the beacon hill last act |
| 2 | Kelados, "our old ones called him", the water-gates | d.halda.2, d.brokka.v1, d.brokka.v5 «Οι Λιθογενείς δεν ξεχνούν» | not a contradiction; but a people whose refrain is that they forget nothing never mentioned a lake hanging over the valley in six acts. Marked "to check" by the proposal itself (§2.1) |
| 3 | «Κέλαδος» as a Stoneborn word | canon §5.10 (Stoneborn names: Brokka, Durgan, Dain) | a Greek name in a hard-consonant people |
| 4 | d.kel.rest2 the hero gives Kelados Isarn's word | d.staff, d.rest6 (to Pherousa) | no conflict; the word is spent a third time on a stranger |
| 5 | "the six lookouts" as the peaks' fires, all on one mountain | d.peaks.1-2, FAR_BEACONS 7-12 on the skyline | six separate peaks become six knolls of two zones |
A note for the lead: §10.4 item 1 is out of date. `creatures.js` now has `act6: ['icemaw', 'louse']`. Items 2 and 3
(no `silt` pack; neither gated download built) still stand.

**Estimates I do not believe**
| item | claimed | mine |
|---|---|---|
| gen7 with reach checks at four water levels, two readings, two zones | 5.5-6.5 d | 7-9 d |
| Sun and Shade with moving clouds, the wake input, co-op | 1.5-2 d | 2.5-3 d |
| Kelados with plates, lake steps and three sluices | 3-3.5 d | 4.5-5 d |
| the Seven Fires with ranks, colours, co-op and save | 2-2.5 d | 3 d |
| **total** | **47-59** | **52-64** |
The perf figure "0.85-1.0 of the Field" in a tree-shadowed meadow is a guess until perf7 runs; the proposal says so.

### 2.3 Systems: The Twelve Nights

**Five best ideas, and where each attaches to the base**
| # | idea | where | attaches to |
|---|---|---|---|
| 1 | **The Names**: three said at a time, two depths, bought from the one pool, each a way to play; a free respec at q40 | §5.2 | the cap slot. They sit naturally in the base: the Order keeps the Rolls, "a thousand years of names" (Story §2.6) |
| 2 | Heavy blows as a share of her life, one per enemy kind, its own number on each difficulty; Wanderer loses a move and gains a gap | §2.4, §3 | every base enemy gets one heavy telegraphed move; both bosses |
| 3 | The balance plan: lowest life, seconds under 30%, worst three seconds; run C (double the damage, the fight must nearly halve); run D (a Name proves itself or is cut) | §8 | the base's G2 and G3 |
| 4 | Fairness tables by range band and the ±30% gate | §4.1, §4.2 | Aithon and Ragna, before they are built |
| 5 | Vows: an optional layer on the Shadow Gates; a Gate with no Vow is today's Gate, proved by a test | §6.1 | the post-game slot |
Also: the noise table by skill (§2.2) attaches to the base's sleepers (mechanic 3). And the Twelve Nights themselves are
too good to lose: keep them written down for a winter update or Act VIII.

**Five weakest points**
1. **A third blue act** (§9.2). This alone rules it out as a base.
2. **Scope.** 62-75 days, and three post-game systems (Vows, the Calls, the Vigil) that are each a small product.
3. **The wind is seven rules** (§2.1) on a phone, one of which moves the hero. The proposal itself makes it the first
   thing to cut (§10.2, owner question 2).
4. **The bosses' pictures:** a goblin at ×2.3 and the troll at ×3.2 (§4), after the Shade already wore the troll. And
   Gremos's move list has grown past the "4-5 moves" the document promises.
5. **A board that follows the device's date** (§6.2) and a "night" counter: harmless, but it is a daily-login shape,
   and it is 3.5 days.

**Canon conflicts**
| # | proposal line | shipped line | the conflict |
|---|---|---|---|
| 1 | mon.gremos.t «Έχτισε τη σκάλα», "the giants who built the Giants' Stair" | zone.pass.s «Ο παλιός δρόμος των Λιθογενών»; d.isarn.a4 «Οι παλιοί τον λένε Σκάλα των Γιγάντων» | the shipped subtitle says it is the Stoneborn's road, and "Giants' Stair" is what old folk call it |
| 2 | d.halda.w4 «χωρίς τοίχο, χωρίς άνθρωπο»; "no keepers" | d.leif.bark «Ξύλα για όλες τις κορυφές. Δουλειά έχουμε.», d.peaks.2 | Act VI's ending shows the village keeping them |
| 3 | d.halda.w3 the goblins lived in the dark the Gates' bottom now lights | act6-design, premise (the bottom is the drowned barrow, wood and village; its dead are the Gate-Fallen) | new canon laid over Act VI's; soft canon only |
| 4 | Oreithyia, a keeper of the North's peak fires | canon §5.10 (men: short Norse-sounding names; Greek sea names are the Saltborn's) | a naming break |
| 5 | telegraphs ×1.25 on Wanderer | the standing rule of HAZ5 and HAZ6 (data.js) | a rule of the game, broken on purpose (§11 question 3) |
| 6 | "Six fires, one keeper" before the beacons failed | d.isarn.2, intro.5 | not a contradiction; a second lone keeper beside the hero, never mentioned |

**Estimates I do not believe**
| item | claimed | mine |
|---|---|---|
| the Names: twelve rules, hooks at eight call sites, a panel, a scenario | 7-8 d | 10-12 d |
| Vows, the Calls, the Vigil | 8 d | 10 d |
| the campaign: about 1,780 runs and the tuning they ask for | 4-5 d | 7-8 d |
| making it not a blue act | 0 | not priced at all |
| **total** | **62-75** | **70-85** |

---

## 3. The combination I recommend

**Title.** «Πράξη VII: Η Ακοίμητη» / "Act VII: The Unsleeping" (Story). Title screen: game.sub7 «Και η φωτιά κοιμάται»
/ "The fire sleeps too". *Owner's alternative if «Ακοίμητη» sounds too much like a church lamp:* «Η Φωτιά που δεν
Κοιμάται» / "The Fire That Does Not Sleep".

**Spine, in one paragraph.** Weeks after the dark fell asleep, on the first warm morning, the hero has not slept for
three nights and a smoke is walking on the southern plain. The Order of the Flame, the Mage's old school, has remembered
the road north and is carrying its flame, never allowed to go out in a thousand years, to stand on the sea ice over the
sleeping dark for ever. That would melt the dark's blanket and wake it. Halda fits the Cradle with a lid, because every
smith knows a fire is banked at night and woken in the morning. The hero walks the old South Road against the wind,
wakes the three fires a runaway student banked in secret, and reads in their embers how the vigil began with a girl too
afraid to bank the last coals: «Είναι η τελευταία». The hero unyokes the bull that burns the Procession's road, enters
a house built without windows, lets daylight into it hall by hall, and fights Master Ragna until she does the one thing
she has refused for forty years and falls asleep. The Unsleeping is banked, and in the morning it is woken and
trembles. The Order goes home with the North to keep the seven peaks in turns, and the hero sleeps while someone else
keeps the light. The last line is the first: «Ώστε ξύπνησες.»

| slot | choice | from | why |
|---|---|---|---|
| **Zone 1** | `tinder`, «Ο Ξερόκαμπος» / "The Tindergrass", level 40, daylight; **the fire bounded as section 5 says**: walled stubble fields along a road, never a front loose toward a village or a wood | Story §3.2, changed; daylight kit and Stage 0 gate from Production §3.4, §7.1 | the clearest new look the engine can draw; the Greek landscape |
| **Zone 2** | `vigil`, «Ο Οίκος της Αγρύπνιας» / "The Vigil House", level 43; **each feeder hall opens to daylight when its fire is banked** (shutters down, skylight panes), so the zone turns from dark to day as it is played, not only after the act | Story §3.3, merged with Production's "the picture shows the progress" (§4.5) | cuts the time spent in a dark crypt-kit interior by half and shows the act's idea |
| **Boss 1** | **Aithon, the Bull of the Procession**, as written, on a **shipped body chosen at the Stage 0 look gate**; a bull download only if one is found clean within that stage | Story §5; Production's zero-download rule | the arena that gets safer is the best fight design here |
| **Boss 2** | **Ragna the Wakeful**, with four changes: the Waker walks the floor, not a gallery; the hall's eight shutters fall as her life does; phase 3 keeps one active thing to do (the last brazier); range-band tables written before she is built | Story §5; Systems §4 (tables); Production §4.3 (bands: 110-170 s and 150-230 s, ceilings 240 and 270, 4-10 blows landed) | the act's argument as a fight, made fair for the Warden |
| **Mechanic 1** | **The Burn**: wind over fuel; black is safe; the Cradle's own fire that goes out. Its own small module. **No Smoke meter.** It strikes the Order's fire-things at full strength | Story §6.1 rules 1-4; Production §4.1 | one new idea, no meter |
| **Mechanic 2** | **Bank and Wake, with the Call**: a lamp's third state; and waking a hearth calls the hero's Names for twenty seconds (the burst window, the same for every class). Ragna's nods ring it | Story §6.2 merged with Systems §2.3 | two proposals' shrine ideas are one object |
| **Mechanic 3** | **Sleep and Noise**: the fallen sleep and a Waker rings them up (the shipped remains and `forger`); sleepers and the Standing wake to *noise*, from one table by skill | Story §6.3a merged with Systems §2.2's noise table and Production §5.2's `'loud'` event | a capped hero must think before pressing the loud button |
| **Cap and progression** | **The Names, eight at release**: Arna, Isarn, Pherousa (given at q40), Einar, Ivar, Keyx, Asger (by deeds read from shipped flags or an echo), and the Order's founder (learnt at Ember Memory 2). Three slots, two depths, the free respec. Each proved by run D or cut. No new Mastery track | Systems §5.2, cut from twelve; Story's Rolls as their home | the only real place for points on offer |
| **Post-game** | **Vows on the Shadow Gates, five** (fast, host, named, silence, haste), off by default, with the unvowed-Gate regression test | Systems §6.1 | three days for a second axis on the content players already repeat. *Alternative for the owner:* Production's Seven Fires ladder (§8.1) |
| **Optional collectible** | **The Seven Good Nights**, blessing ×1.25 | Story §7 | uses the whole shipped world; no asset |
| **Also** | Rested (Story §6.3b) as a one-day return hook, **the owner's call**; Story's three blessings, two echoes, two legendaries; the save format to 2 at release (Production §8.4) | | |

**Left out, on purpose:** the wind as a physics system; the Calls board and the weekly Gate; Tempering; the Seven
Fires; the Firehawk, the Smoke meter, the sky dome and the Oil Cellar's own hazard (Story's own cuts 2-4).

**Honest cost of the combination:** 58-70 focused days with everything above; about **50-60** after this cut order:
Vows to the first patch (2.5 d), Rested to the first patch (1 d), echoes to the first patch (1 d), the Names from eight
to six (1.5 d), the Good Nights from seven to four (0.75 d), guest-usable hearths (0.75 d), the Sleepless replaced by
more Wakeful (0.75 d). **Never cut:** daylight, the black patch, bank and wake, nobody dies, the Names, the hero's
sleep and the last line, the look gates, the balance runs.

---

## 4. Decisions the lead must take

| question | the options | my call | why |
|---|---|---|---|
| The spine | Unsleeping / Thaw / Twelve Nights | **Unsleeping** | the only one with an opponent and an ending |
| Fire in the open | as written / bounded fields / none | **bounded fields, with the owner's explicit yes before Stage A** | section 5. If he says no: zone 1 keeps its look, fire lives only in Aithon's arena and the oxen's furrows, and the zone's rule becomes a cut-down wind (heading, lee, shots carry; no drift) from Systems §2.1 |
| Who is told «Ξεκουράσου» | Kelados (Production) / nobody new; the hero finally obeys it (Story) | **the hero** | the word has been given twice; it is time it was kept |
| The cap layer | Rested / the Seven Fires / the Names | **the Names (eight)**; Rested beside them if the owner wants it | points need a place, not a faster tap |
| The boy's name | Arna (Story) / unnamed / a new name | **a new short name the owner picks; not Arna** | with a Name called Arna on the panel, a third Arna confuses; the scene loses nothing |
| The typed hero name | shown to co-op partners (Story §9.3) / on the player's device only | **device only in this release** | free text shown to other players is user-generated content with store duties; a panel after the cine, never a keyboard over it |
| Isarn's lantern relit | yes / no | **yes, and ask the owner** | the best image in the ending; it changes a shipped icon |
| Telegraph lengths on Wanderer | ×1.25 (Systems) / never change (Story, Production, the shipped rule) | **never change** | easy is pace and blows, as lesson 1 says |
| A phase floor | until the phase's first move fires (Systems §4 rule 2) / none (Production §4.3 rule 1) | **none**; a skipped phase still plays its entry | any floor is a lock with a reason |
| Blows landed in a boss fight | ≤ 8-10 (Story) / 4-10 (Production) / 8-16 (Systems) | **4-10**, each 12-18% of her life on Warden, never over 20% | 16 blows of 15% is Act VI's Ketos |
| How a heavy blow is priced | a multiple of the zone's blow / a share of her life before armour per difficulty | **the share** (Systems §2.4) | the multiples are what a capped hero out-heals |
| The damage anchor | ×1.2-1.45 of Act VI as shipped / of Act V as measured | **Act V as measured, about ×1.45-2.1** (Story §5), with lowest life and deaths as the real gate | Act VI shipped at ×3-7 of Act V; "×1.2-1.45 of the one before" read literally would repeat it. The lead should write this down |
| The download slot | a bull (unscouted) / the Scorpion (gated) / a giant | **no download on the critical path**; a bull only if found clean in Stage 0 | Act VI's two never arrived. The Scorpion is Act VI's debt and is not this act's slot |
| Zone 2 | dark until the act ends / opening hall by hall | **hall by hall** | graphics, and lesson 5 |
| Save format 2 | at this release / later | **at this release**, in the last commit (Production §8.4) | v22 already refuses 2 |
| Post-game | Good Nights only / Seven Fires / Vows, Calls, Vigil | **Vows (five) and the Good Nights** | the cheapest month of play; the Gates unchanged without a Vow |
| The Warden's `.w` lines | yes / no | **yes** | one clause in `rl()`; the act about the hero should not skip one class |
| The Twelve Nights | drop / keep for later | **keep for a winter update or Act VIII** | Greek folklore the game already owns by name |

---

## 5. Red flags and must-fix items before a design is written

### 5.1 The wildfire: not acceptable as written; acceptable with changes
Plainly: Greece has buried people after fires in dry grass and pine with a wind behind them (Mati in 2018, Evia in
2021, Evros and Rhodes in 2023), and almost every Greek player has watched one on the news or from a balcony. As
written the act opens with a child watching smoke walk toward his village (d.morn.3, d.child7.4), sets a clock on it
(«Σε τρεις μέρες θα είναι στο δάσος σας», d.signe.a6), shows singed animals running from it (the Singe-wolf, §4), and
has a trusted character teach, in so many words, that if fire rings you in you should light one yourself (d.halda7.b1,
«Αντιπύρ», §6.1 rule 4). The last is the real problem: civilians lighting backfires is what Greek fire services warn
against. The proposal's guardrails (no home burns, nobody dies) are right and not enough.

It does not need to be avoided. Fire is this game's subject from its first sentence, the act's fire ends in regrowth,
and "the black is safe" is the best rule on the table. **The changes, all required:**
1. **The fire is bounded and made by people for a purpose.** The Procession burns the stubble of the fields along its
   road, field by field, between dry-stone walls, the road and the brook. No front runs loose across open country; none
   approaches a house, a village or a forest on screen. Burning stubble is something Greek players know as farm work.
2. **The stake moves off the village.** Cut the three-day clock and the threat to the wood. The danger is what the brief
   already gives: a fire stood on the ice wakes the dark. The hook keeps the smoke on the horizon and loses the child's
   fear of it.
3. **No burnt or fleeing animals.** The wolves are just the plain's wolves. No trees in flame, no burnt buildings.
4. **The hero's fire is the Cradle's, not advice.** Drop the word «αντιπύρ» and Halda's "every charcoal-burner knows...
   burn a patch yourself". The verb is the Cradle's own («Άφησε την Κούνια να κάψει έναν κύκλο»): a property of a
   magic coal, visibly not a thing to try.
5. **The Order's fire looks unnatural:** white-cored and still, as Act VI drew false light, so no screenshot reads as
   news footage.
6. **The store listing and the first screenshots lead with the gold plain, the daylight and the House**, not with a
   wall of flame; and the act is not launched or advertised in June to September.
7. **The owner says yes in words before Stage A.** The brief says not to stop for questions; this is the one that
   should be put to him the same day, with the wind variant (section 4) ready so that a "no" costs no time.

### 5.2 Other risks for a Greek audience and a store listing
- **Church register.** «Ακοίμητη» is the lamp that is never let go out before an icon; «αγρυπνία» is an all-night
  service; add a «Πομπή», an order in robes, a "covered censer" on Ragna's staff (Story §5 ASSET) and Systems'
  «Τάματα» with a «Τάμα της Νηστείας», and a Greek player reads a church whose holy flame the hero puts out. Keep the
  Order a **school**: masters, students, lessons, rolls. Remove the censer. No chant in the music. Rename the fasting
  Vow («Τάμα της Δίψας»). Never let "the dark" be the one who pays a vow.
- **The pattern canon §4 warns about.** A flame kept for an age by keepers who must not let it die. The act refuses it,
  which is its point, but the words must stay clear of it: no "keeper of the flame", no "first", "kindle", "link" or
  "age of"; Ragna never alone with it (Story §2.2 already says so). The Order's dead are "the Standing", not keepers.
- **A plus worth saying:** an act in which no person is killed helps the age rating. Say so in the listing's
  questionnaire answers.
- **Rested** reads the device clock and rewards coming back. Keep it free of notifications and of anything lost by
  staying away.

### 5.3 Must-fix before the design is written
1. **A two-day spike on the Burn at Stage 0**: its own module on `map.close()`/`map.open()` with the lane rule; flame
   quads, the char attribute and straw tufts on a grey-box field at quality 0 and 1 on the owner's phone. If it is over
   the Field's frame time or reads badly, the wind variant is the plan.
2. **The daylight gate** exactly as Production §7.1 (a): shipped zones under the new light, with a telegraph, a ring
   and three monsters in frame, before any Act VII code.
3. **Aithon's body decided by eye among shipped quadrupeds** at Stage 0. Do not write the fight to a download.
4. **Every regular enemy gets one heavy telegraphed move** priced as a share of her life (Systems §2.4). Without this
   the zones repeat Act VI's 0.05-0.33 lives a run.
5. **Ragna:** the Waker on the floor; range-band tables; run C on both bosses (double the damage, the time must fall
   to 50-65%) so that the Nod is proved not to be a lock.
6. **The Names:** the panel drawn for a phone first; each Name with the run that proves it; the co-op blow cap taught
   their ceilings from the host's own table (Systems §7).
7. **The time and sky lines** fixed (conflicts 1-3 of §2.1) before any dependent line is written.
8. **Production's four test rules (§7.3) go into the contract word for word**, with `play7` from Stage A.
9. **The balance order:** zones measured at G2, bosses on grey boxes at G3, before a cine, a line or a theme is
   attached to them (Story §9.1 says the same).
10. **Text budget:** about 240 lines of story plus about 60 for the Names and the Vows. Two readers on every line; the
    owner reads the hook, the banking, the waking and the home scene in Greek before Stage D closes.
11. **Scope discipline:** nothing from the "left out" list in section 3 comes back in during the design.
12. **Unverified points to close at Stage 0:** sleeping remains and `Lie_Idle` on people, folk and frost rigs (the Good
    Nights need them in six zones); the 7-beat bar; whether cloud saves carry a server time for Rested; the memory
    figures, by the same probe Act VI used.
