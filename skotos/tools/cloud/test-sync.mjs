// node tools/cloud/test-sync.mjs: the cloud sync's rules (src/game/cloudsync.js) against the artifact backend
// (src/net/cloudart.js) over a fake artifact db (tools/cloud/fakes.mjs), devices as fake stores. Every edge of
// docs/cloudsave/README.md, "The rules". Then the game's own store (src/game/save.js over a localStorage stand-in, two
// pages of one browser as two instances of it): backups, a newer version's records, a restore against another page's
// deletion; and game/cloud.js's triggers for a view-only visitor. The Supabase backend and the migration:
// tools/cloud/test-saves.mjs.
import { syncAll, pushOne, dirty, heroSum, MAX_HERO, MAX_HEROES } from '../../src/game/cloudsync.js';
import { artifactBackend } from '../../src/net/cloudart.js';
import { device, hero, artifactDb } from './fakes.mjs';

let pass = 0, fail = 0;
const ok = (c, what, extra) => { if (c) pass++; else { fail++; console.log('FAIL', what, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } };
const T = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL', name, e.stack); } };
const setup = async (n = 2, uid = 'u1') => { const A = artifactDb(); const devs = []; for (let i = 0; i < n; i++) { const d = device(); d.B = await artifactBackend(A.claude(uid)); devs.push(d); } return { A, devs }; };
const sync = (d) => syncAll(d.B, d.store);

await T('absent', async () => {
  const A = artifactDb();
  ok(await artifactBackend(A.claude(null)) === null, 'signed out: no backend (the game as it was)');
  ok(await artifactBackend(A.claude('u1', { noDb: true })) === null, 'an older viewer (db null): no backend');
  ok(await artifactBackend(null) === null, 'no claude at all: no backend');
  ok(await artifactBackend({ use: async () => { throw new Error('x'); } }) === null, 'use() rejecting: no backend');
});

await T('first sync both ways', async () => {
  const { A, devs: [a, b] } = await setup();
  a.add(hero('h1', { gold: 10 })); a.add(hero('h2'));
  b.add(hero('h3', { cls: 'mage' }));
  const r1 = await sync(a);
  ok(r1.ok && r1.pushed.length === 2, 'a pushes its two', r1);
  const r2 = await sync(b);
  ok(r2.ok && r2.pulled.sort().join() === 'h1,h2' && r2.pushed.join() === 'h3', 'b pulls two, pushes one', r2);
  const r3 = await sync(a);
  ok(r3.pulled.join() === 'h3' && !r3.pushed.length, 'a pulls b\'s', r3);
  ok(a.D.heroes.length === 3 && b.D.heroes.length === 3, 'both have all three');
  ok(JSON.stringify(a.hero('h1')) === JSON.stringify(b.hero('h1')), 'the same record on both');
  ok(!dirty(a.store, a.B.who) && !dirty(b.store, b.B.who), 'nothing dirty after');
  const r4 = await sync(a);
  ok(!r4.pushed.length && !r4.pulled.length && A.net.sets === 3, 'a sync with nothing changed writes nothing', { r4, sets: A.net.sets });
  ok(!a.D.bak.length && !b.D.bak.length, 'no backups when nothing was replaced');
});

await T('played-only change is no change', async () => {
  const { devs: [a] } = await setup(1);
  a.add(hero('h1')); await sync(a);
  a.hero('h1').played = 99999999;
  ok(!dirty(a.store, a.B.who), 'an autosave that only moved played is not dirty');
  a.play('h1');
  ok(dirty(a.store, a.B.who), 'a real change is dirty');
});

await T('one side changed', async () => {
  const { devs: [a, b] } = await setup();
  a.add(hero('h1')); await sync(a); await sync(b);
  a.play('h1', (h) => { h.level = 9; }, 5000);
  const r = await sync(a); ok(r.pushed.join() === 'h1', 'a pushes its change', r);
  const s = await sync(b); ok(s.pulled.join() === 'h1' && b.hero('h1').level === 9, 'b takes it', s);
  ok(b.D.bak.length === 1 && b.D.bak[0].hero.level === 5 && b.D.bak[0].why === 'cloud', 'what it replaced is kept as a backup', b.D.bak);
  ok(!s.replaced.length || s.replaced.join() === 'h1', 'reported');
  // b plays, a takes it back
  b.play('h1', (h) => { h.gold = 7; }, 6000);
  await sync(b); const t = await sync(a);
  ok(t.pulled.join() === 'h1' && a.hero('h1').gold === 7 && a.hero('h1').level === 9, 'and back', t);
});

await T('conflict: the later played wins, the other kept', async () => {
  const { devs: [a, b] } = await setup();
  a.add(hero('h1')); await sync(a); await sync(b);
  a.play('h1', (h) => { h.gold = 111; }, 5000);
  b.play('h1', (h) => { h.gold = 222; }, 7000);
  await sync(a);
  const r = await sync(b);
  ok(r.pushed.join() === 'h1' && b.hero('h1').gold === 222, 'b played later: b\'s stands, pushed', r);
  ok(b.D.bak.some((x) => x.hero.gold === 111 && x.why === 'conflict'), 'a\'s copy kept as a backup on b', b.D.bak);
  const s = await sync(a);
  ok(s.pulled.join() === 'h1' && a.hero('h1').gold === 222, 'a takes the later', s);
  ok(a.D.bak.some((x) => x.hero.gold === 111), 'a keeps its own as a backup', a.D.bak);
  // the other way: the local copy is the later one, the cloud's older: never overwritten locally
  a.play('h1', (h) => { h.gold = 333; }, 9000);
  b.play('h1', (h) => { h.gold = 444; }, 8000);
  await sync(b);
  const t = await sync(a);
  ok(t.pushed.join() === 'h1' && a.hero('h1').gold === 333, 'a newer local copy is never replaced by an older cloud one', t);
  ok(a.D.bak.some((x) => x.hero.gold === 444 && x.why === 'conflict'), 'the cloud copy it replaced kept', a.D.bak);
});

await T('no base: first meeting of two copies', async () => {
  const { devs: [a, b] } = await setup();
  a.add(hero('h1', { gold: 1, played: 3000 })); b.add(hero('h1', { gold: 2, played: 2000 }));
  await sync(a);
  const r = await sync(b);
  ok(r.pulled.join() === 'h1' && b.hero('h1').gold === 1 && b.D.bak[0]?.hero.gold === 2, 'the later played wins, the older kept', { r, bak: b.D.bak });
  const c = device(); c.B = b.B; c.add(hero('h1', { gold: 1, played: 3000 }));
  const s = await sync(c);
  ok(!s.pulled.length && !s.pushed.length && !c.D.bak.length, 'equal copies just agree', s);
});

await T('the hero being played is never replaced under it', async () => {
  const { devs: [a, b] } = await setup();
  a.add(hero('h1')); await sync(a); await sync(b);
  a.play('h1', (h) => { h.gold = 50; }, 5000); await sync(a);
  b.D.cur = 'h1';
  const r = await sync(b);
  ok(r.kept.join() === 'h1' && b.hero('h1').gold === 100, 'kept while played', r);
  b.D.cur = null;
  const s = await sync(b);
  ok(s.pulled.join() === 'h1' && b.hero('h1').gold === 50, 'taken once put down', s);
  // a co-op guest's own record (the store's current() is G.hero.__real's id: game/save.js playingId)
  ok(b.store.put(hero('h1')) === true, 'store put of another hero works');
  b.D.cur = 'h1'; ok(b.store.put(hero('h1')) === false && b.store.drop('h1') === false, 'the store refuses the played hero');
});

await T('tombstones', async () => {
  const { devs: [a, b] } = await setup();
  const c = device(); c.B = a.B;
  a.add(hero('h1')); a.add(hero('h2')); await sync(a); await sync(b); await sync(c);
  a.del('h1');
  const r = await sync(a);
  ok(r.removed.join() === 'h1', 'a\'s deletion goes up as a tombstone', r);
  const s = await sync(b);
  ok(s.dropped.join() === 'h1' && !b.hero('h1') && b.D.bak.some((x) => x.hero.id === 'h1' && x.why === 'deleted'), 'b drops it, kept as a backup', { s, bak: b.D.bak });
  const s2 = await sync(b);
  ok(!s2.pushed.length && !b.hero('h1'), 'b does not bring it back', s2);
  const t = await sync(a);
  ok(!a.hero('h1') && !t.pulled.length, 'a does not get it back', t);
  // c played it after the deletion: its copy is newer and comes back
  c.play('h1', (h) => { h.gold = 5; }, Date.now() + 10000);
  const u = await sync(c);
  ok(u.pushed.join() === 'h1', 'a copy played after the deletion outlives it', u);
  // a device that never saw the hero while it lived: the tombstone keeps nothing from it, and nothing comes back
  const d = device(); d.B = a.B;
  await sync(d);
  ok(d.hero('h1')?.gold === 5 && d.hero('h2'), 'a new device takes the living ones (h1 came back by a later play)');
});

await T('offline and failures change nothing', async () => {
  const { A, devs: [a, b] } = await setup();
  a.add(hero('h1')); await sync(a); await sync(b);
  a.play('h1', (h) => { h.gold = 9; }, 5000); await sync(a);
  b.play('h1', (h) => { h.level = 2; }, 4000);
  const before = b.snap();
  A.net.offline = true;
  const r = await sync(b);
  ok(!r.ok && r.code === 'unavailable' && b.snap() === before, 'offline: refused, nothing local changed', r);
  ok(dirty(b.store, b.B.who), 'still dirty');
  A.net.offline = false; A.net.failGet = 1;
  const s = await sync(b);
  // (b changed it and so did a: a conflict; b played earlier, so b would take a's, but the get fails)
  ok(s.errors.length && b.hero('h1').level === 2 && b.hero('h1').gold === 100, 'a failed get leaves the hero as it was', { s, h: b.hero('h1') });
  const t = await sync(b);
  ok(t.pulled.join() === 'h1' && b.hero('h1').gold === 9 && b.D.bak.some((x) => x.hero.level === 2), 'the next sync settles it, the loser kept', { t, bak: b.D.bak });
  // a deletion offline: kept as a tombstone here, and told when back
  b.del('h1'); A.net.offline = true;
  await sync(b); ok(!b.hero('h1'), 'deleted here while offline');
  A.net.offline = false;
  const u = await sync(b); ok(u.removed.join() === 'h1', 'the tombstone goes up later', u);
  const v = await sync(a); ok(v.dropped.join() === 'h1', 'and a hears it', v);
});

await T('old saves go up untouched', async () => {
  const { devs: [a, b] } = await setup();
  // a version-13 hero: no Act V fields, its progression's own, a field this version never heard of
  const v13 = { id: 'hV13', cls: 'ranger', level: 50, diff: 3, quest: 23, mlvl: 12, mxp: 5000, points: 14, xp: 0, gold: 5000, inv: [null, { base: 'ring', rar: 3, lvl: 50, stats: { crit: 5 } }], equip: {}, stash: [], wps: ['town'], act1: 1, act2: 1, act3: 1, act4: 1, skills: { multi: 5 }, vars: { rain: 3 }, variant: { rain: 2 }, mast: { might: 10 }, loadout: ['hawks', 'rain', 'multi', 'vault'], flags: { act4: true }, stats: { kills: 5000 }, created: 1, played: 2, futureField: { x: [1.5, '2'] } };
  a.add(v13);
  await sync(a); await sync(b);
  ok(JSON.stringify(b.hero('hV13')) === JSON.stringify(v13), 'byte for byte on the other device');
  ok(JSON.stringify(a.hero('hV13')) === JSON.stringify(v13), 'and untouched here');
});

await T('limits', async () => {
  const { devs: [a] } = await setup(1);
  const big = hero('hBig', { flags: { pad: 'x'.repeat(MAX_HERO) } });
  a.add(big); a.add(hero('hOk'));
  const r = await sync(a);
  ok(r.errors.some((e) => e.id === 'hBig' && e.code === 'too_big') && r.pushed.join() === 'hOk', 'a hero too big is refused, the others go', r);
  ok(a.hero('hBig'), 'and stays local');
  for (let i = 0; i < MAX_HEROES + 2; i++) a.add(hero('hn' + i));
  const s = await sync(a);
  ok(s.errors.filter((e) => e.code === 'too_many').length === 3 && a.D.heroes.length === MAX_HEROES + 4, 'past 12 in the cloud: refused, kept local', s.errors);
  ok(heroSum({ a: 1, played: 1 }) === heroSum({ a: 1, played: 2 }) && heroSum({ a: 1 }) !== heroSum({ a: 2 }), 'the sum ignores played only');
});

await T('read-only viewer', async () => {
  const { A, devs: [a] } = await setup(1);
  a.add(hero('h1'));
  A.net.readOnly = true;
  const before = a.snap();
  const r = await sync(a);
  ok(r.errors.some((e) => e.code === 'read_only') && a.hero('h1'), 'a view that may not write: read_only, the hero kept', r);
  ok(JSON.parse(a.snap()).h.length === JSON.parse(before).h.length, 'local list unchanged');
});

await T('another account', async () => {
  const A = artifactDb();
  const a = device(); a.B = await artifactBackend(A.claude('u1'));
  const x = device(); x.B = await artifactBackend(A.claude('u2'));
  a.add(hero('h1')); await sync(a);
  const r = await sync(x);
  ok(!r.pulled.length && !x.D.heroes.length, 'another viewer sees none of u1\'s documents');
  // the same device signed in as another account: its base is no base, both sides merge
  a.B = await artifactBackend(A.claude('u2'));
  const s = await sync(a);
  ok(s.pushed.join() === 'h1' && a.D.meta.who === 'art:u2', 'a new account: its heroes go up there', s);
});

await T('pushOne (the page going away)', async () => {
  const { A, devs: [a, b] } = await setup();
  a.add(hero('h1')); await sync(a); await sync(b);
  ok(await pushOne(a.B, a.store, 'h1') === false, 'unchanged: nothing sent');
  a.play('h1', (h) => { h.gold = 3; });
  ok(await pushOne(a.B, a.store, 'h1') === true && !dirty(a.store, a.B.who), 'changed: sent, agreed');
  b.play('h1', (h) => { h.gold = 4; });
  let code = null; try { await pushOne(b.B, b.store, 'h1'); } catch (e) { code = e.code; }
  ok(code === 'conflict' && b.hero('h1').gold === 4, 'the cloud changed meanwhile: refused, left to the sync', code);
  ok(A.docs.size === 1, 'one document');
});

await T('two pages at once', async () => {
  const { devs: [a, b] } = await setup();
  a.add(hero('h1')); a.add(hero('h2')); await sync(a); await sync(b);
  a.play('h1', (h) => { h.gold = 1; }, 5000); b.play('h2', (h) => { h.gold = 2; }, 5000);
  const [r, s] = await Promise.all([sync(a), sync(b)]);
  ok(r.ok && s.ok, 'both end', { r, s });
  await sync(a); await sync(b); await sync(a);
  ok(a.hero('h1').gold === 1 && a.hero('h2').gold === 2 && b.hero('h1').gold === 1 && b.hero('h2').gold === 2, 'both changes everywhere', { a: a.D.heroes.map((h) => h.gold), b: b.D.heroes.map((h) => h.gold) });
});

// ---------- a copy left open, and newer progress elsewhere ----------
const lvl = (B, id) => B.get(id).then((c) => JSON.parse(c.data).level);
// (a backend whose get lets something happen as its answer comes: the player pressing Continue meanwhile)
const onGet = (B, f) => ({ ...B, get: async (id) => { const r = await B.get(id); f(id); return r; } });
const climb = async (P, id, from, to, t0) => { P.D.cur = id; for (let l = from + 1, t = t0; l <= to; l++, t += 1000) { P.play(id, (h) => { h.level = l; h.xp = 0; h.stats.kills += 40; h.stats.time += 100; }, t); await sync(P); } P.D.cur = null; };

await T('a copy left open never beats newer progress from another device', async () => {
  const { devs: [L, P] } = await setup();
  L.add(hero('hX', { level: 30, played: 1000 })); await sync(L); await sync(P);
  L.D.cur = 'hX';                                        // the laptop's tab left open on X
  await climb(P, 'hX', 30, 35, 2000);                    // the phone plays it 30 -> 35
  ok(await lvl(P.B, 'hX') === 35, 'the phone\'s 35 is up');
  // back to the laptop: its autosave moves played and the clock, nothing else; its sync
  L.play('hX', (h) => { h.stats.time += 20; }, 9000);
  const r = await sync(L);
  ok(!r.pushed.length && r.kept.join() === 'hX' && r.behind.join() === 'hX', 'the laptop pushes nothing: kept as played, told it is behind', r);
  ok(await lvl(L.B, 'hX') === 35, 'the cloud keeps 35');
  L.play('hX', (h) => { h.stats.time += 20; }, 10000);
  const r2 = await sync(L);
  ok(!r2.pushed.length && await lvl(L.B, 'hX') === 35, 'and so on every autosave while it stays open', r2);
  const s = await sync(P);
  ok(!s.pulled.length && P.hero('hX').level === 35 && !P.D.bak.length, 'the phone keeps its 35, nothing replaced', { s, bak: P.D.bak });
  // the laptop puts it down (back to the title): it takes the 35, its open copy kept
  L.D.cur = null;
  const t = await sync(L);
  ok(t.pulled.join() === 'hX' && L.hero('hX').level === 35 && L.D.bak.some((b) => b.hero.level === 30), 'put down, the laptop takes 35 (its 30 kept)', { t, bak: L.D.bak });
  // played a little at 30 while the other was at 35: still the further copy wins, the other kept
  const { devs: [L2, P2] } = await setup();
  L2.add(hero('hX', { level: 30, played: 1000 })); await sync(L2); await sync(P2);
  L2.D.cur = 'hX';
  await climb(P2, 'hX', 30, 35, 2000);
  L2.play('hX', (h) => { h.stats.kills += 1; h.gold += 5; }, 9000);
  const u = await sync(L2);
  ok(!u.pushed.length && u.behind.join() === 'hX' && await lvl(L2.B, 'hX') === 35, 'a little play at 30 does not push over 35', u);
  L2.D.cur = null;
  const v = await sync(L2);
  ok(v.pulled.join() === 'hX' && L2.D.bak.some((b) => b.why === 'conflict' && b.hero.level === 30 && b.hero.gold === 105), 'put down: 35 taken, the 30 kept as a conflict backup', { v, bak: L2.D.bak });
  // and the other way: the copy here played further than the cloud's goes up, the cloud's kept
  L2.play('hX', (h) => { h.level = 37; }, 20000);
  P2.play('hX', (h) => { h.level = 36; }, 30000); await sync(P2);
  const w = await sync(L2);
  ok(w.pushed.join() === 'hX' && await lvl(L2.B, 'hX') === 37 && L2.D.bak.some((b) => b.why === 'conflict' && b.hero.level === 36), 'further here (37 over 36, played earlier): pushed, the 36 kept', { w, bak: L2.D.bak });
});

await T('a change here that no level or kill shows beats a cloud copy only left open elsewhere', async () => {
  const { devs: [L, P] } = await setup();
  L.add(hero('hX', { level: 30, played: 1000 })); await sync(L); await sync(P);
  // the phone left open on X: its autosaves push only its clock, later and later
  P.D.cur = 'hX';
  for (let t = 50000; t <= 52000; t += 1000) { P.play('hX', (h) => { h.stats.time += 120; }, t); await sync(P); }
  // the laptop sold something (gold, a bag slot: no level, XP or kill), played earlier than the phone's last autosave
  L.play('hX', (h) => { h.gold += 250; h.inv[3] = null; }, 20000);
  const r = await sync(L);
  ok(r.pushed.join() === 'hX' && JSON.parse((await L.B.get('hX')).data).gold === L.hero('hX').gold, 'the laptop\'s change goes up over the phone\'s idle clock', r);
  const s = await sync(P);
  ok(s.behind.join() === 'hX' && !s.pushed.length, 'the open phone is told, pushes nothing', s);
});

await T('Continue pressed during the start sync: the stale copy is not pushed after', async () => {
  const { devs: [L, P] } = await setup();
  L.add(hero('hX', { level: 30, played: 1000 })); await sync(L); await sync(P);
  await climb(P, 'hX', 30, 35, 2000);
  // the laptop's start sync: its get of X answers just as the player presses Continue on X
  const B0 = L.B; L.B = onGet(B0, () => { L.D.cur = 'hX'; });
  const r = await sync(L);
  L.B = B0;
  ok(r.kept.join() === 'hX' && r.behind.join() === 'hX' && L.hero('hX').level === 30, 'kept under the page, told it is behind', r);
  L.play('hX', (h) => { h.stats.time += 20; }, 9000);
  const s = await sync(L);
  ok(!s.pushed.length && await lvl(L.B, 'hX') === 35, 'its next autosave does not push 30 over 35', s);
  const t = await sync(P);
  ok(P.hero('hX').level === 35 && !t.pulled.length, 'the phone keeps 35', t);
});

await T('tombstones are the account\'s that recorded them', async () => {
  const A = artifactDb();
  const S = device(), U1 = device(), U2 = device();
  const as1 = await artifactBackend(A.claude('u1')), as2 = await artifactBackend(A.claude('u2'));
  U1.B = as1; U2.B = as2;
  S.add(hero('hX', { level: 40, played: 1000 }));
  S.B = as1; await sync(S); await sync(U1);              // u1's hero, on a browser u1 and u2 share, and u1's phone
  S.B = as2; await sync(S); await sync(U2);              // u2 signs in on S: X merged into u2's cloud too
  U2.del('hX'); await sync(U2);                          // u2 deletes it ("not mine")
  const r = await sync(S);
  ok(r.dropped.join() === 'hX' && !S.hero('hX'), 'S as u2 drops it', r);
  S.B = as1;
  const s = await sync(S);
  ok(!s.removed.length && !(await as1.get('hX')).del, 'u1 on S again: u2\'s tombstone is not told to u1', s);
  ok(s.pulled.join() === 'hX' && S.hero('hX'), 'S takes u1\'s X back', s);
  const t = await sync(U1);
  ok(!t.dropped.length && U1.hero('hX') && !U1.D.bak.length, 'u1\'s phone keeps X', t);
  ok(S.D.meta.away?.['art:u2']?.tomb?.hX, 'u2\'s tombstone kept aside for u2', S.D.meta);
  // u2 again: its own tombstone again, so X does not go back up to u2
  S.B = as2;
  const u = await sync(S);
  ok(!u.pushed.includes('hX') && (await as2.get('hX')).del, 'u2 again: its tombstone holds, X not brought back to u2', u);
  // a deletion made before this browser knew any account is its own: told to the first account it syncs with
  const N = device(); N.add(hero('hY')); N.B = as1; await sync(N);
  const N2 = device(); N2.add(hero('hY')); N2.del('hY'); N2.B = as1;
  const v = await sync(N2);
  ok(v.removed.join() === 'hY', 'a deletion from before any account goes to the first', v);
});

await T('read-only: no writes tried, only copies taken', async () => {
  const { A, devs: [a, b] } = await setup();
  b.add(hero('hB')); await sync(b);
  A.net.readOnly = true;
  for (let i = 0; i < 12; i++) a.add(hero('h' + i));
  const c0 = A.net.calls;
  const r = await syncAll(a.B, a.store, { readOnly: true });
  ok(r.ok && !r.errors.length && A.net.calls - c0 === 2 && r.pulled.join() === 'hB', 'a pull-only sync: the list and the one copy taken, no set', { r, calls: A.net.calls - c0 });
  a.del('h0');
  const c1 = A.net.calls;
  const s = await syncAll(a.B, a.store, { readOnly: true });
  ok(A.net.calls - c1 === 1 && !s.removed.length, 'a deletion is not told: one call, the list', { s, calls: A.net.calls - c1 });
});

// ---------- the game's store (src/game/save.js) ----------
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => mem.delete(k), get length() { return mem.size; }, key: (i) => [...mem.keys()][i] ?? null, clear: () => mem.clear() };
const SV = await import('../../src/game/save.js');
const { G } = await import('../../src/game/state.js');
const real = (S) => ({ heroes: S.storedHeroes, current: S.playingId, put: S.putStored, drop: S.dropStored, meta: S.cloudMeta, setMeta: S.setCloudMeta, backup: S.backupHero, check: S.heroFits });
const fresh = (heroes = [], last = null) => { mem.clear(); localStorage.setItem('skotos.save.v1', JSON.stringify({ heroes, settings: {}, last })); G.hero = null; SV.loadSave(); };
const bk = () => SV.backups().map((b) => b.why + ':' + b.hero.id + ':L' + b.hero.level);

