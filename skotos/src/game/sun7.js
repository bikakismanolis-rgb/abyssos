// Act VII: Sun and Shade, the clouds (docs/act7-contract.md, Sun and Shade, U1-U12; docs/act7-design/
// 30-mechanics-progression.md). The Meltwaters and the Hanging Lake are 'sun' zones (world.js ZONES[id].light, light.js):
// everything is in sun but a cell the layout marks (L.shade) and the ground under a cloud. This file sails the clouds.
//   the clock   z.sunT, seconds, 0 when the host's zone is made, advanced by sunTick, back to 0 at 600 (every line's
//               period divides it: 50, 100 and 120 s). A cloud's place is gen7's cloudAt(seed line, z.sunT) and nothing
//               else, so two pages with the same clock draw the same clouds (U3). Co-op: the host sends z.sunT, the guest
//               calls setSunT(z, t)
//   which       HAZ7.clouds of the layout's wandering lines (L.clouds without `scripted` or `dam`), in the generator's
//               order with its `extra` lines last; every `dam` line (the Dam's two, Kelados's ground) on top of that
//               count; a `scripted` line (weir 3's) waits where it starts, over its ice block, until a hero comes within
//               24 m of it (or cloudStart), runs its line once and is gone
//   never       over an L.noCloud cell (the Den): a cloud whose disc would cover one is off for that stretch, no shade and
//               no disc (the generator's lines keep clear of them; this is the rule kept at run time too)
//   a cloud     is a light pool with p.shade and no light or decal of its own (light.js addLightPool, shadeAt), and one of
//               build7's cloud discs drawn over the ground it darkens
// z.shadeAt(x, z) and z.cloudAt(x, z) are put on the zone for the others (forge.js corniceShade, the creatures).
// Bus: 'sunShade' (inShade, underCloud, z) when the hero's own shade changes; 'hint7', 'sun' | 'shade', once each a page.
import { G } from './state.js';
import { R, setAtmosphere } from '../gfx/gfx.js';
import { ATMOS, mixAtmos } from '../world/atmos.js';
import { cloudAt as lineAt } from '../world/gen7.js';
import { cloudDisc } from '../world/build7.js';
import { addLightPool, removeLightPool, lightPools, lightKind, shadeAt, sunAt } from './light.js';
import { actHaz } from './data.js';
import Audio from '../audio/audio.js';
import { emit } from '../ui/bus.js';
import { NET } from '../net/state.js';

export { shadeAt, sunAt };
export const SUN = { period: 600, ease: 0.4, reach: 24, far: 70, hinted: {} };
// the disc is drawn this much wider than the cloud's radius: its shader fades from 0.6 of its own radius to nothing at
// about 0.93, so the rule's edge (c.r) lies half-way down that fade, where the eye puts a soft shadow's edge, and not on
// its last faint rim (at 1.0 the rule reached 1 m past anything that could be seen)
const DISC_K = 1.35;
const wrapT = (t) => ((t % SUN.period) + SUN.period) % SUN.period;

// ---------- which clouds, and where each is ----------
// the lines a zone sails at this difficulty (pure: the layout and a number)
export function cloudLines(L, n) {
  const all = L?.clouds || [], roam = all.filter((c) => !c.scripted && !c.dam);
  return [...[...roam.filter((c) => !c.extra), ...roam.filter((c) => c.extra)].slice(0, Math.max(0, n)), ...all.filter((c) => c.dam), ...all.filter((c) => c.scripted)];
}
// would a disc of r at (x, z) cover a cell no cloud may cover (the generator's own test, cloudFaults)
function barred(N, x, z, r) {
  if (!N || x + r < N.x0 || x - r > N.x1 || z + r < N.z0 || z - r > N.z1) return false;
  const C = N.cells, r2 = r * r;
  for (let i = 0; i < C.length; i += 2) if ((C[i] + 0.5 - x) ** 2 + (C[i + 1] + 0.5 - z) ** 2 <= r2) return true;
  return false;
}
// where a cloud is at clock t, and whether it is there at all: { x, z, off }. Pure: the page's own pools are not read
// (a scripted one: start is the clock it set off at, null while it waits, -1 once it has gone)
export function cloudPos(L, c, t, start = null, N = noCloud(L)) {
  let p, off = false;
  if (c.scripted) {
    if (start == null) p = lineAt(c, -c.t0);
    else { const el = start < 0 ? Infinity : wrapT(t - start); off = el * c.speed >= c.len; p = lineAt(c, off ? -c.t0 : el - c.t0); }
  } else p = lineAt(c, t);
  if (!off && barred(N, p.x, p.z, c.r)) off = true;
  return { x: p.x, z: p.z, off };
}
// the layout's barred cells as a flat list and their box (kept on the layout: it never changes)
function noCloud(L) {
  if (!L) return null;
  if (L._noCloud !== undefined) return L._noCloud;
  const nc = L.noCloud, cells = [];
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  if (nc) for (let i = 0; i < nc.length; i++) if (nc[i]) { const x = i % L.w, z = (i / L.w) | 0; cells.push(x, z); if (x < x0) x0 = x; if (x + 1 > x1) x1 = x + 1; if (z < z0) z0 = z; if (z + 1 > z1) z1 = z + 1; }
  Object.defineProperty(L, '_noCloud', { value: cells.length ? { cells, x0, x1, z0, z1 } : null, enumerable: false, writable: true });
  return L._noCloud;
}

