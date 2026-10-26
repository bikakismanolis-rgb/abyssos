// Builds src/assets/people.glb: every human in the game, composed from Quaternius Universal Base Characters and
// Modular Character Outfits (CC0). All parts share one UE-style skeleton. Each part is re-bound to its character's
// outfit skeleton but keeps its own inverse bind matrices, so a head made for one body sits right on another.
// Characters become separate scenes in one file so outfits, skin and hair textures are stored once.
// usage: node tools/pack-chars.mjs <srcDir> [out.glb] [--only name,name] [--preview <ual.glb> <clip>]
//   srcDir holds ubc/ (base bodies), mco/ (outfits), hair/ and tex/ (alternate base colours) as glTF + png.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { mergeDocuments, prune, dedup, textureCompress, weld, unpartition, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, n = 1) => { const i = argv.indexOf(k); return i < 0 ? null : argv.splice(i, n + 1).slice(1); };
const onlyOpt = opt('--only'), previewOpt = opt('--preview', 2);
const [SRC, OUT = new URL('../src/assets/people.glb', import.meta.url).pathname] = argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

const BASE = { m: 'ubc/Superhero_Male_FullBody.gltf', f: 'ubc/Superhero_Female_FullBody.gltf' };
const OUTFIT = { rangerM: 'mco/Male_Ranger.gltf', rangerF: 'mco/Female_Ranger.gltf', peasantM: 'mco/Male_Peasant.gltf', peasantF: 'mco/Female_Peasant.gltf' };
const hair = (n) => ({ src: `hair/${n}.gltf` });
const head = (g) => ({ src: BASE[g], head: true });

// A recipe lists parts (the first one supplies the skeleton) and look changes:
//   base: material -> replacement base colour png in tex/   hsv: material -> [hue deg, saturation x, brightness x]
//   color: material -> base colour factor (hair textures are grey and meant to be tinted)
export const RECIPES = {
  warden: { parts: [{ src: OUTFIT.rangerM, drop: ['Head_Hood'] }, head('m'), hair('Hair_SimpleParted'), hair('Hair_Beard')],
    hsv: { MI_Ranger: [60, 170, 222, 0.75, 0.62] }, color: { MI_Hair_1: '#4a3220' } },
  ranger: { parts: [{ src: OUTFIT.rangerF }, head('f')], color: { MI_Hair_2: '#3a2416' } },
  mage: { parts: [{ src: OUTFIT.rangerM, drop: ['Pauldron'] }, head('m'), hair('Hair_Beard')],
    hsv: { MI_Ranger: [60, 170, 262, 0.85, 0.7] }, color: { MI_Hair_1: '#d8d4cc' } },
  wayfarer: { parts: [{ src: OUTFIT.rangerM }, head('m'), hair('Hair_Beard')],
    base: { MI_Ranger: 'T_Ranger_3_BaseColor.png' }, color: { MI_Hair_1: '#9a948a' } },
  smith: { parts: [{ src: OUTFIT.peasantF }, head('f'), hair('Hair_Buns')],
    base: { MI_Peasant: 'T_Peasant_2_BaseColor.png' }, color: { MI_Hair_2: '#8a3a18', MI_Hair_1: '#8a3a18' } },
  healer: { parts: [{ src: OUTFIT.peasantF }, head('f'), hair('Hair_Long')],
    hsv: { MI_Peasant: [15, 60, 150, 0.7, 1.1] }, color: { MI_Hair_2: '#c8a868', MI_Hair_1: '#c8a868' } },
  villager0: { parts: [{ src: OUTFIT.peasantM }, head('m'), hair('Hair_SimpleParted')], color: { MI_Hair_1: '#2a1c12' } },
  villager1: { parts: [{ src: OUTFIT.peasantM }, head('m'), hair('Hair_Buzzed'), hair('Hair_Beard')],
    base: { MI_Peasant: 'T_Peasant_2_BaseColor.png' }, color: { MI_Hair_1: '#5a3a20' } },
  villager2: { parts: [{ src: OUTFIT.peasantF }, head('f'), hair('Hair_BuzzedFemale')], hsv: { MI_Peasant: [15, 60, 350, 0.8, 0.9] }, color: { MI_Hair_1: '#1c120c', MI_Hair_2: '#1c120c' } }
};

