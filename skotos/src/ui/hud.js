// In-game HUD: bars, skill buttons, minimap, toasts, boss bar, dialog box.
import { G } from '../game/state.js';
import { CLASSES, SKILLS, xpToNext, DODGE, POTION, HAZ5 } from '../game/data.js';
import { skillUnlocked } from '../game/stats.js';
import { canUse } from '../game/skills.js';
import { vulnOf, VULN } from '../game/combat.js';
import { IN, bindButton } from '../core/input.js';
import { on, emit } from './bus.js';
import { ICON } from './icons.js';
import { t } from '../i18n/i18n.js';
import { fmt } from '../core/util.js';
import { npcHasNews, questText, npcName } from '../game/story.js';
import { iceMemOf, ZONES } from '../game/world.js';
import Audio from '../audio/audio.js';
import { mapTone, tideDial } from '../game/tide.js';
import { stageAt } from '../game/ice.js';
import { COLD } from '../game/cold.js';

const $ = (id) => document.getElementById(id);
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
// a drop of amber: the sap status and the Memory of the Evergreen
const TEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c3.2 4.6 6 8 6 11.2A6 6 0 0 1 6 14.2C6 11 8.8 7.6 12 3z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.4 2.6" opacity=".7"/></svg>';
// Act IV: the eye of the dead (Seen), an Ember Tick on her back (Clinging)
const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg>';
const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="13.5" rx="4.6" ry="5.6"/><circle cx="12" cy="6.4" r="2"/><path d="M7.6 10.5 4 8.5M7.4 14H3.5M7.8 17.2 4.6 20M16.4 10.5 20 8.5M16.6 14h3.9M16.2 17.2l3.2 2.8"/></svg>';
// Act V: a snowflake (the Cold), six arms with a branch pair on each
const SNOW = (() => {
  let d = '';
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3, c = Math.cos(a), s = Math.sin(a), P = (r, w) => `${(12 + c * r - s * w).toFixed(1)} ${(12 + s * r + c * w).toFixed(1)}`;
    d += `M12 12L${P(9.6, 0)}M${P(6.9, -2.5)}L${P(4.9, 0)}L${P(6.9, 2.5)}`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
})();
// the tide's dial by the minimap: a ring that counts down to the next turn, the water's level in the middle and an arrow
// for which way it is going
const DIAL = '<svg viewBox="0 0 40 40"><defs><clipPath id="tclip"><circle cx="20" cy="20" r="13"/></clipPath></defs><circle class="tb" cx="20" cy="20" r="18.5"/><circle class="tt" cx="20" cy="20" r="17"/><circle class="tr" cx="20" cy="20" r="17" transform="rotate(-90 20 20)"/><circle class="tz" cx="20" cy="20" r="13"/><g clip-path="url(#tclip)"><rect class="tw" x="5" y="33" width="30" height="30"/><path class="tc" d="M5 33q3.75-2 7.5 0t7.5 0 7.5 0 7.5 0"/></g><circle class="ti" cx="20" cy="20" r="13"/><path class="ta" d="M20 13.5l5 6.5h-3v5h-4v-5h-3z"/><rect class="tl" x="13.5" y="18.4" width="13" height="3.2" rx="1.6"/></svg>';
let built = false;
const S = { hpW: 1, lagW: 1, minimapT: 0, toastN: 0, dialog: null, flue: 0, iceRep: 0 };

