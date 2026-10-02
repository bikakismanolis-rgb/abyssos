// Things on the ground: gold, items (with light beams by rarity), health globes, story shards.
import * as THREE from 'three';
import { G } from './state.js';
import { R, addLight, removeLight } from '../gfx/gfx.js';
import { G as GEO, staticGeo } from '../gfx/rig.js';
import { weaponGeo, shieldGeo } from '../gfx/models.js';
import { kitMesh } from '../gfx/kits.js';
import { P, sparks, glowBurst } from '../gfx/fx.js';
import { number } from '../ui/overlay.js';
import { emit } from '../ui/bus.js';
import Audio from '../audio/audio.js';
import { rand, fmt } from '../core/util.js';
import { healHero } from './combat.js';
import { addToBag } from './inventory.js';
import { itemName, itemColor, weaponLook } from './items.js';
import { t } from '../i18n/i18n.js';

const RCOL = [0xd8d4cc, 0x5a90ff, 0xf2d24a, 0xff7a1a];
let pickMat = null, beamTex = null;
function mat() { return pickMat ||= new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0x222222 }); }
function beamTexture() {
  if (beamTex) return beamTex;
  const c = document.createElement('canvas'); c.width = 32; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 128);
  const gx = g.createLinearGradient(0, 0, 32, 0); gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, 32, 128);
  beamTex = new THREE.CanvasTexture(c);
  return beamTex;
}
function itemMesh(item) {
  const col = RCOL[item.rar];
  let parts;
  const b = item.base;
  if (['sword', 'axe', 'mace', 'crossbow', 'staff'].includes(b)) parts = weaponGeo(b, weaponLook(item)).parts;
  else if (b === 'shield') parts = shieldGeo({ face: [0x3a3028, 0x2a4a7a, 0x6a5a20, 0x8a1a1a][item.rar] });
  else if (b === 'helm') parts = [{ geo: GEO.dome(0.22, 0.6), color: 0x8a909a, o: { metal: 1 } }, { geo: GEO.cyl(0.23, 0.23, 0.05, 10), color: col, o: { y: 0.02 } }];
  else if (b === 'chest') parts = [{ geo: GEO.cyl(0.26, 0.2, 0.4, 8), color: 0x7a7e88, o: { y: 0.2, sz: 0.6 } }, { geo: GEO.box(0.2, 0.3, 0.02), color: col, o: { y: 0.2, z: 0.13 } }];
  else if (b === 'gloves') parts = [{ geo: GEO.box(0.16, 0.22, 0.1), color: 0x5a4030, o: { y: 0.1, x: -0.1 } }, { geo: GEO.box(0.16, 0.22, 0.1), color: 0x5a4030, o: { y: 0.1, x: 0.12, rz: 0.3 } }, { geo: GEO.box(0.17, 0.05, 0.11), color: col, o: { y: 0.2, x: -0.1 } }];
  else if (b === 'boots') parts = [{ geo: GEO.box(0.14, 0.24, 0.26), color: 0x4a3020, o: { y: 0.12, x: -0.1 } }, { geo: GEO.box(0.14, 0.24, 0.26), color: 0x4a3020, o: { y: 0.12, x: 0.12 } }, { geo: GEO.box(0.15, 0.05, 0.27), color: col, o: { y: 0.22, x: -0.1 } }];
  else if (b === 'ring') parts = [{ geo: GEO.torus(0.12, 0.03, 4, 12), color: 0xc9a24a, o: { y: 0.12, metal: 1 } }, { geo: GEO.oct(0.05), color: col, o: { y: 0.25, glow: 1 } }];
  else if (b === 'amulet') parts = [{ geo: GEO.torus(0.16, 0.015, 3, 12), color: 0xc9a24a, o: { y: 0.03, rx: 1.57 } }, { geo: GEO.oct(0.08), color: col, o: { y: 0.06, z: 0.16, glow: 1 } }];
  else if (b === 'quiver') parts = [{ geo: GEO.cyl(0.08, 0.07, 0.5, 7), color: 0x5a3a20, o: { y: 0.25 } }, { geo: GEO.box(0.12, 0.08, 0.12), color: col, o: { y: 0.5 } }];
  else if (b === 'orb') parts = [{ geo: GEO.ico(0.16, 1), color: col, o: { y: 0.18, glow: 0.8 } }];
  else parts = [{ geo: GEO.box(0.3, 0.3, 0.3), color: col }];
  const m = new THREE.Mesh(staticGeo(parts), mat());
  if (['sword', 'axe', 'mace', 'staff'].includes(b)) { m.rotation.z = Math.PI / 2; m.position.y = 0.1; m.scale.setScalar(0.9); }
  if (b === 'crossbow') m.scale.setScalar(0.9);
  m.castShadow = true;
  return m;
}

