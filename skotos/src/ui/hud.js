// In-game HUD: bars, skill buttons, minimap, toasts, boss bar, dialog box.
import { G } from '../game/state.js';
import { CLASSES, SKILLS, xpToNext, DODGE, POTION } from '../game/data.js';
import { skillUnlocked } from '../game/stats.js';
import { canUse } from '../game/skills.js';
import { IN, bindButton } from '../core/input.js';
import { on, emit } from './bus.js';
import { ICON } from './icons.js';
import { t } from '../i18n/i18n.js';
import { fmt } from '../core/util.js';
import { npcHasNews, questText } from '../game/story.js';
import Audio from '../audio/audio.js';

const $ = (id) => document.getElementById(id);
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
let built = false;
const S = { hpW: 1, lagW: 1, minimapT: 0, toastN: 0, dialog: null };

export function buildHud() {
  if (built) return; built = true;
  const app = $('app');
  app.appendChild(el(`<div id="vignette"></div>`));
  const hud = el(`<div id="hud" hidden>
    <div id="hurt"></div>
    <div id="hud-tl"><div id="portrait"><span id="pic"></span><div id="lvl">1</div></div>
      <div id="bars"><div class="bar hp"><i class="lag"></i><i class="fill"></i><i class="shield"></i><span></span></div><div class="bar res"><i class="fill"></i></div><div id="xpbar"><i></i></div><div id="buffs"></div></div></div>
    <div id="hud-tr"><canvas id="minimap" width="264" height="264"></canvas>
      <div id="hud-btns"><button class="hbtn" id="h-bag" aria-label="bag">${ICON.bag}</button><button class="hbtn" id="h-skills" aria-label="skills">${ICON.book}</button><button class="hbtn" id="h-menu" aria-label="menu">${ICON.menu}</button></div>
      <div id="quest"></div></div>
    <div id="bossbar" hidden><div class="nm"></div><div class="ti"></div><div class="bar"><i class="fill"></i></div></div>
    <div id="gatebar" hidden><div class="nm"></div><div class="bar"><i class="fill"></i></div></div>
    <div id="toasts"></div>
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
    const label = f.kind === 'npc' ? t('talk') + ' · ' + t('npc.' + f.npc) : f.kind === 'exit' ? (f.locked && !h.flags[f.locked] ? t('locked') : t(f.prompt)) : t(f.prompt);
    const ic = f.kind === 'npc' ? 'talk' : f.kind === 'chest' ? 'chest' : f.kind === 'exit' || f.kind === 'portal' ? 'gate' : f.kind === 'waypoint' ? 'portal' : 'hand';
    if (u.dataset.l !== label) { u.innerHTML = ICON[ic] + `<span>${label}</span>`; u.dataset.l = label; }
  } else u.hidden = true;
  // buffs
  const bf = [];
  for (const k in pl.buffs) if (pl.buffs[k] > 0 && k !== 'evergreen') bf.push(`<div class="bf">${ICON[{ cry: 'horn', shrineFury: 'flame', shrineSpeed: 'roll', shrineFortune: 'coin', shrineShield: 'shield' }[k] || 'star']}<b>${Math.ceil(pl.buffs[k])}</b></div>`);
  const bh = bf.join('');
  if (bh !== S.bh) { $('buffs').innerHTML = bh; S.bh = bh; }
  // boss
  const b = G.bossActor;
  const bb = $('bossbar');
  if (b && !b.dead) { bb.hidden = false; bb.querySelector('.fill').style.transform = `scaleX(${Math.max(0, b.hp / b.hpMax)})`; } else bb.hidden = true;
  // gate progress
  const gb = $('gatebar');
  if (G.gate && G.zone?.id === 'gate' && !G.bossActor) { gb.hidden = false; gb.querySelector('.nm').textContent = t('gate.progress') + ' · ' + t('gate.tier', G.gate.tier); gb.querySelector('.fill').style.transform = `scaleX(${Math.min(1, G.gate.progress)})`; } else gb.hidden = true;
  // quest
  const q = h.quest >= 5 && G.zone?.id === 'gate' ? '' : `<b>${t('q.title')}</b>${questText()}`;
  if (q !== S.q) { $('quest').innerHTML = q; S.q = q; }
  for (const a of G.actors) if (a.npc) a.quest = npcHasNews(a.npc);
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

// ---------- minimap ----------
let mapCanvas = null, mapZone = null, mapDirty = 0;
function paintMap(z) {
  const m = z.map;
  if (!mapCanvas || mapZone !== z) { mapCanvas = document.createElement('canvas'); mapCanvas.width = m.w; mapCanvas.height = m.h; mapZone = z; }
  const g = mapCanvas.getContext('2d'), img = g.createImageData(m.w, m.h), d = img.data;
  const town = z.id === 'town';
  for (let i = 0; i < m.w * m.h; i++) {
    if (!m.explored[i] && !town) continue;
    const fl = m.cells[i];
    const k = i * 4;
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
  if (z.map.reveal(pl.x, pl.z, 13) || mapZone !== z || mapDirty) { paintMap(z); mapDirty = 0; }
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
    if (it.used) continue;
    const ex = z.map.explored[Math.floor(it.z) * z.map.w + Math.floor(it.x)];
    if (!ex && z.id !== 'town') continue;
    const c = { waypoint: '#6aa8ff', exit: '#f0e0c0', chest: '#f2d24a', shrine: '#ffe0a0', npc: '#f0c860', stash: '#c0a060', portal: '#6aa8ff' }[it.kind] || '#fff';
    dot(it.x, it.z, it.kind === 'npc' ? 3.5 : 4, c);
  }
  for (const a of G.actors) {
    if (a.dead || a.team !== 'foe' || a.prop) continue;
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
  const z = G.zone, q = G.hero.quest;
  if (z.id === 'town') { if (q === 0 || q === 4 || q >= 5) return z.L.spots.npcs.wayfarer; if (q >= 1 && q < 4) return z.L.exits[0]; }
  if (z.id === 'forest') { if (q <= 2 && !G.hero.flags.weaver) return z.L.boss; if (q >= 2 && q < 4) return z.L.barrowDoor; if (q >= 4) return z.L.exits.find((e) => e.to === 'town'); }
  if (z.id === 'crypt') { if (q < 4) return z.L.boss; }
  return null;
}

// ---------- messages ----------
on('toast', (msg, kind) => {
  if (msg === 'full') msg = t('hud.full');
  const d = document.createElement('div'); d.className = 'toast' + (kind ? ' ' + kind : ''); d.textContent = msg;
  const box = $('toasts'); box.appendChild(d);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => d.remove(), 3500);
});
on('zoneEnter', (id) => {
  const zn = $('zonename');
  zn.querySelector('.a').textContent = t('zone.' + id);
  zn.querySelector('.b').textContent = id === 'gate' ? t('zone.gate.s', G.gate?.tier || 1) : t('zone.' + id + '.s');
  zn.classList.remove('on'); void zn.offsetWidth; zn.classList.add('on');
  mapZone = null;
});
on('levelUp', (lvl, sk) => {
  const lu = $('levelup');
  lu.querySelector('.a').textContent = t('hud.levelup', lvl);
  lu.querySelector('.b').textContent = sk ? t('hud.newSkill', t('sk.' + sk.id)) : t('hud.levelupSub');
  lu.classList.remove('on'); void lu.offsetWidth; lu.classList.add('on');
});
on('hurt', (f) => { S.hurt = Math.min(0.7, (S.hurt || 0) + f * 3); });
on('bossIntro', (a) => {
  G.bossActor = a;
  const bb = $('bossbar');
  bb.querySelector('.nm').textContent = a.name || t('mon.' + a.kind);
  bb.querySelector('.ti').textContent = a.name ? t('gate.guardianName') : t('mon.' + a.kind + '.t');
  Audio.music('boss'); Audio.sting('bossIntro');
  emit('toast', (a.name || t('mon.' + a.kind)).toUpperCase(), 'big');
});
on('bossDown', () => { Audio.music(G.zone.id === 'gate' ? 'gate' : G.zone.id); Audio.sting('victory'); });
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
  box.querySelector('.who').textContent = t('npc.' + d.who);
  box.querySelector('.face').textContent = t('npc.' + d.who)[0];
  showLine();
  Audio.sfx('click');
});
on('say', (key) => emit('toast', '«' + t(key) + '»', 'quest'));
function showLine() { const d = S.dialog; d.text = t(d.lines[d.i]); d.shown = 0; }
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
