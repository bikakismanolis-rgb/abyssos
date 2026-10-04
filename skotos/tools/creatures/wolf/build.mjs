// Builds S/creatures/out/wolf.glb from wolf_base.glb (base.mjs) + procedural clips (clips.mjs).
// usage (cwd = this folder): node build.mjs [out.glb] [--raw] [--only=walk,run] [--P='{"walkT":1.1}']
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, meshopt, unpartition, resample, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'node:fs';
import { makeRig, solve, makeSkinner, writeClip, fk, V3, Q, LEGS } from './lib.mjs';
import { makeClips, FPS } from './clips.mjs';

const S = '/tmp/claude-0/-home-user-abyssos/e4e75481-4d08-5796-9dcc-333c3ebca4db/scratchpad';
const argv = process.argv.slice(2);
const RAW = argv.includes('--raw');
const OUT = argv.find((a) => a.endsWith('.glb')) || S + '/creatures/out/wolf.glb';
const ONLY = (argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const P = JSON.parse((argv.find((a) => a.startsWith('--P=')) || '--P={}').slice(4));
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read('wolf_base.glb');
const root = doc.getRoot();
const rig = makeRig(doc);
const sk = makeSkinner(rig, 2), skP = makeSkinner(rig, 1);

const defs = makeClips(rig, P);
const clips = {}, report = {};
for (const [name, def] of Object.entries(defs)) {
  if (!def.frames) continue;
  if (ONLY.length && !ONLY.includes(name)) continue;
  const frames = [], reach = { fl: -9, fr: -9, hl: -9, hr: -9 };
  for (const spec of def.frames) {
    let { frame, info } = solve(rig, spec);
    // paws must not dip into the ground (toe roll, curls): lift the offending leg's target and re-solve
    for (let it = 0; it < 3; it++) {
      const lm = skP.legMinY(frame); let fix = false;
      for (const k in lm) if (lm[k] < -0.002 && spec.legs && spec.legs[k] && !spec.legs[k].fk) { spec.legs[k].dyFix = (spec.legs[k].dyFix || 0) - lm[k] + 0.001; fix = true; }
      if (!fix) break;
      ({ frame, info } = solve(rig, spec));
    }
    for (const k in info.reach) reach[k] = Math.max(reach[k], info.reach[k]);
    frames.push(frame);
  }
  if (def.ground === 'lift') { // raise the body wherever something would sink into the ground
    const m = frames.map((f) => Math.min(0, sk.minY(f, /^ear_/)));
    const c = m.map((_, i) => -Math.min(m[Math.max(0, i - 1)], m[i], m[Math.min(m.length - 1, i + 1)]));
    frames.forEach((f, i) => { f.get('pelvis').p.y += c[i]; });
    report[name + '_lift'] = +Math.max(...c).toFixed(3);
  }
  if (def.loop) frames.push(new Map([...frames[0]].map(([k, v]) => [k, { q: v.q.clone(), p: v.p.clone() }])));
  // ground check (lowest skinned vertex)
  let lo = 1e9, hi = -1e9;
  for (let i = 0; i < frames.length; i += 2) { const m = sk.minY(frames[i]); lo = Math.min(lo, m); hi = Math.max(hi, m); }
  clips[name] = frames;
  report[name] = { dur: +((frames.length - 1) / FPS).toFixed(2), overReach: reach, minY: [+lo.toFixed(3), +hi.toFixed(3)], speed: def.speed && +def.speed.toFixed(2) };
}
console.log(JSON.stringify(report));
for (const a of root.listAnimations()) a.dispose();
for (const [name, fr] of Object.entries(clips)) writeClip(doc, rig, name, fr, FPS, ['pelvis']);
// overall height (ear tips) and shoulder height in the idle stance
let topY = 0, wither = 0;
if (clips.idle) for (const p of skP.skinned(clips.idle[0])) { topY = Math.max(topY, p.y); if (Math.abs(p.z - rig.R('spine_03').wp.z) < 0.08) wither = Math.max(wither, p.y); }
const extras = {
  hit: defs.HIT, height: +topY.toFixed(2), shoulderHeight: +wither.toFixed(2), pounce: defs.pounceInfo, walkSpeed: report.walk?.speed, runSpeed: report.run?.speed,
  credit: '"Dog_GermanShepard_01" from the Microsoft Rocketbox Avatar Library (github.com/microsoft/Microsoft-Rocketbox), Copyright (c) 2020 Microsoft, MIT License - retextured as a dark grey wolf, reshaped, re-rigged and procedurally animated for Skotos',
  license: 'MIT'
};
root.getDefaultScene().setExtras(extras);
if (!RAW) {
  await doc.transform(
    resample({ tolerance: 2e-4 }),
    dedup(),
    weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^baseColorTexture$/, resize: [1024, 1024], quality: 82 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^normalTexture$/, resize: [512, 512], quality: 90 }),
    prune({ keepLeaves: true }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
    prune({ keepLeaves: true }),
    unpartition()
  );
}
await io.write(OUT, doc);
console.log('wrote', OUT, (statSync(OUT).size / 1024).toFixed(0) + ' KB');
