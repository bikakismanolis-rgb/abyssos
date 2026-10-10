// Projectiles and lingering ground effects.
import * as THREE from 'three';
import { G } from './state.js';
import { R, addLight, removeLight } from '../gfx/gfx.js';
import { G as GEO, staticGeo } from '../gfx/rig.js';
import { P, sparks, glowBurst, explosion, hitFx, puff, ring, decal, splash } from '../gfx/fx.js';
import { damage } from './combat.js';
import { foes, near, makeAvatar } from './actors.js';
import { updateSap, clearSap, addSapPool } from './sap.js';
import { updateRemains, clearRemains } from './combat.js';
import { clearLight } from './light.js';
import { tickFlues } from './forge.js';
import { tickTide } from './tide.js';
import { tickIce } from './ice.js';
import Audio from '../audio/audio.js';
import { rand } from '../core/util.js';

let boltGeo = null, arrowGeo = null, pinGeo = null, harpoonGeo = null, pmat = null;
function meshFor(kind) {
  pmat ||= new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x111111 });
  if (kind === 'fireArrow') kind = 'arrow';
  // a Sunken Harpooner's harpoon: an ash shaft, a barbed iron head, a twist of rope at the butt
  if (kind === 'harpoon') return new THREE.Mesh(harpoonGeo ||= staticGeo([{ geo: GEO.cyl(0.024, 0.026, 1.5, 5), color: 0x6a5a44, o: { rx: Math.PI / 2 } }, { geo: GEO.cone(0.05, 0.22, 4), color: 0x5a5e62, o: { rx: Math.PI / 2, z: 0.84 } }, { geo: GEO.box(0.16, 0.012, 0.05), color: 0x5a5e62, o: { z: 0.7 } }, { geo: GEO.cyl(0.04, 0.04, 0.12, 6), color: 0x8a7a5a, o: { rx: Math.PI / 2, z: -0.68 } }]), pmat);
  if (kind === 'bolt' || kind === 'arrow' || kind === 'pin') {
    const g = kind === 'bolt' ? (boltGeo ||= staticGeo([{ geo: GEO.cyl(0.02, 0.02, 0.7, 4), color: 0x6a5038, o: { rx: Math.PI / 2 } }, { geo: GEO.cone(0.045, 0.14, 4), color: 0xc0c8d0, o: { rx: Math.PI / 2, z: 0.4 } }, { geo: GEO.box(0.12, 0.01, 0.12), color: 0xe0e0d8, o: { z: -0.3 } }]))
      : kind === 'pin' ? (pinGeo ||= staticGeo([{ geo: GEO.cyl(0.018, 0.018, 0.7, 4), color: 0x4a3a20, o: { rx: Math.PI / 2 } }, { geo: GEO.cone(0.045, 0.14, 4), color: 0xc09030, o: { rx: Math.PI / 2, z: 0.4 } }, { geo: GEO.box(0.14, 0.01, 0.16), color: 0x6ad040, o: { z: -0.28 } }, { geo: GEO.box(0.01, 0.14, 0.16), color: 0x6ad040, o: { z: -0.28 } }]))
      : (arrowGeo ||= staticGeo([{ geo: GEO.cyl(0.018, 0.018, 0.65, 4), color: 0x3a2a1a, o: { rx: Math.PI / 2 } }, { geo: GEO.cone(0.04, 0.12, 4), color: 0x5a5a5a, o: { rx: Math.PI / 2, z: 0.36 } }, { geo: GEO.box(0.1, 0.01, 0.1), color: 0x2a2a2a, o: { z: -0.28 } }]));
    return new THREE.Mesh(g, pmat);
  }
  return null;
}
// a see-through running copy of a creature (the Hart's phantom herd)
function ghost(model, scale) {
  try {
    const av = makeAvatar(model, { scale });
    for (const m of av.model.mats || [av.mat]) { m.transparent = true; m.opacity = 0.34; m.depthWrite = false; }
    av.setRim(0xfff4d0, 2.4); av.setTint(0xffffff, 0.6);
    R.scene.add(av.group);
    return av;
  } catch (e) { return null; }
}

