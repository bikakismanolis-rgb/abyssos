# Skotos Act III: code contract

The design lives in `scratchpad/act3.json` (key `plan`): story, zones, enemies, bosses, mechanics, blessings and music, all grounded in this engine. This file fixes the shared names, file ownership and lead decisions. Where this file and the plan disagree, this file wins.

Repo: `/home/user/abyssos/skotos`. The dev server is `http://localhost:5199`. The build check is `npx vite build --logLevel error`.

## Lead decisions (override the plan)

- **Act name.** Keep the name the game already uses: Greek «Τα Δάση που Κλαίνε», English "The Weeping Woods". Act label «Πράξη ΙΙΙ» / "Act III". The Act IV teaser is «Πράξη IV: Το Στάχτινο Καμίνι» / "Act IV: The Ashen Forge".
- **Canon from the existing text (it wins over the plan).**
  - **The tyrant has a name.** Karthax (Κάρθαξ), the Ash King (ο Άναξ της Τέφρας). A THOUSAND years ago he forged the Ash Crown (Στέμμα της Τέφρας) from embers that never die and burned the North. Men, the Evergreen and the Stoneborn threw him down; the crown broke in four. He is stirring again: someone is putting out the beacons and digging for the shards, and Isarn says "Karthax will know tonight, and he will send worse". In Amaranthe's phase 2, Karthax's will speaks through her.
  - **Timeline.**
    - The beacons began going out three nights before the game starts.
    - Durgan lit the Deep Forge about a hundred years ago (Brokka).
    - So the Evergreen's shard began to smoulder in the First Oak about a hundred years ago as well: the wood has been still for about a century. Use "a century" / «εκατό χρόνια», never "four hundred years".
    - Amaranthe herself is ancient: she fought Karthax a thousand years ago.
  - **Isarn is not ancient.** He said "Durgan was my father's friend" (d.isarn.b2). So the fourth shard ("given to the watch") went to the order of beacon-keepers and Wayfarers. Its lantern that never goes out has passed from hand to hand for a thousand years; Isarn received it from his father.
    - His confession at quest 15-16 is about the lantern and the order's secret.
    - The beacon flame does NOT burn the shards, as he claimed in d.isarn.r2 ("the beacon's flame burns anything born of the Ash"). It only lulls them, and they dream together. Only the forge that made them can unmake them: the Ashen Forge, Karthax's own.
  - **The Ranger class IS one of the Evergreen** («Αειθαλής από τα δάση του Βορρά»).
    - When G.hero.cls === 'ranger', Elati, Linden and Amaranthe acknowledge her as kin: give each of them 1-2 alternative lines (keys suffixed `.r`) chosen at runtime.
    - Elati: one of us who left the woods before the rooting.
    - Amaranthe: "You too, child of my people, carry the fire against me?"
  - **Existing keys to stay consistent with:**
    - intro.1-5
    - d.isarn.1-4, r1-r5 (Act I), a1-a4 (Act II start), b1-b5 (Act II end: "The third piece is held by the Evergreen, in the Weeping Woods. Rest. Then that's where we go.")
    - d.lordDie ("The Ash... will bring me... back...")
    - d.king / d.kingDie
    - act2.next ("Act III: The Weeping Woods — coming soon"), which must become the Act III teaser and is replaced by the act3 panel keys.
- **Hero crowd control.** Only one new status: root, from amber only, capped (see plan). No hero stun.
- **Assets.** The asset builders' reports are in `scratchpad/act3-assets.json` (paths, clip names, sizes, scales, the wood pack's layer and prop keys). Use what actually exists. If an asset is missing or failed, use the STAND_IN fallback in `actors.js` (e.g. rootling → spiderling, amberBear → troll, silverhorn → warg, amberMoth → caveBat, rootwarden → troll, grove people → people.glb ones). The game must never break.

## Shared names

### Zones

| Zone | ZONES entry | Notes |
|---|---|---|
| weep | `{ level: 16, pack: 'wood' }` | music `weep`, ambient `weep` / `weepAutumn` |
| heart | `{ level: 19, pack: 'wood' }` | music `heart`, ambient `heart` / `heartAutumn` |

Atmospheres (`src/world/atmos.js`): `weep`, `weepAutumn`, `heart`, `heartAutumn`.

Exits:

- **town:** `{ x, z, to: 'weep', label: 'exit.weep', locked: 'act2' }` on a new west lane.
- **weep:** south back to town; north `{ to: 'heart', label: 'exit.heart', locked: 'hart' }` at the Root Gate.
- **heart:** south back to weep.

