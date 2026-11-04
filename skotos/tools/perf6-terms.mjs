// perf6's terms (tools/scenario.mjs, perf6; docs/act6-contract.md, Stages and gates G1, G2): the per-cycle visit records
// the scenario's page returns, reduced to the gate's numbers. A module of its own so that node can test the estimators
// without a browser (tools/test-perf6-terms.mjs).
//   S       { ashfield: [Field visit per cycle], <spot>: [spot visit per cycle] }, cycle i of every place drawn in one pass
//   zones   ['ashfield', ...spots]; Q the quality; T3 term 3 in full (quality 1); SOLO the bodies-alone rounds too
// A Field visit: { ms, draw, logic, calls, tris, ..., crowd: { <spot>(+): { ms, draw, logic, calls, actors, rounds } } }; a
// spot visit: { ms, draw, logic, rounds, rounds3, calls, tris, wet, actors, pools, lights, at, pr }. A round is
// [shown, hidden] (with SOLO [shown, hidden, shown alone, hidden alone]), each one time(): the best of K frames.

// (the upper median, as every perf scenario takes it)
export const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];

// term 2's two frames for one cycle, one estimator on both sides: the best of the crowd-hidden frames of term 3's rounds,
// the spot's (its rounds3 when its crowd is padded) and the Field's with the same crowd (z+ when padded), as many rounds
// a side, so that each is the best of the same number of draws (a minimum over more draws reads lower: the spot's best
// of 12 against the Field's best of 3 read 4-11% easy, the review of 2 November). Both drawn the same way: the crowd
// standing, hidden, its frames back to back with its shown ones. With no rounds on the Field for the spot (CREW=0, an
// empty crowd), one frame a side: the spot's first round's and the bare Field's own (each one time()). m: the spot's
// visit, f: the Field's in the same cycle. Returns { spot, field, n } (n: frames a side, each the best of K draws)
export function worldFrames(m, f, z) {
  const hid = (r) => (r || []).map((q) => q[1]), k = f.crowd?.[z + '+'] ? z + '+' : z;
  let a = hid(k === z ? m.rounds : m.rounds3), b = hid(f.crowd?.[k]?.rounds);
  if (!a.length || !b.length) { a = hid(m.rounds).slice(0, 1); b = [f.draw]; }
  const n = Math.min(a.length, b.length);
  return n ? { spot: Math.min(...a.slice(0, n)), field: Math.min(...b.slice(0, n)), n } : null;
}

