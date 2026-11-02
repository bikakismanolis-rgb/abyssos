// The look lane's bench for Act VI (docs/act6-contract.md, Visuals): a test layout of each zone's size carrying the
// fields gen6 fills (the black water's pockets and the Mere, the dry road, skylights, keels, lure posts, braziers, the
// Rope's foot; the Mere drained, the Well's mouth and the Ketos's neck in the dry reading; the glade and the village's sunk
// houses at the Bottom), built through buildLevel as a zone is (ground6, SEA_BLACK, act6Level, the vault), and every
// act6Prop kind laid out in a row. tools/scenario.mjs look6 loads it into the world viewer's page (?world=crypt&q=N):
//   show({ type: 'drained' | 'bottom', mode, props: true })   builds it in place of the viewer's level
//   view(x, z, { dist, pitch, level, wet, mere, slush, lit })  one frame drawn there (the water's levels, slush cells)
import * as THREE from 'three';
import { R, frame, render, updateCamera, addLight, setAtmosphere } from '../gfx/gfx.js';
import { loadPack } from '../gfx/env.js';
import { base, carveCircle, carveLine, distField } from '../world/gen.js';
import { BED_DRY, terrain } from '../world/genlib.js';
import { buildLevel, WIND } from '../world/build.js';
import { act6Prop } from '../world/build6.js';
import { SEA, slushSet } from '../world/sea.js';
import { FX, FIRE_U, updateFX, setEmitters } from '../gfx/fx.js';
import { RNG } from '../core/util.js';
import { ATMOS } from '../world/atmos.js';
const Q = (v) => Math.round(v / 0.15) * 0.15;
// a test layout: the fields of the contract's L, a floor of a few rooms joined by a dry road, the black water's basins
export function testLayout(type = 'drained', mode = type === 'drained' ? 'mere' : 'dark', seed = 3) {
  const bot = type === 'bottom', w = bot ? 104 : 112, h = bot ? 200 : 176, N = w * h, rng = RNG(seed * 31 + 7);
  const L = Object.assign(base(w, h), {
    type, seed, mode, tries: 1, low: new Uint8Array(N), bed: new Float32Array(N).fill(BED_DRY), vbed: null,
    pocket: new Uint8Array(N), vault: new Uint8Array(N), keel: new Uint8Array(N),
    thick: new Uint8Array(N), window: new Uint8Array(N), deck: new Uint8Array(N), sea: new Uint8Array(N),
    tideCfg: { phases: [40, 27, 26, 27], stepT: 4.5, hMax: 0.9 }, refuges: []
  });
  const S = L.spots;
  // the floor: the camp, a broad floor south of it with its basins, the road on to the arena
  const camp = { x: 56, z: 18, r: 9 }, open = { x: 56, z: 52, r: 24 }, arena = bot ? { x: 52, z: 176, r: 14 } : { x: 58, z: 146, r: 20 };
  carveCircle(L, camp.x, camp.z, camp.r); carveCircle(L, open.x, open.z, open.r); carveCircle(L, arena.x, arena.z, arena.r - 1);
  carveLine(L, camp.x, camp.z, open.x, open.z, 3, 1); carveLine(L, open.x, open.z + 10, 40, 104, 2.6, 1); carveLine(L, 40, 104, arena.x, arena.z - arena.r + 2, 2.6, 1);
  carveCircle(L, 38, 100, 12);
  // (the bench's own floor, south-east, where every act6Prop kind stands: BENCH)
  if (!bot) { carveCircle(L, 86, 100, 18); carveCircle(L, 86, 116, 14); carveLine(L, 70, 80, open.x + 10, open.z + 10, 3, 0); } else { carveCircle(L, 80, 100, 18); carveCircle(L, 80, 116, 14); carveLine(L, 70, 80, open.x + 10, open.z + 10, 3, 0); }
  // the basins (L.pocket 1): beds rising from their centres to the rim, 0.15..0.9 in 0.15 steps
  const basins = [{ x: 44, z: 50, r: 6.5 }, { x: 68, z: 46, r: 5 }, { x: 60, z: 64, r: 4 }, { x: 34, z: 98, r: 5 }];
  for (const b of basins) for (let z = Math.floor(b.z - b.r); z <= b.z + b.r; z++) for (let x = Math.floor(b.x - b.r); x <= b.x + b.r; x++) {
    const d = Math.hypot(x + 0.5 - b.x, z + 0.5 - b.z) / b.r, i = z * w + x; if (d > 1 || !L.cells[i]) continue;
    L.pocket[i] = 1; L.bed[i] = Math.min(0.9, Math.max(0.15, Q(0.15 + d * 0.8 + (rng.next() - 0.5) * 0.12)));
  }
  // the Mere (L.pocket 2) at the arena's centre: 0.45-0.6 across r 5-10, 0-0.15 at its core; in the dry reading it is
  // drained (its beds the same, the level 0) and the Well's mouth stands at its centre
  if (!bot) {
    const me = { x: arena.x, z: arena.z, r: 10, core: 5, lure: { x: arena.x, z: arena.z - 6 } };
    for (let z = Math.floor(me.z - me.r); z <= me.z + me.r; z++) for (let x = Math.floor(me.x - me.r); x <= me.x + me.r; x++) {
      const d = Math.hypot(x + 0.5 - me.x, z + 0.5 - me.z), i = z * w + x; if (d > me.r) continue;
      L.pocket[i] = 2; L.bed[i] = d < me.core ? Q(d / me.core * 0.15) : Q(0.45 + (d - me.core) / (me.r - me.core) * 0.15);
    }
    Object.assign(S, { mere: me, well: { x: me.x, z: me.z, r: 2 }, heap: { ...arena, gap: { x: arena.x, z: arena.z - arena.r + 1.5 } }, arch: { x: me.x, z: me.z + 6, rot: 0, len: 12 } });
  }
  // the corners' beds (gen5's: the mean of the four cells', the land's BED_DRY among them), the heights (the walls rising
  // off the floor; the pools sunk under the water, the Mere's core deepest)
  const W = w + 1; L.vbed = new Float32Array(W * (h + 1));
  for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) { let s = 0; for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const x = vx + dx, z = vz + dz; s += x < 0 || z < 0 || x >= w || z >= h ? BED_DRY : L.bed[z * w + x]; } L.vbed[vz * W + vx] = s / 4; }
  L.dist = distField(L, 12);
  L.hgt = terrain(L, L.cells, L.dist, (d) => Math.min(9, 1.4 + d * 0.85));
  for (let vz = 0; vz <= h; vz++) for (let vx = 0; vx <= w; vx++) {
    let n = 0, core = 0; for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const x = vx + dx, z = vz + dz; if (x >= 0 && z >= 0 && x < w && z < h && L.pocket[z * w + x]) { n++; if (L.bed[z * w + x] < 0.2) core++; } }
    // (as the coast's flats: the floor level under the water where it can be waded, sunk only under what never dries)
    if (n === 4 && core === 4) L.hgt[vz * W + vx] = -0.6;
  }
  // the road (paint), from the camp south
  for (let i = 0; i < N; i++) if (L.cells[i] && !L.pocket[i]) { const x = i % w, z = (i - x) / w; if (Math.abs(x + 0.5 - (56 + Math.sin(z * 0.08) * 6)) < 1.6 && z < 90) L.paint[i] = 1; }
  // the spots act6Level reads, and the dressing
  const br = [{ x: camp.x + 3.5, z: camp.z - 2 }, { x: 50, z: 70 }, { x: arena.x, z: arena.z - arena.r + 3 }];
  for (const b of br) { L.props.push({ t: 'brazier', x: b.x, z: b.z }); L.lights.push({ x: b.x, y: 1.6, z: b.z, color: 0xff9a50, intensity: 24, range: 13, flicker: 0.35 }); }
  Object.assign(S, {
    camp, rope: { x: camp.x, z: camp.z - 4 }, waypoint: { x: camp.x - 3, z: camp.z + 2 }, braziers: br,
    sky: [{ x: camp.x, z: camp.z, r: 6 }, { x: 62, z: 56, r: 4 }, { x: 30, z: 104, r: 3.5 }],
    keels: [{ x: 28, z: 92, r: 2.0 }, { x: 46, z: 96, r: 1.4 }, { x: 34, z: 110, r: 2.4 }, { x: 74, z: 58, r: 1.6 }],
    lures: [{ x: 73, z: 42, bait: { x: 70, z: 45 } }, { x: 39, z: 44, bait: { x: 42, z: 47 } }], vaults: [{ id: 1, x: 30, z: 104, r: 4, n: 50 }], casks: [],
    // (the First's trail: a mark every 1.6 m down the road from the camp, turned along it)
    trail: Array.from({ length: 44 }, (_, k) => { const z = camp.z + 6 + k * 1.6, x = 56 + Math.sin(z * 0.08) * 6 + Math.sin(k * 2.3) * 0.5; return { x, z, rot: Math.atan2(Math.cos(z * 0.08) * 0.48, 1) + Math.sin(k * 1.7) * 0.3 }; })
  });
  if (bot) Object.assign(S, { glade: { x: 38, z: 100, r: 5 }, houses: [{ x: 70, z: 60, rot: 0.3, tilt: 0.12, sink: 0.5 }, { x: 72, z: 72, rot: -0.5, tilt: -0.18, sink: 0.7 }, { x: 44, z: 72, rot: 1.2, tilt: 0.08, sink: 0.4 }] });
  // (the Bottom: a stamped wood's and crypt's boot props round the glade and the village, placed by the shipped addProp in
  // the drowned grade: dead trees and pines, stumps, logs, rocks, a broken pillar and a statue)
  if (bot) L.props.push({ t: 'well', x: 58, z: 66, r: 0.4, sunk: true }, { t: 'cart', x: 54, z: 74, r: 1.1 }, { t: 'stake', x: 62, z: 70, r: 0.2 });
  // (the Drained Sea: a keel as gen6 lays it, s its radius, hgt how far up, Asger's with its clear face; a shack on its side)
  if (!bot) L.props.push({ t: 'keel', x: 22, z: 104, r: 0.6, s: 2.2, hgt: 9, asger: true }, { t: 'shack', x: 66, z: 26, r: 0.5, s: 1, side: true });
  if (bot) for (const [t, x, z, r] of [['dead', 31, 95, 0.3], ['dead', 44, 94, 1.9], ['pine', 33, 107, 0.8], ['pine', 45, 106, 2.5], ['dead', 38, 92, 4.1], ['stump', 35, 101, 0], ['log', 42, 101, 0.7], ['rock', 40, 108, 1.1], ['bush', 32, 100, 0], ['pillar', 60, 76, 0], ['pillarBroken', 64, 78, 0.4], ['statue', 50, 66, 2.8]]) L.props.push({ t, x, z, r, s: 1, d: 1 });
  for (const [t, x, z, r, s] of [['wreck', 68, 136, 0.9], ['keelboat', 46, 136, -0.6], ['rowboat', 70, 156, 2.2], ['brokenBoat', 47, 156, 1.0], ['kelp', 50, 40, 0.3], ['kelp', 64, 38, 1.8], ['stiltFrame', 40, 30, 0.4],
    ['towerB', 30, 70, 1.2], ['anchor', 62, 30, 0.7], ['cask', 52, 22, 0], ['crate', 59, 23, 0.4], ['driftwood', 60, 70, 0.9], ['barnacleRock', 72, 52, 0], ['whale', 40, 82, 0.4, 0.8]]) L.props.push({ t, x, z, r, s: s || 1 });
  L.start = { x: camp.x, z: camp.z };
  L.boss = { ...arena };
  return L;
}

