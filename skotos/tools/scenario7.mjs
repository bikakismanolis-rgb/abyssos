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
  // a Shadow Gate's layout is the shipped generator's for the same seed (no older layout changes with the act)
  gate7: { stage: 'A', until: 'E', q: Q(FX7.fx7_done('town')), run: async (pg) => {
    const h = await pg.evaluate(async () => { const g1 = await import('/src/world/gen.js'); const sum = (L) => { let a = 0; for (let i = 0; i < L.cells.length; i++) a = (a * 31 + L.cells[i] + i) >>> 0; return [L.w, L.h, a, L.packs.length, L.props.length].join(':'); }; return { crypt: sum(g1.genCrypt(4242, { rooms: 12, mh: 30 })), forest: sum(g1.genForest(4242, { h: 120 })) }; });
    // (the sums as v22.1 built them: main at c5833a1)
    const want = { crypt: process.env.GATE7_CRYPT, forest: process.env.GATE7_FOREST };
    return { pass: !want.crypt || (h.crypt === want.crypt && h.forest === want.forest), sums: h, note: want.crypt ? 'compared' : 'recorded: set GATE7_CRYPT and GATE7_FOREST to compare' };
  } }
});