const HEAD_JOINTS = new Set(['Head', 'neck_01']);
// keep only the triangles of a full body that belong to the head and neck
function headOnly(mesh, skin) {
  const joints = skin.listJoints().map((j) => j.getName());
  for (const prim of mesh.listPrimitives()) {
    const J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), idx = prim.getIndices();
    if (!J || !W || !idx) continue;
    const n = J.getCount(), hw = new Float32Array(n), j = [], w = [];
    for (let i = 0; i < n; i++) {
      J.getElement(i, j); W.getElement(i, w);
      for (let k = 0; k < 4; k++) if (HEAD_JOINTS.has(joints[j[k]])) hw[i] += w[k];
    }
    const src = idx.getArray(), keep = [];
    for (let t = 0; t < src.length; t += 3) {
      const a = src[t], b = src[t + 1], c = src[t + 2];
      if (Math.max(hw[a], hw[b], hw[c]) > 0.45) keep.push(a, b, c);
    }
    idx.setArray(new Uint32Array(keep));
  }
}

const hexRGB = (h) => { const v = parseInt(h.slice(1), 16); return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255].map((c) => Math.pow(c, 2.2)); };
// selective recolour: only pixels whose hue lies in [from0, from1] (the dyed cloth) move to the target hue,
// so leather, metal and skin keep their colours. hsv: [from0, from1, toHue, saturation x, brightness x]
async function recolor(img, hsv) {
  const [f0, f1, to, sat, bri] = hsv;
  const { data, info } = await sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const mid = (f0 + f1) / 2;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < 0.04 || mx < 0.03) continue;
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
    const s0 = d / mx;
    if (h < f0 || h > f1 || s0 < 0.12) continue;
    const nh = (to + (h - mid) * 0.4 + 360) % 360, ns = Math.min(1, s0 * sat), nv = Math.min(1, mx * bri);
    const c = nv * ns, x = c * (1 - Math.abs(((nh / 60) % 2) - 1)), m = nv - c;
    const [rr, gg, bb] = nh < 60 ? [c, x, 0] : nh < 120 ? [x, c, 0] : nh < 180 ? [0, c, x] : nh < 240 ? [0, x, c] : nh < 300 ? [x, 0, c] : [c, 0, x];
    data[i] = Math.round((rr + m) * 255); data[i + 1] = Math.round((gg + m) * 255); data[i + 2] = Math.round((bb + m) * 255);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}

// one character as its own document
async function compose(name, recipe) {
  let doc = null, mainSkin = null, mainJoints = null;
  for (const part of recipe.parts) {
    const file = path.join(SRC, part.src);
    if (!existsSync(file)) throw new Error('missing part ' + file);
    const pd = await io.read(file);
    for (const node of pd.getRoot().listNodes()) {
      const mesh = node.getMesh(); if (!mesh) continue;
      const mname = mesh.getName() || node.getName();
      if (part.drop && part.drop.some((d) => mname.includes(d))) { mesh.dispose(); node.dispose(); continue; }
      if (part.head && node.getSkin() && mesh.listPrimitives()[0].getMaterial()?.getName().startsWith('MI_Superhero')) headOnly(mesh, node.getSkin());
    }
    if (!doc) { doc = pd; mainSkin = doc.getRoot().listSkins()[0]; mainJoints = new Map(mainSkin.listJoints().map((j) => [j.getName(), j])); continue; }
    const root = doc.getRoot(), before = new Set(root.listNodes());
    mergeDocuments(doc, pd);
    const scene = root.listScenes()[0];
    const added = root.listNodes().filter((n) => !before.has(n));
    const addedSet = new Set(added);
    for (const skin of root.listSkins()) {
      const js = skin.listJoints();
      if (skin === mainSkin || !js.length || !addedSet.has(js[0])) continue;
      for (const j of js) { const m = mainJoints.get(j.getName()); if (!m) throw new Error('joint ' + j.getName() + ' not in main skeleton'); skin.swap(j, m); }
      skin.setSkeleton(mainSkin.getSkeleton());
    }
    for (const n of added) if (n.getMesh()) { for (const p of n.listParents()) if (p.propertyType === 'Node' || p.propertyType === 'Scene') p.removeChild(n); scene.addChild(n); }
    for (const s of root.listScenes()) if (s !== scene) s.dispose();
    for (const n of added) if (!n.getMesh()) n.dispose();
  }
  const root = doc.getRoot();
  root.setDefaultScene(root.listScenes()[0]);
  root.listScenes()[0].setName(name);
  // look: replacement textures, recolours, tints. Materials are renamed per character so shared ones stay distinct.
  for (const mat of root.listMaterials()) {
    const mn = mat.getName();
    const tex = mat.getBaseColorTexture();
    if (recipe.base?.[mn] || recipe.hsv?.[mn]) {
      let img = recipe.base?.[mn] ? readFileSync(path.join(SRC, 'tex', recipe.base[mn])) : Buffer.from(tex.getImage());
      if (recipe.hsv?.[mn]) img = await recolor(img, recipe.hsv[mn]);
      const nt = doc.createTexture(`${name}_${mn}_base`).setImage(new Uint8Array(img)).setMimeType('image/png');
      mat.setBaseColorTexture(nt);
      mat.setName(`${mn}_${name}`);
    }
    if (recipe.color?.[mn]) { mat.setBaseColorFactor([...hexRGB(recipe.color[mn]), 1]); mat.setName(`${mn}_${name}`); }
  }
  // mark materials for the runtime: skin, hair and eyes get no environment sheen
  for (const mat of root.listMaterials()) mat.setExtras({ part: /Hair/.test(mat.getName()) ? 'hair' : /Eyes/.test(mat.getName()) ? 'eyes' : /Superhero|Regular/.test(mat.getName()) ? 'skin' : 'cloth' });
  return doc;
}

