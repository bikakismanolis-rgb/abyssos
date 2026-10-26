# The coast's frame at q1: a plan (static study, 24 October)

From a workflow of three independent analyses and a judge, reading the code at eacb5db (no browser). Not applied yet:
measure with perf5 (QS=1, 9+ cycles, one browser alone on the machine) before and after each step.

# Plan: bring the Frozen Coast's perf5 frame under 1.15 × the Field at q1

All of this comes from reading the code at HEAD `eacb5db`. No browser was started. The only binaries inspected were Chromium's ANGLE and SwiftShader libraries, with `nm` and `strings`. The millisecond figures are estimates: SwiftShader instruction counts per 2×2 pixel quad, calibrated on the sea pass (~140 ms for ~185k quads at ~2,500 instructions each).

## 1. What the code says, and corrections to the brief

**perf5 runs the full game, not the world viewer.** `'world=town&q=0&noenv'` is only the scenario's first page. perf5 then opens its own phone context (915×412, device scale 1.5, MSAA) on `?auto=ashfield&q=Q&lvl=30&seed=5` and calls `enterZone` for the coast and the Farthest Light.
- The hero and her lantern are drawn, the environment pack is loaded, and the packs of monsters are kept from spawning.
- The coast spot is `S.dalaro + (0, 4)` with the tide forced to 1.2, coast seed 3.

**The pass checks q1 only.** `out.pass` needs `vsField ≤ 1.15` at q1. At q0 it only needs the floor (q0 ≤ 1.05 × q1 at each spot), which holds by far: the report had 222 ms at q0 against 792 ms at q1. So the q0 ratio of 1.27 does not fail the gate.

**The machine moved the ratio, not the code.** `git diff 6137f93..HEAD -- skotos/src/world skotos/src/gfx` is empty, so no render code changed since the 1.075 PASS. The move to 1.17–1.20 is this machine.
- At ~605 ms for the Field, 1.15 means ≤ 696 ms and 1.10 means ≤ 666 ms.
- The coast is ~717 ms, so it needs about 50 ms off to stay under 1.10 with a margin.
- Only coast-only work moves the ratio: each ms saved is about −0.0017. Every item below touches only Act V materials (ground X5 chunks, sea, wreck), so the Field's own ms is a control.

