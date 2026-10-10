export const meta = {
  name: 'skotos-act5-act',
  description: 'Act V stage C: Cold, beams, enemies and both bosses (combat lane); quests 24-31, text, HUD, panels, audio and the cameo (story lane); then the Act V scenarios, gate G4 and a review round',
  phases: [
    { title: 'Build', detail: 'combat lane (C1 mechanics, C2 enemies, C3 bosses) and story lane (S1 story and text, S2 HUD, panels, audio)' },
    { title: 'Integrate', detail: 'the Act V scenarios, end to end, fixed until they pass' },
    { title: 'Gate', detail: 'G4: every Act V and shipped scenario, artifact and CSP, memory report' },
    { title: 'Review', detail: 'three lenses find bugs, a fixer verifies and fixes' },
  ],
}

const S = args.scratch, R = args.repo
const CTX = `
You are building stage C ("the Act") of Act V ("The Frozen Coast") of Skotos, a Three.js mobile action RPG in ${R}. The rest of the repository (Abyssos) is a different game: never touch it.
Read first, fully: ${R}/docs/act5-contract.md (owner decisions, lead decisions, stages, FILE OWNERSHIP, the Shared names you must use exactly, and the "Stage A outcome" section with the to-dos the asset builders left for you), then the parts of ${R}/docs/act5-design.md your task touches (Story and beats, Enemies, Bosses, Mechanics, Blessings, Music, Echoes, Difficulty, Touch and phone readability), ${R}/docs/act5-briefs/canon.md for the voice of the text, and ${R}/docs/act5-briefs/assets-built.md for what each model really has (clips, sizes, extras). Stages A (assets) and B (world, sea, tide, ice) are done and committed; their reports are in ${S}/assets/*.json and ${S}/b/*.md (B1a, B1b, B2a, B2b, gate, fixes): read the ones about the systems you use. Act IV's code is the model to mirror (Ivar and Karthax in ai.js, the Lampless and the light rules, story.js quests 17-23, the Lamp Memories, beaconScene(4), actComplete(4)).
Rules:
- Edit only your role's files from the contract's stage-C ownership. Two lanes run at the same time: combat (ai, actors, combat, data beyond DIFFS/HAZ5, player, projectiles, skills, stats, items, light, sap, cold.js, the gameplay hooks in tide.js/ice.js, models, creatures.js, people.js) and story (story.js, text.js, audio.js, ui/*, boot.js, state.js, world.js presence/npcs/catch-ups, scenario.mjs, README). Exception for text.js: combat may add only its own keys (mon.*, hud status texts, boon.* and leg.* lines, combat toasts) in one block at the end of the Act V keys, with small Edits; if an Edit fails because the file changed, re-read and retry. If you need a change in the other lane's file, write it in your report as a request and stub it in your own file; the integrator does the joins.
- Never commit, never git checkout/reset/stash. Match the surrounding code style. No model names in code or comments.
- Memory: the container has restarted before. Keep at most ONE headless browser open at a time, close it when done, never run scenarios in parallel, stop any private server you start. Write progress notes to your report file as you go, so a restart loses little. If you find your task partly done on disk (a restart cut a previous run), continue from what is there.
- Testing: the shared dev server http://localhost:5199 hot-reloads when anyone saves, which breaks long runs: for scenarios use a private no-HMR server on your own port (\`npx vite --config ${S}/b/vite.nohmr.mjs --port <yours> --strictPort\`, read that config first) with BASE=http://localhost:<port>/. ?auto=<zone>&lvl=N&q=1 with &quest= and &flags= jumps into a state (B1a added them; read boot.js). Look at your screenshots with the Read tool.
- The owner wants to be impressed: fights that read clearly on a phone, telegraphs before every big hit, bosses with real phases, a story that moves. Correctness first, then feel.
`

