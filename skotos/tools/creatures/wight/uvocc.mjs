import { io } from './lib.mjs';
import { uvRaster } from './tex.mjs';
import sharp from 'sharp';
const doc = await io.read(process.argv[2]);
const want = process.argv[3].split(',');
const prims = [];
for (const m of doc.getRoot().listMeshes()) if (want.some((w) => m.getName().toLowerCase().includes(w))) prims.push(...m.listPrimitives());
const N = 256;
const map = uvRaster(N, prims, () => 1);
const img = Buffer.alloc(N * N); for (let i = 0; i < N * N; i++) img[i] = map[i] >= 0 ? 255 : 0;
await sharp(img, { raw: { width: N, height: N, channels: 1 } }).png().toFile(process.argv[4]);
// find empty square blocks of size b (in N px)
for (const b of [32, 24, 16]) {
  const found = [];
  for (let y = 0; y + b <= N; y += 4) for (let x = 0; x + b <= N; x += 4) {
    let ok = true; for (let yy = y - 2; yy < y + b + 2 && ok; yy++) for (let xx = x - 2; xx < x + b + 2; xx++) { if (yy < 0 || xx < 0 || yy >= N || xx >= N) continue; if (map[yy * N + xx] >= 0) { ok = false; break; } }
    if (ok) found.push([x / N, y / N]);
  }
  console.log('block', b / N, found.length, JSON.stringify(found.slice(0, 12)));
}
