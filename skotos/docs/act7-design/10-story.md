# Act VII design, part 10: Story

«Πράξη VII: Οι Εφτά Κορυφές» / "Act VII: The Seven Peaks". Written to `docs/act7-briefs/decisions.md` (binding) on the base of `proposal-production.md`, with the grafts decisions.md names from `proposal-story.md`. Zones, enemies, boss tables, mechanics, the cap layer, engine and assets are the other three parts; where a scene needs something from them it is listed under "Notes for the lead".

**How to read the lines.** Every player-facing line is written as `key` «Greek» / "English". Greek is the original. Every shipped line quoted here was checked in `src/i18n/text.js` on 17 November 2026 (v22); every new key was checked not to exist there. Keys follow canon §5.11 and Act VI's use (`d.<who>7.<beat><n>`, `.r` Ranger, `.m` Mage; `rl()` reads both, story.js:102; there is no `.w`). The act panel keys are `act7.*`, as shipped (`act6.done`), not `act.7.*`.

## Story

### Premise: what has happened since quest 39

**At quest 39** (`act6`, `h.act6 >= 0`): Pherousa is named and asleep beside her relit fire; the Skotos is asleep; six peaks and Arna's hill burn, lit by "hands you know" (`d.peaks.2`); warm air rises from the Gate at Isarn's staff (`d.answer6.1`), and the village has warmed its hands at it (`d.halda.v6` «Βγάζει ζέστη η πύλη. Ζέσταμε τα χέρια μας εκεί όλο το βράδυ.»). Act VI's last line is `d.answer6.3` «Ο Βορράς κοιμάται με τα φώτα αναμμένα.»

**Weeks later, spring.** Act VI opened «Στην καρδιά του χειμώνα» (`d.hal.1`); Act III ended on the first autumn in a hundred years (`act3.sub`). The seasons run in order, and the hook's first line says that weeks have passed. The sky has been clear since quest 23 (`d.halda.stars`), so no line calls this a first blue morning: it is the first **warm** one.

**What the warmth did.** The Gates opened «στα βουνά» (`d.isarn.r5`). Since `herFire` every Gate breathes warm air, so for weeks a hearth has been blowing under the old snow of the peaks round Whitecliff. Nobody meant it. It is the hero's own deed and a good one, and no line in the act calls it a mistake. The game's oldest rule is the altar's, «κάθε δώρο έχει το κλουβί του» (`altar.sub`): Act VI's gift was warmth from below, and this is its price.

**What Whitecliff sees.** Roofs drip; the stream below the village runs brown and loud; the peaks' fires show by day as thin smokes, and one of them stops. That is all the town sees (decisions rule 8).

**Who goes.** Halda of the Anvil (`npc.smith`): Whitecliff's smith, Stoneborn (`d.halda.2`), co-maker of the Cradle (`d.brokka.c1`), and the one who had the six peaks lit (`d.halda6.a` «Εφτά. Οι έξι σβηστές. Άσ' το πάνω μου.»). She has stood at her forge in every act as a vendor, but she is **not** a woman who never leaves it: this winter she climbed the peaks to watch the stars (`d.halda6.v2`). So the production proposal's `d.halda7.4` («Χρόνια έχω να βγω απ' το καμίνι») is replaced: she climbed for the stars, and now she climbs for work. Act VII is the first time she walks a quest with the hero.

### The force of the act: no villain

There is no villain and no one dies. The opponent is water, snow, and what the warmth wakes.

- **The thaw.** A thousand winters of snow with a hearth under it. The act's rule, said three times (by an old mason in a memory, by Halda, and by a blessing's quote): `d.halda7.b5` «Το νερό δεν το σταματάς. Του δείχνεις δρόμο.» / "You don't stop water. You show it a road."
- **Kallisto,** a great bear the shepherds have always known. Meltwater got into her den a month early. She is hungry, thin, and has a cub. She is not killed: she sits down, and the river the hero lowered feeds her.
- **Kelados, the Sleeper under the Mountain.** The one the Stoneborn built their water-gates on. The ice let go of him. He does not speak and is not wicked; half awake, he shakes the mountain, and each tremor loosens the wall of ice that holds the lake. He is not killed: he kneels, the hero gives him Isarn's word, and he goes back to being mountain.
- **The stake** is said in one line, never shown: `d.halda7.a6` "If they still open, the water comes down a little at a time. If not, it comes down once."

**Nothing here is of the dark.** The Skotos has no line and no scene. No line says "Karthax". Isarn does not return. The Shadow Gates play as they do.

### New lore, marked, and its canon check

Everything in this section is **new in Act VII**. None of it is in text.js today.

