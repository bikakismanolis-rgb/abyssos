# Skotos Act IV: the fix plan (single plan)

Base: the published build, commit 7eded86 (worktree `pub/skotos`). Line numbers are from that commit.
Inputs: `balance/diagnosis.md`, `sim.md` / `sim.json` (724 bot runs), `formulas.md`, `mechanics.md`, and a reading of the code for every change below.
No code has been changed yet. This file is the list of changes for the implementation step.

## The idea in five lines

1. **Karthax becomes readable and fair, not just weaker.**
   - The Hammerfall can be walked out of.
   - The Ember Combo locks its aim, so a step aside ends it.
   - Damage dealt during the Three Cages now counts.
   - The cages need fewer seconds of pure survival.
   - Then his damage is set so that his blows weigh against the hero's life what Amaranthe's did (dmg 2.7 → 2.1).
2. **The Forge's Breath stays a rhythm you read, not a tax you pay.**
   - Blue safe marks show the cover during each inhale.
   - The inhale is longer for a phone thumb.
   - The heat ramp is gentler.
   - The hit is scaled by difficulty (Warden 20% → 6%).
   - Karthax retries start at the Great Stair, not 160 m back through the hottest gallery.
3. **Ivar's Dark:**
   - a 3.5 m Cradle ring;
   - a narrower Lantern Sweep, which spares the brazier she stands by;
   - shorter Seen.
4. **The Field's shields:**
   - the area blows the player expects to pass now pass;
   - a "Blocked" number teaches flanking;
   - the shield is a little softer.
5. **Every listed bug is fixed:** drips, affixes on untouchable foes, the lost checkpoint, dash hits wider than drawn.

Acts I-III gameplay is untouched. The only change there is that three charge telegraphs are drawn wider, to the width that already hits. Saves keep working: there is no new save shape, only two new optional hero flags.

---

## A. Bugs (all from the diagnosis)

### A1. Slag drips fall on Karthax's platform, statues, ghost pools and in the Hall of Moulds
- **`src/game/forge.js`, `drips(dt, pl)` (l.109-122).** After `if (!near) return;`, add the rule "no drips at the Anvil or in the Hall of Moulds":
  ```js
  const S = L.spots || {}, B = L.boss;
  if (B && Math.hypot(pl.x - B.x, pl.z - B.z) < B.r + 5) return;           // the Anvil, its moat, the Forge Mouth
  if (S.hall && Math.hypot(pl.x - S.hall.x, pl.z - S.hall.z) < S.hall.r + 4) return; // the Hall of Moulds and its brood pools
  ```
  `L.boss` is `{x, z, r: AN.r}` (gen4.js:791). `sp.hall` is `{x, z, r: HM.hw}` (gen4.js:829).
- **`forge.js`, `slag()` (l.123).** Telegraph colour `0xff5010` → `0xffa040` (amber). That is no longer the Hammerfall's and the Rain's red.
- **Touches:** the Forge only. The Molten King's hall has no drips.
- **Expected:** drips stay only over the Slag Rivers. They fall 0 times a minute at the statues and pools (8 a minute now).

### A2. Elite affixes fire from a clinging Ember Tick or an airborne Ashwing
- **`src/game/ai.js`, `updateActors`, l.90.**
  ```js
  if (a.affixes.length && !(a.under && a.def.burst) && !a.hidden && !(a.def.ai === 'rooted' && !a.awake)) elite(a, dt, pl, d);
  ```
  becomes
  ```js
  if (a.affixes.length && !(a.under && a.def.burst) && !a.hidden && !a.cling && !a.airborne && !(a.def.ai === 'rooted' && !a.awake)) elite(a, dt, pl, d);
  ```
- **Touches:** `cling` and `airborne` are set only on Ember Ticks and Ashwings (combat.js:237, ai.js:1653). Acts I-III, the Shadow Gates (Act I-II roster, data.js:115) and the other classes are unaffected. Affix timers simply pause while the creature cannot be struck.

### A3. The waylamp checkpoint is lost on Continue, and waypoint 2 is never a respawn (and the Forge has none)
- **`src/game/world.js`.** Add a helper next to `lampUse` (l.721):
  ```js
  function lampCheckpoint(z, it) { const r = it.spot.r || 0; z.checkpoint = z.map.nearestFloor(it.x + Math.sin(r) * 1.6, it.z + Math.cos(r) * 1.6, 3); G.hero.flags.lastLamp = it.id; }
  ```
