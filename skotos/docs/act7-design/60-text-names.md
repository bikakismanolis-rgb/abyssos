# Act VII design, part 6: the text keys of the Names and the Call

Every string the Names' tab and the Call show, in one place, for `src/game/names7.js` and the panel. The wording is
part 3's (`30-mechanics-progression.md`, "The Names", "The Call", "New text keys"), copied as written. Three rows are
drafted here because no part gives them; they are listed with a † under the tables. The two proofreaders edit here.

The seven names themselves are shipped keys and are not repeated: `npc.arna`, `npc.first.named` (Pherousa),
`npc.einar`, `npc.keyx`, `npc.asger`, `npc.ivar`. Isarn has no shipped key for his bare name, so one row gives it.

To reach the game these rows must be read by `tools/text7-import.mjs` (one more entry in its `parts` list, with the
heading below). Until then part 3's own table carries the 19 panel and Call rows that it tables; the 18 rule and deed
rows and the three drafted rows are only here.

## Names text keys

**The tab and the panel**

| key | Greek | English |
|---|---|---|
| `prog.tab.names` | Ονόματα | Names |
| `name7.h` | Τρία ονόματα τη φορά | Three names at a time |
| `name7.sub` | Κάθε όνομα που λες είναι ένας τρόπος να πολεμάς. | Each name you say is a way of fighting. |
| `name7.say` | Πες το | Say it |
| `name7.unsay` | Σώπασέ το | Leave it unsaid |
| `name7.deepen` | Βάθυνέ το ({0} πόντοι) | Deepen it ({0} points) |
| `name7.slot` | Άνοιξε θέση ({0} πόντοι) | Open a slot ({0} points) |
| `name7.kept` | Φυλαγμένο | Kept |
| `name7.deep` | Βαθύ | Deep |
| `name7.town` | Τα ονόματα αλλάζουν μόνο στο χωριό | Names are changed only in the village |
| `name7.locked` | Δεν ξέρεις ακόμα αυτό το όνομα. | You do not know this name yet. |
| `name7.noPoints` | Δεν φτάνουν οι πόντοι σου. | You do not have the points. |
| `name7.isarn.n` | Ίσαρν | Isarn |

**Toasts**

| key | Greek | English |
|---|---|---|
| `name7.given` | Τρία ονόματα τα ξέρεις από πάντα: Άρνας, Ίσαρν, Φέρουσα. | Three names you have always known: Arna, Isarn, Pherousa. |
| `name7.learnt` | Έμαθες ένα όνομα: {0} | You have learnt a name: {0} |
| `name7.free` | Η Χάλντα τρόχισε ό,τι ήξερες: ένα ξέχασμα χωρίς χρυσάφι. | Halda has put a new edge on what you knew: one unlearning, no gold. |

**The Kept rules** (`name7.<id>.d`)

| key | Greek | English |
|---|---|---|
| `name7.arna.d` | Το πρώτο σου χτύπημα σε εχθρό με γεμάτη ζωή: +40%. | Your first hit on a foe at full life: +40%. |
| `name7.isarn.d` | Η φιάλη σου ξαναγεμίζει σε 12 δευτ., όχι 18. | Your flask refills in 12 s, not 18. |
| `name7.pherousa.d` | Όσο κρατάς 70 ή πάνω, χτυπάς +18%. | While you hold 70 or more, you hit +18%. |
| `name7.einar.d` | Από μακριά, πάνω από 9 μ., χτυπάς +20%. | From afar, over 9 m, you hit +20%. |
| `name7.keyx.d` | Μετά από κάθε αποφυγή, το επόμενο χτύπημα μέσα σε 2 δευτ.: +60%. | After each dodge, your next hit within 2 s: +60%. |
| `name7.asger.d` | Κάθε δεξιότητα που δεν είναι η προηγούμενη: +10%. Ως τρεις. | Each skill that is not the one before it: +10%. Up to three. |
| `name7.ivar.d` | Κάθε δευτερόλεπτο που δεν κουνιέσαι: +6% ζημιά, −5% πόνος. Ως τέσσερις φορές. | Each second you do not move: +6% damage, −5% hurt. Up to four times. |
| `name7.founder.d` | Όταν μένει ένας μόνο εχθρός ξύπνιος γύρω σου, ως 12 μ., τον χτυπάς +25%. | When only one foe is left awake around you, within 12 m, you hit it +25%. |

**The Deep rules** (`name7.<id>.d2`)