| new | what the act says | checked against |
|---|---|---|
| **The water-gates** («νερόθυρα»: three weirs in the Meltwaters, the great sluices at the lake) | Stoneborn masons built them "before the crown, before the beacons", to let the Hanging Lake down a step at a time, and a stair for the water beside their own | `zone.pass.s` «Ο παλιός δρόμος των Λιθογενών»: the Stoneborn built the mountain road, so they are the builders up here too. No shard, crown, beacon or Skotos lore is touched. Canon §1.7 has "nothing in canon" before Karthax except what Acts V-VI added (Pherousa); the masons contradict none of it |
| **The Water-stair** («Η Νεροσκάλα») | the stepped spillway from the lake to the valley, with a mason's stair cut beside it; the exit from `thaw` to `tarn` | **Renamed from the proposal's "the Stair" / «η Σκάλα»**: `wp.coast` is already «Η Σκάλα» (the Landing) and `zone.pass` is «Η Σκάλα των Γιγάντων» |
| **Kelados** | «Κέλαδος» is the **valley shepherds'** word for the roar of the mountain in spring, and their name for whoever turns over up there. The Stoneborn called him «ο Κοιμισμένος» / "the Sleeper", quietly | Judge 1's conflict 3 (a Greek name in a hard-consonant people, canon §5.10) is solved: it is a Men's word. He is called "the Sleeper", never "the Old One", a giant or a titan (canon §4 IP list) |
| **Why six acts never mentioned him** | The masons' rule: strike no iron up there, and say nothing at home (`d.mason.m5.3`). Halda and Brokka both say it: the Stoneborn don't forget, and that is how they know what not to say | Judge 1's conflict 2. `d.halda.2`, `d.brokka.v1`, `d.brokka.v5` «Οι Λιθογενείς δεν ξεχνούν» stand; `d.brokka.v5` ("that one we never knew") is about Pherousa's fire, not the mountain |
| **Why the works failed** | The masons promised to "mind the water" each spring. They kept it «ώσπου η Βαθύπετρα γέμισε σκιές» (`d.halda.2`'s own words), a hundred years ago; since then nobody climbed, and the winches froze | canon §1.7: a hundred years since the Deep Forge took Deepstone. Never "four hundred" |
| **Kallisto** | the shepherds' name for a bear that wakes last every spring. The name rhymes with the old tale; the game never tells it (as Alkyone and Keyx did in Act VI) | no shipped line; `mon.amberBear`, `mon.rimeBear` are other beasts |
| **The lookouts** («βίγλες») and their people («βιγλάτορες») | each of the six peaks has a shoulder hut where its fire's wood is kept and its lookout sleeps; three stand round the Meltwaters, three round the lake. The villagers who lit the peaks man them in turns | Judge 1's conflict 5: the six peaks stay six separate peaks on the skyline (`FAR_BEACONS` 7-12); a lookout is one peak's station, not the peak. "Lookout", never "keeper" (canon §5.10 collisions) |
| **Why the sea ice does not melt** | Selna, after the act: her ice holds, because Pherousa's fire is deep and small and the mountains lie nearer the Gates (`d.selna.v7`) | protects Act VI's ending (the Skotos asleep under the ice) from the obvious question |

**Old lines that read differently afterwards** (no line changes): `d.isarn.r5` (the Gates "in the mountains"); `d.isarn.a4` («Οι παλιοί τον λένε Σκάλα των Γιγάντων», answered by one lookout's wink, `d.vigla.5b`); `d.brokka.after` («ακούω το βουνό να ανασαίνει»); `d.staff` and `d.rest6` («Ξεκουράσου.»); `d.first.7` («Η ανάπαυση είναι να κοιμάσαι κι άλλος να κρατά το φως.»); `d.isarn.1` («Ώστε ξύπνησες.»), which becomes the kindest thing anyone can say to a beacon-keeper.

### The hero's inner line: the one who cannot sleep

The hero has been told to rest three times and never has: `d.staff` «Ξεκουράσου.»; `d.selna.rest` «Τώρα ξεκουράσου, φρυκτωρέ. Απόψε η βάρδια είναι δική μου.»; and Pherousa's definition, `d.first.7`. The act is one day in which everything that should sleep is awake, and it ends when the hero is told the word once more and keeps it.

| beat | where | line |
|---|---|---|
| the third night | hook | `d.spring.2`, `d.child7.1`, `d.child7.2` |
| Halda did not sleep either | hook | `d.halda7.a1` |
| eyes like an unbanked forge | Goat Track camp | `d.halda7.b6` |
| "Remind you of anyone?" | Kallisto's rest | `d.halda7.k5` |
| "Something's happened to sleep this year." | Stair's Head camp | `d.halda7.t6` |
| Brokka listens to drops | the Halls (optional) | `d.brokka7.1` |
| "Sleep. We will mind the water." | Memory 6 | `d.mason.m6.3` |
| the hero says the word to a mountain | Kelados's rest | `d.kel.r3` |
| the hero is told the word | home | `d.halda7.h2`, `d.halda7.h3` |
| the sleep, and the first line of the game | ending | `d.sleep7.2`, `d.child7.wake` |

The hero never speaks; narration does it, as in `d.rest6`.

### Not in this act

The Order of the Flame, Ragna, the Unsleeping, fire in grass and Signe are **Act VIII's** and appear nowhere here, in text or picture. The typed name card and the child's name are not grafted (judge 2): the child stays `npc.child`. One quiet line points south and promises nothing: `d.elianthe7.v2` «Το ρέμα πάει νότια. Δεν ρώτησα ποτέ πού καταλήγει.»

---

## The hook at Whitecliff (q40)

- **Who sees it:** a save with `h.act6 >= 0`, quest 39 and `act6`.
- **When:** on the next town entry; for a hero finishing Act VI after the update, 2 s after the Act VI blessing panel closes (`actClosed` / `boonTaken`), as `hook5` and `hook6` do (story.js:1141, 2011). `hook7(z)` copies `hook6`'s guards (`busy()`, zone check) and loads the `frost` set for the child as `hook6` does. **Brokka does not walk into town** (see Notes): `folk.glb` is not loaded.
- **Flag `call7` saved first.** Cine at pitch 0.3, about 16 s, in the town's new morning light (`ATMOS.townMorning`, the production part's):
  1. Dark before dawn, on the beacon. `d.spring.1` «Πέρασαν βδομάδες από τις αλκυονίδες. Ο πάγος στη στέγη της Χάλντας στάζει όλη νύχτα.» / "Weeks have passed since the halcyon days. The ice on Halda's roof drips all night."
  2. `d.spring.2` «Τρίτη νύχτα στη σειρά που δεν κοιμάσαι. Σηκώνεσαι να δεις τη φωτιά. Καίει. Το ήξερες.» / "The third night running that you have not slept. You get up to look at the fire. It is burning. You knew it would be."
  3. The light comes up warm. The camera turns to the south wall; the stream is heard, loud (a sound, and a brown strip below the wall if the town can show one). `d.spring.3` «Ξημερώνει ζεστά. Το ρέμα κάτω από το χωριό είναι καφετί και φωνάζει.» / "Day breaks warm. The stream below the village is brown and shouting."
  4. The child by the beacon (the frost `tern` scene in the village tint, as Acts V-VI), dialog:
     - `d.child7.1` «Πάλι δεν κοιμήθηκες. Σε είδα απ' το παράθυρο, τρεις φορές.» / "You didn't sleep again. I saw you from the window, three times."
     - `d.child7.2` «Η Χάλντα λέει πως η φωτιά καίει κι όταν δεν την κοιτάς. Εσύ δεν το πιστεύεις;» / "Halda says the fire burns even when you're not looking at it. Don't you believe that?"
     - `d.child7.3` «Άκου το ρέμα. Χτες ψιθύριζε.» / "Listen to the stream. Yesterday it was whispering."
  5. The camera goes to Isarn's staff. `d.spring.4` «Η Χάλντα στέκεται στο ραβδί του Ίσαρν, με την παλάμη πάνω από την πύλη, όπως πάνω από καμίνι.» / "Halda stands at Isarn's staff with her palm over the gate, as over a forge."
  6. Toast «Νέα αποστολή: …» with `q.40` «Μίλα με τη Χάλντα δίπλα στο ραβδί του Ίσαρν» / "Speak with Halda by Isarn's staff"; the "!" over Halda (`npcHasNews`: `call7 && !haldaOut`).
- **The next-act line** (it replaces the shipped text of this key, for heroes who finish Act VI after the update): `act6.next` «Πράξη VII: Οι Εφτά Κορυφές. Μίλα με τη Χάλντα.» / "Act VII: The Seven Peaks. Speak with Halda." `help.p1` needs no change (generic since Act V).

**Halda at the staff** (one dialog, folk register, contractions in English). She gives the quest.
- `d.halda7.a1` «Δεν κοιμήθηκες. Ούτε εγώ: όλη νύχτα άκουγα τη στέγη μου να στάζει.» / "You didn't sleep. Nor did I: all night I listened to my roof drip."
- `d.halda7.a2` «Όλο τον χειμώνα ζεσταίναμε τα χέρια μας στην πύλη, και χαιρόμουν. Χαζή. Οι πύλες άνοιξαν και στα βουνά.» / "All winter we warmed our hands at the gate, and I was glad. Fool. The gates opened in the mountains too." (`d.halda.v6`, `d.isarn.r5`)
- `d.halda7.a3` «Χίλιοι χειμώνες χιόνι, κι από κάτω του φυσάει ένα τζάκι. Κάνε τον λογαριασμό.» / "A thousand winters of snow, and a hearth blowing under it. Do the sum."
- `d.halda7.a4` «Ήρθε λόγος απ' τη Βαθύπετρα. Η Μπρόκα λέει πως η τρίτη στοά στάζει απ' το ταβάνι. Εκατό χρόνια ήταν στεγνή.» / "Word's come from Deepstone. Brokka says the third gallery drips from its roof. A hundred years it was dry." (said, never shown; no home is wet)
- `d.halda7.a5` «Και πάνω απ' όλους μας κρέμεται μια λίμνη. Οι δικοί μου έχτισαν νερόθυρα εκεί πάνω, πολύ παλιά.» / "And above all of us hangs a lake. My people built water-gates up there, long ago."
- `d.halda7.a6` «Αν ανοίγουν ακόμα, το νερό κατεβαίνει σιγά σιγά. Αν όχι, κατεβαίνει μια φορά.» / "If they still open, the water comes down a little at a time. If not, it comes down once."
- A short cine north from the staff, pitch 0.3, 7 s: of the seven day-smokes on the skyline, the third (`FAR_BEACONS[9]`) stops; a white tongue slides down that flank (one sprite strip). `d.smoke.1` «Στην τρίτη κορυφή ο καπνός κόβεται. Ύστερα, μια άσπρη γλώσσα κατεβαίνει την πλαγιά.» / "On the third peak the smoke stops. Then a white tongue comes down the slope."
- A torch-point waves on the ridge. `d.smoke.2` «Λίγο μετά, ένας δαυλός κουνιέται στη ράχη. Ο βιγλάτορας πρόλαβε. Τα ξύλα του, όχι.» / "A little later a torch waves on the ridge. The lookout got clear. His woodpile did not." **Nobody is hurt, and the line says so at once.**
- `d.halda7.a7` «Αυτό ήταν. Έρχομαι. Τον χειμώνα ανέβηκα στις κορυφές για τ' αστέρια. Τώρα ανεβαίνω για δουλειά.» / "That settles it. I'm coming. This winter I climbed the peaks for the stars. Now I climb for work." (fixes the proposal's `d.halda7.4` against `d.halda6.v2`)
- `d.halda7.a8` «Πάρε τον δρόμο του βουνού ως τη Σκάλα των Γιγάντων. Από κει ξέρω ένα γιδόστρατο. Και φέρε την Κούνια: εκεί πάνω ο πάγος θέλει πειθώ.» / "Take the mountain road to the Giants' Stair. From there I know a goat track. And bring the Cradle: the ice up there needs persuading."
- **Flag `haldaOut` saved, then `setQuest(41)`.** Halda shoulders her pack and walks out by the mountain road (`walkPath`, then `vanish`, as Tamarisk at story.js:2053). The Names' free respec and their first three Names are given here by the mechanics part; the story adds no line to it.

**While Halda is away** (`haldaOut && !lakeLet`): she is not in town. Her anvil is an interact that opens the reforge panel unchanged, after one line: `d.anvil7` «Το αμόνι της Χάλντας. Πάνω του, με κιμωλία: «Γυρίζω. Μην πειράξεις το μεγάλο σφυρί.»» / "Halda's anvil. Chalked on it: 'Back soon. Don't touch the big hammer.'" with prompt `anvil.use` «Δούλεψε στο αμόνι της Χάλντας» / "Work at Halda's anvil". She reforges at both camps (a field anvil).

---

## Quests 40-46 and end state 47

Flags are saved before their scenes, as Acts IV-VI do. **The chain:** `call7` → `haldaOut` → `thawSeen` → `weir1..3` → `kallistoRest` → `tarnSeen` → `winch1..3` → `keladosWake` → `keladosRest` → `lakeLet` → `home7` → `act7`. Optional: `look1..6` → `firesAll` (the mechanics part's). Story-only flags, off the chain: `mem_s1..s6` (memories seen), `haldaCamp7`, `haldaDen7`, `haldaHead7`, `brokkaV7a`, `brokkaV7b`, `elatiV7`, `haldaV8` (first talks), and `lanternWake` (owner question 1).

| q | zone | quest line | sets |
|---|---|---|---|
| 40 | town | `q.40` «Μίλα με τη Χάλντα δίπλα στο ραβδί του Ίσαρν» / "Speak with Halda by Isarn's staff" | `call7`, `haldaOut` |
| 41 | pass → `thaw` | `q.41` «Ανέβα στα Λιόνερα και άνοιξε τα παλιά νερόθυρα ({0}/3)» / "Climb to the Meltwaters and open the old weirs ({0}/3)" | `thawSeen`, `weir1..3`, `mem_s1..s3` |
| 42 | `thaw` | `q.42` «Πέρνα το Ρέμα: η Αρκούδα που Ξύπνησε φυλάει τη Νεροσκάλα» / "Cross the Race: the Waking Bear guards the Water-stair" | `kallistoRest` |
| 43 | `thaw` → `tarn` | `q.43` «Ανέβα τη Νεροσκάλα ως την Κρεμαστή Λίμνη» / "Climb the Water-stair to the Hanging Lake" | `tarnSeen` |
| 44 | `tarn` | `q.44` «Λιώσε τον πάγο από τα τρία βαρούλκα ({0}/3)» / "Thaw the ice off the three winches ({0}/3)" | `winch1..3`, `mem_s4..s6`, `keladosWake` |
| 45 | `tarn` | `q.45` «Αντίκρισε τον Κοιμισμένο του Βουνού» / "Face the Sleeper under the Mountain" | `keladosRest` |
| 46 | `tarn` → town | `q.46` «Άνοιξε τα μεγάλα νερόθυρα της λίμνης» / "Open the lake's great sluices"; after `lakeLet`: `q.46b` «Γύρνα στον Λευκόβραχο και κοιμήσου» / "Go home to Whitecliff, and sleep" | `lakeLet`, `home7` |
| 47 | end | `q.47` «Η άνοιξη ήρθε στον Βορρά, και το νερό βρήκε τον δρόμο του. Οι Σκιοπύλες σε περιμένουν.» / "Spring has come to the North, and the water has found its road. The Shadow Gates await." | `act7` |

`questText()`: clamp 39 → 47; q41 fills `weirs7()`, q44 fills `winches7()`, q46 picks `q.46b` on `lakeLet`.

### q41: the Meltwaters (`thaw`)

Zone: `zone.thaw` «Τα Λιόνερα» / "The Meltwaters"; subtitle `zone.thaw.s` «Εκεί που λιώνει το βουνό» / "Where the mountain melts". Level 40, a spring morning.

**The way in.** The goat track at the Giants' Stair's camp: an exit interact on walkable cells, locked `haldaOut`. Label `exit.thaw` «Το Γιδόστρατο» / "The Goat Track". Shut line: `d.trackShut` «Ένα γιδόστρατο, μισοχαμένο στο χιόνι. Χωρίς κάποιον που το ξέρει, δεν πας πουθενά.» / "A goat track, half lost in snow. Without someone who knows it, you would get nowhere." Waypoint `wp.thaw` «Το Γιδόστρατο» / "The Goat Track".

**Arrival cine** (flag `thawSeen` saved first; pitch 0.3 looking north up the valley, 9 s; `ATMOS.thawCine`):
- `d.thaw.1` «Η κοιλάδα είναι πράσινη και γεμάτη φωνές. Όλες είναι νερό.» / "The valley is green and full of voices. All of them are water."
- `d.thaw.2` «Γύρω της στέκονται τρεις από τις εφτά κορυφές. Το χιόνι τους γυαλίζει, και στάζει.» / "Round it stand three of the seven peaks. Their snow shines, and drips."

**Halda at the Goat Track camp** (her fire, a field anvil; vendor and reforge; "!" until `haldaCamp7`). She teaches the Race:
- `d.halda7.b1` «Κοίτα το. Όλο αυτό θέλει να κατέβει σήμερα.» / "Look at it. All of that wants to come down today."
- `d.halda7.b2` «Το ανοιχτό νερό, με τον αφρό, το περνάς με τα πόδια. Το βαθύ μπλε, όχι. Κι όταν ακούσεις βουή, ανέβα σε ξερό.» / "Pale water with foam on it, you can wade. The deep blue, you can't. And when you hear a roar, get up on dry ground."
- `d.halda7.b3` «Το Ρέμα, το μεγάλο, δεν πέφτει μόνο του. Τρία νερόθυρα, στις τρεις ρεματιές. Γύρνα τους τροχούς.» / "The Race, the big one, won't drop by itself. Three weirs, up the three gullies. Turn the wheels."
- `d.halda7.b4` «Κόντρα στο νερό τούς γυρνάς. Έτσι τους έφτιαχναν: να θέλουν δύο χέρια και λίγη ντροπή.» / "You turn them against the water. They made them that way: to need both hands and a little shame."
- `d.halda7.b5` «Το νερό δεν το σταματάς. Του δείχνεις δρόμο.» / "You don't stop water. You show it a road." (the act's rule)
- `d.halda7.b6` «Κι εσύ κάτσε μια στιγμή πρώτα. Έχεις μάτια σαν καμίνι που δεν το σκέπασε κανείς τρεις μέρες.» / "And you, sit a moment first. You've eyes like a forge nobody has banked for three days." (the inner line)
- Repeat line: `d.halda7.again` «Πάρε ό,τι χρειάζεσαι. Το μικρό αμόνι το κουβάλησα ως εδώ· μη μου πεις πως δεν θα το χρησιμοποιήσεις.» / "Take what you need. I carried the small anvil all this way; don't tell me you won't use it."
- Ranger: `d.halda7.again.r` «Πάρε ό,τι χρειάζεσαι. Και πες στον λύκο σου να μην ουρλιάζει κοντά στις φωλιές. Ή να ουρλιάζει, αν ξέρεις τι κάνεις.» / "Take what you need. And tell your wolf not to howl near the dens. Or to howl, if you know what you're doing." (teaches the class hook: the spirit wolf's howl wakes a den)

**Each weir** (interact kind `weir7`; prompt `weir.turn` «Γύρνα τον τροχό» / "Turn the wheel"; a 2 s channel; flag `weirN` saved first):
1. The wheel turns against the water; the Race drops one step along its whole length; the snow draws back (`setThaw`). Toast `q.weirOpen` «Ένα νερόθυρο άνοιξε ({0}/3)» / "A weir stands open ({0}/3)"
2. The next **memory in stone** plays, in count order whichever gully was taken first (Act VI's guard), from the mason's mark cut in the wheel's sill: Memories 1-3 below. Then the buff toast `lamp.buff7` «Μνήμη των Λιθογενών: +12% ζημιά, +8% ταχύτητα για 60 δευτ.» / "Memory of the Stoneborn: +12% damage, +8% speed for 60s"
3. On the third: big toast `q.raceLow` «Το Ρέμα κατέβηκε» / "The Race runs low", then `setQuest(42)`.

**Halda at the Den's approach** (after the third weir she stands on the gravel bar south of the arena, spot `haldaDen`, outside its radius; "!" until `haldaDen7`):
- `d.halda7.w1` «Τρία σκαλιά κάτω. Άκου το: δεν φωνάζει πια. Μιλάει.» / "Three steps down. Hear it: it's stopped shouting. It's talking."
- `d.halda7.w2` «Η Νεροσκάλα είναι απέναντι, κάτω απ' τον γκρεμό. Κάτι όμως φωλιάζει στη ρίζα της. Είδα πατημασιές σαν το αμόνι μου.» / "The Water-stair's across there, under the cliff. But something's denned at its foot. I saw tracks the size of my anvil."
- `d.halda7.w3` «Οι βοσκοί τη λένε Καλλιστώ. Κάθε χρόνο ξυπνά τελευταία απ' όλες. Φέτος το νερό μπήκε στη φωλιά της έναν μήνα νωρίς.» / "The shepherds call her Kallisto. Every year she's the last of them to wake. This year the water got into her den a month early."
- Ranger: `d.halda7.w3.r` «Οι βοσκοί τη λένε Καλλιστώ. Φέτος το νερό μπήκε στη φωλιά της έναν μήνα νωρίς. Εσύ είσαι του δάσους· ξέρεις τι είναι αρκούδα με μικρό.» / "The shepherds call her Kallisto. This year the water got into her den a month early. You're of the wood; you know what a bear with a cub is."

Before `kallistoRest` the exit to the lake is locked: `d.waterStairShut` «Η Νεροσκάλα είναι πίσω από τη φωλιά. Και η φωλιά δεν είναι άδεια.» / "The Water-stair lies behind the den. And the den is not empty."

### q42: Kallisto, the Waking Bear (`thaw`, the Den)

Name and tagline: `mon.kallisto` «Καλλιστώ, η Αρκούδα που Ξύπνησε» / "Kallisto, the Waking Bear"; `mon.kallisto.t` «Ξύπνησε νωρίς, και πεινάει» / "She woke early, and she is hungry". The quest names her by title (canon §5.4).

**Wake** (the boss's own wake radius; no flag, no cine: a `say` over her `rear` clip so the fight starts at once):
- `d.kall.0` «Στη ρίζα της Νεροσκάλας κάτι σηκώνεται από τη λάσπη. Είναι μουσκεμένη, αδύνατη απ' τον χειμώνα, και πολύ μεγάλη.» / "At the foot of the Water-stair something gets up out of the mud. She is soaked, winter-thin, and very large."

**Halda's fail-safe calls** (decisions rule 6). She stands at `haldaDen`, on the rim. One `say` per phase, fired once, on the phase's entry move; each names the phase's one thing in words a player who read nothing can act on:
- Phase 1 (the charge breaks on rock): `d.halda7.k1` «Ορμάει ίσια! Βάλε έναν βράχο ανάμεσά σας κι άσ' τη να σπάσει πάνω του!» / "She charges straight! Put a boulder between you and let her break on it!" (it answers Elati's shipped `d.elati.stones` «Το Λευκό Ελάφι ορμάει σαν τις αρκούδες… Βάλε μια πέτρα ανάμεσά σας»: now it is a bear)
- Phase 2 (Cornered; rear and slam; no water moves in her fight, the lead's ruling): `d.halda7.k2` «Τη στρίμωξες, και τώρα είναι χειρότερη! Όταν σηκωθεί στα πίσω πόδια, μακριά της!» / "You've cornered her, and she's worse for it! When she rears, get clear of her!"
- Phase 3 (the roar's slides): `d.halda7.k3` «Ακούει το μικρό της και δεν σταματά! Όταν μουγκρίζει στον γκρεμό, έξω απ' τις άσπρες λουρίδες!» / "She hears her cub and won't stop! When she roars at the cliff, get out of the white lanes!" (it does not count the charges, because Wanderer has no second one)

**The end: she is not killed** (flag `kallistoRest` saved first; cine at pitch 0.35, 12 s; the `kill` event fires as for any boss, so loot and the legendary follow the shipped route):
- `d.kall.1` «Δεν πέφτει. Κάθεται, σαν κάτι πολύ κουρασμένο, και σε κοιτάζει.» / "She does not fall. She sits down, like something very tired, and looks at you."
- `d.kall.2` «Από τη φωλιά βγαίνει ένα αρκουδάκι και τρίβεται πάνω της.» / "Out of the den comes a cub, and rubs against her."
- Ranger: `d.kall.2.r` «Από τη φωλιά βγαίνει ένα αρκουδάκι και τρίβεται πάνω της. Το πνεύμα του λύκου σου κάθεται κι αυτό.» / "Out of the den comes a cub, and rubs against her. Your spirit wolf sits down too."
- Halda: `d.halda7.k4` «Άφησέ τη. Το ποτάμι κατέβηκε και τα ψάρια φαίνονται. Εσύ της έστρωσες το τραπέζι.» / "Leave her. The river's down and the fish are showing. You laid her table." (the weirs the hero opened are what feeds her)
- `d.kall.3` «Η αρκούδα μπαίνει στο ρηχό νερό και βγάζει ένα ψάρι. Το δίνει στο μικρό. Αύριο δεν θα σας θυμάται.» / "The bear wades into the shallows and brings out a fish. She gives it to the cub. Tomorrow she will not remember you."
- Halda: `d.halda7.k5` «Ξύπνησε έναν μήνα νωρίς και θύμωσε με όλο τον κόσμο. Σου θυμίζει κανέναν;» / "Woke a month early and took it out on the whole world. Remind you of anyone?" (the inner line)
- Toast `q.stairOpen` «Η Νεροσκάλα άνοιξε» / "The Water-stair stands open"; `setQuest(43)`.

After it she is a seated, then sleeping, actor by the den with the cub (the echo's spot). She is never hostile again outside the echo.

### q43: the Water-stair and the arrival (`tarn`)

Zone: `zone.tarn` «Η Κρεμαστή Λίμνη» / "The Hanging Lake"; subtitle `zone.tarn.s` «Χίλιοι χειμώνες νερό» / "A thousand winters of water". Level 43, noon on a snowfield. Exit `exit.tarn` «Η Νεροσκάλα» / "The Water-stair", waypoint `wp.tarn` «Η Κορφή της Νεροσκάλας» / "The Stair's Head".

**Arrival cine** (flag `tarnSeen` saved first; pitch 0.3 from the Stair's Head north across the snowfield to the lake, 10 s; `ATMOS.tarnCine`):
- `d.tarn.1` «Πάνω από τα δέντρα, χιόνι στον ήλιο του μεσημεριού. Στο βάθος, μια λίμνη γαλαζοπράσινη, σαν αυγό πουλιού.» / "Above the trees, snow in the noon sun. At the far end, a lake the colour of a bird's egg."
- `d.tarn.2` «Πίσω της, ένας τοίχος από παλιό πάγο. Μέσα στον πάγο, ένα σχήμα καθιστό, μεγάλο σαν σπίτι.» / "Behind it, a wall of old ice. In the ice, a seated shape the size of a house."
- Halda, a `say`, low: `d.halda7.t0` «...Είναι αλήθεια, λοιπόν.» / "...It's true, then."
- `setQuest(44)`.

**Halda at the Stair's Head camp** ("!" until `haldaHead7`). The act's lore, in her voice, lowered:
- `d.halda7.t1` «Θα σου πω κάτι που οι δικοί μου δεν λένε. Όχι επειδή το ξέχασαν. Επειδή δεν το ξέχασαν.» / "I'll tell you something my people don't say. Not because they forgot it. Because they didn't."
- `d.halda7.t2` «Τα νερόθυρα δεν χτίστηκαν σε βράχο. Χτίστηκαν πάνω σε κάποιον που κοιμάται. Οι βοσκοί τον έλεγαν Κέλαδο: τη βουή του νερού.» / "The water-gates weren't built on rock. They were built on someone asleep. The shepherds called him Kelados: the roar of water."
- `d.halda7.t3` «Εμείς τον λέγαμε ο Κοιμισμένος, και χαμηλόφωνα. Δεν είναι κακός. Είναι μεγάλος. Άλλο πράγμα.» / "We called him the Sleeper, and quietly. He isn't wicked. He's big. That's a different thing."
- `d.halda7.t4` «Τρία βαρούλκα σηκώνουν τις αλυσίδες των νερόθυρων. Είναι πιασμένα στον πάγο. Λιώσ' τα με την Κούνια, μαλακά.» / "Three winches lift the water-gates' chains. They're locked in ice. Thaw them with the Cradle, gently."
- Mage: `d.halda7.t4.m` «Τρία βαρούλκα σηκώνουν τις αλυσίδες των νερόθυρων. Είναι πιασμένα στον πάγο. Εσύ δεν θες Κούνια γι' αυτό, μάγε. Μόνο μην το παρακάνεις.» / "Three winches lift the water-gates' chains. They're locked in ice. You don't need a Cradle for that, mage. Just don't overdo it." (the class hook: fire frees a winch without the Cradle)
- `d.halda7.t5` «Και μη χτυπήσεις σίδερο εκεί πάνω. Το σφυρί μου το 'φερα από συνήθεια. Θα μείνει στη ζώνη μου.» / "And strike no iron up there. I brought my hammer out of habit. It stays in my belt."
- `d.halda7.t6` «Η αρκούδα ξύπνησε νωρίς, το βουνό πάει να ξυπνήσει, κι εσύ δεν κοιμάσαι καθόλου. Κάτι έπαθε ο ύπνος φέτος.» / "The bear woke early, the mountain's about to wake, and you don't sleep at all. Something's happened to sleep this year." (the inner line)
- Repeat line: `d.halda7.tagain` «Πάρε ό,τι χρειάζεσαι. Και περπάτα όπως σε σπίτι που κοιμάται μωρό.» / "Take what you need. And walk as you would in a house where a baby's asleep."
- Mage: `d.halda7.tagain.m` «Πάρε ό,τι χρειάζεσαι. Κι εσύ με τις παγωνιές σου: ό,τι ξυπνά ο ήλιος, εσύ το ξανακοιμίζεις. Χρήσιμο, φέτος.» / "Take what you need. And you with your frosts: what the sun wakes, you put back to sleep. Handy, this year." (the class hook: frost puts the Icebound back to sleep)

A player who skips this talk still gets the stake at the wake (`d.halda7.s0`, `s0b`).

### q44: the three winches (`tarn`)

**Each winch** (interact kind `winch7`; prompt `winch.thaw` «Λιώσε τον πάγο του βαρούλκου» / "Thaw the winch's ice"; a 2 s channel with the Cradle; flag `winchN` saved first): the chain runs free; toast `q.winchFree` «Ένα βαρούλκο λύθηκε ({0}/3)» / "A winch runs free ({0}/3)"; then the next memory in count order (Memories 4-6) and the buff toast.

**On the third,** after Memory 6 (whose last line is the reason the works froze), **the wake** (flag `keladosWake` saved first; cine at pitch 0.3 toward the Dam, 9 s, with a camera shake and the snow cap sliding off the shape):
- `d.kel.w1` «Η τρίτη αλυσίδα σηκώνεται. Κάτω απ' τα πόδια σου, το βουνό παίρνει μια ανάσα.» / "The third chain lifts. Under your feet the mountain takes a breath."
- `d.kel.w2` «Ο πάγος του φράγματος ραγίζει από πάνω ως κάτω. Το σχήμα μέσα του σηκώνει τον ώμο του.» / "The ice of the dam cracks from top to bottom. The shape inside it lifts its shoulder."
- Halda, running up to the rim (spot `haldaDam`): `d.halda7.s0` «Τον ξυπνήσαμε. Τόσους αιώνες με πανιά στα σφυριά, κι εμείς τον ξυπνήσαμε μ' ένα τζάκι.» / "We woke him. All those ages with cloth round the hammers, and we woke him with a hearth."
- `d.halda7.s0b` «Αν ρίξει το φράγμα, η λίμνη κατεβαίνει μια φορά. Κοίμισέ τον. Δεν ξέρω πώς. Εσύ ξέρεις από τέτοια.» / "If he brings the dam down, the lake comes down once. Put him back to sleep. I don't know how. You know about such things."
- `setQuest(45)`. The boss is held (`a.holdWake`) until this flag, the hook Karthax uses.

### q45: Kelados, the Sleeper under the Mountain (`tarn`, the Dam)

Name and tagline: `mon.kelados` «Κέλαδος, ο Κοιμισμένος του Βουνού» / "Kelados, the Sleeper under the Mountain"; `mon.kelados.t` «Το βουνό σηκώνει τον ώμο του» / "The mountain lifts its shoulder". He has **no line** in the act: no intro, no phase shout, no death words. The mountain's sound is his voice (the audio part's tremor).

**Why it is a fight.** He is not attacking Whitecliff; he is waking badly. Every tremor loosens the dam. Beating him down is how he is got to sit, and the lake falls one step each phase, so the fight itself lets the water down by steps.

**Halda's fail-safe calls,** from `haldaDam`, one per phase:
- Phase 1 (ice-bound; what he throws stays as cover; the slides): `d.halda7.s1` «Είναι ακόμα πιασμένος ως τη μέση! Ό,τι πετάει, μένει εκεί που πέφτει: κρύψου πίσω του όταν κατεβαίνει το χιόνι!» / "He's still held to the waist! What he throws stays where it lands: get behind it when the snow comes down!"
- Phase 2 (loosed; the X of slides; a cloud's shade slows him): `d.halda7.s2` «Λύθηκε, περπατάει! Τα χιόνια πέφτουν σταυρωτά: κράτα μια γωνιά καθαρή. Κι όταν τον σκεπάζει σύννεφο, πάρε ανάσα!» / "He's loose, he's walking! The slides fall crosswise: keep one corner clear. And when a cloud covers him, catch your breath!"
- Phase 3 (the sluice levers): `d.halda7.s3` «Οι μοχλοί στο χείλος! Άνοιξε το νερό κάτω απ' τα πόδια του!» / "The levers on the rim! Open the water under his feet!"
- **The fail-safe proper** (proposed to the mechanics part): if no lever has been pulled 25 s into phase 3, Halda pulls the nearest one herself, once, with `d.halda7.s3b` «Δεν προλαβαίνεις; Τραβάω εγώ έναν! Φέρ' τον στο αυλάκι!» / "No time? I'll pull one myself! Bring him to the channel!" Precedent: Glaukos's `d.glaukos.k3b` in the Ketos's fight. It shortens nothing by rule (decisions rule 1: nothing is needed to finish a boss); it only shows the phase's one thing.

**The end: he is not killed** (flag `keladosRest` saved first; cine at pitch 0.3, 16 s; the last two plates of ice fall; the `kill` event fires as shipped):
- `d.kel.r1` «Γονατίζει. Το νερό τρέχει ανάμεσα στα δάχτυλά του.» / "He kneels. Water runs between his fingers."
- `d.kel.r2` «Σε κοιτάζει όπως κοιτάζει κάποιος που τον ξύπνησαν και δεν ξέρει γιατί.» / "He looks at you the way someone looks who has been woken and does not know why."
- `d.kel.r3` «Του λες τη λέξη που σου άφησε ο Ίσαρν: Ξεκουράσου.» / "You tell him the word Isarn left you: Rest." (the wording of `d.rest6`, kept)
- `d.kel.r4` «Γέρνει πίσω στην πλαγιά. Ως το βράδυ θα είναι πάλι βουνό.» / "He leans back against the slope. By evening he will be mountain again."
- `d.kel.r5` «Το πεύκο στον ώμο του δεν έχασε ούτε μια βελόνα.» / "The pine on his shoulder has not lost a needle."
- Big toast `q.keladosRest` «Ο Κοιμισμένος κοιμάται ξανά» / "The Sleeper sleeps again"; `setQuest(46)`.

Halda says nothing here. What she has to say about that word she says at home.

### q46: the lake let down, and the way home

**The great wheel** (interact at the Dam's west lip; prompt `sluice.open` «Άνοιξε τα νερόθυρα» / "Open the sluices"; 2 s; flag `lakeLet` saved first). Cine at pitch 0.3, 14 s, in the low gold light (`ATMOS.tarnGold`): the lake goes over the lip and down the Water-stair.
- `d.lake.1` «Γυρίζεις τον μεγάλο τροχό. Το νερό βρίσκει τη σκάλα του και την κατεβαίνει, σκαλί σκαλί, σαν άσπρη κλωστή.» / "You turn the great wheel. The water finds its stair and goes down it, step by step, like a white thread."
- `d.lake.2` «Στον αφρό στέκεται ένα ουράνιο τόξο. Κάτω, η κοιλάδα είναι ακόμα εκεί, ολόκληρη.» / "A rainbow stands in the spray. Below, the valley is still there, all of it." ("all of it": the valley stands; the act's promise kept in one line)
- Halda: `d.halda7.e1` «Έτσι κατεβαίνει το νερό. Όχι όλο μαζί. Η γιαγιά μου θα 'κλαιγε. Εγώ όχι. Είναι ο αφρός.» / "That's how water comes down. Not all at once. My grandmother would've wept. Not me. It's the spray."
- `d.halda7.e2` «Κάθε άνοιξη θα ανεβαίνει κάποιος να γυρίζει τους τροχούς. Με τη σειρά. Θα το πω στη Μπρόκα.» / "Every spring someone will climb up and turn the wheels. In turns. I'll tell Brokka." (the masons' promise, taken up again, in turns)
- `d.halda7.e3` «Πήγαινε σπίτι. Εγώ κατεβαίνω απ' τον κοντό δρόμο. Κι απόψε θα κοιμηθείς, μ' ακούς;» / "Go home. I'll take the short way down. And tonight you sleep, do you hear?"
- Big toast `q.lakeLet` «Η λίμνη βρήκε τον δρόμο της» / "The lake has found its road". The quest text becomes `q.46b` «Γύρνα στον Λευκόβραχο και κοιμήσου» / "Go home to Whitecliff, and sleep" Both zones take their after-readings (`green`, `let`). Halda leaves the zone; from now on she is in Whitecliff.

**Home:** by waypoint. See the ending.

---

## Memories in stone

**Form.** Six short memories on the critical path, three at the weirs (q41) and three at the winches (q44), each from a **mason's mark** cut in the stone beside the wheel. They are not a collectible (decisions: the Seven Fires are the act's only optional find; judge 2 cut the proposal's three optional marks), and they replace nothing: they are what the proposal's marks were for, moved onto the path so every player learns who built the gates and what sleeps under them, in order.

- The flow is Act IV's and VI's (`endLampMemory`, `playDeep`): a narrator dialog with pale figures standing by. New body class `memory-stone` (a grey-green palette swap of `memory-ice`) and narrator `npc.stoneMemory` «Μνήμη από πέτρα» / "A memory in stone"
- Figures: the masons are people.glb `smith` (Halda's body) in the memory material; the shepherds are `villager0-1`. No set loads.
- Line 1 anchors the time; one person speaks the key line; the last line is an image (canon §5.7). The masons speak plainly and without contractions, as memory does.
- Each grants the shipped memory buff under the name "Memory of the Stoneborn" (`lamp.buff7`).

**Memory 1, "The lake"** (weir, first turned):
- `d.mason.m1.1` «Πριν από το στέμμα, πριν από τις φρυκτωρίες. Λιθογενείς μάστορες στέκονται στο χείλος μιας λίμνης που κρέμεται πάνω από την κοιλάδα.» / "Before the crown, before the beacons. Stoneborn masons stand at the lip of a lake that hangs above the valley."
- `d.mason.m1.2` «Κάθε άνοιξη το νερό κατεβαίνει όλο μαζί και τους παίρνει τον δρόμο.» / "Every spring the water comes down all at once and takes their road with it."
- An old mason: `d.mason.m1.3` «Το νερό δεν το σταματάς. Του δείχνεις δρόμο.» / "You do not stop water. You show it a road."
- `d.mason.m1.4` «Χτίζουν μια σκάλα για το νερό, πριν χτίσουν μια για τον εαυτό τους.» / "They build a stair for the water before they build one for themselves."

**Memory 2, "The wheels"** (weir, second):
- `d.mason.m2.1` «Τρεις τροχοί από πέτρα και δρυ. Ο καθένας θέλει και τα δύο χέρια.» / "Three wheels of stone and oak. Each one needs both hands."
- `d.mason.m2.2` «Ένας νέος μάστορας ρωτά γιατί δεν τους έκαναν πιο ελαφριούς.» / "A young mason asks why they were not made lighter."
- The old mason: `d.mason.m2.3` «Για να μην τους γυρίσει ποτέ κανείς βιαστικά.» / "So that no one ever turns them in a hurry."
- `d.mason.m2.4` «Ο τροχός γυρίζει. Το ποτάμι κατεβαίνει ένα σκαλί, και μένει εκεί.» / "The wheel turns. The river drops one step, and stays there."

**Memory 3, "The roar"** (weir, third; where the name comes from):
- `d.mason.m3.1` «Οι βοσκοί της κοιλάδας ανεβαίνουν να δουν τι χτίζουν οι Λιθογενείς.» / "The valley's shepherds climb up to see what the Stoneborn are building."
- `d.mason.m3.2` «Την άνοιξη το βουνό βουίζει. Οι βοσκοί έχουν λέξη γι' αυτό: κέλαδος.» / "In spring the mountain roars. The shepherds have a word for it: kelados."
- A shepherd: `d.mason.m3.3` «Δεν είναι μόνο το νερό. Κάτι γυρίζει πλευρό εκεί πάνω.» / "It is not only the water. Something turns over in its sleep up there."
- `d.mason.m3.4` «Οι μάστορες δεν γελούν. Το έχουν ακούσει κι αυτοί.» / "The masons do not laugh. They have heard it too."

**Memory 4, "The shoulder"** (winch, first thawed):
- `d.mason.m4.1` «Στον τοίχο του πάγου οι μάστορες ψάχνουν βράχο να θεμελιώσουν.» / "At the wall of ice the masons look for rock to found on."
- `d.mason.m4.2` «Το καλέμι βρίσκει κάτι που δεν είναι πέτρα ούτε πάγος. Ανεβοκατεβαίνει, πολύ αργά.» / "The chisel finds something that is neither stone nor ice. It rises and falls, very slowly."
- A mason: `d.mason.m4.3` «Ώμος. Χτίζουμε πάνω σε ώμο.» / "A shoulder. We are building on a shoulder."
- `d.mason.m4.4` «Κανείς δεν μιλά ως το βράδυ.» / "No one speaks until evening."

**Memory 5, "The rule"** (winch, second):
- `d.mason.m5.1` «Δεν φεύγουν. Αλλάζουν εργαλεία: ξύλινες ματσόλες, πανιά γύρω από τα σφυριά.» / "They do not leave. They change their tools: wooden mallets, cloth round the hammers."
- `d.mason.m5.2` «Χτίζουν τα νερόθυρα στον ώμο του όπως σκεπάζεις κάποιον που κοιμάται.» / "They build the water-gates on his shoulder the way you cover someone who sleeps."
- The old mason: `d.mason.m5.3` «Εδώ πάνω δεν χτυπάμε σίδερο. Και κάτω, στα σπίτια μας, δεν λέμε τίποτα.» / "Up here we strike no iron. And down below, at home, we say nothing."
- `d.mason.m5.4` «Οι Λιθογενείς δεν ξεχνούν. Μερικά, όμως, δεν τα λένε.» / "The Stoneborn do not forget. Some things, though, they do not say."

**Memory 6, "The good night"** (winch, third; then the mountain lifts its shoulder):
- `d.mason.m6.1` «Η τελευταία μέρα της δουλειάς. Το νερό κατεβαίνει τη σκάλα του σαν κλωστή.» / "The last day of the work. The water goes down its stair like a thread."
- `d.mason.m6.2` «Η πιο γριά μαστόρισσα ακουμπά την παλάμη της στον πάγο.» / "The oldest of the masons lays her palm on the ice."
- The oldest mason: `d.mason.m6.3` «Κοιμήσου. Εμείς θα προσέχουμε το νερό.» / "Sleep. We will mind the water."
- `d.mason.m6.4` «Κράτησαν τον λόγο τους ώσπου η Βαθύπετρα γέμισε σκιές. Ύστερα δεν ανέβηκε κανείς.» / "They kept their word until the shadows filled Deepstone. After that, no one climbed up."

Memory 6 is the act's turn. The Sleeper slept because someone minded the water for him, which is Pherousa's definition of rest (`d.first.7`) a thousand winters before she said it; and he woke because for a hundred years nobody did.

---

## The lookouts (optional; the Seven Fires' people)

The hold event, its ranks and its rewards are the mechanics part's. The story supplies who is there and what they say. Each lookout is a villager (people.glb `villager0-2`, name `npc.lookout` «Βιγλάτορας» / "Lookout"), cut off by water or snow, **dry, well and in no danger**; lighting the hearth is how they tell the valley they are all right. One line before the hold, one shared line after it.

| # | where | line before the hold |
|---|---|---|
| 1 | `thaw`, the west knoll | `d.vigla.1` «Το νερό με έκλεισε εδώ πάνω από χτες. Δεν πειράζει· τα ξύλα είναι στεγνά. Βοήθα με ν' ανάψω, να ξέρουν κάτω πως είμαι καλά.» / "The water's had me shut in up here since yesterday. No matter; the wood's dry. Help me light it, so they know below that I'm all right." |
| 1, if `leifName` | the same lookout is Leif (×0.92, as Act VI) | `d.vigla.1l` «Πάλι άργησα με τα ξύλα. Αυτή τη φορά φταίει το ποτάμι. Βοήθα με ν' ανάψω, να το δει ο πατέρας.» / "Late with the wood again. This time it's the river's fault. Help me light it, so my father sees." (`d.leif.home` «Άργησα λίγο με τα ξύλα.») |
| 2 | `thaw`, the shoulder between two chutes: the "third peak" of the hook | `d.vigla.2` «Το χιόνι πήρε τη μισή μου στοίβα και άφησε εμένα. Καλή συμφωνία. Ανάβουμε;» / "The snow took half my woodpile and left me. Fair trade. Shall we light it?" |
| 3 | `thaw`, the lip of the Sun-terraces | `d.vigla.3` «Από δω φαίνεται όλη η κοιλάδα, κι ο Λευκόβραχος στο βάθος. Τόσο μικρός. Τον προσέχουμε από πολύ ψηλά.» / "You can see the whole valley from here, and Whitecliff at the far end. So small. We look after it from very high up." |
| 4 | `tarn`, the rock island in the snowfield | `d.vigla.4` «Τη νύχτα το χιόνι τρίζει σαν πάτωμα. Λέω πως είναι ο πάγος. Λέω.» / "At night the snow creaks like a floor. I tell myself it's the ice. I tell myself." |
| 5 | `tarn`, the wheel-house corner | `d.vigla.5` «Κοιμάμαι μέσα σε τοίχο Λιθογενών. Ποιος ξέρει πόσα χρόνια όρθιος. Οι δικοί μας δεν βγάζουν δέκα.» / "I sleep inside a Stoneborn wall. Who knows how many years it's stood. Ours don't last ten."; after `keladosWake`, his repeat line: `d.vigla.5b` «Σκάλα των Γιγάντων, τη λένε κάτω. Πάντα αναρωτιόμουν ποιων.» / "The Giants' Stair, they call it down below. I always wondered whose." |
| 6 | `tarn`, the skerry (reachable after the fight) | `d.vigla.6` «Ήμουν εδώ όταν σηκώθηκε. Δεν έτρεξα. Πού να τρέξεις, πάνω σε νησί;» / "I was here when he stood up. I didn't run. Where do you run to, on an island?" |

After any hold: `d.vigla.done` «Καίει. Πες στη Χάλντα πως κρατάμε.» / "It's burning. Tell Halda we're holding." With `firesAll`, the six stand in Whitecliff by day, one shared line: `d.vigla.home` «Κατεβήκαμε με τη σειρά μας. Απόψε είναι άλλος πάνω.» / "We came down in our turn. Someone else is up there tonight."

---

## Class variants

`rl()` picks `.r` for the Ranger and `.m` for the Mage where the key exists. No `.w`.

| key | class | why |
|---|---|---|
| `d.halda7.again.r` | Ranger | the spirit wolf's howl wakes a den (the class hook) |
| `d.halda7.w3.r` | Ranger | she is of the wood and knows a bear with a cub |
| `d.kall.2.r` | Ranger | the spirit wolf sits down too |
| `d.elati.v7.r` | Ranger | "our first spring", "sister" (every Evergreen beat has a kin line, canon §2.3) |
| `d.tam7.v1.r` | Ranger | "sister" |
| `d.halda7.t4.m` | Mage | fire frees a winch without the Cradle |
| `d.halda7.tagain.m` | Mage | frost puts back to sleep what the sun woke |

The Mage's Order is not mentioned in this act (Act VIII). Gendered grammar: no new line uses an adjective or participle for the hero, so none needs a variant for that.

---

## The home scene and the ending

**When.** On the first town entry after `lakeLet`. Flag `home7` is saved on arrival (it turns on the town's spring reading: the stream clear, the tree in blossom, the smokes). `homeCine7(z)` then plays, and **replays on any later town entry until `h.act7 >= 0`** (a session guard `z.home7`, as `homeCine` uses `z.home6`, story.js:2596), so a player who quits in the black still gets the last line.

**The scene** (dusk, `ATMOS.townDusk`; cine at pitch 0.3; Halda, the child and the hero at Isarn's staff; about 60 s with its dialogs):

1. `d.home7.1` «Δειλινό στον Λευκόβραχο. Το ρέμα κάτω απ' το χωριό τρέχει καθαρό και χαμηλό. Τα παιδιά έχουν βγάλει τα παπούτσια.» / "Dusk in Whitecliff. The stream below the village runs clear and low. The children have their shoes off." (the stream is heard, soft; it is the only water the town is shown)
2. Halda: `d.halda7.h1` «Κοίτα. Το δέντρο δίπλα στο ραβδί. Τόσα χρόνια, και δεν ήξερα πως ήταν μηλιά.» / "Look. The tree by the staff. All these years, and I never knew it was an apple tree." (one tree by the staff in blossom)
3. The child runs up: `d.child7.4` «Γύρισες! Το ρέμα δεν φωνάζει πια. Το άκουσα πρώτος.» / "You're back! The stream's stopped shouting. I heard it first."
4. `d.child7.5` «Η Χάλντα λέει πως κοίμισες ένα βουνό. Τώρα που τελείωσες, εσύ τι θα κάνεις;» / "Halda says you put a mountain to sleep. Now you're done, what will you do?"
5. Narration: `d.home7.2` «Δεν ξέρεις τι να απαντήσεις.» / "You do not know what to answer."
6. `d.child7.6` «Εγώ ξέρω. Θα κοιμηθείς. Κι εγώ θα σου πω καληνύχτα, όπως το λένε στον βορρά.» / "I know. You'll sleep. And I'll say good night to you, the way they do in the north." (`name.goodnight`; the Saltborn's custom, which this child was the first in the North to learn)
7. Halda: `d.halda7.h2` «Το είπες σ' ένα βουνό και σ' άκουσε. Άκου το τώρα κι εσύ: Ξεκουράσου.» / "You said it to a mountain and it listened. Now hear it yourself: Rest."
8. `d.halda7.h3` «Απόψε τη φωτιά την κρατάω εγώ. Έχω κρατήσει και πιο δύσκολες.» / "Tonight I keep the fire. I've kept harder ones."
9. **Isarn's lantern (owner question 1; flag `lanternWake` saved first).** The staff's lantern takes a new state, `setLantern('awake')`: a small steady-warm flame.
   - `d.home7.3` «Παίρνεις ένα κάρβουνο από τη φρυκτωρία και το βάζεις στο σβηστό φανάρι του Ίσαρν, πάνω στο ραβδί. Η φλόγα ξυπνά, μικρή.» / "You take a coal from the beacon and set it in Isarn's dark lantern, on the staff. The flame wakes, small."
   - `d.home7.4` «Κανείς δεν θα το κουβαλήσει πια. Κρέμεται εδώ, κι όποιος περνά του ρίχνει μια ματιά.» / "No one will carry it any more. It hangs here, and whoever passes gives it a glance."
10. The child: `d.child7.7` «Καληνύχτα, φρυκτωρέ.» / "Good night, beacon-keeper."
11. The camera lifts north over the beacon. On the skyline the seven day-smokes turn to fires one after another (the shipped `setFar` rows 7-12 and Arna's hill, 1 s apart, each with the low bell of Act VI's ending). `d.home7.5` «Ξαπλώνεις δίπλα στη φρυκτωρία. Στις εφτά κορυφές οι καπνοί γίνονται φωτιές, η μία μετά την άλλη.» / "You lie down beside the beacon. On the seven peaks the smokes turn to fires, one after another."
12. **The line before the sleep:** `d.sleep7.1` «Ο Βορράς ξυπνά, και δεν φοβάται.» / "The North wakes, and is not afraid." (it answers `d.answer6.3` «Ο Βορράς κοιμάται με τα φώτα αναμμένα.»)
13. `d.sleep7.2` «Κοιμάσαι. Κάποιος άλλος κρατά το φως.» / "You sleep. Someone else keeps the light." (`d.first.7`, carried out on screen)
14. **The screen goes black for four seconds.** No text, no music; the fire's crackle, far off, and at the third second one soft bell.
15. The screen comes up on morning (`ATMOS.townMorning`, the hook's light). The child is standing by the bed-roll at the beacon. **The act's last line, and the game's first** (`d.isarn.1`): `d.child7.wake` «Ώστε ξύπνησες.» / "So you're awake."
16. `actComplete(7)` (quest 47, `h.act7 = max(h.act7, h.diff)`, `flags.act7`), then `offerBoons()` for `BOONS[7]`.

**If the owner says no to the lantern:** step 9's two lines and the `awake` state are dropped; the lantern stays dark, as shipped; nothing else changes.

**The act panel.** `act7.done` «Πράξη VII — Ολοκληρώθηκε» / "Act VII — Complete"; `act7.sub` «Το νερό βρήκε τον δρόμο του» / "The water found its road"; `act7.next` «Οι Σκιοπύλες σε περιμένουν. Κι εφτά φωτιές, στις κορυφές.» / "The Shadow Gates await. And seven fires, on the peaks." (it points at the Seven Fires, the post-game the act adds, and promises no Act VIII).

**End state.** `q.47` «Η άνοιξη ήρθε στον Βορρά, και το νερό βρήκε τον δρόμο του. Οι Σκιοπύλες σε περιμένουν.» / "Spring has come to the North, and the water has found its road. The Shadow Gates await."

**Title screen.** `game.sub7` «Ο Βορράς ξυπνά» / "The North wakes", once any saved hero has `act7 >= 0` (after `game.sub6` «Ακόμα και το σκοτάδι κοιμάται»).

**Rested.** When the mechanics part's Rested greeting fires on a later return, it is the same key, in the child's mouth: `d.child7.wake`.

---

## After the act: the state, and one new line for everyone alive

| who | where | state, and the new line |
|---|---|---|
| **The hero** | Whitecliff | Has slept one whole night while someone else kept the light. |
| **Halda** | her forge | Back at the anvil. First talk (`haldaV8`): `d.halda7.v8` «Τη φύλαξα ως το πρωί. Δεν έκανε τίποτα. Καίει και μόνη της, η άτιμη. Το 'ξερες αυτό;» / "I kept it till morning. It did nothing. Burns by itself, the wretch. Did you know that?" (it pays off `d.child7.2`). Then her repeat: `d.halda7.v9` «Πήγα, είδα, γύρισα. Το σπαθί σου, πάντως, θέλει ακόμα δουλειά.» / "Went, saw, came back. Your blade still needs work, mind." (`d.halda.1`) |
| **The child** | by the beacon | `d.child.bark7` «Κοιμήθηκες ως το πρωί. Το μέτρησα: δεν σηκώθηκες ούτε μία φορά.» / "You slept till morning. I counted: you didn't get up once." (the hook's "three times", undone) |
| **Elianthe** | Whitecliff | `d.elianthe7.v1` «Κοιμήθηκες. Φαίνεται στα μάτια σου. Το μαξιλάρι κράτα το.» / "You slept. It shows in your eyes. Keep the pillow." And, in rotation, the one line that points south: `d.elianthe7.v2` «Το ρέμα πάει νότια. Δεν ρώτησα ποτέ πού καταλήγει.» / "The stream runs south. I never asked where it ends up." |
| **Leif** (if `leifHome`) | Whitecliff, or lookout 1 | `d.leif.bark7` «Στεγνά ξύλα, επιτέλους. Κι όποιος ανεβαίνει απόψε, αύριο κοιμάται. Έτσι το κανονίσαμε.» / "Dry wood at last. And whoever goes up tonight sleeps tomorrow. That's how we've arranged it." |
| **Leif's father** (if `leifName`) | Whitecliff | `d.v.son7` «Ο Λέιφ είναι στην τρίτη κορυφή απόψε. Το ξέρω, και κοιμάμαι.» / "Leif's on the third peak tonight. I know it, and I sleep." (`d.v.3` «Δεν γύρισε.», answered a second time) |
| **Villagers** | Whitecliff | `d.v7.3` «Τα παιδιά γύρισαν από το ρέμα με λάσπη ως τ' αυτιά. Να 'ναι καλά η Χάλντα.» / "The children came back from the stream muddy to the ears. Bless Halda." |
| **The lookouts** | the six huts; in town with `firesAll` | `d.vigla.done`, `d.vigla.home` |
| **Brokka** | the Halls of Deepstone | First talk after `act7` (`brokkaV7b`): `d.brokka7.3` «Η στοά στέγνωσε. Κι η Χάλντα ήρθε ως εδώ να μου πει για τ' αστέρια. Τρεις ώρες. Την πίστεψα στη δεύτερη.» / "The gallery's dry. And Halda came all this way to tell me about the stars. Three hours. I believed her by the second." (`d.halda.aur` «Στη Βαθύπετρα δεν θα με πιστέψει κανείς.», paid; text only, Halda's model does not move zones). Then: `d.brokka7.4` «Του χρόνου ανεβαίνω εγώ να γυρίσω τους τροχούς. Με πανί στο σφυρί.» / "Next spring I'll go up and turn the wheels myself. With cloth round my hammer." |
| **Elati** | the Lanternglade | `d.elati.v7` «Η πρώτη άνοιξη ύστερα από εκατό χρόνια. Το βλαστάρι της Κυράς έβγαλε φύλλα. Δεν ήξερα αν θυμόταν πώς.» / "The first spring in a hundred years. The Lady's sapling has put out leaves. I didn't know if it remembered how." (`act3.sub`, a season on) |
| | Ranger | `d.elati.v7.r` «Η πρώτη μας άνοιξη ύστερα από εκατό χρόνια, αδελφή. Το βλαστάρι της Κυράς έβγαλε φύλλα. Δεν ήξερα αν θυμόταν πώς.» / "Our first spring in a hundred years, sister. The Lady's sapling has put out leaves. I didn't know if it remembered how." |
| **Tamarisk** | the Lanternglade (if `act6`) | `d.tam7.v1` «Στον βορρά ο πάγος δεν λιώνει. Εδώ λιώνει, κι από κάτω βγαίνουν λουλούδια. Κάποιος έπρεπε να μου το 'χε πει.» / "In the north the ice doesn't melt. Here it melts, and there are flowers under it. Someone should've told me." |
| | Ranger | `d.tam7.v1.r` «Στον βορρά ο πάγος δεν λιώνει, αδελφή. Εδώ λιώνει, κι από κάτω βγαίνουν λουλούδια. Εσύ το ήξερες και δεν μου το 'πες.» / "In the north the ice doesn't melt, sister. Here it melts, and there are flowers under it. You knew, and you never told me." |
| **Selna** | the Farthest Light | `d.selna.v7` «Ο πάγος μας κρατά. Η φωτιά της είναι βαθιά και μικρή· τα βουνά σας είναι πιο κοντά στις πύλες. Και λέω ακόμα τα ονόματα, κάθε βράδυ.» / "Our ice holds. Her fire is deep and small; your mountains lie nearer the gates. And I still say the names, every night." (no contractions; she keeps the rite unchanged) |
| **Tern** | the Farthest Light | `d.tern.v7` «Ο ήλιος γύρισε κι εδώ. Η γιαγιά λέει πως κοίμισες ένα βουνό. Εγώ κρατάω ακόμα το σκοινί, αν θες να ξανακατέβεις.» / "The sun's come back here too. Grandmother says you put a mountain to sleep. I'm still holding the rope, if you want to go down again." (`d.alk.c3`: the sun is back in the far north; `d.tern.r1`) |
| **Alkyone** | the Landing | `d.alk.v7` «Έμαθα πως κοιμήθηκες μια νύχτα ολόκληρη. Καιρός ήταν. Εγώ το έμαθα φέτος.» / "I hear you slept a whole night. About time. I only learnt how this year." (`d.alk.after6` «Ύστερα κοιμάμαι.») |
| **Glaukos** | the Rope camp by day | `d.glaukos.v7` «Λένε πως κοιμήθηκες. Εγώ κοιμάμαι τα μεσημέρια, πενήντα χρόνια. Έτσι αντέχω τις νύχτες.» / "They say you slept. I've slept at noon for fifty years. That's how I last the nights." (`d.glaukos.e1`: fifty years) |
| **Linden; Amaranthe's sapling** | the Weeping Woods | Trees. The sapling is in leaf (Elati's line). No line of their own. |
| **Pherousa; the Skotos** | below | Asleep, as Act VI left them. Not seen, no line. |
| **Kallisto and the cub** | the Den, `green` reading | Fed and asleep by the den. The echo's spot: `echo.kallisto` «Θυμήσου την Καλλιστώ» / "Remember Kallisto" |
| **Kelados** | the Dam, `let` reading | A moss-grown shape in the slope with a pine on his shoulder; the lake a third of its size. The echo is his dream, not a waking: `echo.kelados` «Άκου τι ονειρεύεται το βουνό» / "Hear what the mountain dreams" Echo toasts: `echo.rise7` «Το νερό θυμάται τη μάχη...» / "The water remembers the fight..."; `echo.done7` «Η ηχώ σβήνει. Το νερό θα θυμηθεί ξανά αύριο.» / "The echo fades. The water will remember again tomorrow." |
| **Isarn's staff** | Whitecliff | Still says «Ξεκουράσου.» and opens the Gates, exactly as shipped. With `lanternWake`, its lantern burns, small. |
| **Whitecliff** | | By day seven thin smokes on the skyline, by night seven fires; the stream clear; one apple tree in blossom by the staff. |

Halda and Brokka's promise (`d.halda7.e2`, `d.brokka7.4`) is the act's shared watch: someone climbs each spring to turn the wheels, in turns. Nobody is left alone with anything.

---

## Lines at home during the act

Talk variants on flags; no model loads beyond the child's `frost` set, which the town has loaded since quest 24.

**Whitecliff, while `call7` and not `home7`:**
- Elianthe: `d.elianthe7.v0` «Τρεις νύχτες σε βλέπω πάνω στη φρυκτωρία πριν φέξει. Φίλτρο γι' αυτό δεν έχω. Έχω ένα μαξιλάρι.» / "Three nights I've seen you up at the beacon before dawn. I've no potion for that. I do have a pillow."
- Leif (if `leifHome`): `d.leif.v7` «Ξύλα για εφτά κορυφές, κι όλα μουσκεμένα. Το χιόνι λιώνει πάνω στις στοίβες μου.» / "Wood for seven peaks, and all of it soaked. The snow's melting onto my stacks."
- Villagers, two new barks in the rotation: `d.v7.1` «Το ρέμα δεν το θυμάμαι ποτέ τόσο θυμωμένο. Η γιαγιά μου θα 'λεγε: το βουνό ξεπλένεται.» / "I've never known the stream so angry. My grandmother would've said: the mountain's washing itself." and, once `haldaOut`: `d.v7.2` «Η Χάλντα έκλεισε το καμίνι και πήρε το βουνό. Η Χάλντα! Κάτι σοβαρό τρέχει.» / "Halda's shut the forge and taken to the mountain. Halda! Something serious is up."
- The child: `d.child7.bark` «Το ρέμα φωνάζει. Η μάνα μου δεν μ' αφήνει να κατέβω. Έχει δίκιο, ε;» / "The stream's shouting. My mother won't let me go down to it. She's right, isn't she?" (a child kept away from loud water, and agreeing: the only safety lesson the act preaches)
- Halda's anvil: `d.anvil7`, above.
- Isarn's staff: the shipped «Ξεκουράσου.» and the Gates panel, nothing added. It is the line the hero is not yet keeping.

**The Halls of Deepstone, while `call7` and not `act7`** (Brokka; "!" until `brokkaV7a`):
- `d.brokka7.1` «Ξένε. Η τρίτη στοά στάζει. Εκατό χρόνια άκουγα το καμίνι· τώρα ακούω σταγόνες. Δεν ξέρω ποιο με κρατά πιο ξύπνια.» / "Stranger. The third gallery's dripping. A hundred years I listened to the forge; now I listen to drops. I don't know which keeps me wider awake."
- `d.brokka7.2` «Η Χάλντα ανέβηκε στη λίμνη; Τότε ξέρει τι κοιμάται εκεί. Όλοι το ξέρουμε. Οι Λιθογενείς δεν ξεχνούν, ξένε· γι' αυτό ξέρουμε και τι δεν λέμε.» / "Halda's gone up to the lake? Then she knows what sleeps there. We all know. The Stoneborn don't forget, stranger; that's how we know what not to say."

**The Lanternglade, while `call7` and not `act7`** (Elati, one bark): `d.elati.v7a` «Το δάσος πίνει. Εκατό χρόνια δεν είχε πιει νερό από χιόνι.» / "The wood is drinking. A hundred years it had not tasted snow-water."

**The coast and the Farthest Light during the act:** unchanged. Their new lines come after it.

---

## Water with care (decisions rule 8), applied

Checked against every line and scene above:

- **On screen in town:** a stream that is loud and brown in the hook and clear and low at the end. No street, house or field is wet. Nothing else.
- **Said, not shown:** a gallery roof that drips (`d.halda7.a4`); the stake, once, in the conditional (`d.halda7.a6`, repeated once at the wake in `s0b`).
- **Nobody is drowned, swept away or missing.** The slide in the hook takes a woodpile, and the next line says the lookout is safe. Every lookout is dry and cheerful. No person is ever shown in water; the hero wades only pale water, by the mechanic's own rule.
- **Words not used in any player-facing line:** «πλημμύρα», «πνίγηκε», «παρασύρθηκε», «θύματα», and their English equivalents. The masons' Memory 1 says the water "takes their road", a road and not people.
- **The ending shows the valley standing** (`d.lake.2`) and children wading in a low clear stream (`d.home7.1`), after a child was kept away from it while it was loud (`d.child7.bark`).
- **What the other parts must change to match:** see Notes 3.

---

## Catch-ups and news (buildable notes)

On `zoneEnter`, quietly, in the Act IV-VI pattern (a flag saved while its quest change was still on a timer):

| zone | condition | does |
|---|---|---|
| town | `act6` done, quest 39, `!call7` | `hook7` |
| town | `call7`, quest < 40 | `setQuest(40)` |
| town | `haldaOut`, quest < 41 | `setQuest(41)`; Halda absent, the anvil interact present |
| `thaw` | `!thawSeen` | the arrival cine |
| `thaw` | `weir1 && weir2 && weir3`, quest < 42 | `setQuest(42)` |
| `thaw` | `kallistoRest`, quest < 43 | `setQuest(43)`; the bear seated, the exit open |
| `tarn` | `!tarnSeen` | the arrival cine; `tarnSeen` and quest < 44 → `setQuest(44)` |
| `tarn` | all winches, `!keladosWake` | the wake cine |
| `tarn` | `keladosWake`, quest < 45 | `setQuest(45)`; `keladosRest`, quest < 46 → `setQuest(46)` |
| town | `lakeLet`, `!home7` | save `home7`, `homeCine7` |
| town | `home7`, `h.act7 < 0` | `homeCine7` again |

A memory owed (a wheel turned or a winch thawed whose memory did not finish) plays on the next entry, as Act V's `memoryOwed()`.

`npcHasNews`: Halda in town (`call7 && !haldaOut`; after `act7`, `!haldaV8`), at the Goat Track (`!haldaCamp7`), at `haldaDen` (three weirs, `!haldaDen7`), at the Stair's Head (`!haldaHead7`); Brokka in the Halls (`call7 && !brokkaV7a`; `act7 && !brokkaV7b`); Elati after `act7` (`!elatiV7`). No "!" while either boss is up.

Halda's place is a function of flags, re-run on every entry because the zones are cached (`act7Presence(z)`): `thaw` camp → `haldaDen` (three weirs) → gone from `thaw` (`tarnSeen`); `tarn` camp → `haldaDam` (`keladosWake`) → the great wheel (`keladosRest`) → Whitecliff (`lakeLet`).

---

## Every new text key

**192 keys** in this part: 191 new, 1 replaced (`act6.next`); 7 of them are class variants (5 `.r`, 2 `.m`).

**Act panel, title screen, end state** (5)

| key | Greek | English |
|---|---|---|
| `act6.next` | Πράξη VII: Οι Εφτά Κορυφές. Μίλα με τη Χάλντα. | Act VII: The Seven Peaks. Speak with Halda. |
| `act7.done` | Πράξη VII — Ολοκληρώθηκε | Act VII — Complete |
| `act7.sub` | Το νερό βρήκε τον δρόμο του | The water found its road |
| `act7.next` | Οι Σκιοπύλες σε περιμένουν. Κι εφτά φωτιές, στις κορυφές. | The Shadow Gates await. And seven fires, on the peaks. |
| `game.sub7` | Ο Βορράς ξυπνά | The North wakes |

**Quest lines** (9)

| key | Greek | English |
|---|---|---|
| `q.40` | Μίλα με τη Χάλντα δίπλα στο ραβδί του Ίσαρν | Speak with Halda by Isarn's staff |
| `q.41` | Ανέβα στα Λιόνερα και άνοιξε τα παλιά νερόθυρα ({0}/3) | Climb to the Meltwaters and open the old weirs ({0}/3) |
| `q.42` | Πέρνα το Ρέμα: η Αρκούδα που Ξύπνησε φυλάει τη Νεροσκάλα | Cross the Race: the Waking Bear guards the Water-stair |
| `q.43` | Ανέβα τη Νεροσκάλα ως την Κρεμαστή Λίμνη | Climb the Water-stair to the Hanging Lake |
| `q.44` | Λιώσε τον πάγο από τα τρία βαρούλκα ({0}/3) | Thaw the ice off the three winches ({0}/3) |
| `q.45` | Αντίκρισε τον Κοιμισμένο του Βουνού | Face the Sleeper under the Mountain |
| `q.46` | Άνοιξε τα μεγάλα νερόθυρα της λίμνης | Open the lake's great sluices |
| `q.46b` | Γύρνα στον Λευκόβραχο και κοιμήσου | Go home to Whitecliff, and sleep |
| `q.47` | Η άνοιξη ήρθε στον Βορρά, και το νερό βρήκε τον δρόμο του. Οι Σκιοπύλες σε περιμένουν. | Spring has come to the North, and the water has found its road. The Shadow Gates await. |

**Toasts, prompts, names, places** (31)

| key | Greek | English |
|---|---|---|
| `q.weirOpen` | Ένα νερόθυρο άνοιξε ({0}/3) | A weir stands open ({0}/3) |
| `q.raceLow` | Το Ρέμα κατέβηκε | The Race runs low |
| `q.stairOpen` | Η Νεροσκάλα άνοιξε | The Water-stair stands open |
| `q.winchFree` | Ένα βαρούλκο λύθηκε ({0}/3) | A winch runs free ({0}/3) |
| `q.keladosRest` | Ο Κοιμισμένος κοιμάται ξανά | The Sleeper sleeps again |
| `q.lakeLet` | Η λίμνη βρήκε τον δρόμο της | The lake has found its road |
| `lamp.buff7` | Μνήμη των Λιθογενών: +12% ζημιά, +8% ταχύτητα για 60 δευτ. | Memory of the Stoneborn: +12% damage, +8% speed for 60s |
| `weir.turn` | Γύρνα τον τροχό | Turn the wheel |
| `winch.thaw` | Λιώσε τον πάγο του βαρούλκου | Thaw the winch's ice |
| `sluice.open` | Άνοιξε τα νερόθυρα | Open the sluices |
| `anvil.use` | Δούλεψε στο αμόνι της Χάλντας | Work at Halda's anvil |
| `npc.stoneMemory` | Μνήμη από πέτρα | A memory in stone |
| `npc.lookout` | Βιγλάτορας | Lookout |
| `mon.kallisto` | Καλλιστώ, η Αρκούδα που Ξύπνησε | Kallisto, the Waking Bear |
| `mon.kallisto.t` | Ξύπνησε νωρίς, και πεινάει | She woke early, and she is hungry |
| `mon.kelados` | Κέλαδος, ο Κοιμισμένος του Βουνού | Kelados, the Sleeper under the Mountain |
| `mon.kelados.t` | Το βουνό σηκώνει τον ώμο του | The mountain lifts its shoulder |
| `zone.thaw` | Τα Λιόνερα | The Meltwaters |
| `zone.thaw.s` | Εκεί που λιώνει το βουνό | Where the mountain melts |
| `zone.tarn` | Η Κρεμαστή Λίμνη | The Hanging Lake |
| `zone.tarn.s` | Χίλιοι χειμώνες νερό | A thousand winters of water |
| `exit.thaw` | Το Γιδόστρατο | The Goat Track |
| `exit.tarn` | Η Νεροσκάλα | The Water-stair |
| `wp.thaw` | Το Γιδόστρατο | The Goat Track |
| `wp.tarn` | Η Κορφή της Νεροσκάλας | The Stair's Head |
| `d.trackShut` | Ένα γιδόστρατο, μισοχαμένο στο χιόνι. Χωρίς κάποιον που το ξέρει, δεν πας πουθενά. | A goat track, half lost in snow. Without someone who knows it, you would get nowhere. |
| `d.waterStairShut` | Η Νεροσκάλα είναι πίσω από τη φωλιά. Και η φωλιά δεν είναι άδεια. | The Water-stair lies behind the den. And the den is not empty. |
| `echo.kallisto` | Θυμήσου την Καλλιστώ | Remember Kallisto |
| `echo.kelados` | Άκου τι ονειρεύεται το βουνό | Hear what the mountain dreams |
| `echo.rise7` | Το νερό θυμάται τη μάχη... | The water remembers the fight... |
| `echo.done7` | Η ηχώ σβήνει. Το νερό θα θυμηθεί ξανά αύριο. | The echo fades. The water will remember again tomorrow. |

**The hook (q40, Whitecliff)** (17)

| key | Greek | English |
|---|---|---|
| `d.spring.1` | Πέρασαν βδομάδες από τις αλκυονίδες. Ο πάγος στη στέγη της Χάλντας στάζει όλη νύχτα. | Weeks have passed since the halcyon days. The ice on Halda's roof drips all night. |
| `d.spring.2` | Τρίτη νύχτα στη σειρά που δεν κοιμάσαι. Σηκώνεσαι να δεις τη φωτιά. Καίει. Το ήξερες. | The third night running that you have not slept. You get up to look at the fire. It is burning. You knew it would be. |
| `d.spring.3` | Ξημερώνει ζεστά. Το ρέμα κάτω από το χωριό είναι καφετί και φωνάζει. | Day breaks warm. The stream below the village is brown and shouting. |
| `d.child7.1` | Πάλι δεν κοιμήθηκες. Σε είδα απ' το παράθυρο, τρεις φορές. | You didn't sleep again. I saw you from the window, three times. |
| `d.child7.2` | Η Χάλντα λέει πως η φωτιά καίει κι όταν δεν την κοιτάς. Εσύ δεν το πιστεύεις; | Halda says the fire burns even when you're not looking at it. Don't you believe that? |
| `d.child7.3` | Άκου το ρέμα. Χτες ψιθύριζε. | Listen to the stream. Yesterday it was whispering. |
| `d.spring.4` | Η Χάλντα στέκεται στο ραβδί του Ίσαρν, με την παλάμη πάνω από την πύλη, όπως πάνω από καμίνι. | Halda stands at Isarn's staff with her palm over the gate, as over a forge. |
| `d.halda7.a1` | Δεν κοιμήθηκες. Ούτε εγώ: όλη νύχτα άκουγα τη στέγη μου να στάζει. | You didn't sleep. Nor did I: all night I listened to my roof drip. |
| `d.halda7.a2` | Όλο τον χειμώνα ζεσταίναμε τα χέρια μας στην πύλη, και χαιρόμουν. Χαζή. Οι πύλες άνοιξαν και στα βουνά. | All winter we warmed our hands at the gate, and I was glad. Fool. The gates opened in the mountains too. |
| `d.halda7.a3` | Χίλιοι χειμώνες χιόνι, κι από κάτω του φυσάει ένα τζάκι. Κάνε τον λογαριασμό. | A thousand winters of snow, and a hearth blowing under it. Do the sum. |
| `d.halda7.a4` | Ήρθε λόγος απ' τη Βαθύπετρα. Η Μπρόκα λέει πως η τρίτη στοά στάζει απ' το ταβάνι. Εκατό χρόνια ήταν στεγνή. | Word's come from Deepstone. Brokka says the third gallery drips from its roof. A hundred years it was dry. |
| `d.halda7.a5` | Και πάνω απ' όλους μας κρέμεται μια λίμνη. Οι δικοί μου έχτισαν νερόθυρα εκεί πάνω, πολύ παλιά. | And above all of us hangs a lake. My people built water-gates up there, long ago. |
| `d.halda7.a6` | Αν ανοίγουν ακόμα, το νερό κατεβαίνει σιγά σιγά. Αν όχι, κατεβαίνει μια φορά. | If they still open, the water comes down a little at a time. If not, it comes down once. |
| `d.smoke.1` | Στην τρίτη κορυφή ο καπνός κόβεται. Ύστερα, μια άσπρη γλώσσα κατεβαίνει την πλαγιά. | On the third peak the smoke stops. Then a white tongue comes down the slope. |
| `d.smoke.2` | Λίγο μετά, ένας δαυλός κουνιέται στη ράχη. Ο βιγλάτορας πρόλαβε. Τα ξύλα του, όχι. | A little later a torch waves on the ridge. The lookout got clear. His woodpile did not. |
| `d.halda7.a7` | Αυτό ήταν. Έρχομαι. Τον χειμώνα ανέβηκα στις κορυφές για τ' αστέρια. Τώρα ανεβαίνω για δουλειά. | That settles it. I'm coming. This winter I climbed the peaks for the stars. Now I climb for work. |
| `d.halda7.a8` | Πάρε τον δρόμο του βουνού ως τη Σκάλα των Γιγάντων. Από κει ξέρω ένα γιδόστρατο. Και φέρε την Κούνια: εκεί πάνω ο πάγος θέλει πειθώ. | Take the mountain road to the Giants' Stair. From there I know a goat track. And bring the Cradle: the ice up there needs persuading. |

**Whitecliff while the act runs (barks)** (9)

| key | Greek | English |
|---|---|---|
| `d.elianthe7.v0` | Τρεις νύχτες σε βλέπω πάνω στη φρυκτωρία πριν φέξει. Φίλτρο γι' αυτό δεν έχω. Έχω ένα μαξιλάρι. | Three nights I've seen you up at the beacon before dawn. I've no potion for that. I do have a pillow. |
| `d.leif.v7` | Ξύλα για εφτά κορυφές, κι όλα μουσκεμένα. Το χιόνι λιώνει πάνω στις στοίβες μου. | Wood for seven peaks, and all of it soaked. The snow's melting onto my stacks. |
| `d.v7.1` | Το ρέμα δεν το θυμάμαι ποτέ τόσο θυμωμένο. Η γιαγιά μου θα 'λεγε: το βουνό ξεπλένεται. | I've never known the stream so angry. My grandmother would've said: the mountain's washing itself. |
| `d.v7.2` | Η Χάλντα έκλεισε το καμίνι και πήρε το βουνό. Η Χάλντα! Κάτι σοβαρό τρέχει. | Halda's shut the forge and taken to the mountain. Halda! Something serious is up. |
| `d.child7.bark` | Το ρέμα φωνάζει. Η μάνα μου δεν μ' αφήνει να κατέβω. Έχει δίκιο, ε; | The stream's shouting. My mother won't let me go down to it. She's right, isn't she? |
| `d.anvil7` | Το αμόνι της Χάλντας. Πάνω του, με κιμωλία: «Γυρίζω. Μην πειράξεις το μεγάλο σφυρί.» | Halda's anvil. Chalked on it: 'Back soon. Don't touch the big hammer.' |
| `d.brokka7.1` | Ξένε. Η τρίτη στοά στάζει. Εκατό χρόνια άκουγα το καμίνι· τώρα ακούω σταγόνες. Δεν ξέρω ποιο με κρατά πιο ξύπνια. | Stranger. The third gallery's dripping. A hundred years I listened to the forge; now I listen to drops. I don't know which keeps me wider awake. |
| `d.brokka7.2` | Η Χάλντα ανέβηκε στη λίμνη; Τότε ξέρει τι κοιμάται εκεί. Όλοι το ξέρουμε. Οι Λιθογενείς δεν ξεχνούν, ξένε· γι' αυτό ξέρουμε και τι δεν λέμε. | Halda's gone up to the lake? Then she knows what sleeps there. We all know. The Stoneborn don't forget, stranger; that's how we know what not to say. |
| `d.elati.v7a` | Το δάσος πίνει. Εκατό χρόνια δεν είχε πιει νερό από χιόνι. | The wood is drinking. A hundred years it had not tasted snow-water. |

**The Meltwaters (q41)** (14)

| key | Greek | English |
|---|---|---|
| `d.thaw.1` | Η κοιλάδα είναι πράσινη και γεμάτη φωνές. Όλες είναι νερό. | The valley is green and full of voices. All of them are water. |
| `d.thaw.2` | Γύρω της στέκονται τρεις από τις εφτά κορυφές. Το χιόνι τους γυαλίζει, και στάζει. | Round it stand three of the seven peaks. Their snow shines, and drips. |
| `d.halda7.b1` | Κοίτα το. Όλο αυτό θέλει να κατέβει σήμερα. | Look at it. All of that wants to come down today. |
| `d.halda7.b2` | Το ανοιχτό νερό, με τον αφρό, το περνάς με τα πόδια. Το βαθύ μπλε, όχι. Κι όταν ακούσεις βουή, ανέβα σε ξερό. | Pale water with foam on it, you can wade. The deep blue, you can't. And when you hear a roar, get up on dry ground. |
| `d.halda7.b3` | Το Ρέμα, το μεγάλο, δεν πέφτει μόνο του. Τρία νερόθυρα, στις τρεις ρεματιές. Γύρνα τους τροχούς. | The Race, the big one, won't drop by itself. Three weirs, up the three gullies. Turn the wheels. |
| `d.halda7.b4` | Κόντρα στο νερό τούς γυρνάς. Έτσι τους έφτιαχναν: να θέλουν δύο χέρια και λίγη ντροπή. | You turn them against the water. They made them that way: to need both hands and a little shame. |
| `d.halda7.b5` | Το νερό δεν το σταματάς. Του δείχνεις δρόμο. | You don't stop water. You show it a road. |
| `d.halda7.b6` | Κι εσύ κάτσε μια στιγμή πρώτα. Έχεις μάτια σαν καμίνι που δεν το σκέπασε κανείς τρεις μέρες. | And you, sit a moment first. You've eyes like a forge nobody has banked for three days. |
| `d.halda7.again` | Πάρε ό,τι χρειάζεσαι. Το μικρό αμόνι το κουβάλησα ως εδώ· μη μου πεις πως δεν θα το χρησιμοποιήσεις. | Take what you need. I carried the small anvil all this way; don't tell me you won't use it. |
| `d.halda7.again.r` | Πάρε ό,τι χρειάζεσαι. Και πες στον λύκο σου να μην ουρλιάζει κοντά στις φωλιές. Ή να ουρλιάζει, αν ξέρεις τι κάνεις. | Take what you need. And tell your wolf not to howl near the dens. Or to howl, if you know what you're doing. |
| `d.halda7.w1` | Τρία σκαλιά κάτω. Άκου το: δεν φωνάζει πια. Μιλάει. | Three steps down. Hear it: it's stopped shouting. It's talking. |
| `d.halda7.w2` | Η Νεροσκάλα είναι απέναντι, κάτω απ' τον γκρεμό. Κάτι όμως φωλιάζει στη ρίζα της. Είδα πατημασιές σαν το αμόνι μου. | The Water-stair's across there, under the cliff. But something's denned at its foot. I saw tracks the size of my anvil. |
| `d.halda7.w3` | Οι βοσκοί τη λένε Καλλιστώ. Κάθε χρόνο ξυπνά τελευταία απ' όλες. Φέτος το νερό μπήκε στη φωλιά της έναν μήνα νωρίς. | The shepherds call her Kallisto. Every year she's the last of them to wake. This year the water got into her den a month early. |
| `d.halda7.w3.r` | Οι βοσκοί τη λένε Καλλιστώ. Φέτος το νερό μπήκε στη φωλιά της έναν μήνα νωρίς. Εσύ είσαι του δάσους· ξέρεις τι είναι αρκούδα με μικρό. | The shepherds call her Kallisto. This year the water got into her den a month early. You're of the wood; you know what a bear with a cub is. |

**Kallisto (q42)** (10)

| key | Greek | English |
|---|---|---|
| `d.kall.0` | Στη ρίζα της Νεροσκάλας κάτι σηκώνεται από τη λάσπη. Είναι μουσκεμένη, αδύνατη απ' τον χειμώνα, και πολύ μεγάλη. | At the foot of the Water-stair something gets up out of the mud. She is soaked, winter-thin, and very large. |
| `d.halda7.k1` | Ορμάει ίσια! Βάλε έναν βράχο ανάμεσά σας κι άσ' τη να σπάσει πάνω του! | She charges straight! Put a boulder between you and let her break on it! |
| `d.halda7.k2` | Τη στρίμωξες, και τώρα είναι χειρότερη! Όταν σηκωθεί στα πίσω πόδια, μακριά της! | You've cornered her, and she's worse for it! When she rears, get clear of her! |
| `d.halda7.k3` | Ακούει το μικρό της και δεν σταματά! Όταν μουγκρίζει στον γκρεμό, έξω απ' τις άσπρες λουρίδες! | She hears her cub and won't stop! When she roars at the cliff, get out of the white lanes! |
| `d.kall.1` | Δεν πέφτει. Κάθεται, σαν κάτι πολύ κουρασμένο, και σε κοιτάζει. | She does not fall. She sits down, like something very tired, and looks at you. |
| `d.kall.2` | Από τη φωλιά βγαίνει ένα αρκουδάκι και τρίβεται πάνω της. | Out of the den comes a cub, and rubs against her. |
| `d.kall.2.r` | Από τη φωλιά βγαίνει ένα αρκουδάκι και τρίβεται πάνω της. Το πνεύμα του λύκου σου κάθεται κι αυτό. | Out of the den comes a cub, and rubs against her. Your spirit wolf sits down too. |
| `d.halda7.k4` | Άφησέ τη. Το ποτάμι κατέβηκε και τα ψάρια φαίνονται. Εσύ της έστρωσες το τραπέζι. | Leave her. The river's down and the fish are showing. You laid her table. |
| `d.kall.3` | Η αρκούδα μπαίνει στο ρηχό νερό και βγάζει ένα ψάρι. Το δίνει στο μικρό. Αύριο δεν θα σας θυμάται. | The bear wades into the shallows and brings out a fish. She gives it to the cub. Tomorrow she will not remember you. |
| `d.halda7.k5` | Ξύπνησε έναν μήνα νωρίς και θύμωσε με όλο τον κόσμο. Σου θυμίζει κανέναν; | Woke a month early and took it out on the whole world. Remind you of anyone? |

**The Hanging Lake (q43-q44)** (12)

| key | Greek | English |
|---|---|---|
| `d.tarn.1` | Πάνω από τα δέντρα, χιόνι στον ήλιο του μεσημεριού. Στο βάθος, μια λίμνη γαλαζοπράσινη, σαν αυγό πουλιού. | Above the trees, snow in the noon sun. At the far end, a lake the colour of a bird's egg. |
| `d.tarn.2` | Πίσω της, ένας τοίχος από παλιό πάγο. Μέσα στον πάγο, ένα σχήμα καθιστό, μεγάλο σαν σπίτι. | Behind it, a wall of old ice. In the ice, a seated shape the size of a house. |
| `d.halda7.t0` | ...Είναι αλήθεια, λοιπόν. | ...It's true, then. |
| `d.halda7.t1` | Θα σου πω κάτι που οι δικοί μου δεν λένε. Όχι επειδή το ξέχασαν. Επειδή δεν το ξέχασαν. | I'll tell you something my people don't say. Not because they forgot it. Because they didn't. |
| `d.halda7.t2` | Τα νερόθυρα δεν χτίστηκαν σε βράχο. Χτίστηκαν πάνω σε κάποιον που κοιμάται. Οι βοσκοί τον έλεγαν Κέλαδο: τη βουή του νερού. | The water-gates weren't built on rock. They were built on someone asleep. The shepherds called him Kelados: the roar of water. |
| `d.halda7.t3` | Εμείς τον λέγαμε ο Κοιμισμένος, και χαμηλόφωνα. Δεν είναι κακός. Είναι μεγάλος. Άλλο πράγμα. | We called him the Sleeper, and quietly. He isn't wicked. He's big. That's a different thing. |
| `d.halda7.t4` | Τρία βαρούλκα σηκώνουν τις αλυσίδες των νερόθυρων. Είναι πιασμένα στον πάγο. Λιώσ' τα με την Κούνια, μαλακά. | Three winches lift the water-gates' chains. They're locked in ice. Thaw them with the Cradle, gently. |
| `d.halda7.t4.m` | Τρία βαρούλκα σηκώνουν τις αλυσίδες των νερόθυρων. Είναι πιασμένα στον πάγο. Εσύ δεν θες Κούνια γι' αυτό, μάγε. Μόνο μην το παρακάνεις. | Three winches lift the water-gates' chains. They're locked in ice. You don't need a Cradle for that, mage. Just don't overdo it. |
| `d.halda7.t5` | Και μη χτυπήσεις σίδερο εκεί πάνω. Το σφυρί μου το 'φερα από συνήθεια. Θα μείνει στη ζώνη μου. | And strike no iron up there. I brought my hammer out of habit. It stays in my belt. |
| `d.halda7.t6` | Η αρκούδα ξύπνησε νωρίς, το βουνό πάει να ξυπνήσει, κι εσύ δεν κοιμάσαι καθόλου. Κάτι έπαθε ο ύπνος φέτος. | The bear woke early, the mountain's about to wake, and you don't sleep at all. Something's happened to sleep this year. |
| `d.halda7.tagain` | Πάρε ό,τι χρειάζεσαι. Και περπάτα όπως σε σπίτι που κοιμάται μωρό. | Take what you need. And walk as you would in a house where a baby's asleep. |
| `d.halda7.tagain.m` | Πάρε ό,τι χρειάζεσαι. Κι εσύ με τις παγωνιές σου: ό,τι ξυπνά ο ήλιος, εσύ το ξανακοιμίζεις. Χρήσιμο, φέτος. | Take what you need. And you with your frosts: what the sun wakes, you put back to sleep. Handy, this year. |

**Kelados (q44-q45)** (13)

| key | Greek | English |
|---|---|---|
| `d.kel.w1` | Η τρίτη αλυσίδα σηκώνεται. Κάτω απ' τα πόδια σου, το βουνό παίρνει μια ανάσα. | The third chain lifts. Under your feet the mountain takes a breath. |
| `d.kel.w2` | Ο πάγος του φράγματος ραγίζει από πάνω ως κάτω. Το σχήμα μέσα του σηκώνει τον ώμο του. | The ice of the dam cracks from top to bottom. The shape inside it lifts its shoulder. |
| `d.halda7.s0` | Τον ξυπνήσαμε. Τόσους αιώνες με πανιά στα σφυριά, κι εμείς τον ξυπνήσαμε μ' ένα τζάκι. | We woke him. All those ages with cloth round the hammers, and we woke him with a hearth. |
| `d.halda7.s0b` | Αν ρίξει το φράγμα, η λίμνη κατεβαίνει μια φορά. Κοίμισέ τον. Δεν ξέρω πώς. Εσύ ξέρεις από τέτοια. | If he brings the dam down, the lake comes down once. Put him back to sleep. I don't know how. You know about such things. |
| `d.halda7.s1` | Είναι ακόμα πιασμένος ως τη μέση! Ό,τι πετάει, μένει εκεί που πέφτει: κρύψου πίσω του όταν κατεβαίνει το χιόνι! | He's still held to the waist! What he throws stays where it lands: get behind it when the snow comes down! |
| `d.halda7.s2` | Λύθηκε, περπατάει! Τα χιόνια πέφτουν σταυρωτά: κράτα μια γωνιά καθαρή. Κι όταν τον σκεπάζει σύννεφο, πάρε ανάσα! | He's loose, he's walking! The slides fall crosswise: keep one corner clear. And when a cloud covers him, catch your breath! |
| `d.halda7.s3` | Οι μοχλοί στο χείλος! Άνοιξε το νερό κάτω απ' τα πόδια του! | The levers on the rim! Open the water under his feet! |
| `d.halda7.s3b` | Δεν προλαβαίνεις; Τραβάω εγώ έναν! Φέρ' τον στο αυλάκι! | No time? I'll pull one myself! Bring him to the channel! |
| `d.kel.r1` | Γονατίζει. Το νερό τρέχει ανάμεσα στα δάχτυλά του. | He kneels. Water runs between his fingers. |
| `d.kel.r2` | Σε κοιτάζει όπως κοιτάζει κάποιος που τον ξύπνησαν και δεν ξέρει γιατί. | He looks at you the way someone looks who has been woken and does not know why. |
| `d.kel.r3` | Του λες τη λέξη που σου άφησε ο Ίσαρν: Ξεκουράσου. | You tell him the word Isarn left you: Rest. |
| `d.kel.r4` | Γέρνει πίσω στην πλαγιά. Ως το βράδυ θα είναι πάλι βουνό. | He leans back against the slope. By evening he will be mountain again. |
| `d.kel.r5` | Το πεύκο στον ώμο του δεν έχασε ούτε μια βελόνα. | The pine on his shoulder has not lost a needle. |

**The lake let down (q46)** (5)

| key | Greek | English |
|---|---|---|
| `d.lake.1` | Γυρίζεις τον μεγάλο τροχό. Το νερό βρίσκει τη σκάλα του και την κατεβαίνει, σκαλί σκαλί, σαν άσπρη κλωστή. | You turn the great wheel. The water finds its stair and goes down it, step by step, like a white thread. |
| `d.lake.2` | Στον αφρό στέκεται ένα ουράνιο τόξο. Κάτω, η κοιλάδα είναι ακόμα εκεί, ολόκληρη. | A rainbow stands in the spray. Below, the valley is still there, all of it. |
| `d.halda7.e1` | Έτσι κατεβαίνει το νερό. Όχι όλο μαζί. Η γιαγιά μου θα 'κλαιγε. Εγώ όχι. Είναι ο αφρός. | That's how water comes down. Not all at once. My grandmother would've wept. Not me. It's the spray. |
| `d.halda7.e2` | Κάθε άνοιξη θα ανεβαίνει κάποιος να γυρίζει τους τροχούς. Με τη σειρά. Θα το πω στη Μπρόκα. | Every spring someone will climb up and turn the wheels. In turns. I'll tell Brokka. |
| `d.halda7.e3` | Πήγαινε σπίτι. Εγώ κατεβαίνω απ' τον κοντό δρόμο. Κι απόψε θα κοιμηθείς, μ' ακούς; | Go home. I'll take the short way down. And tonight you sleep, do you hear? |

**Memories in stone (the weirs and the winches)** (24)

| key | Greek | English |
|---|---|---|
| `d.mason.m1.1` | Πριν από το στέμμα, πριν από τις φρυκτωρίες. Λιθογενείς μάστορες στέκονται στο χείλος μιας λίμνης που κρέμεται πάνω από την κοιλάδα. | Before the crown, before the beacons. Stoneborn masons stand at the lip of a lake that hangs above the valley. |
| `d.mason.m1.2` | Κάθε άνοιξη το νερό κατεβαίνει όλο μαζί και τους παίρνει τον δρόμο. | Every spring the water comes down all at once and takes their road with it. |
| `d.mason.m1.3` | Το νερό δεν το σταματάς. Του δείχνεις δρόμο. | You do not stop water. You show it a road. |
| `d.mason.m1.4` | Χτίζουν μια σκάλα για το νερό, πριν χτίσουν μια για τον εαυτό τους. | They build a stair for the water before they build one for themselves. |
| `d.mason.m2.1` | Τρεις τροχοί από πέτρα και δρυ. Ο καθένας θέλει και τα δύο χέρια. | Three wheels of stone and oak. Each one needs both hands. |
| `d.mason.m2.2` | Ένας νέος μάστορας ρωτά γιατί δεν τους έκαναν πιο ελαφριούς. | A young mason asks why they were not made lighter. |
| `d.mason.m2.3` | Για να μην τους γυρίσει ποτέ κανείς βιαστικά. | So that no one ever turns them in a hurry. |
| `d.mason.m2.4` | Ο τροχός γυρίζει. Το ποτάμι κατεβαίνει ένα σκαλί, και μένει εκεί. | The wheel turns. The river drops one step, and stays there. |
| `d.mason.m3.1` | Οι βοσκοί της κοιλάδας ανεβαίνουν να δουν τι χτίζουν οι Λιθογενείς. | The valley's shepherds climb up to see what the Stoneborn are building. |
| `d.mason.m3.2` | Την άνοιξη το βουνό βουίζει. Οι βοσκοί έχουν λέξη γι' αυτό: κέλαδος. | In spring the mountain roars. The shepherds have a word for it: kelados. |
| `d.mason.m3.3` | Δεν είναι μόνο το νερό. Κάτι γυρίζει πλευρό εκεί πάνω. | It is not only the water. Something turns over in its sleep up there. |
| `d.mason.m3.4` | Οι μάστορες δεν γελούν. Το έχουν ακούσει κι αυτοί. | The masons do not laugh. They have heard it too. |
| `d.mason.m4.1` | Στον τοίχο του πάγου οι μάστορες ψάχνουν βράχο να θεμελιώσουν. | At the wall of ice the masons look for rock to found on. |
| `d.mason.m4.2` | Το καλέμι βρίσκει κάτι που δεν είναι πέτρα ούτε πάγος. Ανεβοκατεβαίνει, πολύ αργά. | The chisel finds something that is neither stone nor ice. It rises and falls, very slowly. |
| `d.mason.m4.3` | Ώμος. Χτίζουμε πάνω σε ώμο. | A shoulder. We are building on a shoulder. |
| `d.mason.m4.4` | Κανείς δεν μιλά ως το βράδυ. | No one speaks until evening. |
| `d.mason.m5.1` | Δεν φεύγουν. Αλλάζουν εργαλεία: ξύλινες ματσόλες, πανιά γύρω από τα σφυριά. | They do not leave. They change their tools: wooden mallets, cloth round the hammers. |
| `d.mason.m5.2` | Χτίζουν τα νερόθυρα στον ώμο του όπως σκεπάζεις κάποιον που κοιμάται. | They build the water-gates on his shoulder the way you cover someone who sleeps. |
| `d.mason.m5.3` | Εδώ πάνω δεν χτυπάμε σίδερο. Και κάτω, στα σπίτια μας, δεν λέμε τίποτα. | Up here we strike no iron. And down below, at home, we say nothing. |
| `d.mason.m5.4` | Οι Λιθογενείς δεν ξεχνούν. Μερικά, όμως, δεν τα λένε. | The Stoneborn do not forget. Some things, though, they do not say. |
| `d.mason.m6.1` | Η τελευταία μέρα της δουλειάς. Το νερό κατεβαίνει τη σκάλα του σαν κλωστή. | The last day of the work. The water goes down its stair like a thread. |
| `d.mason.m6.2` | Η πιο γριά μαστόρισσα ακουμπά την παλάμη της στον πάγο. | The oldest of the masons lays her palm on the ice. |
| `d.mason.m6.3` | Κοιμήσου. Εμείς θα προσέχουμε το νερό. | Sleep. We will mind the water. |
| `d.mason.m6.4` | Κράτησαν τον λόγο τους ώσπου η Βαθύπετρα γέμισε σκιές. Ύστερα δεν ανέβηκε κανείς. | They kept their word until the shadows filled Deepstone. After that, no one climbed up. |

**The lookouts (optional)** (10)

| key | Greek | English |
|---|---|---|
| `d.vigla.1` | Το νερό με έκλεισε εδώ πάνω από χτες. Δεν πειράζει· τα ξύλα είναι στεγνά. Βοήθα με ν' ανάψω, να ξέρουν κάτω πως είμαι καλά. | The water's had me shut in up here since yesterday. No matter; the wood's dry. Help me light it, so they know below that I'm all right. |
| `d.vigla.1l` | Πάλι άργησα με τα ξύλα. Αυτή τη φορά φταίει το ποτάμι. Βοήθα με ν' ανάψω, να το δει ο πατέρας. | Late with the wood again. This time it's the river's fault. Help me light it, so my father sees. |
| `d.vigla.2` | Το χιόνι πήρε τη μισή μου στοίβα και άφησε εμένα. Καλή συμφωνία. Ανάβουμε; | The snow took half my woodpile and left me. Fair trade. Shall we light it? |
| `d.vigla.3` | Από δω φαίνεται όλη η κοιλάδα, κι ο Λευκόβραχος στο βάθος. Τόσο μικρός. Τον προσέχουμε από πολύ ψηλά. | You can see the whole valley from here, and Whitecliff at the far end. So small. We look after it from very high up. |
| `d.vigla.4` | Τη νύχτα το χιόνι τρίζει σαν πάτωμα. Λέω πως είναι ο πάγος. Λέω. | At night the snow creaks like a floor. I tell myself it's the ice. I tell myself. |
| `d.vigla.5` | Κοιμάμαι μέσα σε τοίχο Λιθογενών. Ποιος ξέρει πόσα χρόνια όρθιος. Οι δικοί μας δεν βγάζουν δέκα. | I sleep inside a Stoneborn wall. Who knows how many years it's stood. Ours don't last ten. |
| `d.vigla.5b` | Σκάλα των Γιγάντων, τη λένε κάτω. Πάντα αναρωτιόμουν ποιων. | The Giants' Stair, they call it down below. I always wondered whose. |
| `d.vigla.6` | Ήμουν εδώ όταν σηκώθηκε. Δεν έτρεξα. Πού να τρέξεις, πάνω σε νησί; | I was here when he stood up. I didn't run. Where do you run to, on an island? |
| `d.vigla.done` | Καίει. Πες στη Χάλντα πως κρατάμε. | It's burning. Tell Halda we're holding. |
| `d.vigla.home` | Κατεβήκαμε με τη σειρά μας. Απόψε είναι άλλος πάνω. | We came down in our turn. Someone else is up there tonight. |

**Home and the ending (q46b-q47)** (15)

| key | Greek | English |
|---|---|---|
| `d.home7.1` | Δειλινό στον Λευκόβραχο. Το ρέμα κάτω απ' το χωριό τρέχει καθαρό και χαμηλό. Τα παιδιά έχουν βγάλει τα παπούτσια. | Dusk in Whitecliff. The stream below the village runs clear and low. The children have their shoes off. |
| `d.halda7.h1` | Κοίτα. Το δέντρο δίπλα στο ραβδί. Τόσα χρόνια, και δεν ήξερα πως ήταν μηλιά. | Look. The tree by the staff. All these years, and I never knew it was an apple tree. |
| `d.child7.4` | Γύρισες! Το ρέμα δεν φωνάζει πια. Το άκουσα πρώτος. | You're back! The stream's stopped shouting. I heard it first. |
| `d.child7.5` | Η Χάλντα λέει πως κοίμισες ένα βουνό. Τώρα που τελείωσες, εσύ τι θα κάνεις; | Halda says you put a mountain to sleep. Now you're done, what will you do? |
| `d.home7.2` | Δεν ξέρεις τι να απαντήσεις. | You do not know what to answer. |
| `d.child7.6` | Εγώ ξέρω. Θα κοιμηθείς. Κι εγώ θα σου πω καληνύχτα, όπως το λένε στον βορρά. | I know. You'll sleep. And I'll say good night to you, the way they do in the north. |
| `d.halda7.h2` | Το είπες σ' ένα βουνό και σ' άκουσε. Άκου το τώρα κι εσύ: Ξεκουράσου. | You said it to a mountain and it listened. Now hear it yourself: Rest. |
| `d.halda7.h3` | Απόψε τη φωτιά την κρατάω εγώ. Έχω κρατήσει και πιο δύσκολες. | Tonight I keep the fire. I've kept harder ones. |
| `d.home7.3` | Παίρνεις ένα κάρβουνο από τη φρυκτωρία και το βάζεις στο σβηστό φανάρι του Ίσαρν, πάνω στο ραβδί. Η φλόγα ξυπνά, μικρή. | You take a coal from the beacon and set it in Isarn's dark lantern, on the staff. The flame wakes, small. |
| `d.home7.4` | Κανείς δεν θα το κουβαλήσει πια. Κρέμεται εδώ, κι όποιος περνά του ρίχνει μια ματιά. | No one will carry it any more. It hangs here, and whoever passes gives it a glance. |
| `d.child7.7` | Καληνύχτα, φρυκτωρέ. | Good night, beacon-keeper. |
| `d.home7.5` | Ξαπλώνεις δίπλα στη φρυκτωρία. Στις εφτά κορυφές οι καπνοί γίνονται φωτιές, η μία μετά την άλλη. | You lie down beside the beacon. On the seven peaks the smokes turn to fires, one after another. |
| `d.sleep7.1` | Ο Βορράς ξυπνά, και δεν φοβάται. | The North wakes, and is not afraid. |
| `d.sleep7.2` | Κοιμάσαι. Κάποιος άλλος κρατά το φως. | You sleep. Someone else keeps the light. |
| `d.child7.wake` | Ώστε ξύπνησες. | So you're awake. |

**After the act** (18)

| key | Greek | English |
|---|---|---|
| `d.halda7.v8` | Τη φύλαξα ως το πρωί. Δεν έκανε τίποτα. Καίει και μόνη της, η άτιμη. Το 'ξερες αυτό; | I kept it till morning. It did nothing. Burns by itself, the wretch. Did you know that? |
| `d.halda7.v9` | Πήγα, είδα, γύρισα. Το σπαθί σου, πάντως, θέλει ακόμα δουλειά. | Went, saw, came back. Your blade still needs work, mind. |
| `d.child.bark7` | Κοιμήθηκες ως το πρωί. Το μέτρησα: δεν σηκώθηκες ούτε μία φορά. | You slept till morning. I counted: you didn't get up once. |
| `d.elianthe7.v1` | Κοιμήθηκες. Φαίνεται στα μάτια σου. Το μαξιλάρι κράτα το. | You slept. It shows in your eyes. Keep the pillow. |
| `d.elianthe7.v2` | Το ρέμα πάει νότια. Δεν ρώτησα ποτέ πού καταλήγει. | The stream runs south. I never asked where it ends up. |
| `d.leif.bark7` | Στεγνά ξύλα, επιτέλους. Κι όποιος ανεβαίνει απόψε, αύριο κοιμάται. Έτσι το κανονίσαμε. | Dry wood at last. And whoever goes up tonight sleeps tomorrow. That's how we've arranged it. |
| `d.v.son7` | Ο Λέιφ είναι στην τρίτη κορυφή απόψε. Το ξέρω, και κοιμάμαι. | Leif's on the third peak tonight. I know it, and I sleep. |
| `d.v7.3` | Τα παιδιά γύρισαν από το ρέμα με λάσπη ως τ' αυτιά. Να 'ναι καλά η Χάλντα. | The children came back from the stream muddy to the ears. Bless Halda. |
| `d.brokka7.3` | Η στοά στέγνωσε. Κι η Χάλντα ήρθε ως εδώ να μου πει για τ' αστέρια. Τρεις ώρες. Την πίστεψα στη δεύτερη. | The gallery's dry. And Halda came all this way to tell me about the stars. Three hours. I believed her by the second. |
| `d.brokka7.4` | Του χρόνου ανεβαίνω εγώ να γυρίσω τους τροχούς. Με πανί στο σφυρί. | Next spring I'll go up and turn the wheels myself. With cloth round my hammer. |
| `d.elati.v7` | Η πρώτη άνοιξη ύστερα από εκατό χρόνια. Το βλαστάρι της Κυράς έβγαλε φύλλα. Δεν ήξερα αν θυμόταν πώς. | The first spring in a hundred years. The Lady's sapling has put out leaves. I didn't know if it remembered how. |
| `d.elati.v7.r` | Η πρώτη μας άνοιξη ύστερα από εκατό χρόνια, αδελφή. Το βλαστάρι της Κυράς έβγαλε φύλλα. Δεν ήξερα αν θυμόταν πώς. | Our first spring in a hundred years, sister. The Lady's sapling has put out leaves. I didn't know if it remembered how. |
| `d.tam7.v1` | Στον βορρά ο πάγος δεν λιώνει. Εδώ λιώνει, κι από κάτω βγαίνουν λουλούδια. Κάποιος έπρεπε να μου το 'χε πει. | In the north the ice doesn't melt. Here it melts, and there are flowers under it. Someone should've told me. |
| `d.tam7.v1.r` | Στον βορρά ο πάγος δεν λιώνει, αδελφή. Εδώ λιώνει, κι από κάτω βγαίνουν λουλούδια. Εσύ το ήξερες και δεν μου το 'πες. | In the north the ice doesn't melt, sister. Here it melts, and there are flowers under it. You knew, and you never told me. |
| `d.selna.v7` | Ο πάγος μας κρατά. Η φωτιά της είναι βαθιά και μικρή· τα βουνά σας είναι πιο κοντά στις πύλες. Και λέω ακόμα τα ονόματα, κάθε βράδυ. | Our ice holds. Her fire is deep and small; your mountains lie nearer the gates. And I still say the names, every night. |
| `d.tern.v7` | Ο ήλιος γύρισε κι εδώ. Η γιαγιά λέει πως κοίμισες ένα βουνό. Εγώ κρατάω ακόμα το σκοινί, αν θες να ξανακατέβεις. | The sun's come back here too. Grandmother says you put a mountain to sleep. I'm still holding the rope, if you want to go down again. |
| `d.alk.v7` | Έμαθα πως κοιμήθηκες μια νύχτα ολόκληρη. Καιρός ήταν. Εγώ το έμαθα φέτος. | I hear you slept a whole night. About time. I only learnt how this year. |
| `d.glaukos.v7` | Λένε πως κοιμήθηκες. Εγώ κοιμάμαι τα μεσημέρια, πενήντα χρόνια. Έτσι αντέχω τις νύχτες. | They say you slept. I've slept at noon for fifty years. That's how I last the nights. |

---

## Notes for the lead

**1. Owner questions that are his (each has its alternative written above).**
1. **Isarn's lantern woken** (`d.home7.3-4`, `lanternWake`, a fifth `setLantern` state). Canon §0 item 7 and §4 item 11 call it "his dark lantern"; `d.answer.0` says it went out "as if falling asleep", which is what makes waking it fair. Isarn stays dead. Note for the wording: the lantern already hangs on the staff prop (build.js:3113), so the hero wakes it where it hangs; decisions.md's "hung on the staff" is kept as "on the staff".
2. **Two bosses that are not killed**, and «Ξεκουράσου.» said to Kelados. Judge 1 noted the word is spent a third time on a stranger; the home scene is built to earn it (`d.halda7.h2`).
3. The owner should read in Greek: the hook, Memory 6, Kelados's rest, the home scene.

**2. Where this text departs from the production proposal, and why.**
- `d.halda7.4` rewritten as `d.halda7.a7` (against `d.halda6.v2`). The proposal's "noon" in the hook's smoke line is dropped: the hook is one morning.
- **Brokka does not walk into Whitecliff.** The proposal loaded `folk.glb` in town for one line. Act VI kept Brokka and Elati at home with lines only because that cameo cost 88.6 MB on a cold start in Act V (act6-design, npcs), and the town already holds `frost` for the child. Her word comes through Halda (`d.halda7.a4`); her own lines are in the Halls, where she stands at no cost.
- **"The Stair" is «Η Νεροσκάλα» / "the Water-stair"** (the collision with `wp.coast` «Η Σκάλα»). `exit.stair` becomes `exit.tarn`. The shut-line key is `d.waterStairShut` because `d.stairShut` is shipped (Act VI's shadow wall).
- **Kallisto's Greek epithet** is «η Αρκούδα που Ξύπνησε», not «του Ξυπνήματος», which no Greek speaker would say; English unchanged ("the Waking Bear"). It follows the game's own relative-clause names («Τα Δάση που Κλαίνε»).
- **The echoes' prompts** are "Remember Kallisto" and "Hear what the mountain dreams", not "Wake the bear" and "Strike the mountain's shoulder": the story's last deed is letting both sleep, and Halda forbids striking iron up there.
- **The mason's marks** are six memories on the path, not three optional finds.
- The narration «Κέλαδος» as a Stoneborn word became the shepherds' word; the Stoneborn say "the Sleeper".

**3. What the other three parts must know.**
- **Zones.** (a) Decisions rule 8 against the proposal's layout: **no hut or sheepfold may stand in water** ("two of them standing in water to the sills" must go; huts on dry knolls, empty for the season), and «Το Πνιγμένο Λιβάδι» / "The Drowned Meadow" should be renamed, for example «Το Νερολίβαδο» / "The Water-meadow". (b) Named spots the story needs: in `thaw`: `camp` with Halda and a field anvil, `weirs[3]` each with a mason's-mark spot and room for three memory figures, `haldaDen` (dry, outside the arena radius, in sight of it), the den's mouth with the cub, shallows with fish after `kallistoRest`, `lookouts[3]`; in `tarn`: `camp`, `winches[3]` each with a mark spot, `haldaDam` on the rim, the three levers, the great wheel at the west lip, the spillway of the Water-stair in view of the Dam for the `lakeLet` cine, `lookouts[3]`. (c) The lookouts read as one peak's shoulder each: a hut, a woodpile, a hearth; three round each zone. Lookout 2 is the "third peak" of the hook and shows a slide's scar and half a woodpile.
- **Mechanics.** (a) Halda's three calls per boss fire on each phase's entry move, once. (b) The proposed fail-safe: Halda pulls one lever herself 25 s into Kelados's phase 3 if none was pulled (`d.halda7.s3b`). (c) `d.halda7.k3` is written so that it is true on Wanderer (no second charge). (d) Wording for player-facing rules should avoid "drowned" and "swept away" for foes too: water "drives them out". (e) The Slide's Greek name is «Η Κατολίσθηση» in decisions.md; my lines only say «το χιόνι» and «οι άσπρες λουρίδες», so either name works. (f) Rested's greeting is `d.child7.wake`. (g) The Names and the Call, the hints, the blessings' texts, the lever prompt and the Seven Fires' panel texts are **not** in this part's table.
- **Production / engine.** New pieces the scenes need: `ATMOS.townMorning` and `ATMOS.townDusk`; the stream at Whitecliff (see 4); a blossom tint on one tree by the staff; day-smoke sprites on `FAR_BEACONS` 0 and 7-12 and one slide sprite on row 9; `setLantern('awake')`; a bed-roll prop at the beacon; a 4 s black step in the cine player; body class `memory-stone`; the cub (bear.glb ×0.35) with a walk-out; Kallisto's seated and sleeping poses; Kelados's kneel and lean-back; the lake's white thread and the rainbow sprite; `act7Presence(z)`; the anvil interact while Halda is away; `hook7`, `homeCine7`, `actComplete(7)` and the quest clamp. No people set loads in either zone; the town loads `frost` only.
- **Text budget.** **192 keys** in this part: 191 new, 1 replaced (`act6.next`); 7 of them are class variants (5 `.r`, 2 `.m`). The proposal budgeted about 190 lines for the whole act; with the other parts' texts (Names, hints, blessings, legendaries, enemies) the act will land near 260-280. Two readers on every line.

**4. What I could not verify.**
- **Whitecliff seems to have no stream.** A search of `src/world/gen.js` for stream, brook, river and creek finds nothing; I did not read the town generator line by line. Decisions rule 8 and five lines here rest on one. The cheapest true version: a loud-water ambient below the south wall and a narrow strip of the meltwater shader outside the walkable cells, brown in the hook and clear at home. If it cannot be shown, the lines still work as sound and narration.
- **A tree by the staff** for `d.halda7.h1`: not verified in the town generator (the proposal could not verify it either). If none stands there, one is added as a prop on a free cell, or the line moves to the nearest tree.
- That `FAR_BEACONS[9]` is the peak nearest the Meltwaters' side of the skyline ("the third peak"); any of rows 7-12 will do, and the line does not depend on which.
- Whether the Giants' Stair's camp has free cells for the goat track on every saved seed (the proposal's own open point).
- The frost `tern` scene standing by a bed-roll in the morning light: a look check at stage D.
- I did not read the systems proposal; the Names are known to me only from judge 2's summary.
