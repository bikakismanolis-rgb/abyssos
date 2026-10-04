import sharp from 'sharp';
// usage: node _crop.mjs out.png left top size file1 file2 ...  (coords in 1024 space)
const [out, l, t, s, ...files] = process.argv.slice(2);
const tiles = [];
for (const f of files) { const b = await sharp(f).resize(1024, 1024).png().toBuffer(); tiles.push(await sharp(b).extract({ left: +l, top: +t, width: +s, height: +s }).resize(448, 448).png().toBuffer()); }
await sharp({ create: { width: 448 * tiles.length, height: 448, channels: 3, background: '#000' } }).composite(tiles.map((b, i) => ({ input: b, left: i * 448, top: 0 }))).png().toFile(out);
