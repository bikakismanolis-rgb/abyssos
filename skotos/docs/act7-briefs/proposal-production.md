# Act VII proposal (production-first): The Seven Peaks

«Πράξη VII: Οι Εφτά Κορυφές» / "Act VII: The Seven Peaks". Latin V and I, as canon §5.6 sets.

Written to `docs/act7-briefs/brief.md` (17 November 2026). This is the **production-first** proposal: the one most certain to ship well on a phone, with the most pictures and fights per day of work, built on what the repository already holds. Every file and line cited below was opened in this tree on 17 November; where something could not be verified it says so. No game code was changed.

---

## 0. The proposal on one page

**The act in one paragraph.** Spring comes. The Skotos is asleep, Pherousa's fire burns at the bottom of the Shadow Gates, and warm air rises from every Gate, as d.answer6.1 already says of the one by Isarn's staff. But the Gates opened «στα βουνά» / "in the mountains" (d.isarn.r5, text.js:326), so the same warmth is blowing under a thousand winters of snow on the Seven Peaks. The stream under Whitecliff runs brown and loud, Deepstone's lower galleries take water, and at noon the smoke of one peak's fire stops and a white tongue of snow comes down its flank. Halda of the Anvil, who is Stoneborn and has not left her forge in the whole game, takes her hammer and goes up with the hero: her people built water-gates up there once, at a lake that hangs above the whole valley. The hero climbs through a flooding spring vale in morning light, opens three old weirs to let the river down, and at the foot of the Stair meets Kallisto, a great bear the thaw woke too early and too hungry, with a cub in the den behind her. Above the tree line, on a snowfield in full noon sun, lies the Hanging Lake behind a wall of old ice, and in the ice sits the one the Stoneborn called Kelados, "the roar of water": the Sleeper under the Mountain, on whose shoulder they built their sluices and whom they never once woke. The warmth wakes him. The hero does not kill him. Beaten, he sits back against the slope, the hero gives him Isarn's word, «Ξεκουράσου.» / "Rest.", and the lake goes down through the Stoneborn gates in a long white thread instead of all at once. Whitecliff's stream runs clear, a tree by the staff is in blossom, and the act's last line answers Act VI's: «Ο Βορράς ξυπνά, και δεν φοβάται.» / "The North wakes, and is not afraid."

**The act in one idea: every gift has its cage, and this one is the hero's own.** The game's oldest rule is the altar's («κάθε δώρο έχει το κλουβί του», altar.sub, text.js:548). Act VI's gift was warmth from below. Act VII is its price: the thaw. There is no dark lord in it. The enemy is water, snow and whatever the warmth wakes, and the answer is never to stop the water, only to show it a road.

**The look in one idea: the first daylight act.** Six acts were night, ember, amber dusk, ice and dark. Act VII is a spring morning in a green high valley and a noon snowfield under a blue sky: sun shadows of pines on grass, cloud shadows drifting over the ground, turquoise meltwater, white snow that recedes as the act goes on. It is made almost entirely from **packs that are already in memory at start-up** (env, trees, village, the kits) plus the shipped `rime` pack, with atmosphere numbers, one sea define and two small ground layers. It needs no new rendering system.

**Why this is the production-first proposal (five facts found in the tree).**
1. **Act VI shipped with no new art file at all.** Both gated downloads passed provenance on 27 October (`act6-briefs/reports/stage0-assets.md`) and neither was ever built: `src/assets/creatures/` has no `ketos.glb` or `falselight.glb`, there is no `src/assets/silt/`, `stageB-report.md` says "every new body is a stand-in; no silt pack yet" and "no downloads from this container", and `creatures.js:34-40` has no `act6` row in `ACT_FILES` (world.js:99 comments it: "a group the build does not list yet loads nothing"). The act still shipped and reads. **So Act VII is designed to be complete with zero downloads**, and its one download is an upgrade, not a dependency.
2. **Daylight costs memory nothing.** A green zone can be drawn from the boot-loaded `env`, `trees`, `village` and kits. A cold start into Act VII's first zone is about **18-24 MB** of phone texture against the 110 MB bar (Act VI's measured 69 MB), and its second about **59-65 MB** (§6.3).
3. **The quest-giver is free.** Halda is people.glb's boot-loaded smith and canonically Stoneborn (canon §4 item 15). No people set loads in either zone: 0 MB against Act V's 30.7 MB for `frost` and the 33.9 MB that `folk.glb` costs if Brokka stood in a zone (measured here with `tools/glbinfo.mjs`).
4. **The first boss's body has never been a boss and is fully animated.** `bear.glb` ships eleven clips (idle, walk, run, charge, attack, attack2, rear, howl, hit, daze, die; `glbinfo`), which is every clip a charging boss needs, and `HART` (ai.js:2235) is a charging-beast boss already written.
5. **All three mechanics are systems that passed their soaks this month**, each with one new input: tide.js's own-level channel (the Mere's, tide.js:168-183) moved by the hero's hand; forge.js's breath (forge.js:27-60) fired by a trigger instead of a period; light.js's pools (light.js:325) inverted into shade.

**Scope.**
- **2 zones**, one new generator `src/world/gen7.js`:
  - `thaw`, «Τα Λιόνερα» / "The Meltwaters", level 40: a flooding high valley on a spring morning. Readings `spate` (before the weirs are open) and `green` (after the act).
  - `tarn`, «Η Κρεμαστή Λίμνη» / "The Hanging Lake", level 43: a noon snowfield, old Stoneborn works, the lake and its ice dam. Readings `full` (before the sluices open) and `let` (after).
  - Light kind for both: **'sun'** (a new word in `ZONES[id].light`, read only as `lightKind() === 'sun'`).
  - Levels keep the +3 cadence (34, 37 → 40, 43). Monsters track the hero at 50.
