# Skotos co-op

Two to four heroes in one world. More players bring more and stronger monsters, and better rewards for each of them. Each player brings their own hero (class, level, gear, skills) from their own save and keeps what they earn. The world and the story are the host's.

Code: `src/net/` (transport.js, state.js, coop.js, netcfg.js), `src/ui/coopui.js`, and small hooks in the game (listed at the end). Tests: `tools/net/` and `tools/coop.mjs`.

## How it plays

- **The lobby** (Συντροφιά / Co-op): from the title (a Co-op button under Continue, once the page has a room), from the pause menu, or from the party button beside the bag on the HUD. *Host a game* gives a four-character code (letters and digits, no look-alikes) and opens the named room `skotos-<code>`. *Join* takes the code, or a host picked from the list of games waiting (the lobby shows every host's class, level, zone, players and difficulty). A listing is only the fields a listing has, checked, with the peer and the person the room stamped (a page cannot list a game in another's name); a host picked from the list is the only peer taken as that game's host, and by code a host is taken only when one peer alone claims the code. The host sees who is in and presses *Start*; anyone joining after that comes straight to the host's side.
- **In the game**: a party frame under the hero's bars (each companion's name, class, level, life, a mark when they are down or in another zone), names over the other heroes, and the party's code and size.
- **Downed, not dead.** At 0 life in co-op a hero is downed: a companion who stands beside them for 2.5 s raises them at 40% life; left alone (30 s, or *Rise now*) they rise at full life at the zone's checkpoint (a guest by the host). If every hero is down at once for 3 s, all rise. The death panel is the single-player one only (a game that ends while a hero is down: a guest gets up at home, a host alone has the death panel).
- **The host leads.** A guest goes where the host goes (every zone change is followed, the guest arriving at the host's side; a zone it comes back to is the one it left, its chests and shrines as it left them; what fell for it in a zone it is led out of goes into its bag); a guest cannot take an exit, a waypoint or a town portal, or touch the story's things (lamps, sea-lights, stones, NPC dialogue). A guest can open its own chests, use shrines, its stash, and the shops (Halda, Elianthe, Brokka, Elati).
- **Leaving.** A guest who leaves (the button, a closed page, a lost connection, the host gone) is put back in its own town, its hero as it is now. The host never notices more than a toast and the monsters' life and blows going back down (in every zone it keeps; the packs already up keep their size).

### Quest credit (the decision)

The story is the host's: a guest's quest, story flags, waypoints and difficulty are never written. In the host's world a guest's `G.hero` is a view of its own record with the host's world fields laid over it (`flags`, `quest`, `diff`, `wps`, `act1`-`act5`, `gateBest`, `seeds`); writes to those go to the host's copy and are dropped, everything else (level, XP, gold, items, skills, blessings, kill counts) is the guest's own and is saved as such (`save.js` saves `G.hero.__real`). A guest keeps its blessings' own multipliers (Unbound, Remembered). So a guest may help a friend through an act it has not reached, gains all the XP and loot of it, and finds its own story where it left it. Whatever reads the acts for something of the guest's own reads the guest's record: it is offered blessings for its own acts only (`story.js offerBoons`), and its Act IV gifts are its own (`stats.js`); the story's catch-ups on entering a zone and an act's end are the host's and never play on a guest's page. No save can be broken by the host's state: the guest's saved record is never given a world field. (Owner question 1 in `questions.md`.)

## The scaling table (data.js `COOP`)

Per players in the zone (index = players - 1). The world is the host's, scaled as players come and go (`coop.js rescale`: every monster, in every zone kept, keeps its share of life, and its blows follow the table); each player's rewards are rolled for them.

| players | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| monster life (`hp`) | ×1 | ×1.7 | ×2.35 | ×3.0 |
| boss life (`boss`) | ×1 | ×1.6 | ×2.3 | ×3.0 |
| monster blows (`dmg`) | ×1 | ×1.2 | ×1.35 | ×1.5 |
| pack size (`pack`) | ×1 | ×1.25 | ×1.5 | ×1.75 |
| champion pack odds (`elite`) | ×1 | ×1.35 | ×1.7 | ×2.0 |
| each player's XP (`xp`) | ×1 | ×1.2 | ×1.4 | ×1.6 |
| each player's gold (`gold`) | ×1 | ×1.25 | ×1.5 | ×1.75 |
| item odds from a common monster (`loot`) | ×1 | ×1.3 | ×1.6 | ×1.9 |
| magic find added to every roll (`mf`, rarity) | +0 | +25 | +50 | +75 |
| a boss's items | +0 | +1 | +2 | +3 |

Rewards: every player within 50 m of a kill, the host too (anywhere in the zone for a boss) gets the full kill's XP, their own gold piles and their own item rolls (the host rolls a guest's items with the guest's class and magic find, `makeItem({ cls, mf })`, and sends them; they drop on the guest's page only, and a host's drops on the host's only). Chests, breakables and shrines are each page's own too.

