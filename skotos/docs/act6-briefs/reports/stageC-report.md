# Act VI stage C: report (11 November 2026)

One session did stage C on `claude/sleepy-tesla-4030vd`: the two bosses, their co-op, the scenarios, the time bands and a
first balance pass. This report gives the state against G3, what differs from the contract, and what is left.

## What is in

- **The Ketos** (ai.js `KETOS`, world.js `mereFight`, combat.js's `share` link; committed at stage C's start): the lure
  and the Sear at a lit wreck lantern, the turn and the Mere's drain, the Neck Slam and the stalk's three cuts, Blind and
  the bells, the Dive, the fail-safes (Glaukos's flask, his bell), the death and the drained Mere.
- **The Shade** (ai.js `SHADE_FORM`, world.js `hearthFight`): one life over four bodies swapped in place (shade1-3,
  shade4w/r/m by its target's class), the Crown and the Snuff, the Light-webs and the brood, the Vault Slam and the
  icicles that stun it, the Roar, form 4's shadow across the fire with its Lunge, its 21 answers and their holds, the
  Hands, the Flare, the Hearth's dark; the reset (form 1, or form 3 at half life after a death past it); the first-kill
  Ring from any of form 4's bodies.
- **Co-op for both** (net/coop.js):
  - a guest's touch on a hearthstone, a wreck lantern, a ship's bell, and Act V's cairns and hole lamps, done by the
    host (`'u'`: the guest's stand-in within 3 m, the thing as the guest saw it, one every 0.5 s);
  - Act VI's lit things in each snapshot (`l6`: the stones lit and webbed, the Hearth's dark and the Flare; the Mere's
    lanterns), drawn on the guest's page (`web6Guest`, `shade6Guest`, the dark eased each frame);
  - a guest's casts are sounds for the blind Ketos (its look calls, at most one every 0.4 s);
  - one Shade at a time on a guest's page: the next form's body replaces the last in the same frame, and the boss bar
    takes its name without a second intro.
- **Scenarios:** `ketos`, `shade` (scripted relay checks, then the boss bot), `leg6`, `diff6b` (tools/scenario.mjs);
  `coop.mjs bosses` with Act VI at two and four players (`ACTS=6 GUESTS=1|3`), the `'u'` case in `coop.mjs cheat`.
  `MLAMP=40` runs any scenario with the Lamplight track at rank 40.

## G3 (run in this session; several browsers at once on a no-HMR dev server)

| item | result |
|---|---|
| Ketos, Warden difficulty, L36 (design 120-200 s, fail outside 70-330) | Warden 149 s, Ranger 132 s, Mage 137 s: pass, all inside the design band |
| Shade, Warden difficulty, L40 (design 240-420 s, fail outside 150-480) | Warden 391-415 s, Ranger 315-339 s, Mage 298-301 s: pass, inside the design band |
| Shade form 4 (design 55-110 s on Warden, fail if one class takes over 1.5x another) | Warden 93-103 s; Ranger and Mage 70 s at a 70 s line, 76.5 s at the 75 s line kept: 1.37x at worst now (1.47x at 70 s) |
| Wanderer at 60% or more of the Warden time | Ketos 142.5 s against 149 (0.96); Shade 360.8 s against 370 (0.97): pass |
| No blow over 12% of max life at L36/L40 | biggest boss blows 4.5-10.9% after the fixes below; every Act VI boss blow is now held to 11% of the hero's life |
| `leg6` | pass: the Lure-bone (0.2 -> 0.4 m a kill, drains it marks halved), the Shade's Ring (1.5 m floor, x0.5 Shroud), the Ring dropped once from each of shade4w, shade4r, shade4m |
| `diff6b` | pass: on Wanderer and on the sixth, the coal (x0.6 / x1.45), the refill (2.0 / 1.2 m/s), the black water's cycle (150 / 100 s) and groan (8 / 6 s), the Shroud (0.45 / 0.3), the names' clock and window (75 s, 6 s / 120 s, 4 s), a Falselight's bait (1.2 / 0.6 s); its tell 0.87 s on both |
| `coop.mjs bosses`, Act VI, two players | pass (the Ketos with a guest's blows through a Seared head, the Shade's three turns seen on the guest, both paid) |
| `coop.mjs bosses`, Act VI, four players | pass (every guest sees one Shade and its bar at each turn; each guest's own boss loot) |
| `coop.mjs cheat`, the `'u'` case | pass: another kind, a stone 18 m off, a dark stone said lit, no numbers: none done; ten at once: one done, nine held; a guest's own touch lights the stone on the host and on its own page |
| Acts IV and V at Lamplight rank 40 | scenario level: the Tower 104 s (105 at rank 0), the Skotos 167 s (170 at rank 0), Ivar and Karthax fought through, Ivar's dark still 3.5 m. One Skotos run at rank 40 stalled at its 65% Night and a rerun passed: a bot flake, not seen at rank 0. **The balance-act campaign is not run** (left, below) |
| The whole act's damage ratio over Act V (x1.2-1.45) | **not measured** (left, below) |
| regress-C | below |

**regress-C** (all pass unless said): coast, tide, ice, cast5, shallowtele, ashfield, forge, progpanel, save13, save14,
title, panels, skills5, combat, ranger (a run under load lost a screenshot; reruns pass), mage, progress, diff6, cp5,
tower, skotos, holes, freeze, ivar, karthax, echo5, echo4; Act VI's carry, blackwater, drips, names6, lure, foes6,
cast6, darktele, prog6, skillsfx below the ice for the three classes; coop act6 (21), join (9), pack (15), world (38),
act5 (15), loot (10), four (16), darkmirror (12), bosses with acts 1-6 (58), cheat; `NET=supa` join (9), four (20),
cheat (57); test-transport (59), test-sync (263); check-act5 (no hard failures; its three old oddities), check-act6
(clean), parity-ashfield (no difference outside the corridor).

## Different from the contract (to be judged by the lead)

- **A least time for each form and phase** (new rule, ai.js `SHADE_MIN` 70 / 45 / 70 / 75 s and `KETOS_MIN` 45 / 45 /
  35 s): a form's life falls no faster than a straight line from its start to its threshold over that time; a blow past
  the line is held there («Κρατιέται» over the Shade, every 2 s at most). Measured, the bot's bow and staff deal about
  twice the Warden's damage (its raw rate on a still target at L40: 5 240, 11 028, 11 257), so without it the Mage killed
  the Ketos in 75 s and the Shade in 123 s while the Warden took 278 s and 316 s. The Warden is slower than the line in
  every phase but the Shade's last, so the line only holds the faster classes. A human player rarely reaches the line.
- **The Shade's life is 400, its blows 2.1** (the design: 240 and 2.3). 240 left every class under the band; 2.3 put the
  borrowed 1.5-1.6x blows (the Barrow Lord's combo and Blink, the troll's thunder) at 14-15% of a Mage's life on her
  rolled gear. **The Ketos's life is 185 (the design's), its blows 2.0** (2.3 put a Mage at 12.5%).
- **No Act VI boss blow takes more than 11% of the hero's life** (combat.js `hurtHero`), so the 12% rule holds for every
  class and every roll of gear; damage over time is not held.
- **The Snuff breaks at 1.5% of the Shade's life struck in its 2 s channel**, or any blow while the Shade stands at its
  line or floor (the design: 6%). At L40 no class deals 6% in 2 s: the Snuff was never broken, and form 1 always ended on
  its 30 s clock.
- **The Shade does not keep out of lamp light** (an earlier pass made it, which broke the form's rule, "fight it inside
  their light", and made the Warden's first form 200 s).
- **The Hearth's centre fire is low enough to shoot over** (the runtime map's `over` cells, map.js, world.js; the layout's
  own low layer is untouched): form 4 always stands across the fire, so a bow's arrows stopped in it and the Ranger's
  form 4 never ended.
- **The Shade's reset** comes when the party has been 6 m past the Hearth's rim for 3 s (or all are down for 1.5 s). At
  2 m and 1.5 s, a blow near the rim reset a Warden's fight to form 1.
- **The Ketos in co-op:** the guest test opens the Ketos with a Seared head (`__act6.searHead`, a dev hook), its body
  being under the black water in phase 1.

## Left after stage C

- **The balance-act campaign** (design, Balance): tools/balance-act.mjs extended to Act VI's two zones and both bosses
  with their rules, run on Act V's tree and bot (Warden n 6, Wanderer n 12) at the profile levels, for the whole act's
  damage ratio over Act V (x1.2-1.45) and the bot's reference-build kill times (not under 50 s for the Ketos or 100 s for
  the Shade); and the same tool on Acts IV and V at Lamplight rank 40 against integrate.md's bands. This session ran the
  scenario level only. About two days of work and many hours of runs.
- **The Lost's seven lamps:** the one Warden run with all seven (`LOST=7`) took 414 s against 362-415 s without them;
  the design wants them to save 10-15%. One run proves nothing either way; the campaign above should measure it.
- **The black lamps' channel** (HAZ6.lampT) waits for the story's lamps (stage D); `diff6b` skips it.
- **Echoes** (`echo6`) are stage D.
- **The owner's own test** of the Frozen Coast on his phone.