// ---------- entering, leaving ----------
// on every entry to a 'sun' zone (world.js act7Enter, after the light of the last zone is cleared): the clock, the clouds
// for this difficulty, their pools and discs, the zone's two questions
export function sunEnter(z) {
  if (!z) return;
  drop(z);
  if (!z.L?.clouds || (z === G.zone && lightKind() !== 'sun')) return;
  z.sunT = wrapT(z.sunT ?? 0);
  const S = z.sun = { clouds: [], k: 0, cloud: false, shade: false, base: null, hold: false, started: z.sun?.started || {} };
  const lines = cloudLines(z.L, actHaz(7, G.hero?.diff ?? 1).clouds ?? 3);
  for (const c of lines) {
    const mesh = cloudDisc(c.r * DISC_K);
    mesh.visible = false; mesh.userData.setShimmer(!G.settings?.flicker);
    z.extra.push(mesh); if (z === G.zone) R.scene.add(mesh);
    S.clouds.push({ id: c.id, c, r: c.r, x: 0, z: 0, off: true, pool: null, mesh, scripted: !!c.scripted, dam: !!c.dam });
  }
  z.shadeAt = (x, zz) => (z === G.zone ? shadeAt(x, zz) : false);
  z.cloudAt = (x, zz) => { for (const q of S.clouds) if (!q.off && (q.x - x) ** 2 + (q.z - zz) ** 2 < q.r * q.r) return q; return null; };
  Audio.mood({ shade: 0 });
  place(z, true);
}
// leaving (the discs go with the zone's own meshes, z.extra; the pools with clearLight): the sky and the music as in sun
export function sunLeave(z) {
  const S = z?.sun; if (!S) return;
  if (S.k > 0 && !S.hold && z === G.zone) { const A = rows(z, S); if (A) setAtmosphere(A[0]); }
  S.k = 0;
  if (S.cloud) Audio.mood({ shade: 0 });
  if (S.shade || S.cloud) emit('sunShade', false, false, z);
  S.shade = S.cloud = false;
  for (const q of S.clouds) { if (q.pool) removeLightPool(q.pool); q.pool = null; q.mesh.visible = false; }
}
function drop(z) {
  const S = z.sun; if (!S) return;
  sunLeave(z);
  for (const q of S.clouds) {
    const i = z.extra.indexOf(q.mesh); if (i >= 0) z.extra.splice(i, 1);
    q.mesh.parent?.remove(q.mesh);
    q.mesh.traverse?.((o) => { o.geometry?.dispose?.(); if (o.material?.userData?.own) o.material.dispose(); });
  }
  S.clouds.length = 0;
}

// ---------- the clock ----------
// co-op: the host's clock (its snapshot's o.w[7], tenths of a second)
export function setSunT(z, t) { if (!z) return; z.sunT = wrapT(+t || 0); if (z.sun && z === G.zone) place(z, true); }
// a scripted cloud set off (weir 3's): at clock t it leaves where it waited, runs its line once and is gone
export function cloudStart(z, id, t = z?.sunT) { const S = z?.sun; if (!S || S.started[id] != null) return false; S.started[id] = wrapT(t || 0); return true; }

// every cloud to its place for z.sunT: its pool (the rule), then its disc (the look: 2 nearest at quality 0)
function place(z, force = false) {
  const S = z.sun, L = z.L, N = noCloud(L), live = z === G.zone, pools = live ? lightPools() : null;
  for (const q of S.clouds) {
    const st = q.scripted ? S.started[q.id] ?? null : null;
    const p = cloudPos(L, q.c, z.sunT, st, N);
    // (a scripted cloud that has run its line never comes back in this visit, whatever the clock does after)
    if (q.scripted && st != null && st >= 0 && p.off) S.started[q.id] = -1;
    q.x = p.x; q.z = p.z; q.off = p.off;
    if (!live) continue;
    // (clearLight takes every pool on the way in and out of a zone: a cloud's is made again when it is missing)
    if (!q.pool || !pools.includes(q.pool)) q.pool = addLightPool(q.x, q.z, q.r, Infinity, 'cloud', { shade: true, fx: false });
    q.pool.x = q.x; q.pool.z = q.z; q.pool.r = q.pool.r0 = q.off ? 0 : q.r;
  }
  if (!live) return;
  // the discs: only those near enough to be seen; at quality 0 the two nearest the camera
  const cx = R.cam?.x ?? G.player?.x ?? 0, cz = R.cam?.z ?? G.player?.z ?? 0, max = R.quality === 0 ? 2 : 4;
  const near = S.clouds.filter((q) => !q.off).map((q) => { q.d = Math.hypot(q.x - cx, q.z - cz) - q.r; return q; }).filter((q) => q.d < SUN.far).sort((a, b) => a.d - b.d).slice(0, max);
  const calm = !!G.settings?.flicker;
  for (const q of S.clouds) {
    const m = q.mesh, on = near.includes(q);
    if (on) {
      if (force || !m.visible || m.position.x !== q.x || m.position.z !== q.z) { m.position.set(q.x, 0, q.z); m.userData.drape(L); }
      // (U12: 'Reduce flicker' stills the edge's shimmer)
      if (m.userData.calm !== calm) { m.userData.calm = calm; m.userData.setShimmer(!calm); }
    }
    m.visible = on;
  }
}

