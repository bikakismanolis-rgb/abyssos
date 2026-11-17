// Act VII's scenarios (docs/act7-contract.md, Tests). The four rules:
//  1 fixtures, not bare zones: every scenario starts from a named save of tools/fixtures7.mjs
//  2 a switch for what must be bare: ?nopacks&nostory, never "the zone is empty this week"
//  3 places by name: spot(pg, 'weirs.0'), never a coordinate or a walk a later stage may gate
//  4 every scenario carries `stage` and `until` ('E': true of the finished act). A gate fails while a scenario whose
//    `until` has passed still exists: node tools/scenario.mjs --stale
import { FX7, fx7 } from './fixtures7.mjs';
export const STAGES = ['0', 'A', 'B', 'C', 'D', 'E'];
// the stage the build is in: moved on by the lead as each gate passes
export const STAGE_NOW = 'A';
const cls = () => process.env.CLS || 'warden';
const Q = (q, extra = '') => q + '&sim=4&q=0&norender&cls=' + cls() + extra;
// a named place of the layout: 'camp', 'weirs.0', 'lookouts.2.hearth'
export const spot = (pg, name) => pg.evaluate((name) => { let o = window.__G.zone.L.spots; for (const k of name.split('.')) o = o?.[k]; return o && { x: o.x, z: o.z }; }, name);
// the hero put on the nearest floor to a named place (a test's own travel: god-mode, no walk)
export const goTo = (pg, name, d = 0) => pg.evaluate(({ name, d }) => { const G = window.__G; let o = G.zone.L.spots; for (const k of name.split('.')) o = o?.[k]; if (!o) return null; const st = o.stand || o, p = G.zone.map.nearestFloor(st.x, st.z + d, 4); if (!p) return null; G.player.x = p.x; G.player.z = p.z; return p; }, { name, d });
const until = (pg, f, ms = 20000, a) => pg.waitForFunction(f, a, { timeout: ms }).then(() => true).catch(() => false);
const use = (pg, kind, k) => pg.evaluate(({ kind, k }) => { const z = window.__G.zone, it = z.interact.find((i) => i.kind === kind && (k == null || i.k === k)); if (!it) return 'none'; if (it.used) return 'used'; it.use(); return 'ok'; }, { kind, k });
const out = (beats) => ({ pass: beats.every((b) => b.ok), failed: beats.filter((b) => !b.ok).map((b) => b.b), beats });

// ---------- what the story's scenarios share (stage D): the page's ears (says, dialog lines, toasts, the story's bus
// events, the music asked for, the black card), dialogs advanced while waiting, a tap on an interactable, a travel, and a
// reload that wakes her where the save left her ----------
const ST = {
  base: () => process.env.BASE || 'http://localhost:5199/',
  open: (pg) => pg.evaluate(async () => {
    window.__immortal = true;
    if (window.__st7) return; window.__st7 = true;
    const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;z-index:99;font-size:1px;color:#000'; document.body.appendChild(d); let k = 0; setInterval(() => { d.textContent = k++ % 2 ? '.' : ':'; }, 20);
    const B = await import('/src/ui/bus.js');
    window.__says = []; window.__dlg = []; window.__toasts = []; window.__ev7 = []; window.__music7 = []; window.__card7 = false;
    B.on('say', (k) => window.__says.push(k));
    B.on('dialog', (x) => window.__dlg.push(...(x.lines || []).map((l) => (Array.isArray(l) ? l[0] : l))));
    B.on('toast', (m) => window.__toasts.push(String(m)));
    for (const e of ['keladosWake', 'haldaLever', 'bossRest']) B.on(e, () => window.__ev7.push(e));
    const A = (await import('/src/audio/audio.js')).default, m0 = A.music.bind(A); A.music = (x) => { window.__music7.push(x); return m0(x); };
    window.__S7 = await import('/src/game/story.js');
    new MutationObserver(() => { if (document.getElementById('titlecard')) window.__card7 = true; }).observe(document.getElementById('app') || document.body, { childList: true });
  }),
  async until(pg, fn, ms = 120000, arg) {
    for (const t0 = Date.now(); Date.now() - t0 < ms;) {
      if (await pg.evaluate(fn, arg)) return true;
      if (await pg.evaluate(() => !!document.querySelector('#dialog:not([hidden])'))) await pg.evaluate(() => window.__D.emit('key', 'enter'));
      await pg.waitForTimeout(250);
    }
    return false;
  },
  use: (pg, find) => pg.evaluate((find) => { const G = window.__G, z = G.zone, it = new Function('z', 'G', 'return ' + find)(z, G); if (!it) return null; const f = z.map.nearestFloor(it.x, it.z + 1.2, 3); G.player.x = f.x; G.player.z = f.z; G.player.act = null; it.use(); return it.kind; }, find),
  told: (pg, keys) => pg.evaluate((keys) => keys.every((k) => window.__toasts.includes(window.__D.t(k))), keys),
  spoke: (pg, keys) => pg.evaluate((keys) => keys.every((k) => window.__dlg.includes(k)), keys),
  log: (pg) => pg.evaluate(() => ({ quest: window.__G.hero.quest, dlg: window.__dlg.slice(-6), says: window.__says.slice(-4), toasts: window.__toasts.slice(-4) })),
  async travel(pg, to, at) {
    await pg.evaluate(([to, at]) => window.__D.emit('travel', to, { at }), [to, at]);
    await pg.waitForFunction((to) => window.__G.zone?.id === to && !document.getElementById('fade').classList.contains('on'), to, { timeout: 300000 });
    await pg.waitForTimeout(400);
  },
  async reload(pg) {
    await pg.goto(ST.base() + '?q=0&sim=4&norender&cloud=off&nopacks&cls=' + cls());
    await pg.waitForFunction(() => window.__ready && window.__G?.save, null, { timeout: 240000 });
    await pg.evaluate(() => { const S = window.__G.save; window.__D.emit('startHero', S.heroes.find((h) => h.id === S.last) || S.heroes[0], false); });
    await pg.waitForFunction(() => window.__G?.zone && window.__G.player && (window.__G.mode === 'play' || window.__G.mode === 'cine'), null, { timeout: 240000 });
    await ST.open(pg);
  }
};

// ---------- stage B/C helpers: a test's own spawns and measures (Act VII's creatures and bosses) ----------
const KIND7 = ['hillWolf', 'goblinMarksman', 'chough', 'denBear', 'snowWorm', 'rockRoller', 'rockScorpion'];
// in the page: __sp (a monster put down), __clear (every foe gone), __wait / __gwait (wall / game seconds), __H7 (each
// heavy blow that reached her: the move, her life's share), __den (a sunlit spot near the Den's middle: no cloud there
// ever), __dirs7 (open lines from a spot), __snowSpot, __shadeSpot, __pair7 (a sun cell beside a shade cell), __try7
const setup7 = (pg) => pg.evaluate(async () => {
  const G = window.__G, A7 = window.__act7, B = await import('/src/ui/bus.js'), m = G.zone.map, L = G.zone.L;
  window.__Fg = await import('/src/game/forge.js');
  window.__H7 = []; let last = {};
  B.on('hurt', (f) => { const T = G.tally7 || {}; for (const k in T) if ((T[k] || 0) > (last[k] || 0)) window.__H7.push({ move: k, f, t: A7.now() }); last = { ...T }; });
  // (no block: a blocked blow is 45% of itself, by chance; she is kept alive between blows)
  G.stats.block = 0;
  window.__keep = setInterval(() => { const p = G.player; if (p && p.hp < p.hpMax * 0.6) p.hp = p.hpMax; if (p) p.dead = false; }, 30);
  window.__sp = (kind, x, z, o = {}) => { const a = window.__D.spawnMonster(kind, x, z, o); G.zone.actors.push(a); if (a.avatar) window.__R.scene.add(a.avatar.group); return a; };
  window.__clear = () => { for (const a of G.zone.actors) if (a.team === 'foe' && !a.removed) { if (a.tele) a.tele.alive = false; a.remove(); } A7.clear7(); };
  window.__wait = (f, ms = 30000) => new Promise((ok) => { const t0 = Date.now(); const iv = setInterval(() => { let v = null; try { v = f(); } catch (e) { v = null; } if (v || Date.now() - t0 > ms) { clearInterval(iv); ok(v || null); } }, 15); });
  window.__gwait = (s) => { const t = A7.now() + s; return window.__wait(() => A7.now() >= t, s * 1000 + 30000); };
  const sunOK = (x, z) => m.walkable(x, z) && !A7.shade7(x, z) && L.noCloud?.[Math.floor(z) * L.w + Math.floor(x)];
  window.__dirs7 = (p, r) => { const out = []; for (let k = 0; k < 32; k++) { const g = (k / 32) * 6.2832, ux = Math.sin(g), uz = Math.cos(g), x = p.x + ux * r, z = p.z + uz * r; if (m.walkable(x, z) && m.clear(x, z, p.x - ux * 3.5, p.z - uz * 3.5) && m.walkable(p.x - ux * 3, p.z - uz * 3) && !A7.shade7(x, z)) out.push({ x, z, g }); } return out; };
  const c = L.spots.arena; let best = null;
  for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) { const x = Math.floor(c.x) + dx + 0.5, z = Math.floor(c.z) + dz + 0.5; if (!sunOK(x, z)) continue; const n = window.__dirs7({ x, z }, 9).length; if (!best || n > best.n) best = { x, z, n }; }
  window.__den = best;
  // snow that lies for the weirs she has opened, 3 m all round
  let sn = null; for (let i = 0; i < L.cells.length && !sn; i += 1) { if (!L.snow?.[i]) continue; const x = i % L.w + 0.5, z = Math.floor(i / L.w) + 0.5; let ok = m.walkable(x, z); for (let dz = -3; dz <= 3 && ok; dz++) for (let dx = -3; dx <= 3 && ok; dx++) ok = A7.snow7(x + dx, z + dz) && m.walkable(x + dx, z + dz); if (ok) sn = { x, z }; }
  window.__snowSpot = sn;
  // a fixed-shade cell with floor round it; a sun cell 1.5-2.5 m from a shade cell (both of fixed kinds: shade the layout's,
  // sun under the no-cloud rule)
  let sh = null, pair = null;
  for (let i = 0; i < L.shade.length && !(sh && pair); i++) { if (!L.shade[i] || !L.cells[i]) continue; const x = i % L.w + 0.5, z = Math.floor(i / L.w) + 0.5; if (!m.walkable(x, z)) continue;
    let ok = true; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ok = ok && m.walkable(x + dx, z + dz) && A7.shade7(x + dx * 0.5, z + dz * 0.5); if (ok && !sh) sh = { x, z };
    if (!pair && L.noCloud?.[i]) for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1.5, 1.5], [-1.5, 1.5], [1.5, -1.5], [-1.5, -1.5]]) if (sunOK(x + dx, z + dz) && m.clear(x, z, x + dx, z + dz)) { pair = { shade: { x, z }, sun: { x: x + dx, z: z + dz } }; break; } }
  window.__shadeSpot = sh; window.__pair7 = pair;
  // one heavy move, measured: the kind put where its move comes (or, stun: broken in its wind-up)
  const MOVE = { hillWolf: ['longPounce', 0.9, 'longPounceTele', 'longPounceBroken', 8], goblinMarksman: ['aimedBolt', 0.9, 'aimedBoltTele', 'aimedBoltBroken', 8], chough: ['mob', 1.1, 'mobTele', 'mobBroken', 6],
    denBear: ['charge', 0.9, 'rear', 'chargeBroken', 9], snowWorm: ['burst', 0.9, 'burstTele', 'burstBroken', 2], rockRoller: ['rolledBoulder', 1.2, 'rolledBoulderTele', 'rolledBoulderBroken', 8], rockScorpion: ['sting', 0.9, 'stingTele', 'stingBroken', 1.3] };
  window.__try7 = async (kind, d, stun) => {
    const M = MOVE[kind], LOG = A7.AI_LOG, n = (k) => LOG[kind + ':' + k] || 0, pl = G.player;
    window.__clear(); G.hero.diff = d; const H = A7.H7();
    const p = kind === 'snowWorm' ? window.__snowSpot : window.__den; if (!p) return { d, err: 'no spot' };
    pl.x = p.x; pl.z = p.z; pl.hp = pl.hpMax; pl.sun7 = 0; pl.status.stun = 0;
    const o = d === 4 ? { affixes: ['fast'] } : {}, mons = [];
    const pk = 'h7' + d + (stun ? 's' : '') + Math.random();
    if (kind === 'chough') for (let k = 0; k < 4; k++) { const g = k * 1.57; mons.push(window.__sp(kind, p.x + Math.sin(g) * 6, p.z + Math.cos(g) * 6, { ...o, packId: pk })); }
    else { const q = kind === 'snowWorm' ? { x: p.x + 2, z: p.z } : window.__dirs7(p, M[4])[0]; if (!q) return { d, err: 'no line' }; mons.push(window.__sp(kind, q.x, q.z, o)); }
    for (const a of mons) { a.aggro = true; a.cd = 0; a.chargeCd = 0; a.shots = 2; a.swings = 2; a.surfaceT = 0.1; }
    const h0 = window.__H7.length, k0 = A7.HEAVY7.length, t0 = n(M[2]), b0 = n(M[3]);
    if (stun) {
      const teled = await window.__wait(() => n(M[2]) > t0, 40000);
      for (const a of mons) a.status.stun = 1.2;
      const k1 = A7.HEAVY7.length; await window.__gwait(2.5);
      const after = A7.HEAVY7.slice(k1).filter((h) => h.kind === kind && h.move === M[0]).length;
      window.__clear(); return { teled: !!teled, broken: n(M[3]) - b0, after };
    }
    const hit = await window.__wait(() => window.__H7.slice(h0).find((h) => h.move === M[0]), 45000);
    const lg = A7.HEAVY7.slice(k0).find((h) => h.kind === kind && h.move === M[0]);
    const s = G.stats, Lv = mons[0].level, red = s.armor / (s.armor + 45 * Lv + 60);
    window.__clear();
    return { d, tele: lg?.tele ?? null, want7: M[1], f: hit ? hit.f : null, want: H.heavy / 100 * (1 - red), cap: H.cap, red: +red.toFixed(3) };
  };
});

// the bosses' test helpers: __B7.spawn (at a named spot: the world's boss spot is not set yet, docs stageC-bosses.md),
// near (her put r metres off on a line he can see), setLife (struck down to a share of his life, no vulnerability in it),
// force (every move but one on cooldown, so that one comes next)
const setupBoss7 = (pg) => pg.evaluate(() => {
  const G = window.__G, A7 = window.__act7, m = G.zone.map;
  window.__B7 = {
    spawn(kind, spot) { const S = G.zone.L.spots[spot], p = m.nearestFloor(S.x, S.z, 4); const k = window.__sp(kind, p.x, p.z, { level: Math.max((kind === 'kallisto' ? 40 + 2 : 43 + 3), G.hero.level + 1) }); k.rot = Math.PI; return k; },
    near(k, r) { const pl = G.player; for (let o = 0; o < 6.3; o += 0.25) for (const sg of [1, -1]) { const g = Math.atan2(pl.x - k.x, pl.z - k.z) + o * sg, p = m.nearestFloor(k.x + Math.sin(g) * r, k.z + Math.cos(g) * r, 1); if (p && m.los(k.x, k.z, p.x, p.z) && Math.abs(Math.hypot(p.x - k.x, p.z - k.z) - r) < 1.2) { pl.x = p.x; pl.z = p.z; return p; } } return null; },
    setLife(k, f) { const need = k.hp - k.hpMax * f; if (need <= 0) return 0; const keep = k.dmgTaken; k.dmgTaken = null; const v = A7.damage(null, k, need, { crit: false }); k.dmgTaken = keep; return v; },
    async force(k, id) { await window.__wait(() => !k.move && !k.dash && !(k.dazed > 0) && !(k.status.stun > 0), 10000); k.mcd ||= {}; for (const mv of ['maul', 'charge', 'roar', 'slam', 'rockfall', 'sweep', 'tremor', 'iceBlock', 'boulderRoll']) k.mcd[mv] = mv === id ? 0 : 99; k.queue = []; k.cd = 0; k.ownT = 0; k.bigs = []; await window.__wait(() => k.move || k.dash || k.wheel > 0, 6000); for (const mv in k.mcd) if (mv !== id) k.mcd[mv] = 0.5 + Math.random() * 2; }
  };
  // the most of Kelados's blocks standing at once (sampled)
  window.__maxBlocks7 = 0; setInterval(() => { const n = A7.ROCKS7.filter((r) => r.ice && r.by?.kind === 'kelados').length; if (n > window.__maxBlocks7) window.__maxBlocks7 = n; }, 50);
});

