// Modal panels: inventory, skills, shops, stash, waypoints, gates, pause, settings, credits, death, act end, map.
import { G } from '../game/state.js';
import { CLASSES, SKILLS, DIFFS, SLOTS, SKILL_MAX_RANK, BASES, DODGE, BOONS, GIFTS } from '../game/data.js';
import { computeStats, skillRank, skillUnlocked, refreshStats } from '../game/stats.js';
import { itemName, statLines, sellValue, equipSlots, usable, withItem, bestSlotFor, itemClass } from '../game/items.js';
import { equip, unequip, sell, sellJunk, toStash, fromStash, gamble, gambleCost, reforge, reforgeCost } from '../game/inventory.js';
import { writeSave } from '../game/save.js';
import { on, emit } from './bus.js';
import { ICON, SLOT_ICON } from './icons.js';
import { t, setLang, lang } from '../i18n/i18n.js';
import { fmt, fmtK } from '../core/util.js';
import { drawBigMap } from './hud.js';
import Audio from '../audio/audio.js';
import { CREDITS, MIT_ROCKETBOX } from './credits.js';

const $ = (id) => document.getElementById(id);
const P = { name: null, sel: null, tab: 0, ctx: null, delSure: null };
const ICON_OF = { sword: 'sword', axe: 'sword', mace: 'sword', crossbow: 'bolt', staff: 'flame', shield: 'shield', quiver: 'bolt', orb: 'orb', helm: 'skull', chest: 'shield', gloves: 'hand', boots: 'roll', amulet: 'star', ring: 'orb' };
// the Act IV blessing reads as it counts: half again for a hero the crown never held (Unbound)
const unboundBoon = (id) => !!G.hero?.flags?.unbound && BOONS[4].some((b) => b.id === id);
const boonDesc = (id) => t('boon.' + id + (unboundBoon(id) ? '.du' : '.d'));
// the Crown's Offers: each altar's gift and the keeper whose shard offers it
const ALTAR_ICON = { throne: 'shield', forge: 'flame', unfading: 'potion' };

export function initPanels() {
  const p = document.createElement('div'); p.id = 'panel'; p.hidden = true; document.getElementById('app').appendChild(p);
  p.addEventListener('pointerdown', (e) => { if (e.target === p && P.name !== 'dead' && P.name !== 'act' && P.name !== 'boon') close(); });
  p.addEventListener('click', onClick);
  p.addEventListener('input', onInput);
}
on('openPanel', (name, ctx) => open(name, ctx));
export function open(name, ctx) {
  P.name = name; P.sel = null; P.tab = 0; P.ctx = ctx || null;
  G.panel = name;
  $('panel').hidden = false;
  render();
}
export function close() {
  if (!P.name) return;
  // a blessing has to be chosen
  if (P.name === 'boon' && !G.hero?.boons?.[(P.ctx?.act || 1) - 1]) return;
  if (P.name === 'act') emit('actClosed');
  P.name = null; G.panel = null; $('panel').hidden = true;
  for (const it of G.hero?.inv || []) if (it) it.isNew = false;
  Audio.sfx('close');
  writeSave();
}
export const panelOpen = () => !!P.name;

