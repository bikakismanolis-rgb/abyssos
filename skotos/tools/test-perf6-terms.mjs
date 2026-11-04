// node tools/test-perf6-terms.mjs: perf6's terms (tools/perf6-terms.mjs) over visit records drawn by a machine of known
// costs, in the shapes the scenario's page returns (tools/scenario.mjs, perf6): each time() the best of K draws, each draw
// its cost times a right-skewed swing (a draw is never faster than its work, sometimes much slower, as SwiftShader's are).
// Term 2 ('world', the spot's world with its crowd hidden against the bare Field): a spot whose world costs what the
// Field's does reads 1.00 at every spot, padded or not, and the five are measured alike, each side the best of as many
// frames (the review of 2 November: the spot's best of 12 against the Field's best of 3 read 4-11% easy).
import { perf6Out, med } from './perf6-terms.mjs';

let pass = 0, fail = 0;
const ok = (c, what, extra) => { if (c) pass++; else { fail++; console.log('FAIL', what, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } };

const SPOTS = ['hollows', 'mere', 'wood', 'village', 'hearth'], ZONES = ['ashfield', ...SPOTS];
// (the crowds as perf6 stands them: the Mere's 5 and the Hearth's 3 padded to 24 at quality 1)
const N = { hollows: 25, mere: 5, wood: 20, village: 14, hearth: 3 }, BODY = 40;
// a seeded machine: draw(cost) = cost * (1 + swing * E), E exponential; time() = the best of K draws (perf6's time())
const machine = (seed, swing) => {
  let h = seed >>> 0;
  const u = () => { h = (Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) + 0x9e3779b9) | 0; return (((h ^ (h >>> 13)) >>> 0) + 0.5) / 4294967296; };
  return (cost, K = 3) => { let b = Infinity; for (let i = 0; i < K; i++) b = Math.min(b, cost * (1 + swing * -Math.log(u()))); return +b.toFixed(1); };
};
// one perf6 run's records: CYC cycles of the Field and the five spots, each visit as the page builds it
// (o.world: the spots' world costs; o.field: the Field's; o.crew false: CREW=0, no crowds, no rounds on the Field)
function records({ seed = 1, swing = 0.3, Q = 1, CYC = 5, CR = 4, PAD = 24, world = {}, field = 800, crew = true } = {}) {
  const time = machine(seed, swing), T3 = Q >= 1, cr = T3 ? CR : 1, pad = T3 ? PAD : 0, S = {};
  const n = (z) => (crew ? N[z] : 0), padded = (z) => crew && n(z) && n(z) < pad / 2;
  // (the crowds the Field carries: each spot's, and a padded spot's padded crowd as z+)
  const keys = crew ? SPOTS.flatMap((z) => (padded(z) ? [z, z + '+'] : [z])) : [];
  const bodies = (k) => (k.endsWith('+') ? pad : n(k));
  for (let c = 0; c < CYC; c++) {
    const F = { draw: time(field), logic: 2, calls: 139, tris: 598233, wet: 0, actors: 0, pools: 0, lights: 3, at: [61.1, 161], pr: 1.5, crowd: {} };
    F.ms = +(F.draw + F.logic).toFixed(1);
    for (const k of keys) {
      const on = field + bodies(k) * BODY, d = time(on), rounds = [];
      // (a crowd also measured padded draws no rounds of its own: its frame is vsField's)
      const nr = keys.includes(k + '+') ? 0 : cr;
      for (let i = 0; i < nr; i++) rounds.push([time(on), time(field)]);
      F.crowd[k] = { ms: +(d + 2).toFixed(1), draw: d, logic: 2, calls: 300, actors: bodies(k), rounds };
    }
    (S.ashfield ||= []).push(F);
    for (const z of SPOTS) {
      const w = world[z] ?? field, on = w + n(z) * BODY, m = { draw: time(on), logic: 3, calls: 250, tris: 400000, wet: 0.4, actors: n(z), pools: 6, lights: 4, at: [50.5, 100.5], pr: 1.5 };
      m.ms = +(m.draw + m.logic).toFixed(1);
      // (one round of a crowd padded for term 3; else CR: [shown, hidden])
      const r = []; for (let i = 0; i < (padded(z) ? 1 : cr); i++) r.push([time(on), time(w)]);
      m.rounds = r;
      // (the page's 'bare' until the review's fix: the best of its rounds' hidden frames; term 2 no longer reads it)
      m.bare = Math.min(...r.map((q) => q[1]));
      m.rounds3 = null;
      if (padded(z)) { const on3 = w + pad * BODY; m.rounds3 = []; for (let i = 0; i < cr; i++) m.rounds3.push([time(on3), time(w)]); }
      (S[z] ||= []).push(m);
    }
  }
  return S;
}
const terms = (o) => { const S = records(o), Q = o.Q ?? 1; return perf6Out(S, ZONES, SPOTS, Q, { T3: Q >= 1 }); };