### Balance (measured)

`tools/balance-act.mjs --coop N` plays a party of N equal heroes as one bot: the world scaled as the host scales it for N, the bot's damage ×N (the party's), its life ×N (the monsters' blows shared out over N heroes). Its seconds and deaths are then the party's, per hero. Two rounds, 66 runs (`docs/coop/balance/`):

- **Round 1** (Warden difficulty, the first table: blows ×1.05-1.15, XP ×1.3-1.9): eight packs of the Old Forest (Warden, Mage, level 8) and of the Field of Ash (Ranger, 24), the Weaver and Ivar: the party cleared at the solo pace (0.7-1.2× the seconds) and took about half as much damage a minute per hero. Too safe: the blows went up to ×1.2 / ×1.35 / ×1.5 (a hero's share of the blows near solo again: pack × blows ÷ players = 0.75 for two, 0.66 for four, and a boss's target takes about what it takes alone, the fight being shorter), and XP down a little (×1.2 / ×1.4 / ×1.6: per minute a pair still earns about 1.4× the XP of one, a party of four about 2×).
- **Round 2** (Nightmare, the table as now but for boss life at 3-4 players), 3 runs each, median seconds of combat / damage taken a minute (in life bars: 1 = all of a life) / deaths in all three runs:

| fight | solo | two | four |
|---|---|---|---|
| Field of Ash, 8 packs (Ranger 25) | 45 s / 3.1 / 0 | 48 s / 2.6 / 0 | 50 s / 1.4 / 0 |
| Deepstone Halls, 8 packs (Warden 14) | 106 s / 3.2 / 0 | 130 s / 2.3 / 0 | 125 s / 2.1 / 2 |
| Ivar (Mage 25) | 41 s / 1.6 / 0 | 29 s / 0.7 / 0 | 32 s / 0.6 / 0 |
| the Molten King (Warden 14) | 286 s / 3.4 / 15 | 355 s / 1.8 / 0 (one run out of time) | 150 s / 1.3 / 0 |

So with company the packs take as long as alone (bigger and tougher), the damage each hero takes is a little lower (more so with four: someone always draws the blows), and each player's rewards are 1.4-2× a minute. Bosses with four went a little fast: their life at three and four players went up to ×2.3 and ×3.0.

## The transports

All three give the game one channel shape (`src/net/transport.js`, top comment): `emit(topic, data)`, `on(topic, fn)`, `presence(patch)`, `presenceDue()`, `peers()`, `onPeers(fn)`, `connected()`, `onConnection(fn)`, `leave()`, and a meter of what went out and came in (a count for each of the last six seconds, so it never grows; what is heard is measured once in eight messages of a kind, not stringified again each time). Every channel holds a token bucket under the room's budget (32 sends a second, burst 64, emits and presence sends counted together), refuses a message or a merged presence over 4 KiB before the wire sees it, and sends presence coalesced (10 a second at most); what the rate or the budget holds back goes on a timer, so a channel the game does not pump each frame (the lobby) still sends its last word. `pickTransport(params, SUPABASE)` picks one at start-up:

1. **RoomTransport** (the claude.ai artifact's `room` capability; the main one now): `await claude.use('room')`; the lobby is the room itself, a game is `room.join('skotos-<code>')`. A viewer the room does not admit gets `null` and the full single-player game (no Co-op button at all).
2. **LocalTransport** (`?net=local`): BroadcastChannel between the pages of one browser, for the tests; `&netdrop=0.1` loses a share of messages, `&netlag=ms` delays them.
3. **SupabaseTransport** (the Android app and a public web build): Supabase Realtime broadcast (`self: false`), supabase-js v2 shapes; channel `skotos:<room>`. Realtime shuts a channel whose client calls `track()` a sixth time in 30 s, so presence is tracked once a channel (`{ k }`, keyed by the peer label: who is there, who joins and leaves) and the game's presence travels as a broadcast `_p`, coalesced like any presence, said again every 1.5 s and when someone joins; a peer is a member with its last `_p`, one silent 12 s is gone. It takes a client: `net/netcfg.js` holds `{ url, anonKey, createClient, stamped }`, empty here (no project exists or is used). Realtime does not stamp who sent a broadcast, and a guest believes its host's messages for the sender on them: `pickTransport` takes Supabase only once the server stamps senders (`stamped: true`, `release.md` step 5). Tested against a fake client in node.

`?net=off` forces single-player.

## The protocol

Topics (all in the game room; the lobby uses presence only): `s` snapshot (host), `w` world (host), `i` ice (host), `f` fx (each page's hero), `c` control (host: `{ op: 'end' }` when it closes the game).

- **Presence, each page.** A guest's presence is its hero (built only when the channel would send it, 10 a second; the others take a hero's place only from its own new presence, so a hero walks smoothly however many others there are): `h` [x, z, rot, speed, life, max life, flags (down, in the air, dodging), y] (positions in 1/20 m), `c2` its last clip [name, speed, count], `lk` its look (class, level, weapon base and rarity, off-hand), `zk` the zone it has built, `mf`/`gf`/`dm` (its magic find, gold find and weapon damage, for the host's loot rolls and checks), `ak` the host's last reliable event for it that it has seen, `ev` its events the host has not acked (its blows `[seq, 'h', monster id, amount, crit, statuses]`, a revive `[seq, 'rv', peer]`), `hb` a beat each second (a guest whose beat stops for 6 s, a hidden tab or a locked phone, is not counted in the zone, its stand-in gone, until it beats again), `nd: 'w'` while it has no world. The host's presence: `r: 'h'`, the code, its look, its zone (`{ id, seed, level, tier, diff, key }`, and where its hero stands in it: an arriving guest comes to its side), the roster (the three guests it took), `on` once started. In the lobby a host shows `g: { c: code, cls, l, z, n, d, v, on }`.
- **Snapshot `s`, host, 10 a second while a guest is in its zone.** `k` the zone key, `h` the host's hero (as a presence `h`, plus its clip by number), `w` the tide [clock, a boss's hold level and rate, gust, the gusts' clock], `l` on the Farthest Light the fires lit (the cairns', the open holes' lamps: two bit masks), `ak` each guest's last event done, `r` each guest's reliable events it has not acked, its own slice (`{ [peer]: [[seq, type, ...]] }`: `h` a monster's blow on a guest, `k` a kill's XP and gold for a guest, `it` an item rolled for a guest, `rv` raised, `wp` the party wiped, `cd` a clip name's number, `say` a line of the story), `f` what the host saw near the guests (fx calls, positional sounds, projectiles, areas, sap pools, telegraphs and their kills, most important first), `fs` for a guest the places in `f` of its own blows' look (it has shown them: passed over), `a` the monsters near the guests: `[id, kind, x, z, rot, life 0-255, flags, clip, clip count, speed, y, level, clip speed, top life]` (flags: dead, hidden, aggro, frozen, stunned, champion, rare, minion, struck, dormant, airborne, statue, pet, boss, drowned). Everything fits under 3.9 KB, the monsters before the fx (which keep 0.5 KB). Every snapshot carries the bosses, each guest's own ten nearest and a death not yet told (a death is told three times); the others go by how long each has waited times what it is to the guests (one after a guest, aggro on it or that struck it a moment ago, most; then the nearer), one that waited a second before those: a monster left out of one snapshot comes in a later one, none waits long, and a guest's puppet is never let go for want of room (`coop.js pickActors`). A puppet's samples after a gap go on from where it stood (no leap).
- **World `w`, ice `i`** go in chunks of 3.3 KB (`{ id, i, n, s }`). The world (flags, quest, difficulty, waypoints, acts, the clip dictionary) is sent when it changes, when a guest asks, and every 12 s; the ice (the stage of every thin-ice cell, as runs) when it changes (at most twice a second) and every 3 s.
- **Reliability.** Snapshots, fx and the world's periodic sends are unreliable and repeated. Each guest's reliable events are its own queue (one count numbers them all, so a guest's own run only rises; at most 200 held), and ride in every snapshot until that guest has acked them (`ak` in its presence; taken in order; one the host let go, past 30 s, is passed over): each guest has its share of the snapshot's 1.7 KB for them, and what one leaves the others may take (a different guest first each snapshot), so a guest that stops acking holds back only its own. A guest's events ride in its presence, oldest first, until the host acks them. Nothing reliable is ever more than one message behind its re-send.
- **Guests' blows, checked.** The host lands a guest's blow only on a live monster of its own within 26 m of the guest's stand-in, no bigger than its weapon could make (14× its weapon's top damage, its claim capped by its level), within a rate (30 such blows' worth a second, a burn counted with the blow that lights it: a crowd struck by a big skill, crits and all, stays under it), with statuses clamped (stun 3 s, freeze 4 s, knock 40...). A guest's level and gear are its own claims, from its own save: they are bounded only by the game's highest level and best weapon. Its stand-in goes only where a hero can: a run and a banked dodge, blink or leap's worth since its last sample, standing on the map (entering the zone and rising after a fall are the only jumps), so its reach, its kills' rewards, the packs and bosses it wakes and its weight on the ice follow where it can really be. A raise is taken only for another hero, down for a moment, whose side the reviver's stand-in has kept for 2 s by the host's own count, and one a hero every 4 s. A blow or raise refused is counted (`S.stats.why`); a malformed event is skipped.
- **The host's gifts, checked.** On a guest, what the host sends is held to what the game can make: a kill is paid once, 40 at once and 8 a second at most, its XP and gold no more than such a monster (its kind, level and rank as the guest saw it) can pay, and only the items such a kill can bring. Every item is rebuilt from what an item is made of (`items.js cleanItem`: stats only from `STATS`, each within a roll at the item's level, at most the zone's top level; a skill only one of its class; damage and speed only on a weapon, armour and block only where the base has them, within `makeItem`'s; a legendary only on its own base; the price worked out again; nothing else). A zone is built at its own level (a Shadow Gate's, the host's, within the game's), monsters' levels within it, statuses on the guest's hero no more than the game's own (freeze 4 s, Seen 6 s, roots 1.2 s, a push 40). `computeStats` and the panels pass over what no item can have, and a save that already holds a bad item, gold or XP is repaired on load (`save.js repairHero`): no item can brick a hero.
- **Puppets.** On a guest the host's monsters are puppets: built with the game's own `spawnMonster` (the right model, elite look, the mound of a monster lying in wait), moved by interpolation 130 ms behind, their clips played as the host's avatars played them (`Avatar.play` counts its clips), their life from the host. Anything foe on a guest's page that is not the host's (a story scene's, a pack) is removed. A guest's blow shows its number at once and moves the bar (by its share of the host's top life for it); the life the host sends wins.
- **The mirror.** On the host every look-only call (`fx.js`'s explosions, rings, glows, sparks, decals, splashes, ice shards, bolts, telegraphs; positional sounds; `fire`, `area`, `addSapPool` (every pool but a hero's), `addSapRing`) is told to `MIRROR.rec` (net/state.js) and sent in the snapshot; a guest's hero's own (recorded while `updatePlayer` runs) go on `f`. The look of a guest's blow on one of the host's monsters (its hit spark and sound) plays at once on its own page and reaches the others only in the host's echo of the blow landing (`fs` tells the striker which entries to pass over): once on every page. A monster's projectile or area played on a guest is real there (it can hurt that guest only: the host's copy never hurts a stand-in); a hero's is only seen (`team: 'vis'`). Every call played from another page is checked argument by argument and held to the game's own sizes (counts, radii, lifetimes, a bolt's length, the options rebuilt; the rings and telegraphs a page holds at once), 120 a message and 600 a second from each sender, and only from the party (on the host its guests, on a guest the host and the host's guests).
- **Act V.** The tide: the guest's clock is put right to the host's (within half a second) and a boss's hold on the water is the host's; each page's lanes and wash-outs are its own hero's. The ice: the host's is the only one that cracks (a guest's hero weighs on it as a stand-in); a guest's ice takes the host's stages, opens and closes its map, and plunges its hero where it breaks under it. Lit sea-lights, lamps and the rest are the host's flags: a guest lays them on its zone again (`act5Presence`, `act4Presence`, `act3Presence`, `townFires`) whenever the world changes, and what the story opened while it stood there (the thorn walls, the Root Gate, the slag on the Great Stair, the Anvil Gate, the skerry, a sealed hole: `world.js storyOpenings`; the skerry shut again under the dead Tower: `ai.js skerryClose`), from its own layout. The gusts: the guest's clock is put right to the host's. The cairns and the hole lamps (lit by a touch, put out by the dark) are the host's in every snapshot.

