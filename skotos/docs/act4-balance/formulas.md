# Skotos: the difficulty curve as formulas, Acts I to IV

The live game (commit 7eded86, the published worktree `scratchpad/pub/skotos`), read and modelled from the code. File:line references point into `src/`. The numbers come from `balance/model.mjs`, run with 20 play-throughs for each class × difficulty × play style (18 configurations, 360 runs). The table is `balance/formulas.json`.

## The answer in short

1. **The hero is never under-levelled, and from the crypt on the zone level does not matter.** A monster's level is `max(zone level, hero level)` (actors.js:137-140). A play-through that clears most of each zone reaches the Field of Ash at level 32.7 (Warden, Warden difficulty), 10.7 levels above its zone level of 22. A hurried play-through (main path only) arrives at 28, 6 above. In Acts II-III the margin at entry was +2.5 to +9.1 (all configurations: +1.1 to +9.6). A hero above the zone level just meets monsters at her own level, so nothing in Act IV is under-levelled. Every act's numbers below are therefore at the hero's level, not at the zone's.
2. **Act IV's packs are not the jump.** At the same hero, the Field of Ash and the Forge cost 0.7× to 1.25× the life a pack that the Weeping Woods and the Heartwood cost, depending on class and difficulty. One blow is about the same size (0.94-1.06×). The level drift from Act III to Act IV (the hero is 4-8 levels higher) makes a blow 13-24% heavier relative to her life, because `monsterDmg` has an `L²` term and her life does not. That is a slope, not a step.
3. **The jump is the Forge, in two places.**
   - **Karthax** costs 2.8-4.9× the life Ivar costs and 2.3-5.6× what Amaranthe costs. His fight is 1.4-3.3× longer, and his biggest blow is 2× theirs (16-34% of the hero's life). On Warden difficulty every class needs more potions than the 18 s potion cooldown allows inside his fight: 4.2-4.8 needed against 3.0-4.1 possible. The only other such fight is the Molten King (Act II), with 3.1-4.1 against 2.0-3.9. It is the same on Wanderer: 1.4-1.5 lives against 0.26-0.41 for Amaranthe.
   - **The Forge's Breath** takes 20% of max life a breath (12% on Wanderer) as *pure* damage: no armour, no block, no level, no gear (forge.js:19, :97). It is 4-12× an ordinary blow in Act IV (1.0-4.9% of life). For a Warden it is bigger than any single blow in Acts I-III (the largest, the Molten King's, is 11.6%); for the ranged classes only the Molten King's biggest blow (21-26%) is larger. With heat 3 the flues breathe every 4.5-5.5 s. A hero who stays in the open there loses 3.6-4.4% of her life a second on Warden difficulty, more than the potion's 3.3%.
4. The other Act IV rules (Shroud ×0.3, the Ash-Fallen shields ×0.15, Seen +15%, Clinging, the Ashwing out of reach, Ashsmith reforging) are inside the pack figures above. They cost the Ranger 6-14% of her damage against spearmen and make a Lampless last 1.7× as long for her (§4). They cost a lot only in Ivar's Dark phase: the Ranger deals ×0.48 and the Mage ×0.55 for 30% of his life.

## 1. Experience and the hero's level

### Formulas

- XP for a kill (combat.js:381-382): `monsterXP(L) × def.xp × D.xp × em`, with `monsterXP(L) = 6 + 2.5 L` (data.js:205), `em` = 1 normal or boss, 1.5 minion, 3 champion, 5 rare. `D.xp` = 0.9 Wanderer, 1 Warden (data.js:5-6). There is no quest XP: `gainXP` is called only from `kill` (combat.js:382, :458).
- To the next level (data.js:204): `xpToNext(L) = round(50 + 45 L^1.45)`. Level cap 50 (data.js:206).
- A monster's level is the hero's level when it spawns (§2), so the XP for a kill grows with the hero. The number of kills a level then grows only slowly, from 28 typical kills at level 10 to 52 at 30 (`def.xp` ≈ 1.5).

| L | xpToNext | monsterXP | kills (def.xp 1.5) a level | monsterHP | monsterDmg | bare life W/R/M | bare dmgMult | rare weapon avg, ilvl L |
|---|---|---|---|---|---|---|---|---|
| 1 | 95 | 8.5 | 7 | 30 | 4.2 | 121/97/87 | 1.11 | 6.4 |
| 4 | 386 | 16 | 16 | 63 | 9.5 | 204/163/147 | 1.20 | 14.6 |
| 10 | 1318 | 31 | 28 | 172 | 23.1 | 369/295/266 | 1.38 | 31.0 |
| 16 | 2557 | 46 | 37 | 339 | 40.7 | 534/427/384 | 1.56 | 47.3 |
| 22 | 4029 | 61 | 44 | 563 | 62.2 | 699/559/503 | 1.74 | 63.7 |
| 25 | 4839 | 68.5 | 47 | 697 | 74.5 | 781/625/563 | 1.83 | 71.9 |
| 30 | 6288 | 81 | 52 | 952 | 97.1 | 919/735/662 | 1.98 | 85.5 |
| 35 | 7850 | 93.5 | 56 | 1247 | 122.5 | 1056/845/761 | 2.13 | 99.1 |
| 40 | 9517 | 106 | 60 | 1582 | 150.6 | 1194/955/860 | 2.28 | 112.8 |

### What a zone holds

The level generators run unchanged in Node (`gen.js`, `gen2.js`, `gen3.js`, `gen4.js`). Each pack `{n, tag, elite}` is spawned exactly as `spawnPack` does it (world.js:269-308):
- the size is `round(n × (0.85 + 0.15 D.elite))` (:271);
- a pack with no elite becomes a champion pack with probability `0.06 D.elite` (:273);
- a champion pack is 3 champions (5 with `horde`) with 2 affixes, plus `n - 4` normals (:284-290);
- a rare pack is 1 rare with 3 affixes, plus 3 minions (6 with `horde`, none for big kinds), plus `n - 5` normals (:291-300);
- the kinds are weighted from `PACKS` (data.js:106-149), with a lead for `PACK_LEAD` tags (data.js:151-163).

Added to that:
- the Heartwood's three thorn-wall Heartroots, each with a Hollowed guard and its rootlings (world.js:436-441, ai.js:686-709);
- the Forge's three Great Bellows, each with two waves of `max(2, round(3(0.85+0.15 D.elite)))` monsters through each of 2 doors and a Smoke-eater (world.js:810-828);
- one reforged foe for 70% of the Ashsmiths (ai.js:1869-1879, ASSUME);
- chests at `ilvl max(zone, hero)` (world.js:333-344);
- each boss's adds (ai.js, see §4).

### The play-throughs

- **normal**: every pack on the main path, plus 90% of the side packs.
- **hurried**: only the packs within a 20 m detour of the main path. The main path is a Dijkstra from the start to the boss in which solid cells cost 6, so runtime gates are crossed.
- Each boss is killed once, with its adds.
- The beacon blessings taken are ember, forge and hart (data.js:165-187); the Crown's Offers are refused.
- Skill points go to the four skills in a fixed order (each skill ranks 1→5, panels.js:275).
- Every drop is rolled with the real `makeItem` (items.js:62-90) and equipped by one of two policies:
  - *best*: the stat sheet's `dps × sqrt(toughness)` (stats.js:33-37);
  - *casual*: by colour and item level only (playthrough.mjs `casualBetter`).

Warden, Warden difficulty, normal, casual gear:

| zone | zone lvl | monsters | packs | XP gained | entry→exit | margin at entry | boss lvl | gear ilvl at boss | gear lag |
|---|---|---|---|---|---|---|---|---|---|
| forest | 1 | 70 | 16 | 4115 | 1→9.2 | +0 | 8 | 3.9 | 3.6 |
| crypt | 4 | 48 | 10 | 6702 | 9.2→13.7 | +5.2 | 12 | 7.8 | 3.6 |
| pass | 10 | 103 | 23 | 17265 | 13.7→20.1 | +3.7 | 19 | 14.4 | 4.4 |
| halls | 13 | 92 | 17 | 20154 | 20.1→24.9 | +7.1 | 23 | 19.8 | 3.4 |
| weep | 16 | 55 | 12 | 15491 | 24.9→28.1 | +8.9 | 27 | 22.6 | 3.6 |
| heart | 19 | 77 | 14 | 27794 | 28.1→32.7 | +9.1 | 31 | 26.4 | 4.3 |
| ashfield | 22 | 51 | 14 | 22854 | 32.7→35.9 | +10.7 | 35 | 30.4 | 4.1 |
| forge | 25 | 87 | 12 | 42465 | 35.9→40.9 | +10.9 | 39 | 33.7 | 4.2 |

The same on Wanderer:

| zone | zone lvl | monsters | packs | XP gained | entry→exit | margin at entry | boss lvl | gear ilvl at boss | gear lag |
|---|---|---|---|---|---|---|---|---|---|
| forest | 1 | 72 | 16 | 3443 | 1→8.6 | +0 | 7 | 3.1 | 3.7 |
| crypt | 4 | 51 | 11 | 5992 | 8.6→13 | +4.6 | 11 | 7.7 | 3.3 |
| pass | 10 | 112 | 25 | 15982 | 13→19.5 | +3 | 19 | 14 | 4 |
| halls | 13 | 89 | 16 | 17572 | 19.5→24 | +6.5 | 23 | 19.2 | 3.4 |
| weep | 16 | 56 | 12 | 13726 | 24→26.8 | +8 | 26 | 21.8 | 3.8 |
| heart | 19 | 80 | 15 | 25240 | 26.8→31.2 | +7.8 | 30 | 24.9 | 4.1 |
| ashfield | 22 | 51 | 14 | 19098 | 31.2→33.9 | +9.2 | 33 | 28.7 | 3.9 |
| forge | 25 | 87 | 12 | 35434 | 33.9→38.3 | +8.9 | 36 | 31.9 | 4.1 |