**This stack has no early depth test.** The two analyses that proposed a discard-free sea assumed ANGLE marks discard-free shaders for early fragment tests. It does not here:
- `nm -C /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/libGLESv2.so` lists 25.8k symbols. The only early-fragment one is `sh::EmitEarlyFragmentTestsGLSL`, which only writes out the GLSL ES 3.10 layout qualifier. There is no early-fragment-tests optimisation pass.
- WebGL2 shaders are GLSL ES 3.00, so they cannot declare `layout(early_fragment_tests)` themselves.
- The SPIR-V therefore never carries EarlyFragmentTests. As far as I know (from memory of SwiftShader's source; its binary is stripped), SwiftShader's PixelRoutine only tests depth before shading when that mode is present.
- So hidden fragments are shaded in full whether or not the shader has a discard. This fits the report's finding that the wreck costs the same over depth 0 and depth 1.

**Two facts the plan relies on:**
- **Fragment branches.** The report confirmed that a branch whose four lanes in a quad are all false is skipped.
- **Trilinear taps.** I believe (from SwiftShader's source, not checked against this binary) that its sampler fetches both mip levels for LINEAR_MIPMAP_LINEAR whatever the LOD.

**How q1 differs from q0 on the coast.**

| | q1 | q0 |
|---|---|---|
| Resolution | pixel ratio 1.5 (phone cap), 1372×618 | pixel ratio 1.0 (2.25× fewer pixels) |
| MSAA | 4× on | off |
| Moon shadow | 1024 PCF map (5 Vogel taps) | none |
| Point lights per lit pixel | 7 (hero + 6 pool, idle ones included) | 4 (hero + 3) |
| Sea | `SEA_HI`: n2 tap, aurora-streak tap, vertex aurora, light paths | base path |
| Ground | `G_GLINT` (wind frame, glitter) on top of the rest | `G_WET`, `G_AUR`, `G_WIN` (these run at every quality) |
| Ice | `ICE_HI` | base |
| Materials | Lambert, normal maps on props | Lambert |

The ground's vertex aurora and its window loop do not scale with pixels, which is why q0's ratio is worse.

## 2. The ordered plan

| # | Change | Estimated saving at q1 | Ratio change | Look | Phones |
|---|---|---|---|---|---|
| 1 | Ground: skip the ice-window outline where no window can be, plus two exact riders | 10–20 ms (+2–4) | −0.02 to −0.04 | none (exact) | yes: 3 atan + 9 sin per ground pixel |
| 2 | Vertex aurora only near the view (ground `G_AUR`, sea `SEA_HI`) | 12–20 ms | −0.02 to −0.035 | none (exact) | vertex work only |
| 3 | Sea: skip terms where they are exactly zero | 12–18 ms | −0.02 to −0.03 | none (exact) | yes: trig and ALU |
| 4 | Ground: flat stand-in under closed water (measure the band first) | 15–35 ms | −0.025 to −0.06 | ≤ ~1.5 sRGB levels inside the band | yes: taps, lights, PCF |
| 5 | Reserve: shoreN baked into tBed's blue channel | 8–10 ms | ~−0.015 | ≲ 2 cm line shifts | one fewer fetch |

- Items 1–3 together: about 35–60 ms, a ratio of about 1.08–1.125. Do these first, in one perf5 round.
- Adding item 4: about 50–95 ms, a ratio of about 1.03–1.10. Do it only if 1–3 leave the median above ~1.10.
- Item 5 only if still short.

### 1. Ground: skip the ice-window outline where no window can be

**Where:** `/home/user/abyssos/skotos/src/world/build.js`, `groundMat`, the `X5.win` string at line 1464.

**Why it matters.** The coast's three sea-light windows go through `winR` (1 atan, 3 sin, a length and a divide each) on every ground fragment. The loop sits before the deep-water skip, so it also runs on fragments that the `> 0.56` test then throws away. That is ~330 instructions per quad: ~10% of a fully shaded ground quad and ~60% of a skipped one.

**The change.** Replace

```glsl
for (int i = 0; i < 8; i++) { if (uWin[i].x < -50.0) break; if (winR(vGW.xz - uWin[i], uWin[i]) < 1.0) discard; }
```

with

```glsl
for (int i = 0; i < 8; i++) { if (uWin[i].x < -50.0) break; vec2 wd = vGW.xz - uWin[i]; if (dot(wd, wd) < 0.93) { if (winR(wd, uWin[i]) < 1.0) discard; } }
```

This is exact: `winR`'s denominator is at most 0.8 + 0.08 + 0.05 + 0.03 = 0.96, and `length(d·(1, 1.12)) ≥ |d|`, so a hole pixel always has |d|² < 0.9216.

**Rider 1b (exact), `G_GLINT`, lines 1589–1593.** The wind frame's 4 trig calls feed only the `gS` tap and the sastrugi, both of which are zero unless `gsk > 0.002`. On the shore layer (wB = 1) gsk is exactly 0.

```glsl
vec2 gPw = mat2(0.94, -0.34, 0.34, 0.94) * vGW.xz;
float gwb = 0.0;
float gsk = (1.0 - wB) * (1.0 - wP * 0.5), gSa = 0.0, gSp = 0.0;
if (gsk > 0.002) {
  gwb = cos(gPw.x * 0.045 + 0.6) * 0.099 + cos(gPw.x * 0.017 + 1.3) * 0.068;
  gPw.y += sin(gPw.x * 0.045 + 0.6) * 2.2 + sin(gPw.x * 0.017 + 1.3) * 4.0;
  vec4 gS = texture2D(tNoise, vec2(gPw.x * 0.016, gPw.y * 0.033) + 0.53);   // ...rest unchanged
```

Also turn the raking-light block (line ~1664, `{ vec3 nR = ...; diffuseColor.rgb *= clamp(...); }`) into `if (gsk > 0.0) { ... }`. Its `rk` is proportional to gsk, so it is exactly ×1 when gsk is 0.

**Rider 1c, `G_WET`, lines 1582 and 1585.**
- Make `gWet` an explicit `if (vBedW < 2.0 && wB > 0.2) { gWet = ...; }`. This is exact, because `smoothstep(0.2, 0.55, wB)` is 0 below 0.2, and it skips the shoreN tap on snow near the shore.
- Replace the moon glint's `pow(x, 18.0)` with squaring, inside a gate:

```glsl
float gMg = max(gWet, gPool * wB);
if (gMg > 0.0) { float gm = max(dot(reflect(-gV, vec3(0.0, 1.0, 0.0)), uMoonD), 0.0), g2 = gm * gm, g4 = g2 * g2, g8 = g4 * g4; gEm += uMoonC * (g8 * g8 * g2) * gMg * 0.05; }
```

Squaring differs from `pow` only by about 1e-6 relative.

**Saving.** 10–20 ms for the window gate, 2–4 ms for the riders. The Farthest Light has windows too and gains as well; the Field is unaffected.

**Verify.**
- perf5 (see section 4).
- Frozen shots of a sea-light window at high water and at mid tide (the round hole in the ground). Expect bit-identical frames, apart from possibly ≤1/255 on a few wet-glint pixels from 1c.

**Risk:** none.

### 2. Vertex aurora only near the view (ground and sea)

**Why it matters.** The ground is one 121×201 plane, never culled. All of its ~24k vertices run `aurora()` every frame: 2 vertex texture taps, 6 sin and 3 real `pow`. The report measured the ground's vertex work at 33 ms with a 1-pixel scissor, which is ~25 ms on this machine, and ~85–90% of those vertices are off screen. The Field's Act IV ground has no `G_AUR`, so this cost is coast-only. It also runs at q0.

**Ground: `/home/user/abyssos/skotos/src/world/build.js`, `groundMat`, line 1453.** Replace the two ternaries in the `X5.aur` part of the `begin_vertex` replacement with:

```js
+ (X5.aur ? `
  vGAur = vec3(0.0); vGAurK = 0.0;
  // (only near the view: a vertex more than 8 m outside the frustum is a corner of no triangle on screen; ortho: always)
  vec3 gq = (viewMatrix * vec4(vGW, 1.0)).xyz; float gd = -gq.z;
  if (projectionMatrix[3][3] > 0.5 || (gd > -8.0 && abs(gq.x) < (gd + 8.0) / projectionMatrix[0][0] + 8.0 && abs(gq.y) < (gd + 8.0) / projectionMatrix[1][1] + 8.0)) {
    if (uAur * max(1.0 - uAurDark, uAurFront) > 0.02) vGAur = (aurora(vGW.xz * ${X5.v5 ? '1.8' : '0.9'} + vec2(13.0, -40.0), 0.7, 0.0) * ${X5.v5 ? '0.2 + uAurCol * uAur * uAur * max(1.0 - uAurDark, uAurFront) * 0.034' : '0.06'}) * smoothstep(0.55, 0.9, normal.y);
    if (uAurDark > 0.02) vGAurK = auroraDark(vGW.xz * 0.9 + vec2(13.0, -40.0));
  }` : '')
```

**Sea: `/home/user/abyssos/skotos/src/world/sea.js`, `seaMat` vertex, lines 285–299.** Keep `vAur = vec3(0.0); vAurK = 0.0;` and wrap the existing `{ vec3 Vv = ...; ... }` block in the same test, with `vec3 vq = (viewMatrix * vec4(vWP, 1.0)).xyz; float vqd = -vq.z;`.

**Why the 8 m margin is safe.**
- Any point within M of the frustum satisfies |x| ≤ (d + M)·tan + M.
- The longest ground or sea triangle edge is under ~5.2 m: the 1.41 m diagonal plus up to ~1.9 m of `shoreJit` at each end.
- So every vertex of an on-screen triangle passes the test unchanged.
- Neither mesh casts a shadow, so the orthographic shadow camera never draws them; there is no other orthographic camera in `src`.

**Saving.**
- Ground: ~25 ms × ~0.8 (the aurora's share of the vertex work) × ~0.85 (off screen) ≈ 15–18 ms.
- Sea: 2–4 ms.
- Total 12–20 ms, the same in absolute terms at q0.

**Verify.**
- perf5.
- The report's 1-pixel-scissor timing of the ground alone: ~25 ms should drop to ~6–8 ms.
- Frozen shots, bit-identical, including the three cine cameras. The low cameras exercise the margin.

**Risk:** none.

### 3. Sea: skip terms where they are exactly zero

**Where:** `/home/user/abyssos/skotos/src/world/sea.js`, `seaMat` fragment. Each body contains sin or smoothstep calls, so the compiler keeps them as real branches.

- **(a) Foam, lines 489–490.** Use `float foam = 0.0; if (dw > 0.0 && dw < 0.075) { float lapK = ...; foam = ...; }` with the expressions unchanged. lapK lies in 0.5–1, so the band ends by dw = 0.075, and `smoothstep(0, 0.025, dw)` is 0 for dw ≤ 0.
- **(b) Step line, lines 529–534.** Keep `fw` outside the branch (it uses `fwidth`), then:
  ```glsl
  float edge = 0.0, edD = abs(depD + sn * 0.4 - 0.4);
  if (edD < fw * 1.6 && slope < 0.8) { edge = ...; col = mix(col, vec3(0.5, 0.62, 0.68) * uAmbK, edge * 0.45); }
  ```
- **(c) Lace, line 508.** Wrap the `{ float lace = ...; if (lace > 0.001) {...} }` block in `if (vLand > 0.17)`. The terms added to vLand total at most 0.035 + 0.03 + 0.03 = 0.095, against the 0.27 edge.
- **(d) Deep-only work, lines 363 and 406–417.**
  - `vec2 swg = vec2(0.0); if (deep > 0.0) swg = (...) * deep;`
  - Wrap the swell crest (406), the glint block and the moon glint (417) in one `if (deep > 0.0) { ... }`.
  - Inside it, gate the glints with `if (gk > 0.0) { vec3 gcol = ...; col += ...; }`.
  - Every one of these terms is multiplied by `deep` or `gk`, and deep is exactly 0 on wading water.
- **(e) Light-path normal, line 447.** Move `vec3 Ng = ..., Rg = reflect(-V, Ng);` into the loop, after its second `continue`. perf5 lights no sea-light, so the loop is skipped as a whole and Ng is pure waste today.
- **(f) Duplicate slope.** Compute `float slope = fwidth(dep) / max(length(fwidth(P)), 1e-4);` once, before `float plateK` (outside `#ifndef SEA_LOW`). Use it for `sl0` (line 472) and remove it from line 529.
- **(g) Black aurora, lines 383–384.** Use `if (vAurK > 0.0) { sheen *= ...; col += ...; }`; the coast's aurDark is 0.
- **(h) Crest whitening, line 576.** Use `if (vCr > 0.22) col = mix(...)`; vCr is 0 except during the Freeze.

**Saving.** About 300 instructions per water quad out of ~2,500, about 12% of the sea pass: 12–18 ms. The same share applies at q0.

**Verify.**
- perf5, and the sea pass timed alone.
- Frozen shots, bit-identical: the Landing waterline and foam at tide 0.6, the closed step at 0.9–1.2, a steep shore (lace) at 1.2, the moon's path on closed water, wading water round the hero, a lit sea-light (`&beam=1`), the wake (`&wake=1`).

**Risk:** none.

**Optional, near-exact:** move the swell slope `swg` into a vertex varying. It saves ~2–3 ms more on closed water; the error is about 1.5% of a 0.056 slope.

### 4. Ground: flat stand-in under closed water

**Measure the band first.** Wherever the sea's `deep` is 1 (so its alpha is ≥ 0.95), the ground is still fully shaded when its depth by `vBed` is between ~0.43 and 0.56 m: textures, ripple marks, normal maps, 7 point lights and PCF, for at most 5% of what shows.
- At 1.2 m water this is the bar's 0.75 m half and the 0.75 m flats round the Dalaro. The flats there quantise mostly to beds ≤ 0.6 (skipped already) and 0.75 (this band).
- Temporarily paint the stand-in pixels magenta at the perf5 spot and count them with an in-page `readPixels`. If they are under ~8% of the ground, skip this item.

**The change.**

**(i) Grid coordinates on the ground.** In `buildGround`, for `cfg.wet`, add `aGG`: the rounded `(vx, vz)` that the per-vertex loop already computes before the jitter. `geo.setAttribute('aGG', new THREE.BufferAttribute(gg, 2))`.

**(ii) Bed texture on the ground material.** In `groundMat`, if `X5.wet`: `uni.tBed = { value: null }; uni.uBedS = { value: new THREE.Vector2(1, 1) }; uni.uBedOn = { value: 0 }; m.userData.bed = uni;`. Add `attribute vec2 aGG; varying vec2 vGG;` with `vGG = aGG;` to the vertex shader, and the three uniforms plus `varying vec2 vGG` to the fragment shader.

**(iii) Bind it after the sea is built.** In `buildLevel`, right after `out.sea = buildSea(...)`: if `out.ground.material.userData.bed` and `L.bedTex5` both exist, set `tBed.value = L.bedTex5`, `uBedS.value.set(L.w * BS + 1, L.h * BS + 1)` (export `BS` from sea.js) and `uBedOn.value = 1`. Ground and sea already share the corners, the jitter and the quad diagonal (x, z+1)–(x+1, z), so `vGG` equals the sea's `vG` at the same world point. Binding here avoids SEA.tBed being one frame stale.

**(iv) The test, in the fragment shader.** Replace lines 1471–1472 with:

```glsl
float gLv = mix(uLevel, uBayLevel, vBay);
if (gLv - vBed > 0.56) discard;
if (gLv - vBed <= 0.56) {
bool gUnder = false;
if (uBedOn > 0.5 && uFzG < 0.001 && gLv - vBed > 0.36) {
  vec3 gVu = normalize(cameraPosition - vGW);
  if (gVu.y > 0.6) {   // (not at a cine's grazing look: there the full path)
    vec2 gO = gVu.xz * (0.3 / gVu.y);   // where the eye's ray meets the closed surface, ~0.3 m up
    vec2 gb = texture2D(tBed, ((vGG + gO) * 4.0 + 0.5) / uBedS).rg;
    float gsn = shoreN(vGW.xz + gO);
    // the sea's own: deep == 1 (0.43 + 0.015 margin), dw >= 0.06, film == 1
    gUnder = gLv - gb.g + gsn * 0.4 > 0.445 && gLv - gb.r + gsn > 0.10 && gLv - gb.r > 0.05;
  }
}
vec3 gOut = vec3(0.0);
if (!gUnder) {
```

This opens before the existing `// a slow warp` code. It is a conservative copy of the sea's closed test: the sea's alpha only rises above it (edge, plates, foam, the drop terms, the Freeze).

**(v) The stand-in.** Add `.replace('#include <opaque_fragment>', ...)` for `X5.wet` with:

```glsl
  gOut = outgoingLight;
} else {
  vec3 sc = textureLod(tB, vec2(0.5), 16.0).rgb;                 // the shore layer's mean
  sc = mix(vec3(dot(sc, vec3(0.3, 0.59, 0.11))), sc, uSat);       // (X.sat)
  sc = mix(vec3(dot(sc, vec3(0.3, 0.59, 0.11))) * vec3(0.94, 0.97, 1.03), sc, mix(0.5, 0.22, vBay)) * (1.0 + 0.16 * vBay);
  sc *= 0.9 * (vec3(0.46, 0.5, 0.54) + 0.08 * vBay);             // mean marks, wet
  vec3 sEm = vGAur * clamp(dot(sc, vec3(0.3, 0.59, 0.11)) * 1.6, 0.12, 1.0); sc *= 1.0 - 0.16 * vGAurK;
  vec3 alb = diffuse * vColor * sc * (0.82 + 0.36 * vLay.w), nV = normalize(vNormal), pV = -vViewPosition;
  vec3 irr = ambientLightColor + getHemisphereLightIrradiance(hemisphereLights[0], nV)
           + directionalLights[0].color * saturate(dot(nV, directionalLights[0].direction));   // no shadow
  IncidentLight sL;
  for (int i = 0; i < NUM_POINT_LIGHTS; i++) if (pointLights[i].color != vec3(0.0)) { getPointLightInfo(pointLights[i], pV, sL); irr += sL.color * saturate(dot(nV, sL.direction)); }
  gOut = irr * BRDF_Lambert(alb) + sEm;
}
gl_FragColor = vec4(gOut, 1.0);
```

- Guard the hemisphere, directional and point-light terms with `#if NUM_..._LIGHTS > 0`.
- The lantern and any lit pool light stay exact. Idle pool lights are skipped by a uniform branch, and they contribute exactly 0 today.
- Tone mapping, sRGB, fog and dithering then run on both paths, and the existing closing `}` stays.
- Depth is still written, so decals and rings behave as now.

**Saving.** About 2,300 instructions per qualifying quad (the full path is ~2,950 after item 1; the test and the stand-in cost ~650). The test costs ~350 on quads that are tested but fail. If the band is 15–30% of the ground's quads, that is 15–35 ms. Phones save ~5 texture reads, the normal map, PCF and the light maths on those pixels.

**Verify.**
- First the magenta count.
- Then perf5 and the ground pass timed alone.
- Frozen shot pairs: the Dalaro at 1.2, 1.0 and 0.9; the closed step; a lit sea-light at high water; the three cine cameras.
- Expect identical frames outside the band, and inside it max |Δ| ≤ 2/255 with no contour visible at 400%. A thin strip of larger differences along the step edge means the 0.015 margin is too thin: raise it to 0.02, or the `gVu.y` floor to 0.7.

**Risk: low.**
- The canvas blends in sRGB-encoded space, so the ground's 5% share moves the final pixel by at most 0.05 × its own change. Texture detail and the hull's moon shadow on the submerged bed vanish; that is ≲ 1–1.5 levels.
- The existing 0.56 m cut already shows the background colour at that 5% weight, and nobody noticed it.
- The change wraps three's chunks from `map_fragment` to `opaque_fragment` in one branch, so it needs a careful review.

### 5. Reserve: shoreN baked into tBed's blue channel

Only if 1–4 leave the median above ~1.10.

**Where:** `/home/user/abyssos/skotos/src/world/sea.js`, `buildSea` (the tBed loop at lines 776–804) and `seaMat` (lines 322–337).

**The change.**
- Make `hd` RGBA half-float (`Uint16Array(TW*TH*4)`, `RGBAFormat`).
- For each texel g = (xs, zs)/BS, find P(g) through the jittered triangle that contains it (corners a, b, c when fx + fz ≤ 1, else d, c, b). Store B = shoreN(P), computed on the CPU from `SEA.tNoise.value.image.data` by bilinear repeat sampling at P·0.11 + (0.37, 0.61): (r − 0.5)·0.17 + (g − 0.5)·0.07.
- In the tide sea only: `vec3 bS = texture2D(tBed, ...).rgb; sn = bS.b;`, dropping the shoreN tap. `SEA_LOW` and `SEA_FAR` keep their own read.
- If item 4 is in, its test reads `gb.b` too and saves its own shoreN tap.

**Saving:** one trilinear tap per water pixel, about 8–10 ms. tBed grows from 1.5 MB to 3 MB.

**Risk: low, not none.**
- Bilinear sampling of 0.25 m samples of a noise with a 1.1–2.3 m lattice is off by ≲ 2 mm.
- On dead-flat beds, where the waterline follows sn, that moves it ≲ 2 cm; the step line moves ≲ 1 cm.
- The ground's wet sand keeps the analytic shoreN, so the two edges may part by that much.
- Compare the Landing at tide 0.6 and the step at 0.9–1.2 at 400% zoom.

## 3. Not worth it, and why

- **Discard-free sea for early depth tests** (analysis 1 #1, analysis 2 #5). This ANGLE has no early-fragment-tests pass (see section 1), so the expected saving is 0. To close it for good: time the Field's discard-free Act IV ground over depth cleared to 0 and to 1. Equal times end it.
- **Skipping idle point lights in three's chunk** (analysis 2 #6, analysis 3 #3). The cost is shared with the Field, so the ratio stays flat or worsens unless the coast spot has fewer lit pool lights than the Field camp (brazier, waypoint). Log `R.pool.filter(l => l.intensity > 0).length` at both spots first. It is the biggest single phone win, so do it as its own change, for all acts, after the gate passes.
- **A no-mipmap twin of tNoise** (analysis 1 #6). It helps SwiftShader only. On phones `textureGrad` is often slower and trilinear is free, so it would tune the benchmark, not the phones.
- **Chunking the ground and dropping always-discarded quads** (analysis 2 #3, analysis 3 #5).
  - Chunking: after item 2 only ~4–6 ms of off-screen base vertex work is left, and it touches every user of the `out.ground` hook.
  - Dropping quads with vBed < −0.56: only safe if `uBayLevel` never goes below 0, which nothing guarantees.
- **CPU-side constants and per-vertex fog** (analysis 1 #5). About 3–4 ms. Fold into item 3 only if convenient.
- **Gating the ground's `gWob`, skipping `tA` on flat interiors, the hBmax snow skip** (analysis 2 #2c/d, analysis 3 #6). Exact but fiddly; a few ms.
- **The moon-glint cutoff** (analysis 1, optional). It skips terms under 1e-4, not exactly zero, and saves ~30 instructions.
- **Moving the foam and edge sines into varyings** (analysis 3 #4). Item 3 already skips them almost everywhere.
- **The wreck** (~140 ms, coast-only). There is no exact cut without early depth tests. An item-4-style stand-in for the hull's lowest ~0.3 m is ~10% of its area, ~5–10 ms, for medium effort; leave it for later.
- **MSAA, pixel ratio, shadow-map size, light count.** These change the look or are shared with the Field.

## 4. How to verify

**perf5.** Use a private no-HMR server (`tools/vite.nohmr.mjs`) and one browser at a time.
- Run `QS=1 CYCLES=21 node tools/scenario.mjs perf5 <dir>` twice on HEAD, to learn this machine's noise.
- Run it again after items 1–3, and again after item 4.
- Then run the default (`QS=1,0`, 5 cycles) for the q0 floors.
- Read `coast@q1.vsField`, `coastLow@q1.vsField` and `farlight@q1.vsField` (all should drop).
- Read `ashfield@q1.ms` as the control: it should not move. If it moves by more than ~3%, rerun.

**Frozen frames.** `tools/shot.mjs` cannot pin the clock (it loads a query, waits and screenshots), so use a scratch Playwright script.
- Use the world viewer without `noenv`: `?world=coast&q=1&seed=3&x=..&z=..&tide=1.2`, plus `&beam=1`, `&wake=1`, `&pitch=` as needed, in perf5's 915×412 / scale 1.5 mobile context. Also capture q2 desktop.
- In one `evaluate`:
  - Set `WIND.uTime.value` (it is also `SEA.uTime`), `R.time`, `SEA.uAur`, `uAurDark`, `uAurFront` and the hemisphere colour.
  - Hide the snow FX.
  - Call `__view(x, z, {pitch, dist, tide})`.
  - Render once and `readPixels` the whole canvas.
- Diff the old and new trees: the count of pixels with |Δ| > 1 and the max |Δ|.

**Expected results.** Items 1–3: identical. Item 4: identical outside the band, ≤ 2/255 inside it. Item 5: sub-pixel line shifts only.