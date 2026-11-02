// Act VI's layouts (docs/act6-contract.md, The level object L): the Drained Sea under the sea ice and the Bottom of the
// Gates under it, each in two readings, built again when the reading changes (world.js drainedMode, bottomMode):
//   genDrained(seed, { mode: 'mere' | 'dry' })   112 x 176, north at z 0 under the Farthest Light; 'dry' once the Ketos
//                                                is down: the Mere drained, the Well open at its centre
//   genBottom(seed, { mode: 'dark' | 'lit' })    104 x 200, the Well's Foot at the north, the First's Hearth at the south
//   ropeSpot(L)                                  where the rope hole stands on a farlight layout's Light's Skerry
// STAGE A: a placeholder of the right sizes, fields, spots and exits, so both zones load, travel and save before the real
// generators (the design's Zones section: the Old Shore, the Hollows, the Keels, the Heap; the stamped Barrow and Wood, the
// Village, the Stair) take their place here with tools/check-act6.mjs. Every field the contract names is present: the
// Act V arrays the Black Water's readers index (thick, window, deck, sea) zero-filled and never set, L.ice undefined (no
// ice mesh is built, ice.js never ticks), the bed dry everywhere (no pocket, no Mere water yet), no packs.
import { base, carveCircle, carveLine, blockCircle, distField } from './gen.js';
import { BED_DRY, terrain, circleCells } from './genlib.js';
import { firm } from './gen5.js';
import { RNG } from '../core/util.js';

// the fields both zones carry (zero, empty or dry until the generators fill them)
function underIce(L, type, seed, mode) {
  const { w, h } = L, N = w * h;
  return Object.assign(L, {
    type, seed, mode, tries: 1, low: new Uint8Array(N),
    bed: new Float32Array(N).fill(BED_DRY), vbed: new Float32Array((w + 1) * (h + 1)).fill(BED_DRY),
    pocket: new Uint8Array(N), vault: new Uint8Array(N), keel: new Uint8Array(N),
    thick: new Uint8Array(N), window: new Uint8Array(N), deck: new Uint8Array(N), sea: new Uint8Array(N),
    tideCfg: { phases: [40, 27, 26, 27], stepT: 4.5, hMax: 0.9 }, refuges: []
  });
}
// the walls' heights (the vault's sides rising off the floor) and the distance field the ground reads
function finish(L) {
  L.dist = distField(L, 12);
  L.hgt = terrain(L, L.cells, L.dist, (d) => Math.min(9, 1.4 + d * 0.85));
  L.spots.vaults ||= []; L.spots.casks ||= [];
  return L;
}
// a road that wanders a little with the seed between its points
function road(L, rng, pts, r) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], mx = (a.x + b.x) / 2 + rng.range(-5, 5), mz = (a.z + b.z) / 2;
    carveLine(L, a.x, a.z, mx, mz, r, 1); carveLine(L, mx, mz, b.x, b.z, r, 1);
  }
}

export function genDrained(seed, o = {}) {
  const mode = o.mode === 'dry' ? 'dry' : 'mere', w = 112, h = 176, rng = RNG(seed * 13 + 6);
  const L = underIce(base(w, h), 'drained', seed, mode), S = L.spots;
  const camp = { x: 56, z: 18, r: 9 }, heap = { x: 58, z: 146, r: 20 };
  carveCircle(L, camp.x, camp.z, camp.r);
  road(L, rng, [{ x: camp.x, z: camp.z + 4 }, { x: 40, z: 64 }, { x: 34, z: 108 }, { x: heap.x, z: heap.z - heap.r + 1 }], 2.4);
  carveCircle(L, heap.x, heap.z, heap.r - 1);
  // the Mere at the Heap's centre: deep before the Ketos falls (closed, a pit), dry after, with the Well's mouth
  const mere = { x: heap.x, z: heap.z, r: 10, core: 5, lure: { x: heap.x, z: heap.z - 6 } };
  if (mode === 'mere') for (const [x, z] of circleCells(L, mere.x, mere.z, mere.r)) { const i = z * w + x; L.cells[i] = 0; L.low[i] = 1; }
  else blockCircle(L, mere.x, mere.z, 1.5);
  // the camp's brazier (Tamarisk's, burning from the build)
  const br = { x: camp.x + 3.5, z: camp.z - 2 };
  blockCircle(L, br.x, br.z, 0.5);
  L.props.push({ t: 'brazier', x: br.x, z: br.z });
  L.lights.push({ x: br.x, y: 1.6, z: br.z, color: 0xff9a50, intensity: 24, range: 13, flicker: 0.35 });
  Object.assign(S, {
    camp, rope: { x: camp.x, z: camp.z - 4 }, waypoint: { x: camp.x - 3, z: camp.z + 2 }, braziers: [br],
    heap: { ...heap, gap: { x: heap.x, z: heap.z - heap.r + 1.5 } }, mere, well: { x: mere.x, z: mere.z, r: 2 }
  });
  L.start = { x: camp.x, z: camp.z };
  L.boss = { ...heap };
  L.exits.push({ x: S.rope.x, z: S.rope.z, to: 'farlight', label: 'exit.ropeUp' });
  if (mode === 'dry') L.exits.push({ x: S.well.x, z: S.well.z, to: 'bottom', label: 'exit.well', locked: 'ketosDown' });
  return finish(L);
}

