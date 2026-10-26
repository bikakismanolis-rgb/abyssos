// node strip.mjs model.glb out.png "clipA:view:n,clipB:view:n" [cellW cellH] [extra json]
import { execFileSync } from 'node:child_process';
const [model, out, spec, cw = 220, ch = 300, extra = '{}'] = process.argv.slice(2);
const frames = [];
let cols = 0;
for (const part of spec.split(',')) {
  const [clip, view = 'side', n = 6, a = 0, b = 1] = part.split(':');
  const N = +n; cols = Math.max(cols, N);
  for (let i = 0; i < N; i++) frames.push({ clip, view, t: +a + (+b - +a) * (N === 1 ? 0 : i / (N - 1)), label: `${clip} ${(+a + (+b - +a) * (N === 1 ? 0 : i / (N - 1))).toFixed(2)} ${view}` });
  while (frames.length % cols) frames.push({ clip, view, t: 0, label: '-' });
}
const cfg = { model, out, cell: [+cw, +ch], cols, frames, ...JSON.parse(extra) };
console.log(execFileSync('node', ['sheet.mjs', JSON.stringify(cfg)], { encoding: 'utf8' }).slice(0, 300));
