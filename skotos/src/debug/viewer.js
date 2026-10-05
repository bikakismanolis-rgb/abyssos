// Model and animation viewer for screenshots: ?viewer&clip=slash1&t=0.5&speed=0&cam=front
import * as THREE from 'three';
import { initGfx, R, setAtmosphere, frame, render, updateCamera, addLight } from '../gfx/gfx.js';
import { tex } from '../gfx/textures.js';
import * as M from '../gfx/models.js';
import { Avatar } from '../gfx/anim.js';
import { loadPeople, loadFolk, personModel } from '../gfx/people.js';

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
    'p:villager2': () => new Avatar(personModel('villager2'), { animSet: 'npc' }),
    'p:stoneborn': () => { const a = new Avatar(personModel('stoneborn'), { style: 'sword' }); a.hold('R', 'axe', {}); a.hold('L', 'shield', { face: 0x3a2a24, rim: 0x8a6a3a, emblem: 0xb07a30, r: 0.3 }); return a; },
    'p:stonebornArb': () => { const a = new Avatar(personModel('stonebornArb'), { style: 'bow' }); a.hold('R', 'crossbow', {}); return a; },
    'p:runepriest': () => { const a = new Avatar(personModel('runepriest'), { style: 'staff' }); a.hold('R', 'staff', { gem: 0xff8a30, wood: 0x3a3028 }); return a; },
    'p:moltenKing': () => { const a = new Avatar(personModel('moltenKing'), { style: 'heavy' }); a.hold('R', 'hammer', { head: 0x2a2220, glow: 0.9, rune: 0xff6a10 }); return a; },
    'p:brokka': () => { const a = new Avatar(personModel('brokka'), { style: 'none', animSet: 'npc' }); a.hold('R', 'hammer', {}); return a; },
    // Act III's Evergreen (grove.glb); weapons are stand-ins until the game's spear exists
    'p:elati': () => { const a = new Avatar(personModel('elati'), { style: 'bow', animSet: 'npc' }); a.hold('R', 'bow', {}); return a; },
    'p:linden': () => new Avatar(personModel('linden'), { animSet: 'npc' }),
    'p:rootsworn': () => { const a = new Avatar(personModel('rootsworn'), { style: 'heavy' }); a.hold('R', 'spear', {}); return a; },
    'p:rootswornArcher': () => { const a = new Avatar(personModel('rootswornArcher'), { style: 'bow' }); a.hold('R', 'bow', {}); return a; },
    'p:hollowed': () => new Avatar(personModel('hollowed'), { style: 'undead', hunch: 0.15 }),
    'p:mourner': () => new Avatar(personModel('mourner'), { style: 'staff' }),
    'p:amaranthe': () => { const a = new Avatar(personModel('amaranthe'), { style: 'heavy' }); a.hold('R', 'spear', {}); return a; }
  };
  if (list.some((n) => n.startsWith('p:'))) await loadPeople();
  if (list.some((n) => /^p:(stoneborn|runepriest|brokka|moltenKing)/.test(n))) await loadFolk();
  if (list.some((n) => /^p:(elati|linden|rootsworn|hollowed|mourner|amaranthe)/.test(n))) await loadFolk('grove');
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
  if (q.get('zoom')) R.cam.zoomT = R.cam.zoom = +q.get('zoom');
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

