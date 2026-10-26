// Ashspawn hands: the fists are baked into the bind pose (clean.py), finger bones merged into hand_L/R.
// Palm frames + fist centres come from rig.json (written by clean.py, glTF coordinates, bind pose).
import { readFileSync } from 'node:fs';
import { THREE } from './lib.mjs';
const RIG = JSON.parse(readFileSync(new URL('./rig.json', import.meta.url)));
const V = (a) => new THREE.Vector3(...a);
// dir = wrist -> knuckles, across = pinky -> index (thumb side), palm = out of the palm
export function handFrame(RT, sd) {
  const h = RIG.hands[sd];
  return { h: V(h.hand), k1: V(h.knuckles), dir: V(h.dir).normalize(), across: V(h.across).normalize(), palm: V(h.palm).normalize(), fist: V(h.fist) };
}
// grip_R / grip_L as children of the hand bones: origin in the closed fist, +Y out of the thumb side, +Z along the back of the hand
export function addGrips(doc, RT, opts = {}) {
  const out = {};
  for (const sd of ['R', 'L']) {
    const f = handFrame(RT, sd);
    const Y = f.across.clone().normalize();
    const Z = f.dir.clone().projectOnPlane(Y).normalize();
    const X = Y.clone().cross(Z).normalize();
    const P = f.fist.clone().addScaledVector(f.palm, opts.palm ?? 0).addScaledVector(Z, opts.fwd ?? 0).addScaledVector(Y, opts.up ?? 0);
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
