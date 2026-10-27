# Act VI: Beneath the Ice (proposal: systems-first)

«Πράξη VI: Κάτω από τον Πάγο» / "Act VI: Beneath the Ice". Latin V and I, as canon §5.6 sets for IV and V.

Act VI begins from a save at quest 31 (`seaLit`). The Skotos has been named and has sunk under the ice; the Farthest Light burns, the sea-lights answer down the coast, and every night Selna says the names at the tower. Her rite still opens with a hole in it: «Η Πρώτη, που τ' όνομά της το πήρε η θάλασσα» / "The First, whose name the sea took" (d.glaukos.r1). And Alkyone, in the post-game, has already promised the player the act: «Οι πύλες σας δεν έχουν πάτο, λέτε; Έχουν. Είναι κάτω από τον πάγο μας.» / "Your gates have no bottom, you say? They do. It's under our ice." (d.alk.gates).

**The act in three sentences.** Under the sea ice the tide still runs: twice a day the sea goes out from under the ice, the ice settles on the seabed, and a world of air-filled hollows opens, which the flood fills again. The hero goes down Einar's Stair at the great ebb, melts the Great Keels that close the way, defeats Charybdis, the beast whose breath is the tide, and climbs down through four tiers of forgotten places (the stuff the Shadow Gates are made of) to the Floor where the Gates end. There, calling the First's name into the dark, she gets the game's oldest answer, «Κανείς» / "No one", and No One rises to keep the name it holds.

