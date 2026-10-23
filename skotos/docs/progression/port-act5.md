# The progression on the Act V line

Branch `claude/skotos-act5-prog`, from `claude/sleepy-tesla-4030vd` at ca88dd3 (Acts I-V, co-op for four). The
progression (Mastery, 24 variants, 9 later skills, the 4-button loadout; version 13 on the Acts I-IV line) is
`git diff c70d65d ff37476 -- skotos/` from `claude/skotos-progression`, applied with `git apply -3`. Its own docs
(README.md, review/fixes.md, questions.md, release.md) came over with it; this file is what the port added on top.
Progress notes as it went: `port-act5-progress.md`.

## The conflicts and how they were resolved

Eleven files conflicted; every one keeps both sides.

| file | Act V / co-op side | progression side | resolution |
|---|---|---|---|
| `tools/vite.nohmr.mjs` | the no-HMR server over `vite.config.js` | a plain one with a relative root | Act V's (it keeps the base config's settings) |
| `game/actors.js` | imports `HAZ5`, `COOP`, `NET` | imports `SKILLS` (`p.cds` as long as the class's list) | both imports |
| `game/light.js` | `lightAt` goes through `fireAt` (shared with cold.js) | the `a.dim` test written into `lightAt`'s old loop | the `dim` test moved into `fireAt` (in a boss's darkness only, as before) |
| `ui/screens.js` | the title's sub-line `sub5()` | the ✦ Mastery level on a hero's slot | Act V's line, the ✦ added |
| `game/boot.js` | `updateAct`, `disposeZone`; `?quest=`, `?flags=`, `?seed=` | `migrateHero` import, `?mlvl=` | both |
| `game/combat.js` | imports `HAZ5`, `LEG_FROM`, `COOP` | imports `mxpToNext` | both |
| `game/projectiles.js` | the harpoon mesh and kinds, `fire`/`area` through the co-op mirror (`mir`), whale oil (`floats`) | the new kinds, `look`, `onTick`, `light`, `dim`, `dispose`, the `custom` area | all of it in `area0`; the kind's light only when there is no `o.light`, whale oil's brighter flame and slick kept |
| `game/skills.js` | `crackAt`/`refreezeAt` imports, `coldMul()` in `attackSpeed` | `slotSkill`/`VARIANT_FN` imports, `export` on the helpers | both; `attackSpeed` exported with `coldMul()` |
| `ui/hud.js` | `HAZ5`, `vulnOf`; Warmed in the buff icons; the level-up banner's `onanimationend` | `mxpToNext`, `MAX_LEVEL`, `slotSkill`; the Challenge, Bulwark, Alpha icons; `masteryUp` | all imports; one buff map with every icon; both banners clear `on` and `mast` at the end of their animation |
| `ui/panels.js` | `EXTRA` panels (co-op's lobby) in `render()` | `render()` keeps `.pn-b`'s scroll | both |
| `ui/style.css` | the co-op block | the `.pg-*` block | both, co-op first |

The clean hunks were checked against the README's port notes (stats.js: `masteryStats` after Act V's Remembered boons
and the Crown's gifts; ai.js: the taunt line in `victim()`; player.js: `vault`/`charge`; items.js: the skill affix).

**Six difficulties.** The progression adds no table indexed by difficulty and never clamps `h.diff` (checked over the
whole diff, tools included): the respec cost, Mastery's XP and the points are the same on all six. «Σκότος»'s XP x6.5
just brings Mastery levels faster there.

## Act V

The variants replace their base skill's function, so the Act V hooks the base skills carry were written into them
(skillsx.js); `skills5` (below) measures each one on the Farthest Light's thin ice.

- **The ice.** Every landing cracks round it (+1 stage, as wide as the fall: Seismic 4.4 m, Twin 2.6 m, each of its two);
  each fissure of Shatterfan cracks along it; the Ring of Earth cracks each ring as a ring (`crackRing`, new in ice.js,
  ±0.5 m about it), never the ground she stands on; Rain of Fire and Hail crack under the rain as the Rain does; the
  Trident's three bolts each crack 1.1 m (a Fireball 1.5 m), Pale Cinder 1.5 m; Shatter and Blizzard heal the ice and
  hold an Icemaw below as the Nova does (`refreezeAt` + `frostNova`; the wave only, never Blizzard's storm that goes
  with her, which would be a walking bridge); the Shower's stones crack 2 m each (+1), the Frozen Comet as a Meteor (+2,
  3.5 m). The later skills do not touch the ice: none of them is a Mage's frost or a heavy fall, and a later skill that
  bridged holes would make the Nova pointless.