const LANES = [
  [
    { key: 'C1', role: 'combat', task: `MECHANICS AND CREATURE PLUMBING.
- cold.js (new): the Cold meter, its sources (water, wind/gusts, plunges, hits from cold enemies) and sinks (warm pools, fires, beams, lamps), states and Frostbite (with its boss variant), per the design's Mechanics and the contract's Cold API, with the HAZ5 per-difficulty numbers; the hooks the HUD and the frost overlay read (story draws them).
- light.js: per-zone light kinds (the zones' light/ring keys from B1a), addBeam/inBeam (the beams B2 draws via sea.js beamMesh: wire play to the visuals), lampLightAt (no fire areas, no hole lamps), lightAt(x, z, { ring: false }), the Cradle's 4 m ring on the coast, drink() and the swell for 'ember' zones only; the fix for light pools blowing snow out to white discs (B2b's request).
- sap.js: sapAt returning the pool's kind ('amber' alone builds the stick; brine and slush their own look); the whale-oil casks and fire that melts ice; the vulnerability rule in combat.js (one stacking rule with the cap the design gives, statuses Revealed/Exposed/Beached/Stranded/... with their icons and hud texts).
- The gameplay side of tide and ice: def.weight for heavy monsters, FALLS rules, drown/flounder outcomes, floodWave packs, charger's iceCharge, Frost Nova refreeze and the Warden/Ranger ice roles in skills.js.
- creatures.js and the asset to-dos from the contract's Stage A outcome (keepMat in prepare(), walkSpeed ?? 1.4, HOLD/LOOP rows, roll speed, icemaw dive/slide hiding, skua takeoff lift) and people.js runtime parts for the frost set (the Harpooner's harpoon and hood, the Sunken's boat-hook and kelp, the Ice Singer's veil, the keepers' lamps, Selna's stoop, the shorefolk tints, the memory figures).
Test each piece in a zone with ?auto and screenshots; run soak5 (tide, ice) to make sure nothing in stage B broke.` },
    { key: 'C2', role: 'combat', task: `THE ENEMIES.
C1 (mechanics) is done; read its report ${S}/c/C1.md first.
The 7 entries / 8 kinds of the design and the contract: sunken and harpooner (frost set: tideWake from kelp mounds, the boat-hook pull, the harpoon with a rope line and a reel, stopping at the first deep cell), iceSinger (new 'singer' AI: song that cracks ice under the hero or floods her footing, fizzles inside lamp light), hullLouse (swarm from hulls, curl into a ball that the hero can kick/roll into others), icemaw (new 'lurker' AI: a shade under the ice, surfaces from holes, the drag, denied inside lamp light; stranded by light), reefback (the crab ×1.5: a rock at low tide, wakes when the water comes), rimeBear (the shipped bear with the polar tint ×1.3: the frost roar, charges that crack ice, baited through thin ice), skua (flocks on the bat AI, lightShy: strike in the dark, scatter in light; the dive loop and takeoff). MONSTERS entries with hp/dmg in Act IV's band scaled to levels 28-31, elites and affixes, flesh types 'drowned'/'skotos' with sounds, projectiles harpoon and brineGlob, PACKS/PACK_LEAD for every pack tag the contract lists, how gen5's pack spots are filled per zone and state (tidal, frozen), floodWave packs. Act IV's monsters are the bar for feel. Test every enemy in its zone at the gameplay camera with screenshots of its telegraphs, and that packs spawn where gen5 put them.` },
    { key: 'C3', role: 'combat', task: `THE TWO BOSSES, THE CAMEO POSES, BLESSINGS AND LEGENDARIES.
C1 and C2 are done; read ${S}/c/C1.md and C2.md first.
- Skerry, the Walking Tower (crab ×4 with the Skerry Light on its shell socket): its arena in Skerry Bay with forced arena water, the wake from the sleeping skerry, Breach and Beached (stand on dry rock so it strands itself), the turn onto the ice and the thick-only stepToward mask in phase 2, the Shell Rush bait and Overturned, the flank interact, Island and Blinded with the relit beam on its back, the Bell, its fail-safes, the death crawl back to its skerry (push the hero clear before blocking those cells), every def.radius pre-scale, the time-to-kill target.
- The Skotos (the hooded figure, anchored waist-deep at the ice edge, keepMat skin with the sea.js fresnel patch, the skotos_void hood opening kept black): the Hands as node actors, Beneath and the hero-chosen Breach beside a fire, Selna's three Remembers counted at runtime (a.remembers, G.selnaBack) with lockPhase and hpFloor held at 30% until the relight (Karthax's pattern), Wrap the Light, the keepers' walk-on with their lamps and, per the owner's decision, Brokka with Deepstone's fire and Elati with the beacon-tree's fire (walkTo and poses only, no hp, no AI; folk and grove sets loaded from q29 by world.js READY; stand-ins 'smith' and 'ranger'), the relight, the beam with Seared, Smother and the Coil, the Deep Cold's safe circles, the fight camera (farlightFight/farlightNight zoom and pitch so the hood reads: the contract's Stage A outcome), and the hooks the naming cine needs (story owns the cine).
- TOWER and SKOTOS tables in boss(); the echo variants of both for the post-game; BOONS[5] with REMEMBERED ×1.25; the two legendaries (first-kill drops via legFrom_<boss> with LEG_FROM, drop: false in the random pool); boss difficulty scaling from HAZ5 (cooldowns, adds) including the sixth difficulty.
Test both fights end to end with ?auto at levels 30 and 34, as a Warden, a Ranger and a Mage, with screenshots of every phase and telegraph.` },
  ],
  [
    { key: 'S1', role: 'story', task: `THE STORY AND ITS TEXT.
Quests 24-30 and the end state 31 exactly as the design's beats and the contract's Story names: the hook at Whitecliff (Alkyone at the beacon, the fourth fire going out while she speaks, Halda and the coal in the Cradle), the walk through the Field and the Anvil's Neck, the arrival and the hearth and the rite at the Landing (the first «Σκότος»), the three sea-lights with their Ice Memories ('memory-ice' body class, the «Θυμήσου» window for an unseen one), the Name-stones and REMEMBERED, Skerry's waking and death, the Freeze (the aurora goes black, Selna walks onto the ice and the world forgets her: her name «…» in quest text until the Remembers), the seals of the Breathing-holes with Alkyone going ahead and her fail-safe, Tern, the Skotos fight's story beats and, per the owner's decision, Brokka and Elati arriving with their fires (lines d.brokka.v3+, d.elati.v3+ with .r for the Ranger; their home lines after the act), the naming (the rite, Isarn's name in second-person narration, «Σκότος.», the ΣΚΟΤΟΣ title card, the title-screen subtitle «Το σκοτάδι έχει όνομα»), the lantern room and Isarn's carving, home and the child, beaconScene(5, ...) with the sea-lights answering on Whitecliff's horizon, actComplete(5), the act panel, offerBoons over [1..5], the catch-up table for every flag, npcHasNews, spawnNpc for every Act V npc, the Selna rite after the act, echo prompts. world.js presence, npcs and catch-ups (act5Presence) are yours now.
All text in src/i18n/text.js (about 235 bilingual lines: Greek first, English second, the canon brief's voice; the hero never speaks; "Saltborn" in English). Read every existing Act IV line you echo. Write lines a reader would remember.
Test the flow with ?auto and quest/flags jumps, save and reload at every step (the catch-ups), with screenshots of the cines.` },
    { key: 'S2', role: 'story', task: `HUD, PANELS, OVERLAY, AUDIO, DIFFICULTY TEXTS.
S1 (story and text) is done; read ${S}/c/S1.md first.
- hud.js: the Cold meter in the amber slot, the tide dial by the minimap (tideDial() from tide.js), the foot ring warning on stage-2 ice, the new status icons and texts, the plunge/drowned texts, the questGoal entries for 24-31 (with the forgotten name), the minimap water tones (B1b started them).
- overlay.js and style.css: the frost vignette (CSS, driven by the Cold), the 'memory-ice' memory body, the ΣΚΟΤΟΣ title card.
- panels.js: the act panel for Act V, the boon panel's header boon.h5 and the REMEMBERED note, the waypoints' sub-lines, the sixth difficulty everywhere difficulties are listed (pick panel, waypoints, descriptions), pick.locked texts; screens.js: the title subtitle after the act.
- audio.js: the five themes (coast, farlight, tower, skotos and the ending/answer theme), the sea-light motif, the ice-song instrument, the forgetting melody, the master low-pass for the Freeze, moods (sky, gust, sub, tide), about 26 sound effects (tide bell, tide turn, ice creak, crack, break, plunge, splash, slush, harpoon throw and reel, hook, louse roll, icemaw surface and dive, skua cries, bear frost roar, singer song, beam bell, lamp light, freeze wave, Skotos breath, hands, smother, the naming), in the style and quality of the existing Web Audio themes and sfx. Everything combat and story call by name must exist (grep for calls).
Test every panel and HUD element on a phone-sized viewport (isMobile, hasTouch, 844x390) and on desktop with screenshots.` },
  ],
]

