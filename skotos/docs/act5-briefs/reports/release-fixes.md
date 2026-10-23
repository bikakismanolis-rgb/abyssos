# Act V release fixes (the last problems before Act V goes live)

Branch `claude/skotos-act5-fixes` from ca88dd3. Four problems: perf5 at the coast, the Act V checkpoint after Continue,
the flaky `holes` and `tower` scenarios, and runtime errors only the on-screen `#fatal` box shows.

## Progress
- 14:40 started; npm install, graphify; private no-HMR dev server on :5401.
- 14:55 `tools/fatal.mjs` (the shared #fatal check) wired into scenario.mjs, soak5.mjs and coop.mjs; checked with a
  timer that throws (caught, with its stack).
