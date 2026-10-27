// node tools/cloud/test-sync.mjs: the cloud sync's rules (src/game/cloudsync.js) against the artifact backend
// (src/net/cloudart.js) over a fake artifact db (tools/cloud/fakes.mjs), devices as fake stores. Every edge of
// docs/cloudsave/README.md, "The rules". The Supabase backend and the migration: tools/cloud/test-saves.mjs.
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

console.log(`test-sync: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
