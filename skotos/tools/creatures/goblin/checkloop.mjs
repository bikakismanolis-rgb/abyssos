import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
for (const a of doc.getRoot().listAnimations()) {
  let maxQ = 0, maxP = 0, scaleTracks = 0, transTracks = [], n = 0, dur = 0;
  for (const ch of a.listChannels()) {
    const s = ch.getSampler(), o = s.getOutput(), k = o.getCount(); n = Math.max(n, k); dur = Math.max(dur, s.getInput().getMax([])[0]);
    const f = o.getElement(0, []), l = o.getElement(k - 1, []);
    if (ch.getTargetPath() === 'rotation') { const d = Math.abs(f[0]*l[0]+f[1]*l[1]+f[2]*l[2]+f[3]*l[3]); maxQ = Math.max(maxQ, 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI); }
    if (ch.getTargetPath() === 'translation') { transTracks.push(ch.getTargetNode().getName()); maxP = Math.max(maxP, Math.hypot(f[0]-l[0], f[1]-l[1], f[2]-l[2])); }
    if (ch.getTargetPath() === 'scale') scaleTracks++;
  }
  console.log(a.getName().padEnd(8), 'dur', dur.toFixed(2), 'keys', n, 'channels', a.listChannels().length, 'first-vs-last rot(deg)', maxQ.toFixed(2), 'pos(m)', maxP.toFixed(4), 'trans', transTracks.join(','), 'scale', scaleTracks);
}
const sc = doc.getRoot().getDefaultScene(); console.log('scene extras', JSON.stringify(sc.getExtras()).slice(0, 300));
for (const n of doc.getRoot().listNodes()) if (/grip/.test(n.getName())) console.log(n.getName(), 'parent', n.getParentNode()?.getName(), n.getTranslation().map(v=>+v.toFixed(3)), n.getRotation().map(v=>+v.toFixed(3)));