await T('backups: routine copies never push out a lost conflict or a deleted hero', async () => {
  fresh();
  SV.backupHero(hero('hX', { level: 35 }), 'conflict');
  SV.backupHero(hero('hZ', { level: 9 }), 'deleted');
  for (let i = 0; i < 8; i++) SV.backupHero(hero('hX', { level: 30, stats: { kills: 3, deaths: 0, time: 60 + i, legs: 0, elites: 0 } }), 'cloud');
  for (let i = 0; i < 8; i++) SV.backupHero(hero('hR' + i, { level: 2 }), 'cloud');
  const b = SV.backups();
  ok(b.some((x) => x.why === 'conflict' && x.hero.id === 'hX' && x.hero.level === 35) && b.some((x) => x.why === 'deleted' && x.hero.id === 'hZ'), 'the conflict\'s and the deletion\'s copies stay', bk());
  ok(b.filter((x) => x.why === 'cloud' && x.hero.id === 'hX').length <= 1 && b.filter((x) => x.why === 'cloud').length === SV.BAK_MAX, 'one routine copy a hero, at most BAK_MAX', bk());
  ok(SV.backupsGone().length === 3 && SV.backupsGone().every((g) => g.why === 'cloud'), 'what went for room is told (the routine ones past 6)', SV.backupsGone());
  // the same copy kept as routine, then the only one left of a deletion: kept as that
  const y = hero('hY', { level: 4 }); SV.backupHero(y, 'cloud'); SV.backupHero(y, 'deleted');
  ok(SV.backups().filter((x) => x.hero.id === 'hY').map((x) => x.why).join() === 'deleted', 'a routine copy that becomes a deletion\'s is kept as that', bk());
  // past BAK_KEEP heroes lost or deleted: the oldest such goes, told
  fresh();
  for (let i = 0; i <= SV.BAK_KEEP; i++) SV.backupHero(hero('hK' + i), 'deleted');
  ok(SV.backups().length === SV.BAK_KEEP && !SV.backups().some((x) => x.hero.id === 'hK0') && SV.backupsGone()[0]?.id === 'hK0', 'the oldest past BAK_KEEP goes, told', bk());
});

