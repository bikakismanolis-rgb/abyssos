# Act VII — stage C: the Names' rules module (`names7.js`)

17 November 2026. Rules only; nothing shipped is touched. Written against `docs/act7-contract.md` ("The Names", "The
Call", "Co-op", "Saves") and part 3.

## What was built

| file | what |
|---|---|
| `src/game/names7.js` (new) | the table `N7`, the saved fields, learn / say / deepen / open a slot / respec, `N7mods`, the runtime counters, the Call, the blow cap. **Imports nothing** (no DOM, no three.js, no `G`): every function takes the hero record or a runtime object, so it runs in plain Node and `progression.js` can import it with no cycle |
| `tools/check-names7.mjs` (new) | `node tools/check-names7.mjs`: **645 checks, 0 failed**, exit 0 (exit 1 on any failure) |
| `docs/act7-design/60-text-names.md` (new) | `## Names text keys`: 41 rows, three columns (key, Greek, English) |

## Save fields (as the contract names them)

`hero.names = { learnt: [], said: [null, null, null], deep: [], slots: 1, free: 0 }`. Nothing else is saved.
`free`: 0 the free respec not yet given, 1 given and waiting, 2 used (the contract gives the field and "once a hero";
the three values are this module's reading). `migrate7(hero)`: no field → the defaults; unknown ids dropped; `slots`
clamped 1-3; `deep` cut to what is learnt; `said` cut to `slots`, to what is learnt and to one slot a Name; then
`N7learn`. Running it twice changes nothing. Timed state (the weave, the post, the dodge's window, the Call) lives in
`pl.n7 = N7rt()` and is never saved.

## Exports

`N7`, `N7_BY`, `N7_IDS`, `N7_SLOT_COST` [0, 6, 12], `N7_DEEP_COST` 8, `N7_CALL`, `N7WHY`, `N7blank`, `migrate7`,
`N7learned`, `N7learn`, `N7open`, `N7knows`, `N7isDeep`, `N7slots`, `N7said`, `N7says`, `N7spent`, `N7slotCost`,
`N7openSlot`, `N7deepen`, `N7say`, `N7unsay`, `N7freeReady`, `N7useFree`, `N7respec`, `N7rt`, `N7onSkill`, `N7weave`,
`N7stand`, `N7standReset`, `N7onDodge`, `N7dodged`, `N7onDrink`, `N7onHit`, `N7ctx`, `N7mods`, `N7call`
(= `N7callStart`), `N7callActive`, `N7callLeft`, `N7callReady`, `N7callFlare`, `N7callVisit`, `N7nm`, `N7fromNm`,
`N7blowCap`, `N7_CAP_MAX`. Every changing function returns `{ ok, why }`; `N7WHY[why]` is the text key to show.

`N7mods(hero, ctx)` returns `dmg`, `parts`, `hurt`, `flaskCd`, `flaskReady`, `costK`, `resFloor`, `refund`, `reveal`,
`dodgeBack`, `dodgeCdK`, `basicResK`, `planted`, `arnaCall`, `stacks`; each key, its neutral value and the one ctx
condition that turns it on are documented above the function. `inSun`, `inShade`, `wading`, `lifeFrac` and
`nearHearth` are accepted and not read: none of the seven turns on them.

## Hooks for the other builders (line numbers as of this report; find the name if a line has moved)

Setup, once: `pl.n7 = N7rt()` where the player's actor is made.

| # | where | add |
|---|---|---|
| 1 | `progression.js:46` (`pointsSpent`, after the Mastery line) | `n += N7spent(h);` |
| 2 | `progression.js:123` (`migrateHero`, before `const free =`) | `migrate7(h);` (it runs `N7learn`; so the Names are learnt before `refreshStats` at `boot.js:198`, since `migrateHero` is `boot.js:195`) |
| 3 | `progression.js:100-106` (`respec`) | `respec(h, free)`: `if (free) { if (!N7useFree(h).ok) return false; } else { the gold test as shipped }`; then after `h.mast = {}`: `N7respec(h);` and the shipped `h.points = pointsEarned(h)` stays last |
| 4 | story, at `haldaOut` (quest 40) and wherever a hero is taken up in co-op, on **her own record** | `const r = N7learn(h.__real \|\| h); if (r.given) toast name7.given, then name7.free; for (id of r.fresh not among the three) toast name7.learnt with t(N7_BY[id].nameKey)`; then `refreshStats()` |
| 5 | `story.js:257` (the echo's kill branch) | Ivar's echo with her own quest ≥ 40: `own.flags.ivarEcho7 = true`, then hook 4 |
| 6 | `combat.js:68` (`damage`, inside `if (own) {`, after the crit line `:70`) | `const m = N7mods(G.hero, N7ctx(p.n7, G.time, { foeFull: target.hp >= target.hpMax, dist: Math.hypot(target.x - p.x, target.z - p.z), res: p.res, crit })); amount *= m.dmg; if (m.reveal) addVuln(target, 'revealed', m.reveal); if (m.parts.arna) target.n7open = G.time; N7onHit(p.n7, G.time, m);` (not for `o.dot`). All six damage Names sit here rather than in `heroHit` (`:35-45`): `heroHit` does not know the foe, and one place keeps the product exact |
| 7 | `combat.js:129` (the basic attack's `resOnHit`) | `× m.basicResK` |
| 8 | `combat.js:148` (`hurtHero`, `if (p.iframes > 0) return 0;`) | before the return: `if (N7mods(G.hero, {}).dodgeBack && N7dodged(p.n7)) p.dodgeCd = 0;` |
| 9 | `combat.js:163` (`hurtHero`, beside the other reductions) | `amount *= N7mods(G.hero, N7ctx(p.n7, G.time)).hurt;`; and where a blow pushes or interrupts her: skip it when `.planted` (never for `o.wash`) |
| 10 | `combat.js:508` (`kill`, after `a.dead = true`) | own kill: `const m = N7mods(G.hero, { sinceOpenS: a.n7open != null ? G.time - a.n7open : null }); if (m.refund) { the longest of p.cds on her four buttons } *= 1 - m.refund;` |
| 11 | `skills.js:182` (`useSkill`, the cost) and `canUse` just above | cost `× m.costK` with `m = N7mods(G.hero, N7ctx(pl.n7, G.time, { res: pl.res }))`; then `pl.res = Math.max(pl.res, m.resFloor)` |
| 12 | `skills.js:189` (beside `emit('skillUsed', …)`) | `if (!sk.basic) N7onSkill(pl.n7, sk.id, G.time);` |
| 13 | `skills.js:462` (`dodge`, the cooldown) | `pl.dodgeCd *= N7mods(G.hero, N7ctx(pl.n7, G.time)).dodgeCdK; N7onDodge(pl.n7, G.time);` |
| 14 | `skills.js:492` (`drinkPotion`) | `pl.potionCd = N7mods(G.hero, N7ctx(pl.n7, G.time)).flaskCd ?? POTION.cd; N7onDrink(pl.n7, G.time);` |
| 15 | `player.js:35` (the hero's tick, beside the timers) | `N7stand(pl.n7, pl.x, pl.z, dt, pl.buffs.call > 0);`; `N7standReset(pl.n7)` on a zone change |
| 16 | `world.js:208` / `:502` (a `callFire` interact beside `shrine` / `useShrine`) | `const r = N7call(pl.n7.call, G.time, hearthId, G.hero); if (!r.ok) toast N7WHY[r.why] (call.spent; call.soon with Math.ceil(r.wait)); else { pl.buffs.call = r.dur; if (r.flaskReady) pl.potionCd = 0; toast r.none ? call.none : call.on }`. Zone entry: `N7callVisit(pl.n7.call)`. A boss hearth's flare: `N7callFlare(pl.n7.call, hearthId)` and toast `call.again` |
| 17 | `hud.js:167` (the buff row's icon map) | a `call` entry (chip `hud.call`); nothing else: `pl.buffs.call` is already listed and counted down (`player.js:36`) |
| 18 | `progpanel.js:19` (tabs), `:23` (body), `:104` (`ptab`) | a third tab `prog.tab.names` when `N7open(h)`; actions call `N7say(h, id, slot, { town: inTown() })`, `N7unsay`, `N7deepen`, `N7openSlot`, then `refreshStats()`; a refusal shows `N7WHY[r.why]` |
| 19 | `coop.js:508` (the guest's look) | `nm: N7nm(h)` |
| 20 | `coop.js:780` (`blowCap`'s return) | `× N7blowCap(P.lk?.nm)` (the host's own table; bytes it does not know count as 1; at most 2.912) |
| 21 | `coop.js:1523` | `GUEST_OK` gains `'callFire'` |
| 22 | `tools/text7-import.mjs:5` | one more entry in `parts`: `['docs/act7-design/60-text-names.md', '## Names text keys']` |

A guest's blow reaches the host with its bonuses already in (`o.net`, `combat.js:66`), so hook 6 runs on the guest's
own page where her blow is made; the net lane places it.

## What the test asserts

The table (seven Names, both rules, the Call's rule, text keys, unlocks, bot play styles, every number); costs (6, 12,
8; three Deep 42; every Name Deep 74); the migration (empty hero, quest 39, quest 40, unknown ids, garbage, stable when
run twice); learning (flags, quest 40 once, Ivar's echo, a guest never from the host's flags); every transition and
refusal of say / unsay / deepen / open a slot; the respec (42 back, exactly `pointsEarned`, learnt kept, said shrunk to
slot 1, the free one once); each Name alone, Kept and Deep, under its condition and not under its negation (boundary
values on both sides); the six example builds (42 points, damage, hurt, cap, their Deep rules; nothing played the wrong
way; the Far Shot's 1.2 × 1.4 × 1.18 = 1.9824); the Call (20 s, 90 s, once a hearth, the flare, a new visit, +30% with
no Name, Arna once each 3 s, a Deep rule only if bought); the runtime counters; the blow cap's table and the three
bytes; the text table's rows.

Not tested here, because it needs the game: the hooks themselves, the panel, and run D's bands (N9).

## Readings made where the contract is silent (for the lead)

1. **The three given Names** are learnt when her own quest is ≥ 40 or `haldaOut` is set. The contract says both "at
   q40" (N1, N5) and "given at `haldaOut`"; with this reading a hero who reloads at quest 40 before speaking to Halda
   already has them. If they must wait for Halda, it is one line (`given()` in `names7.js`).
2. **The arena hearth's flare and the 90 s.** `N7callFlare` keeps the 90 s (C4 as written): a hero who called less
   than 90 s before the flare is refused with `call.soon` while the toast says "call!". `N7callFlare(st, id,
   { waive: true })` lets the flare be answered at once. Not chosen here.
3. **Asger:** the same skill twice adds no stack and ends nothing (the 6 s still run from it). **Ivar:** between 1 m
   and 3 m from where the count began it neither adds nor ends; past 3 m the count begins again there.
4. **Keyx's "next hit"** is one call of `damage`: a skill that strikes five foes pays on the first. If the combat
   builder wants the whole skill, `N7onHit` is called once a skill instead.
5. **The cap's ceiling:** 1.6 × 1.4 × 1.3 is 2.912; the contract writes "at most × 2.92". The module uses 2.912.
6. **A Deep Name need not be said** to be bought (part 3: "Every Name Deep: 74").

## Text keys drafted here, for the proofreaders

- `name7.noPoints` «Δεν φτάνουν οι πόντοι σου.» / "You do not have the points."
- `call.soon` «Η φωνή σου δεν γύρισε ακόμα: {0} δευτ.» / "Your voice has not come back yet: {0} s."
- `name7.isarn.n` «Ίσαρν» / "Isarn": the wording is the contract's; only the key is new (no shipped key holds his bare
  name; the other six use `npc.arna`, `npc.first.named`, `npc.einar`, `npc.keyx`, `npc.asger`, `npc.ivar`).

The other 38 rows are part 3's wording, copied. The Call's own line for each Name (the table's "during the Call"
column) has no key in any part and none was drafted. Three words are still to be checked against shipped text:
"Φανερωμένο" (shipped: «Φανερός», `hud.revealed`), "πόρο" (`res.*`), and the Landing's Greek in `name7.keyx.how`.
