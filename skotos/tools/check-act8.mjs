// Act VIII's layouts over many seeds (docs/act8-design.md): node tools/check-act8.mjs [n=300]
// Hard faults: a spot she cannot reach from the start; a field that is not closed (a way from inside a field to the
// road or to open ground that does not pass a gate: the fire's rule 1); fewer than 8 fields or 3 hearths; a pack in the camp.
import { genTinder } from '../src/world/gen8.js';
const n = +(process.argv[2] || 300); let bad = 0; const why = {};
const fail = (seed, r) => { bad++; why[r] = (why[r] || 0) + 1; if (bad <= 8) console.log('seed', seed, r); };
for (let seed = 1; seed <= n; seed++) {
  const L = genTinder(seed * 7717 + 3), { w, h } = L, S = L.spots, I = (x, z) => Math.floor(z) * w + Math.floor(x);
  const flood = (from, stop) => { const seen = new Uint8Array(w * h), q = [from]; seen[from] = 1; for (let k = 0; k < q.length; k++) { const i = q[k], x = i % w, z = (i - x) / w; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const m = (z + dz) * w + x + dx; if (L.cells[m] && !seen[m] && !(stop && stop(x + dx, z + dz))) { seen[m] = 1; q.push(m); } } } return seen; };
  const all = flood(I(L.start.x, L.start.z));
  for (const p of [...L.exits, S.arena, S.waypoint, ...S.chests, ...L.packs, ...S.hearths.map((q) => ({ x: q.x + 1.5, z: q.z }))]) if (!all[I(p.x, p.z)]) { fail(seed, 'unreached'); break; }
  if (L.fields.length < 8) fail(seed, 'fields'); if (S.hearths.length < 3) fail(seed, 'hearths');
  if (L.packs.some((p) => Math.hypot(p.x - S.camp.x, p.z - S.camp.z) < 14)) fail(seed, 'packInCamp');
  // the fire's rule 1: every lane lies wholly inside its own field, on open ground, clear of the hearths and the camp
  for (const fl of L.flues) {
    if (fl.boss) { const mx = fl.x + Math.sin(fl.dir) * fl.len / 2, mz = fl.z + Math.cos(fl.dir) * fl.len / 2; if (Math.hypot(mx - S.arena.x, mz - S.arena.z) > 10 || fl.len > 2 * S.arena.r) { fail(seed, 'floorLane'); break; } continue; }
    const f = L.fields.find((q) => q.id === fl.field), x0 = fl.x - fl.w / 2, x1 = fl.x + fl.w / 2, z0 = fl.z - fl.len, z1 = fl.z;
    if (fl.kind !== 'burn' || !f || x0 < f.x0 || x1 > f.x1 + 1 || z0 < f.z0 - 0.5 || z1 > f.z1 + 1) { fail(seed, 'laneOutside'); break; }
    if (S.hearths.some((q) => q.x > x0 - 3 && q.x < x1 + 3 && q.z > z0 && q.z < z1)) { fail(seed, 'laneAtHearth'); break; }
    let blocked = 0; for (let z = Math.ceil(z0); z < z1; z++) for (let x = Math.floor(x0); x < x1; x++) if (!L.cells[z * w + x]) blocked++;
    if (blocked) { fail(seed, 'laneBlocked'); break; }
  }
  if (L.flues.length < 6) fail(seed, 'fewLanes');
  for (const f of L.fields) {
    // with the field's gates shut (its road gate and the passes on its north and south walls), nothing leaves it
    const gates = [f.gate, f.pass, L.fields.find((q) => q.row === f.row - 1 && q.side === f.side)?.pass].filter(Boolean);
    const shut = (x, z) => gates.some((g) => Math.abs(x - g.x) <= 2 && Math.abs(z - g.z) <= 2);
    const c = I((f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2); if (!L.cells[c]) continue;
    const seen = flood(c, shut);
    if (seen[I(L.start.x, L.start.z)] || seen[I(S.arena.x, S.arena.z)]) { fail(seed, 'fieldOpen ' + f.id); break; }
  }
}
console.log(n + ' layouts, ' + bad + ' hard faults', JSON.stringify(why));
process.exit(bad ? 1 : 0);
