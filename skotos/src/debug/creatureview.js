// Creature viewer for screenshots: ?cview&only=goblin,troll&clip=attack&t=0.5&weapon=sword (t defaults to the strike)
import * as THREE from 'three';
import { initGfx, R, setAtmosphere, frame, render, updateCamera, addLight } from '../gfx/gfx.js';
import { tex } from '../gfx/textures.js';
import { Avatar } from '../gfx/anim.js';
import { loadCreatures, hasCreature, creatureModel } from '../gfx/creatures.js';
import { loadPeople, loadFolk, personModel } from '../gfx/people.js';

export async function startCreatureView(q) {
  if (q.get('tilt')) { const [ax, a] = q.get('tilt').split(','); window.__tilt = [ax, +a]; }
  initGfx(2);
  // &lit=day: grey overcast daylight, no warm lamp (to judge colours); &lit=coast: the Frozen Coast's cold light (as the people viewer)
  const lit = { day: { fog: 0x8a96a4, density: 0.004, sky: 0xd8e0ea, ground: 0x6a6660, hemi: 1.5, moon: 0xfff6ea, moonI: 2.0, exposure: 1.0, heroI: 0 },
    coast: { fog: 0x5a6a80, density: 0.008, sky: 0xa8c0dc, ground: 0x3a4048, hemi: 1.3, moon: 0xdce8ff, moonI: 1.8, exposure: 1.05, heroI: 0 } }[q.get('lit')];
  setAtmosphere(lit || { fog: 0x0a0d12, density: 0.01, sky: 0x6070a0, ground: 0x2a2018, hemi: 1.2, moon: 0xb0c4ff, moonI: 1.6, exposure: 1.2, heroI: 0 });
  // &sea: a dark sea for the ground (the Skotos and its Hands stand in water)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), q.has('sea') ? new THREE.MeshStandardMaterial({ color: 0x0a1822, roughness: 0.3, metalness: 0.2 }) : new THREE.MeshLambertMaterial({ map: tex('grass') }));
  if (!q.has('sea')) ground.material.map.repeat.set(20, 20);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; R.scene.add(ground);
  await Promise.all([loadCreatures(), loadPeople()]);
  const list = (q.get('only') || 'goblin,goblinArcher,skeleton,warg,troll,spider,ash,wraith,barrowLord').split(',').filter(hasCreature);
  // &audit: numbers instead of a picture (window.__audit); &clips=all: one copy per clip of the first creature
  if (q.has('audit')) { window.__audit = list.map(audit); window.__ready = true; return; }
  const clips = q.get('clips') === 'all' ? Object.keys(creatureModel(list[0]).tpl.clips) : q.get('clips') ? q.get('clips').split(',') : null;
  // ts=0.1,0.5,0.9: frames of one clip side by side
  const ts = q.get('ts') ? q.get('ts').split(',').map(Number) : null;
  const items = ts ? ts.map((t) => [list[0], q.get('clip'), t]) : clips ? clips.map((c) => [list[0], c]) : list.map((m) => [m, q.get('clip')]);
  if (q.has('ref')) items.unshift(['ref', null]);
  // &folk=frost:sunken,alkyone: people of a set in the same row (the set loads through people.js, as the game loads it)
  if (q.get('folk')) { const [set, names] = q.get('folk').split(':'); await loadFolk(set); for (const n of names.split(',')) items.push(['p:' + n, null]); }
  const W = { goblin: 'dagger', goblinArcher: 'crossbow', goblinShaman: 'staffSkull', skeleton: 'sword', skeletonArcher: 'crossbow', ash: 'cleaver', troll: 'club', barrowLord: 'greatsword' };
  const gap = +(q.get('gap') || 2.6), avs = [];
  // &skin: the Skotos's skin (sea.js skotosSkin, as the game patches keepMat creatures), &rough= its roughness, &aur= the aurora
  const S = q.has('skin') ? await import('../world/sea.js') : null;
  if (S) { S.SEA.uAur.value = +(q.get('aur') ?? 0.7); S.SEA.uAurDark.value = 0; }
  items.forEach(([m, clip, ft], i) => {
    const a = m === 'ref' ? new Avatar(personModel('warden'), { style: 'sword' }) : m.startsWith('p:') ? new Avatar(personModel(m.slice(2)), { animSet: 'npc' }) : new Avatar(creatureModel(m), { style: 'none' });
    if (m !== 'ref' && q.get('weapon') !== 'none' && (q.get('weapon') || W[m])) a.hold('R', q.get('weapon') || W[m], {});
    a.group.position.set((i - (items.length - 1) / 2) * gap, 0, 0);
    a.group.rotation.y = q.get('rots') ? +q.get('rots').split(',')[i % q.get('rots').split(',').length] : +(q.get('rot') || 0.5); // &rots=0,1.57: one turn per item
    if (m !== 'ref' && q.get('scale')) a.group.scale.setScalar(+q.get('scale')); // as the game sizes it (look.scale)
    // one value per item (the ref counts, '-' skips): &scales=1.3,1.12 look.scale, &tints=f4f2ec:2.15,- look.tint:tintAmt, &rims=d8f0ff:0.3,-
    const per = (k) => { const v = q.get(k)?.split(',')[i]; return v && v !== '-' ? v.split(':') : null; };
    if (m !== 'ref') {
      const s = per('scales'), t = per('tints'), r = per('rims');
      if (s) a.group.scale.setScalar(+s[0]);
      if (t) a.setTint(parseInt(t[0], 16), +(t[1] ?? 0.3));
      if (r) a.setRim(parseInt(r[0], 16), +(r[1] ?? 0.6));
    }
    if (m !== 'ref' && q.get('y')) a.group.position.y = +q.get('y'); // how deep it stands (the Skotos: a.y -3)
    if (m !== 'ref' && q.get('z')) a.group.position.z = +q.get('z'); // how far off (the Skotos stands out in the sea)
    // (the Skotos's hood void, 'skotos_void', keeps its own black fully rough material, unpatched)
    if (S && m !== 'ref') for (const mt of a.model.mats || []) if (!/_void$/.test(mt.name)) { S.skotosSkin(mt); mt.roughness = +(q.get('rough') || 0.26); mt.envMapIntensity = 1; }
    R.scene.add(a.group); avs.push(a);
    let d = 1, at = ft ?? +(q.get('t') || 0);
    if (clip) { d = a.play(clip, 1) || 1; if (!q.get('t') && ft == null) at = a.anim.hitAt?.(clip) ?? 0.5; }
    const steps = 20, dur = d * at + (clip ? 0 : 0.6);
    for (let k = 0; k < steps; k++) a.update(dur / steps, { speed: +(q.get('speed') || 0), runSpeed: 5 });
    a.label = (m === 'ref' ? 'warden 1.8m' : m) + (clip ? ' · ' + clip : '') + (ft != null ? ' @' + ft : '');
  });
  if (!lit) addLight({ x: 0, y: 4, z: 4, color: 0xffa860, intensity: 50, range: 24 }); else R.heroLight.intensity = 0;
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

// every clip of a creature at x1 sampled at 9 moments: its world bounds (feet on y = 0, height, length), how far its
// centre drifts (clips play in place), how far its bones turn from the first moment (a clip that never moves is
// suspect), tracks whose node is missing, and NaNs
function audit(m) {
  const mdl = creatureModel(m), root = mdl.mesh, T = mdl.tpl;
  const out = { key: m, height: T.height, extent: T.extent, walkSpeed: T.walkSpeed, runSpeed: T.runSpeed, hit: T.hit, clips: {} };
  const meshes = [], bones = [];
  root.traverse((o) => { if (o.isMesh) meshes.push(o); if (o.isBone) bones.push(o); });
  out.bones = bones.length; out.meshes = meshes.length;
  const box = new THREE.Box3(), b = new THREE.Box3(), c = new THREE.Vector3(), sz = new THREE.Vector3();
  const mixer = new THREE.AnimationMixer(root);
  for (const name in T.clips) {
    const clip = T.clips[name];
    mixer.stopAllAction();
    const act = mixer.clipAction(clip); act.reset().play();
    const unbound = clip.tracks.filter((t) => !root.getObjectByName(THREE.PropertyBinding.parseTrackName(t.name).nodeName)).length;
    const r = { dur: +clip.duration.toFixed(2), tracks: clip.tracks.length, unbound, minY: [], maxY: [], w: 0, l: 0, drift: 0, turn: 0, nan: false };
    let q0 = null, c0 = null;
    for (let k = 0; k <= 8; k++) {
      mixer.setTime(clip.duration * (k / 8) * 0.999); root.updateMatrixWorld(true);
      box.makeEmpty();
      for (const me of meshes) { if (me.isSkinnedMesh) { me.computeBoundingBox(); b.copy(me.boundingBox).applyMatrix4(me.matrixWorld); } else b.setFromObject(me); box.union(b); }
      if (![box.min.x, box.min.y, box.max.y, box.max.z].every(Number.isFinite)) { r.nan = true; continue; }
      r.minY.push(+box.min.y.toFixed(3)); r.maxY.push(+box.max.y.toFixed(3));
      box.getCenter(c); box.getSize(sz);
      if (!c0) c0 = c.clone(); r.drift = Math.max(r.drift, +Math.hypot(c.x - c0.x, c.z - c0.z).toFixed(3));
      r.w = Math.max(r.w, +sz.x.toFixed(3)); r.l = Math.max(r.l, +sz.z.toFixed(3));
      const qs = bones.map((bn) => bn.quaternion.clone());
      if (!q0) q0 = qs; else r.turn = Math.max(r.turn, +Math.max(0, ...qs.map((qq, i) => qq.angleTo(q0[i]))).toFixed(3));
    }
    act.stop();
    out.clips[name] = r;
  }
  return out;
}
