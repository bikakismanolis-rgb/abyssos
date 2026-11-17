# Act VII: The Unsleeping (proposal, story-first)

«Πράξη VII: Η Ακοίμητη» / "Act VII: The Unsleeping". Latin V and I, as canon §5.6 sets for IV, V and VI. One of three competing proposals; this one is written from the story outward.

Act VII begins from a save at quest 39 (`act6`, `h.act6 >= 0`): the First is named, her fire burns at the bottom of the Gates, the Skotos is asleep, the seven peaks burn, and the title screen reads «Ακόμα και το σκοτάδι κοιμάται» / "Even the dark sleeps" (game.sub6). The act's last shipped line is d.answer6.3 «Ο Βορράς κοιμάται με τα φώτα αναμμένα.» / "The North sleeps with the lights on."

What I read for this: `docs/act5-briefs/canon.md` (all), `docs/act6-design.md` (summary, Decisions, all of Story, Bosses, Difficulty, Co-op, Progression, Blessings, Music, Echoes, "does not do", Critic pass), `docs/act5-design.md` (summary, premise, villain, twist, ending), `docs/act5-briefs/engine.md` (all), `docs/act6-briefs/reports/balance-report.md` (all), the first 150 lines of `docs/act6-briefs/proposal-story.md`, and `src/i18n/text.js` by grep for every key quoted below. Where I could not verify something it is marked **(not verified)**.

**The act in one paragraph.** It is the first clear morning anyone in Whitecliff remembers: the winter is over, the mountain's smoke is gone, and the sky is blue. The hero has not slept for three nights. Seven peaks burn and one village keeps them, and the beacon-keeper still gets up to look at a fire that everyone knows is burning. A village boy says «Κοίτα νότια.» / "Look south.", and over the plain there is a smoke that walks. A girl with scorched sleeves falls at the south gate: Signe, of the Order of the Flame, the school the Mage hero once studied at. The night the Skotos fell asleep, the Order remembered the road north, and it is coming up that road in procession carrying its flame, «η Ακοίμητη» / "the Unsleeping", which has not been allowed to go out for a thousand years. Master Ragna, who has not slept a whole night in forty years, means to stand it on the sea ice over the sleeping dark and burn there for ever, because «ό,τι κοιμάται, ξυπνά» / "what sleeps, wakes". But a fire that is never allowed to sleep does not know how to stop: the spring grass is dry, the wind is from the south, and in three days it will be in the Evergreen's wood; and a fire standing on the ice will melt the dark's blanket and wake it. Halda, a smith, knows the answer every smith knows: you do not keep a fire awake, you bank it under its own ash and wake it in the morning. She fits the Ember Cradle with a lid. The hero walks south against the fire, wakes the three fires Signe banked in secret on her run north, and reads in their embers how the Order began: a girl carrying the last pot of coals out of a burning North who was too afraid to bank it, because «Είναι η τελευταία» / "It is the last one", the same thing the hero was told on the first night of the game (intro.5). The hero unyokes the fire-bull that clears the Procession's road, enters a house built without windows so that no wind and no daylight reach the flame, puts its feeder fires to sleep, and fights Ragna until she does the one thing she has refused for forty years: she falls asleep. The hero banks the Unsleeping. In the morning it is woken, and for the first time in a thousand years it trembles. The Order, which has hands and no peaks, goes home with the North, which has seven peaks and few hands, to keep them in turns. That night the Saltborn, who "only answer fires that can go out" (d.alk.a3), answer the Order for the first time. A child asks the hero's name, and the player answers. Then the hero sleeps while someone else keeps the light, and the act's last line is the game's first: «Ώστε ξύπνησες.» / "So you're awake." (d.isarn.1)

**The act in one idea: a fire has to sleep too.** Act VI ended the lonely watch and put the dark to sleep. Act VII asks what comes the morning after, and answers with the oldest household fact about fire: nobody keeps a hearth awake all night; they bank it. The game's enemy for four acts was called Ash. Here ash is the blanket that keeps a coal alive until morning.

**The look in one idea: day, and the safe place is black.** For six acts the game drew a pool of light in the dark. Act VII is the first act in daylight, and it draws the opposite: a pool of black in a field of gold. Burnt ground cannot burn twice, so the black patch is where you stand. The second zone turns it round again: a house with its shutters nailed up, an artificial night that people built around a flame so they could watch it never go out.

**Scope** (the frame of Acts V and VI):
- **2 zones**, one new generator `src/world/gen7.js`:
  - `tinder`, «Ο Ξερόκαμπος» / "The Tindergrass", level 40: the old South Road across a plain of last year's dry grass, in daylight. Two readings: `gold` during the act, `green` after it.
  - `vigil`, «Ο Οίκος της Αγρύπνιας» / "The Vigil House", level 43: the Order's first school, a windowless hall on the road. Two readings: `shut` before the Unsleeping is banked, `open` after.
  - Levels keep the +3 cadence (37 → 40 → 43); monsters track the hero, who arrives at 50 with Mastery.
- **7 regular enemy entries (8 kinds)**, six of them on models already in the build:
  - on boot-loaded models: the Wakeful Brand-bearer and Sparkcaster (people.glb `mage`, the Order's own robes), the Waker (same body, a handbell, the shipped `forger` AI), the Cinderling (the Ashspawn at ×0.55), the Singe-wolf (the wolf), the Sleepless (the wight);
  - on a shipped Act V file: the Firehawk (the Skua);
  - on the act's one download: the Yoke-ox (the first boss's bull at ×0.6; no-download fallback the shipped elk).