// ?world=crypt|forest|town|pass|halls|weep|heart&seed=3&x=..&z=..&dist=..&at=..
// Act III: &at=glade|mere|boss|gate|lantern|deer|island|heart|thorns|chamber&n=..; &autumn=1 the First Autumn; &wind=1;
// &live keeps rendering (otherwise it stops once FX have warmed up, which keeps software-rendered screenshots quick)
export async function startWorld(q) {
  const { genForest, genCrypt, genTown } = await import('../world/gen.js');
  const { genPass, genHalls } = await import('../world/gen2.js');
  const { genWeep, genHeart } = await import('../world/gen3.js');
  const { buildLevel, WIND, act3Prop, setAutumn } = await import('../world/build.js');
  const { loadKits } = await import('../gfx/kits.js');
  const { loadEnv, loadPack } = await import('../gfx/env.js');
  const { loadCreatures } = await import('../gfx/creatures.js');
  const { ATMOS } = await import('../world/atmos.js');
  initGfx(+(q.get('q') || 2));
  await Promise.all([loadKits(['dungeon', 'grave', 'town']), q.has('noenv') ? null : loadEnv(R.quality)]);
  const type = q.get('world'), seed = +(q.get('seed') || 3), act3 = type === 'weep' || type === 'heart';
  if (type === 'pass' || type === 'halls') await loadPack('deep');
  if (act3) await Promise.all([loadPack('wood'), loadCreatures(), loadFolk('grove')]);
  if (R.quality >= 1) await loadPack('trees');
  if (!q.has('nohouses')) await loadPack('village');
  if (type === 'pass') WIND.uSnow.value = 1;
  const L = type === 'crypt' ? genCrypt(seed) : type === 'town' ? genTown() : type === 'pass' ? genPass(seed) : type === 'halls' ? genHalls(seed)
    : type === 'weep' ? genWeep(seed) : type === 'heart' ? genHeart(seed) : genForest(seed);
  const autumn = q.get('autumn') === '1';
  setAtmosphere(ATMOS[act3 && autumn ? type + 'Autumn' : type]);
  if (act3) { WIND.uWind.value = autumn || q.has('wind') ? 1 : 0; setAutumn(autumn ? 1 : 0); }
  if (q.has('nofog')) { R.scene.fog.density = 0; R.camera.far = 600; R.camera.updateProjectionMatrix(); R.hemi.intensity *= 1.6; }
  const lvl = buildLevel(L, R.quality);
  R.scene.add(lvl.group);
  for (const l of L.lights) addLight(l);
  // the Act III props the story places
  if (act3) {
    const put = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; R.scene.add(o); return o; };
    for (const t of L.spots.tears || []) put(act3Prop('tear', t), t.x, t.z, t.r || 0);
    if (L.spots.deer) put(act3Prop('deer', { r: L.spots.deer.r }), L.spots.deer.x, L.spots.deer.z);
    if (L.spots.rootGate) { const gte = put(act3Prop('rootGate'), L.spots.rootGate.x, L.spots.rootGate.z); gte.userData.setOpen(q.has('open')); }
    if (L.spots.heart) put(act3Prop('heart', { beat: autumn ? 0 : 1 }), L.spots.heart.x, L.spots.heart.z);
    for (const t of L.thorns || []) if (!q.has('open')) R.scene.add(act3Prop('thorns', t));
    if (autumn && L.spots.lindenTree) put(act3Prop('sapling'), L.spots.lindenTree.x + 1.2, L.spots.lindenTree.z + 1.4);
    if (q.has('hart') && L.spots.glade) put(act3Prop('whiteTree'), L.spots.glade.x, L.spots.glade.z + 1);
    for (const k in L.spots.npcs || {}) {
      const n = L.spots.npcs[k];
      try { const a = new Avatar(personModel(k), { animSet: 'npc' }); a.group.position.set(n.x, 0, n.z); a.group.rotation.y = n.r || 0; a.update(0.5, { speed: 0 }); R.scene.add(a.group); } catch (e) { console.warn('npc', k, e.message); }
    }
  }
  const at0 = q.get('at'), n0 = +(q.get('n') || 0);
  const sp = L.spots, off = (p, dz = 0, dx = 0) => p && { x: p.x + dx, z: p.z + dz };
  const at = at0 === 'boss' ? L.boss : at0 === 'gate' ? (L.gate || off(sp.rootGate, 4)) : at0 === 'bridge' ? L.bridge
    : at0 === 'glade' ? off(sp.glade, 6) : at0 === 'mere' ? off(sp.mere, 2) : at0 === 'lantern' ? off(sp.lanternglade, 3) : at0 === 'deer' ? off(sp.deer, 4)
      : at0 === 'island' ? off(sp.island, 1) : at0 === 'heart' ? off(sp.heart, 9) : at0 === 'thorns' ? off(L.thorns?.[n0], 0) : at0 === 'chamber' ? L.chambers?.[n0]
        : at0 === 'tear' ? off(sp.tears?.[n0], 2.5) : at0 === 'waypoint' ? off(sp.waypoint, 2) : L.start;
  const x = +(q.get('x') || at.x), z = +(q.get('z') || at.z + (at0 === 'gate' && L.gate ? 8 : 0));
  const hero = new Avatar(M.buildWarden(), { style: 'sword' }); hero.hold('R', 'sword', {}); hero.hold('L', 'shield', {});
  hero.group.position.set(x, 0, z); hero.group.rotation.y = Math.PI; R.scene.add(hero.group);
  if (q.get('dist')) R.cam.dist = +q.get('dist');
  if (q.get('pitch')) R.cam.pitch = +q.get('pitch');
  if (q.get('zoom')) R.cam.zoomT = R.cam.zoom = +q.get('zoom');
  const { setEmitters, setAmbient, initFX, updateFX } = await import('../gfx/fx.js');
  initFX(R.quality); setEmitters(lvl.emitters);
  setAmbient(act3 ? (autumn ? type + 'Autumn' : type) : { pass: 'snow' }[type] || type);
  R.heroLight.position.set(x, 2.6, z);
  // let the particles and the ambient fill in before the first picture
  updateCamera(0, x, z, true);
  for (let i = 0; i < 80; i++) updateFX(0.05, x, z);
  WIND.uHero.value.set(x, 1, z);
  let n = 0, hx = x, hz = z;
  const draw = () => {
    frame(0.016); hero.update(0.016, { speed: 0 }); updateCamera(0.016, hx, hz, true); updateFX(0.016, hx, hz);
    WIND.uTime.value += 0.016;
    R.heroLight.position.set(hx, 2.6, hz); R.heroLight.intensity = R.heroLight.userData.base;
    if (lvl.walls) lvl.walls.update(0.1, hx, hz);
    lvl.village?.update(0.1, hx, hz);
    render();
  };
  // screenshot tools move the hero (and the camera) between pictures: __view(x, z, {dist, pitch, ry}) draws one frame there
  window.__view = (vx, vz, o = {}) => {
    hx = vx; hz = vz; hero.group.position.set(hx, 0, hz); if (o.ry != null) hero.group.rotation.y = o.ry;
    if (o.dist) R.cam.dist = o.dist; if (o.pitch) R.cam.pitch = o.pitch;
    WIND.uHero.value.set(hx, 1, hz);
    for (let i = 0; i < 60; i++) updateFX(0.05, hx, hz);
    draw(); draw();
    return { x: hx, z: hz };
  };
  function loop() {
    draw();
    if (++n > 1) { window.__ready = true; window.__R = R; window.__L = L; window.__lvl = lvl; }
    if (n < 3 || q.has('live')) requestAnimationFrame(loop);
  }
  loop();
}