phase('Build')
const lanes = await parallel(LANES.map((steps) => async () => {
  const out = []
  for (const st of steps) {
    out.push(await agent(`${CTX}
YOUR ROLE: ${st.role}. YOUR TASK (${st.key}): ${st.task}
When done, write ${S}/c/${st.key}.md (create ${S}/c/ if needed; keep it updated as you go): what you built (files, functions, names), how you tested it (commands, results, screenshot paths), requests for the other lane, anything stubbed, and open problems. Return a 12-line summary.`, { label: st.key, phase: 'Build' }))
  }
  return out
}))
log('Build: ' + lanes.map((l) => (l || []).filter(Boolean).length).join(' + ') + ' steps done')

phase('Integrate')
const integ = await agent(`${CTX}
YOUR ROLE: integrator (you may edit any stage-C file; asset files and stage-B systems only for real bugs).
Read every report in ${S}/c/ first and do every cross-lane join they request.
Then write the Act V scenarios in tools/scenario.mjs exactly as the design's scenario table describes (hook5, catch5, coast, tide, ice, tower, freeze, holes, skotos, ending5, cast5, echo5; perf5 and shallowtele exist), plus 'cameo' (Brokka and Elati walk on in the Skotos phase 3, real models when the sets are loaded, stand-ins in a cold session) and 'diff6' (the sixth difficulty unlocks after Act V on Ash, shows in the panels, and an Act V zone on it gets its own seed and the HAZ5 values). Run each on a private no-HMR server and fix what fails at its root, in whichever lane's file it lives. Then play the whole act start to finish in one session as a Warden from an Act IV-end save (quest 23, the shipped save format) with a script that drives it (dialogs, interacts, fights with sim help as the shipped scenarios do), with screenshots at every beat, and fix what breaks or reads badly.
Write ${S}/c/integrate.md and return a 12-line summary.`, { label: 'integrate', phase: 'Integrate' })

