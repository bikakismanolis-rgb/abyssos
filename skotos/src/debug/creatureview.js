// Creature viewer for screenshots: ?cview&only=goblin,troll&clip=attack&t=0.5&weapon=sword (t defaults to the strike)
import * as THREE from 'three';
import { initGfx, R, setAtmosphere, frame, render, updateCamera, addLight } from '../gfx/gfx.js';
import { tex } from '../gfx/textures.js';
import { Avatar } from '../gfx/anim.js';
import { loadCreatures, hasCreature, creatureModel } from '../gfx/creatures.js';
import { loadPeople, personModel } from '../gfx/people.js';

export async function startCreatureView(q) {
  if (q.get('tilt')) { const [ax, a] = q.get('tilt').split(','); window.__tilt = [ax, +a]; }
  initGfx(2);
  setAtmosphere({ fog: 0x0a0d12, density: 0.01, sky: 0x6070a0, ground: 0x2a2018, hemi: 1.2, moon: 0xb0c4ff, moonI: 1.6, exposure: 1.2, heroI: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ map: tex('grass') }));
  ground.material.map.repeat.set(20, 20); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; R.scene.add(ground);
  await Promise.all([loadCreatures(), loadPeople()]);
  const list = (q.get('only') || 'goblin,goblinArcher,skeleton,warg,troll,spider,ash,wraith,barrowLord').split(',').filter(hasCreature);
  const clips = q.get('clips') ? q.get('clips').split(',') : null;
  // ts=0.1,0.5,0.9: frames of one clip side by side
  const ts = q.get('ts') ? q.get('ts').split(',').map(Number) : null;
  const items = ts ? ts.map((t) => [list[0], q.get('clip'), t]) : clips ? clips.map((c) => [list[0], c]) : list.map((m) => [m, q.get('clip')]);
  if (q.has('ref')) items.unshift(['ref', null]);
  const W = { goblin: 'dagger', goblinArcher: 'crossbow', goblinShaman: 'staffSkull', skeleton: 'sword', skeletonArcher: 'crossbow', ash: 'cleaver', troll: 'club', barrowLord: 'greatsword' };
  const gap = +(q.get('gap') || 2.6), avs = [];
  items.forEach(([m, clip, ft], i) => {
    const a = m === 'ref' ? new Avatar(personModel('warden'), { style: 'sword' }) : new Avatar(creatureModel(m), { style: 'none' });
    if (m !== 'ref' && q.get('weapon') !== 'none' && (q.get('weapon') || W[m])) a.hold('R', q.get('weapon') || W[m], {});
    a.group.position.set((i - (items.length - 1) / 2) * gap, 0, 0);
    a.group.rotation.y = +(q.get('rot') || 0.5);
    if (m !== 'ref' && q.get('scale')) a.group.scale.setScalar(+q.get('scale')); // as the game sizes it (look.scale)
    R.scene.add(a.group); avs.push(a);
    let d = 1, at = ft ?? +(q.get('t') || 0);
    if (clip) { d = a.play(clip, 1) || 1; if (!q.get('t') && ft == null) at = a.anim.hitAt?.(clip) ?? 0.5; }
    const steps = 20, dur = d * at + (clip ? 0 : 0.6);
    for (let k = 0; k < steps; k++) a.update(dur / steps, { speed: +(q.get('speed') || 0), runSpeed: 5 });
    a.label = (m === 'ref' ? 'warden 1.8m' : m) + (clip ? ' · ' + clip : '') + (ft != null ? ' @' + ft : '');
  });
  addLight({ x: 0, y: 4, z: 4, color: 0xffa860, intensity: 50, range: 24 });
  R.cam.dist = +(q.get('dist') || items.length * gap * 0.75 + 4); R.cam.pitch = +(q.get('pitch') || 0.3); R.cam.lookY = +(q.get('lookY') || 1);
  updateCamera(0, 0, 0, true);
  const lay = document.createElement('div'); lay.style.cssText = 'position:fixed;inset:0;pointer-events:none;font:600 13px sans-serif;color:#fff;text-shadow:0 1px 2px #000'; document.body.appendChild(lay);
  let n = 0;
  (function loop() {
    frame(0.016); updateCamera(0.016, 0, 0, true); render();
    if (++n === 4) {
      for (const a of avs) { const v = a.group.position.clone(); v.y = -0.15; v.project(R.camera); const d = document.createElement('div'); d.textContent = a.label; d.style.cssText = `position:absolute;left:${(v.x * 0.5 + 0.5) * innerWidth}px;top:${(-v.y * 0.5 + 0.5) * innerHeight}px;transform:translate(-50%,0)`; lay.appendChild(d); }
      window.__ready = true;
    }
    if (n < 8) requestAnimationFrame(loop);
  })();
}