export function buildHud() {
  if (built) return; built = true;
  const app = $('app');
  app.appendChild(el(`<div id="vignette"></div>`));
  const hud = el(`<div id="hud" hidden>
    <div id="hurt"></div><div id="flue"></div>
    <div id="hud-tl"><div id="portrait"><span id="pic"></span><div id="lvl">1</div></div>
      <div id="bars"><div class="bar hp"><i class="lag"></i><i class="fill"></i><i class="shield"></i><span></span></div><div class="bar res"><i class="fill"></i></div><div id="xpbar"><i></i></div><div id="buffs"></div>
        <div id="amber" hidden><span class="ic">${TEAR}</span><div class="ab"><i></i></div><b></b></div>
        <div id="cling" hidden><span class="ic">${TICK}</span><b></b></div>
        <div id="cold" hidden><span class="ic">${SNOW}</span><div class="cb"><i></i><u></u></div><b></b></div></div></div>
    <div id="hud-tr"><div id="mmw"><canvas id="minimap" width="264" height="264"></canvas><div id="tide" hidden>${DIAL}</div></div>
      <div id="hud-btns"><button class="hbtn" id="h-bag" aria-label="bag">${ICON.bag}</button><button class="hbtn" id="h-skills" aria-label="skills">${ICON.book}</button><button class="hbtn" id="h-menu" aria-label="menu">${ICON.menu}</button></div>
      <div id="quest"></div></div>
    <div id="bossbar" hidden><div class="nm"></div><div class="ti"></div><div class="bar"><i class="fill"></i></div><div class="vu" hidden></div></div>
    <div id="gatebar" hidden><div class="nm"></div><div class="bar"><i class="fill"></i></div></div>
    <div id="ring" hidden><svg viewBox="0 0 48 48"><circle class="bg" cx="24" cy="24" r="20"/><circle class="fg" cx="24" cy="24" r="20"/></svg><span class="n"></span><b></b></div>
    <div id="zonename"><div class="a"></div><div class="rule"></div><div class="b"></div></div>
    <div id="levelup"><div class="a"></div><div class="b"></div></div>
    <div id="massacre"></div>
    <div id="cluster">
      <button class="sk big" id="b-attack"></button>
      <button class="sk" id="b-s1"></button><button class="sk" id="b-s2"></button><button class="sk" id="b-s3"></button><button class="sk" id="b-s4"></button>
      <button class="sk small" id="b-dodge"></button><button class="sk small" id="b-potion">${ICON.potion}<div class="cd"></div><div class="cdn"></div><span class="key">Q</span></button>
      <button id="b-use" hidden></button>
    </div>
  </div>`);
  app.appendChild(hud);
  app.appendChild(el(`<div id="dialog" hidden><div class="face"></div><div class="who"></div><div class="txt"></div><div class="more">▸</div></div>`));
  app.appendChild(el(`<div id="letterbox"></div>`));
  // toasts live outside the HUD so that what is said in a cinematic (the beacon answering, the Lady's last words) is seen
  app.appendChild(el(`<div id="toasts"></div>`));
  // buttons
  bindButton($('b-attack'), { down: () => { IN.btnAttack = true; IN.events.push({ t: 'skill', i: 0, aim: null }); }, up: () => { IN.btnAttack = false; } });
  for (let i = 1; i <= 4; i++) bindButton($('b-s' + i), { aim: true, index: i, up: (aim, cancel) => { if (!cancel) IN.events.push({ t: 'skill', i, aim }); } });
  bindButton($('b-dodge'), { aim: true, index: 9, up: (aim, cancel) => { if (!cancel) IN.events.push({ t: 'dodge', aim }); } });
  bindButton($('b-potion'), { up: () => IN.events.push({ t: 'potion' }) });
  bindButton($('b-use'), { up: () => G.focus?.use() });
  $('h-bag').onclick = () => { Audio.sfx('open'); emit('openPanel', 'inventory'); };
  $('h-skills').onclick = () => { Audio.sfx('open'); emit('openPanel', 'skills'); };
  $('h-menu').onclick = () => { Audio.sfx('open'); emit('openPanel', 'pause'); };
  $('minimap').onclick = () => emit('openPanel', 'map');
  $('dialog').addEventListener('pointerdown', (e) => { e.stopPropagation(); advanceDialog(); });
  if (!('ontouchstart' in window)) document.body.classList.add('desk');
}
export function setupHeroHud() {
  const cls = G.hero.cls, C = CLASSES[cls];
  $('pic').innerHTML = cls === 'warden' ? ICON.shield : cls === 'ranger' ? ICON.bolt : ICON.flame;
  const res = { fury: ['#d8452c', '#ff7a50'], energy: ['#c99a28', '#f6d26a'], mana: ['#2e62d8', '#7ab0ff'] }[C.res];
  document.querySelector('.bar.res').style.setProperty('--rc', res[0]);
  document.querySelector('.bar.res').style.setProperty('--rc2', res[1]);
  const sk = SKILLS[cls];
  $('b-attack').innerHTML = ICON[sk[0].icon] + '<span class="key">⟵</span>';
  for (let i = 1; i <= 4; i++) $('b-s' + i).innerHTML = ICON[sk[i].icon] + `<div class="cd"></div><div class="cdn"></div><span class="key">${i}</span>`;
  $('b-dodge').innerHTML = ICON[DODGE[cls].kind === 'blink' ? 'blink' : 'roll'] + '<div class="cd"></div><span class="key">␣</span>';
}

