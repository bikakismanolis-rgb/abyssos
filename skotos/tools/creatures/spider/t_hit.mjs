import { makeRig, solve } from './lib.mjs';
import { makeClips } from './clips.mjs';
const rig = await makeRig();
const { clips } = makeClips(rig, {});
for (const t of [0, 0.035, 0.07, 0.1, 0.2]) {
  const spec = clips.hit.frame(t);
  const e = spec.body.q; const ang = 2 * Math.acos(Math.min(1, Math.abs(e.w))) * 180 / Math.PI;
  console.log(t, 'body rot deg', ang.toFixed(1), 'p', spec.body.p.toArray().map((x) => x.toFixed(3)).join(','));
}
