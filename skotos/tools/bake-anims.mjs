// Retargets KayKit (CC0) animations onto our T-pose humanoid rig and writes src/gfx/anims.data.js.
// World-space delta retargeting: for each mapped bone D(t) = W(t) * W_rest^-1, and since our rig's rest
// rotations are identity, local(bone) = D(parent)^-1 * D(bone). Hips translation is scaled by leg length.
// usage: node tools/bake-anims.mjs <adventurers Knight.glb> <skeletons Skeleton_Warrior.glb>
import { NodeIO } from '@gltf-transform/core';
import { writeFileSync } from 'node:fs';

const [knightPath, skelPath] = process.argv.slice(2);
const FPS = 30;
const MAP = {
  root: 'root', hips: 'hips', spine: 'spine', chest: 'chest', head: 'head',
  'upperarm.l': 'armL', 'lowerarm.l': 'foreL', 'hand.l': 'handL',
  'upperarm.r': 'armR', 'lowerarm.r': 'foreR', 'hand.r': 'handR',
  'upperleg.l': 'thighL', 'lowerleg.l': 'shinL', 'foot.l': 'footL',
  'upperleg.r': 'thighR', 'lowerleg.r': 'shinR', 'foot.r': 'footR'
};
// our rig: bone -> parent (unmapped bones in between keep identity rotations)
const TPARENT = { root: null, hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', armL: 'chest', foreL: 'armL', handL: 'foreL', armR: 'chest', foreR: 'armR', handR: 'foreR', thighL: 'hips', shinL: 'thighL', footL: 'shinL', thighR: 'hips', shinR: 'thighR', footR: 'shinR' };
const TBONES = Object.values(MAP);
const mappedAncestor = (b) => { let p = TPARENT[b]; while (p && !TBONES.includes(p)) p = TPARENT[p]; return p; };

const KEEP = {
  knight: ['Idle', 'Unarmed_Idle', '2H_Melee_Idle', 'Walking_A', 'Walking_B', 'Walking_C', 'Walking_Backwards', 'Running_A', 'Running_B', 'Running_Strafe_Left', 'Running_Strafe_Right',
    '1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Slice_Horizontal', '1H_Melee_Attack_Stab', '2H_Melee_Attack_Chop', '2H_Melee_Attack_Slice', '2H_Melee_Attack_Spin', '2H_Melee_Attack_Spinning', '2H_Melee_Attack_Stab',
    'Dualwield_Melee_Attack_Chop', 'Dualwield_Melee_Attack_Slice', 'Dualwield_Melee_Attack_Stab', '1H_Ranged_Aiming', '1H_Ranged_Shoot', '1H_Ranged_Shooting', '1H_Ranged_Reload', '2H_Ranged_Aiming', '2H_Ranged_Shoot', '2H_Ranged_Shooting', '2H_Ranged_Reload',
    'Block', 'Block_Attack', 'Block_Hit', 'Blocking', 'Cheer', 'Death_A', 'Death_A_Pose', 'Death_B', 'Death_B_Pose', 'Dodge_Backward', 'Dodge_Forward', 'Dodge_Left', 'Dodge_Right', 'Hit_A', 'Hit_B', 'Interact',
    'Jump_Full_Long', 'Jump_Full_Short', 'Jump_Start', 'Jump_Idle', 'Jump_Land', 'PickUp', 'Spellcast_Long', 'Spellcast_Raise', 'Spellcast_Shoot', 'Spellcasting', 'Throw', 'Unarmed_Melee_Attack_Kick', 'Unarmed_Melee_Attack_Punch_A', 'Unarmed_Melee_Attack_Punch_B', 'Use_Item', 'Sit_Floor_Idle', 'Sit_Chair_Idle', 'Lie_Idle'],
  skel: ['1H_Melee_Attack_Jump_Chop', 'Death_C_Skeletons', 'Death_C_Skeletons_Resurrect', 'Idle_B', 'Idle_Combat', 'Running_C', 'Skeletons_Awaken_Floor', 'Skeletons_Awaken_Floor_Long', 'Skeletons_Awaken_Standing', 'Skeletons_Inactive_Floor_Pose', 'Spawn_Ground', 'Spawn_Air', 'Spellcast_Summon', 'Taunt', 'Taunt_Longer', 'Walking_D_Skeletons']
};

// ---- quaternion / vector math ----
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qinv = (q) => [-q[0], -q[1], -q[2], q[3]];
const qnorm = (q) => { const l = Math.hypot(...q) || 1; return q.map((v) => v / l); };
function qslerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) { b = b.map((v) => -v); d = -d; }
  if (d > 0.9995) return qnorm(a.map((v, i) => v + (b[i] - v) * t));
  const th = Math.acos(d), s = Math.sin(th);
  return a.map((v, i) => (v * Math.sin((1 - t) * th) + b[i] * Math.sin(t * th)) / s);
}
function vrot(q, v) {
  const [x, y, z, w] = q, ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}