phase('Gate')
const gate = await agent(`${CTX}
YOUR ROLE: the stage-C gate keeper (you may edit any stage-C file to fix what the gate finds).
Read ${S}/c/integrate.md first. Run gate G4 and fix every failure at its root:
1. Every Act V scenario (hook5, catch5, coast, tide, ice, tower, freeze, holes, skotos, ending5, cast5, echo5, cameo, diff6, perf5, shallowtele) and every shipped scenario (Act I combat, ranger, mage, weaver, lord, ending, title, panels; Act II pass, stonewarden, halls, king, ending2, cast2, boons; Act III weep, hart, heart, amaranthe, echo, ending3, cast3; Act IV ashfield, ivar, forge, karthax, ending4, cast4, echo4), one at a time on a private no-HMR server; soak5 tide and ice; check-act5, check-act4 and parity-ashfield.
2. The builds: \`npx vite build --logLevel error\` and \`npm run build:artifact\` (every file under 16 MB); then serve skotos/artifact with tools/csp-server.mjs under the strict CSP in docs/HANDOFF.md and check in Playwright, desktop and an isMobile/hasTouch context, that there are no CSP violations, no console errors and no white models in the coast and the farlight fight.
3. The memory report: phone GPU texture memory in coast and farlight after a warm run (the Field first) and on a cold start at each waypoint, against the budget in the contract (and the cameo's accepted cold-start cost).
Write ${S}/c/gate.md with every result and fix. Return a 12-line summary.`, { label: 'G4 gate', phase: 'Gate' })

phase('Review')
const FIND = {
  type: 'object',
  properties: { findings: { type: 'array', items: { type: 'object', properties: {
    file: { type: 'string' }, line: { type: 'number' }, severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
    problem: { type: 'string' }, scenario: { type: 'string', description: 'concrete inputs or state leading to the failure' }, fix: { type: 'string' },
  }, required: ['file', 'severity', 'problem', 'scenario', 'fix'] } } },
  required: ['findings'],
}
const LENS = [
  'combat and gameplay: the enemies and both bosses (phases, telegraphs and counters, fail-safes, soft-locks, hp floors and lockPhase, actors in closed cells, pathing on ice and in water, pulls that cross deep water, the vulnerability cap, numbers against Act IV and across the six difficulties including the sixth, the Cold, beams and lamps, Brokka and Elati in the fight, echoes, legendaries, blessings)',
  'story, saves and UI: quests 24-31, every flag and its save point, quitting at any moment (mid-cine, mid-fight, after a flag and before its scene) and reloading, the catch-up table, old saves and the migration from quest 23, the forgotten name and its restoration, the title subtitle, text keys missing or unused, Greek and English both present, the HUD and panels on a phone viewport, audio names called but missing',
  'regressions and robustness: anything stage C changed in shared code paths that Acts I-IV use (ai.js, combat.js, actors.js, player.js, skills.js, light.js, sap.js, stats.js, items.js, hud.js, panels.js, story.js, boot.js, world.js, audio.js), per-frame allocations and leaks on zone changes, errors that only appear on a production build or under the artifact CSP',
]
const reviews = await parallel(LENS.map((lens, i) => () => agent(`${CTX}
YOUR ROLE: reviewer. Do not edit anything.
Review the stage-C changes (\`cd /home/user/abyssos && git diff HEAD -- skotos/\` plus new untracked files such as src/game/cold.js) through this lens: ${lens}.
Report only real defects with a concrete failing scenario; no style nits. Read ${S}/c/gate.md for what already passed.`, { label: 'review ' + (i + 1), phase: 'Review', schema: FIND })))
const all = reviews.filter(Boolean).flatMap((r) => r.findings)
log(`Review: ${all.length} findings`)

let fixes = 'nothing to fix'
if (all.length) {
  fixes = await agent(`${CTX}
YOUR ROLE: fixer for stage C (you may edit any stage-C file).
Findings from three reviewers:
${JSON.stringify(all, null, 1)}
For each: verify it against the code (reproduce it where you can; a finding you cannot confirm is not fixed, say why), fix the confirmed ones at the root, and re-run the scenarios and checks they touch, plus the full Act V scenario set at the end. Write ${S}/c/fixes.md: one line per finding (fixed / not confirmed / not fixed and why) and the re-run results. Return the same as a summary.`, { label: 'fix review', phase: 'Review' })
}

return { lanes, integ, gate, findings: all.length, fixes }
