// Title, hero selection and the opening crawl, staged around the beacon of Whitecliff.
import { G, newHero } from '../game/state.js';
import { DIFFS, CLASSES } from '../game/data.js';
import { R, setAtmosphere, addLight, clearLights } from '../gfx/gfx.js';
import { genTown } from '../world/gen.js';
import { buildLevel } from '../world/build.js';
import { ATMOS } from '../world/atmos.js';
import { setEmitters, setAmbient, glowBurst, ring } from '../gfx/fx.js';
import { makeAvatar } from '../game/actors.js';
import { deleteHero } from '../game/save.js';
import { emit, on } from './bus.js';
import { ICON } from './icons.js';
import { t } from '../i18n/i18n.js';
import Audio from '../audio/audio.js';

const $ = (id) => document.getElementById(id);
export const TS = { scene: null, avatars: {}, cam: 'orbit', t: 0, pick: 'warden', diff: 1, audio: false };

export function buildTitleScene() {
  if (TS.scene) return;
  const L = genTown();
  const lvl = buildLevel(L, R.quality);
  TS.scene = lvl; TS.L = L;
  R.scene.add(lvl.group);
  for (const l of L.lights) addLight(l);
  setEmitters(lvl.emitters);
  setAmbient('town');
  setAtmosphere(Object.assign({}, ATMOS.town, { heroI: 0 }));
  const spots = { warden: [29.6, 20.2, 0.45], ranger: [32, 19.4, 0.15], mage: [34.4, 20.2, -0.2] };
  for (const cls of ['warden', 'ranger', 'mage']) {
    const C = CLASSES[cls];
    const av = makeAvatar(cls, { style: C.style, weapon: C.weapon === 'staff' ? 'staff' : C.weapon });
    if (cls === 'warden') av.hold('L', 'shield', {});
    const [x, z, r] = spots[cls];
    av.group.position.set(x, 0, z); av.group.rotation.y = r;
    R.scene.add(av.group);
    TS.avatars[cls] = av;
  }
}
export function removeTitleScene() {
  if (!TS.scene) return;
  R.scene.remove(TS.scene.group);
  for (const k in TS.avatars) TS.avatars[k].dispose();
  TS.avatars = {}; TS.scene = null;
  clearLights(); setEmitters([]);
}
// camera for the menus
export function titleCamera(dt) {
  TS.t += dt;
  const cam = R.camera;
  if (TS.cam === 'orbit') {
    const a = TS.t * 0.045 + 0.4, x = 32 + Math.sin(a) * 26, z = 12 + Math.cos(a) * 26;
    cam.position.set(x, 9 + Math.sin(TS.t * 0.1) * 1.5, z); cam.lookAt(32, 6, 12);
  } else if (TS.cam === 'pick') {
    const av = TS.avatars[TS.pick], tx = av ? av.group.position.x : 32;
    TS.px = (TS.px ?? tx) + (tx - (TS.px ?? tx)) * Math.min(1, dt * 3);
    cam.position.set(TS.px + Math.sin(TS.t * 0.2) * 0.4, 2.9, 28.6); cam.lookAt(TS.px, 1.2, 19.8);
  } else if (TS.cam === 'intro') {
    const k = Math.min(1, TS.t / 28);
    cam.position.set(32 + Math.sin(TS.t * 0.05) * 6, 4 + k * 6, 34 - k * 10); cam.lookAt(32, 7 + k * 2, 12);
  }
  for (const k in TS.avatars) TS.avatars[k].update(dt, { speed: 0, lookAround: 1 });
  R.heroLight.position.set(32, 3, 22); R.heroLight.intensity = TS.cam === 'pick' ? 22 : 0;
}

// ---------- screens ----------
// once any hero has named the dark (Act V done), the title says so
const sub5 = () => (G.save?.heroes || []).some((h) => (h.act5 ?? -1) >= 0) ? 'game.sub5' : 'game.sub';
function screen(html, clear) { const s = $('screen'); s.className = clear ? 'clear' : ''; s.innerHTML = html; s.hidden = false; return s; }
export function hideScreen() { $('screen').hidden = true; $('screen').innerHTML = ''; }