async function load(path) {
  const doc = await new NodeIO().read(path);
  const root = doc.getRoot();
  const joints = root.listSkins()[0].listJoints();
  const byName = new Map(joints.map((j) => [j.getName(), j]));
  // full chain of nodes from the scene root, so armature transforms are included
  const all = [];
  const visit = (n, parent) => { all.push({ node: n, name: n.getName(), parent }); for (const c of n.listChildren()) visit(c, n.getName()); };
  for (const n of root.getDefaultScene().listChildren()) visit(n, null);
  const info = new Map(all.map((a) => [a.name, a]));
  return { root, byName, all, info };
}

function poseAt(src, anim, t) {
  // local TRS of every node at time t
  const local = new Map();
  for (const a of src.all) local.set(a.name, { t: a.node.getTranslation().slice(), r: a.node.getRotation().slice() });
  if (anim) for (const ch of anim.listChannels()) {
    const n = ch.getTargetNode().getName(), path = ch.getTargetPath();
    if (path !== 'rotation' && path !== 'translation') continue;
    const s = ch.getSampler(), inp = s.getInput().getArray(), out = s.getOutput().getArray(), k = path === 'rotation' ? 4 : 3;
    let i = 0; while (i < inp.length - 2 && t > inp[i + 1]) i++;
    const t0 = inp[i], t1 = inp[Math.min(i + 1, inp.length - 1)], f = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
    const a = Array.from(out.slice(i * k, i * k + k)), b = Array.from(out.slice(Math.min(i + 1, inp.length - 1) * k, Math.min(i + 1, inp.length - 1) * k + k));
    const v = k === 4 ? qslerp(a, b, f) : a.map((x, j) => x + (b[j] - x) * f);
    if (local.has(n)) local.get(n)[path === 'rotation' ? 'r' : 't'] = v;
  }
  // forward kinematics
  const world = new Map();
  for (const a of src.all) {
    const l = local.get(a.name), p = a.parent ? world.get(a.parent) : { p: [0, 0, 0], r: [0, 0, 0, 1] };
    const wp = vrot(p.r, l.t).map((v, i) => v + p.p[i]);
    world.set(a.name, { p: wp, r: qnorm(qmul(p.r, l.r)) });
  }
  return world;
}

const out = { fps: FPS, bones: TBONES, clips: {} };
const enc16 = (arr) => Buffer.from(new Int16Array(arr).buffer).toString('base64');
let report = {};
for (const [tag, path] of [['knight', knightPath], ['skel', skelPath]]) {
  const src = await load(path);
  const rest = poseAt(src, null, 0);
  const hipsRest = rest.get('hips').p;
  const legLen = hipsRest[1];
  if (tag === 'knight') {
    const toe = rest.get('toes.l').p, foot = rest.get('foot.l').p;
    report.facing = toe[2] - foot[2] > 0 ? '+Z' : '-Z';
    report.legLen = legLen;
    for (const side of ['r', 'l']) {
      const hs = rest.get('handslot.' + side), h = rest.get('hand.' + side);
      out['slot' + side.toUpperCase()] = { q: hs.r.map((v) => +v.toFixed(5)), p: hs.p.map((v, i) => +((v - h.p[i]) / legLen).toFixed(5)) };
    }
    out.srcLeg = legLen;
  }
  for (const anim of src.root.listAnimations()) {
    const name = anim.getName();
    if (!KEEP[tag].includes(name)) continue;
    let dur = 0; for (const s of anim.listSamplers()) dur = Math.max(dur, s.getInput().getMax([])[0]);
    const n = Math.max(2, Math.round(dur * FPS) + 1);
    const q = [], h = [];
    for (let f = 0; f < n; f++) {
      const w = poseAt(src, anim, Math.min(dur, f / FPS));
      const D = {};
      for (const [sname, tname] of Object.entries(MAP)) D[tname] = qmul(w.get(sname).r, qinv(rest.get(sname).r));
      for (const b of TBONES) {
        const pa = mappedAncestor(b);
        let l = pa ? qmul(qinv(D[pa]), D[b]) : D[b];
        l = qnorm(l); if (l[3] < 0) l = l.map((v) => -v);
        for (const v of l) q.push(Math.round(v * 32767));
      }
      // hips offset in the root frame, normalised by leg length (the runtime multiplies by its own hip height)
      const hp = w.get('hips').p, rr = w.get('root');
      const d = vrot(qinv(rr.r), hp.map((v, i) => v - rr.p[i]));
      const restD = hipsRest;
      for (let i = 0; i < 3; i++) h.push(Math.round(((d[i] - (i === 1 ? 0 : restD[i])) / legLen) * 8192));
    }
    out.clips[name] = { d: +dur.toFixed(4), n, q: enc16(q), h: enc16(h) };
  }
}
const js = `// Generated by tools/bake-anims.mjs from KayKit Adventurers + Skeletons (CC0, Kay Lousberg). Do not edit.
export const ANIMS = ${JSON.stringify(out)};
`;
writeFileSync(new URL('../src/gfx/anims.data.js', import.meta.url), js);
console.log('facing', report.facing, 'srcLeg', report.legLen.toFixed(3), 'clips', Object.keys(out.clips).length, 'bytes', js.length);
console.log('slotR', JSON.stringify(out.slotR), 'slotL', JSON.stringify(out.slotL));