- **`lampUse`, lit branch (l.723).**
  - Old: `if (it.lit) { if (it.memory && !F['mem_' + it.id]) emit('lamp', it, z); return; }`
  - New: `if (it.lit) { lampCheckpoint(z, it); ring(it.x, it.z, 1.6, LAMP_C, 0.5); if (it.memory && !F['mem_' + it.id]) emit('lamp', it, z); return; }`
  - Touching a lit lamp now makes it the place to wake.
- **`lampUse`, lighting branch (l.729-730).** Replace the two `checkpoint` lines with `lampCheckpoint(z, it);`.
- **`act4Enter`, Field branch (after `setLastLamp`, l.672).** Add:
  ```js
  const ll = F.lastLamp && A.lamps.find((l) => l.id === F.lastLamp); if (ll?.lit) lampCheckpoint(z, ll);
  ```
- **The Forge's checkpoint at the Great Stair.**
  - **world.js zone update** (next to the `karthaxArrive` check, l.977): when `z.id === 'forge' && F.plug && !F.crownUnmade` and the hero is within `L.boss.r + 8` of `L.boss`, set `F.anvilWake = true` and call `forgeCheckpoint(z)`, where
    ```js
    function forgeCheckpoint(z) { const b = z.L.bridges.find((q) => q.stair), s = Math.sign(b.x - z.L.boss.x) || 1; z.checkpoint = z.map.nearestFloor(b.x + s * 6, b.z, 4); }
    ```
    That is about 23 m from the Anvil's centre, outside `heroInArena`'s 22 m, on the stair beyond the last bridge (gen4.js:676).
  - **`act4Enter`, Forge branch:** add `if (F.anvilWake && !F.crownUnmade) forgeCheckpoint(z);`.
  - The implementer must check that the point is floor and on the stair side for 6 seeds (the same as `drips.mjs`).
- **`src/game/boot.js`, `respawn` (l.156).**
  - Old: `else travel(G.zone.id, { at: G.zone.checkpoint || (G.zone.L.spots.waypoint ? 'waypoint' : 'start') });`
  - New:
    ```js
    else {
      const z = G.zone, S = z.L.spots; let at = z.checkpoint;
      // no lamp: the nearer of the zone's two waypoints, if the second is known (the Field's Elati camp)
      if (!at && S.camp2 && G.hero.wps.includes(z.id + '@2')) { const d1 = S.waypoint ? Math.hypot(pl.x - S.waypoint.x, pl.z - S.waypoint.z) : 1e9, d2 = Math.hypot(pl.x - S.camp2.x, pl.z - S.camp2.z); at = d2 < d1 ? 'waypoint2' : 'waypoint'; }
      travel(z.id, { at: at || (S.waypoint ? 'waypoint' : 'start') });
    }
    ```
    `pl` is still where she fell. `travel` accepts `'waypoint2'` (world.js:216).
- **Saves:** two new optional flags, `lastLamp` and `anvilWake`. An old save simply has neither until the first touch of a lit lamp or the first visit to the Anvil. The save key and save shape are unchanged. The difficulty switch, which deletes the zones, now keeps the checkpoint, because it is rebuilt from the flags.
- **Acts I-III:** no `camp2`, no lamps, so no change.
- **Expected:**
  - A death at Ivar after a Continue wakes her at lamp 5, 11-14 m away, instead of 139-144 m.
  - A death at Karthax wakes her on the stair, about 23 m away, instead of 158-162 m through the north gallery at heat 3.

### A4. Dash hits reach wider than their drawn telegraphs
- **`ai.js`, `dashStep` (l.797).**
  - Old: `if (!D.hit && Math.hypot(pl.x - a.x, pl.z - a.z) < a.radius + pl.radius + 0.6)`
  - New: `const hitR = D.w != null ? Math.min(a.radius + pl.radius + 0.6, D.w / 2 + pl.radius * 0.5) : a.radius + pl.radius + 0.6; if (!D.hit && Math.hypot(pl.x - a.x, pl.z - a.z) < hitR)`
- **Act IV dashes: pass the drawn width, `w`, so the hit shrinks to what is drawn.**
  - Smoke-eater grab, l.1560: `w: 1.4` (drawn at l.1591).
  - Ashwing dive, l.1672: `w: 2.4` (l.1718).
  - Hammerhorn rush, l.1917: `w: 2.6` (l.1929).
  - Ivar's Long Road, l.2097: `w: 2.6` (l.2093).