export function showTitle() {
  G.mode = 'title'; TS.cam = 'orbit';
  if (!TS.audio) {
    const s = screen(`<div class="logo">${t('game.title')}</div><div class="logo-rule"></div><div class="logo-sub">${t(sub5())}</div><div class="tapgo">${t('menu.tap')}</div><div class="credit">${t('menu.credits')}</div>`);
    // the menu comes up on the click, not the press: a press that swapped the screen let the same touch land on the
    // menu's first button (Continue) and started the game before the player could choose a save
    s.onclick = () => { s.onclick = null; TS.audio = true; Audio.init(); Audio.setVolumes({ master: 1, music: G.settings.music, sfx: G.settings.sfx }); Audio.music('title'); Audio.sfx('beaconIgnite', { vol: 0.5 }); mainMenu(); };
    return;
  }
  mainMenu();
}
function mainMenu() {
  const heroes = G.save.heroes;
  const last = heroes.find((h) => h.id === G.save.last) || heroes[0];
  const slots = heroes.map((h) => `<div class="slot" data-id="${h.id}"><span style="color:${CLASSES[h.cls].color}">${ICON[h.cls === 'warden' ? 'shield' : h.cls === 'ranger' ? 'bolt' : 'flame']}</span><span class="nm">${t('menu.slot', t('class.' + h.cls), h.level, t('diff.' + DIFFS[h.diff].id))}</span><span class="dl" data-del="${h.id}">${TS.delSure === h.id ? t('menu.deleteSure') : t('menu.delete')}</span></div>`).join('');
  const s = screen(`<div class="logo">${t('game.title')}</div><div class="logo-rule"></div><div class="logo-sub">${t(sub5())}</div>
    <div class="menu">${last ? `<button class="btn" id="m-cont">${t('menu.continue')} · ${t('class.' + last.cls)} ${t('hud.level', last.level)}</button>` : ''}
    <button class="btn ${last ? 'ghost' : ''}" id="m-new">${t('menu.new')}</button>
    ${heroes.length > 1 ? `<div class="slots">${slots}</div>` : ''}
    <button class="btn ghost" id="m-set">${t('menu.settings')}</button>
    <button class="btn ghost" id="m-help">${t('help.title')}</button></div><div class="credit">${t('menu.credits')}</div>`);
  s.onpointerdown = null; s.onclick = null;
  // and the menu ignores touches for a moment after it appears, whatever brought it up
  const at = performance.now(), ready = () => performance.now() - at > 450;
  if (last) $('m-cont').onclick = () => { if (!ready()) return; Audio.sfx('click'); emit('startHero', last, false); };
  $('m-new').onclick = () => { if (!ready()) return; Audio.sfx('click'); showPick(); };
  $('m-set').onclick = () => { if (!ready()) return; Audio.sfx('click'); emit('openPanel', 'settings'); };
  $('m-help').onclick = () => { if (!ready()) return; Audio.sfx('click'); emit('openPanel', 'help'); };
  s.querySelectorAll('.slot').forEach((el) => el.onclick = (e) => {
    if (!ready()) return;
    const del = e.target.closest('[data-del]');
    if (del) { if (TS.delSure === del.dataset.del) { deleteHero(del.dataset.del); TS.delSure = null; } else TS.delSure = del.dataset.del; mainMenu(); return; }
    const h = G.save.heroes.find((x) => x.id === el.dataset.id); if (h) emit('startHero', h, false);
  });
}
export function showPick() {
  TS.cam = 'pick'; G.mode = 'title';
  const cards = ['warden', 'ranger', 'mage'].map((c) => `<button class="pcard ${TS.pick === c ? 'on' : ''}" data-c="${c}"><h3>${t('class.' + c)}</h3><p>${t('class.' + c + '.d')}</p></button>`).join('');
  const diffs = DIFFS.slice(0, 3).map((d, i) => `<button class="chip ${TS.diff === i ? 'on' : ''}" data-d="${i}" style="${TS.diff === i ? 'color:' + d.color : ''}">${t('diff.' + d.id)}</button>`).join('');
  const s = screen(`<div class="pick-title">${t('pick.title')}</div><div class="pick"><div class="chips">${diffs}</div><div class="muted" style="text-shadow:0 1px 3px #000">${t('diff.' + DIFFS[TS.diff].id + '.d')}</div><div class="pick-cards">${cards}</div><div class="row" style="justify-content:center"><button class="btn ghost" id="p-back">${t('pick.back')}</button><button class="btn" id="p-go">${t('pick.go')}</button></div></div>`, true);
  s.querySelectorAll('.pcard').forEach((el) => el.onclick = () => {
    TS.pick = el.dataset.c; Audio.sfx('equip');
    const av = TS.avatars[TS.pick];
    if (av) { av.play(TS.pick === 'warden' ? 'slash3' : TS.pick === 'ranger' ? 'shoot' : 'castUp', 1); const p = av.group.position; glowBurst(p.x, 1.2, p.z, TS.pick === 'mage' ? 0x7aa8ff : 0xffc070, 20, 2.5, 0.25, 0.6); }
    showPick();
  });
  s.querySelectorAll('[data-d]').forEach((el) => el.onclick = () => { TS.diff = +el.dataset.d; Audio.sfx('click'); showPick(); });
  $('p-back').onclick = () => { Audio.sfx('click'); TS.cam = 'orbit'; mainMenu(); };
  $('p-go').onclick = () => { Audio.sfx('click'); const h = newHero(TS.pick, TS.diff); showIntro(() => emit('startHero', h, true)); };
}
export function showIntro(done) {
  TS.cam = 'intro'; TS.t = 0;
  const lines = [1, 2, 3, 4, 5].map((i) => `<p>${t('intro.' + i)}</p>`).join('');
  const s = screen(`<div class="intro">${lines}</div><button class="btn ghost skip" id="i-skip">${t('intro.skip')}</button>`);
  const ps = s.querySelectorAll('.intro p');
  ps.forEach((p) => { p.style.position = 'absolute'; p.style.left = '0'; p.style.right = '0'; });
  s.querySelector('.intro').style.position = 'relative'; s.querySelector('.intro').style.height = '40vh'; s.querySelector('.intro').style.width = '100%';
  let i = 0, finished = false;
  const finish = () => { if (finished) return; finished = true; clearInterval(timer); done(); };
  const step = () => { ps.forEach((p) => p.classList.remove('on')); if (i >= ps.length) { finish(); return; } ps[i].classList.add('on'); i++; };
  step();
  const timer = setInterval(step, 5200);
  $('i-skip').onclick = (e) => { e.stopPropagation(); finish(); };
}
on('settings', () => { if (G.mode === 'title' && !G.panel) { /* language may have changed */ } });
export { ring };