`zoneReady(id)` must load `loadPack('wood')` and `loadFolk('grove')` for weep and heart, the same way it already loads `deep` and `folk` for Act II.

### The level object L from gen3.js

`genWeep(seed)` and `genHeart(seed)` live in the new file `src/world/gen3.js`. Mirror the `gen2.js` conventions. Beyond the usual fields (`cells`, `low`, `props`, `lights`, `exits`, `packs` like `{ x, z, n, tag, elite }`, `start`, `boss`, `spots.waypoint`):

- `L.type`: `'weep'` | `'heart'`.
- `L.sap`: `Uint8Array(w*h)`, 1 = walkable sap.
- `L.amberDeep`: `Uint8Array(w*h)`, 1 = amber mere or channel. These cells are also low cells: they block walking, not sight.
- `L.spots.tears`: `[{ x, z, id, story }]`. `id` is a string such as `'planting'`, `'sorrow'`, `'breaking'`, `'m1'`, `'m2'`, `'nursery'`. `story: true` for the three quest-12 Tears.
- `L.spots.npcs`:
  - weep: `{ elati: {x,z,r}, linden: {x,z,r} }`
  - heart: `{ elati: {x,z,r} }`
- `L.spots.glade`: `{ x, z, r }`, the Glade of Stones.
- `L.stones`: `[{ x, z, cells: [[ix,iz], ...] }]`, the nine standing stones (solid).
- `L.spots.rootGate`: `{ x, z }`. Its cells are solid until the Hart dies.
- `L.spots.deer`: `{ x, z, r }`, where the frozen deer hangs over the trail.
- `L.spots.lanternglade`: `{ x, z, r }`. `L.lanterns`: `[{ x, y, z }]`.
- `L.weepers`: `[{ x, z }]`, trees that drip sap.
- `L.thorns` (heart): `[{ x, z, r, cells: [[ix,iz], ...], node: { x, z } }]` × 3.
- `L.spots.heart`: `{ x, z }`, the amber heart in the Heart Chamber. `L.spots.alcoves`: `[{x,z}] × 4`.
- `L.boss`: the Hart's arena centre in weep; Amaranthe's position in heart.

### Map (`src/world/map.js`, owned by world)

`map.open(cells)` makes cells walkable (solid → floor), resets the flow field (`flowT.x = -1` or the existing equivalent) and updates any cached data. Callers use it when standing stones break (combat) and when thorn walls or the Root Gate open (story).

### Visuals (`src/world/build.js`, owned by world)

- **`act3Prop(kind, o)`** returns a `THREE.Object3D` for these kinds:
  - `'tear'` (`o.story`): has `userData.dim()`.
  - `'rootGate'`: has `userData.open(dt)` or a `userData.leaves`/`progress` pattern like `deepGateDoors`, plus `userData.setOpen(bool)`.
  - `'thorns'` (`o.cells`): has `userData.wither()`, which sinks it over about 1.2 s.
  - `'whiteTree'`, `'sapling'`.
  - `'heart'`: the amber heart. Has `userData.setBeat(k)` (0 = still).
  - `'cocoon'`.
  - `'deer'`: the frozen elk in an amber shell. Uses `CREATURES.tpl.elk` if loaded, posed at the `leap` clip.
- **Ground.** An `amber` layer painted from `L.sap`. Mere and channel surfaces use an amber shader (the lava shader idea, gold palette, no fire light). Root walls in heart.
- **`setAutumn(k)`** (k from 0 to 1): dry-leaf ground weight, lantern glow off, mere dimmer.
- **Wind.** `WIND.uWind`, a uniform amplitude (1 by default for all old zones) that multiplies tree and grass sway. Story sets it to 0 in weep and heart before autumn, then 1.
- **FX.** `src/gfx/fx.js` ambients `'weep'` (hanging motes), `'weepAutumn'` (falling gold and brown leaves), `'heart'` (rising spores, drips) and `'heartAutumn'`. A light flicker mode `beat` (a 0.9 Hz double thump) for heart lights, with a global `FX.beat` (0 to 1) to fade it out.

### Combat (owned by combat)

**Monster ids** (`MONSTERS`):

