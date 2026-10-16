# Skotos, Act IV difficulty fix: release notes

Base: the published game, commit 7eded86 (worktree `pub/skotos`). The fix is `balance/patch.diff`. It applies with `git apply` at the repository root and touches 12 game files plus one new tool (`skotos/tools/balance-act.mjs`). No save change: two new optional hero flags, `lastLamp` and `anvilWake`. Acts I-III play the same as before; the only change there is that three charge lines are drawn as wide as they already hit.

## In one paragraph

Act IV felt like a cliff because of its last boss and its last zone.
- **Karthax.** For a Ranger or a Mage on Warden difficulty he cost about twice as much life as any boss before him, and his biggest blow took a quarter of her life. His Hammerfall could not be walked out of. His Ember Combo turned to follow her, so she could not step out of it. In the Three Cages phase she had to survive for 20-30 s, and any damage she did to him was thrown away.
- **The Forge's Breath.** It took 20% of max life a hit on the default difficulty, and it was 57-85% of all the damage taken in the Forge.

After the fix:
- Karthax costs 0.34 / 0.41 / 0.56 lives a fight (Warden / Ranger / Mage) on Warden difficulty, against 0.64 / 0.80 / 1.47 before. His biggest blow is 6-12% of her life.
- The Breath costs 0.04-0.13 lives a Forge run, against 0.24-0.50.
- For the Ranger and the Mage, the whole act now costs x1.2-x1.7 what Act III cost on Warden difficulty, against x2.0-x2.4 before. The Warden class was never the problem. Her Act IV bosses are now a little easier than her Act III bosses, and that is left as it is (see "Left as it is").

## What was wrong, in plain words

1. **Karthax, the last boss, was the cliff.** The Ranger and the Mage took 1.5-2x the damage of any earlier boss. The causes:
   - *The Hammerfall.* A 4.5 m circle with a 1.0 s warning. After a normal 0.45 s reaction you cannot walk out of that; only a perfectly timed roll saves you.
   - *The Ember Combo.* Three blows, and he turned to face her before each one. The combo kept going while she was within 6.5 m. A ranged hero could not step aside and end it.
   - *Fire patches.* Nearly every big blow left patches on the floor, so the arena filled with fire.
   - *The Three Cages.* This phase was 20-30 s of pure survival. He could not drop below 30% life, so damage dealt to him was wasted, and the fight did not get shorter on the easy difficulty.
   - *Heavy blows.* His damage (2.7) was set higher than Amaranthe's, on top of the level rise.
2. **The Forge's Breath was a tax, not a rhythm.**
   - It hit for 20% of max life (12% on Wanderer), after a 2.0 s inhale.
   - At full Heat it came every 5.5 s.
   - Nothing showed where the cover was.
   - A death at Karthax sent her back 160 m through the hottest gallery.
3. **Ivar's Dark was too tight.**
   - The hero's light shrank to 2.5 m, so she could not see him.
   - His Lantern Sweep was too wide to side-step.
   - The Sweep also put out the brazier she was standing by to light.
4. **The Field of Ash's shields felt unfair.**
   - A shielded Ash-Fallen took only 15% from the front, even from the Warden's spinning third swing and the Ranger's volley, both of which a player expects to go round a shield.
   - Nothing told the player the blow had been blocked.
5. **Bugs:**
   - Slag drips fell on Karthax's platform, on the statues and on the ghost pools.
   - Elite affixes fired from foes that could not be hit (an Ember Tick on her back, an Ashwing in the air).
   - The waylamp checkpoint was lost on Continue.
   - The Field's second waypoint was never used as a place to wake.
   - Dash hits reached wider than their drawn lines.
   - A held basic attack stopped a lamp or brazier touch, and chip damage broke one.

## What changed, file by file

Line numbers are those of the new files; `balance/changes.md` has every line.