| key | Greek | English |
|---|---|---|
| `name7.arna.d2` | Αν πέσει μέσα σε 4 δευτ., η πιο αργή σου δεξιότητα γυρίζει 15% πιο γρήγορα. | If it falls within 4 s, your slowest skill comes back 15% sooner. |
| `name7.isarn.d2` | Για 4 δευτ. αφού πιεις, πονάς 30% λιγότερο. | For 4 s after you drink, you are hurt 30% less. |
| `name7.pherousa.d2` | Κι όσο το κρατάς, οι δεξιότητές σου κοστίζουν 15% λιγότερο. | And while you hold it, your skills cost 15% less. |
| `name7.einar.d2` | Ένα κρίσιμο από μακριά αφήνει τον εχθρό Φανερωμένο για 2 δευτ. | A critical hit from afar leaves the foe Revealed for 2 s. |
| `name7.keyx.d2` | Αποφυγή που περνά μέσα από χτύπημα γυρίζει αμέσως. | A dodge that passes through a blow comes back at once. |
| `name7.asger.d2` | Στις τρεις, η απλή σου επίθεση δίνει διπλό πόρο. | At three, your basic attack gives twice the resource. |
| `name7.ivar.d2` | Στις τέσσερις, τίποτα δεν σε σπρώχνει και κανένα χτύπημα δεν κόβει ό,τι κάνεις. | At four, nothing moves you and no blow breaks what you are doing. |
| `name7.founder.d2` | Κι ο τελευταίος σε πονάει 15% λιγότερο. | And the last one hurts you 15% less. |

**The deeds, as the dark tiles say them** (`name7.<id>.how`; the three given at quest 40 have none)

| key | Greek | English |
|---|---|---|
| `name7.einar.how` | Άναψε τις τέσσερις Ονοματόπετρες της Ακτής. | Light the four Name-stones of the Coast. |
| `name7.keyx.how` | Κρέμασε το φανάρι του στη Σκάλα της Ακτής. | Hang his lantern at the Landing. |
| `name7.asger.how` | Βρες τον ανάμεσα στους Χαμένους, κάτω από τον πάγο. | Find him among the Lost, beneath the ice. |
| `name7.ivar.how` | Νίκησε την ηχώ του στο Τελευταίο Λυχνάρι. | Beat his echo at the Last Lamp. |
| `name7.founder.how` | Ξύπνα τη δεύτερη σκεπασμένη φωτιά του Ξερόκαμπου και δες τι θυμάται. | Wake the second banked fire of the Tindergrass and see what it remembers. |
| `name7.founder.n` | Γρηγορία | Grigoria |

**The Call**

| key | Greek | English |
|---|---|---|
| `call.prompt` | Φώναξε τα ονόματα | Call the names |
| `call.on` | Τα ονόματά σου ακούγονται ως τις κορυφές | Your names carry to the peaks |
| `hud.call` | Φώναγμα | The Call |
| `call.none` | Δεν λες ακόμα κανένα όνομα. Η φωνή σου φτάνει κι έτσι. | You say no name yet. Your voice carries all the same. |
| `call.spent` | Η φωτιά άκουσε ήδη τα ονόματά σου. | This fire has already heard your names. |
| `call.again` | Η φωτιά φουντώνει ξανά: φώναξε! | The fire flares again: call! |
| `call.soon` | Η φωνή σου δεν γύρισε ακόμα: {0} δευτ. | Your voice has not come back yet: {0} s. |

## Notes for the proofreaders

Count: 41 rows. 38 are part 3's wording (`prog.tab.names`, 13 panel and toast rows, 7 Kept, 7 Deep, 4 deeds, 6 of the
Call); 3 are drafted here (†):

- † `name7.noPoints`: shown when a slot or a depth is asked for without the points. No part gives a line.
- † `name7.isarn.n`: Isarn's bare name for his tile. The spelling is the contract's; only the key is new.
- † `call.soon`: shown at a hearth inside the 90 seconds after her last Call (rule C4). No part gives a line.

Three words part 3 itself asks to have checked against the shipped text before stage D:

- "Φανερωμένο" in `name7.einar.d2`: the shipped status reads "Φανερός" (`hud.revealed`).
- "πόρο" in `name7.asger.d2`: the shipped lines name Fury, Energy and Mana by `res.*`.
- "Σκάλα της Ακτής" in `name7.keyx.how`: to be held against the shipped name of the Landing.
