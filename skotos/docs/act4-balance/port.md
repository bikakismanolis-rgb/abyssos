# Porting the Act IV difficulty fix onto Act V (branch claude/sleepy-tesla-4030vd)

Base of the branch: ef5d02b (Act V in progress) on top of 7eded86. Fix: `balance/patch.diff`. Applied with
`cd /home/user/abyssos && git apply -3 .../balance/patch.diff`. Nothing committed, pushed, stashed, reset or checked out.

`git apply -3` stages what it applies. After resolving, the five conflicted files were `git add`ed so the index has no
unmerged entries; the whole port is therefore staged (and identical in the working tree), not committed. Untracked
files: none (the build writes to an ignored dir).

## 1. What applied cleanly

audio.js, boot.js, forge.js, skills.js, story.js, text.js, gen4.js, and the new `tools/balance-act.mjs`. In the files with
conflicts every other hunk applied by itself, including the ones that landed in Act V's renamed code:
- world.js: the anvilWake / Isarn hunks went into Act V's `updateAct` (renamed from `updateAct4`); lampCheckpoint,
  setLamp, lampUse, act4Enter (lastLamp, anvilWake) and the 0.7 s brazier touch all landed.
- ai.js: all 28 hunks present (blockTxt tick, affix skip, the four drawn-width lines, dashStep `hitR`, the `w:` on the
  four Act IV dashes, Ivar, every Karthax change, `dropGlobe` in breakCage).
- combat.js: the 4%-of-life chip rule for `p.blows`, the "Blocked" line after `a.blocks = ...`.
- light.js: the new `lampAt(x, z, pad = 0)`, the 3.5 m comment, the boss-darkness visual floor in `tickLight`.
- data.js: the two `guard k 0.25` lines (ashSpear, ashDwarf).

## 2. The conflicts (9 hunks in 5 files) and how each was resolved

| file | hunk | resolution |
|---|---|---|
| ai.js | imports | Act V's block kept (tide, ice, sea, atmos, ZONES, gen5, cold) and `import { dropGlobe } from './pickups.js';` added after it. |
| ai.js | `shroudLook` | Act V's `shroudOn()` kept (the Shroud is ember-zones only); the body test passed the Act V way: `lightAt(a.x, a.z, { pad: a.radius * 0.5 })`. The fix's positional `a.radius * 0.5` would have been read as the options object and silently ignored. |
| ai.js | `dashStep` header comment | Act V's comment kept (the Rime Bear, slush, `ice`) and the fix's "w (the drawn line's width: no hit wider than it)" added. The `hitR` code applied by itself. |
| combat.js | header of `actHit` | Act V's header and its rename `act4Hit` -> `actHit` kept; it now says the Ash-Fallen take 25% from the front (a Reefback its own guard's 20%), the hero's blocked blow says "Blocked", and a blow in light "reaching the body" reveals the Shrouded. |
| combat.js | Shroud branch | Act V's `shroudOn()` kept; `lightAt(a.x, a.z, { pad: a.radius * 0.5 })`. |
| data.js | Karthax line vs Act V's new monster block | Act V's whole block kept (sunken ... skotosCoil); `karthax` dmg 2.7 -> 2.1 inside it. Reefback's `guard { arc 1.2, k 0.2 }` left alone (Act V's). |
| light.js | `lightAt` | Act V's `lightAt(x, z, o = {})` kept (beams, `!p.beam` pools, `o.ring === false`, `fireAt`); `const pad = o.pad \|\| 0` added and the pools `(p.r + pad) ** 2`, the hero's ring `(hr + pad) ** 2`, the lamps `lampAt(x, z, pad)`, the fire `fireAt(x, z, 1.5 + pad)` grow by it. Beams stay a point test. The `{ ring: false }` callers (the Skuas, ai.js ~1569 / 1594) and the Dark's test on the hero (ai.js ~3336) keep pad 0. The fix's own fire loop is not used: Act V's `fireAt` already holds the same test. |
| world.js | `touch` | Act V's `touch(dur, it, y, done, o = {})`, `TOUCH`, `o.at` / `o.take` / `o.tough` kept, still exported; the guard is now `if (!pl \|\| pl.dead \|\| (pl.act && pl.act.name !== 'basic')) return;` and the fix's "takes the place of a basic attack held down, not of a skill" comment added. |
| world.js | per-frame header | Act V's header ("...Karthax's arrival; Act V's boats on the tide and the Farthest Light's gusts") kept, `forgeCheckpoint` added under it. |

