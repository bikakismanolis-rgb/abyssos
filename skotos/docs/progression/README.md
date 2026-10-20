# Progression: Mastery, skill variants, later skills and the loadout

The owner's complaint: «έχω τερματίσει τα skills μου και δεν έχω τι να κάνω τα points». Each class had a basic attack and
four skills of five ranks, so 16 of the 49 points a hero earns by level 50 could be spent; after about level 17 a level-up
gave nothing. This adds three things as one system, all paid for from one pool of points.

## What the player sees

- **Points** (`Πόντοι`): one per level (49 by level 50), and one per Mastery level after that. The skills button on the HUD
  shows how many are waiting; the skills panel's header glows while any are.
- **Skills tab**: the four buttons of the phone at the top (tap one to look at its skill), then every skill of the class
  as a tile (rank pips, the button it is on, a `+` when it can be improved, `Νέα` for a later skill not yet placed, the
  level a locked one opens at). Tap a tile for its detail on the right: the rank and an Upgrade button, what it does, its
  damage now and at the next rank, which button it is on (tap 1-4 to put it there: a skill already on another button
  swaps places), and its variants.
- **Variants** (`Παραλλαγές`): each of the first four skills of each class has two other versions that change how it is
  played (24 in all). A variant needs the skill at rank 5 and costs 1 point. The first one learnt takes effect at once;
  switching between the skill as it is and its variants is done in town. The button on the HUD shows a small blue
  diamond while a variant is in use.
- **Later skills**: three more per class, at levels 20, 30 and 40 (ranks 1-5, like the others). A class now has seven
  skills for four buttons: the loadout is the choice.
- **Mastery tab** (`Μαεστρία`): twelve tracks, each bought a rank at a time (+1 or +5). After level 50 experience goes on
  counting into Mastery levels, each a point and a little longer than the last; the HUD shows the Mastery level on the
  portrait (a blue star) and the XP bar turns blue. A respec (`Ξέχνα ό,τι έμαθες`, town only, gold) gives every point back.

## Numbers

### Mastery tracks
bonus(r) = max x (1 - e^(-r/k)): the first ranks are small, the tail endless but bounded.

| track | stat | max | k | rank 1 | rank 10 | rank 40 |
|---|---|---|---|---|---|---|
| Δύναμη / Might | damage % | 100 | 40 | 2.5 | 22 | 63 |
| Ζωτικότητα / Vigor | life % | 100 | 40 | 2.5 | 22 | 63 |
| Σημάδι / True Aim | crit chance % | 12 | 30 | 0.4 | 3.4 | 8.8 |
| Μανία / Ferocity | crit damage % | 120 | 40 | 3 | 27 | 76 |
| Γοργότητα / Haste | attack speed % | 25 | 40 | 0.6 | 5.5 | 16 |
| Δρασκελιά / Stride | move % (cap 40 with items) | 15 | 25 | 0.6 | 4.9 | 12 |
| Εστίαση / Focus | cooldown % (cap 40 with items) | 15 | 35 | 0.4 | 3.7 | 10.2 |
| Πηγή / Wellspring | resource regen % (Warden: fury per hit %) | 50 | 30 | 1.6 | 14 | 37 |
| Σίδερο / Iron | armour % | 80 | 40 | 2 | 18 | 51 |
| Βδέλλα / Leech | life per hit (x level) | 2 x L | 30 | 3 at L50 | 28 at L50 | 74 at L50 |
| Τύχη / Fortune | gold % | 150 | 30 | 4.9 | 43 | 110 |
| Ανιχνευτής / Seeker | magic find % | 150 | 30 | 4.9 | 43 | 110 |

### Points and Mastery levels
- Ranks 2-5 of the seven skills: 28 points; the 24 variants: 8 per class (two for each of four skills); so 36 points
  buy every rank and variant (level 37). Everything else, and every Mastery level, goes to Mastery.
