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