export const S7 = () => ({
  // the migration: a v22 hero (format 1, no act7 field) is taken up, gains the field and the Names' record, loses nothing
  save16: { stage: 'A', until: 'E', q: Q(FX7.fx7_new('town')), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    const s = await pg.evaluate(async () => { const G = window.__G, h = G.hero, D = await import('/src/game/data.js'); return { act7: h.act7, act6: h.act6, fmt: h.fmt, SAVE_FMT: D.SAVE_FMT, quest: h.quest, names: h.names, crown: !!h.flags.crownUnmade, bytes: JSON.stringify(h).length, level: h.level, points: h.points }; });
    beat('a v22 hero is taken up: act7 -1, Act VI kept, quest 39', s.act7 === -1 && s.act6 >= 0 && s.quest === 39, s);
    beat('stamped with this build\'s format', s.fmt === s.SAVE_FMT, { fmt: s.fmt });
    beat('the Names\' record is made, none said, the deeds\' three learnt', s.names && s.names.said.every((x) => !x) && ['einar', 'keyx', 'asger'].every((id) => s.names.learnt.includes(id)), s.names);
    beat('the hero record is under 32 KiB', s.bytes < 32768, s.bytes);
    return out(beats);
  } },
  // the Race: its level from the flags on entry; a weir turned drops it a step along its whole length and opens the next
  // ford; never a cell closed under the hero
  // (&nostory: the memories in stone play at each weir from stage D; this test is the water's, not the story's)
  race: { stage: 'B', until: 'E', q: Q(fx7('thawSeen', 'thaw'), '&nostory'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    await until(pg, () => window.__G.zone?.tide);
    const lvl = () => pg.evaluate(() => { const z = window.__G.zone, T = z.tide; return { mh: T.mh, to: T.mere?.h ?? 0, quest: window.__G.hero.quest }; });
    const reach = (name) => pg.evaluate((name) => { const G = window.__G, z = G.zone, m = z.map, S = z.L.spots; let o = S; for (const k of name.split('.')) o = o?.[k]; const st = o.stand || o, c = S.camp; const a = m.nearestFloor(c.x, c.z, 3), b = m.nearestFloor(st.x, st.z, 3); if (!a || !b) return null; return m.reaches(a.x, a.z, [b]); }, name);
    const l0 = await lvl(); beat('on entry with no weir: the Race at 1.2', Math.abs(l0.mh - 1.2) < 0.01, l0);
    const r0 = { w1: await reach('weirs.0'), w2: await reach('weirs.1'), w3: await reach('weirs.2') };
    beat('at 1.2 the camp reaches weir 1 and not weirs 2 or 3', r0.w1 === true && r0.w2 === false && r0.w3 === false, r0);
    for (const k of [1, 2, 3]) {
      await goTo(pg, 'weirs.' + (k - 1)); const u = await use(pg, 'weir7', k);
      const ok = await until(pg, (h) => Math.abs(window.__G.zone.tide.mh - h) < 0.01, 30000, +(1.2 - 0.3 * k).toFixed(2));
      const l = await lvl(); beat(`weir ${k} turned: the flag, the Race down to ${(1.2 - 0.3 * k).toFixed(1)}`, u === 'ok' && ok, { u, ...l });
      const open = await pg.evaluate(() => { const G = window.__G, m = G.zone.map, p = G.player; return m.walkable ? m.walkable(p.x, p.z) : true; });
      beat(`weir ${k}: the hero's cell still open`, open);
      if (k < 3) { const nx = await reach('weirs.' + k); beat(`weir ${k}: the next weir in reach of the camp`, nx === true, nx); }
    }
    const end = await pg.evaluate(() => { const G = window.__G, F = G.hero.flags; return { quest: G.hero.quest, weirs: [F.weir1, F.weir2, F.weir3], den: null }; });
    beat('three weirs: quest 42', end.quest === 42 && end.weirs.every(Boolean), end);
    const den = await reach('arena.mouth'); beat('at 0.3 the Den\'s mouth is in reach', den === true, den);
    return out(beats);
  } },
  // the Slide: flues run for a hero with crownUnmade; a chute fires only armed, sunlit and kicked; 2.8 s of warning; a
  // goblin in the lane takes its share, ends at the lane's foot, Dazed; the hero takes HAZ7.slide; spent, then armed again
  slide: { stage: 'B', until: 'E', q: Q(fx7('thawSeen', 'thaw'), '&nopacks'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    await until(pg, () => window.__G.zone?.tide);
    const s0 = await pg.evaluate(async () => { const Fg = await import('/src/game/forge.js'), G = window.__G; window.__Fg = Fg; window.__immortal = true; const L = Fg.flues() || []; return { crown: !!G.hero.flags.crownUnmade, n: L.length, snow: L.filter((f) => f.kind === 'snow').length, armed: L.filter((f) => f.kind === 'snow' && f.armed).length }; });
    beat('the hero carries crownUnmade and the chutes are there, all armed', s0.crown && s0.snow >= 5 && s0.armed === s0.snow, s0);
    // a sunlit chute, by name of its place in the list: the first whose cornice is not in fixed shade
    const pick = await pg.evaluate(() => { const G = window.__G, L = G.zone.L, fl = window.__Fg.flues(); const i = fl.findIndex((f) => f.kind === 'snow' && !L.shade[Math.floor(f.z) * L.w + Math.floor(f.x)] && f.horn); const sh = fl.findIndex((f) => f.kind === 'snow' && L.shade[Math.floor(f.z) * L.w + Math.floor(f.x)] && f.horn); return { i, sh }; });
    beat('a chute with its cornice in the sun exists', pick.i >= 0, pick);
    if (pick.i < 0) return out(beats);
    // a goblin in the lane, the hero beside the horn-stone and out of the lane; a loud thing at the horn
    const set = await pg.evaluate(({ i }) => { const G = window.__G, D = window.__D, f = window.__Fg.flues()[i], ux = Math.sin(f.dir), uz = Math.cos(f.dir), m = G.zone.map;
      const gp = m.nearestFloor(f.x + ux * f.len * 0.4, f.z + uz * f.len * 0.4, 2), a = D.spawnMonster('goblin', gp.x, gp.z); G.zone.actors.push(a); if (a.avatar) window.__R.scene.add(a.avatar.group); a.aggro = false; window.__gob = a;
      const hp = m.nearestFloor(f.horn.x - uz * (f.w / 2 + 3), f.horn.z + ux * (f.w / 2 + 3), 4); G.player.x = hp.x; G.player.z = hp.z;
      return { gobIn: true, hp0: a.hp, hpMax: a.hpMax, horn: f.horn, len: f.len }; }, pick);
    const t0 = Date.now();
    const k = await pg.evaluate(({ i }) => { const f = window.__Fg.flues()[i]; return { n: window.__Fg.loud(f.horn.x, f.horn.z, 6, window.__G.player), st: f.st }; }, pick);
    beat('a loud thing at the horn-stone kicks it: the warning begins', k.n >= 1 && k.st === 'inhale', k);
    await pg.evaluate(() => { const a = window.__gob; window.__gobAt = null; const iv = setInterval(() => { if (a.dazed > 0 || a.state === 'dazed') { window.__gobAt = { x: a.x, z: a.z }; clearInterval(iv); } }, 5); });
    const fired = await until(pg, (i) => window.__Fg.flues()[i].st === 'fire', 20000, pick.i);
    const warn = await pg.evaluate(() => window.__G.time); // (game seconds are the measure: sim=4)
    const done = await until(pg, (i) => { const f = window.__Fg.flues()[i]; return f.st === 'idle' && !f.armed; }, 20000, pick.i);
    const s1 = await pg.evaluate(({ i }) => { const G = window.__G, f = window.__Fg.flues()[i], a = window.__gob, ux = Math.sin(f.dir), uz = Math.cos(f.dir); const foot = { x: f.x + ux * f.len, z: f.z + uz * f.len }; const at = window.__gobAt || a; return { dead: a.dead, hp: a.hp / a.hpMax, dazed: !!window.__gobAt, toFoot: Math.hypot(at.x - foot.x, at.z - foot.z), armed: f.armed, rearm: f.rearm, tally: { ...window.__Fg.TALLY7 } }; }, pick);
    beat('it runs, and is spent', fired && done && !s1.armed && s1.rearm > 30, s1);
    beat('the goblin took its share (35% of its own life), was carried to within 3 m of the lane\'s foot, Dazed', !s1.dead && Math.abs((1 - s1.hp) - 0.35) < 0.06 && s1.toFoot <= 3.2 && s1.dazed, s1);
    // spent: a second loud thing does nothing
    const k2 = await pg.evaluate(({ i }) => { const f = window.__Fg.flues()[i]; return window.__Fg.loud(f.horn.x, f.horn.z, 6, window.__G.player); }, pick);
    beat('spent: it cannot be kicked again', k2 === 0, k2);
    // the hero in a lane: HAZ7.slide of her life, pure
    const hero = await pg.evaluate(async ({ i }) => { const G = window.__G, fl = window.__Fg.flues(), D = await import('/src/game/data.js'); const j = fl.findIndex((f, n) => n !== i && f.kind === 'snow' && f.armed && !G.zone.L.shade[Math.floor(f.z) * G.zone.L.w + Math.floor(f.x)]); if (j < 0) return null; const f = fl[j], ux = Math.sin(f.dir), uz = Math.cos(f.dir), p = G.zone.map.nearestFloor(f.x + ux * f.len * 0.6, f.z + uz * f.len * 0.6, 2); G.player.x = p.x; G.player.z = p.z; window.__immortal = true; G.player.hp = G.player.hpMax; G.player.iframes = 0; window.__hp0 = G.player.hp; window.__hpMin = G.player.hp; setInterval(() => { window.__hpMin = Math.min(window.__hpMin, G.player.hp); }, 10); window.__Fg.fireFlue(j, null); return { j, want: D.actHaz(7, G.hero.diff).slide }; }, pick);
    if (hero) {
      await until(pg, (j) => { const f = window.__Fg.flues()[j]; return f.st === 'idle' && !f.armed; }, 25000, hero.j);
      const lost = await pg.evaluate(() => (window.__hp0 - window.__hpMin) / window.__G.player.hpMax);
      beat('the hero in a lane takes HAZ7.slide of her life', Math.abs(lost * 100 - hero.want) < 1.5, { lost: +(lost * 100).toFixed(1), want: hero.want });
    } else beat('a second sunlit chute for the hero\'s test', false);
    // in shade: it creaks and stays
    if (pick.sh >= 0) { const c = await pg.evaluate(({ sh }) => { const f = window.__Fg.flues()[sh], c0 = window.__Fg.TALLY7.creaks; const n = window.__Fg.loud(f.horn.x, f.horn.z, 6, window.__G.player); return { n, creaks: window.__Fg.TALLY7.creaks - c0, st: f.st, armed: f.armed }; }, pick); beat('a cornice in shade creaks and stays', c.creaks >= 1 && c.st === 'idle' && c.armed, c); }
    return out(beats);
  } },
  // the Seven Fires: a lookout lit, held for HAZ7.hold seconds while its pack comes, the rank written, the bonus in the
  // stats, the hearth burning for the Call; out of the ring for 6 s loses it
  fires7: { stage: 'C', until: 'E', q: Q(fx7('thawSeen', 'thaw'), '&nopacks'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    await until(pg, () => window.__G.zone?.tide);
    await pg.evaluate(() => { window.__immortal = true; window.__tough = true; });
    const dmg0 = await pg.evaluate(() => window.__G.stats.dmgMult ?? window.__G.stats.dmg);
    await goTo(pg, 'lookouts.0.hearth', 1.5);
    const u = await use(pg, 'lookHearth', 1);
    const s1 = await pg.evaluate(() => { const z = window.__G.zone; return { hold: !!z.hold, need: z.hold?.need }; });
    beat('the hearth lit: the hold begins, HAZ7.hold seconds', u === 'ok' && s1.hold && s1.need === 75, { u, ...s1 });
    const wave = await until(pg, () => window.__G.zone.actors.some((a) => a.team === 'foe' && !a.prop && !a.dead), 30000);
    beat('its pack comes', wave);
    // (the test hero is not the test: the pack is cleared as it comes)
    await pg.evaluate(() => { window.__iv = setInterval(() => { const G = window.__G; for (const a of G.zone.actors) if (a.team === 'foe' && !a.prop && !a.dead) window.__D.kill(a); }, 400); });
    const done = await until(pg, () => !window.__G.zone.hold && window.__G.hero.flags.look1, 120000);
    const s2 = await pg.evaluate(() => { const G = window.__G, it = G.zone.act7.lookouts[0]; clearInterval(window.__iv); return { flag: !!G.hero.flags.look1, fires: G.hero.fires, kind: it.kind, st: it.st, dmg: G.stats.dmgMult ?? G.stats.dmg }; });
    beat('held: the flag, the rank of this difficulty (Warden: 2), the hearth burning for the Call', done && s2.flag && s2.fires?.[0] === 2 && s2.kind === 'callFire', s2);
    beat('the ladder\'s bonus is in her stats (+1% for a rank-2 fire)', dmg0 > 0 && Math.abs(s2.dmg / dmg0 - 1.01) < 0.004, { ratio: +(s2.dmg / dmg0).toFixed(4) });
    const c = await pg.evaluate(() => { const G = window.__G, it = G.zone.act7.lookouts[0]; it.use(); const a = G.player.buffs.call; it.use(); return { call: a, again: G.player.buffs.call }; });
    beat('the Call at it: 20 s, once a hearth a visit', c.call === 20 && c.again <= 20, c);
    // a second lookout, left: out of the ring for 6 s loses it
    await goTo(pg, 'lookouts.1.hearth', 1.5); const u2 = await use(pg, 'lookHearth', 2);
    await goTo(pg, 'camp');
    const lost = await until(pg, () => !window.__G.zone.hold, 40000);
    const s3 = await pg.evaluate(() => { const G = window.__G, it = G.zone.act7.lookouts[1]; return { flag: !!G.hero.flags.look2, st: it.st }; });
    beat('left for 6 s: the fire is out, no flag, it waits before it can be lit again', u2 === 'ok' && lost && !s3.flag && s3.st === 'wait', s3);
    return out(beats);
  } },
  // Sun and Shade (U1-U3, U11, U12, S3): the 'sun' kind draws and ticks nothing of the dark; shade is the layout's or a
  // cloud's; the clouds sail on one clock, never over the Den, HAZ7.clouds of them; a cornice under a cloud creaks.
  // SHOTS=1: drawn at quality 1, two JPEGs of a cloud's shadow (meadow, snow) into docs/act7-briefs/reports/stageB/sun/
  sun: { stage: 'B', until: 'E', q: process.env.SHOTS ? fx7('thawSeen', 'thaw') + '&sim=4&q=1&cls=' + cls() + '&nopacks&nostory' : Q(fx7('thawSeen', 'thaw'), '&nopacks'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    await until(pg, () => window.__G.zone?.tide && window.__G.zone?.sun && window.__light7);
    await pg.evaluate(async () => { window.__S7 = await import('/src/game/sun7.js'); window.__Fg = await import('/src/game/forge.js'); window.__G7 = await import('/src/world/gen7.js'); window.__Dt = await import('/src/game/data.js'); window.__immortal = true; });
    if (process.env.SHOTS) {
      const fs = await import('node:fs'), dir = 'docs/act7-briefs/reports/stageB/sun'; fs.mkdirSync(dir, { recursive: true });
      const shots = [];
      for (const [name, snow] of [['snow', 1], ['meadow', 0]]) {
        // the hero on open ground of that kind on a cloud's line, the cloud's edge a metre west of her: she in sun, its shadow across half the picture
        // (the meadow bared: the three weirs' flags set and the zone entered again, so the snow has drawn back from the grass)
        if (!snow) { await pg.evaluate(() => { const G = window.__G; Object.assign(G.hero.flags, { weir1: true, weir2: true, weir3: true }); window.__D.enterZone('thaw'); }); await until(pg, () => window.__G.zone?.sun?.clouds.length); await pg.waitForTimeout(600); }
        const at = await pg.evaluate(({ snow }) => { const G = window.__G, z = G.zone, L = z.L, S7 = window.__S7;
          for (const rad of [3, 2, 1, 0]) for (const q of z.sun.clouds) { if (q.scripted) continue; const c = q.c;
            for (let s = 20; s < c.len - 20; s += 2) { const x = c.x + c.dx * s, zz = c.z + c.dz * s, p = z.map.nearestFloor(x, zz, 1.5); if (!p) continue; let ok = true; for (let dz = -rad; dz <= rad && ok; dz++) for (let dx = -rad; dx <= rad && ok; dx++) { const i = (Math.floor(p.z) + dz) * L.w + Math.floor(p.x) + dx; if (!L.cells[i] || L.shade[i] || (snow ? !(L.snow[i] >= 1) : L.snow[i])) ok = false; } if (!ok) continue;
              // (clear of the other clouds' lines, so one shadow is in the picture)
              const t = ((s + c.r + 1) / c.speed - c.t0 + 1200) % 600; S7.setSunT(z, t); if (z.sun.clouds.some((o) => o !== q && !o.off && Math.hypot(o.x - p.x, o.z - p.z) < o.r + 16)) continue;
              G.player.x = p.x; G.player.z = p.z; return { id: q.id, x: p.x, z: p.z, t, r: q.r, shade: z.shadeAt(p.x, p.z) }; } }
          return null; }, { snow });
        if (!at) { shots.push({ name, error: 'no spot' }); continue; }
        await pg.waitForTimeout(900);
        await pg.evaluate(({ t }) => window.__S7.setSunT(window.__G.zone, t), at);
        await pg.waitForTimeout(350);
        const f = `${dir}/sun-${name}.jpg`; await pg.screenshot({ path: f, type: 'jpeg', quality: 62 });
        // (the same spot with the cloud a minute away, beside it in /tmp, for the eye's comparison: SHOTS=2)
        if (process.env.SHOTS === '2') { await pg.evaluate(({ t }) => window.__S7.setSunT(window.__G.zone, t + 60), at); await pg.waitForTimeout(700); await pg.screenshot({ path: `/tmp/sun-${name}-clear.jpg`, type: 'jpeg', quality: 62 }); }
        shots.push({ name, f, kb: Math.round(fs.statSync(f).size / 1024), ...at });
      }
      return { pass: shots.every((s) => s.f && s.kb <= 150), shots };
    }
    const s0 = await pg.evaluate(() => { const G = window.__G, R = window.__R, X = window.__light7; return { kind: X.lightKind(), r: X.heroLightR(), dist: R.heroLight.distance, t: R.time, sunT: G.zone.sunT, ring: X.ringShown(), cradle: X.cradleShown() }; });
    beat('the zone\'s light is \'sun\'', s0.kind === 'sun', s0.kind);
    // 60 game-seconds in the zone: the hero's light untouched, the clouds' clock keeping the game's time
    await until(pg, (t) => window.__R.time >= t + 60, 60000, s0.t);
    const s1 = await pg.evaluate(() => { const G = window.__G, R = window.__R, X = window.__light7; return { r: X.heroLightR(), dist: R.heroLight.distance, t: R.time, sunT: G.zone.sunT, ring: X.ringShown(), cradle: X.cradleShown() }; });
    beat('heroLightR() is 0, before and after 60 s', s0.r === 0 && s1.r === 0, [s0.r, s1.r]);
    beat('R.heroLight.distance unchanged after 60 game-seconds', s1.dist === s0.dist && s1.t - s0.t >= 60, { d0: s0.dist, d1: s1.dist, dt: +(s1.t - s0.t).toFixed(1) });
    beat('the clouds\' clock ran with the game\'s (z.sunT)', Math.abs((s1.sunT - s0.sunT + 600) % 600 - (s1.t - s0.t)) < 1.5, { dSun: +((s1.sunT - s0.sunT + 600) % 600).toFixed(2), dT: +(s1.t - s0.t).toFixed(2) });
    beat('no ring and no Cradle drawn', !s0.ring && !s1.ring && !s0.cradle && !s1.cradle, s1);
    // the ring made on purpose (the ember rules forced for a moment), then the zone's own kind again: hidden at once
    const rg = await pg.evaluate(async () => { const X = window.__light7, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)); X.LIGHT.force = 'ember'; await wait(400); const on = X.ringShown(); X.LIGHT.force = false; await wait(400); return { forced: on, after: X.ringShown(), cradle: X.cradleShown(), r: X.heroLightR() }; });
    beat('a ring that exists is hidden in a \'sun\' zone (forced on, then the zone\'s kind again)', rg.forced && !rg.after && !rg.cradle && rg.r === 0, rg);
    // U1: shade is a cell the layout marks or the ground under a cloud; the rest is sun, and lightAt is its other face
    const u1 = await pg.evaluate(() => { const G = window.__G, z = G.zone, L = z.L, X = window.__light7; const q = z.sun.clouds.find((c) => !c.off && !c.scripted);
      let fixed = null, open = null;
      for (let i = 0; i < L.shade.length && !(fixed && open); i++) { const x = i % L.w + 0.5, zz = Math.floor(i / L.w) + 0.5; if (!L.cells[i]) continue; if (L.shade[i]) fixed ||= { x, z: zz }; else if (!open && !z.cloudAt(x, zz)) open = { x, z: zz }; }
      const ask = (p) => p && { shade: z.shadeAt(p.x, p.z), X: X.shadeAt(p.x, p.z), sun: X.sunAt(p.x, p.z), lit: X.lightAt(p.x, p.z) };
      return { fixed: ask(fixed), cloud: ask(q), open: ask(open), id: q?.id }; });
    beat('shadeAt: true on an L.shade cell', u1.fixed?.shade && u1.fixed.X && !u1.fixed.sun && !u1.fixed.lit, u1.fixed);
    beat('shadeAt: true under a cloud\'s centre', u1.cloud?.shade && !u1.cloud.sun && !u1.cloud.lit, u1.cloud);
    beat('shadeAt: false in the open (lightAt true there)', u1.open && !u1.open.shade && u1.open.sun && u1.open.lit, u1.open);
    // U2: each wandering cloud takes 15-23 s over a fixed spot on its line (the clock stepped by hand, a quarter second)
    const pass = await pg.evaluate(() => { const G = window.__G, z = G.zone, L = z.L, S7 = window.__S7, t0 = z.sunT, out = [];
      for (const q of z.sun.clouds) { if (q.scripted) continue; const c = q.c; let spot = null;
        for (let s = c.len * 0.3; s < c.len * 0.8 && !spot; s += 3) { const x = c.x + c.dx * s, zz = c.z + c.dz * s, i = Math.floor(zz) * L.w + Math.floor(x); if (x > 1 && zz > 1 && x < L.w - 1 && zz < L.h - 1 && !L.shade[i]) spot = { x, z: zz }; }
        if (!spot) { out.push({ id: q.id, s: -1 }); continue; }
        const per = c.len / c.speed; let n = 0; for (let t = 0; t < per; t += 0.25) { S7.setSunT(z, t); if (z.cloudAt(spot.x, spot.z)?.id === q.id) n++; }
        out.push({ id: q.id, r: +q.r.toFixed(2), s: n * 0.25 }); }
      S7.setSunT(z, t0); return out; });
    beat('a cloud takes 15-23 s (to the quarter second sampled, +-0.5) to pass a spot on its line', pass.length >= 2 && pass.every((p) => p.s >= 14.5 && p.s <= 23.5), pass);
    // U2: never over an L.noCloud cell, the whole 600 s cycle every 2 s, the scripted cloud running too (the test's own sum)
    const den = await pg.evaluate(() => { const G = window.__G, z = G.zone, L = z.L, S7 = window.__S7, t0 = z.sunT; const nc = []; for (let i = 0; i < L.noCloud.length; i++) if (L.noCloud[i]) nc.push([i % L.w + 0.5, Math.floor(i / L.w) + 0.5]);
      S7.cloudStart(z, 'weir3', 0); let bad = 0, seen = 0, offs = 0;
      for (let t = 0; t < 600; t += 2) { S7.setSunT(z, t); for (const q of z.sun.clouds) { if (q.off) { offs++; continue; } seen++; if (nc.some(([x, zz]) => Math.hypot(x - q.x, zz - q.z) <= q.r)) bad++; } }
      // the rule kept at run time: a barred cell put under a cloud's centre turns that cloud off (no shade, no disc)
      function q0(c) { return c.x > 2 && c.z > 2 && c.x < L.w - 2 && c.z < L.h - 2 && !L.shade[Math.floor(c.z) * L.w + Math.floor(c.x)]; } let tg = 10, q = null; for (let t = 0; t < 600 && !q; t += 5) { S7.setSunT(z, t); q = z.sun.clouds.find((c) => !c.off && !c.scripted && q0(c)); tg = t; }
      let guard = null;
      if (q) { const i = Math.floor(q.z) * L.w + Math.floor(q.x), was = L.noCloud[i]; L.noCloud[i] = 1; L._noCloud = undefined; S7.setSunT(z, tg); guard = { t: tg, off: q.off, shade: z.shadeAt(q.x, q.z), disc: q.mesh.visible }; L.noCloud[i] = was; L._noCloud = undefined; S7.setSunT(z, tg); guard.back = !q.off && z.shadeAt(q.x, q.z); }
      S7.setSunT(z, t0); return { cells: nc.length, bad, seen, offs, guard }; });
    beat('no cloud over an L.noCloud cell in a full 600 s cycle (every 2 s)', den.cells > 0 && den.seen > 600 && den.bad === 0, { cells: den.cells, bad: den.bad, seen: den.seen, offs: den.offs });
    beat('a cloud whose disc would cover a barred cell is off for that stretch, and back after', den.guard && den.guard.off && !den.guard.shade && !den.guard.disc && den.guard.back, den.guard);
    // U3: the same clock, the same clouds: the live pools against gen7's cloudAt worked here, and the clock set back to itself
    const two = await pg.evaluate(() => { const G = window.__G, z = G.zone, S7 = window.__S7, G7 = window.__G7, X = window.__light7, t0 = z.sunT; let worst = 0, n = 0, back = 0, per = 0;
      for (const T of [0, 37.3, 211.9, 599.5]) { S7.setSunT(z, T); const a = z.sun.clouds.filter((q) => !q.scripted).map((q) => ({ x: q.x, z: q.z, px: q.pool.x, pz: q.pool.z }));
        z.sun.clouds.filter((q) => !q.scripted).forEach((q, k) => { const p = G7.cloudAt(q.c, T); worst = Math.max(worst, Math.hypot(p.x - a[k].px, p.z - a[k].pz)); n++; });
        S7.setSunT(z, T + 123); S7.setSunT(z, T); z.sun.clouds.filter((q) => !q.scripted).forEach((q, k) => { back = Math.max(back, Math.hypot(q.x - a[k].x, q.z - a[k].z)); });
        S7.setSunT(z, T + 600); z.sun.clouds.filter((q) => !q.scripted).forEach((q, k) => { per = Math.max(per, Math.hypot(q.x - a[k].x, q.z - a[k].z)); }); }
      S7.setSunT(z, t0); return { worst, back, per, n, pools: X.lightPools().filter((p) => p.shade).length }; });
    beat('two computations with the same sunT agree within 0.5 m; the paths repeat every 600 s', two.n >= 8 && two.worst < 0.5 && two.back < 0.5 && two.per < 0.5, two);
    // HAZ7.clouds wandering clouds for Story, Wanderer and Nightmare
    const cnt = await pg.evaluate(() => { const G = window.__G, z = G.zone, S7 = window.__S7, D = window.__Dt, d0 = G.hero.diff, t0 = z.sunT, out = [];
      for (const d of [0, 1, 4]) { G.hero.diff = d; S7.sunEnter(z); out.push({ d, n: z.sun.clouds.filter((q) => !q.scripted && !q.dam).length, want: D.HAZ7[d].clouds, pools: window.__light7.lightPools().filter((p) => p.shade).length, all: z.sun.clouds.length }); }
      G.hero.diff = d0; S7.sunEnter(z); S7.setSunT(z, t0); return out; });
    beat('the wandering clouds number HAZ7.clouds on difficulty 0, 1 and 4', cnt.every((c) => c.n === c.want && c.pools === c.all), cnt);
    // U12: 'Reduce flicker' stills the edge's shimmer
    const fl = await pg.evaluate(async () => { const G = window.__G, z = G.zone, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), sh = () => { let v = null; z.sun.clouds.find((q) => q.mesh.visible)?.mesh.traverse((o) => { if (o.material?.uniforms?.uShim) v = o.material.uniforms.uShim.value; }); return v; };
      const p = G.player, q = z.sun.clouds.find((c) => !c.off && !c.scripted), f = z.map.nearestFloor(q.x, q.z, 12); if (f) { p.x = f.x; p.z = f.z; } await wait(300);
      const a = sh(); G.settings.flicker = true; await wait(300); const b = sh(); G.settings.flicker = false; await wait(300); return { on: a, calm: b, back: sh(), shown: z.sun.clouds.filter((c) => c.mesh.visible).length }; });
    beat('Reduce flicker stills the clouds\' edge (uShim 1 -> 0 -> 1); at quality 0 at most two discs', fl.on === 1 && fl.calm === 0 && fl.back === 1 && fl.shown >= 1 && fl.shown <= 2, fl);
    // the hero's own shade: the bus's word, the music's low-pass, the sky eased to the shade row and back
    const hs = await pg.evaluate(async () => { const G = window.__G, z = G.zone, R = window.__R, S7 = window.__S7, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), ev = []; window.__D.emit; const B = await import('/src/ui/bus.js'); B.on('sunShade', (a, b) => ev.push([a, b]));
      const q = z.sun.clouds.find((c) => !c.off && !c.scripted), p = G.player; let f = null;
      // (a floor cell in the open, 6 m inside a cloud's east edge when the clock is moved there)
      for (let s = 30; s < q.c.len - 30 && !f; s += 2) { const x = q.c.x + q.c.dx * s, zz = q.c.z + q.c.dz * s, g = z.map.nearestFloor(x, zz, 1); if (g && !z.L.shade[Math.floor(g.z) * z.L.w + Math.floor(g.x)]) f = { x: g.x, z: g.z, s }; }
      if (!f) return null;
      const far = ((f.s - q.r - 30) / q.c.speed - q.c.t0 + 1200) % 600, over = (f.s / q.c.speed - q.c.t0 + 1200) % 600;
      S7.setSunT(z, far); p.x = f.x; p.z = f.z; await wait(500); const sun = { hemi: R.hemi.intensity, moon: R.moon.intensity, k: z.sun.k, sh: z.sun.shade };
      S7.setSunT(z, over); await wait(120); const mid = z.sun.k; await wait(500); const shade = { hemi: R.hemi.intensity, moon: R.moon.intensity, k: z.sun.k, sh: z.sun.shade, cl: z.sun.cloud };
      S7.setSunT(z, far); await wait(600); const again = { hemi: R.hemi.intensity, moon: R.moon.intensity, k: z.sun.k, sh: z.sun.shade };
      return { sun, mid, shade, again, ev, sunX: [R.sunOff[0], R.sunOff[1], R.sunOff[2]] }; });
    beat('under a cloud: \'sunShade\' true then false, the sky at the shade row (hemisphere 0.95, sun 1.1) and back, the sun not swung', hs && !hs.sun.sh && hs.sun.k === 0 && hs.shade.sh && hs.shade.cl && hs.shade.k === 1 && Math.abs(hs.shade.hemi - 0.95) < 0.01 && Math.abs(hs.shade.moon - 1.1) < 0.01 && hs.again.k === 0 && Math.abs(hs.again.hemi - hs.sun.hemi) < 0.01 && Math.abs(hs.again.moon - hs.sun.moon) < 0.01 && hs.ev.some((e, k) => e[0] === true && e[1] === true && hs.ev.slice(k + 1).some((f) => f[0] === false)) && hs.sunX[0] === -18 && hs.sunX[1] === 22, hs);
    // S3: a chute whose cornice a cloud covers creaks and stays; in sun again the same kick fires it
    const s3 = await pg.evaluate(() => { const G = window.__G, z = G.zone, L = z.L, S7 = window.__S7, Fg = window.__Fg, fl = Fg.flues() || [], t0 = z.sunT;
      for (let j = 0; j < fl.length; j++) { const f = fl[j]; if (f.kind !== 'snow' || !f.armed || f.st !== 'idle' || !f.horn || L.shade[Math.floor(f.z) * L.w + Math.floor(f.x)]) continue;
        let tc = -1, ts = -1; for (let t = 0; t < 600 && (tc < 0 || ts < 0); t += 1) { S7.setSunT(z, t); const c = z.cloudAt(f.x, f.z); if (c && tc < 0 && Math.hypot(c.x - f.x, c.z - f.z) < c.r - 2) tc = t; if (!c && ts < 0 && !z.sun.clouds.some((q) => !q.off && Math.hypot(q.x - f.x, q.z - f.z) < q.r + 4)) ts = t; }
        if (tc < 0 || ts < 0) continue;
        // (the hero beside the horn-stone and out of the lane)
        const ux = Math.sin(f.dir), uz = Math.cos(f.dir), hp = z.map.nearestFloor(f.horn.x - uz * (f.w / 2 + 3), f.horn.z + ux * (f.w / 2 + 3), 4); if (hp) { G.player.x = hp.x; G.player.z = hp.z; }
        S7.setSunT(z, tc); const c0 = Fg.TALLY7.creaks, k0 = Fg.TALLY7.kicks, n1 = Fg.loud(f.horn.x, f.horn.z, 6, G.player);
        const under = { cloud: z.cloudAt(f.x, f.z)?.id, n: n1, creaks: Fg.TALLY7.creaks - c0, kicks: Fg.TALLY7.kicks - k0, st: f.st, armed: f.armed };
        S7.setSunT(z, ts); const n2 = Fg.loud(f.horn.x, f.horn.z, 6, G.player);
        return { j, tc, ts, under, sun: { n: n2, st: f.st, kicks: Fg.TALLY7.kicks - k0 } }; }
      S7.setSunT(z, t0); return null; });
    beat('a chute whose head a cloud covers: corniceShade, the loud thing creaks and it stays armed', s3 && s3.under.cloud && s3.under.n === 0 && s3.under.creaks >= 1 && s3.under.kicks === 0 && s3.under.st === 'idle' && s3.under.armed, s3?.under ?? 'no chute under any cloud\'s line');
    beat('the cloud gone from it, the same kick fires it', s3 && s3.sun.n >= 1 && s3.sun.st === 'inhale', s3?.sun);
    return out(beats);
  } },
  // ---------- stage B: the act's seven creatures (docs/act7-contract.md, Enemies; ai.js, the Act VII section) ----------
  // each kind's heavy move: its telegraph in game seconds at least its table's on difficulty 0, 1 and 4 (4 with the `fast`
  // affix), its blow HAZ7.heavy % of her life x her armour (+-1.5 points), never over HAZ7.cap; a stun breaks the wind-up
  heavy7: { stage: 'B', until: 'E', q: Q(fx7('thawSeen', 'thaw'), '&nopacks'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    await until(pg, () => window.__G.zone?.tide && window.__act7);
    await setup7(pg);
    const rows = [];
    for (const kind of KIND7) {
      const got = [];
      for (const d of [0, 1, 4]) got.push(await pg.evaluate(({ kind, d }) => window.__try7(kind, d, false), { kind, d }));
      const st = await pg.evaluate(({ kind }) => window.__try7(kind, 1, true), { kind });
      rows.push({ kind, got, st });
      const tw = got[0]?.want7;
      beat(`${kind}: the telegraph lasts its table's ${tw} s or more on difficulty 0, 1, 4 (fast)`, got.every((g) => g && g.tele != null && g.tele >= g.want7 - 0.001), got.map((g) => g && { d: g.d, tele: g.tele, err: g.err }));
      beat(`${kind}: the blow is HAZ7.heavy x armour (+-1.5 points), never over the cap`, got.every((g) => g && g.f != null && Math.abs(g.f - g.want) * 100 <= 1.5 && g.f <= g.cap / 100 + 0.005), got.map((g) => g && { d: g.d, f: g.f != null ? +(g.f * 100).toFixed(2) : null, want: +(g.want * 100).toFixed(2), cap: g.cap }));
      beat(`${kind}: a stun breaks the wind-up (no blow after it)`, st && st.teled && st.broken >= 1 && st.after === 0, st);
    }
    return out(beats);
  } },
  // the sleepers: a Den-bear not woken by her walking at 6 m, woken by a blow, by something loud 10 m off; an Icebound asleep
  // through 60 game-seconds of shade with her at 2 m, awake within HAZ7.sunWake + 1 s of sun; a slab's scorpions out at 6 m
  sleepers7: { stage: 'B', until: 'E', q: Q(fx7('thawSeen', 'thaw'), '&nopacks'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    await until(pg, () => window.__G.zone?.tide && window.__act7);
    await setup7(pg);
    const bear = await pg.evaluate(async () => { const G = window.__G, p = window.__den, m = G.zone.map, out = {};
      const spawnAt = (r) => { for (const q of window.__dirs7(p, r)) return window.__sp('denBear', q.x, q.z, { dormant: true }); return null; };
      window.__clear(); G.player.x = p.x; G.player.z = p.z;
      let b = spawnAt(6); out.slept = !!b?.dormant; await window.__gwait(6); out.walk = { dormant: b.dormant, d: +Math.hypot(b.x - p.x, b.z - p.z).toFixed(2) };
      window.__D.kill ? window.__act7.damage(G.player, b, 1, { crit: false }) : 0; await window.__gwait(0.5); out.blow = { dormant: b.dormant, aggro: b.aggro };
      window.__clear(); b = spawnAt(7); await window.__gwait(0.3);
      const lp = m.nearestFloor(b.x + (b.x - p.x) / 7 * 10, b.z + (b.z - p.z) / 7 * 10, 3) || { x: b.x, z: b.z + 10 }, ld = Math.hypot(lp.x - b.x, lp.z - b.z);
      // (out of her reach and the bear's 5 m: she steps back first)
      G.player.x = p.x - (b.x - p.x) / 7 * 3; G.player.z = p.z - (b.z - p.z) / 7 * 3;
      const before = b.dormant; window.__act7.loud(lp.x, lp.z, 10, null); await window.__gwait(1.5);
      out.loud = { before, after: b.dormant, aggro: b.aggro, loudAt: +ld.toFixed(2), wokeBy: window.__act7.AI_LOG['denBear:loudWake'] || 0 };
      window.__clear(); return out; });
    beat('a sleeping Den-bear is not woken by her standing 6 m off', bear.slept && bear.walk.dormant, bear.walk);
    beat('a blow wakes it', !bear.blow.dormant && bear.blow.aggro, bear.blow);
    beat('something loud 10 m from it wakes it, and it comes at the noise', bear.loud.before && !bear.loud.after && bear.loud.aggro && bear.loud.loudAt <= 12, bear.loud);
    const ice = await pg.evaluate(async () => { const G = window.__G, A7 = window.__act7, m = G.zone.map, L = G.zone.L, out = {};
      window.__clear();
      const sh = window.__shadeSpot; if (!sh) return { err: 'no shade cell' };
      const r = window.__sp('rockRoller', sh.x, sh.z, { icebound: true }); r.rot = 0;
      const hp = m.nearestFloor(sh.x + 2, sh.z, 1.2) || m.nearestFloor(sh.x, sh.z + 2, 1.2); G.player.x = hp.x; G.player.z = hp.z;
      out.at = { shade: A7.shade7(r.x, r.z), d: +Math.hypot(hp.x - r.x, hp.z - r.z).toFixed(2) };
      const t0 = A7.now(); await window.__gwait(60);
      out.shade60 = { dormant: r.dormant, statue: r.statue, s: +(A7.now() - t0).toFixed(1), shadeNow: A7.shade7(r.x, r.z) };
      // into the sun (the Den: no cloud ever), her 2 m off
      const p = window.__den; r.x = p.x; r.z = p.z; r.sunT = 0; G.player.x = p.x + 2; G.player.z = p.z;
      const t1 = A7.now(), want = A7.H7().sunWake; await window.__wait(() => !r.dormant, 30000);
      out.sun = { dormant: r.dormant, s: +(A7.now() - t1).toFixed(2), want, shade: A7.shade7(r.x, r.z) };
      window.__clear(); return out; });
    beat('an Icebound sleeps through 60 game-seconds of shade, her 2 m off', ice.at && ice.at.shade && ice.at.d <= 2.5 && ice.shade60.dormant && ice.shade60.s >= 60, ice);
    beat('in sun it wakes within HAZ7.sunWake + 1 s, and not before HAZ7.sunWake', ice.sun && !ice.sun.dormant && ice.sun.s <= ice.sun.want + 1 && ice.sun.s >= ice.sun.want - 0.05, ice.sun);
    const sc = await pg.evaluate(async () => { const G = window.__G, A7 = window.__act7, m = G.zone.map, p = window.__den, out = {};
      window.__clear(); G.player.x = p.x; G.player.z = p.z;
      const q = window.__dirs7(p, 9)[0], pack = []; for (let k = 0; k < 3; k++) { const f = m.nearestFloor(q.x + (k - 1) * 1.2, q.z, 1.5) || q; pack.push(window.__sp('rockScorpion', f.x, f.z, { under: true, packId: 'slab7' })); }
      await window.__gwait(3); out.at9 = pack.map((a) => a.under);
      const ux = (p.x - q.x) / 9, uz = (p.z - q.z) / 9; G.player.x = q.x + ux * 5.5; G.player.z = q.z + uz * 5.5;
      await window.__gwait(1.5); out.at55 = pack.map((a) => a.under);
      // a second pack: one struck, all out
      window.__clear(); G.player.x = p.x; G.player.z = p.z; const p2 = []; for (let k = 0; k < 3; k++) { const f = m.nearestFloor(q.x + (k - 1) * 1.2, q.z, 1.5) || q; p2.push(window.__sp('rockScorpion', f.x, f.z, { under: true, packId: 'slab8' })); }
      await window.__gwait(0.5); A7.damage(G.player, p2[0], 1, { crit: false }); await window.__gwait(1.5); out.struck = p2.map((a) => a.under);
      window.__clear(); return out; });
    beat('a slab\'s scorpions stay under at 9 m and all come out at 5.5 m', sc.at9.every(Boolean) && sc.at55.every((u) => !u), sc);
    beat('one struck, the pack comes out', sc.struck.every((u) => !u), sc.struck);
    return out(beats);
  } },
  // the Choughs: no stoop and no Mob at a hero in shade; stoops at her in sun, broken off within 1 s of shade; the Mob lands
  // in sun, and in shade nothing lands
  chough7: { stage: 'B', until: 'E', q: Q(fx7('thawSeen', 'thaw'), '&nopacks'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    await until(pg, () => window.__G.zone?.tide && window.__act7);
    await setup7(pg);
    const r = await pg.evaluate(async () => { const G = window.__G, A7 = window.__act7, LOG = A7.AI_LOG, n = (k) => LOG['chough:' + k] || 0, out = {}, pl = G.player;
      const flock = (p, id) => { const f = []; for (let k = 0; k < 4; k++) { const g = k * 1.57; f.push(window.__sp('chough', p.x + Math.sin(g) * 6, p.z + Math.cos(g) * 6, { packId: id })); } for (const b of f) b.aggro = true; return f; };
      const P = window.__pair7; if (!P) return { err: 'no sun cell beside a shade cell' };
      // in shade: 12 game-seconds, nothing comes down
      window.__clear(); pl.x = P.shade.x; pl.z = P.shade.z; pl.sun7 = 0;
      const d0 = n('dive'), m0 = n('mobTele'), h0 = window.__H7.length; flock(P.shade, 'ch1'); await window.__gwait(12);
      out.shade = { inShade: A7.shade7(pl.x, pl.z), dives: n('dive') - d0, mobs: n('mobTele') - m0, heavy: window.__H7.length - h0 };
      // in sun: a stoop comes; she steps into shade while it is coming: broken off within 1 s
      window.__clear(); const S = window.__den; pl.x = S.x; pl.z = S.z; pl.sun7 = 0; const d1 = n('dive'), b1 = n('diveBroken'); const f2 = flock(S, 'ch2');
      const dv = await window.__wait(() => f2.find((b) => b.fly === 'dive' && !b.atkHit && Math.hypot(b.x - pl.x, b.z - pl.z) > 2.5), 30000);
      out.sun = { dives: n('dive') - d1, inShade: A7.shade7(pl.x, pl.z) };
      if (dv) { pl.x = P.shade.x; pl.z = P.shade.z; const t0 = A7.now(); await window.__wait(() => dv.fly !== 'dive', 8000); out.breakOff = { s: +(A7.now() - t0).toFixed(2), fly: dv.fly, broken: n('diveBroken') - b1, hit: dv.atkHit }; }
      // the Mob in sun: it lands
      window.__clear(); pl.x = P.sun.x; pl.z = P.sun.z; pl.sun7 = 0; const mt = n('mobTele'), mh = n('mobHit'), h1 = window.__H7.length; flock(P.sun, 'ch3');
      await window.__wait(() => n('mobTele') > mt, 40000); const tSun = A7.now(); await window.__wait(() => n('mobHit') + n('mobMiss') + n('mobShade') + n('mobBroken') > mh + (out.mob0 = 0), 8000);
      out.mobSun = { tele: n('mobTele') - mt, hit: n('mobHit') - mh, heavy: window.__H7.slice(h1).filter((h) => h.move === 'mob').length, sun7: +(pl.sun7 || 0).toFixed(1), log: A7.HEAVY7.filter((h) => h.kind === 'chough').slice(-1)[0] };
      // the Mob called in sun, she steps into the shade inside its circle before it lands: nothing lands
      window.__clear(); pl.x = P.sun.x; pl.z = P.sun.z; pl.sun7 = 0; const mt2 = n('mobTele'), ms2 = n('mobShade'), h2 = window.__H7.length; flock(P.sun, 'ch4');
      const called = await window.__wait(() => n('mobTele') > mt2, 40000);
      if (called) { pl.x = P.shade.x; pl.z = P.shade.z; }
      await window.__gwait(2);
      out.mobShade = { called: !!called, shade: n('mobShade') - ms2, heavy: window.__H7.slice(h2).filter((h) => h.move === 'mob').length, d: +Math.hypot(P.sun.x - P.shade.x, P.sun.z - P.shade.z).toFixed(2) };
      window.__clear(); return out; });
    if (r.err) { beat(r.err, false); return out(beats); }
    beat('a hero in shade: no stoop, no Mob, no heavy blow in 12 game-seconds', r.shade.inShade && r.shade.dives === 0 && r.shade.mobs === 0 && r.shade.heavy === 0, r.shade);
    beat('a hero in sun: they stoop', r.sun.dives >= 1 && !r.sun.inShade, r.sun);
    beat('a stoop at her breaks off within 1 s of her stepping into shade', r.breakOff && r.breakOff.s <= 1 && r.breakOff.fly !== 'dive' && !r.breakOff.hit, r.breakOff);
    beat('the Mob in sun: called (1.1 s or more), and it lands one heavy blow', r.mobSun.tele >= 1 && r.mobSun.hit >= 1 && r.mobSun.heavy >= 1 && r.mobSun.log?.tele >= 1.1, r.mobSun);
    beat('the Mob called, she in the shade when it comes: nothing lands', r.mobShade.called && r.mobShade.shade >= 1 && r.mobShade.heavy === 0, r.mobShade);
    return out(beats);
  } },
  // Rested (T1-T5): kills earned by the time away (a faked clock), a kill's Mastery experience doubled while they last,
  // the count down by one; the child's greeting on the first village entry
  rested7: { stage: 'D', until: 'E', q: Q(FX7.fx7_done('forest'), '&nopacks'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    const r = await pg.evaluate(async () => {
      const G = window.__G, h = G.hero, R = await import('/src/game/rested7.js'), D = window.__D, o = {};
      window.__immortal = true;
      h.played = Date.now() - 59 * 60e3; o.m59 = R.restOnTakeUp(h);
      h.played = Date.now() - 8 * 3600e3; o.h8 = R.restOnTakeUp(h); o.rest = h.rest;
      h.played = Date.now() + 3600e3; o.back = R.restOnTakeUp(h);
      const kill = () => { const pl = G.player, a = D.spawnMonster('goblin', pl.x + 2, pl.z); G.zone.actors.push(a); const m0 = h.mxp + h.mlvl * 1e9; D.kill(a); return h.mxp + h.mlvl * 1e9 - m0; };
      const r0 = h.rest, x1 = kill(), r1 = h.rest; h.rest = 0; delete h.rest; const x2 = kill();
      o.kill = { r0, r1, rested: x1, plain: x2 };
      h.rest = 5; h.restNew = true; const said = []; const B = await import('/src/ui/bus.js'); B.on('say', (k) => said.push(k));
      D.enterZone('town'); await new Promise((ok) => setTimeout(ok, 3500)); o.said = said;
      return o;
    });
    beat('59 minutes away gives none; 8 hours gives 120; a clock set back gives none', r.m59 === 0 && r.rest === 120 && r.back === 0, r);
    beat('a rested kill: double Mastery experience, the count down by one', r.kill.r1 === r.kill.r0 - 1 && Math.abs(r.kill.rested / r.kill.plain - 2) < 0.05, r.kill);
    beat('the first village entry with a count: the child\'s greeting', r.said.includes('d.child7.wake'), r.said);
    return out(beats);
  } },
  // ---------- stage C: the two who are not killed (docs/act7-contract.md, The bosses; ai.js KALLISTO, KELADOS) ----------
  // Kallisto at the Den: one boss actor; her moves' telegraphs at least the table's; a heavy blow bossHeavy x armour, never
  // over the cap (and at the cap on Skotos with no armour); a charge ended on a boulder Dazes her 3.5 s; a slide on her takes
  // 5% and Buries her 3 s; the phases turn on life at 66 / 33 with their entries played, both when struck through two at
  // once, and she is struck through them; at 0 life the rest flag, one kill, the body kept and untargetable; no time lock
  kallisto: { stage: 'C', until: 'E', q: Q(fx7('weir3', 'thaw'), '&nopacks&nostory'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    await until(pg, () => window.__G.zone?.tide && window.__act7);
    await setup7(pg); await setupBoss7(pg);
    const TELE = { maul: 0.9, charge: 1.0, charge2: 1.0, roar: 1.2, roar3: 1.2, slam: 1.1, rockfall: 1.2, rocks2: 1.2 };
    // a natural stretch of each phase, her 6-7 m off, then forced moves
    const r = await pg.evaluate(async () => { const G = window.__G, A7 = window.__act7, pl = G.player, out = {}, B = window.__B7;
      const k = B.spawn('kallisto', 'arena'); out.spawn = { lvl: k.level, hp: Math.round(k.hpMax) };
      B.near(k, 7); await window.__wait(() => k.awake, 20000);
      out.one = { awake: k.awake, bosses: G.zone.actors.filter((a) => a.boss && !a.dead && !a.removed).length, bar: G.bossActor === k };
      for (const [ph, frac] of [[0, 1], [1, 0.6], [2, 0.3]]) { if (frac < 1) B.setLife(k, frac); await window.__wait(() => k.phase === ph, 3000); out['phase' + ph] = k.phase; for (let i = 0; i < 6; i++) { B.near(k, i % 2 ? 4 : 10); await window.__gwait(6); } }
      out.H = window.__H7.filter((h) => ['maul', 'charge', 'charge2', 'slam', 'rockfall'].includes(h.move));
      // a forced Maul on Skotos difficulty with no armour: the cap
      G.hero.diff = 5; const arm = G.stats.armor; G.stats.armor = 0; const hm = window.__H7.length;
      for (let i = 0; i < 4 && !window.__H7.slice(hm).find((h) => h.move === 'maul'); i++) { await B.force(k, 'maul'); B.near(k, 3); await window.__wait(() => window.__H7.slice(hm).find((h) => h.move === 'maul'), 8000); }
      out.capHit = window.__H7.slice(hm).find((h) => h.move === 'maul'); G.stats.armor = arm; G.hero.diff = 1;
      out.log = A7.HEAVY7.filter((h) => h.kind === 'kallisto');
      const s = G.stats, red = s.armor / (s.armor + 45 * k.level + 60); out.want = Math.min(A7.H7().bossHeavy * (1 - red), A7.H7().cap) / 100; out.cap = A7.H7().cap; out.red = +red.toFixed(3);
      window.__clear(); return out; });
    beat('one boss actor, awake, and it is the life bar\'s', r.one.awake && r.one.bosses === 1 && r.one.bar, r.one);
    beat('the phases turn at 66% and 33% of her life', r.phase1 === 1 && r.phase2 === 2, { p1: r.phase1, p2: r.phase2 });
    const seen = [...new Set(r.log.map((h) => h.move))];
    beat('every move she played had its table\'s telegraph or more', r.log.length >= 6 && r.log.every((h) => TELE[h.move] != null && h.tele >= TELE[h.move] - 0.001), { seen, short: r.log.filter((h) => !(h.tele >= (TELE[h.move] ?? 99) - 0.001)) });
    beat('she played the Maul, the Charge, the Slam and a Rockfall', ['maul', 'charge', 'slam', 'rockfall'].every((m) => seen.includes(m)), seen);
    beat('a heavy blow is bossHeavy x armour, never over the cap (Warden)', r.H.length >= 2 && r.H.every((h) => Math.abs(h.f - r.want) * 100 <= 1.5 && h.f <= r.cap / 100 + 0.005), { want: +(r.want * 100).toFixed(2), got: r.H.map((h) => h.move + ' ' + (h.f * 100).toFixed(2)) });
    beat('on Skotos with no armour the Maul is held to the cap (42%)', r.capHit && Math.abs(r.capHit.f - 0.42) < 0.006, r.capHit);
    // a charge ended on a boulder: Dazed 3.5 s; a slide on her: 5% and Buried 3 s
    const c = await pg.evaluate(async () => { const G = window.__G, A7 = window.__act7, LOG = A7.AI_LOG, pl = G.player, B = window.__B7, m = G.zone.map, out = {};
      const k = B.spawn('kallisto', 'arena'); k.awake = true; k.aggro = true; k.mcd = {}; k.phase = 0; k.queue = []; k.rockN = 0; window.__D.emit('bossIntro', k);
      const c0 = G.zone.L.spots.arena, bo = G.zone.L.spots.boulders.filter((b) => b.den).map((b) => { const l = Math.hypot(c0.x - b.x, c0.z - b.z), u = { x: (c0.x - b.x) / l, z: (c0.z - b.z) / l }; const h = { x: b.x + u.x * 2.6, z: b.z + u.z * 2.6 }, s = { x: b.x + u.x * 12, z: b.z + u.z * 12 }; return { b, h, s, ok: m.walkable(h.x, h.z) && m.walkable(s.x, s.z) && m.clear(s.x, s.z, b.x + u.x * 1.6, b.z + u.z * 1.6) }; }).find((q) => q.ok);
      if (!bo) return { err: 'no boulder with an open run' };
      k.x = bo.s.x; k.z = bo.s.z; pl.x = bo.h.x; pl.z = bo.h.z; const s0 = LOG['kallisto:chargeStone'] || 0;
      let d0 = 0; const iv0 = setInterval(() => { if (k.dazed > d0) d0 = k.dazed; }, 2);
      await B.force(k, 'charge'); await window.__wait(() => k.dazed > 0, 15000); const t0 = A7.now(); await window.__wait(() => !(k.dazed > 0), 15000); clearInterval(iv0);
      out.charge = { stone: (LOG['kallisto:chargeStone'] || 0) - s0, dazedAt: +d0.toFixed(2), lasted: +(A7.now() - t0).toFixed(2), toBoulder: +Math.hypot(k.x - bo.b.x, k.z - bo.b.z).toFixed(2) };
      // the slide: a Den chute run with her standing in its lane, her test-hero 3 m to the side
      const fl = window.__Fg.flues().filter((f) => f.kind === 'snow' && f.st === 'idle' && (f.area === 'den'));
      let lane = null; for (const f of fl) { const ux = Math.sin(f.dir), uz = Math.cos(f.dir); for (const u of [0.55, 0.65, 0.45, 0.75]) { const x = f.x + ux * f.len * u, z = f.z + uz * f.len * u; if (m.walkable(x, z) && window.__Fg.inFlue(f, x, z, 0) && m.walkable(x - uz * 3, z + ux * 3)) { lane = { f, x, z, hx: x - uz * 3, hz: z + ux * 3 }; break; } } if (lane) break; }
      if (!lane) return { ...out, err: 'no den lane' };
      k.move = null; k.dash = null; k.dazed = 0; k.state = 'chase'; k.x = lane.x; k.z = lane.z; pl.x = lane.hx; pl.z = lane.hz; k.cd = 99;
      const hp0 = k.hp, dz0 = LOG['kallisto:dazed'] || 0; let maxD = 0; const iv = setInterval(() => { if (k.dazed > maxD) maxD = k.dazed; }, 5);
      window.__Fg.fireFlue(lane.f.i, k); await window.__wait(() => lane.f.st === 'idle', 15000); await window.__gwait(0.2); clearInterval(iv);
      out.slide = { took: +((hp0 - k.hp) / k.hpMax * 100).toFixed(2), dazed: (LOG['kallisto:dazed'] || 0) - dz0, buried: +maxD.toFixed(2), inLane: window.__Fg.inFlue(lane.f, k.x, k.z, 0) };
      // (the same lane kicked by the hero: forge.js passes her as the blow's source, so her elite-damage bonus grows it)
      await window.__wait(() => !(k.dazed > 0), 8000); k.x = lane.x; k.z = lane.z; k.cd = 99; lane.f.armed = true; const hp1 = k.hp; window.__Fg.fireFlue(lane.f.i, pl); await window.__wait(() => lane.f.st === 'idle', 15000); await window.__gwait(0.2);
      out.slideHero = { took: +((hp1 - k.hp) / k.hpMax * 100).toFixed(2), eliteDmg: G.stats.eliteDmg };
      window.__clear(); return out; });
    if (c.err) beat(c.err, false);
    beat('a charge ended on a boulder Dazes her 3.5 s', c.charge && c.charge.stone >= 1 && Math.abs(c.charge.dazedAt - 3.5) < 0.1 && Math.abs(c.charge.lasted - 3.5) < 0.25, c.charge);
    beat('a slide on her (as her Roar calls it) takes 5% of her life and Buries her 3 s', c.slide && Math.abs(c.slide.took - 5) < 0.3 && c.slide.dazed >= 1 && Math.abs(c.slide.buried - 3) < 0.1, c.slide);
    beat('(known, forge.js) a slide the hero kicked: 5% x her elite-damage bonus', c.slideHero && Math.abs(c.slideHero.took - 5 * (1 + (c.slideHero.eliteDmg || 0) / 100)) < 0.4, c.slideHero);
    // struck through two thresholds at once: both entries, in order, while she is struck; then the rest
    const e = await pg.evaluate(async () => { const G = window.__G, A7 = window.__act7, LOG = A7.AI_LOG, pl = G.player, B = window.__B7, out = {}, B2 = await import('/src/ui/bus.js');
      const k = B.spawn('kallisto', 'arena'); B.near(k, 8); await window.__wait(() => k.awake, 20000);
      const kills = []; B2.on('kill', (a) => { if (a === k) kills.push({ flag: !!G.hero.flags.kallistoRest }); }); const rests = []; B2.on('bossRest', (kind) => rests.push(kind));
      const ph = []; B2.on('boss7Phase', (kind, p) => { if (kind === 'kallisto') ph.push(p); });
      await window.__gwait(1); const k0 = A7.HEAVY7.length; const dmg = B.setLife(k, 0.3);
      // struck all the while the entries play
      const hits = []; const iv = setInterval(() => { if (k.hp > k.hpMax * 0.06) hits.push(window.__act7.damage(null, k, k.hpMax * 0.004, { crit: false })); }, 50);
      await window.__wait(() => k.phase === 2, 3000); out.phase = k.phase;
      await window.__wait(() => A7.HEAVY7.slice(k0).some((h) => h.kind === 'kallisto' && h.move === 'roar3'), 25000); clearInterval(iv);
      out.entries = A7.HEAVY7.slice(k0).filter((h) => h.kind === 'kallisto' && (h.move === 'rocks2' || h.move === 'roar3')).map((h) => h.move);
      out.struck = { n: hits.length, zero: hits.filter((v) => !(v > 0)).length, life: +(k.hp / k.hpMax).toFixed(3) }; out.ph = ph; out.first = dmg;
      // 0 life
      window.__act7.damage(null, k, k.hpMax * 2, { crit: false }); await window.__gwait(3);
      out.rest = { dead: k.dead, removed: !!k.removed, inScene: G.zone.actors.includes(k), body: !!k.avatar && k.avatar.group.visible && !!k.avatar.group.parent, flag: !!G.hero.flags.kallistoRest, kills, rests, leg: !!G.hero.flags.legFrom_kallisto, again: window.__act7.damage(null, k, 100, {}), bar: G.bossActor === k };
      return out; });
    beat('struck from full to 30% in one blow: phase 3 at once, and both entries played in order (rocks, then the Roar)', e.phase === 2 && e.entries[0] === 'rocks2' && e.entries[1] === 'roar3' && e.ph.join() === '2,3', e);
    beat('every blow during the entries took life (nothing invulnerable, no floor)', e.struck.n >= 5 && e.struck.zero === 0 && e.struck.life < 0.3, e.struck);
    beat('at 0 life: the rest flag saved before the kill was heard, one kill, \'bossRest\', the first-kill legendary', e.rest.flag && e.rest.kills.length === 1 && e.rest.kills[0].flag && e.rest.rests.join() === 'kallisto' && e.rest.leg, e.rest);
    beat('the body stays in the scene, never removed, and nothing can strike it', e.rest.dead && !e.rest.removed && e.rest.inScene && e.rest.body && e.rest.again === 0 && !e.rest.bar, e.rest);
    // no time lock: a fresh fight ended in under 20 game-seconds of huge blows, every entry still played
    const tl = await pg.evaluate(async () => { const G = window.__G, A7 = window.__act7, B = window.__B7; G.hero.flags.kallistoRest = false; window.__clear();
      const k = B.spawn('kallisto', 'arena'); B.near(k, 8); await window.__wait(() => k.awake, 20000); const t0 = A7.now(), k0 = A7.HEAVY7.length, got = [];
      got.push(A7.damage(null, k, k.hpMax * 0.36, { crit: false })); await window.__wait(() => A7.HEAVY7.slice(k0).some((h) => h.kind === 'kallisto' && h.move === 'rocks2'), 15000);
      got.push(A7.damage(null, k, k.hpMax * 0.36, { crit: false })); await window.__wait(() => A7.HEAVY7.slice(k0).some((h) => h.kind === 'kallisto' && h.move === 'roar3'), 15000);
      got.push(A7.damage(null, k, k.hpMax * 0.5, { crit: false }));
      return { s: +(A7.now() - t0).toFixed(1), dead: k.dead, got: got.map((v) => v > 0), entries: A7.HEAVY7.slice(k0).filter((h) => h.kind === 'kallisto').map((h) => h.move) }; });
    beat('no time lock: rested in under 20 game-seconds of huge blows, both entries played, every blow landed', tl.dead && tl.s < 20 && tl.got.every(Boolean) && tl.entries.includes('rocks2') && tl.entries.includes('roar3'), tl);
    return out(beats);
  } },
  // Kelados at the Dam: held asleep until keladosWake (the fixture has it); rooted at his seat in phase 1; telegraphs; heavy
  // blows; a Tremor's ring stopped by cover; a sluice kneels him 5 s Stunned and takes none of his life, each lever once,
  // levers 2 and 3 only after 66% / 33%; the plates' picture; entries at once; the rest; no time lock
  kelados: { stage: 'C', until: 'E', q: Q(fx7('keladosWake', 'tarn'), '&nopacks&nostory'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    await until(pg, () => window.__G.zone?.tide && window.__act7);
    await setup7(pg); await setupBoss7(pg);
    const TELE = { sweep: 1.0, tremor: 1.2, iceBlock: 1.3, boulderRoll: 1.0, loosed: 1.5, awake: 1.5 };
    const r = await pg.evaluate(async () => { const G = window.__G, A7 = window.__act7, LOG = A7.AI_LOG, pl = G.player, out = {}, B = window.__B7, m = G.zone.map, B2 = await import('/src/ui/bus.js');
      const plates = []; B2.on('keladosPlates', (n) => plates.push(n)); const bare = []; B2.on('lever7Bare', (k) => bare.push(k)); const win = []; B2.on('boss7Window', (kind) => win.push(kind));
      const k = B.spawn('kelados', 'seat'); const seat = { x: k.x, z: k.z };
      B.near(k, 12); await window.__wait(() => k.awake, 20000);
      out.one = { awake: k.awake, bosses: G.zone.actors.filter((a) => a.boss && !a.dead && !a.removed).length, bar: G.bossActor === k, rooted: !!k.rooted };
      // phase 1, 12 m off then 6 m off: he never leaves his seat
      for (let i = 0; i < 4; i++) { B.near(k, i % 2 ? 6 : 12); await window.__gwait(6); }
      out.root = { moved: +Math.hypot(k.x - seat.x, k.z - seat.z).toFixed(2), rooted: !!k.rooted };
      // a Tremor: her behind a rock 10 m off takes nothing; in the open she takes the heavy blow
      const ang = Math.atan2(pl.x - k.x, pl.z - k.z); let spot = null; for (let o = 0; o < 6.28 && !spot; o += 0.3) { const g = ang + o, p = m.nearestFloor(k.x + Math.sin(g) * 10, k.z + Math.cos(g) * 10, 1.5), q = { x: k.x + Math.sin(g) * 7.5, z: k.z + Math.cos(g) * 7.5 }; if (p && m.walkable(q.x, q.z) && m.los(k.x, k.z, p.x, p.z)) spot = { p, q }; }
      if (spot) { const rk = A7.rock7(spot.q.x, spot.q.z, 30); pl.x = spot.p.x; pl.z = spot.p.z; const c0 = LOG['kelados:tremorCover'] || 0, h0 = window.__H7.length; await B.force(k, 'tremor'); await window.__wait(() => (LOG['kelados:tremorCover'] || 0) > c0 || window.__H7.slice(h0).some((h) => h.move === 'tremor'), 15000); await window.__gwait(1.5);
        out.cover = { los: m.los(k.x, k.z, pl.x, pl.z), covered: (LOG['kelados:tremorCover'] || 0) - c0, hit: window.__H7.slice(h0).filter((h) => h.move === 'tremor').length, cells: rk.cells.length };
        A7.clear7(); const h1 = window.__H7.length; await window.__gwait(0.3); await B.force(k, 'tremor'); await window.__wait(() => window.__H7.slice(h1).some((h) => h.move === 'tremor'), 15000); out.open = { hit: window.__H7.slice(h1).filter((h) => h.move === 'tremor').length }; }
      // the sluice under his seat: lever 1 (bare from the fight's start); he kneels 5 s Stunned and takes none of his life
      const lv = G.zone.act7.levers, L1 = lv.find((l) => l.k === 1), L2 = lv.find((l) => l.k === 2);
      await window.__wait(() => !k.move && !k.dash && !(k.dazed > 0), 10000); for (const mv in k.mcd) k.mcd[mv] = 99; B.near(k, 12);
      let st = 0; const ivs = setInterval(() => { if (k.status.stun > st) st = k.status.stun; }, 2);
      const hp0 = k.hp, kn0 = LOG['kelados:kneel'] || 0; out.l1used0 = L1.used; window.__D.emit('lever7', L1, G.zone);
      await window.__wait(() => (LOG['kelados:kneel'] || 0) > kn0, 15000); const tk = A7.now(); await window.__wait(() => !(k.status.stun > 0), 15000); clearInterval(ivs); for (const mv in k.mcd) k.mcd[mv] = Math.random() * 2;
      out.kneel = { kneel: (LOG['kelados:kneel'] || 0) - kn0, stun: +st.toFixed(2), lasted: +(A7.now() - tk).toFixed(2), life: +((hp0 - k.hp) / k.hpMax * 100).toFixed(3), sluice1: LOG['kelados:sluice1'] || 0 };
      await window.__wait(() => window.__Fg.flues().every((f) => f.kind !== 'water' || f.st === 'idle'), 15000);
      window.__D.emit('lever7', L1, G.zone); await window.__gwait(0.5); out.again = { sluice1: LOG['kelados:sluice1'] || 0, used: L1.used };
      window.__D.emit('lever7', L2, G.zone); await window.__gwait(0.5); out.early2 = LOG['kelados:sluice2'] || 0;
      // phase 2 and 3, a stretch of each; lever 2 after 66%
      B.setLife(k, 0.6); await window.__wait(() => A7.HEAVY7.some((h) => h.kind === 'kelados' && h.move === 'loosed'), 15000); out.loosed = { rooted: !!k.rooted, lake: G.zone.tide?.mere?.h };
      await window.__wait(() => window.__Fg.flues().every((f) => f.kind !== 'water' || f.st === 'idle'), 15000);
      window.__D.emit('lever7', L2, G.zone); await window.__gwait(0.5); out.late2 = LOG['kelados:sluice2'] || 0;
      for (let i = 0; i < 4; i++) { B.near(k, i % 2 ? 6 : 12); await window.__gwait(6); }
      B.setLife(k, 0.3); await window.__wait(() => A7.HEAVY7.some((h) => h.kind === 'kelados' && h.move === 'awake'), 15000); out.awakeLake = G.zone.tide?.mere?.h;
      for (let i = 0; i < 4; i++) { B.near(k, i % 2 ? 6 : 12); await window.__gwait(6); }
      out.blocks = { most: window.__maxBlocks7 || 0 };
      out.log = A7.HEAVY7.filter((h) => h.kind === 'kelados'); out.H = window.__H7.filter((h) => ['sweep', 'tremor', 'iceBlock', 'boulderRoll'].includes(h.move));
      const s = G.stats, red = s.armor / (s.armor + 45 * k.level + 60); out.want = Math.min(A7.H7().bossHeavy * (1 - red), A7.H7().cap) / 100; out.cap = A7.H7().cap;
      // 0 life
      const kills = []; B2.on('kill', (a) => { if (a === k) kills.push({ flag: !!G.hero.flags.keladosRest }); });
      A7.damage(null, k, k.hpMax * 2, { crit: false }); await window.__gwait(3);
      out.rest = { dead: k.dead, removed: !!k.removed, inScene: G.zone.actors.includes(k), body: !!k.avatar && !!k.avatar.group.parent, flag: !!G.hero.flags.keladosRest, kills, leg: !!G.hero.flags.legFrom_kelados, again: A7.damage(null, k, 100, {}) };
      out.plates = plates; out.bare = bare; out.win = win;
      return out; });
    beat('held by keladosWake (set): one boss actor, awake, rooted, the life bar\'s', r.one.awake && r.one.bosses === 1 && r.one.bar && r.one.rooted, r.one);
    beat('rooted at his seat through phase 1', r.root.rooted && r.root.moved < 0.3, r.root);
    beat('a Tremor\'s ring stops at cover: behind a rock she takes nothing', r.cover && r.cover.covered >= 1 && r.cover.hit === 0 && r.cover.cells >= 2, r.cover);
    beat('in the open the Tremor lands', r.open?.hit >= 1, r.open);
    beat('the sluice under him: he kneels 5 s Stunned and loses none of his life', r.kneel.kneel === 1 && Math.abs(r.kneel.stun - 5) < 0.1 && Math.abs(r.kneel.lasted - 5) < 0.25 && r.kneel.life === 0, r.kneel);
    beat('each lever once a fight; lever 2 not before 66%, then yes', r.again.sluice1 === 1 && r.again.used && r.early2 === 0 && r.late2 === 1, { again: r.again, early2: r.early2, late2: r.late2 });
    beat('the entries: walking from phase 2, the lake to 0.9 then 0.6, levers 2 and 3 bared, the plates 0 / 2 / 6 / 8, a window at the first kneel', !r.loosed.rooted && Math.abs(r.loosed.lake - 0.9) < 0.01 && Math.abs(r.awakeLake - 0.6) < 0.01 && r.bare.join() === '1,2,3' && r.plates.join() === '0,2,6,8' && r.win.join() === 'kelados', { loosed: r.loosed, awake: r.awakeLake, bare: r.bare, plates: r.plates, win: r.win });
    const seen = [...new Set(r.log.map((h) => h.move))];
    beat('every move he played had its table\'s telegraph or more; the Sweep, Tremor, Ice Block and Boulder roll all seen', r.log.every((h) => TELE[h.move] != null && h.tele >= TELE[h.move] - 0.001) && ['sweep', 'tremor', 'iceBlock', 'boulderRoll'].every((mv) => seen.includes(mv)), { seen, short: r.log.filter((h) => !(h.tele >= (TELE[h.move] ?? 99) - 0.001)) });
    beat('a heavy blow is bossHeavy x armour, never over the cap', r.H.length >= 2 && r.H.every((h) => Math.abs(h.f - r.want) * 100 <= 1.5 && h.f <= r.cap / 100 + 0.005), { want: +(r.want * 100).toFixed(2), got: r.H.map((h) => h.move + ' ' + (h.f * 100).toFixed(2)) });
    beat('three of his blocks stand at most', r.blocks.most <= 3, r.blocks);
    beat('at 0 life: keladosRest saved before the kill was heard, one kill, the legendary, the body kept and untargetable', r.rest.flag && r.rest.kills.length === 1 && r.rest.kills[0].flag && r.rest.leg && r.rest.dead && !r.rest.removed && r.rest.inScene && r.rest.body && r.rest.again === 0, r.rest);
    const tl = await pg.evaluate(async () => { const G = window.__G, A7 = window.__act7, B = window.__B7; G.hero.flags.keladosRest = false; window.__clear();
      const k = B.spawn('kelados', 'seat'); B.near(k, 10); await window.__wait(() => k.awake, 20000); const t0 = A7.now(), k0 = A7.HEAVY7.length, got = [];
      const ent = (mv) => () => A7.HEAVY7.slice(k0).some((h) => h.kind === 'kelados' && h.move === mv);
      got.push(A7.damage(null, k, k.hpMax * 0.36, { crit: false })); await window.__wait(ent('loosed'), 15000);
      got.push(A7.damage(null, k, k.hpMax * 0.36, { crit: false })); await window.__wait(ent('awake'), 15000);
      got.push(A7.damage(null, k, k.hpMax * 0.5, { crit: false }));
      // and both thresholds in one blow on a fresh one: both entries, in order
      G.hero.flags.keladosRest = false; window.__clear(); const k2 = B.spawn('kelados', 'seat'); B.near(k2, 10); await window.__wait(() => k2.awake, 20000); const k1 = A7.HEAVY7.length;
      A7.damage(null, k2, k2.hpMax * 0.7, { crit: false }); await window.__wait(() => A7.HEAVY7.slice(k1).some((h) => h.kind === 'kelados' && h.move === 'awake'), 20000);
      return { s: +(A7.now() - t0).toFixed(1), dead: k.dead, got: got.map((v) => v > 0), entries: A7.HEAVY7.slice(k0, k1).filter((h) => h.kind === 'kelados').map((h) => h.move), both: A7.HEAVY7.slice(k1).filter((h) => h.kind === 'kelados' && (h.move === 'loosed' || h.move === 'awake')).map((h) => h.move), ph2: k2.phase }; });
    beat('no time lock: rested in under 20 game-seconds of huge blows, both entries played, every blow landed', tl.dead && tl.s < 20 && tl.got.every(Boolean) && tl.entries.includes('loosed') && tl.entries.includes('awake'), tl);
    beat('struck through both thresholds at once: both entries in order', tl.ph2 === 2 && tl.both[0] === 'loosed' && tl.both[1] === 'awake', tl.both);
    return out(beats);
  } },
  // a Shadow Gate's layout is the shipped generator's for the same seed (no older layout changes with the act)
  gate7: { stage: 'A', until: 'E', q: Q(FX7.fx7_done('town')), run: async (pg) => {
    const h = await pg.evaluate(async () => { const g1 = await import('/src/world/gen.js'); const sum = (L) => { let a = 0; for (let i = 0; i < L.cells.length; i++) a = (a * 31 + L.cells[i] + i) >>> 0; return [L.w, L.h, a, L.packs.length, L.props.length].join(':'); }; return { crypt: sum(g1.genCrypt(4242, { rooms: 12, mh: 30 })), forest: sum(g1.genForest(4242, { h: 120 })) }; });
    // (the sums as v22.1 built them: main at c5833a1)
    const want = { crypt: process.env.GATE7_CRYPT, forest: process.env.GATE7_FOREST };
    return { pass: !want.crypt || (h.crypt === want.crypt && h.forest === want.forest), sums: h, note: want.crypt ? 'compared' : 'recorded: set GATE7_CRYPT and GATE7_FOREST to compare' };
  } },
  // ---------- stage D, the story (story.js, the Act VII section; docs/act7-contract.md, Story) ----------
  // q40: the hook at Whitecliff from the v22 hero (no act7 field: she crosses the migration first). The pre-dawn
  // narration, the child, Halda at the staff with news (call7, q40); her word, the third peak's smoke, haldaOut, q41, the
  // three given Names and the one free unlearning; she walks out, her anvil stays; the goat track open at the Pass
  hook7: { stage: 'D', until: 'E', q: Q(FX7.fx7_new('town')), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    await ST.open(pg);
    const m = await pg.evaluate(() => { const h = window.__G.hero; return { act7: h.act7, act6: h.act6, quest0: h.quest, names: !!h.names }; });
    beat('(b) the Act VI-end hero written before the act (no act7 field) is taken up: act7 -1, Act VI kept', m.act7 === -1 && m.act6 >= 0 && m.names, m);
    const ok0 = await ST.until(pg, () => { const G = window.__G; return G.hero.flags.call7 && G.hero.quest === 40 && !G.cine && G.mode === 'play'; }, 240000);
    const s0 = await pg.evaluate(() => { const G = window.__G, z = G.zone, w = z.townNpc.smith, st = z.L.spots.npcs.wayfarer; return { quest: G.hero.quest, call7: !!G.hero.flags.call7, haldaAt: +Math.hypot(w.a.x - st.x, w.a.z - st.z).toFixed(1), news: window.__S7.npcHasNews('smith', w.a), smokes: Object.keys(z.town.smokes7 || {}).length, child: !!z.p5?.child, text: window.__S7.questText() }; });
    beat('the call: call7 saved, q40, Halda by Isarn\'s staff with news, the child there, seven day-smokes on the skyline', ok0 && s0.call7 && s0.quest === 40 && s0.haldaAt < 3 && s0.news === true && s0.child && s0.smokes === 7, s0);
    beat('the narration (d.spring.1-4) and the child\'s three lines', (await ST.told(pg, ['d.spring.1', 'd.spring.2', 'd.spring.3', 'd.spring.4'])) && (await ST.spoke(pg, ['d.child7.1', 'd.child7.2', 'd.child7.3'])), await ST.log(pg));
    // her word
    await ST.use(pg, 'z.townNpc.smith.it');
    const ok1 = await ST.until(pg, () => { const G = window.__G; return G.hero.flags.haldaOut && G.hero.quest === 41 && !G.cine; }, 180000);
    beat('her word (a1-a8), the smoke on the third peak (and the lookout got clear): haldaOut, q41', ok1 && (await ST.spoke(pg, ['d.halda7.a1', 'd.halda7.a6', 'd.halda7.a7', 'd.halda7.a8'])) && (await ST.told(pg, ['d.smoke.1', 'd.smoke.2'])), await ST.log(pg));
    await ST.until(pg, () => window.__toasts.includes(window.__D.t('name7.free')), 30000);
    const n = await pg.evaluate(() => { const h = window.__G.hero, N = h.names || {}; return { free: N.free, said: N.said, learnt: N.learnt, given: window.__toasts.includes(window.__D.t('name7.given')), freeT: window.__toasts.includes(window.__D.t('name7.free')), text: window.__S7.questText() }; });
    beat('the three given Names (Arna said in slot 1), the free unlearning, both told', n.free === 1 && n.said?.[0] === 'arna' && ['arna', 'isarn', 'pherousa'].every((id) => n.learnt?.includes(id)) && n.given && n.freeT, n);
    const gone = await ST.until(pg, () => { const z = window.__G.zone; return !z.actors.includes(z.townNpc.smith.a) && !!z.interact.find((i) => i.kind === 'anvil7'); }, 120000);
    await ST.use(pg, "z.interact.find((i) => i.kind === 'anvil7')");
    const an = await ST.until(pg, () => window.__G.panel === 'smith', 20000);
    beat('Halda walks out by the mountain road; her anvil is an interact (the chalk line, then the reforge panel)', gone && an && (await ST.told(pg, ['d.anvil7'])), { gone, an });
    await pg.evaluate(() => window.__D.closePanel?.());
    const bark = await pg.evaluate(() => { const z = window.__G.zone, v = z.actors.filter((a) => a.npc === 'villager'); window.__dlg.length = 0; window.__D.emit('talk', 'villager', v.find((a) => a.bark % 4 === 1)); return window.__dlg.slice(); });
    await ST.until(pg, () => !document.querySelector('#dialog:not([hidden])'), 10000);
    beat('a villager\'s bark at home while she is away (d.v7.2)', bark.includes('d.v7.2'), bark);
    await ST.travel(pg, 'pass', 'waypoint');
    const tr = await pg.evaluate(() => { const z = window.__G.zone, e = z.interact.find((i) => i.kind === 'exit' && i.to === 'thaw'); return { exit: !!e, locked: e?.locked, open: !!window.__G.hero.flags[e?.locked] }; });
    beat('the goat track at the Pass\'s camp is open (locked by haldaOut)', tr.exit && tr.locked === 'haldaOut' && tr.open, tr);
    return out(beats);
  } },
  // q41-q43: the Meltwaters. The arrival (thawSeen), Halda's camp word, the three weirs each with its memory in stone in
  // count order whichever was taken first, the buff, q42; Halda before the Den; her three calls, once each; Kallisto's
  // rest on bus 'bossRest' (driven here until her fight lands): the cub, q.stairOpen, q43, the Water-stair open
  thaw7: { stage: 'D', until: 'E', q: Q(fx7('haldaOut', 'thaw'), '&nopacks'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    await ST.open(pg);
    const ok0 = await ST.until(pg, () => { const G = window.__G; return G.hero.flags.thawSeen && !G.cine && G.mode === 'play'; }, 120000);
    beat('the arrival: thawSeen saved, the look north (d.thaw.1-2), q41', ok0 && (await ST.told(pg, ['d.thaw.1', 'd.thaw.2'])) && (await pg.evaluate(() => window.__G.hero.quest)) === 41, await ST.log(pg));
    const h0 = await pg.evaluate(() => { const z = window.__G.zone, a = z.act7.halda, c = z.L.spots.npcs.halda; return { at: +Math.hypot(a.x - c.x, a.z - c.z).toFixed(1), news: window.__S7.npcHasNews('smith', a) }; });
    await ST.use(pg, 'z.interact.find((i) => i.actor === z.act7.halda)');
    const ok1 = await ST.until(pg, () => window.__G.hero.flags.haldaCamp7 && window.__G.panel === 'smith', 60000);
    await pg.evaluate(() => window.__D.closePanel?.());
    beat('Halda at the Goat Track camp with news: the Race taught (b1-b6), haldaCamp7, her stores', h0.at < 1.5 && h0.news === true && ok1 && (await ST.spoke(pg, ['d.halda7.b1', 'd.halda7.b5', 'd.halda7.b6'])), h0);
    // the weirs out of order (2, 1, 3): the memories in count order all the same
    let n = 0;
    for (const k of [2, 1, 3]) {
      n++;
      await goTo(pg, 'weirs.' + (k - 1)); const u = await use(pg, 'weir7', k);
      const ok = await ST.until(pg, (n) => { const G = window.__G; return G.hero.flags['mem_s' + n] && !G.cine && !G.zone.memory; }, 120000, n);
      const s = await pg.evaluate(({ n, k }) => { const G = window.__G, F = G.hero.flags; return { flag: !!F['weir' + k], mem: !!F['mem_s' + n], order: F.weirs7, buff: (G.player.buffs.memory || 0) > 0, quest: G.hero.quest, mh: G.zone.tide?.mere?.h ?? G.zone.tide?.mh }; }, { n, k });
      beat(`weir ${k} turned ${n}${['st', 'nd', 'rd'][n - 1]}: its flag, Memory ${n} (d.mason.m${n}.1-4), Memory of the Stoneborn`, u === 'ok' && ok && s.flag && s.mem && s.buff && (await ST.spoke(pg, [1, 2, 3, 4].map((i) => `d.mason.m${n}.${i}`))) && (await ST.told(pg, ['lamp.buff7'])), s);
    }
    const s3 = await pg.evaluate(() => { const G = window.__G, z = G.zone, a = z.act7.halda, r = z.L.spots.haldaRim; return { quest: G.hero.quest, text: window.__S7.questText(), rim: +Math.hypot(a.x - r.x, a.z - r.z).toFixed(1), news: window.__S7.npcHasNews('smith', a) }; });
    beat('the third weir: q.raceLow, q42, Halda on the bar before the Den with news', s3.quest === 42 && (await ST.told(pg, ['q.raceLow'])) && s3.rim < 3.5 && s3.news === true, s3);
    await ST.use(pg, 'z.interact.find((i) => i.actor === z.act7.halda)');
    const ok2 = await ST.until(pg, () => window.__G.hero.flags.haldaDen7 && window.__G.panel === 'smith', 60000);
    await pg.evaluate(() => window.__D.closePanel?.());
    beat('her word before the Den (w1-w3): haldaDen7', ok2 && (await ST.spoke(pg, ['d.halda7.w1', 'd.halda7.w2'])));
    const shut = await pg.evaluate(() => { const e = window.__G.zone.interact.find((i) => i.kind === 'exit' && i.to === 'tarn'); return { locked: e?.locked, open: !!window.__G.hero.flags[e?.locked] }; });
    // her calls, a phase each, once each (driven on the bus until the fight lands)
    // (a stand-in for the bear on the bus: the calls are kept on the actor that names the phase, once each)
    const sync = await pg.evaluate(() => { window.__fk7 = { kind: 'kallisto' }; window.__says.length = 0; for (const ph of [1, 2, 2, 3, 1, 3]) window.__D.emit('boss7Phase', 'kallisto', ph, window.__fk7); return window.__says.filter((k) => /halda7\.k/.test(k)); });
    await pg.waitForTimeout(2600);
    const again = await pg.evaluate(() => { const n0 = window.__says.length; for (const ph of [2, 3]) window.__D.emit('boss7Phase', 'kallisto', ph, window.__fk7); return { k1: window.__says.includes('d.halda7.k1'), more: window.__says.length - n0 }; });
    beat('Halda\'s calls at Kallisto: k2 and k3 on their phase\'s entry, k1 8 s into phase 1, none twice', JSON.stringify(sync) === JSON.stringify(['d.halda7.k2', 'd.halda7.k3']) && again.k1 && again.more === 0, { sync, again });
    await pg.evaluate(() => window.__D.emit('bossRest', 'kallisto'));
    const ok3 = await ST.until(pg, () => { const G = window.__G; return G.hero.flags.kallistoRest && G.hero.quest === 43 && !G.cine; }, 120000);
    const s4 = await pg.evaluate(() => { const G = window.__G, e = G.zone.interact.find((i) => i.kind === 'exit' && i.to === 'tarn'); return { quest: G.hero.quest, open: !!G.hero.flags[e?.locked], news: window.__S7.npcHasNews('smith', G.zone.act7.halda) }; });
    beat('Kallisto\'s rest: she sits, the cub, Halda\'s two lines; q.stairOpen, q43, the Water-stair open (shut before)', ok3 && shut.locked === 'kallistoRest' && !shut.open && s4.open && (await ST.told(pg, ['d.kall.1', 'd.kall.2', 'q.stairOpen'])) && (await ST.spoke(pg, ['d.halda7.k4', 'd.kall.3', 'd.halda7.k5'])), { shut, s4 });
    return out(beats);
  } },
  // q43-q46: the Hanging Lake. The arrival (tarnSeen, q44), Halda's camp word, the three winches with Memories 4-6 in
  // count order, the wake after Memory 6 (keladosWake, q45), her calls and her one act (a lever at 25 s of phase 3 with
  // none pulled: bus 'haldaLever'), Kelados's rest on 'bossRest' («Ξεκουράσου.», q46), the great wheel offered
  tarn7: { stage: 'D', until: 'E', q: Q(fx7('kallistoRest', 'tarn'), '&nopacks'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    await ST.open(pg);
    const ok0 = await ST.until(pg, () => { const G = window.__G; return G.hero.flags.tarnSeen && G.hero.quest === 44 && !G.cine && G.mode === 'play'; }, 120000);
    beat('the arrival: tarnSeen saved, the lake and the shape in the ice (d.tarn.1-2), Halda\'s low word, q44', ok0 && (await ST.told(pg, ['d.tarn.1', 'd.tarn.2'])) && (await pg.evaluate(() => window.__says.includes('d.halda7.t0'))), await ST.log(pg));
    await ST.use(pg, 'z.interact.find((i) => i.actor === z.act7.halda)');
    const ok1 = await ST.until(pg, () => window.__G.hero.flags.haldaHead7 && window.__G.panel === 'smith', 60000);
    await pg.evaluate(() => window.__D.closePanel?.());
    const t4 = await pg.evaluate(() => window.__G.hero.cls === 'mage' ? 'd.halda7.t4.m' : 'd.halda7.t4');
    beat('Halda at the Stair\'s Head: the Sleeper told of (t1-t6, the Mage\'s t4), haldaHead7', ok1 && (await ST.spoke(pg, ['d.halda7.t1', 'd.halda7.t2', t4, 'd.halda7.t6'])));
    let n = 3;
    for (const k of [3, 1, 2]) {
      n++;
      await goTo(pg, 'winches.' + (k - 1)); const u = await use(pg, 'winch7', k);
      const ok = await ST.until(pg, (n) => { const G = window.__G; return G.hero.flags['mem_s' + n] && !G.zone.memory && (n < 6 ? !G.cine : true); }, 120000, n);
      const s = await pg.evaluate(({ n, k }) => { const G = window.__G, F = G.hero.flags; return { flag: !!F['winch' + k], mem: !!F['mem_s' + n], quest: G.hero.quest, wake: !!F.keladosWake }; }, { n, k });
      beat(`winch ${k} freed: its flag, Memory ${n} (d.mason.m${n}.1-4)${n < 6 ? ', the Sleeper not yet woken' : ''}`, u === 'ok' && ok && s.flag && s.mem && (n === 6 || (!s.wake && s.quest === 44)) && (await ST.spoke(pg, [1, 2, 3, 4].map((i) => `d.mason.m${n}.${i}`))), s);
    }
    const ok2 = await ST.until(pg, () => { const G = window.__G; return G.hero.flags.keladosWake && G.hero.quest === 45 && !G.cine && window.__says.includes('d.halda7.s0b'); }, 120000);
    const w = await pg.evaluate(() => { const G = window.__G, z = G.zone, a = z.act7.halda, r = z.L.spots.haldaRim; return { quest: G.hero.quest, rim: +Math.hypot(a.x - r.x, a.z - r.z).toFixed(1), ev: window.__ev7.includes('keladosWake') }; });
    beat('after Memory 6 the wake: keladosWake saved, the cine (d.kel.w1-w2), Halda at the rim (s0, s0b), q45, bus keladosWake', ok2 && (await ST.told(pg, ['d.kel.w1', 'd.kel.w2'])) && w.rim < 3.5 && w.ev, w);
    const sync = await pg.evaluate(() => { window.__fk7 = { kind: 'kelados', dead: false }; window.__says.length = 0; for (const ph of [1, 2, 1, 3, 3]) window.__D.emit('boss7Phase', 'kelados', ph, window.__fk7); return window.__says.filter((k) => /halda7\.s/.test(k)); });
    const lever = await ST.until(pg, () => window.__ev7.includes('haldaLever'), 60000);
    const calls = await pg.evaluate(() => window.__says.filter((k) => /halda7\.s/.test(k)));
    beat('Halda\'s calls at Kelados (s2, s3 at once, s1 10 s in, once each); 25 s into phase 3 with no lever pulled she pulls one (s3b, bus haldaLever)', lever && JSON.stringify(sync) === JSON.stringify(['d.halda7.s2', 'd.halda7.s3']) && ['d.halda7.s1', 'd.halda7.s2', 'd.halda7.s3', 'd.halda7.s3b'].every((k) => calls.filter((c) => c === k).length === 1), { sync, calls });
    await pg.evaluate(() => window.__D.emit('bossRest', 'kelados'));
    const ok3 = await ST.until(pg, () => { const G = window.__G; return G.hero.flags.keladosRest && G.hero.quest === 46 && !G.cine; }, 120000);
    const s5 = await pg.evaluate(() => { const G = window.__G, z = G.zone, a = z.act7.halda, wh = z.L.spots.wheel; return { quest: G.hero.quest, text: window.__S7.questText(), sluice: !!z.interact.find((i) => i.kind === 'sluice7'), halda: +Math.hypot(a.x - wh.x, a.z - wh.z).toFixed(1), lake: z.tide?.mere?.h }; });
    beat('Kelados\'s rest: he kneels, the word, he leans back (d.kel.r1-r5); q.keladosRest, q46, the lake a step down, the great wheel offered, Halda by it', ok3 && (await ST.told(pg, ['d.kel.r1', 'd.kel.r2', 'd.kel.r3', 'd.kel.r4', 'd.kel.r5', 'q.keladosRest'])) && s5.sluice && s5.halda < 6 && s5.lake === 0.6, s5);
    return out(beats);
  } },
  // q46-q47: from Kelados at rest to the act's end. The great wheel (lakeLet first, the cine, q.46b, Halda gone), home
  // (home7 on arrival), the scene at the staff, the lantern (lanternWake), the seven fires, the sleep, the black, the
  // last line, act7 and its panel; then the after-act lines and the two readings
  ending7: { stage: 'D', until: 'E', q: Q(fx7('keladosRest', 'tarn'), '&nopacks'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    await ST.open(pg);
    await ST.until(pg, () => !!window.__G.zone.interact.find((i) => i.kind === 'sluice7') && window.__G.mode === 'play' && !window.__G.cine, 30000);
    const s0 = await pg.evaluate(() => ({ quest: window.__G.hero.quest, text: window.__S7.questText(), want: window.__D.t('q.46') }));
    await ST.use(pg, "z.interact.find((i) => i.kind === 'sluice7')");
    const ok0 = await ST.until(pg, () => { const G = window.__G; return G.hero.flags.lakeLet && !G.cine && !G.zone.letting; }, 120000);
    await ST.until(pg, () => !window.__G.zone.actors.includes(window.__G.zone.act7.halda), 60000);
    const s1 = await pg.evaluate(async () => { const G = window.__G, z = G.zone, W = await import('/src/game/world.js'); return { text: window.__S7.questText(), want: window.__D.t('q.46b'), halda: z.actors.includes(z.act7.halda), sluice: !!z.interact.find((i) => i.kind === 'sluice7'), lake: z.tide?.mere?.h, tarnMode: W.tarnMode(), rainbow: !!z.lake7?.rainbow, thread: !!z.lake7?.thread }; });
    beat('the great wheel: lakeLet saved, the lake let down (d.lake.1-2, Halda e1-e3), q.lakeLet, the quest «go home and sleep», Halda gone down, the lake to 0.3', s0.text === s0.want && ok0 && s1.text === s1.want && !s1.halda && !s1.sluice && s1.lake === 0.3 && s1.tarnMode === 'let' && (await ST.told(pg, ['d.lake.1', 'd.lake.2', 'q.lakeLet'])) && (await ST.spoke(pg, ['d.halda7.e1', 'd.halda7.e2', 'd.halda7.e3'])), { s0, s1 });
    await ST.travel(pg, 'town', 'waypoint');
    const h7 = await pg.evaluate(() => !!window.__G.hero.flags.home7);
    const ok1 = await ST.until(pg, () => window.__G.panel === 'act', 300000);
    const s2 = await pg.evaluate(() => { const G = window.__G, h = G.hero, F = h.flags; return { act7: h.act7, quest: h.quest, flag: !!F.act7, lantern: !!F.lanternWake, home7: !!F.home7, panel: document.querySelector('.act-h')?.textContent, done: window.__D.t('act7.done'), sub: !!document.querySelector('.pn')?.textContent.includes(window.__D.t('act7.sub')), text: window.__S7.questText(), q47: window.__D.t('q.47'), fires: [0, 7, 8, 9, 10, 11, 12].every((i) => !!G.zone.town.far[i]), bed: !!G.zone.town.bed7, card: window.__card7 }; });
    beat('home: home7 on arrival; the scene at the staff (Halda h1-h3, the child 4-7), the lantern woken (lanternWake, d.home7.3-4)', h7 && s2.home7 && s2.lantern && (await ST.spoke(pg, ['d.halda7.h1', 'd.child7.4', 'd.child7.5', 'd.home7.2', 'd.child7.6', 'd.halda7.h2', 'd.halda7.h3', 'd.home7.3', 'd.home7.4', 'd.child7.7'])) && (await ST.told(pg, ['d.home7.1'])), s2);
    beat('the seven smokes turn to fires, the sleep (d.sleep7.1-2), the black, and the last line «Ώστε ξύπνησες.»', s2.fires && s2.card && (await ST.told(pg, ['d.home7.5', 'd.sleep7.1', 'd.sleep7.2'])) && (await pg.evaluate(() => window.__dlg[window.__dlg.length - 1] === 'd.child7.wake')), { fires: s2.fires, card: s2.card, bed: s2.bed });
    beat('the act closed: act7, q47 and its line, the panel with act7.done and act7.sub, no fanfare', ok1 && s2.act7 >= 0 && s2.flag && s2.quest === 47 && s2.panel === s2.done && s2.sub && s2.text === s2.q47 && !(await pg.evaluate(() => window.__music7.includes('victory'))), { act7: s2.act7, quest: s2.quest, panel: s2.panel, music: await pg.evaluate(() => window.__music7) });
    await pg.click('[data-a="close"]').catch(() => {});
    await ST.until(pg, () => !window.__G.panel || window.__G.panel === 'boon', 10000);
    await pg.evaluate(() => { if (window.__G.panel) window.__D.closePanel?.(); });
    // after the act: Halda back at her forge (v8, then v9), the child, a villager
    const after = await pg.evaluate(() => { const G = window.__G, z = G.zone, w = z.townNpc.smith, N = z.L.spots.npcs.smith; return { halda: z.actors.includes(w.a), at: +Math.hypot(w.a.x - N.x, w.a.z - N.z).toFixed(1), news: window.__S7.npcHasNews('smith', w.a), anvil: !!z.interact.find((i) => i.kind === 'anvil7') }; });
    const say1 = async (kind, find) => { await pg.evaluate(({ kind, find }) => { const G = window.__G, z = G.zone; if (G.panel) window.__D.closePanel?.(); window.__dlg.length = 0; const a = new Function('z', 'return ' + find)(z); window.__D.emit('talk', kind, a); }, { kind, find }); await ST.until(pg, () => !document.querySelector('#dialog:not([hidden])'), 15000); await pg.evaluate(() => { if (window.__G.panel) window.__D.closePanel?.(); }); return pg.evaluate(() => window.__dlg.slice()); };
    const l1 = await say1('smith', 'z.townNpc.smith.a'), l2 = await say1('smith', 'z.townNpc.smith.a'), l3 = await say1('child', 'z.p5?.child?.a'), l4 = await say1('villager', "z.actors.find((a) => a.npc === 'villager' && a.bark % 4 === 0)"), l5 = await say1('healer', 'z.townNpc.healer.a');
    beat('after the act: Halda at her forge with news (v8, then v9), no anvil interact; the child, a villager, Elianthe', after.halda && after.at < 1 && after.news === true && !after.anvil && l1[0] === 'd.halda7.v8' && l2[0] === 'd.halda7.v9' && l3[0] === 'd.child.bark7' && l4[0] === 'd.v7.3' && l5[0] === 'd.elianthe7.v1', { after, l1, l2, l3, l4, l5 });
    const modes = await pg.evaluate(async () => { const W = await import('/src/game/world.js'); return { thaw: W.thawMode(), tarn: W.tarnMode(), race: W.raceLevel('thaw'), lake: W.raceLevel('tarn') }; });
    beat('both zones take their after-readings (green, let)', modes.thaw === 'green' && modes.tarn === 'let', modes);
    return out(beats);
  } },
  // every row of the contract's catch-up table: the state just after a flag's save (its quest change or its scene still
  // owed), a reload that wakes her there, the right quest and the scene again or skipped as the table says. ROWS=3,7 runs
  // only those rows (each still carries the flags of the rows before it)
  catch7: { stage: 'D', until: 'E', q: Q(FX7.fx7_new('town'), '&nopacks&nostory'), run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    const ev = (f, a) => pg.evaluate(f, a), only = process.env.ROWS ? process.env.ROWS.split(',').map(Number) : null;
    await ST.open(pg);
    const F7 = [], ALL7 = ['call7', 'haldaOut', 'thawSeen', 'weir1', 'weir2', 'weir3', 'weirs7', 'kallistoRest', 'tarnSeen', 'winch1', 'winch2', 'winch3', 'winchs7', 'keladosWake', 'keladosRest', 'lakeLet', 'home7', 'lanternWake', 'act7', 'mem_s1', 'mem_s2', 'mem_s3', 'mem_s4', 'mem_s5', 'mem_s6', 'haldaCamp7', 'haldaDen7', 'haldaHead7'];
    const row = async (n, zone, add, o, check) => {
      F7.push(...Object.entries(add));
      if (only && !only.includes(n)) return;
      const set = (save) => ev(async ({ fl, o, all, save }) => { const G = window.__G, h = G.hero, F = h.flags, keep = new Set(fl.map(([k]) => k)); for (const k of all) if (!keep.has(k)) delete F[k]; for (const [k, v] of fl) F[k] = v; for (const k of o.drop || []) delete F[k]; if (o.quest != null) h.quest = o.quest; h.act7 = -1; window.__immortal = true; if (!save) return; if (G.panel) window.__D.closePanel?.(); h.visit = { id: G.zone.id, x: G.player.x, z: G.player.z }; (await import('/src/game/save.js')).writeSave(); }, { fl: F7, o, all: ALL7, save });
      await set(false);
      if (await ev(() => window.__G.zone.id) !== zone) await ST.travel(pg, zone, 'waypoint');
      await set(true);
      await ST.reload(pg);
      let r; try { r = await check(); } catch (e) { r = { ok: false, what: 'error', x: e.message }; }
      beat(n + ' ' + zone + ': ' + r.what, r.ok, r.x);
    };
    const q = () => ev(() => ({ q: window.__G.hero.quest, zone: window.__G.zone.id, cine: !!window.__G.cine }));
    await row(1, 'town', {}, { quest: 39, drop: ['call7'] }, async () => { const ok = await ST.until(pg, () => window.__G.hero.flags.call7 && window.__G.hero.quest === 40 && !window.__G.cine, 240000); return { what: 'Act VI done, q39, no call7 → the hook (call7, q40)', ok: ok && (await ST.spoke(pg, ['d.child7.1'])), x: await q() }; });
    await row(2, 'town', { call7: true }, { quest: 39 }, async () => { await pg.waitForTimeout(2500); const x = await ev(() => { const G = window.__G, z = G.zone, w = z.townNpc.smith, st = z.L.spots.npcs.wayfarer; return { q: G.hero.quest, cine: !!G.cine, halda: +Math.hypot(w.a.x - st.x, w.a.z - st.z).toFixed(1), news: window.__S7.npcHasNews('smith', w.a), hook: window.__dlg.includes('d.child7.1') }; }); return { what: 'call7, q<40 → q40 quietly, Halda at the staff with news, no hook again', ok: x.q === 40 && !x.cine && x.halda < 3 && x.news === true && !x.hook, x }; });
    await row(3, 'town', { haldaOut: true }, { quest: 40 }, async () => { await pg.waitForTimeout(2500); const x = await ev(() => { const G = window.__G, z = G.zone; return { q: G.hero.quest, halda: z.actors.includes(z.townNpc.smith.a), anvil: !!z.interact.find((i) => i.kind === 'anvil7') }; }); return { what: 'haldaOut, q<41 → q41, Halda absent, her anvil an interact', ok: x.q === 41 && !x.halda && x.anvil, x }; });
    await row(4, 'thaw', {}, { quest: 41 }, async () => { const ok = await ST.until(pg, () => window.__G.hero.flags.thawSeen && !window.__G.cine, 120000); return { what: 'no thawSeen → the arrival cine (thawSeen)', ok: ok && (await ST.told(pg, ['d.thaw.1', 'd.thaw.2'])), x: await q() }; });
    await row(5, 'thaw', { thawSeen: true, weir2: true }, { quest: 41 }, async () => { const ok = await ST.until(pg, () => window.__G.hero.flags.mem_s1 && !window.__G.cine, 120000); const x = await ev(() => ({ arrival: window.__toasts.includes(window.__D.t('d.thaw.1')), mh: window.__G.zone.tide?.mh })); return { what: 'a weir turned, its memory unseen → Memory 1 on entry (no arrival again), the Race at 0.9', ok: ok && !x.arrival && (await ST.spoke(pg, ['d.mason.m1.1', 'd.mason.m1.4'])) && Math.abs(x.mh - 0.9) < 0.01, x }; });
    await row(6, 'thaw', { weir1: true, weir3: true, mem_s1: true, mem_s2: true, mem_s3: true }, { quest: 41 }, async () => { await pg.waitForTimeout(3000); const x = await ev(() => { const G = window.__G, z = G.zone, a = z.act7.halda, r = z.L.spots.haldaRim; return { q: G.hero.quest, cine: !!G.cine, rim: +Math.hypot(a.x - r.x, a.z - r.z).toFixed(1), dlg: window.__dlg.length }; }); return { what: 'three weirs, q<42 → q42 quietly, Halda before the Den, no memory again', ok: x.q === 42 && !x.cine && x.rim < 3.5 && x.dlg === 0, x }; });
    await row(7, 'thaw', { kallistoRest: true }, { quest: 42 }, async () => { await pg.waitForTimeout(3000); const x = await ev(() => { const G = window.__G, e = G.zone.interact.find((i) => i.kind === 'exit' && i.to === 'tarn'); return { q: G.hero.quest, cine: !!G.cine, open: !!G.hero.flags[e?.locked], dlg: window.__dlg.length }; }); return { what: 'kallistoRest, q<43 → q43 quietly, the Water-stair open, no scene again', ok: x.q === 43 && !x.cine && x.open && x.dlg === 0, x }; });
    await row(8, 'tarn', {}, { quest: 43 }, async () => { const ok = await ST.until(pg, () => window.__G.hero.flags.tarnSeen && window.__G.hero.quest === 44 && !window.__G.cine, 120000); const x = await ev(async () => ({ thawHalda: (await import('/src/game/world.js')).haldaSpot7({ id: 'thaw', L: { spots: { npcs: { halda: { x: 1, z: 1 } } } }, map: { nearestFloor: (x, z) => ({ x, z }) } }) })); return { what: 'no tarnSeen → the arrival cine (tarnSeen, q44); Halda gone from the Meltwaters', ok: ok && (await ST.told(pg, ['d.tarn.1', 'd.tarn.2'])) && x.thawHalda === null, x }; });
    await row(9, 'tarn', { tarnSeen: true }, { quest: 43 }, async () => { await pg.waitForTimeout(3000); const x = await ev(() => ({ q: window.__G.hero.quest, cine: !!window.__G.cine, arrival: window.__toasts.includes(window.__D.t('d.tarn.1')) })); return { what: 'tarnSeen, q<44 → q44 quietly, no arrival again', ok: x.q === 44 && !x.cine && !x.arrival, x }; });
    await row(10, 'tarn', { winch1: true, winch2: true, winch3: true, mem_s4: true, mem_s5: true, mem_s6: true }, { quest: 44 }, async () => { const ok = await ST.until(pg, () => window.__G.hero.flags.keladosWake && window.__G.hero.quest === 45 && !window.__G.cine, 120000); return { what: 'all winches, no keladosWake → the wake cine (keladosWake, q45)', ok: ok && (await ST.told(pg, ['d.kel.w1', 'd.kel.w2'])), x: await q() }; });
    await row(11, 'tarn', { keladosWake: true }, { quest: 44 }, async () => { await pg.waitForTimeout(3000); const x = await ev(() => { const G = window.__G, z = G.zone, a = z.act7.halda, r = z.L.spots.haldaRim; return { q: G.hero.quest, cine: !!G.cine, wake: window.__toasts.includes(window.__D.t('d.kel.w1')), rim: +Math.hypot(a.x - r.x, a.z - r.z).toFixed(1) }; }); return { what: 'keladosWake, q<45 → q45 quietly, Halda at the rim, no wake again', ok: x.q === 45 && !x.cine && !x.wake && x.rim < 3.5, x }; });
    await row(12, 'tarn', { keladosRest: true }, { quest: 45 }, async () => { await pg.waitForTimeout(3000); const x = await ev(() => { const G = window.__G, z = G.zone; return { q: G.hero.quest, cine: !!G.cine, sluice: !!z.interact.find((i) => i.kind === 'sluice7'), lake: z.tide?.mere?.h ?? z.tide?.mh, text: window.__S7.questText(), want: window.__D.t('q.46') }; }); return { what: 'keladosRest, q<46 → q46 quietly, the lake at 0.6, the great wheel offered', ok: x.q === 46 && !x.cine && x.sluice && Math.abs(x.lake - 0.6) < 0.01 && x.text === x.want, x }; });
    await row(13, 'town', { lakeLet: true }, { quest: 46 }, async () => { const ok = await ST.until(pg, () => window.__G.hero.flags.home7 && window.__dlg.includes('d.child7.5'), 120000); const x = await ev(() => ({ q: window.__G.hero.quest, home7: !!window.__G.hero.flags.home7, text: window.__S7.questText(), want: window.__D.t('q.46b'), act7: window.__G.hero.act7 })); return { what: 'lakeLet, no home7 → home7 saved on arrival, the home scene begins', ok: ok && x.home7 && x.text === x.want && x.act7 < 0, x }; });
    await row(14, 'town', { home7: true }, { quest: 46 }, async () => { const ok = await ST.until(pg, () => window.__G.panel === 'act', 300000); const x = await ev(() => ({ q: window.__G.hero.quest, act7: window.__G.hero.act7, flag: !!window.__G.hero.flags.act7, lantern: !!window.__G.hero.flags.lanternWake, last: window.__dlg[window.__dlg.length - 1] })); return { what: 'home7, act7 not closed (she quit in the scene) → the home scene again to its last line, act7, q47', ok: ok && x.q === 47 && x.act7 >= 0 && x.flag && x.lantern && x.last === 'd.child7.wake', x }; });
    return out(beats);
  } }
});