function add(p) { G.pickups.push(p); if (p.mesh) R.scene.add(p.mesh); if (p.beam) R.scene.add(p.beam); return p; }
function launch(x, z, spread = 1.4) {
  const a = Math.random() * 6.283, d = rand.range(0.4, spread);
  return { x, z, y: 0.6, vx: Math.cos(a) * d * 1.6, vz: Math.sin(a) * d * 1.6, vy: rand.range(4, 6) };
}

export function dropGold(x, z, amount) {
  const p = launch(x, z, 1.2);
  const mesh = kitMesh('dungeon', amount > 60 ? 'coin_stack_medium' : 'coin_stack_small', 0.38);
  return add(Object.assign(p, { kind: 'gold', amount, mesh, t: 0 }));
}
export function dropItem(x, z, item) {
  const p = launch(x, z, 1.8);
  const mesh = new THREE.Group(); mesh.add(itemMesh(item));
  let beam = null, light = null;
  if (item.rar >= 1) {
    const h = item.rar === 3 ? 14 : item.rar === 2 ? 6 : 3;
    beam = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(item.rar === 3 ? 0.9 : 0.5, h), new THREE.MeshBasicMaterial({ map: beamTexture(), color: RCOL[item.rar], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: item.rar === 3 ? 1 : 0.7 }));
      pl.position.y = h / 2; pl.rotation.y = i * Math.PI / 2; beam.add(pl);
    }
    beam.visible = false;
  }
  if (item.rar === 3) light = addLight({ x, y: 1.5, z, color: 0xff8a2a, intensity: 18, range: 8, flicker: 0.1 });
  Audio.sfx(item.rar === 3 ? 'itemDropLegendary' : item.rar === 2 ? 'itemDropRare' : 'itemDrop', { x, z });
  if (item.rar === 3) { Audio.sting('legendary'); emit('legendaryDrop', item); }
  return add(Object.assign(p, { kind: 'item', item, mesh, beam, light, t: 0 }));
}
export function dropGlobe(x, z) {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshBasicMaterial({ color: 0xff3a2a }));
  const halo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), new THREE.MeshBasicMaterial({ color: 0xff2010, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
  mesh.add(halo);
  const p = launch(x, z, 1);
  return add(Object.assign(p, { kind: 'globe', mesh, t: 0 }));
}
export function dropShard(x, z) {
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0xff7a20 }));
  const light = addLight({ x, y: 1.2, z, color: 0xff6a10, intensity: 30, range: 10, flicker: 0.3 });
  return add({ kind: 'shard', x, z, y: 1.5, vx: 0, vz: 0, vy: 2, mesh, light, t: 0 });
}

function removePickup(p, i) {
  if (p.mesh) R.scene.remove(p.mesh);
  if (p.beam) { R.scene.remove(p.beam); p.beam.traverse((o) => { o.material?.dispose(); o.geometry?.dispose(); }); }
  if (p.light) removeLight(p.light);
  G.pickups.splice(i, 1);
}
export function clearPickups() { for (let i = G.pickups.length - 1; i >= 0; i--) removePickup(G.pickups[i], i); }

