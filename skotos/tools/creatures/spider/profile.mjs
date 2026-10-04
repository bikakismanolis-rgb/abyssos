import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(S + '/research/opengameart/glb/giant-spider.glb');
const r = doc.getRoot();
const leg = r.listMeshes().find(m => m.getName() === 'Spider-leg250.006').listPrimitives()[0];
const body = r.listMeshes().find(m => m.getName() === 'Spider-body1000').listPrimitives()[0];
function pts(p) { const P = p.getAttribute('POSITION'); const o = []; for (let i = 0; i < P.getCount(); i++) o.push(P.getElement(i, [])); return o; }
const L = pts(leg), B = pts(body);
// leg: horizontal principal axis
let cx = 0, cz = 0; for (const v of L) { cx += v[0]; cz += v[2]; } cx /= L.length; cz /= L.length;
let sxx = 0, sxz = 0, szz = 0; for (const v of L) { const a = v[0] - cx, b = v[2] - cz; sxx += a * a; sxz += a * b; szz += b * b; }
const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz); const dx = Math.cos(ang), dz = Math.sin(ang);
console.log('leg centroid', cx.toFixed(3), cz.toFixed(3), 'axis', dx.toFixed(3), dz.toFixed(3), 'yaw deg', (ang * 180 / Math.PI).toFixed(1));
// profile: s = along axis, y; and lateral t
const prof = L.map(v => [(v[0]) * dx + (v[2]) * dz, v[1], -(v[0]) * dz + (v[2]) * dx]);
let smin = Math.min(...prof.map(p => p[0])), smax = Math.max(...prof.map(p => p[0]));
console.log('s range', smin.toFixed(3), smax.toFixed(3), 't range', Math.min(...prof.map(p => p[2])).toFixed(3), Math.max(...prof.map(p => p[2])).toFixed(3));
// centerline: bin along y? leg goes up then down; bin by s
const nb = 40; const bins = Array.from({ length: nb }, () => []);
for (const p of prof) { const k = Math.min(nb - 1, Math.floor((p[0] - smin) / (smax - smin) * nb)); bins[k].push(p); }
for (let k = 0; k < nb; k++) { const b = bins[k]; if (!b.length) continue; const ys = b.map(p => p[1]); console.log(k, (smin + (k + 0.5) * (smax - smin) / nb).toFixed(2), 'n', b.length, 'y', Math.min(...ys).toFixed(2), Math.max(...ys).toFixed(2), 't', (b.reduce((a, p) => a + p[2], 0) / b.length).toFixed(2)); }
// svg
const sc = 200;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="700"><rect width="800" height="700" fill="white"/>`;
const tri = leg.getIndices().getArray();
for (let i = 0; i < tri.length; i += 3) { const a = prof[tri[i]], b = prof[tri[i + 1]], c = prof[tri[i + 2]]; const X = (p) => 50 + (p[0] - smin) * sc, Y = (p) => 650 - p[1] * sc * 0.9; svg += `<polygon points="${X(a)},${Y(a)} ${X(b)},${Y(b)} ${X(c)},${Y(c)}" fill="none" stroke="black" stroke-width="0.5"/>`; }
for (let s = Math.ceil(smin * 10) / 10; s < smax; s += 0.1) { const X = 50 + (s - smin) * sc; svg += `<line x1="${X}" y1="0" x2="${X}" y2="700" stroke="${Math.abs(s * 10 - Math.round(s * 2) * 5) < 0.01 ? 'red' : '#ccc'}" stroke-width="0.5"/>`; }
for (let y = 0; y < 3; y += 0.1) { const Y = 650 - y * sc * 0.9; svg += `<line x1="0" y1="${Y}" x2="800" y2="${Y}" stroke="${Math.abs(y * 10 - Math.round(y * 2) * 5) < 0.01 ? 'blue' : '#eee'}" stroke-width="0.5"/>`; }
svg += '</svg>';
await sharp(Buffer.from(svg)).png().toFile('leg_profile.png');
// body side profile (z,y) and top (x,z)
const tb = body.getIndices().getArray();
let svg2 = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="700"><rect width="1400" height="700" fill="white"/>`;
const sc2 = 200;
for (let i = 0; i < tb.length; i += 3) { const v = [B[tb[i]], B[tb[i + 1]], B[tb[i + 2]]];
  svg2 += `<polygon points="${v.map(p => `${50 + (p[2] + 2.1) * sc2},${650 - (p[1]) * sc2}`).join(' ')}" fill="none" stroke="black" stroke-width="0.4"/>`;
  svg2 += `<polygon points="${v.map(p => `${750 + (p[0] + 1) * sc2 * 0.8},${50 + (p[2] + 2.1) * sc2 * 0.8}`).join(' ')}" fill="none" stroke="black" stroke-width="0.4"/>`; }
for (let z = -2; z <= 1.2; z += 0.1) { const X = 50 + (z + 2.1) * sc2; svg2 += `<line x1="${X}" y1="0" x2="${X}" y2="700" stroke="${Math.abs(z * 10 - Math.round(z * 2) * 5) < 0.01 ? 'red' : '#ddd'}" stroke-width="0.6"/>`; }
for (let y = 0; y < 3.2; y += 0.1) { const Y = 650 - y * sc2; svg2 += `<line x1="0" y1="${Y}" x2="700" y2="${Y}" stroke="${Math.abs(y * 10 - Math.round(y * 2) * 5) < 0.01 ? 'blue' : '#eee'}" stroke-width="0.6"/>`; }
svg2 += '</svg>';
await sharp(Buffer.from(svg2)).png().toFile('body_profile.png');