- **The Cold.** A fire under her warms her by 8 a second, more than the sea and a gust add together, and Ember Dance
  keeps one under her as long as she spins: she would never be cold. Its patches are `nowarm` (light.js `fireAt(..., warm)`):
  they burn foes, melt the ice like any fire, and never warm her. Fires she lays at range (Rain of Fire, Pale Cinder)
  warm as the Meteor's do. `skills5`: Cold 50 to 42.4 after 2.5 s of either spin, the same.
- **The beams and lamp light; the Skotos's darkness.** Nothing the progression adds is lamp light (it never holds the
  ice or keeps the Sunken asleep). Its fires are `dim` (never light in a boss's darkness); the Ray of Dawn, the Rift and
  the Bulwark carry a light for the look only (`addLight`), which `lightAt` never reads. The Ray of Dawn's act is named
  `beam` like nothing in Act V reads (the sea-lights' beams are `LT.beams`).
- **The tide, the plunges.** The Charge, the Vault and the Twin Leap move her along `map.castT`, which stops at solid
  cells: open water, holes and broken ice are solid, so none of them carries her into the sea or over a Breathing-hole.
  The Vault's arc (y up to 1.2) counts as airborne for the ice (ice.js `airborne`, `y > 0.2`), as a leap does.
- **The bosses.** Pulls never move a boss, an anchored thing (the Skotos and its Hands), a dormant statue, anything under
  the water or in the air (`foes()` leaves those out). Bosses already take no stun, fear or knock and freezes at x0.3, so
  Seismic's 1.8 s stun or the Comet's freeze lock nothing. The floors and lock phases (hpFloor, lockPhase) are in
  `damage()` and cannot be skipped by any burst. The Tower's middle phase is won by cracking the ice it rushes over: every
  variant still cracks (above).
- **Checkpoints, deaths.** A respawn travels into the zone again, which clears every area. A co-op hero downed does not
  travel: the effects that go with her (Rallying Cry, Blizzard, Bulwark, Hawks, the Ray's glow: `effect({ follow })`)
  now end when she goes down, with no burst (the Bulwark's) and no shield left.

## Co-op

A guest's Mastery, variants, later skills and loadout are its own hero's: G.hero on a guest is a view of its own record
(net/coop.js `viewHero`), and none of `skills`, `vars`, `variant`, `mast`, `mlvl`, `loadout` is a world field. Its skills
run on its own page against the host's monsters (puppets), as the base skills did.

### What the host does for a guest (coop.js `guestEvent`)
- **Blows** (`h`, as before): the guest's Mastery is in the amount (its `heroHit`, crit and elite bonus on its page); the
  host adds none of its own (`o.net`). The cap knew nothing of Mastery or of crit damage, and refused a strong hero's
  blows even without it (see below); it now reads the guest's claimed crit damage (`cd`) and Mastery level (`lk.ml`).
- **Pulls** (`pu`, new): the Maelstrom, Seismic Leap, Challenge and Void Rift pull puppets, which the host owns. The guest
  sums each monster's pull and sends it five times a second (at most 12 monsters a send); the host refuses one on a boss,
  an anchored, dormant, clinging or prop monster, caps each at 8 (the Rift's 0.2 s) and 80 a second (a guest sends at most 60).
- **Taunts** (`ta`, new): a Challenge or a Bulwark holds the host's monster to that guest's stand-in (`a.tauntBy`;
  ai.js `targetOf` honours it), at most 12 s, 40 a second.
- **The ice** (`ic`, new): the host's is the only ice that cracks, so a guest's crack, line, ring or refreeze is done
  there (ice.js `toHost`: only what the guest's own hero does, `MIRROR.hero`); within 28 m of the stand-in, radius 4
  (a refreeze 6), a line 14 m by 2.5, stages 1-2, 14 a second. A guest's Nova also holds the Icemaws on the host. *This
  was missing for the base skills too*: before, a guest Warden's leap or a guest Mage's Nova did nothing to the ice.
- Pets, shields, auras, the Alpha's +15% and the Challenge's reflection stay on the guest's page, as the base Wolf did;
  the reflection only strikes a real monster (a puppet), never the stand-in object a blow from far off comes with.

### What every page draws of the others
- The mirror missed what a guest's skills do after the cast frame: timers (`later`), and its shots' and areas' own work
  (a Fireball's blast, a Meteor's fall, a trap springing). Now a timer set while the hero acts is tagged hers (boot.js,
  and the timers those set), and each hero shot and area is hers while it updates (projectiles.js); replayed ones
  (`team: 'vis'`) are never mirrored again. *The base skills gain this too.*
- **Looks by name.** A shot or area drawn by a function (`look`) sends the function's name (skillsx.js `LOOKS`).
- **Effects by name.** A `custom` effect (the Bulwark's dome, the Hawks, the trap's jaw, the Rift, the beam, the heal
  and storm auras, the comet's frost) sends its `vis` name; the other pages build its look (skillsx.js `VIS`: particles
  and meshes only, its blows and bursts are the mirror's) going about with that hero's actor there (`VIS_FOLLOW`). Its
  end is sent (`visEnd`); unheard, it lasts its own time at most (the Ray's glow no longer asks for 99 s).

### The blow cap (an anti-cheat change)
Measured (a node harness over `computeStats`: level 50, the best of 400 level-52 boss legendaries per slot by damage):
a hero's claimed `dm` (top weapon damage x damage multiplier) is 4 200-5 200 with no Mastery, over the level ceiling of
3 696; its crit damage is +310-355%; a crit Meteor or Earthsplitter with a War Cry and a shrine is 40-150x `dm`, against
a cap of 7-12x. With Might and Ferocity at 120 ranks, `dm` 6 200-7 400 and crit damage +420-460%. So in co-op an endgame
guest's best blows were refused as `big`, and Mastery would have made it worse. The cap is still 14x `dm` within a level
ceiling; the ceiling now grows as far as Mastery could take a hero of that level (every point it has in Might), and the
cap by the guest's crit damage over a plain crit's x1.5, within its level's and Mastery's own ceiling (50 + 6 x level +
every point in Ferocity). The rate (30 caps a second) follows. The level ceiling itself (3 696 at 50, under such gear)
is the co-op session's; it is left for the lead.

### Byte budget
`node tools/coop.mjs prog` (below): four heroes, each casting its heaviest loadout (host: Bulwark, Ember Dance, Seismic
Leap, Dawnbreaker; Ranger: Hawks, Rain of Fire, Scatter Blast, Vault; Mage: Rift, Ray of Dawn, Meteor Shower, Blizzard;
Warden: Challenge, Bulwark, Ring of Earth, Maelstrom), resources kept full, for 20 s at a pack of ten:

RESULTS_BUDGET

## Saves

`migrateHero` (on every hero taken up) works for both lines: a version-13 hero keeps its Mastery, variants, loadout
(later skills on buttons) and Mastery XP, and gets Act V's `act5 = -1` from boot.js like any Act IV save; an Act V hero of
this line gets today's four, nothing learnt, and every point the old cap left unspendable. Two holes found writing
`save13` and fixed: a skill on two buttons (the second takes the first of the class's skills not on a button) and a
chosen variant never learnt (the skill as it is).

## Tests

RESULTS_TESTS

## Balance

RESULTS_BALANCE
