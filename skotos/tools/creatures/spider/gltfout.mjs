// glTF writer for the spider rig: one skinned mesh (body + legs primitives), bones, clips.
import { Document } from '@gltf-transform/core';
import { THREE, V3 } from './lib.mjs';

// mats: { body: { base, normal, emissive, ... }, leg: {...} } where textures are { buf (png/webp Buffer), mime }
export function makeDoc(rig, mats, clips = {}, extras = {}) {
  const doc = new Document();
  const buf = doc.createBuffer();
  const scene = doc.createScene('spider');
  doc.getRoot().setDefaultScene(scene);
  // bones
  const nodes = rig.bones.map((b) => doc.createNode(b.name));
  rig.bones.forEach((b, i) => {
    const p = b.parent < 0 ? b.p : b.p.clone().sub(rig.bones[b.parent].p);
    nodes[i].setTranslation(p.toArray());
    if (b.parent >= 0) nodes[b.parent].addChild(nodes[i]);
  });
  scene.addChild(nodes[0]);
  const ibm = new Float32Array(rig.bones.length * 16);
  rig.bones.forEach((b, i) => new THREE.Matrix4().makeTranslation(-b.p.x, -b.p.y, -b.p.z).toArray(ibm, i * 16));
  const skin = doc.createSkin('spider_skin').setSkeleton(nodes[0]).setInverseBindMatrices(doc.createAccessor('ibm').setType('MAT4').setArray(ibm).setBuffer(buf));
  for (const n of nodes) skin.addJoint(n);
  // materials
  const tex = (t, name) => t ? doc.createTexture(name).setImage(t.buf).setMimeType(t.mime) : null;
  const M = {};
  for (const [k, m] of Object.entries(mats)) {
    const mat = doc.createMaterial(k).setRoughnessFactor(m.roughness ?? 0.7).setMetallicFactor(0).setBaseColorFactor(m.color || [1, 1, 1, 1]);
    if (m.base) mat.setBaseColorTexture(tex(m.base, k + '_base'));
    if (m.normal) { mat.setNormalTexture(tex(m.normal, k + '_normal')); mat.setNormalScale(m.normalScale ?? 1); }
    if (m.emissive) { mat.setEmissiveTexture(tex(m.emissive, k + '_emissive')); mat.setEmissiveFactor(m.emissiveFactor || [1, 1, 1]); }
    if (m.orm) { mat.setMetallicRoughnessTexture(tex(m.orm, k + '_orm')); }
    M[k] = mat;
  }
  const mesh = doc.createMesh('spider');
  for (const part of rig.parts) {
    const n = part.pos.length / 3;
    const J = new Uint16Array(n * 4), W = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { J[i * 4] = part.bone[i]; W[i * 4] = 1; }
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(part.pos).setBuffer(buf))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(part.nrm).setBuffer(buf))
      .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(part.uv).setBuffer(buf))
      .setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(J).setBuffer(buf))
      .setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(W).setBuffer(buf))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(part.idx).setBuffer(buf))
      .setMaterial(M[part.mat]);
    mesh.addPrimitive(prim);
  }
  const meshNode = doc.createNode('spider_mesh').setMesh(mesh).setSkin(skin);
  scene.addChild(meshNode);
  // clips: { name: { times: Float32Array, frames: [ local[] ] } }
  for (const [name, c] of Object.entries(clips)) {
    const input = doc.createAccessor(name + '_t').setType('SCALAR').setArray(Float32Array.from(c.times)).setBuffer(buf);
    const anim = doc.createAnimation(name);
    rig.bones.forEach((b, bi) => {
      if (bi === 0) return; // root stays put
      const n = c.frames.length, qa = new Float32Array(n * 4);
      let prev = null;
      for (let f = 0; f < n; f++) { const q = c.frames[f][bi].q.clone().normalize(); if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w); q.toArray(qa, f * 4); prev = q; }
      const s = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType('VEC4').setArray(qa).setBuffer(buf)).setInterpolation('LINEAR');
      anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(nodes[bi]).setTargetPath('rotation').setSampler(s));
      if (b.name === 'body') {
        const pa = new Float32Array(n * 3);
        for (let f = 0; f < n; f++) c.frames[f][bi].p.toArray(pa, f * 3);
        const s2 = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType('VEC3').setArray(pa).setBuffer(buf)).setInterpolation('LINEAR');
        anim.addSampler(s2).addChannel(doc.createAnimationChannel().setTargetNode(nodes[bi]).setTargetPath('translation').setSampler(s2));
      }
    });
  }
  scene.setExtras(extras);
  return doc;
}
