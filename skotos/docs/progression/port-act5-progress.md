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

- [x] `coop.mjs prog` passes (four players on the Farthest Light): taunt, pull, ring crack, refreeze on the host; VIS on
      every page and ended; 20 s heavy load under budget (peak 10-13 sends/s); nothing refused; host lands what guests sent.
      A boss's darkness check added (a guest's fire on the host is a hero fire: light only as it bursts) after the fix.
- [x] The blow cap: measured (scratch cap.mjs) and made Mastery-aware (claimed crit damage and Mastery level).
- [x] test-transport passes; graphify updated (3480 nodes), crackAt/refreezeAt/crackLine callers checked with `affected`.

## In progress
- [ ] Balance: Act IV (Field L34, Ivar L35, Forge L37, Karthax L38) and Act V (coast 42, Tower 43, farlight 45, Skotos 46),
      Warden difficulty, 3 classes, without and with Mastery: n 3 done (scratch bal/r1.jsonl, sum.mjs), n 6 running.
      n 3: Mastery takes 30-46% off Act IV's damage and next to nothing off Act V's (its hazards are % of life), so Act V's
      step over Act IV grows with Mastery; my Act IV profile is not the integrator's (my Warden's Act IV zones 3.78 lives
      against its 1.60), so the change Mastery makes is what is compared, not my absolute ratios.
- [ ] Regression (scratch reg/run.sh, list1 then list2) queued behind the balance.

## Next
- [ ] progpanel at 844x390 TOUCH=1 (in list1): look at the shots
- [ ] port-act5.md: fill the results; graphify update; final commit
