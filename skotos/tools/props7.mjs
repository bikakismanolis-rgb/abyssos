// Act VII's code props, looked at headless (src/world/build7.js): every kind of act7Prop stood in rows beside the hero in
// daylight, each state setter exercised, screenshots into docs/act7-briefs/reports/props7/ (JPEG, 150 KB or less each),
// the triangle count of every kind (tris.json), act7Level run on a mock layout of each zone with the contract's counts
// (the whole-zone budget: 60,000 triangles), dispose7, and no console error.
//   node tools/props7.mjs [--url http://localhost:5311/] [--only shotName] [--q 1]
// Uses a dev server already running (no HMR; it serves the working tree). Exit code 1 on any failed assertion.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/act7-briefs/reports/props7');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const URL0 = arg('url', 'http://localhost:5311/'), ONLY = arg('only', ''), QS = arg('q', '') !== '' ? [+arg('q')] : [1, 0];
fs.mkdirSync(OUT, { recursive: true });
const F = 'act1,act2,act3,act4,act5,after3,newFire,alkyone,coastCall,cradle,coal,coastSeen,hearth,rite,tamMet,glaukosMet';
const fails = [], errors = [];
const check = (ok, msg) => { if (!ok) { fails.push(msg); console.log('FAIL', msg); } };

// the shots: [name, zone, atmosphere row, zoom, [[kind, options, state, dx, dz], ...]]: dx, dz metres from the hero (north
// is -z, the top of the screen). `state` is run in the page on the prop's userData (U)
const SHOTS = [
  ['01-weir', 'town', 'thaw', 1.05, [['weir', { mark: 0 }, '', -6.5, -3], ['weir', { mark: 2 }, 'U.setOpen(true); U.setGlow(1)', -1.5, -3], ['logjam', {}, '', 4, -3.5], ['markStone', { mark: 1 }, '', -3, 1.5], ['markStone', { mark: 4 }, 'U.setGlow(1)', 3, 1.5], ['weir', { great: true, mark: 5 }, 'U.setTurn(0.5)', 5.5, 3]]],
  ['02-slide', 'pass', 'tarn', 1.05, [['cornice', {}, '', -7, -4], ['cornice', {}, 'U.setArmed(false)', -1.5, -4], ['cornice', {}, 'U.setK(0.45)', 4, -4], ['hornStone', {}, '', 8, -2], ['snowTongue', { len: 7 }, '', -5, 0], ['snowTongue', { len: 7 }, 'U.setK(0.5)', 3, 0]]],
  ['03-slide-thaw', 'town', 'thaw', 1.05, [['cornice', {}, '', -6, -3.5], ['cornice', {}, 'U.setArmed(false)', 0, -3.5], ['hornStone', {}, '', 5, -2], ['snowTongue', { len: 7 }, '', -4, 0.5], ['coverRock', {}, '', 4.5, 1.5]]],
  ['04-ice', 'town', 'thaw', 1.05, [['iceBlock', { size: 'small' }, '', -7, -2.5], ['iceBlock', { size: 'big' }, '', -3.5, -2.5], ['iceBlock', { size: 'big' }, 'U.setMelt(0.55)', 0.5, -2.5], ['iceBlock', { size: 'big' }, 'U.setMelt(1)', 4, -2.5], ['iceBlock', { size: 'big' }, 'U.shatter(null, 0); U.layShards(1)', 7.5, -2.5], ['coverIce', {}, '', -4, 2], ['coverRock', {}, '', 4, 2]]],
  ['05-ice-snow', 'pass', 'tarn', 1.05, [['iceBlock', { size: 'small' }, '', -6, -2.5], ['iceBlock', { size: 'big' }, '', -2.5, -2.5], ['iceBlock', { size: 'big' }, 'U.setMelt(0.55)', 1.5, -2.5], ['iceBlock', { size: 'big' }, 'U.shatter(null, 0); U.layShards(1)', 5.5, -2.5], ['coverIce', {}, '', -4, 2], ['coverRock', {}, '', 4, 2], ['boulder', {}, '', 0.5, 2.8]]],
  ['06-dens', 'town', 'thaw', 1.05, [['slab', {}, '', -7.5, 1.5], ['slab', {}, 'U.setOpen(true)', -4, 1.5], ['denMouth', {}, '', -5.5, -4], ['denMouth', { blocked: true, s: 1.25 }, '', 1.5, -4], ['fallenPine', {}, '', -1, 3.2, 1.57], ['boulder', {}, 'U.setRoll(0.8)', 7.5, -1]]],
  ['07-hearths', 'town', 'thaw', 1.05, [['lookHearth', {}, '', -7.5, -3], ['lookHearth', {}, 'U.setLit(true); U.setRank(1)', -4.5, -3], ['lookHearth', {}, 'U.setLit(true); U.setRank(4)', -1.5, -3], ['lookHearth', {}, 'U.setLit(true); U.setRank(6)', 1.5, -3], ['arenaHearth', {}, '', -4.5, 1.8], ['arenaHearth', {}, 'U.setLit(true); U.flash?.(0); U.flare(null, 0.01)', 5, 1]]],
  ['08-hearths-snow', 'pass', 'tarn', 1.05, [['lookHearth', {}, '', -6, -3], ['lookHearth', {}, 'U.setLit(true); U.setRank(1)', -2.5, -3], ['lookHearth', {}, 'U.setLit(true); U.setRank(6)', 1, -3], ['arenaHearth', {}, 'U.setLit(true)', 5.5, -1.5], ['woodpile', {}, '', -5, 1.5], ['woodpile', { half: true }, '', -1.5, 1.5]]],
  ['09-keeper', 'town', 'thaw', 1.05, [['hut', {}, '', -6.5, -3.5], ['hut', { snow: true }, '', -1.5, -3.5, 0.5], ['fold', {}, '', 5.5, -3], ['woodpile', {}, '', -5.5, 1.5], ['woodpile', {}, 'U.setHalf(true)', -2.5, 1.5], ['fieldAnvil', {}, '', 2.5, 1.5], ['bedRoll', {}, '', 5.5, 2, 0.6]]],
  ['10-works', 'pass', 'tarn', 1.05, [['winch', {}, 'U.setIce(1)', -7, -3], ['winch', {}, 'U.setIce(0.5)', -3, -3], ['winch', {}, 'U.setIce(0); U.setOpen(true)', 1, -3], ['markStone', { mark: 3 }, '', 3.8, -2.5], ['lever', {}, 'U.setIce(1)', -6, 1.5], ['lever', {}, '', -2.5, 1.5], ['lever', {}, 'U.setPulled(true)', 2, 1], ['channel', { len: 7 }, '', 2, 1]]],
  ['11-works-thaw', 'town', 'thaw', 1.05, [['winch', {}, 'U.setIce(1)', -6, -3], ['winch', {}, '', -1.5, -3], ['lever', {}, 'U.setIce(1)', -6, 1.5], ['lever', {}, 'U.setPulled(true)', 2.5, -1], ['channel', { len: 7 }, '', 2.5, -1], ['haldaLedge', {}, '', 7.5, -3.5], ['haldaStump', {}, '', 7.5, 2.5]]],
  ['12-dam', 'pass', 'tarn', 1.3, [['piers', { n: 5, gap: 3.6 }, '', 0, -6.5], ['snowBridge', { len: 5 }, '', -6.5, 2.5], ['icePlug', {}, '', -2.5, -1.5], ['icePlug', {}, 'U.setOpen(true)', 3, -1.5], ['haldaStump', {}, '', 8, -1], ['coverIce', {}, '', 3, 3.5]]],
  ['13-wall', 'pass', 'tarn', 1.75, [['iceWall', { w: 22 }, '', 0, -7], ['keladosParts', {}, '', -8, 0], ['keladosParts', {}, 'U.dropPhase(1, false)', -3.5, 0.5], ['keladosParts', {}, 'U.dropPhase(1, false); U.dropPhase(2, false)', 1.5, 0.5], ['keladosParts', {}, 'U.dropPhase(1, false); U.dropPhase(2, false); U.dropPhase(3, false); U.setMoss(1)', 6.5, 0.5]]],
  ['14-kelados', 'town', 'thaw', 1.05, [['keladosParts', {}, '', -6, -1], ['keladosParts', {}, 'U.dropPhase(1, false); U.dropPhase(2, false)', -0.5, -1], ['keladosParts', {}, 'U.dropPhase(1, false); U.dropPhase(2, false); U.dropPhase(3, false); U.setMoss(1)', 5, -1]]],
  ['15-meadow', 'town', 'thaw', 1.05, [['flowers', { n: 220, r: 7 }, '', -3, 0], ['cloudDisc', { r: 6 }, '', 6, -1], ['bedRoll', {}, '', 3, 2.5, 0.4], ['fieldAnvil', {}, '', -6.5, 2.5], ['daySmoke', { w: 2.2, h: 7 }, '', -8, -4.5]]],
  ['16-cloud-snow', 'pass', 'tarn', 1.3, [['cloudDisc', { r: 8 }, '', -5, -1], ['rainbow', { w: 14 }, '', 5, -6], ['lakeThread', { len: 12, drop: 0, w: 0.9 }, '', 7, -4], ['lakeThread', { len: 12, drop: 0, w: 0.9 }, 'U.setK(0.5)', 9, -4], ['daySmoke', { w: 2.2, h: 7 }, '', 2, -5]]]
];

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const tris = {};
for (const q of QS) {
  const zones = [...new Set(SHOTS.filter((s) => !ONLY || s[0].includes(ONLY)).map((s) => s[1]))];
  for (const zone of zones) {
    const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
    pg.on('pageerror', (e) => { errors.push(`q${q} ${zone} pageerror ${e.message.slice(0, 300)}`); console.log('pageerror', e.message.slice(0, 300)); });
    pg.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource|ERR_/.test(m.text())) { errors.push(`q${q} ${zone} console ${m.text().slice(0, 300)}`); console.log('console.error', m.text().slice(0, 300)); } });
    await pg.goto(`${URL0}?auto=${zone}&lvl=40&cls=warden&diff=1&q=${q}&cloud=off&flags=${F}`);
    const ok = await pg.waitForFunction(() => window.__ready && window.__G?.player, null, { timeout: 300000 }).then(() => 1).catch(() => 0);
    if (!ok) { check(false, `q${q} ${zone}: the game did not come up`); await pg.close(); continue; }
    await pg.waitForTimeout(4000);
    // the page's helpers: the daylight row held against the zone's own ticks, a stage group the props stand in
    await pg.evaluate(async () => {
      const B7 = await import('/src/world/build7.js'), gfx = await import('/src/gfx/gfx.js'), AT = await import('/src/world/atmos.js'), GL = await import('/src/world/genlib.js');
      // (three by way of the scene: a bare specifier does not resolve in the page)
      const THREE = { Group: Object.getPrototypeOf(gfx.R.scene.constructor) };
      const G = window.__G, R = gfx.R;
      const T = window.__t7 = { B7, gfx, AT, GL, THREE, G, R, stage: null, made: [] };
      // (a quiet place: nothing of the zone's fights her while the props are looked at)
      for (const a of [...G.actors]) if (a !== G.player && a.hp != null && !a.npc) { try { a.remove(); } catch (e) {} }
      T.row = (name, zoom) => { clearInterval(T.iv); const a = { ...(AT.ATMOS[name] || {}), zoom }; T.iv = setInterval(() => gfx.setAtmosphere(a), 30); gfx.setAtmosphere(a); };
      T.clear = () => { if (T.stage) { B7.dispose7({ all: T.made }); R.scene.remove(T.stage); } T.stage = new THREE.Group(); T.made = []; R.scene.add(T.stage); };
      T.put = (kind, o, state, dx, dz, ry = 0) => {
        const pl = G.player, L = G.zone.L, x = pl.x + dx, z = pl.z + dz, m = B7.act7Prop(kind, o);
        m.position.set(x, GL.groundY(L, x, z), z); m.rotation.y = ry; T.stage.add(m); T.made.push(m);
        if (m.userData.drape) m.userData.drape(L);
        if (state) new Function('U', 'm', state)(m.userData, m);
        return m;
      };
    });
    // ---- every kind answers as a group with children; its triangles ----
    if (q === QS[0] && zone === zones[0]) {
      const kinds = await pg.evaluate(() => {
        const T = window.__t7, out = {};
        for (const k of T.B7.ACT7_KINDS) { const m = T.B7.act7Prop(k, {}); out[k] = { group: !!m.isGroup, kids: m.children.length, kind: m.userData.kind, tris: T.B7.tris7(m), setters: Object.keys(m.userData).filter((n) => typeof m.userData[n] === 'function') }; T.B7.dispose7({ all: [m] }); }
        const un = T.B7.act7Prop('noSuchKind'); out['(unknown)'] = { group: !!un.isGroup, kids: un.children.length, kind: un.userData.kind, tris: 0, setters: [] };
        return out;
      });
      for (const k in kinds) { const v = kinds[k]; if (k === '(unknown)') { check(v.group && v.kids === 0, 'an unknown kind is an empty group'); continue; } check(v.group && v.kids > 0 && v.kind === k, `q${q} act7Prop('${k}') is a group with children (${JSON.stringify(v)})`); tris[k] = { tris: v.tris, setters: v.setters }; }
      console.log('kinds', Object.keys(kinds).length - 1, 'checked at quality', q);
    }
    if (q === 0) {
      const v = await pg.evaluate(() => { const T = window.__t7, bad = []; for (const k of T.B7.ACT7_KINDS) { const m = T.B7.act7Prop(k, {}); if (!m.isGroup || (!m.children.length && k !== 'flowers')) bad.push(k); if (k === 'flowers' && m.userData.count) bad.push('flowers drawn at quality 0'); T.B7.dispose7({ all: [m] }); } return bad; });
      check(!v.length, `q0 kinds (flowers are off at quality 0): ${v}`);
    }
    // ---- the shots ----
    for (const [name, z, row, zoom, items] of SHOTS) {
      if (z !== zone || (ONLY && !name.includes(ONLY))) continue;
      // (quality 0: the shots that carry its own paths: flames, flowers off, snow and ice on snow)
      if (q === 0 && !/hearths-snow|ice-snow|meadow/.test(name)) continue;
      const res = await pg.evaluate(({ row, zoom, items }) => {
        const T = window.__t7; T.clear(); T.row(row, zoom);
        const out = [];
        for (const [kind, o, state, dx, dz, ry] of items) { try { const m = T.put(kind, o, state, dx, dz, ry); out.push(kind + ':' + T.B7.tris7(m)); } catch (e) { out.push(kind + ' ERROR ' + e.message); } }
        return out;
      }, { row, zoom, items });
      for (const r of res) check(!/ERROR/.test(r), `q${q} ${name}: ${r}`);
      await pg.waitForTimeout(2500);
      const file = path.join(OUT, `${name}${q === 1 ? '' : '-q' + q}.jpg`);
      let qual = 62;
      for (;;) { await pg.screenshot({ path: file, type: 'jpeg', quality: qual }); if (fs.statSync(file).size <= 150 * 1024 || qual <= 20) break; qual -= 8; }
      check(fs.statSync(file).size <= 150 * 1024, `${file} is over 150 KB`);
      console.log(`q${q}`, name, Math.round(fs.statSync(file).size / 1024) + ' KB', res.join(' '));
    }
    // ---- act7Level on a mock layout with the contract's counts; the zone budget; dispose7 ----
    if (q === QS[0] && !ONLY) {
      for (const type of ['thaw', 'tarn']) {
        if ((type === 'thaw') !== (zone === 'town')) continue;
        const r = await pg.evaluate(({ type }) => {
          const T = window.__t7, G = T.G, L0 = G.zone.L, pl = G.player; T.clear();
          // the real zone's grid under a mock of gen7's spots, laid on a 9 m lattice round the hero (not a picture of a
          // zone: a count of one, and a run of every branch)
          let n = 0; const at = (o = {}) => { const k = n++, c = k % 9, r = Math.floor(k / 9); return { x: Math.round(pl.x - 36 + c * 9) + 0.5, z: Math.round(pl.z - 30 + r * 9) + 0.5, ...o }; };
          const many = (c, o) => Array.from({ length: c }, () => at(o));
          const flues = (c, kind) => Array.from({ length: c }, (_, i) => { const p = at(); return { x: p.x, z: p.z, dir: i * 0.7, len: 26, w: 4, kind, armed: true, horn: { x: p.x + 2, z: p.z + 2 } }; });
          const S = type === 'thaw'
            ? { camp: at({ r: 8 }), weirs: many(3), fords: many(3), narrows: at(), lookouts: many(3), dens: many(3), slabs: many(8), iceblocks: many(3), huts: [...many(5), at({ fold: true })], arena: at({ r: 17 }), hearth: at(), haldaRim: at({ r: 2 }), den: at(), stair: at() }
            : { camp: at({ r: 8 }), winches: many(3), lookouts: many(3), bridges: many(2), piers: many(7), levers: many(3), seat: at(), plug: { cells: [[Math.floor(pl.x), Math.floor(pl.z) - 20], [Math.floor(pl.x) + 1, Math.floor(pl.z) - 20], [Math.floor(pl.x) + 2, Math.floor(pl.z) - 20]] }, hearth: at(), haldaRim: at({ r: 2 }), wheel: at(), slabs: many(8), iceblocks: many(2) };
          const fl = type === 'thaw' ? flues(11, 'snow') : [...flues(9, 'snow'), ...flues(3, 'water')];
          S.hornStones = fl.filter((f) => f.kind === 'snow').map((f, i) => ({ x: f.horn.x, z: f.horn.z, flue: i }));
          if (type === 'tarn') S.levers = fl.filter((f) => f.kind === 'water').map((f) => ({ x: f.horn.x, z: f.horn.z }));
          const props = [...many(type === 'thaw' ? 9 : 6, { t: 'coverRock' }), ...many(type === 'thaw' ? 2 : 0, { t: 'fallenPine' }), ...many(type === 'tarn' ? 3 : 0, { t: 'coverIce' }), { t: 'oak', x: pl.x, z: pl.z }];
          const mk = (mode) => ({ type, mode, w: L0.w, h: L0.h, seed: 7, cells: L0.cells, hgt: L0.hgt, low: L0.low, spots: S, flues: fl, props });
          const out = {};
          for (const mode of type === 'thaw' ? ['spate', 'green'] : ['full', 'let']) {
            const lvl = { group: T.stage }, A = T.B7.act7Level(mk(mode), lvl, { clouds: 3 });
            let tri = 0; for (const m of A.all) tri += T.B7.tris7(m);
            out[mode] = { tris: tri, props: A.all.length, kept: lvl.act7 === A, counts: Object.fromEntries(Object.entries(A).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length])), singles: Object.fromEntries(['hearth', 'halda', 'den', 'anvil', 'piers', 'wall', 'plug', 'wheel', 'flowers'].map((k) => [k, !!A[k]])), flowers: A.flowers?.userData.count || 0, skipped: [...A.skipped],
              state: type === 'thaw' ? { weirOpen: A.weirs[0]?.mesh.userData.open, armed: A.cornices[0]?.mesh.userData.armed, tongue: A.cornices[0]?.tongue.visible, half: A.lookouts[1]?.pile.userData.half, lit: A.lookouts[0]?.mesh.userData.lit } : { ice: A.winches[0]?.mesh.userData.ice, lever1: A.levers[0]?.mesh.userData.ice, lever2: A.levers[1]?.mesh.userData.ice, plug: A.plug?.userData.open, pulled: A.levers[0]?.mesh.userData.pulled } };
            const kids0 = T.stage.children.length; T.B7.dispose7(A); out[mode].disposed = T.stage.children.length === 0 && A.all.length === 0 && kids0 > 0;
          }
          // (and a layout with nothing in it, and none at all)
          const e1 = T.B7.act7Level({ type, mode: 'x' }, { group: T.stage }), e2 = T.B7.act7Level(null, null);
          out.empty = e1.all.length === 0 && e2.all.length === 0;
          return out;
        }, { type });
        console.log('act7Level', type, JSON.stringify(r));
        tris['zone:' + type] = r;
        for (const mode in r) { if (mode === 'empty') { check(r.empty, `act7Level(${type}) with no spots builds nothing`); continue; } const v = r[mode]; check(v.tris <= 60000, `${type}/${mode}: ${v.tris} triangles, over the zone's 60,000`); check(v.props > 20 && v.kept && v.disposed, `${type}/${mode}: built ${v.props}, kept ${v.kept}, disposed ${v.disposed}`); }
        if (type === 'thaw') { check(r.spate.state.weirOpen === false && r.green.state.weirOpen === true, 'weirs shut in spate, open in green'); check(r.spate.state.armed === true && r.spate.state.tongue === false && r.spate.state.half === true && !r.spate.state.lit, 'thaw first states (armed cornice, hidden tongue, lookout 2 half a pile, hearths cold)'); check(r.green.flowers > 0, 'flowers in the green reading'); }
        else { check(r.full.state.ice === 1 && r.let.state.ice === 0 && r.full.state.lever1 === 0 && r.full.state.lever2 === 1 && r.full.state.plug === false && r.let.state.plug === true, 'tarn first states (winches frozen in full, levers 2-3 iced, plug shut then open)'); }
      }
    }
    await pg.evaluate(() => { const T = window.__t7; T.clear(); clearInterval(T.iv); });
    await pg.close();
  }
}
await b.close();
if (!ONLY) fs.writeFileSync(path.join(OUT, 'tris.json'), JSON.stringify(tris, null, 1));
check(!errors.length, `console errors: ${errors.length}\n  ${errors.slice(0, 8).join('\n  ')}`);
console.log(fails.length ? `props7: ${fails.length} FAILED` : 'props7: all passed');
process.exit(fails.length ? 1 : 0);
