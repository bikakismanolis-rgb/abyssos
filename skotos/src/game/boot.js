// Startup and the main loop.
import * as THREE from 'three';
import { G, later } from './state.js';
import { initGfx, R, frame as gfxFrame, render, updateCamera, adaptResolution, setAtmosphere, shake } from '../gfx/gfx.js';
import { initFX, updateFX, glowBurst, ring, P, clearFX } from '../gfx/fx.js';
import { loadKits } from '../gfx/kits.js';
import { loadPeople } from '../gfx/people.js';
import { loadEnv } from '../gfx/env.js';
import { WIND } from '../world/build.js';
import { initInput, pollInput, IN } from '../core/input.js';
import { loadSave, writeSave } from './save.js';
import { refreshStats } from './stats.js';
import { enterZone, updatePacks, nearestInteract, updatePortalFx, ZONES } from './world.js';
import { updatePlayer } from './player.js';
import { updateActors } from './ai.js';
import { updateProjs, updateAreas } from './projectiles.js';
import { updatePickups } from './pickups.js';
import { updateShadows, refreshHeroLook, spawnMonster, preloadModels } from './actors.js';
import { initOverlay, drawOverlay, clearOverlay } from '../ui/overlay.js';
import { buildHud, setupHeroHud, updateHud, showHud, dialogTick, advanceDialog, dialogOpen, comboTick } from '../ui/hud.js';
import { initPanels, open as openPanel, close as closePanel, panelOpen } from '../ui/panels.js';
import { buildTitleScene, removeTitleScene, titleCamera, showTitle, hideScreen } from '../ui/screens.js';
import { on, emit } from '../ui/bus.js';
import { setLang, t } from '../i18n/i18n.js';
import { DIFFS } from './data.js';
import Audio from '../audio/audio.js';
import './story.js';
import { clamp, rand } from '../core/util.js';

function fatal(msg) {
  let el = document.getElementById('fatal');
  if (!el) { el = document.createElement('div'); el.id = 'fatal'; document.body.appendChild(el); }
  el.textContent += (el.textContent ? '\n' : '') + String(msg).slice(0, 500);
}
window.addEventListener('error', (e) => fatal((e.message || e.error) + (e.filename ? ' @ ' + e.filename.split('/').pop() + ':' + e.lineno : '')));
window.addEventListener('unhandledrejection', (e) => fatal('promise: ' + (e.reason && e.reason.message || e.reason)));

export async function boot(q) {
  const loading = document.createElement('div'); loading.id = 'loading'; loading.textContent = 'ΣΚΟΤΟΣ'; document.body.appendChild(loading);
  loadSave();
  setLang(G.settings.lang || (navigator.language?.startsWith('el') ? 'el' : (G.save.heroes.length ? 'el' : 'el')));
  const mobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
  if (G.settings.quality < 0) G.settings.quality = mobile ? 1 : 2;
  if (q.has('q')) G.settings.quality = +q.get('q');
  initGfx(G.settings.quality);
  initFX(G.settings.quality);
  initInput(); G.input = IN;
  initOverlay(); buildHud(); initPanels();
  const fade = document.createElement('div'); fade.id = 'fade'; document.getElementById('app').appendChild(fade);
  const scr = document.createElement('div'); scr.id = 'screen'; scr.hidden = true; document.getElementById('app').appendChild(scr);
  await Promise.all([loadKits(['dungeon', 'grave', 'town']), loadPeople(), loadEnv(G.settings.quality)]);
  preloadModels(['goblin', 'skeleton', 'warg', 'spider']);
  buildTitleScene();
  loading.remove();
  window.__ready = true; window.__G = G; window.__R = R;
  window.__D = { emit, enterZone, refreshStats, openPanel, closePanel, IN, spawnMonster, t };
  if (q.has('auto')) { // test hook: jump straight into a zone
    const h = (await import('./state.js')).newHero(q.get('cls') || 'warden', +(q.get('diff') || 1));
    if (q.has('lvl')) { h.level = +q.get('lvl'); h.points = h.level - 1; }
    await startHero(h, false, q.get('auto'));
  } else showTitle();
  requestAnimationFrame(loop);
}