await T('backups under a sync: six routine pulls later, the lost fork is still there', async () => {
  const A = artifactDb();
  const L = device(); L.B = await artifactBackend(A.claude('u1'));
  const PB = await artifactBackend(A.claude('u1'));
  fresh();
  L.add(hero('hX', { level: 30, played: 1000 })); L.add(hero('hY', { cls: 'mage', level: 12, played: 1000 }));
  await sync(L); await syncAll(PB, real(SV));
  // the phone's 35 of X, lost in a conflict on the phone (the laptop's 36 further on): its only copy is a backup
  G.hero = G.save.heroes.find((h) => h.id === 'hX'); G.hero.level = 35; SV.writeSave(); G.hero = null;
  L.play('hX', (h) => { h.level = 36; }, Date.now() - 5000); await sync(L);
  const r = await syncAll(PB, real(SV));
  ok(r.pulled.join() === 'hX' && SV.backups().some((b) => b.why === 'conflict' && b.hero.level === 35), 'the phone takes 36, its 35 a conflict backup', { r, bk: bk() });
  // the laptop plays on, the phone hears each change
  for (let i = 1; i <= 7; i++) { L.play('hX', (h) => { h.stats.kills += 1; }, Date.now() + i * 1000); await sync(L); await syncAll(PB, real(SV)); }
  ok(SV.backups().some((b) => b.why === 'conflict' && b.hero.level === 35), 'after 7 routine pulls the 35 is still kept', bk());
  ok(SV.backups().filter((b) => b.why === 'cloud' && b.hero.id === 'hX').length === 1, 'and the routine ones are one for X', bk());
});