- **src/game/data.js**
  - Karthax dmg 2.7 → 2.1. His blows now weigh against her life what Amaranthe's did.
  - Ash-Fallen spear and dwarf shields: front damage 15% → 25%.
- **src/game/ai.js** (Karthax, Ivar, dashes, affixes)
  - *Hammerfall.*
    - Outside the cages: a 3.5 m circle in 1.4 s, which can be walked out of. Then a 1.1 s opening while he wrenches the hammer free.
    - In the cages: 4.5 m in 1.6 s, as before.
    - Hit 1.5 → 1.15, burn 0.5 → 0.4; 2 fire patches instead of 3.
    - In the cages it comes every 3.8 s (5 s before) with three statue blows to land, and every 3.2 s with six, as before.
  - *Ember Combo.*
    - He aims once, at the first blow, and blows 2-3 strike the same line. Out of the 5.5 m cone, the combo ends.
    - Wind-ups 0.8 / 0.5 / 0.8 s; third blow 1.4 → 1.15; 0.9 s of recovery after the third blow.
  - *The Three Cages.*
    - His floor 30% → 20%, so damage dealt behind the cages counts. He enters the last fire at 20-29.9%.
    - First Hammerfall after 1.2 s; the 6 m fail-safe and the hint after two misses (was three).
    - A health globe at each broken statue.
  - *Molten Rain:* 3 drops (was 5), hit 1.0, shorter patches.
  - *Gaze:* hit 1.6 → 1.15, fewer and shorter patches.
  - *Tongs:* 1.8 → 1.3.
  - *The Dark:* 2.0 → 1.3.
  - *Ash Breath:* 1.2 → 1.0.
  - *The last fire:* the Hammerfall and the Gaze come a little less often.
  - *Ivar.*
    - His Dark leaves a 3.5 m light (was 2.5).
    - The Lantern Sweep's cone is 0.8 rad (was 1.1), so it can be side-stepped.
    - Seen lasts 4 s (was 6).
    - The Sweep spares the brazier within 3 m of her.
  - *Dashes.*
    - The hit is no wider than the drawn line (`D.w`) for the Smoke-eater grab, the Ashwing dive, the Hammerhorn rush and Ivar's Long Road.
    - The Amberback, Stonewarden, Silverhorn and Amaranthe charge lines are drawn as wide as they already hit. This is visual only.
  - *Elite affixes:* none from a clinging Ember Tick or an airborne Ashwing.
- **src/game/forge.js** (the Breath)
  - The inhale is 2.8 s (was 2.0). The Breath comes every 10 s, or 6.5 s while a Hammerhorn pumps, and 0.75 s sooner per Heat stage, never under 6 s. That gives 9.25 / 8.5 / 7.75 s at Heat 1 / 2 / 3.
  - The hit by difficulty is 2.5 / 5 / 9 / 13 / 20% of max life, plus burn 0.5-3%. Ash, the top difficulty, keeps the old 20%. The vents are scaled the same way.
  - Blue marks show the cover of the flue she is in during its inhale, and the inhale sound now ends on the roar.
  - No slag drips at the Anvil or in the Hall of Moulds, and the drip warning is amber, not the boss's red.
- **src/world/gen4.js:** each gallery's cover spots (alcoves, stokers' bays, the lee of the pillars) for the blue marks. There are no new random calls, so saved layouts are unchanged.
- **src/game/light.js**
  - A light that reaches a body lights it: `lightAt(x, z, pad)`, and the Shroud tests use half the body's width.
  - In a boss's darkness the hero's light keeps enough reach to read the floor. This is visual only.
- **src/game/combat.js**
  - "Blocked" shows when a shield stops her blow.
  - The light test on the Shrouded uses the body.
  - Only hits of 4% of her life or more break a touch.
