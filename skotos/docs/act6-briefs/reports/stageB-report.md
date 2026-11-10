# Act VI stage B: report (10 November 2026)

One session did every lane of stage B in turn on `claude/sleepy-tesla-4030vd` (no parallel agents); the lanes' file
ownership was kept for where things live. The detail, file by file, is in `stageB-progress.md`. This report gives the
state against G2, what differs from the contract, and what is left.

## What is in

- **Systems:** the Carried Fire (light.js), the black water's clock, the Mere's own level and slush (tide.js), the vault's
  icicles and shards (forge.js), the Names from Above (light.js, story.js `rollNames6`), the Cold's new sources and sinks
  (cold.js), the act's Shroud (combat.js), the skills' ground blows on the vault (skills.js, skillsx.js), the build's
  fires and the skylights as pools (`fireEnter`).
- **Combat:** the Lampbearer, the Faded, the Gate-Fallen and its Bowman, the Falselight, the Ketling (data.js rows, ai.js
  traits and AIs), the ten packs, BOONS[6], the two legendaries and `legKey`, `actHaz`, the kill refills, lightRest, the
  stand-ins (actors.js), the class hooks below the ice.
- **Progression:** the Lamplight track (13th Mastery row, `ringPct`, `lampBonus` on every base ring).
- **Net:** protocol 5 (`VER = 5`): rings, light pools, the Mere, the names' window, the shards and slush on 'i', the Drink
  and ring blows on a guest, the lit bit, act6 in the world, the act's bosses for pay, the vendors below the ice.
- **HUD hooks:** the flame beside the Cold, the violet dial.

## G2 (run in this session; one browser at a time, a no-HMR dev server)

| item | result |
|---|---|
| `carry`, `blackwater`, `drips`, `names6`, `lure` | pass (as functional scenarios; not yet as long soaks) |
| `foes6` (this lane's own: the new creatures) | pass |
| `cast6` (stand-ins in a cold session) | pass: the Falselight as the spider, the Ketling as the Icemaw, the Faded as a villager |
| `prog6` | pass: 13 tiles at 844 x 390; Act IV 6 -> 7.9 m at rank 40, under the swell; FIRE.max 5.92 m; S.over unscaled |
| `coop.mjs act6` | pass (16 checks) |
| `coop.mjs darktele`/`darkmirror` | darkmirror pass |
| new phone texture | none added (every new body is a stand-in; no silt pack yet) |
| perf6 (short: q1, 2 cycles, seeds 2,1,1) | pass, vsField hollows 0.879, mere 0.918, wood 0.94, village 0.978, hearth 0.685 (G1's full run: 0.867 / 0.738 / 0.825 / 0.893 / 0.660). The village sits close to the 1.00 bar: run the full perf6 (about 65 min) before closing G2 |
| regress-B (done) | coast, tower, tide (4 cycles), ashfield, combat, ranger, mage, skillsfx, progpanel, test-sync (263), coop join, act5, world, loot, cheat, test-transport: pass or no fault (the older scenarios print numbers, not a pass) |
| regress-B (not yet) | skills5, progress, diff6, cp5; coop pack, four, bosses; `NET=supa` join, four, cheat; the Budget on `NET=supa four` |

## Different from the contract (to be judged by the lead)

- **No downloads** from this container: the Ketos and the Falselight have no built bodies (`tools/creatures/act6`); their
  stand-ins hold (`cast6`). pack-silt is not built either; its layers' chains stand in (rime), as at stage A.
- **The relight** is a second standing in true lamp light, not a tap on an interactable (the act's lit things are not yet
  interactables with `use`; stage D can add the tap).
- **The Lampbearer's lamp** is the code sea-lantern with a dark violet flame (`blackLamp` in models.js), not the rime
  pack's oilLamp; **the Faded's blow** is people.js's `punch` (Punch_Cross).
- **Dawnbreaker and the Ray of Dawn** light the unlit in a 3 m way along the aim for 1.5 s at the cast, not along their
  moving waves.
- **The Shroud's reveal**: a hit in light adds Revealed (x1.25) to that same blow, not only after it.
- **The names' window** opens with the 1.5 s bell inside it (its fill runs from the bell).
- **Net:** the guest's `lit` blow option and the 'u' interactables are not in (their things come with stages C-D); the
  Budget is not measured.

## Left for stage B's close

The full perf6, the soaks run long, the rest of regress-B and the Budget above; the Faded's footprints and veil (look);
`skillsfx` in an 'under' zone. Then stage C (the Ketos and the Shade, balance).
