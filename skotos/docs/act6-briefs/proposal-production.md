# Act VI: Beneath the Ice (proposal: production-first)

«Πράξη VI: Κάτω από τον Πάγο» / "Act VI: Beneath the Ice". Latin V and I, as canon §5.6 sets for IV and V.

This is one of the competing proposals for the act the owner chose. It is written from production outward: the act that can really be built in the time an act takes, run at frame rate on a phone, and ship on the Play Store with clean assets. Every system, model and generator it uses is named with the file it comes from. What is new is small and listed with its source and licence, each marked "to be verified" where the source has not yet been checked.

Act VI begins from a save at quest 31 (`seaLit`, `h.act5 >= 0`). The Skotos has been named and has sunk beneath the ice. The Farthest Light burns Whitecliff's fire, the sea-lights answer down the coast, and every night Selna says the names at the tower. Her rite still opens with a hole: «Η Πρώτη, που τ' όνομά της το πήρε η θάλασσα.» / "The First, whose name the sea took." (d.glaukos.r1). In the post-game Alkyone has already promised the player this act: «Οι πύλες σας δεν έχουν πάτο, λέτε; Έχουν. Είναι κάτω από τον πάγο μας.» / "Your gates have no bottom, you say? They do. It's under our ice." (d.alk.gates)

**The act in one paragraph.** The Farthest Light stops turning and flashes three times toward Whitecliff, and cold air rises out of the Shadow Gate at Isarn's staff. At the Light, Selna has seen a small fire burning far below the clear ice where the Skotos sank, and it is guttering. The Saltborn have melted a hole through the ice with whale oil. Under it there is no sea: the Skotos drank it to go down, and left a dry seabed under a vault of ice. The hero takes a coal from Einar's light, climbs down the rope with blind Old Glaukos, and follows the marks of a woman who went down there before all memory with a brand in her hand. She is the First. She gave her name away to hide from the dark, because «Ό,τι έχει όνομα δεν κρύβεται» / "What has a name can't hide" (d.alk.b3). The fire she has kept at the bottom for longer than anyone has counted throws its shadow up through the dark, and that shadow is the Shadow Gates. Past the Gleaner, a giant scavenger that eats what the world has forgotten, the hero reaches the bottom of the Gates. There the drowned barrow, wood and village lie that every Gate copies. At the First's hearth the Gate Guardian is waiting, the one met at the end of every Gate, now seen for what it is: the Shade of her fire. It wears the Barrow Lord, the Weaver and the troll, and last of all the hero's own shape. Dying, it gives the hero the First's name. The hero relights her fire with Whitecliff's coal. The Skotos rises at the edge of the black water to hear the name, and the hero says it in the light: «Φέρουσα» / "Pherousa", she who carries, the word inside «φλογοφέρε», "fire-bearer", which the North has called the hero since Act III. Said in the light, it is a name the dark cannot take, and the Skotos sinks. The hero gives the First Isarn's last word, «Ξεκουράσου.» / "Rest.". Glaukos stays below to keep her fire, and the hero climbs home up the Gate and steps out beside Isarn's staff in Whitecliff, where warm air is rising.