**The angle of this proposal: systems first.** Every new rule is an existing system with one new input, so the act plays best and costs least:
- **tide.js** gains a second threshold: under a roof, the flood *opens* the high ground as it closes the low (the keels lift), so one clock moves the floor, the roof and the light at once;
- **light.js** gains a third kind of zone, `'under'`, and one actor rule, *unseen*: what is not lit is forgotten. It is the heir of Act IV's Shroud (which cut damage outside light) and of the bosses' darkness (Ivar's Dark, Karthax's, the Skotos's Night), turned from a damage rule into a visibility rule;
- **the Shadow Gates' tier machinery** (boot.js `startGate`, world.js `gateMul`) becomes a story place: the act's second zone is four tiers built by the Gates' own generators, and the post-game Gates gain Drowned tiers built by the act's;
- the Act V rules carry over unchanged where they apply: the Cold, the cracking ice, lamp light that holds the ice, fire that melts it, beams that reveal.

**The look in one idea: the sky is above the ice, and only its light comes through.** The gameplay camera never sees a ceiling (pitch 0.95 rad, engine brief §0.2), so the roof of ice is never drawn. It is shown by what it does: green light falling through its thin places onto the seabed, ice walls lit from inside, keels of ice hanging to the floor and lifting with the tide, icicles dripping, and the dark at the flood when the sea drowns the light from above.

**Scope** (the owner's frame is Act V's; Engine work is honest where it costs):
- **Zones** (2 generators, 6 zone ids):
  - `hollows`, «Τα Κοιλώματα του Πάγου» / "The Ice Hollows", level 34: the air caverns between the sea ice and the seabed off the Light's Skerry, open at the ebb.
  - `tier1`-`tier4`, «Οι Βαθμίδες» / "The Tiers", level 37: four forgotten places drifted down beneath the ice, each built by a Shadow Gate generator (crypt, forest, halls, a drowned Landing) and drowned by the act's pass.
  - `floor`, «Ο Πάτος» / "The Floor", level 37: the bottom of the Gates and the finale.
- **5 new enemy kinds** (two downloads, one people set of two recipes, one code-built creature) and **4 reused** from Act V (the Sunken, the Harpooner, the Hull-louse, the Icemaw); the tiers' guardians reuse the Gate Guardians' kinds (Barrow Lord, Weaver, troll).
- **2 bosses:** Charybdis, the Mouth of the Sea (a download), and No One, Who Answers (the shipped Skotos figure, regraded; no download).
- **Quests 32 to 38**; the new end state is **39**.
- **3 mechanics:** the Breathing Ice (Ο Πάγος που Ανασαίνει); What Is Not Lit Is Forgotten (Ό,τι δεν Φωτίζεται Ξεχνιέται); the Tiers (Οι Βαθμίδες).
- **A world-state chain:** `underCall` → `stairOpen` → `keel0`-`keel2` → `charybdisDown` → `tier1`-`tier4` → `kaneisDown` → `pharo` (with `sunrise`).
- **Also:** six optional names in the Hollows (the blessing ×1.25 and the finale's faces), three blessings, five themes and a motif, two echoes, two legendaries, a 13th Mastery track, Drowned tiers in the Shadow Gates, co-op roles and mechanic interacts for guests.
- **Budget:** about 1.9 MB raw and 11-12 MB of new phone texture, because the act is built from systems and shipped assets (itemised under Assets). A cold start at the `farlight` waypoint also loads the act5 group and the rime pack, already counted by Act V.
- **Estimate:** 42-52 focused days (Engine work), against Act V's 47-58.

---

## Story
### premise
**At quest 31.** The sea-lights burn, the North knows the Saltborn's name (q.31), Selna keeps the nightly rite at the Farthest Light, Glaukos at the Landing, and the title says «Το σκοτάδι έχει όνομα» / "The dark has a name" (game.sub5). Three things are left open by what ships:
- **The First has no name.** Every rite since Act V opens on «Η Πρώτη» because "the sea took" her name (d.glaukos.r1, and the naming roll after it). Ice Memory 1 showed her: «Μια γυναίκα ανάβει φωτιά πάνω σε έναν βράχο, με ξύλα που έφερε το κύμα.» / "A woman lights a fire on a rock, with wood the waves brought in." (d.ice.i1.2).
- **The Shadow Gates' "no bottom"** (d.isarn.after) has been answered with a promise and no road (d.alk.gates).
- **The Skotos has an "I"** since its naming: «...ναι... αυτό... είμαι...» / "...yes... that... is what I am..." (d.skotos.die2). A thing that has a name cannot hide (d.alk.b3), and neither can its bottom.

**What is under the ice.** The sea under the sea ice still has its tide. At low water the ice settles on the high rocks of the seabed and the water drains out from beneath it, leaving hollows of air roofed by ice, which the flood fills again (a real thing on Arctic coasts, where people go under the sea ice at the lowest tides to gather mussels). The Saltborn call this «η μεγάλη άμπωτη» / "the great ebb" and have always gone down at it, by Einar's Stair, a stair the young Einar cut through the Light's Skerry to the seabed. Nobody has ever gone below the Throat, the great sump where the sea breathes.

**What the Shadow Gates are** (said by Selna, shown by the tiers). Whatever the North forgets sinks, a tier at a time, into the dark under the ice: a hall no one lights candles in any more, a glade no one walks to, a gallery sealed so as not to remember. The passages that open where those places were are the Shadow Gates. They opened in the mountains as the fires failed (d.isarn.r5), because that was when the North stopped remembering; they have no bottom for the one who walks down them, because forgetting does not end; and they all end in one place, the Floor, where the dark keeps what it took. **How the Gates play does not change** (canon §4 item 18); the act adds a road to their floor and Drowned tiers to their endless list.

**The hook.** On the next town entry, the Farthest Light on Whitecliff's northern horizon flashes four times and goes dark, again and again: someone is calling someone. The village child of Act V sees it first. At the tower, Selna says that last night, after «Η Πρώτη», the ice answered her in the voice of the sea: «...την κρατώ...» / "...i hold her...". The dark holds one name still, the oldest; while it holds one, it knows the way up. She opens Einar's Stair, Tern takes the bell-rope, and Alkyone goes down with the hero as far as any Saltborn has gone.

### villain
**Κανείς / No One** (in the boss's title: «Κανείς, Αυτός που Απαντά» / "No One, Who Answers"). In English it is always capitalised as a name: "No One".

**What it is.** The shape of everything the dark took and the world forgot, risen at the Floor, where the Shadow Gates end. The Skotos is the dark itself, and it was named; No One is what the dark holds that has no name: the forgotten, gathered into one figure. It wears no face of its own; six frozen figures of the forgotten circle it, and its last face is the First's. It is the true Gate Guardian: every Gate Guardian the player has struck down at the end of a Shadow Gate (the Barrow Lord's shape, the Weaver's, the troll's: boot.js `gateKill`) was one of the shapes it keeps of what the North feared and forgot.

**How it ties to the shipped lines.**
- The game's oldest open line is Arna's on the Field: «Φωνάζει ένα όνομα. Κανείς δεν απαντά.» / "He calls a name. No one answers." (d.lamp.m1.2). The dark's own word has always been «κανείς» (act5-design, villain: "Its word is «κανείς»"). At the Floor the hero calls the First's name into the dark, and the narration says exactly that, «Κανείς δεν απαντά», and then something does: «...κανείς. αυτό είναι τ' όνομά μου.» / "...no one. that is my name." The Odyssey's Οὖτις, the oldest trick in Greek, turned round: here it is not a hero hiding behind the name, it is the forgotten.
- **It is not Karthax, not the Skotos's servant, and not a new tyrant.** It has no wish and grants none. It holds, the way ice holds. It speaks lowercase, in fragments, like the Skotos, but it says «εγώ» / "i": it has a name, the only one it could keep.
- **It never threatens.** It pities: «...κανείς δεν τους φωνάζει. κανείς δεν τους θέλει πίσω...» / "...no one calls them. no one wants them back...".

**Charybdis (Η Χάρυβδη)**, the first boss, is no villain: a beast of the Saltborn's tales that lives coiled in the Throat and breathes the sea under the ice in and out, «Πίνει τη θάλασσα και τη δίνει πίσω» / "It drinks the sea and gives it back". It guards the only way down because it is the way down.

**What the dark never does in Act VI.** It never rises again as a boss (Act V's naming holds); its sleeping shadow passes under the ice of the tiers and the Floor, and does not attack. No line names Karthax. No shard, no wish.

### twist
Three blows, each built from shipped lines, at three points in the act.

**1. The Shadow Gates are what the North forgot (q36, the four tiers' Ice Memories).**
- d.isarn.r5 «Στα βουνά άνοιξαν οι Σκιοπύλες» / "The Shadow Gates have opened in the mountains" and d.isarn.after «Οι Σκιοπύλες δεν έχουν πάτο. Όσο πιο βαθιά πας, τόσο πιο πολύτιμα αυτά που φέρνεις πίσω.» / "...The deeper you go, the richer what you bring back." have only ever been flavour.
- Tier 1's memory: the night the first beacon goes out, a hall of kings no one remembers sinks, and a passage full of dark opens where it was: «Έτσι ανοίγουν οι Σκιοπύλες: όπου ο κόσμος ξεχνά, ο τόπος βουλιάζει μια βαθμίδα.» / "That is how the Shadow Gates open: wherever the world forgets, the place sinks one tier."
- The tiers *are* the Gates' own levels: the player walks a rimed crypt and a frozen Whisperwood glade built by the same generators the post-game uses (world.js:135), and a Deepstone gallery and a drowned Landing. «Τόσο πιο πολύτιμα»: older forgetting lies deeper.

**2. "No one answers" is answered (q37, the Floor).**
- d.lamp.m1.2, the boy Arna on the Field: no one answered. Act V showed the other side of that night (Einar calling Arna's name a few miles off, unheard), and the line stayed true.
- At the Floor the second person narration repeats the line word for word, and No One answers. The Ranger hears one more line, because it holds one of her people: «...κι εσένα, παιδί του δάσους... έχω μια δική σου...» / "...and you, child of the wood... i have one of yours..." (Kranea, below).

**3. The First's name was never lost: it became the word for every sea-light (q38, the rite).**
- On the Floor, on the hearth-stone of the very first fire, the hero reads a name cut by hand: «ΦΑΡΩ» / "PHARO". A Greek-reading player sees it at once.
- Selna, at the rite, says the name aloud, then hears it: «...Φαρώ. Φάρος.» Her people built lights like hers and called each one after her, a φάρος; the sea covered her rock, and the world forgot the woman and kept the word.
- «Χίλια χρόνια τη φωνάζαμε με τ' όνομά της, κάθε βράδυ, και δεν το ξέραμε.» / "A thousand years we called her by her name, every night, and did not know it."
- So the dark did not destroy the name; it hid it in plain speech. «Ένα όνομα που το λες χωρίς να ξέρεις ποιανού είναι, δεν κρατά κανέναν.» / "A name you say without knowing whose it is holds no one." Every «Άναψε τον φάρο» / "Light the sea-light" the player pressed in Act V said her name.

**Nothing is retconned.**
- Glaukos's rite line stays true: the sea did take her name, as a person's name, and left a word.
- The word «φάρος» first appeared in Act V (canon §1.5), so no older line is disturbed; every φρυκτωρία is still the brow-stone's fire (d.isarn.e1).
- The Shadow Gates keep their endless tiers and their Guardian (canon item 18). They gain a history and a floor; they lose nothing.
- No One is not the Skotos: the Skotos was named and sleeps; its shadow passes under the ice and never strikes.
- Karthax is never named; nothing here says the crown knew about the Gates.

**Old lines that read differently afterwards** (no line changes):
- d.isarn.after «Οι Σκιοπύλες δεν έχουν πάτο»: true for the one who walks down them; they all end at the Floor.
- gate.guardian «Ο Φύλακας της Πύλης εμφανίστηκε!»: one of No One's shapes.
- d.lamp.m1.2 «Κανείς δεν απαντά»: and once, at the bottom of the world, No One did.
- Every Act V prompt «Άναψε τον φάρο»: her name.
- d.halda.2 «Η Βαθύπετρα ήταν σπίτι μας πριν γεμίσει σκιές.» and «Οι Λιθογενείς δεν ξεχνούν.»: tier 3 is the one gallery they chose to seal, and Brokka asks not to be told what is in it.
- d.elianthe.1 «Το δάσος ήταν δικό μας κάποτε.» / "The forest was ours, once.": Elianthe wove garlands in the glade of tier 2 as a girl, and had forgotten.

### ending
**The naming at the Floor** (cine `kaneisDown`, flag saved first):
- The hero, in narration: d.kaneis.you «Λες το όνομα που διάβασες στην πέτρα: Φαρώ.» / "You say the name you read on the stone: Pharo."
- No One, kneeling at the edge of the Bed: d.kaneis.die1 «...φαρώ... ζεστή ήταν... σαν φωτιά πάνω σε βράχο...» / "...pharo... she was warm... like a fire on a rock..."
- d.kaneis.die2 «...κι εμένα... κανείς... ποτέ...» / "...and me... no one... ever..."
- Narration: d.floor.end «Κανείς δεν απαντά. Αυτή τη φορά είναι μόνο ησυχία.» / "No one answers. This time it is only quiet."
- At the hearth, a pale memory figure of a woman (Selna's scene in the memory material, as in Ice Memory 1) says the creed: d.first.1 «Φως στο νερό, για να μείνει το νερό νερό.» / "Light on the water, so the water stays water." She walks into her fire and is gone.
- d.floor.rise «Ένα ένα, μικρά φώτα ανεβαίνουν από το μαύρο νερό, προς τον πάγο, προς τα πάνω.» / "One by one, small lights rise out of the black water, toward the ice, upward." Big toast q.kaneisDown «Ό,τι κρατούσε ο Πάτος ανεβαίνει» / "What the Floor held rises".
- setQuest(38).

**The rite** (cine `rite6` at the Farthest Light, dusk, pitch 0.25 from the skerry; music 'pharo'):
- Narration d.rite6.0 «Λες στη Σέλνα το όνομα που διάβασες στην πέτρα.» / "You tell Selna the name you read on the stone."
- Selna: d.selna.r1 «Φαρώ.» / "Pharo." Then d.selna.r2 «...Φαρώ. Φάρος.» / "...Pharo. Pharos."
- d.selna.r3 «Χίλια χρόνια λέμε κάθε φως μας φάρο. Χίλια χρόνια τη φωνάζαμε με τ' όνομά της, κάθε βράδυ, και δεν το ξέραμε.» / "A thousand years we have called every light of ours a pharos. A thousand years we called her by her name, every night, and did not know it."
- d.selna.r4 «Ένα όνομα που το λες χωρίς να ξέρεις ποιανού είναι, δεν κρατά κανέναν. Απόψε ξέρουμε.» / "A name you say without knowing whose it is holds no one. Tonight we know."
- **Mage only** (`rl()` already takes `.m` since Act V): d.selna.r5.m «Το Τάγμα σου ήξερε κάποτε πως κάθε φλόγα έχει ένα όνομα. Πες τους ποιο ήταν της πρώτης.» / "Your Order once knew that every flame has a name. Tell them what the first one's was." (pays off d.alk.a5.m).
- The rite, as floating `say` lines 0.8 s apart: «Φαρώ.», «Έιναρ.», «Άρνας.», then every name of the six the hero recovered in the Hollows, every Act V Name-stone she lit, «Ίβαρ.», «Ίσαρν.», and last «Σκότος.» over the naming chord.
- The answer (the act's end beat, in the family "a fire answered by people"): d.answer6.1 «Κάτω στην Ακτή, ένας ένας, οι φάροι δυναμώνουν, σαν να άκουσαν.» / "Down along the coast, one by one, the sea-lights flare, as if they heard." Each is the Act V farFire flash with a bell, 1.2 s apart.
- **The first sunrise of the year** (flag `sunrise` saved with `pharo`): d.sun.1 «Το πρωί ο ήλιος βγαίνει πάνω από τον πάγο, για πρώτη φορά μετά τον χειμώνα. Μένει λίγο, όσο κρατά ένα τραγούδι.» / "In the morning the sun rises over the ice, for the first time since winter. It stays a little, as long as a song." (Alkyone, Act V: «Εδώ πάνω ο ήλιος δεν βγαίνει τον χειμώνα.»)
- Alkyone: d.alk.z1 «Άργησε φέτος. Λέω πως περίμενε ένα όνομα.» / "It was late this year. I say it was waiting for a name."
- Tern: d.tern.z1 «Φαρώ. Θα το θυμάμαι.» / "Pharo. I'll remember." (the child's «Θα το θυμάμαι.» from Act V, at the other end of the North).
- **Ranger only, if she remembered Kranea:** Tamarisk: d.tam.z1.r «Η Κρανιά ανέβηκε μαζί σου, αδελφή. Θα λέμε κι αυτήν, κάθε βράδυ.» / "Kranea came up with you, sister. We'll say hers too, every night."
- Flags `pharo` and `sunrise`. actComplete(6), then offerBoons(6).
  - «Πράξη VI — Ολοκληρώθηκε» / "Act VI — Complete".
  - act6.sub «Ένα όνομα ξανά, από τον πάτο του πάγου» / "A name again, from the floor of the ice".
  - act6.next «Οι Σκιοπύλες σε περιμένουν. Τώρα ξέρεις πού τελειώνουν.» / "The Shadow Gates await. Now you know where they end."
- End state q.39 «Η Πρώτη έχει πάλι όνομα, κι οι Σκιοπύλες πάτο. Οι Σκιοπύλες σε περιμένουν.» / "The First has her name again, and the Shadow Gates a floor. The Shadow Gates await."

**After the act.**
- The title subtitle becomes game.sub6 «Κάθε φάρος έχει ένα όνομα» / "Every sea-light has a name" once any hero has `act6 >= 0`.
- Selna's nightly rite and Glaukos's open with «Φαρώ.» instead of «Η Πρώτη.», and include the six names.
- Glaukos: d.glaukos.u1 «Μου είπαν τ' όνομά της. Φαρώ. Μια ζωή το είχα στο στόμα μου και δεν το γνώριζα.» / "They told me her name. Pharo. All my life it was in my mouth and I didn't know it."
- Alkyone at the Landing replaces d.alk.gates with d.alk.gates2 «Είδες τον πάτο. Τώρα ξέρεις τι είναι οι πύλες σας: ό,τι ξεχάσατε. Πήγαινε όσο βαθιά θέλεις. Θα χτυπάμε την καμπάνα.» / "You've seen the floor. Now you know what your gates are: whatever you forgot. Go as deep as you like. We'll ring the bell."
- Whitecliff: Elianthe d.elianthe.v6 «Ένα ξέφωτο με στεφάνια στα κλαδιά, λες; Έπλεκα εκεί μικρή. Το είχα ξεχάσει.» / "A glade with garlands on the branches, you say? I wove them there as a girl. I'd forgotten."; Halda d.halda.v7 «Οι τέσσερις λάμψεις ήθελαν να πουν «έλα γρήγορα». Το ήξερα.» / "The four flashes did mean 'come quick'. I knew it."; the child d.child6.3 «Φαρώ. Αυτό το λένε τώρα πρώτο στον βορρά. Το έμαθα κι αυτό.» / "Pharo. That's what they say first up north now. I learned that one too."
- Deepstone: Brokka d.brokka.v6 «Λένε πως είδες μια στοά μας εκεί κάτω. Ξέρω ποια. Μη μου πεις τι είδες. Τη σφραγίσαμε για να μη θυμόμαστε. Κι αυτό μνήμη είναι.» / "They say you saw one of our galleries down there. I know which. Don't tell me what you saw. We sealed it so as not to remember. That's a memory too."
- The Shadow Gates gain Drowned tiers and a depth readout (Echoes and post-game).

### beats
- q32 [town] q.32 «Πήγαινε στον Έσχατο Φάρο: η Σέλνα σε ζητά» / "Go to the Farthest Light: Selna is asking for you".

**The hook.**
- **Who sees it:** a save with `h.act5 >= 0`, quest 31 and `seaLit`, without `underCall`.
- **When:** on the next town entry; for a hero finishing Act V after the update, 2 s after the Act V blessing panel closes ('actClosed'). Flag `underCall` is saved first.
- **What happens** (cine at pitch 0.3 toward the north, the Act V hook's framing): the far sea-lights hold their 12 s flash (FAR_BEACONS `flash`), and the fourth fire, the Farthest Light, flashes four times and goes dark, again and again (farFire gains a `call` pattern: 4 × 0.35 s on, 2.5 s off).
  - Narration d.call6.1 «Μακριά στον βορρά, πάνω από τη θάλασσα, ο Έσχατος Φάρος αναβοσβήνει: τέσσερις λάμψεις και μια σιωπή, ξανά και ξανά.» / "Far to the north, over the sea, the Farthest Light flashes: four flashes and a silence, again and again."
  - The child by Isarn's staff (the Act V child, frost 'tern' scene in the village tint): d.child6.1 «Το βλέπεις κι εσύ; Σαν να φωνάζει κάποιον.» / "Do you see it too? Like it's calling someone." Then d.child6.2 «Εσένα φωνάζει. Το ξέρω. Θυμάμαι τ' όνομά τους.» / "It's calling you. I know. I remember their name."
  - Toast «Νέα αποστολή», q32.
- **Barks.** Halda: d.halda.v6 «Τέσσερις λάμψεις. Στο αμόνι, τέσσερα χτυπήματα θα πει «έλα γρήγορα». Μάλλον το ίδιο.» / "Four flashes. At the anvil, four strikes means 'come quick'. Same thing, likely." Elianthe: d.elianthe.v5 «Πάλι βορράς; Πάρε ζεστό ψωμί. Κι έλα πίσω.» / "North again? Take warm bread. And come back."
- **From the Gates as well:** after `seaLit`, the Gate Guardian of any tier says one floating line as it dies, in the Skotos's pale colour: d.gate.down «...πιο κάτω...» / "...further down..." (flavour; it sets nothing).
- **New act5.next** (for heroes finishing Act V after the update): «Πράξη VI: Κάτω από τον Πάγο. Η Σέλνα σε ζητά στον Έσχατο Φάρο.» / "Act VI: Beneath the Ice. Selna is asking for you at the Farthest Light."

**Selna at the Farthest Light** (d.selna.u1-u8, one dialog; Selna has no contractions in English):
- u1 «Ήρθες. Το Γλαρόνι έλεγε πως δεν θα δεις το φως. Του είπα: οι φρυκτωροί κοιτάζουν πάντα βόρεια.» / "You came. Tern said you would not see the light. I told him: beacon-keepers always look north." (d.isarn.2 «Κοίτα βόρεια.»)
- u2 «Κάθε βράδυ λέω τα ονόματα. Η Πρώτη. Έιναρ. Άρνας. ...Χθες, μετά την Πρώτη, ο πάγος απάντησε.» / "Every night I say the names. The First. Einar. Arna. ...Last night, after the First, the ice answered."
- u3 «Δεν τραγούδησε. Μίλησε, με τη φωνή της θάλασσας: «...την κρατώ...»» / 'It did not sing. It spoke, in the voice of the sea: "...i hold her..."'
- u4 «Το Σκότος έχει όνομα τώρα. Ό,τι έχει όνομα δεν κρύβεται. Ούτε ο πάτος του.» / "The Skotos has a name now. What has a name cannot hide. Nor can its floor."
- u5 «Η κόρη μου σού είπε πως οι πύλες σας έχουν πάτο. Έχουν. Ό,τι ξεχνάτε στον νότο κατεβαίνει εκεί, σκαλί σκαλί. Οι Σκιοπύλες σας είναι ο δρόμος του.» / "My daughter told you your gates have a floor. They do. Whatever you forget in the south goes down there, step by step. Your Shadow Gates are its road."
- u6 «Κι εκεί κάτω είναι τ' όνομά της. Το τελευταίο που κρατά. Όσο κρατά ένα, ξέρει τον δρόμο προς τα πάνω.» / "And down there is her name. The last it holds. While it holds one, it knows the way up."
- u7 «Ο Έιναρ έσκαψε μια σκάλα στον βράχο, ως τον βυθό. Κατέβαινε στη μεγάλη άμπωτη να μαζέψει μύδια κάτω από τον πάγο.» / "Einar cut a stair in the rock, down to the seabed. He went down at the great ebb to gather mussels under the ice."
- u8 «Δύο φορές τη μέρα η θάλασσα φεύγει κάτω από τον πάγο. Κατέβα όταν φεύγει. Ανέβα πριν γυρίσει. Το Γλαρόνι θα χτυπά την καμπάνα.» / "Twice a day the sea goes out from under the ice. Go down when it goes. Come up before it returns. Tern will ring the bell."
- u8 is the act's first rule, taught in one breath; the HUD's tide dial appears with it.

**Einar's Stair.** An ice-sealed arch at the Farthest Light's west foot (on the skerry core, thick cells): «Άνοιξε τη Σκάλα του Έιναρ» / "Open Einar's Stair", a 1.5 s channel from the Cradle (fire melts the seal). Flag `stairOpen` saved first; the arch's ice slumps in steam; the exit `{ to: 'hollows', label: 'exit.hollows', locked: 'stairOpen' }` opens there. Shut line d.stairShut «Η σκάλα είναι κλειστή με πάγο. Η Σέλνα ξέρει πώς ανοίγει.» / "The stair is sealed with ice. Selna knows how it opens."
- Tern at the bell-post beside it: d.tern.b1 «Εγώ θα χτυπάω την καμπάνα. Όταν γυρίζει η θάλασσα, τρεις φορές. Μην αργήσεις.» / "I'll ring the bell. When the sea turns, three times. Don't be late."
- Alkyone: d.alk.u1 «Κατεβαίνω μαζί σου ως εκεί που ξέρω. Πιο κάτω από τον Λαιμό δεν πήγε ποτέ κανείς μας.» / "I'll come down with you as far as I know. Below the Throat, none of us has ever gone."

- q33 [farlight → hollows] q.33 «Κατέβα τη Σκάλα του Έιναρ στη μεγάλη άμπωτη» / "Go down Einar's Stair at the great ebb".

**Arrival in the Hollows** (cine, flag `hollowsSeen` saved first; pitch 0.45, the camera low over the Bell Camp looking north across the Mussel Flats; the zone clock starts at the beginning of low water, as Act V's does on every entry):
- d.hol.1 «Από πάνω σου ο πάγος, χοντρός όσο ένα σπίτι. Η θάλασσα έχει φύγει από κάτω του κι άφησε τον βυθό γυμνό.» / "Above you the ice, as thick as a house. The sea has gone out from under it and left the seabed bare."
- d.hol.2 «Από τις λεπτές μεριές του πάγου πέφτει πράσινο φως: το σέλας, από την άλλη μεριά.» / "Through the thin places in the ice falls green light: the aurora, from the other side."
- Alkyone: d.alk.v1 «Άκου. Ο πάγος ανασαίνει με τη θάλασσα. Όταν εκείνη φεύγει, κάθεται στον βυθό. Όταν γυρίζει, σηκώνεται.» / "Listen. The ice breathes with the sea. When the sea goes, it settles on the seabed. When it comes back, it lifts."
- d.alk.v2 «Στην άμπωτη πήγαινε χαμηλά. Στην πλημμυρίδα ψηλά, εκεί που σηκώνονται οι Καρίνες. Κι όπου δεν φτάνει φως, μην εμπιστεύεσαι τα μάτια σου.» / "At the ebb go low. At the flood go high, where the keels lift. And where no light reaches, don't trust your eyes."
- One-time hints, each on its first trigger: hint.keel «Οι Καρίνες σηκώνονται με την πλημμυρίδα και κάθονται με την άμπωτη» / "Keels lift with the flood and settle with the ebb"; hint.unseen «Ό,τι δεν φωτίζεται δεν το βλέπεις. Φέρ' το στο φως.» / "What is not lit, you cannot see. Bring it into the light."

**The Bell Camp** (Η Καμπάνα της Σκάλας: an air-bell at the stair's foot, always dry; brazier; waypoint `hollows`; a checkpoint). Tamarisk has come down to mend whoever comes back up (healer and vendor):
- d.tam.u1 «Ήρθα να γιατρεύω όσους ανεβαίνουν. Εδώ κάτω το σκοτάδι ξεχνά ό,τι δεν φωτίζεις. Κράτα τη φωτιά σου κοντά.» / "I came to mend whoever comes back up. Down here the dark forgets whatever you don't light. Keep your fire close."
- d.tam.u1.r «Αδελφή. Σε μια από τις καμπάνες του βυθού είναι παγωμένη μια δική μας. Η Κρανιά. Θυμήσου τη για μένα.» / "Sister. In one of the bells of the seabed, one of ours lies frozen. Kranea. Remember her for me."
- d.tam.again6 «Πάρε ό,τι χρειάζεσαι. Κι αν βρεις όνομα κάτω από τον πάγο, φέρ' το πάνω.» / "Take what you need. And if you find a name under the ice, bring it up."
- Glaukos is not here (he is blind and keeps the Landing). Alkyone stays at the camp between beats and goes ahead to each Great Keel's south pad, the Act V rule (she vanishes and reappears; walkTo only in open arenas).

- q34 [hollows] q.34 «Λιώσε τις τρεις Μεγάλες Καρίνες ({0}/3)» / "Melt the three Great Keels ({0}/3)". Progress toast q.keelMelt «Μια Μεγάλη Καρίνα έλιωσε ({0}/3)» / "A Great Keel melts ({0}/3)"; per stage q.keelStage «Η Καρίνα λεπταίνει» / "The keel thins".

**The Great Keels** (mechanics: the Breathing Ice). Three walls of ice from roof to seabed across the main way north, each frozen to its ridge so deep that no tide lifts it. Each has a Saltborn oil-pot on a dry pad at its south foot (interact «Άναψε το λάδι» / "Light the oil", 1.5 s from the Cradle). Each melts in three stages.
- Keel 1, the teaching keel: Nameless only, at the edge of a skylight. Alkyone: d.alk.m1 «Φωτιά λιώνει, φως κρατά. Το έμαθες πάνω στον πάγο· ισχύει κι από κάτω.» / "Fire melts, light holds. You learned it on top of the ice; it holds underneath too."
- Keel 2: a Siphon in the trough beside it and Rime-hangers on the roof over the pad. Alkyone: d.alk.m2 «Άναψέ το στην πλημμυρίδα και το λάδι θα κολυμπήσει κάτω απ' όλη την Καρίνα. Μόνο μη μείνεις πολύ στο νερό.» / "Light it at the flood and the oil will float under the whole keel. Just don't stay in the water long."
- Keel 3, the Throat's door: a flooded basin where Lightdrinkers bloom at high water, an Icemaw in the deep sump. Alkyone, as it falls: d.alk.m3 «Τρεις. Μέτρησα κάθε σταγόνα.» / "Three. I counted every drop."
- Flags `keel0`-`keel2`, each saved as its keel falls (the cells open with map.open, the Act V slag-plug pattern). Stages are runtime: a keel left half-melted is whole again on the next entry.

**Optional along the way: the six Forgotten (Οι Ξεχασμένοι).** Six air-bells across the Hollows each hold a frozen figure under clear ice: someone the dark took and the world forgot. Interact «Θυμήσου» / "Remember", 1 s: the narrator npc.iceMemory «Μνήμη από πάγο» / "A memory in ice" says one line; a lamp lights in the niche above the window (lamp light r 4, a warm pool, a checkpoint); the id is appended to `h.flags.names6` in the order found; toast q.names6 «Ονόματα: {0}/6» / "Names: {0}/6". The lamp holds the keels near it (a pinch inside lamp light never grounds), so each name opens a route for good. All six set `allNames`: toast «Μνήμη των Ξεχασμένων: η ευλογία του βυθού δυναμώνει» / "Memory of the Forgotten: the blessing of the deep grows stronger". The names count again in No One's second phase.
- d.n6.speio «Σπειώ. Μάζευε μύδια κάτω από τον πάγο στη μεγάλη άμπωτη. Μια φορά δεν πρόλαβε την παλίρροια.» / "Speio. She gathered mussels under the ice at the great ebb. Once she didn't beat the tide." (the first bell, by the camp: it teaches the clock)
- d.n6.kymo «Κυμώ. Κατέβηκε στον πάγο με τη δίδυμή της να του πει τ' όνομά του κατάμουτρα. Γύρισε η άλλη.» / "Kymo. She went down onto the ice with her twin to say its name to its face. The other came back."
- d.n6.egil «Έγκιλ. Βαρκάρης από τον νότο. Ήρθε για ξύλα από τα ναυάγια και ξεχάστηκε μαζί τους.» / "Egil. A boatman from the south. He came for wreck-wood and was forgotten with it." (in the Drowned Ships)
- d.n6.kranea «Κρανιά. Ήρθε από το δάσος, παιδί ακόμα, πριν από εκατό χειμώνες. Δεν είδε ποτέ ξανά φθινόπωρο.» / "Kranea. She came from the wood, still a child, a hundred winters ago. She never saw another autumn."
  - .r «Κρανιά. Ήρθε από το δάσος, παιδί ακόμα. Τ' όνομά της είναι χαραγμένο και στις πέτρες του δικού σου δάσους.» / "Kranea. She came from the wood, still a child. Her name is cut in the stones of your wood too." (d.tear.nursery.3)
- d.n6.thoe «Θόη. Έκοβε τις Καρίνες με φωτιά, για να περνούν οι άλλοι. Την τελευταία την έκοψε από τη λάθος μεριά.» / "Thoe. She cut the keels with fire so the others could pass. The last one she cut from the wrong side." (beside Keel 3: a warning)
- d.n6.aktaios «Ακταίος. Χτυπούσε την καμπάνα της άμπωτης σαράντα χρόνια. Μια νύχτα τη χτύπησε για κάποιον άλλον, κι έμεινε κάτω.» / "Aktaios. He rang the ebb bell for forty years. One night he rang it for someone else, and stayed below." (by the Throat; Tern rings the same bell)
- They can be found in the post-game; every name found joins the rite.

**Ebb hoards.** Two or three chests per seed in the lowest hollows (bed ≤ 0.3), the first cells to flood: open them at low water and get out at the bell.

- q35 [hollows] q.35 «Νίκησε το Στόμα της Θάλασσας στον Λαιμό» / "Defeat the Mouth of the Sea in the Throat".

**The Throat** (cine `throatWake`, flag saved first, when the hero first steps through the third keel; pitch 0.6 over the arena):
- d.thr.1 «Στη μέση της σπηλιάς ανοίγει ένα πηγάδι μαύρου νερού. Ανασαίνει.» / "In the middle of the cave a well of black water opens. It breathes."
- Alkyone: d.alk.c6 «Η Χάρυβδη. Στα παραμύθια μας πίνει τη θάλασσα τρεις φορές τη μέρα και την ξερνά πίσω.» / "Charybdis. In our tales it drinks the sea three times a day and spits it back."
- d.alk.c7 «Τρεις λένε τα παραμύθια. Δύο είναι. Τα μέτρησα.» / "The tales say three. It's two. I counted." (her voice: she counts tides)
- The water drains with a roar; a long grey neck rises out of the well, streaming.

**Boss: Charybdis, the Mouth of the Sea** (see Bosses). Alkyone calls from the north ledge, one line per phase:
- Phase 1: d.alk.x1 «Όταν ρουφάει, μείνε στο χείλος! Όταν ξερνάει, ανέβα ψηλά!» / "When it draws in, stay at the lip! When it spews, get up high!"
- Phase 2: d.alk.x2 «Άναψε τα λυχνάρια στις καμπάνες! Στο φως δεν βγαίνει. Άφησέ του μια τρύπα σκοτεινή και περίμενέ το εκεί.» / "Light the lamps on the ledges! It won't come up in the light. Leave it one dark hole and wait for it there."
- Phase 3: d.alk.x3 «Λάδι! Δώσ' του λάδι αναμμένο όταν ρουφάει!» / "Oil! Give it burning oil when it draws in!"

**Death.** It chokes on the fire, sinks into the well, and the well drains with a long sigh: the Throat stops breathing. Flag `charybdisDown` saved first.
- Alkyone: d.alk.x4 «Κοιμήσου κι εσύ. Πιες όση θάλασσα θέλεις. Τα φώτα μας μόνο μην τα πίνεις.» / "Sleep, you too. Drink all the sea you want. Just don't drink our lights."
- d.thr.2 «Το πηγάδι στραγγίζει με έναν μακρύ αναστεναγμό. Στον πάτο του, σκοινιά παλιά σαν τον βράχο κατεβαίνουν στο σκοτάδι.» / "The well drains with a long sigh. At its bottom, ropes as old as the rock go down into the dark."
- d.alk.x5 «Πιο κάτω δεν πήγε ποτέ κανείς μας. Θα σε περιμένω εδώ, με το φως αναμμένο.» / "None of us has ever gone further down. I'll wait for you here, with the light lit."
- The exit `{ to: 'tier1', label: 'exit.tiers', locked: 'charybdisDown' }` is the rope at the well's bottom. Shut line d.throatShut «Το πηγάδι ανασαίνει ακόμα. Κάτι ζει εκεί μέσα.» / "The well still breathes. Something lives in it."

- q36 [tier1-tier4] q.36 «Κατέβα τις βαθμίδες ως τον Πάτο ({0}/4)» / "Go down the tiers to the Floor ({0}/4)". On each arrival, toast q.tier «Βαθμίδα {0} · {1} οργιές κάτω από τον πάγο» / "Tier {0} · {1} fathoms beneath the ice".

**Each tier** (mechanics: the Tiers): a ladder foot with a Tier-lamp («Άναψε το λυχνάρι» / "Light the lamp", 1 s: a checkpoint and warm pool r 6; flag `tier<k>`), an Ice Memory window beside it (the memory plays once the lamp is lit; the Act V guard offers «Θυμήσου» on every entry until it is seen), dead lamps to light along the way, a Guardian of the Tier at the far end, and past it the ladder down («Κατέβα» / "Climb down", 1 s, a fade). Each memory is three lines in the 'memory-ice' material, present tense; the narrator npc.iceMemory.

**Tier 1, «Η Αίθουσα που Ξεχάστηκε» / "The Forgotten Hall"** (a crypt, genCrypt): d.ice.t1.*
- .1 «Τη νύχτα που σβήνει η πρώτη φρυκτωρία. Μια αίθουσα βασιλιάδων στα βουνά, όπου κανείς δεν κατεβαίνει πια να ανάψει τα κεριά.» / "The night the first beacon goes out. A hall of kings in the mountains, where no one goes down to light the candles any more."
- .2 «Ο τελευταίος γέρος που ήξερε τον δρόμο πεθαίνει εκείνη τη νύχτα. Το πρωί, στη θέση της αίθουσας, ένα πέρασμα γεμάτο σκοτάδι.» / "The last old man who knew the way dies that night. In the morning, where the hall was, a passage full of dark."
- .3 «Έτσι ανοίγουν οι Σκιοπύλες: όπου ο κόσμος ξεχνά, ο τόπος βουλιάζει μια βαθμίδα.» / "That is how the Shadow Gates open: wherever the world forgets, the place sinks one tier."
- Guardian: the Barrow Lord's shape (a Gate Guardian kind).

**Tier 2, «Το Ξέφωτο που Ξεχάστηκε» / "The Forgotten Glade"** (a forest, genForest): d.ice.t2.*
- .1 «Ένα ξέφωτο στο Δάσος των Ψιθύρων. Κάποτε εδώ τα κορίτσια του Λευκόβραχου έπλεκαν στεφάνια.» / "A glade in the Whisperwood. Once the girls of Whitecliff wove garlands here."
- .2 «Ύστερα ήρθε η Υφάντρα, και κανείς δεν ξαναπήγε. Τα κορίτσια μεγάλωσαν και ξέχασαν.» / "Then the Weaver came, and no one went again. The girls grew up and forgot."
- .3 «Το ξέφωτο κατεβαίνει στο σκοτάδι με τα στεφάνια ακόμα στα κλαδιά.» / "The glade goes down into the dark with the garlands still on its branches."
- Guardian: the Weaver's shape.

**Tier 3, «Η Στοά που Ξεχάστηκε» / "The Forgotten Gallery"** (Deepstone's halls, genHalls): d.ice.t3.*
- .1 «Μια στοά της Βαθύπετρας. Οι Λιθογενείς δεν ξεχνούν. Αυτήν τη σφράγισαν για να μη θυμούνται.» / "A gallery of Deepstone. The Stoneborn don't forget. This one they sealed so as not to remember." (d.halda.2)
- .2 «Πίσω από την πόρτα, ένα αμόνι κι ένα σφυρί που δεν το σήκωσε κανείς ξανά.» / "Behind the door, an anvil, and a hammer no one lifted again."
- .3 «Τι έγινε εδώ, η πέτρα δεν το λέει. Η πέτρα κρατά τον λόγο της.» / "What happened here, the stone does not say. The stone keeps its word."
- Guardian: the troll's shape (rare, the Gates' thunder affix, as boot.js spawns it).

**Tier 4, «Η Σκάλα που Ξεχάστηκε» / "The Forgotten Landing"** (the Saltborn's old harbour, genTier's own 'landing' kind): d.ice.t4.*
- .1 «Η Σκάλα των Αλιγενών, όπως ήταν όταν έκαιγαν εννιά φάροι κι ήταν τόσοι που δεν χωρούσαν γύρω από ένα τζάκι.» / "The Saltborn's Landing as it was when nine lights burned, and they were too many for one hearth." (d.glaukos.2)
- .2 «Λιγόστεψαν. Τα σπίτια άδειασαν ένα ένα. Ό,τι αδειάζει, το σκεπάζει το σκοτάδι.» / "They grew fewer. The houses emptied one by one. Whatever empties, the dark covers."
- .3 «Πιο κάτω, πιο παλιά από κάθε σπίτι, ένας βράχος με μια εστία. Εκεί άναψε η Πρώτη τη φωτιά της.» / "Further down, older than any house, a rock with a hearth. There the First lit her fire."
- Guardian: a Nameless champion pack led by a rare Forgetter (`teleporter`, `frozen`).

**Tier lines.** At the first Guardian's fall a floating line in the pale colour: d.gate.down «...πιο κάτω...». The Skotos's shadow (`uShade`, r 8, 2 m/s) passes under the tiers' ice floors once per tier, never striking: d.tier.shade «Κάτω από τον πάγο του πατώματος, κάτι τεράστιο γυρίζει στον ύπνο του.» / "Under the ice of the floor, something vast turns in its sleep."

- q37 [floor] q.37 «Φώναξε το όνομα στον Πάτο» / "Call the name at the Floor". After `kaneisWake`, q.37b «Νίκησε Αυτόν που Απαντά» / "Defeat the One Who Answers".

**The Floor** (cine `floorSeen`, flag saved first; pitch 0.5):
- d.floor.1 «Ο Πάτος. Πιο κάτω δεν έχει. Μόνο μαύρο νερό, που ανασαίνει σαν κάποιος που κοιμάται.» / "The Floor. There is nothing further down. Only black water, breathing like someone asleep."
- At the south rim, a rock with a ring of fire-blackened stones. Interact «Διάβασε την πέτρα» / "Read the stone": d.floor.2 «Στην πέτρα της εστίας, χαραγμένο με χέρι, ένα όνομα: ΦΑΡΩ.» / "On the hearth-stone, cut by hand, a name: PHARO."
- The arena's ring prompt «Φώναξε το όνομα» / "Call the name" (at the Bed's edge; flag `kaneisWake` saved first): d.floor.3 «Φωνάζεις τ' όνομα στο σκοτάδι. Κανείς δεν απαντά.» / "You call the name into the dark. No one answers." (d.lamp.m1.2, word for word in the second person)
- Two seconds of silence; the ice sings once. Then: d.kaneis.1 «...κανείς...» / "...no one..."; d.kaneis.2 «...ναι. κανείς. αυτό είναι τ' όνομά μου.» / "...yes. no one. that is my name."
  - .r (Ranger, if Kranea is not yet remembered): d.kaneis.2.r «...κι εσένα, παιδί του δάσους... έχω μια δική σου...» / "...and you, child of the wood... i have one of yours..."
- A figure of rime and black water rises out of the Bed, six frozen figures turning around it.
- Phase 2: d.kaneis.p2 «...τους κρατώ όλους. κανείς δεν τους φωνάζει. κανείς δεν τους θέλει πίσω...» / "...i hold them all. no one calls them. no one wants them back..."
- Each face named: d.name6.say «Λες τ' όνομα: {0}. Η μορφή σηκώνεται και γίνεται φως.» / "You say the name: {0}. The figure rises and becomes light." A face not known: d.name6.lost «Δεν ξέρεις αυτό το όνομα. Η μορφή βουλιάζει πίσω στο νερό.» / "You don't know this name. The figure sinks back into the water."
- Phase 3: d.kaneis.p3 «...κι εκείνη. την πρώτη. την κρατώ από πριν υπάρξουν χρόνια...» / "...and her. the first. i have held her since before there were years..."
- The naming and the rise (see ending). setQuest(38).

- q38 [floor → farlight] q.38 «Ανέβα στον Έσχατο Φάρο και πες το όνομά της στη Σέλνα» / "Climb to the Farthest Light and tell Selna her name". The Floor's hearth now burns (a camp and waypoint `floor`); the tiers' ladders, the Throat's rope and Einar's Stair are the way up, or the waypoints.
- The rite, the answer and the sunrise (see ending). End state q.39.

**Lines at home after the update** (talk variants on flags; no model loads): Brokka d.brokka.v5 (after `underCall`) «Ακούω πως ο βορράς σε φωνάζει πάλι, ξένε. Κράτα το σφυρί σου στεγνό.» / "I hear the north is calling you again, stranger. Keep your hammer dry."; Elati d.elati.v5 (after `underCall`) «Πάλι στον πάγο; Οι ρίζες λένε πως εκεί κάτω τα ονόματα κρυώνουν.» / "The ice again? The roots say that down there the names grow cold." (.r «...Αν βρεις κάποια δική μας, αδελφή, φέρ' την σπίτι.» / "...If you find one of ours, sister, bring her home."); then the lines under ending.

**Catch-ups on zoneEnter** (the Act IV and V pattern; every flag is saved before its scene):

| flag | catch-up |
|---|---|
| `underCall` | → 32 |
| `stairOpen` | → 33; the arch is open on every build of farlight |
| `hollowsSeen` | → 34 |
| `keel0`-`keel2` | each keel's cells open on build and entry; all three → 35 and `throatWake` on the next Throat entry |
| `throatWake` without `charybdisDown` | the fight starts again at low water |
| `charybdisDown` | → 36; the Throat is dry, its rope exit open |
| `tier<k>` with its memory unseen | the window offers «Θυμήσου» and questGoal points at it |
| `tierG1`-`tierG4` (Guardians down) | each ladder open; all four → 37 |
| `floorSeen` without `kaneisWake` | the stone and the call are offered again |
| `kaneisWake` without `kaneisDown` | the fight starts again; its faces fall again |
| `kaneisDown` without `pharo` | → 38; the hearth burns; the rite plays on the next Farthest Light entry |
| `pharo` without `h.act6` | → actComplete(6) |

Quitting mid-cine never strands a save. Tides, keel stages, faces and phases are runtime; zones rebuild from their seeds.

### npcs
Act VI adds no NPC scene. Everyone is a shipped frost-set Saltborn, a shipped villager, or a memory or statue look of a shipped scene. The only new people recipes are the two enemies of the new `pale` set (see Assets).

- selna Σέλνα / Selna: the quest-giver (q32-33) and the rite (q38). Ancient voice, no contractions in English; says names the way other people breathe.
  - **Where she stands:** the Farthest Light (as in the post-game); never below the ice.

  | model | |
  |---|---|
  | source | existing (frost 'selna') |
  | notes | Unchanged. Her scene in the memory material is also the First at the Floor's hearth, as it was the woman of Ice Memory 1: the player has seen this face before without knowing whose it was. |
- alkyone Αλκυόνη / Alkyone: goes down with the hero as far as the Throat (q33-35), calls Charybdis, waits at the dry well with her lamp lit; at the rite. She counts things (tides, keels, drops).
  - **Where she stands:** the Bell Camp; ahead of the hero at each Great Keel's pad; the Throat's north ledge; the dry well (q36-37); the Farthest Light (q38); the Landing post-game (d.alk.gates2).

  | model | |
  |---|---|
  | source | existing (frost 'alkyone') |
  | notes | Unchanged. Clips: Idle_Lantern_Loop, Walk_Loop, Idle_Talking_Loop, OverhandThrow (the oil-flask fail-safe). |
- tern Γλαρόνι / Tern: rings the ebb bell at the top of Einar's Stair. The bell the player hears under the ice is his (a positional sound from the Stair's foot, 6 s before each turn).

  | model | |
  |---|---|
  | source | existing (frost 'tern') |
  | notes | Unchanged; Idle_Rail_Call (the Act V shorefolk's bell clip). The same scene in the village tint is still the Whitecliff child of the hook. |
- tamarisk Μυρίκη / Tamarisk: healer and vendor at the Bell Camp; carries the Ranger's thread (Kranea).

  | model | |
  |---|---|
  | source | existing (frost 'tamarisk') |
  | notes | Unchanged. |
- glaukos Γέρο-Γλαύκος / Old Glaukos: at the Landing; his post-act line and his rite now open with «Φαρώ.».

  | model | |
  |---|---|
  | source | existing (frost 'glaukos') |
  | notes | Unchanged. |
- first Η Πρώτη (Φαρώ) / The First (Pharo): seen once, as a pale memory figure at the Floor's hearth after the naming.

  | model | |
  |---|---|
  | source | existing-model-retint |
  | notes | The frost 'selna' scene in the 'memory-ice' material, a fire-blackened right hand (a tint on the hand bone's vertices in code), no lantern, no fur collar. |
- forgotten Οι Ξεχασμένοι / the six Forgotten (Speio, Kymo, Egil, Kranea, Thoe, Aktaios): frozen figures under clear ice in the Hollows' bells, and the six figures that circle No One.

  | model | |
  |---|---|
  | source | existing-model-retint |
  | notes | Statues through the shipped `a.statue` ice-blue path (ai.js:108-112) and the keepers' statue spawn (actors.js), each a different shipped scene so the six read apart: Speio frost 'alkyone' (no lantern); Kymo people.glb 'healer'; Egil people.glb 'villager2'; Kranea frost 'tern' with Elati's ELF hair colour; Thoe people.glb 'smith'; Aktaios frost 'glaukos' without the eye band. Around No One they are the same scenes at ×0.45 inside an ice shard (the 'icy:' material), so a named one can stand up full size as a memory figure. |
- child Παιδί / A child (Whitecliff): sees the call first (q32) and learns the First's name afterwards.
- halda / elianthe / brokka / elati: home lines only (see beats and ending).
- kaneis Κανείς / No One: speaks only in lowercase `say` lines, with a white-rimmed black disc as its dialog portrait (npc.kaneis «Κανείς» / "No One"). Its shape is the boss model (Bosses).
- iceMemory Μνήμη από πάγο / A memory in ice: the narrator portrait, as in Act V.

## Zones
### How the hero gets there from Whitecliff
**The route:** Whitecliff → the Field of Ash (dawn) → the Anvil's Neck → the Frozen Coast → Skerry Bay's road north (open since the Freeze) → the Farthest Light (waypoint `farlight`) → **Einar's Stair**, at the tower's west foot → the Ice Hollows → the Throat, once Charybdis is down → its rope → the four tiers by their ladders → the Floor.

**Waypoints:** `hollows` (the Bell Camp) and `floor` (the Floor's hearth, once `kaneisDown`). The panels.js waypoint list gains both; the tiers are reached on foot from the Throat, so each Tier-lamp is a respawn checkpoint, not a waypoint (Act V's sea-light rule). A hero who wants to farm the tiers walks from the `hollows` waypoint through the dry Throat (about 40 s).

**The farlight change** (the only change to an Act V zone): the arch and the exit on the skerry core's west side, at (cx − 5, cz + 4.5), on thick cells already reachable (gen5's reach checks unchanged); the ice seal is an act6Prop that melts on `stairOpen`, and act6Enter opens it on every entry (zones are cached, Act V's rule). Tern's bell-post beside it after `underCall`. A parity script checks that genFarlight over check-act5's seed sweep differs only in those cells and their 2-cell band.

### hollows (34) Τα Κοιλώματα του Πάγου / The Ice Hollows
LAYOUT: genHollows(seed) in a new src/world/gen6.js. The map is 132 × 180 cells. `ZONES.hollows = { level: 34, music: 'hollows', ambient: 'hollows', atmos: 'hollows', act: 6, pack: 'seabed', light: 'under', ring: 4 }`. The zone has a tide (the Breathing Ice) and no thin-ice field (the floor is seabed; the ice is the roof).

**New layout fields** (beside Act V's `L.bed`, `L.tideLocked`, `L.window`):
- `L.keel` (Float32): for a pinch cell, the water level `lift` at which its keel lifts off the ridge (0.45-0.75, quantised to 0.15); 0 elsewhere. A pinch cell is closed while `h < lift` and open (by its bed) while `h ≥ lift`.
- `L.great` (Uint8): the three Great Keels' cells (k + 1), solid until `keel<k>`.
- `L.sky` (spots): skylights, `{ x, z, r0 }`.
- `L.sumps` (spots): sump centres and radii (open water, bed −0.6, always closed).
- `L.bells` (spots): the air-bells, `{ x, z, r, figure }`.

South to north:

**(A) The Bell Camp (Η Καμπάνα της Σκάλας).** The entry (exit 'farlight' at the stair foot, h − 6, x = 66 ± 6). An air-bell of r 9, `bed = BED_DRY`, roofed by thick blue ice that comes down to the floor all round it (the zone's walls in the ice material): the brazier (camp, waypoint, warm pool r 8), Tamarisk, Alkyone, the stair's spiral in code against the south wall, the bell-rope hanging down from Tern's post above, mussel baskets.

**(B) The Mussel Flats (Τα Μυδοτόπια).** x 16-116, z 112-164. A broad low cavern floor:
- **Bed:** `bed = 0.15·round((0.75·fbm(x·0.05, z·0.05) + 0.25·ridge(x, z)) / 0.15)` clamped to 0-1.2, lowered toward each sump by `0.6·(1 − d/6)`.
- **3-5 sumps** (r 1.5-3) at local minima: the flood rises out of them first, visibly.
- **Ice pillars** where the roof rests on the seabed for good: 8-12 blocked circles of r 1-2 in the ice material, where a noise mask passes 0.72.
- **Skylights:** 4-6, r0 3-5, where a second noise mask (the roof's thinness) passes 0.8. The teaching ground for the light.
- **Two bells** (r 4-5, BED_DRY), each with a Forgotten figure (Speio's is always the one nearest the camp).
- **Mussel beds** along bed 0.3-0.6 (instanced code shells), kelp heaps (the rime pack's scan), whale bones (the rime whale's rib set, scattered).
- **Ebb hoards** in hollows with bed ≤ 0.3, at least 25 m from the camp.

**(C) The Keel Ridges (Οι Καρίνες).** z 56-112, the zone's spine:
- Two or three east-west ridges (bed 0.9-1.6) between troughs (bed 0-0.45). The main way north crosses them at chokes.
- **Pinches:** 6-10 small keels on ridge chokes 2-4 cells wide (`L.keel` = 0.45-0.75). They teach "go high at the flood".
- **The three Great Keels** on the main way at z ≈ 104, 84 and 62 (± 4), each across a choke 6-8 cells wide, with a dry oil pad (2 × 2, BED_DRY) at its south foot. Keel 2 has a sump within 8 m (the Siphon); Keel 3 sits at the mouth of a flooded basin (bed 0.15-0.45, r 9) that is the Throat's antechamber.
- **Two bells** (Thoe's beside Keel 3; Kymo's or Kranea's on a ridge).

**(D) The Drowned Ships (Τα Πνιγμένα Καράβια).** An east lobe, x 96-130, z 70-130: three or four wrecks (the rime pack's Dalarö hull, Gislinge boats, rowboats) caught between the roof and the seabed at a list, Sunken crews dormant under kelp (Act V's `tideWake`, unchanged), Hull-lice in the hulls, ebb hoards in the bellies, Egil's bell.

**(E) The Throat (Ο Λαιμός).** The boss arena, centred at (66 ± 6, 26 ± 3), r 18 (see Bosses). A sill of bed ≥ 1.5 closes it from the zone's water, so the zone tide never enters `L.boss + 4`, and Charybdis drives the arena's water itself (`TIDE.force`, the Walking Tower's precedent). Aktaios's bell on its south rim. After `charybdisDown`, its central well is dry: a rope exit to `tier1`.

**The main way** is painted and runs camp → Flats → Keels 1-3 → the antechamber → the Throat. At low water with the pinches grounded it is walkable from the camp to Keel 1; at high water the way over the ridges opens through the pinches.

**Over seeds.**
- **Retries:** seed + k·7919, 24 tries, the last accepted (gen4's loop); keyed by difficulty like Act V (`hollows@<diff>`).
- **What varies:** the cave graph's walk (the gen3 trail-walker, amplitude 18), the ridges' count and bends, sumps, pillars, skylights, which bells hold Kymo and Kranea (the Flats or the Ridges; Speio, Thoe, Egil and Aktaios are fixed), the wreck set, the hoards.
- **Height (`L.hgt`, visual only; every walkable cell at y = 0):** the ice walls rise 4-6 m (they meet the unseen roof); sumps −2.5; the ground under the flood is the seabed at 0.
- **Reach checks, after dressing** (check-act6.mjs; three water levels: h = 0 with every pinch closed, h = 0.6 with the pinches at their lift open, h = 1.2):
  - the camp reaches Keel 1's pad at h = 0 and at h = 1.2, and every bell at one of the three levels at least;
  - **the flood rule (hard):** every cell walkable at h = 0 has a path, walkable at h = 0, of at most 22 m to a cell that stays walkable at h = 1.2 and is joined at h = 1.2 to a bell or the camp. (At the act's 5.4 m/s and the tide's 6 s grace a hero caught at the turn always gets out.)
  - **the ebb rule (hard):** the same with the levels swapped: no high-water pocket is cut off when the keels settle;
  - every Great Keel's pad, every bell window, every interactable and every exit on `BED_DRY`; the hoards checked at h = 0 only;
  - the Throat's lip (r 4-5, thick) continuous; its three ledges joined to its entry at h = 0 and at h = 1.2;
  - **soft:** the mean tries per seed above 3; any pinch whose lift leaves its ridge open for under 20 s of a cycle (too short to use).

ATMOS:
- **ATMOS.hollows** (low water): fog 0x06121a, density 0.03; sky 0x1e3a48; ground 0x0e1418; hemi 0.45; moon 0x7ac8b0 (aurora-green through the ice), moonI 0.5; exposure 1.35; heroI 22, heroRange 9, heroColor 0xffe8c8; zoom 1.0.
- **ATMOS.hollowsFlood** (mixed in by `MOOD.tide`, 0 at low water to 1 at high): fog 0x030a10, density 0.04; hemi 0.25; moonI 0.15. The sea drowns the light from above: skylight radii fall to 0 by h = 0.9.
- **ATMOS.throat** (the fight): hollows with zoom 1.15; 'throatNight' for phase 2 (fog 0x020608, density 0.045, hemi 0.15, moonI 0.05).
- **FX ambient 'hollows':** drips from the roof (falling drops within 12 m that ring on the water), ice dust drifting in the skylights' shafts, bubbles from sumps, a breath puff from the hero and people (Act V's head-bone emitter).
HAZARDS:
- **The Breathing Ice:** the flood (wading Cold +4/s, closing low cells), the keels' grounding at the ebb (pressing out along a lane), the Siphons' surges.
- **The dark at the flood:** skylights drown; the Nameless are unseen outside light.
- **Rime-hangers** dropping from the roof over chokes; their ice-falls.
- **Lightdrinkers** blooming in the flood water and drinking lamps.
- **Icemaw** lunges from deep sumps (Act V's lurker, unchanged).
- **Whale-oil casks** in the wrecks (Act V's: light, warmth, fire that floats and melts).
SET PIECES:
- The arrival: blue silence, green light falling through the ice onto a bare seabed.
- The first flood: water welling up out of the sumps, racing along the troughs, the keels creaking and lifting off the ridges with a dark slot of water under them.
- Burning oil floating under a Great Keel at high water, the keel dripping and thinning, steam rolling along the roof's underside.
- The six frozen figures, each lit by its own lamp once remembered.
- The Throat breathing; the neck rising out of the well.
- The well draining with a long sigh; the old ropes going down into the dark.
GROUND/PROPS: **The 'seabed' pack** (tools/pack-seabed.mjs, `loadPack('seabed')`; PACK_ORDER gains it last). It is mostly the rime pack's shipped layers and scans under new rules:
- **GROUND.hollows:** A `shore` (rime's low_tide_rocks: wet rock and shingle, the seabed), B `mud` (one new CC0 layer, see Assets; the Mussel Flats), P `snowTrod`'s normal under a dark grade (the painted way), W the ice wall material (rime's `ice` layer, world-projected, with the 'icy:' fresnel); G_WET from `aBed` (Act V), new G_CAUST (skylight caustics, see The look).
- **Props:** the Great Keels and pinch keels (code: ice blocks in a translucent variant of the ice material); ice pillars and wall icicle curtains (rime's Icicle 01, Elin Hohler, CC-BY 4.0, shipped); mussel beds (code, instanced); kelp heaps (rime's kelp scan, shipped); whale ribs (rime's whale, shipped); the wrecks (rime's, shipped); oil-pots (code: a clay pot and a wick); the bell-rope and stair (code); bell windows (Act V's ice window, shipped); lamps (rime's vintage_oil_lamp, shipped).

### tier1-tier4 (37) Οι Βαθμίδες / The Tiers
LAYOUT: genTier(seed, k) in gen6.js. **Each tier is a Shadow Gate level built by the Gates' own generator, then drowned:**

| tier | id | name | source generator | size |
|---|---|---|---|---|
| 1 | tier1 | «Η Αίθουσα που Ξεχάστηκε» / "The Forgotten Hall" | genCrypt(seed, { rooms: 9, mh: 30 }) (the Gates call it with 12 rooms) | 78 × 90 |
| 2 | tier2 | «Το Ξέφωτο που Ξεχάστηκε» / "The Forgotten Glade" | genForest(seed, { w: 90, h: 100 }) (the Gates use h 120) | 90 × 100 |
| 3 | tier3 | «Η Στοά που Ξεχάστηκε» / "The Forgotten Gallery" | genHalls(seed, { mw: 28, mh: 34 }) (Act II): its lava channels become the Bed's black water, its forge room the sealed gallery | 84 × 102 |
| 4 | tier4 | «Η Σκάλα που Ξεχάστηκε» / "The Forgotten Landing" | genTier's own 'landing' kind: a cove of stilt-hut rows and nine dead light-stumps on a seabed shelf, built from gen5's Landing primitives | about 100 × 100 |

`ZONES.tier1`-`tier4` share one def: `{ level: 37, music: 'tiers', ambient: 'deep', atmos: 'tier' + k, act: 6, pack: 'seabed', light: 'under', ring: 4 − 0.2·k, tier: k }`; zone subtitles zone.tier<k>.s «Βαθμίδα {0} κάτω από τον πάγο» / "Tier {0} beneath the ice". Seeds: `h.seeds.tiers ^ (k · 7919)`, keyed by difficulty.

**The drowning pass, `drown(L, kind)`** (the one function the post-game's Drowned tiers also use):
- the source's walls take the ice-over-stone look: the 'icy:' Instancer material (build5.js) on the source pack's own scans (the crypt's, Act I's forest trees, Deepstone's pillars), so the place reads as itself, rimed;
- the floor layer becomes `shore` and frost; every source light (torch, brazier) is dead: a lamp to light (a 1 s touch, lamp light r 5), one per room or clearing;
- **ice floors over the Bed:** one room in three (crypt), every pond (forest), the gallery's pits (halls) and the harbour basin (landing) become thin ice over black water (`L.ice`, Act V's cracking ice unchanged: load, stages, plunges). A plunge into the Bed costs Act V's plunge and also halves the hero's light for 4 s (`halveCradle`, light.js): "a fall into forgetting". The Skotos's sleeping shadow passes under these floors (`uShade` r 8);
- a Tier-lamp and an ice memory window at the ladder foot; the Guardian's hall and the ladder down at the far end (the source's boss room for the crypt, its far clearing for the forest);
- packs replaced by the tier's roster; no tide (the Breathing Ice belongs to the Hollows and the Throat).

**Depth** (the Tiers mechanic): each tier is one tier deeper; the hero's ring is 4 − 0.2·k m (tier 4: 3.2 m); Cold gains ×(1 + 0.06·k); monsters at `gateMul = 1.06^k` on life and blows (the Gates' own multiplier, gentler: the Gates use 1.14 per tier); fog density +0.004·k; the minimap header shows «{0} οργιές» / "{0} fathoms" (the Hollows 8; tier k 8 + 6·k; the Floor 40).

**Reach checks:** the source generator's own (they already pass for the Gates), then: the ladder foot reaches the Guardian's hall and the ladder down through land or through thin ice that has a land route around it (thin ice is never the only way: the Act V spine rule); every lamp, window and ladder on land; a Guardian hall of r ≥ 9.

ATMOS: **ATMOS.tier<k>:** fog 0x05080c, density 0.035 + 0.004·k; sky 0x141c24; ground 0x0a0e12; hemi 0.30 − 0.04·k; moon 0x8aa0c8, moonI max(0.05, 0.2 − 0.03·k); exposure 1.4; heroRange 9 − 0.4·k. **FX 'deep':** rime motes drifting slowly upward, as if what is down here were trying to rise.
HAZARDS: the dark (the Nameless, unseen); thin ice over the Bed; Forgetters from tier 2; Rime-hangers in tiers 1 and 3; the Guardian at the end.
SET PIECES:
- A crypt the player half-remembers from Act I, every candle dead, rime on the kings' faces.
- The Whisperwood glade with garlands frozen in the branches.
- The sealed door in the Deepstone gallery, and the hammer.
- The old Landing's nine dead light-stumps in a row, and a shadow the size of a ship turning under the harbour ice.

### floor (37) Ο Πάτος / The Floor
LAYOUT: genFloor(seed) in gen6.js, 96 × 96. `ZONES.floor = { level: 37, music: 'tiers', ambient: 'floor', atmos: 'floor', act: 6, pack: 'seabed', light: 'under', ring: 3, tier: 5 }`; zone.floor.s «Εκεί που τελειώνουν οι Σκιοπύλες» / "Where the Shadow Gates end".
- **The approach:** the last ladder's foot (entry) in the south-west, a short rock shelf (15-20 m) with two dead lamps, then the arena.
- **The arena, the Bed's Edge,** centred at (48, 44), r 18:
  - the south terrace: rock, `BED_DRY` in its upper ring (r 12-18 for z > cz − 2) and a lower ring of bed 0.3-0.6 (r 8-12) that the Bed's breathing floods in phase 2;
  - the north half: the Bed, open black water to the map's north edge (always closed), where the Skotos's shadow (`uShade` r 9) turns slowly;
  - the collapse ring, r 4-7 around the centre (`L.collapse`): rock in phases 1-2, black water in phase 3 (the hero is pushed clear before it closes, the Tower's death-crawl rule);
  - **four dead braziers** on the terrace at r 10 on the diagonals (1 s touch, light r 5);
  - **the First's hearth-stone** at (cx, cz + 15) on the south rim: a ring of fire-blackened stones round a rock (the rime pack's runestone scan, its name lines emissive in code: ΦΑΡΩ);
  - the six Faces' fall points, chosen at runtime on terrace cells.
- **Reach checks:** the entry reaches every brazier and the hearth at the Bed's two levels; the collapse ring never cuts a brazier or the hearth off.
- **After `kaneisDown`:** the hearth burns (camp, waypoint `floor`, warm pool r 7); the Bed is still; small lights rise from the water every few seconds (FX 'floorRise').

ATMOS: **ATMOS.floor:** fog 0x020305, density 0.05; sky 0x0a0e14; ground 0x06080a; hemi 0.12; moon 0x6a7ab0, moonI 0.04; exposure 1.45; heroRange 7; zoom 1.2 for the fight (No One's hood must read: Act V's Stage A note on framing). **ATMOS.floorLit** after `kaneisDown`: hemi 0.3, the hearth's warm key.

### The look: what each image costs
The engine has no render targets and no post-processing (act5-design, The look). Act VI adds no rendering system: every image below is a define, a uniform or a mesh in the Act V files (sea.js, build5.js) or one new small file, **src/world/build6.js** (`act6Prop`, `act6Level`, the drowning pass's material swaps). **Every image has a quality-0 path, built first.**

| # | image | how it is made | owner | phone cost | quality 0 | risk |
|---|---|---|---|---|---|---|
| 1 | **Green light through the ice** onto the seabed, rippling. | G_CAUST in groundMat: for the 6 nearest skylights (`uSky[6]`: xz, r, k), a soft disc with a caustic pattern from two scrolling `tNoise` reads; `k` follows the tide (1 at low water, 0 by h = 0.9). It is light, never a ring: no edge, no rim, so it never reads as a telegraph. Each is also a light pool (`addLightPool`, `{ decal: false }`) so the rules see it. | build.js groundMat, light.js | 2 fetches in the discs only | flat discs, no caustics | Low |
| 2 | **Ice walls lit from inside.** | The zone's wall layer is rime's `ice` in the world-projected 'icy:' material, with a depth tint that brightens toward the nearest skylight (`uSky`) and a fresnel rim from the hero's light. | build5.js 'icy:' | 2-3 fetches | Lambert with the layer | Low |
| 3 | **Keels that lift with the tide.** | Each keel is a block of the ice material in a translucent variant (Act V's ICE_WINDOW: alpha 0.55, stronger fresnel). Its y follows `uLevel` (0 grounded, up to +0.5 m lifted), with a white frost line at its base while grounded and a dark slot of water under it while lifted. The hero walking under a lifted keel is seen through it. | build6.js `keelMesh` | transparent fill over a few cells | opaque blocks; the base line kept (gameplay) | Low |
| 4 | **A flood under a roof.** | Act V's water mesh (`buildSea`, `aBed`, the depth colour with its 0.45 m step and edge line) unchanged, with `uAur` 0 and the reflection colour set to the roof's dim blue. The sumps boil (a normal-scroll speed-up in r) when the flood comes. | sea.js | as Act V's Shallows, on fewer cells | as Act V's | Medium (fill rate at high water): perf6 gates it |
| 5 | **The unseen.** | The Nameless fade in and out (0.3 s) through the people material's dissolve (the spirit flesh the Lampless use). In the dark they show only their breath (Act V's head-bone puff, every 1.2 s, within 10 m) and their footprints on mud (Act V's 48 decal quads). | people.js, fx.js | trivial | same | Medium (readability): see Touch and phone |
| 6 | **Things on the roof.** | Rime-hangers hang at y 3.2, upside down, with a soft enlarged blob shadow on the floor under them (actors.js blob at y 0.04, ×2): you see the shadow in the dark and the creature in the light. | actors.js | trivial | same | Low |
| 7 | **The tiers, rimed.** | The source packs' scans through the 'icy:' Instancer material; floors in `shore`; dead lights; fog by depth. No new textures. | build6.js `drownLevel` | as the source act | as the source | Low |
| 8 | **The Bed under the ice floors** and at the Floor: black water and a vast sleeping shadow. | Act V's ice mesh with `uShade` (one slot at r 8-9, 2 m/s) and the water mesh's depth colour at black. | sea.js | as Act V | shade kept | Low |
| 9 | **Charybdis's whirl.** | `uWhirl` (xz, r, k): a rotational flow on the water's normal scroll and a foam spiral within r, while it draws in. | sea.js | 2 ALU | foam ring only | Low |
| 10 | **The Lightdrinker.** | Code-built: a lathe bell with an additive inner glow and eight trailing line strands, a vertex wobble; the glow rises with what it has drunk. | build6.js / actors.js | 1 draw each, additive | same | Low |
| 11 | **Names becoming light.** | A named Face stands up as a pale memory figure for 1 s, then a lamp pool (r 4) and a rising spark column (fx 'nameRise'). | fx.js, light.js | in the particle budget | same | None |
| 12 | **The first sunrise.** | Act V's auroraSky dome in the cine only, with a `uSun` disc and a pink horizon band; the aurora fades as the band brightens. | sea.js `auroraSky` | only in the cine | a static dawn sky | Low |

**What this deliberately does not do:** a drawn ceiling (the camera never sees it); swimming or under-water actors (the flood is a wall, as in Act V); height for actors (all floors at y = 0; the tiers' depth is fog, light and taller walls); any new lighting model.

**The perf gate.** `perf6` measures, at quality 1 under mobile emulation like perf5, the Mussel Flats at high water and the Throat at phase 2's flood against the Field of Ash; it passes within + 15%. The Hollows are dark (few real lights) and their water covers less of the screen than the Shallows', so the risk is lower than Act V's; the keels' transparency is the item to watch.

## Enemies
**The Nameless.** Act VI's humanoid family name is «Ανώνυμος» / "Nameless", after the Ashbound, the Rootsworn, the Ash-Fallen and the Sunken. The Sunken are the drowned dead the dark raised; the Nameless are people the dark *covered*: nobody remembers they lived, so outside light nobody can see them. Their faces are wrapped in frost-stiff cloth: they have none left that anyone knows.

**One new trait and two old ones run through the roster:**
- `unseen` (new, the act's second mechanic): outside light (`lightAt(x, z, { pad: radius })`, every hero's ring counting in co-op) and with `seenT` run out, the actor is not drawn, has no life bar and **cannot be targeted** by aimed attacks and auto-aim; **area effects still strike it in full**. Its telegraphs are always drawn. Lit, it is seen, and stays seen for 2 s after the light leaves it (`seenT`, by difficulty). Any blow it lands on a hero reveals it for 1.5 s. In the dark it shows its breath and its footprints.
- `unlit` (Act V): a beam or a light-flash dazzles it 1.5 s and leaves it Revealed (×1.25) for 3 s.
- **Lamp denial** (Act V): inside lamp light nothing of the dark wakes, rises, surfaces or drops.

**Every enemy owns one verb that touches a system:** the Nameless go unseen (light); the Rime-hanger drops from the roof and brings ice down (the roof, and the lamps that hold it); the Lightdrinker drinks light and is stranded by the ebb (light, the tide); the Siphon pushes the sea out of its sump (the tide); the Forgetter makes the hero forget a skill (the loadout). From Act V, unchanged: the Sunken wake with the flood, the Harpooner reels toward water, the Hull-louse curls and is bowled, the Icemaw lunges from holes.

**No name begins with "Frozen"** (the elite affix «Παγωμένος»), and none uses "Drowned" (Act V's IP note). **Every `radius` is pre-scale** (act5-design, Enemies).

**Packs** (data.js PACKS, PACK_LEAD, PACK_DORMANT):

| tag | where | kinds (weights) | lead | notes |
|---|---|---|---|---|
| namelessCrew | the Mussel Flats, the Ridges, tiers 1-4 | nameless 5 | | 4-6; unseen |
| floodNameless | the Hollows, h ≥ 0.75 m | nameless 3 | | climb out of sumps at the flood (Act V's floodWave): one wave per 25 s, at most 2 alive |
| hangerRoost | the Ridges' chokes, tiers 1 and 3 | rimeHanger 1 | | 3-4 on the roof over a choke |
| drinkerBloom | flooded basins, Keel 3, the Throat's phase 2 | lightdrinker 1 | | 4-6, drift in the water at the flood; stranded at the ebb |
| siphonSump | one sump in two (the Hollows) | siphon 1, nameless 2 | siphon | |
| forgetCircle | tiers 2-4, the Floor's phase 1 | forgetter 1, nameless 4 | forgetter | |
| drownedCrew | the Drowned Ships | sunken 3, harpooner 2 | sunken | Act V's sunkenCrew, dormant `tideWake` |
| hullSwarm | wreck bellies | hullLouse | | Act V's |
| icemawSump | deep sumps (r ≥ 2.5) | icemaw | | Act V's lurker, from open water |
| tierGuard | each tier's Guardian hall | tier 1 barrowLord; tier 2 weaver; tier 3 troll (rare, thunder); tier 4 forgetter (rare, teleporter, frozen) + nameless 4 | | the Gate Guardian spawn (boot.js `gateKill`) with `name: t('tier.guardian')` «Φύλακας της Βαθμίδας» / "Guardian of the Tier" and `gateMul` 1.06^k × the Gates' kind factor (0.55, 0.55, 4) |

- `PACK_DORMANT`: drownedCrew.
- The champion stand-in for big kinds in the Act VI zones is `nameless`.

### nameless Ανώνυμος / Nameless (new=True)
ROLE: The rank and file: sailors, gatherers and keepers the dark covered, walking the seabed in oilskins with their faces wrapped. They hunt in the dark and are the reason to carry, place and share light. The Hollows, the tiers, the Floor.
BEHAVIOUR: The existing 'melee' AI with the `unseen` trait.
- **Unseen** (above). Unseen, it closes in at full speed and strikes; its swing's cone is drawn as always, so a hero in the dark sees the blow coming and not the body.
- **It loses its quarry in the dark.** A Nameless with no light on the hero for 4 s walks to where it last saw her light, then idles: the dark cuts both ways (it is how No One's Rime legendary works).
- **Named in death.** One that dies inside light leaves a small name-spark (light pool r 2 for 6 s, a soft bell): fighting in the light lights the way.
- **Combat:** a gaff hook (atk 'slash1': 1H_Melee_Attack_Slice_Diagonal; reach 1.9, atkTime 1.25). No pull, no special: it is the unseen that makes it dangerous.

**Data:** hp 1.3, dmg 1.25, speed 3.7, radius 0.5, reach 1.9, atk 'slash1', atkTime 1.25, flesh 'rime' (new: frost dust and a dry crack, no blood, no corpse decal), xp 2.2, weapon 'gaff' (the boathook model, shortened, in code), style 'light', animSet 'undead', unseen, unlit, coldHit 3 (each blow adds Cold +3 in Act VI zones).
ASSET: {"source": "people-reproportion", "title": "Quaternius 'villager1' from people.glb", "author": "Quaternius", "license": "CC0", "notes": "folk.mjs --set=pale, recipe 'nameless', GAUNT table (Act IV's), 256 px maps.\n\n**Grade:** skin to a frost white-grey (ashen() k 0.85, tint [0.82, 0.86, 0.9]); clothes desaturated toward oilskin ochre and sailor wool, with three runtime tints so a pack does not read as clones.\n\n**Code parts:** a face wrap from veilParts() (Act III's Mourner shroud) in stiff frosted cloth, tied round the head, so the head reads faceless; rime on the shoulders (instanced flakes).\n\n**Read:** pale and faceless. Not the Sunken (green-grey, kelp, dripping), not the Lampless (hooded, lanterns), not the Ice Singer (veiled, floating).\n\n**Clips** (moves.bin): Zombie_Walk_Fwd_Loop, Walk_Loop, Zombie_Idle_Loop, 1H_Melee_Attack_Slice_Diagonal, KK_Hit_A, KK_Death_C_Skeletons.\n\nNo download. Stand-in: 'villager1', tinted white."}

### rimeHanger Παγοκρέμαστος / Rime-hanger (new=True)
ROLE: A pale sea-scorpion the length of a man that clings to the underside of the ice and drops on what passes. It makes chokes dangerous and brings the roof down where it lands. The Ridges, tiers 1 and 3.
BEHAVIOUR: A NEW ai 'hanger'.
- **On the roof:** it hangs at y 3.2 upside down over a choke (pose 'hang', held), and turns to follow the hero. Its enlarged shadow lies on the floor below it; in light its pale body and frost rim show. Ranged hits knock it down: it lands Stunned for 3 s (×1.5).
- **The Drop:** when a hero passes within 2.5 m under it: TELEGRAPH falling ice dust and a red teleCircle r 1.8 on the floor, 1.2 s | EFFECT it lands for 1.3× and knock 6, and **the roof comes down with it:** an ice-fall of r 1.2 at the landing point (the cells close, in the ice batch, for 20 s; a block of ice in the keel material, 'icefall' sound). An ice-fall can cut a lane: the Breathing Ice's 6 s grace and lane rule protects the hero, as every closing does.
- **Lamp denial:** inside lamp light it never drops (lamp light holds the ice): a lit lamp makes a choke safe.
- **On the floor:** the existing 'melee' AI (claw, reach 1.6; every third a tail sting: teleLine 3 m × 0.8, 0.6 s, 1.2× and a 2 s slow). It climbs back to the roof after 12 s out of combat.
- Not unseen, not unlit: a natural beast.

**Data:** hp 1.6, dmg 1.3, speed 4.6, radius 0.5, reach 1.6, atk 'claw', atkTime 1.0, flesh 'chitin', xp 2.6, sfx 'spider', hang { y: 3.2, d: 2.5, tell: 1.2, fall: 1.2, hold: 20 }, look { scale 1.2, tint 0xd8e4ee, tintAmt 1.2, rim 0xc8e0ff, rimI 0.3 }.
ASSET: {"source": "sketchfab", "uid": "4c0fd62d33ab4d2592ee0a1d985a480d", "url": "https://sketchfab.com/3d-models/scorpion-4c0fd62d33ab4d2592ee0a1d985a480d", "title": "Scorpion", "author": "anthonyvanoo", "license": "CC Attribution 4.0", "faces": 7300, "animations": 5, "notes": "Scouted 'ok' in Act V's asset brief (assets.md, Ice spiders and crustaceans: rigged, 5 clips, made by its author for his game 'All That's Left'). Provenance gate before download as always (reverse-image search, storefront check, licence re-read on the download page, saved beside the source).\n\n**Build** (tools/creatures/act6/hanger.mjs): keep its 5 clips (idle, walk, attack, hit, die as named in the file); lib.mjs adds hang (held, legs splayed up), drop, land, sting, climb; regrade from desert brown to pale blue-white with frost on the carapace; 512 base, 256 normal.\n\n**Fallback:** .hapto GmbH 'Pseudoscorpion' (60a474f1f87040f38e073f87a63b7548, CC-BY 4.0, 2 clips; Senckenberg Museum). **Stand-in (no download):** the spider (boot-loaded) at ×0.8, pale tint; STAND_IN rimeHanger → ['spider']."}

### lightdrinker Φωτοπότης / Lightdrinker (new=True)
ROLE: Translucent bells of jelly that drift in the flood water under the ice and drink whatever light they touch. They put out lamps, shrink the hero's light and hold the dark open; killed full, they give it all back at once. The Hollows' basins, Keel 3, the Throat.
BEHAVIOUR: A NEW ai 'drifter'.
- **Drift:** at 1.6 m/s toward the nearest light within 14 m (a lamp, a brazier, burning oil, a name-spark, a hero's ring, the wolf's lantern), only over water cells (`waterAt` 'shallow' or 'deep'): it floats, ignores the walk grid on water and never crosses dry land.
- **Drink:** in contact (r 1.2) for 4 s (by difficulty), a lamp or brazier goes out (`snuffLamp`, light.js) and a fire area ends. Within 1.5 m of a hero it shrinks her ring by 1 m (2 m at the least, however many) and adds Cold +2/s. It glows brighter the longer it drinks (readable charge).
- **Burst:** killed after 2 s or more of drinking, it bursts into a light pool of r 8 for 3 s (every Nameless in it is seen, every `unlit` in it dazzled) and the lamp it drank relights at once.
- **Stranded:** when the ebb leaves its cell dry, it collapses on the mud (×1.5, speed 0.4, no drinking) and dies of the air after 20 s. The tide is its clock as well as the hero's.
- Contact only: it has no attack.

**Data:** hp 0.5, dmg 0, speed 1.6, radius 0.45, ai 'drifter', flesh 'jelly' (new: a wet pop, no corpse decal), xp 0.8, float (over water only), drink { t: 4, ring: 1, cold: 2 }, burst { r: 8, t: 3 }, look { scale 1.0, glow 0x9ad8ff }.
ASSET: {"source": "code", "title": "Code-built jelly (actors.js / build6.js)", "author": "made for Skotos", "license": "n/a", "notes": "A LatheGeometry bell (r 0.45, 24 segments) in an additive translucent material with a soft inner glow, eight trailing line strands animated in the vertex shader, a pulse of the bell's rim for the swim. No texture. No download. Rejected for this role: the Act V scouts' 'Glass octopus' (its uploader's recent work includes commercial-IP fan art, act5-design Risks) and 'Archea' (a cel look against the game's realism)."}

### siphon Σίφωνας / Siphon (new=True)
ROLE: A young of Charybdis's kind: a long-necked sea-reptile the size of a boat that lives in a sump and pushes the sea out of it when it dives. It turns the tide's map into a fight. The Hollows' sumps.
BEHAVIOUR: Act V's 'lurker' AI (the Icemaw's: under, tell, lunge, back under) with one new move.
- **Under** in its sump and the water cells joined to it; a dark shape with bubbles. It surfaces only at its own sump's lip, when a hero is within 7 m, and never inside lamp light.
- **Lunge:** TELEGRAPH 0.6 s of bubbles and a red teleLine 8 × 1.6 m | EFFECT 1.4× and Dragged 2 m toward the sump (the Icemaw's drag, stopping at the first deep cell).
- **The Surge** (its verb): as it dives back in, the water within r 6 of the sump rises 0.45 m for 6 s (one local tide step of three: `TIDE.local`), closing shallow cells to deep and lifting any keel there. The Breathing Ice's grace and lane rule apply: a cell under or round the hero closes last. Cooldown 14 s; one Surge per 20 m at a time.
- **Stranded** (the Icemaw's rule): if its sump's lip freezes while it is up (a Mage's Frost Nova over the sump, a beam), it is dazed 4 s, ×1.5.
- Not unseen, not unlit.

**Data:** hp 2.6, dmg 1.6, speed 2.4 (on the lip) / underSpeed 7, radius 0.6 (pre-scale ×0.9), reach 2.4, atk 'bite', atkTime 1.2, ai 'lurker', flesh 'flesh', xp 3.4, swim, surge { r: 6, dh: 0.45, t: 6, cd: 14 }, look { scale 0.9, tint 0x30404a, tintAmt 0.7 }.
ASSET: {"source": "sketchfab", "uid": "773667575a264c7baa4ec404115a044b", "url": "https://sketchfab.com/3d-models/pistosaur-animated-773667575a264c7baa4ec404115a044b", "title": "Pistosaur Animated (Charybdis's own file)", "author": "RickStikkelorum (ricksticky)", "license": "CC Attribution 4.0", "faces": 16700, "animations": 1, "notes": "The same pistosaur.glb as Charybdis at ×0.9 instead of ×3.5, darker by runtime tint: no extra download, texture or clip (CAST siphon → ['pistosaur', 0.9]). Stand-in: the Icemaw (Act V, shipped)."}

### forgetter Λησμονητής / Forgetter (new=True)
ROLE: Tall hooded figures of the dark whose touch makes a hero forget a skill. They test the loadout the progression built: lose one button for a few seconds, play with the other three. The tiers from 2, the Floor.
BEHAVIOUR: The existing 'caster' AI (keeps 6-9 m, backs off under 4.5 m) with one move.
- **Unmind** («Λησμονιά»): TELEGRAPH a pale violet teleCone 6 m, arc 0.8 rad, 1.0 s, a glassy smear of sound | EFFECT 0.8× and **one of the hero's four loadout skills is Forgotten for 5 s** (by difficulty): its button frosts over with a pale «;» and does nothing but a dull note when pressed. The basic attack is never forgotten. One skill at a time, never a skill already cooling for more than 5 s, never while a boss's red telegraph lies under her (it waits). **Stepping into lamp light, she remembers at once.** Cooldown 9 s.
- **It is visible** (not unseen): the act's readability rule keeps the most punishing enemy always on screen, so it can be killed first. It is `unlit`: a beam or a flash dazzles it.
- Heals no one, summons nothing: one verb.

**Data:** hp 2.0, dmg 0.8, speed 3.4, radius 0.55, reach 6, atk 'cast', atkTime 2.2, ai 'caster', flesh 'rime', xp 3.2, style 'none', animSet 'formal', unlit, unmind { t: 5, cd: 9 }, look { scale 1.22, rim 0xc8b8ff, rimI 0.4 }.
ASSET: {"source": "people-reproportion", "title": "Quaternius 'wayfarer' from people.glb", "author": "Quaternius", "license": "CC0", "notes": "folk.mjs --set=pale, recipe 'forgetter', a TALL table (len thigh, calf and spine 1.1, girth 0.85) at runtime scale ×1.22, 256 px maps.\n\n**Look:** the hood pulled low and fringed with frost (veilParts), no lantern, no staff; long pale hands with a violet glow at the fingertips (GLOW material on the hand bones' tips, code); robe greyed to rime. No mask of any kind (see Risks: a pale mask on a dark robe would recall a famous film spirit).\n\n**Read:** taller than anything human in the act, hooded, empty-handed, hands lit violet. Not the Lampless (lantern staffs, ash-grey).\n\n**Clips:** Walk_Formal_Loop, Spell_Simple_Idle_Loop, KK_Spellcasting (the Unmind), KK_Hit_A, KK_Death_B.\n\nStand-in: 'wayfarer', tinted pale."}

### Reused from Act V (new=False)
- **sunken / harpooner** in the Drowned Ships (drownedCrew), exactly as shipped: `tideWake`, `tideborne`, `swim`, `unlit`. Under the ice their flood is the zone's own tide.
- **hullLouse** in the wreck bellies, as shipped: curl and bowl. A louse bowled into a sump drowns; one bowled into a Great Keel bursts on it and leaves it whole: keels melt only by fire, one rule.
- **icemaw** in deep sumps, as shipped: the lurker under open water; denied inside lamp light.

## Bosses
Both fights keep Act V's phone rules:
- **At most two big telegraphs at once,** the environment's own (a flood, an Inhale, the Forgetting) counting as one.
- **Telegraph durations never change with difficulty.**
- **Every phase has one thing to do besides hitting,** and someone says it once (Alkyone for Charybdis; for No One, the narration's first line of each phase).
- **Exactly one boss actor per fight;** its sumps, faces and figures are 'node' actors or props.
- **One vulnerability at a time** (Act V's rule, combat.js `vuln`): bosses cap at ×1.6 outside one scripted window per phase.
- **Time-to-kill targets, set from Act V's measured curve** (integrate.md: the Tower took 83-117 s and the Skotos 213-381 s for the scenarios' hero, against design targets of 3:30-5:00 and 5:30-7:30 that could not hold): Charybdis 120-200 s for the scenarios' hero at level 36 on Warden (band 70-330 s); No One 240-420 s at level 39 (band 150-480 s). On Wanderer neither under 60% of its Warden time.

### charybdis Χάρυβδη, το Στόμα της Θάλασσας / Charybdis, the Mouth of the Sea
CONCEPT: **The tide is its breath.** A long-necked sea-reptile older than the Saltborn's tales, coiled in the Throat's well with only its neck, head and fore-flippers ever above the water. When it draws breath the sea goes down the well and drags everything toward it; when it breathes out the sea comes up out of the well and floods the cave.

**Its story.** The Saltborn's tales say it drinks the sea three times a day; Alkyone has counted, and it is two. It has lived in the Throat since before the first fire, eating what the dark lets sink. It is a beast, not a servant: it guards the way down because it lies in it. It dies choking on fire and its well goes still.

**Lines.** None: a beast. Its voice is the roar of water going down a well. Title mon.charybdis.t «Πίνει τη θάλασσα και τη δίνει πίσω» / "It drinks the sea and gives it back".

**What it teaches.** The Breathing Ice, phase by phase: the ebb and the lip (phase 1), the flood, the high ground and lamp denial (phase 2), fire on water carried by the pull (phase 3).

**Data:** hp 190, dmg 2.3, speed 0 (anchored) / underSpeed 6 (between wells, hidden), radius 0.7 (pre-scale: ×3.5 makes 2.45 m, the neck's base), reach 12, atk 'bite', atkTime 1.4, flesh 'flesh', xp 170, boss, anchored, swim, S.phases [0.65, 0.3], hpFloor 0.649 at spawn, wake on the `throatWake` cine (holdWake), dieClip 'sink', look { scale 3.5, tint 0x3a4a58, tintAmt 0.8, rim 0x7ab8c8, rimI 0.35 }. Level max(34 + 2, hero + 1), the first boss of the act.

**Arena:** the Throat, r 18.
- **The well** at the centre: open water, r 4, always closed; its **lip** a thick ring from r 4 to 5 (always dry, never wet: every drift stops there).
- **Three side wells** at r 11, 120° apart, r 2: open water joined to the well below; Charybdis can rise in any of them.
- **The floor:** an inner ring (r 5-9, bed 0.3-0.6) that floods first and closes at high water; a middle ring (r 9-13, bed 0.9) that is wading at high water; three spokes of bed 1.4 running from the lip out between the side wells to the ledges: lip, spokes and ledges are a dry wheel at every level, and the hero is never stranded on the lip. The arena has no keels: its water is the boss's breath, and the high ground is the spokes and the ledges.
- **Three ledges** (r 15, between the side wells, r 3, BED_DRY): the air-bells of the arena, each with a dead ledge-lamp (1 s touch, lamp light r 5) and a whale-oil cask.
- **The sill:** a ring of bed ≥ 1.5 at the entry closes the arena from the zone's tide; while it is awake `TIDE.force` owns the water; on a reset the water returns to low.
- Aktaios's bell on the south rim; Alkyone on the north ledge (untouchable).
PHASES: **Phase 1, «Η Ανάσα» / "The Breath" (100-65%).** The thing to do: **stand at the lip when it draws in, and strike the neck when it lies there gorged; get high when it breathes out.**
- It breathes on a 30 s cycle (the environment's telegraph):
  - **Inhale, 12 s:** the arena's water falls to 0 (h 1.2 → 0 at 0.3 m/s) and everything on a wet cell drifts toward the well at 1.2 m/s (heroes, monsters, floating fire); the water whirls (`uWhirl`). At the end the neck lies over the lip for 4 s, **Gorged** (×1.25), swallowing what the pull brought.
  - **Exhale, 10 s:** the arena floods to 1.2 in 4 steps over 4 s (the lane and its 6 s grace protect the hero); the inner ring closes, the middle ring is wading (Cold +4/s); the spokes and ledges stay dry; it strikes from the water at whoever stands low.
  - **Hold, 8 s:** the water stays.
- Moves: Neck Strike, Snap, Spout. Nameless climb out of the inner ring at each Exhale (2, at most 4).
- Alkyone: d.alk.x1.

**The turn (at 65%).** It sinks, holds the 65% floor for 3 s (immune; the bar shimmers), and the arena floods for the phase.

**Phase 2, «Η Πλημμυρίδα» / "The Flood" (65-30%).** The thing to do: **light the ledge-lamps to close the wells near you, so it must rise where you are waiting.**
- The water stays at 1.2 but for a short Inhale every 25 s (8 s, no drift: just the water going down and back); the hero holds the spokes and the ledges, or wades the middle ring.
- **The light drowns:** 'throatNight' eases in over 2 s; the skylights are gone; the Nameless come up out of the water unseen (2 per call, at most 4), and Lightdrinkers bloom in the flood (4, at most 6) and drift to any lamp lit.
- **Rise:** it travels under the floor and comes up at a side well near the hero: TELEGRAPH that well boils, 1.2 s | a Neck Strike at once, then 4 s **Exposed** (×1.25) at that well. **It cannot rise at a well inside lamp light** (the Icemaw's rule). Light two ledge-lamps and it can rise only at the third: stand there. Lightdrinkers drink the lamps out (4 s each): kill them, or let one burst beside a lamp to light it back.
- **Fail-safe:** if no lamp has been lit after 40 s, Alkyone lights the north ledge's lamp herself.
- Alkyone: d.alk.x2.

**Phase 3, «Το Στόμα» / "The Mouth" (30-0%).** The thing to do: **give it burning oil while it draws in.**
- It rises full height in the central well and breathes fast: Inhale 8 s (drift 2.0 m/s, the mouth open over the well) → Surge (the breath out as a moving ring) → Hold 6 s.
- **The Choke:** burning oil that drifts within 2 m of the open mouth during an Inhale is swallowed: **Choked** 5 s (×2.0, its one scripted window in this phase), steam pouring off it; the next Inhale comes 3 s late. Break a cask on a ledge (one hit; the Ranger's bolts break casks at range, Piercing Shot breaks every cask on its line), and the pull carries the burning oil to it; the Warden's Shield Charge pushes a cask along; the Mage's Fireball or Meteor landing in the open mouth during an Inhale Chokes it for 2.5 s (×1.6).
- Casks respawn on the ledges 20 s after they burst (three at most).
- **Fail-safe:** after 45 s without a Choke, Alkyone throws a lit oil-flask into the mouth during the next Inhale.
- Moves: Neck Strike twice in a row, Snap, Surge.
- Alkyone: d.alk.x3.

**Death.** It chokes a last time, sinks, and the well drains with a long sigh; the arena's water falls to 0 for good, the side wells go dry, and the rope at the well's bottom is the exit down. The body is never seen again. Flag `charybdisDown`.

**Echo refight.** «Θυμήσου τη Χάρυβδη» / "Remember Charybdis", at the dry well, after `pharo`. The well fills as the fight had it. The ice remembers it in a frost-pale echo tint. Alkyone's calls are replaced by Aktaios's bell; her phase 2 lamp and phase 3 flask by the ledges' braziers lighting and a flask thrown by itself after 45 s.
ASSET: {"source": "sketchfab", "uid": "773667575a264c7baa4ec404115a044b", "url": "https://sketchfab.com/3d-models/pistosaur-animated-773667575a264c7baa4ec404115a044b", "title": "Pistosaur Animated", "author": "RickStikkelorum (ricksticky)", "license": "CC Attribution 4.0", "faces": 16700, "animations": 1, "notes": "Scouted 'ok' in Act V's asset brief as the best sea serpent: a realistic long-necked pistosaur, rigged, one swim clip ('The neck rising from a hole in the ice is the money shot').\n\n**Provenance gate before download:** reverse-image search of the thumbnail, storefront check (Fab, CGTrader, Unity Asset Store), the licence re-read on the download page, saved beside the source in /tmp/claude-0/sf/act6.\n\n**Build** (tools/creatures/act6/pistosaur.mjs; one pistosaur.glb for Charybdis and the Siphon): decimate 16.7k → 9k keeping the neck chain whole; lib.mjs clips on its own chains: idle (a slow sway with the body under water), rise, strike (the neck lunge), snap, inhale (the mouth open, the neck drawn back), gorged (lying over the lip, held), surge (a roar), choke (a convulsion with steam), sink, hit, die; the shipped swim clip kept for the Siphon. Regrade to a dark slate with pale throat and scars of old ice; 1024 base, 512 normal.\n\n**Fallback 1:** 'Pliosaur' by Spinnee (d90f30fd8ae9488ba8186a4572c9cf4f, CC-BY 4.0, rigged with no clips: every clip in lib.mjs). **Fallback 2, no download:** the Icemaw (shipped) at STAND_SCALE 2.6 in its sump; STAND_IN charybdis → ['icemaw']."}
MOVES:
- Neck Strike (all phases): TELEGRAPH a red teleLine 12 m × 2 m from the well through the hero, 1.0 s, the neck drawing back | EFFECT 1.3× and knockback 10. Cooldown 5 s; twice in a row in phase 3.
- Snap: TELEGRAPH a teleCone 5 m, arc 1.0, at the lip, 0.8 s | EFFECT 1.1×. Cooldown 3 s; only at a hero within 6 m of the well it is in.
- Inhale (phases 1-3; the environment's telegraph): TELEGRAPH a deep intake roar, the water drawing back from the walls and a sea-green whirl on the water, 1.5 s, a HUD tide pulse | EFFECT the water falls; everything on a wet cell drifts toward the well (1.2 m/s, 2.0 m/s in phase 3) until it stands on a dry cell or the lip; floating fire drifts with it. Phase 1 ends it Gorged 4 s.
- Exhale (phase 1, and the turn): TELEGRAPH bubbles up out of all four wells, a rising rumble, 1.5 s | EFFECT the arena floods to 1.2 in 4 steps over 4 s; the inner ring closes, the middle ring wades.
- Spout (phases 1-2): TELEGRAPH three lobbed globs of brine, teleCircles 2 m landing at 1.0, 1.2 and 1.4 s | EFFECT 0.9× each, slush pools for 6 s (Act V's 'slush': `inWater`, Cold +4/s). Cooldown 10 s.
- Rise (phase 2): TELEGRAPH the chosen side well boils, teleCircle r 2.5, 1.2 s | EFFECT a Neck Strike from it at once; then Exposed 4 s. Never at a well inside lamp light; never twice in a row at the same well if another is dark.
- Call of the Throat (phases 1-2): TELEGRAPH the inner ring's water heaves at two points, 1.0 s | EFFECT two Nameless climb out (at most 4; +1 per call on Nightmare and above). Cooldown 18 s.
- Surge (phase 3, after each Inhale): TELEGRAPH a white ring of water swelling round the well, 0.8 s, then it races out from r 4 to r 16 over 2.0 s (one ring at a time) | EFFECT 1.2×, knock 8 and Cold +15 to anyone it crosses who is not rolling (the dodge's iframes pass through it) or standing on a ledge.
- The Choke (phase 3): TELEGRAPH burning oil drifting into the mouth (no telegraph: it is the player's) | EFFECT Choked 5 s (×2.0), or 2.5 s (×1.6) from a Fireball or a Meteor.

### kaneis Κανείς, Αυτός που Απαντά / No One, Who Answers
CONCEPT: **What the dark holds that has no name.** A figure of rime and black water, taller than a house, robed in its own pale arms, its hood an empty black. Six small frozen figures turn around it like a slow wheel: the Forgotten of the Hollows. Its last face, which it shows only at the end, is hers.

**It is the true Gate Guardian.** Every Gate Guardian is one of its shapes (the Barrow Lord's, the Weaver's, the troll's); the Guardians of the Tiers were too.

**Lines** (lowercase `say` lines in the pale colour, with «i», never shouting):
- Title mon.kaneis.t «Απαντά όταν δεν απαντά κανείς» / "It answers when no one does".
- The waking d.kaneis.1, d.kaneis.2 (+ .r); phase 2 d.kaneis.p2; phase 3 d.kaneis.p3; the naming d.kaneis.die1 and die2 (beats and ending).

**What it does.** It fights like the forgotten: it cannot be seen out of the light, it puts lights out, it makes the hero forget, and it holds names.

**Data:** hp 210, dmg 2.4, speed 4.2 (a glide), radius 0.7 (pre-scale: ×1.4 makes 0.98 m), reach 6, atk 'smash', atkTime 1.6, flesh 'rime', xp 300, boss, float (it glides over the terrace and the Bed alike), unseen in phase 1 only, S.phases [0.65, 0.3], hpFloor 0.649 at spawn; in phase 2 `a.hpFloor` = 0.30 · hpMax until the sixth Face is resolved (fail-safe 75 s); in phase 3 `a.hpFloor` = 0.10 · hpMax until the name is said; dieClip 'sink'. Look { scale 1.4 (about 5.3 m), tint 0xdfe8f0, tintAmt 1.6, rim 0xd8e8ff, rimI 0.5, vulnRim 0.5 }; the hood's `skotos_void` material stays black (Act V's Stage A rule). Level max(37 + 3, hero + 1).

**Arena:** the Bed's Edge, r 18 (zones, floor): the south terrace (its lower ring floods in phase 2), the Bed to the north (always closed; the Skotos's shadow turns in it and never strikes), the collapse ring (r 4-7), four dead braziers at r 10, the First's hearth-stone on the south rim. The camera zooms out to 1.2.
PHASES: **Phase 1, «Κανείς δεν απαντά» / "No One Answers" (100-65%).** The thing to do: **light the braziers and fight it in the light.** Narration on the phase: d.k6.p1 «Μόνο ό,τι φωτίζεις υπάρχει εδώ κάτω.» / "Down here, only what you light is there."
- The Floor is dark (ring 3 m). No One is **unseen** outside light: its body and its figures vanish (the boss bar stays); its telegraphs show.
- The four braziers light with a 1 s touch (any hero; see Co-op); each is lamp light r 5.
- **Startled:** when it glides from the dark into a lit pool, it is dazed 1.5 s (×1.25): the light hurts what was unseen. A hero who keeps two braziers lit and kites it between them gets a window each crossing.
- **Snuff:** it glides to a lit brazier and drinks it (2 s channel, a dark vortex; any hit worth 6% of its life breaks it).
- A Forgetter walks out of the Bed at 85% and another at 72%.
- Moves: Robe Sweep, Dark Step, Cold Hands, Snuff.

**Phase 2, «Τα Πρόσωπα» / "The Faces" (65-30%), d.kaneis.p2.** The thing to do: **name the faces.** Narration: d.k6.p2 «Τα πρόσωπα που κρατά ήταν κάποτε κάποιων.» / "The faces it holds were once someone's."
- It is seen now (the figures glow round it) but **warded ×0.4** while any figure still turns.
- **Every 10 s one figure is flung onto the terrace and becomes a Face** (a 'node' actor, hp 4 at the boss's level, flesh 'rime'): it crawls at 1.2 m/s to the nearest lit brazier or lamp and drinks it (2 s).
- **A Face struck down** lies still for 6 s with a prompt on it:
  - **if the hero knows that name** (found in the Hollows: `h.flags.names6`), «Πες τ' όνομα» / "Say the name", 1 s: d.name6.say; the figure stands up full size as a pale memory figure for 1 s and becomes a **permanent lamp** (lamp light r 4) where it fell; the ward eases by 0.1 (×0.4 → ×1.0 at six);
  - **if not,** it sinks back after 6 s (d.name6.lost) and the ward eases by 0.05, with no lamp.
- So the names found earlier light the arena; a hero who found all six fights phase 3 in a bright Floor, one who found none in the dark.
- **The Bed breathes:** the lower ring (bed 0.3-0.6) floods to 0.9 over 40 s (`TIDE.force`), so late Faces fall in the water (wading, Cold).
- **Grief** (every 14 s): a wail ring that rewards naming: TELEGRAPH a red teleCircle r 9 round it, 1.4 s, with blue safe circles r 4 on every lit brazier and every named lamp | EFFECT outside the light 1.3× and Cold +20.
- Moves: Robe Sweep, Cold Hands, Grief, the Faces.

**Phase 3, «Φαρώ» / "Pharo" (30-0%), d.kaneis.p3.** The thing to do: **light the First's hearth, drive it into the fire, and say her name.** Narration: d.k6.p3 «Το τελευταίο πρόσωπο το φορά ακόμα. Στον νότο, η εστία της περιμένει φωτιά.» / "It still wears the last face. To the south, her hearth is waiting for fire."
- The collapse ring opens (the hero pushed clear first): the centre of the arena is black water. Two of No One's own arms rise from it (Act V's skotosHand nodes in the rime tint) and Sweep. The Skotos's shadow turns beneath them and does not wake.
- **The hearth:** «Άναψε την εστία» / "Light the hearth", a 2.0 s channel from the Cradle, broken by any blow that reaches her life. Lit, it is a fire (light r 7, warmth −12/s Cold, permanent): every time No One is inside the hearth's light it is **Seared** (×1.5, 4 s).
- **Forgetting** (every 15 s; the environment's telegraph): TELEGRAPH a pale violet ring racing out from it to r 16 over 2.0 s, with blue safe circles on every lit lamp, brazier and the hearth | EFFECT outside the light 1.2× and **one loadout skill Forgotten for 6 s** (the Forgetter's rule; lamp light brings it back), and every lamp pool shrinks by 1 m for 10 s.
- **At 10%** it sinks to its knees at the edge of the open ring and holds (hpFloor 0.10): the prompt «Πες το όνομά της» / "Say her name" (1.5 s) on it ends the fight: the naming (ending).
- **Fail-safe:** if the hearth is still dark 45 s into the phase, a named figure's light drifts to it and lights it; if no figure was named, the hearth catches from a rising spark of the Bed.
- Moves: Robe Sweep, Cold Hands twice in a row, Forgetting, the Arms' Sweep.

**The naming** (cine `kaneisDown`, flag saved first; see ending): Pharo's name in narration, No One's last two lines, «Κανείς δεν απαντά. Αυτή τη φορά είναι μόνο ησυχία.», the First at her fire, the lights rising. Its first-kill legendary drops at the hearth.

**Echo refight.** «Φώναξε ένα όνομα» / "Call a name", at the Bed's edge, after `pharo`. No allies; the six figures come back as they were and the names the hero knows can be said again; phase 3's hearth is lit at the start (it burns now) and the fight ends at 0% with no prompt. Echo tint: rime-white robe darkened to 0x9aa8b8, rim 0xb090ff. Nothing in the echo touches the story.
ASSET: {"source": "existing-model-retint", "uid": "f4e2c262ed4e456484f232d6afa99629", "url": "https://sketchfab.com/3d-models/cloaked-figure-f4e2c262ed4e456484f232d6afa99629", "title": "Cloaked Figure (shipped as src/assets/creatures/skotos.glb, the Skotos)", "author": "MysteryPancake", "license": "CC Attribution 4.0", "faces": 13442, "animations": 14, "notes": "No download. The Skotos's shipped figure (its code hood, mantle, void and arms; 14 clips: idle rise sink surface sweep slam drink roar wrap recoil hit lash smother die) at ×1.4 instead of ×3.2 and standing on the terrace instead of waist-deep: about 5.3 m, so the whole figure and its hood read in the fight's framing. A runtime tint above 1 drains its black robe to a luminance ramp and whitens it to rime; the void hood keeps `skotos_void` black; skotosSkin's fresnel (sea.js) gets `uAurCol` pale blue and `uAurDark` 1, so the sheen is cold, not violet.\n\n**The six figures** are shipped people scenes in the statue tint inside ice shards (npcs, forgotten). **Clip use:** idle as the glide loop; sweep (Robe Sweep), lash (Cold Hands), slam (Dark Step's strike), drink (Snuff), roar (Grief, Forgetting), recoil (Seared, Startled), sink (death).\n\n**Look gate** (as Act V's): beside the Skotos in the creature viewer at the gameplay pitch it must read as a different being (pale, smaller, on land, ringed by figures); if not, a scout pass for a hooded humanoid (CC0 or CC-BY), with Muru's 'Stelae knight' (0a795ae613f2496e955974ca37bf1e94, CC-BY 4.0, scouted 'ok' in Act V) first in line behind its own rig check.\n\n**Stand-in:** STAND_IN kaneis → ['skotos', 'troll'] (the troll boot-loaded, tinted white)."}
MOVES:
- Robe Sweep (all phases): TELEGRAPH a teleCone 6 m, arc 1.4, 1.1 s, the robe's arms drawing back | EFFECT 1.2× and knockback 10. Cooldown 4 s.
- Dark Step (phase 1): TELEGRAPH it vanishes; a teleCircle r 3 behind the hero, 0.9 s | EFFECT 1.5× as it reappears (the Barrow Lord's blink, its first shape). Only when the hero is more than 5 m away. Cooldown 9 s.
- Cold Hands (all phases): TELEGRAPH two sea-green teleLines 9 m × 1.6 m, 1.0 s | EFFECT 1.0× and Grabbed: pulled 3 m toward it (`pl.pull`, stopping at the first deep cell or wall). A roll during the tell escapes. Cooldown 10 s; twice in a row in phase 3.
- Snuff (phase 1): TELEGRAPH a 2 s channel at a lit brazier, light streaming into its hood | EFFECT the brazier goes out. Broken by 6% of its life.
- The Faces (phase 2): TELEGRAPH a figure's ice shard cracks, 0.8 s, and it is flung to a terrace cell (a white teleCircle r 1.2 where it lands) | EFFECT 0.8× to anyone under it; the Face crawls to a light.
- Grief (phase 2): TELEGRAPH a red teleCircle r 9 with blue safe circles r 4 on the lit lamps and braziers, 1.4 s | EFFECT 1.3× and Cold +20 outside the light. Cooldown 14 s.
- Forgetting (phase 3; the environment's telegraph): TELEGRAPH a pale violet ring racing to r 16 over 2.0 s, blue safe circles on the lights | EFFECT outside the light 1.2×, one skill Forgotten for 6 s, lamp pools −1 m for 10 s. Every 15 s.
- The Arms' Sweep (phase 3): TELEGRAPH an arm rises from the open ring (Act V's Hand Rise, 1.6 s) | EFFECT each arm Sweeps (teleCone 6 m, 1.2 s, 1.1×) every 6 s, staggered; at most 2; never inside lamp light.

## Mechanics
**Systems are taught one at a time, then combined** (Act V's rule), and each one grows out of a system the engine already runs:
- **The Hollows before the keels:** the tide under the roof first (the Flats at the first flood, Speio's bell), the keels second (the first pinch on the way to Keel 1), the unseen third (the first namelessCrew at the edge of a skylight); then fire on the Great Keels, alone (Keel 1), with the tide (Keel 2), with the dark and the drinkers (Keel 3).
- **Charybdis:** the ebb and the lip, then the flood and lamp denial, then fire carried by the pull.
- **The tiers:** the dark and the unseen without the tide; depth one tier at a time; the Forgetter from tier 2; Act V's cracking ice over the Bed.
- **No One:** light (phase 1), names (phase 2), fire and forgetting (phase 3).
- **No new buttons:** lighting, remembering, naming, climbing and reading use interact; escaping a pull or a Surge uses the dodge.

### The Breathing Ice (Ο Πάγος που Ανασαίνει): the Hollows, the Throat
Under the roof the tide is one clock with three consequences: the low floor floods, the high ground opens, the light from above drowns.

**The clock** (tide.js, unchanged in kind, its own numbers in HAZ6). The water level h runs a 150 s cycle (190 s on Wanderer):

| state | duration | h |
|---|---|---|
| low water (slack) | 50 s | 0 |
| flood | 30 s | 0 → 1.2 in 8 steps of 0.15 m, one every 3.75 s |
| high water (slack) | 40 s | 1.2 |
| ebb | 30 s | 1.2 → 0 in 8 steps |

- The clock starts at the beginning of low water on every build and entry (Act V's rule: cached zones reset).
- **The warning is Tern's bell,** heard from the stair (a positional sound at the Bell Camp, carried through the zone at a fixed level): three strokes 6 s before the flood and 6 s before the ebb (9 s on Wanderer). The HUD tide dial (Act V's crescent) gains a keel tick on its rim: white while the keels are grounded, blue while they are up. Toast q.tideTurn6 «Γυρίζει η θάλασσα κάτω από τον πάγο» / "The sea turns beneath the ice" once a visit.

**The cells** (Act V's rule for every cell with `L.bed`: dry, shallow wading ×0.7 and Cold +4/s, deep closed at 0.45 m), plus one new kind:
- **Pinch cells** (`L.keel > 0`): a keel of ice hangs to the ridge. **While h < lift the keel is grounded and the cell is closed; while h ≥ lift it is lifted and the cell is open** (shallow or dry by its bed). tide.js's step diff tests both thresholds in the same pass, so a step can close low cells and open pinches in one batch (one `map.close` and one `map.open`, `map.ver` bumped once).
- **Great Keels** (`L.great`): solid at every tide until melted.
- **Sumps:** always closed (open water); the flood visibly wells out of them first (the water mesh's local boil).

**What the player learns:** «Στην άμπωτη πήγαινε χαμηλά. Στην πλημμυρίδα ψηλά.» / "At the ebb go low. At the flood go high." Low water opens the troughs, the sumps' lips and the hoards; high water closes them and opens the ridges' pinches. Some ways exist only at one tide: the map's reach checks guarantee neither tide strands her.

**Safety rules (never unfair; Act V's, extended to the keels).**
- **Never under her feet.** A step that would close a cell within 1 m of the hero, whether by water rising or by a keel settling, defers that cell and her escape lane (a BFS at the new state to the nearest cell that stays open) for 6 s.
- **The press.** If she is still in a settling keel's lane after 6 s, the keel *presses her out* along the lane: a `pl.pull` along the lane's cells (Act V's wash-out code path), 6% of max life (HAZ6), no Cold; the frost line flashes and the ice groans. The water's wash-out is Act V's, unchanged.
- Every pull of the act by an enemy stops at the first deep cell or wall (`map.castT`); Charybdis's drift stops at any dry cell and at the well's lip.
- Monsters caught in a closing cell are pushed out (`collide`, `nearestFloor`); non-swimmers knocked into deep water drown after 0.5 s (full xp).
- Camp, bells, pads, ledges, windows and exits are always dry (gen6 guarantees it, check-act6 tests it at three levels).

**The light rides the tide.** Every skylight's radius is `r0 · clamp(1 − h / 0.9, 0, 1)`: at low water the Flats are lit green, by the top of the flood they are black, and the Nameless walk in unseen. `MOOD.tide` mixes ATMOS.hollows into ATMOS.hollowsFlood.

**Fire melts, light holds** (Act V's two ice rules, now for the roof):
- **Lamp light holds a keel up:** a pinch cell inside lamp light (`lampLightAt`) never grounds; a name-lamp or a ledge-lamp opens its pinches for good. Rime-hangers never drop inside lamp light.
- **Fire melts a keel:** a fire area (burning oil, the Mage's burning ground, not `dim` fires) on a pinch cell for 6 s melts that keel away for the visit (the cell keeps only its bed rule). On a Great Keel it melts in stages:
  - each Great Keel needs **3 stages of 8 s** of fire touching its foot cells (HAZ6: 6 s on Wanderer, 10 s on Ash);
  - its oil-pot («Άναψε το λάδι», 1.5 s; interrupted by a hit worth 10% of max life) burns 8 s on a dry pad; **at high water the oil floats** (Act V's burning oil floats) and spreads under the whole keel (r 3.5 instead of 2.5), melting ×1.5 as fast, but the hero who lit it is wading in the dark;
  - the Mage's fire counts at half rate, a Meteor's burning ground at full; the Ranger's Rain of Fire leaves `dim` fire, which melts at half rate (it is fire, not light);
  - **what puts it out:** a Lightdrinker's drink (4 s), a Nameless kicking a dry pot over (a 1.2 s tell; a floating fire cannot be kicked), the ebb grounding a burning slick on dry ground (it burns out its time there);
  - each stage done, the keel visibly thins, drips and steams (q.keelStage); the third, it cracks and falls into the trough with a roar (q.keelMelt).
- So each Great Keel is a choice: **melt it at the ebb** (dry, lit by the skylights, slow) or **at the flood** (fast, wet, dark, with the drinkers and the Nameless in the water).

IMPL:
- **src/game/tide.js** (Act V): the step diff gains the pinch threshold (`L.keel`) and `TIDE.local` (the Siphon's surges: `{ x, z, r, dh, t }`, added to h for the cells inside); the press shares the wash-out's lane and pull; `keelUp(i)` for the visuals and the rules; lamp light read through `lampLightAt` once per step for the pinches in it.
- **src/game/keels.js** (new, about 160 lines): the Great Keels' stages, their fire contact (G.areas 'fire' overlapping the foot cells, 4 times a second), the oil-pots (interact kind 'oilPot', `it.snuff` by a Nameless kick or a drink), the melt of pinch keels by fire, the visuals' hooks, the saved `keel<k>` flags, `z.keels` reset on entry.
- **combat.js / player.js / ai.js:** `DRIFT = { x, z, k, r }` for Charybdis's Inhale, applied as a velocity on wet cells (the hero's in player.js, monsters' in ai.js, floating areas' in projectiles.js), never across a dry cell.
- **gen6** writes `L.keel`, `L.great`, `L.sky`, `L.sumps`, `L.bells`; **check-act6** runs the flood and ebb rules at h = 0, 0.6 and 1.2.
- Steps are 3.75 s apart in the zone and 1 s apart in the Throat (6 s), within the engine brief's §3.2 bound.

### What Is Not Lit Is Forgotten (Ό,τι δεν Φωτίζεται Ξεχνιέται): every Act VI zone
The third kind of zone, `light: 'under'`: Act V's sea light (warmth, lamp light holding ice, beams revealing the `unlit`) plus one rule for one trait, and lights that move with the tide and with the hero's skills.

**The rule:** an `unseen` actor outside light is not drawn, cannot be aimed at, and still takes every area blow in full (Enemies, the trait). Its telegraphs always show. It is seen while lit and for `seenT` after (2 s on Warden), and for 1.5 s after it strikes.

**What it does to fights.** Single-target blows need light on the target; area blows do not. Every class plays it differently:
- **Warden:** his ring (4 m) covers his reach, so he sees what he fights; Whirlwind and Earthsplitter hit the unseen anyway. His tools for the party are flares: **War Cry flares his ring to 8 m for 3 s** in Act VI zones (everything in it seen); Rallying Cry flares every hero's ring within 10 m; Challenge's taunted foes stay seen for the taunt; Iron Bulwark's ward glows as a light pool r 3 while it holds; **Dawnbreaker's waves are moving light** (each lights its path for 1 s and dazzles the `unlit`: its own description says "The dark cannot abide it").
- **Ranger:** her reach (13-22 m) far outruns her light, so she must light at range or work with others' light. **The Spirit Wolf carries a lantern** (a light pool r 3.5 that runs with it: she sends it into the dark to find them); The Pack: three wolves of r 2; The Alpha: one wolf of r 5. **Storm of Hawks:** each stoop leaves its target seen for 3 s. **Snare Trap:** a trapped foe is seen while held. Piercing Shot breaks every whale-oil cask along its line (lights at 22 m). Hail freezes the water under its area to slush-ice for 6 s (a crossing at the flood).
- **Mage:** fire is light. Fireball's burning ground and Meteor's are lit pools (and melt keels); Meteor's flash lights r 8 for 0.5 s (FLARE, light.js, now in every 'under' zone). **The Ray of Dawn counts as a beam along its length** (it reveals, dazzles the `unlit` and warms). **Frost Nova freezes every water cell in r 5.5 to slush-ice for 8 s**, which the flood cannot close: the Mage holds a lane open at the turn, freezes a Siphon's sump lip (Stranded) and freezes Lightdrinkers 2.2 s. Chain Lightning jumps 2 more times between foes standing in water. Frozen Orb's trail freezes water. Void Rift pulls Lightdrinkers and floating oil (gather the fire into Charybdis's mouth).
- **Every class:** a Lightdrinker killed full is a flare; a Nameless killed in light leaves a name-spark; whale-oil casks are fire.

**The lights** (light.js, all through `lightAt`):

| light | radius | lamp light (holds keels, denies the dark) | moves |
|---|---|---|---|
| a hero's Cradle ring (every hero in co-op) | 4 m (Hollows), 4 − 0.2·k (tier k), 3 m (Floor); +Lamplight Mastery | no | with her |
| a co-op party's lantern chain: each ring +1 m while another hero is within 6 m (at most +2) | | no | |
| skylights | 3-5 m, by the tide | no | with the tide |
| name-lamps, ledge-lamps, Tier-lamps, dead lamps once lit, braziers | 4 / 5 / 6 / 5 / 5 m | yes | |
| the Floor's hearth | 7 m | no (fire) | |
| burning oil, the Mage's fire (not `dim`) | its area | no (fire melts) | floats, drifts |
| the wolf's lantern, Bulwark's glow, Dawnbreaker's waves, hawks' stoops, the Ray of Dawn | 3.5 / 3 / 2 / 1.5 / its line | no | yes |
| a Lightdrinker's burst; a name-spark | 8 m for 3 s; 2 m for 6 s | no | |

**Readability of the unseen** (phone): telegraphs always drawn; breath every 1.2 s within 10 m; footprints on mud; a crunching footstep, positional; **an edge pulse** (a faint pale arc at the screen's edge toward any unseen foe within 4 m: "you feel it near"); a blow from the dark reveals the striker. The aim helper (skills.js nearest-target and the phone's auto-aim) skips unseen foes rather than firing at nothing: a Ranger in the dark sees her bolt go where she points, not toward a foe she cannot see.

IMPL:
- **light.js:** `lightKind()` 'under'; `lightAt` counts every hero's ring (`heroes()`, net/state.js) and the moving pools; `flareRing(r, t)` (War Cry); skylight pools tied to `TIDE.h`; FLARE for every 'under' zone; `lampLightAt` unchanged.
- **ai.js / actors.js:** the `unseen` trait: a 4 Hz `seenTick(a)` (light test with pad), `a.seenT`, the avatar's dissolve fade, `a.untargetable` read by skills.js targeting and the HUD; the reveal on a landed blow; `lostQuarry` for the Nameless.
- **skills.js / skillsx.js:** the class hooks above, each one line at the point the skill already acts (the Act V crack hooks are the pattern, progression/README §Porting); the variants repeat their base's hook (Act V's lesson: "a variant replaces its base function").
- **hud.js:** the edge pulse; the forgotten button's frost (the Forgetter); the keel tick on the tide dial; the depth readout.
- **fx.js:** breath for the unseen, footprints for them, name-sparks, the nameRise column.

### The Tiers (Οι Βαθμίδες): the Shadow Gates' machinery as a place
The act's second zone is four tiers deep, built and scaled the way the Shadow Gates are, so the story road and the post-game are one system.

**How a tier is built:** genTier(seed, k) calls the Gates' own generator for its kind (genCrypt, genForest, genHalls, or gen6's 'landing'), then `drown(L, kind)` (Zones). The same `drown` builds the post-game's Drowned tiers.

**How a tier is scaled** (HAZ6 by difficulty; Warden shown):
- monsters' life and blows ×1.06^k (`gateMul`, the Gates' multiplier at a gentler base);
- the hero's ring 4 − 0.2·k m (tier 4: 3.2; the Floor: 3.0);
- Cold gains ×(1 + 0.06·k) (every Nameless blow carries Cold +3; wading in the Bed's water, +4/s);
- fog density +0.004·k; the minimap's depth «{0} οργιές» / "{0} fathoms";
- the Guardian of the Tier drops loot as a Gate Guardian of Shadow Gate tier 3·k (boot.js's guardian roll), so the descent pays like the Gates;
- a plunge through a tier's ice into the Bed: Act V's plunge, plus the hero's light halved for 4 s (`halveCradle`).

**How a tier is crossed:** light the Tier-lamp (checkpoint), remember (the memory), light the dead lamps you need, keep moving on the ice, beat the Guardian, climb down. A tier takes 4-6 minutes on Warden.

**What it changes in play:** depth squeezes the light one tier at a time, so the second mechanic gets harder without a new rule: a Ranger leans on her wolf and hawks, a Warden on his flares, a Mage on fire; a party walks closer together for the lantern chain.

IMPL:
- **src/world/gen6.js** `genTier(seed, k)`, `drown(L, kind)`, `genFloor(seed)`; the 'landing' kind from gen5's Landing primitives.
- **world.js:** ZONES tier1-tier4 from one def (`tier: k`); `createZone` passes `k` to the pack scaling exactly as it passes `z.tier` for 'gate' (world.js:396); the Guardian through the gate guardian's spawn code factored out of boot.js `gateKill` into `spawnGuardian(kind, x, z, mul, name)`; the ladders as exits (`{ to: 'tier' + (k + 1) }`, the last to 'floor') locked on `tierG<k>`.
- **build6.js** `drownLevel`: the 'icy:' material on the source pack's instanced scans; dead lights to lamps.

### The vulnerability rule (Act V's, with Act VI's statuses)
One multiplier per target: the largest active status. Never multiplied together; bosses capped at ×1.6 outside one scripted window per phase.

| status | × | who |
|---|---|---|
| Gorged, Exposed (after a Rise), Startled | 1.25 | Charybdis; No One |
| Stunned (a Rime-hanger knocked down), Stranded (a Siphon; a Lightdrinker on mud), Seared (the hearth) | 1.5 | Rime-hangers, Siphons, Lightdrinkers; No One |
| Choked by a Fireball or a Meteor | 1.6 | Charybdis |
| Choked by oil (its scripted window) | 2.0 | Charybdis, phase 3 |

Warded (No One's figures, ×0.4 rising to ×1.0) multiplies with the status, like Act V's ward. Revealed (Act V, ×1.25) stays as it was for the `unlit`.

### World-state: the Call, the Stair, the Keels, the Throat, the Tiers, the Name (Το Κάλεσμα, η Σκάλα, οι Καρίνες, ο Λαιμός, οι Βαθμίδες, το Όνομα)
One more chain after Act V's `coastCall` → … → `seaLit`. Every flag is saved before its scene plays and read on build, on every entry (zones are cached) and on load.
1. **`underCall` (q32).** Whitecliff: the Farthest Light (FAR_BEACONS[3]) takes the `call` flash pattern until `stairOpen`; the child at the beacon.
2. **`stairOpen` (q33).** The Farthest Light: the arch open, Tern at the bell-post, the exit to the Hollows.
3. **`hollowsSeen`, `keel0`-`keel2` (q34).** The Hollows: each Great Keel's cells open on build and entry; the names found (`names6`) light their bells and hold their pinches.
4. **`charybdisDown` (q35).** The Throat dry for good (its water at 0, its wells closed and dry-dressed), the rope exit.
5. **`tier1`-`tier4`, `tierG1`-`tierG4`, `mem_t1`-`mem_t4` (q36).** Lamps lit, Guardians down, ladders open, memories seen.
6. **`floorSeen`, `kaneisWake`, `kaneisDown` (q37).** The Floor: after `kaneisDown` the hearth burns (camp, waypoint), the Bed is still, lights rise.
7. **`pharo` and `sunrise` (q38).** Selna's and Glaukos's rites open with «Φαρώ.»; the title's game.sub6; the home lines; Alkyone's d.alk.gates2; **the Shadow Gates' Drowned tiers** (Echoes and post-game). `sunrise` is the cine's (the far north's first dawn plays once; the coast keeps its night and its aurora).
- **Packs stay for farming** in every state: the Hollows keep their tide and their keels (the Great Keels stay melted), the tiers their Guardians (respawned on each build, as the Gates' are).
- **Old saves** without these flags read as Act V's end state (q31, `seaLit`). `hero.act6 ??= −1`; state.js's new hero gets `act6: −1`.
IMPL: `act6Zone(z)`, `act6Enter(z)`, `act6Presence(z)` in world.js, mirroring the Act V trio. `enterZone` rebuilds 'hollows' (`fresh: true`) only if its mode changed (`charybdisDown` changes the Throat). `act6Enter` resets the tide to low water, the keels' stages, the drift and the pinches' lamp state on every entry. The title reads `save.heroes.some(h => h.act6 >= 0)` for game.sub6.

### Difficulty: what each level does to Act VI
The six difficulties keep their names. On top of the existing hp, damage, elite and loot scaling, every Act VI hazard scales through a new `HAZ6` table indexed like DIFFS (beside Act V's HAZ5, whose Cold, plunge and wash-out rows Act VI reuses). **Telegraph durations never change.**

| | Wanderer | Warden | Hero | Nightmare | Ash | Skotos |
|---|---|---|---|---|---|---|
| monster hp / dmg (existing) | 0.65 / 0.55 | 1 / 1 | 1.9 / 1.55 | 3.6 / 2.4 | 7 / 3.8 | 11 / 5.4 |
| under-ice tide cycle | 190 s | 150 s | 150 s | 150 s | 150 s | 150 s |
| Tern's bell lead | 9 s | 6 s | 6 s | 6 s | 6 s | 6 s |
| keel press (% max life) | 3 | 6 | 6 | 8 | 10 | 12 |
| unseen: `seenT` linger | 3 s | 2 s | 2 s | 1.5 s | 1.5 s | 1.2 s |
| unseen: breath tell range | 12 m | 10 m | 10 m | 9 m | 8 m | 8 m |
| Lightdrinker drink time | 6 s | 4 s | 4 s | 3.5 s | 3 s | 3 s |
| Great Keel stage (s of fire) | 6 | 8 | 8 | 9 | 10 | 10 |
| Forgotten skill | 3 s | 5 s | 5 s | 6 s | 6 s | 7 s |
| tiers: ring per tier | −0.1 m | −0.2 m | −0.2 m | −0.2 m | −0.25 m | −0.25 m |
| tiers: Cold per tier | +3% | +6% | +6% | +7% | +8% | +9% |
| tiers: `gateMul` base | 1.04 | 1.06 | 1.06 | 1.07 | 1.08 | 1.09 |
| Cold gains (HAZ5) | ×0.8 | ×1 | ×1 | ×1.15 | ×1.3 | ×1.45 |
| boss cooldowns | ×1 | ×1 | ×1 | ×0.9 | ×0.85 | ×0.8 |
| adds per boss call | +0 | +0 | +0 | +1 | +1 | +2 |
| telegraph durations | never change | | | | | |

- **Seeds per difficulty:** `hollows@<diff>`, `tiers@<diff>`, `floor@<diff>` (the owner's Act V decision carried over): a fresh Hollows and fresh tiers on each difficulty; the story state is the hero's own.
- **Unlocks:** unchanged ('any:<diff>'); the sixth, «Σκότος», still opens from Act V on Ash.

### Touch and phone readability (rules the act keeps)
1. **No new buttons.**
2. **Telegraph palette:** Act V's (red and orange harm; sea-green a pull, Cold Hands included; white crack-stars ice; blue safe circles) plus **pale violet: a forgetting** (the Forgetter's Unmind and No One's Forgetting). Lights never draw rings: skylights are soft caustic discs, lamps and fires warm pools, beams light only.
3. **At most two big telegraphs at once,** the environment (a flood, an Inhale, a Surge ring, Grief, the Forgetting) always counting as one.
4. **One clock, one dial, one bell:** the tide dial with its keel tick; Tern's three strokes before each turn; the creak of keels before they settle.
5. **The dark is never blind:** telegraphs always; breath, footprints, footsteps and the edge pulse for the unseen; the striker revealed; area blows always land; the ring never under 3 m but while a Lightdrinker clings to her (2 m at the least).
6. **A forgotten skill is obvious and short:** its button frosted with «;», a dull note when pressed, 5 s on Warden, back at once in lamp light, never the basic attack, never two at once.
7. **Never unfair:** the tide's and the keels' 6 s grace and lane; the flood and ebb reach rules; every enemy pull stops at the first deep cell; fail-safes for each boss phase that needs one; plunges as Act V's (never under 10% of life).
8. **Test at quality 0 and gate at quality 1** (perf6).

### Co-op beneath the ice (up to four)
Co-op is host-led (docs/coop/README.md): the world and the story are the host's; each guest's hero, gear and rewards its own. Act VI is built so that every one of the four has something to do with the light.
- **Every hero's ring is light for everyone** (`lightAt` over `heroes()`); the **lantern chain** gives each ring +1 m while another hero is within 6 m (at most +2). A party that spreads out sees more ground and less of each foe; one that bunches sees clearly and little.
- **The unseen across pages:** the host decides `seen` for every monster (its light, every hero's ring as the host knows them) and sends one bit per actor in the snapshot (`v`, a bitset over the actor list, about 8 bytes for 60 actors); a guest shows and hides its puppets by it, and its own aim helper reads it.
- **Mechanic interacts for guests** (new): the act's fight-and-route interacts become guest-usable through a reliable event the host validates (within 3 m of the guest's stand-in, the thing in the state the guest saw): ledge-lamps, dead lamps, braziers, oil-pots, Face naming, the hearth's lighting. The story's interacts stay the host's (the Stair, «Θυμήσου» at the six bells, Tier-lamps, memories, reading the stone, calling the name, the final name). This fixes an Act V gap as well: its cairns and hole lamps join `GUEST_OK` the same way.
- **The Forgetter on a guest:** the host sends `forget { slot, t }` to the struck guest's page; lamp light ends it there.
- **Charybdis's drift on guests:** the snapshot carries the drift's centre and strength; each page applies it to its own hero (the Act V tide's pattern: "each page's lanes and wash-outs are its own hero's"). Keels: the host's state (lift by its clock, melt stages, lamps holding them) in the world chunks, like the ice.
- **Downed in the flood:** a downed hero on a closing cell is moved along the lane to the nearest open cell; she is never left in deep water.
- **Roles the systems invite:** the Warden holds a lamp and flares for the party; the Ranger's wolf scouts ahead with its lantern; the Mage melts the keels and freezes the turn; a second Mage or a Warden carries casks to Charybdis's mouth while the others hold the ledges.
- **Scaling:** COOP unchanged; the tiers' `gateMul` stacks with COOP.hp.
- **Protocol:** one bump (coop.js `VER` 3 → 4): the `v` bitset, `kl` (keel stages), `dr` (the drift), the guest-use event kinds. Budget: +12 to +20 bytes a snapshot (docs/coop byte budget).

### Progression beneath the ice (Mastery, variants, later skills)
- **A 13th Mastery track, «Λύχνος» / "Lamplight":** the hero's light radius +% (max 50, k 40: rank 1 +1.2%, rank 10 +11%, rank 40 +32%), the wolf's lantern with it. It counts wherever a zone has light rules (Acts IV-VI and the Drowned tiers) and says so on its tile; elsewhere it does nothing. The owner's complaint was points with nowhere to go: this one has a place to go that the act makes worth it. Respec returns it like the others.
- **The class hooks** (What Is Not Lit Is Forgotten, above) touch every base skill that makes, carries or uses light or water, and eight of the nine later skills (all but the Vault):

| skill (variant) | Act VI rule |
|---|---|
| War Cry (Rallying Cry; Challenge) | the ring flares to 8 m for 3 s (every hero's within 10 m; taunted foes stay seen) |
| Earthsplitter (Shatterfan; Ring of Earth) | its fissures shatter a Rime-hanger's ice-fall at once |
| Shield Charge (later, level 20) | no wading slow; pushes a whale-oil cask 6 m |
| Iron Bulwark (later, 30) | its ward glows: light pool r 3 |
| Dawnbreaker (later, 40) | its waves are moving light; they dazzle the `unlit` |
| Spirit Wolf (The Pack; The Alpha) | carries a lantern: r 3.5 (three of r 2; one of r 5) |
| Arrow Rain (Rain of Fire; Hail) | Rain of Fire melts keels at half rate; Hail freezes water to slush-ice for 6 s |
| Piercing Shot (Splitting Shot; Siege Bolt) | breaks every whale-oil cask on its line |
| Snare Trap (later, 20) | a trapped foe is seen while held |
| Storm of Hawks (later, 40) | each stoop leaves its target seen 3 s |
| Fireball (Trident; Pale Cinder) | burning ground is light and melts keels at half rate (Pale Cinder's fire is `dim`: melts, never lights); into Charybdis's open mouth, a 2.5 s Choke |
| Frost Nova (Shatter; Blizzard) | water cells in r 5.5 freeze to slush-ice for 8 s; Blizzard's storm freezes the cells it covers |
| Chain Lightning (Forked; Ball) | +2 jumps between foes in water; Ball Lightning arcs to every wet foe within 3 m |
| Meteor (Shower; Frozen Comet) | a full-rate keel melt and an 8 m flash; Frozen Comet freezes water r 3.6 for 10 s |
| Frozen Orb (later, 20) | its trail freezes water |
| Void Rift (later, 30) | pulls Lightdrinkers and floating oil |
| Ray of Dawn (later, 40) | a beam along its length |

- **Variants keep their base's Act VI hook** (the progression port's rule), so no variant is weaker under the ice than its base.
- **Mastery XP:** the tiers pay XP like the Gates (`gateMul` on xp too), so the post-game long tail has a story place to grind.

### Engine work Act VI needs
An honest list, in build order, in focused days for one agent who knows the code (the Act V brief's measure).
IMPL:
1. **Sixth-act plumbing (1.5-2 d, low).** world.js ZONES hollows, tier1-tier4 (one def), floor; READY for 'seabed' and the `pale` set; the first-boss list, the champion chain, the `why` map (`stairOpen`, `charybdisDown`, `tierG<k>`), ECHO_PROMPT; story.js questText clamp to 39 (q34 and q36 counters, q37b), `actComplete(6)`, `offerBoons` [1..6], the echo tints; boot.js migration (`act6 ??= −1`); state.js; stats.js BOONS[6] ×1.25 with `allNames`; panels.js waypoints, the act panel's act6.*, boon.h6; act5.next replaced; game.sub6.
2. **The Breathing Ice (3-3.5 d, medium).** tide.js's pinch threshold, `TIDE.local`, the press; keels.js; the drift; the skylights' tie to h; check-act6's three-level rules.
3. **What Is Not Lit Is Forgotten (3-3.5 d, medium).** light.js 'under', `lightAt` over every hero, moving pools, `flareRing`; the `unseen` trait (seen tick, fade, untargetable, reveal on blow, lost quarry); skills.js targeting; the class hooks; the HUD's edge pulse and forgotten button.
4. **gen6.js genHollows and tools/check-act6.mjs (4-5 d, medium).** The cave graph, beds, sumps, pillars, pinches, Great Keels, bells, skylights, the Throat; 300 seeds, hard and soft sets as above; the farlight arch with its parity script.
5. **The Tiers (3-4 d, medium).** genTier (wrapping genCrypt, genForest, genHalls; the 'landing' kind), `drown`, genFloor; the tier zones' scaling through `gateMul`; `spawnGuardian` factored out of boot.js; the ladders.
6. **Visuals (3.5-4.5 d, medium; quality 0 first).** build6.js: keel meshes, oil-pots, bells' windows, the hearth; G_CAUST; the ice-wall depth tint; `uWhirl`; the drowning pass's material swaps; the jelly; the hanger's shadow; the sunrise in auroraSky; ATMOS and FX ambients ('hollows', 'deep', 'floor', 'floorRise'). `perf6` before either boss is built.
7. **AIs and traits (3.5-4 d, medium).** 'hanger', 'drifter'; the Siphon's Surge on 'lurker'; the Forgetter's Unmind on 'caster' (and the skill lock in skills.js); the Nameless's `unseen`, `lostQuarry`, name-spark; flesh 'rime' and 'jelly'.
8. **Two bosses (6.5-7.5 d, medium).** CHARYBDIS and KANEIS tables in `boss()`. Charybdis: anchored with wells, its breath cycle on `TIDE.force`, the drift, Gorged, Rise with lamp denial, the Choke with floating fire, Surge rings, the fail-safes. No One: phase 1's unseen boss and Startled, Snuff; the Faces as nodes with the naming interact and the lamps they leave, the ward's easing; the Bed's breathing; the collapse ring; the hearth and Seared; Forgetting; the final prompt; the naming cine.
9. **Story (3.5-4 d).** Quests 32-38 and 39; the hook in town and at the Gates; Selna's dialog; the Stair; the Hollows' arrival; the six names; the keels' lines; the Throat; the tiers' memories ('memory-ice', Act V's flow) and Guardians; the Floor's stone and call; the rite and the sunrise; the catch-ups; npcHasNews; home lines; about 190 bilingual lines.
10. **Co-op (1.5-2 d).** The `v` bitset, `kl`, `dr`; guest-use events and their checks; the Forgetter's event; `VER` 4; `tools/coop.mjs act6`.
11. **Progression (1-1.5 d).** The Lamplight track (progression.js, progpanel.js, text.js); the hooks in skills.js and skillsx.js.
12. **The Drowned tiers (1-1.5 d, low).** world.js 'gate' generation at every fifth tier after `pharo`; the gate panel's depth line; the Guardian's line.
13. **Audio (1.5-2 d, low).** Five themes, Pharo's motif, about 16 sound effects (Music).
14. **Assets (3-4 d).** Two downloads behind their provenance gates (the pistosaur, the scorpion), their builders and clips; the `pale` set's two recipes (gated at 12 measured textures); the jelly in code; tools/pack-seabed.mjs from the rime pack's shipped layers and scans plus one CC0 layer; credits.
15. **Scenarios (3-3.5 d).** In tools/scenario.mjs:

    | scenario | what it covers |
    |---|---|
    | hook6 | (a) an Act V-end save in the shipped format without `act6`: the migration, the call in town, the child, q32; (b) a hero finishing Act V after the update: actClosed → the call |
    | catch6 | every row of the catch-up table: set the state just after that flag's save, reload, assert the quest and the scene |
    | hollows | the arrival, the camp, Speio's bell, the first flood and ebb, a pinch lifting and settling, Keel 1 melted at the ebb |
    | ebb6 | a 20-cycle soak with packs: no actor in a closed cell, the hero never stuck, presses taken along their lanes, no jump over 3.5 m a frame, `map.ver` bumps |
    | keels | Keel 2 melted at the flood (floating oil ×1.5), a pot kicked over and relit, a Lightdrinker drinking the fire, Keel 3 |
    | unseen | a namelessCrew in the dark: aimed skills never lock an unseen foe, area skills hit, telegraphs drawn, the reveal on a blow, the linger, the edge pulse; each class's light hooks once |
    | charybdis | all phases; Gorged, a Rise forced to the dark well, a Choke by oil and one by a Fireball; the drift never carries anyone across a dry cell; the time-to-kill band |
    | tiers | tiers 1-4: lamps, memories, a plunge (the light halved), each Guardian, each ladder; the depth scaling read back |
    | kaneis | phase 1 Startled at a brazier; six Faces with three names known and three not (lamps and ward checked); the Bed's flood; the collapse with the hero pushed clear; the hearth; Forgetting; the final prompt; a death in phase 2 and a retry; the time-to-kill band |
    | ending6 | the naming, the First, the rite with the names in order, the answer, the sunrise, act6 panel, blessings, q39, game.sub6 |
    | forget | the Forgetter: never the basic attack, never two at once, lamp light restores, never under a red boss telegraph |
    | cast6 | every new model real or its stand-in, in a cold session from the `farlight` waypoint and one from `hollows` |
    | echo6 | both echoes |
    | perf6 | quality 1 under mobile emulation at the Flats at high water and the Throat's phase 2 flood, within the Field of Ash + 15%; quality 0 as a floor |
    | drowned | Shadow Gate tiers 5 and 10 drowned after `pharo` (and not before), their Guardian and depth line |
    | coop6 | (tools/coop.mjs) four pages: the `v` bits on puppets, guests lighting a ledge-lamp and naming a Face, the Forgetter on a guest, Charybdis's drift on guests, a downed guest in the flood |

    `window.__act6` in ai.js for what the scenarios read.

**Total: about 42-52 focused days**, assets, story, music and co-op included (the items add to 42.5-52.5). It is smaller than Act V (47-58) because it adds no rendering system and only two downloads; it is not small, because three systems change at their roots (tide.js, light.js, the Gates' generation).

**Ship first:** the pinch threshold and the press (tide.js), the `unseen` trait with its tells, genHollows with check-act6, perf6; then the keels; then both bosses. The story and both bosses survive every cut below.

**If the act runs late, cut in this order (each with its fallback):**
1. The Drowned tiers in the Gates → a later update (the act's story does not need them).
2. Tier 4 (the Forgotten Landing) → three tiers and the Floor; its memory's last line moves to tier 3's.
3. The Siphon's Surge → a plain lurker (the Icemaw's kit).
4. The Rime-hanger's ice-fall → its drop alone.
5. G_CAUST → plain skylight discs.
6. The Forgetter's Unmind → a plain caster with a slow (and No One's Forgetting → a Cold ring).
7. Charybdis's floating-oil Choke → the flask and the Mage's fire only.
8. The sunrise in the sky dome → a dawn card over the rite's last frame.

**Never cut:** the keels lifting with the flood and settling with the ebb, the unseen rule with its tells, the Throat's breath, the tiers built by the Gates' own generators, ΦΑΡΩ on the hearth-stone, «Κανείς δεν απαντά» answered, Selna's «Φαρώ. Φάρος.», the six names and Kranea for the Ranger.

## Blessings
Three for Act VI: what the deep gives back. The header is boon.h6 «Τα ονόματα του βυθού» / "The names of the deep", after «Τα φώτα της θάλασσας» (Act V).

**Memory of the Forgotten.** A hero who remembered all six of the Hollows' Forgotten (`flags.allNames`), at any time including the post-game, has the Act VI blessing worth ×1.25 (stats.js, as Act V's `remembered`; the `.du` lines show the rounded-down values). Unbound still multiplies only BOONS[4], Remembered only BOONS[5]. All three use existing stat keys, two each, in the band of Acts IV-V.
- pharo «Το Όνομα της Φαρώς» / "Pharo's Name": { dmgPct: 10, critDmg: 15 } (icon 'flame'). ×1.25: 12 / 18. — «Ένα όνομα που ξαναβρέθηκε καίει πιο ζεστά απ' όσα δεν χάθηκαν ποτέ.» / "A name found again burns warmer than those never lost."
- breath «Η Ανάσα του Πάγου» / "The Ice's Breath": { move: 8, cdr: 8 } (icon 'roll'). ×1.25: 10 / 10. — «Ο πάγος ανασαίνει με τη θάλασσα. Ανάσαινε κι εσύ μαζί της.» / "The ice breathes with the sea. Breathe with it."
- tiers «Οι Βαθμίδες» / "The Tiers": { lifePct: 12, regen: 12 } (icon 'shield'). ×1.25: 15 / 15. — «Κατέβηκες ως τον πάτο. Ανεβαίνεις κουβαλώντας όλα τα ονόματα.» / "You went down to the floor. You come up carrying every name."

## Music
**Five new procedural THEMES in audio.js and one motif**, in the house style: modal harmony, drones, no samples. Act V's ice-song instrument, sea-light motif and naming chord return.

**Pharo's motif.** The sea-light motif (D, A, G, D′; long-short-short-long) played backwards: D′, G, A, D. The word, heard from the other side, is the name. It sounds once at the Floor when the stone is read (on a single low flute), under each named Face (one note each, rising), and at the rite **with the sea-light motif against it**: the name and the word resolving together to D major.

**The forgetting melody** (Act V's `MOOD.forget`) returns in the tiers: each tier's music is the theme of the place it was, half-remembered.

**'hollows'.** 50 bpm, no beat, A Aeolian.
- A low bowed drone; the sea heard above through the ice as a low-passed roar whose loudness follows `MOOD.tide`; drips that ring on a pentatonic; the ice-song now and then.
- Tern's bell, three strokes, before each turn: a real bell high above, slightly detuned, the act's clock.
- At the flood, everything low-passes toward 600 Hz as the light goes ("the sea drowns the light"); at the ebb, glassy bells come back with the skylights.
- When a name is remembered, a warm open fifth on the next bar and a single bell for the name.

**'charybdis'.** 6/8 at 96 bpm, A Phrygian, heavy drums ('boss').
- The breath *is* the music: a filtered-noise swell rising with each Inhale and a drum-and-brass hit on each Exhale; the pull's drift under a downward glissando of low strings.
- **Phase 2:** the drums stop; a heartbeat thump and a low choir; each lamp lit adds a held note; a Rise is a single taiko hit.
- **Phase 3:** the drums back, faster; each Choke a cymbal-and-steam swell and two bars of the sea-light motif on brass.

**'tiers'.** Each tier plays its source's theme slowed to two thirds, low-passed and detuned, with notes dropping out (`MOOD.forget` at 0.3 + 0.1·k): tier 1 'crypt', tier 2 'forest', tier 3 'halls', tier 4 the coast's Saltborn bells; the Floor, before the fight, only the sub drone and the Bed's breathing. Depth adds a sub drone at A1 rising in level per tier. When a Tier-lamp is lit the dropped notes come back for eight bars.

**'kaneis'.**
- **Phase 1:** near silence, the ice-song, a sub drone and a heartbeat; a single choir note each time it is Startled.
- **Phase 2:** one voice for each named figure joins a slow choir chord (six voices if all six are named; a hero who knew none hears the chord thin and hollow).
- **Phase 3:** low strings and the forgetting melody; each Forgetting drops the melody out for its 6 s; when the hearth catches, Pharo's motif on flute over the strings; at 10% everything stops but one bell.
- **The naming:** the bell once for her name, then the naming chord, quiet.

**'pharo'** replaces 'victory' for the end: under the rite, the answer and the sunrise, then actComplete(6). 60 bpm, D major: the sea-light motif and Pharo's motif in canon, answered by Act IV's lantern motif; each sea-light that flares adds a bell; the sunrise is a held major chord with high strings.

**Ambients:** 'hollows' (drips, the roof's creak, the sea above, bubbles from sumps, Tern's bell); 'deep' (silence and the tiers' slow motes, a far ice-song); 'floor' (the Bed's breathing: a slow filtered swell like sleep; after `kaneisDown` it is still).

**SFX (16 new):** keelCreak, keelGround, keelLift, keelMelt, keelFall, sumpBoil, inhaleRoar, exhaleSurge, choke, hangerDrop, iceFall, drinkerPulse, drinkerPop, unmind (a glassy smear), unseenStep, nameBell. Act V's tideBell, splash, plunge, iceSing and the bear's set are reused.

## Echoes and post-game
**Echo refights,** once a day each, with normal loot and no story consequences:
- **Charybdis:** «Θυμήσου τη Χάρυβδη» / "Remember Charybdis", at the dry well, after `pharo`.
- **No One:** «Φώναξε ένα όνομα» / "Call a name", at the Bed's edge, after `pharo`.
- **Toasts:** echo.rise6 «Ο βυθός θυμάται τη μάχη...» / "The deep remembers the fight..."; echo.done6 «Η ηχώ σβήνει. Ο βυθός θα θυμηθεί ξανά αύριο.» / "The echo fades. The deep will remember again tomorrow."
- **Look:** Charybdis in a frost echo tint (`baseTint` 0xbcd8f0 at 1.2, rim 0x9ad8ff); No One darkened to 0x9aa8b8 with rim 0xb090ff. story.js gains a branch for each. Level as the story fights.

**Two Act VI legendaries,** the bosses' first-kill drops (`LEG_FROM`, as Act V passes `leg: LEG_FROM[a.kind]`).

| id | name | base | class | what it does | where |
|---|---|---|---|---|---|
| charybdisWhorl | «Το Κοχύλι της Χάρυβδης» / "Charybdis's Whorl" | amulet | any | +resistances; Tern's bell rings for you 4 s earlier, and every pull and drift of the act moves you half as far | Charybdis's first kill |
| kaneisRime | «Η Πάχνη του Κανενός» / "No One's Rime" | chest | any | +armour; out of light you are unseen too: a foe that has no light on you loses you after 1.5 s (bosses excepted), and your first blow from the dark deals +40% | No One's first kill |

The Ranger has the act's best light tools in her skills (the wolf's lantern, the hawks, the trap); the Warden his flares; the Mage his fire and frost. No class-only legendary is needed.

**What stays to play.**
- **The Hollows,** always breathing: the tide, the keels, the bells, the hoards at low water, the packs; the Great Keels stay melted.
- **The tiers,** each with its Guardian respawned on each build, paying like Shadow Gate tiers 3, 6, 9, 12: the post-game's long tail with a story place, Mastery XP included.
- **The six names,** findable in the post-game, for the ×1.25 blessing, the rite and No One's echo.
- **Seeds by difficulty** for the Hollows, the tiers and the Floor.

**The Shadow Gates gain a floor and Drowned tiers** (they keep everything else: endless tiers, Isarn's staff, the Gate Guardian; canon item 18).
- **Drowned tiers:** after `pharo`, every fifth tier (5, 10, 15, ...) is built by genTier with the tier kind that tier's number picks (crypt, forest, halls, landing in turn) and the act's `drown` pass: the dark and the unseen, ice over the Bed, the Forgetters; no tide. Its Guardian is the Gates' own (one of No One's shapes), and it drops one more item. Gate scaling (`1.14^tier`) is unchanged.
- **The depth readout:** the Shadow Gates panel and the gate's HUD show «Βαθμίδα {0} · {1} οργιές κάτω από τον πάγο» / "Tier {0} · {1} fathoms beneath the ice" (fathoms = 8 + 6 × tier).
- **The Guardian speaks:** on every gate tier after `pharo`, its death line is d.gate.home «...πίσω... στο φως...» / "...back... to the light..." (flavour).
- **Alkyone's line** at the Landing becomes d.alk.gates2 (ending).

## Risks
- **Continuity fixes applied** (canon §4):
  - The hero never speaks: calling the name, saying the names, telling Selna are second-person narration (d.floor.3, d.name6.say, d.kaneis.you, d.rite6.0), as d.naming.you and d.name.1 were.
  - The Skotos is not raised again, not killed, not made a servant: its shadow sleeps under the ice. No One is a new being made of what the dark holds; it is not Karthax and grants no wish; Karthax is never named.
  - Isarn and Ivar stay dead, as names in the rite. Brokka and Elati stay home (lines only).
  - The Shadow Gates keep their endless tiers, Isarn's staff and the Gate Guardian; the act explains them and adds to them.
  - Timeline words stay «χίλια χρόνια», «εκατό χειμώνες»; the First is "before all memory" («από πριν υπάρξουν χρόνια»).
  - Every φρυκτωρία is still the brow-stone's fire; φάρος, the Act V word, is the one whose meaning grows.
  - Elianthe's origin stays open: she played in a Whisperwood glade as a girl; nothing says what people she is.
  - Kranea comes from Act V's stretch Name-stone, never shipped: no shipped line is changed by using her.
- **The twist in English.** «ΦΑΡΩ» reads at once as «ΦΑΡΟΣ» in Greek; in English it rests on "pharos" (the word English players know from the Pharos of Alexandria). Selna's English line says it plainly ("we have called every light of ours a pharos"). If the owner wants the English to land harder, the English sea-light word could become "pharos" in Act VI's text only; recommended: no, keep Act V's "sea-light" and let Selna make the link.
- **The unseen frustrating on a phone** (the act's biggest design risk). Telegraphs always drawn; area blows always land; breath, footprints, steps and the edge pulse in the dark; the striker revealed; a 2 s linger; rings never under 3 m but under a Lightdrinker; Lamplight Mastery; the `unseen` scenario asserts that no aimed skill locks onto nothing. If a real-phone test still finds it unfair, the fallback keeps a faint silhouette (10% opacity) within 4 m.
- **Two tide bosses in a row** (Act V's Walking Tower, Act VI's Charybdis). They are built to play apart: the Tower hunted from the water and beached itself; Charybdis never leaves its wells, pulls the hero toward it, is denied by lamps and is beaten by fire carried on the pull. The Tower taught "dry ground"; Charybdis teaches "low at the ebb, high at the flood, light the other wells".
- **A skill taken away.** The Forgetter is the boldest hook into the progression: short (5 s), one skill, never the basic attack, never during a red boss telegraph, cured by lamp light, and the Forgetter is always visible. The cut order replaces it with a slow if play tests dislike it.
- **No One and a famous film spirit.** A faceless dark figure that gathers others' voices recalls the masked spirit of a well-known animated film. Kept apart on purpose: no mask anywhere (a void hood), a pale rime robe rather than a black one, the faces as small frozen figures around it rather than worn, and no eating, no gold, no voice-stealing. The Forgetter has no mask either.
- **No One reusing the Skotos's model.** Intended (it is the dark's shape at its bed), but it must not read as "the same boss again": pale, 1.4 not 3.2, on land, the six figures; a look gate in the creature viewer with a hooded-humanoid scout as the fallback.
- **The tiers reusing old acts' generators.** Intended (they *are* the forgotten places), but they must look transformed: the 'icy:' material, dead lights, fog, the Bed's ice floors, a new roster. A look round at each tier at the gameplay pitch before stage C.
- **IP hygiene.**

  | avoid | because of | here instead |
  |---|---|---|
  | "the First Flame", relighting a fire at the bottom of the world to hold back the dark, "Kindling" | Dark Souls | the First is a woman with a name; what is returned is a name, not a fire; the hearth is lit to fight, and the end beat is a rite of names |
  | "Sunless", "Zubmariner"; "Below Zero" | Sunless Sea; Subnautica | "Beneath the Ice", "the Hollows", "the Floor" |
  | a masked, faceless spirit that eats and steals voices | a famous animated film | No One: a void hood, a ring of frozen figures, no mask |
  | "the Nameless One", "Nameless King" as a single villain | Planescape; Dark Souls 3 | "Nameless" is a family of common foes; the villain is "No One", the Odyssey's Οὖτις (public domain) |
  | the Forsaken, "the Forgotten" as a faction | Warcraft | the Forgotten are six people with names, not a faction |
  | Charybdis as a giant toothed maw in the sea floor | many games' sea monsters | a pistosaur-like beast whose breath is the tide, named from the Saltborn's tales (Homer, public domain) |
  | "the Abyss" | the repository's other game, Abyssos | never used |
  | "Frozen X", "Drowned X" | the elite affix; Act V's note | Nameless, Rime-hanger, Lightdrinker, Siphon, Forgetter |
  | a real people's under-ice custom shown as theirs | respect | the phenomenon (air under the sea ice at low tide) is physics; the custom is the Saltborn's own, with Einar's Stair |
- **Phone memory and fill rate.** The act's new textures are about 11-12 MB; a cold start at `farlight` also loads the act5 group, the frost set and the rime pack (Act V's numbers). The flood under the roof is Act V's water mesh on fewer cells; the keels' transparency is watched by perf6. Act V's contingency (unload Acts II-IV's packs) applies unchanged.
- **The tide and the keels trapping the hero.** The press is the wash-out's code path with the same 6 s grace and lane; check-act6's flood and ebb rules guarantee a way out at both extremes; the `ebb6` soak asserts it over 20 cycles with packs.
- **Saves and state.** Every flag saved before its scene; keel stages, faces and phases runtime; old saves read as q31 + `seaLit`; `hook6` and `catch6` cover quitting at each beat. In co-op the host's flags drive every guest's view (Act V's rule).
- **Scope.** 42-52 days. The cut order is under Engine work; the story and both bosses survive every cut.
- **CREDITS.txt additions** (CC-BY 4.0): RickStikkelorum (Pistosaur Animated), anthonyvanoo (Scorpion); fallbacks only if used: Spinnee (Pliosaur), .hapto GmbH (Pseudoscorpion), Muru (Stelae knight). CC0, credited all the same: the new Poly Haven or ambientCG layer and its author. Already credited and reused: MysteryPancake (the Skotos's figure, now also No One), Quaternius, Elin Hohler, sterlingcrispin, Ingenium Canada, the Swedish National Maritime and Transport History Museums, Opus Poly, TooManyDemons, Thomas Flynn, Grace Belt, ffish.asia / floraZia.com, Poly Haven and ambientCG.

## Assets
Every third-party asset Act VI uses, with its uid or id, author, licence, what it becomes and its budget. **Only two are new downloads;** the rest are shipped and already credited. "Phone MB" uses the engine brief's rule (RGBA8 × 1.33 for mips; maps of 1024 px or more halved on phones: a 1024 or 512 map ≈ 1.4 MB, a 256 map ≈ 0.35 MB). Every new download goes through the provenance gate first (reverse-image search, storefront check, the licence re-read on the download page and saved beside the source in /tmp/claude-0/sf/act6).

### Creatures (group `act6`, tools/creatures/act6/*.mjs, `ACT_FILES.act6`)
| role | asset | uid | author | licence | faces → game | maps | phone MB |
|---|---|---|---|---|---|---|---|
| Charybdis (boss) and the Siphon | Pistosaur Animated (pistosaur.glb) | 773667575a264c7baa4ec404115a044b | RickStikkelorum (ricksticky) | CC-BY 4.0 | 16.7k → 9k | 1024 d, 512 n | 2.8 |
| Rime-hanger | Scorpion | 4c0fd62d33ab4d2592ee0a1d985a480d | anthonyvanoo | CC-BY 4.0 | 7.3k (5 clips) | 512 d, 256 n | 1.8 |
| No One (boss) | Cloaked Figure (shipped skotos.glb) | f4e2c262ed4e456484f232d6afa99629 | MysteryPancake | CC-BY 4.0 | shipped (13.4k, 14 clips) | shipped | 0 (in act5's group; on a cold start 1.4) |
| No One's arms in phase 3 | Tentacle (rigged) (shipped tentacle.glb) | 8fcc783af94246a0b8febf424a4b96b9 | CG Daniel Glebinski | CC-BY 4.0 | shipped | code material | 0 |
| Lightdrinker | code-built jelly | | made for Skotos | | ~1k | none | 0 |
| Icemaw, Hull-louse (reused) | shipped (act5) | 3f4a2090598b4741ac38e0d255ece191; 3979c291d1f9454c90851efe291eab60 | Grace Belt; ffish.asia / floraZia.com | CC-BY 4.0; CC0 1.0 | shipped | shipped | 0 |
| tier Guardians (reused) | the Barrow Lord, the Weaver (spider.glb), the troll | shipped | as credited | as credited | shipped | shipped | 0 |
| *fallback* Charybdis | Pliosaur | d90f30fd8ae9488ba8186a4572c9cf4f | Spinnee | CC-BY 4.0 | 13.2k (no clips) | 1024 d | 1.4 |
| *fallback* Rime-hanger | Pseudoscorpion | 60a474f1f87040f38e073f87a63b7548 | .hapto GmbH | CC-BY 4.0 | 51k → 4k (2 clips) | 512 d | 1.4 |
| *fallback* No One | Stelae knight | 0a795ae613f2496e955974ca37bf1e94 | Muru (muru) | CC-BY 4.0 | 20.1k (1 clip) | 1024 d, 512 n | 2.8 |

**Totals (new):** about 0.9 MB raw; **4.6 MB phone.** `ACT_FILES.act6` = pistosaur, hanger (and act5's skotos, tentacle, icemaw and louse, which loadFile's cache keeps once loaded).

### People (set `pale`, folk.mjs --set=pale; Quaternius Universal Base Characters and Modular Outfits, CC0, already shipped in people.glb and moves.bin; no download)
| recipe | source scene | table | maps | role |
|---|---|---|---|---|
| nameless | villager1 | GAUNT | 256 | enemy; three runtime tints |
| forgetter | wayfarer | TALL (new) | 256 | enemy |

**Two scenes; gated at 12 measured textures or fewer** (the shipped sets measure 5-7 a scene; Act V's frost set was gated at 25 for seven). Under 50k triangles; about 0.5 MB raw; **about 3.5-4.2 MB phone.** Every NPC and figure of the act is a shipped scene (npcs).

### Props (pack `seabed`, tools/pack-seabed.mjs; ≤ 30k new triangles)
| prop | asset | uid / id | author | licence | faces → game | maps | phone MB |
|---|---|---|---|---|---|---|---|
| keels, Great Keels, ice pillars, ice-falls | code (ice material) | | made for Skotos | | code | rime's `ice` layer | 0 |
| icicle curtains | Icicle 01 (shipped in rime) | 2dc75ae22f1c4d11abbfd32819312a12 | Elin Hohler | CC-BY 4.0 | shipped | ice material | 0 |
| kelp heaps | Scan of Kelp and Seaweed (shipped in rime) | c9b5ef07047a4b7a90a4ffd6930ec22c | sterlingcrispin | CC-BY 4.0 | shipped | shipped | 0 |
| whale ribs | Skeleton - North Atlantic Right Whale (shipped in rime) | 5c8664c56f9a4cf3ae6d9b8ec33b8dba | Ingenium Canada | CC-BY 4.0 | shipped | shipped | 0 |
| wrecks | the Dalarö hull, Gislinge boats, rowboats (shipped in rime) | 027900c8fdf840f589cadb9f4a60d78c; 01098ad7973647a9b558f41d2ebc5193; 9922d5678af84adeb1c9b479856446ca | the Swedish National Maritime and Transport History Museums; Opus Poly; TooManyDemons | CC-BY 4.0 | shipped | shipped | 0 |
| the drowned Landing's huts | Wooden Shack (shipped in rime) + code stilt huts | b0bc474f7803488dbe0fa5aeef2e9ace | Dominic Baker (Domuk) | CC-BY 4.0 | shipped | shipped | 0 |
| the First's hearth-stone | Monumental Runic Stone (shipped in rime) + a code hearth ring | d95a850cd9114828a18b5dd72878d9ec | Thomas Flynn | CC-BY 4.0 | shipped | shipped | 0 |
| lamps, ledge-lamps | Vintage Oil Lamp (shipped in rime) | vintage_oil_lamp | Monsta3D (Poly Haven) | CC0 1.0 | shipped | shipped | 0 |
| whale-oil casks | Wooden Barrels 01 (shipped in rime) | wooden_barrels_01 | James Ray Cock (Poly Haven) | CC0 1.0 | shipped | shipped | 0 |
| mussel beds, oil-pots, the bell-rope and stair, braziers | code | | made for Skotos | | ~6k | none | 0 |
| the tiers' dressing | the crypt, forest and Deepstone packs (shipped, Acts I-II) through the 'icy:' material | shipped | as credited | as credited | shipped | none new | 0 |

**Totals:** about 0 MB raw new beyond code; the pack holds references to rime's and the older packs' shipped files.

### Ground layers (pack `seabed`)
| layer | source | author | licence | use |
|---|---|---|---|---|
| shore (reused) | low_tide_rocks (rime) | Dimitrios Savva (Poly Haven) | CC0 1.0 | the seabed |
| ice (reused) | Ice002 (rime) | ambientCG | CC0 1.0 | the ice walls, keels, the Bed's ice |
| snowTrod (reused) | snow_03 (rime) | Rob Tuytel (Poly Haven) | CC0 1.0 | the painted way's normal |
| **mud (new)** | a Poly Haven CC0 mud or tidal-flat texture (candidates: "brown_mud_02", "mud_forest"; or ambientCG's nearest "Ground" set), the id confirmed through the API at the provenance gate | its author | CC0 1.0 | the Mussel Flats |

**Totals:** about 0.5 MB raw new; **2.8 MB phone** (one layer, d 1024 / n 512).

### Totals for the act
| | raw (new) | phone GPU (new) |
|---|---|---|
| creatures | 0.9 MB | 4.6 MB |
| people (2 scenes, ≤ 12 textures) | 0.5 MB | 3.5-4.2 MB |
| props | code only | 0 |
| layers | 0.5 MB | 2.8 MB |
| code textures (the jelly, G_CAUST uses Act V's noise) | | 0.1 MB |
| **total** | **about 1.9 MB** | **about 11-12 MB** |

Against the act budget of ≤ 9 MB raw and ≤ 110 MB phone GPU (Act V's), Act VI uses about a fifth of the raw and a tenth of the GPU, because it is built from systems and shipped scans. A cold start at the `farlight` waypoint (Act V's act5 group, frost set and rime pack, about 70 MB, plus Act VI's 12) stays far under the tab ceiling; a full run of Acts I-VI near 680 MB on a phone, against ~1 GB.

## Asset audit
- charybdis / siphon 773667575a264c7baa4ec404115a044b ok=gated lic=CC Attribution 4.0 faces=16700 anims=1: scouted 'ok' in Act V's brief (the best sea serpent; rigged, swim clip). Gate: reverse-image and storefront checks before download. | REPLACEMENT: Spinnee's Pliosaur d90f30fd8ae9488ba8186a4572c9cf4f (CC-BY 4.0), then the Icemaw stand-in.
- rimeHanger 4c0fd62d33ab4d2592ee0a1d985a480d ok=gated lic=CC Attribution 4.0 faces=7300 anims=5: scouted 'ok' in Act V's brief (own work for the author's game). Gate as above. | REPLACEMENT: .hapto Pseudoscorpion 60a474f1f87040f38e073f87a63b7548 (CC-BY 4.0), then the spider stand-in.
- kaneis f4e2c262ed4e456484f232d6afa99629 ok=True lic=CC Attribution 4.0: shipped and credited (the Skotos). Look gate against the Skotos in the creature viewer. | REPLACEMENT: Muru's Stelae knight 0a795ae613f2496e955974ca37bf1e94 (CC-BY 4.0, rig to be checked), then the troll stand-in.
- lightdrinker: code-built, no third-party asset. Rejected: 'Glass octopus' (uploader provenance, as in Act V), 'Archea' (cel style).
- nameless / forgetter: people re-proportions of shipped CC0 scenes; no player class's body ('warden', 'ranger', 'mage' are never used for enemies); no masks.
- mud layer: CC0, id confirmed at the gate.
- **Everything else is shipped and already credited** (Act V's audit).

## The owner's decisions this proposal needs
1. **The First's name: «Φαρώ» / "Pharo"**, the twist that φάρος is her name. (An alternative that keeps a twist: a name the Saltborn say in the rite without knowing, such as the creed's own «Φως», but «Φαρώ» is the one built from the act before.)
2. **"No One" as the villain's name** (Κανείς, the Odyssey's Οὖτις), and No One as the true Gate Guardian.
3. **The Forgetter's skill-silencing** (5 s, one skill): in, or the fallback slow.
4. **The Drowned tiers in the Shadow Gates** in the base, or a later update.
5. **The 13th Mastery track, Lamplight.**
6. **Guests' mechanic interacts in co-op** (lamps, braziers, oil-pots, naming Faces, the hearth; and Act V's cairns and hole lamps with them).
7. **Charybdis's name** (Homer's, public domain) or a coined Saltborn name (for example «Η Μαύρη Ανάσα» / "the Black Breath", which collides with Act V's hole move; «Ρουφήχτρα» collides with the Warden's Maelstrom variant).