### Byte budget (measured)

`node tools/coop.mjs four` (four heroes in an Old Forest fight, LocalTransport) and `room` (three, RoomTransport against the fake room with 5% loss), as the channel's meter counts them (what is heard is its estimate):

| page | sends a second | bytes a second out | in |
|---|---|---|---|
| host, 3 guests | 10.0-10.4 | 20-34 KB | 1-5 KB |
| each guest (of 3) | 9.0-9.2 | 1.6 KB | 28-37 KB |
| host, 2 guests (room) | 10.4 | 14.9 KB | 3.4 KB |
| guest (room) | 9.0-9.2 | 1.6 KB | 16 KB |

The room allows about 40 sends a second per page (burst 80): every page stays near a quarter of it. The host's snapshots average 1.9-2.8 KB in that fight (it varies with the pack; the largest stay under 3.9 KB); the fake room recorded no budget drop and no refusal (`tools/net/test-transport.mjs`, and the `room` scenario).

The busiest fights, four heroes, counted at the wire (every BroadcastChannel post, 40 s each, the host and three guests striking all the while), before this round of fixes and now:

| fight | the party's sends a second | the party's bytes a second | each guest out / in | a monster near a guest waits between snapshots (p99 / longest) |
|---|---|---|---|---|
| a tier-8 Shadow Gate, 60 of its creatures more pulled onto the party (78-97 near the guests) | 53.1 → 51.9 | 71.3 → 51.7 KB | 11.8 → 5.3 KB / 59 → 46 KB | 37 s / 40 s → 0.44 s / 1.1 s |
| Karthax | 52.8 → 51.8 | 21.9 → 17.8 KB | 4.1 → 2.8 KB / 18 → 15 KB | 0.12 s both |
| the Skotos | 54.9 → 53.3 | 34.5 → 29.2 KB | 5.7 → 3.6 KB / 29 → 25 KB | 0.12 s both |

