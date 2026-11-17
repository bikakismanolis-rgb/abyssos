# Stage B: the act's seven creatures (report)

Files: `src/game/ai.js` (the Act VII section at the end of the file, plus small hooks in the shipped behaviours, each one
gated on a new def flag), `src/game/actors.js` (`act7Spawn`, the sleepers' look), `src/game/data.js` (the seven rows' wake
fields, `PACK_DORMANT` + `den`, `icebound`, `slabs`), `tools/scenario7.mjs` (`setup7`, `heavy7`, `sleepers7`, `chough7`).

## The common rule

- `heavy7(a, tg, move)`: the one heavy blow, `hitHero(..., { share: HAZ7.heavy, cap: HAZ7.cap, move })` (bosses:
  `bossHeavy`). The share goes through `combat.js hurtHero`, so it is never x `DIFFS.dmg`, an elite's factor or `COOP.dmg`.
- `wind7(a, move, dur, tele, fire)` / `wind7Tick`: the wind-up on its own clock (never `startAttack`'s, so `fast` does not
  shorten it); a slow stalls it (`windMul`, as shipped). A stun, a freeze or a fear breaks it (`interrupted`, `cut7`;
  fear sets `interrupted` for the Act VII kinds only).
- `packReady` / `packMark`: one clock a pack (the Rootlings' shriek pattern), seconds x `HAZ7.cd`.
- `HEAVY7`: each heavy move's measured telegraph (game seconds), for the scenarios and the bot.
- `shade7(x, z)`: `G.zone.shadeAt` when present (light.js / sun7.js), else `L.shade` or `z.cloudAt`.
- Chip stays within the contract: the Rock-roller's every-third slam (shipped x1.6) is lowered to `1.9 / def.dmg` for the
  act's kinds; the other kinds' chip is shipped (Den-bear's big maul 1.5 x 1.25 = 1.9).
- In an Act VII zone a Dazed regular foe (a slide, a Long Pounce into a wall) now ticks its Daze off (`dazedTick`); before,
  only the chargers and bosses did, so a slid goblin stayed open at x1.5 for ever.

## By kind

| kind | heavy move (function) | details |
|---|---|---|
| `hillWolf` | Long Pounce (`longPounce`) | 6-10 m, clear line, 0.9 s crouch behind a 10 x 1.8 m line, leap at 22 m/s, one a pack each 6 s; a leap ending at a blocked cell or in slush: Dazed 1 s. Shipped pounce kept as chip |
| `goblinMarksman` | Aimed Bolt (`aimedBolt`) | every third shot (`aimEvery`), 0.9 s planted behind a 14 x 1.2 m line; the shot stops at the first blocking cell (`map.blocks`) |
| `chough` | the Mob (`mobStart`, `mobTick`, `mobEnd`) | `skua()` with `safe7` (shade in place of light) at both tests; four or more of a flock (seven at most) round a hero 5 s in open sun (`p.sun7`, counted in `act7Tick`); 1.1 s circle of r 3, the flock bunched at 1.9 m; lands only on whoever is in the circle and in sun; one a flock each 14 s; no Cold on the bite (no `coldBite`) |
| `denBear` | Charge (`bearDash7`) | the shipped `charger` rear (0.9 s) and dash, the hit a heavy share; a wall end Dazes 2 s and calls `forge.js loud(x, z, LOUD.bearWall)`; slush Dazes 2 s; cooldown 5-7 s x `HAZ7.cd`; a stun breaks the rear (`chargeBroken`) |
| `snowWorm` | Burst (`snowUnder`, `wormUp`) | tunnels only through cells where `snow7(x, z)` holds (`L.snow` 1-3 against the open weirs, 4 until `act7`, 5 always); burst r 2.4 after 0.9 s, each 6-9 s; a hero off the snow cannot be burst: the worm waits at the edge (`edgeT`) and comes up to spit; a slide forces it up (`dazeFoe`) |
| `rockRoller` | Rolled Boulder (`roller`, `rollBoulder`, `act7Tick`) | 4-14 m, clear line, 1.2 s behind a 14 x 2.6 m line, 12 m/s, strikes the first hero on it, stops at the end or the first solid cell, stays 20 s as a rock (`rock7`: a 2 x 2 footprint closed with `low = false`, never a hero's cell), three of its rocks at most; the landing and the slam are loud (`rolledBoulder`, `rollerSlam`) |
| `rockScorpion` | Sting (`sting7`, `scorpion`) | every third blow (`stingEvery`), 0.9 s over a 2.6 m 60-degree cone, one a pack each 3 s, never from a shaded cell; x0.6 speed on a shaded cell (`coldBlooded`) |

Sleepers:

- **Den-bear** (and its wolves): `PACK_DORMANT.den`; `def.wake = { d: 5, sleep: 'die', tide: true, loud: 12 }`: lies in its
  own colours (`actSpawn`'s `wake.sleep` branch). Wakes at 5 m, on a blow, on bus `'loud'` within 12 m (`loudWakes`), or
  on the brook reaching its cell (the shipped `tideWakes` branch: calm, then `dryWalk` to the nearest dry ground). Its
  pack-mates wake a beat after it (shipped `unmask`).
- **Icebound** (`act7Spawn`: a pack tagged `icebound`, or a pack with `ice`, or `o.icebound`): the shipped statue path with
  `a.icebound`: never woken by her walking near; `sunWakes` (unbroken sun on its cell for `HAZ7.sunWake` s; a hero's
  burning ground on it, or a `molten` champion's patch within 3 m, counts as sun and halves the wait); a blow; bus
  `'iceMelt'` (the Cradle, U5); pack-mates a beat later (shipped). `refreeze7`: frost on one woken less than 3 s ago puts
  it back for 4 s, twice at most (U7: the blow does not say which of the two frosts it was).
- **Rock-scorpions** (`PACK_DORMANT.slabs`, `o.under`): under their slab until 6 m or one is struck (`burstPack`); water at
  their cell brings the pack out calm (`calm7`).

Slush spit: a `sap.js` pool of kind `'slush'` (`addSapPool(x, z, 1.6, 4, null, 'slush')`). `tide.js wadeAt` already reads a
slush pool as wading, so the hero wades at x0.7 and a charge stops in it (`stops`). `tide.js slushAt` was not used (it only
changes tidal cells). The Deepworm's acid is not fired by a `snowOnly` worm (`proj` dropped from its row).

Loud: `bearWall`, `rollerSlam`, `rolledBoulder` through `forge.js loud()`; a `thunder` champion's strike in an Act VII zone
too. A `frozen` champion's orb leaves slush 4 s in an Act VII zone.

## Scenarios (stage B, `BASE=http://localhost:5311/`, fixture `fx7('thawSeen', 'thaw')` + `&nopacks`)

- `heavy7`: **pass**, 21 beats. Every kind's telegraph 0.933 s (1.1 s for the Mob, 1.2 s for the boulder) on difficulty 0,
  1 and 4 (4 spawned with the `fast` affix); every blow 8.37 / 16.75 / 28.86% of her life against 8.37 / 16.73 / 28.89%
  wanted (heavy x (1 - armour reduction)); every stun broke its wind-up with no blow after. (The test turns `G.hero.diff`
  in the page between rounds, sets `G.stats.block = 0` so no blow is halved by chance, and keeps her alive.)
- `sleepers7`: **pass**, 7 beats (bear asleep at 6 m, woken by a blow, by `loud` 10 m off; Icebound asleep 60.1 game-s in
  shade with her 1 m off, awake 2.0 s after sun on Warden; scorpions under at 9 m, out at 5.5 m, out when one is struck).
- `chough7`: **pass**, 5 beats (nothing in shade for 12 s; a stoop in sun; broken off 0.13 s after she stepped into shade;
  the Mob in sun lands after 1.1 s; the Mob called and she in shade inside its circle: nothing lands).
- Regressions re-run after the changes: `slide` pass, `race` pass, `save16` pass, `combat` pass, `hook6` pass.

## Hooks needed in files I do not own

- `world.js` (Act VII packs): the champion's stand-in for a big kind in an Act VII zone is `hillWolf`, and an unknown tag in
  an Act VII zone falls back to `hillWolves`; a `choughs` pack is clamped to seven (`n = Math.min(n, 7)` where the pack's
  count is made).
- `world.js` (the Cradle's interact at an Act VII ice block, U5): after its 1.5 s channel, `emit('iceMelt', it)` (ai.js wakes
  every Icebound within 3 m of `it`).
- `skillsx.js` (the Spirit Wolf's howl): `emit('denWake', x, z)` (wakes a den within 12 m, kicks nothing).

## Not done / not tested

- Implemented, not covered by a scenario: the bear's calm wake by the brook and its walk to dry ground; the scorpions'
  calm wake by water; fire halving the Icebound's wait (U6); frost re-freezing (U7); the worm's spit from the snow's edge.
- The Marksman "always behind the line" and the pack sizes are placement (world.js / gen7.js), not AI.
- Text keys for the Mob's first-time toast (`emit('hint7', 'mob')` is sent; the hint's text is the story's).