`git diff HEAD --check` and `git diff --cached --check` are clean; `grep -rn '^<<<<<<<\|^>>>>>>>' skotos/src skotos/tools`
finds nothing; `npx vite build --logLevel error` exits 0 with no output; `node --check tools/balance-act.mjs` passes.

## 3. Six difficulties («Σκότος», index 5)

The fix's only per-difficulty arrays are in forge.js. Each has a sixth entry, harder than Ash, and `di()` clamps at
`DIFFS.length - 1` (5) instead of 4:
- `BREATH.hitBy` [.025, .05, .09, .13, .20, **.24**]
- `BREATH.burnBy` [.005, .01, .015, .02, .03, **.035**]
- `VENT.hitBy` [.025, .05, .065, .08, .10, **.12**]
- `VENT.burnBy` [.005, .01, .012, .015, .02, **.024**]

The header comment lists 2.5, 5, 9, 13, 20, 24%. A search for other difficulty clamps (`Math.min(diff, 4)` and kin) in
`src/` and `tools/` found none; `tools/balance-act.mjs` passes `--diff` straight through.

## 4. Act V code changed to fit the fix

1. **lightAt's pad** (light.js, above): it is an option, `{ pad }`, because Act V's `lightAt` already takes an options
   object. The two callers the fix adds (shroudLook, actHit) use it. All other callers are unchanged and keep pad 0.
2. **The Walking Tower's Sidelong Rush** (ai.js `sideRush`, ~3664-3673): it went through `dashStep` with no `w`. Its body
   is 0.7 x 4.0 = 2.8 m, so the hit circle was 2.8 + 0.45 + 0.6 = 3.85 m, while the drawn line is `max(4, 2*2.8 + 0.2)` = 5.8
   m (2.9 m half-width). Now `wide = Math.max(4, a.radius * 2 + 0.2)` is used for both the telegraph and `w: wide`, so the
   hit is min(3.85, 2.9 + 0.225) = 3.125 m: no wider than the line. **This is a gameplay change to an Act V boss** (it hits
   a little less often). I chose it over widening the drawn line to 7.7 m.
3. **The Rime Bear** (charger AI): unchanged. The fix already draws the charger's line at `max(2.4, 2 * (radius + 1.05))`.
   For the Rime Bear (1.1 x 1.3 = 1.43 m) that is 4.96 m, which covers its hit of 1.43 + 1.05 on each side exactly. Before
   the fix its line was drawn 2.4 m wide, so this is visual only, as the README says.
4. **The Tower's light channel** (ai.js `lightChannel`, ~3855): this is Act V's own touch, and it refused when `pl.act`
   was set. It now uses the same guard as `touch()` (a held basic attack is replaced, a skill is not), with a comment.
5. **The bot** (tools/balance-act.mjs:221): `shrouded()` uses `(light.shroudOn || light.lightOn)()`. Act V has
   `shroudOn`; the published 7eded86 code has only `lightOn`, so the bot still runs against `base/`. In Act IV zones the two
   give the same answer, so the bot plays the same there. It still tests the point, not the body, as the measured bot did.

Nothing else in Act V calls what the fix renamed:
- **BREATH.hit / hitEasy**: no reader outside forge.js. world.js reads only `BREATH.inhale` / `BREATH.fire`, and audio.js
  already has 2.8.
- **act4Hit**: renamed by Act V; the patch's hunks went into `actHit`.
- **dashStep's D.w**: only the dashes listed above. The other Act I-III dashes get the fix's visual-only widening.

## 5. Things the port does to Act V without code changes (for the Act V owner to know)

- **"Blocked" and the area rule also apply to the Reefback**, since both are generic `def.guard` code. The Warden's third
  swing and the Ranger's volley (now `area`) pass its shield too. Its guard k stays 0.2.
- **Chip hits of less than 4% of her life** no longer break the non-tough Act V touches: cairns, the hearth and similar.
  The `o.tough` channels count `TOUCH.hurt` and are unchanged.
- **The visual floor in a boss's darkness** (light.js `tickLight`: `dim = S.over != null || !!S.dark`) also covers the
  Skotos's Night (setHeroLight 2.5) and its Drink (0). There the hero's light now keeps at least 6 m / 45% reach and 40%
  intensity. This is visual only: what is lit is still `lightAt`'s. The contract (act5-contract.md:363) says
  "setHeroLight unchanged (the Night: 2.5)", and the function is unchanged, but **the Night will look less black**. Revert
  for Act V by making `dim` ember-only (`dim = ember() && (...)`) if that is not wanted.
- **Elite affixes skip `a.airborne`**: Act V's Skuas set `airborne` while in the sky (where combat.js already makes them
  untouchable), so an elite Skua in the air fires no affix either.
