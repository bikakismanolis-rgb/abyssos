// Deep bat: "Bat" by matisosanimation (sketchfab.com/matisosanimation), CC-BY 4.0 -> src/assets/creatures/bat.glb
// One flapping loop in the source; the rest are made from it: a faster beat to bite, a stalled beat when hit,
// and a death where the wings fold and the body tumbles.
import { load, normalise, dropLoose, copyClip, makeClip, finish, bounds, byName, X, Y, Z, bump, ramp, smooth, dropClip, THREE } from './lib.mjs';
const [SRC = '/tmp/claude-0/sf/models/bat/model.glb', OUT = new URL('../../../src/assets/creatures/bat.glb', import.meta.url).pathname] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const doc = await load(SRC);
dropLoose(doc, /Eye/);
const flap = doc.getRoot().listAnimations().find((a) => a.getName() === 'flapping');
// a big cave bat: about 1.1 m across the wings, the body hanging at the origin (the game flies it at head height).
// The source faces +X with its wings along Z: a -90 degree yaw turns the head to +Z and spreads the wings along X,
// which is also the frame the procedural keys below are written in (X = wing axis, Z = forward).
normalise(doc, { height: 0.8, anim: flap, t: 0.3, yaw: -Math.PI / 2 });
const names = doc.getRoot().listNodes().map((n) => n.getName());
const find = (re) => names.find((n) => re.test(n));
const chest = find(/^Chest/), elbowL = find(/^Elbow_L/), elbowR = find(/^Elbow_R/), clavL = find(/^Clavicle_L/), clavR = find(/^Clavicle_R/), head = find(/^Haed|^Head/);
copyClip(doc, flap, 'idle', { loop: true });
copyClip(doc, flap, 'walk', { loop: true });
copyClip(doc, flap, 'run', { loop: true, speed: 1.4 });
copyClip(doc, flap, 'attack', { speed: 1.6, keys: (t, d) => ({ [chest]: [[X, 25 * bump(t, 0, d)]], [head]: [[X, 20 * bump(t, 0.1 * d, 0.7 * d)]] }) });
copyClip(doc, flap, 'bite', { speed: 1.6, keys: (t, d) => ({ [chest]: [[X, 25 * bump(t, 0, d)]], [head]: [[X, 20 * bump(t, 0.1 * d, 0.7 * d)]] }) });
copyClip(doc, flap, 'hit', { to: 0.4, speed: 0.6, keys: (t, d) => ({ [chest]: [[X, -20 * bump(t, 0, d)]] }) });
// die: the wings fold in and the bat falls back onto its back, rolled a little to one side. The game drops a dying bat
// to the ground in its first ~0.25 s, so the body is lifted to rest on y = 0 and slid over the actor's spot as it falls.
const hip = find(/^Hip_\d/);
const dieO = {
  dur: 1.2, base: flap, baseAt: (t) => t * 0.25, rootNode: hip,
  keys: (t, d) => {
    const f = smooth(t / d);
    return { [chest]: [[X, 25 * f]], [clavL]: [[Z, -50 * f]], [clavR]: [[Z, 50 * f]], [elbowL]: [[Y, 60 * f]], [elbowR]: [[Y, -60 * f]] };
  }
};
const fall = (t, d) => { const f = smooth(t / (0.75 * d)); return [[X, -80 * f], [Z, 25 * f]]; };
const trial = makeClip(doc, 'die_trial', { ...dieO, root: (t, d) => ({ r: fall(t, d) }) });
const low = [], dieN = Math.round(dieO.dur * 30);
for (let i = 0; i <= dieN; i++) low.push(bounds(doc, trial, Math.min(dieO.dur, i / 30)).min.y);
const endC = bounds(doc, trial, dieO.dur).getCenter(new THREE.Vector3());
dropClip(trial);
makeClip(doc, 'die', { ...dieO, root: (t, d) => {
  const f = smooth(t / (0.75 * d)), g = ramp(t, 0, 0.3);
  return { p: [-endC.x * f, -low[Math.round(t * 30)] * g, -endC.z * f], r: fall(t, d) };
} });
dropClip(flap);
const b = bounds(doc, null, 0);
const bytes = await finish(doc, OUT, {
  hit: { attack: 0.22, bite: 0.22 }, height: +(b.max.y - b.min.y).toFixed(2), walkSpeed: 2, runSpeed: 6,
  credit: '"Bat" by matisosanimation (sketchfab.com/matisosanimation), CC-BY 4.0 - rescaled, extra clips made for Skotos', license: 'CC-BY-4.0'
}, { base: 512, aux: 256 });
console.log('bat', (bytes / 1024).toFixed(0) + ' KB', { chest, elbowL, clavL, head });