await T('a cloud copy stored while the page was still taking the hero up is not overwritten as a change', async () => {
  const A = artifactDb();
  const P = device(); P.B = await artifactBackend(A.claude('u1'));
  const LB = await artifactBackend(A.claude('u1'));
  fresh([hero('hX', { level: 30, played: 1000 })], 'hX');
  await syncAll(LB, real(SV)); await sync(P);
  await climb(P, 'hX', 30, 35, 2000);
  // Continue: the page takes X up (freshHero) and loads its zone; the start sync meanwhile takes the 35
  const h = SV.freshHero(G.save.heroes.find((x) => x.id === 'hX'));
  const r = await syncAll(LB, real(SV));
  ok(r.pulled.join() === 'hX' && SV.storedHeroes().find((x) => x.id === 'hX').level === 35, 'the start sync took 35 before the hero was played', r);
  G.hero = h; SV.writeSave();
  ok(SV.backups().some((b) => b.why === 'conflict' && b.hero.level === 35), 'its first save writes its 30 over it: the 35 kept first', bk());
  const s = await syncAll(LB, real(SV));
  ok(!s.pushed.length && s.behind.join() === 'hX' && await lvl(LB, 'hX') === 35, 'the 30 is not pushed over the 35; told it is behind', s);
  G.hero.stats.kills += 2; SV.writeSave();
  const t = await syncAll(LB, real(SV));
  ok(!t.pushed.length && await lvl(LB, 'hX') === 35, 'nor after more of its saves', t);
  G.hero = null;
  const u = await syncAll(LB, real(SV));
  ok(u.pulled.join() === 'hX' && SV.storedHeroes().find((x) => x.id === 'hX').level === 35, 'put down: the 35 again', u);
  // its own saves alone are no other page's: no backup, the base kept
  fresh([hero('hW', { level: 3 })], 'hW');
  await syncAll(LB, real(SV));
  const n0 = SV.backups().length;
  G.hero = SV.freshHero(G.save.heroes[0]); SV.writeSave(); G.hero.gold++; SV.writeSave(); SV.writeSave();
  ok(SV.backups().length === n0 && SV.cloudMeta().base.hW, 'a page\'s own saves of its hero: nothing kept aside');
  G.hero = null;
});

