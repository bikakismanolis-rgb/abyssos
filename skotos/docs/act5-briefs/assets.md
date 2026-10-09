# Act V asset scouting: The Frozen Coast

Metadata only; no model files were downloaded. Sources: the Sketchfab API (search plus model details for every candidate), the Poly Haven API, and ambientCG's API for the two things Poly Haven lacks (ice and rope/net). Thumbnails were checked by eye for every Sketchfab candidate. The full records (uid, URL, licence, downloadable, faces, clips, rig, date, thumbnail, provenance, fit) are in `assets.json`.

**Rules applied.** Licence must be CC-BY 4.0, CC-BY 3.0 or CC0 (Sketchfab "CC Attribution" is CC-BY 4.0); anything else is rejected. Rejected too: game, film and paid-pack rips, fan art of another IP, re-uploads of someone else's mesh, and AI-generated meshes. "risky" means the licence is fine but something needs checking first (a reverse-image search, an author's confirmation, a style mismatch or a silhouette repeat). Shipped assets are reused where they fit instead of proposing duplicates.

**Engine notes that shape the picks.** The people skeleton uses UE mannequin bone names (pelvis, spine_01..03, clavicle_l, thigh_l...), so UE4/UE5-rigged humans (Andy Woodhead's Viking, Blue Spirit's Cursed Knight) play moves.bin with little or no rebind; Mixamo rigs go through folk.mjs rebind(); everything else gets procedural clips from tools/creatures/act2/lib.mjs, as in Acts III-IV. Phone budget: aim for 5-10k faces on common enemies and 15-20k on bosses.

**Totals.** 244 records: 145 ok, 49 risky, 50 reject.

## Creatures

### The drowned dead

