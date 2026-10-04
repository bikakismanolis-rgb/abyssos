// World-space retarget of UE-mannequin clips (Quaternius UAL, CC0) and KayKit clips (CC0) onto the Ashspawn (Executioner) rig.
//  W_tgt(t) = (W_src(t) * W_src_rest^-1) * REF_tgt ; local = W_parent^-1 * W_tgt
// REF_tgt = target bind pose, except the arms: upper arm and forearm swung to the source's T-pose directions and the
// hand fully aligned (wrist->knuckles + thumb side) so palms and held weapons match the source. Spine, head and legs
// keep the target's own bind as reference. Hip translation = source pelvis offset * hip-height ratio.
import { THREE, pose, duration } from './lib.mjs';
import { handFrame } from './hands.mjs';

export const SPEC_UAL = { pelvis: 'pelvis', ref: 'ual', map: {
  hips: 'pelvis', spine: 'spine_01', spine2: 'spine_02', chest: 'spine_03', neck: 'neck_01', head: 'Head',
  shoulder_L: 'clavicle_l', upperarm_L: 'upperarm_l', forearm_L: 'lowerarm_l', hand_L: 'hand_l',
  shoulder_R: 'clavicle_r', upperarm_R: 'upperarm_r', forearm_R: 'lowerarm_r', hand_R: 'hand_r',
  thigh_L: 'thigh_l', shin_L: 'calf_l', foot_L: 'foot_l', toe_L: 'ball_l',
  thigh_R: 'thigh_r', shin_R: 'calf_r', foot_R: 'foot_r', toe_R: 'ball_r' } };
export const SPEC_KK = { pelvis: 'hips', ref: 'kk', map: {
  hips: 'hips', spine: 'spine', chest: 'chest', head: 'head',
  upperarm_L: 'upperarm.l', forearm_L: 'lowerarm.l', hand_L: 'hand.l', upperarm_R: 'upperarm.r', forearm_R: 'lowerarm.r', hand_R: 'hand.r',
  thigh_L: 'upperleg.l', shin_L: 'lowerleg.l', foot_L: 'foot.l', toe_L: 'toes.l',
  thigh_R: 'upperleg.r', shin_R: 'lowerleg.r', foot_R: 'foot.r', toe_R: 'toes.r' } };
const UALNAME = { upperarm_L: 'upperarm_l', forearm_L: 'lowerarm_l', hand_L: 'hand_l', upperarm_R: 'upperarm_r', forearm_R: 'lowerarm_r', hand_R: 'hand_r',
  thigh_L: 'thigh_l', shin_L: 'calf_l', foot_L: 'foot_l', thigh_R: 'thigh_r', shin_R: 'calf_r', foot_R: 'foot_r', toe_L: 'ball_l', toe_R: 'ball_r' };