| id | model |
|---|---|
| hollowed | grove `'hollowed'` |
| rootling | `'rootling'` (CAST mandrake) |
| amberMoth | `'amberMoth'` |
| amberBear | `'amberBear'` |
| rootsworn | grove `'rootsworn'` |
| rootswornArcher | grove `'rootswornArcher'` |
| rootwarden | `'rootwarden'` |
| mourner | grove `'mourner'` |
| heartroot | code-built in `models.js` |
| silverhorn | `'silverhorn'`, boss |
| amaranthe | grove `'amaranthe'`, boss, weapon `'spear'` |

**Pack tags:** weepHollow, weepDen, weepMoths, weepSentinels, weepMourners, weepWeepers, weepMixed, heartSleepers, heartWarden, heartChoir, heartDeep.

**New AI kinds:** hollow, charger, skirmisher, rooted, tether, node. Boss AIs: silverhorn, amaranthe.

**New flesh `'wood'`.** Add the `HIT_SFX`/`DIE_SFX` entries and hit FX.

**Sap API** (new module `src/game/sap.js`, owned by combat):

- `sapAt(x, z)` → bool: `L.sap` or any live amber pool.
- `addSapPool(x, z, r, dur)`: capped at 24 pools; draws a decal.
- The hero logic (slow, stick, root) and the monster slow / dash daze live in `player.js` and `ai.js`.
- Drips: `startDrips(L.weepers)` / `stopDrips()`.

**Statuses and hooks:**

- Hero root: `rootHero(t)` in `combat.js`. `dodge()` clears root and stick.
- `damage()` respects `target.hidden`, `target.bondT > 0` (IMMUNE), `target.dmgTaken` and `target.hpFloor`.
- `nearestFoe` skips hidden actors.
- Boss hooks: `a.dazed`, `a.lockPhase`, `S.onPhase(a, phase)`, and the shared `dashStep(a, dt)`.
- **Boss death hook.** On death, bosses `emit('kill', a)`, or story listens on the existing kill path; check how `stonewarden` and `moltenKing` are wired in `story.js` and follow it. Story handles the Hart's death (`flags.hart`, white tree, Root Gate) and Amaranthe's (`flags.autumn`, shard drop).

**Blessings.** `BOONS[3]`:

- amber `{ lifeOnHit: 15, regen: 10 }`, icon `'potion'`
- hart `{ crit: 5, move: 6 }`, icon `'leap'`
- root `{ block: 10, lifePct: 8 }`, icon `'shield'`

The `offerBoons()` loop over acts lives in `story.js` (owned by story).

**Weapons.** A `'spear'` in `src/gfx/models.js` `weaponGeo` (and a bow for the archers if needed). The game adds a procedural antler crown and a shard glow to Amaranthe at spawn (combat, in `actors.js`).

**Audio names** combat uses (story implements them in `audio.js`): `hollowCrack`, `rootlingShriek`, `mothDie`, `bearRoar`, `bearCharge`, `hartBellow`, `hartCharge`, `woodHit`, `woodDie`, `mournerKeen`, `sapRoot`, `sapCrack`, `thornWither`, `amaranthSong`, `memory` (a sting).

### Story (owned by story)

- **Quests 11–16** as in the plan.
- **Flags:** `act2` (set in `actComplete(2)`, migrated from `h.act2 >= 0`), `hart`, `tear_<id>`, `autumn`, `act3`.
- **Hero state:** `h.act3` (default -1, migrated).
- **Dialogs:** `d.isarn.c1..`, `d.elati.*`, `d.linden.*`, `d.tear.<id>.*`, the Amaranthe say-lines, `d.isarn.d1..`, `d.isarn.after3`.
- **Endings:** `beaconScene(3)` with `FAR_BEACONS[2]` and a green-gold `farFire`; `actComplete(3)`; the act panel `act3` keys; waypoints include weep and heart; `offerBoons` loops `[1, 2, 3]`.
- **Memory buff:** 60 s, +12% damage, +8% move.
- **Music** themes `weep` and `heart`, plus a `memory` sting, in `src/audio/audio.js`.

## File ownership (edit only your own files)

