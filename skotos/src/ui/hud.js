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
import { mapTone } from '../game/tide.js';

const $ = (id) => document.getElementById(id);
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
// a drop of amber: the sap status and the Memory of the Evergreen
const TEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c3.2 4.6 6 8 6 11.2A6 6 0 0 1 6 14.2C6 11 8.8 7.6 12 3z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.4 2.6" opacity=".7"/></svg>';
// Act IV: the eye of the dead (Seen), an Ember Tick on her back (Clinging)
const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg>';
const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="13.5" rx="4.6" ry="5.6"/><circle cx="12" cy="6.4" r="2"/><path d="M7.6 10.5 4 8.5M7.4 14H3.5M7.8 17.2 4.6 20M16.4 10.5 20 8.5M16.6 14h3.9M16.2 17.2l3.2 2.8"/></svg>';
let built = false;
const S = { hpW: 1, lagW: 1, minimapT: 0, toastN: 0, dialog: null, flue: 0 };

export function buildHud() {
  if (built) return; built = true;
  const app = $('app');
  app.appendChild(el(`<div id="vignette"></div>`));
  const hud = el(`<div id="hud" hidden>
    <div id="hurt"></div><div id="flue"></div>
    <div id="hud-tl"><div id="portrait"><span id="pic"></span><div id="lvl">1</div></div>
      <div id="bars"><div class="bar hp"><i class="lag"></i><i class="fill"></i><i class="shield"></i><span></span></div><div class="bar res"><i class="fill"></i></div><div id="xpbar"><i></i></div><div id="buffs"></div>
        <div id="amber" hidden><span class="ic">${TEAR}</span><div class="ab"><i></i></div><b></b></div>
        <div id="cling" hidden><span class="ic">${TICK}</span><b></b></div></div></div>
    <div id="hud-tr"><canvas id="minimap" width="264" height="264"></canvas>
      <div id="hud-btns"><button class="hbtn" id="h-bag" aria-label="bag">${ICON.bag}</button><button class="hbtn" id="h-skills" aria-label="skills">${ICON.book}</button><button class="hbtn" id="h-menu" aria-label="menu">${ICON.menu}</button></div>
      <div id="quest"></div></div>
    <div id="bossbar" hidden><div class="nm"></div><div class="ti"></div><div class="bar"><i class="fill"></i></div></div>
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
    const label = f.kind === 'npc' ? t('talk') + ' · ' + t('npc.' + f.npc) : f.kind === 'exit' ? (f.locked && !h.flags[f.locked] ? t('locked') : t(f.prompt)) : t(f.prompt);
    const ic = f.kind === 'npc' ? 'talk' : f.kind === 'chest' ? 'chest' : f.kind === 'exit' || f.kind === 'portal' ? 'gate' : f.kind === 'waypoint' ? 'portal' : 'hand';
    if (u.dataset.l !== label) { u.innerHTML = ICON[ic] + `<span>${label}</span>`; u.dataset.l = label; }
  } else u.hidden = true;
  // buffs
  const bf = [];
  for (const k in pl.buffs) if (pl.buffs[k] > 0 && k !== 'evergreen') bf.push(`<div class="bf${k === 'memory' ? ' mem' : k === 'seen' ? ' seen' : ''}"${k === 'seen' ? ` title="${t('hud.seen')}"` : ''}>${k === 'memory' ? TEAR : k === 'seen' ? EYE : ICON[{ cry: 'horn', shrineFury: 'flame', shrineSpeed: 'roll', shrineFortune: 'coin', shrineShield: 'shield' }[k] || 'star']}<b>${Math.ceil(pl.buffs[k])}</b></div>`);
  const bh = bf.join('');
  if (bh !== S.bh) { $('buffs').innerHTML = bh; S.bh = bh; }
  // amber sap: the build-up toward an amber-lock, then the lock itself (a dodge breaks it)
  const st = pl.status || {}, rooted = st.root > 0, stick = Math.min(1, (st.stick || 0) / 1.5);
  const am = $('amber'), show = rooted || stick > 0.02;
  if (am.hidden === show) am.hidden = !show;
  if (show) {
    am.classList.toggle('rooted', rooted);
    am.querySelector('i').style.transform = `scaleX(${rooted ? st.root / 1.2 : stick})`;
    const lb = rooted ? t('hud.rooted') : t('hud.sap');
    if (S.amb !== lb) { am.querySelector('b').textContent = lb; S.amb = lb; }
  }
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
  if (b && !b.dead) { bb.hidden = false; bb.querySelector('.fill').style.transform = `scaleX(${Math.max(0, b.hp / b.hpMax)})`; } else bb.hidden = true;
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
    // a lit waylamp is spent as a thing to touch, but it is still a light on the map
    if (it.used && !(it.kind === 'waylamp' && it.lit)) continue;
    const ex = z.map.explored[Math.floor(it.z) * z.map.w + Math.floor(it.x)];
    if (!ex && z.id !== 'town') continue;
    const c = it.kind === 'waylamp' ? (it.lit ? '#ffd070' : '#8a8274') : { waypoint: '#6aa8ff', exit: '#f0e0c0', chest: '#f2d24a', shrine: '#ffe0a0', npc: '#f0c860', stash: '#c0a060', portal: '#6aa8ff', tear: '#ffa030', altar: '#ff7a40', brazier: '#ff9a40', bellows: '#ff6a20', echo: '#e8e0d0', staff: '#ffe8b0', beacon: '#ffd040' }[it.kind] || '#fff';
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
  const z = G.zone, q = G.hero.quest, F = G.hero.flags, L = z.L;
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

// walls that open at runtime (the Root Gate, the thorn walls, a standing stone the Hart breaks) repaint the map
on('mapChanged', () => { mapDirty++; });
on('stoneBroken', () => { mapDirty++; });

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
on('flueWarn', (k) => { S.flue = Math.max(S.flue, 0.25 + 0.55 * k); });
on('bossIntro', (a) => {
  G.bossActor = a;
  const bb = $('bossbar');
  bb.querySelector('.nm').textContent = a.name || t('mon.' + a.kind);
  bb.querySelector('.ti').textContent = a.name ? t('gate.guardianName') : t('mon.' + a.kind + '.t');
  // the Lady has a waltz of her own; it gains brass as she loses her roots. Ivar and Karthax have theirs.
  if (a.kind === 'amaranthe' || a.kind === 'ivar' || a.kind === 'karthax') { Audio.mood({ phase: 0 }); Audio.music(a.kind); } else Audio.music('boss');
  Audio.sting('bossIntro');
  emit('toast', (a.name || t('mon.' + a.kind)).toUpperCase(), 'big');
});
on('bossPhase', (a, ph) => { if (a?.kind === 'amaranthe' || a?.kind === 'ivar' || a?.kind === 'karthax') Audio.mood({ phase: ph }); });
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
  showLine();
  Audio.sfx('click');
});
// the Lady's voice in the still trees, and the Ash King's whispers, read differently from a spoken line; what the scene
// tells (the First Autumn's wind, the fire leaving the beacon, the Unmaking) is told without quotes
const NARR = /^d\.(leave|k|u|field|forge|answer\.0|ivar\.lamp|altar\.(took|refused))\b/;
function sayClass(k) {
  // (Isarn's shout in the cages phase is his, not the Ash King's, whatever its key)
  if (k === 'd.karthax.hint') return 'quest';
  if (k.startsWith('d.ash') || k === 'd.amaranthe.p2' || k.startsWith('d.karthax')) return 'quest ash';
  if (k.startsWith('d.voice')) return 'quest flame';
  if (k.startsWith('d.ivar') || k === 'd.staff') return 'quest pale';
  if (k.startsWith('d.lady') || k.startsWith('d.amaranthe') || k.startsWith('d.cage') || k.startsWith('d.altar')) return 'quest voice';
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
  if (who !== d.cur) { d.cur = who; box.querySelector('.who').textContent = t('npc.' + who); box.querySelector('.face').textContent = t('npc.' + who)[0]; box.dataset.who = who; }
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
