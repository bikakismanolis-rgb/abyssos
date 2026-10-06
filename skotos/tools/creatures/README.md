# Creature build scripts

These scripts turned the downloaded source models into the game-ready GLBs in `src/assets/creatures/`. Each folder holds the Blender (bpy 4.2 / 5.0) and Node (gltf-transform, three.js) scripts for one creature. The source models, Blender files and intermediate GLBs are not in the repository. The paths inside the scripts point at the build session's download folder, so fetch the sources again from the links in `CREDITS.txt` before re-running anything.

The contract every creature follows, which `src/gfx/creatures.js` relies on:

- **Model:** one skinned character; Y up, facing +Z, feet on y=0, metres.
- **Clips:** `idle`, `walk`, `run`, `attack`, `attack2`, `hit`, `die`, plus per-creature extras (`shoot`, `cast`, `slam`, `warcry`, `pounce`, `howl`, `rear`, `spit`, `leap`, `rise`, `riseStand`, `bonePile`, `blink`). They play in place and keep only rotations and the hip/root translation.
- **Scene extras:** `{ hit: { clip: seconds }, height, walkSpeed, runSpeed, credit, license }`.
- **Grips:** `grip_R` / `grip_L` empties under the hand bones. +Y runs along a held blade and +Z along the knuckles.
- **Budget:** WebP textures, 1024 px base colour, 512 px normal/ORM maps; meshopt + quantized geometry.

| Folder | Output | Source |
|---|---|---|
| goblin | goblin.glb | "Goblin" by CDmir (CC0), Kelgar rig cleaned, UAL + KayKit clips |
| skeleton | skeleton.glb | "Skeleton with rig" by Gord Goodwin (CC0), re-rigged to UE names |
| wolf | wolf.glb | Rocketbox Dog_GermanShepard_01 (MIT), procedural quadruped clips |
| spider | spider.glb | "Low Poly Giant Spider" by p0ss (CC-BY 3.0), new rig, procedural gait |
| troll | troll.glb | "Troll Mauler" by piacenti (CC-BY 3.0), retargeted + hand-keyed |
| ashspawn | ashspawn.glb | "Executioner" by thecubber (CC-BY 3.0), ember-crack emissive |
| wight | wight.glb, barrowlord.glb | MakeHuman/MPFB2 CC0 assets, generated with gen.py |
| act2 | magmahound.glb | "Infernal Magma Hound" by Yury Misiyuk (CC-BY 4.0), run, bite, lunge, pounce, howl, hit and die layered on its idle and walk |
| act2 | bat.glb | "Bat" by matisosanimation (CC-BY 4.0), one flapping loop; bite, hit and death made from it |
| act2 | worm.glb | "Worm Monster" by CR!STALLL (CC-BY 4.0), its own clips renamed to the contract, a burrow clip added |
| act2 | golem.glb | "Grock - Endboss" by Baue Franco (CC-BY 4.0), granite recolour with ember runes, walk/run/hit/die added |
| act2 | folk.glb (people, not creatures) | Quaternius characters (CC0) re-proportioned into dwarves; "lava monster" by Satwik.Bandi (CC-BY 4.0) rebound onto the people's skeleton as the Molten King (`folk.mjs`) |

The Act II scripts need no Blender: `lib.mjs` normalises a model (Y up, facing +Z, feet on y=0), copies and time-windows its clips, and writes procedural clips as rotations about body axes layered on a base clip.
| act3 | elk.glb | "Realistic Animated Elk 3D Model" by WildMesh_3D (CC-BY 4.0): Silverhorn, the White Hart. Coat graded to birch-white, antlers rebound into the skinned mesh and turned to glowing amber, amber tears; gore, rear-and-stamp, rear, bellow, paw and hit made here; `leap` posed at `leapApex` for the frozen deer |
| act3 | bear.glb | "Realistic Animated Bear 3D Model" by WildMesh_3D (CC-BY 4.0): the Amberback Bear. Amber resin over the back; `charge` and `daze` extras; torso skin reweighted so no sheets open between legs and body |
| act3 | moth.glb | "Animated Peacock Moth" by OsianOHM (CC-BY 4.0): decimated from 61k to about 3k triangles, re-tinted amber; bat conventions |
| act3 | mandrake.glb | "Mandrake" by timsblends (CC-BY 4.0): the rootlings. Re-graded towards the realistic look; `rise` from 0.7 m underground, the shriek, a fast scuttle |
| act3 | treeman.glb | "Treeman" by bumstrum / DJMaesen (CC-BY 4.0): the Rootwarden turret. Amber light in the bark cracks; `dormant`, `rise`, lash, spikes, weep |
| act2 | grove.glb (people) | `node folk.mjs --set=grove`: the Evergreen (Elati, Linden, the Rootsworn and archers, the Hollowed, the Mourners, Amaranthe) from the Quaternius characters (CC0) with the ELF proportion table; bark from Poly Haven bark_brown_02 (CC0), read from the download folder (`/tmp/claude-0/ph/tex/bark_brown_02`) |
| act2 | ash.glb (people) | `node folk.mjs --set=ash`: Act IV's people. From the Quaternius characters (CC0): the Lampless (`lampless`: the Wayfarer with a GAUNT table, hood up, cold blue-grey ash, dark face, faint cold eyes), the Ash-Fallen (`ashSpear` warden iron-grey, `ashDwarf` warden + DWARF bronze, `ashBow` ranger + ELF bark-green; ash dust, ember cracks and ember eyes), the `ashsmith` (villager1 + SMITH table, charred, ember-cracked forearms; mask and hammer are the game's), `ivar` (Wayfarer + ELDER, silver-ash, white beard, cold glowing eyes, hood up), `arna` / `arnaOld` (hood off with the warden's hair: auburn and young; grey, bearded, ELDER) and `isarnBoy` (CHILD table, then shrunk to 0.74: built at its final 1.34 m, scale 1 in the game). Rebinds onto the people skeleton, so they play every moves.bin clip: `hammerhorn` = "Minotaur Berserker" by Yury Misiyuk (CC-BY 4.0, Mixamo rig, bind pose restored), soot-black with a forge-brand burned into the left breast, 2.3 m; `karthax` = "Overlord" by DJMaesen (CC-BY 4.0), its rig renamed through `BONEMAPS.overlord`, the spec/gloss bronze rebuilt as black iron with ember seams in the engraving, the hip-only tabard re-weighted to the thighs, 2.0 m, `weaponScale` 1.6. Scene extras carry `height`, `credit`, `license`. The crack grain is Poly Haven bark_brown_02 (CC0) and the sources are read from the download folders (`/tmp/claude-0/sf/models/minotaur`, `/tmp/claude-0/sf/models/overlord`) |