- **boot.js respawn**: the two-waypoint wake needs `S.camp2`, and gen5 sets none, so Act V zones are unaffected.

## 6. Unsure / left for the Act V owner

1. **Act V's bosses are pinned to the old Karthax.** data.js still says the Walking Tower (hp 68, dmg 2.3) and the Skotos
   (hp 100, dmg 2.6) are "held to Karthax's against a hero of their level". That was Karthax at dmg 2.7 with the
   unwalkable Hammerfall. Karthax is now 2.1, and the fix took about half of Act IV's boss damage out. I did not change
   their numbers or that comment. The README's starting point is x0.78 (Tower ~1.8, Skotos ~2.0), then measuring with
   `tools/balance-act.mjs` once Act V's zones and bosses are added to it.
2. The Sidelong Rush narrowing (4.2) is my call. The other option was to widen its telegraph to 2 x (2.8 + 1.05) = 7.7 m.
3. **Act V's checkpoints** (world.js ~1408, story.js ~1171 / ~1218, ai.js ~3910) live only on the zone. A Continue
   rebuilds the zone, so they are lost there: the same class of bug the fix closed for the Act IV waylamps with
   `flags.lastLamp`. I left them alone; they are not part of the fix.
4. The contract's lightAt line (act5-contract.md:362) does not mention `o.pad` yet. I did not edit the contract.
5. The "Blocked" text sits at a fixed 2.6 m. That suits the Ash-Fallen, but may sit inside the larger Reefback model
   (scale 1.5). Not checked visually.

## 7. Runtime check (private no-HMR server, port 5287, one browser at a time, stopped after)

Scenarios run with `BASE=http://localhost:5287/ node tools/scenario.mjs <name>`; outputs are in `balance/port-scen/`.
No page errors, console errors or warnings were logged in any of them:
- **forge**: periods 9.25 / 8.5 / 7.75 s at Heat 1 / 2 / 3, quest 21.
- **karthax**: cages lord:2 / king:1 / lady:0; he enters the last fire at 30% (shown rounded); Isarn 2.8 m short;
  4 ghosts; quest 22; echo.
- **ivar**: light 3.5 in his dark; quest 20; echo.
- **ashfield**: lamps, memories, altars and the lamp checkpoint, as before.
- **diff6** (Act V, the sixth difficulty): pass. Locked until Act V is finished on Ash, then chosen (diff 5); coast@5
  seeded; HAZ5[5] read.
- **skotos** (Act V boss): ran 3 times on the port (once it hit my 900 s timeout). The two finished runs both report
  `pass: false` (ttk 158 / 179 s, inside the 90-420 s band; 0 deaths). They fail on `searedNight`: the beam's Sear never
  comes in phase 1 (it is relit after phase 2 starts). One run also fails on the Remembers count, which the 1.5 s polling
  saw as 1 -> 3. **The same scenario fails on the pre-port head too.** I served `git archive HEAD` (ef5d02b) from
  `balance/head-ef5d02b` on port 5288 (`balance/vite.head.mjs`): pass false, searedNight missing, ttk 591 s, 4 deaths,
  relit at 557 s (`port-scen/head/skotos.out`). So this is Act V's unfinished fight, not the port. None of the port's
  changes touch the Sear or relit order. The touch-guard change can only make the tough relight touch start sooner, not
  later.
- **tower** (Act V boss, the Sidelong Rush change): killed by my 1200 s wall-clock limit before the bot fight ended. Its
  first screenshot was taken and no page error was logged up to then, but **it has no result**. I did not re-run it, as
  its fight runs longer than my window. This needs a run to see the narrowed rush in play: `node tools/scenario.mjs tower`
  with a long timeout, or MAXT lowered.

Both private servers (5287, 5288) are stopped and no browser is left running. Nothing was written into the repository
by these runs (`git status` shows only the 13 ported files).

## 8. Verification pass (second agent; files in `verifyport/`)

Verdict: **the port is faithful; nothing in `/home/user/abyssos/skotos` needed fixing.** Private no-HMR server on 5321
(`tools/vite.nohmr.mjs`), one headless browser at a time; for comparisons the pre-port head on 5322
(`balance/vite.head.mjs`) and the published fix on 5323 (`verifyport/vite.pubctl.mjs`, its own dep cache). All three are
stopped and no browser is left. `git status` still shows only the 13 staged files; nothing committed, nothing unstaged.