- **Acts I-III dashes: draw the line at the width that already hits.** This is visual only, with no balance change.
  - Amberback, l.547: `2.4` → `Math.max(2.4, 2 * (a.radius + 1.05))`.
  - Stonewarden, l.1014: `3.2` → `Math.max(3.2, 2 * (a.radius + 1.05))`.
  - Silverhorn, l.1148: `3` → `Math.max(3, 2 * (a.radius + 1.05))`.
  - l.1279: `2 * (a.radius + 0.6)` → `2 * (a.radius + 1.05)`.
- **Expected:**
  - Ashwing dive: hit half-width ~2.0 m → 1.4 m (line 1.2 m plus half the body).
  - Hammerhorn: 2.2 → 1.5 m.
  - Smoke-eater: 1.6 → 0.9 m.
  - Long Road: 1.8 → 1.5 m.
  - Act I-III telegraphs grow to their real reach.

---

## B. Karthax (the cliff: 44-70% of the excess)

**`src/game/data.js:102`, `karthax`.**
- `dmg: 2.7` → `dmg: 2.1`.
- `hp: 95` stays. The fight is shortened by structure, not by life.
- Why 2.1: at L40 against Amaranthe at L32.5, monsterDmg is ×1.38 and the hero's life ×1.15-1.30. So 2.1 makes a 1.0× blow weigh against her life what Amaranthe's did (×0.95-1.0).

**`src/game/ai.js`, `KARTHAX.moves` (l.2205-2215).**
- **hammerfall.**
  - `phaseCd: [9, 5, 8]` → `[9, 5, 9]` (last fire 6.4 s → 7.2 s).
  - `cdOf: … 5 - 0.6 * (a.cageBlows - 3) …` → `3.8 - 0.2 * (a.cageBlows - 3)`.
  - Cages: 3 blows every 3.8 s (was 5), 6 blows every 3.2 s (as now).
- **gaze.** `phaseCd: [9, 9, 8]` → `[9, 9, 10]` (last fire 6.4 → 8 s).
- **combo.** Unchanged entry; see `emberCombo`.

**`emberCombo(a, pl)` (l.2296-2306): the aim locks, a step aside ends it.**
- Wind-ups: `[0.6, 0.5, 0.8]` → `[0.8, 0.5, 0.8]`; last fire `[0.5, 0.45, 0.7]` → `[0.7, 0.45, 0.7]`.
- Aim:
  - `a.rot = angleTo(...)` only when `step === 0`; blows 2 and 3 strike along the same line.
  - The returned move gets `noFace: step > 0`, so he does not turn during blows 2 and 3.
- Third blow: `1.4` → `1.15`, burn `a.dmg * 0.4` unchanged. Its fire patch: `area('fire', x, z, 1.5, 4, { dmg: a.dmg * 0.3 })` → `area('fire', x, z, 1.5, 3, { dmg: a.dmg * 0.2 })`.
- Recovery: `after: 0.25` → `after: step === 2 ? 0.9 : 0.25` (the hammer cools; an opening).
- Chain:
  - Old: `chain: step < 2 && Math.hypot(pl.x - a.x, pl.z - a.z) < 6.5`
  - New: `chain: step < 2 && inCone(a.x, a.z, a.rot, 5.5, 1.0, G.player)`
  - `inCone` is at ai.js:1473.
- **Effect:** a cycle of 3 blows takes 4.0 s instead of 3.15 s (×0.79). A ranged hero who steps out of the cone takes 1 blow, not 3.

**`hammerfall(a, pl)` (l.2309-2323): walkable out of, phases 1 and 3.**
- Wind-up: `wind = caged ? 1.6 : 1.0` → `caged ? 1.6 : 1.4`. After a 0.45 s reaction she has 0.95 s × 5.4-5.8 m/s = 5.1-5.5 m, more than the 3.7 m she needs.
- Radius:
  - `R0 = caged && a.misses >= 3 ? 6 : 4.5` → `R0 = caged ? (a.misses >= 2 ? 6 : 4.5) : 3.5`.
  - The hero test `< 4.5 + p.radius * 0.5` → `< (caged ? 4.5 : R0) + p.radius * 0.5`.
- Leap landing: `k = d - 2.6` → `k = d - 3.2`.
- Hit: `hitHero(a, p, 1.5, { stun: 0.4, burn: a.dmg * 0.5 })` → `hitHero(a, p, 1.15, { stun: 0.4, burn: a.dmg * 0.4 })`.
- Patches: `for (let i = 0; i < 3; …)` → `i < 2`. `area('fire', x, z, 1.3, 4, { dmg: a.dmg * 0.3 })` → `area('fire', x, z, 1.3, 3, { dmg: a.dmg * 0.2 })`.
- Recovery: `after: 0.7` → `after: caged ? 0.7 : 1.1` (he wrenches the hammer free: an opening, and time for a ranged hero to open the distance).