const KIND = {
  bolt: { speed: 30, r: 0.45, life: 0.8, color: 0xffe0b0 },
  pierce: { speed: 34, r: 0.7, life: 0.8, color: 0xfff0c0, light: 0xffe0a0 },
  arcane: { speed: 15, r: 0.5, life: 1.4, color: 0xc070ff, light: 0xa050ff },
  fireball: { speed: 17, r: 0.6, life: 1.2, color: 0xff7a20, light: 0xff6a10 },
  mini: { speed: 14, r: 0.45, life: 0.6, color: 0xff7a20, light: 0xff6a10 },
  arrow: { speed: 17, r: 0.45, life: 1.4, color: 0xffffff },
  hex: { speed: 9, r: 0.45, life: 2, color: 0x70ff50, light: 0x40ff40 },
  web: { speed: 12, r: 0.7, life: 1.6, color: 0xe0e8f0 },
  spectral: { speed: 13, r: 1.0, life: 1.6, color: 0x7ad0ff, light: 0x60b0ff },
  gate: { speed: 10, r: 0.6, life: 2.2, color: 0xc060ff, light: 0x9040ff },
  ember: { speed: 15, r: 0.5, life: 1.3, color: 0xff8a30, light: 0xff6a10 },
  acid: { speed: 12, r: 0.55, life: 1.2, color: 0x9adf40, light: 0x60c020 },
  firewave: { speed: 14, r: 1.2, life: 1.4, color: 0xff6a20, light: 0xff5010 },
  // Act III: the Rootsworn's pinning arrow (slows, never roots) and the Hart's phantom herd
  pin: { speed: 18, r: 0.45, life: 1.4, color: 0x9aff70 },
  phantomHart: { speed: 20, r: 1.4, life: 1.4, color: 0xfff0d0, light: 0xffe0a0 },
  // Act IV: the Ash-Fallen bowmen's fire arrows leave a patch of fire where they land (the Cradle can drink it)
  fireArrow: { speed: 16, r: 0.45, life: 1.4, color: 0xffa040, light: 0xff6a10, patch: { r: 1.5, dur: 3 } },
  // Act V: the Sunken Harpooner's harpoon (walls stop it); the Walking Tower's Brine Spit, a glob of sea and slush that
  // lands a pool of slush (sap.js)
  harpoon: { speed: 16, r: 0.45, life: 0.8, color: 0xd0d8d8 },
  brineGlob: { speed: 12, r: 0.7, life: 1.4, color: 0xb8d8dc, pool: { r: 2.2, dur: 8, kind: 'slush' } }
};
const PASS_WALLS = new Set(['spectral', 'firewave', 'phantomHart']);

export function fire(kind, src, x, z, dir, o = {}) {
  const K = KIND[kind];
  const sp = o.speed ?? K.speed;
  const p = {
    kind, team: src.team === 'foe' ? 'foe' : 'hero', src, x, z, y: o.y ?? 1.2,
    vx: Math.sin(dir) * sp, vz: Math.cos(dir) * sp, life: o.life ?? K.life, r: o.r ?? K.r,
    dmg: o.dmg || 0, opts: o.opts || {}, pierce: o.pierce || 0, hit: new Set(), homing: o.homing || 0, onHit: o.onHit, onEnd: o.onEnd, t: 0
  };
  p.mesh = meshFor(kind);
  if (kind === 'phantomHart') p.av = ghost(o.model || 'silverhorn', o.scale || 1.15);
  if (p.mesh) { p.mesh.position.set(x, p.y, z); p.mesh.rotation.y = dir; R.scene.add(p.mesh); if (o.scale) p.mesh.scale.setScalar(o.scale); }
  if (K.light) p.light = addLight({ x, y: p.y, z, color: K.light, intensity: kind === 'fireball' ? 22 : 12, range: 7 });
  G.projs.push(p);
  return p;
}

