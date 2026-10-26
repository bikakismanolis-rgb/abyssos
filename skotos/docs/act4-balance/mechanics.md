# Skotos, Act IV: the mechanics audit

The published build (commit 7eded86, worktree `scratchpad/pub/skotos`). Every Act IV rule and creature was read in the code line by line and set against Acts I-III. References are `src/game/<file>:<line>` unless stated. "×dmg" means a multiple of the attacker's `a.dmg` (its monsterDmg(level) × def.dmg × difficulty).

What is new here, next to `formulas.md` (the formula agent's model, which puts the jump at Karthax and the Breath) and `sim.md` (the simulated play, still running):
- four real bugs, each confirmed in the running game;
- the design rules that hurt more on a phone than on paper;
- what was checked and is fine, so that nobody fixes it.

Live checks ran on my own no-HMR server (port 5417, now stopped), with one headless browser at a time. The scripts are in `balance/`:
- `mechprobe.mjs` and `diveprobe.mjs`: the live checks;
- `walkback.mjs`, `walkback2.mjs` and `walkback3.mjs`: how far a death sends the hero back (a BFS over the real generators);
- `drips.mjs`: where the slag drips fall.

## The contributors, ranked

| # | finding | kind | size (Warden difficulty unless said) |
|---|---|---|---|
| 1 | Karthax's fight structure: the cage phase is pure survival, the last fire has no hero light, the Hammerfall cannot be walked out of | design numbers | the formula agent's 2.8-4.9× Ivar; see §1 for what each phase adds |
| 2 | The Forge's Breath on the main road and in every fight in a gallery; the Karthax respawn walks the north gallery at heat 3 | design rule | 20% + 3% burn per breath, pure; 3.6-4.4% of life a second in the open at heat 3, more than a potion gives |
| 3 | **BUG**: slag drips fall wherever lava is within 6 cells. That covers 83% of Karthax's platform, all three cage statues, all four ghost pools and the Hall of Moulds, not only the Slag Rivers | bug against the design | live: 8 drips a minute at a statue and at a ghost pool, 0 at the centre; drawn in the same red as the Hammerfall |
| 4 | **BUG**: elite affixes keep firing on an Ember Tick clinging to her back and on an Ashwing in the sky, where neither can be struck | bug | live: a molten champion tick did 5.7× its own damage in 2.9 s (436 against 76 at L35), with 4 fire patches under her feet |
| 5 | The Ash-Fallen shield: 15% from the front against every class's basic attack, the Ranger's multishot, and the Warden's third swing | design rule, phone-hostile | about a third of Act IV's foes; a guarded spearman takes ~9× the frontal basic hits of an Act III Rootsworn |
| 6 | Ivar's Dark: the 2.5 m light is smaller than the distance he keeps. His sweep puts out the brazier she fights in, and it cannot be side-stepped, so she is Seen almost all the time | design numbers | 30% damage for most of 30% of his life (formula agent: ×0.48 Ranger, ×0.55 Mage); Seen up 75-86% of the fight, so +11-13% to all his damage |
| 7 | **BUG**: the waylamp checkpoint is lost on Continue or a difficulty change, and no lit lamp can set it again. A respawn never uses waypoint 2 | bug | live: a death at Ivar wakes her at waypoint 1, 139-144 m off, not at lamp 5 (11-14 m) |
| 8 | Dash hits reach wider than their telegraphs (shared code, used most in Act IV) | readability bug | live: the Ashwing's dive hits up to 1.9 m from its line; the line is drawn 1.2 m each side |
| 9 | Ember Ticks re-cling as soon as their stun ends; a clinging tick cannot be hit; the Mage's blink is on a 3 s cooldown | design rule | an unshaken pair: about 4.3× an ordinary blow in 3 s, and −25% move |
| 10 | Fire-arrow patches land under the hero on every hit | side effect | +0.22× at once on every bowman hit, up to +0.88× for a hero who stands |
| 11 | Ashsmith elites and moulds: a rare leads four smiths (twelve reforges), and the moulds keep raising Ash-Fallen with no cap | design hot-spot | the Hall of Moulds is always elite (60% rare) |
| 12 | Phone readability and control: one-second touches that a blow breaks, deliberately darkened Shrouded foes, 1.1 m cover boxes in the galleries, ±4 m sideways view in portrait | readability | qualitative, see §12 |

## 1. Karthax: what each phase does (design numbers)

The fight data (data.js:102, actors.js:222, world.js:258): life 95 (Amaranthe 80, Molten King 72, Ivar 58), damage 2.7 (2.5 / 2.4 / 2.3), level max(zone+3, hero+1), phases at 65% and 30%.

**Phase 1, the Ash King (100-65%)** (ai.js:2203-2216).
- Hammerfall, a 4.5 m circle on the hero for 1.0 s (ai.js:2308-2322):
  - To walk out, she must cover 4.7 m. After a 0.45 s reaction that takes 8.6 m/s, and she runs at 5.4-5.8 m/s. Every Hammerfall therefore needs a dodge with good timing.
  - A hit is 1.5×, a 0.4 s stun, burn 0.5×, and three fire patches for 4 s.
  - Acts I-III have one move like it: the Weaver's leap (3.5 m, 0.9 s, 1.5× and stun, ai.js:975). It comes only when she is more than 6 m off, every 9 s. The Hammerfall comes at 3-16 m, every 9 s here and every 6.4 s in phase 3, and it adds burn and fire.
- Tongs, Gaze and the Host: the Host's spearmen carry the guard (§5).

**Phase 2, the Three Cages (held at 30-65%)** (ai.js:2220-2275).
- Everything the hero does to Karthax here is wasted:
  - he is warded (−50%), and the Lady heals him toward 65%;
  - when the last statue breaks, his life is set to `min(hp, 29.9%)` whatever it was (ai.js:2270).
- The phase is a fixed survival section of ~21 s (gifts refused) to ~30 s (gifts taken) (HANDOFF), with a Hammerfall every 5 s for three blows down to every 3.2 s for six (ai.js:2209). The design asked for 7 s (act4-design Bosses).
- Kneel (8 m round him, 1.3 s, 1.0× and a root) comes every 12 s, and Molten Rain (five 1.8 m drops) every 10 s.
- The design's "at most two big telegraphs at once" (act4-design Risks) is not enforced anywhere in `boss()` (ai.js:1414-1470). With the drips of §3, a typical moment shows a Hammerfall circle, two or three rain circles, a drip circle and about six fire patches.
- Taking the altars' gifts costs three more Hammerfalls to dodge. The gift's stats are also stripped mid-fight (ai.js:2225), so a Throne-taker loses 10% of her life and 25% of her armour at that moment.

**Phase 3, the Last Fire (30-0%)** (ai.js:2277-2290).
- Her light: the Cradle is set to 0 (light.js:45-50). Her own light shrinks to 30% of its reach (at least 2 m) and 12% of its intensity (light.js:226-228).
- Karthax is Shrouded: he takes 30% outside a pool.
  - The pools: Isarn's 6 m pool walks to 4.2 m from him at 1.2 m/s (world.js:982-995), against his 5.0 m/s. The ghost pools are 4 m, on the rim.
  - So a Ranger or Mage who kites hits him at 30% most of the time.
- The Dark: 2.0× and burn, every 15 s, to anyone outside a pool.
- Hammerfall (1.0 s) every 6.4 s. The Gaze comes as two crossing 20 m lines that leave 10 fire patches for 4 s, every 6.4 s. The Cradle cannot drink in the dark (light.js:162), so every patch lasts its full time.
- No adds in phases 2 and 3, so no health globes (combat.js:404). The Molten King's hounds and the Barrow Lord's skeletons give a small stream of globes in every phase (≈0.3-0.6% of life a second). Karthax gives that only in phase 1.

**Size.** The formula agent puts Karthax at 3.0-3.3 lives on Warden difficulty and 1.4-1.5 on Wanderer. That is 2.8-4.9× Ivar, the most of any fight, and his 25 s cage lock does not shrink on Wanderer. The items above are the reasons on the code side. The two that do not shrink with skill are the cage lock and the 1.0 s Hammerfall.

## 2. The Forge's Breath, where it bites (design rule)

The rule (forge.js:19, :92-106):
- 20% of max life a breath (12% on Wanderer), pure: no armour, no block. Burn adds 3% of max life over 3 s.
- Seen's +15% would apply too (combat.js:127), but the Lampless are not in the Forge.
- Cover works as designed: `map.los` from the mouth (forge.js:41-45). I checked alcoves, pillars and stoker bays.
- The periods (forge.js:37):
  - 10 s, minus 1.5 s a heat stage;
  - with a Hammerhorn pumping, 5 s, never under 4.5 s;
  - at heat 3: 5.5 s, or 4.5 s pumping.
- The 2.0 s inhale is never cut. Between breaths she has 1.3-2.3 s of idle plus 2.0 s of inhale.

Where it hurts on a phone:
- **The cover is small.** An alcove is 2×2 m (gen4.js:606), so a 0.45 m hero's centre must reach a box of about 1.1 × 1.1 m. A pillar's shadow is about 1 m wide.
  - A big monster's body pushes her (player.js:97: full push for big ones). The Hammerhorn is big and chained in the gallery's own bay.
  - The Hammerhorns are fireproof (data.js:98): the Breath never hurts them, so a fight in a gallery is all downside.
- **The respawn path to Karthax runs the whole north gallery.** The flue is 30-34 m and both of its stoker stations lie by the path (`walkback2.mjs`).
  - This happens after the third bellows, so at heat 3, with a breath every 5.5 s.
  - After a Continue the zone is rebuilt, so the stokers pump again: every 4.5 s.
- **The bellows chambers.** Once one has breathed, its vents fire through the hero every 12 s while she is inside (10% pure, 7% on Wanderer; forge.js:137-158). The north chamber is on the way to the stair.

Size: the formula agent's figure is 3.6-4.4% of life a second for a hero who stays in the open at heat 3. A potion gives 3.3% a second (data.js:269). In Acts I-III the largest single blow on a Warden is the Molten King's 11.6%, and nothing there takes a share of max life.

## 3. BUG: slag drips fall wherever lava is near, including Karthax's platform

- **Code.** `drips()` (forge.js:109-122) runs from `tickFlues` everywhere in the Forge while the flues are on. It drops one every 5-9 s if any `L.lava` cell lies within ±6 cells of the hero.
  - Lava cells (`L.lava`) include the slag rivers, the moat round the Anvil of the Crown, the Forge Mouth, and the brood pools in the Hall of Moulds (gen4.js:651-677).
  - The design puts drips "in the Slag Rivers" only, and says of the Anvil: "No flues in this arena, so the boss telegraphs never compete with the breath".
- **Where** (`drips.mjs`, 6 seeds): 46% of the whole Forge floor, 83% of Karthax's platform, all three cage statues, all four ghost pools, and the 4 m south of the Anvil.
- **Live** (`mechprobe.mjs`, 60 s of game time standing still):
  - at a cage statue, 8 drips, all within 2.5 m of her;
  - at a ghost pool, 8;
  - at the platform's centre, 0.
- **What a drip is** (forge.js:123-134):
  - a 1.6 m circle for 1.0 s;
  - then 1.0 × monsterDmg(zone level 25) × difficulty, burn 0.4×, and a 1.3 m fire patch for 3 s.
- **How much it adds.** Each drip is small: about 0.6× an ordinary Act IV blow, or 1-3% of life, plus the burn. The real cost is attention. It falls exactly where Karthax's design sends her: by a statue to bait the hammer in phase 2, and into a ghost pool for The Dark in phase 3. It is drawn in the same red (0xff5010) as the Hammerfall and the Molten Rain.
- Acts I-III have no ambient hazard inside a boss arena. The Molten King's lava hall has none.
- **Fix:** run `drips()` only inside the Slag Rivers' bounds, or keep it off while `z.boss` is awake and in the Hall of Moulds.

## 4. BUG: affixes fire from a tick on her back and from an Ashwing in the sky

- **Code.** ai.js:90 runs `elite()` for any elite that is not under the ground, not hidden and not an asleep Rootwarden. It does not check `a.cling` (combat.js:233-243) or `a.airborne` (ai.js:1649-1664). `damage()` itself refuses both as targets (combat.js:47), so both can attack while they cannot be struck.
- **Molten.** `area('fire', a.x, a.z, …)` every 0.8 s (ai.js:965). On a clinging tick, `a.x, a.z` is her own back, so the patch lands at her feet.
  - Live (`diveprobe.mjs`, L35 Warden standing still, one champion tick clinging for 2.9 s): without an affix 76 damage, with `molten` 436 damage and 4 patches under her feet. That is 5.7×.
  - A champion pack shares its affixes, and two ticks cling at once, so it is double that. A roll throws them off, but the patches stay where she stood.
- **Thunder and frozen** (ai.js:953-963): they cast at her position from a clinging tick, or from a rare Ashwing that wheels out of reach for 6-8 s at a time.
- **Shielding** (2.5 s invulnerable every 9 s) on a rare Ashwing can cover most of its 2.5 s on the ground, which is the only window to hit it.
- **Frequency.**
  - Champion tick packs: about 1 per Field (packs.json); P(molten in 2 of 9 affixes) = 22%. So about one Field in four or five has a molten tick pack.
  - Rare Ashwings: 0.27 per Field, with thunder or frozen 58% of the time.
- Acts I-III mute every elite that cannot be struck (the same line, ai.js:90); Act IV's two new "cannot be struck" states were left out.
- **Fix:** add `&& !a.cling && !a.airborne` to ai.js:90.

## 5. The Ash-Fallen shield blocks every class's basic attack (design rule, phone-hostile)

- **Code** (combat.js:189-204). Any blow that is not `o.area`, comes from within ±60° of the spearman's facing, and does not break the guard deals 15%. A break is `o.breakGuard`, a stun, a freeze, or a knock of 8 or more. The spearman turns at only 2.2 rad/s (ai.js:194-198).
- **What is blocked from the front:**
  - Warden: all three steps of the basic combo (skills.js:95-117). The third is a 360° swing, but `area` is passed to `heroHit` only, not to `damage`, and its knock of 7 is under 8.
  - Ranger: the bolt, and the multishot (`opts: { knock }`, skills.js:263-267).
  - Mage: the arcane bolt.
  - The wolf.
- **What gets through:** whirl, leap and quake (Warden); rain and pierce (Ranger); fireball, nova and chain lightning, whose 0.25 s stun breaks the guard (Mage).
- **Who carries it:** ashSpear and ashDwarf, a third of the Act IV roster:
  - in the Field: the ashLine packs (7 of 9 weights), the champion lines and the snuffer guards;
  - in the Forge: the smiths' packs, the bellows waves (54% of 36), the mould raises and Karthax's Host.
  - A champion spearman has 3× life, so against frontal basics he is 20× a normal one.
- **Phone scenario.** Holding the attack button auto-aims at the nearest foe (skills.js:21-33). That is always the line's front, so every bolt or swing lands on a shield. The game shows a spark, a clank and a block pose, but no number of how much was lost.
  - For a Ranger leaning on bolt and multishot, a spearman (life 1.6) takes ~9× the frontal hits an Act III Rootsworn (life 1.2) did.
  - The formula agent's rotation, built on area skills, puts the loss at only 6-14% of her damage against spearmen. The real cost depends on how much a player uses the basic button, and on a phone that is a lot.
- **Acts I-III:** no facing-based reduction anywhere. Stoneborn and armoured foes take a flat ×0.72 from every side.

## 6. Ivar's Dark: the light is smaller than the distance he keeps (design numbers)

- **The light and the Shroud.** In his dark the Cradle is 2.5 m (ai.js:2014). The Shroud tests his centre: `lightAt(a.x, a.z)`, combat.js:205-206.
- **The distance he keeps.** Between moves the boss loop walks toward her only while she is more than 3.5 m away (ai.js:1453), and his staff combo starts at 4.6 m (ai.js:2039). So he stands at 3.5-4.6 m, outside her light, unless she walks in to 2.5 m centre to centre.
  - The Warden's swing reaches 3.35 m (2.6 m + his 0.75 m radius), so even a Warden who presses attack from her natural distance hits him at 30%.
  - The staff combo's second blow throws her back 16, and the Long Road ends 4 m past her, so she has to close in again after both.
- **The braziers (6 m pools) are the designed way through,** but:
  - The Lantern Sweep, every 7 s in the dark (ai.js:2038), is aimed at her and puts out any lit brazier in a 10.5 m, ±1.1 rad cone (ai.js:2086). The brazier she fights beside is nearly always inside it.
  - Relighting is a 1 s touch (world.js:762-775), broken by any blow. It cannot start while any action runs (`pl.act`), so holding attack blocks it.
  - Lighting all three (≈23 m apart on the rim) dazes him for 4 s. Under his Dark Step, Long Road and two Smoke-eaters that is a long errand.
- **Seen.** At 3.5 m the sweep's cone is ~14 m wide, so it cannot be side-stepped, only rolled through in time. Each sweep marks her Seen for 6 s, with sweeps every 8, 7 and 8 s across his phases: up 75-86% of the fight, +15% on all his damage (combat.js:127).
- **Size.** Formula agent: the Ranger deals ×0.48 and the Mage ×0.55 over 30% of his life. Ivar overall is 0.8-1.3× Amaranthe, so this is a local spike, not the act's jump.
- **Acts I-III:** no boss changes the hero's damage by position, and none has a debuff on the hero's damage taken.

## 7. BUG: the waylamp checkpoint is lost on Continue, and waypoint 2 is never a respawn

- **Code.**
  - `z.checkpoint` is set only when a dark lamp is lit (world.js:731) and is never saved (save.js).
  - A continued game starts with `G.zones = {}` (boot.js:87); a difficulty change deletes every zone too (boot.js:172).
  - On entry, every lamp with a `lamp_<id>` flag comes back lit (world.js:667).
  - `lampUse` on a lit lamp only plays its memory and returns (world.js:723), so no lamp can set the checkpoint again.
  - The respawn goes to `z.checkpoint || 'waypoint'` (boot.js:156), and `'waypoint'` is always waypoint 1 (world.js:215). Elati's camp, waypoint 2, is never used.
- **Live** (`mechprobe.mjs`):
  - Lamp 5 lit for the first time: checkpoint at (68, 45.5).
  - After the zone was rebuilt, as on Continue: the lamp is lit on entry, touching it leaves the checkpoint at null, and the respawn goes to waypoint 1 at (52, 172).
- **How far** (`walkback2.mjs`, 8 seeds): from waypoint 1 to Ivar 139-144 m, from waypoint 2 54 m, from lamp 5 11-14 m.
  - On a phone, the browser tab is often reloaded or killed in the background, so "Continue, then die at Ivar" is the common case. Every such death costs ~130 m (~25 s) more walking than the game promises ("a place to wake").
- **Acts I-III:** one waypoint per zone, and the bosses lie 60-185 m from it (forest 124, crypt 83, pass ~180, halls 94, weep 60, heart 135-177). Act IV is better than them when the checkpoint works, and no worse when it does not. This is a broken promise rather than a step in difficulty.
- **The Forge:** there are no lamps, so a death at Karthax is 158-162 m back to its waypoint (§2), similar to the pass and the heart.
- **Fix:** save the last lamp's id (`hero.flags.lastLamp`) and restore `z.checkpoint` in `act4Enter`; let `lampUse` on a lit lamp set it; respawn at waypoint 2 when it is nearer.

## 8. Dash hits reach past their telegraphs (readability bug, shared code)

- **Code.** `dashStep` hits when she is within `a.radius + pl.radius + 0.6` of the dashing body (ai.js:797), but the telegraph line is drawn at the move's own width (fx.js:276-281).
- **Live** (`diveprobe.mjs`): the Ashwing's dive hit her at 0.5, 1.0, 1.4, 1.7 and 1.9 m from its line's axis, and missed at 2.1 and 2.4 m. The line is drawn 1.2 m each side.

| dash | drawn half-width | hit half-width |
|---|---|---|
| Ashwing dive | 1.2 | ~2.0 |
| Hammerhorn rush | 1.3 | 2.2 |
| Smoke-eater grab | 0.7 | 1.6 |
| Ivar's Long Road | 1.3 | 1.8 |
| Act I-III: Stonewarden charge | 1.6 | 2.65 |
| Act I-III: Amberback | 1.2 | 2.05 |
| Act I-III: Silverhorn | 1.5 | 2.65 |

- **Why it is worse in Act IV.** The Ashwing is never in reach in the sky and follows the hero across the Field, faster than she runs, with no leash. It dives every ~13 s for 1.3× and a push of 22, so a player who steps just clear of the drawn line is hit anyway, again and again.
- **Fix:** draw the line at `2 × (a.radius + 1.05)`, or test the hit against the drawn width.

## 9. Ember Ticks (design rule)

- **The rules** (ai.js:1731-1786, combat.js:231-291):
  - At most 2 cling. Each burns 0.45× a second and slows her 25%.
  - After 3 s a tick bursts for 1.6×, burn 0.6× and a 2.5 m fire.
  - A clinging tick cannot be hit (combat.js:47), so area damage never clears it. Only a dodge does (skills.js:404).
- **The phone problem.**
  - A shaken tick is stunned for 1.5 s, but its leap cooldown (2.8-3.6 s from its last crouch, ai.js:1768) has already run out. It crouches 0.6 s, leaps, and clings again.
  - A brood is 4-6, buried until she is within 9 m, and the whole brood surfaces at once.
  - The dodge cooldowns: Warden 2.2 s, Ranger 1.6 s, Mage 3.0 s (data.js:45). The Mage cannot keep up with a brood.
  - The rule is taught once, by a toast (combat.js:241).
- **Size.** An unshaken pair costs 2 × (3 × 0.45 + 1.6 + 0.6) = 7.1× the tick's damage, about 4.3× an ordinary 1.0× blow, in 3 s.
- **Acts I-III:** the closest rule is amber sap's root, capped at 1.2 s with 1.8 s of immunity after (combat.js:156-167). The ticks have no immunity window.

## 10. Fire arrows burn where they hit her (side effect)

- **Code.** `endProj` drops the fire patch wherever the arrow ends, also when it ends on the hero (projectiles.js:83-84). The patch's first tick is immediate (tickT 0) and does 0.22× of the arrow's damage. Its radius reaches her up to 1.7 m.
- **Size.** Every Ash-Fallen bowman hit does +0.22× at once. A Warden holding a spear line in melee stands in it for 3-4 ticks, up to +0.88×; the Cradle's drinking halves the patch's time.
- **Where:** ashBowmen packs, ashLine packs (2 of 9), the Hall of Moulds and Karthax's Host.
- The design wanted patches "the Cradle can drink" as a risk-and-reward fuel. Landing one under the hero on every hit was probably not meant.
- **Acts I-III:** the Rootsworn's arrow only slows.

## 11. Ashsmiths and the Hall of Moulds (design hot-spot)

- **Rares bring three more smiths.** A rare pack's kind is the pack's lead (world.js:292), and the lead of smiths, mouldHall and bellowsWave is the Ashsmith. So a rare means a rare Ashsmith with 3 affixes, plus 3 Ashsmith minions. The Hall of Moulds is always elite (60% rare, gen4.js:817).
- **Reforging.** Four smiths can reforge 12 fallen, each with +40% life and armoured: 1.94× effective life (ai.js:1869-1879).
- **The moulds.** An aggroed smith within 8 m of a mould raises an Ash-Fallen, then waits 25 s (ai.js:1808-1826, :1858, :1864), with no cap and no leash. A hero who backs off to drink or wait keeps getting more. There are 3 moulds in the hall and 2 in the workshop.
- **The phone problem.** The smiths keep 6-9 m back, and auto-aim picks the nearest foe, so the smiths are the last thing a touch player hits. The design wanted "kill smiths first".
- **Also in the hall:** two brood pools (8-12 ticks) and the drips of §3.

## 12. Phone readability and control (qualitative)

- **One-second touches** (world.js:762-775) are new in Act IV: waylamps, Ivar's braziers, the bellows' fire-pit. They refuse to start while any action runs (holding attack) and break on any blow. In Ivar's dark and in the bellows defence the hero is hit about every second, so a relight usually means clearing the room first. The bellows' timer only pauses, it does not fail (world.js:804-815).
- **Shrouded foes are drawn darker on purpose** (ai.js:119-127): tint 0x4a4e58 ×1.6 and black smoke, outside light, in the Act's darkest zone. The ashfield's hero light reaches 10 m against 13-16 m elsewhere (atmos.js). A Lampless's pale cone dims to 0.3 once it fights.
- **The darkness of the boss phases:** in Ivar's dark the hero's light falls to 42% of its reach and intensity; in Karthax's last fire to 30% of its reach and 12% (light.js:226-228). Telegraphs are additive, so they still show; bodies and the floor do not.
- **The camera** (gfx.js:96-98): portrait pulls back, but leaves only about ±4 m of world either side of the hero. In landscape it is about ±11 m across and ±6 m up and down. The same in every act, but Act IV leans most on threats that start far off: the Ashwing's 10 m orbit, the Ashsmiths at 6-9 m, the bowmen at 12 m, and lines of 10-20 m (Tongs, the Long Road, the Gaze, Hammerhorn rushes).
- **The bellows defence** (world.js:783-830):
  - 2 waves × 2 doors × 3 = 12 monsters within 9 s, plus Smoke-eaters, in a 9 m room. About 1.8 smiths come with them and reforge there.
  - A death ends the run but leaves the waves standing, and a restart adds 12 more. Acts I-III have no timed wave defence; the Heartroots are guarded nodes.

## Checked and fine (no change needed)

- **Statuses do not stack.**
  - Burn and poison keep the higher rate and refresh 3 s (combat.js:91, :143).
  - Slow takes the max; root is capped at 1.2 s and gives immunity after.
  - Seen takes the max of the times, not the sum (combat.js:225-230). It expires; it persists through a death, which is harmless.
- **Clinging** is capped at 2 and let go on a death or a zone change (combat.js:259-269). The burst kills the tick.
- **The Breath** hits once per breath (`f.hit`, forge.js:95-99). Iframes delay it but do not cancel it, which is correct for a 1.2 s fire. Cover via `map.los` works for alcoves, pillars and bays.
- **No level or difficulty is applied twice.** The bosses use max(zone+2 or 3, hero+1) (world.js:258). Reforges keep the dead foe's level (and drop its elite status), mould raises and bellows waves use the hero's level, and summoned adds are boss level −2.
- **Armoured is applied once** (the flag), even when a reforge adds the affix as well.
- **Elites are not more frequent:** 3.1 elite packs in the Field and 2.0 in the Forge, against 3.0 and 3.4 in the Weeping Woods and the Heartwood (`packs.json`). The difference is which creatures carry them (§5, §11, §4).
- **Pack sizes match the design** (ticks 4-6, Ash-Fallen lines 5-7). Density is the Act III scale (57 monsters on 21,504 cells against 59 on 19,712).
- **Affixes** are drawn without repeats (actors.js:369).
- **A boss keeps its life across a death**, in every act (no reset anywhere). Karthax's phase and cages persist too, so retries get shorter.
- **The Seen and Shroud timers** (revealed, unshroud, shroudTxt) all count down in updateActors (ai.js:69-73).
- **Potions** (18 s, 60%), globes (7% normal, 100% elites and bosses, 25% heal) and regeneration (0.4% a second plus regen) are the same in every act.
- **The difficulty switch** works: town only, and it rebuilds the zones. The Breath is 12% on Wanderer, against 20% on every harder difficulty.

## Fixes in order of payoff (for the fix step)

1. Karthax: shorten or soften phase 2.
   - Hammerfall at the designed 7 s, or a 1.3-1.6 s wind-up in every phase.
   - Keep the damage dealt in phase 2: do not reset his life to 29.9% (ai.js:2270).
   - Give the last fire a ring of 2.5 m like Ivar's.
   - Let phase 3 raise a few adds, so it gives globes.
2. Drips off the Anvil and the Hall of Moulds (§3), and `!a.cling && !a.airborne` for affixes (§4). Both are pure bugs.
3. Save and restore the waylamp checkpoint, and use waypoint 2 for a respawn (§7).
4. The Breath: 15% (9% Wanderer) or no heat shortening on the north gallery once heat is 3; or a lamp or second waypoint on the north chamber, so a Karthax retry does not walk the flue.
5. The guard: let the Warden's third swing pass it (`area: true` in its damage call) and the Ranger's multishot count as area; or show a "Blocked" text so a touch player learns to flank.
6. Ivar's dark: walk to 2.5 m (or a 3.5 m light); the sweep snuffs only braziers he faces, not the one behind her; touches allowed during an attack.
7. Dash telegraphs drawn at the hit width (§8). After a shake-off, a tick's leap cooldown restarts.
