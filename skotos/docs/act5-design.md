# Act V: The Frozen Coast

Act V begins from a save at quest 23 (`newFire`). The Ash Crown is unmade, Whitecliff's beacon burns white-gold from Isarn's lantern, and a fourth fire answers far to the north that "no one we know lit" (d.answer.4).

A stranger is waiting at the beacon: **Alkyone of the Saltborn** (Οι Αλιγενείς), a fourth people that history forgot. They keep the sea-lights (φάροι) of the northern sea, and for a thousand years they watched the North's fires and never answered one, because they answer only fires that can go out. Her mother Selna lit the fourth fire. While Alkyone is speaking, the fourth fire gutters and goes out on the horizon.

Under the sea ice sleeps **the Skotos** (το Σκότος), the dark that was there before the first fire. It lives on forgetting. For a thousand years every beacon in the North burned with a tyrant's wish never to be forgotten, so every peak remembered every night, and a thing that lives on forgetting could not lift its head. Nobody knew, the tyrant included. The North did right to forget him, and on the Night Without Fires every crown-fire went out at once. Now it stirs.

The hero carries one coal of Whitecliff's fire north in the Ember Cradle, past the Black Anvil, to a coast of tides, wrecks and singing ice. There she:
- relights three sea-lights, each holding an ice memory;
- fights an island that stands up and walks, a crab the size of a hill with a dead sea-light on its back;
- watches the sea freeze in one night as the Skotos pulls the warmth out of it to rise;
- crosses the frozen sea, sealing the Skotos's Breathing-holes with light;
- remembers a woman the whole world has forgotten;
- and gives Whitecliff's fire to the Farthest Light while the Skotos rises out of the sea at the ice edge.

The twist is quiet and built from shipped lines. Arna called a name on the Field of Ash and no one answered (d.lamp.m1.2). His brother Einar lived. The Saltborn carried him north, wounded, with the dead and dying of every people. Einar lit the Farthest Light facing south, "so he can find me". He never saw his brother again. Old Arna, who "walks north without a light, and does not turn to look back" (d.lamp.m4.3), was walking toward it. In the finale Whitecliff's fire, which is Arna's own flame (d.k.tear, d.answer.0), climbs Einar's tower: two brothers, one light.

The Skotos is not killed. It is named. In the keepers' oldest rite the names of the dead are said into the dark, the hero gives the name she carried from Whitecliff (Isarn), and last of all the dark is named so it cannot hide: «Σκότος.» The screen cuts to black and the game's own title appears in white. From then on the title screen reads «Το σκοτάδι έχει όνομα» / "The dark has a name".

The act ends at home. A village child asks who the people with the lanterns are, and the hero tells him their name. It is the mirror of Isarn's last request about the tyrant (d.isarn.u3): tyrants die by being forgotten, peoples live by being remembered.

**How this design was made.** Three designs (story, mechanics, spectacle) were judged twice. The first judge, weighting story and gameplay double, scored mechanics 65, story 63 and spectacle 62.5. The second judge, weighting feasibility and assets double, scored spectacle 63, story 55 and mechanics 50. The judges disagree, so this design starts from the design with the higher combined total: **spectacle (125.5)**, ahead of story (118) and mechanics (115). Its zones, its render plan, its asset list and its phone budget are the spine. Every graft the judges listed is placed where it fits, and every must-fix item is fixed. The traceability tables are under Synthesis, just before the Judges' verdicts.

**Scope** (the owner's frame is Act IV's; Engine work says honestly where this act is larger):
- **2 zones:**
  - `coast`, «Η Παγωμένη Ακτή» / "The Frozen Coast", level 28. It is read two ways in the base: tidal (q25-27), and after the Freeze with Skerry Bay frozen and the road north open (q28 on). A full frozen reading of the whole coast and a spring reading after the act are out of the base scope (stretch).
  - `farlight`, «Ο Έσχατος Φάρος» / "The Farthest Light", level 31: the frozen sea out to the last sea-light.
- **7 regular enemy entries (8 kinds),** counted the way Act IV counted the Ash-Fallen and their bowmen:
  - 3 kinds from the Quaternius people pipeline, in a new `frost` set: the Sunken, the Sunken Harpooner, the Ice Singer;
  - 3 Sketchfab creatures: the Hull-louse (a CC0 museum scan), the Icemaw (a leopard-seal sculpt), the Skua (a gull);
  - the Reefback, the first boss's own crab at ×1.5, so it costs no download;
  - the Rime Bear, the shipped WildMesh bear regraded at runtime.
- **2 bosses:**
  - Skerry, the Walking Tower: Sketchfab "Crab mountain" at ×4, with a ruined sea-light from the act's own pack fixed to its shell;
  - the Skotos: Sketchfab "Ocean Creature", with its Hands from "Tentacle (rigged)".
- **Quests 24 to 30;** the new end state is **31**. Seven steps where Act IV had six, because the act ends with a walk home.
- **3 mechanics:**
  - the Tide (Η Παλίρροια);
  - the Cracking Ice (Ο Πάγος που Ραγίζει);
  - the Sea-Lights and the Cold (Οι Φάροι και το Ψύχος): beams that reveal the Skotos's creatures, light that holds the ice, whale oil that melts it, and a Cold meter built only by water, wind, plunges and hits.
- **A world-state chain:**
  1. `coastCall`: the fourth fire goes dark over Whitecliff;
  2. `hearth`: the Landing is lit again under a green aurora;
  3. `frozen`: the Freeze. The sea freezes in a night, the aurora turns black, and the Ice Road opens;
  4. `hole0`-`hole2`: the Breathing-holes freeze shut, one lead at a time;
  5. `seaLit`: the Farthest Light burns, the true aurora returns from south to north, and the sea-lights flash on Whitecliff's northern horizon.
  - (`iceOut`, the coast's ice going out the morning after, belongs to the stretch spring reading.)
- **Also:**
  - three Act V blessings, worth ×1.25 to a hero who lit all four Name-stones;
  - five music themes, a sea-light motif and an ice-song instrument;
  - echo refights of both bosses;
  - two Act V legendaries, the bosses' first-kill drops;
  - difficulty unlocks from any act; the sixth difficulty «Σκότος» is out of the base scope (the owner's call);
  - the Shadow Gates stay the post-game, unchanged.
- **Budget** (engine brief §5.3: ≤ 9 MB raw, ≤ 110 MB phone GPU): about 8.0 MB raw (≈ 10.5 MiB of artifact) and about 93-100 MB of phone GPU texture, itemised under Assets. These are estimates until the frost set and the rime pack are built and measured; the frost set is built first and gated on its measured texture count.

**The look in one idea: put the sky on the floor.**
- The gameplay camera never sees the sky. Its pitch is 0.95 rad with a 38° field of view (gfx.js:16,46), and `scene.background` is the fog colour.
- But the Frozen Coast's floor is water and ice, and both are mirrors. The water and ice shaders reflect an aurora computed along the reflected view ray, the trick the Amber Mere already uses to mirror its trees' crowns (build.js:1735-1739). So the player sees the aurora under her feet in every frame of play.
- The aurora as a sky dome is kept for the cinematics, which lower the camera (`c.pitch`, boot.js:309).
- At the Freeze the aurora turns black: one uniform, `uAurDark`. When the Skotos is named it comes back, green and white, in a front that sweeps from south to north (`uAurFront`).

## Story
### premise
**At quest 23.** Act IV left Whitecliff's beacon burning white-gold, lit by hand, with three answering fires and a fourth far to the north (d.answer.4). It also left two acts of kindling north of Whitecliff that no one explained:
- the fourth fire itself;
- every lantern in the Lantern Graves, lit "one by one" at dawn (d.field.dawn).

Act V explains both with one family.

**Who the Saltborn are.** «Οι Αλιγενείς» / "the Saltborn" (singular «Αλιγενής»), a fourth people, older than the war, living on the frozen coast beyond the Black Anvil. The name matches «Λιθογενείς» / "Stoneborn" on purpose. Their names are Greek sea-words: sea-birds, sea-colours and nereids (Alkyone, Glaukos, Thaleia, Galini), a phonology no other people in the game uses.

They keep sea-lights (φάροι), a word the game has never used. A sea-light is plain fire, whale oil and driftwood behind glass, lit by hand and kept by hand. It is never a φρυκτωρία, so d.isarn.e1 ("every beacon in the North was lit from this lantern") stays true.

Their creed is older than any shard:
- «Φως στο νερό, για να μείνει το νερό νερό.» / "Light on the water, so the water stays water."

Their custom is to answer only fires that can go out. For a thousand years they watched the beacons burn on the southern peaks and never answered: those were the ember king's fire, embers that never die (intro.1). On the Night Without Fires (d.u.night) every beacon went out at once, and the ice sang. The next night one small white fire was lit by hand at Whitecliff (d.answer.0). Selna, the eldest keeper, climbed the Farthest Light and raised it to full to answer: the fourth fire.

**Why the North forgot them.** Three reasons, each true and none of them a lie in intro.2:
- **They were never counted.** During the war they came over land, at night, with their lanterns covered, down the pass at the Field of Ash's northern edge before the Anvil's smoke and the watch closed it, and carried off the wounded of every people. They never stayed to be counted. So intro.2 names three peoples, and the Lamp Memory of the fallen (d.lamp.m1.2) names three. Nothing in either line is false; it is incomplete, which canon allows. The Field of Three Banners keeps exactly three banners.
- **The way was shut for a thousand years.** The Black Anvil's smoke choked the pass beyond it, and the Wayfarers kept the Anvil Gate, where no one passed with fire. A Saltborn never walks without a light. The watch that kept the crown from its forge also, without meaning to, kept the North and the coast apart. Since the mountain stopped breathing (d.forge.cold), the pass is clear and the far north can be seen.
- **The beacons made them unnecessary.** With the crown's fire on every peak the dark sank, the ships stopped coming, and the Saltborn dwindled. A fire that remembers one name forgets all the others: «Για να μην ξεχαστεί ένας τύραννος, ξεχάστηκε ένας λαός.» / "So that a tyrant would not be forgotten, a people was."

**The hook.** Alkyone walked south to see who lit a fire by hand, and lit the Graves lanterns on her way, "what we do for the dead": the hands behind d.field.dawn. While she is telling the hero this at Whitecliff's beacon, the fourth fire gutters and goes out. Her mother Selna and her son Tern were keeping it. She asks for a flame from Whitecliff's fire, and for the beacon-keeper to come north.

### villain
**Το Σκότος / the Skotos.** A neuter noun, as canon requires: το Σκότος, του Σκότους, στο Σκότος. In English always "the Skotos". It is never called an abyss, an Old One or a Long Night.

**What it is.** The dark that lay over the sea before the first fire. It has no wish, no face and no plan, so it is a force and not a tyrant.
- **It lives on forgetting.** Whatever it covers, the world forgets: ships that sail into it are forgotten by their ports, the drowned by their mothers, a light it drinks goes out and no one remembers it burned.
- **It is held by remembering:** a light that is tended, and names said aloud.
- So the first Saltborn built lights at the water's edge, lit them every night and said the names of their dead. Last of all they said its own name, «για να μην κρυφτεί» / "so it cannot hide".

**How the crown's fire held it back, without anyone knowing.** This is the owner's pillar, word for word.
- Karthax wished never to be forgotten (mon.karthax.t). His fire burned on every peak "from the sea to the mountains" for a thousand years and never once went out, and every beacon was lit «Για να μην ξεχαστεί» / "So no one forgets" (intro.3, d.lamp.m3.2).
- So every night the whole North remembered, by the tyrant's own fire, and a thing that lives on forgetting sank deeper than it had ever been.
- It was a side effect of a vain man's wish. Not the Wayfarers, not the Saltborn (who believed their own lights held it), and not the ember king himself knew. Karthax was not its jailer by design, and the crown was not forged against it (canon rule 2).
- The North then did the right thing. It unmade the crown and began to forget the tyrant, «Έτσι πεθαίνουν οι τύραννοι.» / "That is how tyrants die." (d.isarn.u3). For the first time in a thousand years nothing on the peaks remembered. The ice sang that night.

**Its voice.**
- It speaks seldom, always lowercase, in fragments that open with an ellipsis, in the voices of what it has taken. It may say "we", never «εγώ» / "I", until its very last line.
- Its word is «κανείς» / "no one", the word the game has used since Act I for the brother no one answered.
- It never threatens. It offers what a grieving hero wants: to put the weight down, to stop remembering, to rest. Once it mocks Isarn's last word: «...ξεκουράσου... αυτό δεν σου είπε;...» / "...rest... isn't that what he told you?...".
- It turns the game's opening line, intro.4 «Απόψε σβήνουν, η μία μετά την άλλη.», into a law: «...σβήνουν, η μία μετά την άλλη. πάντα σβήνουν...» / "...they go out, one after another. they always go out...". The Saltborn answer: «Κι ανάβουν ξανά. Η μία μετά την άλλη.» / "And they're lit again. One after another."
- **Delivery:** floating `say` lines in a pale ice colour, each over the ice-song sound. When the ice sings, it is listening. Its dialog portrait is a black disc, npc.skotos «Το Σκότος» / "The Skotos".

**What it does in play.**
- It drinks the Farthest Light (q24) and, at the Freeze, the warmth of the whole sea and the aurora itself.
- It wakes the Skerry, an island that slept for a thousand years under a sea-light.
- It raises the Sunken with the flood tide.
- It sings the ice open through the Ice Singers.
- It breathes through three Breathing-holes in the new ice.
- It makes the world forget Selna, who walked out onto the ice to say its name to its face.
- At the Farthest Light it takes a shape: a faceless figure of black water twelve metres tall whose robe is its own arms, standing waist-deep in the sea at the ice edge, while more of its Hands break up through the ice.

**Why it is not killed.** You cannot kill the dark. You light a fire, keep it lit and call the dark by its name. Then it sinks and the ice closes over it, as it did once before.

**What it never does.** It grants no wishes (all four shards are unmade), never takes over Karthax, never uses a living person's voice, and never names the ember king. No line in Act V says "Karthax": the Saltborn say «ο τύραννός σας» / "your tyrant", and an Evergreen stops the name when it is about to be spoken.

### twist
Three blows, each built from shipped lines, at three points in the act, never in one speech.

**1. Arna's brother lived (q26, the three ice memories).**
- d.lamp.m1.1 «Χίλια χρόνια πριν. Ένα αγόρι με ένα φανάρι ψάχνει στο πεδίο της Τέφρας τον αδελφό του.» / "A thousand years ago. A boy with a lantern searches the field of Ash for his brother."
- d.lamp.m1.2 «...Φωνάζει ένα όνομα. Κανείς δεν απαντά.» / "...He calls a name. No one answers."
- **Ice Memory 2 is the same night, seen from the sea:** «Ένα αγόρι από τον νότο, με σπασμένο πόδι, φωνάζει ένα όνομα όλη τη νύχτα. Κανείς δεν απαντά.» / "A boy from the south, his leg broken, calls a name all night. No one answers." Two brothers, each calling the other's name that night, a few miles apart.
- **Ice Memory 3:** the boy is a young man among the Saltborn. He lights a light on the farthest skerry, facing south: «Για να με βρει.» / "So he can find me." It mirrors Arna's vow, d.lamp.m3.2 «Για να μην ξεχαστεί.» / "So no one forgets." One night he sees fires catch on the southern peaks, one after another, and says: «Δεν είναι η δική μας φωτιά. Αλλά κάποιος τις ανάβει.» / "It isn't our fire. But someone is lighting them." (He is a young man, as Arna is "a young man now" in d.lamp.m3.1 when he lights them.) When the keepers ask what name he called that night, he answers with one word: «Άρνα.» / "Arna." The reveal lands in that word.

**2. "While they burn, the North is safe" was literally true (q28, at the Icebound Ship, after the Freeze).**
- intro.3 «Όσο καίνε, ο Βορράς είναι ασφαλής.» was always read as Karthax's fire guarding against Karthax. It guarded against the Skotos.
- Alkyone says it once, plainly, after the sea has frozen and she has forgotten her own mother's name (lines under beats, q28). The moral turn is hers: «Τους τυράννους τους αφήνουμε στο σκοτάδι. Τους ανθρώπους τούς φωνάζουμε με τ' όνομά τους.» / "Tyrants we leave to the dark. People we call by name." So Isarn's last advice was a keeper's wisdom he never knew he had.

**3. "Everyone goes north in the end" comes true, warmly (q29, in the lantern room).**
- Three shipped lines say it: d.voice.4 «Όλοι πάνε βόρεια στο τέλος.», mon.ivar.t «Πήγε βόρεια, όπως πάνε όλοι στο τέλος», d.lamp.m4.2 «Βόρεια. Εκεί πάμε όλοι στο τέλος.»
- **Ice Memory 4:** many years after the war an old man comes over the ice without a light. He is looking for his brother, Einar. The keepers tell him Einar died many winters ago, and asked them to keep the light lit, facing south, for him. «Δεν χρειαζόταν φως. Περπατούσε προς ένα.» / "He needed no light. He was walking toward one." That is where the first Wayfarer went when he "walks north without a light, and does not turn to look back" (d.lamp.m4.3): he left the gate to others ("Someone has to watch the gate too") and walked on.
- The hero carves two names under Einar's and Arna's on the Farthest Light's door-stone: Ivar and Isarn. Selna: «Όλοι έρχονται βόρεια στο τέλος. Τα ονόματά τους, τουλάχιστον.» / "Everyone comes north in the end. Their names, at least."

**Nothing is retconned.**
- intro.2 names three peoples. It was not wrong about them; it forgot the fourth.
- Every φρυκτωρία was still the brow-stone's fire (d.isarn.e1). Sea-lights are an older kind of fire.
- d.lamp.m1.2 "No one answers" stays true that night.
- No line claims the Saltborn recognised Whitecliff's flame or that the flames are the same colour. The player sees the shape.
- The Wayfarers still watched the Anvil Gate. Arna set the watch and kept walking.

**Old lines that read differently afterwards** (no line changes):
- game.title «ΣΚΟΤΟΣ»: the dark's name, said every night at the end of the North.
- d.answer.4 "No one we know lit that one": Arna's brother's people answering, a thousand years late, a fire lit by hand from Arna's own flame.
- d.field.dawn "Someone has lit the lanterns in the Graves": Alkyone.
- intro.3 "While they burn, the North is safe": true in a second way.
- d.karthax.p3 "EVERY LIGHT IN THE NORTH IS MINE": a liar's boast. The sea-lights were never his.
- d.amaranthe "Do you know who watches them?" and d.isarn.e3 "They say those who go north still watch over us": quietly true. Selna: «Δεν σας προσέχαμε. Σας κοιτάζαμε μόνο.» / "We didn't watch over you. We only watched." The first answer to Amaranthe stands.
- d.isarn.u3 "never tell his name to any child": mirrored by the act's last quest, «Πες το όνομά τους σε ένα παιδί» / "Tell their name to a child".
- d.isarn.after "The Shadow Gates have no bottom": Alkyone, post-game, «Οι πύλες σας δεν έχουν πάτο, λέτε; Έχουν. Είναι κάτω από τον πάγο μας.» / "Your gates have no bottom, you say? They do. It's under our ice." How the Gates play does not change.
- d.voice.cold «Σβήνω... Κάνει κρύο. Το είχα ξεχάσει.» / "I am going out... It is cold. I had forgotten.": cold and forgetting side by side. Act V never claims Karthax knew; it lets the line sit.

### ending
**The naming, at the Skotos's sinking** (cine `naming`, flag `skotosDown` saved first):
- The Skotos, sinking: d.skotos.die1 «...ποιος... φωνάζει...;» / "...who... is calling...?"
- Selna: d.selna.n1 «Εμείς. Κάθε βράδυ.» / "We are. Every night."
- Selna and the keepers say the old names, one per beat: «Η Πρώτη. Έιναρ. Άρνας.» / "The First. Einar. Arna." The First is the woman who lit the first fire on the rock; the sea took her real name, so the rite always opens with her.
- Then every name the hero lit on the Name-stones, in the order she lit them (floating `say` lines, 0.8 s apart).
- Narration, because the hero never speaks: d.naming.you «Λες το όνομα που κουβαλάς από τον Λευκόβραχο: Ίσαρν.» / "You say the name you have carried from Whitecliff: Isarn."
- Selna: d.selna.n2 «Κι εσένα σε ξέρουμε. Σκότος.» / "And you, we know you. Skotos."
- Its first "I": d.skotos.die2 «...ναι... αυτό... είμαι...» / "...yes... that... is what I am..."
- It sinks. The hole freezes clear in a white wave from the tower (`uFreeze`).
- **Cut to black. The game's own title appears in white, ΣΚΟΤΟΣ, for 3 s,** over the title theme's opening chord. The title was the name you say to hold the dark.

**The answer** (cine `answer5`, pitch 0.12 from the skerry, music 'sealit'):
- Alkyone: d.alk.k1 «Κι ανάβουν ξανά. Η μία μετά την άλλη.» / "And they're lit again. One after another."
- The Farthest Light turns its beam south. Along the coast the sea-lights answer one by one: the Grey Light, the Wreck Light, the Fall Light, the Skerry Light frozen into the bay, then three far lights the Saltborn rowed out to long ago. Each is a farFire sprite with a 1.2 s stagger and a bell.
- Far beyond, small on the southern horizon: Whitecliff's white-gold fire, Arna's hill, Deepstone, the beacon-tree.
- The black drains out of the aurora from south to north in a moving front (`uAurFront`). The northern lights burn green and white over the whole sky.
- Flag `seaLit` is saved (and `iceOut` with it, in the stretch spring reading).

**The lantern room** (q.29b «Ανέβα στον Έσχατο Φάρο» / "Climb the Farthest Light"):
- Ice Memory 4 (twist, blow 3).
- The carving. Narration d.carve «Χαράζεις δύο ονόματα κάτω από του Έιναρ και του Άρνα: Ίβαρ. Ίσαρν.» / "You carve two names under Einar's and Arna's: Ivar. Isarn."
- Selna:
  - d.selna.c1 «Οδοιπόροι. Οι τελευταίοι του Άρνα. Τώρα θα τους λέμε κάθε βράδυ.» / "Wayfarers. The last of Arna's. Now we'll say them every night."
  - d.selna.c2 «Όλοι έρχονται βόρεια στο τέλος. Τα ονόματά τους, τουλάχιστον.» / "Everyone comes north in the end. Their names, at least."
  - d.selna.c3 «Ο Άρνας είπε στους δικούς σας: «Κάποιος πρέπει να φυλάει και την πύλη.» Δεν ήξερε πως τη θάλασσα τη φύλαγε ήδη κάποιος.» / 'Arna told your people: "Someone has to watch the gate too." He didn't know someone was already watching the sea.'
  - d.selna.c4 «Λένε στον νότο πως όσοι πάνε βόρεια σάς προσέχουν. Δεν σας προσέχαμε. Σας κοιτάζαμε μόνο. Χίλια χρόνια, κάθε βράδυ, μετρούσαμε τις φωτιές σας.» / "In the south they say those who go north watch over you. We didn't watch over you. We only watched. A thousand years, every night, we counted your fires."
- Alkyone: d.alk.k2 «Πείτε το όνομά μας στα παιδιά σας. Να μη χαθούμε ξανά.» / "Tell our name to your children. So we're never lost again."
- **Ranger only,** Tamarisk: d.tam.k.r «Δύο κλωνάρια απ' το ίδιο δέντρο, στις δυο άκρες του Βορρά. Έλα να με βρίσκεις, αδελφή.» / "Two sprigs from the same tree, at two edges of the North. Come and find me, sister."
- Selna, last, giving "rest" back its meaning: d.selna.rest «Τώρα ξεκουράσου, φρυκτωρέ. Απόψε η βάρδια είναι δική μου.» / "Now rest, beacon-keeper. Tonight the watch is mine." It answers boon.rest.q «...κι η πρώτη σου νύχτα χωρίς βάρδια» / "...your first night without a watch" and Isarn's last word.
- setQuest(30).

**Home** (q30, on the first town entry after `seaLit`; cine at pitch 0.2 over the beacon hill):
- Green curtains over Whitecliff for the first time anyone remembers (atmos 'townAurora').
- Halda: d.halda.aur «Πρώτα τ' αστέρια. Τώρα ανάβει κι ο ίδιος ο ουρανός. Στη Βαθύπετρα δεν θα με πιστέψει κανείς.» / "First the stars. Now the sky itself is lit. No one in Deepstone will believe me." This answers d.halda.stars.
- A village child waits at the beacon by Isarn's staff (talk):
  - d.child.1 «Λένε πως ήρθε μια ξένη από τον βορρά, με ένα άσπρο φανάρι. Ποιοι είναι αυτοί με τα φανάρια;» / "They say a stranger came from the north with a white lantern. Who are the ones with the lanterns?"
  - Narration d.name.1 «Του λες το όνομά τους: Αλιγενείς. Κρατάνε τους φάρους της θάλασσας.» / "You tell him their name: the Saltborn. They keep the sea-lights."
  - d.child.2 «Αλιγενείς.» / "Saltborn." Then d.child.3 «Θα το θυμάμαι.» / "I'll remember." This answers Karthax's last «Ποιος... ποιος θα με θυμάται;» / "Who... who will remember me?" from the other side.
- `beaconScene(5, 'sea')`: on the northern horizon the fourth fire burns again, then three new white sea-lights kindle one after another and flash in a slow 12 s rhythm, a lighthouse beam seen from far off.
  - d.answer5.1 «Στον βορρά, πάνω από τη θάλασσα, ανάβουν φάροι, ο ένας μετά τον άλλον.» / "In the north, over the sea, sea-lights kindle, one after another."
  - The act's last line, echoing d.isarn.r3: d.answer5.2 «Κάποιος απάντησε.» / "Someone answered."
- Flag `toldChild`. actComplete(5), then offerBoons(5).
  - «Πράξη V — Ολοκληρώθηκε» / "Act V — Complete". Latin V, as canon §5.6 says.
  - act5.sub «Από τη θάλασσα ως τα βουνά, φωτιές από χέρια» / "From the sea to the mountains, fires lit by hand"
  - act5.next «Οι Σκιοπύλες σε περιμένουν, από το ραβδί του Ίσαρν δίπλα στη φρυκτωρία.» / "The Shadow Gates await, by Isarn's staff beside the beacon." This is the text act4.next carries today.
- End state q.31 «Οι φάροι καίνε ξανά, κι ο Βορράς ξέρει το όνομά τους. Οι Σκιοπύλες σε περιμένουν.» / "The sea-lights burn again, and the North knows their name. The Shadow Gates await."

**After the act.**
- The title screen subtitle reads game.sub5 «Το σκοτάδι έχει όνομα» / "The dark has a name" once any saved hero has `act5 >= 0`.
- At the Farthest Light, Selna keeps a nightly rite. Standing within 12 m of the tower, the hero hears her say the names, the old ones, every Name-stone the hero lit, Ivar and Isarn, ending «Σκότος.» (an ambient `say` chain every 90 s).
- Whitecliff: the aurora every night; the fourth fire and three sea-lights on the northern horizon; the child's bark «Αλιγενείς. Το θυμάμαι.» / "Saltborn. I remember."; Elianthe: d.elianthe.name «Ο μικρός μού είπε ένα όνομα. Αλιγενείς. Το λέει σε όλους.» / "The little one told me a name. Saltborn. He tells it to everyone."

### beats
- q24 [town] q.24 «Μίλα με την ξένη δίπλα στη φρυκτωρία» / "Speak with the stranger by the beacon".

**The hook.**
- **Who sees it:** a save with `h.act4 >= 0`, quest 23 and `newFire`.
- **When:** on the next zone entry into town. For a hero finishing Act IV after the update, 2 s after the Act IV blessing panel closes ('actClosed').
- **What happens:** town calls `loadFolk('frost')` ad hoc (Brokka's Act IV precedent, story.js:507). Alkyone walks up the beacon path (walkTo) and stands by Isarn's staff with a white sea-lantern. Flag `alkyone`, toast «Νέα αποστολή», and the "!" over her (npcHasNews).
- **New act4.next:** «Πράξη V: Η Παγωμένη Ακτή. Μια ξένη περιμένει στη φρυκτωρία.» / "Act V: The Frozen Coast. A stranger is waiting at the beacon."
- **New help.p1:** «Η αποστολή σου γράφεται πάνω δεξιά. Όποιος περιμένει δίπλα στη φρυκτωρία του χωριού σού λέει πού να πας.» / "Your quest is shown at the top right. Whoever waits by the village beacon tells you where to go."

**Barks before she is spoken to.**
- Halda: d.halda.v1 «Ήρθε με τα πόδια απ' τον βορρά. Μυρίζει θάλασσα. Εδώ κανείς δεν έχει δει θάλασσα.» / "She came on foot from the north. She smells of the sea. No one here has ever seen the sea."
- Elianthe: d.elianthe.v1 «Δεν θέλει να φάει, δεν θέλει να κάτσει. Κοιτάζει μόνο βόρεια.» / "She won't eat, won't sit. She only looks north."

**Alkyone at the beacon,** d.alk.a1-a9 in one dialog with a cine break before a7. She never says the dark's name here.
- a1 «Εσύ την άναψες; Τη φωτιά. Με το χέρι.» / "You lit it? The fire. By hand."
- a2 «Με λένε Αλκυόνη. Είμαστε οι Αλιγενείς, από την άκρη της θάλασσας. Δεν μας ξέρετε. Δεν πειράζει.» / "I'm Alkyone. We're the Saltborn, from the edge of the sea. You don't know us. That's all right."
- a3 «Χίλια χρόνια βλέπαμε τις φωτιές σας στις κορυφές. Δεν απαντήσαμε ποτέ. Απαντάμε μόνο σε φωτιές που μπορούν να σβήσουν.» / "For a thousand years we watched your fires on the peaks. We never answered. We only answer fires that can go out."
- a4 «Ύστερα έσβησαν όλες μαζί, μέσα σε μια νύχτα. Κι εκείνη τη νύχτα ο πάγος τραγούδησε.» / "Then they all went out together, in one night. And that night the ice sang."
- a5 «Την άλλη νύχτα άναψε μία εδώ. Μικρή, άσπρη, να τρέμει στον αέρα. Η μάνα μου, η Σέλνα, ανέβηκε στον Έσχατο Φάρο και της απάντησε.» / "The next night one was lit here. Small, white, shaking in the wind. My mother, Selna, climbed the Farthest Light and answered it."
- a5.m (Mage only; needs `.m` support in `rl()`) «Τάγμα της Φλόγας, ε; Κάποτε οι δικοί σου ανέβαιναν ως εμάς να μάθουν πώς κρατιέται μια φλόγα ζωντανή μέσα στο χιόνι. Μετά ξέχασαν τον δρόμο.» / "The Order of the Flame, eh? Your people used to climb all the way to us, to learn how a flame is kept alive in the snow. Then they forgot the way." It pays off class.mage.d.
- a6 «Ήρθα να δω ποιος την άναψε. Στον δρόμο βρήκα ένα φαράγγι με χίλια σβηστά φανάρια. Τα άναψα ένα ένα. Έτσι κάνουμε για τους νεκρούς.» / "I came to see who lit it. On the way I found a gorge with a thousand dead lanterns. I lit them one by one. It's what we do for the dead."
- **Cine at pitch 0.3, toward the north** (flag `coastCall` saved first): FAR_BEACONS[3] flickers, dims, gutters for 3 s and goes out (farFire `userData.k` to 0). A faint ice-song note under it.
- a7 «Όχι... Ο φάρος μας. Η Σέλνα δεν θα τον άφηνε ποτέ να σβήσει.» / "No... Our light. Selna would never let it go out."
- a8 «Κάτι ξύπνησε κάτω από τον πάγο. Τ' όνομά του δεν το λέμε εδώ. Έλα να τ' ακούσεις εκεί που πρέπει.» / "Something has woken under the ice. We don't say its name here. Come and hear it where it should be said."
- a9 «Ο γιος μου είναι μαζί της. Δώσε μου απ' τη φωτιά σου, φρυκτωρέ. Κι έλα μαζί μου.» / "My son is with her. Give me some of your fire, beacon-keeper. And come with me."

**Halda brings the Cradle.**
- d.halda.cradle «Η Κούνια σου άντεξε. Της έφτιαξα το χερούλι. Βάλε μέσα ένα κάρβουνο από τη φρυκτωρία. «Ως το τέλος του δρόμου», είπε η Μπρόκα.» / "Your Cradle held. I mended its handle. Put a coal from the beacon in it. 'To the end of the road,' Brokka said." It is the hero's own Cradle (players who went back to the Field after Act IV have seen it on her hip), and it pays off d.brokka.c3: the road was longer than anyone knew.
- Interact at the beacon «Πάρε ένα κάρβουνο» / "Take a coal", 1 s: d.coal «Παίρνεις ένα κάρβουνο από τη φρυκτωρία. Η φωτιά δεν μικραίνει.» / "You take one coal from the beacon. The fire grows no smaller." Whitecliff's beacon stays lit this time. Flag `coal` is saved first.
- d.kindle «Η Αλκυόνη ανάβει το φανάρι της από την Κούνια σου και φεύγει βόρεια χωρίς να κοιτάξει πίσω.» / "Alkyone lights her lantern from your Cradle and goes north without looking back." She walks down the north path and vanishes.
- The Cradle rides the hero's hip for the rest of the act (light.js ring, 4 m; see mechanics). Toast «Ο δρόμος για την Ακτή άνοιξε» / "The way to the Coast lies open". Then q25.

- q25 [town → ashfield → coast] q.25 «Πέρνα τον Λαιμό του Αμονιού και βρες την Αλκυόνη στην Παγωμένη Ακτή» / "Cross the Anvil's Neck and find Alkyone on the Frozen Coast". The variant q.25b «Άναψε το τζάκι στη Σκάλα των Αλιγενών» / "Light the hearth at the Saltborn's Landing" swaps in once `coastSeen` is set.

**The Field of Ash** is at dawn (ashfieldDawn), as Act IV left it. At the Anvil Gate plaza Alkyone waits by the Last Lamp, where Ivar's lantern hangs. The Field's READY.cinder set does not load `frost`, so act4Presence calls `loadFolk('frost')` ad hoc from q25 for a hero with `coal` and spawns her once it has loaded (Brokka's town precedent, story.js:507); she never appears as her 'healer' stand-in, which is Elianthe's look.
- d.alk.b1 «Εδώ φύλαγαν οι νεκροί σας. Κανείς δεν περνούσε με φωτιά. Κι εμείς δεν περπατάμε ποτέ χωρίς φως. Γι' αυτό δεν ξαναήρθαμε.» / "Your dead kept watch here. No one passed with fire. And we never walk without a light. That's why we never came again."
- d.alk.b2 «Κι ο καπνός του βουνού έκλεινε το πέρασμα χίλια χρόνια. Τώρα το βουνό δεν ανασαίνει.» / "And the mountain's smoke closed the pass for a thousand years. Now the mountain doesn't breathe." (d.forge.cold)

**The way out.**
- A new corridor opens on the plaza's south-east rim, «Ο Λαιμός του Αμονιού» / "The Anvil's Neck". Its rubble plug opens with map.open once `newFire` is set, so the arena stays whole for old saves still fighting Ivar. It is opened on every entry (act4Enter), not only at build: the Field is a cached zone, and a hero who plays straight on from Act IV walks into the Field built at q20-22, before `newFire`.
- The exit at its far end is `{ to: 'coast', label: 'exit.coast', locked: 'coal' }`: it opens once the coal is in the Cradle.
- Shut line d.coastShut «Πέρα απ' το Αμόνι ο δρόμος χάνεται στο χιόνι. Δεν έχεις λόγο να πας ακόμα.» / "Past the Anvil the path is lost in snow. You've no reason to go yet."

**Arrival cine on the coast** (flag `coastSeen`, saved first; ATMOS 'coastCine', fog density 0.008; pitch 0.18 looking north from the top of the Neck). This is the act's wonder shot, so the aurora is full and green:
- d.coast.1 «Πέρα από το Αμόνι ο κόσμος ασπρίζει. Κάτω, μια θάλασσα ως τον ορίζοντα, κι από πάνω της ο ουρανός ανάβει πράσινος.» / "Beyond the Anvil the world turns white. Below, a sea to the horizon, and over it the sky burns green."
- Alkyone: d.alk.c1 «Το σέλας. Ο δικός μας ουρανός έχει κι αυτός φώτα.» / "The northern lights. Our sky has lights of its own."
- A black thread runs through the curtains at the northern edge and is gone (`uAurDark` 0.15 for 1.5 s, then back to 0). Ice-song sound effect.
- d.coast.2 «Στην άκρη του βορρά, κάτι μαύρο περνά μέσα από το φως, σαν μελάνι στο νερό, και χάνεται.» / "At the north edge something black passes through the light, like ink in water, and is gone."
- The Skotos (faint `say`): d.skotos.1 «...φωτιές... στον νότο... σβήνουν, η μία μετά την άλλη...» / "...fires... in the south... they go out, one after another..."
- Alkyone: d.alk.c2 «Το άκουσες κι εσύ. Πάμε. Η Σκάλα είναι από κάτω.» / "You heard it too. Come. The Landing is below."
- Alkyone, when the hero walks on: d.alk.c3 «Εδώ πάνω ο ήλιος δεν βγαίνει τον χειμώνα. Μας φτάνουν τα φώτα μας.» / "Up here the sun doesn't rise in winter. Our lights are enough for us."

**The Landing** (Η Σκάλα: in Greek a σκάλα is also a small harbour). Dark stilt huts, boats drawn up on the shingle, a cold hearth (interact 'hearth', «Άναψε το τζάκι» / "Light the hearth", 1 s, from the Cradle).
- Lighting it saves flag `hearth` and makes it a camp, waypoint `coast` and a warm pool of 8 m.
- d.landing.1 «Η φωτιά πιάνει στο τζάκι της Σκάλας. Ένας ένας, οι Αλιγενείς βγαίνουν από τα σπίτια τους.» / "The fire catches in the Landing's hearth. One by one, the Saltborn come out of their houses."
- Three shorefolk walkTo the fire.

**The rite** (cine at dusk, flag `rite`, saved first; pitch 0.3; the first time the word is spoken in the game). Old Glaukos stands at the hearth with his face to the sea:
- d.glaukos.r1 «Η Πρώτη, που τ' όνομά της το πήρε η θάλασσα. Θάλεια. Κήυκας.» / "The First, whose name the sea took. Thaleia. Keyx."
- d.glaukos.r2 «Κι ένα όνομα ακόμα, το τελευταίο, κάθε βράδυ, για να μην κρυφτεί.» / "And one name more, the last, every night, so it cannot hide."
- d.glaukos.r3 «Σκότος.» / "Skotos." The title theme's opening chord sounds, low. The ice answers with one long song.

Then Alkyone, by the fire:
- d.alk.b3 «Εσείς στον νότο λέτε «σκοτάδι». Εμείς του δώσαμε όνομα. Ό,τι έχει όνομα δεν κρύβεται.» / "In the south you say 'the dark'. We gave it a name. What has a name can't hide."
- d.alk.b4 «Δεν μισεί. Δεν θέλει. Ξεχνά. Ό,τι σκεπάζει, το ξεχνά ο κόσμος: καράβια, φάρους, ανθρώπους.» / "It doesn't hate. It doesn't want. It forgets. Whatever it covers, the world forgets: ships, lights, people."
- d.alk.b5 (the glance at Keyx's name) «Ο Κήυκας ήταν ο άντρας μου. Ακόμα λέω τ' όνομά του. Γι' αυτό είναι ακόμα δικός μου.» / "Keyx was my husband. I still say his name. That's why he's still mine."
- d.alk.d1 sets q26: «Τρεις φάροι στέκονται ακόμα στην Ακτή, σβηστοί. Άναψέ τους από την Κούνια σου. Όπου καίει φάρος, ο πάγος κρατά και το κρύο φεύγει. Και πρόσεχε την παλίρροια.» / "Three lights still stand on the Coast, dark. Light them from your Cradle. Where a light burns, the ice holds and the cold lifts. And mind the tide."

**Glaukos (vendor of whale oil and harpoon gear, ordinary items):**
- d.glaukos.1 «Τη μυρίζω τη φωτιά σου. Νότια φωτιά. Ζεσταίνει αλλιώς.» / "I can smell your fire. A southern fire. It warms differently."
- d.glaukos.2 «Οι παλιοί είχαν εννιά φάρους απ' το Αμόνι ως την άκρη του πάγου. Τους αφήσαμε να σβήσουν έναν έναν, όσο λιγοστεύαμε.» / "The old ones had nine lights from the Anvil to the edge of the ice. We let them go out one by one, as we grew fewer."
- d.glaukos.3 (after the third ice memory) «Οι φωτιές σας ήταν στις κορυφές, πάνω από τον καπνό. Οι δικές μας στο νερό, από κάτω του.» / "Your fires were on the peaks, above the smoke. Ours were down at the water, beneath it." It explains why sight ran one way: the Saltborn saw the beacons for a thousand years (a3, Ice Memory 3.4), and the South never saw the Farthest Light (d.answer.4) until the mountain stopped breathing.
- d.glaukos.again «Λάδι, καμάκια, σκοινί. Ό,τι κρατά έναν άνθρωπο στη θάλασσα.» / "Oil, harpoons, rope. Whatever keeps a person at sea."

**Tamarisk (healer and vendor; teaches the Cold).** An Evergreen, one of the nursery children Amaranthe sent to the edges of the North (d.tear.nursery.1). She left before the rooting, so she has no bark, like the Ranger.
- d.tam.1 «Μυρίκη. Γιατρεύω ό,τι γιατρεύεται και πουλάω ό,τι φέρνει η θάλασσα. Κάθισε στη φωτιά. Το κρύο εδώ δεν σε χτυπά. Σε πίνει.» / "Tamarisk. I mend what can be mended and sell what the sea brings. Sit by the fire. The cold here doesn't strike you. It drinks you."
- d.tam.1.r «Μυρίκη. Κι εσύ... σε ξέρω. Ήσουν η μικρή που έκλαιγε στον δρόμο όταν μας έστειλαν μακριά. Εγώ πήγα βόρεια.» / "Tamarisk. And you... I know you. You were the little one crying on the road when they sent us away. I went north."
- d.tam.2 «Είμαι Αειθαλής, απ' τα παιδιά που έστειλε η Κυρά στις άκρες του Βορρά. Αυτή εδώ ήταν η δική μου άκρη. Οι Αλιγενείς μού έμαθαν να λέω ονόματα.» / "I'm Evergreen, one of the children the Lady sent to the edges of the North. This was my edge. The Saltborn taught me to say names."
- d.tam.3 (the sapling) «Και το δικό μου όνομα είναι στις πέτρες του δάσους, μ' ένα βλαστάρι πλάι του. Δεν μεγάλωσε ποτέ. ...Μεγαλώνει τώρα; Από το φθινόπωρο;» / "My name's on the stones in the wood too, with a sapling beside it. It never grew. ...Is it growing now? Since the autumn?"
  - Ranger: narration d.tam.3.r «Της λες πως από το φθινόπωρο τα βλαστάρια στο δάσος μεγαλώνουν. Και το δικό της.» / "You tell her that since the autumn the saplings in the wood are growing. Hers too." Then d.tam.4 «...Επιτέλους.» / "...At last." (echoing d.elati.aut3). Flag `tamSapling`.
  - Other classes: the answer comes from Elati, in the woods (d.elati.v2 under Lines at home). Back at the Landing with `tamSapling`, Tamarisk says d.tam.4.
- d.tam.again «Πάρε ό,τι χρειάζεσαι. Το αλάτι τσούζει, μα κλείνει τις πληγές.» / "Take what you need. Salt stings, but it closes wounds."

- q26 [coast] q.26 «Ξανάναψε τους τρεις φάρους της Ακτής ({0}/3)» / "Relight the three sea-lights of the Coast ({0}/3)". Progress toast q.lightLit «Ο φάρος καίει ({0}/3)» / "A sea-light burns ({0}/3)".

**Each sea-light.**
- A ruined round tower on rock, with a dark iron fire-cage on top.
- Lighting it is a 1.5 s channel from the Cradle («Άναψε τον φάρο» / "Light the sea-light"). A hit worth 10% of max life interrupts it.
- Once lit:
  - its beam starts to sweep (mechanics);
  - it becomes a checkpoint and a warm pool of 7 m;
  - cine at pitch 0.45: the beam swings out over the sea for the first time, and the lights already lit flash back once, the keepers' call and answer;
  - then an Ice Memory plays in a frozen pool at the tower's foot, where a figure lies in clear ice. The memory filter is the body class 'memory-ice', a cold white-blue swap of 'memory-ash'.
- The three can be lit in any order. **The memories play in count order** (the first light lit plays memory 1), so the reveal always lands last.
- **A memory is never lost.** Each light's flag is saved before its cine and memory, so a game closed in between leaves a lit light with its memory unseen. On every coast entry, if lights lit > memories seen, the lit tower's ice window offers «Θυμήσου» / "Remember" and questGoal points at it (Act IV's guard, hud.js:257: `!F['mem_' + l.id]`).
- The Skotos, at the first one: d.skotos.2 «...κι αυτή θα σβήσει...» / "...this one will go out too..."

The three lights:
- **The Grey Light (Ο Γκρίζος Φάρος)** on a tide-locked islet in the Shallows: its causeway is dry only near low water.
- **The Wreck Light (Ο Φάρος των Ναυαγίων)** on the point of the Ship Graveyard, reached along a thick-ice spine over a thin shelf.
- **The Fall Light (Ο Φάρος του Καταρράχτη)** at the foot of the Frozen Fall, across the fjord's ice shelf, past Icemaw holes.

**Ice Memory 1, "The first fire"** (d.ice.i1.*):
- .1 «Πριν από κάθε μνήμη. Σκοτάδι πάνω στη θάλασσα, και μέσα του τίποτα δεν έχει όνομα.» / "Before all memory. Dark over the sea, and nothing in it has a name."
- .2 «Μια γυναίκα ανάβει φωτιά πάνω σε έναν βράχο, με ξύλα που έφερε το κύμα. Μαζεύονται γύρω της και λένε ο ένας τ' όνομα του άλλου.» / "A woman lights a fire on a rock, with wood the waves brought in. They gather round it and say each other's names."
- .3 (the woman) «Φως στο νερό, για να μείνει το νερό νερό.» / "Light on the water, so the water stays water."
- .4 «Το σκοτάδι τραβιέται κάτω από τη θάλασσα. Από πάνω του, η θάλασσα παγώνει. Δεν φεύγει. Περιμένει να ξεχάσουν.» / "The dark draws back under the sea. Above it, the sea freezes. It does not leave. It waits for them to forget."

**Ice Memory 2, "The carrying"** (d.ice.i2.*):
- .1 «Χίλια χρόνια πριν. Τη νύχτα, με τα φανάρια σκεπασμένα, οι Αλιγενείς κατεβαίνουν από το πέρασμα στην άκρη του πεδίου της Τέφρας.» / "A thousand years ago. At night, their lanterns covered, the Saltborn come down the pass at the edge of the field of Ash." (The shipped Field has no shore, so they come over land, before the Anvil's smoke and the watch closed the pass.)
- .2 «Οι Αλιγενείς σηκώνουν τους λαβωμένους, απ' όποιον λαό κι αν είναι, και τους πάνε στη θάλασσα. Δεν μένουν να τους μετρήσει κανείς.» / "The Saltborn lift the wounded, of whatever people, and carry them to the sea. They do not stay to be counted."
- .3 «Ένα αγόρι από τον νότο, με σπασμένο πόδι, φωνάζει ένα όνομα όλη τη νύχτα. Κανείς δεν απαντά.» / "A boy from the south, his leg broken, calls a name all night. No one answers."

**Ice Memory 3, "The light that faces south"** (d.ice.i3.*):
- .1 «Το αγόρι είναι νέος άντρας πια. Μια φορά προσπάθησε να γυρίσει νότια. Η στάχτη έκαιγε ακόμα.» / "The boy is a young man now. Once he tried to go back south. The ash was still burning."
- .2 «Ανάβει ένα φως στην πιο μακρινή νησίδα, γυρισμένο στον νότο.» / "He lights a light on the farthest skerry, facing south."
- .3 (Einar) «Για να με βρει.» / "So he can find me."
- .4 «Μια νύχτα, στις κορυφές του νότου, πιάνουν φωτιές, η μία μετά την άλλη.» / "One night, on the southern peaks, fires catch, one after another."
- .5 (Einar) «Δεν είναι η δική μας φωτιά. Αλλά κάποιος τις ανάβει.» / "It isn't our fire. But someone is lighting them."
- .6 «Οι Αλιγενείς τον ρωτούν ποιο όνομα φώναζε εκείνη τη νύχτα. Τους το λέει: «Άρνα.»» / "The Saltborn ask him what name he called that night. He tells them: 'Arna.'"

**After the third light and its memory** (cine `towerWake`, flag saved first; pitch 0.6 on Skerry Bay; it waits for `mem_i1`-`mem_i3`, so Ice Memory 3, the reveal, always plays before it). Alkyone stands on the bay's shore rock:
- d.alk.e1 «Ο Έιναρ. Έτσι τον λένε τα παλιά μας παραμύθια: εκείνος που περίμενε τον αδελφό του. Ο φάρος του είναι ο Έσχατος. Της μάνας μου τώρα.» / "Einar. That's his name in our old tales: the one who waited for his brother. His light is the Farthest. My mother's now." (Arna is the one who searched, d.lamp.m1.1; Einar called, then waited.)
- The rock island at the centre of the bay heaves. Water pours off it. Eight legs unfold. It stands, with the dead Skerry Light on its back.
- Alkyone: d.alk.f1 «Η Νησίδα. Χίλια χρόνια ήταν νησί, κι ο φάρος μας πάνω της. Τώρα περπατά.» / "The Skerry. For a thousand years it was an island, with our light on its back. Now it walks."
- Then q27.

- q27 [coast] q.27 «Νίκησε τον Πύργο που Περπατά στον Κόλπο της Νησίδας» / "Defeat the Walking Tower in Skerry Bay".

**Boss: Skerry, the Walking Tower** (see Bosses). Alkyone calls from the shore rock, one line per phase:
- Phase 1: d.alk.g0 «Μείνε στο ξερό όταν φουσκώνει! Άσ' τον να βγει στη στεριά!» / "Stay on dry ground when the tide's up! Let it come ashore!"
- Phase 2: d.alk.g0b «Ράγισε τον πάγο ανάμεσά σας και στάσου από πίσω! Θα βουλιάξει!» / "Crack the ice between you and stand behind it! It'll go through!"
- Phase 3: d.alk.g1 «Ο φάρος στην πλάτη του! Άναψέ τον, και θα τυφλωθεί απ' το δικό του φως!» / "The light on its back! Light it, and it'll be blinded by its own light!"

**Death.** It crawls back to the spot where it slept for a thousand years and settles there as an island once more, and the light on its back keeps burning. The body never dissolves: it becomes the bay's landmark and the place of its echo.
- Alkyone: d.alk.g2 «Κοιμήσου, γέρο. Θα σου κρατάμε το φως αναμμένο.» / "Sleep, old one. We'll keep your light burning."
- The Skotos: d.skotos.3 «...ένα φως ακόμα... κανείς δεν θα το θυμάται...» / "...one more light... no one will remember it..."
- Flag `towerDown` (saved first). Toast «Ο Φάρος της Νησίδας καίει ξανά» / "The Skerry Light burns again".

**The Freeze** (cine `freeze`, flag `frozen` saved first; pitch 0.25 over the bay, 14 s, skippable):
- d.freeze.1 «Η θάλασσα σωπαίνει. Από τα βαθιά ανεβαίνει ένα κρύο που δεν είναι του χειμώνα.» / "The sea goes quiet. From the deep rises a cold that is not winter's."
- The Skotos: d.skotos.up «...ανεβαίνουμε...» / "...we are coming up..."
- Time-lapse: the swell stops mid-crest and turns white (`uFreeze` global), ice spreads out from every shore while the three lit beams sweep over waves that no longer move. The black floods into the aurora from the north (`uAurDark` 0 → 1 over 5 s).
- Far out on the new ice, a single small light walks north from the Farthest Light, goes smaller, and goes out.
- d.freeze.2 «Ως το πρωί η θάλασσα έχει παγώσει ως τον Έσχατο Φάρο.» / "By morning the sea has frozen all the way to the Farthest Light."
- **The forgetting.** Alkyone, on the shore rock:
  - d.alk.f2 «Κάποια περπάτησε στον πάγο. Είναι δική μου. Το ξέρω. Δεν θυμάμαι τ' όνομά της.» / "Someone walked out onto the ice. She's mine. I know it. I can't remember her name."
  - d.alk.f3 «Εσύ τη θυμάσαι; ...Μην το πεις. Θα το ξεχάσω πάλι. Φύλαξέ το εσύ.» / "Do you remember her? ...Don't say it. I'll only forget it again. You keep it."
- Toast q.forgot «Κάποια κατέβηκε στον πάγο. Κανείς δεν θυμάται ποια. Εσύ θυμάσαι.» / "Someone went down onto the ice. No one remembers who. You do."
- **From here until the third Remember in the Skotos fight, Selna's name is «…»** in the quest text and in her dialog title. It is a text parameter derived, never stored: blank while `frozen && !selnaBack && !G.selnaBack`. `G.selnaBack` is the fight's runtime copy (set at the third Remember, cleared on a fight reset); the saved `selnaBack` is written only together with `skotosDown`. The player remembers; the game does not. The hero becomes the keeper of one name.
- Big toast «Η θάλασσα πάγωσε» / "The sea has frozen". The fade ends white; the coast is rebuilt (same seed) with Skerry Bay frozen: the north rim's open water becomes a thick road, and the exit to the frozen sea opens there. The Shallows keep their tide: sea ice cannot hold over flats that drain twice a cycle, so the frozen sea starts beyond them. Then q28.

- q28 [farlight] q.28 «Σφράγισε τις Ανάσες στον Δρόμο του Πάγου και βρες τη {0} ({1}/3)» / "Seal the Breathing-holes on the Ice Road and find {0} ({1}/3)". {0} is «…» until `selnaBack`. Progress toast q.holeSealed «Μια Ανάσα σφραγίστηκε ({0}/3)» / "A Breathing-hole is sealed ({0}/3)".

**Arrival cine** (pitch 0.3): ice to the horizon under a black aurora. A shadow the size of a ship passes under the hero (the ice shader's `uShade`, 3 s), and does not attack.
- d.far.0 «Η θάλασσα είναι πάγος ως εκεί που φτάνει το μάτι. Κάτω από τα πόδια σου, κάτι γλιστρά στο σκοτάδι. Δεν τελειώνει.» / "The sea is ice as far as the eye can see. Under your feet, something glides through the dark. It doesn't end."

**The Icebound Ship camp** (waypoint `farlight`). Alkyone and Tamarisk have come out over the new ice. The twist's second blow (d.alk.t1-t7):
- t1 «Ανέβηκε. Χίλια χρόνια δεν είχε ανέβει ποτέ.» / "It rose. In a thousand years it never once rose."
- t2 «Εσείς στον νότο λέτε: «Όσο καίνε, ο Βορράς είναι ασφαλής.» Ήταν αλήθεια. Μόνο που δεν ξέρατε από τι.» / "In the south you say: 'While they burn, the North is safe.' It was true. You just never knew from what."
- t3 «Ο τύραννός σας ευχήθηκε να μην τον ξεχάσουν ποτέ. Χίλια χρόνια, κάθε κορυφή στον Βορρά θυμόταν. Κι ό,τι ζει από τη λήθη δεν μπορούσε να σηκώσει κεφάλι.» / "Your tyrant wished never to be forgotten. For a thousand years every peak in the North remembered. And a thing that lives on forgetting could not lift its head."
- t4 «Κανείς δεν το ήξερε. Ούτε εκείνος.» / "No one knew it. Not even him."
- t5 «Μα μια φωτιά που θυμάται ένα όνομα ξεχνά όλα τ' άλλα. Τα καράβια σταμάτησαν να έρχονται. Λιγοστέψαμε. Για να μην ξεχαστεί ένας τύραννος, ξεχάστηκε ένας λαός.» / "But a fire that remembers one name forgets all the others. The ships stopped coming. We grew fewer. So that a tyrant would not be forgotten, a people was."
- Tamarisk: d.tam.t «Μην πεις τ' όνομά του. Ούτε εδώ.» / "Don't say his name. Not even here." (keeps faith with d.isarn.u3)
- t6 «Δεν θα το πω. Τους τυράννους τους αφήνουμε στο σκοτάδι. Τους ανθρώπους τούς φωνάζουμε με τ' όνομά τους. ...Κι εγώ ξέχασα της μάνας μου.» / "I won't. Tyrants we leave to the dark. People we call by name. ...And I've forgotten my mother's."
- t7 sets the task: «Τρεις Ανάσες κόβουν τον δρόμο ως τον φάρο. Όπου ο πάγος δεν κλείνει, ανασαίνει εκείνο. Άναψε τα τρία λυχνάρια στο χείλος της και κράτα τα αναμμένα μαζί. Ο πάγος θα κλείσει.» / "Three Breathing-holes cut the road to the light. Where the ice won't close, it breathes. Light the three lamps on the rim and keep them lit together. The ice will close."
- Glaukos is not here; Tamarisk is the camp's healer and vendor. d.tam.f1 «Δεν ήξερα πως ο πάγος μπορεί να τραγουδά έτσι. Σαν να ψάχνει κάποιον.» / "I didn't know ice could sing like that. As if it were looking for someone."

**At each Breathing-hole** (mechanics: the seal).
- Alkyone goes ahead to each hole's south rim, untouchable, and waits there. She does not walkTo along the road (walkTo is a straight line with no collision, world.js:905-927, and the road winds between pressure ridges and over leads): she vanishes at a sealed hole in a puff of spindrift and appears at the next hole's south rim once that lead is sealed, and on zone build she stands at the first unsealed hole by the `hole0`-`hole2` flags. walkTo stays for open arenas only.
- The hero lights three marker-lamps on the rim and keeps all three burning together until the ice closes, against what climbs out of the black water and against the hole's Black Breath.
- Sealing one sends a freeze wave across the lead (cine at pitch 0.75). The lead becomes thick ice, the Ice Road continues, and the rim lamps become a small marker-light with a short beam.

Alkyone, one line per seal:
- d.alk.s1 «Φως στο νερό, για να μείνει το νερό νερό.» / "Light on the water, so the water stays water." The creed, said aloud for the first time since Memory 1.
- d.alk.s2 «Η μάνα μου έλεγε πως ο πάγος θυμάται. Εύχομαι να θυμάται καλύτερα από μένα.» / "My mother used to say the ice remembers. I hope it remembers better than I do."
- d.alk.s3 «Τρεις. Τώρα ο φάρος. Και εκείνη.» / "Three. Now the light. And her."

**The Skotos between holes** (place voices, z.voices, one per area, lowercase):
- w1 «...πόσα καράβια... κανείς δεν τα θυμάται... ούτε εσύ θα τα θυμάσαι...» / "...so many ships... no one remembers them... nor will you..."
- w2 «...γιατί κουβαλάς φωτιά;... πονάει μόνο όποιος θυμάται...» / "...why carry fire?... only those who remember hurt..."
- w3 «...ποιος σου μιλούσε στη φρυκτωρία;... γέρος ήταν;... κανείς δεν θυμάται...» / "...who used to talk to you at the beacon?... was he old?... no one remembers..."
- w3.r «...ποια σε έστειλε στον δρόμο, παιδί του δάσους;... το πρόσωπό της... κανείς δεν το θυμάται...» / "...who sent you down the road, child of the wood?... her face... no one remembers it..."
- w4 «...ξεκουράσου... αυτό δεν σου είπε;... ξεκουράσου...» / "...rest... isn't that what he told you?... rest..."
- w5 «...κι εκείνη... πώς τη λέγανε;... κανείς...» / "...and her... what was her name?... no one..."
- The law, after the second seal: d.skotos.law «...σβήνουν, η μία μετά την άλλη. πάντα σβήνουν...» / "...they go out, one after another. they always go out..."

- q29 [farlight] q.29 «Φτάσε στον Έσχατο Φάρο: η {0} είναι στον πάγο» / "Reach the Farthest Light: {0} is out on the ice". After `selnaBack` the variant q.29a «Άναψε τον Έσχατο Φάρο» / "Light the Farthest Light", and after `seaLit` q.29b «Ανέβα στον Έσχατο Φάρο» / "Climb the Farthest Light".

**The Light's Skerry.** The tower is dark, and there is a small glow at its foot (cine at pitch 0.85, close).
- d.far.1 «Στη βάση του πύργου, ένα μικρό φως. Ένα αγόρι δέκα χρονών κρατά ένα λυχνάρι με τα δυο του χέρια.» / "At the foot of the tower, a small light. A boy of ten holds a lamp in both hands."
- Tern: d.tern.1 «Κράτησα ένα. Μόνο ένα. Δεν μπορούσα ν' ανέβω ως πάνω.» / "I kept one. Just the one. I couldn't climb all the way up."
- Alkyone: d.alk.i1 «Γλαρόνι μου...» / "My little tern..."
- Tern: d.tern.2 «Η γιαγιά μού είπε: ό,τι κι αν γίνει, ένα φως. Ύστερα κατέβηκε στον πάγο να του πει τ' όνομά του κατάμουτρα.» / "Grandmother told me: whatever happens, one light. Then she went down onto the ice to say its name to its face."
- Tern: d.tern.3 «Πώς τη λένε, μάνα; Γιατί δεν θυμάμαι πώς τη λένε;» / "What's her name, mother? Why can't I remember her name?"
- Read beside Isarn's ten-year-old wish (d.lamp.m5.2), this is a child who keeps a light with no wish and no voice in it.

**The Skotos rises** when the hero touches the tower's stair («Άναψε τον Έσχατο Φάρο» / "Light the Farthest Light"). Flag `skotosWake` is saved first. Cine at pitch 0.25, north: the ice edge heaves, black water climbs, and a figure twelve metres tall rises out of the sea. Out on the ring of ice between the skerry and the edge, a woman kneels with a guttering lantern, saying names and losing them as she says them:
- d.selna.lost «Η Πρώτη... Έιναρ... Άρ... το είχα...» / "The First... Einar... Ar... I had it..."
- Intro: d.skotos.b1 «...κάθε φωτιά σβήνει, φρυκτωρέ... και κάθε όνομα...» / "...every fire goes out, beacon-keeper... and every name..."
- .r: d.skotos.b1.r «...κι εσύ, παιδί του δάσους... τ' όνομά σου σκεπάστηκε με βρύα...» / "...and you, child of the wood... your name lies under moss..." (d.tear.nursery.3.r)

Boss: the Skotos (see Bosses).
- Phase 2: d.skotos.p2 «...κανείς δεν θα σε θυμάται. δεν πονάει...» / "...no one will remember you. it does not hurt..." (against d.karthax.die)
- At the third Remember, Selna stands: d.selna.p2 «Σέλνα. Με λένε Σέλνα.» / "Selna. My name is Selna." Alkyone, from the skerry: d.alk.j1 «Μάνα!» / "Mother!" Toast q.selnaBack «Σέλνα. Τη λένε Σέλνα.» / "Selna. Her name is Selna." The name returns at runtime (`G.selnaBack`); the flag `selnaBack` is saved with `skotosDown`, so a death or a quit before the naming replays the Remembers with her name hidden again.
- Phase 3: d.skotos.p3 «...μία φωτιά... δύο... τις μετράμε... πάντα σβήνουν...» / "...one fire... two... we count them... they always go out..."
- Phase 3, the keepers walk out with lamps: d.alk.j2 «Τα λυχνάρια σας! Βγείτε στον πάγο!» / "Your lamps! Out onto the ice!"; Tern: d.tern.j1 «Το δικό μου καίει ακόμα!» / "Mine's still burning!"; Tamarisk: d.tam.j1 «Για το δέντρο, και για τη θάλασσα!» / "For the tree, and for the sea!"
- The relight: d.relight «Η φωτιά του Λευκόβραχου, η φωτιά του Άρνα, ανεβαίνει στον φάρο του Έιναρ. Δύο αδέλφια, ένα φως.» / "Whitecliff's fire, Arna's fire, climbs Einar's light. Two brothers, one light."
- At 15% Selna begins the roll of names, one floating `say` every 3 s.
- The naming and the title card, then `answer5`, then q.29b and the lantern room (see ending).

- q30 [town] q.30 «Γύρνα στον Λευκόβραχο και πες το όνομά τους σε ένα παιδί» / "Go home to Whitecliff and tell their name to a child". See ending, Home. End state q.31.

**Optional along the way: the Name-stones (Οι Πέτρες των Ονομάτων).** Spectacle's Lights for the Lost and mechanics' name-stones, merged into one set. **The base has four, all on the coast;** four more on the frozen sea are out of the base scope (stretch, below). Each is a carved stone with a cold lamp in a niche.
- Interact «Άναψε το λυχνάρι» / "Light the lamp", 1 s. The lamp becomes a small light pool (r 3) that holds the ice around it, and the stone's line plays as a toast-dialog. It grants the existing BUFFS.memory, renamed «Μνήμη των Αλιγενών» / "Memory of the Saltborn" (+12% damage, +8% movement for 60 s). The id is appended to `h.flags.names` in the order lit.
- Toast «Ονόματα: {0}/4» / "Names: {0}/4". All four set `flags.remembered`: the Act V blessing is worth ×1.25, toast «Μνήμη των Χαμένων: η ευλογία της Ακτής δυναμώνει» / "Memory of the Lost: the Coast's blessing grows stronger".
- Every name lit is spoken in the naming roll and in Selna's nightly rite.
- They can be finished in the post-game.

The coast (tide-locked flats, an ebb cave, the Whalebone Strand, a wreck hold):
- d.stone.thaleia «Θάλεια. Κράτησε τον Φάρο της Νησίδας σαράντα χειμώνες. Έλεγε πως ο βράχος της ανάσαινε.» / "Thaleia. Kept the Skerry Light forty winters. She used to say her rock breathed."
- d.stone.keyx «Κήυκας. Βγήκε με τη βάρκα του μια νύχτα χωρίς φεγγάρι και δεν γύρισε. Η Αλκυόνη λέει ακόμα τ' όνομά του.» / "Keyx. Rowed out one moonless night and did not come back. Alkyone still says his name."
- d.stone.carriers «Οι Φορείς. Όσοι σήκωσαν τους λαβωμένους απ' τη στάχτη. Δεν τους μέτρησε κανείς. Εμείς τους μετράμε.» / "The Carriers. Those who lifted the wounded from the ash. No one counted them. We do."
- d.stone.sailor «Ναύτης. Κάποιος από τον νότο. Κανείς δεν ήξερε τ' όνομά του, κι έτσι του δώσαμε ένα.» / "Sailor. Someone from the south. No one knew his name, so we gave him one."

**Stretch, out of the base scope:** the frozen sea's four (thin-ice islets, a Drowned Light, a berg). If they come back, the toast counts to 8 and `remembered` needs all eight. Their lines, kept ready:
- d.stone.kranea «Κρανιά. Ήρθε από το δάσος, παιδί ακόμα, πριν από εκατό χειμώνες. Δεν είδε ποτέ ξανά φθινόπωρο.» / "Kranea. She came from the wood, still a child, a hundred winters ago. She never saw another autumn." (She grew up in the wood's one autumn, d.tear.nursery.1.)
  - .r «Κρανιά. Ήρθε από το δάσος, παιδί ακόμα. Τ' όνομά της είναι χαραγμένο και στις πέτρες του δικού σου δάσους.» / "Kranea. She came from the wood, still a child. Her name is cut in the stones of your wood too."
- d.stone.galini «Γαλήνη. Έσβησε τον φάρο της για να μη βλέπει τη θάλασσα που της πήρε τα παιδιά. Τη συγχωρέσαμε.» / "Galini. She put out her light so she wouldn't see the sea that took her children. We forgave her."
- d.stone.twins «Γλαύκη και Κυμώ. Δίδυμες. Κατέβηκαν μαζί στον πάγο να του πουν τ' όνομά του. Γύρισε η μία.» / "Glauke and Kymo. Twins. They went down onto the ice together to say its name. One came back." It foreshadows Selna's walk.
- d.stone.avra «Αύρα. Κράτησε τον Έσχατο Φάρο πριν από τη Σέλνα, και τον έδωσε με τα χέρια της, όπως τον πήρε.» / "Avra. Kept the Farthest Light before Selna, and handed it on with her own hands, the way she took it." While Selna is forgotten the stone reads «...όπως τον πήρε.» with the name blank: «πριν από τη …».

**Ebb hoards.** Two or three chests per coast seed in the ebb caves and wreck holds, reachable only at low water (`L.tideLocked`). They are the reason to learn the tide's clock.

**Lines at home after Act IV** (talk variants on flags; no model loads):
- Brokka in the Halls, after `newFire`: d.brokka.v1 «Η Βαθύπετρα καίει, ξένε. Είδα κι εγώ την τέταρτη φωτιά, άσπρη σαν το χιόνι. Οι Λιθογενείς δεν ξεχνούν. Αυτούς όμως... τους ξεχάσαμε.» / "Deepstone burns, stranger. I saw the fourth fire too, white as snow. The Stoneborn don't forget. But those people... we forgot them." (d.halda.2)
- Brokka, after `seaLit`: d.brokka.v2 «Λένε πως πάνω στη θάλασσα λένε ονόματα κάθε βράδυ. Θα τους στείλω τ' όνομα του βασιλιά μου. Δούργκαν. Ωραίο ακούγεται, ειπωμένο χωρίς ευχή.» / "They say up by the sea they say names every night. I'll send them my king's name. Durgan. It sounds good, said without a wish." (d.brokka.u1)
- Elati in the Lanternglade, after `newFire`: d.elati.v1 «Είδες την τέταρτη φωτιά; Οι παλιοί έλεγαν πως στην άκρη του Βορρά ζει ένας λαός που λέει ονόματα στη θάλασσα. Παραμύθια, νόμιζα.» / "Did you see the fourth fire? The old ones said that at the end of the North lives a people who say names to the sea. Tales, I thought."
  - .r «...Κάποια από τα παιδιά που στείλαμε μακριά πήγαν προς τα κει, αδελφή. Ίσως όχι όλα για να πεθάνουν.» / "...Some of the children we sent away went that way, sister. Maybe not all of them to die."
- Elati, after `tamMet` (the hero has met Tamarisk): d.elati.v2 «Η Μυρίκη ζει; Πες της: το βλαστάρι της, στις πέτρες, μεγαλώνει. Το είδα με τα μάτια μου.» / "Tamarisk is alive? Tell her: her sapling, by the stones, is growing. I saw it with my own eyes." Sets `tamSapling`. This is the answer for the Warden and the Mage; the Ranger gives it herself.
- diff.ash.d is reworded so it no longer names Karthax: «Η τέφρα θυμάται κάθε λάθος.» / "The ash remembers every mistake."

**Catch-ups on zoneEnter** (the Act IV pattern; a flag saved before its scene is caught up quietly):

| flag | catch-up |
|---|---|
| `alkyone` | → 24 |
| `coastCall` without `coal` | q24 stays; Halda's Cradle line and the coal interact at the beacon are offered again (the corridor exit stays locked on `coal`) |
| `coal` | → 25 |
| `hearth` without `rite` | replay the rite, then → 26 |
| more lights lit than `mem_i1`-`mem_i3` seen | the lit tower's ice window offers «Θυμήσου»; questGoal points at it |
| `light_grey`, `light_wreck`, `light_fall` all set and `mem_i1`-`mem_i3` all seen | → 27 and `towerWake` |
| `towerDown` without `frozen` | replay the Freeze |
| `frozen` | → 28 |
| `hole0`-`hole2` all set | → 29 |
| `skotosWake` without `skotosDown` | the fight starts again; the Remembers replay with Selna's name hidden (`selnaBack` is saved only with `skotosDown`) |
| `skotosDown` without `seaLit` | replay the naming card and `answer5` |
| `seaLit` without `carved` | q.29b |
| `carved` | → 30 |
| `toldChild` without `h.act5` | → actComplete(5) |

Quitting mid-cine never strands a save. A tide, an ice break, a seal or a boss phase in progress is runtime-only; zones rebuild from the seed.

**Cached zones.** A zone is built once and kept in `G.zones` (world.js enterZone: `if (!z || o.fresh)`), so build-time code does not run again on re-entry. Act V therefore never relies on build time alone:
- the Field's corridor plug is opened in `act4Enter` on every entry as well as in `act4Zone`;
- `enterZone` passes `fresh: true` for 'coast' whenever `coastMode()` differs from `z.mode` (the mode the zone was built in), and for 'farlight' whenever `skyMode()` differs from its `z.mode`;
- the tide and the ice keep their state on the zone (`z.tide`, `z.ice`), and `act5Enter` resets both on every entry: the clock restarts at low water and every tidal cell is set by its bed at h = 0 in one batch; every broken or slush thin cell goes back to thin ice at stage 0 and the loads clear (the ice heals while the hero is away). A cached zone and a fresh build then start from the same map.

**New text keys beyond the lines above** (Greek first):
- **Zones:** zone.coast «Η Παγωμένη Ακτή» / "The Frozen Coast", zone.coast.s «Εκεί που γυρίζει η παλίρροια» / "Where the tide turns"; zone.farlight «Ο Έσχατος Φάρος» / "The Farthest Light", zone.farlight.s «Εκεί που τελειώνει ο Βορράς» / "Where the North ends".
- **Exits:** exit.coast «Ο Λαιμός του Αμονιού» / "The Anvil's Neck"; exit.farlight «Ο πάγος ως τον Έσχατο Φάρο» / "The ice to the Farthest Light"; exit.boat «Πλεύσε στον Έσχατο Φάρο» / "Sail to the Farthest Light" (stretch: the spring reading); d.iceShut «Ο κόλπος δεν έχει πάγο να σε κρατήσει. Ο Έσχατος Φάρος είναι πέρα από το νερό.» / "The bay has no ice to hold you. The Farthest Light is out beyond the water."
- **Waypoints:** wp.coast «Η Σκάλα» / "The Landing"; wp.farlight «Το Παγιδευμένο Καράβι» / "The Icebound Ship".
- **Toasts:** q.lightLit, q.holeSealed, q.forgot, q.selnaBack (above); q.tideTurn «Γυρίζει η παλίρροια» / "The tide turns"; q.freeze (big) «Η θάλασσα πάγωσε» / "The sea has frozen"; q.iceOut (big, stretch) «Ο πάγος φεύγει» / "The ice goes out"; q.names «Ονόματα: {0}/4» / "Names: {0}/4"; skotosDown (big) «Το Σκότος βούλιαξε ξανά κάτω από τον πάγο» / "The Skotos has sunk beneath the ice again".
- **Prompts:** «Άναψε τον φάρο» / "Light the sea-light"; «Άναψε το τζάκι» / "Light the hearth"; «Άναψε το λυχνάρι» / "Light the lamp"; «Άναψε τον φάρο του» / "Light its light"; «Θυμήσου τη» / "Remember her"; «Δώσε στον φάρο τη φωτιά του Λευκόβραχου» / "Give the light Whitecliff's fire"; «Πάρε ένα κάρβουνο» / "Take a coal"; «Χάραξε τα ονόματα» / "Carve the names"; «Θυμήσου» / "Remember" (memories).
- **HUD:** hud.cold «Ψύχος» / "Cold"; hud.chilled «Ρίγος» / "Chilled" (not «Παγωνιά», which is the Frost Nova's name); hud.freezing «Ξεπαγιάζεις» / "Freezing"; hud.frostbite «Κρυοπάγημα» / "Frostbite"; hud.warmed «Ζεστάθηκες» / "Warmed"; hud.revealed «Στο φως!» / "In the light!"; hud.plunge «Στο νερό!» / "Into the water!"; hud.drowned «Πνίγηκε» / "Drowned"; hud.tide «Παλίρροια» / "Tide"; hints: hint.tide «Άκου την καμπάνα: η θάλασσα γυρίζει» / "Listen for the bell: the sea is turning"; hint.ice «Ο πάγος ραγίζει. Μη στέκεσαι.» / "The ice is cracking. Don't stand still."; hint.louse «Κύλησε πάνω τους όταν κουλουριαστούν» / "Roll into them when they curl up"; hint.cold «Ζεστάσου σε φωτιά ή στη δέσμη ενός φάρου» / "Warm yourself at a fire or in a sea-light's beam".
- **Names:** npc.alkyone «Αλκυόνη» / "Alkyone"; npc.selna «Σέλνα» / "Selna" (blank «…» while forgotten); npc.tern «Γλαρόνι» / "Tern"; npc.tamarisk «Μυρίκη» / "Tamarisk"; npc.glaukos «Γέρο-Γλαύκος» / "Old Glaukos"; npc.shorefolk «Αλιγενής» / "Saltborn"; npc.child «Παιδί» / "A child"; npc.einar «Έιναρ» / "Einar"; npc.iceMemory «Μνήμη από πάγο» / "A memory in ice"; npc.skotos «Το Σκότος» / "The Skotos".
- **Act panels:** act4.next (replaced), act5.done, act5.sub, act5.next, q.31, game.sub5 «Το σκοτάδι έχει όνομα» / "The dark has a name".
- **Key families:** d.alk.*, d.selna.*, d.tern.*, d.tam.* (+ .r), d.glaukos.*, d.skotos.* (+ .r), d.ice.i1-i4.*, d.stone.*, d.freeze.*, d.far.*, d.coast.*, d.child.*, d.answer5.*, d.brokka.v1-v2, d.elati.v1-v2 (+ .r), echo.*, boon.*, mon.*, pick.locked (reworded, see Difficulty), diff.skotos (stretch).
- About 235 new bilingual lines in the base (the stretch items' lines are kept ready apart), proofread against text.js for the house voice: short, plain, poetic; Greek first; folk with contractions in English; the Skotos lowercase and without "I".

### npcs
All Act V people are in one new people set, `frost` (folk.mjs --set=frost): **seven scenes** (sunken, icesinger, alkyone, selna, tern, tamarisk, glaukos). The Harpooner is the Sunken's scene with code parts, and the shorefolk are runtime tints of people.glb villagers, so neither costs a scene. The set is built first and gated on a measured count of **25 textures or fewer** (see Assets): a grade applied to different source scenes still makes separate textures, and the shipped sets measure 5 to 7 textures a scene (ash.glb 55 for 11 scenes, grove.glb 47 for 7, folk.glb 27 for 5). The Act V zones load no folk, grove or ash set of their own, but the only way to the coast before its waypoint crosses the Field, which loads cinder, ash, folk, grove and act4. Whitecliff loads `frost` ad hoc from q24 (the way Act IV's town loaded `folk` for Brokka), because Alkyone stands there and the q30 child wears the frost child scene; the Field does the same from q25 for Alkyone at the Anvil Gate.

- alkyone Αλκυόνη / Alkyone: the act's quest-giver.
  - **Who she is:** a Saltborn keeper of about forty-five, salt-white braid, oilskin coat, a whale-oil sea-lantern with a white flame. Selna's daughter, Tern's mother, Keyx's widow. She walked south following the new fire and lit the Graves on her way.
  - **Voice:** plain, salty, dry; she counts things (tides, lights, nights). Contractions in English. She calls the hero «φρυκτωρέ» / "beacon-keeper", a vocative common to both genders, so she needs no .r variants.
  - **Where she stands:** Whitecliff's beacon (q24); the Anvil Gate plaza (q25); the Landing (q25-26); the bay's shore rock (q27 and the Freeze); the Icebound Ship, then ahead of the hero at each Breathing-hole (q28); the Light's Skerry (q29); post-game the Landing, with the Shadow Gates line.

  | model | |
  |---|---|
  | source | people-reproportion |
  | notes | Recipe 'alkyone': the 'healer' source with a WEATHER table (girth 1.04, neck_01 len 0.98), Hair_Long recoloured salt-white and braided in code, a short hood from models.js veilParts, and an oilskin grade on the dress (dark ochre, roughness 0.4 at load). She holds Poly Haven vintage_oil_lamp with its glass on the GLOW material. Elianthe wears the same source and stands near her in q24, so the hood, the braid, the coat grade and the lantern must tell them apart: check both side by side in the people viewer (`?viewer&only=p:alkyone,p:healer`) before the set is frozen. Clips: Idle_Lantern_Loop, Walk_Loop, Idle_Talking_Loop, Fixing_Kneeling. |
- selna Σέλνα / Selna: the eldest living keeper, about seventy-five, Alkyone's mother. She raised the Farthest Light to answer Whitecliff (the fourth fire). After the Skotos drank the Farthest Light (q24) she kept the dark tower with Tern; at the Freeze she gave him one lamp and walked out onto the new ice to say the dark's name to its face, the oldest rite, and the world began to forget her. The hero remembers her in the Skotos fight. She survives: the warm reversal of Isarn's walk into the fire.
  - **Voice:** ancient, so no contractions in English. Says names the way other people breathe.
  - **Where she stands:** kneeling on the ice in the Skotos fight; with a lamp in its phase 3; in the lantern room at the end; post-game at the Farthest Light (vendor), keeping the nightly rite.

  | model | |
  |---|---|
  | source | people-reproportion |
  | notes | Recipe 'selna': the 'smith' source (the female peasant; Halda's body, but Halda never leaves Whitecliff and Selna never comes south) with an ELDER table (neck_01 len 1.06, girth 0.9) and a runtime spine stoop (the flinchQ pattern, people.js:309), Hair_Buns recoloured white, a fur collar in code, the Saltborn oilskin grade, and a sea-lantern. She is also the woman of Ice Memory 1, in the memory material. Clips: Idle_Lantern_Loop, Fixing_Kneeling (kneeling on the ice), Walk_Loop, Idle_Talking_Loop. |
- tern Γλαρόνι / Tern: Alkyone's son, ten. He kept one lamp alight at the foot of the dark Farthest Light. In the Skotos's phase 3 he walks out with it.

  | model | |
  |---|---|
  | source | people-reproportion |
  | notes | Recipe 'tern': the 'villager0' source with the CHILD table the Act IV isarnBoy recipe uses, a wool cap and a small lamp (vintage_oil_lamp ×0.6) in code. **The one child scene serves three roles:** Tern; the boy Einar in Ice Memory 2 (memory material, no cap); and the Whitecliff child in q30 (village runtime tint, no cap, no lamp). |
- tamarisk Μυρίκη / Tamarisk (μυρίκη is the ancient Greek word for the salt-loving tamarisk tree, an Evergreen plant name like Ελάτη and Φλαμουριά): one of the nursery children Amaranthe sent to the edges of the North (d.tear.nursery.1). She left before the rooting, so she has no bark. She is the healer and vendor at the Landing and at the Icebound Ship, and she carries the Ranger's thread: the recognition line, the sapling, the farewell. The canon brief's own suggestion (§3.G).

  | model | |
  |---|---|
  | source | people-reproportion |
  | notes | Recipe 'tamarisk': the 'ranger' source with the ELF table (Elati's), Hair_Buzzed from 'villager2' recoloured salt-white (she cut it short like the Saltborn), and a sea-grey cloth grade over the ranger leathers. No barkify pass, so the Poly Haven bark source the Act III recipes needed is not required. The player Ranger wears the same body; the hair, the grade and a fur collar in code tell them apart. |
- glaukos Γέρο-Γλαύκος / Old Glaukos: the Landing's blind elder, vendor of whale oil and harpoon gear (ordinary items), keeper of the lore and of the Landing's nightly rite. He says «Σκότος» first in the game.

  | model | |
  |---|---|
  | source | people-reproportion |
  | notes | Recipe 'glaukos': the 'wayfarer' source with the ELDER table, the hood dropped, a cloth band over the eyes in code, and a wool grade. **Without the eye band and in the memory material he is old Arna in Ice Memory 4,** which keeps the old man's look close to Act IV's arnaOld (the same wayfarer source and ELDER table). |
- shorefolk Αλιγενής / Saltborn: three villagers at the Landing who come out when the hearth is lit, ring the tide bell and mend nets. One of them is the young keeper of Ice Memory 4.

  | model | |
  |---|---|
  | source | existing-model-retint |
  | notes | No new scene: people.glb 'villager1' and 'villager2' (boot-loaded) with a runtime oilskin tint (a tint above 1 drains the colour first, people.js:89-91), and a code hood or fur collar; the tints vary the three. Clips: TreeChopping_Loop (hauling a rope), Idle_Rail_Call (ringing the bell), Idle_Lantern_Loop. |
- einar Έιναρ / Einar: Arna's brother, a Man of the South, seen only in Ice Memories 2 and 3: a boy with a broken leg, then a young man lighting the Farthest Light. He is never seen alive and never seen old.

  | model | |
  |---|---|
  | source | existing-model-retint |
  | notes | No new scene. The boy is the 'tern' scene in the memory material. The young man is a people.glb villager body (boot-loaded; 'villager1' or 'villager2', whichever reads as a young man in the people viewer at the memory tint), never 'warden', 'ranger' or 'mage': those are the player classes' bodies, and a Warden would see his own double in Ice Memory 3. |
- arna Άρνας / Arna: in Ice Memory 4 only, the old man who walks north without a light.

  | model | |
  |---|---|
  | source | existing-model-retint |
  | notes | The 'glaukos' scene without the eye band, in the memory material. No new scene. |
- halda / elianthe / villagers: in Whitecliff. Halda's barks at q24 and her aurora line at q30; Elianthe's barks; the child's bark after the act.

  | model | |
  |---|---|
  | source | existing-model-retint |
  | notes | Unchanged. |
- brokka / elati: **at home, not in Act V's zones.** Each has two new home lines (d.brokka.v1-v2, d.elati.v1-v2 with .r). Their fires answer in `answer5`. Keeping them home avoids repeating Act IV's ensemble, keeps the frost set at seven scenes, and honours d.elati.home.r. A cameo in the Skotos's phase 3 (rebuilding both into the frost set, +2 scenes) is listed under Risks as an option the budget does not allow today.
- skotos Το Σκότος / The Skotos: speaks only in lowercase `say` lines and place voices, with a black-disc portrait in dialogs. Its shape in the fight is the boss model (see Bosses).
- iceMemory Μνήμη από πάγο / A memory in ice: the narrator portrait, after «Μνήμη από κεχριμπάρι» and «Μνήμη από στάχτη».

## Zones
### How the hero gets there from Whitecliff
**The route:** Whitecliff → the north path behind the beacon hill (exit 'ashfield', open since Act IV) → the Field of Ash at dawn, from the Dark Beacon camp up the Wayfarers' Road → the Anvil Gate plaza → a new corridor, the Anvil's Neck (Ο Λαιμός του Αμονιού), along the Black Anvil's eastern foot → the Frozen Coast → Skerry Bay → after the Freeze, the Ice Road onto the frozen sea. (In the stretch spring reading, a Saltborn boat from the Landing's jetty replaces the bay road after `iceOut`.)

**Waypoints:** `coast` (the Landing, once the hearth is lit) and `farlight` (the Icebound Ship, on first arrival). The waypoint list in panels.js:163 gains both. Sea-lights, the Skerry Light and sealed Breathing-holes are respawn checkpoints (`z.checkpoint`), not waypoints.

**The corridor in the Field of Ash** (gen4.js; the only change to an old zone).
- **Where it runs:** from the Anvil Gate plaza's south-east rim, at 100° to 130° from north on r 14, east and then north along the foot of the Black Anvil to the map's top edge, at x = min(w − 8, GP.x + 26). It is 4 cells wide. It must not cross the Lantern Graves gorge. The hard check is a rectangle, the one gen4 already uses to keep dressing off the Graves (gen4.js:516): no corridor cell with |x − GV.x| < 18 and GV.z1 − 4 < z < GV.z0 + 4. (An x-band alone would fail every seed: the mouth sits at GP.x + 11..14 and GV.x is GP.x ± 8, but the mouth lies at about z 27-35, north of the Graves at z 41-80.)
- **What it holds:** the exit `{ x, z: 3, to: 'coast', label: 'exit.coast', locked: 'coastCall' }` at the top.
- **How it is carved, so saved seeds keep their layout** (engine brief §1.1; judge must-fix):
  - after `tryAshfield` returns its layout, never inside it. The exit is pushed to `L.exits` only then, because the reach check at gen4.js:527 tests `L.exits`; an exit pushed earlier could make old seeds retry into a different layout;
  - with its own RNG (seed ^ 0xC0A57);
  - through solid cells only, with `L.hgt` recomputed locally for the corridor cells and a 2-cell blend at its walls (terrain() ran before dressing, so without this the floor would render as the Anvil's cliff slope);
  - every dressing prop whose footprint touches the corridor is dropped; the corridor's own dressing (scree, a few dead trees) comes from its RNG, within 2 cells;
  - never added to `tryAshfield`'s `need` list.
- **Old saves:** the corridor's mouth is plugged by four cells of rubble, which `act4Zone` and `act4Enter` open with map.open when `newFire` is set (act4Enter runs on every entry, so a Field cached before `newFire` opens too). A save still fighting Ivar keeps a closed arena.
- **Parity check:** a script compares `genAshfield` against HEAD over check-act4's whole seed sweep. It must show zero differences outside the corridor and its 2-cell band. It ships with the change.
- **Plan B** if parity cannot be held: the exit leaves the cold Forge instead, through the dead flue of the north Great Bellows chamber (genForge already ends there), with the same lock.
- **The world.js:48 comment** "on the Dark Beacon" becomes "on the Farthest Light, out on the sea ice beyond the Black Anvil". This settles the canon conflict (canon §0.9). The Dark Beacon prop stays cold in every state.

### coast (28) Η Παγωμένη Ακτή / The Frozen Coast
LAYOUT: genCoast(seed) in a new src/world/gen5.js. The map is 120 × 200 cells: about Act IV's Field, plus a sea margin. `ZONES.coast = { level: 28, music: 'coast', ambient: 'coast', atmos: 'coast', act: 5, pack: 'rime', light: 'sea', ring: 4 }`.

**Orientation is fixed:** land to the south and west, sea to the north and east, so the sea always meets the fog on the same two edges, where the far-sea plane continues it.

**New layout fields** (beside cells, paint, low, hgt, spots, packs, lights, props, exits, start):
- `L.bed` (Float32): a cell's bed height in metres, quantised to 0.15; `BED_DRY` (9.0) for dry land, a finite sentinel no tide reaches, so the same value can go into the `aBed` vertex attribute safely on mobile GPUs; −0.6 for the open sea (always deep);
- `L.ice` (thin ice over water) and `L.thick` (unbreakable ice);
- `L.tideLocked` (spots reachable only at low water);
- `L.deck` (jetty planks, the Act III pattern);
- `L.window` (ice windows over the frozen figures).

South to north:

**(A) The Anvil's Neck (Ο Λαιμός του Αμονιού).**
- The entry (exit 'ashfield' at h − 5, x = 52 ± 10).
- A pass 9 to 12 m wide winds 40 m north between walls of black rock, the last warm stones of the Black Anvil, rimed white.
- The ground fades from ash-stained shore stone to snow: the `shore` layer, painted heavily at the south end.
- At its mouth, the overlook where the arrival cine plays.

**(B) The Landing (Η Σκάλα).**
- A cove at (30 ± 6, 136 ± 6), r 13, always `bed = BED_DRY`.
- A shingle beach on its north-east side shelves into tidal cells (bed 0.3-0.9), then open sea.
- A plank jetty, 2 × 9 deck cells, runs out over the water. (In the stretch spring reading the boat exit stands at its end.)
- In the cove:
  - 5 to 7 huts: the Wooden Shack scan, and stilt huts built in code from the `planks` layer;
  - two drying racks, made in code from instanced poles and grey stockfish cards;
  - three keel-boats drawn up (Gislinge), resting on the mud at low water and bobbing at high water;
  - the hearth (camp and waypoint once lit), the tide bell on a post, a Name-stone;
  - NPC spots for Alkyone, Tamarisk, Glaukos and three shorefolk.

**(C) The Shallows (Τα Ρηχά).** East of the Landing, x 56-118, z 92-150. Tidal flats laid out by bed height:
- **Bed:** `bed = 0.15·round((0.9·fbm(x·0.05, z·0.05) + 0.6·(1 − d/dSea)) / 0.15)`, clamped to −0.3..1.5, where d/dSea is the distance to the sea edge over the band's width.
- **Creeks:** two or three, meandering 30 to 50 m in from the sea edge (the gen3 trail-walker), bed −0.3 to 0.3. They flood first and drain last, so the flood visibly races up them.
- **Four rock islets**, r 2-3.5, `bed = BED_DRY`: the refuges.
- **The Dalarö wreck** on a bar (bed 0.6-0.75). Its hull sides are blocked footprints and its open belly is walkable floor holding an ebb hoard. It drips after the tide leaves it.
- **The Grey Light** on an islet at the seaward edge (106 ± 4, 116 ± 8), r 4, `bed = BED_DRY`, joined to the shore by a 2-wide causeway with bed 0.45-0.6: dry at low water, wading from h 0.45, deep from h 0.9. A walk out at low water takes 5-7 s; a hero who lingers waits on the islet, in the light and safe, for the next low water.
- **The ebb caves (Οι Σπηλιές της Άμπωτης):** two at the foot of the low sea-cliff on the Shallows' south edge, bed 0.3-0.6, each with an ebb hoard or a Name-stone.
- **The wrack line:** kelp heaps, driftwood and barnacle rocks dressed along the bed ≈ 0.6 m contour, where real wrack collects. Dormant Sunken lie under it; Reefbacks lie on the bars as boulders.

**(D) The Ship Graveyard (Το Νεκροταφείο των Καραβιών).** x 64-118, z 52-92.
- A bay whose southern shore is shingle and whose mouth is a thin-ice shelf.
- Six to nine wrecks, half on the shore and half caught in the ice (props placed with a tilt): keel-boats, rowboats, broken hull halves. Hull-louse dens in the larger hulls.
- A thick-ice spine, 3 wide, across the shelf to **the Wreck Light** on the bay's point (110 ± 4, 66 ± 6).

**(E) The Frozen Fall and the Whalebone Strand (Ο Παγωμένος Καταρράχτης, Η Ακτή των Φαλαινών).** x 4-58, z 56-124.
- A fjord arm open to the sea at its north end. Its inner half is an ice shelf: thin ice with a thick path 2-3 wide along one wall, and 3 to 5 Icemaw holes (open water).
- At its head the frozen waterfall: code ribbons and icicles on the west cliff, around (9 ± 3, 90 ± 8). At its foot a frozen pool and **the Fall Light** on a rock.
- The right whale's skeleton on the strand, a skua roost and a Name-stone under its jaw.
- A Rime Bear den: a 6 × 6 dead-end alcove under the cliff.
- This is where cracking ice is taught, before the second zone depends on it.

**(F) Skerry Bay (Ο Κόλπος της Νησίδας).** The boss arena, centred at (60 ± 8, 30 ± 3), r 18.
- **The south half** is a sand bowl of tidal flats (bed 0.2-0.6) with three dry rock islets (r 3.5) at r 9, a boulder on each, and the ribs of a wrecked hull along one flank as solid cover.
- **The north half** is thin ice, with a thick rim 2 cells wide around the arena edge and a thick spine across, west to east.
- **The bay's own water.** A sand bar (bed ≥ 1.2) closes the bowl from the Shallows, so the zone's tide never enters `L.boss + 4`. Once the boss wakes, it drives the arena's water itself (`TIDE.force`).
- **At the centre lies the Skerry:** the sleeping boss as a rock island of r 4, its cells blocked until `towerWake`.
- **The exit to the frozen sea** is on the bay's north rim: after `frozen`, a thick road 4 wide to `{ x, z: 3, to: 'farlight', label: 'exit.farlight', locked: 'frozen' }`. Before then the rim is open water, with the shut line d.iceShut.

**The main road** is painted and always on `bed = BED_DRY` land: the Neck → the Landing → north along the shore between the Shallows and the Fall → the Graveyard's south shore → the Bay. Everything not carved is cliff.

**Over seeds.**
- **Retries:** seed + k·7919, 24 tries, the last accepted (gen4's loop).
- **What varies:** every landmark's position within the ranges above; the creek pattern (fbm plus 2-3 walkers); which islets carry boulders; the wreck set and its placement; which hulls hold lice; the ebb caves' contents; the number of Icemaw holes; the Name-stone spots; which flank of the bowl the ribs lie on; the dressing, from its own RNG after carving.
- **Height (`L.hgt`, visual only; every walkable cell stays at y = 0):**
  - cliffs: 8 + 10 · fbm, rising with distance from the floor;
  - open sea: −1.5 at the shore down to −4.5 offshore;
  - flats: 0;
  - the ground under thin ice: −2, so a broken cell shows water; `groundY` returns the ice surface on ice cells (see The look);
  - ice-window pits: −2.2.
- **Reach checks, after dressing:**
  - **at h = 0 and at h = 1.2:** the entry reaches the hearth, the camp, the waypoint, every NPC spot, the bay rim, the exits and every pack spot that stands on always-dry land (`bed = BED_DRY`);
  - **at h = 0:** every sea-light base, ebb hoard, wreck belly and tide-locked Name-stone is reachable, and so is every tide pack spot (the wrack lines at bed ≈ 0.6 and the bars are under deep water at h = 1.2 by design);
  - **hard failure:** a pocket that is dry at h = 1.2 and not connected to the camp at h = 1.2, unless it carries a `skerry` marker (an islet with a light or a refuge);
  - every tide-locked area has a `bed = BED_DRY` refuge of at least 3 × 3 cells within 12 m;
  - the Graveyard spine reaches the Wreck Light; the Fall's thick path reaches the Fall Light; the bay's thick rim is unbroken;
  - no interactable, camp, window or exit stands on a thin-ice or tidal cell, except the interactables marked `tideLocked` (the ebb hoards and the tide-locked Name-stone, in caves of bed 0.3-0.6), which are checked at h = 0 instead.
  - Failures are sorted into `check-act5.mjs`'s hard and soft sets. A hard check that every seed fails would send every build through all 24 tries (slow on a phone) and keep the last, unchecked layout, so `check-act5` also reports the mean number of tries per seed and lists a mean above 3 as a soft failure.

**After the Freeze** (`frozen`; `coastMode()` 'frozen'): the same seed, rebuilt, with only Skerry Bay and the sky changed.
- The bay's north rim, open water until now, becomes a thick road 4 wide to the exit onto the frozen sea (a hard check: it reaches the exit).
- The dead Walking Tower stands rimed on its sleeping skerry at the bay's centre, still lit.
- ATMOS 'coastFrozen' (the black aurora) over the whole coast; past the fog line the far-sea quads (`seaBeyond`) take the ice material, so the horizon is white pack ice.
- The rest of the coast keeps its tide, its packs and its thin-ice shelves: sea ice cannot hold over flats that drain twice a cycle, so the frozen sea begins beyond them.

**Stretch, out of the base scope: two more readings of the coast.**
- **The full frozen reading.** Every tidal cell with bed < 0.75, every creek and the sea within 40 m of the shore become thin ice with `L.hgt` −1.2 under them; thick paths join the Landing to each sea-light and to the bay; the tide stops at low water; the packs swap to frozen variants (frozen crews where the wrack lines were, Reefbacks as boulders in the ice, lice under cracks, more Icemaw).
- **The spring reading** (`iceOut`, saved with `seaLit`; its cine d.iceout and big toast q.iceOut on the first coast entry after it). The tide returns on a gentler cycle (180 s, high water 1.0 m); the Fall shelf and the Graveyard mouth are open water with static floes (2 × 2 walkable cells that bob visually); tide-wake packs at half count; ATMOS 'coastSpring'; the exit to the frozen sea becomes a Saltborn boat at the Landing's jetty («Πλεύσε στον Έσχατο Φάρο»). **The bay's north half stays in `L.ice` at crack stage 4** (the ice shader discards it and shows water), so the Walking Tower's echo can reset those cells to stage 0 and map.open them for the fight.

ATMOS:
- **ATMOS.coast** (from `coastSeen` to the Freeze, under the green aurora):
  - fog 0x0b1416, density 0.02; sky 0x4a6a78; ground 0x1a2024; hemi 0.85;
  - moon 0xb8d8c8, moonI 1.0; exposure 1.2;
  - heroI 22, heroRange 11, heroColor 0xffe8c8 (the Cradle's white-gold coal); zoom 1.05;
  - aurora uniforms `uAur` 0.8, `uAurDark` 0; the hemi colour drifts slowly between green and white.
- **ATMOS.coastCine:** the same with density 0.008, so the horizon reads in cinematics.
- **ATMOS.coastFrozen** (`frozen`, before `seaLit`, the black aurora): fog 0x0a0f18, density 0.022; sky 0x3a4866; ground 0x1a1f28; hemi 0.75; moon 0x9ab0e0, moonI 0.9; `uAur` 0.35 (a faint violet-grey), `uAurDark` 1. The surf drops to a low hiss; ice pings.
- **After `seaLit`** the coast takes ATMOS.coast again, with `uAur` 1: the true aurora, green and white. (ATMOS.coastSpring belongs to the stretch spring reading: fog 0x0b1714, density 0.016; sky 0x5a8a78; ground 0x18221e; hemi 0.95; moon 0xb8d8c8, moonI 1.1; exposure 1.2; heroRange 13; `uAur` 1, `uAurDark` 0.)
- **FX ambient 'coast':** light snow on the sea wind, spindrift ribbons along the ground, and sea smoke rising off open water near the camera. 'coastFrozen' swaps the sea smoke for diamond dust.
HAZARDS:
- **The Tide** in the Shallows, the Landing's cove and the Bay (see mechanics).
- **The Cracking Ice** on the Fall's shelf, the Graveyard's mouth and the Bay's north half.
- **The Cold:** from wading, plunges and hits; never from simply being outdoors.
- **Flood waves:** Sunken walk out of the water when the tide passes 0.75 m.
- **Icemaw lunges** from the fjord holes and, at high water, from the waterline.
- **Whale-oil casks** on the wrecks and the jetty: break one for light, warmth and a fire that melts ice.
- **The beams** of lit sea-lights: a friend; they dazzle the Skotos's creatures.
SET PIECES:
- The arrival over the Neck: the sea, and the first aurora the hero has ever seen.
- The Landing coming back to life when the hearth catches; the rite, and the first «Σκότος».
- The flood racing up the creeks at the tide bell; wrecks rising out of the ebb, dripping, gulls lifting off their ribs.
- Each sea-light's first sweep out over the dark sea.
- Three frozen figures in clear ice at the towers' feet.
- The Frozen Fall with icicles over a frozen pool; the right whale on the strand under the beam.
- The Skerry standing up out of the bay with its dead tower.
- The Freeze: wave crests stopping mid-curl while three beams sweep over new ice, and the aurora going black from the north.
- After the act: the Skerry Light burning on its island under the true aurora.
GROUND/PROPS: **The 'rime' pack** (tools/pack-rime.mjs, `loadPack('rime')`; PACK_ORDER gains 'rime' last).

**Ground layers**, d 1024 / n 512, each with AO baked by `packLayer`:

| layer | source | use |
|---|---|---|
| `snow` | Poly Haven snow_02, Rob Tuytel | land |
| `snowTrod` | Poly Haven snow_03 | paths, the Landing |
| `shore` | Poly Haven low_tide_rocks, Dimitrios Savva | flats and beaches |
| `seaCliff` | Poly Haven seaside_rock | the wall layer, and the world-projected rock props |
| `ice` | ambientCG Ice002 | the ice shader, and the B layer on thick ice |
| `planks` | Poly Haven wood_planks_grey | jetty, stilt huts, wreck decks |

Six layers, where the brief allows nine.

**GROUND.coast:** A `snow`, B `shore`, P `snowTrod`, W `seaCliff`; s [3.2, 2.4, 2.6]; r [0.6, 0.8, 0.85]; plus the new groundMat defines G_GLINT (on A), G_WET (on B, from the `aBed` attribute and `uWetLevel`) and G_AUR.

**Props** (itemised under Assets):
- **Wrecks:** the Dalarö hull, Gislinge boats, rowboats, a broken boat: their own scans.
- **The three towers:** the JB3D ruins, one texture set shared by all three, with a code fire-cage on top.
- **Huts:** the Wooden Shack, and code stilt huts.
- **Dressing:** anchors (medieval and sunken); the right whale skeleton; the Name-stones (runestone scan with emissive code name-lines); barnacle rocks, driftwood and kelp heaps; Poly Haven barrels (the whale-oil casks), crates and the oil lamp.
- **Geometry-only scans** take the world-projected `seaCliff` material, so they cost no texture memory: Poly Haven coastal_cliff_01 and rock_face_01 for cliff faces; the shipped env boulder/rockA-C for sea stacks.
- **Icicles and floes** take the act's ice material (see The look).

### farlight (31) Ο Έσχατος Φάρος / The Farthest Light
LAYOUT: genFarlight(seed) in gen5.js. The map is 112 × 208 cells of frozen sea, with the coast's headlands as cliff along the south edge and the ice edge and open sea along the north. `ZONES.farlight = { level: 31, music: 'farlight', ambient: 'farlight', atmos: 'farlight', act: 5, pack: 'rime', light: 'sea', ring: 4 }`. **There is no tide here:** the sea is frozen. Its systems are ice, Cold and beams. The zone exists from the Freeze on.

South to north:

**(A) The Icebound Ship (Το Παγιδευμένο Καράβι).**
- The entry (exit 'coast' at h − 5).
- A merchant ship frozen into the ice at a list: Poly Haven dutch_ship_medium, decimated, with a blocked footprint of about 4 × 18, turned. Its belly is floor; its crew stand frozen at the rails (a frozenCrew pack).
- In its lee, the camp on thick ice: waypoint `farlight`, Alkyone and Tamarisk (healer, vendor), a brazier.

**(B) The Ice Road (Ο Δρόμος του Πάγου).**
- A thick-ice spine 4 to 6 cells wide, from the camp north to the skerry, winding by fbm with an amplitude of 14 m, with Saltborn marker poles every 8 m.
- Pressure ridges of ice blocks along both sides: env rocks at small scale in the ice material, blocking cells, with gaps every 8 to 14 m.
- Thin-ice fields everywhere else, with Icemaw holes and thin-ice islets holding chests (and, in the stretch, the frozen sea's four Name-stones).

**(C) The three Breathing-holes (Οι Ανάσες).**
- Three leads of open black water (closed low cells, 3 to 5 wide) cross the whole width of the map, at z 150 ± 6, 104 ± 6 and 58 ± 6.
- Each widens into a round hole of r 4.5 beside the road.
- Three marker-lamps stand on the hole's rim at 120° on thick pads of r 1.5: two on the south side of the lead and one on a thick tongue reaching into it, so the hero must move between them.
- The road ends at each lead's south edge and starts again on the north edge.
- `L.spots.holes = [{ x, z, r, lamps: [{x, z}×3], lead: cells[], id }]`.
- Sealing a hole turns its whole lead into thick ice with map.open. **This is the zone's gate,** the shape of the Forge's slag plug: nothing beyond a lead is reachable until it is sealed.

**(D) The Drowned Lights (Τα Πνιγμένα Φώτα).**
- Three or four side areas on the thin fields.
- In each, an old sea-light lies under the ice with its lantern still glowing (`uGlow` in the ice shader), plus one ice window over a sunken lantern prop.
- Each holds a side chest.

**(E) The Bergs (Τα Παγόβουνα).**
- Three to five icebergs, r 4-7, frozen in the thin fields: cover, shade, and lee from the blizzard gusts.
- A Rime Bear lies up in the lee of one.

**(F) The Light's Skerry (Η Νησίδα του Φάρου).** The boss arena, centred at (56 ± 6, 28 ± 2), r 16.
- **The core:** a skerry of r 6.5, rock and snow on thick cells.
- **The Farthest Light:** a tall stone tower, the Old Lighthouse shaft with a code lantern room, at (cx, cz + 4.5) on the core's south edge, blocked 3 × 3. Its door faces north onto the arena; the door-stone carries the cut names of Einar and Arna.
- **The ring:** thin ice from 6.5 to 14.5, crossed by a thick cross 2 wide (north-south and east-west).
- **Selna's pad:** a thick pad of r 1.5 on the ring's north arm, between the core and the ice edge.
- **The rim:** thick, from 14.5 to 16.
- **The four fire-cairns** on thick pads of r 2.5 on the diagonals at r 11: `L.spots.fires`.
- **The north edge of the arena is the ice edge.** Open water from z 0 to 12, with the Skotos's spot at (cx, 6) and six candidate Hand holes on the ring (`L.spots.hands`).
- Four whale-oil casks on the rim.

**Over seeds.**
- **Retries:** the coast's loop.
- **What varies:** the road's winding; the lead positions within their bands; which side each hole sits on; the lamp tongue's side; berg placement; the thin-field noise; the Drowned Lights' positions and count; the chest islets.
- **Height (visual):** bergs rise 6 to 14 m; the sea sinks to −2.5; the ground under thin ice to −2; thick cells and the skerry stay at 0, with the skerry's rock rim at +3 visual.
- **Reach checks:**
  - the entry reaches the camp over thick ice, and the camp reaches hole 1's lamps;
  - with holes up to k sealed (simulated with map.open), hole k + 1's lamps are reachable along the thick spine;
  - with all three sealed, the arena rim, the core (through the thick cross), Selna's pad and all four fire pads are reachable;
  - **hard failures:** the thick spine broken anywhere; an ice window on a thin cell; a lamp or cairn on thin ice; a chest islet more than 8 cells from the nearest thick cell.

ATMOS:
- **ATMOS.farlight** (the black aurora): fog 0x070a10, density 0.026; sky 0x2a3448; ground 0x101418; hemi 0.6; moon 0x8a9ac8, moonI 0.7; exposure 1.3; heroI 24, heroRange 10; heroColor 0xffe8c8. `uAur` 0.3, `uAurDark` 1.
- **ATMOS.farlightNight** (the Skotos's phase 2): fog 0x020304, density 0.05; hemi 0.2; moonI 0.1; `uAur` 0. Reached through the existing `mixAtmos` easing over 2 s; the brief asks for it to be exported.
- **ATMOS.farlightAurora** (`seaLit`): fog 0x0a1612, density 0.018; sky 0x5a8a78; hemi 0.95; moonI 1.0; `uAur` 1, `uAurDark` 0.
- **FX ambients:** 'farlight' (diamond dust: tiny additive glints hanging in still air; spindrift) and 'blizzard' (for the 8 s wind gusts every 40 s on the open fields, telegraphed 3 s ahead by rising spindrift; and for the Night phase: dense snow driven sideways).
HAZARDS:
- **The Cracking Ice** on every thin field.
- **The Cold:** blizzard gusts on the open fields (bergs, the ship and warm pools are lee); any plunge into a lead.
- **Icemaw** lunges at holes and leads.
- **The Breathing-holes' Black Breath** during the seals.
- **Ice Singers** cracking the ice under the hero.
- **The beams:** the small marker-lights along the road after each seal, and the Farthest Light at the end.
SET PIECES:
- The shadow passing under the hero on arrival.
- The Icebound Ship with its frozen crew at the rails and a lit camp in its lee.
- Drowned lanterns glowing under the ice.
- Each freeze wave racing out across a lead.
- Tern's lamp at the foot of the dark tower.
- A woman kneeling on the ice with a guttering lantern while the Skotos rises at the ice edge under a black sky.
- The keepers walking out onto the ice with their lamps.
- Arna's fire climbing Einar's tower, and the beam swinging south.
- The naming, the title card, and the aurora coming back from south to north.
GROUND/PROPS:
- **GROUND.farlight:** A `snow` (on thick cells and the skerry), B `ice` (blue ice through the snow on the spine), P `snowTrod` (the road), W `seaCliff` (the skerry's rock faces); G_GLINT on A; G_AUR.
- **Thin ice** is the separate ice mesh, not ground.
- **Props:**
  - the Icebound Ship (Poly Haven dutch_ship_medium);
  - the Farthest Light (Nirved Kamble's Old Lighthouse shaft; its 19th-century iron lantern room is cut off and replaced in code by a stone gallery, an iron fire-cage and a glass ring; the spray-painted hearts and the modern door on its texture are painted out, and the door-stone with the cut names stands where the door was);
  - ice blocks and bergs (shipped env rocks in the ice material); icicles;
  - a sunken-lantern prop (the shipped wooden_lantern_01) under each window;
  - marker poles, the three-lamp rims and the four fire-cairns (code: a stone ring with an iron basket);
  - one anchor frozen in the ice beside the ship.

### The look: what each image costs
The engine has no render targets, no depth texture and no post-processing. It renders one scene straight to the screen (gfx.js `render()`), with ACES tone mapping and exponential fog. Phones run at a pixel ratio of 1.5 or less, with adaptive resolution down to 0.55. Everything below fits that model, and **every image has a quality-0 path, built first.**

The new work lives in four files, so build.js (2.8k lines, often under concurrent edit) gains only hooks:
- **src/world/sea.js:** the water, the ice, the aurora and the beams;
- **src/world/build5.js:** `act5Prop`, `act5Level` and the 'icy:' Instancer material;
- **src/game/tide.js** and **src/game/ice.js:** the two grids (see Mechanics).

**The shared inputs.** One 256² RGBA noise texture: four octaves of tileable value noise in its channels, generated in code at start-up (0.35 MB of GPU). One shared uniform block, `SEA`:

| uniform | what it carries |
|---|---|
| `uTime` | `WIND.uTime` |
| `uLevel`, `uWetLevel` | the water level now (metres, leading the walk grid by one step); the highest level of the last 20 s |
| `uAur`, `uAurDark`, `uAurFront`, `uAurCol` | aurora brightness, how black it has gone, where the returning front is, its colour |
| `tNoise`, `tCrack` | the noise texture; the crack state |
| `uShade[4]` | xz, radius and strength of dark shapes under the ice |
| `uGlow[8]` | drowned-lantern glows under the ice |
| `uLights[2]` | the two nearest sea-light lanterns, as position and intensity |
| `uBeam` | the nearest beam's origin, direction and intensity (for the Skotos's skin) |
| `uFreeze[3]`, `uFreezeAll` | xz, radius and time of local freeze waves; the global Freeze (0-1) |
| `uWake` | the Walking Tower's wake |

**The images, one row each:**

| # | image | how it is made | owner | phone cost | quality 0 | risk |
|---|---|---|---|---|---|---|
| 1 | **A night sea that moves.** Swell; fresnel from black-blue to the sky colour; a moon glint; **light paths**, the long broken streaks a lit sea-light lays across the water toward the eye. | Per-cell quads over sea and tidal cells: the `buildAmber` pattern, chunked 32 × 32 so frustum culling works. Vertex: two directional sines in world space (0.06 m near shore, 0.18 m offshore), so quads never crack. Fragment: two scrolling `tNoise` reads give the normal; Schlick fresnel; specular for the moon plus the two `uLights` with a broad lobe stretched toward the camera (the light paths). **Colour by depth** (`uLevel − aBed`), with a clear step at the walk threshold of 0.45 m (one smoothstep): sandy and lighter where the hero can wade, dark blue-black where the cell is closed, and a faint pale edge line along closed cells. Without it a walkable 0.2 m cell and a closed 1.2 m cell look the same (both lifted 0.3 m, both opaque), and the player bumps into invisible walls in the water. Alpha is 1 except a narrow band at the waterline. **Draw order:** the water draws in the transparent pass with `depthWrite: false` at `renderOrder` 1, after the opaque ice and ground. Every ground decal that must read through shallow water draws after it: decals (2), telegraphs (3), light pools, the Cradle ring and blob shadows (moved to 2 in Act V zones). A wading actor's legs are still hidden below the surface, because the water depth-tests against the opaque pass. | sea.js `buildSea` | 2 fetches, about 60 ALU; covers 30-60% of the screen in the Shallows | 1 fetch; no light paths; the depth colour and the edge line kept (gameplay) | Medium (fill rate), so it gets a perf gate |
| 2 | **The aurora in the water and the ice in every frame of play**, and black after the Freeze. | Reflect the view ray off the water or ice normal. Where it points up, intersect a sky sheet 70 m up and read the ridged curtain function from `tNoise` there: the Mere's reflected-crowns trick (build.js:1735-1739). Colour green to violet with height; `uAurDark` turns it toward black-violet and eats it with moving black bands; `uAurFront` restores it along a south-to-north front. | sea.js | 1 fetch | off | Low |
| 3 | **The aurora as a sky** in cinematics. | A dome of r 110 that follows the camera (the `starField` pattern, `fog: false`), a 4-step march through the curtain function at heights 60 to 96 m, the existing star points under it, and `uAurFront` for the return. Seen only when a cine lowers the pitch to 0.25 or less. | sea.js `auroraSky` | only in cines | stars only | Low |
| 4 | **The tide coming in across the flats:** a continuous waterline with a foam line, wet dark sand left behind as it goes out, wrecks rising and dripping. | No geometry moves and no actor leaves y = 0. Every water vertex carries `aBed`, its cell's bed height in metres (dry land is `BED_DRY` = 9.0, never Infinity: Infinity in mediump vertex maths is not guaranteed on mobile GPUs and would risk spikes or holes along the shore). The vertex shader lifts the local surface to `clamp(uLevel − aBed, −0.05, 0.3)` above the flat ground, so a dry vertex sits 0.05 below it. The ground plane cuts the surface into a true, moving shoreline; feet wade; foam sits where the local depth is near 0. `uLevel` leads the walk grid by one step, so "the sand darkens before the water comes". The ground shader reads the same `aBed` with `uWetLevel` (G_WET), so freshly uncovered sand stays dark and glossy for about 20 s. The 'drip' emitter fires on wreck props as the water leaves them. | sea.js + build.js groundMat | 1 attribute, 2 uniforms, 1 smoothstep | wetness off | Low |
| 5 | **Black ice you can see into:** bubbles near the surface, darkness below, the Icemaw's shape gliding under you, the Skotos passing like a ship's shadow, drowned lanterns glowing a few metres down. | An opaque ice mesh over ice cells at y 0.02, drawn first (`renderOrder` −1) so the ground under it fails the early depth test. Albedo and normal from the `ice` layer. Two `tNoise` reads offset by `V.xz / V.y × depth` (0.3 m bubbles, 1.6 m dark mottling) give real parallax as the camera moves. The `uShade` ellipses and `uGlow` points are drawn at depth with the same offset. Thick ice is whiter and dusted with snow. **The ground under thin ice stays at L.hgt −2** so a broken cell shows water, and **`groundY` returns the ice surface (0.02) on every `L.ice`, `L.thick` and `L.window` cell**, so `drape()` lays light pools, the Cradle ring and drapable cones on the ice, not 2 m under it (light.js:91, :201, :215). | sea.js `buildIce`; gen4/genlib `groundY` | 4 fetches plus the crack fetch | 2 fetches; no glows or parallax; shades kept, because the Icemaw tell is gameplay | Medium (fill rate in farlight) |
| 6 | **Cracks that spread, then a hole that opens with floes in it.** | An R8 DataTexture of w × h (24 KB), one byte per cell for the crack stage, nearest filtering. Crack lines are drawn procedurally from Voronoi edges hashed per cell: one line at stage 1, three at 2, a white-powdered web at 3. Stage 4 discards the fragment and shows the water mesh at −0.08 beneath. The texture is re-uploaded at most every 0.1 s and only when dirty. 2-3 floe chunks per break come from a pool of 32 instanced shards in the ice material, bobbing on the swell function. | ice.js + sea.js | 1 fetch | same | Low |
| 7 | **The Freeze:** waves stop mid-crest and turn to ice while three beams sweep over them; later, local freeze waves as each Breathing-hole is sealed. | `uFreezeAll` (0 → 1 over 4 s in the cine) holds the swell at its current phase, whitens the water and grows the ice mesh in from every shore. `uFreeze[i]` grows to a lead's extent over 3 s, showing fresh white rime in a frost-crystal pattern from `tNoise` while ice.js resets those cells to thick. Crystal particles ride the front. | sea.js + fx.js | negligible | same | Low |
| 8 | **Sea-light beams:** a soft cone sweeping out over the sea and the snow, with snow glittering inside it. | An additive open cone (24 segments, 26 m long, r 0.3 to 5) from the lantern, `depthWrite: false`. Its alpha falls off with `(1 − abs(N·V))^1.5` and with length, with manual exp² fog. Motes spawn along the cone's axis (20 a second, life 1.2 s), so they glitter only inside it. Nothing is drawn on the ground (touch rule 2): the beam moves one light pool with no decal (gameplay: `lightAt`) and one pooled PointLight riding the near end, so the ground is lit by real light, never marked like a telegraph. Only beams within 45 m draw their cone. | sea.js `beamMesh` + light.js `addBeam` | additive fill, 1-3 visible cones | no cone; the moving PointLight only | Low |
| 9 | **Snow that glitters** as the camera moves. | G_GLINT in groundMat: a hash on a 4 cm world grid picks a few texels per cell; each sparkles where a hashed micro-normal reflects the moon or the hero's light toward the eye. | build.js groundMat | about 10 ALU, no fetch | off | None |
| 10 | **Aurora light on the snow.** | G_AUR: a slow ribbon of green light from the curtain function over the ground at 6% (one fetch), with `R.hemi`'s colour drifting between green and white through the atmosphere tick. Town gets G_AUR too, at 0 until `seaLit`. | groundMat, world.js | 1 fetch | hemi only | Low |
| 11 | **Sea smoke, spindrift, diamond dust, blizzard.** | New fx.js ambients and emitters inside the existing pools (1,200/2,400/3,500 additive and 500/1,000/1,600 alpha): 'seasmoke' samples open-water cells near the camera; 'coast', 'farlight' and 'blizzard' are ambients. | fx.js | in budget | pool sizes already scale | None |
| 12 | **Breath and footprints.** | A puff of breath from the head bone every 2.5 s for the hero and nearby people outdoors in Act V, denser when Chilled. Footprints: 48 instanced decal quads with a canvas-drawn print, laid every 0.7 m on snow cells, fading over 12 s. | fx.js | trivial | footprints off | None |
| 13 | **Ice that looks like ice:** bergs, ridges, icicles, the frozen fall, floes. | Geometry-only scans (the shipped env rocks; the Icicle 01 scan; code ribbons for the fall) with one shared world-projected ice material: the `ice` layer triplanar, a fresnel rim, a blue-green tint deepening in concave areas from baked vertex AO, and the aurora reflection. No new textures. | build5.js `act5Prop` / Instancer 'icy:' | 2-3 fetches | Lambert with the layer only | Low |
| 14 | **Frost creeping in from the screen's edges** as the Cold rises. | A DOM overlay: a canvas-drawn frost texture (a data URL, which the CSP allows) under a CSS radial mask whose size follows Cold. | hud.js | 0 GPU | same | None |
| 15 | **The Skotos darkening the world,** and its skin. | `uAurDark` up; the fog eased toward black (`mixAtmos`); a global light gain in gfx.js `updateLights`; the under-ice shade growing; one master low-pass in audio.js ("the silence it brings"). **Its skin:** `scene.environment` is a static RoomEnvironment PMREM at 0.35 (gfx.js:49-51) and creatures.js `prepare()` forces `envMapIntensity` 0.4 and raises roughness to 0.6 (creatures.js:66-67), so a glossy material alone would mirror nothing. The Skotos and its Hands get an `onBeforeCompile` patch instead: a fresnel term coloured from `uAurCol` × (1 − `uAurDark`), plus a hot streak where `uBeam` faces the surface, plus slow pale flecks inside (forgotten shapes passing). The GLB carries `extras.keepMat: true`, which `prepare()` honours by skipping its overrides. | gfx.js, audio.js, creatures.js | 1 fetch on the boss only | fresnel only | Low |
| 16 | **A horizon of sea** in every cinematic. | `seaBeyond`: four big quads past the map's north and east edges in the water material with `aBed` −4 (always deep), the `townBeyond` pattern (build.js:2732). | sea.js | mostly fogged; 1 fetch | same | None |
| 17 | **The title card.** | A DOM overlay (ui/overlay.js): the screen fades to black and ΣΚΟΤΟΣ appears in white in the title font for 3 s. | ui/overlay.js | 0 | same | None |

**What this deliberately does not do:** real reflections or refractions; volumetric fog (banks are particles plus the global fog); height for actors (every walkable cell is drawn at y = 0); floes that carry actors; an under-ice zone ("under the ice" is parallax inside the ice shader); a sky in play (the aurora is seen under your feet); unloading other acts (held back as a contingency).

**The perf gate.** `perf5` measures frame time **at quality 1 under mobile emulation**, the phones' default (boot.js:47: pixel ratio 1.5, MSAA on; gfx.js:29, :90), with adaptive resolution pinned at 1.0 for the measurement and the adaptive scale it would have chosen reported beside it. It measures the two worst spots, the Shallows at high water and the middle of the Ice Road, and the Field of Ash measured the same way; it passes when both spots are within the Field's frame time + 15%. Quality 0 is measured too, as a floor check. A gate at quality 0 alone (pixel ratio 1.0, no MSAA) would test 1/2.25 of the phone default's pixels and say nothing about fill rate, the act's main risk. It runs **before either boss is built.**

**Phone texture budget** (itemised under Assets): creatures 23.5 MB, the frost people set about 22-29 MB (gated at 25 measured textures), props 30.1 MB, layers 16.8 MB, code textures 0.4 MB: **about 93-100 MB against the 110 MB budget,** re-itemised from the measured files once the frost set and the rime pack are built. A full run of Acts I-V stays near 660 MB on a phone, against the ~1 GB tab ceiling.

## Enemies
**The Sunken.** Act V's humanoid family name is «Θαλασσόπνικτος» / "Sunken", after the Ashbound, the Rootsworn and the Ash-Fallen. They are the dead the sea took over a thousand years, sailors, Saltborn and raiders alike, raised by the Skotos. The English avoids "Drowned", which a famous block game uses for a trident-throwing water zombie.

**Two traits run through the roster:**
- `unlit`: a creature of the Skotos. A sea-light beam crossing it dazzles it (daze 1.5 s, once per sweep) and leaves it Revealed for 3 s (×1.25 damage taken, see the vulnerability rule). Inside lamp light (`lampLightAt`, which leaves out the Breathing-holes' rim lamps) it cannot wake, emerge or rise.
- `lightShy`: never steps into a lit pool or a beam (`lightAt(x, z, { ring: false })`: lamps, pools, beams and fire areas without the hero's own ring, which plain `lightAt` counts, light.js); a beam crossing it makes it flee for 3 s.

**Every enemy owns one verb that touches a system:** the Sunken's hook and the Harpooner's reel pull the hero toward water; the Ice Singer floods or cracks her footing; the Hull-louse curls and becomes a weapon; the Icemaw makes holes; the Reefback and the Rime Bear can be baited through the ice; the Skuas punish standing in the dark.

**No name begins with "Frozen",** because «Παγωμένος» / "Frozen" is an elite affix that prefixes names.

**Every `radius` in this design is a pre-scale value,** as in every shipped def: spawnMonster sets `radius: def.radius * scale` with scale = `def.look.scale` (actors.js:146, :163; Karthax is 1.3 × 1.5, Amaranthe 0.9 × 1.45). player.js pushes the hero out to 0.45 + 0.85 · radius from a big body (player.js:95), and the largest radius in a zone widens every `near()` query (actors.js:443-448), so a post-scale number written as a def.radius would make a boss unreachable.

**Packs** (data.js PACKS, PACK_LEAD, PACK_DORMANT):

| tag | where | kinds (weights) | lead | notes |
|---|---|---|---|---|
| sunkenCrew | coast wrack lines | sunken 4, harpooner 2 | sunken | dormant `tideWake`; 4-6 |
| tideChoir | coast flats | sunken 3, harpooner 1 | iceSinger | 4-5; she floods the footing, the harpooner reels into it |
| floodWave | coast, h ≥ 0.75 m | sunken 3 | | 3-4 walk in from deep cells within 25 m of the hero; one wave per 25 s, at most 2 alive |
| hullSwarm | wreck holds, cracked patches | hullLouse | | 5-7; released at flood start, once per tide cycle |
| reefRocks | coast bars | reefback 1, hullLouse 2 | reefback | dormant 'rock' |
| strandBear | the Strand den, farlight bergs | hullLouse 2 | rimeBear | the bait lesson |
| fallHunters | the Fall shelf, farlight fields | hullLouse 2 | icemaw | the lice run where the hero cannot stand |
| skuaFlock | the Strand, the Graveyard, the Ice Road | skua 6-8 | | roosts on bones and masts |
| frozenCrew | the Icebound Ship | sunken 3, harpooner 2, iceSinger 0.6 | | ice statues; crack-wake |
| iceMixed | farlight | sunken 2, hullLouse 2, harpooner 1, icemaw 0.6, iceSinger 0.6 | | |
| holeRise | the Breathing-holes | sunken | | 2 every 6 s, at most 5 alive |

- `PACK_DORMANT`: sunkenCrew, tideChoir, reefRocks, frozenCrew.
- The champion stand-in for big kinds in coast and farlight (world.js:286) is `sunken`.
- After `frozen` the coast's packs are unchanged: the flats keep their tide. (In the stretch full frozen reading, sunkenCrew and tideChoir spots become frozenCrew, hullSwarm moves under cracks, reefRocks freeze into boulders and floodWave stops; in the stretch spring reading, tide-wake packs run at half count and floodWave every 35 s.)

### sunken Θαλασσόπνικτος (και Θαλασσόπνικτος Καμακάς) / Sunken (and Sunken Harpooner) (new=True)
ROLE: The rank and file of the Skotos. They lie dormant under kelp heaps on the flats at low water, walk out of the sea with the flood, stand frozen at the rails after the Freeze, and climb out of the Breathing-holes during the seals. The Harpooner stands on bars, wreck rails and lead edges and drags the hero toward water and thin ice. Coast and Farthest Light.
BEHAVIOUR: **The Sunken:** the existing 'melee' AI with the dormant wake and four traits.

**`tideWake` (dormant).**
- Packs lie under kelp-heap mounds (pose 'kelpPile', a new mound mesh beside `ashMoundParts`) in KK_Skeletons_Inactive_Floor_Pose.
- They rise with KK_Skeletons_Awaken_Floor (t 2.0), shedding water, when the flood turns their cell shallow, when the hero comes within 5 m, on a hit, or when a pack-mate wakes.
- At the ebb, unaggroed ones walk back to the nearest cell with bed ≤ 0.3 m and lie down again at full life.
- Inside lamp light they never wake from the tide; only the hero's approach wakes them.
- **Frozen crews** (at the Icebound Ship): the same trait wakes them from an ice statue (`a.statue`, ai.js:108-112) when a cell under or beside them reaches crack stage 1, or the hero comes within 4 m. A Warden's Leap near a frozen crew wakes the whole rail.

**`tideborne`.** In a shallow cell: speed ×1.3 and 2% of its life back per second. On a cell the tide has left: speed ×0.85. Its hits from the water add Cold +4.

**`swim`.** It may spawn in, and walk through, deep cells, with straight steering that ignores collision on water cells (a new `swimTo`, the bat's `blocks()` pattern, ai.js:99). On ice, if it falls through, it does not drown: it sinks and climbs out of another hole within 10 m 3 s later, at half life, as an ambush.

**`unlit`.**

**Combat.** A two-handed boat-hook chop (KK_2H_Melee_Attack_Chop, reach 1.9, atkTime 1.3). Every third blow is a hook pull: a sea-green teleCone 2.4 m, 0.6 s, pulling the hero 1.5 m toward it (stops at the first deep cell or wall, `map.castT`).

**Data:** hp 1.4, dmg 1.2, speed 3.4, radius 0.5, reach 1.9, atk 'chop', atkTime 1.3, flesh 'drowned' (new: a wet hit sound, water and kelp on death), xp 2, weapon 'boathook' (code: an ash pole with a forged hook), style 'heavy', wake { d: 5, clip: 'rise', pose: 'kelpPile', sfx: 'waterRise', t: 2.0 }, tideWake, tideborne, swim, unlit.

**The Harpooner:** the Sunken's own scene with a sealskin hood, the harpoon and a rope coil in code, at runtime scale ×1.06; the existing 'ranged' AI (keeps 7-10 m, backs off under 4.5 m) with a new trait `harpoonEvery: 3`.
- **Normal throws:** proj 'harpoon' without the rope, 1.0×, reach 11, atkTime 1.8 (OverhandThrow / KK_Throw). Walls stop it (`blocks()`).
- **Every third throw is the reel.** Tell 0.9 s: a rope coil glints and a pale sea-green teleLine 11 m × 1.0 m runs through the hero, with a rope creak. On a hit: 0.9× and Hooked, pulled 4 m toward the thrower over 0.4 s through the existing `pl.pull` tween (player.js:76-81), stopping at the first deep cell or wall along the path (`castT`). Inside a lamp pool the reel is 2 m. A roll during the tell dodges it.
- **On a miss** the harpoon sticks in the ground or ice for 1 s; on thin ice it adds +1 crack stage in r 1.
- The rope is a thin line mesh from the hand bone to the head, redrawn each frame while the harpoon flies.
- **Placement:** its packs prefer spots within 8 m of water or thin ice, so the reel matters.

**Data:** hp 1.0, dmg 1.1, speed 3.4, radius 0.48, reach 11, atk 'throw', atkTime 1.8, proj 'harpoon', flesh 'drowned', xp 1.8, weapon 'harpoon' (the models.js spear with a barbed iron head and a rope coil), style 'none', tideWake, tideborne, swim, unlit.
ASSET: {"source": "people-reproportion", "title": "Quaternius 'villager0' from people.glb (the Sunken; the Harpooner is the same scene)", "author": "Quaternius", "license": "CC0", "notes": "folk.mjs --set=frost, one recipe 'sunken' with the Act IV GAUNT table (len thigh and calf 1.06, girth 0.82, Head 0.95 under size), **256 px maps** (an enemy seen from the gameplay camera). The Harpooner is not a scene of its own: it is this scene with code parts and a runtime scale ×1.06, so the two cost one scene's textures.\n\n**Grade:** skin to a cold grey-green (ashen() k 0.8, tint [0.55, 0.62, 0.6]), cloth darkened and desaturated; material roughness 0.35 at load for the wet sheen (a people.js material parameter, not a texture).\n\n**Code parts:** kelp strands from veilParts()/veil() (the Mourner's shroud, olive-brown) on the head and shoulders; barnacle clusters (small instanced cones) on the forearms; the boat-hook; for the Harpooner a sealskin hood (veilParts, dark brown) and the harpoon. A 'drip' emitter while in water.\n\n**Read:** wet, green-grey and dripping. It must not read as the Ash-Fallen (ash-grey, embers) or the Hollowed (bark). The Harpooner reads at a glance by its hood, the harpoon held high, the rope coil and the slightly larger frame; it no longer uses 'warden', a player class's body.\n\n**Clips** (all in moves.bin): Zombie_Walk_Fwd_Loop, Zombie_Idle_Loop, KK_Skeletons_Inactive_Floor_Pose, KK_Skeletons_Awaken_Floor, KK_2H_Melee_Attack_Chop, KK_Hit_A, KK_Death_C_Skeletons; Harpooner: Walk_Loop, OverhandThrow, KK_Throw, Pistol_Idle_Loop (aim stance), KK_Hit_B, KK_Death_B.\n\nNo download. The Sketchfab 'Viking - rigged for animation' (79321179bafb4d558f0cd6a4a014ba9a) is **not used**: its face texture credits a stock photo (Photodjo) of unknown licence, which is not clean enough for a Play Store build, and its UE-mannequin rig would need a rename table, not an 'identity' map, because folk.mjs rebind() reads Mixamo names (folk.mjs:163-173).\n\nStand-ins: sunken → 'villager0', harpooner → 'villager0' (people.glb, boot-loaded), both tinted grey-green."}

### iceSinger Ψάλτρια του Πάγου / Ice Singer (new=True)
ROLE: Drowned women who sing under the ice. When they sing, the ice sings with them and opens; on the flats, the sea comes up to their song. The support, and the act's Ashsmith: kill her first. The Fall shelf, the flats, the Graveyard, the Farthest Light's fields and seals.
BEHAVIOUR: A NEW ai 'singer', built from 'tether' (the Mourner's interruptible channel) and 'caster' (keeps 8 to 11 m, backs off under 5 m).

**The Song.**
- **Channel:** 3.0 s, a pale ring round her and a wavering song-line drawn to the hero.
- **Interrupted by** any hit worth 6% of her life, any stun or freeze, or a beam crossing her (`unlit`).
- **If the hero stands on ice:** every thin cell within r 2.5 of the hero gains 2 crack stages (a white teleCircle shows where).
- **If the hero stands on land or flats:** she calls the sea up under the hero. Every cell in r 4 becomes brine for 8 s: walkable shallow water, wading slow ×0.7, Cold +4/s. It is a pool in sap.js's pool system, but `sapAt` returns the pool's kind and only 'amber' builds the hero's stick and root (player.js:62-63); brine sets `pl.inWater` instead, with its own wet-water pool look and the Cold meter, never the amber meter. The Sunken inside it get their tideborne regen.
- **Fizzles** inside lamp light. Cooldown 7 s.

**Wail.** When the hero comes into melee range: teleCone 4 m, 0.5 s, 0.6×, slowing 30% for 2 s and adding Cold +10.

**Float:** she hovers low, crosses water, and the ice's weight rule ignores her.

**Data:** hp 0.9, dmg 0.8, speed 3.8, radius 0.45, reach 10, atk 'cast', atkTime 3.0, flesh 'drowned', xp 2.2, float, unlit, look { rim 0x9ad8ff, rimI 0.45 }.
ASSET: {"source": "people-reproportion", "title": "Quaternius 'healer' from people.glb", "author": "Quaternius", "license": "CC0", "notes": "folk.mjs --set=frost, recipe 'icesinger'.\n\n**Body:** the 'healer' source with a CRONE table (len 0.95, girth 0.75, hand len 1.1 and size 1.1, neck_01 len 1.08), with 256 px maps like every enemy recipe in the set.\n\n**Look:** Hair_Long recoloured white-green and wet; a pale blue skin grade (the 'drowned' recipe, colder); a long kelp veil from veil(); a cyan rim; cold eyes like the Lampless's at 0.6.\n\n**Read:** unlike the Act III Mourner (gold-white veil, amber), she is cold, wet and floats low. Unlike Alkyone (same source) she is hunched, veiled, barefoot and hovering, and she never shares a zone area with Alkyone's camps.\n\n**Clips** (all present): Spell_Simple_Idle_Loop (the song), KK_Spellcasting, Walk_Formal_Loop (the glide), KK_Spellcast_Shoot (the wail), KK_Hit_A, KK_Death_B.\n\nNo download. The scout's 'Terrifying Hooded Horror Woman' would be closer, but it is unverified against AI generation, so it is not used.\n\nStand-in: 'healer', tinted pale blue."}

### hullLouse Σκαροψείρα / Hull-louse (new=True)
ROLE: Giant sea-lice, pale and armoured, the size of a dog, that live in wreck hulls and under cracked ice. The swarm, and the hero's weapon: when one curls into a ball, the hero can roll into it and bowl it through the pack. Coast (wrecks) and the Farthest Light (under the ice).
BEHAVIOUR: The existing 'melee' AI with a burst spawn and a new trait `curl`.

**Spawn.**
- **'hull':** the pack waits inside a wreck and boils out of the hull opening when the hero comes within 6 m, or at the start of each flood (once per tide cycle, at most two cycles per visit).
- **'ice':** the pack waits under a visibly cracked patch (stage 1). When it bursts, every cell in the 3 × 3 around goes to stage 2.

**Swarm.** 5-7 per pack. They skitter in and bite (reach 1.0, atkTime 0.8, 0.5×). Weight 0.3 each on ice, so a swarm of six on one patch cracks it: a hazard to itself and to the hero.

**Curl.** At 50% life, or on any area hit, a louse curls into a ball for 3 s: immobile, armoured (it takes 25%).

**Bowl.** A curled louse that a hero's dodge-roll passes through, or that is struck with knock ≥ 6, is launched:
- it travels at 9 m/s for up to 7 m along the roll or the knock (a `startDash` with the louse as the moving body);
- it hits every foe in its path (r 0.8) for `heroHit(1.0)` and knock 4;
- it cracks thin ice +1 stage per cell it crosses, and drowns if it rolls into deep water;
- it bursts on a wall or a large foe: it dies, with 0.5× to foes in r 1.5.
- One-time hint on the first curl: «Κύλησε πάνω τους όταν κουλουριαστούν» / "Roll into them when they curl up".
- It uses the existing dodge. No new button.

**Death.** It curls into a ball and rolls 1 m, as real isopods do.

**Data:** hp 0.32, dmg 0.5, speed 6.0, radius 0.38, reach 1.0, atk 'bite', atkTime 0.8, flesh 'chitin', xp 0.6, burst, curl, swim, unlit, look { scale 1.0 (≈ 0.7 m long), rim 0xc0d0ff, rimI 0.2 }.
ASSET: {"source": "sketchfab", "uid": "3979c291d1f9454c90851efe291eab60", "url": "https://sketchfab.com/3d-models/cc0-giant-isopod-b-doederleinii-3979c291d1f9454c90851efe291eab60", "title": "CC0 オオグソクムシ Giant Isopod, B. doederleinii", "author": "ffish.asia / floraZia.com (ffishAsia-and-floraZia)", "license": "CC0 1.0", "faces": 582561, "animations": 0, "notes": "A photoreal museum-style scan of a real specimen from a CC0 natural-history project. Clean provenance; credited anyway.\n\n**Build** (tools/creatures/act5/louse.mjs):\n- Decimate in stages with UV-seam-preserving meshopt simplify (583k → 60k → 2.5k), checking in the creature viewer that the legs survive; if they do not, keep 4k.\n- A code rig like the deepworm: a body chain of 7 plates weighted by position along the long axis, plus two leg groups weighted by side and segment.\n- lib.mjs clips: idle, walk (a leg wave), run, attack (rear and bite), spawn (unroll), curl (plates roll together, a held pose), uncurl, hit, die (curl and roll).\n- Texture regraded from orange-pink to pale grey-violet; 512 base, 256 normal.\n\n**Fallback:** the .hapto 'Woodlouse' (fae04aa296f844c18675f6ae50aefe77, CC-BY 4.0, rigged, a walk clip), regraded pale. **Last resort (no download):** the spiderling (boot-loaded), STAND_IN hullLouse → 'spiderling'."}

### icemaw Παγολόχος / Icemaw (new=True)
ROLE: A huge leopard seal, about 5 m long, that hunts from under the ice and lunges out of holes. You see it coming as a shape under the ice: the act's most memorable image for its cost. The Fall fjord, Skerry Bay, every thin field and lead on the Farthest Light, and the Skotos's phase 2.
BEHAVIOUR: A NEW ai 'lurker', built on 'burrow' (ai.js:410).

**Under.**
- Hidden and untargetable (`a.under`), moving at 7 m/s between "holes": open-water cells, broken ice or lead edges within 14 m of its home, with its own step check over water and thin cells (the bat's `blocks()` pattern).
- Under ice its shape is drawn in the ice shader as a `uShade` slot: a dark 4 × 1.5 m ellipse gliding beneath the hero. Under open water it shows as a dark shape with a trail of bubbles.

**Surface.** When the hero is within 6 m of a hole:
- **Tell:** 0.6 s of bubbles and a water bulge, with a seal bark.
- **Lunge:** a red teleLine 7 × 1.6 m, 0.7 s, with a sea-green arrow back toward the hole. On a hit: 1.4× and Dragged, pulled 2.5 m toward the hole (`pl.pull`, stopping at the first deep cell or wall). The drag never puts her in the water: every pull stops short of a deep cell.
- It stays out for 3 s, Exposed (×1.25), biting anything within 2.2 m (teleCone 0.5 s, 1.1×), then slides back in.

**Breach.** If no hole is within reach of the hero but a thin cell at stage 2 or more is within 4 m, it bursts up through it (+2 stages in r 1.5): that cell becomes a new hole.

**Denied:** it cannot surface through thick ice, through land, or inside lamp light.

**Stranded.** If its hole refreezes while it is up (a beam crossing it, lamp light, or the Mage's Frost Nova), it is Stranded: dazed 4 s, ×1.5, wriggling toward the nearest hole at 1.2 m/s. A Frost Nova over the hole while it is under traps it below for 6 s.

**On the coast before the Freeze** it also hunts the waterline at high water, from deep cells, with the same rules on water.

**Not unlit:** it is a natural beast. Its weight on ice is 2.0 while it is up.

**Data:** hp 2.2, dmg 1.5, speed 7.0 (under) / 2.0 (on ice), radius 0.6 (pre-scale: ×1.6 makes 0.96 m), reach 2.2, atk 'bite', atkTime 1.1, flesh 'flesh', xp 3, swim, look { scale 1.6 }.
ASSET: {"source": "sketchfab", "uid": "3f4a2090598b4741ac38e0d255ece191", "url": "https://sketchfab.com/3d-models/leopard-seal-3f4a2090598b4741ac38e0d255ece191", "title": "Leopard Seal", "author": "Grace Belt (neatGrace)", "license": "CC Attribution 4.0", "faces": 179928, "animations": 0, "notes": "A realistic sculpt of the predator seal (the scout checked the thumbnail; no duplicate upload found).\n\n**Build** (tools/creatures/act5/icemaw.mjs):\n- Decimate to about 6k.\n- A code rig: a spine chain of 7 bones weighted by position along the body, a jaw bone (lower-head vertices below the mouth line; if the mesh does not separate it, a head tilt stands in), and two fore-flipper bones weighted by region.\n- lib.mjs clips: idle (breathing at the surface), wriggle (walk and run on ice), lunge, bite, slide (back into the water), stranded (wriggling), hit, die (a sinking roll).\n- Texture regraded to grey with a spotted throat and frost dusted along the back; 1024 base, 512 normal.\n\n**Fallback:** 'Seal/Baikal/Непра' by fedalina (fb79ae1e6021481f819f34ebc2dcaecd, CC-BY 4.0, rigged, 1 clip) at ×1.6. **Stand-in:** the warg (boot-loaded) at STAND_SCALE 1.2, grey tint; its lunge reads the same."}

### reefback Ξερόραχος / Reefback (new=True)
ROLE: Crabs that carry stones on their backs and lie still as rocks while the tide is out. When the tide comes in, the rocks get up. The Walking Tower's own kind, and the lesson its fight is built on. The coast's bars and the Shallows; boulders in the ice after the Freeze.
BEHAVIOUR: The existing 'brute' AI (wind-up, telegraphed cone, every third blow a slam) with the `guard` trait and a tide-dormant wake.

**Asleep at low water.** While its cell is dry it lies dormant in pose 'rock' (legs folded under, a barnacled boulder; the scout's own reason for picking this model). It wakes when the flood turns its cell shallow, when hit, or when the hero comes within 3 m. In water it moves ×1.3, a sea creature. (In the stretch full frozen reading it is a boulder in the ice and wakes when its cell cracks.)

**Guard.** Front arc 1.2 rad, k 0.2 (the Ash-Fallen's guard): hits from the front deal 20%, area hits ignore the guard, and its back takes full damage. Turning is capped at 1.8 rad/s, so rolling past it puts the hero behind its shell.

**Claw:** teleCone 3.2 m, 0.8 s, 1.1×. **Slam** (every third): teleCircle 2.4 m, 1.0 s, 1.3×, and +2 crack stages in r 2.4.

**Through the ice.** Weight 2.5. A Reefback that stands 2 s on a thin cell, or slams on cracked ice, goes through: Floundering for 3 s (no actions, ×2.0), then it hauls out onto the nearest solid cell, breaking two edge cells. If 3 or more open cells lie within r 1.5 of it, it drowns (killed, full xp, loot at the edge). Lure it onto thin ice and let it slam.

**Not unlit.**

**Data:** hp 4.8, dmg 1.9, speed 3.4 (×1.3 in water), radius 0.6 (pre-scale: ×1.5 makes 0.9 m for a crab 1.7 m across), reach 2.6, atk 'claw', atkTime 1.6, big, guard { arc 1.2, k 0.2 }, flesh 'chitin', xp 6, swim, wake { pose: 'rock', tide: true, d: 3 }, look { scale 1.5 }.
ASSET: {"source": "sketchfab", "uid": "ac8fa79586f84c84a8a55dd86b7a2e2f", "url": "https://sketchfab.com/3d-models/crab-mountain-ac8fa79586f84c84a8a55dd86b7a2e2f", "title": "Crab mountain (the Walking Tower's own file)", "author": "pro100voron (pro100voron)", "license": "CC Attribution 4.0", "faces": 41993, "animations": 1, "notes": "The same crab.glb as the Walking Tower, at ×1.5 instead of ×4 (about 1.7 m across, the rock spire about 1.2 m tall). It costs no extra download, texture or clip: CAST reefback → ['crab', 1]. The Tower adds its ruin, fire-cage and bell in code at spawn; the Reefback wears none of them. It uses the crab clips idle, walk, run, attack (claw), attack2 (slam), dormant pose 'rock', hit and die, and a darker regrade by runtime tint (tint 0x6a7080, amount 0.6), so the boss stays the one with weed and rime.\n\nThe provenance gate on Crab mountain covers it (see the Walking Tower). Fallbacks follow the Tower's: Mohamed's 'Giant Crab' with a code spire, then the spider (boot-loaded) at ×1.2 with a boulder on its back; STAND_IN reefback → ['spider']."}

### rimeBear Πάγαρκτος / Rime Bear (new=False)
ROLE: The coast's great beast, in the Amberback's and the Ashwing's slot: a yellow-white bear that hunts the Whalebone Strand and the bergs' lee, and the act's best ice tactic. Coast (the den, the strand) and the Farthest Light (bergs).
BEHAVIOUR: The existing 'charger' AI (rear, charge, dazed against a wall or in sap; ai.js:526) coupled to the ice.

**Its charge on thin ice.** Every thin cell it enters during a charge gains +1 stage. A cell already at stage 2 or more breaks at once under it: the bear is Floundering for 3 s (no actions, ×2.0), then hauls out onto the nearest solid cell, breaking two more edge cells. If 3 or more open cells lie within r 1.5 of it, it drowns (killed, full xp). So the counterplay is to stand on thick ice behind a cracked patch and let it come. A bear is never drowned by a single hole, which would make the beast a free kill.

**Slush** stops a charge as amber does: the charger's `sapDaze` accepts `sapAt`'s kinds 'amber' and 'slush', and a charge into slush leaves it dazed for 2 s.

**Frost Roar** (the rear clip): a 5 m cone, 0.8 s tell, Cold +15 and a 20% slow for 2 s; it cracks every thin cell within r 4 by one stage, and frost-breath vapour streams from its mouth. The roar is what sets it apart from the Amberback, along with its colour and size.

**Not unlit.**

**Data:** hp 3.6, dmg 1.9, speed 5.6, radius 1.1, reach 2.3, atk 'smash', atkTime 1.6, flesh 'flesh', xp 5.5, sfx 'bear', big, look { scale 1.3, tint 0xf4f2ec, tintAmt 2.15, rim 0xd8f0ff, rimI 0.3 }.
ASSET: {"source": "existing-model-retint", "uid": "bffc3c87d2d148ff8533e1cc8a11c9f1", "url": "https://sketchfab.com/3d-models/realistic-animated-bear-3d-model-bffc3c87d2d148ff8533e1cc8a11c9f1", "title": "Realistic Animated Bear 3D Model (already shipped as src/assets/creatures/bear.glb)", "author": "WildMesh 3D", "license": "CC Attribution 4.0", "faces": 7508, "animations": 11, "notes": "No download and no new texture. The shipped bear (7.5k faces; 11 clips: idle, walk, run, charge, attack, attack2, rear, howl, hit, daze, die; 81 is the Sketchfab source's count) wears a runtime tint above 2: people.js's tint path drains the colour to a 0.3-0.9 luminance ramp first (people.js:89-91), then multiplies by the tint, so a brown bear becomes a yellowed white one and keeps its fur detail.\n\n**Loading:** only Act III's group loads bear.glb (ACT_FILES.act4 has no bear), so ACT_FILES.act5 lists 'bear'. loadFile's cache keeps one copy if Act III was visited this session; on a cold start into Act V it costs 9.1 MB of phone GPU, which the budget counts.\n\n**Distinct read, confirmed before commit:** put it side by side with the Amberback in the creature viewer (`?cview&only=rimeBear,amberBear`). White against amber, scale 1.3 against 1.12, the white rim, frost-breath on the roar and the ice cracking under the roar must tell them apart.\n\n**If the drained ramp reads grey rather than white,** the fallback is tools/creatures/act5/polarbear.mjs: the same mesh and clips with the base colour regraded in sharp to yellowed white (+0.47 MB raw), and Act V then loads polarbear.glb instead of bear.glb (the same 9.1 MB).\n\nStand-in: ['amberBear', 'troll'] (the list ends in the boot-loaded troll)."}

### skua Ληστόγλαρος / Skua (new=True)
ROLE: The great skua, the robber gull (its real Greek name), here the carrion birds of the Skotos. They mob anyone caught in the dark and scatter from light, and they give the coast life overhead. The Whalebone Strand, the Ship Graveyard, the Ice Road.
BEHAVIOUR: The existing 'bat' AI (flies, swoops, bites) with `lightShy`.

**Flocks** of 6 to 8 circle at 6 to 8 m.
- They dive only at a hero standing outside light: beyond every lit pool and beam (`lightAt(x, z, { ring: false })`). The Cradle's own ring does not count, so a hero who lingers in the dark is mobbed.
- A beam crossing the flock, or a burning whale-oil cask within 6 m, scatters it for 3 s.
- **Bites** add Cold +3 instead of biteSlow.
- **Roosts:** at rest the flock perches on the whale skeleton and the wreck masts, and takes off when the hero comes within 10 m.

**Data:** hp 0.3, dmg 0.45, speed 7.5, radius 0.4, reach 1.0, atk 'bite', atkTime 0.8, flesh 'flesh' (a feather-puff death through deathDust), xp 0.5, float, lightShy.
ASSET: {"source": "sketchfab", "uid": "dc42ffc81c86480e9e7f7752fa134174", "url": "https://sketchfab.com/3d-models/seagull-dc42ffc81c86480e9e7f7752fa134174", "title": "Seagull", "author": "Dayvable (Dayvable)", "license": "CC Attribution 4.0", "faces": 4352, "animations": 1, "notes": "A realistic gull with a bones-only rig and a flap clip, made for a flock simulation (tagged noai).\n\n**Build** (tools/creatures/act5/skua.mjs): decimate to about 2.5k; keep the flap clip as walk and run in flight; lib.mjs adds glide, dive, bite, perch, takeoff, hit and die; regrade the white gull to a dark brown great skua, keeping the white wing-flash (a luminance-masked grade); 512 base.\n\nStand-in: ['caveBat', 'spiderling'] (the list ends in a boot-loaded model)."}

**Out of the base scope:** the Rime Troll (SJunior3d's Troll, bceb1cb47186457c8571a23e6aff1b8e) and ambient orcas. Both are listed under Risks as stretch items only.

## Bosses
Both fights keep the act's phone rules:
- **At most two big telegraphs are ever up at once,** and the environment's own warning (the tide bell, a flood, the Deep Cold) always counts as one of them.
- **Telegraph durations never change with difficulty.** Difficulty scales damage, cooldowns and adds (see Difficulty).
- **Every phase has one thing to *do* besides hitting,** and Alkyone says it once.
- **Exactly one boss actor per fight,** so `G.bossActor` and the single boss bar work as they are. The Hands and the Coil are 'node' actors (the keeper statues' precedent) and the keepers are NPCs.
- **One vulnerability at a time** (see Mechanics: the vulnerability rule). The bosses' damage-taken windows never multiply together; a boss caps at ×1.6 outside its one scripted window per phase.
- **Time-to-kill targets,** asserted by the `tower` and `skotos` scenarios with their reference build at the zone's level on Warden: the Walking Tower 3:30-5:00 (fail under 3:00 or over 6:00); the Skotos 5:30-7:30 (fail under 4:30 or over 8:30). On Wanderer neither may fall under 60% of its Warden time.

### tower Σκόπελος, ο Πύργος που Περπατά / Skerry, the Walking Tower
CONCEPT: **An island that stands up.** A crab the size of a hill, with a rock spire for a shell and a ruined sea-light on top of the spire.

**Its story.** For a thousand years it slept in Skerry Bay as a rock skerry. The Saltborn built the Skerry Light on its back without ever knowing, and kept it forty winters at a time (Thaleia's Name-stone: "she used to say her rock breathed"). When the Skotos woke, the island woke with it and walked, the dead light still on its back. It is not evil: it is a sleeper woken by the dark. It dies as an island again, with its light relit.

**Lines.** It has none: it is a creature. Its voice is a cracked bell and the surf.
- Title, mon.tower.t: «Χίλια χρόνια ήταν νησί» / "For a thousand years it was an island".
- Alkyone calls the fight from the bay's shore rock, one line per phase (d.alk.g0, g0b, g1; see beats).

**What it teaches.** The act's three rules, one per phase: the tide (phase 1), the ice (phase 2), the light (phase 3).

**Data:** hp 68, dmg 2.4, speed 2.4 (sand) / 6.5 (as a wake in water), radius 0.7 (pre-scale: ×4 makes 2.8 m, so the hero is pushed out to about 2.8 m from its centre and its reach of 5.5 lands), reach 5.5, atk 'smash', atkTime 1.6, flesh 'chitin', xp 150, boss, big, swim, S.phases [0.65, 0.3], hpFloor 0.649 (no single burst skips phase 2), wake on the `towerWake` cine (holdWake until it ends), dieClip 'settle', look scale 4.0 (about 4.4 m across the shell, the tower's top at about 11 m), rim 0x9ad8ff. Level: max(zone 28 + 2, hero + 1), the first boss of the act (the world.js:257 list).

**Arena:** Skerry Bay, r 18.
- The south half is a sand bowl (bed 0.2-0.6 m) with three dry islets (r 3.5, a boulder on each) at r 9 and the ribs of a wrecked hull along one flank as solid cover.
- The north half is thin ice with a thick rim 2 cells wide and a thick spine west to east.
- **The arena's water is the boss's.** While it is awake, `TIDE.force` replaces the zone clock (the bay is behind its sand bar). On a reset (the hero dies or leaves), the arena returns to low water.
PHASES: **Phase 1, «Η Παλίρροια» / "The Tide" (100-65%).** The thing to do: **stand on dry rock when the water comes, and let it come ashore.**
- At low water on the sand: Claw Sweep, Sidelong Rush, Hammer Claw, Brine Spit and Brood. A Sidelong Rush that ends against an islet's boulder or the wreck ribs leaves it dazed for 3 s (×1.5): the Silverhorn-and-standing-stone rule.
- **Every 40 s, The Tide Comes** (the environment's big telegraph). The arena floods to 0.9 m and it hunts from the water as a wake: Breach after Breach through the hero. **A Breach that ends on dry ground (an islet, the ribs, the thick rim) Beaches it:** dazed 3.5 s, ×1.5. A Breach that ends in water just submerges again. After 16 s of high water the bay drains over 6 s; if it is still in the water when the sand comes up, it is Stranded for 3 s (×1.5).
- Call the Drowned during high water.
- Alkyone: d.alk.g0 «Μείνε στο ξερό όταν φουσκώνει! Άσ' τον να βγει στη στεριά!» / "Stay on dry ground when the tide's up! Let it come ashore!"

**The turn (at 65%).** It rears, holds the 65% floor for 3 s (immune; the boss bar shimmers), and drags itself north onto the bay's ice. The arena water is forced to low for the rest of the fight.

**Phase 2, «Ο Πάγος» / "Onto the Ice" (65-30%).** The thing to do: **crack the ice between you, and stand behind it.**
- It walks only on the thick rim and spine. This is scripted, not a weight rule (bosses weigh 0 on the ice): its `stepToward` window takes a cell mask (`L.thick`) in phase 2, so thin cells are walls to its pathing. Only the Shell Rush, a dash, crosses thin ice. Moves: Claw Sweep, Hammer Claw (+2 crack stages in r 3), Tower Bell, and Shell Rush.
- **The bait** (the Hermit's rule from the story design, on the crack texture): **a Shell Rush that crosses thin ice at crack stage 2 or more breaks through.** It plunges and is Overturned for 5 s: on its back, its underside glowing, ×2.0 (its one scripted window). The hero cracks the ice by standing on it (1.2 s a stage), with heavy skills, or by baiting its own Hammer Claw and Bell, then stands beyond the cracked patch so the Rush must cross it. Broken cells refreeze to stage 2 after 25 s, so the bait can be set again.
- **Fail-safe:** after three Rushes without an Overturn, Alkyone calls the rule and its next Hammer Claw cracks +3 stages.
- Alkyone: d.alk.g0b «Ράγισε τον πάγο ανάμεσά σας και στάσου από πίσω! Θα βουλιάξει!» / "Crack the ice between you and stand behind it! It'll go through!"

**Phase 3, «Ο Νεκρός Φάρος» / "The Dead Light" (30-0%).** The thing to do: **light the light on its back.**
- Hurt, it hauls itself back south onto the sand and alternates two states: Island (8 s, shell up, ×0.3) and, once its light is relit, Blinded (8 s).
- During Island an interact follows it on its flank: «Άναψε τον φάρο του» / "Light its light", a 1.5 s channel from the Cradle that a hit worth 10% of max life interrupts. Lit, the light blazes and its beam spins: it is blinded by its own light.
- Moves: Brine Spit, Shake, Sidelong Rush, Claw Sweep, and Call the Drowned every 15 s.
- **Fail-safe:** if the light has not been lit for 45 s, Alkyone throws a whale-oil flask at its back during the next Island, and the light catches by itself.
- Alkyone: d.alk.g1 «Ο φάρος στην πλάτη του! Άναψέ τον, και θα τυφλωθεί απ' το δικό του φως!» / "The light on its back! Light it, and it'll be blinded by its own light!"

**Death.** It does not settle where it falls: a short scripted crawl (about 3 s, the settle clip at the end) takes it back to its original centre, the sleeping-skerry cells it lay on for a thousand years. The hero is pushed clear of that disc first, and only then are those known cells blocked, so no cell closes under her and nothing teleports her. The light on its back keeps burning and the beam turns slowly; Alkyone says d.alk.g2. Its body stays as a static island prop with a lit tower: the bay's landmark, a warm pool, a checkpoint and the echo spot. Every build places the island at that same spot, whatever the save. After the Freeze it stands rimed, still lit.

**Echo refight.** «Θυμήσου τον Σκόπελο» / "Remember Skerry", at the island, after `seaLit`. The ice remembers it as a pale ice-ghost (frost tint). The bay is as the fight had it: its bowl is sand behind the bar, its north half thin ice in every base reading, and the arena water is forced as in the fight. (In the stretch spring reading the north half is open water kept in `L.ice` at stage 4; the echo resets those cells to stage 0 and map.opens them for the fight.) Alkyone's calls are replaced by the island's own bell; the oil-flask fail-safe is a lit brazier on the shore rock whose flask is thrown automatically after 45 s.
ASSET: {"source": "sketchfab", "uid": "ac8fa79586f84c84a8a55dd86b7a2e2f", "url": "https://sketchfab.com/3d-models/crab-mountain-ac8fa79586f84c84a8a55dd86b7a2e2f", "title": "Crab mountain", "author": "pro100voron (pro100voron)", "license": "CC Attribution 4.0", "faces": 41993, "animations": 1, "notes": "A realistic crab with a rock spire on its back: rigged, one clip, published 2020-04-01. The author says it follows his own concept.\n\n**Provenance gate, before any download.** pro100voron's only downloadable model; the rest of his portfolio is non-downloadable fan art (Fallout 4, Indominus Rex). Run a reverse-image search of the thumbnail and a storefront check (Fab, CGTrader, Unity Asset Store), as was done for Karthax, and save the results beside the source in /tmp/claude-0/sf. If anything matches, take the fallbacks.\n\n**Build** (tools/creatures/act5/crab.mjs, one crab.glb for the Tower and the Reefback):\n- Decimate 42k → 12k, keeping the rock spire (it is the island) and the leg chains whole; check in the creature viewer.\n- lib.mjs clips on its own leg chains: idle, walk (an eight-leg wave gait), side (the sideways scuttle), run, attack (claw sweep), attack2 (hammer claw), rear, dive (sink), rise (burst), settle (island), overturned (a 160° roll with legs flailing), shake, dormant pose 'rock', hit, daze, die.\n- Texture regraded from brown to slate-blue with rime and weed on the spire; 1024 base, 512 normal and ORM.\n\n**The tower is not in the GLB.** At spawn, actors.js `act5Spawn` attaches the rime pack's own `towerC` ruin (attachUpright on the body bone) with a code iron fire-cage and flame, the beam mesh and a code bell. No texture is duplicated.\n\n**Fallback 1:** 'Giant Crab' by Mohamed (6295676291c141728457ef7550b0650a, CC-BY 4.0, 28k, unrigged): decimate to 8k, a code eight-leg rig like the spider's, the same clips, a code spire from a Poly Haven boulder, and the same tower.\n**Fallback 2, no download:** spider.glb (boot-loaded) at STAND_SCALE 3.2, regraded slate, with the tower: STAND_IN tower → ['spider']. The Weaver was the spider at 2.6."}
MOVES:
- Claw Sweep (basic): TELEGRAPH teleCone 7 m, arc 1.4, 1.0 s | EFFECT 1.2× and knockback 10. Thin ice in the cone +1 stage in phase 2.
- Sidelong Rush (phases 1 and 3): TELEGRAPH it turns broadside; a teleLine 14 m × 4 m **perpendicular to its facing**, 1.1 s, with a clatter of legs | EFFECT 1.4× and knockback 14. Ending against an islet boulder or the ribs: dazed 3 s (×1.5). Cooldown 9 s; twice in a row, in opposite directions, in phase 3.
- Hammer Claw: TELEGRAPH teleCircle r 3 at the hero's position, 1.2 s | EFFECT 1.5× and a 0.4 s stun; on ice, +2 crack stages to every thin cell in r 3. Cooldown 10 s.
- Brine Spit (phases 1 and 3): TELEGRAPH three lobbed globs, teleCircles of 2 m landing at 1.0, 1.2 and 1.4 s | EFFECT 0.9× each, leaving slush pools for 6 s (`inWater` ×0.7, Cold +4/s): sap.js's pool system with kind 'slush' and its own look, which never builds the amber stick or root. Cooldown 10 s.
- Brood (phase 1): TELEGRAPH a clatter from its shell, 1.0 s | EFFECT 4 Hull-lice skitter out (at most 6 alive). A curled louse bowled into the Tower deals its hit to the Tower. Cooldown 18 s.
- The Tide Comes (phase 1, every 40 s; the environment's telegraph): TELEGRAPH it rears (the rear clip), the tide bell rings, the water visibly draws back for 1 s, a HUD tide pulse; then the arena floods to 0.9 m in six 0.15 m steps over 6 s | EFFECT it submerges into deep water, untargetable (`a.under`); the water shader's `uWake` draws a foam V over its path at 6.5 m/s. The islets, the ribs and the rim never flood; the tide's safety rules (the 6 s grace and its escape lane) protect the hero.
- Breach (phase 1, at high water): TELEGRAPH the water humps along a teleLine 16 m × 5 m through the hero, 1.2 s | EFFECT a dash out of the water for 1.6× and knock 14. Ending on dry ground: **Beached** 3.5 s (dazed, ×1.5). Ending in water: it submerges again. Every 6 s at high water.
- Call the Drowned (phase 1 at high water, phase 3): TELEGRAPH the bay's water boils at two edge points for 1.0 s | EFFECT two Sunken walk in (at most 4 alive; +1 per call on Nightmare and above). Cooldown 15 s.
- Tower Bell (phase 2): TELEGRAPH the cracked bell on its back tolls; a red teleCircle 9 m with a blue safe circle of r 4.5 at its body, 1.3 s | EFFECT 1.3× to anyone between 4.5 and 9 m; thin ice in the ring +1 stage. Step in close. The safe circle is sized from the real push distance: the hero can stand no nearer than 0.45 + 0.85 × 2.8 ≈ 2.8 m from its centre, and 4.5 m leaves her 1.5 m and more of room. Cooldown 12 s.
- Shell Rush (phase 2): TELEGRAPH as Sidelong Rush, 1.1 s | EFFECT 1.4× and knockback. Crossing thin ice at stage 2 or more: it breaks through and is **Overturned** 5 s (×2.0). Broken cells refreeze to stage 2 after 25 s. Cooldown 9 s.
- Island (phase 3): TELEGRAPH it settles with a long groan; water runs off its back | EFFECT 8 s immobile, shell up, ×0.3. The «Άναψε τον φάρο του» interact follows it on its flank.
- Blinded (phase 3, after a relight): TELEGRAPH the light on its back blazes and its beam spins at a 3 s period | EFFECT for 8 s it takes ×1.6, every attack is aimed 40° wide of the hero, and its own beam dazzles the Sunken around it (`unlit`). Then the spray puts the light out, and it can be relit at the next Island.
- Shake (phase 3): TELEGRAPH teleCircle 5 m round it, 1.0 s | EFFECT 1.0× and knockback; puts its light out if it is lit. Cooldown 9 s.

### skotos Το Σκότος / The Skotos
CONCEPT: **The dark that was there before the first fire, taking a shape at the ice edge:** a faceless figure of black water twelve metres tall **whose robe is its own arms**, standing waist-deep in the open sea beyond the arena's north rim, so the tips of those arms stay under the water and only the hooded crown and the falling folds show. Its skin shows a void with a faint violet fresnel, the aurora's colour where there is aurora, and pale flecks moving inside it like forgotten shapes under ice: hulls, hands, a lantern. More Hands break up through the ice ring. It must never read as a kraken or a squid (the IP table steers away from the Watcher in the Water and from Lovecraft): the look gate under its asset decides that before any build work.

**It never walks onto the ice and is never killed.** Its "death" is a naming: it sinks while the ice closes over it.

**Lines** (pale, lowercase `say` lines, no "I" until the last one):
- Title, mon.skotos.t: «Ήταν εδώ πριν από την πρώτη φωτιά» / "It was here before the first fire".
- Intro d.skotos.b1 (+ .r); phase 2 d.skotos.p2; phase 3 d.skotos.p3; the naming d.skotos.die1 and die2 (see beats and ending).

**What it does.** It fights like the dark: it eats light, spreads cold, makes the world forget, and puts fires out.

**Data:** hp 115, dmg 2.9, speed 0 (anchored) / 4.0 (beneath, phase 2), radius 0.8 (pre-scale: ×3.2 makes 2.56 m), reach 7, atk 'smash', atkTime 1.8, flesh 'skotos' (new: black mist on hits, no blood, no corpse decal, a low chord), xp 260, boss, anchored, float (no collision, through the existing `!a.def.float || !a.boss` path in ai.js), S.phases [0.65, 0.3], hpFloor 0.649 at spawn, then Karthax's pattern (ai.js:2227, :2270, :2273): at the 65% turn `a.hpFloor` = 0.30 · hpMax and `a.lockPhase` = 1; at the third Remember lockPhase is released and `a.hp` = min(hp, 0.299 · hpMax) with `a.hpFloor` = 0.299 · hpMax, so phase 3 begins and it is held through Wrap the Light until the relight succeeds; then `a.hpFloor` = 0. (lockPhase only pins the phase index, ai.js:1424; hp is held only by hpFloor, combat.js:69.) Wake on the intro cine (holdWake), dieClip 'sink', look scale 3.2 (about 12 m tall, body origin at y −3 in the water), rim 0x6a4a9a. Level: max(zone 31 + 3, hero + 1).

**Hands of the Skotos** (Χέρια του Σκότους): skotosHand, model 'tentacle', ai 'node', hp 5, radius 0.8, flesh 'skotos', anchored, big, xp 0. The boss drives their moves. **The Coil** (phase 3): a Hand at the tower's foot, hp 4, always Revealed.

**Arena:** the Light's Skerry, r 16.
- The thick core of r 6.5 with the Farthest Light at its south edge; the door faces north onto the arena.
- The thin ring from 6.5 to 14.5 with a thick cross; Selna's thick pad on the ring's north arm.
- The thick rim; four fire-cairns on the diagonals at r 11, lit at the start (warm pools of r 5 that hold the ice).
- The ice edge on the north rim. The camera zooms out to 1.25 for the fight (atmosphere zoom).
- Alkyone, Tern and Tamarisk wait on the core by the tower's door (NPCs, untouchable).
PHASES: **Phase 1, «Ανεβαίνει» / "It Rises" (100-65%).** The thing to do: **cut the Hands to open the body.**
- **Hands:** up to 3 out at once, rising from the six Hand spots (never inside lamp light). While 2 or more are out, the body is warded (−50%). A cut Hand sinks; another rises at a different spot 12 s later. Hands Sweep and Lash, staggered so no more than two telegraphs are up at once.
- **Body:** Black Wave and Drink the Light.
- Out on the ice, on her pad, Selna kneels, saying names and losing them.

**Phase 2, «Η Νύχτα» / "The Night" (65-30%), d.skotos.p2.** The thing to do: **remember her, three times.**
- **It drinks the sky.** 'farlightNight' eases in over 2 s; `uAur` goes to 0; the hero's light shrinks to 2.5 m (`setHeroLight`); the four cairns go out (relit with a 1 s touch).
- **Beneath** (the mechanics design's phase, kept simple). It sinks. A vast shadow (`uShade`, r 5) circles under the thin ring at 4 m/s with bubbles running 6 m ahead. **Every 9 s it Breaches where the hero chooses:**
  - at an open hole within 7 m of the hero, if there is one;
  - otherwise up under her, if she stands on thin ice (a ram that breaks r 3);
  - otherwise at the thin cell nearest her.
- After a Breach it is Exposed for 4.5 s (×1.25), or **Seared (×1.5) if it came up within 2 m of a lit cairn's pool**. It Lashes once, then sinks. So the player **makes a hole beside a lit fire** (standing still, heavy skills, baiting a Hand's slam, or breaking a whale-oil cask by the cairn, since fire melts what light holds) and it comes up into the light.
- **Selna falters** at 55%, 45% and 35% (the forgotten keeper, kept free of any skill lockout):
  - her lantern dims; a pale ring and the prompt «Θυμήσου τη» / "Remember her" appear on her; a 1.2 s channel within 2 m (the hero must cross the ring's ice to her pad);
  - each success tears the Skotos up wherever its shadow is, dazed 3 s and Exposed, and Selna finds a name: «Η Πρώτη.», «Έιναρ.», «Άρνας.»;
  - ignored for 12 s, her lantern goes out, the Skotos heals 4% (never above 65%) and its next Breach comes 4 s early;
  - **hpFloor holds it at 30% (and lockPhase in phase 2) until the third Remember.** The Remembers are counted at runtime (`a.remembers`), and phase 2's lockPhase is released from that count, never from a saved flag. Fail-safe 40 s after it reaches 30%: Selna remembers herself, «...Σέλνα. Με λένε Σέλνα.», which counts as the third.
  - On the third, her name returns to the quest text and her dialog title (`G.selnaBack`, runtime), toast q.selnaBack, and Alkyone's «Μάνα!». The saved flag `selnaBack` is written only with `skotosDown`: a death after the third Remember restarts the fight with her name hidden and the Remembers to play again.
- **Adds:** an Icemaw comes up from the ice edge at 55% and another at 40%; Hands rise, at most 2.
- **Music:** the title theme's melody with notes dropping out, fewer with each Remember (see Music).

**Phase 3, «Ο Έσχατος Φάρος» / "The Farthest Light" (30-0%).** The thing to do: **give the light Whitecliff's fire, then defend it.**
- **Wrap the Light** (a 3 s beat, hero iframes): it rises to full height and wraps two Hands round the dark tower. The cairns go out; the whole thin ring goes to crack stage 2. hpFloor (0.299 · hpMax) still holds it at 30% until the relight; on the relight `a.hpFloor` = 0.
- **The keepers come** (d.alk.j2, d.tern.j1, d.tam.j1): Alkyone, Tern, Tamarisk and Selna walk onto the ice with their lamps (walkTo, untouchable; the skerry's arena is open, so a straight line is right here). Their lamps are moving pools of r 3.5 that hold the ice; each goes to a cairn and relights it on arrival (6-10 s).
- **The relight:** the interact at the tower door, «Δώσε στον φάρο τη φωτιά του Λευκόβραχου» / "Give the light Whitecliff's fire", a 2.0 s channel broken by any blow that reaches her life. On success, d.relight: Arna's fire climbs Einar's tower. The lantern motif and the sea-light motif sound together.
- **The beam:** the Farthest Light sweeps the whole arena at an 8 s period, out to 26 m. **Each crossing Sears the body:** dazed 2.5 s, ×1.5 for 4 s, and every Hand sinks, rising again 5 s later.
- **It fights the beam:** Smother, The Deep Cold, and Black Wave twice in a row. d.skotos.p3 at 25%.
- **At 15%** Selna begins the roll of names, one floating `say` every 3 s.

**The naming.** At 0% the cine `naming` plays (see ending): the names, Isarn's name in second-person narration, «Κι εσένα σε ξέρουμε. Σκότος.», its first "I", the clear ice closing in a white wave from the tower (`uFreeze`), and the title card. Flag `skotosDown` is saved first; its first-kill legendary drops on the core.

**Echo refight.** «Πες το όνομά του» / "Say its name", at the ice edge from the skerry, after `seaLit`. The prompt is the rite in miniature: you raise it by naming it, and you put it down again.
- No allies. In phase 2 Selna's Remember beats are replaced by the four cairns: each relit cairn dazes it once (3 s) and counts in `a.remembers`, and lockPhase and the 30% floor move on after the third, as in the story fight.
- Phase 3 skips the relight: the Hands still wrap the tower and the beam still dies, but it comes back by itself after 6 s, and the 30% floor is released then; Smother still applies.
- Frost-black echo tint (baseTint 0x1a1424, rim 0xb090ff). Nothing in the echo touches the story.
ASSET: {"source": "sketchfab", "uid": "5c17cca6086e4910aa12e7d701ccd6a1", "url": "https://sketchfab.com/3d-models/ocean-creature-5c17cca6086e4910aa12e7d701ccd6a1", "title": "Ocean Creature", "author": "bast_yy (bast_y)", "license": "CC Attribution 4.0", "faces": 58912, "animations": 1, "notes": "A tall, glossy, blue-black tentacled figure from the author's own short animation (ArtStation case studies). The scout checked its provenance; clean. **As uploaded it is an upright octopus** (tags octopus, kraken, fish): a mantle with one clearly modelled eye over a bundle of tentacles. Shown as-is, with tentacle Hands rising through the ice, it would read as a kraken, the look the IP table steers away from.\n\n**Gates before any work, in this order.**\n- **Technical:** download the GLB (about 44 MB), not the 215 MB glTF, and confirm the IK/FK rig exports as plain skinned bones (IK targets and constraints dropped).\n- **Look:** in skotos.mjs, mask the eye (its geometry, or its texels in the base map) into the void colour; regrade near-black; then check the silhouette at the gameplay pitch (0.95 rad) and at the cine pitches in the creature viewer, waist-deep (the tentacle tips under the water plane), beside the hero for scale. It passes only if it reads as a hooded figure whose robe is its own arms: a shape, not an animal. **If it still reads as a squid, choose a humanoid or hooded source (a new provenance-gated scout pass, CC0 or CC-BY) before any build work.** The Lurker below is a floating red squid, so it must pass the same look gate to be used.\n\n**Build** (tools/creatures/act5/skotos.mjs):\n- Decimate 59k → 15k.\n- Take only the bone chains; lib.mjs makes every clip: rise, idle (a slow sway), sweep, slam, drink (it gathers dark into its chest), roar (phase 2), sink, surface, wrap (Hands up and around), recoil (the beam), hit.\n- Regrade near-black with a violet sheen; 1024 base, 512 normal and ORM.\n- **Skin:** the GLB carries `extras.keepMat: true` so creatures.js prepare() does not force envMapIntensity 0.4 and roughness 0.6 on it. An onBeforeCompile patch adds a fresnel term from the SEA uniforms (`uAurCol`, `uAurDark`), a hot streak where `uBeam` faces it, and slow pale flecks inside. The scene's RoomEnvironment PMREM (0.35) has nothing for a plain glossy material to mirror, so the patch is what makes it read.\n\n**The Hands:** 'Tentacle (rigged)' by CG Daniel Glebinski, 8fcc783af94246a0b8febf424a4b96b9 (CC-BY 4.0, 9,715 faces, one clip; the tentacle prop from his own short film). tools/creatures/act5/tentacle.mjs decimates it to 3k. Its textures are procedural Blender nodes that cannot be exported without Blender, so it wears a code material: near-black, glossy, the same fresnel patch with a violet rim and pale suckers, at no texture cost. Clips: rise, sweep, lash, wrap, smother (coiling down a tower), recoil, sink.\n\n**Fallback 1:** a humanoid or hooded source from a new scout pass, if the look gate fails. **Fallback 2,** only behind the same look gate (it is a floating squid as uploaded): 'Lurker - Rigged and Animated' by HighPolyDensity (28b3e1a216904de7ad212368fb9d8f59, CC-BY 4.0, 8,524 faces, 6 clips including attack and death; an already-credited author), regraded black with the same skin patch. The same moves; its own tentacles do the body's slams.\n**Fallback 3, no download:** STAND_IN skotos → ['troll'] (boot-loaded) at STAND_SCALE 2.4, tinted black at amount 2.0, standing in the water; skotosHand → 'heartroot' (code-built, actors.js:27). The fight still runs."}
MOVES:
- Hand Rise (phases 1-3): TELEGRAPH a ring of ice cracks at a Hand spot, r 2.5, 1.6 s, with an ice groan | EFFECT 1.2× to anyone in the ring; the Hand bursts up and its cell stays broken while it stands. Up to 3 out in phase 1, 2 after. Never inside lamp light.
- Sweep (each Hand): TELEGRAPH teleCone 6 m, arc 1.2, 1.2 s | EFFECT 1.1× and knockback; thin ice in the cone +1 stage. Each Hand every 6 s, staggered.
- Lash (each Hand): TELEGRAPH a sea-green teleLine 9 m × 1.6 m, 1.0 s | EFFECT 1.0× and Grabbed: pulled 4 m toward the Hand (`pl.pull`, stopping at the first deep cell or wall) and held 1 s. A roll during the tell escapes; any hit worth 10% of the Hand's life frees her.
- Black Wave: TELEGRAPH a black teleLine 18 m × 5 m from the body across the arena, 1.4 s; the ice along it darkens | EFFECT 1.2× and Cold +20; every thin cell on the line +1 stage. Cooldown 14 s in phase 1, 16 s in phase 2; twice in a row in phase 3 (cooldown 18 s).
- Drink the Light (phase 1): TELEGRAPH a 2 s channel; a dark vortex gathers at its chest and light visibly streams into it | EFFECT every light pool within 12 m of the hero (the cairns, the Cradle's ring) shrinks to 0 for 6 s. Interrupted by damage worth 4% of its life. Cooldown 20 s.
- Beneath (phase 2): TELEGRAPH it sinks; a shadow of r 5 circles under the thin ring, bubbles 6 m ahead | EFFECT untargetable until it Breaches.
- Breach (phase 2, every 9 s): TELEGRAPH the chosen hole boils (teleCircle r 3.5, 1.2 s), or the ice under the hero bulges and whitens in a star (teleCircle r 3.5, 1.5 s) | EFFECT 1.6× from a hole, or 1.8× from a ram (which breaks every thin cell in r 3), plus push 10. Then Exposed 4.5 s (×1.25), or Seared (×1.5) within 2 m of a lit cairn's pool; one Lash; it sinks.
- Selna falters (phase 2, at 55/45/35%): TELEGRAPH her lantern dims; a pale ring and «Θυμήσου τη» on her | EFFECT success: it is torn up, dazed 3 s, Exposed. Ignored for 12 s: it heals 4% (never above 65%) and the next Breach comes 4 s early.
- Icemaws (phase 2): TELEGRAPH a dark shape leaves the ice edge | EFFECT one Icemaw at 55% and one at 40%.
- Wrap the Light (phase 3 start): TELEGRAPH a 3 s beat with hero iframes | EFFECT the tower stays dark, the cairns go out, the ring goes to stage 2. Held at 30% until the relight.
- Smother (phase 3, after the relight): TELEGRAPH a Hand climbs the tower; the Coil appears at its foot with a 4 s ring timer over it | EFFECT if the Coil lives, the beam is dark for 8 s and the Coil withdraws. Cooldown 20 s.
- The Deep Cold (phase 3): TELEGRAPH every 15 s, a red teleCircle over the whole arena for 2.0 s, with blue safe circles on the four lit cairn pools (r 5), the keepers' lamps (r 3.5) and the skerry core (r 6) | EFFECT 2.0× and Cold +30 to anyone outside the light. Run into the light: Karthax's "The Dark" pattern.
- Eclipse (phase 3, optional, cut first): TELEGRAPH a Hand rises between the tower and the body, in the beam's path | EFFECT the beam stops at the Hand (the cone mesh is cut short at its distance), so the body is not Seared until the Hand is cut (hp 4). Every 20 s.

## Mechanics
**Systems are taught one at a time, then combined,** so a phone screen never asks for four things at once:
- **The coast before the Freeze:** the tide first (the Shallows), the ice second (the Fall shelf), the beams third (after the first sea-light).
- **The Walking Tower:** the tide, then the ice, then the light, one per phase.
- **The coast after the Freeze** keeps its tide (only the bay and the sky change); **the Farthest Light:** ice, Cold and beams. No tide.
- **The Skotos:** ice, light and the Cold, with its own Night.
- **No new buttons:** lighting, remembering, carving and giving fire use interact; bowling a louse and escaping a pull use the dodge. Everything else is positional.

### The Tide (Η Παλίρροια): the coast, and the Walking Tower's arena
The sea comes in and goes out on a fixed, audible cycle. It changes where the hero can stand, which enemies are awake and how strong they are.

**The clock.** The water level h, in metres, runs a 152 s cycle (180 s on Wanderer):

| state | duration | h |
|---|---|---|
| low water (slack) | 40 s | 0 |
| flood | 36 s | 0 → 1.2 in 8 steps of 0.15 m, one every 4.5 s |
| high water (slack) | 40 s | 1.2 |
| ebb | 36 s | 1.2 → 0 in 8 steps |

- **The clock starts at the beginning of low water on every zone build and on every entry,** so a returning hero always finds the camp and the causeways dry. Zones are cached (`G.zones`), so on entry `act5Enter` also sets every tidal cell by its bed at h = 0 in one batch: a hero who left at high water does not come back to a map whose closed cells no longer match `TIDE.h`.
- **What the player sees:** the water moves continuously (`uLevel`), one step ahead of the walk grid, so the sand darkens and the foam line arrives 3 s before a cell floods.
- **What the walk grid does:** it changes in steps of 0.15 m, at most one step every 4.5 s.
- **The warning:** the Landing's tide bell, and after relighting the bells of the sea-lights, ring 6 s before the flood and before the ebb begin (8 s on Wanderer). The HUD tide dial (a crescent by the minimap: the fill is the level, an arrow shows rising or falling) shows a countdown arc. Toast q.tideTurn once per visit; first-time hint hint.tide.

**The cells.** Each tidal cell has a bed height `L.bed` in metres (quantised to 0.15; `BED_DRY` = 9.0 is dry land; −0.6 the open sea). With depth = h − bed:
- **dry:** depth ≤ 0;
- **shallow (wading):** 0 < depth < 0.45. Walkable. The hero moves at ×0.7 and builds Cold (+4/s). Monsters move at ×0.75, except swimmers (the Sunken, lice, the Icemaw, the Reefback), who are not slowed. This is its own `inWater` multiplier in combat.js `moveMul`, set by tide.js (and by brine pools and slush cells), **not** the amber-sap branch: there `pl.onSap` feeds `st.stick`, and 1.5 s on sap roots the hero (player.js:62-63; moveMul hard-codes 0.55), which would root her every 1.5 s she wades, the Tower's flood included;
- **deep:** depth ≥ 0.45. Closed (cells 0, low 1). Sight and missiles still pass, as over lava (map.js `blocks`).
The walk grid, the water's vertex lift and the foam all read the same physical level, so what the eye sees is what the feet get.

**Safety rules (never unfair).**
- **Never under her feet, and never on an island of one cell.** Bed heights are quantised to 0.15 m and the flats are gentle, so one step can close a plateau several cells wide. When a step would close any cell within about 1 m of the hero, tide.js runs a BFS at the new level from her cell to the nearest cell that stays open, and defers **every cell on that path** as well as the cells under her: a lane that closes last. They stay shallow for up to 6 s, with the water round her darkening, the lane's foam brighter, and the dial pulsing, so she can simply walk out.
- If she is still in the lane after 6 s, a wave **washes her out** along it: pushed over 0.8 s along the lane's own path to its open end: a `pl.pull` that follows the lane's cell centres (a polyline) instead of a straight `castT` cast. The deep cells beside her are solid to `map.castT`, which would stop a straight push at once; the lane's cells are still open while she crosses them, so nothing stops the push and player.js's walkable snap never fires; 6% of max life (0% on Wanderer; see the table) and Cold +20. Then the lane closes. It is a push, never a teleport: the hero's position never jumps more than 3.5 m in a frame (asserted in the `tide` soak), and player.js's `nearestFloor(48)` fallback (player.js:103-110) never has to fire.
- The Walking Tower's forced flood uses the same lane.
- **Every pull in the act by an enemy** (the hook, the harpoon's reel, the Lash, the Icemaw's drag) stops at the first deep cell or wall along its path (`map.castT`). Only the wash-out follows its own lane instead.
- **Items wash ashore:** gold and items on a cell turning deep slide to the nearest dry cell.
- **Monsters caught in a closing cell** are pushed out by `collide()` and `nearestFloor`. Non-swimmers knocked into deep water drown after 0.5 s (killed, full xp).
- **The safe places stay safe:** camp, waypoints, exits, NPCs, sea-light bases and the islet tops are always dry. The generator guarantees it, and check-act5 tests it at both extremes.
- **Arrival** onto a flooded spot uses `nearestFloor` (world.js:223).

**What the tide does to fights.**
- **Low water (40 s):** the map is widest. Wrecks, ebb caves and causeways are open, and the Sunken lie under the wrack.
- **Flood:** creeks fill first and cut the flats into islands. Each wrack line the water reaches wakes its Sunken; Reefbacks get up; each wreck releases its lice.
- **High water (40 s):** the field is smallest. The hero holds islets, outcrops and wreck bellies. Flood waves of Sunken walk in (h ≥ 0.75 m); the Icemaw hunts the waterline.
- **Ebb:** unaggroed Sunken walk back to the wrack and lie down again at full life.
- So the rhythm is **explore at low water, hold ground at the flood.**

**Audio.** `MOOD.tide` (0 at low water, 1 at high) drives the surf in 'coast'.
IMPL:
- **src/world/map.js `GridMap.close(cells, low = true)`:** sets cells to 0 and low to 1, bumps `ver` once per batch and resets `flowT.x = −1` (`setSolid` does neither of the last two, map.js:25).
- **src/game/tide.js** (new, about 220 lines):
  - `TIDE = { h, step, t, force: null }`; `tickTide(dt)` from `updateAreas`, like `tickFlues`, for zones with `L.bed`;
  - each step diffs the band of cells crossing the deep threshold, defers the cells under the hero and her escape lane (a BFS at the new level to the nearest cell that stays open; the 6 s rule), batches into one `close` and one `open`, then emits 'mapChanged' (the minimap repaints deep water dark blue and shallow light blue);
  - the wash-out: a `pl.pull` along the lane's cell centres (player.js's pull tween gains a polyline path), ending on the lane's open cell; then the lane closes;
  - its state lives on the zone (`z.tide`); `act5Enter` restarts the clock at low water and sets every tidal cell by its bed at h = 0 in one batch on every entry;
  - `inWater` on the hero and on monsters (×0.7 / ×0.75 in `moveMul`, swimmers exempt), read by cold.js for the +4/s;
  - `waterAt(x, z)` → 'dry' | 'shallow' | 'deep';
  - pickup moving and flood-wave spawns through `updatePacks`' spawner;
  - `TIDE.force = { h, rate }` lets a boss own an arena's water; on the boss's reset the zone clock resumes at low water;
  - `uLevel` and `uWetLevel` (the highest h over the last 20 s, decaying at 0.05/s) are pushed to `SEA` each frame;
  - the DEV hook `window.__act5.tide`.
- Steps are 4.5 s apart, so the ~30 actors' `stepToward` windows rebuild at most once per step, spread over frames (engine brief §3.2: fine at one step per second or slower). The Tower's arena steps once a second for 6 s, inside the same limit.
- **gen5** writes `L.bed`, `L.tideLocked` and the per-vertex `aBed` attribute (the average of the vertex's four cells) that the water and the ground meshes read.
- **check-act5** runs every reach check at h = 0 and at h = 1.2 (see the coast's reach checks).

### The Cracking Ice (Ο Πάγος που Ραγίζει): the coast's shelves and Skerry Bay, every thin field on the Farthest Light
Thin ice carries anything that keeps moving. Weight, blows and the Skotos break it, and what falls through goes into the black water. Thick ice and land never break.

**The cells.**
- `L.thick`: white, snow-dusted, marked by Saltborn poles. Walkable; it never cracks.
- `L.ice`: thin, clear, dark blue-black with visible depth. Each thin cell has a stage: 0 intact, 1 hairline, 2 web, 3 crazed white, 4 broken (open water, closed).

**Load.** Each frame, for thin cells within 30 m of the hero, each actor adds its weight to the cell under its centre (big actors to every cell under their radius), times 0.3 while it moves faster than 1 m/s and times 1 while it stands:

| actor | weight |
|---|---|
| hero | 1.0 |
| ordinary monster | 0.6 |
| Hull-louse | 0.3 |
| the Ranger's spirit wolf | 0.5 |
| Icemaw (up on the ice) | 2.0 |
| `big` (the Rime Bear, the Reefback) | 2.5 |
| floaters, actors under the water, frozen statues, bosses | 0 |

- **One stage per 1.2 load** (on Warden; see Difficulty). Load decays at 0.25/s on an unweighted cell, never below the current stage: stages do not heal by themselves.
- **The break:** from stage 3, one more 1.2 of load starts a 0.6 s warning (the cell flashes white, a sharp crack, a ring of r 0.7, and a 30 ms vibration if the hero stands on it). Then the cell closes as low (water) in the next ice batch (below); the ice shader discards the cell and shows water; 2-3 floe shards bob in the hole; a splash and a puff of sea smoke.
- **Batches:** breaks and refreezes are coalesced into at most one `map.close` and one `map.open` every 0.25 s, so `map.ver` (and every actor's 41 × 41 `stepToward` window) changes at most four times a second even in a chain collapse or the Skotos fight. Nothing is lost: a break's 0.6 s warning is longer than a batch.
- **Chains:** when a cell breaks, orthogonal neighbours already at stage 3 break 0.3 s later. A crazed field collapses in a visible run.
- **In practice:** walking over thin ice is always safe. Standing still alone cracks a cell at 1.2 s, crazes it at 3.6 s and breaks it at about 5.4 s. Six lice on one patch break it in about 3 s. **Kiting is safe; standing still is not.**

**Impacts** add stages at once to thin cells **out of lamp light**:

| source | stages |
|---|---|
| Warden Leap (landing) | +1, r 3 |
| Warden Earthsplitter (quake) | +1 along its line |
| Mage Meteor | +2, r 3.5 |
| Mage Fireball | +1, r 1.5 |
| Ranger Arrow Rain | +1, r 3.5, once per cast |
| burning whale oil | +1 every 2 s beneath it |
| a bowled Hull-louse | +1 per cell it crosses |
| monster slam or charge impact | +1, r 2.5 |
| Rime Bear charge | +1 per cell entered; a stage-2+ cell breaks at once |
| Rime Bear roar | +1, r 4 |
| Reefback slam | +2, r 2.4 |
| Icemaw breach | +2, r 1.5 |
| Ice Singer's song | +2, r 2.5 round the hero |
| Walking Tower: Hammer Claw / Bell | +2, r 3 / +1 in its ring |
| the Skotos: Sweep / Black Wave / Hand Rise / ram | +1 cone / +1 line / breaks its cell / breaks r 3 |

**Lamp light holds the ice** (sea-light pools, cairns, the marker-lights, braziers, Name-stone lamps, the keepers' lamps; *not* fire areas, which melt, and *not* the Breathing-holes' rim lamps, see Sealing the Breathing-holes):
- inside lamp light, stages are capped at 1;
- broken cells inside refreeze in 6 s;
- **a beam passing over a cell** resets stages 1-3 to 0 and refreezes a broken cell to slush at once. The exceptions are the open water of a Breathing-hole and a hole a living Hand holds open.

**Refreezing.** A broken cell refreezes to **slush** after 20 s on its own, after 6 s in lamp light, and at once under a beam or inside **the Mage's Frost Nova** (r 5.5, data.js), which also resets stages 1-3 to 0 in its radius. That makes the Mage the act's bridge-builder. Slush is walkable wading (×0.7, Cold +4/s) and takes no load for 8 s; then it is thin ice at stage 1: new ice is weak.

**What falls in.**
- **The hero takes a plunge:**
  - 10% of max life on Warden (see the table), pure; **a plunge never takes her below 10% of her life, and a second plunge within 5 s costs half**;
  - Cold +35;
  - it resolves in `tickIce`, in the same batch that closes her cell, with no tween: she is placed directly on the nearest safe cell (land, thick ice, or thin ice at stage 0-1) back along her approach, or, if none lies within 3 m, on the oldest point of a 2 s ring buffer of safe positions; a splash at the hole, a short climb-out clip where she lands, 1 s of iframes. (A `pl.pull` from inside the hole would fight player.js, which snaps her out of any unwalkable cell every frame, to her last spot or to `nearestFloor(48)`; and `updateAreas`, where tickIce runs, comes after `updatePlayer`, boot.js:266-270.) The landing spot is at most 3 m away, or where she stood 2 s before;
  - a gasp and the hit text «Στο νερό!» / "Into the water!". **Never death by drowning,** and no swimming (there are no swim clips).
- **Ordinary non-floating monsters drown:** the hit text «Πνίγηκε» / "Drowned", full xp, loot dropped at the nearest solid cell. This is the reward for luring.
- **The Sunken** sink and climb out of another hole within 10 m 3 s later, at half life.
- **`big` monsters** (the Rime Bear, the Reefback) flounder for 3 s (×2.0, no actions), then haul out, breaking two edge cells; with 3 or more open cells within r 1.5 they drown.
- **Hull-lice** drown. **The Icemaw** dives home. Floaters (Ice Singers, Skuas) are unaffected. **Bosses never fall:** the Walking Tower is Overturned instead.

**Movement on ice.** A dodge-roll on any ice travels ×1.2 its distance (a skid). The Mage's blink is unchanged.

**Class play on ice.**
- **Warden:** the ice-breaker. Leap and Earthsplitter open holes under packs; frozen crews in a crazed field go down together.
- **Mage:** breaks with Meteor and Fireball, and builds with Frost Nova. The only class that can make a bridge, and the one that can trap an Icemaw below.
- **Ranger:** cracks from range with Arrow Rain, and her wolf is light. She plays the edges. (The stretch Harpoon-bow legendary would add a reel onto thin ice.)

**Readability (phone).**
- **Two colours carry the system:** white means safe (thick), clear blue-black means thin.
- The crack stage is visible on every cell, and each stage has its own sound: a creak, a ping, a crack, a crash.
- The danger shows at the hero's feet, where the eye already is: her foot ring turns white on a stage-2 cell, with a creak. First-time hint hint.ice.
- The minimap shows thick ice white, thin ice pale blue, water blue.
- `MOOD.ice` makes the ice song sing more often near thin ice.
IMPL:
- **src/game/ice.js** (new, about 280 lines):
  - per-cell `stage` (Uint8) and `load` (Float32) arrays, sized to the map;
  - `tickIce(dt)` from `updateAreas`, over a sparse map of loaded cells within 30 m of the hero (a spatial hash of actors);
  - `crackAt(x, z, r, stages, o)` and `loadAt(x, z, r, amount)` for moves and skills; `refreezeAt(x, z, r)` for Frost Nova and beams;
  - breaks and refreezes coalesced into at most one `map.close` and one `map.open` every 0.25 s (slush is floor); the `ice` soak logs `map.ver` bumps per second;
  - the plunge placed in the same batch as the break (no tween, so player.js's walkable fallback never fights it);
  - its state lives on the zone (`z.ice`); `act5Enter` heals it on every entry (broken and slush cells back to thin ice at stage 0, loads cleared);
  - `iceAt(x, z)` → 'land' | 'thick' | 'thin' | 'slush' | 'water'; `holeNear(x, z, r)` for the Icemaw and the Skotos;
  - plunges and drowning through combat.js `kill` with `o.drown` (skips the corpse dissolve, plays a splash);
  - the safe-position ring buffer;
  - lamp-awareness through `lampLightAt` (fire areas and the hole lamps excluded);
  - the `tCrack` DataTexture (R8 w × h, nearest), re-uploaded only when dirty and at most every 0.1 s;
  - the floe pool (32 instanced shards).
- **skills.js:** Leap, Earthsplitter, Meteor, Fireball and Arrow Rain get an `o.slam`/`o.crack` flag and call `crackAt`; Frost Nova calls `refreezeAt` (it already knows its radius); the dodge reads `iceAt` for the skid (`D.dist`).
- **ai.js:** the charger's `dashStep` (ai.js:785) gains `D.ice`; the curl launch calls `crackAt`; the Icemaw, the Hands and the Skotos call `holeNear` and `crackAt`.
- **gen5** writes `L.ice`, `L.thick` and `L.window`.
- **check-act5 hard checks:** the thick spine and rims are continuous; every interactable, camp, window and exit stands on thick ice or land.

### The Sea-Lights and the Cold (Οι Φάροι και το Ψύχος): both zones and both fights
The third mechanic varies Act IV's Light and Shroud rather than repeating it. No Act V enemy is Shrouded. Light here warms the hero, holds the ice, reveals the Skotos's creatures, and moves.

**The Sea-Lights (Οι Φάροι).**
- **The interactable:** kind 'sealight'. Dark until lit by a 1.5 s channel from the Cradle; a hit worth 10% of max life interrupts it.
- **Once lit,** permanently (flag `light_<id>`): a respawn checkpoint, a warm pool of r 7 at its base, and a rotating **beam**.
- **The beam:** length 26 m, half-angle 0.18 rad, one turn every 12 s at a constant rate on every difficulty. Inside the beam means distance in [3, 26] and |angle − θ(t)| < 0.18 + 0.6 / distance, so it is wider near the tower. It is drawn soft and above the ground, never on it, so it cannot be mistaken for a telegraph.
- **What the beam does to what it crosses:**
  - **the hero:** Cold −15 at once, then Warmed (no build-up) for 4 s;
  - **`unlit` enemies:** dazzled (daze 1.5 s, once per sweep) and Revealed (×1.25 for 3 s), with a pale rim and the hit text «Στο φως!» / "In the light!";
  - **`lightShy` Skuas:** scatter for 3 s;
  - **thin ice:** stages reset, holes refreeze to slush (above);
  - **natural beasts** (the Icemaw, the Rime Bear, the Reefback, the Walking Tower): nothing, except that an Icemaw whose hole the beam refreezes is Stranded.
- **The rhythm:** the 12 s sweep gives every fight near a tower a beat. Pull the Sunken across the sweep's path and strike the dazed.
- **On the Ice Road,** every sealed Breathing-hole leaves a marker-light: a static warm pool of r 5 and a short beam with an 8 s period, a chain of warm stops up the road.

**Lamp light** (`lampLightAt`: the pools of lit sea-lights, cairns, marker-lights, braziers, Name-stone lamps and the keepers' lamps): holds the ice (above); the Sunken never wake from the tide inside it; the Icemaw cannot surface and Hands cannot rise inside it; the Ice Singer's song fizzles inside it. **The Breathing-holes' rim lamps are not lamp light:** they warm the hero and light the area (`lightAt`), but they do not hold the ice or deny the Skotos's creatures, or the seals could not work (see Sealing the Breathing-holes).

**Whale-oil casks** («Βαρέλια με λάδι φάλαινας»): breakable props (one hit) on wrecks, the jetty, the Icebound Ship and the Skotos's rim. Each spills **burning oil** r 2.5 for 6 s, a fire area that:
- burns monsters;
- is warmth (Cold −8/s) and scatters Skuas;
- **melts ice:** +1 stage every 2 s under it, so oil is how you open a hole beside a lit cairn for the Skotos;
- floats: on water cells it keeps burning.

**The hero's light.** Whitecliff's coal rides in the Ember Cradle on her hip: a 4 m ring of white-gold light in the light.js Cradle slot (`ZONES[id].ring` 4 in Act V, 6 in Act IV). It is not a warm pool, does not hold the ice and does not count against the Skuas, so the hero still has to come in to the fires. Bosses can shrink it (Drink the Light, the Night). It does not drink: Act IV's `drink()` (fire inside the ring burns out twice as fast and the ring swells to 9 m) runs only in 'ember' zones, so burning whale oil and the Mage's fire keep their full time near the hero and the ring stays at 4 m.

**The Cold (Ψύχος)**, a meter from 0 to 100 on the hero, in Act V zones only. **It never builds from simply being outdoors.**

What builds it:

| source | Cold |
|---|---|
| wading (tide shallows, brine, slush) | +4/s |
| blizzard gust on the Farthest Light's open fields (8 s every 40 s, telegraphed 3 s ahead; out of the lee of bergs, the ship and warm pools) | +2.5/s |
| tide wash-out | +20 |
| ice plunge | +35 |
| Skua bite | +3 |
| a Sunken's hit from the water | +4 |
| Ice Singer's wail | +10 |
| Rime Bear's roar | +15 |
| Black Wave; the Black Breath at the holes | +20 |
| The Deep Cold | +30 |

What drains it:
- −3/s anywhere dry and out of a gust, so it always fades on its own;
- −12/s in a warm pool (the hearth, a lit sea-light's base, a cairn, a marker-light, a camp brazier, the keepers' lamps, a lit hole lamp);
- −8/s in a fire area (whale oil, the Mage's fire);
- a beam over the hero: −15 at once, then Warmed for 4 s.

What it does:

| Cold | state | effect |
|---|---|---|
| 0-49 | none | none |
| 50-74 | **Chilled** (hud.chilled) | −8% move and attack speed; denser breath; frost at the screen's edges |
| 75-99 | **Freezing** (hud.freezing) | −15%, and no life regeneration |
| 100 | **Frostbite** (hud.frostbite) | frozen in place for 1.0 s with an ice tint (the `rootHero` pattern, recoloured), 5% of max life, then the Cold drops to 70. A dodge breaks it, as with amber. **In a boss fight Frostbite is a 50% slow for 2 s instead, and it waits until no red telegraph is under her.** |

**Readability.** The Cold meter takes the amber meter's place on the HUD (hud.js:130-136: a snowflake icon, a blue fill), and the CSS frost overlay grows from the screen's edges. Wading, brine and slush show on the Cold meter only, never on the amber meter. The first time Chilled is reached, a one-time hint hint.cold.
IMPL:
- **src/game/light.js:**
  - its zone set becomes per zone: `ZONES[id].light` ('ember' for ashfield and forge, 'sea' for coast and farlight); `LIGHT.base` reads `ZONES[id].ring`;
  - the Shroud stays exactly as it is, active only in 'ember' zones;
  - new `addBeam(x, z, o)` → `{ x, z, len, half, period, theta, pool, light, mesh }`, ticked each frame: it moves one light pool and one `addLight` source along the beam's near half and turns the cone mesh;
  - `inBeam(x, z)` is the sector test; `lightAt` counts beams; `lightAt(x, z, { ring: false })` leaves out the hero's own ring (today `lightAt` returns true inside it), for `lightShy`; new `lampLightAt(x, z)` excludes fire areas and the hole lamps, for the ice and the `unlit` denials;
  - `drink()` and the ring's swell run only where `ZONES[id].light === 'ember'`;
  - `addLightPool` takes `{ decal: false }` for the beam's moving pool, which lights but draws nothing on the ground;
- **src/game/cold.js** (new, about 140 lines): the meter, a single `coldAdd(v)` (called from combat.js `hurtHero` options, tide.js and ice.js; it applies the difficulty factor), the +4/s while `inWater`, warmth through `lampLightAt`, the lit hole lamps and fire areas, the states, Frostbite through `rootHero` with an ice tint and the boss-fight variant, the HUD meter and the CSS overlay.
- **ai.js:** a shared `beamTick(a)` for `unlit` and `lightShy` actors.
- **Interactables:** kinds 'sealight', 'hearth', 'cairn', 'holeLamp', 'nameStone' and 'oilCask' (a breakable prop actor, `prop: true`, whose death spawns `area('fire')` with a `floats` flag).

### The vulnerability rule (one rule for every "takes more damage" status)
- Every target has **one** vulnerability multiplier: the largest of its active statuses. They never multiply together.

| status | × | who |
|---|---|---|
| Revealed (a beam), Exposed (up after a breach) | 1.25 (1.35 on Wanderer) | unlit enemies; the Icemaw; the Skotos |
| dazed against a wall or a boulder; Beached; Stranded; Seared | 1.5 | chargers; the Walking Tower; the Icemaw; the Skotos |
| Blinded | 1.6 | the Walking Tower |
| Floundering (non-boss only); Overturned (the Tower's scripted window) | 2.0 | the Rime Bear, the Reefback; the Walking Tower |

- It multiplies with the hero's own damage, with ward (×0.5) and with resistances (Island ×0.3), and never with another vulnerability.
- **A boss caps at ×1.6** outside its one scripted window per phase (the Tower's Overturned, 5 s per Rush).
- The Einar's Lantern legendary applies Revealed, so it adds nothing to a target that is already Revealed or worse.
- The `tower` and `skotos` scenarios assert the time-to-kill targets under Bosses.
IMPL: combat.js, next to the ward line in `act4Hit` (combat.js:181), which becomes `actHit`: `amount *= vuln(target)`, where `vuln` returns the maximum over `a.vulns` (a small map of status → seconds left), capped at 1.6 for bosses unless `a.vulnWindow` is set.

### Sealing the Breathing-holes (Οι Ανάσες): the Farthest Light (q28)
Not a hold with an ally and a ring timer, as the Forge's Great Bellows were. Each hole is a small light puzzle fought on moving feet.

**The rule.** The creed made playable: «Φως στο νερό, για να μείνει το νερό νερό.» Three marker-lamps stand on the hole's rim at 120°, one of them on a thick tongue reaching into the lead. Each lights with a 1 s touch from the Cradle and throws a pool of r 4.5 that reaches the open water.
- **The rim lamps are not lamp light** (`lampLightAt` leaves them out). Three pools of r 4.5 on the rim of an r 4.5 hole cover the whole rim, so if they held the ice the Black Breath could never crack a shielding hero's ice past stage 1, hole 2's Icemaw could never surface, and the Sunken (`unlit`) could never climb out. They warm the hero and light the area; they do not hold the ice or deny anything.
- **When all three burn together, the hole starts to freeze:** a white ring closes over the water, 8 s on Warden (see the table). If any lamp goes out, the ring stops and loses 2 s (1 s after the first minute at a hole).
- When the ring closes: the freeze wave races out across the lead (3 s, cine at pitch 0.75), every lead cell becomes thick ice (map.open and `L.thick`), the three lamps become one marker-light, the Skotos's song cries out, flag `hole<k>`, then the toast.

**The Black Breath.** Every 6 s the hole breathes at one lit lamp: a dark teleCone 7 m long, arc 0.6 rad, from the hole toward that lamp, with a 1.2 s tell (never shortened).
- **If the hero stands in the cone between the hole and the lamp,** she takes 0.8× and Cold +20, and the lamp holds. She can shield it, or let it go and relight it in 1 s.
- **Otherwise the lamp goes out.**
- **The cone cracks the thin ice it crosses** by one stage, so a shielded lamp leaves the hero standing on worse and worse ice.

**Each hole is different:**
- **Hole 1:** the rule alone. Sunken climb out of the water, 2 every 6 s, at most 5 alive.
- **Hole 2:** the rim is thin ice. The Black Breath's cracks are where an Icemaw comes up (it surfaces through any stage-2 cell the breath made within 4 m of the hero), and lice burst from cracks round the rim at 12 s. Stand still to shield a lamp and the ice goes; move and the lamp goes.
- **Hole 3:** a blizzard gust every 20 s instead of 40, an Ice Singer whose finished song puts the nearest lamp out, and Skuas that mob while any lamp is dark.

Alkyone waits on each hole's south rim (untouchable) and says one line when it closes (d.alk.s1-s3).

**Fail-safe** (every boss rule has one; so does the seal). After 60 s at a hole, or after 4 lamps lost to the Black Breath, Alkyone steps out onto the tongue pad (a short `map.stepToward` walk over thick cells) and holds that lamp: it cannot be put out by the Breath or by hole 3's song. One line: d.alk.s0 «Αυτό το κρατάω εγώ. Εσύ τα άλλα δύο.» / "I'll hold this one. You keep the other two." From the first minute on, a lamp lost costs the ring 1 s, not 2. On the weakest builds the Breath (5 s on Ash) against a 10 s ring otherwise nets about +0.5 s of ring per unshielded cycle, and hole 3's song and Skuas make it worse; the `holes` scenario asserts a seal-time ceiling per difficulty.

**Scaling** (see Difficulty): the freeze ring 6/8/8/9/10 s and the breath's period 7/6/6/5.5/5 s from Wanderer to Ash. The 1.2 s tell never changes.
IMPL:
- Interact kind 'holeLamp' at `L.spots.holes[k].lamps[i]`: a light that can be put out (`it.snuff` / relight; light.js `isLamp` counts it; `lampLightAt` does not); `it.held` while Alkyone holds it (the fail-safe).
- A per-hole controller in a small `seals.js` (or in story.js's act5 block): the all-lit check, the ring, the breath scheduler (Karthax's Ash Breath at Isarn's lantern, reused), the wave spawns from the hole's water cells, and the fail-safe (a timer and a count of lamps lost).
- Progress is saved in `flags.hole0`-`hole2`. On load the lead cells reopen as thick, the way the slag plug does. `uFreeze` slot k drives the visual.

### Ice Memories (Μνήμες από πάγο): the three coast sea-lights, and the Farthest Light
**Where they are.** Each coast sea-light has an ice window at its foot: a 2 × 2 patch of thick cells drawn as transparent ice over a pit in the ground mesh (`L.hgt` −2.2). In the pit lies a frozen figure: a people model posed with the statue's ice-blue frozen tint (ai.js:108), lit from below by a small cold light. `groundY` reads the ice surface on window cells, so the hero's ring and pools lie on top of the window.

**When they play.** On lighting a tower, the beam's first sweep crosses the window and the next memory in count order plays: the Lamp Memory flow (story.js `on('lamp')`) with
- the body class 'memory-ice', a cold white-blue swap of 'memory-ash';
- the narrator npc.iceMemory «Μνήμη από πάγο» / "A memory in ice";
- the figure standing up as a pale memory figure for the scene;
- the existing BUFFS.memory, toasted as «Μνήμη των Αλιγενών» / "Memory of the Saltborn": +12% damage, +8% movement for 60 s.

Memory 4 plays in the Farthest Light's lantern room after the Skotos is named. Text keys d.ice.i1-i4. The one word at the end of Memory 3 is the reveal; the one line at the end of Memory 4 is the payoff.
IMPL: window cells form a separate small transparent mesh in the ice shader (define ICE_WINDOW: alpha 0.35, stronger fresnel, no parallax). The figures are `spawnNpc` statues from the frost set and a boot-loaded people.glb villager (young Einar; never a player class's body). Flags `mem_i1`-`mem_i4` mean "seen". Nothing else is new.

### World-state: the Fourth Fire Goes Out, the Freeze, the Lights Answer, the Ice Goes Out (Η Τέταρτη Φωτιά Σβήνει, Το Πάγωμα, Τα Φώτα Απαντούν, Ο Πάγος Φεύγει)
One more chain after Act IV's `fireTaken` → `crownUnmade` → `newFire`. Every flag is saved before its scene plays (the one exception is `selnaBack`, saved with `skotosDown`) and read on zone build, on every zone entry (zones are cached) and on load.

1. **`coastCall` (q24).**
   - Whitecliff: FAR_BEACONS[3], the fourth fire, is dark. In townFires (world.js:1009), `lit[3]` becomes `newFire && !(coastCall && !seaLit)`.
   - Whitecliff's beacon stays lit: the coal is taken without taking the fire.
   - The Field: the corridor's rubble is already open (`newFire`, on every entry); its exit unlocks with `coal`.
2. **`coastSeen` / `hearth` (q25).** The coast under the green aurora; the Landing dark until the hearth, then peopled.
3. **`frozen` (end of q27, the Freeze).**
   - **The coast:** Skerry Bay's north rim becomes the thick road north and the farlight exit opens; the dead Tower stands rimed on its skerry, still lit; ATMOS 'coastFrozen' with the black aurora. The rest of the coast keeps its tide. (The full frozen reading is stretch.)
   - **The Farthest Light:** the zone now exists, under the black aurora.
   - **Selna's name is «…»** wherever the game would print it, until `selnaBack`.
4. **`hole0`-`hole2` (q28).** The leads freeze thick, the Ice Road is whole, and the marker-lights burn.
5. **`seaLit` (q29).**
   - **The Farthest Light:** it burns, its beam turning at a 12 s period; 'farlightAurora' (the true aurora); Selna and Tern at the tower; Selna's nightly rite.
   - **The coast:** ATMOS.coast again, with the true aurora.
   - **Whitecliff:** the fourth fire is lit again; three new FAR_BEACONS appear, `{ dx: −18, dz: −78, y: 8, color: 0xf0f4ff, sea: true, seed: true }`, `{ dx: 20, dz: −80, y: 7, sea: true, seed: true }` and `{ dx: 34, dz: −76, y: 6, sea: true, seed: true }`, lower than the mountain fires. `seed: true` matters: townBeyond carves a hilltop for every far beacon without it (world.js:84, `FAR_BEACONS.filter(F => !F.seed)`), which would change every hero's horizon, not only after `seaLit`. They pulse brighter once every 12 s (farFire gains a `flash` period); 'townAurora' with G_AUR at `uAur` 0.5 and a slow green drift in the hemisphere light; the q30 child at the beacon.
6. **Stretch: `iceOut`** (saved with `seaLit`; its short cine plays on the first coast entry after it: d.iceout «Το πρωί ο πάγος σπάει και φεύγει με την άμπωτη. Ο Βορράς ακούει ξανά τη θάλασσα.» / "In the morning the ice breaks and goes out with the tide. The North hears the sea again.", big toast q.iceOut). The coast's spring reading (see the coast). The Farthest Light stays frozen: «Ο μακρινός πάγος κρατά ως το καλοκαίρι» / "The far ice holds till midsummer". Out of the base scope.
- **Packs stay for farming** in every state.
- **Old saves** without these flags read as the Act IV end state (quest 23, `newFire`). `hero.act5 ??= −1`.
IMPL: `act5Zone(z)`, `act5Enter(z)` and `act5Presence(z)` in world.js, mirroring the Act IV trio (world.js:582-709). Derived states: `coastMode() = frozen ? 'frozen' : 'tide'` (the stretch adds `iceOut ? 'spring'`); `skyMode() = seaLit ? 'true' : frozen ? 'black' : 'green'`. Zones are cached, so `enterZone` rebuilds 'coast' (`fresh: true`) when `coastMode()` differs from `z.mode` and 'farlight' when `skyMode()` differs from its `z.mode`; `act5Enter` resets the tide and heals the ice on every entry (see Cached zones under beats). `townFires` reads `coastCall` and `seaLit`. ATMOS variants are chosen in `enterZone`, as Act IV chooses 'ashfieldDawn'. The title screen reads `save.heroes.some(h => h.act5 >= 0)` for game.sub5.

### Difficulty: what each level does to Act V
The five difficulties keep their names (canon item 20). On top of the existing hp, damage, elite and loot scaling, every Act V hazard scales. **Telegraph durations never change:** difficulty scales damage, cooldowns and adds.

| | Wanderer | Warden | Hero | Nightmare | Ash | Skotos (stretch) |
|---|---|---|---|---|---|---|
| monster hp / dmg (existing) | 0.65 / 0.55 | 1 / 1 | 1.9 / 1.55 | 3.6 / 2.4 | 7 / 3.8 | 11 / 5.4 |
| tide cycle | 180 s | 152 s | 152 s | 152 s | 152 s | 152 s |
| tide bell lead | 8 s | 6 s | 6 s | 6 s | 6 s | 6 s |
| tide wash-out (% max life) | 0 | 6 | 6 | 8 | 10 | 12 |
| ice plunge (% max life) | 6 | 10 | 10 | 12 | 14 | 16 |
| ice: load per stage | 1.6 | 1.2 | 1.2 | 1.1 | 1.0 | 0.9 |
| Cold gains | ×0.6 | ×1 | ×1 | ×1.15 | ×1.3 | ×1.45 |
| Revealed / Exposed | ×1.35 | ×1.25 | ×1.25 | ×1.25 | ×1.25 | ×1.25 |
| hole freeze ring | 6 s | 8 s | 8 s | 9 s | 10 s | 10 s |
| Black Breath period | 7 s | 6 s | 6 s | 5.5 s | 5 s | 5 s |
| boss cooldowns | ×1 | ×1 | ×1 | ×0.9 | ×0.85 | ×0.8 |
| adds per boss call | +0 | +0 | +0 | +1 | +1 | +2 |
| telegraph durations | never change | | | | | |

**Unlocks from any act (base).** `diffUnlocked` (panels.js:245-249) reads `h['act' + n]` for every act, so Nightmare and Ash unlock from **any** act finished on the previous difficulty (the engine brief's recommendation): a hero never has to replay Act I to climb. pick.locked is reworded to match: «Κλειδωμένο: τελείωσε οποιαδήποτε Πράξη στο «{0}»» / 'Locked: finish any Act on "{0}"' (today it says Act I).

**The sixth difficulty, «Σκότος» / "Skotos"** (stretch, out of the base scope; canon allows a sixth and forbids renaming the five; the owner decides).
- Values: `{ id: 'skotos', hp: 11, dmg: 5.4, xp: 6.5, gold: 5.4, loot: 4.6, elite: 2.1, leg: 4.6, color: '#4a5aa0', unlock: 'act5:ash' }`.
- diff.skotos «Σκότος» / "Skotos"; diff.skotos.d «Εδώ ξεχνιούνται και οι ήρωες.» / "Here even heroes are forgotten."

**Seeds per difficulty** (owner's call, cheap): key the Act V seeds by difficulty (`coast@3`, `farlight@3`), so climbing to Hero, Nightmare or Ash gives the same hero a fresh layout of the coast and the frozen sea. It is the layout only: a hero has one `flags` set and switches difficulty in the waypoints panel (panels.js:285), so the world state (lights lit, holes sealed, the Freeze) stays the hero's own on every difficulty. `diffChanged` (boot.js:172) drops the cached zones; it must dispose them first (`disposeZone`), or Act V's large per-cell water and ice meshes leak until garbage collection on every switch.

### Touch and phone readability (rules the act keeps)
1. **No new buttons.**
2. **Telegraph palette:** red and orange, harm; **sea-green, a pull or a reel** (the hook, the harpoon, the Lash, the Icemaw's drag); white crack-stars, ice about to break; blue, a safe zone; beams soft and above the ground, never on it: a beam lays only real light on the ground, no decal.
3. **At most two big telegraphs at once,** and the environment (the tide bell, a flood, a gust, the Black Breath, the Deep Cold) always counts as one.
4. **Danger at the hero's feet:** the foot ring on stage-2 ice, the Cold meter in the amber slot, the tide dial by the minimap, a vibration on a break under her.
5. **Audio carries timing:** the bell before every tide turn, the creak before a break, the rising spindrift before a gust, the beam's bell on each turn.
6. **Never unfair:** the tide never closes a cell under the hero, or her way out, without 6 s of grace; the ice gives its own guarantee instead (a 0.6 s warning before a break, a plunge that never kills or takes her under 10%, and a landing on the nearest safe cell within 3 m or where she stood 2 s before); every safe place is dry at both tides; every enemy pull stops at the first deep cell; fail-safes for both bosses' rules and for the seals.
7. **Test at quality 0 and gate at quality 1:** the water is opaque but for a narrow shore band, and coloured by depth so wading and closed water look different; the ice is one opaque mesh drawn first; a beam is one additive mesh plus one pooled light; at most 4 point lights are real. `perf5` gates at quality 1, the phones' default.

### Engine work Act V needs
An honest list. The days are focused days for one agent who knows the code, measured as the engine brief measures them (against Act IV's light.js 236 lines, forge.js 159, gen4.js 916). The order is the build order.
IMPL:
1. **Fifth-act plumbing (1.75-2.25 d, low risk).** Generalise rather than copy where it is one line:
   - **world.js:** `ZONES.coast` and `ZONES.farlight` with `light` and `ring` keys; `READY.rime = { folk: ['frost'], creatures: 'act5' }` and `zonePacks`; the first-boss list (:257); the champion chain (:286); the `why` map (:355) for `coal` and `frozen`; `ECHO_PROMPT` (:458); `ZONES[id].act === 4` tests turned into `act >= 4` where they mean "a late act"; the :48 comment; town's ad hoc `loadFolk('frost')` from q24, and the Field's from q25 (Alkyone at the Anvil Gate; act4Presence).
   - **Cached zones:** the Field's corridor plug opened in `act4Enter` on every entry as well as in `act4Zone`; `enterZone` passes `fresh: true` for 'coast' when `coastMode()` differs from `z.mode` and for 'farlight' when `skyMode()` differs from its `z.mode`; the `diffChanged` handler (boot.js:172) disposes the zones it drops (`disposeZone`).
   - **light.js:17:** per-zone flags. **build.js:1957:** an `ACT5` set; `ground4()` (:1075) gets a `ground5`.
   - **boot.js:** the migration (`hero.act5 ??= −1`, `flags.act5`); `updateAct4` (:269) generalised to `updateAct(n)`; moods (:289).
   - **state.js:28:** `act5: −1`.
   - **story.js:** the questText clamp (:25) to 31, with the q26 and q28 counters and the `{0}` name parameter (blank while `frozen && !selnaBack && !G.selnaBack`); `actComplete` gets a branch for 5 (:464; the bare `else` must no longer mean Act IV); `offerBoons` loops over [1..5] (:449); the echo tints (:186, :395); `rl()` accepts `.m` for the Mage line.
   - **stats.js:24:** ×1.25 for BOONS[5] when `flags.remembered`.
   - **panels.js:** waypoints (:163); the act panel reads act5.*; the boon panel's header boon.h5 and remembered flag (:230); `diffUnlocked` (:245-249) reads every act, and pick.locked is reworded.
   - **hud.js:** `questGoal` (:238-268, including the unseen-memory window), the Cold meter, the tide dial; **viewer.js:** generators for coast and farlight (:147-198); **env.js:** `PACK_ORDER` gets 'rime'; **creatures.js:** `ACT_FILES.act5` = crab, skotos, tentacle, icemaw, louse, skua, bear, and `prepare()` honours `extras.keepMat`.
2. **The Field's corridor (0.5-1 d, low).** gen4.js after `tryAshfield` returns, with its own RNG, local `L.hgt`, dropped dressing, the Graves keep-out rectangle, the rubble plug and a parity script over check-act4's seed sweep. Plan B: the cold Forge's north flue.
3. **gen5.js, both zones (4.5-6.5 d, medium).**
   - genCoast (the tidal reading, and the bay's frozen change from the same seed) and genFarlight, with `L.bed` (Float32, `BED_DRY` = 9.0 for dry land), `L.ice`, `L.thick`, `L.deck`, `L.window`, `L.tideLocked` and `L.hgt`.
   - `reach`, `nearReach`, `terrain` and `groundY` move from gen4.js into a shared `genlib.js` with no change in behaviour, and gen4 re-imports them. `groundY` gains the ice-surface rule for `L.ice`/`L.thick`/`L.window` cells.
   - Reach checks at both tide extremes (always-dry spots at both, tide spots at h = 0), after the bay's frozen change, and with the holes sealed in turn.
4. **tools/check-act5.mjs (1 d).** check-act4's shape: N seeds (300), hard and soft sets, exit 1 on any hard failure. Hard: reach at h = 0 and h = 1.2 as above; a dry-at-high pocket not connected to the camp without a `skerry` marker; refuges; spine and rim continuity; windows, lamps, cairns and interactables on thick ice or land (the `tideLocked` ebb hoards and Name-stone excepted, checked at h = 0); exits; the corridor's parity and its Graves keep-out rectangle. Soft: a mean above 3 tries per seed.
5. **sea.js visuals (5-6 d, medium; fill rate on phones).** Re-estimated per the review: water, ice with parallax, the crack Voronoi, the aurora reflection and dome, beam cones, the Freeze and freeze waves, the icy Instancer material and three groundMat defines. **Every quality-0 path is built first.**
   - `buildSea` (chunked, `aBed` with the finite `BED_DRY` and a clamped lift, swell, fresnel, light paths, aurora reflection, foam, the colour by depth with its 0.45 m step and edge line, `uWake`, the draw order); `seaBeyond`; `buildIce` (parallax, `uShade`, `uGlow`, the crack texture, windows, `uFreeze`, `uFreezeAll`); `auroraSky`; `beamMesh`; the noise texture; the Skotos skin patch.
   - Hooks in build.js `buildLevel` (:2703): `if (L.bed || L.sea) out.sea = buildSea(...)`, `if (L.ice) out.ice = buildIce(...)`, `act5Level(...)`. New GROUND entries, and G_GLINT, G_WET (`aBed` on the ground geometry) and G_AUR.
   - build5.js `act5Prop(kind, o)`: 'sealight' (`setLit`), 'hearth' (`setLit`), 'cairn' and 'holeLamp' (`setLit`), 'farLight' (`setLit`, `setBeam`), 'iceWindow', 'stiltHut', 'rack', 'floe', 'bell', 'lanternRoom', 'nameStone' (`setLit`).
   - **The perf gate:** `perf5` must pass (quality 1 under mobile emulation, both worst spots within the Field of Ash's frame time + 15%; quality 0 as a floor) before either boss is built.
6. **tide.js and `GridMap.close` (2.75-3.25 d, medium-high).** The clock, steps, batches, the 6 s grace with the hero's escape lane (a BFS at the new level, every lane cell deferred), the wash-out along the lane's path (a polyline `pl.pull`), pickups, flood waves, `TIDE.force`, `z.tide` and the reset to low water on every entry, `inWater` for the hero and monsters (×0.7 / ×0.75 in `moveMul`, swimmers exempt), the HUD dial, `mapChanged` and minimap water colours.
7. **ice.js (2.5-3 d, medium).** Load, stages, chains, break and refreeze coalesced into one batch every 0.25 s, slush, drowning and floundering, the plunge placed in the break's batch with its rules and ring buffer, `z.ice` healed on every entry, the floe pool, the crack texture, the class hooks in skills.js (Frost Nova's refreeze, the skid), the charger's `D.ice`.
8. **cold.js, beams, lamps and oil (2.25-2.75 d, low).** The meter, its sources and sinks, states, Frostbite and its boss variant, the HUD meter, the CSS frost overlay; `addBeam`/`inBeam`, `lightAt(x, z, { ring: false })`, `lampLightAt` (no fire areas, no hole lamps), a light pool with no decal for the beam, `drink()` and the swell for 'ember' zones only; sap.js `sapAt` returning the pool's kind ('amber' alone builds the stick; brine and slush their own look); the Cradle's 4 m ring; the oil casks; the vulnerability rule in combat.js; the global light gain in gfx.js `updateLights`; the two legendaries' effects (no life lost to plunges and wash-outs; Revealed on hit), dropped through `legFrom_<boss>` with `leg: LEG_FROM[a.kind]` (items.js:70 already honours `o.leg`).
9. **FX and atmospheres (1.25-1.5 d, low).**
   - **atmos.js:** coast, coastCine, coastFrozen, farlight, farlightNight, farlightAurora, townAurora; `mixAtmos` exported.
   - **fx.js:** the ambients 'coast', 'coastFrozen', 'farlight' and 'blizzard'; the emitters 'seasmoke', 'drip', breath, splash, ice shards and freeze crystals; footprints.
   - **WIND.uSnow** on for the Act V zones (world.js:200).
10. **AIs and traits (4.5-5.5 d, medium).**
    - New AIs: 'singer' and 'lurker'.
    - New traits: `tideWake` (including the frozen-crew statue wake), `tideborne`, `swim` (the `swimTo` helper), `unlit`/`lightShy` (`beamTick`), `curl` (the bowl), `harpoonEvery`; the 'hull' and 'ice' burst spawns; the Reefback's tide-dormant 'rock' pose on brute + guard; the charger's `sapDaze` on 'amber' and 'slush'.
    - The 'harpoon' projectile with a rope line and `pl.pull` (projectiles.js); the 'kelpPile' wake pose and mound mesh (models.js).
    - Flesh types 'drowned' and 'skotos' (combat.js:23-25, :372-376); `o.drown` kills.
11. **Two bosses (6-7 d, medium).**
    - TOWER and SKOTOS tables in `boss()` (ai.js:1414); every def.radius pre-scale.
    - The Walking Tower: its forced arena water, the wake, Breach and Beached, the turn onto the ice, a thick-only `stepToward` window in phase 2 (a cell-mask argument to `fillWindow`, map.js:166), the Shell Rush bait and Overturned, the flank interact that follows it, Island and Blinded with the beam on its back, its fail-safes, and the death crawl back to its sleeping skerry (the hero pushed clear before those cells are blocked).
    - The Skotos: anchored and floating; the Hands as nodes; Beneath and the hero-chosen Breach; Selna's Remember beats counted at runtime (`a.remembers`, `G.selnaBack`) with lockPhase and `a.hpFloor` held at 30% until the relight; Wrap the Light, the keepers' walk-on and the relight; the beam with Seared; Smother and the Coil; The Deep Cold's safe circles; the naming cine (which saves `selnaBack` with `skotosDown`) and the title-card overlay.
    - actors.js: `act5Spawn` (the tower on the crab, the bell, the Hands, the Skotos's skin), STAND_IN rows, TINT_IN.
12. **Story (4-5 d).** Quests 24-30 and the end state 31; the hook; the coal and its flag; the arrival; the hearth and the rite; the sea-lights and the memories ('memory-ice'), with the «Θυμήσου» window for an unseen one; the Skerry's waking and death; the Freeze and the forgotten name; the seals, Alkyone going ahead between holes and her fail-safe; Tern; the Skotos; the naming and `answer5`; the lantern room and the carving; home and the child; `beaconScene(5, 'sea')`; the catch-ups; `npcHasNews`; `spawnNpc` for alkyone, selna, tern, tamarisk, glaukos, shorefolk and the child; the four Name-stones; the home lines; game.sub5; about 235 bilingual lines.
13. **Audio (2 d, low).** Five themes, the sea-light motif, the ice-song instrument, the forgetting melody, the master low-pass, about 26 sound effects (see Music).
14. **Assets (6-8 d; see Assets).** The frost set first, gated on its measured texture count (≤ 25): folk.mjs `SETS.frost` with seven recipes and the WEATHER, CRONE, GAUNT, ELDER and CHILD tables. Then tools/pack-rime.mjs (the three towers atlased into one set, the ship without its sails, the lighthouse's graffiti and door painted out); tools/creatures/act5/{crab, skotos, tentacle, icemaw, louse, skua}.mjs, with the Skotos's look gate before any of its build work, and polarbear.mjs only if the tint fails; downloaders for Sketchfab (API v3 with `$SKETCHFAB_API_TOKEN`), Poly Haven and ambientCG, rewritten because the old ones are gone (engine brief §6.3); the provenance gates first. The phone budget is re-itemised from the measured files before the next build step.
15. **Scenarios (3-3.5 d).** In tools/scenario.mjs:

    | scenario | what it covers |
    |---|---|
    | hook5 | the way into the act. (a) From a q22 save: visit the Field (so it is cached before `newFire`), go home and light the beacon, finish q24 in the same session, walk into the Field, assert the plug is open and the Anvil's Neck exit leads to the coast. (b) From an Act IV-end save in the shipped format without `act5`: the migration, the hook (Alkyone, Halda, the coal) and the same walk. |
    | catch5 | for every row of the catch-up table: set the state just after that flag's save, reload, assert the quest, the scene replayed and the memories seen (including a light lit with its memory unseen, and `coastCall` without `coal`) |
    | coast | the arrival, the hearth and the rite, the first sea-light; a re-entry at high water finds the map at low water |
    | tide | a 20-cycle soak with packs: no actor inside a closed cell, the hero never stuck, the wash-out taken along its lane, the hero's position never jumping more than 3.5 m in a frame; `map.ver` bumps and frame time with about 30 actors |
    | ice | a 10-minute soak on the Fall shelf and the Ice Road: breaks, refreezes, plunges (each landing within 3 m or on the ring buffer, with no snap), drownings, a bear baited through; `map.ver` bumps per second (at most 4 from the ice) |
    | tower | the boss through all phases; Beached, Overturned and Blinded each seen; the hero in melee reach and inside the Bell's safe circle; the death crawl and the island at its spot; the time-to-kill target |
    | freeze | quit mid-cine and reload; the bay's frozen change built from the same seed; the coast rebuilt (its mode changed) on the next entry |
    | holes | the three seals, a lamp shielded and a lamp relit, the Icemaw through a breath crack (stage 2 under a lit rim), the Sunken climbing out, the fail-safe taken; a seal-time ceiling per difficulty |
    | skotos | the three Remembers, a breach into a prepared hole beside a cairn, the relight, Smother; its hp never below 30% before the relight; die after the third Remember and retry (the name hidden again, the Remembers replayed, lockPhase released by the count); the time-to-kill target |
    | ending5 | the naming, the title card, the lantern room, home and the child; Selna's name back in the quest text |
    | cast5 | every new model is real or its stand-in, in a cold session that follows the real route (town → Field → coast), and in one that starts at the `coast` waypoint |
    | echo5 | both echoes |
    | perf5 | the gate: quality 1 under mobile emulation (pixel ratio 1.5, MSAA, adaptive resolution pinned at 1.0, the adaptive scale reported) in the Shallows at high water and mid Ice Road, within the Field of Ash + 15%; quality 0 as a floor |
    | shallowtele | a screenshot check that a telegraph, a light pool and the Cradle ring are visible in shallow water, and that walkable and closed water have different tones |

    `window.__act5` in ai.js for what the scenarios read.
16. **Contingency, memory (1-2 d, only if the owner's phone loses its GL context in Act V).** Engine brief §5.4: dispose Acts II-IV zones and set templates on entering an Act V zone. The Act V zones need none of the folk, grove or ash sets that the first trip through the Field loads, so it is a clean cut.

**Total: about 47-58 focused days, asset building, story and music included** (the items above add to 47-58.25; 48.5-59.5 before the stretch items left the base). This is still larger than Act IV, which added no rendering system. On the engine brief's own basis (engine and world work with check-act5 and the scenarios, but no assets, story text or music) it is about 35-43 days against the brief's 30-40 for the full frozen-coast set. The difference is the sea.js look and the two runtime grids, which are the act's identity. Moving the stretch items out does not reach 35-40 days in all; the cut order below is the way further down, and the owner decides how far.

**Ship first** (the review's order): `GridMap.close` and tide.js; ice.js; sea.js's quality-0 paths and the perf5 gate; beams, lamps and the vulnerability rule; then both bosses. The story and both bosses survive every cut below.

**If the act runs late, cut in this order (each with its fallback):**
1. Footprints, G_WET and breath puffs.
2. The Mage's `.m` line.
3. Skua `lightShy` → plain bat-AI flocks.
4. 'singer' → the existing 'caster' with a timed crack ring and a brine pool.
5. 'lurker' → the 'burrow' AI with an under-ice `uShade`.
6. Eclipse (already optional), then the Tower Bell.
7. The Reefback → its spots hold Sunken packs.
8. The aurora dome → stars only in cines.
9. Beam cones → the moving light only.

**Never cut:** the tide steps, the crack texture, the black and the true aurora, Ice Memory 3, the rite, the forgotten name, the naming and the title card, Isarn's carving, the child.

**Out of the base scope from the start (stretch):** the coast's full frozen reading (the Freeze changes only the bay and the sky; −1.5 d); the spring reading with `iceOut`, the floes and the boat (−1 d); the sixth difficulty «Σκότος»; the frozen sea's four Name-stones; two of the four legendaries (Landing Boots, the Harpoon-bow); a floe lane or Floe Run (no floe ever moves); ice tiers in the Shadow Gates; orca and gull ambience; the Rime Troll; and a Brokka and Elati cameo. The Reefback and the Skua stay in the base: cutting them would leave five enemy entries (six kinds), below the owner's "about 7" and Act IV's seven, and they are cheap (the Reefback is the Tower's own file and shares its wake and flounder code with the Sunken and the Rime Bear; the Skua is an already-rigged 4k-face gull on the existing bat AI).

## Blessings
Three for Act V: the lights of the sea. The header is boon.h5 «Τα φώτα της θάλασσας» / "The lights of the sea", after «Η φωτιά από ανθρώπινα χέρια» (Act IV).

**Memory of the Lost.** A hero who lit all four Name-stones (`flags.remembered`), at any time including the post-game, has the Act V blessing worth ×1.25 (stats.js; the `.du` lines show the rounded-down values). Unbound still multiplies only BOONS[4], as shipped. All three use existing stat keys and sit in Act IV's power band (two stats each).
- einar Ο Φάρος του Έιναρ / Einar's Light: { eliteDmg: 15, crit: 5 } (icon 'star'): +15% damage to elites and bosses, +5% critical chance. ×1.25 when remembered: 18 / 6. — Μια φωτιά που κοιτάζει νότια, ως το σπίτι σου. / A fire that looks south, all the way to your home.
- tide Η Παλίρροια / The Turning Tide: { atkSpd: 8, resRegen: 15 } (icon 'roll'): +8% attack speed, +15% resource regeneration. ×1.25: 10 / 18. — Η θάλασσα φεύγει πάντα. Και πάντα γυρίζει. / The sea always leaves. And it always comes back.
- name Το Όνομα / The Name: { lifePct: 12, armorPct: 12 } (icon 'shield'): +12% life, +12% armour. ×1.25: 15 / 15. — Ένα όνομα που λέγεται κάθε βράδυ δεν το παίρνει το σκοτάδι. / A name said every night, the dark cannot take.

## Music
**Five new procedural THEMES in audio.js, one motif and one new instrument,** in the house style: modal harmony, drones, no samples.

**The sea-light motif.** Four notes in a lighthouse's rhythm, long-short-short-long: D, A, G, D′, as [62, 1.5], [69, 0.5], [67, 0.5], [74, 2.5]. All open fifths, so it sounds like a horn across water. It is set apart from the Wayfarers' lantern motif (A, C, B, E: `MOTIF`, audio.js:1634) on purpose, because the two are the two brothers' fires. It sounds:
- when a sea-light is lit, on a soft brass and flute;
- under each freeze wave at the Breathing-holes;
- at the relight, **in counterpoint with the lantern motif**: Arna's motif and Einar's, resolving together to D major.

**The ice song (a new instrument).** Real sea ice "sings" in falling, electronic-sounding sweeps when it cracks in the cold. Here it is a sine whose pitch falls exponentially from about 3 kHz to 400 Hz over 0.25-0.6 s, with a short second ping and a long reverb. It costs almost nothing in WebAudio. It is the Skotos's voice under every one of its `say` lines and the ambient bed of both zones: when the ice sings, it is listening.

**The naming chord.** The title theme's opening chord (D minor), low, sounds twice in the act: under Glaukos's «Σκότος» at the rite, and under the title card at the naming.

**The forgetting.** While Selna is forgotten, the music forgets too. `MOOD.forget` (from the Freeze to `selnaBack`) makes the title theme's MAIN melody appear on a pure sine in the low register with each note having a 30% chance to fall silent. Each Remember in the Skotos fight lowers the chance by 10%; on her name the melody plays whole.

**'coast'.** About 54 bpm, 6/8 (beats 3, sub 2), D Dorian.
- A low bowed drone on D and A, slow bowed strings, and a pad that swells with the tide: the surf is filtered noise in an 8 s wave cycle whose loudness and brightness follow `MOOD.tide`; the tide bell (a low INS.bell on 50 and 57, slightly detuned) rings at each turn.
- The ice song every 6 to 14 s, more often near thin ice (`MOOD.ice`).
- High glassy bells (86-93, very soft) with a raised fourth while the green aurora is up.
- No drums. In a fight, a low taiko on beat one every second bar, with the strings' ostinato on the root.
- When a sea-light is lit, a warm major-sixth chord blooms on the next bar.
- **'coastFrozen'** (after the Freeze): the bells stop and the surf drops to a low hiss; near silence but for ice pings, the wind, and the forgetting melody.
- **After `seaLit`:** D Ionian, the sea-light motif on a flute every 16 bars, gulls. (It was the spring reading's; the coast plays it under the true aurora in the base.)

**'tower'** (the Walking Tower). 6/8 at 112 bpm, D Phrygian, with heavy drums ('boss').
- Low brass in fifths like a ship's horn, and a cracked-bell motif (INS.bell with an inharmonic metal partial) on the downbeat of every fourth bar.
- **Phase 1:** the surf swells with the arena's water; everything goes under a 500 Hz low-pass while it is submerged, with a taiko hit on each Breach.
- **Phase 2:** the drums stop. Ice percussion (metal clicks at high ratios), a low choir on 'u', and the ice song on each crack.
- **Phase 3:** while its light is lit (`MOOD.lit`), the sea-light motif blares on brass over a high choir chord. When the light gutters, back to drums.

**'farlight'.** 48 bpm with no beat, E Aeolian.
- Wind; the ice song often; a low whisper bed; the forgetting melody.
- **Near a Breathing-hole** (`MOOD.skotos` 0-1 by distance), a sub drone at E1 grows while a master low-pass sweeps every other sound toward 500 Hz: "the silence it brings". You hear the dark before you see it.
- **At each seal,** a swell into a warm E major chord and the sea-light motif.
- **After `seaLit`:** the drone is gone. High bells and a slow string line.

**'skotos'** (the Skotos).
- **Phase 1:** 5/4 at 92 bpm, E Phrygian. A low brass ostinato on E and F, a choir on 'u', and the ice song as a shriek on every Hand's attack.
- **Phase 2, the Night:** everything low-passed down to a heartbeat (thump) and a sub drone, a double thump each time the shadow passes under the hero (`MOOD.under`), and the forgetting melody, healing a note at each Remember.
- **Phase 3:** near silence while the tower is dark. At the relight, E major: full choir, strings, the lantern motif and the sea-light motif in counterpoint, and a cymbal swell each time the beam sears it.
- **The naming:** everything stops but one bell, struck once per name. On «Σκότος», the naming chord swells under the title card.

**'sealit'** replaces 'victory' for the end: under `answer5` and again at actComplete(5) in Whitecliff. 60 bpm, D major: the sea-light motif harmonised and slow, answered by the lantern motif. Each light answering adds a bell and a phrase of the town tune, Act IV's 'newfire' idea carried to the sea. On «Κάποιος απάντησε.» a held chord.

**Ambients:**
- 'coast': surf keyed to `MOOD.tide`, distant gulls and skuas, the wind, the tide bell;
- 'coastFrozen': near silence, ice ticks and songs, the beams' bells;
- 'farlight': wind and the ice's ticks and songs;
- 'blizzard': a howl that ducks the music by 30% for its 8 s.

**SFX (26 new):** tideBell, surfSwell, washOut, splash, plunge, iceCreak, iceCrack1, iceCrack2, iceCrack3, iceBreak, refreeze, iceSing, harpoonThrow, harpoonReel, sealBark, sealLunge, skuaCry, louseSkitter, louseCurl, louseRoll, oilCask, beamHum, lightCatch, freezeWave, skotosRise, towerBell. The bear's sound effects are reused.

## Echoes and post-game
**Echo refights,** once a day each, with normal loot and no story consequences:
- **The Walking Tower:** «Θυμήσου τον Σκόπελο» / "Remember Skerry", at its lit island in Skerry Bay, after `seaLit`.
- **The Skotos:** «Πες το όνομά του» / "Say its name", at the ice edge from the skerry, after `seaLit`.
- **Toasts:** echo.rise5 «Ο πάγος θυμάται τη μάχη...» / "The ice remembers the fight..."; echo.done5 «Η ηχώ σβήνει. Ο πάγος θα θυμηθεί ξανά αύριο.» / "The echo fades. The ice will remember again tomorrow."
- **Look:** the Tower in a frost echo tint (`baseTint` 0xbcd8f0 at amount 1.2, rim 0x9ad8ff); the Skotos in black-violet (0x1a1424, rim 0xb090ff). story.js:395 gains a branch for each.
- The echo variants are given under each boss. Level as the story fights: max(zone + 2 | + 3, hero + 1).

**Two Act V legendaries in the base,** the bosses' first-kill drops (data.js `LEGENDARIES`). The shipped `legFrom_<boss>` hook (combat.js:399-400) drops a random legendary (`rar: 3`), not a named one, so it passes `leg: LEG_FROM[a.kind]` (items.js:70 already honours `o.leg`). Their two effects are listed in Engine work (item 8).

| id | name | base | class | what it does | where |
|---|---|---|---|---|---|
| skerryShell | «Καβούκι του Σκόπελου» / "Skerry's Shell" | chest | any | +armour; your plunges and wash-outs cost no life | the Walking Tower's first kill (`LEG_FROM.tower`) |
| einarLantern | «Το Φανάρι του Έιναρ» / "Einar's Lantern" | amulet | any | your hits leave unlit foes Revealed for 2 s | the Skotos's first kill (`LEG_FROM.skotos`) |

**Stretch, out of the base scope:** two random drops. makeItem draws from the global `LEGENDARIES` pool, so "Act V zones" needs a `zones` (or `act`) filter there first, or they would also drop in Act I and the Gates.

| id | name | base | class | what it does | where |
|---|---|---|---|---|---|
| landingBoots | «Μπότες της Σκάλας» / "Landing Boots" | boots | any | your weight on thin ice is 0.3, and wading never slows you | random drop, Act V zones only |
| harpoonBow | «Το Καμακότοξο» / "The Harpoon-bow" | crossbow | ranger | every 4th bolt reels a non-boss foe 3 m toward you (stopping at the first deep cell): into water, onto thin ice, into a beam | random drop, Act V zones only |

The Warden and the Mage already have their ice identity in their skills (Leap and Earthsplitter; Meteor and Frost Nova), and the shipped `winterOrb` pairs with the Mage's Frost Nova.

**What stays to play.**
- **One coast, changed by the story.** Tidal under a green sky before the Freeze; under the black aurora, with the bay frozen and the road north open, after it; under the true aurora after the act. (The full frozen reading and the spring reading are stretch.)
- **Seeds.** Both zones are procedural on the hero's own seeds (`h.seeds`, world.js:72-76): the shoreline, creeks, islets, wrecks, ebb caves, the Name-stones' spots, the road's winding, the leads, the bergs. A new hero (another class) walks a different coast. Keying the seeds by difficulty is an owner's call (see Difficulty).
- **Ebb hoards:** sea-cave and wreck-belly chests that only low water opens.
- **The four Name-stones** on the coast, one of them tide-locked, for the ×1.25 blessing and the full roll of names.
- **Class play on ice:** the Warden breaks, the Mage breaks and builds, the Ranger cracks from range.
- **Difficulty unlocks from any act** (the sixth difficulty is stretch).
- **Both zones stay farmable:** the tide and the ice keep working, and the packs, Icemaws and Rime Bears respawn on each zone build.

**The Shadow Gates** stay the post-game, opened from Isarn's planted staff by the beacon: endless tiers, the Gate Guardian, unchanged. The only addition is Alkyone's line at the Landing: d.alk.gates «Οι πύλες σας δεν έχουν πάτο, λέτε; Έχουν. Είναι κάτω από τον πάγο μας. Μη φοβάσαι. Κρατάμε το φως από πάνω.» / "Your gates have no bottom, you say? They do. It's under our ice. Don't be afraid. We keep the light above it." It is flavour, with no change to how they play.

**After the act, people keep their word:** Selna's nightly rite at the Farthest Light (the names the player lit among them); Glaukos's at the Landing; the child's bark and Elianthe's line in Whitecliff; Brokka's and Elati's home lines; Tamarisk's sapling.

## Risks
- **Continuity fixes applied** (the judges' list and the canon brief):
  - The hero never speaks. Every word the hero "says" is second-person narration in the shipped voice (d.answer.0, d.u.pour): Isarn's name at the naming («Λες το όνομα...»), the Saltborn's name to the child («Του λες το όνομά τους...»), the sapling to Tamarisk («Της λες...»).
  - «Σκότος» is first spoken in the rite at the Landing, by Glaukos, never in Alkyone's first dialog (a8 holds it back). Before the rite the Skotos's floating `say` lines carry no speaker name, so the word first reaches the screen in Glaukos's mouth.
  - Einar's timeline holds: a boy on the night of the Breaking (Ice Memory 2) and a young man when he sees the beacons lit (Ice Memory 3), as Arna is "a young man now" when he lights them (d.lamp.m3.1). Einar is never shown old; he dies before Arna arrives (Ice Memory 4).
  - Tamarisk's sapling stands in the wood beside the cut names (d.tear.nursery.2/3); she asks whether it grows, and the Ranger (in narration) or Elati answers. No sapling grows at the coast. She has no bark, because she left before the rooting.
  - "Watch the gate too" (d.lamp.m4.2) is reread, not rewritten: Arna set the watch and walked on, and Selna's line says he did not know someone already watched the sea.
  - No line claims the Saltborn recognised Whitecliff's flame or that the flames are the same colour.
  - The Field of Three Banners keeps three banners; the Saltborn's role was carrying the wounded, not fighting under a fourth banner.
  - Karthax's name is never said in Act V, and an Evergreen stops it. The Skotos is not his servant, nor his jailer by design.
  - Isarn stays dead, as a name carved and spoken. Ivar the same. Brokka and Elati stay home and alive (d.elati.home.r).
  - The world.js:48 comment about the Dark Beacon is fixed, and the Dark Beacon stays cold.
  - Timeline words stay «χίλια χρόνια», «εκατό χειμώνες», «πολλοί χειμώνες».
  - Every φρυκτωρία is still the brow-stone's fire; the sea-lights are φάροι, a word never used before.
  - Proofread all ~235 new lines against text.js for the house voice: short, plain, poetic; Greek first; no contractions for Selna or the Skotos; the Skotos lowercase and without "I" until its last line.
- **The forgotten name may read as a bug.** The «…» is shown frost-tinted in the quest text, the toast q.forgot says outright that the player remembers, the quest marker keeps pointing the way, and `ending5` asserts the name returns. It is derived on load, never saved.
- **Phone fill rate** (the biggest technical risk). Water, ice, beams and particles cover large parts of the screen.
  - The ice is opaque and drawn first, so the ground under it is rejected by the early depth test.
  - The water is opaque except a narrow band at the waterline, and writes no depth.
  - Beam cones draw only within 45 m, and none at quality 0.
  - Every shader has a quality-0 path, built first, row by row in The look.
  - Adaptive resolution is unchanged; there is one 256² noise texture.
  - `perf5` is a gate before the bosses, measured at quality 1 (the phones' default: pixel ratio 1.5, MSAA) against the Field of Ash, with quality 0 as a floor.
- **Decals under water.** Telegraphs (y 0.06), light pools, the Cradle ring and blob shadows would vanish under a depth-writing water surface. The water writes no depth and draws before them, and `shallowtele` checks it with a screenshot.
- **Decals on thin ice.** The ground under thin ice sits at −2 so holes show water, and `groundY` returns the ice surface on ice cells, so `drape()` lays pools, the ring and cones on the ice.
- **The Skotos's skin.** The shared environment map and `prepare()`'s overrides would leave a glossy boss flat; the skin patch and `extras.keepMat` handle it (The look, row 15).
- **Memory.**
  - The act's phone texture total is about 93-100 MB, under the 110 MB budget, provided the frost set passes its gate of 25 measured textures; a full run stays near 660 MB. The earlier figure (95-99 MB) costed the frost set at "one grade per faction" and the towers and the ship as one texture set each; measured on the shipped sets that would have been about 125-135 MB.
  - Brokka and Elati are not in Act V's zones, so the frost set holds seven scenes. The Act V zones load no folk, grove or ash set of their own, but the first trip to the coast crosses the Field, which does; `cast5` follows that route.
  - The bear costs 9.1 MB on a cold start into Act V and is counted.
  - **Contingency** (engine brief §5.4, 1-2 d): unload Acts II-IV's packs and sets on entering an Act V zone. It ships only if the owner's phone loses its GL context in Act V; the trigger is the existing context-loss reload.
- **The tide trapping or teleporting the hero.** A cell under her, or on her way out, never closes without 6 s of grace (a BFS lane to the nearest cell that stays open closes last), and then she is pushed along that lane, not teleported; the tide soak asserts she never jumps more than 3.5 m in a frame. check-act5 checks reach at both extremes and fails any dry-at-high pocket cut off from the camp. Interactables stand on dry or thick cells. Steps come no faster than one every 4.5 s (one a second inside the Tower's arena, for 6 s). The tide soak runs 20 cycles with packs.
- **Ice griefing the player.** The thick spines and rims are continuous (hard checks), so a safe path always exists. Breaks refreeze in 20 s, 6 s in lamp light, at once under a beam or a Frost Nova. A plunge never kills and never takes her under 10%. Bosses cannot break thick ice.
- **Readability.** Systems are split by place and taught in order. Thin ice is dark and thick ice white. The Cold has a meter and a frost vignette, the tide a dial and a bell, each beam a sweep you can see. At most two big telegraphs at once, the environment counting as one. Every warm pool has a strong ring. Everything is tested at `R.quality` 0.
- **Damage windows stacking.** One vulnerability at a time, bosses capped at ×1.6 outside a scripted window, and time-to-kill targets asserted by the boss scenarios.
- **Numbness in water.** The Cold builds +4/s while wading (25 s from 0 to Frostbite), drains on its own on dry ground, and in boss fights Frostbite is a slow that waits for any red telegraph under her to clear. Nothing roots the hero every few seconds in the Tower's flood: wading, brine and slush set `inWater`, never the amber-sap branch whose 1.5 s stick roots her (player.js:62-63).
- **Asset provenance** (each gated before download, results saved beside the source in /tmp/claude-0/sf):

  | asset | check | fallback |
  |---|---|---|
  | Crab mountain | reverse-image search and storefront check (Fab, CGTrader, Unity Asset Store): the author's other uploads are non-downloadable fan art (Fallout 4, Indominus Rex) | Mohamed's Giant Crab (6295676291c141728457ef7550b0650a), then spider.glb ×3.2 |
  | Ocean Creature | download the GLB (44 MB), not the glTF (215 MB); confirm the IK/FK rig exports as plain skinned bones; **look gate:** as uploaded it is an upright octopus with a modelled eye (tags octopus, kraken), so mask the eye into the void colour and check the waist-deep silhouette at gameplay pitch in the creature viewer | a humanoid or hooded source from a new scout pass; the Lurker (28b3e1a216904de7ad212368fb9d8f59, 6 real clips) only behind the same look gate, since it is a squid too |
  | Isopod scan | 583k → 2.5k may lose legs | keep 4k, or the .hapto Woodlouse |
  | Leopard Seal | needs a code rig (an elongated body) | fedalina's Seal, then the warg stand-in |
  | Tentacle | procedural Blender textures cannot be exported | a code material |
  | Kelp scan | its description says cc0 but its licence field says CC-BY | credit it as CC-BY 4.0 |
  | Old Lighthouse | its 19th-century iron lantern room; spray-painted hearts and a modern door on the shaft's texture (tags 'vandalized', 'spooky'), which survive cutting off the lantern room | the lantern room cut off and replaced in code; the graffiti and the door painted out of the base map in pack-rime.mjs, and the door replaced in code by the door-stone with the cut names |
  | Dalarö wreck | museum logos appear only on its thumbnail | none needed |
  | Gislinge boat | the striped-sail cliché of other longships | no sail is used |
  | Viking (rejected) | its face texture credits a stock photo of unknown licence | not used; the Harpooner is a people recipe |
  | Glass octopus (rejected) | a bulk uploader whose recent work includes commercial-IP fan art | not used |

  Every download: re-read the licence on the download page and save it beside the source, as in earlier acts. Every STAND_IN list ends in a boot-loaded or code-built model (troll, spider, warg, spiderling, people.glb scenes, heartroot), and `cast5` runs in cold sessions that follow the real route (town → Field → coast) and that start at the `coast` waypoint.
- **The bear reading as a recolour.** It must pass the side-by-side check against the Amberback in the creature viewer before it is committed; polarbear.mjs is the fallback.
- **IP hygiene.**

  | avoid | because of | here instead |
  |---|---|---|
  | "Drowned" for the humanoid family; a trident | a famous block game's water zombie | «Θαλασσόπνικτος» / "Sunken"; a boat-hook and a harpoon on a rope |
  | the Long Night, a Wall, White Walkers with blue eyes, "Winter is coming" | George R. R. Martin | the Sunken are wet and green-grey with no glowing eyes; the Anvil Gate was a watch, not a wall of ice |
  | the Helcaraxë, "grinding ice"; Forochel, the Lossoth | Tolkien | an Ice Road over sea ice; sea-light keepers in stilt huts and oilskins, not snow-dwellers |
  | the Watcher in the Water; Ungoliant | Tolkien | the Skotos's arms are «Χέρια» / "Hands"; it forgets rather than devours; it is a faceless figure of water whose robe is its own arms, and its model must pass a look gate (the eye masked, never read as a squid) |
  | the First Flame, linking the fire, the Age of Dark, the Abyss, Kindling | Dark Souls | the Skotos's one argument is the game's own intro.4, «σβήνουν, η μία μετά την άλλη»; the vocabulary stays plain Greek: φάρος, φως, φωτιά, όνομα |
  | Old Ones, Deep Ones, R'lyeh | Lovecraft | no cult, no fish-men, no sunken city |
  | the White Frost; the Sea of Ghosts; Frostmourne; Prime Evil | The Witcher; Skyrim; Warcraft; Diablo | no such names |
  | "the Abyss" | the repository's other game, Abyssos | never used |
  | "Frozen X" enemy names | the elite affix «Παγωμένος» | no enemy is named so |
  | "Keeper", "Warden" as a people's name | the collisions in canon §5.10 | «Αλιγενείς» / "the Saltborn" (they *keep* lights, as a verb) |
  | "Lethe" or "Oblivion" as proper names | an Elder Scrolls title | «λήθη» only as a common noun; English "forgetting" |
  | ice queens; mermaids (the Γοργόνα of folklore) | *Frozen*; tone | Selna is an old keeper in oilskins |

  "Saltborn" is a common compound; the only near use found is fan commentary on the game *Salt and Sanctuary*. The Greek «Αλιγενείς» (an ancient word for "sea-born") is the primary name. If the owner wants zero risk in English, "the Sea-born" is the fallback.
- **Scope.** About 47-58 days in all (35-43 on the engine brief's engine-only basis, against its 30-40): three systems (tide, ice, Cold with beams), two new AIs, six traits and two bosses. It is larger than Act IV, which added no rendering system. The coast's full frozen and spring readings, the sixth difficulty, four Name-stones and two legendaries are out of the base from the start; the ship-first list and the cut order are under Engine work; floe drift, swimming, an under-ice zone and Blender-dependent steps are designed out.
- **build.js under concurrent edit.** All Act V visuals live in sea.js and build5.js. build.js gains only `buildLevel` hooks and the groundMat defines, which land after any other agent's work there.
- **Saves and state.**
  - Every flag is derived on load and saved before its scene plays, except `selnaBack` (saved with `skotosDown`).
  - Test quitting during the hook's cine, between `coastCall` and the coal, the arrival, the rite, between a light's flag and its memory, the Freeze, mid-seal, mid-Tower with the arena water forced (on reload the zone clock resumes at low water), at each Remember and after the third, and during the naming. `hook5` and `catch5` cover them.
  - `selnaBack` is saved only with `skotosDown`; during the fight the name's return is runtime (`G.selnaBack`).
  - Old saves without the flags read as quest 23 with `newFire`. A hero has one set of flags on every difficulty; keyed seeds change only the layout.
- **Tone.** The Skotos, the drowned and a woman forgotten by her own daughter are dark. The ending stays warm: a child who kept one light; two brothers whose fires meet after a thousand years; a name remembered; the lights answering down the coast; a name told to a child; green light over Whitecliff. Every cine is short and skippable, and the Freeze cine is under 15 s.
- **Optional, not in the base: a Brokka and Elati cameo** in the Skotos's phase 3, carrying Deepstone's and the beacon-tree's fires onto the ice with the keepers. It needs both rebuilt into the frost set (two more scenes and their textures against the 25-texture gate, and the grove recipe's bark source again), so it waits for the owner and for budget.
- **CREDITS.txt additions** (CC-BY 4.0): pro100voron; bast_yy; CG Daniel Glebinski; Grace Belt (neatGrace); Dayvable; the Swedish National Maritime and Transport History Museums; Opus Poly; TooManyDemons; megamaniac; JB3D (taz83); Nirved Kamble; wolfgar74; guillaume.biju-duval; Ingenium Canada; Thomas Flynn; EFX (evan4129); Crew Froebel; sterlingcrispin; Elin Hohler; Dominic Baker. Fallbacks, only if used: Mohamed (mohamedbenarous); HighPolyDensity (Lurker, already credited); .hapto GmbH; fedalina. CC0, credited all the same: ffish.asia / floraZia.com, Poly Haven and its authors, ambientCG. WildMesh 3D and Quaternius are already credited.

## Assets
Every third-party asset Act V uses, with its uid or id, author, licence, what it becomes and its budget. All were checked by the scout (assets.json verdict 'ok', downloadable, CC0 or CC-BY 4.0), and the second judge re-queried every cited Sketchfab uid through the API (CC0 or CC-BY 4.0, `isDownloadable` true, download endpoint 200, face and clip counts as stated). "Phone MB" uses the engine brief's rule: RGBA8 × 1.33 for mips, maps of 1024 px or more halved on phones (a 1024 or 512 map ≈ 1.4 MB, a 256 map ≈ 0.35 MB).

### Creatures (group `act5`, tools/creatures/act5/*.mjs, `ACT_FILES.act5`)
| role | asset | uid | author | licence | faces → game | maps | phone MB |
|---|---|---|---|---|---|---|---|
| Walking Tower (boss) and the Reefback | Crab mountain (crab.glb) | ac8fa79586f84c84a8a55dd86b7a2e2f | pro100voron | CC-BY 4.0 | 41,993 → 12k | 1024 d, 512 n, 512 orm | 4.2 |
| the Skotos (boss) | Ocean Creature | 5c17cca6086e4910aa12e7d701ccd6a1 | bast_yy (bast_y) | CC-BY 4.0 | 58,912 → 15k | 1024 d, 512 n, 512 orm | 4.2 |
| Hands of the Skotos, the Coil | Tentacle (rigged) | 8fcc783af94246a0b8febf424a4b96b9 | CG Daniel Glebinski | CC-BY 4.0 | 9,715 → 3k | none (code material) | 0 |
| Icemaw | Leopard Seal | 3f4a2090598b4741ac38e0d255ece191 | Grace Belt (neatGrace) | CC-BY 4.0 | 179,928 → 6k | 1024 d, 512 n | 2.8 |
| Hull-louse | CC0 Giant Isopod, B. doederleinii | 3979c291d1f9454c90851efe291eab60 | ffish.asia / floraZia.com | CC0 1.0 | 582,561 → 2.5k | 512 d, 256 n | 1.8 |
| Skua | Seagull | dc42ffc81c86480e9e7f7752fa134174 | Dayvable | CC-BY 4.0 | 4,352 → 2.5k | 512 d | 1.4 |
| Rime Bear | Realistic Animated Bear (shipped bear.glb) | bffc3c87d2d148ff8533e1cc8a11c9f1 | WildMesh 3D | CC-BY 4.0 | 7,508 (as shipped, 11 clips) | as shipped | 9.1 on a cold start; 0 if Act III loaded it this session |
| *fallback* Walking Tower | Giant Crab | 6295676291c141728457ef7550b0650a | Mohamed (mohamedbenarous) | CC-BY 4.0 | 28,256 → 8k | 1024 d | 1.4 |
| *fallback* the Skotos | Lurker - Rigged and Animated | 28b3e1a216904de7ad212368fb9d8f59 | HighPolyDensity | CC-BY 4.0 | 8,524 | 1024 d, 512 n | 2.8 |
| *fallback* Hull-louse | Woodlouse | fae04aa296f844c18675f6ae50aefe77 | .hapto GmbH | CC-BY 4.0 | 229,440 → 4k | 512 d | 1.4 |
| *fallback* Icemaw | Seal/Baikal/Непра | fb79ae1e6021481f819f34ebc2dcaecd | fedalina | CC-BY 4.0 | rigged, 1 clip | 512 d | 1.4 |

**Totals:** about 2.1 MB raw; **23.5 MB phone** with the bear on a cold start (14.4 MB without it).

### People (set `frost`, folk.mjs --set=frost; Quaternius Universal Base Characters and Modular Outfits, CC0, already shipped in people.glb and moves.bin; no download)
| recipe | source scene | table | maps | role |
|---|---|---|---|---|
| sunken | villager0 | GAUNT | 256 | enemy; the Harpooner is this scene with code parts at runtime scale ×1.06 |
| icesinger | healer | CRONE | 256 | enemy |
| alkyone | healer | WEATHER | 512 | npc (quest-giver) |
| selna | smith | ELDER + runtime stoop | 512 | npc; the woman of Ice Memory 1 |
| tern | villager0 | CHILD (isarnBoy's) | 512 | npc; the boy Einar (memory); the Whitecliff child |
| tamarisk | ranger | ELF (Elati's), villager2 hair | 512 | npc (healer, vendor) |
| glaukos | wayfarer | ELDER | 512 | npc (vendor); old Arna (memory) |
| (shorefolk) | people.glb villager1, villager2 | none: runtime tints and code parts | as shipped | npc ×3; the keeper of Ice Memory 4; no scene |

**Seven scenes. Built first and gated on a measured count of 25 textures or fewer.** "One grade per faction" does not share textures: a grade applied to different source scenes still makes separate textures, and the shipped sets measure 5 to 7 a scene (ash.glb 55 textures for 11 scenes, grove.glb 47 for 7, folk.glb 27 for 5), so nine scenes would have landed near 40-50 textures (about 46-58 MB), not 22-25. The levers, in order: the Harpooner folded into the Sunken's scene; the shorefolk as runtime tints of shipped villagers; 256 px maps for the two enemy recipes; then, if the measured count is still over 25, 256 px for secondary materials (hair, eyes, small outfit parts) and Tamarisk as a runtime variant of the shipped 'ranger'. Under 160k triangles; about 2.0 MB raw; **about 22 MB phone at 25 textures with the enemy maps at 256 px, 29 MB if all were 512** (Act IV's ash.glb measured about 1.16 MB of phone memory per 512 texture, 0.29 MB per 256). The young Einar is a boot-loaded people.glb villager in the memory material, never a player class's body; the frozen figures reuse these scenes. Alkyone and Elianthe (both 'healer') must be checked side by side in the people viewer before the set is frozen.

### Props (pack `rime`, tools/pack-rime.mjs; ≤ 70k triangles)
| prop | asset | uid / id | author | licence | faces → game | maps | phone MB |
|---|---|---|---|---|---|---|---|
| hero wreck | The Dalarö wreck / Bodekull part 2 | 027900c8fdf840f589cadb9f4a60d78c | Swedish National Maritime and Transport History Museums (maritima) | CC-BY 4.0 | 860,412 → 12k, seabed plane cut | 1024 d, 512 n | 2.8 |
| keel-boats | Gislinge Viking Boat (no sail) | 01098ad7973647a9b558f41d2ebc5193 | Opus Poly | CC-BY 4.0 | 29,035 → 4k | 512 d, 512 n | 2.8 |
| rowboat | Old Rowboat | 9922d5678af84adeb1c9b479856446ca | TooManyDemons | CC-BY 4.0 | 5,484 → 2k | 512 d | 1.4 |
| broken boat | Broken Row Boat | 41c2bcc5ca544897a132be71f3b2673a | megamaniac | CC-BY 4.0 | 1,553 | 256 d | 0.35 |
| towerA/B/C (the sea-lights, the Skerry Light) | Pack of old towers in ruins | f213359c6cbb4c29bf8880764faa0fb8 | JB3D (taz83) | CC-BY 4.0 | 73,472 → 3 × 3k | 1024 d, 512 n: the source has three meshes with three materials, a 2k texture each, so pack-rime.mjs atlases them into one set (the Ember Tick atlas precedent); if the atlas loses too much detail, one tower ships with code variants | 2.8 |
| the Farthest Light | Old Lighthouse (shaft only; graffiti and door painted out) | 19e1ff049db74dc8b6173976417c1048 | Nirved Kamble | CC-BY 4.0 | 79,969 → 5k | 512 d, 512 n | 2.8 |
| anchor | Medieval Anchor (Free) | 5896ac54d63e4b84bd32e0b232619dfd | wolfgar74 | CC-BY 4.0 | 2,356 → 1.5k | 256 d | 0.35 |
| sunken anchor | Sunken Anchor | e654cb6e6e2c4217a7decb6bb9c0010d | guillaume.biju-duval | CC-BY 4.0 | 3,362 → 1.5k | 256 d | 0.35 |
| whale | Skeleton - North Atlantic Right Whale | 5c8664c56f9a4cf3ae6d9b8ec33b8dba | Ingenium Canada (technoscience3d) | CC-BY 4.0 | 722,548 → 6k | 512 d | 1.4 |
| Name-stones | Monumental Runic Stone - Optimised, 20k | d95a850cd9114828a18b5dd72878d9ec | Thomas Flynn (nebulousflynn) | CC-BY 4.0 | 19,998 → 2.5k | 512 d, 512 n | 2.8 |
| barnacle rocks | Beach Rock with Barnacles Photoscan | 21c9848ca38b4d289e2f38a98a905f86 | EFX (evan4129) | CC-BY 4.0 | 16,350 → 1.2k | 512 d | 1.4 |
| driftwood | Large Pine Driftwood (Pacific Northwest) | 95d1087e513e4fb992a27b7b8a05ca9e | Crew Froebel (crufro) | CC-BY 4.0 | 320,171 → 2k | 512 d | 1.4 |
| kelp heaps (wrack, kelp mounds) | Scan of Kelp and Seaweed on sand beach | c9b5ef07047a4b7a90a4ffd6930ec22c | sterlingcrispin | CC-BY 4.0 (credited as such despite "cc0" in its description) | 241,581 → 1.5k | 512 d | 1.4 |
| icicles | Icicle 01 | 2dc75ae22f1c4d11abbfd32819312a12 | Elin Hohler (ElinHohler) | CC-BY 4.0 | 778 | none (ice material) | 0 |
| shack | Wooden Shack | b0bc474f7803488dbe0fa5aeef2e9ace | Dominic Baker (Domuk) | CC-BY 4.0 | 19,235 → 4k | 512 d, 512 n | 2.8 |
| the Icebound Ship | Dutch Ship Medium, without its sails (a ship frozen in for the winter has them stowed) | dutch_ship_medium (Poly Haven) | James Ray Cock, Rico Cilliers, Nicolò Zubbini | CC0 1.0 | 69,162 → 6k | three texture sets in the source (hull, rigging, sails): hull 1024 d + 512 n, rigging 512 d; sails dropped | 4.2 |
| whale-oil casks | Wooden Barrels 01 | wooden_barrels_01 (Poly Haven) | James Ray Cock | CC0 1.0 | 33,142 → 1.2k | 256 d | 0.35 |
| crates | Wooden Crate 02 | wooden_crate_02 (Poly Haven) | James Ray Cock, Jurita Burger | CC0 1.0 | 5,176 → 0.6k | 256 d | 0.35 |
| sea-lanterns | Vintage Oil Lamp | vintage_oil_lamp (Poly Haven) | Monsta3D | CC0 1.0 | 7,208 → 0.8k | 256 d (glass → GLOW) | 0.35 |
| cliffs | Coastal Cliff 01; Rock Face 01 | coastal_cliff_01, rock_face_01 (Poly Haven) | Rob Tuytel, Rico Cilliers; Dario Barresi | CC0 1.0 | 865,917 → 4k; 20,174 → 2k | none (`seaCliff` layer, world-projected) | 0 |
| bergs, ice blocks, sea stacks | shipped env.glb boulder, rockA-C | (shipped, Poly Haven) | Poly Haven authors as credited | CC0 1.0 | as shipped | none (ice or `seaCliff` material) | 0 |
| drowned lanterns | Wooden Lantern 01 (shipped in env) | wooden_lantern_01 | James Ray Cock | CC0 1.0 | as shipped | as shipped | 0 |

**Totals:** about 70k triangles; about 2.4 MB raw; **30.1 MB phone** (the ship's rigging set adds 1.4 MB; the towers stay at one set only once atlased).

**Made in code** (no third-party asset): the iron fire-cages and lantern rooms, the beam cones, the bells, the hearth, the cairns and hole lamps, marker poles; stilt huts and the jetty (from the `planks` layer); stockfish racks; the frozen waterfall's ribbons; floe shards; the boat-hook and the harpoon; kelp strands, barnacles, hoods, caps and collars; the Ember Cradle (shipped).

### Ground layers (pack `rime`, d 1024 / n 512)
| layer | source id | author | licence |
|---|---|---|---|
| snow | snow_02 (Poly Haven) | Rob Tuytel | CC0 1.0 |
| snowTrod | snow_03 (Poly Haven) | Rob Tuytel | CC0 1.0 |
| shore | low_tide_rocks (Poly Haven) | Dimitrios Savva | CC0 1.0 |
| seaCliff | seaside_rock (Poly Haven) | Dimitrios Savva | CC0 1.0 |
| ice | Ice002 (ambientCG) | ambientCG (Lennart Demes) | CC0 1.0 |
| planks | wood_planks_grey (Poly Haven) | Rob Tuytel | CC0 1.0 |

**Totals:** about 1.5 MB raw; **16.8 MB phone** (each layer ≈ 1.4 + 1.4). Plus code textures: the 256² noise (0.35 MB) and the R8 crack map (24 KB).

### Totals for the act
| | raw | phone GPU |
|---|---|---|
| creatures (bear on a cold start) | 2.1 MB | 23.5 MB |
| people (7 scenes, ≤ 25 measured textures) | 2.0 MB | 22-29 MB |
| props | 2.4 MB | 30.1 MB |
| layers | 1.5 MB | 16.8 MB |
| code textures | | 0.4 MB |
| **total** | **8.0 MB (≈ 10.5 MiB of artifact)** | **about 93-100 MB** |

The budget is ≤ 9 MB raw and ≤ 110 MB phone GPU. These are estimates: the frost set and the rime pack are built first, and the totals are re-itemised from the measured files before the creatures are built. If the frost set cannot get under 25 textures, the overage comes off the 110 MB margin (about 10-17 MB left) and the levers above continue. The largest single file is the frost people set, at about 2.7 MiB once encoded: far under 16 MB.

## Asset audit
- sunken / harpooner / icesinger None ok=True lic=CC0 faces=None anims=None: People re-proportions of shipped people.glb scenes (two scenes: the Harpooner is the Sunken's scene with code parts; neither uses 'warden', a player class's body), every clip already in moves.bin, 256 px maps. The cloaks, hoods and veils are code (veilParts/veil), because grade() cannot add geometry. The 'drowned' roughness is a material parameter at load, not a texture. | REPLACEMENT:
- hullLouse 3979c291d1f9454c90851efe291eab60 ok=True lic=CC0 1.0 faces=582561 anims=0: A CC0 natural-history scan; clean. Risk: the legs through a 583k → 2.5k decimation; check in the viewer and keep 4k if needed. | REPLACEMENT: .hapto 'Woodlouse' fae04aa296f844c18675f6ae50aefe77 (CC-BY 4.0), then the spiderling stand-in.
- icemaw 3f4a2090598b4741ac38e0d255ece191 ok=True lic=CC Attribution 4.0 faces=179928 anims=0: An original sculpt (Substance tags), no duplicate upload. Needs a code rig; precedent in the deepworm, treeman, Ember Tick and Smoke-eater. | REPLACEMENT: fedalina's Seal fb79ae1e6021481f819f34ebc2dcaecd (CC-BY 4.0, rigged), then the warg stand-in.
- reefback ac8fa79586f84c84a8a55dd86b7a2e2f ok=gated lic=CC Attribution 4.0 faces=41993 anims=1: The Walking Tower's own file at ×1.5; see tower. | REPLACEMENT: as tower.
- rimeBear bffc3c87d2d148ff8533e1cc8a11c9f1 ok=True lic=CC Attribution 4.0 faces=7508 anims=11: Shipped and credited. ACT_FILES.act5 must list 'bear' (Act IV does not load it). Must pass the side-by-side read against the Amberback. | REPLACEMENT: polarbear.mjs (texture regrade, +0.47 MB raw).
- skua dc42ffc81c86480e9e7f7752fa134174 ok=True lic=CC Attribution 4.0 faces=4352 anims=1: Made for a flock simulation, tagged noai. | REPLACEMENT: caveBat, then spiderling.
- tower ac8fa79586f84c84a8a55dd86b7a2e2f ok=gated lic=CC Attribution 4.0 faces=41993 anims=1: The licence and download check pass. **Provenance flag:** it is pro100voron's only downloadable CC-BY model, and the rest of the portfolio is non-downloadable fan art (a Fallout 4 Deathclaw and Lone Wanderer, Nuka-cola, Indominus Rex). The author says it follows his own concept; no duplicate upload was found. Reverse-image search and storefront check (Fab, CGTrader, Unity Asset Store) before download, results saved beside the source. | REPLACEMENT: Mohamed's 'Giant Crab' 6295676291c141728457ef7550b0650a (the author's only upload, with an ArtStation link to the same work), then spider.glb ×3.2.
- skotos 5c17cca6086e4910aa12e7d701ccd6a1 ok=gated lic=CC Attribution 4.0 faces=58912 anims=1: From the author's own short animation, with case studies; clean. **Technical gate:** the IK/FK rig must export as plain skinned bones; download the 44 MB GLB, not the 215 MB glTF. **Look gate:** the thumbnail and its tags (octopus, kraken, fish) show an upright octopus with a modelled eye on its mantle; with the eye masked into the void colour it must read, waist-deep at gameplay pitch, as a hooded figure whose robe is its own arms, or it is replaced before any build work. | REPLACEMENT: a humanoid or hooded source from a new scout pass; the Lurker 28b3e1a216904de7ad212368fb9d8f59 (HighPolyDensity, 6 clips, already credited) only behind the same look gate; then the troll stand-in.
- skotosHand 8fcc783af94246a0b8febf424a4b96b9 ok=True lic=CC Attribution 4.0 faces=9715 anims=1: The tentacle prop from the author's own short film. Its textures are Blender nodes: a code material replaces them, so no Blender bake is needed. | REPLACEMENT: heartroot (code-built).
- alkyone / selna / tern / tamarisk / glaukos / shorefolk None ok=True lic=CC0 faces=None anims=None: People re-proportions; seven scenes in the set with the enemies (the shorefolk are runtime tints of shipped villagers), gated on 25 measured textures. Tamarisk has no bark, so the Act III bark source is not needed. Alkyone against Elianthe is a viewer check. | REPLACEMENT: the boot-loaded people.glb scenes (healer, smith, villager0 at 0.62, ranger, wayfarer, villager1).
- Props: every Sketchfab uid in the props table is CC-BY 4.0 and downloadable (re-queried by the second judge), and every Poly Haven and ambientCG id resolves through its API (dutch_ship_medium, coastal_cliff_01, rock_face_01, snow_02, snow_03, low_tide_rocks, seaside_rock, wood_planks_grey, Ice002, wooden_barrels_01, wooden_crate_02, vintage_oil_lamp). Flags: the kelp scan is credited CC-BY 4.0 despite "cc0" in its description; the Old Lighthouse's 19th-century lantern room is cut off, and the spray-painted hearts and modern door on its shaft are painted out; the towers pack is three 2k texture sets (atlased into one); dutch_ship_medium is three sets (hull, rigging, sails; the sails are dropped); the Dalarö wreck's museum logos are on the thumbnail only. | REPLACEMENT:
- **Rejected for Act V:** 'Viking - rigged for animation' (79321179bafb4d558f0cd6a4a014ba9a): its face texture credits a stock photo (Photodjo), not clean enough for the Play Store, and its rig is not Mixamo-named. 'Glass octopus' (0238634d283a4cff9a0029eaf74dfe58): its uploader is a bulk uploader whose recent work includes commercial-IP fan art. The Protofactor giant-crab re-uploads; the igor-lir bulk animals; the Purple.Point models (unverified AI origin); the contradictory-licence polar bears; the Little Nightmares gull rip; the Fishman (a Bloodborne lookalike); every named IP rip (Night King, Velkhana, Skyrim frost dragons).

## Synthesis: base, grafts and fixes
**The base.** The judges disagree: the first (story and gameplay ×2) put mechanics first at 65, story 63, spectacle 62.5; the second (feasibility and assets ×2) put spectacle first at 63, story 55, mechanics 50. By combined total spectacle leads with 125.5, ahead of story (118) and mechanics (115), so the spectacle design is the base: its zones, render plan, asset list, phone budget, beams and Cold. The story and the gameplay depth the first judge rewarded come in through the grafts below, which is why this design's twist, villain mechanism, bosses and enemy verbs differ from the base.

**Grafts, and where each landed.**

| graft (judge) | where | adapted how |
|---|---|---|
| The rite at Saltwick, «Σκότος» first spoken, «για να μην κρυφτεί», «Ό,τι έχει όνομα δεν κρύβεται», the low chord (1) | beats q25, the rite at the Landing | spoken by Glaukos; Alkyone's first dialog holds the word back |
| The Skotos lives on forgetting; Karthax's wish made every beacon a fire of remembering; fused with «Για να μην ξεχαστεί ένας τύραννος, ξεχάστηκε ένας λαός» (1) | villain; twist blow 2 (d.alk.t1-t6) | plus "a fire that remembers one name forgets all the others" to explain why the Saltborn were forgotten |
| The naming at the sinking, Isarn's name in narration, «Κι εσένα σε ξέρουμε. Σκότος.», its first "I", the ΣΚΟΤΟΣ card, game.sub «Το σκοτάδι έχει όνομα» (1, 2) | ending; Bosses (skotos); The look row 17; world-state | the old names are the First, Einar and Arna, then the Name-stones lit |
| The carving of Ivar and Isarn; «Όλοι έρχονται βόρεια...»; the nightly rite of read names; «Δεν σας προσέχαμε...»; «Τώρα ξεκουράσου... Απόψε η βάρδια είναι δική μου.» (1) | ending, the lantern room; Echoes and post-game | carved under Einar's and Arna's names on the Farthest Light's door-stone; said by Selna |
| The forgotten keeper, «…» in the quest text, three «Θυμήσου τη» in the Skotos's phase 2, no skill lockout (1) | beats (the Freeze, q28-29); Bosses (skotos phase 2) | the keeper is Selna, Alkyone's mother, who lit the fourth fire; forgotten at the Freeze |
| The Reefback and the Icehunter's Frost Nova trap (1) | Enemies (reefback, icemaw) | the Reefback is the Tower's crab at ×1.5; the Frost Nova trap and the Stranded rule are on the Icemaw |
| Echo prompt «Πες το όνομά του» (1) | Echoes | |
| Brokka and Elati home lines with no model load (1) | beats, Lines at home | Elati's v2 answers Tamarisk's sapling for non-Rangers |
| The Mage's Order of the Flame line, `.m` in `rl()` (1) | beats q24 (d.alk.a5.m); Engine work 1 | |
| The Ranger-recognition line to the Evergreen keeper (1) | Tamarisk, d.tam.1.r | |
| Sixth difficulty text «Εδώ ξεχνιούνται και οι ήρωες.» (1) | Difficulty | optional, owner's call |
| The aurora along the reflected view ray; dome only in cines; `uAurDark`/`uAurFront`; black at the Freeze, back south to north at the end (1) | The look rows 2-3; world-state | the coast is green until the Freeze, answering the "black for most of the act" critique |
| The black-ice shader, `uShade`, `uGlow`, the R8 crack texture, 32 floe shards, `uFreeze` (1) | The look rows 5-7 | plus `uFreezeAll` for the Freeze |
| Beam cones within 45 m and not at quality 0; G_GLINT, G_WET; breath, footprints, sea smoke; the frost vignette (1) | The look rows 8-14 | |
| The itemised budget and quality-0 fallbacks; sea.js and build5.js; perf5 at the two worst spots (1) | The look; Assets; Engine work | perf5 is a gate before the bosses |
| The fourth fire gutters during the q24 talk; «Απαντάμε μόνο σε φωτιές που μπορούν να σβήσουν»; intro.4 as a law answered by «Κι ανάβουν ξανά» (1) | beats q24; villain; ending | |
| Skua flocks (gull, bat AI, lightShy); the Rime Bear by runtime tint first (1) | Enemies | |
| The Field cleft plugged with rubble until `newFire`, parity check over check-act4's seeds (1) | Zones, the corridor | |
| Optional Brokka and Elati finale (1) | Risks (optional) | not in the base: the frost set's texture gate does not allow it |
| Title card and subtitle switch (2) | as above | |
| The Hermit's thin-ice bait in the Walking Tower's phase 2, Overturned 5 s ×2, refreeze on a timer (2) | Bosses (tower phase 2) | the Shell Rush across stage-2 ice |
| The Mage's Frost Nova refreezes broken ice in r 5.5; class roles through `crackAt` (2) | Mechanics (ice): class play | |
| The tide clock starts at low slack; the dry-at-high pocket hard failure; tide and ice soaks (2) | Mechanics (tide); coast reach checks; scenarios | |
| `L.bed` in metres, quantised 0.15, shallow below 0.45 m (2) | Mechanics (tide); zones | replaces the base's normalised thresholds |
| Hero safety: 6 s, then a 3 m landward wash-out; plunges never under 10%, half cost within 5 s; every pull stops at the first deep cell via `castT` (2) | Mechanics (tide, ice); Enemies | |
| The Hull-louse curl and bowl with the dodge (2) | Enemies (hullLouse) | |
| Four legendaries through `legFrom_<boss>` (2) | Echoes and post-game | two in the base, the bosses' named drops (`LEG_FROM`); the two random drops are stretch and need a zone filter in makeItem |
| The cleft's plan B through the cold Forge's north flue (2) | Zones, the corridor | |
| Telegraphs never shrink with difficulty; sea-green for pulls; the environment counts as one of two big telegraphs (2) | Bosses; Difficulty; phone rules | |
| Name-stones merged with the Lights for the Lost into one optional set driving ×1.25 (2) | beats (Name-stones); Blessings | four stones on the coast in the base; the frozen sea's four are stretch |

Further grafts the judges praised in their rationales and this design took: the mechanics design's **Beached** loop for the Walking Tower's phase 1 (stand on dry rock and its Breach strands it), its phase-2 **Beneath** for the Skotos (the player makes the hole it surfaces through, next to a fire), **the keepers walking in with their lamps and Whitecliff's fire relighting the light** in the Skotos's phase 3, **light holds the ice and whale oil melts it**, **three readings of one coast** (tidal, frozen, spring; in the base the Freeze changes only the bay and the sky, and the full frozen and spring readings are stretch, after the scope audit), **ebb hoards**, and its reading of **"watch the gate too"** and «Δεν χρειαζόταν φως. Περπατούσε προς ένα.» (moved into Ice Memory 4 with Einar).

**Must-fix items, and how each is fixed.**

| must-fix (judge) | fix | where |
|---|---|---|
| The hero speaks in q30 (1) | second-person narration only: «Του λες το όνομά τους: Αλιγενείς...» | ending, Home; Risks |
| The quest-giver names the Skotos in her first dialog (1) | a8 «Τ' όνομά του δεν το λέμε εδώ...»; Glaukos says it first, in the rite | beats q24-25 |
| The sapling "by her hut" contradicts d.tear.nursery.2/3; the same flaw in the base's Tamarisk (1) | Tamarisk asks whether her sapling in the wood grows; the Ranger (narration) or Elati answers; no sapling at the coast, no bark | beats (Tamarisk; Lines at home) |
| Rename Ilva; consider Senna; use the keeper phonology, Selna is free (1) | the quest-giver is Alkyone (the base's); the forgotten keeper is Selna | npcs |
| The Viking's stock-photo face and its non-Mixamo rig (1) | not used: the Harpooner is a people recipe, the Sunken's 'villager0' scene with code parts; rejected in the audit | Enemies; Asset audit |
| Numb roots the hero in the Hullback's flood (1) | no Numb meter; the Cold builds +4/s wading and drains on dry ground; in boss fights Frostbite is a slow that waits for red telegraphs to clear | Mechanics (Cold) |
| Damage-taken statuses stack (1) | one vulnerability at a time, bosses capped at ×1.6 outside one scripted window, time-to-kill targets in the boss scenarios | Mechanics (the vulnerability rule); Bosses |
| No phone texture budget (1) | itemised: about 93-100 MB phone GPU, 8.0 MB raw, re-itemised from measured files; the frost set gated on 25 measured textures | Assets |
| The Rime Bear reads as a recolour (1) | polar tint ×1.3, white rim, frost-breath roar that cracks ice r 4; a side-by-side viewer check before commit; polarbear.mjs fallback | Enemies (rimeBear) |
| Scope; freeze the cut order and ship first; Floe Run, ice Gate tiers and ambience out of the base (1) | ship-first list, a 9-step cut order, an out-of-scope list that now holds the coast's full frozen and spring readings, the sixth difficulty, four Name-stones and two legendaries | Engine work |
| Gate the downloads; Crab mountain reverse-image and storefront; Ocean Creature export check with the Lurker fallback; every STAND_IN on a boot-loaded or code-built model (1, 2) | provenance and technical gates before download, results saved; every STAND_IN list ends in troll, spider, warg, spiderling, a people.glb scene or heartroot; `cast5` runs cold | Asset audit; Risks; Enemies |
| Thin-ice ground at −2 breaks `drape()` (2) | the ground stays at −2 so holes show water, and `groundY` returns the ice surface on ice and window cells | The look row 5; Engine work 3 |
| The water hides every ground decal where the hero wades (2) | the water writes no depth and draws at renderOrder 1 before decals, telegraphs, pools, rings and blob shadows; `shallowtele` screenshot check | The look row 1; scenarios |
| The Skotos cannot mirror the beam and aurora (2) | an onBeforeCompile fresnel patch fed by the SEA uniforms; `extras.keepMat` exempts it from `prepare()` | The look row 15; Bosses (skotos asset) |
| The Field corridor must be carved after `tryAshfield` returns, with local `L.hgt`, no dressing inside, away from the Graves, the plug kept until `newFire`, a parity script (2) | all of these, plus a hard Graves keep-out check | Zones, the corridor |
| The STAND_IN chains (2) | as above | Enemies; Risks |
| Re-estimate sea.js; quality-0 paths first; perf5 as a gate before the bosses (2) | 5-6 d; quality 0 first; the gate | The look; Engine work 5 |
| The people set is 10 scenes; fold Tern into a shared CHILD recipe; elatiFrost's bark source; Alkyone against Elianthe (2) | seven scenes: one CHILD scene for Tern, the memory boy and the village child; the Harpooner in the Sunken's scene; the shorefolk as runtime tints; Brokka and Elati stay home (no frost rebuilds, no bark source); a measured 25-texture gate; a viewer check | npcs; Assets |
| Remove the Cold's passive outdoor build (2) | the Cold builds only from wading, gusts, plunges and hits | Mechanics (Cold) |
| Vary the Breathing-hole holds from the Great Bellows (2) | no ally, no single interact: three rim lamps kept lit together; the Black Breath cracks the shielding hero's ice and an Icemaw comes up through the cracks; each hole different | Mechanics (the seals) |
| Kelp credited CC-BY 4.0 (2) | done | Assets; Asset audit |
| The bear's budget: ACT_FILES.act5 lists 'bear' and its 9.1 MB stays counted (2) | done | Assets; Enemies |
| The base's Einar timeline contradiction (1, rationale) | Einar is a boy at the Breaking and a young man at the beacons; never shown old | twist; Risks |
| Brokka and Elati arriving as allies again (1, rationale) | they stay home with new lines | npcs |

## Judges
[
 {
  "winner": "mechanics",
  "rationale": "How I checked: I read all three designs in full, the canon, engine and assets briefs, docs/HANDOFF.md, and the Act IV design and its judges. I checked every load-bearing quote against src/i18n/text.js: d.answer.4, d.field.dawn, d.lamp.m1.1-m5.4, d.isarn.d6/e1-e4/r3/r5/u1/u3/after, d.k.tear, d.elati.g1/aut3.r/home.r, d.tear.nursery.1-3, d.brokka.c3/u1, d.forge.cold, boon.rest.q, d.elati.u1, help.p1 and act4.next. I spot-checked the engine: data.js BOONS stat keys and PACK_DORMANT, folk.mjs rebind()/BONEMAPS, sap.js sapAt, combat.js rootHero, map.js (it has no close() yet) and build.js:1730-1740. Totals are weighted (story ×2, gameplay ×2, the other four ×1, out of 80), as the brief asks. Plain sums: story 46, mechanics 47.5, spectacle 48.5.\n\n**Mechanics wins (65), narrowly over story (63).**\n- **Bosses.** It has the best of any design. Hullback: stand on dry rock, so its Breach strands it on land, then light the cage on its back, which stops it diving, then shelter from the Wave. The Skotos: in phase 2 the player makes the holes it will surface through, and the beam freezes them shut again; in phase 3 its arms smother the Great Light, the keepers walk in with their lamps, and Whitecliff's fire relights it.\n- **Gameplay.** Every enemy has one verb that touches a system: the oar sweep pushes, the harpoon reels you in, the Tidecaller floods your footing, a curled louse can be rolled into a pack, the Wolfseal is stranded by light, the bear is baited through the ice, the Darkgrasp grabs. Each class has its own ice role (Warden breaks it, Mage bridges it with Frost Nova, Ranger cracks it from range). Light holds the ice, and whale oil melts it.\n- **Replayability.** The same coast plays three ways: tidal, frozen after the Freeze, and spring after the act. On top of that: ebb hoards, 12 stones, 4 legendaries, and seeds that can be keyed per difficulty.\n- **Canon.** Its story is the cleanest on canon. Its reading of d.lamp.m4.2 is the best handling in any design: \"watch the gate *too*\" means as well as the sea, which reconciles Arna's walk north with the gate watch. Its strongest lines: «Δεν χρειαζόταν φως. Περπατούσε προς ένα.» and «Για να μην ξεχαστεί ένας τύραννος, ξεχάστηκε ένας λαός.». The child coda mirrors d.isarn.u3. Its name for the people, Αλιγενείς, matches Λιθογενείς.\n- **Weaknesses.** The hero speaks to the child, the Skotos is named casually in the first dialog, Birch's sapling contradicts the nursery lines, and it has the largest scope (41-51 days).\n\n**Story has the strongest story (9.5).**\n- The Skotos lives on forgetting. Karthax's wish (mon.karthax.t, «Για να μην ξεχαστεί») made every beacon a fire of remembering, so forgetting him woke it. This is the canon brief's own reading.\n- «Σκότος» is spoken for the first time in a rite. The naming ends on a ΣΚΟΤΟΣ title card, and the title subtitle changes afterwards.\n- Selna's name blanks to «…» in the quest text after she is forgotten. Ivar and Isarn are carved among the keepers' names. «Απόψε η βάρδια είναι δική μου» answers boon.rest.q.\n- Against that, it has four claim errors:\n  - «Κι εκείνη έχει όνομα» is feminine for the male Warden and Mage.\n  - Selna is about 70, yet she is the young keeper of Drowned Memory 3, set a hundred years ago.\n  - \"a boy from the sea lit them\" contradicts d.lamp.m3.1, where Arna lights the beacons as \"a young man now\".\n  - \"He did not walk north to the Anvil Gate\" sits against d.lamp.m4.2.\n- Its third mechanic, Forgetting, locks skill buttons. On a phone that punishes the player rather than rewarding them.\n- Its world-state lights are passive pools, and the act has two \"light 3\" counters (q26, q28) on top of Act IV's waylamp formula.\n- The best of its story beats can be grafted onto mechanics scene by scene: the rite, the naming with the title card, the carving, and the forgotten keeper.\n\n**Spectacle (62.5) has the best render plan, but the weakest story and gameplay.**\n- **The render plan:**\n  - The aurora is reflected along the view ray in the water and ice. build.js:1735-1739 already does this for the Mere, so the aurora is visible in every frame of play.\n  - There is a black-aurora uniform, and an opaque parallax ice shader with shapes beneath it.\n  - An R8 crack texture holds the crack state per cell.\n  - Every image has a quality-0 fallback, and the budget is itemised at about 96 MB phone GPU.\n- **Its hook is excellent:** the fourth fire goes out on the horizon while Alkyone is speaking.\n- **Its story has a hard contradiction.** Einar is \"a boy from the south\" on the night of the Breaking (i2.3), yet he is an old man watching the beacons being lit (i4). The beacons were lit by Arna as a young man (d.lamp.m3.1).\n- **It repeats Act IV:** three ally-defended holds are the Bellows again, and Brokka and Elati arrive as allies once more.\n- **Its always-on Cold meter is a chore.**\n- **The aurora stays black for most of the act,** which holds back the wonder until the very end.",
  "scores": [
   {
    "angle": "story",
    "story": 9.5,
    "gameplay": 7.5,
    "spectacle": 8.5,
    "feasibility": 7,
    "assets": 6.5,
    "mobile": 7,
    "total": 63
   },
   {
    "angle": "mechanics",
    "story": 8,
    "gameplay": 9.5,
    "spectacle": 8,
    "feasibility": 6.5,
    "assets": 7,
    "mobile": 8.5,
    "total": 65
   },
   {
    "angle": "spectacle",
    "story": 7,
    "gameplay": 7,
    "spectacle": 9.5,
    "feasibility": 7.5,
    "assets": 8.5,
    "mobile": 9,
    "total": 62.5
   }
  ],
  "grafts": [
   "STORY, the rite: at Saltwick a keeper says the names of the dead, then «Σκότος» for the first time in the game, «για να μην κρυφτεί» / 'so it cannot hide', with «Ό,τι έχει όνομα δεν κρύβεται» and the title theme's low chord. This replaces Ilva's casual a5.",
   "STORY, the mechanism: the Skotos lives on forgetting, so Karthax's wish made every beacon a fire of remembering (story t2-t5: «Χίλια χρόνια, κάθε κορυφή στον Βορρά θυμόταν...», «Κανείς δεν το ήξερε. Ούτε εκείνος.», «Τους τυράννους τους αφήνουμε στο σκοτάδι. Τους ανθρώπους τούς φωνάζουμε με τ' όνομά τους.»). Fuse it with mechanics' «Για να μην ξεχαστεί ένας τύραννος, ξεχάστηκε ένας λαός».",
   "STORY, the naming at the Skotos's sinking:\n- the keepers say the old names;\n- the hero gives Isarn's name in second-person narration («Λες το όνομα που κουβαλάς από τον Λευκόβραχο: Ίσαρν.»);\n- then «Κι εσένα σε ξέρουμε. Σκότος.» and its first 'I', «...ναι... αυτό... είμαι...»;\n- cut to black and the white title card ΣΚΟΤΟΣ;\n- after Act V, game.sub becomes «Το σκοτάδι έχει όνομα».",
   "STORY, the carving: at the top of the Great Light the hero carves Ivar and Isarn under Arna's and Orna's names («Όλοι έρχονται βόρεια στο τέλος. Τα ονόματά τους, τουλάχιστον.»). After the act a nightly rite speaks the names the player read on the stones. Add «Δεν σας προσέχαμε. Σας κοιτάζαμε μόνο. Χίλια χρόνια, κάθε βράδυ, μετρούσαμε τις φωτιές σας.», which answers d.isarn.e3 and d.amaranthe, and the closing «Τώρα ξεκουράσου... Απόψε η βάρδια είναι δική μου.», which answers boon.rest.q.",
   "STORY, the forgotten keeper (strong involvement, cheap):\n- At the Freeze, Old Senna walks out onto the ice to name the dark and is forgotten.\n- questText fills her name with «…» until she is remembered.\n- In the Skotos's phase 2, three «Θυμήσου τη» touches daze it, and her name returns to the quest text.\n- Use the bark-free version: no skill lockout.",
   "STORY, enemies: the Reefback, a crab with a stone on its back that lies as a rock until the flood (Hullback's mesh at ×1, the tide-wake brute), and the Icehunter's Frost Nova trap. Echo prompt «Πες το όνομά του» / 'Say its name' for the Skotos. Cheap home lines for Brokka and Elati after Act IV (d.brokka.v1, d.elati.v1/.r) with no model load. The Mage's Order of the Flame line (a5.m, plus .m support in rl()).",
   "STORY: the Ranger-recognition line goes to Birch (d.tam.1.r: «...σε ξέρω. Ήσουν η μικρή που έκλαιγε στον δρόμο όταν μας έστειλαν μακριά.»). Optional sixth-difficulty text «Εδώ ξεχνιούνται και οι ήρωες.».",
   "SPECTACLE, the look plan as the act's render spec:\n- the aurora computed along the reflected view ray in the water and ice shaders (the Mere's trick, build.js:1735-1739), so it shows in every gameplay frame; the sky dome only in cines;\n- the uAurDark and uAurFront uniforms, so the sky goes black at the Freeze and the aurora returns from south to north at the end.",
   "SPECTACLE, the ice look:\n- an opaque black-ice shader with parallax depth;\n- uShade, which makes the Wolfseal's shadow its tell and the Skotos passing under the Dark Ice;\n- uGlow for sunken lanterns;\n- an R8 per-cell crack DataTexture (re-uploaded when dirty, at most every 0.1 s);\n- a pool of 32 instanced floe shards;\n- uFreeze for the Black Water freezing clear and for iceOut.",
   "SPECTACLE, finishing touches:\n- beam cones with snow motes, drawn only within 45 m and not at all at quality 0;\n- glittering snow (G_GLINT) and wet sand after the tide (G_WET);\n- breath puffs and footprints, sea smoke;\n- the frost vignette as a DOM overlay.",
   "SPECTACLE, the budget discipline:\n- an itemised phone texture budget (about 96 MB) with a quality-0 fallback for every image;\n- sea.js and build5.js, so build.js gains only hooks;\n- a perf5 scenario at the two worst spots (the Wreck Shallows at high tide, mid Ice Road).",
   "SPECTACLE, the hook: Whitecliff's view of the fourth fire visibly dims and gutters during the q24 talk (Senna's light failing), not only at half size later. Ilva's reason for the thousand-year silence: «Απαντάμε μόνο σε φωτιές που μπορούν να σβήσουν». The Skotos turns intro.4 into a law («...σβήνουν, η μία μετά την άλλη. Πάντα σβήνουν.»), answered by «Κι ανάβουν ξανά. Η μία μετά την άλλη.».",
   "SPECTACLE, cheap extras:\n- Skua flocks (Dayvable gull, bat AI plus lightShy) that scatter from beams, for life on the coast;\n- the Rime Bear by runtime tint first, with no new texture, and a regraded polar texture only if it reads grey.",
   "SPECTACLE, the Field cleft: plug it with rubble that opens on newFire, so saves still fighting Ivar keep the arena whole, and run the parity check over check-act4's seeds.",
   "SPECTACLE, optional finale: rebuild Brokka and Elati into the frost set and let them stand with the keepers in the Skotos's phase 3, so four peoples' lamps hold the ice for the relight. This is only worth it if the frost-set budget allows."
  ],
  "must_fix": [
   "The hero speaks in q30 (d.name.1 «Τους λένε Αλιγενείς...»). In four acts the hero has never spoken: text.js has no npc.hero, and there is only second-person narration such as d.answer.0 and d.u.pour. Rewrite it as narration, for example «Του λες το όνομά τους: Αλιγενείς...».",
   "Ilva names and explains the Skotos in her first dialog (a5-a6). No character has ever said «Σκότος» (canon §1.1). Hold the word back for the graft rite at Saltwick and keep a5-a6 to «κάτι ξύπνησε κάτω από τον πάγο».",
   "Birch's sapling 'by her hut grows each visit' contradicts d.tear.nursery.2/3: the saplings stand in the wood beside the cut names. Move the payoff: she asks whether her sapling in the wood grows now, and Elati or the Ranger confirms it. The same flaw is in spectacle's Tamarisk ('the salt ate it').",
   "Rename Ilva. The story designer found it collides with a real steelworks, and it is also Elba's Latin name. Consider renaming 'Senna' too. Use the keeper phonology; Selna is free.",
   "Sunken Harpooner on the Viking model: the scout notes its face texture credits a stock photo (Photodjo). That is not the clean provenance the Play Store needs, so ship the CC0 'villager1' GAUNT fallback or repaint the face from nothing. Also, rebind() reads Mixamo names (folk.mjs:163-173), so a UE-mannequin rig needs a UE→Mixamo BONEMAPS entry, not the 'identity' map the design claims.",
   "Numb in Hullback's flood phase: at hA 0.9 most of the bowl is shallow, so the hero is rooted for 1 s every ~3 s while Breach and Undertow telegraphs are up. In boss arenas make Numb a slow instead of a root, or suspend its build while a red telegraph targets her.",
   "Damage-taken statuses stack: Bared +30% (+40% on Wanderer), Exposed +25%, Beached ×1.5, Dug In ×1.5, Stranded ×1.5, the relit beam 'about half the time'. Define one stacking rule with a cap, so both bosses do not melt on Wanderer and Warden, and add boss time-to-kill targets to the hullback and skotos scenarios.",
   "No phone texture budget is given. Six creature GLBs, the frost set, the brine pack and 9 layers must be itemised and stay ≤110 MB phone GPU and ≤9 MB raw. Use the spectacle table as the template.",
   "Rimebear is the Amberback's mesh and silhouette from Act III. Make its read distinct (polar grade, ×1.25, frost-breath roar, ice cracking on the roar) and confirm it side by side in the viewer, or the big-beast slot reads as a recolour.",
   "Scope is the largest of the three (41-51 days). Freeze the cut order now and ship first: tide.js, ice.js, GridMap.close, beams/Bared, both bosses. The Floe Run, the ice Gate tiers and the orca/gull ambience are out of the base scope.",
   "Gate the downloads before any work. Crab mountain gets a reverse-image and storefront search (the author also hosts fan art). Ocean Creature gets an IK/FK export check, with the Lurker fallback if it fails. Keep every STAND_IN fallback on a boot-loaded or code-built model."
  ]
 },
 {
  "winner": "spectacle",
  "rationale": "I judged this through the engineering lens, weighting feasibility and assets x2 (total = story + gameplay + spectacle + 2*feasibility + 2*assets + mobile, max 80). Spectacle wins on engineering. Story has the best narrative. Mechanics has the deepest systems.\n\nASSET CHECK. I queried all 35 Sketchfab uids cited across the three designs through the API with SKETCHFAB_API_TOKEN (GET /v3/models/{uid} and /download).\n- All 35 are CC Attribution (CC-BY 4.0) or CC0 Public Domain, isDownloadable true, and the download endpoint returns 200. Results are in scratchpad/judge-eng/sf.json.\n- Face and clip counts match the designs: Crab mountain 41,993 faces / 1 clip; Ocean Creature 58,912 / 1; Leopard Seal 179,928 / 0; Isopod 582,561 / 0; Tentacle 9,715 / 1; Lurker 8,524 / 6; Dalarö 860,412.\n- Every Poly Haven and ambientCG id resolves through their APIs: dutch_ship_medium, ship_pinnace, coastal_cliff_01, the snow, shore and planks layers, Ice002, Ice003, Net001A, Rope001.\n- No design leans on a bad licence. Three provenance flags remain:\n  1. Crab mountain (all three designs). pro100voron's only downloadable CC-BY model; the rest of the portfolio is non-downloadable fan art (Fallout 4 Deathclaw and Lone Wanderer, Nuka-cola, Indominus Rex). Each design's reverse-image and storefront gate is required.\n  2. Glass octopus (story only). Its author \"andrey.\" is a bulk uploader whose recent work includes commercial-IP fan art (Silksong, Arcane's Jinx, a Witcher 3 medallion, My Little Pony's Sparkle uploaded the same day as the octopus). This is \"risky\", not the \"ok\" the scout gave it.\n  3. Viking (mechanics only). Its description says \"Male face image credit: Photodjo\", so the face texture comes from a stock photo of unknown licence. For a Play Store build it must be replaced, not overpainted.\n\nENGINE CHECK. I verified the files the designs depend on:\n- map.js has open() but no close(), and setSolid does not reset flowT. fillWindow and stepToward rebuild per map.ver.\n- player.js snaps the hero back after walls, and the pl.pull tween exists.\n- ai.js:99-100 has the bat blocks() path and the (!a.def.float || !a.boss) no-collide path.\n- light.js:17 gates zones and :215 drapes the ring. lightAt returns true outside the light zones; shrinkPool exists.\n- build.js buildAmber's reflected-crowns trick is at ~1733-1737; ground4, townBeyond and starField are where cited.\n- The skills.js:149 canUse and roll D.dist hooks, combat.js:181 act4Hit, :399 legFrom_ and data.js:196 BUFFS.memory all exist.\n- people.js:89-91 drains the tint colour above 1 and ramps above 2, and creatures share that path, so spectacle's runtime-tinted Rime Bear is real.\n- The shipped bear.glb has 11 clips (mechanics' \"81\" is the Sketchfab source count).\n- gen4.js:525-527 runs the reach check over L.exits, so an exit pushed before it can make old seeds retry into a different layout.\n\nWHY SPECTACLE. It is the only design with:\n- an itemised phone GPU budget: 96 MB against the 110 MB budget, using the engine brief's halving rule. Its bear figure (9.1 MB) matches the shipped GLB's textures;\n- a quality-0 path for every image, and a perf5 scenario with an 18 ms ship gate;\n- an explicit draw order;\n- a crack state held in one R8 DataTexture, cheaper than per-instance tile attributes;\n- a code material for the tentacle, so no Blender bake is needed;\n- no Act V zone loading the folk, grove or ash sets;\n- a rubble plug that keeps Ivar's plaza arena whole for saves that have not beaten him;\n- an asset list that is the smallest and cleanest, with its estimate (40-47 d) including asset building.\n\nTHE OTHERS.\n- Story (34-44 d, assets on top) has the strongest canon work (no one / someone, the title card, Selna forgotten and remembered) and the cheapest third mechanic (Forgetting, about 1.5 d). But it needs 7 creature GLBs against a guideline of 3-4, the risky octopus, Blender bakes and an 11-recipe set, has no GPU tally, and leaves a gap in its tide data model: L.tide = -1 cells stay deep at the dead ebb (-0.5 > -0.7), so the bay bared by the Great Ebb is undefined. It also names a skill, Earthsplitter, that does not exist (the Warden has whirl, leap, cry and quake).\n- Mechanics has the best gameplay and the most accurate code citations, but is the riskiest: three readings of the coast, about 9 new AIs and traits, the Viking rebind (its \"identity BONEMAPS\" is overclaimed, since rebind() expects Mixamo names and a UE4 rig needs a rename table), a regraded bear copy (+9 MB GPU), about 14 people scenes, no GPU tally, and 41-51 d before assets.\n\nFLAWS IN SPECTACLE. It has three concrete engine defects (must_fix 1-3). They are cheap to fix and do not change its design.",
  "scores": [
   {
    "angle": "spectacle",
    "story": 7,
    "gameplay": 7,
    "spectacle": 9,
    "feasibility": 8,
    "assets": 8,
    "mobile": 8,
    "total": 63
   },
   {
    "angle": "story",
    "story": 9,
    "gameplay": 7,
    "spectacle": 7,
    "feasibility": 7,
    "assets": 6,
    "mobile": 6,
    "total": 55
   },
   {
    "angle": "mechanics",
    "story": 8,
    "gameplay": 9,
    "spectacle": 6,
    "feasibility": 5,
    "assets": 6,
    "mobile": 5,
    "total": 50
   }
  ],
  "grafts": [
   "From story: the naming finale's title card (cut to black, «ΣΚΟΤΟΣ» in white, a small ui/overlay.js addition) and the title subtitle switching to «Το σκοτάδι έχει όνομα» once any hero has act5 >= 0. Near-zero engine cost, and the biggest payoff of the game's title.",
   "From story: the Hermit's thin-ice bait. A boss charge across a frozen lagoon breaks it and the boss is Overturned for 5 s (x2 damage taken), with the lagoons refreezing on a timer. Put it in the Walking Tower's phase 2 on spectacle's crack texture, so ice.js teaches its own rule in the boss fight.",
   "From story and mechanics: the Mage's Frost Nova (radius 5.5, data.js) refreezes broken ice in its radius. One hook in skills.js gives the Mage an ice identity, and the Warden (leap/quake impacts) and Ranger (rain cracks) get theirs from the same loadAt/crackAt API.",
   "From story and mechanics: the tide clock starts at low slack on every zone build, so a returning hero always finds the camp and the causeways dry; story's check-act5 hard failure 'a dry-at-high-tide pocket not connected to camp unless it carries a skerry marker'; and tide and ice soak scenarios that log map.ver bumps and frame time with about 30 actors.",
   "From mechanics: L.bed in metres (quantised 0.15) with depth = h - bed and shallow below 0.45 m. The walk grid, the water vertex lift and the foam then share one physical level, which is simpler to reason about than a normalised k with a +0.25 band.",
   "From mechanics: the hero-safety rules. A cell never turns deep under her for 6 s, then a landward wash-out (pl.pull 3 m) rather than a teleport to a ring buffer. A plunge never takes her below 10% life, and a second plunge within 5 s costs half. Every pull (harpoon, arm Lash, Icemaw drag) stops at the first deep cell or wall via map.castT.",
   "From mechanics: the Hull-louse curl-and-bowl. A dodge-roll through a curled louse launches it along the roll, cracking thin ice and drowning in deep water. It uses the existing dodge with no new button, is very phone-friendly and costs about 0.5 d.",
   "From mechanics: four Act V legendaries through the existing LEGENDARIES list and the legFrom_<boss> first-kill hook (combat.js:399), for replay at no asset cost.",
   "From mechanics: the Cleft's plan B (an exit through the cold Forge's dead north flue, same lock) if the Field parity check cannot be held, and the explicit 200-seed parity check with a stated margin.",
   "From mechanics: telegraph durations never shrink with difficulty (spectacle trims 0.1-0.15 s on Nightmare and Ash); scale damage, cooldowns and adds instead. Also the sea-green telegraph colour for pulls and reels, and 'the environment always counts as one of the two big telegraphs'.",
   "From story: optional Name-stones whose names are spoken in the closing roll. Merge them with spectacle's Lights for the Lost into one optional set that drives the x1.25 blessing."
  ],
  "must_fix": [
   "Thin-ice ground at L.hgt -2 breaks drape(). build.js drape() lays the light pools (light.js:91, :201), the hero's lantern ring (light.js:215) and any drapable cone on groundY(L.hgt), so on thin ice they would sit 2 m under the opaque ice mesh and vanish. Keep the ground at 0 under thin ice (the ice shader's parallax already fakes depth), or make groundY/drape read the ice surface on L.ice cells.",
   "The water hides every ground decal where the hero wades. Spectacle draws the water in the transparent pass with depth writes ON at up to +0.3 m over the floor. Telegraphs are drawn at y 0.06 with depthTest on (fx.js teleCircle/teleCone/teleLine, renderOrder 3), and light pools, the lantern ring and blob shadows (y 0.04) are also below the surface. All of them would be invisible in shallow water: the whole tide combat, and the Walking Tower's phase 1. Draw the water with depthWrite false before the decals, or disable depthTest on telegraphs and rings in Act V zones, and add a scenario screenshot check of a telegraph in shallow water.",
   "The Skotos 'mirroring the beam and the aurora' via roughness 0.2 and envMapIntensity 1 cannot work. scene.environment is a static RoomEnvironment PMREM at intensity 0.35 (gfx.js:49-51), and creatures.js prepare() forces envMapIntensity 0.4 and raises roughness to 0.6 on every creature material. Patch the boss material with a fresnel term fed by the SEA uniforms (uAurCol, uAurDark, the beam's direction and intensity), and exempt it from prepare()'s overrides.",
   "The Field corridor in gen4.js must be carved after tryAshfield returns, never pushed to L.exits before the reach check (gen4.js:527 tests L.exits). It must also recompute L.hgt locally (terrain() runs before dressing, so the corridor floor would otherwise render as the Anvil's cliff slope), drop dressing props inside it, avoid the Lantern Graves gorge, and keep its rubble plug until newFire. Ship it with a parity script against HEAD over check-act4's seeds.",
   "STAND_IN fallbacks must resolve in a cold Act V session, which loads only the frost set and the act5 group. skua -> caveBat (an Act II creature) and skotos -> moltenKing (folk) only work through their own chains. End every list in a boot-loaded or code-built model (troll, spider, warg, spiderling, heartroot), as mechanics specifies, and cover it in cast5.",
   "Re-estimate src/world/sea.js. Water, ice with parallax, the crack Voronoi, the aurora reflection and sky dome, beam cones, freeze waves, the icy Instancer and three groundMat defines are about 5-6 d, not 3-4. Build every quality-0 path first, and make perf5 (18 ms on mobile emulation in the Shallows at high tide and on the Ice Road) a gate passed before the bosses are built.",
   "The people set is 10 scenes against the engine brief's 9-scene, 25-texture budget. Fold Tern into a CHILD-table recipe shared with the memory boy, or cut him to runtime scaling. elatiFrost needs the grove recipe's bark source again (Poly Haven bark_brown_02; engine brief §6.3 says the /tmp sources are gone). Check that Alkyone and Elianthe (same 'healer' source) read apart in the people viewer.",
   "Remove the Cold's passive outdoor build (+1.2/s, +0.6/s with the lantern). On a phone it is a constant tax that pushes the player toward fires rather than fights. Build Cold only from wading, gusts, plunges and hits, and keep the warm pools as the counter.",
   "Vary the Breathing-hole holds from Act IV's Great Bellows. As written they are the same interact, ally walkTo, ring timer and waves. For example, let the Black Breath crack the defender's ice and send Icemaw up through it.",
   "Asset gates before download, with the results saved beside each source in /tmp/claude-0/sf:\n(a) Crab mountain: run a reverse-image search and a storefront check (Fab, CGTrader, Unity Asset Store). Its author's portfolio is otherwise non-downloadable fan art (Fallout 4, Indominus Rex). The fallbacks are Mohamed's Giant Crab (6295676291c141728457ef7550b0650a) or spider.glb.\n(b) Ocean Creature: check that its rig exports as plain skinned bones. The glb is 44 MB and the glTF 215 MB, so download the glb. The fallback is the Lurker (28b3e1a216904de7ad212368fb9d8f59, 6 clips).\n(c) Kelp scan: credit it as CC-BY 4.0 despite the 'cc0' in its description.",
   "Bear budget: the claim that Acts III and IV share bear.glb is wrong (ACT_FILES.act4 has no bear). ACT_FILES.act5 must list 'bear' and the 9.1 MB cold-start GPU cost stays in the budget. Check the tintAmt 2.15 white read in the creature viewer next to the Amberback before committing; polarbear.mjs is the fallback."
  ]
 }
]