export function genBottom(seed, o = {}) {
  const mode = o.mode === 'lit' ? 'lit' : 'dark', w = 104, h = 200, rng = RNG(seed * 17 + 9);
  const L = underIce(base(w, h), 'bottom', seed, mode), S = L.spots;
  const camp = { x: 52, z: 16, r: 8 }, hearth = { x: 52, z: 176, r: 14 };
  carveCircle(L, camp.x, camp.z, camp.r);
  road(L, rng, [{ x: camp.x, z: camp.z + 4 }, { x: 40, z: 70 }, { x: 64, z: 128 }, { x: hearth.x, z: hearth.z - hearth.r + 1 }], 2.4);
  carveCircle(L, hearth.x, hearth.z, hearth.r);
  // the Saltborn's fire-pit at the Well's Foot (Glaukos lights it on arrival: from the build here); the First's stone and
  // fire at the Hearth's centre (a blocked 2 x 2); the Gate ring on its south rim at r 11
  const pit = { x: camp.x - 3, z: camp.z + 1.5 };
  L.props.push({ t: 'firepit', x: pit.x, z: pit.z });
  L.lights.push({ x: pit.x, y: 1.2, z: pit.z, color: 0xff9a50, intensity: 22, range: 12, flicker: 0.35 });
  for (const [x, z] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) L.cells[(Math.floor(hearth.z) + z) * w + Math.floor(hearth.x) + x] = 0;
  const ring = { x: hearth.x, z: hearth.z + 11, rot: 0 };
  Object.assign(S, {
    camp, well: { x: camp.x, z: camp.z - 4 }, waypoint: { x: camp.x + 3, z: camp.z + 2 }, pit, pots: [],
    hearth: { ...hearth, fire: { x: hearth.x, z: hearth.z }, ring }
  });
  L.start = { x: camp.x, z: camp.z };
  L.boss = { ...hearth };
  L.exits.push({ x: S.well.x, z: S.well.z, to: 'drained', label: 'exit.well' });
  L.exits.push({ x: ring.x, z: ring.z, to: 'town', at: 'staff', label: 'exit.gateUp', locked: 'herFire' });
  return finish(L);
}

// the rope hole on the Light's Skerry (a farlight layout, gen5 genFarlight): a firm walkable cell of its core, its 3 x 3
// round it walkable too, 2.5 m or more from the door-stone's interact (world.js act5Zone: the door's x + 1.2, z - 0.6) and 3
// m from Selna's pad, clear of the keepers' line and Tern's spot, nearest the core's north-west quarter. Only props and an
// exit interact stand there: no cell opens or closes, so no saved seed's layout changes. null: none (check-act6 fails it)
export function ropeSpot(L) {
  const S = L.spots, c = S?.core, d = S?.farLight?.door; if (!c || !d) return null;
  const door = { x: d.x + 1.2, z: d.z - 0.6 }, pad = S.selnaPad, keep = [...(S.npcs?.keepers || []), S.npcs?.tern, { x: d.x, z: d.z - 0.4 }].filter(Boolean);
  const want = { x: c.x - 2.5, z: c.z - 3 }, ok = (x, z) => x >= 0 && z >= 0 && x < L.w && z < L.h && !!L.cells[z * L.w + x] && firm(L, x + 0.5, z + 0.5);
  let best = null, bd = 1e9;
  for (const [x, z] of circleCells(L, c.x, c.z, c.r - 1.5)) {
    const px = x + 0.5, pz = z + 0.5;
    if (Math.hypot(px - door.x, pz - door.z) < 2.5 || (pad && Math.hypot(px - pad.x, pz - pad.z) < 3)) continue;
    if (keep.some((k) => Math.hypot(px - k.x, pz - k.z) < 1.8)) continue;
    let all = true;
    for (let dz = -1; dz <= 1 && all; dz++) for (let dx = -1; dx <= 1; dx++) if (!ok(x + dx, z + dz)) { all = false; break; }
    if (!all) continue;
    const dd = Math.hypot(px - want.x, pz - want.z);
    if (dd < bd) { bd = dd; best = { x: px, z: pz }; }
  }
  return best;
}