// ---------- per frame ----------
const lastReady = [true, true, true, true, true];
export function updateHud(dt) {
  const pl = G.player, h = G.hero; if (!pl || !h) return;
  const hpF = Math.max(0, pl.hp / pl.hpMax);
  S.lagW += (hpF - S.lagW) * Math.min(1, dt * (hpF < S.lagW ? 2.2 : 12));
  const hb = document.querySelector('.bar.hp');
  hb.children[1].style.transform = `scaleX(${hpF})`;
  hb.children[0].style.transform = `scaleX(${Math.max(hpF, S.lagW)})`;
  hb.children[2].style.transform = `scaleX(${Math.min(1, (pl.shield || 0) / pl.hpMax)})`;
  hb.children[3].textContent = fmt(pl.hp) + ' / ' + fmt(pl.hpMax);
  document.querySelector('.bar.res .fill').style.transform = `scaleX(${Math.max(0, pl.res / G.stats.resMax)})`;
  $('xpbar').firstChild.style.transform = `scaleX(${h.xp / xpToNext(h.level)})`;
  $('lvl').textContent = t('hud.level', h.level);
  $('hurt').style.opacity = hpF < 0.3 ? (0.35 + Math.sin(performance.now() / 180) * 0.25) * (1 - hpF / 0.3) + (S.hurt || 0) : (S.hurt || 0);
  S.hurt = Math.max(0, (S.hurt || 0) - dt * 2);
  if (hpF < 0.25 && !pl.dead) { S.hb = (S.hb || 0) - dt; if (S.hb <= 0) { S.hb = 0.9; Audio.sfx('heartbeat', { vol: 0.8 }); } }
  // skills
  const sk = SKILLS[h.cls];
  for (let i = 1; i <= 4; i++) {
    const b = $('b-s' + i), s = sk[i];
    const unlocked = skillUnlocked(s);
    b.classList.toggle('locked', !unlocked);
    const cd = pl.cds[i], p = s.cd ? Math.max(0, cd / (s.cd * (1 - G.stats.cdr / 100))) : 0;
    b.children[1].style.setProperty('--p', (p * 100).toFixed(1) + '%');
    b.children[2].textContent = cd > 0.05 ? (cd < 1 ? cd.toFixed(1) : Math.ceil(cd)) : '';
    b.classList.toggle('nores', unlocked && (s.cost || 0) > pl.res);
    const ready = unlocked && cd <= 0;
    if (ready && !lastReady[i] && s.cd >= 4) { b.classList.remove('ready-flash'); void b.offsetWidth; b.classList.add('ready-flash'); }
    lastReady[i] = ready;
  }
  const dc = DODGE[h.cls].cd * (G.stats.legs.has('swiftboots') ? 0.5 : 1);
  $('b-dodge').children[1].style.setProperty('--p', ((pl.dodgeCd / dc) * 100).toFixed(1) + '%');
  const pb = $('b-potion');
  pb.children[1].style.setProperty('--p', ((pl.potionCd / POTION.cd) * 100).toFixed(1) + '%');
  pb.children[2].textContent = pl.potionCd > 0.05 ? Math.ceil(pl.potionCd) : '';
  // interaction prompt
  const u = $('b-use'), f = G.focus;
  if (f && !G.panel && !S.dialog) {
    u.hidden = false;
    const label = f.kind === 'npc' ? t('talk') + ' · ' + npcName(f.npc) : f.kind === 'exit' ? (f.locked && !h.flags[f.locked] ? t('locked') : t(f.prompt)) : t(f.prompt);
    const ic = f.kind === 'npc' ? 'talk' : f.kind === 'chest' ? 'chest' : f.kind === 'exit' || f.kind === 'portal' ? 'gate' : f.kind === 'waypoint' ? 'portal' : 'hand';
    if (u.dataset.l !== label) { u.innerHTML = ICON[ic] + `<span>${label}</span>`; u.dataset.l = label; }
  } else u.hidden = true;
  // buffs
  const bf = [];
  // (Act V: Warmed, a beam's warmth, is a flame)
  for (const k in pl.buffs) if (pl.buffs[k] > 0 && k !== 'evergreen') bf.push(`<div class="bf${k === 'memory' ? ' mem' : k === 'seen' ? ' seen' : k === 'warmed' ? ' warm' : ''}"${k === 'seen' || k === 'warmed' ? ` title="${t('hud.' + k)}"` : ''}>${k === 'memory' ? TEAR : k === 'seen' ? EYE : ICON[{ cry: 'horn', shrineFury: 'flame', shrineSpeed: 'roll', shrineFortune: 'coin', shrineShield: 'shield', warmed: 'flame' }[k] || 'star']}<b>${Math.ceil(pl.buffs[k])}</b></div>`);
  const bh = bf.join('');
  if (bh !== S.bh) { $('buffs').innerHTML = bh; S.bh = bh; }
  // amber sap: the build-up toward an amber-lock, then the lock itself (a dodge breaks it)
  const st = pl.status || {}, rooted = st.root > 0, stick = Math.min(1, (st.stick || 0) / 1.5);
  // (in Act V's zones the Cold holds that slot: a Frostbite's freeze shows there, not as amber)
  const cz = !!G.zone?.act5, am = $('amber'), show = !cz && (rooted || stick > 0.02);
  if (am.hidden === show) am.hidden = !show;
  if (show) {
    am.classList.toggle('rooted', rooted);
    am.querySelector('i').style.transform = `scaleX(${rooted ? st.root / 1.2 : stick})`;
    const lb = rooted ? t('hud.rooted') : t('hud.sap');
    if (S.amb !== lb) { am.querySelector('b').textContent = lb; S.amb = lb; }
  }
  coldHud(pl, cz);
  tideHud();
  // Act V: the first time she stands on webbed thin ice, what it means
  if (cz && (S.iceT = (S.iceT || 0) - dt) <= 0) { S.iceT = 0.25; if (stageAt(pl.x, pl.z) >= 2) hint('ice'); }
  // Act IV: Ember Ticks on her back (a dodge throws them off)
  const nc = pl.cling?.length || 0, cl = $('cling');
  if (cl.hidden === nc > 0) cl.hidden = !(nc > 0);
  if (nc > 0) { const lb = t('hud.clinging') + (nc > 1 ? ' ×' + nc : ''); if (S.cl !== lb) { cl.querySelector('b').textContent = lb; S.cl = lb; } }
  // the Forge's breath is drawing in down the gallery she stands in: the screen's edge glows red
  $('flue').style.opacity = S.flue.toFixed(3); S.flue = Math.max(0, S.flue - dt * 2.5);
  // a Great Bellows being woken: the ring fills over its 20 s (it waits while the fire is out or she is away)
  const run = G.zone?.run, rg = $('ring');
  if (rg.hidden === !!run) rg.hidden = !run;
  if (run) {
    rg.querySelector('.fg').style.strokeDashoffset = ((1 - run.k) * 125.66).toFixed(2);
    rg.classList.toggle('paused', !!run.paused);
    const lb = run.out ? t('hud.bellowsOut') : run.away ? t('hud.bellowsAway') : t('hud.bellows'), n = run.ready ? String(Math.max(0, Math.ceil(run.dur - run.t))) : '';
    if (S.rg !== lb + n) { rg.querySelector('b').textContent = lb; rg.querySelector('.n').textContent = n; S.rg = lb + n; }
  }
  // boss
  const b = G.bossActor;
  const bb = $('bossbar');
  if (b && !b.dead) {
    bb.hidden = false; bb.querySelector('.fill').style.transform = `scaleX(${Math.max(0, b.hp / b.hpMax)})`;
    // (Act V: what it is open to right now, and how much: the window to strike in, readable from across a phone)
    const vu = vulnOf(b), V = vu && VULN[vu.kind], lb = V?.key ? t(V.key) + ' ×' + +vu.k.toFixed(2) : '', el = bb.querySelector('.vu');
    if (S.vu !== lb) { S.vu = lb; el.textContent = lb; el.hidden = !lb; el.className = 'vu' + (vu && vu.k >= 1.6 ? ' big' : ''); }
  } else bb.hidden = true;
  // gate progress
  const gb = $('gatebar');
  if (G.gate && G.zone?.id === 'gate' && !G.bossActor) { gb.hidden = false; gb.querySelector('.nm').textContent = t('gate.progress') + ' · ' + t('gate.tier', G.gate.tier); gb.querySelector('.fill').style.transform = `scaleX(${Math.min(1, G.gate.progress)})`; } else gb.hidden = true;
  // quest
  const q = h.quest >= 5 && G.zone?.id === 'gate' ? '' : `<b>${t('q.title')}</b>${questText()}`;
  if (q !== S.q) { $('quest').innerHTML = q; S.q = q; }
  for (const a of G.actors) if (a.npc) a.quest = npcHasNews(a.npc, a);
  // minimap at 15 fps
  S.minimapT -= dt;
  if (S.minimapT <= 0) { S.minimapT = 0.066; drawMinimap(); }
  // bag badge
  const n = h.inv.filter((it) => it && it.isNew).length + (h.points > 0 ? 0 : 0);
  setBadge('h-bag', n); setBadge('h-skills', h.points);
}
function setBadge(id, n) {
  const btn = $(id); let d = btn.querySelector('.dot');
  if (n > 0) { if (!d) { d = document.createElement('div'); d.className = 'dot'; btn.appendChild(d); } d.textContent = n; } else if (d) d.remove();
}
// Act V: the Cold, in the amber meter's place: a snowflake, a blue fill with marks at Chilled (50) and Freezing (75), the
// state's name, an arrow while it climbs or falls, and a warm edge while she is Warmed
function coldHud(pl, on) {
  const el = $('cold'), v = COLD.v, st = COLD.state, show = on && (v >= 1 || st !== 'none');
  if (el.hidden === show) el.hidden = !show;
  if (!show) return;
  const w = (v / 100).toFixed(3);
  if (S.cw !== w) { el.querySelector('i').style.transform = `scaleX(${w})`; S.cw = w; }
  const cls = st + (COLD.dir > 0 ? ' up' : COLD.dir < 0 ? ' down' : '') + (pl.buffs.warmed > 0 ? ' warm' : '');
  if (S.cs !== cls) { el.className = cls; S.cs = cls; }
  const lb = t(st === 'none' ? 'hud.cold' : 'hud.' + st);
  if (S.cb !== lb) { el.querySelector('b').textContent = lb; S.cb = lb; }
}
// the tide's dial by the minimap (the Frozen Coast): the ring counts down to the next turn (gold while the bell rings); the
// water in the middle stands at the level; the arrow says rising or falling (a bar at slack water). When the sea is
// closing round her (the lane's 6 s of grace) the dial goes red and counts those seconds instead, with a warning once.
// While a boss owns the water (forced) the ring is dark
const TIDE_PH = ['low', 'flood', 'high', 'ebb'];
function tideHud() {
  const el = $('tide'), d = G.zone?.act5 && G.mode === 'play' ? tideDial() : null;
  if (el.hidden === !!d) el.hidden = !d;
  if (!d) { S.lane = false; return; }
  const H = HAZ5[G.hero.diff] || HAZ5[1], len = H.phases[TIDE_PH.indexOf(d.phase)] || 40;
  const arc = d.lane ? Math.min(1, d.laneT / 6) : d.forced ? 0 : Math.min(1, Math.max(0, d.next / len));
  const y = (31.5 - 24.5 * Math.min(1, Math.max(0, d.k))).toFixed(1), dir = d.dir > 0 ? 1 : d.dir < 0 ? -1 : 0;
  const cls = (d.lane ? 'lane' : d.bell ? 'bell' : '') + (d.forced ? ' forced' : '') + (dir > 0 ? ' up' : dir < 0 ? ' down' : ' slack');
  const key = cls + '|' + arc.toFixed(3) + '|' + y + '|' + dir;
  if (S.tk !== key) {
    S.tk = key;
    el.className = cls;
    el.querySelector('.tr').style.strokeDashoffset = ((1 - arc) * 106.8).toFixed(2);
    el.querySelector('.tw').setAttribute('y', y);
    el.querySelector('.tc').setAttribute('transform', `translate(0 ${(+y - 33).toFixed(1)})`);
  }
  if (S.tph !== d.phase) { S.tph = d.phase; el.title = t('hud.tide') + ' · ' + t('hud.tide.' + d.phase); }
  if (d.lane && !S.lane) { emit('toast', t('hud.lane'), 'warn'); Audio.sfx('tideBell', { vol: 0.5, pitch: 1.5 }); }
  S.lane = d.lane;
}
// first-time hints (Act V): once for each hero (h.flags.hints), as a longer, quieter toast
function hint(k) {
  const F = G.hero?.flags; if (!F) return;
  const H = Array.isArray(F.hints) ? F.hints : (F.hints = []);
  if (H.includes(k)) return;
  H.push(k);
  emit('toast', t('hint.' + k), 'hint');
}

