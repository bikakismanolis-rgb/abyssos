# Act VI stage E: the release checks (report, 16 November 2026)

Branch `claude/sleepy-tesla-4030vd` (main merged in: its one commit, docs). **Nothing is published.** The builds and the
whole test set were run; G5 asks that everything passes, and not everything does, so the owner decides.

## Built

- `npm run build:artifact`: 142 files, 64 MB, the largest 3.8 MB (the limit is 16 MB a file).
- The strict CSP (HANDOFF's policy, `tools/csp-server.mjs`), desktop 1280 x 720 and a touch phone 844 x 390: the title,
  the village, the Drained Sea and the Bottom. No CSP violation, no console or page error, no `#fatal`, every model
  textured (the pictures read).
- `npm run build:web`: builds (50 MB).
- `SAVE_FMT` stays 1 and co-op `VER` 5, as the contract's order has it (no public build may write format 2 before a
  public build refuses it: this is the first public build with the check).

## The test set (134 runs: 100 scenarios with their class variants, 22 co-op, 12 tools)

Two at a time, then every failure again alone; the long and the timed ones alone (unload6, tremble6, perf5, play5,
perf6, soak5). A failure was then run on the code before this week's changes (3fa5c9b), and where it mattered on main
(the live build).

**Pass:** everything not named below. Among it: every Act VI scenario of stages B-D (ketos and shade for the three
classes, carry, blackwater, drips, names6, lure, leg6, diff6b, foes6, prog6, cast6, darktele, peaks6, way6, wake6,
keyx6, ending6, echo6, lost6, catch6, gate6, drained, hook6, save15), Acts I-V's, progression, saves (save13, save14,
save15, cloud, cloudweb, transfer), all 22 co-op runs (LocalTransport, the room, `NET=supa`), the transports, the two
migrations, cloud sync, the layout checks of Acts III-VI, the Field's parity, unload6, perf5, and **perf6 at q1: 0.62 to
0.94 of the Field at the five spots** (hollows 0.879, mere 0.620, wood 0.937, village 0.942, hearth 0.622).

**Fixed here:** `cloud` counted the quiet graphics report's document (`gfx/report.js`, main's 9aed565) as a third save;
it now counts the heroes' two. Passes.

**Fail the same way before this week's changes (not from them):**

| test | what fails | reading |
|---|---|---|
| `ground6`, `look6`, `place6` | stage A's own checks of the bare zones (an "unwritten" pack, walks to places the story now holds shut, the First's marks, the stones' first state) | written for stage A's empty zones; stages B-D filled them. Not in regress-B, C or D. Out of date |
| `resume`, part `fall`, check e | Continue is expected in the Weeping Woods; the hero is in the village | main's "Start in the village" (8c34ada) changed that on purpose. Out of date. The other eleven parts pass |
| `diagcheck` | the kept graphics snapshot after a lost context | fails on 3fa5c9b too; not looked into further |
| `tremble6` | the light's tremble: the worst pixel of a pool swings 0.094 (q0) and 0.120 (q1) of the maximum luminance against the limit of 0.10 (stage A measured 0.088); the flashing pixels are 0.008% of the screen against a limit of 2.78% | the same on 3fa5c9b (0.098, 0.115). **A real overrun of the project's own limit, small and on a few pixels; "reduce flicker" in Settings is there.** The owner's phone run was to read the flicker anyway |
| `play5` | the Act V play-through's bot stops at "the fall light and its memory" | the same on 3fa5c9b **and on main**. The `coast`, `tower`, `skotos`, `ending5` scenarios, which cross the same story, pass |

**Passed on a second try:**

- `skotos`: failed its first two runs (once two tests ran together, once alone: the bot took 20 minutes over the first
  phase, then never finished), then passed four in a row; five of five on 3fa5c9b and main. No Act V code changed this
  week. Unexplained.
- `soak5`, the tide: the hero stuck on one cell at the map's edge once in twenty cycles; the same seed then passed on
  this branch and on main.
- `transfer`, `ketos` (the Warden's two missed windows): failed with another test running beside them, pass alone.
- `fatalcheck` reports `pass: false` by design.

**Not run:** a `play6` (the contract names one; no such scenario exists, the Act VI story is covered by stage D's eight).

## Left for the owner

1. Whether to publish with the list above as it is.
2. The phone run of both zones (G5), the flicker with and without "reduce flicker" (see tremble6), before any Play Store
   build; the reading of the key Greek lines; the phone test of the Frozen Coast.

To publish: `artifact/index.html` to the artifact "Σκότος" with the files map (the new hashed files, the removed ones
null); the web build goes out when this branch is merged into `main` (the Pages workflow builds it).
