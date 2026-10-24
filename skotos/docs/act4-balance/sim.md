# Skotos: simulated play, difficulty by zone and boss

Published build (commit 7eded86), 724 runs of `skotos/tools/balance-act.mjs` (96 zones walked, 156 zones pack by pack, 364 boss fights, 96 of them under-levelled).

**The hero**: at the level and item level a normal player has there (the formula agent's `normal-casual` profile in formulas.json: Act IV at about level 32-38, gear 4-6 levels behind). Gear = per slot the best (damage × toughness) of 5 drops round that item level (one an elite's), plus the first-kill legendary of every boss already beaten; skill points spent in order; the blessings of the acts done; no altar gifts.

**The bot**: goes to the nearest foe, attacks, uses its skills on cooldown (Warden: cry, leap, quake, whirl; Ranger: wolf, pierce, rain, volley; Mage: nova, meteor, chain, fireball), sees a telegraph 60% of the time and reacts after 0.45 s (a casual phone player), walks or rolls out of red, into blue safe circles, out of standing fire unless it is striking, drinks a potion under 35% life, rolls off Ember Ticks after 0.4 s, comes closer to a Shrouded foe (into the Cradle's ring); in Ivar's dark it kills the adds at its side and relights the braziers, behind Karthax's cages it stands by a statue, and it fights a Shrouded boss from a light pool. A death is counted and the hero gets up where she fell a second later.

**Zones walked**: from the start to the nearest pack not yet cleared, fighting whatever comes on the way, every pack reachable (Act IV: the Anvil Gate and the Great Stair open, the Forge at heat 1); the time is the whole play time. **Zones pack by pack**: teleported next to each pack, the time is only the fights. **Bosses**: placed in the arena, the time is from its waking to its death.

Columns: **deaths** per run; **min life** = the run's lowest life (mean over runs, worst run in brackets); **life/min** = damage taken per minute in units of the hero's maximum life; **lives** = maximum lives of damage taken over the zone or the fight (healing not netted out); **/pack** = the same per pack; **time** = minutes for the zone, seconds for a boss. W = the Warden difficulty (index 1, the default), Wa = Wanderer (index 0).

## Warden

**Zones walked** (runs per row: 2 / 2 in Act IV)

| zone | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | /pack W / Wa | time (min) W / Wa |
|---|---|---|---|---|---|---|---|
| forest (A1) | 4 / 4 | 0.00 / 0.00 | 92% (85%) / 96% (92%) | 0.34 / 0.27 | 0.52 / 0.33 | 0.030 / 0.019 | 1.4 / 1.1 |
| crypt (A1) | 10 / 10 | 0.00 / 0.00 | 97% (97%) / 98% (97%) | 0.06 / 0.10 | 0.07 / 0.09 | 0.006 / 0.009 | 1.5 / 1.1 |
| pass (A2) | 16 / 16 | 0.00 / 0.00 | 82% (76%) / 69% (61%) | 0.83 / 0.66 | 2.06 / 1.43 | 0.088 / 0.061 | 2.5 / 2.2 |
| halls (A2) | 22 / 21 | 0.00 / 0.00 | 92% (90%) / 88% (83%) | 0.26 / 0.33 | 0.71 / 0.76 | 0.039 / 0.042 | 2.5 / 2.3 |
| weep (A3) | 26 / 25 | 0.00 / 0.00 | 81% (76%) / 97% (94%) | 0.35 / 0.10 | 0.73 / 0.14 | 0.058 / 0.010 | 2.1 / 1.6 |
| heart (A3) | 29 / 28 | 0.00 / 0.00 | 79% (59%) / 96% (96%) | 0.30 / 0.16 | 0.65 / 0.26 | 0.046 / 0.019 | 1.8 / 1.6 |
| ashfield (A4) | 33 / 32 | 0.00 / 0.00 | 85% (85%) / 86% (77%) | 0.54 / 0.38 | 1.07 / 0.61 | 0.071 / 0.041 | 1.9 / 1.6 |
| forge (A4) | 37 / 35 | 0.00 / 0.00 | 94% (88%) / 82% (80%) | 0.07 / 0.32 | 0.12 / 0.51 | 0.008 / 0.039 | 1.5 / 1.6 |

**Zones pack by pack** (runs per row: 3 / 4 in Act IV)

| zone | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | /pack W / Wa | time (min) W / Wa |
|---|---|---|---|---|---|---|---|
| forest (A1) | 4 / 4 | 0.00 / 0.00 | 87% (68%) / 95% (95%) | 0.33 / 0.52 | 0.62 / 0.49 | 0.037 / 0.030 | 1.2 / 0.9 |
| crypt (A1) | 10 / 10 | 0.00 / 0.00 | 88% (78%) / 95% (91%) | 0.62 / 0.22 | 0.50 / 0.16 | 0.044 / 0.013 | 0.8 / 0.7 |
| pass (A2) | 17 / 15 | 0.00 / 0.00 | 67% (53%) / 93% (90%) | 0.98 / 0.63 | 2.24 / 1.12 | 0.117 / 0.056 | 2.7 / 1.9 |
| halls (A2) | 23 / 20 | 0.00 / 0.00 | 83% (77%) / 90% (86%) | 0.79 / 0.41 | 1.24 / 0.54 | 0.071 / 0.031 | 1.6 / 1.3 |
| weep (A3) | 27 / 24 | 0.00 / 0.00 | 62% (43%) / 97% (95%) | 1.02 / 0.12 | 1.96 / 0.18 | 0.160 / 0.014 | 1.9 / 1.4 |
| heart (A3) | 31 / 28 | 0.00 / 0.00 | 84% (74%) / 98% (95%) | 0.71 / 0.09 | 0.98 / 0.17 | 0.072 / 0.013 | 1.4 / 1.5 |
| ashfield (A4) | 35 / 32 | 0.00 / 0.00 | 86% (76%) / 92% (83%) | 0.38 / 0.30 | 0.43 / 0.51 | 0.030 / 0.036 | 1.2 / 1.5 |
| forge (A4) | 38 / 35 | 0.00 / 0.00 | 80% (70%) / 91% (80%) | 1.14 / 0.27 | 1.11 / 0.28 | 0.083 / 0.023 | 1.0 / 1.0 |

**Zones walked, a weaker player** (PARTIAL pass, stopped early) (runs per row: 1 / 1 in Act IV)

| zone | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | /pack W / Wa | time (min) W / Wa |
|---|---|---|---|---|---|---|---|
| forest (A1) | 4 / 4 | 0.00 / 0.00 | 68% (68%) / 100% (100%) | 1.18 / 0.00 | 1.38 / 0.00 | 0.092 / 0.000 | 1.2 / 0.9 |
| crypt (A1) | 10 / 10 | 0.00 / 0.00 | 88% (88%) / 100% (100%) | 0.58 / 0.00 | 0.82 / 0.00 | 0.059 / 0.000 | 1.4 / 1.2 |
| pass (A2) | 16 / 16 | 0.00 / 0.00 | 62% (62%) / 35% (35%) | 1.72 / 0.83 | 4.63 / 2.21 | 0.201 / 0.096 | 2.7 / 2.7 |
| halls (A2) | 22 / 21 | 0.00 / 0.00 | 88% (88%) / 92% (92%) | 0.79 / 0.47 | 1.48 / 1.06 | 0.082 / 0.059 | 1.9 / 2.3 |
| weep (A3) | 26 / 25 | 0.00 / 0.00 | 69% (69%) / 99% (99%) | 1.22 / 0.12 | 2.51 / 0.20 | 0.209 / 0.017 | 2.1 / 1.7 |
| heart (A3) | 29 / 28 | 0.00 / 0.00 | 71% (71%) / 94% (94%) | 0.95 / 0.37 | 1.20 / 0.78 | 0.092 / 0.060 | 1.3 / 2.1 |
| ashfield (A4) | 33 / 32 | 0.00 / 0.00 | 81% (81%) / 93% (93%) | 1.02 / 0.27 | 1.84 / 0.40 | 0.123 / 0.027 | 1.8 / 1.5 |
| forge (A4) | 37 / 35 | 0.00 / 0.00 | 85% (85%) / 88% (88%) | 0.43 / 0.57 | 0.61 / 0.66 | 0.051 / 0.055 | 1.4 / 1.2 |

**Bosses** (runs per row: 4 / 6 in Act IV)

| boss | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | kill time (s) W / Wa |
|---|---|---|---|---|---|---|
| the Weaver (A1) | 7 / 7 | 0.00 / 0.00 | 75% (51%) / 94% (86%) | 0.67 / 0.20 | 0.61 / 0.11 | 56 / 30 |
| the Barrow Lord (A1) | 12 / 11 | 0.00 / 0.00 | 73% (34%) / 94% (89%) | 0.69 / 0.16 | 0.83 / 0.14 | 69 / 52 |
| the Stonewarden (A2) | 20 / 18 | 0.00 / 0.00 | 94% (93%) / 98% (95%) | 0.47 / 0.16 | 0.27 / 0.06 | 38 / 22 |
| the Molten King (Durgan) (A2) | 25 / 22 | 0.00 / 0.00 | 60% (31%) / 77% (61%) | 1.00 / 0.48 | 1.27 / 0.45 | 75 / 55 |
| Silverhorn (A3) | 28 / 25 | 0.00 / 0.00 | 89% (82%) / 96% (93%) | 0.27 / 0.14 | 0.19 / 0.06 | 38 / 23 |
| Amaranthe (A3) | 32 / 29 | 0.00 / 0.00 | 85% (76%) / 98% (94%) | 0.47 / 0.09 | 0.68 / 0.08 | 85 / 60 |
| Ivar (A4) | 35 / 32 | 0.00 / 0.00 | 83% (48%) / 95% (85%) | 0.50 / 0.17 | 0.48 / 0.28 | 54 / 87 |
| Karthax (A4) | 39 / 36 | 0.00 / 0.00 | 69% (41%) / 95% (84%) | 0.91 / 0.19 | 0.71 / 0.16 | 48 / 44 |

**Bosses, a weaker player** (PARTIAL pass) (runs per row: 3 / 3 in Act IV)

| boss | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | kill time (s) W / Wa |
|---|---|---|---|---|---|---|
| the Weaver (A1) | 7 / 7 | 0.00 / 0.00 | 66% (35%) / 80% (65%) | 1.26 / 1.01 | 1.02 / 0.55 | 50 / 32 |
| the Barrow Lord (A1) | 12 / 11 | 0.33 / 0.00 | 56% (4%) / 91% (82%) | 1.14 / 0.23 | 4.17 / 0.13 | 44 (2/3 killed) / 37 |
| the Stonewarden (A2) | 19 / 18 | 0.00 / 0.00 | 83% (68%) / 95% (91%) | 0.81 / 0.19 | 0.50 / 0.09 | 38 / 23 |
| the Molten King (Durgan) (A2) | 23 / 22 | 0.33 / 0.00 | 23% (3%) / 44% (22%) | 2.55 / 1.59 | 1.96 / 1.19 | 46 / 44 |
| Silverhorn (A3) | 27 / 25 | 0.00 / 0.00 | 86% (85%) / 99% (97%) | 0.87 / 0.09 | 0.35 / 0.04 | 28 / 28 |
| Amaranthe (A3) | 31 / 29 | 0.00 / 0.00 | 81% (76%) / 94% (90%) | 0.96 / 0.21 | 1.17 / 0.22 | 71 / 57 |
| Ivar (A4) | 34 / 32 | 0.00 / 0.00 | 64% (32%) / 95% (93%) | 0.82 / 0.22 | 0.77 / 0.14 | 54 / 39 |
| Karthax (A4) | 38 / 36 | 0.00 / 0.00 | 58% (22%) / 92% (87%) | 1.73 / 0.75 | 1.32 / 0.63 | 46 / 55 |

## Ranger

**Zones walked** (runs per row: 2 / 2 in Act IV)

| zone | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | /pack W / Wa | time (min) W / Wa |
|---|---|---|---|---|---|---|---|
| forest (A1) | 4 / 4 | 0.00 / 0.00 | 80% (72%) / 98% (98%) | 0.44 / 0.04 | 0.70 / 0.04 | 0.041 / 0.003 | 1.3 / 0.9 |
| crypt (A1) | 10 / 10 | 0.00 / 0.00 | 97% (95%) / 98% (98%) | 0.04 / 0.03 | 0.04 / 0.03 | 0.003 / 0.002 | 1.0 / 0.9 |
| pass (A2) | 16 / 15 | 0.00 / 0.00 | 86% (79%) / 94% (92%) | 0.62 / 0.10 | 0.90 / 0.11 | 0.039 / 0.005 | 1.6 / 1.2 |
| halls (A2) | 22 / 20 | 0.00 / 0.00 | 92% (91%) / 88% (78%) | 0.22 / 0.21 | 0.36 / 0.35 | 0.020 / 0.020 | 1.6 / 1.7 |
| weep (A3) | 26 / 24 | 0.00 / 0.00 | 91% (91%) / 95% (94%) | 0.37 / 0.18 | 0.47 / 0.19 | 0.037 / 0.015 | 1.3 / 1.2 |
| heart (A3) | 30 / 27 | 0.00 / 0.00 | 89% (84%) / 99% (98%) | 0.28 / 0.01 | 0.30 / 0.01 | 0.023 / 0.001 | 1.0 / 0.8 |
| ashfield (A4) | 34 / 31 | 0.00 / 0.00 | 68% (56%) / 96% (94%) | 0.90 / 0.13 | 1.19 / 0.14 | 0.079 / 0.009 | 1.3 / 1.1 |
| forge (A4) | 37 / 34 | 0.00 / 0.00 | 60% (27%) / 86% (84%) | 0.47 / 0.32 | 0.67 / 0.32 | 0.055 / 0.025 | 1.3 / 1.0 |

**Zones pack by pack** (runs per row: 3 / 4 in Act IV)

| zone | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | /pack W / Wa | time (min) W / Wa |
|---|---|---|---|---|---|---|---|
| forest (A1) | 4 / 4 | 0.00 / 0.00 | 67% (35%) / 92% (85%) | 1.51 / 0.66 | 0.78 / 0.25 | 0.048 / 0.016 | 0.5 / 0.4 |
| crypt (A1) | 11 / 10 | 0.00 / 0.00 | 91% (80%) / 91% (76%) | 0.24 / 0.29 | 0.12 / 0.16 | 0.009 / 0.012 | 0.4 / 0.4 |
| pass (A2) | 17 / 16 | 0.00 / 0.00 | 69% (56%) / 82% (74%) | 1.75 / 1.04 | 1.22 / 0.76 | 0.059 / 0.036 | 0.7 / 0.7 |
| halls (A2) | 22 / 21 | 0.00 / 0.00 | 77% (71%) / 90% (84%) | 1.29 / 0.69 | 1.02 / 0.55 | 0.057 / 0.031 | 0.8 / 0.8 |
| weep (A3) | 27 / 25 | 0.00 / 0.00 | 64% (7%) / 94% (88%) | 1.25 / 0.77 | 0.75 / 0.35 | 0.061 / 0.029 | 0.6 / 0.5 |
| heart (A3) | 30 / 28 | 0.00 / 0.00 | 93% (90%) / 96% (96%) | 0.37 / 0.13 | 0.21 / 0.07 | 0.015 / 0.005 | 0.6 / 0.5 |
| ashfield (A4) | 34 / 32 | 0.00 / 0.00 | 77% (74%) / 86% (64%) | 1.60 / 0.78 | 0.81 / 0.44 | 0.057 / 0.030 | 0.5 / 0.5 |
| forge (A4) | 38 / 35 | 0.00 / 0.00 | 64% (25%) / 85% (78%) | 2.17 / 1.18 | 0.98 / 0.51 | 0.074 / 0.039 | 0.5 / 0.4 |

**Zones walked, a weaker player** (PARTIAL pass, stopped early) (runs per row: 1 / 1 in Act IV)

| zone | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | /pack W / Wa | time (min) W / Wa |
|---|---|---|---|---|---|---|---|
| forest (A1) | 4 / 4 | 0.00 / 0.00 | 96% (96%) / 88% (88%) | 0.31 / 0.57 | 0.23 / 0.45 | 0.015 / 0.030 | 0.7 / 0.8 |
| crypt (A1) | 10 / 10 | 0.00 / 0.00 | 91% (91%) / 95% (95%) | 0.15 / 0.11 | 0.17 / 0.12 | 0.012 / 0.009 | 1.1 / 1.1 |
| pass (A2) | 16 / 15 | 0.00 / 0.00 | 83% (83%) / 80% (80%) | 0.63 / 0.35 | 0.96 / 0.54 | 0.042 / 0.023 | 1.5 / 1.5 |
| halls (A2) | 22 / 20 | 0.00 / 0.00 | 88% (88%) / 94% (94%) | 0.28 / 0.18 | 0.44 / 0.25 | 0.024 / 0.014 | 1.6 / 1.4 |
| weep (A3) | 26 / 24 | 0.00 / 0.00 | 91% (91%) / 97% (97%) | 0.15 / 0.13 | 0.18 / 0.12 | 0.015 / 0.010 | 1.2 / 0.9 |
| heart (A3) | 30 / 27 | 0.00 / 0.00 | 97% (97%) / 98% (98%) | 0.03 / 0.08 | 0.03 / 0.06 | 0.002 / 0.005 | 1.0 / 0.8 |
| ashfield (A4) | 34 / 31 | 0.00 / 0.00 | 81% (81%) / 94% (94%) | 1.17 / 0.31 | 1.73 / 0.32 | 0.115 / 0.021 | 1.5 / 1.1 |
| forge (A4) | 37 / 34 | 0.00 / 0.00 | 68% (68%) / 85% (85%) | 0.38 / 0.34 | 0.41 / 0.39 | 0.034 / 0.033 | 1.1 / 1.2 |

**Bosses** (runs per row: 4 / 6 in Act IV)

| boss | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | kill time (s) W / Wa |
|---|---|---|---|---|---|---|
| the Weaver (A1) | 8 / 8 | 0.00 / 0.00 | 89% (81%) / 95% (90%) | 0.92 / 0.57 | 0.27 / 0.11 | 17 / 10 |
| the Barrow Lord (A1) | 12 / 11 | 0.00 / 0.00 | 86% (81%) / 91% (86%) | 0.85 / 0.62 | 0.34 / 0.14 | 24 / 14 |
| the Stonewarden (A2) | 20 / 18 | 0.00 / 0.00 | 79% (73%) / 92% (89%) | 1.40 / 0.69 | 0.29 / 0.09 | 13 / 8 |
| the Molten King (Durgan) (A2) | 24 / 22 | 0.00 / 0.00 | 47% (31%) / 78% (62%) | 3.05 / 1.65 | 0.85 / 0.30 | 19 / 11 |
| Silverhorn (A3) | 28 / 25 | 0.00 / 0.00 | 83% (71%) / 96% (82%) | 1.10 / 0.43 | 0.22 / 0.04 | 12 / 7 |
| Amaranthe (A3) | 31 / 29 | 0.00 / 0.00 | 85% (81%) / 93% (91%) | 0.67 / 0.35 | 0.31 / 0.16 | 29 / 27 |
| Ivar (A4) | 35 / 32 | 0.00 / 0.00 | 88% (66%) / 91% (85%) | 0.65 / 0.49 | 0.26 / 0.14 | 24 / 21 |
| Karthax (A4) | 39 / 36 | 0.00 / 0.00 | 63% (37%) / 87% (82%) | 3.14 / 1.23 | 1.82 / 1.09 | 36 / 51 |

**Bosses, a weaker player** (PARTIAL pass) (runs per row: 2 / 2 in Act IV)

| boss | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | kill time (s) W / Wa |
|---|---|---|---|---|---|---|
| the Weaver (A1) | 8 / 7 | 0.00 / 0.00 | 34% (34%) / 38% (33%) | 3.25 / 2.35 | 1.34 / 0.68 | 24 / 18 |
| the Barrow Lord (A1) | 11 / 11 | 0.00 / 0.00 | 57% (25%) / 91% (86%) | 3.34 / 1.42 | 1.25 / 0.35 | 23 / 14 |
| the Stonewarden (A2) | 19 / 18 | 0.00 / 0.00 | 84% (81%) / 91% (87%) | 2.91 / 0.60 | 0.58 / 0.11 | 11 / 10 |
| the Molten King (Durgan) (A2) | 23 / 22 | 0.50 / 0.00 | 51% (14%) / 74% (59%) | 4.25 / 2.17 | 1.58 / 0.48 | 21 / 13 |
| Silverhorn (A3) | 27 / 25 | 0.00 / 0.00 | 70% (63%) / 74% (63%) | 1.38 / 1.73 | 0.34 / 0.32 | 15 / 11 |
| Amaranthe (A3) | 31 / 29 | 0.00 / 0.00 | 59% (30%) / 92% (90%) | 2.31 / 0.73 | 1.08 / 0.25 | 28 / 20 |
| Ivar (A4) | 34 / 32 | 0.00 / 0.00 | 54% (33%) / 85% (83%) | 2.44 / 1.11 | 1.02 / 0.33 | 25 / 19 |
| Karthax (A4) | 38 / 35 | 0.00 / 0.00 | 24% (19%) / 77% (74%) | 6.06 / 3.71 | 6.44 / 3.74 | 60 / 61 |

## Mage

**Zones walked** (runs per row: 2 / 2 in Act IV)

| zone | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | /pack W / Wa | time (min) W / Wa |
|---|---|---|---|---|---|---|---|
| forest (A1) | 4 / 4 | 0.00 / 0.00 | 87% (86%) / 95% (92%) | 0.59 / 0.24 | 0.58 / 0.17 | 0.036 / 0.010 | 1.0 / 0.7 |
| crypt (A1) | 10 / 10 | 0.00 / 0.00 | 94% (90%) / 98% (98%) | 0.16 / 0.04 | 0.17 / 0.03 | 0.013 / 0.002 | 0.9 / 0.8 |
| pass (A2) | 17 / 15 | 0.00 / 0.00 | 79% (78%) / 87% (86%) | 0.44 / 0.38 | 0.64 / 0.43 | 0.027 / 0.018 | 1.4 / 1.1 |
| halls (A2) | 22 / 20 | 0.00 / 0.00 | 88% (83%) / 94% (90%) | 0.65 / 0.18 | 0.98 / 0.30 | 0.054 / 0.016 | 1.5 / 1.5 |
| weep (A3) | 26 / 24 | 0.00 / 0.00 | 96% (92%) / 98% (98%) | 0.12 / 0.03 | 0.12 / 0.03 | 0.010 / 0.003 | 1.1 / 1.0 |
| heart (A3) | 30 / 27 | 0.00 / 0.00 | 89% (83%) / 93% (89%) | 0.32 / 0.11 | 0.26 / 0.10 | 0.019 / 0.007 | 0.8 / 0.9 |
| ashfield (A4) | 34 / 31 | 0.00 / 0.00 | 63% (43%) / 94% (92%) | 0.70 / 0.14 | 0.78 / 0.15 | 0.052 / 0.010 | 1.1 / 1.1 |
| forge (A4) | 37 / 34 | 0.00 / 0.00 | 79% (78%) / 84% (79%) | 0.21 / 0.41 | 0.22 / 0.42 | 0.017 / 0.033 | 1.1 / 1.0 |

**Zones pack by pack** (runs per row: 3 / 4 in Act IV)

| zone | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | /pack W / Wa | time (min) W / Wa |
|---|---|---|---|---|---|---|---|
| forest (A1) | 4 / 4 | 0.00 / 0.00 | 67% (49%) / 92% (79%) | 2.57 / 1.46 | 1.15 / 0.35 | 0.071 / 0.022 | 0.5 / 0.3 |
| crypt (A1) | 11 / 10 | 0.00 / 0.00 | 96% (95%) / 94% (91%) | 0.28 / 0.36 | 0.10 / 0.11 | 0.008 / 0.010 | 0.3 / 0.3 |
| pass (A2) | 17 / 15 | 0.00 / 0.00 | 69% (56%) / 93% (91%) | 2.20 / 0.79 | 1.41 / 0.44 | 0.068 / 0.021 | 0.6 / 0.6 |
| halls (A2) | 22 / 20 | 0.00 / 0.00 | 72% (45%) / 89% (81%) | 1.93 / 0.99 | 0.88 / 0.44 | 0.050 / 0.025 | 0.5 / 0.4 |
| weep (A3) | 26 / 24 | 0.00 / 0.00 | 89% (76%) / 88% (71%) | 0.50 / 0.58 | 0.24 / 0.28 | 0.019 / 0.021 | 0.5 / 0.4 |
| heart (A3) | 30 / 28 | 0.00 / 0.00 | 90% (85%) / 96% (93%) | 0.44 / 0.28 | 0.19 / 0.10 | 0.014 / 0.007 | 0.4 / 0.4 |
| ashfield (A4) | 34 / 31 | 0.00 / 0.00 | 88% (82%) / 93% (79%) | 0.60 / 0.24 | 0.25 / 0.10 | 0.018 / 0.007 | 0.5 / 0.4 |
| forge (A4) | 38 / 35 | 0.00 / 0.00 | 63% (52%) / 86% (79%) | 2.69 / 1.22 | 0.94 / 0.36 | 0.072 / 0.028 | 0.4 / 0.3 |

**Zones walked, a weaker player** (PARTIAL pass, stopped early) (runs per row: 1 / 1 in Act IV)

| zone | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | /pack W / Wa | time (min) W / Wa |
|---|---|---|---|---|---|---|---|
| forest (A1) | 4 / 4 | 0.00 / 0.00 | 78% (78%) / 98% (98%) | 0.79 / 0.03 | 0.86 / 0.02 | 0.057 / 0.001 | 1.1 / 0.6 |
| crypt (A1) | 10 / 10 | 0.00 / 0.00 | 73% (73%) / 96% (96%) | 1.10 / 0.07 | 1.24 / 0.06 | 0.089 / 0.004 | 1.1 / 0.9 |
| pass (A2) | 17 / 15 | 0.00 / 0.00 | 79% (79%) / 77% (77%) | 1.01 / 0.74 | 1.31 / 0.98 | 0.057 / 0.043 | 1.3 / 1.3 |
| halls (A2) | 22 / 20 | 0.00 / 0.00 | 88% (88%) / 88% (88%) | 0.33 / 0.33 | 0.50 / 0.42 | 0.028 / 0.023 | 1.5 / 1.3 |
| weep (A3) | 26 / 24 | 0.00 / 0.00 | 92% (92%) / 93% (93%) | 0.08 / 0.16 | 0.08 / 0.17 | 0.007 / 0.014 | 1.1 / 1.0 |
| heart (A3) | 30 / 27 | 0.00 / 0.00 | 90% (90%) / 98% (98%) | 0.28 / 0.14 | 0.22 / 0.10 | 0.017 / 0.008 | 0.8 / 0.7 |
| ashfield (A4) | 34 / 31 | 0.00 / 0.00 | 37% (37%) / 86% (86%) | 1.28 / 0.23 | 1.30 / 0.24 | 0.087 / 0.016 | 1.0 / 1.0 |
| forge (A4) | 37 / 34 | 0.00 / 0.00 | 80% (80%) / 88% (88%) | 0.40 / 0.17 | 0.42 / 0.15 | 0.035 / 0.012 | 1.0 / 0.9 |

**Bosses** (runs per row: 4 / 6 in Act IV)

| boss | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | kill time (s) W / Wa |
|---|---|---|---|---|---|---|
| the Weaver (A1) | 8 / 7 | 0.00 / 0.00 | 82% (67%) / 90% (85%) | 1.83 / 1.23 | 0.48 / 0.19 | 15 / 9 |
| the Barrow Lord (A1) | 12 / 11 | 0.00 / 0.00 | 85% (67%) / 94% (90%) | 1.01 / 0.56 | 0.32 / 0.14 | 18 / 15 |
| the Stonewarden (A2) | 20 / 18 | 0.00 / 0.00 | 82% (69%) / 93% (93%) | 1.33 / 0.76 | 0.27 / 0.12 | 12 / 10 |
| the Molten King (Durgan) (A2) | 24 / 22 | 0.00 / 0.00 | 91% (82%) / 96% (91%) | 1.66 / 1.54 | 0.35 / 0.24 | 13 / 8 |
| Silverhorn (A3) | 27 / 25 | 0.00 / 0.00 | 91% (65%) / 92% (90%) | 0.68 / 0.84 | 0.10 / 0.11 | 7 / 8 |
| Amaranthe (A3) | 31 / 29 | 0.00 / 0.00 | 79% (58%) / 93% (91%) | 0.49 / 0.32 | 0.28 / 0.12 | 31 / 23 |
| Ivar (A4) | 35 / 32 | 0.00 / 0.00 | 83% (68%) / 77% (54%) | 0.85 / 0.59 | 0.41 / 0.41 | 27 / 35 |
| Karthax (A4) | 39 / 36 | 0.00 / 0.00 | 60% (25%) / 84% (72%) | 3.36 / 1.16 | 2.83 / 0.86 | 49 / 42 |

**Bosses, a weaker player** (PARTIAL pass) (runs per row: 2 / 2 in Act IV)

| boss | lvl W / Wa | deaths W / Wa | min life W / Wa | life/min W / Wa | lives W / Wa | kill time (s) W / Wa |
|---|---|---|---|---|---|---|
| the Weaver (A1) | 7 / 7 | 0.00 / 0.00 | 81% (74%) / 70% (51%) | 3.62 / 1.41 | 1.67 / 0.35 | 26 / 14 |
| the Barrow Lord (A1) | 12 / 11 | 0.00 / 0.00 | 22% (9%) / 84% (77%) | 3.12 / 1.63 | 1.38 / 0.41 | 26 / 15 |
| the Stonewarden (A2) | 19 / 18 | 0.00 / 0.00 | 57% (45%) / 91% (91%) | 2.61 / 1.33 | 0.53 / 0.20 | 12 / 9 |
| the Molten King (Durgan) (A2) | 23 / 22 | 0.00 / 0.00 | 61% (40%) / 85% (83%) | 7.34 / 4.54 | 2.08 / 0.97 | 17 / 12 |
| Silverhorn (A3) | 27 / 25 | 0.00 / 0.00 | 71% (56%) / 91% (82%) | 1.98 / 0.98 | 0.36 / 0.16 | 11 / 8 |
| Amaranthe (A3) | 31 / 28 | 0.00 / 0.00 | 62% (40%) / 93% (92%) | 1.63 / 0.81 | 0.83 / 0.27 | 31 / 20 |
| Ivar (A4) | 34 / 32 | 0.00 / 0.00 | 75% (68%) / 88% (85%) | 1.14 / 0.81 | 0.47 / 0.28 | 25 / 21 |
| Karthax (A4) | 38 / 35 | 0.50 / 0.00 | 31% (7%) / 69% (56%) | 6.29 / 2.97 | 5.28 / 2.13 | 51 / 43 |

## Act over act

Each act's mean over its two zones (or its two bosses), over the act before (II/I, III/II, IV/III). Above 1 = harder (more damage taken) or slower. "all" = the mean of the three classes.

| class / difficulty | walked: lives per zone | walked: life/pack | walked: life/min | walked: deaths per zone (I..IV) | packs: life/pack | packs: s/pack | bosses: lives per fight | bosses: kill time | bosses: deaths (I..IV) |
|---|---|---|---|---|---|---|---|---|---|
| all / Warden | 2.72, 0.45, 1.60 | 2.07, 0.72, 1.46 | 1.85, 0.58, 1.66 | 0.00, 0.00, 0.00, 0.00 | 1.94, 0.81, 0.98 | 1.33, 1.16, 0.70 | 1.16, 0.54, 3.66 | 0.85, 1.19, 1.18 | 0.00, 0.00, 0.00, 0.00 |
| all / Wanderer | 4.90, 0.22, 2.95 | 3.60, 0.34, 2.85 | 2.58, 0.32, 2.88 | 0.00, 0.00, 0.00, 0.00 | 1.94, 0.44, 1.83 | 1.33, 1.21, 0.83 | 1.52, 0.45, 5.16 | 0.88, 1.30, 1.88 | 0.00, 0.00, 0.00, 0.00 |
| warden / Warden | 4.69, 0.50, 0.86 | 3.53, 0.82, 0.76 | 2.72, 0.60, 0.94 | 0.00, 0.00, 0.00, 0.00 | 2.32, 1.23, 0.49 | 1.50, 1.17, 0.62 | 1.07, 0.56, 1.37 | 0.91, 1.09, 0.83 | 0.00, 0.00, 0.00, 0.00 |
| warden / Wanderer | 5.21, 0.18, 2.80 | 3.68, 0.28, 2.76 | 2.68, 0.26, 2.69 | 0.00, 0.00, 0.00, 0.00 | 2.02, 0.31, 2.19 | 1.33, 1.36, 0.82 | 2.04, 0.27, 3.14 | 0.94, 1.09, 1.56 | 0.00, 0.00, 0.00, 0.00 |
| ranger / Warden | 1.70, 0.61, 2.42 | 1.34, 1.02, 2.23 | 1.75, 0.77, 2.11 | 0.00, 0.00, 0.00, 0.00 | 2.04, 0.66, 1.72 | 1.18, 1.11, 0.83 | 1.87, 0.46, 3.92 | 0.76, 1.28, 1.45 | 0.00, 0.00, 0.00, 0.00 |
| ranger / Wanderer | 6.57, 0.43, 2.30 | 5.00, 0.64, 2.13 | 4.43, 0.61, 2.37 | 0.00, 0.00, 0.00, 0.00 | 2.39, 0.51, 2.03 | 1.36, 0.94, 0.87 | 1.56, 0.51, 6.15 | 0.81, 1.77, 2.13 | 0.00, 0.00, 0.00, 0.00 |
| mage / Warden | 2.16, 0.23, 2.63 | 1.65, 0.36, 2.38 | 1.45, 0.40, 2.07 | 0.00, 0.00, 0.00, 0.00 | 1.49, 0.28, 2.73 | 1.06, 1.20, 0.86 | 0.77, 0.61, 8.53 | 0.77, 1.49, 2.01 | 0.00, 0.00, 0.00, 0.00 |
| mage / Wanderer | 3.65, 0.18, 4.38 | 2.83, 0.29, 4.30 | 2.00, 0.25, 3.93 | 0.00, 0.00, 0.00, 0.00 | 1.44, 0.61, 1.25 | 1.29, 1.16, 0.83 | 1.09, 0.64, 5.52 | 0.74, 1.73, 2.45 | 0.00, 0.00, 0.00, 0.00 |

**A weaker player** (sees a telegraph 30% of the time, reacts after 0.7 s, wears the better of 2 drops per slot). PARTIAL: the pass was stopped after 160 of 192 planned runs (every zone walked once; every boss twice, three times for the Warden class), so it is noisier than the main pass:

| class / difficulty | walked: lives per zone | walked: life/min | walked: deaths per zone (I..IV) | bosses: lives per fight | bosses: kill time | bosses: deaths (I..IV) |
|---|---|---|---|---|---|---|
| all / Warden | 1.98, 0.45, 1.50 | 1.16, 0.57, 1.73 | 0.00, 0.00, 0.00, 0.00 | 0.67, 0.57, 3.70 | 0.75, 1.26, 1.41 | 0.06, 0.14, 0.00, 0.08 |
| all / Wanderer | 8.40, 0.26, 1.51 | 3.72, 0.34, 1.89 | 0.00, 0.00, 0.00, 0.00 | 1.23, 0.41, 5.75 | 0.85, 1.29, 1.66 | 0.00, 0.00, 0.00, 0.00 |
| warden / Warden | 2.78, 0.61, 0.66 | 1.43, 0.86, 0.67 | 0.00, 0.00, 0.00, 0.00 | 0.47, 0.62, 1.38 | 0.89, 1.18, 1.01 | 0.17, 0.17, 0.00, 0.00 |
| warden / Wanderer | –, 0.30, 1.08 | –, 0.38, 1.71 | 0.00, 0.00, 0.00, 0.00 | 1.88, 0.20, 2.96 | 0.97, 1.26, 1.12 | 0.00, 0.00, 0.00, 0.00 |
| ranger / Warden | 3.50, 0.15, 10.19 | 1.98, 0.20, 8.61 | 0.00, 0.00, 0.00, 0.00 | 0.83, 0.66, 5.25 | 0.69, 1.32, 1.96 | 0.00, 0.25, 0.00, 0.00 |
| ranger / Wanderer | 1.39, 0.23, 3.94 | 0.78, 0.40, 3.10 | 0.00, 0.00, 0.00, 0.00 | 0.57, 0.97, 7.14 | 0.73, 1.32, 2.61 | 0.00, 0.00, 0.00, 0.00 |
| mage / Warden | 0.86, 0.17, 5.73 | 0.71, 0.27, 4.67 | 0.00, 0.00, 0.00, 0.00 | 0.86, 0.46, 4.83 | 0.55, 1.45, 1.79 | 0.00, 0.00, 0.00, 0.25 |
| mage / Wanderer | 17.50, 0.19, 1.44 | 10.70, 0.28, 1.33 | 0.00, 0.00, 0.00, 0.00 | 1.54, 0.37, 5.60 | 0.71, 1.35, 2.27 | 0.00, 0.00, 0.00, 0.00 |

The per-act values behind them (Warden difficulty, all classes):

- walked, lives per zone: 0.35 / 0.94 / 0.42 / 0.68; life/min: 0.27 / 0.50 / 0.29 / 0.48; min life: 91% / 87% / 87% / 75%
- pack by pack, life/pack: 0.036 / 0.070 / 0.057 / 0.056
- bosses, lives per fight: 0.47 / 0.55 / 0.30 / 1.08; kill time: 33 / 28 / 34 / 40 s; min life: 82% / 75% / 85% / 74%

## Step by step (each zone over the one before, each boss over the one before)

- **warden / Warden**: walked, lives per zone: crypt 0.13, pass 29.43, halls 0.34, weep 1.03, heart 0.89, ashfield 1.65, forge 0.11. Bosses, lives per fight: barrowLord 1.36, stonewarden 0.33, moltenKing 4.70, silverhorn 0.15, amaranthe 3.58, ivar 0.71, karthax 1.48; kill time: barrowLord 1.23, stonewarden 0.55, moltenKing 1.98, silverhorn 0.51, amaranthe 2.21, ivar 0.63, karthax 0.90.
- **warden / Wanderer**: walked, lives per zone: crypt 0.27, pass 15.89, halls 0.53, weep 0.18, heart 1.86, ashfield 2.35, forge 0.84. Bosses, lives per fight: barrowLord 1.27, stonewarden 0.43, moltenKing 7.50, silverhorn 0.13, amaranthe 1.33, ivar 3.50, karthax 0.57; kill time: barrowLord 1.73, stonewarden 0.43, moltenKing 2.48, silverhorn 0.43, amaranthe 2.57, ivar 1.45, karthax 0.50.
- **ranger / Warden**: walked, lives per zone: crypt 0.06, pass 22.50, halls 0.40, weep 1.31, heart 0.64, ashfield 3.97, forge 0.56. Bosses, lives per fight: barrowLord 1.26, stonewarden 0.85, moltenKing 2.93, silverhorn 0.26, amaranthe 1.41, ivar 0.84, karthax 7.00; kill time: barrowLord 1.39, stonewarden 0.52, moltenKing 1.52, silverhorn 0.63, amaranthe 2.36, ivar 0.83, karthax 1.50.
- **ranger / Wanderer**: walked, lives per zone: crypt 0.75, pass 3.67, halls 3.18, weep 0.54, heart 0.05, ashfield 14.00, forge 2.29. Bosses, lives per fight: barrowLord 1.27, stonewarden 0.64, moltenKing 3.33, silverhorn 0.13, amaranthe 4.00, ivar 0.88, karthax 7.79; kill time: barrowLord 1.36, stonewarden 0.58, moltenKing 1.40, silverhorn 0.61, amaranthe 3.99, ivar 0.78, karthax 2.42.
- **mage / Warden**: walked, lives per zone: crypt 0.29, pass 3.76, halls 1.53, weep 0.12, heart 2.17, ashfield 3.00, forge 0.28. Bosses, lives per fight: barrowLord 0.67, stonewarden 0.84, moltenKing 1.30, silverhorn 0.29, amaranthe 2.80, ivar 1.46, karthax 6.90; kill time: barrowLord 1.22, stonewarden 0.68, moltenKing 1.06, silverhorn 0.51, amaranthe 4.71, ivar 0.88, karthax 1.78.
- **mage / Wanderer**: walked, lives per zone: crypt 0.18, pass 14.33, halls 0.70, weep 0.10, heart 3.33, ashfield 1.50, forge 2.80. Bosses, lives per fight: barrowLord 0.74, stonewarden 0.86, moltenKing 2.00, silverhorn 0.46, amaranthe 1.09, ivar 3.42, karthax 2.10; kill time: barrowLord 1.67, stonewarden 0.64, moltenKing 0.85, silverhorn 1.00, amaranthe 2.78, ivar 1.50, karthax 1.22.

## Act IV under-levelled, zones walked (hero at zone level − 3, item level 3 below that)

| class / diff | target | lvl (normal) | deaths | min life (worst) | life/min | lives | time | lives vs the normal level |
|---|---|---|---|---|---|---|---|---|
| warden / Warden | ashfield | 19 (33) | 0.00 | 94% (92%) | 0.15 | 0.28 | 1.9 min | ×0.26 |
| warden / Warden | forge | 22 (37) | 0.00 | 79% (69%) | 0.24 | 0.38 | 1.5 min | ×3.17 |
| warden / Wanderer | ashfield | 19 (32) | 0.00 | 97% (95%) | 0.08 | 0.12 | 1.6 min | ×0.20 |
| warden / Wanderer | forge | 22 (35) | 0.00 | 88% (88%) | 0.36 | 0.56 | 1.5 min | ×1.10 |
| ranger / Warden | ashfield | 19 (34) | 0.00 | 95% (94%) | 0.22 | 0.20 | 0.9 min | ×0.17 |
| ranger / Warden | forge | 22 (37) | 0.00 | 77% (75%) | 0.39 | 0.48 | 1.2 min | ×0.72 |
| ranger / Wanderer | ashfield | 19 (31) | 0.00 | 98% (98%) | 0.06 | 0.06 | 0.9 min | ×0.43 |
| ranger / Wanderer | forge | 22 (34) | 0.00 | 88% (88%) | 0.20 | 0.22 | 1.1 min | ×0.69 |
| mage / Warden | ashfield | 19 (34) | 0.00 | 98% (96%) | 0.18 | 0.18 | 1.0 min | ×0.23 |
| mage / Warden | forge | 22 (37) | 0.00 | 80% (80%) | 0.41 | 0.44 | 1.1 min | ×2.00 |
| mage / Wanderer | ashfield | 19 (31) | 0.00 | 99% (98%) | 0.01 | 0.01 | 1.0 min | ×0.07 |
| mage / Wanderer | forge | 22 (34) | 0.00 | 88% (88%) | 0.20 | 0.20 | 1.0 min | ×0.48 |

## Act IV under-levelled, pack by pack, and the bosses (hero at zone level − 3, item level 3 below that)

| class / diff | target | lvl (normal) | deaths | min life (worst) | life/min | lives | time | lives vs the normal level |
|---|---|---|---|---|---|---|---|---|
| warden / Warden | ashfield | 19 (35) | 0.00 | 89% (84%) | 0.41 | 0.56 | 1.4 min | ×1.30 |
| warden / Warden | forge | 22 (38) | 0.00 | 89% (73%) | 0.29 | 0.24 | 1.0 min | ×0.22 |
| warden / Warden | Ivar | 19 (35) | 0.00 | 97% (90%) | 0.06 | 0.05 | 52s | ×0.10 |
| warden / Warden | Karthax | 22 (39) | 0.00 | 66% (33%) | 0.96 | 1.09 | 76s | ×1.54 |
| warden / Wanderer | ashfield | 19 (32) | 0.00 | 97% (95%) | 0.09 | 0.09 | 1.1 min | ×0.18 |
| warden / Wanderer | forge | 22 (35) | 0.00 | 96% (88%) | 0.38 | 0.32 | 1.1 min | ×1.14 |
| warden / Wanderer | Ivar | 19 (32) | 0.00 | 97% (94%) | 0.11 | 0.10 | 72s | ×0.36 |
| warden / Wanderer | Karthax | 22 (36) | 0.00 | 97% (92%) | 0.10 | 0.06 | 43s | ×0.38 |
| ranger / Warden | ashfield | 19 (34) | 0.00 | 89% (87%) | 0.99 | 0.57 | 0.6 min | ×0.70 |
| ranger / Warden | forge | 22 (38) | 0.00 | 72% (57%) | 2.35 | 0.98 | 0.4 min | ×1.00 |
| ranger / Warden | Ivar | 19 (35) | 0.00 | 90% (78%) | 0.65 | 0.26 | 22s | ×1.00 |
| ranger / Warden | Karthax | 22 (39) | 0.00 | 75% (71%) | 1.87 | 1.39 | 42s | ×0.76 |
| ranger / Wanderer | ashfield | 19 (32) | 0.00 | 95% (91%) | 0.48 | 0.21 | 0.4 min | ×0.48 |
| ranger / Wanderer | forge | 22 (35) | 0.00 | 79% (74%) | 1.58 | 0.68 | 0.5 min | ×1.33 |
| ranger / Wanderer | Ivar | 19 (32) | 0.00 | 94% (93%) | 0.32 | 0.15 | 24s | ×1.07 |
| ranger / Wanderer | Karthax | 22 (36) | 0.00 | 89% (88%) | 1.26 | 0.81 | 39s | ×0.74 |
| mage / Warden | ashfield | 19 (34) | 0.00 | 77% (57%) | 1.18 | 0.49 | 0.4 min | ×1.96 |
| mage / Warden | forge | 22 (38) | 0.00 | 71% (35%) | 2.23 | 0.73 | 0.3 min | ×0.78 |
| mage / Warden | Ivar | 19 (35) | 0.00 | 69% (34%) | 0.88 | 0.66 | 39s | ×1.61 |
| mage / Warden | Karthax | 22 (39) | 0.00 | 63% (45%) | 2.29 | 2.75 | 67s | ×0.97 |
| mage / Wanderer | ashfield | 19 (31) | 0.00 | 92% (85%) | 0.59 | 0.21 | 0.4 min | ×2.10 |
| mage / Wanderer | forge | 22 (35) | 0.00 | 91% (87%) | 1.26 | 0.38 | 0.3 min | ×1.06 |
| mage / Wanderer | Ivar | 19 (32) | 0.00 | 91% (90%) | 0.36 | 0.20 | 31s | ×0.49 |
| mage / Wanderer | Karthax | 22 (36) | 0.00 | 78% (66%) | 1.77 | 1.90 | 64s | ×2.21 |

Under-levelled over normal level, lives lost (mean over classes and difficulties): ashfield walked ×0.23 (median ×0.23); forge walked ×1.36 (median ×1.10); ashfield packs ×1.12 (median ×1.30); forge packs ×0.92 (median ×1.06); ivar ×0.77 (median ×1.00); karthax ×1.10 (median ×0.97). Monsters scale to the hero's level (actors.js monsterLevel: max(zone level, hero level)), so a hero below the zone level meets level-22/25 monsters instead of level-33..39 ones.

## What hurts (Warden difficulty: maximum lives of damage per run by source, the nearest foe at work @ the code that hit; "-" = no foe near: the Forge's Breath, slag, burning)

- weep walked / warden: rootswornArcher @projectiles:157 updateProjs 0.35; amberMoth @boot:271 tick 0.06; amberBear @ai:797 dashStep 0.04; amberBear @ai:542 charger 0.04; hollowed @ai:264 melee 0.03; rootsworn @ai:264 melee 0.03
- weep walked / ranger: hollowed @ai:264 melee 0.23; rootling @projectiles:157 updateProjs 0.05; rootswornArcher @ai:963 fn 0.04; rootswornArcher @projectiles:157 updateProjs 0.04; amberBear @ai:542 charger 0.04; - @projectiles:157 updateProjs 0.02
- weep walked / mage: amberBear @ai:542 charger 0.04; rootswornArcher @projectiles:157 updateProjs 0.04; hollowed @boot:271 tick 0.03; - @combat:335 tickStatus 0; hollowed @combat:335 tickStatus 0
- heart walked / warden: rootswornArcher @projectiles:157 updateProjs 0.28; rootsworn @ai:264 melee 0.1; hollowed @ai:264 melee 0.05; rootsworn @boot:271 tick 0.03; rootling @ai:264 melee 0.03; amberBear @ai:797 dashStep 0.03
- heart walked / ranger: rootswornArcher @boot:271 tick 0.08; rootsworn @ai:264 melee 0.07; mourner @ai:963 fn 0.03; rootling @ai:264 melee 0.03; hollowed @ai:264 melee 0.03; hollowed @projectiles:157 updateProjs 0.02
- heart walked / mage: hollowed @ai:264 melee 0.11; rootswornArcher @projectiles:157 updateProjs 0.06; rootsworn @ai:264 melee 0.06; hollowed @ai:668 tether 0.03; rootling @ai:264 melee 0.01; rootling @ai:512 rootling 0.01
- ashfield walked / warden: ashBow @projectiles:157 updateProjs 0.33; ashDwarf @ai:264 melee 0.18; ashBow @projectiles:226 updateAreas 0.11; lampless @ai:264 melee 0.09; ashBow @boot:271 tick 0.07; ashSpear @ai:264 melee 0.06
- ashfield walked / ranger: ashSpear @ai:264 melee 0.54; ashSpear @boot:271 tick 0.15; ashDwarf @ai:264 melee 0.11; - @boot:271 tick 0.07; ashwing @ai:1681 diver 0.07; ashwing @projectiles:157 updateProjs 0.06
- ashfield walked / mage: - @boot:271 tick 0.47; ashwing @ai:797 dashStep 0.13; smokeEater @boot:271 tick 0.08; - @projectiles:234 updateAreas 0.08; - @combat:335 tickStatus 0.01; smokeEater @combat:335 tickStatus 0.01
- forge walked / warden: hammerhorn @forge:98 burn 0.06; - @forge:98 burn 0.05; hammerhorn @combat:335 tickStatus 0; - @combat:335 tickStatus 0
- forge walked / ranger: hammerhorn @forge:98 burn 0.38; - @forge:98 burn 0.2; ashDwarf @ai:963 fn 0.05; ashDwarf @ai:264 melee 0.04; hammerhorn @combat:335 tickStatus 0.01; - @combat:335 tickStatus 0.01
- forge walked / mage: ashSpear @ai:264 melee 0.12; ashSpear @forge:98 burn 0.1; - @combat:335 tickStatus 0; ashSpear @combat:335 tickStatus 0; - @forge:132 fn 0; - @projectiles:226 updateAreas 0
- Amaranthe / warden: amaranthe @ai:797 dashStep 0.1; amaranthe @ai:1256 fn 0.08; amaranthe @ai:1292 http 0.07; heartroot @ai:1256 fn 0.07; amaranthe @ai:1275 fn 0.06; amaranthe @ai:1389 fn 0.06
- Amaranthe / ranger: amaranthe @ai:1256 fn 0.14; amaranthe @ai:852 http 0.13; amaranthe @ai:1292 http 0.03; hollowed @ai:852 http 0.02
- Amaranthe / mage: amaranthe @ai:1256 fn 0.12; amaranthe @ai:852 http 0.05; amaranthe @ai:1250 fn 0.04; amaranthe @ai:1292 http 0.03; heartroot @ai:852 http 0.03; amaranthe @ai:668 tether 0.01
- Ivar / warden: ivar @ai:2075 fn 0.24; ivar @ai:2085 fn 0.13; ivar @ai:2131 fn 0.04; ivar @ai:2143 http 0.03; lampless @ai:264 melee 0.02; lampless @ai:2075 fn 0.01
- Ivar / ranger: ivar @ai:2075 fn 0.19; ivar @ai:2085 fn 0.04; smokeEater @ai:2143 http 0.02; ivar @ai:2143 http 0.01
- Ivar / mage: ivar @ai:2075 fn 0.23; ivar @ai:2085 fn 0.1; ivar @ai:797 dashStep 0.05; ivar @ai:2143 http 0.03
- Karthax / warden: karthax @ai:2301 fn 0.31; karthax @ai:2320 fn 0.22; karthax @projectiles:226 updateAreas 0.13; karthax @combat:335 tickStatus 0.02; karthax @projectiles:157 updateProjs 0.01; karthax @ai:2386 fn 0.01
- Karthax / ranger: karthax @ai:2320 fn 0.62; karthax @ai:2301 fn 0.52; karthax @projectiles:226 updateAreas 0.52; karthax @combat:335 tickStatus 0.05; - @projectiles:226 updateAreas 0.05; karthax @ai:2386 fn 0.04
- Karthax / mage: karthax @ai:2301 fn 1.08; karthax @ai:2320 fn 0.85; karthax @projectiles:226 updateAreas 0.7; karthax @combat:335 tickStatus 0.09; karthax @ai:2386 fn 0.07; karthax @ai:2397 http 0.03