- **7 regular enemy entries (9 kinds)**: three reused unchanged (wolves, the pass goblins' three kinds, the Skua regraded as a mountain chough), four new kinds on shipped models (Den-bear, Snow-worm, Rock-roller, Icebound scavenger line), one new creature (the Rock-scorpion on the **already-gated** Scorpion, fallback the boot spider).
- **2 bosses**, neither killed: Kallisto on `bear.glb`; Kelados on `golem.glb` with code-built ice, moss and a pine on his shoulder.
- **3 mechanics**: the Race (tide.js + the hero's weirs), the Slide (forge.js + a trigger), Sun and Shade (light.js + moving shade).
- **Quests 40-46, end state 47.**
- **A reason to play at the cap:** the Seven Fires, a ladder of 7 lookouts × 6 difficulties (§8).
- **Budget:** 0.5-0.9 MB raw of new files, 5.6-7.4 MB of new phone texture.
- **Cost:** 47-59 focused days, the same band Acts V and VI measured; a cut order brings it to about 40-50 (§7.4, §10.3). I do not claim it is cheaper than Act VI. I claim it carries less risk: no dependency on a download, no new shader, bosses designed to the measured lesson.

---

## 1. Title, tone, look

| | Greek | English |
|---|---|---|
| act title | «Πράξη VII: Οι Εφτά Κορυφές» | "Act VII: The Seven Peaks" |
| act panel | «Πράξη VII — Ολοκληρώθηκε» | "Act VII — Complete" |
| act7.sub | «Το νερό βρήκε τον δρόμο του» | "The water found its road" |
| act6.next (replaces the shipped line, text.js:1386) | «Πράξη VII: Οι Εφτά Κορυφές. Μίλα με τη Χάλντα.» | "Act VII: The Seven Peaks. Speak with Halda." |
| title subtitle, game.sub7 | «Ο Βορράς ξυπνά» | "The North wakes" |
| zone.thaw / .s | «Τα Λιόνερα» / «Εκεί που λιώνει το βουνό» | "The Meltwaters" / "Where the mountain melts" |
| zone.tarn / .s | «Η Κρεμαστή Λίμνη» / «Χίλιοι χειμώνες νερό» | "The Hanging Lake" / "A thousand winters of water" |

**Tone.** After two acts of loss and names, this one is lighter on purpose: an act of work, weather and animals, with one old thing at the top that is not evil. It keeps canon §5's voice (short, plain, one concrete image a line) and it keeps the series' key word, «Ξεκουράσου.», for the end.

**Why "peaks" and why spring.** The seasons already run in order: Act III ended on "the first autumn in a hundred years" (act3.sub), Act VI opened "in the heart of winter" (d.hal.1). Spring is next. And the six peaks are the last picture Act VI left on screen (d.peaks.1-2, text.js:1380-1381; FAR_BEACONS 7-12, world.js:73-74), so the player has already been told to look there.

---

## 2. Story spine (lean; the story-first proposal goes deeper)

### 2.1 Premise, from what is shipped
- **Warm air rises from the Gates.** d.answer6.1 «Από την πύλη δίπλα στο ραβδί του Ίσαρν ανεβαίνει ζεστός αέρας, σαν από τζάκι.» (text.js:1382). Halda's d.halda.gate says the same.
- **The Gates opened in the mountains.** d.isarn.r5 «Στα βουνά άνοιξαν οι Σκιοπύλες» (text.js:326).
- **So the mountains are being warmed from below.** Nobody meant it. It is the hero's own doing, and a good one. The act never calls it a mistake.
- **Halda is Stoneborn** (canon §4 item 15) and Brokka keeps Deepstone, in the mountains (canon §2.1). The Stoneborn are the people who would have built in stone at a mountain lake.
- **New, and to be checked by the story-first proposal and the canon brief before the contract:** that the Stoneborn built water-gates ("νερόθυρα") at a lake above the valley, long before the Deep Forge; that their old ones had a name for something asleep under the mountain. Neither contradicts canon §4 as I read it (no crown, no Karthax, no beacon lore touched), but neither is in text.js.

### 2.2 The antagonist: no one
- **Kallisto** is a bear woken a month early by meltwater in her den. She is hungry and has a cub. (The name rhymes with the old tale of the woman who became a bear, as Alkyone and Keyx rhymed with theirs in Act VI; the game never tells it.)
- **Kelados** is the Sleeper under the Mountain. «Κέλαδος» is an old Greek word for the din of rushing water; a Greek ear also hears «Εγκέλαδος», the buried giant whose name still means "earthquake" in everyday speech. The game says neither. He does not speak. When he stirs the mountain shakes and the snow comes down.
- **IP hygiene.** No "frost giant", no Jötunn, no titan, no "the Watch". Trolls here are woken by the sun, the reverse of Tolkien's. Nothing is kindled, linked or kept alone by a flame: the act's last deed is opening a sluice. Kelados is called "the Sleeper", never "the Old One".

### 2.3 Beats
Flags are saved before their scenes, as Acts IV-VI do (engine brief §1.11).

| q | where | quest line | what happens | flags |
|---|---|---|---|---|
| **40** | town | «Μίλα με τη Χάλντα δίπλα στο ραβδί του Ίσαρν» / "Speak with Halda by Isarn's staff" | Morning. The roofs drip, the stream is brown. Brokka has walked in from Deepstone (town loads `folk` ad hoc as it already does for her, story.js:620). At noon, in a short cine (pitch 0.3), the smoke on one peak stops and a slide comes down. Halda shoulders her hammer. | `call7`, `haldaOut` |
| **41** | pass → thaw | «Ανέβα στα Λιόνερα και άνοιξε τα παλιά νερόθυρα ({0}/3)» / "Climb to the Meltwaters and open the old weirs ({0}/3)" | The goat track leaves the Pass's camp (an interact on cells that are already walkable, Act VI's rope-hole pattern, gen6.js:1190 `ropeSpot`; no saved seed changes). Arrival cine: a green valley full of running water. Each weir opened lowers the Race one step and the snow draws back up the slopes. | `thawSeen`, `weir1..3` |
| **42** | thaw | «Πέρνα το Ρέμα: η Αρκούδα του Ξυπνήματος φυλάει τη Σκάλα» / "Cross the Race: the Waking Bear guards the Stair" | Boss 1. She does not die. The cub comes out. | `kallistoRest` |
| **43** | tarn | «Ανέβα στην Κρεμαστή Λίμνη» / "Climb to the Hanging Lake" | Arrival cine at pitch 0.3: snow in full sun, the lake turquoise, the wall of ice, and a shape in it the size of a house. Halda finds the works. | `tarnSeen` |
| **44** | tarn | «Λιώσε τον πάγο από τα τρία βαρούλκα ({0}/3)» / "Melt the ice off the three winches ({0}/3)" | Each winch is a 2 s channel with the Cradle (Act VI's lamp channel) under a wave, a slide or a cloud's timing. On the third the mountain lifts its shoulder. | `winch1..3`, `keladosWake` |
| **45** | tarn | «Αντίκρισε τον Κοιμισμένο του Βουνού» / "Face the Sleeper under the Mountain" | Boss 2. He kneels; the hero gives him Isarn's word. | `keladosRest` |
| **46** | tarn → town | «Άνοιξε τα νερόθυρα και γύρνα στον Λευκόβραχο» / "Open the sluices and go home to Whitecliff" | A 2 s interact. Cine: the lake goes out in a long white thread; a rainbow stands in the spray (one code arc sprite). Home by waypoint. | `lakeLet`, `home7` |
| **47** | end | «Η άνοιξη ήρθε στον Βορρά, και το νερό βρήκε τον δρόμο του. Οι Σκιοπύλες σε περιμένουν.» / "Spring has come to the North, and the water has found its road. The Shadow Gates await." | `actComplete(7)`, `offerBoons()` | `act7` |

**World-state chain:** `call7` → `haldaOut` → `thawSeen` → `weir1..3` → `kallistoRest` → `tarnSeen` → `winch1..3` → `keladosWake` → `keladosRest` → `lakeLet` → `home7` → `act7`. Optional: `look1..6` (the lookouts) → `firesAll`.

### 2.4 Key lines (drafts; Greek first)
**The hook.**
- d.spring.1 (narration) «Ο πάγος στη στέγη της Χάλντας στάζει όλη νύχτα. Το πρωί, το ρέμα κάτω απ' το χωριό είναι καφετί και φωνάζει.» / "The ice on Halda's roof drips all night. By morning the stream below the village is brown and shouting."
- d.halda7.1 «Η πύλη δίπλα στο ραβδί βγάζει ζέστη, κι εγώ χάρηκα. Χαζή. Οι πύλες άνοιξαν και στα βουνά.» / "The gate by the staff gives off warmth, and I was glad. Fool. The gates opened in the mountains too."
- d.halda7.2 «Χίλιοι χειμώνες χιόνι, κι από κάτω του φυσάει ένα τζάκι. Κάνε τον λογαριασμό.» / "A thousand winters of snow, and a hearth blowing under it. Do the sum."
- d.brokka7.1 «Ξένε. Η τρίτη στοά έχει νερό ως το γόνατο. Και πάνω απ' όλους μας κρέμεται μια λίμνη.» / "Stranger. The third gallery is knee-deep in water. And above all of us hangs a lake."
- d.halda7.3 «Οι δικοί μου έχτισαν νερόθυρα εκεί πάνω. Αν ανοίγουν ακόμα, το νερό κατεβαίνει σιγά. Αν όχι, κατεβαίνει μια φορά.» / "My people built water-gates up there. If they still open, the water comes down slowly. If not, it comes down once."
- d.halda7.4 «Έρχομαι. Χρόνια έχω να βγω απ' το καμίνι. Φτάνει.» / "I'm coming. It's been years since I left the forge. Enough."
- d.smoke.1 (narration) «Μεσημέρι. Στην τρίτη κορυφή ο καπνός κόβεται. Ύστερα, μια άσπρη γλώσσα κατεβαίνει την πλαγιά.» / "Noon. On the third peak the smoke stops. Then a white tongue comes down the slope."

**The road.**
- d.thaw.arr (narration) «Η κοιλάδα είναι πράσινη και γεμάτη φωνές. Όλες είναι νερό.» / "The valley is green and full of voices. All of them are water."
- d.halda.weir «Γύρνα τον τροχό κόντρα στο νερό. Έτσι τα έφτιαχναν: να θέλουν δύο χέρια και λίγη ντροπή.» / "Turn the wheel against the water. They built them that way: to need two hands and a little shame."
- d.halda.race «Το νερό δεν το σταματάς. Του δείχνεις δρόμο.» / "You don't stop water. You show it a road." (the act's rule; it returns as a blessing's quote)

**Kallisto** (mon.kallisto «Καλλιστώ, η Αρκούδα του Ξυπνήματος» / "Kallisto, the Waking Bear"; tagline mon.kallisto.t «Ξύπνησε νωρίς, και πεινάει.» / "She woke early, and she is hungry.").
- d.kall.1 (narration) «Δεν πέφτει. Κάθεται, σαν κάτι πολύ κουρασμένο, και σε κοιτάζει.» / "She does not fall. She sits down, like something very tired, and looks at you."
- d.kall.2 «Από τη φωλιά βγαίνει ένα αρκουδάκι και τρίβεται πάνω της.» / "Out of the den comes a cub, and rubs against her."
- d.halda.kall «Άφησέ τη. Το ποτάμι κατέβασε ψάρια. Αύριο δεν θα μας θυμάται.» / "Leave her. The river's brought fish down. Tomorrow she won't remember us."
- Ranger only, d.kall.2.r «...και τρίβεται πάνω της. Το πνεύμα του λύκου σου κάθεται κι αυτό.» / "...and rubs against her. Your spirit wolf sits down too."

**Kelados** (mon.kelados «Κέλαδος, ο Κοιμισμένος του Βουνού» / "Kelados, the Sleeper under the Mountain"; tagline «Το βουνό σηκώνει τον ώμο του.» / "The mountain lifts its shoulder.").
- d.halda.kel1 «Οι παλιοί μας τον έλεγαν Κέλαδο: τη βουή του νερού. Έχτισαν τα νερόθυρα στον ώμο του, και ποτέ δεν τον ξύπνησαν.» / "Our old ones called him Kelados: the roar of water. They built the water-gates on his shoulder, and never once woke him."
- d.halda.kel2 «Εμείς τον ξυπνήσαμε. Με ένα τζάκι.» / "We woke him. With a hearth."
- d.kel.rest1 (narration) «Γονατίζει. Το νερό τρέχει ανάμεσα στα δάχτυλά του.» / "He kneels. Water runs between his fingers."
- d.kel.rest2 «Του λες τη λέξη του Ίσαρν: Ξεκουράσου.» / "You give him Isarn's word: Rest."
- d.kel.rest3 «Γέρνει πίσω στην πλαγιά. Ως το βράδυ, θα είναι πάλι βουνό.» / "He leans back against the slope. By evening he will be mountain again."

**Home.**
- d.spring.home1 «Το ρέμα κάτω απ' το χωριό τρέχει καθαρό. Τα παιδιά έχουν βγάλει τα παπούτσια.» / "The stream below the village runs clear. The children have their shoes off."
- d.halda.blossom «Κοίτα. Το δέντρο δίπλα στο ραβδί. Δεν ήξερα καν πως ήταν μηλιά.» / "Look. The tree by the staff. I never even knew it was an apple tree." (needs one town tree near the staff to take a blossom tint; if none stands there, the line moves to a tree that does. Not verified in `genTown`.)
- d.spring.home2 «Στις εφτά κορυφές, εφτά καπνοί. Το βράδυ θα γίνουν φωτιές.» / "On the seven peaks, seven smokes. By evening they will be fires."
- **The act's last line**, d.spring.last «Ο Βορράς ξυπνά, και δεν φοβάται.» / "The North wakes, and is not afraid." (it answers d.answer6.3 «Ο Βορράς κοιμάται με τα φώτα αναμμένα.», text.js:1384.)

### 2.5 The state after the act
- Whitecliff by day in the town's spring reading (the stream clear, one tree in blossom, by day the seven fires shown as thin smoke sprites and at dusk as the shipped fires: `farFire` with a `smoke` flag, world.js:73-74 rows unchanged).
- `thaw` in its `green` reading: the Race low and clear, no snow below the Chutes, flowers. Kallisto asleep by the den with the cub (the echo's spot).
- `tarn` in its `let` reading: the lake a third of its size, a green rim round it, Kelados a moss-grown shape in the slope with a pine on his shoulder (the echo's spot).
- Halda back at her anvil with one new bark: d.halda.again7 «Πήγα, είδα, γύρισα. Το σπαθί σου, πάντως, θέλει ακόμα δουλειά.» / "Went, saw, came back. Your blade still needs work, mind."
- The Shadow Gates play exactly as they do (canon §4 item 18). The Gate panel gains nothing.
- The Seven Fires stay as the cap's ladder (§8).

### 2.6 Cast, and what each costs
| who | body | where it loads from | cost |
|---|---|---|---|
| Halda | people.glb `smith` | boot | 0 MB |
| Brokka (hook only, in town) | folk.glb | ad hoc in town, as shipped | 0 MB in the act's zones |
| six lookout keepers, Leif among them if `leifHome` | people.glb `villager0-2` (Leif on villager0 ×0.92, the binding stage-0 number of Act VI) | boot | 0 MB |
| the cub | bear.glb at ×0.35 | the act's group | 0 extra |

---

## 3. Zones

### 3.0 How the hero gets there, and what does not change
- **Route:** Whitecliff → the `pass` waypoint (open since Act II) → the goat track at the Pass's camp (exit `thaw`, locked `haldaOut`) → the Meltwaters → the Stair behind the Den (exit `tarn`, locked `kallistoRest`) → the Hanging Lake. Home by waypoint.
- **Waypoints:** `thaw` (the Goat Track camp) and `tarn` (the Stair's Head), added to the list at panels.js:221 and the `named` set at panels.js:217.
- **No old zone changes layout.** The goat track is a prop and an interact on walkable cells of the Pass, found by a `ropeSpot`-style search (gen6.js:1190). No cell opens or closes, so no parity run is needed. `gate7` asserts a Shadow Gate tier's layout is unchanged (gen.js untouched).
- **Seeds per difficulty**, as Acts V and VI: `thaw@<diff>`, `tarn@<diff>`.
- **Wake and unload:** both ids join `WAKE` (wake.js:13); `unloadOld` (unload.js:28, 56) is told Act VII counts as "Act V or later", so Acts II-IV are let go on entry exactly as for Act VI. `ACT_FILES.act7` lists `bear`, `golem` and `worm`, so those three files survive the unload of groups act2 and act3 (creatures.js:69-72 keeps a file any live group lists).

### 3.1 `thaw` (40) «Τα Λιόνερα» / "The Meltwaters"
**LAYOUT.** `genThaw(seed, { mode })` in `src/world/gen7.js`. 112 × 184 cells. South at the bottom (z 184), the climb runs north, so "up the mountain" is up the screen. `ZONES.thaw = { level: 40, music: 'thaw', ambient: 'thaw', atmos: 'thaw', act: 7, pack: 'melt', light: 'sun' }`; `zonePacks('thaw') = ['melt']` (the two new layers only; every prop is boot-loaded); `READY.melt = { folk: [], creatures: 'act7' }`.

**Layout fields.** Act V's and VI's names, so tide.js and sea.js read them unchanged:
- `L.bed` (Float32, 0.15 steps, `BED_DRY` 9.0 for dry ground, genlib.js:6), `L.pocket` (1 = brooks on the clock, 2 = the Race, the own-level channel), `L.tideCfg` (the clock, as Act VI's layouts carry it, tide.js header).
- `L.thick`, `L.window`, `L.deck`, `L.sea` zero-filled and `L.ice` undefined, exactly as gen6 does (act6-design, Zones: the three readers index them without a guard except the `L.ice?.` ones already added).
- `L.flues` for the chutes (forge.js's own field: mouth x, z, dir, len, w, period, cover; forge.js:1).
- `L.shade` (Uint8): cells in fixed shade (under cliffs, in gullies). `L.vault` (patch ids) for loose rock under cliffs, read by `vaultAt` unchanged (forge.js:211).
- `L.low` for the two gorges (arrows and sight pass, feet do not; gen2.js:13-14).
- `L.spots`: `camp`, `weirs[3]`, `fords[3]`, `lookouts[3]`, `dens`, `slabs` (scorpion stones), `iceblocks` (Icebound posts), `huts`, `chuteHorns`, `arena`, `den`, `stair`, `npcs`.

**South to north.**

**(A) The Goat Track (Το Γιδόστρατο).** Camp at (56 ± 6, 172 ± 3), r 8, always dry: the track's head, Halda's fire, a mule's pack-saddle (code), the waypoint. The arrival cine looks north up the valley.

**(B) The Drowned Meadow (Το Πνιγμένο Λιβάδι).** z 122-164, the full width. Flat grass with 4-6 braided brooks (pocket 1, bed 0.3-0.75) that swell on the clock.
- 3-5 shepherds' huts and a sheepfold: village.glb's small houses and fences (boot), two of them standing in water to the sills.
- Pass goblins looting the huts; wolves on the dry knolls.
- **Lookout 1** on the west knoll (a dry rock, r 4).
- The main trail is a dry causeway (`BED_DRY`), 3 cells wide, with two plank bridges (the shipped bridge prop, build.js:947).

**(C) The Race (Το Ρέμα).** z 104-118, crossing the whole map east to west: the river every brook feeds. Pocket 2, its own level.
- In reading `spate` it stands at 1.2 (all of it deep, closed). Each weir lowers it 0.3 m: at 0.9 the **west ford** (bed 0.6-0.75) is wadeable; at 0.6 the **middle ford**; at 0.3 the **east ford** and the gravel bar that leads to the Stair.
- **Three weirs** in three side gullies north of it (x 12-22, 50-62, 90-100; z 84-100), each a Stoneborn wheel on a stone sill (code: a spoked wheel in the kits' stone material, a sluice plank). Each gully holds a pack and one set piece: the west gully a den (a Den-bear asleep), the middle one a chute that crosses it, the east one three Icebound in the cliff's shade.
- The main trail needs only the west ford. The quest needs all three (the Stair's foot is an island until the Race stands at 0.3).

**(D) The Chutes (Οι Σούδες).** z 60-100. The steep flank: a switchback trail crossed by **5-7 avalanche chutes** (`L.flues`), each a bare white lane 3-4 cells wide and 22-34 long, running downhill (south-east or south-west) from a cornice at the cliff. Boulders (env rocks, blocked) and thick pines (trees.glb, blocked trunks) stand beside the trail as cover, at least one within 4 m of every trail cell a chute crosses (a hard check).
- Snow patches (the ground's second reading) lie in the chutes and the shade; Snow-worms hunt in them.
- **Rock-rollers** stand frozen in ice blocks in the cliffs' shade.
- **Lookout 2** on a shoulder between two chutes.

**(E) The Sun-terraces (Τα Προσήλια).** z 36-60. Flat warm slabs of rock (the kits' flagstone as natural pavement, env rocks), wholly in sun.
- **Rock-scorpions** under loose flat stones (`slabs`); choughs wheeling.
- Two dens in the east wall.
- **Lookout 3** at the terraces' lip, looking back down the whole valley (the lookout's cine uses it).

**(F) The Den and the Stair (Η Φωλιά, η Σκάλα).** The arena, centred (56 ± 4, 22 ± 1), r 17.
- A bowl under the north cliff. The Race's head-stream crosses it west to east (pocket 2, bed 0.45-0.6: in the fight it rises one step and leaves three gravel bars).
- **Three chutes** fan down from the cliff into the bowl, 60° apart, each with a boulder near its foot.
- Six blocked boulders and two fallen pines round the rim at r 9-13: what a charge breaks on.
- The den's mouth in the north-east wall (a dark recess, blocked; the cub's spot).
- The Stair: a cut stone stair in the north-west wall (dungeon kit steps, boot), exit `{ to: 'tarn', label: 'exit.stair', locked: 'kallistoRest' }`.

**Over seeds.** Retries `seed + k·7919`, 24 tries, the last accepted (gen6's loop). What varies: every landmark within its range, the brook pattern, which gully holds which set piece, the chutes' count and angles, hut and boulder placement, the lookouts' knolls, the dressing from its own RNG after carving.

**Reach checks (hard), after dressing**, with the shared helpers (`reach`, `nearReach` genlib.js:9-20; `bfs`, `refugeNear` gen5.js:810, 775; `walk6`, `wideDry` gen6.js:67, 224):
- with the brooks at h = 0 and at their top, and the Race at 1.2, 0.9, 0.6 and 0.3: the camp reaches everything the level should allow, and nothing it should not (no way to the Stair before 0.3);
- the trail, every weir wheel, lookout hearth, hut door, the camp and the exits on dry cells; every brook with a dry refuge of 3 × 3 within 12 m (tide.js's lane rule);
- every trail cell inside a chute within 4 m of cover that breaks `map.los` to the chute's mouth;
- no chute's line crossing the camp, a weir wheel or a lookout hearth; two interacts in the arena never closer than 3 m; no carved feature within 3 cells of the frame;
- `check-act7` reports mean tries per seed; above 3 is a soft failure.

**ATMOS** (new rows in atmos.js; numbers are the starting point for the stage-0 look gate):
- **ATMOS.thaw:** fog 0x9fb6c6, density 0.012; sky 0xbcd6f2; ground 0x4c5e38; hemi 1.25; moon (the sun) 0xfff0d2, moonI 2.3; exposure 1.0; heroI 0; zoom 1.05; `sun: [-18, 22, 10]` (a new key: the directional light's offset, today fixed at gfx.js:96 and :321, so morning shadows fall long toward the east).
- **ATMOS.thawShade:** what `mixAtmos` (atmos.js:63) eases toward while the hero stands under a cloud: hemi 0.95, moonI 1.1, sky 0x9fb4cc. A third of a second of easing; the cloud's own dark decal does most of the work.
- **ATMOS.thawCine:** density 0.006 for the arrival and the lookouts.
- **ATMOS.thawFight** (the Den): zoom 1.2.
- **Fallback if the pale fog fails its look gate** (telegraphs or actors washing out): fog 0x2a3440, density 0.014, everything else the same. That is the Weeping Woods' recipe (a bright sun over a dark haze, atmos.js:14), which has shipped since Act III.
- **FX ambient 'thaw':** pollen motes in the sun (the `forest` branch of the ambient table with a pale gold colour, fx.js:519), spray at the brooks' steps (the shipped `mist` emitter), two butterflies near flowers (code quads, quality 1 and up).

**HAZARDS.** The Race and the brooks; the Slide in the Chutes and the Den; loose rock under the cliffs (`L.vault`); cloud shade as a rule, never as damage. **No Cold** (cold.js does not run: `z.cold` is not set), **no thin ice** (ice.js does not run: `L.ice` undefined), **no Shroud, no ring** (`shroudOn()` is false for 'sun', light.js:48).

**SET PIECES.**
- The arrival: a whole valley of running water in morning light, pine shadows on grass, snow still lying in every hollow.
- A weir wheel turned against the water, and the river dropping a step along its whole length at once (the sea mesh's `uBayLevel`, tide.js:45).
- The snow drawing back up the slopes after each weir (`setThaw(k)`, §6.1 item 4).
- A slide the player started on purpose burying a goblin camp.
- A troll in a block of blue ice, in shade, and the cloud's edge sliding off it.
- A bear's charge ending in a boulder, and a cub's face in the den's mouth.

**GROUND and PROPS.**

| slot | layer | source | fallback (no download) |
|---|---|---|---|
| A | `melt/meadow` | **new**: a Poly Haven grass or meadow scan, CC0 (name and look to verify at stage 0) | `leaves` (env, boot) under `hueA: [0.62, 1.0, 0.5]`, the way ground5 and ground6 tint a stand-in (build.js:1144-1175) |
| B | `scree` (env or deep, whichever is loaded) → `mud` (boot) | shipped | — |
| P | `trail` (boot) | shipped | — |
| W | `wall` (boot) at ws 4.4, or `rime/seaCliff` when loaded | shipped | — |
| D (the "dry" slot) | `rime/snow` when loaded, else a white `fake` of A as ground5 does (build.js:1146, `fake: !snowy`) | shipped | — |

`ground7(type)` follows ground5 and ground6 line for line. Defines: G_WET on (the wet rim shows where the water will come), G_GLINT on for the snow reading only, G_AUR, G_WIN and G_EDGE off.

**The snow that recedes** is the First Autumn's mechanism run the other way. groundMat already has a global blend of one extra layer by a uniform (`cfg.dry`, `uAut: WIND.uAutumn`, build.js:1488-1491; `setAutumn`, build.js:1922). Today the extra layer is hard-wired to `ENV.layers.dryleaf` (build.js:1491). Engine work 4 lets a config name it (`dryLayer`), and `setThaw(k)` drives it from flags: 0.65 on first arrival, 0.45 / 0.3 / 0.15 after each weir, 0.05 in the `green` reading. **Not verified:** that the dry blend's noise mask reads well as snow in hollows; if it reads as spots, the mask takes `L.shade` as a second term (0.25 d, counted in item 4).

**Props, all shipped:** trees.glb pines and broadleaves (boot), env rocks and boulders (boot), village.glb houses, fences, carts, the well (boot), the dungeon and town kits' stone steps, sills and flagstones (boot, `loadKits`, boot.js:122). **Code (build7.js):** weir wheels and planks, log-jams, lookout hearths (Act V's cairn builder), ice blocks (a box in Act V's 'icy:' Instancer material), cornices and snow tongues, the den's mouth, flower cards (an Instancer of 2-triangle cards, 300 within 30 m, off at quality 0), cloud shadows.

**Memory and perf, `thaw`.**
- **Cold start:** the two `melt` layers 5.6 MB + the act7 creature group 17.7 MB (bear 9.0, golem 4.2, worm 1.4, skua 1.4, scorpion 1.7) + code textures 0.5 MB = **about 24 MB** (18 MB with no download at all). No pack of props, no people set. *(Creature figures: `glbinfo` map sizes under the engine brief's rule, RGBA8 × 1.33, maps of 1024 halved.)*
- **Perf estimate: 0.85-1.0 of the Field at q1.** The ground is four layer reads, as the Weeping Woods' (A, B, P and the dry slot); the water is the pockets only (≤ 15% of the view in the Meadow at the top of the clock, ≤ 20% in the Den); the light loop is the same 7 lights as everywhere (gfx.js:26 `POOL_SIZE`). The unknown is daylight's shadow pass: the moon's shadow map already draws every frame wherever `moonI > 0` (gfx.js:177-180), so the Field pays it too, but the Meadow has more trees in the shadow box than the Field has. Measured by perf7 at the end of stage A. If it is dearer, tree shadows fall back to the shipped blob shadows at quality ≤ 1.

### 3.2 `tarn` (43) «Η Κρεμαστή Λίμνη» / "The Hanging Lake"
**LAYOUT.** `genTarn(seed, { mode })` in gen7.js. 104 × 176 cells, south at the bottom. `ZONES.tarn = { level: 43, music: 'tarn', ambient: 'summit', atmos: 'tarn', act: 7, pack: 'melt', light: 'sun' }`; `zonePacks('tarn') = ['rime', 'melt']` (the pattern world.js:101 uses for Act VI). Same fields as `thaw`; pocket 2 is the lake.

**South to north.**

**(A) The Stair's Head (Η Κορφή της Σκάλας).** Camp at (52 ± 4, 166 ± 2), r 8: the stair's top, a wind-wall of piled stone, Halda's fire. The arrival cine plays here at pitch 0.3 looking north across the whole snowfield to the lake.

**(B) The Snowfield (Το Χιονοπέδιο).** z 110-158. Open snow in full sun. This is the cloud shadows' showcase: three or four of them cross it at any time.
- Chutes come off the east and west ridges (4-6), their lines crossing the trodden trail (`rime/snowTrod`).
- Two crevasses (`L.low`, gen2's chasm cells) with one snow bridge each (static, walkable, 3 cells wide).
- Snow-worm ridges; wolves; Icebound in the shade of the ridges.
- **Lookout 4** on a rock island in the snow.

**(C) The Old Works (Τα Παλιά Έργα).** z 70-108. Stoneborn masonry half out of the snow: channel walls, a roofless wheel-house, a row of stone piers (the dungeon kit's walls, pillars and steps, boot-loaded, under a pale lichen tint).
- **Winch 1** in the wheel-house; **winch 2** on the east pier. Each is a 2 s channel with the Cradle that ice interrupts: winch 1 stands in a chute's line (melt it between slides), winch 2 freezes again whenever a cloud's shade lies on it (melt it in sun).
- Rock-rollers among the piers; a Rock-scorpion nest under the wheel-house floor.
- **Lookout 5** on the wheel-house's surviving corner.

**(D) The Lake Shore (Ο Γιαλός της Λίμνης).** z 36-70. The tarn fills the west and centre (pocket 2, bed 0-0.9 in three shelves); a shelf of shingle and old ice runs along its east side (`rime/shore`, `rime/ice`).
- **Winch 3** on a jetty of stone piers out in the lake: reachable only by a causeway that the clock's ripple covers and uncovers (the brooks' clock on pocket 1 cells).
- **Lookout 6** on a skerry in the lake that is cut off until the lake has fallen one step (after the boss): a reason to come back.

**(E) The Dam (Το Φράγμα).** The arena, centred (52 ± 3, 22 ± 1), r 16.
- North: the wall of ice, blocked, drawn as rime's `coastCliff` and `rockFace` in Act V's icy Instancer material, 9 m high. **Kelados sits in it**, a statue actor behind the icy material (Act VI's Asger behind a keel's ice is the shipped precedent; engine fact 7: `a.statue && !a.awake` stops animating and takes the ice tint).
- West: the lake's lip (pocket 2). In the fight the lake falls one step per phase and bares a strip of shore each time, so the arena grows from r 12 of floor to r 16.
- **Three sluice levers** on the rim at r 14, 120° apart, each with a stone channel running across a third of the arena.
- Two chutes off the peak above, crossing the arena as an X with one safe quadrant each time (a hard check: every pair of chute lines leaves a quadrant of at least 6 × 6 cells clear).
- Shard cover: what Kelados throws leaves blocks of ice that stand for 20 s (forge.js's shards, forge.js:180-200).

**Reach checks (hard):** as `thaw`, with the lake at 1.2, 0.9, 0.6 and 0.3; winch 3's causeway reachable at the clock's low and never at its top; the levers reachable from each other round the rim at every lake level; the snow bridges never inside a chute.

**ATMOS.**
- **ATMOS.tarn:** fog 0xc6d6e6, density 0.010; sky 0xd2e6ff; ground 0xa2b2ca (the snow's blue bounce); hemi 1.1; moon 0xfff8ea, moonI 2.1; exposure 0.92 (snow gives back four times what ash does: atmos.js:36-38 lowered the hero's light for the same reason); heroI 0; zoom 1.05; `sun: [-6, 32, 4]` (noon, short shadows).
- **ATMOS.tarnShade**, **tarnCine** (density 0.005), **tarnFight** (zoom 1.25), and **ATMOS.tarnGold** for the ending (the sun low and warm: moon 0xffd49a, moonI 1.7, sky 0xe8c8a0).
- **FX ambient 'summit':** spindrift along the ground (the shipped `snow` branch sideways at a tenth of its rate), glints (the ground's G_GLINT), breath puffs (Act V's).

**HAZARDS.** The lake and its clock; the Slide; Sun and Shade (winch 2, the Icebound, Kelados); loose ice under the dam (`L.vault`).

**SET PIECES.**
- A noon snowfield with cloud shadows crossing it and a lake the colour of a bird's egg at its far end.
- A wall of ice with a seated shape inside it, seen from the first step into the zone.
- Old stone piers standing out of the snow in a row, and a wheel that still turns.
- The ice coming off Kelados in plates, phase by phase, with a pine tree growing on his shoulder.
- A sluice opened under his feet.
- The lake let down: a white thread of water over the lip, a rainbow in the spray, and the valley below still standing.

**GROUND and PROPS.** `ground7('tarn')`: A `rime/snow`, B `rime/ice` (the lake's old ice) and `rime/shore` on the shore, P `rime/snowTrod`, W `rime/seaCliff`: ground5's own chain (build.js:1144-1158) with G_AUR and G_EDGE off, G_GLINT and G_WET on. In the `let` reading the dry slot runs the other way: `melt/meadow` grows in round the lake. Props: rime's cliffs, rock faces, icicles and driftwood (shipped), the dungeon kit (boot), env rocks (boot); code for winches, levers, piers' caps, the snow bridges, the rainbow.

**The lake** is `buildSea` over the pocket cells with a new define **SEA_MELT** beside SEA_BLACK (sea.js:211-250): turquoise shallow to deep blue, the sun glint kept, no aurora term, no light paths, the depth step at 0.45 m and the edge line kept because they are gameplay. Quality 0 is the shipped one-fetch path.

**Memory and perf, `tarn`.**
- **Cold start:** rime's props and layers 41.5 MB (act6-design's measured figure; `glbinfo` gives 39.6 here) + `melt` 5.6 + the creature group 17.7 + code 0.5 = **about 65 MB** (59 with no download) against 110.
- **Perf estimate: 0.85-0.95 of the Field at q1.** The Farthest Light, the same ground chain with the aurora and the windows, measured 0.92-0.99 (act6-design, The look). This zone drops G_AUR and G_EDGE, has no ice mesh and no ice.js tick, and its water is one lake (≤ 25% of the view on the shore, ≤ 30% at the Dam in phase 1).

### 3.3 How the two zones play, minute by minute
This is the test of the layout: every rule is met once alone on the main trail before it is combined, and no rule is first met in a boss.

**`thaw`, a first run of about 25-35 minutes.**
| minute | where | what the player meets | what it teaches |
|---|---|---|---|
| 0-2 | the Goat Track | the arrival cine; Halda's fire; the waypoint | where "up" is; that it is day |
| 2-6 | the Drowned Meadow | a brook across the causeway, a roar, the water rising over the planks for 40 s; goblins in a hut that the water empties | the Race's rules 1, 2 and 4 with nothing else on screen |
| 6-8 | the west knoll | lookout 1, its keeper waving from a rock in the flood (optional hold) | the hold event, at its gentlest |
| 8-10 | the Race's bank | deep blue water the whole width of the map; Halda points at the gullies | that the river is a gate, and that it is the player's to lower |
| 10-18 | the three gullies | weir 1 with a sleeping Den-bear beside it (walk softly or fight); weir 2 under a chute; weir 3 with three Icebound in shade and a cloud coming off them | one new rule per gully: the dormant wake, the Slide, Sun and Shade |
| 18-19 | the Race | the river three steps down, the snow a third gone, the fords open | the world-state, seen |
| 19-26 | the Chutes | the switchback under five loaded lanes; Snow-worms in the snow between; the first chance to kick a slide onto a pack on purpose | the Slide as a weapon |
| 26-30 | the Sun-terraces | scorpions under stones, choughs in the open sun, two dens; lookout 3 and the view back down the valley | all three rules together, at low stakes |
| 30+ | the Den | Kallisto | the fight uses only what the last half hour taught |

**`tarn`, a first run of about 25-30 minutes.**
| minute | where | what the player meets |
|---|---|---|
| 0-2 | the Stair's Head | the arrival cine across the snowfield to the lake and the shape in the ice |
| 2-10 | the Snowfield | cloud shadows as cover from choughs and as a clock for the Icebound; chutes from both ridges; two crevasses to path round; lookout 4 |
| 10-18 | the Old Works | winch 1 in a chute's line, winch 2 that only stays thawed in sun; Rock-rollers among the piers leaving boulders that become cover; lookout 5 |
| 18-24 | the Lake Shore | winch 3 on its causeway against the lake's clock; the third winch turns, and the mountain lifts its shoulder |
| 24+ | the Dam | Kelados |
| after | the lake one step down | lookout 6 on its skerry; the sluices; home |

**Why a capped hero does not sleepwalk it.** In each zone there are about nine packs on the trail and six off it, three guaranteed champion packs at the lookouts, and five to seven places where the terrain takes 14% of her life if she stands in the wrong lane. The balance run measures the result against §8.2's table before the bosses are built, so that "the zones are too light" is found at G2 and not, as in Act VI, a week before release.

### 3.4 The look: what each image costs
| # | image | made from | new work | quality 0 | risk |
|---|---|---|---|---|---|
| 1 | Daylight | six ATMOS rows; `a.sun` (gfx.js:96, 321) | 0.5 d | same | **Medium** until the stage-0 gate: nothing bright has shipped; fallback is Act III's dark haze |
| 2 | Telegraphs that read on bright ground | a 'day' variant beside TELE_DARK (fx.js:304-322): a dark edge under the coloured rim, premultiplied in one pass, chosen by the zone's light kind; it crosses the co-op mirror as TELE_DARK does | 0.75 d | same | Low: Act VI built and mirrored exactly this |
| 3 | Decals on bright ground (light rings, runes, marks) | Act V's screen-blend path for the ring on snow (build.js:3120-3157) keyed on the light kind, not only `uSnow` | 0.5 d | same | Low |
| 4 | Cloud shadows | 3-4 draped quads of r 9-14 with a soft normal-blended dark disc (light.js's `core: 'dark'` disc, DISC6_FS, light.js:462) moving on a line | in mechanic 3 | 2 clouds | None |
| 5 | Snow that recedes | groundMat's dry slot (build.js:1491) | 0.5 d | same | Low |
| 6 | Turquoise meltwater | SEA_MELT | 0.5 d | 1 fetch | Low |
| 7 | Slides | forge.js's flue look recoloured: a white telegraph lane, a front of 60 alpha puffs (the alpha pool holds 500-1,600 by quality, engine brief §3.6; the additive pool is fx.js:135), a snow tongue decal left for 8 s | in mechanic 2 | 30 puffs | None |
| 8 | Ice blocks; the ice on Kelados | boxes and plates in Act V's icy Instancer material | in build7 | same | None |
| 9 | Flowers; butterflies; the rainbow | instanced cards; one arc sprite | in build7 | off | None |
| 10 | Smoke on the peaks by day | the `farFire` sprite with a grey smoke texture drawn in code | 0.25 d | same | None |

**What it deliberately does not draw:** a sky in play (the camera never sees one, engine fact 0.2; the cines' sky is the fog colour and a code sun-disc sprite), grass blades, falling water with height (the lake's thread in the last cine is a sprite strip), reflections, any full-screen transparent layer.

---

## 4. Enemies and bosses

### 4.1 Rules for the act's creatures
- **Nothing here is of the dark.** No Shroud, no `unlit`, no `unseen`. Everything is seen plainly in daylight, which is also the cheapest thing for a phone to read.
- **Hazards are weapons.** A slide strikes monsters at full strength, not the quarter the Forge's breath gave them. High water puts non-swimmers out (tide.js `evict`, :340). The zones are worth fighting at the cap because the terrain does a third of the killing when the player sets it up, and takes 14% of her life when she does not.
- **Every new model row has a `STAND_IN`** ending in a boot-loaded body (actors.js:55-69), asserted cold by `cast7`.

### 4.2 Regular entries
| # | id | Greek / English | body (file, loaded by) | verb | AI reused | new in code |
|---|---|---|---|---|---|---|
| 1 | `warg` (reused) | Λύκος / Wolf | wolf.glb (boot) | pounce | `pounce` (ai.js:434), def data.js:126 | nothing; a grey-brown `look` tint through a pack-level override |
| 2 | `goblin`, `goblinArcher`, `goblinShaman` (reused) | the pass goblins | goblin.glb (boot) | loot, swarm, shoot | `melee`, `ranged`, `caster`; pack `passGoblins` (data.js:243) | nothing |
| 3 | `chough` | Καλιακούδα / Chough | skua.glb (group act7) | mob from the air | `bat` (ai.js:498); the Skua's def (data.js:187) | a def copy with a black tint and `shadeShy` in place of `lightShy`: it dives only at a hero in open sun and breaks off under a cloud or a tree. 0.25 d |
| 4 | `denBear` | Φωλιάρκουδα / Den-bear | bear.glb (group act7) | sleep, wake, charge | `charger` (ai.js:640) with `PACK_DORMANT` and `def.wake` (data.js:306) | a wake input: a loud blow within 12 m (bus 'loud', mechanic 2) or water reaching the den. Its charge ends dazed against a boulder, as shipped. 0.5 d |
| 5 | `snowWorm` | Χιονοσκώληκας / Snow-worm | worm.glb (group act7) | tunnel, burst, spit | `burrow` (ai.js:524); the Deepworm's def (data.js:140) | lives only in snow cells; its spit leaves slush (`slushAt`, tide.js:396: a wading-slow circle). As the snow recedes with the weirs, its hunting ground shrinks: the world-state made playable. 0.5 d |
| 6 | `rockRoller` | Πετροκυλιστής / Rock-roller | troll.glb (boot) | wait in ice, throw | `brute` (ai.js:452) with a ranged `lob` (ai.js `lob`) beyond 7 m | **Icebound:** spawns as a statue in an ice block (the statue path) and wakes when `sunAt` holds on it for 2 s, when struck, or when the hero channels the Cradle on the block (1.5 s). Its boulder is a `drip` circle (forge.js:152) of r 2 with 1.0 s of warning that leaves a rock for cover. Its slam is 'loud'. 1 d |
| 7 | `rockScorpion` | Πετροσκορπιός / Rock-scorpion | **the Scorpion** (the act's one download, already gated), else spider.glb ×0.8 (boot) | lie under a stone, sting, back off | `rootling`'s burst from under a mound (ai.js:612) for the ambush, then `melee` with `poison: true` as the spider (data.js:127) | the mound mesh is a flat stone; a 0.8 s tail-raise tell before the sting; it retreats under shade and comes back with the sun. 0.75 d |

**Packs** (data.js `PACKS`): `vaultGoblins` → the shipped `passGoblins`; `thawWolves: [['warg', 1]]`; `choughs: [['chough', 1]]`; `den: [['denBear', 1]]` (lead, dormant); `snowHunt: [['snowWorm', 2], ['warg', 1]]`; `icebound: [['rockRoller', 1], ['goblin', 2]]` (lead, dormant); `slabs: [['rockScorpion', 3]]` (dormant); `worksMixed: [['rockRoller', 0.6], ['rockScorpion', 2], ['chough', 2]]`; `snowfield: [['warg', 3], ['snowWorm', 1.5], ['chough', 1]]`.

**Champions.** The shipped roll is 6% × difficulty × co-op (world.js:438). Act VII's zones multiply it by 1.5 (one number in `HAZ7`), and every lookout's hold spawns one champion pack for certain (§8).

### 4.3 Boss rules, from the balance report
The Shade ran 281-435 s with 81-146 blows landing; the bots never died; Wanderer was hardly gentler (`balance-report.md`). Act VII's two fights are written to these rules, and G3 measures them:
1. **No least-time lock of any kind.** No `KETOS_MIN`/`SHADE_MIN` line (ai.js:4780, 5199), no `lockPhase` on a timer, no `hpFloor`. A strong hero may skip a phase; the phase's entry move still plays once.
2. **Few blows, each one seen coming.** A fight has **three or four kinds of telegraphed blow** and no chip damage: no damaging ground that lingers, no add that hits for 2%. Target: **4-10 blows land** in a Warden-difficulty fight for the bot's reference build.
3. **A blow matters.** 12-18% of her life on Warden for the big ones (a hard cap of 20%), so a capped hero cannot simply heal through three in a row.
4. **Skill shortens the fight; nothing lengthens it.** Each boss has one mountain-made opening the player can engineer (a slide, a sluice). Using them cuts the fight by about a quarter. Not using them costs time only.
5. **Easy is easier in pace.** On Wanderer: cooldowns × 1.35, blows × 0.6, one chute armed where Warden arms two, no chained second charge, no second sluice-proof stomp. Telegraph lengths never change by difficulty (the standing rule of HAZ5 and HAZ6, data.js:33).
6. **The same for the three classes.** Every danger is a place to stand or not stand. None is a melee-range tax or a ranged-only window.

**Bands (G3, the bot's reference build at 48-50, Warden difficulty):**

| | Kallisto | Kelados |
|---|---|---|
| time to kill | 110-170 s | 150-230 s |
| hard ceiling, any class, any run | 240 s | 270 s |
| blows that land | 4-8 | 6-10 |
| lowest life (median) | 30-55% | 25-45% |
| time under 30% of life | 3-12 s | 5-18 s |
| deaths, Warden / Wanderer | 3-10% / 0-2% of runs | 8-15% / 0-3% |
| Wanderer time ÷ Warden time | 0.7-0.9 | 0.7-0.9 |
| act's lives of damage over Act V's, by `balance-act.mjs` | **× 1.2-1.45** for the whole act | |

Starting life multipliers: Kallisto × 230, Kelados × 300 (the Tower and the Skotos are × 170 and fell in 35-172 s without locks; the Ketos is × 185, data.js:194-215). They are starting points for stage C, not promises.

### 4.4 Kallisto, the Waking Bear
- **Body:** bear.glb, `CAST.kallisto = ['bear', 1]`, `look.scale 2.1` (the Rime Bear is 1.3, data.js:186), her own coat with a wet-dark tint at 0.2. `STAND_IN.kallisto = ['amberBear', 'troll']`. **Look gate at stage 0** in `?cview&only=bear&scales=2.1` beside the 1.8 m reference: Act VI's Icemaw passed at × 3.4 on a 1024 map, so × 2.1 on the bear's two 1024 maps should; if her face blurs at the play camera, × 1.8.
- **Table:** `KALLISTO = { name: 'kallisto', phases: [0.66, 0.33], wake: 16, intro, onPhase, tick, moves }` run by `boss()` (ai.js:2556). `tick` is HART's wheel-away (ai.js:2244-2251).

| phase | what she does | telegraph | reuses |
|---|---|---|---|
| **1. Hungry** (100-66%) | **Swipe** (basic): a cone of 4.6 m | 0.55 s cone | WEAVER's bite (ai.js:2116) |
| | **Charge**: she wheels away, turns and runs an 18 m line. Into a boulder, a fallen pine or the cliff: dazed 3.5 s and Stunned (× 1.5) | 0.9 s line, her `rear` clip | HART's charge and `dashStep` (ai.js:1906); the Tower's beached daze (ai.js:3836) |
| | **Roar**: she howls at the cliff and one armed chute comes down across the bowl. **It hits her too** if she stands in it: 6% of her life and 4 s buried | the Slide's own 2.8 s lane | mechanic 2; her `howl` clip |
| **2. The water rises** (66-33%) | on entry the head-stream rises one step: three gravel bars, wading between them (she swims, `swim: true`) | the water's foam leads by a step, as shipped (tide.js header) | `z.tide.mere` (tide.js:175) |
| | **Rear and slam**: a circle of r 5 round her, then two rocks fall from the cliff | 1.1 s circle; 1.0 s circles for the rocks | LORD's wail shape (ai.js:2131); `vaultAt` (forge.js:211) |
| **3. The cub cries** (33-0%) | **Double charge**: the second line starts where the first ended (not on Wanderer) | each 0.9 s | the `chain` field of a move (ai.js:2590-2593) |
| | Roar arms two chutes (one on Wanderer) | 2.8 s | mechanic 2 |

- **The opening the player makes:** stand so that her charge runs through a chute's line just as a roar's slide arrives, or with a boulder behind you. A clean bait is a 3.5-4 s window at × 1.5.
- **She is not killed.** At 1 life she stops (`dieClip: 'daze'`, then a seated idle); the `kill` event fires as for any boss, so loot, the quest and the legendary follow the shipped route (story.js's `kill` branch per boss, engine brief §1.9). `kallistoRest` is saved first.
- **Readable moments in a fight:** about 6-8 charges, 3 roars, 3 slams.
- **Cost:** 2.5-3 d with its scenario.

### 4.5 Kelados, the Sleeper under the Mountain
- **Body:** golem.glb (16k triangles; walk, run, idle, attack, attack2, slam, warcry, hit, die), `CAST.kelados = ['golem', 1]`, `look.scale 2.3`, a lichen-grey tint. Code parts (build7.js, attached with `attachUpright`, actors.js:288): **eight plates of blue ice** on shoulders, chest and thighs, **a cap of snow**, **a young pine on the left shoulder**, moss cards. `STAND_IN.kelados = ['stonewarden', 'troll']`.
- **Why the golem again:** it was Act II's first boss, forty levels ago, at × 1; here it is more than twice the size, a different colour, wearing ice that comes off, and it does not behave as the Stonewarden did. The stage-0 look gate decides whether that is enough (owner question 3).
- **Table:** `KELADOS = { name: 'kelados', phases: [0.66, 0.33], wake: 22, ... }`. He is woken by the story (`a.holdWake` until `keladosWake`, the hook Karthax uses, engine brief §1.9).

| phase | what he does | telegraph | reuses |
|---|---|---|---|
| **1. Ice-bound** (100-66%): waist-deep in the dam, rooted | **Sweep**: an arm across a 100° cone of 9 m | 1.0 s cone | the Lady rooted (`a.rooted`, ai.js:2466-2489); teleCone |
| | **Fist**: a tremor ring that travels out to 12 m; dodge through it | 1.2 s circle, then the ring | LORD's wail (ai.js:2131), `ring` |
| | **Ice block**: he tears one off the dam and lobs it; it lands as a circle of r 2 and **stays 20 s as cover** | 1.0 s circle | `drip` with `shard: true` (forge.js:152) |
| | every second Fist shakes one chute loose across the arena | 2.8 s lane | mechanic 2 |
| **2. Loosed** (66-33%): two plates fall, the lake drops a step, he walks (speed 3.2) | **Boulder**: a rock rolled down a 20 m line, 3 m wide | 1.0 s line | LORD's wave (ai.js:2127) with a rock mesh |
| | **Stomp**: a circle of r 6, and both chutes armed as an X (one on Wanderer) | 1.1 s circle; 2.8 s lanes | mechanic 2 |
| **3. Awake** (33-0%): four more plates fall, the lake at its lowest, the three levers bared | his moves as phase 2, cooldowns × 0.85 | | |
| | **The sluices** (the player's): pull a lever (1 s) and after 2.8 s a sheet of lake water runs its channel across a third of the arena. **If he stands in it he goes to his knees for 5 s, Stunned.** If she does, a wash-out (6% and a push). Each lever once | 2.8 s lane, blue | a flue with water's colours (forge.js `inFlue`, :54) |

- **Sun and shade on him:** under a cloud the ice grips him again: his cooldowns × 1.4 and his walk × 0.7 while the shade lies on him. **It never changes what he takes.** The cloud is a breather, not a damage window (rule 4: nothing lengthens the fight).
- **The ice is the life bar's picture:** two plates fall at 66%, four at 33%, the last two when he kneels. A player who never looks at the bar still knows where the fight stands.
- **He is not killed.** At 1 life he kneels (`dieClip` the golem's `die` held at its kneeling frame, then a seated statue pose). `keladosRest` is saved first.
- **Cost:** 3-3.5 d with its scenario.

### 4.6 Co-op at the bosses
One `G.bossActor` as shipped. Charges pick the hero farthest from her last target (so a party is not chain-charged). A lever or a winch is a guest-usable interact on the 'u' topic, as Act VI's hearthstones are (act6-contract, Co-op). `COOP.boss` (data.js:19) scales life as shipped. `coop.mjs bosses7` runs both at two and four.

---

## 5. Mechanics: three shipped systems, one new input each

### 5.1 The Race (Το Ρέμα): tide.js + the hero's hand on the weirs
**What exists.** tide.js runs a clock from a layout's `L.tideCfg` over `L.bed` cells in 0.15 m steps with a warning sound before each rise, defers any step that would close the hero's cell and walks her out along a lane, slides pickups, and evicts monsters (tide.js:1-25, 162, 292, 340). Beside the clock one group of cells, `L.pocket === 2`, keeps **its own level**, `z.tide.mere = { h, rate }` (tide.js:168-183), which only the Ketos has ever moved. The HUD dial (`tideDial`, tide.js:474) and the co-op sync of that level (`o.w[5..6]`) are shipped.

**The one new input.** The own-level channel answers to **world-state flags the hero sets**: each weir (thaw) or sluice step (tarn) lowers it 0.3 m, for good.

**Rules the player learns in the first minute.**
1. Pale foaming water you can wade, slowly. Deep blue water you cannot cross.
2. The brooks swell and fall by themselves. A roar comes six seconds before they rise.
3. The river does not fall by itself. Turn a weir and it drops a step, everywhere at once, and stays down.
4. Water that rises over a camp of goblins takes the goblins.

**In code.** `resetTide` (tide.js:88) reads the channel's level from the zone's flags on entry (`raceLevel(F)`: 1.2 − 0.3 × weirs); the weir's interact calls the same setter the Ketos's phase 2 does. `floodWave` (tide.js:482) is reused for a surge pack when a weir opens. A `HAZ7` row in data.js beside HAZ5 and HAZ6 (`actHaz`, data.js:447, gains the third act). **Cost: 0.75-1 d.**

### 5.2 The Slide (Η Χιονοστιβάδα): forge.js + a trigger
**What exists.** A flue is a line with a mouth, a direction, a length and a width. It inhales for 2.8 s (a telegraph down its whole length, never shortened), then a front runs it for 1.2 s and strikes once anything not behind something solid (`inFlue` tests `map.los` from the mouth, forge.js:54-58). Monsters take a quarter. It fires on a period (`BREATH`, forge.js:27; `tickFlues`, :60). Act VI then made the falling-things half generic (`drip`, `vaultAt`, shards that block cells; forge.js:144-260) and let the skills' blows on the ground bring the vault down (`vaultOn`, forge.js:230).

**The one new input.** A chute has **no period. It is armed, and something loud sets it off:** a hero's ground skill landing within 10 m of its horn-stone (the same call sites that already ask `vaultOn()`, skillsx.js:187, 284, 369, 385), a Rock-roller's or a Den-bear's slam, a boss's roar. Once fired it is spent for 45 s while the cornice builds again (a white cap growing at its mouth is the "armed" sign).

**Rules the player learns in the first minute.**
1. A white lane with a cornice at its top is loaded. No cornice, no slide.
2. Something loud near the standing stone at its foot brings it down, 2.8 s later, along the whole lane.
3. Stand behind a boulder or a thick tree and it parts round you.
4. It hits everything in the lane as hard as it hits you. Start it on purpose.

**In code.** `startFlues(L.flues)` as shipped, each flue carrying `kind: 'snow'`, `armed`, `rearm: 45`; a look table per kind (colour, particles, sounds) where the fire's are today; the hit is `HAZ7.slide`% of max life (8 on Wanderer, 14, 14, 18, 22, 26), a push along the line (`pl.pull`), monsters × 1 and buried 2 s; a bus event `'loud'` (x, z, r) emitted by the four slam sites; a snow tongue left 8 s as slush (`slushAt`). **Cost: 1.5-2 d.**

### 5.3 Sun and Shade (Ήλιος και Ίσκιος): light.js + shade that moves
**What exists.** A zone's light kind turns light.js on; `lightAt(x, z)` answers from pools, beams, lamps and the hero's ring (light.js:58-74). Pools are plain movable objects (`addLightPool`, light.js:325) and already have a dark-cored disc (`core: 'dark'`, DISC6_FS, light.js:462). Dormant packs wake on distance or a hit (`PACK_DORMANT`, `def.wake`); a statue actor is frozen with an ice tint until `a.awake`.

**The one new input.** In a **'sun'** zone the question is turned round: everything is lit **except** inside a shade pool. Three or four **clouds** (pools with `shade: true`, r 9-14 m) cross the map on straight lines at 1.2 m/s with the wind, and `L.shade` marks the fixed shade under cliffs. `sunAt(x, z)` is `!shadeAt(x, z)`.

**Rules the player learns in the first minute.**
1. Ice sleeps in shade and wakes in sun. A troll in a block of ice is harmless until a cloud's edge slides off it.
2. A cornice in shade will not come down. The slide waits for the sun.
3. You can wake the ice yourself: stand by it with the Cradle (1.5 s).
4. Choughs leave you alone under a cloud or a tree.

**What it is not.** It is not a damage rule and not a Shroud. Nothing the hero strikes takes more or less for where it stands. That keeps it readable on a phone and keeps it from stretching a fight.

**In code.** `lightKind() === 'sun'`: `lightAt` returns `!shadeAt`, the hero's ring is not drawn (`heroLightR` 0, light.js:109), `shroudOn` stays false. A `clouds` ticker (seeded lines, positions a function of the host's zone clock, so co-op needs one number). The wake input in ai.js's dormant check; the chute's "armed and sunlit" test; `mixAtmos` toward the shade row while the hero is under one. **Cost: 1.5-2 d.**

**The Lamplight track** («Λυχνοφώς», progression.js:24) grows a ring that Act VII does not draw. So that the points keep a use here: the Cradle's thaw channel (ice blocks, winches) is shortened by the track's bonus (1.5 s ÷ (1 + ringPct / 100)). One line; honest but small.

### 5.4 What carries over, and what does not run
- Runs as shipped: tide.js, forge.js, light.js, sap.js's slush pools (through `slushAt`).
- **Does not run in Act VII:** cold.js (no Cold: this is the warm act), ice.js (no thin ice), the Carried Fire (`fireOn()` is 'under' only, light.js:138), the Names from Above, the Shroud.
- **Who ticks what:** no new call site. `tickTide`, `tickFlues` and `tickLight` are already in the frame loop.

### 5.5 How the three meet (and where they must not)
The three rules are kept separate so that each can be learned alone, and they touch in exactly three places, each of which is a sentence a player could say:
1. **Sun arms snow.** A cornice in a cloud's shade cannot be kicked loose (5.2 rule 1 + 5.3 rule 2).
2. **Snow becomes water.** A slide's tongue lies 8 s as slush, a wading-slow circle (5.2 → tide.js's slush).
3. **Water wakes sleepers.** A brook rising into a den wakes its bear (5.1 → the dormant wake).

What they must **not** do: nothing drains a meter; nothing stacks a damage multiplier; no rule changes by difficulty except its numbers; no rule is needed to finish a boss. A player who ignores all three can still finish the act on Warden. A player who uses them finishes it faster and safer. That is the whole difference from Act VI's Carried Fire, which the player had to manage every second.

### 5.6 The hazard row, `HAZ7` (data.js, beside HAZ5 and HAZ6; indexed like `DIFFS`)
Starting numbers for stage B. Telegraph lengths are not in the table because they never change.

| | Wanderer | Warden | Hero | Nightmare | Ash | Skotos |
|---|---|---|---|---|---|---|
| the brooks' cycle (s) | 150 | 120 | 120 | 120 | 110 | 100 |
| the roar's lead before a rise (s) | 8 | 6 | 6 | 6 | 6 | 6 |
| a wash-out (% of her life) | 3 | 6 | 6 | 8 | 10 | 12 |
| a slide (% of her life) | 8 | 14 | 14 | 18 | 22 | 26 |
| a chute's re-arm (s) | 60 | 45 | 45 | 45 | 40 | 35 |
| a falling rock or ice block (× the zone's blow) | 0.6 | 0.9 | 0.9 | 1.0 | 1.1 | 1.2 |
| clouds on the map at once | 4 | 3 | 3 | 3 | 2 | 2 |
| sun needed to wake the Icebound (s) | 3 | 2 | 2 | 2 | 1.5 | 1 |
| champion odds in the act's zones (×) | 1.2 | 1.5 | 1.5 | 1.5 | 1.6 | 1.7 |
| the creatures' blows (× `DIFFS.dmg`) | 1.5 | 1 | 1 | 1 | 1 | 1 |
| bosses: cooldowns (×) | 1.35 | 1 | 1 | 0.9 | 0.85 | 0.8 |
| bosses: blows (×) | 0.6 | 1 | 1 | 1 | 1 | 1 |
| bosses: chutes armed by a roar or a stomp | 1 | 2 | 2 | 2 | 3 | 3 |
| bosses: the chained second charge, the X of chutes | no | yes | yes | yes | yes | yes |
| **bosses: least time for a phase** | **none** | **none** | **none** | **none** | **none** | **none** |

(The creatures' blows × 1.5 on Wanderer is HAZ5's and HAZ6's own number, data.js:35, 53: it offsets `DIFFS.dmg` 0.55 so that the act's commons are not weightless on the easy difficulty, while the bosses' own blows fall to 0.6.)

### 5.7 Class hooks (small, and all through call sites that exist)
| class | hook | where |
|---|---|---|
| Warden | Leap, Quake and the Earthsplitter variants are 'loud': they kick an armed, sunlit chute within 10 m. War Cry is loud too, at 6 m | the sites that ask `vaultOn()` today (forge.js:230; skillsx.js:187, 284, 369, 385) |
| Ranger | Rain of Arrows is loud at its centre. The spirit wolf's howl wakes a den at 12 m (so the Ranger can pull a bear from range). A pinned foe in a lane stays in it | the same sites; `petAI` |
| Mage | Meteor is loud. **Fire thaws:** burning ground on an ice block wakes its Icebound in half the time and frees a winch without the Cradle's channel. Frost Nova and Frozen Orb re-freeze: an Icebound woken less than 3 s ago goes back to sleep for 4 s (once each) | `fireAt` (light.js:86) in the wake test; the Nova's slush site (tide.js:396) |

Each is one condition at a site that already branches on the zone's kind. Covered by `skillsfx` in a 'sun' zone for each class (G2). 0.5 d, counted in item 10.

### 5.8 Touch and phone readability (rules the act keeps)
- **One lane colour per danger, never shared:** white for snow, blue for sluice water, the boss's red for its own blows. Each with the 'day' telegraph's dark edge so it reads on grass and on snow.
- **Nothing the player must read is smaller than 1.5 m on the ground** at zoom 1.05. The scorpion's tail-raise is paired with a 1.2 m ground circle because its legs may read as hairlines (stage 0's own note on the model).
- **No rule depends on colour alone:** an armed chute has a cornice (shape), a deep ford has a hard edge line (the sea shader's, kept in SEA_MELT), a cloud has an edge that moves.
- **Interacts never overlap a danger's lane** and stand 3 m apart in arenas (hard checks, §3).
- **The brightest thing on screen is never the ground.** Exposure 0.92 on snow and the hero's own light off (heroI 0), so damage numbers, loot beams and telegraphs keep their headroom. Checked by `daytele`'s luminance samples.
- **'Reduce flicker'** (`G.settings.flicker`, Act VI's setting) also stills the clouds' edge shimmer and the water's glint. `tremble6`'s small overrun (0.120 against 0.10 at q1, `stageE-report.md`) is not made worse: no trembling pool is added by this act.

---

## 6. Engine work, assets, memory, perf

### 6.1 Engine work, in dependency order
| # | item | files | days |
|---|---|---|---|
| 1 | **Plumbing for a seventh act:** `ZONES` rows (world.js:44-64), `READY.melt` and `zonePacks` (world.js:100-101), the generator dispatch (world.js:155-158), `act7Zone` beside `act6Zone` (world.js:225-226), `ECHO_PROMPT` (world.js:657), the quest clamp 39 → 47 (story.js:35), `actComplete(7)` (story.js:571-581), `offerBoons` and `BOONS[7]`, `newHero`'s `act7: -1` (state.js:29) and the migration (boot.js:207-214), the waypoint lists (panels.js:217-221), the quest marker (hud.js), `WAKE` (wake.js:13), the unload's "Act V or later" test (unload.js), `ACT_FILES.act7` and three `CAST` rows (creatures.js:18-40), `HAZ7` and `actHaz` (data.js:50-59, 447), the world viewer. **While here, `ACT_FILES.act6`** (see §10.4) | world, story, boot, state, panels, hud, wake, unload, creatures, data | 1.5-2 |
| 2 | **gen7.js**, two zones and two readings each, with `tools/check-act7.mjs` (300 seeds a zone and reading). gen6's private helpers that both need (`finish6`, `heights6`, `refuges`, `lightUp`, `spotNear`; gen6.js:97-217) move to genlib.js first, with `check-act6` re-run to show nothing moved | gen7, genlib, gen6 | 5.5-6.5 |
| 3 | **Daylight:** the ATMOS rows, `a.sun`, the 'day' telegraph and its mirror, decals on bright ground, the two fx ambients, smoke on the peaks | atmos, gfx, fx, build, world | 2-2.5 |
| 4 | **ground7** and the dry slot's `dryLayer`, `setThaw(k)` and its easing (the `firstAutumn` pattern) | build | 1-1.25 |
| 5 | **SEA_MELT** | sea | 0.5 |
| 6 | **build7.js:** `act7Prop` (weir, log-jam, winch, lever, lookout hearth, ice block, cornice, snow tongue, den, piers, snow bridge, flower cards, cloud, rainbow), `act7Level`, Kelados's ice, snow cap, pine and moss | build7 | 3-3.5 |
| 7 | **The Race** | tide, world, data | 0.75-1 |
| 8 | **The Slide** | forge, skills, skillsx, ai | 1.5-2 |
| 9 | **Sun and Shade** | light, ai, world | 1.5-2 |
| 10 | **Enemies:** four new defs, the scorpion's AI, nine packs, the traits, `cast7` | data, ai, actors | 3-3.5 |
| 11 | **The Scorpion build** (`tools/creatures/act7/scorpion.mjs` to stage 0's notes of 27 October: keep 7.3k faces, strip 52 helper bones, drop two maps, 512 d / 256 n), `CAST` rows for `rockScorpion` **and** Act VI's `falselight`, credits in four places | tools, creatures, credits | 0-1.25 |
| 12 | **Bosses:** Kallisto 2.5-3, Kelados 3-3.5 | ai, data, actors, build7 | 5.5-6.5 |
| 13 | **The Seven Fires** (§8) | world, story, data, stats, panels, save | 2-2.5 |
| 14 | **Balance:** `tools/balance-act.mjs` taught Act VII and the three new measures (lowest life, time under 30%, deaths); the runs; tuning | tools, data | 2.5-3 |
| 15 | **Story and text:** quests 40-47, five cines (hook, arrival × 2, Kallisto's rest, the lake let down and home), catch-ups, Halda at the camps, six keepers; about 190 bilingual lines; two proofreaders | story, text, world, actors | 5-6 |
| 16 | **Audio:** four themes, one variant, about 14 sounds | audio | 2-2.5 |
| 17 | **Co-op:** protocol 6 (§8.3) | net, coop tests | 1.5-2 |
| 18 | **Saves:** migration, `SAVE_FMT` 2 (§8.4), `save16`, the cloud check | save, boot, data, cloud | 0.5-0.75 |
| 19 | **Scenarios, perf7, regress sets, the fixtures** (§7.2) | tools | 3.5-4 |
| 20 | **Release** | lead | 2.5-3 |
| 21 | **Stage 0** | lead, assets | 2-2.5 |
| | **Total** | | **47-59** |

### 6.2 Assets
**New files (all optional: each has a shipped fallback that the act is built on first).**

| asset | source | licence | state | raw | phone MB | fallback |
|---|---|---|---|---|---|---|
| **Rock-scorpion** (and Act VI's Falselight): Sketchfab "Scorpion" by anthonyvanoo, uid 4c0fd62d33ab4d2592ee0a1d985a480d | Sketchfab | CC-BY 4.0 | **provenance passed 27 October, "no doubt found"** (`act6-briefs/asset-gates.json`, `stage0-assets.md`); the file analysed (7,288 triangles, 5 clips: Walk, Idle, Area Attack, Defend, Death). Re-read the licence on the day of download; nothing else to gate | about 0.35 MB | 1.74 | spider.glb × 0.8 (boot), which is how the Falselight ships today |
| `melt/meadow` (d 1024, n 512) | Poly Haven, a grass or meadow scan | CC0 1.0 | **to verify** (name, look at the play camera, licence page) | about 0.25 MB | 2.79 | `leaves` (boot) tinted green |
| `melt/streambed` (d 1024, n 512): wet gravel for the Race's bared bed and the lake's new shore | Poly Haven or ambientCG | CC0 1.0 | **to verify** | about 0.25 MB | 2.79 | `rime/shore` when loaded, else `mud` (boot) |

**Reused, shipped:** bear.glb (WildMesh 3D, CC-BY 4.0), golem.glb, worm.glb, skua.glb (their shipped credits), wolf, goblin, troll, spider (boot); people.glb; env, trees, village, the dungeon and town kits (boot); the `rime` pack for `tarn`.

**Not used:** the `deep`, `wood` and `cinder` packs, `folk`, `grove`, `ash`, `frost` in the zones. The Pistosaur (it is the Ketos's; building it is Act VI's own unfinished work and is not charged to this act, though the same stage-0 day could do it).

**Totals.** New raw: **0.5-0.9 MB** (about 0.7-1.2 MiB of artifact, on today's 143 files and 64 MB). New phone texture: **5.6-7.4 MB**, 0 with every fallback.

### 6.3 Memory at a cold start (phone GPU texture, on top of boot)
| | into `thaw` | into `tarn` |
|---|---|---|
| packs of props | 0 (boot) | rime props 24.75 |
| ground layers | melt 5.6 | rime 16.75 + melt 5.6 |
| people sets | 0 (boot) | 0 (boot) |
| creature group act7: bear 9.0, golem 4.2, worm 1.4, skua 1.4, scorpion 1.7 | 17.7 | 17.7 |
| code textures (cloud disc, smoke, rainbow, flower atlas 256²) | 0.5 | 0.5 |
| **total** | **about 24 MB** | **about 65 MB** |
| with no download at all | about 18 MB | about 59 MB |
| the bar | 110 MB | 110 MB |
| Act VI, measured at G1 | 69 MB | |

- Rime's two figures are act6-design's measured ones. The creature figures are computed here from `tools/glbinfo.mjs` map sizes under the engine brief's rule, and should be re-measured by the gate (`mem7`).
- **A session that played Act VI first** adds about 23 MB (rime and its layers are already resident, and the unload of Acts II-IV has already run).
- **G1's bar for this act: ≤ 75 MB cold into either zone.** It is a tighter bar than the frame's 110 because the design allows it, and it leaves room for the Play Store build's own overhead.

### 6.4 The perf plan
- **perf7** is perf6 (scenario.mjs:4019, `tools/perf6-terms.mjs`) pointed at five new spots, measured the same way (quality 1, 915 × 412 at a pixel ratio of 1.5, adaptive resolution pinned, the Field measured in the same run):
  1. the Drowned Meadow at the clock's top, 25 actors, the tree-shadow worst case;
  2. the Chutes with two slides running and 20 actors;
  3. the Den in Kallisto's phase 2 (water, a slide, rocks);
  4. the Snowfield with four clouds and 20 actors;
  5. the Dam in Kelados's phase 3 with a sluice sheet and both chutes.
- **Bar: every spot ≤ 1.00 of the Field at q1**; q0 measured as a floor. Run at the end of stage A with stand-in packs and again at G2 with the real ones, as Act VI did.
- **Savings are defines, never uniform branches** (the coast-perf finding act6-design records: SwiftShader computes both sides of a uniform `if`). G_AUR, G_WIN and G_EDGE are compiled out per zone; SEA_MELT is its own program.
- **Known unknowns, each with its fallback:** tree shadows in the Meadow (fallback: blob shadows at q ≤ 1); the dry slot plus G_WET on one ground (fallback: G_WET off outside 20 m of water by a second ground config for the dry half of the map); flower cards (off at q0, halved at q1).
- **The owner's phone** runs the five spots before any Play Store build (G5), as for Act VI.

---

## 7. Stage plan

### 7.1 Stages and gates
| stage | days | work | gate |
|---|---|---|---|
| **0. Decisions, contract, look gates** | 2-2.5 | The owner's answers (§11). The contract (`docs/act7-contract.md`: file ownership, shared names, flags, events, protocol 6, scenarios). **Look gates on shipped zones, before any Act VII code:** (a) the daylight rows on `?world=forest`, `?world=pass` and `?world=farlight` by an atmosphere override, shots at the play camera on quality 0 and 1, with a shipped telegraph, a light ring and three monsters in frame; (b) Kallisto at × 2.1 and Kelados at × 2.3 in the creature viewer beside the 1.8 m reference; (c) the Scorpion's legs at × 1.6, pitch 0.95, quality 0 (stage 0's own note of 27 October); (d) the two Poly Haven layers found, licence pages read, shot on a flat test ground. The stale tests named in `stageE-report.md` retired or repointed (§7.3) | **G0:** each look gate passed or its fallback chosen and written into the contract; the downloads fetched and built **or declared not coming** (then the act proceeds on fallbacks with no schedule change) |
| **A. The ground** | 14.5-17.5 | Items 1-6 and perf7; `play7` as a skeleton | **G1:** `check-act7` 300 seeds per zone and reading, no hard failure, mean tries ≤ 3; **perf7 ≤ 1.00** at all five spots with stand-in packs; `mem7` ≤ 75 MB cold into each zone; `save16`; `gate7`; regress-A |
| **B. Systems and enemies** | 11.25-15.5 | Items 7-11, 13, 17 | **G2:** `race`, `slide`, `sun` soaks; `cast7` cold; `skillsfx` in a 'sun' zone for each class; `daytele` (the 'day' telegraph's contrast on meadow and on snow at q0 and q1, and across the co-op mirror); `fires7`; `coop.mjs act7`; perf7 again with real packs; **zone danger measured** (§8.2); regress-B |
| **C. Bosses and balance** | 8.75-10.25 | Items 12, 14 | **G3:** the bands of §4.3 for the three classes on Warden and Wanderer; **no boss run over its ceiling**; the act's damage over Act V's in × 1.2-1.45; `kallisto`, `kelados`, `leg7`, `diff7`; `coop.mjs bosses7`; regress-C |
| **D. Story, text, music, saves** | 8.25-10 | Items 15, 16, 18 | **G4:** `hook7`, `catch7`, `weirs7`, `ending7`, `echo7`, `home7`; two readers on every line; the owner reads the key Greek lines (the hook, Kelados's rest, the last line); regress-D |
| **E. Release** | 2.5-3 | Every scenario, both builds, the strict-CSP check on desktop and phone emulation, `SAVE_FMT` 2 switched on, publish | **G5:** everything passes **with no "out of date" row**; the owner's phone run of perf7's five spots |

### 7.2 Scenarios by stage, and what each asserts
| stage | scenario | asserts |
|---|---|---|
| A | `check-act7` (tool) | the reach checks of §3.1 and §3.2 at every water level and reading |
| A | `ground7` | each zone's ground program compiles with its define set and its fallback layer chain; **run with `?nopacks`** (see §7.3), so later stages cannot change what it sees |
| A | `perf7`, `mem7` | §6.3, §6.4 |
| A | `save16` | a v22 hero at quest 39 loads, gains `act7: -1` and `fires`, keeps `fmt` 1 until the release switch; with the switch, is written as 2 and refused by a build that reads 1 (`heroFits` 'newer', save.js:231) |
| A | `gate7` | a Shadow Gate tier's layout and packs equal the shipped generator's for the same seed |
| A | `play7` (skeleton) | a Warden with god-mode walks the critical path from `fx7_new` to the end state by named spots; grows every stage |
| B | `race` | `map.ver` ≤ 4 bumps a second; the Race at 1.2 / 0.9 / 0.6 / 0.3 from flags; never a cell closed under the hero; the fords open in order; the level on a guest's page |
| B | `slide` | a chute fires only when armed, sunlit and kicked; never under 2.8 s of warning; cover holds; a goblin in the lane takes the full blow; spent for 45 s |
| B | `sun` | an Icebound sleeps under a cloud for 60 s and wakes within 3 s of sun; a chough breaks off under shade; the clouds' positions equal on two pages |
| B | `daytele` | above |
| B | `cast7` | every new kind's body and its stand-in in a cold session |
| B | `fires7` | a hold at a lookout: the wave, the rank written for every hero present, the bonus in `G.stats`, the far fire's colour |
| B | `coop.mjs act7` | a guest turns a weir, pulls a lever, kicks a chute through the host; a VER 5 page and a VER 6 page refuse each other |
| C | `kallisto`, `kelados` | each for the three classes: the bands; one `G.bossActor`; the rest state, never a corpse; a phase skipped by a strong hero still plays its entry |
| C | `leg7`, `diff7` | one first-kill drop each; the Wanderer row's pace |
| D | `hook7`, `catch7`, `weirs7`, `ending7`, `echo7`, `home7` | the story's rows; every flag-saved-first catch-up; the echoes once a day |

### 7.3 Tests that stay true (the lesson of `ground6`, `look6`, `place6`, `resume`, `play6`)
`stageE-report.md` found three stage-A tests stale because later stages filled the zones they were written against, one test stale because main changed where Continue lands, and a `play6` the contract named but nobody wrote. Four rules, each cheap:
1. **Fixtures, not bare zones.** Every scenario starts from one of three named saves built from flags by one file, `tools/fixtures7.mjs`: `fx7_new` (quest 39, the act not begun), `fx7_mid` (three weirs open, `kallistoRest`), `fx7_done` (`act7`). A scenario never assumes "the zone is empty" or "the door is still shut": it says which fixture it wants.
2. **A switch for what must be bare.** A stage-A test that needs an unfilled zone asks for it with `?nopacks&nostory`, a switch that stays supported for the act's life, in place of relying on the zone being empty that week. `ground7` and the look shots use it.
3. **Places by name, never by coordinate or by walking.** Tests go to `spot('weir2')`, not to (54, 92) and not along a path a later stage may gate.
4. **Every scenario carries `stage` and `until`.** `until: 'E'` is the default and means "true of the finished act". A test that is knowingly temporary says `until: 'B'`, and **the gate of that stage fails while any scenario with an expired `until` still exists**: it is deleted or rewritten in the commit that outdates it. `node tools/scenario.mjs --stale` lists them. The regress sets are built from the tags, not from hand-kept lists.

And two debts paid at stage 0: `ground6`, `look6` and `place6` are repointed with rule 2 or deleted; `resume`'s `fall` part is updated to main's "Start in the village"; `diagcheck`, `play5` and `tremble6` each get an owner and a line in the contract (fix, or retire by name). **`play7` exists from stage A** so that it cannot be forgotten at E.

### 7.4 Cut order (about 15%, 7-8 days), in the order to take them
| # | cut | saves | what is lost |
|---|---|---|---|
| 1 | the Scorpion build | 1.25 d | the Rock-scorpion is the spider; Act VI's Falselight stays the spider |
| 2 | the Seven Fires' ranks by difficulty → one rank each | 1 d | the long ladder; the seven bonuses stay |
| 3 | clouds that move → a whole-zone cloud every 45 s for 12 s | 0.75 d | the tactical edge of a cloud; the rule and the picture of dimming stay |
| 4 | lookouts 6 → 4 (two a zone); the other two fires are given by the two bosses' first falls, Arna's hill stays the seventh | 0.75 d | two hold events |
| 5 | the two `melt` layers | 0.5 d | the meadow is tinted leaf litter; the lake's new shore is rime's |
| 6 | the Rock-roller's boulders left as cover; the snow bridges and crevasses | 1 d | one use of cover; one piece of the Snowfield's layout |
| 7 | the echoes, shipped in the first patch after release | 1 d | two daily refights at launch |
| 8 | the cub's cine and the rainbow → narration | 0.75 d | two small pictures |
| 9 | one theme (the `tarn` zone takes the `thaw` theme's variant) | 0.5 d | a tune |
| | **total** | **7.5 d** | brings 47-59 to about **40-51** |

Never cut: the look gates, perf7, the balance runs, `play7`, the proofreading.

---

## 8. Progression at the cap, co-op, saves

### 8.1 A reason to keep playing at 50: the Seven Fires (Οι Εφτά Φωτιές)
**The problem.** A hero arrives at level 50 with Mastery; the act cannot give levels. Act VI gave a 13th Mastery track. A 14th would be the same answer twice.

**The proposal.** The seven fires of d.peaks.2 become a small permanent ladder that asks the player to come back on harder difficulties, which is where a capped hero's power is meant to be spent (six difficulties exist, data.js:4-11, and the sixth unlocks from Act V on Ash).
- **Six lookouts** («βίγλες»: three in `thaw`, three in `tarn`) and **Arna's hill** make seven. Each lookout has a hearth, and a keeper stranded beside it by water or snow.
- **Holding a lookout** (optional): light its hearth (2 s) and hold it for 75 s while one champion pack comes, the brooks rise once and one chute is armed over the approach. This is Act IV's bellows wave (`bellowsWave`, data.js:274) and Act VI's lamp channel put together; no new system.
- **Each fire has a rank: the highest difficulty on which the hero has held it** (1 Wanderer ... 6 Skotos). `h.fires = [r1..r7]`. Arna's hill takes the lowest rank of the other six (it burns as bright as the weakest, so the ladder has a capstone).
- **Each rank of each fire: +0.5% damage and +0.5% life**, forever (a row in stats.js beside the blessings). All seven at rank 2 (Warden) is +7% / +7%; all seven at rank 6 is **+21% / +21%**, a blessing and a half, earned over many sessions.
- **You can see it from home.** A fire's sprite over Whitecliff takes its rank's colour (orange → gold → white, `FAR_BEACONS` rows 7-12, world.js:73-74, one colour field). The owner's "graphics" and "depth" in one small thing.
- **All six on any difficulty** sets `firesAll`: the Act VII blessing is worth × 1.25 (the `REMEMBERED` pattern, data.js:353), and each keeper comes down to Whitecliff with one line.
- **In co-op** every hero present at a hold takes the rank for the host's difficulty.

**Cost:** 2-2.5 d (item 13). **Cut:** one rank only (cut 2).

**Also at the cap, already paid for elsewhere:** Mastery experience from zones that fight back (§8.2); two legendaries that change how a build plays (§9.3); the echoes; the Lamplight hook (§5.3).

### 8.2 Zones worth fighting, and how danger is measured
Act VI's zones cost a capped hero 0.05-0.33 lives a run. Act VII's targets, measured by `balance-act.mjs` with the brief's three measures beside lives of damage:

| measure, a zone run, Warden difficulty, the reference build | target |
|---|---|
| lives of damage | 0.4-0.8 |
| lowest life (median over runs) | 35-65% |
| time under 30% of life | 0-6 s |
| deaths | 0-3% of runs |
| share of monster deaths owed to a slide or to water (the bot is taught to kick a chute when three or more foes stand in its lane) | 15-35% |

What produces it: hazards priced in shares of her life (a slide 14%, a wash-out 6%), which no amount of gear shrinks; champion odds × 1.5; the lookout holds; and big, rare, readable blows (the Den-bear's charge, the Rock-roller's boulder) in place of many small ones.

### 8.3 Co-op (four players, host authority)
Protocol `VER` 5 → **6**. New on the wire, each riding a shipped topic where one exists:

| what | how | precedent |
|---|---|---|
| the Race's and the lake's level | `o.w[5..6]` | the Mere's (act6-contract, Review pass) |
| a weir, a winch, a lever, a lookout hearth | guest-usable interacts on 'u' | the hearthstones and cairns |
| a chute kicked by a guest's skill | asked of the host, an 'ic' op beside 'v', 'vl', 'vr' | the vault's falls (forge.js:205-212) |
| a slide's telegraph and front | the fx mirror, as every `teleLine`; the 'day' telegraph crosses as TELE_DARK does (fx.js:304) | `coop.mjs darkmirror` |
| the clouds | one number: the host's zone clock; positions are a seeded function of it | the tide's clock |
| snow tongues and shards | `cells6` / `cells6Apply` (tide.js:433-442) | Act VI's slush and shards |
| the Seven Fires | the host announces a hold's end; each page writes its own hero's rank | the Lost's flags |
| the thaw's `setThaw(k)` | from the host's flags on `onWorld` | `presenceAgain` |

**Budget:** nothing new is sent per frame. Act VI measured the party of four against Supabase's 100 events a second; `coop.mjs act7` on `NET=supa ... four` re-measures it during a slide soak.

### 8.4 Saves and the format bump
- **New fields:** `act7: -1` on the hero (state.js:29), `fires: [0, 0, 0, 0, 0, 0, 0]`, the flags of §2.3, two waypoints. Migration in `startHero` (boot.js:207-214): `hero.act7 ??= -1`, `hero.fires ??= [...]`, `if (hero.act7 >= 0) flags.act7 = true`. `heroFits` learns the two new legendaries and three blessings (save.js:220-231).
- **`SAVE_FMT` (data.js:63). Take the bump to 2 in Act VII's release, and only there.**
  - The rule written beside the constant is that no public build may write 2 before a public build refuses it. v22, published 17 November, carries the refusal (save.js:231, `stageE-report.md`). So Act VII's release is the first that may write 2.
  - **Why take it:** a v22 tab that meets an Act VII hero through the cloud would otherwise read a hero whose quest it clamps (story.js:35), whose legendaries and blessings it does not know, and write it back smaller. With 2 it refuses that hero cleanly ("newer") and leaves the record alone. This is exactly the case the check was shipped for.
  - **How:** stages A-D build with `SAVE_FMT` 1 so no test build can strand the owner's own heroes; the constant changes in stage E's last commit; `save16` runs both ways; the artifact and the web build go out the same day.
  - **Residual risk:** a browser still holding a build older than v22 has no check. It was the same on 17 November and is why the bump waited one release.

---

## 9. Blessings, echoes, legendaries, music, collectibles

### 9.1 Blessings (`BOONS[7]`; header boon.h7 «Η φωτιά που ξυπνά» / "The fire that wakes"; × 1.25 with `firesAll`)
| id | Greek / English | stats | quote |
|---|---|---|---|
| `thaw` | «Το Λιώσιμο» / "The Thaw" | atkSpd 8, move 6 | «Ό,τι πάγωσε, θυμάται πώς τρέχει.» / "What froze remembers how to run." |
| `den` | «Ο Ύπνος της Αρκούδας» / "The Bear's Sleep" | lifePct 12, regen 15 | «Κοιμήσου. Ήρθε η άνοιξη και χωρίς εσένα.» / "Sleep. Spring came without you too." |
| `sluice` | «Το Νερόθυρο» / "The Water-gate" | area 12, cdr 8 | «Το νερό δεν το σταματάς. Του δείχνεις δρόμο.» / "You don't stop water. You show it a road." |

### 9.2 Echoes (once a day, no story consequence, in the act's material: meltwater and mist)
- **Kallisto** at the den: prompt echo.kallisto «Ξύπνα την αρκούδα» / "Wake the bear". She wakes hungry, fights as written, and lies down again.
- **Kelados** in the slope: prompt echo.kelados «Χτύπα τον ώμο του βουνού» / "Strike the mountain's shoulder". He dreams the fight: his body in a pale mist tint (the echo handler's tint branch, engine brief §1.15), the lake as it now is.
- echo.rise7 «Το νερό θυμάται.» / "The water remembers."; echo.done7 «Ησύχασε πάλι.» / "It is quiet again."

### 9.3 First-kill legendaries (`drop: false`, `LEG_FROM`, data.js:418-445)
| id | Greek / English | base | what it does |
|---|---|---|---|
| `kallistoClaw` | «Το Νύχι της Καλλιστώς» / "Kallisto's Claw" | gloves | After a dodge, her next blow within 2 s is a charge-blow: +60% damage, and it dazes anything that is not a boss for 1 s. Once each 6 s. (One hook in combat.js where a dodge ends.) |
| `mountainHeart` | «Η Καρδιά του Βουνού» / "The Mountain's Heart" | chest | Slides and wash-outs take no life from her (the Skerry Shell's rule for the sea, data.js:437). Each 8 s her heavy blow on the ground starts a small slide of her own: an 8 m lane, 30% of her weapon's damage. |

### 9.4 Music (procedural WebAudio, `THEMES` in audio.js; no files)
| theme | where | idea |
|---|---|---|
| `thaw` | zone 1 | the game's first theme in a bright mode: plucked strings in 6/8 over a running-water arpeggio whose speed follows the Race's level (`Audio.mood`) |
| `kallisto` | boss 1 | hand drums and one low horn; the drums drop out while she is dazed |
| `tarn` | zone 2 | high, sparse and glassy over wind; under a cloud a filter closes |
| `kelados` | boss 2 | slow and heavy in five, a stone struck on the first beat, a sub rumble through `MOOD.sub` on every tremor |
| `thawGreen` (variant) | both zones after the act | the `thaw` theme slower, with the arpeggio at rest |

Plus about 14 sounds (weir wheel, river step, cornice crack, slide roar, snow thump, ice block splitting, chough call, bear's roar and the cub's cry, tremor, sluice gate, winch chain, the lake going out, hearth catching).

### 9.5 Collectibles (optional)
- **The six lookouts** (§8.1) are the act's collectibles and its cap ladder at once: one system, not two.
- **Three Stoneborn mason's marks** («Σημάδια των Μαστόρων», one in `thaw`'s east gully, two in the Old Works): a touch gives a three-line memory "in stone" (the memory panel of Acts III-VI with a grey palette) about who built the gates. Text only, 0.25 d, and the natural place for the story-first proposal's deeper lore.

---

## 10. Risks, what this does not do, honest cost

### 10.1 Risks
| risk | chance | what it would cost | mitigation |
|---|---|---|---|
| **Daylight washes out telegraphs, decals or actors on a phone** | Medium | the act's whole look | Tested **at stage 0 on shipped zones** by an atmosphere override, before any Act VII code. The 'day' telegraph is TELE_DARK's pattern. The fallback (a bright sun over a dark haze) is Act III's shipped recipe and still reads as day |
| **The pale fog shows the map's edge** | Low-medium | an ugly horizon in cines | the walls rise toward the edge as in every zone (`heights6`); cines keep the fog; `townBeyond`'s ground-into-fog trick (engine brief §1.3) for the two arrival shots |
| **Kelados reads as "the Stonewarden again"** | Medium | the finale's picture | the stage-0 look gate with the ice, the pine and the scale; if it fails, the one download goes to a new body (owner question 3) and the Rock-scorpion takes its spider fallback |
| **A download does not happen again** | Medium (it happened twice in Act VI) | nothing | the act is built on fallbacks first; G0 lets the downloads be declared "not coming" with no schedule change |
| **Bosses with no locks fall too fast for a strong build** | Medium | a 40 s finale | life is tuned by `balance-act.mjs` to the band's floor; a skipped phase still plays its entry; the fight's interest is its moments, not its length. A fast kill by a strong hero is acceptable; a 7-minute one is not |
| **Bosses still too attritional** | Low-medium | the Act VI complaint again | G3 fails any run over the ceiling and any fight over 10 blows landed; there is no chip source to tune down, by design |
| **The slide as a weapon trivialises packs** | Medium | zones too easy | 45 s to re-arm; a chute must be sunlit; packs are placed so only about a third stand in a lane; measured (15-35% of kills) |
| **Sun and Shade is not noticed** | Medium | a mechanic nobody uses | it is taught by the first Icebound on the main trail with a cloud passing, and winch 2 requires it once. If it still does not read at G2, cut 3 makes it a whole-zone event |
| **The dry slot does not read as snow** | Medium | the receding snow | `L.shade` as a second mask term (counted); or fixed snow patches painted by the generator that the `green` reading simply omits |
| **Tree shadows cost more than the Field** | Low-medium | perf7 at the Meadow | blob shadows at q ≤ 1 |
| **Moving gen6's helpers to genlib changes an Act VI layout** | Low | a saved seed's zone | `check-act6` and a seed-parity run in the same commit; if anything moves, gen7 copies the helpers and gen6 stays as it is |
| **The format bump strands a hero** | Low | a player's save | §8.4; `save16` both ways; the cloud's conflict branch already refuses 'newer' |
| **A non-lethal boss breaks the `kill` route** | Low | loot or the quest not firing | the `kill` event fires as shipped; only the corpse's look differs. `kallisto` and `kelados` assert the drop, the flag and the quest step |
| **The new lore (the gates, the name Kelados) contradicts something** | Low | a rewrite of ten lines | marked "to check" in §2.1; the canon brief's owner reads it at stage 0 |

### 10.2 What this proposal deliberately does not do
- No new rendering system, render target, post-process, depth texture or sky in play.
- No new people set, and no people set loaded in either zone.
- No dependency on any download.
- No dark, no Shroud, no Cold, no thin ice, no ring to manage. The player has done that for three acts.
- No minimum-time lock, phase floor or lingering damage ground in either boss.
- No fourteenth Mastery track, no raise of `MAX_LEVEL` (data.js:371), no new currency.
- No change to how the Shadow Gates play.
- No height for actors (the Stair is a kit prop and an exit; the floor stays at y = 0, engine fact 0.1).
- No villain who speaks, and no one who dies.
- No deep lore of its own: it leaves room for the story-first proposal's graft (the mason's marks and the keepers' lines are the sockets).

### 10.3 Honest cost
- **47-59 focused days** as designed; **40-51** with the cut order.
- That is the band Act V measured (47-58) and Act VI's design claimed (47-59). Act VI's critic pass found 5-6 days its first draft had missed; this table already counts the classes of work that pass found (co-op rows, catch-ups, the cold-session stand-in check, the class skill effects in a new light kind, proofreading).
- **Where it could run over:** gen7 (two readings × four water levels is more reach-checking than gen6 had), the daylight pass if the fallback haze is also rejected, and the bosses' tuning now that time locks are not available as a crutch.
- **Where it should run under:** assets (nearly none), people (none), shaders (two defines).
- **Not counted:** the owner's phone runs and reading time; the Play Store packaging itself.

### 10.4 Found on the way (for the lead, whoever's proposal wins)
1. **`ACT_FILES` has no `act6` row** (creatures.js:34-40) while `READY.silt.creatures` is 'act6' (world.js:100) and `crew()` turns the missing group into "load nothing" (world.js:112). By my reading, a **cold start into an Act VI zone loads no creature group**, so the Icemaw, the Hull-louse and the Ketos (whose stand-in chain is `['icemaw', 'warg']`, actors.js:63) would fall through to boot bodies unless Act V's group was loaded earlier in the session. `cast6` is reported as passing "the Ketling as the Icemaw" in a cold session, so I may be missing a loader. **Not verified beyond these three places; worth ten minutes before the pattern is copied.**
2. **`PACK_ORDER` lists 'silt'** (env.js:13) and `zonePacks` asks for it (world.js:101), but there is no `src/assets/silt/` and no `tools/pack-silt.mjs`. The published Act VI draws its seabed from the rime fallbacks of ground6 (build.js:1162-1170).
3. **The two gated Act VI downloads** were never built. The Scorpion serves both acts (item 11). Building the Pistosaur in the same stage-0 day would finish Act VI's own picture.

### 10.5 Critic pass (this proposal read against itself)
Written after the draft, as Act VI's design did. Each point is a weakness a judge could fairly raise, and what I would do about it.

1. **"It is a nature walk. Where is the stake?"** The stake is Whitecliff under a lake, stated in the hook and seen from lookout 3. But no one is in danger on screen until the end. *Fix inside the budget:* the hook's slide buries a lookout whose keeper the player must dig out first (the first hold event, moved onto the main path), and Brokka's line is followed by a view of Deepstone's flooded stair if the hero travels there (one prop, one bark).
2. **"The finale's body is a reused golem."** True, and it is the proposal's weakest picture. The honest ranking of options: (a) the golem dressed in ice and a pine, free; (b) a new downloaded body, about 2 days and a gate that Act VI's history says may not close; (c) a boss with no body at all, the dam itself, which I rejected because fights against terrain feel inert. I keep (a) and let stage 0's gate overrule me.
3. **"Sun and Shade is the thinnest of the three."** It is. It is also the one that makes the daylight a rule and not only a colour, and the cheapest to cut down (cut 3). If the judges want a stronger third mechanic from the systems-first proposal, this is the socket: it replaces 5.3 and keeps `lightKind() === 'sun'` for the look.
4. **"Bosses that cannot be locked will be deleted by a geared Mage in forty seconds."** Possibly. The report's own numbers say the reference build killed Act V's × 170 bosses in 35-172 s with no locks. At × 230 and × 300, with the bear dazed only when baited and Kelados rooted behind a 9 m sweep for a third of his life, I expect the bands to hold on Warden and to be short on a twinked hero, which I think is right: the capped player has earned a fast kill, and the Seven Fires send him to a harder difficulty for a longer one.
5. **"The Seven Fires asks players to replay two zones six times."** It asks them to hold six 75-second events on each difficulty they would play anyway, and it never gates the story. The numbers are small on purpose. If it reads as a chore in playtest, the ranks collapse to one (cut 2) and nothing else changes.
6. **"No Cold, no dark, no ring: is there enough to do?"** The systems-first proposal should answer this better than I can. My answer is that Act VI's zones were *too* light at the cap (0.05-0.33 lives a run) despite three meters, because meters do not threaten a hero who heals; blows priced in shares of her life do. §8.2 sets the targets and G2 measures them before a boss is built.
7. **"Days: the same as Act VI. What is production-first about that?"** The risk profile. Act VI's plan had two downloads on its critical path (neither arrived), two new shader defines plus a vault mesh, a four-form boss answering 21 skills, and a new meter in every fight. This plan's critical path has no download, two defines, two bosses on tables the size of WEAVER and HART, and no meter. The same days should buy fewer surprises.
8. **What I could not check.** Whether the pale fog reads on a phone (stage 0). Whether the dry slot's mask reads as snow (stage A). Whether the town has a tree near the staff (d.halda.blossom). Whether the Pass's camp has free walkable cells for the goat track on every saved seed (a `ropeSpot`-style search with a fallback to the waypoint stones). Whether Poly Haven has a meadow scan that tiles at the play camera (stage 0; the green-tinted `leaves` is the fallback). The creature-group question of §10.4.

---

## 11. Questions for the owner

Five real decisions. Each has my recommendation, and the act proceeds on it if he says nothing, as the brief instructs.

1. **The look: full daylight, or a bright sun over a dark haze?**
   Full daylight is the bigger change from two blue acts, and nothing like it has shipped. The dark haze is Act III's recipe: safer, still clearly "day", less new.
   **Recommendation: full daylight**, decided by eye at stage 0 from four screenshots of shipped zones under the new light, on his own phone if he will look. If any of the four reads badly, the dark haze, with no change to the plan.

2. **Two bosses that are not killed.** Kallisto lies down with her cub; Kelados goes back to sleep with Isarn's word.
   It fits an act with no villain and it is the opposite of everything canon §4 warns against. It also means the act has no death to mourn.
   **Recommendation: yes.** (If he wants one death, the story-first proposal will surely offer one; it grafts onto either boss without touching the fights.)

3. **The act's one download: the Scorpion, or a new body for the finale?**
   The Scorpion is already checked and analysed, becomes a regular enemy here, and gives Act VI's Falselight its real body for free. A new giant would make the finale's picture new, but must pass a provenance gate first, and Act VI's two downloads were never built.
   **Recommendation: the Scorpion**, and Kelados on the shipped golem with his ice and his pine. If the stage-0 look gate says the golem reads as the Stonewarden again, the slot moves to a new body and the scorpion stays a spider.

4. **Save format 2 at this release.**
   **Recommendation: yes**, in stage E's last commit, for the reason in §8.4. He will see nothing; an old tab will refuse a new hero and leave it unharmed.

5. **The Seven Fires as the reason to play at the cap:** seven small permanent bonuses, each rising with the difficulty on which he holds its lookout, each fire over Whitecliff changing colour as it does.
   The alternative is a fourteenth Mastery track, which is cheaper by a day and is the same answer as last time.
   **Recommendation: the Seven Fires**, at +0.5% a rank, with the per-difficulty ranks the first thing cut if days run short.

---

## Appendix: reuse map (every shipped piece this proposal stands on)

| shipped piece | where | used for |
|---|---|---|
| `ZONES`, `READY`, `zonePacks`, dispatch, `actNZone` | world.js:44-64, 100-101, 155-158, 225-226 | the two zones |
| the generator pattern, readings by mode, retry loop | gen6.js:277-299, 765-773 | gen7 |
| `ropeSpot` (an exit as an interact on existing cells) | gen6.js:1190 | the goat track on the Pass |
| `reach`, `nearReach`, `terrain`, `groundY`, `BED_DRY`, `wetAt` | genlib.js:6-65 | gen7 |
| `tidal`, `refugeNear`, `bfs` | gen5.js:39, 775, 810 | water checks |
| `L.low` chasm cells | gen2.js:13-14 | gorges and crevasses |
| ground5 / ground6 fallback chains, G_* defines | build.js:1144-1175, 1517 | ground7 |
| the dry slot and `setAutumn` | build.js:1488-1491, 1922 | the receding snow |
| the ring on snow (screen blend) | build.js:3120-3157 | decals in daylight |
| `buildSea` and SEA_BLACK | sea.js:211-250 | SEA_MELT |
| `setAtmosphere`, `mixAtmos` | gfx.js:171-186; atmos.js:63 | the daylight rows, shade easing |
| TELE_DARK and `teleMat` | fx.js:304-322 | the 'day' telegraph |
| the tide clock, the own-level channel, lanes, `evict`, `slushAt`, `floodWave`, `tideDial` | tide.js:88-183, 292, 340, 396, 474, 482 | the Race, the lake |
| `BREATH`, `startFlues`, `inFlue`, `tickFlues`, `drip`, `vaultAt`, shards | forge.js:27-60, 152, 180-230 | the Slide, rockfalls, cover |
| `lightKind`, `lightAt`, `addLightPool`, the dark-cored disc | light.js:41, 58, 325, 462 | Sun and Shade |
| `PACK_DORMANT`, `def.wake`, the statue path | data.js:306; engine brief §0 fact 7 | the Icebound, the dens, Kelados in the dam |
| `pounce`, `brute`, `bat`, `burrow`, `rootling`, `charger`, `dashStep` | ai.js:434, 452, 498, 524, 612, 640, 1906 | the seven entries |
| `boss()`, WEAVER, LORD, HART, the Tower's beached daze, the Lady rooted | ai.js:2556, 2112, 2123, 2235, 3836, 2466 | both bosses |
| `STAND_IN`, `STAND_SCALE`, `CAST`, `ACT_FILES` | actors.js:55-69; creatures.js:18-40 | bodies and fallbacks |
| `HAZ5`, `HAZ6`, `actHaz`, `BOONS`, `REMEMBERED`, `LEGENDARIES`, `LEG_FROM`, `DIFFS` | data.js:4-11, 33-59, 317-353, 418-447 | HAZ7, blessings, legendaries, the ladder |
| `questText`, `beaconScene`, `offerBoons`, `actComplete` | story.js:35, 511, 550, 571 | the story's plumbing |
| `newHero`, the migration, `heroFits`, `SAVE_FMT` | state.js:29; boot.js:207-214; save.js:231; data.js:63 | saves |
| `unloadOld`, `WAKE` | unload.js:28, 56; wake.js:13 | memory, resume |
| perf6 and its estimator | scenario.mjs:4019; tools/perf6-terms.mjs | perf7 |
| `echoAt`, `ECHO_PROMPT` | world.js:657-659 | the echoes |
| the Lamplight track | progression.js:24 | the thaw channel's hook |
