# Act VIII: «Η Φωτιά που δεν Κοιμάται» / "The Fire That Does Not Sleep"

Started 21 November on the owner's word («Πάμε στο 2. Ό,τι προτείνεις εσύ κάνε», then «Θα τα τσεκάρουμε όλα μετά στο
κανονικό παιχνίδι»: he will judge it in the playable game, not on paper). This is the story proposal that Act VII's
rulings kept whole (`act7-briefs/decisions.md`, `judge-1.md` §3-5, `judge-2.md`), brought up to date with what Act VII
shipped. Read `act7-briefs/proposal-story.md` for the full text it came from; where this file differs, this file wins.

## What Act VII already took (so Act VIII does not repeat it)

The Names, Rested, Isarn's lantern woken, the hero's sleep and the last line «Ώστε ξύπνησες.» are live in v23. So:
no new cap layer in this act (the Order's founder joins the Names as the eighth), the hero is *awake and rested* at the
hook, and the ending is the Order's, not the hero's.

## Spine

Early autumn, the fields reaped. The hero has slept and woken. A smoke stands on the southern plain and comes nearer
each day: the Order of the Flame, the Mage's old school, has remembered the road north. It carries its flame, never let
go out in a thousand years, to stand on the sea ice over the sleeping dark for ever. That would melt the dark's blanket
and wake it. Halda fits the Cradle with a lid, because every smith knows a fire is banked at night and woken in the
morning. The hero walks the old South Road against the wind, wakes the three fires a runaway student banked in secret,
and reads in their embers how the vigil began with a girl too afraid to bank the last coals: «Είναι η τελευταία». The
hero unyokes the bull that burns the Procession's road, enters a house built without windows, lets daylight into it
hall by hall, and meets Master Ragna, who has not slept for forty years, until she does the one thing she has refused
and falls asleep. The flame is banked, and in the morning it is woken, and it burns as before. The Order goes home with
the North to keep the seven peaks in turns. Nobody dies in this act.

## Slots

| slot | choice |
|---|---|
| Zone 1 | `tinder`, «Ο Ξερόκαμπος» / "The Tindergrass", level 46, daylight (Act VII's kit: `light: 'sun'`, code-made ground). Walled stubble fields along the South Road, a brook, three banked hearths, the Threshing Floor (Aithon's arena) |
| Zone 2 | `vigil`, «Ο Οίκος της Αγρύπνιας» / "The Vigil House", level 49. Dark at first; each feeder hall opens to daylight when its fire is banked (shutters fall), so the zone turns from dark to day as it is played |
| Boss 1 | Aithon, the Bull of the Procession, on a shipped body chosen at the look gate. He is unyoked, not killed (`spare`, Act VII's boss law). His arena gets safer as it burns: the black is safe |
| Boss 2 | Ragna the Wakeful. The hall's eight shutters fall as her life does; a Waker walks the floor; the last phase keeps one thing to do (the last brazier). She falls asleep (`spare`) |
| Mechanic 1 | **The Burn**: armed lanes on `forge.js`'s lane code (the Slide's code with fire's colours). A gust fires a lane of dry stubble along a field; a burnt lane is spent for the visit and is safe ground; the Cradle can burn a small ring that goes out by itself. No Smoke meter |
| Mechanic 2 | **Bank and Wake**: a hearth's third state. Banking a hearth opens the way; waking one calls the hero's Names for twenty seconds |
| Mechanic 3 | **Sleep and Noise**: the Order's fallen sleep where they fall and a Waker rings them up; sleepers wake to noise, from one table by skill (Act VII's sleepers code) |
| Cap | The eighth Name (the Order's founder), learnt at the second ember memory. Nothing else new |
| Optional | The Seven Good Nights (seven people of the shipped world to say good night to), blessing ×1.25 |
| Later patch | Vows on the Shadow Gates; the Twelve Nights |

Levels 46 and 49 follow Act VII's 40 and 43. Damage anchor: Act V as measured ×1.45-2.1, with lowest life and deaths
as the real gate (Act VI shipped at ×3-7 and was softened; Act VII's bosses never took a hero under 65%: aim between).
A boss fight lands 4-10 blows, each 12-18% of her life on Warden, never over 20%. Telegraphs never change by difficulty.

## The fire: the rules (all required, from judge 1 §5.1)

Greece has buried people after fires in dry grass with a wind behind them. The act keeps its fire and keeps these rules:

1. The fire is bounded and made by people for a purpose: the Procession burns the stubble of the fields along its
   road, field by field, between dry-stone walls, the road and the brook. No front runs loose; none approaches a house,
   a village or a wood on screen.
2. The stake is not the village. The danger is that a fire stood on the ice wakes the dark. The smoke stays on the
   horizon in the hook; nobody is afraid for their home.
3. No burnt or fleeing animals, no trees in flame, no burnt buildings.
4. The hero's fire is the Cradle's, a property of a magic coal, never advice. The word «αντιπύρ» is not used.
5. The Order's fire looks unnatural: white-cored and still, as Act VI drew false light.
6. Store screenshots lead with the gold plain, the daylight and the House. Not launched or advertised June-September.
7. The Order is a **school**: masters, students, lessons, rolls. No censer, no chant, no «Πομπή» as a church word in the
   Greek text (it is «η Πορεία»), no "keeper of the flame". The title avoids «Ακοίμητη».

If the owner dislikes the fire in play: zone 1 keeps its look, fire lives only in Aithon's arena, and the fields' rule
becomes a cut-down wind (heading, lee, shots carry).

## Stages

- **0** this file, the owner's questions, the Burn's spike on a grey-box field, the look gate of the two bosses' bodies.
- **A** the ground: `gen8.js` (both layouts), `ground8`, props `build8.js`, the zones plumbed and walkable (`?auto=tinder`).
- **B** the foes (the Order's students, oxen, Wakers, the Standing) and the three mechanics.
- **C** Aithon and Ragna on the boss law, echoes, co-op rules.
- **D** the story from the hook to the last line, ember memories, audio.
- **E** balance campaign, every scenario, both builds, strict CSP, format bumps in the last commit, publishing on his word.

Each stage ends with a report in `docs/act8-briefs/reports/`.
