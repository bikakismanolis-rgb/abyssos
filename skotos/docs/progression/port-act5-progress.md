# Porting the progression onto the Act V line: progress

Branch `claude/skotos-act5-prog`, from `claude/sleepy-tesla-4030vd` at ca88dd3. The write-up is `port-act5.md`.
Dev server for the runs: `npx vite --config tools/vite.nohmr.mjs --port 5321` (BASE=http://localhost:5321/).

## Done
- [x] `git diff c70d65d ff37476 -- skotos/` applied with `git apply -3`; 11 files conflicted, all resolved keeping both
      sides. Builds.
- [x] `tools/fatal.mjs`: scenario.mjs, coop.mjs and soak5.mjs fail on any `#fatal` text (`fatalcheck` proves it).
- [x] Six difficulties: the progression has no per-difficulty table and no clamp on `h.diff`.
- [x] Act V hooks in skillsx.js (cracks, refreezes, frostNova, `crackRing`), Ember Dance `nowarm`, following effects end
      quietly when the hero is downed. `skills5` passes for all three classes.
- [x] Co-op: guest events `pu`/`ta`/`ic` checked by the host; a guest's timers and shot/area callbacks mirrored; LOOKS
      and VIS by name, `visEnd`; `targetOf` honours a taunt; a companion's fire is no light in a boss's darkness; the blow
      cap knows Mastery and crit damage. `coop.mjs prog` (four players) passes; byte budget in port-act5.md.
- [x] Text complete in both languages; `migrateHero` fixes (two buttons, a variant never learnt); `save13` passes;
      progpanel at 844x390 touch looked at.
- [x] Balance: 288 runs (Act IV and V, three classes, with and without Mastery, n 6), `docs/progression/balance5/`.
      Act V stays a step up; the Ranger's step grows most (for the lead).
- [x] Regression: every Act I-V, progression and co-op scenario; the failures compared with the base (ca88dd3) in a
      worktree: none is the port's (table in port-act5.md).
- [x] graphify updated and committed.

## For the lead
- The Ranger's Act V step with Mastery (port-act5.md, Balance).
- The co-op blow cap's level ceiling (3 696 at level 50) is under a well-geared level-50 hero's weapon damage with or
  without Mastery (port-act5.md, The blow cap).
- `skotos` and `ending5` fail on the base line as well; `ice`, `shallowtele`, `tide`, `coop.mjs revive` are flaky on both.
