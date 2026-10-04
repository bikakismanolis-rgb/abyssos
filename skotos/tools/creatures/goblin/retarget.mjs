// World-space retarget of UE-mannequin clips (Quaternius UAL, CC0) onto the goblin's Kelgar rig.
//  W_tgt(t) = (W_src(t) * W_src_rest^-1) * REF_tgt ; local = W_parent^-1 * W_tgt
// REF_tgt is the goblin bind pose, except the arms: upper arm and forearm are swung to the source's T-pose directions
// and the hand is fully aligned (bone direction + index->pinky axis) so palms and held weapons match the source.
// Spine, neck, head and legs keep the goblin's own hunched / bent-knee bind pose as their reference, so the hunch
// survives every clip. Hip translation is the source pelvis offset scaled by the hip-height ratio.
import { THREE, pose, duration } from './lib.mjs';

export const MAP = {
  pelvis: 'spine1', spine_01: 'spine2', spine_02: 'spine3', spine_03: 'spine4', neck_01: 'neck', Head: 'head',
  clavicle_l: 'shoulder_L', upperarm_l: 'upperarm_L', lowerarm_l: 'forearm_L', hand_l: 'hand_L',
  clavicle_r: 'shoulder_R', upperarm_r: 'upperarm_R', lowerarm_r: 'forearm_R', hand_r: 'hand_R',
  thigh_l: 'upperleg_L', calf_l: 'lowerleg_L', foot_l: 'foot_L', ball_l: 'toe_L',
  thigh_r: 'upperleg_R', calf_r: 'lowerleg_R', foot_r: 'foot_R', ball_r: 'toe_R'
};
const INV = Object.fromEntries(Object.entries(MAP).map(([a, b]) => [b, a]));
// target bone -> source bone, or [srcA, srcB, w] = slerp of the two world deltas
export const SPEC_UAL = { pelvis: 'pelvis', map: INV };
export const SPEC_KK = { pelvis: 'hips', map: {
  spine1: 'hips', spine2: 'spine', spine3: ['spine', 'chest', 0.5], spine4: 'chest', neck: ['chest', 'head', 0.5], head: 'head',
  upperarm_L: 'upperarm.l', forearm_L: 'lowerarm.l', hand_L: 'hand.l', upperarm_R: 'upperarm.r', forearm_R: 'lowerarm.r', hand_R: 'hand.r',
  upperleg_L: 'upperleg.l', lowerleg_L: 'lowerleg.l', foot_L: 'foot.l', toe_L: 'toes.l',
  upperleg_R: 'upperleg.r', lowerleg_R: 'lowerleg.r', foot_R: 'foot.r', toe_R: 'toes.r' } };
const FINGER = /^(index|pinky|thumb)_\d_[LR]$/;