- **src/game/skills.js:** the Warden's third swing and the Ranger's volley count as area blows, so they pass the shield.
- **src/game/world.js**
  - Touching a lit waylamp makes it the place to wake, and the last lamp is kept in the save (`lastLamp`).
  - From the Anvil on, a Karthax retry starts on the Great Stair, about 23 m from the arena (`anvilWake`).
  - Isarn's lantern keeps up with Karthax (2.0 m/s, stops 3 m short).
  - A brazier touch takes 0.7 s.
  - A held basic attack no longer stops a touch.
- **src/game/boot.js:** with no lamp checkpoint, she wakes at the nearer of the Field's two waypoints once the second is known.
- **src/game/story.js, src/i18n/text.js:** a lit lamp stays touchable after its memory, with the prompt "Wake here".
- **src/audio/audio.js:** the Forge music's inhale swell lasts 2.8 s, matching the Breath.
- **tools/balance-act.mjs** (new, not in the game): the bot that measured all this.
  - It fights the packs of a zone, or a boss, like a casual phone player: it notices 60% of telegraphs, reacts after 0.45 s and drinks a potion under 35% life.
  - This round it also steps out of telegraphs in its 8 s pause between packs. Before, it stood still there, and up to half of the Forge's damage landed in those pauses, counted as damage but not as time.

## The numbers, before and after

The bot is `tools/balance-act.mjs`; W = Warden difficulty, Wa = Wanderer. Lives = damage taken as a share of max life (0.5 = half her life). Same jobs and seeds before and after. The data files are listed under "Files".

**Bosses, lives of damage a fight** (sim.json → the published code with the fixed bot → after; n = 6 / 8 / 16 for Karthax, 6 / 10-18 for Ivar)

| | Warden W | Ranger W | Mage W | Warden Wa | Ranger Wa | Mage Wa |
|---|---|---|---|---|---|---|
| Karthax | 0.71 → 0.64 → **0.34** | 1.82 → 0.80 → **0.41** | 2.83 → 1.47 → **0.56** | 0.16 → 0.22 → **0.09** | 1.09 → 0.48 → **0.19** | 0.86 → 0.67 → **0.26** |
| Karthax, biggest hit (mean of runs) | 11% → **6%** | 19% → **10%** | 23% → **12%** | 5% → **2%** | 10% → **5%** | 11% → **6%** |
| Karthax, kill time (s) | 54 → 48 | 33 → 27 | 33 → 28 | 46 → 42 | 27 → 24 | 33 → 27 |
| Ivar | 0.48 → **0.22** | 0.26 → **0.20** | 0.41 → **0.44** | 0.28 → **0.02** | 0.14 → **0.08** | 0.41 → **0.11** |
| Act III, for scale: Silverhorn / Amaranthe | 0.17 / 0.57 | 0.20 / 0.28 | 0.21 / 0.39 | 0.05 / 0.09 | 0.04 / 0.11 | 0.06 / 0.10 |

- The old sim.json overstated Karthax for the ranged classes by about 2x: its bot did not keep to the statues in the cages. The middle column is the published code measured with the fixed bot, the fair "before".
- No deaths in any run before or after. The worst single Karthax hit on the Mage fell from 24.9% to 16.3% of her life.

**Zones: every pack of the zone, with the bot that also dodges between packs** (published → after; n = 4 published, 4-6 after)