export function perf6Out(S, zones, spots, Q, { T3 = +Q >= 1, SOLO = false } = {}) {
  const out = {};
  for (const z of zones) {
    const ms = med(S[z].map((m) => m.ms)), last = S[z][S[z].length - 1];
    out[z + '@q' + Q] = { ms, draw: med(S[z].map((m) => m.draw)), logic: med(S[z].map((m) => m.logic)), calls: last.calls, tris: last.tris, wet: last.wet, actors: last.actors, pools: last.pools, lights: last.lights, at: last.at, pr: last.pr, wouldScale: ms > 21 ? 'down (to 0.55 at worst)' : ms < 14.5 ? 'up' : 'hold' };
  }
  for (const z of spots) {
    const o = out[z + '@q' + Q], F = S.ashfield;
    if (F[0].crowd[z]) { o.field = med(F.map((m) => m.crowd[z].ms)); o.ratios = S[z].map((m, i) => +(m.ms / F[i].crowd[z].ms).toFixed(3)); }
    else { o.field = med(F.map((m) => m.ms)); o.ratios = S[z].map((m, i) => +(m.ms / F[i].ms).toFixed(3)); }
    o.vsField = med(o.ratios);
    // (2) the spot's world alone against the bare Field, draws only, each side the best of as many frames (worldFrames);
    // 'bare' and 'fieldBare' each side's median frame, 'worldOf' the frames a side
    const W = S[z].map((m, i) => worldFrames(m, F[i], z));
    if (W.every(Boolean)) {
      o.bare = med(W.map((w) => w.spot)); o.fieldBare = med(W.map((w) => w.field)); o.worldOf = Math.min(...W.map((w) => w.n));
      o.world = med(W.map((w) => +(w.spot / w.field).toFixed(3)));
    } else o.world = null;
    o.vsBare = med(S[z].map((m, i) => +(m.ms / F[i].ms).toFixed(3)));
    // (3) the crowd's own cost, draws only: at the spot its draw less its world's, on the Field the Field with it less
    // the bare Field, each the median of its rounds (the two frames of a round drawn back to back); the term the median
    // of the per-cycle ratios. A crowd under PAD / 2 bodies is measured padded with itself (crowd3). Beside it, with SOLO: 'bodies',
    // the same with all but the actors hidden (one draw wherever it stands: 1.00 but for the machine, so its spread is
    // the measurement's own), and 'inWorld', each place's crowd cost over its bodies' cost in the same round (the
    // machine's speed taken out: what the world adds to or takes from the same bodies, the spot's against the Field's)
    const k3 = F[0].crowd[z + '+'] ? z + '+' : z;
    if (F[0].crowd[k3]) {
      const sr = (m) => (k3 === z ? m.rounds : m.rounds3), dW = (r) => med(r.map((q) => q[0] - q[1])), dA = (r) => med(r.map((q) => q[2] - q[3])), qW = (r) => med(r.map((q) => (q[0] - q[1]) / (q[2] - q[3])));
      const cr = S[z].map((m, i) => [dW(sr(m)), dW(F[i].crowd[k3].rounds)]);
      o.crowd = { n: F[0].crowd[k3].actors, padded: k3 !== z, spot: +med(cr.map((c) => c[0])).toFixed(1), field: +med(cr.map((c) => c[1])).toFixed(1), ratios: cr.map((c) => +(c[0] / c[1]).toFixed(3)) };
      o.crowd.term = med(o.crowd.ratios);
      // (every round of every cycle pooled: the ratio of the two medians and its 98% interval, resampled on a fixed
      // seed; 'dearer' when the whole interval is over 1.00, i.e. dearer than a frame's own swing explains: 1% a spot by
      // chance, about 5% for one of five)
      const pool = (f) => { const x = S[z].flatMap((m) => sr(m).map(f)), y = F.flatMap((m) => m.crowd[k3].rounds.map(f)), r = []; let h = 7;
        const rnd = () => { h = (Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) + 0x9e3779b9) | 0; return ((h ^ (h >>> 13)) >>> 0) / 4294967296; }, pick = (v) => med(v.map(() => v[Math.floor(rnd() * v.length)]));
        for (let i = 0; i < 1000; i++) r.push(pick(x) / pick(y));
        r.sort((u, v) => u - v); return [+(med(x) / med(y)).toFixed(3), +r[10].toFixed(3), +r[989].toFixed(3)]; };
      if (T3) { o.crowd.pooled = pool((q) => q[0] - q[1]); o.crowd.dearer = o.crowd.pooled[1] > 1; }
      if (T3 && SOLO) {
        o.crowd.bodiesR = S[z].map((m, i) => +(dA(sr(m)) / dA(F[i].crowd[k3].rounds)).toFixed(3)); o.crowd.bodies = med(o.crowd.bodiesR);
        o.crowd.inWorldR = S[z].map((m, i) => +(qW(sr(m)) / qW(F[i].crowd[k3].rounds)).toFixed(3)); o.crowd.inWorld = med(o.crowd.inWorldR);
        o.crowd.bodiesPooled = pool((q) => q[2] - q[3]);
      }
    }
    // (the lead's bar: vsField and world within x 1.00 at quality 1; the crowd term reported)
    o.pass = o.vsField <= 1.0 && o.world != null && o.world <= 1.0;
  }
  return out;
}
