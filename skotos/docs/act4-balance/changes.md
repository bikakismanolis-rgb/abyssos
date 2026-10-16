# Act IV fix: changes (base 7eded86, worktree pub/skotos; line numbers are the new file's)

## A. Bugs
- src/game/forge.js:130 - drips(): no drip within L.boss.r+5 of the Anvil or within hall.r+4 of the Hall of Moulds - the drips fell on Karthax's platform, statues, ghost pools and the brood pools (A1).
- src/game/forge.js:138 - slag() telegraph 0xff5010 -> 0xffa040 (amber) - no longer the Hammerfall's and the Rain's red (A1).
- src/game/ai.js:93 - elite affixes skip a.cling and a.airborne - no affix from a clinging Ember Tick or an Ashwing on the wing (A2).
- src/game/world.js:727 - new lampCheckpoint(z, it): sets z.checkpoint by the lamp and G.hero.flags.lastLamp - one place for the lamp checkpoint, kept in the save (A3).
- src/game/world.js:731 - lampUse lit branch: lampCheckpoint + a small ring + the 'lamp.lit' toast (memory unseen: the memory as before) - touching a lit lamp makes it the place to wake (A3).
- src/game/world.js:740 - lampUse lighting branch: the two checkpoint lines -> lampCheckpoint(z, it) (A3).
- src/game/world.js:723 - setLamp: it.used = !ash (was: used once lit with its memory seen), lit prompt 'lamp.wake' - PLAN GAP: a lit lamp was never touchable, so the plan's lit branch could not run and an old save (all lamps lit, no lastLamp) could never get its checkpoint back (A3).
- src/game/story.js:603 - endLampMemory: it.used = false, prompt 'lamp.wake' (was used = true) - same gap: the lamp stays a place to wake after its memory (A3).
- src/i18n/text.js:437 - new 'lamp.wake' ['Ξύπνα εδώ', 'Wake here'] - the prompt of a lit waylamp (A3).
- src/game/world.js:674 - act4Enter (Field): the last lamp (flags.lastLamp), if lit, is the checkpoint again - the checkpoint was lost on Continue and on the difficulty switch (A3).
- src/game/world.js:966 - new forgeCheckpoint(z): nearestFloor 6 m past the stair bridge - the Forge's place to wake by the Anvil, 22.5 m out on all 8 seeds probed (both stair sides), floor, outside heroInArena's 22 m (A3).
- src/game/world.js:995 - updateAct4 (Forge): within L.boss.r+8 of the Anvil with the plug open and the crown not unmade: flags.anvilWake = true, forgeCheckpoint (once: guarded by !z.checkpoint) - Karthax retries start at the Great Stair (A3).
- src/game/world.js:686 - act4Enter (Forge): flags.anvilWake && !crownUnmade -> forgeCheckpoint - kept over a Continue (A3).
- src/game/boot.js:159 - respawn: no checkpoint and 'ashfield@2' known -> the nearer of waypoint / waypoint2 to where she fell - waypoint 2 was never a respawn (A3).
- src/game/ai.js:801 - dashStep: hitR = min(body+0.6+hero, D.w/2 + hero/2) when D.w is given - dash hits reached wider than their drawn lines (A4).
- src/game/ai.js:1565 / 1677 / 1922 / 2103 - w: 1.4 (Smoke-eater grab), 2.4 (Ashwing dive), 2.6 (Hammerhorn rush), 2.6 (Ivar's Long Road) - the drawn widths (A4).
- src/game/ai.js:550 / 1019 / 1153 / 1284 - Amberback, Stonewarden, Silverhorn, Amaranthe's thornspear lines drawn at max(old, 2*(radius+1.05)) - Acts I-III: drawn as wide as they already hit, visual only (A4).

## B. Karthax
- src/game/data.js:102 - karthax dmg 2.7 -> 2.1 (round 1 went on to 2.0, the plan's knob 1; round 2 took it back to the plan's 2.1: with the bot's cage fix, see Tools, the Ranger's Karthax had fallen under her Act III bosses) - his blows weigh against her life what Amaranthe's did.
- src/game/ai.js:2215 - hammerfall phaseCd [9,5,8] -> [9,5,9]; cages cdOf 5-0.6*(n-3) -> 3.8-0.2*(n-3) (verify round 1 tried the plan's knob 4, 3.5 s, and took it back: the cages lasted no shorter, as she is more often out of place when the next blow comes, and the Mage took 4.0 Hammerfalls a fight against 2.5) - fewer seconds of survival in the cages, a slower last fire.
- src/game/ai.js:2220 - gaze phaseCd [9,9,8] -> [9,9,10] - a slower last fire.
- src/game/ai.js:2305-2314 - emberCombo: wind-ups [0.8,0.5,0.8] / last fire [0.7,0.45,0.7]; aim taken on blow 1 only, noFace on blows 2-3; third blow 1.4 -> 1.15, its fire 4 s x0.3 as published (round 1 had 3 s x0.2; round 2 put it back); after the third 0.9 s; chain only while she is in the 5.5 m cone (inCone) - the aim locks, a step aside ends it.
- src/game/ai.js:2319-2333 - hammerfall: wind 1.0 -> 1.4 outside the cages, circle 3.5 m outside the cages (4.5, or 6 after two misses, in them), she is hit within 4.5 caged / R0 otherwise, leap lands d-3.2, hit 1.5 -> 1.15 and burn 0.5 -> 0.4, 2 patches (was 3) of 4 s x0.3 as published (round 1 had 3 s x0.2), after 1.1 s outside the cages - walkable out of, with an opening after.
- src/game/ai.js:2233 / 2247 - threeCages: hpFloor 0.3 -> 0.2 (round 1 had 0.15), first Hammerfall 2 -> 1.2 s - damage dealt behind the cages counts; shorter cages.
- src/game/ai.js:2253 / 2263 - cageBlow: the 6 m fail-safe and the hint after two misses (was three) - shorter cages.
- src/game/ai.js:2270 - breakCage: dropGlobe at the statue - three health globes in phase 2 (none before).
- src/game/ai.js:2278 - cagesBroken: hp capped at 29.9% first, hpFloor 20% as published (round 1: min(20%, 75% of hp)) - he enters the last fire at 20-29.9%, by what she did behind the cages (at 15% the ranged classes ended the last fire in 1-2 s, before Isarn or the first Dark).
- src/game/ai.js:2401-2407 - moltenRain: 3 drops (was 5), 1.0+0.25i s, hit 1.1 -> 1.0, patches 3 s x0.2 - at most two big telegraphs at once.
- src/game/ai.js:2366-2367 - gaze: patches every 5 m (was 3.5), 3 s x0.2; hit 1.6 -> 1.15.
- src/game/ai.js:2349 - tongs hammer blow 1.8 -> 1.3.
- src/game/ai.js:2422 - theDark 2.0 -> 1.3 (burn and safe circles unchanged).
- src/game/ai.js:2435 - ashBreath 1.2 -> 1.0.
- src/game/world.js:1002 - Isarn's lantern walks 2.0 m/s (was 1.2) and stops 3 m short (was 4.2) - the 6 m light keeps up with him.
- src/game/light.js:29 / 41 - lightAt(x, z, pad = 0), lampAt(x, z, pad = 0): pools, the Cradle ring, lamps and fire areas grow by pad - a light reaching the body lights it.
- src/game/combat.js:208 and src/game/ai.js:124 - act4Hit and the Shroud's look pass a.radius*0.5 - the drawn state matches the damage rule (the Dark's test on the hero keeps pad 0).
- src/game/light.js:228 - in a boss's darkness (S.over or S.dark) the hero light keeps >= 6 m / 45% reach and 40% intensity - readable floor in the last fire, visual only.

## C. The Forge's Breath
- src/game/forge.js:20 - BREATH: inhale 2.8, pumped 6.5, perHeat 0.75, floor 6.0, hitBy [2.5,5,9,13,20%], burnBy [0.5,1,1.5,2,3%], monsterHit 0.2 (hit/hitEasy gone) - a rhythm, not a tax; scaled by difficulty (Ash keeps 20%). Round 2 applied the plan's knob 2 (inhale 2.6 -> 2.8, hitBy[0] 3 -> 2.5%, hitBy[1] 6 -> 5%, the plan's floor; the cover marks' r +0.2 left out: the marks were sized to stay 97-100% out of the fire). Comments at forge.js:2 / 4.
- src/game/forge.js:22-23 - VENT hitBy [2.5,5,6.5,8,10%], burnBy [0.5,1,1.2,1.5,2%] and di() (diff clamped 0-4) - vents by difficulty.
- src/game/forge.js:106 / 114 / 170 - burn() and vent() read hitBy/burnBy[di]; monsters take monsterHit*monsters (unchanged 5% of her life).
- src/world/gen4.js:599-616 - g.cover per gallery: alcoves (u0+0.5, 3.6, r 0.95), stokers' bays (u0+0.5, 3.6, r 1.0), pillars' lee; no new rng calls (layouts byte-identical on 6 seeds) - the cover the blue marks show.
- src/world/gen4.js:612-616 - PLAN FIX: the pillar lee is 1.2 m behind the snapped pillar on the line from the mouth, r 0.55 (plan: gcell(u-1.2, v), r 0.8) - the plan's circle was only 66-84% out of the fire (the pillar's LOS shadow is ~1 m wide and the pillar cell is snapped 0.5 m); now 100% (alcoves 100%, bays 97%) by a sampled check on 10 seeds.
- src/world/gen4.js:758 - L.flues entries carry cover: g.cover.
- src/game/forge.js:31 - startFlues keeps only cover spots with !inFlue(f, c, 0) - self-check by line of sight (all kept on the probed seeds).
- src/game/forge.js:70 / 84 - first inhale frame she is inFlue(pad 2): teleCircle 0x60c0ff on each cover spot until the fire has passed; reset in inhale() - blue cover marks for the flue she is in, only during its inhale (9 shown live; standing in one: 0 hits, in the open: 1).
- src/game/forge.js:88 - the 2 s bellowsInhale sound starts at inhale-2 s - it ends on the roar with the longer inhale (Risks).
- src/audio/audio.js:2049 - the Forge music's inhale swell 2.0 -> 2.8 s - follows BREATH.inhale (Risks).

