import sharp from 'sharp';
import fs from 'node:fs';
const [dir, out, cols = 6] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
const W = 200, H = 220, c = +cols, r = Math.ceil(files.length / c);
const comps = [];
for (let i = 0; i < files.length; i++) {
  const img = await sharp(dir + '/' + files[i]).resize(W, W, { fit: 'contain', background: '#333' }).flatten({ background: '#333' }).png().toBuffer();
  const label = Buffer.from(`<svg width="${W}" height="20"><rect width="100%" height="100%" fill="#111"/><text x="2" y="14" font-size="11" fill="#fff" font-family="sans-serif">${files[i].replace('.png', '').slice(0, 34)}</text></svg>`);
  comps.push({ input: img, left: (i % c) * W, top: Math.floor(i / c) * H }, { input: label, left: (i % c) * W, top: Math.floor(i / c) * H + W });
}
await sharp({ create: { width: W * c, height: H * r, channels: 3, background: '#222' } }).composite(comps).png().toFile(out);