Warden, Warden difficulty, hurried:

| zone | zone lvl | monsters | packs | XP gained | entry→exit | margin at entry | boss lvl | gear ilvl at boss | gear lag |
|---|---|---|---|---|---|---|---|---|---|
| forest | 1 | 67 | 14 | 3486 | 1→8.6 | +0 | 7 | 3 | 3.4 |
| crypt | 4 | 27 | 5 | 4700 | 8.6→12.5 | +4.6 | 11 | 6.9 | 3.4 |
| pass | 10 | 79 | 17 | 11959 | 12.5→17.5 | +2.5 | 17 | 11 | 4.6 |
| halls | 13 | 27 | 5 | 10989 | 17.5→21.2 | +4.5 | 19 | 14.6 | 4.2 |
| weep | 16 | 33 | 7 | 10507 | 21.2→23.9 | +5.2 | 23 | 17.7 | 4.7 |
| heart | 19 | 52 | 9 | 20544 | 23.9→28 | +4.9 | 26 | 20.6 | 4.9 |
| ashfield | 22 | 24 | 8 | 14933 | 28→30.4 | +6 | 29 | 24.2 | 4.8 |
| forge | 25 | 62 | 6 | 30929 | 30.4→34.9 | +5.4 | 33 | 27 | 4.9 |

All 18 configurations (entry → exit, and the margin over the zone level at entry):

| scenario | forest (1) | crypt (4) | pass (10) | halls (13) | weep (16) | heart (19) | ashfield (22) | forge (25) |
|---|---|---|---|---|---|---|---|---|
| warden/warden/normal-best | 1→9 (+0) | 9→13.6 (+5) | 13.6→20.2 (+3.6) | 20.2→25.3 (+7.2) | 25.3→28.3 (+9.3) | 28.3→32.6 (+9.3) | 32.6→35.7 (+10.6) | 35.7→40.8 (+10.7) |
| warden/warden/normal-casual | 1→9.2 (+0) | 9.2→13.7 (+5.2) | 13.7→20.1 (+3.7) | 20.1→24.9 (+7.1) | 24.9→28.1 (+8.9) | 28.1→32.7 (+9.1) | 32.7→35.9 (+10.7) | 35.9→40.9 (+10.9) |
| warden/warden/hurried-casual | 1→8.6 (+0) | 8.6→12.5 (+4.6) | 12.5→17.5 (+2.5) | 17.5→21.2 (+4.5) | 21.2→23.9 (+5.2) | 23.9→28 (+4.9) | 28→30.4 (+6) | 30.4→34.9 (+5.4) |
| warden/wanderer/normal-best | 1→8.9 (+0) | 8.9→13.2 (+4.9) | 13.2→18.8 (+3.2) | 18.8→23.4 (+5.8) | 23.4→26.6 (+7.4) | 26.6→30.7 (+7.6) | 30.7→33.8 (+8.7) | 33.8→38.2 (+8.8) |
| warden/wanderer/normal-casual | 1→8.6 (+0) | 8.6→13 (+4.6) | 13→19.5 (+3) | 19.5→24 (+6.5) | 24→26.8 (+8) | 26.8→31.2 (+7.8) | 31.2→33.9 (+9.2) | 33.9→38.3 (+8.9) |
| warden/wanderer/hurried-casual | 1→8 (+0) | 8→11.4 (+4) | 11.4→15.9 (+1.4) | 15.9→19.4 (+2.9) | 19.4→21.8 (+3.4) | 21.8→26 (+2.8) | 26→28.4 (+4) | 28.4→32.5 (+3.4) |
| ranger/warden/normal-best | 1→9.2 (+0) | 9.2→13.5 (+5.2) | 13.5→20.2 (+3.5) | 20.2→25 (+7.2) | 25→28.1 (+9) | 28.1→32.9 (+9.1) | 32.9→36.2 (+10.9) | 36.2→40.9 (+11.2) |
| ranger/warden/normal-casual | 1→9.4 (+0) | 9.4→13.6 (+5.4) | 13.6→20.1 (+3.6) | 20.1→25.2 (+7.1) | 25.2→28.5 (+9.2) | 28.5→33.1 (+9.5) | 33.1→36.2 (+11.1) | 36.2→40.8 (+11.2) |
| ranger/warden/hurried-casual | 1→8.1 (+0) | 8.1→11.7 (+4.1) | 11.7→17.3 (+1.7) | 17.3→20.7 (+4.3) | 20.7→23.7 (+4.7) | 23.7→27.7 (+4.7) | 27.7→30.2 (+5.7) | 30.2→34.3 (+5.2) |
| ranger/wanderer/normal-best | 1→8.8 (+0) | 8.8→13.1 (+4.8) | 13.1→19 (+3.1) | 19→23.4 (+6) | 23.4→26.3 (+7.4) | 26.3→30.7 (+7.3) | 30.7→33.6 (+8.7) | 33.6→38.1 (+8.6) |
| ranger/wanderer/normal-casual | 1→8.5 (+0) | 8.5→12.8 (+4.5) | 12.8→18.9 (+2.8) | 18.9→23.5 (+5.9) | 23.5→26.5 (+7.5) | 26.5→30.6 (+7.5) | 30.6→33.3 (+8.6) | 33.3→37.7 (+8.3) |
| ranger/wanderer/hurried-casual | 1→7.7 (+0) | 7.7→11.3 (+3.7) | 11.3→16.5 (+1.3) | 16.5→19.7 (+3.5) | 19.7→22.1 (+3.7) | 22.1→25.9 (+3.1) | 25.9→28.2 (+3.9) | 28.2→32.5 (+3.2) |
| mage/warden/normal-best | 1→9.3 (+0) | 9.3→13.9 (+5.3) | 13.9→20.5 (+3.9) | 20.5→25.4 (+7.5) | 25.4→28.6 (+9.4) | 28.6→33.3 (+9.6) | 33.3→36.4 (+11.3) | 36.4→41.3 (+11.4) |
| mage/warden/normal-casual | 1→9.2 (+0) | 9.2→13.8 (+5.2) | 13.8→20.6 (+3.8) | 20.6→25.4 (+7.6) | 25.4→28.5 (+9.4) | 28.5→33 (+9.5) | 33→36 (+11) | 36→40.7 (+11) |
| mage/warden/hurried-casual | 1→8.5 (+0) | 8.5→12 (+4.5) | 12→17.3 (+2) | 17.3→20.8 (+4.3) | 20.8→23.5 (+4.8) | 23.5→27.7 (+4.5) | 27.7→30.5 (+5.7) | 30.5→34.7 (+5.5) |
| mage/wanderer/normal-best | 1→8.3 (+0) | 8.3→12.8 (+4.3) | 12.8→18.8 (+2.8) | 18.8→23.5 (+5.8) | 23.5→26.2 (+7.5) | 26.2→30.6 (+7.2) | 30.6→33.4 (+8.6) | 33.4→37.7 (+8.4) |
| mage/wanderer/normal-casual | 1→8.4 (+0) | 8.4→12.6 (+4.4) | 12.6→18.7 (+2.6) | 18.7→23.5 (+5.7) | 23.5→26.1 (+7.5) | 26.1→30.4 (+7.1) | 30.4→33.3 (+8.4) | 33.3→37.6 (+8.3) |
| mage/wanderer/hurried-casual | 1→7.7 (+0) | 7.7→11.1 (+3.7) | 11.1→16.1 (+1.1) | 16.1→19.5 (+3.1) | 19.5→21.9 (+3.5) | 21.9→25.9 (+2.9) | 25.9→28.3 (+3.9) | 28.3→32.4 (+3.3) |

**Q1.** No configuration is under-levelled anywhere after the forest:
- Acts I-III: entry margins of +1.1 to +9.6.
- Act IV, normal play: +8.3 to +11.4.
- Act IV, hurried play: +3.2 to +6.0.

Act IV's zones hold fewer monsters than the Heartwood (51-55 in the Field against 74-80), and many of them are Ember Ticks (`def.xp` 0.6). So the hero gains ~3 levels in the Field, against ~4.5 in the Heartwood. She is still above 22/25 by a wider margin than in any earlier act.

## 2. How a monster's level is chosen

- `monsterLevel(base) = max(base, heroLevel + (diff >= 3 ? 2 : 0))` (actors.js:137-140), with `base = G.zone.level` (actors.js:144) from `ZONES` (world.js:32-44: forest 1, crypt 4, pass 10, halls 13, weep 16, heart 19, ashfield 22, forge 25). The level is fixed when the pack spawns (within 32 m of the hero, world.js:249).
- Bosses (world.js:258, story.js:393): `max(zone + 2 (first boss of an act) or + 3, hero + 1)`. That gives Ivar `max(24, hero + 1)` and Karthax `max(28, hero + 1)`.
- Boss adds: `boss level - 2` for Silverhorn, Ivar and Karthax (ai.js:1183, :2110, :2118, :2377), `-1` for Amaranthe's Mourners (:1362). The rest get the zone rule.
- Exceptions:
  - the Forge's slag drips use `monsterDmg(zone.level)` (forge.js:131), so they fall *behind* a hero above level 25;
  - the Breath and the vents are a share of max life (forge.js:97, :157).

**What it does:**
- *Above* the zone level, every monster, every drop (`makeItem(a.level)`, combat.js:400) and every XP reward follows the hero. Over-levelling buys nothing, and under-clearing costs nothing in monster level.
- *Below* it (only a hero who skips most of the forest and the crypt), monsters stay at the zone level. Those levels are 1-25 against a hero who is never below them by the crypt.

The zone levels 22/25 therefore never decide anything in a real play-through. Act IV is as hard as its kinds, its rules and its bosses at the hero's own level.

## 3. The hero's power

### Stats (stats.js:5-42)

