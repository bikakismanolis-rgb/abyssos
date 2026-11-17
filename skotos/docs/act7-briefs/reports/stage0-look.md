# Act VII — stage 0 look gate: does daylight read in this engine?

Date: 2026-11-17. Tool: `g0/daygate.mjs` (Playwright, swiftshader, 960×540).
Method: existing zones re-lit with the draft `tarn` / `thaw` light rows, a hero,
a pack of enemies and live telegraphs (red ground circle, white rings), at
quality 0 and quality 1.

## Result: PASS, with one condition

| Shot | Ground | Light row | Reads? |
|---|---|---|---|
| `q1-coast-tarn.jpg` | open snow, jetty | tarn | Yes. Hero, NPCs, props, red circle all clear. Cool white, soft shadows. |
| `q1-pass-tarn.jpg`, `q0-pass-tarn.jpg` | open snow, paved road | tarn | Yes at both quality levels. |
| `q1-pass-thaw.jpg` | open snow, paved road, rock edge | thaw | Yes. Warm pink cast; red circle and white rings stay legible; wolves read against ground. |
| `q1-forest-thaw.jpg` | dense trees | thaw | No. Canopy keeps the frame dark; daylight does not arrive. |
| `q1-weep-thaw.jpg` | dense trees, dark ground | thaw | No. Dark and noisy. |

## Findings

1. Daylight works on **open, light ground**. Telegraphs keep their contrast:
   red on warm snow is the weakest pair but still clear (see `q1-pass-thaw`).
2. Daylight does **not** work under dense tree cover or on dark ground textures.
   The light rig is not the limit; the ground albedo and the canopy are.
3. The alpha-dither on fading props (rock at left of `q1-pass-thaw`) is much more
   visible in daylight than at night. It was hidden by darkness until now.
4. The warm `thaw` row tints the HUD-adjacent vignette pink at the corners. Mild.

## Conditions carried into the design and contract

- `thaw` is built as **open meadow and scree**, not forest: tree density capped
  (no closed canopy over walkable ground), and its ground layer is a new light
  texture (wet grass / melt-snow), not a reuse of the forest floor.
- `tarn` is open water-edge and bare rock; passes as is.
- Stage A item: soften or shorten the prop fade dither for acts flagged `day`
  (finding 3). Check on a real phone at stage E.
- Telegraph red on warm ground: keep the darker outline ring; re-check at stage C
  with the real ground texture. If it drops, shift `thaw` ground toward
  green-grey rather than changing the telegraph colour (shared across acts).

Not tested here: a real phone screen in sunlight, and the final ground texture.
Both are stage C/E checks.
