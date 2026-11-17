// Act VII's gate scenarios (docs/act7-contract.md, Tests; docs/act7-design/40-production.md, "The perf plan", "Memory at a
// cold start"): mem7, perf7, cast7, play7. Merged into tools/scenario.mjs beside scenario7.mjs's table; the four test rules
// hold here too (a named fixture, a switch for what must be bare, places by name, `stage` and `until` on every entry).
//   helpers: { A4, A5, S, logs } of tools/scenario.mjs (S for unload6's WebGL hook, logs for the run's error lines)
import fs from 'node:fs';
import { FX7, fx7, ACT4, ACT5, ACT6, flagsTo7 } from './fixtures7.mjs';
import { perf6Out } from './perf6-terms.mjs';

const BASE = () => process.env.BASE || 'http://localhost:5199/';
const KINDS7 = ['hillWolf', 'goblinMarksman', 'chough', 'denBear', 'snowWorm', 'rockRoller', 'rockScorpion', 'kallisto', 'kelados'];
// each kind's body once the group act7 has landed (a boss's own body when its file is cast, else the shipped one it
// stands on), and the boot bodies its stand-in chain may end in (actors.js STAND_IN; boot: Act I's creatures)
const BODY7 = { hillWolf: ['warg'], goblinMarksman: ['goblinArcher'], chough: ['skua'], denBear: ['rimeBear'], snowWorm: ['deepworm'], rockRoller: ['troll'], rockScorpion: ['spider'], kallisto: ['kallisto', 'amberBear'], kelados: ['kelados', 'stonewarden'] };
const BOOT7 = ['warg', 'goblin', 'goblinArcher', 'goblinShaman', 'spider', 'spiderling', 'troll', 'skeleton', 'ash', 'wraith'];

// ---- in the page: every Act VII kind spawned beside the hero, its body read, and taken away again ----
const SPAWN7 = async (kinds) => {
  const A = await import('/src/game/actors.js'), C = await import('/src/gfx/creatures.js'), D = await import('/src/game/data.js'), G = window.__G, pl = G.player, out = {};
  out.__group = C.groupReady('act7');
  for (const k of kinds) {
    if (!D.MONSTERS[k]) { out[k] = { absent: true }; continue; }
    try {
      const f = G.zone.map.nearestFloor(pl.x + 3, pl.z, 4) || pl, a = A.spawnMonster(k, f.x, f.z, { level: 45, dormant: false }); G.actors.push(a);
      let meshes = 0, bad = 0, flat = 0, maps = 0;
      a.avatar?.group.traverse((o) => { if (!(o.isMesh || o.isSkinnedMesh)) return; meshes++; const ms = [].concat(o.material || []); if (!ms.length || ms.some((m) => !m)) { bad++; return; }
        for (const m of ms) if (m.map) { maps++; const w = m.map.image?.width ?? 0; if (!(w > 1)) flat++; } });
      out[k] = { model: a.avatar?.modelName, want: D.MONSTERS[k].model, standIn: !!a.avatar?.standIn, meshes, maps, bad, flat, radius: +a.radius.toFixed(2) };
      a.hp = 0; a.dead = true; a.remove?.(); const i = G.actors.indexOf(a); if (i >= 0) G.actors.splice(i, 1);
    } catch (e) { out[k] = { error: String(e.message || e) }; }
  }
  return out;
};

