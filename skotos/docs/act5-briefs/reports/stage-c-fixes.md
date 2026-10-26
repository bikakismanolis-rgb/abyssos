# Stage C fixer: the three reviewers' 12 findings

Tree: 9ccd3a8 plus these edits (not committed): src/game/ai.js, src/game/story.js, src/game/world.js, src/i18n/text.js,
src/ui/hud.js. Every finding was reproduced on the committed tree before the fix (git archive HEAD served on a private
no-HMR :5462, c/fix/old.jsonl) and checked on the fixed tree (:5461, c/fix/new.jsonl), with c/fix/fixprobe.mjs (one
browser, one page at a time). Both servers are stopped.

## Findings

1. ai.js:4102 Hand Rise freezes the Skotos (major): FIXED. Reproduced: 126 of 454 frames (16.8 of 60 game s) with
   `a.rising > 0` on the boss, so its AI was skipped. Fix: the Hand counter is `a.handsRising` (riseHand, handsTick), reset
   on zoneEnter (a rise's timer is lost when she leaves within its 1.6 s). After: 0 held frames over 12 rises.
2. ai.js:3723 Overturn into phase 3 leaves it sunk with the x2 window on (major): FIXED. Reproduced: over at 7.60 s, phase
   2 at 7.73 s from st 'over'; 8 s later y -0.9 and vulnWindow true on its Island. Fix: overturn() keeps lockPhase 1;
   overEnd() releases it; lockT does not run while st 'over'; towerBack() first ends an Overturn (vulnWindow off,
   'overturned' cleared, y 0) as a guard. After: over 8.93 s, phase 2 at 14.00 s (y 0), 3 s later y 0, vulnWindow off.
3. ai.js:4336 echo cairns cut the Night with no damage; the respawn relights all four (major): FIXED. Reproduced: three
   cairns lit at 64% gave remembers 3, hp 0.299, phase 3; a death and respawn in the echo's Night gave remembers 4 at once,
   phase 3. Fix: echoCairns counts one lit, uncounted cairn per falter mark (55/45/35%), so the 0.299 cut is at most from
   35%; act5Enter (world.js) keeps the cairns as the fight left them while a boss fight is on, echo included (the story's
   fight was already so), so an entry or a respawn lights none. After: 64% with three lit: remembers 0, hp 0.64, the lock
   held; at 50%: remembers 1; the respawn: cairns as left, remembers 0, still the Night.
4. ai.js:4014 the 40 s floor fail-safe dies with a death (minor): FIXED. Reproduced: remembers 1 at the floor, a death, a
   respawn: no self-remember 461 game s later. Fix: the clock is the actor's (`a.floorT` in skotosPre, counted while she
   is near, alive, in play and it is at the 30% floor with fewer than 3 Remembers); at 40 s it emits 'skotosSelf';
   story.js's handler (replacing the later(40) on 'skotosFloor') does what the timer did. After: Selna remembered herself
   31.9 s after the respawn (40 s at the floor in all). The skotos scenario's first run had it fire once in its second
   Night (after the planned death), as meant.
5. ai.js:3450 the Tower owns the whole coast's tide wherever she is (minor): FIXED. Reproduced: 107 m away at the Landing,
   TIDE.force set 275 of 275 frames, the coast flooded to 0.9 on the Tower's clock. Fix: towerPre drives the water only
   while she is within the bay's arena + 24 m (heroInArena); on leaving, towerAway() releases the force (the coast's
   clock resumes at low water), brings the Tower up out of what it called, restarts its phase-1 tide at low; back at the
   bay the water is the Tower's again. After: force 0 of 274 frames, the coast's own bell rang, no Tower flood.
6. ai.js:3812 `a.drowned` list vs kill()'s drowned flag (minor): FIXED. Reproduced: the echo Tower, killed after its
   Drowned came, sank to y -5.3 and was removed at 1.73 s. Fix: the list is `a.drownedAdds` (moves, tideClock,
   callDrowned). After: not removed in 3 s, it rose from y -0.8 and dissolved like the other echoes.
