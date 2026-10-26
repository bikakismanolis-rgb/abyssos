# Skotos Act IV: why it is a cliff, and what it should be instead

Published build 7eded86. Sources: `sim.md`/`sim.json` (724 bot runs of the live game, the measurement), `formulas.md`/`formulas.json` (code model), `mechanics.md` (code audit). No new runs were needed. The disagreements were settled from the existing runs and the code (see "Disagreements settled").

## The answer in one paragraph

The cliff is the end of the Forge, not Act IV as a whole.
- **Karthax** gives 44-70% of Act IV's extra damage over Act III. For the Ranger and the Mage he is the hardest fight in the game by far: on Warden difficulty 1.82 and 2.83 lives of damage per fight, against at most 0.85 for any earlier boss, and his biggest blow is 19-21% of max life against 13% before.
- **The Forge's Breath** gives 11-31%. It is 50-96% of all the damage taken in the Forge, and without it the Forge's packs cost exactly what the Heartwood's do.
- The rest is small: Ivar 9-17%, the Field of Ash 1-24% (mostly the Ranger against shielded elites), and the bugs under 5%.
- The packs, the kill times and the hero's level are on Act III's line.
- For the **Warden class** on Warden difficulty there is no cliff in the numbers: Act IV is ×0.7-1.1 Act III.
- The ratio looks larger because **Act III is the game's trough**. Its bosses cost 0.30 lives a fight, against 0.47 in Act I and 0.55 in Act II. Act IV after Act II would be ×1.2 overall. After Act III it is ×2.4.

## Size of the spike (sim, normal player, lives of damage per act = 2 zones + 2 bosses)

| class / diff | Act III | Act IV | IV/III | Karthax − Amaranthe | Breath | Ivar − Silverhorn | Field − Weep | Forge packs − Heart |
|---|---|---|---|---|---|---|---|---|
| Warden / W (packs) | 3.80 | 2.73 | ×0.72 | +0.04 | +0.55 | +0.29 | −1.53 | −0.43 |
| Ranger / W (packs) | 1.48 | 3.87 | ×2.61 | **+1.51 (63%)** | +0.75 (31%) | +0.05 | +0.06 | +0.02 |
| Mage / W (packs) | 0.81 | 4.44 | ×5.49 | **+2.55 (70%)** | +0.75 (21%) | +0.31 (9%) | +0.01 | 0.00 |
| Warden / Wa (packs) | 0.50 | 1.23 | ×2.47 | +0.08 (10%) | +0.15 (19%) | +0.22 (29%) | +0.33 (42%) | −0.04 |
| Ranger / Wa (packs) | 0.62 | 2.19 | ×3.52 | **+0.93 (59%)** | +0.42 (27%) | +0.10 | +0.09 | +0.03 |
| Mage / Wa (packs) | 0.60 | 1.73 | ×2.90 | **+0.75 (57%)** | +0.27 (20%) | +0.30 (23%) | −0.18 | −0.01 |
| Ranger / W (walked) | 1.30 | 3.94 | ×3.02 | +1.51 (53%) | +0.58 (20%) | +0.05 | +0.72 (25%) | −0.22 |
| Mage / W (walked) | 0.75 | 4.24 | ×5.62 | +2.55 (70%) | +0.10 | +0.31 | +0.66 (18%) | −0.14 |

How to read it:
- Each Act IV piece is set against the Act III piece in the same place.
- "Breath" is the whole Breath damage in the Forge (`@forge:98`).
- The percentage is that piece's share of the positive excess.
- Walked zones are 2 runs a row and noisy (the Forge walked for the Ranger: 0.07 and 1.27 lives). The pack-by-pack rows (4 runs) are the reliable ones.

Share of the excess, summed over the classes:

| mode, difficulty | Karthax | Breath | Ivar | Field | Forge monsters |
|---|---|---|---|---|---|
| packs, Warden | 59% | 30% | 9% | 1% | 0% |
| packs, Wanderer | 48% | 23% | 17% | 12% | 1% |
| walked, Warden | 57% | 11% | 9% | 24% | 0% |
| walked, Wanderer | 44% | 25% | 16% | 15% | 0% |

## The causes, ranked

