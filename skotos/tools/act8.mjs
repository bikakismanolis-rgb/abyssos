// Act VIII's browser tests (Playwright, headless): BASE=http://localhost:5311/ node tools/act8.mjs <name> [outdir]
//   burn   the Burn: a gust takes a lane she stands in; the fire hits her once for HAZ's share; the lane is spent and
//          black; standing in it again nothing comes; stepping out of a second lane during the inhale she is not touched
//   vigil  the Vigil House: dark halls, shut doors; each fire banked opens the next and lets the day in
//   ragna  Ragna: shutters by her life, the drowse in daylight, the floor, the Flame by hand, the sleep, the morning
//   play8  the whole act with its story on, from the hook to the act's panel
//   road   Whitecliff's South Road is there after Act VII, takes her to the Tindergrass and back; absent before
//   echo8  after the act: Aithon's and Ragna's echoes rise, fight, fade; the story untouched; each first fall (an echo's too,
//          for a v24 hero) drops its legendary; Blacksoles and the Vigil Ring do what they say
//   gn8    after the act: Act VIII's blessing offered; the Seven Good Nights in Whitecliff (Halda by hand, Leif's father,
//          Elianthe), each a line and asleep; Selna only after the other six; all seven raise the blessing x1.25
//   gnfar  the four Good Nights outside Whitecliff: Brokka in the Halls, Elati in the Lanternglade, Glaukos at the Rope camp,
//          Selna at the Farthest Light (the other six asleep): each stands there, the touch at their side, asleep after it
//   founder the eighth Name: learnt at the second ember memory, shown in the panel; said, a blow on the last foe awake
//          within 12 m is +25% (none with a second foe near or asleep there), Deep its blows hurt 15% less
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [, , name = 'burn', out = '/tmp/act8'] = process.argv, BASE = process.env.BASE || 'http://localhost:5311/';
require('node:fs').mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const pg = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const open = async (q) => { await pg.goto(BASE + '?' + q, { waitUntil: 'load' }); await pg.waitForFunction(() => window.__ready, null, { timeout: 90000 }); await pg.waitForTimeout(1200); await pg.evaluate(async () => { const H = await import('/src/ui/hud.js'); clearInterval(window.__dlg); window.__dlg = setInterval(() => { try { if (H.dialogOpen()) H.advanceDialog(); } catch (e) {} }, 250); clearInterval(window.__imm); window.__imm = setInterval(() => { const pl = window.__G?.player; if (window.__immortal && pl && !pl.dead && pl.hp < pl.hpMax * 0.5) pl.hp = pl.hpMax; }, 50); }); };
const ev = (f, a) => pg.evaluate(f, a);
const beats = [], beat = (b, ok, info) => beats.push({ b, ok: !!ok, ...(info ? { info } : {}) });
const T = {
  async burn() {
    await open('auto=tinder&lvl=46&flags=act7&q=1&nopacks');
    const F0 = await ev(async () => { const Fg = await import('/src/game/forge.js'); window.__F = Fg; const G = window.__G; for (const a of G.actors) if (a.team === 'foe' && !a.prop) a.dead = true; return { n: Fg.flues().length, burn: Fg.flues().filter((f) => f.kind === 'burn' && f.armed).length, lanes: G.zone.lvl.act8.lanes.filter(Boolean).length }; });
    beat('the lanes stand armed, each with its stubble', F0.n >= 6 && F0.burn === F0.n && F0.lanes === F0.n, F0);
    // into the middle of lane 0, and stay
    const stand = (k, u) => ev(([k, u]) => { const G = window.__G, f = window.__F.flues()[k], p = { x: f.x + Math.sin(f.dir) * u, z: f.z + Math.cos(f.dir) * u }; G.player.x = p.x; G.player.z = p.z; G.player.iframes = 0; return { hp: G.player.hp / G.player.hpMax }; }, [k, u]);
    const hold = async (k, u, ms) => { let lo = 1; const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = await ev(([k, u]) => { const G = window.__G, f = window.__F.flues()[k], pl = G.player; pl.x = f.x + Math.sin(f.dir) * u; pl.z = f.z + Math.cos(f.dir) * u; return pl.hp / pl.hpMax; }, [k, u]); lo = Math.min(lo, r); await pg.waitForTimeout(100); } return lo; };
    // (the software renderer runs the game slower than the wall clock: every wait is for a state, held in place meanwhile)
    const holdUntil = async (k, u, cond, ms = 40000, off = 0) => { let lo = 1; const t0 = Date.now(); for (;;) { const r = await ev(([k, u, off, c]) => { const G = window.__G, f = window.__F.flues()[k], pl = G.player; pl.x = f.x + Math.sin(f.dir) * u + off; pl.z = f.z + Math.cos(f.dir) * u; return { hp: pl.hp / pl.hpMax, done: c === 'inhale' ? f.st === 'inhale' : c === 'spent' ? !!f.spent && f.st === 'idle' : false }; }, [k, u, off, cond]); lo = Math.min(lo, r.hp); if (r.done || Date.now() - t0 > ms) return { lo, done: r.done }; await pg.waitForTimeout(80); } };
    await stand(0, 9);
    const h1 = await holdUntil(0, 9, 'inhale', 15000);
    beat('a gust takes the lane she stands in (the inhale)', h1.done);
    await pg.screenshot({ path: out + '/burn-inhale.png' });
    const h2 = await holdUntil(0, 9, 'spent');
    await pg.waitForTimeout(600); await pg.screenshot({ path: out + '/burn-after.png' });
    const a1 = await ev(() => { const G = window.__G, f = window.__F.flues()[0], l = G.zone.lvl.act8.lanes[0]; return { st: f.st, armed: f.armed, spent: f.spent, black: l.black.visible, tufts: l.tufts.visible, T: { ...window.__F.TALLY8 } }; });
    beat('the fire hits her once, for the share', h2.lo < 0.93 && h2.lo > 0.7 && a1.T.hits === 1, { lowest: +h2.lo.toFixed(3), T: a1.T });
    beat('the lane is spent and black, its stubble gone', a1.st === 'idle' && !a1.armed && a1.spent && a1.black && !a1.tufts, a1);
    const before = await ev(() => { const pl = window.__G.player; pl.hp = pl.hpMax; return window.__F.TALLY8.gusts; });
    const lo2 = await hold(0, 9, 6000);
    const g2 = await ev(() => window.__F.TALLY8.gusts);
    beat('the black is safe: no second gust, no hurt', g2 === before && lo2 > 0.98, { gusts: g2, lowest: +lo2.toFixed(3) });
    // lane 1: stand, then step out of it during the inhale and wait beside it
    await stand(1, 9);
    const h3 = await holdUntil(1, 9, 'inhale', 15000);
    const h4 = await holdUntil(1, 9, 'spent', 40000, 4.2);
    const a2 = await ev(() => ({ spent: window.__F.flues()[1].spent, T: { ...window.__F.TALLY8 } }));
    beat('she steps out during the inhale and is not touched; the lane burns all the same', h3.done && h4.done && h4.lo > 0.98 && a2.spent && a2.T.hits === 1, { lowest: +h4.lo.toFixed(3), ...a2 });
  },
  async hearth() {
    await open('auto=tinder&lvl=46&flags=act7&q=1&nopacks');
    const use = (k) => ev((k) => { const G = window.__G, it = G.zone.act8.hearths.find((h) => h.k === k); G.player.x = it.x + 1.5; G.player.z = it.z; it.use(); return { awake: it.awake, lit: !!it.mesh.userData.lit, flag: !!G.hero.flags['ember' + k], call: G.player.buffs.call || 0, prompt: it.prompt, lidX: it.mesh.userData.lid.position.x }; }, k);
    const h0 = await ev(() => window.__G.zone.act8.hearths.map((it) => ({ k: it.k, awake: !!it.awake, lit: !!it.mesh?.userData.lit, prompt: it.prompt })));
    beat('three hearths, banked: no flame, the cover on', h0.length === 3 && h0.every((h) => !h.awake && !h.lit && h.prompt === 'hearth8.wake'), h0);
    const a = await use(1); await pg.waitForTimeout(700); await pg.screenshot({ path: out + '/hearth-awake.png' });
    beat('woken by hand: the flame, the stone laid by, the flag, the Call', a.awake && a.lit && a.flag && a.call > 0 && a.lidX > 1 && a.prompt === 'call.prompt', a);
    await use(2); const c = await use(3);
    beat('all three awake', c.flag && (await ev(() => [1, 2, 3].every((k) => window.__G.hero.flags['ember' + k]))));
    // leave and come back: they are still awake
    await ev(() => window.__G.zone.interact.find((i) => i.kind === 'exit' && i.to === 'town').use());
    await pg.waitForFunction(() => window.__G.zone.id === 'town', null, { timeout: 60000 }).catch(() => {}); await pg.waitForTimeout(1200);
    await ev(() => window.__G.zone.interact.find((i) => i.to === 'tinder').use());
    await pg.waitForFunction(() => window.__G.zone.id === 'tinder', null, { timeout: 60000 }).catch(() => {}); await pg.waitForTimeout(1500);
    const h1 = await ev(() => window.__G.zone.act8.hearths.map((it) => ({ awake: !!it.awake, lit: !!it.mesh?.userData.lit })));
    beat('after leaving and coming back they still burn', h1.length === 3 && h1.every((h) => h.awake && h.lit), h1);
  },
  async aithon() {
    await pg.setViewportSize({ width: 960, height: 540 });
    await open('auto=tinder&lvl=50&flags=act7&q=0&nopacks');
    await pg.waitForTimeout(4000);
    const at = (dx, dz) => ev(([dx, dz]) => { const G = window.__G, A = G.zone.L.spots.arena; G.player.x = A.x + dx; G.player.z = A.z + dz; G.player.iframes = 0; }, [dx, dz]);
    await ev(async () => { window.__F = await import('/src/game/forge.js'); });
    await at(0, 4); await pg.waitForTimeout(2500);
    beat('with the fires banked he is not on the Floor', await ev(() => !window.__G.zone.boss && !window.__G.zone.bossSpawned));
    await ev(() => { const G = window.__G; for (const k of [1, 2, 3]) G.hero.flags['ember' + k] = true; });
    await pg.waitForFunction(() => !!window.__G.zone.boss, null, { timeout: 30000 }).catch(() => {});
    const b0 = await ev(() => { const b = window.__G.zone.boss; return b ? { kind: b.kind, hp: Math.round(b.hpMax), model: b.avatar?.modelName, standIn: !!b.avatar?.standIn, lanes: window.__F.flues().filter((f) => f.boss).length } : null; });
    beat('the three fires awake: Aithon stands on the Floor, on the elk, six strips round him', b0 && b0.kind === 'aithon' && b0.lanes === 6 && !b0.standIn, b0);
    // keep her alive and near him until he has called a Furrow and it has burnt
    const t0 = Date.now(); let fur = null;
    while (Date.now() - t0 < 180000) { fur = await ev(() => { const G = window.__G, pl = G.player, b = G.zone.boss; pl.hp = pl.hpMax; const A = G.zone.L.spots.arena; if (Math.hypot(pl.x - A.x, pl.z - A.z) > 13) { pl.x = A.x; pl.z = A.z + 3; } return { awake: !!b.awake || !!b.fight || b.hp < b.hpMax || true, spent: window.__F.flues().filter((f) => f.boss && f.spent).length, T: { ...window.__F.TALLY8 } }; }); if (fur.spent >= 1) break; await pg.waitForTimeout(250); }
    await pg.screenshot({ path: out + '/aithon-fight.png' });
    beat('he calls a Furrow: a strip of the Floor burns and stays black', fur && fur.spent >= 1, fur);
    // brought to 0 life he rests: the flag, the body stays, the page lives
    await ev(async () => { const C = await import('/src/game/combat.js'); const G = window.__G, b = G.zone.boss; C.damage(G.player, b, b.hp + 10, { pure: true }); });
    await pg.waitForTimeout(3500);
    const r = await ev(() => { const G = window.__G, b = G.zone.boss; return { rest: !!G.hero.flags.aithonRest, spared: !!b?.spared, body: !!b?.avatar?.group?.visible }; });
    await pg.screenshot({ path: out + '/aithon-rest.png' });
    beat('at 0 life he stands down: aithonRest, spared, his body stays', r.rest && r.spared && r.body, r);
  },
  async spine() {
    // a hero at Act VII's end: the hook in Whitecliff, the road, the three fires, Aithon, quest 51
    await pg.setViewportSize({ width: 960, height: 540 });
    await open('auto=town&lvl=50&flags=act7&quest=47&q=0&nopacks');
    await pg.waitForFunction(() => window.__G.hero.quest === 48, null, { timeout: 60000 }).catch(() => {});
    beat('the hook: in Whitecliff after Act VII, quest 48 and call8', await ev(() => window.__G.hero.quest === 48 && !!window.__G.hero.flags.call8));
    await ev(() => window.__G.zone.interact.find((i) => i.to === 'tinder').use());
    await pg.waitForFunction(() => window.__G.zone.id === 'tinder' && window.__G.hero.quest === 49, null, { timeout: 90000 }).catch(() => {});
    beat('on the plain: quest 49', await ev(() => window.__G.zone.id === 'tinder' && window.__G.hero.quest === 49));
    const Story = await ev(async () => { const S = await import('/src/game/story.js'); const G = window.__G; const out = []; for (const k of [1, 2, 3]) { const it = G.zone.act8.hearths.find((h) => h.k === k); G.player.x = it.x + 1.5; G.player.z = it.z; it.use(); out.push({ q: G.hero.quest, text: S.questText() }); } return out; });
    beat('each fire counted in the quest line; the third gives quest 50', Story[0].q === 49 && /1\/3/.test(Story[0].text) && /2\/3/.test(Story[1].text) && Story[2].q === 50, Story);
    await ev(() => { const G = window.__G, A = G.zone.L.spots.arena; G.player.x = A.x; G.player.z = A.z + 3; });
    await pg.waitForFunction(() => !!window.__G.zone.boss, null, { timeout: 60000 }).catch(() => {});
    await ev(async () => { const C = await import('/src/game/combat.js'); const G = window.__G, b = G.zone.boss; C.damage(G.player, b, b.hp + 10, { pure: true }); });
    await pg.waitForFunction(() => window.__G.hero.quest === 51, null, { timeout: 30000 }).catch(() => {});
    beat('Aithon unyoked: quest 51, aithonRest', await ev(() => window.__G.hero.quest === 51 && !!window.__G.hero.flags.aithonRest));
  },
  async vigil() {
    // the House: dark under each roof, its doors shut; each fire banked opens the next; the three give quest 53
    await pg.setViewportSize({ width: 960, height: 540 });
    await open('auto=vigil&lvl=50&flags=act7,aithonRest,ember1,ember2,ember3&quest=51&q=0&nopacks&nostory');
    await pg.waitForFunction(() => window.__G.hero.quest === 52, null, { timeout: 30000 }).catch(() => {});
    const s0 = await ev(() => { const G = window.__G, z = G.zone, P = z.lvl.act8, S = z.L.spots; return { q: G.hero.quest, fires: z.act8.fires.length, lit: P.fires.every((f) => f.mesh.userData.lit), doors: P.doors.map((d) => d.open), shut: S.doors.map((d) => d.cells.every(([x, zz]) => !z.map.walkable(x + 0.5, zz + 0.5))), darks: P.darks.map((d) => d.k), boss: !!z.boss }; });
    beat('arriving: quest 52, three fires burning, three doors shut on the map, every hall dark, no Ragna yet', s0.q === 52 && s0.fires === 3 && s0.lit && s0.doors.every((d) => !d) && s0.shut.every(Boolean) && s0.darks.every((k) => k === 1) && !s0.boss, s0);
    await pg.screenshot({ path: out + '/vigil-yard.png' });
    // into hall 1: the sky goes dark
    await ev(() => { const G = window.__G, f = G.zone.act8.fires[0]; G.player.x = f.x + 3; G.player.z = f.z; });
    await pg.waitForFunction(() => (window.__G.zone.act8.dark || 0) > 0.98, null, { timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(800); await pg.screenshot({ path: out + '/vigil-dark.png' });
    beat('under a roof whose fire burns it is dark', await ev(() => window.__G.zone.act8.dark > 0.98));
    for (const k of [1, 2, 3]) {
      await ev((k) => { const G = window.__G, it = G.zone.act8.fires.find((f) => f.k === k); G.player.x = it.x + 1.6; G.player.z = it.z; G.player.iframes = 0; it.use(); }, k);
      await pg.waitForFunction((k) => !!window.__G.hero.flags['bank' + k], k, { timeout: 30000 }).catch(() => {});
    }
    await pg.waitForTimeout(1500); await pg.screenshot({ path: out + '/vigil-day.png' });
    const s1 = await ev(() => { const G = window.__G, z = G.zone, P = z.lvl.act8, S = z.L.spots; return { q: G.hero.quest, banks: [1, 2, 3].map((k) => !!G.hero.flags['bank' + k]), lit: P.fires.map((f) => !!f.mesh.userData.lit), doors: P.doors.map((d) => d.open), open: S.doors.map((d) => d.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5))), darks: P.darks.map((d) => d.k), dark: z.act8.dark }; });
    beat('each fire banked by hand: no flame, its door open on the map, its hall in daylight; quest 53', s1.q === 53 && s1.banks.every(Boolean) && s1.lit.every((l) => !l) && s1.doors.every(Boolean) && s1.open.every(Boolean) && s1.darks.every((k) => k === 0), s1);
    // leave and come back: still banked, still open
    await ev(() => window.__G.zone.interact.find((i) => i.kind === 'exit' && i.to === 'tinder').use());
    await pg.waitForFunction(() => window.__G.zone.id === 'tinder', null, { timeout: 60000 }).catch(() => {}); await pg.waitForTimeout(1200);
    const back = await ev(() => { const it = window.__G.zone.interact.find((i) => i.to === 'vigil'); if (it) it.use(); return !!it; });
    await pg.waitForFunction(() => window.__G.zone.id === 'vigil', null, { timeout: 60000 }).catch(() => {}); await pg.waitForTimeout(1500);
    const s2 = await ev(() => { const G = window.__G, z = G.zone, P = z.lvl.act8, S = z.L.spots; return { id: z.id, doors: P.doors.map((d) => d.open), open: S.doors.map((d) => d.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5))) }; });
    beat('the Tindergrass has the road south once Aithon rests; back in the House the doors still stand open', back && s2.id === 'vigil' && s2.doors.every(Boolean) && s2.open.every(Boolean), s2);
  },
  async ragna() {
    // Ragna: the shutters as her life falls, the drowse in daylight, the floor, the Flame by hand, the sleep, the morning
    await pg.setViewportSize({ width: 960, height: 540 });
    await open('auto=vigil&lvl=52&flags=act7,aithonRest,ember1,ember2,ember3,bank1,bank2,bank3&quest=53&q=0&nopacks&nostory');
    const at = (dx, dz) => ev(([dx, dz]) => { const G = window.__G, A = G.zone.L.spots.arena; G.player.x = A.x + dx; G.player.z = A.z + dz; G.player.iframes = 0; }, [dx, dz]);
    await at(0, -6);
    await pg.waitForFunction(() => !!window.__G.zone.boss, null, { timeout: 40000 }).catch(() => {});
    await pg.waitForFunction(() => !!window.__G.zone.boss?.awake, null, { timeout: 40000 }).catch(() => {});
    const b0 = await ev(() => { const b = window.__G.zone.boss; return b ? { kind: b.kind, hp: Math.round(b.hpMax), standIn: !!b.avatar?.standIn, awake: !!b.awake, flameUsed: window.__G.zone.act8.flame.used } : null; });
    beat('the three halls banked: Ragna stands in the Great Hall, on her own body, the Flame not yet bare', b0 && b0.kind === 'ragna' && b0.awake && !b0.standIn && b0.flameUsed, b0);
    await pg.screenshot({ path: out + '/ragna-0.png' });
    await ev(async () => { window.__C = await import('/src/game/combat.js'); window.__immortal = true; });
    const hurt = (f) => ev((f) => { const G = window.__G, b = G.zone.boss; window.__C.damage(G.player, b, b.hpMax * f, { pure: true }); G.player.hp = G.player.hpMax; return { hp: b.hp / b.hpMax, shut: G.zone.act8.shut }; }, f);
    await hurt(0.3); await pg.waitForTimeout(1500);
    const s1 = await ev(() => { const G = window.__G, P = G.zone.lvl.act8, b = G.zone.boss; return { hp: +(b.hp / b.hpMax).toFixed(3), want: Math.min(7, Math.floor((1 - b.hp / b.hpMax) * 8 + 1e-6)), shut: G.zone.act8.shut, open: P.shutters.filter((s) => s.open).length, dark: P.arenaDark.k }; });
    beat('about 70% of her life: a shutter down for each eighth gone, and the hall is lighter', s1.want >= 2 && s1.shut === s1.want && s1.open === s1.want && s1.dark < 0.8, s1);
    // she drowses in a pool of daylight
    const dz = await ev(async () => { const G = window.__G, b = G.zone.boss, sh = G.zone.lvl.act8.shutters[0]; const sp0 = b.speed0; b.x = sh.x; b.z = sh.z; b.move = null; await new Promise((r) => setTimeout(r, 900)); return { sun: !!b.sun, slow: b.speed < sp0 * 0.7 }; });
    beat('in a pool of daylight she drowses (slow)', dz.sun && dz.slow, dz);
    await pg.screenshot({ path: out + '/ragna-sun.png' });
    // blows cannot take her below the floor; the Flame is bare
    for (let i = 0; i < 6; i++) { await hurt(0.2); await pg.waitForTimeout(500); }
    await pg.waitForTimeout(1500);
    const s2 = await ev(() => { const G = window.__G, b = G.zone.boss; return { hp: +(b.hp / b.hpMax).toFixed(3), dead: !!b.dead, floored: !!b.floored, bare: !G.zone.act8.flame.used, shut: G.zone.act8.shut, bareQ: !!G.flame8Bare }; });
    beat('blows stop at a twentieth of her life: she is not dead, seven shutters are down, the Flame is bare to the hand', !s2.dead && s2.hp > 0.04 && s2.hp < 0.06 && s2.floored && s2.bare && s2.shut === 7, s2);
    // the hand on the Flame (held there until the touch ends)
    const t0 = Date.now(); let rest = false;
    while (Date.now() - t0 < 90000 && !rest) { rest = await ev(() => { const G = window.__G, it = G.zone.act8.flame, pl = G.player; pl.hp = pl.hpMax; pl.iframes = 5; if (!pl.act || pl.act.name !== 'touch') { pl.x = it.x + 1.8; pl.z = it.z; if (!it.used) it.use(); } return !!G.hero.flags.ragnaRest; }); await pg.waitForTimeout(250); }
    await pg.waitForTimeout(2500);
    const s3 = await ev(() => { const G = window.__G, b = G.zone.boss, P = G.zone.lvl.act8; return { rest: !!G.hero.flags.ragnaRest, spared: !!b?.spared, body: !!b?.avatar?.group?.visible, flameLit: !!P.flame.mesh.userData.lit, open: P.shutters.filter((s) => s.open).length, q: G.hero.quest }; });
    await pg.screenshot({ path: out + '/ragna-sleep.png' });
    beat('the Flame banked by hand: she sleeps (ragnaRest, spared, her body stays), every shutter down, quest 54', s3.rest && s3.spared && s3.body && !s3.flameLit && s3.open === 8 && s3.q === 54, s3);
    // the morning: the Flame woken closes the act
    await pg.waitForFunction(() => window.__G.zone.act8.flame.prompt === 'flame8.wake' && !window.__G.zone.act8.flame.used, null, { timeout: 30000 }).catch(() => {});
    await ev(() => { const G = window.__G, it = G.zone.act8.flame; G.player.x = it.x + 1.8; G.player.z = it.z; it.use(); });
    await pg.waitForFunction(() => window.__G.hero.quest === 55, null, { timeout: 30000 }).catch(() => {});
    const s4 = await ev(() => { const G = window.__G; return { q: G.hero.quest, act8: G.hero.act8, flag: !!G.hero.flags.act8, lit: !!G.zone.lvl.act8.flame.mesh.userData.lit }; });
    await pg.waitForTimeout(800); await pg.screenshot({ path: out + '/ragna-end.png' });
    beat('in the morning the Flame is woken and burns: quest 55, the act closed', s4.q === 55 && s4.act8 >= 0 && s4.flag && s4.lit, s4);
  },
  async play8() {
    // the whole act with its story on, from the morning after Act VII to the act's panel and the line at home
    await pg.setViewportSize({ width: 960, height: 540 });
    await open('auto=town&lvl=52&flags=act7&quest=47&q=0');
    await ev(async () => { window.__C = await import('/src/game/combat.js'); window.__immortal = true; });
    const W = (f, a, ms = 90000) => pg.waitForFunction(f, a, { timeout: ms }).then(() => true).catch(() => false);
    const fell = (kind) => ev((kind) => { const G = window.__G, b = G.zone.boss; if (b && b.kind === kind && !b.dead) window.__C.damage(G.player, b, b.hpMax * 0.34, { pure: true }); return b ? b.hp / b.hpMax : -1; }, kind);
    beat('the hook in Whitecliff: quest 48', await W(() => window.__G.hero.quest === 48));
    await ev(() => window.__G.zone.interact.find((i) => i.to === 'tinder').use());
    beat('the Tindergrass, Halda\'s lid: quest 49', await W(() => window.__G.zone.id === 'tinder' && window.__G.hero.quest === 49));
    for (const k of [1, 2, 3]) {
      await W(() => window.__G.mode === 'play' && !document.querySelector('#dialog:not([hidden])'), null, 30000);
      await ev((k) => { const G = window.__G, it = G.zone.act8.hearths.find((h) => h.k === k); G.player.x = it.x + 1.5; G.player.z = it.z; it.use(); }, k);
      await W((k) => !!window.__G.hero.flags['mem8_' + k], k, 20000);
      await pg.waitForTimeout(2500);
    }
    beat('three fires woken, three memories told: quest 50', await W(() => window.__G.hero.quest === 50 && [1, 2, 3].every((k) => window.__G.hero.flags['mem8_' + k])), await ev(() => window.__G.hero.quest));
    await ev(() => { const G = window.__G, A = G.zone.L.spots.arena; G.player.x = A.x; G.player.z = A.z + 4; });
    await W(() => !!window.__G.zone.boss?.awake, null, 60000);
    for (let i = 0; i < 40 && !(await ev(() => !!window.__G.hero.flags.aithonRest)); i++) { await ev(() => { const G = window.__G, A = G.zone.L.spots.arena; if (Math.hypot(G.player.x - A.x, G.player.z - A.z) > 13) { G.player.x = A.x; G.player.z = A.z + 3; } }); await fell('aithon'); await pg.waitForTimeout(700); }
    beat('Aithon unyoked: quest 51', await W(() => window.__G.hero.quest === 51 && !!window.__G.hero.flags.aithonRest, null, 20000));
    await pg.waitForTimeout(7000);
    const road = await ev(() => { const it = window.__G.zone.interact.find((i) => i.to === 'vigil'); if (it) it.use(); return !!it; });
    beat('the road south: the Vigil House, quest 52', road && await W(() => window.__G.zone.id === 'vigil' && window.__G.hero.quest === 52));
    for (const k of [1, 2, 3]) {
      await W(() => window.__G.mode === 'play' && !document.querySelector('#dialog:not([hidden])'), null, 30000);
      for (let i = 0; i < 60 && !(await ev((k) => !!window.__G.hero.flags['bank' + k], k)); i++) { await ev((k) => { const G = window.__G, it = G.zone.act8.fires.find((f) => f.k === k), pl = G.player; pl.iframes = 3; if (!pl.act || pl.act.name !== 'touch') { pl.x = it.x + 1.6; pl.z = it.z; it.use(); } }, k); await pg.waitForTimeout(400); }
    }
    beat('three halls banked: quest 53', await W(() => window.__G.hero.quest === 53, null, 20000), await ev(() => window.__G.hero.quest));
    await ev(() => { const G = window.__G, A = G.zone.L.spots.arena; G.player.x = A.x; G.player.z = A.z - 9; });
    await W(() => !!window.__G.zone.boss?.awake, null, 60000);
    for (let i = 0; i < 40 && !(await ev(() => !!window.__G.zone.boss?.floored)); i++) { await fell('ragna'); await pg.waitForTimeout(700); }
    beat('Ragna brought to her floor: the Flame bare', await ev(() => !!window.__G.zone.boss?.floored && !window.__G.zone.act8.flame.used));
    for (let i = 0; i < 200 && !(await ev(() => !!window.__G.hero.flags.ragnaRest)); i++) { await ev(() => { const G = window.__G, it = G.zone.act8.flame, pl = G.player; pl.iframes = 3; if (!pl.act || pl.act.name !== 'touch') { pl.x = it.x + 1.8; pl.z = it.z; if (!it.used) it.use(); } }); await pg.waitForTimeout(300); }
    beat('the Flame banked: she sleeps, quest 54', await W(() => !!window.__G.hero.flags.ragnaRest && window.__G.hero.quest === 54, null, 20000));
    const morn = await W(() => window.__G.zone.act8.flame.prompt === 'flame8.wake' && !window.__G.zone.act8.flame.used, null, 60000);
    await ev(() => { const G = window.__G, it = G.zone.act8.flame; G.player.x = it.x + 1.8; G.player.z = it.z; it.use(); });
    beat('the morning: the Flame woken, the act closed, its panel shown', morn && await W(() => window.__G.hero.quest === 55 && window.__G.hero.act8 >= 0 && window.__G.panel === 'act', null, 60000), await ev(() => ({ q: window.__G.hero.quest, act8: window.__G.hero.act8, panel: window.__G.panel })));
    await pg.screenshot({ path: out + '/play8-end.png' });
    const txt = await ev(() => document.querySelector('.act-h')?.textContent || '');
    beat('the panel says Act VIII', /VIII/.test(txt), txt);
  },
  async echo8() {
    const F8 = 'act7,act8,aithonRest,ember1,ember2,ember3,bank1,bank2,bank3,ragnaRest,flameWoken';
    const fight = async (zone, kind) => {
      await open(`auto=${zone}&lvl=52&flags=${F8}&quest=55&nopacks`);
      await ev(() => { window.__immortal = true; });
      const e = await ev((kind) => { const z = window.__G.zone, it = z.interact.find((i) => i.kind === 'echo'); return it ? { boss: it.boss, prompt: it.prompt } : null; }, kind);
      beat(kind + ': its echo stands after the act', e && e.boss === kind && e.prompt === 'echo.' + kind, e);
      await ev(() => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'echo'); G.player.x = it.x + 1; G.player.z = it.z; it.use(); });
      await pg.waitForFunction(() => window.__G.zone.boss?.echo && !window.__G.zone.boss.dead, null, { timeout: 90000 }).catch(() => {});
      const b = await ev(async () => { const G = window.__G, z = G.zone, b = z.boss, Fg = await import('/src/game/forge.js'); return b ? { kind: b.kind, echo: !!b.echo, lanes: (Fg.flues() || []).filter((f) => f.kind === 'burn' && f.boss && f.armed && !f.spent).length, shut: z.act8.shut, flame: z.act8.flame ? { used: z.act8.flame.used, prompt: z.act8.flame.prompt } : null } : null; });
      return b;
    };
    // Aithon
    const a = await fight('tinder', 'aithon');
    beat('Aithon\'s echo rises, the Floor\'s six strips standing again', a && a.kind === 'aithon' && a.echo && a.lanes === 6, a);
    const q0 = await ev(() => ({ q: window.__G.hero.quest, rest: !!window.__G.hero.flags.aithonRest }));
    await ev(async () => { const G = window.__G, C = await import('/src/game/combat.js'), b = G.zone.boss; b.hp = 5; b.hpFloor = 0; C.damage(G.player, b, 999, { crit: false }); });
    await pg.waitForFunction(() => window.__G.hero.flags.legFrom_aithon, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const a1 = await ev(() => { const G = window.__G; return { q: G.hero.quest, leg: !!G.hero.flags.legFrom_aithon, drop: G.pickups.some((p) => p.item?.leg === 'blacksoles'), boss: !!G.zone.boss && !G.zone.boss.dead }; });
    beat('the echo fades: the quest untouched, the first fall drops Blacksoles', a1.q === q0.q && a1.leg && a1.drop && !a1.boss, { ...a1, q0 });
    // Ragna
    const r = await fight('vigil', 'ragna');
    beat('Ragna\'s echo rises in a dark hall, shutters up, the Flame burning and not yet bare', r && r.kind === 'ragna' && r.echo && r.shut === 0 && r.flame?.used && r.flame.prompt === 'flame8.bank', r);
    await ev(() => { const b = window.__G.zone.boss; b.hp = b.hpMax * 0.04; });
    await pg.waitForFunction(() => window.__G.zone.act8.flame.used === false, null, { timeout: 60000 }).catch(() => {});
    const r1 = await ev(() => ({ bare: window.__G.zone.act8.flame.used === false, shut: window.__G.zone.act8.shut }));
    beat('at her floor the Flame is bare, the shutters down by her life', r1.bare && r1.shut >= 7, r1);
    await ev(async () => { const { emit } = await import('/src/ui/bus.js'), z = window.__G.zone; emit('flame8', z.act8.flame, z); });
    await pg.waitForFunction(() => window.__G.hero.flags.legFrom_ragna, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForFunction(() => window.__G.zone.act8.shut === 8 && window.__G.zone.act8.flame.mesh?.userData && window.__G.zone.act8.flame.used, null, { timeout: 90000 }).catch(() => {});
    await pg.waitForTimeout(3000);
    const r2 = await ev(() => { const G = window.__G, z = G.zone; return { q: G.hero.quest, leg: !!G.hero.flags.legFrom_ragna, drop: G.pickups.some((p) => p.item?.leg === 'vigilRing'), shut: z.act8.shut, act: G.hero.act8, flamePrompt: z.act8.flame.prompt, used: z.act8.flame.used }; });
    beat('banked, the echo fades: the hall light again, the quest and the act untouched, the Vigil Ring dropped', r2.q === 55 && r2.leg && r2.drop && r2.shut === 8 && r2.used, r2);
    // the two legendaries worn
    const L = await ev(async () => {
      const G = window.__G, I = await import('/src/game/items.js'), S = await import('/src/game/stats.js'), C = await import('/src/game/combat.js'), A = await import('/src/game/actors.js'), pl = G.player;
      // (the legendary's own lines only: the items' rolled stats cleared, the same two worn without their powers first;
      // no Name said, Arna's first-blow +40% would read as the ring's)
      const ring = I.makeItem(52, { rar: 3, leg: 'vigilRing', cls: G.hero.cls }), boots = I.makeItem(52, { rar: 3, leg: 'blacksoles', cls: G.hero.cls });
      ring.stats = {}; boots.stats = {}; G.hero.names.said = [null, null, null];
      G.hero.equip.ring1 = { ...ring, leg: undefined, rar: 2 }; G.hero.equip.boots = { ...boots, leg: undefined, rar: 2 }; S.refreshStats();
      const before = { critD: G.stats.critD, move: G.stats.move };
      G.hero.equip.ring1 = ring; G.hero.equip.boots = boots; S.refreshStats();
      const after = { critD: G.stats.critD, move: G.stats.move, legs: [...G.stats.legs] };
      const f = A.spawnMonster('goblin', pl.x + 3, pl.z); G.actors.push(f); f.hp = f.hpMax = 1e7; f.aggro = false; f.speed = 0;
      G.stats.critC = 0;
      const hit = () => { const b = f.hp; C.damage(pl, f, 1000, {}); return Math.round(b - f.hp); };
      // (thorns and a Challenge's return are not her striking: the pause is kept through them)
      pl.strikeT = G.time - 5; C.damage(pl, f, 50, { quiet: true, noFx: true, noLoh: true, noRes: true }); C.damage(pl, f, 50, { crit: false, quiet: true }); const rested = hit();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const next = hit();
      pl.hp = pl.hpMax; pl.iframes = 0; const bl = G.stats.block; G.stats.block = 0;
      let h0 = pl.hp; C.damage(null, pl, 400, { pure: true, burn: 10 }); const burnHit = h0 - pl.hp; pl.hp = pl.hpMax;
      h0 = pl.hp; C.damage(null, pl, 400, { pure: true }); const plain = h0 - pl.hp; pl.hp = pl.hpMax; G.stats.block = bl;
      return { before, after, rested, next, burnHit, plain, ringName: I.itemName(ring), bootsName: I.itemName(boots) };
    });
    beat('worn: +25% critical damage, +10% move speed', L.after.critD === L.before.critD + 25 && L.after.move === L.before.move + 10 && L.after.legs.includes('vigilRing') && L.after.legs.includes('blacksoles'), L);
    beat('the Vigil Ring: after 4 s still, a certain critical; the next blow at once is not', L.rested > L.next * 1.5 && Math.abs(L.rested / L.next - (1 + L.after.critD / 100)) < 0.02, { rested: L.rested, next: L.next, critD: L.after.critD });
    beat('Blacksoles: a blow that carries a burn hurts 30% less', Math.abs(L.burnHit / L.plain - 0.7) < 0.02, { burnHit: L.burnHit, plain: L.plain });
    beat('their names in Greek', /Μαυροπάτια/.test(L.bootsName) && /Αγρύπνιας/.test(L.ringName), { boots: L.bootsName, ring: L.ringName });
  },
  async gn8() {
    await open('auto=town&lvl=52&flags=act7,act8,aithonRest,ragnaRest,flameWoken,leifName&quest=55&nopacks');
    // the act's blessing: offered once the act is done (hero.act8), three cards under its own header
    const b = await ev(async () => { const G = window.__G, S = await import('/src/game/story.js'); G.hero.act8 = 0; G.hero.boons = (G.hero.boons || []).slice(0, 7); S.offerBoons(); await new Promise((r) => setTimeout(r, 600)); const cards = [...document.querySelectorAll('[data-a^="boon:"]')].map((e) => e.dataset.a); const head = document.querySelector('.act-h')?.textContent; return { cards, head }; });
    beat('Act VIII\'s blessing offered: three, under «Η φωτιά που κοιμάται»', b.cards.length === 3 && b.cards.includes('boon:ashlid') && /κοιμάται|sleeps/.test(b.head || ''), b);
    await ev(() => { document.querySelector('[data-a="boon:ashlid"]')?.click(); });
    await pg.waitForTimeout(800);
    const lp0 = await ev(() => ({ boon: window.__G.hero.boons[7], lifePct: window.__G.stats.lifePct }));
    // the three in Whitecliff, each with a touch beside them
    await pg.waitForFunction(() => window.__G.zone.interact.filter((i) => i.kind === 'gn8').length >= 3, null, { timeout: 30000 }).catch(() => {});
    const g0 = await ev(() => window.__G.zone.interact.filter((i) => i.kind === 'gn8').map((i) => ({ who: i.g.who, prompt: i.prompt, d: +Math.hypot(i.x - i.a.x, i.z - i.a.z).toFixed(2) })));
    beat('in Whitecliff: Halda, Leif\'s father, Elianthe, each a touch beside them', ['halda', 'father', 'elianthe'].every((w) => g0.some((g) => g.who === w)) && g0.every((g) => g.d > 0.8 && g.d < 2), g0);
    // where she stands decides: at the side, the good night; straight in front, their talk (Halda's anvil, Elianthe's shop)
    const pick = await ev(async () => { const W = await import('/src/game/world.js'), G = window.__G, pl = G.player, it = G.zone.interact.find((i) => i.kind === 'gn8' && i.g.who === 'halda'), a = it.a, f = a.home ?? a.rot; pl.x = it.x; pl.z = it.z; const side = W.nearestInteract()?.kind; pl.x = a.x + Math.sin(f) * 1.1; pl.z = a.z + Math.cos(f) * 1.1; const front = W.nearestInteract()?.kind; return { side, front, hint: !!G.hero.flags.gnHint }; });
    beat('at her side the good night, in front her talk; the hint given once', pick.side === 'gn8' && pick.front === 'npc' && pick.hint, pick);
    // Halda by hand: the touch of a second, her line, and she lies down
    await ev(() => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'gn8' && i.g.who === 'halda'); G.player.x = it.x; G.player.z = it.z; it.use(); });
    await pg.waitForFunction(() => window.__G.hero.flags.gn_halda && window.__G.actors.some((a) => a.kind === 'smith' && a.gnAsleep), null, { timeout: 60000 }).catch(() => {});
    const h1 = await ev(() => { const G = window.__G, a = G.actors.find((x) => x.kind === 'smith'), talk = G.zone.interact.find((i) => i.kind === 'npc' && i.actor === a); return { flag: !!G.hero.flags.gn_halda, asleep: !!a?.gnAsleep, clip: a?.avatar?.actName ?? a?.avatar?.anim?.actName, talkShut: !!talk?.used, left: G.zone.interact.some((i) => i.kind === 'gn8' && i.g.who === 'halda') }; });
    beat('Halda: banked by hand, a line, asleep on the ground, her anvil shut till next time', h1.flag && h1.asleep && h1.clip === 'lie' && h1.talkShut && !h1.left, h1);
    // the other two, and three more elsewhere (their zones' own touches: here only the flags)
    await ev(async () => { const { emit } = await import('/src/ui/bus.js'), G = window.__G, z = G.zone; for (const w of ['father', 'elianthe']) { const it = z.interact.find((i) => i.kind === 'gn8' && i.g.who === w); if (it) emit('goodnight8', it, z); } });
    await pg.waitForFunction(() => window.__G.hero.flags.gn_father && window.__G.hero.flags.gn_elianthe, null, { timeout: 60000 }).catch(() => {});
    const W = await ev(async () => { const W = await import('/src/game/world.js'), G = window.__G, F = G.hero.flags; const sel = W.GN8.find((g) => g.who === 'selna'); const five = W.gnOpen(sel, F); F.gn_brokka = F.gn_elati = true; const still = W.gnOpen(sel, F); F.gn_glaukos = true; const six = W.gnOpen(sel, F); return { n: W.gnCount(), five, still, six }; });
    beat('Selna waits for the other six', !W.five && !W.still && W.six && W.n === 6, W);
    // the seventh (as at the Farthest Light): Tern takes her watch; gnAll; the blessing x1.25
    await ev(async () => { const { emit } = await import('/src/ui/bus.js'), W = await import('/src/game/world.js'), G = window.__G, z = G.zone; const a = G.actors.find((x) => x.kind === 'healer'); emit('goodnight8', { g: W.GN8.find((g) => g.who === 'selna'), a, x: a.x, z: a.z }, z); });
    await pg.waitForFunction(() => window.__G.hero.flags.gnAll, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(800);
    const lp1 = await ev(() => ({ all: !!window.__G.hero.flags.gnAll, lifePct: window.__G.stats.lifePct }));
    beat('seven: gnAll, and Halda\'s Lid from +12% to +15% life', lp0.boon === 'ashlid' && lp1.all && lp1.lifePct - lp0.lifePct === 3, { lp0, lp1 });
    // she wakes when the hero comes back
    await ev(() => window.__G.zone.interact.find((i) => i.kind === 'exit' && i.to === 'tinder')?.use());
    await pg.waitForFunction(() => window.__G.zone.id === 'tinder', null, { timeout: 90000 }).catch(() => {}); await pg.waitForTimeout(1500);
    await ev(() => window.__G.zone.interact.find((i) => i.kind === 'exit' && i.to === 'town')?.use());
    await pg.waitForFunction(() => window.__G.zone.id === 'town', null, { timeout: 90000 }).catch(() => {}); await pg.waitForTimeout(2500);
    const back = await ev(() => { const G = window.__G, a = G.actors.find((x) => x.kind === 'smith'), talk = G.zone.interact.find((i) => i.kind === 'npc' && i.actor === a); return { zone: G.zone.id, asleep: !!a?.gnAsleep, clip: a?.avatar?.actName ?? a?.avatar?.anim?.actName, talk: talk ? !talk.used : null, gn: G.zone.interact.filter((i) => i.kind === 'gn8').length }; });
    beat('back in Whitecliff: Halda up again at her anvil, no touch left to make', back.zone === 'town' && !back.asleep && back.clip !== 'lie' && back.talk && back.gn === 0, back);
  },
  async gnfar() {
    // the four Good Nights outside Whitecliff, each in their own zone as a hero who finished the act finds it
    const { fx7 } = await import('./fixtures7.mjs');
    const six = ['halda', 'father', 'elianthe', 'brokka', 'elati', 'glaukos'].map((w) => 'gn_' + w);
    for (const [who, zone, kind] of [['brokka', 'halls', 'brokka'], ['elati', 'weep', 'elati'], ['glaukos', 'drained', 'glaukos'], ['selna', 'farlight', 'selna']]) {
      const extra = ['act8', 'aithonRest', 'ragnaRest', 'flameWoken', 'leifName', ...(who === 'selna' ? six : [])];
      await open(fx7('act7', zone, { flags: extra, quest: 55, lvl: 52 }) + '&nopacks');
      await pg.waitForFunction((w) => window.__G.zone.interact.some((i) => i.kind === 'gn8' && i.g.who === w), who, { timeout: 30000 }).catch(() => {});
      const s0 = await ev(async ([who, kind]) => { const W = await import('/src/game/world.js'), T = await import('/src/i18n/i18n.js'), G = window.__G, z = G.zone, pl = G.player;
        const as = G.actors.filter((a) => a.team === 'npc' && a.kind === kind), it = z.interact.find((i) => i.kind === 'gn8' && i.g.who === who);
        if (!it) return { zone: z.id, people: as.length, offered: false, npcs: G.actors.filter((a) => a.team === 'npc').map((a) => a.kind) };
        const from = { x: pl.x, z: pl.z }, reach = z.map.reaches ? !!z.map.reaches(from.x, from.z, [{ x: it.x, z: it.z }]) : null;
        pl.x = it.x; pl.z = it.z; const near = W.nearestInteract()?.kind;
        return { zone: z.id, people: as.length, offered: true, d: +Math.hypot(it.x - it.a.x, it.z - it.a.z).toFixed(2), floor: !z.map.solid(Math.floor(it.x), Math.floor(it.z)), reach, near, prompt: T.t(it.prompt), line: T.t('d.gn.' + who), clip0: W.avAct(it.a.avatar) }; }, [who, kind]);
      beat(who + ': stands in ' + zone + ', one of the kind, the touch offered at the side on open floor', s0.zone === zone && s0.people === 1 && s0.offered && s0.d > 0.8 && s0.d < 2.3 && s0.floor !== false && s0.reach !== false && s0.near === 'gn8' && s0.prompt && !/^gn\./.test(s0.prompt) && s0.line && !/^d\.gn\./.test(s0.line), s0);
      if (!s0.offered) continue;
      await pg.screenshot({ path: out + '/gnfar-' + who + '-0.png' });
      await ev((who) => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'gn8' && i.g.who === who); G.player.x = it.x; G.player.z = it.z; it.use(); }, who);
      await pg.waitForFunction(([who, kind]) => window.__G.hero.flags['gn_' + who] && window.__G.actors.some((a) => a.kind === kind && a.gnAsleep), [who, kind], { timeout: 90000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      const s1 = await ev(async ([who, kind]) => { const W = await import('/src/game/world.js'), G = window.__G, a = G.actors.find((x) => x.kind === kind), talk = G.zone.interact.find((i) => i.kind === 'npc' && i.actor === a); return { flag: !!G.hero.flags['gn_' + who], asleep: !!a?.gnAsleep, clip: W.avAct(a?.avatar), talkShut: talk ? !!talk.used : true, left: G.zone.interact.some((i) => i.kind === 'gn8' && i.g.who === who), n: W.gnCount(), all: !!G.hero.flags.gnAll }; }, [who, kind]);
      await pg.screenshot({ path: out + '/gnfar-' + who + '-1.png' });
      beat(who + ': the touch by hand, the line, lying asleep, the talk put away', s1.flag && s1.asleep && s1.clip === 'lie' && s1.talkShut && !s1.left && (who !== 'selna' || (s1.n === 7 && s1.all)), s1);
    }
  },
  async founder() {
    await open('auto=tinder&lvl=50&flags=act7&quest=49&nopacks');
    // (the Names' clock, G.time: it stood at 0 in v23-v24)
    const c0 = await ev(() => window.__G.time); await pg.waitForTimeout(1500); const c1 = await ev(() => window.__G.time);
    beat('the game clock runs', c1 > c0 + 0.05, { c0, c1 });
    const use = (k) => ev((k) => { const G = window.__G, it = G.zone.act8.hearths.find((h) => h.k === k); G.player.x = it.x + 1.5; G.player.z = it.z; it.use(); }, k);
    const n0 = await ev(() => ({ learnt: [...(window.__G.hero.names?.learnt || [])] }));
    beat('before the fires: the eighth Name is not known', !n0.learnt.includes('founder'), n0);
    await use(1); await pg.waitForTimeout(2500);
    beat('the first memory teaches nothing', !(await ev(() => window.__G.hero.names.learnt.includes('founder'))));
    await use(2);
    await pg.waitForFunction(() => window.__G.hero.names?.learnt?.includes('founder'), null, { timeout: 30000 }).catch(() => {});
    const n1 = await ev(() => ({ flag: !!window.__G.hero.flags.mem8_2, learnt: [...window.__G.hero.names.learnt] }));
    beat('the second memory: mem8_2 and the Name learnt', n1.flag && n1.learnt.includes('founder'), n1);
    // the panel shows her tile, lit
    const tile = await ev(async () => { const { emit } = await import('/src/ui/bus.js'); emit('openPanel', 'skills'); await new Promise((r) => setTimeout(r, 400)); const b = [...document.querySelectorAll('[data-a="ptab:2"], [data-a^="ptab"]')].pop(); b?.click(); await new Promise((r) => setTimeout(r, 400)); const t = document.querySelector('[data-a="nsel:founder"]'); const r = t ? { text: t.textContent, lock: t.classList.contains('lock') } : null; (await import('/src/ui/panels.js')).close(); return r; });
    beat('her tile in the Names tab, lit', tile && /Γρηγορία|Grigoria/.test(tile.text) && !tile.lock, tile);
    // said (in the village a Name is said; here it is written as the panel would), two goblins near, then one
    // (sleepB: the second one lies asleep for this blow; set after the frames, as standing beside her it would wake)
    const hit = (sleepB) => ev(async (sleepB) => {
      const G = window.__G, C = await import('/src/game/combat.js'), a = window.__A;
      a.hp = a.hpMax = 1e7; const before = a.hp; G.player.buffs.call = 0; if (G.player.n7) G.player.n7.call.until = -Infinity;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (sleepB) window.__B.dormant = true;
      C.damage(G.player, a, 1000, { crit: false }); window.__B.dormant = false; return Math.round(before - a.hp);
    }, sleepB);
    await ev(async () => { const G = window.__G, A = await import('/src/game/actors.js'), pl = G.player; G.hero.names.said = ['founder', null, null]; for (const a of G.actors) if (a.team === 'foe' && !a.prop) a.dead = true; window.__A = A.spawnMonster('goblin', pl.x + 3, pl.z); window.__B = A.spawnMonster('goblin', pl.x - 4, pl.z + 2); G.actors.push(window.__A, window.__B); window.__immortal = true; for (const a of [window.__A, window.__B]) { a.aggro = false; a.speed = 0; } });
    await pg.waitForTimeout(600);
    const two = await hit();
    const asleep = await hit(true);
    await ev(() => { window.__B.dead = true; });
    const one = await hit();
    const near = await ev(async () => { const A = await import('/src/game/actors.js'), pl = window.__G.player; return A.foes(pl.x, pl.z, 12).map((a) => a.kind + (a.dead ? ' dead' : '')); });
    beat('one foe awake within 12 m: +25%; a second awake: nothing; a second asleep does not count', Math.abs(one / two - 1.25) < 0.02 && Math.abs(asleep / two - 1.25) < 0.02, { two, asleep, one, near });
    await ev(() => { window.__G.hero.names.said = [null, null, null]; });
    const none = await hit();
    beat('unsaid, nothing', Math.abs(none / two - 1) < 0.02, { none, two });
    // Deep: the last one's blows hurt her 15% less
    const hurt = (deep) => ev(async (deep) => { const G = window.__G, C = await import('/src/game/combat.js'), pl = G.player; G.hero.names.said = ['founder', null, null]; G.hero.names.deep = deep ? ['founder'] : []; pl.hp = pl.hpMax; pl.iframes = 0; const s = G.stats.block; G.stats.block = 0; const b = pl.hp; C.damage(window.__A, pl, 500, { pure: true }); G.stats.block = s; const lost = b - pl.hp; pl.hp = pl.hpMax; return lost; }, deep);
    const kept = await hurt(false), deep = await hurt(true);
    beat('Deep: the last foe hurts 15% less', kept > 0 && Math.abs(deep / kept - 0.85) < 0.02, { kept, deep });
  },
  async road() {
    await open('auto=town&lvl=30&q=1');
    beat('no South Road before Act VII is done', !(await ev(() => window.__G.zone.interact.some((i) => i.to === 'tinder'))));
    await open('auto=town&lvl=46&flags=act7&q=1');
    await ev(() => window.__G.zone.interact.find((i) => i.to === 'tinder').use());
    await pg.waitForFunction(() => window.__G.zone.id === 'tinder', null, { timeout: 60000 }).catch(() => {}); await pg.waitForTimeout(2000);
    beat('the South Road takes her to the Tindergrass', (await ev(() => window.__G.zone.id)) === 'tinder');
    await ev(() => window.__G.zone.interact.find((i) => i.kind === 'exit' && i.to === 'town').use());
    await pg.waitForFunction(() => window.__G.zone.id === 'town', null, { timeout: 60000 }).catch(() => {}); await pg.waitForTimeout(1500);
    beat('and back to Whitecliff, by the road', await ev(() => window.__G.zone.id === 'town' && window.__G.zone.interact.some((i) => i.to === 'tinder')));
  }
};
try { await T[name](); } catch (e) { beat('ran to its end', false, { error: String(e).slice(0, 300) }); }
const fatal = await ev(() => document.querySelector('#fatal')?.textContent || '').catch(() => '');
beat('no error on the page', !errs.length && !fatal, errs.length || fatal ? { errs: errs.slice(0, 3), fatal } : undefined);
console.log(name + ' ' + JSON.stringify({ pass: beats.every((b) => b.ok), failed: beats.filter((b) => !b.ok).map((b) => b.b) }));
for (const b of beats) console.log((b.ok ? 'OK ' : 'XX ') + b.b + (b.info ? ' ' + JSON.stringify(b.info) : ''));
await browser.close();
process.exit(beats.every((b) => b.ok) ? 0 : 1);
