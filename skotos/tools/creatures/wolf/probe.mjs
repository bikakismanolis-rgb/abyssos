import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as THREE from 'three';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('../../research/github/rocketbox_Dog_GermanShepard_01.glb');
const root = doc.getRoot();
const W = new Map();
const visit = (n, pm) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(...n.getTranslation()), new THREE.Quaternion(...n.getRotation()), new THREE.Vector3(...n.getScale())); const w = pm.clone().multiply(m); W.set(n.getName(), w); n.listChildren().forEach(c => visit(c, w)); };
root.getDefaultScene().listChildren().forEach(n => visit(n, new THREE.Matrix4()));
for (const [k, m] of W) { const p = new THREE.Vector3().setFromMatrixPosition(m); console.log(k.padEnd(24), p.toArray().map(v => v.toFixed(3)).join(' ')); }
const skin = root.listSkins()[0]; const ibm = skin.getInverseBindMatrices().getArray();
let maxErr = 0; skin.listJoints().forEach((j, i) => { const B = new THREE.Matrix4().fromArray(ibm, i*16); const P = W.get(j.getName()).clone().multiply(B); const e = P.elements.reduce((s, v, k) => s + Math.abs(v - [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1][k]), 0); maxErr = Math.max(maxErr, e); });
console.log('bind vs rest max err', maxErr);
console.log('mesh node world', W.get('MESH_shepherd_dog_2232').elements.map(v=>+v.toFixed(3)).join(','));
for (const [k, m] of W) { const d = m.determinant(); if (d < 0) console.log('det', k, d.toExponential(3)); }
// mesh y-top over withers region
const p = root.listMeshes()[0].listPrimitives()[0], P = p.getAttribute('POSITION');
const mw = W.get('MESH_shepherd_dog_2232');
let top = {}; for (let i = 0; i < P.getCount(); i++) { const v = new THREE.Vector3(...P.getElement(i, [])); const zb = Math.round(v.z * 10) / 10; top[zb] = Math.max(top[zb] ?? -1, v.y); }
console.log(Object.entries(top).sort((a,b)=>a[0]-b[0]).map(([z,y])=>`z${z}:${y.toFixed(3)}`).join(' '));