await T('a newer version\'s hero is never rewritten by this one', async () => {
  const A = artifactDb();
  const NEW = device(); NEW.B = await artifactBackend(A.claude('u1'));
  const OB = await artifactBackend(A.claude('u1'));
  fresh([hero('hY', { cls: 'mage' })], 'hY');
  await syncAll(OB, real(SV)); await sync(NEW);
  // the next release: an item base and a sixth blessing this version does not know, and a higher level cap
  const x = hero('hX', { level: 70, boons: ['ember', 'forge', 'amber', 'lantern', 'tide', 'frost6'], played: Date.now() });
  x.equip = { weapon: { id: 'w1', base: 'sword', rar: 0, ilvl: 50, stats: {} }, chest: { id: 'c1', base: 'iceplate', rar: 2, ilvl: 70, stats: {} } };
  x.inv[0] = { id: 'r1', base: 'runeband', rar: 1, ilvl: 70, stats: {} };
  NEW.add(x); await sync(NEW);
  const text = JSON.stringify(NEW.hero('hX'));
  ok(SV.heroFits?.(x) === 'newer' && SV.heroFits?.(hero('hQ')) === null, 'heroFits tells a newer version\'s record');
  const r = await syncAll(OB, real(SV));
  ok(!r.pulled.length && r.errors.some((e) => e.id === 'hX' && e.code === 'newer') && !SV.storedHeroes().some((h) => h.id === 'hX'), 'this version does not take it: refused newer', r);
  G.hero = G.save.heroes.find((h) => h.id === 'hY'); SV.writeSave(); G.hero = null;
  const s = await syncAll(OB, real(SV)), t = await sync(NEW);
  ok(!s.pushed.length && !t.pulled.length && JSON.stringify(NEW.hero('hX')) === text, 'nothing goes back: the newer device\'s X untouched', { s, t });
  // a newer page of this browser stored it (two versions open at once): this one's autosave writes it back as it is
  fresh([hero('hY', { cls: 'mage' }), JSON.parse(text)], 'hY');
  ok(G.save.heroes.find((h) => h.id === 'hX').level === 50, 'this page\'s own copy is made whole for it');
  G.hero = G.save.heroes.find((h) => h.id === 'hY'); SV.writeSave(); G.hero = null;
  ok(JSON.stringify(SV.storedHeroes().find((h) => h.id === 'hX')) === text, 'but the stored record stays byte for byte', SV.storedHeroes().find((h) => h.id === 'hX')?.level);
  G.settings.music = 0.3; SV.writeSave();
  ok(JSON.stringify(SV.storedHeroes().find((h) => h.id === 'hX')) === text, 'a settings write too');
  // the played hero is this page's own and is written as it plays it
  G.hero = G.save.heroes.find((h) => h.id === 'hY'); G.hero.gold = 777; SV.writeSave(); G.hero = null;
  ok(SV.storedHeroes().find((h) => h.id === 'hY').gold === 777, 'the hero played is written');
});

