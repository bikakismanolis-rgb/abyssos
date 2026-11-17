# Act VII: The Twelve Nights (proposal: systems-first)

«Πράξη VII: Οι Δώδεκα Νύχτες» / "Act VII: The Twelve Nights". Latin V and I, as canon §5.6 sets for IV and V.

Act VII begins from a save at quest 39 (flag `act6`): the First is named «Φέρουσα», her fire burns again at the bottom of the Shadow Gates, the Skotos sleeps, and the six peaks burn (`d.peaks.1`-`2`, text.js:1380-1381). The last shipped line is «Ο Βορράς κοιμάται με τα φώτα αναμμένα.» / "The North sleeps with the lights on." (`d.answer6.3`, text.js:1384).

**The act in one paragraph.** The halcyon days end and the wind comes back: «ο Βοριάς», the north wind (lower-case wind, never «ο Βορράς», the land; canon §0.1). With it come the twelve nights of midwinter, when, the Stoneborn say, the καλικάντζαροι come up out of the ground to put out every fire they can reach. This year they come in a host, because the hero lit the bottom of the world and what lived in that dark had to go somewhere. Six fires lit in a hurry on bare peaks, with no walls and no keepers, will not last twelve nights of wind and goblins. The hero climbs the Ridge, raises windbreaks at the fires, breaks the host's Lame Chief at the Third Fire, crosses the Saddle where the last keeper of the road was lost to the wind, and finds that the sixth peak is not a peak: it is the last of the giants who built the Giants' Stair, asleep under a thousand years of snow, and the host has driven iron wedges into him to make him stand and shake the highest fire off his brow. The hero does not kill him. She breaks the wedges, says the name only the Stoneborn kept, and he sits down again with the sixth fire in the cup of his hand. One cave on the Ridge is left dark on purpose.

**The act in one idea, as play: where you stand is your build.** Act VII is the first act played entirely at the level cap, so it stops asking "how big are your numbers" and asks three things a capped hero has never been asked:
- **Where is the wind?** Every fight has an upwind and a downwind side. Shots, charges, leaps, knockbacks and the foes themselves are carried by it; a rock's lee is the only still ground.
- **What is overhead?** Snow hangs over the slopes and comes down on *noise*, the hero's heavy skills as much as a troll's slam. The slide is a weapon the first time and a mistake the second.
- **Whose names do you say?** A capped hero now says three Names every night (a new build layer bought with the same points as skills and Mastery). Each Name is a rule about *how* she fights (standing still, after a dodge, from far away, holding her resource), not a percentage. At a traveller's cairn she calls them aloud for twenty seconds: the act's burst window, the same for every class.

**The angle of this proposal: systems first.** The owner's standing complaint is "points with nowhere meaningful to go" and thin endgame depth. This proposal spends its budget there:
- one new build layer with real consequences (**the Names**, 12 of them, 3 said at a time), one small gear sink (**Tempering** at Halda), no new stat track;
- enemies and bosses built on **few, large, telegraphed blows** instead of chip damage, so danger can be measured (lowest life, deaths, time under 30%), and **no minimum-time locks**;
- three post-game pieces that need no server: **Vows** on the Shadow Gates (optional), **the Calls** (a date-seeded board at Whitecliff), **the Vigil** (a week-seeded Gate);
- a balance plan that names its runs before a line of the act is written.