**Phase 2, the Three Cages: shorter, and the damage dealt counts.**
- **`threeCages(a)` (l.2227).**
  - `a.hpFloor = a.hpMax * 0.3` → `a.hpMax * 0.15`. The ward ×0.5 and Unfading (1%/s up to 65%) stay, so breaking the Lady first now matters.
  - `a.mcd.hammerfall = 2` → `1.2`.
- **`cageBlow(a, x, z)` (l.2246-2259).** Fail-safe after two misses, not three:
  - `R0 = a.misses >= 3 ? 6 : 4.5` → `a.misses >= 2 ? 6 : 4.5`.
  - `else if (++a.misses === 3)` → `=== 2`.
- **`breakCage(a, s)` (l.2260).** Add `dropGlobe(s.x, s.z);`, imported from `./pickups.js`; combat.js uses it the same way. That gives three globes in phase 2, where today he gives none.
- **`cagesBroken(a)` (l.2269-2274).**
  - Old: `a.hpFloor = a.hpMax * 0.2; a.hp = Math.min(a.hp, a.hpMax * 0.299);`
  - New: `a.hp = Math.min(a.hp, a.hpMax * 0.299); a.hpFloor = Math.min(a.hpMax * 0.2, a.hp * 0.75);`
  - He enters the last fire at 15-29.9%, depending on what she did to him behind the cages.