await T('a restore holds against another page\'s deletion', async () => {
  fresh([hero('hX', { level: 44 }), hero('hY', { cls: 'mage' })], 'hX');
  const SA = await import('../../src/game/save.js?tab=A'), SB = await import('../../src/game/save.js?tab=B');
  const tab = { A: { save: null, hero: null }, B: { save: null, hero: null } };
  const as = (k, f) => { G.save = tab[k].save; G.hero = tab[k].hero; const r = f(); tab[k].save = G.save; tab[k].hero = G.hero; return r; };
  as('A', () => SA.loadSave()); as('B', () => SB.loadSave());
  const oldX = SA.storedHeroes().find((h) => h.id === 'hX');
  as('A', () => SA.deleteHero('hX'));
  as('A', () => { G.hero = G.save.heroes.find((h) => h.id === 'hY'); SA.writeSave(); });
  ok(!SB.storedHeroes().some((h) => h.id === 'hX'), 'A deleted X');
  // a page that writes X's old record back (one that read it before): A's next save takes it out again
  const d = JSON.parse(localStorage.getItem('skotos.save.v1')); d.heroes.push(oldX); localStorage.setItem('skotos.save.v1', JSON.stringify(d));
  as('A', () => SA.writeSave());
  ok(!SB.storedHeroes().some((h) => h.id === 'hX'), 'the old record written back by another page goes again');
  const b = SB.backups().find((x) => x.hero.id === 'hX');
  ok(as('B', () => SB.restoreBackup(b.hero.id, b.at)) === true && SB.storedHeroes().some((h) => h.id === 'hX'), 'B restores X');
  as('A', () => SA.writeSave());
  ok(SB.storedHeroes().some((h) => h.id === 'hX' && h.level === 44), 'A\'s next autosave leaves the restored X', SB.storedHeroes().map((h) => h.id));
  as('A', () => SA.writeSave());
  ok(as('A', () => G.save.heroes.some((h) => h.id === 'hX')), 'and A\'s title has it again');
  G.save = null; G.hero = null;
});