function head(title, gold = true) {
  return `<div class="pn-h"><h2>${title}</h2>${gold ? `<div class="gold">${ICON.coin}${fmt(G.hero.gold)}</div>` : ''}<button class="x" data-a="close" aria-label="${t('panel.close')}">${ICON.close}</button></div>`;
}
function cell(item, a, extra = '', sel = false, label = '') {
  if (!item) { const sl = a.startsWith('eq:') ? a.slice(3) : null; return `<button class="cell empty ${extra}" data-a="${a}">${sl ? ICON[SLOT_ICON[sl]] : ''}${label ? `<span class="lbl">${label}</span>` : ''}</button>`; }
  const up = isUpgrade(item);
  return `<button class="cell r${item.rar} ${sel ? 'sel' : ''} ${extra}" data-a="${a}">${ICON[ICON_OF[item.base]]}${item.isNew ? '<i class="new"></i>' : ''}${up ? '<span class="up">▲</span>' : ''}</button>`;
}
function isUpgrade(item) {
  const h = G.hero;
  if (!usable(item, h.cls) || Object.values(h.equip).includes(item)) return false;
  const c = compare(item);
  return c && (c.dps > 0.5 || (c.dps >= 0 && c.tough > 0.5));
}
function compare(item) {
  const h = G.hero;
  if (!usable(item, h.cls)) return null;
  const slot = bestSlotFor(h, item);
  const cur = G.stats, nxt = computeStats(h, withItem(h.equip, item, slot));
  return { dps: ((nxt.dps - cur.dps) / cur.dps) * 100, tough: ((nxt.toughness - cur.toughness) / cur.toughness) * 100, life: nxt.lifeMax - cur.lifeMax };
}
function tip(item, actions) {
  if (!item) return '';
  const h = G.hero, C = CLASSES[h.cls];
  const ic = itemClass(item);
  let main = '';
  if (item.dmg) { const s = computeStats(h, withItem(h.equip, item, 'weapon')); main = `<div class="main">${fmt(item.dmg[0])}–${fmt(item.dmg[1])}</div><div class="sub">${t('st.aps', item.spd.toFixed(2))} · ${t('item.dps', fmtK((item.dmg[0] + item.dmg[1]) / 2 * item.spd))}</div>`; void s; }
  else if (item.armor) main = `<div class="main">${fmt(item.armor)}</div><div class="sub">${t('stat.armor')}${item.block ? ' · ' + t('st.block', item.block) : ''}</div>`;
  const lines = statLines(item, h.cls).map((l) => `<li>${l}</li>`).join('');
  const leg = item.leg ? `<li class="leg">${t('leg.' + item.leg + '.d')}</li>` : '';
  const eq = Object.values(h.equip).includes(item);
  let cmp = '';
  if (!eq) {
    const c = compare(item);
    if (c) {
      const f = (v, k) => `<span class="${v >= 0 ? 'g' : 'b'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(1)}% ${t(k)}</span>`;
      cmp = `<div class="cmp">${f(c.dps, 'stat.damage')}${f(c.tough, 'stat.toughness')}</div>`;
    } else if (ic) cmp = `<div class="sub r-2">${t('item.forOther', t('class.' + ic))}</div>`;
  }
  return `<div class="tip"><h3 class="r-${item.rar}">${itemName(item)}</h3><div class="sub">${t('rar.' + ['common', 'magic', 'rare', 'legendary'][item.rar])} · ${t('base.' + item.base)}${eq ? ' · ' + t('item.equipped') : ''} · ${t('item.ilvl', item.ilvl)}</div>${main}<ul>${lines}${leg}</ul>${cmp}<div class="acts">${actions}</div></div>`;
}