- **`moltenRain(a, pl)` (l.2389-2399).**
  - Drops 5 → 3. Delays `1.1 + i * 0.25` → `1.0 + i * 0.25` (all landed by 1.5 s, before the next Hammerfall's circle can overlap them for long).
  - Hit `1.1` → `1.0`.
  - Patch `area('fire', x, z, 1.4, 4, { dmg: a.dmg * 0.3 })` → `area('fire', x, z, 1.4, 3, { dmg: a.dmg * 0.2 })`.
  - This keeps "at most two big telegraphs at once" (act4-design Risks).

**Phase 3, the Last Fire.**
- **`gaze(a, pl)` (l.2342-2358).**
  - Patches: `for (let d = 3; d < 20; d += 3.5)` → `d += 5`. `area('fire', x, z, 1.2, 4, { dmg: a.dmg * 0.3 })` → `area('fire', x, z, 1.2, 3, { dmg: a.dmg * 0.2 })`.
  - Hit `1.6` → `1.15`.
- **`tongs`:** hit `1.8` → `1.3`.
- **`theDark`:** `2.0` → `1.3`. The burn and the safe circles are unchanged.
- **`ashBreath`:** `1.2` → `1.0`.
- **Isarn's lantern** (world.js:984-987, the walk in the zone update):
  - Speed: `Math.min(1.2 * dt, d - 4.2)` → `Math.min(2.0 * dt, d - 3.0)`.
  - Stop: `d > 4.3` → `d > 3.1`.
  - The 6 m light keeps up with him, so the pulled fight is lit more often.
- **The Shroud tests the body, not its centre.**
  - `src/game/light.js`, `lightAt(x, z)` → `lightAt(x, z, pad = 0)`: pools `< (p.r + pad) ** 2`, hero ring `< (hr + pad) ** 2`, `lampAt(x, z, pad)` with `(it.lightR + pad) ** 2`, fire areas `(a.r + 1.5 + pad) ** 2`.
  - Pass `a.radius * 0.5` from `combat.js:206` (`act4Hit`) and from `ai.js:121` (the Shroud tint), so the drawn state matches the damage rule.
  - The Dark's test on the hero (ai.js:2412) keeps `pad = 0`.
  - Effect: Karthax (radius 1.95) is lit once a pool reaches his body, about 1 m sooner. This is Act IV only; `lightOn()` is false elsewhere.
- **Readable light (visual only).** `light.js:226-228`:
  ```js
  const dim = S.over != null || !!S.dark;
  R.heroLight.distance = Math.max(dim ? 6 : 2, S.range0 * Math.max(dim ? 0.45 : 0.3, kk));
  R.heroLight.intensity *= Math.max(dim ? 0.4 : 0.12, Math.min(1.25, kk));
  ```
  - In the last fire: reach 30% → 45%, intensity 12% → 40%.
  - The mechanical rule ("only the pools give light") is unchanged; no ring is drawn, so the floor never lies about safety.

**Kept:**
- the three phases at 65% and 30%;
- the cages and their gifts (whole = 2 blows, cracked = 1);
- Unfading;
- only his Hammerfall breaks a statue;
- the Last Fire, the Dark every 15 s, Isarn and the ghosts;
- hp 95, the level rule max(zone+3, hero+1), and the echo.

---

## C. The Forge's Breath (11-31% of the excess, nearly all of the Forge's own)

**`src/game/forge.js:19`, `BREATH`.**
- Old:
  ```js
  { inhale: 2.0, fire: 1.2, base: 10, pumped: 5, perHeat: 1.5, floor: 4.5, reach: 40, hit: 0.2, hitEasy: 0.12, monsters: 0.25 }
  ```
- New:
  ```js
  { inhale: 2.6, fire: 1.2, base: 10, pumped: 6.5, perHeat: 0.75, floor: 6.0, reach: 40,
    hitBy: [0.03, 0.06, 0.09, 0.13, 0.20], burnBy: [0.005, 0.01, 0.015, 0.02, 0.03], monsterHit: 0.2, monsters: 0.25 }
  ```
  `hitBy` and `burnBy` are indexed by `G.hero.diff`. Ash, the top difficulty, keeps today's 20% and 3%.
- Periods:

  | heat | unpumped now | unpumped new | pumped now | pumped new |
  |---|---|---|---|---|
  | 1 | 8.5 s | 9.25 s | 4.5 s | 6.0 s |
  | 3 | 5.5 s | 7.75 s | 4.5 s | 6.0 s |

  Each period still holds a 2.6 s inhale and 1.2 s of fire.

**`burn(f, front)` (l.92-99).**
- Old: `const k = G.hero.diff === 0 ? BREATH.hitEasy : BREATH.hit, v = pl.hpMax * k; damage(null, pl, v, { pure: true, burn: pl.hpMax * 0.03, … })`
- New: `const di = Math.min(G.hero.diff, 4), v = pl.hpMax * BREATH.hitBy[di]; damage(null, pl, v, { pure: true, burn: pl.hpMax * BREATH.burnBy[di], … })`
- The monsters' line `BREATH.hit * BREATH.monsters` → `BREATH.monsterHit * BREATH.monsters`, so the monsters take what they take today.

**Blue cover marks during the inhale (the readability fix that the bot also obeys).**
- **`src/world/gen4.js`, the gallery loop (l.593-610).** Push cover spots onto the gallery's flue. There are no new rng calls, so the layouts are unchanged.
  - For each alcove (`gbox(g, u0 - 0.5, u0 + 1.5, sv * 2.5, sv * 4.5, 2)`): `{ ...gcell(g, u0 + 0.5, sv * 3.6), r: 0.95 }`.
  - For each stoker's bay: `{ ...gcell(g, u0 + 0.5, sv * 3.6), r: 1.0 }`.
  - For each pillar: its lee, `{ ...gcell(g, u - 1.2, v), r: 0.8 }`.
  - Store them as `g.cover`, and copy them to the flue at l.751: `L.flues.push({ …, cover: g.cover })`.
- **forge.js `startFlues`.** Keep only the cover spots for which `!inFlue(f, c.x, c.z, 0)`, a self-check by line of sight.
- **forge.js `tickFlues`, inhale branch.**
  - On the first frame in which the hero is `inFlue(f, pl.x, pl.z, 2)` during this inhale, set `f.coverShown = true` and draw `teleCircle(c.x, c.z, c.r, f.t + BREATH.fire, 0x60c0ff)` for each cover spot.
  - Clear `f.coverShown` in `inhale(f)`.
  - `0x60c0ff` is the game's blue safe colour (the Stonewarden, Ivar's nova, the Dark) and the bot's `SAFE` (balance-act.mjs:48).

**Vents (l.150-158).**
- The hit `pl.hpMax * (G.hero.diff === 0 ? 0.07 : 0.1)` → `pl.hpMax * [0.025, 0.05, 0.065, 0.08, 0.10][di]`.
- Burn `0.02` → `[0.005, 0.01, 0.012, 0.015, 0.02][di]`.

**Kept:**
- the flues, the inhale-and-roar cycle and its music;
- cover by line of sight;
- Hammerhorn pumping (now 6.5 s);
- the heat that grows with each bellows;
- the Breath hurting non-fireproof monsters for 25%.

The Karthax retry no longer walks the north gallery (A3).

---

