import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
const D = S + '/research/opengameart/dl/giant-spider/';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(S + '/research/opengameart/glb/giant-spider.glb');
const r = doc.getRoot();
async function plot(meshName, texFile, out) {
  const p = r.listMeshes().find(m => m.getName() === meshName).listPrimitives()[0];
  const UV = p.getAttribute('TEXCOORD_0'), I = p.getIndices().getArray();
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">`;
  for (let i = 0; i < I.length; i += 3) { const q = [I[i], I[i + 1], I[i + 2]].map(k => UV.getElement(k, [])); svg += `<polygon points="${q.map(u => `${u[0] * 1024},${u[1] * 1024}`).join(' ')}" fill="rgba(255,255,0,0.12)" stroke="yellow" stroke-width="1"/>`; }
  svg += '</svg>';
  const b = await sharp(D + texFile).composite([{ input: Buffer.from(svg) }]).png().toBuffer(); await sharp(b).resize(700, 700).toFile(out);
}
await plot('Spider-leg250.006', 'Spider-leg-brown-tex.png', 'uv_leg006.png');
await plot('Spider-leg250.003', 'Spider-leg-brown-tex.png', 'uv_leg003.png');
await plot('Spider-body1000', 'Spider-body-brown-tex.png', 'uv_body.png');