// ---------- minimap ----------
let mapCanvas = null, mapZone = null, mapDirty = 0;
function paintMap(z) {
  const m = z.map;
  if (!mapCanvas || mapZone !== z) { mapCanvas = document.createElement('canvas'); mapCanvas.width = m.w; mapCanvas.height = m.h; mapZone = z; }
  const g = mapCanvas.getContext('2d'), img = g.createImageData(m.w, m.h), d = img.data;
  const town = z.id === 'town', tone = z.L.bed || z.L.ice ? mapTone : null;
  for (let i = 0; i < m.w * m.h; i++) {
    if (!m.explored[i] && !town) continue;
    const fl = m.cells[i];
    const k = i * 4;
    // Act V: the water by its depth and the ice by its kind (tide.js)
    const c = tone && tone(z, i);
    if (c) { d[k] = c >> 16; d[k + 1] = (c >> 8) & 255; d[k + 2] = c & 255; d[k + 3] = 215; continue; }
    if (fl) { d[k] = 92; d[k + 1] = 84; d[k + 2] = 66; d[k + 3] = 200; }
    else {
      // edge cells show as walls
      const x = i % m.w, y = (i / m.w) | 0;
      if ((x > 0 && m.cells[i - 1]) || (x < m.w - 1 && m.cells[i + 1]) || (y > 0 && m.cells[i - m.w]) || (y < m.h - 1 && m.cells[i + m.w])) { d[k] = 170; d[k + 1] = 150; d[k + 2] = 104; d[k + 3] = 230; }
    }
  }
  g.putImageData(img, 0, 0);
}
export function revealMap() { mapDirty++; }
function drawMinimap(big) {
  const z = G.zone, pl = G.player; if (!z || !pl) return;
  const cv = big || $('minimap'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
  // (Act V: the ice cracks and heals without moving a wall, so its tones repaint once a second)
  const ice5 = !big && !!z.ice && ++S.iceRep % 15 === 0;
  if (z.map.reveal(pl.x, pl.z, 13) || mapZone !== z || mapDirty || ice5) { paintMap(z); mapDirty = 0; }
  g.clearRect(0, 0, W, H);
  g.save();
  if (!big) { g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, 6.283); g.clip(); }
  const sc = big ? Math.min(W / z.map.w, H / z.map.h) * 0.95 : 3.2;
  const ox = big ? (W - z.map.w * sc) / 2 : W / 2 - pl.x * sc, oy = big ? (H - z.map.h * sc) / 2 : H / 2 - pl.z * sc;
  g.fillStyle = 'rgba(5,6,9,0.85)'; g.fillRect(0, 0, W, H);
  g.imageSmoothingEnabled = false;
  g.drawImage(mapCanvas, ox, oy, z.map.w * sc, z.map.h * sc);
  const P = (x, y) => [ox + x * sc, oy + y * sc];
  const dot = (x, y, r, c) => { const [px, py] = P(x, y); g.fillStyle = c; g.beginPath(); g.arc(px, py, r, 0, 6.283); g.fill(); };
  for (const it of z.interact) {
    // a lit waylamp is spent as a thing to touch, but it is still a light on the map
    if (it.used && !((it.kind === 'waylamp' || it.kind === 'sealight' || it.kind === 'nameStone') && it.lit)) continue;
    const ex = z.map.explored[Math.floor(it.z) * z.map.w + Math.floor(it.x)];
    if (!ex && z.id !== 'town') continue;
    const c = it.kind === 'waylamp' || it.kind === 'sealight' ? (it.lit ? '#ffd070' : '#8a8274') : { waypoint: '#6aa8ff', exit: '#f0e0c0', chest: '#f2d24a', shrine: '#ffe0a0', npc: '#f0c860', stash: '#c0a060', portal: '#6aa8ff', tear: '#ffa030', altar: '#ff7a40', brazier: '#ff9a40', bellows: '#ff6a20', echo: '#e8e0d0', staff: '#ffe8b0', beacon: '#ffd040', coal: '#ffd040', hearth: '#ffb060', nameStone: it.lit ? '#ffe0b0' : '#b8c8d8', window: '#bfe4ff', holeLamp: '#ffd080', cairn: '#ffa040', farLight: '#fff4d0', doorStone: '#e8e0d0', remember: '#e8f0ff' }[it.kind] || '#fff';
    dot(it.x, it.z, it.kind === 'npc' ? 3.5 : 4, c);
  }
  for (const a of G.actors) {
    // (nothing gives away what is under the ice or the water)
    if (a.dead || a.team !== 'foe' || a.prop || a.under) continue;
    if (Math.hypot(a.x - pl.x, a.z - pl.z) > 22 && !a.boss) continue;
    dot(a.x, a.z, a.boss ? 6 : a.elite ? 3.5 : 2.2, a.boss ? '#ff3020' : a.elite === 'rare' ? '#f2d24a' : a.elite ? '#6a90ff' : '#e04030');
  }
  for (const p of G.pickups) if (p.kind === 'item' && p.item.rar >= 2) dot(p.x, p.z, 2.5, p.item.rar === 3 ? '#ff8a2a' : '#f2d24a');
  // quest marker
  const goal = questGoal();
  if (goal) { const [gx, gy] = P(goal.x, goal.z); const s = 5 + Math.sin(performance.now() / 250) * 1.5; g.fillStyle = '#ffd040'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 - 1.57, r = i % 2 ? s * 0.45 : s; g.lineTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r); } g.fill(); }
  // hero arrow
  const [hx, hy] = P(pl.x, pl.z);
  g.translate(hx, hy); g.rotate(-pl.rot + Math.PI);
  g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 5); g.lineTo(0, 2); g.lineTo(-5, 5); g.closePath(); g.stroke(); g.fill();
  g.restore();
}
export const drawBigMap = (cv) => drawMinimap(cv);
function questGoal() {
  const z = G.zone, q = G.hero.quest, F = G.hero.flags, L = z.L;
  const g5 = goal5(z, q, F, L); if (g5 !== undefined) return g5;
  if (z.id === 'town') { if (q >= 11 && q <= 14) return L.exits.find((e) => e.to === 'weep'); if (q >= 18 && q <= 21) return L.exits.find((e) => e.to === 'ashfield'); if (q === 0 || q === 4 || q >= 5) return L.spots.npcs.wayfarer; if (q >= 1 && q < 4) return L.exits[0]; }
  if (z.id === 'forest') { if (q <= 2 && !G.hero.flags.weaver) return L.boss; if (q >= 2 && q < 4) return L.barrowDoor; if (q >= 4) return L.exits.find((e) => e.to === 'town'); }
  if (z.id === 'crypt') { if (q < 4) return L.boss; }
  // Act III: the Lanternglade, the nearest unseen verse of the Long Sorrow, the Glade of Stones, the gate, the walls, the Lady
  if (z.id === 'weep') {
    if (q <= 11) return L.spots.npcs.elati;
    if (q === 12) { let best = null, bd = 1e9; for (const s of L.spots.tears) if (s.story && !F['tear_' + s.id]) { const d = Math.hypot(s.x - G.player.x, s.z - G.player.z); if (d < bd) { bd = d; best = s; } } return best; }
    if (q === 13) return L.spots.glade;
    if (q === 14) return L.exits.find((e) => e.to === 'heart');
    if (q === 15) return L.exits.find((e) => e.to === 'town');
  }
  if (z.id === 'heart') {
    if (q === 14) { const i = [0, 1, 2].find((k) => !F['thorn' + k]); return i != null ? L.thorns[i].node : L.boss; }
    if (q === 15) return L.exits.find((e) => e.to === 'weep');
  }
  // Act IV: the nearest lamp still to light (or to remember), the Anvil Gate, the Great Bellows, the Anvil, the road home
  const near = (list) => { let best = null, bd = 1e9; for (const s of list) { const d = Math.hypot(s.x - G.player.x, s.z - G.player.z); if (d < bd) { bd = d; best = s; } } return best; };
  if (z.id === 'ashfield') {
    if (q === 18) return near((z.act4?.lamps || []).filter((l) => l.memory && (!l.lit || !F['mem_' + l.id]))) || L.boss;
    if (q === 19) return L.boss;
    if (q === 20 || q === 21) return L.exits.find((e) => e.to === 'forge');
    if (q === 22) return L.exits.find((e) => e.to === 'town');
  }
  if (z.id === 'forge') {
    if (q === 20) { const b = near((z.act4?.bellows || []).filter((it) => !F['bellows' + it.id])); return b || null; }
    if (q === 21) return L.boss;
    if (q === 22) return L.exits.find((e) => e.to === 'ashfield');
  }
  return null;
}