export const S7b = ({ A4, A5, S, logs }) => ({
  // ---------- mem7: a cold start into each Act VII zone, the phone's GPU texture by owner (unload6's cold-start half) ----------
  // One cold session into `thaw` (fx7 haldaOut) and one into `tarn` (fx7 tarnSeen), quality 1 (the large maps halved as a
  // phone does). Every texture the registries hold is uploaded and its GPU bytes read through unload6's WebGL hook, by owner:
  // a pack, a people set, a creature file's groups (act6 and act7 among them). `own` is everything on top of boot (the env,
  // village and trees packs, the boot people, Act I's creatures). Gate: own <= 75 MB into each zone; every drawn texture
  // alive, no GL error, no person a stand-in. ZONES=thaw|tarn for one
  mem7: { stage: 'A', until: 'E', q: 'q=0&sim=1&norender&cloud=off', run: async (pg) => {
    const browser = pg.context().browser(); await pg.goto('about:blank');
    const COLD = { thaw: fx7('haldaOut', 'thaw'), tarn: fx7('tarnSeen', 'tarn') }, LIMIT = 75;
    const MEM = async () => {
      const [{ ENV }, { PEOPLE }, { CREATURES }, { R }] = await Promise.all(['/src/gfx/env.js', '/src/gfx/people.js', '/src/gfx/creatures.js', '/src/gfx/gfx.js'].map((u) => import(u)));
      const SETS = { people: ['warden', 'ranger', 'mage', 'wayfarer', 'smith', 'healer', 'villager0', 'villager1', 'villager2'], folk: ['stoneborn', 'stonebornArb', 'runepriest', 'brokka', 'moltenKing'], grove: ['elati', 'linden', 'rootsworn', 'rootswornArcher', 'hollowed', 'mourner', 'amaranthe'], ash: ['lampless', 'ashSpear', 'ashDwarf', 'ashBow', 'ashsmith', 'ivar', 'arna', 'arnaOld', 'isarnBoy', 'hammerhorn', 'karthax'], frost: ['sunken', 'icesinger', 'alkyone', 'selna', 'tern', 'tamarisk', 'glaukos'] };
      // (creatures.js ACT_FILES, with act6 and act7: a file is owned by every group that lists it)
      const ACT = { act1: ['goblin', 'skeleton', 'wolf', 'spider', 'ashspawn', 'troll', 'wight', 'barrowlord'], act2: ['magmahound', 'bat', 'worm', 'golem'], act3: ['elk', 'bear', 'moth', 'mandrake', 'treeman'], act4: ['ashwing', 'smokeeater', 'embertick'], act5: ['crab', 'skotos', 'tentacle', 'icemaw', 'louse', 'skua', 'bear'], act6: ['icemaw', 'louse'], act7: ['bear', 'golem', 'worm', 'skua'] };
      const SL = ['map', 'normalMap', 'aoMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'alphaMap'], owner = new Map();
      const put = (t, who) => { if (t?.isTexture && !owner.has(t)) owner.set(t, who); };
      const mats = (m, who) => { for (const mm of [].concat(m || [])) for (const s of SL) put(mm[s], who); };
      for (const k in ENV.layers) { const i = k.indexOf('/'); if (i > 0) { put(ENV.layers[k].d, 'pack:' + k.slice(0, i)); put(ENV.layers[k].n, 'pack:' + k.slice(0, i)); } }
      for (const k in ENV.props) { const i = k.indexOf('/'); if (i > 0) for (const p of ENV.props[k]) mats(p.mat, 'pack:' + k.slice(0, i)); }
      for (const [set, names] of Object.entries(SETS)) for (const n of names) PEOPLE.scenes[n]?.traverse((o) => { if (o.isMesh) mats(o.material, 'set:' + set); });
      const files = {};
      for (const f in CREATURES.tpl) { const g = 'cr:' + (Object.keys(ACT).filter((a) => ACT[a].includes(f)).join('+') || 'unowned'); files[f] = g; CREATURES.tpl[f].scene.traverse((o) => { if (o.isMesh) mats(o.material, g + '/' + f); }); }
      const gl = R.renderer, P = gl.properties, H = window.__texMem;
      for (const t of owner.keys()) if (!P.get(t).__webglTexture && (t.image?.width || 0) > 1) { try { gl.initTexture(t); } catch (e) { /* a released image */ } }
      const by = {}, seen = new Set();
      for (const [t, who] of owner) { const w = P.get(t).__webglTexture; if (!w || seen.has(w)) continue; seen.add(w); by[who] = (by[who] || 0) + H.of(w); }
      const MB = (b) => +(b / 1048576).toFixed(2), isBoot = (k) => ['pack:env', 'pack:village', 'pack:trees', 'set:people'].includes(k) || k.startsWith('cr:act1/');
      const total = Object.values(by).reduce((s, v) => s + v, 0), boot = Object.keys(by).filter(isBoot).reduce((s, k) => s + by[k], 0);
      // (the act's group alone: the files act7 lists, whoever else lists them)
      const act7 = Object.keys(by).filter((k) => /^cr:.*act7/.test(k)).reduce((s, k) => s + by[k], 0);
      return { total: MB(total), boot: MB(boot), own: MB(total - boot), act7: MB(act7), gl: MB(H.total()), info: gl.info.memory.textures, files, by: Object.fromEntries(Object.entries(by).sort().map(([k, v]) => [k, MB(v)])) };
    };
    const AUDIT = async () => {
      for (let i = 0; i < 4; i++) await new Promise((r) => requestAnimationFrame(() => r()));
      await new Promise((r) => setTimeout(r, 500));
      const [{ R }, U] = await Promise.all([import('/src/gfx/gfx.js'), import('/src/game/unload.js')]);
      const gl = R.renderer, P = gl.properties, tex = U.drawn([R.scene]), bad = [];
      let dead = 0, flat = 0;
      for (const t of tex) {
        const img = t.image, w = img?.width ?? img?.videoWidth ?? 0, on = !!P.get(t).__webglTexture;
        if (typeof ImageData !== 'undefined' && img instanceof ImageData && w === 1) { flat++; bad.push('flat ' + (t.name || t.uuid.slice(0, 8))); }
        else if (!on && !w && !t.isRenderTargetTexture && !t.isDepthTexture) { dead++; bad.push('dead ' + (t.name || t.uuid.slice(0, 8))); }
      }
      const G = window.__G, npcs = G.zone.actors.filter((a) => a.npc && a.avatar && !a.removed).map((a) => a.npc + ':' + a.avatar.modelName + (a.avatar.standIn ? '*' : '')).sort();
      const [E, Pp, C] = await Promise.all(['/src/gfx/env.js', '/src/gfx/people.js', '/src/gfx/creatures.js'].map((u) => import(u)));
      return { n: tex.size, dead, flat, bad: bad.slice(0, 8), err: gl.getContext().getError(), npcs, packs: ['deep', 'wood', 'cinder', 'rime', 'silt', 'melt'].filter((p) => { try { return E.packReady(p); } catch (e) { return false; } }), folk: ['folk', 'grove', 'ash', 'frost'].filter(Pp.folkReady), groups: ['act2', 'act3', 'act4', 'act5', 'act6', 'act7'].filter(C.groupReady) };
    };
    const whole = (a) => a.dead === 0 && a.flat === 0 && a.err === 0 && !a.npcs.some((x) => x.endsWith('*'));
    const beats = [], cold = {};
    for (const z of (process.env.ZONES || 'thaw,tarn').split(',')) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      try {
        const p = await ctx.newPage();
        p.on('pageerror', (e) => logs.push('pageerror(mem7 ' + z + '): ' + e.message));
        await p.addInitScript(S.unload6.init);
        await p.addInitScript(() => { setInterval(() => { const G = window.__G; if (G?.player) { G.player.hp = G.player.hpMax; G.player.dead = false; } }, 50); });
        const t0 = Date.now();
        await p.goto(BASE() + '?' + COLD[z] + '&q=1');
        await p.waitForFunction((z) => window.__G?.zone?.id === z && window.__G.mode === 'play', z, { timeout: 300000 });
        await p.waitForTimeout(2500);
        cold[z] = await p.evaluate(MEM); cold[z].audit = await p.evaluate(AUDIT); cold[z].loadS = +((Date.now() - t0) / 1000).toFixed(1);
        console.log('mem7 ' + z + ' ' + JSON.stringify(cold[z]));
        beats.push({ b: `a cold start into ${z}: its own phone texture ${cold[z].own} MB, within ${LIMIT} MB`, ok: cold[z].own <= LIMIT, x: { own: cold[z].own, boot: cold[z].boot, total: cold[z].total } });
        beats.push({ b: `${z} drawn whole: every texture alive, no GL error, no person a stand-in`, ok: whole(cold[z].audit), x: cold[z].audit });
        beats.push({ b: `${z}: the creature group act7 landed, and no creature file unowned`, ok: cold[z].audit.groups.includes('act7') && !Object.values(cold[z].files).includes('cr:unowned'), x: cold[z].files });
      } catch (e) { beats.push({ b: 'a cold start into ' + z, ok: false, x: e.message.split('\n')[0] }); } finally { await ctx.close(); }
    }
    return { pass: beats.length > 0 && beats.every((b) => b.ok), failed: beats.filter((b) => !b.ok).map((b) => b.b), limit: LIMIT, cold, beats };
  } },

  // ---------- perf7: perf6's method at Act VII's five spots (docs/act7-contract.md, G1; 40-production.md, "The perf plan") ----------
  // A phone (915 x 412 at a pixel ratio of 1.5, isMobile), the adaptive resolution pinned at 1, the Field of Ash drawn in
  // the same cycle, the three terms of tools/perf6-terms.mjs: vsField (the whole frame against the Field carrying the same
  // crowd), world (the spot's world alone against the bare Field, draws only), crowd (the bodies' own cost, reported).
  // The spots, each chosen by name from the layout (L.spots, L.flues[].area, L.clouds) and staged with what exists today:
  //  meadow    thaw: the Water-meadow, the brooks at their clock's top and the Race at 1.2 (no weir): the dry cell between
  //            the Race's south bank and the camp with the most pines in view (the tree-shadow worst case), then
  //            the most water; 25 actors (looters, hill-wolves, choughs)
  //  chutes    thaw: the flank, between the two nearest flank chutes, both running (fireFlue; the frame held in the 'fire'
  //            state, the white sheets down both lanes); 20 actors
  //  den       thaw: the Den's bowl, two of its three chutes running, four falling rocks (forge.js drip with shard: the
  //            stand-in for Kallisto's rocks) and a Den-bear at Kallisto's size (her fight is not built)
  //  snowfield tarn: open snow in the Snowfield, the clouds' clock set where the most cloud discs are in view (HAZ7.clouds
  //            of them sail; the renderer shows as many as its quality allows); 20 actors
  //  dam       tarn: the Dam's arena, a sluice lane (the first lever's channel) and both chutes running, the lake full;
  //            a Stonewarden at Kelados's size and two Rock-rollers (his fight is not built)
  // The hero carries fixtures7's flags for the zone (thawSeen / tarnSeen) while in it and the Field's own (none) on the Field.
  // Bar: vsField and world <= 1.00 at quality 1; quality 0 no slower than quality 1 + 5%.
  // Env: QS ('1,0'), CYCLES (5), K (3), CR (4), PAD (24), SEEDS ('5,3,3': Field, thaw, tarn), ONLY (spots, comma-separated),
  // SOLO=1 (term 3's rounds with the bodies alone too), CREW=0 (no actors), NOUNLOAD=1, SHOTS (the JPEGs' folder:
  // docs/act7-briefs/reports/stageA/perf7). A full run is long and always runs alone
  perf7: { stage: 'A', until: 'E', q: 'world=town&q=0&noenv', run: async (pg, shot) => {
    const browser = pg.context().browser(), base = BASE();
    await pg.goto('about:blank');
    const QS = (process.env.QS || '1,0').split(','), CYC = +(process.env.CYCLES || 5), K = +(process.env.K || 3), CR = +(process.env.CR || 4), PAD = +(process.env.PAD || 24), SOLO = process.env.SOLO === '1', out = {};
    const seeds = (process.env.SEEDS || '5,3,3').split(',').map(Number), ALL = ['meadow', 'chutes', 'den', 'snowfield', 'dam'];
    const spots = process.env.ONLY ? ALL.filter((s) => process.env.ONLY.split(',').includes(s)) : ALL, zones = ['ashfield', ...spots];
    const dir = process.env.SHOTS || 'docs/act7-briefs/reports/stageA/perf7'; fs.mkdirSync(dir, { recursive: true });
    const FL = { thaw: [...ACT4, ...ACT5, ...ACT6, ...flagsTo7('thawSeen')], tarn: [...ACT4, ...ACT5, ...ACT6, ...flagsTo7('tarnSeen')] };
    const staged = {}, t00 = Date.now();
    for (const Q of QS) {
      const T3 = +Q >= 1;
      const ctx = await browser.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => logs.push('pageerror(perf7 q' + Q + '): ' + e.message));
      p.on('console', (m) => { if (m.type() === 'error') logs.push('perf7 q' + Q + ': ' + m.text()); });
      await p.addInitScript(() => {
        const raf = window.requestAnimationFrame.bind(window);
        window.__cb = []; window.__rn = 0;
        window.requestAnimationFrame = (f) => raf((t) => { const t0 = performance.now(), r0 = window.__rn; f(t); if (window.__rn !== r0) window.__cb.push(performance.now() - t0 - (window.__rn - r0)); if (window.__cb.length > 60) window.__cb.shift(); });
      });
      // (&nostory: the Act VII zones entered past their scenes, so no line or memory holds the world while it is timed)
      await p.goto(base + '?auto=ashfield&q=' + Q + '&lvl=30&seed=' + seeds[0] + '&cloud=off&nostory' + (process.env.NOUNLOAD === '1' ? '&nounload' : ''));
      try { await p.waitForFunction(() => window.__G?.player && window.__G.zone && window.__G.mode === 'play', null, { timeout: 400000 }); } catch (e) { out['q' + Q] = 'no zone'; await ctx.close(); continue; }
      await p.evaluate(async (seeds) => {
        window.__immortal = true;
        const h = window.__G.hero, R = window.__R;
        h.seeds = Object.assign(h.seeds || {}, { ['thaw@' + h.diff]: seeds[1], ['tarn@' + h.diff]: seeds[2] });
        window.__f0 = JSON.stringify(h.flags);
        // (the act's bodies on the Field too, so its like-for-like crowd is drawn as the spot's)
        await (await import('/src/gfx/creatures.js')).loadCreatures('act7');
        const r0 = R.renderer.render.bind(R.renderer);
        R.renderer.render = (s, c) => { const t0 = performance.now(); r0(s, c); window.__rn += performance.now() - t0; };
      }, seeds);
      const visit = (spot, crowds, warm) => p.evaluate(async ({ spot, K, CR, PAD, solo, crew, crowds, warm, FL }) => {
        const G = window.__G, R = window.__R, D = window.__D, fx = await import('/src/gfx/fx.js'), gfx = await import('/src/gfx/gfx.js');
        const W = await import('/src/game/world.js'), { SEA } = await import('/src/world/sea.js'), Ac = await import('/src/game/actors.js'), Fg = await import('/src/game/forge.js'), S7 = await import('/src/game/sun7.js');
        const zone = spot === 'ashfield' ? 'ashfield' : spot === 'snowfield' || spot === 'dam' ? 'tarn' : 'thaw';
        if (G.zone.id !== zone) {
          // (the zone's fixture flags while in it; the Field's own on the Field, so it is built as perf5's and perf6's)
          const F = G.hero.flags; for (const k of Object.keys(F)) delete F[k]; Object.assign(F, JSON.parse(window.__f0)); if (FL[zone]) for (const k of FL[zone]) F[k] = true;
          await W.zoneReady(zone); D.enterZone(zone);
        }
        const z = G.zone, L = z.L, S = L.spots, w = L.w, frame = () => new Promise((ok) => requestAnimationFrame(() => { gfx.updateCamera(0, G.player.x, G.player.z, true); ok(); }));
        for (const pk of z.packs) pk.spawned = true;
        for (const a of G.actors.slice()) if (a.team === 'foe') { a.remove?.(); G.actors.splice(G.actors.indexOf(a), 1); }
        z.bossSpawned = true;
        // the water at the spot's level: the brooks (the clock's cells) at their top, the Race or the lake where the flags have it
        const lv = spot === 'ashfield' ? null : (L.tideCfg?.hMax ?? 0.6), bay = spot === 'ashfield' ? 0 : (z.tide?.mh ?? W.raceLevel(zone));
        const NX = 48, NY = 22, cam = R.camera, V3 = cam.position.constructor, foot = [];
        gfx.updateCamera(0, w / 2, L.h / 2, true); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
          const v = new V3(((i + 0.5) / NX) * 2 - 1, ((j + 0.5) / NY) * 2 - 1, 0.5).unproject(cam).sub(cam.position);
          if (v.y >= -1e-4) continue;
          const t = -cam.position.y / v.y; foot.push([cam.position.x + v.x * t - w / 2, cam.position.z + v.z * t - L.h / 2]);
        }
        const bb = foot.reduce((b, [dx, dz]) => [Math.min(b[0], dx), Math.max(b[1], dx), Math.min(b[2], dz), Math.max(b[3], dz)], [1e9, -1e9, 1e9, -1e9]);
        const cell = (x, zz) => { const cx = Math.floor(x), cz = Math.floor(zz); return cx < 0 || cz < 0 || cx >= w || cz >= L.h ? -1 : cz * w + cx; };
        const wetAt = (i) => i >= 0 && !!L.pocket?.[i] && L.bed[i] < (L.pocket[i] === 2 ? bay : lv) - 0.02;
        const share = (x, zz, f) => { let n = 0; for (const [dx, dz] of foot) if (f(x + dx, zz + dz)) n++; return n / foot.length; };
        const wetIn = (x, zz) => share(x, zz, (a, b) => wetAt(cell(a, b)));
        const inView = (x, zz, q, m = 1) => q.x >= x + bb[0] * m && q.x <= x + bb[1] * m && q.z >= zz + bb[2] * m && q.z <= zz + bb[3] * m;
        const dry = (i) => L.cells[i] && !L.pocket?.[i] && z.map.walkable(i % w + 0.5, Math.floor(i / w) + 0.5);
        const best = (ok, score) => { let b = null; for (let i = 0; i < L.cells.length; i++) { if (!dry(i)) continue; const x = i % w + 0.5, zz = Math.floor(i / w) + 0.5; if (!ok(x, zz)) continue; const s = score(x, zz); if (!b || s > b.s) b = { x, z: zz, s }; } return b; };
        const hyp = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
        // a chute's or a sluice's lane (the layout's record: forge.js inFlue without the line of sight)
        const inLane = (f, x, zz, pad = 0) => { const ux = Math.sin(f.dir), uz = Math.cos(f.dir), dx = x - f.x, dz = zz - f.z, u = dx * ux + dz * uz, v = -dx * uz + dz * ux; return u >= -0.3 && u <= f.len && Math.abs(v) <= f.w / 2 + pad; };
        const FLU = L.flues || [], idx = (f) => FLU.indexOf(f), clear = (x, zz) => !FLU.some((f) => inLane(f, x, zz, 1.5));
        const lanesIn = (fs, x, zz) => fs.reduce((s, f) => s + Math.min(0.12, share(x, zz, (a, b) => inLane(f, a, b))), 0);
        let v = null, fire = [], info = {};
        if (spot === 'ashfield') v = { x: S.camp.x, z: S.camp.z - 8 };
        else if (spot === 'meadow') {
          const z0 = Math.max(...S.fords.map((q) => q.z1)) + 2, z1 = S.camp.z - S.camp.r, pines = L.props.filter((q) => q.t === 'pine');
          v = best((x, zz) => zz >= z0 && zz <= z1 && clear(x, zz), (x, zz) => wetIn(x, zz) + pines.filter((q) => inView(x, zz, q, 0.8)).length / 4);
          info = { wet: +wetIn(v.x, v.z).toFixed(3), pines: pines.filter((q) => inView(v.x, v.z, q, 0.8)).length };
        } else if (spot === 'chutes') {
          const fl = FLU.filter((f) => f.kind === 'snow' && f.area === 'flank').sort((a, b) => a.x - b.x); let pr = null;
          for (let i = 0; i + 1 < fl.length; i++) { const d = hyp(fl[i], fl[i + 1]); if (!pr || d < pr.d) pr = { d, a: fl[i], b: fl[i + 1] }; }
          fire = [pr.a, pr.b];
          const mid = { x: (pr.a.x + pr.b.x) / 2, z: (pr.a.z + pr.b.z) / 2 + pr.a.len / 2 };
          v = best((x, zz) => hyp({ x, z: zz }, mid) < 14 && clear(x, zz), (x, zz) => lanesIn(fire, x, zz) - hyp({ x, z: zz }, mid) * 0.0005);
        } else if (spot === 'den') {
          const fl = FLU.filter((f) => f.kind === 'snow' && f.area === 'den'), A = S.arena;
          let b0 = null; for (let i = 0; i < fl.length; i++) for (let j = i + 1; j < fl.length; j++) { const c = best((x, zz) => hyp({ x, z: zz }, A) < A.r - 3 && clear(x, zz), (x, zz) => lanesIn([fl[i], fl[j]], x, zz) + wetIn(x, zz) * 0.5); if (c && (!b0 || c.s > b0.s)) b0 = { ...c, fs: [fl[i], fl[j]] }; }
          v = b0; fire = b0.fs;
        } else if (spot === 'snowfield') {
          const fl = FLU.filter((f) => f.area === 'field'), z0 = Math.min(...fl.map((f) => f.z)) - 2, z1 = Math.max(...fl.map((f) => f.z)) + 2, I = S.islands?.find((q) => q.lookout) || S.lookouts[0];
          v = best((x, zz) => zz >= z0 && zz <= z1 && clear(x, zz) && hyp({ x, z: zz }, I) < 16, (x, zz) => share(x, zz, (a, b) => { const i = cell(a, b); return i >= 0 && L.snow[i] >= 1 && !!L.cells[i]; }) - hyp({ x, z: zz }, I) * 0.0005);
        } else if (spot === 'dam') {
          const A = S.arena, sl = FLU.find((f) => f.kind === 'water' && f.lever === 1) || FLU.find((f) => f.kind === 'water'), ch = FLU.filter((f) => f.kind === 'snow' && f.area === 'dam');
          fire = [sl, ...ch].filter(Boolean);
          v = best((x, zz) => hyp({ x, z: zz }, A) < A.r - 2 && clear(x, zz), (x, zz) => lanesIn(fire, x, zz) + wetIn(x, zz) * 0.5);
        }
        const f = z.map.nearestFloor(v.x, v.z);
        G.player.x = f.x; G.player.z = f.z;
        gfx.updateCamera(0, G.player.x, G.player.z, true);
        // the clouds' clock where the most discs lie over what the camera sees (the same moment every visit)
        if (z.sun?.clouds?.length) {
          let bt = null; for (let t = 0; t < S7.SUN.period; t += 3) { S7.setSunT(z, t); const n = z.sun.clouds.filter((q) => !q.off && q.x + q.r >= f.x + bb[0] && q.x - q.r <= f.x + bb[1] && q.z + q.r >= f.z + bb[2] && q.z - q.r <= f.z + bb[3]).length, d = z.cloudAt(f.x, f.z) ? 0.5 : 0; if (!bt || n + d > bt.n) bt = { t, n: n + d }; }
          S7.setSunT(z, bt.t); info.clouds = { sail: z.sun.clouds.length, inView: Math.floor(bt.n), over: bt.n % 1 > 0, t: bt.t };
        }
        R.prScale = 1; R.renderer.setPixelRatio(R.basePR); R.renderer.setSize(R.w, R.h, false); R.lastResize = 1e15;
        const gl = R.renderer.getContext(), px = new Uint8Array(4);
        const draw = () => { R.lost = false; R.skyHook?.(); R.renderer.render(R.scene, R.camera); R.lost = true; gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
        const time = () => { draw(); const t = []; for (let i = 0; i < K; i++) { const t0 = performance.now(); draw(); t.push(performance.now() - t0); } return +Math.min(...t).toFixed(1); };
        const place = new Map(), spawn = (list) => list.map((c) => { const q = z.map.nearestFloor(c.x, c.z, 3) || c, a = D.spawnMonster(c.kind, q.x, q.z, { dormant: false, ...c.o }); G.actors.push(a); place.set(a, c); return a; });
        const drop = (list) => { for (const a of list) { if (!a.removed) a.remove?.(); const i = G.actors.indexOf(a); if (i >= 0) G.actors.splice(i, 1); } };
        const hide = (list, on) => { for (const a of list) { a.avatar.group.visible = !on; if (a.mesh) a.mesh.visible = !on; } Ac.updateShadows(); };
        const rounds = (list, both = solo, n = CR) => {
          const av = new Set(G.actors.concat(G.player).map((a) => a.avatar?.group).filter(Boolean)), rest = R.scene.children.filter((o) => o.visible && !av.has(o) && !o.isLight && !o.isCamera), r = [];
          for (let i = 0; i < n; i++) {
            hide(list, false); const on = time(); hide(list, true); const off = time();
            if (!both) { r.push([on, off]); continue; }
            rest.forEach((o) => { o.visible = false; }); hide(list, false); const aon = time(); hide(list, true); const aoff = time(); rest.forEach((o) => { o.visible = true; });
            r.push([on, off, aon, aoff]);
          }
          hide(list, false);
          return r;
        };
        // the slides and the sluice of the spot set running, the game let run until each is in its 'fire' state with its
        // sheet down the whole lane (a third of the fire's time in), the rocks falling: the frame the timing holds
        const stage = async () => {
          const list = Fg.flues() || [], fs = fire.map((q) => list[idx(q)]).filter(Boolean); if (!fs.length) return null;
          // (a dialog or a panel pauses the world (boot.js tick): read on, closed)
          if (document.querySelector('#dialog:not([hidden])')) D.emit('key', 'enter'); if (G.panel) D.closePanel?.();
          // the slides run by the game's own clock steps, 0.05 s at a time, without drawing (a phone-sized frame here takes the
          // better part of a second, and the game's frame step is capped: 2.8 s of warning drawn in real frames took a minute):
          // forge.js tickFlues and the telegraphs' and particles' fx.updateFX, each step as a frame would run them; a spent
          // chute waited out the same way, then each fired (fireFlue), and stopped once both are in their 'fire' state with
          // the front down the whole lane (BREATH.fire x 0.62 left: the sheet runs its length in the first third)
          const step = () => { Fg.tickFlues(0.05); fx.updateFX(0.05, G.player.x, G.player.z); };
          for (let i = 0; i < 400 && fs.some((q) => q.st !== 'idle'); i++) step();
          for (const q of fs) Fg.fireFlue(q.i);
          let rocks = 0;
          for (let i = 0; i < 400; i++) {
            step();
            if (!fs.every((q) => q.st === 'fire')) continue;
            // (the Den: four rocks off the walls round her, as Kallisto's roar brings them: their warning circles and falls)
            if (spot === 'den' && !rocks) for (const [dx, dz] of [[-4, -3], [3, -5], [5, 2], [-2, 4]]) { const q = z.map.nearestFloor(G.player.x + dx, G.player.z + dz, 2); if (q) { Fg.drip(q.x, q.z, 1.2, 0.3, { color: 0xb8b0a4, mult: 0, shard: true }); rocks++; } }
            if (fs.every((q) => q.t <= Fg.BREATH.fire * 0.62)) break;
          }
          return { flues: fs.map((q) => ({ i: q.i, kind: q.kind, area: q.area, st: q.st, t: +q.t.toFixed(2) })), rocks };
        };
        const run = async (actors, withStage) => {
          // (the particles 12 s ahead first: the slides' own snow and sheets are then a moment old, as they are in play)
          for (let i = 0; i < 120; i++) fx.updateFX(0.1, G.player.x, G.player.z);
          window.__cb.length = 0;
          for (let i = 0; i < 6; i++) await frame();
          // (with slides: staged, then three real frames with them running (the game's logic timed over those; the rocks'
          // falls are timers of the game's), the front still down the lane)
          const st = withStage ? await stage() : null;
          if (st) { window.__cb.length = 0; for (let i = 0; i < 3; i++) await frame(); }
          const lg = window.__cb.slice(st ? 0 : 2).sort((a, b) => a - b), logic = lg[lg.length >> 1] ?? 0;
          if (st) st.after = (Fg.flues() || []).filter((q) => st.flues.some((f) => f.i === q.i)).map((q) => q.st + ' ' + q.t.toFixed(2));
          const mode0 = G.mode; G.mode = 'hold'; R.lost = true;
          gfx.updateCamera(0, G.player.x, G.player.z, true); gfx.frame(0.016);
          if (lv != null) { SEA.uLevel.value = lv; SEA.uWetLevel.value = lv; SEA.uBayLevel.value = bay; }
          for (const a of actors) if (!a.removed && !a.dead && a.avatar) { const c = place.get(a) || a; a.under = false; a.hidden = false; a.x = c.x; a.z = c.z; a.y = 0; a.avatar.group.visible = true; a.avatar.group.position.set(c.x, 0, c.z); a.mesh?.position.set(c.x, a.mesh.position.y, c.z); }
          Ac.updateShadows();
          const d = time(), ri = R.renderer.info.render;
          return { logic: +logic.toFixed(1), draw: d, calls: ri.calls, tris: ri.triangles, staged: st, done: () => { R.lost = false; G.mode = mode0; } };
        };
        if (spot === 'ashfield') {
          const m = await run([]); m.done();
          const res = { ms: +(m.draw + m.logic).toFixed(1), draw: m.draw, logic: m.logic, calls: m.calls, tris: m.tris, wet: 0, actors: 0, pools: 0, lights: R.pool.filter((l) => l.intensity > 0).length, at: [+f.x.toFixed(1), +f.z.toFixed(1)], pr: R.renderer.getPixelRatio(), crowd: {} };
          for (const [k, list] of crowds) {
            const as = spawn(list.map((c) => ({ ...c, x: f.x + c.dx, z: f.z + c.dz }))), c = await run(as), vis = as.filter((a) => !a.removed && a.avatar?.group.visible), r = rounds(vis, solo, crowds.some(([q]) => q === k + '+') ? 0 : CR); c.done();
            res.crowd[k] = { ms: +(c.draw + c.logic).toFixed(1), draw: c.draw, logic: c.logic, calls: c.calls, actors: vis.length, rounds: r };
            drop(as);
          }
          return res;
        }
        // ---- a spot: its crowd on screen (cells 2.5-11 m from her, a cell apart, in a fixed scatter; in a lane too, as the
        // packs stand: a slide carries them and the timing puts each back on its place) ----
        const places = [];
        if (crew) {
          const h = (i) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); return (x ^ (x >>> 16)) >>> 0; };
          const cand = [];
          for (const [dx, dz] of foot) { const x = Math.floor(f.x + dx * 0.8) + 0.5, zz = Math.floor(f.z + dz * 0.8) + 0.5, d = Math.hypot(x - f.x, zz - f.z), i = cell(x, zz); if (i < 0 || d < 2.5 || d > 11 || !z.map.walkable(x, zz)) continue; cand.push({ x, z: zz, i, k: h(i) }); }
          cand.sort((a, b) => a.k - b.k);
          for (const c of cand) if (!places.some((q) => hyp(q, c) < 1.2)) places.push(c);
        }
        const list = [];
        let pi = 0;
        const put = (kind, n, o = {}) => { for (let k = 0; k < n && pi < places.length; k++) { const q = places[pi++]; list.push({ kind, x: q.x, z: q.z, o }); } };
        if (crew && spot === 'meadow') { put('goblin', 10); put('goblinMarksman', 4); put('goblinShaman', 2); put('hillWolf', 5); put('chough', 4); }
        if (crew && spot === 'chutes') { put('goblin', 8); put('goblinMarksman', 4); put('hillWolf', 4); put('rockScorpion', 4); }
        if (crew && spot === 'den') {
          // (Kallisto: a Den-bear at her size, between the hero and the den's mouth)
          const d = S.den || S.arena, dd = hyp(f, d) || 1; list.push({ kind: 'denBear', x: f.x + (d.x - f.x) / dd * 5, z: f.z + (d.z - f.z) / dd * 5, o: { scale: 2.1 / 1.25 } });
          put('hillWolf', 2);
        }
        if (crew && spot === 'snowfield') { put('hillWolf', 8); put('snowWorm', 5); put('chough', 7); }
        if (crew && spot === 'dam') {
          // (Kelados: a Stonewarden at his size, between the hero and his seat)
          const d = S.seat, dd = hyp(f, d) || 1; list.push({ kind: 'stonewarden', x: f.x + (d.x - f.x) / dd * 6, z: f.z + (d.z - f.z) / dd * 6, o: { scale: 2.3 } });
          put('rockRoller', 2);
        }
        const P7 = { actors: spawn(list) };
        const m = await run(P7.actors, true);
        const padded = crew && list.length && list.length < PAD / 2, shown = P7.actors.filter((a) => !a.removed && a.avatar?.group.visible), r = rounds(shown, solo, padded || warm ? 1 : CR);
        const wet = +wetIn(G.player.x, G.player.z).toFixed(3);
        // (the picture of the held frame: the page's own JPEG of the canvas, in the same task as its draw; 150 KB or under)
        let jpg = null;
        if (warm) { draw(); for (const q of [0.72, 0.6, 0.5, 0.4, 0.3, 0.22]) { jpg = R.renderer.domElement.toDataURL('image/jpeg', q); if (jpg.length * 0.75 <= 150000) break; } }
        m.done();
        let r3 = null, list3 = null, staged3 = null;
        if (padded) {
          list3 = list.slice();
          for (let k = 0; list3.length < PAD && pi < places.length; k++) { const c = list[k % list.length], q = places[pi++]; list3.push({ kind: c.kind, x: q.x, z: q.z, o: c.o }); }
          const more = spawn(list3.slice(list.length)), all = P7.actors.concat(more);
          if (!warm) { const m3 = await run(all, true); staged3 = m3.staged; r3 = rounds(all.filter((a) => !a.removed && a.avatar?.group.visible)); m3.done(); }
          drop(more);
        }
        window.__p7 = P7;
        const rel = (l) => l && l.map((c) => ({ kind: c.kind, dx: +(c.x - f.x).toFixed(2), dz: +(c.z - f.z).toFixed(2), o: c.o }));
        const kinds = {}; for (const c of list) kinds[c.kind] = (kinds[c.kind] || 0) + 1;
        return { ms: +(m.draw + m.logic).toFixed(1), draw: m.draw, logic: m.logic, rounds: r, rounds3: r3, calls: m.calls, tris: m.tris, wet, actors: shown.length, pools: 0, lights: R.pool.filter((l) => l.intensity > 0).length, at: [+f.x.toFixed(1), +f.z.toFixed(1)], pr: R.renderer.getPixelRatio(),
          staged: { zone, level: { brooks: lv, own: bay }, slides: m.staged, slides3: staged3, kinds, ...info, heavy: !!W.ZONES[zone].heavy }, crowd: rel(list), crowd3: rel(list3), jpg };
      }, { spot, K, CR: T3 ? CR : 1, PAD: T3 ? PAD : 0, solo: T3 && SOLO, crew: process.env.CREW !== '0', crowds, warm, FL });
      const undress = () => p.evaluate(() => { const G = window.__G, P7 = window.__p7; if (!P7) return; for (const a of P7.actors) { if (!a.removed) a.remove?.(); const i = G.actors.indexOf(a); if (i >= 0) G.actors.splice(i, 1); } window.__p7 = null; });
      const Sx = {}, crowds = {};
      for (let c = -1; c < CYC; c++) for (const z of zones) {
        const m = await visit(z, z === 'ashfield' ? Object.entries(crowds).filter(([, l]) => l.length) : [], c < 0);
        if (c < 0) {
          if (m.crowd && z !== 'ashfield') crowds[z] = m.crowd; if (m.crowd3) crowds[z + '+'] = m.crowd3;
          if (m.jpg) { const f = `${dir}/perf7-${z}-q${Q}.jpg`; fs.writeFileSync(f, Buffer.from(m.jpg.split(',')[1], 'base64')); (staged[z] ||= {}).shot = (staged[z].shot || []).concat({ q: +Q, f, kb: Math.round(fs.statSync(f).size / 1024) }); }
          if (z !== 'ashfield') Object.assign((staged[z] ||= {}), m.staged);
        }
        delete m.jpg;
        await undress();
        if (c < 0) continue;
        (Sx[z] ||= []).push(m);
        console.log('perf7 q' + Q + ' cycle ' + c + ' ' + z + ' ' + JSON.stringify(z === 'ashfield' ? m : { ...m, crowd: m.crowd.length, crowd3: m.crowd3?.length }));
      }
      Object.assign(out, perf6Out(Sx, zones, spots, Q, { T3, SOLO }));
      await ctx.close();
    }
    for (const z of zones) if (out[z + '@q0']?.ms && out[z + '@q1']?.ms) out[z + '@q0'].floor = out[z + '@q0'].ms <= out[z + '@q1'].ms * 1.05;
    out.staged = staged; out.minutes = +((Date.now() - t00) / 60000).toFixed(1);
    out.over = spots.filter((z) => out[z + '@q1'] && !out[z + '@q1'].pass).map((z) => `${z}: vsField ${out[z + '@q1'].vsField}, world ${out[z + '@q1'].world}`);
    out.pass = spots.every((z) => out[z + '@q1']?.pass) && zones.every((z) => out[z + '@q0']?.floor !== false);
    fs.writeFileSync(`${dir}/perf7${process.env.ONLY ? '-' + spots.join('-') : ''}.json`, JSON.stringify(out, null, 1));
    return out;
  } },

  // ---------- cast7: the act's creatures in a cold session (docs/act7-contract.md, Enemies; Expected assets) ----------
  // For each zone, a cold session that begins in Whitecliff (the group act7 not asked for yet): every Act VII kind spawns
  // with a drawn, textured boot body (its stand-in chain's end: never a missing or untextured model, no error); then
  // through the zone's waypoint, the group landed: every kind spawns with its real body (data.js's model, no stand-in; the
  // two bosses on the shipped body they stand on until their own files are cast). And a cold start straight into the zone:
  // the real bodies again
  cast7: { stage: 'B', until: 'E', q: 'q=0&sim=1&norender&cloud=off', run: async (pg) => {
    const browser = pg.context().browser(); await pg.goto('about:blank');
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) }), seen = {};
    const FXZ = { thaw: 'thawSeen', tarn: 'tarnSeen' }, TAIL = '&sim=2&q=0&norender&cls=warden&nopacks';
    const drawn = (v) => v && !v.error && !v.absent && v.meshes > 0 && !v.bad && !v.flat && !!v.model;
    const check = (z, when, r, real) => {
      for (const k of KINDS7) {
        const v = r[k]; if (v?.absent) { beat(`${z}, ${when}: ${k} has no row yet`, k === 'kallisto' || k === 'kelados', v); continue; }
        if (real) beat(`${z}, ${when}: ${k} in its real body (${v?.model || '?'})`, drawn(v) && BODY7[k].includes(v.model) && (v.model === v.want || k === 'kallisto' || k === 'kelados'), v);
        else beat(`${z}, ${when}: ${k} in a boot stand-in body (${v?.model || '?'})`, drawn(v) && BOOT7.includes(v.model), v);
      }
    };
    for (const z of (process.env.ZONES || 'thaw,tarn').split(',')) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      try {
        const p = await ctx.newPage();
        p.on('pageerror', (e) => logs.push('pageerror(cast7 ' + z + '): ' + e.message));
        await p.goto(BASE() + '?' + fx7(FXZ[z], 'town') + TAIL);
        await p.waitForFunction(() => window.__ready && window.__G?.player && window.__G.zone?.id === 'town' && window.__G.mode === 'play', null, { timeout: 240000 });
        const a = await p.evaluate(SPAWN7, KINDS7);
        beat(`${z}: a cold session in Whitecliff has not asked for the group act7`, a.__group === false, a.__group);
        check(z, 'before the group lands', a, false);
        await p.evaluate((z) => window.__D.emit('travel', z, { at: 'waypoint' }), z);
        await p.waitForFunction((z) => window.__G.zone?.id === z && window.__G.mode === 'play' && !document.getElementById('fade').classList.contains('on'), z, { timeout: 300000 });
        const at = await p.evaluate(() => { const G = window.__G, w = G.zone.L.spots.waypoint; return +Math.hypot(G.player.x - w.x, G.player.z - w.z).toFixed(1); });
        const b = await p.evaluate(SPAWN7, KINDS7);
        beat(`${z}: through its waypoint (the hero ${at} m from it), the group act7 landed`, b.__group === true && at < 6, { group: b.__group, at });
        check(z, 'the group landed', b, true);
        seen[z] = { before: Object.fromEntries(KINDS7.map((k) => [k, a[k]?.model || (a[k]?.absent ? '-' : '!')])), after: Object.fromEntries(KINDS7.map((k) => [k, b[k]?.model || (b[k]?.absent ? '-' : '!')])) };
      } catch (e) { beat('cast7 ' + z, false, e.message.split('\n')[0]); } finally { await ctx.close(); }
      // (a cold start straight into the zone)
      const c2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      try {
        const p = await c2.newPage();
        p.on('pageerror', (e) => logs.push('pageerror(cast7 cold ' + z + '): ' + e.message));
        await p.goto(BASE() + '?' + fx7(FXZ[z], z) + TAIL);
        await p.waitForFunction((z) => window.__ready && window.__G?.player && window.__G.zone?.id === z && window.__G.mode === 'play', z, { timeout: 300000 });
        const c = await p.evaluate(SPAWN7, KINDS7);
        beat(`${z}: a cold start into it: the group act7 landed before the zone opens`, c.__group === true, c.__group);
        check(z, 'a cold start into it', c, true);
      } catch (e) { beat('cast7 cold ' + z, false, e.message.split('\n')[0]); } finally { await c2.close(); }
    }
    return { pass: beats.every((x) => x.ok), failed: beats.filter((x) => !x.ok).map((x) => x.b), seen, beats };
  } },

  // ---------- play7: the act's critical path, walked (docs/act7-contract.md, Scenarios by stage; G5) ----------
  // A god-mode Warden from fx7_new in Whitecliff goes the act's way by named spots (L.spots) and by the path's own
  // interacts: town, Halda (q40), the Pass's waypoint, the goat track, the Meltwaters' camp, weir 1, the west ford, weirs
  // 2 and 3, the Narrows, the Den (Kallisto), the Water-stair, the Hanging Lake's camp, winches 1-3, the Dam (Kelados),
  // the great wheel, home. A row { beat, ok } for each; a beat the game cannot do yet is a row with todo: true, and the
  // flags its interacts would have saved are then set by hand (named in the row) so the walk goes on. The todo rows are
  // counted and reported, and fail the scenario only with GATE=G5 (the contract: no todo row left at G5)
  play7: { stage: 'A', until: 'E', q: FX7.fx7_new('town') + '&sim=4&q=0&norender&cls=warden', run: async (pg) => {
    const rows = [], t0 = Date.now(), ev = (f, a) => pg.evaluate(f, a);
    const snap = () => ev(() => { const G = window.__G; return { q: G.hero.quest, zone: G.zone?.id }; });
    const row = async (beat, ok, x) => { const r = { beat, ok: !!ok, ...(await snap()), s: +((Date.now() - t0) / 1000).toFixed(0), ...(x !== undefined ? { x } : {}) }; rows.push(r); console.log('play7 ' + JSON.stringify(r)); return r.ok; };
    // (a beat the game cannot do yet: reported, and its flags given by hand, then the zone's interacts set as those flags
    // have them (world.js act7Presence, what the story's own rest scenes call))
    const todo = async (beat, why, flags = [], quest) => { await ev(async ({ flags, quest }) => { const G = window.__G; for (const k of flags) G.hero.flags[k] = true; if (quest != null) G.hero.quest = Math.max(G.hero.quest, quest); if (flags.length && G.zone?.act7) (await import('/src/game/world.js')).act7Presence(G.zone); }, { flags, quest }); const r = { beat, ok: false, todo: true, why, byHand: flags.length ? flags.join(',') + (quest != null ? ' (quest ' + quest + ')' : '') : undefined, ...(await snap()) }; rows.push(r); console.log('play7 ' + JSON.stringify(r)); };
    const done = (fn, ms = 20000, arg) => A5.until(pg, fn, ms, arg);
    const calm = () => done(() => !window.__G.cine && window.__G.mode === 'play' && !document.getElementById('fade').classList.contains('on'), 120000);
    const at = (name) => ev((name) => { const G = window.__G; let o = G.zone.L.spots; for (const k of name.split('.')) o = o?.[k]; if (!o) return null; const st = o.stand || o, p = G.zone.map.nearestFloor(st.x, st.z, 4); if (!p) return null; G.player.x = p.x; G.player.z = p.z; G.player.act = null; return { x: p.x, z: p.z, walk: G.zone.map.walkable(st.x, st.z) }; }, name);
    const reach = (a, b) => ev(([a, b]) => { const G = window.__G, m = G.zone.map, get = (n) => { let o = G.zone.L.spots; for (const k of n.split('.')) o = o?.[k]; return o && (o.stand || o); }; const p = get(a), q = get(b); if (!p || !q) return null; const pa = m.nearestFloor(p.x, p.z, 3), pb = m.nearestFloor(q.x, q.z, 3); return pa && pb ? m.reaches(pa.x, pa.z, [pb]) : null; }, [a, b]);
    const use = (kind, k) => ev(({ kind, k }) => { const z = window.__G.zone, it = z.interact.find((i) => i.kind === kind && (k == null || i.k === k)); if (!it) return 'none'; if (it.used) return 'used'; it.use(); return 'ok'; }, { kind, k });
    const exit = (to) => ev((to) => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'exit' && i.to === to); if (!it) return 'none'; const f = z.map.nearestFloor(it.x, it.z + 1.2, 3) || it; G.player.x = f.x; G.player.z = f.z; G.player.act = null; it.use(); return it.locked && !G.hero.flags[it.locked] ? 'locked:' + it.locked : 'ok'; }, to);
    const inZone = (id, ms = 300000) => pg.waitForFunction((id) => window.__G.zone?.id === id && !document.getElementById('fade').classList.contains('on'), id, { timeout: ms }).then(() => true).catch(() => false);
    const level = (h) => done((h) => Math.abs((window.__G.zone.tide?.mh ?? -9) - h) < 0.01, 40000, h);
    const boss = (kind) => ev((kind) => { const z = window.__G.zone; return z.boss?.kind === kind || z.bossSpot?.kind === kind || window.__G.actors.some((a) => a.kind === kind && !a.removed); }, kind);
    await A5.tick(pg); await A4.listen(pg);
    await ev(() => { window.__immortal = true; window.__tough = true; });
    // ---- Whitecliff ----
    const s0 = await ev(() => { const h = window.__G.hero; return { quest: h.quest, act7: h.act7, zone: window.__G.zone.id, cls: h.cls }; });
    await row('town: a v22 Warden at quest 39, the act not begun', s0.zone === 'town' && s0.quest === 39 && s0.act7 === -1 && s0.cls === 'warden', s0);
    // ---- q40: the call, and Halda gone up ahead ----
    if (await done(() => !!window.__G.hero.flags.call7, 30000)) {
      // (the morning scene, the child, then q40: its dialogs advanced as they come)
      await done(() => window.__G.hero.quest >= 40 && !window.__G.cine, 240000); await calm();
      await row('the call in Whitecliff: the morning, the child (call7, q40)', await ev(() => window.__G.hero.quest >= 40));
      const u = await A5.use(pg, "z.interact.find((i) => i.kind === 'npc' && i.npc === 'smith')");
      if (await done(() => !!window.__G.hero.flags.haldaOut, 120000)) { await calm(); await row('Halda at the staff, gone up ahead (haldaOut, q41)', await ev(() => window.__G.hero.quest >= 41), u); }
      else await todo('Halda gone up to the goat track (haldaOut)', 'her word in Whitecliff does not save haldaOut yet (story, stage D)', ['haldaOut'], 41);
    } else await todo('Halda: the call (q40)', 'no hook in Whitecliff yet for a hero at quest 39 (hook7, stage D)', ['call7', 'haldaOut'], 41);
    // ---- the Pass ----
    await calm(); await A5.travel(pg, 'pass', 'waypoint').catch(() => {});
    await row('the Pass, at its waypoint', (await snap()).zone === 'pass');
    const ex = await exit('thaw');
    if (ex === 'none') await row('the goat track at the Pass\'s camp', false, ex);
    else { const ok = ex === 'ok' && await inZone('thaw'); await row('the goat track at the Pass\'s camp: the way up, open with haldaOut', ok, ex); if (!ok) { await A5.travel(pg, 'thaw', 'waypoint').catch(() => {}); } }
    // ---- the Meltwaters ----
    await calm();
    const c1 = await ev(() => { const G = window.__G, c = G.zone.L.spots.camp; return { d: +Math.hypot(G.player.x - c.x, G.player.z - c.z).toFixed(1), r: c.r, halda: G.zone.actors.some((a) => a.npc === 'smith'), race: G.zone.tide?.mh }; });
    await row('the Meltwaters: the goat track camp, Halda at her fire, the Race at 1.2', c1.d <= c1.r + 4 && c1.halda && Math.abs(c1.race - 1.2) < 0.01, c1);
    for (const k of [1, 2, 3]) {
      const p = await at('weirs.' + (k - 1)), u = await use('weir7', k), ok = u === 'ok' && await level(+(1.2 - 0.3 * k).toFixed(2));
      await calm();
      await row(`weir ${k} turned: the Race down to ${(1.2 - 0.3 * k).toFixed(1)}`, !!p && ok && await ev((k) => !!window.__G.hero.flags['weir' + k], k), { u });
      if (k === 1) { const f = await at('fords.0'), r = await reach('camp', 'weirs.1'); await row('the west ford: open at 0.9, the camp reaches weir 2 over it', f?.walk && r === true, { ford: f, reach: r }); }
    }
    await row('three weirs: quest 42', (await snap()).q === 42);
    const nw = await at('narrows'), rd = await reach('camp', 'arena.mouth');
    await row('the Narrows: its ford open at 0.3, the camp reaches the Den\'s mouth', nw?.walk && rd === true, { narrows: nw, reach: rd });
    await at('arena');
    if (await boss('kallisto')) {
      await done(() => !!window.__G.zone.boss, 30000); await A5.hit(pg, null);
      await row('the Den: Kallisto at rest (kallistoRest, q43)', await done(() => !!window.__G.hero.flags.kallistoRest && window.__G.hero.quest >= 43, 120000));
    } else await todo('the Den: Kallisto', 'her fight is not built (stage C): no boss in the Den', ['kallistoRest'], 43);
    await calm();
    const st = await at('stair'), ex2 = await exit('tarn'), up = ex2 === 'ok' && await inZone('tarn');
    await row('the Water-stair: the cut stair, open once Kallisto rests', !!st && up, ex2);
    if (!up) await A5.travel(pg, 'tarn', 'waypoint').catch(() => {});
    // ---- the Hanging Lake ----
    await calm();
    const c2 = await ev(() => { const G = window.__G, c = G.zone.L.spots.camp; return { d: +Math.hypot(G.player.x - c.x, G.player.z - c.z).toFixed(1), r: c.r, halda: G.zone.actors.some((a) => a.npc === 'smith'), lake: G.zone.tide?.mh }; });
    await row('the Hanging Lake: the Stair\'s Head camp, Halda at her fire, the lake full', c2.d <= c2.r + 4 && c2.halda && Math.abs(c2.lake - 1.2) < 0.01, c2);
    for (const k of [1, 2, 3]) {
      const p = await at('winches.' + (k - 1)); let u = await use('winch7', k);
      // (a winch under a cloud or behind the clock's water waits its moment: tried again for a minute)
      const ok = await done((k) => { const G = window.__G; if (G.hero.flags['winch' + k]) return true; const it = G.zone.interact.find((i) => i.kind === 'winch7' && i.k === k); if (it && !it.used && !G.player.act) it.use(); return false; }, 60000, k);
      await calm();
      await row(`winch ${k} freed`, !!p && ok, { u });
    }
    await done(() => window.__G.hero.quest >= 45 && !window.__G.cine, 120000); await calm();
    await row('three winches: quest 45', (await snap()).q === 45);
    await at('arena');
    if (await boss('kelados')) {
      await done(() => !!window.__G.zone.boss, 30000); await A5.hit(pg, null);
      await row('the Dam: Kelados at rest (keladosRest, q46)', await done(() => !!window.__G.hero.flags.keladosRest && window.__G.hero.quest >= 46, 120000));
    } else await todo('the Dam: Kelados', 'his fight is not built (stage C): no boss at the Dam', ['keladosWake', 'keladosRest'], 46);
    await calm();
    const wh = await at('wheel'), wu = await ev(() => { const G = window.__G, z = G.zone, w = z.L.spots.wheel, it = z.interact.find((i) => i.kind === 'sluice7' && Math.hypot(i.x - w.x, i.z - w.z) < 3); if (!it) return 'none'; it.use(); return it.kind; });
    if (wu !== 'none' && await done(() => !!window.__G.hero.flags.lakeLet, 30000)) { await done(() => !window.__G.cine && !window.__G.zone.letting, 240000); await calm(); await row('the great wheel: the lake let down (lakeLet, q46b)', !!wh && await level(0.3), { wu, lake: await ev(() => window.__G.zone.tide?.mh) }); }
    else await todo('the great wheel', wu === 'none' ? 'no sluice7 interact at L.spots.wheel (it comes with keladosRest)' : 'the wheel did not save lakeLet', ['lakeLet'], 46);
    // ---- home ----
    await calm(); await A5.travel(pg, 'town', 'waypoint').catch(() => {});
    if (await done(() => !!window.__G.hero.flags.act7 && window.__G.hero.quest >= 47, 300000)) { await calm(); await row('home: the dusk, the sleep, the morning; the act\'s close (home7, act7, q47)', await ev(() => (window.__G.hero.act7 ?? -1) >= 0 && !!window.__G.hero.flags.home7)); }
    else await todo('home: the act\'s close (act7, q47)', 'the ending is not built (ending7, stage D)');
    const end = await ev(() => { const h = window.__G.hero, F = h.flags; return { quest: h.quest, act7: h.act7, flags: ['call7', 'haldaOut', 'thawSeen', 'weir1', 'weir2', 'weir3', 'kallistoRest', 'tarnSeen', 'winch1', 'winch2', 'winch3', 'keladosWake', 'keladosRest', 'lakeLet', 'home7', 'act7'].filter((k) => F[k]) }; });
    const todos = rows.filter((r) => r.todo), failed = rows.filter((r) => !r.ok && !r.todo), G5 = process.env.GATE === 'G5';
    return { pass: failed.length === 0 && (!G5 || todos.length === 0), gate: process.env.GATE || null, beats: rows.length, done: rows.filter((r) => r.ok).length, todo: todos.length, todos: todos.map((r) => r.beat), failed: failed.map((r) => r.beat), end, rows };
  } }
});
