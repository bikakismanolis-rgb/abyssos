# Skotos Act V: canon brief

What the game already says, so Act V («Η Παγωμένη Ακτή» / "The Frozen Coast") can build on it without retconning anything. Sources, all read in full or for the parts named: `src/i18n/text.js` (all 620 lines), `README.md`, `docs/HANDOFF.md`, `docs/act4-design.md` (story, zones, bosses, mechanics, world state, blessings, music, risks, judges), `docs/act3-contract.md`, `docs/act4-contract.md` (lead decisions, story), `src/game/story.js` (quest flow), and the parts of `src/game/world.js`, `boot.js`, `state.js`, `ui/panels.js`, `light.js`, `world/gen4.js` and `world/build.js` that hold story state.

Rule used below: **hard canon** is anything the player can read or see in the shipped build. **Soft canon** is what only the design docs or code comments say. The game's text wins over the docs, and the docs win over guesses.

---

## 0. The ten things that matter most

1. **"The North" (ο Βορράς) is the name of the whole land**, not a direction. «Με αυτό έκαψε τον Βορρά» / "With it he burned the North" (intro.1). So the Frozen Coast is the far north *of* the North. Write «ο μακρινός βορράς» / "the far north" in lower case for the direction, and «ο Βορράς» / "the North" for the land.
2. **intro.3 already holds Act V's premise.** «Όσο καίνε, ο Βορράς είναι ασφαλής.» / "While they burn, the North is safe." The game has only ever read this as Karthax's fire guarding against Karthax. Act V can make it literally true in a second way: the crown-fire beacons held back the Skotos. That line is now false, because every crown fire is out (d.u.night).
3. **The beacons reached the sea.** «από τη θάλασσα ως τα βουνά» / "from the sea to the mountains", in both intro.3 and Arna's memory d.lamp.m3.3. This is the only mention of the sea in the game, and it is enough.
4. **The fourth fire was lit by hand, not by magic.** Act III's self-lit fire was «Κανείς... κανείς δεν άναψε εκείνη.» / "No one... no one lit that one." (d.isarn.d3): that was the crown's fire dreaming. Act IV's fourth fire is «Κανείς που ξέρουμε δεν την άναψε.» / "No one we know lit that one." (d.answer.4). The difference is deliberate: *someone* lit it, a person the North does not know. That is the hook for the forgotten fourth people.
5. **The fourth fire burns pale white** (FAR_BEACONS[3], color 0xfff0c0). The other answering fires are orange, and the beacon-tree's is green-gold. Arna's own flame, freed from the brow-stone, is white too (d.k.tear). This is the strongest hook in the shipped data, though not canon: Arna's own fire may have come from the sea lights (see §3.F).
6. **The origin of Arna's own fire is never stated.** He was already «Ένα αγόρι με ένα φανάρι» / "A boy with a lantern" before he found the brow-stone (d.lamp.m1.1). The flame «η φωτιά του Άρνα, κρυμμένη χίλια χρόνια κάτω από τη λάμψη του» / "Arna's own fire, hidden a thousand years beneath its glare" is clean, and Whitecliff's new fire was lit from it. Arna's people and his missing brother are also unstated.
7. **Isarn is gone for good.** He walked into the white fire with the crown (d.u.walk). All that remains of him is his staff and his dark lantern, planted by Whitecliff's beacon, which say «Ξεκουράσου.» / "Rest." (d.staff) and open the Shadow Gates. Act V needs a new quest-giver; until now every act began with "Speak with Isarn".
8. **Never say Karthax's name to a child.** «...μην πεις ποτέ το όνομά του σε κανένα παιδί. Έτσι πεθαίνουν οι τύραννοι.» / "...never tell his name to any child. That is how tyrants die." (d.isarn.u3). Forgetting is the weapon that ended Act IV. A people whom history forgot is the dark mirror of that, and gives Act V its theme.
9. **The fourth fire's position is in conflict, and Act V should settle it.** The code comment (world.js:48) and the Act IV design say it burns «on the Dark Beacon» at the south end of the Field of Ash. The player sees only "far to the north", and the Field's Dark Beacon prop (build.js darkBeacon, "the basket on top full of dead ash") never lights, not even at dawn. Recommendation: place the fourth fire beyond the Black Anvil, on the coast, and fix the comment.
10. **Who lit the Graves lanterns is also unexplained.** «Ξημερώνει στο Πεδίο. Κάποιος άναψε τα φανάρια στα Μνήματα, ένα ένα.» / "Dawn on the Field. Someone has lit the lanterns in the Graves, one by one." (d.field.dawn). Together with the fourth fire, that is two unexplained acts of kindling north of Whitecliff after the Night Without Fires.

---

## 1. The world and its history, as the game states it

### 1.1 The intro (intro.1-5), the only "official history"

| key | Greek | English |
|---|---|---|
| intro.1 | Χίλια χρόνια πριν, ο Κάρθαξ, ο Άναξ της Τέφρας, σφυρηλάτησε ένα στέμμα από κάρβουνα που δεν σβήνουν. Με αυτό έκαψε τον Βορρά. | A thousand years ago Karthax, the Ash King, forged a crown of embers that never die. With it he burned the North. |
| intro.2 | Άνθρωποι, Αειθαλείς και Λιθογενείς πολέμησαν μαζί και τον έριξαν. Το στέμμα έσπασε σε τέσσερα κομμάτια, και τα κομμάτια θάφτηκαν βαθιά. | Men, the Evergreen and the Stoneborn fought him together and threw him down. The crown broke in four, and the shards were buried deep. |
| intro.3 | Για να μην ξεχαστεί, άναψαν φρυκτωρίες σε κάθε κορυφή, από τη θάλασσα ως τα βουνά. Όσο καίνε, ο Βορράς είναι ασφαλής. | So no one would forget, they lit beacons on every peak from the sea to the mountains. While they burn, the North is safe. |
| intro.4 | Απόψε σβήνουν, η μία μετά την άλλη. | Tonight they are going out, one after another. |
| intro.5 | Είσαι ο φρυκτωρός του Λευκόβραχου. Η δική σου φωτιά είναι η τελευταία. | You keep the beacon of Whitecliff. Yours is the last fire. |

Title and subtitle: game.title «ΣΚΟΤΟΣ» / "SKOTOS"; game.sub «Οι φρυκτωρίες σβήνουν» / "The beacons are going dark". No character ever says the word «Σκότος». The game says «σκοτάδι» / "dark" in d.isarn.f2, d.elati.g3 and d.ivar.dark.

The intro is history as the peoples tell it. Acts III-IV showed it is incomplete: Arna, not "they", lit the beacons, and "so no one would forget" was Karthax's own wish working through his fire. Act V may show it is incomplete again, by a fourth people left out of intro.2. It must not show it is false.

### 1.2 The Breaking (a thousand years ago, on the Field of Ash)

- d.tear.breaking.1 «Χίλια χρόνια πριν. Το πεδίο της Τέφρας. Ο Κάρθαξ έχει πέσει, και το στέμμα του σπάει στα τέσσερα, σαν πυρωμένο σίδερο στο νερό.» / "A thousand years ago. The field of Ash. Karthax has fallen, and his crown breaks in four like red-hot iron dropped in water."
- d.tear.breaking.2 «Ένας βασιλιάς των Λιθογενών παίρνει το ένα κομμάτι. Ένας στεφανωμένος άνθρωπος το άλλο. Η Κυρά των Αειθαλών το τρίτο.» / "A king of the Stoneborn takes one piece. A crowned man another. The Lady of the Evergreen the third."
- d.tear.breaking.3 «Το τέταρτο, το πιο λαμπερό, το μέτωπο του στέμματος, μένει στη στάχτη. Κανείς δεν απλώνει χέρι.» / "The fourth, the brightest, the brow-stone of the crown, lies in the ash. No one reaches for it."
- d.tear.breaking.5 «Από την άκρη της μνήμης, εκεί που δεν φτάνει το φως, κάποιος απαντά: «Θα το φυλάνε.» ...» / "From the edge of the memory, where the light does not reach, someone answers: "It will be watched." The piece rises into a glow like a lantern's, and is gone." Act IV established that the voice is Arna's.
- d.lamp.m1.1-3: a boy with a lantern searches the field for his brother: «Άνθρωποι, Αειθαλείς, Λιθογενείς, πεσμένοι ο ένας πάνω στον άλλον. Φωνάζει ένα όνομα. Κανείς δεν απαντά.» / "Men, Evergreen, Stoneborn, fallen one upon another. He calls a name. No one answers." He finds the brow-stone.
- d.lamp.m2.1-3: «Κανείς δεν το θέλει; Τότε θα το φυλάμε. Δεν θα το αφήσουμε ποτέ από τα μάτια μας.» / "No one wants it? Then we will watch it. We will never let it out of our sight." He shuts it in his lantern; «Η φλόγα ασπρίζει.» / "The flame turns white."
- d.isarn.d6: «Το τέταρτο κομμάτι, το πιο λαμπερό, δεν το ήθελε κανένας λαός. Το έδωσαν στη φρουρά: στους φρυκτωρούς, στους Οδοιπόρους. ...» / "The fourth piece, the brightest, no people would take. It was given to the watch: to the beacon-keepers, the Wayfarers..."

### 1.3 The peoples

