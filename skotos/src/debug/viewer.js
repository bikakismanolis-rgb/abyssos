// Model and animation viewer for screenshots: ?viewer&clip=slash1&t=0.5&speed=0&cam=front
import * as THREE from 'three';
import { initGfx, R, setAtmosphere, frame, render, updateCamera, addLight } from '../gfx/gfx.js';
import { tex } from '../gfx/textures.js';
import * as M from '../gfx/models.js';
import { Avatar } from '../gfx/anim.js';
import { loadPeople, personModel } from '../gfx/people.js';

// people: ?viewer&only=p:warden,p:ranger (realistic characters), grip tests with &grip=X,1.57,Y,0
export async function startViewer(q) {
  if (q.get('tilt')) { const [ax, a] = q.get('tilt').split(','); window.__tilt = [ax, +a]; }
  if (q.get('grip')) { const g = q.get('grip').split(','); window.__grip = [g[0], +g[1], g[2], +g[3]]; }
  initGfx(2);
  setAtmosphere({ fog: 0x0a0d12, density: 0.012, sky: 0x6070a0, ground: 0x2a2018, hemi: 1.2, moon: 0xb0c4ff, moonI: 1.6, exposure: 1.2, heroI: 0 });
  const env = new THREE.PMREMGenerator(R.renderer);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ map: tex('grass') }));
  ground.material.map.repeat.set(20, 20);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; R.scene.add(ground);
  const list = (q.get('only') || 'warden,ranger,mage,goblin,goblinA,shaman,ash,skeleton,wraith,troll,warg,spider,weaver,lord,wayfarer,smith,healer,villager').split(',');
  const make = {
    warden: () => { const a = new Avatar(M.buildWarden(), { style: 'sword' }); a.hold('R', 'sword', {}); a.hold('S', 'shield', {}); return a; },
    ranger: () => { const a = new Avatar(M.buildRanger(), { style: 'bow' }); a.hold('R', 'crossbow', {}); return a; },
    mage: () => { const a = new Avatar(M.buildMage(), { style: 'staff' }); a.hold('R', 'staff', {}); return a; },
    goblin: () => { const a = new Avatar(M.buildGoblin(), { style: 'sword', hunch: 0.25 }); a.hold('R', 'dagger', {}); return a; },
    goblinA: () => { const a = new Avatar(M.buildGoblin('archer'), { style: 'bow', hunch: 0.2 }); a.hold('R', 'crossbow', { wood: 0x3a2a1a }); return a; },
    shaman: () => { const a = new Avatar(M.buildGoblin('shaman'), { style: 'staff', hunch: 0.25 }); a.hold('R', 'staffSkull', {}); return a; },
    ash: () => { const a = new Avatar(M.buildAshspawn(), { style: 'heavy', hunch: 0.15 }); a.hold('R', 'cleaver', {}); return a; },
    skeleton: () => { const a = new Avatar(M.buildSkeleton(), { style: 'sword' }); a.hold('R', 'sword', { blade: 0x6a6052, len: 0.8 }); return a; },
    wraith: () => { const a = new Avatar(M.buildWraith(), { style: 'claw' }); return a; },
    troll: () => { const a = new Avatar(M.buildTroll(), { style: 'heavy', hunch: 0.25 }); a.hold('R', 'club', {}); return a; },
    warg: () => new Avatar(M.buildWarg()),
    spider: () => new Avatar(M.buildSpider(1)),
    weaver: () => new Avatar(M.buildSpider(2.4, true)),
    lord: () => { const a = new Avatar(M.buildWraith(1.45, true), { style: 'sword' }); a.hold('R', 'greatsword', { blade: 0x9ad0ff, glow: 0.6 }); return a; },
    wayfarer: () => { const a = new Avatar(M.buildWayfarer(), { style: 'staff' }); a.hold('R', 'lanternStaff', {}); return a; },
    smith: () => { const a = new Avatar(M.buildSmith(), { style: 'none' }); a.hold('R', 'hammer', {}); return a; },
    healer: () => new Avatar(M.buildHealer()),
    villager: () => new Avatar(M.buildVillager(1)),
    'p:warden': () => { const a = new Avatar(personModel('warden'), { style: 'sword' }); a.hold('R', 'sword', {}); a.hold('S', 'shield', {}); return a; },
    'p:ranger': () => { const a = new Avatar(personModel('ranger'), { style: 'bow' }); a.hold('R', 'crossbow', {}); return a; },
    'p:mage': () => { const a = new Avatar(personModel('mage'), { style: 'staff' }); a.hold('R', 'staff', {}); return a; },
    'p:wayfarer': () => { const a = new Avatar(personModel('wayfarer'), { style: 'staff', animSet: 'npc' }); a.hold('R', 'lanternStaff', {}); return a; },
    'p:smith': () => { const a = new Avatar(personModel('smith'), { style: 'none', animSet: 'npc' }); a.hold('R', 'hammer', {}); return a; },
    'p:healer': () => new Avatar(personModel('healer'), { animSet: 'npc' }),
    'p:villager0': () => new Avatar(personModel('villager0'), { animSet: 'npc' }),
    'p:villager1': () => new Avatar(personModel('villager1'), { animSet: 'npc' }),
    'p:villager2': () => new Avatar(personModel('villager2'), { animSet: 'npc' })
  };
  if (list.some((n) => n.startsWith('p:'))) await loadPeople();
  // &sheet=slash1,slash2,...: one copy of the first model per clip, each posed at the clip's strike (or &t)
  const sheet = q.get('sheet') ? q.get('sheet').split(',') : null;
  if (sheet) { const m = list[0]; list.length = 0; for (const c of sheet) list.push(m); }
  const avs = [];
  const cols = Math.ceil(Math.sqrt(list.length * 1.6));
  const gap = +(q.get('gap') || 2.4);
  list.forEach((n, i) => {
    const a = make[n](); const c = i % cols, r = Math.floor(i / cols);
    a.group.position.set((c - (cols - 1) / 2) * gap, 0, (r - 1) * gap);
    a.group.rotation.y = +(q.get('rot') || 0.5);
    R.scene.add(a.group); avs.push(a);
    if (a.kind === 'wraith') a.float = true;
  });
  addLight({ x: 0, y: 3, z: 3, color: 0xffa860, intensity: 40, range: 20 });
  const clip = q.get('clip'), t = +(q.get('t') || 0), speed = +(q.get('speed') || 0);
  // advance animation to a fixed time
  avs.forEach((a, i) => {
    let d = 1;
    const c = sheet ? sheet[i] : clip;
    if (c) d = a.play(a.kind === 'warg' || a.kind === 'spider' ? (q.get('qclip') || 'bite') : c) || a.anim.adur || 0.5;
    const at = sheet && !q.get('t') ? (a.anim.hitAt?.(c) ?? 0.5) : t;
    if (sheet) a.label = c;
    const steps = 30, dur = d * at + (c ? 0 : 0.5);
    for (let i = 0; i < steps; i++) a.update(dur / steps, { speed, runSpeed: 5, float: a.float });
  });
  // labels for clip sheets
  if (sheet) {
    const lay = document.createElement('div'); lay.style.cssText = 'position:fixed;inset:0;pointer-events:none;font:600 13px sans-serif;color:#fff;text-shadow:0 1px 2px #000';
    document.body.appendChild(lay);
    window.__labels = () => { lay.innerHTML = ''; for (const a of avs) { const v = a.group.position.clone(); v.y = 2.05; v.project(R.camera); const d = document.createElement('div'); d.textContent = a.label; d.style.cssText = `position:absolute;left:${(v.x * 0.5 + 0.5) * innerWidth}px;top:${(-v.y * 0.5 + 0.5) * innerHeight}px;transform:translate(-50%,-50%)`; lay.appendChild(d); } };
  }
  const camMode = q.get('cam') || 'game';
  const span = cols * gap;
  R.cam.dist = +(q.get('dist') || span * 0.9 + 4);
  if (camMode === 'front') R.cam.pitch = 0.25;
  if (q.get('pitch')) R.cam.pitch = +q.get('pitch');
  R.cam.lookY = 0.9;
  updateCamera(0, 0, +(q.get('cz') || 0), true);
  let n = 0;
  function loop() {
    frame(0.016); updateCamera(0.016, 0, +(q.get('cz') || 0), true); render();
    if (++n > 3) { window.__labels?.(); window.__labels = null; window.__ready = true; }
    // software rendering is slow: stop once the still frame is up
    if (n < 8 || q.has('live')) requestAnimationFrame(loop);
  }
  loop();
}