// ---- a machine without swing: every estimator reads the true ratio ----
{
  const o = terms({ swing: 0 });
  ok(SPOTS.every((z) => o[z + '@q1'].world === 1), 'no swing, the same world: 1.000 at every spot', SPOTS.map((z) => o[z + '@q1'].world));
  const d = terms({ swing: 0, world: { hollows: 720, mere: 880, wood: 600, village: 800, hearth: 400 } });
  ok(d['hollows@q1'].world === 0.9 && d['mere@q1'].world === 1.1 && d['wood@q1'].world === 0.75 && d['village@q1'].world === 1 && d['hearth@q1'].world === 0.5, 'no swing: each spot its own world over the Field', SPOTS.map((z) => d[z + '@q1'].world));
  ok(!d['mere@q1'].pass && d['hollows@q1'].pass, 'a world 10% dearer than the Field fails the bar; one 10% cheaper passes');
}

// ---- term 2 under a frame's own swing: as dear as the Field reads 1.00, at all five alike ----
for (const Q of [1, 0]) {
  const RUNS = 300, W = Object.fromEntries(SPOTS.map((z) => [z, []]));
  for (let s = 1; s <= RUNS; s++) { const o = terms({ seed: s * 7919, Q }); for (const z of SPOTS) W[z].push(o[z + '@q' + Q].world); }
  const mean = Object.fromEntries(SPOTS.map((z) => [z, +(W[z].reduce((a, b) => a + b, 0) / RUNS).toFixed(4)]));
  for (const z of SPOTS) ok(Math.abs(mean[z] - 1) <= 0.01, `q${Q} ${z}: a world as dear as the Field's reads 1.00 (mean of ${RUNS} runs' medians within 1%)`, mean);
  const v = Object.values(mean);
  ok(Math.max(...v) - Math.min(...v) <= 0.01, `q${Q}: the five spots, padded or not, measured alike (their means within 1% of each other)`, mean);
}

// ---- as many frames on each side, the same at every spot, padded or not ----
{
  const o1 = terms({ seed: 3 }), o0 = terms({ seed: 3, Q: 0 });
  ok(SPOTS.every((z) => o1[z + '@q1'].worldOf === 4), 'q1: term 2 the best of 4 rounds a side at every spot (CR 4), the padded Mere and Hearth too', SPOTS.map((z) => o1[z + '@q1'].worldOf));
  ok(SPOTS.every((z) => o0[z + '@q0'].worldOf === 1), 'q0 (one round): term 2 one frame a side at every spot', SPOTS.map((z) => o0[z + '@q0'].worldOf));
  const o6 = terms({ seed: 3, CR: 6 });
  ok(SPOTS.every((z) => o6[z + '@q1'].worldOf === 6), 'CR 6: the best of 6 a side', SPOTS.map((z) => o6[z + '@q1'].worldOf));
}

// ---- each side's frames are its own: the spot's from its rounds (rounds3 when padded), the Field's from the same crowd's ----
{
  const S = records({ seed: 11 }), o = perf6Out(S, ZONES, SPOTS, 1), F = S.ashfield;
  const want = (z, k, sr) => med(S[z].map((m, i) => +(Math.min(...sr(m).map((q) => q[1])) / Math.min(...F[i].crowd[k].rounds.map((q) => q[1]))).toFixed(3)));
  ok(o['hollows@q1'].world === want('hollows', 'hollows', (m) => m.rounds), 'the Hollows: its rounds against the Field with its crowd', [o['hollows@q1'].world, want('hollows', 'hollows', (m) => m.rounds)]);
  ok(o['mere@q1'].world === want('mere', 'mere+', (m) => m.rounds3), 'the Mere (padded): its padded rounds against the Field with the padded crowd', [o['mere@q1'].world, want('mere', 'mere+', (m) => m.rounds3)]);
  ok(o['hearth@q1'].bare === med(S.hearth.map((m) => Math.min(...m.rounds3.map((q) => q[1])))) && o['hearth@q1'].fieldBare === med(F.map((f) => Math.min(...f.crowd['hearth+'].rounds.map((q) => q[1])))), "the Hearth's reported bare and fieldBare: each side's median frame");
}

// ---- CREW=0 (no crowd anywhere, no rounds on the Field): one frame a side, the spot's first round and the bare Field ----
{
  const S = records({ seed: 5, crew: false }), o = perf6Out(S, ZONES, SPOTS, 1), F = S.ashfield;
  ok(SPOTS.every((z) => o[z + '@q1'].worldOf === 1 && o[z + '@q1'].world === med(S[z].map((m, i) => +(m.rounds[0][1] / F[i].draw).toFixed(3)))), 'CREW=0: the spot\'s first round against the bare Field, one frame each', SPOTS.map((z) => o[z + '@q1'].world));
  ok(SPOTS.every((z) => !o[z + '@q1'].crowd), 'CREW=0: no crowd term');
}

console.log(`test-perf6-terms: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