### 1. Karthax: the fight's numbers and structure (design/tuning). 44-70% of the excess

Karthax against the hardest earlier fights, Warden difficulty:

| class | lives | life/min | min life (worst) | max hit | the hardest earlier fight |
|---|---|---|---|---|---|
| Ranger | 1.82 | 3.14 | 63% (37%) | 19.4% | Molten King: 0.85 lives, 13.1% max hit; Amaranthe: 0.31 |
| Mage | 2.83 | 3.36 | 60% (25%) | 20.7% | Amaranthe 0.28, Ivar 0.41, Molten King 0.35; earlier max hit 11.6% |

That makes him ×5.9 (Ranger) and ×10 (Mage) Amaranthe in lives, and ×4.7 and ×6.9 per minute.

On Wanderer:
- Ranger 1.09 lives, Mage 0.86, against Amaranthe's 0.16 and 0.12.
- His kill time does not shrink: 51 s and 42 s, against Amaranthe's 27 s and 23 s (×1.9).

The weaker player (Warden difficulty):
- Ranger 6.44 lives, worst life 24%, 1.5 potions a fight.
- Mage 5.28 lives, 0.5 deaths a fight, worst life 7%.
- The Molten King for the same player: 1.58-2.08 lives.

Where the damage comes from (sim, Mage / Ranger, in lives):
- the Ember Combo (ai.js:2301): 1.08 / 0.52;
- the Hammerfall (ai.js:2320): 0.85 / 0.62;
- the fire patches (projectiles.js:226): 0.70 / 0.52;
- burn: about 0.1.

Why:
- He chases at the hero's pace, and his 5 m combo chains while she is within 6.5 m, so a ranged hero cannot kite him the way she kites Amaranthe or Ivar.
- The Hammerfall's 4.5 m circle with a 1.0 s wind-up cannot be walked out of after a 0.45 s reaction. It needs a well-timed roll. In the cage phase it comes every 5 s, or every 3.2 s with the gifts taken (the sim refused them, so it saw the easier case).
- Every Hammerfall, every third combo blow, the Gaze and the Rain leave fire patches. The last fire has no Cradle to drink them, and no adds after phase 1, so no globes.
- The cage phase is a fixed 21-30 s of survival in which damage to him is wasted (ai.js:2269-2271). That is why the fight does not get shorter on Wanderer.

The Warden class is not spiked: 0.71 lives, 0.91 life/min, 10.6% max hit, against the Molten King's 1.27 / 1.00 / 10.1%. Block, ×1.3 armour, ×1.25 life and the war cry absorb what the ranged classes cannot avoid.

Of Karthax's per-blow growth over Amaranthe, the level drift and his def.dmg (2.7 against 2.5) explain only ×1.15-1.30: monsterDmg(40)/monsterDmg(32.5) = 1.38, hero life ×1.15-1.30. That is 7-17% of his excess on the ranged classes (log share). The rest is the rate of unavoidable blows, which is the fight design.

### 2. The Forge's Breath (tuning/design). 11-31% of the excess, and nearly all of the Forge's

- It is 20% of max life a breath, pure: no armour, no block, no gear. Burn adds 3% (forge.js:19, :97).
- Its share of all damage taken in the Forge, packs mode, Warden difficulty: Warden 50%, Ranger 77%, Mage 80% (0.55 / 0.75 / 0.75 lives a Forge). Over all modes the range is 45-96%.
- Take it away and the Forge's packs cost 0.56 / 0.23 / 0.19 lives, the Heartwood's 0.98 / 0.21 / 0.19. With it, the Forge's life/min is ×1.6 (Warden), ×5.9 (Ranger) and ×6.1 (Mage) the Heartwood's.
- **The sim measured heat 1** (balance-act.mjs:103). The last third of the Forge, and every walk back to Karthax after a death, are at heat 3: an unpumped flue breathes every 5.5 s instead of 8.5 s, ×1.55. So the measured Breath is a lower bound for the end of the zone.
- Its damage grows with the time spent in the open, not with kills. A slower phone player, with the 1.1 m cover boxes and a ±4 m portrait view, takes more of it than the bot.
- On Wanderer it is 12%, ×0.6. The monsters' damage per fight falls to about ×0.36 (×0.55 damage, ×0.65 life). So on Wanderer the Breath is still 54-82% of the Forge's damage, and the Ranger's Breath falls only to ×0.56 while her monster damage falls to ×0.39.