// ---------- per frame (world.js act7Tick) ----------
export function sunTick(z, dt) {
  const S = z?.sun; if (!S) return;
  z.sunT = wrapT((z.sunT ?? 0) + dt);
  const pl = G.player, alive = !!pl && !pl.dead;
  // a scripted cloud sets off when a hero comes near what it lies on (this page's, or a co-op companion's)
  for (const q of S.clouds) {
    if (!q.scripted || S.started[q.id] != null || NET.mode === 'guest') continue;
    const o = q.c.over || q, r2 = SUN.reach * SUN.reach;
    if ((alive && (pl.x - o.x) ** 2 + (pl.z - o.z) ** 2 < r2) || NET.remotes.some((a) => !a.dead && !a.removed && (a.x - o.x) ** 2 + (a.z - o.z) ** 2 < r2)) { S.started[q.id] = z.sunT; emit('cloudStart', q.id, z.sunT, z); }
  }
  place(z);
  // the hero's own shade: any shade for the rules' listeners, a cloud's for the sky and the music
  const cloud = alive && !!z.cloudAt(pl.x, pl.z), shade = alive && (cloud || shadeAt(pl.x, pl.z));
  if (shade !== S.shade || cloud !== S.cloud) {
    const was = S.shade;
    if (cloud !== S.cloud) Audio.mood({ shade: cloud ? 1 : 0 });
    S.shade = shade; S.cloud = cloud;
    emit('sunShade', shade, cloud, z);
    // the two first-time lines, each where it means something: shade with choughs about, sun beside sleeping ice
    if (shade && !was && z.actors.some((a) => !a.dead && !a.removed && (a.kind === 'chough' || a.def?.id === 'chough' || a.def?.shadeShy) && (a.x - pl.x) ** 2 + (a.z - pl.z) ** 2 < 196)) sunHint('shade');
    if (!shade && was && (z.L.spots?.iceblocks || []).some((b) => (b.x - pl.x) ** 2 + (b.z - pl.z) ** 2 < 196)) sunHint('sun');
  }
  // under a cloud the sky eases to the zone's shade row and back (the same sun's place: mixAtmos never swings it)
  const k1 = Math.max(0, Math.min(1, S.k + (cloud ? 1 : -1) * dt / SUN.ease));
  if (k1 !== S.k) { S.k = k1; if (!S.hold) { const A = rows(z, S); if (A) setAtmosphere(k1 <= 0 ? A[0] : k1 >= 1 ? A[1] : mixAtmos(A[0], A[1], k1 * k1 * (3 - 2 * k1))); } }
}
// the row in sun and the row under a cloud: the zone's own, or the row the story has set for now (sunAtmos)
function rows(z, S) {
  const key = S.base || z.id, a = ATMOS[key], own = ATMOS[z.id + 'Shade']; if (!a) return null;
  const b = ATMOS[key + 'Shade'] || (own ? { ...a, hemi: Math.min(a.hemi, own.hemi), moonI: Math.min(a.moonI, own.moonI), sky: own.sky } : a);
  return [a, b];
}
// the story's or a boss's row for the zone ('thawFight', 'tarnGold'; null: the zone's own again): the shade eases from it.
// false: hands off, someone else is setting the sky (a scene); true or a key: ours again
export function sunAtmos(z, key = null) {
  const S = z?.sun; if (!S) return;
  if (key === false) { S.hold = true; return; }
  S.hold = false; if (key !== true) S.base = key || null;
  if (z !== G.zone) return;
  const A = rows(z, S); if (A) setAtmosphere(S.k <= 0 ? A[0] : S.k >= 1 ? A[1] : mixAtmos(A[0], A[1], S.k));
}
// hint.sun, hint.shade: once each a page (the HUD's 'hint7' listener shows the line and may keep its own flag)
export function sunHint(kind) { if (SUN.hinted[kind]) return false; SUN.hinted[kind] = true; emit('hint7', kind); return true; }

if (import.meta.env?.DEV && typeof window !== 'undefined') window.__sun7 = { SUN, sunEnter, sunTick, sunLeave, setSunT, cloudStart, cloudLines, cloudPos, sunAtmos, sunHint, shadeAt, sunAt };