**Recommendation.** Build them in the Quaternius people pipeline (a new `frost` set in folk.mjs) with a waterlogged grade and code-made kelp and barnacles: realistic, shares moves.bin, zero provenance risk. For a heavier "drowned raider" variant, Andy Woodhead's realistic Viking is already on the UE4 mannequin skeleton the people use. The only on-theme Sketchfab draugr (Draugr Berserker) is a posed statue.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | Quaternius people (warden / villager0-2 sources in people.glb) rebuilt by folk.mjs (pipeline) | Quaternius | CC0 1.0 | - | - | yes | - | Best pick for the common drowned. Realistic people that share moves.bin (Zombie_Walk_Fwd_Loop, KK_Skeletons_Awaken_Floor, KK_Death_C_Skeletons are already in it). Needs a new "frost" set in folk.mjs SETS, a GAUNT table (girth 0.8, len 1.06 like the Lampless), a waterlogged grade (grey-green skin, darkened cloth) and code-made kelp strands and barnacle clusters (reuse veil()/veilParts from the Mourners for the dripping weed). Distinct from the Ash-Fallen by colour and the wet sheen (a uWet roughness uniform is small new work). | Already shipped and credited (CREDITS.txt "PEOPLE AND ANIMATIONS"). No download, no provenance risk. |
| 2 | ok | MakeHuman / MPFB2 base mesh, game_engine rig and CC0 community assets (the Barrow-wight route) (pipeline) | MakeHuman community (per-asset authors credited as for the Barrow-wight) | CC0 1.0 | - | - | yes | - | Most realistic option for a gaunt waterlogged body (bloated, wrinkled skin via the "old caucasian male" skin plus a wet mottling pass). Use for the drowned elite (the "Tide-sworn") rather than the rank and file, since it costs a full MPFB2 build. | Same route as the shipped Barrow-wight and Lord of the Barrow; all inputs CC0. |
| 3 | ok | [Viking - rigged for animation](https://sketchfab.com/3d-models/viking-rigged-for-animation-79321179bafb4d558f0cd6a4a014ba9a) | Andy Woodhead (Andywoodhead) | CC-BY 4.0 | 120.1k | 0 | yes | 2023-07-14 | Realistic Viking warrior (helm, mail, spear, shield), rigged to the UE4 mannequin, the same bone names as the people skeleton (pelvis, spine_01..03, clavicle_l, thigh_l...), so it plays moves.bin with almost no rebind work. 120k faces: decimate to about 15k and re-encode textures. Regrade to drowned (bleached skin, rust, kelp in code) for a "drowned raider" variant or the drowned jarl's guard. | Andy Woodhead: historical-reconstruction artist (Anglo-Saxon, Roman, Prussian portfolio), says "You are free to use this model in any way". Face texture credits a stock photo (Photodjo); acceptable inside CC-BY, but the face will be overpainted anyway. No duplicate uploads found. |
| 4 | ok | [Zombie](https://sketchfab.com/3d-models/zombie-25c230a1e2f2462fa3de298fc8bca30a) | DJMaesen (bumstrum) | CC-BY 4.0 | 7.6k | 1 | yes | 2018-06-12 | Emaciated bare body, 7.6k faces, rigged with one clip. Cheap base for a skinless "brine-husk" variant; rebind via BONEMAPS like Karthax. Texture is generic brown, needs a wet blue-grey regrade. | DJMaesen (bumstrum) is already credited (Treeman, Overlord). Original low-poly zombie, 529 likes, no duplicate found. |
| 5 | ok | [Ghoul](https://sketchfab.com/3d-models/ghoul-f37f43b23fd541df8a2926571acfce70) | DJMaesen (bumstrum) | CC-BY 4.0 | 7.0k | 1 | yes | 2018-11-30 | Smaller ghoul body (7k faces, rigged, 1 clip). Fine as a crawling drowned (Crouch clips in moves.bin after rebind). | Same author as above (credited). Original. |
| 6 | ok | [SWAMP MONSTER](https://sketchfab.com/3d-models/swamp-monster-6dab8cb402864d9c842d52e4dded1bdf) | alexalbinyana (alexalbinyana) | CC-BY 4.0 | 5.0k | 0 | no | 2017-06-16 | A weed-covered humanoid (5k faces) that reads at once as "came out of the sea wrapped in kelp". Not rigged: needs an auto-rig to the people skeleton. Good for a kelp-shrouded variant. | alexalbinyana: made for his own game "I.C.U."; consistent original portfolio. |
| 7 | risky | [Draugr Berserker](https://sketchfab.com/3d-models/draugr-berserker-d6c727f425944623b5f760ec7757efbc) | aruspice (vtomioka) | CC-BY 4.0 | 107.4k | 1 | yes | 2018-03-19 | Very on-theme (tundra-preserved draugr, "underwater" tag) but 107k faces, posed, stylised colours. Would need retopology, unposing and a rig. Not worth it next to the pipeline. | Original concept text by the author (vtomioka), but it is a posed statue on a rock base, not a game model. |
| 8 | risky | [Thorvald](https://sketchfab.com/3d-models/thorvald-84a3b1983ae6437bb41bbd4863603054) | FinnDeBrie (FinnDeBrie) | CC-BY 4.0 | 60.5k | 0 | no | 2023-06-09 | Stylised cartoon undead Viking, 60k faces, no clips. Clashes with the realistic people. | DAE student exam piece; concept by the artist Grosnez (credit both). |
| 9 | risky | [Cursed Undead Soldier Rig](https://sketchfab.com/3d-models/cursed-undead-soldier-rig-b2e39de76b834d978adee5716aec814d) | DM-913 (SuperKapoo913) | CC-BY 4.0 | 16.7k | 1 | yes | 2021-08-15 | Dark husk soldier, 16.7k faces. Usable only with a BONEMAPS table; the pipeline is cheaper. | SuperKapoo913 (credited author), original. The Act IV judges rejected it once because its rig is not Mixamo-like (cloth bones). |
| 10 | risky | [Possessed undead](https://sketchfab.com/3d-models/possessed-undead-7394bdf26d664810b42b83153411cf74) | giantSwing (giantSwing) | CC-BY 4.0 | 7.7k | 1 | yes | 2018-02-26 | Gore-heavy bloody texture; needs a full retexture to read as drowned rather than flayed. | Original (giantSwing), no duplicates found. |
| 11 | risky | [Zombie](https://sketchfab.com/3d-models/zombie-73ef58af341e46afba1da53366ed79cf) | pxltiger (pxltiger) | CC-BY 4.0 | 4.8k | 10 | yes | 2018-09-24 | Low-poly stylised zombie with 10 clips. Style mismatch. | pxltiger adds extra terms in the description ("no permission to sell or redistribute as a competing product") on top of CC-BY; harmless for a game but muddy. |
| 12 | reject | [Zombie Warrior](https://sketchfab.com/3d-models/zombie-warrior-2457028ac0ca4214bd1f5dc3b9d11129) | Aleksandr (xa3apg) | CC-BY 4.0 | 9.5k | 3 | yes | 2021-08-11 | Cartoon style. | Derivative: rigged and animated from @tgalextg's model; provenance of the base not verified. |
| 13 | reject | [Skeleton Pirate " The Captin "](https://sketchfab.com/3d-models/skeleton-pirate-the-captin-65cbe69004924bbc940cd74276ba90fb) | ShadowCoffee (ShadowCoffee) | CC-BY 4.0 | 60.6k | 2 | yes | 2021-06-03 | Stylised gold-boned pirate with a tricorn: wrong era and look; skeletons already exist (KayKit). | Original (ShadowCoffee) but generic pirate. |

### Giant crabs and sea crawlers

**Recommendation.** "Crab mountain" (pro100voron) is the standout: a realistic crab that carries a rock on its back, rigged, and it can lie still as a rock until the tide returns. Pair it with the CC0 giant-isopod scan (ffish.asia) as a swarm unit. The one ready-animated giant crab is a Protofactor re-upload (rejected).

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Crab mountain](https://sketchfab.com/3d-models/crab-mountain-ac8fa79586f84c84a8a55dd86b7a2e2f) | pro100voron (pro100voron) | CC-BY 4.0 | 42.0k | 1 | yes | 2020-04-01 | Best pick. A realistic crab carrying a rock spire on its back (42k faces, rigged, 1 clip). Lies still as a rock at low tide and wakes when the water returns: made for the tide mechanic. Decimate to about 10k; make walk/scuttle/snap/hit/die clips with lib.mjs. Scaled x3-4 it is also a big-creature boss candidate. | pro100voron says the model follows his own concept. His portfolio also contains unrelated fan art (Fallout 4, Indominus Rex), so run a quick reverse-image search before download; no duplicate upload found. |
| 2 | ok | [Giant Crab](https://sketchfab.com/3d-models/giant-crab-6295676291c141728457ef7550b0650a) | Mohamed (mohamedbenarous) | CC-BY 4.0 | 28.3k | 0 | no | 2024-01-24 | Realistic red crab, 28k faces, not rigged. Regrade to a cold slate-blue; procedural 8-leg rig and clips like the spider. Good common "shore crab" swarm unit (decimate to about 5k). | Author's only upload, with an ArtStation link to the same work. No duplicate found. |
| 3 | ok | [CC0 オオグソクムシ Giant Isopod, B. doederleinii](https://sketchfab.com/3d-models/cc0-giant-isopod-b-doederleinii-3979c291d1f9454c90851efe291eab60) | ffish.asia / floraZia.com (ffishAsia-and-floraZia) | CC0 1.0 | 582.6k | 0 | no | 2023-04-12 | Photoreal giant isopod (Bathynomus). 583k faces: decimate to about 5k and bake normals. Segment rig made in code (like the deepworm). Perfect "hull-louse" swarm that boils out of wrecks. CC0, so no credit is required (credit anyway). | ffish.asia / floraZia: a CC0 natural-history scan project (photographed specimens), clean. |
| 4 | ok | [Giant Isopod](https://sketchfab.com/3d-models/giant-isopod-46469c568b3743ec8fb4bb711949d49a) | RISD Nature Lab (RISDNaturelab) | CC-BY 4.0 | 500.0k | 0 | no | 2021-02-25 | Alternative giant isopod, 500k faces, very clean. Same work as above. | RISD Nature Lab (Rhode Island School of Design) museum scan. |
| 5 | ok | [Woodlouse](https://sketchfab.com/3d-models/woodlouse-fae04aa296f844c18675f6ae50aefe77) | .hapto GmbH (.hapto) | CC-BY 4.0 | 229.4k | 1 | yes | 2020-04-08 | Realistic woodlouse with a walk clip (229k faces, rigged). Scaled up it is a pale ice-louse; decimate hard (to about 6k), keep the leg chain. | .hapto GmbH with the Senckenberg Museum (museum4punkt0 VR project). Clean. |
| 6 | risky | [Spider crab](https://sketchfab.com/3d-models/spider-crab-9aeff4c7f0a441909f6f55499fe563e2) | Emm (edemaistre) | CC-BY 4.0 | 23.1k | 0 | no | 2021-08-02 | Iron-grey spider crab, 23k faces, not rigged. | Phone scan of a sculpture by Laurence de Maistre: the sculptor's rights in the artwork are unclear. |
| 7 | risky | [Armored Crab](https://sketchfab.com/3d-models/armored-crab-df63d81358944337af1add54f19821ad) | Ischa Soetewey (SoeteweyIscha) | CC-BY 4.0 | 15.4k | 0 | no | 2021-05-25 | Cartoon crab with a helmet and arrows: wrong style. | Student piece after a concept by Mike Franchina (credit both). |
| 8 | risky | [Crab centipede](https://sketchfab.com/3d-models/crab-centipede-04f99ea22ba14dd2b43b25ec5fc5b18d) | Batuhan13 (Batuhan13) | CC-BY 4.0 | 33.7k | 0 | no | 2021-02-05 | Stylised crab-centipede, 34k faces, no rig. Style mismatch. | Batuhan13, original. |
| 9 | risky | [[Free] Giant Enemy Crab](https://sketchfab.com/3d-models/free-giant-enemy-crab-faaf2610c5d24d4a9839a58f1cf6ddf0) | Retrophyx (Retrophyx3D) | CC-BY 4.0 | 12.8k | 0 | no | 2023-08-22 | Untextured white mesh, 12.8k faces. | Author's own design; the title borrows the "Giant Enemy Crab" meme (Sony's Genji). Do not keep the name. |
| 10 | reject | [giant crab animation](https://sketchfab.com/3d-models/giant-crab-animation-881ccf6cf2854014808058025e713e70) | blam (Blam577895) | CC-BY 4.0 | 10.4k | 5 | yes | 2026-09-23 | Would have been ideal (animated giant crab), but cannot ship. | Description says "original protofactor": Protofactor is a commercial asset vendor. The same mesh (10,416 faces, 5 clips) was re-uploaded 3 days later by another account (aa719020...). Paid-pack re-upload. |
| 11 | reject | [Giant crab](https://sketchfab.com/3d-models/giant-crab-aa719020af3c44ce8d03a7e5814b0688) | . (Hdhdhejwnwnjdjd) | CC-BY 4.0 | 10.4k | 5 | yes | 2026-09-26 | - | Duplicate of the Protofactor re-upload above. |
| 12 | reject | [Creature Crab by Vadim Ziambetov Free (DESC)](https://sketchfab.com/3d-models/creature-crab-by-vadim-ziambetov-free-desc-7d5c3811f6684acfb68e876a93676c1d) | Steel Wasp (spedspeedissped) | CC-BY 4.0 | 6.0k | 9 | yes | 2026-07-06 | - | Third-party re-upload of Vadim Ziambetov's Unity Asset Store package; the Asset Store EULA does not allow redistribution under CC-BY. |

### Sea serpent and ice wyrm

**Recommendation.** Sea serpent: "Pistosaur Animated" (realistic long neck, rigged). Ice wyrm: timsblends' "Four Legged Predator" (realistic, 7 clips, credited author), regraded to rime. Every winged ice dragon found repeats the Ashwing silhouette or has provenance problems.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Pistosaur Animated](https://sketchfab.com/3d-models/pistosaur-animated-773667575a264c7baa4ec404115a044b) | RickStikkelorum (ricksticky) | CC-BY 4.0 | 16.7k | 1 | yes | 2019-11-26 | Best sea serpent: a realistic long-necked pistosaur (16.7k faces, rigged, swim clip). The neck rising from a hole in the ice is the money shot. Add rise/strike/spit/submerge/hit/die clips procedurally; regrade to a dark mottled hide with frost on the back. | RickStikkelorum, own sculpt (describes his process). No duplicate found. |
| 2 | ok | [Four Legged Predator](https://sketchfab.com/3d-models/four-legged-predator-7f68f9daa698433299092bfecaae4e9e) | Timsblends (timsblends) | CC-BY 4.0 | 14.6k | 7 | yes | 2021-03-10 | Best ice wyrm: a rhino-sized realistic reptilian quadruped with 7 clips (bite, scratch...). Regrade to rime-white scales with blue ice ridges; add ice shards in code. Textures need rebuilding after export (author's note). | timsblends (credited for the Mandrake), portfolio piece. A re-upload exists as "Four-Legged-Frost-Predator." by bensimulator1 (rejected below); timsblends is the original (2021-03-10). |
| 3 | ok | [Pliosaur](https://sketchfab.com/3d-models/pliosaur-d90f30fd8ae9488ba8186a4572c9cf4f) | Spinnee (Spinnee) | CC-BY 4.0 | 13.2k | 0 | yes | 2024-03-18 | Pliosaur, 13k faces, hand-painted (less realistic than the people). Sketchfab lists it as rigged but it ships no clips: swim/breach/bite clips in lib.mjs. A fallback serpent or a breaching set piece. | Spinnee: original portfolio artist (Flint Maw was already verified for Act IV). |
| 4 | risky | [Animated Frilled Shark](https://sketchfab.com/3d-models/animated-frilled-shark-2b7eba3fc9aa4cdc8f62d5c2c20c6419) | Anees Animates (AneesAnimates) | CC-BY 4.0 | 93.8k | 1 | yes | 2026-01-29 | Realistic frilled shark (an eel-like "living fossil"), 94k faces, rigged, swim clip. Good under-ice shadow / eel swarm if cleared. | AneesAnimates sells animated animals; the same account uploads Jurassic World fan models (Indominus Rex), so the origin of this one must be checked. |
| 5 | risky | [icy dragon](https://sketchfab.com/3d-models/icy-dragon-2db9268227b943e6a41e88390f2875a6) | chengzijieczj (chengzijieczj) | CC-BY 4.0 | 133.7k | 1 | yes | 2020-01-20 | Realistic dark dragon with blue ice crystals, 134k faces, rigged, 1 clip. Winged, so it repeats the Ashwing silhouette. | Account with 5 uploads, one titled "European and American game s..."; game-like quality with no process notes. A copy exists (CyberDriger83, rejected). Possible game rip: do not use without a reverse-image search and the author's confirmation. |
| 6 | risky | [Frost Wyvern Model](https://sketchfab.com/3d-models/frost-wyvern-model-6135eaf8acb24099900dd9d3abb5d078) | Mina S. (minaskagseth) | CC-BY 4.0 | 17.5k | 0 | yes | 2023-12-26 | Stylised posed frost wyvern, 17.5k faces; repeats the Ashwing's wyvern silhouette. | Student work (Maya/Substance), original. |
| 7 | risky | [Snake attack Animations (Multiple)](https://sketchfab.com/3d-models/snake-attack-animations-multiple-83c4290cd4b648fd942d4bbc2280a3f6) | Imagigoo (Imagigoo) | CC-BY 4.0 | 4.4k | 1 | yes | 2023-07-23 | Realistic snakes with attack clips (4.4k). A giant cobra reads as a snake, not a sea serpent; only as small ice-adders. | Imagigoo free pack, own work. |
| 8 | reject | [Four-Legged-Frost-Predator.](https://sketchfab.com/3d-models/four-legged-frost-predator-3ddc6f711201449cbc33617f430d1b20) | bensimulator2 (bensimulator1) | CC-BY 4.0 | 14.6k | 7 | yes | 2021-07-28 | Use the original above. | Re-upload of timsblends' Four Legged Predator (same 14,564 faces and 7 clips; "kudos to Timsblends"). |
| 9 | reject | [Ice Dragon](https://sketchfab.com/3d-models/ice-dragon-30ea81dc58894bf594276b350992794e) | CyberDriger83 (CyberDriger83) | CC-BY 4.0 | 133.7k | 1 | yes | 2021-04-22 | - | Re-upload of "icy dragon" (same 133,666 faces) by an account that also re-uploads other people's models. |
| 10 | reject | [Pale Wyrm](https://sketchfab.com/3d-models/pale-wyrm-f625c78f5c644483b6da27d5cfe95904) | Vasian-Digital3D (Vasian-Digital3D) | CC-BY 4.0 | 25.6k | 1 | yes | 2025-09-16 | - | Vasian-Digital3D uploads fan art and rips (Kraang, J'onn, Ada, and a "Wraith" from Evolve); nothing from this account can be trusted. |
| 11 | reject | [Cryozar, the Frostborn Wyrm](https://sketchfab.com/3d-models/cryozar-the-frostborn-wyrm-26ddaee0b688474cab41e92e9b63371f) | Ar3Designer (Ar3Designer) | CC-BY 4.0 | 120.0k | 0 | no | 2025-07-21 | Cartoon chibi dragon: wrong style. | Original (Ar3Designer). |
| 12 | reject | [Monster Hunter World: Iceborne - Velkhana](https://sketchfab.com/3d-models/monster-hunter-world-iceborne-velkhana-b480760cfff54313b319848cdc5eccb2) | Haku Dragon (hakudragons) | CC-BY 4.0 | 146.3k | 24 | yes | 2025-03-07 | - | Monster Hunter World: Iceborne Velkhana: game rip. |
| 13 | reject | [The Elder Scrolls Blades Frost Dragon](https://sketchfab.com/3d-models/the-elder-scrolls-blades-frost-dragon-1eff54cc6206402a97ab473a128ec617) | OrangeSauceu (orangesauceu) | CC-BY 4.0 | 13.4k | 35 | yes | 2025-10-13 | - | The Elder Scrolls Blades frost dragon: game rip. |
| 14 | reject | [The Dread Serpent (Deepwoken)](https://sketchfab.com/3d-models/the-dread-serpent-deepwoken-7132610b5b8a4dfc86ac0be2f0144eb9) | Zyleck (Zyleck) | CC-BY 4.0 | 172.2k | 1 | yes | 2024-02-10 | - | Deepwoken (Roblox game) fan model. |

### Frost giant and ice troll

**Recommendation.** Regular ice troll: SJunior3d's realistic troll (8 clips). Frost giant: Kaan Tezcan's "Ancient Titan Vol2" (realistic, white armour that regrades to rime). All named "frost giant" uploads are game rips (King's Raid) or Marvel/film fan art.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Troll](https://sketchfab.com/3d-models/troll-bceb1cb47186457c8571a23e6aff1b8e) | SJunior3d (sjunior3d) | CC-BY 4.0 | 10.5k | 8 | yes | 2018-04-03 | Best regular ice troll: realistic muscular troll with a club, 10.5k faces, 8 clips. Regrade skin to blue-grey with rime crust and icicle beard in code. Readability vs. Act I's Troll Mauler: different mesh, colour and the frost crust tell them apart. | SJunior3d, original animated troll (63k views), no duplicate found. |
| 2 | ok | [Free Game Character - Armored Troll - With Sword](https://sketchfab.com/3d-models/free-game-character-armored-troll-with-sword-3e9894629a0146cbb866e2c3179d9ec8) | Kaan Tezcan (kaanTezcan) | CC-BY 4.0 | 252.4k | 1 | yes | 2026-04-02 | Realistic armoured troll with sword, 252k faces (decimate to 15-20k), rigged, 1 clip. Elite "rime-troll warlord" or a mini-boss. | Kaan Tezcan publishes free characters ("use as you wish, credit optional") under CC-BY; consistent original portfolio. |
| 3 | ok | [Free Game Character - Ancient Titan Vol2](https://sketchfab.com/3d-models/free-game-character-ancient-titan-vol2-0e71dd1a27a2455b9adae83082905958) | Kaan Tezcan (kaanTezcan) | CC-BY 4.0 | 56.2k | 0 | yes | 2022-10-08 | Realistic ancient giant in white stone-like armour with gold trim, 56k faces. Read as a frost giant (Jotun) once the white is pushed to rime-ice and the gold to tarnished bronze. Also the top humanoid-boss pick (see boss_humanoid). | Kaan Tezcan, same terms as above. A rigged version is linked from the description (Google Drive, same licence). |
| 4 | ok | [Wendigo](https://sketchfab.com/3d-models/wendigo-28dea1b1f0eb4e348ab8a8afeae1b5ab) | DannyAg (DannyAg) | CC-BY 4.0 | 7.4k | 0 | no | 2015-10-09 | Antlered skull-faced horror with exposed ribs, 7.4k faces, not rigged. A "Hunger of the ice" stalker. Do not call it a wendigo in game (Algonquian folklore; use our own name). | DannyAg, made for the indie game "Blackwood" (own work), 1,151 likes. |
| 5 | ok | [Ice Elemental](https://sketchfab.com/3d-models/ice-elemental-aad46bfde099472481b1536428a122ae) | InaLaAtzu (InaLaAtzu) | CC-BY 4.0 | 7.9k | 1 | yes | 2020-03-23 | Stylised glowing ice elemental, 7.9k faces, rigged, 1 clip. Usable as a small rime-spawn; less realistic than the rest. | InaLaAtzu is the original (2020-03-23); CyberDriger83 re-uploaded it with 17 clips (rejected). |
| 6 | risky | [Frost Troll](https://sketchfab.com/3d-models/frost-troll-c0b30d5460f54736b0556a552688148c) | MoonBaby2402 (moonbaby2402) | CC-BY 4.0 | 11.3k | 1 | yes | 2020-12-10 | Amateur quality (jeans, low-res textures), 11k faces. | Original (MoonBaby2402). |
| 7 | risky | [Troll](https://sketchfab.com/3d-models/troll-59e679e0da5c4906935b8841aefe6dc0) | Timsblends (timsblends) | CC-BY 4.0 | 23.1k | 12 | yes | 2021-02-23 | Cartoonish face; 12 clips. Style mismatch. | timsblends, original, asks to be told the project name. |
| 8 | risky | [Mountain Orge](https://sketchfab.com/3d-models/mountain-orge-f18e6fb4a07b445095b5fcb5bec7fa7a) | SamThePie (Sam.Hendy) | CC-BY 4.0 | 17.3k | 13 | yes | 2023-06-18 | Cartoon ogre. | Tutorial result (Grant Abbitt course) with Mixamo clips. |
| 9 | risky | [Cyclops Rig](https://sketchfab.com/3d-models/cyclops-rig-e5cc86878c314f5bae6d7268bb7541d9) | DM-913 (SuperKapoo913) | CC-BY 4.0 | 11.3k | 1 | yes | 2021-07-27 | Same family as the Act IV Smoke-eater (Lesser Cyclops variant): silhouette repeat. | SuperKapoo913, original. |
| 10 | reject | [Ice golem](https://sketchfab.com/3d-models/ice-golem-4070bce587134fe99c99df46d7b44c3a) | CyberDriger83 (CyberDriger83) | CC-BY 4.0 | 7.9k | 17 | yes | 2021-04-26 | - | Re-upload of InaLaAtzu's Ice Elemental (same 7,877 faces). |
| 11 | reject | [Frosty the frost giant](https://sketchfab.com/3d-models/frosty-the-frost-giant-bd57f8274b854509885c49c495fcfd99) | olf94 (olf94) | CC-BY 4.0 | 17.7k | 0 | no | 2022-12-04 | Too crude. | Original jam piece (4 hours). |
| 12 | reject | [Raid_ Frost Giant_ Thorpe_ Vari01 King's raid](https://sketchfab.com/3d-models/raid--frost-giant--thorpe--vari01-kings-raid-e4c0b968cdcc41b39eddf2610433bf7b) | ilyakardailskiy (ilyakardailskiy) | CC-BY 4.0 | 8.8k | 0 | no | 2025-04-02 | - | King's Raid game rip (ilyakardailskiy uploads a whole set of King's Raid frost giants). |
| 13 | reject | [Laufey (Frost Giants)](https://sketchfab.com/3d-models/laufey-frost-giants-4b7a5769be6d4b238a9a79a8f9cab2dd) | 3dvizzion (3dvizzion) | CC-BY 4.0 | 145.9k | 0 | no | 2014-09-07 | - | Laufey (Marvel): IP fan art. |
| 14 | reject | [LOTR Cave Troll - (for animating/rigging)](https://sketchfab.com/3d-models/lotr-cave-troll-for-animatingrigging-20a50af723314c1dac04aad8c929aa1e) | Ole Gunnar Isager (FrenchBaguette) | CC-BY 4.0 | 17.9k | 0 | no | 2020-06-26 | - | LOTR Cave Troll: film IP fan art. |
| 15 | reject | [Jötunn inspired by "The Ritual"](https://sketchfab.com/3d-models/jotunn-inspired-by-the-ritual-ef809b1d0f7248f7b98b7aa034fec812) | Lukas Hahn 3D (specter) | CC-BY 4.0 | 276.4k | 0 | no | 2019-02-19 | - | Jotunn from the film "The Ritual": film creature fan art. |

### Walrus-like or seal-like beast

**Recommendation.** The University of Valencia walrus scan is the realistic pick but costs a remesh and rig (3.3M faces, no rig). The leopard-seal sculpt (neatGrace) is the alternative predator. The only ready-animated seal comes from a bulk-upload account (risky).

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Walrus (Odobenus rosmarus)](https://sketchfab.com/3d-models/walrus-odobenus-rosmarus-14861dc81071430e9ecac668864ea743) | Museo [UV] Historia Natural (MUVHN) | CC-BY 4.0 | 3.3M | 0 | no | 2023-06-13 | Best pick: anatomically real walrus with huge tusks. 3.3M faces: remesh to about 8k and bake normal/albedo, cut away the ice base, rig spine/flippers/head in code. Scaled x2 it is the "tusk-beast" that hauls out at low tide. | Museo [UV] de Historia Natural (University of Valencia): scan of a 1:20 clay sculpture by Dr. Julio Pitarch Reig. Institutional, clean. |
| 2 | ok | [Leopard Seal](https://sketchfab.com/3d-models/leopard-seal-3f4a2090598b4741ac38e0d255ece191) | Grace Belt (neatGrace) | CC-BY 4.0 | 179.9k | 0 | no | 2019-04-30 | Realistic leopard seal (the predator seal), 180k faces, not rigged. The ice-hole ambusher: lunges out of a breathing hole. Decimate and rig in code. | Grace Belt (neatGrace), own sculpt (Substance tags), no duplicate. |
| 3 | ok | [Seal/Baikal/Непра](https://sketchfab.com/3d-models/sealbaikal-fb79ae1e6021481f819f34ebc2dcaecd) | fedalina (fedalina) | CC-BY 4.0 | 155.5k | 1 | yes | 2022-05-11 | Small realistic seal, 156k faces, rigged, 1 clip. Ambient wildlife on the floes. | fedalina, Baikal seal, own work. |
| 4 | risky | [Aniamted Seal](https://sketchfab.com/3d-models/aniamted-seal-28d9c15e455b4bbca3843ca1a3629b76) | igor-lir (igor-lir) | CC-BY 4.0 | 12.3k | 1 | yes | 2023-05-11 | Realistic animated harbour seal, 12k faces, rigged, 1 clip. If cleared, the cheapest working seal. | igor-lir uploaded 8 polished realistic animals within two days (2023-05-10/11) with one-line descriptions and no process: a common sign of re-uploaded stock. Reverse-image search first. |
| 5 | risky | [Elephant Seal Model](https://sketchfab.com/3d-models/elephant-seal-model-214f1b2442974b92b95b5faf9de04c25) | jessiekb (jessiekb) | CC-BY 4.0 | 9.5k | 0 | no | 2020-12-02 | Untextured simple elephant seal, 9.5k faces. | Research-lab model (jessiekb), original. |
| 6 | reject | [Manrus](https://sketchfab.com/3d-models/manrus-dcc6f307a8a0417fa213273692fb0c8a) | Nilryth (NilrythVendain) | CC-BY 4.0 | 11.2k | 1 | yes | 2020-03-05 | Crude walrus-man in jeans: quality too low. | Original (Nilryth). |
| 7 | reject | [Sea Elephant](https://sketchfab.com/3d-models/sea-elephant-21e280f42f8b43d1aa554daf2b1baa59) | udalov_cgart (udalov_cgart) | CC-BY 4.0 | 97.1k | 0 | no | 2019-08-20 | An alien "sea elephant" bust, not a pinniped. | Original (udalov_cgart). |

### Polar or cave bear

**Recommendation.** Reuse the shipped WildMesh bear (81 clips) with a polar or frost-matted regrade and a new scale: no download. Every new polar bear found is risky (contradictory NC note, bulk-upload account) or a re-upload.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Realistic Animated Bear 3D Model (bffc3c87d2d148ff8533e1cc8a11c9f1), already in src/assets/creatures/bear.glb](https://sketchfab.com/3d-models/realistic-animated-bear-3d-model-bffc3c87d2d148ff8533e1cc8a11c9f1) (existing) | WildMesh 3D | CC-BY 4.0 | 7.5k | 81 | yes | 2025-03-10 | Best pick: regrade the coat to yellowed polar white (or frost-matted cave-bear brown), scale 1.25, longer neck via morph, ice clots in the fur in code. 81 clips already cut. Caveat: same silhouette as the Amberbacks; colour, scale and a frost-breath roar tell them apart. | Already shipped and credited (Act III Amberbacks). No download. |
| 2 | risky | [Animated Polarbear](https://sketchfab.com/3d-models/animated-polarbear-edc1fac9d0274ff2998c87a3a7d11b00) | igor-lir (igor-lir) | CC-BY 4.0 | 19.5k | 1 | yes | 2023-05-10 | Realistic roaring polar bear, 19.5k faces, rigged, 1 clip. Only if a new silhouette is needed. | Same igor-lir bulk-upload concern as the seal (8 animals in two days, no process). Reverse-image search first. |
| 3 | risky | [Polar Bear  🐻](https://sketchfab.com/3d-models/polar-bear-3854c9cd58474ac69954b2b58a7b795e) | Nyilonelycompany (Nyilonelycompany) | CC-BY 4.0 | 18.4k | 1 | yes | 2023-05-16 | Realistic walking polar bear, 18k faces, 1 clip. | Licence label says CC-BY but the description says "Test Phase Non commercial". kenchoo re-uploaded it crediting "AIUM2". Contradictory terms: do not use without the author's written confirmation. |
| 4 | risky | [Polar Bear](https://sketchfab.com/3d-models/polar-bear-4d8d35fb927048228324a5f5c1cf534e) | planeta-elefante (planeta-elefante) | CC-BY 4.0 | 3.8k | 4 | yes | 2025-04-17 | Simple low-poly bear, 3.7k faces, 4 clips. Too plain. | Account also posts film fan models (Ice Age "Manny"). |
| 5 | reject | [Polar Bear](https://sketchfab.com/3d-models/polar-bear-deeb7f4add9f4c36abaacdb73ce3e553) | kenchoo (kenchoo) | CC-BY 4.0 | 18.4k | 1 | yes | 2024-03-07 | - | Derivative re-upload (kenchoo) of the bear above; kenchoo also re-uploads other models (Hermit Crab, Mosasaurus). |
| 6 | reject | [Mad polar bear [game ready 3D model]](https://sketchfab.com/3d-models/mad-polar-bear-game-ready-3d-model-ee0bdaf49fa3478696b5e536306064fb) | KrayDay (vladruz2005) | CC-BY 4.0 | 17.5k | 1 | yes | 2023-01-13 | Sci-fi armoured bear; off-theme. | Own meme design. |
| 7 | reject | [BEAR - Realistic 3D Model (DEMO FREE)](https://sketchfab.com/3d-models/bear-realistic-3d-model-demo-free-8ba2b39b31474ddd96d95d47119250b1) | WildMesh 3D (WildMesh_3D) | CC Attribution-NonCommercial | 13.6k | 2 | yes | 2026-07-31 | - | WildMesh "BEAR - Realistic (DEMO FREE)": licence is CC BY-NC. |

### Killer whale, leviathan and tentacles

**Recommendation.** Tentacles: CG Daniel Glebinski's rigged tentacle, instanced through the ice. Leviathan head: HighPolyDensity's "Lurker" (6 clips, credited author). Orca: dashdu's clean low-poly killer whale for fins at the ice edge.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Tentacle (rigged)](https://sketchfab.com/3d-models/tentacle-rigged-8fcc783af94246a0b8febf424a4b96b9) | CG Daniel Glebinski (CGDanielGlebinski) | CC-BY 4.0 | 9.7k | 1 | yes | 2016-10-13 | Best pick for leviathan arms: 9.7k faces, rigged for wrapping, 1 clip. Instance 3-6 through cracks in the ice for slam/sweep/grab attacks. Textures are procedural Blender nodes: bake to images, regrade to black-violet with pale suckers. | CG Daniel Glebinski: the tentacle prop from his own short film "Maxipark Monster" (making-of on YouTube). 648 likes. Clean. |
| 2 | ok | [Lurker - Rigged and Animated](https://sketchfab.com/3d-models/lurker-rigged-and-animated-28b3e1a216904de7ad212368fb9d8f59) | HighPolyDensity (HighPolyDensity) | CC-BY 4.0 | 8.5k | 6 | yes | 2023-12-07 | Giant mutant squid, about 10 m tall idle, 8.5k faces, rigged, 6 clips (attack, death...). The leviathan's head for a big-creature boss or a set-piece rising from the sea; cheap on phones. | HighPolyDensity: already credited (Ember Tick); consistent original creature portfolio with lore. |
| 3 | ok | [Killer Whale](https://sketchfab.com/3d-models/killer-whale-63b680d7e58f463a9868ed7bf163094a) | Trouvaille (dashdu) | CC-BY 4.0 | 3.1k | 1 | yes | 2019-06-07 | Clean low-poly orca, 3k faces, rigged, swim clip. Black fins circling the floes (ambient threat, or a "killer whale strike" hazard at the ice edge). | Trouvaille (dashdu), own model, 343 likes. |
| 4 | risky | [Octopus rig](https://sketchfab.com/3d-models/octopus-rig-48f40cb3dfd5473fbb200cf1dcd7b944) | Dirk.z (138983) | CC-BY 4.0 | 31.3k | 0 | yes | 2021-02-05 | Untextured octopus rig, 31k faces: would need full texturing. | Dirk.z, original rig. |
| 5 | risky | [Tentacle riged](https://sketchfab.com/3d-models/tentacle-riged-5330ffa12f4741eca73c9714d90e79dc) | defiat11 (defiat11) | CC-BY 4.0 | 165.9k | 1 | yes | 2023-09-30 | Rigged tentacle, 166k faces; heavier than the pick. | School project (retryschool), no description. |
| 6 | risky | [Tentacles - Hellbrush / Viacheslav Nikulaichev](https://sketchfab.com/3d-models/tentacles-hellbrush-viacheslav-nikulaichev-9b071c16e1814e42bc5f9bbea17f3f11) | Hellbrush (hellbrush) | CC-BY 4.0 | 8.9k | 0 | no | 2022-05-09 | Static tentacles, 8.9k. | Hellbrush concept piece tagged "residentevil": may be Resident Evil fan art. |
| 7 | risky | [Kraken v2](https://sketchfab.com/3d-models/kraken-v2-4691fa1b881b4d43936b706f18dba169) | lawtrigg (lawtrigg) | CC-BY 4.0 | 31.3k | 1 | yes | 2021-03-17 | Stylised neon-suckered kraken. | lawtrigg, own. |
| 8 | risky | [Giant Squid Creature](https://sketchfab.com/3d-models/giant-squid-creature-b8b1738f406749aa8ffd53f7ac84132c) | Ethan (ethanchew) | CC-BY 4.0 | 41.9k | 5 | yes | 2023-06-28 | Red stylised squid, weak texturing. | Ethan, own. |
| 9 | reject | [Orca (updated version)](https://sketchfab.com/3d-models/orca-updated-version-6078bfc6cbdd4feb80703d00c5e055dc) | SKYE (GalileoGB) | CC-BY 4.0 | 16.3k | 0 | yes | 2019-09-27 | - | Anthro furry character; description restricts use to non-commercial, contradicting the label. |
| 10 | reject | [Orca](https://sketchfab.com/3d-models/orca-bed95f4dd0074593aaf5da0e41ff7614) | Avariax (avariax) | CC-BY 4.0 | 45.9k | 2 | yes | 2023-02-02 | - | Not an orca: a robot/alien girl named Orca. |
| 11 | reject | [Reaper Leviathan](https://sketchfab.com/3d-models/reaper-leviathan-dfbe936f6fcb40f79bef4d0de6d83a27) | patrat623 (patrat623) | CC-BY 4.0 | 8.6k | 1 | yes | 2021-08-06 | - | Reaper Leviathan: Subnautica IP fan art. |

### Sea birds (skua swarm)

**Recommendation.** Dayvable's rigged flock gull regraded to great-skua brown, plus the Oregon State University gulls for roosts. Alexei Ostapenko's crow for the Skotos-touched carrion birds.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Seagull](https://sketchfab.com/3d-models/seagull-dc42ffc81c86480e9e7f7752fa134174) | Dayvable (Dayvable) | CC-BY 4.0 | 4.4k | 1 | yes | 2022-02-14 | Best pick: 4.4k-face gull with a bones-only rig and a flap clip. Regrade to dark-brown great skua; boids swarm in code, dive-peck attack. Cheap enough for 10-15 instances (or use the 808-face flock below at range). | Dayvable, made for a flock simulation, tagged noai, 192 likes. |
| 2 | ok | [Ring-Billed Gull - in Flight](https://sketchfab.com/3d-models/ring-billed-gull-in-flight-fba809cd4766411bb8c4236e9da606bc) | osuecampus (OSU.Multimedia) | CC-BY 4.0 | 3.2k | 1 | yes | 2024-04-05 | Realistic ring-billed gull in flight, 3.2k faces, 1 clip. | Oregon State University ecampus (OSU.Multimedia): institutional. |
| 3 | ok | [Ring-Billed Gull](https://sketchfab.com/3d-models/ring-billed-gull-3df7913df7f34b90b152b05e12737c43) | osuecampus (OSU.Multimedia) | CC-BY 4.0 | 2.9k | 1 | yes | 2024-04-05 | Standing gull (2.9k) for roosts on the wrecks that take off when the hero comes near. | Oregon State University ecampus. |
| 4 | ok | [Crow](https://sketchfab.com/3d-models/crow-d5a9b0df4da3493688b63ce42c8a83e2) | Alexei Ostapenko (alexanders823) | CC-BY 4.0 | 2.2k | 1 | yes | 2019-04-24 | Realistic dark crow, 2.2k faces, 1 clip: the Skotos-touched carrion birds. | Alexei Ostapenko, own, 1,434 likes. |
| 5 | ok | [Seagulls animated](https://sketchfab.com/3d-models/seagulls-animated-73aed843190a4dfda55f2b65cc0f8d63) | vicente betoret ferrero (deathcow) | CC-BY 4.0 | 808 | 1 | yes | 2020-12-06 | Very low-poly animated gull flock (808 faces total): distant ambient only. | deathcow, own. |
| 6 | reject | [Seagull All animation Little nighmares](https://sketchfab.com/3d-models/seagull-all-animation-little-nighmares-a52b09af8aed4c2aa4f6da043b0872c9) | alex.andain.777 (alex.andain.777) | CC-BY 4.0 | 4.9k | 8 | yes | 2023-09-27 | - | Little Nightmares seagull: game rip. |

### Ice spiders and crustaceans

**Recommendation.** HighPolyDensity's "Pale Blight Queen" (new mesh, 11 clips, credited) regraded to ice as an elite; Spinnee's ice spider for the common unit; anthonyvanoo's rigged scorpion as a sea-scorpion. The Pale Blight Drone is the Ember Tick mesh (duplicate).

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Pale Blight Queen](https://sketchfab.com/3d-models/pale-blight-queen-61cf19ab28224a199ded284a98f09ce0) | HighPolyDensity (HighPolyDensity) | CC-BY 4.0 | 23.0k | 11 | yes | 2025-05-01 | Best pick: stone-carapaced spider-beetle queen, 23k faces, rigged, 11 clips. A new mesh (the Ember Tick was the Drone). Regrade pale ice-blue with crystal growths: the "Rime-mother" elite that lays ice-louse eggs. | HighPolyDensity (credited), original lore and colourways. |
| 2 | ok | [Spider Sketch](https://sketchfab.com/3d-models/spider-sketch-a69a27b055cc4ce5b8bb67c5c2c2ce08) | Spinnee (Spinnee) | CC-BY 4.0 | 11.1k | 0 | yes | 2023-01-24 | Ice-themed spider with a crystal on its back, 11k faces, stylised low-poly, rig flagged but no clips: make clips in lib.mjs. Cheap common "frost-weaver". | Spinnee, original ("a colder motif"). |
| 3 | ok | [Scorpion](https://sketchfab.com/3d-models/scorpion-4c0fd62d33ab4d2592ee0a1d985a480d) | anthonyvanoo (anthonyvanoo) | CC-BY 4.0 | 7.3k | 5 | yes | 2019-05-07 | Rigged scorpion with 5 clips, 7.3k faces. Scaled and regraded as a sea-scorpion (eurypterid) crustacean. | anthonyvanoo, made for the game "All That's Left" (own work). |
| 4 | ok | [Pseudoscorpion](https://sketchfab.com/3d-models/pseudoscorpion-60a474f1f87040f38e073f87a63b7548) | .hapto GmbH (.hapto) | CC-BY 4.0 | 51.0k | 2 | yes | 2020-04-06 | Realistic pseudoscorpion with 2 clips, 51k faces (decimate). A pale "ice-mite" crustacean. | .hapto GmbH / Senckenberg Museum. |
| 5 | ok | [Lotus Siren](https://sketchfab.com/3d-models/lotus-siren-c57127291d144521ae7bba17178ae689) | HighPolyDensity (HighPolyDensity) | CC-BY 4.0 | 43.7k | 9 | yes | 2025-05-23 | A 20-ft spider-mantis with six blade arms, 44k faces, 9 clips. Too big for a common enemy: a frost elite or a boss-arena add. | HighPolyDensity (credited), original series. |
| 6 | risky | [Pale Blight Drone](https://sketchfab.com/3d-models/pale-blight-drone-ba98d3a95fd04752953255ab31010c67) | HighPolyDensity (HighPolyDensity) | CC-BY 4.0 | 16.4k | 6 | yes | 2025-05-04 | Same mesh as the Act IV Ember Tick (a recolour): silhouette duplicate. | HighPolyDensity (credited). |
| 7 | risky | [Insectoid Monster Rig](https://sketchfab.com/3d-models/insectoid-monster-rig-01323e4b2563430f9da85cd255b6e176) | DM-913 (SuperKapoo913) | CC-BY 4.0 | 13.2k | 1 | yes | 2021-04-11 | Alien wasp: off-theme for the coast. | SuperKapoo913, original. |

### Sea hag and merrow

**Recommendation.** Sea hag from the pipeline ("healer" source with a crone table and code-made kelp veil). Merrow / coast-cultist: "Dagon's sectarian" (realistic, face rig, original). The hooded horror woman would be perfect but needs an AI-generation check first. The realistic "Fishman" is rejected (Bloodborne lookalike from a ripper account).

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | Quaternius "healer" source (Female_Peasant, Hair_Long) in people.glb (pipeline) | Quaternius | CC0 1.0 | - | - | yes | - | Safest pick: a CRONE table (len 0.95, girth 0.75, long fingers via hand len), soaked dark dress grade, long wet hair (Hair_Long recoloured), code-made kelp veil (veil()), barnacled hands; shares moves.bin (song/cast clips exist from the Mourner). | Shipped and credited; no download. |
| 2 | ok | [Dagon 's sectarian](https://sketchfab.com/3d-models/dagon-s-sectarian-b883b0b1190f4c5f9617ae20d3d3fad9) | David Glynch (yaveselyigolovastic) | CC-BY 4.0 | 47.5k | 1 | yes | 2023-08-09 | Realistic pale bald man with tentacles in his gut and a hook, 47.5k faces, rigged with face rig, 1 clip. The coast-cult "Skotos-faithful" (merrow-kin). Decimate to about 12k; rebind body to the people skeleton. | David Glynch: original character ("Stepan"), midpoly, face rig, 4k textures; Dagon/Lovecraft are public domain. No duplicate. |
| 3 | risky | [Terrifying Hooded Horror Woman](https://sketchfab.com/3d-models/terrifying-hooded-horror-woman-f59d17be392f4494a5b85d927df48ffd) | Purple.Point (Purple.Point) | CC-BY 4.0 | 40.0k | 1 | yes | 2025-08-15 | Realistic gaunt hooded woman in a tattered black dress, 40k faces, rigged, 1 clip. With a wet regrade it is the ideal sea hag. | Purple.Point: a horror-creature series; animated versions sold on Fab, this free one is CC-BY. No process notes: confirm it is not AI-generated before use. |
| 4 | risky | [Deep One](https://sketchfab.com/3d-models/deep-one-a71d657f33c04d4f8be403cf019c380e) | coremort (coremort) | CC-BY 4.0 | 4.3k | 0 | no | 2020-07-07 | Stylised low-poly deep one (4.3k). | coremort, first model, original. |
| 5 | risky | [Selian Siren Rig](https://sketchfab.com/3d-models/selian-siren-rig-7e60fcb96f824cf9aa022edddfdc34eb) | DM-913 (SuperKapoo913) | CC-BY 4.0 | 48.7k | 3 | yes | 2023-02-17 | Neon moth-siren; off-theme. | SuperKapoo913, original. |
| 6 | reject | [Fishman](https://sketchfab.com/3d-models/fishman-8e5403aa51c94a0bb03c845882cd02a8) | w7w728115 (w7w728115) | CC-BY 4.0 | 27.3k | 0 | no | 2020-06-24 | - | Uploader's other models are game rips (Armored Core "White Glint", "Virtuous Contract"); the design matches the Fishing Hamlet fishmen of Bloodborne. |
| 7 | reject | [Drowned Hag - Waterlogged Horror Witch](https://sketchfab.com/3d-models/drowned-hag-waterlogged-horror-witch-9a4cc20c82b84c3989f5b63576eddb19) | Pigcraft (s8819296) | CC-BY 4.0 | 2.0M | 0 | no | 2026-08-11 | - | Description says it was generated with AI-assisted tools; 2M faces. |
| 8 | reject | [fishman](https://sketchfab.com/3d-models/fishman-26bb758a58b949eb8639e5338b939646) | DeliciousDynamite (PixelDynamix) | CC-BY 4.0 | 7.2k | 34 | yes | 2025-08-25 | - | Same mesh re-posted as "the infernal" a day later; 34 clips on a crude mesh suggests a converted pack. |

### Ghostly ship crew

**Recommendation.** Pipeline sailors with the existing spirit shader (as the Lampless), with Muru's "Stelae knight" as the ghost captain. Every Sketchfab wraith found is a game rip or Nazgul fan art.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | Quaternius villager0/1/2 and warden sources (pipeline) | Quaternius | CC0 1.0 | - | - | yes | - | Best pick: realistic sailors with the existing spirit flesh (uDissolve/uRim, as the Lampless), sea-green rim light, code-made oars, hooks and ship-lanterns. Translucent and faded below the knees; they walk the wreck decks at night tide. | Shipped; no download. |
| 2 | ok | Character Pack: Skeletons (already in skeleton.glb) (existing) | Kay Lousberg / KayKit | CC0 1.0 | - | - | yes | - | The drowned crew's bones in the hold; regrade with barnacles and kelp. Cheap filler. | Shipped. |
| 3 | ok | [Stelae knight](https://sketchfab.com/3d-models/stelae-knight-0a795ae613f2496e955974ca37bf1e94) | Muru (muru) | CC-BY 4.0 | 20.1k | 1 | yes | 2021-10-08 | Realistic hooded knight with a great sword, 20k faces, rigged, 1 clip. With the spirit shader: the ghost ship's captain (elite). | Muru: realtime character after concept art by Shuohan (credit both); not a game IP. |
| 4 | reject | [The Dark Wraith](https://sketchfab.com/3d-models/the-dark-wraith-392342e94ee94c1b823a367a8ddcf9ee) | davidkong (davidkong) | CC-BY 4.0 | 150.3k | 0 | no | 2017-01-31 | - | Self-declared "inspired by Dark Souls and The Lord of the Rings"; reads as a Nazgul. |
| 5 | reject | [Wraith](https://sketchfab.com/3d-models/wraith-ac1cc4d4f2344633940a3d9e44224ab6) | Vasian-Digital3D (Vasian-Digital3D) | CC-BY 4.0 | 41.8k | 1 | yes | 2025-06-22 | - | Evolve "Wraith" rip (the same mesh is posted by Professor_E12 with "From evolve"). |
| 6 | reject | [wraith](https://sketchfab.com/3d-models/wraith-24e40a56f53443418b762e398f504d97) | photon (that one larry) (Professor_E12) | CC-BY 4.0 | 41.8k | 0 | yes | 2025-06-25 | - | "From evolve": game rip. |
| 7 | reject | [Banshee - idle Test](https://sketchfab.com/3d-models/banshee-idle-test-264df160ccdd4a61b8c888a20f6035eb) | OGL (GaryLim) | CC-BY 4.0 | 8.6k | 1 | yes | 2020-07-31 | - | Gundam Banshee: IP. |
| 8 | reject | [Cursed Sea Veteran](https://sketchfab.com/3d-models/cursed-sea-veteran-b3e05d4ec6284466999e2500a5408031) | Sod's Low (pati) | CC-BY 4.0 | 924 | 5 | yes | 2024-05-04 | Blockbench voxel style: wrong look. | Original (Sod's Low). |

### The Skotos (old, amorphous, abyssal)

**Recommendation.** bast_yy's "Ocean Creature" (tall, tentacled, rigged) as the Skotos taking shape; Tim0's "Living Flesh Blob" regraded to black ichor as the spawner; alexalbinyana's "LOVECRAFTIAN HORROR" bursting from the ice; the glass octopus as drifting dark-lights. Tim0's "Maw of the Void" is declared Darksiders fan art (rejected).

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Ocean Creature](https://sketchfab.com/3d-models/ocean-creature-5c17cca6086e4910aa12e7d701ccd6a1) | bast_yy (bast_y) | CC-BY 4.0 | 58.9k | 1 | yes | 2022-11-24 | Best pick: a tall glossy blue-black tentacled thing (59k faces, joint rig with IK/FK, 1 clip). Regrade toward lightless black with a faint violet sheen: the Skotos taking a shape. Decimate to about 15k. | bast_yy: from the author's own short animation, with ArtStation case studies. Clean. |
| 2 | ok | [Living Flesh Blob - Free Organic Horror Asset](https://sketchfab.com/3d-models/living-flesh-blob-free-organic-horror-asset-6357bbc094d54cf5ba150ef2951b3750) | Yury Misiyuk (Tim0) | CC-BY 4.0 | 9.9k | 1 | yes | 2026-02-25 | Pulsating biomass with tendrils, 10k faces, rigged, pulse clip. Regrade from red to black ichor with violet veins: the "Seep" that spawns adds and darkens the ice. | Tim0 (Yury Misiyuk), already credited (magma hound, Hammerhorns); original. |
| 3 | ok | [LOVECRAFTIAN HORROR](https://sketchfab.com/3d-models/lovecraftian-horror-6093cbb205444e9aa7b36d7be4ed9b58) | alexalbinyana (alexalbinyana) | CC-BY 4.0 | 13.1k | 0 | no | 2017-08-17 | Pale worm-body with toothed mouths and tentacles, 13k faces, not rigged (worm-style spine rig in code). A "Mouth of the Deep" that bursts from the ice. | alexalbinyana: character for his discontinued game "The Fallen". A copy was posted later by Leo_Newman as "Fish Man Tpose" (rejected). |
| 4 | ok | [Glass octopus](https://sketchfab.com/3d-models/glass-octopus-0238634d283a4cff9a0029eaf74dfe58) | Andrey (andrey.) | CC-BY 4.0 | 16.9k | 1 | yes | 2025-05-07 | Realistic glass octopus, 17k faces, rigged, 1 clip. Floating translucent "dark-lights" that drift over the ice and drink light. | Andrey: transparency study of a real species (Vitreledonella). |
| 5 | ok | [Archea](https://sketchfab.com/3d-models/archea-28262c1818744dfaa2a948415037bd6f) | coremort (coremort) | CC-BY 4.0 | 18.8k | 0 | no | 2020-07-21 | Chthonian jellyfish-trilobite, 19k faces, stylised cel look; not rigged. Small Skotos-spawn. | coremort, own (ArtStation link). |
| 6 | ok | [Flesh Blob](https://sketchfab.com/3d-models/flesh-blob-b3f5bb51f8144a30b6fa6b22f5d44bf7) | ChopperManiac (ChopperManiac) | CC-BY 4.0 | 21.7k | 1 | yes | 2021-07-08 | Tentacle mass, 22k, 1 clip: set dressing where the Skotos breaks the ice. | ChopperManiac, ArtStation Learning course output (own). |
| 7 | risky | [Creeping Shadow Creature – Free Horror 3D Model](https://sketchfab.com/3d-models/creeping-shadow-creature-free-horror-3d-model-53e77576ca0b4c5988ba2991a4bff075) | Purple.Point (Purple.Point) | CC-BY 4.0 | 99.2k | 0 | yes | 2025-12-22 | Realistic gaunt dark humanoid, 99k faces, rigged: the "Unlit", people the Skotos has emptied. | Purple.Point (same AI check as the hooded woman). |
| 8 | risky | [Blob Monster](https://sketchfab.com/3d-models/blob-monster-cea04aa089c14983b5896f8785771b7c) | alexalbinyana (alexalbinyana) | CC-BY 4.0 | 9.4k | 1 | yes | 2021-01-13 | Pale blob-man. | Textures from ArtBreeder (AI) by the author's own note; Mixamo clip. |
| 9 | reject | [Maw of the Void - Free Creature Asset](https://sketchfab.com/3d-models/maw-of-the-void-free-creature-asset-402848d2da654330bc9c3f23ec06cf8d) | Yury Misiyuk (Tim0) | CC-BY 4.0 | 13.3k | 1 | yes | 2026-04-22 | Would have been ideal (Tim0, credited). | Self-declared fan art of Darksiders Genesis concept art (tags "fanart", "darksiders"). |
| 10 | reject | [FREE Eldritch horror Inspired Creature](https://sketchfab.com/3d-models/free-eldritch-horror-inspired-creature-dedd097fb3ea4b388c7d7c71d5908d3c) | Axinovium (Axinovium) | CC-BY 4.0 | 47.4k | 0 | no | 2024-06-15 | - | Tagged "AI" / "ai-generated". |
| 11 | reject | [Sentience](https://sketchfab.com/3d-models/sentience-ab69ee49cea14101bc6b3550cc341466) | dagonrevenge (dagonrevenge) | CC-BY 4.0 | 15.6k | 0 | no | 2020-06-07 | - | Risk of Rain 2 "Wandering Vagrant" homage (fan art). |
| 12 | reject | [Fish Man Tpose](https://sketchfab.com/3d-models/fish-man-tpose-2fc8a8c003184f6f85f310c074148a2d) | Leo_Newman (Leo_Newman) | CC-BY 4.0 | 13.1k | 0 | no | 2021-10-01 | - | Re-upload of alexalbinyana's LOVECRAFTIAN HORROR (same 13,130 faces). |

## Bosses

### Boss: big creature

**Recommendation.** Best: "Crab mountain" scaled x4 as a crab carrying a wreck or a ruined light (the tide mechanic drives the fight). Strong alternative: the "Lurker" squid rising through a breathing hole with instanced tentacles from the cracks.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Crab mountain](https://sketchfab.com/3d-models/crab-mountain-ac8fa79586f84c84a8a55dd86b7a2e2f) | pro100voron (pro100voron) | CC-BY 4.0 | 42.0k | 1 | yes | 2020-04-01 | Pick 1: scale x4 as "the Wreck-Bearer", a crab-mountain carrying a whole wreck or the keepers' ruined light on its back; the tide mechanic drives the fight (it sleeps as an island at ebb, moves at flood; break the cracked ice under it). Needs a full clip set from lib.mjs. | See sea_crawler (reverse-image search first). |
| 2 | ok | [Lurker - Rigged and Animated](https://sketchfab.com/3d-models/lurker-rigged-and-animated-28b3e1a216904de7ad212368fb9d8f59) | HighPolyDensity (HighPolyDensity) | CC-BY 4.0 | 8.5k | 6 | yes | 2023-12-07 | Pick 2: the leviathan rising through a breathing hole, with instanced "Tentacle (rigged)" arms from cracks around the arena. Already has attack and death clips. | See leviathan_orca_tentacles. |
| 3 | ok | [Pistosaur Animated](https://sketchfab.com/3d-models/pistosaur-animated-773667575a264c7baa4ec404115a044b) | RickStikkelorum (ricksticky) | CC-BY 4.0 | 16.7k | 1 | yes | 2019-11-26 | Pick 3: a sea serpent that surfaces in different ice holes (whack-a-mole with cracking ice). | See sea_serpent_ice_wyrm. |
| 4 | ok | [Walrus (Odobenus rosmarus)](https://sketchfab.com/3d-models/walrus-odobenus-rosmarus-14861dc81071430e9ecac668864ea743) | Museo [UV] Historia Natural (MUVHN) | CC-BY 4.0 | 3.3M | 0 | no | 2023-06-13 | Alt: a gigantic tusk-mother whose belly-slams crack the floe. | See walrus_seal_beast. |

### Boss: humanoid-ish

**Recommendation.** Best: Kaan Tezcan's "Ancient Titan Vol2" (realistic, rigged version available) as the frozen king or last keeper. Alternative: Blue Spirit's skull-faced "Cursed Knight" on the UE5 skeleton, which plays moves.bin after a light bone map, as the drowned jarl.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Free Game Character - Ancient Titan Vol2](https://sketchfab.com/3d-models/free-game-character-ancient-titan-vol2-0e71dd1a27a2455b9adae83082905958) | Kaan Tezcan (kaanTezcan) | CC-BY 4.0 | 56.2k | 0 | yes | 2022-10-08 | Pick 1: the white ancient giant reads as a frozen king or the last Keeper of the sea lights turned to rime. 56k faces: decimate to 15-20k; a UE rig version is linked, so rebind is the folk.mjs path (BONEMAPS if needed). Clips from moves.bin. | Kaan Tezcan, free-character series, CC-BY (credit optional by the author); consistent original portfolio, no duplicate found. Reverse-image search the thumbnail before download anyway (cheap insurance, as was done for Karthax). |
| 2 | ok | [Cursed Knight - UE5 Character (Game Ready)](https://sketchfab.com/3d-models/cursed-knight-ue5-character-game-ready-f204e0ad3af645bcb0ecffd9e9ae9a15) | Blue Spirit (Blue-Spirit) | CC-BY 4.0 | 130.9k | 0 | yes | 2024-02-02 | Pick 2: skull-faced armoured knight on the UE5 skeleton (same naming family as the people), so it plays moves.bin after a light map (UE5 adds spine_04/05, neck_02). 131k faces: decimate to about 20k. The drowned jarl / captain of the ghost ship. | Blue Spirit: own design (variants sold on ArtStation, this one free CC-BY). Portfolio also has Witcher-themed outfits, but this knight is not a Witcher asset. |
| 3 | ok | [Free Game Character -The Ancient Woman Titan](https://sketchfab.com/3d-models/free-game-character-the-ancient-woman-titan-cefcf7391fbb45bfb5ef761e388e8eea) | Kaan Tezcan (kaanTezcan) | CC-BY 4.0 | 60.5k | 2 | yes | 2022-10-20 | Masked armoured woman titan with an ember crest, 60k faces, rigged, 2 clips. Alt for a female keeper or the hag-queen. | Kaan Tezcan, same terms. |
| 4 | ok | [Viking - rigged for animation](https://sketchfab.com/3d-models/viking-rigged-for-animation-79321179bafb4d558f0cd6a4a014ba9a) | Andy Woodhead (Andywoodhead) | CC-BY 4.0 | 120.1k | 0 | yes | 2023-07-14 | Alt: a drowned Viking jarl (UE4 mannequin rig, moves.bin-ready). | See drowned_dead. |
| 5 | ok | [Stelae knight](https://sketchfab.com/3d-models/stelae-knight-0a795ae613f2496e955974ca37bf1e94) | Muru (muru) | CC-BY 4.0 | 20.1k | 1 | yes | 2021-10-08 | Alt: ghost captain. | See ghost_crew. |
| 6 | ok | [Free Game Character - Ancient Titan Vol 4](https://sketchfab.com/3d-models/free-game-character-ancient-titan-vol-4-193a8c02f61642bea89cf1b2f0c5a833) | Kaan Tezcan (kaanTezcan) | CC-BY 4.0 | 92.1k | 0 | yes | 2022-11-17 | Alt giant with a great axe, 92k faces. | Kaan Tezcan. |
| 7 | risky | [Umbra Marauder Rig](https://sketchfab.com/3d-models/umbra-marauder-rig-2d8b32f0864644b5980b81b571b1838f) | DM-913 (SuperKapoo913) | CC-BY 4.0 | 109.8k | 3 | yes | 2023-08-21 | 110k faces, dark alien. | SuperKapoo913 says it is reminiscent of Skyrim's Falmer: check the likeness. |
| 8 | risky | [Pale Knight Animated](https://sketchfab.com/3d-models/pale-knight-animated-9594a385689745eb89effb9f57d72142) | mara3m (relloksator) | CC-BY 4.0 | 59.8k | 1 | yes | 2025-09-23 | Dark knight with an ice-blue sword, 60k. | Uploader's portfolio is mostly fan art (Roblox, Kenshi, Halo, Superman). |
| 9 | risky | [⛨ The Forgotten Knight ⛨](https://sketchfab.com/3d-models/the-forgotten-knight-d14eb14d83bd4e7ba7cbe443d76a10fd) | dark_igorek (dark_igorek) | CC-BY 4.0 | 223.7k | 0 | yes | 2025-02-23 | Rose-wrapped crusader, 224k faces: off-theme. | dark_igorek, original, but the same account posts fan art (Silksong). |
| 10 | reject | [Ice Queen](https://sketchfab.com/3d-models/ice-queen-53ff071b74344be3ac1e4054653d1fe7) | Mike Inel (mikeinel) | CC-BY 4.0 | 7.5k | 6 | yes | 2020-02-08 | - | Adventure Time "Ice Queen" fan model. |
| 11 | reject | [Night King](https://sketchfab.com/3d-models/night-king-b6696f5234714b189434b0fe865205c8) | tanstyle050 (tanstyle050) | CC-BY 4.0 | 19.4k | 0 | no | 2017-08-25 | - | Game of Thrones Night King: IP. |
| 12 | reject | [Kel’Thuzad - World of Warcraft](https://sketchfab.com/3d-models/kelthuzad-world-of-warcraft-c65db23c2a664f9794ae362145b11758) | Brian Trepanier (CMBC) | CC-BY 4.0 | 1.1M | 0 | no | 2025-10-28 | - | World of Warcraft Kel'Thuzad: IP. |

## Props

### Shipwrecks

**Recommendation.** The Swedish maritime museums' scan of the Dalaro wreck as the hero hull, Poly Haven's rigged pinnace broken in code for mid-size wrecks, scarit's broken boat and megamaniac's hull fragment as scatter.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [The Dalarö wreck/ Bodekull part 2](https://sketchfab.com/3d-models/the-dalaro-wreck-bodekull-part-2-027900c8fdf840f589cadb9f4a60d78c) | SWEDISH NATIONAL MUSEUMS, MTF (maritima) | CC-BY 4.0 | 860.4k | 0 | no | 2018-11-29 | Best hero wreck: a real broken hull on the seabed. 860k faces: decimate to about 25k and bake. Lay it in the fjord shallows, exposed at low tide. | Swedish National Maritime and Transport History Museums: photogrammetry of the 17th-century Dalaro wreck. Institutional; logos are on the thumbnail only. |
| 2 | ok | [Ship Pinnace](https://polyhaven.com/a/ship_pinnace) (polyhaven-model) | James Ray Cock, Rico Cilliers, Nicolò Zubbini, Yann Kervran | CC0 1.0 | 183.8k | 0 | yes | 2022-05-11 | Rigged pinnace (184k faces, 4k textures): break it in code (tilt, sink to the waterline, drop the sails) for a mid-size wreck; decimate. | Poly Haven, CC0. |
| 3 | ok | [Old Wooden Boat 3D Model Model](https://sketchfab.com/3d-models/old-wooden-boat-3d-model-model-821da49c6375440b8498b6a67376272a) | Scarit (scarit) | CC-BY 4.0 | 18.7k | 0 | no | 2025-04-04 | Realistic abandoned wooden boat with broken planks, 18.7k faces. Strip the rusted metal fittings for the era. | Scarit, own. |
| 4 | ok | [Broken Row Boat](https://sketchfab.com/3d-models/broken-row-boat-41c2bcc5ca544897a132be71f3b2673a) | megamaniac (megamaniac) | CC-BY 4.0 | 1.6k | 0 | no | 2017-04-19 | Hull fragment, 1.5k faces: cheap scatter debris. | megamaniac, own. |
| 5 | ok | [Dutch Ship Medium](https://polyhaven.com/a/dutch_ship_medium) (polyhaven-model) | James Ray Cock, Rico Cilliers, Nicolò Zubbini | CC0 1.0 | 69.2k | 0 | no | 2022-05-25 | Far-off wreck silhouette (69k): heavy, use only as a distant hulk. | Poly Haven, CC0. |
| 6 | risky | [Ship Wrecked](https://sketchfab.com/3d-models/ship-wrecked-abd170efe5ed48f596751eb70ee191cb) | 9darsh2235 (9darsh2235) | CC-BY 4.0 | 41.0k | 0 | no | 2023-02-10 | Basic quality pirate wreck. | Own work. |
| 7 | reject | [Ship Wreck](https://sketchfab.com/3d-models/ship-wreck-3c54f80f27af43c1bc7fb7e9f84c460b) | BWilkinson (BWilkinson) | CC-BY 4.0 | 135.0k | 0 | no | 2017-04-30 | Pirate skull flag on an iceberg base: unusable as a prop. | University diorama. |

### Longships

**Recommendation.** Opus Poly's Gislinge boat (a real 12th-century reconstruction) first; massive-graphisme's longship for a full drakkar.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Gislinge Viking Boat](https://sketchfab.com/3d-models/gislinge-viking-boat-01098ad7973647a9b558f41d2ebc5193) | Opus Poly (OpusPoly) | CC-BY 4.0 | 29.0k | 0 | no | 2020-10-29 | Best pick: realistic Norse working boat, 29k faces. Beached keepers' boats and the hero's crossing. | Opus Poly: reconstruction of the real 12th-century Gislinge boat, tagged noai, 1,223 likes. |
| 2 | ok | [Viking longship](https://sketchfab.com/3d-models/viking-longship-3d649f8373514860b69ff6f874c0efb5) | massive-graphisme (massive-graphisme) | CC-BY 4.0 | 49.4k | 0 | no | 2020-07-31 | Realistic longship, 49k faces; repaint the red dragon sail. | massive-graphisme: own model based on the Oseberg/Gokstad ships (only "inspired by" a game trailer). |
| 3 | ok | [Oselvar wooden boat.](https://sketchfab.com/3d-models/oselvar-wooden-boat-63f56e450b8e43058bc67a150067c973) | Arkikon (ragnar) | CC-BY 4.0 | 19.0k | 0 | no | 2023-04-13 | Realistic, 19k faces. | Arkikon (ragnar): traditional western-Norway Oselvar boat. |
| 4 | ok | [Knorr](https://sketchfab.com/3d-models/knorr-d02fad37dc324d6a810ed07e1390aed4) | Derlvenner (Derlvenner) | CC-BY 4.0 | 89.4k | 0 | no | 2018-08-18 | Knorr cargo ship, 89k faces: decimate. | Derlvenner, own. |
| 5 | ok | [Viking Longship](https://sketchfab.com/3d-models/viking-longship-ecc03f0875e34a0cb2e66c40b22383e5) | Foxx Assets (FoxxAssets) | CC-BY 4.0 | 14.8k | 0 | no | 2021-10-10 | Clean 15k longship, but the red-white striped sail is a cliche: repaint. | Foxx Assets, own. |

### Rowing boats

**Recommendation.** TooManyDemons' "Old Rowboat"; bumstrum's 939-face boat for mass scatter.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Old Rowboat](https://sketchfab.com/3d-models/old-rowboat-9922d5678af84adeb1c9b479856446ca) | TooManyDemons (toomanydemons) | CC-BY 4.0 | 5.5k | 0 | no | 2018-08-23 | Best pick: weathered painted rowboat with oar, 5.5k faces. | TooManyDemons, own, 1,053 likes. |
| 2 | ok | [Boat](https://sketchfab.com/3d-models/boat-5cdc4fc134e84a8d97fb2d3ffaf5c5fb) | DJMaesen (bumstrum) | CC-BY 4.0 | 939 | 0 | no | 2020-03-30 | Low-poly old boat, 939 faces: mass scatter. | DJMaesen (bumstrum), credited author. |
| 3 | ok | [Old Boat](https://sketchfab.com/3d-models/old-boat-a9ce4ca0cac14f448c72bb94ad193437) | donnichols (donnichols) | CC-BY 4.0 | 8.4k | 0 | no | 2021-01-11 | Realistic boat with 2 oars, 8.4k faces. | donnichols, own. |
| 4 | risky | [Rowing Boat](https://sketchfab.com/3d-models/rowing-boat-748e9f5262a24a489d10af0d87e0e9f7) | J.J.West (jw202471) | CC-BY 4.0 | 4.7k | 0 | no | 2019-06-14 | Modern RNLI lifeboat with a painted name ("Cinnamon Wind"): needs a retexture. | Own work. |

### Anchors

**Recommendation.** wolfgar74's medieval wooden-stock anchor; the shell-crusted sunken anchor for the tide zone.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Medieval Anchor (Free)](https://sketchfab.com/3d-models/medieval-anchor-free-5896ac54d63e4b84bd32e0b232619dfd) | wolfgar74 (wolfgar74) | CC-BY 4.0 | 2.4k | 0 | no | 2018-11-25 | Best pick: medieval anchor with wooden stock, 2.4k faces. | wolfgar74, own. |
| 2 | ok | [Sunken Anchor](https://sketchfab.com/3d-models/sunken-anchor-e654cb6e6e2c4217a7decb6bb9c0010d) | guillaume.biju-duval (guillaume.biju-duval) | CC-BY 4.0 | 3.4k | 0 | no | 2021-04-16 | Sunken anchor with chain, shells and algae, 3.4k: tide-zone dressing. | guillaume.biju-duval, own. |
| 3 | ok | [Old rusted anchor](https://sketchfab.com/3d-models/old-rusted-anchor-abb9321ad29243228b4ea6dabc325db9) | trivial.cat (trivial.cat) | CC-BY 4.0 | 3.3k | 0 | no | 2020-09-09 | Heavily damaged iron anchor, 3.3k. | trivial.cat, own, noai. |
| 4 | ok | [Old Bronze Anchor](https://sketchfab.com/3d-models/old-bronze-anchor-cdd15e90d30d4b07a3ff38eaa20bf896) | Daniel Bobrowski (Daniel.Bobrowski) | CC-BY 4.0 | 3.2k | 0 | no | 2019-12-20 | Verdigris bronze anchor with chain, 3.2k. | Daniel Bobrowski, own. |
| 5 | ok | [Chain & Anchor, River Thames Foreshore](https://sketchfab.com/3d-models/chain-anchor-river-thames-foreshore-daa72e261daa491ebfd2389aac826eed) | Thomas Flynn (nebulousflynn) | CC-BY 4.0 | 100.0k | 0 | no | 2023-07-20 | Mud-sunk anchor and chain, 100k: decimate. | Thomas Flynn: scan on the Thames foreshore, noai. |

### Nets and rope

**Recommendation.** ambientCG's CC0 alpha-cut net materials on draped planes, and ambientCG rope materials (Poly Haven has neither).

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Net 001 A](https://ambientcg.com/view?id=Net001A) (ambientcg-material) | ambientCG (Lennart Demes) | CC0 1.0 | - | 0 | no | 2024-01-20 | Best pick for nets: alpha-cut net material on a draped plane (Net001A-Net004B variants). Far cheaper than modelled nets. | ambientCG (CC0). |
| 2 | ok | [Net 003 A](https://ambientcg.com/view?id=Net003A) (ambientcg-material) | ambientCG (Lennart Demes) | CC0 1.0 | - | 0 | no | 2024-01-20 | Second net weave. | ambientCG (CC0). |
| 3 | ok | [Rope 001](https://ambientcg.com/view?id=Rope001) (ambientcg-material) | ambientCG (Lennart Demes) | CC0 1.0 | - | 0 | no | 2018-03-11 | Rope material for code-made tube ropes (Poly Haven has no rope). | ambientCG (CC0). |
| 4 | ok | [Rope 002](https://ambientcg.com/view?id=Rope002) (ambientcg-material) | ambientCG (Lennart Demes) | CC0 1.0 | - | 0 | no | 2018-03-21 | Alt rope. | ambientCG (CC0). |
| 5 | ok | [Square Net](https://sketchfab.com/3d-models/square-net-b5579a86b60146ad859cd8f8a60aaedd) | HenryMead (HenryMead) | CC-BY 4.0 | 16.4k | 0 | no | 2024-03-20 | Geometry net, 16k faces: hero hanging net only. | HenryMead, own. |
| 6 | ok | [fishing net](https://sketchfab.com/3d-models/fishing-net-cbb4bfc4e5654500a70dfe72ffc0ce0a) | cozee4sure (cozee4sure) | CC-BY 4.0 | 86.1k | 0 | no | 2019-01-12 | Heaped fishing net, 86k: decimate. | cozee4sure, own. |
| 7 | risky | [Fishing Supplies Set](https://sketchfab.com/3d-models/fishing-supplies-set-8742c7af23584443a42c24e52d25b60c) | FrodoUndead (FrodoUndead) | CC-BY 4.0 | 4.2k | 0 | no | 2023-05-02 | Modern plastic buckets and rod: wrong era. | FrodoUndead, own (for "Shinrin Yoku"). |

### Lighthouse / light tower

**Recommendation.** No ancient lighthouse model exists. Use JB3D's ruined round towers (and the shipped "Ruined Tower") regraded to frost, with a code-made fire-cage and lens: the keepers' sea-lights. Nirved's realistic stone lighthouse for the one tower still standing.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Pack of old towers in ruins](https://sketchfab.com/3d-models/pack-of-old-towers-in-ruins-f213359c6cbb4c29bf8880764faa0fb8) | JB3D (taz83) | CC-BY 4.0 | 73.5k | 0 | no | 2020-03-02 | Best pick: 3 ruined round stone towers (73k total, 2k textures). Regrade the moss to rime; add a code fire-cage, a bronze lens and the keepers' carved light-marks on top: the forgotten keepers' sea-lights. | JB3D (taz83), own, 503 likes. |
| 2 | ok | ["Ruined Tower" by Cianon (sketchfab a345f230525a43749f97927b3429e734), already in cinder.glb](https://sketchfab.com/3d-models/ruined-tower-a345f230525a43749f97927b3429e734) (existing) | Cianon | CC-BY 4.0 | - | - | - | - | Reuse for a second tower shape at no cost; regrade from ash to frost. | Shipped and credited. |
| 3 | ok | [Old Lighthouse](https://sketchfab.com/3d-models/old-lighthouse-19e1ff049db74dc8b6173976417c1048) | Nirved Kamble (nirved) | CC-BY 4.0 | 80.0k | 0 | no | 2022-10-17 | Realistic stone lighthouse, 80k faces; the iron lantern room is 19th-century, so replace it with a code fire-cage for the one standing light. | Nirved Kamble, own, noai. |
| 4 | risky | [Alexandria Light House](https://sketchfab.com/3d-models/alexandria-light-house-3dc89c97e48640149859dad6ca2831e6) | José Castanheira (JoseCasta) | CC-BY 4.0 | 23.2k | 0 | no | 2021-02-01 | Stylised-ish, 23k; the Pharos silhouette is recognisable and Mediterranean. | Own reconstruction of the Pharos (public-domain monument). |
| 5 | risky | [lighthouse](https://sketchfab.com/3d-models/lighthouse-dab98033118949728804bfc5f4076b8f) | Lora (Lora_o) | CC-BY 4.0 | 13.4k | 0 | no | 2021-06-29 | Stylised modern lighthouse. | Own. |
| 6 | risky | [FREE Old Style Lighthouse Assets (fixed)](https://sketchfab.com/3d-models/free-old-style-lighthouse-assets-fixed-ad450ca49c0c4ef3831059039191509a) | aresdavide94 (aresdavide94) | CC-BY 4.0 | 20.0k | 0 | no | 2023-05-04 | Red-brick modern lighthouse. | Own. |
| 7 | reject | [The Lighthouse](https://sketchfab.com/3d-models/the-lighthouse-1a85945dd2a840f594bf6cb003176a54) | cotman sam (cotman_sam) | CC-BY 4.0 | 13.3k | 0 | no | 2017-06-05 | Toon/cutesy style. | DAE student piece. |
| 8 | reject | [Clachtoll Broch](https://sketchfab.com/3d-models/clachtoll-broch-943a50ace2c144ad9b7146806e8b8529) | AOC Archaeology Group (aocarchaeology) | CC-BY 4.0 | 400.0k | 0 | no | 2021-01-28 | Unusable: the texture is a false-colour height map with no albedo. Reference only for an Iron-Age drystone tower. | AOC Archaeology laser scan: clean provenance. |

### Fishing huts and drying racks

**Recommendation.** Dominic Baker's plank shack and Adrian Christians' stilt hut. Make the stockfish racks in code: the Sketchfab racks are cartoon or untextured.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Wooden Shack](https://sketchfab.com/3d-models/wooden-shack-b0bc474f7803488dbe0fa5aeef2e9ace) | Dominic Baker (Domuk) | CC-BY 4.0 | 19.2k | 0 | no | 2024-01-02 | Best pick: realistic plank fishing shack, 19k faces, lit window. | Dominic Baker, own. |
| 2 | ok | [Fishing hut](https://sketchfab.com/3d-models/fishing-hut-53893f30793b40bd9a26089955b58705) | Adrian Christians (Aedrian1) | CC-BY 4.0 | 20.6k | 0 | no | 2023-01-24 | Hut on stilts with a crane and ladder, 20.6k: the keepers' landing. | Adrian Christians, own. |
| 3 | ok | Made in code from Poly Haven weathered_planks / medieval_wood and a cloth-strip fish mesh (code) | Skotos | n/a | - | - | - | - | Recommended for drying racks: the Sketchfab racks are cartoon or untextured. Instanced poles + hanging grey stockfish cards. | No third-party asset. |
| 4 | risky | [Fish Drying Rack](https://sketchfab.com/3d-models/fish-drying-rack-545a67028e45488cbdad553d9e1e4811) | rodgercarr13601 (rodgercarr13601) | CC-BY 4.0 | 2.7k | 0 | no | 2021-10-02 | Cartoon-coloured fish: regrade or skip. | Own. |
| 5 | risky | [Fish rack](https://sketchfab.com/3d-models/fish-rack-9b80f7cb4a1143009e4c78916f5ab52c) | ironicalghosty (ironicalghosty) | CC-BY 4.0 | 1.3k | 0 | no | 2017-10-31 | Untextured, simplistic. | Own. |

### Whale skeletons and bones

**Recommendation.** Ingenium Canada's full right-whale skeleton scan as the hero whale-fall; the beached-skull scans for scatter; cloclo's 4k skeleton far away. The Act IV Bregorn bones can be reused.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Skeleton - North Atlantic Right Whale](https://sketchfab.com/3d-models/skeleton-north-atlantic-right-whale-5c8664c56f9a4cf3ae6d9b8ec33b8dba) | Ingenium Canada (technoscience3d) | CC-BY 4.0 | 722.5k | 0 | no | 2020-11-09 | Best hero: a full real whale skeleton (723k faces): decimate per bone to about 25k total, regrade sun-bleached. The whale-fall on the beach. | Ingenium Canada (national museum): scans of the bones of "Glacier", a North Atlantic right whale. |
| 2 | ok | [Whale-skull @Martins Beach](https://sketchfab.com/3d-models/whale-skull-martins-beach-aaec8aa2eafe412fbe512b6176cabae7) | Emm (edemaistre) | CC-BY 4.0 | 232.5k | 0 | no | 2021-08-31 | Realistic skull on sand, 233k: decimate; trim the ground patch. | Emm (edemaistre): phone scan of a beached whale skull at Martins Beach. |
| 3 | ok | [Gray Whale Skull](https://sketchfab.com/3d-models/gray-whale-skull-5a22b0298240459f9ed88a5d85e136b6) | Vic DeLeon (h3dude) | CC-BY 4.0 | 206.3k | 0 | no | 2022-08-24 | Grey whale skull, 206k: decimate. | Vic DeLeon: Polycam scan at the San Diego Natural History Museum. |
| 4 | ok | [Low Poly Whale Bones](https://sketchfab.com/3d-models/low-poly-whale-bones-3f7eb8f492fd4be19796a18c27113653) | cloclo (cloclo) | CC-BY 4.0 | 4.2k | 0 | no | 2019-07-19 | Untextured low-poly whale skeleton, 4.2k: cheap distant scatter with a bone material. | cloclo, own ("don't care about credit"). |
| 5 | ok | [Fossil Whale MPC 677](https://sketchfab.com/3d-models/fossil-whale-mpc-677-8207cc8744824d42b8da248d3ced9a4f) | The Smithsonian Institution (Smithsonian) | CC0 1.0 | 150.0k | 0 | no | 2020-02-20 | Fossil whale in a rock slab, 150k: "the whale in the cliff" dressing. | Smithsonian Institution, CC0. |
| 6 | ok | "Ribs", "Spine", "Dragon Skull" by Bregorn (already shipped, CC-BY 4.0) (existing) | Bregorn | CC-BY 4.0 | - | - | - | - | Reuse as sea-drake bones in the ice at no cost (regrade white). | Shipped and credited. |
| 7 | reject | [Hvalabein, Whale bone](https://sketchfab.com/3d-models/hvalabein-whale-bone-098ff5efcb3c46c596a074c8ba40594c) | Faroe Islands National Museum (Savn) | CC0 1.0 | 141.5k | 0 | no | 2016-05-14 | Unusable: an unrecognisable fragment in an excavation trench, with a ruler in the scan. | Faroe Islands National Museum, CC0: clean provenance. |

### Icebergs and ice chunks

**Recommendation.** No clean iceberg model was found: the ice-cluster uploads are AI-generated, another is a Rust game skin. Build icebergs and floes in code from Poly Haven rock meshes with an ice shader; add Elin Hohler's icicles.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | Poly Haven rock/cliff meshes (boulder_01, rock_face_01/02, coast_rocks_01) re-shaded with a code ice shader (ambientCG Ice002 + fresnel + subsurface tint) (code) | Rico Cilliers, Dario Barresi, Rob Tuytel / ambientCG | CC0 1.0 | - | - | - | - | No acceptable CC-BY/CC0 iceberg model exists (the ones found are AI-made or game skins). Recommended: displaced, faceted rock meshes with an ice material; floes as flat extruded shards that the cracking-ice mechanic can split. | All CC0. |
| 2 | ok | [Icicle 01](https://sketchfab.com/3d-models/icicle-01-2dc75ae22f1c4d11abbfd32819312a12) | Elin (ElinHohler) | CC-BY 4.0 | 778 | 0 | no | 2021-12-04 | Realistic icicle strip, 778 faces: eaves, wreck rails, cave lips. | Elin Hohler, own, 343 likes. |
| 3 | ok | [Icy Terrain Export](https://sketchfab.com/3d-models/icy-terrain-export-463eef961fc643358a1929bec9f0f18f) | josevega (josevega) | CC-BY 4.0 | 53.3k | 0 | no | 2020-12-10 | Icy terrain tile, 53k: cut into floes or use as a reference texture. | josevega, own ("use as you will"). |
| 4 | reject | [Ice Cluster (free)](https://sketchfab.com/3d-models/ice-cluster-free-4d2271f8bf7f400e9a5c8f10812a32de) | chrismartin1337 (chrismartin1337) | CC-BY 4.0 | 1.9k | 0 | no | 2024-03-18 | - | Description: generated with SDXL-Turbo + TripoSR (AI); tagged "warcraft". The other "Ice Cluster" uploads by the same author are the same process. |
| 5 | reject | [Iceberg Furnace](https://sketchfab.com/3d-models/iceberg-furnace-95157af5f1bf448f96c7dd0aa32f559b) | Liam Moffitt (divadan) | CC-BY 4.0 | 2.3k | 0 | no | 2022-06-27 | - | A skin for the furnace in the game Rust. |
| 6 | reject | [Ice Environment](https://sketchfab.com/3d-models/ice-environment-a899c505f48245f8a6bd8236d83fe123) | matheus.kohatsu (matheus.kohatsu) | CC-BY 4.0 | 18.8k | 0 | no | 2020-11-23 | - | Derivative of "Cold pirates" by nonlly; low-poly toon. |

### Frozen waterfall

**Recommendation.** No candidate: build in code.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | Made in code: vertical ribbon meshes with the ice shader, icicle instancing (Icicle 01), ambientCG Ice003 normal (code) | Skotos | n/a | - | - | - | - | No good third-party candidate: build it in code. A frozen fall that thaws/cracks is also a natural mechanic hook. | No candidate found (only a voxel one). |

### Runestones

**Recommendation.** Thomas Flynn's optimised runestone scan (20k with normals) plus the Faroe Islands museum's CC0 Sandavagur stone; overlay the keepers' own glowing marks in code.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Monumental Runic Stone - Optimised, 20k](https://sketchfab.com/3d-models/monumental-runic-stone-optimised-20k-d95a850cd9114828a18b5dd72878d9ec) | Thomas Flynn (nebulousflynn) | CC-BY 4.0 | 20.0k | 0 | no | 2023-03-29 | Best pick: real carved runestone with a serpent band. Regrade and overlay the keepers' own light-marks (glowing, in code) so it is not read as plain Norse. | Thomas Flynn: photogrammetry of a museum runestone, optimised to 20k with a normal map, noai. |
| 2 | ok | [Rúnarsteinur í Sandavági](https://sketchfab.com/3d-models/runarsteinur-i-sandavagi-7f61d98582fd480e87c13542f50187f5) | Faroe Islands National Museum (Savn) | CC0 1.0 | 109.7k | 0 | no | 2018-10-22 | Realistic, 110k: decimate. Fits a northern-sea forgotten people. | Faroe Islands National Museum (Savn), CC0: the 13th-century Sandavagur runestone. |
| 3 | ok | [Stone Entrance](https://sketchfab.com/3d-models/stone-entrance-ea4a511423bd4a1dab2fe32665edd67e) | DJMaesen (bumstrum) | CC-BY 4.0 | 6.4k | 0 | no | 2021-07-21 | Standing-stone arch, 6.4k: the keepers' gate. | DJMaesen (credited); game-ready rework of someone else's standing-stone scan: check that scan's licence before use. |
| 4 | risky | [Runestone](https://sketchfab.com/3d-models/runestone-1aa38beb0c3049a188edf2096a9731fb) | Rob Ortiz (roberto_ortiz) | CC-BY 4.0 | 10.1k | 0 | no | 2021-05-05 | Fantasy shrine with a glowing portal floor. | Own work, but the author says the texture hides "easter eggs" (unknown content). |
| 5 | risky | [Rune Stone](https://sketchfab.com/3d-models/rune-stone-065bcefe36344914ba244c35b95610b6) | Jadon_TheArtist (Jadon_TheArtist) | CC-BY 4.0 | 2.1k | 0 | no | 2018-06-09 | Untextured, 2.1k. | Own. |

### Sea caves and cliffs

**Recommendation.** Poly Haven's Smugglers Cove coastal cliffs (CC0, decimate hard) and the cheap rock_face pieces; build the sea caves from them in code.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Coastal Cliff 01](https://polyhaven.com/a/coastal_cliff_01) (polyhaven-model) | Rob Tuytel, Rico Cilliers | CC0 1.0 | 865.9k | 0 | no | 2023-08-19 | Best cliff kit (Smugglers Cove collection): 866k faces, decimate to 20-40k and bake; snow cap via a world-up shader mask. | Poly Haven, CC0. |
| 2 | ok | [Coastal Cliff 02](https://polyhaven.com/a/coastal_cliff_02) (polyhaven-model) | Rob Tuytel | CC0 1.0 | 1.8M | 0 | no | 2023-07-19 | 1.8M faces: decimate hard. | Poly Haven, CC0. |
| 3 | ok | [Rock Face 01](https://polyhaven.com/a/rock_face_01) (polyhaven-model) | Dario Barresi | CC0 1.0 | 20.2k | 0 | no | 2024-02-06 | Cheap cliff piece (20k): cave mouths and fjord walls. | Poly Haven, CC0. |
| 4 | ok | [Rock Face 02](https://polyhaven.com/a/rock_face_02) (polyhaven-model) | Dario Barresi, Rico Cilliers | CC0 1.0 | 29.6k | 0 | no | 2024-02-06 | Cheap cliff piece (30k). | Poly Haven, CC0. |
| 5 | ok | [Coast Rocks 01](https://polyhaven.com/a/coast_rocks_01) (polyhaven-model) | Rob Tuytel, Rico Cilliers | CC0 1.0 | 1.3M | 0 | no | 2023-08-26 | Shore rocks (1.3M): decimate. | Poly Haven, CC0. |
| 6 | risky | [Kalamos Cave](https://sketchfab.com/3d-models/kalamos-cave-edb597f00e3e4a84855210219502d29a) | 9of9 (9of9) | CC-BY 4.0 | 310.9k | 0 | no | 2020-08-31 | Real Greek sea cave (311k): warm limestone, Mediterranean; build caves in code instead. | Photogrammetry by 9of9 (own). |

### Chains

**Recommendation.** Code-made chains as in Act IV; DaBoRi's single link if a modelled link is wanted.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | Made in code (as the Act IV shackles and chains), with Poly Haven rust_coarse_01 / metal_plate_02 (shipped) (code) | Skotos | n/a | - | - | - | - | Best pick: instanced links along a curve, any length, a few hundred faces. | No third-party asset. |
| 2 | ok | [Iron chain](https://sketchfab.com/3d-models/iron-chain-6d079f01c7c142e0be54d7f2d33b33e6) | dabori (DaBoRi) | CC-BY 4.0 | 58.1k | 0 | no | 2020-09-28 | Iron chain, 58k: take one link and instance it. | DaBoRi, own, 489 likes. |
| 3 | ok | [Rusted Chain Shackles](https://sketchfab.com/3d-models/rusted-chain-shackles-924c7cc2ee074e57a81cc82b58e0ac6f) | SangeetBlaze (SangeetBlaze) | CC-BY 4.0 | 608 | 0 | no | 2020-01-27 | Rusted chain shackles, 608 faces. | SangeetBlaze, own. |

### Lanterns

**Recommendation.** Poly Haven vintage_oil_lamp (new) and the shipped wooden_lantern_01.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Vintage Oil Lamp](https://polyhaven.com/a/vintage_oil_lamp) (polyhaven-model) | Monsta3D | CC0 1.0 | 7.2k | 0 | no | 2023-05-29 | Brass oil lamp, 7.2k: the keepers' lamp. (Lantern_01, wooden_lantern_01 and brass_diya_lantern are already shipped.) | Poly Haven, CC0. |
| 2 | ok | [Wooden Lantern 01](https://polyhaven.com/a/wooden_lantern_01) (polyhaven-model) | James Ray Cock | CC0 1.0 | 8.3k | 0 | no | 2022-03-11 | Maritime wooden lantern: reuse for ship lanterns at no cost. | Poly Haven, CC0, already shipped (env). |
| 3 | risky | [Rusty Old Oil Lantern](https://sketchfab.com/3d-models/rusty-old-oil-lantern-de28cba29f58414c914298f648da90bf) | chrisg4919 (chrisg4919) | CC-BY 4.0 | 7.6k | 0 | no | 2021-05-06 | Red hurricane lantern: 19th-century, wild-west look. | Own. |
| 4 | reject | [Beacon - Lantern](https://sketchfab.com/3d-models/beacon-lantern-26db6276a0fa49f69912610c2f1b60e0) | re1monsen (re1monsen) | CC-BY 4.0 | 14.1k | 0 | no | 2022-02-04 | A sci-fi LED beacon: off-theme. | Own work (re1monsen). |

### Coast dressing (pier, barrels, driftwood, kelp, barnacles)

**Recommendation.** Poly Haven pier, barrels and crate; EFX's barnacle rock; Crew Froebel's driftwood; sterlingcrispin's kelp scan.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Modular Wooden Pier](https://polyhaven.com/a/modular_wooden_pier) (polyhaven-model) | Rico Cilliers | CC0 1.0 | 84.8k | 0 | no | 2022-06-08 | Modular pier (85k): the keepers' jetties; decimate. | Poly Haven, CC0. |
| 2 | ok | [Wooden Barrels 01](https://polyhaven.com/a/wooden_barrels_01) (polyhaven-model) | James Ray Cock | CC0 1.0 | 33.1k | 0 | no | 2022-02-16 | Barrels for the wrecks (33k). | Poly Haven, CC0. |
| 3 | ok | [Wooden Crate 02](https://polyhaven.com/a/wooden_crate_02) (polyhaven-model) | James Ray Cock, Jurita Burger | CC0 1.0 | 5.2k | 0 | no | 2022-03-02 | Maritime crate (5k). | Poly Haven, CC0. |
| 4 | ok | [Beach Rock with Barnacles Photoscan](https://sketchfab.com/3d-models/beach-rock-with-barnacles-photoscan-21c9848ca38b4d289e2f38a98a905f86) | EFX (evan4129) | CC-BY 4.0 | 16.4k | 0 | no | 2023-08-06 | Beach rock with barnacles, 16k: tide-line scatter. | EFX (evan4129), already credited (Act III roots scan), noai. |
| 5 | ok | [Large Pine Driftwood (Pacific Northwest)](https://sketchfab.com/3d-models/large-pine-driftwood-pacific-northwest-95d1087e513e4fb992a27b7b8a05ca9e) | Crew Froebel (crufro) | CC-BY 4.0 | 320.2k | 0 | no | 2018-07-20 | Bleached driftwood stump, 320k: decimate to about 5k. | Crew Froebel, own photoscan. |
| 6 | ok | [Scan of Kelp and Seaweed on sand beach](https://sketchfab.com/3d-models/scan-of-kelp-and-seaweed-on-sand-beach-c9b5ef07047a4b7a90a4ffd6930ec22c) | sterlingcrispin (sterlingcrispin) | CC-BY 4.0 | 241.6k | 0 | no | 2020-12-29 | Washed-up kelp heap, 242k: decimate; tide-line wrack. | sterlingcrispin, own phone scan (the description says cc0; the licence field is CC-BY, so credit it). |

## Materials

### Ice and sea ice

**Recommendation.** Poly Haven has no ice texture. Use ambientCG Ice001-004 (CC0, same terms as Poly Haven).

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Ice 002](https://ambientcg.com/view?id=Ice002) (ambientcg-material) | ambientCG (Lennart Demes) | CC0 1.0 | - | 0 | no | 2018-09-05 | Best pick for the ice floor and the cracking ice (Poly Haven has no ice). Drive cracks with a second, code-made crack mask. | ambientCG, CC0. |
| 2 | ok | [Ice 003](https://ambientcg.com/view?id=Ice003) (ambientcg-material) | ambientCG (Lennart Demes) | CC0 1.0 | - | 0 | no | 2018-09-16 | Clear lake ice; frozen waterfall normal. | ambientCG, CC0. |
| 3 | ok | [Ice 001](https://ambientcg.com/view?id=Ice001) (ambientcg-material) | ambientCG (Lennart Demes) | CC0 1.0 | - | 0 | no | 2018-09-01 | Sea-ice variant (blend with snow_02). | ambientCG, CC0. |
| 4 | ok | [Ice 004](https://ambientcg.com/view?id=Ice004) (ambientcg-material) | ambientCG (Lennart Demes) | CC0 1.0 | - | 0 | no | 2018-09-17 | Fourth variant. | ambientCG, CC0. |

### Snow, packed snow, frozen ground

**Recommendation.** Poly Haven snow_01/03/04/05 and snow_field_aerial (Rob Tuytel); snow_02 is already shipped.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Snow 01](https://polyhaven.com/a/snow_01) (polyhaven-texture) | Rob Tuytel | CC0 1.0 | - | 0 | no | 2019-01-23 | Trodden snow with footprints: paths. | Poly Haven, CC0. |
| 2 | ok | [Snow 03](https://polyhaven.com/a/snow_03) (polyhaven-texture) | Rob Tuytel | CC0 1.0 | - | 0 | no | 2019-02-03 | Packed, trampled snow with mud: camps and the keepers' hamlet. | Poly Haven, CC0. |
| 3 | ok | [Snow 04](https://polyhaven.com/a/snow_04) (polyhaven-texture) | Rob Tuytel | CC0 1.0 | - | 0 | no | 2019-02-07 | Frozen ground (snow over mud). | Poly Haven, CC0. |
| 4 | ok | [Snow 05](https://polyhaven.com/a/snow_05) (polyhaven-texture) | Rob Tuytel | CC0 1.0 | - | 0 | no | 2019-02-24 | Thin snow over mud: the thaw edge. | Poly Haven, CC0. |
| 5 | ok | [Snow Field Aerial](https://polyhaven.com/a/snow_field_aerial) (polyhaven-texture) | Rob Tuytel | CC0 1.0 | - | 0 | no | 2021-02-15 | Large-scale snowfield macro variation. | Poly Haven, CC0. |
| 6 | ok | [Snow 02](https://polyhaven.com/a/snow_02) (polyhaven-texture) | Rob Tuytel | CC0 1.0 | - | 0 | no | 2019-01-30 | Clean powder snow: reuse, no new download. | Poly Haven, CC0; already shipped (src/assets/deep/snow_*). |
| 7 | ok | [Snow 006](https://ambientcg.com/view?id=Snow006) (ambientcg-material) | ambientCG (Lennart Demes) | CC0 1.0 | - | 0 | no | 2019-02-15 | Stomped snow (packed). | ambientCG, CC0. |

### Wet rock and the tide zone

**Recommendation.** Poly Haven low_tide_rocks (wet, low-tide ground) is made for the tide mechanic; seaside_rock and rock_wall_02 for cliffs.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Low Tide Rocks](https://polyhaven.com/a/low_tide_rocks) (polyhaven-texture) | Dimitrios Savva | CC0 1.0 | - | 0 | no | 2025-12-19 | Best pick for the tide zone: wet ground and pebbles at low tide; blend wetness with the tide height. | Poly Haven, CC0 (2025). |
| 2 | ok | [Seaside Rock](https://polyhaven.com/a/seaside_rock) (polyhaven-texture) | Dimitrios Savva | CC0 1.0 | - | 0 | no | 2024-04-30 | Wet coastal rock face for cliffs. | Poly Haven, CC0. |
| 3 | ok | [Rock Wall 02](https://polyhaven.com/a/rock_wall_02) (polyhaven-texture) | Rob Tuytel | CC0 1.0 | - | 0 | no | 2020-09-28 | Bare eroded coastal rock. | Poly Haven, CC0. |
| 4 | ok | [Coast Sand Rocks 02](https://polyhaven.com/a/coast_sand_rocks_02) (polyhaven-texture) | Rob Tuytel | CC0 1.0 | - | 0 | no | 2022-03-04 | Rock face with moss and grass (the thawed edge). | Poly Haven, CC0. |
| 5 | ok | [Worn Rock Natural 01](https://polyhaven.com/a/worn_rock_natural_01) (polyhaven-texture) | Rob Tuytel, Dimitrios Savva | CC0 1.0 | - | 0 | no | 2022-08-25 | Weathered coastal boulder rock. | Poly Haven, CC0. |
| 6 | ok | [Damp Beach Sand 02](https://polyhaven.com/a/damp_beach_sand_02) (polyhaven-texture) | Dimitrios Savva | CC0 1.0 | - | 0 | no | 2026-09-01 | Tidal, striated damp sand. | Poly Haven, CC0 (2026). |

### Black sand and shingle

**Recommendation.** Poly Haven pebbles / dry_river_pebbles / shell_floor_01. There is no black sand on Poly Haven: grade damp_beach_sand or moon_02 dark.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Pebbles](https://polyhaven.com/a/pebbles) (polyhaven-texture) | Rob Tuytel | CC0 1.0 | - | 0 | no | 2024-11-12 | Best shingle pick; grade darker for a volcanic-black beach. | Poly Haven, CC0. |
| 2 | ok | [Dry River Pebbles](https://polyhaven.com/a/dry_river_pebbles) (polyhaven-texture) | Amal Kumar | CC0 1.0 | - | 0 | no | 2026-07-13 | Rounded pebbles. | Poly Haven, CC0. |
| 3 | ok | [River Small Rocks](https://polyhaven.com/a/river_small_rocks) (polyhaven-texture) | Rob Tuytel, Rico Cilliers | CC0 1.0 | - | 0 | no | 2022-03-31 | Small stones, coastal tag. | Poly Haven, CC0. |
| 4 | ok | [Shell Floor 01](https://polyhaven.com/a/shell_floor_01) (polyhaven-texture) | Rob Tuytel | CC0 1.0 | - | 0 | no | 2019-05-11 | Broken shells: the tide line. | Poly Haven, CC0. |
| 5 | ok | [Damp Beach Sand](https://polyhaven.com/a/damp_beach_sand) (polyhaven-texture) | Dimitrios Savva | CC0 1.0 | - | 0 | no | 2026-08-28 | Wet sand: grade to near-black for black sand (Poly Haven has no black sand). | Poly Haven, CC0. |
| 6 | ok | [Moon 02](https://polyhaven.com/a/moon_02) (polyhaven-texture) | Greg Zaal, Rico Cilliers, Jenelle van Heerden, Dario Barresi | CC0 1.0 | - | 0 | no | 2025-06-19 | Grey regolith: a second route to dark volcanic sand. | Poly Haven, CC0. |

### Weathered planks and rope

**Recommendation.** Poly Haven wood_planks_grey (seaside), brown_planks_03 (boat), weathered_planks; ambientCG rope.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | [Wood Planks Grey](https://polyhaven.com/a/wood_planks_grey) (polyhaven-texture) | Rob Tuytel | CC0 1.0 | - | 0 | no | 2021-09-21 | Best pick: sea-grey weathered planks (tagged seaside/coastal): huts, jetties, wreck decks. | Poly Haven, CC0. |
| 2 | ok | [Brown Planks 03](https://polyhaven.com/a/brown_planks_03) (polyhaven-texture) | Rob Tuytel | CC0 1.0 | - | 0 | no | 2018-06-22 | Untreated boat planks (tagged boat/coastal). | Poly Haven, CC0. |
| 3 | ok | [Weathered Planks](https://polyhaven.com/a/weathered_planks) (polyhaven-texture) | Dario Barresi, Dimitrios Savva | CC0 1.0 | - | 0 | no | 2022-11-15 | Bridge planks. | Poly Haven, CC0. |
| 4 | ok | [Medieval Wood](https://polyhaven.com/a/medieval_wood) (polyhaven-texture) | Rob Tuytel | CC0 1.0 | - | 0 | no | 2018-07-24 | Older, uneven planks. | Poly Haven, CC0. |
| 5 | ok | [Rope 002](https://ambientcg.com/view?id=Rope002) (ambientcg-material) | ambientCG (Lennart Demes) | CC0 1.0 | - | 0 | no | 2018-03-21 | Rope (see also prop_net_rope). | ambientCG, CC0. |

### HDRIs and skies

**Recommendation.** Not needed: the engine uses RoomEnvironment through PMREM, not HDRIs.

| # | Verdict | Asset | Author | Licence | Faces | Clips | Rig | Published | Fit and work | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ok | Not needed (code) | - | n/a | - | - | - | - | The engine does not load HDRIs: gfx.js builds scene.environment from THREE RoomEnvironment through PMREM (src/gfx/gfx.js lines 49-51). The aurora and the polar sky are better done in a sky shader. No HDRI recommended. | n/a |

## Roles with no good candidate

- **Frozen waterfall** and **icebergs / ice chunks**: nothing clean exists (AI-made clusters, a game skin, a toon diorama). Build both in code with Poly Haven rock meshes, ambientCG ice and Elin Hohler's icicles.
- **Ancient lighthouse**: every lighthouse found is 18th-20th century (iron lantern rooms), toon, or the Mediterranean Pharos. Use ruined round towers plus a code-made fire-cage.
- **Ready-animated giant crab, polar bear and walrus**: the animated ones found are rips, re-uploads or carry contradictory terms, so the picks need procedural clips or a rig (crab, walrus) or reuse the shipped bear. The best realistic sea-hag mesh (Purple.Point) needs an AI-generation check, so the pipeline crone is the safe pick.
- **Black sand, ice and rope on Poly Haven**: not available; graded sand, ambientCG Ice001-004 and Rope001/002 (CC0) fill the gaps.

## Before any download

1. Reverse-image search the thumbnails of: Crab mountain, Kaan Tezcan's Ancient Titan Vol2, the Purple.Point models (hooded woman, Creeping Shadow), the igor-lir seal and polar bear, the Frilled Shark, and the icy dragon (if anyone still wants it).
2. Read the real licence on the download page again (Sketchfab shows it per model) and save it with the source in /tmp/claude-0/sf, as in earlier acts.
3. Credit lines follow CREDITS.txt: title, author (display name and Sketchfab handle), licence, "modified", URL. CC0 assets are credited too.