// original node names survive GLTFLoader's de-duplication (pelvis, pelvis_1, ...) through extras
const keepNames = (d) => { for (const n of d.getRoot().listNodes()) n.setExtras({ name: n.getName() }); };
const names = Object.keys(RECIPES).filter((n) => !onlyOpt || onlyOpt[0].split(',').includes(n));
let out = null;
for (const name of names) {
  const d = await compose(name, RECIPES[name]);
  keepNames(d);
  if (!out) { out = d; continue; }
  mergeDocuments(out, d);
}
const root = out.getRoot();
if (previewOpt) {
  // a single character with one clip, for tools/render previews
  const ad = await io.read(previewOpt[0]);
  for (const a of ad.getRoot().listAnimations()) if (a.getName() !== previewOpt[1]) a.dispose();
  for (const n of ad.getRoot().listNodes()) if (n.getMesh()) n.getMesh().dispose();
  const before = new Set(root.listNodes());
  mergeDocuments(out, ad);
  const joints = new Map(root.listSkins()[0].listJoints().map((j) => [j.getName(), j]));
  for (const anim of root.listAnimations()) for (const ch of anim.listChannels()) {
    const t = ch.getTargetNode(), m = t && joints.get(t.getName());
    if (!m || (ch.getTargetPath() === 'translation' && t.getName() !== 'pelvis') || ch.getTargetPath() === 'scale') { ch.getSampler().dispose(); ch.dispose(); continue; }
    ch.setTargetNode(m);
  }
  for (const s of root.listScenes()) if (s !== root.listScenes()[0]) s.dispose();
}
root.setDefaultScene(root.listScenes()[0]);
// texture sizes: outfits keep detail, skin/hair/normal maps are small on a phone screen
const SIZE = (t) => /Normal|ORM|Roughness/.test(t.getName()) ? 512 : /Hair|Superhero|Regular|Eye/.test(t.getName()) ? 512 : 1024;
await out.transform(
  dedup(), weld(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 80 }),
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
  prune({ keepAttributes: false, keepLeaves: false }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  prune({ keepAttributes: false, keepLeaves: false }),
  unpartition()
);
// smaller maps where detail is not visible
for (const t of root.listTextures()) {
  const s = SIZE(t), [w] = t.getSize() || [0];
  if (w > s) t.setImage(new Uint8Array(await sharp(Buffer.from(t.getImage())).resize(s, s).webp({ quality: 80 }).toBuffer()));
}
await io.write(OUT, out);
let tris = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() || 0) / 3;
let tb = 0; for (const t of root.listTextures()) tb += t.getImage().byteLength;
console.log('people', names.join(' '), '| scenes', root.listScenes().length, 'tris', tris, 'materials', root.listMaterials().length, 'textures', root.listTextures().length, (tb / 1e6).toFixed(2) + 'MB', '| file', (readFileSync(OUT).length / 1e6).toFixed(2) + 'MB');