## D. Ivar's Dark (9-23% of the excess; the Mage on Wanderer)

- **ai.js:2014 (`IVAR.tick`)** `setHeroLight(heroNear(a) ? 2.5 : null, a)` → `3.5`. **ai.js:2045 (`ivarDark`)** `setHeroLight(2.5, a)` → `3.5`. Also the comments at light.js:48 and ai.js:2041.
  - With the body test (B), Ivar is lit within 3.9 m. He keeps 3.5-4.6 m, so a hero who stands her ground hits him in full.
  - One who kites still needs the braziers, as designed.
- **`lanternSweep` (l.2077-2087).**
  - Cone arc `1.1` → `0.8` in `teleCone`, in the hit `inCone(…, 10, 0.8, p)` and in the snuff `inCone(…, 10.5, 0.8, b)`. It can now be side-stepped: at 3.5 m it is 2.5 m to each side, against 0.55 s × 5.4 m/s = 3.0 m.
  - Seen `6` → `4`.
  - The snuff skips the brazier she shields: add `&& Math.hypot(b.x - G.player.x, b.z - G.player.z) > 3`.
- **world.js:607, brazier touch.** `touch(1, …)` → `touch(0.7, …)`.

---

## E. The Field of Ash shields (1-24% of the excess; the Ranger)

- **`data.js:91-92`.** `ashSpear` and `ashDwarf`: `guard: { arc: 1.05, k: 0.15 }` → `k: 0.25`.
- **`skills.js`, `basicWarden` (l.108, the `arcHit` damage call).** The damage options `{ knock: third ? 7 : 2.5, kx, kz }` → `{ knock: third ? 7 : 2.5, kx, kz, area: third }`. The 360° third swing now passes the shield, as the player expects.
- **`skills.js`, `multi` (l.267).** `opts: { knock: 1.5 }` → `opts: { knock: 1.5, area: true }`.
  - The multishot passes the shield.
  - `o.area` in `damage()` is read only by the guard (combat.js:192). The area bonus comes from `heroHit`'s own option, which is already set.
- **`combat.js`, `act4Hit`, guard branch (l.196).** When a hero's blow is blocked, show the existing `hud.block` text ("Απόκρουση" / "Blocked"):
  ```js
  if (fromHero && !(a.blockTxt > 0)) { a.blockTxt = 0.8; number(a.x, 2.6, a.z, t('hud.block'), 'text', '#c8d0e0'); }
  ```
  Count `a.blockTxt` down next to `shroudTxt` (ai.js:71).
- **Touches.** `world.js`, `touch()` (l.763): `if (!pl || pl.dead || pl.act) return;` → `if (!pl || pl.dead || (pl.act && pl.act.name !== 'basic')) return;`. A held basic attack no longer blocks a lamp or brazier touch; the touch replaces it.
- **The blow counter.** `combat.js:136` `p.blows = (p.blows || 0) + 1;` → `if (amount >= p.hpMax * 0.04) p.blows = (p.blows || 0) + 1;`. Chip hits no longer break a touch. `p.blows` is read only by `touch()`.

---

## F. Not changed, on purpose

- Acts I-III gameplay, DIFFS, monsterHP/monsterDmg, xp, the level rule (actors.js:137, world.js:258), items, skills (other than the two `area` flags), the classes, the Shadow Gates (Act I-II roster), the molten death burst (every act, noise).
- Act III being the trough: raising Silverhorn would shrink the IV/III ratio, but it makes an act harder that the owner did not complain about. Left for the owner to decide (see Risks).

---

## G. Expected numbers afterwards

These are estimates from the sim's per-source breakdown (sim.json): each source scaled by its change. Karthax W, Mage: combo 1.08 → 0.22, Hammerfall 0.85 → 0.28, patches 0.70 → 0.17, other 0.20 → 0.12. Verify them with the runs in H.

**Karthax, Warden difficulty (W)**

| metric | Warden | Ranger | Mage | target |
|---|---|---|---|---|
| lives per fight | 0.71 → ~0.30 | 1.82 → ~0.55 | 2.83 → ~0.75 | ≤ 1.3 / 0.85 / 0.70 |
| life/min | 0.91 → ~0.45 | 3.14 → ~1.1 | 3.36 → ~1.3 | ≤ 1.0 / 1.5 / 1.5 |
| max hit (% life) | 10.6 → ~6 | 19.4 → ~11.6 | 20.7 → ~12.4 | ≤ 13 |
| mean min life (worst) | 69% (41) → ~85% (≥60) | 63% (37) → ~85% (≥55) | 60% (25) → ~80% (≥45) | ≥ 70% (≥ 35) |
| kill time (s) | 48 → ~40 | 36 → ~30 | 49 → ~37 | IV/III ≤ 1.4 |

