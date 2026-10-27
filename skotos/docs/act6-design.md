# Act VI: Beneath the Ice

«Πράξη VI: Κάτω από τον Πάγο» / "Act VI: Beneath the Ice". Latin V and I, as canon §5.6 sets for IV and V.

Act VI begins from a save at quest 31 (`seaLit`, `h.act5 >= 0`). The Skotos has been named and has sunk beneath the ice. The Farthest Light burns Whitecliff's fire, the sea-lights answer down the coast, and every night Selna says the names at the tower. Her rite still opens with a hole: «Η Πρώτη, που τ' όνομά της το πήρε η θάλασσα.» / "The First, whose name the sea took." (d.glaukos.r1). In the post-game Alkyone has already promised the player this act: «Οι πύλες σας δεν έχουν πάτο, λέτε; Έχουν. Είναι κάτω από τον πάγο μας.» / "Your gates have no bottom, you say? They do. It's under our ice." (d.alk.gates)

**The act in one paragraph.** It is the halcyon days, the still weeks in the heart of winter, and Whitecliff is forgetting small things: the child stumbles on the Saltborn's name, Halda loses what she meant to say about the stars, and frost grows inside Isarn's dark lantern. The Farthest Light stops turning and flashes three times toward Whitecliff, and Tamarisk walks in from the north with Selna's word: far below the clear ice where the Skotos sank, a small fire is burning, and every night it trembles less. Under the ice the Saltborn have melted a hole with whale oil, and beneath it there is no sea: the Skotos drank it to go down. The hero takes a coal from Einar's light, climbs down the rope with blind Old Glaukos, and follows the marks of a woman who went down there before all memory with a brand in her hand. She is the First. She gave her name away to hide from the dark, because «Ό,τι έχει όνομα δεν κρύβεται» / "What has a name can't hide" (d.alk.b3), and the fire she has kept at the bottom throws its shadow up through the dark: that shadow is the Shadow Gates. In the last black water of the drained sea the hero kills the Ketos, the old beast whose light does not flicker and which drew boats down for longer than anyone remembers, Keyx's among them, and finds his lantern, still flickering. At the bottom of the Gates lie the drowned barrow, wood and village that every Gate copies, and in the village Keyx stands among the forgotten with his face still his own, because his wife says his name every night. The hero gives him back his lantern and he lets go. At the First's hearth the Gate Guardian is waiting, the one met at the end of every Gate, now seen for what it is: the Shade of her fire. It wears the Barrow Lord, the Weaver and the troll, and last of all the hero's own shape, and dying it gives the hero the First's name. The hero relights her fire with Whitecliff's coal and says the name in the light: «Φέρουσα» / "Pherousa", she who carries, the word inside «φλογοφέρε», "fire-bearer", which the North has called the hero since Act III. The Skotos, which rose to hear it, cannot hold a name said in the light, and sinks like something falling asleep. The hero gives the First Isarn's last word, «Ξεκουράσου.» / "Rest.", and she answers that rest is sleeping while someone else keeps the light. No one stays below alone: Glaukos climbs back up the rope, and the hero climbs home up the Gate and steps out beside Isarn's staff, where warm air is rising. Halda says Isarn's first words to the hero, «Κοίτα βόρεια.» / "Look north.", and the six peaks dark since the night before the game catch fire one after another.

**How this design was made.** Three proposals (production-first, story-first, systems-first, `docs/act6-briefs/proposal-*.md`) were judged twice:
- The first judge (story ×1.5, fun ×1.5, feasibility, fit) scored production 39.25, systems 38, story 37.25.
- The second judge (feasibility ×2) scored production 39, story 36, systems 35.
- **Both put production first**, so it is the base: its spine, its zones and generator, its three mechanics, its Shade of the Gate, its perf bar, its budget and its stage plan.
- The story proposal's heart (the Ketos, true and false light, Keyx, Leif, the seven peaks, the names from above, the forgetting at home) and the systems proposal's class, progression, co-op and post-game hooks are grafted in.
- Where the judges disagree, the call and its reason are under **Decisions**, just below. The traceability tables are under **Synthesis**, near the end.

**Scope** (the owner's frame is Act V's):
- **2 zones,** one new generator `src/world/gen6.js`:
  - `drained`, «Η Στεγνή Θάλασσα» / "The Drained Sea", level 34: the dry seabed under the ice beneath the Farthest Light, with the Black Mere at its south end. Two readings: `mere` before the Ketos falls, `dry` after.
  - `bottom`, «Ο Πάτος των Πυλών» / "The Bottom of the Gates", level 37: the drowned barrow, wood and village, the Shadow Stair and the First's Hearth. Two readings: `dark` before her fire is relit, `lit` after.
  - The levels keep the +3 cadence (engine brief §4). Monsters track the hero, who arrives at about level 47-50 (Difficulty).
- **7 regular enemy entries (8 kinds),** counted as Acts IV and V counted them:
  - reused unchanged from Act V: the Sunken, the Hull-louse, the Icemaw;
  - new kinds on shipped models: the Sunken Lampbearer (the `sunken` frost scene with the rime oil lamp in code), the Faded (people.glb villagers under a runtime void tint), the Gate-Fallen and their bowmen (the boot-loaded skeletons, rimed);
  - one new creature: the Falselight, a pale cave scorpion with a lure of dead-still light (Sketchfab "Scorpion", scouted for Act V, gated; fallback: the boot-loaded spider with a code lure, no download).
- **2 bosses:**
  - «Το Κήτος» / "The Ketos": Sketchfab "Pistosaur Animated" (scouted 'ok' for Act V, gated) with a code lure; fallback the shipped Icemaw at ×3.4 with the same lure, no download;
  - «Ο Ίσκιος της Πύλης» / "The Shade of the Gate": four forms on one life bar, three of them the boot-loaded Act I bosses (the Barrow Lord, the Weaver, the troll), the fourth the hero's own class body (people.glb) in black, answering every one of the 21 skills.
- **Quests 32 to 38;** the new end state is **39**.
- **3 mechanics,** each an existing system with one new input:
  - the Carried Fire (Η Φωτιά που Κουβαλάς): the Cradle's ring (light.js) becomes a resource the dark drinks and true fires refill, with Act IV's Shroud for the Skotos's creatures. **True light flickers and false light does not**, by motion, colour and sound together; false light never refills it;
  - the Black Water (Το Μαύρο Νερό): tide.js in pockets, as the Skotos's breath;
  - the Ice Overhead (Ο Πάγος από Πάνω): forge.js's slag drips as falling icicles, and skylights as safe light.
  - Plus one timing window, the Names from Above (Τα Ονόματα από Πάνω): Selna's shipped nightly rite heard under the ice.
  - The Cold (cold.js) carries over unchanged. There is no thin ice, so ice.js does not run in Act VI zones.
