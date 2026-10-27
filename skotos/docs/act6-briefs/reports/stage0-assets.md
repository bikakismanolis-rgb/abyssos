# Act VI stage 0: the provenance gates of the two downloads

Checked on 27 October 2026 under Act V's gate (`act5-briefs/assets.md` rules, `act5-briefs/asset-gates.json` and `assets-built.md` as the model) for the design's two downloads (`act6-design.md`, "Assets" and "Asset audit"). The machine-readable record is `act6-briefs/asset-gates.json`. Sources, notes and evidence sit outside the repository, beside the sources, as the design asks:

- the Pistosaur's sources: `/tmp/claude-0/sf/act6/ketos/`, with its notes in `/tmp/claude-0/sf/act6/provenance/ketos/`;
- the Scorpion's sources: `/tmp/claude-0/sf/act6/falselight/`, with its notes in `/tmp/claude-0/sf/act6/provenance/falselight/`.

No game code was touched.

## Outcome

| asset | uid | licence (re-read) | verdict | fallback |
|---|---|---|---|---|
| **the Ketos** (and the Ketling at ×0.6): "Pistosaur Animated" by RickStikkelorum (ricksticky) | 773667575a264c7baa4ec404115a044b | CC-BY 4.0, downloadable | **pass** | not taken (Spinnee's Pliosaur; then icemaw.glb ×3.4 with the code lure) |
| **the Falselight**: "Scorpion" by anthonyvanoo | 4c0fd62d33ab4d2592ee0a1d985a480d | CC-BY 4.0, downloadable | **pass, no doubt found** | not taken (the .hapto Pseudoscorpion; then spider.glb ×0.8 with the code lure) |

**For G0:** the provenance part of the gate passes for both, so neither no-download body is needed for provenance reasons. The look gates ran later the same day (The look gates, below). The design's "(to verify)" marks on these two uids (Assets tables, Asset audit, the two ASSET blocks) can become "verified 27 Oct, `asset-gates.json`". That edit is the lead's to make; this stage did not edit the design.

**Credits for CREDITS.txt:**
- "Pistosaur Animated" by RickStikkelorum (ricksticky), https://sketchfab.com/3d-models/pistosaur-animated-773667575a264c7baa4ec404115a044b, CC-BY 4.0.
- "Scorpion" by anthonyvanoo, https://sketchfab.com/3d-models/scorpion-4c0fd62d33ab4d2592ee0a1d985a480d, CC-BY 4.0.

## How each was checked
1. **The licence, four times.** I read the public API record (`/v3/models/<uid>`), then the authenticated record at download time. The archive's `license.txt` and the glTF's `asset.extras` say the same. All four give CC-BY-4.0, the same author and downloadable.
2. **The author.** I read the profile and every upload through the API, and the descriptions of anything that names another IP. I also checked outside sources on who the author is.
3. **The description.** I looked for signs of a rip ("ripped", "from <game>", someone else's name), and checked that the description agrees with the file.
4. **Reverse-image search.** Yandex images by the 1024 px thumbnail URL. I recorded its exact-copy list and its pages with similar images, and compared the nearest look-alikes side by side with a rest-pose render of the downloaded file.
5. **Storefronts.** Web searches across Fab, CGTrader, TurboSquid, the Unity Asset Store, Cults3D and itch.io, plus Sketchfab searches for re-uploads.
6. **The files.** I downloaded the glTF archive and the GLB into a new, empty directory, extracted the archive there, and read it with node scripts kept in the scratchpad. Those scripts use plain `fs`, the .gltf JSON and the GLB chunks, and run nothing from the archive. They report files, triangles, skins, clips, maps and a rest-pose render.

## The Pistosaur (the Ketos): pass

- **The record.**
  - CC-BY 4.0, downloadable; 16,664 faces, 8,676 vertices, 1 clip, 6 textures, 4 materials.
  - Published 2019-11-26, with 3,745 downloads.
  - The description: "This model is far from perfect, but still worth to share. I took a lot of time in sculpting the thing. I have got 2k normals for the body group". The file agrees: only the body's normal map is 2048 px.
- **The author.**
  - A freelance paleoartist in Haarlem, "Specialized in ZBrush and extinct animals that are not dinosaurs". 58 uploads, a consistent body of his own paleoart, most of it sold on the Sketchfab store.
  - NH Nieuws names Rick Stikkelorum as the Haarlem paleoartist behind a life-size 3D-printed Tanystropheus, which is also on his Sketchfab.
  - One IP flag sits on another model: "Alfred J. Kwak" is his own sculpt of the Dutch cartoon duck, crediting its designers. It is fan art, not a rip, and has no bearing on an extinct reptile.
  - Three of his own November 2019 rigs were fetched as references. Two share the Pistosaur's Maya conventions: joint1..N, lambert materials, ZBrush group names, clips of 2.042 s. It belongs to his own run of work.
- **Reverse image.**
  - Exact copies exist only on Sketchfab, on a Pinterest pin crediting RickStikkelorum, and on Fab's gallery image for listing 598befa6-26c2-4c38-a63a-b38cfea23106.
  - No storefront and no other author.
- **Storefronts.**
  - The Fab listing carries the author's description word for word and "FBX + converted GLB/glTF/USDZ". That is the form of Fab's migrated Sketchfab models. The page is Cloudflare-blocked from this machine, so its seller and licence were not seen first-hand.
  - Nothing on CGTrader, TurboSquid, the Unity Asset Store or Cults3D.
- **Copies.**
  - Two later re-uploads of this exact mesh are on Sketchfab, with identical counts, default thumbnails and no credit: MASONJAR1753, 2023, view-only; and VioletBovid2302, 2026-09, CC-BY.
  - They copy the 2019 original. They are not its source. Credit the original only.
- **Residual risk:** low.

**The file** (archive 5,183,198 bytes; GLB 3,740,352 bytes):

| item | content |
|---|---|
| files | `license.txt`, `scene.gltf`, `scene.bin`, `textures/` with six maps: blinn4 base 1024 and normal 2048 (the body); blinn3 base and normal 1024 (the tongue); lambert2 normal 1024 (the teeth); blinn2 base 512 (the eyes). The GLB holds the same maps with the body normal at 1024. |
| triangles | **16,664**: body 10,748 (skinned), tongue 996 (skinned), upper teeth 1,872, lower teeth 1,872, eyes 1,176. The teeth and eyes are rigid meshes parented to joint19_044 (the skull) and joint27_036 (the lower jaw). |
| rig | 51 Maya joints, 50 of them deforming. The neck is joint13-17 and joint21, six joints, about a quarter of the length. The tail is joint2-12. Four flipper chains. The tongue chain is joint51 and joint23-26. The rest pose is mid-swim with the jaw open, 6.05 file units long, head toward +z. |
| clips | **1**: `SwimmingBiting`, 2.042 s, in place, 57 channels on 35 nodes. |
| materials | Metallic 0 throughout. Roughness 0 on the tongue and teeth, which reads as a mirror. |

**What the design needs from it** (ketos.mjs):

- **Decimation to ≤ 15k: cut at least 1,664 triangles.** The cheapest way keeps the body whole: the two teeth rows to about 700 each and the eyes to about 400 make about 13.5k. The alternative is a uniform ×0.9 on the body. Measure the cost before and after, as the design asks.
- **Keep the rigid parts parented**, or skin them at weight 1. The code lure's chain hangs from joint19_044.
- **The phone budget of 2.79 MB (1024 d, 512 n) holds only if the build keeps the body's two maps and drops the other four.** The teeth become plain white, the tongue a flat colour, the eyes the design's white film. The body normal goes from 2048 down to 512. Set roughness on the tongue, teeth and eyes.
- **The swim clip becomes idle-in-water.** Every other clip is procedural, as designed: rise, lure-drift, strike, slam, thrash, dive, surface, blind-listen, seared, settle, and the Ketling's crawl (four flipper chains) and gnaw (joint27_036).
- **Look note:** a pistosaur's neck is short. "Rise" must lift the whole fore-body to read as a neck out of the water. Check it at pitch 0.95 and in the cine.
- **Regrade** from blue-grey with dark stripes to the pale, barnacled hide with filmed white eyes.

## The Scorpion (the Falselight): pass, no doubt found

- **The record.**
  - CC-BY 4.0, downloadable; 7,290 faces (7,288 triangles in the file), 5 clips, 4 textures, 1 material.
  - Published 2019-05-07, with 6,379 downloads.
  - The description: modelled, rigged and animated in Blender, sculpted in ZBrush, textured in Substance Painter, "Used as an enemy for a game I helped create: All That's Left". The file agrees: a Blender armature with its IK and pole controllers exported as bones, and baked maps.
- **The author.**
  - A TAMK game-development student in Tampere, with 9 uploads.
  - He credits a teammate where he remodels another's design ("Spiked Frog Enemy … based on a frog Nikolai Jonasson created").
  - Two labelled, view-only fan pieces (Clunk from Awesomenauts "2D to 3D", a Lego figure). Neither is a rip, and neither is downloadable.
  - His portfolio site is gone.
- **The game.**
  - "All That's Left by Instance Games" on itch.io (28 May 2019) is a **free** download: price 0, and a Play Finland newsletter says free with an optional tip.
  - The team list names "Anthony Vanoostendorp - Project Manager, Artist".
  - The page sells nothing, claims no asset and does not mention the scorpion. **The game does not sell or claim the model.**
- **Reverse image.**
  - **No exact copy of the thumbnail anywhere.** The 100 similar-image pages are other scorpions.
  - The nearest were compared side by side with a render of the downloaded file: a $8 CGTrader "Scorpion" (3dmdb 3562342), RIG-IT's black scorpion and kenan.pawley123's low-poly scorpion. All are different meshes: thicker legs, other chela and telson shapes.
- **Storefronts.**
  - No listing on Fab, CGTrader, TurboSquid, the Unity Asset Store or itch.io. The store pages are Cloudflare-blocked from this machine, so this part rests on the search index and Yandex's previews.
  - It is the only Sketchfab upload of this mesh.
- **Residual risk:** low. It is a student team's free game, and the artist himself published the model under CC-BY.

**The file** (archive 2,922,975 bytes; GLB 3,653,564 bytes):

| item | content |
|---|---|
| files | `license.txt`, `scene.gltf`, `scene.bin`, `textures/scorpion_{baseColor,normal,metallicRoughness,emissive}.png`, all 1024. The metallicRoughness map is flat (roughness 1 × 0.42, metal about 0). The emissive map marks only the sting tip, in yellow. |
| triangles | **7,288**, one skinned mesh. |
| rig | 123 joints, 71 of them deforming. Body: control_01 > body_00 > bodySeg1-6. Tail: tailBase, tailSeg1-5 and "Stringer" (the sting, sic), with Stringer_end_0103 as the lure's anchor. Pincers: armBase > armMid > armEnd > pincerMain > pincer. The rest pose is 4.13 units long, head toward +z, feet on y = 0, and the tail curled over the back. |
| clips | **5**: Area Attack 2.333 s, Death 0.700 s, Defend 0.867 s, Idle 2.633 s, Walk 0.600 s. Walk is in place. |

**The legs:** eight walking legs in four pairs. The small front A pair has 5 bones; the B, C and D pairs have 6 each. All 46 leg bones deform and are keyed in every clip, with the IK baked into the FK keys. The 52 helper bones (IK targets, poles, end bones) carry no weight, with one exception: pincerIK_R_077 holds a few right-pincer vertices, a weight-paint slip.

**What the design needs from it** (falselight.mjs):

- **Keep the 7.3k faces**; no decimation.
- **Walk** gives the skitter, and at a higher timeScale the flee. Fit the timeScale to speed 4.6 at ×1.6 in the viewer, so the feet do not slide.
- **Idle keys the legs**, so idle-lure is Idle with the 7-bone tail chain overridden high and still.
- **Death** already drops the body. The design's "die (curl)" folds the leg chains on top of it.
- **Snap, hit and flee** are added in lib.mjs. Check Area Attack as the sting and Defend as hit or guard.
- **Strip** the 52 helpers (reassign pincerIK_R_077's vertices to the pincer) and the dead scale keys (0.999-1.001).
- **The phone budget of 1.74 MB (512 d, 256 n)** means dropping the flat metallicRoughness map (set roughness 0.42, metal 0) and the emissive map. Its warm yellow sting tip would read as *true* light; the code lure's cold glow replaces it.
- **Look-gate note:** the legs are long and thin. At ×1.6, pitch 0.95 and quality 0 on a phone they may read as hairlines. Check the pale bone-grey regrade in the viewer before the build is final.

## The look gates (27 October)

Run in the viewers at gameplay pitch (the game camera, the hero's warm lamp at the feet, the viewer's grass) on SwiftShader, quality 2. viewer.js's people view now takes one value per figure, as creatureview.js does: `&tints=<hex>:<amt>`, `&rims=<hex>:<amt>`, `&scales=<s>`, `-` to skip. The shots are in `g0/` beside this report.

| gate | what was seen | outcome |
|---|---|---|
| **the First beside Selna** (`?viewer&only=p:selna,p:selna&tints=-,9ab8d0:2.1`, `g0/first-close.jpg`) | The grade drains her into a pale, cold blue-grey and she reads as a colder woman than Selna. The silhouette is the same body, and the two hair buns read at gameplay pitch. | **Passes with its code parts, not on the grade alone.** The icicle crown sits over the buns, the stoop and the brand change the stance. The two never share a zone, so the risk is a player's memory, not one frame. Stage A re-shoots it with the crown on; if the buns still show, the fallback `first6` stands. |
| **the Faded beside the Sunken** (`g0/faded-close.jpg`: villager0 at `1a1c24:2.2` rim `8a9ab8:0.3`; the Sunken at its shipped `8c9e99:1.6`) | The Faded are dry, dim and brown-grey. The Sunken are pale green-grey with white hands and a hunch. They do not read as one kind. | **Passes** (the veil is code, stage A). |
| **Keyx** (`g0/keyx-strengths.jpg`: villager1 at 0.55, 0.8, 1.1) | At the design's 1.1 he goes as dark as the Faded. A tint above 1 is fully mixed in, so it darkens his face and hands with his clothes. At 0.55-0.8 he keeps a face and pale hands. | **Passes at tintAmt 0.6** (`g0/faded-keyx06-leif085-sailor14.jpg`, the middle figure): a man with a face among the Faded. The design's "half strength (1.1)" is read as tintAmt 0.6. |
| **Leif** (villager2 at 1.32 and 0.85) | `g0/villagers-plain.jpg`: people.glb's villager2 is a woman (the red bodice), so she cannot be "the woodcutter's son". | **Body changed:** villager0 ×0.92 with the brown hood and the axe (the Sailor is villager0 too, but they never share a scene). Below: tintAmt 0.85 until his fire is lit (dimmed, still alive), then 0. |
| **the Sailor** | "The Faded's tint at 0.9" read as 2.2 × 0.9 = 1.98 is one of the Faded. | **tintAmt 1.4**, no veil (bottom-left figure in the same shot): grey but not yet gone. |
| **the Lampbearer** | The Sunken's body as shot above; its oil lamp is code (stage B). | **Body passes**; the lamp is judged with its light in stage B's `darktele` shot. |
| **the Shade's forms** (`g0/shade-heroes.jpg`: warden, ranger, mage at `0c0a14:2.0` rim `8a9ab8:0.5`; `g0/shade-creatures.jpg`: barrowLord, spider, troll in creatureview, same grade) | Class and silhouette read: shield and sword, crossbow, staff, hood. Under the viewer's lamp the bodies read as dark grey leather, not black. **The held weapons keep their full colour** (an orange blade, a blue shield, a red staff), because the person patch does not reach them. | **Fallback chosen: the plain near-black tint plus a weapon regrade.** Combat's Shade code darkens every held mesh (`a.hold` parts) to the same near-black, rim kept for the silhouette. The skin patch is optional on top. Re-shot under the Hearth's light in stage C (`shade`). |
| **the Icemaw at ×3.4** (`g0/icemaw34.jpg`, creatureview `only=icemaw&ref&scales=-,3.4`) | Beside the 1.8 m reference it reads as a leviathan, longer than the frame. Its pale whale-grey hide is the open sea's and looks lit from above, which is wrong for the bottom. | **Size passes as the Ketos's fallback;** it needs a dark regrade to belong below (the lure's cold glow is its only light). The tint is picked with the lure in stage B; the fallback only matters if `ketos.glb` fails to load. |

**For G0:** every look gate has passed or has its fallback chosen. The binding numbers (Keyx 0.6, Leif villager0 ×0.92 at 0.85, the Sailor 1.4, the Shade's weapon regrade) are written into the contract's Stage 0 outcome. Not run here: perf5's Field on the gate machine (perf5's Field runs of 26 October stand as the perf6 baseline until stage A's engine lane re-measures it).

## Limits of this check

- **Pages not seen first-hand.** Fab, CGTrader, TurboSquid, ArtStation and 3dmdb answer this machine with Cloudflare challenges, as in Act V. Their part rests on web-search snippets and Yandex's previews. The Wayback Machine refused (HTTP 429).
- **Only one reverse-image engine.** The reverse-image search is Yandex's alone, as Act V's was; Google Lens and TinEye were not tried.
- **Three extra reference downloads.** I fetched three of RickStikkelorum's own small CC-BY models (Cute T-rex, Alien Insect, Mutated Plesiosaur) to compare rig conventions. They sit in `/tmp/claude-0/sf/act6/ref_*` and are not for the game.
- **The token.** `$SKETCHFAB_API_TOKEN` was used only in an Authorization header, by `fetch6.mjs` in the scratchpad. It was never printed or written anywhere. The two `download.json` records hold sizes and the licence only, with no signed URLs.

## Files

| what | where |
|---|---|
| repository record | `skotos/docs/act6-briefs/asset-gates.json` |
| this report | `skotos/docs/act6-briefs/reports/stage0-assets.md` |
| sources (untrusted data) | `/tmp/claude-0/sf/act6/ketos/{archive.zip, model.glb, gltf/}` and `/tmp/claude-0/sf/act6/falselight/{archive.zip, model.glb, gltf/}` |
| evidence, beside the sources | `/tmp/claude-0/sf/act6/provenance/{ketos,falselight}/`: provenance.md, meta.json, download.json, reverse-image-yandex.json, compare.jpg, render_rest.jpg, the look-alike thumbnails, insp_gltf.json, insp_glb.json, rig.json; plus `/tmp/claude-0/sf/act6/provenance/textures.jpg` |
| scripts (outside the archive directories) | `fetch6.mjs`, `inspect6.mjs`, `rig6.mjs`, `tree6.mjs`, `joints6.mjs`, `dump6.mjs` and `render6.py`, in `/tmp/claude-0/-home-user-abyssos/848977a8-1632-5f97-b36d-9baf61edd253/scratchpad/act6gate/` |
