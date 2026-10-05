// Deep bat: "Bat" by matisosanimation (sketchfab.com/matisosanimation), CC-BY 4.0 -> src/assets/creatures/bat.glb
// One flapping loop in the source; the rest are made from it: a faster beat to bite, a stalled beat when hit,
// and a death where the wings fold and the body tumbles.
import { load, normalise, dropLoose, copyClip, makeClip, finish, bounds, byName, X, Y, Z, bump, ramp, smooth , dropClip } from './lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/bat/model.glb', OUT = new URL('../../../src/assets/creatures/bat.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const doc = await load(SRC);
dropLoose(doc, /Eye/);
const flap = doc.getRoot().listAnimations().find((a) => a.getName() === 'flapping');
// a big cave bat: about 1.1 m across the wings, the body hanging at the origin (the game flies it at head height)
normalise(doc, { height: 0.8, anim: flap, t: 0.3 });
const names = doc.getRoot().listNodes().map((n) => n.getName());
const find = (re) => names.find((n) => re.test(n));
const chest = find(/^Chest/), elbowL = find(/^Elbow_L/), elbowR = find(/^Elbow_R/), clavL = find(/^Clavicle_L/), clavR = find(/^Clavicle_R/), head = find(/^Haed|^Head/);
copyClip(doc, flap, 'idle', { loop: true });
copyClip(doc, flap, 'walk', { loop: true });
copyClip(doc, flap, 'run', { loop: true, speed: 1.4 });
copyClip(doc, flap, 'attack', { speed: 1.6, keys: (t, d) => ({ [chest]: [[X, 25 * bump(t, 0, d)]], [head]: [[X, 20 * bump(t, 0.1 * d, 0.7 * d)]] }) });
copyClip(doc, flap, 'bite', { speed: 1.6, keys: (t, d) => ({ [chest]: [[X, 25 * bump(t, 0, d)]], [head]: [[X, 20 * bump(t, 0.1 * d, 0.7 * d)]] }) });
copyClip(doc, flap, 'hit', { to: 0.4, speed: 0.6, keys: (t, d) => ({ [chest]: [[X, -20 * bump(t, 0, d)]] }) });
// die: wings fold in, the body rolls over and drops (the game lowers it to the ground)
copyClip(doc, flap, 'die', { to: 0.3, speed: 0.25, keys: (t, d) => {
  const f = smooth(t / d);
  return { [chest]: [[Z, 140 * f], [X, 30 * f]], [clavL]: [[Z, -50 * f]], [clavR]: [[Z, 50 * f]], [elbowL]: [[Y, 60 * f]], [elbowR]: [[Y, -60 * f]] };
} });
dropClip(flap);
const b = bounds(doc, null, 0);
const bytes = await finish(doc, OUT, {
  hit: { attack: 0.22, bite: 0.22 }, height: +(b.max.y - b.min.y).toFixed(2), walkSpeed: 2, runSpeed: 6,
  credit: '"Bat" by matisosanimation (sketchfab.com/matisosanimation), CC-BY 4.0 - rescaled, extra clips made for Skotos', license: 'CC-BY-4.0'
}, { base: 512, aux: 256 });
console.log('bat', (bytes / 1024).toFixed(0) + ' KB', { chest, elbowL, clavL, head });
