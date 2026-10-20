# Progression: the artifact files changed against version 12

Built with `npm run build:artifact` on `claude/skotos-progression` and on v12 (c70d65d); `artifact/assets/` compared by name.
No asset (model, texture, sound, animation) changed: only code chunks whose hash moved. Publish `artifact/index.html` with this `files` map: the added files uploaded, the removed ones set to null, everything else kept.

## index.html
Changed (it names the new entry chunks).

## Added (upload)
- `assets/anim-DmMIes9I.js`
- `assets/boot-Cmh2EVtn.js`
- `assets/build-CSJX0hUa.js`
- `assets/creatureview-BcNKD0gJ.js`
- `assets/env-BXvibrya.js`
- `assets/fx-2CDr9WV-.js`
- `assets/gen-rFQMpMNV.js`
- `assets/gen2-BhTl0aM8.js`
- `assets/gen3-D2WDC-Dq.js`
- `assets/gen4-u5KKYBnt.js`
- `assets/index-CCD1NuZf.css`
- `assets/index-CgkFSHk5.js`
- `assets/kits-BzFBEuCz.js`

## Removed (set to null)
- `assets/anim-bT-ijxBg.js`
- `assets/boot-Dhwa6kmL.js`
- `assets/build-en7_4QIY.js`
- `assets/creatureview-D2xHMyJZ.js`
- `assets/env-D45tCXvO.js`
- `assets/fx-BqK-F8gx.js`
- `assets/gen-BelIWAV8.js`
- `assets/gen2-Bcw74DQt.js`
- `assets/gen3-CQuDbwBB.js`
- `assets/gen4-B1TdwSM_.js`
- `assets/index-C0elAw6K.css`
- `assets/index-CnkZGems.js`
- `assets/kits-3_FyslnY.js`

Every file stays under 16 MB (the largest, `ash-*.js`, is 3.8 MB, unchanged).

## Checks
- Strict CSP (HANDOFF's policy) served by `tools/csp-server.mjs`: see the result below.