// Act V: Alkyone, the coal, the road north; Alkyone at the Last Lamp, the Neck; the hearth, a memory owed in the ice, the
// nearest dark sea-light, the bay, the road onto the ice; the camp, the next hole, the skerry's stair, the door-stone; the
// way home and the child (undefined: not an Act V step here)
function goal5(z, q, F, L) {
  if (q < 24 || q > 30) return undefined;
  const near = (list) => { let best = null, bd = 1e9; for (const s of list) { const d = Math.hypot(s.x - G.player.x, s.z - G.player.z); if (d < bd) { bd = d; best = s; } } return best; };
  const exit = (to) => L.exits.find((e) => e.to === to) || null;
  if (z.id === 'town') return q === 24 ? (F.coastCall && !F.coal ? z.interact.find((i) => i.kind === 'coal') : L.spots.npcs.wayfarer) : q === 30 ? L.spots.npcs.wayfarer : q <= 29 ? exit('ashfield') : undefined;
  if (z.id === 'ashfield') return q === 25 ? (F.alkField ? exit('coast') : z.p5?.alkyone?.a || exit('coast')) : q === 30 ? exit('town') : null;
  if (z.id === 'forge') return q === 25 || q === 30 ? exit('ashfield') : null;
  if (z.id === 'coast') {
    if (q === 25) return F.coastSeen ? L.spots.hearth : null;
    if (q === 26) {
      const owed = z.act5?.lights.find((it) => { const m = it.lit && iceMemOf(it.id); return m && !F['mem_' + m]; });
      return owed ? owed.win : near((z.act5?.lights || []).filter((it) => !it.lit)) || L.boss;
    }
    if (q === 27) return L.boss;
    if (q === 28) return exit('farlight');
    return q === 30 ? exit('ashfield') : null;
  }
  if (z.id === 'farlight') {
    if (q === 28) return !F.alkShip ? L.spots.npcs.alkyone : L.spots.holes.find((ho) => !F['hole' + ho.id]) || L.boss;
    if (q === 29) return F.seaLit && F.mem_i4 ? z.act5?.doorIt || L.spots.farLight.door : L.spots.farLight.door;
    return q === 30 ? exit('coast') : null;
  }
  return undefined;
}

