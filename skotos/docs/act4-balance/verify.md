# Verify, round 2: FAIL (Karthax, Ivar and all 12 scenario runs pass; 11 of 78 targets missed, all in the Forge's packs and one Field cell; the Warden class is not a step up on bosses)

Tree: pub/skotos at 7eded86 plus the fix. `git diff --stat`: 12 files, 174+/119-, matches changes.md. Private server on 5393, no HMR, now stopped. A second server on 5394 served the published code (git archive into balance/base) for before-numbers; also stopped. No browser of mine is left.
Runs: 292 bot runs on the final code, 48 on the published code with the fixed bot, and 12 scenario runs. 0 deaths, 0 failed jobs, 0 page errors.
Full tables: balance/verify-2.tables.md.

## Verdict
- **pass = false.**
- **Scenarios: every one passes, with no page errors.** ashfield, ivar, forge, karthax, ending4, cast4, echo4, combat, panels and boons, plus cagetime with the gifts refused and with them taken.
- **Met:**
  - Every Karthax target and every Ivar target, for every class on both difficulties.
  - The Act IV boss mean: 0.36 lives a fight on Warden difficulty (target <= 0.60).
  - Act IV over Act III, all classes together (W / Wa): bosses x1.19 / x1.69 (<= 2.0); kill time x1.06 / x1.19 (<= 1.4); life a pack x0.67 / x1.36 (<= 1.8).
- **Missed:**
  1. **The Forge's packs: 10 of 78 targets.** Each is either the Mage on the Forge (W and Wa) or the Breath's share on Wanderer.
  2. **The Field, Warden on Wanderer:** 0.040 life a pack against a limit of 0.022. It was 0.036 before the fix, and the fix does not touch it.
  3. **Overshoot, Warden class:** her Act IV bosses cost x0.75 (W) and x0.80 (Wa) of her Act III bosses.
  4. **Per-class ratios for the Mage:**
     - Bosses on Wanderer x2.29 (target <= 2.0). The plan's Risks already called this one unreachable.
     - Boss kill time x1.46 (W) and x1.80 (Wa), target <= 1.4. Her Silverhorn dies in 7-14 s, and the cages alone last 22 s.
  - Not re-measured: walked runs and the weaker player.

## What round 2 found and changed
1. **A bot bug made Karthax look about twice as hard as he is for the Ranger and the Mage (tools/balance-act.mjs:352-375).**
   - What the bot did in the Three Cages:
     - It stopped to shoot as soon as it was within 4 m of its goal point. That left it 5-6 m from the statue, outside the 4.5 m blow, so every statue waited for the two-miss fail-safe.
     - Its goal point was on Karthax's side of the statue, where it got pinned against his body for up to 26 s.
     - A traced Mage run took 45 s to break three cracked statues. The cagetime scenario, with good statue-keeping, takes 15.4 s.
   - The fix: the bot goes to 1.8 m from the statue on its own side, steps round his body, and shoots only once it is there.
   - The same jobs on the published code, with the fixed bot (n=8): Karthax costs 0.64 / 0.80 / 1.47 lives on W. sim.json says 0.71 / 1.82 / 2.83.
   - **So the cliff was real but half the size.** The Mage still took 1.47 lives against Amaranthe's 0.28-0.46, and a max hit of 22.6%.
2. **With the bot fixed, round 1's Karthax was too soft.** The Ranger on W took 0.28 lives (n=4), less than her Act III bosses (0.24-0.27). Round 2 takes back part of the cut, all on the plan's own numbers or the published ones:
   - data.js:102: dmg 2.0 -> 2.1, the plan's value.
   - ai.js:2233 / 2278: the cages' floor 0.15 -> 0.2, and the last fire's floor 20% as published. He now enters the last fire at 20-29.9%. At 15%, the ranged classes ended the last fire in 1-2 s, before Isarn arrived or the first Dark fell.
   - ai.js:2312 / 2331: the fire patches of the combo and the Hammerfall go back to 4 s x0.3, as published. The Hammerfall keeps 2 patches instead of 3.
   - A tried value: dmg 2.2 (n=8) gave the Mage 0.65 lives and a 12.5% max hit, too close to her caps.
