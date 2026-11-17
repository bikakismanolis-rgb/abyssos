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
  race: { stage: 'B', until: 'E', q: Q(fx7('thawSeen', 'thaw')), run: async (pg) => {
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
  // a Shadow Gate's layout is the shipped generator's for the same seed (no older layout changes with the act)
  gate7: { stage: 'A', until: 'E', q: Q(FX7.fx7_done('town')), run: async (pg) => {
    const h = await pg.evaluate(async () => { const g1 = await import('/src/world/gen.js'); const sum = (L) => { let a = 0; for (let i = 0; i < L.cells.length; i++) a = (a * 31 + L.cells[i] + i) >>> 0; return [L.w, L.h, a, L.packs.length, L.props.length].join(':'); }; return { crypt: sum(g1.genCrypt(4242, { rooms: 12, mh: 30 })), forest: sum(g1.genForest(4242, { h: 120 })) }; });
    // (the sums as v22.1 built them: main at c5833a1)
    const want = { crypt: process.env.GATE7_CRYPT, forest: process.env.GATE7_FOREST };
    return { pass: !want.crypt || (h.crypt === want.crypt && h.forest === want.forest), sums: h, note: want.crypt ? 'compared' : 'recorded: set GATE7_CRYPT and GATE7_FOREST to compare' };
  } }
});
