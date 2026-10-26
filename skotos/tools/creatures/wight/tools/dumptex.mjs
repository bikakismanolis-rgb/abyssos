import { io } from '../lib.mjs';
import sharp from 'sharp';
const doc = await io.read(process.argv[2]);
for (const t of doc.getRoot().listTextures()) { await sharp(Buffer.from(t.getImage())).resize(400, 400).png().toFile(process.argv[3] + '_' + t.getName() + '.png'); }
