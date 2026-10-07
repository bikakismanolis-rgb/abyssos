// The hero's per-frame update: input, actions, movement, resources, visuals.
import * as THREE from 'three';
import { G } from './state.js';
import { CLASSES, SKILLS } from './data.js';
import { IN, takeEvents } from '../core/input.js';
import { basicAttack, useSkill, dodge, drinkPotion, updateAction, trailOn, nearestFoe } from './skills.js';
import { tickStatus, moveMul, rootHero, tickCling } from './combat.js';
import { sapAt } from './sap.js';
import { tickLight } from './light.js';
import { foes } from './actors.js';
import { Trail, P } from '../gfx/fx.js';
import { R } from '../gfx/gfx.js';
import { emit } from '../ui/bus.js';
import Audio from '../audio/audio.js';
import { dampAngle, angleTo, clamp } from '../core/util.js';

const VB = new THREE.Vector3(), VT = new THREE.Vector3();
let stepAcc = 0, lastHit = 0;

export function updatePlayer(dt) {
  const pl = G.player, s = G.stats, C = CLASSES[G.hero.cls];
  if (!pl) return;
  const av = pl.avatar;
  if (pl.dead) { av.update(dt, { speed: 0 }); pl.trail?.push(VB, VT, false); return; }
  const x0 = pl.x, z0 = pl.z, zone0 = G.zone;

  // timers
  pl.iframes = Math.max(0, (pl.iframes || 0) - dt);
  pl.comboT -= dt;
  for (let i = 0; i < pl.cds.length; i++) pl.cds[i] = Math.max(0, pl.cds[i] - dt);
  pl.dodgeCd = Math.max(0, pl.dodgeCd - dt); pl.potionCd = Math.max(0, pl.potionCd - dt);
  for (const k in pl.buffs) { pl.buffs[k] -= dt; if (pl.buffs[k] <= 0) delete pl.buffs[k]; }
  tickStatus(pl, dt);
  // Act IV: Ember Ticks on her back burn and slow her (a dodge throws them off: skills.js)
  tickCling(dt);
  // regeneration; fury drains only when out of combat
  pl.hp = Math.min(pl.hpMax, pl.hp + (s.regen + pl.hpMax * 0.004) * dt);
  lastHit += dt;
  if (C.resRegen > 0) pl.res = Math.min(s.resMax, pl.res + s.resRegen * dt);
  else if (lastHit > 3) pl.res = Math.max(0, pl.res + C.resRegen * dt);

  // input
  const busyHard = pl.act && (pl.act.name === 'leap' || pl.act.name === 'roll' || pl.act.name === 'blink');
  for (const ev of takeEvents()) {
    if (G.panel) continue;
    if (ev.t === 'skill') {
      if (busyHard) continue;
      if (ev.i === 0) { if (!pl.act || pl.act.name !== 'basic') basicAttack(ev); }
      else if (useSkill(ev.i, ev)) lastHit = 0;
    } else if (ev.t === 'dodge') dodge(ev);
    else if (ev.t === 'potion') drinkPotion();
    else if (ev.t === 'tapAttack') { if (!pl.act) basicAttack(ev.aim ? { aim: ev.aim } : null); }
    else if (ev.t === 'interact') emit('interact');
    else if (ev.t === 'key') emit('key', ev.k);
  }
  // held attack keeps chaining
  if (!pl.act && IN.attack && !G.panel) {
    const ev = IN.mouseAim ? { aim: IN.mouseAim } : null;
    basicAttack(ev);
  }
  if (pl.act) { if (pl.act.name === 'basic' || pl.act.name === 'whirl') lastHit = Math.min(lastHit, 0.5); updateAction(dt); }

  // amber sap: it slows the hero (moveMul), and staying in it for 1.5 s sets her fast (rootHero); out of it the build-up drains
  const st = pl.status, airborne = (pl.y || 0) > 0.2 || (pl.act && (pl.act.name === 'roll' || pl.act.name === 'blink'));
  pl.onSap = !airborne && sapAt(pl.x, pl.z);
  if (pl.onSap && !(st.root > 0)) { st.stick += dt; if (st.stick >= 1.5) { st.stick = 0; rootHero(1.2); } }
  else if (!pl.onSap) st.stick = Math.max(0, st.stick - dt * 3);
  if ((st.root > 0) !== !!pl.amberTint) { pl.amberTint = st.root > 0; av.setTint(0xffb040, pl.amberTint ? 0.55 : 0); }
  if (st.root > 0 && Math.random() < 0.4) P({ x: pl.x + (Math.random() - 0.5) * 0.7, y: Math.random() * 0.8, z: pl.z + (Math.random() - 0.5) * 0.7, vy: 0.2, life: 0.5, size: 0.12, size1: 0.02, color: 0xffd080 });

  // movement
  const m = moveMul(pl);
  let mx = IN.mx, mz = IN.mz;
  if (G.panel) mx = mz = 0;
  // dragged by Karthax's tongs: no say in where she goes until it is over
  if (pl.pull) {
    const T = pl.pull; T.t -= dt; const u = clamp(1 - T.t / T.t0, 0, 1);
    pl.x = T.sx + (T.x - T.sx) * u; pl.z = T.sz + (T.z - T.sz) * u; mx = mz = 0;
    if (Math.random() < 0.6) P({ add: false, x: pl.x, y: 0.15, z: pl.z, vy: 0.3, life: 0.5, size: 0.4, size1: 0.9, color: 0x4a4038, alpha: 0.4 });
    if (T.t <= 0) pl.pull = null;
  }
  let speed = 0;
  if (!pl.act || pl.act.move) {
    const k = pl.act ? pl.act.move : 1;
    const sp = pl.speed * m * k;
    pl.x += mx * sp * dt; pl.z += mz * sp * dt;
    speed = Math.hypot(mx, mz) * sp;
    if (speed > 0.2 && (!pl.act || pl.act.name === 'whirl')) pl.rot = dampAngle(pl.rot, Math.atan2(mx, mz), 14, dt);
    // move-cancel the tail of an attack
  } else if (pl.act && pl.act.name === 'basic' && Math.hypot(mx, mz) > 0.5 && pl.act.t > pl.act.dur * 0.7) { pl.act = null; av.anim.stop?.(0.12); }
  // knockback and collisions
  if (pl.kx || pl.kz) { pl.x += pl.kx * dt; pl.z += pl.kz * dt; pl.kx *= Math.exp(-dt * 8); pl.kz *= Math.exp(-dt * 8); if (Math.abs(pl.kx) + Math.abs(pl.kz) < 0.05) pl.kx = pl.kz = 0; }
  for (const f of foes(pl.x, pl.z, 1.5)) {
    if (f.prop || f.status.freeze > 0 && false) continue;
    const dx = pl.x - f.x, dz = pl.z - f.z, d = Math.hypot(dx, dz), min = pl.radius + f.radius * 0.85;
    if (d < min && d > 0.001) {
      let push = (min - d) * (f.boss || f.def.big ? 1 : 0.6);
      // a body never shoves her past a wall face (Karthax's would put her centre in the Anvil's rim)
      push *= G.zone.map.castT(pl.x, pl.z, pl.x + (dx / d) * push, pl.z + (dz / d) * push);
      pl.x += (dx / d) * push; pl.z += (dz / d) * push;
    }
  }
  const map = G.zone.map;
  map.collide(pl, pl.radius);
  // never left inside the rock, whatever put her there: back where she stood this frame, or out to the nearest floor
  if (!map.walkable(pl.x, pl.z)) {
    const f = G.zone === zone0 && map.walkable(x0, z0) ? { x: x0, z: z0 } : map.nearestFloor(pl.x, pl.z, 48);
    if (map.walkable(f.x, f.z)) { pl.x = f.x; pl.z = f.z; } else { pl.x = G.zone.L.start.x; pl.z = G.zone.L.start.z; }
    pl.kx = pl.kz = 0;
  }

  // visuals
  av.group.position.set(pl.x, pl.y || 0, pl.z);
  av.group.rotation.y = pl.rot;
  av.update(dt, { speed, runSpeed: pl.speed, walkSpeed: 2.2, runNat: 5.2 });
  pl.flash = Math.max(0, pl.flash - dt * 4);
  av.setFlash(pl.flash * 0.6 + (pl.iframes > 0 && pl.act?.name === 'roll' ? 0 : 0));
  if (!pl.trail) pl.trail = new Trail(G.hero.equip.weapon?.rar === 3 ? 0xffa040 : 0xd8e8ff);
  const h = av.held.R;
  if (h && G.hero.cls === 'warden') { av.weaponPoint('R', h.base ?? 0.15, VB); av.weaponPoint('R', h.tip ?? 1, VT); pl.trail.push(VB, VT, trailOn(pl.act)); }
  // footsteps
  if (speed > 1 && !pl.act) { stepAcc += dt * speed; if (stepAcc > 2.4) { stepAcc = 0; Audio.sfx('footstep', { vol: 0.35 }); } }
  // buffs glow
  if (pl.buffs.cry > 0 && Math.random() < 0.3) P({ x: pl.x + (Math.random() - 0.5) * 0.8, y: Math.random() * 1.8, z: pl.z + (Math.random() - 0.5) * 0.8, vy: 1.2, life: 0.6, size: 0.1, size1: 0.02, color: 0xff6030 });
  if (pl.buffs.memory > 0 && Math.random() < 0.25) P({ x: pl.x + (Math.random() - 0.5) * 0.9, y: Math.random() * 2, z: pl.z + (Math.random() - 0.5) * 0.9, vy: 0.7, life: 0.9, size: 0.09, size1: 0.02, color: 0xffe0a0, color1: 0xffa030 });
  // Seen: a cold eye's glint over her head
  if (pl.buffs.seen > 0 && Math.random() < 0.2) P({ x: pl.x + (Math.random() - 0.5) * 0.4, y: 2.3, z: pl.z + (Math.random() - 0.5) * 0.4, vy: 0.3, life: 0.5, size: 0.14, size1: 0.02, color: 0xd8e8ff, color1: 0x6080c0 });
  if (pl.shield > 0 && Math.random() < 0.4) P({ x: pl.x + Math.sin(R.time * 5) * 0.7, y: 1 + Math.sin(R.time * 3) * 0.6, z: pl.z + Math.cos(R.time * 5) * 0.7, life: 0.4, size: 0.15, size1: 0.02, color: 0xffd080 });
  // hero light follows
  R.heroLight.position.set(pl.x, 2.6 + (pl.y || 0), pl.z + 0.4);
  R.heroLight.intensity = (R.heroLight.userData.base ?? 30) * (0.94 + Math.sin(R.time * 9) * 0.03 + Math.sin(R.time * 23) * 0.03);
  // Act IV: on the Field of Ash and in the Forge her light is the Ember Cradle's (light.js: the ring, the hip, the drinking)
  tickLight(dt);
  // in combat?
  G.inCombat = lastHit < 4 || foes(pl.x, pl.z, 9).some((f) => f.aggro && !f.prop);
}
export function heroAttacked() { lastHit = 0; }
export { nearestFoe, SKILLS, clamp, angleTo };