- **2 bosses:** «Αίθων, ο Ταύρος της Πομπής» / "Aithon, the Bull of the Procession" (the one new creature download; fallback the shipped elk, regraded) and «Ράγκνα η Άγρυπνη» / "Ragna the Wakeful" (people.glb `healer`, runtime regrade, no download). Both designed for 2.5-3.5 minutes with few, large, dodgeable blows. Neither dies: the bull lies down and sleeps, and so does Ragna.
- **Quests 40 to 46;** the new end state is **47**.
- **3 mechanics**, each an existing system with one new input:
  - the Burn (Το Κάψιμο): tide.js's stepped, lane-safe cell closing, driven by wind over fuel instead of water over a bed; burnt ground is safe, and the hero can back-burn from the Cradle;
  - Bank and Wake (Σκέπασε, Ξύπνα): light.js's lamps gain a third state, banked;
  - Sleep (Ο Ύπνος): the shipped remains-and-reforge rule (Act IV's Ashsmith) with the fallen asleep instead of dead, and, at the level cap, Mastery experience with one new input, the time the hero has been away ("Rested").
- **A world-state chain:** `morn7` → `lid7` → `tinderSeen` → `wake7_1..3` → `aithonDown` → `vigilSeen` → `bank7_0..2` → `ragnaDown` → `banked7` → `woke7` → `sleep7` → `act7`. Optional: the Seven Good Nights → `gnAll`.
- **Also:** seven optional Good Nights (one for each living keeper in the game), three blessings, two echoes, two first-kill legendaries, four themes and one variant, a second use for the Lamplight Mastery track, and the Rested bonus as the reason to come back at the cap.
- **Budget (estimates, not measured):** about 0.7-1.9 MB raw of new files and about 14-28 MB of new phone texture. Everything else is boot-loaded or shipped. A cold start into Act VII should be well under half the 110 MB bar, because the act's people and five of its eight kinds are already resident at boot.
- **Cost:** about 47-58 focused days, about Act VI's 47-59, with a cut order that brings it to about 39-50 (Cost and cut order).

---

## 1. Which threads this pays off, and why it is the right next story

### 1.1 What is still unpaid in the shipped game
I went through text.js looking for promises the game has made and not kept. These are the ones Act VII uses, each with its key:

| thread | shipped line (key) | what Act VII does with it |
|---|---|---|
| **The hero was told on night one that everything rests on them** | intro.5 «Είσαι ο φρυκτωρός του Λευκόβραχου. Η δική σου φωτιά είναι η τελευταία.» / "You keep the beacon of Whitecliff. Yours is the last fire." | The act's spine. "It is the last one" is the exact thought that made the Order's vigil (Ember Memory 2). The ending answers it: «Η δική σου φωτιά δεν είναι η τελευταία. Απόψε δεν είναι καν δική σου.» / "Yours is not the last fire. Tonight it is not even yours." |
| **The hero has been told to rest three times and never has** | d.staff «Ξεκουράσου.»; boon.rest.q «...κι η πρώτη σου νύχτα χωρίς βάρδια»; d.selna.rest «Τώρα ξεκουράσου, φρυκτωρέ. Απόψε η βάρδια είναι δική μου.»; d.first.7 «Η ανάπαυση είναι να κοιμάσαι κι άλλος να κρατά το φως.» | The last quest of the act is q.46 «Γύρνα στον Λευκόβραχο και κοιμήσου» / "Go home to Whitecliff, and sleep". The definition Pherousa gave in Act VI is finally carried out, on screen. |
| **The game's first spoken line** | d.isarn.1 «Ώστε ξύπνησες. Καλά. Δεν μας μένουν πολλά βράδια για αναμονή.» / "So you're awake. Good. We don't have many nights left for waiting." | The act's last line, in a child's mouth, the morning after the hero's first sleep: «Ώστε ξύπνησες.» After the act it greets a player who comes back rested. |
| **The Order of the Flame, named once and never seen** | class.mage.d «Μαθητής του Τάγματος της Φλόγας.»; d.alk.a5.m «...Κάποτε οι δικοί σου ανέβαιναν ως εμάς να μάθουν πώς κρατιέται μια φλόγα ζωντανή μέσα στο χιόνι. Μετά ξέχασαν τον δρόμο.»; d.first.1.m «Και η φλόγα σου έμαθε κάποτε από τη δική μου. Το Τάγμα σου το θυμάται ακόμα;» | The Order arrives. It learnt flame-keeping from the Saltborn and forgot the first half of the lesson. Pherousa's question gets its answer: no; and at the end, yes. |
| **Asger's errand** | d.asger.2 «Πες στο Τάγμα πως ο δρόμος για τον βορρά υπάρχει ακόμα. Τον ξέχασαν. Δεν χάθηκε.» (+ .m «Πες στους δασκάλους σου...») | The message is delivered at the hook, by narration, if the hero freed him (`asgerRest`). The Order's rolls have him as "lost in the north". |
| **The Saltborn's rule about fire** | d.alk.a3 «Απαντάμε μόνο σε φωτιές που μπορούν να σβήσουν.»; d.first.1 «Φωτιά που τρέμει... Εκείνο δεν φτιάχνει φωτιές που σβήνουν.» | The act's law. A flame that has not been allowed to go out for a thousand years has stopped trembling. When it trembles again, the Farthest Light answers the Order for the first time. |
| **The smith's sky** | d.halda.stars «Πρώτη φορά στη ζωή μου βλέπω αστέρια...»; d.halda.aur «Πρώτα τ' αστέρια. Τώρα ανάβει κι ο ίδιος ο ουρανός. Στη Βαθύπετρα δεν θα με πιστέψει κανείς.»; d.halda6.v2 | Stars, the aurora, and now the sun. Halda is the act's teacher: banking a fire is a smith's knowledge. After the act she finally walks up to Deepstone to tell Brokka. |
| **The Cradle's promise** | d.brokka.c3 «Θα την κρατήσει ως το τέλος του δρόμου.»; d.halda.cradle «Της έφτιαξα το χερούλι.» | Halda makes the Cradle its last part, a lid. "A fire that sleeps travels farther." |
| **Too many fires, too few hands** | d.peaks.2 «Εφτά φωτιές. Τις ανάβουν χέρια που ξέρεις.»; d.leif.bark «Ξύλα για όλες τις κορυφές. Δουλειά έχουμε.» | The practical consequence of Act VI's ending. One village cannot keep seven peaks and sleep. The Order has hands and no peaks. |
| **The boy who promised to remember** | d.child.3 «Θα το θυμάμαι.»; d.child.bark6; d.elianthe.name «Ο μικρός...» | He has never had a name. He gets one, and he asks for the hero's. |
| **The hero's name, which the game has never printed** | d.tern.again «Τα ξέρω ήδη όλα. Και το δικό σου.» / "I know them all already. Yours too." | The player gives it, once, to a child. It is the only time in the game the hero "speaks", and it is the player who does it (owner question 2). |
| **Isarn's lantern fell asleep** | d.answer.0 «...κι η φλόγα του φαναριού σβήνει ήσυχα, σαν να αποκοιμιέται.» / "...the lantern's flame goes out quietly, as if falling asleep." | A fire that fell asleep can be woken. At the end the hero wakes it and hangs it on the staff, where no one has to carry it. Isarn stays dead. |
| **The birds** | d.elianthe.1 «...και τα πουλιά δεν τραγουδούν.»; d.autumn.w «Κάπου μακριά, ένα πουλί.» | A spring morning: Elianthe counts them. |
| **The wind that carries smoke** | boon.north.q «Ο άνεμος που πάει τον καπνό από φρυκτωρία σε φρυκτωρία.» | By day a beacon speaks in smoke. The hook is a smoke on the southern horizon, and the wind is the Burn's one input. |
| **Remembering as a cage** | altar.sub «κάθε δώρο έχει το κλουβί του»; d.lamp.m2.2 «Δεν θα το αφήσουμε ποτέ από τα μάτια μας.»; d.lamp.m5.2 «Μη με αφήσεις μόνο μαζί του.» | The Order's vow is the same cage with no shard in it: a watch nobody is allowed to put down. Ragna was given it at ten, as Isarn was. |

### 1.2 Why this spine and not another
The brief lists a dozen candidate threads. I weighed four spines and chose one.
- **The far South and its ports** (the Sailor's port, d.sailor.0). A whole new land needs a new people, a new look and more than two zones. It is the right Act VIII, and this act opens the road to it without walking it.
- **The peoples coming home** (Dain, the Stoneborn who left Deepstone, the nursery children). Warm, but it has no opponent and would become a tour of reunions: a grab-bag.
- **The hero's origin.** Three classes have three different pasts (canon §2.2), so an origin act is three stories. Act VII gives each class one or two lines of past, inside the one story, and no more.
- **What the world does with a sleeping Skotos, and what rest means for the hero.** These two are the same question, and they are the one the shipped ending raises. If the dark only sleeps, somebody will want to kill it in its sleep; and if the watch is shared, the watcher has to learn to close their eyes. One antagonist answers both wrongly (never sleep, and never let the fire sleep), and the hero, who has the same habit, has to answer both rightly.

So the act is **one thing: a fire that is not allowed to sleep, the woman who keeps it, and a hero who cannot sleep either.** The Order, Asger, Halda's sky, the seven peaks' hands, the child's name and Isarn's lantern are all on that one line.

### 1.3 What the act leaves alone, on purpose
- The Skotos has **no line and no scene** in Act VII. It is asleep, and the act's stake is that it stays so. There is no third fight with it.
- No line says "Karthax". The memories say «η φωτιά του τυράννου» / "the tyrant's fire", as the Saltborn say "your tyrant" (act5-design, villain).
- Isarn does not return. His lantern is woken; he is not.
- No keeper stays alone by a fire at the end. The act is an argument against exactly that.
- The Shadow Gates play as they do. The act does not touch them.
- Dain, the Stoneborn clans, the Sailor's port, Arna's people and Elianthe's origin stay open (Act VIII material).

---

## 2. Story

### 2.1 Premise
**At quest 39.** The North is at peace and overworked.
- Seven peaks burn every night (d.peaks.1-2), plus Whitecliff's beacon, and they are kept by one village: Halda, Leif and his father, the villagers. Leif cuts «Ξύλα για όλες τις κορυφές» (d.leif.bark).
- Selna says the names every night at the Farthest Light. Alkyone sleeps now (d.alk.after6). Glaukos climbs the rope every evening because he has «ονόματα να πω» (d.glaukos.again6).
- The hero has been told to rest by Isarn, by Selna and by Pherousa, and has not. The hook says so in one line of narration.

**Who the Order of the Flame is.** New canon, built only on the three shipped mentions (class.mage.d, d.alk.a5.m, d.first.1.m and Asger's lines):
- **Before the war** it was a school of fire in the North, on the road south of Whitecliff. Its students climbed to the Saltborn «να μάθουν πώς κρατιέται μια φλόγα ζωντανή μέσα στο χιόνι» (d.alk.a5.m). So the Order's flame "learnt from" Pherousa's, through the Saltborn (d.first.1.m). The first thing the Saltborn taught was plain: bank it at night, wake it in the morning.
- **When the North burned** (intro.1) the school burned first. One girl walked south through the ash with a pot of coals. The first night she had to bank them, and could not: «Κι αν δεν ξυπνήσει; Είναι η τελευταία.» / "And if it does not wake? It is the last one." She stayed awake. That was the first night of the Vigil («η Αγρύπνια»).
- **For a thousand years** the Order kept its flame awake in a house in the south, built without windows so no wind could reach it. A fire kept awake has to be fed without pause, and the woods round the House thinned year by year. In time the flame stopped trembling and stood white and still. The masters called that a blessing. The first lesson was struck from the books.
- **They forgot the road north** (d.alk.a5.m, d.asger.2). The Skotos lay over the sea and what it covered the world forgot (d.alk.b4); the pass was shut by smoke (d.alk.b2); and a school that teaches "there is no north" is easier to keep awake. Asger went looking anyway, and went "too far down" (d.asger.1).
- **The night the Skotos fell asleep** (d.sink6), the forgetting let go, as it did in Whitecliff (act6-design, "the forgetting undone"). Every master of the Order woke with one word: north.

**What the Order wants.** It is not a conqueror and has no wish-magic (canon §4 rule 5). It wants to do its duty. Master Ragna's reasoning is clear and half right: the dark is asleep, sleeping things wake, and her Order has the one fire that never sleeps. She will carry it home, past Whitecliff, over the Anvil's Neck, and stand it on the sea ice above the dark, to burn there for ever.

**What is wrong with that.** Three things, each of which the player sees rather than hears:
1. **The fire cannot stop.** It has never been banked, so nobody in the Order knows how to make it small. The Procession clears its road by burning it. The grass is last year's, dry after the halcyon winter, and the spring wind is from the south.
2. **The ice is the dark's blanket.** «Η θάλασσα από κάτω πήζει σε πάγο» (d.deep.m1.1): the sea froze over it. A fire that never goes out, standing on that ice, melts it. Ragna would wake the thing she means to guard against.
3. **It is the lonely watch again, with a crowd.** A whole house awake is not a shared watch. Nobody in the Order sleeps a full night, and their dead do not either (the Sleepless, Enemies).

**Why the hero is the right person and also the wrong one.** The hero put the dark to sleep and knows what a fire that can go out is worth. But the hero has not slept for three nights, and gets up to look at a fire that is burning. Ragna sees it at once: «Σε είκοσι χρόνια θα στέκεσαι εδώ που στέκομαι.» / "In twenty years you will stand where I stand."

### 2.2 The antagonist
**Ράγκνα η Άγρυπνη / Ragna the Wakeful**, Master of the Order of the Flame. The epithet has Amaranthe's form («Αμαράνθη η Αμάραντη», no comma) on purpose: both are held by "nothing must be lost". Tagline mon.ragna.t «Σαράντα χρόνια δεν έκλεισε μάτι» / "Forty years without closing her eyes".
- **Who she is.** Fifty years old, and she looks seventy. Keepers of the lantern aged slowly (d.isarn.e2); people who do not sleep age fast. She was given the Vigil at ten by an old master who then lay down and slept for the first time (Ember Memory 5, the mirror of d.lamp.m5.1-4). She sleeps as sentries do, standing, in moments, and is woken by a handbell.
- **What she wants.** That the dark never wake in her grandchildren's time. Her best line is her answer to the charge that she will wake it herself: «Τότε ας ξυπνήσει μπροστά μου, κι όχι μπροστά στα εγγόνια μου.» / "Then let it wake in front of me, and not in front of my grandchildren."
- **Why she is a strong antagonist.** She is the hero in forty years, and she is the game's last lone keeper: Arna, Ivar, Isarn at ten, the Lampless, Pherousa, and now a woman surrounded by people who is still alone with a fire. She is also right that the dark will not sleep for ever. The act does not prove her wrong about that. It answers her: «Τότε θα μας βρει ξεκούραστους.» / "Then it will find us rested."
- **Her voice.** Grand register, no contractions in English (canon §5.3), a teacher's patience, short sentences. One line in capitals in phase 3, and it is spoken to herself.
- **What she never does.** She grants no wish, names no tyrant, serves no dark, and is not killed. She is beaten, and she falls asleep.
- **Never alone.** She is never shown alone with the flame. Adepts, bell-ringers and students surround her in every scene. That is the point, and it also keeps the image away from the pattern canon §4 warns about (Risks).

**The force.** «Η Ακοίμητη» / "the Unsleeping": the Order's flame. It is fire, not a creature and not a will. It has no lines. It is drawn white and dead still, the way Act VI drew false light, because a flame that has had no wind and no night for a thousand years does not tremble. It is not evil; it is overtired, like everyone who keeps it. The word is everyday Greek for a lamp that is never let go out, which keeps it far from other games' vocabulary.

**The Order's people** are «οι Άγρυπνοι» / "the Wakeful" (living adepts) and, in the House, «οι Άυπνοι» / "the Sleepless" (its dead keepers, who never slept in life and cannot now). They attack the hero for a reason that is almost kind: they see a banked coal in the Cradle and think it is dying. Their bark: «Σκεπασμένη φωτιά! Ξυπνήστε την!» / "A banked fire! Wake it!"

**Nobody the hero beats in this act dies.** The Wakeful fall asleep where they stand (Mechanics: Sleep). The bull lies down. Ragna sleeps. Only the Cinderlings go out, and they are fire; the wolves and hawks are beasts and are killed as beasts are.

### 2.3 The twist, in three blows
Each lands in one line, at a different point in the act, and each is built from a shipped line.

**1. "It is the last one" (q41, Ember Memory 2).**
- intro.5 «Η δική σου φωτιά είναι η τελευταία.» / "Yours is the last fire."
- The girl with the pot of coals, her hand stopped over the ash: «Κι αν δεν ξυπνήσει; Είναι η τελευταία.» / "And if it does not wake? It is the last one."
- The memory closes on a line of narration to the player: «Κάποτε σου είπαν κι εσένα: η δική σου φωτιά είναι η τελευταία.» / "You were told it once too: yours is the last fire."
- The sentence that began the game is the sentence that made the Vigil. Nobody lied to the hero. On that night it was true. Believing it for ever is the cage.

**2. The first lesson was the Saltborn's, and the Order threw away half of it (q41, Ember Memory 1 and 3).**
- d.alk.a5.m: the Order climbed to the Saltborn to learn how a flame is kept alive in the snow.
- Ember Memory 1, a Saltborn keeper: «Το βράδυ τη σκεπάζεις. Το πρωί την ξυπνάς. Φωτιά που δεν κοιμάται ποτέ, τρελαίνεται.» / "At night you bank it. In the morning you wake it. A fire that never sleeps goes mad."
- Ember Memory 3: «Μια μέρα η φλόγα παύει να τρέμει.» A master: «Ευλογία. Δεν φοβάται πια.» / "A blessing. It is no longer afraid."
- So d.alk.a3 «Απαντάμε μόνο σε φωτιές που μπορούν να σβήσουν.» explains a thousand years of silence between two peoples who once taught each other.

**3. The girl of ten (q43-q44, Ember Memory 5, before the fight).**
- d.lamp.m5.1-3: a man kneels before a boy of ten; «Μη με αφήσεις μόνο μαζί του.» / «Δεν θα είσαι ποτέ μόνος. Το υπόσχομαι.»
- Ember Memory 5: an old master kneels before a girl of ten. «Μη μ' αφήσεις να κοιμηθώ.» / "Don't let me fall asleep." «Δεν θα σ' αφήσει κανείς. Το υπόσχομαι.» / "No one will let you. I promise."
- Isarn's promise was broken and Ragna's was kept, and the kept one is worse.

**The quiet beat: it burned without her (hook, and Ember Memory 4).** Signe fell asleep on her watch for an hour. When she woke, the flame was burning as before. «Κανείς μας δεν το είχε δοκιμάσει ποτέ.» / "None of us had ever tried." The whole Vigil rests on a thing nobody tested. The child says the same to the hero in the hook, in a child's words: «Η Χάλντα λέει πως η φωτιά καίει κι όταν δεν την κοιτάς.»

**Nothing is retconned.**
- intro.5 stays true as said, on the night it was said.
- Every φρυκτωρία was still the brow-stone's fire (d.isarn.e1). The Unsleeping is neither a beacon nor a sea-light; it is «η φλόγα του Τάγματος» / "the Order's flame", and it descends from the sea-lights, as d.first.1.m already says of the Mage's flame.
- d.alk.a5.m and d.asger.2 stand: the Order forgot the road, and now remembers it.
- No line links the Order to the crown. "Embers that never die" (intro.1) and a flame never allowed to die rhyme, and the act lets them, without a word of explanation. Karthax did not learn from the Order, and the Order did not serve him: the school was the first thing his fire burned.
- The Mage is still «Μαθητής του Τάγματος της Φλόγας». New: he left it one night to look for a north his masters said did not exist (owner question 5).
- The Skotos is still asleep at the end, exactly as Act VI left it.

**Old lines that read differently afterwards** (no line changes):
- intro.5: what every lone keeper believes.
- d.isarn.1 «Ώστε ξύπνησες.»: the kindest thing anyone can say to a keeper.
- d.kingDie «Κρύο... επιτέλους... κρύο...» and d.forge.cold: fires that were not allowed to go out, going out.
- d.elati.aut3 «Θα γεράσουμε, όσοι μείναμε. Επιτέλους.»: the wood that was not allowed to change; Ragna says so to the Ranger.
- d.answer.0 "as if falling asleep": it was asleep.
- game.sub6 «Ακόμα και το σκοτάδι κοιμάται» → game.sub7 «Και η φωτιά κοιμάται» / "The fire sleeps too".
- diff.ash.d «Η τέφρα θυμάται κάθε λάθος.»: ash also keeps a coal alive.

### 2.4 The ending
**Ragna sleeps** (end of q44; flag `ragnaDown` saved first):
- d.ragna.die1 «...μόνο... ώσπου να ξεκουράσω... λίγο τα μάτια μου...» / "...only... until I rest... my eyes a little..."
- Signe: d.ragna.die2 «Κοιμήσου, Δασκάλα. Αν τρεμοπαίξει, σε ξυπνάω.» / "Sleep, Master. If it gutters, I'll wake you."
- Narration d.ragna.die3 «Κοιμάται όρθια, όπως έμαθε. Η Σίγκνε την ξαπλώνει στο πάτωμα.» / "She sleeps standing, as she learnt to. Signe lays her down on the floor."
- No bell rings. The Wakers in the hall are asleep or gone.

**The banking** (q45, interact «Σκέπασε την Ακοίμητη» / "Bank the Unsleeping", a 3 s channel with no attackers; flag `banked7` saved first; cine at pitch 0.35):
- d.bank7.1 «Σκεπάζεις την Ακοίμητη με τη στάχτη της, χούφτα τη χούφτα. Η άσπρη φλόγα χαμηλώνει. Ο Οίκος σκοτεινιάζει για πρώτη φορά.» / "You bank the Unsleeping under its own ash, handful by handful. The white flame sinks. The House goes dark for the first time."
- An adept: d.adept.1 «Έσβησε! Χίλια χρόνια, κι έσβησε στη δική μας βάρδια!» / "It's out! A thousand years, and it went out on our watch!"
- Signe: d.signe.e1 «Δεν έσβησε. Κοιμάται. Βάλε το χέρι σου πάνω από τη στάχτη.» / "It isn't out. It's asleep. Hold your hand over the ash."
- d.bank7.2 «Η στάχτη είναι ζεστή, σαν να ανασαίνει.» / "The ash is warm, as if breathing." (the First Shard's toast in Act I, «Είναι ζεστό, σαν να ανασαίνει.», canon §5.5, turned kind)
- d.bank7.3 «Ανοίγεις ένα παράθυρο. Έξω είναι νύχτα, με αστέρια. Κανείς εδώ μέσα δεν τα έχει δει ποτέ.» / "You open a shutter. Outside it is night, with stars. No one in here has ever seen them." (d.halda.stars)
- Big toast q.banked «Η Ακοίμητη κοιμάται» / "The Unsleeping sleeps".
- d.bank7.4 «Όλος ο Οίκος κοιμάται. Εσύ όχι. Κάθεσαι δίπλα στη στάχτη ως το πρωί. Από συνήθεια.» / "The whole House sleeps. You do not. You sit by the ash until morning. Out of habit."

**The waking** (q45b «Ξύπνα τη φωτιά το πρωί» / "Wake the fire in the morning"; interact «Ξύπνα τη φωτιά» / "Wake the fire", 1.5 s; flag `woke7` saved first):
- d.wake7.1 «Παραμερίζεις τη στάχτη και φυσάς. Ένα κάρβουνο κοκκινίζει. Ύστερα μια φλόγα, μικρή, κίτρινη. Τρέμει.» / "You part the ash and blow. A coal reddens. Then a flame, small and yellow. It trembles."
- Ragna, waking: d.ragna.w1 «...Κοιμήθηκα.» / "...I slept."
- d.ragna.w2 «Και καίει.» / "And it is burning."
- d.ragna.w3 «Τρέμει. Έτσι έτρεμε πριν γεννηθώ; Κανείς μας δεν την είδε ποτέ να τρέμει.» / "It trembles. Did it tremble so before I was born? None of us ever saw it tremble."
- Signe: d.signe.e2 «Το πρώτο μάθημα, Δασκάλα. Το βρήκαμε στον δρόμο.» / "The first lesson, Master. We found it on the road."
- d.ragna.w4 «Χίλια χρόνια την κρατούσαμε ξύπνια από φόβο. Το λέγαμε πίστη.» / "A thousand years we kept it awake out of fear. We called it faith."
- d.ragna.w5 «Και το σκοτάδι; Αν ξυπνήσει;» / "And the dark? If it wakes?"
- Signe: d.signe.e3 «Τότε θα μας βρει ξεκούραστους.» / "Then it will find us rested."
- d.ragna.w6 «...Ξεκούραστους. Δεν ξέρω καν πώς είναι.» / "...Rested. I do not even know what that is like."
- Mage only: d.ragna.w7.m «Ο μαθητής που έφυγε γύρισε με το πρώτο μάθημα. Σβήστε το «χαμένος» από τα κατάστιχα. Γράψτε «δάσκαλος».» / "The student who left has come back with the first lesson. Strike 'lost' from the rolls. Write 'master'." (class.mage.d, paid: a student no longer)
- The shutters come down all round the hall and daylight falls in. The zone's reading turns to `open`.
- d.ragna.w8 «Οι δικοί σου έχουν εφτά κορυφές και λίγα χέρια, μου λέει η μικρή. Εμείς έχουμε χέρια και καμία κορυφή. Και ξέρουμε να μένουμε ξύπνιοι.» / "Your people have seven peaks and few hands, the girl tells me. We have hands and no peak. And we know how to stay awake."
- Signe: d.signe.e4 «Με βάρδιες, Δασκάλα.» / "In turns, Master."
- d.ragna.w9 «Με βάρδιες.» / "In turns."
- setQuest(46).

**Home** (q46, on the first town entry after `woke7`; dusk; cine at pitch 0.3 on the beacon hill; `beaconScene(7, 'south')`):
- d.home7.1 «Το Τάγμα ανεβαίνει τον δρόμο με τα κάρβουνά του σκεπασμένα. Πίσω του ο κάμπος είναι μαύρος. Σε έναν μήνα θα είναι ο πιο πράσινος του Βορρά.» / "The Order comes up the road with its coals banked. Behind it the plain is black. In a month it will be the greenest in the North."
- Halda: d.halda7.h1 «Εφτά κορυφές, και πρώτη φορά περισσότεροι φύλακες από φωτιές. Απόψε κοιμάται όποιος θέλει.» / "Seven peaks, and for the first time more keepers than fires. Tonight whoever wants to sleeps."
- The camera turns north. The Farthest Light (FAR_BEACONS[3]) stops turning, faces south and flashes, slowly, the scripted pulse Act VI's hook used. d.home7.2 «Στον βορρά, ο Έσχατος Φάρος αναβοσβήνει προς τον νότο. Χίλια χρόνια οι Αλιγενείς δεν απάντησαν ποτέ στο Τάγμα. Απόψε απαντούν.» / "In the north the Farthest Light flashes toward the south. In a thousand years the Saltborn never once answered the Order. Tonight they answer." (d.alk.a3; every act ends on a fire answered by people, canon §5.1)
- The boy, by the beacon: d.child7.5 «Απόψε τη φυλάει ο Λέιφ. Κι αύριο μια κυρία με κόκκινα. Εσύ τι θα κάνεις;» / "Leif's keeping it tonight. And tomorrow a lady in red. What will you do?"
- Narration d.home7.3 «Δεν ξέρεις τι να απαντήσεις.» / "You do not know what to answer."
- d.child7.6 «Εγώ ξέρω. Θα κοιμηθείς. Κι εγώ θα σου πω καληνύχτα. Μόνο που δεν ξέρω πώς σε λένε.» / "I know. You'll sleep. And I'll say good night to you. Only I don't know your name."
- d.child7.7 «Όλοι σε λένε «φρυκτωρέ». Αυτό δεν είναι όνομα. Πώς σε λένε;» / "Everyone calls you 'beacon-keeper'. That's not a name. What is your name?"
- **The player answers** (a one-field card, name.ask «Πες του το όνομά σου» / "Tell him your name"; it may be left empty). Narration d.name7 «Του λες το όνομά σου: {0}.» / "You tell him your name: {0}." If empty: d.name7b «Του λες το όνομά σου.» / "You tell him your name."
- d.child7.8 «{0}. Θα το θυμάμαι.» / "{0}. I'll remember." (d.child.3)
- d.child7.9 «Εμένα με λένε Άρνα. Η μάνα μου λέει πως είναι παλιό όνομα.» / "I'm Arna. My mother says it's an old name." (owner question 3)
- **Isarn's lantern.** d.home7.4 «Παίρνεις ένα κάρβουνο από τη φρυκτωρία και το βάζεις στο σβηστό φανάρι του Ίσαρν. Η φλόγα ξυπνά, μικρή. Το κρεμάς στο ραβδί.» / "You take a coal from the beacon and set it in Isarn's dark lantern. The flame wakes, small. You hang it on the staff." Then d.home7.5 «Κανείς δεν θα το κουβαλήσει πια. Κρέμεται εδώ, κι όποιος περνά του ρίχνει μια ματιά.» / "No one will carry it any more. It hangs here, and whoever passes gives it a glance." (The lantern could be set down only in another keeper's hand, d.lamp.m4.2 and canon §1.6. Now it is in everyone's.)
- d.child7.10 «Καληνύχτα, {0}.» / "Good night, {0}." (empty: «Καληνύχτα, φρυκτωρέ.») (name.goodnight, Tern's word in Act VI)
- Narration d.sleep7.1 «Η δική σου φωτιά δεν είναι η τελευταία. Απόψε δεν είναι καν δική σου.» / "Yours is not the last fire. Tonight it is not even yours." (intro.5)
- Narration d.sleep7.2 «Κοιμάσαι. Κάποιος άλλος κρατά το φως.» / "You sleep. Someone else keeps the light." (d.first.7)
- Flag `sleep7` saved. **The screen goes black for four seconds.** In the black, very faint, the first three names of Selna's rite as far `say` lines, then nothing.
- The screen comes up on morning in Whitecliff (ATMOS 'townMorning'). The boy is standing by the bed-roll at the beacon. **The act's last line**, d.wake.again «Ώστε ξύπνησες.» / "So you're awake." (d.isarn.1)
- actComplete(7), then offerBoons(7):
  - «Πράξη VII — Ολοκληρώθηκε» / "Act VII — Complete";
  - act7.sub «Μια φωτιά που κοιμάται, κι ο φρυκτωρός της επίσης» / "A fire that sleeps, and its keeper too";
  - act7.next «Οι Σκιοπύλες σε περιμένουν. Κι ο δρόμος του νότου είναι ανοιχτός.» / "The Shadow Gates await. And the south road is open."
- End state q.47 «Η φωτιά κοιμάται και ξυπνά, κι εσύ το ίδιο. Οι Σκιοπύλες σε περιμένουν.» / "The fire sleeps and wakes, and so do you. The Shadow Gates await."
- Title subtitle game.sub7 «Και η φωτιά κοιμάται» / "The fire sleeps too", once any saved hero has `act7 >= 0`.

**The one line that announces a possible Act VIII without promising it.** Ragna's bark after the act, on Arna's hill: d.ragna.after «Στον νότο έμειναν άλλοι τρεις Οίκοι. Εκεί κανείς δεν ξέρει ακόμα πως επιτρέπεται να κοιμηθείς. Κάποιος θα πρέπει να τους το πει.» / "Three more Houses stayed in the south. Down there no one knows yet that sleeping is allowed. Someone will have to tell them."

### 2.5 After the act: every living named character
| who | where | state and line |
|---|---|---|
| **The hero** | Whitecliff | Has slept. Has a name on the save slot if the player gave one. Greeted on every rested return (Mechanics: Sleep). |
| **Arna, the boy** | by the beacon | d.child.bark7 «Καληνύχτα σου είπα, και ξύπνησες. Άρα πιάνει.» / "I said good night and you woke up. So it works." |
| **Halda** | her forge; once, in Deepstone | d.halda7.v2 «Το σκεπάζω κάθε βράδυ, σαράντα χρόνια. Ποτέ δεν σκέφτηκα πως ήταν σοφία. Νόμιζα πως ήταν τεμπελιά.» / "I've banked it every night for forty years. Never thought it was wisdom. Thought it was laziness." She walks up to Deepstone at last (text only; her model does not move zones). |
| **Brokka** | the Halls | d.brokka.v7 «Η Χάλντα ανέβηκε ως εδώ να μου πει πως ο ήλιος είναι στρογγυλός. Το ήξερα. Δεν της το είπα.» / "Halda climbed all the way up here to tell me the sun is round. I knew. I didn't tell her." |
| **Elianthe** | Whitecliff | d.elianthe7.v1 «Άκου. Πουλιά. Μέτρησα εφτά. Κάποτε έλεγα πως δεν τραγουδούν πια.» / "Listen. Birds. I counted seven. I used to say they didn't sing any more." (d.elianthe.1) |
| **Leif and his father** | Whitecliff | Leif: d.leif.bark7 «Τους μαθαίνω να κόβουν ξύλα για μια νύχτα. Όχι για χίλια χρόνια.» / "I'm teaching them to cut wood for one night. Not for a thousand years." His father sleeps (a Good Night). |
| **Elati** | the Lanternglade | d.elati.v7 «Λένε πως το καμένο χορτάρι βγαίνει πιο πράσινο. Οι Αειθαλείς δεν το ξέραμε. Εμείς δεν αφήναμε τίποτα να καεί. Μαθαίνουμε.» / "They say burnt grass comes up greener. We Evergreen never knew. We never let anything burn. We're learning." (+ .r «...Μαθαίνουμε, αδελφή.») |
| **Tamarisk** | the Lanternglade | Stays (d.tam6.home). d.tam7.v1 «Στον βορρά σκεπάζουν τη φωτιά με στάχτη. Εδώ με φύλλα. Το ίδιο πράγμα.» / "In the north they bank a fire with ash. Here, with leaves. Same thing." |
| **Selna** | the Farthest Light | Answered the Order. d.selna.v7 «Χίλια χρόνια δεν τους απαντήσαμε. Απόψε η φωτιά τους έτρεμε.» / "For a thousand years we did not answer them. Tonight their fire trembled." If the hero does her Good Night, Tern says the names that night. |
| **Tern** | the Farthest Light | d.tern.v7 «Σ' το 'πα πως το ήξερα τ' όνομά σου. {0}. Έτσι δεν είναι;» / "Told you I knew your name. {0}. Right?" (only with a name; d.tern.again) |
| **Alkyone** | the Landing | Unchanged: d.alk.after6. One new bark: d.alk.v7 «Κι εσύ κοιμήθηκες, μαθαίνω. Καιρός ήταν.» / "And you slept, I hear. About time." |
| **Glaukos** | the Rope camp by day | d.glaukos.v7 «Η γιαγιά μου σκέπαζε τη φωτιά κάθε βράδυ κι έλεγε καληνύχτα και σ' εκείνη.» / "My grandmother banked the fire every night and said good night to it as well." |
| **Pherousa** | her hearth | Asleep, as Act VI left her. Not seen. Mage only, a narration at her hearth after the act: d.first.v7.m «Το Τάγμα θυμήθηκε. Της το λες, κι ας κοιμάται.» / "The Order has remembered. You tell her, though she sleeps." |
| **Signe** | Whitecliff's south gate | The road's keeper and a vendor. d.signe.again «Πάρε ό,τι χρειάζεσαι. Κοιμάμαι οχτώ ώρες τώρα. Είναι σαν να κλέβω.» / "Take what you need. I sleep eight hours now. It feels like stealing." |
| **Ragna** | Arna's hill, by day | Keeps the day watch and sleeps at night. d.ragna.again «Κοιμάμαι. Το συνιστώ.» / "I sleep. I recommend it." And the Act VIII line above. |
| **Aithon** | the green Tindergrass | Unyoked, grazing by the Dry Brook. The echo's spot. |
| **The Wakeful** | the seven peaks | Keepers in turns. Their barks in the Tindergrass stop; none is hostile after `act7`. |
| **The Sleepless** | — | Gone from the House once it is `open`: narration d.vigil.open «Στη Στοά οι κόγχες είναι άδειες. Όσοι στέκονταν εκεί ξάπλωσαν επιτέλους.» / "In the Gallery the niches are empty. Those who stood there have lain down at last." |
| **Asger** | — | If freed in Act VI: his entry in the rolls is corrected (the Rolls room, below). |
| **The Skotos** | under the ice | Asleep. No line. |
| **Isarn's staff** | Whitecliff | The lantern on it burns, small. The interact still says «Ξεκουράσου.» and opens the Gates. |

### 2.6 Beats, quest by quest
- q40 [town] q.40 «Μίλα με τη Χάλντα στη νότια πύλη» / "Speak with Halda at the south gate".

**The hook.**
- **Who sees it:** a save with `h.act6 >= 0`, quest 39 and `act6`.
- **When:** on the next town entry; for a hero finishing Act VI after the update, 2 s after the Act VI blessing panel closes ('actClosed'), as Acts V and VI hooked.
- **What happens** (flag `morn7` saved first; cine at pitch 0.3 from the beacon, turning south; ATMOS 'townMorning', the town's first daylight):
  - Narration d.morn.1 «Τρίτη νύχτα που δεν κοιμάσαι. Σηκώνεσαι να δεις τη φωτιά. Καίει. Το ήξερες.» / "The third night you have not slept. You get up to look at the fire. It is burning. You knew it would be."
  - Narration d.morn.2 «Ξημερώνει, κι ο ουρανός πάνω από τον Λευκόβραχο είναι γαλάζιος. Κανείς στο χωριό δεν θυμάται τέτοιο πρωί.» / "Day breaks, and the sky over Whitecliff is blue. No one in the village remembers a morning like it."
  - Halda, shading her eyes: d.halda7.sun «Πρώτα τ' αστέρια. Ύστερα το σέλας. Τώρα αυτό. Καίει τα μάτια. Μ' αρέσει.» / "First the stars. Then the lights in the sky. Now this. It hurts the eyes. I like it." (d.halda.stars, d.halda.aur)
  - The boy: d.child7.1 «Πάλι δεν κοιμήθηκες. Σε είδα απ' το παράθυρο, τρεις φορές.» / "You didn't sleep again. I saw you from the window, three times."
  - d.child7.2 «Η Χάλντα λέει πως η φωτιά καίει κι όταν δεν την κοιτάς. Εσύ δεν το πιστεύεις;» / "Halda says the fire burns even when you're not looking at it. Don't you believe that?"
  - d.child7.3 «Κοίτα νότια.» / "Look south." (d.isarn.2 «Κοίτα βόρεια.», and Halda's d.halda.north)
  - The camera turns south. Over the plain stands one column of smoke (a dark `farFire` variant, 'farSmoke': the same sprite path with a grey-brown tint and no flicker, drawn by day). It leans, and its foot moves.
  - Narration d.morn.3 «Στον νότο, πάνω από τον κάμπο, ένας καπνός. Δεν ανεβαίνει σαν καπνός καμινάδας. Προχωρά.» / "In the south, over the plain, a smoke. It does not rise like chimney smoke. It is coming on."
  - d.child7.4 «Ο καπνός περπατάει.» / "The smoke is walking."
  - Narration d.morn.4 «Στη νότια πύλη, μια κοπέλα με καμένα μανίκια πέφτει στα γόνατα.» / "At the south gate a girl with scorched sleeves falls to her knees."
  - Halda runs down (walkTo). Toast «Νέα αποστολή», and the "!" over Halda at the gate (npcHasNews).
- **New act6.next:** «Πράξη VII: Η Ακοίμητη. Κάποιος σε περιμένει να ξυπνήσεις.» / "Act VII: The Unsleeping. Someone is waiting for you to wake." help.p1 needs no change.

**At the south gate,** one dialog, Signe and Halda (folk register for both, contractions in English):
- Signe: d.signe.a1 «Μην την αφήσετε να... Όχι. Αυτή είναι δική σας. Τρέμει.» / "Don't let it go... No. That one's yours. It trembles."
- d.signe.a2 «Σίγκνε. Του Τάγματος της Φλόγας. Έτρεξα τρεις μέρες μπροστά από την Πομπή.» / "Signe. Of the Order of the Flame. I ran three days ahead of the Procession."
- Mage only: d.signe.a2.m «Εσύ. Τα χρώματά μας. Ο μαθητής που έφυγε μια νύχτα για τον βορρά. Οι δάσκαλοι είπαν πως βορράς δεν υπάρχει. Σε γράψαμε «χαμένο».» / "You. Our colours. The student who left one night for the north. The masters said there was no north. We wrote you down as 'lost'."
- d.signe.a3 «Κουβαλάμε την Ακοίμητη. Τη φλόγα του Τάγματος. Χίλια χρόνια δεν έσβησε ούτε μια νύχτα.» / "We're carrying the Unsleeping. The Order's flame. In a thousand years it hasn't gone out for a single night."
- d.signe.a4 «Τη νύχτα που αποκοιμήθηκε το σκοτάδι, κάθε δάσκαλος ξύπνησε με την ίδια λέξη στο στόμα: βορράς. Θυμηθήκαμε τον δρόμο.» / "The night the dark fell asleep, every master woke with the same word in his mouth: north. We remembered the road."
- **If the hero freed Asger** (`asgerRest`): narration d.signe.asger1 «Της λες ό,τι σου είπε ο Άσγκερ κάτω από τον πάγο: ο δρόμος υπάρχει ακόμα.» / "You tell her what Asger told you under the ice: the road is still there." Signe: d.signe.asger2 «Άσγκερ... Είναι στα κατάστιχα. «Χάθηκε στον βορρά.» Ώστε δεν χάθηκε.» / "Asger... He's in the rolls. 'Lost in the north.' So he wasn't lost." (d.asger.2, delivered)
- d.signe.a5 «Η Δασκάλα Ράγκνα λέει: ό,τι κοιμάται, ξυπνά. Θα στήσει την Ακοίμητη πάνω στον πάγο σας, να καίει πάνω από το σκοτάδι για πάντα.» / "Master Ragna says: what sleeps, wakes. She'll set the Unsleeping on your ice, to burn over the dark for ever."
- Halda: d.halda7.a1 «Φωτιά πάνω σε πάγο. Κι ύστερα ρωτάνε γιατί οι Λιθογενείς δεν εμπιστεύονται κανέναν.» / "Fire on ice. And then they ask why the Stoneborn trust no one."
- d.signe.a6 «Κι η φλόγα μας δεν ξέρει να σταματά. Το χορτάρι είναι ξερό κι ο αέρας νότιος. Σε τρεις μέρες θα είναι στο δάσος σας.» / "And our flame doesn't know how to stop. The grass is dry and the wind's from the south. In three days it'll be in your wood."
- Ranger: d.signe.a6.r «...Σε τρεις μέρες θα είναι στο δάσος σου, Αειθαλή. Συγγνώμη.» / "...In three days it'll be in your wood, Evergreen. I'm sorry."
- d.signe.a7 «Εγώ αποκοιμήθηκα στη βάρδια μου. Μια ώρα. Όταν ξύπνησα, έκαιγε ακόμα. Κανείς μας δεν το είχε δοκιμάσει ποτέ.» / "I fell asleep on my watch. One hour. When I woke, it was still burning. None of us had ever tried."
- Halda: d.halda7.a2 «Κάθε σιδεράς το ξέρει, κορίτσι μου. Τη φωτιά δεν την κρατάς ξύπνια. Τη σκεπάζεις με τη στάχτη της, και το πρωί την ξυπνάς.» / "Every smith knows that, girl. You don't keep a fire awake. You bank it under its own ash, and in the morning you wake it."
- Halda, to the hero: d.halda7.a3 «Κι εσύ το ίδιο. Τρεις νύχτες σε βλέπω. Δώσ' μου την Κούνια· θα της φτιάξω καπάκι. Φωτιά που κοιμάται ταξιδεύει πιο μακριά.» / "And the same goes for you. Three nights I've watched you. Give me the Cradle; I'll make it a lid. A fire that sleeps travels farther."
- Warden only (needs `.w` in `rl()`, one clause; Engine notes): d.halda7.a3.w «...Η γενιά σου έμεινε εδώ όταν οι άλλοι πήραν αυτόν τον δρόμο. Πείσμα. Κράτα το, μα κοιμήσου και λίγο.» / "...Your people stayed here when the others took that road. Stubbornness. Keep it, but sleep a little too." (class.warden.d «Ατσάλι και πείσμα.»)
- Interact at Halda's anvil «Πάρε την Κούνια με το καπάκι της» / "Take the Cradle with its lid", 1 s. Narration d.lid7 «Η Χάλντα κλείνει το κάρβουνο κάτω από μια χούφτα στάχτη κι ένα σιδερένιο καπάκι. Η Κούνια είναι χλιαρή, σαν ψωμί.» / "Halda shuts the coal under a handful of ash and an iron lid. The Cradle is warm, like bread." Flag `lid7` saved first. setQuest(41).

**Barks in town while `morn7` and not `act7`:**
- Elianthe: d.elianthe7.v0 «Τρεις νύχτες ανάβεις το λυχνάρι σου πριν φέξει. Δεν σου δίνω φίλτρο γι' αυτό. Σου δίνω ένα μαξιλάρι.» / "Three nights you've lit your lamp before dawn. I've no potion for that. I'll give you a pillow."
- Leif: d.leif.v7 «Εφτά κορυφές, δύο χέρια. Αν έρθει κι άλλη φωτιά, θέλω κι άλλα χέρια.» / "Seven peaks, two hands. If another fire's coming, I want more hands."
- The boy: d.child7.bark «Ο καπνός περπατάει. Το είδα πρώτος.» / "The smoke is walking. I saw it first."
- Isarn's staff (before the Gates panel): the shipped «Ξεκουράσου.» and nothing more. It needs nothing more.

**The exit:** a second way out by the south gate, `{ kind: 'exit', to: 'tinder', label: 'exit.south', locked: 'lid7' }`, carved last with its own RNG as the town's Act III and IV exits were (engine brief §1.1), so no saved town changes. Shut line d.southShut «Ο παλιός δρόμος του νότου. Κανείς δεν τον περπατά. Δεν οδηγεί πουθενά, λένε.» / "The old south road. No one walks it. It leads nowhere, they say."

- q41 [tinder] q.41 «Πάρε τον Δρόμο του Νότου και ξύπνα τις φωτιές της Σίγκνε ({0}/3)» / "Take the South Road and wake Signe's fires ({0}/3)". Progress toast q.fireWoke «Μια σκεπασμένη φωτιά ξύπνησε ({0}/3)» / "A banked fire wakes ({0}/3)".

**Arrival cine in the Tindergrass** (flag `tinderSeen` saved first; pitch 0.2 looking south from the gate road). The act's wonder shot, and the only time the sky is drawn: blue, with cloud.
- d.tinder.1 «Ένας κάμπος από περσινό χορτάρι, χρυσό κάτω από τον ήλιο, ως εκεί που φτάνει το μάτι. Ο αέρας το χτενίζει προς τον βορρά.» / "A plain of last year's grass, gold under the sun, as far as the eye goes. The wind combs it northward."
- d.tinder.2 «Στο βάθος μια κόκκινη γραμμή, κι από πάνω της ο καπνός. Πίσω από τη γραμμή όλα είναι μαύρα.» / "Far off, a red line, and the smoke above it. Behind the line everything is black."
- Signe, who has followed as far as the first milestone: d.signe.b1 «Κάθε βράδυ στον δρόμο σκέπαζα τη φωτιά μου, κρυφά. Άφησα τρεις πίσω μου. Ξύπνα τες· θα σου δείξουν από πού ερχόμαστε.» / "Every night on the road I banked my fire, in secret. I left three behind me. Wake them; they'll show you where we come from."

**The Milestone camp** (waypoint `tinder`): the first way-stone of the old road, Halda's hand-cart with a field anvil (reforge), Signe (healer and vendor). Halda teaches the act's two rules (one dialog; first-time hints hint.black7 and hint.bank7):
- d.halda7.b1 «Άκου κάτι που ξέρει κάθε καρβουνιάρης: ό,τι κάηκε δεν ξανακαίγεται. Αν σε κυκλώσει, κάψε πρώτα εσύ ένα κομμάτι και στάσου στο μαύρο.» / "Here's a thing every charcoal-burner knows: what has burned won't burn twice. If it rings you in, burn a patch yourself first and stand on the black."
- d.halda7.b2 «Κι όποια φωτιά ξυπνήσεις, σκέπασέ την πριν φύγεις. Αυτοί με τα κόκκινα ταΐζουν ό,τι βρουν αναμμένο.» / "And whatever fire you wake, bank it before you leave. That lot in red feed anything they find alight."
- d.halda7.again «Πάρε ό,τι χρειάζεσαι. Και μην κοιτάς τον ήλιο. Το δοκίμασα.» / "Take what you need. And don't look at the sun. I tried."

**Each of Signe's fires** (interact kind 'bank7': an ash mound with a ring of stones, the shipped `ashMoundParts` mesh, engine brief §2):
- «Ξύπνα τη φωτιά» / "Wake the fire", a 1 s touch from the Cradle. It becomes an awake hearth: a true light pool of r 6 (by day drawn as warmth: a soft amber ground decal and a trembling flame, since light does not show), a respawn checkpoint (`flags.cp7`), a full potion, and the next memory in count order (so the reveals always land in order, Act VI's guard).
- Then the hero learns the other verb on the same hearth: «Σκέπασε τη φωτιά» / "Bank the fire", 1 s. Banked, it keeps the checkpoint and cannot be fed by the Wakeful (Mechanics).
- The memories use the Lamp-Memory flow (story.js `on('lamp')`) with a body class 'memory-ember' (a CSS swap, warm grey and coal red) and the narrator npc.coalMemory «Μνήμη από θράκα» / "A memory in embers". Each grants the shipped BUFFS.memory, toasted «Μνήμη του Τάγματος» / "Memory of the Order".

**Ember Memory 1, "The lesson in the snow"** (d.coal.m1.*; twist blow 2):
- .1 «Πριν από τη φωτιά του τυράννου. Ένα σχολείο στον Βορρά, κι ένας μαθητής που ανέβηκε ως τη θάλασσα για να μάθει.» / "Before the tyrant's fire. A school in the North, and a student who climbed all the way to the sea to learn."
- .2 «Μια γυναίκα με αλάτι στα μαλλιά τού δείχνει πώς κρατιέται μια φλόγα ζωντανή μέσα στο χιόνι.» / "A woman with salt in her hair shows him how a flame is kept alive in the snow." (d.alk.a5.m)
- .3 (the keeper) «Το βράδυ τη σκεπάζεις. Το πρωί την ξυπνάς. Φωτιά που δεν κοιμάται ποτέ, τρελαίνεται.» / "At night you bank it. In the morning you wake it. A fire that never sleeps goes mad."
- .4 «Ο μαθητής το γράφει. Είναι το πρώτο μάθημα του Τάγματος.» / "The student writes it down. It is the Order's first lesson."

**Ember Memory 2, "The last one"** (d.coal.m2.*; twist blow 1):
- .1 «Χίλια χρόνια πριν. Ο Βορράς καίγεται, και το σχολείο μαζί του.» / "A thousand years ago. The North is burning, and the school with it."
- .2 «Ένα κορίτσι περπατά νότια μέσα στη στάχτη, με ένα τσουκάλι κάρβουνα στην αγκαλιά.» / "A girl walks south through the ash with a pot of coals in her arms."
- .3 «Τη νύχτα πρέπει να τα σκεπάσει. Το χέρι της σταματά.» / "At night she must bank them. Her hand stops."
- .4 (the girl) «Κι αν δεν ξυπνήσει; Είναι η τελευταία.» / "And if it does not wake? It is the last one."
- .5 «Μένει ξύπνια. Έτσι αρχίζει η Αγρύπνια.» / "She stays awake. So the Vigil begins."
- .6 «Κάποτε σου είπαν κι εσένα: η δική σου φωτιά είναι η τελευταία.» / "You were told it once too: yours is the last fire." (intro.5)

**Ember Memory 3, "The blessing"** (d.coal.m3.*):
- .1 «Ο Οίκος του νότου. Τοίχοι χωρίς παράθυρα, για να μη φτάνει αέρας στη φλόγα.» / "The House in the south. Walls without windows, so that no wind reaches the flame."
- .2 «Τα δάση γύρω του λιγοστεύουν χρόνο με τον χρόνο. Η φλόγα τρώει.» / "The woods round it thin year by year. The flame eats."
- .3 «Μια μέρα η φλόγα παύει να τρέμει. Στέκεται άσπρη κι ακίνητη, σαν καρφί.» / "One day the flame stops trembling. It stands white and still, like a nail."
- .4 (a master) «Ευλογία. Δεν φοβάται πια.» / "A blessing. It is no longer afraid."
- .5 «Το πρώτο μάθημα το έχουν σβήσει από τα βιβλία εδώ και πολύ καιρό.» / "The first lesson was struck from the books long ago."

**After the third fire and its memory,** Signe (who walks the black behind the hero, since burnt ground is safe):
- d.signe.c1 «Τώρα ξέρεις. Δεν είμαστε κακοί. Είμαστε άυπνοι.» / "Now you know. We're not wicked. We're sleepless."
- d.signe.c2 «Μπροστά από την Πομπή πάει ο Αίθων και της ανοίγει δρόμο. Αν σταματήσει εκείνος, σταματά κι η φωτιά στον κάμπο. Είναι στα Αλώνια.» / "Ahead of the Procession goes Aithon, clearing its road. Stop him and the fire on the plain stops. He's at the Threshing Floors."
- Then q42.

**Set pieces on the road** (Zones gives the layout):
- **The first front,** seen from the Dry Brook: the hero stands in the stream bed while a line of fire crosses the grass on both sides and passes. Nothing can go wrong here; it teaches the tell (the gust, the dial, the red line) in safety.
- **The stampede:** a pack of Singe-wolves runs north past the hero without attacking, ahead of a front. The next pack attacks.
- **The Stubble:** a wide field with no stone and no brook, crossed by back-burning. The first place the black patch saves the hero.
- **The milestones:** nine way-stones with a flame cut on each, half sunk in grass. The road is still there (d.asger.2).

- q42 [tinder] q.42 «Σταμάτα τον Ταύρο της Πομπής στα Αλώνια» / "Stop the Bull of the Procession at the Threshing Floors".

**At the Threshing Floors.** Three round stone floors in a wide bowl of tall grass. A black bull stands on the middle one, yoked to a harrow whose teeth are brands.
- Narration d.aithon.0 «Ένας ταύρος μαύρος σαν κάρβουνο, ζεμένος σε μια σβάρνα που καίει. Ό,τι οργώνει, ανάβει.» / "A bull black as charcoal, yoked to a burning harrow. Whatever he ploughs catches fire."
- A Waker stands by him with a handbell and rings whenever the bull's head drops. When the hero steps onto the bowl's rim the Waker runs (he is not fought here).

**Boss: Aithon** (Bosses). Signe calls the fight from the rim, one thing per phase:
- d.signe.k1 «Ο Αίθων! Στο χορτάρι δεν σταματά. Σταματά μόνο εκεί που δεν έχει τίποτα να κάψει!» / "Aithon! He won't stop on grass. He only stops where there's nothing to burn!"
- d.signe.k2 «Γυρίζει ο αέρας! Κάψε ένα κομμάτι πριν σε φτάσει και στάσου στο μαύρο!» / "The wind's turning! Burn a patch before it reaches you and stand on the black!"
- d.signe.k3 «Έχασε τη φωτιά του. Τώρα είναι μόνο ένας ταύρος που φοβάται.» / "He's lost his fire. Now he's only a frightened bull."

**The end of the fight** (flag `aithonDown` saved first):
- Narration d.aithon.die «Ο ζυγός σπάει και πέφτει. Ο ταύρος γονατίζει στο καμένο χορτάρι, εκεί που δεν έχει τίποτα πια να καεί, και κοιμάται.» / "The yoke breaks and falls. The bull kneels in the burnt grass, where there is nothing left to burn, and sleeps."
- Signe: d.signe.k4 «Ούτε αυτός είχε κοιμηθεί ποτέ. Τον κρατούσαμε ξύπνιο με το κουδούνι.» / "He'd never slept either. We kept him awake with the bell."
- With no bull to plough it forward, the front on the plain dies against its own black. Big toast q.aithonDown «Η φωτιά του κάμπου έσβησε μόνη της» / "The fire on the plain has gone out by itself".
- **Ember Memory 4, "The hour"** at the broken yoke's coals (d.coal.m4.*; flag `mem_e4`; not counted in q41):
  - .1 «Πριν από εφτά νύχτες. Μια μαθήτρια στέκει βάρδια μπροστά στην Ακοίμητη. Τα μάτια της κλείνουν.» / "Seven nights ago. A student stands her watch before the Unsleeping. Her eyes close."
  - .2 «Ξυπνά με την καρδιά στο στόμα. Η φλόγα καίει όπως πριν.» / "She wakes with her heart in her mouth. The flame burns as before."
  - .3 (Signe) «Μια ώρα. Και δεν το κατάλαβε καν.» / "One hour. And it never even noticed."
  - .4 «Το λέει στη Δασκάλα. Η Δασκάλα δεν θυμώνει. Φοβάται.» / "She tells the Master. The Master is not angry. She is afraid."
- Signe: d.signe.c3 «Η Πομπή σταμάτησε στο Πρώτο Σχολείο, εκεί που άρχισαν όλα. Κάρφωσαν τα παράθυρα πριν καν ξεφορτώσουν. Πάμε.» / "The Procession has stopped at the First School, where it all began. They nailed up the windows before they'd even unloaded. Come on." Then q43.

**The exit:** `{ to: 'vigil', label: 'exit.vigil', locked: 'aithonDown' }` at the School's door, at the south end of the zone. Shut line d.vigilShut «Η πόρτα του Οίκου είναι κλειστή, κι ο δρόμος ως εκεί καίει.» / "The House's door is shut, and the road to it is burning."

- q43 [vigil] q.43 «Σκέπασε τις τρεις φωτιές που ταΐζουν την Ακοίμητη ({0}/3)» / "Bank the three fires that feed the Unsleeping ({0}/3)". Progress toast q.fireBanked «Μια φωτιά του Οίκου κοιμάται ({0}/3)» / "One of the House's fires sleeps ({0}/3)".

**Arrival cine in the Vigil House** (flag `vigilSeen` saved first; pitch 0.3 from inside the door as it closes):
- d.vigil.1 «Η πόρτα κλείνει πίσω σου, κι η μέρα μένει έξω. Κάθε παράθυρο είναι καρφωμένο με σανίδες.» / "The door closes behind you, and the day stays outside. Every window is nailed up with boards."
- d.vigil.2 «Στο βάθος, ένα άσπρο φως που δεν τρέμει. Γύρω του άνθρωποι όρθιοι, που δεν κάθονται ποτέ.» / "Far in, a white light that does not tremble. Round it, people on their feet, who never sit down."
- Signe, low: d.signe.d1 «Έκλεισαν τον ήλιο απ' έξω για να βλέπουν ένα κερί. Έτσι μας έμαθαν.» / "They shut the sun out so they could watch a candle. That's how we were taught."

**The Court of Shut Windows** (waypoint `vigil`): the entry hall, Signe's small banked fire (healer, vendor, checkpoint). Here the Cradle's lid comes off: inside the House it is dark, and the Cradle's ring is the hero's light again (light kind 'ember', as Act IV; no drain).
- d.signe.d2 «Τρεις φωτιές την ταΐζουν: στην Ξυλαποθήκη, στο Λαδαριό, στα Φυσερά. Όσο καίνε εκείνες, δεν χαμηλώνει. Σκέπασέ τες.» / "Three fires feed it: in the Woodstore, the Oil Cellar, the Bellows. While they burn, it won't sink. Bank them."
- d.signe.d3 «Και μην ξυπνήσεις τους Όρθιους στη Στοά. Οι παλιοί μας φύλακες. Δεν κοιμήθηκαν ζωντανοί, και δεν ξέρουν πώς να κοιμηθούν τώρα.» / "And don't wake the Standing in the Gallery. Our old keepers. They never slept alive, and they don't know how to now."

**Each feeder fire** stands at the far end of its hall:
- «Σκέπασε τη φωτιά» / "Bank the fire", a 2.0 s channel; a hit worth 10% of max life interrupts it. It is the verb the hero learnt on the road, under pressure.
- While the hero channels, a Waker somewhere in the hall rings: sleeping adepts within 10 m get up (Mechanics: Sleep). Put the Waker to sleep first.
- When it is banked: the hall goes dim, every Wakeful in it yawns (a 3 s daze, the shipped `daze`), and the white glow at the end of the corridor drops by a third.
- **The Wakeful answer each one,** by count, and their answers soften:
  - first: d.wakeful.b1 «Τη σκέπασε! Ανάψτε την! Ανάψτε την!» / "They've banked it! Light it! Light it!"
  - second: d.wakeful.b2 «...Είναι πιο ήσυχα έτσι. Το ακούς;» / "...It's quieter like this. Do you hear?"
  - third: d.wakeful.b3 «Αν κλείσω τα μάτια ένα λεπτό... μόνο ένα...» / "If I shut my eyes for a minute... just one..."

**The Rolls** (Τα Κατάστιχα, a side room off the Gallery; optional, one interact «Διάβασε τα κατάστιχα» / "Read the rolls", flag `rolls7`): the Order's book of names.
- Narration d.rolls.1 «Χίλια χρόνια ονόματα. Δίπλα σε καθένα, πόσες νύχτες αγρύπνησε. Πουθενά δεν γράφει πόσες κοιμήθηκε.» / "A thousand years of names. Beside each, how many nights they kept vigil. Nowhere does it say how many they slept."
- If `asgerRest`: d.rolls.asger «Άσγκερ. «Χάθηκε στον βορρά.» Σβήνεις το «χάθηκε». Γράφεις: «βρήκε τον δρόμο».» / "Asger. 'Lost in the north.' You strike out 'lost'. You write: 'found the road'."
- Mage: d.rolls.m «Το δικό σου όνομα, και δίπλα του: «χαμένος». Το αφήνεις. Για την ώρα.» / "Your own name, and beside it: 'lost'. You leave it. For now." (answered by d.ragna.w7.m)
- Warden: d.rolls.w «Στην πρώτη σελίδα, οι γενιές που έφυγαν. Μία είναι σβησμένη με μια γραμμή: «έμειναν». Είναι η δική σου.» / "On the first page, the houses that left. One is struck through with a line: 'stayed'. It is yours."
- Ranger: d.rolls.r «Κάτω κάτω, με άλλο χέρι: «Τα δάση του νότου τελείωσαν. Λένε πως στον βορρά τα δέντρα δεν πεθαίνουν.»» / "At the very bottom, in another hand: 'The woods of the south are finished. They say that in the north the trees do not die.'"

**Ember Memory 5, "The girl of ten"** (d.coal.m5.*; twist blow 3; at a cold brazier in the antechamber of the Hall, offered once the third fire is banked; flag `mem_e5`):
- .1 «Σαράντα χρόνια πριν. Ένας γέρος δάσκαλος γονατίζει μπροστά σε ένα κορίτσι δέκα χρονών.» / "Forty years ago. An old master kneels before a girl of ten." (d.lamp.m5.1)
- .2 (the master) «Η βάρδια είναι δική σου τώρα. Δεν θα κοιμηθείς όσο καίει. Και θα καίει πάντα.» / "The watch is yours now. You will not sleep while it burns. And it will always burn."
- .3 (the girl) «Μη μ' αφήσεις να κοιμηθώ.» / "Don't let me fall asleep." (d.lamp.m5.2)
- .4 (the master) «Δεν θα σ' αφήσει κανείς. Το υπόσχομαι.» / "No one will let you. I promise." (d.lamp.m5.3)
- .5 «Ο γέρος ξαπλώνει στο πάτωμα και κοιμάται, για πρώτη φορά. Το κορίτσι δεν γυρίζει να τον κοιτάξει.» / "The old man lies down on the floor and sleeps, for the first time. The girl does not turn to look at him." (d.lamp.m4.3)
- Then q44.

- q44 [vigil] q.44 «Αντίκρισε την Άγρυπνη στην Αίθουσα της Ακοίμητης» / "Face the Wakeful in the Hall of the Unsleeping".

**In the Hall** (cine `ragnaWake`, flag saved first; pitch 0.35): a round hall, the Unsleeping in a stone basin in the middle, white and still, and Ragna before it with a staff, a Waker at her shoulder.
- d.ragna.1 «Ώστε εσύ έβαλες το σκοτάδι για ύπνο. Καλή δουλειά. Μισή.» / "So it was you who put the dark to bed. Good work. Half of it."
- d.ragna.2 «Ό,τι κοιμάται, ξυπνά. Το ξέρω καλύτερα από κάθε ζωντανό: εγώ δεν κοιμάμαι.» / "What sleeps, wakes. I know it better than anyone living: I do not sleep."
- d.ragna.3 «Θα στήσω την Ακοίμητη πάνω από τον ύπνο του. Όταν ανοίξει τα μάτια, το πρώτο που θα δει θα είναι φωτιά.» / "I will stand the Unsleeping over its sleep. When it opens its eyes, the first thing it sees will be fire."
- Signe: d.signe.r1 «Δασκάλα, ο πάγος είναι το σκέπασμά του. Αν τον λιώσεις, το ξυπνάς εσύ.» / "Master, the ice is its blanket. Melt it and you're the one who wakes it."
- d.ragna.4 «Τότε ας ξυπνήσει μπροστά μου, κι όχι μπροστά στα εγγόνια μου.» / "Then let it wake in front of me, and not in front of my grandchildren."
- d.ragna.5 «Κι εσύ δεν κοιμάσαι. Το βλέπω στα μάτια σου. Σε είκοσι χρόνια θα στέκεσαι εδώ που στέκομαι.» / "And you do not sleep either. I see it in your eyes. In twenty years you will stand where I stand."
  - Mage: d.ragna.5.m «Κι εσύ, μαθητή μου. Έφυγες να βρεις τον βορρά και βρήκες μια φωτιά να φυλάς. Δεν έφυγες ποτέ από το Τάγμα.» / "And you, my student. You left to find the north and found a fire to guard. You never left the Order."
  - Ranger: d.ragna.5.r «Αειθαλής. Ο λαός σου στάθηκε ακίνητος εκατό χρόνια για να μη χάσει τίποτα. Εμείς μείναμε ξύπνιοι χίλια. Καταλαβαινόμαστε.» / "Evergreen. Your people stood still a hundred years so as to lose nothing. We stayed awake a thousand. We understand each other."
  - Warden: d.ragna.5.w «Η γενιά που έμεινε. Σας γράψαμε νεκρούς. Πεισματάρηδες· θα γινόσασταν καλοί αγρυπνητές.» / "The house that stayed. We wrote you down as dead. Stubborn; you would have made good vigil-keepers."
- Boss intro on wake, d.ragna «Σαράντα χρόνια δεν έκλεισα μάτι. Δεν θα το κάνω απόψε, επειδή ήρθες εσύ με μια χούφτα στάχτη.» / "Forty years I have not closed my eyes. I will not do it tonight because you came with a handful of ash."

**Boss: Ragna** (Bosses). Signe calls one thing per phase:
- d.signe.s1 «Το κουδούνι την κρατά όρθια! Κοίμισε πρώτα τον Ξυπνητή!» / "The bell's keeping her up! Put the Waker to sleep first!"
- d.signe.s2 «Άνοιξε τα μαγκάλια! Σκέπασέ τα, κι η φλόγα κονταίνει!» / "She's opened the braziers! Bank them and the flame shortens!"
- d.signe.s3 «Δεν αντέχει άλλο. Μην τη βιάζεις. Άσ' τη να νυστάξει.» / "She can't hold out. Don't rush her. Let her nod."
- Ragna, phase 2: d.ragna.p2 «Ταΐστε τη. Όλα. Ας δει τι θα πει φωτιά που δεν κοιμάται.» / "Feed it. Everything. Let this one see what a fire that does not sleep can do."
- Ragna, phase 3, to herself: d.ragna.p3 «ΜΗΝ ΚΟΙΜΑΣΑΙ. ΚΑΝΕΙΣ ΔΕΝ ΚΟΙΜΑΤΑΙ. ΕΙΝΑΙ Η ΤΕΛΕΥΤΑΙΑ.» / "DO NOT SLEEP. NO ONE SLEEPS. IT IS THE LAST ONE."

The end of the fight, the banking, the night and the waking are under 2.4. Then q45, q45b, q46.

- q45 [vigil] q.45 «Σκέπασε την Ακοίμητη» / "Bank the Unsleeping"; then q.45b «Ξύπνα τη φωτιά το πρωί» / "Wake the fire in the morning".
- q46 [town] q.46 «Γύρνα στον Λευκόβραχο και κοιμήσου» / "Go home to Whitecliff, and sleep".
- End state q.47 (2.4).

**Catch-ups on zoneEnter** (the Act IV-VI pattern: a flag saved before its scene is caught up quietly):

| flag | catch-up |
|---|---|
| `morn7` | → 40 (Halda at the south gate) |
| `lid7` | → 41; the south exit unlocks |
| `tinderSeen` without the Halda teach | replay d.halda7.b1-b2 at the Milestone |
| more fires woken than `mem_e1`-`mem_e3` seen | the fire offers «Θυμήσου»; questGoal points at it |
| `wake7_1`-`3` and `mem_e1`-`e3` all set | d.signe.c1-c2, then → 42 |
| the Aithon fight begun, no `aithonDown` | the fight starts again; the bowl's grass regrows on build |
| `aithonDown` | → 43; the plain's front is gone; the House door open; `mem_e4` offered at the yoke |
| `bank7_0`-`2` all set | → 44 once `mem_e5` is seen (offered on entry) |
| `ragnaWake` without `ragnaDown` | the fight starts again from phase 1 |
| `ragnaDown` without `banked7` | → 45; Ragna asleep on the floor on build |
| `banked7` without `woke7` | → 45b; the hall dark, one shutter open |
| `woke7` | → 46; the House in its `open` reading |
| `woke7` without `sleep7`, in town | the home cine; the name card if unanswered |
| `sleep7` without `h.act7` | the morning line, then actComplete(7) |

Quitting mid-cine never strands a save. A front, a channel or a boss phase in progress is runtime-only; zones rebuild from the seed.

### 2.7 Class lines (Warden, Ranger, Mage)
The game uses `.r` and `.m` today: `rl()` in story.js:102 picks `k + '.r'` for the Ranger and `k + '.m'` for the Mage when the key exists. **There is no `.w`.** Act VII adds one clause for the Warden so that all three classes have a past in the one act that is about the hero.

| class | what the act says about them | keys |
|---|---|---|
| **Mage** | He was a student of the Order who walked off north one night because his masters said there was no north. He is in their rolls as "lost". At the end Ragna has it changed to "master". | d.signe.a2.m, d.rolls.m, d.ragna.5.m, d.ragna.w7.m, d.first.v7.m |
| **Ranger** | Her wood is what the fire is three days from. Ragna reads the Evergreen's hundred still years as the same mistake as the Vigil (Amaranthe's cage). Elati's home line. | d.signe.a6.r, d.rolls.r, d.ragna.5.r, d.elati.v7.r |
| **Warden** | "Steel and stubbornness" gets one fact: his people are the house that stayed in the North when the others took the south road. Nothing more is claimed. | d.halda7.a3.w, d.rolls.w, d.ragna.5.w |

Gender: every second-person line above is built on verbs, not adjectives, so one text serves all three (canon §2.2). The boy's «Καληνύχτα, φρυκτωρέ.» is the same vocative for «ο φρυκτωρός» and «η φρυκτωρός».

### 2.8 People
**No new people scene and no people set loaded.** Every person in Act VII is a boot-loaded people.glb scene with a runtime grade and code parts, the way Act VI built Keyx, Leif and Asger.

| who | GR / EN | body | notes |
|---|---|---|---|
| signe | Σίγκνε / Signe | people.glb `villager2` (a woman, per act6-design's G0 note) at ×0.96 in the Order's russet, with a code hood thrown back (**not verified** in the viewer; fallback `healer` at ×0.94) | The hook's runner, the road's guide, the voice that calls both fights. About twenty. Folk register. Scorched sleeves in code (a dark tint on the forearm bones). |
| ragna | Ράγκνα η Άγρυπνη / Ragna the Wakeful | people.glb `healer`, runtime elder stoop (Act V's `flinchQ` spine recipe, runtime), white hair tint, russet-and-soot robe, a code staff with a small covered censer | Look gate: beside Elianthe in the people viewer; she must not read as Elianthe. They are never in one zone. |
| the Wakeful | Άγρυπνοι | people.glb `mage` (the Mage's own robes are the Order's: Asger's line «Τα χρώματά σου...» already says so) | One faction tint, hoods in code. |
| arna (the boy) | Άρνας / Arna | the shipped village child (the `frost` `tern` scene in the village tint, loaded in town since Act V) | No change. `npc.child` becomes `npc.arna` after `sleep7`. |
| halda | Χάλντα | shipped | In town, and at the Milestone camp in `tinder`. The engine brief notes her source body is shared with Selna's; the two are never in one zone here either. |
| coalMemory | Μνήμη από θράκα / A memory in embers | narrator portrait | After «Μνήμη από κεχριμπάρι», «από στάχτη», «από πάγο», «από μαύρο πάγο», «από μαύρο νερό». |

Brokka, Elati, Tamarisk, Selna, Tern, Alkyone and Glaukos stay where they are, with lines only, so `folk`, `grove` and `frost` are never loaded for this act (Act V's 88.6 MB cameo lesson, act6-design npcs).

---

## 3. Zones
### 3.1 How the hero gets there from Whitecliff
Whitecliff's south gate → the old south road (a new exit beside the gate, locked `lid7`) → the Tindergrass → the door of the First School at its south end (locked `aithonDown`) → the Vigil House. The way home is the same road, or the waypoints `tinder` and `vigil`. The town's east side and the forest are untouched.

The shipped geography leaves the south free: the town's exits go to the forest (south gate), the pass (north-east), the Weeping Woods (west) and the Field (north) (`gen.js:400-483`), and Isarn's own direction in Act I was «Πάρε το παλιό μονοπάτι προς τα βόρεια, από τη νότια πύλη» (d.isarn.5): the trail out of the south gate bends north. The road that keeps going south is the one nobody takes.

### 3.2 tinder (40) Ο Ξερόκαμπος / The Tindergrass
`ZONES.tinder = { level: 40, music: 'tinder', ambient: 'tinder', atmos: 'tinder', act: 7, light: 'day', ring: 3.5 }`. zone.tinder «Ο Ξερόκαμπος» / "The Tindergrass"; zone.tinder.s «Ξερό χορτάρι, νότιος αέρας» / "Dry grass, a south wind".

**LAYOUT:** `genTinder(seed)` in gen7.js, a 112 × 208 map, north at the top. The hero walks south, against the wind and against the fire. All floor is at y = 0 (engine brief fact 1); the low rise of Hawk Hill is visual height only.

North to south:
- **Το Πρώτο Μίλι / The First Mile.** Green spring grass under the last trees of the Whisperwood (the boot `trees` pack). Nothing here burns. The Milestone camp (waypoint): the first way-stone, Halda's cart, Signe.
- **Το Ξερό Ρέμα / The Dry Brook.** A winding stream bed with a trickle of water (shallow wading cells: they never burn, and they wash off the Smoke meter). Reeds, gravel bars. Signe's first fire on a bar. The first front passes here while the hero stands in the water.
- **Οι Καλαμιές / The Stubble.** The open plain: knee-high gold grass, boulders, a ruined sheepfold, the old road as a two-cell ribbon of packed earth with a way-stone every 20 m. Signe's second fire in the lee of the fold. Singe-wolves, Brand-bearers at work, Yoke-oxen.
- **Ο Λόφος των Γερακιών / Hawk Hill.** A rise with three dead trees where the Firehawks perch. Signe's third fire among stones at the top. From here the hero first sees the Black.
- **Τα Αλώνια / The Threshing Floors.** A bowl of tall grass, r 22, with three round stone floors (r 4) at 120°. Aithon's arena.
- **Το Μαύρο / The Black.** Everything behind the Procession: burnt ground, white ash drifting like snow, wheel ruts, dropped brands still glowing, Cinderlings going out one by one. Safe from fire and strange to walk through. At its south edge, the First School: a low domed building with every window boarded, and the Procession's empty litter at its door.

**Side places** (each holds one of the seven sleeping coals, Good Nights): the Sheepfold (Η Στάνη), the Dry Plane (Ο Ξερός Πλάτανος), the Cistern (Η Στέρνα), the Ninth Stone (Η Ένατη Πέτρα).

**The path and its guarantees** (hard failures in `tools/check-act7.mjs`):
- the main road is reachable end to end with every fuel cell burning and with none;
- from any cell on the road, a refuge (stone, water, the First Mile, or the Black) lies within 12 m; where none does, the generator places a boulder;
- no front may close the last open cell round a hero: the lane rule and the 6 s lead are tide.js's own (Mechanics);
- every pack spot, hearth and interact stands on a cell that cannot burn;
- no two interacts in the arena closer than 3 m (Act VI's rule).

**Two readings.** `gold` during the act: dry grass, fronts, the smoke on the horizon. `green` after `act7`: one global ground blend (the `uAutumn` pattern, build.js:1233) takes the plain from char and straw to new grass, flower tufts replace half the dry ones, the fronts never come, the Wakeful are gone, and Aithon grazes by the brook. `enterZone` passes `fresh: true` when `tinderMode()` differs from `z.mode`, as Act VI does for its readings.

**The look and what each image costs:**

| image | how | new cost |
|---|---|---|
| **Daylight** | An `ATMOS.tinder` entry: pale warm fog at low density, hemi about 1.6, the `moon` directional light as a sun (warm white, about 2.2), exposure near 1.0, `heroI: 0`. The hero's point light is off by day, which saves a light. Sun shadows are the shipped shadow map (quality ≥ 1). | 0.5 d of tuning; no code |
| **Cloud shadows crossing the plain** | One term in `groundMat`: the shipped `tNoise`, scrolled by the wind, multiplying the sun term. It is what makes a bright field look alive from a camera that cannot see the sky. Off at quality 0. | 1 fetch; 0.5 d |
| **The gold grass, combed by the wind** | The shipped `tuft` instances (build.js:352, `grassGeo`) in straw colours, swaying on `WIND.uWind`. A gust flattens them: the Burn's 6 s tell is the grass itself lying down. Density by quality. | 0.25 d |
| **The fire line** | Burning cells are per-cell quads on the lava sheet's path (build.js:1319) with a flame billboard per front cell from the additive pool, drawn only within 22 m of the hero and capped (40 / 70 / 100 by quality). No full-screen layer. | in the Burn |
| **The black** | A per-vertex attribute on the ground, written in place when a cell burns (the `aSap` pattern, engine brief §3.3), multiplying the ground to char. It is the act's signature: a dark disc in a bright field, the mirror of the Cradle's ring. | in the Burn |
| **Smoke** | Grey alpha particles in the `lowmist` style, downwind of fire only, capped; the fog eases toward grey-orange near a front (`mixAtmos`). | 0.5 d |
| **The sky** | Only in two cines (the arrival and the home morning): a plain blue dome with the `starField` mesh pattern and two cloud sprites. | 0.25 d |

Ground: the first pass uses **no new texture**: the boot `grass` layer under a straw tint, the same layer under the char multiply, and the forest's path layer for the road. If the owner's phone test finds the straw flat, a small pack `chaff` adds one dry-grass layer (d 1024, n 512). Assets has both rows.

### 3.3 vigil (43) Ο Οίκος της Αγρύπνιας / The Vigil House
`ZONES.vigil = { level: 43, music: 'vigil', ambient: 'vigil', atmos: 'vigil', act: 7, light: 'ember', ring: 6 }`. zone.vigil «Ο Οίκος της Αγρύπνιας» / "The Vigil House"; zone.vigil.s «Εκεί που δεν μπαίνει ο ήλιος» / "Where no sun comes in".

**LAYOUT:** `genVigil(seed)` in gen7.js, 96 × 168. Rooms and corridors on the boot-loaded dungeon kit (`dungeon.glb`, Act I's crypt kit) under a whitewash-and-soot wall grade; Act VI's `stamp()` of `genCrypt` sub-layouts is the model (act6-design, Critic pass). The House is one storey; nothing is above the camera.

From the door inward:
- **Η Αυλή των Κλειστών Παραθύρων / The Court of Shut Windows.** The entry hall, eight boarded windows, Signe's banked fire (waypoint, checkpoint, vendor).
- **Η Ξυλαποθήκη / The Woodstore.** Aisles between stacked cordwood: fuel indoors. A Brand-bearer's brand starts a small Burn that runs along the stacks (the same system, short fuel lines). Feeder fire 1.
- **Το Λαδαριό / The Oil Cellar.** Low vaults and rows of oil casks (the shipped whale-oil cask prop and its burst, Act VI). Sparkcasters. Feeder fire 2.
- **Τα Φυσερά / The Bellows.** A long gallery with four wall bellows that blow in turn: forge.js's Breath lines as they shipped, recoloured white, with their 2.0 s inhale. Feeder fire 3.
- **Η Στοά των Ορθίων / The Gallery of the Standing.** A corridor of niches. In each stands a robed figure, upright: the Order's dead keepers, dormant (the statue path, engine brief §2). They wake to noise: a fight in the Gallery, or a Waker's bell.
- **Τα Κατάστιχα / The Rolls.** A side room (2.6).
- **Η Αίθουσα της Ακοίμητης / The Hall of the Unsleeping.** A round hall, r 16: the basin in the middle, four braziers at the cardinal points, a gallery ring where the Wakers stand, eight tall boarded windows.

**The path.** The three feeder halls open off the Court in any order; each has one way in, so a banked hall stays behind the hero. The Gallery joins them to the Hall. Checkpoints at the Court and at the Hall's antechamber (the retry point for Ragna, `flags.cp7`).

**Two readings.** `shut` until `woke7`: dark, the hero's Cradle ring (lid off) and one cold white glow at the end of every corridor, which dims by a third with each feeder banked. `open` after: the boards are down, daylight lies on the floor in eight long panes (Act VI's skylight decals, `light: false`), the fire in the basin is small, yellow and trembling, the Gallery's niches are empty, and the Wakeful who remain are asleep on benches or sweeping ash. No enemy stands in the `open` House; it is a quiet place with a vendor, the Rolls and the echo.

**The look:** an artificial night. The Unsleeping is drawn as Act VI drew false light, because it is the same failing seen from the other side: a steady white pooled light, a still sprite, a pure tone, no flicker. When it is woken in the morning it gets the true-lamp tremble (the band-limited noise Act VI shipped, with the 'reduce flicker' setting).

---

## 4. Enemies
Seven entries, eight kinds. Six are on models already in the build; five of those are boot-loaded. Numbers are starting points for the balance run, on the scale of data.js's MONSTERS (commons 0.3-1.6, brutes 3-5).

| id | GR / EN | model (source) | AI (shipped) | new input |
|---|---|---|---|---|
| wakeful | Άγρυπνος Δαυλοφόρος / Wakeful Brand-bearer | people.glb `mage`, faction tint (boot) | `melee` | his brand lights fuel where it lands; he feeds awake hearths |
| wakefulCaster | Άγρυπνη Σπιθοβόλος / Wakeful Sparkcaster | the same body, hood up (boot) | `ranged` | her bolt leaves a 2 s spot fire on fuel |
| waker | Ξυπνητής / Waker | the same body, a code handbell (boot) | `forger` | rings sleepers awake instead of reforging remains |
| cinderling | Αποκαΐδι / Cinderling | the Ashspawn at ×0.55, ember tint (boot) | `pounce` | starves on black ground |
| singeWolf | Καψαλόλυκος / Singe-wolf | the wolf, soot grade (boot) | `pounce`, packs | runs from fire: a back-burn scatters the pack |
| firehawk | Πυρογέρακο / Firehawk | the Skua (shipped Act V file) | `diver` | drops a brand: a spot fire ahead of the front |
| yokeOx | Καματερό / Yoke-ox | the boss's bull at ×0.6 (the act's download; fallback the elk) | `charger` | drags a short burning furrow; stalls on black |
| sleepless | Άυπνος / Sleepless | the wight, pale robe grade (boot) | `wraith`, dormant | wakes to noise, not to sight; Shrouded outside light |

### wakeful Άγρυπνος Δαυλοφόρος / Wakeful Brand-bearer (and wakefulCaster Άγρυπνη Σπιθοβόλος / Wakeful Sparkcaster)
**Who:** the Procession's outriders and the House's adepts. Red-eyed, courteous, convinced that a banked fire is a dying one. They are trying to take the lid off the hero's Cradle.
**Barks:** d.wakeful.1 «Σκεπασμένη φωτιά! Ξυπνήστε την!» / "A banked fire! Wake it!"; d.wakeful.2 «Μην κοιμάσαι! Μην κοιμάσαι!» / "Don't sleep! Don't sleep!"; d.wakeful.3 (falling asleep) «...πέντε λεπτά...» / "...five minutes..."
**Does:** the Brand-bearer's third blow is a brand sweep (a cone, 1.0 s) that lights fuel cells in the cone. Left alone near an awake hearth (the hero more than 25 m away), he feeds it: it becomes an unsleeping fire, a source of fronts, until it is banked again (2 s). The Sparkcaster keeps her distance; her bolt (the Mage's shipped firebolt projectile) leaves a spot fire where it lands on fuel.
**Data:** hp 1.3 / 0.9, dmg 1.15 / 1.0, speed 3.8 / 3.6. At zero life they **sleep** (Mechanics: Sleep): dieClip Lie_Idle, a slow breath mote, loot and experience paid once.

### waker Ξυπνητής / Waker
**Who:** the one who walks the lines with a handbell so that nobody nods. In the Order it is an honoured post.
**Does:** the shipped `forger` loop aimed at sleepers: he walks to the nearest sleeping Wakeful within 10 m and rings (a 1.5 s channel with a bell tell); she gets up at 40% life and pays nothing a second time. He never fights; he backs away and rings. He is the first target in every pack, and he is slow.
**Data:** hp 0.8, dmg 0, speed 3.2. PACK_LEAD-style placement at the back. On Nightmare and above a pack may hold two.

### cinderling Αποκαΐδι / Cinderling
**Who:** not a creature. A knot of the Unsleeping's coals that has fallen from the litter and goes on walking toward anything that will burn.
**Does:** leaps (`pounce`), burns on touch (`burns`), and lights the fuel cell it lands on. On black ground, stone or water it loses 12% of its life a second and its glow gutters: lead it onto the black and it goes out by itself. This is the Burn's rule taught by an enemy.
**Data:** hp 0.4, dmg 0.7, speed 6.0, in packs of 5-8; deathFire off, a puff of ash.

### singeWolf Καψαλόλυκος / Singe-wolf
**Who:** the plain's wolves, driven north ahead of the fire, hungry and singed.
**Does:** a pack that circles and pounces. They will not cross burning cells and will not stand within 5 m of flame: a back-burn or a front breaks the pack and sends it running for 4 s (the shipped flee of the `skirmisher`, by distance from fire). The Ranger's wolf can turn one pack-mate for 6 s (kin).
**Data:** hp 0.85, dmg 0.95, speed 6.6; the shipped warg numbers, a little up.

### firehawk Πυρογέρακο / Firehawk
**Who:** kites that follow grass fires to hunt what runs from them. They carry burning sticks to fresh grass. The Order did not train them; the fire did.
**Does:** the shipped `diver` loop (Act IV's Ashwing): airborne and untargetable, a dive token on the ground (1.2 s), a landing. Instead of striking it drops a brand: a spot fire of r 2 that becomes a small front with the next gust unless the hero stamps it out (walk onto it within 3 s: a 0.5 s auto-stomp, 3% life) or it lands on black. Grounded for 4 s after a drop.
**Data:** hp 0.5, dmg 0.6, speed 7.5; at most two over the hero at once.

### yokeOx Καματερό / Yoke-ox
**Who:** the Procession's draught oxen, each pulling a small harrow of brands to widen the road.
**Does:** the shipped `charger` (rear, charge, dazed against a wall). Its charge leaves a three-cell furrow that burns for 4 s and turns black. A charge that ends on black, stone or water leaves it Stalled for 3 s (the daze). It is Aithon's lesson at one third the size, met twice before the boss.
**Data:** hp 4.2, dmg 1.9, speed 3.6 (charge 9), big. At zero life it lies down and sleeps.

### sleepless Άυπνος / Sleepless
**Who:** the Order's dead keepers, standing in their niches in the Gallery. They never slept in life and do not know how to now. They are the Lampless of this act, on purpose: every lonely watch in this game ends with dead who cannot lie down.
**Does:** dormant (the statue path) until noise within 12 m: a skill used, a bell rung, a cask burst. Awake, the shipped `wraith` blink beside the hero and a slow two-hit; Shrouded outside the Cradle's ring (×0.3, the shipped rule). When the hall they belong to has its feeder fire banked, they stop, turn back to their niches and stand still again: banking is also how you get past them.
**Data:** hp 1.2, dmg 1.2, speed 4.4; never more than four awake.

---

## 5. Bosses
**The lesson of Act VI's balance campaign, applied as rules** (balance-report.md: the Shade ran 285-435 s with 81-146 blows landing; Act VI cost ×3-7 Act V's damage against a plan of ×1.2-1.45):
- **No time floors.** There is no `AITHON_MIN` or `RAGNA_MIN`. A phase turns on life alone; the hold at a turn is at most 3 s.
- **Few blows, large and slow.** Every damaging move has a telegraph of 0.9 s or more that never changes with difficulty. A boss has at most one move on the ground at a time, plus the environment's.
- **A budget, asserted by scenario and by tools/balance-act.mjs before any polish:**

| | Aithon | Ragna | Act V for reference (balance-report) |
|---|---|---|---|
| kill time, Warden difficulty, the bot's profile build at L50 | 150-200 s (fail outside 110-240) | 170-230 s (fail outside 120-260) | Tower 35-106 s, Skotos 59-172 s |
| blows that land in a fight | 8 or fewer | 10 or fewer | 3-4 |
| lives of damage in a fight | 0.25-0.50 | 0.30-0.60 | 0.14-0.45 |
| largest single blow | 12% of max life | 12% | — |
| Wanderer | blows ×0.6, cooldowns ×1.25 from the first build (the owner's 16 November change, as the starting point and not a patch) | same | — |
| whole act | **anchored on Act V, not on Act VI as shipped.** Act VI was planned at ×1.2-1.45 of Act V and measured ×1.9-5.8 after the 16 November change. Act VII is planned at one more such step over Act VI's *plan*: about ×1.45-2.1 of Act V's measured act, which is below Act VI as shipped. The lead should confirm this anchor. | | |

- **The fight gets shorter when the player does the phase's one thing**, and a fail-safe does it for a player who does not. Skill buys time; nothing buys a longer fight.
- **Life** starts from Act V's 170 with dmg 2.2 (not Act VI's 185 and 240) and is set by the balance run to hit the band.
- **A retry checkpoint beside each arena** (`flags.cp7`): Hawk Hill's foot; the Hall's antechamber.
- One boss actor, one boss bar, one vulnerability at a time capped at ×1.5 (Act V's rule).

### aithon Αίθων, ο Ταύρος της Πομπής / Aithon, the Bull of the Procession
**CONCEPT.** A draught bull the colour of charcoal, yoked to a harrow whose teeth are brands, with a basket of the Unsleeping's coals slung under the yoke. He walks ahead of the Procession and ploughs its road in fire. He is not a monster: he is a working animal that has been kept awake with a bell all his life. mon.aithon «Αίθων, ο Ταύρος της Πομπής»; tagline mon.aithon.t «Ό,τι οργώνει, ανάβει» / "Whatever he ploughs, burns". No lines.

**What he teaches:** the Burn, three ways. Burnt ground stops him (phase 1). Your own fire, which goes out, beats his, which does not (phase 2). Without his fire he is only frightened (phase 3).

**Arena:** the Threshing Floors, a bowl of tall grass, r 22, with three stone floors (r 4). **The arena gets safer as the fight goes on:** every furrow he burns turns black, and black is where he stalls. The fight cannot drag, by construction.

**Data:** model 'aithon' (CAST → ['bull', 1]; stand-in ['silverhorn' → elk, 1.25], then ['warg']), hp from the balance run (start 170), dmg 2.2, speed 4.2 (charge 11), radius 1.1, atk 'strike', xp 190, boss, big, S.phases [0.66, 0.33], dieClip 'liedown', look { scale 1.5, tint 0x1a1614, tintAmt 0.7, rim 0xff7a30, rimI 0.35 }. Level max(40 + 2, hero + 1).

**PHASES**
- **Phase 1, «Το Αυλάκι» / "The Furrow" (100-66%).** The thing to do: **make his charge end on stone or on black.**
  - He charges in straight lines; each charge leaves a burning furrow (closed for 4 s, then black for good).
  - A charge that ends on a stone floor or on black ground: his hooves find nothing to burn and he skids. **Stalled 4 s, ×1.5.**
  - Fail-safe: three charges without a stall, and Signe beats out a patch with her cloak beside the hero (a blue teleCircle of r 4, 1 s, then black).
  - Signe: d.signe.k1.
- **The turn (66%).** A 3 s hold. The wind swings round (the dial spins, the grass lies the other way).
- **Phase 2, «Γυρίζει ο Αέρας» / "The Wind Turns" (66-33%).** The thing to do: **back-burn a patch, and let him run onto it.**
  - Every furrow still burning becomes a front that walks with the new wind for 8 s (the environment's telegraph: a 6 s gust). The stone floors and the black stay safe.
  - He charges wreathed in flame; touching him burns. When a charge crosses a patch the hero burnt herself, his flame gutters on it: **Stalled 5 s, ×1.5,** and the coal basket under the yoke hangs open (a node; each of three hits spills coals and takes 6% of his life, so the phase cannot stall even at low damage).
  - Fail-safe: 30 s without a stall on the hero's own black, and the next gust blows his furrow out behind him: one stall for free.
  - Signe: d.signe.k2.
- **Phase 3, «Χωρίς Ζυγό» / "Unyoked" (33-0%).** The thing to do: **sidestep, and strike while he is winded.**
  - The harrow drags dead behind him. No more fire of his own. Short, fast bolts (0.9 s tell) that each end Winded 2.5 s (×1.25). Two Firehawks drop one brand each, once.
  - Signe: d.signe.k3.
- **The end.** He kneels on the black and sleeps (d.aithon.die). The yoke lies where it fell: the echo's spot, and the place of Ember Memory 4.

**MOVES**
- Furrow Charge (phases 1-2): TELEGRAPH a teleLine 18 × 2.4 m, 1.2 s, as he paws | EFFECT 1.5× and knockback 12; the lane burns 4 s (closed), then is black. Ends Stalled on stone or black. Cooldown 7 s.
- Horn Toss (all phases): TELEGRAPH a teleCone 5 m, arc 1.2, 1.0 s | EFFECT 1.2× and a 3 m throw. Cooldown 8 s.
- Stamp (phases 1-2): TELEGRAPH a teleCircle r 5, 1.1 s | EFFECT 1.1×; lights the ring r 5-6, which burns 4 s and turns black. Cooldown 11 s.
- The Wind Turns (the 66% turn; environment): TELEGRAPH the gust, 6 s, the dial | EFFECT burning furrows walk downwind one cell every 0.5 s for 8 s; the lane rule protects the hero.
- Bolt (phase 3): TELEGRAPH a teleLine 12 × 2 m, 0.9 s | EFFECT 1.3×; ends Winded 2.5 s. Cooldown 4 s.
- Hawks (phase 3, once): TELEGRAPH two dive tokens, 1.2 s | EFFECT two spot fires of r 2.

**Echo.** «Θυμήσου τον Αίθωνα» / "Remember Aithon", at the fallen yoke, after `act7`. The embers remember it: the bowl's grass stands gold again for the fight (forced), Signe's calls are replaced by the bell, the fail-safes are automatic. The living bull goes on grazing by the brook; the echo wears the ember tint (0xff9a50 at 1.1, rim 0xffd0a0).

**ASSET.** The act's one download: a rigged bull or ox from Sketchfab, CC0 or CC-BY, to be scouted and provenance-checked at stage 0 before any download (reverse-image search, storefront check, licence re-read, as Act VI's gate did). **I did not scout it; I cannot name a file.** Build with the Node pipeline (decimate to ≤ 9k triangles, 1024 base, 512 normal; clips idle, walk, run, charge, rear, toss, stamp, skid, winded, liedown made in lib.mjs where missing). The harrow, the yoke, the coal basket and the brands are code. The same file at ×0.6 is the Yoke-ox. **No-download fallback, decided at stage 0 on any doubt:** the shipped elk (Silverhorn's model) at ×1.25 under a charcoal grade with the antlers trimmed by a runtime scale on the antler bones (**not verified** that the rig has separate antler bones; if not, the antlers stay and he is "the black stag of the Procession", «Αίθων, το Μαύρο Ελάφι»). The fight's rules do not depend on the body.

### ragna Ράγκνα η Άγρυπνη / Ragna the Wakeful
**CONCEPT.** The Master of the Order, forty years awake, fighting to stay so. She teaches as she fights, in a fixed order a student could learn, and between lessons her head drops. The fight is won by letting her nod. mon.ragna «Ράγκνα η Άγρυπνη»; tagline mon.ragna.t «Σαράντα χρόνια δεν έκλεισε μάτι».

**What she teaches:** Bank and Wake, and the act's argument. Silence the bell (phase 1). Bank what feeds the fire (phase 2). Then do less: an exhausted person falls asleep if you let her (phase 3).

**Arena:** the Hall of the Unsleeping, r 16. The basin (r 2.5, blocked) in the middle; four braziers at the cardinal points on r 11 (banked at the start); a gallery ring at r 13-15 where the Waker walks; eight boarded windows.

**Data:** model 'ragna' (people.glb `healer`, runtime grade; stand-in the `mage` body), hp from the balance run (start 170), dmg 2.2, speed 3.4, atk 'cast', xp 230, boss, S.phases [0.66, 0.33], dieClip Lie_Idle. Level max(43 + 3, hero + 1).

**The Nod** is the fight's one vulnerability and its clock. Whenever she nods, her ward is down (×1.5). A Waker on the gallery rings 1.0 s into each Nod and cuts it short; with no Waker awake, the Nod runs its whole length.

**PHASES**
- **Phase 1, «Το Μάθημα» / "The Lesson" (100-66%).** The thing to do: **put the Waker to sleep, then strike when she nods.**
  - A fixed rota, always in this order: Fire, Frost, Lightning, then a Nod (2.5 s; 5 s with no Waker).
  - The Waker has little life and does not fight. A new one walks in 25 s after the last was put to sleep.
  - Fail-safe: three Nods cut short, and Signe trips the Waker (he sleeps for one rota).
  - Signe: d.signe.s1.
- **The turn (66%).** A 3 s hold. d.ragna.p2. The four braziers flare.
- **Phase 2, «Ταΐστε τη» / "Feed It" (66-33%).** The thing to do: **bank the braziers.**
  - The Unsleeping throws one arm of white fire across the hall, r 16, turning at 30° a second (a turn every 12 s: the environment's telegraph, on Act V's beam helper).
  - Each brazier banked («Σκέπασε το μαγκάλι» / "Bank the brazier", 1.5 s; a hit worth 10% of max life interrupts) shortens the arm by 3 m and makes her nod for 3 s. With all four banked the arm is gone.
  - She casts Fire and Frost only. Never more than her one telegraph plus the arm.
  - Fail-safe: 30 s without a brazier banked, and Signe banks the nearest.
  - Signe: d.signe.s2.
- **Phase 3, «Η Άγρυπνη» / "The Wakeful" (33-0%).** The thing to do: **keep your feet and wait for the Nod.**
  - She leans on her staff. d.ragna.p3, in capitals, to herself.
  - Every cast ends in a Nod, 1.5 s at first and 3 s by the end. No Waker comes: they are asleep.
  - At zero she does not fall. She sleeps standing (2.4).
  - Signe: d.signe.s3.

**MOVES**
- Fire (phases 1-2): TELEGRAPH three teleLines fanning 25° apart from the basin through her staff, 14 × 1.6 m, 1.1 s | EFFECT 1.3× each line; a hero is hit by at most one. Cooldown by rota.
- Frost (phases 1-2): TELEGRAPH a teleCircle r 4 under the hero, 1.2 s | EFFECT 1.0× and the shipped chill; leaves slush for 4 s (tide.js `slushAt`). Cooldown by rota.
- Lightning (phase 1): TELEGRAPH three teleCircles of r 2 stepping toward the hero, landing at 0.9, 1.2 and 1.5 s | EFFECT 1.2× each.
- The Arm (phase 2; environment): TELEGRAPH always visible; a white band 1.6 m wide from the basin, turning | EFFECT 1.4× and a 1 s burn on touch; r 16 → 13 → 10 → 7 → gone.
- «Μην κοιμάσαι» / "Do Not Sleep" (phase 3): TELEGRAPH a teleCircle r 7 round her, 1.2 s, as she strikes the floor with her staff | EFFECT 1.2× and knockback 10. Cooldown 8 s.
- Ember Rain (phase 3): TELEGRAPH five teleCircles of r 2 near the hero, landing between 1.0 and 1.8 s | EFFECT 0.9× each. Cooldown 10 s.

**Echo.** «Ξύπνα τη μνήμη της Άγρυπνης» / "Wake the Wakeful's memory", at the basin, after `act7`. The hall's boards are up again for the fight (forced `shut`), the Waker is a bell ringing by itself, Signe's fail-safes are automatic. Tint: ember-grey (0x8a8078, rim 0xffe0c0).

**ASSET.** No download. people.glb `healer` (boot) with: a runtime elder stoop (the spine recipe Act V used for Selna, at runtime), hair tinted white, the Order's russet with a soot hem, a code staff topped by a covered censer, a code hood. Clips, all in moves.bin: Idle_Talking_Loop, a cast, Walk_Loop, and Lie_Idle; the Nod is a 0.6 s head-and-spine dip made at runtime (the `flinchQ` pattern), so it needs no clip. Look gate at stage 0: beside Elianthe in the people viewer.

---

## 6. Mechanics
Three, each an existing system with one new input, and each one is the story's argument turned into a rule.

### 6.1 The Burn (Το Κάψιμο): the Tindergrass, the Woodstore, Aithon's fight
**The existing system:** tide.js: cells that close in steps on a clock, with a 6 s warning, a lane that never shuts the hero in, a wash-out for a hero caught anyway, a HUD dial, and a synced host clock in co-op.
**The one new input:** wind over fuel, instead of water over a bed. A cell has `L.fuel` (dry grass, cordwood) or it does not.

**The rules, in the order the player learns them:**
1. **Fire walks with the wind.** A front is a line of burning cells that steps one cell downwind every 0.5-0.8 s. A burning cell is closed for 4 s (a wall you can see and shoot over, like lava). The HUD dial (tide.js `tideDial`) shows the wind and the next gust.
2. **The gust is the warning.** Six seconds before a front starts or turns, the grass lies flat (`WIND.uWind`), the wind sounds, and the dial pulses. The lead never changes with difficulty.
3. **What has burned will not burn twice.** A cell that has burned is black for the rest of the visit: no fuel, safe, and a place where the Order's fire-things stall or starve. Stone, water, packed road and green spring grass never burn.
4. **Back-burn** («Αντιπύρ»): hold the action on fuel with no interact in reach, «Άναψε αντιπύρ» / "Light a backfire", a 1.5 s channel from the Cradle. A small true fire burns a circle the size of the Cradle's ring (3.5 m, and here the Lamplight Mastery track counts) in 3 s and **goes out by itself**. It leaves black. It is a fire that can go out, and that is why it saves you.
5. **Smoke lies downwind.** In the smoke band (8 m downwind of a front) foes are Shrouded (×0.3, the shipped rule) and the hero's Smoke meter fills (the Cold meter's slot and code, `z.smoke` in place of `z.cold`); at full, a 1.2 s cough (the root). It empties in 3 s in clean air and at once in water. It is never on outside smoke. **Fight from upwind.**

**Fairness** (the tide's guarantees, kept): the lane rule; a hero on a cell that would burn with no way out is moved to the nearest safe cell with 6% of max life lost ("singed out", the wash-out); fronts never spawn within 8 m of the hero; never more than two fronts alive in view; a front dies after 45 m or at any break.

**Class hooks** (no new buttons):
- Warden: Hammerfall-like blows and the shield bash beat out flame within 2.5 m: instant black.
- Mage: fire skills light fuel where they land (a back-burn at range); Frost Nova soaks cells for 15 s (unburnable; `slushAt`).
- Ranger: her wolf smells the wind and howls 2 s before the gust (an 8 s lead); it turns one Singe-wolf.

**Difficulty** (a `HAZ7` row set beside `HAZ6`; telegraphs never change): fronts every 80 / 70 / 70 / 60 / 55 / 50 s; singe-out 3 / 6 / 6 / 8 / 10 / 12% of max life; step time 0.8 / 0.65 / 0.65 / 0.6 / 0.55 / 0.5 s; the gust's lead 8 s on Wanderer, 6 s otherwise.

**Engine:** tide.js gains a mode (`'fire'`) beside its water mode: a front list instead of a level, `L.fuel` instead of `L.bed`, `fireAt(x, z)` beside `waterAt`. The lane, the wash-out, the dial and the co-op clock are reused as they are. New drawing: the burning-cell quads and the char attribute (Zones). **Not verified:** how cleanly tide.js's water level can be swapped for a front list; I read its exports, not its body. If it cannot, the Burn is its own 250-line module on `map.close()` and `map.open()`, which exist. Cost 4-5 d either way.

### 6.2 Bank and Wake (Σκέπασε, Ξύπνα): every hearth in the act, and Ragna's fight
**The existing system:** light.js's lamps: an interactable that is lit or not, with a pool, a checkpoint, and enemies that act on it (Act IV's Smoke-eaters snuff; Act VI's hero snuffs black lamps).
**The one new input:** a third state, **banked**.

| state | what it gives | what it risks |
|---|---|---|
| **awake** («Ξύπνα τη φωτιά», 1 s) | a pool of r 6: life regeneration, the Smoke meter cleared, a full potion once per waking, a checkpoint, a memory where there is one | a Brand-bearer left alone with it feeds it: it turns unsleeping (white, still), throws a front with every gust, and must be banked again (2 s). And nobody sleeps beside a bright fire: the beaten Wakeful within 10 m of an awake hearth get up after 40 s. |
| **banked** («Σκέπασε τη φωτιά», 1 s) | keeps the checkpoint; cannot be seen or fed; sleepers near it stay asleep | no pool |
| **unsleeping** (the Order's) | nothing | fronts, and a Waker's post |

So the loop is the lesson: wake a fire when you need it, and put it to sleep when you leave. The HUD shows a small coal icon over a banked hearth on the minimap and a flame over an awake one.

**The Cradle's lid.** In the Tindergrass the Cradle rides banked: no ring by day, and the lid opens by itself for a back-burn or a waking. In the Vigil House the lid is off and the ring is Act IV's. There is no toggle and no new button.

**Engine:** one field on the lamp interact and one branch in its use; the Brand-bearer's feed is the `snuffer`'s walk-to-lamp with the opposite result. 1.5-2 d.

### 6.3 Sleep (Ο Ύπνος): the Wakeful everywhere, and the hero at the cap
Two halves of one idea: the beaten rest, and so does the hero.

**(a) In a fight: the fallen are asleep.**
- **The existing system:** remains, and Act IV's Ashsmith (`forger`), which walks to the remains of the fallen and reforges them.
- **The one new input:** the remains breathe. A Wakeful at zero life lies down asleep. A Waker rings them up at 40% life. They pay loot and experience once.
- They sleep for good near a banked hearth or on any ground with no awake fire within 10 m.
- No Wakeful, no ox, and neither boss dies in Act VII. A burning cell never closes on a sleeper: the front steps round a sleeping body (one test in the step), because the game should not burn people the player has just spared.

**(b) At the cap: Rested (Ξεκούραση).** This is the act's answer to "why keep playing at level 50".
- **The existing system:** Mastery experience (progression.js; after level 50 experience fills Mastery levels).
- **The one new input:** the time the hero was away. `hero.played` is already written on every save (save.js:97).
- After `act7`, time away banks Rested: 1 minute for every 16 minutes away, to at most 30 minutes (a night's sleep fills it). While Rested, **Mastery experience counts double**. Nothing else changes: not loot, not damage.
- On the first town entry of a session with Rested banked, the boy says the line, d.wake.again «Ώστε ξύπνησες.» / "So you're awake.", and a toast shows the minutes: q.rested «Ξεκούραση: διπλή πείρα Μαεστρίας για {0} λεπτά» / "Rested: double Mastery experience for {0} minutes". HUD chip hud.rested «Ξεκούραση» / "Rested" (a noun, so it has no gender).
- The story's last idea becomes the player's habit: close the game, somebody else keeps the light, and you come back stronger for it. It is also the gentlest kind of return hook for a store release: it rewards stopping.
- Honest limits: the clock is the device's, so a player can cheat it; the cap and the size of the prize make that not worth guarding (**not verified** whether cloud saves carry a server time that could be used instead). Cost 1 d with its `rested` scenario.

**The Lamplight track gets its second zone-set.** mast.lamp.d «Ακτίνα του φωτός σου» already reads right: in the Tindergrass the ring it grows is the back-burn's circle and the waking pool; in the Vigil House, the Cradle's ring. No 14th track: Act VI's 13th was the answer to "points with nowhere to go", and a new stat every act would thin them all.

### 6.4 Memories, the vulnerability rule, co-op, touch
- **Ember Memories:** five, on the Lamp-Memory flow, with body class 'memory-ember' (2.6).
- **Vulnerability:** Act V's one rule. Statuses in this act: Stalled ×1.5, Winded ×1.25, Nod ×1.5. Never two at once; a boss caps at ×1.5.
- **Co-op** (host-led, docs/coop): the fronts and the wind are the host's clock, synced as the tide is; burnt cells go out on the `i` cell topic Act VI used for shards and slush, never in the world `w`; hearth states are bit masks in `l`; a guest may wake and bank the road's hearths and Ragna's braziers through Act VI's validated 'u' event; the story's interacts (the lid, Signe's three fires' memories, the feeder fires, the banking and the waking, the name) are the host's. Each player gives their own hero's name on their own page. `act7` joins `worldOf`. One protocol bump.
- **Touch and readability:** no new buttons; the back-burn is the action button on empty fuel. Telegraph palette as shipped (red and orange harm, blue a safe patch, white the Unsleeping's arm). By day additive telegraphs wash out on bright ground, so in `light: 'day'` zones `teleMat` draws a dark outline under the colour (fx.js; Act VI's 'dark' telegraph is the model, inverted): a `daytele` scenario at quality 0. Sound carries every timing: the gust, the bell, the bull's bellow, the hawk's cry.

### 6.5 World-state
`morn7` (the town's morning, the smoke on the southern horizon) → `lid7` → `tinderSeen` → `wake7_1..3` with `mem_e1..e3` → `aithonDown` (the plain's fronts stop; the horizon smoke thins) → `vigilSeen` → `bank7_0..2` (the white glow dims by thirds) → `ragnaDown` → `banked7` → `woke7` (the House `open`; the horizon smoke gone) → `sleep7` (the Order on the peaks; Isarn's lantern lit; the boy named) → `act7` (the Tindergrass `green`; `game.sub7`). Hero fields: `act7` (−1 by default, the boot migration as for act5 and act6), `name` (a string, empty by default).

The town reads these on every entry (`townFires`, `townPresence`): the 'farSmoke' sprite south while `morn7` and not `woke7`; 'townMorning' atmosphere for the hook and the last scene, and, after `act7`, whenever the session starts Rested; otherwise the town's night as shipped. The Farthest Light's southward flash is the scripted pulse of Act VI's hook, on `userData.flash`.

---

## 7. Optional: the Seven Good Nights (Οι Εφτά Καληνύχτες)
Act VI's optional seven were the Lost: people the world forgot. Act VII's are the opposite: seven people the hero knows, all living, all keepers of something, none of whom sleeps well. It is also this proposal's answer to "the after-the-act state of every living named character": the player puts them to bed.

**How it works.**
- Seven side hearths lie banked in the act's two zones (four in the Tindergrass: the Sheepfold, the Dry Plane, the Cistern, the Ninth Stone; three in the Vigil House: one in each feeder hall's far corner). Waking one and banking it again puts **a sleeping coal** in the Cradle («Πάρε ένα κοιμισμένο κάρβουνο» / "Take a sleeping coal"; one at a time). Toast q.coals «Κοιμισμένα κάρβουνα: {0}/7» / "Sleeping coals: {0}/7".
- Any coal can go to any of the seven people. At their fire: «Σκέπασε τη φωτιά του» / «της» / "Bank his fire" / "Bank her fire", 1 s. They say one line, lie down (Lie_Idle) and sleep until the hero leaves the zone. Flag `gn_<who>`. Toast q.goodnight «Καληνύχτες: {0}/7» / "Good nights: {0}/7".
- All of it can be done in the post-game. It sends the player back through six acts' zones on the shipped waypoints, with no new asset.
- **All seven** (`gnAll`): the Act VII blessing is worth ×1.25 (the shipped REMEMBERED constant, as Acts V and VI); toast q.gnAll «Εφτά καληνύχτες: η ευλογία του πρωινού δυναμώνει» / "Seven good nights: the morning's blessing grows stronger".

**The seven** (Greek first; folk register unless noted):
1. **Halda** (town): d.gn.halda «Εγώ; Εγώ κοιμάμαι όρθια στο αμόνι, σαν άλογο. ...Καλά. Μια φορά.» / "Me? I sleep standing at the anvil, like a horse. ...All right. Once."
2. **Leif's father** (town): d.gn.father «Κι αν κοιμηθώ και ξεχάσω πάλι τ' όνομά του; ...Λέιφ. Λέιφ. Όχι. Το θυμάμαι και κοιμισμένος.» / "And if I sleep and forget his name again? ...Leif. Leif. No. I remember it asleep, too." (d.v.son3)
3. **Elianthe** (town): d.gn.elianthe «Όλους σάς βάζω για ύπνο, κι εμένα ποτέ κανείς. Σκέπασέ την, λοιπόν. Και φύγε στις μύτες.» / "I put all of you to bed, and no one ever does it for me. Bank it, then. And leave on tiptoe."
4. **Brokka** (the Halls): d.gn.brokka «Εκατό χρόνια κοιμόμουν με το ένα μάτι στην πόρτα. Οι Τεφρόδετοι δεν χτυπούσαν. Απόψε, και τα δύο κλειστά.» / "A hundred years I slept with one eye on the door. The Ashbound didn't knock. Tonight, both shut." (d.brokka.1)
5. **Elati** (the Lanternglade): d.gn.elati «Οι Αειθαλείς δεν κοιμόμασταν· στεκόμασταν. Γερνάω, φλογοφέρε. Οι γέροι κοιμούνται το μεσημέρι. Θα το δοκιμάσω.» / "We Evergreen didn't sleep; we stood. I'm growing old, fire-bearer. Old people nap at noon. I'll try it." (+ .r «...Γερνάω, αδελφή. ...Θα το δοκιμάσω. Ξύπνα με αν χιονίσει φύλλα.» / "...I'm growing old, sister. ...I'll try it. Wake me if it snows leaves."; d.elati.aut3)
6. **Glaukos** (the Rope camp): d.gn.glaukos «Εμείς οι τυφλοί δεν ξέρουμε πότε νυχτώνει. Πες μου εσύ. ...Νύχτωσε; Καλά. Καληνύχτα.» / "We blind never know when night falls. You tell me. ...Has it? Good. Good night."
7. **Selna** (the Farthest Light; offered last, once the other six are done). Tern steps in front of her: d.gn.tern «Απόψε η βάρδια είναι δική μου, γιαγιά. Τα ξέρω όλα.» / "Tonight the watch is mine, Grandmother. I know them all." (d.selna.rest, word for word, given back to her; d.tern.again) Selna, no contractions: d.gn.selna «...Τα ξέρεις. Πες τα αργά. Δεν βιάζονται.» / "...You do know them. Say them slowly. They are in no hurry." From then on the nightly rite at the tower (the shipped 90 s `say` chain) is in Tern's voice on the nights the hero visits, and ends, as it has since Act VI, «Καληνύχτα.»

---

## 8. Blessings, echoes, legendaries, music
### 8.1 Blessings (three; header boon.h7 «Η φωτιά που κοιμάται» / "The fire that sleeps")
All on stat keys BOONS already uses (data.js:317-343), two stats each, in Act VI's power band. ×1.25 with `gnAll`.
- `ashlid` «Το Καπάκι της Χάλντα» / "Halda's Lid": { lifePct: 12, armorPct: 12 } (icon 'shield'). ×1.25: 15 / 15. — «Η στάχτη δεν είναι το τέλος της φωτιάς. Είναι η κουβέρτα της.» / "Ash is not the end of a fire. It is its blanket."
- `backfire` «Αντιπύρ» / "Backfire": { dmgPct: 10, area: 12 } (icon 'fire'). ×1.25: 12 / 15. — «Μια φωτιά που σβήνει μόνη της. Αυτή σε σώζει.» / "A fire that goes out by itself. That is the one that saves you."
- `morning` «Το Πρώτο Πρωί» / "First Morning": { cdr: 8, resRegen: 15 } (icon 'star'). ×1.25: 10 / 18. — «Ό,τι σκέπασες το βράδυ, σε περιμένει το πρωί.» / "What you banked at night is waiting in the morning."

### 8.2 Echoes and post-game
- **Echo refights,** once a day each, normal loot, no story consequences: Aithon at the fallen yoke («Θυμήσου τον Αίθωνα»), Ragna at the basin («Ξύπνα τη μνήμη της Άγρυπνης»). Toasts echo.rise7 «Η θράκα θυμάται τη μάχη...» / "The embers remember the fight..."; echo.done7 «Η ηχώ σβήνει. Η θράκα θα θυμηθεί ξανά αύριο.» / "The echo fades. The embers will remember again tomorrow."
- **What stays to play at the cap:**
  - Rested: double Mastery experience for up to 30 minutes after a night away (6.3).
  - The Seven Good Nights, across the whole world.
  - The green Tindergrass as a daylight farm (beasts only: wolves, hawks, oxen gone feral; no fronts), and the gold one on any difficulty the hero has not finished the act on.
  - The Lamplight track's second use.
  - The Shadow Gates, unchanged. Rested counts in them.
- **The town after the act:** Isarn's lantern burns small on the staff; Signe keeps the south gate; the boy has a name; the morning comes whenever the player comes back rested.

### 8.3 Legendaries (two, the bosses' first-kill drops through the shipped `legFrom_<boss>` hook)
| id | name | base | what it does | where |
|---|---|---|---|---|
| blacksoles | «Τα Μαυροπάτια» / "Blacksoles" | boots | +movement; burning ground and ground effects hurt you 30% less; in the Burn's zones your back-burn takes 0.8 s instead of 1.5 | Aithon's first kill |
| vigilRing | «Το Δαχτυλίδι της Αγρύπνιας» / "The Vigil Ring" | ring | +critical damage; **Rested Blow:** after 4 s without striking, your next hit is a certain critical | Ragna's first kill |

Both work in every act. The ring is the act's idea as an item: the pause pays.

### 8.4 Music (four themes and one variant, procedural, in audio.js's house style)
- **The sleep motif needs no new notes.** Act VI's hearth motif rises (G, B♭, D). Played falling (D, B♭, G) it is a thing lying down: it sounds whenever a fire is banked or someone sleeps. Rising again with the major third (G, B, D), as at Pherousa's relight, it is the waking.
- **'tinder'.** The game's first theme in a major mode: D Mixolydian, a shepherd's flute over plucked strings, with a low drum that enters only when a front is alive. In 7/8 (3+2+2) if the sequencer's `beats` takes an odd bar (**not verified**); otherwise 6/8. After `act7`, the same theme with birdsong in the ambient and no drum.
- **'aithon'.** A heavy 4/4 with a cowbell on every beat. The bell stops when he is Stalled. In phase 3 there is no bell at all, only hooves and the flute's phrase, faster.
- **'vigil'.** One held tone that never moves, the still flame's (Act VI's false-light tone, an octave down), and almost nothing else. With each feeder banked a partial drops out of it and a room sound comes in: breathing, a board creaking, at last a snore.
- **'ragna'.** Her rota is the tune: three short figures (fire, frost, lightning), then two falling notes for the Nod, cut off by a handbell while a Waker stands. In phase 3 the falling notes grow longer each time.
- **'morning'** (a variant of 'town', for the hook and the end): the town theme in the major, with the lantern motif (audio.js `MOTIF`) once, quietly, when Isarn's lantern is woken. It replaces 'victory' for this act.
- **SFX (about 14 new):** gust, grassFlat, frontCrackle, backfireOut, bankFire (a shovel of ash), wakeFire (a breath and a catch), handbell, yawn, snore, bullBellow, harrowDrag, hawkCry, brandDrop, shutterDown. Reused: the hearth crackle with vibrato, the false tone, slush, cask burst, the tower bell for the Farthest Light's answer.

### 8.5 New text
About **240 bilingual lines**, in the families used above: d.morn.*, d.child7.* and d.child.bark7, d.halda7.*(.w), d.signe.*(.m, .r), d.lid7, d.tinder.*, d.coal.m1-m5.*, d.aithon.*, d.wakeful.*, d.adept.*, d.vigil.*, d.rolls.*(.m, .r, .w), d.ragna.*(.m, .r, .w), d.bank7.*, d.wake7.*, d.home7.*, d.name7(b), d.sleep7.*, d.wake.again, d.gn.*(.r), the after-act barks (d.brokka.v7, d.elati.v7(.r), d.tam7.v1, d.selna.v7, d.tern.v7, d.alk.v7, d.glaukos.v7, d.elianthe7.*, d.leif.v7 and .bark7, d.first.v7.m), q.40-q.47 and q.45b, the toasts, zone.*, exit.south, exit.vigil, wp.*, mon.*, echo.*, boon.*, leg.*, hint.black7 «Ό,τι κάηκε δεν ξανακαίγεται. Το μαύρο είναι ασφαλές.» / "What has burned won't burn twice. The black is safe.", hint.bank7 «Σκέπασε τη φωτιά πριν φύγεις. Ξύπνα τη όταν γυρίσεις.» / "Bank the fire before you leave. Wake it when you come back.", hint.wind7 «Όταν πλαγιάζει το χορτάρι, έρχεται φωτιά με τον αέρα» / "When the grass lies down, fire is coming with the wind", hud.rested, hud.smoke «Καπνός» / "Smoke", hud.asleep «Κοιμάται» / "Asleep", name.ask, npc.signe, npc.ragna, npc.arna, npc.coalMemory, act6.next (replaced), act7.done/.sub/.next, game.sub7.

Registers: Halda, Signe, the boy, the Wakeful and every home bark are folk (contractions in English). Ragna, Selna and the Saltborn keeper in Ember Memory 1 are grand (none). The narrator is present tense and second person where the hero acts, as shipped. Numbers are spelled out; "three nights", "forty years" and "a thousand years" are the act's rhythm words.

---

## 9. Engine work, assets, risks, cost
### 9.1 Engine work (focused days for one agent who knows the code; estimates)
| # | item | reuses | days |
|---|---|---|---|
| 1 | Act 7 plumbing: `ZONES`, `READY`, the generator dispatch, `questText` clamp, `actComplete(7)`, `offerBoons`, the boot migration, waypoints, echo tints, the `light: 'day'` kind, `.w` in `rl()` | Acts V-VI's siblings | 1.5-2 |
| 2 | `gen7.js`: `genTinder`, `genVigil` (crypt stamps), and `tools/check-act7.mjs` | gen6.js, genlib.js | 7-8.5 |
| 3 | Daylight: `ATMOS.tinder` / `townMorning` / `vigil` / `vigilOpen`, cloud shadows, the day telegraph outline, a sky dome for two cines | atmos.js, groundMat, fx.js | 2-2.5 |
| 4 | The Burn | tide.js, the lava quads, the `aSap` attribute | 4-5 |
| 5 | Bank and Wake | light.js lamps, the `snuffer` walk | 1.5-2 |
| 6 | Sleep in fights (sleeping remains, the Waker, fronts stepping round sleepers) | remains, `forger` | 1.5 |
| 7 | Rested | progression.js, `hero.played` | 1 |
| 8 | Eight enemy kinds (data, grades, hooks) | shipped AIs | 3-4 |
| 9 | Aithon; Ragna | `boss()`, `charger`, Act V's beam helper | 5-6 |
| 10 | Story: the hook, six cines, five memories, the catch-ups, the name card, the home scene, the lantern | story.js patterns | 4.5-5.5 |
| 11 | The Seven Good Nights | interacts and flags | 1.5-2 |
| 12 | Text (about 240 lines) and proofreading against text.js | — | 2-2.5 |
| 13 | Music and SFX | audio.js | 2.5-3 |
| 14 | Assets: the bull's build (or the elk's grade), code props, the optional `chaff` layer | tools/creatures, envlib | 2.5-3.5 |
| 15 | Co-op | Act VI's 'u', `i` and `l` | 2-2.5 |
| 16 | Scenarios (tinder, aithon, vigil, ragna, ending7, cast7, echo7, burn soak, rested, daytele, cp7) and the balance-act campaign | scenario.mjs, balance-act.mjs | 4.5-5.5 |
| 17 | Blessings, echoes, legendaries | data.js | 1 |
| | **Total** | | **about 47-58** |

**Order that protects the lesson of Act VI:** the balance campaign runs at the end of the stage that builds the two bosses, on grey-box fights, **before** any cine, line or music is attached to them. If a boss is outside its band then, its phase rules change, not its numbers.

### 9.1b The brief's five lessons (`docs/act7-briefs/brief.md`), answered one by one
1. **Bosses of 2-4 minutes, no least-time locks.** Bosses, above: no `*_MIN` table exists in this act; phases turn on life; each boss has 8-10 landing blows budgeted against Act VI's 81-146; the arena of the first gets safer as the fight goes on, and the second is won by waiting for a Nod. **The same moments for the three classes:** a stall, a back-burn patch, a banked brazier and a Nod do not care whether the hero swings, shoots or casts. **Wanderer is easier in pace, not only in numbers:** blows ×0.6, cooldowns ×1.25, the gust's lead 8 s, the Waker's replacement 35 s instead of 25, and both fail-safes fire one step sooner.
2. **A measure of danger that means something at the cap.** The scenarios and the balance run report, per fight and per zone run: lowest life seen, deaths, seconds under 30% life, and potions drunk, beside lives of damage. Targets on Warden difficulty for the profile build: each boss takes the hero under 50% at least once in half the runs and under 30% for no more than 6 s in total; a death in no more than one run in twelve.
3. **Zones worth fighting at the cap.** Act VI's zones cost 0.05-0.33 lives a run because a capped hero heals chip damage back. The Tindergrass does not deal chip damage: its danger is position. A front does no damage to a hero who reads the gust; a hero who does not is singed out for 6% and loses ground, and the Smoke cough (a 1.2 s root) in a pack is what kills. Target: 0.4-0.8 lives a run and a lowest life of 40-60% on Warden difficulty, with at least one moment under 50% in most runs; the Vigil House the same through the Bellows' lines and the Wakers' re-woken packs.
4. **Tests that stay true.** Each stage's scenarios assert against the finished act's rules (a `tinder` scenario written at stage A already expects fronts, hearths and packs to be present or explicitly absent by flag), and every scenario carries a `retire:` note naming the stage that replaces it. `check-act7` is the one layout authority from the first stage to the last.
5. **Not a third blue act.** Gold grass, black ground, red fire lines and a blue sky by day; whitewash, soot and one white flame indoors. There is no ice, no water to speak of, and no night except the one the Order built.

### 9.2 Assets (estimates until built and measured)
| what | source | raw | phone texture |
|---|---|---|---|
| The bull (boss and Yoke-ox) | one Sketchfab download, gated at stage 0; **not scouted** | ≤ 0.7 MB | about 7 MB |
| — or the elk | shipped (Act III file), loaded alone | 0 new | about 7 MB if not resident |
| The Skua (Firehawk) | shipped (Act V file), loaded alone | 0 new | about 7 MB if not resident |
| People: Signe, Ragna, the Wakeful, the Waker | people.glb scenes, runtime grades, code parts | 0 | 0 new (boot) |
| Cinderling, Singe-wolf, Sleepless | boot creatures, runtime grades | 0 | 0 new |
| Props: way-stone, harrow, yoke, litter, handbell, basin, braziers, shutter boards, cordwood, the lid | code meshes; the shipped cask and brazier | 0 | 0 |
| Ground: straw, char, road | the boot `grass` and path layers under tints | 0 | 0 |
| Optional `chaff`: one dry-grass layer, one whitewash wall layer (d 1024, n 512 each) | Poly Haven or ambientCG, CC0 | about 0.8 MB | about 14 MB |
| **The act** | | **0.7-1.5 MB new** (plus up to 0.4 if both optional layers) | **about 14-28 MB**, against the 110 MB cold-start bar |

`ACT_FILES.act7 = ['bull', 'skua']` (or `['elk', 'skua']`). No people set, no folk, grove, ash or frost load. The unload of Acts II-IV (unload.js) applies on entering either zone, as for Acts V and VI.

### 9.3 Risks
- **The subject is wildfire, and the owner and many first players are Greek.** A fire crossing dry grass toward a village and a wood is not an abstract image in Greece. The act is built to be on the right side of that: no home burns, nobody dies (not even the people the hero fights), the wood is reached by no flame if the player finishes q42, and the two things the hero is taught (burnt ground is safe; a backfire that goes out can save you) are what people who fight such fires know. But it is the owner's call, and it is owner question 1. If the answer is no, the fallback keeps the whole story and moves the Burn indoors: the Tindergrass becomes the old road's stone causeway through reed-beds, with fronts only in marked reed patches.
- **Daylight on a renderer tuned for night.** Every material, tint and telegraph in the game was graded under a moon. Risks: flat ground, washed-out additive telegraphs and loot beams, a visible fog wall at the map's edge. Mitigations: cloud shadows and sun shadows for depth; the day telegraph outline; fog kept pale so the edge reads as heat haze; a look gate at stage 0 on the owner's phone at quality 0 and 1 with one screen of grey-box plain, before anything else is built. If the gate fails, the fallback is a low gold sun (the Weeping Woods' atmosphere, shipped) with long shadows: late afternoon instead of noon.
- **The Burn's fairness.** Fire that closes cells can feel like the game cheating. The tide's lane rule, the 6 s lead, the 12 m refuge rule and the singe-out are all hard checks; the Dry Brook teaches the tell where nothing can go wrong. A `burn` soak scenario runs 200 fronts over 40 seeds and fails on any hero shut in.
- **Perf by day.** No hero light and no Shroud pass in the Tindergrass helps; the grass instances and flame billboards cost. Caps by quality, flames only within 22 m, perf7 at quality 1 under mobile emulation at no more than the Field's frame time.
- **"Nobody dies" against loot expectations.** Sleepers pay once; a Waker's re-woken adept pays nothing; the bot and the scenarios assert no farm loop.
- **The name card.** Free text on a phone: an on-screen keyboard over a cine, profanity, long strings, right-to-left input. Limits: 16 characters, letters and spaces of any script, trimmed; shown only on the player's own device and to co-op partners (a guest's name is its own). Leaving it empty is a complete path with its own lines. The save slot shows the name beside the class.
- **Canon additions that need the owner's word** (question 5): the Order as the North's old school; the Mage as a student who left; the Warden's people as "the house that stayed"; the boy's name; Isarn's lantern woken. None contradicts a shipped line that I could find; all are new.
- **IP hygiene.**
  - *Dark Souls:* a flame kept for ages by a keeper who must not let it die is that game's ground. This act is the refusal of it: the flame is not the first (Pherousa's is older, and is not called that either), nothing is linked, kindled or sacrificed, the keeper is never alone, and the solution is to let the fire go down to coals and sleep. No line says "first flame", "kindle", "link" or "age of". The Greek «ακοίμητη» is a household word.
  - *A Song of Ice and Fire:* red-robed fire-priests marching north against a dark. The Order is a school, not a church: masters and students, lessons and rolls, no god, no prophecy, no burning of people. The robes are the Mage's shipped colours. Keep the vocabulary scholastic.
  - *The Wheel of Time* and others use "the Unsleeping" as an epithet in passing; it is generic English. If the owner prefers, "the Wakeful Flame" works for the English, at the cost of colliding with Ragna's epithet.
- **Class lines for the Warden** need `.w` in `rl()`: one clause, but it is story code, and the 20-odd shipped `.r` and `.m` keys must be re-run in the cast scenario.
- **Things I did not verify** and that stage 0 must: a clean bull on Sketchfab; whether the elk's antlers can be scaled away; whether tide.js can take a front list; whether `forger` and remains work for people-rig bodies in a sleeping pose; whether audio.js takes a 7-beat bar; the `villager2` and `healer` look gates; every memory figure in this document.

### 9.4 What this proposal deliberately does not do
- No new rendering system, no render target, no post-processing, no sky in play, no real height.
- No new people set and no set load; one creature download at most, with a no-download fallback.
- No line, scene or fight for the Skotos. No Karthax by name. No return of Isarn.
- No keeper left alone by a fire, and no one killed by the hero's hand but beasts.
- No change to how the Shadow Gates play.
- No time floor on any boss phase, and no blow without a telegraph of 0.9 s or more.
- No always-on meter: Smoke fills only in smoke.
- No 14th Mastery track, and no new button.
- No journey to the far South, no Dain, no Sailor's port: the road is opened, not walked.

### 9.5 Cost and cut order
**About 47-58 focused days** (Act VI's design said 47-59). The cuts below, in order, save about 8 days and leave **about 39-50**:
1. The optional `chaff` layers: ship on tints (0.5 d).
2. The sky dome: keep both cines' pitch above the horizon line (0.25 d).
3. The Oil Cellar's own hazard: it shares the Woodstore's (0.5 d).
4. The Firehawk: Sparkcasters lob the brands instead (0.75 d).
5. The bull: the elk fallback from the start (1-1.5 d, and no provenance gate).
6. The Rolls room and Ember Memory 4: folded into Signe's dialog (0.5 d).
7. The Good Nights from seven to three (Halda, Elati, Selna with Tern) (0.75 d).
8. The `green` reading: an atmosphere and tuft-colour swap only, no ground blend (0.75 d).
9. Guest-usable hearths in co-op: host only (0.75 d).
10. The Sleepless: more Wakeful in the Gallery (0.75 d).
11. The Warden's `.w` lines (0.3 d).

**Never cut:** daylight; the black patch; bank and wake; that nobody the hero beats dies; Ragna falling asleep; the banking and the waking; the name; the hero's sleep; the last line; Rested.

---

## 10. Questions for the owner
1. **Is a grass fire the right enemy for this game, in Greece?** It is the heart of the act's look and of its best rule ("the black is safe"), and it is handled with care: no home burns, nobody dies, the wood is saved. *Recommendation: yes, with those guardrails written into the contract.* The fallback (fire only in marked reed patches along a stone road) keeps the story and loses half the picture.
2. **Does the player type the hero's name at the end?** One optional field, when the boy asks. It is the only time the hero "speaks", and the player does it. *Recommendation: yes; empty is allowed and has its own lines.* The alternative costs nothing: the narration says «Του λες το όνομά σου.» and the name is never shown.
3. **Is the village boy called Arna?** He has had no name for three acts. Whitecliff lit Arna's hill by hand; a village names its children for its hill. It rhymes the first Wayfarer, "a boy with a lantern", with the child who promised to remember, and claims nothing more. *Recommendation: yes.* Alternative: he stays «ο μικρός» and only asks.
4. **Rested: double Mastery experience for up to 30 minutes after a night away, greeted by «Ώστε ξύπνησες.»** It is the reason to return at the cap, it rewards stopping instead of grinding, and it suits a store release. *Recommendation: yes, at these numbers, measured after two weeks of play.* Alternative: the greeting without the bonus.
5. **Three small pieces of new canon about the hero and one about Isarn's lantern.** The Mage left the Order to look for a north his masters denied; the Warden's people are "the house that stayed"; the Ranger gets no new past (she has hers); and the hero wakes Isarn's sleeping lantern and hangs it on his staff, where nobody has to carry it. *Recommendation: accept all four.* Each is one or two lines and can be cut singly; the lantern is the one I would fight for.

---

## 11. The payoffs, in one table
| shipped line | where Act VII answers it |
|---|---|
| intro.5 «Η δική σου φωτιά είναι η τελευταία.» | Ember Memory 2; Ragna's phase 3; d.sleep7.1 |
| d.isarn.1 «Ώστε ξύπνησες.» | the act's last line; every rested return |
| d.isarn.2 «Κοίτα βόρεια.» | the boy's «Κοίτα νότια.» |
| d.staff «Ξεκουράσου.», d.selna.rest, d.first.7, boon.rest.q | q.46; d.sleep7.2; Tern's Good Night to Selna |
| d.answer.0 "as if falling asleep" | the lantern woken, d.home7.4 |
| d.alk.a3 "fires that can go out"; d.first.1 | the Farthest Light answers the Order, d.home7.2 |
| d.alk.a5.m; d.first.1.m; class.mage.d | Ember Memory 1; d.ragna.w7.m; d.first.v7.m |
| d.asger.2 | d.signe.asger1-2; d.rolls.asger |
| d.lamp.m5.1-3 (Isarn at ten) | Ember Memory 5 (Ragna at ten) |
| d.lamp.m2.2 "never let it out of our sight"; altar.sub | the Vigil as a cage with no shard |
| d.halda.stars, d.halda.aur, d.halda6.v2 | d.halda7.sun; d.bank7.3; d.brokka.v7 |
| d.brokka.c3, d.halda.cradle | the Cradle's lid, d.lid7 |
| d.peaks.2, d.leif.bark | d.ragna.w8-w9 «Με βάρδιες.»; d.halda7.h1 |
| d.child.3 «Θα το θυμάμαι.»; d.tern.again | d.child7.8-10; d.tern.v7 |
| d.elianthe.1 "the birds don't sing" | d.elianthe7.v1 |
| d.elati.aut3 «Επιτέλους.» | d.ragna.5.r; d.gn.elati |
| boon.north.q, the wind and the smoke | the hook; the Burn |
| game.sub6 «Ακόμα και το σκοτάδι κοιμάται» | game.sub7 «Και η φωτιά κοιμάται» |
| the First Shard's «Είναι ζεστό, σαν να ανασαίνει.» | d.bank7.2 |