// REF is built against the UAL rest (T-pose, palms down); KayKit's T-pose has the same arm and hand frames
export function makeTarget(tdoc, sdoc, spec = SPEC_UAL, refDoc = sdoc, mk = {}) {
  const RT = pose(tdoc, null, 0), RS = pose(sdoc, null, 0), RU = pose(refDoc, null, 0);
  const order = []; const parentOf = new Map();
  const walk = (n) => { order.push(n); for (const c of n.listChildren()) { parentOf.set(c, n); walk(c); } };
  for (const n of tdoc.getRoot().getDefaultScene().listChildren()) walk(n);
  const joints = new Set(tdoc.getRoot().listSkins()[0].listJoints());
  const bones = order.filter((n) => joints.has(n));
  const wp = (P, n) => P.get(n).wp.clone();
  const tDir = { upperarm_L: 'forearm_L', forearm_L: 'hand_L', upperarm_R: 'forearm_R', forearm_R: 'hand_R' };
  if (mk.straightLegs) for (const sd of ['L', 'R']) Object.assign(tDir, { ['thigh_' + sd]: 'shin_' + sd, ['shin_' + sd]: 'foot_' + sd });
  const legW = mk.legStraight ?? 1;   // 0..1 partial straightening (slerp of the swing)
  const REF = new Map();
  for (const n of bones) {
    const name = n.getName(), par = parentOf.get(n);
    const restQ = RT.get(name).wq.clone();
    let cand = joints.has(par) ? REF.get(par.getName()).clone().multiply(RT.get(par.getName()).wq.clone().invert()).multiply(restQ) : restQ.clone();
    const corr = () => cand.clone().multiply(restQ.clone().invert());
    if (tDir[name]) {
      const s = UALNAME[name], sc = UALNAME[tDir[name]];
      const dT = wp(RT, tDir[name]).sub(wp(RT, name)).normalize().applyQuaternion(corr());
      const dS = wp(RU, sc).sub(wp(RU, s)).normalize();
      let sw = new THREE.Quaternion().setFromUnitVectors(dT, dS);
      if (/thigh|shin/.test(name)) sw = new THREE.Quaternion().slerp(sw, legW);
      cand = sw.multiply(cand);
    } else if (name === 'hand_L' || name === 'hand_R') {
      const sd = name.slice(-1), sl = sd.toLowerCase();
      const ft = handFrame(RT, sd);
      const h = wp(RU, 'hand_' + sl), m = wp(RU, 'middle_01_' + sl);
      const fs = { dir: m.sub(h).normalize(), across: wp(RU, 'index_01_' + sl).sub(wp(RU, 'pinky_01_' + sl)).normalize() };
      const c = corr(); const d1 = ft.dir.clone().applyQuaternion(c), a1 = ft.across.clone().applyQuaternion(c);
      const q1 = new THREE.Quaternion().setFromUnitVectors(d1, fs.dir);
      a1.applyQuaternion(q1);
      const pa = a1.clone().projectOnPlane(fs.dir).normalize(), pb = fs.across.clone().projectOnPlane(fs.dir).normalize();
      let ang = Math.acos(Math.max(-1, Math.min(1, pa.dot(pb)))); if (pa.clone().cross(pb).dot(fs.dir) < 0) ang = -ang;
      cand = new THREE.Quaternion().setFromAxisAngle(fs.dir, ang).multiply(q1).multiply(cand);
    }
    REF.set(name, cand);
  }
  const hipT = RT.get('hips').wp.y, hipS = RS.get(spec.pelvis).wp.y;
  return { tdoc, sdoc, spec, RT, RS, REF, bones, parentOf, joints, k: hipT / hipS };
}

// returns frames: Map(bone -> {q: local quaternion, p: local position (root only meaningful)})
export function retarget(T, anim, fps = 30, opts = {}) {
  const { RT, RS, REF, bones, parentOf, joints, k, spec } = T;
  const damp = opts.damp || {};
  const dur = duration(anim), frames = [];
  const t0 = opts.from ?? 0, t1 = opts.to ?? dur;
  const nn = Math.max(2, Math.round((t1 - t0) * fps) + 1);
  for (let f = 0; f < nn; f++) {
    const t = Math.min(t1, t0 + f / fps);
    const S = pose(T.sdoc, anim, t), W = new Map(), out = new Map();
    for (const node of bones) {
      const name = node.getName(), par = parentOf.get(node);
      const Wp = joints.has(par) ? W.get(par.getName()) : RT.get(name).parentWorld.clone();
      const WpQ = new THREE.Quaternion(); Wp.decompose(new THREE.Vector3(), WpQ, new THREE.Vector3());
      let Wq;
      const s = spec.map[name];
      const delta = (b) => S.get(b).wq.clone().multiply(RS.get(b).wq.clone().invert());
      if (s) {
        let dq = Array.isArray(s) ? delta(s[0]).slerp(delta(s[1]), s[2]) : delta(s);
        if (damp[name] !== undefined && joints.has(par)) {
          const pd = WpQ.clone().multiply(REF.get(par.getName()).clone().invert());
          dq = pd.slerp(dq, damp[name]);
        }
        Wq = dq.multiply(REF.get(name));
      }
      else if (joints.has(par)) Wq = WpQ.clone().multiply(REF.get(par.getName()).clone().invert()).multiply(REF.get(name));
      else Wq = REF.get(name).clone();
      let Wpos;
      if (name === 'hips') {
        const d = S.get(spec.pelvis).wp.clone().sub(RS.get(spec.pelvis).wp).multiplyScalar(k);
        if (opts.hipScale) d.multiply(opts.hipScale);
        Wpos = RT.get(name).wp.clone().add(d);
      } else Wpos = RT.get(name).local.p.clone().applyMatrix4(Wp);
      const Wm = new THREE.Matrix4().compose(Wpos, Wq, new THREE.Vector3(1, 1, 1));
      W.set(name, Wm);
      const L = Wp.clone().invert().multiply(Wm);
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); L.decompose(p, q, sc);
      out.set(name, { q, p: name === 'hips' ? p : RT.get(name).local.p.clone() });
    }
    frames.push(out);
  }
  return frames;
}