**Scope** (the owner's frame is Acts V and VI's):
- **2 zones,** one new generator `src/world/gen7.js`:
  - `ridge`, «Η Ράχη των Φωτιών» / "The Ridge of Fires", level 40: the beacon road along the spine above Whitecliff, the first three peak fires, the Third Fire's terrace.
  - `saddle`, «Το Διάσελο του Βοριά» / "The North Wind's Saddle", level 43: the high pass, the keeper's hut, the fourth and fifth fires, the Shoulder (the sixth).
  - The levels keep the +3 cadence (world.js:42-63: `drained` 34, `bottom` 37). Monsters track the hero, who arrives at 50 (world.js:416 for bosses; pack levels follow the zone's, which `travel` raises to the hero's, as Act VI's did: **I did not trace that line; stage A verifies it**).
  - No Cradle light kind: neither zone sets `light` in `ZONES`. Both set `cold` (cold.js:28 `coldZone`), which is what the wind rides on.
- **7 regular enemy entries,** every one on a shipped model:
  - new kinds on boot-loaded Act I models (creatures.js:38, the `act1` group): the Windbreak, the Kite-archer and the Wind-caller (goblin bodies), the Ridge Wolf (the warg), the Saddle Troll (the troll);
  - reused from Act V with one new trait each: the Rime Bear and the Skua (creatures.js:42, files `bear` and `skua`).
- **2 bosses,** no download needed:
  - «Ο Κουτσός Αρχηγός» / "The Lame Chief": the boot goblin at ×2.3 with a code horn and hide shield, and his host;
  - «Γκρεμός, ο Τελευταίος της Σκάλας» / "Gremos, the Last of the Stair": the boot troll at ×3.2 under a stone-and-snow regrade. **The one optional download** is a giant body for him if stage 0 finds a clean one (CC-BY, own sculpt, ≤ 700 KB, ≤ 15k triangles); the fight is written on the troll and does not depend on it.
- **Quests 40 to 46;** the new end state is **47**.
- **3 mechanics,** each an existing system with one new input:
  - the North Wind (Ο Βοριάς): cold.js's gusts and lee, plus **a direction that pushes**;
  - the Hanging Snow (Το Χιόνι που Κρέμεται): forge.js's flues, plus **a load that noise fills**;
  - the Name-cairns (Οι Ονοματόπετρες): world.js's shrines, plus **the Names the hero says**.
- **Progression at the cap:** the Names (12; three slots; two depths), Tempering, a free respec at q40. No 14th Mastery track, no sets, no second legendary slot (stats.js already reads a legendary in every slot: `s.legs` is a set, stats.js:10, :18).
- **Post-game:** Vows (8, up to 3 at once, optional), the Calls (3 a day, date-seeded, a twelve-night cycle), the Vigil (one seeded Gate a week).
- **Also:** seven wind-bells to re-hang (optional; the blessing ×1.25), three blessings, two echoes, two first-kill legendaries, three themes and a motif.
- **Cost:** about **62-75 focused days** as written, against Act VI's 47-59. The cut order (end of this file) brings it to about **49-59** without touching the act's three questions or the Names.

**What the balance campaign changed in this design** (docs/act6-briefs/reports/balance-report.md, 14 and 16 November):

| what went wrong in Act VI | what Act VII does |
|---|---|
| bosses 5-7 minutes, 81-146 small blows a fight | 2-4 minutes; each boss has 4-5 moves, every one telegraphed ≥ 1.0 s; target **8-16 blows landed a fight**, each worth 9-18% of her life after armour |
| least-time locks (`SHADE_MIN`, `KETOS_MIN`, ai.js:4780, :5199) | **none.** A phase floor (`hpFloor`) only stops one burst from skipping a phase's first move; it lifts the moment that move has fired |
| the 11% per-blow cap (combat.js:166) flattened the difficulties | no cap in Act VII (the test is `G.zone?.act6`, so it is already off). Heavy blows are a **share of her life before armour**, set per difficulty in `HAZ7`, so each difficulty has its own number |
| ranged heroes took 2-4× the Warden's damage at the bosses | every boss move is assigned to a range band, and the bands are balanced by count and by size (the fairness tables under each boss); a gate at G3: **blows landed within ±30% across the three classes** |
| Wanderer hardly easier | Wanderer changes the *fight*: a move removed per phase, a longer gap between moves, fewer lanes, slower rings, half the heavy share (Difficulty) |
| heroes out-heal chip damage, so "lives of damage" measured nothing | the act's damage is bursts; the campaign reports **lowest life, deaths, seconds under 30%, potions, the worst 3-second loss** beside lives of damage |
| zones trivial for a capped hero (0.05-0.33 lives a run) | packs are built round one heavy blow each and the wind; target lowest life 45-65% on Warden over eight packs |
| the Lamplight track's effect could not be measured | no new stat track. Each Name ships with the run that proves its effect (Balance plan), and a Name whose effect cannot be shown is cut |

---

## 1. Story spine (lean; the story-first proposal goes deeper)

### Premise
- **The halcyon days end.** Act VI opened on `d.hal.1` (text.js:1188): the still weeks «που η θάλασσα σωπαίνει και δεν φυσάει». Act VII opens when it blows again. The wind is «ο Βοριάς» (already a blessing's name, `boon.north`, text.js:486).
- **The twelve nights.** In Greek folk belief the καλικάντζαροι live under the earth all year and come up for twelve nights in the heart of winter; a fire kept burning all night keeps them out. The game has called its goblins «Καλικάντζαρος» since Act I (`mon.goblin`, text.js:141). Act VII takes the word at its word. The game never names a feast or a calendar: only «οι δώδεκα νύχτες».
- **Why a host this year.** They lived in the dark under the mountains, where the Shadow Gates opened (`d.isarn.r5`). Now the Gates' bottom burns (`act6.next`, text.js:1386) and warm air rises from them. Their dark is gone. The hero did that.
- **Why the peaks.** They fear fire, so they put fires out. The six peak fires were lit by hand in one night (`d.peaks.2`) on bare rock. No one has kept a fire up there since the night the beacons failed.
- **Who is not here.** Karthax is never named. Isarn is a staff and a word. The Skotos sleeps and stays asleep: no line of the act is its, and no creature of the act is called its. Nothing is linked, kindled, sacrificed or cursed.

### The hook
- **Who sees it:** a save with `act6` and quest 39, without `wind7`. On the next town entry (for a hero finishing Act VI after the update: 2 s after the blessing panel closes, as Acts V and VI did).
- **What happens** (cine at pitch 0.3 toward the peaks; flag `wind7` saved first): the snow in the air turns sideways. On the northern skyline the highest of the six peak fires (FAR_BEACONS index 12; world.js:72 holds the table, **the six peaks' entries are Act VI's and I did not read their offsets**) leans, gutters and goes out.
  - Narration `d.wind7.1` «Οι αλκυονίδες τελείωσαν. Φυσάει.» / "The halcyon days are over. The wind is up."
  - The child by the staff: `d.child7.1` «Η πιο ψηλή έσβησε. Τις μετρούσα.» / "The highest one went out. I was counting them."
  - Toast «Νέα αποστολή», q40.
- **New `act6.next`** for heroes who finish Act VI after the update: «Πράξη VII: Οι Δώδεκα Νύχτες. Μίλα με τη Χάλντα.» / "Act VII: The Twelve Nights. Speak with Halda."

### Quests
| q | Greek / English | what happens | flags |
|---|---|---|---|
| 40 | «Μίλα με τη Χάλντα: η έκτη φωτιά έσβησε» / "Speak with Halda: the sixth fire has gone out" | Halda tells the twelve nights and the sixth peak's name; the hero says her first three Names at the beacon; a free respec | `wind7`, `names7` |
| 41 | «Ανέβα στη Ράχη και στήσε ανεμοφράχτες στις φωτιές ({0}/3)» / "Climb the Ridge and raise windbreaks at the fires ({0}/3)" | the wind, the lee, the first slide; each fire walled is a warm pool and a checkpoint | `break7_0..2` |
| 42 | «Νίκησε τον Κουτσό Αρχηγό στην Τρίτη Φωτιά» / "Defeat the Lame Chief at the Third Fire" | boss 1 | `chiefDown` |
| 43 | «Πέρνα το Διάσελο: βρες την καλύβα της φύλακα» / "Cross the Saddle: find the keeper's hut" | the storm at its worst; Oreithyia's ledger; her Name | `hut7`, `name_oreithyia` |
| 44 | «Κρέμασε τα κουδούνια του δρόμου ({0}/3)» / "Hang the road's bells ({0}/3)" | three Name-cairns re-armed along the pass; the fourth and fifth fires walled | `bell7_0..2` |
| 45 | «Αντίκρισε τον Τελευταίο της Σκάλας» / "Face the Last of the Stair" | boss 2; he is not killed | `gremosDown` |
| 46 | «Άναψε την έκτη φωτιά στη χούφτα του» / "Light the sixth fire in his palm" | the relight, the dark cave, home | `sixth7`, `darkHole`, `act7` |
| 47 | «Δώδεκα νύχτες, εφτά φωτιές, και μια τρύπα σκοτεινή. Οι Σκιοπύλες σε περιμένουν.» / "Twelve nights, seven fires, and one hole left dark. The Shadow Gates await." | end state | |

### The lines that carry it (Greek first; folk speak with contractions, canon §5.3)
**Halda at the anvil** (q40; `d.halda.w1`-`w6`):
- w1 «Φύσηξε. Τελείωσαν οι καλές μέρες.» / "It's blowing. The good days are done."
- w2 «Δώδεκα νύχτες τον χρόνο ανεβαίνουν από κάτω. Τη φοβούνται τη φωτιά, γι' αυτό τη σβήνουν.» / "Twelve nights a year they come up from below. They fear fire, so they put it out."
- w3 «Φέτος είναι ασκέρι. Τους άναψες το σπίτι, φλογοφέρε. Κάπου έπρεπε να πάνε.» / "This year it's a host. You lit up their home, fire-bearer. They had to go somewhere."
- w4 «Έξι φωτιές σε γυμνή πέτρα, χωρίς τοίχο, χωρίς άνθρωπο. Δεν βγάζουν τις δώδεκα.» / "Six fires on bare rock, no wall, no keeper. They won't last the twelve."
- w5 «Την έκτη κορυφή οι δικοί μου τη λένε Γκρεμό. Δεν είναι όνομα βουνού. Είναι όνομα.» / "The sixth peak, my people call Gremos. That's no mountain's name. It's a name."
- w6 «Πες τα ονόματά σου στη φρυκτωρία πριν ανέβεις. Τρία φτάνουν. Όποιος λέει ονόματα τη νύχτα δεν είναι μόνος.» / "Say your names at the beacon before you climb. Three is enough. Whoever says names at night isn't alone."

**The keeper of the first hut** (the wind's teacher; `d.hut.r1`-`r3`. He is Leif when the hero brought him home, `flags.leifHome`, story.js:2618-2621; otherwise a villager of the boot-loaded village set says the same three lines): «Πίσω από τον βράχο δεν φυσάει. Απάγκιο το λέμε.» / "Behind the rock it doesn't blow. We call that the lee."; «Με τον αέρα στην πλάτη, το βέλος πάει μακριά. Κόντρα, πέφτει.» / "With the wind at your back the arrow carries. Against it, it drops."; «Και μη φωνάζεις κάτω από το χιόνι που κρέμεται.» / "And don't shout under the hanging snow."

**The Lame Chief** (`mon.chief.t` «Όλο τον χρόνο στο σκοτάδι. Δώδεκα νύχτες έξω.» / "All year in the dark. Twelve nights out."):
- intro `d.chief` «Φωτιά! Σβήστε τη! ΣΒΗΣΤΕ ΤΗ!» / "Fire! Put it out! PUT IT OUT!"
- death `d.chief.die1` «...κάτω... έχει φως τώρα...» / "...below... there's light now..."; `die2` «...πού να πάμε...» / "...where do we go..."

**The keeper's ledger** (q43; narrator, three lines; her name is Ωρείθυια, the one the North Wind took, as the old tale has it; the game never tells the tale, as it never told Alkyone's):
- `d.ledger.1` «Έξι φωτιές, μία φύλακας. Το γράφει κάθε βράδυ: «Όλες καίνε.»» / 'Six fires, one keeper. She writes it every night: "All burning."'
- `d.ledger.2` «Η τελευταία σελίδα: «Φυσάει. Βγαίνω να χτυπήσω το κουδούνι για όσους είναι στον δρόμο.»» / 'The last page: "It's blowing. Going out to ring the bell for whoever is on the road."'
- `d.ledger.3` «Κάτω από τη γραφή της, άλλα χέρια έγραψαν ένα όνομα: Ωρείθυια.» / "Under her writing, other hands have written a name: Oreithyia."
- Toast `q.nameLearnt` «Έμαθες ένα όνομα: {0}» / "You learnt a name: {0}".

**Gremos** (`mon.gremos.t` «Έχτισε τη σκάλα. Ξέχασαν να τον ξυπνήσουν.» / "He built the stair. They forgot to wake him."). He has two lines, both in caps without accents (a construct's voice, canon §5.3):
- on rising `d.gremos` «ΠΟΝΑΕΙ.» / "IT HURTS."
- when the last wedge breaks and the hero says his name (narration `d.gremos.name` «Λες το όνομα που σου έδωσε η Χάλντα: Γκρεμός.» / "You say the name Halda gave you: Gremos."): `d.gremos.end` «...ΓΚΡΕΜΟΣ. ΝΑΙ. ΚΑΠΟΙΟΣ ΤΟ ΘΥΜΑΤΑΙ.» / "...GREMOS. YES. SOMEONE REMEMBERS IT."

### Ending
- **The sixth fire** (q46, interact «Άναψε τη φωτιά στη χούφτα του» / "Light the fire in his palm", 2.0 s; flag `sixth7` saved first; cine at pitch 0.3): he sits against the mountain with one hand open on his knee. The hero lights the fire-basket in it. Narration `d.sixth.1` «Κάθεται. Κλείνει τα δάχτυλα γύρω από τη φωτιά, όπως κρατάς ένα σπουργίτι.» / "He sits. He closes his fingers round the fire, the way you hold a sparrow."
- **The dark cave** (on the way down, at the cave the host came out of; one choice-free interact «Άφησέ τη σκοτεινή» / "Leave it dark"; flag `darkHole`): Halda's line when the hero is home, `d.halda.hole` «Άσ' τους μια τρύπα σκοτεινή. Κι αυτοί κάπου πρέπει να κοιμούνται.» / "Leave them one dark hole. They have to sleep somewhere too."
- **Home.** The seven fires burn; the sixth sits a little lower than it did, and moves, very slowly, as a hand does. The last line, `d.answer7.1`: «Κανείς δεν κρατά φως μόνος. Ούτε τα βουνά.» / "No one keeps a light alone. Not even the mountains." (`d.glaukos.e2`, text.js:1372, widened.)
- actComplete(7), offerBoons(7): «Πράξη VII — Ολοκληρώθηκε» / "Act VII — Complete"; `act7.sub` «Εφτά φωτιές, κι ένα χέρι που κρατά την έκτη» / "Seven fires, and a hand that holds the sixth"; `act7.next` «Οι Σκιοπύλες σε περιμένουν. Τάξε κάτι πριν κατέβεις.» / "The Shadow Gates await. Make a vow before you go down."; `game.sub7` «Κανείς δεν κρατά φως μόνος» / "No one keeps a light alone".

### Why the systems mean something
- **The wind** is the act's weather and its season: the still days are over.
- **The snow** is how the host fights: they shout it down on the road.
- **The Names** are what a keeper does at night. Selna says them at the Farthest Light (story.js:1806, `nightRite`); Glaukos promised everyone would (`d.glaukos.e2`). In Act VII the hero does, and it changes how she fights. The one name the game forbids (`d.isarn.u3`: never to any child) is not on the list and can never be learnt.
- **The Vows** («Τάματα») are the folk custom the Twelve Nights leave behind: you promise something hard before you go down, and the dark pays you for it.

---

## 2. Mechanics

Three mechanics, each an existing system with one new input. All numbers are Warden difficulty unless the row says otherwise; `HAZ7` (Difficulty, below) scales them.

### 2.1 The North Wind (Ο Βοριάς): cold.js + a direction that pushes

**What exists.** Act V's Farthest Light already has gusts: 8 s every 40 s, warned 3 s ahead by rising spindrift (`gustWarn`, then `gust`; world.js:1597-1620), +2.5 Cold a second out of the lee (cold.js:80-83), and a lee test behind bergs and beside the ship (cold.js:66-75). The snow already streams sideways in a gust (fx.js:602). The gust has no direction in the rules: it only makes her cold.

**The one new input: the wind has a heading, and it carries things.** Each zone has one heading `W` (a unit vector, fixed for the zone: the Ridge's blows from the north-west, the Saddle's straight down the pass from the north), stored on the layout (`L.wind = { x, z }`).

**Rules.**
1. **The cycle.** A gust every 26 s: 3 s of warning (the shipped spindrift and a rising whistle), then 6 s of gust. Between gusts there is a steady breeze that does nothing but show the heading (snow streaks, the vane). At the Saddle's crest the cycle is 18 s. The clock is the zone's (`z.gust`, world.js:1613, generalised from Act V's).
2. **The lee (το απάγκιο).** A cell is in the lee when a solid cell stands within 3 m upwind of it, or when it lies in a warm pool (a walled fire, a brazier: light.js `warmAt`, :100). Because the heading is fixed, gen7 writes the lee once as a byte mask on the layout (`L.lee`), and the test is one array read; cold.js `lee()` takes the mask when the zone has one. The lee is drawn: no streaks cross it, and the snow on the ground there is smooth (a ground-layer blend the layout already paints; no new shader).
3. **Out of the lee, in a gust:**
   - **Cold** +2.5/s (the shipped number). Freezing (75) already stops regeneration (cold.js:139); in Act VII it also halves life on hit, so a build that lives on Leech has to care where it stands (one line in combat.js where `lifeOnHit` heals, :124).
   - **The hero drifts** downwind at 1.5 m/s while she is not acting. Walking upwind is ×0.75 speed, downwind ×1.2. A roll, a blink, a leap, a charge or a vault is never slowed; **downwind it goes 30% farther**, upwind its full distance.
   - **Foes drift** by their size: radius under 0.5 m at 2.4 m/s, under 1 m at 1.2 m/s, `big`, `anchored` and bosses not at all. Fliers (`float`) drift at 3 m/s and cannot fly upwind at all: they hang.
   - **Shots.** Every projectile's speed is multiplied by `1 + 0.3·cos θ` (θ between its heading and the wind's). projectiles.js gives a shot a speed and a life (:47-58), so one multiplier makes it both faster and longer downwind (a bolt's 24 m becomes 31 m) and slower and shorter upwind (17 m). Shots never curve: a crosswind does nothing. The hero's and the foes' shots obey the same rule.
   - **Damage with the wind.** A hero's hit whose direction lies within 60° of downwind deals +15%; within 60° of upwind, −10%. Melee counts by the direction from her to the foe. (One multiplier in combat.js `heroHit`, :35.)
   - **Knockbacks** (every blow that carries `o.knock`, combat.js:110) are doubled downwind and halved upwind.
4. **The edge.** The Ridge has drops. A drop is a wall to the hero, always: she is never pushed or knocked off. A cell beside a drop with no lee is an **edge cell**, drawn with a lip of blown snow. A foe that is not `big`, `anchored` or a boss and is knocked or blown onto an edge cell *during a gust* goes over: it dies as a drowned foe does (combat.js:508, `o.drown`: no corpse), with full experience and its drops left on the edge (`a.dropAt`, combat.js:553).
5. **Fires.** A peak fire or a brazier with no windbreak gutters in a gust: its warm pool shrinks to 1.5 m (light.js `shrinkPool`, :351) and it can be snuffed (Enemies). A windbreak (q41's interact, «Στήσε ανεμοφράχτη» / "Raise a windbreak", 2 s) is a three-cell wall upwind of it that adds lee cells and holds the pool at 5 m.
6. **In a boss fight** the Cold's Frostbite rule is the shipped one (a 2 s slow, held while a red telegraph is under her; cold.js:107-113).

**What each class does differently.**
| | with the wind | against it | the lee |
|---|---|---|---|
| **Warden** | Leap 9 → 11.7 m, Charge the same; Earthsplitter's knock (5) throws a pack 10 m, over an edge if there is one | fights upwind with his back to a rock: nothing drifts him, foes are blown onto his sword | a shield wall of his own: Bulwark's ward counts as a lee cell ring for the party while it stands |
| **Ranger** | Piercing Shot reaches 29 m and hits +15%; Multishot's knock (1.2) doubles | her bolts fall short at 17 m: an archer downwind of a Kite-archer loses the duel | the wolf does not drift (a pet is `anchored` to the rule); Vault downwind is an 8.5 m escape |
| **Mage** | Fireball 20 → 26 m; Meteor and Frost Nova's knocks throw | blink upwind is a full 7 m while everything else is slowed: his way out | Frost Nova freezes drifting foes where they are; a frozen foe does not drift, so he can pin a pack on an edge and wait for the gust |

**The first minute.** The Ridge opens at Leif's hut, in the lee of a wall. The path north leaves the lee into a breeze (streaks, no push). Sixty metres on, the first gust is scripted: the warning whistle, a toast `q.windWarn` «Φυσάει! Βρες απάγκιο.» / "It's blowing! Find the lee.", a blue safe circle behind the first rock (the shipped blue telegraph, fx.js `teleCircle` with 0x60c0ff, as forge.js:78 uses for cover). The first pack is four Windbreaks and two Kite-archers standing **downwind** of that rock, on a shelf with an edge behind them: whatever the class, the first fight is won by hitting with the wind. The second pack stands **upwind**. Leif's three lines (above) say the three rules.

**HUD.** No new button. A small vane beside the Cold meter (the slot the tide dial uses in Act V, tide.js:474 `tideDial`) points downwind and flutters 3 s before a gust. Audio carries the timing: the whistle rises before, a wind-bell rings from the nearest cairn during.

**Cost in code.** `L.wind`, `L.lee` and edge cells in gen7; cold.js `lee()` reads the mask; one drift term in player.js and in ai.js's move step; one speed multiplier in projectiles.js `fire0`; one line each in `heroHit` and the knock; the vane. About 3-4 days with its scenario (`wind`: a shot's range both ways, a drift, the lee mask against a brute-force test, a foe over an edge).

### 2.2 The Hanging Snow (Το Χιόνι που Κρέμεται): forge.js + a load that noise fills

**What exists.** The Forge's Breath: a list of line hazards (`startFlues`, forge.js:33), each with an inhale of 2.8 s under an orange line telegraph, 1.2 s of fire running down the line as a front, cover circles shown blue the first frame she stands in its path (forge.js:78), a hit worth a share of her life by difficulty (`BREATH.hitBy`, :27-28), monsters burnt too (:118-124), and a roll's i-frames pass through the front (`pl.iframes <= 0`, :112). It fires on a clock (`fluePeriod`, :50).

**The one new input: a chute fires when its load is full, and noise fills it.** A **chute** is a flue record (`x, z, dir, len, w, cover[]`) down a slope, with `load` 0-100 instead of a period. It is white, not orange.

**Rules.**
1. **What adds load** (to every chute whose head lies within 12 m of the noise, or whose lane the noise is in):

| the hero | load | the foes | load |
|---|---|---|---|
| Earthsplitter, Meteor, Dawnbreaker | 50 | a Saddle Troll's slam or boulder | 30 |
| War Cry (and its variants: it is a shout) | 40 | a Rime Bear hitting a wall | 40 |
| Leap landing, Charge's end, Bulwark's burst, Void Rift | 30 | a Wind-caller's finished call | 25 |
| Piercing Shot, a sprung Snare, Frost Nova | 20 | the Lame Chief's horn | 50 |
| Fireball, Chain Lightning, Multishot, a Rain of Arrows (each second) | 8 | Gremos's stomp | 100 |
| a basic attack, Whirlwind, the Ray of Dawn | 0 | a gust (each second) | 2 |

   The list is one table in data.js keyed by skill id and by the foes' move ids; variants take their base's row.
2. **Reading the load.** The cornice at the chute's head shows three stages (whole, cracked, sagging: three scales of one mesh) and three white pips float over it. At 100 it **groans**: 2.8 s of white line telegraph down the lane, the shipped inhale timing, with a low crack that ends on the fall.
3. **The slide** runs the lane in 1.2 s. Everything in it and out of cover:
   - **the hero:** `HAZ7.slide` of her life (12% on Warden; not `pure`, so armour counts), +20 Cold, carried 4 m down the lane. A roll through the front takes nothing, as with the Breath.
   - **foes:** 35% of their life (champions and rares 20%), carried to the lane's foot and Dazed 1.5 s (`daze`, ai.js:1886): a slide **bunches a pack at the bottom**, which is where an area skill wants it. Bosses: a fixed 4% of their life and Dazed 2 s.
   - **cover:** the lee of any rock in the lane (the chute's `cover` circles, blue), and a boulder Gremos has thrown.
4. **After a slide** the chute is empty and gathers again only from gusts (2 a second in a gust: about 45 s of wind to refill). So a chute is one big spend in a fight, not a button.
5. **Where.** Six chutes in the Ridge, eight in the Saddle, two in the Chief's arena, four round the Shoulder. Every chute's lane crosses a place where a pack stands, and never a checkpoint or a cairn (a check-act7 hard failure).

**What each class does differently.**
- **Warden:** he sets it off from inside the lane (a Leap or a War Cry) and rolls through the front. His question is timing: the groan is 2.8 s, his roll's cooldown 2.2 s.
- **Ranger:** she sets it off from outside, with Piercing Shot (20) plus a Snare (20) and time, or lets a troll do it. Her question is patience: three cheap shots do not make one loud one.
- **Mage:** Meteor fills half a chute and Frost Nova pins the pack in the lane for the 2.8 s it needs. His question is the order of two skills.
- **Anyone:** a War Cry or a Meteor cast *without looking up* brings the slide down on the caster. The second lesson of the act.

**The first minute.** The third pack of the Ridge stands at the foot of a chute whose load is set to 60 and whose cornice is visibly cracked. Leif's third line is the hint. Whatever heavy skill the player opens with brings it down on the pack; the cover circle is behind her, not ahead.

**Cost in code.** forge.js gains `startChutes(list)`: the same tick with `load` in place of the period, white instead of orange, the slide's hit and carry in place of `burn`; `noise(x, z, v)` called from one place in skills.js `useSkill` (:171) and from the foes' moves; the cornice mesh. About 2.5-3.5 days with its scenario (`chute`: a load filled by each class's skills, a pack carried and Dazed, a roll through the front).

### 2.3 The Name-cairns (Οι Ονοματόπετρες): world.js shrines + the Names she says

**What exists.** A shrine is an interact that gives one of a few timed buffs once a visit (world.js:192-201, `useShrine` :493, `shrineSpent` :503); a co-op guest uses its own (coop.js:1523 `GUEST_OK`).

**The one new input: a cairn has no buff of its own. It gives back what the hero brought.** A Name-cairn is a traveller's cairn with a wind-bell. Touching it («Φώναξε τα ονόματα» / "Call the names", instant) puts her into **the Call** for 20 s: each Name she says (up to three; Progression) is played in its *called* form for that time. The called forms are listed with the Names. A hero who says no Names yet gets the plain `shrineFury`.

**Rules.**
1. One Call a cairn a visit, as a shrine. Twelve cairns in the act (five on the Ridge, seven on the Saddle), each placed before a named fight: a champion's ledge, a chute crossing, an edge shelf.
2. **In a boss arena the cairn re-arms** on the fight's own beat: when the Chief's fire is relit, when Gremos kneels. The bell rings and a blue circle shows round it. That is the fight's planned burst, and it is the same 20 s for every class.
3. A cairn is a lee cell and a warm pool of 2 m: calling the names is never punished by the wind.
4. The seven wind-bells of the optional find (below) are seven cairns whose bells are gone: they do nothing until their bell is found and hung.

**The first minute.** The first cairn stands at the Ridge's fourth pack, a champion pack on a shelf. A toast the first time: `q.cairn` «Οι ταξιδιώτες άφησαν πέτρες και κουδούνια. Πες τα ονόματά σου εκεί.» / "The travellers left stones and bells. Say your names there."

**Cost in code.** A `cairn7` interact kind beside `shrine` (world.js), the Call as one buff (`pl.buffs.call`) that names.js reads, the bell's sound and mesh. About 1 day; the weight is in the Names.

### 2.4 Difficulty: what each level does (`HAZ7`, data.js, beside `HAZ6` at :52)

| | Wanderer | Warden | Hero | Nightmare | Ash | Skotos |
|---|---|---|---|---|---|---|
| monster life / blows (existing `DIFFS`) | 0.65 / 0.55 | 1 / 1 | 1.9 / 1.55 | 3.6 / 2.4 | 7 / 3.8 | 11 / 5.4 |
| **a heavy blow** (share of her life before armour) | 14% | 26% | 32% | 38% | 46% | 54% |
| **a boss's heavy blow** | 16% | 30% | 36% | 42% | 50% | 58% |
| gust every / length | 34 s / 5 s | 26 / 6 | 26 / 6 | 24 / 7 | 22 / 7 | 20 / 8 |
| hero's drift in a gust | 1.0 m/s | 1.5 | 1.5 | 1.7 | 1.9 | 2.1 |
| Cold gains (`HAZ5`'s column) | ×0.8 | ×1 | ×1 | ×1.15 | ×1.3 | ×1.45 |
| a slide on the hero | 6% | 12% | 14% | 16% | 20% | 24% |
| chute load from foes | ×0.5 | ×1 | ×1 | ×1.2 | ×1.4 | ×1.6 |
| gap between a boss's moves (`bossCd`) | ×1.4 | ×1 | ×1 | ×0.9 | ×0.85 | ×0.8 |
| **moves a boss has** | one fewer a phase | all | all | all | all, and two may overlap in the last phase | the same |
| adds per boss call | −1 | +0 | +0 | +1 | +1 | +2 |
| rings and fronts (speed) | ×0.8 | ×1 | ×1 | ×1 | ×1.1 | ×1.15 |
| telegraph durations | ×1.25 (owner question 3) | never change | | | | |

- **Heavy blows are shares, not multiples.** At the cap a monster's ordinary blow is about 215 × its `dmg` before armour (data.js:368 at level 50) against a life of several thousand: chip, which the report shows she out-heals. So each Act VII foe has **one heavy move** whose size is `HAZ7.heavy` of her life *before* armour, block and Names (not `pure`: toughness still pays). On an average-armoured hero at Warden that lands for about 13-16%; on a shield Warden about 10%. `DIFFS.dmg` does not multiply it (the row is the whole scaling), so «Σκότος» difficulty is 54%, not 26% × 5.4.
- **Wanderer is a different fight,** not a smaller number: half the heavy share, a move fewer, a 40% longer gap, slower rings. The G3 gate: lives of damage on Wanderer ≤ 50% of Warden's, and lowest life ≥ 70%, for every class at both bosses.
- The Act VI cap of 11% a blow does not apply (combat.js:166 tests `G.zone?.act6`). The check instead: no single blow over 35% of her life after armour for the reference hero on Warden; over 60% on «Σκότος».

---

## 3. Enemies

Seven entries. Each is one question, has **one heavy move** (the `HAZ7.heavy` share; telegraph ≥ 0.9 s; red), and otherwise deals ordinary blows. Life and blows are the usual multipliers on the level curve (data.js:367-368). All are `flesh: 'flesh'` unless noted; none is `unlit`, `shroud` or `unseen`; none takes a button away; every one is aimable at all times (fliers hang low, as the Skua does today).

| # | kind | name | body (shipped) | ai verb reused | life / blows / speed | new trait | the question |
|---|---|---|---|---|---|---|---|
| 1 | `windbreak` | «Ανεμοφράχτης» / "Windbreak" | goblin (data.js:123), a code hide shield (`shield`, as `ashSpear`'s, data.js:163) | `melee` (ai.js:353) with `guard { arc: 1.05, k: 0.25 }` and `bashEvery: 3` | 1.5 / 1.0 / 3.6 | `leeOf: 2.5` | positioning |
| 2 | `kiter` | «Αετοτοξότης» / "Kite-archer" | goblinArcher (data.js:124) | `skirmisher` (ai.js:687) without the trees | 0.8 / 0.9 / 4.4 | `upwind`, `volleyEvery: 3` | positioning |
| 3 | `windcaller` | «Ανεμοκράχτης» / "Wind-caller" | goblinShaman (data.js:125) | `caster` (ai.js:414); the channel and its break are `drinkerAI`'s (ai.js:1034) | 1.0 / 0.8 / 3.8 | `gustCall { t: 2.5, len: 12, w: 4 }` | target priority |
| 4 | `ridgeWolf` | «Λύκος της Ράχης» / "Ridge Wolf" | warg (data.js:126), white-grey tint | `pounce` (ai.js:434) | 0.9 / 1.0 / 6.8 | `stalk` | positioning, timing |
| 5 | `saddleTroll` | «Τρολ του Διάσελου» / "Saddle Troll" | troll (data.js:130), rimed, ×1.25 | `brute` (ai.js:452) and `lob` (ai.js:1857) | 7 / 2.6 / 3.4 | `boulder`, `loud: 30` | timing, resource |
| 6 | `rimeBear` | «Πάγαρκτος» / "Rime Bear" | reused (data.js:186) | `charger` (ai.js:640) | as shipped: 3.6 / 1.9 / 5.6 | reads the wind (no data change) | positioning |
| 7 | `skua` | «Ληστόγλαρος» / "Skua" | reused (data.js:187) | `bat` (ai.js:498) | as shipped: 0.3 / 0.45 / 7.5 | reads the wind | timing |

### 1. Windbreak: where is its back?
- A goblin behind a hide shield as tall as it is. From the front it takes ×0.25 (the shipped `guard`, combat.js `actHit`). Its shield is a **moving lee**: the 2.5 m behind it count as lee cells while it lives, so the archers behind a line of Windbreaks are not blown about and their arrows are not slowed.
- **Heavy move:** the shield rush (the shipped `bashEvery` dash, 1.0 s cone telegraph): a heavy blow and a push of 5 m, doubled downwind.
- **The wind's answer:** at the start of every gust a Windbreak facing within 60° of upwind has its shield torn round: guard broken for 4 s (`breakGuard`, combat.js:324). A knock from behind during a gust sends it over an edge like anything its size.
- **Affixes:** `armored` on a Windbreak champion pack is the act's wall (×0.72 on top of the guard): the answer is the flank or the gust, never the front. `fast` makes the rush hard: its telegraph does not shorten (ai.js:316 shortens the swing; the cone's own time is the move's).

### 2. Kite-archer: who is upwind?
- It walks to the upwind side of its target at 9-11 m and stays there (a `skirt`, ai.js helper, biased by `L.wind`). Downwind its arrows are fast and long, and every third shot is a **wind volley**.
- **Heavy move:** the volley: three arrows down one 14 m line, 0.9 s red line telegraph, one heavy blow if it lands (not three). Upwind of the hero it cannot volley at all: its arrows fall short at 10 m.
- **The answer:** get upwind of it. For a Ranger or a Mage this is the whole duel; for the Warden a downwind Leap (11.7 m) reaches it from where it thought it was safe.
- **Affixes:** `teleporter` Kite-archers blink back upwind; `frozen` orbs drift with the wind like any shot.

### 3. Wind-caller: kill this one first
- It stands at the back and **calls a gust of its own**: 2.5 s channel, a white 12 × 4 m lane drawn from it toward its target (the pull telegraph's shape in white). If the call finishes, that lane has a 5 s gust blowing *toward the hero's side* whatever the zone's heading: her shots up it fall short, the pack's fly, she drifts back, and any chute the lane touches takes 25 load.
- **Breaking it:** a stun, a freeze, a fear, or one hit worth 6% of its life (the Lampbearer's rule, data.js:200 comment and ai.js:1034). Broken, it is Dazed 2 s.
- **Heavy move:** none of its own: its call makes everyone else's heavy move land. It is the pack's priority, exactly as the Lampbearer was, without the light.
- **It also snuffs.** Out of a fight, a Wind-caller within 14 m of an unwalled fire walks to it and puts it out (the Smoke-eater's `snuffer` approach, ai.js:2693, the channel only). A fire out is relit with a 1 s touch.

### 4. Ridge Wolf: it comes with the wind
- Packs of four. A wolf circles to the upwind side and pounces from there: with the wind its pounce starts at 3.5-9 m instead of 3.5-7 m, and the snow streaks hide the first half of its run (it is never invisible: the telegraph is drawn at full strength).
- **Heavy move:** the downwind pounce, 0.9 s red line telegraph along its path, a heavy blow. An upwind pounce is an ordinary bite.
- **The answer:** put a rock or an edge on your upwind side. A wolf that pounces at a hero with a wall behind her lands Dazed for 1 s (the charger's wall rule, ai.js:640-686, given to the pounce).
- **Affixes:** `horde` makes six; `vampiric` wolves heal on a landed pounce (combat.js:178) and nothing else: a pack that never lands one starves.

### 5. Saddle Troll: a danger and a tool
- **Heavy moves** (it is the one entry with two, never inside 4 s of each other): the slam (every third blow, the shipped 'brute' cone, 1.2 s) and the **boulder**: at 8-14 m it lobs a rock (1.2 s red circle, r 2.2). So it asks the ranged classes for a dodge as often as it asks the Warden for one.
- **It is loud:** each slam and each boulder adds 30 to nearby chutes. A troll under a cornice brings it down on its own pack in three or four moves, or on the hero, depending on who is in the lane. Baiting its slam in a chute is the act's best trick.
- Too big to drift or to fall off an edge; a slide takes 35% of its life and Dazes it.

### 6. Rime Bear: where does the charge end?
- As shipped. The `charger` already ends Dazed against a wall. In the wind: a downwind charge runs 30% farther and 20% faster; an upwind charge is ordinary; a charge that ends against a wall adds 40 load to a chute within 12 m; its roar (`frostRoar`, +15 Cold) carries twice as far downwind.
- **Heavy move:** the charge (the shipped 1.0 s rear-up, a red line).
- **The answer:** stand so that downwind of you is a wall. It is big: it never goes over an edge.

### 7. Skua: when do they hang?
- As shipped (`float`, `coldBite: 3`, a burst of feathers). They cannot fly upwind in a gust: for six seconds a flock downwind of the hero hangs in the air, flapping, easy to shoot; a flock upwind arrives 50% faster.
- **Heavy move:** none. They are the act's one chip enemy, kept for the Cold they carry (3 a bite) and because a flock arriving on a gust while a troll winds up is the kind of two-things-at-once the act wants. Never more than six at a time.

### Packs (data.js `PACKS`)
| tag | made of | where | plays as |
|---|---|---|---|
| `shieldLine` | 3 Windbreak, 2 Kite-archer (a `PACK_LINE`, data.js:308: they spawn in a row facing the road) | the Ridge's shelves | a wall with archers in its lee: flank it, or wait for the gust to turn the shields |
| `callers` | 1 Wind-caller (the `PACK_LEAD`), 2 Windbreak, 2 Kite-archer | both zones | break the call or fight the whole pack upwind |
| `wolves` | 4 Ridge Wolf | open snow, both zones | find a wall for your upwind side |
| `trollGang` | 1 Saddle Troll (lead), 3 Windbreak | under chutes | the troll's noise is your slide or theirs |
| `bearDen` | 1 Rime Bear (lead), 2 Ridge Wolf | the Saddle's hollows | two kinds of rush from two sides |
| `flock` | 5 Skua | edges and the crest | shoot them while they hang |
| `host` | 2 Windbreak, 2 Kite-archer, 1 Wind-caller, 1 Saddle Troll | the Third Fire's approach, the crest | the act's exam |

### How a pack plays for each class (the `callers` pack on an edge shelf, a gust due in ten seconds)
- **Warden.** Charges the Wind-caller through the gap (Charge 2.2× breaks the call), turns so the pack is downwind of him, and holds his heavy skill. When the gust starts the shields tear round; Earthsplitter's doubled knock throws both Windbreaks and an archer off the shelf. He was hit by one shield rush on the way in (about 10% of his life).
- **Ranger.** Vaults upwind of the pack, puts the wolf on the Wind-caller (the wolf's bites are over 6% of its life in two: the call breaks), and shoots with the wind: Piercing Shot at 29 m, +15%, through the line from behind where the guard does not count. If she stays downwind instead, the archers out-range her and the volley finds her.
- **Mage.** Chain Lightning on the Wind-caller breaks the call (a jump is enough). Frost Nova freezes the Windbreaks where they stand, on the edge; he blinks upwind and waits two seconds for the gust: the frozen foes thaw into the push and go over. If he opens with Meteor under the cornice he did not look at, the slide takes 12% of his life and carries him into the pack.

### Affix interplay with the act's rules (ai.js:2091-2108)
- `teleporter`: blinks **upwind** of the hero in a gust (one line in the affix's blink).
- `molten`: its fire patches are warm pools: lee and −8 Cold a second (light.js `fireAt`, :86) for a hero bold enough to stand in the pack's own fire between its ticks.
- `frozen`: the frost orb is a shot: it drifts and speeds with the wind.
- `thunder`: a thunder strike is noise: 20 load.
- `shielding`: its 2.5 s of invulnerability also holds it against the wind and the edge.
- `fast`, `vampiric`, `horde`, `armored`: as shipped.

---

## 4. Bosses

**Rules for both** (the campaign's lessons, written as the fights' law):
1. **Two to four minutes** for the bot's reference hero at level 50 on Warden: the Chief 110-170 s, Gremos 160-240 s. Wanderer at 70-90% of that.
2. **No least times.** No `*_MIN` table, no `bossMin` column. A phase's `hpFloor` (actors.js spawn, ai.js `boss()` :2556-2566) is set at the phase's threshold and **lifted when the phase's first move has fired** (one line in `onPhase`'s move): a burst cannot skip a phase's opening, and nothing else is held back. A hero twice as strong kills twice as fast.
3. **Every move is telegraphed ≥ 1.0 s,** hits once, and is a heavy blow or nothing. No ticking auras, no status that deals damage over time except the Cold the wind brings.
4. **At most two big telegraphs at once,** and the environment (a gust warning, a groaning chute) counts as one (Act VI's rule 5, docs/act6-design.md:1474).
5. **One window a phase,** announced by the cairn's bell, the same 20 s for every class.
6. **A boss never leaves the screen and is never untouchable** for more than the 1.2 s of a leap's arc.
7. **Fail-safes:** a fire the party cannot relight relights itself after 20 s; a wedge nobody breaks cracks on its own after 25 s; a boss with no hero in its arena for 8 s walks home and heals nothing.

### 4.1 The Lame Chief (Ο Κουτσός Αρχηγός)

`chief: { model: 'goblin', hp: 240, dmg: 2.0, speed: 2.9, radius: 0.5, ai: 'chief', reach: 3.4, atk: 'heavyStab', atkTime: 1.4, flesh: 'flesh', xp: 300, boss: true, weapon: 'spear', style: 'heavy', sfx: 'goblin', dieClip: 'kneel', look: { scale: 2.3, rim: 0xd8e8ff, rimI: 0.3 } }` (life to be set by the bot to the band; the Tower's 170 falls in 35-106 s for the same hero, balance-report.md).

**Arena:** the Third Fire's terrace, r 16, the peak fire at its centre (a warm pool of 5 m once walled; the hero walls it in q41 or, if she skipped that, at the fight's start with the same 2 s touch). Wind from the north-west. Three lee rocks. Two chutes down the north slope across the terrace's north third. One cairn at the south rim. An edge along the east side.

**Phase 1, the Shield-line (100% to 60%).** He stands behind four Windbreaks in a line and commands with a horn.
| move | telegraph | what it is | Warden | Ranger | Mage |
|---|---|---|---|---|---|
| **Volley** (one horn note) | 1.4 s, three red lines 4 m apart, each 20 × 1.5 m, aimed at the hero wherever she is | his archers at the rim fire down the wind; one boss heavy blow to anyone on a line | step between lines (they are 4 m apart; no roll needed) | the same | the same |
| **Advance** (two notes) | 1.2 s, a red band 12 m wide moving 6 m forward | the line rushes: a boss heavy blow and a 5 m push | roll through it, or be on its flank | out of reach at over 8 m | out of reach, or blink through |
| **Hook** | 1.0 s red cone, 3.5 m | his pole: an ordinary blow ×1.5 | sidestep | never reaches her | never reaches him |
- The line's guard is the Windbreak's: front ×0.25. It breaks for 4 s at each gust (26 s cycle, so about two gusts in this phase), or to a slide (the north third), or to a flank.
- He himself is never guarded. The Warden reaches him by Leap over the line (9 m, 11.7 m downwind); the Ranger by Piercing Shot (pierces the line; `breakGuard` already on it, skills.js:355); the Mage by Meteor or Chain Lightning's jumps.

**Phase 2, the Snuffing (60% to 25%).** The line is called off. Two Wind-callers come to the rim (three on Nightmare and up), and he limps for the fire.
| move | telegraph | what it is | every class |
|---|---|---|---|
| **Snuff** | 3.0 s, a violet circle at the fire and a channel line from him | if it finishes the peak fire goes out: the warm pool is gone, gusts come every 12 s, and his blows are heavy ×1.15, until someone relights it (1 s touch at the fire; a guest may) | a hit worth 3% of his life during the channel breaks it and **Dazes him 4 s**: this is the phase's window, and the cairn's bell rings as he staggers |
| **Volley** | as above | | |
| **Whistle** (once, at 45%) | 1.5 s, three red lines from the upwind rim | three Ridge Wolves pounce in from upwind | have a rock upwind |
| **Called gust** (the Wind-callers') | 2.5 s white lane | as the enemy's, toward the fire | break the call, or let it be and fight in the fire's lee |
- The fire is the phase's whole question: a party that guards it has a warm, still island to fight from; a party that lets it go out fights in a permanent gust until someone takes a second to relight it. **Relighting re-arms the cairn** (once a fight).

**Phase 3, Alone (25% to 0).** His host runs. He blows the horn of the wind.
| move | telegraph | what it is | Warden | Ranger | Mage |
|---|---|---|---|---|---|
| **The Horn** | 2.0 s: the snow streaks swing through a quarter turn, an arrow on the ground shows the new heading, both chutes groan (2.8 s white lines) | the wind turns 90° for 12 s and both chutes come down | be behind a rock **for the new heading** when the slide passes | the same | the same; a blink through the front also passes |
| **Three hooks** | 0.5 s each, cones (the shipped `comboStep`, ai.js:2548) | ordinary blows, the third a heavy | roll the third | he closes at 2.9 m/s: walk | walk or blink |
| **Volley** | as above, two lines only | he fires it himself | | | |
- The slide Dazes *him* too if he is in the lane (4% of his life, 2 s): a hero who draws him north before the Horn makes his own weapon her window.

**Class fairness (the count of heavy moves aimed at each range band, a full fight on Warden, by design).**
| | at the hero wherever she stands | only within 6 m of him or his line | only beyond 8 m |
|---|---|---|---|
| Phase 1 (about 45 s) | Volley ×3 | Advance ×2 | none |
| Phase 2 (about 55 s) | Volley ×2, wolves ×1 | Snuff's aftermath if it lands | called gusts ×2 (they starve a shooter, not a swordsman) |
| Phase 3 (about 35 s) | the Horn ×1, Volley ×2 | third hook ×3 | none |
- Nine of the fight's about fourteen heavy moves find the hero at any range. The five melee-only ones are the price of the Warden's uptime; the two ranged-only ones (the called gusts) cost the shooter damage dealt, not life. Target blows landed for the bot: Warden 9-13, Ranger 8-12, Mage 8-12. The Act VI figure was 81-146 for all and 2-4× the damage for the ranged.

**By difficulty.** Wanderer: Volley has two lines, no Whistle, Snuff takes 4 s, the Horn turns the wind for 8 s and brings down one chute. Nightmare and Ash: a third Wind-caller; a Volley may overlap an Advance. «Σκότος»: the wolves come in both later phases.

**Co-op.** Life ×`COOP.boss` (data.js:19). Volley's lines are aimed at up to three different heroes (one each). The fire's relight and its windbreak are guest-usable (`USE_U`). Each hero has her own Call at the cairn each time it arms.

**The echo** («Φύσα το βούκινο» / "Blow the horn", at the horn left on the Third Fire's wall, after `act7`): the wind blows from the opposite quarter, so every lee rock is on the other side of where the player learnt it, and the fight opens in Phase 2 with the fire already out. Toasts `echo.rise7` «Το χιόνι θυμάται τη μάχη...» / "The snow remembers the fight..."; `echo.done7` «Η ηχώ σβήνει. Το χιόνι θα θυμηθεί ξανά αύριο.» / "The echo fades. The snow will remember again tomorrow."

### 4.2 Gremos, the Last of the Stair (Γκρεμός, ο Τελευταίος της Σκάλας)

`gremos: { model: 'troll', hp: 320, dmg: 2.2, speed: 2.2, radius: 1.1, ai: 'gremos', reach: 7, atk: 'smash', atkTime: 2.0, flesh: 'stone', xp: 380, boss: true, big: true, sfx: 'golem', dieClip: 'kneel', look: { scale: 3.2, tint: 0x9aa4b0, tintAmt: 0.8, rim: 0xe0f0ff, rimI: 0.35 } }` (3.5 m of radius at ×3.2; the Skotos is ×3.2 and the Tower ×4, data.js:194-195). Three **wedges** are nodes on him (`ai: 'node'`, as `skotosHand`, data.js:196): each has 3% of his life, one at each knee and one between the shoulders, reached from behind.

**Arena:** the Shoulder, r 18, bare rock. The steady wind is from the north. Four chutes come down onto it from the head above (N, NE, NW, and a long one W). Two lee rocks at the start. One cairn at the south rim. No edge the hero can be harmed by.

**The fight's shape.** His life bar is his pain. At 70% and at 35% he **kneels** for 6 s (Dazed, ×1.5, the shipped `dazed` vulnerability, combat.js:276) and a wedge shows a bright rim; breaking it ends the kneel early with a stagger worth 5% of his life, and the cairn's bell rings: the Call. A wedge nobody breaks cracks by itself after 25 s. At 0 he does not die: he sits (`dieClip: 'kneel'`), the third wedge falls out, and the story takes over.

**Phase 1, Rising (100% to 70%).**
| move | telegraph | what it is | Warden | Ranger | Mage |
|---|---|---|---|---|---|
| **Stomp** | 1.2 s, a red circle r 5 at his feet; then a white ring 1 m thick runs out from r 5 to r 16 at 9 m/s | the circle: a boss heavy blow. The ring: half a heavy blow and a 3 m push, to anyone it crosses who is not in the air or behind a rock. 100 load to the chute nearest his foot | leave the circle, roll the ring (it reaches him 0.1 s after the circle) | roll the ring (it reaches her at 12 m after 0.8 s) | blink over the ring |
| **Boulder** | 1.3 s, a red circle r 3 on the **farthest** hero (it prefers one beyond 8 m) | a boss heavy blow; the boulder **stays 30 s as a rock**: a lee, and cover from slides and rings | (not aimed at him in solo unless he backs off) | walk out; she has just made the party a rock | walk or blink out |
| **Sweep** | 1.1 s, a red cone of 150°, reach 7 m | a boss heavy blow and a 6 m push, doubled downwind | roll through, or stand behind his heel (the back 210° is safe) | out of reach | out of reach |
- In solo the Boulder falls on a Warden too, whenever he is the farthest hero there is: at over 5 m, or every third time regardless.

**Phase 2, Shrugging (70% to 35%).** As above, and:
| move | telegraph | what it is | every class |
|---|---|---|---|
| **Shrug** | 1.5 s (he rolls his shoulders, snow falls from his head), then two of the four chutes groan for the usual 2.8 s | two slides across the Shoulder | stand behind a rock or a boulder in each lane, or between the lanes; roll or blink through a front. A hero who was given no boulder has the two lee rocks |
| **Wedge-crew** (once, at 55%) | 1.5 s, three red lines from the north rim | a `host` pack climbs onto the Shoulder: 2 Windbreak, 2 Kite-archer, 1 Wind-caller | the Shrug's slides take 35% of them; or fight them with the wind |

**Phase 3, Standing (35% to 0).** Stomp, Boulder, Sweep, Shrug (three chutes), and:
| move | telegraph | what it is | every class |
|---|---|---|---|
| **Clap** | 1.5 s, a white circle r 14 round him with arrows pointing out | no damage: everyone inside is thrown 7 m outward and every hero's drift is doubled for 4 s. It is always followed 2.5 s later by a Stomp | be near a rock or a boulder (they stop the throw), or use the 2.5 s to get back in or stay out, by class |

**Class fairness (heavy moves by range band, a full fight on Warden, by design).**
| | at the hero wherever she stands | only within 7 m | only beyond 8 m |
|---|---|---|---|
| Phase 1 (about 60 s) | Stomp's ring ×3 | Stomp's circle ×3, Sweep ×2 | Boulder ×3 |
| Phase 2 (about 70 s) | ring ×3, slides ×2 (two lanes each) | circle ×3, Sweep ×2 | Boulder ×3, the crew's Volley-shots |
| Phase 3 (about 60 s) | ring ×4, slides ×2, Clap ×2 | circle ×4, Sweep ×2 | Boulder ×3 |
- A swordsman is asked about 16 melee-only questions and 19 shared ones; a shooter 9 ranged-only and the same 19. The melee-only ones are slower and plainer (a circle at a giant's foot); the ranged-only one, the Boulder, pays the party back with cover. Target blows landed: Warden 11-16, Ranger 10-15, Mage 10-15; the ±30% gate applies.
- **Why a Mage is not the hardest cell this time.** In Act VI the Mage's worst numbers came from many small blows on low armour (5.66 lives a fight after the fixes). Here a heavy blow is a share of *her own* life, so low armour costs him about 15% a blow against the Warden's 10%, not 2-4×; and blink clears the ring, the slide's front and the Clap.

**By difficulty.** Wanderer: no Clap, no Wedge-crew, Shrug brings one chute, the ring runs at 7 m/s. Nightmare and Ash: the crew comes twice; in Phase 3 a Boulder may be thrown during a Shrug. «Σκότος»: boulders last 15 s.

**Co-op.** Life ×`COOP.boss`. Boulder is thrown at the farthest hero and, with three or four heroes, a second at the nearest shooter 1 s later. A guest may break a wedge (it is a monster: the shipped blow event `h`). The cairn's Call is each hero's own. A downed hero in a slide's lane is moved to the lane's edge (Act VI's rule for the black water, docs/act6-design.md:1449).

**The echo** («Θυμήσου τον Γκρεμό» / "Remember Gremos", at his open hand, after `act7`; he sleeps on beside it: an echo is a memory, canon §4 rule 19): the echo rises already in Phase 2, and its boulders shatter on landing (no cover left behind): the fight where the two lee rocks are everything.

---

## 5. Progression at the cap

### 5.1 What the complaint is, in numbers
- A hero has 49 points at level 50 and one more per Mastery level (progression.js:41). Ranks and variants take at most 36 (docs/progression/README.md, Numbers). Everything else goes into thirteen tracks of percentages (progression.js:9-25), where a rank is +2.5% at best and less each time.
- That is the whole of "nowhere meaningful to go": the points *can* be spent, but no purchase after level 37 changes how the hero plays. And the newest track, Lamplight, could not be shown to do anything measurable (balance-report.md, G3's lines).
- The Shade's MIRROR read all 21 skills (ai.js:5556), but the hero's own build still had only one decision after the loadout: Might or Vigor.

### 5.2 The Names (Τα Ονόματα): one new layer

**In one sentence:** the hero says three Names every night; each Name is a rule about how she fights; slots and depths are bought with the same points as skills and Mastery.

**What the player sees.** A third tab in the skills panel (`src/ui/progpanel.js`), «Ονόματα» / "Names", beside Skills and Mastery. At its top, three slots under the line `names.h` «Τρία ονόματα κάθε βράδυ» / "Three names every night". Below, every Name as a tile: learnt (lit), not yet learnt (dark, with the deed that teaches it in one line), deep (a second flame). Tap a tile for its text and its buttons: Say (into a slot), Deepen.

**Rules.**
- **Learning** a Name is a deed in the world (the table below), never a purchase. Three are given at q40 to every hero.
- **Saying.** Slot 1 opens at q40, free. Slot 2 costs **6 points**; slot 3 costs **12**. Which Names are said can be changed **in town only**, at the beacon («Πες τα ονόματα» / "Say the names"), free, as variants are (docs/progression/questions.md, 3).
- **Depth.** Each Name has two depths: **Kept** (as learnt) and **Deep** («Βαθύ», **8 points**), which adds a second clause. Deepening is permanent until a respec.
- **Calling.** At a Name-cairn every said Name plays in its called form for 20 s (Mechanics 2.3).
- **Points.** A full build of three deep Names is 6 + 12 + 24 = **42 points**; every Name deep is 18 + 96 = 114. `pointsSpent` (progression.js:42-48) counts them; `respec` (:100) gives them back and keeps what was learnt.
- **A free respec at q40** («Η Χάλντα τρόχισε ό,τι ήξερες» / "Halda has put a new edge on what you knew"), once per hero: a level-50 hero who spent 13 spare points on Might and Vigor can afford slot 2 on the first night without paying 30 100 gold (progression.js:50 at level 50).
- **What it costs against the old sinks.** Eight points of Might from rank 0 are +18% damage always. A deep Name is worth more than that *when the hero plays its way* and nothing when she does not. That is the trade the owner asked for.

**The twelve Names.** Numbers are first proposals; the bot sets them (Balance plan: each within its band, or cut).

| Name | learnt by | Kept | Deep (8 points) | Called (20 s at a cairn) |
|---|---|---|---|---|
| **Άρνας** / Arna «Για να μην ξεχάσει κανείς.» | q40 (every hero) | **The first fire.** Your first hit on a foe at full life deals +40% | a foe that dies within 4 s of your first hit on it gives back 15% of the cooldown of the longest-cooldown skill on your buttons | every foe counts as at full life once every 3 s |
| **Ίσαρν** / Isarn «Ξεκουράσου.» | q40 (every hero) | **Rest.** Your flask's cooldown is 12.5 s, not 18 (data.js:448), and for 4 s after drinking you take 25% less | a flask drunk above 60% life leaves what it could not heal as a shield for 8 s (`pl.shield`, combat.js:168) | the flask's cooldown is 6 s |
| **Φέρουσα** / Pherousa «Ό,τι κουβάλησες, σε κουβαλά.» | q40 (flag `act6`) | **She who carries.** While your Fury, Energy or Mana is at 70 or more: +18% damage | and your skills cost 15% less while it is | it cannot fall below 70 |
| **Έιναρ** / Einar | the four Name-stones of Act V (`flags.remembered`, stats.js:29) | **The Farthest Light.** Hits on a foe more than 9 m away: +20% | a critical hit from beyond 9 m leaves it Revealed for 2 s (`addVuln`, combat.js:304: ×1.25 from everyone) | every foe counts as far |
| **Ίβαρ** / Ivar | his echo beaten once after q40 | **The post.** Each second you stay within 1 m of where you stood: +6% damage and −5% damage taken, up to four times; moving 3 m ends it | at four you cannot be pushed, pulled or drifted, and a blow does not break your channel | you are at four, and moving does not end it |
| **Κήυκας** / Keyx | his lantern hung at the Landing (`flags.landing6`) | **Low over the water.** After a dodge, your next hit within 2 s deals +60% | a dodge that passes through a blow (it would have landed: combat.js:146) has no cooldown and gives +25% speed for 3 s | your dodge's cooldown is halved |
| **Άσγκερ** / Asger | freed among the Lost (story.js:2283) | **The weave.** Each skill you use that is not the one before it: +10% damage, up to three; using the same skill twice running ends it | at three, your basic attack gives twice the resource | you are at three, and nothing ends it |
| **Φλαμουριά** / Linden | the three verses of the Long Sorrow (`tear_planting`, `tear_sorrow`, `tear_breaking`; wake.js:23) | **Rooted.** What you leave on the field (pets, traps, rains, storms, wards, rifts, burning ground) lasts 30% longer and deals +15% | while two or more of them are out, you regain 1.5% of your life a second | they act twice as often |
| **Αμαράνθη** / Amaranthe | her echo beaten once after q40 | **Unfading.** Healing past full life becomes a ward, up to 15% of your life, fading 2% a second | while the ward holds: +12% damage | the ward's cap is 40% |
| **Δούργκαν** / Durgan | the Molten King beaten again after q40 (he rises at the hero's level + 1, world.js:416) | **The forge.** Each skill adds 1 Heat (up to 10; it cools after 2 s without a skill): +2.5% damage each. At 10 you burn for 1% of your life a second | at 10 your hits burst for 30% in 2 m (twice a second at most) | Heat is 10 and does not burn you |
| **Ωρείθυια** / Oreithyia | q43 (the keeper's ledger) | **Weather.** Your move speed bonus is also damage: +1% for each 2% (up to +20%), and gusts do not drift you | after 12 m without stopping, your next hit deals +50% and knocks back 4 m | +30% move speed |
| **Κάποιος** / Someone «Κάποιος θυμήθηκε πως ήταν κάποιος.» | three of the forgotten freed in the Shadow Gates (`gateFound` ≥ 3; story.js:2648-2654, `q.gateFound`) | **Someone.** Once every 90 s, a blow that would kill you leaves you at 1 life and untouchable for 2 s | when it does, you heal 30% and your flask is ready | it is ready again |

- **No Name is a flat percentage.** Each names a way to play and pays only for it: opening (Arna), drinking (Isarn), holding back (Pherousa), distance (Einar), standing (Ivar), dodging (Keyx), rotating (Asger), placing (Linden), over-healing (Amaranthe), spamming (Durgan), moving (Oreithyia), surviving (Someone).
- **Three pairs fight each other on purpose:** Ivar against Keyx and Oreithyia (stand or move), Pherousa against Durgan (hold or spend), Arna against Linden (burst or leave things out). Saying both of a pair is allowed and wasteful: the choice is real.
- **They make old points worth more.** Oreithyia turns Stride into damage; Amaranthe turns Leech into a ward and the ward into damage; Asger and Pherousa make Wellspring matter; Isarn and Someone are bought instead of Vigor, not on top of it.
- **The living are not on the list** (Leif, Elati, Halda), nor the one name the game forbids. Durgan and Amaranthe are said as who they were before the crown.

**Two builds per class** (three deep Names each, 42 points; the rest in skills and Mastery).

| class | build | says | buttons | plays as |
|---|---|---|---|---|
| Warden | **The Post** | Ivar, Amaranthe, Isarn | Ember Dance (Whirlwind), Challenge (War Cry), Bulwark, Dawnbreaker | plants himself, taunts the pack onto him, spins in place at four stacks; Leech fills the ward, the ward adds damage; cannot be drifted. Mastery: Leech, Iron. Hates the Boulder: every step costs the stacks |
| Warden | **The Gale** | Oreithyia, Keyx, Arna | Charge, Twin Leap, Earthsplitter, War Cry | never stops: Charge in (12 m run: +50% and a knock), roll, hit for +60%, Leap to the next foe at full life for +40%. Throws packs off edges. Mastery: Stride, Might. Dies to anything that roots him |
| Ranger | **The Far Shot** | Einar, Arna, Pherousa | Siege Bolt (Piercing Shot), Snare, Vault, Spirit Wolf | stays beyond 9 m and upwind, keeps Energy over 70, and opens every foe with one enormous bolt (+20% far, +40% first, +18% full, +15% wind). Mastery: Ferocity, True Aim. Useless inside 9 m: Vault is the build's life |
| Ranger | **The Warren** | Linden, Asger, Someone | Rain of Fire, Pack (wolves), Storm of Hawks, Snare | four different lasting things, one after another: three stacks of the weave for free, everything lasting 30% longer, regeneration from two or more out. She fights by where she put things. Mastery: Focus, Haste |
| Mage | **The Lighthouse** | Ivar, Pherousa, Einar | Ray of Dawn, Blizzard (Frost Nova), Void Rift, Frozen Orb | stands still at range with the Ray, mana kept over 70 by the cheaper costs; the Rift and the storm hold the pack off. The purest stand-and-channel build the game has. Mastery: Wellspring, Might. Every Stomp ring asks whether he will give up four stacks |
| Mage | **The Kiln** | Durgan, Asger, Keyx | Trident (Fireball), Fork (Chain Lightning), Frost Nova, Meteor Shower | casts without stopping, never the same skill twice, at 10 Heat and three weaves; blinks through blows for a free blink. Burns his own life at full Heat: the Hearth blessing and Leech are the fuel. Mastery: Haste, Leech |

**Cost in code.**
- `src/game/names.js` (new, about 300 lines): the table, `learnName`, `sayName`, `deepen`, the twelve rules as small hooks, the Call. Hooks, one line each in shipped code: `heroHit` (combat.js:35) for the multipliers; the own-blow branch of `damage` (:64-72) for first hits, far hits and Revealed; `hurtHero` (:143-168) for Isarn, Ivar, Someone and the dodged blow at :146; `healHero` (:136) for the ward; `kill` (:489) for Arna's refund; `useSkill` (skills.js:171) for the weave, Heat and the costs; `dodge` (:451) and the flask (:492); the hero's tick (player.js) for the post, Weather and the regeneration.
- progression.js: `pointsSpent`, `respec`, `migrateHero` (:42, :100, :112) take `h.names = { learnt: {}, said: [], deep: {}, slots: 1 }`.
- progpanel.js: the tab. text.js: `name7.*`, 12 × 4 strings.
- **7-8 days** with the `names` scenario (each Name's rule asserted at a dummy) and its balance runs.

### 5.3 Tempering (Στόμωμα): one small gear sink
- **What exists.** Halda reforges an item: every property rolled again, for gold (inventory.js:80-92; `shop.reforge`, text.js:213). A level-50 hero with good gear never uses it: it destroys the three good lines to fix the fourth.
- **The addition.** «Στόμωμα» / "Tempering": choose **one** line of a magic, rare or legendary item. Halda offers two new rolls of that line from the item's own pool (`STATS` by slot, data.js:396-416) beside the old one; the hero keeps one of the three. The item is marked (`tp: <stat key>`): from then on only that line can be tempered again.
- **Price.** Gold: twice the reforge cost, +50% each time that item is tempered. And one **bell-bronze** («Κουδουνόμπρουντζος»), a counter on the hero (`h.bronze`) that drops from Act VII's champions (20%), rares and bosses (1-2), from the Calls, the Vigil and Vowed Gates.
- **Why it is safe.** The line stays one the slot can roll, within its level's range, and the count of lines does not change: `cleanItem` (items.js:109-146) already accepts the result as it is, in saves and from a co-op host. Only `tp` joins `CLEAN_KEYS` (:148).
- **What it gives the endgame:** a reason to keep a legendary with one dead line, a use for gold besides the respec, and a reward (bronze) that is not another item to sort.
- **Cost:** about 1.5 days (the rule, the panel's third column, text).

### 5.4 What Mastery, gear and legendaries get, and what they deliberately do not
| question the brief asked | answer | why |
|---|---|---|
| a new Mastery track? | **no** | thirteen is already more percentages than a player reads; the last one could not be measured. The Names make four neglected tracks (Stride, Leech, Wellspring, Focus) worth buying instead |
| set bonuses? | **no** | they need new item generation, new tooltips, new `cleanItem` rules and co-op checks, and they narrow builds (wear these five) where the Names widen them |
| an attunement or talent layer? | **yes: the Names** | one layer, twelve rules, three slots |
| a second legendary slot? | **nothing to add** | every slot already takes a legendary and every power is read (`s.legs`, stats.js:10, :18) |
| crafting with a vendor? | **yes: Tempering**, at Halda, one line at a time | the smallest change that makes a found item improvable |
| new legendaries? | **the two first-kill ones** (below); three class legendaries from the Twelve Nights chest are a stretch | each new power is a new balance cell |
| a higher level cap? | **no** | Mastery is the cap's tail by design (docs/progression/README.md) |

---

## 6. Post-game and replay: the month after

A capped hero who has finished Act VII has, today, the Shadow Gates and seven echoes. This adds three pieces. All three are **offline-first**: they read the device's date and the hero's own record, write only to the hero's record (so cloud saves carry them as they carry everything else, docs/cloudsave/README.md: the record is synced whole), and need no server, no schedule and no content pushed after release.

### 6.1 Vows (Τάματα): an optional layer on the Shadow Gates
**The canon rule** is that the Gates keep playing as they do (canon §4 rule 18). So: **a Gate entered with no Vow is, byte for byte, today's Gate.** The Gate panel gains one row, «Τάξε κάτι» / "Make a vow", closed by default. A hero may take up to three Vows before she goes down. Each makes the Gate harder in one named way and raises what it pays.

| Vow | Greek / English | what it changes in that Gate | pays |
|---|---|---|---|
| wind | «Τάμα του Βοριά» / "Vow of the North Wind" | Act VII's gusts blow in the Gate (the lee mask is computed for any layout: `leeMask(map, dir)`, the function gen7 uses) | +20% |
| fast | «Τάμα της Νηστείας» / "Vow of the Fast" | her flask's cooldown is doubled (36 s) | +15% |
| host | «Τάμα του Ασκεριού» / "Vow of the Host" | packs are 35% larger (the co-op pack factor's code path, world.js:436) | +15% |
| named | «Τάμα των Ονομασμένων» / "Vow of the Named" | champion packs twice as often, and every champion and rare has one more affix | +20% |
| silence | «Τάμα της Σιωπής» / "Vow of Silence" | she says only her first Name | +20% |
| bare | «Τάμα του Γυμνού Χεριού» / "Vow of the Bare Hand" | her legendaries' powers sleep (their stats stay) | +25% |
| two | «Τάμα των Δύο Φυλάκων» / "Vow of the Two Guardians" | two Guardians of different kinds rise together, each at 65% of a Guardian's life (boot.js:391-393) | +20% |
| haste | «Τάμα της Βιάσης» / "Vow of Haste" | a clock: if the Guardian has not fallen eight minutes after she entered, the Vows pay nothing (the Gate itself is as it was) | +15% |

- **What "pays" means:** experience (so Mastery levels), gold and magic find in that Gate are multiplied by 1 + the sum (three Vows: up to ×1.65); the Guardian drops 1 bell-bronze per Vow; and the hero's **vowed best** is recorded: `h.gateVow = { tier, sum }`, shown on the Gate panel under `gateBest` as `gate.vowed` «Βαθμίδα {0} · με {1} τάματα» / "Tier {0} · under {1} vows".
- **Nothing takes a button away from a player who did not ask:** `silence`, `bare` and `fast` are the player's own promises.
- **Why this is a month of play.** Gate tiers already raise item level (boot.js:372: hero level + tier ÷ 2) and monster life (×1.14 a tier, world.js:447). Vows add a second axis: the same tier, 8 + 28 + 56 = 92 ways. Three of the Vows are the Names system's and the act's own rules, so a build made for the Ridge has a home in the Gates.
- **Cost:** about 3 days (the panel row, eight small rules behind `G.gate.vows`, the payout, the regression check that an unvowed seeded Gate spawns the same packs with the same numbers as before).

### 6.2 The Calls (Τα Καλέσματα): a board at Whitecliff, three a day, no server
- **Where:** a board on the beacon's post beside Isarn's staff («Τα καλέσματα της ημέρας» / "The day's calls").
- **What:** each day three Calls, drawn from tables by a seed that is **the local date** (`YYYY-MM-DD` hashed). Every player in the world gets the same three that day, with no server telling them so; two friends in co-op see the same board.

| kind | example | drawn from |
|---|---|---|
| **a hunt** | «Ένας Ανεμοκράχτης με όνομα, στο Πεδίο της Τέφρας» / "A named Wind-caller, on the Field of Ash": one extra rare pack with two fixed affixes at a seeded pack spot of a shipped zone, at the hero's level | 14 zones × the act's 7 kinds and each zone's own × 36 affix pairs |
| **a memory** | "Ivar's echo, without drinking": an echo fight under one condition (no flask; under three minutes; with one Name; on a harder difficulty's `HAZ` row) | 9 echoes × 4 conditions; the echo's own once-a-day rule is waived for a Call |
| **a descent** | "A Gate of tier 14 or deeper, under the Vow of the Fast" | tiers from the hero's `gateBest` − 3 upward × 8 Vows |

- **What a Call pays:** gold, 1 bell-bronze, and half a Mastery level's experience at the hero's Mastery level (data.js:373), paid once. All three in a day: one **night** is counted.
- **The Twelve Nights.** `h.calls.nights` counts completed days (they need not be consecutive: no streak to lose, no punishment for a week away). At twelve, a chest at the board: the hero **chooses** one of three legendaries for her class at her level, and the count starts again. That is the act's name, played.
- **The clock.** The board reads the device's date. A hero's record keeps the last day it was paid (`h.calls.day`) and the wall-clock time of that payment; a date *earlier* than the stored one shows yesterday's spent board (no new Calls until the clock passes the stamp). A clock set *forward* does get tomorrow's board early: this is a single-player game with private rewards, and this proposal does not pretend otherwise (Risks).
- **Cost:** about 3.5 days (the seeded draw, the three kinds, the board panel, the chest, the `calls` scenario with a faked date).

### 6.3 The Vigil (Η Αγρυπνία): one Gate a week, the same for everyone
- A fourth row on the Gate panel: «Η Αγρυπνία της εβδομάδας» / "This week's Vigil". Its **seed is the ISO week** (so its layout, packs and Guardian are the same for every player that week; `world.js:159` already builds a Gate from a seed and a tier), it carries **two Vows drawn from the seed**, and the hero picks the tier.
- The hero's record keeps her best time and tier for the week and for all time (`h.vigil = { wk, tier, secs, best }`); the Gate's own clear toast already shows the time (boot.js:377-379, `gate.clear`).
- **First clear each week:** one guaranteed legendary roll and 3 bell-bronze. After that it is a course to run again for a better time, alone or with three friends on the same layout.
- No leaderboard: that needs a server and moderation. Two players comparing times by message are comparing the same Gate, which is the point.
- **Cost:** about 1.5 days on top of Vows.

### 6.4 What the month looks like
| week | what a capped player is doing |
|---|---|
| 1 | Act VII; three Names said; the first deep Name; the free respec spent |
| 2 | the deeds for Ivar, Amaranthe, Durgan (old bosses at the cap, with a reason); the wind-bells; the first Vowed Gates; tempering the best items |
| 3 | a second build (a respec, or a second hero); the Calls every day; the first Twelve Nights chest |
| 4 | Vowed tiers past the old best; the Vigil with friends; «Κάποιος» (three of the forgotten found from tier 10 down); Mastery levels come ×1.65 faster under three Vows |

---

## 7. Co-op (up to four)

Co-op is host-led: the world and the story are the host's; each guest's hero, gear, Names and rewards are its own (docs/coop/README.md). Protocol: one bump, `VER` 5 → 6 (coop.js:46).

### What a guest can do in the new mechanics
- **The wind.** The gust clock is the host's, sent as Act V's gusts are (`gust` and `gustWarn` are bus events of the host's zone tick, world.js:1617-1618; **I did not trace how they reach a guest today: stage A verifies and, if they do not, adds two bits to the world state**). The heading and the lee mask are the layout's: every page computes the same ones from the seed, so they cost no bytes. Each page drifts its own hero; the host drifts the monsters (guests see it through the puppets' positions).
- **Edges.** A guest's knock is already the host's to apply (the blow event `h` carries `kx`, `kz` and the `OPT_NUM` options, coop.js:757, :811); the host decides whether the foe went over. The reward goes to everyone within 50 m, as any kill's (coop.js `reward`).
- **Chutes.** Load is the host's. A guest's noise is sent on the existing `ic` event as a new op `n`: `[x, z, v]`, within 28 m of its stand-in, `v` ≤ 50, at most 6 a second, and the host adds what its own table says that guest's class could have made, never more. A groan and a slide are sent as the flues' are (**again to verify in stage A: the Forge's Breath in co-op**). Each page takes its own hero's slide.
- **Windbreaks, fires, wedges.** Raising a windbreak in a boss arena, relighting the Chief's fire and re-hanging a bell in a fight are guest-usable through `u` (`USE_U`, coop.js:1525 gains `fire7`, `break7`, `bell7`). The story's own (q41's three windbreaks, q44's bells, the sixth fire, the dark cave) stay the host's, as every act's do.
- **Cairns.** A guest's own, as a shrine is (`GUEST_OK`, coop.js:1523 gains `cairn7`): each hero has her own Call at each cairn. In a boss arena the re-arming is the host's event; the Call is still each page's.
- **Names.** A guest's Names are fields of its own record (`names` joins the list that `viewHero` leaves alone, as `mast` and `loadout` do; docs/progression/port-act5.md, Co-op). Their damage is in the blow it sends.
- **Vows.** A Gate's Vows are rules of the world, so they are the host's choice, shown to every guest in the lobby and on the party frame before the Gate opens; a guest who does not want them does not follow (it can leave the party as today). The payout multiplier applies to each player's own rewards. `silence` and `bare` apply to every hero in that Gate.
- **The Calls.** Every player's board is the same that day. Credit is each hero's own: a hunt's kill counts for everyone within 50 m; a memory or a descent for everyone in the zone when it ends.

### Roles the systems invite
- The **Warden** holds the upwind side, breaks Wind-callers with Charge, and is the one who can stand in a chute to set it off.
- The **Ranger** draws the Boulder (she is the farthest hero) and so builds the party's cover; her wolf does not drift.
- The **Mage** pins packs on edges and in lanes with Frost Nova for the gust or the slide someone else brings.
- Anyone guards the fire.

### Anti-cheat notes (in the style of docs/progression/port-act5.md, "The blow cap")
- **The blow cap learns the Names.** `blowCap` (coop.js:776) allows 14× a hero's claimed top damage within her level's and Mastery's ceiling. The Names multiply single hits by up to: Arna 1.4, Keyx 1.6, Einar 1.2, Pherousa 1.18, Ivar 1.24, Asger 1.3, Durgan 1.25, Oreithyia 1.2 (and 1.5 once), Amaranthe 1.12, the wind 1.15. A guest's presence carries which three Names it says and their depths (one byte each); the host multiplies the cap by the product of those three Names' ceilings from its own table (at most ×2.9 for Keyx, Arna and Asger, during a Call), never by a number the guest sends. The rate limit follows, as it did for Mastery.
- **Deeds are not trusted either way.** A guest cannot learn a Name in the host's world from the host's flags (its `flags` are the host's copy, coop README, Quest credit): deeds that are kills (Ivar, Amaranthe, Durgan, the forgotten) are credited on the guest's own record by the reward message for that kill; story deeds (Oreithyia's ledger) are the host's and a guest earns them in its own game.
- **Tempered items** need no new rule: the result is an item `cleanItem` already accepts (Progression 5.3).
- **Clamps on what the host does to a guest** gain two lines: a drift of at most 2.5 m/s for at most 8 s, a throw (the Clap) of at most 8 m.
- **Byte budget:** the gust's two bits; chute loads as one byte a chute, sent only on change and at most twice a second, on the `i` topic (Act VI's shard cells' topic, docs/act6-design.md:1456), never in the whole world state; three bytes of Names in presence. Measured with `coop.mjs four` on the Saddle's crest during a gust with two chutes groaning.
- **Scaling:** `COOP` unchanged (data.js:17-27). A heavy blow is a share of the life of the hero it lands on, so `COOP.dmg` does not multiply it: in a party the heavy moves stay readable and the party's danger rises through `COOP.pack` and the bosses' extra targets instead.

---

## 8. Balance plan

### 8.1 The targets
For the campaign's hero (docs/act6-briefs/reports/balance-report.md, How it was run: gear four levels behind, one blessing an act, spare points in Might and Vigor, each beaten boss's legendary), **at level 50**, and for the same hero with a three-Name build:

| what | Wanderer | Warden | Hero and above |
|---|---|---|---|
| a zone, eight packs: lowest life (median) | ≥ 70% | 45-65% | 35-55% |
| a zone: flasks drunk | 0-1 | 1-2 | 2-3 |
| a zone: deaths in 12 runs | 0 | 0-1 | 1-3 |
| a zone: seconds under 30% life | 0 | 0-6 | 5-15 |
| a boss: kill time, Chief / Gremos | 85-140 s / 120-200 s | 110-170 s / 160-240 s | the Warden band × 1.0-1.3 |
| a boss: blows landed | 4-8 | 8-16 | 8-16 |
| a boss: lowest life (median) | ≥ 60% | 30-55% | 20-45% |
| a boss: deaths in 12 runs | 0 | 1-3 | 3-6 |
| a boss: worst loss in any 3 s | ≤ 20% | ≤ 40% | ≤ 55% |
| lives of damage, against Warden | ≤ 50% | 1 | (reported) |
| **between classes:** blows landed, and lives of damage | within ±30% of the three classes' mean, every cell | | |
| **with a three-Name build played its way:** kill time | 15-30% shorter than the same hero without Names, and lowest life no worse | | |

- These bands are **deliberately more dangerous than Act VI's measured zones** (0.05-0.33 lives a run, no death in 378 runs) and **far shorter and plainer than its bosses.**
- The act against Act VI in lives of damage is reported but is no longer the gate: the report shows it stopped measuring danger once heroes out-heal chip.

### 8.2 The metrics (what `tools/balance-act.mjs` reports)
Already there: `combatS`, `deaths`, `deathAt`, `minLife` (:381, :813), `potions` (:389), `hits`, `maxHit`, lives of damage (`takenN`, :619), per-pack rows (:605).
**New, all in the bot's own bookkeeping (no game code):**
1. `under30S`: seconds with life under 30% (beside `minHp` at :381).
2. `worst3`: the largest share of life lost in any 3 s window (a ring buffer of the last 3 s of `frac` at :619).
3. `heavy`: heavy blows landed, by move id (the game's `tally`, already kept per boss move).
4. `byBand`: blows landed while the bot stood within 7 m of the boss, and beyond 8 m.
5. `gustS` / `leeS`: seconds of gust spent out of and in the lee; `slides`: set off by her, by foes, taken.
6. `calls`: Calls used, and the damage dealt inside them against outside.

### 8.3 What the bot must learn (page-side, in `installBot`)
| lesson | rule for the bot | where it plugs in |
|---|---|---|
| white is harm too | a white line or ring is avoided like a red one; the blue circle is safe (it already seeks 0x60c0ff, `SAFE`) | the telegraph scan |
| the lee | when a gust is warned and no foe is within its reach, walk to the nearest lee cell (`L.lee`) | the idle step that today walks to the next pack |
| upwind | a Ranger or a Mage picks her standing point on the upwind side of the target at her range; a Warden approaches so the pack is downwind | `pickNext` / the approach |
| the chute | never cast a skill with 30 or more load from inside a lane with load ≥ 50 unless a roll is ready; with a pack in a lane and herself out of it, cast the loudest skill she has | `ready()` |
| first things first | a Wind-caller mid-call is the target (as a Lampbearer is today) | the target chooser |
| the cairn | at a boss, walk to the cairn when its bell rings; in a zone, use a cairn when a champion or rare pack is next | the route |
| the fire | relight it when it is out and no red telegraph is on the way | the boss rules |
| wedges | strike the lit wedge while he kneels | the boss rules |
| **play styles for the Names** | `job.play`: `stand` (does not move while a foe is in reach and no telegraph is under her), `dodge` (rolls through a telegraph instead of walking out, when a roll is ready), `far` (keeps 10 m), `weave` (never the same skill twice running), `hold` (does not spend below 70) | one switch read by the mover and by `ready()` |
- `job.names: ['ivar:2', 'amaranthe:2', 'isarn:1']`, `job.vows: ['wind', 'fast']`, `job.tier` join `job.mast`, `job.variant`, `job.loadout`, `job.lamp` (:163-169).
- Each new rule is **checked in a scenario before it is trusted in a campaign**: Act VI's campaign lost a whole pass to a bot that stood idle between packs (balance-report.md, Two faults).

### 8.4 The runs that prove it (a `mkplan7.mjs` beside Act VI's, `docs/act7-briefs/balance/`)
Seeds 1000 + r × 7919; six runs a cell on Warden and above, twelve on Wanderer.

| # | question | jobs | runs |
|---|---|---|---|
| A | are the zones worth fighting at the cap? | `--zone ridge` and `--zone saddle`, 3 classes × difficulties 0, 1, 2, level 50, 8 packs | 2 × 3 × (12 + 6 + 6) = 144 |
| B | are the bosses 2-4 minutes, fair and deadly enough? | `--boss chief`, `--boss gremos`, 3 classes × difficulties 0, 1, 2, 4 | 2 × 3 × (12 + 6 + 6 + 6) = 180 |
| C | is nothing held back by a clock? | B's Warden cells again with the bot's damage ×2 (`job.gearK`): kill time must fall to 50-65% | 2 × 3 × 6 = 36 |
| D | does each Name do something, and not too much? | per class, the hero without Names against each Name alone (Kept, then Deep) with its play style, on one zone and one boss | 3 × 12 × 2 × 2 × 4 = 576 short runs |
| E | the six example builds | each build against no Names: both zones, both bosses, Warden difficulty | 6 × 4 × 6 × 2 = 288 |
| F | did Acts V and VI move? | the Act VI plan's Warden cells (`docs/act6-briefs/balance/plan.json`) with the best build of each class: reported, with the ×1.15-1.3 it should show | 126 |
| G | Vows | `--zone gate --tier 10` and `20`, 3 classes, no Vow against each Vow alone and three sets of three | 2 × 3 × 12 × 4 = 288 |
| H | co-op | A and B's Warden cells with `--coop 2` and `--coop 4` | 2 × 4 × 3 × 6 = 144 |

- **A Name passes D** if, played its way, it shortens the kill by 6-14% Kept and 12-22% Deep (or, for Isarn, Amaranthe and Someone, raises lowest life by 8-20 points or removes a death in twelve runs), and played the wrong way changes nothing beyond the runs' spread. **A Name whose effect the campaign cannot show is cut or rewritten before G3.** This is the Lamplight lesson made a rule.
- **C is the test for hidden locks.** If doubling the hero's damage does not nearly halve the fight, something is holding the boss's life, and it is found and removed.
- About 1 780 runs; Act VI's campaign was 666 and ran in a working day with the page reloaded every 40 jobs.

---

## 9. Zones, blessings, echoes, legendaries, the bells

### 9.1 `ridge` (40): Η Ράχη των Φωτιών / The Ridge of Fires
Subtitle `zone.ridge.s` «Έξι φωτιές σε γυμνή πέτρα» / "Six fires on bare rock". A spine about 300 m long running north-east, drops on both sides, the wind across it from the north-west. Entered from Whitecliff's beacon hill (a new exit beside the path the villagers carried wood up).

| place | what fights happen there |
|---|---|
| **The First Hut** (start, waypoint) | none: the lee, the keeper's three lines, the vane |
| **The Bare Mile** | the taught fights: `shieldLine` downwind on an edge shelf, then `callers` upwind, then `trollGang` under the cracked cornice; the first cairn before a champion's shelf |
| **The First Fire** (windbreak 1; checkpoint) | a `callers` pack trying to snuff it: the first fire the hero defends |
| **The Combs** (three parallel gullies, a chute down each) | `wolves` in the open between them, `trollGang` in the middle one: the hero chooses which gully to fight in and which to bring down |
| **The Second Fire** (windbreak 2) | `host` |
| **The Knife** (40 m of ridge 6 m wide, edges both sides, no lee but two cairns) | `flock`, then `shieldLine` head-on: the one place the front is the only way, built for the gust |
| **The Third Fire's terrace** | the Lame Chief |

### 9.2 `saddle` (43): Το Διάσελο του Βοριά / The North Wind's Saddle
Subtitle `zone.saddle.s` «Εδώ ο αέρας έχει δρόμο» / "Here the wind has a road". A wide pass, the wind straight down it from the north, a gust every 18 s at the crest. Night, storm: the shipped blizzard ambient (fx.js:602).

| place | what fights happen there |
|---|---|
| **The Windbreak Wall** (start, waypoint) | none |
| **The Hollows** (bowls of drifted snow, lee at their north rims) | `bearDen` ×2: every bowl is a place where a charge ends in a wall |
| **The Keeper's Hut** (q43; a walled fire; checkpoint) | none; the ledger; a brazier |
| **The Road of Bells** (q44; three cairns 60 m apart up the pass, a chute over each stretch) | `host`, `callers`, `wolves` between the cairns: each stretch is fought with a Call at its start |
| **The Fourth and Fifth Fires** (windbreaks; checkpoints) | `trollGang` at one, a champion `shieldLine` at the other |
| **The Crest** | `flock` and `host` together, in the strongest wind of the act |
| **The Shoulder** | Gremos |
| **The Dark Cave** (east of the Fifth Fire) | none, ever. It is where the host came from |

- **Generator.** `gen7.js` follows gen2's pass (snow, rock, drops as holes) and gen6's spot lists. New to it: `L.wind`, `L.lee`, edge cells, chute records with cover, cairn spots, fire spots with their windbreak cells. The two zones differ by parameters (a spine against a pass), as `drained` and `bottom` share gen6.
- **Look.** No new ground pack: the `rime` pack's snow, wind-crust and rock layers (Act V; world.js:57-58), plus about eight small props built in the Node pipeline (a hut, a cairn, a wind-bell, a fire-basket, a windbreak, a cornice, a horn, a wedge). The night storm hides distance, which is why two zones can share one pack and still look like the top of the world. Gremos asleep is rock geometry of the Shoulder; awake he is the regraded troll.
- **Checks** (`tools/check-act7.mjs`, hard failures): every pack spot has a lee cell within 10 m; no chute lane crosses a checkpoint, a cairn or a fire; every edge cell is walkable and has a drop beside it; every arena has at least two lee rocks; no two interacts in an arena within 3 m (Act VI's rule 10).

### 9.3 Blessings (three; `BOONS[7]`, data.js after :350)
Header `boon.h7` «Η φωτιά που κρατιέται μαζί» / "The fire kept together". Existing stat keys, two each, in Act VI's band. A hero who hung all seven wind-bells (`flags.bellsAll`) has hers ×1.25 (the shipped `REMEMBERED`, data.js:353, read in stats.js:29).
- `lee` «Το Απάγκιο» / "The Lee": `{ armorPct: 12, regen: 12 }`. ×1.25: 15 / 15. «Πίσω από τον βράχο δεν φυσάει.» / "Behind the rock, it doesn't blow."
- `back` «Ο Αέρας στην Πλάτη» / "The Wind at Your Back": `{ move: 6, dmgPct: 10 }`. ×1.25: 7 / 12. «Με τον αέρα στην πλάτη, όλα πάνε μακριά.» / "With the wind at your back, everything carries."
- `palm` «Η Χούφτα του Γκρεμού» / "Gremos's Palm": `{ lifePct: 12, eliteDmg: 15 }`. ×1.25: 15 / 18. «Κράτα τη, όπως κρατάς ένα σπουργίτι.» / "Hold it the way you hold a sparrow."

### 9.4 Echoes (two; once a day each, normal loot, no story; canon §4 rule 19)
Given under each boss: the Chief with the wind reversed and the fire out (4.1); Gremos from Phase 2 with boulders that shatter (4.2). In the act's material, snow: `echo.rise7`, `echo.done7`.

### 9.5 The two first-kill legendaries (`LEGENDARIES` with `drop: false`, `LEG_FROM`, data.js:433-445)
| id | name | base | what it does, in full |
|---|---|---|---|
| `hostHorn` | «Το Βούκινο του Ασκεριού» / "The Host's Horn" | amulet, any class | Rolls cooldown reduction as its fixed line. **Your Calls last 30 s instead of 20. When you kill a champion or a rare monster you are Called for 6 s (once every 30 s), wherever you are.** The cairn's burst, carried into every zone and every Gate. From the Lame Chief's first kill |
| `giantWedge` | «Η Σφήνα του Γκρεμού» / "Gremos's Wedge" | ring, any class | Rolls elite damage as its fixed line. **Your knockbacks are half again as long. A foe you knock back is Unsteady for 2 s: it takes +25% from every source (the shipped Exposed, combat.js:275; once every 6 s on the same foe; never a boss).** Every `knock` in the three classes' skills (skills.js:118-440) becomes a party buff. From Gremos's first kill |
- Neither is dead outside Act VII: the first is the Names' item, the second the knockback's.
- **Stretch (cut first):** three class legendaries in the Twelve Nights chest, one per class, each bound to a later skill (Charge, Vault, the Ray of Dawn).

### 9.6 The seven wind-bells (optional)
Seven cairns on the two zones have lost their bells. Each bell is somewhere a little off the road, behind one fight that uses one rule hard (a champion pack on the Knife; a troll under two chutes; a den at the bottom of a hollow reached only between gusts). Hanging a bell arms its cairn for good and counts: toast `q.bells` «Κουδούνια του δρόμου: {0}/7» / "Bells of the road: {0}/7". All seven: `bellsAll`, the blessing ×1.25, and from then on every cairn's Call in the act lasts 25 s. Finishable after the act.

---

## 10. Engine work, cost, risks

### 10.1 Honest cost, in focused days
| # | work | days |
|---|---|---|
| 1 | Act plumbing: `ZONES`, exits, waypoints, `HAZ7`, `actHaz` (data.js:447 knows two acts), quests 40-47, flags, wake rules (wake.js:13), unloading, the save format | 3-4 |
| 2 | `gen7.js` and the build pass: two zones, lee mask, edges, chutes, cairns, fires, two arenas, eight props | 6-8 |
| 3 | The North Wind (2.1) | 3-4 |
| 4 | The Hanging Snow (2.2) | 2.5-3.5 |
| 5 | The Name-cairns (2.3) | 1 |
| 6 | Seven enemy entries, five new traits, packs, affix lines | 5-6 |
| 7 | The Lame Chief | 4-5 |
| 8 | Gremos | 4-5 |
| 9 | The Names (5.2) | 7-8 |
| 10 | Tempering (5.3) | 1.5 |
| 11 | Vows 3, the Calls 3.5, the Vigil 1.5 | 8 |
| 12 | Story: seven quests, three cinematics, about 140 lines, barks, blessings, echoes, legendaries, three themes and a motif | 6-7 |
| 13 | Co-op: wind, chutes, cairns, the cap, Vows, the bump, `coop.mjs act7` | 3-4 |
| 14 | The balance tool's lessons and metrics, the campaign, the tuning it asks for | 4-5 |
| 15 | Scenarios, `check-act7`, the phone pass, the artifact, proofreading | 4-5 |
| | **Total** | **62-75** |

- **Saves.** New hero fields: `names`, `bronze`, `calls`, `vigil`, `gateVow`, an item's `tp`. data.js:63 says the format is still 1 and is to become 2 "once Act VI's fields ship"; Act VII's fields ride the same rule (no public build writes a format before a public build refuses it), so the bump is planned with Act VI's, not after it.
- **Memory.** Nothing here adds a rendering system. New textures: eight small props and no ground layers, about 4-6 MB on a phone. Creatures: five boot-loaded bodies and two Act V files (`bear`, `skua`); `ACT_FILES` (creatures.js:37-43) gets an `act7` list of those two (and the optional giant). A cold start into the Ridge therefore loads less than one into the Drained Sea did (the `rime` pack against `silt` plus the Act V group). **I have not measured it; the 110 MB bar is asserted at stage 0 with the same probe Act VI used.**
- **Frame time.** The lee is a mask read; a chute is a flue; the wind is one multiplier per shot and one add per actor. The storm's particles are Act V's blizzard. The perf gate is Act VI's (quality 1 under mobile emulation, no worse than the Field).

### 10.2 Risks
| risk | why it is real | what holds it |
|---|---|---|
| **The wind feels like losing control on a phone** | a hero that drifts is a hero the thumb did not move | she drifts only when not acting, at 1.5 m/s, never off an edge, never in a lee; a roll is never slowed. The `wind` scenario is played on the owner's phone at stage B before any enemy is written. If it fails there, the drift on the hero is cut and the wind keeps its other five effects |
| **Heavy blows as shares feel unfair to a tough build** | a Vigor hero loses more points of life to the same blow | it is a share *before* armour, block and Names, so Iron, a shield and Ivar all cut it; the campaign reports a Vigor-and-Iron hero beside the reference |
| **Twelve Names are twelve balance cells** | the progression work's 24 variants needed a review pass and re-tuning | each Name has one number that matters; run D sets it; a Name that cannot be shown is cut; nine is the cut-order number |
| **The Names make older acts easier** | +15-30% for a hero who plays her build | measured (run F) and accepted: those acts are behind a capped hero already; the Gates scale by tier |
| **Deeds for old heroes** | a hero who did the deed before the update must not be asked to redo it | five deeds are read from shipped flags (`act6`, `remembered`, `landing6`, the three `tear_` flags, `gateFound`); the three boss deeds are new on purpose: they send a capped hero back to an old fight once |
| **The clock** | a board seeded by the device's date can be walked forward | said plainly in 6.2; rewards are private and modest; the Twelve Nights chest is twelve days of play, not twelve taps (each night is three fights) |
| **A goblin at ×2.3 and a troll at ×3.2** | stretched texels on the two pictures players will remember | the storm, the night and the rim light carry it (Act VI's Shade wore the troll at ×1.45 and the Icemaw fallback was drawn at ×3.4); the one optional download is spent on Gremos if stage 0 finds a clean body; the Chief gets a code horn, shield and cloak |
| **IP hygiene** | giants, a goblin host, a mountain pass, fires on peaks | the folk word and the twelve nights are Greek and are used as such; no muster, no summons answered by an army, no oath-breaking dead; the giant is neither killed nor ridden; no wolf boss; the fire is held by a hand, not linked or fed |
| **Leif** | he is home only for heroes who found him | the hut's keeper is Leif or a villager, same lines (Story spine) |
| **Co-op traffic** | chute loads and a gust clock are new state | change-only bytes on the `i` topic; measured before G3 |

### 10.3 What this proposal deliberately does not do
- No new rendering system, no height in play, no falling for the hero, no shot that curves.
- No enemy that takes a button away, none that cannot be aimed at, none that is invisible, none that is the Skotos's.
- No least-time lock on any fight, no per-blow cap, no aura that ticks.
- No new Mastery track, no sets, no new currency but one counter (bell-bronze), no shop of power for gold.
- No change to an unvowed Shadow Gate. No relocation of Isarn's staff.
- No server logic, no leaderboard, no daily login, no streak that can be lost.
- No Karthax, no returning Isarn, no waking of the Skotos, no fire that must be fed, no keeper left alone on a peak.
- No new people set and no Blender step.

### 10.4 Cut order (first cut first)
| cut | saves | what is lost |
|---|---|---|
| 1. the three class legendaries in the chest (it gives a choice of three rolled ones instead) | 1 d | nothing the act needs |
| 2. the Vigil | 1.5 d | the weekly course; Vows and the Calls stand without it |
| 3. the Calls reduced to hunts only (no memories, no descents) | 1.5 d | variety on the board |
| 4. twelve Names to nine (drop Linden, Durgan and Amaranthe, with their three boss deeds) | 2 d | two of the six example builds change |
| 5. Tempering | 1.5 d | the gold sink; bronze then only buys nothing, so it goes too |
| 6. the wind-bells (the blessing is plain) | 1.5 d | the optional find |
| 7. chutes only in the two arenas and four zone spots | 1 d | the Combs become an ordinary gully fight |
| 8. the Skua and the Rime Bear (five entries, all boot-loaded) | 1.5 d | the act5 files are not loaded at all |
| 9. Vows from eight to five (`wind`, `fast`, `host`, `named`, `haste`) | 1 d | the two build Vows |
| **all nine** | **about 13-16 d** | **49-59 days**: the wind, the snow, the cairns, nine Names, five Vows, a hunts board, both bosses |
- **Never cut:** the Names, the heavy-blow rule, the no-lock rule, runs C and D.

---

## 11. Questions for the owner

1. **The Names: one more thing to learn, at level 50. Yes?** They are the answer to "points with nowhere meaningful to go": twelve rules, three at a time, bought with the same points. *Recommendation: yes, with the free respec at q40, and nine Names if the budget is tight (cut 4).*
2. **Should a hero be pushed by the wind at all?** It is the act's idea, and the one thing here that could feel bad under a thumb. *Recommendation: yes, gently (1.5 m/s, never while acting, never off an edge), decided on your phone at stage B with the `wind` scenario, before anything else is built on it. If you dislike it, the wind still carries shots, foes and knockbacks and the act still works.*
3. **May the easy difficulty have longer warnings?** Until now telegraphs never change with difficulty (data.js:32, :45). The campaign found Wanderer hardly easier. *Recommendation: yes, on Wanderer only, ×1.25, together with a move fewer per phase. It is the one place this proposal breaks a rule of the earlier acts, and it is for the players who chose the easy road.*
4. **Vows on the Shadow Gates: is an optional layer acceptable under "the Gates stay as they are"?** A Gate with no Vow is unchanged, checked by a test. *Recommendation: yes; they are the cheapest month of play in this document (3 days).*
5. **A board that follows the phone's date, with no server:** a player who changes the clock can see tomorrow's Calls today. *Recommendation: accept it. The alternative is a server and an account, which is a different game from the one that works offline and on Google Play without a login.*

---

## 12. Stages and gates (how it would be built)

| stage | what is built | the gate that ends it |
|---|---|---|
| **0** | the memory probe on a grey-box Ridge with the `rime` pack and the two Act V creature files; the search for an optional giant body; the three unverified points of this file (how pack levels track the hero; how Act V's gusts and the Forge's flues reach a co-op guest) | G0: a cold start under the 110 MB bar; each unverified point answered in writing |
| **A** | plumbing; `gen7`; the wind, the lee mask and the edge on an empty Ridge; the vane | **the owner plays the `wind` scenario on his phone** (owner question 2). Nothing else starts before this |
| **B** | chutes, cairns, the seven enemies, the packs; the Names with their panel and scenario; the bot's lessons | G1: runs A and D of the balance plan inside their bands; every Name shown or cut |
| **C** | both bosses with their scenarios; Tempering; Vows | G2: runs B, C and G; the ±30% class gate; the unvowed-Gate regression check |
| **D** | story, cinematics, blessings, echoes, legendaries, the bells, music; the Calls and the Vigil; co-op | G3: runs E, F and H; `coop.mjs act7`; the byte budget; every shipped scenario still green |
| **E** | phone pass at quality 0 and 1, artifact, proofreading, the owner's reading of the key lines | release |

- The order is by risk: the thing most likely to be cut (the hero's drift) is decided first, on the device it must work on; the thing with the most balance cells (the Names) is measured before the bosses that assume it.

## 13. Touch and phone readability (the rules this act keeps)
1. **No new button.** The Call is a touch on a cairn; a windbreak, a fire and a bell are touches. Names are chosen in town.
2. **Three colours of telegraph, as before, and one new meaning:** red and orange are harm; blue is safe; **white is the mountain** (a groaning chute, a called gust, the Stomp's ring, the Clap). White was Act VI's falling ice (docs/act6-design.md:1473), so a player already reads it as "something is coming down".
3. **The wind is always visible** as streaks on the ground and on the vane, and always audible. A gust is never the first sign of itself: three seconds of warning, every time.
4. **The lee is drawn** (no streaks, smooth snow) and a blue circle marks the nearest one the first three gusts of each zone.
5. **At most two big telegraphs at once;** a gust warning and a groaning chute each count as one.
6. **The hero is never moved while she acts,** never off an edge, never out of a lee, and never for more than the six seconds of a gust.
7. **Every heavy move has the same sound family** (a horn for the host, stone for the giant, a snarl for the beasts) 0.9 s or more before it lands.
8. **Names are never a meter to watch.** Each said Name shows one small icon on the buff row that is lit when its rule is paying (four stacks, Heat at 10, over 70) and dark when it is not: the HUD's shipped buff icons (`hud.js`, the map the progression port merged).
9. **Tested at quality 0, gated at quality 1** under mobile emulation, as Act VI was.

## 14. Player-facing text not given above (Greek first)

### The Names' tiles (name, the line under it, the rule as the panel says it)
| key | Greek | English |
|---|---|---|
| `name7.h` | «Τρία ονόματα κάθε βράδυ» | "Three names every night" |
| `name7.say` / `name7.deep` | «Πες το» / «Βάθυνέ το» | "Say it" / "Deepen it" |
| `name7.town` | «Τα ονόματα λέγονται στη φρυκτωρία του χωριού.» | "Names are said at the village beacon." |
| `name7.arna.d` | «Το πρώτο σου χτύπημα σε εχθρό με γεμάτη ζωή: +40%.» | "Your first hit on a foe at full life: +40%." |
| `name7.isarn.d` | «Η φιάλη σου ξαναγεμίζει πιο γρήγορα. Για λίγο μετά, πονάς λιγότερο.» | "Your flask refills sooner. For a moment after it, you are hurt less." |
| `name7.pherousa.d` | «Όσο κρατάς πάνω από 70, χτυπάς +18%.» | "While you hold 70 or more, you hit +18%." |
| `name7.einar.d` | «Από μακριά (πάνω από 9 μ.), χτυπάς +20%.» | "From afar (over 9 m), you hit +20%." |
| `name7.ivar.d` | «Όσο δεν κουνιέσαι, δυναμώνεις και αντέχεις. Ως τέσσερις φορές.» | "While you do not move, you grow stronger and tougher. Up to four times." |
| `name7.keyx.d` | «Μετά από κάθε αποφυγή, το επόμενο χτύπημα: +60%.» | "After each dodge, your next hit: +60%." |
| `name7.asger.d` | «Κάθε διαφορετική δεξιότητα στη σειρά: +10%. Ως τρεις.» | "Each different skill in a row: +10%. Up to three." |
| `name7.linden.d` | «Ό,τι αφήνεις στο πεδίο μένει περισσότερο και χτυπά πιο δυνατά.» | "What you leave on the field stays longer and hits harder." |
| `name7.amaranthe.d` | «Η γιατρειά που περισσεύει γίνεται ασπίδα.» | "Healing you cannot hold becomes a ward." |
| `name7.durgan.d` | «Κάθε δεξιότητα σε ζεσταίνει. Ζεστός χτυπάς πιο δυνατά. Πυρωμένος, καίγεσαι.» | "Each skill heats you. Hot, you hit harder. White-hot, you burn." |
| `name7.oreithyia.d` | «Η ταχύτητά σου γίνεται και δύναμη. Ο αέρας δεν σε παίρνει.» | "Your speed is also your strength. The wind does not take you." |
| `name7.someone.d` | «Μια φορά στο τόσο, ένα χτύπημα που θα σε σκότωνε σε αφήνει όρθιο.» | "Once in a while, a blow that would kill you leaves you standing." |
| `name7.locked` | «Δεν ξέρεις ακόμα αυτό το όνομα.» | "You do not know this name yet." |
| `name7.never` (shown once, under the list) | «Ένα όνομα δεν λέγεται. Το ξέρεις ποιο.» | "One name is not said. You know which." |

(The Ranger's tiles use the feminine where a participle shows: `name7.durgan.d.r` «...Πυρωμένη, καίγεσαι.», `name7.ivar.d` is neutral; `rl()` already picks `.r`, canon §2.3.)

### The act's toasts and prompts
| key | Greek | English |
|---|---|---|
| `q.windWarn` | «Φυσάει! Βρες απάγκιο.» | "It's blowing! Find the lee." |
| `q.break7` | «Ανεμοφράχτης στήθηκε ({0}/3)» | "A windbreak stands ({0}/3)" |
| `q.fireOut7` | «Η φωτιά έσβησε! Ξανάναψέ τη.» | "The fire is out! Relight it." |
| `q.slide` | «Το χιόνι κρέμεται. Μη φωνάζεις από κάτω.» | "The snow is hanging. Don't shout beneath it." |
| `hud.over` | «Στον γκρεμό!» | "Over the edge!" |
| `hud.called` | «Τα ονόματά σου ακούγονται» | "Your names are heard" |
| `hud.unsteady` | «Παραπατά!» | "Unsteady!" |
| `q.chiefDown` (big) | «Το ασκέρι σκόρπισε» | "The host is scattered" |
| `q.wedge` | «Μια σφήνα έσπασε ({0}/3)» | "A wedge is broken ({0}/3)" |
| `q.sixth` (big) | «Η έκτη φωτιά καίει, σε χέρι που την κρατά» | "The sixth fire burns, in a hand that holds it" |
| prompts | «Στήσε ανεμοφράχτη» · «Φώναξε τα ονόματα» · «Κρέμασε το κουδούνι» · «Ξανάναψε τη φωτιά» · «Πες τα ονόματα» · «Τάξε κάτι» · «Στόμωσε» | "Raise a windbreak" · "Call the names" · "Hang the bell" · "Relight the fire" · "Say the names" · "Make a vow" · "Temper" |
| `temper.d` | «Διάλεξε μία ιδιότητα. Η Χάλντα θα τη δουλέψει ξανά· τις άλλες δεν τις αγγίζει.» | "Choose one property. Halda will work it again; she leaves the others alone." |
| `vow.none` | «Χωρίς τάμα, η πύλη είναι όπως την ξέρεις.» | "With no vow, the gate is as you know it." |
| `calls.night` | «Νύχτα {0} από τις δώδεκα» | "Night {0} of the twelve" |
| `calls.chest` (big) | «Οι δώδεκα νύχτες πέρασαν. Διάλεξε.» | "The twelve nights are over. Choose." |
| `vigil.best` | «Η αγρυπνία σου: βαθμίδα {0}, {1}» | "Your vigil: tier {0}, {1}" |

### Barks at home during the act (one each; folk register)
- Elianthe `d.elianthe.v7` «Δώδεκα νύχτες δεν σβήνω το τζάκι. Η γιαγιά μου το ίδιο.» / "Twelve nights I don't let the hearth go out. My grandmother did the same."
- A villager `d.v.7` «Τους άκουσα στη σκεπή. Γελάνε σαν πριόνι.» / "I heard them on the roof. They laugh like a saw."
- The child `d.child7.2` «Αν λες ονόματα, δεν έρχονται. Είπα τρία.» / "If you say names, they don't come. I said three."
- Halda, after the act, `d.halda.again7` «Έχει κρατήσει τη σκάλα μας χίλια χρόνια. Μια φωτιά θα την κρατήσει.» / "He's held our stair a thousand years. He can hold a fire."

## 15. What is reused, in one table
| the act's thing | what it is in the shipped game | file |
|---|---|---|
| gusts, their warning, the Cold they bring | Act V's blizzard gusts | world.js:1597-1620, cold.js:77-96 |
| the lee | Act V's lee of a berg, as a mask | cold.js:66-75 |
| a shot's wind | one multiplier on `speed` | projectiles.js:47-58, :81 |
| a foe over the edge | a foe drowned | combat.js:508, :553 |
| a chute and its slide | a flue and the Forge's Breath | forge.js:27-28, :60-125 |
| cover from a slide | the Breath's blue cover circles | forge.js:78 |
| a cairn | a shrine | world.js:192-201, :493, :503 |
| a windbreak, a peak fire's pool | a lamp's light pool, shrunk and restored | light.js:325, :351 |
| a Wind-caller's call and its break | a Lampbearer's Drink | ai.js:1034, data.js:200 |
| a Wind-caller snuffing a fire | a Smoke-eater | ai.js:2693 |
| a Windbreak's shield, rush and broken guard | an Ash-Fallen spearman | data.js:163, combat.js:324 |
| a wolf's pounce, a bear's charge, a troll's slam and rock | `pounce`, `charger`, `brute`, `lob` | ai.js:434, :640, :452, :1857 |
| both bosses' runner, phases, floors | `boss()` | ai.js:2556-2607 |
| a wedge | a Hand of the Skotos (a node with its own life) | data.js:196, ai.js:812 |
| Gremos kneeling, the Chief staggered | Dazed | ai.js:1886, combat.js:276 |
| the Names' points | the one pool | progression.js:41-50, :100 |
| Tempering | Halda's reforge | inventory.js:80-92 |
| a Vowed Gate, the Vigil | a Gate from a seed and a tier | boot.js:369-393, world.js:159, :447 |
| the blessing ×1.25 | `REMEMBERED` | data.js:353, stats.js:29 |
| the first-kill legendaries | `LEG_FROM` | data.js:445, combat.js:564-568 |
| a guest's touch in a fight | `u` | coop.js:851-863, :1525 |

Everything not in this table is new: the wind's heading and push, the load on a chute, the twelve Names and their panel, Tempering's panel, eight Vows, the Calls board, the Vigil's row, two boss tables, five monster traits, seven quests.