| Owner | Files |
|---|---|
| world | `src/world/gen3.js` (new), `src/world/gen.js` (town west lane + exit only), `src/world/build.js`, `src/world/atmos.js`, `src/world/map.js`, `src/gfx/fx.js`, `src/gfx/env.js`, `src/gfx/gfx.js` (lights flicker only), `src/debug/viewer.js` (world viewer support for weep/heart) |
| combat | `src/gfx/people.js`, `src/game/data.js`, `src/game/ai.js`, `src/game/combat.js`, `src/game/player.js`, `src/game/projectiles.js`, `src/game/skills.js`, `src/game/actors.js`, `src/game/sap.js` (new), `src/gfx/models.js`, `src/gfx/creatures.js` (CAST scales), `src/gfx/anim.js` (only if needed) |
| story | `src/game/story.js`, `src/game/world.js`, `src/game/state.js`, `src/game/boot.js`, `src/i18n/text.js`, `src/audio/audio.js`, `src/ui/panels.js`, `src/ui/hud.js`, `src/ui/overlay.js`, `src/ui/style.css`, `src/ui/credits.js`, `CREDITS.txt`, `README.md`, `tools/scenario.mjs` |

## Built assets (details in `scratchpad/act3-assets.json`; a parallel workflow is polishing them, but names and clips stay)

**Creatures.** CAST keys already exist in `creatures.js`. Clip names are exact.

| CAST key | File | Height | Clips | Hit times | Notes |
|---|---|---|---|---|---|
| silverhorn | elk.glb | 2.6 m | idle, walk, run, attack (gore), attack2 (rear and stamp), rear (rise only, ends held), howl, paw (loop), hit (loops cleanly, use it for daze), die (kneel and lie), leap | attack 0.55, attack2 0.97 | Extra `leapApex 0.83` (frozen-deer pose). Do NOT give it a strong tint: the texture is already birch-white. Use `look { scale ~1.15, rim }` with tintAmt ≤ 0.2. For Rear and Stamp, play attack2 (not rear then idle). |
| amberBear | bear.glb | 1.5 m | idle, walk, run, charge, attack, attack2, rear, howl, hit, daze, die | attack 0.6, attack2 0.85, rear 1.4, howl 0.65 | CAST scale 1.12. `charge` and `daze` are not in CreatureAnim's MAP/LOOP: play them by name with `{loop: true}`. |
| amberMoth | moth.glb | 0.43 m | idle, walk, run, attack, bite, hit, die | attack 0.3 | Wingspan 1.1 m. Bat conventions. |
| rootling | mandrake.glb | 0.6 m | idle, walk, run, rise (starts 0.7 m underground: play it when the mound bursts), attack, attack2 (shriek), hit, die | attack 0.4, attack2 0.5 | |
| rootwarden | treeman.glb | 3.4 m | idle, walk, run (= idle), hit, attack (lash), attack2 (spikes), cast (weep), dormant (play with `{loop: true}`), rise (2.7 s, use it as the wake timer), die | attack 0.958, attack2 1.2, cast 1.3 | |

**People** (`src/assets/grove.glb`). Load with `loadFolk('grove')`; `people.js` now supports sets.

- Scenes: elati, linden, rootsworn, rootswornArcher, hollowed, mourner, amaranthe (extras weaponScale 1.5; make it 1.6 in data if wanted).
- No crown and no veil are in the GLB. The game adds them:
  - Amaranthe: a procedural crown of amber antler tines, parented to the Head bone, emissive. Also a shard glow on spine_03.
  - Mourner: a translucent black veil cone on the Head bone.
- The spear weapon is missing from `models.js`: combat adds `'spear'`.

**Wood pack** (`loadPack('wood')`):

- Layers (ENV.layers): goldleaf, moss, peat, rootwall, stonemoss, and dryleaf if the polish pass adds it. Check ENV.layers at runtime and fall back to goldleaf.
- Props (ENV.props, with ENV.sizes): standingStone, giantRoot (a mossy stump with spreading roots; compose the Root Gate from several instances plus fallenTrunk), fallenTrunk (about 4 m source: scale it for the Fallen King, clip any part under ground), stumpOld, mushrooms. The polish pass may add a shrub or root cluster.
- Also reuse the existing env props (ferns, branches, stones, logs, dead trunk, statue, lantern) and the trees pack (treeOak, treeBeech, treeDead, etc.).

**Artifact build.** Inlined chunks must each stay under 16 MB:

- creatures.js `FILES`, env.js `PACK_GLB`/`PACK_TEX` and people.js's set globs must become lazy (non-eager `import.meta.glob` with `query: '?url', import: 'default'`, awaited when loading).
- Check with `npm run build:artifact` (the files in `dist-artifact/` must be under 16 MB each).
- Owners: env.js → world; creatures.js and people.js → combat (`src/gfx/people.js` is added to combat's files).