7. ai.js:3830 the Island's 'towerLight' prompt outlives the Tower (minor): FIXED. Reproduced: killed on an Island, the
   prompt stayed (1 left). Fix: towerHome() drops it first thing (the echo too, before its early return); its use()
   refuses a dead Tower. After: 0 left.
8. world.js:1230 the child before the carving, and the home scene spent at q29 (major): FIXED. Reproduced: q29 after
   seaLit, the home scene played (homeSeen) and the child barked «Αλιγενείς. Το θυμάμαι.». Fix: the child is placed only
   once F.carved (want5), and enter5 plays homeScene on the first town entry after the carving (q30). Design difference
   to note: the design's "Home (q30, on the first town entry after seaLit)" now reads "after the carving" (q30 is set by
   the carving, so the label and the code agree). After: at q29 no child, no home scene; ending5 (carved, then home)
   passes with the child's question and the act closing.
9. story.js:1421 the Freeze's own entry swallows q28's announcement (minor): FIXED. Reproduced at sim 1: q28 set quietly,
   no "Νέα αποστολή" toast. Fix: G.flags.freezeQ (per-session) is set when the Freeze emits its travel and cleared when
   the loud setQuest(28) runs at the fade's end; enter5 skips its quiet q28 catch-up while it is set (a quit in those
   2.2 s still catches up on the next load). After (sim 1): one "Νέα αποστολή: Σφράγισε τις Ανάσες..." toast.
10. story.js:1808 a stale 'remember' prompt after a walk away (minor): FIXED. Reproduced: back through the portal, 1 stale
    prompt, 2 prompts at the next falter. Fix: enter5 drops every 'remember' interactable (as the naming does), then
    clears z.remember. After: 0 on return, 1 at the next falter.
11. text.js:799 orphan Act V text (minor): FIXED. d.seal.ring was never said: the sealDone scene says it as narration at
    0.3 s (Alkyone's line moved to 1.5 s, the scene 4.4 -> 4.8 s; hud.js NARR gains 'seal' so it reads unquoted, 'quest
    wind'). hud.bowl deleted (grep: no reader; hint.louse has the same text). d.alk.ragain was unreachable (Alkyone is never
    on the coast between the Freeze and the carving): she now stands at the bay's shore rock after the Freeze until farSeen
    (she is at the Icebound Ship when the hero arrives), where alkTalk's frozen branch says it; seen in the probe: «Ο πάγος
    από τον κόλπο ως τον Έσχατο. Σε κρατάει τώρα...».
12. story.js:339 dismiss5 releases the whale-oil casks (minor): FIXED, with a correction: it happens on the story kills
    only. Reproduced on the story Skotos: 4 casks within 40 m -> 0. An echo's kill never reaches dismiss5 (story.js 'kill'
    returns for echoes before towerDown/skotosDown), so the echo part of the finding is not so: the echo Skotos kept 4 of
    4 on the old tree. Fix: dismiss5 skips props (`m.prop`). After: 4 -> 4.

## Re-runs on the fixed tree (private no-HMR :5461, one browser at a time; c/fix/sc, c/fix/queue.log)

- Probes: 12 of 12 pass (new.jsonl); all 12 fail as reported on the old tree (old.jsonl), but casks on an echo (above).
- eslint no-undef over src/: clean. vite build (to c/fix/dist): exit 0, nothing logged.
- Act V scenarios, all exit 0 and pass, no page errors: hook5, catch5, coast, tide, ice, tower (Beached, Overturned 62.8,
  phase 3 at 67.6, Blinded; 85 s), freeze, holes, skotos (3 Remembers, the planned death, the Night again, 5 Breaches
  Seared, relit, Smother; clean 227.5 s, in band), ending5, cast5, echo5, cameo, diff6, cp5, shallowtele, perf5 (q1 coast
  1.02, coastLow 0.87 of the Field; absolute ms higher under another agent's browser), and again tower2 (Overturned 65.7,
  phase 3 at 71.3; 98 s), tower3 (65.9 / 80.4; 107 s), skotos2 (clean 169.5 s).
- Not re-run: the 29 shipped pre-Act V scenarios (no code path of theirs changed: the edits are in the Tower, the Skotos,
  Act V story/presence, one NARR alternative and one deleted Act V key) and the artifact build.