await T('a restore is of the backup tapped, whatever a sync added meanwhile', async () => {
  fresh([hero('hX', { level: 20 }), hero('hY', { cls: 'mage', level: 8 })]);
  SV.backupHero(hero('hX', { level: 35 }), 'conflict');
  SV.backupHero(hero('hY', { cls: 'mage', level: 3 }), 'cloud');
  SV.backupHero(hero('hY', { cls: 'mage', level: 2 }), 'deleted');
  const list = SV.backups(), pick = list.find((x) => x.hero.id === 'hX');
  // (shown, tapped once; a sync takes another backup before the second tap)
  SV.backupHero(hero('hY', { cls: 'mage', level: 7 }), 'cloud');
  ok(SV.backups().indexOf(SV.backups().find((x) => x.hero.id === 'hX')) !== list.indexOf(pick), 'the list moved under it');
  ok(SV.restoreBackup(pick.hero.id, pick.at) === true, 'restored by its hero and time');
  ok(SV.storedHeroes().find((h) => h.id === 'hX').level === 35 && SV.storedHeroes().find((h) => h.id === 'hY').level === 8, 'the copy tapped, and only that hero', SV.storedHeroes().map((h) => h.id + ':' + h.level));
  ok(SV.restoreBackup('hX', 12345) === false, 'a backup no longer there: refused');
});