### 3. Ivar (design). 9-23% of the excess, a local bump rather than the cliff

- Warden difficulty: 0.48 / 0.26 / 0.41 lives, the same as Amaranthe's 0.68 / 0.31 / 0.28. He shows in the excess only because Silverhorn (0.17) is the game's easiest boss.
- The Mage on Wanderer is the exception: 0.41 lives against Amaranthe's 0.12, and a worst life of 54%.
- The cause is the Dark: a 2.5 m light against the 3.5-4.6 m he keeps, the sweep snuffing her brazier, and Seen +15% (mechanics §6).

### 4. The Field of Ash (design/readability). 1-24% of the excess, mostly in walked runs

- In packs mode it is flat against Act III (Ranger 0.81 against the Weeping Woods' 0.75; Mage 0.25 against 0.24).
- In the walked runs the Ranger takes +0.72 lives, from elite Ash-Fallen spearmen and dwarves in melee. Their shield blocks the bolt and the multishot from the front (combat.js:189-204). The Mage's +0.66 is mostly molten death bursts (combat.js:414, an every-act affix that hit her twice in 2 runs), which is noise.
- The bot casts skills on cooldown. A phone player who leans on the auto-aimed basic attack hits the shield far more, so this is understated for them.

### 5. The level drift (levelling). A slope present in every act, small here

- Monsters spawn at the hero's level (actors.js:137), and bosses at hero +1. monsterDmg has an L² term and the hero's life does not, so a blow weighs 13-24% more against her life in Act IV than in Act III.
- Under-levelled runs (hero 3 below the zone) are not harder: ×0.23-1.36. Levelling is not the cause.

### 6. Act III is the trough (design of the curve). Inflates the IV/III ratio by about ×1.8

- Bosses per act, lives a fight: 0.47 / 0.55 / 0.30 / 1.08. Act IV is ×3.66 Act III but ×1.96 Act II.
- Whole acts (walked zones + bosses, all classes, Warden difficulty): 1.64 / 2.98 / 1.44 / 3.52 lives.
- The owner plays from the easiest act straight into the hardest fight.

### 7. The bugs (bug). Under 5% of the measured damage, but bad for feel and retries

- Slag drips on Karthax's platform and in the Hall of Moulds (forge.js:109-122): 0.00-0.07 lives a Forge run, and not among Karthax's top sources.
- Affixes fire from a clinging tick or an airborne Ashwing (ai.js:90): at most about 0.18 lives in a single run.
- The waylamp checkpoint is lost on Continue (world.js:723, boot.js:156): not simulated, since the bot gets up where it fell. It costs about 130 m more walking per death at Ivar.
- Dash hits reach wider than their telegraphs (ai.js:797).

### 8. Phone readability (readability). Not measured, adds on top of #1 and #2

- In the last fire her light is 30% of its reach and 12% of its intensity.
- The Forge's cover boxes are about 1.1 m.
- The portrait camera shows about ±4 m to each side against 10-20 m lines.
- The touches take a second and break on a blow.
- The bot sees a telegraph through code, 60% of the time. A player may see it less in the dark.

## Disagreements settled

- **Karthax for the Warden class.** The formulas give 3.0-3.3 lives; the sim gives 0.71 (6 runs). The sim agrees with itself across the normal (0.71), under-levelled (1.09) and weaker (1.32) profiles, each at or below that player's Molten King. The model's 60% landing rate for the combo on a Warden ignores block and the cry. **The sim stands: Karthax is a Ranger and Mage cliff, a Warden step.**
- **The Act IV packs.** The formulas give ×0.7-1.25; packs mode agrees: ×0.98 (Warden) and ×1.83 (Wanderer) life a pack over Act III, all classes. The Ranger's walked Field (×3) is the shield effect plus 2-run noise.
- **The Breath's size.** The formulas give 3.6-4.4% of life a second "in the open at heat 3". The sim gives about 0.37 lives a minute (≈0.6% a second) at heat 1 with a bot that uses cover. These are not a conflict: they are the worst and the typical case. A real player at heat 3 sits between them.

## The target (checkable with the same `tools/balance-act.mjs` plans)

Principle: Act IV over Act III must be no bigger than the largest earlier act-over-act step (Act II over Act I) on any metric. The finale may take up to ×2 on bosses. This holds for every class on Warden and Wanderer.

| metric (sim, normal player) | Act II/I (the yardstick) | Act IV/III now (W / Wa) | target IV/III |
|---|---|---|---|
| bosses: lives per fight | 1.16 / 1.52 | **3.66 / 5.16** (Ranger 3.92 / 6.15, Mage 8.53 / 5.52) | ≤ 2.0, every class and difficulty |
| bosses: kill time | 0.85 / 0.88 | 1.18 / **1.88** (Ranger Wa 2.13, Mage Wa 2.45) | ≤ 1.4 |
| packs: life a pack | 1.94 / 1.94 | 0.98 / 1.83 (Mage W 2.73) | ≤ 1.8 |
| packs: s a pack (TTK) | 1.33 / 1.33 | 0.70 / 0.83 | 0.8-1.3 (fine now) |
| walked: life/min | 1.85 / 2.58 | 1.66 / **2.88** (Ranger W 2.11, Mage Wa 3.93) | ≤ 1.8 W, ≤ 2.5 Wa |
| deaths, normal player | 0 | 0 | 0 |

Per fight and per zone, the absolute numbers to hit (now in brackets):

**Karthax, Warden difficulty**

| metric | Warden | Ranger | Mage |
|---|---|---|---|
| lives per fight | ≤ 1.3 (0.71) | ≤ 0.85 (1.82) | ≤ 0.70 (2.83) |
| life/min | ≤ 1.0 (0.91) | ≤ 1.5 (3.14) | ≤ 1.5 (3.36) |

For every class: max hit ≤ 13% of max life (10.6 / 19.4 / 20.7%); mean min life ≥ 70%, worst run ≥ 35% (69 / 63 / 60%, worst 41 / 37 / 25%).

**Karthax, Wanderer**
- Lives per fight ≤ 0.45 for every class (0.16 / 1.09 / 0.86).
- Max hit ≤ 7.5% (3.4 / 9.7 / 11.1%).
- Kill time ≤ 1.6× the class's Amaranthe: Ranger ≤ 43 s (51), Mage ≤ 37 s (42). The cage lock must scale with the difficulty or with the damage dealt.

**Karthax, the weaker player**
- Deaths ≤ 0.5 a fight, and no more than that player's Molten King.
- Lives per fight ≤ 2.5: on Warden difficulty 1.32 / 6.44 / 5.28 now.

**The Forge (packs mode, measured at heat 1 and again at heat 3)**
- The Breath ≤ 35% of the Forge's damage (now 50 / 77 / 80% W; 54 / 82 / 75% Wa).
- Life a pack ≤ 1.5× the class's Act III mean:
  - Warden difficulty: Ranger ≤ 0.057 (0.074), Mage ≤ 0.025 (0.072);
  - Wanderer: Ranger ≤ 0.026 (0.039), Mage ≤ 0.021 (0.028), Warden ≤ 0.020 (0.023).
- Life/min ≤ 1.5× the class's Act III mean:
  - Warden difficulty: Warden ≤ 1.3 (1.14), Ranger ≤ 1.2 (2.17), Mage ≤ 0.7 (2.69);
  - Wanderer: Warden ≤ 0.16 (0.27), Ranger ≤ 0.68 (1.18), Mage ≤ 0.65 (1.22).
- On Wanderer, the Breath's cut must be at least the monsters' cut. Its share there must not exceed its Warden-difficulty share.

**Ivar and the Field of Ash: keep them where they are**
- Ivar ≤ 1.5× Amaranthe in lives for every class and difficulty. The Mage on Wanderer must fall to ≤ 0.25 (0.41).
- The Field's life a pack ≤ 1.5× the Weeping Woods' (holds now).

**The whole act**
- Act IV boss mean ≤ 0.60 lives a fight on Warden difficulty, all classes (1.08). That is ×2.0 Act III, or Act II's 0.55 + 10%.
- Walked Act IV ≤ 1.8× Act III in lives per zone.
