# Act VII: the brief the three proposals were written to (17 November 2026)

The owner's word (17 November): Act VI is published (v22); begin the next act and do not stop for questions; decisions
are taken on the recommendation and listed for him afterwards (`owner-questions-el.md`).

The method is Act VI's: three independent proposals (story-first, production-first, systems-first,
`proposal-*.md`), two judges, one design (`docs/act7-design.md`), then the contract and the stages.

## The frame (Acts V and VI's)

- From a save at quest 39 (`act6`): the First named «Φέρουσα», her fire relit at the bottom of the Gates, the Skotos
  asleep, the six peaks burning, nobody keeping watch alone. Quests 40-46; the new end state 47.
- 2 zones on one new generator (`src/world/gen7.js`); about 7 regular enemy entries, shipped models first (one new
  creature download at most, with a no-download fallback); 2 bosses; 3 mechanics, each a shipped system with one new
  input; a world-state chain; optional collectibles; 3 blessings, 2 echoes, 2 first-kill legendaries; a few themes.
- The first act played wholly at the level cap (50, Mastery): it needs its own reason to keep playing.
- Phone-first: no new rendering system, no render target, no post-processing, no ceiling in play (pitch 0.95 rad);
  110 MB at a cold start; each spot no dearer than the Field of Ash at the same quality.
- Canon: Karthax gone and unnamed to children; Isarn gone for good; the Skotos a neuter force, asleep; nothing that
  reads as Dark Souls; the Shadow Gates play as they do; Greek first, then English, in canon §5's voice.

## What Act VI's last week taught (binding on Act VII)

1. **Bosses of 2-4 minutes, no least-time locks.** Act VI's ran 5-7 minutes and 80-150 small blows a fight
   (`act6-briefs/reports/balance-report.md`). Difficulty comes from a few readable moments, the same for the three
   classes; the damage of the act about x1.2-1.45 the one before; the easy difficulty really easier (pace and blows,
   not only numbers).
2. **A measure of danger that means something at the cap:** lowest life, deaths, time under 30%, beside the lives of
   damage (a capped hero heals chip damage back).
3. **Zones worth fighting at the cap** (Act VI's cost a capped hero 0.05-0.33 lives a run).
4. **Tests that stay true.** Stage A's own tests (ground6, look6, place6) went stale when later stages filled the
   zones (`stageE-report.md`): each stage's tests are written against the finished act's state, or are retired by name
   at the stage that outdates them.
5. **A look that is not a third blue act.** Acts V and VI were ice and dark.