- Base:
  - main = `8 + 3L` + gear;
  - vit = `7 + 2L` + gear;
  - crit 5%, crit damage 50%.
- Derived:
  - `lifeMax = (40 + 12L + 5 vit + life) × C.life × (1 + lifePct%)`, with C.life = 1.25 Warden, 1.0 Ranger, 0.9 Mage (data.js:15-17);
  - `armor = (Σ item armour × C.armor + 3L) × (1 + armorPct%)`, with C.armor = 1.3 / 1.0 / 0.85;
  - `dmgMult = (1 + main/100)(1 + dmgPct/100)`;
  - `aps = weapon speed × (1 + atkSpd%)`.
- Damage a blow (combat.js:32-40, :54-55): `rand(wmin, wmax) × dmgMult × skillMult`, then:
  - × `(1 + area%)` for area hits;
  - × 1.3 under the war cry;
  - × `(1 + critD%)` on a crit;
  - × `(1 + eliteDmg%)` on elites and bosses.

  `skillMult = dmg × (1 + 0.15 (rank-1)) × (1 + skill%)` (stats.js:54-57).
- Incoming (combat.js:113-129):
  - block: `block%` of blows ×0.45 (not dots and not the Breath);
  - armour reduction `armor / (armor + 45 L_src + 60)`, where L_src is *the attacker's* level;
  - war cry ×0.77, shrine ×0.6, Seen ×1.15;
  - `o.pure` (the Breath) skips block and armour.
- Healing:
  - regen `s.regen + 0.4% of life` a second (player.js:37);
  - life on hit, once a hit (combat.js:94);
  - potion 60% of life, 18 s cooldown, unlimited (data.js:269, skills.js:432-438);
  - health globes 25% (pickups.js:126-128).

### Gear (items.js)

- Weapon average: `(3.2 + 2.35 ilvl) × q × U(0.92, 1.08)`, with q = 1 / 1.08 / 1.16 / 1.26 by rarity (:75-80).
- Armour: `(4 + 2.6 ilvl) × base × q`, with base: chest 1.6, shield 1.4, helm 0.9, boots 0.7, gloves 0.6 (:81, data.js:218-224).
- Shield block: `12-18%` (:82).
- Affixes: 1-2 (magic), 3-4 (rare), 4 (legendary). Each is `U(r0, r1) + g × (ilvl-1)`. The ones that scale:
  - main +1.6/level;
  - vit +1.4;
  - life +4;
  - armour +3;
  - dmgPct +0.12% (data.js:229-249).
- Rarity odds (items.js:18-28):
  - legendary `0.8% × legMul × (4 elite) × (10 boss)`;
  - rare `9% × (2.5 elite) × (3 boss)`;
  - magic 33%.
- A normal kill drops an item 8.5% × D.loot of the time, a champion 70%, a rare 2-3 items, a boss 4 + floor(D.loot) with a legendary the first time (combat.js:394-403).
- The model's play-throughs find ~220 items in a game, ~15 of them legendary. By Act IV gear lags the hero by 3.6-5.3 item levels with the casual policy, and 6.4-8.1 with the best policy (that one keeps affix-heavy items longer).

Main stat grows ~(3 + 1.6 × number of main affixes) a level, and the weapon grows 2.35 a level. Together hero damage grows ~`L²`, faster than `monsterHP = 22 + 7L + 0.8L²`. Life grows ~linearly (12 + 10/level from vit, plus life and vit affixes) while `monsterDmg = 2.6 + 1.5L + 0.055L²` has an `L²` term. So **over the game the hero kills faster (2.2 s → 0.7 s a typical monster), while one blow grows from 1.6% to 2.2% of a Warden's life** (about twice that for the Ranger and Mage). That is the level drift.

### Skills and the calibrated rotation

The skills are in data.js:22-43 and skills.js:95-390:
- **Warden**:
  - combo 1.15 ×(1, 1, 1.5 area);
  - whirl 0.55 a 0.25 s tick, area;
  - leap 2.6 (stun, breaks shields);
  - quake 4.2 (breaks shields);
  - cry +30% damage, −23% taken for 7 + rank s of every 16 s.
- **Ranger**:
  - bolt 1.0;
  - multi 0.9 × 5-7 bolts;
  - rain 0.6 × 0.42 a 0.25 s tick, area;
  - wolf 0.8 × 0.55 a bite every 0.7 s;
  - pierce 5.0 (breaks shields);
  - energy 16/s + 4 a bolt.
- **Mage**:
  - arcane 1.0 (+3 mana);
  - fireball 2.2 + 30% burn, area;
  - nova 1.6, freeze;
  - chain 1.7 × (1 - 0.06 j) over 4 + rank/2 jumps, stun (breaks shields);
  - meteor 6.0 + 20% burn + fire ground;
  - mana 9/s.

The basic attacks are much quicker than the stat sheet's `aps`. `attackSpeed(base) = clamp(aps/1.15, 0.6, 2.6) × base` (skills.js:75) plays the clip faster, and an action ends at a fraction `cut` of it. So the rotation was **measured in the live game** (`balance/calib.mjs`, a private server, one headless browser). The setup was level 30, a bare rare weapon, every skill at rank 5, and stationary dummies: one for single-target, four in a 1.2 m ring for packs. The results are in weapon units a second (one unit = average weapon roll × dmgMult × crit factor):

| class | basic only | full rotation, 1 target | per target, pack of 4 | basic ÷ aps |
|---|---|---|---|---|
| Warden (aps 1.25) | 2.50 | 4.24 | 5.27 | 1.49 swings |
| Ranger (aps 1.30) | 5.05 | 8.42 | 4.15 | 3.9 bolts |
| Mage (aps 1.15) | 4.82 | 10.76 | 7.08 | 4.2 bolts |

