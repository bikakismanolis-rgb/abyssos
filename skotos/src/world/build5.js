// Act V's props (the rime pack): act5Level places the layout's props (L.props, t a rime prop name), act5Prop builds the
// props the story owns (sea-lights, the hearth, cairns, lamps, the Farthest Light...), each with a code-built fallback.
// (So far a frame: the level's props are not placed yet and every kind is an empty group carrying its kind.)
import * as THREE from 'three';

export function act5Level(L, I, B, out) {
  void L; void I; void B; void out;
}

export function act5Prop(kind, o = {}) {
  void o;
  const g = new THREE.Group();
  g.userData.kind = kind;
  return g;
}