- **Men (Άνθρωποι):** Whitecliff's villagers, the Barrow of Kings (a "crowned man" took a shard; the Barrow Lord, «Ο βασιλιάς που ορκίστηκε στην Τέφρα» / "The king who swore to the Ash"), and the Wayfarers, whose own people is never named. The hero is a Man unless she is the Ranger.
- **The Evergreen (Αειθαλείς):** the elves of the Weeping Woods, west of Whitecliff. Long-lived; Amaranthe fought Karthax a thousand years ago. Their names are Greek tree and plant names (Ελάτη fir, Φλαμουριά linden, Αμαράνθη amaranth). Their beacon is a beacon-tree. A century ago they took root around Amaranthe and the wood stood still; the First Autumn freed them («Θα γεράσουμε, όσοι μείναμε. Επιτέλους.» / "We'll grow old, those of us who are left. At last.", d.elati.aut3). Before she took root Amaranthe **sent the children away, to the edges of the North** (d.tear.nursery.1), and the Ranger is one of them.
- **The Stoneborn (Λιθογενείς):** the dwarves of Deepstone (Βαθύπετρα) under the mountain, north-east up the Giants' Stair. «Οι Λιθογενείς δεν ξεχνούν.» / "The Stoneborn don't forget." (d.halda.2). Halda of Whitecliff is Stoneborn: «Η Βαθύπετρα ήταν σπίτι μας πριν γεμίσει σκιές.» / "Deepstone was our home before the shadows filled it."
- **The Wayfarers (Οι Οδοιπόροι), "the watch" (η φρουρά):** beacon-keepers sworn to the brow-stone. They are an order, not a people.
- **Orders that fell:** the Ashbound (Τεφρόδετοι: Durgan's dwarves, who "only hear the forge now"), the Rootsworn (Ορκισμένοι της Ρίζας: Amaranthe's guards), the Lampless (Άφεγγοι: dead Wayfarers at the Anvil Gate, now released), and the Ash-Fallen (Πεσμένοι της Τέφρας: the three peoples' dead on the Field, still fighting in the ash; they remain after Act IV).
- **The Order of the Flame (Τάγμα της Φλόγας):** named only in class.mage.d. The Mage is «Μαθητής του Τάγματος της Φλόγας» / "A student of the Order of the Flame". Nothing else is known about it.
- **Not in canon:** any fourth people. The intro names three. The Field of Ash has the Field of **Three** Banners (Men against Stoneborn against Evergreen). Act V's keepers of the sea lights are new, and must read as forgotten rather than as having been hidden in shipped lines.

### 1.4 The shards, their keepers and their wishes (all now unmade)

The rule of the shards: each grants its keeper's wish, and the wish becomes a cage. «κάθε δώρο έχει το κλουβί του» / "every gift has its cage" (altar.sub). Karthax: «Δεν κατέκτησα ποτέ κανέναν. Τους έδωσα ό,τι ζήτησαν.» / "I never conquered anyone. I gave them what they asked for." (d.voice.f1, d.karthax.p2).

| shard | where it lay | keeper | wish (from the cage lines) | end |
|---|---|---|---|---|
| First | the Barrow of Kings | the Barrow Lord | «...να κρατήσω τον θρόνο μου...» / "...to keep my throne..." | Act I; «Ο θρόνος δεν ήταν ποτέ δικός μου.» / "The throne was never mine." |
| Second | the Deep Forge, Deepstone | Durgan, the Molten King | «...να γίνω ο σιδεράς που θα το λιώσει...» / "...to be the smith who unmade it..." | Act II; «Κρύο... επιτέλους... κρύο...» / "Cold... at last... cold..." |
| Third | the First Oak, the Heartwood | Amaranthe | «...να μη χαθεί τίποτα δικό μας...» / "...let nothing of ours fade..." | Act III; the First Autumn |
| Fourth, the brow-stone | Isarn's lantern | Arna, then the Wayfarers | Arna: "We will watch it..."; Isarn at ten: «Μη με αφήσεις μόνο μαζί του.» / "Don't leave me alone with it." | Act IV; torn out at the Anvil |
| The crown's own | Karthax | Karthax | «Να μη με ξεχάσουν ποτέ» / "Let them never forget me" (design; in game: mon.karthax.t «Ευχήθηκε να μην τον ξεχάσουν ποτέ» / "He wished never to be forgotten") | Unmade; «Ποιος... ποιος θα με θυμάται;» / "Who... who will remember me?" |

The Crown's Offers (Act IV altars): gifts the Throne, the Forge and the Unfading. A hero who refused all three is Unbound (Αδέσμευτος / Αδέσμευτη; flag `unbound`), with Isarn's words «Το κουβάλησες, και ποτέ δεν σε κράτησε.» / "You carried it, and it never held you." (d.isarn.unbound). **With every shard unmade, no wish-granting crown power is left in the world.**

### 1.5 The beacons (φρυκτωρίες)

- **Every beacon was lit from the lantern, so every beacon was the brow-stone's fire.** «Κάθε φρυκτωρία στον Βορρά ανάφτηκε από αυτό το φανάρι. Γι' αυτό τα αποκοιμίζουν: είναι η ίδια φωτιά.» / "Every beacon in the North was lit from this lantern. That is why they lull the shards: it is the same fire." (d.isarn.e1)
- Arna lit them: «Ανάβει την πρώτη φρυκτωρία. Μετά την επόμενη, και την επόμενη, από τη θάλασσα ως τα βουνά.» / "He lights the first beacon. Then the next, and the next, from the sea to the mountains." (d.lamp.m3.3). Arna's hill is the first.
- The beacon flame lulls the shards but does not burn them (d.isarn.d7 corrects d.isarn.r2). Sleepers in one fire dream together; three together call to the fourth.
- **Three nights before the game:** «Πριν από τρεις νύχτες έκαιγαν εφτά φωτιές πάνω στις κορυφές. Τώρα καίει μόνο η δική μας.» / "Three nights ago seven fires burned on those peaks. Now only ours is left." (d.isarn.2). The Voice was calling its fire home (d.isarn.e4).
- **The count after Act I:** «Μία φωτιά ξανά αναμμένη, έξι σβηστές.» / "One fire lit again, six still dark." (d.isarn.r4). Deepstone's beacon and the beacon-tree had been dark for a century, so they are not among the seven. **Of the seven peaks visible from Whitecliff, only Arna's hill has ever been named.** The other six were never relit, and Act IV deliberately claims no count at the end.
- **The Night Without Fires (Η Νύχτα Χωρίς Φωτιές):** «Σε όλο τον Βορρά, κάθε φρυκτωρία σβήνει την ίδια στιγμή.» / "All across the North, every beacon goes out at the same moment." (d.u.night)
- **Fires lit by hand (q22):** «Ανάβεις τη φρυκτωρία από το φανάρι του Ίσαρν. Καίει άσπρη και χρυσή, κι η φλόγα του φαναριού σβήνει ήσυχα, σαν να αποκοιμιέται.» / "You light the beacon from Isarn's lantern. It burns white and gold, and the lantern's flame goes out quietly, as if falling asleep." (d.answer.0). Then the answers: Arna's hill by the villagers (d.answer.1), Deepstone by Brokka (d.answer.2), the beacon-tree by Elati (d.answer.3), and «Κι εκεί, μακριά στον βορρά, μια τέταρτη. Κανείς που ξέρουμε δεν την άναψε.» / "And there, far to the north, a fourth. No one we know lit that one." (d.answer.4)
- **Far fires seen from Whitecliff** (world.js FAR_BEACONS, offsets from the town beacon; −z is north):

| i | fire | dx, dz, y | colour | lit when |
|---|---|---|---|---|
| 0 | Arna's hill | −40, −60, 14 | orange (default 0xffa040) | Act I done, unless crownUnmade && !newFire |
| 1 | Deepstone | +46, −58, 17 | orange | Act II done (same night rule) |
| 2 | the beacon-tree, far west | −44, −32, 8 | green-gold 0xb8e060 | Act III done (same night rule) |
| 3 | **the fourth (seed: true)** | **0, −72, 12** | **pale white-gold 0xfff0c0** | only with `newFire` |

The fourth fire is due north, the farthest of the four, and lower than the mountain fires.

- Beacon vocabulary in shipped text: «φρυκτωρία» beacon, «φρυκτωρός» beacon-keeper, «φανάρι» lantern, «λυχνάρι» lamp (the Last Lamp), «φανάρια του δρόμου» waylamps, «μαγκάλι» brazier, «δέντρο-φρυκτωρία» beacon-tree. **«φάρος» (lighthouse) has never been used.** That leaves room: d.isarn.e1 covers every *φρυκτωρία*, so a sea light (φάρος) can be a different, older fire without contradicting it. The Night Without Fires also put out *beacons*. Karthax's «ΚΑΘΕ ΦΩΣ ΣΤΟΝ ΒΟΡΡΑ ΕΙΝΑΙ ΔΙΚΟ ΜΟΥ.» / "EVERY LIGHT IN THE NORTH IS MINE." is the boast of a liar who "gave them what they asked for", not narration.

### 1.6 The Wayfarers (the rules the act set)

- Arna, the first, founded them, and the lantern passed from hand to hand for a thousand years (d.isarn.d6).
- «Όσοι κρατάμε το φανάρι γερνάμε αργά.» / "Those of us who carry the lantern age slowly." Isarn was ten when he took it, a hundred years ago, so he was about 110 and looked 70 (d.isarn.e2).
- A keeper can set the lantern down only in another keeper's hand. When they hand it on they walk north to watch the Anvil Gate forever: «Βόρεια. Εκεί πάμε όλοι στο τέλος. Κάποιος πρέπει να φυλάει και την πύλη, να μη γυρίσει ποτέ η φωτιά στο καμίνι της.» / "North. That's where we all go in the end. Someone has to watch the gate too, so the fire never goes back to its forge." (d.lamp.m4.2). Dead, they became the Lampless.
- The Lantern Graves: a thousand hooks with dead lanterns; Ivar's hook was the empty one («Χίλιοι γάντζοι. Ένας άδειος.» / "A thousand hooks. One empty.", d.isarn.hagain).
- After the Unmaking the Lampless followed Isarn into the white fire with their lanterns lit at last (d.u.walk). They are gone from the Field.

### 1.7 Timeline

| when | what (key) |
|---|---|
| before Karthax | nothing in canon. Act V's Skotos is "older than Karthax" by the owner's pillar. |
| 1000 years ago | Karthax forges the crown and burns the North; the alliance throws him down on the Field of Ash; the crown breaks in four; the boy Arna takes the brow-stone; Arna lights every beacon from the sea to the mountains; young Amaranthe and Linden plant the third shard in the young First Oak (d.tear.planting.*); old Arna walks north. |
| 100 years ago (always «εκατό χρόνια» / "a hundred years", never "four hundred") | The brow-stone whispers to Ivar in his own voice. Ivar tells Durgan the shard can become a blade (d.brokka.c2), and Durgan's Deep Forge takes him; Deepstone's beacon goes dark. Ivar sits by the First Oak's heart (d.elati.g2), the Oak smokes, Amaranthe makes her wish, and the wood stands still; the beacon-tree goes dark. Ivar gives the lantern to ten-year-old Isarn and walks north, and the lantern speaks in Ivar's voice every night after (d.lamp.m5.*). |
| 3 nights before Act I | The Voice calls its fire home; the beacons go out one by one; Isarn walks to Whitecliff, the "nest" (d.isarn.e4, d.voice.laugh2). |
| Acts I-IV | three shards fed to Whitecliff's beacon; three fires answer; the fire leaves in the Ember Cradle; Ivar is released; the crown is unmade; Isarn walks into the white fire; the Night Without Fires; the new fire. |
| after Act IV (Act V starts here) | Whitecliff's white-gold beacon with Isarn's staff beside it; three hand-lit far fires plus the fourth, unknown; the Field at dawn with every Graves lantern lit by "someone"; the Forge cold. |

### 1.8 Geography as stated

- **Whitecliff (Λευκόβραχος):** a walled village with the beacon hill to the north. Exits: the forest by the south gate (Act I: «Πάρε το παλιό μονοπάτι προς τα βόρεια, από τη νότια πύλη.» / "Take the old trail north, out the south gate."); the mountain road behind the beacon, north-east, up the Giants' Stair to Deepstone (Act II; snow and cliffs, «Ντύσου ζεστά.» / "Dress warm."); the west lane between the Hall and the Manor to the Weeping Woods (Act III); the north path down the far side of the beacon hill to the Field of Ash (Act IV; locked `fireTaken`, «Κανείς δεν τον περπατά χωρίς φωτιά.» / "No one walks it without fire.", d.roadShut).
- **The Field of Ash (Το Πεδίο της Τέφρας),** south to north: the Dark Beacon (Σβηστή Φρυκτωρία; camp and waypoint 1), the Wayfarers' Road (five waylamps, three Altars of the Wish in side hollows, a ruined watchtower), the Field of Three Banners to the west with the bones of "one of Karthax's war-drakes" (design), the Ember Flats to the east, the Lantern Graves gorge (waypoint 2), and the Anvil Gate plaza with the Last Lamp, against the obsidian cliff of the Black Anvil (Το Μαύρο Αμόνι).
- **The Ashen Forge (Το Στάχτινο Καμίνι)** inside the Black Anvil: the Hall of the Headless, the Slag Rivers, the Breath Galleries, the three Great Bellows (west, east, north), the Hall of Moulds, the Great Stair, and the Anvil of the Crown under an open crater, with the Forge Mouth on its south rim.
- **North of the Black Anvil: nothing is said.** No shipped line, prop or exit describes what lies beyond. The Field's northern horizon showed a red glow (the Black Anvil), which is gone after the Unmaking. Every "north" in Act IV means the Anvil Gate. Act V is free here.
- Zone levels: town 1, forest 1, crypt 4, pass 10, halls 13, weep 16, heart 19, ashfield 22, forge 25. Going by the pattern of +3, Act V's zones fall at 28 and 31.
- Snow already exists: the Giants' Stair (ambient 'snow'). Act V's ice and cold must look and play unlike the Act II pass.

---

## 2. Every named character

### 2.1 Cast table (state at quest 23, `newFire`)

| who (npc key) | GR / EN | what they are | where at the end of Act IV | alive? | voice |
|---|---|---|---|---|---|
| wayfarer | Ίσαρν ο Οδοιπόρος / Isarn the Wayfarer | Wayfarer, ~110, Ivar's son; the mentor; carried the brow-stone in his lantern, and Karthax spoke to him in his father's voice | Walked into the white fire carrying the crown (d.u.walk). His staff and dark lantern stand planted by Whitecliff's beacon (`staff` interact: «Ξεκουράσου.» / "Rest.", then the Shadow Gates panel). | **No** | Plain, weary, warm; short sentences with one image. Hedges with understatement («Δεν σου λέω να την πιστέψεις.» / "I don't say believe it."). Confesses ("I owe you the truth. Or as much of it as I can bear tonight."). First word «Ώστε ξύπνησες.» / "So you're awake."; last word «Ξεκουράσου.» / "Rest." |
| ivar / ivarGhost | Ίβαρ / Ivar (boss: Ίβαρ, ο Φύλακας του Τελευταίου Λυχναριού / Ivar, Keeper of the Last Lamp) | Isarn's father, captain of the Lampless | Released; took Isarn's hand in the fire. His lantern hangs lit on the Last Lamp in the Field. Echo refight at the Last Lamp. | No | Stern, then lucid and tender: «Ίσαρν... γέρασες. Το κράτησες αναμμένο.» / "Isarn... you grew old. You kept it lit." |
| arna / arnaOld | Άρνας / Arna | The first Wayfarer; **male** («του Άρνα»); seen only in the lamp memories (boy, young man, old man) | Walked north a thousand years ago | No | Few, simple, vow-like words: "So no one forgets." |
| isarnBoy | Ο Ίσαρν, παιδί ακόμα / Isarn, still a boy | memory figure | memory | n/a | «Μη με αφήσεις μόνο μαζί του.» |
| voice | Η Φωνή στη Φλόγα / The Voice in the Flame | Karthax speaking through crown fire, in Ivar's voice at first | Gone with the crown: «Σβήνω... Κάνει κρύο. Το είχα ξεχάσει.» / "I am going out... It is cold. I had forgotten." | No | Coaxing, intimate, cold-and-warm imagery ("Warm me, little spark."), then mockery. |
| karthax | Κάρθαξ, ο Άναξ της Τέφρας / Karthax, the Ash King | The tyrant, a will split across four stones | Unmade. Echo at the cold Anvil («Χτύπα το κρύο αμόνι» / "Strike the cold anvil"). His name should not be passed on. | No | Formal, no contractions, grand: "A thousand years I waited for a hand to bring me my pieces." Phase shouts in caps. |
| brokka | Μπρόκα / Brokka | Stoneborn, «κόρη του Ντάιν, σιδεράς της τρίτης στοάς» / "daughter of Dain, smith of the third gallery"; co-forged the Ember Cradle; struck the unmaking blow "without a wish" | Went home and relit Deepstone (d.answer.2 «Η Μπρόκα κράτησε τον λόγο της.» / "Brokka kept her word."). Still the vendor and healer in the Halls of Deepstone, where she still says her Act II line d.brokka.after. | **Yes** | Gruff, practical, dry humour; calls the hero «ξένε» / "stranger"; commands in short bursts («Κράτα τις πόρτες!» / "Hold the doors!"); smith imagery. |
| elati | Ελάτη / Elati | The last Evergreen scout, silver-haired, bark to the elbow (it has stopped growing); would not kneel or swear | Relit the beacon-tree in the west (d.answer.3). Still in the Lanternglade (weep) as healer and vendor, with her Act III autumn lines. | **Yes** | Terse, wry, blunt; «φλογοφέρε» / "fire-bearer"; «αδελφή» / "sister" to the Ranger; sings the falling-leaf song. Promised the Ranger «...θα σε περιμένω εδώ.» / "...I'll be waiting here." (d.elati.aut3.r), then «Βαρέθηκα να περιμένω, αδελφή.» / "I got tired of waiting, sister." (d.elati.g1.r). |
| linden / youngLinden | Γριά Φλαμουριά / Old Linden | Evergreen elder, half-rooted by choice to keep the lanterns lit | After the First Autumn she «άφησε την τελευταία της σάρκα και ρίζωσε» / "let go of the last of her flesh and took root" (d.elati.aut2); the Lady's sapling grows in her shade | Rooted (a tree) | Gentle, ancient, second person: «παιδί της φωτιάς» / "child of the fire", «κόρη μου» / "my daughter" to the Ranger. |
| amaranthe | Αμαράνθη η Αμάραντη, η Κυρά των Αειθαλών / Amaranthe the Unfading, Lady of the Evergreen | Third keeper | Fell; a white sapling in the Heart Chamber; echo refight. Her ash statue spoke at the Anvil. | No | Warning, then pleading, then tender ("Sit a while beside me. It is warm here."); no contractions. |
| (boss) | Αργυρόκερως, το Λευκό Ελάφι / Silverhorn, the White Hart | Guardian of the Root Gate | The white tree at the Glade of Stones; echo | No | (no lines) |
| moltenKing | Δούργκαν, ο Λιωμένος Βασιλιάς / Durgan, the Molten King | Second keeper, "my father's friend" (d.isarn.b2) | Dead; ash statue spoke | No | «Ήρθες για το στέμμα; Είναι μέσα μου τώρα. Έλα να το βγάλεις.» / "You came for the crown? It's inside me now. Come and cut it out." |
| barrowLord | Ο Άρχων του Τύμβου / The Barrow Lord | First keeper | Dead; ash statue spoke | No | «Κανείς ζωντανός δεν περνά από εδώ. Και κανείς νεκρός δεν φεύγει.» / "No one living passes here. And no one dead ever leaves." |
| (boss) | Η Υφάντρα / The Weaver; Ο Λιθοφύλακας / The Stonewarden | Act I and II bosses | Dead | No | Weaver: «...μείνε... μείνε μαζί μας... για πάντα...» / "...stay... stay with us... forever..."; Stonewarden in caps: «ΚΑΝΕΙΣ ΔΕΝ ΠΕΡΝΑ ΧΩΡΙΣ ΤΟΝ ΛΟΓΟ ΤΟΥ ΒΑΣΙΛΙΑ.» / "NONE PASS WITHOUT THE KING'S WORD." |
| smith | Χάλντα του Αμονιού / Halda of the Anvil | Whitecliff's smith (reforge); **Stoneborn**; co-forged the Cradle | Whitecliff | **Yes** | Blunt craftsman: «Φρυκτωρός, ε; Το σπαθί σου έχει δει καλύτερες μέρες.» / "A beacon-keeper, eh? That blade has seen better days." Wonder: «Πρώτη φορά στη ζωή μου βλέπω αστέρια πάνω από τη φρυκτωρία. Είναι τόσα πολλά.» / "First time in my life I see stars over the beacon. There are so many." |
| healer | Ελιάνθη / Elianthe | Whitecliff's healer and trader | Whitecliff | **Yes** | Warm, motherly, brief: «Μη ντραπείς να το πιεις.» / "Don't be too proud to drink it."; «Γύρισες. Και φέρνεις φως.» / "You came back. And you bring light." Her line «Το δάσος ήταν δικό μας κάποτε.» / "The forest was ours, once." leaves her origin open. |
| villager | Χωρικός / Villager | Four barks, d.v.1-4 (Act I era) | Whitecliff; carried torches in the dark, lit Arna's hill by hand | Yes | Plain folk speech, a little gossip («Εγώ λέω πως τα έχασε.» / "I say she lost them."). |
| (mentioned) | Ντάιν / Dain | Brokka's father | — | ? | — |
| (mentioned) | Arna's brother | Never found on the Field (d.lamp.m1.2) | — | unknown | — |
| (mentioned) | The Evergreen children | Sent to the edges of the North; their saplings never grew, their names are cut in the stones (d.tear.nursery.*) | scattered | some, presumably | — |
| memory, ashMemory, narrator | Μνήμη από κεχριμπάρι / A memory in amber; Μνήμη από στάχτη / A memory in ash; narrator (empty name) | Narrator portraits | — | — | Present tense, third person (§5.7) |
| wayfarerGhost | Οδοιπόρος / Wayfarer | Hooded ghosts at the Unmaking | gone | — | — |

**Who is left:**
- **Whitecliff:** Halda, Elianthe, the villagers, Isarn's staff and the stash.
- **Deepstone:** Brokka.
- **The Weeping Woods:** Elati, Linden (a tree), Amaranthe's sapling, the white tree.
- **The Field of Ash:** no one. There is the lantern on the Last Lamp, the Graves lanterns lit at dawn, and farmable packs (Ash-Fallen, Ember Ticks, Smoke-eaters, Ashwings, Ashsmiths, Hammerhorns).
- **The Forge:** cold and empty.
- **No quest-giver remains.** help.p1 still says «Ο Ίσαρν, δίπλα στη φρυκτωρία του χωριού, σου λέει πού να πας.» / "Isarn, by the village beacon, tells you where to go."

### 2.2 The hero

- The hero is unnamed; the save slot shows the class name. In canon she or he is **«ο φρυκτωρός του Λευκόβραχου» / "the beacon-keeper of Whitecliff"** (intro.5). When Karthax asked «Τι είσαι εσύ;» / "What are you?", Isarn answered for the hero: «Φρυκτωρός.» / "A beacon-keeper." (d.isarn.k3)
- **Warden** (Φρουρός, male): «Ατσάλι και πείσμα.» / "Steel and stubbornness." Sword and shield, Fury. No backstory.
- **Ranger** (Ιχνηλάτισσα, female): «Αειθαλής από τα δάση του Βορρά.» / "One of the Evergreen from the northern woods." Crossbow, Energy, spirit wolf. She is **one of the children sent away before the rooting**: she «έφυγε πριν από το ρίζωμα» / "left before the rooting" (d.elati.1.r), and her own name is cut in the nursery stone (d.tear.nursery.3.r). Where she grew up is never said.
- **Mage** (Μάγος, male): «Μαθητής του Τάγματος της Φλόγας. Φωτιά, πάγος και κεραυνός.» / "A student of the Order of the Flame. Fire, frost and lightning." Mana. No backstory; the Order is never mentioned again.
- **Gendered grammar the game already uses:** the Ranger is «η φρυκτωρός» (d.karthax.r) and «Αδέσμευτη» (boon.unbound.f). The design docs call the hero "she" generically. Greek imperatives and second-person lines are gender-neutral; adjectives and participles are not, so write them as .r variants.
- **How others address the hero:** «φλογοφέρε» / "fire-bearer" (Elati, Ivar, Amaranthe, the Voice), «παιδί της φωτιάς» / "child of the fire" (Linden, the Lady), «φρυκτωρέ» / "beacon-keeper" (the Barrow Lord's altar), «ξένε» / "stranger" (Brokka), «μικρή σπίθα» / "little spark" (the Voice), «παιδί» / "child". To the Ranger: «αδελφή» / "sister" (Elati), «κόρη μου» / "my daughter" (Linden, the Lady), «παιδί του δάσους» / "child of the wood" (Karthax, the Voice).

### 2.3 Class variants (.r)

- `rl(k)` in story.js picks `k + '.r'` when the hero is a Ranger and that key exists; `rls(list)` maps a whole list. **Only the Ranger has variants.** There is no `.w` or `.m`, and supporting a Mage variant (for the Order of the Flame) would need a small change to `rl`.
- The 20 shipped .r keys: d.elati.1.r, d.elati.2.r, d.elati.h1.r, d.elati.aut3.r, d.linden.1.r, d.linden.heart.r, d.lady.w1.r, d.lady.h1.r, d.amaranthe.r, d.amaranthe.die1.r, d.tear.nursery.3.r, d.altar.unfading.r, d.elati.g1.r, d.elati.g3.r, d.voice.f1.r, d.elati.f1.r, d.karthax.r, d.cage.lady2.r, d.elati.u1.r, d.elati.home.r. d.elati.home.r is Ranger-only and has no base key.
- What they do: recognise her as Evergreen kin, swap "child" for "my daughter", add "sister", and remember her as a girl. Each Act since III has given the Ranger kin lines at every Evergreen beat, and Act V should keep doing so wherever an Evergreen speaks (Elati, or a grown nursery child).

---

## 3. Unresolved threads Act V can pay off without retconning

Ordered from strongest to weakest within each group. "Safe reading" is what Act V can make of the line without changing a word of it.

### 3.A The fourth fire and whoever lit it

| key | Greek | English | safe reading |
|---|---|---|---|
| d.answer.4 | Κι εκεί, μακριά στον βορρά, μια τέταρτη. Κανείς που ξέρουμε δεν την άναψε. | And there, far to the north, a fourth. No one we know lit that one. | Lit by people the North has forgotten, in answer to Whitecliff's new fire. "Answered" means they saw it, so they watch the south. |
| d.isarn.d3 / d4 (contrast) | Κανείς... κανείς δεν άναψε εκείνη. / ...Άναψε μόνο του. | No one... no one lit that one. / ...It lit itself. | The Act III fire lit itself (crown fire). The fourth was lit by a hand. Never make the fourth fire self-lit. |
| d.field.dawn | Ξημερώνει στο Πεδίο. Κάποιος άναψε τα φανάρια στα Μνήματα, ένα ένα. | Dawn on the Field. Someone has lit the lanterns in the Graves, one by one. | The same unknown hands came south through the Field, or someone else did. A lantern people honouring the Wayfarers' dead would fit. |
| FAR_BEACONS[3] | (data) | pale white-gold, due north, the farthest | It matches the white of Arna's own fire (d.k.tear) and Whitecliff's white-gold new fire. |
| world.js:48 comment; act4-design "Optional Act V seed" | (soft canon) "on the Dark Beacon" | | Conflicts with the Field, whose Dark Beacon is never lit. Recommended: drop it and put the fire on the coast. If Act V wants the Dark Beacon lit instead, it must light the darkBeacon prop under `newFire` as well. |

### 3.B The sea and the coast

| key | Greek | English | safe reading |
|---|---|---|---|
| intro.3 | ...άναψαν φρυκτωρίες σε κάθε κορυφή, από τη θάλασσα ως τα βουνά. Όσο καίνε, ο Βορράς είναι ασφαλής. | ...they lit beacons on every peak from the sea to the mountains. While they burn, the North is safe. | The beacon line ran from the coast. "While they burn, the North is safe" was true against something nobody remembered, and now they are out. |
| d.lamp.m3.3 | ...από τη θάλασσα ως τα βουνά. | ...from the sea to the mountains. | Arna himself went to the sea. The seaward end of his chain is the natural place for the first sea-light keepers to meet the Wayfarers. |
| d.tear.breaking.1 | ...το στέμμα του σπάει στα τέσσερα, σαν πυρωμένο σίδερο στο νερό. | ...his crown breaks in four like red-hot iron dropped in water. | Quench imagery: fire meeting water, steam, the sea. Usable as a motif, not as plot. |
| (absence) | No ship, port, coast, fjord, ice or aurora is mentioned anywhere. «φάρος» is never used. | | Everything about the coast is new. |

### 3.C "North": where everyone goes in the end

| key | Greek | English | safe reading |
|---|---|---|---|
| d.voice.4 | Όλοι πάνε βόρεια στο τέλος. Έλα κι εσύ. | Everyone goes north in the end. Come, you too. | In Act V the phrase can take a second meaning: beyond the Anvil, to the sea. |
| mon.ivar.t | Πήγε βόρεια, όπως πάνε όλοι στο τέλος | He went north, as they all do in the end | (same) |
| d.lamp.m4.2 / m4.3 | Βόρεια. Εκεί πάμε όλοι στο τέλος... / Περπατά προς τον βορρά χωρίς φως, και δεν γυρίζει να κοιτάξει πίσω. | North. That's where we all go in the end... / He walks north without a light, and does not turn to look back. | Arna walked north "without a light". Where he ended is never shown. |
| d.isarn.e3 | ...Λένε πως όσοι πάνε βόρεια μάς προσέχουν ακόμα. Το πίστεψα. | ...They say those who go north still watch over us. I believed it. | Wayfarer folklore that was a lie (it was Karthax). Act V can make it true in an unexpected way: someone in the far north *was* watching the fires. |
| d.isarn.2 | Κοίτα βόρεια. Πριν από τρεις νύχτες έκαιγαν εφτά φωτιές πάνω στις κορυφές... | Look north. Three nights ago seven fires burned on those peaks... | Six of the seven are still dark and unnamed (see 3.G). |

### 3.D Darkness, the Skotos, and light as protection

| key | Greek | English | safe reading |
|---|---|---|---|
| game.title / game.sub | ΣΚΟΤΟΣ / Οι φρυκτωρίες σβήνουν | SKOTOS / The beacons are going dark | The title has never been explained. Act V can make it the name of the thing under the ice and pay off the game's own title. |
| intro.3 | Όσο καίνε, ο Βορράς είναι ασφαλής. | While they burn, the North is safe. | (see 3.B) The core of Act V. |
| d.tear.breaking.5 | Από την άκρη της μνήμης, εκεί που δεν φτάνει το φως, κάποιος απαντά... | From the edge of the memory, where the light does not reach, someone answers... | The speaker is canon (Arna). The phrase "where the light does not reach" is free to echo. |
| d.karthax.p3 | ΣΒΗΣΤΕ. ΚΑΘΕ ΦΩΣ ΣΤΟΝ ΒΟΡΡΑ ΕΙΝΑΙ ΔΙΚΟ ΜΟΥ. | GO OUT. EVERY LIGHT IN THE NORTH IS MINE. | A boast. Act V can prove it false: one light in the North was never his. |
| d.isarn.f2 | ...Κι όσοι φυλάνε ακόμα στο σκοτάδι πληγώνονται μόνο στο φως. | ...And those who still keep watch in the dark can only be hurt in the light. | Light and Shroud is an established mechanic (light.js). Act V may reuse it but should vary it, not repeat it. |
| d.ivar.dark | Σβήστε τα φώτα. Στο σκοτάδι βλέπω καλύτερα. | Put out the lights. I see better in the dark. | (precedent for dark phases) |
| d.halda.2 | Η Βαθύπετρα ήταν σπίτι μας πριν γεμίσει σκιές. | Deepstone was our home before the shadows filled it. | "Shadows" are never explained beyond the Ashbound. A light hint is possible; do not hang plot on it. |
| d.isarn.r5 / d.isarn.after / gate.d | ...Στα βουνά άνοιξαν οι Σκιοπύλες, περάσματα για όποιον θέλει να δυναμώσει... / Οι Σκιοπύλες δεν έχουν πάτο... | ...The Shadow Gates have opened in the mountains, passages for anyone who wants to grow stronger... / The Shadow Gates have no bottom... | Why the Shadow Gates opened (after Act I, as the fires failed) and why they "have no bottom" has never been explained. Act V can tie them to the Skotos (the bottom is under the ice) **without changing how they play** in the post-game. |

### 3.E Cold and ice (a motif that has meant release until now)

| key | Greek | English |
|---|---|---|
| d.kingDie | Κρύο... επιτέλους... κρύο... | Cold... at last... cold... |
| d.voice.2 | Κάνει κρύο εδώ έξω. Φέρε τη φωτιά πιο κοντά. | It's cold out here. Bring the fire closer. |
| d.voice.f2 | Ζέστανέ με, μικρή σπίθα. Χίλια χρόνια κρυώνω. | Warm me, little spark. A thousand years I have been cold. |
| d.voice.cold | Σβήνω... Κάνει κρύο. Το είχα ξεχάσει. | I am going out... It is cold. I had forgotten. |
| d.forge.cold | Το καμίνι κρύωσε. Για πρώτη φορά σε χίλια χρόνια, το βουνό δεν ανασαίνει. | The forge is cold. For the first time in a thousand years the mountain does not breathe. |
| echo.karthax | Χτύπα το κρύο αμόνι | Strike the cold anvil |
| d.isarn.a4 | ...Ντύσου ζεστά. | ...Dress warm. |

In Acts II-IV cold meant the end of a fire-bound curse: Durgan's relief, Karthax going out. Act V turns cold into the threat. **Safe reading:** the cold that Karthax's fire kept off for a thousand years is the Skotos's cold. Do not claim that Karthax *knew* about it, or that his "thousand years cold" was the Skotos; that would recast his lines. Mechanics already in the game: the Mage's Frost Nova (sk.nova «Παγωνιά»), the Orb of Winter (leg.winterOrb), the elite affix «Παγωμένος» / "Frozen" (aff.frozen), and the suffixes «του Χειμώνα» / "of Winter" and «του Βορρά» / "of the North".

### 3.F The forgotten, and a fourth people

| key | Greek | English | safe reading |
|---|---|---|---|
| intro.2 | Άνθρωποι, Αειθαλείς και Λιθογενείς πολέμησαν μαζί... | Men, the Evergreen and the Stoneborn fought him together... | History names three. A fourth that fought too, or kept something else, was simply not remembered. Do not say intro.2 lied; say it forgot. |
| d.isarn.u3 | ...μην πεις ποτέ το όνομά του σε κανένα παιδί. Έτσι πεθαίνουν οι τύραννοι. | ...never tell his name to any child. That is how tyrants die. | Forgetting kills tyrants, and it also erased a people. That is Act V's moral mirror: what else did the North choose to forget, and why? |
| d.karthax.die | Ποιος... ποιος θα με θυμάται; | Who... who will remember me? | (theme) |
| intro.3 / d.lamp.m3.2 | Για να μην ξεχαστεί. | So no one forgets. | (theme) |
| d.lamp.m1.1 | Χίλια χρόνια πριν. Ένα αγόρι με ένα φανάρι ψάχνει στο πεδίο της Τέφρας τον αδελφό του. | A thousand years ago. A boy with a lantern searches the field of Ash for his brother. | **Arna already had a lantern and a fire of his own** before the brow-stone. Where they came from is open. |
| d.lamp.m1.2 | ...Φωνάζει ένα όνομα. Κανείς δεν απαντά. | ...He calls a name. No one answers. | **Arna's brother was never found.** Who he was, and where he fell or went, is open. |
| d.k.tear | ...Η φλόγα που μένει πίσω είναι άσπρη: η φωτιά του Άρνα, κρυμμένη χίλια χρόνια κάτω από τη λάμψη του. | ...The flame left behind is white: Arna's own fire, hidden a thousand years beneath its glare. | Arna's own white flame is clean, and the new Whitecliff fire was lit from it. If it came from the sea lights, the fourth people answered because they **recognised their own fire**, a payoff that changes no line. (The flame "turns white" when the stone goes in, d.lamp.m2.3, and is white again when it comes out: keep white as the colour of clean, old fire.) |
| d.isarn.d6 | ...δεν το ήθελε κανένας λαός... | ...no people would take... | No people, including a fourth, took the brow-stone. Consistent. |
| d.amaranthe | ...Τρεις φωτιές άναψες. Ξέρεις ποιος τις κοιτάζει; | ...Three fires you have lit. Do you know who watches them? | Answered by Karthax in Act IV, but it can carry a second, quiet meaning: a people in the far north watched every fire for a thousand years. Never contradict the first answer. |

### 3.G People and promises left open

| key | Greek | English | use |
|---|---|---|---|
| d.elati.aut3.r | ...Κι όταν τελειώσεις με τις φωτιές σου, αδελφή, θα σε περιμένω εδώ. | ...And when you are done with your fires, sister, I'll be waiting here. | Elati waits, but in Act IV she would not wait (g1, g1.r). She can come north again: in character, and keeps the Ranger's thread warm. |
| d.elati.home.r | Πάμε σπίτι, αδελφή. Θα γεράσουμε μαζί. | Let's go home, sister. We'll grow old together. | Act V must not kill Elati cheaply; this is a promise to the Ranger. |
| d.tear.nursery.1-3 (+.r) | Πριν ριζώσει, η Αμαράνθη έστειλε τα παιδιά μακριά, στις άκρες του Βορρά... / Τα βλαστάρια δεν μεγάλωσαν ποτέ. Τα ονόματα είναι ακόμα χαραγμένα στις πέτρες. | Before she took root, Amaranthe sent the children away, to the edges of the North... / The saplings never grew. The names are still cut in the stones. | Evergreen children grown up "at the edges of the North", the far coast among them, could live among the sea-keepers. A great Ranger beat. |
| d.isarn.2 / d.isarn.r4 | ...εφτά φωτιές... / ...έξι σβηστές. | ...seven fires... / ...six still dark. | Six unnamed peaks of Arna's chain stand dark. Act V can relight some or all of them, or reveal that the chain's seaward end is the coast, without a count that contradicts Act I. |
| d.brokka.c3 | Βάλε τη φωτιά σου μέσα. Θα την κρατήσει ως το τέλος του δρόμου. | Put your fire in it. It will hold it to the end of the road. | The Ember Cradle exists and still rides the hero's hip in the Act IV zones (light.js). It is a natural carried light for the coast if wanted. |
| d.halda.stars | Πρώτη φορά στη ζωή μου βλέπω αστέρια πάνω από τη φρυκτωρία. Είναι τόσα πολλά. | First time in my life I see stars over the beacon. There are so many. | The North has only just seen a dark sky, which sets up the aurora: the first aurora anyone in Whitecliff remembers. |
| boon.north.q | Ο άνεμος που πάει τον καπνό από φρυκτωρία σε φρυκτωρία. | The wind that carries the smoke from beacon to beacon. | The north wind is a blessing; it can blow off the sea. |
| class.mage.d | Μαθητής του Τάγματος της Φλόγας. | A student of the Order of the Flame. | An open order of fire-mages. A Mage-only line (needs `rl` support) could connect it to the sea lights. |
| d.v.3 | Ο γιος μου πήγε για ξύλα στο δάσος. Δεν γύρισε. | My son went for wood in the forest. He didn't come back. | A minor open village thread; optional. |

### 3.H Lines that read wrongly once Act V exists (update, don't contradict)

- help.p1 «Ο Ίσαρν, δίπλα στη φρυκτωρία του χωριού, σου λέει πού να πας.» / "Isarn, by the village beacon, tells you where to go." Isarn is gone, so name the new quest-giver.
- act4.next «Οι Σκιοπύλες σε περιμένουν, από το ραβδί του Ίσαρν δίπλα στη φρυκτωρία.» / "The Shadow Gates await, by Isarn's staff beside the beacon." For heroes who finish Act IV after the update, this becomes the Act V teaser.
- q.23 «Οι φωτιές καίνε ξανά, από ανθρώπινα χέρια. Οι Σκιοπύλες σε περιμένουν.» / "The fires burn again, lit by human hands. The Shadow Gates await." It stays as the hook state.
- diff.ash.d «Ο Κάρθαξ σε περιμένει προσωπικά.» / "Karthax awaits you personally." This is flavour text, but it names Karthax against Isarn's last request. Optional: reword it, for example to point at the Skotos.
- Brokka's line in the Halls is still d.brokka.after (Act II), and Elati's in the woods still the Act III autumn lines. Act V can give each a post-Act IV line, about the fire they lit and what they saw to the north.
- README.md counts «Οκτώ αφεντικά» (eight bosses) and «είκοσι τρεις αποστολές» (twenty-three quests); update both when Act V ships. It also calls the Stonewarden «Πετροφύλακας», while the game says «Ο Λιθοφύλακας» (mon.stonewarden); the game text wins.

---

## 4. Hard canon Act V must not contradict

**World and history**
1. Karthax forged the crown a thousand years ago and burned the North. Men, the Evergreen and the Stoneborn threw him down on the Field of Ash. The crown broke in four. (intro.1-2, d.tear.breaking.*)
2. The Skotos may be older than Karthax, but **do not make Karthax its servant, its jailer by design, or say the crown was forged against it**. That would recast his shipped wish (never to be forgotten) and method (granting wishes). The safe version: his fire held it back *as a side effect nobody knew about*, which is the owner's pillar word for word ("without anyone knowing").
3. **Every φρυκτωρία in the North was lit from Isarn's lantern and was the brow-stone's fire** (d.isarn.e1). Any older or independent light must be another kind of fire (a sea light, a φάρος), not a beacon.
4. Arna, male, the first Wayfarer, lit the beacons "from the sea to the mountains"; his hill holds the first. "It will be watched" was his answer.
5. **All four shards and the crown are unmade, and Karthax is gone.** The Voice went out. No crown magic, no wish-granting shards, and no Karthax as a villain again. Echoes of Ivar and Karthax are memories ("the ash remembers"), not resurrections.
6. **The Night Without Fires put out every beacon in the North at the same moment.** Every fire burning now was lit by hand afterwards: Whitecliff (by the hero, from Isarn's lantern, white-gold), Arna's hill (villagers), Deepstone (Brokka), the beacon-tree (Elati), and the fourth, by unknown hands, far to the north. The fourth fire must stay hand-lit by people "we" do not know.
7. Beacons lull the shards rather than burning them; three dreaming together call the fourth; only the fire that made them could unmake them. All of this is now history.
8. **Timeline:** a thousand years since the Breaking; a hundred years since Ivar, the Deep Forge and the still wood (never "four hundred"); three nights before Act I the beacons failed.
9. **The Field after Act IV:** dawn, every Graves lantern lit, Ivar's lantern on the Last Lamp, no Lampless, ash no longer falling. The Forge is cold and the mountain no longer breathes. Ash-Fallen and the other Act IV beasts remain as packs.
10. **The Field of Three Banners shows three peoples' dead.** Do not add a fourth banner there. A fourth people's dead, if any, lie somewhere else or unmarked.

**Characters**
11. **Isarn is dead.** He walked into the white fire with the crown. His staff and dark lantern stand by Whitecliff's beacon and say «Ξεκουράσου.» / "Rest.". He must not come back alive; at most as a memory.
12. Ivar and the Lampless are released and gone. Ivar's lantern stays lit on the Last Lamp.
13. Brokka (Deepstone), Elati (the Weeping Woods), Halda and Elianthe (Whitecliff) are alive. Elati's bark has stopped and she will grow old. Linden is a tree. Amaranthe is a sapling.
14. The Ranger is Evergreen and female, one of the children sent away before the rooting. Elati calls her sister; the Lady and Linden called her daughter. The Warden and the Mage are male. The Mage studied with the Order of the Flame.
15. Halda is Stoneborn. Brokka is the daughter of Dain. Durgan was Isarn's father's friend.
16. Keepers age slowly; Isarn was about 110.
17. The hero is "the beacon-keeper of Whitecliff". What the hero is, Isarn already said: «Φρυκτωρός.» / "A beacon-keeper."

**Systems that are part of the fiction**
18. The Shadow Gates stay the post-game: endless tiers, opened from Isarn's planted staff, with a Gate Guardian. Act V may explain them; it must not remove or relocate them.
19. Echo refights happen once a day, with normal loot and no story consequences, each in its act's material: amber in Act III, ash in Act IV.
20. Five difficulties: Οδοιπόρος / Wanderer, Φρυκτωρός / Warden, Ήρωας / Hero, Εφιάλτης / Nightmare, Τέφρα / Ash. Act V can add a sixth, but must not rename these.
21. The blessings from Acts I-IV are permanent, and the Act IV blessing is worth ×1.5 for an Unbound hero. Old saves get owed blessings on their next return.

**IP hygiene (the Act IV precedent, plus Act V's own traps)**
- The Act IV risks list renamed and dropped: no named "Watch" order, no "the watch does not end", no "Long Dark", no "Lord of Cinder", no eye-like brow-stone, no ring-wraiths.
- **Act V traps to avoid:**
  - George R. R. Martin: the Long Night, the Wall, White Walkers, "Winter is coming".
  - Tolkien: Forochel and the Lossoth (a northern ice-bay people), the Helcaraxë (the Grinding Ice), Ungoliant (a devouring darkness that eats light).
  - The Witcher: the White Frost.
  - Dark Souls: the First Flame, the Age of Dark, "linking the fire", the Abyss, Kindling. **Fire holding back darkness is close to Dark Souls**, so keep the vocabulary plain and Greek.
  - Lovecraft: Old Ones, Deep Ones, R'lyeh.
  - Warcraft: Frostmourne, the Lich King.
  - Skyrim: the Sea of Ghosts, Winterhold.
  - Diablo: "Prime Evil".
  - Disney's *Frozen*: the act title "The Frozen Coast" is generic and fine, but avoid ice-queen imagery.
  - Also: the repository's other game is called Abyssos, so do not call the Skotos "the Abyss".
- "Brokka, daughter of Dain" and "Black Warg" already ship; leave them alone.

---

## 5. Writing style

### 5.1 Voice

Short, plain and poetic, Greek first. One concrete image per line (smell, temperature, light, a sound). Understatement over exposition, and grief told sideways («Χίλιοι γάντζοι. Ένας άδειος.» / "A thousand hooks. One empty."). Revelations land in one sentence after a pause, often in a dialog on its own (d.isarn.e7 «...Δεν μου το είπε ποτέ.» / "...He never told me."). The Act IV review asked writers to "proofread every new bilingual line against text.js for the existing voice: short, plain, poetic". Dark themes, warm endings: every act closes on a fire answered by people.

### 5.2 Measured line lengths (text.js)

| kind | count | Greek chars (avg / median / max) | English words (avg / median / max) |
|---|---|---|---|
| dialogue d.* | 282 | 78 / 72 / 242 | 15 / 13 / 48 |
| quest q.N | 25 | 50 / 51 / 90 | 8 / 8 / 13 |
| blessing quotes boon.*.q | 12 | 49 / 50 / 70 | 9 / 9 / 11 |
| boss taglines mon.*.t | 8 | 34 / 35 / 53 | 7 / 6 / 11 |
| zone subtitles zone.*.s | 10 | 24 / 29 / 32 | 5 / 5 / 6 |
| act panels act*.done/sub/next | 12 | 37 / 42 / 71 | 6 / 7 / 10 |

Aim for a dialogue line of 1-2 sentences and 8-20 English words. Only the great confessions (d.isarn.d6, d.isarn.d8, d.ivar.die3) run past 35 words.

### 5.3 Dialogue

- **Greek is the original and English a natural translation**, not word-for-word. Greek uses elision with an apostrophe (Δώσ' το μου, Φέρ' τα μου), the άνω τελεία «·» where English has ";", and «» for quotes inside lines (boon.rest.q «Ξεκουράσου.»). English uses "" for quotes and ' for apostrophes.
- **Registers.** Folk speak with contractions in English: Isarn, Brokka, Elati, Halda, Elianthe, the villagers ("don't", "I'm", "you're"). The ancient and the grand never use contractions: Amaranthe, Linden, Karthax, Ivar as a ghost, the Voice ("I do not hate you. I pity you."; "I never conquered anyone.").
- **Ellipses** mark halting speech, the dying and memory (d.lordDie «Η Τέφρα... θα με... ξαναφέρει...» / "The Ash... will bring me... back..."; d.isarn.k1). Death lines are broken, short and ironic (Durgan: "Cold... at last... cold..."; Stonewarden: "The word... is given..."; Karthax: "Who... who will remember me?").
- **CAPS** are for a boss's climactic shout or a construct's voice. Greek caps carry no accents: «ΧΙΛΙΑ ΧΡΟΝΙΑ ΠΕΡΙΜΕΝΑ. ΦΕΡ' ΤΟ ΜΟΥ, ΦΛΟΓΟΦΕΡΕ. ΦΕΡ' ΤΑ ΟΛΑ.»; «ΣΒΗΣΤΕ. ΚΑΘΕ ΦΩΣ ΣΤΟΝ ΒΟΡΡΑ ΕΙΝΑΙ ΔΙΚΟ ΜΟΥ.»; «ΚΑΝΕΙΣ ΔΕΝ ΠΕΡΝΑ ΧΩΡΙΣ ΤΟΝ ΛΟΓΟ ΤΟΥ ΒΑΣΙΛΙΑ.»
- **Exclamation marks** are rare: Brokka in action, and Isarn's cries to his father.
- **Numbers are spelled out** («εκατό χρόνια», «τρεις νύχτες»), with "a thousand years" and "a hundred years" as the rhythm words.
- **Repetition with variation** across acts: "Rest." / "So you're awake."; "Let nothing of ours fade" → "Let nothing of yours fade, child. Not even your blood."; "Fall, leaf, fall".
- **How it is delivered.** `dialog` is a box with a portrait (the first letter of `npc.<who>`) and a list of keys, or of [key, who] pairs for several speakers. `say` is a single floating line: boss lines, the narrator, barks. `toast` is quest news (styles 'quest' and 'big'). Lady and Voice lines trigger by place (z.voices: one per area, deeper and more tender as you go).
- **Repeat lines** use an `again` suffix: d.brokka.again, d.elati.gagain, d.isarn.fagain, d.isarn.hagain, d.elati.autAgain. They are one short line, often wry or comforting («Πάρε ό,τι χρειάζεσαι...» / "Take what you need..." is the vendor's refrain).

### 5.4 Quest lines (q.N)

- An imperative in the second person singular: Μίλα / Ακολούθησε / Μπες / Νίκησε / Φέρε / Ανέβα / Βρες / Πάρε / Άγγιξε / Άνοιξε / Μάρανε / Αντίκρισε / Άκου / Ξανάναψε / Πέρνα / Ξύπνα (Speak / Follow / Enter / Defeat / Bring / Climb / Find / Take / Touch / Open / Wither / Face / Hear / Relight / Pass / Wake).
- About 8 words. A counter goes in parentheses at the end: "({0}/3)", "({0}/5)". A colon introduces the obstacle: «Άνοιξε την Πύλη των Ριζών: το Λευκό Ελάφι περιμένει στο Ξέφωτο των Λίθων» / "Open the Root Gate: the White Hart waits in the Glade of Stones"; «Πέρνα την Πύλη του Αμονιού: ο Φύλακας του Τελευταίου Λυχναριού περιμένει» / "Pass the Anvil Gate: the Keeper of the Last Lamp is waiting".
- A boss quest names the boss by title, not by name ("Defeat the Barrow Lord", "the Molten King", "the Lady", "the Keeper of the Last Lamp").
- **End-state quests** are a statement plus the post-game: q.16 «Ξεκουράσου και άκου τον Ίσαρν ως το τέλος. Οι Σκιοπύλες σε περιμένουν.» / "Rest, and hear Isarn out. The Shadow Gates await."; q.23 "The fires burn again, lit by human hands. The Shadow Gates await."
- The variant key q.14b swaps the text once a counter completes.

### 5.5 Toasts and event lines

- A door, gate or way opening: «Η X άνοιξε» / "The X stands open" (q.gateOpen, q.rootOpen, q.anvilOpen), «Ο δρόμος προς την Καρδιά άνοιξε» / "The way to the Heart lies open".
- Progress: "A thorn wall withers ({0}/3)", "A Great Bellows breathes ({0}/3)", "Waylamps of the Road: {0}/5", "Verses of the Long Sorrow: {0}/3".
- Item lines are a name plus a sensory simile: «Το Πρώτο Θραύσμα του Στέμματος. Είναι ζεστό, σαν να ανασαίνει.» / "The First Shard of the Crown. It is warm, as if breathing."
- 'big' toasts mark the act's turning points: «Το Στέμμα της Τέφρας λύθηκε» / "The Ash Crown is unmade"; gift.unbound.
- Buff toasts: «Μνήμη των Αειθαλών: +12% ζημιά, +8% ταχύτητα για 60 δευτ.» / "Memory of the Evergreen: +12% damage, +8% speed for 60s"; "Memory of the Wayfarers: ...". The pattern for Act V is «Μνήμη των/της X» / "Memory of the X".
- Narration lines (d.leave.1, d.k.*, d.u.*, d.field.*, d.answer.*) are present tense, third or second person, one image each: «Η φωτιά κατεβαίνει από τη φρυκτωρία και χωράει ολόκληρη στην Κούνια. Η πέτρα κρυώνει.» / "The fire comes down from the beacon and fits whole into the Cradle. The stone goes cold."

### 5.6 Act panels and the next-act line

- Title: «Πράξη ΙΙ — Ολοκληρώθηκε» / "Act II — Complete", with an em dash. **Greek numerals I-III use the Greek capital Iota (Ι, U+0399); «Πράξη IV» uses Latin I and V.** So Act V is «Πράξη V», with a Latin V.
- Sub-line: one image of what changed, 4-8 words: «Η πρώτη φλόγα ξανάναψε» / "The first flame burns again"; «Το Βαθύ Καμίνι σώπασε» / "The Deep Forge falls silent"; «Το πρώτο φθινόπωρο ύστερα από εκατό χρόνια» / "The first autumn in a hundred years"; «Οι φωτιές ανάβουν ξανά, από ανθρώπινα χέρια» / "The fires are lit again, by human hands".
- Next: «Πράξη ΙΙΙ: Τα Δάση που Κλαίνε. Μίλα με τον Ίσαρν.» / "Act III: The Weeping Woods. Speak with Isarn." (act2.next); «Πράξη IV: Το Στάχτινο Καμίνι. Μίλα με τον Ίσαρν.» / "Act IV: The Ashen Forge. Speak with Isarn." (act3.next). By that pattern Act V's would be «Πράξη V: Η Παγωμένη Ακτή. Μίλα με τον/την ...» / "Act V: The Frozen Coast. Speak with ...", naming the new quest-giver.
- The Act I panel alone also shows the unlocks (act.unlocks, act.gates and the next difficulty).
- Blessing panel: the header boon.hN («Η φλόγα απαντά» / "The flame answers"; «Η φλόγα του βουνού» / "The flame of the mountain"; «Η φλόγα των Αειθαλών» / "The flame of the Evergreen"; «Η φωτιά από ανθρώπινα χέρια» / "The fire lit by hand"), the shared sub-line boon.sub, then three cards.

### 5.7 Memories (Amber Tears in Act III, Lamp Memories in Act IV)

- The narrator portrait is 'memory' («Μνήμη από κεχριμπάρι» / "A memory in amber") or 'ashMemory' («Μνήμη από στάχτη» / "A memory in ash"). The body class changes the palette (sepia; white ash) and the people of the memory stand by as pale figures. For Act V the pattern gives «Μνήμη από πάγο» / "A memory in ice".
- Line 1 anchors the time: «Χίλια χρόνια πριν.» / "A thousand years ago."; «Εκατό χρόνια πριν.» / "A hundred years ago."; «Εδώ, ανάμεσα στα σβηστά φανάρια...» / "Here, among the dead lanterns...".
- Present tense, third person, short declaratives. One character speaks a line, usually the key one (a wish, a vow, a refusal: «Όχι. Δεν γονατίζω. Και δεν ορκίζομαι.» / "No. I will not kneel. And I will not swear.").
- The memory closes on an image or an aphorism: «Το ξύλο δεν ξεχνά τίποτα.» / «Το ξύλο τα συγχωρεί όλα.» ("Wood forgets nothing." / "Wood forgives everything."); «Το Δάκρυ κράτησε το γέλιο, όχι τα πρόσωπα.» / "The Tear kept the laughter, not the faces."; «...Το τραγούδι το θυμάται μόνο το κεχριμπάρι.» / "...Only the amber remembers the song."
- Each act has three to five memories of three to six lines. Story memories are counted in the quest; side memories hold small domestic scenes (a wedding, children's song, a missed arrow).
- Prompts: «Άγγιξε το Δάκρυ» / "Touch the Tear"; «Θυμήσου» / "Remember".

### 5.8 Bosses

- **Name and title:** «Όνομα, ο/η/το Επίθετο» / "Name, the Epithet": Δούργκαν, ο Λιωμένος Βασιλιάς / Durgan, the Molten King; Αργυρόκερως, το Λευκό Ελάφι / Silverhorn, the White Hart; Ίβαρ, ο Φύλακας του Τελευταίου Λυχναριού / Ivar, Keeper of the Last Lamp; Κάρθαξ, ο Άναξ της Τέφρας / Karthax, the Ash King. An alliterative form appears once (Αμαράνθη η Αμάραντη / Amaranthe the Unfading, with no comma). Title-only bosses take an article: Η Υφάντρα / The Weaver; Ο Άρχων του Τύμβου / The Barrow Lord; Ο Λιθοφύλακας / The Stonewarden.
- **Tagline mon.<id>.t:** about 6 words of fate or irony: «Χτίστηκε για να φυλάει. Ξέχασε ποιον.» / "Built to guard. It forgot whom."; «Ήθελε να σφυρηλατήσει την Τέφρα» / "He meant to forge the Ash"; «Ευχήθηκε να μην τον ξεχάσουν ποτέ» / "He wished never to be forgotten".
- **Line set:** an intro on wake (d.<boss>), with a Ranger .r variant if an Evergreen speaks; a phase line, in caps for the climax; mid-fight calls from an ally (Isarn's calls to Ivar; Elati's advice beforehand, d.elati.stones); death lines broken by ellipses, or a lucid three-line exchange that reveals the twist.
- **Echo prompt:** «Θυμήσου τον/την X» / "Remember X" (echo.hart, echo.lady, echo.ivar), or an action in the act's material ("Strike the cold anvil"). The rise and done toasts follow the material: «Το κεχριμπάρι θυμάται τη μάχη...» / "The amber remembers the fight..."; «Η στάχτη θυμάται τη μάχη...» / "The ash remembers the fight..."; «Η ηχώ σβήνει. Η στάχτη θα θυμηθεί ξανά αύριο.» / "The echo fades. The ash will remember again tomorrow." For Act V the pattern gives «Ο πάγος θυμάται τη μάχη...» / "The ice remembers the fight...".

### 5.9 Blessings

Three per act, tied to the act's people or place: Act I generic (Ember, Hearth, the North Wind); Act II Deepstone (Heart of the Forge, Brokka's Anvil, Runes of the Deep); Act III the Evergreen (Amber Tear, Grace of the Hart, Deep Root); Act IV the Wayfarers (the Wayfarer's Road, Isarn's Lantern, Rest). Keys: boon.<id> (a 2-4 word name, often "X of Y" or "Y's X"), boon.<id>.d (the stat line, using the existing stat words), boon.<id>.q (a one-line quote of about 9 words, often second person: «Ό,τι περπάτησαν χίλια χρόνια, το περπατάς τώρα ελαφριά.» / "What they walked for a thousand years, you now walk lightly."). An optional .du gives the Unbound version. Icons in use: flame, shield, roll, fire, star, potion, leap.

### 5.10 Names

- **Places.** Greek: an article plus a noun with a genitive («Ο Τύμβος των Βασιλέων», «Η Σκάλα των Γιγάντων», «Τα Μνήματα των Φαναριών», «Η Πύλη του Αμονιού»), a relative clause («Τα Δάση που Κλαίνε»), or a single compound («Λευκόβραχος», «Βαθύπετρα», «Καρδιόξυλο»). English: single compounds for settlements and woods (Whitecliff, Deepstone, Whisperwood, Heartwood, Lanternglade), and "The X of Y" or "The Adj X" for the rest (The Barrow of Kings, The Giants' Stair, The Field of Ash, The Ashen Forge, The Anvil Gate, The Lantern Graves, The Dark Beacon). **The English is a fresh coinage, not a calque** (Δάσος των Ψιθύρων → Whisperwood). Every zone name carries its article except zone.forest «Δάσος των Ψιθύρων».
- **Zone subtitles** zone.<id>.s, about 5 words: "The last flame", "The trees remember", "Where those who should not sleep", "The old road of the Stoneborn", "Where the fire never goes out", "An autumn that will not end", "Inside the First Oak", "Where the Ash King fell", "Inside the Black Anvil".
- **Inner areas** have Greek and English names in the design and the map: Το Πεδίο των Τριών Λαβάρων / The Field of Three Banners, Οι Κάμποι της Θράκας / The Ember Flats, Η Αίθουσα των Ακέφαλων / The Hall of the Headless, Οι Στοές της Ανάσας / The Breath Galleries. Interactables take a verb prompt: «Άναψε το φανάρι» / "Light the lamp"; «Ξύπνα το Φυσερό» / "Wake the Bellows".
- **Enemies.** Greek favours a coined compound (Τεφρογενής, Τυμβόσκιος, Νεκροφύλακας, Μαγματόσκυλο, Βαθυσκώληκας, Καπνοφάγος, Τεφρόφτερος, Πυροτσιμπούρι, Τεφρομάστορας, Σφυροκέρατος, Ριζούλι, Καρδιόριζα) or Greek folklore words (Καλικάντζαρος for goblin, Μοιρολογίστρα for mourner). English favours a compound or "Adj Noun" (Ashspawn, Barrow Shade, Smoke-eater, Ashwing, Ember Tick, Hammerhorn, Rootling, Heartroot, Hill Troll, Deep Bat, Amberback Bear). **Each act's humanoid faction has a family name:** Τεφρόδετος X / Ashbound X (Act II), X της Ρίζας / Rootsworn X (Act III), X της Τέφρας / Ash-Fallen X (Act IV), plus the Άφεγγοι / Lampless. Act V's frozen humanoids should get one family name in the same way.
- **People names.** Men and Wayfarers have short Norse-sounding names (Isarn, which is Old Norse for "iron"; Ivar; Arna; Halda). The Stoneborn have hard consonants (Brokka, Durgan, Dain). The Evergreen have Greek plant names (Elati, Linden, Amaranthe). Elianthe's name sounds Evergreen («ήλιος» + «άνθος»), but her people is never stated. Karthax sounds harsh. Act V's fourth people needs a phonology of its own: for example Greek sea and light words, or a softer sound that matches none of the above.
- **Transliteration:** B → Μπ (Μπρόκα), initial D → Ντ (Ντάιν) but Δ in Δούργκαν, G → Γκ (Δούργκαν), V → Β (Ίβαρ), H → Χ (Χάλντα), -x → -ξ (Κάρθαξ). Accents are always present in Greek except in caps.
- **«Σκότος» is a neuter third-declension noun,** like «το δάσος»: **το Σκότος, του Σκότους, στο Σκότος**. Never «ο Σκότος». In English, "the Skotos" or simply "Skotos" matches the title (game.title "SKOTOS"). Pick one and keep it.
- **Collisions to avoid:**
  - "Warden" is already both a class and a difficulty, and also part of Stonewarden and Rootwarden.
  - «Οδοιπόρος» is both the Wanderer difficulty and Isarn's order.
  - "Keeper" is everywhere: beacon-keeper, Keeper of the Last Lamp, "the keepers' statues".
  - «Φύλακας» is used for the Gate Guardian, the Keeper of the Last Lamp, and Νεκροφύλακας / Λιθοφύλακας / Ριζοφύλακας.
  - «Παγωμένος» / "Frozen" is the elite affix that prefixes rare monster names, so "Frozen X" as an enemy name would read as an affix.
  - The English "Keeper(s) of the sea lights" collides with all of the above; consider a distinct root (Greek «φάρος» has never been used).

### 5.11 Key conventions (for the contract)

- d.<speaker>.<beat letter><n>: Isarn used r, a, b, c, d, e, f, h, k, u by beat; Elati used g, f, h, aut, u.
- `.r` for the Ranger; `again` for repeats.
- d.<boss>, d.<boss>.p2/.p3, d.<boss>Die or .die/.die1-3.
- q.N, q.Nb; q.<event> for toasts; mon.<id>, mon.<id>.t; zone.<id>, zone.<id>.s; exit.<id>; wp.<id>; echo.<boss>, echo.rise<N>, echo.done<N>.
- boon.hN, boon.<id>.d/.du/.q; actN.done/.sub/.next; npc.<id>.
- d.tear.<id>.<n> and d.lamp.m<k>.<n> for memories; d.answer.<n> for answers.

---

## 6. Quest numbering, flags, and how the next act is announced

### 6.1 Quests 0-23

| act | q | text (EN) |
|---|---|---|
| I | 0 | Speak with Isarn at the beacon |
| I | 1 | Follow the trail north through the Whisperwood |
| I | 2 | Enter the Barrow of Kings |
| I | 3 | Defeat the Barrow Lord |
| I | 4 | Bring the shard to Isarn → beaconScene(1) → actComplete(1) |
| I end / II hook | 5 | Speak with Isarn at the beacon again |
| II | 6 | Climb the Giants' Stair to the Gate of Deepstone |
| II | 7 | Enter Deepstone and find whoever survived |
| II | 8 | Find the Deep Forge and defeat the Molten King |
| II | 9 | Bring the Second Shard to Isarn → beaconScene(2) → actComplete(2) |
| II end / III hook | 10 | Speak with Isarn at the beacon |
| III | 11 | Take the west road and find the Lanternglade |
| III | 12 | Touch the three great Amber Tears ({0}/3) |
| III | 13 | Open the Root Gate: the White Hart waits in the Glade of Stones |
| III | 14 / 14b | Wither the three thorn walls of the Heartwood ({0}/3) / Face the Lady in the Heart Chamber |
| III | 15 | Bring the Third Shard to the beacon of Whitecliff → beaconScene(3) → actComplete(3) |
| III end / IV hook | 16 | Rest, and hear Isarn out. The Shadow Gates await. |
| IV | 17 | Hear Isarn out, then carry the beacon's fire north in the Ember Cradle |
| IV | 18 | Relight the waylamps of the Wayfarers' Road ({0}/5) |
| IV | 19 | Pass the Anvil Gate: the Keeper of the Last Lamp is waiting |
| IV | 20 | Wake the three Great Bellows of the Forge ({0}/3) |
| IV | 21 | Climb to the Anvil of the Crown |
| IV | 22 | Carry the Wayfarers' light home and light the beacon of Whitecliff → beaconScene(4,'answer') → actComplete(4) |
| **IV end / V hook** | **23** | **The fires burn again, lit by human hands. The Shadow Gates await.** |

Each act has 5-6 quests and ends in an end-state quest that is also the next act's hook. Act V therefore starts at **q24**. To match Act IV's six quests (17-22), its quests are 24-29 with **end state 30**, or 24-30 with end state 31 if it needs a seventh step.

### 6.2 How quests move (story.js)

- `setQuest(n, quiet)` only ever raises the quest (`if (G.hero.quest >= n) return`). It toasts «Νέα αποστολή: …» unless quiet, then emits 'quest' and saves.
- `questText()` clamps with `Math.min(G.hero.quest, 23)` and fills counters for q12, q14, q18 and q20. **It must be raised for Act V.**
- `actComplete(act)` sets `h.actN = max(h.actN, h.diff)`, **hard-sets the end-state quest** (5/10/16/23), sets `flags.actN` and `G.flags.actDone = act`, plays music ('victory', or 'newfire' for Act IV) and opens the 'act' panel. **Its last branch is a bare `else` that treats any act ≥ 4 as Act IV**, so Act V needs a branch of its own.
- On 'actClosed', `offerBoons()` loops `[1, 2, 3, 4]` and opens the 'boon' panel for any completed act whose `h.boons[act-1]` is empty. Act V must extend the loop and add BOONS[5] and boon.h5.
- `zoneEnter` catch-ups: a flag saved while the quest change was still on a timer is caught up quietly on the next entry. Act IV does this for town, ashfield and forge (fireTaken → 18, mem_l1..l5 → 19, ivar → 20, plug → 21, crownUnmade → 22, newFire without h.act4 → actComplete(4)). Act V needs the same for every step.
- Boot migration (boot.js): `hero.act2/act3/act4 ??= -1`, and `flags.actN = true` when `h.actN >= 0`. Add `hero.act5 ??= -1`. The new-hero state (state.js) has act1-act4 = -1.
- `npcHasNews(kind, a)` decides who shows the "!" marker; it is quest- and flag-driven per zone.
- Exits are locked by flag name (world.js `e.locked`: weaver, stonewarden, act1, act2, hart, fireTaken, ivar), each with its own shut line (d.gateShut, d.mountainShut, d.woodShut, d.rootShut, d.roadShut/d.northShut, d.anvilShut). An Act V exit should follow the same pattern: a flag lock plus a shut line.

### 6.3 Flags in use (hero.flags unless noted)

- **Act I:** weaver, lord, act1, metSmith, metHealer.
- **Act II:** stonewarden, king, act2.
- **Act III:** metElati, metLinden, tear_<planting|sorrow|breaking|m1|m2|m3|nursery>, hart, hartAt{x,z}, thorn0-2, ladyDown, autumn, autumnWeep, elatiHeart, elatiAutumn, after3, act3.
- **Act IV:** fireTaken, isarnField, isarnHook, brokkaField, brokkaForge, elatiGraves, elatiForge, lamp_<id>, mem_l1..l5, gifts{throne|forge|unfading: 'taken'|'refused'}, unbound, giftsTaken, ivarDown, ivar, bellows0-2, heat (0-3), plug, browstone, karthax, crownUnmade, backHome, **newFire**, act4.
- **Misc:** tickHint, legFrom_<boss> (a boss's first-kill legendary).
- **Hero fields:** quest, diff, act1..act4 (the best difficulty completed, −1 if not), boons[] (one id per act), wps[] (waypoints), gateBest, stats, created.
- **Session-only:** G.flags.actDone.

### 6.4 World state at Act V's start (what the flags drive)

- **Town** (world.js townFires, townPresence): the beacon is lit when `!fireTaken || newFire`, white-gold (light 0xffe2a8) with newFire. The far fires follow `lit = [act1, act2, act3, newFire]`, and all are dark when `crownUnmade && !newFire`. Villagers' torches show only while `fireTaken && !newFire`. Isarn's staff is an interact with newFire. The 'beacon' interact exists only at q22 before newFire.
- **The Field** (nightMode): 'ash' before the Unmaking → 'stars' (crownUnmade) → 'dawn' (newFire). The Dark Beacon prop stays cold in every state. The Graves lanterns are all lit at dawn.
- **The Forge:** forgeHeat() = −1 (cold) after crownUnmade; the greeting is d.forge.cold.
- **Act V's own world-state change** should be one more flag in this chain, read on zone build and load like fireTaken, crownUnmade and newFire, so that quitting mid-cine never strands a save. Old saves without it must read as the Act IV end state (q23 + newFire).

### 6.5 How the next act is announced, and what that means for Act V

- **The pattern so far:**
  1. The act's end beat (the beacon scene: a fire answers) leads to `actComplete(N)` and the act panel (actN.done, actN.sub, stats, actN.next naming the next act and "Speak with Isarn").
  2. Then the blessing panel.
  3. The end-state quest waits for a talk with Isarn, which sets the first quest of the next act (q5 → a1-a4 → q6; q10 → c1-c3 → q11; q16 → after3 → q17, then e1-e6).
- **Act IV broke the pattern on purpose:** act4.next is not a teaser ("The Shadow Gates await, by Isarn's staff beside the beacon."), Isarn is gone, and the "Act V seed" is the fourth fire alone.
- **What Act V therefore needs:**
  1. **An in-world hook for saves already at q23.** They have seen the Act IV panel and will never see it again. The hook can fire on zoneEnter town (q23 && newFire && act4 done): for example a stranger at the beacon, a sign of the fourth fire, or the aurora, which sets q24 and toasts «Νέα αποστολή».
  2. **A new act4.next** for heroes finishing Act IV after the update, in the established form «Πράξη V: Η Παγωμένη Ακτή. ...» / "Act V: The Frozen Coast. ...". The game may also skip the extra panel and let the in-world hook do the work.
  3. **A new quest-giver,** with help.p1 updated to name them.
  4. An Act V end beat in the same family: a fire, light or answer scene leading to actComplete(5), act5.done/sub/next, boon.h5 and three blessings. The end-state quest should mention the Shadow Gates ("... Οι Σκιοπύλες σε περιμένουν." / "... The Shadow Gates await.").
  5. **Code touchpoints:** questText clamp; setQuest 24+; actComplete branch 5; offerBoons [1..5]; boot `act5 ??= -1`; state.js default; BOONS[5]; FAR_BEACONS/lit if a new far fire answers; act5.* keys; zone catch-ups; an exit lock flag and shut line; npcHasNews; echo prompts for both bosses (echo.<boss>, echo.rise5/done5); the README act section and counts.