The host sends 10-12 a second in each (its snapshots full in the gate, 3.8 KB). In the gate a guest's puppets were let go and made again 73 times in 40 s before (a monster left out 2.5 s), none now; its presence is built 9 times a second, not 60. A party of four is about 52 sends and 155 deliveries a second (what Supabase counts: `release.md` step 5).

## Inviting a friend on claude.ai

The game is a private artifact. Only signed-in people the owner has given access can join a room:

1. In the artifact's **Share** menu, invite the friend by email (or give the organization access) at **Contributor** (can interact) or **Editor**. Viewer and Commenter access cannot send on the room's topics: such a friend sees the game alone.
2. The friend opens the link signed in, takes up a hero, and either enters the host's code or picks the host from the list (Συντροφιά / Co-op).

## What the lead declares at publish

```js
capabilities: {
  room: { topics: { s: 'interact', w: 'interact', i: 'interact', f: 'interact', c: 'interact' } },
  user: { scopes: ['profile'] }
}
```

`room` with the five topics opened to Contributors (topics not listed are admin-only); `user` with `profile` so the party frames show people's names (`user.profiles(by)`; without it the names fall back to the class and level).

## Tests

- `node tools/net/test-transport.mjs`: RoomTransport against `tools/net/fakeroom.mjs` (a faithful fake of the room: 40 sends a second per page shared by emits and presence, burst 80, 4 KiB messages and presence, presence coalesced at ~30 Hz, loss per receiver, named rooms up to 16, admin-only topics, peers as frozen snapshots), with the game's real snapshot size and rates and 10% loss; then the limits (5 KB message, 5 KB presence, a dropped connection, a page leaving, an unopened topic). LocalTransport and SupabaseTransport (against a fake supabase-js client holding to Realtime's limits: a channel shut on a client's sixth `track()` in 30 s; the project's events counted, each sent and each delivered) for the same shape, and four Supabase pages at the game's rates for 8 s (no channel shut, presence tracked once a channel, a late joiner told at once, a silent member let go).
- `node tools/coop.mjs <name> <out>` (BASE = a private no-HMR server, one browser, pages in one context, each with its own save `?slot=`; every scenario ends by reading each open page's `#fatal` box, where the game's errors from its timers and loop go): `join`, `pack` (monsters strike a guest; its blows kill; it is paid), `loot` (no item on two pages; a guest's pickup in its own save, its story untouched), `revive` (guest by host, host by guest, the 30 s rise), `churn` (a guest leaves mid-fight and the life rescales, comes back, a page closed outright), `hostleave`, `world` (a guest's page that stops, the pools, the puppet's bar, the 50 m rule for the host, a zone kept and the loot carried, the scaling in a zone left behind, the thorn walls, the slag and the skerry opened with the guest there, the Tower's clock with only a guest in the bay, the gusts, the fires and a sealed hole on the ice, downed when the game ends; the guests arrive by the host with no `place()`), `cheat` (a guest's blows too big, too far, too many, junk, burns, a flood of raises and of fx, a jump across the map, a listing in another's name; a host's rewards past any kill's, items no roll makes, a zone's level, statuses, fx, a world with acts the guest never played, its Crown gifts; then the guest's bag, shops, stash, equipping and Continue, its save poisoned the old way and repaired on load), `act5` (tide clock, a boss's hold, a break under the guest), `four` (scaling applied, every page's budget), `bosses` (the party follows the host through crypt, halls, heart, ashfield and coast: Barrow Lord, Molten King, Amaranthe, Ivar, the Walking Tower), `room` (the game over RoomTransport and the fake room), `ui` (the lobby and HUD on a phone, 844 × 390 touch; shots in `shots/`).

