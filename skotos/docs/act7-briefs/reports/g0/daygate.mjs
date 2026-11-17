// Stage 0's daylight gate: shipped zones drawn under Act VII's proposed rows, with foes, a telegraph and loot in frame.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ROWS = {
  thaw: { fog: 0x9fb6c6, density: 0.012, sky: 0xbcd6f2, ground: 0x4c5e38, hemi: 1.25, moon: 0xfff0d2, moonI: 2.3, exposure: 1.0, heroI: 0, heroRange: 13, zoom: 1.05 },
  tarn: { fog: 0xc6d6e6, density: 0.010, sky: 0xd2e6ff, ground: 0xa2b2ca, hemi: 1.1, moon: 0xfff8ea, moonI: 2.1, exposure: 0.92, heroI: 0, heroRange: 13, zoom: 1.05 }
};
const F = 'act1,act2,act3,act4,act5,after3,newFire,alkyone,coastCall,cradle,coal,coastSeen,hearth,rite,tamMet,glaukosMet';
const SHOTS = [['weep', 'thaw', 22, ''], ['pass', 'thaw', 14, ''], ['forest', 'thaw', 5, ''], ['coast', 'tarn', 26, ''], ['pass', 'tarn', 14, '']];
for (const q of [1, 0]) for (const [zone, row, quest] of SHOTS) {
  const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
  pg.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 200)));
  await pg.goto(`http://localhost:5311/?auto=${zone}&lvl=40&cls=warden&diff=1&q=${q}&cloud=off&quest=${quest}&flags=${F}`);
  const ok = await pg.waitForFunction(() => window.__ready && window.__G?.player, null, { timeout: 300000 }).then(() => 1).catch(() => 0);
  if (!ok) { console.log('not ready', zone, q); await pg.close(); continue; }
  await pg.waitForTimeout(5000);
  for (const mode of ['shipped', row]) {
    const info = await pg.evaluate(async ({ mode, rows }) => {
      const G = window.__G, gfx = await import('/src/gfx/gfx.js'), W = await import('/src/game/world.js'), A = await import('/src/game/ai.js'), fx = await import('/src/gfx/fx.js');
      const z = G.zone, pl = G.player;
      if (mode !== 'shipped') {
        // (the row held against the zone's own atmosphere ticks)
        const a = rows[mode]; window.__day = setInterval(() => gfx.setAtmosphere(a), 30); gfx.setAtmosphere(a);
        // a pack beside her, a telegraph on the ground, loot dropped
        const p = z.packs.filter((q) => !q.spawned).sort((u, v) => Math.hypot(u.x - pl.x, u.z - pl.z) - Math.hypot(v.x - pl.x, v.z - pl.z))[0];
        if (p) { const f = z.map.nearestFloor(p.x, p.z + 5, 4); pl.x = f.x; pl.z = f.z; }
      }
      return { zone: z.id, lights: gfx.R.lights?.length, exposure: gfx.R.renderer.toneMappingExposure };
    }, { mode, rows: ROWS });
    await pg.waitForTimeout(mode === 'shipped' ? 1500 : 6000);
    if (mode !== 'shipped') await pg.evaluate(async () => { const fx = await import('/src/gfx/fx.js'), G = window.__G, pl = G.player; try { (fx.teleCircle || fx.FX?.teleCircle)?.(pl.x + 2.5, pl.z + 1, 2.4, 3, 0xff4020); } catch (e) {} });
    await pg.waitForTimeout(900);
    await pg.screenshot({ path: `/home/claude/work/day/q${q}-${zone}-${mode}.png` });
    console.log(q, zone, mode, JSON.stringify(info));
  }
  await pg.close();
}
await b.close();