function endProj(p, i, hitWall) {
  if (p.mesh) R.scene.remove(p.mesh);
  if (p.av) { p.av.dispose(); p.av = null; }
  if (p.light) removeLight(p.light);
  G.projs.splice(i, 1);
  p.onEnd?.(p.x, p.z, hitWall);
  const pa = KIND[p.kind].patch;
  if (pa && G.zone) { const f = G.zone.map.walkable(p.x, p.z) ? p : G.zone.map.nearestFloor(p.x, p.z, 2); area('fire', f.x, f.z, pa.r, pa.dur, { team: p.team, src: p.src, dmg: p.dmg * 0.22, tick: 0.5 }); }
  const po = KIND[p.kind].pool;
  if (po && G.zone) { addSapPool(p.x, p.z, p.poolR ?? po.r, p.poolDur ?? po.dur, p.src, po.kind); splash(p.x, p.z, 1); }
}

export function updateProjs(dt) {
  const map = G.zone?.map, pl = G.player;
  for (let i = G.projs.length - 1; i >= 0; i--) {
    const p = G.projs[i], K = KIND[p.kind];
    p.t += dt; p.life -= dt;
    if (p.homing && p.team === 'hero') {
      let best = null, bd = 64;
      for (const f of foes(p.x, p.z, 8)) { if (p.hit.has(f) || f.prop || f.disguised || f.keeper) continue; const d = (f.x - p.x) ** 2 + (f.z - p.z) ** 2; if (d < bd) { bd = d; best = f; } }
      if (best) {
        const sp = Math.hypot(p.vx, p.vz), want = Math.atan2(best.x - p.x, best.z - p.z), cur = Math.atan2(p.vx, p.vz);
        let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
        const na = cur + Math.max(-p.homing * dt, Math.min(p.homing * dt, d));
        p.vx = Math.sin(na) * sp; p.vz = Math.cos(na) * sp;
      }
    }
    const nx = p.x + p.vx * dt, nz = p.z + p.vz * dt;
    if (map && map.blocks(Math.floor(nx), Math.floor(nz)) && !PASS_WALLS.has(p.kind)) { endProj(p, i, true); continue; }
    p.x = nx; p.z = nz;
    if (p.mesh) { p.mesh.position.set(p.x, p.y, p.z); p.mesh.rotation.y = Math.atan2(p.vx, p.vz); }
    if (p.light) { p.light.x = p.x; p.light.y = p.y; p.light.z = p.z; }
    if (p.av) { p.av.group.position.set(p.x, 0, p.z); p.av.group.rotation.y = Math.atan2(p.vx, p.vz); p.av.update(dt, { speed: Math.hypot(p.vx, p.vz) }); p.av.setFlash(0.25 + Math.sin(p.t * 20) * 0.1); }
    // looks
    if (p.kind === 'phantomHart') {
      for (let k = 0; k < 3; k++) P({ x: p.x + rand.range(-0.8, 0.8), y: rand.range(0.3, 2.6), z: p.z + rand.range(-0.8, 0.8), vx: -p.vx * 0.08, vy: rand.range(0.2, 0.8), vz: -p.vz * 0.08, life: rand.range(0.4, 0.8), size: 0.3, size1: 0.05, color: 0xfff4d8, color1: 0xffb040 });
      if (Math.random() < 0.4) P({ add: false, x: p.x, y: 0.2, z: p.z, vy: 0.3, life: 1.2, size: 1.2, size1: 2.6, color: 0xd8d0c0, alpha: 0.18, alpha1: 0 });
    } else if (p.kind === 'pin') {
      if (Math.random() < 0.6) P({ x: p.x, y: p.y, z: p.z, life: 0.25, size: 0.12, size1: 0.02, color: 0xb0ff80 });
    } else if (p.kind === 'fireArrow') {
      P({ x: p.x, y: p.y, z: p.z, vx: -p.vx * 0.04, vy: rand.range(0.2, 0.6), vz: -p.vz * 0.04, life: 0.3, size: 0.35, size1: 0.05, color: 0xffc060, color1: 0xff3000 });
    } else if (p.kind === 'ember') {
      for (let k = 0; k < 2; k++) P({ x: p.x + rand.range(-0.1, 0.1), y: p.y + rand.range(-0.1, 0.1), z: p.z + rand.range(-0.1, 0.1), vx: -p.vx * 0.05, vy: rand.range(0.2, 0.8), vz: -p.vz * 0.05, life: rand.range(0.2, 0.4), size: 0.45, size1: 0.08, color: 0xffc060, color1: 0xff3000 });
    } else if (p.kind === 'acid') {
      P({ add: false, x: p.x, y: p.y, z: p.z, life: 0.3, size: 0.55, size1: 0.2, color: 0x8ad030, alpha: 0.9 });
      if (Math.random() < 0.5) P({ add: false, x: p.x, y: p.y, z: p.z, vy: -2, life: 0.5, size: 0.12, size1: 0.08, color: 0x6aa020, alpha: 0.9, grav: 9 });
    } else if (p.kind === 'firewave') {
      const px = Math.cos(Math.atan2(p.vx, p.vz)), pz = -Math.sin(Math.atan2(p.vx, p.vz));
      for (let k = -2; k <= 2; k++) P({ x: p.x + px * k * 0.5, y: 0.3 + Math.random() * 0.9, z: p.z + pz * k * 0.5, vy: rand.range(1, 2.5), life: 0.45, size: 0.55, size1: 0.1, color: 0xffc050, color1: 0xff3000 });
      if (Math.random() < 0.25) area('fire', p.x, p.z, 0.9, 2.5, { team: 'foe', src: p.src, dmg: p.dmg * 0.15, tick: 0.5 });
    } else if (p.kind === 'fireball' || p.kind === 'mini') {
      for (let k = 0; k < 3; k++) P({ x: p.x + rand.range(-0.15, 0.15), y: p.y + rand.range(-0.15, 0.15), z: p.z + rand.range(-0.15, 0.15), vx: -p.vx * 0.05, vy: rand.range(0.2, 1), vz: -p.vz * 0.05, life: rand.range(0.25, 0.45), size: p.kind === 'mini' ? 0.4 : 0.7, size1: 0.1, color: 0xffd070, color1: 0xff3a00 });
      if (Math.random() < 0.3) P({ add: false, x: p.x, y: p.y, z: p.z, vy: 0.5, life: 0.8, size: 0.4, size1: 1.0, color: 0x2a2220, alpha: 0.4 });
    } else if (p.kind === 'arcane' || p.kind === 'gate') {
      P({ x: p.x, y: p.y, z: p.z, life: 0.25, size: 0.6, size1: 0.1, color: 0xe0b0ff, color1: K.color });
      if (Math.random() < 0.6) P({ x: p.x, y: p.y, z: p.z, vx: rand.range(-1, 1), vy: rand.range(-1, 1), vz: rand.range(-1, 1), life: 0.4, size: 0.12, size1: 0.02, color: K.color });
    } else if (p.kind === 'hex') {
      P({ x: p.x, y: p.y, z: p.z, life: 0.3, size: 0.5, size1: 0.1, color: 0xb0ff80, color1: 0x208010 });
    } else if (p.kind === 'web') {
      P({ add: false, x: p.x, y: p.y, z: p.z, life: 0.3, size: 0.6, size1: 0.3, color: 0xe8eef4, alpha: 0.8 });
    } else if (p.kind === 'pierce') {
      for (let k = 0; k < 2; k++) P({ x: p.x - p.vx * dt * k * 0.5, y: p.y, z: p.z - p.vz * dt * k * 0.5, life: 0.35, size: 0.5, size1: 0.05, color: 0xfff0c0, color1: 0xffa040 });
    } else if (p.kind === 'spectral') {
      const px = Math.cos(Math.atan2(p.vx, p.vz)), pz = -Math.sin(Math.atan2(p.vx, p.vz));
      for (let k = -2; k <= 2; k++) P({ x: p.x + px * k * 0.45, y: 0.6 + Math.random() * 0.8, z: p.z + pz * k * 0.45, vy: 0.5, life: 0.4, size: 0.45, size1: 0.05, color: 0xb0e8ff, color1: 0x3070ff });
    } else if (p.kind === 'brineGlob') {
      P({ add: false, x: p.x, y: p.y, z: p.z, life: 0.25, size: 0.75, size1: 0.35, color: 0xa8c8cc, alpha: 0.85 });
      if (Math.random() < 0.6) P({ add: false, x: p.x, y: p.y, z: p.z, vx: rand.range(-0.5, 0.5), vy: -1.5, vz: rand.range(-0.5, 0.5), life: 0.5, size: 0.12, size1: 0.06, color: 0xd8ecf0, alpha: 0.9, grav: 9 });
    } else if (p.kind === 'bolt' && Math.random() < 0.5) P({ x: p.x, y: p.y, z: p.z, life: 0.15, size: 0.12, size1: 0.02, color: 0xffe8c0 });
    // hits
    let done = false;
    if (p.team === 'hero') {
      for (const f of foes(p.x, p.z, p.r)) {
        if (p.hit.has(f) || f.hidden) continue;
        p.hit.add(f);
        if (p.onHit) p.onHit(f, p); else damage(p.src, f, p.dmg, Object.assign({ kx: p.vx, kz: p.vz }, p.opts));
        if (p.pierce <= 0) { done = true; break; } p.pierce--;
      }
    } else if (pl && !pl.dead) {
      const targets = [pl, ...G.actors.filter((a) => a.pet && !a.dead)];
      for (const tg of targets) {
        if (p.hit.has(tg)) continue;
        const dx = tg.x - p.x, dz = tg.z - p.z, rr = p.r + tg.radius;
        if (dx * dx + dz * dz < rr * rr) {
          p.hit.add(tg);
          if (p.onHit) p.onHit(tg, p); else damage(p.src, tg, p.dmg, Object.assign({ kx: p.vx, kz: p.vz }, p.opts));
          if (!PASS_WALLS.has(p.kind)) { done = true; break; }
        }
      }
    }
    if (done || p.life <= 0) endProj(p, i, false);
  }
}