// REF is built against the UAL rest (T-pose, palms down); KayKit's T-pose has the same arm and hand frames
export function makeTarget(tdoc, sdoc, spec = SPEC_UAL, refDoc = sdoc, mk = {}) {
  const RT = pose(tdoc, null, 0), RS = pose(sdoc, null, 0), RU = pose(refDoc, null, 0);
  const order = []; const parentOf = new Map();
  const walk = (n) => { order.push(n); for (const c of n.listChildren()) { parentOf.set(c, n); walk(c); } };
  for (const n of tdoc.getRoot().getDefaultScene().listChildren()) walk(n);
  const joints = new Set(tdoc.getRoot().listSkins()[0].listJoints());
  const bones = order.filter((n) => joints.has(n));
  const wp = (P, n) => P.get(n).wp.clone();
  const handFrame = (P, hand, idx, pinky, mid) => {
    const h = wp(P, hand), i = wp(P, idx), p = wp(P, pinky), m = mid ? wp(P, mid) : i.clone().add(p).multiplyScalar(0.5);
    return { dir: m.sub(h).normalize(), across: i.sub(p).normalize() };
  };
  const tDir = { upperarm_L: 'forearm_L', forearm_L: 'hand_L', upperarm_R: 'forearm_R', forearm_R: 'hand_R' };
  // optional: legs swung straight like the source rest (used for lying-down clips so the knees do not stay bent up)
  if (mk.straightLegs) for (const sd of ['L', 'R']) Object.assign(tDir, { ['upperleg_' + sd]: 'lowerleg_' + sd, ['lowerleg_' + sd]: 'foot_' + sd, ['foot_' + sd]: 'toe_' + sd });
  const REF = new Map();
  for (const n of bones) {
    const name = n.getName(), par = parentOf.get(n);
    const restQ = RT.get(name).wq.clone();
    let cand = joints.has(par) ? REF.get(par.getName()).clone().multiply(RT.get(par.getName()).wq.clone().invert()).multiply(restQ) : restQ.clone();
    const corr = () => cand.clone().multiply(restQ.clone().invert()); // rotation taking bind directions to the candidate
    if (tDir[name]) {
      const s = INV[name], sc = INV[tDir[name]];
      const dT = wp(RT, tDir[name]).sub(wp(RT, name)).normalize().applyQuaternion(corr());
      const dS = wp(RU, sc).sub(wp(RU, s)).normalize();
      cand = new THREE.Quaternion().setFromUnitVectors(dT, dS).multiply(cand);
    } else if (name === 'hand_L' || name === 'hand_R') {
      const sd = name.slice(-1), sl = sd.toLowerCase();
      const ft = handFrame(RT, name, 'index_1_' + sd, 'pinky_1_' + sd);
      const fs = handFrame(RU, 'hand_' + sl, 'index_01_' + sl, 'pinky_01_' + sl, 'middle_01_' + sl);
      const c = corr(); const d1 = ft.dir.clone().applyQuaternion(c), a1 = ft.across.clone().applyQuaternion(c);
      const q1 = new THREE.Quaternion().setFromUnitVectors(d1, fs.dir);
      a1.applyQuaternion(q1);
      const pa = a1.clone().projectOnPlane(fs.dir).normalize(), pb = fs.across.clone().projectOnPlane(fs.dir).normalize();
      let ang = Math.acos(Math.max(-1, Math.min(1, pa.dot(pb)))); if (pa.clone().cross(pb).dot(fs.dir) < 0) ang = -ang;
      cand = new THREE.Quaternion().setFromAxisAngle(fs.dir, ang).multiply(q1).multiply(cand);
    }
    REF.set(name, cand);
  }
  const hipT = RT.get('spine1').wp.y, hipS = RS.get(spec.pelvis).wp.y;
  return { tdoc, sdoc, spec, RT, RS, REF, bones, parentOf, joints, k: hipT / hipS };
}

// returns frames: Map(bone -> {q: local quaternion, p: local position (root only meaningful)})
export function retarget(T, anim, fps = 30, opts = {}) {
  const { RT, RS, REF, bones, parentOf, joints, k, spec } = T;
  const damp = opts.damp || {};   // bone -> factor applied to that bone's world delta (slerp from the parent's delta)
  const dur = duration(anim), n = Math.max(2, Math.round(dur * fps) + 1), frames = [];
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
          // blend this bone's delta towards its parent's current delta: less bending relative to the parent
          const pd = WpQ.clone().multiply(REF.get(par.getName()).clone().invert());
          dq = pd.slerp(dq, damp[name]);
        }
        Wq = dq.multiply(REF.get(name));
      }
      else if (joints.has(par)) Wq = WpQ.clone().multiply(REF.get(par.getName()).clone().invert()).multiply(REF.get(name));
      else Wq = REF.get(name).clone();
      // position: rest local offset carried by the parent, root gets the scaled source pelvis offset
      let Wpos;
      if (name === 'spine1') {
        const d = S.get(spec.pelvis).wp.clone().sub(RS.get(spec.pelvis).wp).multiplyScalar(k);
        if (opts.hipScale) d.multiply(opts.hipScale);
        Wpos = RT.get(name).wp.clone().add(d);
      } else Wpos = RT.get(name).local.p.clone().applyMatrix4(Wp);
      const Wm = new THREE.Matrix4().compose(Wpos, Wq, new THREE.Vector3(1, 1, 1));
      W.set(name, Wm);
      const L = Wp.clone().invert().multiply(Wm);
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); L.decompose(p, q, sc);
      out.set(name, { q, p: name === 'spine1' ? p : RT.get(name).local.p.clone() });
    }
    frames.push(out);
  }
  return frames;
}
