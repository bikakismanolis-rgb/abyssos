// Deepworm: "Worm Monster" by CR1STALLL (sketchfab.com/CR1STALLL), CC-BY 4.0 -> src/assets/creatures/worm.glb
// The model comes with its own clips: they are renamed to the contract, a burrow (sinking) clip is added.
// usage: node worm.mjs [source.glb] [out.glb]
import { load, normalise, dropLoose, copyClip, makeClip, finish, duration, fastest, bounds, X, Y, Z, bump, ramp , dropClip } from './lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/worm/model.glb', OUT = new URL('../../../src/assets/creatures/worm.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const doc = await load(SRC);
dropLoose(doc);
const A = Object.fromEntries(doc.getRoot().listAnimations().map((a) => [a.getName(), a]));
// reared up it stands a little over two metres
normalise(doc, { height: 2.4, anim: A.Idle, t: 0 });
const clip = (src, name, o = {}) => copyClip(doc, A[src], name, o);
clip('Idle', 'idle', { loop: true });
clip('WALK', 'walk', { loop: true });
clip('RUN', 'run', { loop: true });
const atk = clip('ATTACK', 'attack');
clip('ATTACK', 'attack2', { speed: 1.2 });
clip('ATTACK', 'bite');
clip('WOUND_1', 'hit');
clip('DEATH', 'die');
clip('ATTACK', 'spit', { speed: 0.9 });
for (const a of Object.values(A)) dropClip(a);
const b = bounds(doc, null, 0);
const head = doc.getRoot().listNodes().filter((n) => /^Bone\.0(19|18)/.test(n.getName()))[0]?.getName();
const hitT = head ? fastest(doc, atk, head) : 0.35;
const bytes = await finish(doc, OUT, {
  hit: { attack: hitT, attack2: +(hitT / 1.2).toFixed(3), bite: hitT, spit: +(hitT / 0.9).toFixed(3) },
  height: +(b.max.y - b.min.y).toFixed(2), walkSpeed: 1.6, runSpeed: 3.8,
  credit: '"Worm Monster" by CR!STALLL (sketchfab.com/CR1STALLL), CC-BY 4.0 - rescaled and re-encoded for Skotos', license: 'CC-BY-4.0'
}, { base: 512, aux: 256 });
console.log('worm', (bytes / 1024).toFixed(0) + ' KB', 'hit', hitT, 'head', head, 'size', b.getSize(new (await import('three')).Vector3()).toArray().map((x) => x.toFixed(2)).join('x'));