## D. Ivar
- src/game/ai.js:2019 / 2050 - the Cradle in his dark 2.5 -> 3.5 m (comments at light.js:50, ai.js:2047) - with the body test he is lit within ~3.9 m.
- src/game/ai.js:2087-2092 - lanternSweep arc 1.1 -> 0.8 (tele, hit, snuff, particles), Seen 6 -> 4 s, the snuff skips a brazier within 3 m of her - it can be side-stepped and spares the brazier she guards.
- src/game/world.js:607 - brazier touch 1 -> 0.7 s.

## E. The Field's shields
- src/game/data.js:91-92 - ashSpear / ashDwarf guard k 0.15 -> 0.25 - the shield a little softer.
- src/game/skills.js:108 - Warden basic: area: third in the damage options - the 360-degree third swing passes the shield.
- src/game/skills.js:267 - Ranger multishot bolts: opts area: true - the volley passes the shield (heroHit's area bonus was already applied).
- src/game/combat.js:203 - a hero's blow blocked by a shield shows hud.block ("Blocked") once per 0.8 s (a.blockTxt) - teaches flanking.
- src/game/ai.js:73 - a.blockTxt counts down next to shroudTxt.
- src/game/world.js:773 - touch(): a basic attack in progress no longer refuses it (the touch replaces it) - a held basic attack blocked lamp and brazier touches.
- src/game/combat.js:136 - p.blows counts only hits >= 4% of max life - chip hits no longer break a touch (p.blows is read only by touch()).

## Tools
- tools/balance-act.mjs:37 / 124 / 587 - --heat arg, job.heat, env HEAT for forge zone runs (default stays heat 1) - plan H: the Forge in packs mode at heat 3.

- tools/balance-act.mjs:182 - (verify round 1) the bot takes the Forge's blue cover marks for safe circles no more: in a blue circle it ignored every red, monsters' too; it knows the cover through inFlue's line of sight, as before the marks.
- tools/balance-act.mjs:352-361 / 375 - (verify round 2) the Three Cages: the bot goes to 1.8 m from the statue on her side, round his body, and shoots only once it is there (goal.fightIn 1.6). Before, it stopped to shoot 4 m short of its goal, 5-6 m from the statue, out of the 4.5 m blow, so each statue waited for the two-miss fail-safe; and its goal was on his side of the statue, where it was pinned against him. That stretched the cages to 25-49 s (ideal: 15.4 s, cagetime) and about doubled the ranged classes' Karthax in sim.json too (published code, fixed bot, n=8: Warden / Ranger / Mage W 0.71 / 1.82 / 2.83 -> 0.64 / 0.80 / 1.47 lives).
- tools/balance-act.mjs:479 / 582 - (verify round 2) byPhase: a boss run's lives by the boss's phase.
- tools/balance-act.mjs:316-317 / 339 - (release round) between packs, in its 8 s pause (the walk to the next pack), the bot still steps out of the red, the Breath's included, and does nothing else (st.why 'idle'); before, it stood still there, and up to half of the Forge's damage landed in those pauses (counted as damage, not as fight time). Act III's zones are measured with the same bot (sim/r3).

## Notes
- Release round (README.md): every shipped scenario run (scen-v3), the zones re-measured with the bot's pause fix (sim/r3: 132 runs after, 48 on the published code), `npm run build:artifact` and the strict-CSP check (csp-v3); forge.js:5 comment only (what the monsters take). patch.diff regenerated (git apply -R --check on the tree; git apply --check, and the applied tree identical to the worktree, on a clean 7eded86); round 2's copy is patch.r2.diff, changes.r2.md.
- Verify round 1 (verify-1.md): 220 bot runs and 11 scenarios on this tree. patch.diff regenerated after the round-1 changes (git apply -R --check passes on the tree).
- Verify round 2 (verify-2.md): 292 bot runs on the final tree (plus 48 on the published code with the fixed bot) and 12 scenario runs, all passing. Round 2 changed data.js:102, ai.js:2233 / 2278 / 2312 / 2331 (comment 2276), forge.js:2 / 4 / 20-21, audio.js:2049 and tools/balance-act.mjs (above). patch.diff regenerated (git apply -R --check passes on the tree; git apply --check passes on a clean 7eded86 skotos/src); `npx vite build` passes. Round 1's files: changes.r1.md, patch.r1.diff.
- patch.diff: `git diff` of the worktree (paths a/skotos/...) plus tools/balance-act.mjs as a new file, written with the same skotos/ prefix so the whole patch applies with `git apply` (-p1) at the repository root.
- Verified: `npx vite build` passes; scenarios ivar, forge, karthax, ashfield run with no page errors; live probe (balance/probe/mech.mjs, lvl 35): lamp touch -> wake 1.6 m from l5 after a Continue; camp2 wake 2 m; stair wake 22.5 m after a Continue; guard 25% front / 100% area + Blocked; drips 0 on the Anvil, 3 per 40 s on a river bridge; heat 1/2/3 periods 9.25/8.5/7.75 s.
- Bot check (balance-act.mjs, plan-full 'normal' jobs, same ids/seeds; old sim/full.jsonl -> new sim/after-norm.jsonl, 78 jobs, 0 fails, 0 page errors):
  - Karthax W d1 (n6) lives Warden/Ranger/Mage 0.71/1.82/2.83 -> 0.26/0.84/0.65 (targets 1.3/0.85/0.70); max hit 10.6/19.4/20.7% -> 3.9/12.0/12.1% (<= 13); min life 69/63/60% -> 96/87/85%; kill s 48/36/49 -> 54/44/41.
  - Karthax Wa d0 (n2) 0.15/1.52/0.69 -> 0.09/0.21/0.63.
  - Ivar d1 (n6) 0.48/0.26/0.41 -> 0.25/0.16/0.59; the Mage's mean is one 110 s outlier (2.16 lives; the other five 0.27, the old median 0.34); Ivar Mage d0 (n6) 0.41 -> 0.10.
  - Forge packs heat 1 (n2) life/min W d1 1.00/1.74/2.81 -> 0.66/1.83/1.07, Breath max hit 20% -> <=11%; Wa d0 0.38/1.14/0.91 -> 0.00/0.52/0.65.
  - Field packs (n2): within noise (molten elite bursts dominate the Mage's samples).
- Not done: the Risks' optional 2 s respawn safety at the stair (not seen in the probes); Act V on /home/user/abyssos must port BREATH.hitBy/monsterHit, dashStep's D.w and lightAt's pad if it reuses them.