**Why this act, from the production side.**
- **It is cheap to draw.** The gameplay camera never sees a ceiling (pitch 0.95 rad, engine brief §0.2), so an under-ice act draws a floor, walls and a few black pools. It has none of the full-screen water, aurora reflection and wet sand that put the coast at 1.17-1.20 of the Field of Ash's frame on the software renderer (HANDOFF; `coast-perf.md` §1). Its target is **≤ 1.00 of the Field at quality 1**, stricter than Act V's 1.15. See The look.
- **It is cheap to load.** It runs on the shipped `rime` pack, the `frost` people set, four `act5` creatures and the boot-loaded Act I models. On a cold start into Act VI it is about 86-93 MB of phone GPU texture against the 110 MB bar. After a run through Act V it adds only **about 7.4-15 MB**, so a full run of Acts I-VI stays near 670 MB (Assets).
- **It is cheap to build.** It needs one new generator (`gen6.js`, both zones), no new rendering system and one new download (a creature, gated, with a no-download fallback). The estimate is **34-43 focused days**, against Act V's 47-58. Engine work itemises it.
- **It ties the post-game to the story** without changing how the Gates play (canon rule 18). It explains why every Gate is a crypt or a forest (they are shadows of the drowned barrow and wood at the bottom, which is literally `genCrypt`/`genForest`, world.js:135) and why the Gate Guardian is a Barrow Lord, a Weaver or a troll (boot.js:240: they are the Shade's borrowed shapes).

**Scope** (the owner's frame is Act V's):
- **2 zones**, one new generator `src/world/gen6.js`:
  - `drained`, «Η Στεγνή Θάλασσα» / "The Drained Sea", level 34: the dry seabed under the ice beneath the Farthest Light.
  - `bottom`, «Ο Πάτος των Πυλών» / "The Bottom of the Gates", level 37: the drowned barrow, wood and village, the Shadow Stair and the First's Hearth.
  - The levels keep the +3 cadence (engine brief §4).
- **7 regular enemy entries (8 kinds), one new model:**
  - reused unchanged from Act V: the Sunken, the Hull-louse, the Icemaw;
  - new kinds on shipped models: the Sunken Lampbearer (the `sunken` frost scene with the rime oil lamp in code), the Faded (people.glb villagers under a runtime void tint), and the Gate-Fallen with their bowmen (the boot-loaded skeletons, rimed);
  - one new download: the Stiltwalker, a giant sea spider (gated; fallback: the boot-loaded spider).
- **2 bosses, no download:**
  - «Αποφάγισσα, η Μάνα των Ψειρών» / "The Gleaner, Mother of Lice": the shipped CC0 isopod scan (`louse.glb`) at ×5.5, whose ten clips (curl, roll, uncurl, spawn...) are its moves;
  - «Ο Ίσκιος της Πύλης» / "The Shade of the Gate": four forms in a row on one life bar, three of them the boot-loaded Act I bosses with their own boss tables (barrowlord, the Weaver's spider at ×2.6, the troll), the fourth the hero's own class body (people.glb) in black.
- **Quests 32 to 38;** the new end state is **39**.
- **3 mechanics**, each an existing system with one new input:
  - the Carried Fire (Η Φωτιά που Κουβαλάς): the Cradle's ring (light.js) becomes a resource the dark drinks and the fires refill, with Act IV's Shroud (combat.js:243) for the Skotos's creatures;
  - the Black Water (Το Μαύρο Νερό): tide.js in pockets, as the Skotos's breath;
  - the Ice Overhead (Ο Πάγος από Πάνω): forge.js's slag drips (forge.js:136) as falling icicles, and light pools as skylights.
  - The Cold (cold.js) carries over unchanged. There is no thin ice, so ice.js does not run in Act VI zones.
- **A world-state chain:** `call6` → `coal6` → `drainedSeen` → `hearth6_1..3` → `gleaner` → `blackLamp0..2` → `shadeDown` → `firstLit` (with `nameBack`) → `homeGate` → `act6`. Optional: `lost0..3` → `nineLit`.
- **Also:**
  - four optional Lost Lights, the missing four of Glaukos's nine (d.glaukos.2). They are the Drowned Lights that already glow under the Farthest Light's ice in Act V (gen5.js:1145-1167, `uGlow`). Relighting all four makes the Act VI blessing worth ×1.25, and their glow brightens from above;
  - three blessings, two echoes, two first-kill legendaries;
  - three new themes and two variants, a hearth motif;
  - co-op rows for the new state;
  - the unload contingency of engine brief §5.4, promoted from contingency to stage A (Risks).
- **Budget:** about 0.9-1.6 MB raw of new files (≈ 1.2-2.2 MiB of artifact) and about 7.4-15 MB of new phone texture (itemised under Assets).

**Production in one idea: reuse the systems, not the pictures.** Act VI changes what the shipped systems mean, not what they are:
- the Cradle's ring becomes the fire you carry;
- the tide becomes the dark's breath;
- the slag drips become ice falling from the vault;
- the Gate Guardian becomes a character;
- the Shadow Gates' two generators become places you walk through.

The new code is mostly data and rules over systems that already pass their scenarios. The new pictures are few and small.

---

## Story
### premise
**At quest 31.** Act V left three things in the post-game that point down:
- Selna's rite, every night at the Farthest Light, opens with the First, «που τ' όνομά της το πήρε η θάλασσα» / "whose name the sea took" (d.glaukos.r1). Nobody knows that name.
- When the Skotos was named, «It sinks. The hole freezes clear in a white wave from the tower.» (act5-design, ending). The ice over the place where it sank is clear. You can see down.
- Alkyone's d.alk.gates says the Shadow Gates have a bottom, under the Saltborn's ice.

Act VI explains all three with one woman.

**Who the First was** (Ice Memory 1, shipped: d.ice.i1.1-4). Before all memory a woman lit a fire on a rock with wood the waves brought in. Her people gathered round it and said each other's names. «Φως στο νερό, για να μείνει το νερό νερό.» The dark drew back under the sea, and the sea froze over it. «Δεν φεύγει. Περιμένει να ξεχάσουν.» / "It does not leave. It waits for them to forget." Act VI adds what the memory left out: she knew it would wait, so she took a brand from her fire and went down through a crack in the new ice, to be under it when they forgot. Before she went, she told her people not to say her name, because what has a name cannot hide, and she meant to hide from the dark. They were to say only «η Πρώτη» / "the First". After more winters than anyone counted, they still said it. The sea did not take her name. It took the reason.

**What she has done since.** At the bottom she lit a fire on a stone and kept it. The dark circled her and could not find her, because she had no name. Light above (her people's lights and names), light below (her fire), and between them the water stayed water. That is the creed whole, though the Saltborn only ever said its first half.

**Why the Gates exist.** «Ίσκιος θέλει φως.» / "A shadow needs a light." Her fire, burning under the dark, throws shadows up through it. Where the dark is thin they reach the world as passages: the Shadow Gates.
- They opened «στα βουνά» / "in the mountains" (d.isarn.r5) when the beacons failed and the dark rose: the higher the dark, the longer the shadows.
- Every Gate is a crypt or a forest because the shadows are cast by what lies at the bottom, the drowned barrow and wood that everything forgotten sinks to.
- The Gate Guardian is her fire's shadow too: the Shade, wearing the North's oldest fears (the Barrow Lord, the Weaver, the troll) to keep anyone from following the light down to her. Anyone might be the dark wearing a face.
- «Όσο πιο βαθιά πας, τόσο πιο πολύτιμα αυτά που φέρνεις πίσω.» / "The deeper you go, the richer what you bring back." (d.isarn.after): nearer the fire, the shadows are sharper and the forgotten things older.
- The Gates "have no bottom" because no one who went down ever found it. They do have one (d.alk.gates). It is her hearth.

**What has gone wrong.** When the Skotos was named it sank, the only way it knew: down. It drank its way down through the sea beneath the Farthest Light, leaving a dry seabed under a vault of ice and black water in the deepest hollows, and it came to rest near her fire. Since the naming it has an "I" (d.skotos.die2 «...ναι... αυτό... είμαι...»), and a thing with a name has learned the rule of names: whoever has a name can look for the others. It cannot find her, because she has none. But it can drink the fire it hears, and the fire is guttering. If it goes out, the Gates close (no shadow without light), and nothing holds the dark from below. Above, the Saltborn's lights would be holding it alone, the half of the creed they still remember.

**The hook.** On the night after the act, the Farthest Light stops turning, faces Whitecliff and flashes three times: a call. Out of the Gate at Isarn's staff comes cold air that smells of the sea. At the Light, Selna has been seeing, for three nights, a small fire far below the clear ice. Each night, when she says «Η Πρώτη», it trembles less.

### villain
**Το Σκότος / the Skotos**, named: the same force as Act V, one step further. A neuter noun, as canon requires (το Σκότος, του Σκότους, στο Σκότος). It is never called an abyss, an Old One or a Long Night, and the word "Abyss" stays away from it because the repository's other game is Abyssos.

**What it is now.** In Act V it had no wish, no face and no "I". Naming gave it an "I", and an "I" brought something it never had: memory.
- It remembers now, and remembering hurts it. Act V's place voice said «...πονάει μόνο όποιος θυμάται...» / "...only those who remember hurt..."; now that is its own complaint.
- It has learned the rule the Saltborn used against it: what has a name cannot hide. So it hunts names. Every name Selna says at night falls through the clear ice to where it lies, and it learns them all. One is missing: the first.
- Its aim is simple: find the one who hides, by her name, and drink her fire. It does not hate her. It wants to stop hurting. It would rather forget again, and her fire is what keeps it remembering.

**Its voice** (rules continued from Act V):
- floating `say` lines in a pale ice colour over the ice-song sound, **lowercase, opening with an ellipsis**;
- **it now says «εγώ» / "i"** (lowercase in English too), since its last line in Act V was its first "I";
- it never threatens; it complains, bargains, asks; its word is still «κανείς» / "no one", now joined by «το πρώτο» / "the first";
- the dialog portrait stays npc.skotos's black disc.

**What it does in play.**
- It drank the sea under the Farthest Light, leaving the Drained Sea.
- Its breath raises and lowers the black water in the hollows (the Black Water).
- It drinks light: the Sunken Lampbearers carry its lanterns, and the black lamps of the drowned tiers burn with light it drank.
- Its Hands (the shipped `skotosHand`, tentacle.glb) rise from the pools on the Shadow Stair.
- At the end it rises from the black water at the edge of the First's Hearth to hear her name, and it is not fought.

**What it never does.** It grants no wishes, never takes over Karthax, never uses a living person's voice, and never names the ember king. No line in Act VI says "Karthax". It is not killed and not fought as a boss in this act: Act V's fight with it stands, and its echo still plays.

**The Shade (Ο Ίσκιος της Πύλης)** is the act's boss, not its villain. It is the First's fire's shadow, the keeper of her hiding. It is the same thing every player has met at the end of every Shadow Gate as the "Gate Guardian" (gate.guardianName). It guards, in the shape of whatever the comer fears, because anyone who comes down might be the dark wearing a face. It is not evil, and it has no words of its own (see Bosses).

### twist
Three blows at three points in the act, each built from shipped lines.

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

**3. Her name is the word the North has called the hero all along (q38, at the Hearth).**
- «φλογοφέρε» / "fire-bearer" is how Elati, Ivar, Amaranthe and the Voice addressed the hero (canon §2.2).
- The First's name is **«Φέρουσα» / "Pherousa"**, an old sea-name (one of the Nereids) that means "she who carries". It shares its root with φλογο-φέρος.
- When the hero says it in the light of her relit fire, she answers: «Φέρουσα. Αυτή που κουβαλά. Έτσι με έλεγαν. Κι εσένα σε φωνάζουν έτσι, φλογοφέρε.» / "Pherousa. She who carries. That was my name. And they call you so as well, fire-bearer."
- It also gives Act V's blessing quote its fullest meaning. boon.name.q «Ένα όνομα που λέγεται κάθε βράδυ δεν το παίρνει το σκοτάδι.» / "A name said every night, the dark cannot take." She says it back, and asks to be said every night up there.
- And the Saltborn custom d.alk.a3 «Απαντάμε μόνο σε φωτιές που μπορούν να σβήσουν.» / "We only answer fires that can go out" turns out to be hers: the first thing she says on waking is that a fire which trembles is not the dark's.

**Nothing is retconned.**
- d.glaukos.r1 stays true as said: the sea "took" what the Saltborn lost, the reason. Act VI never says the line lied.
- Ice Memory 1 stands whole; Act VI's memories continue it ("Her fire burns on the rock, and below it the sea sets into ice").
- The Shadow Gates play exactly as they do (canon rule 18). Their lore is explained, their machinery untouched.
- Every φρυκτωρία is still the brow-stone's fire (d.isarn.e1). The First's fire is older than both the beacons and the sea-lights, and is neither: it is called «η φωτιά της» / "her fire", or «η εστία της Πρώτης» / "the First's hearth", never a beacon or a φάρος, and never a proper noun (see Risks: IP hygiene).
- No line claims she recognises Whitecliff's flame or that the flames match. She recognises a fire that can go out.
- Isarn stays dead, Karthax unnamed, Brokka and Elati at home.

**Old lines that read differently afterwards** (no line changes):
- d.isarn.r5 and d.isarn.after: the Gates opened and "have no bottom" because no one had followed the light down.
- d.alk.gates «Μη φοβάσαι. Κρατάμε το φως από πάνω.» / "Don't be afraid. We keep the light above it.": the Saltborn kept the light above; someone kept the light below.
- gate.guardianName «Φύλακας της Πύλης» / "Gate Guardian": the Shade.
- d.ice.i1.3 «Φως στο νερό, για να μείνει το νερό νερό.»: half of a creed whose other half (Memory 3) is «Φως από πάνω. Φως από κάτω.».
- d.staff «Ξεκουράσου.» / "Rest.": the last keeper's word reaches the first keeper.
- Every «φλογοφέρε» in Acts III-V.

### ending
**The Shade falls** (end of q37; flag `shadeDown`, saved first):
- d.shade.die1 «Ο ίσκιος γυρίζει στα πόδια σου, εκεί που ήταν πάντα.» / "The shadow goes back to your feet, where it always was."
- d.shade.die2 «Πριν σωπάσει, σου λέει ένα όνομα στο αυτί. Δεν το λες ακόμα.» / "Before it falls still, it says a name into your ear. You don't say it yet."
- Toast q.nameHeld «Κρατάς ένα όνομα: {0}» / "You hold a name: {0}". {0} is «…» until `nameBack`: the shipped forgotten-name parameter from Act V (story.js questText), now hiding a name the player has not yet heard instead of one forgotten.

**The relight** (q38, interact at the Hearth «Ξανάναψε τη φωτιά της» / "Relight her fire", 2.0 s; flag `firstLit` and `nameBack` saved first; cine `naming6` at pitch 0.3):
- d.firstlit «Βάζεις το κάρβουνο της Κούνιας στην πέτρα της. Η φωτιά του Άρνα και του Έιναρ πιάνει στη φωτιά της.» / "You set the Cradle's coal on her stone. Arna's and Einar's fire catches in hers."
- The figure curled by the stone lifts its head; black ice falls from her face as the fire grows.
- The First: d.first.1 «Φωτιά που τρέμει... Δεν είναι δική του. Εκείνο δεν φτιάχνει φωτιές που σβήνουν.» / "A fire that trembles... It is not its. That thing makes no fires that can go out."
- Mage only: d.first.1.m «Και η φλόγα σου έμαθε κάποτε από τη δική μου. Το Τάγμα σου το θυμάται ακόμα;» / "And your flame learnt from mine, once. Does your Order still remember?" (pays off d.alk.a5.m; `rl()` already reads `.m`, story.js:84)
- At the rim of the black water the Skotos rises (its shipped model at ×3.2, clip `rise`, waist-deep in the pool): d.skotos6.n1 «...εκεί ήσουν... τόσο κοντά... πες μου πώς σε λένε...» / "...there you were... so close... tell me what you are called..."
- The First, to the hero: d.first.2 «Τώρα. Στο φως. Πες το.» / "Now. In the light. Say it."
- Narration (the hero never speaks): d.name6 «Λες το όνομά της: Φέρουσα.» / "You say her name: Pherousa." The quest text's «…» becomes Φέρουσα.
- d.first.3 «Φέρουσα. Αυτή που κουβαλά. Έτσι με έλεγαν. Κι εσένα σε φωνάζουν έτσι, φλογοφέρε.» / "Pherousa. She who carries. That was my name. And they call you so as well, fire-bearer."
- The Skotos: d.skotos6.n2 «...φέρουσα... το είχα... σχεδόν... ειπωμένο στο φως... δεν το κρατάω...» / "...pherousa... i almost... had it... said in the light... i cannot hold it..." It sinks (clip `sink`). The black water goes still and her fire flares white-gold.
- d.first.4 «Ένα όνομα που λέγεται κάθε βράδυ δεν το παίρνει το σκοτάδι. Πείτε το εκεί πάνω. Κάθε βράδυ.» / "A name said every night, the dark cannot take. Say mine up there. Every night." (boon.name.q)
- Glaukos comes down the Stair, feeling the warmth: d.glaukos.e1 «Φέρουσα... Πενήντα χρόνια λέω τα ονόματα, και το πρώτο το έλεγα λάθος.» / "Pherousa... Fifty years I've said the names, and I said the first one wrong."
- d.first.5 «Είμαι κουρασμένη, γέρο. Τόσο κουρασμένη.» / "I am tired, old man. So tired."
- d.glaukos.e2 «Τότε κοιμήσου. Εγώ θα την κρατάω. Είμαι τυφλός. Εδώ κάτω όλοι είναι.» / "Then sleep. I'll keep it. I'm blind. Down here, everyone is." (it closes his line from q33)
- Narration d.rest6 «Της λες τη λέξη που σου άφησε ο Ίσαρν: Ξεκουράσου.» / "You tell her the word Isarn left you: Rest."
- d.first.6 «...Ξεκουράσου. Καλή λέξη. Ποιος σου την έμαθε;» / "...Rest. A good word. Who taught it to you?"
- Narration d.rest6b «Της λες: ο Ίσαρν. Μα εκείνη κοιμάται ήδη, πλάι στη φωτιά της, για πρώτη φορά.» / "You tell her: Isarn. But she is already asleep beside her fire, for the first time."
- Big toast q.firstLit «Η φωτιά της Πρώτης καίει ξανά» / "The First's fire burns again". q38b.

**The way home** (q38b «Ανέβα από την πύλη στον Λευκόβραχο» / "Climb up through the gate to Whitecliff"):
- At the Hearth's south rim the ring of black stone, the Gates' bottom, wakes with warm light. Narration d.gate6 «Ο ίσκιος της φωτιάς ανεβαίνει πάλι τα σκαλιά του. Πολύ ψηλά, ένα ραβδί περιμένει.» / "The fire's shadow climbs its stairs again. Very high above, a staff is waiting."
- Interact «Ανέβα από την πύλη» / "Climb the gate", the Act I portal action (boot.js:171), travels to town at Isarn's staff. Flag `homeGate`.

**Home** (on arrival, cine at pitch 0.3 on the beacon hill; `beaconScene(6, 'gate')`):
- The hero steps out of the Gate at Isarn's staff with rime falling from her (the portal fx in reverse). Ember motes rise from the ring.
- Halda: d.halda.gate «Βγήκες από την πύλη ανάποδα. Και κοίτα: βγάζει ζέστη. Πρώτη φορά στη ζωή μου.» / "You came out of the gate the wrong way round. And look: it's giving off warmth. First time in my life."
- The child (the frost `tern` scene in the village tint, as in Act V's ending): d.child.7 «Η πύλη μυρίζει τζάκι τώρα.» / "The gate smells of a hearth now." (mirrors the hook's d.child.6 «Η πύλη μυρίζει θάλασσα.»)
- d.answer6.1 «Από την πύλη δίπλα στο ραβδί του Ίσαρν ανεβαίνει ζεστός αέρας, σαν από τζάκι.» / "From the gate beside Isarn's staff warm air rises, as from a hearth."
- On the northern horizon the sea-lights flash again in their 12 s rhythm.
- The act's last line: d.answer6.2 «Από πολύ βαθιά, μια φωτιά απαντά.» / "From very deep, a fire answers."
- actComplete(6), then offerBoons(6):
  - «Πράξη VI — Ολοκληρώθηκε» / "Act VI — Complete" (Latin VI);
  - act6.sub «Μια φωτιά από κάτω, κι ένα όνομα από πάνω» / "A fire below, and a name above";
  - act6.next «Οι Σκιοπύλες σε περιμένουν. Ο πάτος τους καίει.» / "The Shadow Gates await. Their bottom burns."
- End state q.39 «Η φωτιά της Πρώτης καίει ξανά, κι ο Βορράς ξέρει τ' όνομά της. Οι Σκιοπύλες σε περιμένουν.» / "The First's fire burns again, and the North knows her name. The Shadow Gates await."

**After the act.**
- **Selna's nightly rite** (the shipped 90 s ambient `say` chain at the Farthest Light) now opens d.selna.r6 «Φέρουσα, η Πρώτη.» / "Pherousa, the First." and goes on as before. Through the clear ice a small warm glow answers.
- **At the Landing** Alkyone keeps the rite in Glaukos's place: d.alk.r6 «Φέρουσα, η Πρώτη. Θάλεια. Κήυκας.» / "Pherousa, the First. Thaleia. Keyx.", then «...για να μην κρυφτεί. Σκότος.»
- **Glaukos** stays at the Hearth as its keeper (vendor). d.glaukos.again6 «Ξύλα, λάδι, κουβέντα. Εδώ κάτω φτάνουν.» / "Wood, oil, talk. Down here, that's enough."
- **The Gate panel** shows one flavour line, gate.bottom «Ο πάτος τους καίει» / "Their bottom burns". The Gates play exactly as before.
- **Whitecliff:** the staff's Gate gives off ember motes; the child's bark d.child.bark6 «Φέρουσα. Αυτή που κουβαλά.» / "Pherousa. She who carries."

### beats
- q32 [town] q.32 «Πήγαινε στον Έσχατο Φάρο: σε φωνάζουν» / "Go to the Farthest Light: they are calling you".

**The hook.**
- **Who sees it:** a save with `h.act5 >= 0`, quest 31 and `seaLit`.
- **When:** on the next town entry. For a hero finishing Act V after the update, 2 s after the Act V blessing panel closes ('actClosed'), as Act V hooked on Act IV.
- **What happens** (flag `call6` saved first; cine at pitch 0.3 from the beacon toward the north):
  - The three sea-lights low on the horizon (FAR_BEACONS[4-6], Act V's) stop flashing and hold steady (farFire's `flash` period held at 0). FAR_BEACONS[3], the Farthest Light, dims and pulses three times, slowly (a scripted triple pulse on `userData.k`), then burns steady.
  - d.call6.1 «Στον βορρά, ο Έσχατος Φάρος σταματά να γυρίζει. Κοιτάζει εδώ, και αναβοσβήνει τρεις φορές.» / "In the north, the Farthest Light stops turning. It looks this way, and flashes three times."
  - The camera turns to Isarn's staff. Cold mist pours from the ground at its foot (fx 'seasmoke' emitter, shipped), and the staff rimes over (a tint on its mesh).
  - d.call6.2 «Από το ραβδί του Ίσαρν, εκεί που ανοίγουν οι Σκιοπύλες, βγαίνει κρύος αέρας, σαν από πηγάδι.» / "From Isarn's staff, where the Shadow Gates open, cold air rises, as from a well."
- **Barks** (no model loads beyond Act V's ad hoc `frost` in town):
  - Halda: d.halda.call «Τρεις φορές. Δεν είναι για καράβια αυτό. Φωνάζουν εσένα.» / "Three times. That's not for ships. They're calling you."
  - the child (Act V's q30 child, the `tern` scene in the village tint): d.child.6 «Η πύλη μυρίζει θάλασσα.» / "The gate smells of the sea."
  - Elianthe: d.elianthe.call «Πάρε κάτι ζεστό μαζί σου. Από εκείνη την πύλη δεν βγήκε ποτέ ζέστη.» / "Take something warm with you. No warmth ever came out of that gate."
- **New act5.next:** «Πράξη VI: Κάτω από τον Πάγο. Ο Έσχατος Φάρος σε φωνάζει.» / "Act VI: Beneath the Ice. The Farthest Light is calling you."
- **help.p1** needs no change (Act V made it generic: «Όποιος περιμένει δίπλα στη φρυκτωρία του χωριού σού λέει πού να πας.»). The quest line and questGoal point at the `farlight` waypoint.
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
- d.alk.v1 «Τρεις μέρες λιώναμε τον πάγο με λάδι. Από κάτω δεν είναι θάλασσα, φρυκτωρέ. Είναι άδειο. Το Σκότος την ήπιε για να κατέβει.» / "Three days we melted the ice with oil. There's no sea under it, beacon-keeper. It's empty. The Skotos drank it to go down." (Act V: fire melts ice; the Skotos drinks.)
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
- The Skotos, faint, with no speaker name (its first line of the act): d.skotos6.1 «...σε θυμάμαι... ήσουν εκεί όταν μου έδωσαν όνομα...» / "...i remember you... you were there when they gave me a name..."
- Glaukos, at the rope's foot: d.glaukos.d0 «Το άκουσες; Θυμάται. Πριν δεν θυμόταν τίποτα.» / "You heard it? It remembers. Before, it remembered nothing."

**The Rope camp** (waypoint `drained`): the rope's foot under a shaft of green light, a brazier lit from the hero's Cradle on arrival, Glaukos (vendor: whale oil, rope, ordinary items) and Tamarisk (healer, vendor).
- Tamarisk: d.tam.v1 «Κατέβηκα πριν από σένα. Κάποιος πρέπει να γιατρεύει όσους ξανανεβαίνουν.» / "I came down before you. Someone has to mend the ones who climb back up."
- Ranger: d.tam.v1.r «Αδελφή. Πάλι στο σκοτάδι, εσύ κι εγώ. Τουλάχιστον εδώ κάτω δεν βρέχει.» / "Sister. In the dark again, you and me. At least it doesn't rain down here."
- d.tam.again6 «Πάρε ό,τι χρειάζεσαι. Εδώ κάτω το αλάτι έχει ξεραθεί, μα ακόμα τσούζει.» / "Take what you need. Down here the salt has dried, but it still stings."
- **Glaukos teaches the Carried Fire** (one dialog, sets q34):
  - d.glaukos.d1 «Η γιαγιά έλεγε πως όπου στάθηκε, έλιωσε τον πάγο με τη δαυλό της. Τα σημάδια φαίνονται μόνο στη φωτιά. Κράτα τη δική σου κοντά.» / "Grandmother said wherever she stopped, she melted the ice with her brand. The marks only show by firelight. Keep yours close."
  - d.glaukos.d2 «Κι άκου: εδώ κάτω το σκοτάδι πίνει. Τη θάλασσα την ήπιε. Θα πιει και την Κούνια σου. Γέμιζέ τη σε κάθε φωτιά που βρίσκεις.» / "And listen: down here the dark drinks. It drank the sea. It'll drink your Cradle too. Fill it at every fire you find."
  - First-time hint hint.carry.

- q34 [drained] q.34 «Ακολούθησε τα σημάδια της Πρώτης ως τις εστίες της ({0}/3)» / "Follow the First's marks to her hearths ({0}/3)". Progress toast q.hearthLit «Μια εστία της Πρώτης καίει ({0}/3)» / "One of the First's hearths burns ({0}/3)".

**The marks.** A trail of brand-scorched, melted-smooth patches on the seabed rock: ground decals (the shipped decal pool) whose alpha follows the Carried Fire's ring, **visible only inside the hero's ring** (`uFireR` in the decal shader, one smoothstep). A bigger ring shows more of the trail: the mechanic is how you navigate. The trail runs on always-dry cells (gen6 hard check), so the Black Water never hides it. questGoal points at the next hearth regardless, so no hero is ever lost.

**Each hearth** (interact kind 'hearth6', Act V's 'hearth' prop kind with a ring of black stones, build5.js):
- «Ξανάναψε την εστία» / "Relight the hearth", a 1.5 s channel from the Cradle; a hit worth 10% of max life interrupts it.
- Once lit: a warm pool of r 6 (lamp light: refills the Cradle, drains Cold, Shroud reveal), a respawn checkpoint (`z.checkpoint`), saved in `flags.cp6` like Act V's cp5.
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
- d.glaukos.d4 «Κι όσο καίει, έχουν πάτο. Πάμε να τον βρούμε. Από το Πηγάδι, πέρα από τον Σωρό των Καραβιών.» / "And while it burns, they have a bottom. Let's go and find it. Down the Well, past the Wreck Heap."
- Cine `gleanerWake` (flag saved first; pitch 0.5 over the Wreck Heap; it waits for `mem_d1`-`mem_d3`): the heap of wrecks shifts, and something pale and plated the size of a boat backs out of a hull, chewing. d.heap.1 «Ο Σωρός σαλεύει. Κάτι μεγάλο τρώει ανάμεσα στα κόκαλα.» / "The Heap stirs. Something big is eating among the bones."
- Then q35.

**The Skotos in the Drained Sea** (place voices, z.voices, one per area, lowercase, with "i" now):
- w1 «...εγώ ήμουν η θάλασσα εδώ... την ήπια... τώρα έχω πού να σταθώ...» / "...i was the sea here... i drank it... now i have somewhere to stand..."
- w2 «...μου έδωσαν όνομα... κι από τότε θυμάμαι... πονάει να θυμάσαι... πώς το αντέχετε;...» / "...they gave me a name... and since then i remember... it hurts to remember... how do you bear it?..." (Act V's w2 was "only those who remember hurt")
- w3 «...όποιος έχει όνομα ψάχνει τα άλλα... ένα μου λείπει... το πρώτο...» / "...whoever has a name looks for the others... i am missing one... the first..."
- w4 «...εκείνη κρύβεται... ακούω τη φωτιά της... δεν ακούω τ' όνομά της...» / "...she is hiding... i hear her fire... i do not hear her name..."
- w4.r «...κι εσύ, παιδί του δάσους... ξέρεις πώς είναι να σε στέλνουν μακριά για να κρυφτείς...» / "...and you, child of the wood... you know what it is to be sent away to hide..." (d.tear.nursery.1)

**Optional: the Lost Lights (Τα Χαμένα Φώτα).** Glaukos said «Οι παλιοί είχαν εννιά φάρους απ' το Αμόνι ως την άκρη του πάγου.» / "The old ones had nine lights from the Anvil to the edge of the ice." (d.glaukos.2). Five burn now (the Grey, the Wreck and the Fall Lights, the Skerry Light and the Farthest Light). The other four lie toppled on the Drained Sea's floor: the Drowned Lights that glow up through the Farthest Light's ice in Act V. Each is a rime tower prop laid on its side (towerA/B/C, `extras.top` reused for the lantern end) with a lantern niche.
- Interact «Άναψε τον χαμένο φάρο» / "Light the lost light", 1 s. Its lantern becomes a lamp-light pool r 4 (Cradle refill, Shroud reveal), and its keeper's line plays as a toast-dialog. The id is appended to `h.flags.lost` in the order lit.
- Toast q.lost «Χαμένα φώτα: {0}/4» / "Lost lights: {0}/4". All four set `flags.nineLit`: toast «Εννιά φάροι καίνε: η ευλογία του βυθού δυναμώνει» / "Nine lights burn: the deep's blessing grows stronger", and the Act VI blessing is worth ×1.25 (Blessings).
- **The lines are written already.** Act V's design kept four stretch Name-stone lines ready and never shipped them (act5-design, "Stretch, out of the base scope"). Three fit the lost lights unchanged, and one is new:
  - d.stone.galini «Γαλήνη. Έσβησε τον φάρο της για να μη βλέπει τη θάλασσα που της πήρε τα παιδιά. Τη συγχωρέσαμε.» / "Galini. She put out her light so she wouldn't see the sea that took her children. We forgave her."
  - d.stone.twins «Γλαύκη και Κυμώ. Δίδυμες. Κατέβηκαν μαζί στον πάγο να του πουν τ' όνομά του. Γύρισε η μία.» / "Glauke and Kymo. Twins. They went down onto the ice together to say its name. One came back."
  - d.stone.kranea «Κρανιά. Ήρθε από το δάσος, παιδί ακόμα, πριν από εκατό χειμώνες. Δεν είδε ποτέ ξανά φθινόπωρο.» / "Kranea. She came from the wood, still a child, a hundred winters ago. She never saw another autumn." (+ .r «Κρανιά. Ήρθε από το δάσος, παιδί ακόμα. Τ' όνομά της είναι χαραγμένο και στις πέτρες του δικού σου δάσους.» / "Kranea. She came from the wood, still a child. Her name is cut in the stones of your wood too.")
  - new: d.stone.psamathe «Ψαμάθη. Κράτησε τον Φάρο της Άμμου ώσπου η άμμος τον σκέπασε. Είπε πως θα τον ξεθάψει την άνοιξη.» / "Psamathe. Kept the Sand Light till the sand covered it. She said she'd dig it out in spring."
- After `nineLit`, the farlight zone's drowned glows (`uGlowOn`, shipped) burn at full from above: one uniform, no layout change.
- They can be finished in the post-game.

- q35 [drained] q.35 «Νίκησε τη Μάνα των Ψειρών στον Σωρό των Καραβιών» / "Defeat the Mother of Lice at the Wreck Heap".

**Boss: the Gleaner, Mother of Lice** (see Bosses). Glaukos calls the fight from the Heap's rim, **by sound, because he is blind**. Each line is also the phase's audio tell:
- Phase 1: d.glaukos.g0 «Την ακούω. Τρώει ό,τι ξεχάστηκε. Κόκαλα, καράβια. Μην την αφήσεις να φάει τους νεκρούς σου. Στάσου από πάνω τους με τη φωτιά!» / "I can hear it. It eats what's been forgotten. Bones, ships. Don't let it eat your dead. Stand over them with your fire!"
- Phase 2: d.glaukos.g1 «Τα πόδια της σώπασαν! Κουλουριάζεται! Φέρ' τη στο νερό ή στα σκαριά!» / "Its feet went quiet! It's curling! Bring it to the water or the hulls!"
- Phase 3: d.glaukos.g2 «Άλλαξε δέρμα. Τώρα πίνει φως. Γέμισε την Κούνια στα μαγκάλια!» / "It's shed its skin. Now it drinks light. Fill your Cradle at the braziers!"

**Death.** It curls one last time and does not open; its husk becomes part of the Heap, the place of its echo.
- d.heap.die «Η Αποφάγισσα κουλουριάζεται μια τελευταία φορά και δεν ξανανοίγει.» / "The Gleaner curls one last time and does not open again."
- The Skotos: d.skotos6.2 «...έφαγε τόσα... κανείς δεν θα τα θυμάται... εσύ όμως θυμάσαι... γιατί;...» / "...it ate so much... no one will remember it... but you remember... why?..."
- Flag `gleaner` (saved first). Toast «Το Πηγάδι άνοιξε» / "The Well lies open". q36.

**The exit:** `{ to: 'bottom', label: 'exit.well', locked: 'gleaner' }` at the Well's mouth behind the Heap. Shut line d.wellShut «Κάτι μεγάλο τρώει στο στόμιο του Πηγαδιού. Δεν περνάς.» / "Something big is feeding at the Well's mouth. You can't pass."

- q36 [bottom] q.36 «Σβήσε τις μαύρες λάμπες των πνιγμένων βαθμίδων ({0}/3)» / "Put out the black lamps of the drowned tiers ({0}/3)". Progress toast q.lampOut «Μια μαύρη λάμπα έσβησε ({0}/3)» / "A black lamp has gone out ({0}/3)".

**Arrival cine at the Bottom** (pitch 0.25 from the Well's foot):
- d.bottom.1 «Το Πηγάδι βγάζει σε έναν βυθό πιο βαθύ από κάθε βυθό. Εδώ στέκονται μέρη που ξέρεις: ένας τύμβος, ένα δάσος, ένα χωριό. Μαύρα και βρεγμένα, σαν να τα ξέχασε κάποιος εδώ.» / "The Well opens onto a bottom deeper than any seabed. Here stand places you know: a barrow, a wood, a village. Black and wet, as if someone forgot them here."

**The Well's Foot camp** (waypoint `bottom`): a ledge where the Well comes down, an old Saltborn fire-pit that Glaukos lights from the hero's Cradle. Glaukos:
- d.glaukos.b1 «Εδώ καταλήγουν όσα ξεχνάτε στον νότο. Ό,τι σκεπάζει το Σκότος, έρχεται εδώ να ησυχάσει.» / "This is where what you forget in the south ends up. Whatever the Skotos covers comes here to lie still." (Act V's d.alk.b4: "Whatever it covers, the world forgets: ships, lights, people.")
- d.glaukos.b2 «Οι πύλες σας τ' αντιγράφουν. Κάθε φορά που ανοίγει μια Σκιοπύλη, ένα απ' αυτά ρίχνει τον ίσκιο του ως εκεί πάνω.» / "Your gates copy them. Every time a Shadow Gate opens, one of these throws its shadow all the way up there." (This is the lore for world.js:135: every Gate is `genCrypt` or `genForest`.)
- d.glaukos.b3 «Και τρεις μαύρες λάμπες κρατούν τη σκάλα κλειστή. Καίνε με φως που ήπιε. Σβήσ' τες.» / "And three black lamps keep the stair shut. They burn with light it drank. Put them out."

**The drowned tiers** (one per area of the zone, in any order):
- **The Drowned Barrow (Ο Πνιγμένος Τύμβος):** crypt rooms stamped from `genCrypt`, Act I's dungeon kit rimed, Gate-Fallen packs.
- **The Drowned Wood (Το Πνιγμένο Δάσος):** a `genForest` patch of black, leafless trees standing in the black water, Stiltwalkers and the Faded.
- **The Forgotten Village (Το Ξεχασμένο Χωριό):** Act I village houses half-sunk and leaning; the Faded go about chores that no one remembers (they are dormant at their chores, `chores`, until the hero's light touches them), with a Lampbearer.

**Each black lamp** stands at the far end of its tier, before a wall of black shadow that closes the way to the Shadow Stair (a blocked band of cells, opened with `map.open` like the Forge's slag plug):
- A code lantern on a pole: an iron cage holding a flame drawn as a dark sprite with a violet rim (an additive sprite with a subtractive-looking core: a black-violet texture under normal blending, no light source).
- **Its inversion is the act's one new verb: «Σβήσε τη μαύρη λάμπα» / "Put out the black lamp", a 2.0 s channel.** A hit worth 10% of max life interrupts it. It is the shipped `snuffLamp` (light.js) aimed the other way: Act IV's Smoke-eaters snuffed the hero's lamps; here the hero snuffs the dark's.
- While she channels, the lamp pulses a **Black Flare** every 4 s: a black teleCircle r 4, 1.2 s, then 0.8× and Cold +15, and her Cradle's ring −1 m.
- The tier's champion pack guards it: a Gate-Fallen Captain, a Stiltwalker matriarch, a Faded Elder (elite affixes as usual).
- **When it goes out,** the light it drank comes back: the hero's Cradle refills to full in a white burst, the shadow-wall thins away over 2 s (fx), and the cells open. The lamp's id goes into `flags.blackLamp<k>`.
- **The Skotos answers each one,** and its answers raise the stakes, because snuffing the lamps opens the way for it too:
  - first: d.skotos6.l1 «...αυτό ήταν δικό μου...» / "...that was mine..."
  - second: d.skotos6.l2 «...σβήνεις φώτα τώρα;... εσύ;...» / "...you put out lights now?... you?..."
  - third: d.skotos6.l3 «...τη βλέπω... τη φωτιά της... δεν θα κρύβεται για πολύ...» / "...i see it... her fire... she will not hide much longer..."
- After the third, Glaukos: d.glaukos.b4 «Του ανοίξαμε κι εκείνου τον δρόμο. Γρήγορα, πριν φτάσει πρώτο.» / "We've opened the way for it too. Quickly, before it gets there first." Then q37.

**The Skotos in the Bottom** (place voices):
- w5 «...εδώ κάτω τα κρατάω όλα... κανείς δεν τα ζητάει...» / "...down here i keep everything... no one asks for it back..."
- w6 «...ένας βασιλιάς, ένας ιστός, ένα χωριό... τα ξέχασαν... εγώ όχι πια...» / "...a king, a web, a village... they forgot them... not i, not any more..."
- w7 «...ποιος σου έμαθε να κουβαλάς φωτιά;... κάποια σου το έμαθε... κάποια πολύ παλιά...» / "...who taught you to carry fire?... someone taught you... someone very old..." (foreshadows blow 3)

- q37 [bottom] q.37 «Νίκησε τον Ίσκιο της Πύλης στην Εστία της Πρώτης» / "Defeat the Shade of the Gate at the First's Hearth".

**The Shadow Stair (Η Σκάλα των Ίσκιων)** runs down from the three tiers to the Hearth: terraces drawn as visual height only (every walkable cell stays at y = 0, engine brief §0.1). The Hands of the Skotos rise from its pools as hazards (`skotosHand` nodes, the shipped model and AI, at most 2 at once, with Act V's Hand Rise and Sweep). Sunken climb the terraces.

**The Hearth** (cine `shadeWake`, flag saved first; pitch 0.35):
- On a stone in the middle a fire burns low. A figure of black ice lies curled beside it.
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

**Lines at home** (talk variants on flags; no model loads, so folk.glb and grove.glb stay out of the act):
- Brokka in the Halls, after `call6`: d.brokka.v3 «Λένε πως κάτω από τον πάγο του βορρά καίει μια φωτιά πιο παλιά από τη Βαθύπετρα. Οι Λιθογενείς δεν ξεχνούν, ξένε. Μα αυτή δεν την ξέραμε ποτέ.» / "They say under the northern ice a fire burns older than Deepstone. The Stoneborn don't forget, stranger. But that one we never knew."
- Brokka, after `firstLit`: d.brokka.v4 «Φέρουσα. Ωραίο όνομα για σιδερά. Αυτή που κουβαλά.» / "Pherousa. A good name for a smith. She who carries."
- Elati in the Lanternglade, after `firstLit`: d.elati.v3 «Μια φωτιά από κάτω, κι όχι από πάνω. Οι ρίζες το ήξεραν πάντα, φλογοφέρε.» / "A fire from below, not from above. The roots always knew that, fire-bearer." (+ .r «...Οι ρίζες το ήξεραν πάντα, αδελφή.» / "...The roots always knew it, sister.")
- Halda after `firstLit`: d.halda.v6 «Βγάζει ζέστη η πύλη. Ζέσταμε τα χέρια μας εκεί όλο το βράδυ.» / "The gate gives off warmth. We warmed our hands there all evening."

**Catch-ups on zoneEnter** (the Act IV and V pattern; a flag saved before its scene is caught up quietly):

| flag | catch-up |
|---|---|
| `call6` | → 32 |
| `coal6` | → 33b; the exit at the hole unlocks |
| `drainedSeen` without the Glaukos teach | replay d.glaukos.d1-d2, then → 34 |
| more hearths lit than `mem_d1`-`mem_d3` seen | the lit hearth offers «Θυμήσου»; questGoal points at it |
| `hearth6_1`-`3` and `mem_d1`-`d3` all set | d.glaukos.d3-d4 and `gleanerWake`, then → 35 |
| `gleaner` | → 36 |
| `blackLamp0`-`2` all set | the Stair's wall opens on build; → 37 |
| `shadeWake` without `shadeDown` | the fight starts again from form 1 |
| `shadeDown` without `firstLit` | → 38; the name stays «…» |
| `firstLit` (saved with `nameBack`) without `homeGate` | replay the naming card if unseen; → 38b |
| `homeGate` without `h.act6` | home cine, then → actComplete(6) |

Quitting mid-cine never strands a save. A Black Water cycle, a black lamp's channel or a boss form in progress is runtime-only; zones rebuild from the seed.

**Cached zones.** Both zones are built once and kept in `G.zones`. Act VI never relies on build time alone:
- the rope hole and its exit on the Light's Skerry are laid by `act6Presence` on every farlight entry;
- the Stair's shadow-walls are opened in `act6Enter` from the `blackLamp<k>` flags on every entry, as well as at build;
- the Black Water keeps its state on the zone (`z.tide`) and `act6Enter` restarts its clock at low water on every entry, as `act5Enter` does;
- `enterZone` passes `fresh: true` for 'bottom' when `bottomMode()` ('dark' before `firstLit`, 'lit' after) differs from `z.mode`.

**New text keys beyond the lines above** (Greek first):
- **Zones:** zone.drained «Η Στεγνή Θάλασσα» / "The Drained Sea", zone.drained.s «Εκεί που ήπιε τη θάλασσα» / "Where it drank the sea"; zone.bottom «Ο Πάτος των Πυλών» / "The Bottom of the Gates", zone.bottom.s «Εκεί που καίει η φωτιά της Πρώτης» / "Where the First's fire burns".
- **Exits:** exit.rope «Το σκοινί κάτω από τον πάγο» / "The rope beneath the ice"; exit.ropeUp «Ανέβα από το σκοινί» / "Climb the rope"; exit.well «Το Πηγάδι» / "The Well"; exit.gateUp «Ανέβα από την πύλη» / "Climb the gate"; d.ropeShut, d.wellShut (above); d.stairShut «Ένας τοίχος από ίσκιο κλείνει τη σκάλα.» / "A wall of shadow closes the stair."
- **Waypoints:** wp.drained «Το Σκοινί» / "The Rope"; wp.bottom «Η Ρίζα του Πηγαδιού» / "The Well's Foot".
- **Toasts:** q.hearthLit, q.lampOut, q.lost, q.nameHeld, q.firstLit (big) (above); q.black «Το μαύρο νερό ανεβαίνει» / "The black water is rising"; q.fireOut «Η Κούνια έσβησε» / "Your Cradle has gone out"; q.fireBack «Η Κούνια ξανάναψε» / "Your Cradle burns again".
- **Prompts:** «Πάρε ένα κάρβουνο από τον Έσχατο Φάρο»; «Ξανάναψε την εστία» / "Relight the hearth"; «Άναψε τον χαμένο φάρο» / "Light the lost light"; «Σβήσε τη μαύρη λάμπα» / "Put out the black lamp"; «Ξανάναψε τη φωτιά της» / "Relight her fire"; «Άναψε την πέτρα» / "Light the stone" (the Hearth's four stones); «Θυμήσου» / "Remember".
- **HUD:** hud.dim «Η Κούνια λιγοστεύει» / "Your Cradle is low"; hud.out «Σβηστή» / "Out"; hud.rekindled «Ξανάναψε» / "Rekindled"; hud.unseen «Κρυμμένος» / "Unseen". Hints: hint.carry «Το σκοτάδι πίνει την Κούνια σου. Γέμισέ τη σε κάθε φωτιά.» / "The dark drinks your Cradle. Fill it at every fire."; hint.black «Όταν βογκάει ο πάγος, το μαύρο νερό ανεβαίνει» / "When the ice groans, the black water rises"; hint.drip «Τα βαριά χτυπήματα ρίχνουν πάγο από πάνω» / "Heavy blows bring ice down from above"; hint.unseen «Οι Ξέθωροι φαίνονται μόνο στο φως σου» / "The Faded show only in your light"; hint.shadow «Ο ίσκιος σου πέφτει απέναντι από τη φωτιά» / "Your shadow falls opposite the fire".
- **Names:** npc.first «Η Πρώτη» / "The First" (shipped for Ice Memory 1), and new npc.first.named «Φέρουσα» / "Pherousa" after `nameBack`; npc.deepMemory «Μνήμη από μαύρο πάγο» / "A memory in black ice"; npc.glaukos, npc.tamarisk, npc.selna, npc.alkyone, npc.tern, npc.skotos (shipped).
- **Act panels:** act5.next (replaced), act6.done, act6.sub, act6.next, q.39, boon.h6.
- **Key families:** d.call6.*, d.selna.f*/r6, d.alk.v*/r6, d.glaukos.f*/d*/g*/b*/s*/e*/again6, d.tam.v1(.r), d.tern.r1, d.deep.m1-m3.*, d.drained.*, d.heap.*, d.bottom.*, d.shade.*, d.first.*(.m), d.skotos6.* (+ .r), d.stone.galini/twins/kranea(.r)/psamathe, d.answer6.*, d.child.6/7/bark6, d.halda.call/gate/v6, d.elianthe.call, d.brokka.v3-v4, d.elati.v3(.r), mon.*, echo.*, boon.*, leg.*, gate.bottom.
- About **190 new bilingual lines** (three of them already written for Act V), proofread against text.js for the house voice: short, plain, poetic; Greek first; folk with contractions in English; Selna and the First without; the Skotos lowercase, now with "i".

### npcs
**No new people scene.** Every person in Act VI is a shipped scene. The `frost` set (frost.glb, 7 scenes, 25 textures, measured 30.68 MB of phone memory in `assets-built.md`) holds the Saltborn and the First. people.glb (boot-loaded) holds the Faded, the Gate-Fallen's bodies and the Shade's last form. The Drained Sea and the Bottom load `frost` through READY, as the Act V zones do (world.js:85), and nothing else.

- glaukos Γέρο-Γλαύκος / Old Glaukos: **the act's guide and quest-giver.**
  - **Who he is:** the Landing's blind elder, the keeper of its rite, the first to say «Σκότος» in the game (d.glaukos.r3). Below the ice everyone is blind, and he is the one who knows how to walk that way. He calls every fight by ear. At the end he stays below to keep her fire.
  - **Voice:** dry, warm, unhurried; contractions in English; hears what others see («Την ακούω.»).
  - **Where he stands:** the Light's Skerry (q33); the Rope camp (q34, vendor); the Heap's rim (q35); the Well's Foot (q36); the Shadow Stair's head (q37); the Hearth (q38, and post-game as its keeper and vendor).

  | model | |
  |---|---|
  | source | existing scene (frost.glb 'glaukos') |
  | notes | No change. His eye band is code (act5-design). Clips: Idle_Talking_Loop, Walk_Loop, Idle_Lantern_Loop, Fixing_Kneeling (tending the fire). |
- first Η Πρώτη (Φέρουσα) / The First (Pherousa): the woman who lit the fire on the rock (Ice Memory 1) and went down with it. Asleep, nearly out, curled by her fire when the hero arrives; awake for one scene; asleep at the end, for the first time.
  - **Voice:** ancient, so no contractions; few words; she breathes rather than speaks.

  | model | |
  |---|---|
  | source | existing scene (frost.glb 'selna'), runtime regrade |
  | notes | The same body as Ice Memory 1's woman: the shipped NPC kind 'first' (actors.js:542, model 'selna', in the MEMORY set, posed by world.js `ICE_WHO.i1`). Act VI adds a live variant 'firstDeep' outside the memory material. In the Hearth she wears a runtime void-ice grade (people.js tint above 1 drains the colour first, people.js:89-91: tint 0x9ab8d0 at 2.1), a code crown of icicles (rime `icicle` ×0.3, five instances on the head bone, `attachUpright`), a code brand in her hand (the shipped torch from models.js), and a runtime stoop (Act V's selna recipe). Selna never comes below and the First never goes above, so the two are never seen in one zone. **Look gate:** side by side with Selna in the people viewer (`?viewer&only=p:selna&tints=9ab8d0:2.1`); if they still read as one woman outside the memory material, the fallback is a one-scene set (see Assets: optional). Clips (all in moves.bin): Lie_Idle (asleep, curled, and again at the end), Sit_Floor_Idle (waking), Idle_Talking_Loop. |
- selna Σέλνα / Selna: at the Farthest Light (q33), and post-game keeping the rite with the First's name at its head.

  | model | |
  |---|---|
  | source | existing scene (frost.glb 'selna') |
  | notes | No change. |
- alkyone Αλκυόνη / Alkyone: at the Light's Skerry (q33); post-game at the Landing, keeping Glaukos's rite.

  | model | |
  |---|---|
  | source | existing scene (frost.glb 'alkyone') |
  | notes | No change. |
- tern Γλαρόνι / Tern: at the winch on the skerry (q33); post-game there, ringing the rope bell. The same scene is Whitecliff's child (village tint), as in Act V.

  | model | |
  |---|---|
  | source | existing scene (frost.glb 'tern') |
  | notes | No change. |
- tamarisk Μυρίκη / Tamarisk: the Rope camp's healer and vendor (q34-q35), the Ranger's kin line.

  | model | |
  |---|---|
  | source | existing scene (frost.glb 'tamarisk') |
  | notes | No change. |
- halda / elianthe / the child / villagers: in Whitecliff, unchanged models; the hook's barks, the home lines.

  | model | |
  |---|---|
  | source | existing (people.glb, boot) |
  | notes | Unchanged. |
- brokka / elati: **at home, with lines only.** Act V's cameo loaded folk.glb and grove.glb whole and cost 88.6 MB on a cold start (`assets-built.md`, open problem 1). Act VI keeps them home so that cost never recurs.
- skotos Το Σκότος / The Skotos: lowercase `say` lines and place voices, the black-disc portrait; its shipped model (skotos.glb, the CC-BY "Cloaked Figure" source with the code hood) appears once, in the naming cine.
- shade Ο Ίσκιος της Πύλης / The Shade of the Gate: a boss (see Bosses), no dialogue of its own.
- deepMemory Μνήμη από μαύρο πάγο / A memory in black ice: the narrator portrait, after «Μνήμη από κεχριμπάρι», «Μνήμη από στάχτη» and «Μνήμη από πάγο».

## Zones
### How the hero gets there from Whitecliff
**The route:** Whitecliff → the `farlight` waypoint (open since Act V; or the long way, the Field, the Anvil's Neck and the coast) → the Light's Skerry → the rope through the clear ice (exit 'drained', locked `coal6`) → the Drained Sea → the Well behind the Wreck Heap (exit 'bottom', locked `gleaner`) → the Bottom of the Gates → the Gate ring at the First's Hearth (exit 'town', open after `firstLit`), which brings the hero out beside Isarn's staff.

**Waypoints:** `drained` (the Rope, on first arrival) and `bottom` (the Well's Foot, on first arrival). The waypoint list in panels.js gains both. The First's hearths, the lost lights and the Well's Foot's fire are respawn checkpoints (`z.checkpoint`, saved in `flags.cp6` like Act V's cp5), not waypoints. **The Gate ring is one-way** (Hearth → Whitecliff): Whitecliff's Gate panel still opens only the Shadow Gates, so the post-game is unchanged.

**No old zone changes layout.** The only change outside Act VI's own zones is on the Light's Skerry: the rope hole, the oil fire and the winch are props, and the exit is an interact, all on cells that are already thick ice and walkable. No cell opens or closes, so no saved seed's layout can change and no parity script is needed (Act V needed one for the Field's corridor).

### drained (34) Η Στεγνή Θάλασσα / The Drained Sea
LAYOUT: `genDrained(seed)` in a new src/world/gen6.js. The map is 112 × 176 cells (Act V's coast is 120 × 200, so it has about 18% fewer ground vertices), north at z 0 under the Farthest Light. `ZONES.drained = { level: 34, music: 'drained', ambient: 'drained', atmos: 'drained', act: 6, pack: 'silt', light: 'deep', ring: 4.5 }`, with `zonePacks` 'rime' and 'silt' and `READY.silt = { folk: ['frost'], creatures: 'act6' }`.

**Layout fields** (Act V's where they fit, so tide.js and the shared helpers read them as they are):
- `L.bed` (Float32): bed height in metres, quantised to 0.15; `BED_DRY` (9.0) for dry ground. The black-water pockets are the only non-dry cells. **The names and the sentinel are gen5's**, so tide.js, the water mesh's `aBed` and the G_WET ground define work unchanged.
- `L.vault` (Uint8): cells under thin, low vault, where icicles hang (the Ice Overhead).
- `L.keel` (Uint8): the footprints of the ice keels that reach the floor (blocked).
- `L.spots`: `sky` (skylights), `trail` (the First's marks), `hearths`, `lost`, `braziers`, `heap`, `well`, `camp`, `npcs`.
- No `L.ice`, `L.thick` or `L.window`: there is no thin ice, so ice.js never runs here.

North to south:

**(A) The Rope (Το Σκοινί).**
- The camp at (56 ± 6, 18 ± 3), r 9, always dry: the rope's foot in a shaft of green light (a skylight of r 6), a brazier, a crate pile, the NPC spots for Glaukos and Tamarisk.
- The exit up, `{ to: 'farlight', label: 'exit.ropeUp' }`, at the rope.
- The arrival cine plays from here, looking south.

**(B) The Old Shore (Ο Παλιός Γιαλός).** West, x 6-46, z 30-84. The Saltborn's first landing, which the sea covered before anyone's memory and the Skotos uncovered when it drank.
- 4 to 6 stilt-hut frames lying on the sand (code from the rime `planks` layer, Act V's 'stiltHut'), 2 shacks (rime `shack`) on their sides, 3 keel-boats and rowboats (rime) beached at odd angles.
- **Hearth 1** on a dry rock at the shore's highest point.
- Dried kelp heaps (rime `kelp`, darkened) where the Sunken lie.

**(C) The Black Hollows (Οι Μαύρες Γούβες).** Centre and east, x 54-106, z 40-104. Three to five basins the Skotos has not drunk dry, between low rock ridges.
- **Bed:** `0.15·round((0.9·fbm(x·0.06, z·0.06) − 0.25 + 0.5·(1 − d/dRidge)) / 0.15)`, clamped to 0.15..0.9 inside each basin, `BED_DRY` outside. The basins flood from their centres outward.
- **Hearth 2** on a dry rock island in the largest basin, joined to the road by a dry spine 3 cells wide that the black water flanks (a hard check: the spine stays dry at full flood), plus a low-water causeway (bed 0.45-0.6) as a shortcut.
- Two Lost Lights lie toppled across basin rims, their lantern ends on dry cells.

**(D) The Keels (Οι Καρίνες).** South-west, x 8-52, z 100-144. The vault hangs low.
- 14 to 22 keels of ice reach the floor: blocked footprints of r 1-2.5 (`L.keel`), drawn as the shipped env rocks stretched tall in Act V's 'icy:' Instancer material, with rime icicles round their tops.
- Between them, skylights (r 3-5) and dense `L.vault` cells: the Ice Overhead's teaching ground.
- **Hearth 3** in a clearing among the keels.
- One Lost Light half-buried among them.

**(E) The Wreck Heap (Ο Σωρός των Καραβιών).** The boss arena, centred at (58 ± 8, 142 ± 4), r 17.
- A ring of piled wrecks makes its wall: the rime `wreck` hull, keel-boats, rowboats and broken boats as blocked footprints on the ring from r 15 to r 17, with three gaps (north, the way in, and east and west, which close at `gleanerWake`: map.close on a plug of 3 cells each, like Act V's skerry).
- The floor is a sand bowl (dry), with **two black pools** of r 3 (bed 0-0.3: dry at low water; when she raises them to 0.6 their centres are deep and their rims wading) at r 8, east and west, and **two braziers** on the rim, north-east and north-west.
- The fourth Lost Light lies on the Heap's outer slope.
- The Gleaner lies inside the largest hull on the south side until `gleanerWake`.

**(F) The Well (Το Πηγάδι).** Behind the Heap's south rim: a pass 6 cells wide that runs 24 m south, its visual floor height falling to −6 m, to the exit `{ x, z: h − 3, to: 'bottom', label: 'exit.well', locked: 'gleaner' }`.

**The main road** is always dry (`bed = BED_DRY`): the Rope → south along the Old Shore's east edge → round the Hollows' west side → through the Keels → the Heap. **The First's trail** runs on the road and on dry side paths to each hearth (a hard check).

**Over seeds.**
- **Retries:** seed + k·7919, 24 tries, the last accepted (gen4's and gen5's loop).
- **What varies:** every landmark's position within its range; the basin pattern and count; which hulls and keels stand where; the stilt-hut frames; the Lost Lights' spots; the keels' count and placement; the skylights; the dressing, from its own RNG after carving.
- **Height (`L.hgt`, visual only):** the cave walls 6 + 6·fbm, rising toward the map edge (the vault's sides, in the `iceWall` layer); pools −0.6 under the water; the Heap's wreck ring +1 to +3; the Well falling to −6.
- **Reach checks, after dressing** (the shared genlib/gen5 helpers `walkAt`, `refugeNear` and `bfs`):
  - **at h = 0 and at h = 0.9** (the black water's extremes): the entry reaches the camp, every hearth, every Lost Light's lantern, the Heap's north gap, the Well and every NPC spot;
  - **hard failures:** any part of the First's trail on a non-dry cell; a hearth, lantern, brazier, camp or exit on a non-dry cell; a dry pocket at h = 0.9 that is not connected to the camp unless it carries a `refuge` marker within 12 m; a keel closing the main road;
  - every basin has a dry refuge of at least 3 × 3 cells within 12 m (tide.js's lane rule needs one);
  - `check-act6` also reports the mean tries per seed and lists a mean above 3 as a soft failure (Act V's rule).

ATMOS:
- **ATMOS.drained:** fog 0x060a10, density 0.030; sky 0x203040; ground 0x0c1014; hemi 0.55, its colour drifting slowly between green 0x7ad0a8 and white (the aurora through the ice, the shipped hemi drift of Act V's atmos tick); moon 0x7aa8a0, moonI 0.45; exposure 1.25; heroI 24, heroRange 9, heroColor 0xffe0b0 (the coal); zoom 1.0. `uAur` 0 (nothing reflects it).
- **ATMOS.drainedCine:** density 0.012, and the vault drawn (The look, row 4).
- **FX ambient 'drained':** silt motes drifting down through the hero's light, slow drips from the vault onto pools (the shipped 'drip' emitter), breath puffs (Act V's).
HAZARDS:
- **The Carried Fire:** the dark drinks the hero's ring (the Lampbearers, the black water, the Gleaner's last phase).
- **The Black Water** in the Hollows, the Heap's two pools and the Old Shore's two shallow basins.
- **The Ice Overhead:** icicle falls in the Keels and under every `L.vault` patch; skylights as safe light.
- **The Cold:** from wading black water, Black Flares and some hits; never from simply being there.
- **Icemaw lunges** from the deep black-water cells at high water.
SET PIECES:
- The arrival: a seabed under a green vault, and ships sitting upright on the bottom.
- The First's marks appearing in the ring of the hero's light, and fading behind her.
- Each hearth catching, and a woman in the memory taking a brand down into the ice.
- A toppled sea-light's lantern relit, lying on its side.
- The keels: a forest of ice reaching down to the floor, green light falling between them.
- The Gleaner backing out of a hull, chewing, the size of a boat.
GROUND/PROPS: **The 'silt' pack** (tools/pack-silt.mjs, `loadPack('silt')`; PACK_ORDER gains 'silt' last). The `rime` pack loads beside it and supplies most of the props and two of the layers.

| slot | layer | source | note |
|---|---|---|---|
| A | `silt/silt` | **new** (Poly Haven or ambientCG mud or silt, CC0, to be verified) | the seabed; fallback `rime/shore` darkened |
| B | `rime/shore` | shipped (Poly Haven low_tide_rocks, CC0) | rock outcrops and ridges |
| P | `silt/silt` at a second scale and tint (`dual`) | (as A) | the road |
| W | `silt/iceWall` | **new** (ambientCG Ice003 or Ice004, CC0, to be verified) | the vault's sides; fallback `rime/ice` at a larger scale |

**GROUND.drained** defines (the X6 flags, compiled per zone): G_WET **on** (the wet rim of a pool shows where the water will come, from `aBed` and `uWetLevel`, gameplay); **G_AUR, G_GLINT, G_WIN and G_EDGE off**. These four are the ground's costliest Act V extras (`coast-perf.md` §1: the windows' outline alone is 20-30 ms of the coast's 262 ms ground).

**Props:** rime `wreck`, `keelboat`, `rowboat`, `brokenBoat`, `towerA/B/C` (toppled), `anchor`, `sunkenAnchor`, `whale`, `kelp`, `barnacleRock`, `driftwood`, `cask`, `crate`, `oilLamp`, `shack`, `icicle`, `coastCliff` and `rockFace` (world-projected walls, no texture cost). Code: stilt-hut frames, keels (env rocks in the icy material), hearth rings (Act V's cairn), braziers, the rope and winch. New in 'silt': at most one prop, a bone pile (optional, see Assets).

### bottom (37) Ο Πάτος των Πυλών / The Bottom of the Gates
LAYOUT: `genBottom(seed)` in gen6.js. The map is 104 × 168 cells, north at z 0 (the Well's foot), the Hearth at the south. `ZONES.bottom = { level: 37, music: 'bottom', ambient: 'bottom', atmos: 'bottom', act: 6, pack: 'silt', light: 'deep', ring: 4.5 }`.

**The trick that makes this zone cheap:** two of its three areas are made by the generators the Shadow Gates already use.
- `stamp(L, sub, x0, z0, o)` (new, about 80 lines in gen6.js) copies a sub-layout's cells, paint, spots and props into a window of the parent map and remaps its props.
- The sub-layouts are `genCrypt(seed ^ 0xB0770, { rooms: 5, mh: 30 })` and `genForest(seed ^ 0xF0E57, { w: 40, h: 68 })` (gen.js:211, :64).
- Their props are Act I's, boot-loaded, under a 'drowned' Instancer grade: black-blue, roughness 0.3, a rime tint on top faces.
- So the Bottom literally contains the places every Gate copies, and costs no new model.

North to south:

**(A) The Well's Foot (Η Ρίζα του Πηγαδιού).** The camp at (52 ± 4, 12 ± 2), r 8, dry: the Well's foot (exit up `{ to: 'drained', label: 'exit.well' }`), an old Saltborn fire-pit (lit from the Cradle on arrival), Glaukos's spot. The arrival cine plays here.

**(B) The Drowned Barrow (Ο Πνιγμένος Τύμβος).** West, a 40 × 68 window at x 4-44, z 22-90, stamped from `genCrypt`.
- Its two lowest rooms take black water (bed 0.3-0.6), its corridors stay dry.
- Gate-Fallen packs among Act I's dungeon kit, rimed.
- **Black lamp 1** at its south door, with the Gate-Fallen Captain.

**(C) The Drowned Wood (Το Πνιγμένο Δάσος).** East, a 40 × 68 window at x 60-100, z 22-90, stamped from `genForest`.
- Black water across most of its floor (bed 0.3-0.75), so the wood floods at the breath's high and the Stiltwalkers own it; its trails stay dry.
- The forest's trees in the drowned grade with their leaf meshes left out (if the kit cannot drop leaves, the shipped dead trees of the Field's corridor dressing stand in; checked in the world viewer).
- **Black lamp 2** at its south end, with a Stiltwalker matriarch.

**(D) The Forgotten Village (Το Ξεχασμένο Χωριό).** Centre, x 28-76, z 94-128.
- 6 to 8 Act I village houses (village.glb, boot) tilted 4-12° and sunk 0.3-0.8 m (a visual y offset; their footprints block as usual), a well, fences, carts.
- The Faded go about chores no one remembers: dormant actors with a chore idle clip (`chores`, built on the shipped dormant wake and the Avatar `idle` option the NPCs use, actors.js:548) who wake when the hero's light touches them.
- **Black lamp 3** in the village square, with a Faded Elder and a Lampbearer.

**(E) The Shadow Stair (Η Σκάλα των Ίσκιων).** z 128-146, the full width narrowing to 14 cells.
- Four terraces, each drawn 1.2 m lower than the last (visual height; the walkable floor stays at y = 0).
- Its head is closed by three shadow-walls, one band of 3 × 14 cells per lamp, opened in turn as each lamp goes out (`map.open`, the slag plug's pattern; opened from flags on every entry).
- Two pools on the terraces (r 2.5, bed 0.6) where the Hands rise.

**(F) The First's Hearth (Η Εστία της Πρώτης).** The arena, centred at (52 ± 4, 156 ± 3), r 15.
- A dry rock bowl. At its centre, the First's stone and fire (a blocked 2 × 2), the First asleep beside it.
- **Four hearthstones** on the diagonals at r 9: lamp lights of r 4 when lit (1 s touch «Άναψε την πέτρα»), the fight's light sources.
- **Two black pools** of r 4 at the north-east and north-west rims, where the Hands rise and the Skotos rises in the naming cine.
- **`L.vault` patches** over the east and west thirds, for the troll form's icicles.
- **The Gate ring** on the south rim: Act I's 'gate' prop (build.js:869) at ×2.2, dark until `firstLit`, then warm, with the exit `{ to: 'town', at: 'staff', label: 'exit.gateUp', locked: 'firstLit' }`.

**Over seeds.**
- **Retries:** the same loop; a stamped sub-layout that fails its own reach is redrawn with seed + 1 (genCrypt and genForest are deterministic and already pass their own checks in the Gates).
- **What varies:** the crypt's rooms and the forest's trails (from their own generators), the village's houses, the Stair's pool spots, the Hearth's centre within ±4, the dressing.
- **Height (visual):** the walls 8 + 8·fbm; the terraces −1.2, −2.4, −3.6 and −4.8; the Hearth bowl at −4.8 with its rim rising +2 to the walls.
- **Reach checks:**
  - at h = 0 and h = 0.9, with the shadow-walls closed: the camp reaches all three lamps;
  - with each wall opened in turn (simulated with map.open): the Stair and the Hearth's four stones, its centre's ring of cells and the Gate ring are reachable;
  - **hard failures:** a lamp, a hearthstone, the camp or an exit on a non-dry cell; a stamped window whose door does not meet the parent's road; the Gate ring not reachable from the centre.

ATMOS:
- **ATMOS.bottom** (before `firstLit`): fog 0x040508, density 0.036; sky 0x141822; ground 0x0a0b0e; hemi 0.40; moon 0x6a8090, moonI 0.25; exposure 1.3; heroI 24, heroRange 9.
- **ATMOS.hearthDark** (the Shade's form 4): hemi 0.25, moonI 0.1, through the shipped `mixAtmos` easing over 2 s; the Hearth's fire and the lit stones are the light.
- **ATMOS.bottomLit** (`firstLit`; the zone is rebuilt in mode 'lit'): fog 0x0e0a08, density 0.028; hemi 0.6 drifting warm 0xffc890; exposure 1.2. The Faded stand still and fade out; the black water stays low.
- **FX ambients:** 'bottom' (black motes rising slowly toward the vault: "the forgotten"); 'thaw' after `firstLit` (warm motes, drips).
HAZARDS:
- **The Carried Fire** throughout; the black lamps' Black Flare.
- **The Black Water** in the barrow's low rooms, across the wood, and in the Stair's and the Hearth's pools.
- **The Ice Overhead** over the village square and the Hearth's east and west thirds.
- **The Hands of the Skotos** on the Stair.
SET PIECES:
- A barrow, a wood and a village you know, black and wet at the bottom of the world.
- The Faded at their chores, waking one by one as your light reaches them.
- A black lamp going out and its stolen light pouring back into your Cradle.
- A shadow-wall thinning away.
- Your own shadow standing up behind you at the Hearth.
- Her fire flaring white-gold, a woman of black ice lifting her head, the dark rising at the water's edge to hear a name.
- The Gate ring waking warm.

### The look: what each image costs
The engine renders one scene straight to the screen, with no render targets, no depth texture and no post-processing (gfx.js `render()`). Phones run at a pixel ratio of 1.5 or less, with adaptive resolution down to 0.55. **Every image below has a quality-0 path, built first**, and almost every one is a shipped program with defines switched.

The new work lives in **src/world/build6.js** (act6Prop and act6Level, about 450 lines). build.js gains only hooks (`ground6`, the ACT6 set and the X6 defines), and sea.js gains two defines.

| # | image | how it is made | from | phone cost | quality 0 | risk |
|---|---|---|---|---|---|---|
| 1 | **A dry seabed** with wet rims round the pools | groundMat with the 'silt' layers and the X6 defines (G_WET only) | build.js `ground5` pattern → `ground6` | below the coast's ground: no vertex aurora, no glint, no window outline, no edge | G_WET off | None |
| 2 | **Black water** that rises and falls in pockets, dark, with a pale edge where the hero cannot wade | sea.js `buildSea` over the pocket cells only, with a new define SEA_BLACK: no aurora reflection, no light paths, no moon glint; the depth colour step at 0.45 m and the edge line kept (they are gameplay) | sea.js (shipped) | 1-2 fetches; covers ≤ 10% of the view in the Hollows, ≤ 25% in the Drowned Wood at the high (the coast: 30-60%) | 1 fetch | Low |
| 3 | **Skylights:** green-white light falling through thin vault | a light pool (decal, `addLightPool`, lamp light) + 30 slow motes in a column (fx) + the hemi drift | light.js, fx.js | a decal, a few particles; **no PointLight** | motes off | None |
| 4 | **The vault** in cinematics only | one quad of 120 × 180 m at y 14 in Act V's opaque ice program with a new define ICE_VAULT (no crack texture, no shade, no glows; the aurora term along the view ray, as the ice already does), hidden while the camera pitch is above 0.4 | sea.js `buildIce` | only in cines | flat dark ice colour | Low |
| 5 | **Icicles falling** | forge.js `slag()` (forge.js:136) parameterised: a white teleCircle, a rime `icicle` instance falling from y 9, a shatter of the shipped ice-shard emitter, a shard prop left on the cell | forge.js, fx.js | trivial | same | None |
| 6 | **The Carried Fire's ring** shrinking and growing; a pulse when low | the shipped Cradle ring decal (light.js Cradle slot), its radius driven by the meter | light.js | 0 | same | None |
| 7 | **The First's marks,** seen only in your light | 60-120 decal quads from the shipped decal pool, alpha × smoothstep on the distance to the hero against `uFireR` | fx.js decals | one varying | same | None |
| 8 | **The Faded,** barely there outside light | Act IV's shroud look (ai.js:177) pushed to 0.12 opacity outside light + Act V's 48 instanced footprints on their path | ai.js, fx.js | as Act IV | footprints off | Low (readability: Risks) |
| 9 | **Black lamps and shadow-walls** | a dark-cored sprite in an iron cage (code); the wall is 40 dark alpha particles over the band plus a dark decal strip | build6.js, fx.js | in pool budget | particles halved | None |
| 10 | **The Shade's skin** on every form | Act V's `skotosSkin` onBeforeCompile patch (fresnel rim, pale flecks) on the borrowed models, with `prepare()` honouring `extras.keepMat` (the one-line fix `assets-built.md` asked for) | sea.js, creatures.js | 1 fetch on the boss only | fresnel only | Low |
| 11 | **Her fire flaring** and the Gate ring waking warm | the shipped brazier fire and ember emitters at ×2; the Act I gate prop with ember motes | fx.js, build.js | one pooled PointLight | same | None |
| 12 | **Breath, drips, silt and black motes** | fx ambients inside the shipped pools (1,200/2,400/3,500 additive; 500/1,000/1,600 alpha) | fx.js | in budget | pool sizes already scale | None |

**What this deliberately does not do:** draw a ceiling in play (the camera never sees one); any full-screen water; reflections of anything; height for actors; thin ice (no ice.js, no crack texture, no `i` co-op topic); beams (the act's light stands still or is carried); the aurora as a sky in play; any new full-screen transparent layer.

**Why an underground act runs cheaper, with the numbers we have.** All of these are SwiftShader measurements from `coast-perf.md`, the same renderer the gate uses:
- **perf5** (q1, mobile emulation): the Field of Ash 633-665 ms per cycle; the coast 720-816 ms, 1.11-1.19 of the Field; the coast at low water 0.94-1.02; **the Farthest Light 0.92-0.99**. The ice zone, with no sea, already passes.
- **The bench split** at the coast's worst spot (the Dalarö at water 1.2): a frame of 632 = ground 262 + sea 158 + everything else ≈ 212. The coast's excess is its ground at the full define set and its sea over 30-60% of the screen.
- **The Drained Sea removes most of both:**
  - the sea term shrinks with its coverage (≤ 10% of the view) and its program (SEA_BLACK is close to the water's q0 path);
  - the ground loses the window outline (20-30 ms), the vertex aurora (about 3 ms of its 20 ms of vertex work) and the glint.
  - Estimate: **0.85-0.95 of the Field** at q1. It is an estimate until perf6 measures it at the end of stage A.
- **Gate by `#define`, never by a uniform branch.** `coast-perf.md` §3 found that SwiftShader works out straight-line arithmetic inside an `if` on every lane, so a uniform-gated branch saves nothing there; only a loop no lane enters is skipped. Every Act VI saving is therefore a define chosen per zone (the X6 flags), compiled into its own program. On a real phone GPU those branches would also save, but the gate is SwiftShader's.
- **Lights:** at q1 the hero's Cradle and the two nearest fires own the three pooled PointLights (gfx.js:21,74). Every other hearth, brazier, skylight and lamp is a decal pool and an emissive sprite. The per-pixel lights' loop (with its shadow taps) is the body SwiftShader does skip when it is short, so a dim underground scene keeps it short.
- **Overdraw:** beyond the cave walls is the clear colour, so nothing is shaded there; the walls' tops are one layer; no transparent layer covers the screen.
- **CPU:** no ice.js tick (its per-frame load loop over thin cells within 30 m is gone); tide steps touch only the pocket cells (≤ 900 per zone, against the coast's tidal band), at most one step every 4.5 s; actors stop thinking past 38 m as shipped.

**The perf gate, perf6.** It measures frame time at quality 1 under mobile emulation (pixel ratio 1.5, MSAA, adaptive resolution pinned at 1.0, the scale it would have chosen reported beside it) at the act's two worst spots, against the Field of Ash measured the same way:
- the Black Hollows at full black water with about 25 actors;
- the Hearth during the Shade's form 2, with webs, two Hands and four lit stones.

It passes when both are **within the Field's frame time × 1.00** (Act V's bar was × 1.15). Quality 0 is measured as a floor. It runs at the end of stage A with stand-in packs, and again before the bosses are built (stage B's gate). Because SwiftShader shades hidden fragments and a real GPU may differ either way, the gate also asks for **the owner's phone check** of both spots (HANDOFF: "ask the owner how the coast runs on a phone").

## Enemies
**The Faded.** Act VI's humanoid family name is «Ξέθωρος» / "Faded" (after the Ashbound, the Rootsworn, the Ash-Fallen and the Sunken). They are people the world forgot, whom the Skotos covered and sent down to lie still at the bottom. They have no faces and no names, and outside light they are barely there.

**What carries over, and how.** Act VI defines no global trait change, so Act V plays exactly as it ships:
- the shipped trait `unlit` (Act V: lamp light keeps them from waking or rising) keeps its meaning;
- the new zone light kind **'deep'** (light.js) adds one rule there: **every `unlit` creature is Shrouded** (Act IV's rule, combat.js:243: ×0.3 damage taken outside light, Revealed for 3 s by a hit inside light);
- so the Sunken, the Lice and the Faded become harder in the dark only in Act VI zones, and **the Carried Fire's ring decides how much of a pack you can really hurt.**

**Every enemy owns one verb that touches a system:**
- the Lampbearer drinks the hero's fire;
- the Faded are unseen outside it;
- the Gate-Fallen rise again unless they fall in light;
- the Stiltwalker deepens the black water;
- the Icemaw hunts only when the black water is high;
- the Lice drop from the vault;
- the Sunken wake with the black water.

**No name begins with "Frozen"** (the elite affix «Παγωμένος»). **Every `radius` is a pre-scale value**, as in every shipped def (actors.js:146, :163).

**New traits** (ai.js, about 150 lines in all):
- `drinker` { rate, t, back }: a tether channel that shrinks the hero's ring;
- `unseen`: 0.12 opacity, no health bar and no auto-aim outside light;
- `lightRest`: a creature with the shipped `rises` that dies inside light, or under a fallen icicle, stays down;
- `stir` { r, deepen, t }: walking in black water deepens the cells round it.
- Also new: the hull-louse's burst kind 'vault' (lice drop from a vault cell), beside the shipped 'hull' and 'ice'.

**Packs** (data.js PACKS, PACK_LEAD, PACK_DORMANT):

| tag | where | kinds (weights) | lead | notes |
|---|---|---|---|---|
| blackCrew | the Hollows, the Old Shore's kelp | sunken 4, lampbearer 1.5 | lampbearer | dormant `tideWake` on the black water; 4-6 |
| shoreFaded | the Old Shore | faded 3, sunken 1 | | 4-5 |
| keelLice | the Keels | hullLouse | | burst 'vault' from `L.vault` cells; 5-7 |
| poolHunter | the Hollows, the Drowned Wood | icemaw 1, hullLouse 2 | icemaw | the Icemaw surfaces only at high black water |
| heapLice | the Wreck Heap (before the boss) | hullLouse | | burst 'hull'; 5-7 |
| striders | the Hollows' rims, the Drowned Wood | strider 1, faded 2 | strider | |
| gateFallen | the Drowned Barrow | gateFallen 4, gateFallenBow 2 | | dormant 'bonePile' (the shipped skeleton wake) |
| forgotten | the Forgotten Village | faded 4, lampbearer 1 | | `chores`: dormant at their chores until the hero's light touches one |
| stairCrew | the Shadow Stair | sunken 3, lampbearer 1 | | with the Hands (nodes, at most 2) |

- `PACK_DORMANT`: blackCrew, gateFallen, forgotten.
- The champion stand-in for big kinds in Act VI zones (world.js:286) is `sunken`.
- The black lamps' guards are the tier's champion packs: a Gate-Fallen Captain (rare gateFallen), a Stiltwalker matriarch (rare strider), a Faded Elder (rare faded).

### sunken Θαλασσόπνικτος / Sunken (new=False)
ROLE: The rank and file, reused unchanged from Act V: the dead the sea took, lying under dried kelp on the Drained Sea's floor and on the Stair.
BEHAVIOUR: As shipped (melee AI, the boat-hook pull every third blow, `tideWake`, `tideborne`, `swim`, `unlit`). In Act VI zones `tideWake` reads the Black Water's level exactly as it reads the tide (it is the same clock), and the 'deep' light kind Shrouds them. The Harpooner is not used: there is no thin ice or open sea to reel the hero into.

**Data:** as shipped (hp 1.4, dmg 1.2, speed 3.4, radius 0.5, xp 2).
ASSET: {"source": "existing", "title": "frost.glb 'sunken' (Quaternius people re-proportion, shipped in Act V)", "author": "Quaternius", "license": "CC0", "notes": "No change, no download."}

### lampbearer Θαλασσόπνικτος Λυχνοφόρος / Sunken Lampbearer (new=True)
ROLE: A Sunken that carries the Skotos's lantern. It drinks light: the Carried Fire's enemy, and the reason to kill the support first, as the Ashsmith and the Ice Singer were. The Drained Sea, the Village, the Stair.
BEHAVIOUR: The shipped 'tether' AI (the Mourner's interruptible channel, ai.js:743: keeps 7-9 m, backs off under 4.5 m) with the new trait `drinker`.

**Drink.**
- **Tell:** 0.6 s, its lantern's flame turns black and a dark line runs to the hero, with a low draw of breath.
- **Channel:** 2.5 s. The hero's ring shrinks by 0.5 m/s (× the difficulty's coal drain) and the lantern brightens as it fills.
- **Broken by** any hit worth 6% of its life, a stun or a freeze; it never drinks while the hero stands in lamp light (a hearth, a lit stone, a skylight).
- **Killing it** pours back everything it drank, plus 1 m.
- Cooldown 7 s. With two Lampbearers on her, the drains add.

**Its blow** when cornered: the lantern swung, teleCone 2.2 m, 0.8 s, 0.9×, Cold +8.

**Data:** model 'sunken', hp 1.1, dmg 0.9, speed 3.6, radius 0.48, ai 'tether', reach 9, atk 'cast', atkTime 2.5, flesh 'drowned', xp 2.2, weapon 'blackLamp' (code: the rime `oilLamp` at the right hand with a black flame), style 'none', animSet 'singer' (the shipped Ice Singer clips: Spell_Simple_Idle_Loop, KK_Spellcasting), wake as the Sunken's, tideWake, unlit, drinker { rate 0.5, t 2.5, back 1.0 }, look { scale 1.02 }.
ASSET: {"source": "existing-model-retint", "title": "frost.glb 'sunken' with the rime pack's Vintage Oil Lamp in code", "author": "Quaternius; Monsta3D (Poly Haven)", "license": "CC0 1.0 (both)", "notes": "No new scene and no new texture: the lamp is the rime pack's `oilLamp` (its glass is the material `glow`, which build5.js lights; here its emissive is set dark violet and a dark sprite sits in it). Read: a Sunken that walks upright, holding a lantern high: it must not read as the Harpooner (who holds a harpoon high), so the lantern is held low at the hip until it drinks. Stand-in: 'villager0' tinted grey-green, as the Sunken's."}

### faded Ξέθωρος / Faded (new=True)
ROLE: The forgotten: people the world no longer remembers, faceless and dim. Outside light you see only their footprints in the silt and their breath. The Old Shore, the Drowned Wood, the Forgotten Village (where they are found at their old chores).
BEHAVIOUR: The shipped 'melee' AI with the new trait `unseen`, and `chores` in the village (the shipped dormant wake with a chore idle clip).

**Unseen.**
- Outside light (the hero's ring, any lamp light, fire areas) a Faded is drawn at 0.12 opacity with Act IV's shroud look, has no health bar and is not auto-targeted. Its footprints (Act V's 48 instanced footprint decals) and its breath puffs show where it walks.
- Inside light it is solid, targetable and Shrouded like any `unlit` creature.
- So the ring's radius is how far you can see them, and a dimming Cradle lets them close in.
- A first-time hint hint.unseen.

**Chores.** In the village each stands at a chore (sweeping, drawing water, mending a net: TreeChopping_Loop, Fixing_Kneeling, Idle_Rail_Call, all in moves.bin) and wakes when the hero's ring touches it, or when a pack-mate wakes.

**Combat.** A grasping two-handed blow (Punch_Cross), reach 1.8, atkTime 1.2. Every third blow is a **Forgetting Touch**: teleCone 2.0 m, 0.7 s, 1.1× and the hero's ring −0.5 m. It is the Faded's small share of the drinking.

**Data:** model 'faded' (CAST → people.glb 'villager0', 'villager1' or 'villager2', picked per spawn), hp 1.2, dmg 1.1, speed 4.4, radius 0.48, ai 'melee', reach 1.8, atk 'grab' (Punch_Cross), atkTime 1.2, flesh 'spirit', xp 1.8, animSet 'undead' (Zombie_Walk_Fwd_Loop, Zombie_Idle_Loop), unlit, unseen, chores (village packs only; wake { d: the hero's ring radius }), look { tint 0x1a1c24, tintAmt 2.2, rim 0x8a9ab8, rimI 0.3 }, with a code veil over the head (models.js veilParts, grey).
ASSET: {"source": "existing-model-retint", "title": "people.glb 'villager0'-'villager2' (boot-loaded)", "author": "Quaternius", "license": "CC0", "notes": "No new scene and no new texture: a runtime tint above 1 drains the colour first (people.js:89-91), then darkens; a code veil hides the face. Never 'warden', 'ranger' or 'mage' (the player classes' bodies), so no hero meets her double here; that is kept for the Shade's last form. Read check in the people viewer beside the Sunken and the Lampbearer: the Faded are dry, dim and veiled; the Sunken wet and green-grey."}

### gateFallen Πεσμένος των Πυλών (και Τοξότης των Πυλών) / Gate-Fallen (and Gate-Fallen Bowman) (new=True)
ROLE: What fell in the Shadow Gates comes to rest at their bottom: rimed skeletons of the barrows' dead, the Gates' commonest foe. The Drowned Barrow, the Shade's first form's summons.
BEHAVIOUR: The shipped skeleton and skeleton-archer defs (melee and ranged AIs, the `rises` trait: they get up again a few seconds after they fall) with the new trait `lightRest`.

**Rise again, unless.** A Gate-Fallen that dies **inside light** (the ring, a lamp, a fire), **or under a fallen icicle's shard**, stays down. One that dies in the dark rattles back up 4 s later at half life, once. So you fight them in your light, or drop the vault on them.

**Data:**
- gateFallen: model 'skeleton', hp 0.9, dmg 1.0, speed 3.8, radius 0.45, ai 'melee', reach 1.6, atk 'slash1', atkTime 1.1, flesh 'bone', xp 1.3, weapon 'sword', style 'undead', sfx 'skeleton', rises, lightRest, unlit, wake { d: 6, clip: 'rise', pose: 'bonePile', sfx: 'skeletonRattle', t: 2.0 }, look { tint 0xb8d0e0, tintAmt 0.5, rim 0xc8e0ff, rimI 0.2 }.
- gateFallenBow: model 'skeletonArcher', hp 0.7, dmg 0.9, speed 3.6, radius 0.45, ai 'ranged', reach 11, atk 'shoot', atkTime 1.7, flesh 'bone', xp 1.3, weapon 'crossbow', style 'bow', proj 'arrow' (a frosted arrow look), rises, lightRest, unlit, same wake and look.
ASSET: {"source": "existing", "title": "skeleton.glb (boot-loaded, Act I)", "author": "as credited in CREDITS.txt (Act I)", "license": "as shipped (CC0 / CC-BY 4.0, credited)", "notes": "No download, no new texture: a runtime rime tint. These are boot-loaded, so they cost no memory at all."}

### hullLouse Σκαροψείρα / Hull-louse (new=False)
ROLE: Reused unchanged from Act V: the Gleaner's brood. In the Keels they drop from the vault.
BEHAVIOUR: As shipped (burst, curl and bowl, swim, unlit), plus the burst kind 'vault': the pack waits in the vault over an `L.vault` patch and drops when the hero comes within 6 m (a white teleCircle r 2, 0.8 s, and a patter of falling grit), 0.5× each on landing.

**Data:** as shipped (hp 0.32, dmg 0.5, speed 6.0, radius 0.38, xp 0.6).
ASSET: {"source": "existing", "title": "louse.glb (Act V; CC0 Giant Isopod scan)", "author": "ffish.asia / floraZia.com", "license": "CC0 1.0", "notes": "No change."}

### icemaw Παγολόχος / Icemaw (new=False)
ROLE: Reused unchanged from Act V: the leopard seal hunts the black water.
BEHAVIOUR: The shipped 'lurker' AI. Its holes are the deep black-water cells (h − bed ≥ 0.45). **At low black water there are none, so it lies up and does not hunt:** it is the Black Water's predator, and its menace follows the breath. Under the black water its shape is the water's dark trail (Act V's open-water tell).

**Data:** as shipped (hp 2.2, dmg 1.5, speed 2.0 / 7.0 under, radius 0.6, scale 1.6, xp 3).
ASSET: {"source": "existing", "title": "icemaw.glb (Act V; Leopard Seal by Grace Belt)", "author": "Grace Belt (neatGrace)", "license": "CC-BY 4.0", "notes": "No change; already credited."}

### strider Ξυλοπόδαρος / Stiltwalker (new=True)
ROLE: A giant sea spider, pale and long-legged, which walks where the black water is deep, as the real sea spiders under the polar ice do, grown huge. It stands in the pools where the hero cannot reach and churns them deeper. The Hollows' rims, the Drowned Wood, the black lamp in the wood.
BEHAVIOUR: The shipped 'brute' AI (wind-up, a telegraphed cone, every third blow a slam) with `swim` (it walks deep cells, the shipped swimTo) and the new trait `stir`.

**Stir.** Every 2 s while it stands or walks in black water, every water cell within r 2 is deepened by 0.15 m for 12 s (its bed is lowered in `L.bed`; tide.js re-tests those cells, and the water mesh's `aBed` is updated for those few vertices). Wading cells round it become deep, so a Stiltwalker in a basin walls the hero out of it, and in a flood it widens the water.

**Proboscis Stab:** teleLine 3.2 × 1.2 m, 0.9 s, 1.2×. **Stamp** (every third): teleCircle 2.6 m, 1.0 s, 1.3× and a stir of r 3 at once.

**Out of water** it is slow (×0.7) and its stamp on dry ground under an `L.vault` patch brings icicles down on itself (Stunned 3 s, ×1.5). So lure it out onto the dry, under the hanging ice.

**Not unlit:** a natural beast, so it is not Shrouded.

**Data:** model 'strider', hp 3.4, dmg 1.6, speed 3.0 (×1.3 in water), radius 0.8 (pre-scale: ×1.6 makes 1.28 m for a body 0.9 m across on legs spanning 3.5 m), reach 3.2, atk 'stab', atkTime 1.7, flesh 'chitin', xp 5.5, sfx 'spider', big, swim, stir { r: 2, deepen: 0.15, t: 12 }, look { scale 1.6, tint 0xe0d8d0, tintAmt 0.4, rim 0xd0e0ff, rimI 0.2 }.
ASSET: {"source": "sketchfab (to be verified)", "uid": "to be found by the stage-0 scout", "title": "a giant sea spider (Pycnogonida, e.g. Colossendeis) specimen scan or sculpt", "author": "to be verified", "license": "CC0 1.0 or CC-BY 4.0 only", "notes": "**Where a clean source plausibly exists:** natural-history collections publish CC0 specimen scans on Sketchfab and their own portals (the CC0 isopod Act V uses came from ffish.asia's CC0 project; the Smithsonian's 3D programme publishes CC0 specimens). A pycnogonid scan or an original sculpt under CC-BY 4.0 is likely; **every candidate goes through Act V's gate before download**: the licence re-read on the download page, a reverse-image search of the thumbnail and a storefront check (Fab, CGTrader, Unity Asset Store), the results saved beside the source in /tmp/claude-0/sf.\n\n**Build** (tools/creatures/act6/strider.mjs): decimate to about 5k, keeping the eight leg chains whole; a code rig like the spider's (eight legs weighted by region, a body bone, a proboscis bone); lib.mjs clips idle, walk (a slow eight-leg wave), run, attack (the stab), attack2 (the stamp), wade (legs high), stunned, hit, die (it folds); 512 base, 256 normal, regraded pale bone-white.\n\n**Fallback 1:** a CC-BY 4.0 rigged spider of another source, regraded pale, under the same gate. **Fallback 2, no download:** spider.glb (boot-loaded) built again by strider.mjs with its leg bones lengthened ×1.8 and its body ×0.8 (our own file, so no licence question), regraded pale: +about 0.4 MB raw. **Last resort:** STAND_IN strider → ['spider'] at STAND_SCALE 1.3, tinted pale."}

**Out of the base:** a Faded Keeper (a Faded with a dead sea-lantern, idea for the stretch), ambient fish skeletons, a swimming eel.

## Bosses
Both fights keep Act V's phone rules and the Act IV fix's lessons:
- **At most two big telegraphs at once,** and the environment's own warning (the pools rising, the vault's icicles) always counts as one of them.
- **Telegraph durations never change with difficulty.** Difficulty scales damage, cooldowns and adds.
- **Every phase has one thing to do besides hitting,** and Glaukos says it once, by ear.
- **Exactly one boss actor at a time,** so `G.bossActor` and the single boss bar work as they are. The Shade's forms are swapped, never stacked.
- **One vulnerability at a time** (Act V's rule, below). A boss caps at ×1.6 outside its one scripted window per phase.
- **Every hold has a floor and a clock** (`integrate.md`: damage struck during a hold still lowers its life to a floor; each hold ends by itself in 25-40 s).
- **A retry checkpoint near each boss,** saved in `flags.cp6` like cp5: the Heap's north gap, then the Gleaner's husk; the Stair's foot.
- **Time-to-kill targets,** asserted by the `gleaner` and `shade` scenarios with the reference build at the act's profile (below) on Warden: the Gleaner 3:30-5:00 (fail under 3:00 or over 6:00); the Shade 6:00-8:00 (fail under 5:00 or over 9:30). On Wanderer neither may fall under 60% of its Warden time. Measured with tools/balance-act.mjs extended to Act VI, as Act V's numbers were.

**The life and the blows** are set the way Act V's were, against the fixed curve (`integrate.md`): Act V's bosses settled at hp 170 with dmg 2.2-2.3. Act VI starts one step up, **185 and 240 (the Shade's life over four forms)** at **dmg 2.2-2.3**, with no single blow much past Act V's biggest, and is tuned by balance-act runs (Warden n 6, Wanderer n 12) to a whole-act damage ratio over Act V in the band Act V took over Act IV (×1.2-1.45).

### gleaner Αποφάγισσα, η Μάνα των Ψειρών / The Gleaner, Mother of Lice
CONCEPT: **A scavenger the size of a boat.** A giant isopod, the deep-sea kind that lives on what falls to the bottom, grown huge on everything the world forgot: bones, hulls, the dead. The Hull-lice of Act V's wrecks are her brood. She is not evil, and she will eat anything left lying in the dark.

**Lines.** None: she is a creature. Her voice is the clatter of plates and the quiet when her feet stop.
- Title mon.gleaner «Αποφάγισσα, η Μάνα των Ψειρών» / "The Gleaner, Mother of Lice"; tagline mon.gleaner.t «Τρώει ό,τι ξέχασε ο κόσμος» / "She eats what the world forgot".
- Glaukos calls the fight from the Heap's rim (d.glaukos.g0-g2, under beats).

**What it teaches.** The act's three rules, one per phase: your light protects (phase 1), the black water traps (phase 2), the dark drinks your fire (phase 3).

**Data:** model 'gleaner' (CAST → ['louse', 1]), hp 185, dmg 2.2, speed 3.0, rollSpeed 9.0, radius 0.5 (pre-scale: ×5.5 makes 2.75 m; the hero is pushed out to about 2.8 m, so her reach of 3.4 lands), reach 3.4, atk 'bite', atkTime 1.5, flesh 'chitin', xp 170, boss, big, guard { arc 1.4, k 0.25 } in phases 1-2, turn 1.6, S.phases [0.66, 0.33], hpFloor 0.659 (no single burst skips phase 2), wake on the `gleanerWake` cine (holdWake), dieClip 'curl', look { scale 5.5 (about 3.7 m long and 1.1 m high), tint 0x8a8494, tintAmt 0.5, rim 0xc8d0ff, rimI 0.3 }, with code barnacles on her plates (Act V's) and a hull plank caught in her legs (rime `brokenBoat`). Level: max(zone 34 + 2, hero + 1).

**Arena:** the Wreck Heap, r 17 (Zones). Two black pools at r 8 east and west, two braziers on the north rim, the wreck ring as its wall.
- **The pools are hers.** While she is awake `TIDE.force` replaces the zone's clock for the two pools, as the Walking Tower owned its bay. On a reset they drain.
PHASES: **Phase 1, «Η Σοδειά» / "The Gleaning" (100-66%).** The thing to do: **keep the dead in your light.**
- Every 12 s two Sunken walk in through the Heap's gaps (Call of the Dead).
- Whenever anything dies within 10 m of her, she goes to **Gnaw** the body: a 3 s channel that heals her 2.5% of her life per body. **She will not eat in the light:** a body inside the hero's ring or a lit brazier's pool is left alone.
- So the hero stands over the dead with her fire, or kills the adds by the braziers. A hit worth 6% of her life interrupts the Gnaw and leaves her Exposed for 3 s (×1.25).
- Moves: Mandible Sweep, Plate Ram, Brood.
- Glaukos: d.glaukos.g0.

**The turn (at 66%).** She rears and her feet go quiet (the phase-2 tell, taught once here): the floor holds at 66% for 3 s, the boss bar shimmers, and the pools begin to answer her.

**Phase 2, «Η Μπάλα» / "The Roll" (66-33%).** The thing to do: **make her roll into the water or the hulls.**
- **The Pools Rise** (the environment's telegraph): every 35 s the ice groans for 6 s, then both pools rise to 0.6 m for 14 s.
- Every 10 s she curls (her feet go quiet for 1.0 s, then the curl clip) and makes a **Rolling Rush** through the hero. It bounces once off the wreck ring.
- **A Rush that ends against a hull** after its bounce: **Cracked** 3 s (×1.5).
- **A Rush that crosses a flooded pool:** she sinks to her plates and is **Mired** 5 s, on her back with her legs flailing (×2.0, her one scripted window). The bait: stand beyond a flooded pool so her line must cross it.
- Lice that curl can be bowled into her (Act V's bowl, shipped): 1.0× each and +1 s of Cracked.
- **Fail-safe:** after three Rushes without a Mired, her next Rush is aimed through the nearer pool, and Glaukos calls it.
- Glaukos: d.glaukos.g1.

**The turn (at 33%), «Το Λέπισμα» / "The Molt".** A 3 s beat with hero iframes: she splits her shell and crawls out of it. The empty husk stays as cover (a blocked 3 × 2 prop) for 20 s. The floor holds at 33% through the beat.

**Phase 3, «Το Λέπισμα» / "The Molt" (33-0%).** The thing to do: **keep your fire alive.**
- Soft now: no guard; faster (speed 4.2); pale and faintly glowing.
- **Light Gnaw** every 9 s: she fixes on the hero within 7 m and drinks her ring. At ring 0 the hero is Out (Mechanics).
- The two braziers are the refill (lamp pools of r 4). Every 20 s her **Tail Snuff** puts the nearer one out; relighting it is a 1 s touch.
- Brood twice as often; Call of the Dead returns.
- **Fail-safe:** if the hero has been Out for 6 s, Glaukos throws a whale-oil flask onto the nearer brazier and it catches (Act V's flask, shipped).
- Glaukos: d.glaukos.g2.

**Death.** She curls one last time and does not open. Her body stays as a static husk prop at the spot, the Heap's landmark, a warm pool once the braziers are lit, a checkpoint and the echo spot. The Heap's east and west gaps open again. First-kill legendary (Echoes).

**Echo refight.** «Θυμήσου την Αποφάγισσα» / "Remember the Gleaner", at her husk, after `act6`. The deep remembers her as a pale echo (echo tint 0xd0d8e8 at 1.2, rim 0xe0e8ff). The pools are forced as in the fight; Glaukos's calls are replaced by her own clatter, and the flask fail-safe by a brazier that relights itself after 6 s Out.
ASSET: {"source": "existing", "uid": "3979c291d1f9454c90851efe291eab60", "title": "louse.glb (the CC0 Giant Isopod scan, built for Act V)", "author": "ffish.asia / floraZia.com", "license": "CC0 1.0", "notes": "No download and no new texture. Its ten shipped clips are her moves: idle, walk, run (the Ram), attack (the Sweep and the Gnaw, looped), spawn (the Brood), curl and roll (the Rush), uncurl (played back for the Molt), hit, die (the final curl). At ×5.5 its 512 base map is stretched over 3.7 m: **look gate** in the creature viewer at the gameplay pitch beside a 1.8 m Warden; if the texels read soft, tools/creatures/act6/gleaner.mjs re-exports the scan's own texture at 1024 from the CC0 source (+0.4 MB raw, +1.4 MB phone). Stand-in: the louse at ×5.5 is the model itself; STAND_IN gleaner → ['spider'] (boot) at 2.4, tinted pale."}
MOVES:
- Mandible Sweep (all phases): TELEGRAPH teleCone 5 m, arc 1.2, 1.0 s | EFFECT 1.2× and knockback 8. Cooldown 4 s.
- Plate Ram (phases 1 and 3): TELEGRAPH teleLine 10 m × 3 m, 1.1 s | EFFECT 1.3× and knockback 12; ending against a hull: Cracked 2 s (×1.5). Cooldown 8 s.
- Brood (all): TELEGRAPH a clatter under her plates, 1.0 s | EFFECT 4 Hull-lice (at most 6 alive; +1 per call on Nightmare and above). Cooldown 16 s (8 s in phase 3).
- Call of the Dead (phases 1 and 3): TELEGRAPH the gaps rattle, 1.0 s | EFFECT 2 Sunken walk in (at most 4 alive). Cooldown 12 s.
- Gnaw (phase 1): TELEGRAPH she turns to a body out of light and lowers her head | EFFECT a 3 s channel healing 2.5% of her life; a 6% hit interrupts it (Exposed 3 s).
- Curl (phase 2): TELEGRAPH her feet go quiet for 1.0 s, then the curl clip | EFFECT a ball; ×0.3 taken until it rolls.
- Rolling Rush (phase 2): TELEGRAPH teleLine 18 m × 3.5 m through the hero, 1.2 s; after the bounce a second line, 0.8 s | EFFECT 1.4× and knockback 12; a hull: Cracked 3 s (×1.5); a flooded pool: Mired 5 s (×2.0). Cooldown 10 s.
- The Pools Rise (phase 2, every 35 s; the environment's telegraph): TELEGRAPH the ice groans for 6 s, a HUD pulse on the Black Water dial | EFFECT both pools rise to 0.6 m for 14 s through the shipped tide steps (one a second inside a boss's arena, as the Tower's bay); the lane rule protects the hero.
- Molt (the 33% turn): TELEGRAPH a 3 s beat, hero iframes | EFFECT the husk stays 20 s as cover; guard gone.
- Light Gnaw (phase 3): TELEGRAPH a pale teleLine 7 m × 0.8 m, 0.6 s | EFFECT a 2.0 s channel draining the ring 0.8 m/s; a 5% hit interrupts it (Exposed 3 s). Cooldown 9 s.
- Tail Snuff (phase 3): TELEGRAPH teleCone 4 m behind her, 0.9 s | EFFECT 1.0×; the nearer brazier goes out. Cooldown 20 s.

### shade Ο Ίσκιος της Πύλης / The Shade of the Gate
CONCEPT: **The shadow of her fire.** It has met the hero at the end of every Shadow Gate as the Gate Guardian, wearing the North's oldest fears: the Barrow Lord, the Weaver, the troll (boot.js:240 picks one of the three). At the bottom it wears all three in turn, and last the shape her own fire throws: the hero's. It is not evil. It keeps the First hidden, because anyone who comes down might be the dark wearing a face.

**Lines.** It has no voice of its own. Each borrowed form speaks the shipped line of the boss it wears (d.lord, d.weaver), the troll roars, and the hero's shadow says nothing, because the hero never speaks.
- Title mon.shade «Ο Ίσκιος της Πύλης» / "The Shade of the Gate"; tagline mon.shade.t «Σε περίμενε στο τέλος κάθε πύλης» / "It waited at the end of every gate".
- Glaukos calls one thing per form (d.glaukos.s0-s3, under beats).

**The shared rule: a shadow is hurt only in light.** The Shade is Shrouded in every form (×0.3 outside light). Inside the hero's ring it takes full damage. **Inside a lit hearthstone's pool or the centre fire's light it is Lit (×1.25, the vulnerability rule).** Each form fights the light its own way.

**Data:** a relay boss: one actor `shade` holds the shared life and is re-spawned in each form's body.
- Shared: hp 240, dmg 2.3, xp 290, boss, flesh 'spirit', shroud, S.phases [0.75, 0.5, 0.25]; at each threshold hpFloor = threshold − 0.001 for the turn beat (2.5 s, hero iframes, the boss bar shimmers), with a 30 s clock. Level: max(zone 37 + 3, hero + 1).
- The forms (all boot-loaded models):

| form | body | scale | radius (pre-scale) | speed | moves | life |
|---|---|---|---|---|---|---|
| 1 «Ο Βασιλιάς που Ξεχάστηκε» / "The Forgotten King" | barrowlord.glb | 1.15 × 1.25 | 1.2 | 4.2 | LORD (ai.js:824, shipped) + Crown of Shadow, Snuff | 100-75% |
| 2 «Η Υφάντρα των Πυλών» / "The Gates' Weaver" | spider.glb | 2.6 | 2.2 | 5.2 | WEAVER (shipped) + Light-webs | 75-50% |
| 3 «Ο Τρόμος των Βουνών» / "The Mountains' Dread" | troll.glb | 1.45 | 1.1 | 3.6 | the shipped brute with the Gate Guardian's thunder affix + Vault Slam, Roar | 50-25% |
| 4 «Ο Ίσκιος σου» / "Your Own Shadow" | people.glb, the hero's own class body | 1.5 | 0.5 | the hero's × 0.9 | MIRROR (new) + Shadow Lunge | 25-0% |

- Every form wears Act V's `skotosSkin` patch (The look, row 10) over a near-black regrade at runtime, so they read as shadows of the shapes, not the shapes.

**Arena:** the First's Hearth, r 15 (Zones): the centre fire (light r 5; the First asleep beside it, an untouchable NPC); four hearthstones at r 9 (lit with a 1 s touch; lamp pools r 4); two black pools at the north rims (Hands rise there in form 4); `L.vault` patches over the east and west thirds; four whale-oil casks on the rim; the Gate ring on the south rim (dark).
PHASES: **Form 1, the Forgotten King (100-75%).** The thing to do: **keep the stones lit and fight it inside their light.**
- The Barrow Lord's shipped moves, unchanged (LORD table).
- **Crown of Shadow:** every 15 s it raises 3 Gate-Fallen round itself. They rise again unless they fall in light, so the hero's ring and the stones matter twice.
- **Snuff:** it floats to the nearest lit stone and puts it out (a 2.0 s channel; a 6% hit interrupts it and leaves it Lit for 2 s where it hovers, inside the stone's pool).
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
- The Shade takes the hero's own class body, in black, at ×1.5. **It always stands opposite the hero across the centre fire**, as a shadow does: its target point is the centre plus the vector from the hero to the centre, scaled to the hero's own distance, clamped to 4-13 m; it glides there at 7 m/s and is never pushed.
- So **to bring it into a lit stone's pool, the hero stands at the stone opposite.** One rule, readable at a glance, and nothing like Act V's fights.
- **It mirrors your loadout.** When the hero uses a skill on one of her four buttons, the Shade answers 1.2 s later from where it stands with that skill's shadow move (the MIRROR table below). It reads the skill's id, not its variant, so one 21-row table covers every class, every loadout, every later skill and all 24 variants. If two big telegraphs are already up, the mirror waits.
- **Shadow Lunge** every 6 s, its own: across the fire through the hero. It ends in the fire's light, so the Shade is Lit for 2 s where it lands: a free window for a hero who baits it.
- Two Hands of the Skotos rise from the north pools (the shipped nodes, Act V's Sweep and Lash); cutting them is optional.
- **Fail-safe:** after 40 s with no Lit window, the centre fire flares to r 8 for 10 s, so any side is light. Narration toast d.shade.flare «Η φωτιά στη μέση φουντώνει, σαν να ανάσανε κάποια.» / "The fire in the middle flares, as if someone breathed."
- Glaukos: d.glaukos.s3.

**The end.** At 0% the shadow folds back into the hero's feet (cine; see ending). Flag `shadeDown`, saved first; its first-kill legendary drops by the centre stone.

**Echo refight.** «Ρίξε τον ίσκιο σου» / "Cast your shadow", at the Gate ring, after `act6`. No Glaukos; the four stones start lit; form 4's fail-safe is the same. A grey-black echo tint (0x1a1c24, rim 0xd0d8ff). Nothing in the echo touches the story.
ASSET: {"source": "existing", "title": "barrowlord.glb, spider.glb, troll.glb (boot-loaded, Act I) and people.glb's warden, ranger and mage (boot-loaded)", "author": "as credited (Act I creatures; Quaternius for people.glb)", "license": "as shipped (CC0 / CC-BY 4.0, credited)", "notes": "No download, no new texture, no memory: every body is resident from boot. Look gate: each form under the skotosSkin patch and a near-black regrade, in the creature and people viewers at gameplay pitch; the hero's shadow must read as hers (silhouette, weapon, class) yet black. The player-class body is used on purpose here, the one place Act V's rule (never a player class's body for an enemy) is broken, because the shadow is the hero's."}
MOVES:
- Crown of Shadow (form 1): TELEGRAPH a dark ring on the floor round it, 1.2 s | EFFECT 3 Gate-Fallen rise (at most 6 alive; +1 on Nightmare and above). Cooldown 15 s.
- Snuff (form 1): TELEGRAPH it floats to a lit stone; the stone's flame leans toward it | EFFECT a 2.0 s channel that puts the stone out; a 6% hit interrupts it (Lit 2 s). Cooldown 12 s.
- Light-web (form 2): TELEGRAPH teleCircle r 3, 1.0 s | EFFECT on a stone: its pool goes to nothing while the web holds (until burnt or struck three times); on the hero: Webbed (40% slow 2 s, ring −1 m). Cooldown 7 s.
- Vault Slam (form 3): TELEGRAPH the troll's shipped slam tell (teleCircle 3 m, 1.2 s) | EFFECT 1.3×; under `L.vault`, 3-5 icicles fall round it (white teleCircles r 1.2, 1.0 s; 0.9× each); one on the troll: Stunned 3 s (×1.5). Cooldown 8 s.
- Roar (form 3): TELEGRAPH teleCone 6 m, 0.9 s | EFFECT 0.8× and the hero's ring −1.5 m. Cooldown 14 s.
- Shadow Lunge (form 4): TELEGRAPH teleLine 12 m × 2 m through the hero across the fire, 1.0 s | EFFECT 1.2× and knockback 10; it lands in the fire's light: Lit 2 s. Cooldown 6 s.
- MIRROR (form 4): TELEGRAPH each shadow move's own, 1.2 s after the hero's cast | EFFECT by the table:

| the hero's skill (any variant) | the shadow's answer |
|---|---|
| leap, charge, vault | Shadow Leap: teleCircle r 3.2 at the hero, 1.2 s, 1.3× |
| whirl, bulwark | Shadow Spin: teleCircle r 3 round it, 1.0 s, 1.0× |
| quake, pierce, dawn | Shadow Line: teleLine 14 m × 2 m toward the hero, 1.1 s, 1.3× |
| multi, hawks, chain | Shadow Fan: five teleLines of 12 m in a 50° fan, 1.0 s, 0.6× each |
| rain, meteor, trap | Shadow Fall: teleCircle r 3.5 at the hero's spot, 1.4 s, 1.4× |
| nova | Shadow Frost: teleCircle r 5 round it, 1.2 s, 0.9× and 30% slow for 2 s |
| cry, wolf | Shadow Howl: its next answer comes 0.4 s sooner (no damage) |
| combo, bolt, arcane (basic attacks) | not mirrored |

- Hands of the Skotos (form 4): as shipped (Hand Rise teleCircle r 2.5, 1.6 s, 1.1×; Sweep teleCone 6 m, 1.2 s, 1.1×; Lash teleLine 9 m × 1.6 m, 1.0 s, a 4 m pull); at most 2, never inside lamp light.
- The Flare (form 4 fail-safe): no telegraph | the centre fire's light r 8 for 10 s.

## Mechanics
**Systems are taught one at a time, then combined,** as Act V does:
- **the Drained Sea:** the Carried Fire first (the Rope to hearth 1), the Black Water second (the Hollows, hearth 2), the Ice Overhead third (the Keels, hearth 3);
- **the Gleaner:** the fire, then the water, then the fire again, one per phase;
- **the Bottom:** all three, with the black lamps;
- **the Shade:** light in every form, with the vault in form 3 and the shadow's geometry in form 4.

**No new buttons.** Lighting, relighting, snuffing and climbing use interact; bowling a louse and escaping a pull use the dodge; everything else is positional.

### The Carried Fire (Η Φωτιά που Κουβαλάς): both zones and both fights
The Cradle's coal is the hero's light under the ice, and the dark drinks it. **The ring on the ground is the meter**: there is no new bar.

**The ring.** The shipped Cradle ring (light.js Cradle slot; Act IV's 6 m, Act V's 4 m) is `ZONES[id].ring` = 4.5 m in Act VI zones and becomes a value, `FIRE.r`, between 0 and 4.5.
- It lights what stands in it: for the Shroud, for seeing the Faded and the First's marks, and for the Gate-Fallen's rest.
- It is not warmth (as in Act V), so the hero still comes in to the fires for the Cold.
- **It never drains by itself.** Only the dark's actions take it (Act V's judges' lesson: the Cold never built from simply being outdoors).

**What takes it** (each × the difficulty's coal factor):

| source | ring |
|---|---|
| a Lampbearer's Drink | −0.5 m/s for its 2.5 s channel |
| a Faded's Forgetting Touch | −0.5 m |
| wading black water | −0.15 m/s |
| a black lamp's Black Flare | −1 m |
| the Gleaner's Light Gnaw | −0.8 m/s for 2.0 s |
| the Shade's Roar (form 3) / Light-web on the hero (form 2) | −1.5 m / −1 m |

**What fills it:**

| source | ring |
|---|---|
| standing in lamp light (a hearth r 6, a brazier r 4, a lit stone r 4, a lost light r 4, a camp fire) | +1.5 m/s |
| a skylight | +0.3 m/s |
| killing an `unlit` foe inside the ring | +0.2 m |
| a Lampbearer's death | everything it drank, +1 m |
| a burning whale-oil cask (the shipped fire area) | +1.0 m/s |
| a black lamp put out | to full |

**States.**
- **Dim** (r < 1.5): the ring pulses; the small flame icon beside the Cold meter turns grey (hud.dim); a one-time hint hint.carry.
- **Out** (r = 0): the ring is gone and the hero's own light shrinks to 4 m (`setHeroLight`, shipped). Cold gains are doubled, every `unlit` foe is Shrouded wherever it stands, and the Faded are unseen. Toast q.fireOut. **Relight:** a 1 s touch at any lamp light brings the ring back at 2.5 m (q.fireBack); a Lampbearer's death relights it too.
- Out is never a death sentence: every fight area has a lamp light within 15 m (gen6 hard check), and both bosses have a fail-safe.

**The Shroud** (Act IV's, combat.js:243, unchanged): in 'deep' zones every `unlit` foe outside light takes ×0.3, and a hit inside light Reveals it for 3 s. "Light" is `lightAt(x, z)` (shipped): the ring, lamp pools, skylights and fire areas.

**Class play.**
- **Warden:** fights inside his own ring; Leap and Earthsplitter bring the vault down.
- **Ranger:** her foes beyond 4.5 m are in the dark unless she fights near a fire. **Her spirit wolf carries a small light of r 2 in 'deep' zones** (a moving pool with no decal, Act V's beam-pool code), so what it bites is lit. Arrow Rain brings icicles down from range.
- **Mage:** his fire areas count as light (as they always have), so a Fireball lights a pack for its burn; Meteor brings the vault down.

IMPL:
- **light.js** (about 80 lines): `ZONES[id].light === 'deep'`; `FIRE = { r, max, state }`; `fireDrain(v)` and `fireFill(v)` (×HAZ6.coal); the ring's radius drives the Cradle decal, `lightAt` and the `uFireR` uniform (the marks' decals, the Faded's opacity); Dim and Out; relight at lamp light; the wolf's pool. Act IV's `drink()` and swell stay 'ember'-only.
- **combat.js:** in 'deep' zones `unlit` defs are Shrouded through the shipped shroud test at combat.js:243 (one line: `def.shroud || a.shrouded || (zoneLight === 'deep' && def.unlit)`), and light.js's `shroudOn()` answers true in 'deep' zones as it does in 'ember' ones.
- **ai.js:** `drinker` (on the tether channel's tick), the Faded's touch, the kill refill.
- **hud.js:** the flame icon beside the Cold meter.
- **co-op:** each page's own ring (it is the page's own hero's); a guest's ring goes in its presence `h` as one byte, so the host's check of a guest's blow uses the guest's light for the Shroud.

### The Black Water (Το Μαύρο Νερό): the Hollows, the Old Shore, the Heap, the Barrow, the Wood, the Stair, the Hearth
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
- **What it does to fights:** at low water the Hollows are wide and the Icemaw lies up; at the rise the Sunken under the kelp wake (`tideWake`) and the basins cut the floor into islands; at high water the Icemaw hunts, the Stiltwalkers own the basins, and the trail and the road stay dry.
- **Bosses own their pools** (`TIDE.force`), as the Walking Tower owned its bay: the Gleaner's two pools in phase 2.
- **The Stiltwalker's stir** deepens cells for 12 s (its bed is lowered in `L.bed`, and the few `aBed` vertices updated); tide.js re-tests them in its next batch.

IMPL:
- **tide.js** (+about 40 lines): the cycle, steps and hMax from `L.tideCfg` (gen6 writes `{ phases: [40, 27, 26, 27], stepT: 4.5, hMax: 0.9 }`, scaled by HAZ6); `stirAt(x, z, r, deepen, t)` with its own expiry list; the groan in place of the bell; nothing else changes.
- **sea.js:** the water over the pocket cells only, with SEA_BLACK (The look, row 2).
- **co-op:** the shipped tide sync (`w` in the snapshot: the clock and a boss's hold) covers it; the stir's cells go in the same field as a short list.

### The Ice Overhead (Ο Πάγος από Πάνω): the Keels, the Village square, the Hearth's east and west thirds, every `L.vault` patch
The vault is low and thin in places. Heavy blows bring its icicles down, and where it is thinnest the aurora's light falls through.

**Icicles.**
- **What brings them down:** the impacts Act V already routes through `crackAt` (skills.js and skillsx.js: Leap, Earthsplitter, Meteor, Fireball, Arrow Rain and the variants and later skills that strike the ground), and monster slams. In 'deep' zones they call `vaultAt(x, z, r, n)` instead.
- **How many:** Leap 2, Earthsplitter 1 per 4 m of its line, Meteor 3, Fireball 1, Arrow Rain 1 a cast, a monster slam 1, the troll form's Vault Slam 3-5, each on a random `L.vault` cell within r + 1. At most one fall per vault patch every 4 s, so a patch never rains forever.
- **And by themselves:** at the start of each high water, one icicle per vault patch within 20 m of the hero (the breath shakes the vault).
- **Each fall** is forge.js's slag drip (forge.js:136) made generic: a white teleCircle r 1.2, 1.0 s, a rime icicle falling from y 9, then 0.9× the zone's monster blow (× HAZ6.icicle) to the hero inside it, Cold +10, **and to monsters: 8% of their life and a 1.5 s stun** (the Stiltwalker and the troll form 3 s and ×1.5). It leaves a shard prop on its cell for 20 s (blocked; batched with `map.close`/`map.open` at most every 0.25 s, ice.js's rule) and keeps a Gate-Fallen under it from rising.
- So the hero can **drop the vault on a pack**: lure them under the hanging ice and Leap.

**Skylights.** `L.spots.sky`: lamp-light pools of r 3-5 under the vault's thinnest places: the ring +0.3 m/s, Cold −6/s, Shroud reveal. At each high water they dim to half radius for 10 s.

IMPL: **forge.js** (+about 30 lines): `drip(x, z, r, dur, o)` exported from `slag()` with a colour, a damage option, an `onLand` hook and the shard. **gen6** writes `L.vault` and the sky spots. **skills.js and skillsx.js:** the twelve shipped `crackAt` call sites (five in the base skills, seven in the variants and later skills) read `zoneLight === 'deep'` and call `vaultAt`. **co-op:** the host decides the falls; the drips are look calls through the shipped `MIRROR.rec` (net/state.js), and the shards are cell changes in the world digest, the way Act V's `storyOpenings` are.

### The Cold (Ψύχος), carried over
cold.js runs unchanged in Act VI zones. Its sources here: wading black water +4/s; the wash-out +20; a Black Flare +15; a Lampbearer's lantern blow +8; an icicle +10; Out doubles every gain. Its sinks: −3/s dry; −12/s in a warm pool (hearths, braziers, camps, lit stones, lost lights); −6/s in a skylight; −8/s in a fire area. Chilled, Freezing and Frostbite (with its boss-fight variant) are as shipped, by HAZ6's row (HAZ5's values).

### The vulnerability rule (Act V's, with Act VI's statuses)
- Every target has **one** vulnerability multiplier, the largest of its active statuses; they never multiply together.

| status | × | who |
|---|---|---|
| Revealed (a hit in light), Exposed (an interrupted channel), Lit (in a stone's or the fire's light) | 1.25 (1.35 on Wanderer) | unlit foes; the Gleaner; the Shade |
| Cracked (against a hull), Stunned (an icicle) | 1.5 | the Gleaner; the Stiltwalker; the Shade's troll form |
| Mired (the Gleaner's scripted window) | 2.0 | the Gleaner |

- Shroud (×0.3 outside light) is a resistance, like ward (×0.5) and the Island (×0.3); it multiplies with a vulnerability as they do. A Lit status cannot be had outside light, so the two never meet on one blow.
- **A boss caps at ×1.6** outside its one scripted window per phase.
- IMPL: the shipped `vuln()` in combat.js (`actHit`) gains the three status names. No new code path.

### Black-ice Memories (Μνήμες από μαύρο πάγο): the First's three hearths
- **Where:** each hearth on her trail.
- **When:** on its relight, the next memory in count order (Act V's guard: a lit hearth with its memory unseen offers «Θυμήσου» on every entry; questGoal points at it).
- **How:** the Lamp-Memory flow (story.js `on('lamp')`) with the body class 'memory-deep' (CSS: Act V's 'memory-ice' with a black-blue swap) and npc.deepMemory. The figures are the `selna` frost scene (the First, as in Ice Memory 1) and two shorefolk villagers in the memory material. BUFFS.memory, toasted «Μνήμη της Πρώτης» / "Memory of the First".
- Flags `mem_d1`-`mem_d3` mean "seen". Nothing else is new.

### World-state: the Call, the Coal, the Drained Sea, the Hearths, the Gleaner, the Black Lamps, the Shade, Her Fire, Home (Το Κάλεσμα, το Κάρβουνο, η Στεγνή Θάλασσα, οι Εστίες, η Αποφάγισσα, οι Μαύρες Λάμπες, ο Ίσκιος, η Φωτιά της Πρώτης, το Σπίτι)
One more chain after Act V's `coastCall` → `hearth` → `frozen` → `hole0-2` → `seaLit`. Every flag is saved before its scene plays (the one exception is `nameBack`, saved with `firstLit`), and read on zone build, on every zone entry (zones are cached) and on load.

1. **`call6` (q32).**
   - **Whitecliff:** FAR_BEACONS[4-6] hold their flash (farFire `flash` 0) until `firstLit`; cold mist at Isarn's staff (fx emitter) and a rime tint on the staff.
   - **The farlight zone:** the Farthest Light's beam stands still, facing south (its `addBeam` period held), until `firstLit`.
2. **`coal6` (q33).** **The farlight zone:** the rope hole, oil fire, winch and exit on the skerry (`act6Presence`, every entry); Selna, Alkyone, Glaukos and Tern placed there. The Cradle rides the hero's hip in Act VI zones.
3. **`drainedSeen`, `hearth6_1`-`3` (q34).** The Drained Sea's waypoint; the hearths' pools and checkpoints.
4. **`gleaner` (q35).** The Heap's husk; the Well open; the Heap's east and west gaps open again.
5. **`blackLamp0`-`2` (q36).** The Stair's shadow-walls open, one per lamp; the lamps stay dark.
6. **`shadeDown` (q37).** The Hearth calm; the First still asleep; the name held («…»).
7. **`firstLit` with `nameBack` (q38).**
   - **The Bottom** is rebuilt in mode 'lit' (`bottomMode()`): ATMOS 'bottomLit', the Faded gone from the village, the black water held at low, Glaukos at the Hearth, the First asleep by a bright fire, the Gate ring warm and open.
   - **The Drained Sea:** the skylights brighter (hemi +0.1); packs unchanged for farming.
   - **The farlight zone:** a warm glow under the clear ice by the tower (a `uGlow` slot), and Selna's rite with the new first line.
   - **The Landing:** Alkyone keeps the rite; Glaukos is gone below.
   - **Whitecliff:** the sea-lights flash again; the Gate at the staff breathes warm (ember motes, no mist).
   - **The farlight zone:** the beam turns again at its 12 s period.
8. **`homeGate` (q38b), then `act6`.** The home cine and the act panel; the child's bark; the home lines.
- **Optional: `lost0`-`3` → `nineLit`.** The lost lights' lamp pools; the farlight zone's drowned glows at full (`uGlowOn`); the blessing ×1.25.
- **Packs stay for farming** in every state.
- **Old saves** without these flags read as Act V's end state (quest 31, `seaLit`). `hero.act6 ??= −1` (boot.js migration, as `act5`).
- IMPL: `act6Zone(z)`, `act6Enter(z)` and `act6Presence(z)` in world.js, mirroring Act V's trio. Derived: `bottomMode() = firstLit ? 'lit' : 'dark'`. `townFires` reads `call6` and `firstLit`; `act5Presence` (farlight) reads `coal6`, `firstLit` and `nineLit`.

### Difficulty: what each level does to Act VI
The six difficulties keep their names (canon item 20; «Σκότος» shipped as the sixth, `unlock: 'act5:ash'`). On top of the existing hp, damage, elite and loot scaling, every Act VI hazard scales through a new `HAZ6` row set in data.js beside `HAZ5`. **Telegraph durations never change.**

| | Wanderer | Warden | Hero | Nightmare | Ash | Skotos |
|---|---|---|---|---|---|---|
| monster hp / dmg (existing) | 0.65 / 0.55 | 1 / 1 | 1.9 / 1.55 | 3.6 / 2.4 | 7 / 3.8 | 11 / 5.4 |
| the act's creatures' blows (HAZ6.dmg, as HAZ5.dmg) | ×1.5 | ×1 | ×1 | ×1 | ×1 | ×1 |
| coal drained (HAZ6.coal) | ×0.6 | ×1 | ×1 | ×1.15 | ×1.3 | ×1.45 |
| ring refilled in lamp light | 2.0 m/s | 1.5 | 1.5 | 1.4 | 1.3 | 1.2 |
| Shroud outside light | ×0.45 | ×0.3 | ×0.3 | ×0.3 | ×0.3 | ×0.3 |
| Black Water cycle | 150 s | 120 s | 120 s | 120 s | 110 s | 100 s |
| the groan's lead | 8 s | 6 s | 6 s | 6 s | 6 s | 6 s |
| wash-out (% max life, HAZ5's) | 3 | 6 | 6 | 8 | 10 | 12 |
| icicle (× zone blow) | 0.6 | 0.9 | 0.9 | 1.0 | 1.1 | 1.2 |
| black lamp channel | 1.6 s | 2.0 s | 2.0 s | 2.0 s | 2.2 s | 2.4 s |
| Cold gains (HAZ5's) | ×0.8 | ×1 | ×1 | ×1.15 | ×1.3 | ×1.45 |
| Revealed / Exposed / Lit | ×1.35 | ×1.25 | ×1.25 | ×1.25 | ×1.25 | ×1.25 |
| boss cooldowns | ×1 | ×1 | ×1 | ×0.9 | ×0.85 | ×0.8 |
| adds per boss call | +0 | +0 | +0 | +1 | +1 | +2 |
| telegraph durations | never change | | | | | |

**Levels.** The zones are 34 and 37, but the zone level is a floor: monsters track the hero (engine brief §4). On Act V's measured casual profile the hero meets the Skotos at level 46 on Warden (`integrate.md`), so Act VI is met at about 47-50: the cap. Past it, experience goes to Mastery (`docs/progression/README.md`), so **Act VI is where most heroes earn their first Mastery levels**, and its two zones stay a good farm for them. Bosses come out at max(zone + 2 | + 3, hero + 1), as shipped. The scenarios run at hero levels 47-50.

### Touch and phone readability (rules the act keeps)
1. **No new buttons.**
2. **The meter is on the ground.** The Carried Fire is the Cradle's ring itself, already under the hero's feet; Dim pulses it, Out removes it and greys the flame icon. The Cold meter keeps the amber slot (Act V).
3. **Telegraph palette:** red and orange, harm; sea-green, a pull; **white circles, ice falling**; **black, the dark's drinking** (a Lampbearer's line, a Black Flare, the Gleaner's Gnaw line in pale); blue, a safe zone. Shadows of the Shade's mirror are its own move's colour, never the hero's skill look, so a player never mistakes the answer for her own cast.
4. **At most two big telegraphs at once,** and the environment (the pools rising, the vault, a Black Flare) always counts as one. The Shade's mirror waits.
5. **Audio carries timing:** the ice groans before each rise and fall; the Gleaner's feet go quiet before she curls (and blind Glaukos says so); a black lamp draws breath before its Flare.
6. **Never unfair:** the Black Water keeps Act V's 6 s lane and wash-out; the trail, the road and every lamp light stand on cells that never flood; every fight area has a lamp light within 15 m; Out is lifted by a 1 s touch; fail-safes for both bosses.
7. **The Faded are never invisible where it matters:** footprints and breath show where they walk; within the ring they are solid; their attacks have normal telegraphs (red), drawn at full opacity whatever the light.
8. **Test at quality 0 and gate at quality 1:** perf6 at q1 under mobile emulation, ≤ the Field's frame time.

### Engine work Act VI needs
An honest list, in build order. Days are focused days for one agent who knows the code, measured as the engine brief measures them. Each item names what it reuses.

**The reuse ledger first**: what Act VI takes from Acts IV-V and Act I, and what it adds.

| system | shipped in | lines shipped | Act VI use | new lines |
|---|---|---:|---|---:|
| tide (clock, steps, lanes, wash-out, `TIDE.force`, HUD dial, co-op sync) | game/tide.js | 392 | the Black Water, in pockets | ~40 |
| Cradle ring, light pools, `lightAt`, `setHeroLight`, `snuffLamp` | game/light.js | 404 | the Carried Fire; the black lamps (snuff inverted) | ~80 |
| Shroud and Reveal | combat.js:243 (Act IV) | | every `unlit` foe in 'deep' zones | ~5 |
| the Cold, its states and its HUD | game/cold.js | 137 | unchanged | 0 |
| slag drips | game/forge.js:136 | 172 | icicles | ~30 |
| water, ice and skin programs | world/sea.js | 1,740 | SEA_BLACK pools, ICE_VAULT in cines, the Shade's skin | ~60 |
| layout helpers (`walkAt`, reach, refuges, dressing) | world/gen5.js | 1,347 | gen6's base | gen6 ~900 |
| the Gates' generators | world/gen.js (`genCrypt`, `genForest`) | 484 | the drowned tiers, stamped | ~80 |
| Act V props (stilt huts, cairns, braziers, the icy material) | world/build5.js | 1,621 | hearths, keels, stilt frames | build6 ~450 |
| boss tables (LORD, WEAVER, brute) and AIs (tether, lurker, melee, ranged, node) | game/ai.js | 4,528 | the Shade's forms, the Lampbearer, the Icemaw, the Hands | ~570 (two bosses, four traits) |
| catch-ups, memories, the name parameter, cines, `beaconScene` | game/story.js | 1,830 | the act6 block | ~550 |
| zone trio (Zone/Enter/Presence) | game/world.js | 1,736 | `act6*` | ~250 |
| co-op (tide sync, `MIRROR.rec`, `storyOpenings`, presence) | net/coop.js | 1,530 | Act VI's rows | ~120 |
| people, creatures, packs | frost.glb, rime.glb, act5 and Act I creatures, people.glb | | every model but one | one creature |

Act V's six new files alone were 5,903 lines (gen5, sea, build5, tide, ice, cold). Act VI's two new files are about 1,350 lines (gen6, build6), and **about 3,000 lines in all are added to shipped modules**.

IMPL:
1. **Sixth-act plumbing (1.5-2 d, low risk).** Generalise rather than copy:
   - **world.js:** `ZONES.drained` and `ZONES.bottom` (`light: 'deep'`, `ring: 4.5`); `READY.silt`; `zonePacks` ('rime' + 'silt'); the first-boss list; the champion chain; the `why` map for `coal6` and `gleaner`; `ECHO_PROMPT`; the act tests that mean "a late act" (`act >= 4`).
   - **light.js:** the 'deep' kind. **build.js:** an `ACT6` set and `ground6`. **env.js:** `PACK_ORDER` gains 'silt'.
   - **boot.js:** `hero.act6 ??= −1`, `flags.act6`, and the blessing loop at boot.js:82 to 6. **state.js:** `act6: −1`.
   - **story.js:** the questText clamp to 39 with the q34 and q36 counters and the {0} name parameter; `actComplete` branch 6; `offerBoons` over [1..6]; the echo tints.
   - **stats.js:** BOONS[6] ×1.25 when `flags.nineLit`. **panels.js:** waypoints; act6.*; boon.h6; `diffUnlocked` reads act6.
   - **hud.js:** questGoal; the flame icon. **viewer.js:** generators for drained and bottom. **creatures.js:** CAST rows (strider, gleaner, the Shade's forms), `ACT_FILES.act6 = ['louse', 'icemaw', 'tentacle', 'skotos', 'strider']`, and `prepare()` honouring `extras.keepMat` (open problem 2 of `assets-built.md`).
2. **gen6.js, both zones (4-5 d, medium).** genDrained and genBottom on gen5's helpers; `stamp()` for the crypt and forest windows; `L.bed`, `L.vault`, `L.keel` and the spots; reach checks at h = 0 and h = 0.9 and with each shadow-wall opened.
3. **tools/check-act6.mjs (0.75 d).** check-act5's shape: 300 seeds, hard and soft sets, exit 1 on a hard failure; the mean tries per seed.
4. **Visuals (2.5-3 d, low).** `ground6` with the X6 defines; build6.js's prop kinds ('hearth6', 'brazier', 'blackLamp', 'shadowWall', 'keel', 'skylight', 'toppledLight', 'stiltFrame', 'ropeWinch', 'gateRing', 'husk', 'hearthStone'); SEA_BLACK and ICE_VAULT; the atmospheres (drained, drainedCine, bottom, hearthDark, bottomLit); the fx ambients ('drained', 'bottom', 'thaw'); the marks' decal alpha (`uFireR`); the drowned Instancer grade; the skin on the borrowed models. **Every quality-0 path first.**
5. **perf6 and the unload of Acts II-IV (1.5-2 d, low-medium).** The gate scenario (The look). The engine brief §5.4 disposal of Acts II-IV's zones, packs and sets on entering an Act V or VI zone, kept from Brokka and Elati's sets as long as an Act V cameo can still load them.
6. **The Carried Fire (1.5-2 d, low).** light.js 'deep', `FIRE`, the drains and fills, Dim and Out, the wolf's light, the Shroud line, the HUD icon.
7. **The Black Water (0.75-1 d, low).** tide.js's zone config, `stirAt`, the groan.
8. **The Ice Overhead (1-1.25 d, low).** forge.js `drip()`, `vaultAt` at the twelve `crackAt` sites and in monster slams, the shards (batched), the skylights, the monster stun.
9. **AIs and traits (2-2.5 d, low-medium).** `drinker`, `unseen` (opacity, no bar, no auto-aim, footprints), `lightRest`, `stir`, the 'vault' burst, `chores` in the village; the four new defs; the packs.
10. **Two bosses (5-6.5 d, medium).**
    - The Gleaner (2-2.5 d): the GLEANER table; the corpse-seeking Gnaw and its light test; Curl, Rolling Rush and its bounce; Mired in a forced pool; the Molt and its husk; Light Gnaw; Tail Snuff; the fail-safes; the death and the husk prop.
    - The Shade (3-4 d): the relay (form swaps on one life, `G.bossActor` reassigned, the floors and their clocks, a runtime retry from form 3); the form additions (Crown of Shadow, Snuff, Light-webs, Vault Slam, Roar); form 4's opposite-point rule, the MIRROR table hooked on `useSkill` (skills.js), Shadow Lunge, the Flare fail-safe; the skin on each form.
11. **Story (3.5-4.5 d).** Quests 32-38 and the end state 39; the hook; the coal; the rope; the arrival; Glaukos's teaching; the marks; the hearths and memories; the Lost Lights; `gleanerWake`; the black lamps; `shadeWake`; the naming cine with the name parameter; the Gate ring's travel to the staff; the home cine and `beaconScene(6, 'gate')`; the catch-ups; `npcHasNews`; about 190 bilingual lines.
12. **Audio (1.25-1.5 d, low).** Three themes and two variants, the hearth motif, about 14 sound effects (see Music).
13. **Assets (3-4 d; see Assets).** The stage-0 scout and gate for the Stiltwalker; strider.mjs (or its no-download fallback); pack-silt.mjs with two layers; the look gates of every runtime regrade; CREDITS in its four places.
14. **Co-op (1.5-2 d, medium).** The ring in each guest's presence; the Shade's relay seen by guests (the boss's id and flag in the snapshot's `a`; a form swap is a death not told and a new boss); the black lamps', stones' and braziers' states as bit masks in `l`; the stir's and the shards' cells in the world digest; the shadow-walls and the Heap's gaps through `storyOpenings`; a Lampbearer's drink on a guest as a reliable event, like a monster's blow; form 4 in co-op takes its target's class and mirrors only the host's casts (a guest's skills are not on the host's wire); a `coop.mjs act6` scenario.
15. **Scenarios (2.5-3 d).** In tools/scenario.mjs:

    | scenario | what it covers |
    |---|---|
    | hook6 | (a) from a q30 save: finish Act V, the hook after the blessing panel, the coal, the rope. (b) from an Act V-end save in the shipped format without `act6`: the migration and the same walk |
    | catch6 | every row of the catch-up table: set the state just after that flag's save, reload, assert the quest and the scene replayed |
    | drained | the arrival, the Glaukos teach, the marks shown only in the ring, hearth 1 and its memory; a re-entry at high water finds low water |
    | blackwater | a 20-cycle soak with packs: no actor inside a closed cell, the hero never stuck, the wash-out along its lane, no jump over 3.5 m a frame; the stir's cells restored |
    | carry | the ring soak: never below 0 or above 4.5; Dim, Out and the 1 s relight; a Lampbearer's death refilling it; no drain while idle |
    | drips | a 10-minute soak in the Keels: falls capped per patch, shards batched (`map.ver` ≤ 4 bumps a second from the shards), a Gate-Fallen kept down under a shard |
    | gleaner | all phases; a Gnaw refused in the light; Cracked and Mired each seen; the Molt's husk; Out and the flask fail-safe; the time-to-kill target |
    | shade | all four forms for each class (CLS=warden, ranger, mage); the opposite-point rule (the shadow within 1 m of its target point); every loadout skill mirrored once (the later skills and a variant included); the retry from form 3; the time-to-kill target |
    | ending6 | the naming, the name in the quest text, the rest, the Gate ring to the staff, the home cine, the panels |
    | cast6 | every model real or its stand-in, in cold sessions starting at the `farlight` waypoint and at the `drained` waypoint |
    | echo6 | both echoes |
    | perf6 | the gate (The look) |
    | lost6 | the four lost lights, `nineLit`, the farlight glows at full from above |

    `window.__act6` in ai.js for what the scenarios read.
16. **Balance (1.5 d).** tools/balance-act.mjs extended to Act VI (the zones with their black water and lamps, both bosses with their rules), run on Act V's tree and bot (Warden n 6, Wanderer n 12), and tuned to the targets under Bosses.

**Total: about 34-43 focused days**, assets, story and music included, against Act V's 47-58. On the engine brief's engine-only basis (no assets, story text or music) it is about 26-32 days.

**Ship first:** the plumbing and gen6 with check-act6; the visuals' quality-0 paths and perf6; the Carried Fire; the Black Water and the Ice Overhead; then both bosses. The story and both bosses survive every cut below.

**If the act runs late, cut in this order (each with its fallback):**
1. The Mage's `.m` line, and the Ranger's wolf light.
2. The Faded's footprints (they keep their dim look).
3. The Stiltwalker's `stir` (it keeps `swim`).
4. The Lost Lights from four to two (the ×1.25 then needs two), or out entirely.
5. The village's `chores` (ordinary Faded packs).
6. The Shade's MIRROR → a fixed set of three shadow moves per class (saves about 0.5 d).
7. Form 2's Light-webs → the plain WEAVER table.
8. The vault in cinematics → black above.
9. The Drowned Wood's stamp → a second crypt window (one generator twice).

**Never cut:** the ring as the meter; the Black Water's lanes; the three memories; the held name «…»; Glaukos calling fights by ear; form 4's opposite rule; the name said in the light; Isarn's word; Glaukos staying; the climb home up the Gate.

**Out of the base scope from the start (stretch):**
- Drowned tiers in the post-game Shadow Gates (the stamp and the drowned grade exist, so about 1.5 d, but the Gates' play must not change without the owner);
- a thawed reading of the Drained Sea after the act;
- the Faded Keeper;
- ambient fish, eels and bone fields;
- a Brokka and Elati cameo (it would bring back the 88.6 MB cold-start cost);
- a seventh difficulty;
- a Mastery track.

## Production plan: stages and gates
Five stages after a short stage 0, each ending in a gate that must pass before the next starts. The lanes in brackets can run in parallel (one agent each), which is how Act V was built (`act5-contract.md`). Each stage's report goes to `docs/act6-briefs/reports/`. Agents keep progress notes and the lead checkpoints often, because the container restarts every few hours (HANDOFF lessons).

| stage | days | work | gate |
|---|---|---|---|
| **0. Decisions and look gates** | 1.5-2 | the owner's answers (below); the owner's phone run of the coast and the Farthest Light, to calibrate perf6; the Stiltwalker scout and provenance gate; the runtime regrades in the viewers (the First beside Selna, the Faded beside the Sunken, the Lampbearer, the Gleaner at ×5.5, the Shade's four forms); perf5's Field measured on the gate machine | **G0:** every look gate passes or its fallback is chosen; provenance pass or the no-download fallback; the owner's go |
| **A. The ground** | 9-11 | [world] plumbing, gen6 both zones, check-act6; [look] ground6, build6, SEA_BLACK, ICE_VAULT, atmospheres and fx, quality 0 first; [engine] the unload of Acts II-IV; perf6 with stand-in packs | **G1:** check-act6, 300 seeds, no hard failure, mean tries ≤ 3; **perf6 ≤ 1.00 of the Field at q1** at both spots, q0 floor; a cold start's phone texture measured ≤ 100 MB; perf5, coast, farlight, cast5 unchanged |
| **B. Systems and enemies** | 8-10 | [systems] the Carried Fire, the Black Water, the Ice Overhead, the Cold's sources; [combat] the traits, the four defs, the packs; [assets] the Stiltwalker, pack-silt, CREDITS; [net] co-op rows | **G2:** the carry, blackwater and drips soaks; cast6 cold; coop act6; new phone texture measured ≤ 15 MB; perf6 again with real packs |
| **C. Bosses and balance** | 6.5-8 | [combat] the Gleaner, the Shade; [balance] balance-act runs and tuning | **G3:** the time-to-kill targets on Warden for each class; Wanderer ≥ 60% of Warden; no single blow over 12% of max life on Warden; the whole act's damage ratio over Act V in ×1.2-1.45; coop.mjs bosses with both at two and four players |
| **D. Story, text, music** | 5-6 | [story] quests, cines, catch-ups; [text] about 190 lines; [audio] themes and sfx | **G4:** hook6, catch6, ending6, echo6, lost6; two readers proofread every line against text.js's voice; the owner reads the key Greek lines |
| **E. Release** | 3-4 | every scenario (Acts I-VI, progression, co-op, saves); `npm run build:artifact`; the strict-CSP check on desktop and phone; publish to the same artifact URL with the files map; the web build | **G5:** everything passes; no CSP violation, no untextured model; the owner's phone run of both zones before any Play Store build |

**Owner's decisions** (stage 0; each has a default, so work never waits):
1. The story's key choice: the First as the act's heart and the Shade as the Gate Guardian revealed (default: yes).
2. The Skotos as voice and cine only, not a third boss fight (default: yes; Act V's fight and echo stand).
3. Glaukos stays below at the end (default: yes; the Landing's rite passes to Alkyone).
4. The one new download, the Stiltwalker, or the no-download fallback from the start (default: try the scout; take the fallback on any doubt).
5. Whether the post-game Gates gain anything (default: one flavour line only).
6. The perf bar: ≤ 1.00 of the Field (default) or Act V's 1.15.

## Blessings
Three for Act VI: the First's hearth. The header is boon.h6 «Η εστία της Πρώτης» / "The First's hearth", after «Τα φώτα της θάλασσας» (Act V).

**Nine lights.** A hero who lit all four Lost Lights (`flags.nineLit`), at any time including the post-game, has the Act VI blessing worth ×1.25 (stats.js; the shipped REMEMBERED constant, so no new number; the `.du` lines show the rounded-down values). Unbound still multiplies only BOONS[4], and Remembered only BOONS[5], as shipped. All three use existing stat keys and sit in Act V's power band (two stats each).
- bearer «Η Φέρουσα» / "The Bearer": { area: 12, dmgPct: 10 } (icon 'fire'): +12% area, +10% damage. ×1.25 when the nine burn: 15 / 12. — «Ό,τι κουβάλησες ως κάτω, σε κουβαλά τώρα εκείνο.» / "What you carried all the way down now carries you."
- word «Ο Λόγος του Γλαύκου» / "Glaukos's Word": { lifePct: 12, lifeOnHit: 12 } (icon 'shield'): +12% life, +12 life on hit. ×1.25: 15 / 15. — «Κάποιος κρατά τη φωτιά για σένα. Πήγαινε.» / "Someone is keeping the fire for you. Go."
- shade «Ο Ίσκιος σου» / "Your Shadow": { cdr: 8, critDmg: 20 } (icon 'star'): +8% cooldown reduction, +20% critical damage. ×1.25: 10 / 25. — «Ίσκιος θέλει φως. Όσο ρίχνεις ίσκιο, καις ακόμα.» / "A shadow needs a light. While you cast one, you still burn."

## Music
**Three new procedural THEMES in audio.js, two variants and one motif,** in the house style (modal harmony, drones, no samples). Act VI leans on the shipped themes on purpose: the Bottom is where the forgotten things lie, so their music lies there too.

**The hearth motif.** Three low, warm notes, a minor triad rising, as [55, 1.5], [58, 1.0], [62, 3.0] (G, B♭, D). At the relight its middle note rises to B natural (59) and it turns major. It sounds when each of the First's hearths catches; under the naming; and at the relight **in counterpoint with the lantern motif** (Arna's, audio.js `MOTIF`) **and the sea-light motif** (Einar's, Act V): three fires, one chord.

**'drained'.** 50 bpm, no beat, C Aeolian.
- A low bowed drone on C and G; slow drips as soft pitched pings; the vault's groans (Act V's ice-song instrument an octave and a half lower, falling from 600 to 120 Hz) before each rise and fall.
- In a fight, a low taiko every second bar under the strings' ostinato on the root.
- When a hearth is relit, the hearth motif on a soft horn, and a warm chord on the next bar.

**'bottom'.** 44 bpm, C Phrygian: a sub drone and near silence, with **the shipped Gate theme ('gate', audio.js) slowed ×0.75 and low-passed** as its bed: the bottom of the Gates plays the Gates' own music, remembered.
- In each drowned tier the matching shipped theme comes up through it, slowed and filtered the same way: 'crypt' in the Barrow, 'forest' in the Wood, 'town' in the Village.
- After `firstLit` ('bottomLit'): the drone is gone; the hearth motif on a flute every 16 bars; the 'gate' bed in C major.

**'gleaner'.** 6/8 at 104 bpm, C Locrian.
- Dry wooden clicks and clatters (the louse skitter as percussion), low brass in fourths.
- **Phase 2:** the drums stop dead whenever she curls, the music's own tell of the quiet her feet make, and crash back on the Rush.
- **Phase 3:** a thin high choir on 'i' while she drinks light, falling silent each time the hero is Out.

**'shade'.** Each borrowed form plays **the shipped Act I 'boss' theme** a fourth lower under a 900 Hz low-pass ("the shadow of it"), with a different lead instrument per form (brass, plucked strings, drums).
- **Form 4:** silence but a heartbeat, the hero's own footsteps echoed 1.2 s late (the MIRROR's sound), and the hearth motif struggling in the bass, one note at a time.
- On the Shade's end, a long held low C.

**'pherousa'** (a variant of 'sealit'; it replaces 'victory' for the end): 60 bpm, C major. The hearth motif harmonised, then the lantern motif and the sea-light motif enter and the three resolve together. On «Από πολύ βαθιά, μια φωτιά απαντά.» a held chord.

**Ambients:** 'drained' (drips, distant groans, a faint wind down the rope shaft); 'bottom' (near silence, a high faint hiss of rising black motes); 'thaw' (warm crackle, drips).

**SFX (14 new):** iceGroan, icicleFall, icicleShatter, lampDrink, lampFlare, blackLampOut, fireDim, fireOut, fireRekindle, gleanerClatter, gleanerCurl, gleanerMolt, stiltStep, shadeShift. Reused: splash, the louse sounds, sealBark, skotosRise, iceSing, towerBell (for the Gate ring's waking, pitched down).

## Echoes and post-game
**Echo refights,** once a day each, with normal loot and no story consequences:
- **The Gleaner:** «Θυμήσου την Αποφάγισσα» / "Remember the Gleaner", at her husk in the Wreck Heap, after `act6`.
- **The Shade:** «Ρίξε τον ίσκιο σου» / "Cast your shadow", at the Gate ring in the Hearth, after `act6`.
- **Toasts:** echo.rise6 «Ο βυθός θυμάται τη μάχη...» / "The deep remembers the fight..."; echo.done6 «Η ηχώ σβήνει. Ο βυθός θα θυμηθεί ξανά αύριο.» / "The echo fades. The deep will remember again tomorrow."
- **Look:** the Gleaner pale (0xd0d8e8 at 1.2, rim 0xe0e8ff); the Shade grey-black (0x1a1c24, rim 0xd0d8ff). story.js's echo branch gains both.
- The echo variants are given under each boss. Levels as the story fights.

**Two Act VI legendaries,** the bosses' first-kill drops (data.js `LEGENDARIES`, `LEG_FROM`, through the shipped `legFrom_<boss>` hook with `leg:`). Their effects are a few lines each in the Carried Fire's code:

| id | name | base | class | what it does | where |
|---|---|---|---|---|---|
| gleanerMandibles | «Οι Δαγκάνες της Αποφάγισσας» / "The Gleaner's Mandibles" | gloves | any | your kills give back twice the light (+0.4 m a kill in your ring), and a Light Gnaw or Drink on you drains half | the Gleaner's first kill (`LEG_FROM.gleaner`) |
| shadeRing | «Το Δαχτυλίδι του Ίσκιου» / "The Shade's Ring" | ring | any | your Cradle never falls below 1.5 m, and your hits on Shrouded foes outside light deal ×0.5 instead of ×0.3 | the Shade's first kill (`LEG_FROM.shade`) |

**What stays to play.**
- **Two zones that farm well at the cap:** heroes arrive at 47-50, so the Drained Sea and the Bottom are where Mastery levels come; the packs, the Black Water and the vault keep working on every build.
- **Seeds.** Both zones are procedural on the hero's own seeds; the Bottom's barrow and wood are new crypt and forest layouts each time, like a Gate's.
- **The four Lost Lights** for the ×1.25 blessing, finishable in the post-game.
- **The Shadow Gates** stay the post-game, opened from Isarn's planted staff, endless tiers, the Gate Guardian, unchanged. The Gate panel gains one flavour line, gate.bottom «Ο πάτος τους καίει» / "Their bottom burns". Players who meet the Gate Guardian now know what it is.

**After the act, people keep their word:** Selna's rite opens with «Φέρουσα, η Πρώτη.»; Alkyone keeps the Landing's; Glaukos keeps the hearth below; Tern rings the rope bell; the child says the name; Brokka and Elati have their lines.

## Risks
- **Continuity checks applied** (canon brief §4 and Act V's list):
  - **The hero never speaks.** Every word the hero "says" is second-person narration: the name («Λες το όνομά της: Φέρουσα.»), Isarn's word («Της λες τη λέξη που σου άφησε ο Ίσαρν»), Isarn's name («Της λες: ο Ίσαρν.»).
  - **«Σκότος» stays neuter** (το Σκότος, του Σκότους). Its lines stay lowercase with an opening ellipsis; its "i" follows from its last line in Act V.
  - **No line says "Karthax".** The Skotos is not his servant or his jailer, and nothing in this act concerns him.
  - **d.glaukos.r1 is reread, not rewritten:** the sea took the reason, not the name.
  - **The First's fire is neither a φρυκτωρία nor a φάρος** (d.isarn.e1 stands): it is «η φωτιά της» / "her fire", her «εστία» / "hearth".
  - **The Shadow Gates are explained, never changed** (canon rule 18): same panel, tiers, Guardian and staff. The Gate ring at the Hearth is one-way and story-only.
  - **Isarn stays dead**, a word passed down; **Brokka and Elati stay home and alive** (d.elati.home.r).
  - **Timeline words:** «πριν από κάθε μνήμη» / "before all memory", «χειμώνες που κανείς δεν τους μέτρησε» / "winters no one counted"; no new number is put on the First's age. Glaukos's "fifty years" of saying the names fits an old man.
  - **The First wears Selna's body,** as the woman of Ice Memory 1 already does (shipped: actors.js:542 `first: 'selna'`); the two are never in one zone.
  - **No line claims the First recognises Whitecliff's flame.** She recognises a fire that can go out.
  - **Selna is ancient, so no contractions;** the First likewise; Glaukos, Alkyone, Tern and Tamarisk are folk and use them.
  - Proofread all ~190 new lines against text.js for the house voice.
- **Repetition.** "Relight three things" is the series' rhythm (Act IV's five waylamps, Act V's three sea-lights), and Act VI's hearths could feel like a third round.
  - The hearths are found a new way: by following marks you can see only in your own light, so the Carried Fire is the navigation.
  - q36 turns the verb over: you **put out** the dark's lamps.
  - Neither boss fights like Act V's: a scavenger that eats the dead outside your light and rolls into its own pools, and a shadow that stands opposite you across a fire and answers your own skills.
- **Reused models reading as reused.**
  - **The Gleaner** is a Hull-louse at ×5.5: the look gate checks the stretched texels (fallback: the scan's own texture at 1024, +1.4 MB phone), and the code barnacles, the caught plank, the tint and the scale must read as a mother, not a big child.
  - **The Shade's forms are Act I's bosses on purpose,** and the story says so: they were always the Gate Guardian's three shapes. The skin patch and the near-black grade make them shadows.
  - **The Faded** are villagers under a void tint and a veil: checked beside the Sunken and the shorefolk.
- **The Faded on a phone.** Unseen enemies can feel unfair.
  - They must step into the hero's ring to strike her: a melee reach of 1.8 m is always inside a 4.5 m ring, so a Faded that hits her is solid, unless she is Out, a short state relit with a 1 s touch.
  - Their footprints and breath show where they walk, and their telegraphs are drawn at full opacity.
  - The `drained` scenario asserts that no Faded lands a blow while unseen with the ring above 1.5 m.
- **The relay boss.**
  - Swapping `G.bossActor` between forms must never leave two boss actors, or none, for a frame; the `shade` scenario asserts it.
  - **A death in form 3 or 4 restarts the fight at form 3** (runtime only, `G.shadeRetry`, never saved), because an eight-minute fight replayed whole from the Barrow Lord is harsh. A quit restarts at form 1. Act V's Skotos had no such retry, and its fight was shorter.
  - In co-op a form swap is told to guests as the old boss's death not shown plus a new boss: the `coop.mjs bosses` run covers it.
- **The mirror covers every loadout.** 21 skills over three classes, 24 variants, the later skills at 20, 30 and 40. MIRROR reads the skill's id, so variants need no rows. The `shade` scenario casts every skill once per class. In co-op it mirrors only the host's casts (a guest's are not on the host's wire); a guest it targets meets Shadow Lunge and the fixed per-class set.
- **Perf on real phones.**
  - perf6 is an estimate until it runs at stage A. SwiftShader shades hidden fragments, and a real GPU may differ either way.
  - The gate is stricter than Act V's (1.00 against 1.15), every saving is a compile-time define (`coast-perf.md` §3), every image has a q0 path, and the owner's phone run is part of G0 and G5.
  - Act VI adds no system that the Farthest Light, already at 0.92-0.99 of the Field, does not already run.
- **Memory.**
  - A cold start into Act VI is about 86-93 MB of phone texture, under the 110 MB bar.
  - frost.glb measures 30.68 MB against the people line's 30 MB (`assets-built.md`); Act VI adds no scene to it.
  - A full run of Acts I-VI stays near 670-675 MB, against the ~1 GB tab ceiling.
  - The unload of Acts II-IV is built in stage A rather than held as a contingency, because a sixth act makes the longest session longer; it frees about 300 MB on a phone when the hero is under the ice.
- **The Stiltwalker's provenance.** The only new download. A CC0 museum scan is the first choice. Every candidate passes the licence re-read, a reverse-image search and a storefront check before download, with the results saved beside the source. The no-download fallback (our own spider, re-rigged long-legged) is built in a day if anything doubts.
- **IP hygiene.**

  | avoid | because of | here instead |
  |---|---|---|
  | "the First Flame", "linking the fire", Kindling, the Kiln, the Age of Dark, the Abyss | Dark Souls (canon brief §4) | the fire is always «η φωτιά της» / "her fire" or «η εστία της Πρώτης» / "the First's hearth", never a proper noun; the hero relights an old woman's hearth with a coal and lets her sleep, while a blind man keeps it; nothing is linked, kindled or sacrificed |
  | "Silt Stiltwalker" | The Elder Scrolls (Morrowind) | the sea spider is «Ξυλοπόδαρος» / "Stiltwalker" (the pack id 'silt' is internal only) |
  | a named "Watch", "the watch does not end", the Long Night, the Wall | George R. R. Martin (canon brief §4) | the camps are "the Rope" and "the Well's Foot"; Glaukos's blessing is his "Word" |
  | "the Abyss", "abyssal" | the repository's other game, Abyssos | never used; the deep is «ο βυθός» / "the deep", «ο πάτος» / "the bottom" |
  | "Lethe", "Oblivion" as proper names | an Elder Scrolls title; tone | «λήθη» only as a common noun; English "forgetting" |
  | Ungoliant, a devouring darkness that eats light | Tolkien | the Skotos drinks light to stop remembering; it is a force with a new "i", not a spider or a hunger |
  | a dark mirror of the hero as a named boss | a common trope (Dark Link and its kin) | the Shade is the Gate Guardian revealed; its last form is the hero's shadow, cast by a real fire, standing opposite it, which is a rule, not a costume |
  | "Frozen X" enemy names | the elite affix «Παγωμένος» | none |
  | "Keeper", "Warden" as names | canon §5.10's collisions | «Αποφάγισσα», «Ίσκιος», «Ξέθωρος», «Ξυλοπόδαρος», «Λυχνοφόρος» |

  «Φέρουσα» is a Nereid's name from Greek myth (public domain), as Act V's Thaleia, Galini, Kymo and Glauke are.
- **The Skotos not fought.** Some players will want a last fight with it. The naming cine shows it rise and sink, its Act V echo still plays every day, and the act's fights are the Gleaner and the Shade. The owner decides (decision 2).
- **Scope.** About 34-43 days, against Act V's 47-58. The ship-first list and the cut order are under Engine work; the thawed reading, drowned Gate tiers, ambient life and a cameo are out of the base from the start.
- **build.js under concurrent edit.** All Act VI visuals live in build6.js; build.js gains only `ground6`, the ACT6 set and the X6 defines, which land after any other agent's work there. sea.js gains two defines.
- **Saves and state.**
  - Every flag is derived on load and saved before its scene, except `nameBack` (saved with `firstLit`).
  - Test quitting during the hook, between `call6` and `coal6`, during the arrival, between a hearth's flag and its memory, mid-Gleaner with the pools forced (they drain on reload), mid-lamp, mid-Shade in each form, and during the naming. `hook6` and `catch6` cover them.
  - Old saves without the flags read as quest 31 with `seaLit`. A hero has one set of flags on every difficulty.
- **Tone.** The dark, the forgotten and a woman alone at the bottom for longer than anyone counted are dark. The ending stays warm: a blind man who chooses to keep a fire, a name said in the light, Isarn's word reaching the first keeper, warm air out of a gate, and a fire answering from very deep. Every cine is short and skippable.
- **CREDITS.txt additions:** the Stiltwalker's author (CC-BY 4.0, if a CC-BY source is used; credited even if CC0); Poly Haven and ambientCG for the two layers (CC0, credited all the same). Everything else is already credited.

## Assets
Every third-party asset Act VI uses, new or reused, with its id, author, licence, what it becomes and its budget. "Phone MB" uses the engine brief's rule (RGBA8 × 1.33 for mips, maps of 1024 px or more halved on phones), and the reused figures are the measured ones from `assets-built.md`. **"To be verified" means the source has not been checked yet.** It is checked at stage 0 under Act V's gate before any download.

### Creatures (group `act6`, `ACT_FILES.act6 = ['louse', 'icemaw', 'tentacle', 'skotos', 'strider']`)
| role | asset | uid / source | author | licence | faces → game | maps | phone MB |
|---|---|---|---|---|---|---|---|
| **Stiltwalker (new)** | a giant sea spider (Pycnogonida) scan or sculpt | **to be verified** (stage-0 scout: Sketchfab CC0 museum scans first, e.g. natural-history collections; CC-BY 4.0 sculpts second) | to be verified | CC0 1.0 or CC-BY 4.0 only | ≤ 5k | 512 d, 256 n | 1.74 |
| *fallback* Stiltwalker | spider.glb rebuilt long-legged (strider.mjs) | our own build of the shipped spider | as spider.glb's credit | as shipped | as shipped | as shipped | 0 (boot-loaded textures) |
| the Gleaner (boss), the Hull-louse | louse.glb (shipped) | 3979c291d1f9454c90851efe291eab60 | ffish.asia / floraZia.com | CC0 1.0 | 2,502 | 512 d, 256 n | 1.74 (resident after Act V) |
| the Icemaw | icemaw.glb (shipped) | 3f4a2090598b4741ac38e0d255ece191 | Grace Belt (neatGrace) | CC-BY 4.0 | 5,316 | 1024 d, 512 n | 2.79 |
| Hands of the Skotos | tentacle.glb (shipped) | 8fcc783af94246a0b8febf424a4b96b9 | CG Daniel Glebinski | CC-BY 4.0 | 3,000 | code material | 0 |
| the Skotos (cine) | skotos.glb (shipped) | f4e2c262ed4e456484f232d6afa99629 ("Cloaked Figure") | MysteryPancake | CC-BY 4.0 | 13,442 | 512 n | 1.39 |
| the Shade's forms 1-3; the Gate-Fallen | barrowlord.glb, spider.glb, troll.glb, skeleton.glb (boot) | Act I's | as credited | as shipped | as shipped | as shipped | 0 (boot) |
| *optional* the Gleaner's texture at 1024 | the louse scan's own texture re-exported | 3979c291d1f9454c90851efe291eab60 | ffish.asia / floraZia.com | CC0 1.0 | | +1024 d | +1.4 |

**Not loaded in Act VI:** crab.glb, skua.glb and bear.glb (13.6 MB of phone memory on a cold start that Act VI does not pay).

### People (no new set)
| who | scene | set | change |
|---|---|---|---|
| Glaukos, Selna, Alkyone, Tern, Tamarisk, the Sunken, the Lampbearer | glaukos, selna, alkyone, tern, tamarisk, sunken | frost.glb (shipped, 25 textures, 30.68 MB) | none, or code parts |
| the First | selna | frost.glb | a runtime void-ice tint, a code icicle crown and brand |
| the Faded | villager0-2 | people.glb (boot) | a runtime void tint and a code veil |
| the Shade's form 4 | warden, ranger, mage | people.glb (boot) | the skin patch and a near-black grade |
| Halda, Elianthe, the villagers, the child | as shipped | people.glb, frost.glb | none |

*Optional, only if the First fails her look gate beside Selna:* a one-scene set `deep` (folk.mjs --set=deep, recipe 'first' from the 'healer' or 'smith' source with an ANCIENT table and Hair_Long), gated at ≤ 6 measured textures: about 0.3 MB raw and about 6 MB phone.

### Props (pack `silt`, tools/pack-silt.mjs, and the shipped `rime`)
| prop | asset | source | licence | phone MB |
|---|---|---|---|---|
| wrecks, keel-boats, rowboats, broken boats, toppled sea-lights (towerA/B/C), anchors, whale, kelp, barnacle rocks, driftwood, casks, crates, the oil lamp, the shack, icicles, cliffs | the rime pack (shipped, 25 props) | as credited in `src/assets/rime/CREDITS.txt` | CC-BY 4.0 and CC0 1.0 | 24.75 (resident after Act V) |
| the drowned barrow's kit, the village houses, the forest trees, boulders (for keels) | Act I's boot sets (kits, env, village, trees) | as credited | as shipped | 0 (boot) |
| bone piles | the shipped skeleton in its 'bonePile' pose, frozen as a static actor | (boot) | as shipped | 0 |
| hearth rings, braziers, black lamps, shadow-walls, keels, stilt frames, the rope and winch, the Gate ring at ×2.2, the First's crown and brand | code (Act V's cairn and stilt-hut builders, the Act I gate prop, models.js) | none | none | 0 |

No new prop is needed. pack-silt.mjs carries only the two layers.

### Ground layers (pack `silt`, d 1024 / n 512)
| layer | candidates (to be verified for look) | licence | phone MB |
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
| new: the Stiltwalker | about 0.35 MB | 1.74 MB |
| new: two layers | about 0.5 MB | 5.58 MB |
| optional: the Gleaner at 1024; the `deep` set | +0.4 / +0.3 MB | +1.4 / +6 MB |
| **new, total** | **about 0.9-1.6 MB (≈ 1.2-2.2 MiB of artifact)** | **about 7.4-15 MB** |
| a cold start into Act VI (rime pack and layers 41.5, frost 30.7, the act6 group 7.7, the silt layers 5.6, code 0.4) | | **about 86-93 MB** (budget 110) |
| after a run through Act V | | **+7.4-15 MB** |
| a full run of Acts I-VI | | **about 670-675 MB** (about 370 MB with the unload of Acts II-IV) |

Act V added about 10 MiB to the artifact and about 93 MB of phone texture. Act VI adds about a fifth of the first and a sixth of the second.

## Asset audit
- strider (to be found) ok=gated lic=CC0 or CC-BY 4.0: the only download. Gate: the licence re-read on the download page; a reverse-image search of the thumbnail; a storefront check (Fab, CGTrader, Unity Asset Store); no AI-generation flags; the results saved beside the source in /tmp/claude-0/sf. Reject bulk uploaders, contradictory licences, and anything resembling a named creature of a game or film. | REPLACEMENT: spider.glb rebuilt long-legged (our own file), then STAND_IN spider ×1.3.
- gleaner 3979c291d1f9454c90851efe291eab60 ok=True lic=CC0 1.0: shipped. Look gate at ×5.5 for stretched texels. | REPLACEMENT: the scan's own texture at 1024 (CC0).
- shade forms (barrowlord, spider, troll; people.glb warden, ranger, mage) ok=True lic=as shipped: boot-loaded. Look gate under the skin patch. | REPLACEMENT: none needed; the plain near-black tint without the patch.
- faded (people.glb villagers) ok=True lic=CC0: runtime tint and code veil. | REPLACEMENT: none needed.
- lampbearer (frost 'sunken' + rime oilLamp) ok=True lic=CC0: no new texture. | REPLACEMENT: none needed.
- first (frost 'selna') ok=gated (look) lic=CC0: must read apart from Selna. | REPLACEMENT: the optional `deep` set (CC0 Quaternius sources).
- gateFallen (skeleton.glb) ok=True: boot-loaded. | REPLACEMENT: none needed.
- layers silt, iceWall ok=gated (look) lic=CC0 1.0: Poly Haven and ambientCG sources resolve through their APIs (both reachable through the proxy, engine brief §6.3). | REPLACEMENT: rime/shore and rime/ice at other scales and tints.
- Downloaders: Act V's (Sketchfab API v3 with `$SKETCHFAB_API_TOKEN`, Poly Haven, ambientCG) are reused; sources go to /tmp/claude-0/sf and /tmp/claude-0/ph, never into the repository.

## What this proposal deliberately does not do
- No new rendering system, no render target, no post-processing, no ceiling in play, no full-screen water, no reflection.
- No new people scene, no people set loaded beyond `frost`, and no folk or grove load (Act V's 88.6 MB cameo cost stays in Act V).
- No thin ice (ice.js idle), no beams, no aurora sky in play.
- No change to how the Shadow Gates play, and no relocation of Isarn's staff.
- No third fight with the Skotos.
- No Blender step: every build is the Node pipeline of Acts II-V (engine brief §6.1).
