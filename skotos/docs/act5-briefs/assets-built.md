# Act V assets as built: the stage A verification

Checked on 10 October 2026 against `docs/act5-contract.md` (Expected assets, gates G1 and G2) and the design's Assets section. Every file was loaded through the game's own code: the creature viewer (`?cview`), the people viewer (`?viewer&only=p:…`), `env.js loadPack('rime')` for the props and layers, and the built artifact under the strict CSP from `docs/HANDOFF.md`. The phone figures use the engine brief's rule: RGBA8 × 1.33 for mips, and any map with a side of 1024 px or more halved (`gltf.js shrink`). 1 MB here is 10⁶ bytes.

## Outcome

| check | result |
|---|---|
| G1: crab provenance and look | **pass** (`gates.json`: no duplicate upload or storefront listing found, the author's own concept) |
| G1: Skotos provenance and look | **pass with a replacement.** The design's Ocean Creature and the fallback Lurker both failed the look gate (each reads as a squid). The Skotos is built from "Cloaked Figure" by MysteryPancake (CC-BY 4.0, uid f4e2c262ed4e456484f232d6afa99629) plus a code-built hood, void and arm-folds. **The lead has to confirm this pick**, because it replaces a uid the design names. |
| G2: frost set ≤ 25 measured textures | **pass**: 25 |
| Every asset in the viewer with its clips | **pass**: 7 creature keys, 90 clips, none with an unbound track or a NaN; 7 frost scenes and the 2 cameo scenes play every clip the contract lists; 25 props and 6 layers load with their maps |
| Rime Bear read (shipped bear under the polar tint, beside the Amberback) | **pass**: it reads yellowed white with its fur detail, not grey, under both the default and the coast light. `polarbear.mjs` is not needed. |
| Artifact (`npm run build:artifact`) | **pass**: 142 files, 66.40 MB, the largest `ash-*.js` at 3.82 MB, none at 16 MB or more |
| Strict CSP on the built artifact (desktop and phone contexts) | **pass**: 0 CSP violations and 0 console errors. Every Act V creature, the 7 frost scenes, Brokka and Elati render textured, and `auto=coast` draws the rime props and layers. |
| Raw budget ≤ 9 MB | **pass**: 7.61 MB of new files (10.15 MB of artifact chunks) |
| Phone GPU budget ≤ 110 MB | **pass for the act's own assets**: 93.1 MB on a cold start, the bear included. **Fail once the cameo sets are counted cold**: 181.7 MB with folk.glb and grove.glb (see open problem 1). |
| Regression: `cast4`, `cast3`, `panels` | **pass** (each run on a private server without HMR; see open problem 7) |

## Measured files

Bytes are the raw file sizes. "Chunk" is the base64 script the artifact ships for that file.

| file | bytes | chunk bytes | faces | textures | phone MB |
|---|---:|---:|---:|---:|---:|
| creatures/crab.glb | 791,740 | 1,055,719 | 12,237 | 3 (1024 d, 512 n, 512 orm) | 4.18 |
| creatures/skotos.glb | 586,428 | 781,967 | 13,442 | 1 (512 water normal) | 1.39 |
| creatures/tentacle.glb | 113,208 | 151,007 | 3,000 | 0 (code material) | 0.00 |
| creatures/icemaw.glb | 187,416 | 249,951 | 5,316 | 2 (1024 d, 512 n) | 2.79 |
| creatures/louse.glb | 354,688 | 472,983 | 2,502 | 2 (512 d, 256 n) | 1.74 |
| creatures/skua.glb | 155,612 | 207,547 | 2,512 | 1 (512 d) | 1.39 |
| frost.glb | 1,713,048 | 2,284,127 | 127,574 | 25 (21 × 512, 4 × 256) | 30.68 |
| rime.glb | 2,210,832 | 2,947,839 | 68,542 | 25 | 24.75 |
| rime/snow_d.webp, snow_n.webp | 37,878 + 72,782 | 50,560 + 97,100 | | 1024 d, 512 n | 2.79 |
| rime/snowTrod_d, _n | 148,758 + 112,976 | 198,400 + 150,692 | | 1024 d, 512 n | 2.79 |
| rime/shore_d, _n | 358,836 + 128,800 | 478,504 + 171,792 | | 1024 d, 512 n | 2.79 |
| rime/seaCliff_d, _n | 277,880 + 104,560 | 370,564 + 139,472 | | 1024 d, 512 n | 2.79 |
| rime/ice_d, _n | 94,502 + 10,062 | 126,060 + 13,472 | | 1024 d, 512 n | 2.79 |
| rime/planks_d, _n | 140,696 + 10,134 | 187,652 + 13,568 | | 1024 d, 512 n | 2.79 |
| **new files, total** | **7,610,836** | **10,148,976** | **235,125** | **71** | **83.68** |
| creatures/bear.glb (shipped; counted on a cold start) | 547,944 | 730,655 | 7,508 | 8 | 9.06 |
| folk.glb (shipped; Brokka, the cameo) | 1,989,028 | 2,652,103 | 157,455 | 27 | 35.56 |
| grove.glb (shipped; Elati, the cameo) | 1,949,288 | 2,599,115 | 161,304 | 47 | 53.00 |

`src/assets/rime/CREDITS.txt` (6,953 bytes) is not loaded. The chunk hashes change with every build. The rime snow chunks are the larger `snow_d`/`snow_n` pair, because the deep pack ships its own pair under the same names.

### The frost set, by scene

| scene | height | faces | textures (shared ones included) | phone MB if loaded alone |
|---|---:|---:|---:|---:|
| sunken | 1.91 m | 17,379 | 10 | 11.85 |
| icesinger | 1.73 m | 16,916 | 8 | 9.06 |
| alkyone | 1.79 m | 16,916 | 8 | 10.11 |
| selna | 1.79 m | 16,904 | 8 | 10.11 |
| tern | 1.34 m | 17,379 | 10 | 12.90 |
| tamarisk | 1.88 m | 21,414 | 12 | 15.69 |
| glaukos | 1.85 m | 22,202 | 10 | 12.90 |

The scenes share 16 of the 25 textures, so the file total (30.68 MB) is far below the sum of the scene column.

### The rime pack, by prop

| prop | faces | maps | phone MB |
|---|---:|---|---:|
| wreck | 11,929 | 1024 d + 256 d (no normal map in the source) | 1.74 |
| keelboat | 4,055 | 512×1024 d, 256×512 n | 1.39 |
| rowboat | 2,108 | 512 d | 1.39 |
| brokenBoat | 1,553 | 256 d | 0.35 |
| towerA / B / C | 3,507 / 3,725 / 3,582 | one atlas strip, 1536×512 d and 768×256 n | 2.09 |
| farLight | 1,568 | 512 d, 512 n | 2.79 |
| anchor, sunkenAnchor | 1,516, 1,610 | 256 d each | 0.70 |
| whale | 5,740 | 512 d | 1.39 |
| runestone | 2,498 | 512 d, 512 n | 2.79 |
| barnacleRock | 1,199 | 512 d | 1.39 |
| driftwood | 1,909 | 512×256 d | 0.70 |
| kelp | 1,489 | 512 d | 1.39 |
| icicle | 778 | none (the game's ice material; `extras.hang`) | 0 |
| shack | 4,000 | 512 d (no normal map in the source) | 1.39 |
| ship | 5,966 | hull 1024 d + 512 n, rigging 512 d | 4.18 |
| cask, crate, oilLamp | 2,302, 710, 799 | 256 d each (the lamp glass is the material `glow`) | 1.05 |
| coastCliff, rockFace | 3,999, 2,000 | none (`seaCliff`, world-projected) | 0 |

Each prop carries `extras.size`. `towerA`, `towerB`, `towerC` and `farLight` also carry `extras.top`, and `farLight` carries `extras.door` ([0, 0, 1.7]).

## Totals against the budget

| | raw MB | phone GPU MB | design estimate (phone) |
|---|---:|---:|---:|
| creatures (6 new files) | 2.19 | 11.51 | 14.4 |
| bear.glb on a cold start (shipped, no new bytes) | (0.55) | 9.06 | 9.1 |
| people: frost.glb | 1.71 | 30.68 | 22-29 |
| props: rime.glb | 2.21 | 24.75 | 30.1 |
| layers: 12 rime webps | 1.50 | 16.74 | 16.8 |
| code textures (sea.js noise and crack map; the design's figure, not measured) | | 0.4 | 0.4 |
| **Act V, cold start with the bear** | **7.61** | **93.1** | 93-100 |
| Act V after a run through Acts III-IV (bear, folk and grove already resident) | 7.61 | 84.1 | |
| + the cameo cold: folk.glb + grove.glb, whole files | (3.94) | +88.56 → **181.7** | not in the design |
| + the cameo cold, if only Brokka's and Elati's maps were decoded | | +29.63 → 122.8 | |
| **budget** | **≤ 9** | **≤ 110** | |

The engine brief also sets limits for each line. All but these hold:
- frost.glb is 30.7 MB of phone memory against the people line's ≤ 30 MB.
- crab.glb is 792 KB against ≤ 700 KB for each creature. It carries 21 clips.
- ship (5,966 faces) and whale (5,740) are over the brief's "others ≤ 4k". Both are within the design's own targets of 6k.

The creatures (6 files, 11.5 MB; 20.6 MB with the bear), layers, props, raw bytes and artifact cost (9.68 MiB against about 12) all fit.

## Checks by asset

### Creatures (`?cview`, numbers from the new `&audit` mode)

Every clip was sampled at 9 moments with the skinned bounds as posed. No clip has a track bound to a missing node and none produces a NaN. Facing was checked in profile (rot 1.57): head, claws, bill or tip point to screen right, which is +Z. Textures were present in every view, and also under the strict CSP.

| CAST key (file) | size at ×1, measured | in game | clips | feet / origin |
|---|---|---|---|---|
| tower, reefback (crab) | 1.12 m span, 0.95 long, spire top 0.585 m | ×4: 4.5 m across, 2.34 m tall; ×1.5: 1.7 m | 21: idle walk run side crawl attack attack2 slam rear hit daze die rock wake settle dive rise breach overturned flounder shake | lowest point −2 mm to +4 mm on grounded clips; dive, rise and breach go 0.75-0.9 m under by design |
| skotos (skotos) | 3.75 m, robe hem 0.5 m below the origin | ×3.2 at y −3: about 9 m above the water | 14: idle rise sink surface sweep slam drink roar wrap recoil hit lash smother die | anchored; the hem is underwater in the game |
| skotosHand (tentacle) | root −0.64 m, tip 4.4-4.7 m | the Hands and the Coil | 11: idle rise sweep lash slam wrap smother recoil sink hit die | anchored, root 0.64 m under the surface |
| icemaw (icemaw) | 3.10 m long, 0.74 m high | ×1.6: 5 m | 12: idle walk run stranded attack attack2 lunge surface dive slide hit die | −5 mm to +12 mm; dive, slide and surface go under by design |
| hullLouse (louse) | 0.67 m long, 0.20 m high | ×1 | 10: idle walk run curl roll uncurl spawn attack hit die | 0 to −2 cm |
| skua (skua) | 1.40 m span (glide) | ×1 | 11: walk run glide idle dive attack hit perch takeoff land die | bat convention: the glide's lowest point on y 0; perch feet at −6 mm |
| rimeBear (bear, new key) | 1.50 m | ×1.3 against the Amberback's ×1.12 | 11, as shipped | −1 cm |

Two clips hold a pose and barely move (bone turn under 0.05 rad): the crab's `rock`, which is meant to be the dormant pose, and the skua's `dive`, a held stoop that the game moves.

### People (`?viewer`, and the creature viewer's new `&folk=` in the artifact)

- The 7 frost scenes and Brokka and Elati load textured. A check of every clip the contract lists for `sunken` (the Harpooner's clips included), `icesinger`, `alkyone`, `selna`, `tern`, `tamarisk`, `glaukos`, `brokka`, `elati`, and the shorefolk's `villager1` and `villager2` found all of them in moves.bin, and each plays a distinct pose.
- Feet are on the ground in low side views. Heights against the 1.8 m warden match the table above.
- Alkyone and Elianthe (`?viewer&only=p:alkyone,p:healer`) are distinct: salt-white hair and ochre oilskin with navy against blonde and green.

### Props and layers

`loadPack('rime')` registers all 25 props as `rime/<name>` and all 6 layers as `rime/<id>`, at the phone path (Lambert, normal maps on), with no console errors. Every textured prop has its image decoded. On contact sheets beside a 1.8 m warden, scale, orientation and grounding are right: every prop sits on y 0, and the icicle hangs below it.

## Stand-ins

- **No Act V file is missing.** Every CAST key, people scene, prop and layer in the contract's Expected assets exists. No stand-in stands for a missing file. The STAND_IN chains (combat's, in actors.js) remain the safety net for a failed load.
- **Made in code, as the design intends:**
  - the Harpooner: the `sunken` scene with code parts at ×1.06;
  - the shorefolk: villager1 and villager2 under runtime tints;
  - the young Einar and the young keeper;
  - the contract's "Made in code" list: fire-cages, lantern rooms, beams, hoods, caps, the boat-hook and harpoon, and the rest;
  - the code ruin on the Walking Tower.
- **Where the built asset differs from the design** (each is in its build report):
  - the Skotos's source (above);
  - `farLight` is a plain stacked shaft of 1,568 faces with no lantern room; the game builds that in code;
  - the wreck and the shack have no normal maps, because their sources have none;
  - the keelboat keeps its source's 1:2 maps;
  - the towers share one atlas strip;
  - the crab's spire top is at 0.585 m, not the contract's 0.85 m target. The span was kept, so the code ruin must make up the rest of the 11 m.
- **Fallbacks not used:** polarbear.mjs, Giant Crab, the Lurker, the Woodlouse, the Baikal seal.

## Open problems

1. **The cameo's memory on a cold start.**
   - farlight loads folk.glb and grove.glb whole at q29, because `loadFolk` decodes every image in a file. That adds 88.6 MB of phone memory and takes the act to 181.7 MB against 110.
   - On a normal run the Field of Ash has already loaded both sets (Act IV), so the cameo costs nothing.
   - On a cold start (a save loaded in Act V) the whole session is about 192 MB (boot) + 181.7 = 374 MB. That is still far below the 670 MB full-run figure the budget protects.
   - If the 110 MB line must hold in that case too, there are three ways. Decoding only the two scenes' images (a scene filter in `people.js loadFolk`, outside the assets owner's files) brings it to 122.8 MB, still 12.8 over. A two-scene cameo set made by folk.mjs is a lead decision, because the contract says they are not rebuilt. The third is the engine brief's §5.4 unloading.
   - **For the lead.**
2. **`prepare()` ignores `extras.keepMat`** (creatures.js, the combat side). It resets any roughness under 0.45 to 0.6 and sets envMapIntensity to 0.4. That would put the Skotos (0.22) and the Hands (0.24) at 0.6 in the game, while sea.js `skotosSkin` assumes "creatures.js keeps the material". The fix is one guard in `prepare()`: `if (!ex.keepMat)` around the material tweaks.
3. **`prepare()` reads `ex.walkSpeed || 1.4`**, so the anchored Skotos and Hands (walkSpeed and runSpeed 0) report 1.4 and 4. This is harmless while they have no walk or run clips, but an AI that reads `T.walkSpeed` would be misled. `??` would keep the zero.
4. **Combat's rows are not in yet** (stage C): `MAP` rows for the Act V actions; `HOLD` gaining rock, curl, overturned, settle, sink; `LOOP` gaining stranded, side (and the crab report adds crawl and flounder).
5. **data.js has no Act V monster definitions yet**, so the design's check command `?cview&only=rimeBear,amberBear` shows the bear untinted. Until combat adds `rimeBear.look`, use the per-item parameters given under "How to repeat".
6. **The crab's `overturned` clip** takes the spire socket 0.4 m under the ground. The code ruin must be hidden, detached or allowed to sink for that window (crab build report).
7. **The shared dev server breaks scenarios.** Vite on 5199 reloads the page whenever any agent saves a file under `src/`. The first `cast3` and `panels` runs died mid-scenario ("Execution context was destroyed"). All three passed on a private server with `server: { hmr: false, watch: { ignored: ['**/*'] } }` (`BASE=http://localhost:5299/`). Gate runs while other stages are editing should use a server like that.
8. **For stage B (from the rime build):** gen5 put a kelp heap on a driftwood at seed 3 (90.5, 96.5). Wrack props need a minimum spacing.
9. **The oil lamp's glass** is the material `glow`, as the contract says. build5.js lights it (`/glow/i`), but `env.js readProps` only swaps materials named `/glass/` for its GLOW material. Any path that draws `rime/oilLamp` outside build5 would show unlit glass.

## Changes in this pass

- `src/gfx/creatures.js` (CAST and ACT_FILES entries only):
  - CAST gains `rimeBear: ['bear', 1]`;
  - `ACT_FILES.act5` is now `['crab', 'skotos', 'tentacle', 'icemaw', 'louse', 'skua', 'bear']`, as the contract lists it. The bear was missing, so a cold start into Act V had no Rime Bear.
- `src/debug/creatureview.js` gains:
  - `&audit`: numbers in `window.__audit`, no picture;
  - `&clips=all`;
  - one value per item for `&scales=`, `&tints=hex:amt`, `&rims=hex:amt` (`-` skips an item);
  - `&lit=day|coast`;
  - `&folk=<set>:<scene,…>`: people of a set in the row. It works in the built artifact, which does not ship the people viewer.
- No asset file needed a fix.
- `npm run build:artifact` was run (artifact/ and dist-artifact/ rewritten).

## How to repeat

- Rime Bear read: `?cview&only=rimeBear,amberBear&ref&scales=-,1.3,-&tints=-,f4f2ec:2.15,-&rims=-,d8f0ff:0.3,-&lit=coast&gap=3.4`
- Clip audit: `?cview&audit&only=tower,skotos,skotosHand,icemaw,hullLouse,skua,rimeBear`, then read `window.__audit`
- Clip sheets: `?cview&only=icemaw&clips=all&gap=3.6&rot=1.57&lit=coast`
- People: `?viewer&only=p:sunken,p:icesinger,p:alkyone&lit=day&cam=front`, and `?viewer&only=p:sunken&sheet=<clip,…>`
- Strict CSP: `node tools/csp-server.mjs <abs>/artifact <port> "<HANDOFF CSP>"`, then `?cview&only=…` and `?cview&only=none&ref&folk=frost:sunken,…` in a desktop context and an `isMobile`/`hasTouch` context

The screenshots and scripts of this pass are in the session's scratch folder (`…/scratchpad/act5/assets/verify/`: `shots/`, `audit.json`, `people.json`, `measure.json`).