// ?world=crypt|forest|town&seed=3&x=..&z=..&dist=..
export async function startWorld(q) {
  const { genForest, genCrypt, genTown } = await import('../world/gen.js');
  const { buildLevel } = await import('../world/build.js');
  const { loadKits } = await import('../gfx/kits.js');
  const { ATMOS } = await import('../world/atmos.js');
  initGfx(+(q.get('q') || 2));
  await loadKits(['dungeon', 'grave', 'town']);
  const type = q.get('world'), seed = +(q.get('seed') || 3);
  const L = type === 'crypt' ? genCrypt(seed) : type === 'town' ? genTown() : genForest(seed);
  setAtmosphere(ATMOS[type]);
  const lvl = buildLevel(L, R.quality);
  R.scene.add(lvl.group);
  for (const l of L.lights) addLight(l);
  const x = +(q.get('x') || L.start.x), z = +(q.get('z') || L.start.z);
  const hero = new Avatar(M.buildWarden(), { style: 'sword' }); hero.hold('R', 'sword', {}); hero.hold('L', 'shield', {});
  hero.group.position.set(x, 0, z); hero.group.rotation.y = Math.PI; R.scene.add(hero.group);
  if (q.get('dist')) R.cam.dist = +q.get('dist');
  if (q.get('pitch')) R.cam.pitch = +q.get('pitch');
  R.heroLight.position.set(x, 2.6, z);
  let n = 0;
  function loop() {
    frame(0.016); hero.update(0.016, { speed: 0 }); updateCamera(0.016, x, z, true);
    R.heroLight.position.set(x, 2.6, z); R.heroLight.intensity = R.heroLight.userData.base;
    if (lvl.walls) lvl.walls.update(0.1, x, z);
    render();
    if (++n > 5) window.__ready = true;
    requestAnimationFrame(loop);
  }
  loop();
}
