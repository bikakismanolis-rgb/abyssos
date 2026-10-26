# Progression work: progress notes (for a restart)

Branch `claude/skotos-progression` (from `claude/skotos-live`, v12). Dev server: `npx vite --config tools/vite.nohmr.mjs --port 5231`.
Baseline balance: a worktree of v12 at /tmp/claude-0/base served on 5232, plan /tmp/claude-0/bal/plan.json, output before.jsonl
(lost on a restart: re-create with `git worktree add /tmp/claude-0/base c70d65d`).

## Design (decided)
- One pool of points (`h.points`): one per level (49 by 50) and one per Mastery level after 50. Spent on skill ranks (2-5),
  variants, and Mastery ranks. Total ever earned = (level-1) + mastery level, which is what a respec gives back.
- Skills: the four of today + three new per class at levels 20, 30, 40 (ranks 1-5, rank 1 free on unlock). Loadout
  `h.loadout` = four skill ids on the phone's buttons (default: today's four). Cooldowns kept per skill (pl.cds by skill index).
- Variants: two per original skill (24 in all). Each needs the skill at rank 5 and costs 1 point; one active per skill
  (`h.variant[id]` = 0 base, 1 or 2), switchable in town. `h.vars[id]` = bitmask of unlocked variants.
- Mastery: 12 tracks, bonus(r) = max * (1 - exp(-r / k)), so first ranks are small and the tail is endless but bounded.
  After level 50 XP keeps counting into Mastery levels (`h.mlvl`, `h.mxp`), each a little more XP than the last.
- Respec (town, gold): all points back.
- New code in new files where possible (src/game/mastery.js, src/game/skillsx.js) to ease porting onto the Act V branch.

## Done
- data.js (new skills, VARIANTS, LOADOUT, mxpToNext), progression.js (rules, Mastery, migrate), skillsx.js (24 variants,
  9 later skills), skills.js (slots, per-skill cooldowns, dispatch), projectiles.js (onTick/look hooks, 'custom' areas),
  combat.js (Mastery XP, challenge/alpha), ai.js (taunt), hud.js (loadout buttons, Mastery badge/bar), progpanel.js +
  CSS (the new skills panel), text.js (all strings), boot.js (migrate, ?mlvl=).
- Scenarios: `progpanel` (panels at 844x390), `skillsfx` (every skill/variant at dummies: CLS=..., ONLY=...).
- balance-act.mjs: job.mast / job.variant / job.loadout / job.mlvl; ready() reads the loadout.
- Baseline balance (v12): /tmp/claude-0/bal/before.jsonl (48 jobs: Acts III-IV zones and bosses, 3 classes, 2 runs).

- skillsfx run for all three classes; tuning committed (Maelstrom, Dawnbreaker, Charge, Volley, Scatter, Split, Trap,
  Beam, Frozen Orb, Shower, Shatter); hawks and Bulwark's dome restyled.
- Balance after (6 runs/job): README table; per job in balance-acts3-4.txt.

- Full scenario suite passes; old-save migration verified; artifact built; strict CSP clean on desktop and mobile;
  release.md written.

- Review (three reviewers, 22 findings, all confirmed and fixed): area looks/lights (projectiles.js), the Vault/Charge
  cut short (player.js), Bulwark and the Alpha across a waypoint or a death, the second variant's take-up, dim variant
  fires in a boss's darkness (light.js), Ember Dance/Shatter/Blizzard/Volley/Hawks/Alpha re-tuned (README), the loadout
  swap's cooldown out of town, Leech fractions, and the panel on phones (scroll kept, names, +5, respec reason, New tag).

## Next
- Nothing open: waiting for the lead to merge. Owner decisions in questions.md.
