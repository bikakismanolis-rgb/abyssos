# Progression review: fixes (worktree prog/skotos, branch claude/skotos-progression, uncommitted)

Every finding was reproduced on the unfixed code first (progrev/fix/before/*), then fixed, then re-checked (progrev/fix/after/*).
Tools: progrev/fix/check.mjs (looks, light leak, swap, panel, vault, alpha, bulwark), progrev/fix/meas.mjs (the reviewers'
dummy harness) with tr-*.json / tr2-*.json, progrev/fix/names.mjs (names cut, 3 classes x 2 languages x 7 sizes),
progrev/fix/ui2.mjs (the visible notes), progrev/unit.mjs and progrev/fix/leech.mjs (node).

## Findings (one line each)

1. projectiles.js:224 area looks chain hung off the move line: FIXED. The move is its own statement again, then `if (a.look) ... else if (kind) ...`. Moving tornado 0 -> 90 particles (still one 96); rain with its own look 64 -> 0 arrow-rain particles; fire with its own look draws only its own (orange back to the town's baseline ~11 vs 32 for a plain fire).
2. skillsx.js:651 Vault cut short left her in the air: FIXED. `vault` and `charge` join `leap` in player.js busyHard and in dodge()'s guard; and player.js now puts her down (`pl.y = 0`, avatar too) on any frame no leap/Vault is running, so the tongs (`pl.act = null`) and a death mid-vault land her. Before: y 0.72 (skill) / 1.2 (roll) for good; after: 0 in all three cases (skill press ignored, roll refused, act dropped -> 0 the next frame).
3. skillsx.js:584 Bulwark shield survived a zone change: FIXED. Its dispose() (runs on both paths) clears `pl.shield` and `buffs.bulwark`. Before: shield 292 in the forest with no area; after: 0.
4. skillsx.js:443 Alpha +15% outlived the wolf: FIXED (same root as 8 and 18). player.js drops `buffs.alpha` on any frame no live Alpha pet exists (killed, run out, left at a waypoint). Before: 28.2 s left with 0 wolves; after: gone with the wolf (killed, and on a zone change), HUD icon gone.
5. progression.js:72 a second variant learnt out of town was taken up: FIXED. Taken up only when it is the first owned (`bits(h.vars[id]) === 1`). unit.mjs: 2 -> 0 (stays on the base); bookkeeping still 0 mismatches; progpanel scenario unchanged (learns 1 and 2 in town, chooses 2).
6. text.js:80 Rallying Cry said 25%, healed 34%: FIXED. The heal is a flat 34% (the variant is only ever played at rank 5) and both languages say 34%.
7. skillsx.js:190/255 Rain of Fire and Pale Cinder lit a boss's darkness: FIXED at the root. `area()` takes `o.dim`; light.js lightAt never counts a dim hero fire while a boss's darkness is on (S.over != null); Rain of Fire, Pale Cinder and Ember Dance fires are dim. Dummy under setHeroLight(3.5): Rain of Fire revealed 96% -> 0% (damage 349 -> 132; base Rain 0%, 86); Pale Cinder 94% -> 0% (1029 -> 289); Meteor unchanged 53% -> 52% (v12's 0.5 s flare). The ivar scenario passes (phase 1 Shrouded, braziers unveil him).
8. skillsx.js:443 Alpha a strict upgrade: FIXED. Buff tied to the wolf (4), and the Alpha bites for 0.6x instead of 1.7x (text: it bites lighter than the spectral wolf). Lone dummy 16 s: base wolf 215/249, Alpha wolf 148/168 (0.68x) plus +15% on all her own blows (about +135 per 16 s with Multishot on one target, so about +25-35% overall on one target; less with Piercing Shot). Not the reviewer's 1.15-1.2: at 1.15 the Alpha wolf alone is about +30% over the base wolf before the aura.
9. skillsx.js:76 Ember Dance stacked ~9 patches on a boss: FIXED. One patch under her burns on while she spins in place (its duration refreshed); a new one only once she has moved 1.4 m off it. Lone boss 16 s: base 735 / Ember 1652 (+125%) -> base 713,740 / Ember 757,761 (+4%); ring of 7: -13% (was +15%); Maelstrom -28%.
10. skillsx.js:260 both Frost Nova variants more than doubled the base: FIXED. Shatter bursts for 0.6x (was 1.2x) with no forced crit (bosses still burst: their freeze is cut to 30%); Blizzard ticks for 0.07x (was 0.2x). Ring 16 s: base 802,811 / Shatter 932,952 (+17%) / Blizzard 967,966 (+20%) (was +148% / +152%). Boss: base 117,126 / Shatter 130,145 (+13%) / Blizzard 133,147 (+15%) (was +130% / +233%).
11. skillsx.js:675 Storm of Hawks ~82x weapon damage: FIXED. data.js hawks dmg 1.1 -> 0.4 (per dive). One cast on one dummy: 1215 -> 481,484 (boss-sized 461,502); Piercing Shot cast whenever ready 16 s: 456,505 (boss 423,503). The dive rate and the AoE are kept.
12. skillsx.js:168 Tight Volley +66-139%: FIXED. 0.45x per bolt (was 0.6x), each pierces two (was three; text says two). Ring 16 s: base 1481,1685 / Volley 1935,2028 (+25%); wide ring (3.2 m) 1730,1985 / 1881,2079 (+7%); boss-sized 909,1035 / 935,1024 (+1%). (One run's wide ring put the line past most dummies: -53%; the line is the trade.)
13. progpanel.js:104 loadout swapped mid-fight while paused: FIXED. Out of town, a skill brought onto the buttons (not one moved between two buttons) comes in on its whole cooldown; a line under the 1-4 chips says so (only out of town, only for a skill not on a button). Before: Rift cast at once after the swap; after: Rift cd 9.67 s, the press does nothing, HUD shows 10; in town a swap is free (Meteor cd 0). questions.md item 3 and README updated.
14. progression.js:26 Leech rounded to +0 at low levels: FIXED. The value is no longer rounded (combat.js heals fractions); the tile shows 2 decimals under 1, 1 under 10. L2 rank 1: +0 -> +0.13; L7: +0.46; every rank adds something at every level.
15. panels.js:244 every tap scrolled the panel back to the top: FIXED. render() keeps `.pn-b`'s scrollTop when the same panel and tab are drawn again (reset on open). 667x375 Mastery: scrolled 147, tap +1 on Seeker -> still 147 (was 0).
16. projectiles.js:223 (duplicate of 1): FIXED by 1.
17. projectiles.js:180 an area's own light leaked the kind's light: FIXED. `o.light` takes the place of the kind's light (fire, tornado, amberDust, coldFire add theirs only when there is none). Three pale-light fire areas: sources 16 -> 22 -> 19 with 3 pale lights left (before); 16 -> 19 -> 16 with 0 left (after).
18. skillsx.js:443 (duplicate of 4): FIXED by 4.
19. style.css:362 names cut on phones: FIXED. Soft hyphens in the long names (text.js: Earth-splitter, Dawn-breaker, Διαπερα-στική, Μετεω-ρίτης), `overflow-wrap: anywhere` as a last resort, line-height 1.2 (descenders were clipped), 9.8 px under 700 px wide so "Συνδυασμός Λεπίδας" keeps to two lines, and the 4-column Mastery grid up to 860 px. names.mjs: 3 classes x el/en x 667x375, 740x360, 780x360, 800x360, 844x390, 915x412, 1280x720: 0 cut (was e.g. Earthsplitter 69/54, ΖΩΤΙΚΌΤΗ… at 800x360).
20. progpanel.js:81 respec disabled with no visible reason: FIXED. When points are spent and it cannot be had, a line under the button says why ("Only in town", or "You have 40 gold" in town).
21. progpanel.js:92 +1/+5 small and +5 vanishing under the finger: FIXED. +5 is always drawn (disabled under 5 points), and on a touch screen (pointer: coarse) the +1/+5 buttons are at least 40x36 (were 29x24). After +5 with 7 points, the button under the finger is the disabled +5 (was the +1).
22. progpanel.js:49 New tag stayed on the tile just tapped: FIXED. skills() marks the selected later skill seen before the tiles are drawn. After the tap the tile has no New tag (was still tagged).

## Re-runs (dev server :5297, tools/vite.nohmr.mjs; one browser at a time)

- `npx vite build --logLevel error`: clean (exit 0, no output).
- Scenarios (BASE=http://localhost:5297/), all exit 0 with no page or console errors:
  progpanel (844x390) ok; progress ok (climb to 50 + Mastery 13, points 62 = earned 62; old save migrated);
  skillsfx warden ok (1783 s); skillsfx ranger ok (2160 s; a first try hit my 1800 s timeout under the machine's load and was re-run with 4000 s); skillsfx mage ok (2367 s);
  panels "ok"; combat ok (8 kills, level 7); ranger ok (wolf out); mage ok; boons ok; karthax ok (all phases, crownUnmade);
  ivar ok (phase 1 Shrouded at 3.5 m, braziers unveil, Ivar down); ashfield ok; forge ok (three bellows runs, quest 21).
- node: progrev/unit.mjs (variant rule fixed, 0 bookkeeping mismatches in 2000 random heroes), fix/leech.mjs.
- UI notes (fix/ui2.mjs): Rift selected in a zone shows "Out of town it goes on a button with its whole cooldown" (not for
  a 0-cooldown skill, not in town); respec in town with 40 gold shows "You have 40 gold"; with enough gold no line.
- Logs: progrev/fix/scen/*.log (+ summary-run1.txt: the first pass, cut short when the dev server's 2-hour background
  limit stopped it; summary-run2.txt and summary.txt: the re-runs). The dev server is stopped.
- docs/progression/release.md rebuilt: `npm run build:artifact` on the fixed tree and on `git archive c70d65d` (in
  progrev, removed after); the 13 removed v12 names are unchanged, the 13 added names are new hashes (listed there);
  `skotos/artifact/` holds the fixed build. The strict-CSP check was not repeated (no new resource or URL).

## Files changed (against HEAD 18e2359)
src/game/projectiles.js, light.js, player.js, skills.js (dodge guard), skillsx.js, progression.js, data.js (hawks dmg),
src/ui/progpanel.js, panels.js (render scroll), style.css, src/i18n/text.js, docs/progression/README.md, questions.md,
progress.md, release.md. Not committed (the lead commits).