// ---------- areas: burning ground, arrow rain, webs, poison ----------
export function area(kind, x, z, r, dur, o = {}) {
  const a = { kind, x, z, r, dur, t: 0, tick: o.tick ?? 0.5, tickT: o.delay ?? 0, dmg: o.dmg || 0, team: o.team || 'hero', src: o.src, opts: o.opts || {}, vx: o.vx || 0, vz: o.vz || 0, hit: new Set(), floats: !!o.floats };
  if (kind === 'fire') a.light = addLight({ x, y: 0.6, z, color: 0xff6a10, intensity: o.floats ? 22 : 16, range: r * 3, flicker: 0.4 });
  // burning whale oil (Act V): a dark slick under the flames (it burns on water too: the decal fades under the sea, fx.js)
  if (kind === 'fire' && o.floats) decal(x, z, 'scorch', r * 2.1, dur);
  if (kind === 'tornado') a.light = addLight({ x, y: 1.2, z, color: 0xff7a20, intensity: 14, range: 6, flicker: 0.4 });
  if (kind === 'poison') decal(x, z, 'goo', r * 2, dur);
  if (kind === 'web') decal(x, z, 'ecto', r * 2, dur);
  if (kind === 'amberDust') a.light = addLight({ x, y: 0.8, z, color: 0xffc050, intensity: 8, range: r * 3, flicker: 0.3 });
  if (kind === 'coldFire') a.light = addLight({ x, y: 0.6, z, color: 0x9ab8ff, intensity: 8, range: r * 3, flicker: 0.3 });
  G.areas.push(a);
  return a;
}
const slowBy = (s, t, k) => { s.slow = Math.max(s.slow, t); s.slowK = Math.max(s.slowK, k); };
export function updateAreas(dt) {
  const pl = G.player;
  updateSap(dt);
  updateRemains(dt);
  tickFlues(dt);
  // Act V: the tide's steps, then the ice's loads and batches (a plunge is placed in its break's batch)
  tickTide(dt); tickIce(dt);
  for (let i = G.areas.length - 1; i >= 0; i--) {
    const a = G.areas[i];
    a.t += dt; a.tickT -= dt;
    // Act III areas with their own rules: glittering moth dust slows everyone in it; the Song of Sorrow is a ring that rolls outward
    if (a.kind === 'amberDust') {
      for (let k = 0; k < 2; k++) P({ x: a.x + rand.range(-a.r, a.r) * 0.8, y: rand.range(0.1, 1.8), z: a.z + rand.range(-a.r, a.r) * 0.8, vy: rand.range(-0.2, 0.2), life: rand.range(0.5, 1), size: 0.1, size1: 0.02, color: 0xffe080, color1: 0xc08020 });
      if (a.tickT <= 0) {
        a.tickT += 0.25;
        for (const f of near(a.x, a.z, a.r)) if (!f.dead && !f.prop && f.team === 'foe') slowBy(f.status, 0.4, 0.35);
        if (pl && !pl.dead && Math.hypot(pl.x - a.x, pl.z - a.z) < a.r + pl.radius * 0.5) slowBy(pl.status, 0.4, 0.35);
      }
    } else if (a.kind === 'wave') {
      const front = 0.2 + a.r * Math.sqrt(Math.min(1, a.t / a.dur)), prev = a.prev ?? 0; a.prev = front;
      for (let k = 0; k < 10; k++) { const ang = Math.random() * 6.28; P({ x: a.x + Math.sin(ang) * front, y: rand.range(0.1, 1.2), z: a.z + Math.cos(ang) * front, vy: 0.6, life: 0.4, size: 0.22, size1: 0.04, color: 0xffe090, color1: 0xff9020 }); }
      if (pl && !pl.dead && !a.done) {
        const d = Math.hypot(pl.x - a.x, pl.z - a.z);
        if (d <= front + pl.radius && d >= prev - pl.radius - 0.4) { a.done = true; damage(a.src, pl, a.dmg, Object.assign({ kx: pl.x - a.x, kz: pl.z - a.z }, a.opts)); }
      }
    }
    if (a.kind === 'amberDust' || a.kind === 'wave') { if (a.t > a.dur) { if (a.light) removeLight(a.light); G.areas.splice(i, 1); } continue; }
    if (a.vx || a.vz) { a.x += a.vx * dt; a.z += a.vz * dt; if (a.light) { a.light.x = a.x; a.light.z = a.z; } }
    // looks
    if (a.kind === 'fire') {
      if (Math.random() < 0.7) P({ x: a.x + rand.range(-a.r, a.r) * 0.8, y: 0.1, z: a.z + rand.range(-a.r, a.r) * 0.8, vy: rand.range(1, 2.5), life: rand.range(0.3, 0.6), size: 0.5, size1: 0.1, color: 0xffb040, color1: 0xff2a00 });
      // whale oil burns tall and sooty
      if (a.floats && a.t < a.dur) { P({ x: a.x + rand.range(-a.r, a.r) * 0.7, y: 0.15, z: a.z + rand.range(-a.r, a.r) * 0.7, vy: rand.range(1.5, 3.2), life: rand.range(0.4, 0.8), size: 0.75, size1: 0.15, color: 0xffc050, color1: 0xff3a00 }); if (Math.random() < 0.35) P({ add: false, x: a.x + rand.range(-a.r, a.r) * 0.5, y: 1.2, z: a.z + rand.range(-a.r, a.r) * 0.5, vy: rand.range(1, 2), life: 1.6, size: 0.6, size1: 1.8, color: 0x1a1612, alpha: 0.35, alpha1: 0 }); }
    }
    else if (a.kind === 'rain') {
      for (let k = 0; k < 2; k++) { const rx = a.x + rand.range(-a.r, a.r) * 0.85, rz = a.z + rand.range(-a.r, a.r) * 0.85; P({ x: rx, y: 6, z: rz - 1, vy: -26, vz: 4, life: 0.22, size: 0.18, size1: 0.12, color: 0xfff0d0, color1: 0xd0c0a0 }); if (Math.random() < 0.3) sparks(rx, 0.1, rz, 2, 0xe0d0b0, 2); }
    } else if (a.kind === 'poison') { if (Math.random() < 0.3) P({ add: false, x: a.x + rand.range(-a.r, a.r) * 0.7, y: 0.1, z: a.z + rand.range(-a.r, a.r) * 0.7, vy: 0.6, life: 1, size: 0.5, size1: 1.2, color: 0x6a9a20, alpha: 0.4 }); }
    else if (a.kind === 'tornado') { for (let k = 0; k < 3; k++) { const ang = a.t * 9 + k * 2.09, h = (a.t * 3 + k) % 2.6; P({ x: a.x + Math.cos(ang) * (0.3 + h * 0.3), y: h, z: a.z + Math.sin(ang) * (0.3 + h * 0.3), life: 0.3, size: 0.45, size1: 0.1, color: 0xffc060, color1: 0xff3000 }); } }
    else if (a.kind === 'frostOrb') { P({ x: a.x, y: 1, z: a.z, life: 0.2, size: 1.2 + Math.sin(a.t * 10) * 0.2, size1: 0.6, color: 0xc0f0ff, color1: 0x4090ff }); }
    else if (a.kind === 'web') { /* decal only */ }
    // Act IV: the ash Ivar's Long Road leaves behind him, and his dead lanterns' cold fire: both only slow
    else if (a.kind === 'ash') { if (Math.random() < 0.5) P({ add: false, x: a.x + rand.range(-a.r, a.r) * 0.7, y: 0.15, z: a.z + rand.range(-a.r, a.r) * 0.7, vy: 0.3, life: 1.2, size: 0.6, size1: 1.3, color: 0x6a6660, alpha: 0.35, alpha1: 0 }); }
    else if (a.kind === 'coldFire') { if (Math.random() < 0.6) P({ x: a.x + rand.range(-a.r, a.r) * 0.7, y: 0.1, z: a.z + rand.range(-a.r, a.r) * 0.7, vy: rand.range(0.6, 1.4), life: 0.6, size: 0.35, size1: 0.05, color: 0xd0e4ff, color1: 0x4a70c0 }); }
    if (a.tickT <= 0 && a.t <= a.dur) {
      a.tickT += a.tick;
      if (a.team === 'hero') {
        for (const f of foes(a.x, a.z, a.r)) damage(a.src || pl, f, a.dmg, Object.assign({ quiet: a.kind !== 'rain', noFx: a.kind === 'fire', dot: a.kind === 'fire', lohMul: 0.2, area: true }, a.opts));
      } else if (pl && !pl.dead) {
        const d = Math.hypot(pl.x - a.x, pl.z - a.z);
        if (d < a.r + pl.radius * 0.5) {
          if (a.kind === 'web') { pl.status.slow = Math.max(pl.status.slow, 0.4); pl.status.slowK = Math.max(pl.status.slowK, 0.55); }
          else if (a.kind === 'ash' || a.kind === 'coldFire') slowBy(pl.status, 0.6, a.kind === 'ash' ? 0.4 : 0.2);
          else if (a.kind === 'frostOrb') { /* explodes at the end */ }
          else damage(a.src, pl, a.dmg, Object.assign({ dot: a.kind === 'poison' || a.kind === 'fire' }, a.opts));
        }
      }
    }
    if (a.t > a.dur) {
      if (a.kind === 'frostOrb') {
        explosion(a.x, a.z, a.r, 0x9ad8ff, { smoke: 0x9ab8d0, shake: 0.12 });
        Audio.sfx('frost', { x: a.x, z: a.z });
        if (pl && Math.hypot(pl.x - a.x, pl.z - a.z) < a.r) damage(a.src, pl, a.dmg, { freeze: 1.2 });
      }
      if (a.light) removeLight(a.light);
      G.areas.splice(i, 1);
    }
  }
}
export function clearProjs() {
  for (let i = G.projs.length - 1; i >= 0; i--) { const p = G.projs[i]; if (p.mesh) R.scene.remove(p.mesh); if (p.light) removeLight(p.light); if (p.av) { p.av.dispose(); p.av = null; } }
  clearSap(); clearRemains(); clearLight();
  G.projs.length = 0;
  for (const a of G.areas) if (a.light) removeLight(a.light);
  G.areas.length = 0;
}
export { hitFx, puff, ring, glowBurst, sparks, explosion };