// walls that open at runtime (the Root Gate, the thorn walls, a standing stone the Hart breaks) repaint the map
on('mapChanged', () => { mapDirty++; });
on('stoneBroken', () => { mapDirty++; });

// ---------- messages ----------
on('toast', (msg, kind) => {
  if (msg === 'full') msg = t('hud.full');
  const d = document.createElement('div'); d.className = 'toast' + (kind ? ' ' + kind : ''); d.textContent = msg;
  const box = $('toasts'); box.appendChild(d);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => d.remove(), kind === 'hint' ? 6000 : 3500);
});
on('zoneEnter', (id) => {
  const zn = $('zonename');
  zn.querySelector('.a').textContent = t('zone.' + id);
  zn.querySelector('.b').textContent = id === 'gate' ? t('zone.gate.s', G.gate?.tier || 1) : t('zone.' + id + '.s');
  zn.classList.remove('on'); void zn.offsetWidth; zn.classList.add('on');
  // (played once: the HUD hidden by a scene and shown again would start a banner still marked 'on' over)
  zn.onanimationend = () => zn.classList.remove('on');
  mapZone = null;
  // (Act V: what the music was told about the place she left is not carried into the next; the tide's news once a visit)
  Audio.mood({ skotos: 0, gust: 0, sub: 0, under: 0, freeze: 0, lit: false });
  S.tideToast = false; S.lane = false;
});
on('levelUp', (lvl, sk) => {
  const lu = $('levelup');
  lu.querySelector('.a').textContent = t('hud.levelup', lvl);
  lu.querySelector('.b').textContent = sk ? t('hud.newSkill', t('sk.' + sk.id)) : t('hud.levelupSub');
  lu.classList.remove('on'); void lu.offsetWidth; lu.classList.add('on');
  lu.onanimationend = () => lu.classList.remove('on');
});
on('hurt', (f) => { S.hurt = Math.min(0.7, (S.hurt || 0) + f * 3); });
on('flueWarn', (k) => { S.flue = Math.max(S.flue, 0.25 + 0.55 * k); });
on('bossIntro', (a) => {
  G.bossActor = a;
  const bb = $('bossbar');
  bb.querySelector('.nm').textContent = a.name || t('mon.' + a.kind);
  bb.querySelector('.ti').textContent = a.name ? t('gate.guardianName') : t('mon.' + a.kind + '.t');
  // the Lady has a waltz of her own; it gains brass as she loses her roots. Ivar and Karthax have theirs; so do the Walking
  // Tower and the Skotos
  if (OWN_THEME.has(a.kind)) { Audio.mood({ phase: 0, lit: false, sub: 0, under: 0 }); Audio.music(a.kind); } else Audio.music('boss');
  Audio.sting('bossIntro');
  // (Greek in capitals takes no accents: ΤΟ ΣΚΟΤΟΣ, not ΤΟ ΣΚΌΤΟΣ)
  emit('toast', (a.name || t('mon.' + a.kind)).toUpperCase().normalize('NFD').replace(/\u0301/g, '').normalize('NFC'), 'big');
});
on('bossPhase', (a, ph) => { if (OWN_THEME.has(a?.kind)) Audio.mood({ phase: ph }); });
// (the Skotos's fall is no fanfare: the music stops for the names, one bell each, and the naming's chord; the story then
// plays the sea lit)
on('bossDown', (a) => {
  if (a?.kind === 'skotos' && !a.echo) { Audio.music(null); return; }
  Audio.music(G.zone.id === 'gate' ? 'gate' : ZONES[G.zone.id]?.music || G.zone.id); Audio.sting('victory');
});
// ---------- Act V: what the sea and the ice say (sounds that carry timing, first-time hints) ----------
on('cold', (st) => { if (st === 'chilled' || st === 'freezing') hint('cold'); });
on('tideBell', () => { hint('tide'); if (!S.tideToast) { S.tideToast = true; emit('toast', t('q.tideTurn'), 'quest'); } });
on('tideTurn', (ph) => { if (ph === 'flood' || ph === 'ebb') Audio.sfx('tideTurn', { vol: 0.7, pitch: ph === 'flood' ? 1 : 0.85 }); });
on('gustWarn', () => Audio.sfx('gustRise'));
on('gust', (g) => { Audio.mood({ gust: g ? 1 : 0 }); if (g) Audio.sfx('blizzard', { vol: 0.9 }); });
// each turn of a sea-light's beam rings its bell, so the sweep can be heard coming round
on('beamTurn', (b) => { if (G.zone?.act5 && b) Audio.sfx('beamBell', { x: b.x, z: b.z, vol: 0.7, pitch: b.prop ? 1 : 1.12 }); });
on('lampSnuffed', (it) => { if (G.zone?.act5 && it) Audio.sfx('lampSnuff', { x: it.x, z: it.z }); });
on('louseCurl', () => hint('louse'));
// the bosses with a theme of their own (the rest share 'boss')
const OWN_THEME = new Set(['amaranthe', 'ivar', 'karthax', 'tower', 'skotos']);
let masT = 0;
export function comboTick(dt) {
  const c = G.combo;
  if (c.t > 0) { c.t -= dt; if (c.t <= 0) { if (c.n >= 8) { const m = $('massacre'); m.textContent = t('hud.massacre', c.n); m.classList.remove('on'); void m.offsetWidth; m.classList.add('on'); Audio.sfx('crit', { vol: 0.5 }); } c.n = 0; } }
  void masT;
}
// ---------- dialog ----------
on('dialog', (d) => {
  S.dialog = Object.assign({ i: 0, shown: 0 }, d);
  const box = $('dialog');
  box.hidden = false;
  showLine();
  Audio.sfx('click');
});
// the Lady's voice in the still trees, and the Ash King's whispers, read differently from a spoken line; what the scene
// tells (the First Autumn's wind, the fire leaving the beacon, the Unmaking) is told without quotes
// (Act V: the fourth fire going out, the coal, the coast and the rite, the Freeze, the ice, the naming, the carving, home)
const NARR = /^d\.(leave|k|u|field|forge|answer\.0|ivar\.lamp|altar\.(took|refused)|out|coal|kindle|coast|landing|rite|wake|freeze|far|lit|rise|relight|naming|carve|home|answer5|stone)\b/;
function sayClass(k) {
  // (Isarn's shout in the cages phase is his, not the Ash King's, whatever its key)
  if (k === 'd.karthax.hint') return 'quest';
  if (k.startsWith('d.ash') || k === 'd.amaranthe.p2' || k.startsWith('d.karthax')) return 'quest ash';
  if (k.startsWith('d.voice')) return 'quest flame';
  if (k.startsWith('d.ivar') || k === 'd.staff') return 'quest pale';
  if (k.startsWith('d.lady') || k.startsWith('d.amaranthe') || k.startsWith('d.cage') || k.startsWith('d.altar')) return 'quest voice';
  // Act V: the dark's voice, pale as ice; the names said into it
  if (k.startsWith('d.skotos')) return 'quest ice';
  if (k.startsWith('name.') || k.startsWith('d.selna')) return 'quest names';
  return 'quest';
}
on('say', (key) => {
  const narr = key.startsWith('d.autumn') || NARR.test(key);
  emit('toast', narr ? t(key) : '«' + t(key) + '»', narr ? 'quest wind' : sayClass(key));
});
// a line is a key, or [key, who] when a scene has more than one speaker (an Amber Tear's memory)
function showLine() {
  const d = S.dialog, ln = d.lines[d.i], key = Array.isArray(ln) ? ln[0] : ln, who = Array.isArray(ln) ? ln[1] : d.who;
  d.text = t(key); d.shown = 0;
  const box = $('dialog');
  // (a name the world has forgotten shows as «…», npcName; the dark's portrait is a black disc with no letter)
  if (who !== d.cur || who === 'selna') { d.cur = who; const nm = npcName(who); box.querySelector('.who').textContent = nm; box.querySelector('.face').textContent = who === 'skotos' ? '' : nm[0] || ''; box.dataset.who = who; }
}
export function dialogTick(dt) {
  const d = S.dialog; if (!d) return;
  if (d.shown < d.text.length) { d.shown = Math.min(d.text.length, d.shown + dt * 55); $('dialog').querySelector('.txt').textContent = d.text.slice(0, Math.floor(d.shown)); }
}
export function advanceDialog() {
  const d = S.dialog; if (!d) return false;
  if (d.shown < d.text.length) { d.shown = d.text.length; $('dialog').querySelector('.txt').textContent = d.text; return true; }
  d.i++;
  Audio.sfx('click', { vol: 0.5 });
  if (d.i >= d.lines.length) { $('dialog').hidden = true; S.dialog = null; d.end?.(); return true; }
  showLine();
  return true;
}
export const dialogOpen = () => !!S.dialog;
export function showHud(v) { $('hud').hidden = !v; }
