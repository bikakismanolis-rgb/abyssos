# Act VI, stage D: story, text, music (report)

Branch `claude/sleepy-tesla-4030vd`. Stage D of `docs/act6-contract.md` (Stages and gates, Story, Audio).

## What is in

**Story (quests 32-39), every beat of the design's Story section:**

- **The call and the Light's Skerry** (part 1): the hook after Act V's panel (or on the next town entry), Tamarisk at the
  staff with the frost lantern and the sea smoke, Selna's look down, the coal at the tower's door, Glaukos, Alkyone and
  Tern at the rope hole, the forgetting barks in Whitecliff (Halda, Elianthe, the child, Leif's father).
- **The Drained Sea** (q33b-q36): the arrival cine (its two lines, the Skotos), Glaukos's teach (q34, the Carried Fire's
  and the flicker's hints), the First's three hearths (1.5 s tough channel, a pool of 6 m, a place to wake) and her three
  memories in black ice in count order whatever the hearths' order, the Gates' word (Glaukos walks in, q35), the names
  from above (d.glaukos.n1 once), the four lost lights (the Sand Light sets `nineLit`), the Sailor (named, or asked and
  named by Glaukos), Asger (his brazier, the pane melting, his rest), Keyx's lantern and its memory in black water, the
  Ketos woken by the third lantern (its cine, Glaukos's calls by phase), its end (the neck, the Skotos, the lantern in the
  mud, Glaukos m2 m3; `ketosDown` with `keyxLamp` saved first; «Το Πηγάδι άνοιξε», q36).
- **The Bottom** (q36-q38b): the arrival, Glaukos at the Well's Foot (b1 b2 b3 b5), the barrow's and the wood's black
  lamps (a `HAZ6.lampT` tough channel from the Cradle, a Black Flare every 4 s of channelling: a dark circle of 4 m,
  1.2 s, then 0.8x, Cold +15 and 1 m of ring; out: the Cradle full in a white burst, the shadow-wall thinned and its band
  opened), the Skotos's answers in count order, Keyx's hail and his lantern given (`blackLamp2` with `keyxFreed`, his five
  lines, his walk into the black water), Glaukos's far word after the third (q37), Leif (his fire, `leifLit` and its pool
  kept, his lines, his axe), the ember in the ice (narration only, owner decision 2), the garland glade, the Shade's waking
  (the Lost's lamps, the call unanswered, its rising, Glaukos s0, the Barrow Lord's line), its forms' lines (the Weaver's,
  s1 s2 s3, the shadow hint), its end (die1, die2, «Κρατάς ένα όνομα: …», the rim's lamps flaring, q38), the relight and
  the naming (`herFire` with `nameBack` saved first; «Η Πρώτη» until the name is said, then «Φέρουσα»; the Skotos asks it,
  cannot hold it and sleeps; rest; Glaukos down the Stair), the name card, the Gate ring warming, Glaukos up the rope.
- **Home** (q38b-q39): the Gate up to Isarn's staff (`homeGate`; she comes out 2 m from it), Halda, the child, «Κοίτα
  βόρεια», the six peaks catching one by one with a bell each, the last line, `actComplete(6)`, the act panel and the sixth
  blessing (`offerBoons` goes to 6), the title's `game.sub6`.
- **After the act:** the Landing (Alkyone hangs Keyx's lantern, the bird, her bark after), Leif at his father's door
  (his father says his name with the axe: `leifName`, the seventh of the Lost, `lostAll`), the forgetting undone in
  Whitecliff (Halda's two lines, Elianthe's two, the child's bark), Brokka's and Elati's lines, Tamarisk a season in the
  Lanternglade, Glaukos by the Rope camp's brazier, Selna's rite with `rollNames6(true)` (Φέρουσα first, the Lost, up to
  three «Κάποιος.», Tern's good night), the Gates' depth line (panel and HUD), the forgotten in the Gates (tier 10 on, 12%
  a run, one asleep by a dead lamp in a side room; the lamp frees it, `gateFound` +1).
- **The deep's echoes:** the Ketos at the neck arch in the dry Mere (the Mere filled to 1.6 m for it, its lanterns lit),
  the Shade at the warm Gate ring (its stones lit; every form the echo's); «Ο βυθός θυμάται τη μάχη...» and «Η ηχώ σβήνει»;
  their things taken away after; a Shade echo left mid-fight fades and is offered again; nothing of the story touched.
- **Names:** `npcName` gives Leif «…» until `leifName`, Asger «Προσκυνητής» until his brazier burns, the First «Φέρουσα»
  once her name is said.
- **Catch-ups:** every row of the contract's table (`enter6`), asserted by `catch6` after a reload into the row's zone.

**Text:** the act's lines in `src/i18n/text.js` (Greek first), plus what the code needed that the design left to choose:
the interactables' prompts, the Lost's falling names (name.galini, name.twins «Γλαύκη. Κυμώ.», name.kranea,
name.psamathe, name.asger, name.leif), act6.done, echo.ketos, echo.shade, npc.gateFaded, d.first.1.m, d.alk.l6.1-2,
d.tam6.home.r, d.elati.v5.r, d.child.6b. A scan of the code finds no key without its line.

**Music and sound** (`src/audio/audio.js`): the themes `drained` (C aeolian drone, drips, the vault's groans, the
hearth motif when a hearth catches, a bell for each falling name), `ketos` (6/8 rowing figure, the lure's held tone,
slams in phase 2, pizzicato, a bell and a heartbeat when it is blind), `bottom` (a sub drone, the Gates' call slowed and
low, the drowned places' heads; after her fire C major with the hearth motif on a flute), `shade` (the boss figure a
fourth lower, a lead per form, form 4 a heartbeat and the hearth motif in the bass), and `pherousa` for the act's end
(the hearth, lantern and sea-light motifs, a bell for each peak, the held chord on the last line); the hearth motif
`MOTIF6`; the moods `deep`, `names`, `blind`, `form`, `hearth`; sixteen sounds and the names' bell (iceGroan, icicleFall,
icicleShatter, lampDrink, lampFlare, blackLampOut, fireDim, fireOut, fireRekindle, trueLamp, falseTone, lureSnap,
ketosCall, ketosSlam, shipBell, shadeShift, nameBell), each hung on its moment. Every theme and sound renders offline
without error at the levels of Act V's.

## G4

| check | result |
|---|---|
| `hook6` (the q30 save; a shipped-format save) | pass |
| `drained` | pass (11 beats) |
| `keyx6` | pass (6 beats) |
| `ending6` | pass (7 beats) |
| `lost6` | pass (6 beats) |
| `echo6` | pass (4 beats) |
| `gate6` | pass (4 beats) |
| `catch6` | pass (18 rows) |
| `cp6` | stage B's `wake6` under the contract's name |
| regress-D | pass, below |
| proofreading by two readers | **not done**: the lines were checked against the design and the code; the owner's reading of the key lines below stands in for now |
| the owner reads the key Greek lines | **owed** (the naming, Keyx, the peaks, the last line) |

**regress-D** (all pass unless said): the nine above; Act VI's ketos, shade, carry, blackwater (failed once in the batch
under load, passes alone), drips, names6, lure, leg6, diff6b, foes6, prog6, cast6, darktele, peaks6, way6, save15;
title, panels, combat, progress, progpanel, coast, tide, ice, cp5, tower (its bot stalled once in the batch, as in stage
C; passes alone, 84 s), skotos, holes, freeze, echo5, ending5, hook5, catch5, ashfield, forge, ivar, karthax, echo4,
save13, save14, weep, heart, echo, shallowtele, skills5; `coop.mjs act6` (all passed), `coop.mjs bosses` with ACTS=6
(23, all passed); check-act6 (no hard failures, no oddities).

**Tests made sturdier:** the systems' and fights' scenarios that start below the ice now start past the story's arrivals
(the runner adds `drainedSeen`, `teach6`, `names6`, `bottomSeen`, `glaukosB6`), since those scenes hold the world under a
dialog; the story scenarios hold a tough channel to its end with the zone's foes put down (`A5.hold`), as a blow worth a
tenth of the hero's life breaks it by design. **Keyx's hail** is a line in the air, not a dialog: the hero may be fighting
his village's guard as she comes.

## Different from the contract or the design (to be judged)

- **The Skotos at the naming** is a dark burst and ring at the pool's rim and its lines, not the shipped model rising at
  x3.2 (a boss's body spawned outside its fight risked its AI).
- **Keyx's black lamp** is the build's lamp on its pole beside him, not in his raised hand.
- **The Landing's lantern** is a trembling light on the post, the bird a run of blue motes.
- **The Bottom's quotations** use the title's two melodies, low and slow, not the crypt's, forest's and town's own heads.
- **The Shade's end** has no held low C; the Ketos's death changes the music to the zone's (the lure's tone stops there).
- **No audio ambients** for the two zones: the zones' ambient is the visual one (fx.js); the themes carry the drips and
  the groans.
- **The echoes' fights** are proven to rise, to be struck down and to clean up; whether the Ketos echo plays well in the
  dry Mere filled for it (and the Shade echo in the lit Hearth) is for the balance-act campaign's bot.
- **The Gate find** is rolled once a Gate run (on `G.gate`), since the Gate zone object can outlive a run.

## Left after stage D

- The balance-act campaign (Act VI's damage ratio over Act V, Acts IV-V at Lamplight rank 40, the Lost's seven lamps,
  the echoes): before stage E, as agreed.
- The owner's reading of the key lines; the proofreading pass.
- The owner's phone test of the Frozen Coast.
