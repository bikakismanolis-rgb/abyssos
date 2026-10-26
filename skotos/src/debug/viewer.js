// Model and animation viewer for screenshots: ?viewer&clip=slash1&t=0.5&speed=0&cam=front
import * as THREE from 'three';
import { initGfx, R, setAtmosphere, frame, render, updateCamera, addLight, toScreen } from '../gfx/gfx.js';
import { tex } from '../gfx/textures.js';
import * as M from '../gfx/models.js';
import { Avatar } from '../gfx/anim.js';
import { loadPeople, loadFolk, personModel } from '../gfx/people.js';
import { envChest, hasEnv } from '../gfx/env.js';

// people: ?viewer&only=p:warden,p:ranger (realistic characters), grip tests with &grip=X,1.57,Y,0; &ly=1.6 aims at the faces
export async function startViewer(q) {
  if (q.get('tilt')) { const [ax, a] = q.get('tilt').split(','); window.__tilt = [ax, +a]; }
  if (q.get('grip')) { const g = q.get('grip').split(','); window.__grip = [g[0], +g[1], g[2], +g[3]]; }
  initGfx(2);
  // &lit=day: a grey overcast daylight with no warm lamp, to judge colours (the Frozen Coast's people); &lit=coast: its cold light
  const lit = { day: { fog: 0x8a96a4, density: 0.004, sky: 0xd8e0ea, ground: 0x6a6660, hemi: 1.5, moon: 0xfff6ea, moonI: 2.0, exposure: 1.0, heroI: 0 },
    coast: { fog: 0x5a6a80, density: 0.008, sky: 0xa8c0dc, ground: 0x3a4048, hemi: 1.3, moon: 0xdce8ff, moonI: 1.8, exposure: 1.05, heroI: 0 } }[q.get('lit')];
  setAtmosphere(lit || { fog: 0x0a0d12, density: 0.012, sky: 0x6070a0, ground: 0x2a2018, hemi: 1.2, moon: 0xb0c4ff, moonI: 1.6, exposure: 1.2, heroI: 0 });
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
    'p:amaranthe': () => { const a = new Avatar(personModel('amaranthe'), { style: 'heavy' }); a.hold('R', 'spear', {}); return a; },
    // Act IV's people (ash.glb): the Lampless, the Ash-Fallen, an Ashsmith, the Wayfarers of the lamp memories, the bosses
    'p:lampless': () => { const a = new Avatar(personModel('lampless'), { style: 'staff', animSet: 'formal' }); a.hold('R', 'lanternStaff', { glow: 0.05, lamp: 0x6a7684 }); return a; },
    'p:ashSpear': () => { const a = new Avatar(personModel('ashSpear'), { style: 'heavy' }); a.hold('R', 'spear', { len: 2.0, blade: 0x6a645c, glow: 0, wood: 0x2a2420 }); a.hold('L', 'shield', { face: 0x3a3632, rim: 0x6a645c, emblem: 0x8a3a20, r: 0.32 }); return a; },
    'p:ashDwarf': () => { const a = new Avatar(personModel('ashDwarf'), { style: 'sword' }); a.hold('R', 'axe', { blade: 0x6a5a48 }); a.hold('L', 'shield', { face: 0x4a3a28, rim: 0x9a7a40, emblem: 0xb07a30, r: 0.3 }); return a; },
    'p:ashBow': () => { const a = new Avatar(personModel('ashBow'), { style: 'bow' }); a.hold('R', 'bow', { blade: 0x3a3028 }); return a; },
    'p:ashsmith': () => { const a = new Avatar(personModel('ashsmith'), { style: 'none' }); a.hold('R', 'hammer', {}); return a; },
    'p:ivar': () => { const a = new Avatar(personModel('ivar'), { style: 'staff' }); a.hold('R', 'lanternStaff', { glow: 0.05, lamp: 0x6a7684 }); return a; },
    'p:arna': () => { const a = new Avatar(personModel('arna'), { style: 'staff', animSet: 'npc' }); a.hold('R', 'lanternStaff', {}); return a; },
    'p:arnaOld': () => { const a = new Avatar(personModel('arnaOld'), { style: 'staff', animSet: 'npc' }); a.hold('R', 'lanternStaff', {}); return a; },
    'p:isarnBoy': () => new Avatar(personModel('isarnBoy'), { animSet: 'npc' }),
    'p:hammerhorn': () => { const a = new Avatar(personModel('hammerhorn'), { style: 'heavy' }); a.hold('R', 'hammer', {}); return a; },
    'p:karthax': () => { const a = new Avatar(personModel('karthax'), { style: 'heavy' }); a.hold('R', 'hammer', { head: 0x1a1816, glow: 0.6, rune: 0xff5a10 }); return a; },
    // Act V's people (frost.glb), bare: the boat-hook, harpoon, kelp, hoods, caps, collars, the eye band and the sea-lanterns
    // are the game's code parts
    'p:sunken': () => new Avatar(personModel('sunken'), { style: 'undead' }),
    'p:icesinger': () => new Avatar(personModel('icesinger'), { animSet: 'formal', idle: 'Spell_Simple_Idle_Loop' }),
    'p:alkyone': () => new Avatar(personModel('alkyone'), { animSet: 'npc', idle: 'lantern' }),
    'p:selna': () => new Avatar(personModel('selna'), { animSet: 'npc', idle: 'lantern' }),
    'p:tern': () => new Avatar(personModel('tern'), { animSet: 'npc', idle: 'lantern' }),
    'p:tamarisk': () => new Avatar(personModel('tamarisk'), { animSet: 'npc', idle: 'fold' }),
    'p:glaukos': () => new Avatar(personModel('glaukos'), { animSet: 'npc', idle: 'talk' })
  };
  if (list.some((n) => n.startsWith('p:'))) await loadPeople();
  if (list.some((n) => /^p:(stoneborn|runepriest|brokka|moltenKing)/.test(n))) await loadFolk();
  if (list.some((n) => /^p:(elati|linden|rootsworn|hollowed|mourner|amaranthe)/.test(n))) await loadFolk('grove');
  if (list.some((n) => /^p:(lampless|ash[A-Z]|ashsmith|ivar|arna|isarnBoy|hammerhorn|karthax)/.test(n))) await loadFolk('ash');
  if (list.some((n) => /^p:(sunken|icesinger|alkyone|selna|tern|tamarisk|glaukos)$/.test(n))) await loadFolk('frost');
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
  // (the hero's lamp sits at the origin, among the feet, unless a lit mode puts it out)
  if (!lit) addLight({ x: 0, y: 3, z: 3, color: 0xffa860, intensity: 40, range: 20 }); else R.heroLight.intensity = 0;
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
  R.cam.lookY = +(q.get('ly') || 0.9);
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