- **A world-state chain:** `call6` → `coal6` → `drainedSeen` → `hearth6_1..3` → `ketosDown` (with `keyxLamp`) → `blackLamp0..2` (with `keyxFreed`) → `shadeDown` → `firstLit` (with `nameBack`) → `homeGate` → `act6`. Optional: the Lost (four toppled sea-lights and three forgotten people) → `lostAll`.
- **Also:**
  - seven optional Lost (Τα Χαμένα): the four Lost Lights, the missing four of Glaukos's nine (d.glaukos.2), and three forgotten people: Leif, the woodcutter's son of Act I (d.v.3); the Sailor of Act V's Name-stone; Asger of the Order of the Flame. All seven make the Act VI blessing worth ×1.25, and each leaves a named lamp at the First's Hearth, so a hero who explored fights the Shade in a brighter arena;
  - the forgetting at home and its undoing; the six peaks lit at the end; Keyx's lantern on the Landing's post;
  - class light hooks on every skill that makes, carries or uses light or frost, a 13th Mastery track «Λύχνος» / "Lamplight" (the owner's call), and guest-usable fight interacts in co-op with a lantern chain;
  - three blessings, two echoes, two first-kill legendaries;
  - four new themes and one variant, a hearth motif;
  - one small post-game find in the Shadow Gates, and a depth line on the Gate panel; the Gates play exactly as before;
  - the unload of Acts II-IV (engine brief §5.4), promoted from contingency to stage A.
- **Budget:** about 1.7-2.2 MB raw of new files (≈ 2.2-2.9 MiB of artifact) and about 8.4-16.1 MB of new phone texture; a cold start into Act VI is about 89-96 MB against the 110 MB bar (Assets).
- **Cost:** about 42-53 focused days (Act V: 47-58; the base alone was 34-43). Engine work itemises it, with a cut order that brings it back to about 37-46.

**The act in one idea: reuse the systems, not the pictures.** Act VI changes what the shipped systems mean, not what they are:
- the Cradle's ring becomes the fire you carry, and the dark drinks it;
- the tide becomes the dark's breath;
- the slag drips become ice falling from the vault;
- the Gate Guardian becomes a character;
- the Shadow Gates' two generators become places you walk through;
- Selna's nightly rite becomes a light that reaches under the ice.

The new code is mostly data and rules over systems that already pass their scenarios. The new pictures are few: one boss, one small creature, two ground layers.

**The look in one idea: the dark is the absence, and light is what you can trust.** The gameplay camera never sees a ceiling (pitch 0.95 rad, engine brief §0.2), so an under-ice act draws a floor, walls, black pools and lights. Every light on screen is one of two kinds, and the player learns to read them at a glance: **true light trembles** (warm, flickering, crackling) and **false light is dead still** (cold, steady, a pure tone). The vault of ice, green with the aurora above it, is drawn only in cinematics, which lower the camera.

---

## Decisions
Where the two judges disagree, this design decides as follows.

| question | judge 1 | judge 2 | decision | why |
|---|---|---|---|---|
| **The first boss** | the Ketos replaces the Gleaner | keep the Gleaner (shipped louse at ×5.5) | **the Ketos** (one gated download, a no-download fallback) | The first boss is the act's one picture players remember, and judge 1 found the Gleaner its weakest picture and fight (a "big mother of the small enemy", stretched texels). The Ketos teaches the true-and-false-light rule that both judges grafted, with its own lure, in three phases. The Pistosaur is Act V-scouted 'ok' (CC-BY 4.0, own sculpt), its fallback is the shipped Icemaw at ×3.4 with the same code lure, and the cold start stays at 89-96 MB. The Gleaner's best rule ("it will not eat in the light") passes to the Ketlings: they will not gnaw a lamp while a hero stands in its light. |
| **The Stiltwalker's slot** | the Falselight (Scorpion) | no download: the own-build long-legged spider | **the Falselight**, on the Scorpion if its provenance gate passes at stage 0 with no doubt, else on the boot spider ×0.8 with a code lure from the start | The Stiltwalker's `stir` verb was minor and its source unfound; the Falselight is the true-and-false-light rule with legs, which both judges grafted. Judge 2's rule for doubtful downloads is kept: any doubt takes the no-download body, and the verb does not depend on the body. |
| **Glaukos at the end** | stays below to keep her fire | returns; the watch is shared | **he returns** (a visiting vendor at the Rope camp), and the First's fire is held by the names said above | A fire relit at the bottom of the world with a lone keeper who stays to tend it is the Dark Souls pattern canon §4 warns about. It also cuts against the act's best idea: every watcher in this game kept watch alone (Isarn at ten, Arna, Ivar, the Lampless, the First), and Act VI ends the lonely watch. The owner can still choose otherwise (owner question 1). |
| **The seven peaks** | six dark peaks (FAR_BEACONS 7-12) | three still dark (Act IV relit three) | **six** | Canon brief §1.5: "Deepstone's beacon and the beacon-tree had been dark for a century, so they are not among the seven". d.isarn.r4 «Μία φωτιά ξανά αναμμένη, έξι σβηστές.» counts after Act I, and Act IV relit only Arna's hill of the seven (FAR_BEACONS[0]); Deepstone ([1]) and the beacon-tree ([2]) are other fires. So six of the seven peaks are still dark, and Halda's «Εφτά. Οι έξι σβηστές.» is correct. |
| **The tyrant's ember** | in, optional, with a narration-only fallback | out (canon §4 rule 5) | **in, optional, narration-only by default**; its two spoken lines are written and kept for the owner (owner question 2) | Isarn's last request (d.isarn.u3) fulfilled on screen, with the image of the Breaking (d.tear.breaking.1), is too good to lose; but canon rule 5 says Karthax is gone and the Voice went out, and a talking remnant brushes it. A glow that says nothing, to which the hero says nothing, keeps the payoff and the rule. |
| **Keyx's thread** | his lantern found when the Ketos falls, carried up, hung at the Landing | one Faded keeps his face, freed by light, walks into the black water | **both, as one beat**: the lantern comes out of the Ketos's mere; in the Forgotten Village Keyx keeps his face and holds the village's black lamp, the dead-still light he once rowed toward; the hero puts that lamp out by giving him his own flickering lantern | It costs no new mechanic (it is the black lamp's channel), sits on the main path, needs no boss or escort, and says the act's two rules at once: true light trembles, and remembering can be a cage («Γι' αυτό είναι ακόμα δικός μου», d.alk.b5). |
| **Leif's place** | the Forgotten Village | the Drowned Wood | **the Drowned Wood** | He walked through "a door in the forest with no wall", a forest Gate, so he is found in the wood every forest Gate copies; and the village is Keyx's. |
| **The post-game Shadow Gates** | Drowned tiers every fifth tier, the Shade as their Guardian (owner decides) | cut; the "forgotten in the dream" find instead | **the small find and a depth line in the base; Drowned tiers are written as a stretch for the owner** (owner question 4) | Canon item 18: the Gates stay as they are. The find adds a reason to look at a Gate level without changing how it plays; Drowned tiers change the Gates' play and their cost is real (about 1.5-2 d plus balance), so the owner decides. |
| **Boss time-to-kill bands** | 120-200 s Ketos, 240-420 s Shade on Warden | the same, "for the reference build at 47-50" | **the same bands, anchored as Act V measured them**: for the scenarios' hero at the zone's level (L36 for the Ketos, L40 for the Shade, as Act V's scenarios ran L30/L34), with the balance-act bot at the profile levels (47-50) reported beside them | integrate.md measured Act V twice: the scenarios' hero (Tower 83-117 s, Skotos 213-381 s) and the bot's reference build at the profile level (46-63 s, 83-186 s). The judges' bands match the first curve; asserting them on the second would make these fights several times Act V's. |
| **The Faded and auto-aim** | the base's mild rule | the base's mild rule ("phone-safe") | the base's rule, with one change: **outside light, auto-aim prefers a lit foe but never skips a Faded** | The base's "no auto-aim outside light" is half of the systems rule both judges cut as the riskiest on a phone. Faded must enter the 4.5 m ring to strike anyway. |
| **The Lamplight Mastery track** | in | the owner's call | **in the design, behind the owner's word** (owner question 5) | It answers the owner's own complaint ("points with nowhere to go") with a stat the act makes worth buying, for about 1 d. |
| **The halcyon days, «Καληνύχτα.», «Ακόμα και το σκοτάδι κοιμάται»** | (not named) | grafted as text | **in**, with the Skotos's last line written to match («...κουράστηκα...», it sinks "like something falling asleep") | Text only; it rhymes the names Alkyone and Keyx without telling the myth, and gives the dark Isarn's word too, without rereading the rite (judge 1's cut stands: the rite keeps its meaning, "so it cannot hide"). |
| **Tamarisk** | her Ranger line «Σου είπα να 'ρχεσαι να με βρίσκεις...» and her Lanternglade epilogue | (not named) | **in**: Tamarisk brings Selna's word to Whitecliff in the hook (so the line is true), keeps the Rope camp during the act, and goes to the Lanternglade after it | The line needs her to have come to the hero; she is the Saltborn's walker already (Act V). |

---

## Story
### premise
**At quest 31.** Act V left four things in the post-game that point down:
- Selna's rite, every night at the Farthest Light, opens with the First, «που τ' όνομά της το πήρε η θάλασσα» / "whose name the sea took" (d.glaukos.r1). Nobody knows that name.
- When the Skotos was named, «It sinks. The hole freezes clear in a white wave from the tower.» (act5-design, ending). The ice over the place where it sank is clear. You can see down.
- Alkyone's d.alk.gates says the Shadow Gates have a bottom, under the Saltborn's ice.
- Alkyone's husband: «Κήυκας. Βγήκε με τη βάρκα του μια νύχτα χωρίς φεγγάρι και δεν γύρισε. Η Αλκυόνη λέει ακόμα τ' όνομά του.» (d.stone.keyx), and «Ακόμα λέω τ' όνομά του. Γι' αυτό είναι ακόμα δικός μου.» (d.alk.b5).

Act VI explains the first three with one woman, and pays off the fourth on the way down.

**The halcyon days.** The act opens on a narrated line over Whitecliff, d.hal.1 «Στην καρδιά του χειμώνα έρχονται οι αλκυονίδες: μέρες που η θάλασσα σωπαίνει και δεν φυσάει.» / "In the heart of winter come the halcyon days: days when the sea is still and no wind blows." The Greek phrase comes from the old tale of Alkyone and Keyx, the wife and the drowned husband who became sea-birds. The game never tells the tale; it lets the names and the season rhyme with it. The calm is the dark lying still under the ice, listening.

**Who the First was** (Ice Memory 1, shipped: d.ice.i1.1-4). Before all memory a woman lit a fire on a rock with wood the waves brought in. Her people gathered round it and said each other's names. «Φως στο νερό, για να μείνει το νερό νερό.» The dark drew back under the sea, and the sea froze over it. «Δεν φεύγει. Περιμένει να ξεχάσουν.» / "It does not leave. It waits for them to forget." Act VI adds what the memory left out: she knew it would wait, so she took a brand from her fire and went down through a crack in the new ice, to be under it when they forgot. Before she went, she told her people not to say her name, because what has a name cannot hide, and she meant to hide from the dark. They were to say only «η Πρώτη» / "the First". After more winters than anyone counted, they still said it. The sea did not take her name. It took the reason.

**What she has done since.** At the bottom she lit a fire on a stone and kept it. The dark circled her and could not find her, because she had no name. Light above (her people's lights and names), light below (her fire), and between them the water stayed water. That is the creed whole, though the Saltborn only ever said its first half.

**Why the Gates exist.** «Ίσκιος θέλει φως.» / "A shadow needs a light." Her fire, burning under the dark, throws shadows up through it. Where the dark is thin they reach the world as passages: the Shadow Gates.
- They opened «στα βουνά» / "in the mountains" (d.isarn.r5) when the beacons failed and the dark rose: the higher the dark, the longer the shadows.
- Every Gate is a crypt or a forest because the shadows are cast by what lies at the bottom, the drowned barrow and wood that everything forgotten sinks to (world.js:135: every Gate is `genCrypt` or `genForest`).
- The Gate Guardian is her fire's shadow too: the Shade, wearing the North's oldest fears (the Barrow Lord, the Weaver, the troll; boot.js:240 picks one of the three) to keep anyone from following the light down to her. Anyone might be the dark wearing a face.
- «Όσο πιο βαθιά πας, τόσο πιο πολύτιμα αυτά που φέρνεις πίσω.» / "The deeper you go, the richer what you bring back." (d.isarn.after): nearer the fire, the shadows are sharper and the forgotten things older.
- The Gates "have no bottom" because no one who went down ever found it. They do have one (d.alk.gates). It is her hearth.

**What has gone wrong.** When the Skotos was named it sank, the only way it knew: down. It drank its way down through the sea beneath the Farthest Light, leaving a dry seabed under a vault of ice and black water in the deepest hollows, and it came to rest near her fire. Since the naming it has an "I" (d.skotos.die2 «...ναι... αυτό... είμαι...»), and a thing with a name has learned the rule of names: whoever has a name can look for the others.
- **It hunts names.** Every name said near the dark falls to where it lies, and it learns them all. One is missing: the first. It cannot find her, because she has none.
- **So the North forgets.** It pulls names down the Gates, the shadow-passages, and the nearest Gate to any hearth is the one at Isarn's staff. Cold air rises from it, and Whitecliff, the place that taught the North to remember the Saltborn, begins to lose small names first.
- **And it drinks.** It cannot find her name, but it can drink the fire it hears, and the fire is guttering. If it goes out, the Gates close (no shadow without light), and nothing holds the dark from below. Above, the Saltborn's lights would be holding it alone, the half of the creed they still remember.

**Keyx, who rowed toward a light that did not flicker.** Seven winters ago (Tern was three) Keyx rowed out on a moonless night toward a steady light on the sea. It was the Ketos's lure, older than the Saltborn's lights: the beast hangs it over the water and boats row to it. The Ketos took the boat. Keyx did not stay drowned in the ordinary way: every night Alkyone said his name, and in the house's rule a name said every night is not taken by the dark (boon.name.q «Ένα όνομα που λέγεται κάθε βράδυ δεν το παίρνει το σκοτάδι.»). So he could not be forgotten, and he could not come home. He went down with everything else the world lost, to the bottom where the forgotten lie still, and there he keeps his face, the only one among the Faded who does, because his name is still said. He holds a light again: the dark gave him one of its black lamps, which does not flicker either. This is d.alk.b5 read the other way: «Γι' αυτό είναι ακόμα δικός μου» / "That's why he's still mine" is a cage, the game's oldest rule without a shard (altar.sub «κάθε δώρο έχει το κλουβί του»).

**The hook.** Three nights ago Selna began to see a small fire far below the clear ice. Each night, when she says «Η Πρώτη», it trembles less. She sent Tamarisk south. Tonight the Farthest Light stops turning, faces Whitecliff and flashes three times: «έλα γρήγορα» / "come quickly". Out of the Gate at Isarn's staff comes cold air that smells of the sea.

### villain
**Το Σκότος / the Skotos**, named: the same force as Act V, one step further. A neuter noun, as canon requires (το Σκότος, του Σκότους, στο Σκότος). It is never called an abyss, an Old One or a Long Night, and the word "Abyss" stays away from it because the repository's other game is Abyssos.

**What it is now.** In Act V it had no wish, no face and no "I". Naming gave it an "I", and an "I" brought something it never had: memory.
- It remembers now, and remembering hurts it. Act V's place voice said «...πονάει μόνο όποιος θυμάται...» / "...only those who remember hurt..."; now that is its own complaint.
- It has learned the rule the Saltborn used against it: what has a name cannot hide. So it hunts names. Every name Selna says at night falls through the clear ice to where it lies, and it learns them all. One is missing: the first.
- Its aim is simple: find the one who hides, by her name, and drink her fire. It does not hate her. It wants to stop hurting. It would rather forget again, and sleep, and her fire is what keeps it remembering.

**Its voice** (rules continued from Act V):
- floating `say` lines in a pale ice colour over the ice-song sound, **lowercase, opening with an ellipsis**;
- **it now says «εγώ» / "i"** (lowercase in English too), since its last line in Act V was its first "I";
- it never threatens; it complains, bargains, asks; its word is still «κανείς» / "no one", now joined by «το πρώτο» / "the first";
- the dialog portrait stays npc.skotos's black disc.

**What it does in play.**
- It drank the sea under the Farthest Light, leaving the Drained Sea.
- Its breath raises and lowers the black water in the hollows (the Black Water); in the Ketos's fight it breathes in and the Black Mere drains.
- It drinks light: the Sunken Lampbearers carry its lanterns, and the black lamps of the drowned places burn with light it drank. Its lights do not tremble.
- It pulls names down the Gates: the forgetting at home.
- Its Hands (the shipped `skotosHand`, tentacle.glb) rise from the pools on the Shadow Stair.
- At the end it rises from the black water at the edge of the First's Hearth to hear her name, cannot hold it, and sinks like something falling asleep. It is not fought.

**What it never does.** It grants no wishes, never takes over Karthax, never uses a living person's voice, and never names the ember king. No line in Act VI says "Karthax". It is not killed and not fought as a boss in this act: Act V's fight with it stands, and its echo still plays.

**The Shade (Ο Ίσκιος της Πύλης)** is the act's boss, not its villain. It is the First's fire's shadow, the keeper of her hiding. It is the same thing every player has met at the end of every Shadow Gate as the "Gate Guardian" (gate.guardianName). It guards, in the shape of whatever the comer fears, because anyone who comes down might be the dark wearing a face. It is not evil, and it has no words of its own (see Bosses).

**The Ketos (Το Κήτος)** is the act's first boss and no villain either: the sea-beast of the old vases, hungry, ancient and blind but for its lure, left in the last black water of the drained sea. It is why the Saltborn teach their children «Ποτέ μην τραβάς κουπί προς φως που δεν τρέμει» / "Never row toward a light that doesn't flicker" (Bosses).

### twist
Three blows at three points in the act, each built from shipped lines, and one quiet beat between them.

**1. The sea did not take her name. She gave it away (q34, Memory 2 at the second hearth).**
- d.glaukos.r1 «Η Πρώτη, που τ' όνομά της το πήρε η θάλασσα.» / "The First, whose name the sea took."
- d.alk.b3 «Ό,τι έχει όνομα δεν κρύβεται.» / "What has a name can't hide."
- d.ice.i1.4 «Δεν φεύγει. Περιμένει να ξεχάσουν.» / "It does not leave. It waits for them to forget."
- **Memory 2:** at the crack's edge her people call her by name, and she turns: «Μη με λέτε με τ' όνομά μου. Ό,τι έχει όνομα δεν κρύβεται.» / "Do not call me by my name. What has a name cannot hide." Then: «Πείτε μόνο: η Πρώτη. Κι εγώ θα ξέρω πως με θυμάστε.» / "Say only: the First. And I will know you remember me." The memory closes: «...Το γιατί το πήρε η θάλασσα.» / "...The why, the sea took." The Saltborn's oldest rule, the one they named the dark with, was hers first, used the other way round.

**2. The Shadow Gates are the shadow of her fire (end of q34, Glaukos after Memory 3).**
- d.isarn.r5 «Στα βουνά άνοιξαν οι Σκιοπύλες...» / "The Shadow Gates have opened in the mountains..."
- d.isarn.after «Οι Σκιοπύλες δεν έχουν πάτο...» / "The Shadow Gates have no bottom..."
- d.alk.gates «...Έχουν. Είναι κάτω από τον πάγο μας.» / "...They do. It's under our ice."
- **Memory 3** ends: «Η φωτιά της ρίχνει ίσκιους ψηλά, μέσα στο σκοτάδι, σαν σκαλιά που ανεβαίνουν.» / "Her fire throws shadows up into the dark, like stairs climbing." Glaukos, blind, puts it together aloud: «Ίσκιος θέλει φως. Οι Σκιοπύλες σας είναι ο ίσκιος της φωτιάς της.» / "A shadow needs a light. Your Shadow Gates are the shadow of her fire."
- At the bottom (q36) the player walks through the places every Gate copies. At the Hearth (q37) the Gate Guardian turns out to be one thing, the Shade, which has worn three faces at every Gate.

**The quiet beat: remembering can be a cage (q35-q36, the Ketos's mere and the Forgotten Village).**
- Black-Water Memory 1 at the Ketos's mere: «Κήυκα! Δεν τρέμει! Γύρνα πίσω!» / "Keyx! It doesn't flicker! Come back!" (Alkyone, from the shore, seven winters ago).
- When the Ketos falls, Keyx's own lantern lies in the drained mud, and it still flickers.
- In the village of the forgotten, one of the Faded has a face, because his name is said every night, and he holds a lamp that does not flicker. The hero puts that lamp out by giving him his own. He lets go.
- d.alk.b5 "That's why he's still mine" turns from tenderness into a cage, and Alkyone's answer, after the act, turns it back: «Θα λέω τ' όνομά σου κάθε βράδυ. Όχι για να σε κρατήσω. Για να σου πω καληνύχτα.» / "I'll say your name every night. Not to hold you. To say good night."

**3. Her name is the word the North has called the hero all along (q38, at the Hearth).**
- «φλογοφέρε» / "fire-bearer" is how Elati, Ivar, Amaranthe and the Voice addressed the hero (canon §2.2; four uses in text.js).
- The First's name is **«Φέρουσα» / "Pherousa"**, an old sea-name (one of the Nereids) that means "she who carries". It shares its root with φλογο-φέρος.
- When the hero says it in the light of her relit fire, she answers: «Φέρουσα. Αυτή που κουβαλά. Έτσι με έλεγαν. Κι εσένα σε φωνάζουν έτσι, φλογοφέρε.» / "Pherousa. She who carries. That was my name. And they call you so as well, fire-bearer."
- It also gives Act V's blessing quote its fullest meaning. boon.name.q «Ένα όνομα που λέγεται κάθε βράδυ δεν το παίρνει το σκοτάδι.» / "A name said every night, the dark cannot take." She says it back, and asks to be said every night up there.
- And the Saltborn custom d.alk.a3 «Απαντάμε μόνο σε φωτιές που μπορούν να σβήσουν.» / "We only answer fires that can go out" turns out to be hers: the first thing she says on waking is that a fire which trembles is not the dark's. The act's rule of light is her rule.

**Nothing is retconned.**
- d.glaukos.r1 stays true as said: the sea "took" what the Saltborn lost, the reason. Act VI never says the line lied.
- d.glaukos.r2 «...για να μην κρυφτεί.» keeps its meaning: the rite still names the dark so it cannot hide. Act VI adds a child's good night at its end; it does not reread the rite.
- Ice Memory 1 stands whole; Act VI's memories continue it ("Her fire burns on the rock, and below it the sea sets into ice").
- Act V's cause of the rising (the tyrant's remembering fire gone, d.alk.t1-t6) stands alone. Keyx did not cause it.
- The Shadow Gates play exactly as they do (canon rule 18). Their lore is explained, their machinery untouched.
- Every φρυκτωρία is still the brow-stone's fire (d.isarn.e1). The First's fire is older than both the beacons and the sea-lights, and is neither: it is called «η φωτιά της» / "her fire", or «η εστία της Πρώτης» / "the First's hearth", never a beacon or a φάρος, and never a proper noun (Risks: IP hygiene). The six peaks lit at the end are hand-lit beacons, the way Act IV relit the four.
- No line claims she recognises Whitecliff's flame or that the flames match. She recognises a fire that can go out.
- Isarn stays dead and is not below: he walked into the white fire (d.u.walk), and no line in Act VI looks for him there. Karthax is unnamed. Brokka and Elati stay at home.
- Keyx is below because the sea took him down with his boat, not because he was forgotten: he is the one face among the Faded, and the one who cannot sleep.

**Old lines that read differently afterwards** (no line changes):
- d.isarn.r5 and d.isarn.after: the Gates opened and "have no bottom" because no one had followed the light down.
- d.alk.gates «Μη φοβάσαι. Κρατάμε το φως από πάνω.» / "Don't be afraid. We keep the light above it.": the Saltborn kept the light above; someone kept the light below.
- gate.guardianName «Φύλακας της Πύλης» / "Gate Guardian": the Shade.
- d.ice.i1.3 «Φως στο νερό, για να μείνει το νερό νερό.»: half of a creed whose other half (Memory 3) is «Φως από πάνω. Φως από κάτω.».
- d.staff «Ξεκουράσου.» / "Rest.": the last keeper's word reaches the first keeper.
- d.alk.b5 «Γι' αυτό είναι ακόμα δικός μου.»: a cage, then a good night.
- d.lamp.m1.2 «Φωνάζει ένα όνομα. Κανείς δεν απαντά.» / "He calls a name. No one answers.": at the Hearth the hero calls into the dark and no one answers; then the hero's own shadow stands up.
- d.isarn.2 «Κοίτα βόρεια. Πριν από τρεις νύχτες έκαιγαν εφτά φωτιές...» and intro.4 «Απόψε σβήνουν, η μία μετά την άλλη.»: at the end, «Κοίτα βόρεια.», and the fires catch one after another.
- d.v.3 «Ο γιος μου πήγε για ξύλα στο δάσος. Δεν γύρισε.»: he comes home.
- Every «φλογοφέρε» in Acts III-V.

### ending
**The Shade falls** (end of q37; flag `shadeDown`, saved first):
- d.shade.die1 «Ο ίσκιος γυρίζει στα πόδια σου, εκεί που ήταν πάντα.» / "The shadow goes back to your feet, where it always was."
- d.shade.die2 «Πριν σωπάσει, σου λέει ένα όνομα στο αυτί. Δεν το λες ακόμα.» / "Before it falls still, it says a name into your ear. You don't say it yet."
- Toast q.nameHeld «Κρατάς ένα όνομα: {0}» / "You hold a name: {0}". {0} is «…» until `nameBack`: the shipped forgotten-name parameter from Act V (story.js questText), now hiding a name the player has not yet heard instead of one forgotten.
- The seven named lamps of the Lost, if lit, flare once round the rim.

**The relight** (q38, interact at the Hearth «Ξανάναψε τη φωτιά της» / "Relight her fire", 2.0 s; flag `firstLit` and `nameBack` saved first; cine `naming6` at pitch 0.3):
- d.firstlit «Βάζεις το κάρβουνο της Κούνιας στην πέτρα της. Η φωτιά του Άρνα και του Έιναρ πιάνει στη φωτιά της.» / "You set the Cradle's coal on her stone. Arna's and Einar's fire catches in hers."
- The figure curled by the stone lifts its head; black ice falls from her face as the fire grows, and the fire begins to tremble.
- The First: d.first.1 «Φωτιά που τρέμει... Δεν είναι δική του. Εκείνο δεν φτιάχνει φωτιές που σβήνουν.» / "A fire that trembles... It is not its. That thing makes no fires that can go out."
- Mage only: d.first.1.m «Και η φλόγα σου έμαθε κάποτε από τη δική μου. Το Τάγμα σου το θυμάται ακόμα;» / "And your flame learnt from mine, once. Does your Order still remember?" (pays off d.alk.a5.m; `rl()` already reads `.m`, story.js:84)
- At the rim of the black water the Skotos rises (its shipped model at ×3.2, clip `rise`, waist-deep in the pool): d.skotos6.n1 «...εκεί ήσουν... τόσο κοντά... πες μου πώς σε λένε...» / "...there you were... so close... tell me what you are called..."
- The First, to the hero: d.first.2 «Τώρα. Στο φως. Πες το.» / "Now. In the light. Say it."
- Narration (the hero never speaks): d.name6 «Λες το όνομά της: Φέρουσα.» / "You say her name: Pherousa." The quest text's «…» becomes Φέρουσα.
- d.first.3 «Φέρουσα. Αυτή που κουβαλά. Έτσι με έλεγαν. Κι εσένα σε φωνάζουν έτσι, φλογοφέρε.» / "Pherousa. She who carries. That was my name. And they call you so as well, fire-bearer."
- The Skotos: d.skotos6.n2 «...φέρουσα... ειπωμένο στο φως... δεν το κρατάω...» / "...pherousa... said in the light... i cannot hold it..."; then d.skotos6.n3 «...κουράστηκα...» / "...i am tired..."
- Narration d.sink6 «Βουλιάζει αργά, σαν κάτι που αποκοιμιέται.» / "It sinks slowly, like something falling asleep." (clip `sink`; the image of d.answer.0's lantern "as if falling asleep"). The black water goes still and her fire flares white-gold.
- d.first.4 «Ένα όνομα που λέγεται κάθε βράδυ δεν το παίρνει το σκοτάδι. Πείτε το εκεί πάνω. Κάθε βράδυ.» / "A name said every night, the dark cannot take. Say mine up there. Every night." (boon.name.q)
- Glaukos comes down the Stair, feeling the warmth: d.glaukos.e1 «Φέρουσα... Πενήντα χρόνια λέω τα ονόματα, και το πρώτο το έλεγα λάθος.» / "Pherousa... Fifty years I've said the names, and I said the first one wrong."
- d.first.5 «Είμαι κουρασμένη, γέρο. Τόσο κουρασμένη.» / "I am tired, old man. So tired."
- Narration d.rest6 «Της λες τη λέξη που σου άφησε ο Ίσαρν: Ξεκουράσου.» / "You tell her the word Isarn left you: Rest."
- d.first.6 «...Ξεκουράσου. Καλή λέξη. Ποιος σου την έμαθε;» / "...Rest. A good word. Who taught it to you?"
- Narration d.rest6b «Της λες: ο Ίσαρν.» / "You tell her: Isarn."
- d.first.7 «Όποιος λέει αυτή τη λέξη, κράτησε κάποτε φως μόνος του. Η ανάπαυση είναι να κοιμάσαι κι άλλος να κρατά το φως.» / "Whoever says that word once kept a light alone. Rest is sleeping while someone else keeps the light."
- Glaukos: d.glaukos.e2 «Κοιμήσου, Φέρουσα. Δεν θα την κρατάει κανείς μόνος πια. Θα λέμε τ' όνομά σου κάθε βράδυ, όλοι.» / "Sleep, Pherousa. No one will keep it alone any more. We'll all say your name every night."
- Narration d.rest6c «Κοιμάται ήδη, πλάι στη φωτιά της, για πρώτη φορά.» / "She is already asleep beside her fire, for the first time."
- Big toast q.firstLit «Η φωτιά της Πρώτης καίει ξανά» / "The First's fire burns again". q38b.

**No one stays below alone** (Glaukos, as the hero turns to the Gate ring):
- d.glaukos.e3 «Εγώ ανεβαίνω από το σκοινί. Θα τραβήξω τρεις φορές, και το Γλαρόνι θα με ανεβάσει. Εσύ πάρε τον δρόμο της φωτιάς.» / "I'll go up by the rope. I'll pull three times, and Tern will bring me up. You take the fire's road." (Tern's d.tern.r1, q33: "If you pull three times, I'll bring you up.")
- The fire is held as the creed says: light above, light below. Below, her fire; above, her name every night. Nobody tends it alone, and nothing is linked, kindled or sacrificed (Risks: IP hygiene).

**The way home** (q38b «Ανέβα από την πύλη στον Λευκόβραχο» / "Climb up through the gate to Whitecliff"):
- At the Hearth's south rim the ring of black stone, the Gates' bottom, wakes with warm light. Narration d.gate6 «Ο ίσκιος της φωτιάς ανεβαίνει πάλι τα σκαλιά του. Πολύ ψηλά, ένα ραβδί περιμένει.» / "The fire's shadow climbs its stairs again. Very high above, a staff is waiting."
- Interact «Ανέβα από την πύλη» / "Climb the gate", the Act I portal action (boot.js:171), travels to town at Isarn's staff. Flag `homeGate`.

**Home** (on arrival, dusk; cine at pitch 0.3 on the beacon hill; `beaconScene(6, 'peaks')`):
- The hero steps out of the Gate at Isarn's staff with rime falling from her (the portal fx in reverse). Ember motes rise from the ring. The frost inside Isarn's dark lantern melts and drips.
- Halda: d.halda.gate «Βγήκες από την πύλη ανάποδα. Και κοίτα: βγάζει ζέστη. Πρώτη φορά στη ζωή μου.» / "You came out of the gate the wrong way round. And look: it's giving off warmth. First time in my life."
- The child (the frost `tern` scene in the village tint, as in Act V's ending): d.child.7 «Αλιγενείς! Το θυμήθηκα μόνος μου. Κι η πύλη μυρίζει τζάκι τώρα.» / "Saltborn! I remembered it all by myself. And the gate smells of a hearth now." (it undoes the hook's stumble and mirrors d.child.6 «Η πύλη μυρίζει θάλασσα.»)
- Halda, turning the hero by the shoulder: d.halda.north «Κοίτα βόρεια.» / "Look north." (Isarn's first words to the hero about the fires, d.isarn.2, in another mouth.)
- The camera turns north. **On the six peaks dark since three nights before Act I, fires catch one after another**, 1.2 s apart, each with a low bell (new FAR_BEACONS 7-12, `seed: true`, orange): d.peaks.1 «Στις κορυφές πιάνουν φωτιές, η μία μετά την άλλη.» / "On the peaks, fires catch, one after another." (intro.4, turned round.)
- With Arna's hill they make seven: d.peaks.2 «Εφτά φωτιές. Τις ανάβουν χέρια που ξέρεις.» / "Seven fires. Hands you know are lighting them." (d.answer.4 «Κανείς που ξέρουμε δεν την άναψε.», turned round.) Beyond them the fourth fire and the three sea-lights flash in their 12 s rhythm.
- If Leif is home (`leifHome`), a torch climbs the nearest hill before its fire catches, with no line.
- d.answer6.1 «Από την πύλη δίπλα στο ραβδί του Ίσαρν ανεβαίνει ζεστός αέρας, σαν από τζάκι.» / "From the gate beside Isarn's staff warm air rises, as from a hearth."
- d.answer6.2 «Από πολύ βαθιά, μια φωτιά απαντά.» / "From very deep, a fire answers."
- **The act's last line**, d.answer6.3 «Ο Βορράς κοιμάται με τα φώτα αναμμένα.» / "The North sleeps with the lights on."
- actComplete(6), then offerBoons(6):
  - «Πράξη VI — Ολοκληρώθηκε» / "Act VI — Complete" (Latin VI);
  - act6.sub «Μια φωτιά από κάτω, κι ένα όνομα από πάνω» / "A fire below, and a name above";
  - act6.next «Οι Σκιοπύλες σε περιμένουν. Ο πάτος τους καίει.» / "The Shadow Gates await. Their bottom burns."
- End state q.39 «Η φωτιά της Πρώτης καίει ξανά, κι ο Βορράς ξέρει τ' όνομά της. Οι Σκιοπύλες σε περιμένουν.» / "The First's fire burns again, and the North knows her name. The Shadow Gates await."
- The title screen's subtitle becomes game.sub6 «Ακόμα και το σκοτάδι κοιμάται» / "Even the dark sleeps" once any saved hero has `act6 >= 0`.

**After the act.**
- **Selna's nightly rite** (the shipped 90 s ambient `say` chain at the Farthest Light, `rollNames(true)`) now opens d.selna.r6 «Φέρουσα, η Πρώτη.» / "Pherousa, the First.", goes on as before, adds every one of the Lost the hero freed and up to three «Κάποιος.» / "Someone." for the forgotten freed in the Shadow Gates, and ends «Σκότος.» and then, in Tern's voice, name.goodnight «Καληνύχτα.» / "Good night." Through the clear ice a small warm glow answers.
- **At the Landing** (the first coast entry after `act6` with `keyxLamp`; cine at pitch 0.3, flag `landing6` saved first): Alkyone takes Keyx's lantern from the hero and hangs it on the post by the tide bell. It trembles.
  - d.alk.k1 «Τρέμει ακόμα. Εφτά χειμώνες, και τρέμει.» / "It still flickers. Seven winters, and it flickers."
  - d.alk.k2 «Κήυκα. Θα λέω τ' όνομά σου κάθε βράδυ. Όχι για να σε κρατήσω. Για να σου πω καληνύχτα.» / "Keyx. I'll say your name every night. Not to hold you. To say good night."
  - Narration d.alk.k3 «Ένα μικρό γαλάζιο πουλί πετά χαμηλά πάνω από το νερό και χάνεται.» / "A small blue bird flies low over the water and is gone." (a 12-triangle code bird.)
  - After it, her bark d.alk.after6 «Κάθε βράδυ του λέω καληνύχτα. Ύστερα κοιμάμαι.» / "Every night I say good night to him. Then I sleep." The Landing's rite is hers (as in Act V's post-game).
- **Glaukos** comes down the rope by day and sits by the Rope camp's brazier (a visiting vendor): d.glaukos.again6 «Ξύλα, λάδι, κουβέντα. Εδώ κάτω φτάνουν. Το βράδυ ανεβαίνω· έχω ονόματα να πω.» / "Wood, oil, talk. Down here, that's enough. At night I go up; I've names to say."
- **Tamarisk** stays a season in the Lanternglade beside Elati, by her sapling (the `weep` zone loads `frost` ad hoc for her, as town does; Risks):
  - d.tam6.home «Το βλαστάρι μου είναι πιο ψηλό από μένα πια. Θα μείνω λίγο.» / "My sapling's taller than me now. I'll stay a while."
  - .r «...Θα μείνω λίγο, αδελφή. Θα γεράσουμε μαζί, εμείς οι τρεις.» / "...I'll stay a while, sister. We'll grow old together, the three of us." (d.elati.home.r's promise, widened.)
- **Whitecliff:** the six peaks burn every night; the staff's Gate gives off ember motes; the forgetting barks stop and each gets its undoing (beats, Lines at home); the child's bark d.child.bark6 «Φέρουσα. Αυτή που κουβαλά. Κι Αλιγενείς. Δεν τα ξεχνάω πια.» / "Pherousa. She who carries. And Saltborn. I don't forget them now."
- **The Gate panel** shows one flavour line, gate.bottom «Ο πάτος τους καίει» / "Their bottom burns", and the depth of each tier (Echoes and post-game). The Gates play exactly as before.

### beats
- q32 [town] q.32 «Μίλα με τη Μυρίκη δίπλα στο ραβδί του Ίσαρν» / "Speak with Tamarisk by Isarn's staff".

**The hook.**
- **Who sees it:** a save with `h.act5 >= 0`, quest 31 and `seaLit`.
- **When:** on the next town entry. For a hero finishing Act V after the update, 2 s after the Act V blessing panel closes ('actClosed'), as Act V hooked on Act IV.
- **What happens** (flag `call6` saved first; cine at pitch 0.3 from the beacon toward the north):
  - Narration over Whitecliff, d.hal.1 «Στην καρδιά του χειμώνα έρχονται οι αλκυονίδες: μέρες που η θάλασσα σωπαίνει και δεν φυσάει.» / "In the heart of winter come the halcyon days: days when the sea is still and no wind blows."
  - The three sea-lights low on the horizon (FAR_BEACONS[4-6], Act V's) stop flashing and hold steady (farFire's `flash` period held at 0). FAR_BEACONS[3], the Farthest Light, dims and pulses three times, slowly (a scripted triple pulse on `userData.k`), then burns steady.
  - d.call6.1 «Στον βορρά, ο Έσχατος Φάρος σταματά να γυρίζει. Κοιτάζει εδώ, και αναβοσβήνει τρεις φορές.» / "In the north, the Farthest Light stops turning. It looks this way, and flashes three times."
  - The camera turns to Isarn's staff. Cold mist pours from the ground at its foot (fx 'seasmoke' emitter, shipped); the staff rimes over and frost fills the glass of the dark lantern (a white emissive rime on its mesh).
  - d.call6.2 «Από το ραβδί του Ίσαρν, εκεί που ανοίγουν οι Σκιοπύλες, βγαίνει κρύος αέρας, σαν από πηγάδι.» / "From Isarn's staff, where the Shadow Gates open, cold air rises, as from a well."
  - The child stands by the staff (Act V's q30 child, the frost `tern` scene in the village tint): d.child.6a «Αλι... Αλι... Το ήξερα. Πώς τους λένε, αυτούς με τα φανάρια;» / "Sal... Sal... I knew it. What are they called, the ones with the lanterns?"
  - Tamarisk walks up the beacon path (walkTo; the `frost` set is already loaded in town from q24 on, so she costs no load): d.tam6.c0 «Αλιγενείς. Μην το ξεχνάς.» / "Saltborn. Don't forget it." The child: d.child.6b «Αλιγενείς.»
  - Toast «Νέα αποστολή», and the "!" over Tamarisk (npcHasNews).

**Tamarisk at the staff,** d.tam6.a1-a6, one dialog (her voice from Act V: dry, kind, contractions in English):
- Ranger, first: d.tam6.a0.r «Σου είπα να 'ρχεσαι να με βρίσκεις. Άργησες, αδελφή. Ήρθα εγώ.» / "I told you to come and find me. You were slow, sister. So I came." (d.tam.k.r)
- a1 «Η Σέλνα με έστειλε πριν από τρεις νύχτες. Μου είπε: όταν ο φάρος σταματήσει και κοιτάξει νότια, θα πει «έλα γρήγορα».» / "Selna sent me three nights ago. She said: when the light stops and looks south, it means 'come quickly'."
- a2 «Κάτω από τον καθαρό πάγο, εκεί που βούλιαξε εκείνο, καίει μια μικρή φωτιά. Κάθε βράδυ τρέμει λιγότερο.» / "Under the clear ice, where it sank, a small fire is burning. Every night it trembles less."
- a3 «Κι εσείς εδώ ξεχνάτε. Το παιδί σας δεν θυμάται πια πώς μας λένε. Το κρύο βγαίνει απ' την πύλη σας.» / "And you're forgetting, here. Your child can't remember what we're called. The cold's coming out of your gate."
- a4 «Στον βορρά, όταν κάποιος κατεβαίνει στον πάγο, οι δικοί του ανάβουν ό,τι φως έχουν, να βρει τον δρόμο πίσω. Χάλντα, έχετε κορυφές εδώ γύρω;» / "In the north, when someone goes down onto the ice, their people light every light they have, so they find the way back. Halda, have you hills round here?"
- Halda: d.halda6.a «Εφτά. Οι έξι σβηστές. Άσ' το πάνω μου.» / "Seven. Six of them dark. Leave it to me." (d.isarn.2, d.isarn.r4; Decisions: the count)
- a5 «Πάμε. Θα κατέβω πρώτη, ν' ανάψω φωτιά. Εσύ πάρε ένα κάρβουνο απ' τον φάρο.» / "Let's go. I'll go down first and light a fire. You take a coal from the light." setQuest(33).

**Barks while `call6` and not `firstLit`** (the forgetting; each is undone at home, below):
- Halda: d.halda6.v1 «Κάτι ήθελα να σου πω για τ' αστέρια. Μου 'φυγε. Εμένα δεν μου φεύγει ποτέ τίποτα.» / "I meant to tell you something about the stars. It's gone. Nothing ever goes from me." (The Stoneborn "don't forget", d.halda.2.)
- Halda, after the dialog: d.halda.call «Τρεις φορές. Δεν είναι για καράβια αυτό. Φωνάζουν εσένα.» / "Three times. That's not for ships. They're calling you."
- Elianthe: d.elianthe6.v1 «Ποιος έστησε αυτό το ραβδί εκεί; ...Συγγνώμη. Το ξέρω. Το ξέρω.» / "Who set that staff there? ...Sorry. I know. I know."; then d.elianthe.call «Πάρε κάτι ζεστό μαζί σου. Από εκείνη την πύλη δεν βγήκε ποτέ ζέστη.» / "Take something warm with you. No warmth ever came out of that gate."
- The villager of d.v.3 (Act I): d.v.son1 «Ο γιος μου πήγε για ξύλα στο δάσος. Δεν γύρισε. ...Πώς τον λέγαμε; Πριν από ένα φεγγάρι το ήξερα.» / "My son went for wood in the forest. He didn't come back. ...What was his name? A moon ago I knew it." (opens Leif's thread)
- The child: d.child.6 «Η πύλη μυρίζει θάλασσα.» / "The gate smells of the sea."
- Isarn's staff (interact, before the Gates panel): narration d.staff6 «Από το ραβδί ανεβαίνει κρύο. Το σβηστό φανάρι είναι γεμάτο πάχνη.» / "Cold rises from the staff. The dark lantern is full of frost." Then «Ξεκουράσου.» as shipped.
- **New act5.next:** «Πράξη VI: Κάτω από τον Πάγο. Κάποια σε περιμένει στη φρυκτωρία.» / "Act VI: Beneath the Ice. Someone is waiting at the beacon." help.p1 needs no change (Act V made it generic).
- **The Shadow Gates panel** works unchanged throughout the act.

- q33 [farlight] q.33 «Πάρε ένα κάρβουνο από τον φάρο και κατέβα από το σκοινί» / "Take a coal from the light and climb down the rope". Variant q.33b «Κατέβα από το σκοινί κάτω από τον πάγο» / "Climb down the rope beneath the ice" once `coal6` is set.

**At the Light's Skerry.** The farlight zone is in its `seaLit` reading (Selna and Tern at the tower, the true aurora). New on the core, by the tower's door: a round hole melted through the clear ice, a whale-oil fire guttering beside it, a winch post and a rope going down. It is **props and one exit interact on cells that are already thick, so no cell changes and every saved seed's layout is untouched.** `act6Presence(z)` places them on every entry, because the zone is cached.

Selna, at the tower (no contractions, as in Act V):
- d.selna.f1 «Ήρθες. Κάθε βράδυ λέω τα ονόματα. Κι εδώ και τρεις νύχτες, όταν λέω το πρώτο, κάτι απαντά από κάτω.» / "You came. Every night I say the names. And for three nights now, when I say the first, something answers from below."
- d.selna.f2 «Ένα φως. Πολύ βαθιά, κάτω από τον καθαρό πάγο. Μικρό, να τρέμει. Κι απόψε τρέμει λιγότερο.» / "A light. Very deep, under the clear ice. Small, trembling. And tonight it trembles less."
- **Cine at pitch 0.85, straight down through the clear ice:** far below, a small warm glow (a `uGlow` slot of the shipped ice shader at depth −12 with a flicker), and a shadow the size of a ship sliding over it (a `uShade` slot, shipped).

Old Glaukos, who came out over the ice with Alkyone:
- d.glaukos.f1 «Η γιαγιά μου έλεγε πως η Πρώτη δεν πνίγηκε. Πως κατέβηκε. Με τη φωτιά στο χέρι.» / "My grandmother said the First never drowned. That she went down. With the fire in her hand."
- d.glaukos.f2 «Γελούσαμε. Παραμύθια για παιδιά που φοβούνται το σκοτάδι.» / "We laughed. Tales for children afraid of the dark."

Alkyone:
- d.alk.v1 «Τρεις μέρες λιώναμε τον πάγο με λάδι. Από κάτω δεν είναι θάλασσα, φρυκτωρέ. Είναι άδειο. Το Σκότος την ήπιε για να κατέβει.» / "Three days we melted the ice with oil. There's no sea under it, beacon-keeper. It's empty. The Skotos drank it to go down."
- d.alk.v2 «Θυμάσαι τι σου είπα για τις πύλες σας; Ο πάτος τους είναι εκεί κάτω. Κι εκεί κάτω καίει κάτι.» / "Remember what I told you about your gates? Their bottom is down there. And down there something is burning." (For a hero who never heard d.alk.gates, Alkyone says that line first: the shipped key, no new text.)

Selna again:
- d.selna.f3 «Πάρε ένα κάρβουνο από τον φάρο. Εκεί κάτω θα χρειαστείς φωτιά, όχι φανάρι.» / "Take a coal from the light. Down there you will need fire, not a lantern."
- Interact at the tower's door «Πάρε ένα κάρβουνο από τον Έσχατο Φάρο» / "Take a coal from the Farthest Light", 1 s. d.coal6 «Παίρνεις ένα κάρβουνο από τον φάρο του Έιναρ. Η Κούνια ζεσταίνεται στο χέρι σου.» / "You take a coal from Einar's light. The Cradle warms in your hand." Flag `coal6` saved first. The Ember Cradle rides the hero's hip again (light.js Cradle slot, the shipped mesh).

Tern, at the winch: d.tern.r1 «Θα κρατάω το σκοινί. Αν τραβήξεις τρεις φορές, θα σε ανεβάσω. Μόνος μου, αν χρειαστεί.» / "I'll hold the rope. If you pull three times, I'll bring you up. On my own, if I have to."

Glaukos: d.glaukos.f3 «Κατεβαίνω κι εγώ. Είμαι τυφλός. Εκεί κάτω όλοι είναι. Θα είμαι ο μόνος που ξέρει τον δρόμο.» / "I'm coming down too. I'm blind. Down there everyone is. I'll be the only one who knows the way."

**The exit:** `{ kind: 'exit', to: 'drained', label: 'exit.rope', locked: 'coal6' }` at the hole. Shut line d.ropeShut «Χωρίς φωτιά δεν κατεβαίνει κανείς εκεί κάτω.» / "No one goes down there without fire."

**Arrival cine in the Drained Sea** (flag `drainedSeen` saved first; ATMOS 'drainedCine', pitch 0.2 looking south from the rope's foot). This is the act's wonder shot, the only time the vault is drawn:
- d.drained.1 «Κάτω από τον πάγο δεν υπάρχει θάλασσα. Ένας βυθός στεγνός ως εκεί που φτάνει το φως σου, κι από πάνω ο πάγος, πράσινος από το σέλας.» / "Under the ice there is no sea. A seabed, dry as far as your light reaches, and above it the ice, green with the aurora."
- d.drained.2 «Καράβια που δεν θυμάται κανείς κάθονται στον πάτο, όρθια, σαν να περιμένουν να γυρίσει το νερό.» / "Ships no one remembers sit on the bottom, upright, as if waiting for the water to come back."
- Far to the south, over the Black Mere, a single light hangs dead still (the Ketos's lure, seen once).
- The Skotos, faint, with no speaker name (its first line of the act): d.skotos6.1 «...σε θυμάμαι... ήσουν εκεί όταν μου έδωσαν όνομα...» / "...i remember you... you were there when they gave me a name..."
- Glaukos, at the rope's foot: d.glaukos.d0 «Το άκουσες; Θυμάται. Πριν δεν θυμόταν τίποτα.» / "You heard it? It remembers. Before, it remembered nothing."

**The Rope camp** (waypoint `drained`): the rope's foot under a shaft of green light (a skylight of r 6), Tamarisk's brazier, a crate pile, Glaukos (vendor: whale oil, rope, ordinary items) and Tamarisk (healer, vendor).
- Tamarisk: d.tam.v1 «Κατέβηκα πρώτη, ν' ανάψω φωτιά. Κάποιος πρέπει να γιατρεύει όσους ξανανεβαίνουν.» / "I came down first, to light a fire. Someone has to mend the ones who climb back up."
- Ranger: d.tam.v1.r «Αδελφή. Πάλι στο σκοτάδι, εσύ κι εγώ. Τουλάχιστον εδώ κάτω δεν βρέχει.» / "Sister. In the dark again, you and me. At least it doesn't rain down here."
- d.tam.again6 «Πάρε ό,τι χρειάζεσαι. Εδώ κάτω το αλάτι έχει ξεραθεί, μα ακόμα τσούζει.» / "Take what you need. Down here the salt has dried, but it still stings."
- **Glaukos teaches the Carried Fire and the rule of light** (one dialog, sets q34):
  - d.glaukos.d1 «Η γιαγιά έλεγε πως όπου στάθηκε, έλιωσε τον πάγο με τη δαυλό της. Τα σημάδια φαίνονται μόνο στη φωτιά. Κράτα τη δική σου κοντά.» / "Grandmother said wherever she stopped, she melted the ice with her brand. The marks only show by firelight. Keep yours close."
  - d.glaukos.d2 «Κι άκου: εδώ κάτω το σκοτάδι πίνει. Τη θάλασσα την ήπιε. Θα πιει και την Κούνια σου. Γέμιζέ τη σε κάθε φωτιά που βρίσκεις.» / "And listen: down here the dark drinks. It drank the sea. It'll drink your Cradle too. Fill it at every fire you find."
  - d.glaukos.d2b «Μα όχι σε κάθε φως. Η γιαγιά έλεγε: ποτέ μην τραβάς κουπί προς φως που δεν τρέμει. Εδώ κάτω δεν είναι φωτιά κάθε φως.» / "But not at every light. Grandmother said: never row toward a light that doesn't flicker. Down here not every light is a fire."
  - First-time hints hint.carry and hint.flicker.

- q34 [drained] q.34 «Ακολούθησε τα σημάδια της Πρώτης ως τις εστίες της ({0}/3)» / "Follow the First's marks to her hearths ({0}/3)". Progress toast q.hearthLit «Μια εστία της Πρώτης καίει ({0}/3)» / "One of the First's hearths burns ({0}/3)".

**The marks.** A trail of brand-scorched, melted-smooth patches on the seabed rock: ground decals (the shipped decal pool) whose alpha follows the Carried Fire's ring, **visible only inside the hero's ring** (`uFireR` in the decal shader, one smoothstep). A bigger ring shows more of the trail: the mechanic is how you navigate. The trail runs on always-dry cells (gen6 hard check), so the Black Water never hides it. questGoal points at the next hearth regardless, so no hero is ever lost.

**Each hearth** (interact kind 'hearth6', Act V's 'hearth' prop kind with a ring of black stones, build5.js):
- «Ξανάναψε την εστία» / "Relight the hearth", a 1.5 s channel from the Cradle; a hit worth 10% of max life interrupts it.
- Once lit: a warm, trembling pool of r 6 (true lamp light: refills the Cradle, drains Cold, Shroud reveal), a respawn checkpoint (`z.checkpoint`), saved in `flags.cp6` like Act V's cp5.
- Then the next memory in count order plays, so the reveal always lands second and the Gates' answer last, whatever the order (Act V's guard: a lit hearth with an unseen memory offers «Θυμήσου» on every entry; questGoal points at it).
- The memories use Act V's Lamp-Memory flow (story.js `on('lamp')`) with a new body class 'memory-deep' (a CSS swap of 'memory-ice', black-blue) and the narrator npc.deepMemory «Μνήμη από μαύρο πάγο» / "A memory in black ice". The First is the `selna` frost scene in the memory material, as she already is in Ice Memory 1, so the player has seen this woman before.
- Each grants the shipped BUFFS.memory, toasted «Μνήμη της Πρώτης» / "Memory of the First" (+12% damage, +8% movement for 60 s).

**Memory 1, "The going down"** (d.deep.m1.*):
- .1 «Πριν από κάθε μνήμη. Η φωτιά της καίει στον βράχο, κι η θάλασσα από κάτω πήζει σε πάγο.» / "Before all memory. Her fire burns on the rock, and below it the sea sets into ice."
- .2 «Η γυναίκα που την άναψε κοιτάζει τον πάγο. Από κάτω, κάτι κινείται. Περιμένει.» / "The woman who lit it looks at the ice. Beneath it, something moves. It waits."
- .3 (the First) «Θα ξεχάσουν. Πάντα ξεχνούν. Κάποιος πρέπει να είναι από κάτω όταν ξεχάσουν.» / "They will forget. They always forget. Someone must be beneath it when they do."
- .4 «Παίρνει μια δαυλό από τη φωτιά και κατεβαίνει από μια ρωγμή στον πάγο.» / "She takes a brand from the fire and goes down through a crack in the ice."

**Memory 2, "The name"** (d.deep.m2.*; twist blow 1):
- .1 «Στο χείλος της ρωγμής, οι δικοί της τη φωνάζουν με τ' όνομά της.» / "At the crack's edge her people call her by her name."
- .2 (the First) «Μη με λέτε με τ' όνομά μου. Ό,τι έχει όνομα δεν κρύβεται.» / "Do not call me by my name. What has a name cannot hide."
- .3 (the First) «Πείτε μόνο: η Πρώτη. Κι εγώ θα ξέρω πως με θυμάστε.» / "Say only: the First. And I will know you remember me."
- .4 «Ύστερα από τόσους χειμώνες που κανείς δεν τους μέτρησε, λένε ακόμα «η Πρώτη». Το γιατί το πήρε η θάλασσα.» / "After more winters than anyone has counted, they still say "the First". The why, the sea took."

**Memory 3, "The fire beneath"** (d.deep.m3.*):
- .1 «Στον πάτο, η γυναίκα ανάβει φωτιά πάνω σε μια πέτρα. Το σκοτάδι γυρίζει γύρω της και δεν τη βρίσκει.» / "At the bottom the woman lights a fire on a stone. The dark circles her and cannot find her."
- .2 «Πάνω της ο πάγος. Πάνω από τον πάγο οι δικοί της, που λένε ονόματα κάθε βράδυ.» / "Above her, the ice. Above the ice, her people, saying names every night."
- .3 (the First) «Φως από πάνω. Φως από κάτω. Κι ανάμεσα, το νερό μένει νερό.» / "Light above. Light below. And between them, the water stays water."
- .4 «Η φωτιά της ρίχνει ίσκιους ψηλά, μέσα στο σκοτάδι, σαν σκαλιά που ανεβαίνουν.» / "Her fire throws shadows up into the dark, like stairs climbing."

**After the third hearth and its memory** (twist blow 2; Glaukos walks in from the camp, guided by the warmth):
- d.glaukos.d3 «Σκαλιά από ίσκιους... Οι πύλες σας. Ίσκιος θέλει φως. Οι Σκιοπύλες σας είναι ο ίσκιος της φωτιάς της.» / "Stairs of shadow... Your gates. A shadow needs a light. Your Shadow Gates are the shadow of her fire."
- d.glaukos.d4 «Κι όσο καίει, έχουν πάτο. Πάμε να τον βρούμε. Το Πηγάδι είναι κάτω από τη Μαύρη Λίμνη, μέσα στον Σωρό των Καραβιών.» / "And while it burns, they have a bottom. Let's go and find it. The Well is under the Black Mere, inside the Wreck Heap."
- d.glaukos.d5 «Μα κάτι ζει σ' εκείνο το νερό. Τ' ακούω ν' ανασαίνει από δω.» / "But something lives in that water. I can hear it breathing from here."
- Then q35.

**The Names from Above, first time** (the first rite window after `drainedSeen`; Mechanics):
- d.glaukos.n1 «Ακούς; Η Σέλνα λέει τα ονόματα από πάνω. Όσο πέφτουν, το σκοτάδι σωπαίνει να τ' ακούσει.» / "Hear that? Selna's saying the names up there. While they fall, the dark goes quiet to listen."
- First-time hint hint.names.

**The Skotos in the Drained Sea** (place voices, z.voices, one per area, lowercase, with "i" now):
- w1 «...εγώ ήμουν η θάλασσα εδώ... την ήπια... τώρα έχω πού να σταθώ...» / "...i was the sea here... i drank it... now i have somewhere to stand..."
- w2 «...μου έδωσαν όνομα... κι από τότε θυμάμαι... πονάει να θυμάσαι... πώς το αντέχετε;...» / "...they gave me a name... and since then i remember... it hurts to remember... how do you bear it?..." (Act V's w2 was "only those who remember hurt")
- w3 «...όποιος έχει όνομα ψάχνει τα άλλα... τα μαζεύω... ένα μου λείπει... το πρώτο...» / "...whoever has a name looks for the others... i gather them... i am missing one... the first..."
- w4 «...εκείνη κρύβεται... ακούω τη φωτιά της... δεν ακούω τ' όνομά της...» / "...she is hiding... i hear her fire... i do not hear her name..."
- w4.r «...κι εσύ, παιδί του δάσους... ξέρεις πώς είναι να σε στέλνουν μακριά για να κρυφτείς...» / "...and you, child of the wood... you know what it is to be sent away to hide..." (d.tear.nursery.1)

**Optional in the Drained Sea: four Lost Lights and two of the forgotten** (the Lost, Mechanics):
- **The Lost Lights (Τα Χαμένα Φώτα).** Glaukos said «Οι παλιοί είχαν εννιά φάρους απ' το Αμόνι ως την άκρη του πάγου.» (d.glaukos.2). Five burn now (the Grey, the Wreck and the Fall Lights, the Skerry Light and the Farthest Light). The other four lie toppled on the Drained Sea's floor: the Drowned Lights that glow up through the Farthest Light's ice in Act V (gen5.js:1145-1167, `uGlow`). Each is a rime tower prop laid on its side (towerA/B/C, `extras.top` reused for the lantern end) with a lantern niche.
  - Interact «Άναψε τον χαμένο φάρο» / "Light the lost light", 1 s. Its lantern becomes a true lamp pool r 4 (Cradle refill, Shroud reveal), and its keeper's line plays as a toast-dialog.
  - **The lines are written already.** Act V's design kept four stretch Name-stone lines ready and never shipped them. Three fit unchanged, and one is new:
    - d.stone.galini «Γαλήνη. Έσβησε τον φάρο της για να μη βλέπει τη θάλασσα που της πήρε τα παιδιά. Τη συγχωρέσαμε.» / "Galini. She put out her light so she wouldn't see the sea that took her children. We forgave her."
    - d.stone.twins «Γλαύκη και Κυμώ. Δίδυμες. Κατέβηκαν μαζί στον πάγο να του πουν τ' όνομά του. Γύρισε η μία.» / "Glauke and Kymo. Twins. They went down onto the ice together to say its name. One came back."
    - d.stone.kranea «Κρανιά. Ήρθε από το δάσος, παιδί ακόμα, πριν από εκατό χειμώνες. Δεν είδε ποτέ ξανά φθινόπωρο.» / "Kranea. She came from the wood, still a child, a hundred winters ago. She never saw another autumn." (+ .r «Κρανιά. Ήρθε από το δάσος, παιδί ακόμα. Τ' όνομά της είναι χαραγμένο και στις πέτρες του δικού σου δάσους.» / "Kranea. She came from the wood, still a child. Her name is cut in the stones of your wood too.")
    - new: d.stone.psamathe «Ψαμάθη. Κράτησε τον Φάρο της Άμμου ώσπου η άμμος τον σκέπασε. Είπε πως θα τον ξεθάψει την άνοιξη.» / "Psamathe. Kept the Sand Light till the sand covered it. She said she'd dig it out in spring."
  - All four set `nineLit`: toast «Εννιά φάροι καίνε» / "Nine lights burn"; the farlight zone's drowned glows (`uGlowOn`, shipped) burn at full from above: one uniform, no layout change.
- **The Sailor (Ο Ναύτης)**, on the deck of a keel-boat beached on the Old Shore, sitting with his knees up (people.glb 'villager0', the Faded's tint at 0.9 without the veil, Sit_Floor_Idle).
  - d.sailor.0 «Είχα όνομα, πριν. Το λιμάνι μου ξέχασε το καράβι μου, κι εμένα μαζί.» / "I had a name, once. My port forgot my ship, and me with it."
  - **If the hero lit his Name-stone in Act V** (`h.flags.names` holds 'sailor'), he knows them at once: d.sailor.2 «Εσύ άναψες το λυχνάρι μου στην ακτή. Το είδα από δω κάτω.» / "You lit my lamp on the coast. I saw it from down here." Then d.sailor.1.
  - **If not**, he asks, and Glaukos (at the Rope camp) knows: d.glaukos.y1 «Ένας απ' τον νότο, σε καράβι που ξεχάστηκε; Ναύτη τον είπαμε. Πες του το.» / "One from the south, on a ship that was forgotten? Sailor, we called him. Tell him." Back on the deck, narration d.sailor.n «Του λες τ' όνομα που του έδωσαν οι Αλιγενείς: Ναύτης.» / "You tell him the name the Saltborn gave him: Sailor."
  - d.sailor.1 «Ναύτης. Ναι. Τ' ακούω κάθε βράδυ από πάνω. Είναι καλό όνομα.» / "Sailor. Yes. I hear it every night from above. It's a good name." He lies down on the deck at rest and fades. Flag `sailorRest`.
- **Asger (Ο Άσγκερ)**, of the Order of the Flame, frozen inside an ice keel in the Keels, beside a cold brazier (people.glb 'wayfarer' in a russet robe tint with a code hood, behind the keel's icy material at 0.6 opacity; shown as «Προσκυνητής» / "A pilgrim" until freed).
  - Interact «Άναψε το μαγκάλι του» / "Light his brazier", 1 s, from the Cradle. The keel's window melts clear (a 2 s fade of its opacity) and he steps out.
  - d.asger.1 «Ζεστό... Ήρθα να μάθω πώς κρατιέται μια φλόγα ζωντανή μέσα στο χιόνι. Κατέβηκα πολύ βαθιά για να τη βρω.» / "Warm... I came to learn how a flame is kept alive in the snow. I went too far down looking for it."
  - d.asger.2 «Πες στο Τάγμα πως ο δρόμος για τον βορρά υπάρχει ακόμα. Τον ξέχασαν. Δεν χάθηκε.» / "Tell the Order the road north is still there. They forgot it. It isn't lost."
  - Mage only: d.asger.2.m «Τα χρώματά σου... Μαθητής, έτσι; Πες στους δασκάλους σου: ο δρόμος για τον βορρά υπάρχει ακόμα. Τον ξέχασαν. Δεν χάθηκε.» / "Your colours... a student, then? Tell your masters: the road north is still there. They forgot it. It isn't lost." (d.alk.a5.m «Μετά ξέχασαν τον δρόμο.»)
  - He walks toward the rope and fades. Flag `asgerRest`.
- Toast q.lost «Χαμένα φώτα και ονόματα: {0}/7» / "Lost lights and names: {0}/7". All of them can be finished in the post-game.

- q35 [drained] q.35 «Νίκησε το Κήτος στη Μαύρη Λίμνη» / "Defeat the Ketos in the Black Mere".

**At the Wreck Heap.** The Heap is a ring of piled wrecks round the last black water of the drained sea, the Black Mere: every boat that ever rowed toward a light that did not flicker, heaped where the beast drew them down. Over the middle of the Mere hangs one steady, cold light.
- Glaukos (on the Heap's north rim): d.glaukos.m0 «Το βλέπεις; Ένα φως που δεν τρέμει. Μην πας κοντά του.» / "See it? A light that doesn't flicker. Don't go near it."
- Three dead lanterns hang on wrecks round the shore at 120° (the rime `oilLamp` on a mast stump). Lighting each from the Cradle is a 1 s touch, «Άναψε το φανάρι του καραβιού» / "Light the boat's lantern"; each becomes a true lamp of r 4.
- **Keyx's boat** is the nearest of the three to the gap, a keel-boat with a carved gunwale, and questGoal points at it first. When its lantern is lit, Glaukos runs his hand along the wood: d.glaukos.m1 «Αυτή η κουπαστή... Ο Κήυκας τη σκάλιζε τα βράδια. Η βάρκα του.» / "This gunwale... Keyx used to carve it in the evenings. His boat."
- **Black-Water Memory 1, "The moonless night"** (d.ink.k1.*, the Lamp-Memory flow with body class 'memory-ink' and narrator npc.inkMemory «Μνήμη από μαύρο νερό» / "A memory in black water"; Keyx is people.glb 'villager1' in the memory material, Alkyone her frost scene; flag `mem_k1`; not counted in q34):
  - .1 «Εφτά χειμώνες πριν. Νύχτα χωρίς φεγγάρι. Ένας ψαράς βλέπει ένα φως στη θάλασσα, ακίνητο.» / "Seven winters ago. A moonless night. A fisherman sees a light on the sea, perfectly still."
  - .2 (Alkyone, from the shore) «Κήυκα! Δεν τρέμει! Γύρνα πίσω!» / "Keyx! It doesn't flicker! Come back!"
  - .3 «Ο ψαράς τραβά κουπί. Το φως τον περιμένει.» / "The fisherman rows. The light waits for him."
  - .4 «Στη Σκάλα, μια γυναίκα λέει ένα όνομα ως το πρωί. Κι από τότε, κάθε βράδυ.» / "At the Landing, a woman says a name until morning. And every night since."
- Lighting the third lantern plays cine `ketosWake` (flag saved first; pitch 0.3 over the Mere): the steady light drifts toward the shore; under it the water bulges, and a long blind jaw, a neck like a mast and a bony stalk from the brow rise out of the black.
  - Glaukos: d.glaukos.k0 «Το Κήτος. Η γιαγιά μου τρόμαζε τα παιδιά μ' αυτό: «Ποτέ μην τραβάς κουπί προς φως που δεν τρέμει».» / "The Ketos. My grandmother frightened children with it: 'Never row toward a light that doesn't flicker.'"
  - The Heap's east and west gaps close (map.close on a 3-cell plug each, like Act V's skerry).

**Boss: the Ketos** (see Bosses). Glaukos calls the fight from the Heap's rim, **by ear, because he is blind**; each line is also the phase's audio tell:
- Phase 1: d.glaukos.k1 «Τ' ακούω να σέρνεται κάτω απ' το νερό. Μην πας στο φως του: δεν τρέμει! Στάσου στα φανάρια!» / "I can hear it dragging under the water. Don't go in its light: it doesn't flicker! Stand by the lanterns!"
- Phase 2: d.glaukos.k2 «Η λίμνη αδειάζει! Το κεφάλι του χτυπά στη λάσπη: κόψε το φως του όταν πέφτει!» / "The lake's emptying! Its head is hitting the mud: cut its light when it comes down!"
- Phase 3: d.glaukos.k3 «Τυφλώθηκε. Ακούει, όπως εγώ. Χτύπα την καμπάνα δίπλα σε φωτιά!» / "It's blind. It listens, like me. Ring the bell beside a fire!"

**Death.**
- Narration d.ketos.die «Το Κήτος σηκώνει τον λαιμό του προς το φως πάνω από τον πάγο, μια φορά, και τον ακουμπά κάτω.» / "The Ketos lifts its neck toward the light above the ice, once, and lays it down." Its neck stays across the dry bed as an arch (a static prop, its echo spot).
- The Skotos breathes in, and the last of the Mere drains away into the Well under it: d.skotos6.2 «...κι αυτό ήταν δικό μου... κανείς δεν θα το θυμάται... εσύ όμως θυμάσαι... γιατί;...» / "...that was mine too... no one will remember it... but you remember... why?..."
- Glaukos, listening: d.glaukos.m2 «Κάτι τρέμει εκεί κάτω στη λάσπη. Τ' ακούω να τρίζει, σαν φιτίλι.» / "Something's flickering down there in the mud. I can hear it crackle, like a wick."
- Narration d.keyxlamp «Στη λάσπη, ανάμεσα στα πλευρά μιας βάρκας, ένα φανάρι καίει ακόμα. Τρέμει.» / "In the mud, among the ribs of a boat, a lantern is still burning. It flickers." The hero picks it up as part of the cine (it rides at her belt from now on, a code lantern with the true flicker).
- Glaukos: d.glaukos.m3 «Εφτά χειμώνες, και τρέμει ακόμα. Πάρ' το μαζί σου.» / "Seven winters, and it still flickers. Take it with you."
- Flags `ketosDown` and `keyxLamp` (saved together, first). Big toast q.ketosDown «Το φως που δεν έτρεμε έσβησε» / "The light that didn't flicker has gone out", then «Το Πηγάδι άνοιξε» / "The Well lies open". q36.

**The exit:** `{ to: 'bottom', label: 'exit.well', locked: 'ketosDown' }` at the Well's mouth in the middle of the drained Mere. Before the Ketos falls the Well lies under the Mere's deep water, so there is no exit to reach; a hero who walks to the water's edge before `ketosWake` hears Glaukos, by ear, d.wellShut «Το Πηγάδι είναι κάτω από το μαύρο νερό, κι εκεί μέσα κάτι ζει.» / "The Well is under the black water, and something lives in it."

- q36 [bottom] q.36 «Σβήσε τις μαύρες λάμπες των πνιγμένων τόπων ({0}/3)» / "Put out the black lamps of the drowned places ({0}/3)". Progress toast q.lampOut «Μια μαύρη λάμπα έσβησε ({0}/3)» / "A black lamp has gone out ({0}/3)".

**Arrival cine at the Bottom** (pitch 0.25 from the Well's foot):
- d.bottom.1 «Το Πηγάδι βγάζει σε έναν βυθό πιο βαθύ από κάθε βυθό. Εδώ στέκονται μέρη που ξέρεις: ένας τύμβος, ένα δάσος, ένα χωριό. Μαύρα και βρεγμένα, σαν να τα ξέχασε κάποιος εδώ.» / "The Well opens onto a bottom deeper than any seabed. Here stand places you know: a barrow, a wood, a village. Black and wet, as if someone forgot them here."

**The Well's Foot camp** (waypoint `bottom`): a ledge where the Well comes down, an old Saltborn fire-pit that Glaukos lights from the hero's Cradle. Glaukos:
- d.glaukos.b1 «Εδώ καταλήγουν όσα ξεχνάτε στον νότο. Ό,τι σκεπάζει το Σκότος, έρχεται εδώ να ησυχάσει.» / "This is where what you forget in the south ends up. Whatever the Skotos covers comes here to lie still." (Act V's d.alk.b4)
- d.glaukos.b2 «Οι πύλες σας τ' αντιγράφουν. Κάθε φορά που ανοίγει μια Σκιοπύλη, ένα απ' αυτά ρίχνει τον ίσκιο του ως εκεί πάνω.» / "Your gates copy them. Every time a Shadow Gate opens, one of these throws its shadow all the way up there." (the lore for world.js:135)
- d.glaukos.b3 «Και τρεις μαύρες λάμπες κρατούν τη σκάλα κλειστή. Καίνε με φως που ήπιε, και δεν τρέμουν. Σβήσ' τες.» / "And three black lamps keep the stair shut. They burn with light it drank, and they don't flicker. Put them out."

**The drowned places** (one per area of the zone, in any order):
- **The Drowned Barrow (Ο Πνιγμένος Τύμβος):** crypt rooms stamped from `genCrypt`, Act I's dungeon kit rimed, Gate-Fallen packs. **Black lamp 1** at its south door, with the Gate-Fallen Captain.
  - **Optional, a side hollow: the ember in the ice** (interact «Άκου» / "Listen", 1 s; flag `ember6`; never named, never fought, available until `firstLit`). By default it is narration only (Decisions; owner question 2):
    - d.ember.n1 «Μέσα στον πάγο, μια θράκα στο σχήμα σπασμένου δαχτυλιδιού. Λάμπει κόκκινη, σαν να περιμένει ν' ακούσει ένα όνομα.» / "In the ice, an ember shaped like a broken ring. It glows red, as if waiting to hear a name."
    - d.ember.n2 «Δεν του λες τίποτα.» / "You tell it nothing."
    - d.ember.n3 «Η θράκα σβήνει, σαν πυρωμένο σίδερο στο νερό.» / "The ember goes out, like red-hot iron dropped in water." (d.tear.breaking.1)
    - *If the owner chooses the spoken version,* two pale red `say` lines come between n1 and n2, formal, with no contractions, broken by ellipses: d.ember.1 «...εσύ... σε ξέρω... πες μου... πώς με έλεγαν;...» / "...you... I know you... tell me... what was my name?..."; d.ember.2 «...είχα ένα στέμμα... ένα όνομα... κάποτε το φώναζαν σε κάθε κορυφή...» / "...I had a crown... a name... once they shouted it on every peak..."
- **The Drowned Wood (Το Πνιγμένο Δάσος):** a `genForest` patch of black, leafless trees standing in the black water, with Falselights, the Faded and an Icemaw. **Black lamp 2** at its south end, with a Falselight matriarch and her lures.
  - **Leif (Ο Λέιφ)**, the woodcutter's son of d.v.3, sits by a dead campfire in a clearing (people.glb 'villager2' at ×0.92 with a code hood and axe; shown as «…» until `leifName`). Interact «Άναψε τη φωτιά του» / "Light his fire", 1 s:
    - d.leif.1 «Πήγα για ξύλα. Βρήκα μια πόρτα στο δάσος, χωρίς τοίχο γύρω της. Από τότε κατεβαίνω.» / "I went for wood. I found a door in the forest with no wall round it. I've been going down ever since." (A Shadow Gate, opened in the wood.)
    - d.leif.2 «Ξέρω πως έχω πατέρα. Τ' όνομά μου όμως το άφησα κάπου πιο πάνω.» / "I know I've got a father. My name, though, I left somewhere higher up."
    - d.leif.3 «Πάρε το τσεκούρι μου. Εκείνος θα το γνωρίσει.» / "Take my axe. He'll know it." Interact «Πάρε το τσεκούρι του» / "Take his axe". Flag `leifAxe`. He stays by the fire, which now burns (a true lamp of r 3).
  - **The garland glade**, a clearing whose branches hold garlands, dried black. Entering it sets `garland6` and a narration toast: d.garland.1 «Ένα ξέφωτο με στεφάνια στα κλαδιά, μαύρα και ξερά. Κάποτε κάποια κορίτσια τα έπλεκαν εδώ.» / "A glade with garlands on its branches, black and dry. Once, girls wove them here." (Elianthe answers it at home.)
- **The Forgotten Village (Το Ξεχασμένο Χωριό):** Act I village houses half-sunk and leaning; the Faded go about chores that no one remembers (they are dormant at their chores, `chores`, until the hero's light touches them), with a Lampbearer and a Faded Elder. **Black lamp 3 is in Keyx's hand.**
  - **Keyx (Ο Κήυκας)** stands at the sunken well in the village square among the Faded, the one with a face: a salt-white beard, his oilskin rotted to kelp, and in his raised hand a black lamp burning dead still (people.glb 'villager1' under the Faded's grade at half strength, no veil, a code beard; never hostile, never targetable).
  - Approaching him: d.keyx6.0 «Ποιος είναι εκεί με τη φωτιά; ...Δεν είσαι εκείνη.» / "Who's there with the fire? ...You're not her."
  - His black lamp is put out by **«Δώσ' του το φανάρι του» / "Give him his lantern"**: the same 2.0 s channel as every black lamp, with its Black Flares, its guard pack and its interrupt. Flags `blackLamp2` and `keyxFreed` saved together, first.
  - Narration d.keyx6.1 «Του δίνεις το φανάρι του. Η μαύρη λάμπα πέφτει από το χέρι του και σβήνει.» / "You give him his lantern. The black lamp falls from his hand and goes out."
  - d.keyx6.2 «Αυτό τρέμει. Είναι το δικό μου.» / "This one flickers. It's mine."
  - d.keyx6.3 «Εφτά χειμώνες με φωνάζει κάθε βράδυ, κι εγώ ξυπνάω εδώ κάτω. Δεν μπορώ να γυρίσω, και δεν μπορώ να κοιμηθώ.» / "Seven winters she's called me every night, and I wake down here. I can't come home, and I can't sleep."
  - d.keyx6.4 «Πάρ' το πάνω. Να ξέρει πως το βρήκα. Και πες της... πως μπορεί να μ' αφήσει να κοιμηθώ.» / "Take it up. So she knows I found it. And tell her... she can let me sleep."
  - Narration d.keyx6.5 «Περπατά μέσα στο μαύρο νερό, και το νερό τον αφήνει να περάσει.» / "He walks into the black water, and the water lets him through." The lantern is at the hero's belt again.

**Each black lamp** stands at the far end of its place, before a wall of black shadow that closes the way to the Shadow Stair (a blocked band of cells, opened with `map.open` like the Forge's slag plug):
- A code lantern on a pole (in Keyx's hand in the village): an iron cage holding a flame drawn as a dark sprite with a cold violet rim (an additive sprite with a subtractive-looking core: a black-violet texture under normal blending, no light source). **It does not flicker:** the act's false light (Mechanics).
- **Its inversion is the act's one new verb: «Σβήσε τη μαύρη λάμπα» / "Put out the black lamp", a 2.0 s channel.** A hit worth 10% of max life interrupts it. It is the shipped `snuffLamp` (light.js) aimed the other way: Act IV's Smoke-eaters snuffed the hero's lamps; here the hero snuffs the dark's.
- While she channels, the lamp pulses a **Black Flare** every 4 s: a black teleCircle r 4, 1.2 s, then 0.8× and Cold +15, and her Cradle's ring −1 m.
- The place's champion pack guards it: a Gate-Fallen Captain, a Falselight matriarch, a Faded Elder (elite affixes as usual).
- **When it goes out,** the light it drank comes back: the hero's Cradle refills to full in a white burst, the shadow-wall thins away over 2 s (fx), and the cells open. The lamp's id goes into `flags.blackLamp<k>`.
- **The Skotos answers each one,** in order of count, and its answers raise the stakes, because snuffing the lamps opens the way for it too:
  - first: d.skotos6.l1 «...αυτό ήταν δικό μου...» / "...that was mine..."
  - second: d.skotos6.l2 «...σβήνεις φώτα τώρα;... εσύ;...» / "...you put out lights now?... you?..."
  - third: d.skotos6.l3 «...τη βλέπω... τη φωτιά της... δεν θα κρύβεται για πολύ...» / "...i see it... her fire... she will not hide much longer..."
- After the third, Glaukos (at the Well's Foot, heard as a far `say`): d.glaukos.b4 «Του ανοίξαμε κι εκείνου τον δρόμο. Γρήγορα, πριν φτάσει πρώτο.» / "We've opened the way for it too. Quickly, before it gets there first." Then q37.

**The Skotos in the Bottom** (place voices):
- w5 «...εδώ κάτω τα κρατάω όλα... κανείς δεν τα ζητάει...» / "...down here i keep everything... no one asks for it back..."
- w6 «...ένας βασιλιάς, ένας ιστός, ένα χωριό... τα ξέχασαν... εγώ όχι πια...» / "...a king, a web, a village... they forgot them... not i, not any more..."
- w7 «...ποιος σου έμαθε να κουβαλάς φωτιά;... κάποια σου το έμαθε... κάποια πολύ παλιά...» / "...who taught you to carry fire?... someone taught you... someone very old..." (foreshadows blow 3)

- q37 [bottom] q.37 «Νίκησε τον Ίσκιο της Πύλης στην Εστία της Πρώτης» / "Defeat the Shade of the Gate at the First's Hearth".

**The Shadow Stair (Η Σκάλα των Ίσκιων)** runs down from the three drowned places to the Hearth: terraces drawn as visual height only (every walkable cell stays at y = 0, engine brief §0.1). The Hands of the Skotos rise from its pools as hazards (`skotosHand` nodes, the shipped model and AI, at most 2 at once, with Act V's Hand Rise and Sweep). Sunken climb the terraces.

**The Hearth** (cine `shadeWake`, flag saved first; pitch 0.35):
- On a stone in the middle a fire burns low and barely trembles. A figure of black ice lies curled beside it.
- Round the rim, a lamp burns for each of the Lost the hero freed (Mechanics, the Lost): narration, if any, d.shade.c2 «Γύρω στο χείλος καίνε λυχνάρια με ονόματα που έφερες ως εδώ.» / "Round the rim burn lamps with names you brought down here."
- Narration d.shade.c1 «Φωνάζεις την Πρώτη στο σκοτάδι. Κανείς δεν απαντά.» / "You call the First into the dark. No one answers." (d.lamp.m1.2, in the second person)
- d.shade.0 «Η φωτιά στη μέση ρίχνει τον ίσκιο σου πίσω σου, μακρύ. Ο ίσκιος σηκώνεται. Παίρνει το σχήμα του Άρχοντα του Τύμβου.» / "The fire in the middle throws your shadow long behind you. The shadow stands up. It takes the shape of the Barrow Lord."
- Glaukos, from the Stair: d.glaukos.s0 «Τον ξέρεις. Σε περίμενε στο τέλος κάθε πύλης. Δεν είναι κανένας απ' αυτούς. Είναι ο ίσκιος της.» / "You know him. He waited for you at the end of every gate. He's none of them. He's her shadow."

**Boss: the Shade of the Gate** (see Bosses). It has no voice of its own. In each borrowed form it speaks with that form's shipped line, and in the hero's shape it says nothing, because the hero never speaks:
- form 1 (the Barrow Lord) on rising, the shipped d.lord «Κανείς ζωντανός δεν περνά από εδώ. Και κανείς νεκρός δεν φεύγει.» / "No one living passes here. And no one dead ever leaves.";
- form 2 (the Weaver), the shipped d.weaver «...μείνε... μείνε μαζί μας... για πάντα...» / "...stay... stay with us... forever...";
- form 3 (the troll) only roars;
- form 4 (your own shape): silence.

Glaukos calls one thing per form:
- form 2: d.glaukos.s1 «Ιστοί! Κόβουν το φως! Κάψ' τους ή κόψ' τους!» / "Webs! They cut off the light! Burn them or cut them!"
- form 3: d.glaukos.s2 «Ο πάγος από πάνω! Άσ' τον να χτυπήσει εκεί που κρέμεται!» / "The ice above! Let it strike where the ice hangs!"
- form 4: d.glaukos.s3 «Δεν βλέπω τίποτα. Μα ακούω δύο να περπατούν όπως εσύ. Στάσου εκεί που ο ίσκιος σου πέφτει στο φως!» / "I can't see a thing. But I hear two walking the way you walk. Stand where your shadow falls into the light!"

The end of the fight is under ending ("The Shade falls"). Then q38.

- q38 [bottom] q.38 «Δώσε στην Πρώτη τη φωτιά σου και τ' όνομά της: {0}» / "Give the First your fire, and her name: {0}" ({0} «…» until `nameBack`). Then q.38b «Ανέβα από την πύλη στον Λευκόβραχο» / "Climb up through the gate to Whitecliff". See ending.

**After the home cine,** a hero who carries Keyx's lantern (`keyxLamp` without `landing6`) is told once, toast q.keyxLamp «Το φανάρι του Κήυκα τρέμει ακόμα στη ζώνη σου. Η Αλκυόνη είναι στη Σκάλα.» / "Keyx's lantern still flickers at your belt. Alkyone is at the Landing."; Alkyone at the Landing carries the "!" until the scene plays (ending, After the act).

**Lines at home** (talk variants on flags; no model loads, so folk.glb and grove.glb stay out of the act):
- Brokka in the Halls, after `call6`: d.brokka.v3 «Λένε πως κάτω από τον πάγο του βορρά καίει μια φωτιά πιο παλιά από τη Βαθύπετρα. Οι Λιθογενείς δεν ξεχνούν, ξένε. Μα αυτή δεν την ξέραμε ποτέ.» / "They say under the northern ice a fire burns older than Deepstone. The Stoneborn don't forget, stranger. But that one we never knew."
- Brokka, after `firstLit`: d.brokka.v4 «Φέρουσα. Ωραίο όνομα για σιδερά. Αυτή που κουβαλά.» / "Pherousa. A good name for a smith. She who carries."
- Elati in the Lanternglade, after `firstLit`: d.elati.v3 «Μια φωτιά από κάτω, κι όχι από πάνω. Οι ρίζες το ήξεραν πάντα, φλογοφέρε.» / "A fire from below, not from above. The roots always knew that, fire-bearer." (+ .r «...Οι ρίζες το ήξεραν πάντα, αδελφή.» / "...The roots always knew it, sister.")
- **The forgetting undone,** after `firstLit`:
  - Halda: d.halda6.v2 «Τ' αστέρια! Αυτό ήθελα να σου πω: όσο έλειπες, ανεβαίναμε στις κορυφές και τα κοιτούσαμε. Οι Λιθογενείς δεν ξεχνούν, βλέπεις.» / "The stars! That's what I meant to tell you: while you were gone, we climbed the peaks and watched them. The Stoneborn don't forget, you see."; and d.halda.v6 «Βγάζει ζέστη η πύλη. Ζέσταμε τα χέρια μας εκεί όλο το βράδυ.» / "The gate gives off warmth. We warmed our hands there all evening."
  - Elianthe: d.elianthe6.v2 «Το ραβδί του Ίσαρν. Το ξέρω, βέβαια το ξέρω. Δεν θα το ξεχάσω ποτέ.» / "Isarn's staff. I know it, of course I know it. I'll never forget it."
  - Elianthe, after `garland6`: d.elianthe.v6 «Ένα ξέφωτο με στεφάνια στα κλαδιά, λες; Έπλεκα εκεί μικρή. Το είχα ξεχάσει.» / "A glade with garlands on the branches, you say? I wove them there as a girl. I'd forgotten." (The Bottom's wood is the shadow of every forest, the Whisperwood too.)
- **Leif's father** (the d.v.3 villager), with `leifAxe`: interact «Δώσ' του το τσεκούρι» / "Give him the axe":
  - d.v.son2 «Το τσεκούρι του... Λέιφ! Λέιφ τον λέγαμε! Λέιφ!» / "His axe... Leif! Leif, we called him! Leif!" Flag `leifName` (counts among the Lost).
  - d.v.son3 «Θα το λέω κάθε βράδυ. Να μ' ακούει από κάτω.» / "I'll say it every night. So he hears me down there."
  - **Leif comes home** on the first town entry with `leifName` and `act6` (flag `leifHome`): he stands by his father's door with his axe. d.leif.home «Πατέρα. Άργησα λίγο με τα ξύλα.» / "Father. I was a bit late with the wood." His bark after: d.leif.bark «Ξύλα για όλες τις κορυφές. Δουλειά έχουμε.» / "Wood for every peak. We've work to do."

**Catch-ups on zoneEnter** (the Act IV and V pattern; a flag saved before its scene is caught up quietly):

| flag | catch-up |
|---|---|
| `call6` | → 32 (Tamarisk at the staff) |
| `call6` and Tamarisk talked (`tam6`) | → 33 |
| `coal6` | → 33b; the exit at the hole unlocks |
| `drainedSeen` without the Glaukos teach | replay d.glaukos.d1-d2b, then → 34 |
| more hearths lit than `mem_d1`-`mem_d3` seen | the lit hearth offers «Θυμήσου»; questGoal points at it |
| `hearth6_1`-`3` and `mem_d1`-`d3` all set | d.glaukos.d3-d5, then → 35 |
| Keyx's boat lantern lit without `mem_k1` | the lantern offers «Θυμήσου» |
| `ketosWake` without `ketosDown` | the fight starts again from the three lanterns (they relight on build) |
| `ketosDown` (saved with `keyxLamp`) | → 36; the drained Mere in mode 'dry', the neck arch, the Well open |
| `blackLamp0`-`2` all set | the Stair's walls open on build; → 37 |
| `blackLamp2` (saved with `keyxFreed`) | Keyx is gone from the square; his lamp lies dark |
| `shadeWake` without `shadeDown` | the fight starts again from form 1 |
| `shadeDown` without `firstLit` | → 38; the name stays «…» |
| `firstLit` (saved with `nameBack`) without `homeGate` | replay the naming card if unseen; → 38b |
| `homeGate` without `h.act6` | home cine, then → actComplete(6) |
| `act6` and `keyxLamp` without `landing6` | the Landing scene on the next coast entry |
| `leifName` and `act6` without `leifHome` | Leif at his father's door on the next town entry |

Quitting mid-cine never strands a save. A Black Water cycle, a black lamp's channel, a boss phase or form in progress is runtime-only; zones rebuild from the seed.

**Cached zones.** Both zones are built once and kept in `G.zones`. Act VI never relies on build time alone:
- the rope hole and its exit on the Light's Skerry are laid by `act6Presence` on every farlight entry;
- the Stair's shadow-walls are opened in `act6Enter` from the `blackLamp<k>` flags on every entry, as well as at build;
- the Black Water keeps its state on the zone (`z.tide`) and `act6Enter` restarts its clock at low water on every entry, as `act5Enter` does;
- `enterZone` passes `fresh: true` for 'drained' when `drainedMode()` ('mere' before `ketosDown`, 'dry' after) differs from `z.mode`, and for 'bottom' when `bottomMode()` ('dark' before `firstLit`, 'lit' after) differs.

**New text keys beyond the lines above** (Greek first):
- **Zones:** zone.drained «Η Στεγνή Θάλασσα» / "The Drained Sea", zone.drained.s «Εκεί που ήπιε τη θάλασσα» / "Where it drank the sea"; zone.bottom «Ο Πάτος των Πυλών» / "The Bottom of the Gates", zone.bottom.s «Εκεί που καίει η φωτιά της Πρώτης» / "Where the First's fire burns".
- **Inner areas:** Το Σκοινί / The Rope; Ο Παλιός Γιαλός / The Old Shore; Οι Μαύρες Γούβες / The Black Hollows; Οι Καρίνες / The Keels; Ο Σωρός των Καραβιών / The Wreck Heap; Η Μαύρη Λίμνη / The Black Mere; Το Πηγάδι / The Well; Η Ρίζα του Πηγαδιού / The Well's Foot; Ο Πνιγμένος Τύμβος / The Drowned Barrow; Το Πνιγμένο Δάσος / The Drowned Wood; Το Ξεχασμένο Χωριό / The Forgotten Village; Η Σκάλα των Ίσκιων / The Shadow Stair; Η Εστία της Πρώτης / The First's Hearth.
- **Exits:** exit.rope «Το σκοινί κάτω από τον πάγο» / "The rope beneath the ice"; exit.ropeUp «Ανέβα από το σκοινί» / "Climb the rope"; exit.well «Το Πηγάδι» / "The Well"; exit.gateUp «Ανέβα από την πύλη» / "Climb the gate"; d.ropeShut, d.wellShut (above); d.stairShut «Ένας τοίχος από ίσκιο κλείνει τη σκάλα.» / "A wall of shadow closes the stair."
- **Waypoints:** wp.drained «Το Σκοινί» / "The Rope"; wp.bottom «Η Ρίζα του Πηγαδιού» / "The Well's Foot".
- **Toasts:** q.hearthLit, q.lampOut, q.lost, q.nameHeld, q.ketosDown (big), q.firstLit (big), q.keyxLamp (above); q.black «Το μαύρο νερό ανεβαίνει» / "The black water is rising"; q.fireOut «Η Κούνια έσβησε» / "Your Cradle has gone out"; q.fireBack «Η Κούνια ξανάναψε» / "Your Cradle burns again"; q.namesFall «Από πάνω, ονόματα» / "Names, from above"; q.lostAll «Όλα τα χαμένα θυμήθηκαν: η ευλογία του βυθού δυναμώνει» / "All the lost remembered: the deep's blessing grows stronger"; q.gateFound «Κάποιος θυμήθηκε πως ήταν κάποιος» / "Someone remembered they were someone".
- **Prompts:** «Πάρε ένα κάρβουνο από τον Έσχατο Φάρο»; «Ξανάναψε την εστία» / "Relight the hearth"; «Άναψε τον χαμένο φάρο» / "Light the lost light"; «Άναψε το φανάρι του καραβιού» / "Light the boat's lantern"; «Χτύπα την καμπάνα» / "Ring the bell"; «Σβήσε τη μαύρη λάμπα» / "Put out the black lamp"; «Δώσ' του το φανάρι του» / "Give him his lantern"; «Άναψε τη φωτιά του» / "Light his fire"; «Πάρε το τσεκούρι του» / "Take his axe"; «Δώσ' του το τσεκούρι» / "Give him the axe"; «Άναψε το μαγκάλι του» / "Light his brazier"; «Άκου» / "Listen"; «Ξανάναψε τη φωτιά της» / "Relight her fire"; «Άναψε την πέτρα» / "Light the stone"; «Άναψε τη λάμπα» / "Light the lamp" (a sleeping forgotten one in the Gates); «Θυμήσου» / "Remember".
- **HUD:** hud.dim «Η Κούνια λιγοστεύει» / "Your Cradle is low"; hud.out «Σβηστή» / "Out"; hud.rekindled «Ξανάναψε» / "Rekindled"; hud.heard «Σε άκουσε» / "Heard" (the Ketos's blind phase). Hints: hint.carry «Το σκοτάδι πίνει την Κούνια σου. Γέμισέ τη σε κάθε φωτιά.» / "The dark drinks your Cradle. Fill it at every fire."; hint.flicker «Το αληθινό φως τρέμει. Αυτό που δεν τρέμει είναι δόλωμα.» / "True light flickers. Light that doesn't is a lure."; hint.black «Όταν βογκάει ο πάγος, το μαύρο νερό ανεβαίνει» / "When the ice groans, the black water rises"; hint.drip «Τα βαριά χτυπήματα ρίχνουν πάγο από πάνω» / "Heavy blows bring ice down from above"; hint.unseen «Οι Ξέθωροι φαίνονται μόνο στο φως σου» / "The Faded show only in your light"; hint.names «Όσο πέφτουν τα ονόματα, η Κούνια γεμίζει κι οι Ξέθωροι σωπαίνουν» / "While the names fall, your Cradle fills and the Faded fall still"; hint.shadow «Ο ίσκιος σου πέφτει απέναντι από τη φωτιά» / "Your shadow falls opposite the fire".
- **Names:** npc.first «Η Πρώτη» / "The First" (shipped for Ice Memory 1), and new npc.first.named «Φέρουσα» / "Pherousa" after `nameBack`; npc.deepMemory «Μνήμη από μαύρο πάγο» / "A memory in black ice"; npc.inkMemory «Μνήμη από μαύρο νερό» / "A memory in black water"; npc.keyx «Κήυκας» / "Keyx"; npc.leif «Λέιφ» / "Leif" (shown as «…» until `leifName`); npc.sailor «Ναύτης» / "Sailor"; npc.asger «Άσγκερ» / "Asger" (shown as «Προσκυνητής» / "A pilgrim" until freed); npc.glaukos, npc.tamarisk, npc.selna, npc.alkyone, npc.tern, npc.skotos (shipped).
- **Rite names** (rollNames): name.first6 «Φέρουσα, η Πρώτη.» (replaces the first entry after `nameBack`); the Lost: name.galini «Γαλήνη.», name.twins «Γλαύκη. Κυμώ.», name.kranea «Κρανιά.», name.psamathe «Ψαμάθη.», name.leif «Λέιφ.», name.asger «Άσγκερ.»; name.someone «Κάποιος.» / "Someone."; name.goodnight «Καληνύχτα.» / "Good night." (name.sailor and name.keyx ship).
- **Act panels and title:** act5.next (replaced), act6.done, act6.sub, act6.next, q.39, boon.h6, game.sub6.
- **Gate panel:** gate.bottom «Ο πάτος τους καίει» / "Their bottom burns"; gate.depth «Βαθμίδα {0} · {1} οργιές κάτω από τον πάγο» / "Tier {0} · {1} fathoms beneath the ice".
- **Key families:** d.hal.*, d.call6.*, d.tam6.*(.r), d.selna.f*/r6, d.alk.v*/k*/after6, d.glaukos.f*/d*/n*/y*/m*/k*/b*/s*/e*/again6, d.tam.v1(.r)/again6/home(.r), d.tern.r1, d.deep.m1-m3.*, d.ink.k1.*, d.drained.*, d.ketos.*, d.keyxlamp, d.keyx6.*, d.bottom.*, d.ember.*, d.leif.*, d.v.son*, d.garland.*, d.sailor.*, d.asger.*(.m), d.shade.*, d.first.*(.m), d.skotos6.*(.r), d.sink6, d.rest6*, d.stone.galini/twins/kranea(.r)/psamathe, d.answer6.*, d.peaks.*, d.child.6*/7/bark6, d.halda6.*/call/gate/north/v6, d.elianthe6.*/call/v6, d.brokka.v3-v4, d.elati.v3(.r), mon.*, echo.*, boon.*, leg.*, gate.*.
- About **265 new bilingual lines** (three of them already written for Act V), proofread against text.js for the house voice: short, plain, poetic; Greek first; folk with contractions in English (Glaukos, Alkyone, Tern, Tamarisk, Keyx, Leif, Halda, the Sailor); Selna, the First and Asger without; the Skotos lowercase, now with "i".

### npcs
**No new people scene.** Every person in Act VI is a shipped scene. The `frost` set (frost.glb, 7 scenes, 25 textures, measured 30.68 MB of phone memory in `assets-built.md`) holds the Saltborn, Tamarisk and the First. people.glb (boot-loaded) holds the Faded, the Gate-Fallen's bodies, Keyx, Leif, the Sailor, Asger and the Shade's last form. The Drained Sea and the Bottom load `frost` through READY, as the Act V zones do (world.js:85), and nothing else.

- glaukos Γέρο-Γλαύκος / Old Glaukos: **the act's guide and quest-giver below.**
  - **Who he is:** the Landing's blind elder, the keeper of its rite, the first to say «Σκότος» in the game (d.glaukos.r3). Below the ice everyone is blind, and he is the one who knows how to walk that way. He calls every fight by ear, and he hears the blind Ketos as one blind thing hears another. At the end he climbs back up the rope.
  - **Voice:** dry, warm, unhurried; contractions in English; hears what others see («Τ' ακούω.»).
  - **Where he stands:** the Light's Skerry (q33); the Rope camp (q34, vendor); the Heap's north rim (q35); the Well's Foot (q36); the Shadow Stair's head (q37); the Hearth (q38). Post-game: the Rope camp by day (visiting vendor).

  | model | |
  |---|---|
  | source | existing scene (frost.glb 'glaukos') |
  | notes | No change. His eye band is code (act5-design). Clips: Idle_Talking_Loop, Walk_Loop, Idle_Lantern_Loop, Fixing_Kneeling (touching the gunwale, tending the fire). |
- tamarisk Μυρίκη / Tamarisk: **the quest-giver of the hook**, then the Rope camp's healer and vendor (q34-q35), the Ranger's kin line; after the act, in the Lanternglade.

  | model | |
  |---|---|
  | source | existing scene (frost.glb 'tamarisk') |
  | notes | No change. In town she uses the `frost` set town already loads from q24 on. In the Lanternglade after `act6`, `weep` loads `frost` ad hoc for her (Risks: memory). |
- first Η Πρώτη (Φέρουσα) / The First (Pherousa): the woman who lit the fire on the rock (Ice Memory 1) and went down with it. Asleep, nearly out, curled by her fire when the hero arrives; awake for one scene; asleep at the end, for the first time.
  - **Voice:** ancient, so no contractions; few words; she breathes rather than speaks.

  | model | |
  |---|---|
  | source | existing scene (frost.glb 'selna'), runtime regrade |
  | notes | The same body as Ice Memory 1's woman: the shipped NPC kind 'first' (actors.js:542, model 'selna', in the MEMORY set, posed by world.js `ICE_WHO.i1`). Act VI adds a live variant 'firstDeep' outside the memory material: a runtime void-ice grade (people.js tint above 1 drains the colour first, people.js:89-91: tint 0x9ab8d0 at 2.1), a code crown of icicles (rime `icicle` ×0.3, five instances on the head bone, `attachUpright`), a code brand in her hand (the shipped torch from models.js), and a runtime stoop (Act V's selna recipe). Selna never comes below and the First never goes above, so the two are never seen in one zone. **Look gate:** side by side with Selna in the people viewer (`?viewer&only=p:selna&tints=9ab8d0:2.1`); if they still read as one woman outside the memory material, the fallback is a one-scene set (Assets: optional). Clips (all in moves.bin): Lie_Idle (asleep, curled, and again at the end), Sit_Floor_Idle (waking), Idle_Talking_Loop. |
- keyx Κήυκας / Keyx: Alkyone's husband, Tern's father, at the bottom with his face; one scene, no fight.
  - **Voice:** folk, plain and salty like Alkyone's, with contractions in English; he counts in winters; normal case (never the Skotos's lowercase).

  | model | |
  |---|---|
  | source | people.glb 'villager1' (boot), runtime grade and code parts |
  | notes | The Faded's void grade at half strength (tint 0x1a1c24 at 1.1, so his face and hands keep their colour while his clothes go grey), a code beard (six white-grey cones on the jaw bone, Act V's frost-beard builder), his oilskin as a kelp-green cloth tint, the black lamp in his raised right hand (Idle_Lantern_Loop), then his own lantern (the code true-flicker lantern). In the Ketos's memory he is the same body in the memory material. **Look gate:** beside the Faded and the Sunken in the people viewer: he must read as a man among shadows, and not as a Sunken. |
- leif Λέιφ / Leif: the woodcutter's son of d.v.3, by a dead fire in the Drowned Wood; at home after the act.

  | model | |
  |---|---|
  | source | people.glb 'villager2' (boot), runtime scale and code parts |
  | notes | ×0.92 (a young man), a code hood (models.js veilParts in brown), a code wood-axe at the hip. Below: the Faded's grade at 0.6 until his fire is lit, then normal. At home: plain. Clips: Sit_Floor_Idle, Idle_Talking_Loop, Walk_Loop. |
- sailor Ναύτης / The Sailor; asger Άσγκερ / Asger: two of the Lost, one scene each (people.glb 'villager0' and 'wayfarer', runtime tints, code parts); see beats.
- selna Σέλνα / Selna: at the Farthest Light (q33), and post-game keeping the rite with the First's name at its head. Existing scene (frost.glb 'selna'), no change.
- alkyone Αλκυόνη / Alkyone: at the Light's Skerry (q33); post-game at the Landing, keeping the rite, Keyx's lantern on the post. Existing scene (frost.glb 'alkyone'), no change.
- tern Γλαρόνι / Tern: at the winch on the skerry (q33); post-game there, ringing the rope bell, and the voice of «Καληνύχτα.» at the end of Selna's rite. The same scene is Whitecliff's child (village tint), as in Act V. Existing scene (frost.glb 'tern'), no change.
- halda / elianthe / the child / the villagers / Leif's father: in Whitecliff, unchanged models; the hook's forgetting, its undoing, the home lines.
- brokka / elati: **at home, with lines only.** Act V's cameo loaded folk.glb and grove.glb whole and cost 88.6 MB on a cold start (`assets-built.md`, open problem 1). Act VI keeps them home so that cost never recurs.
- skotos Το Σκότος / The Skotos: lowercase `say` lines and place voices, the black-disc portrait; its shipped model (skotos.glb, the CC-BY "Cloaked Figure" source with the code hood) appears once, in the naming cine.
- shade Ο Ίσκιος της Πύλης / The Shade of the Gate: a boss (see Bosses), no dialogue of its own.
- deepMemory Μνήμη από μαύρο πάγο / A memory in black ice; inkMemory Μνήμη από μαύρο νερό / A memory in black water: narrator portraits, after «Μνήμη από κεχριμπάρι», «Μνήμη από στάχτη» and «Μνήμη από πάγο».

## Zones
### How the hero gets there from Whitecliff
**The route:** Whitecliff → the `farlight` waypoint (open since Act V; or the long way, the Field, the Anvil's Neck and the coast) → the Light's Skerry → the rope through the clear ice (exit 'drained', locked `coal6`) → the Drained Sea → the Well under the Black Mere, in the Wreck Heap (exit 'bottom', locked `ketosDown`) → the Bottom of the Gates → the Gate ring at the First's Hearth (exit 'town', open after `firstLit`), which brings the hero out beside Isarn's staff.

**Waypoints:** `drained` (the Rope, on first arrival) and `bottom` (the Well's Foot, on first arrival). The waypoint list in panels.js gains both. The First's hearths, the wreck lanterns, the lost lights and the Well's Foot's fire are respawn checkpoints (`z.checkpoint`, saved in `flags.cp6` like Act V's cp5), not waypoints. **The Gate ring is one-way** (Hearth → Whitecliff): Whitecliff's Gate panel still opens only the Shadow Gates, so the post-game is unchanged.

**Seeds per difficulty,** as the owner decided for Act V: `drained@<diff>` and `bottom@<diff>` (layout only; the hero's story state is one for all difficulties).

**No old zone changes layout.** The only change outside Act VI's own zones is on the Light's Skerry: the rope hole, the oil fire and the winch are props, and the exit is an interact, all on cells that are already thick ice and walkable. No cell opens or closes, so no saved seed's layout can change and no parity script is needed. Whitecliff gains six far fires (FAR_BEACONS 7-12) and a few props at the staff; the Landing gains a lantern on its post; the Lanternglade gains Tamarisk.

### drained (34) Η Στεγνή Θάλασσα / The Drained Sea
LAYOUT: `genDrained(seed)` in a new src/world/gen6.js. The map is 112 × 176 cells (Act V's coast is 120 × 200, so it has about 18% fewer ground vertices), north at z 0 under the Farthest Light. `ZONES.drained = { level: 34, music: 'drained', ambient: 'drained', atmos: 'drained', act: 6, pack: 'silt', light: 'deep', ring: 4.5 }`, with `zonePacks` 'rime' and 'silt' and `READY.silt = { folk: ['frost'], creatures: 'act6' }`. Two modes, from `drainedMode()`: `mere` (before `ketosDown`) and `dry` (after).

**Layout fields** (Act V's where they fit, so tide.js and the shared helpers read them as they are):
- `L.bed` (Float32): bed height in metres, quantised to 0.15; `BED_DRY` (9.0) for dry ground. The black-water pockets and the Mere are the only non-dry cells. **The names and the sentinel are gen5's**, so tide.js, the water mesh's `aBed` and the G_WET ground define work unchanged.
- `L.pocket` (Uint8): 1 for the zone's breathing pockets (the Black Water's clock), 2 for the Mere (forced, the boss's water).
- `L.vault` (Uint8): cells under thin, low vault, where icicles hang (the Ice Overhead).
- `L.keel` (Uint8): the footprints of the ice keels that reach the floor (blocked).
- `L.spots`: `sky` (skylights), `trail` (the First's marks), `hearths`, `lost`, `sailor`, `asger`, `lures` (Falselight posts), `braziers`, `heap`, `mere`, `wreckLamps`, `bells`, `casks`, `well`, `camp`, `npcs`.
- No `L.ice`, `L.thick` or `L.window`: there is no thin ice, so ice.js never runs here.

North to south:

**(A) The Rope (Το Σκοινί).**
- The camp at (56 ± 6, 18 ± 3), r 9, always dry: the rope's foot in a shaft of green light (a skylight of r 6), Tamarisk's brazier, a crate pile, the NPC spots for Glaukos and Tamarisk.
- The exit up, `{ to: 'farlight', label: 'exit.ropeUp' }`, at the rope.
- The arrival cine plays from here, looking south.

**(B) The Old Shore (Ο Παλιός Γιαλός).** West, x 6-46, z 30-84. The Saltborn's first landing, which the sea covered before anyone's memory and the Skotos uncovered when it drank.
- 4 to 6 stilt-hut frames lying on the sand (code from the rime `planks` layer, Act V's 'stiltHut'), 2 shacks (rime `shack`) on their sides, 3 keel-boats and rowboats (rime) beached at odd angles; the Sailor sits on the deck of one.
- **Hearth 1** on a dry rock at the shore's highest point.
- Dried kelp heaps (rime `kelp`, darkened) where the Sunken lie; two shallow basins (bed 0.45-0.75).

**(C) The Black Hollows (Οι Μαύρες Γούβες).** Centre and east, x 54-106, z 40-104. Three to five basins the Skotos has not drunk dry, between low rock ridges.
- **Bed:** `0.15·round((0.9·fbm(x·0.06, z·0.06) − 0.25 + 0.5·(1 − d/dRidge)) / 0.15)`, clamped to 0.15..0.9 inside each basin, `BED_DRY` outside. The basins flood from their centres outward.
- **Hearth 2** on a dry rock island in the largest basin, joined to the road by a dry spine 3 cells wide that the black water flanks (a hard check: the spine stays dry at full flood), plus a low-water causeway (bed 0.45-0.6) as a shortcut.
- Two Lost Lights lie toppled across basin rims, their lantern ends on dry cells.
- Two Falselight posts on basin rims (a dead lamp on a post, the lure's bait spot within 4 m).

**(D) The Keels (Οι Καρίνες).** South-west, x 8-52, z 98-126 (clear of the Heap's ring, whose north edge lies at z 125-131). The vault hangs low.
- 14 to 22 keels of ice reach the floor: blocked footprints of r 1-2.5 (`L.keel`), drawn as the shipped env rocks stretched tall in Act V's 'icy:' Instancer material, with rime icicles round their tops.
- Between them, skylights (r 3-5) and dense `L.vault` cells: the Ice Overhead's teaching ground.
- **Hearth 3** in a clearing among the keels.
- One Lost Light half-buried among them; Asger's keel (a keel of r 2 with a window face toward the path, his cold brazier at its foot).

**(E) The Wreck Heap and the Black Mere (Ο Σωρός των Καραβιών, η Μαύρη Λίμνη).** The boss arena, centred at (58 ± 6, 148 ± 3), r 20.
- **The wall:** a ring of piled wrecks, the rime `wreck` hull, keel-boats, rowboats and broken boats as blocked footprints from r 18 to r 20, with three gaps: north (the way in) and east and west, which close at `ketosWake` (map.close on a 3-cell plug each, like Act V's skerry).
- **The Mere** (`L.pocket` 2), r 10 at the centre: bed 0.45-0.6 across r 5-10, bed 0-0.15 in the core (r < 5). In mode `mere` its level is forced to 1.6, so all of it is deep (closed). In the fight's phase 2 it falls in three steps of 0.25 m to 0.85: the ring r 5-10 becomes wading mud (depth 0.25-0.4), the core stays deep. In mode `dry` it is at 0 and dry, and the Well's mouth (a blocked ring of r 2 with the exit) stands at its centre.
- **The shore,** r 10-18, dry sand and wreck ribs: three wreck lanterns at r 14 and 120° (Keyx's boat the nearest to the north gap), two ship's bells beside two of them, four whale-oil casks, the Ketos's lure-rock at r 6 in the water on the north side.
- The fourth Lost Light lies on the Heap's outer slope.
- **The Well (Το Πηγάδι):** in mode `dry`, the exit `{ x, z, to: 'bottom', label: 'exit.well', locked: 'ketosDown' }` at the Mere's centre, with the Ketos's neck lying across the bed from the core to the south shore as an arch (a blocked prop on 2 × 14 cells, passable under its middle third in the visual only; the walkable route goes round it).

**The main road** is always dry (`bed = BED_DRY`): the Rope → south along the Old Shore's east edge → round the Hollows' west side → through the Keels → the Heap's north gap. **The First's trail** runs on the road and on dry side paths to each hearth (a hard check).

**Over seeds.**
- **Retries:** seed + k·7919, 24 tries, the last accepted (gen4's and gen5's loop).
- **What varies:** every landmark's position within its range; the basin pattern and count; which hulls and keels stand where; the stilt-hut frames; the Lost Lights', the Sailor's, Asger's and the lure posts' spots; the keels' count and placement; the skylights; which of the three shore wrecks is Keyx's (always the nearest to the north gap); the dressing, from its own RNG after carving.
- **Height (`L.hgt`, visual only):** the cave walls 6 + 6·fbm, rising toward the map edge (the vault's sides, in the `iceWall` layer); pools −0.6 under the water; the Mere's bowl −1.0 at the core; the Heap's wreck ring +1 to +3.
- **Reach checks, after dressing** (the shared genlib/gen5 helpers `walkAt`, `refugeNear` and `bfs`):
  - **at h = 0 and at h = 0.9** (the Black Water's extremes), in mode `mere` with the Mere at 1.6: the entry reaches the camp, every hearth, every Lost Light's lantern, the Sailor, Asger's brazier, every lure post, the Heap's north gap, all three wreck lanterns, both bells and every NPC spot;
  - in mode `mere` with the Mere at 0.85 (phase 2): every shore lantern, bell and cask still reaches the others round the shore ring;
  - in mode `dry`: the Well's mouth from the north gap;
  - **hard failures:** any part of the First's trail on a non-dry cell; a hearth, lantern, bell, brazier, camp or exit on a non-dry cell; a dry pocket at h = 0.9 that is not connected to the camp unless it carries a `refuge` marker within 12 m; a keel closing the main road; the shore ring narrower than 6 cells anywhere;
  - every basin has a dry refuge of at least 3 × 3 cells within 12 m (tide.js's lane rule needs one);
  - `check-act6` also reports the mean tries per seed and lists a mean above 3 as a soft failure (Act V's rule).

ATMOS:
- **ATMOS.drained:** fog 0x060a10, density 0.030; sky 0x203040; ground 0x0c1014; hemi 0.55, its colour drifting slowly between green 0x7ad0a8 and white (the aurora through the ice, the shipped hemi drift of Act V's atmos tick); moon 0x7aa8a0, moonI 0.45; exposure 1.25; heroI 24, heroRange 9, heroColor 0xffe0b0 (the coal); zoom 1.0. `uAur` 0 (nothing reflects it).
- **ATMOS.drainedCine:** density 0.012, and the vault drawn (The look, row 4).
- **ATMOS.mere:** inside the Heap, density 0.034, hemi 0.45; the lure's cold point is the brightest thing in view until the lanterns burn.
- **FX ambient 'drained':** silt motes drifting down through the hero's light, slow drips from the vault onto pools (the shipped 'drip' emitter), breath puffs (Act V's).
HAZARDS:
- **The Carried Fire:** the dark drinks the hero's ring (the Lampbearers, the black water, the Falselights' snaps, the Ketos's lure).
- **True and false light:** the Falselights' pools and the Ketos's lure are bait.
- **The Black Water** in the Hollows and the Old Shore's two shallow basins; the Mere is the boss's.
- **The Ice Overhead:** icicle falls in the Keels and under every `L.vault` patch; skylights as safe light.
- **The Cold:** from wading black water, Black Flares and some hits; never from simply being there.
- **Icemaw lunges** from the deep black-water cells at high water.
SET PIECES:
- The arrival: a seabed under a green vault, ships sitting upright on the bottom, and one still light far to the south.
- The First's marks appearing in the ring of the hero's light, and fading behind her.
- Each hearth catching and trembling, and a woman in the memory taking a brand down into the ice.
- A toppled sea-light's lantern relit, lying on its side.
- The keels: a forest of ice reaching down to the floor, green light falling between them, a man asleep inside one.
- A ring of every boat that rowed to the wrong light; a neck like a mast rising out of the last of the sea.
- The Mere drunk dry in the middle of a fight, and a lantern still flickering in the mud.
GROUND/PROPS: **The 'silt' pack** (tools/pack-silt.mjs, `loadPack('silt')`; PACK_ORDER gains 'silt' last). The `rime` pack loads beside it and supplies most of the props and two of the layers.

| slot | layer | source | note |
|---|---|---|---|
| A | `silt/silt` | **new** (Poly Haven mud or wet sand, CC0, to verify) | the seabed; fallback `rime/shore` darkened |
| B | `rime/shore` | shipped (Poly Haven low_tide_rocks, CC0) | rock outcrops and ridges |
| P | `silt/silt` at a second scale and tint (`dual`) | (as A) | the road |
| W | `silt/iceWall` | **new** (ambientCG Ice003 or Ice004, CC0, to verify) | the vault's sides; fallback `rime/ice` at a larger scale |

**GROUND.drained** defines (the X6 flags, compiled per zone): G_WET **on** (the wet rim of a pool shows where the water will come, from `aBed` and `uWetLevel`, gameplay); **G_AUR, G_GLINT, G_WIN and G_EDGE off**. These four are the ground's costliest Act V extras (`coast-perf.md` §1: the windows' outline alone is 20-30 ms of the coast's 262 ms ground).

**Props:** rime `wreck`, `keelboat`, `rowboat`, `brokenBoat`, `towerA/B/C` (toppled), `anchor`, `sunkenAnchor`, `whale`, `kelp`, `barnacleRock`, `driftwood`, `cask`, `crate`, `oilLamp` (the wreck lanterns, the Lampbearers' lamps, the lure posts), `shack`, `icicle`, `coastCliff` and `rockFace` (world-projected walls, no texture cost). Code: stilt-hut frames, keels (env rocks in the icy material), hearth rings (Act V's cairn), braziers, the rope and winch, ship's bells (a lathe bell in the bronze material), Keyx's carved gunwale (a decal strip). New in 'silt': at most one prop, a bone pile (optional, Assets).

### bottom (37) Ο Πάτος των Πυλών / The Bottom of the Gates
LAYOUT: `genBottom(seed)` in gen6.js. The map is 104 × 168 cells, north at z 0 (the Well's foot), the Hearth at the south. `ZONES.bottom = { level: 37, music: 'bottom', ambient: 'bottom', atmos: 'bottom', act: 6, pack: 'silt', light: 'deep', ring: 4.5 }`. Two modes, from `bottomMode()`: `dark` (before `firstLit`) and `lit` (after).

**The trick that makes this zone cheap:** two of its three places are made by the generators the Shadow Gates already use.
- `stamp(L, sub, x0, z0, o)` (new, about 80 lines in gen6.js) copies a sub-layout's cells, paint, spots and props into a window of the parent map and remaps its props.
- The sub-layouts are `genCrypt(seed ^ 0xB0770, { rooms: 5, mh: 30 })` and `genForest(seed ^ 0xF0E57, { w: 40, h: 68 })` (gen.js:211, :64).
- Their props are Act I's, boot-loaded, under a 'drowned' Instancer grade: black-blue, roughness 0.3, a rime tint on top faces.
- So the Bottom literally contains the places every Gate copies, and costs no new model.

North to south:

**(A) The Well's Foot (Η Ρίζα του Πηγαδιού).** The camp at (52 ± 4, 12 ± 2), r 8, dry: the Well's foot (exit up `{ to: 'drained', label: 'exit.well' }`), an old Saltborn fire-pit (lit from the Cradle on arrival), Glaukos's spot. The arrival cine plays here.

**(B) The Drowned Barrow (Ο Πνιγμένος Τύμβος).** West, a 40 × 68 window at x 4-44, z 22-90, stamped from `genCrypt`.
- Its two lowest rooms take black water (bed 0.3-0.6), its corridors stay dry.
- Gate-Fallen packs among Act I's dungeon kit, rimed.
- **The ember's hollow:** a dead-end side room of the stamp (the crypt's smallest leaf room), its far wall a pane of clear ice with the ember in it (a code sprite, 0xff5a2a, pulsing slowly).
- **Black lamp 1** at its south door, with the Gate-Fallen Captain.

**(C) The Drowned Wood (Το Πνιγμένο Δάσος).** East, a 40 × 68 window at x 60-100, z 22-90, stamped from `genForest`.
- Black water across most of its floor (bed 0.3-0.75), so the wood floods at the breath's high; its trails stay dry.
- The forest's trees in the drowned grade with their leaf meshes left out (if the kit cannot drop leaves, the shipped dead trees of the Field's corridor dressing stand in; checked in the world viewer).
- **Leif's clearing** (a dry clearing of r 4 off a trail, a dead campfire) and **the garland glade** (a dry clearing of r 5; 8-12 code garlands, torus rings of 24 triangles in a dried-flower tint, hung on its trees).
- Falselight lure posts on two trail bends.
- **Black lamp 2** at its south end, with a Falselight matriarch.

**(D) The Forgotten Village (Το Ξεχασμένο Χωριό).** Centre, x 28-76, z 94-128.
- 6 to 8 Act I village houses (village.glb, boot) tilted 4-12° and sunk 0.3-0.8 m (a visual y offset; their footprints block as usual), a sunken well in the square, fences, carts.
- The Faded go about chores no one remembers: dormant actors with a chore idle clip (`chores`, built on the shipped dormant wake and the Avatar `idle` option the NPCs use, actors.js:548) who wake when the hero's light touches them.
- **Black lamp 3** in Keyx's hand at the square's well, with a Faded Elder and a Lampbearer. A pocket of black water (bed 0.3, r 4) beside the well, which Keyx walks into.

**(E) The Shadow Stair (Η Σκάλα των Ίσκιων).** z 128-146, the full width narrowing to 14 cells.
- Four terraces, each drawn 1.2 m lower than the last (visual height; the walkable floor stays at y = 0).
- Its head is closed by three shadow-walls, one band of 3 × 14 cells per lamp, opened in turn as each lamp goes out (`map.open`, the slag plug's pattern; opened from flags on every entry).
- Two pools on the terraces (r 2.5, bed 0.6) where the Hands rise.

**(F) The First's Hearth (Η Εστία της Πρώτης).** The arena, centred at (52 ± 4, 156 ± 3), r 15.
- A dry rock bowl. At its centre, the First's stone and fire (a blocked 2 × 2), the First asleep beside it.
- **Four hearthstones** on the diagonals at r 9: true lamp lights of r 4 when lit (1 s touch «Άναψε την πέτρα»), the fight's light sources.
- **Seven named lamp niches** in the rim at r 14, one for each of the Lost (four lights, three people): each one the hero freed burns as a true lamp light of r 3 for good, its name cut under it (a decal in the shipped name-stone style). The Shade never snuffs them.
- **Two black pools** of r 4 at the north-east and north-west rims, where the Hands rise and the Skotos rises in the naming cine.
- **`L.vault` patches** over the east and west thirds, for the troll form's icicles.
- **The Gate ring** on the south rim: Act I's 'gate' prop (build.js:869) at ×2.2, dark until `firstLit`, then warm, with the exit `{ to: 'town', at: 'staff', label: 'exit.gateUp', locked: 'firstLit' }`.

**Over seeds.**
- **Retries:** the same loop; a stamped sub-layout that fails its own reach is redrawn with seed + 1 (genCrypt and genForest are deterministic and already pass their own checks in the Gates).
- **What varies:** the crypt's rooms and the forest's trails (from their own generators), the ember's room (the stamp's smallest leaf), Leif's clearing and the glade (two dry clearings the forest offers, nearest and farthest from the window's door), the village's houses, the Stair's pool spots, the Hearth's centre within ±4, the dressing.
- **Height (visual):** the walls 8 + 8·fbm; the terraces −1.2, −2.4, −3.6 and −4.8; the Hearth bowl at −4.8 with its rim rising +2 to the walls.
- **Reach checks:**
  - at h = 0 and h = 0.9, with the shadow-walls closed: the camp reaches all three lamps, the ember's pane, Leif's fire, the glade and Keyx's spot;
  - with each wall opened in turn (simulated with map.open): the Stair and the Hearth's four stones, its seven niches, its centre's ring of cells and the Gate ring are reachable;
  - **hard failures:** a lamp, a hearthstone, a niche, the camp, Leif's fire, Keyx's spot or an exit on a non-dry cell; a stamped window whose door does not meet the parent's road; the Gate ring not reachable from the centre.

ATMOS:
- **ATMOS.bottom** (before `firstLit`): fog 0x040508, density 0.036; sky 0x141822; ground 0x0a0b0e; hemi 0.40; moon 0x6a8090, moonI 0.25; exposure 1.3; heroI 24, heroRange 9.
- **ATMOS.hearthDark** (the Shade's form 4): hemi 0.25, moonI 0.1, through the shipped `mixAtmos` easing over 2 s; the Hearth's fire, the lit stones and the named lamps are the light.
- **ATMOS.bottomLit** (`firstLit`; the zone is rebuilt in mode 'lit'): fog 0x0e0a08, density 0.028; hemi 0.6 drifting warm 0xffc890; exposure 1.2. The Faded stand still and fade out; the black water stays low.
- **FX ambients:** 'bottom' (black motes rising slowly toward the vault: "the forgotten"); 'thaw' after `firstLit` (warm motes, drips).
HAZARDS:
- **The Carried Fire** throughout; the black lamps' Black Flare.
- **True and false light:** the Falselights in the wood; the black lamps and the Lampbearers.
- **The Black Water** in the barrow's low rooms, across the wood, in the village's pocket, and in the Stair's and the Hearth's pools.
- **The Ice Overhead** over the village square and the Hearth's east and west thirds.
- **The Hands of the Skotos** on the Stair.
SET PIECES:
- A barrow, a wood and a village you know, black and wet at the bottom of the world.
- The Faded at their chores, waking one by one as your light reaches them, and one face among them.
- A man handed his own lantern, walking into the black water.
- A black lamp going out and its stolen light pouring back into your Cradle; a shadow-wall thinning away.
- Your own shadow standing up behind you at the Hearth, with your lamps of names round the rim.
- Her fire flaring white-gold, a woman of black ice lifting her head, the dark rising at the water's edge to hear a name, and sinking like something falling asleep.
- The Gate ring waking warm.

### The look: what each image costs
The engine renders one scene straight to the screen, with no render targets, no depth texture and no post-processing (gfx.js `render()`). Phones run at a pixel ratio of 1.5 or less, with adaptive resolution down to 0.55. **Every image below has a quality-0 path, built first**, and almost every one is a shipped program with defines switched.

The new work lives in **src/world/build6.js** (act6Prop and act6Level, about 500 lines). build.js gains only hooks (`ground6`, the ACT6 set and the X6 defines), and sea.js gains two defines.

| # | image | how it is made | from | phone cost | quality 0 | risk |
|---|---|---|---|---|---|---|
| 1 | **A dry seabed** with wet rims round the pools | groundMat with the 'silt' layers and the X6 defines (G_WET only) | build.js `ground5` pattern → `ground6` | below the coast's ground: no vertex aurora, no glint, no window outline, no edge | G_WET off | None |
| 2 | **Black water** that rises and falls in pockets and the Mere, dark, with a pale edge where the hero cannot wade | sea.js `buildSea` over the pocket and Mere cells only, with a new define SEA_BLACK: no aurora reflection, no light paths, no moon glint; the depth colour step at 0.45 m and the edge line kept (they are gameplay) | sea.js (shipped) | 1-2 fetches; ≤ 10% of the view in the Hollows, ≤ 25% in the Drowned Wood at the high, ≤ 30% at the Mere before phase 2 (the coast: 30-60%) | 1 fetch | Low |
| 3 | **Skylights:** green-white light falling through thin vault | a light pool (decal, `addLightPool`, lamp light) + 30 slow motes in a column (fx) + the hemi drift | light.js, fx.js | a decal, a few particles; **no PointLight** | motes off | None |
| 4 | **The vault** in cinematics only | one quad of 120 × 180 m at y 14 in Act V's opaque ice program with a new define ICE_VAULT (no crack texture, no shade, no glows; the aurora term along the view ray, as the ice already does), hidden while the camera pitch is above 0.4 | sea.js `buildIce` | only in cines | flat dark ice colour | Low |
| 5 | **Icicles falling** | forge.js `slag()` (forge.js:136) parameterised: a white teleCircle, a rime `icicle` instance falling from y 9, a shatter of the shipped ice-shard emitter, a shard prop left on the cell | forge.js, fx.js | trivial | same | None |
| 6 | **The Carried Fire's ring** shrinking and growing; a pulse when low | the shipped Cradle ring decal (light.js Cradle slot), its radius driven by the meter | light.js | 0 | same | None |
| 7 | **True light trembles:** hearths, braziers, stones, lanterns, fires | every true light pool's radius and intensity × (1 ± 0.12) at 6-10 Hz (two summed sines with a per-light phase), warm 0xffc070-0xffe0b0, 3-6 sparks; its loop sound with a 5 Hz vibrato | light.js `addLightPool` gains `flicker`; fx.js sparks; audio.js | one uniform a pool | sparks off; flicker kept (it is gameplay) | None |
| 8 | **False light is dead still:** black lamps, Lampbearers' lanterns, the Falselights' lures, the Ketos's lure | a pool with `fake: true` (light.js): fixed radius, a hard rim (one smoothstep narrowed), cold 0xd8e0ff (the lures) or a black core with a 0x8a70ff rim (the dark's lamps), no sparks, a pure sine tone | light.js, fx.js, audio.js | as a pool | same | None |
| 9 | **The First's marks,** seen only in your light | 60-120 decal quads from the shipped decal pool, alpha × smoothstep on the distance to the hero against `uFireR` | fx.js decals | one varying | same | None |
| 10 | **The Faded,** barely there outside light | Act IV's shroud look (ai.js:177) pushed to 0.12 opacity outside light + Act V's 48 instanced footprints on their path + breath puffs | ai.js, fx.js | as Act IV | footprints off | Low (readability: Risks) |
| 11 | **Black lamps and shadow-walls** | a dark-cored sprite in an iron cage (code); the wall is 40 dark alpha particles over the band plus a dark decal strip | build6.js, fx.js | in pool budget | particles halved | None |
| 12 | **The Ketos** rising from the Mere, its lure a point of steady light | the Pistosaur build (Assets) under the shipped creature program; the lure a bone chain (3 instances) with a glow sprite and one pooled PointLight while it is the nearest light | creatures.js, fx.js | a boss model and one pooled light | the lure's light off (sprite kept) | Low |
| 13 | **The Shade's skin** on every form | Act V's `skotosSkin` onBeforeCompile patch (fresnel rim, pale flecks) on the borrowed models; `extras.keepMat` already exempts it from `prepare()` (creatures.js:69-71) | sea.js, creatures.js | 1 fetch on the boss only | fresnel only | Low |
| 14 | **Her fire flaring** and the Gate ring waking warm | the shipped brazier fire and ember emitters at ×2; the Act I gate prop with ember motes | fx.js, build.js | one pooled PointLight | same | None |
| 15 | **Seven fires catching on the peaks** (home cine) | six more `farFire` sprites (FAR_BEACONS 7-12), each scaled up from 0 over 0.6 s with the low bell | world.js `farFire` (shipped) | six sprites | same | None |
| 16 | **Breath, drips, silt and black motes; garlands; the blue bird** | fx ambients inside the shipped pools (1,200/2,400/3,500 additive; 500/1,000/1,600 alpha); garlands as instanced tori; the bird a 12-triangle code mesh on a spline | fx.js, build6.js | in budget | pool sizes already scale | None |

**What this deliberately does not do:** draw a ceiling in play (the camera never sees one); any full-screen water; reflections of anything; height for actors; thin ice (no ice.js, no crack texture, no `i` co-op topic); beams sweeping the floor (the act's light stands still, trembles or is carried); the aurora as a sky in play; any new full-screen transparent layer.

**Why an underground act runs cheaper, with the numbers we have.** All of these are SwiftShader measurements from `coast-perf.md`, the same renderer the gate uses:
- **perf5** (q1, mobile emulation): the Field of Ash 633-665 ms per cycle; the coast 720-816 ms, 1.11-1.19 of the Field; the coast at low water 0.94-1.02; **the Farthest Light 0.92-0.99**. The ice zone, with no sea, already passes.
- **The bench split** at the coast's worst spot (the Dalarö at water 1.2): a frame of 632 = ground 262 + sea 158 + everything else ≈ 212. The coast's excess is its ground at the full define set and its sea over 30-60% of the screen.
- **The Drained Sea removes most of both:**
  - the sea term shrinks with its coverage (≤ 10% of the view in the Hollows, ≤ 30% at the Mere for one fight) and its program (SEA_BLACK is close to the water's q0 path);
  - the ground loses the window outline (20-30 ms), the vertex aurora (about 3 ms of its 20 ms of vertex work) and the glint.
  - Estimate: **0.85-0.95 of the Field** at q1. It is an estimate until perf6 measures it at the end of stage A.
- **Gate by `#define`, never by a uniform branch.** `coast-perf.md` §3 found that SwiftShader works out straight-line arithmetic inside an `if` on every lane, so a uniform-gated branch saves nothing there; only a loop no lane enters is skipped. Every Act VI saving is therefore a define chosen per zone (the X6 flags), compiled into its own program. On a real phone GPU those branches would also save, but the gate is SwiftShader's.
- **Lights:** at q1 the hero's Cradle and the two nearest fires own the three pooled PointLights (gfx.js:21,74). Every other hearth, brazier, skylight and lamp is a decal pool and an emissive sprite; the tremble is on the pool's uniform, not on a light. The per-pixel lights' loop (with its shadow taps) is the body SwiftShader does skip when it is short, so a dim underground scene keeps it short.
- **Overdraw:** beyond the cave walls is the clear colour, so nothing is shaded there; the walls' tops are one layer; no transparent layer covers the screen.
- **CPU:** no ice.js tick (its per-frame load loop over thin cells within 30 m is gone); tide steps touch only the pocket and Mere cells (≤ 1,100 per zone, against the coast's tidal band), at most one step every 4.5 s (one a second inside a boss's arena); actors stop thinking past 38 m as shipped.

**The perf gate, perf6.** It measures frame time at quality 1 under mobile emulation (pixel ratio 1.5, MSAA, adaptive resolution pinned at 1.0, the scale it would have chosen reported beside it) at the act's three worst spots, against the Field of Ash measured the same way:
- the Black Hollows at full black water with about 25 actors;
- the Black Mere in the Ketos's phase 1, with four Ketlings, three lanterns and the lure;
- the Hearth during the Shade's form 2, with webs, two Hands, four lit stones and seven named lamps.

It passes when all three are **within the Field's frame time × 1.00** (Act V's bar was × 1.15). Quality 0 is measured as a floor. It runs at the end of stage A with stand-in packs, and again before the bosses are built (stage B's gate). Because SwiftShader shades hidden fragments and a real GPU may differ either way, the gate also asks for **the owner's phone check** of the three spots (HANDOFF: "ask the owner how the coast runs on a phone").

## Enemies
**The Faded.** Act VI's humanoid family name is «Ξέθωρος» / "Faded" (after the Ashbound, the Rootsworn, the Ash-Fallen and the Sunken). They are people the world forgot, whom the Skotos covered and sent down to lie still at the bottom. They have no faces and no names, and outside light they are barely there.

**What carries over, and how.** Act VI defines no global trait change, so Act V plays exactly as it ships:
- the shipped trait `unlit` (Act V: lamp light keeps them from waking or rising) keeps its meaning;
- the new zone light kind **'deep'** (light.js) adds one rule there: **every `unlit` creature is Shrouded** (Act IV's rule, combat.js:243: ×0.3 damage taken outside light, Revealed for 3 s by a hit inside light);
- so the Sunken, the Lice, the Faded and the Falselights become harder in the dark only in Act VI zones, and **the Carried Fire's ring decides how much of a pack you can really hurt.**
- **False light counts as light for nothing** (Mechanics): a foe standing in a Falselight's pool or by a black lamp is still in the dark.

**Every enemy owns one verb that touches a system:**
- the Lampbearer drinks the hero's fire (the Carried Fire);
- the Faded are unseen outside it, and stop to listen when the names fall (the Carried Fire, the Names from Above);
- the Gate-Fallen rise again unless they fall in light or under ice (the Carried Fire, the Ice Overhead);
- the Falselight fakes a light pool (true and false light);
- the Icemaw hunts only when the black water is high (the Black Water);
- the Lice drop from the vault (the Ice Overhead);
- the Sunken wake with the black water (the Black Water).

**No name begins with "Frozen"** (the elite affix «Παγωμένος»). **Every `radius` is a pre-scale value**, as in every shipped def (actors.js:146, :163).

**New traits** (ai.js, about 220 lines in all):
- `drinker` { rate, t, back }: a tether channel that shrinks the hero's ring;
- `unseen`: 0.12 opacity and no health bar outside light; auto-aim and the nearest-target helper prefer a lit foe within range and fall back to an unseen one, never skipping it (Decisions);
- `lightRest`: a creature with the shipped `rises` that dies inside true light, or under a fallen icicle, stays down;
- `listens`: while the names fall (Mechanics) it stops for 3 s with its face up, Revealed, once per window;
- `lure` (an AI, from 'burrow''s ambush): a false pool as bait, a snap, a retreat;
- `snuffLamp` (the Ketlings): walks to the nearest lit true lamp and gnaws it out in 1 s, **never while a hero stands in that lamp's light** (the Gleaner's rule, passed on);
- also new: the hull-louse's burst kind 'vault' (lice drop from a vault cell), beside the shipped 'hull' and 'ice'.

**Packs** (data.js PACKS, PACK_LEAD, PACK_DORMANT):

| tag | where | kinds (weights) | lead | notes |
|---|---|---|---|---|
| blackCrew | the Hollows, the Old Shore's kelp | sunken 4, lampbearer 1.5 | lampbearer | dormant `tideWake` on the black water; 4-6 |
| shoreFaded | the Old Shore | faded 3, sunken 1 | | 4-5 |
| keelLice | the Keels | hullLouse | | burst 'vault' from `L.vault` cells; 5-7 |
| poolHunter | the Hollows, the Drowned Wood | icemaw 1, hullLouse 2 | icemaw | the Icemaw surfaces only at high black water |
| heapLice | the Wreck Heap's outer slope | hullLouse | | burst 'hull'; 5-7 |
| lures | the Hollows' rims, the Keels, the Drowned Wood's trails | falselight 2-3 | | at a dead lamp post; ambush |
| gateFallen | the Drowned Barrow | gateFallen 4, gateFallenBow 2 | | dormant 'bonePile' (the shipped skeleton wake) |
| drownedWood | the Drowned Wood | faded 3, falselight 1 | | 4-5 |
| forgotten | the Forgotten Village | faded 4, lampbearer 1 | | `chores`: dormant at their chores until the hero's light touches one |
| stairCrew | the Shadow Stair | sunken 3, lampbearer 1 | | with the Hands (nodes, at most 2) |

- `PACK_DORMANT`: blackCrew, gateFallen, forgotten.
- The champion stand-in for big kinds in Act VI zones (world.js:286) is `sunken`.
- The black lamps' guards are the places' champion packs: a Gate-Fallen Captain (rare gateFallen), a Falselight matriarch (rare falselight, ×1.25 scale, with 3 lures), a Faded Elder (rare faded).
- **Packs stay for farming** in every state, at the same counts: heroes reach Act VI near the cap, and these zones are their first Mastery farm.

### sunken Θαλασσόπνικτος / Sunken (new=False)
ROLE: The rank and file, reused unchanged from Act V: the dead the sea took, lying under dried kelp on the Drained Sea's floor and on the Stair.
BEHAVIOUR: As shipped (melee AI, the boat-hook pull every third blow, `tideWake`, `tideborne`, `swim`, `unlit`). In Act VI zones `tideWake` reads the Black Water's level exactly as it reads the tide (it is the same clock), and the 'deep' light kind Shrouds them. The Harpooner is not used: there is no thin ice or open sea to reel the hero into.

**Data:** as shipped (hp 1.4, dmg 1.2, speed 3.4, radius 0.5, xp 2).
ASSET: {"source": "existing", "title": "frost.glb 'sunken' (Quaternius people re-proportion, shipped in Act V)", "author": "Quaternius", "license": "CC0", "notes": "No change, no download."}

### lampbearer Θαλασσόπνικτος Λυχνοφόρος / Sunken Lampbearer (new=True)
ROLE: A Sunken that carries the Skotos's lantern, a light that does not flicker. It drinks light: the Carried Fire's enemy, and the reason to kill the support first, as the Ashsmith and the Ice Singer were. The Drained Sea, the Village, the Stair.
BEHAVIOUR: The shipped 'tether' AI (the Mourner's interruptible channel, ai.js:743: keeps 7-9 m, backs off under 4.5 m) with the new trait `drinker`.

**Drink.**
- **Tell:** 0.6 s, its lantern's cold flame turns black and a dark line runs to the hero, with a low draw of breath.
- **Channel:** 2.5 s. The hero's ring shrinks by 0.5 m/s (× the difficulty's coal drain) and the lantern brightens as it fills.
- **Broken by** any hit worth 6% of its life, a stun or a freeze; it never drinks while the hero stands in true lamp light (a hearth, a lit stone, a skylight, a wreck lantern).
- **Killing it** pours back everything it drank, plus 1 m.
- Cooldown 7 s. With two Lampbearers on her, the drains add.

**Its blow** when cornered: the lantern swung, teleCone 2.2 m, 0.8 s, 0.9×, Cold +8.

**Data:** model 'sunken', hp 1.1, dmg 0.9, speed 3.6, radius 0.48, ai 'tether', reach 9, atk 'cast', atkTime 2.5, flesh 'drowned', xp 2.2, weapon 'blackLamp' (code: the rime `oilLamp` at the right hand with a dead-still black-violet flame), style 'none', animSet 'singer' (the shipped Ice Singer clips: Spell_Simple_Idle_Loop, KK_Spellcasting), wake as the Sunken's, tideWake, unlit, drinker { rate 0.5, t 2.5, back 1.0 }, look { scale 1.02 }.
ASSET: {"source": "existing-model-retint", "title": "frost.glb 'sunken' with the rime pack's Vintage Oil Lamp in code", "author": "Quaternius; Monsta3D (Poly Haven)", "license": "CC0 1.0 (both)", "notes": "No new scene and no new texture: the lamp is the rime pack's `oilLamp` (its glass is the material `glow`, which build5.js lights; here its emissive is set dark violet and a dark sprite sits in it, with no flicker). Read: a Sunken that walks upright, holding a lantern low at the hip until it drinks, so it never reads as the Harpooner (who holds a harpoon high). Stand-in: 'villager0' tinted grey-green, as the Sunken's."}

### faded Ξέθωρος / Faded (new=True)
ROLE: The forgotten: people the world no longer remembers, faceless and dim. Outside light you see only their footprints in the silt and their breath. The Old Shore, the Drowned Wood, the Forgotten Village (where they are found at their old chores).
BEHAVIOUR: The shipped 'melee' AI with the new traits `unseen` and `listens`, and `chores` in the village (the shipped dormant wake with a chore idle clip).

**Unseen.**
- Outside light (the hero's ring, any true lamp light, fire areas) a Faded is drawn at 0.12 opacity with Act IV's shroud look and has no health bar. Its footprints (Act V's 48 instanced footprint decals) and its breath puffs show where it walks. Auto-aim prefers a lit foe, but never skips a Faded.
- Inside light it is solid, targetable and Shrouded like any `unlit` creature.
- So the ring's radius is how far you can see them, and a dimming Cradle lets them close in.
- A first-time hint hint.unseen.

**Listens.** While the names fall from above (Mechanics), every Faded in the Drained Sea stops for 3 s, lifts its veiled face toward the ice and is Revealed (×1.25) and solid wherever it stands, once per window.

**Chores.** In the village each stands at a chore (sweeping, drawing water, mending a net: TreeChopping_Loop, Fixing_Kneeling, Idle_Rail_Call, all in moves.bin) and wakes when the hero's ring touches it, or when a pack-mate wakes.

**Combat.** A grasping two-handed blow (Punch_Cross), reach 1.8, atkTime 1.2. Every third blow is a **Forgetting Touch**: teleCone 2.0 m, 0.7 s, 1.1× and the hero's ring −0.5 m. It is the Faded's small share of the drinking.

**Data:** model 'faded' (CAST → people.glb 'villager0', 'villager1' or 'villager2', picked per spawn), hp 1.2, dmg 1.1, speed 4.4, radius 0.48, ai 'melee', reach 1.8, atk 'grab' (Punch_Cross), atkTime 1.2, flesh 'spirit', xp 1.8, animSet 'undead' (Zombie_Walk_Fwd_Loop, Zombie_Idle_Loop), unlit, unseen, listens, chores (village packs only; wake { d: the hero's ring radius }), look { tint 0x1a1c24, tintAmt 2.2, rim 0x8a9ab8, rimI 0.3 }, with a code veil over the head (models.js veilParts, grey).
ASSET: {"source": "existing-model-retint", "title": "people.glb 'villager0'-'villager2' (boot-loaded)", "author": "Quaternius", "license": "CC0", "notes": "No new scene and no new texture: a runtime tint above 1 drains the colour first (people.js:89-91), then darkens; a code veil hides the face. Never 'warden', 'ranger' or 'mage' (the player classes' bodies), so no hero meets her double here; that is kept for the Shade's last form. Read check in the people viewer beside the Sunken, the Lampbearer and Keyx: the Faded are dry, dim and veiled; the Sunken wet and green-grey; Keyx has a face."}

### gateFallen Πεσμένος των Πυλών (και Τοξότης των Πυλών) / Gate-Fallen (and Gate-Fallen Bowman) (new=True)
ROLE: What fell in the Shadow Gates comes to rest at their bottom: rimed skeletons of the barrows' dead, the Gates' commonest foe. The Drowned Barrow, the Shade's first form's summons.
BEHAVIOUR: The shipped skeleton and skeleton-archer defs (melee and ranged AIs, the `rises` trait: they get up again a few seconds after they fall) with the new trait `lightRest`.

**Rise again, unless.** A Gate-Fallen that dies **inside true light** (the ring, a lamp, a fire), **or under a fallen icicle's shard**, stays down. One that dies in the dark rattles back up 4 s later at half life, once. So you fight them in your light, or drop the vault on them.

**Data:**
- gateFallen: model 'skeleton', hp 0.9, dmg 1.0, speed 3.8, radius 0.45, ai 'melee', reach 1.6, atk 'slash1', atkTime 1.1, flesh 'bone', xp 1.3, weapon 'sword', style 'undead', sfx 'skeleton', rises, lightRest, unlit, wake { d: 6, clip: 'rise', pose: 'bonePile', sfx: 'skeletonRattle', t: 2.0 }, look { tint 0xb8d0e0, tintAmt 0.5, rim 0xc8e0ff, rimI 0.2 }.
- gateFallenBow: model 'skeletonArcher', hp 0.7, dmg 0.9, speed 3.6, radius 0.45, ai 'ranged', reach 11, atk 'shoot', atkTime 1.7, flesh 'bone', xp 1.3, weapon 'crossbow', style 'bow', proj 'arrow' (a frosted arrow look), rises, lightRest, unlit, same wake and look.
ASSET: {"source": "existing", "title": "skeleton.glb (boot-loaded, Act I)", "author": "as credited in CREDITS.txt (Act I)", "license": "as shipped (CC0 / CC-BY 4.0, credited)", "notes": "No download, no new texture: a runtime rime tint. Boot-loaded, so they cost no memory at all."}

### falselight Δολοφέγγης / Falselight (new=True)
ROLE: A pale cave scorpion the size of a dog that holds its tail high with a cold, steady light at the tip, like a lamp on a pole. It sits in the dark beside dead lamps and waits for someone who wants light. The act's teacher, its proverb with legs. The Hollows' rims, the Keels, the Drowned Wood.
BEHAVIOUR: A new ai 'lure', built from 'burrow''s ambush (ai.js) and the light system.

**The false pool.**
- At rest it hides in the dark (its body Shrouded and drawn dim) and its tail-light throws a pool of r 3 on the floor beside a dead lamp post.
- The pool is a `fake` pool (light.js): steady, cold white-blue (0xd8e0ff), a hard rim, no flicker and no sparks, and a faint pure tone. **It counts as light for nothing:** it never refills the Carried Fire, never warms, never Reveals, and never keeps an `unlit` foe from waking.
- One-time hint on the first false pool: hint.flicker.

**The snap.**
- A hero who stands inside a false pool for 0.8 s triggers it. The pool's rim turns sea-green (the act keeps Act V's colour for a pull) for a 0.8 s tell.
- Then the Falselight strikes from the dark with its tail: 1.3×, the hero's ring −1 m, and a pull of 2 m toward it (`pl.pull`, stopping at the first deep cell or wall). A roll during the tell escapes.

**Revealed by true light.** A true lamp within 4 m, the hero's ring touching it, a War Cry flare, or any hit inside light shows its body (Revealed 3 s, ×1.25), and its lure gutters out for 3 s. While its lure is out it flees to the dark and sits still for 2 s, then lights it again.

**Combat** once revealed: claw pinches (reach 1.6, 0.8×) and the tail sting (reach 2.4, teleLine 2.4 × 0.8 m, 0.7 s, 1.2×).

**Data:** model 'falselight', hp 1.2, dmg 1.3, speed 4.6, radius 0.55, reach 2.4, atk 'sting', atkTime 1.1, flesh 'chitin', xp 2.4, sfx 'spider', ai 'lure', unlit, lure { r: 3, bait: 0.8, tell: 0.8, pull: 2, drain: 1.0 }, look { scale 1.6, tint 0xd8d4cc, tintAmt 0.7, rim 0xd8f0ff, rimI 0.25 }. The matriarch: rare, ×1.25 scale, a pool of r 4.
ASSET: {"source": "sketchfab", "uid": "4c0fd62d33ab4d2592ee0a1d985a480d", "url": "https://sketchfab.com/3d-models/scorpion-4c0fd62d33ab4d2592ee0a1d985a480d", "title": "Scorpion", "author": "anthonyvanoo (anthonyvanoo)", "license": "CC Attribution 4.0 (to verify on the download page)", "faces": 7290, "animations": 5, "notes": "Scouted for Act V (assets.json, verdict ok): 'made for the game All That's Left (own work)'. Rigged, 5 clips.\n\n**Provenance gate at stage 0, before download** (to verify): re-read the licence on the download page; a reverse-image search of the thumbnail; a storefront check (Fab, CGTrader, Unity Asset Store) and a check that the game it was made for does not sell or claim the model; results saved beside the source in /tmp/claude-0/sf/act6. **Any doubt takes fallback 2 from the start** (Decisions).\n\n**Build** (tools/creatures/act6/falselight.mjs): keep 7.3k faces (already a phone budget); keep its 5 clips and add in lib.mjs idle-lure (tail high, still), snap (tail strike from rest), flee, hit, die (curl); regrade the texture to pale bone-grey with a faint translucence at the tail joints; 512 base, 256 normal. The lure is code: a glow sprite at the tail tip and the false pool disc.\n\n**Fallback 1** (to verify): the .hapto 'Pseudoscorpion' (60a474f1f87040f38e073f87a63b7548, CC-BY 4.0, a Senckenberg Museum scan, 2 clips), decimated 51k → 6k, with a code tail-stalk. **Fallback 2 (no download):** spider.glb (boot-loaded) at ×0.8, regraded pale, with the same code lure on a stalk from its abdomen (our own build, no licence question). STAND_IN falselight → ['spider']."}

### hullLouse Σκαροψείρα / Hull-louse (new=False)
ROLE: Reused unchanged from Act V. In the Keels they drop from the vault; on the Heap they burst from hulls.
BEHAVIOUR: As shipped (burst, curl and bowl, swim, unlit), plus the burst kind 'vault': the pack waits in the vault over an `L.vault` patch and drops when the hero comes within 6 m (a white teleCircle r 2, 0.8 s, and a patter of falling grit), 0.5× each on landing. A bowled louse that crosses a deep black-water cell sinks harmlessly.

**Data:** as shipped (hp 0.32, dmg 0.5, speed 6.0, radius 0.38, xp 0.6).
ASSET: {"source": "existing", "title": "louse.glb (Act V; CC0 Giant Isopod scan)", "author": "ffish.asia / floraZia.com", "license": "CC0 1.0", "notes": "No change."}

### icemaw Παγολόχος / Icemaw (new=False)
ROLE: Reused unchanged from Act V: the leopard seal hunts the black water.
BEHAVIOUR: The shipped 'lurker' AI. Its holes are the deep black-water cells (h − bed ≥ 0.45). **At low black water there are none, so it lies up and does not hunt:** it is the Black Water's predator, and its menace follows the breath. Under the black water its shape is the water's dark trail (Act V's open-water tell). It cannot surface inside true light; false pools do not deny it.

**Data:** as shipped (hp 2.2, dmg 1.5, speed 2.0 / 7.0 under, radius 0.6, scale 1.6, xp 3).
ASSET: {"source": "existing", "title": "icemaw.glb (Act V; Leopard Seal by Grace Belt)", "author": "Grace Belt (neatGrace)", "license": "CC-BY 4.0", "notes": "No change; already credited."}

### ketling Κητόπουλο / Ketling (boss add)
ROLE: The Ketos's young, crawling out of the Mere to put out the lanterns.
BEHAVIOUR: 'melee' with `swim` and the new `snuffLamp`: each makes for the nearest lit wreck lantern and gnaws it out (1 s; relight with a 1 s touch). **It will not gnaw a lamp while a hero stands in that lamp's light**: it turns on her instead. So the hero defends a lantern by standing in it, which is where phase 1 wants her anyway.

**Data:** model 'ketos' at ×0.6 (no separate asset), hp 0.8, dmg 0.6, speed 4.0, radius 0.4, reach 2.0, atk 'bite', atkTime 1.0, flesh 'flesh', xp 1, swim, unlit, snuffLamp: 1.

**Out of the base:** a Faded Keeper (a Faded with a dead sea-lantern), ambient fish skeletons, a swimming eel.

## Bosses
Both fights keep Act V's phone rules and the Act IV fix's lessons:
- **At most two big telegraphs at once,** and the environment's own warning (the Mere falling, the vault's icicles, a Black Flare) always counts as one of them.
- **Telegraph durations never change with difficulty.** Difficulty scales damage, cooldowns and adds.
- **Every phase has one thing to do besides hitting,** and Glaukos says it once, by ear.
- **Exactly one boss actor at a time,** so `G.bossActor` and the single boss bar work as they are. The Ketos's lure stalk is a 'node' actor; the Shade's forms are swapped, never stacked.
- **One vulnerability at a time** (Act V's rule, Mechanics). A boss caps at ×1.6 outside its one scripted window per phase.
- **Every hold has a floor and a clock** (`integrate.md`: damage struck during a hold still lowers its life to a floor; each hold ends by itself in 25-40 s).
- **A retry checkpoint near each boss,** saved in `flags.cp6` like cp5: the Heap's north gap; the Stair's foot.

**Time-to-kill bands** (Decisions), asserted by the `ketos` and `shade` scenarios and measured with tools/balance-act.mjs extended to Act VI:
- **The Ketos:** about **120-200 s** on Warden (fail outside 70-330 s) for the scenarios' hero at L36.
- **The Shade:** about **240-420 s** on Warden (fail outside 150-480 s) for the scenarios' hero at L40, its four turns included.
- These are anchored where Act V's were measured: integrate.md's scenarios' hero (L30 / L34) took the Tower in 83-117 s and the Skotos in 213-381 s, against design targets of 3:30-5:00 and 5:30-7:30 that could not hold.
- **The bot's reference build at the profile levels** (Act VI met at 47-50, Mastery points spent as `docs/progression` spends them) is reported beside them and expected near half (Act V: 46-63 s and 83-186 s). It must not be under 50 s for the Ketos or 100 s for the Shade.
- **On Wanderer** neither may fall under 60% of its Warden time.

**The life and the blows** are set the way Act V's were, against the fixed curve (`integrate.md`): Act V's bosses settled at hp 170 with dmg 2.2-2.3. Act VI starts one step up, **185 and 240 (the Shade's life over four forms)** at **dmg 2.3**, with no single blow much past Act V's biggest (no blow over 12% of max life on Warden at L36/L40), and is tuned by balance-act runs (Warden n 6, Wanderer n 12) to a whole-act damage ratio over Act V in the band Act V took over Act IV (×1.2-1.45).

### ketos Το Κήτος / The Ketos
CONCEPT: **The sea-beast of the old vases**: a serpent neck, a long jaw with filmed white eyes, a body that stays in the water. From its brow rises a bony stalk holding a light that never flickers. It is older than the Saltborn's lights. On moonless nights it hung that light over the sea, and boats rowed toward it; the Wreck Heap round its mere is every one of them. It took Keyx's boat seven winters ago. When the Skotos drank the sea, the Ketos was left in the last black water over the Well. It is not evil: it is hungry, ancient and nearly blind, and its lure is all it has.

**Lines.** None; it is a beast. Its voice is a long falling whale-call and the steady pure tone of its lure.
- Title, mon.ketos: «Το Κήτος» / "The Ketos" (title only, with its article, like «Η Υφάντρα»).
- Tagline, mon.ketos.t: «Ποτέ μην τραβάς κουπί προς φως που δεν τρέμει» / "Never row toward a light that doesn't flicker".
- Glaukos calls the fight from the Heap's north rim, by ear (d.glaukos.k1-k3, beats).

**What it teaches:** the act's rule of light, three ways. Stand in true light, not its light (phase 1). Cut the lure when it comes down (phase 2). Give the blind thing a sound beside a fire (phase 3).

**Data:** model 'ketos' (CAST → ['ketos', 1]; stand-in ['icemaw', 3.4] with the code lure, then ['warg']), hp 185, dmg 2.3, speed 0 (anchored to its water) / underSpeed 5.0 (moving in its water), radius 0.8 (pre-scale: ×3.6 makes 2.9 m), reach 10, atk 'strike', atkTime 1.6, flesh 'flesh', xp 170, boss, big, swim, anchored, S.phases [0.65, 0.3], hpFloor 0.649 and 0.299 at each turn's beat (a 30 s clock), wake on the `ketosWake` cine (holdWake until it ends), dieClip 'settle', look { scale 3.6, tint 0xc8ccd0, tintAmt 0.4, rim 0xbfd8e8, rimI 0.3 }. Level: max(zone 34 + 2, hero + 1), the act's first boss (the world.js list).

**Arena:** the Black Mere inside the Wreck Heap, r 20 (Zones).
- The centre water, r 10, is the beast's (deep, closed); in phase 2 the ring r 5-10 becomes wading mud.
- The shore ring, r 10-18, holds three wreck lanterns at 120° (true lamps of r 4 once lit), two ship's bells by two of them, and four whale-oil casks.
- **The arena's water is the boss's:** `TIDE.force` holds the Mere at 1.6 and lowers it in phase 2 (Act V's machinery, run downward). On a reset (a death, leaving) it refills and the lanterns relight (they were the player's, lit before the fight).
PHASES: **Phase 1, «Το Δόλωμα» / "The Lure" (100-65%).** The thing to do: **stand by a true lamp and let it strike the fire.**
- Its body stays under. The head and lure move over the water to the hero's side.
- **Lure Drift** builds a false pool beside her. Standing in it brings a Neck Strike at the pool.
- **Every Neck Strike aims at the light nearest the hero.** If that is a true lantern's pool, the head strikes the flame and is **Seared** for 3 s (×1.5), lying on the shore and targetable. If it is the lure's false pool or her own ring, it strikes her.
- So the player learns to keep a lantern lit and stand in its pool when the line comes. Ketlings come to gnaw the lanterns; they leave a lantern alone while she stands in it.
- Glaukos: d.glaukos.k1.

**The turn (at 65%).** It rears and holds the floor for 3 s (immune; the boss bar shimmers). The ice groans, and the Skotos breathes in: the Mere begins to drain into the Well beneath it (3 s cine at pitch 0.45, hero iframes).

**Phase 2, «Η Λίμνη Αδειάζει» / "The Mere Drains" (65-30%).** The thing to do: **cut its lure when its head comes down.**
- The water falls in three 0.25 m steps over 15 s to 0.85 (the environment's telegraph): the ring r 5-10 becomes wading mud, the core stays deep. Wreck ribs give cover on the mud.
- Half-beached, it slams its neck down across the mud and the shore. After each slam its head lies there for 4 s (Exposed ×1.25) with the lure stalk as a node of three segments (each 4% of its max life).
- Cutting a segment Blinds it for 4 s (×1.6, its one scripted window). With all three cut the lure is gone for the rest of the fight.
- **Fail-safe:** three slams without a cut, and Glaukos throws a whale-oil flask at the sound of the stalk on the next slam; one segment burns away (Act V's flask, shipped).
- Glaukos: d.glaukos.k2.

**Phase 3, «Τυφλό» / "Blind" (30-0%).** The thing to do: **ring a bell beside a lit lantern.**
- Blind, it hunts by sound. **Every skill the hero uses within 14 m "sounds"** (a small ripple ring over her; HUD chip hud.heard). 0.8 s after the latest sound it strikes there.
- **The bells:** interact 0.5 s, «Χτύπα την καμπάνα» / "Ring the bell". The next Blind Strike goes to the bell. If that bell's lantern is lit, the head strikes the fire: **Seared 4 s** (×1.5), lying on the shore. A bell can be rung again after 10 s.
- **Fail-safe:** 45 s without a Seared, and Glaukos rings a bell himself: d.glaukos.k3b «Εδώ! Από δω, θεριό! Άκου εμένα!» / "Here! Over here, beast! Listen to me!"
- Glaukos: d.glaukos.k3.

**Death.** It lifts its neck toward the light above the ice, once, and lays it across the dry bed (d.ketos.die), where it stays as an arch with the frozen statue path (ai.js:108), the Mere's landmark and the echo's spot. Every build of the `dry` Mere places the arch there. Then the Mere drains for good, and the lantern in the mud (beats). First-kill legendary (Echoes).

**Echo refight.** «Θυμήσου το Κήτος» / "Remember the Ketos", at the arch, after `act6`. The deep remembers it: the Mere fills (forced), the lanterns relight, and Glaukos's calls are replaced by the bells ringing by themselves at each phase; both fail-safes are automatic. Tint: the deep's echo tint (baseTint 0xd0d8e8 at 1.2, rim 0xe0e8ff).
ASSET: {"source": "sketchfab", "uid": "773667575a264c7baa4ec404115a044b", "url": "https://sketchfab.com/3d-models/pistosaur-animated-773667575a264c7baa4ec404115a044b", "title": "Pistosaur Animated", "author": "RickStikkelorum (ricksticky)", "license": "CC Attribution 4.0 (to verify on the download page)", "faces": 16664, "animations": 1, "notes": "Scouted for Act V as the best sea serpent (assets.json, verdict ok): 'own sculpt (describes his process). No duplicate found.' A realistic long-necked pistosaur, rigged, with a swim clip; the neck rising from water is the shape of the Ketos on Greek vases.\n\n**Provenance gate at stage 0, before download** (to verify): reverse-image search and storefront check, saved beside the source in /tmp/claude-0/sf/act6; re-read the licence on the download page.\n\n**Build** (tools/creatures/act6/ketos.mjs):\n- keep 16.7k faces (a boss);\n- keep its swim clip as idle-in-water and make in lib.mjs: rise (head up out of the water), lure-drift (neck low, the stalk forward), strike (a neck lunge), slam (the neck brought down along its length), thrash, dive, surface, blind-listen (head cocked), seared (recoil), settle (the neck lifted, then laid down: held as the arch);\n- regrade: a pale hide with barnacle patches and white filmed eyes; 1024 base, 512 normal.\n\nThe lure is code: three bone segments (instanced, from the Ashwing's bone material) on a chain from the skull bone, a glow sprite and a steady pooled light at the tip, and the false pool disc. The same file at ×0.6 is the Ketling.\n\n**Fallback 1** (to verify): 'Pliosaur' by Spinnee (d90f30fd8ae9488ba8186a4572c9cf4f, CC-BY 4.0, rigged, no clips; hand-painted, so it needs a realistic regrade). **Fallback 2 (no download):** the shipped Icemaw at ×3.4 with the same code lure (a long-necked read is lost; the fight's rules are not), STAND_IN ketos → ['icemaw', 'warg']."}
MOVES:
- Lure Drift (phase 1): TELEGRAPH the lure glides over the water to her side; a steady cold pool of r 4 forms on the shore within 5 m of her (no flicker, a pure tone) | EFFECT bait: standing in it 0.8 s turns its rim sea-green (0.9 s tell), then a Neck Strike at the pool for 1.5× and the ring −1 m, pulled 2 m toward the water (stopping at the first deep cell). Cooldown 8 s.
- Neck Strike (phases 1 and 3, as Blind Strike): TELEGRAPH a teleLine 10 × 2.2 m from the water to the light nearest her (phase 1) or to the last sound (phase 3), 1.0 s | EFFECT 1.4× and knockback 10. **Ending in a true lantern's pool: Seared** 3 s (4 s in phase 3), ×1.5, the head on the shore.
- Jaw Sweep (phases 1-3): TELEGRAPH teleCone 8 m, arc 1.1, from the head, 1.1 s | EFFECT 1.2×. Cooldown 7 s.
- Black Spray (phases 1-2): TELEGRAPH three lobbed globs, teleCircles of 2 m landing at 1.0, 1.2 and 1.4 s | EFFECT 0.8× each, leaving black-water puddles of r 2 for 6 s (an area: ×0.7 move, ring −0.15 m/s, Cold +4/s; no cell change). Cooldown 11 s.
- Ketlings (phases 1-2): TELEGRAPH two bubble trails to the shore, 1.0 s | EFFECT two Ketlings climb out (at most 4 alive; +1 per call on Nightmare and above); they make for the nearest lit lantern no hero stands in, and snuff it. Cooldown 16 s.
- The Mere Drains (the 65% turn; the environment's telegraph): TELEGRAPH the ice groans 6 s, the HUD tide dial pulses violet | EFFECT three steps of 0.25 m over 15 s, one step a second inside the arena; the lane rule protects the hero.
- Neck Slam (phase 2): TELEGRAPH the neck rises high; a teleLine 16 × 3 m across the mud, 1.3 s | EFFECT 1.6× and knockback 14; then the head lies on the mud 4 s, Exposed ×1.25, with the stalk targetable. Cooldown 9 s.
- Thrash (phases 2-3): TELEGRAPH a teleCircle of r 7 round its body, 1.2 s | EFFECT 1.3× and knockback 12. Cooldown 10 s.
- Dive (phase 3): TELEGRAPH it sinks into the core; bubbles at the last sound | EFFECT it rises there 1.2 s later in a teleCircle of r 4 (1.2 s tell, overlapping the bubbles), 1.7×; never outside r 10. Cooldown 14 s.

### shade Ο Ίσκιος της Πύλης / The Shade of the Gate
CONCEPT: **The shadow of her fire.** It has met the hero at the end of every Shadow Gate as the Gate Guardian, wearing the North's oldest fears: the Barrow Lord, the Weaver, the troll (boot.js:240 picks one of the three). At the bottom it wears all three in turn, and last the shape her own fire throws: the hero's. It is not evil. It keeps the First hidden, because anyone who comes down might be the dark wearing a face.

**Lines.** It has no voice of its own. Each borrowed form speaks the shipped line of the boss it wears (d.lord, d.weaver), the troll roars, and the hero's shadow says nothing, because the hero never speaks.
- Title mon.shade «Ο Ίσκιος της Πύλης» / "The Shade of the Gate"; tagline mon.shade.t «Σε περίμενε στο τέλος κάθε πύλης» / "It waited at the end of every gate".
- Glaukos calls one thing per form (d.glaukos.s0-s3, beats).

**The shared rule: a shadow is hurt only in light.** The Shade is Shrouded in every form (×0.3 outside light). Inside the hero's ring it takes full damage. **Inside a lit hearthstone's pool, a named lamp's pool or the centre fire's light it is Lit (×1.25, the vulnerability rule).** Each form fights the light its own way.

**Data:** a relay boss: one actor `shade` holds the shared life and is re-spawned in each form's body.
- Shared: hp 240, dmg 2.3, xp 290, boss, flesh 'spirit', shroud, S.phases [0.75, 0.5, 0.25]; at each threshold hpFloor = threshold − 0.001 for the turn beat (2.5 s, hero iframes, the boss bar shimmers), with a 30 s clock. Level: max(zone 37 + 3, hero + 1).
- The forms (all boot-loaded models):

| form | body | scale | radius (pre-scale) | speed | moves | life |
|---|---|---|---|---|---|---|
| 1 «Ο Βασιλιάς που Ξεχάστηκε» / "The Forgotten King" | barrowlord.glb | 1.15 × 1.25 | 1.2 | 4.2 | LORD (ai.js:824, shipped) + Crown of Shadow, Snuff | 100-75% |
| 2 «Η Υφάντρα των Πυλών» / "The Gates' Weaver" | spider.glb | 2.6 | 2.2 | 5.2 | WEAVER (shipped) + Light-webs | 75-50% |
| 3 «Ο Τρόμος των Βουνών» / "The Mountains' Dread" | troll.glb | 1.45 | 1.1 | 3.6 | the shipped brute with the Gate Guardian's thunder affix + Vault Slam, Roar | 50-25% |
| 4 «Ο Ίσκιος σου» / "Your Own Shadow" | people.glb, its target's own class body | 1.5 | 0.5 | the target's × 0.9 | MIRROR (new) + Shadow Lunge | 25-0% |

- Every form wears Act V's `skotosSkin` patch (The look, row 13) over a near-black regrade at runtime, so they read as shadows of the shapes, not the shapes.

**Arena:** the First's Hearth, r 15 (Zones): the centre fire (light r 5; the First asleep beside it, an untouchable NPC); four hearthstones at r 9 (lit with a 1 s touch; true lamp pools r 4); up to seven named lamps of r 3 in the rim at r 14 (one for each of the Lost the hero freed; never snuffed); two black pools at the north rims (Hands rise there in form 4); `L.vault` patches over the east and west thirds; four whale-oil casks on the rim; the Gate ring on the south rim (dark).

**Exploration pays here.** A hero who freed all seven of the Lost fights with seven extra pools of light round the rim: more of the arena is light in every form, and form 4's opposite point lands in light more often. The seven pools are tuned to save about 10-15% of the fight's time, never more (the `shade` scenario runs with 0 and 7).
PHASES: **Form 1, the Forgotten King (100-75%).** The thing to do: **keep the stones lit and fight it inside their light.**
- The Barrow Lord's shipped moves, unchanged (LORD table).
- **Crown of Shadow:** every 15 s it raises 3 Gate-Fallen round itself. They rise again unless they fall in light, so the hero's ring and the stones matter twice.
- **Snuff:** it floats to the nearest lit stone and puts it out (a 2.0 s channel; a 6% hit interrupts it and leaves it Lit for 2 s where it hovers, inside the stone's pool). It never snuffs the named lamps or the centre fire.
- At 75% the form breaks into shadow and the Weaver rises from it.

**Form 2, the Gates' Weaver (75-50%).** The thing to do: **burn or cut the webs off the light.**
- The Weaver's shipped moves (WEAVER table) and its spiderlings (boot; 3 every 16 s, at most 5).
- **Light-webs:** teleCircle r 3, 1.0 s. A web on a lit stone shrinks its pool to nothing while it holds. A web on the hero is Webbed: 40% slow for 2 s and her ring −1 m.
- Webs burn: the Mage's fire areas, a broken whale-oil cask (4 on the rim), or three hits.
- Glaukos: d.glaukos.s1.

**Form 3, the Mountains' Dread (50-25%).** The thing to do: **let it strike under the hanging ice.**
- The Gate's rare troll, thunder affix and all.
- **Vault Slam:** its slams under an `L.vault` patch bring 3-5 icicles down round it (the Ice Overhead's white circles, 1.0 s). **An icicle that lands on it stuns it** for 3 s (×1.5). So bait its slams under the hanging ice and step out of the circles.
- **Roar:** a 6 m cone, 0.9 s, 0.8× and the hero's ring −1.5 m.
- Glaukos: d.glaukos.s2.

**Form 4, Your Own Shadow (25-0%).** The thing to do: **stand where your shadow falls into the light.**
- ATMOS 'hearthDark' eases in over 2 s; the four stones go out (each relit with a 1 s touch).
- The Shade takes its target's own class body, in black, at ×1.5. **It always stands opposite its target across the centre fire**, as a shadow does: its target point is the centre plus the vector from the hero to the centre, scaled to the hero's own distance, clamped to 4-13 m; it glides there at 7 m/s and is never pushed.
- So **to bring it into a lit stone's pool, the hero stands at the stone opposite.** One rule, readable at a glance, and nothing like Act V's fights.
- **It mirrors your loadout.** When its target uses a skill on one of her four buttons, the Shade answers 1.2 s later from where it stands with that skill's shadow move (the MIRROR table below). It reads the skill's id, not its variant, so the 21 rows cover every class, every loadout, every later skill and all 24 variants. If two big telegraphs are already up, the mirror waits.
- **Shadow Lunge** every 6 s, its own: across the fire through the hero. It ends in the fire's light, so the Shade is Lit for 2 s where it lands: a free window for a hero who baits it.
- Two Hands of the Skotos rise from the north pools (the shipped nodes, Act V's Sweep and Lash); cutting them is optional.
- **Fail-safe:** after 40 s with no Lit window, the centre fire flares to r 8 for 10 s, so any side is light. Narration toast d.shade.flare «Η φωτιά στη μέση φουντώνει, σαν να ανάσανε κάποια.» / "The fire in the middle flares, as if someone breathed."
- **In co-op** (Mechanics, co-op): form 4 takes one hero at a time as its target (the one with the most threat, held at least 15 s), wears that hero's class body and stands opposite that hero. A host target is mirrored skill by skill; a guest's casts are not on the host's wire, so for a guest target it answers from a fixed per-class set, one move every 3.5 s (Warden: Shadow Spin, Shadow Leap, Shadow Line; Ranger: Shadow Fan, Shadow Fall, Shadow Line; Mage: Shadow Bolt, Shadow Frost, Shadow Fall).
- Glaukos: d.glaukos.s3.

**The end.** At 0% the shadow folds back into the hero's feet (cine; ending). Flag `shadeDown`, saved first; its first-kill legendary drops by the centre stone.

**Echo refight.** «Ρίξε τον ίσκιο σου» / "Cast your shadow", at the Gate ring, after `act6`. No Glaukos; the four stones start lit; the named lamps burn as the hero earned them; form 4's fail-safe is the same. A grey-black echo tint (0x1a1c24, rim 0xd0d8ff). Nothing in the echo touches the story.
ASSET: {"source": "existing", "title": "barrowlord.glb, spider.glb, troll.glb (boot-loaded, Act I) and people.glb's warden, ranger and mage (boot-loaded)", "author": "as credited (Act I creatures; Quaternius for people.glb)", "license": "as shipped (CC0 / CC-BY 4.0, credited)", "notes": "No download, no new texture, no memory: every body is resident from boot. Look gate: each form under the skin patch and a near-black regrade, in the creature and people viewers at gameplay pitch; the hero's shadow must read as hers (silhouette, weapon, class) yet black. The player-class body is used on purpose here, the one place Act V's rule (never a player class's body for an enemy) is broken, because the shadow is the hero's."}
MOVES:
- Crown of Shadow (form 1): TELEGRAPH a dark ring on the floor round it, 1.2 s | EFFECT 3 Gate-Fallen rise (at most 6 alive; +1 on Nightmare and above). Cooldown 15 s.
- Snuff (form 1): TELEGRAPH it floats to a lit stone; the stone's flame leans toward it | EFFECT a 2.0 s channel that puts the stone out; a 6% hit interrupts it (Lit 2 s). Cooldown 12 s.
- Light-web (form 2): TELEGRAPH teleCircle r 3, 1.0 s | EFFECT on a stone: its pool goes to nothing while the web holds (until burnt or struck three times); on the hero: Webbed (40% slow 2 s, ring −1 m). Cooldown 7 s.
- Vault Slam (form 3): TELEGRAPH the troll's shipped slam tell (teleCircle 3 m, 1.2 s) | EFFECT 1.3×; under `L.vault`, 3-5 icicles fall round it (white teleCircles r 1.2, 1.0 s; 0.9× each); one on the troll: Stunned 3 s (×1.5). Cooldown 8 s.
- Roar (form 3): TELEGRAPH teleCone 6 m, 0.9 s | EFFECT 0.8× and the hero's ring −1.5 m. Cooldown 14 s.
- Shadow Lunge (form 4): TELEGRAPH teleLine 12 m × 2 m through the hero across the fire, 1.0 s | EFFECT 1.2× and knockback 10; it lands in the fire's light: Lit 2 s. Cooldown 6 s.
- MIRROR (form 4): TELEGRAPH each shadow move's own, 1.2 s after its target's cast, in the shadow's grey-violet, never the skill's own look | EFFECT by the table (every one of the 21 skills; basic attacks are not mirrored):

| class | the hero's skill (and its variants) | the shadow's answer |
|---|---|---|
| Warden | Whirlwind «Δίνη» (`whirl`) | Shadow Spin: teleCircle r 3 round it, 1.0 s, 1.0× |
| Warden | Leap «Έφοδος» (`leap`) | Shadow Leap: teleCircle r 3.2 at the hero, 1.2 s, 1.3× |
| Warden | War Cry «Πολεμική Κραυγή» (`cry`) | Shadow Howl: its next answer comes 0.4 s sooner (no damage) |
| Warden | Earthsplitter «Σχισμή της Γης» (`quake`) | Shadow Line: teleLine 14 m × 2 m toward the hero, 1.1 s, 1.3× |
| Warden | Shield Charge «Ορμή της Ασπίδας» (`charge`, level 20) | Shadow Leap (as above) |
| Warden | Iron Bulwark «Σιδερένιο Τείχος» (`bulwark`, 30) | Shadow Ward: it takes ×0.5 for 3 s, shown by a grey ring (no damage) |
| Warden | Dawnbreaker «Ξημέρωμα» (`dawn`, 40) | Shadow Wave: three teleLines of 12 m × 2 m in a 30° fan, 1.2 s, 0.7× each |
| Ranger | Multishot «Βεντάλια» (`multi`) | Shadow Fan: five teleLines of 12 m in a 50° fan, 1.0 s, 0.6× each |
| Ranger | Arrow Rain «Βροχή Βελών» (`rain`) | Shadow Fall: teleCircle r 3.5 at the hero's spot, 1.4 s, 1.4× |
| Ranger | Spirit Wolf «Πνεύμα του Λύκου» (`wolf`) | Shadow Howl (as above) |
| Ranger | Piercing Shot «Διαπεραστική Βολή» (`pierce`) | Shadow Line (as above) |
| Ranger | Snare Trap «Σιδερένια Παγίδα» (`trap`, 20) | Shadow Snare: teleCircle r 1.6 at the hero's spot, 1.2 s, 0.8× and held 0.8 s |
| Ranger | Vault «Άλμα Πίσω» (`vault`, 30) | Shadow Step: it glides to its opposite point at once (no damage), then its next answer comes 0.4 s sooner |
| Ranger | Storm of Hawks «Θύελλα Γερακιών» (`hawks`, 40) | Shadow Fan (as above) |
| Mage | Fireball «Πύρινη Σφαίρα» (`fireball`) | Shadow Bolt: a slow dark orb along a teleLine 14 m × 1.6 m, 1.2 s, 1.2×, ending in a teleCircle r 2 |
| Mage | Frost Nova «Παγωνιά» (`nova`) | Shadow Frost: teleCircle r 5 round it, 1.2 s, 0.9× and 30% slow for 2 s |
| Mage | Chain Lightning «Αλυσιδωτός Κεραυνός» (`chain`) | Shadow Fan (as above) |
| Mage | Meteor «Μετεωρίτης» (`meteor`) | Shadow Fall (as above) |
| Mage | Frozen Orb «Σφαίρα του Χειμώνα» (`frostorb`, 20) | Shadow Orb: an orb out along a teleLine 12 m × 2 m and back, 1.2 s each way, 0.5× a pass and 20% slow 1.5 s |
| Mage | Void Rift «Ρήγμα του Κενού» (`rift`, 30) | Shadow Pull: a sea-green teleCircle r 3 at the hero, 1.3 s, 0.8× and a pull of 2.5 m toward the fire (stops at the fire's blocked cells) |
| Mage | Ray of Dawn «Ακτίνα της Αυγής» (`beam`, 40) | Shadow Ray: teleLine 16 m × 1.4 m from it toward the hero, 1.2 s, 1.3× |

- Hands of the Skotos (form 4): as shipped (Hand Rise teleCircle r 2.5, 1.6 s, 1.1×; Sweep teleCone 6 m, 1.2 s, 1.1×; Lash teleLine 9 m × 1.6 m, 1.0 s, a 4 m pull); at most 2, never inside true lamp light.
- The Flare (form 4 fail-safe): no telegraph | the centre fire's light r 8 for 10 s.

## Mechanics
**Systems are taught one at a time, then combined,** as Act V does:
- **the Drained Sea:** the Carried Fire first (the Rope to hearth 1), with true and false light at the first Falselight; the Black Water second (the Hollows, hearth 2); the Ice Overhead third (the Keels, hearth 3); the Names from Above whenever the rite falls;
- **the Ketos:** true light against false (phase 1), the black water drunk away (phase 2), true light and sound (phase 3);
- **the Bottom:** all of them, with the black lamps;
- **the Shade:** light in every form, with the vault in form 3 and the shadow's geometry in form 4.

**No new buttons.** Lighting, relighting, snuffing, ringing and climbing use interact; bowling a louse and escaping a pull or a snap use the dodge; everything else is positional.

### The Carried Fire (Η Φωτιά που Κουβαλάς): both zones and both fights
The Cradle's coal is the hero's light under the ice, and the dark drinks it. **The ring on the ground is the meter**: there is no new bar.

**The ring.** The shipped Cradle ring (light.js Cradle slot; Act IV's 6 m, Act V's 4 m) is `ZONES[id].ring` = 4.5 m in Act VI zones and becomes a value, `FIRE.r`, between 0 and `FIRE.max` (4.5 × the Lamplight track's bonus, Progression below).
- It lights what stands in it: for the Shroud, for seeing the Faded and the First's marks, and for the Gate-Fallen's rest.
- It is not warmth (as in Act V), so the hero still comes in to the fires for the Cold.
- **It never drains by itself.** Only the dark's actions take it (Act V's judges' lesson: the Cold never built from simply being outdoors).

**What takes it** (each × the difficulty's coal factor):

| source | ring |
|---|---|
| a Lampbearer's Drink | −0.5 m/s for its 2.5 s channel |
| a Faded's Forgetting Touch | −0.5 m |
| a Falselight's snap; the Ketos's Lure Drift strike | −1 m |
| wading black water (and the Ketos's Black Spray puddles) | −0.15 m/s |
| a black lamp's Black Flare | −1 m |
| the Shade's Roar (form 3) / Light-web on the hero (form 2) | −1.5 m / −1 m |

**What fills it** (true light only):

| source | ring |
|---|---|
| standing in true lamp light (a hearth r 6, a brazier r 4, a lit stone r 4, a lost light r 4, a wreck lantern r 4, a named lamp r 3, a camp fire) | +1.5 m/s |
| a skylight | +0.3 m/s |
| the names falling from above (the Drained Sea only, Names from Above) | +1.5 m/s for the window |
| killing an `unlit` foe inside the ring | +0.2 m |
| a Lampbearer's death | everything it drank, +1 m |
| a burning whale-oil cask (the shipped fire area) | +1.0 m/s |
| a black lamp put out | to full |

**States.**
- **Dim** (r < 1.5): the ring pulses; the small flame icon beside the Cold meter turns grey (hud.dim); a one-time hint hint.carry.
- **Out** (r = 0): the ring is gone and the hero's own light shrinks to 4 m (`setHeroLight`, shipped). Cold gains are doubled, every `unlit` foe is Shrouded wherever it stands, and the Faded are unseen. Toast q.fireOut. **Relight:** a 1 s touch at any true lamp light brings the ring back at 2.5 m (q.fireBack); a Lampbearer's death relights it too.
- Out is never a death sentence: every fight area has a true lamp light within 15 m (gen6 hard check), and both bosses have a fail-safe.

**The Shroud** (Act IV's, combat.js:243, unchanged): in 'deep' zones every `unlit` foe outside light takes ×0.3, and a hit inside light Reveals it for 3 s. "Light" is `lightAt(x, z)` (shipped): every hero's ring, true lamp pools, skylights, fire areas and the moving lights of the class hooks. False pools are not light.

**The lantern chain** (co-op). `lightAt` counts every hero's ring, not only the page's own. Each ring gains +1 m while another hero is within 6 m (at most +2 m with three others), as drawn and as light; the meter `FIRE.r` itself does not change. A party that keeps close sees and hurts more under the Shroud; one that spreads sees more ground and less of each foe.

**Class hooks.** Production's Shroud ×0.3 outside a 4.5 m ring is hardest on the Ranger, whose reach is 13-22 m. Each class gets light where its skills already act: one line at each shipped hook, the way Act V's `crackAt` calls are placed. **Every variant repeats its base's hook** (the progression port's rule: a variant replaces its base function), so no variant is weaker under the ice than its base.

| class | skill (variants) | Act VI hook ('deep' zones only) |
|---|---|---|
| Warden | War Cry (Rallying Cry; Challenge) | the ring flares to 8 m for 3 s (`flareRing`); Rallying Cry flares every hero's ring within 10 m; Challenge's taunted foes stay lit for the taunt |
| Warden | Leap; Earthsplitter (their variants) | bring the vault down (the Ice Overhead) |
| Warden | Iron Bulwark (later, 30) | its ward glows as a true light pool r 3 while it holds |
| Warden | Dawnbreaker (later, 40) | its waves are moving light: each lights its path for 1 s and Reveals the `unlit` it crosses |
| Ranger | Spirit Wolf (The Pack; The Alpha) | carries a lantern: a moving light pool r 3.5 that runs with it (The Pack: three of r 2; The Alpha: one of r 5); what it bites is lit |
| Ranger | Arrow Rain (its variants) | brings icicles down from range (1 a cast) |
| Ranger | Piercing Shot (its variants) | breaks every whale-oil cask on its line (a burning cask is light and fire, out to 22 m) |
| Ranger | Snare Trap (later, 20) | a held foe stays lit while held |
| Ranger | Storm of Hawks (later, 40) | each stoop leaves its target lit for 3 s |
| Mage | Fireball; Meteor (their variants) | their burning ground is light, as it always was (not `dim` fires: Pale Cinder's stays `dim`, progression's rule); Meteor brings the vault down; Fireball drops one icicle |
| Mage | Frost Nova (Shatter; Blizzard) | freezes black water to slush in r 5.5 for 8 s: deep cells become wading, a lane through a flood (Black Water) |
| Mage | Frozen Orb (later, 20) | its trail freezes the black water it crosses to slush for 6 s (r 1.2) |
| Mage | Ray of Dawn (later, 40) | counts as moving light along its length: it Reveals and lights what it crosses |
| (all) | Whirlwind, Shield Charge, Multishot, Vault, Chain Lightning, Void Rift | no hook: they work as shipped |

IMPL:
- **light.js** (about 130 lines): `ZONES[id].light === 'deep'`; `FIRE = { r, max, state }`; `fireDrain(v)` and `fireFill(v)` (×HAZ6.coal); the ring's radius drives the Cradle decal, `lightAt` and the `uFireR` uniform (the marks' decals, the Faded's opacity); Dim and Out; relight at true lamp light; `flicker` and `fake` on `addLightPool` (true and false light, below); `lightAt` over `heroes()` with the chain; `flareRing(r, t)`; moving pools (the wolf, the waves, the ray: Act V's beam-pool code); Act IV's `drink()` and swell stay 'ember'-only.
- **combat.js:** in 'deep' zones `unlit` defs are Shrouded through the shipped shroud test at combat.js:243 (one line: `def.shroud || a.shrouded || (zoneLight === 'deep' && def.unlit)`), and light.js's `shroudOn()` answers true in 'deep' zones as it does in 'ember' ones.
- **ai.js:** `drinker` (on the tether channel's tick), the Faded's touch, the kill refill, the lure's snap.
- **skills.js / skillsx.js:** the class hooks above, one line each at the point the skill already acts, repeated in each variant.
- **hud.js:** the flame icon beside the Cold meter.
- **co-op:** each page's own ring is its own hero's; a guest's ring radius rides in its presence `h` as one byte, so the host's `lightAt` and its check of a guest's blow use the guest's light (Co-op below).

### True and false light (Το Φως που Τρέμει): every light in Act VI
**The creed made readable:** «Ποτέ μην τραβάς κουπί προς φως που δεν τρέμει» / "Never row toward a light that doesn't flicker", taught by Glaukos at the Rope camp (d.glaukos.d2b), the first Falselight (hint.flicker) and the Ketos; and in the First's own first words, «Φωτιά που τρέμει... Δεν είναι δική του.» It is d.alk.a3 («Απαντάμε μόνο σε φωτιές που μπορούν να σβήσουν») as a rule of play.

| | true light | false light |
|---|---|---|
| what | hearths, braziers, stones, wreck lanterns, lost lights, named lamps, camp fires, burning casks, fire skills, the wolf's lantern, Keyx's lantern | black lamps, the Lampbearers' lanterns, the Falselights' lures, the Ketos's lure |
| **motion** | radius and intensity tremble ±12% at 6-10 Hz; 3-6 sparks | dead still; no sparks |
| **colour** | warm, 0xffc070-0xffe0b0 | cold: white-blue 0xd8e0ff (the lures), black core with a violet rim 0x8a70ff (the dark's lamps) |
| **sound** | a crackle with a 5 Hz vibrato | a pure, steady sine tone |
| **rim** | soft | hard (the smoothstep narrowed) |
| **in play** | counts in `lightAt`: refills the ring, warms, Reveals, keeps the `unlit` down, holds the Shroud off | `fake`: counts for nothing, and is bait for its owner |

- **Three channels, never colour alone** (phone readability, colour-blind players): motion and sound carry it even where the colours are hard to tell apart.
- IMPL: `addLightPool(x, z, r, o)` gains `o.flicker` (default true for every lamp kind, false for none) and `o.fake` (a pool `lightAt` and `lampLightAt` skip); the tremble is two summed sines on the pool's own uniform, a phase per pool; audio.js gives each lamp loop a vibrato LFO and the false lights a sine voice. Near-zero cost.

### The Black Water (Το Μαύρο Νερό): the Hollows, the Old Shore, the Mere, the Barrow, the Wood, the Village, the Stair, the Hearth
The Skotos breathes. When it breathes in, the black water it has not yet drunk rises in the low hollows; when it breathes out, the water sinks back. **This is Act V's tide, unchanged in its code**, on a shorter cycle and only in pockets.

**The clock** (Warden; tide.js with a zone config instead of HAZ5's constants):

| state | duration | h |
|---|---|---|
| low (still) | 40 s | 0 |
| rise | 27 s | 0 → 0.9 in 6 steps of 0.15 m, one every 4.5 s |
| high (still) | 26 s | 0.9 |
| fall | 27 s | 0.9 → 0 |

- **120 s a cycle** on Warden (150 on Wanderer; table under Difficulty). The clock restarts at low water on every zone build and every entry (`act6Enter`, as `act5Enter`).
- **The warning:** the ice groans (a low creak swell, new sfx) 6 s before each rise and fall, the HUD tide dial (shipped) pulses in violet, toast q.black once a visit, first-time hint hint.black.
- **The cells:** Act V's exactly. Dry, wading (0 < depth < 0.45: ×0.7 move, Cold +4/s, and here the ring −0.15 m/s) and deep (≥ 0.45: closed).
- **Safety rules, unchanged:** a cell under the hero or on her way out never closes without 6 s of grace along a BFS lane; then a wash-out along that lane (HAZ6 %, the same as HAZ5's), never a teleport; every enemy pull stops at the first deep cell; the safe places stay dry at both extremes (gen6 hard checks).
- **What it does to fights:** at low water the Hollows are wide and the Icemaw lies up; at the rise the Sunken under the kelp wake (`tideWake`) and the basins cut the floor into islands; at high water the Icemaw hunts and the trail and the road stay dry.
- **The Mere is the boss's** (`L.pocket` 2, `TIDE.force`), as the Walking Tower owned its bay: held at 1.6 before the fight, lowered in phase 2, 0 for good after.
- **Slush lanes** (the Mage's hook): Frost Nova, its variants and Frozen Orb set a list of cells to "wading" for 8 s (6 s for the Orb) whatever the level: `slushAt(x, z, r, t)` with its own expiry list, drawn as a pale crust on the water (a define on SEA_BLACK's colour step). The cells' walkability changes go through `map.open`/`close` batched at most every 0.25 s (ice.js's rule: `map.ver` ≤ 4 bumps a second). The lane rule still guards the hero when slush thaws under her (6 s of grace as the tide gives).

IMPL:
- **tide.js** (+about 60 lines): the cycle, steps and hMax from `L.tideCfg` (gen6 writes `{ phases: [40, 27, 26, 27], stepT: 4.5, hMax: 0.9 }`, scaled by HAZ6); per-pocket forcing (`L.pocket` 2 for the Mere); `slushAt` with its own expiry list; the groan in place of the bell; nothing else changes.
- **sea.js:** the water over the pocket and Mere cells only, with SEA_BLACK (The look, row 2) and its slush crust.
- **co-op:** the shipped tide sync (`w` in the snapshot: the clock and a boss's hold) covers it; the slush cells go in the same field as a short list.

### The Ice Overhead (Ο Πάγος από Πάνω): the Keels, the Village square, the Hearth's east and west thirds, every `L.vault` patch
The vault is low and thin in places. Heavy blows bring its icicles down, and where it is thinnest the aurora's light falls through.

**Icicles.**
- **What brings them down:** the impacts Act V already routes through `crackAt` (skills.js and skillsx.js: Leap, Earthsplitter, Meteor, Fireball, Arrow Rain and the variants and later skills that strike the ground), and monster slams. In 'deep' zones they call `vaultAt(x, z, r, n)` instead.
- **How many:** Leap 2, Earthsplitter 1 per 4 m of its line, Meteor 3, Fireball 1, Arrow Rain 1 a cast, a monster slam 1, the troll form's Vault Slam 3-5, each on a random `L.vault` cell within r + 1. At most one fall per vault patch every 4 s, so a patch never rains forever.
- **And by themselves:** at the start of each high water, one icicle per vault patch within 20 m of the hero (the breath shakes the vault).
- **Each fall** is forge.js's slag drip (forge.js:136) made generic: a white teleCircle r 1.2, 1.0 s, a rime icicle falling from y 9, then 0.9× the zone's monster blow (× HAZ6.icicle) to the hero inside it, Cold +10, **and to monsters: 8% of their life and a 1.5 s stun** (the troll form 3 s and ×1.5). It leaves a shard prop on its cell for 20 s (blocked; batched with `map.close`/`map.open` at most every 0.25 s) and keeps a Gate-Fallen under it from rising.
- So the hero can **drop the vault on a pack**: lure them under the hanging ice and Leap.

**Skylights.** `L.spots.sky`: true light pools of r 3-5 under the vault's thinnest places: the ring +0.3 m/s, Cold −6/s, Shroud reveal. At each high water they dim to half radius for 10 s.

IMPL: **forge.js** (+about 30 lines): `drip(x, z, r, dur, o)` exported from `slag()` with a colour, a damage option, an `onLand` hook and the shard. **gen6** writes `L.vault` and the sky spots. **skills.js and skillsx.js:** the twelve shipped `crackAt` call sites (five in the base skills, seven in the variants and later skills) read `zoneLight === 'deep'` and call `vaultAt`. **co-op:** the host decides the falls; the drips are look calls through the shipped `MIRROR.rec` (net/state.js), and the shards are cell changes in the world digest, the way Act V's `storyOpenings` are.

### The Names from Above (Τα Ονόματα από Πάνω): the Drained Sea
Selna's nightly rite at the Farthest Light (Act V's `nightRite`, story.js:1746, and its `rollNames`, story.js:1647) is heard under the clear ice. It does not reach the Bottom, which is under the drowned places, not under the ice.
- **When:** every 90 s in the Drained Sea (Warden; Difficulty), on its own clock, offset 30 s from the Black Water's rise.
- **Tell:** a low bell from above, 1.5 s.
- **The names fall** as pale floating `say` lines from the top of the screen, 0.8 s apart: `rollNames(true)` as shipped (the First, Einar, Arna, every Name-stone the hero lit in Act V in order, Ivar, Isarn), then the Lost the hero has freed, then «Σκότος.»
- **The window:** **5 s, plus 0.5 s for every Act V Name-stone the hero lit** (`h.flags.names`, at most four: up to 7 s). During it:
  - every hero's ring refills at +1.5 m/s (it is true light, from above);
  - every `listens` foe (the Faded) stands still with its face up for 3 s, Revealed (×1.25) and solid, taking no action (once per window);
  - every `unlit` foe in the zone is Revealed for the window.
- **Act V reactivity:** every Name-stone the hero lit on the coast makes every window longer. The optional stones of Act V become a reward in Act VI.
- **Bosses:** the rite does not fall inside the Wreck Heap during the Ketos's fight (the clock pauses while `G.bossActor` is set), so the fight's numbers do not depend on luck.
- **Co-op:** the host's clock; every hero's ring refills.
- IMPL: a timer in `act6Tick`, the shipped `say` chain, the `listens` trait in ai.js, the refill through `fireFill`. About 0.5-1 d.

### The Cold (Ψύχος), carried over
cold.js runs unchanged in Act VI zones. Its sources here: wading black water +4/s; the wash-out +20; a Black Flare +15; a Lampbearer's lantern blow +8; an icicle +10; Out doubles every gain. Its sinks: −3/s dry; −12/s in a warm pool (hearths, braziers, camps, lit stones, lost lights, wreck lanterns, named lamps); −6/s in a skylight; −8/s in a fire area. **False light never warms.** Chilled, Freezing and Frostbite (with its boss-fight variant) are as shipped, by HAZ6's row (HAZ5's values).

### The vulnerability rule (Act V's, with Act VI's statuses)
- Every target has **one** vulnerability multiplier, the largest of its active statuses; they never multiply together.

| status | × | who |
|---|---|---|
| Revealed (a hit in light; the names falling), Exposed (an interrupted channel; the Ketos's head after a slam), Lit (in a stone's, a named lamp's or the fire's light) | 1.25 (1.35 on Wanderer) | unlit foes; listening foes; the Ketos; the Shade |
| Seared (the Ketos striking a true flame), Stunned (an icicle) | 1.5 | the Ketos; the Shade's troll form; monsters under an icicle |
| Blinded (a lure segment cut: the Ketos's scripted window in phase 2) | 1.6 | the Ketos |

- Shroud (×0.3 outside light) is a resistance, like ward (×0.5) and the Island (×0.3); it multiplies with a vulnerability as they do. A Lit status cannot be had outside light, so the two never meet on one blow.
- **A boss caps at ×1.6** outside its one scripted window per phase.
- IMPL: the shipped `vuln()` in combat.js (`actHit`) gains the new status names. No new code path.

### Memories: black ice and black water
- **Black-ice Memories (Μνήμες από μαύρο πάγο), the First's three hearths.** On each hearth's relight, the next memory in count order (Act V's guard: a lit hearth with its memory unseen offers «Θυμήσου» on every entry; questGoal points at it). The Lamp-Memory flow (story.js `on('lamp')`) with the body class 'memory-deep' (CSS: Act V's 'memory-ice' with a black-blue swap) and npc.deepMemory. The figures are the `selna` frost scene (the First, as in Ice Memory 1) and two shorefolk villagers in the memory material. BUFFS.memory, toasted «Μνήμη της Πρώτης» / "Memory of the First". Flags `mem_d1`-`mem_d3` mean "seen".
- **Black-Water Memory (Μνήμη από μαύρο νερό), Keyx's boat at the Mere.** One memory, not counted in a quest: the body class 'memory-ink' (a near-black swap with a moonless sky), npc.inkMemory, Keyx (people.glb 'villager1') and Alkyone (frost 'alkyone') in the memory material, a rowboat prop. BUFFS.memory, toasted «Μνήμη του ψαρά» / "Memory of the fisherman". Flag `mem_k1`.
- Nothing else is new.

### The Lost (Τα Χαμένα): seven to find (optional)
Four toppled sea-lights and three forgotten people, each found or freed a different way. Each one:
- shows q.lost «Χαμένα φώτα και ονόματα: {0}/7»;
- joins Selna's rite and the names from above (the people by name; each light by its keeper's name);
- leaves a named lamp burning in the First's Hearth's rim, true light of r 3, for the Shade's fight and for good.

| who | where | how | what it pays off |
|---|---|---|---|
| the Lost Lights: Galini's, the twins', Kranea's, Psamathe's | the Drained Sea: two in the Hollows, one in the Keels, one on the Heap's slope | «Άναψε τον χαμένο φάρο», 1 s; all four set `nineLit` (the farlight glows at full) | d.glaukos.2's nine lights; Act V's unshipped stone lines |
| the Sailor | the Drained Sea, the Old Shore, a beached keel-boat | knows his name at once if the hero lit his Name-stone in Act V; else Glaukos tells it (beats) | d.stone.sailor |
| Asger of the Order of the Flame | the Drained Sea, the Keels, frozen in a keel | light his cold brazier from the Cradle | class.mage.d; d.alk.a5.m «Μετά ξέχασαν τον δρόμο.» |
| Leif, the woodcutter's son | the Bottom, the Drowned Wood, by a dead fire | light his fire; take his axe to his father in Whitecliff, who says his name; he is home after the act | d.v.3, Act I's oldest open thread |

- **All seven** set `lostAll`: toast q.lostAll, and the Act VI blessing is worth ×1.25 (Blessings). They can be finished in the post-game (Leif's lamp lights when his father says his name).
- Not among the Lost: Keyx (on the main path), the ember (it is let go, not freed).

### World-state: the Call, the Coal, the Drained Sea, the Hearths, the Ketos, the Black Lamps, the Shade, Her Fire, Home (Το Κάλεσμα, το Κάρβουνο, η Στεγνή Θάλασσα, οι Εστίες, το Κήτος, οι Μαύρες Λάμπες, ο Ίσκιος, η Φωτιά της Πρώτης, το Σπίτι)
One more chain after Act V's `coastCall` → `hearth` → `frozen` → `hole0-2` → `seaLit`. Every flag is saved before its scene plays (the pairs `ketosDown`+`keyxLamp`, `blackLamp2`+`keyxFreed` and `firstLit`+`nameBack` are saved together), and read on zone build, on every zone entry (zones are cached) and on load.

1. **`call6` (q32).**
   - **Whitecliff:** FAR_BEACONS[4-6] hold their flash (farFire `flash` 0) until `firstLit`; cold mist at Isarn's staff (fx emitter), a rime tint on the staff and frost in the lantern's glass; the forgetting barks; Tamarisk at the staff until `tam6`.
   - **The farlight zone:** the Farthest Light's beam stands still, facing south (its `addBeam` period held), until `firstLit`.
2. **`tam6`, `coal6` (q33).** **The farlight zone:** the rope hole, oil fire, winch and exit on the skerry (`act6Presence`, every entry); Selna, Alkyone, Glaukos and Tern placed there. The Cradle rides the hero's hip in Act VI zones.
3. **`drainedSeen`, `hearth6_1`-`3` (q34).** The Drained Sea's waypoint; the hearths' pools and checkpoints; the rite's clock below.
4. **`ketosWake`, `ketosDown` with `keyxLamp` (q35).** The Drained Sea in mode `dry`: the Mere drained, the neck arch, the Well open, the Heap's east and west gaps open again. The hero carries Keyx's lantern (a belt prop in every zone until `landing6`).
5. **`blackLamp0`-`2` with `keyxFreed` (q36).** The Stair's shadow-walls open, one per lamp; the lamps stay dark; Keyx gone from the square.
6. **`shadeWake`, `shadeDown` (q37).** The Hearth calm; the First still asleep; the name held («…»).
7. **`firstLit` with `nameBack` (q38).**
   - **The Bottom** is rebuilt in mode 'lit' (`bottomMode()`): ATMOS 'bottomLit', the Faded gone from the village, the black water held at low, the First asleep by a bright, trembling fire, the Gate ring warm and open.
   - **The Drained Sea:** the skylights brighter (hemi +0.1); packs unchanged for farming.
   - **The farlight zone:** a warm glow under the clear ice by the tower (a `uGlow` slot), Selna's rite with the new first line and Tern's good night; the beam turns again at its 12 s period.
   - **Whitecliff:** the sea-lights flash again; the Gate at the staff breathes warm (ember motes, no mist); the frost leaves the lantern; the forgetting barks give way to their undoing.
8. **`homeGate` (q38b), then `act6`.** The home cine with the six peaks (FAR_BEACONS 7-12 lit from now on, every night), the act panel, game.sub6, the home lines.
9. **After the act:** `landing6` (Keyx's lantern on the Landing's post; the blue bird); `leifHome`; Tamarisk in the Lanternglade; Glaukos at the Rope camp by day.
- **Optional:** `lost0`-`3` → `nineLit`; `sailorRest`, `asgerRest`, `leifAxe` → `leifName`; all seven → `lostAll`; `ember6`; `garland6`.
- **Packs stay for farming** in every state.
- **Old saves** without these flags read as Act V's end state (quest 31, `seaLit`). `hero.act6 ??= −1` (boot.js migration, as `act5`); state.js's new hero gets `act6: −1`.
- IMPL: `act6Zone(z)`, `act6Enter(z)` and `act6Presence(z)` in world.js, mirroring Act V's trio. Derived: `drainedMode() = ketosDown ? 'dry' : 'mere'`, `bottomMode() = firstLit ? 'lit' : 'dark'`. `townFires` reads `call6`, `firstLit` and `act6` (the peaks); `act5Presence` (farlight) reads `coal6`, `firstLit` and `nineLit`; the coast's presence reads `landing6`; weep's presence reads `act6` (Tamarisk). The title reads `save.heroes.some(h => (h.act6 ?? −1) >= 0)` for game.sub6.

**Flags** (hero.flags; each saved before its scene unless noted):

| flag | set |
|---|---|
| `call6` | the hook (q32) |
| `tam6` | Tamarisk's dialog ends (→ q33) |
| `coal6` | the coal taken |
| `drainedSeen` | before the arrival cine |
| `hearth6_1`-`3`, `mem_d1`-`d3` | each hearth lit; each black-ice memory seen |
| `cp6` | the latest checkpoint (Act V's cp5 pattern) |
| `mem_k1` | the black-water memory seen |
| `ketosWake`; `ketosDown` with `keyxLamp` | before the fight; at its death |
| `blackLamp0`-`2`; `keyxFreed` with `blackLamp2` | each lamp out; Keyx's |
| `shadeWake`, `shadeDown` | before the fight; at its end |
| `firstLit` with `nameBack` | the relight |
| `homeGate` | the Gate ring taken; then `actComplete(6)` → `act6` |
| `landing6` | the Landing's lantern scene |
| `lost0`-`lost3`, `nineLit`, `sailorRest`, `asgerRest`, `leifAxe`, `leifName`, `leifHome`, `lostAll` | the Lost |
| `ember6`, `garland6` | the ember heard; the glade seen |
| `legFrom_ketos`, `legFrom_shade` | first kills |

Hero fields: `act6` (the best difficulty completed, −1 if not) and `gateFound` (forgotten freed in the Shadow Gates, Echoes and post-game).

### Difficulty: what each level does to Act VI
The six difficulties keep their names (canon item 20; «Σκότος» shipped as the sixth, `unlock: 'act5:ash'`). On top of the existing hp, damage, elite and loot scaling, every Act VI hazard scales through a new `HAZ6` row set in data.js beside `HAZ5`. **Telegraph durations never change.**

| | Wanderer | Warden | Hero | Nightmare | Ash | Skotos |
|---|---|---|---|---|---|---|
| monster hp / dmg (existing) | 0.65 / 0.55 | 1 / 1 | 1.9 / 1.55 | 3.6 / 2.4 | 7 / 3.8 | 11 / 5.4 |
| the act's creatures' blows (HAZ6.dmg, as HAZ5.dmg) | ×1.5 | ×1 | ×1 | ×1 | ×1 | ×1 |
| coal drained (HAZ6.coal) | ×0.6 | ×1 | ×1 | ×1.15 | ×1.3 | ×1.45 |
| ring refilled in true light | 2.0 m/s | 1.5 | 1.5 | 1.4 | 1.3 | 1.2 |
| Shroud outside light | ×0.45 | ×0.3 | ×0.3 | ×0.3 | ×0.3 | ×0.3 |
| Black Water cycle | 150 s | 120 s | 120 s | 120 s | 110 s | 100 s |
| the groan's lead | 8 s | 6 s | 6 s | 6 s | 6 s | 6 s |
| wash-out (% max life, HAZ5's) | 3 | 6 | 6 | 8 | 10 | 12 |
| icicle (× zone blow) | 0.6 | 0.9 | 0.9 | 1.0 | 1.1 | 1.2 |
| black lamp channel | 1.6 s | 2.0 s | 2.0 s | 2.0 s | 2.2 s | 2.4 s |
| a false pool's bait time | 1.2 s | 0.8 s | 0.8 s | 0.8 s | 0.7 s | 0.6 s |
| the names from above: every / base window | 75 s / 6 s | 90 s / 5 s | 90 s / 5 s | 100 s / 5 s | 110 s / 4.5 s | 120 s / 4 s |
| Cold gains (HAZ5's) | ×0.8 | ×1 | ×1 | ×1.15 | ×1.3 | ×1.45 |
| Revealed / Exposed / Lit | ×1.35 | ×1.25 | ×1.25 | ×1.25 | ×1.25 | ×1.25 |
| boss cooldowns | ×1 | ×1 | ×1 | ×0.9 | ×0.85 | ×0.8 |
| adds per boss call | +0 | +0 | +0 | +1 | +1 | +2 |
| telegraph durations | never change | | | | | |

- The bait time is not a telegraph: the snap's own 0.8 s tell never changes; the time a hero may stand in a false pool before it snaps does.
- **Levels.** The zones are 34 and 37, but the zone level is a floor: monsters track the hero (engine brief §4). On Act V's measured casual profile the hero meets the Skotos at level 46 on Warden (`integrate.md`), so Act VI is met at about 47-50: the cap. Past it, experience goes to Mastery (`docs/progression/README.md`), so **Act VI is where most heroes earn their first Mastery levels**, and its two zones stay a good farm for them. Bosses come out at max(zone + 2 | + 3, hero + 1), as shipped. The scenarios run at L36 and L40 (the bands) and the balance runs at 47-50 (the profile).

### Co-op beneath the ice (up to four)
Co-op is host-led (docs/coop/README.md): the world and the story are the host's; each guest's hero, gear and rewards its own. Act VI gives every one of the four something to do with the light.
- **Every hero's ring is light for everyone,** and the lantern chain rewards keeping close (Carried Fire). Each page drains and fills its own hero's ring; the host's `lightAt` reads each guest's radius from the byte in its presence `h`.
- **Mechanic interacts for guests** (new). The act's fight-and-route interacts become guest-usable through a reliable event the host validates (`[seq, 'u', thing id, the state seen]`: the guest's stand-in within 3 m, the thing in the state the guest saw, at most one every 0.5 s): the hearthstones, braziers, wreck lanterns, the Ketos's bells, whale-oil casks, the lost lights' lanterns, Asger's brazier and Leif's fire. **Act V's cairns and hole lamps join `GUEST_OK` the same way** (coop.js:1348 today holds only chest, shrine and stash): this fixes an Act V gap.
- **What stays the host's:** the story's interacts (the coal, the rope, the First's hearths and their memories, the black lamps and Keyx's lantern, the Sailor's and Leif's names, the ember, the relight, the Gate ring), as every act's do.
- **The names from above, the Black Water and the Mere:** the host's clocks, synced through `w` as Act V's tide is; each page's lanes and wash-outs are its own hero's.
- **The Ketos in co-op:** its Neck Strike aims at the light nearest its target (the hero with the most threat); a guest ringing a bell is valid through 'u'; the "sound" of a skill is every hero's (the host hears a guest's skills through the guest's `f` look calls, which already carry its casts' kinds).
- **The Shade's form 4 in co-op** mirrors the hero it targets, never only the host (Bosses): the host's casts skill by skill; a guest's from a fixed per-class set.
- **Downed in the black water:** a downed hero on a closing cell is moved along the lane to the nearest open cell; she is never left in deep water.
- **Roles the systems invite:** the Warden flares the ring for the party and drops the vault; the Ranger's wolf scouts ahead with its lantern and her shots light casks at range; the Mage holds slush lanes open at the flood and lights packs with fire; anyone keeps a lantern lit against the Ketlings.
- **Protocol:** one bump (coop.js `VER` 3 → 4): the ring byte in presence `h`, the 'u' event kind, Act VI's lit things as bit masks in `l` (the hearthstones, wreck lanterns, braziers and named lamps), the slush and shard cells in the world digest, the shadow-walls and the Heap's gaps through `storyOpenings`. No per-actor visibility bitset (the unseen rule is drawn per page from the host's light). Budget: about +6 to +10 bytes a snapshot (docs/coop byte budget).
- **Scaling:** COOP unchanged.

### Progression beneath the ice (Mastery, variants, later skills)
- **Heroes arrive near the cap** (47-50), so Act VI is where Mastery begins for most of them.
- **A 13th Mastery track, «Λύχνος» / "Lamplight"** (owner question 5): the hero's light ring +% (bonus(r) = max·(1 − e^(−r/k)) with max 50, k 40: rank 1 +1.2%, rank 10 +11%, rank 40 +32%), the wolf's lantern with it. It counts wherever a zone has a carried ring (Acts IV-VI) and says so on its tile; elsewhere it does nothing. It gives the owner's "points with nowhere to go" a stat the act makes worth buying. Respec returns it like the others. IMPL: one row in progression.js's tracks, `FIRE.max` and the Act IV/V ring read it, one tile in progpanel.js, mast.lamp «Λύχνος» / "Lamplight", mast.lamp.d «Η φωτιά που κουβαλάς φωτίζει πιο μακριά (Πράξεις IV-VI)» / "The fire you carry lights farther (Acts IV-VI)". About 0.75-1 d.
- **The class hooks** (Carried Fire, above) touch every skill that makes, carries or uses light or frost; variants keep their base's hook.
- **The Shade's MIRROR** reads every one of the 21 skills (Bosses), so the loadout the progression built is the fight's last form.
- **No enemy takes a button away.** Forgetting that locks skills was cut (Synthesis): the dark drinks the ring instead.

### Touch and phone readability (rules the act keeps)
1. **No new buttons.**
2. **The meter is on the ground.** The Carried Fire is the Cradle's ring itself, already under the hero's feet; Dim pulses it, Out removes it and greys the flame icon. The Cold meter keeps the amber slot (Act V).
3. **True light trembles, false light is still,** by motion, colour and sound together, never by colour alone.
4. **Telegraph palette:** red and orange, harm; sea-green, a pull (the snaps, the Lash, the Shadow Pull); **white circles, ice falling**; **black, the dark's drinking** (a Lampbearer's line, a Black Flare); blue, a safe zone. The Shade's mirror moves are grey-violet, never the hero's skill look, so a player never mistakes the answer for her own cast.
5. **At most two big telegraphs at once,** and the environment (the pools rising, the Mere falling, the vault, a Black Flare) always counts as one. The Shade's mirror waits.
6. **Audio carries timing:** the ice groans before each rise and fall; a bell from above before the names; the lure's pure tone; the Ketos's whale-call before it dives; a black lamp draws breath before its Flare; blind Glaukos says each phase.
7. **Never unfair:** the Black Water keeps Act V's 6 s lane and wash-out; the trail, the road and every true lamp stand on cells that never flood; every fight area has a true lamp within 15 m; Out is lifted by a 1 s touch; fail-safes for both bosses.
8. **The Faded are never invisible where it matters:** footprints and breath show where they walk; within the ring they are solid; their attacks have normal telegraphs (red), drawn at full opacity whatever the light; auto-aim never skips them.
9. **Test at quality 0 and gate at quality 1:** perf6 at q1 under mobile emulation, ≤ the Field's frame time.

### Engine work Act VI needs
An honest list, in build order. Days are focused days for one agent who knows the code, measured as the engine brief measures them. Each item names what it reuses.

**The reuse ledger first**: what Act VI takes from Acts I-V and the progression and co-op lines, and what it adds.

| system | shipped in | lines shipped | Act VI use | new lines |
|---|---|---:|---|---:|
| tide (clock, steps, lanes, wash-out, `TIDE.force`, HUD dial, co-op sync) | game/tide.js | 392 | the Black Water in pockets, the Mere, slush | ~60 |
| Cradle ring, light pools, `lightAt`, `setHeroLight`, `snuffLamp` | game/light.js | 404 | the Carried Fire; true and false light; the chain; the black lamps (snuff inverted) | ~130 |
| Shroud and Reveal | combat.js:243 (Act IV) | | every `unlit` foe in 'deep' zones | ~5 |
| the Cold, its states and its HUD | game/cold.js | 137 | unchanged | 0 |
| slag drips | game/forge.js:136 | 172 | icicles | ~30 |
| water, ice and skin programs | world/sea.js | 1,740 | SEA_BLACK and slush, ICE_VAULT in cines, the Shade's skin | ~70 |
| layout helpers (`walkAt`, reach, refuges, dressing) | world/gen5.js | 1,347 | gen6's base | gen6 ~1,000 |
| the Gates' generators | world/gen.js (`genCrypt`, `genForest`) | 484 | the drowned places, stamped | ~80 |
| Act V props (stilt huts, cairns, braziers, the icy material) | world/build5.js | 1,621 | hearths, keels, stilt frames, wreck lanterns | build6 ~500 |
| boss tables (LORD, WEAVER, brute) and AIs (tether, lurker, melee, ranged, node, burrow) | game/ai.js | 4,528 | the Shade's forms, the Lampbearer, the Icemaw, the Hands, the Falselight's lure | ~700 (two bosses, six traits, one AI) |
| catch-ups, memories, the name parameter, cines, `beaconScene`, `rollNames`, `nightRite` | game/story.js | 1,830 | the act6 block; the names from above | ~650 |
| zone trio (Zone/Enter/Presence), FAR_BEACONS | game/world.js | 1,736 | `act6*`; six peaks | ~280 |
| Mastery tracks, variants, `useSkill` | game/progression.js, skills.js, skillsx.js | | Lamplight; the class hooks; the MIRROR hook | ~90 |
| co-op (tide sync, `MIRROR.rec`, `storyOpenings`, presence, `GUEST_OK`) | net/coop.js | 1,530 | Act VI's rows; guest interacts; Act V's cairns | ~180 |
| people, creatures, packs | frost.glb, rime.glb, act5 and Act I creatures, people.glb | | every model but two | two creatures |

Act V's six new files alone were 5,903 lines (gen5, sea, build5, tide, ice, cold). Act VI's two new files are about 1,500 lines (gen6, build6), and **about 3,600 lines in all are added to shipped modules**.

IMPL:
1. **Sixth-act plumbing (1.5-2 d, low risk).** Generalise rather than copy:
   - **world.js:** `ZONES.drained` and `ZONES.bottom` (`light: 'deep'`, `ring: 4.5`); `READY.silt`; `zonePacks` ('rime' + 'silt'); the first-boss list; the champion chain; the `why` map for `coal6` and `ketosDown`; `ECHO_PROMPT`; the act tests that mean "a late act" (`act >= 4`); seeds `drained@<diff>`, `bottom@<diff>`.
   - **light.js:** the 'deep' kind. **build.js:** an `ACT6` set and `ground6`. **env.js:** `PACK_ORDER` gains 'silt'.
   - **boot.js:** `hero.act6 ??= −1`, `flags.act6`, and the blessing loop at boot.js:82 to 6. **state.js:** `act6: −1`.
   - **story.js:** the questText clamp to 39 with the q34 and q36 counters and the {0} name parameter; `actComplete` branch 6; `offerBoons` over [1..6]; the echo tints.
   - **stats.js:** BOONS[6] ×1.25 when `flags.lostAll`. **panels.js:** waypoints; act6.*; boon.h6; `diffUnlocked` reads act6; the Gate panel's depth line.
   - **hud.js:** questGoal; the flame icon. **viewer.js:** generators for drained and bottom. **creatures.js:** CAST rows (ketos, falselight, the Shade's forms) and `ACT_FILES.act6 = ['louse', 'icemaw', 'tentacle', 'skotos', 'ketos', 'falselight']`. (`extras.keepMat` already ships, creatures.js:69-71: nothing to do there.)
2. **gen6.js, both zones (4.5-5.5 d, medium).** genDrained (with the Mere and both modes) and genBottom on gen5's helpers; `stamp()` for the crypt and forest windows; `L.bed`, `L.pocket`, `L.vault`, `L.keel` and the spots; reach checks at h = 0 and h = 0.9, at the Mere's 0.85, in mode `dry`, and with each shadow-wall opened.
3. **tools/check-act6.mjs (0.75 d).** check-act5's shape: 300 seeds per zone and mode, hard and soft sets, exit 1 on a hard failure; the mean tries per seed.
4. **Visuals (3-3.5 d, low).** `ground6` with the X6 defines; build6.js's prop kinds ('hearth6', 'brazier', 'blackLamp', 'shadowWall', 'keel', 'skylight', 'toppledLight', 'stiltFrame', 'ropeWinch', 'gateRing', 'neckArch', 'hearthStone', 'nameLamp', 'wreckLantern', 'shipBell', 'lurePost', 'garland', 'emberPane'); SEA_BLACK with its slush crust, and ICE_VAULT; the atmospheres (drained, drainedCine, mere, bottom, hearthDark, bottomLit); the fx ambients ('drained', 'bottom', 'thaw'); the marks' decal alpha (`uFireR`); the drowned Instancer grade; the skin on the borrowed models; the blue bird; FAR_BEACONS 7-12. **Every quality-0 path first.**
5. **perf6 and the unload of Acts II-IV (1.5-2 d, low-medium).** The gate scenario (The look). The engine brief §5.4 disposal of Acts II-IV's zones, packs and sets on entering an Act V or VI zone, kept from Brokka's and Elati's sets as long as an Act V cameo can still load them.
6. **The Carried Fire (1.5-2 d, low).** light.js 'deep', `FIRE`, the drains and fills, Dim and Out, the Shroud line, the HUD icon, the lantern chain, `flareRing`, moving pools.
7. **True and false light (0.25-0.5 d, low).** `flicker` and `fake` on the pools; the vibrato and the pure tone.
8. **The Black Water (1.25-1.5 d, low).** tide.js's zone config, per-pocket forcing for the Mere, `slushAt`, the groan.
9. **The Ice Overhead (1-1.25 d, low).** forge.js `drip()`, `vaultAt` at the twelve `crackAt` sites and in monster slams, the shards (batched), the skylights, the monster stun.
10. **The Names from Above (0.5-1 d, low).** The timer, the falling names, the window, `listens`.
11. **AIs and traits (2.5-3 d, low-medium).** `drinker`, `unseen` (opacity, no bar, the aim preference, footprints), `lightRest`, `listens`, the 'lure' AI, `snuffLamp`, the 'vault' burst, `chores` in the village; the five new defs and the Ketling; the packs.
12. **The class hooks (1-1.5 d, low).** One line each at the shipped hooks, repeated in every variant; `skillsfx` re-run in a 'deep' zone for each class.
13. **Two bosses (6-7.5 d, medium).**
    - The Ketos (2.5-3 d): the KETOS table; the lure stalk node; the false pool and the nearest-light aim; Seared on a true lantern; the forced Mere and its drain; Neck Slam, Exposed and Blinded; the blind phase's sound rule and the bells; the Ketlings; the fail-safes; the death, the arch and the lantern.
    - The Shade (3.5-4.5 d): the relay (form swaps on one life, `G.bossActor` reassigned, the floors and their clocks, a runtime retry from form 3); the form additions (Crown of Shadow, Snuff, Light-webs, Vault Slam, Roar); form 4's opposite-point rule, the 21-row MIRROR table hooked on `useSkill` (skills.js), the co-op target and per-class set, Shadow Lunge, the Flare fail-safe; the skin on each form; the named lamps.
14. **Story (4.5-5.5 d).** Quests 32-38 and the end state 39; the hook with Tamarisk and the forgetting barks; the coal; the rope; the arrival; Glaukos's teaching; the marks; the hearths and memories; the Lost (lights, the Sailor, Asger, Leif and his father); the wreck lanterns and the black-water memory; `ketosWake`; the lantern; the black lamps and Keyx; the ember; the glade; `shadeWake`; the naming cine with the name parameter; Glaukos's rope; the Gate ring's travel to the staff; the home cine with `beaconScene(6, 'peaks')`; the Landing scene; Leif home; Tamarisk's epilogue; the catch-ups; `npcHasNews`; about 265 bilingual lines.
15. **The Lamplight track (0.75-1 d, low; the owner's call).**
16. **The post-game find and the depth line (0.5-0.75 d, low).** Echoes and post-game.
17. **Audio (1.25-1.5 d, low).** Four themes and one variant, the hearth motif, about 16 sound effects (Music).
18. **Assets (3.5-4.5 d; Assets).** The stage-0 provenance gates for the Pistosaur and the Scorpion; ketos.mjs and falselight.mjs (or their no-download fallbacks); pack-silt.mjs with two layers; the look gates of every runtime regrade (the First, the Faded, Keyx, Leif, the Lampbearer, the Shade's forms); CREDITS in its four places.
19. **Co-op (2-2.5 d, medium).** The ring byte and the chain; the 'u' guest-use event and its checks (and Act V's cairns and hole lamps in `GUEST_OK`); the Shade's relay seen by guests (the boss's id and flag in the snapshot's `a`; a form swap is a death not told and a new boss); form 4's target and per-class set; the Ketos's target and bells; the lit things as bit masks in `l`; slush and shards in the world digest; the shadow-walls and the Heap's gaps through `storyOpenings`; protocol 4; a `coop.mjs act6` scenario.
20. **Scenarios (3-3.5 d).** In tools/scenario.mjs:

    | scenario | what it covers |
    |---|---|
    | hook6 | (a) from a q30 save: finish Act V, the hook after the blessing panel, Tamarisk, the coal, the rope. (b) from an Act V-end save in the shipped format without `act6`: the migration and the same walk |
    | catch6 | every row of the catch-up table: set the state just after that flag's save, reload, assert the quest and the scene replayed |
    | drained | the arrival, the Glaukos teach, the marks shown only in the ring, hearth 1 and its memory; a re-entry at high water finds low water; no Faded lands a blow while unseen with the ring above 1.5 m |
    | blackwater | a 20-cycle soak with packs: no actor inside a closed cell, the hero never stuck, the wash-out along its lane, no jump over 3.5 m a frame; slush lanes made and thawed under the hero |
    | carry | the ring soak: never below 0 or above `FIRE.max`; Dim, Out and the 1 s relight; a Lampbearer's death refilling it; no drain while idle; a false pool never refilling it; the chain in a two-page run |
    | lure | the Falselights: the snap after the bait time, the roll escape, Revealed by true light, the lure guttering; no snap inside true light |
    | names6 | the rite's windows below: the refill, the Faded listening, the window's length with 0 and 4 Act V stones; paused in the Ketos's fight |
    | drips | a 10-minute soak in the Keels: falls capped per patch, shards batched (`map.ver` ≤ 4 bumps a second from the shards and slush), a Gate-Fallen kept down under a shard |
    | ketos | all phases; a Neck Strike Seared on a lantern; a Ketling refusing a lantern a hero stands in; the Mere's drain with the hero on the mud; a segment cut and Blinded; a bell rung beside a lit lantern; both fail-safes; the lantern taken; the time-to-kill band |
    | shade | all four forms for each class (CLS=warden, ranger, mage); the opposite-point rule (the shadow within 1 m of its target point); every one of the 21 skills mirrored once (a variant of each base included); the retry from form 3; runs with 0 and 7 named lamps; the time-to-kill band |
    | keyx6 | the village lamp put out with Keyx's lantern; the catch-up with `keyxFreed`; the Landing scene after `act6` |
    | lost6 | the seven Lost, `nineLit` (the farlight glows at full from above), the Sailor with and without his Act V stone, Leif's axe to his father and Leif home, `lostAll` and the ×1.25 |
    | ending6 | the naming, the name in the quest text, the rest, Glaukos's line, the Gate ring to the staff, the home cine with the six peaks, the panels, game.sub6 |
    | cast6 | every model real or its stand-in, in cold sessions starting at the `farlight` waypoint and at the `drained` waypoint |
    | echo6 | both echoes |
    | gate6 | the depth line on the Gate panel; a sleeping forgotten one at tier 10+, freed, «Κάποιος.» in the rite (capped at three); the Gates' play unchanged (a tier's layout and packs match the shipped generator for the same seed) |
    | perf6 | the gate (The look) |

    `window.__act6` in ai.js for what the scenarios read.
21. **Balance (1.5-2 d).** tools/balance-act.mjs extended to Act VI (the zones with their black water, lamps, lures and the names, both bosses with their rules), run on Act V's tree and bot (Warden n 6, Wanderer n 12) at the profile levels, Mastery points spent, and tuned to the bands under Bosses.

**Total: about 42-53 focused days**, assets, story and music included, against Act V's 47-58. The production base alone was 34-43; the grafts cost about 8-10 d (the Ketos over the Gleaner about +1.5 d with its build, the Falselight +1, the story grafts +2.5, the class hooks and slush +1.5, co-op +0.5, the names +0.75, the Lamplight track +1, the post-game find +0.5). On the engine brief's engine-only basis (no assets, story text or music) it is about 32-39 days.

**Ship first:** the plumbing and gen6 with check-act6; the visuals' quality-0 paths and perf6; the Carried Fire with true and false light; the Black Water and the Ice Overhead; then both bosses. The story, both bosses and Keyx's beat survive every cut below.

**If the act runs late, cut in this order (each with its fallback; the first six save about 6-7 d):**
1. The post-game find in the Gates (the depth line stays).
2. The Lamplight track (if the owner has not asked for it).
3. Asger and the Sailor (the Lost become five: four lights and Leif; ×1.25 needs five).
4. The Mage's `.m` lines, the Ranger's wolf lantern beyond r 2, Dawnbreaker's and the Ray of Dawn's moving light.
5. The slush lanes (Frost Nova keeps its shipped freeze).
6. The Faded's footprints (they keep their dim look and breath).
7. The village's `chores` (ordinary Faded packs; Keyx stays).
8. The Shade's MIRROR → a fixed set of three shadow moves per class for every target (saves about 0.5 d).
9. Form 2's Light-webs → the plain WEAVER table.
10. The vault in cinematics → black above.
11. The Drowned Wood's stamp → a second crypt window (one generator twice; Leif's fire and the glade move to the barrow's largest room).
12. The Ketos's download → its no-download body, the Icemaw at ×3.4 with the code lure (the fight is unchanged).

**Never cut:** the ring as the meter; true light trembles and false light does not; the Black Water's lanes; the three memories; the held name «…»; Glaukos calling fights by ear; the Ketos's lure and its three phases; Keyx's lantern; form 4's opposite rule; the name said in the light; Isarn's word and the First's answer; no one staying below alone; the climb home up the Gate; the six peaks.

**Out of the base scope from the start (stretch):**
- **Drowned tiers in the post-game Shadow Gates** (owner question 4): every fifth tier built through gen6's `stamp` and the drowned grade, the Shade's relay as its Guardian and the hero's own shadow from tier 10 on, with the depth readout; about 1.5-2 d plus balance. The Gates' play must not change without the owner.
- A second tide threshold so "pinch keels" lift at high black water in the Keels only, letting the Black Water open routes as it closes others (about 1-1.5 d).
- A thawed reading of the Drained Sea after the act; the Faded Keeper; ambient fish, eels and bone fields; a Brokka and Elati cameo (it would bring back the 88.6 MB cold-start cost); a seventh difficulty; the ember's spoken lines (owner question 2).

## Production plan: stages and gates
Five stages after a short stage 0, each ending in a gate that must pass before the next starts. The lanes in brackets can run in parallel (one agent each), which is how Act V was built (`act5-contract.md`). Each stage's report goes to `docs/act6-briefs/reports/`. Agents keep progress notes and the lead checkpoints often, because the container restarts every few hours (HANDOFF lessons); every agent's prompt says that a message from the owner about something else is not addressed to it.

| stage | days | work | gate |
|---|---|---|---|
| **0. Decisions and look gates** | 2-2.5 | the owner's answers (`owner-questions-el.md`); the owner's phone run of the coast and the Farthest Light, to calibrate perf6; the provenance gates for the Pistosaur and the Scorpion (to verify: licence re-read, reverse-image search, storefront check, saved beside the sources); the runtime regrades in the viewers (the First beside Selna, the Faded beside the Sunken and Keyx, Leif, the Lampbearer, the Shade's four forms, the Icemaw at ×3.4 with the lure as the Ketos's fallback); perf5's Field measured on the gate machine | **G0:** every look gate passes or its fallback is chosen; each download's provenance passes or its no-download body is taken; the owner's go |
| **A. The ground** | 10.5-12.5 | [world] plumbing, gen6 both zones and modes, check-act6; [look] ground6, build6, SEA_BLACK, ICE_VAULT, true and false light, atmospheres and fx, quality 0 first; [engine] the unload of Acts II-IV; perf6 with stand-in packs | **G1:** check-act6, 300 seeds per zone and mode, no hard failure, mean tries ≤ 3; **perf6 ≤ 1.00 of the Field at q1** at all three spots, q0 floor; a cold start's phone texture measured ≤ 100 MB; perf5, coast, farlight, cast5 unchanged |
| **B. Systems and enemies** | 11-13.5 | [systems] the Carried Fire, the Black Water with slush, the Ice Overhead, the Names from Above, the Cold's sources; [combat] the traits, the lure AI, the five defs and the Ketling, the packs, the class hooks; [progression] the Lamplight track (if asked); [assets] the Ketos and the Falselight builds, pack-silt, CREDITS; [net] co-op rows, protocol 4 | **G2:** the carry, blackwater, lure, names6 and drips soaks; cast6 cold; skillsfx in a 'deep' zone for each class; coop act6; new phone texture measured ≤ 16 MB; perf6 again with real packs |
| **C. Bosses and balance** | 8.5-10 | [combat] the Ketos, the Shade; [balance] balance-act runs and tuning | **G3:** the time-to-kill bands on Warden for each class; Wanderer ≥ 60% of Warden; no single blow over 12% of max life on Warden; the whole act's damage ratio over Act V in ×1.2-1.45; coop.mjs bosses with both at two and four players |
| **D. Story, text, music** | 7-9 | [story] quests, cines, catch-ups, the Lost, Keyx, the home cine, the Landing; [text] about 265 lines; [audio] themes and sfx | **G4:** hook6, catch6, keyx6, lost6, ending6, echo6, gate6; two readers proofread every line against text.js's voice; the owner reads the key Greek lines (the naming, Keyx, the peaks, the last line) |
| **E. Release** | 3-4 | every scenario (Acts I-VI, progression, co-op, saves); `npm run build:artifact`; the strict-CSP check on desktop and phone; publish to the same artifact URL with the files map; the web build | **G5:** everything passes; no CSP violation, no untextured model; the owner's phone run of both zones before any Play Store build |

Total about 42-51.5 days by stage, matching Engine work's 42-53.

## Blessings
Three for Act VI: the First's hearth. The header is boon.h6 «Η εστία της Πρώτης» / "The First's hearth", after «Τα φώτα της θάλασσας» (Act V).

**The Lost.** A hero who found and freed all seven of the Lost (`flags.lostAll`), at any time including the post-game, has the Act VI blessing worth ×1.25 (stats.js; the shipped REMEMBERED constant, so no new number; the `.du` lines show the rounded-down values). Unbound still multiplies only BOONS[4], and Remembered only BOONS[5], as shipped. All three use existing stat keys and sit in Act V's power band (two stats each).
- bearer «Η Φέρουσα» / "The Bearer": { area: 12, dmgPct: 10 } (icon 'fire'): +12% area, +10% damage. ×1.25: 15 / 12. — «Ό,τι κουβάλησες ως κάτω, σε κουβαλά τώρα εκείνο.» / "What you carried all the way down now carries you."
- word «Ο Λόγος του Γλαύκου» / "Glaukos's Word": { lifePct: 12, lifeOnHit: 12 } (icon 'shield'): +12% life, +12 life on hit. ×1.25: 15 / 15. — «Κανείς δεν κρατά φως μόνος. Πήγαινε.» / "No one keeps a light alone. Go."
- shade «Ο Ίσκιος σου» / "Your Shadow": { cdr: 8, critDmg: 20 } (icon 'star'): +8% cooldown reduction, +20% critical damage. ×1.25: 10 / 25. — «Ίσκιος θέλει φως. Όσο ρίχνεις ίσκιο, καις ακόμα.» / "A shadow needs a light. While you cast one, you still burn."

## Music
**Four new procedural THEMES in audio.js, one variant and one motif,** in the house style (modal harmony, drones, no samples). Act VI leans on the shipped themes on purpose: the Bottom is where the forgotten things lie, so their music lies there too.

**The hearth motif.** Three low, warm notes, a minor triad rising, as [55, 1.5], [58, 1.0], [62, 3.0] (G, B♭, D). At the relight its middle note rises to B natural (59) and it turns major. It sounds when each of the First's hearths catches; under the naming; and at the relight **in counterpoint with the lantern motif** (Arna's, audio.js `MOTIF`) **and the sea-light motif** (Einar's, Act V): three fires, one chord.

**'drained'.** 50 bpm, no beat, C Aeolian.
- A low bowed drone on C and G; slow drips as soft pitched pings; the vault's groans (Act V's ice-song instrument an octave and a half lower, falling from 600 to 120 Hz) before each rise and fall.
- In a fight, a low taiko every second bar under the strings' ostinato on the root.
- When a hearth is relit, the hearth motif on a soft horn, and a warm chord on the next bar.
- While the names fall, the drone drops out and a single high bell rings each name.

**'ketos'.** 6/8 at 96 bpm, D Dorian: a slow rowing figure in the low strings (a pull on beats 1 and 4, the stroke Keyx sang at the oars), and over it a single held high tone, the lure's, pure and never wavering.
- **Phase 2:** the rowing figure breaks into slams with the Mere's three steps; brass in fourths.
- **Phase 3:** the drums stop; only the rowing figure in pizzicato, the bells (the shipped towerBell pitched up) and a heartbeat remain, so every sound the hero makes is heard.
- On its death the lure's tone stops mid-note.

**'bottom'.** 44 bpm, C Phrygian: a sub drone and near silence, with **the shipped Gate theme ('gate', audio.js) slowed ×0.75 and low-passed** as its bed: the bottom of the Gates plays the Gates' own music, remembered.
- In each drowned place the matching shipped theme comes up through it, slowed and filtered the same way: 'crypt' in the Barrow, 'forest' in the Wood, 'town' in the Village.
- After `firstLit` ('bottomLit'): the drone is gone; the hearth motif on a flute every 16 bars; the 'gate' bed in C major.

**'shade'.** Each borrowed form plays **the shipped Act I 'boss' theme** a fourth lower under a 900 Hz low-pass ("the shadow of it"), with a different lead instrument per form (brass, plucked strings, drums).
- **Form 4:** silence but a heartbeat, the hero's own footsteps echoed 1.2 s late (the MIRROR's sound), and the hearth motif struggling in the bass, one note at a time.
- On the Shade's end, a long held low C.

**'pherousa'** (a variant of 'sealit'; it replaces 'victory' for the end): 60 bpm, C major. The hearth motif harmonised, then the lantern motif and the sea-light motif enter and the three resolve together. As the six peaks catch, one low bell each on the motif's notes; on «Ο Βορράς κοιμάται με τα φώτα αναμμένα.» a held chord.

**Ambients:** 'drained' (drips, distant groans, a faint wind down the rope shaft); 'bottom' (near silence, a high faint hiss of rising black motes); 'thaw' (warm crackle, drips).

**SFX (16 new):** iceGroan, icicleFall, icicleShatter, lampDrink, lampFlare, blackLampOut, fireDim, fireOut, fireRekindle, trueLamp (the crackle with vibrato), falseTone (the pure tone), lureSnap, ketosCall (a long falling whale-call), ketosSlam, shipBell, shadeShift. Reused: splash, the louse sounds, sealBark, skotosRise, iceSing, towerBell (for the Gate ring's waking and the peaks, pitched down).

## Echoes and post-game
**Echo refights,** once a day each, with normal loot and no story consequences:
- **The Ketos:** «Θυμήσου το Κήτος» / "Remember the Ketos", at the neck arch in the dry Mere, after `act6`.
- **The Shade:** «Ρίξε τον ίσκιο σου» / "Cast your shadow", at the Gate ring in the Hearth, after `act6`.
- **Toasts:** echo.rise6 «Ο βυθός θυμάται τη μάχη...» / "The deep remembers the fight..."; echo.done6 «Η ηχώ σβήνει. Ο βυθός θα θυμηθεί ξανά αύριο.» / "The echo fades. The deep will remember again tomorrow."
- **Look:** the Ketos pale (0xd0d8e8 at 1.2, rim 0xe0e8ff); the Shade grey-black (0x1a1c24, rim 0xd0d8ff). story.js's echo branch gains both.
- The echo variants are given under each boss. Levels as the story fights.

**Two Act VI legendaries,** the bosses' first-kill drops (data.js `LEGENDARIES`, `LEG_FROM`, through the shipped `legFrom_<boss>` hook with `leg:`). Their effects are a few lines each in the Carried Fire's code, plus one plain stat each so they are not dead weight outside Acts IV-VI:

| id | name | base | class | what it does | where |
|---|---|---|---|---|---|
| ketosLure | «Το Κόκαλο του Δολώματος» / "The Lure-bone" | amulet | any | +life; your kills inside your ring give back twice the light (+0.4 m a kill), and a Drink, a snap or a Gnaw on you takes half | the Ketos's first kill (`LEG_FROM.ketos`) |
| shadeRing | «Το Δαχτυλίδι του Ίσκιου» / "The Shade's Ring" | ring | any | +critical damage; your Cradle never falls below 1.5 m, and your hits on Shrouded foes outside light deal ×0.5 instead of ×0.3 | the Shade's first kill (`LEG_FROM.shade`) |

**What stays to play.**
- **Two zones that farm well at the cap:** heroes arrive at 47-50, so the Drained Sea and the Bottom are where Mastery levels come; the packs, the Black Water, the lures, the names and the vault keep working on every build.
- **Seeds.** Both zones are procedural on the hero's own seeds, by difficulty; the Bottom's barrow and wood are new crypt and forest layouts each time, like a Gate's.
- **The seven Lost** for the ×1.25 blessing and the brighter Hearth, finishable in the post-game.
- **The Shadow Gates** stay the post-game, opened from Isarn's planted staff, endless tiers, the Gate Guardian, unchanged in play (canon item 18). They gain two small things after `act6`:
  - **The depth line.** The Gate panel and the gate's HUD show gate.depth «Βαθμίδα {0} · {1} οργιές κάτω από τον πάγο» / "Tier {0} · {1} fathoms beneath the ice" (fathoms = 8 + 6 × tier), and the panel's flavour line gate.bottom «Ο πάτος τους καίει» / "Their bottom burns". Players who meet the Gate Guardian now know what it is.
  - **The forgotten in the Gates.** From tier 10, each Gate level has a 12% chance to hold one sleeping, non-hostile Faded by a dead lamp in a side room. Lighting the lamp (1 s, «Άναψε τη λάμπα») frees it: it lifts its veiled face and fades, toast q.gateFound «Κάποιος θυμήθηκε πως ήταν κάποιος» / "Someone remembered they were someone", hero field `gateFound` +1, and «Κάποιος.» joins Selna's rite (at most three in the roll). Nothing else in the level changes: same generator, same packs, same Guardian, same loot. About 0.5-0.75 d. The host's in co-op.
- **Drowned tiers** are written above as a stretch for the owner (Engine work; owner question 4).

**After the act, people keep their word:** Selna's rite opens with «Φέρουσα, η Πρώτη.» and ends with Tern's «Καληνύχτα.»; Alkyone keeps the Landing's rite with Keyx's lantern on the post; Glaukos sits by the Rope camp's brazier by day; Tern rings the rope bell; Tamarisk stays a season in the Lanternglade; Leif carries wood for the peaks; the child says the name; Brokka and Elati have their lines; the six peaks burn every night.

## Risks
- **Continuity checks applied** (canon brief §4 and Act V's list):
  - **The hero never speaks.** Every word the hero "says" is second-person narration: the call into the dark («Φωνάζεις την Πρώτη στο σκοτάδι.»), the name («Λες το όνομά της: Φέρουσα.»), Isarn's word («Της λες τη λέξη που σου άφησε ο Ίσαρν»), Isarn's name («Της λες: ο Ίσαρν.»), the Sailor's name («Του λες...»), the ember («Δεν του λες τίποτα.»).
  - **«Σκότος» stays neuter** (το Σκότος, του Σκότους). Its lines stay lowercase with an opening ellipsis; its "i" follows from its last line in Act V.
  - **No line says "Karthax".** The Skotos is not his servant or his jailer. The ember is never named, never speaks by default, never fights and is never brought back: it goes out (owner question 2).
  - **d.glaukos.r1 is reread, not rewritten:** the sea took the reason, not the name. **d.glaukos.r2 keeps its meaning;** Tern's «Καληνύχτα.» is added after «Σκότος.», not instead.
  - **Act V's cause of the rising stands alone;** Keyx caused nothing.
  - **The First's fire is neither a φρυκτωρία nor a φάρος** (d.isarn.e1 stands): it is «η φωτιά της» / "her fire", her «εστία» / "hearth". The six peaks are hand-lit φρυκτωρίες, lit by Halda's people.
  - **The six peaks:** canon §1.5 and d.isarn.r4 (Decisions). Deepstone and the beacon-tree are not among the seven; Arna's hill is.
  - **The Shadow Gates are explained, never changed** (canon rule 18): same panel, tiers, Guardian and staff; the depth line and the sleeping forgotten are flavour and a find, not a change of play. The Gate ring at the Hearth is one-way and story-only.
  - **Isarn stays dead**, a word passed down; **Brokka and Elati stay home and alive** (d.elati.home.r).
  - **Timeline words:** «πριν από κάθε μνήμη» / "before all memory", «χειμώνες που κανείς δεν τους μέτρησε» / "winters no one counted"; no new number is put on the First's age. Keyx's "seven winters" fits d.stone.keyx and Tern's age (ten; three when his father went). Glaukos's "fifty years" of saying the names fits an old man.
  - **The First wears Selna's body,** as the woman of Ice Memory 1 already does (shipped: actors.js:542 `first: 'selna'`); the two are never in one zone.
  - **No line claims the First recognises Whitecliff's flame.** She recognises a fire that can go out.
  - **Selna and the First are ancient, so no contractions;** Asger is formal; Glaukos, Alkyone, Tern, Tamarisk, Keyx, Leif and the Sailor are folk and use them.
  - Proofread all ~265 new lines against text.js for the house voice.
- **Repetition.** "Relight three things" is the series' rhythm (Act IV's five waylamps, Act V's three sea-lights), and Act VI's hearths could feel like a third round.
  - The hearths are found a new way: by following marks you can see only in your own light, so the Carried Fire is the navigation.
  - q36 turns the verb over: you **put out** the dark's lamps, and the last one by giving a man his own light back.
  - Neither boss fights like Act V's: a blind beast whose lure must lose to a trembling flame, and a shadow that stands opposite you across a fire and answers your own skills.
- **Reused models reading as reused.**
  - **The Shade's forms are Act I's bosses on purpose,** and the story says so: they were always the Gate Guardian's three shapes. The skin patch and the near-black grade make them shadows.
  - **The Faded, Keyx, Leif, the Sailor and Asger** are villagers and the wayfarer under tints and code parts: each checked beside the Sunken and the shorefolk; Keyx must read as the one face.
  - **The Ketos's fallback** (the Icemaw at ×3.4) would read as a big seal: acceptable only as a fallback; the look gate at stage 0 decides.
- **The Faded on a phone.** Unseen enemies can feel unfair.
  - They must step into the hero's ring to strike her: a melee reach of 1.8 m is always inside a 4.5 m ring, so a Faded that hits her is solid, unless she is Out, a short state relit with a 1 s touch.
  - Their footprints and breath show where they walk, their telegraphs are drawn at full opacity, and auto-aim never skips them.
  - The `drained` scenario asserts that no Faded lands a blow while unseen with the ring above 1.5 m.
- **True and false light must read at a glance.** A tremble of ±12% at 6-10 Hz must be visible at the gameplay camera on a phone at adaptive resolution 0.55. The look gate at stage A shows a true and a false pool side by side at q0 and q1; if the tremble is lost, the amplitude goes to ±18% and the sparks stay on at q0. The rule never rests on colour alone.
- **The Ketos's blind phase on touch.** "Every skill sounds" could feel like the game punishing play. The strike lands 0.8 s after the latest sound with a full 1.0 s telegraph, the bells are a 0.5 s touch, and the fail-safe rings one after 45 s. The `ketos` scenario asserts a Seared by a bell in each run.
- **The relay boss.**
  - Swapping `G.bossActor` between forms must never leave two boss actors, or none, for a frame; the `shade` scenario asserts it.
  - **A death in form 3 or 4 restarts the fight at form 3** (runtime only, `G.shadeRetry`, never saved), because a long fight replayed whole from the Barrow Lord is harsh. A quit restarts at form 1.
  - In co-op a form swap is told to guests as the old boss's death not shown plus a new boss: the `coop.mjs bosses` run covers it.
- **The mirror covers every loadout.** 21 skills over three classes (seven each, base and later), 24 variants. MIRROR reads the skill's id, so variants need no rows. The `shade` scenario casts every skill once per class. In co-op it mirrors its target: the host's casts skill by skill, a guest's through the fixed per-class set.
- **Perf on real phones.**
  - perf6 is an estimate until it runs at stage A. SwiftShader shades hidden fragments, and a real GPU may differ either way.
  - The gate is stricter than Act V's (1.00 against 1.15), every saving is a compile-time define (`coast-perf.md` §3), every image has a q0 path, and the owner's phone run is part of G0 and G5.
  - The Mere is the act's widest water (≤ 30% of the view, for one fight, in SEA_BLACK); it has its own perf6 spot.
- **Memory.**
  - A cold start into Act VI is about 89-96 MB of phone texture, under the 110 MB bar.
  - frost.glb measures 30.68 MB against the people line's 30 MB (`assets-built.md`); Act VI adds no scene to it.
  - **Tamarisk in the Lanternglade** loads `frost` in `weep` ad hoc (+30.7 MB there, after the act only). If `weep` with `grove` and `frost` measures over the bar, her epilogue becomes Elati's line alone (d.elati.tam6 «Η Μυρίκη πέρασε από δω. Είπε θα ξανάρθει όταν το βλαστάρι της την ξεπεράσει.» / "Tamarisk came by. She said she'll be back when her sapling's taller than her.") and no model loads.
  - A full run of Acts I-VI stays near 673-678 MB, against the ~1 GB tab ceiling; the unload of Acts II-IV is built in stage A rather than held as a contingency, because a sixth act makes the longest session longer; it frees about 300 MB on a phone when the hero is under the ice.
- **Provenance of the two downloads.** The Pistosaur and the Scorpion were scouted 'ok' for Act V, but every candidate passes the licence re-read, a reverse-image search and a storefront check before download, with the results saved beside the source. The Scorpion was "made for the game All That's Left": the gate also checks that the game does not sell or claim it. Both have a no-download body (the Icemaw at ×3.4; the spider at ×0.8, each with a code lure), and **any doubt takes it** (Decisions).
- **IP hygiene.**

  | avoid | because of | here instead |
  |---|---|---|
  | "the First Flame", "linking the fire", Kindling, the Kiln, a Firekeeper, the Age of Dark, the Abyss | Dark Souls (canon brief §4) | the fire is always «η φωτιά της» / "her fire" or «η εστία της Πρώτης» / "the First's hearth", never a proper noun; the hero relights an old woman's hearth with a coal and lets her sleep; **no one stays below to tend it**: it is held by names said above, a shared watch; nothing is linked, kindled or sacrificed |
  | an anglerfish-like lure as a named monster of another game | (various) | the Ketos is the κῆτος of Greek vases (public domain), with a stalk of bone; «Δολοφέγγης» / "Falselight" is a coinage |
  | a named "Watch", "the watch does not end", the Long Night, the Wall | George R. R. Martin (canon brief §4) | the camps are "the Rope" and "the Well's Foot"; Glaukos's blessing is his "Word"; the act ends the lonely watch rather than naming one |
  | "the Abyss", "abyssal" | the repository's other game, Abyssos | never used; the deep is «ο βυθός» / "the deep", «ο πάτος» / "the bottom" |
  | "Lethe", "Oblivion" as proper names | an Elder Scrolls title; tone | «λήθη» only as a common noun; English "forgetting" |
  | Ungoliant, a devouring darkness that eats light | Tolkien | the Skotos drinks light to stop remembering; it is a force with a new "i", not a spider or a hunger |
  | a dark mirror of the hero as a named boss | a common trope (Dark Link and its kin) | the Shade is the Gate Guardian revealed; its last form is the hero's shadow, cast by a real fire, standing opposite it, which is a rule, not a costume |
  | "Frozen X" enemy names | the elite affix «Παγωμένος» | none |
  | "Keeper", "Warden" as names | canon §5.10's collisions | «Κήτος», «Ίσκιος», «Ξέθωρος», «Δολοφέγγης», «Λυχνοφόρος», «Κητόπουλο» |
  | the halcyon myth told outright | tone | never told: the names and the season rhyme with it (d.hal.1), and a small blue bird flies once |

  «Φέρουσα» is a Nereid's name from Greek myth (public domain), as Act V's Thaleia, Galini, Kymo and Glauke are; «Κήτος» is the Greek word for the sea-monster of myth.
- **The Skotos not fought.** Some players will want a last fight with it. The naming cine shows it rise and sink, its Act V echo still plays every day, and the act's fights are the Ketos and the Shade.
- **Scope.** About 42-53 days, against Act V's 47-58 and the base's 34-43. The ship-first list and the twelve-step cut order are under Engine work; Drowned tiers, the thawed reading, ambient life and a cameo are out of the base from the start.
- **build.js under concurrent edit.** All Act VI visuals live in build6.js; build.js gains only `ground6`, the ACT6 set and the X6 defines, which land after any other agent's work there. sea.js gains two defines.
- **Saves and state.**
  - Every flag is derived on load and saved before its scene, except the three pairs saved together.
  - Test quitting during the hook, between `call6` and `coal6`, during the arrival, between a hearth's flag and its memory, between a wreck lantern and the black-water memory, mid-Ketos with the Mere forced (it refills on reload), mid-lamp, at Keyx's channel, mid-Shade in each form, during the naming, and during the home cine. `hook6`, `catch6` and `keyx6` cover them.
  - Old saves without the flags read as quest 31 with `seaLit`. A hero has one set of flags on every difficulty.
- **Tone.** The dark, the forgotten and a woman alone at the bottom for longer than anyone counted are dark; a man who cannot sleep because he is loved is darker. The ending stays warm: a lantern that still flickers, a name said in the light, Isarn's word reaching the first keeper and her answer that rest is someone else keeping the light, an old blind man climbing home, warm air out of a gate, six fires catching on the peaks, a child who remembers, and a woman saying good night instead of hold on. Every cine is short and skippable.
- **CREDITS.txt additions:** RickStikkelorum (the Ketos, CC-BY 4.0), anthonyvanoo (the Falselight, CC-BY 4.0), or the fallbacks' authors if used; Poly Haven and ambientCG for the two layers (CC0, credited all the same). Everything else is already credited.

## Assets
Every third-party asset Act VI uses, new or reused, with its id, author, licence, what it becomes and its budget. "Phone MB" uses the engine brief's rule (RGBA8 × 1.33 for mips, maps of 1024 px or more halved on phones), and the reused figures are the measured ones from `assets-built.md`. **"To verify" means the source has not been checked for this act yet.** It is checked at stage 0 under Act V's gate before any download (the licence re-read on the download page, a reverse-image search, a storefront check, results saved beside the source).

### Creatures (group `act6`, `ACT_FILES.act6 = ['louse', 'icemaw', 'tentacle', 'skotos', 'ketos', 'falselight']`)
| role | asset | uid / source | author | licence | faces → game | maps | phone MB |
|---|---|---|---|---|---|---|---|
| **the Ketos (boss, new)** and the Ketling (×0.6) | Sketchfab "Pistosaur Animated" | 773667575a264c7baa4ec404115a044b (**to verify**) | RickStikkelorum (ricksticky) | CC-BY 4.0 (to verify) | 16,664 → 16.7k | 1024 d, 512 n | 2.79 |
| *fallback 1* the Ketos | Sketchfab "Pliosaur" | d90f30fd8ae9488ba8186a4572c9cf4f (to verify) | Spinnee | CC-BY 4.0 (to verify) | decimated to ~15k | 1024 d, 512 n | 2.79 |
| *fallback 2* the Ketos | icemaw.glb at ×3.4 with the code lure | shipped | Grace Belt | CC-BY 4.0 | as shipped | as shipped | 0 (resident) |
| **the Falselight (new)** | Sketchfab "Scorpion" | 4c0fd62d33ab4d2592ee0a1d985a480d (**to verify**) | anthonyvanoo | CC-BY 4.0 (to verify) | 7,290 | 512 d, 256 n | 1.74 |
| *fallback 1* the Falselight | Sketchfab "Pseudoscorpion" (a Senckenberg Museum scan by .hapto) | 60a474f1f87040f38e073f87a63b7548 (to verify) | .hapto | CC-BY 4.0 (to verify) | 51k → 6k | 512 d, 256 n | 1.74 |
| *fallback 2* the Falselight | spider.glb at ×0.8, regraded pale, with a code lure | our own build of the shipped spider | as spider.glb's credit | as shipped | as shipped | as shipped | 0 (boot) |
| the Hull-louse | louse.glb (shipped) | 3979c291d1f9454c90851efe291eab60 | ffish.asia / floraZia.com | CC0 1.0 | 2,502 | 512 d, 256 n | 1.74 (resident after Act V) |
| the Icemaw | icemaw.glb (shipped) | 3f4a2090598b4741ac38e0d255ece191 | Grace Belt (neatGrace) | CC-BY 4.0 | 5,316 | 1024 d, 512 n | 2.79 |
| Hands of the Skotos | tentacle.glb (shipped) | 8fcc783af94246a0b8febf424a4b96b9 | CG Daniel Glebinski | CC-BY 4.0 | 3,000 | code material | 0 |
| the Skotos (cine) | skotos.glb (shipped) | f4e2c262ed4e456484f232d6afa99629 ("Cloaked Figure") | MysteryPancake | CC-BY 4.0 | 13,442 | 512 n | 1.39 |
| the Shade's forms 1-3; the Gate-Fallen | barrowlord.glb, spider.glb, troll.glb, skeleton.glb (boot) | Act I's | as credited | as shipped | as shipped | as shipped | 0 (boot) |

**Not loaded in Act VI:** crab.glb, skua.glb and bear.glb (13.6 MB of phone memory on a cold start that Act VI does not pay).

### People (no new set)
| who | scene | set | change |
|---|---|---|---|
| Glaukos, Selna, Alkyone, Tern, Tamarisk, the Sunken, the Lampbearer | glaukos, selna, alkyone, tern, tamarisk, sunken | frost.glb (shipped, 25 textures, 30.68 MB) | none, or code parts |
| the First | selna | frost.glb | a runtime void-ice tint, a code icicle crown and brand |
| the Faded | villager0-2 | people.glb (boot) | a runtime void tint and a code veil |
| Keyx | villager1 | people.glb (boot) | half the void tint, a code beard, the black lamp and his lantern |
| Leif | villager2 | people.glb (boot) | ×0.92, a code hood and axe |
| the Sailor; Asger | villager0; wayfarer | people.glb (boot) | tints; a code hood; Asger behind the keel's icy material |
| the Shade's form 4 | warden, ranger, mage | people.glb (boot) | the skin patch and a near-black grade |
| Halda, Elianthe, the villagers, Leif's father, the child | as shipped | people.glb, frost.glb | none |

*Optional, only if the First fails her look gate beside Selna:* a one-scene set `deep` (folk.mjs --set=deep, recipe 'first' from the 'healer' or 'smith' source with an ANCIENT table and Hair_Long), gated at ≤ 6 measured textures: about 0.3 MB raw and about 6 MB phone. Quaternius Universal Base Characters and Modular Outfits, CC0, already shipped in people.glb and moves.bin; no download.

### Props (pack `silt`, tools/pack-silt.mjs, and the shipped `rime`)
| prop | asset | source | licence | phone MB |
|---|---|---|---|---|
| wrecks, keel-boats, rowboats, broken boats, toppled sea-lights (towerA/B/C), anchors, whale, kelp, barnacle rocks, driftwood, casks, crates, the oil lamp (wreck lanterns, black lamps, lure posts), the shack, icicles, cliffs | the rime pack (shipped, 25 props) | as credited in `src/assets/rime/CREDITS.txt` | CC-BY 4.0 and CC0 1.0 | 24.75 (resident after Act V) |
| the drowned barrow's kit, the village houses, the forest trees, boulders (for keels), the gate ring | Act I's boot sets (kits, env, village, trees) | as credited | as shipped | 0 (boot) |
| bone piles | the shipped skeleton in its 'bonePile' pose, frozen as a static actor | (boot) | as shipped | 0 |
| hearth rings, braziers, black lamps, shadow-walls, keels, stilt frames, the rope and winch, ship's bells, garlands, the ember pane, the neck arch's held pose, the named-lamp niches, the blue bird, the First's crown and brand, beards, hoods, the axe | code (Act V's cairn and stilt-hut builders, the Act I gate prop, models.js) | none | none | 0 |

No new prop is needed. pack-silt.mjs carries only the two layers.

### Ground layers (pack `silt`, d 1024 / n 512)
| layer | candidates (to verify for look and licence) | licence | phone MB |
|---|---|---|---|
| `silt` (the seabed) | Poly Haven `damp_beach_sand` or one of `coast_sand_01`-`05`, regraded dark grey-green in packLayer (engine brief §6.3 lists them as present) | CC0 1.0 (all of Poly Haven) | 2.79 |
| `iceWall` (the vault's sides) | ambientCG `Ice003` or `Ice004` (engine brief §6.3: ambientCG has Ice001-004; Act V ships Ice002) | CC0 1.0 | 2.79 |
| reused | `rime/shore` (Poly Haven low_tide_rocks), `rime/ice` (ambientCG Ice002) | CC0 1.0 | (resident after Act V) |

Plus code textures: none new (the 256² noise and the decal canvases are shipped).

### Kenney, Quaternius, Poly Pizza
- **Quaternius (CC0):** used, through the shipped people.glb and moves.bin (every person and the Shade's last form). Its stylised monster packs are not used: they would not sit beside the scanned creatures.
- **Kenney (CC0):** not used. Its kits are stylised and the HUD's one new icon is drawn in code.
- **Poly Pizza:** not used. It aggregates low-poly CC-BY and CC0 models whose style does not match, and each would need the same provenance gate for no gain.

### Totals for the act
| | raw | phone GPU |
|---|---|---|
| new: the Ketos | about 0.8-1.0 MB | 2.79 MB |
| new: the Falselight (0 with fallback 2) | about 0.35 MB | 1.74 MB |
| new: two layers | about 0.5 MB | 5.58 MB |
| optional: the `deep` set | +0.3 MB | +6 MB |
| **new, total** | **about 1.7-2.2 MB (≈ 2.2-2.9 MiB of artifact)** | **about 8.4-16.1 MB** |
| a cold start into Act VI (rime pack and layers 41.5, frost 30.7, the act6 group 10.5, the silt layers 5.6, code 0.4) | | **about 89-96 MB** (budget 110) |
| after a run through Act V | | **+8.4-16.1 MB** |
| a full run of Acts I-VI | | **about 673-678 MB** (about 375 MB with the unload of Acts II-IV) |

Act V added about 10 MiB to the artifact and about 93 MB of phone texture. Act VI adds about a quarter of the first and a tenth to a sixth of the second.

## Asset audit
- ketos 773667575a264c7baa4ec404115a044b ok=gated lic=CC-BY 4.0 (to verify): the boss's one download, Act V-scouted 'ok' ("own sculpt, no duplicate found"). Gate: the licence re-read on the download page; a reverse-image search of the thumbnail; a storefront check (Fab, CGTrader, Unity Asset Store); no AI-generation flags; the results saved in /tmp/claude-0/sf/act6. | REPLACEMENT: Pliosaur by Spinnee (CC-BY 4.0, to verify), then the shipped Icemaw at ×3.4 with the code lure (no download).
- falselight 4c0fd62d33ab4d2592ee0a1d985a480d ok=gated lic=CC-BY 4.0 (to verify): "made for the game All That's Left (own work)"; the same gate, plus a check that the game does not sell or claim it; any doubt takes fallback 2 from the start. | REPLACEMENT: the .hapto Pseudoscorpion (CC-BY 4.0, a museum scan, to verify), then spider.glb ×0.8 with a code lure (our own build).
- shade forms (barrowlord, spider, troll; people.glb warden, ranger, mage) ok=True lic=as shipped: boot-loaded. Look gate under the skin patch. | REPLACEMENT: none needed; the plain near-black tint without the patch.
- faded, keyx, leif, sailor, asger (people.glb villagers and wayfarer) ok=True lic=CC0: runtime tints and code parts. Look gate side by side. | REPLACEMENT: none needed.
- lampbearer (frost 'sunken' + rime oilLamp) ok=True lic=CC0: no new texture. | REPLACEMENT: none needed.
- first (frost 'selna') ok=gated (look) lic=CC0: must read apart from Selna. | REPLACEMENT: the optional `deep` set (CC0 Quaternius sources).
- gateFallen (skeleton.glb) ok=True: boot-loaded. | REPLACEMENT: none needed.
- hullLouse, icemaw, tentacle, skotos ok=True: shipped in Act V, credited. | REPLACEMENT: their shipped stand-ins.
- layers silt, iceWall ok=gated (look) lic=CC0 1.0 (to verify): Poly Haven and ambientCG sources resolve through their APIs (both reachable through the proxy, engine brief §6.3). | REPLACEMENT: rime/shore and rime/ice at other scales and tints.
- Downloaders: Act V's (Sketchfab API v3 with `$SKETCHFAB_API_TOKEN`, Poly Haven, ambientCG) are reused; sources go to /tmp/claude-0/sf/act6 and /tmp/claude-0/ph, never into the repository.

## Synthesis: base, grafts and fixes
**The base.** Both judges put the production proposal first (39.25 and 39), so it is the base with no tie to break: its two zones on one gen6.js, its three mechanics as shipped systems with one new input each, its Shade of the Gate, its Pherousa, its perf bar and budget, its unload in stage A, its stage gates. Where the judges disagreed, Decisions (above) says what was chosen and why.

**Must-fix items in the base, and how each is fixed.**

| must-fix (judge) | fix | where |
|---|---|---|
| The MIRROR table claimed 21 rows but covered 17 skills; fireball, frostorb, rift and beam missing (2) | 21 rows, one per skill, by class, with new answers for the four (Shadow Bolt, Shadow Orb, Shadow Pull, Shadow Ray) and for bulwark, dawn, trap and vault | Bosses (shade) |
| The 3:30-5:00 and 6:00-8:00 time-to-kill targets could not hold (1, 2) | bands from Act V's measured curve, anchored as Act V measured them (Decisions) | Bosses |
| The Dark Souls ending: a keeper stays at the bottom to tend the fire (2) | Glaukos climbs home; the First answers Isarn's word with «Η ανάπαυση είναι να κοιμάσαι κι άλλος να κρατά το φως.»; the fire is held by the names said above | ending; Risks (IP) |
| `prepare()` honouring `extras.keepMat` already ships (2) | dropped from the work list | Engine work 1; The look row 13 |
| The Gleaner is a dull first boss (1) | the Ketos (Decisions) | Bosses |
| The Stiltwalker still "to be verified" (1, 2) | the Falselight, with a no-download body on any doubt | Enemies |
| Keyx, Tern and Act I's threads unpaid (1, 2) | Keyx's lantern and his release; Tern's «Καληνύχτα.» and the rope; Leif; the six peaks | beats; ending |
| The Gates' play untouched; no Mastery sink (1) | the depth line and the find in the base, Drowned tiers for the owner; the Lamplight track | Echoes and post-game; Progression |
| Guests cannot light the stones or braziers (coop.js:1348) (2) | guest-use events, and Act V's cairns and hole lamps too | Co-op |
| Shroud ×0.3 outside a 4.5 m ring punishes the Ranger (2) | the wolf's lantern r 3.5 (5 for the Alpha), the hawks' and the trap's lit targets, casks broken at 22 m, the lantern chain | Carried Fire (class hooks) |
| The mirror copies only the host's casts (1) | form 4 targets one hero at a time and mirrors that hero; a fixed per-class set for a guest | Bosses; Co-op |

**Grafts, and where each landed.**

| graft (judge) | where | adapted how |
|---|---|---|
| The Ketos replaces the Gleaner, in a black mere; its three phases; Ketlings snuff lamps; the Gleaner's light rule passed on (1) | Bosses (ketos); Zones (E) | the Mere is inside the Wreck Heap, over the Well; phase 2's drain is the Skotos breathing in; Forgetting stacks replaced by ring drain; Glaukos calls it by ear |
| True and false light, by motion, colour and sound; the proverb (1, 2) | Mechanics (true and false light); The look rows 7-8 | every light in the act is one of the two kinds; false pools never refill the ring |
| The Falselight replaces the Stiltwalker (1) | Enemies | the snap drains the ring; no-download body on doubt (2's rule) |
| Keyx's thread: Black-Water Memory 1 at the lair; his lantern found and carried up; Alkyone's line at the Landing; the blue bird (1); one Faded keeps his face, light frees him, he walks into the black water (2) | beats q35-q36; ending, After the act | one beat: he holds the village's black lamp, and his own lantern puts it out |
| The hook's forgetting at home, reversed at the end (1) | beats q32; Lines at home | the Skotos's hunt for names pulls them down the nearest Gate |
| The seven peaks ending; Tamarisk's custom and Halda's «Εφτά. Οι έξι σβηστές.» (1, 2) | beats q32; ending, Home | six peaks (Decisions); «Κοίτα βόρεια.» in Halda's mouth; then «Από πολύ βαθιά...» and the last line «Ο Βορράς κοιμάται με τα φώτα αναμμένα.» |
| Leif, the woodcutter's son (1, 2) | beats q36 (the Drowned Wood); Lines at home | in the wood (2's place); people.glb villager2 |
| Asger and the Sailor join the Lost Lights as one optional set (1) | the Lost (Mechanics) | seven in all; each leaves a named lamp at the Hearth |
| The ember in the ice (1) | beats q36 (the Drowned Barrow) | narration only by default; the spoken lines for the owner |
| Names from Above (1, 2) | Mechanics (the Names from Above) | the Drained Sea only (2), 5 s + 0.5 s a Name-stone (2), the ring refills and the Faded listen (1, 2) |
| Tamarisk's Ranger line and her Lanternglade epilogue (1) | beats q32; ending, After the act | she brings Selna's word in the hook |
| The class-hook table; variants inherit (1, 2) | Carried Fire (class hooks) | 2's subset plus 1's frost-freezes-water (slush lanes) |
| The Lamplight Mastery track (1, 2) | Progression | behind the owner's word |
| Co-op: guest-usable interacts, every ring is light, the lantern chain, form 4 mirrors its target (1, 2) | Co-op | protocol 4 without a visibility bitset |
| Drowned tiers in the Gates (1) | Engine work (stretch); owner question 4 | the depth readout is in the base as flavour |
| The "forgotten in the dream" find (2) | Echoes and post-game | "the forgotten in the Gates": the Gates are her fire's shadow here, not the Skotos's dreams |
| Boss kill-time bands from Act V's curve (1, 2) | Bosses | anchored as measured (Decisions) |
| Exploration pays off at the boss: named lamps at the Hearth (1) | Zones (F); Bosses (shade); the Lost | seven lamps of r 3, tuned to save 10-15% of the fight |
| The Elianthe garland glade (1, 2) | beats q36 (the Drowned Wood); Lines at home | |
| The halcyon narration, Tern's «Καληνύχτα.», game.sub6 (2) | beats q32; ending | the Skotos's last line «...κουράστηκα...» and it sinks "like something falling asleep" |
| «Κανείς δεν απαντά» at shadeWake (2) | beats q37 | |
| The Dark Souls guard, the First's line on rest (2) | ending | |

**Cuts honoured** (both judges' lists): the Gleaner and the Stiltwalker; the base's kill-time targets; Glaukos staying below; Keyx as a boss and Tern as a follower or escort; Forgetting that locks skill buttons (and its two-button Wave), and the Forgetter's silencing; the rite reread as a lullaby, the Gates as the Skotos's dreams, Keyx's open hand as a cause of the rising, and the First's untold name; the Brooder, the hush set, the beam from above, the ink cells and the gate with no number; No One, Charybdis, «Φαρώ», the Breathing Ice keels (kept only as a stretch threshold), the tier zones and their Deepstone packs; the untargetable "unseen" rule and its visibility bitset; the full 17-row systems hook table beyond the subset.

## What this design deliberately does not do
- No new rendering system, no render target, no post-processing, no ceiling in play, no full-screen water, no reflection, no beams sweeping the floor.
- No new people scene, no people set loaded beyond `frost` (and `frost` in `weep` after the act, for Tamarisk), and no folk or grove load (Act V's 88.6 MB cameo cost stays in Act V).
- No thin ice (ice.js idle), no aurora sky in play.
- No enemy that takes a button away, and no foe that cannot be aimed at.
- No change to how the Shadow Gates play, and no relocation of Isarn's staff.
- No third fight with the Skotos, and no keeper left alone at the bottom.
- No Blender step: every build is the Node pipeline of Acts II-V (engine brief §6.1).
