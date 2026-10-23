# Porting the progression onto the Act V line: progress

Branch `claude/skotos-act5-prog`, from `claude/sleepy-tesla-4030vd` at ca88dd3. The final write-up is `port-act5.md`.
Dev server for the runs: `npx vite --config tools/vite.nohmr.mjs --port 5321` (BASE=http://localhost:5321/).

## Done
- [x] `git diff c70d65d ff37476 -- skotos/` applied with `git apply -3`; 11 files conflicted, all resolved keeping both
      sides (list in port-act5.md). Builds.
- [x] `tools/fatal.mjs`: scenario.mjs, coop.mjs and soak5.mjs fail on any `#fatal` text (`fatalcheck` scenario proves it).
- [x] Six difficulties: the progression has no per-difficulty table and no clamp on `h.diff` (checked across the diff).
- [x] Act V hooks in skillsx.js (cracks, refreezes, frostNova, `crackRing` in ice.js), Ember Dance `nowarm`, following
      effects end quietly when the hero is downed. `skills5` scenario passes for all three classes.
- [x] Co-op game side: guest events `pu`/`ta`/`ic` (host checks: foeNear, rates, sizes), timers and shot/area callbacks
      mirrored on a guest, LOOKS by name, VIS builders + `visEnd`, `targetOf` honours a taunt's `tauntBy`.
- [x] Text: every key the progression reads exists in Greek and English (scratch check).
- [x] migrateHero: a skill on two buttons, a variant never learnt (found writing `save13`).

## In progress
- [ ] `node tools/coop.mjs prog` (four players, Farthest Light): first run showed guests never cast (the blessing panel
      the host's story opens on a guest); scenario now closes panels before casting. Re-running.
- [ ] `save13` scenario (v13 hero, Act V hero on Skotos, odd books) written, not yet run.

## Next
- [ ] the anti-cheat cap against an endgame hero with Mastery (crit damage is not in the claimed `dm`)
- [ ] progpanel at 844x390 TOUCH=1, skillsfx per class, progress
- [ ] Act I-V scenarios, every co-op scenario, test-transport
- [ ] balance of Act V with Mastery (balance-act.mjs), against integrate.md's curve
- [ ] port-act5.md; graphify update