3. **The Breath: the plan's knob 2 (forge.js:20-21, audio.js:2049).**
   - Inhale 2.6 -> 2.8 s; hitBy[0] 3 -> 2.5% and hitBy[1] 6 -> 5%, which is the plan's floor.
   - Left out: the knob's "cover marks r +0.2". The marks were sized to stay 97-100% out of the fire.
   - Effect: the misses fell from 18 to 11 (the Forge's from 17 to 10).
4. **Found, not changed: the bot's idle wait.** After each pack the bot waits 8 s standing still, and it does not dodge while it waits.
   - In the Forge, 30-60% of all the damage is taken in those waits, mostly from the Breath. The waits count as damage but not as fight time.
   - The Mage fights only about 21 s in a Forge run, so one Breath hit adds 0.14 life/min.
   - Counting the damage inside packs only, the Forge at heat 1 is at or under 1.5x Act III for every class (table below). At heat 3, two cells are over: the Ranger on W (0.74 against 0.48) and the Mage on Wa (0.26 against 0.25).
   - Act III's zones have the same artefact, but smaller.

## Bosses (lives a fight; before = sim.json -> after; W = Warden difficulty, Wa = Wanderer)

| | Warden W | Ranger W | Mage W | Warden Wa | Ranger Wa | Mage Wa |
|---|---|---|---|---|---|---|
| Karthax, sim.json (old bot) | 0.71 | 1.82 | 2.83 | 0.16 | 1.09 | 0.86 |
| Karthax, published code, fixed bot (n=8) | 0.64 | 0.80 | 1.47 | 0.22 | 0.48 | 0.67 |
| **Karthax after (n=16)** | **0.34** | **0.41** | **0.56** | **0.09** | **0.19** | **0.26** |
| target | <= 1.3 | <= 0.85 | <= 0.70 | <= 0.45 | <= 0.45 | <= 0.45 |
| life/min after (target) | 0.41 (1.0) | 0.87 (1.5) | 1.20 (1.5) | 0.12 | 0.46 | 0.57 |
| max hit, mean of runs (fixed bot, published code) | 5.9% (10.7) | 10.4% (18.9) | 12.0% (22.6) | 2.1% | 5.2% | 6.2% |
| min life, mean (worst) | 92 (86)% | 87 (82)% | 85 (76)% | 98% | 94% | 93% |
| kill s (target on Wa) | 48 | 27 | 28 | 42 | 24 (<= 43) | 27 (<= 37) |
| Ivar after (before) | 0.22 (0.48) | 0.20 (0.26) | 0.44 (0.41) | 0.02 (0.28) | 0.08 (0.14) | 0.11 (0.41; <= 0.25) |
| Act III: Silverhorn / Amaranthe, before and after pooled | 0.17 / 0.57 | 0.20 / 0.28 | 0.21 / 0.39 | 0.05 / 0.09 | 0.04 / 0.11 | 0.06 / 0.10 |

- The max-hit target (<= 13%) is the mean of each run's largest hit. The Mage's single worst hit is 16.3%; it was 24.9% before.
- Run-to-run noise is large. The Ranger on W gave 0.37 and 0.60 in two batches of 8 on nearly the same code. So Karthax has 16 runs a cell, and the Warden's Act III and Ivar have 12-18.

## Zones, pack by pack (Forge n=6 at heat 1 and n=4 at heat 3; Field n=10-11)

| | Warden W | Ranger W | Mage W | Warden Wa | Ranger Wa | Mage Wa |
|---|---|---|---|---|---|---|
| Forge h1 life/min (target) | 0.39 (1.3) | 0.78 (1.2) | **0.80 (0.7)** | 0.15 (0.16) | 0.57 (0.68) | **0.83 (0.65)** |
| Forge h3 life/min | 0.26 | 1.04 | **0.79** | **0.25** | 0.53 | 0.54 |
| Forge h1 life a pack (target) | 0.032 | 0.029 (0.057) | 0.021 (0.025) | 0.009 (0.020) | 0.016 (0.026) | **0.022 (0.021)** |
| Breath share h1 / h3 (target <= 35%) | 23 / 21% | 31 / 27% | **52 / 52%** | 16 / **39%** | 34 / 25% | 24 / **42%** |
| Breath hits a run h1 (before) | 2.3 (3.3) | 2.3 (3.8) | 2.8 (3.8) | 1.0 (1.5) | 2.8 (3.5) | 2.8 (2.3) |
| Breath lives a run h1 (before) | 0.10 (0.55) | 0.12 (0.75) | 0.14 (0.75) | 0.02 (0.15) | 0.07 (0.42) | 0.07 (0.27) |
| Forge h1 / h3 life/min inside packs (limit: 1.5x Act III inside packs) | 0.30 / 0.23 (1.26) | 0.47 / 0.74 (0.48) | 0.38 / 0.46 (0.49) | 0.12 / 0.15 (0.16) | 0.26 / 0.26 (0.49) | 0.25 / 0.26 (0.25) |
| Field life a pack (limit) | 0.060 (0.239) | 0.058 (0.092) | 0.028 (0.028) | **0.040 (0.022)** | 0.022 (0.043) | 0.013 (0.031) |

- **The Mage's Forge.**
  - Half of her Forge damage (0.14 of 0.28 lives a run on W) falls in the bot's idle waits.
  - Her monster damage swings with the elites: 0.13 lives in this batch, 0.34 in round 1's.
  - Her Breath share swings with it: 52% here against 31-41% in round 1.
- **Wanderer.**
  - The monsters fall to x0.36 of W; the Breath, at 2.5% against 5%, falls only to x0.5.
  - So "the Wa share <= the W share" and "<= 35%" cannot hold at heat 3 above the plan's floor. Below the floor the Breath is a 1-2% tap.

## Overshoot (task step 3)
- **Act IV against Act III, per class.** Bosses are in lives a fight; the whole act is 2 zones + 2 bosses (the Forge at heat 1). Brackets are before the fix.

  | | bosses IV/III | whole act IV/III |
  |---|---|---|
  | Warden W | **x0.75** (x1.61) | **x0.50** (x0.74: not a step up even before the fix) |
  | Ranger W | x1.26 (x4.32) | x1.27 (x2.69) |
  | Mage W | x1.68 (x5.45) | x1.64 (x4.35) |
  | Warden Wa | **x0.80** (x3.17) | x1.61 (x2.49) |
  | Ranger Wa | x1.88 (x8.36) | x1.45 (x3.88) |
  | Mage Wa | x2.29 (x7.99) | x1.57 (x3.23) |

- **The Warden class is the one miss. No class-neutral number can lift her.**
  - Each Karthax hit weighs about 0.4x as much on her as on the Mage (armour, block, life). She takes about as many hits.
  - To reach x1.0 her Karthax must cost about 0.52 lives (x1.5).
  - The same x1.5 would put the Mage at about 0.86 lives (target 0.70) with an 18% max hit (target 13%).
  - Her Act III also stands out: Amaranthe costs her 0.57 lives and a 74 s fight.
- **The Breath still matters.**
  - It lands 2-3 hits a Forge run, a hit being 5% of max life on W and 2.5% on Wa.
  - It is 21-52% of the Forge's damage on W, and the Mage's top single source.
  - The Forge scenario gives periods of 9.25 / 8.5 / 7.75 s at heat 1 / 2 / 3.
- **The cages are still a phase.**
  - In the sim they last 18.5-24.6 s a fight. Before, with the old bot, they lasted 27-45 s.
  - cagetime, ideal statue-keeping: 15.6 / 15.4 s with the gifts refused, 33.8 / 33.6 s with them taken (round 1: 15.4 and 33.6-33.8).
  - The last fire now lasts 2-3 s for the ranged classes and 6-9 s for the Warden.

## Scenarios (balance/scen-v2; every run exit 0, no page errors or warnings)
- **ashfield:** quest 17->19; 5 lamps lit with their memories; checkpoint [51.1, 48.5]; a snuffed lamp relit (prompt lamp.relight); 3 altars; wake at the checkpoint, 0 m.
- **ivar:** Dark light 3.5 m; d.ivar.blind said; 3 falters; gate open; quest 20.
- **forge:** 3 bellows; heat 1-3, periods 9.25 / 8.5 / 7.75 s; the plug open; quest 21.
- **karthax:**
  - Arrival; the cages lord:2 / king:1 / lady:2; all three broken, at 30%.
  - The last fire: light 0, Isarn 3.1 m short, 4 ghosts.
  - The crown unmade; quest 22.
- **The rest:**
  - ending4: quest 23; Unbound boon, 3 cards.
  - cast4: 11 kinds.
  - echo4: the Ivar and Karthax echoes, both killed.
  - combat: 5 kills.
  - panels: ok.
  - boons: ember, anvil.

## Next (ranked)
1. **The Warden's overshoot is a design call.**
   - One option is to accept it, as the plan's Risks did. Her whole act on W was never a step up.
   - Otherwise she needs a threat aimed at heroes who stand in his reach, and only at them. On the bot, every class stands in his reach, so the sim cannot tell such a change apart from one that hits the Mage too.
2. **Re-judge the Forge.** Choose one:
   - Make the bot dodge during its 8 s wait, then re-measure the Act III and Act IV zones: about 130 runs, about 20 min.
   - Or judge the Forge by the inside-packs numbers above. It meets them at heat 1; at heat 3 two cells are over.
3. **Relax the Wanderer share target.** The "Breath share on Wa <= on W" rule cannot be met above the plan's floor.

## Files (balance/)
- **Code:**
  - changes.md is updated; round 1's copy is changes.r1.md.
  - patch.diff is regenerated; round 1's copy is patch.r1.diff.
    - `git apply -R --check` passes on the tree.
    - `git apply --check` passes on a clean 7eded86 skotos/src.
  - `npx vite build` passes.
- **Run data (sim/r2/):**
  - final.jsonl: 196 runs. These are round 1's v1 / v2 / v3 jobs, plus Silverhorn and Amaranthe.
  - r2b.jsonl: 108 runs. Karthax on 8 new seeds a cell, and the Forge after knob 2.
  - w3.jsonl: 48 runs, the Warden's Silverhorn, Amaranthe and Ivar.
  - o2.jsonl: 48 runs, Karthax on the published code with the fixed bot.
  - k0 / k1 / k2 / t1.jsonl: the diagnosis batches.
  - tr*.jsonl: cage traces.
- **Tools (sim/r2/):** mkpool2.mjs builds pool2.jsonl; cmp-v2.mjs, inpack.mjs and kx.mjs make the reports.
- **The published code's copy:** balance/base (git archive), served with balance/vite.base.mjs.
