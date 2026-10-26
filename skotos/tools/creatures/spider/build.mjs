// Builds S/creatures/out/spider.glb: rig (lib.mjs) + procedural clips (clips.mjs) + textures (tex/*.png from textures.mjs).
// usage (cwd = this folder): node build.mjs [out.glb] [--raw] [--only=walk,run] [--P='{"walkT":0.6}']
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, meshopt, unpartition, resample, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { makeRig, solve, tipOf, LEG_NAMES, V3, S } from './lib.mjs';
import { makeClips } from './clips.mjs';
import { makeDoc } from './gltfout.mjs';

const argv = process.argv.slice(2);
const RAW = argv.includes('--raw');
const OUT = argv.find((a) => a.endsWith('.glb')) || S + '/creatures/out/spider.glb';
const ONLY = (argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const P = JSON.parse((argv.find((a) => a.startsWith('--P=')) || '--P={}').slice(4));
const rig = await makeRig();
const { clips: defs, N } = makeClips(rig, P);

// per-leg vertex lists for ground checks
const legVerts = {};
for (const n of LEG_NAMES) legVerts[n] = [];
const otherVerts = [];
for (const part of rig.parts) for (let v = 0; v < part.pos.length / 3; v++) {
  const bi = part.bone[v], nm = rig.bones[bi].name, rec = { bi, p: V3().fromArray(part.pos, v * 3) };
  const m = /^leg_(\w\d)_/.exec(nm);
  if (m) legVerts[m[1]].push(rec); else otherVerts.push(rec);
}
const minY = (pose, list) => { let m = 1e9, who = ''; for (const r of list) { const b = rig.bones[r.bi]; const y = r.p.clone().sub(b.p).applyQuaternion(pose.WQ[r.bi]).add(pose.WP[r.bi]).y; if (y < m) { m = y; who = b.name; } } return [m, who]; };

const out = {}, report = {};
for (const [name, def] of Object.entries(defs)) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  const nF = Math.round(def.dur * def.fps);
  const times = [], frames = [];
  let worst = { y: 1e9 }, reach = 0, lowLeg = 1e9, lifted = 0;
  const tips = [];
  for (let i = 0; i <= nF; i++) {
    const t = (i / nF) * def.dur;
    times.push(t);
    if (def.loop && i === nF) { frames.push(frames[0]); tips.push(tips[0]); continue; }
    const spec = def.frame(t);
    let pose = solve(rig, spec);
    // feet must not sink: raise IK targets of legs whose geometry dips below the ground
    for (let it = 0; it < 8; it++) {
      let fix = false;
      for (const n of LEG_NAMES) {
        const ls = spec.legs && spec.legs[n]; if (!ls) continue;
        const [m] = minY(pose, legVerts[n]);
        if (m >= -0.001) continue;
        fix = true;
        if (ls.foot) ls.foot.y += -m + 0.0005;
        else ls.raise = (ls.raise || 0) + Math.max(1, (-m / 0.6) / (Math.PI / 180)); // rotate the limp leg up about its root
      }
      if (!fix) break;
      pose = solve(rig, spec);
    }
    // body parts must not sink either: lift the body (feet stay where they are)
    for (let it = 0; it < 3; it++) {
      const [mo] = minY(pose, otherVerts);
      if (mo >= 0.004) break;
      spec.body.p.y += 0.004 - mo; pose = solve(rig, spec); lifted = Math.max(lifted, 0.004 - mo);
    }
    for (const n of LEG_NAMES) {
      const [m, who] = minY(pose, legVerts[n]); lowLeg = Math.min(lowLeg, m);
      if (pose.info[n] !== undefined) reach = Math.max(reach, pose.info[n]);
    }
    const [mo, whoO] = minY(pose, otherVerts);
    if (mo < worst.y) worst = { y: mo, who: whoO, t: +t.toFixed(2) };
    frames.push(pose.local);
    tips.push(Object.fromEntries(LEG_NAMES.map((n) => [n, tipOf(rig, pose, n)])));
  }
  // foot slip during stance for gait clips (world speed should equal -v along z)
  let slip = 0;
  if (def.speed) {
    const dt = def.dur / nF;
    for (let i = 1; i < tips.length; i++) for (const n of LEG_NAMES) {
      const a = tips[i - 1][n], b = tips[i][n];
      if (a.y < 0.004 && b.y < 0.004) slip = Math.max(slip, Math.abs((b.z - a.z) / dt + def.speed), Math.abs(b.x - a.x) / dt);
    }
  }
  out[name] = { times, frames };
  report[name] = { dur: def.dur, frames: nF + 1, bodyMinY: [+worst.y.toFixed(3), worst.who, worst.t], legMinY: +lowLeg.toFixed(3), overReach: +reach.toFixed(3), lifted: +lifted.toFixed(3), speed: def.speed && +def.speed.toFixed(2), slip: def.speed && +slip.toFixed(3) };
}
console.log(JSON.stringify(report, null, 0).replace(/\},"/g, '},\n"'));

// height: top of the abdomen in the idle stance
let height = 0, span = [1e9, -1e9, 1e9, -1e9];
if (out.idle) {
  const pose0 = solve(rig, defs.idle.frame(0));
  for (const part of rig.parts) for (let v = 0; v < part.pos.length / 3; v++) {
    const bi = part.bone[v]; const p = V3().fromArray(part.pos, v * 3).sub(rig.bones[bi].p).applyQuaternion(pose0.WQ[bi]).add(pose0.WP[bi]);
    height = Math.max(height, p.y); span = [Math.min(span[0], p.x), Math.max(span[1], p.x), Math.min(span[2], p.z), Math.max(span[3], p.z)];
  }
}
const hit = {}; for (const [k, d] of Object.entries(defs)) if (d.hit !== undefined) hit[k] = d.hit;
const extras = {
  hit, height: +height.toFixed(2), legSpan: +(span[1] - span[0]).toFixed(2), length: +(span[3] - span[2]).toFixed(2),
  leap: { takeoff: defs.leap.takeoff, land: defs.leap.land },
  walkSpeed: +defs.walk.speed.toFixed(2), runSpeed: +defs.run.speed.toFixed(2),
  credit: '"Low Poly Giant Spider" by p0ss (OpenGameArt.org, CC-BY 3.0), based on "Spider" by sunburn (OpenGameArt.org, CC-BY 3.0); hair texture detail from a public-domain burningwell.org photo by Michelle Buntin. Modified for Skotos: legs re-assembled symmetrically, rigged, skinned, retextured (darkened, dull red markings) and procedurally animated.',
  license: 'CC-BY 3.0'
};
console.log(JSON.stringify(extras));

// textures (made by textures.mjs); fall back to the source ones
const T = (f, alt) => ({ buf: readFileSync(existsSync('tex/' + f) ? 'tex/' + f : alt), mime: 'image/png' });
const D = S + '/research/opengameart/dl/giant-spider/';
const mats = {
  body: { base: T('body_base.png', D + 'Spider-body-brown-tex.png'), normal: existsSync('tex/body_nrm.png') ? T('body_nrm.png') : null, normalScale: 0.7, emissive: existsSync('tex/body_glow.png') ? T('body_glow.png') : null, emissiveFactor: [1, 1, 1], roughness: 0.62 },
  leg: { base: T('leg_base.png', D + 'Spider-leg-brown-tex.png'), normal: existsSync('tex/leg_nrm.png') ? T('leg_nrm.png') : null, normalScale: 0.7, roughness: 0.58 }
};
const doc = makeDoc(rig, mats, out, extras);
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
if (!RAW) {
  await doc.transform(
    resample({ tolerance: 1e-4 }),
    dedup(),
    weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^baseColorTexture$/, resize: [1024, 1024], quality: 84 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /^(normalTexture|emissiveTexture)$/, resize: [512, 512], quality: 88 }),
    quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
    prune({ keepLeaves: false }),
    unpartition()
  );
}
await io.write(OUT, doc);
console.log('wrote', OUT, (statSync(OUT).size / 1024).toFixed(0) + ' KB');