// ?world=crypt|forest|town|pass|halls|weep|heart|ashfield|forge&seed=3&x=..&z=..&dist=..&at=..
// Act III: &at=glade|mere|boss|gate|lantern|deer|island|heart|thorns|chamber&n=..; &autumn=1 the First Autumn; &wind=1;
// Act IV: &at=camp|lamp|altar|banners|drake|flats|graves|hook|gate|boss (the Field), camp|hall|rivers|flue|bellows|station|
// moulds|plug|anvil|boss (the Forge), &n=..; &lit=1 (or l1,l3,w1) lights the waylamps, &night=stars|dawn, &heat=0..3|cold,
// &open=1 the gate open and the plug melted, &state=taken|refused for the altars, &white=0..1 the Forge Mouth's whitening
// (with &heat=cold: after the Unmaking); the chests stand where the story puts them; &at=chest&n=.. looks at one;
// &live keeps rendering (otherwise it stops once FX have warmed up, which keeps software-rendered screenshots quick)
export async function startWorld(q) {
  const { genForest, genCrypt, genTown } = await import('../world/gen.js');
  const { genPass, genHalls } = await import('../world/gen2.js');
  const { genWeep, genHeart } = await import('../world/gen3.js');
  const { genAshfield, genForge } = await import('../world/gen4.js');
  const { buildLevel, WIND, act3Prop, setAutumn, act4Prop, setHeat, setNight } = await import('../world/build.js');
  const { loadKits } = await import('../gfx/kits.js');
  const { loadEnv, loadPack } = await import('../gfx/env.js');
  const { loadCreatures } = await import('../gfx/creatures.js');
  const { ATMOS } = await import('../world/atmos.js');
  initGfx(+(q.get('q') || 2));
  await Promise.all([loadKits(['dungeon', 'grave', 'town']), q.has('noenv') ? null : loadEnv(R.quality)]);
  const type = q.get('world'), seed = +(q.get('seed') || 3), act3 = type === 'weep' || type === 'heart', act4 = type === 'ashfield' || type === 'forge', act5 = type === 'coast' || type === 'farlight';
  if (type === 'pass' || type === 'halls' || type === 'forge') await loadPack('deep');
  if (act3) await Promise.all([loadPack('wood'), loadCreatures(), loadFolk('grove')]);
  // Act IV: the cinder pack (whatever of it exists), its people and those of Acts II-III who come north, every creature
  if (act4 && !q.has('nopack')) await Promise.all([loadPack('cinder'), loadCreatures(), loadFolk('ash'), loadFolk('folk'), loadFolk('grove')]);
  // &fakecinder: stand the base and deep sets' scans and layers in for the cinder pack's (tests its code paths before it exists)
  if (q.has('fakecinder')) { await loadPack('deep'); fakeCinder(); }
  // Act V: the rime pack (whatever of it exists); &deep=1 also the deep's snow and stone (as after a trip through Act II)
  if (act5) await Promise.all([loadPack('rime'), q.has('deep') ? loadPack('deep') : null]);
  if (R.quality >= 1) await loadPack('trees');
  if (!q.has('nohouses')) await loadPack('village');
  if (type === 'pass') WIND.uSnow.value = 1;
  const L = act5 ? await layout5(q, type, seed) : type === 'crypt' ? genCrypt(seed) : type === 'town' ? genTown() : type === 'pass' ? genPass(seed) : type === 'halls' ? genHalls(seed)
    : type === 'weep' ? genWeep(seed) : type === 'heart' ? genHeart(seed) : type === 'ashfield' ? genAshfield(seed) : type === 'forge' ? genForge(seed) : genForest(seed);
  const autumn = q.get('autumn') === '1', night = q.get('night') || 'ash', heat = q.get('heat') === 'cold' ? -1 : +(q.get('heat') || 0);
  setAtmosphere(ATMOS[q.get('atmos') || (act3 && autumn ? type + 'Autumn' : type === 'ashfield' && night !== 'ash' ? 'ashfield' + night[0].toUpperCase() + night.slice(1) : act5 && q.has('frozen') && type === 'coast' ? 'coastFrozen' : type)]);
  if (act5 || q.get('atmos')?.endsWith('Aurora')) WIND.uSnow.value = act5 ? 1 : 0;
  if (act3) { WIND.uWind.value = autumn || q.has('wind') ? 1 : 0; setAutumn(autumn ? 1 : 0); }
  if (q.has('nofog')) { R.scene.fog.density = 0; R.camera.far = 600; R.camera.updateProjectionMatrix(); R.hemi.intensity *= 1.6; }
  const lvl = buildLevel(L, R.quality);
  R.scene.add(lvl.group);
  if (type === 'forge') setHeat(heat);
  for (const l of L.lights) addLight(l);
  const act4Emit = act4 ? viewAct4(q, L, act4Prop, night) : [];
  const v5 = act5 ? await viewAct5(q, L) : null;
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
  const s5 = act5 && (Array.isArray(L.spots[at0]) ? L.spots[at0][n0] : L.spots[at0] || (at0 === 'boss' ? L.boss : null));
  const at = act5 ? (s5 && { x: s5.x, z: s5.z + 2 }) || L.start : act4 ? act4At(L, at0, n0) : at0 === 'boss' ? L.boss : at0 === 'gate' ? (L.gate || off(sp.rootGate, 4)) : at0 === 'bridge' ? L.bridge
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
  initFX(R.quality); setEmitters(lvl.emitters.concat(act4Emit));
  setAmbient(act3 ? (autumn ? type + 'Autumn' : type) : { pass: 'snow', ashfield: 'ashfall', forge: heat < 0 ? 'forgeCold' : 'forge' }[type] || type);
  if (type === 'ashfield') setNight(night);
  R.heroLight.position.set(x, 2.6, z);
  // let the particles and the ambient fill in before the first picture
  updateCamera(0, x, z, true);
  for (let i = 0; i < 80; i++) updateFX(0.05, x, z);
  WIND.uHero.value.set(x, 1, z);
  let n = 0, hx = x, hz = z;
  v5?.place(x, z);
  const draw = () => {
    frame(0.016); hero.update(0.016, { speed: 0 }); updateCamera(0.016, hx, hz, true); updateFX(0.016, hx, hz);
    v5?.tick(0.016);
    WIND.uTime.value += 0.016;
    R.heroLight.position.set(hx, 2.6, hz); R.heroLight.intensity = R.heroLight.userData.base;
    if (lvl.walls) lvl.walls.update(0.1, hx, hz);
    lvl.village?.update(0.1, hx, hz);
    render();
  };
  // screenshot tools move the hero (and the camera) between pictures: __view(x, z, {dist, pitch, ry}) draws one frame there
  window.__view = (vx, vz, o = {}) => {
    hx = vx; hz = vz; hero.group.position.set(hx, 0, hz); if (o.ry != null) hero.group.rotation.y = o.ry;
    if (o.tide != null) { v5?.tide(o.tide, o.wet); }
    v5?.place(hx, hz);
    if (o.dist) R.cam.dist = o.dist; if (o.pitch) R.cam.pitch = o.pitch;
    WIND.uHero.value.set(hx, 1, hz);
    for (let i = 0; i < 60; i++) updateFX(0.05, hx, hz);
    draw(); draw();
    return { x: hx, z: hz };
  };
  // __bench(n): the mean time (ms) of n frames drawn here, each waited out on the GPU (a one-pixel read)
  window.__bench = (n = 20) => {
    const gl = R.renderer.getContext(), px = new Uint8Array(4);
    draw(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now();
    for (let i = 0; i < n; i++) { draw(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
    return (performance.now() - t0) / n;
  };
  function loop() {
    draw();
    if (++n > 1) { window.__ready = true; window.__R = R; window.__L = L; window.__lvl = lvl; }
    if (n < 3 || q.has('live')) requestAnimationFrame(loop);
  }
  loop();
}

// Act IV: place what the story places (lamps, altars, braziers, the gate, the bellows, the plug, the anvils) and the camp
// people, the way world.js will; returns the extra emitters (the lit fires)
function viewAct4(q, L, act4Prop, night) {
  const sp = L.spots, emit = [], open = q.has('open'), lit = q.get('lit');
  const put = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; R.scene.add(o); return o; };
  const isLit = (id) => lit === '1' || (lit || '').split(',').includes(id);
  const pool = (x, z, r, c = 0xffb060) => { const g = act4Prop('lightRing'); g.scale.setScalar(r); g.userData.setColor(c); put(g, x, z); };
  for (const p of [...(sp.lamps || []), ...(sp.waylamps || [])]) {
    const m = put(act4Prop('waylamp', { lit: isLit(p.id) || night === 'dawn' }), p.x, p.z, p.r - Math.PI / 2);
    if (m.userData.lit) { const f = m.userData.flameAt, a = p.r - Math.PI / 2, fx = p.x + Math.sin(a + Math.PI / 2) * f.x, fz = p.z + Math.cos(a + Math.PI / 2) * f.x; addLight({ x: fx, y: f.y, z: fz, color: 0xffb060, intensity: 16, range: 10, flicker: 0.15 }); pool(p.x, p.z, p.lightR || 8); }
  }
  for (const a of sp.altars || []) put(act4Prop('altar'), a.x, a.z, a.r).userData.setState(q.get('state') || 'idle');
  for (const b of sp.braziers || []) { put(act4Prop('brazier'), b.x, b.z); addLight({ x: b.x, y: 1.6, z: b.z, color: 0xff8a3a, intensity: 18, range: 11, flicker: 0.35 }); emit.push({ x: b.x, y: 1.2, z: b.z, type: 'fire', s: 0.8 }); pool(b.x, b.z, 6); }
  if (sp.lastLamp) put(act4Prop('lastLamp'), sp.lastLamp.x, sp.lastLamp.z, Math.PI / 2).userData.setLit(night !== 'ash');
  if (L.gate) put(act4Prop('anvilGate'), L.gate.x, L.gate.z).userData.setOpen(open);
  if (sp.hook) put(act4Prop('hook'), sp.hook.x, sp.hook.z, sp.hook.r);
  for (const b of sp.bellows || []) { put(act4Prop('bellows'), b.prop.x, b.prop.z, b.prop.r); emit.push({ x: b.pit.x, y: 0.4, z: b.pit.z, type: 'fire', s: 1 }); }
  if (L.plug && !open) R.scene.add(act4Prop('slagPlug', L.plug));
  if (sp.anvil) put(act4Prop('anvil'), sp.anvil.x, sp.anvil.z);
  for (const c of sp.cages || []) put(act4Prop('shardAnvil'), c.x, c.z, Math.atan2(sp.anvil.x - c.x, sp.anvil.z - c.z));
  if (sp.mouth) { const m = put(act4Prop('forgeMouth', sp.mouth), sp.mouth.x, sp.mouth.z); m.userData.setWhite(+(q.get('white') || 0)); if (q.get('heat') === 'cold') m.children.find((c) => c.isSprite).visible = false; }
  for (const c of sp.chests || []) put(hasEnv('chest') ? envChest(c.rare ? 1.15 : 1) : new THREE.Group(), c.x, c.z, 0.2);
  for (const k in sp.npcs || {}) {
    const n = sp.npcs[k];
    try { const a = new Avatar(personModel(k), { animSet: 'npc' }); a.group.position.set(n.x, 0, n.z); a.group.rotation.y = n.r || 0; a.update(0.5, { speed: 0 }); R.scene.add(a.group); } catch (e) { console.warn('npc', k, e.message); }
  }
  return emit;
}
function act4At(L, at, n) {
  const sp = L.spots, off = (p, dz = 0, dx = 0) => p && { x: p.x + dx, z: p.z + dz };
  const pick = {
    camp: off(sp.camp, 2), lamp: off(sp.lamps?.[n], 2), waylamp: off(sp.waylamps?.[n], 2), altar: off(sp.altars?.[n], 3), banners: off(sp.banners, 3), drake: off(sp.drake, 4),
    flats: sp.flats, graves: off(sp.graves, 6), hook: off(sp.hook, 2.5, 1.5), gate: L.gate && { x: L.gate.x, z: L.gate.z + 9 }, boss: L.boss, camp2: off(sp.camp2, 2), tower: off(sp.tower, 4),
    hall: L.statues?.[n * 2] && { x: L.statues[n * 2].x + 4.6, z: L.statues[n * 2].z }, rivers: L.bridges?.[n], flue: L.flues?.[n] && { x: L.flues[n].x + Math.sin(L.flues[n].dir) * 10, z: L.flues[n].z + Math.cos(L.flues[n].dir) * 10 },
    bellows: off(sp.bellows?.[n], 2), station: off(sp.stations?.[n], 1.5), moulds: sp.hall, chest: off(sp.chests?.[n], 1.6), workshop: sp.workshop, mouth: off(sp.mouth, -6), plug: L.plug && { x: L.plug.x - Math.sin(L.plug.r) * 3, z: L.plug.z - Math.cos(L.plug.r) * 3 + 2 }, anvil: off(sp.anvil, 6)
  }[at];
  return pick || L.start;
}

// Act V: gen5's layouts (&frozen: the coast after the Freeze; &sealed=0,1: the Farthest Light with those leads sealed)
async function layout5(q, type, seed) {
  const m = await import('../world/gen5.js');
  if (type === 'coast') return m.genCoast(seed, { frozen: q.has('frozen') });
  const L = m.genFarlight(seed);
  // &sealed=0,1: those holes sealed before the build, as world.js lays them out on a later entry
  for (const k of (q.get('sealed') || '').split(',').filter(Boolean).map(Number)) for (const [x, z] of L.spots.holes[k]?.lead || []) { const i = z * L.w + x; L.cells[i] = 1; L.low[i] = 0; L.sea[i] = 0; L.ice[i] = 0; L.thick[i] = 1; }
  return L;
}
// the sea's states: &tide=0..1.2 (&wet= the wet line), &freeze=0..1 (the Freeze), &wave=t (hole 0's wave), &ring=p (its
// ring closing), &crack=1 (crack stages 1-5 round the hero), &shade=1 (a shape under the ice), &wake=1, &beam=1 (a lit
// sea-light's beam and its light path, &theta=), &tele=1 (a telegraph, a light pool, the Cradle's ring, a decal and a blob
// shadow round the hero: the draw order over the water), &sky=1 (the aurora dome; lower the camera with &pitch=0.2),
// &aur=, &dark=, &front= (override the atmosphere's aurora), &skin=1 (the Skotos's skin on a test sphere by the hero)
async function viewAct5(q, L) {
  const S = await import('../world/sea.js'), B = await import('../world/build.js'), FXm = await import('../gfx/fx.js');
  const num = (k, d) => (q.has(k) ? +q.get(k) : d);
  const tide = (lv, wet) => { S.SEA.uLevel.value = lv; S.SEA.uWetLevel.value = Math.max(lv, wet ?? lv); };
  tide(num('tide', 0), num('wet', undefined));
  if (q.has('aur')) S.SEA.uAur.value = num('aur', 0.8);
  if (q.has('dark')) S.SEA.uAurDark.value = num('dark', 0);
  if (q.has('front')) S.SEA.uAurFront.value = num('front', 0);
  if (q.has('freeze')) { S.setFreezeAll(0.001); S.SEA.uTime.value += 1; S.setFreezeAll(num('freeze', 1)); }
  const h0 = L.spots.holes?.[0];
  if (q.has('wave') && h0) S.SEA.uFreeze.value[0].set(h0.x, h0.z, 70, num('wave', 0.4));
  if (q.has('ring') && h0) S.freezeRing(0, h0.x, h0.z, 4.6, num('ring', 0.5));
  S.SEA.sky = q.has('sky');
  // (for the scenarios: this page's own modules, not fresh imports of them)
  window.__v5 = { S, B, fx: FXm, R, toScreen };
  props5(q, L, (await import('../world/build5.js')).act5Prop);
  const extra = [];
  let beam = null;
  return {
    tide,
    place(x, z) {
      for (const o of extra) R.scene.remove(o);
      extra.length = 0;
      if (q.has('crack')) {
        const d = new Uint8Array(L.w * L.h);
        for (let i = 0; i < L.w * L.h; i++) {
          if (!L.ice?.[i]) continue;
          const cx = i % L.w, cz = (i - cx) / L.w, r = Math.hypot(cx + 0.5 - x, cz + 0.5 - (z - 4));
          d[i] = r < 1.2 ? 4 : r < 2.3 ? 3 : r < 3.4 ? 2 : r < 4.6 ? 1 : 0;
          if (cx + 0.5 > x + 4 && cx + 0.5 < x + 7 && cz + 0.5 > z - 6 && cz + 0.5 < z - 2) d[i] = 5;
        }
        const t = new THREE.DataTexture(d, L.w, L.h, THREE.RedFormat); t.needsUpdate = true;
        S.SEA.tCrack.value = t; S.SEA.uMap.value.set(L.w, L.h);
      }
      if (q.has('shade')) { S.setShade(0, x + 3, z - 5, 2.2, 1); S.setShade(3, x - 6, z - 9, 7, 0.8); }
      if (q.has('wake')) S.setWake(x + 1, z - 7, 0.6, 1);
      if (q.has('beam')) {
        if (!beam) { beam = S.beamMesh({ y: 9 }); R.scene.add(beam); }
        const bx = x - 12, bz = z - 12; beam.position.set(bx, 9, bz); beam.userData.setDir(num('theta', Math.atan2(20, 14)));
        S.SEA.uLights.value[0].set(bx, 9, bz, 1);
        addLight({ x: bx, y: 9, z: bz, color: 0xffd8a0, intensity: 30, range: 16 });
        const p = beam.userData.point(14); addLight({ x: p.x, y: Math.max(1.5, p.y), z: p.z, color: 0xfff0d8, intensity: 14, range: 9 });
      }
      if (q.has('skin')) {
        for (const [dx, M] of [[-3, THREE.MeshStandardMaterial], [3, THREE.MeshLambertMaterial]]) {
          const m = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 20), S.skotosSkin(new M({ color: 0x0c0a14 })));
          m.position.set(x + dx, 1.4, z - 2); R.scene.add(m); extra.push(m);
        }
        S.SEA.uBeam.value[0].set(x - 8, 6, z - 2, 1); S.SEA.uBeam.value[1].set(0.97, -0.243, 0, 26);
      }
      if (q.has('tele')) {
        FXm.teleCircle(x + 2.5, z - 2, 1.8, 30);
        FXm.teleCone(x - 1, z - 3, 0.3, 4, 0.5, 30, 0x30e0b0);
        FXm.decal(x - 2.8, z + 0.5, 'blood', 1.6, 60);
        const ring = B.act4Prop('lightRing'); ring.scale.setScalar(4); ring.position.set(x, 0, z); B.drape(ring, L); R.scene.add(ring); extra.push(ring);
        const pool = B.act4Prop('lightRing'); pool.userData.setColor(0xfff0d0); pool.scale.setScalar(3); pool.position.set(x + 4, 0, z + 2); B.drape(pool, L); R.scene.add(pool); extra.push(pool);
        const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex('blob'), transparent: true, depthWrite: false, opacity: 0.8 }));
        blob.position.set(x, 0.04, z); blob.renderOrder = 1.5; R.scene.add(blob); extra.push(blob);
      }
    },
    tick(dt) { beam?.userData.tick(dt); }
  };
}