**Karthax, Wanderer (Wa)**
- Lives: 0.16 / 1.09 / 0.86 → ~0.06 / ~0.33 / ~0.27 (target ≤ 0.45).
- Max hit: 3.4 / 9.7 / 11.1% → ~2 / ~5.8 / ~6.6% (target ≤ 7.5).
- Kill time: Ranger 51 → ~38 s (≤ 43), Mage 42 → ~32 s (≤ 37). The cages take ~4 s less, the damage dealt behind them shortens the last fire by ~5 s, and Isarn's lantern keeps up.

**Karthax, the weaker player (W)**
- Lives: 1.32 / 6.44 / 5.28 → ~0.5 / ~1.9 / ~1.6 (target ≤ 2.5).
- Deaths: Mage 0.5 → ~0 (≤ 0.5, and ≤ her Molten King's 0). The three globes help here most.

**Ivar**
- W: 0.48 / 0.26 / 0.41 → ~0.38 / ~0.21 / ~0.30.
- Wa: Mage 0.41 → ~0.27 (target ≤ 0.25: at the edge).
- He stays ≤ 1.5× Amaranthe.

**The Forge, packs mode, heat 1 (W)**
- Breath hits: ×0.5 in number (blue cover, a 2.6 s inhale, longer periods), ×0.30 in size (7% against 23%).
- Breath share: 50 / 77 / 80% → ~12 / ~33 / ~35% (target ≤ 35).
- Life a pack: Ranger 0.074 → ~0.027 (≤ 0.057), Mage 0.072 → ~0.023 (≤ 0.025).
- Life/min: Warden 1.14 → ~0.75 (≤ 1.3), Ranger 2.17 → ~0.75 (≤ 1.2), Mage 2.69 → **~0.85 (target ≤ 0.7, at risk:** her monsters alone are 0.54 a minute, so the Breath may add only 0.16).

**The Forge, Wanderer**
- Breath share: 54 / 82 / 75% → ~15 / ~35 / ~30%. That is at or under its W share; the per-hit cut is ×0.5 of W, against the monsters' ×0.55.
- Life/min: Warden 0.27 → ~0.15, Ranger 1.18 → ~0.30, Mage 1.22 → ~0.40.

**The Forge, heat 3**
- About ×1.2 the breaths of heat 1, against ×1.55 today.
- Share ~+4-5 points: Ranger ~37%, Mage ~40%, just over 35.

**The Field**
- Walked Ranger W: +0.72 → ~+0.4 lives over the Weeping Woods.
- Warden class Wa: +0.33-0.47 → ~+0.25.
- Packs mode unchanged, flat against Act III.

**Act over act, IV/III**

| metric | W now → expected | Wa now → expected | target |
|---|---|---|---|
| boss lives, all classes | 3.66 → ~1.4 | 5.16 → ~2.1 | ≤ 2.0 |
| boss lives: Warden / Ranger / Mage | 1.37 / 3.92 / 8.53 → ~0.7 / ~1.4 / ~2.8 | → ~1.0 / ~2.4 / ~2.3 | ≤ 2.0 (see Risks) |
| boss kill time | 1.18 → ~1.0 | 1.88 → ~1.4 | ≤ 1.4 |
| packs life a pack | 0.98 → ~0.85 | 1.83 → ~1.3 | ≤ 1.8 |
| packs s a pack | 0.70 → ~0.70 | 0.83 → ~0.8 | 0.8-1.3 |
| walked life/min | 1.66 → ~1.2 | 2.88 → ~1.8 | ≤ 1.8 W / 2.5 Wa |
| Act IV boss mean lives (W) | 1.08 → ~0.42 | – | ≤ 0.60 |
| deaths, normal player | 0 → 0 | 0 → 0 | 0 |

**Tuning knobs, in this order, if a target is missed**
1. Karthax Mage over 0.70: `dmg 2.1 → 2.0`, then the combo's recovery `0.9 → 1.2`.
2. Breath share over 35% or Mage Forge life/min over 0.7: cover marks `r +0.2` and inhale `2.6 → 2.8`, then `hitBy[1] 0.06 → 0.05` (Wa `0.03 → 0.025`). Never cut it more than that.
3. Ivar Mage Wa over 0.25: sweep Seen `4 → 3`.
4. Karthax Wa kill time over target: cage period `3.8 → 3.5`.

---

## H. Verification (fast)

Acts I-III gameplay does not change, so their results in `sim/full.jsonl`, `walk.jsonl` and `weak.jsonl` stay valid. Re-run only the Act IV jobs, with the same tool and seeds:
- **plan-full, Act IV subset:** 192 jobs (54 of them Karthax).
- **plan-walk, Act IV:** 48 jobs.
- **plan-weak, Act IV:** 48 jobs. Complete the 32 jobs the partial pass did not run.
- **The Forge in packs mode at heat 3:** `balance-act.mjs:103` sets heat 1; add a `HEAT` environment variable or a `job.heat` field. That is 24 jobs: 3 classes × 2 difficulties × 4.
- **Spot checks:** 2 runs each of the Molten King and Amaranthe for one class. They confirm that Acts I-III are bit-identical in behaviour; only the three wider charge lines differ.

That is about 310 jobs, roughly 40-60 minutes with one browser, against about 3 hours for the full 724. Then run `node sim/summarise.mjs` with the old Act I-III lines and the new Act IV lines. Then:
- check each target in G;
- check the drips, the checkpoint and the dash widths live (`mechprobe.mjs`, `diveprobe.mjs`, `walkback2.mjs`);
- check a phone-sized portrait viewport for the blue cover marks and the last fire's light.

## I. Risks

- **The diagnosis's targets cannot all be met at once.**
  - The per-class IV/III boss ratio ≤ 2.0 asks for Karthax-Mage ≤ 0.47 on W, below the diagnosis's own absolute target of 0.70.
  - On Wanderer it asks for Karthax ≤ 0.2-0.26, because Act III's Wanderer bosses cost about 0.1 lives.
  - This plan aims for the absolute targets. Per-class ratios for the Mage (~2.8 W) and for Wanderer (~2.3) will stay over 2.0 unless Act III's bosses (Silverhorn) are made harder, which is the owner's call.
- **Two targets are at the edge:** the Mage's Forge life/min (~0.85 against 0.7) and the Forge's Breath share at heat 3 (~37-40% against 35). Meeting them fully needs the Breath at about 5%, which would empty it of meaning. Knob 2 is the limit this plan accepts.
- **The Breath gets much weaker on the default difficulty** (20% → 6% + 1% burn). Its identity rests on the rhythm, the cover and the heat, not on the size of the hit. Players who liked the threat may find the Forge tamer. The two top difficulties keep more of it (Nightmare 13%, Ash 20%).
- **Damage dealt behind the cages now counts.** A strong hero can push Karthax to 15% before the last fire, which shortens his best phase. The 15% floor keeps at least the Dark, Isarn and the beacon line.
- **The Hammerfall's radius:** 3.5 m in phases 1 and 3 against 4.5 m in phase 2 (statues) could confuse. Both are drawn exactly; the phase-2 circle is the same as today.
- **Combo aim lock** changes the feel for melee: a Warden who circles him dodges blows 2 and 3. The Warden's Karthax becomes easier than her Molten King (~0.30 against 1.27 lives). That is allowed by the targets, but the finale is less of a test for her.
- **The inhale is 2.6 s:**
  - The Forge's music and `bellowsInhale` are timed to a 2.0 s inhale. Check that the sound does not end 0.6 s before the roar; stretch the sound or delay its start.
  - `setFlueGlow` in world.js:978 reads `BREATH.inhale`, so it follows.
- **Cover marks** need gen4.js to export cover spots. They must stay out of the band (self-check by `inFlue`), and they must not clutter: they show only for the flue she is in, only during its inhale.
- **The Forge's stair checkpoint** must be floor and outside `heroInArena`. Check it on 6 seeds. If Karthax leaps (Hammerfall up to 16 m) toward the stair, a woken hero could be struck at once. A 2 s safety on respawn, iframes as after a dodge, would cover it if seen.
- **`lightAt(x, z, pad)` is shared:** default 0 keeps every other caller's behaviour. Only `act4Hit` and the Shroud tint pass a pad.
- **The bot is not a phone player.** The readability gains (light, telegraph colour, cover marks, "Blocked", touches) are only partly measured: the bot sees blue circles in code. They are the reason for most of these changes, and they can only be judged on a phone.
- **Act V**, built elsewhere on `/home/user/abyssos`, may reuse `BREATH.hit`, `dashStep`, `lightAt` or the guard. Port the changes there, or check that its code reads the new names (`hitBy`, `monsterHit`, `D.w`).