// ---------- renderers ----------
const R = {
  inventory() {
    const h = G.hero, s = G.stats, C = CLASSES[h.cls];
    const doll = SLOTS.map((sl) => cell(h.equip[sl], 'eq:' + sl, '', P.sel === 'eq:' + sl, '')).join('');
    const bag = h.inv.map((it, i) => cell(it, 'inv:' + i, '', P.sel === 'inv:' + i)).join('');
    const red = (s.red * 100).toFixed(1);
    const stats = `<div class="stats">
      <div><span>${t('stat.damage')}</span><b>${fmtK(s.dps)}</b></div><div><span>${t('stat.toughness')}</span><b>${fmtK(s.toughness)}</b></div>
      <div><span>${t('stat.life')}</span><b>${fmt(s.lifeMax)}</b></div><div><span>${t('stat.armor')}</span><b>${fmt(s.armor)}</b></div>
      <div><span>${t('main.' + C.main)}</span><b>${fmt(s.main)}</b></div><div><span>${t('stat.reduction')}</span><b>${red}%</b></div>
      <div><span>${t('stat.crit')}</span><b>${s.critC.toFixed(1)}% · ${fmt(s.critD)}%</b></div><div><span>${t('stat.speed')}</span><b>${s.aps.toFixed(2)}</b></div>
      <div><span>${t('stat.kills')}</span><b>${fmt(h.stats.kills)}</b></div><div><span>${t('diff.' + DIFFS[h.diff].id)}</span><b style="color:${DIFFS[h.diff].color}">●</b></div>
      ${(h.boons || []).filter(Boolean).map((id) => `<div style="grid-column:1/-1"><span>${ICON.flame} ${t('boon.' + id)}</span><b style="font-size:12px;color:var(--gold2)">${boonDesc(id)}</b></div>`).join('')}</div>`;
    let tp = '';
    if (P.sel) {
      const [w, k] = P.sel.split(':');
      if (w === 'inv') { const it = h.inv[+k]; if (it) tp = tip(it, `${usable(it, h.cls) ? `<button class="btn" data-a="equip:${k}">${t('item.equip')}</button>` : ''}${P.ctx === 'vendor' ? `<button class="btn ghost" data-a="sell:${k}">${t('item.sell')} · ${fmt(sellValue(it))}</button>` : ''}<button class="btn red" data-a="drop:${k}">${t('item.drop')}</button>`); }
      else { const it = h.equip[k]; if (it) tp = tip(it, `<button class="btn ghost" data-a="unequip:${k}">${t('item.unequip')}</button>`); }
    }
    return `<div class="pn">${head(t('hud.inventory'))}<div class="pn-b"><div class="inv"><div><div class="doll">${doll}</div>${stats}</div><div><div class="bag">${bag}</div>${tp}</div></div></div></div>`;
  },
  skills() {
    const h = G.hero, list = SKILLS[h.cls];
    const rows = list.map((sk, i) => {
      const r = skillRank(sk.id), un = skillUnlocked(sk);
      const pips = sk.basic ? '' : `<div class="pips">${Array.from({ length: SKILL_MAX_RANK }, (_, j) => `<i class="${j < Math.max(r, un ? 1 : 0) ? 'on' : ''}"></i>`).join('')}</div>`;
      const meta = [sk.dmg ? t('sk.dmg', Math.round(sk.dmg * (1 + 0.15 * Math.max(0, r - 1)) * 100)) : '', sk.cost ? t('sk.cost', sk.cost, t('res.' + CLASSES[h.cls].res)) : '', sk.cd ? t('sk.cd', sk.cd) : '', !un ? t('sk.unlock', sk.lvl) : ''].filter(Boolean).join(' · ');
      const can = !sk.basic && un && h.points > 0 && r < SKILL_MAX_RANK;
      return `<div class="skr ${un ? '' : 'lock'}"><div class="ic">${ICON[sk.icon]}</div><div><h4>${t('sk.' + sk.id)}${sk.basic ? '' : ` <span class="muted">· ${t('sk.rank', Math.max(r, un ? 1 : 0), SKILL_MAX_RANK)}</span>`}</h4><p>${t('sk.' + sk.id + '.d')}</p><div class="meta">${meta}</div>${pips}</div>${can ? `<button class="btn" data-a="rank:${sk.id}">${t('sk.up')}</button>` : '<span></span>'}</div>`;
    }).join('');
    const D = DODGE[h.cls];
    return `<div class="pn narrow">${head(t('hud.skills'), false)}<div class="pn-b"><div class="row" style="justify-content:space-between;margin-bottom:8px"><b class="r-2" style="font-family:var(--display)">${t('sk.points', h.points)}</b><span class="muted">${t('sk.' + D.kind)} · ${t('sk.cd', D.cd)}</span></div><div class="skl">${rows}</div><p class="muted">${t('sk.help')}</p></div></div>`;
  },
  vendor() {
    const h = G.hero;
    const tabs = `<div class="tabs"><button class="tab ${P.tab === 0 ? 'on' : ''}" data-a="tab:0">${t('item.sell')}</button><button class="tab ${P.tab === 1 ? 'on' : ''}" data-a="tab:1">${t('shop.gamble')}</button></div>`;
    let body;
    if (P.tab === 0) {
      const bag = h.inv.map((it, i) => cell(it, 'inv:' + i, '', P.sel === 'inv:' + i)).join('');
      let tp = '';
      if (P.sel) { const k = +P.sel.split(':')[1], it = h.inv[k]; if (it) tp = tip(it, `<button class="btn" data-a="sell:${k}">${t('item.sell')} · ${fmt(sellValue(it))}</button>${usable(it, h.cls) ? `<button class="btn ghost" data-a="equip:${k}">${t('item.equip')}</button>` : ''}`); }
      body = `<div class="row" style="margin-bottom:10px"><button class="btn ghost" data-a="selljunk">${t('shop.sellAll')}</button></div><div class="bag">${bag}</div>${tp}`;
    } else {
      const cost = gambleCost(h.level);
      const types = ['weapon', 'offhand', 'helm', 'chest', 'gloves', 'boots', 'amulet', 'ring'];
      const baseFor = (ty) => ty === 'weapon' ? CLASSES[h.cls].weapon : ty === 'offhand' ? CLASSES[h.cls].off : ty;
      body = `<p class="muted">${t('shop.gamble.d')}</p><div class="doll" style="grid-template-columns:repeat(4,1fr)">${types.map((ty) => `<button class="cell" data-a="gamble:${baseFor(ty)}">${ICON[ICON_OF[baseFor(ty)]]}<span class="lbl">${t('base.' + baseFor(ty))}</span></button>`).join('')}</div><p class="r-2" style="font-family:var(--display);text-align:center">${t('shop.cost', fmt(cost))}</p>${P.last ? tip(P.last, '') : ''}`;
    }
    return `<div class="pn">${head(t('npc.' + (P.ctx?.npc || 'healer')) + ' · ' + t('shop.vendor'))}<div class="pn-b">${tabs}<div style="margin-top:10px">${body}</div></div></div>`;
  },
  smith() {
    const h = G.hero;
    const eq = SLOTS.map((sl) => cell(h.equip[sl], 'eq:' + sl, '', P.sel === 'eq:' + sl)).join('');
    const bag = h.inv.map((it, i) => cell(it, 'inv:' + i, '', P.sel === 'inv:' + i)).join('');
    let tp = '';
    if (P.sel) {
      const [w, k] = P.sel.split(':'); const it = w === 'inv' ? h.inv[+k] : h.equip[k];
      if (it) tp = tip(it, it.rar > 0 ? `<button class="btn" data-a="reforge:${w}:${k}">${t('shop.reforge')} · ${fmt(reforgeCost(it))}</button>` : '');
    }
    return `<div class="pn">${head(t('npc.smith') + ' · ' + t('shop.reforge'))}<div class="pn-b"><p class="muted">${t('shop.reforge.d')}</p><div class="inv"><div class="doll">${eq}</div><div><div class="bag">${bag}</div>${tp}</div></div></div></div>`;
  },
  stash() {
    const h = G.hero;
    const st = h.stash.map((it, i) => cell(it, 'st:' + i)).join('');
    const bag = h.inv.map((it, i) => cell(it, 'tostash:' + i)).join('');
    return `<div class="pn">${head(t('stash.title'))}<div class="pn-b"><div class="bag" style="grid-template-columns:repeat(8,1fr)">${st}</div><div class="logo-rule"></div><div class="bag">${bag}</div></div></div>`;
  },
  waypoints() {
    const h = G.hero, inTown = G.zone?.id === 'town';
    // Act IV's Field has a second waypoint, at Elati's camp at the mouth of the Lantern Graves ('ashfield@2')
    const list = ['town', 'forest', 'crypt', 'pass', 'halls', 'weep', 'heart', 'ashfield', 'ashfield@2', 'forge'].filter((z) => h.wps.includes(z)).map((w) => {
      const z = w.split('@')[0], sub = w.endsWith('@2') ? t('wp.graves') : t('zone.' + z + '.s');
      return `<button class="wp ${G.zone?.id === z ? 'here' : ''}" data-a="wp:${w}">${ICON.portal}<b>${t('zone.' + z)}</b><span class="muted">${sub}</span></button>`;
    }).join('');
    const gates = h.quest >= 5 ? `<button class="wp" data-a="gates">${ICON.gate}<b>${t('gate.title')}</b><span class="muted">${t('gate.best', h.gateBest)}</span></button>` : '';
    const diffs = DIFFS.map((d, i) => { const lock = !diffUnlocked(i); return `<button class="chip ${h.diff === i ? 'on' : ''} ${lock ? 'lock' : ''}" data-a="diff:${i}" style="${h.diff === i ? 'color:' + d.color : ''}">${t('diff.' + d.id)}</button>`; }).join('');
    return `<div class="pn narrow">${head(t('wp.title'), false)}<div class="pn-b"><div style="display:grid;gap:6px">${list}${gates}</div><div class="logo-rule"></div><b style="font-family:var(--display);color:var(--gold)">${t('pick.diff')}</b><div class="chips" style="justify-content:flex-start;margin-top:6px">${diffs}</div><p class="muted">${inTown ? t('diff.' + DIFFS[h.diff].id + '.d') : t('wp.diffNote')}</p></div></div>`;
  },
  gates() {
    const h = G.hero, max = h.gateBest + 1;
    const tiers = Array.from({ length: Math.min(max, 60) }, (_, i) => `<button class="chip ${P.tier === i + 1 ? 'on' : ''}" data-a="tier:${i + 1}">${i + 1}</button>`).join('');
    if (!P.tier) P.tier = max;
    return `<div class="pn narrow">${head(t('gate.title'), false)}<div class="pn-b"><p>${t('gate.d')}</p><p class="muted">${t('gate.best', h.gateBest)}</p><div class="gate-tiers">${tiers}</div><button class="btn" data-a="gateGo" style="width:100%">${t('gate.open')} · ${t('gate.tier', P.tier)}</button></div></div>`;
  },
  pause() {
    const inTown = G.zone?.id === 'town';
    return `<div class="pn narrow">${head(t('pause.title'), false)}<div class="pn-b"><div class="menu" style="margin:0 auto">
      <button class="btn" data-a="close">${t('pause.resume')}</button>
      ${inTown ? '' : `<button class="btn ghost" data-a="portal">${t('pause.town')}</button>`}
      <button class="btn ghost" data-a="map">${t('hud.map')}</button>
      <button class="btn ghost" data-a="settings">${t('menu.settings')}</button>
      <button class="btn ghost" data-a="quit">${t('pause.quit')}</button></div></div></div>`;
  },
  settings() {
    const s = G.settings, q = s.quality;
    const chip = (a, on, label) => `<button class="chip ${on ? 'on' : ''}" data-a="${a}">${label}</button>`;
    return `<div class="pn narrow">${head(t('set.title'), false)}<div class="pn-b">
      <div class="set-row"><span>${t('set.music')}</span><input id="set-music" type="range" min="0" max="1" step="0.05" value="${s.music}"></div>
      <div class="set-row"><span>${t('set.sfx')}</span><input id="set-sfx" type="range" min="0" max="1" step="0.05" value="${s.sfx}"></div>
      <div class="set-row"><span>${t('set.quality')}</span><div class="chips" style="justify-content:flex-start">${[0, 1, 2].map((i) => chip('q:' + i, q === i, t('set.q' + i))).join('')}</div></div>
      <div class="set-row"><span>${t('set.lang')}</span><div class="chips" style="justify-content:flex-start">${chip('lang:el', lang() === 'el', 'Ελληνικά')}${chip('lang:en', lang() === 'en', 'English')}</div></div>
      <div class="set-row"><span>${t('set.vibrate')}</span><div class="chips" style="justify-content:flex-start">${chip('vib:1', s.vibrate, t('set.on'))}${chip('vib:0', !s.vibrate, t('set.off'))}</div></div>
      <div class="set-row"><span>${t('set.numbers')}</span><div class="chips" style="justify-content:flex-start">${chip('num:1', s.numbers, t('set.on'))}${chip('num:0', !s.numbers, t('set.off'))}</div></div>
      <p class="muted">${t('set.qnote')}</p><p class="muted">${t('menu.credits')}</p>
      <button class="btn ghost" data-a="credits" style="width:100%">${t('cr.title')}</button></div></div>`;
  },
  credits() {
    const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const sec = CREDITS.map((c) => `<h4 class="cr-h">${t(c.h)}</h4>${c.items.map(([what, by, lic, url]) => `<div class="cr-i"><b>${esc(what)}</b><span>${esc(by)} · ${esc(lic)}</span><a href="${url}" target="_blank" rel="noopener">${esc(url.replace(/^https?:\/\//, ''))}</a></div>`).join('')}${c.note ? `<p class="muted">${t(c.note)}</p>` : ''}`).join('');
    return `<div class="pn">${head(t('cr.title'), false)}<div class="pn-b cr">${sec}
      <h4 class="cr-h">${t('cr.made')}</h4><p class="muted">${t('cr.madeD')}</p>
      <h4 class="cr-h">Microsoft Rocketbox</h4><pre class="cr-lic">${esc(MIT_ROCKETBOX)}</pre></div></div>`;
  },
  dead() {
    return `<div class="pn narrow" style="text-align:center"><div class="pn-b" style="padding:24px"><div class="act-h" style="color:#ff8a70">${t('dead.title')}</div><p>${t('dead.sub')}</p><div class="menu" style="margin:16px auto 0">
      <button class="btn" data-a="respawn">${t('dead.respawn')}</button><button class="btn ghost" data-a="respawnTown">${t('dead.town')}</button></div></div></div>`;
  },
  act() {
    const h = G.hero;
    const mins = Math.round((Date.now() - h.created) / 60000);
    const next = DIFFS[h.diff + 1];
    // act 1 shows what it unlocked; later acts their own title, line and what comes next
    const n = G.flags.actDone || 1, a2 = n > 1, k = n > 1 ? 'act' + n : 'act';
    return `<div class="pn narrow" style="text-align:center"><div class="pn-b" style="padding:22px"><div class="act-h">${t(k + '.done')}</div><p style="font-style:italic;color:var(--ink2)">${t(k + '.sub')}</p><div class="logo-rule"></div>
      <div class="stats" style="text-align:left"><div><span>${t('hud.level', '')}</span><b>${h.level}</b></div><div><span>${t('stat.kills')}</span><b>${fmt(h.stats.kills)}</b></div><div><span>${t('stat.time')}</span><b>${mins}′</b></div><div><span>${t('rar.legendary')}</span><b class="r-3">${h.stats.legs}</b></div></div>
      ${a2 ? '' : `<div class="logo-rule"></div><b style="font-family:var(--display);color:var(--gold)">${t('act.unlocks')}</b><p>${t('act.gates')}</p>${next ? `<p style="color:${next.color}">${t('pick.diff')}: ${t('diff.' + next.id)}</p>` : ''}`}
      <p class="muted">${t(k + '.next')}</p><button class="btn" data-a="close">${t('act.cont')}</button></div></div>`;
  },
  boon() {
    const act = P.ctx?.act || 1, ub = act === 4 && !!G.hero.flags.unbound;
    const cards = BOONS[act].map((b) => `<button class="pcard boon" data-a="boon:${b.id}"><div class="bi">${ICON[b.icon]}</div><h3>${t('boon.' + b.id)}</h3><p>${boonDesc(b.id)}</p><p class="bq">${t('boon.' + b.id + '.q')}</p></button>`).join('');
    // Unbound: Isarn's words, and what they are worth
    const note = ub ? `<p class="unbound">${t('d.isarn.unbound')}</p><p class="unbound-k">${t(G.hero.cls === 'ranger' ? 'boon.unbound.f' : 'boon.unbound')}</p>` : '';
    return `<div class="pn" style="text-align:center"><div class="pn-b" style="padding:20px"><div class="act-h">${t('boon.h' + act)}</div><p style="font-style:italic;color:var(--ink2)">${t('boon.sub')}</p>${note}<div class="logo-rule"></div><div class="boons">${cards}</div></div></div>`;
  },
  // an Altar of the Wish: a shard offers its gift, with the cage that comes with it; or let it sleep
  altar() {
    const id = GIFTS[P.ctx?.id] ? P.ctx.id : 'throne';
    const take = `<button class="pcard boon altar-take" data-a="gift:taken"><div class="bi">${ICON[ALTAR_ICON[id]] || ICON.star}</div><h3>${t('altar.accept')}: ${t('gift.' + id)}</h3><p><b class="r-2">${t('altar.gift')}</b> ${t('gift.' + id + '.d')}</p><p><b class="cage">${t('altar.cage')}</b> ${t('gift.' + id + '.c')}</p></button>`;
    const refuse = `<button class="pcard boon altar-refuse" data-a="gift:refused"><div class="bi">${ICON.close}</div><h3>${t('altar.refuse')}</h3><p class="bq">${t('altar.refuse.d')}</p></button>`;
    return `<div class="pn narrow" style="text-align:center"><div class="pn-b" style="padding:20px"><div class="act-h">${t('altar.title')}</div><p style="font-style:italic;color:var(--ink2)">${t('altar.sub')}</p><div class="logo-rule"></div><div class="boons">${take}${refuse}</div></div></div>`;
  },
  map() { return `<div class="pn" style="height:100%">${head(t('zone.' + G.zone.id), false)}<div class="pn-b" style="display:flex;align-items:center;justify-content:center"><canvas id="bigmap" width="800" height="800" style="max-width:100%;max-height:100%;aspect-ratio:1"></canvas></div></div>`; }
};
export function diffUnlocked(i) {
  const d = DIFFS[i]; if (!d.unlock) return true;
  const need = DIFFS.findIndex((x) => x.id === d.unlock.split(':')[1]);
  return (G.hero?.act1 ?? -1) >= need;
}
function render() {
  if (!P.name) return;
  $('panel').innerHTML = R[P.name]();
  if (P.name === 'map') drawBigMap($('bigmap'));
}

// ---------- actions ----------
function onClick(e) {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const [a, x, y] = b.dataset.a.split(':');
  const h = G.hero;
  Audio.sfx('click', { vol: 0.5 });
  switch (a) {
    case 'close': close(); return;
    case 'inv': case 'eq': P.sel = P.sel === a + ':' + x ? null : a + ':' + x; if (a === 'inv' && h.inv[+x]) h.inv[+x].isNew = false; break;
    case 'equip': if (equip(+x)) { P.sel = null; emit('heroLook'); } break;
    case 'unequip': if (unequip(x)) { P.sel = null; emit('heroLook'); } break;
    case 'sell': { const v = sell(+x); if (v) emit('toast', t('shop.sold', fmt(v))); P.sel = null; break; }
    case 'drop': h.inv[+x] = null; P.sel = null; break;
    case 'selljunk': { const v = sellJunk(); if (v) emit('toast', t('shop.sold', fmt(v))); break; }
    case 'tab': P.tab = +x; P.sel = null; break;
    case 'gamble': { const it = gamble(x); if (it) P.last = it; else if (h.gold < gambleCost(h.level)) emit('toast', t('shop.noGold')); break; }
    case 'reforge': { const it = reforge(x, x === 'inv' ? +y : y); if (!it && h.gold < 1e9) emit('toast', t('shop.noGold')); if (x === 'eq') emit('heroLook'); break; }
    case 'st': fromStash(+x); break;
    case 'tostash': toStash(+x); break;
    case 'rank': { h.skills[x] = Math.max(1, (h.skills[x] || 1)) + 1; h.points--; refreshStats(); Audio.sfx('equip'); break; }
    // (in a zone with two waypoints, either one can be the way across it)
    case 'wp': { close(); const [zid, n] = x.split('@'); if (zid !== G.zone.id || n || G.zone.L.spots.camp2) emit('travel', zid, { at: n ? 'waypoint' + n : 'waypoint' }); return; }
    case 'gates': open('gates'); return;
    case 'tier': P.tier = +x; break;
    case 'gateGo': close(); emit('startGate', P.tier); return;
    case 'diff': {
      const i = +x;
      if (G.zone.id !== 'town') { emit('toast', t('wp.diffNote')); break; }
      if (!diffUnlocked(i)) { emit('toast', t('pick.locked', t('diff.' + DIFFS[DIFFS.findIndex((d) => d.id === DIFFS[i].unlock.split(':')[1])].id))); break; }
      if (h.diff !== i) { h.diff = i; emit('diffChanged'); }
      break;
    }
    case 'portal': close(); emit('townPortal'); return;
    case 'map': open('map'); return;
    case 'settings': open('settings'); return;
    case 'credits': open('credits'); return;
    case 'quit': close(); emit('quit'); return;
    case 'q': G.settings.quality = +x; emit('settings'); break;
    case 'lang': setLang(x); G.settings.lang = x; emit('settings'); break;
    case 'vib': G.settings.vibrate = x === '1'; break;
    case 'num': G.settings.numbers = x === '1'; break;
    case 'boon': { const act = P.ctx?.act || 1; h.boons ||= []; h.boons[act - 1] = x; refreshStats(); writeSave(); close(); emit('boonTaken', x); return; }
    case 'gift': { const id = P.ctx?.id; close(); if (id) emit('altarChoice', id, x); return; }
    case 'respawn': close(); emit('respawn', false); return;
    case 'respawnTown': close(); emit('respawn', true); return;
  }
  render();
}
function onInput(e) {
  if (e.target.id === 'set-music') { G.settings.music = +e.target.value; emit('settings'); }
  if (e.target.id === 'set-sfx') { G.settings.sfx = +e.target.value; emit('settings'); }
}
on('equipChanged', () => { if (P.name) render(); });
on('gold', () => { if (P.name === 'inventory' || P.name === 'vendor') { const g = document.querySelector('.pn-h .gold'); if (g) g.innerHTML = ICON.coin + fmt(G.hero.gold); } });
on('itemPicked', () => { if (P.name === 'inventory') render(); });
export { render as renderPanel };