// Act V: the story's props where world.js puts them (act5Zone); &lit=1 lights them all (or a list: grey,wreck,fall,hearth,
// stones,lamps,cairns,far), &beams=1 their beams, &tower=down the dead Tower on its island, &carved=1 the door-stone carved
function props5(q, L, act5Prop) {
  const S = L.spots, lit = q.get('lit') || '', on = (k) => lit === '1' || lit.split(',').includes(k), beams = q.has('beams');
  const put = (o, x, z, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; R.scene.add(o); return o; };
  const light = (m, k, r = 7, c = 0xffe8c8) => { m.userData.setLit?.(on(k)); if (on(k)) addLight({ x: m.position.x, y: 1.8, z: m.position.z, color: c, intensity: 22, range: r * 2, flicker: 0.12 }); };
  window.__props5 = [];
  const keep = (m) => { window.__props5.push(m); return m; };
  if (L.type === 'coast') {
    S.sealights.forEach((s, k) => {
      const m = keep(put(act5Prop('sealight', { v: k, id: s.id }), s.x, s.z, s.r)); light(m, s.id);
      if (beams && on(s.id)) m.userData.setBeam(s.r + 0.6);
      keep(put(act5Prop('iceWindow', { id: s.id }), s.window.x, s.window.z, s.r));
    });
    light(keep(put(act5Prop('hearth'), S.hearth.x, S.hearth.z)), 'hearth', 8, 0xffb070);
    keep(put(act5Prop('bell'), S.bell.x, S.bell.z, Math.PI / 2));
    for (const b of S.boats) keep(put(act5Prop('boat'), b.x, b.z, b.r)).userData.setLevel(+(q.get('tide') || 0));
    for (const st of S.stones) light(keep(put(act5Prop('nameStone', { id: st.id }), st.x, st.z, st.r)), 'stones', 3);
    for (const c of S.casks) keep(put(act5Prop('cask'), c.x, c.z, hashA(c.x, c.z)));
    if (q.get('tower') === 'down') { const m = keep(put(act5Prop('skerryLight'), S.skerry.x, S.skerry.z)); m.userData.setLit(true); if (beams) m.userData.setBeam(2.4); }
  } else {
    const sealed = (q.get('sealed') || '').split(',').filter(Boolean).map(Number);
    for (const ho of S.holes) {
      if (sealed.includes(ho.id)) { const m = keep(put(act5Prop('markerLight'), ho.x, ho.z)); if (beams) m.userData.setBeam(ho.id * 1.7); continue; }
      ho.lamps.forEach((p) => light(keep(put(act5Prop('holeLamp'), p.x, p.z, Math.atan2(ho.x - p.x, ho.z - p.z))), 'lamps', 4.5, 0xffb060));
    }
    for (const f of S.fires) light(keep(put(act5Prop('cairn'), f.x, f.z)), 'cairns', 5, 0xffb060);
    const FL = S.farLight, m = keep(put(act5Prop('farLight'), FL.x, FL.z, Math.PI));
    m.userData.setLit(on('far')); if (beams && on('far')) m.userData.setBeam(Math.PI + 0.3);
    keep(put(act5Prop('doorStone'), FL.door.x, FL.door.z, Math.PI)).userData.setCarved(q.has('carved'));
    for (const dl of S.drowned) keep(put(act5Prop('iceWindow', { drowned: true }), dl.window.x, dl.window.z));
    for (const c of S.casks) keep(put(act5Prop('cask'), c.x, c.z, hashA(c.x, c.z)));
  }
}
const hashA = (x, z) => (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 6.28;

async function fakeCinder() {
  const { ENV } = await import('../gfx/env.js');
  const P = { rockA: 'rockD', rockB: 'rockE', rockC: 'rockF', rockD: 'boulderD', boulder: 'boulderD', statue: 'statue', lantern: 'lantern', cagedLight: 'lantern', deadTree: 'treeDead', deadTreeB: 'treeDead',
    shield: 'branches', sword: 'branches', warhammer: 'log', mace: 'stoneA', brazier: 'firepit', barrel: 'barrel', stump: 'stump', anvil: 'chest', bellows: 'chest', ruinedTower: 'cliffA', drakeRibs: 'log', drakeSpine: 'log', drakeSkull: 'boulderD', bullHead: 'stoneB', tongs: 'branches', quench: 'crate', toolRack: 'crate', crossPein: 'branches' };
  for (const k in P) if (ENV.props[P[k]]) { ENV.props['cinder/' + k] = ENV.props[P[k]]; if (ENV.sizes[P[k]]) ENV.sizes['cinder/' + k] = ENV.sizes[P[k]]; }
  const Ly = { ashGround: 'scree', ashTrod: 'gravel', scree: 'cave', road: 'gravel', cliffRock: 'cliff', forgeTiles: 'dslab', forgeHerring: 'herring', ironPlate: 'cave', grate: 'herring', rust: 'mud' };
  for (const k in Ly) if (ENV.layers[Ly[k]]) ENV.layers['cinder/' + k] = ENV.layers[Ly[k]];
  ENV.packs.cinder = true;
}