| | Warden W | Ranger W | Mage W | Warden Wa | Ranger Wa | Mage Wa |
|---|---|---|---|---|---|---|
| Forge (Heat 1), lives a run | 0.35 → 0.44 | 0.88 → **0.39** | 0.47 → **0.34** | 0.46 → **0.24** | 0.37 → **0.26** | 0.33 → **0.16** |
| Forge (Heat 1), life/min of fighting | 0.35 → 0.46 | 1.95 → **0.78** | 1.24 → **0.71** | 0.40 → **0.22** | 0.99 → **0.60** | 1.14 → **0.43** |
| the Breath, lives a run (share of the Forge's damage) | 0.24 (69%) → 0.10 (22%) | 0.50 (57%) → 0.13 (34%) | 0.40 (85%) → 0.13 (40%) | 0.26 (56%) → 0.04 (15%) | 0.30 (82%) → 0.05 (21%) | 0.24 (72%) → 0.07 (41%) |
| Forge, biggest hit (mean) | 11% → 6% | 20% → 9% | 20% → 8% | 11% → 2% | 12% → 5% | 12% → 3% |
| Forge (Heat 3), lives a run, after | 0.06 | 0.49 | 0.24 | 0.14 | 0.23 | 0.14 |
| Field of Ash, lives a run | 1.17 → 1.28 | 0.62 → 0.53 | 0.53 → 0.71 | 0.53 → 0.83 | 0.27 → 0.32 | 0.07 → 0.07 |
| Act III, for scale: Weeping Woods / Heartwood | 0.70 / 1.07 | 0.48 / 0.30 | 0.45 / 0.18 | 0.34 / 0.18 | 0.05 / 0.22 | 0.18 / 0.09 |

- **The Field of Ash** was not meant to change, and it is within the noise.
  - A batch of 4 runs swings with one long run in which the bot chases archers: the Warden on Wa went 0.01-2.12 lives a run after, and 0.16-1.39 before.
  - Its damage is the Ash Bows' fire arrows, code the fix does not touch.
  - Round 2's 10 runs gave 0.57 for that cell.
- **The Forge, Warden W** is also noise: one elite pack. It costs 0.44 lives in a whole Forge run.

**The whole act (2 zones + 2 bosses, Forge at Heat 1), Act IV over Act III, lives**

| | Warden W | Ranger W | Mage W | Warden Wa | Ranger Wa | Mage Wa |
|---|---|---|---|---|---|---|
| published | x1.05 | x2.04 | x2.35 | x2.29 | x3.05 | x3.48 |
| after | **x0.90** | **x1.22** | **x1.67** | **x1.81** | **x2.05** | **x1.40** |
| the two bosses only: published → after | x1.52 → **x0.75** | x2.21 → **x1.26** | x3.17 → **x1.68** | x3.59 → **x0.80** | x4.24 → **x1.88** | x6.76 → **x2.29** |

- The yardstick, from the diagnosis, is the largest earlier step: Act II over Act I, up to x1.94 on W and x2.58 on Wa across its metrics. A finale may take up to x2 on bosses.
- Every whole-act step is now within it. Before the fix the Ranger and the Mage were over it on both difficulties.
- One boss ratio is still over x2: the Mage on Wa (see "Left as it is").
- The diagnosis's per-fight targets for Karthax, Ivar and the Act IV boss mean are all met: 0.36 lives a fight on W against <= 0.60. So are the Forge's life/min and life-a-pack targets, judged against Act III measured with the same bot (`balance/sim/r3/cmp3.md`).

## Left as it is, on purpose

1. **The Warden class: her Act IV bosses are now a little easier than her Act III bosses** (x0.75 W, x0.80 Wa).
   - Her whole Act IV on W was already easier than her Act III before the fix (x0.74 in sim.json; x1.05 here).
   - Each Karthax blow weighs about 0.4x as much on her as on the Mage (armour, block, life).
   - Lifting her back would need a threat aimed only at heroes in his reach, which is a design call, not a number.
   - Raising his damage for everyone would push the Mage past her targets.
2. **The Mage against Act III's bosses** (x1.68 W, x2.29 Wa). Act III is the game's trough: its bosses cost the Mage 0.1-0.4 lives. Meeting x2.0 on Wanderer would need Karthax under 0.2 lives for her, or a harder Silverhorn. The owner did not ask for either.
3. **The Breath's share for the Mage** (37-47% of her Forge damage, target 35%).
   - The Breath is 2-3 hits of 2.5-5% of her life a run (0.07-0.13 lives). Its share is high only because she takes almost nothing else.
   - The plan's floor is 5% on W and 2.5% on Wa. Lower than that, the Breath means nothing.
4. **Not re-measured:** the weaker player and the walked runs. The three Karthax health globes and the stair checkpoint help those players most.

## How this release was checked

- **Scenarios:** all 29 shipped scenarios were run one at a time on a private no-HMR server. Every one exited 0 with no page error, console error or warning (`balance/scen-v3/*.out`, `summary.txt`):
  - Act I: combat, ranger, mage, weaver, lord, ending, title, panels.
  - Act II: pass, stonewarden, halls, king, ending2, cast2, boons.
  - Act III: weep, hart, heart, amaranthe, echo, ending3, cast3.
  - Act IV: ashfield, ivar, forge, karthax, ending4, cast4, echo4.

  The results:
  - **Act IV.** They match round 2: periods 9.25 / 8.5 / 7.75 s, the cages lord:2 / king:1 / lady:2, the last fire with Isarn 3 m short and 4 ghosts, quest 22 and 23, both echoes killed, and a wake at the lamp checkpoint 0 m away.
  - **The ranger scenario** reports 0 kills. The published code gives the same, so this is the scenario, not the fix (`scen-v3-base/`).
- **Build:** `npm run build:artifact` passes. Every file is under 16 MB; the largest is 3.8 MB.
- **CSP check:** the artifact was served with `tools/csp-server.mjs` under the strict CSP of `docs/HANDOFF.md`. Playwright loaded each page in a desktop context and in a phone context (isMobile, hasTouch). The pages were the title and its class pick, the town, the Field of Ash and the Forge (each zone's hero put by a pack).
  - All 8 pages show 0 CSP violations, 0 console errors and 0 page errors.
  - No texture is without both an image and a GPU upload.
  - No model is a stand-in. 77-92% of the materials of the people and creatures carry a map; the rest are the plain-coloured shields, weapons and eyes.
  - The screenshots show textured models.
  - The script is `balance/csp-check.mjs`; `balance/csp-v3/report.jsonl` and the screenshots are in `balance/csp-v3/`.

## Publishing

`balance/release.json` lists what to upload:
- `changed`: the 12 hashed scripts that are new. Upload these.
- `removed`: the 12 they replace. Set these to null.
- `indexHtml`: the page itself.

Every other file keeps its name and content.

## Porting onto the Act V branch (`/home/user/abyssos`, branch claude/sleepy-tesla-4030vd)

7eded86 is an ancestor of the Act V head (ef5d02b), so the patch goes on with a three-way apply. At the repository root, run `git apply -3 <path>/patch.diff`. Tried on a scratch clone of ef5d02b:
- **Clean:** audio.js, boot.js, forge.js, skills.js, story.js, text.js, gen4.js, and the new tools/balance-act.mjs.
- **Conflicts:** 9 hunks in 5 files. Resolve them by hand:
  - **ai.js (3).**
    - The imports: keep Act V's block and add `import { dropGlobe } from './pickups.js';` (Act V does not import it yet).
    - `shroudLook`: keep Act V's `shroudOn()` and pass the body, `lightAt(a.x, a.z, { pad: a.radius * 0.5 })`. Act V's `lightAt` takes an options object.
    - The `dashStep` comment: keep Act V's and add "w (the drawn line's width: no hit wider than it)". The code hunk (`hitR`) applies by itself.
  - **combat.js (2).** Act V renamed `act4Hit` to `actHit`.
    - Keep its header and say 25% for the Ash-Fallen.
    - Add the "Blocked" line after `a.blocks = (a.blocks || 0) + 1;`.
    - In the Shroud branch keep `shroudOn()` and pass `{ pad: a.radius * 0.5 }`.
  - **data.js (1).** Keep Act V's block of new monsters and set `karthax` dmg 2.7 → 2.1 in it. The two `guard k 0.25` lines apply. The Reefback's own guard (k 0.2) is Act V's, so leave it alone.
  - **light.js (1).** In Act V's `lightAt(x, z, o = {})`, add `const pad = o.pad || 0`. Then grow by `pad`:
    - the pools, `(p.r + pad) ** 2`;
    - the hero's ring, `(hr + pad) ** 2`;
    - the lamps, `lampAt(x, z, pad)` (the new `lampAt` applied);
    - the fire, `fireAt(x, z, 1.5 + pad)`.

    Beams can stay a point test. The callers with `{ ring: false }` keep a pad of 0.
  - **world.js (2).**
    - In Act V's `touch(dur, it, y, done, o = {})`, change the guard to `if (!pl || pl.dead || (pl.act && pl.act.name !== 'basic')) return;`. Then check that Act V's `o.tough` channels are fine with a touch replacing a held basic attack.
    - Keep Act V's per-frame header comment and add the `forgeCheckpoint` function under it.
- **Six difficulties.** The per-difficulty arrays in forge.js have 5 entries and `di()` clamps at 4, so on Skotos difficulty they would silently use Ash's numbers. Give each a sixth entry and clamp at `DIFFS.length - 1`:
  - `BREATH.hitBy`, for example `[.025, .05, .09, .13, .20, .24]`;
  - `BREATH.burnBy`, for example `[..., .03, .035]`;
  - `VENT.hitBy`, for example `[..., .10, .12]`;
  - `VENT.burnBy`, for example `[..., .02, .024]`.

  These are the only per-difficulty arrays the patch adds.
- **Act V dashes.** `D.w` only narrows a hit when a dash passes it. Act V's new rushes (`rushEnd5`, ai.js ~3662, and the Rime Bear through the charger AI) do not pass it. Pass their drawn width, or check that the drawn line covers `radius + 1.05` on each side. The charger's line is now drawn at `max(2.4, 2 * (radius + 1.05))`, which also widens the Rime Bear's line, visually only.
- **Act V's numbers need checking against the new curve.**
  - data.js says the Walking Tower (hp 68, dmg 2.3) and the Skotos (hp 100, dmg 2.6) are "held to Karthax's against a hero of their level: no step up in hardness from the Ashen Forge". That was the old Karthax: dmg 2.7, unwalkable Hammerfalls and a re-aiming combo.
  - With the new Karthax, Act IV's bosses cost 0.34 / 0.41 / 0.56 lives on W, so Act V as it stands is likely a step up again.
  - A starting point is to scale their dmg by 2.1 / 2.7 = x0.78 (Tower ~1.8, Skotos ~2.0). Also check their moves for the patterns fixed here: circles that cannot be walked out of after a 0.45 s reaction, combos that re-aim, survival phases where damage is wasted, and fire on every blow.
  - Then measure. Add Act V's zones and bosses to `tools/balance-act.mjs` (`ZONES`, `BOSS_ZONE`, `BOSSES`, `ACT`, `BEFORE`, and the story flags in `setupHero`). Judge them against this README's Act IV numbers with the diagnosis's rule: each act-over-act step no bigger than Act II over Act I, bosses up to x2 for a finale, for every class on Wanderer and Warden at least.

## Files (balance/)

- **patch.diff:** the fix, plus the new tool.
- **changes.md:** every changed line, with the reason.
- **release.json:** the upload list.
- **Reports:**
  - diagnosis.md and final-plan.md: the why and the plan.
  - verify-1.md, verify-2.md (and their tables): the earlier rounds.
  - sim/r3/cmp3.md: round 3's zones and targets.
  - sim/r3/tables.md: the tables above.
- **Run data:**
  - sim/r2/pool2.jsonl: bosses after.
  - sim/r2/o2.jsonl: Karthax on the published code.
  - sim/r3/r3.jsonl: zones after.
  - sim/r3/r3base.jsonl: zones on the published code.
  - full.jsonl: sim.json's runs.
- **The published code's copy:** base/, served with vite.base3.mjs. Its dep cache is kept in the scratchpad.
