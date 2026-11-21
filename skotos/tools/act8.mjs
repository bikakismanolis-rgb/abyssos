// Act VIII's browser tests (Playwright, headless): BASE=http://localhost:5311/ node tools/act8.mjs <name> [outdir]
//   burn   the Burn: a gust takes a lane she stands in; the fire hits her once for HAZ's share; the lane is spent and
//          black; standing in it again nothing comes; stepping out of a second lane during the inhale she is not touched
//   road   Whitecliff's South Road is there after Act VII, takes her to the Tindergrass and back; absent before
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [, , name = 'burn', out = '/tmp/act8'] = process.argv, BASE = process.env.BASE || 'http://localhost:5311/';
require('node:fs').mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const pg = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
const open = async (q) => { await pg.goto(BASE + '?' + q, { waitUntil: 'load' }); await pg.waitForFunction(() => window.__ready, null, { timeout: 90000 }); await pg.waitForTimeout(1200); };
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
