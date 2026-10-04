import { io } from '../lib.mjs';
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
const skins = root.listSkins();
console.log('skins', skins.length);
for (const s of skins) console.log(s.getName(), s.listJoints().length, s.listJoints().slice(0, 4).map((j) => j.getName()).join(','), 'skel', s.getSkeleton()?.getName(), 'ibm0', Array.from(s.getInverseBindMatrices().getArray().slice(12, 16)).map((x) => x.toFixed(3)).join(','));
for (const n of root.listNodes()) if (n.getMesh()) console.log('node', n.getName(), 'mesh', n.getMesh().getName(), 'skin', skins.indexOf(n.getSkin()), 't', n.getTranslation(), 's', n.getScale());