// ---------- game/cloud.js: a view-only visitor ----------
await T('a view-only visitor: no sync tries writes again', async () => {
  const A = artifactDb(); A.net.readOnly = true;
  fresh(Array.from({ length: 12 }, (_, i) => hero('h' + i)));
  let vis = null, clock = Date.now();
  const realNow = Date.now; Date.now = () => clock;
  globalThis.window = { claude: A.claude('u9'), addEventListener() {} };
  globalThis.document = { hidden: false, addEventListener: (e, f) => { if (e === 'visibilitychange') vis = f; } };
  try {
    const CL = await import('../../src/game/cloud.js'), bus = await import('../../src/ui/bus.js');
    await CL.initCloud(new URLSearchParams(''));
    ok(CL.CLOUD.state === 'unavailable' && CL.CLOUD.why === 'read_only', 'the start sync finds it read-only', CL.CLOUD);
    const c0 = A.net.calls, s0 = A.net.sets;
    clock += 30000; bus.emit('travel', 'town');
    await new Promise((r) => setTimeout(r, 1700));
    ok(A.net.calls === c0, 'a zone change: no sync', A.net.calls - c0);
    SV.deleteHero('h3'); await new Promise((r) => setTimeout(r, 300));
    ok(A.net.calls === c0, 'a deletion: no sync', A.net.calls - c0);
    clock += 200000; G.hero = G.save.heroes.find((h) => h.id === 'h1'); G.hero.gold++; SV.writeSave(); G.hero = null;
    await new Promise((r) => setTimeout(r, 50));
    ok(A.net.calls === c0, 'an autosave past PUSH: no sync', A.net.calls - c0);
    document.hidden = true; vis(); document.hidden = false; clock += 120000; vis();
    await new Promise((r) => setTimeout(r, 50));
    ok(A.net.calls - c0 === 1 && A.net.sets === s0, 'back to view after a while: one pull-only sync, the list alone', A.net.calls - c0);
    ok(CL.CLOUD.state === 'unavailable' && CL.CLOUD.why === 'read_only', 'and it stays read-only', CL.CLOUD);
  } finally { Date.now = realNow; }
});

console.log(`test-sync: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