let cur = null;
// builds a test layout in the world viewer's page, in place of its level (o: type, mode, props: lay every act6Prop kind
// out by the camp)
export async function show(o = {}) {
  await loadPack('rime').catch(() => {});
  const L = testLayout(o.type, o.mode, o.seed);
  if (cur) { R.scene.remove(cur.group); }
  // (the viewer's own level and props out of the way)
  for (const c of [...R.scene.children]) if (c.isGroup && c !== R.scene && !c.userData.keep6 && c.name !== 'auroraSky') { if (c.children.some((k) => k.isMesh || k.isGroup || k.isInstancedMesh)) R.scene.remove(c); }
  setAtmosphere(ATMOS[L.type]);
  const lvl = buildLevel(L, R.quality);
  R.scene.add(lvl.group);
  for (const l of L.lights) addLight(l);
  setEmitters(lvl.emitters);
  const props = [];
  if (o.props) {
    // every act6Prop kind in two rows by the camp, lit (and a light of the bench's own on each lit one: in the game its
    // pool is light.js's)
    const kinds = ['hearth6', 'brazier6', 'blackLamp', 'shadowWall', 'keel', 'skylight', 'toppledLight', 'stiltFrame', 'ropeWinch', 'gateRing', 'neckArch', 'hearthStone', 'nameLamp', 'wreckLantern', 'shipBell', 'lurePost', 'garland', 'emberPane', 'keyxLantern', 'bird'];
    kinds.forEach((k, i) => {
      const at = PROP_AT(k, L.type), m = act6Prop(k, k === 'nameLamp' ? { id: 'galini' } : k === 'wreckLantern' ? { keyx: true } : k === 'neckArch' ? { len: 8 } : k === 'garland' ? { len: 2 } : k === 'keel' ? { r: 1.4, window: true } : {});
      m.position.set(at.x, k === 'garland' ? 1.8 : k === 'bird' ? 1.6 : k === 'keyxLantern' ? 1.1 : 0, at.z); m.rotation.y = k === 'toppledLight' || k === 'neckArch' ? Math.PI / 2 : 0;
      R.scene.add(m); props.push({ k, x: at.x, z: at.z, m });
      const u = m.userData;
      u.setLit?.(true); u.setWarm?.(1); u.setGlow?.(1); u.setFire?.(true);
      // (the toppled light's at its lantern end, out along its length: at its base it stood inside the stone)
      if (k === 'toppledLight') { const a = m.rotation.y, la = u.lampAt; addLight({ x: at.x + Math.sin(a) * la.z + Math.cos(a) * la.x, y: 2.4, z: at.z + Math.cos(a) * la.z - Math.sin(a) * la.x, color: 0xffb060, intensity: 12, range: 7, flicker: 0.12 }); }
      else if (u.setLit || u.setFire || u.setWarm || u.setGlow) if (k !== 'blackLamp') addLight({ x: at.x, y: (u.fireY ?? 1.2) + 1.6, z: at.z, color: k === 'emberPane' ? 0xff6a30 : 0xffb060, intensity: 12, range: 7, flicker: 0.12 });
    });
  }
  cur = { L, lvl, group: lvl.group, props };
  window.__look6 = cur;
  return { w: L.w, h: L.h, sea: !!lvl.sea, seaQuads: lvl.sea?.children.length || 0, vault: !!lvl.act6?.vault, keels: lvl.act6?.keels, sky: lvl.act6?.sky.length, braziers: lvl.act6?.braziers.length, rope: !!lvl.act6?.rope, well: !!lvl.act6?.well, arch: !!lvl.act6?.arch, props: props.map((p) => p.k), ground: !!lvl.ground, groundKey: lvl.ground?.material.customProgramCacheKey?.(),
    marks: lvl.act6?.marks?.count || 0, drips: lvl.emitters.filter((e) => e.type === 'drips').length, darkMotes: lvl.emitters.filter((e) => e.type === 'motes' && e.dark).length };
}
// where each bench prop stands, on the bench's own floor (the Bottom's six metres further west); BENCH_VIEW how far the
// camera stands back from it (the big ones further)
const BENCH = {
  hearth6: [72, 90], brazier6: [77, 90], blackLamp: [82, 90], hearthStone: [87, 90], nameLamp: [92, 90], wreckLantern: [97, 90], shipBell: [102, 90],
  lurePost: [72, 97], garland: [77, 97], emberPane: [82, 97], keyxLantern: [87, 97], bird: [92, 97], ropeWinch: [97, 97],
  shadowWall: [79, 105], neckArch: [94, 106], keel: [74, 114], gateRing: [83, 114], skylight: [92, 113], stiltFrame: [100, 114], toppledLight: [84, 127]
};
export const BENCH_VIEW = { shadowWall: 13, neckArch: 13, keel: 12, gateRing: 10, skylight: 11, stiltFrame: 9, toppledLight: 14 };
export const PROP_AT = (k, type = 'drained') => { const b = BENCH[k] || [72, 90]; return { x: b[0] - (type === 'bottom' ? 6 : 0), z: b[1] }; };
// one frame drawn with the camera on (x, z): o.level, o.wet (the clock's water), o.mere (the Mere's own), o.slush
// ([[ix, iz]...] cells set to slush), o.dist, o.pitch, o.density, o.lookY, o.fireR (the hero's ring the First's marks show
// in, 4.5 m; light.js writes it in the game)
export function view(x, z, o = {}) {
  FIRE_U.uFireR.value = o.fireR ?? 4.5; FIRE_U.uFireP.value.set(x, z);
  if (o.level != null) { SEA.uLevel.value = o.level; SEA.uWetLevel.value = Math.max(o.level, o.wet ?? o.level); }
  if (o.mere != null) SEA.uBayLevel.value = o.mere;
  if (o.slush && cur) for (const [ix, iz] of o.slush) slushSet(cur.L, iz * cur.L.w + ix, true);
  if (o.dist) R.cam.dist = o.dist; if (o.pitch != null) R.cam.pitch = o.pitch;
  // (a cine's thinner fog, as ATMOS.drainedCine's 0.012, and its camera looking up: o.density, o.lookY)
  if (o.density != null) R.scene.fog.density = o.density;
  if (o.lookY != null) R.cam.lookY = o.lookY;
  WIND.uHero.value.set(x, 1, z);
  R.heroLight.position.set(x, 2.6, z); R.heroLight.intensity = R.heroLight.userData.base;
  for (let i = 0; i < 40; i++) updateFX(0.05, x, z);
  for (let i = 0; i < 2; i++) { frame(0.016); updateCamera(0.016, x, z, true); WIND.uTime.value += 0.016; R.heroLight.position.set(x, 2.6, z); render(); }
  return { x, z, fxQ: FX.q };
}