The model keeps these, scaled:
- for skills not yet unlocked or ranked (the formula rotation's ratio, power.mjs `rotationRaw`);
- for attack speed, area% and cooldown reduction.

They are split by how the damage lands:
- plain blows: Warden 1.07, Ranger 3.80 (bolts), Mage 1.30 (arcane);
- area: 0.80 / 1.61 / 5.96;
- shield-breaking: 2.37 / 2.00 / 1.50;
- dots: Mage 2.0;
- the wolf: 1.01.

Assumption P2: a pack's area damage reaches `min(size, 4) × 0.7` members at once, and a pack is never killed quicker than its toughest member alone.

The hero's DPS and EHP at each zone are the first columns of the §5 tables: life, armour reduction, DPS on one target, DPS a target in a pack.

## 4. Monster power

- Life and damage (actors.js:145-151): `monsterHP(L) × def.hp × D.hp` and `monsterDmg(L) × def.dmg × D.dmg`.
  - D = Wanderer 0.65 / 0.55, Warden 1 / 1 (data.js:5-6).
  - Champion ×3 life, ×1.25 damage; rare ×4.2 / ×1.4; minion ×1.3 / ×1.1.
  - Elites move 5% faster; `fast` adds 35% movement but does not shorten the attack cooldown (ai.js:222-230).
- Affixes (actors.js:369, ai.js:942-966): k of the 9, without repeats. k = 2 for champions and 3 for rares below Hero difficulty (world.js:283).
  - armored ×1/0.72 life;
  - shielding immune 2.5 s every 9 s;
  - vampiric heals 2× the damage it deals (combat.js:139);
  - frozen 1.4× every 4.5 s, thunder 1.6× every 3.2 s, molten trail 0.35 a 0.5 s tick and a 2.2× burst on death;
  - expected factors: champions ×1.16 EHP and +0.12 mult/s, rares ×1.25 and +0.18 (power.mjs `affixF`).
- Attack rate (ai.js:222-237): `cd = atkTime × U(0.85, 1.15)` from the start of an attack, so a period is `max(atkTime, clip)`. ATK clips are in ai.js:22-26. Ranged: aim 0.55 s + shot 0.6 s, `cd = atkTime × U(0.9, 1.3)` (ai.js:283-303). Brutes: 0.85-1.1 s wind-up, 1.3 / 1.6× smash and slam (ai.js:342-374).
- ASSUME:
  - a blow lands 80% of the time, a projectile 70%, a telegraphed blow 55%;
  - melee monsters attack 60% of the time, ranged ones 70%;
  - at most 4 melee monsters reach the hero at once;
  - on average 55% of a pack is alive while it is fought (power.mjs `attackOf`, model.mjs P1).

### The kinds, Act III against Act IV (data.js:77-102)

| Act III | hp | dmg | Act IV | hp | dmg | its rule |
|---|---|---|---|---|---|---|
| hollowed | 1.4 | 1.15 | ashSpear | 1.6 | 1.2 | shield: plain blows from the front ×0.15 (combat.js:190-204); bash every 3rd, push 12 |
| rootsworn | 1.2 | 1.15 | ashDwarf | 1.7 | 1.25 | the same shield |
| rootswornArcher | 0.85 | 1.0 | ashBow | 0.9 | 1.0 | fire arrows leave a 1.5 m fire patch |
| rootling | 0.3 | 0.5 | emberTick | 0.35 | 0.6 | leap 0.8×; clings: 0.45× a second and −25% movement (combat.js:233-280, :349); after 3 s a 1.6× burst + 0.6 burn; a roll throws it off |
| mourner | 0.9 | 0.8 | lampless | 1.3 | 1.15 | Shrouded: ×0.3 outside light (combat.js:205-211); an alarm makes the hero Seen, +15% taken for 6 s (combat.js:127, ai.js:1522); ×2 from outside its cone while it is unaware |
| amberMoth | 0.3 | 0.5 | smokeEater | 0.7 | 0.8 | eats lamps first; a grab halves the Cradle's light for 4 s |
| amberBear | 3.2 | 1.8 | ashwing | 2.0 | 1.4 | airborne and untouchable but 2.5 s of a ~9.5 s cycle (×1.25 taken then): ×3.0 in time; dive 1.3× + push 22 |
| rootwarden | 4.5 | 1.6 | hammerhorn | 4.5 | 2.0 | chained 9 m; smash 1.15 / overhead 1.4 / rush 1.3 + push 20; dazed 2.5 s (×1.5) when the chain yanks; free and 25% faster at 40% (ai.js:1884-1975) |
| - | | | ashsmith | 1.1 | 1.0 | rivets 1.0× every 1.8 s; reforges a fallen foe in 2.2 s: the same kind, ×1.4 life, armoured (ai.js:1869-1879) |

Weighted by what a zone holds, at the same level, the content view (§5.2) gives:
- **mean `def.hp`**: Heartwood 1.57, Field 1.42, Forge 1.51;
- **mean `def.dmg`**: 1.00, 0.98, 1.02.

Act IV's kinds are not heavier than Act III's.

### Act IV's special multipliers, in formulas

- **Light and Shroud** (light.js:18-48, combat.js:205-211):
  - the Shrouded (the Lampless; Ivar in his Dark; Karthax in his Last Fire) take ×0.3 unless *the target* stands in light;
  - light sources: the hero's Cradle ring (6 m, 9 m swollen, 2.5 m near Ivar in his Dark, 0 in Karthax's Last Fire), lit lamps and braziers (6-8 m), fire areas (+1.5 m), pools (Ashwing coal 4 m, Isarn's lantern 6 m, the ghosts 4 m);
  - a lit hit reveals the target for 3 s.

  ASSUME the target is lit 100% of the time for the Warden (melee), 40% for the Ranger and 65% for the Mage (her fire lights). That makes the Lampless' EHP ×1, ×1.72 and ×1.32.
- **Shields** (combat.js:190-204): ASSUME the shield faces the hero 75% of the time and is up 40% (Warden), 50% (Ranger) or 25% (Mage) of it. A spearman then lets through 94% of the Warden's single-target damage, 86% of the Ranger's and 98% of the Mage's, and 100% / 94% / ~100% in packs.
- **Seen**: ×1.15 taken for 6 s after an alarm. Ivar's Lantern Sweep (cd 7-8 s) keeps the hero Seen ~75% of his fight.
- **Clinging**: one tick left on for 3 s does `(0.45 × 3 + 1.6 + 0.6) × 0.6 × monsterDmg(L) = 2.1 × monsterDmg(L)`. Two ticks are like two extra spearmen. A roll every 1.6-3 s (data.js:45) cuts it to a third. The model uses the rolled case.
- **The Forge's Breath** (forge.js:19-99):
  - a 2.0 s inhale, then a fire front for 20% of max life (12% Wanderer), pure, plus a 3% burn;
  - period `max(4.5, (10, or 5 while a Hammerhorn pumps) − 1.5 × heat)` (forge.js:37), with heat 0-3 from the Great Bellows;
  - cover is anything solid between the mouth and the hero;
  - vents in a woken bellows chamber: 10% / 7% every 12 s (forge.js:137-158);
  - slag drips: `monsterDmg(25) × D.dmg` near lava every 5-9 s (forge.js:108-134).

  ASSUME, in a gallery, one breath in three catches the hero: about 1% of life a second, on top of any pack. An Act IV pack costs a Warden 1.3-1.6% a second.
- **Reforge**: ×1.4 life, armoured (×1/0.72) and a second XP reward. 70% of Ashsmiths are assumed to get one in.

### The bosses (ai.js), as the model encodes them

- `basic` is one combo: its mults (burns folded in) and the seconds it takes.
- `specials` are mult / cooldown by phase. In the last phase cooldowns run ×1.25 faster (ai.js:1431).
- ASSUME:
  - the hero lands blows 75% of a fight;
  - a combo lands 60% on a Warden and 35% on a ranged hero;
  - a telegraphed special lands 30% (Karthax's cage Hammerfall 50%: the hero has to bait it beside a statue);
  - the boss spends 60% of its time on its combo.

| boss | def hp / dmg | basic | specials (mult / cd) | phases and locks |
|---|---|---|---|---|
| Amaranthe (ai.js:1215-1281) | 80 / 2.5 | spear 1, 1, then a 1.5 lunge, in 2.9 s | briar 1.1 / 6-4, tears 1.0 / 8, storm 1.4 / 7 (p3), flood 1.4 / 15 (p3), song 0.6 + root | rooted phase fed by 4 Heartroots (9% each) |
| Ivar (ai.js:1998-2160) | 58 / 2.3 | staff 1 + 1 in 2.1 s | sweep 1.0 + Seen / 8-7, road 1.4 / 9 (twice in p3), dark step 1.5 / 9, lanterns 1.0 / 11, nova 1.6 / 12 | the Dark (60-30%): Shrouded, Cradle 2.5 m; three braziers lit at once daze 4 s; p3: three 2 s dazes (×1.5) |
| Karthax (ai.js:2167-2430) | **95 / 2.7** | ember combo 1, 1, 1.4, each +0.4 burn, in 3.15 s | hammerfall 1.5 + 0.5 burn + stun / 9-5-8; **tongs 1.8 + 0.6** / 12; **gaze 1.6 + 0.6** / 9-8; kneel 1.0 + root; molten rain 1.1 / 10; **the Dark 2.0 + 0.5** / 15; ash breath 1.2 / 10 | the cages: locked at 65% for ~21-30 s whatever the hero's damage, then life drops to 29.9% (ai.js:2209, :2269-2271); the Last Fire: Shrouded, no Cradle (0 m), lit only by Isarn's lantern and four 4 m pools (ASSUME lit 80%); host: 2 spearmen + a bowman / 22 s |

Karthax has 19% more life than Amaranthe and 64% more than Ivar, plus a 25 s lock. His specials are 2.0-2.5× blows on a 9-15 s rhythm. Ivar's are 1.0-1.6×, Amaranthe's 1.0-1.4×.

## 5. The tables

How to read them:
- *s to kill one*: a typical monster, alone, on the hero's single-target rotation.
- *s to kill a pack*: the pack's mean, pack by pack.
- *hit % of life*: one ordinary blow after armour and block.
- *pack DPS on hero*: what is landing on the hero while the pack is fought.
- *life lost a pack*: pack DPS × s to kill a pack ÷ life, with no regen and no potions. *p90* is the 90th-percentile pack.
- *zone life lost*: the sum over the zone, in lives. All figures are medians over 20 play-throughs, normal play with casual gear.

### 5.1 Each zone, each class, Warden and Wanderer

**warden/warden/normal-casual** (play-through: monsters at the hero's level)

| zone | hero lvl | life | armour red. % | hero DPS 1 target | DPS/target in pack | typical monster EHP | s to kill one | pack size | s to kill a pack | s for an elite pack | hit % of life | pack DPS on hero | s for a pack to kill her | life lost a pack | p90 | zone life lost (lives) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| forest | 4.2 | 315 | 25 | 59 | 81 | 99 | 2.19 | 4.5 | 5.12 | 11.83 | 1.79 | 5.3 | 53 | 0.102 | 0.166 | 1.68 |
| crypt | 10.3 | 771 | 33 | 223 | 299 | 206 | 0.93 | 5 | 1.59 | 3.13 | 1.61 | 11.9 | 65.2 | 0.03 | 0.071 | 0.29 |
| pass | 16.1 | 1241 | 35.1 | 615 | 775 | 693 | 1.18 | 4.5 | 3 | 6.92 | 1.78 | 17.9 | 62 | 0.05 | 0.129 | 1.18 |
| halls | 21.5 | 1688 | 36.1 | 1106 | 1468 | 933 | 0.84 | 5.5 | 1.72 | 3.34 | 1.73 | 29.4 | 58.6 | 0.033 | 0.09 | 0.51 |
| weep | 25.6 | 1952 | 38.1 | 1737 | 2335 | 992 | 0.58 | 4.6 | 1.12 | 1.81 | 1.65 | 27.9 | 71.4 | 0.017 | 0.037 | 0.21 |
| heart | 29.4 | 2192 | 37.9 | 2017 | 2706 | 1557 | 0.72 | 4.6 | 1.26 | 1.57 | 1.92 | 34 | 62.6 | 0.019 | 0.038 | 0.34 |
| ashfield | 33.4 | 2367 | 38 | 2568 | 3372 | 1999 | 0.72 | 3.8 | 1.05 | 1.66 | 2.18 | 37.2 | 63.4 | 0.017 | 0.049 | 0.24 |
| forge | 37.1 | 2766 | 38.2 | 3129 | 4243 | 2100 | 0.7 | 4.7 | 1.27 | 2.11 | 2.25 | 44.4 | 61.7 | 0.021 | 0.056 | 0.39 |

**warden/wanderer/normal-casual** (play-through: monsters at the hero's level)

| zone | hero lvl | life | armour red. % | hero DPS 1 target | DPS/target in pack | typical monster EHP | s to kill one | pack size | s to kill a pack | s for an elite pack | hit % of life | pack DPS on hero | s for a pack to kill her | life lost a pack | p90 | zone life lost (lives) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| forest | 4 | 304 | 26 | 46.5 | 64 | 57 | 1.47 | 4.6 | 3.42 | 8.03 | 1.02 | 2.8 | 97.7 | 0.035 | 0.068 | 0.56 |
| crypt | 9.7 | 682 | 34.4 | 208 | 291 | 133 | 0.79 | 5.1 | 1.3 | 1.95 | 0.92 | 6.3 | 120 | 0.013 | 0.025 | 0.12 |
| pass | 15.5 | 1149 | 35.8 | 538 | 725 | 415 | 0.78 | 4.6 | 1.98 | 4.87 | 0.9 | 9.7 | 122 | 0.017 | 0.037 | 0.41 |
| halls | 20.6 | 1579 | 37.5 | 1079 | 1386 | 567 | 0.54 | 5.5 | 1.04 | 1.7 | 0.93 | 14.3 | 108 | 0.013 | 0.033 | 0.2 |
| weep | 24.6 | 1783 | 38.7 | 1539 | 1933 | 553 | 0.38 | 4.7 | 0.85 | 1.85 | 0.89 | 14.1 | 134 | 0.007 | 0.016 | 0.09 |
| heart | 27.9 | 2195 | 38.4 | 1900 | 2873 | 921 | 0.47 | 4.5 | 0.81 | 1.17 | 1.06 | 17.9 | 117 | 0.007 | 0.012 | 0.12 |
| ashfield | 31.8 | 2568 | 37.4 | 2589 | 3693 | 1058 | 0.4 | 3.7 | 0.53 | 0.98 | 1.03 | 18.5 | 125 | 0.005 | 0.014 | 0.08 |
| forge | 34.8 | 2678 | 38.2 | 3095 | 4262 | 1218 | 0.39 | 4.7 | 0.74 | 1.1 | 1.18 | 22.1 | 118 | 0.006 | 0.018 | 0.11 |

**ranger/warden/normal-casual** (play-through: monsters at the hero's level)

| zone | hero lvl | life | armour red. % | hero DPS 1 target | DPS/target in pack | typical monster EHP | s to kill one | pack size | s to kill a pack | s for an elite pack | hit % of life | pack DPS on hero | s for a pack to kill her | life lost a pack | p90 | zone life lost (lives) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| forest | 4.3 | 242 | 16.8 | 98.5 | 48.5 | 92.5 | 1.82 | 4.6 | 6.83 | 15.24 | 2.9 | 7 | 32.5 | 0.22 | 0.366 | 3.65 |
| crypt | 10.4 | 656 | 27.1 | 439 | 211 | 212 | 0.46 | 5 | 1.79 | 2.89 | 2.56 | 15.9 | 40.9 | 0.057 | 0.132 | 0.57 |
| pass | 16.3 | 1027 | 28.5 | 1103 | 563 | 681 | 0.63 | 4.7 | 3.28 | 7.19 | 2.73 | 26.4 | 38.3 | 0.086 | 0.208 | 2.13 |
| halls | 21.7 | 1254 | 29.1 | 2270 | 1138 | 917 | 0.41 | 5.4 | 1.61 | 2.92 | 3.33 | 43.5 | 29.7 | 0.061 | 0.162 | 0.91 |
| weep | 26.1 | 1630 | 29.3 | 3189 | 1619 | 1157 | 0.36 | 4.6 | 1.27 | 2.23 | 3.27 | 43.1 | 35.9 | 0.039 | 0.102 | 0.47 |
| heart | 29.6 | 1752 | 31.4 | 3734 | 1890 | 1570 | 0.38 | 4.5 | 1.23 | 2.02 | 3.64 | 52.8 | 33.5 | 0.041 | 0.103 | 0.82 |
| ashfield | 33.9 | 2012 | 31.1 | 4933 | 2497 | 1833 | 0.41 | 3.7 | 1.33 | 2.56 | 3.83 | 56.3 | 36 | 0.045 | 0.108 | 0.63 |
| forge | 37.2 | 2314 | 30.9 | 6135 | 3284 | 1990 | 0.34 | 4.8 | 1.43 | 2.67 | 4.21 | 67.5 | 32.7 | 0.047 | 0.107 | 0.8 |

**ranger/wanderer/normal-casual** (play-through: monsters at the hero's level)

| zone | hero lvl | life | armour red. % | hero DPS 1 target | DPS/target in pack | typical monster EHP | s to kill one | pack size | s to kill a pack | s for an elite pack | hit % of life | pack DPS on hero | s for a pack to kill her | life lost a pack | p90 | zone life lost (lives) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| forest | 4 | 228 | 15.6 | 77.5 | 39 | 54 | 1.25 | 4.7 | 4.47 | 12.31 | 1.63 | 3.6 | 61.1 | 0.078 | 0.113 | 1.21 |
| crypt | 9.8 | 571 | 26.1 | 368 | 180 | 123 | 0.34 | 5.1 | 1.43 | 2.37 | 1.45 | 8 | 71.3 | 0.021 | 0.046 | 0.22 |
| pass | 15.3 | 918 | 27.1 | 1112 | 559 | 429 | 0.39 | 4.6 | 2 | 4.5 | 1.56 | 13.8 | 67.8 | 0.032 | 0.066 | 0.73 |
| halls | 20.1 | 1315 | 30 | 2254 | 1107 | 546 | 0.24 | 5.4 | 1 | 1.58 | 1.55 | 21.2 | 64.4 | 0.019 | 0.05 | 0.32 |
| weep | 24.3 | 1578 | 31.5 | 2738 | 1387 | 633 | 0.23 | 4.6 | 0.81 | 1.52 | 1.61 | 22.2 | 75.5 | 0.013 | 0.034 | 0.14 |
| heart | 27.4 | 1816 | 29.4 | 3503 | 1743 | 913 | 0.25 | 4.6 | 0.83 | 1.31 | 1.83 | 26.8 | 67.7 | 0.014 | 0.031 | 0.23 |
| ashfield | 31.1 | 2076 | 30.9 | 4657 | 2403 | 1007 | 0.21 | 3.8 | 0.72 | 1.28 | 1.83 | 26.8 | 78.6 | 0.012 | 0.029 | 0.17 |
| forge | 34.3 | 2102 | 31.4 | 5802 | 2919 | 1127 | 0.2 | 4.7 | 0.85 | 1.72 | 2.04 | 33 | 65.3 | 0.014 | 0.037 | 0.24 |

**mage/warden/normal-casual** (play-through: monsters at the hero's level)

| zone | hero lvl | life | armour red. % | hero DPS 1 target | DPS/target in pack | typical monster EHP | s to kill one | pack size | s to kill a pack | s for an elite pack | hit % of life | pack DPS on hero | s for a pack to kill her | life lost a pack | p90 | zone life lost (lives) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| forest | 4.2 | 233 | 15.3 | 155 | 95.5 | 87 | 0.85 | 4.9 | 3.42 | 6.76 | 3.21 | 7 | 30.3 | 0.124 | 0.214 | 1.92 |
| crypt | 10.4 | 580 | 23.6 | 707 | 463 | 203 | 0.32 | 5.4 | 0.94 | 1.45 | 2.96 | 16.9 | 35.1 | 0.036 | 0.058 | 0.39 |
| pass | 16.5 | 896 | 26.6 | 1835 | 1236 | 705 | 0.39 | 4.5 | 1.61 | 3.52 | 3.36 | 28.1 | 33.4 | 0.055 | 0.121 | 1.25 |
| halls | 21.9 | 1167 | 26.4 | 2783 | 1830 | 903 | 0.34 | 5.5 | 0.99 | 1.71 | 3.89 | 45.6 | 25.5 | 0.048 | 0.128 | 0.8 |
| weep | 26.2 | 1465 | 28 | 4413 | 3002 | 1098 | 0.22 | 4.7 | 0.73 | 1.48 | 3.81 | 45.2 | 32.1 | 0.026 | 0.071 | 0.34 |
| heart | 29.8 | 1595 | 27.9 | 5599 | 3848 | 1611 | 0.26 | 4.5 | 0.7 | 0.99 | 4.56 | 54.6 | 29.1 | 0.025 | 0.053 | 0.38 |
| ashfield | 33.6 | 1941 | 27.4 | 6931 | 4692 | 1895 | 0.24 | 3.8 | 0.63 | 1.04 | 4.67 | 59.5 | 31.4 | 0.026 | 0.068 | 0.35 |
| forge | 37 | 2019 | 27.9 | 9155 | 6153 | 2030 | 0.23 | 4.8 | 0.76 | 1.37 | 4.87 | 72.3 | 27.9 | 0.029 | 0.084 | 0.52 |

**mage/wanderer/normal-casual** (play-through: monsters at the hero's level)

| zone | hero lvl | life | armour red. % | hero DPS 1 target | DPS/target in pack | typical monster EHP | s to kill one | pack size | s to kill a pack | s for an elite pack | hit % of life | pack DPS on hero | s for a pack to kill her | life lost a pack | p90 | zone life lost (lives) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| forest | 3.9 | 226 | 14.1 | 155 | 97 | 53.5 | 0.51 | 4.7 | 2.16 | 5.38 | 1.8 | 3.9 | 53 | 0.042 | 0.065 | 0.64 |
| crypt | 9.6 | 503 | 22.6 | 505 | 332 | 111 | 0.24 | 5 | 0.7 | 0.98 | 1.65 | 8.3 | 60.9 | 0.014 | 0.027 | 0.14 |
| pass | 15.2 | 844 | 24.4 | 1402 | 923 | 375 | 0.27 | 4.6 | 1.08 | 2.23 | 1.74 | 13.8 | 61.5 | 0.019 | 0.044 | 0.45 |
| halls | 20.2 | 1157 | 26.6 | 2523 | 1709 | 528 | 0.22 | 5.5 | 0.65 | 1.06 | 1.87 | 21.3 | 52.8 | 0.013 | 0.035 | 0.2 |
| weep | 24.1 | 1320 | 26.4 | 3337 | 2248 | 592 | 0.18 | 4.5 | 0.56 | 1.18 | 1.94 | 21.4 | 61.5 | 0.01 | 0.028 | 0.12 |
| heart | 27.1 | 1449 | 26.1 | 4309 | 2941 | 871 | 0.2 | 4.4 | 0.54 | 0.71 | 2.43 | 26.8 | 54.4 | 0.009 | 0.021 | 0.17 |
| ashfield | 30.8 | 1730 | 25.9 | 6027 | 4082 | 1255 | 0.19 | 3.8 | 0.55 | 0.95 | 2.41 | 30 | 54.4 | 0.011 | 0.029 | 0.14 |
| forge | 34.2 | 1859 | 27.4 | 7573 | 5006 | 1225 | 0.17 | 4.8 | 0.55 | 0.86 | 2.65 | 34.3 | 52.6 | 0.011 | 0.032 | 0.21 |

### 5.2 Content only: the same hero against every zone

The hero is as she was at Amaranthe. Every zone's monsters are taken at her level and bosses one above. This removes the level drift, so what is left is the kinds, the rules and the elites.

**warden/warden/normal-casual**, content view (the same hero, as at Amaranthe, against every zone's monsters at her level)

| zone | def hp × | def dmg × | elite share of EHP | s to kill one | s to kill a pack | hit % of life | pack DPS | life lost a pack | p90 | elite pack |
|---|---|---|---|---|---|---|---|---|---|---|
| forest | 1.2 | 0.85 | 0.58 | 0.5 | 1.14 | 1.71 | 40 | 0.02 | 0.028 | 0.044 |
| crypt | 1.14 | 0.98 | 0.38 | 0.51 | 0.87 | 1.98 | 42.3 | 0.017 | 0.033 | 0.032 |
| pass | 1.67 | 0.96 | 0.67 | 0.83 | 2.04 | 2 | 41.3 | 0.039 | 0.086 | 0.078 |
| halls | 1.31 | 1.04 | 0.42 | 0.8 | 1.39 | 2 | 47.4 | 0.032 | 0.079 | 0.06 |
| weep | 1.32 | 0.91 | 0.45 | 0.57 | 1.17 | 1.83 | 36.4 | 0.021 | 0.042 | 0.049 |
| heart | 1.57 | 1 | 0.34 | 0.75 | 1.39 | 1.99 | 35.5 | 0.023 | 0.042 | 0.035 |
| ashfield | 1.42 | 0.98 | 0.59 | 0.76 | 1.04 | 1.98 | 31.4 | 0.016 | 0.045 | 0.041 |
| forge | 1.51 | 1.02 | 0.29 | 0.7 | 1.33 | 1.99 | 33 | 0.02 | 0.047 | 0.051 |

**ranger/warden/normal-casual**, content view (the same hero, as at Amaranthe, against every zone's monsters at her level)

| zone | def hp × | def dmg × | elite share of EHP | s to kill one | s to kill a pack | hit % of life | pack DPS | life lost a pack | p90 | elite pack |
|---|---|---|---|---|---|---|---|---|---|---|
| forest | 1.2 | 0.84 | 0.62 | 0.28 | 1.37 | 3.19 | 59.2 | 0.048 | 0.082 | 0.098 |
| crypt | 1.12 | 0.96 | 0.44 | 0.27 | 0.96 | 3.58 | 63.7 | 0.037 | 0.075 | 0.066 |
| pass | 1.64 | 0.96 | 0.61 | 0.44 | 2.31 | 3.54 | 63.9 | 0.076 | 0.167 | 0.169 |
| halls | 1.3 | 1.02 | 0.36 | 0.4 | 1.52 | 3.87 | 68.6 | 0.071 | 0.158 | 0.112 |
| weep | 1.36 | 0.92 | 0.5 | 0.33 | 1.13 | 3.5 | 55.8 | 0.041 | 0.096 | 0.097 |
| heart | 1.56 | 1.01 | 0.33 | 0.39 | 1.27 | 3.79 | 54.5 | 0.042 | 0.099 | 0.087 |
| ashfield | 1.42 | 0.99 | 0.52 | 0.46 | 1.36 | 3.68 | 48.1 | 0.046 | 0.121 | 0.12 |
| forge | 1.37 | 1.01 | 0.16 | 0.37 | 1.52 | 3.84 | 49.5 | 0.046 | 0.098 | 0.164 |

**mage/warden/normal-casual**, content view (the same hero, as at Amaranthe, against every zone's monsters at her level)

| zone | def hp × | def dmg × | elite share of EHP | s to kill one | s to kill a pack | hit % of life | pack DPS | life lost a pack | p90 | elite pack |
|---|---|---|---|---|---|---|---|---|---|---|
| forest | 1.11 | 0.83 | 0.6 | 0.17 | 0.64 | 3.74 | 63.7 | 0.023 | 0.035 | 0.049 |
| crypt | 1.08 | 0.96 | 0.4 | 0.18 | 0.51 | 4.17 | 68.2 | 0.022 | 0.04 | 0.038 |
| pass | 1.64 | 0.97 | 0.66 | 0.27 | 1.07 | 4.01 | 65 | 0.039 | 0.094 | 0.09 |
| halls | 1.24 | 0.99 | 0.41 | 0.25 | 0.76 | 4.32 | 71.9 | 0.037 | 0.092 | 0.063 |
| weep | 1.3 | 0.93 | 0.45 | 0.2 | 0.59 | 4.07 | 57.3 | 0.026 | 0.073 | 0.064 |
| heart | 1.6 | 1.01 | 0.33 | 0.26 | 0.71 | 4.42 | 56.6 | 0.025 | 0.05 | 0.048 |
| ashfield | 1.41 | 0.98 | 0.47 | 0.25 | 0.62 | 4.38 | 52 | 0.024 | 0.068 | 0.054 |
| forge | 1.46 | 1.02 | 0.3 | 0.23 | 0.78 | 4.42 | 54.5 | 0.028 | 0.074 | 0.082 |

**warden/wanderer/normal-casual**, content view (the same hero, as at Amaranthe, against every zone's monsters at her level)

| zone | def hp × | def dmg × | elite share of EHP | s to kill one | s to kill a pack | hit % of life | pack DPS | life lost a pack | p90 | elite pack |
|---|---|---|---|---|---|---|---|---|---|---|
| forest | 1.15 | 0.85 | 0.61 | 0.31 | 0.72 | 0.91 | 20.7 | 0.007 | 0.01 | 0.018 |
| crypt | 1.16 | 0.98 | 0.45 | 0.35 | 0.56 | 1.08 | 24 | 0.007 | 0.014 | 0.012 |
| pass | 1.6 | 0.97 | 0.66 | 0.5 | 1.15 | 1.03 | 21.3 | 0.011 | 0.026 | 0.026 |
| halls | 1.36 | 0.99 | 0.48 | 0.44 | 0.78 | 1.07 | 23.5 | 0.01 | 0.029 | 0.019 |
| weep | 1.11 | 0.87 | 0.41 | 0.33 | 0.71 | 0.95 | 18.6 | 0.007 | 0.013 | 0.02 |
| heart | 1.58 | 1.04 | 0.31 | 0.46 | 0.84 | 1.1 | 19.3 | 0.007 | 0.014 | 0.014 |
| ashfield | 1.37 | 0.96 | 0.45 | 0.42 | 0.55 | 1.03 | 16.9 | 0.006 | 0.016 | 0.013 |
| forge | 1.44 | 1.02 | 0.24 | 0.42 | 0.76 | 1.09 | 17.3 | 0.007 | 0.015 | 0.017 |

### 5.3 Each boss, each class, Warden and Wanderer

*s to kill (adds)* includes the time spent on the adds it calls. *potions needed / possible* is life lost beyond regen ÷ 60% against 1 + fight / 18 s. The last column is the content view.

**warden/warden/normal-casual**

| boss | lvl | life | hero DPS | s to kill (adds) | boss+adds DPS on hero | s to kill her | life lost (lives) | potions needed / possible | a combo blow % | biggest blow % | content view: s / lives |
|---|---|---|---|---|---|---|---|---|---|---|---|
| weaver | 8 | 4910 | 106 | 64.7 (2.8) | 13.3 | 41.2 | 1.8 | 1.9 / 4.6 | 3.9 | 5.8 | 19.3 / 0.54 |
| barrowLord | 12 | 12166 | 324 | 58.9 (4.1) | 34.3 | 24.9 | 2.67 | 3.1 / 4.3 | 3.9 | 6.3 | 28.7 / 1.49 |
| stonewarden | 19 | 20415 | 817 | 35.8 (0) | 26.5 | 51.3 | 0.7 | 0.5 / 3 | 3.9 | 6.2 | 23 / 0.56 |
| moltenKing | 23 | 43646 | 1306 | 51.9 (2.5) | 107 | 17.2 | 2.77 | 4.1 / 3.9 | 4.5 | 11.6 | 37.7 / 2.94 |
| silverhorn | 27 | 41298 | 2300 | 25.7 (0.7) | 50.9 | 40.2 | 0.65 | 0.7 / 2.4 | 4.1 | 6.2 | 26.8 / 0.83 |
| amaranthe | 31 | 80624 | 2772 | 40.2 (0.2) | 71.9 | 31.6 | 1.41 | 1.5 / 3.2 | 5.3 | 7.4 | 40.2 / 1.41 |
| ivar | 35 | 72326 | 3357 | 30.5 (0.7) | 98.3 | 25.8 | 1.16 | 1.7 / 2.7 | 5.3 | 8.4 | 30.9 / 1.23 |
| karthax | 39 | 143621 | 4295 | 56.1 (0.7) | 157 | 17.3 | 3.25 | 4.3 / 4.1 | 6.5 | 16.3 | 59 / 3.15 |

**warden/wanderer/normal-casual**

| boss | lvl | life | hero DPS | s to kill (adds) | boss+adds DPS on hero | s to kill her | life lost (lives) | potions needed / possible | a combo blow % | biggest blow % | content view: s / lives |
|---|---|---|---|---|---|---|---|---|---|---|---|
| weaver | 7 | 2722 | 79 | 49.2 (1.6) | 6.5 | 76.7 | 0.61 | 0.6 / 3.7 | 2.1 | 3.2 | 11.5 / 0.15 |
| barrowLord | 11 | 7000 | 269 | 41.2 (2) | 18.4 | 45.6 | 1 | 0.7 / 3.3 | 2.2 | 3.5 | 16.9 / 0.42 |
| stonewarden | 19 | 13270 | 776 | 22.1 (0) | 13.9 | 97.1 | 0.22 | 0 / 2.2 | 2 | 3.2 | 13.8 / 0.16 |
| moltenKing | 23 | 28370 | 1342 | 27.2 (1) | 55.8 | 28.8 | 1.04 | 1.2 / 2.5 | 2.5 | 6.6 | 22.2 / 0.84 |
| silverhorn | 26 | 25174 | 2031 | 17.3 (0.3) | 26.9 | 70.1 | 0.28 | 0.1 / 2 | 2.3 | 3.4 | 15.9 / 0.24 |
| amaranthe | 30 | 49504 | 2743 | 24.1 (0.1) | 37.5 | 59.4 | 0.41 | 0.2 / 2.3 | 2.9 | 4.1 | 24.1 / 0.41 |
| ivar | 33 | 42382 | 3441 | 18.3 (0.2) | 49.5 | 51.8 | 0.39 | 0.3 / 2 | 2.6 | 4.2 | 18.4 / 0.35 |
| karthax | 36 | 80942 | 4156 | 44.3 (0.3) | 78.3 | 35.1 | 1.39 | 1.6 / 3.5 | 3.3 | 8.3 | 45.2 / 1.31 |

**ranger/warden/normal-casual**

| boss | lvl | life | hero DPS | s to kill (adds) | boss+adds DPS on hero | s to kill her | life lost (lives) | potions needed / possible | a combo blow % | biggest blow % | content view: s / lives |
|---|---|---|---|---|---|---|---|---|---|---|---|
| weaver | 8 | 4910 | 194 | 39.5 (2.7) | 13.7 | 27.6 | 1.46 | 2 / 3.2 | 6.7 | 10 | 10.4 / 0.42 |
| barrowLord | 12 | 12166 | 563 | 35.5 (3.6) | 37.5 | 19.5 | 1.69 | 2.4 / 3 | 5.9 | 9.4 | 15.5 / 1.16 |
| stonewarden | 19 | 20415 | 1457 | 19.3 (0) | 32.6 | 34.8 | 0.64 | 0.6 / 2.1 | 6.8 | 10.8 | 12.2 / 0.42 |
| moltenKing | 24 | 46858 | 2810 | 25.7 (1.6) | 138 | 10.6 | 2.37 | 3.3 / 2.4 | 8.3 | 21.6 | 20.3 / 2.28 |
| silverhorn | 27 | 41298 | 3990 | 14.1 (0.6) | 67.6 | 25.2 | 0.59 | 0.7 / 1.8 | 7.5 | 11.2 | 14.4 / 0.65 |
| amaranthe | 31 | 80624 | 5171 | 21.5 (0.2) | 75.7 | 23.6 | 0.92 | 1 / 2.2 | 10.1 | 14.1 | 21.5 / 0.92 |
| ivar | 35 | 72326 | 7043 | 20.3 (0.8) | 117 | 18.6 | 1.08 | 1.4 / 2.1 | 9.2 | 14.7 | 21 / 1.17 |
| karthax | 39 | 143621 | 7611 | 42.4 (0.6) | 173 | 12.5 | 3.25 | 4.8 / 3.4 | 12.6 | 31.5 | 43.3 / 3.01 |

**ranger/wanderer/normal-casual**

| boss | lvl | life | hero DPS | s to kill (adds) | boss+adds DPS on hero | s to kill her | life lost (lives) | potions needed / possible | a combo blow % | biggest blow % | content view: s / lives |
|---|---|---|---|---|---|---|---|---|---|---|---|
| weaver | 7 | 2722 | 140 | 31.5 (1.9) | 7.5 | 50.3 | 0.62 | 0.7 / 2.8 | 3.7 | 5.5 | 6.3 / 0.12 |
| barrowLord | 11 | 7000 | 461 | 24.7 (1.9) | 19.5 | 32.7 | 0.83 | 0.9 / 2.4 | 3.5 | 5.6 | 9.3 / 0.34 |
| stonewarden | 18 | 12175 | 1619 | 10.1 (0) | 16.7 | 64.1 | 0.16 | 0.1 / 1.6 | 3.7 | 5.9 | 7.5 / 0.13 |
| moltenKing | 22 | 26358 | 2394 | 16 (0.7) | 66.4 | 21.5 | 0.75 | 0.9 / 1.9 | 4.2 | 10.8 | 12.2 / 0.66 |
| silverhorn | 25 | 23559 | 3694 | 9.2 (0.2) | 33.4 | 48.2 | 0.18 | 0.1 / 1.5 | 4 | 5.9 | 8.6 / 0.19 |
| amaranthe | 29 | 46686 | 4825 | 13 (0.1) | 38.6 | 48.7 | 0.27 | 0.2 / 1.7 | 4.9 | 6.9 | 13 / 0.27 |
| ivar | 32 | 40158 | 6441 | 11.8 (0.3) | 56.6 | 38 | 0.32 | 0.3 / 1.7 | 4.8 | 7.7 | 12.7 / 0.34 |
| karthax | 36 | 80942 | 7729 | 35.1 (0.2) | 81.1 | 26.1 | 1.39 | 1.6 / 2.9 | 6.3 | 15.8 | 36 / 1.29 |

**mage/warden/normal-casual**

| boss | lvl | life | hero DPS | s to kill (adds) | boss+adds DPS on hero | s to kill her | life lost (lives) | potions needed / possible | a combo blow % | biggest blow % | content view: s / lives |
|---|---|---|---|---|---|---|---|---|---|---|---|
| weaver | 8 | 4910 | 272 | 25 (1) | 14 | 25.8 | 1.06 | 1.3 / 2.4 | 7.2 | 10.8 | 6.9 / 0.29 |
| barrowLord | 12 | 12166 | 912 | 18 (0.9) | 41.5 | 16.6 | 1.07 | 1.5 / 2 | 7.2 | 11.5 | 10.2 / 0.79 |
| stonewarden | 20 | 22172 | 2384 | 12.4 (0) | 34.5 | 29.6 | 0.44 | 0.5 / 1.7 | 8.5 | 13.6 | 8.3 / 0.3 |
| moltenKing | 24 | 46858 | 3554 | 18.5 (0.7) | 143 | 8.7 | 2.3 | 3.1 / 2 | 10.1 | 26.4 | 13.4 / 1.56 |
| silverhorn | 27 | 41298 | 5913 | 10.1 (0.2) | 70 | 21.3 | 0.46 | 0.6 / 1.6 | 9 | 13.6 | 9.5 / 0.45 |
| amaranthe | 31 | 80624 | 8139 | 14.5 (0.1) | 79 | 21.1 | 0.65 | 0.9 / 1.8 | 11.6 | 16.2 | 14.5 / 0.65 |
| ivar | 35 | 72326 | 9232 | 13.3 (0.3) | 122 | 16.1 | 0.86 | 1 / 1.7 | 10.9 | 17.4 | 13.1 / 0.76 |
| karthax | 39 | 143621 | 12164 | 36.4 (0.2) | 176 | 12.1 | 3.04 | 4.2 / 3 | 13.4 | 33.6 | 37.2 / 2.83 |

**mage/wanderer/normal-casual**

| boss | lvl | life | hero DPS | s to kill (adds) | boss+adds DPS on hero | s to kill her | life lost (lives) | potions needed / possible | a combo blow % | biggest blow % | content view: s / lives |
|---|---|---|---|---|---|---|---|---|---|---|---|
| weaver | 7 | 2722 | 275 | 15.7 (0.4) | 7.5 | 50 | 0.36 | 0.4 / 1.9 | 4.2 | 6.3 | 4.7 / 0.12 |
| barrowLord | 11 | 7000 | 759 | 13.3 (0.4) | 20.1 | 30.1 | 0.55 | 0.5 / 1.7 | 3.8 | 6.1 | 6.9 / 0.32 |
| stonewarden | 18 | 12175 | 1880 | 8.6 (0) | 16.4 | 58.6 | 0.14 | 0.1 / 1.5 | 4.1 | 6.5 | 5.6 / 0.12 |
| moltenKing | 22 | 26358 | 2533 | 13.5 (0.4) | 66.9 | 17.9 | 0.74 | 1 / 1.7 | 4.9 | 12.8 | 9 / 0.62 |
| silverhorn | 25 | 23559 | 4500 | 7.6 (0.1) | 33.6 | 39.2 | 0.2 | 0.1 / 1.4 | 4.8 | 7.3 | 6.4 / 0.18 |
| amaranthe | 29 | 46686 | 6499 | 9.8 (0) | 38.5 | 37 | 0.26 | 0.1 / 1.5 | 6.7 | 9.4 | 9.8 / 0.26 |
| ivar | 32 | 40158 | 7964 | 8.4 (0.1) | 60.7 | 28.2 | 0.3 | 0.3 / 1.5 | 6.1 | 9.8 | 8.8 / 0.3 |
| karthax | 36 | 80942 | 10179 | 33 (0.1) | 87.3 | 22.8 | 1.46 | 1.7 / 2.8 | 7.1 | 17.9 | 33.2 / 1.45 |

### 5.4 Act over act (each zone or boss over the one before it)

| scenario | zone | life lost a pack ×prev | hit size ×prev | s to kill a pack ×prev | boss life lost ×prev boss | content: life/pack ×prev | content: boss ×prev |
|---|---|---|---|---|---|---|---|
| warden/warden/normal-casual | crypt | 0.29 | 0.9 | 0.31 | 1.48 | 0.85 | 2.76 |
| warden/warden/normal-casual | pass | 1.67 | 1.1 | 1.89 | 0.26 | 2.29 | 0.38 |
| warden/warden/normal-casual | halls | 0.66 | 0.97 | 0.57 | 3.96 | 0.82 | 5.25 |
| warden/warden/normal-casual | weep | 0.52 | 0.95 | 0.65 | 0.23 | 0.66 | 0.28 |
| warden/warden/normal-casual | heart | 1.12 | 1.17 | 1.13 | 2.17 | 1.1 | 1.7 |
| warden/warden/normal-casual | ashfield | 0.89 | 1.14 | 0.83 | 0.82 | 0.7 | 0.87 |
| warden/warden/normal-casual | forge | 1.24 | 1.03 | 1.21 | 2.8 | 1.25 | 2.56 |
| warden/wanderer/normal-casual | crypt | 0.37 | 0.9 | 0.38 | 1.64 | 1 | 2.8 |
| warden/wanderer/normal-casual | pass | 1.31 | 0.97 | 1.52 | 0.22 | 1.57 | 0.38 |
| warden/wanderer/normal-casual | halls | 0.76 | 1.03 | 0.53 | 4.73 | 0.91 | 5.25 |
| warden/wanderer/normal-casual | weep | 0.54 | 0.96 | 0.82 | 0.27 | 0.7 | 0.29 |
| warden/wanderer/normal-casual | heart | 1 | 1.19 | 0.95 | 1.46 | 1 | 1.71 |
| warden/wanderer/normal-casual | ashfield | 0.71 | 0.97 | 0.65 | 0.95 | 0.86 | 0.85 |
| warden/wanderer/normal-casual | forge | 1.2 | 1.15 | 1.4 | 3.56 | 1.17 | 3.74 |
| ranger/warden/normal-casual | crypt | 0.26 | 0.88 | 0.26 | 1.16 | 0.77 | 2.76 |
| ranger/warden/normal-casual | pass | 1.51 | 1.07 | 1.83 | 0.38 | 2.05 | 0.36 |
| ranger/warden/normal-casual | halls | 0.71 | 1.22 | 0.49 | 3.7 | 0.93 | 5.43 |
| ranger/warden/normal-casual | weep | 0.64 | 0.98 | 0.79 | 0.25 | 0.58 | 0.29 |
| ranger/warden/normal-casual | heart | 1.05 | 1.11 | 0.97 | 1.56 | 1.02 | 1.42 |
| ranger/warden/normal-casual | ashfield | 1.1 | 1.05 | 1.09 | 1.17 | 1.1 | 1.27 |
| ranger/warden/normal-casual | forge | 1.04 | 1.1 | 1.07 | 3.01 | 1 | 2.57 |
| ranger/wanderer/normal-casual | crypt | 0.27 | 0.89 | 0.32 | 1.34 | 0.92 | 2.83 |
| ranger/wanderer/normal-casual | pass | 1.52 | 1.08 | 1.4 | 0.19 | 2.08 | 0.38 |
| ranger/wanderer/normal-casual | halls | 0.59 | 0.99 | 0.5 | 4.69 | 0.76 | 5.08 |
| ranger/wanderer/normal-casual | weep | 0.68 | 1.04 | 0.81 | 0.24 | 0.68 | 0.29 |
| ranger/wanderer/normal-casual | heart | 1.08 | 1.14 | 1.03 | 1.5 | 1 | 1.42 |
| ranger/wanderer/normal-casual | ashfield | 0.86 | 1 | 0.87 | 1.19 | 0.85 | 1.26 |
| ranger/wanderer/normal-casual | forge | 1.17 | 1.11 | 1.18 | 4.34 | 1.27 | 3.79 |
| mage/warden/normal-casual | crypt | 0.29 | 0.92 | 0.28 | 1.01 | 0.96 | 2.72 |
| mage/warden/normal-casual | pass | 1.53 | 1.14 | 1.7 | 0.41 | 1.77 | 0.38 |
| mage/warden/normal-casual | halls | 0.87 | 1.16 | 0.61 | 5.23 | 0.95 | 5.2 |
| mage/warden/normal-casual | weep | 0.54 | 0.98 | 0.74 | 0.2 | 0.7 | 0.29 |
| mage/warden/normal-casual | heart | 0.96 | 1.2 | 0.95 | 1.41 | 0.96 | 1.44 |
| mage/warden/normal-casual | ashfield | 1.04 | 1.02 | 0.9 | 1.32 | 0.96 | 1.17 |
| mage/warden/normal-casual | forge | 1.12 | 1.04 | 1.21 | 3.53 | 1.17 | 3.72 |
| mage/wanderer/normal-casual | crypt | 0.33 | 0.92 | 0.33 | 1.53 | 0.89 | 2.67 |
| mage/wanderer/normal-casual | pass | 1.36 | 1.05 | 1.53 | 0.25 | 2 | 0.38 |
| mage/wanderer/normal-casual | halls | 0.68 | 1.08 | 0.6 | 5.29 | 0.94 | 5.17 |
| mage/wanderer/normal-casual | weep | 0.77 | 1.04 | 0.87 | 0.27 | 0.67 | 0.29 |
| mage/wanderer/normal-casual | heart | 0.9 | 1.25 | 0.95 | 1.3 | 0.9 | 1.44 |
| mage/wanderer/normal-casual | ashfield | 1.22 | 0.99 | 1.02 | 1.15 | 1.11 | 1.15 |
| mage/wanderer/normal-casual | forge | 1 | 1.1 | 1 | 4.87 | 1.1 | 4.83 |

## 6. Where the curve jumps, and by how much

The table below combines the play-through and the content view. A ratio is the zone's (or boss's) number over the previous one's.

| step | packs: life lost a pack | blow size | boss: life lost a fight |
|---|---|---|---|
| forest → crypt (Act I) | 0.26-0.37× (the forest's rare trolls at level 4-8 are the hardest packs in the game for a fresh hero) | 0.9× | Barrow Lord 1.0-1.6× Weaver |
| crypt → pass | 1.3-1.7× (pass trolls, more elites: elite share of EHP 0.62-0.67) | 1.0-1.1× | Stonewarden 0.2-0.4× |
| pass → halls | 0.6-0.9× | 1.0-1.2× | **Molten King 3.7-5.3× Stonewarden** (hounds, 2.3-2.6× blows) |
| halls → weep | 0.5-0.8× | 0.95-1.05× | Silverhorn 0.2-0.3× |
| weep → heart | 0.9-1.1× | 1.1-1.25× | Amaranthe 1.3-2.2× Silverhorn |
| heart → Field of Ash | **0.7-1.2×** | 1.0-1.14× | Ivar 0.8-1.3× Amaranthe |
| Field → Forge | **1.0-1.25×** | 1.0-1.15× | **Karthax 2.8-4.9× Ivar** (2.3-5.6× Amaranthe) |
| new in the Forge | the Breath: 20% / 12% of life a breath, pure; 4-12× an ordinary blow; ≥ 3.6% of life a second in the open at heat 3 (Warden difficulty) | | |

- **The packs of Act IV are where Act III left them.** The Ranger's packs are 1.0-1.1× (shields and Shroud), the Warden's 0.7-1.24×, the Mage's 0.96-1.2×.
- **The level drift** makes Act IV's blows 13-24% heavier against the hero's life than Act III's. This repeats every act, at a few percent a level.
- **The bosses are the curve's real shape: easy, hard, easy, hard.** The second boss of Acts II and III (Molten King, Amaranthe) costs 2-5× its act's first. Karthax repeats the pattern from the highest base: 3.0-3.3 lives on Warden difficulty and 1.4-1.5 on Wanderer, the most of any fight. He comes after the two gentlest bosses (Silverhorn, Ivar). With the Molten King he is one of two fights where every class needs more potions than the cooldown gives (his: 4.2-4.8 against 3.0-4.1). For the Ranger and Mage his biggest blows are 31-34% of their life.
- **The Breath** is a kind of damage the game has nowhere else. A share of max life, it ignores everything the player has built. It is twice the largest Act III boss blow on a Warden (Amaranthe's 7.4%). It ticks on a rhythm that tightens as the player succeeds (heat 0→3: 10 s → 5.5 s; 5 s → 4.5 s with a Hammerhorn pumping).

Wanderer changes the scale (monster life ×0.65, damage ×0.55, Breath ×0.6) but not the shape. Karthax is relatively *worse* on Wanderer: 3.4-5.6× the Act III/IV bosses before him. His 25 s cage lock does not shrink with the difficulty while every other fight gets shorter.

## 7. Assumptions and limits

1. Rotations: measured at level 30 with every skill at rank 5, against stationary dummies. Real targets move, so the absolute times to kill are optimistic (ASSUME the same efficiency in every act). Lower levels are scaled by the formula rotation.
2. Monster hit chances and attack shares (A5, A6), the 4-melee cap and the 55% alive average (P1) are the same in every act. They move absolute numbers, not ratios.
3. Boss hit chances (B1) are the same for every boss. Karthax's cage Hammerfall is the one exception (50%, because the hero must bait it). Halving every boss's hit chances leaves Karthax 2.9-6.2× Ivar and 3.6-7.2× Amaranthe (`HITSCALE=0.5`, `balance/sens_hit05.json`).
4. Act IV rules: the light, shield and Seen shares are judgment calls (§4), stated where they are used. The Breath is reported apart, not added to pack numbers. The ticks are assumed rolled off.
5. Not modelled:
   - the Crown's Offers (optional ±);
   - shrines, globes, breakables;
   - gambling;
   - legendary powers beyond their stat lines;
   - dodge-rolling as damage avoidance beyond the hit chances;
   - Act III's sap and amber roots (they make Act III harder than modelled, so the Act IV/III ratios here are upper bounds for packs).
6. Hero, Nightmare and Ash difficulties are not modelled. Note that Nightmare and Ash put monsters 2 levels above the hero (actors.js:139).

Reproduce it:

```
node balance/model.mjs 20             # formulas.json (~1 min)
node balance/mdtables.mjs …           # the tables
node balance/calib.mjs http://localhost:<port>/ warden,ranger,mage   # the live rotation measurement
```

`playthrough.mjs` is the play-through, `power.mjs` the hero and monster formulas, `model.mjs` the tables and bosses.