// ---------- starting and travelling ----------
async function starterGear(hero) {
  if (hero.equip.weapon) return;
  const { makeItem } = await import('./items.js');
  const C = (await import('./data.js')).CLASSES[hero.cls];
  hero.equip.weapon = makeItem(1, { base: C.weapon, rar: 0, cls: hero.cls });
  if (hero.cls === 'warden') hero.equip.offhand = makeItem(1, { base: 'shield', rar: 0, cls: hero.cls });
  hero.equip.chest = makeItem(1, { base: 'chest', rar: 0, cls: hero.cls });
}
async function startHero(hero, isNew, zone = 'town') {
  await starterGear(hero);
  G.hero = hero; G.zones = {}; G.player = null; G.portal = null; G.gate = null;
  hideScreen(); removeTitleScene(); clearFX();
  refreshStats();
  setupHeroHud();
  G.mode = 'play';
  showHud(true);
  enterZone(zone, zone === 'town' ? { at: isNew ? { x: 31, z: 26 } : 'waypoint' } : {});
  G.player.res = hero.cls === 'warden' ? 0 : 100;
  writeSave();
  if (isNew) later(1.2, () => emit('toast', t('q.new') + ': ' + t('q.0'), 'quest'));
}
on('startHero', (h, isNew) => { startHero(h, isNew).catch((e) => fatal(e.stack || e)); });
let travelling = false;
function travel(zone, o = {}) {
  if (travelling) return;
  travelling = true;
  const f = document.getElementById('fade'); f.classList.add('on');
  Audio.sfx('waypoint');
  setTimeout(() => {
    try { enterZone(zone, o); } catch (e) { fatal(e.stack || e); }
    clearOverlay();
    setTimeout(() => { f.classList.remove('on'); travelling = false; }, 120);
    writeSave();
  }, 450);
}
on('travel', travel);
on('townPortal', () => {
  const pl = G.player; if (!pl || pl.dead || G.zone.id === 'town') return;
  pl.act = { name: 'portal', t: 0, dur: 1.4, ev: [], clip: 1.4, move: 0, update(dt) { for (let i = 0; i < 3; i++) P({ x: pl.x + rand.range(-0.7, 0.7), y: rand.range(0, 2.2), z: pl.z + rand.range(-0.7, 0.7), vy: 1.5, life: 0.6, size: 0.15, size1: 0.02, color: 0x8ab8ff }); }, end() { G.portal = G.zone.id === 'gate' ? null : { zone: G.zone.id, x: pl.x, z: pl.z }; if (G.zone.id === 'gate') G.gate = null; travel('town', { at: 'waypoint' }); } };
  pl.avatar.play('channel', 1);
  Audio.sfx('summon');
});
on('respawn', (town) => {
  const pl = G.player;
  pl.dead = false; pl.hp = pl.hpMax; pl.res = G.hero.cls === 'warden' ? 0 : G.stats.resMax; pl.status = { stun: 0, freeze: 0, slow: 0, slowK: 0, fear: 0, burn: 0, burnDps: 0, poison: 0, poisonDps: 0, chill: 0 };
  refreshHeroLook();
  if (town || G.zone.id === 'gate') { G.gate = null; travel('town', { at: 'waypoint' }); }
  else travel(G.zone.id, { at: G.zone.L.spots.waypoint ? 'waypoint' : 'start' });
});
on('heroDeath', () => {
  const pl = G.player; if (pl.dead) return;
  pl.dead = true; pl.act = null;
  pl.avatar.play(Math.random() < 0.5 ? 'die' : 'dieFwd', 1);
  Audio.sfx('playerDie'); Audio.sting('death');
  G.hero.stats.deaths++;
  G.slow = 0.35; G.slowT = 1.2;
  setTimeout(() => openPanel('dead'), 1800);
});
on('quit', () => {
  writeSave();
  location.reload();
});
on('heroLook', () => refreshHeroLook());
on('diffChanged', () => { for (const k of Object.keys(G.zones)) if (k !== 'town') delete G.zones[k]; G.portal = null; writeSave(); emit('toast', t('pick.diff') + ': ' + t('diff.' + DIFFS[G.hero.diff].id), 'quest'); });
on('settings', () => { Audio.setVolumes({ music: G.settings.music, sfx: G.settings.sfx }); setLang(G.settings.lang); if (G.hero) setupHeroHud(); writeSave(); });
on('cine', (c) => { G.cine = Object.assign({ t: 0, done: new Set() }, c); G.mode = 'cine'; showHud(false); document.getElementById('letterbox').classList.add('on'); });
on('actClosed', () => { Audio.music('town'); });
on('raiseAlly', (a) => {
  const m = spawnMonster('skeleton', a.x, a.z, { level: G.hero.level, rising: true });
  m.team = 'hero'; m.pet = true; m.life = 12; m.dmgMult = 1; m.avatar.setRim(0x70ff90, 1.2); m.avatar.setTint(0x60ff80, 0.4);
  G.actors.push(m);
});
// shadow gates
on('startGate', (tier) => {
  G.gate = { tier, progress: 0, guardian: null, start: performance.now(), done: false };
  G.portal = null;
  travel('gate', { fresh: true, tier, level: G.hero.level + Math.floor(tier / 2), at: 'start' });
});
on('gateKill', (a) => {
  const g = G.gate; if (!g || g.done) return;
  if (a === g.guardian) {
    g.done = true;
    const secs = Math.round((performance.now() - g.start) / 1000);
    emit('toast', t('gate.clear', Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0')), 'big');
    if (g.tier > G.hero.gateBest) { G.hero.gateBest = g.tier; later(1.5, () => emit('toast', t('gate.up'), 'quest')); }
    G.portal = null;
    const z = G.zone;
    z.interact.push({ kind: 'exit', to: 'town', x: a.x, z: a.z + 2, r: 2.4, prompt: 'exit.town', use: () => { G.gate = null; travel('town', { at: 'waypoint' }); } });
    ring(a.x, a.z + 2, 2, 0x8ab8ff, 1);
    writeSave();
    return;
  }
  if (g.guardian) return;
  g.progress += (a.elite ? 0.05 : 0.014) * (a.def.big ? 2 : 1);
  if (g.progress >= 1) {
    const pl = G.player, kind = rand.pick(['barrowLord', 'weaver', 'troll']);
    let x = pl.x + 6, z = pl.z; const p = G.zone.map.nearestFloor(x, z); x = p.x; z = p.z;
    const b = spawnMonster(kind, x, z, { level: G.zone.level + 2, gateMul: Math.pow(1.14, g.tier) * (kind === 'troll' ? 4 : 0.55), elite: kind === 'troll' ? 'rare' : null, affixes: kind === 'troll' ? ['thunder'] : [] });
    b.name = t('gate.guardianName'); b.boss = true; b.aggro = true;
    if (kind === 'troll') { emit('bossIntro', b); }
    G.actors.push(b); g.guardian = b;
    glowBurst(x, 1, z, 0xc080ff, 60, 6, 0.5, 1); ring(x, z, 4, 0xc080ff, 0.8); shake(0.5);
    emit('toast', t('gate.guardian'), 'big');
  }
});

// keyboard shortcuts and dialog advance
on('key', (k) => {
  if (dialogOpen()) { if (k === 'enter' || k === ' ' || k === 'e') advanceDialog(); return; }
  if (k === 'escape') { if (panelOpen()) closePanel(); else if (G.mode === 'play') openPanel('pause'); }
  else if (k === 'i' || k === 'b') panelOpen() && G.panel === 'inventory' ? closePanel() : openPanel('inventory');
  else if (k === 'k' || k === 's' && false) panelOpen() && G.panel === 'skills' ? closePanel() : openPanel('skills');
  else if (k === 'm' || k === 'tab') panelOpen() && G.panel === 'map' ? closePanel() : openPanel('map');
  else if (k === 'e' || k === 'f') G.focus?.use();
});
window.addEventListener('keydown', (e) => { if (G.mode !== 'play') return; const k = e.key.toLowerCase(); if ((k === 'enter' || k === ' ') && dialogOpen()) { advanceDialog(); e.preventDefault(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { Audio.suspend(); writeSave(); } else Audio.resume(); });
window.addEventListener('pagehide', () => writeSave());

// ---------- the loop ----------
let last = performance.now(), saveT = 0;
const SIM = +(new URLSearchParams(location.search).get('sim') || 0); // test mode: N fixed steps per frame
function loop(now) {
  let dt = (now - last) / 1000; last = now;
  if (!SIM) adaptResolution(Math.min(100, dt * 1000));
  if (dt > 0.05) dt = 0.05;
  try {
    if (SIM) { for (let i = 0; i < SIM; i++) tick(1 / 30, i < SIM - 1); }
    else tick(dt);
  } catch (e) { fatal(e.stack || e); }
  requestAnimationFrame(loop);
}
function tick(dt, noDraw) {
  gfxFrame(dt);
  WIND.uTime.value += dt;
  if (G.mode === 'title') {
    WIND.uHero.value.set(0, 0, -999);
    titleCamera(dt);
    updateFX(dt, 32, 14);
    render(); drawOverlay(dt);
    return;
  }
  if (G.mode !== 'play' && G.mode !== 'cine') { render(); return; }
  pollInput();
  const pl = G.player;
  const paused = panelOpen() || dialogOpen();
  let gdt = dt;
  if (G.hitstop > 0) { G.hitstop -= dt; gdt = dt * 0.08; }
  if (G.slowT > 0) { G.slowT -= dt; gdt *= G.slow; }
  if (G.mode === 'cine') cineTick(dt);
  if (!paused) {
    if (G.mode === 'play') updatePlayer(gdt);
    else { pl.avatar.update(gdt, { speed: 0 }); }
    updateActors(gdt);
    updatePacks();
    updateProjs(gdt); updateAreas(gdt); updatePickups(gdt);
    for (let i = G.timers.length - 1; i >= 0; i--) { const tm = G.timers[i]; tm.t -= gdt; if (tm.t <= 0) { G.timers.splice(i, 1); try { tm.fn(); } catch (e) { fatal(e.stack || e); } } }
    comboTick(dt);
    G.hero.stats.time += dt;
  }
  dialogTick(dt);
  G.focus = G.mode === 'play' && !pl.dead ? nearestInteract() : null;
  updateShadows();
  updatePortalFx(dt);
  if (G.zone.lvl.walls) G.zone.lvl.walls.update(dt, pl.x, pl.z);
  if (G.mode === 'play') updateCamera(dt, pl.x, pl.z);
  WIND.uHero.value.set(pl.x, 0, pl.z);
  updateFX(gdt, pl.x, pl.z);
  // music follows the fight
  let n = 0; for (const a of G.actors) if (a.aggro && !a.dead && a.team === 'foe' && !a.prop && Math.abs(a.x - pl.x) + Math.abs(a.z - pl.z) < 22) n++;
  Audio.intensity(clamp(n / 7, 0, 1));
  Audio.listener(pl.x, pl.z);
  if (noDraw) return;
  render();
  drawOverlay(dt);
  updateHud(dt);
  saveT += dt; if (saveT > 20) { saveT = 0; writeSave(); }
}
function cineTick(dt) {
  const c = G.cine; c.t += dt;
  for (let i = 0; i < c.steps.length; i++) if (!c.done.has(i) && c.t >= c.steps[i][0]) { c.done.add(i); c.steps[i][1](); }
  const k = clamp(c.t / 1.6, 0, 1), back = clamp((c.dur - c.t) / 1.2, 0, 1);
  const pl = G.player, w = Math.min(k, back);
  R.cam.zoomT = 1 + (c.zoom - 1) * w;
  R.cam.lookY = 0.9 + 5 * w;
  updateCamera(dt, pl.x + (c.x - pl.x) * w, pl.z + (c.z - pl.z) * w);
  if (c.t >= c.dur) {
    G.mode = 'play'; G.cine = null; R.cam.lookY = 0.9; R.cam.zoomT = 1.05;
    showHud(true); document.getElementById('letterbox').classList.remove('on');
    c.end?.();
  }
}
export { THREE };