let fullWarn = 0;
export function updatePickups(dt) {
  const pl = G.player;
  fullWarn -= dt;
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const p = G.pickups[i];
    p.t += dt;
    if (p.y > 0 || p.vy > 0) {
      p.vy -= 18 * dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
      if (G.zone?.map && !G.zone.map.walkable(p.x, p.z)) { p.x -= p.vx * dt; p.z -= p.vz * dt; p.vx = p.vz = 0; }
      if (p.y <= 0) { p.y = 0; if (Math.abs(p.vy) > 3) { p.vy = -p.vy * 0.3; p.y = 0.001; } else p.vy = 0; if (p.vy === 0 && p.beam) p.beam.visible = true; }
    }
    const bob = p.kind === 'globe' || p.kind === 'shard' ? 0.4 + Math.sin(p.t * 3) * 0.12 : 0;
    p.mesh.position.set(p.x, p.y + bob, p.z);
    if (p.kind === 'item') p.mesh.rotation.y += dt * 0.5 * (p.y > 0 ? 6 : 0.3);
    if (p.kind === 'shard') { p.mesh.rotation.y += dt * 2; if (Math.random() < 0.3) P({ x: p.x, y: 1.6, z: p.z, vx: rand.range(-0.5, 0.5), vy: 1.5, vz: rand.range(-0.5, 0.5), life: 1, size: 0.12, size1: 0.02, color: 0xffa040, color1: 0xff3000 }); }
    if (p.beam) { p.beam.position.set(p.x, 0, p.z); p.beam.rotation.y += dt * 0.6; if (p.item.rar === 3 && Math.random() < 0.25) P({ x: p.x + rand.range(-0.3, 0.3), y: 0.2, z: p.z + rand.range(-0.3, 0.3), vy: rand.range(1.5, 3.5), life: 1.2, size: 0.12, size1: 0.02, color: 0xffc060, color1: 0xff5000 }); }
    if (p.light) { p.light.x = p.x; p.light.z = p.z; }
    if (!pl || pl.dead || G.mode !== 'play') continue;
    const dx = pl.x - p.x, dz = pl.z - p.z, d = Math.hypot(dx, dz);
    if (p.kind === 'gold' && p.y === 0) {
      if (d < 3) { p.x += (dx / d) * dt * 9; p.z += (dz / d) * dt * 9; }
      if (d < 0.7) { G.hero.gold += p.amount; number(pl.x, 2.6, pl.z, '+' + fmt(p.amount), 'gold'); Audio.sfx('gold', { vol: 0.7 }); emit('gold'); removePickup(p, i); }
    } else if (p.kind === 'globe' && p.t > 0.4) {
      if (d < 3.5) { p.x += (dx / d) * dt * 8; p.z += (dz / d) * dt * 8; }
      if (d < 0.8) { healHero(pl.hpMax * 0.25); glowBurst(pl.x, 1, pl.z, 0xff4030, 16, 2.5, 0.25, 0.6); Audio.sfx('heal'); removePickup(p, i); }
    } else if (p.kind === 'item' && p.y === 0 && p.t > 0.5 && d < 1.1) {
      if (addToBag(p.item)) {
        number(pl.x, 2.6, pl.z, itemName(p.item), 'text', itemColor(p.item));
        Audio.sfx('pickup'); emit('itemPicked', p.item);
        removePickup(p, i);
      } else if (fullWarn <= 0) { fullWarn = 4; emit('toast', t('hud.full')); Audio.sfx('denied'); }
    } else if (p.kind === 'shard' && d < 1.2 && p.t > 0.6) {
      sparks(p.x, 1, p.z, 30, 0xffc060, 5); Audio.sting('quest');
      emit('shard'); removePickup(p, i);
    }
  }
}
