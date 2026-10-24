// Loop subdivision for a closed (welded) triangle mesh, with creases: an edge whose two faces meet at more than
// `crease` degrees keeps its line (its new vertex is the midpoint; a vertex on exactly two crease edges moves only along
// them; a vertex on more stays put). Per-vertex attributes (any number of floats each) are carried linearly.
// pos: flat [x,y,z,...], idx: flat triangles, attrs: { name: { size, data } } -> { pos, idx, attrs }
export function loopSubdivide(pos, idx, attrs = {}, o = {}) {
  const crease = Math.cos(((o.crease ?? 180) * Math.PI) / 180);
  const nv = pos.length / 3, nf = idx.length / 3;
  const P = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  // face normals
  const fn = new Float64Array(nf * 3);
  for (let f = 0; f < nf; f++) {
    const a = P(idx[f * 3]), b = P(idx[f * 3 + 1]), c = P(idx[f * 3 + 2]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n) || 1;
    fn[f * 3] = n[0] / l; fn[f * 3 + 1] = n[1] / l; fn[f * 3 + 2] = n[2] / l;
  }
  // edges: key -> { a, b, faces: [f...], opp: [v...] }
  const E = new Map(), key = (a, b) => (a < b ? a * nv + b : b * nv + a);
  for (let f = 0; f < nf; f++) for (let k = 0; k < 3; k++) {
    const a = idx[f * 3 + k], b = idx[f * 3 + ((k + 1) % 3)], c = idx[f * 3 + ((k + 2) % 3)], kk = key(a, b);
    let e = E.get(kk); if (!e) { e = { a: Math.min(a, b), b: Math.max(a, b), faces: [], opp: [] }; E.set(kk, e); }
    e.faces.push(f); e.opp.push(c);
  }
  const nbr = Array.from({ length: nv }, () => new Set()), creaseN = Array.from({ length: nv }, () => []);
  for (const e of E.values()) {
    nbr[e.a].add(e.b); nbr[e.b].add(e.a);
    e.sharp = e.faces.length !== 2 || fn[e.faces[0] * 3] * fn[e.faces[1] * 3] + fn[e.faces[0] * 3 + 1] * fn[e.faces[1] * 3 + 1] + fn[e.faces[0] * 3 + 2] * fn[e.faces[1] * 3 + 2] < crease;
    if (e.sharp) { creaseN[e.a].push(e.b); creaseN[e.b].push(e.a); }
  }
  const out = [], names = Object.keys(attrs), outA = Object.fromEntries(names.map((n) => [n, []]));
  // old vertices
  for (let i = 0; i < nv; i++) {
    const p = P(i), ns = [...nbr[i]], cn = creaseN[i];
    let q;
    if (cn.length === 2) { const a = P(cn[0]), b = P(cn[1]); q = p.map((x, k) => 0.75 * x + 0.125 * (a[k] + b[k])); }
    else if (cn.length > 2) q = p;
    else {
      const n = ns.length, beta = n === 3 ? 3 / 16 : 3 / (8 * n), s = [0, 0, 0];
      for (const j of ns) { const r = P(j); s[0] += r[0]; s[1] += r[1]; s[2] += r[2]; }
      q = p.map((x, k) => (1 - n * beta) * x + beta * s[k]);
    }
    out.push(...q);
    for (const nm of names) { const { size, data } = attrs[nm]; for (let k = 0; k < size; k++) outA[nm].push(data[i * size + k]); }
  }
  // edge vertices
  let next = nv;
  for (const e of E.values()) {
    const a = P(e.a), b = P(e.b);
    const q = e.sharp ? a.map((x, k) => 0.5 * (x + b[k])) : a.map((x, k) => 0.375 * (x + b[k]) + 0.125 * (P(e.opp[0])[k] + P(e.opp[1])[k]));
    out.push(...q); e.v = next++;
    for (const nm of names) { const { size, data } = attrs[nm]; for (let k = 0; k < size; k++) outA[nm].push(0.5 * (data[e.a * size + k] + data[e.b * size + k])); }
  }
  const oi = [];
  for (let f = 0; f < nf; f++) {
    const a = idx[f * 3], b = idx[f * 3 + 1], c = idx[f * 3 + 2];
    const ab = E.get(key(a, b)).v, bc = E.get(key(b, c)).v, ca = E.get(key(c, a)).v;
    oi.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  return { pos: out, idx: oi, attrs: Object.fromEntries(names.map((n) => [n, { size: attrs[n].size, data: outA[n] }])) };
}
