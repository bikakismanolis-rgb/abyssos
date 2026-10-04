// Grip nodes and finger curl for the goblin's three-fingered hands (index, pinky, thumb).
import { THREE, pose } from './lib.mjs';

export function handFrame(RT, sd) {
  const h = RT.get('hand_' + sd).wp.clone(), i = RT.get('index_1_' + sd).wp.clone(), p = RT.get('pinky_1_' + sd).wp.clone();
  const m = i.clone().add(p).multiplyScalar(0.5);
  const dir = m.clone().sub(h); const len = dir.length(); dir.normalize();
  const across = i.clone().sub(p).projectOnPlane(dir).normalize();          // towards index / thumb side
  const palm = dir.clone().cross(across).multiplyScalar(sd === 'L' ? 1 : -1).normalize(); // palm normal
  return { h, m, dir, across, palm, len };
}

// adds grip_R / grip_L as children of the hand bones: origin at the palm centre, +Y out of the thumb side of the
// fist (blade direction), +Z along the back of the hand towards the knuckles
export function addGrips(doc) {
  const RT = pose(doc, null, 0);
  const out = {};
  for (const sd of ['R', 'L']) {
    const f = handFrame(RT, sd);
    const P = f.h.clone().addScaledVector(f.dir, f.len * 0.55).addScaledVector(f.palm, 0.014);
    const Y = f.across.clone(), Z = f.dir.clone(), X = Y.clone().cross(Z).normalize();
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

// local rotations of the finger bones for a curl amount per hand (0 = bind claw, 1 = fist around a grip)
export function fingerPose(doc, curl = { R: 1, L: 0.5 }) {
  const RT = pose(doc, null, 0), res = new Map();
  for (const sd of ['R', 'L']) {
    const f = handFrame(RT, sd), k = curl[sd];
    const axis = f.dir.clone().cross(f.palm).normalize();      // rotating dir towards the palm
    const ang = { index: [1.25, 1.35, 0.9], pinky: [1.35, 1.4, 0.9] };
    for (const fin of ['index', 'pinky']) for (let j = 1; j <= 3; j++) {
      const b = RT.get(`${fin}_${j}_${sd}`);
      const Wq = b.wq.clone(), R = new THREE.Quaternion().setFromAxisAngle(axis, ang[fin][j - 1] * k);
      const extra = Wq.clone().invert().multiply(R).multiply(Wq);   // the world rotation expressed in the bone frame
      res.set(b.node.getName(), b.local.q.clone().multiply(extra));
    }
    const tang = [0.25, 0.45, 0.4];
    for (let j = 1; j <= 3; j++) {
      const b = RT.get(`thumb_${j}_${sd}`);
      const Wq = b.wq.clone(), R = new THREE.Quaternion().setFromAxisAngle(axis, tang[j - 1] * k);
      res.set(b.node.getName(), b.local.q.clone().multiply(Wq.clone().invert().multiply(R).multiply(Wq)));
    }
  }
  return res;
}