- Mastery level m needs xpToNext(49) x (1 + 0.06 m): 12 756 for the first, 19 644 for the tenth, 88 527 for the
  hundredth. The whole road from 1 to 50 is 263 000 XP; the first hundred Mastery levels are 5.06 million (the Shadow
  Gates' long tail).
- Respec: 100 + 12 x level² + 400 x Mastery level gold.

## Balance before and after

(filled in below from tools/balance-act.mjs)

## Code

- `src/game/data.js`: the later skills appended to `SKILLS` (indices 0-4 unchanged), `VARIANTS`, `LOADOUT`,
  `VARIANT_RANK`, `mxpToNext`.
- `src/game/progression.js` (new): the rules. Mastery tracks and their bonus (`masteryStats`, called by
  `computeStats`), points earned/spent, rank up, variants (unlock, choose), the loadout (`slotSkill`, `setSlot`), respec,
  and `migrateHero` for old saves.
- `src/game/skillsx.js` (new): `VARIANT_FN['skill.variant']` and `NEW_FN[skill]`, each called like a skill.
- `src/game/skills.js`: a button (1-4) maps through the loadout; cooldowns are kept per skill by its index in `SKILLS`
  (`pl.cds` is as long as the class's list); the variant, else the base, else a later skill is called; helpers exported.
- `src/game/projectiles.js`: `fire()` takes `onTick` and `look`; `area()` takes `look`, `light`, and the kind `'custom'`
  runs `onTick` every frame and `onEnd`/`dispose` at its end (or a zone change).
- `src/game/combat.js`: XP past level 50 goes to `gainMastery`; `furyGain` (Warden's Wellspring); the Alpha's +15%; the
  Challenge's damage cut and reflection.
- `src/game/ai.js`: `victim()` honours a taunt (`a.taunt`, game time).
- `src/ui/progpanel.js` (new) + `style.css` (`.pg-*`): the skills panel. `src/ui/hud.js`: buttons from the loadout, the
  Mastery badge and bar, the Mastery level-up.
- `src/i18n/text.js`: every string (`sk.*` for the later skills, `var.*`, `prog.*`, `mast.*`).

## Saves

`migrateHero` (on every hero taken up, boot.js `startHero`): `loadout` = today's four, `skills`/`vars`/`variant`/`mast`
empty objects if missing, `mlvl`/`mxp` 0, and `points` set to (level - 1) + Mastery level - points spent, so any point the
old cap left unspendable is now spendable. Old ranks are kept as they were.

## Porting onto the Act V branch (`claude/sleepy-tesla-4030vd`)

Most of the work is in new files, which carry over as they are: `src/game/progression.js`, `src/game/skillsx.js`,
`src/ui/progpanel.js`, `tools/vite.nohmr.mjs`, `docs/progression/*`. The edits to shared files are small and local;
merge them by hand in this order (`git diff c70d65d claude/skotos-progression -- <file>` shows each):

1. `data.js`: append the three later skills to each class in `SKILLS` (after `quake`, `pierce`, `meteor`), add
   `VARIANTS`, `LOADOUT`, `VARIANT_RANK` after `SKILL_MAX_RANK`, and `mxpToNext` after `MAX_LEVEL`. Act V's six
   difficulties need nothing (the Skotos difficulty's xp 6.5 simply makes Mastery come faster there).
2. `stats.js`: import `masteryStats`, add `furyGain: 0` to the stat record, call `masteryStats(hero, s)` before
   `lifeMax` (after Act V's Remembered boons). `items.js`: the `skill` affix filter (later skills on deep items only).
3. `skills.js`: the imports (`slotSkill`, `variantOf`, `VARIANT_FN`, `NEW_FN`), `export` on `act`, `attackSpeed`
   (Act V's keeps its `coldMul()`), `arcHit`, `circleHit`, `swingFx`, `staffTip`, `handPoint`, and the new
   `skillOn`/`cdIndex`/`canUse`/`useSkill` block. **Act V hooks to repeat in the variants** (skillsx.js), since a variant
   replaces its base function: `crackAt(tx, tz, 3, 1, { src: 'leap' })` in `leapCore`'s landing; `crackLine(...)` along
   each fissure in `quakeLines` and a `crackAt` per ring in `quake.ring`; `crackAt(x, z, 3.5, 1, { src: 'rain' })` in
   `rainCore`; `crackAt(x, z, 1.5, 1, { src: 'fireball' })` in `fireBoom` (not the small ones) and `fireball.cinder`;
   `refreezeAt` + `emit('frostNova', ...)` in `novaCore`; `crackAt(x, z, 3.5, 2, { src: 'meteor' })` in the comet and
   (r 2, +1) in each shower stone. Rolls skid on ice in `dodge`; the Vault and the Charge could too (optional).
4. `actors.js`: `p.cds` as long as `SKILLS[cls]` (and the `SKILLS` import). `ai.js`: the taunt line at the top of
   `victim()`. `combat.js`: the `mxpToNext` import, `gainXP`/`gainMastery`/`levelFx` (replace `gainXP`), `furyGain` in
   the fury gain, the Alpha line in `heroHit`, the Challenge line after `shrineShield` in `hurtHero`, and `beam` in the
   interrupt test. `projectiles.js`: the new `KIND`s, `onTick`/`look` in `fire()` and `updateProjs`, the `custom` area
   branch, `look`/`light`/`dispose` in `area()`, and `dispose` in `clearProjs`.
5. `hud.js`: imports, `#mlvl` in the portrait, `setupSkillButtons` (+ the `loadout` listener), the XP bar block, the
   skill loop reading `slotSkill`, the buff icons, `masteryUp`, the later-skill line in `levelUp`. Act V's own HUD changes
   (`HAZ5`) do not touch these lines.
6. `panels.js`: the `renderSkills`/`skillsClick` import, `skills()` replaced, `open()`'s `P.sure`/`P.msel`/`ctx.tab`, the
   `skillsClick` line at the top of `onClick`, and the old `rank` case removed. `screens.js`: the ✦ Mastery level on a
   hero's slot. `boot.js`: `migrateHero` import and call in `startHero`, `?mlvl=`. `icons.js`: the new icons.
   `style.css`: the `.pg-*` block at the end. `text.js`: the block after `sk.roll` and `hud.levelupSub`.
7. `tools/balance-act.mjs`: `prog` import, `ready()` through the loadout, and the progression lines in `setupHero`.
   `tools/scenario.mjs`: the `progpanel`, `skillsfx`, `progress` scenarios.

Then run `progpanel`, `skillsfx` (each class), `progress`, and Act V's own scenarios, and re-measure Act V with
`balance-act.mjs` (`mast: true` jobs at the act's levels) to keep its numbers.