1. **Code: PASS.** `verifyport/port.diff` (= `git diff HEAD -- skotos`) against `balance/patch.diff`
   (`verifyport/cmp.py`): of 60 hunks, 52 have every removed and added line in the port; the other 8 are exactly the
   section 2 resolutions (two `lightAt(..., { pad })` callers, the dashStep / actHit header comments, the forge.js
   six-entry arrays and `di()`, the options-object `lightAt`, the bot's `shroudOn || lightOn`). The port's only extra
   hunks are section 4's sideRush `w: wide` and lightChannel guard. `verifyport/ctx.py` diffs the published fix against the
   port around every line the patch touched (+-2): only those same differences. The whole Act IV AI section (ai.js
   "Act IV: the Field of Ash..." through Karthax, 964 lines) is **byte-identical** to the published fix; forge.js differs
   only in the sixth difficulty. `patch.diff` is the published worktree's diff (checked). `npx vite build` (into the
   scratchpad) passes; `node --check tools/balance-act.mjs` passes.
2. **Scenarios: PASS** (`verifyport/scen/`, all exit 0, no page error, console error or warning): ashfield, ivar,
   forge (9.25 / 8.5 / 7.75 s, quest 21), karthax (all statues broken, 30%, last fire, Isarn 3.1 m, 4 ghosts, quest 22,
   echo), ending4, cast4 (11 kinds), echo4 (both echoes killed), panels, boons, combat, cagetime (gifts taken 33.6 / 33.4
   / 33.6 s; refused 15.4 / 15.4 s; published 33.8 / 33.6 and 15.6 / 15.4). Field-by-field against `scen-v3`
   (`verifyport/scmp.py`), the differences are random (statue order, pack counts, gold) or Act V's own, confirmed by
   running ivar, ashfield, karthax, boons and ending4 on the pre-port head (`verifyport/scen-head/`): the Act IV Voice
   lines now fire in the ashfield/ivar runs, and ending4 says Act V and ends on quest 24. Both happen on the head too.
3. **Bot numbers: PASS, within noise** (`verifyport/port*.jsonl`, `pubctl.jsonl`, `mage-*.jsonl`). The asked-for small
   batch (published seeds, Warden difficulty) gave Karthax lives Warden 0.71 / Ranger 0.46 / Mage 0.82 (n=3) and the
   Forge at heat 3 (Mage) 0.40 (n=2): above the published 0.34 / 0.41 / 0.56 and 0.24, so I ran all 16 published seeds a
   class, 48 Mage runs, the 4 heat-3 seeds, and the same jobs on the published fix today:

   | lives a run | published | published fix, today | port | port vs published + today (Welch t) |
   |---|---|---|---|---|
   | Karthax Warden W (n 16 / 16 / 16) | 0.34 | 0.36 | 0.44 | +0.7 to +1.1 |
   | Karthax Ranger W (16 / 16 / 16) | 0.41 | 0.46 | 0.41 | -0.5 to +0.1 |
   | Karthax Mage W (16 / 48 / 48) | 0.56 | 0.52 | 0.62 | +1.6 |
   | Forge heat 3, Mage W (4 / 4 / 4) | 0.24 | 0.22 | 0.31 | +0.9 to +1.0 |

   Kill times (48 / 28 / 29 s), biggest hit (6.5 / 10.6 / 12.4%), lowest life and deaths (0) match. Each Karthax move's
   damage per hit matches (e.g. the Hammerfall 0.054 / 0.111 / 0.123 published, 0.064 / 0.107 / 0.129 port), as do
   his level, life and damage (40, 150290, 316.3) and the heroes' life, armour and dps. The Breath hits for 5% on W
   (hitBy[1]). The published fix itself swings 0.47-0.60 between batches of 16 for the Mage. The port's Mage is +0.09
   (+17%) above the published pool, mostly more Hammerfall and fire-patch hits, with t = 1.6: not significant. A bigger
   batch would settle it if wanted.
4. **Act V smoke: PASS.** `?auto=coast&lvl=30` and `?auto=farlight&lvl=30` load and play, no page errors or console
   errors (`verifyport/smoke/`, screenshots). `soak5 tide` with CYCLES=3: the first run **failed** on `offLane: 2` (a
   wash-out carried her 1.09 m off its lane for two ticks; the limit is 1 m). The same seed again and three new seeds
   pass. At 20 cycles the pre-port head fails the same way (`soakx-head-c20-6`: offLane 1, 1.13 m; head 5 of 6 pass;
   port 4 of 6 pass, one offLane and one "washed 2 < 3" lane-test count). So this is an existing Act V soak flake (a body
   or knock moving her while the wave carries her), not the port. Left for the Act V owner.

Section 7's open item (the `tower` scenario, which has no result) was not re-run here.
