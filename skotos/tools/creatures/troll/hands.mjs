// Troll hands: finger curl (fingers1 -> fingers2 chain + thumb per hand) and grip nodes.
import { THREE, pose } from './lib.mjs';

// palm frame from the rest pose: dir = knuckles -> mid finger, palm = normal pointing out of the palm, across = towards the thumb
export function handFrame(RT, sd) {
  const h = RT.get('hand_' + sd).wp.clone(), k1 = RT.get('fingers1_' + sd).wp.clone(), k2 = RT.get('fingers2_' + sd).wp.clone(), th = RT.get('thumb_' + sd).wp.clone();
  // bone tails are not stored: estimate the tip as k2 + (k2 - k1) bent like the bind curl -> use the fingers2 bone's +Y
  const q2 = RT.get('fingers2_' + sd).wq.clone(), y2 = new THREE.Vector3(0, 1, 0).applyQuaternion(q2);
  const dir = k1.clone().sub(h).normalize();                           // wrist -> knuckles
  const d1 = k2.clone().sub(k1).normalize();
  const across = th.clone().sub(h).projectOnPlane(dir).normalize();  // towards the thumb
  const palm = dir.clone().cross(across).multiplyScalar(sd === 'L' ? 1 : -1).normalize(); // out of the palm
  return { h, k1, k2, th, dir, d1, palm, across };
}

// local rotations of the finger bones for curl amounts per hand (0 = bind, 1 = fist around a grip)
export function fingerPose(doc, curl = { R: 1, L: 1 }, ang = { f1: 0.9, f2: 0.7, t: 0.5 }) {
  const RT = pose(doc, null, 0), res = new Map();
  for (const sd of ['R', 'L']) {
    const f = handFrame(RT, sd), k = curl[sd];
    const rot = (bone, axis, a) => {
      const b = RT.get(bone), Wq = b.wq.clone(), R = new THREE.Quaternion().setFromAxisAngle(axis, a * k);
      res.set(bone, b.local.q.clone().multiply(Wq.clone().invert().multiply(R).multiply(Wq)));
    };
    const ax1 = f.dir.clone().cross(f.palm).normalize();
    rot('fingers1_' + sd, ax1, ang.f1);
    rot('fingers2_' + sd, ax1, ang.f2);
    const tdir = new THREE.Vector3(0, 1, 0).applyQuaternion(RT.get('thumb_' + sd).wq);
    const axt = tdir.clone().cross(f.palm.clone().add(f.dir.clone().multiplyScalar(0.3)).normalize()).normalize();
    rot('thumb_' + sd, axt, ang.t);
  }
  return res;
}

// grip_R / grip_L as children of the hand bones: origin in the closed fist, +Y out of the thumb side, +Z along the back of the hand
export function addGrips(doc, opts = {}) {
  const RT = pose(doc, null, 0), out = {};
  for (const sd of ['R', 'L']) {
    const f = handFrame(RT, sd);
    const Y = f.across.clone().projectOnPlane(f.dir).normalize();
    const Z = f.dir.clone();
    const X = Y.clone().cross(Z).normalize();
    // fist centre: below the knuckles, towards the palm
    const P = f.k1.clone().addScaledVector(f.dir, opts.back ?? -0.02).addScaledVector(f.palm, opts.palm ?? 0.09).addScaledVector(Y, opts.side ?? 0.0);
    const Wg = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(P);
    const hand = RT.get('hand_' + sd);
    const L = hand.world.clone().invert().multiply(Wg);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); L.decompose(p, q, s);
    const node = doc.createNode('grip_' + sd).setTranslation(p.toArray()).setRotation(q.toArray());
    hand.node.addChild(node);
    out[sd] = { node, p, q };
  }
  return out;
}
