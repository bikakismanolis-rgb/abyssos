export const meta = {
  name: 'skotos-act5-look',
  description: 'Act V look polish: a critic walks the coast and the frozen sea in every state and lists what looks wrong; a fixer fixes it within the frame budget; up to three rounds',
  phases: [
    { title: 'Critique', detail: 'screenshots of every area, state and camera, judged against a 2026 mobile game' },
    { title: 'Polish', detail: 'fix the listed problems, keep perf5 and shallowtele passing' },
  ],
}

const S = args.scratch, R = args.repo
const CTX = `
You are polishing the look of Act V ("The Frozen Coast") of Skotos, a Three.js mobile action RPG in ${R}. The rest of the repository (Abyssos) is a different game: never touch it.
Read first: ${R}/docs/act5-contract.md (owner decisions, ownership, Shared names), the design's "The look in one idea" and "The look: what each image costs" sections in ${R}/docs/act5-design.md, and the stage-B reports ${S}/b/B2a.md, B2b.md, gate.md and fixes.md (what the sea, ice, aurora, props and atmospheres are and how perf5 measures them).
At the same time another workflow (stage C) is building the enemies, bosses, story, HUD and audio in the same tree. YOUR FILES (the look owner): src/world/sea.js, src/world/build5.js, the Act V parts of src/world/build.js, the dressing and visual placement in src/world/gen5.js (never the layout rules that tools/check-act5.mjs checks: run check-act5 after any gen5 change and keep it clean), src/world/atmos.js, src/gfx/textures.js, the existing ambients and emitters in src/gfx/fx.js (stage C may append new functions at its end: leave those alone), and the rime pack builder tools/pack-rime.mjs with src/assets/rime* if a prop itself is the problem (keep its credits right). Do NOT edit light.js, creatures.js, people.js, ai.js, combat.js, story.js, text.js, hud.js, panels.js, audio.js, boot.js, world.js: if a fix needs them, write it as a request in your report.
Rules: never commit, never git checkout/reset/stash; match the code style; no model names in code. Memory: at most ONE headless browser at a time, close it when done, stop any private server you start; write progress notes to your report as you go (the container has restarted before; if you find work partly done, continue from it). Use a private no-HMR dev server on your own port (\`npx vite --config ${S}/b/vite.nohmr.mjs --port <yours> --strictPort\`, BASE=http://localhost:<port>/), ?auto=coast|farlight&lvl=30&q=1 with &quest= and &flags= for states (frozen, seaLit; read boot.js), the gameplay camera and a lowered cine camera, a phone viewport (isMobile, hasTouch, 844x390) and desktop 1280x720. Look at every screenshot with the Read tool. Software rendering (swiftshader) can show dithering or banding that a phone would not: say when you think an artefact is the renderer's, and prove it if you can (e.g. compare with an Act IV zone under the same renderer).
The bar: the owner wants graphics "of 2026" and to be impressed. Acts III and IV (the Weeping Woods, the Field of Ash, the Forge) are the quality floor; compare with them under the same renderer and camera.
`
const ISSUES = {
  type: 'object',
  properties: {
    issues: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['major', 'minor'] }, where: { type: 'string' }, what: { type: 'string' },
      screenshot: { type: 'string' }, fix: { type: 'string' },
    }, required: ['severity', 'where', 'what', 'fix'] } },
    verdict: { type: 'string', description: 'one paragraph: how the act looks now against Acts III/IV and the 2026 bar' },
  },
  required: ['issues', 'verdict'],
}

const rounds = []
for (let round = 1; round <= 3; round++) {
  phase('Critique')
  const crit = await agent(`${CTX}
YOUR ROLE: art critic, round ${round}. Do not edit anything.
Walk every area of both zones in every state and both tides: the coast (the Landing and its hearth, the jetty and huts, the tidal flats at low and high water, the Ship Graveyard, the whale, the Frozen Fall, the ebb caves, Skerry Bay and the skerry, the sea-lights lit and unlit, the Name-stones; then the frozen reading after the Freeze with the black aurora; then after seaLit with the true aurora) and the Farthest Light (the Icebound Ship, the Ice Road with its spines, rims and leads, the bergs, the Breathing-holes, the windows with drowned lanterns, the ice edge and the Farthest Light's skerry; in the black sky and after seaLit), and Whitecliff's northern horizon after seaLit; at the gameplay camera on desktop and on a phone viewport, and the cine camera at the cine spots. Also take the same views of the Field of Ash and the Weeping Woods for comparison.
${round > 1 ? `Previous rounds' issues and what the fixer did are in ${S}/look/round${round - 1}.md: check that each fix holds and look for what is still wrong.` : ''}
List every visual defect (things that look broken, flat, paper-like, untextured, blocky, stepped along the grid, floating, sunk, z-fighting, popping, wrong scale, repeated too obviously, too dark to read, or simply ugly next to Acts III/IV), with the screenshot path, where it is, and a concrete fix idea. Major = the owner would notice it in normal play. Save your screenshots under ${S}/look/crit${round}/.`, { label: 'critic ' + round, phase: 'Critique', schema: ISSUES })
  const major = (crit && crit.issues || []).filter((i) => i.severity === 'major')
  log(`Round ${round}: ${(crit && crit.issues || []).length} issues, ${major.length} major`)
  if (!crit || (!major.length && round > 1)) { rounds.push({ crit, fix: 'stopped: no major issues' }); break }
  phase('Polish')
  const fix = await agent(`${CTX}
YOUR ROLE: look fixer, round ${round}.
The critic's verdict: ${crit.verdict}
The critic's issues (screenshots under ${S}/look/crit${round}/):
${JSON.stringify(crit.issues, null, 1)}
Fix every major issue and as many minor ones as are worth it, at the root, in your files. After your changes: check-act5 clean if gen5 changed, \`node tools/scenario.mjs shallowtele\` and \`perf5\` passing (perf5 within the Field of Ash + 15% at quality 1; it takes about 25 minutes, so run it once at the end), the build clean, and screenshots before and after for each fix. Write ${S}/look/round${round}.md: one line per issue (fixed / not fixed and why / a request for another owner), the perf numbers, and the screenshot paths. Return a 10-line summary.`, { label: 'fixer ' + round, phase: 'Polish' })
  rounds.push({ crit, fix })
}
return rounds