### The shipped scenarios

Every shipped scenario (Acts I-V, the 44 in HANDOFF's lists and the contract's) was run on this branch against a private no-HMR server: all ran to the end with no page error. Two report `pass: false` now and then, and both do on 564162f too: `perf5`'s coast at quality 0 (1.16× the Field of Ash against a 1.15 bound on this branch; 1.23× on 564162f: swiftshader draw time) and the `tide` soak, whose lane tests need three wash-outs and three walk-outs and depend on the coast's random seed (with `SEED=777` the branch passed twice, 8 and 8 wash-outs, and 564162f twice, 5 and 3).

## The game's hooks (for whoever changes these files)

- `combat.js damage`: a stand-in target (`target.remote`) goes to `NET.h.hurtRemote`; a puppet target (`target.puppet`, a guest's page) to `NET.h.hitPuppet` (the target's own multipliers are the host's; its hit look is kept off the mirror, `MIRROR.skip`: the host's echo shows it to the others); a guest's blow on the host (`o.net`) skips the host's own bonuses. `kill`: the party's reward factors and `NET.h.reward`; a host more than 50 m from a kill (not a boss's) has no share of it (`killed`: what a death does whoever is paid).
- `ai.js updateActors`: stand-ins and puppets are skipped; on a host each monster's target is the nearest hero (held until another is 3 m nearer). The delayed area strikes that read `G.player` now strike every hero (`heroes()`), the Flood too. A boss's own clock and moves (the Tower's tide, the Skotos's Cold, Wave, Drink, Hands, Breaches and floor clock, Karthax's dark, hammerfall and rain, the Dark's centre) go on while any hero is there (`partyInArena`, `partyNear`); the fight's camera, light and sky stay the page's own hero's. `skerryClose` is exported (a guest's skerry).
- `actors.js spawnMonster`, `world.js spawnPack/updatePacks`: the scaling (`a.coopK` life, `a.coopD` blows); packs and bosses wake for any hero; a guest spawns none. `world.js storyOpenings`: the story's openings laid on a standing zone from the flags (a guest's).
- `projectiles.js fire/area`, `sap.js addSapPool/addSapRing`, `fx.js`, `audio.js sfx`: the mirror (`mir`); `team: 'vis'` strikes nothing; a co-op copy of a projectile leaves no pool (the host's comes through the mirror).
- `ice.js`: a guest's ice is the host's (`netIce`, `iceDigest`); stand-ins weigh, never fall.
- `world.js nearestInteract`: what a guest may touch. `createZone`: `z.ep`, the zone's number.
- `boot.js`: the net's start-up and tick; in co-op panels and dialogs do not pause the world; downed instead of the death panel; `respawn` with `'net'`.
- `save.js`: `?slot=` (tests) and the guest's own record; `repairHero` on load. `anim.js Avatar.play`: counts its clips. `input.js`: keys typed in a field are the field's.
- `items.js cleanItem`, `statMax`: an item rebuilt from what an item is made of (a host's, a save's). `stats.js computeStats`: what no item can have is passed over; the Crown gifts from `hero.__real`. `panels.js`: a comparison or a panel that cannot be drawn fails soft. `pickups.js dropGold`: a pile is a whole, finite number; `gatherPickups`: what lies in a zone taken at once (a guest led away). `story.js`: a guest plays no zone-entry story, closes no act, and is offered blessings for its own acts only.
