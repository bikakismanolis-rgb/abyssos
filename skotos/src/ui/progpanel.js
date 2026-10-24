// The skills panel: the skills (ranks, variants, which four are on the buttons) and the Mastery. panels.js calls render
// and click; the rules live in game/progression.js.
import { G } from '../game/state.js';
import { CLASSES, SKILLS, SKILL_MAX_RANK, VARIANTS, VARIANT_RANK, DODGE, MAX_LEVEL, mxpToNext } from '../game/data.js';
import { refreshStats } from '../game/stats.js';
import { MASTERY, MASTERY_BY, masteryValue, fmtMastery, rankOf, canRank, rankUp, canUnlock, unlockVariant, setVariant, hasVariant, setSlot, masterUp, respec, respecCost, pointsEarned } from '../game/progression.js';
import { emit } from './bus.js';
import { ICON } from './icons.js';
import { t } from '../i18n/i18n.js';
import { fmt, fmtK } from '../core/util.js';
import Audio from '../audio/audio.js';

const inTown = () => G.zone?.id === 'town';
const resName = () => t('res.' + CLASSES[G.hero.cls].res);
const pips = (r, max = SKILL_MAX_RANK) => `<span class="pp">${Array.from({ length: max }, (_, j) => `<i class="${j < r ? 'on' : ''}"></i>`).join('')}</span>`;

export function renderSkills(P, head) {
  const h = G.hero;
  const tabs = `<div class="tabs pg-tabs"><button class="tab ${P.tab ? '' : 'on'}" data-a="ptab:0">${ICON.book}${t('prog.tab.skills')}</button><button class="tab ${P.tab ? 'on' : ''}" data-a="ptab:1">${ICON.mastery}${t('prog.tab.mastery')}${h.level >= MAX_LEVEL ? ` <b class="ml">${h.mlvl || 0}</b>` : ''}</button></div>`;
  const pts = `<div class="pg-pts ${h.points > 0 ? 'has' : ''}">${ICON.star}<b>${t('prog.points', h.points)}</b></div>`;
  const top = `<div class="pn-h pg-h">${tabs}${pts}<button class="x" data-a="close" aria-label="${t('panel.close')}">${ICON.close}</button></div>`;
  void head;
  return `<div class="pn pg">${top}<div class="pn-b pg-b">${P.tab ? mastery(P) : skills(P)}</div></div>`;
}

// ---------- skills ----------
function skills(P) {
  const h = G.hero, list = SKILLS[h.cls];
  if (!P.sel || !list.some((s) => s.id === P.sel)) P.sel = h.loadout[0] || list[1].id;
  // a later skill looked at is no longer new (before its tile is drawn)
  { const ss = list.find((s) => s.id === P.sel); if (!ss.basic && h.level >= ss.lvl && ss.lvl >= 20) h.flags['seen_' + ss.id] = true; }
  const slots = h.loadout.map((id, i) => {
    const sk = list.find((s) => s.id === id);
    return `<button class="pg-slot ${P.sel === id ? 'sel' : ''}" data-a="${sk ? 'psel:' + id : 'pslot:' + (i + 1)}"><span class="n">${i + 1}</span>${sk ? ICON[sk.icon] : ''}</button>`;
  }).join('');
  const tiles = list.map((sk) => {
    const r = rankOf(h, sk.id), lock = !sk.basic && h.level < sk.lvl, slot = h.loadout.indexOf(sk.id) + 1, v = h.variant?.[sk.id] || 0;
    const fresh = !sk.basic && !lock && sk.lvl >= 20 && !slot && !h.flags?.['seen_' + sk.id];
    const up = !sk.basic && !lock && (canRank(h, sk.id) || [1, 2].some((k) => canUnlock(h, sk.id, k)));
    return `<button class="pg-tile ${P.sel === sk.id ? 'sel' : ''} ${lock ? 'lock' : ''}" data-a="psel:${sk.id}">
      <span class="ic">${ICON[sk.icon]}${slot ? `<i class="sl">${slot}</i>` : ''}${v ? '<i class="vm"></i>' : ''}${up ? '<i class="up">+</i>' : ''}</span>
      <span class="nm">${t('sk.' + sk.id)}</span>${sk.basic ? `<span class="tg">${t('prog.basic')}</span>` : lock ? `<span class="tg lk">${t('prog.lvl', sk.lvl)}</span>` : fresh ? `<span class="tg nw">${t('prog.new')}</span>` : pips(r)}</button>`;
  }).join('');
  const D = DODGE[h.cls];
  const left = `<div class="pg-l"><div class="pg-cap">${t('prog.loadout')}</div><div class="pg-slots">${slots}</div><div class="pg-grid">${tiles}</div><div class="pg-foot muted">${t('sk.' + D.kind)} · ${t('sk.cd', D.cd)} · ${t('sk.help')}</div></div>`;
  return `<div class="pg-sk">${left}<div class="pg-r">${detail(P)}</div></div>`;
}
function detail(P) {
  const h = G.hero, sk = SKILLS[h.cls].find((s) => s.id === P.sel), lock = !sk.basic && h.level < sk.lvl;
  const r = rankOf(h, sk.id), slot = h.loadout.indexOf(sk.id) + 1;
  const dmgAt = (rr) => Math.round(sk.dmg * (1 + 0.15 * Math.max(0, rr - 1)) * 100);
  const meta = [sk.dmg ? t('sk.dmg', dmgAt(Math.max(1, r))) + (!sk.basic && r > 0 && r < SKILL_MAX_RANK ? ` <span class="nx">→ ${dmgAt(r + 1)}%</span>` : '') : '', sk.cost ? t('sk.cost', sk.cost, resName()) : '', sk.cd ? t('sk.cd', sk.cd) : ''].filter(Boolean).join(' · ');
  const rankBtn = sk.basic || lock ? '' : r >= SKILL_MAX_RANK ? `<span class="pg-max">${t('prog.max')}</span>` : `<button class="btn pg-up" data-a="prank:${sk.id}" ${canRank(h, sk.id) ? '' : 'disabled'}>${t('sk.up')} <small>· 1</small></button>`;
  const headRow = `<div class="pg-dh"><div class="ic">${ICON[sk.icon]}</div><div class="tx"><h3>${t('sk.' + sk.id)}</h3><div class="sub">${sk.basic ? t('prog.basic') : lock ? t('sk.unlock', sk.lvl) : t('sk.rank', r, SKILL_MAX_RANK) + ' ' + pips(r)}</div></div>${rankBtn}</div>`;
  const desc = `<p class="pg-d">${t('sk.' + sk.id + '.d')}</p><div class="meta">${meta}</div>`;
  // which button it is on; tap one to put it there
  const put = sk.basic || lock ? '' : `<div class="pg-put"><span>${slot ? t('prog.onSlot', slot) : t('prog.put')}</span>${[1, 2, 3, 4].map((i) => { const o = SKILLS[h.cls].find((s) => s.id === h.loadout[i - 1]); return `<button class="chip ${slot === i ? 'on' : ''}" data-a="pslot:${i}"><b>${i}</b>${o && o.id !== sk.id ? `<span class="was">${ICON[o.icon]}</span>` : ''}</button>`; }).join('')}${!slot && sk.cd && !inTown() ? `<span class="muted pg-swcd">${t('prog.swapCd')}</span>` : ''}</div>`;
  return headRow + desc + put + variants(sk, r, lock);
}
function variants(sk, r, lock) {
  const h = G.hero, V = VARIANTS[sk.id]; if (!V || lock) return '';
  const cur = h.variant?.[sk.id] || 0, town = inTown();
  const card = (v) => {
    const id = v ? V[v - 1] : null, own = !v || hasVariant(h, sk.id, v), on = cur === v;
    const name = v ? t('var.' + sk.id + '.' + id) : t('prog.base'), d = v ? t('var.' + sk.id + '.' + id + '.d') : t('sk.' + sk.id + '.d');
    let btn;
    if (on) btn = `<span class="st on">${t('prog.chosen')}</span>`;
    else if (!own) btn = r >= VARIANT_RANK ? `<button class="btn sm" data-a="pvar:${sk.id}:${v}" ${h.points > 0 ? '' : 'disabled'}>${t('prog.unlock')}</button>` : `<span class="st">${t('prog.varLock', VARIANT_RANK)}</span>`;
    else btn = `<button class="btn ghost sm" data-a="pvar:${sk.id}:${v}" ${town ? '' : 'disabled'}>${t('prog.choose')}</button>`;
    return `<div class="pg-v ${on ? 'on' : ''} ${own ? '' : 'lock'} v${v}"><div class="vh">${v ? ICON.variant : ICON[sk.icon]}<b>${name}</b></div><p>${d}</p>${btn}</div>`;
  };
  const note = !town && (hasVariant(h, sk.id, 1) || hasVariant(h, sk.id, 2)) ? `<span class="muted">${t('prog.townOnly')}</span>` : '';
  return `<div class="pg-vs"><div class="pg-cap">${t('prog.variants')} ${note}</div><div class="pg-vrow">${card(0)}${card(1)}${card(2)}</div></div>`;
}

// ---------- Mastery ----------
function mastery(P) {
  const h = G.hero, mast = h.level >= MAX_LEVEL, need = mxpToNext(h.mlvl || 0);
  const bar = mast ? `<div class="pg-mbar"><i style="transform:scaleX(${((h.mxp || 0) / need).toFixed(3)})"></i></div><span class="muted">${t('mast.xp', fmtK(h.mxp || 0), fmtK(need), (h.mlvl || 0) + 1)}</span>`
    : `<div class="pg-mbar off"><i style="transform:scaleX(${(h.level / MAX_LEVEL).toFixed(3)})"></i></div><span class="muted">${t('mast.before')}</span>`;
  const cost = respecCost(h), spent = pointsEarned(h) - h.points;
  // (why it is greyed out, in words: a title is never seen on a phone)
  const why = spent <= 0 ? '' : !inTown() ? t('prog.respecTown') : h.gold < cost ? t('prog.respecGold', fmt(h.gold)) : '';
  const rs = `<div class="pg-rsw"><button class="btn ${P.sure ? 'red' : 'ghost'} sm pg-rs" data-a="respec" ${inTown() && spent > 0 && h.gold >= cost ? '' : 'disabled'} title="${t('prog.respec.d', fmt(cost))}">${ICON.reset}${P.sure ? t('prog.respecSure') : t('prog.respec')} <small>${ICON.coin}${fmtK(cost)}</small></button>${why ? `<span class="why">${why}</span>` : ''}</div>`;
  const crest = `<div class="pg-crest">${ICON.mastery}<b>${mast ? h.mlvl || 0 : '·'}</b></div>`;
  const top = `<div class="pg-mt">${crest}<div class="pg-mx"><h3>${mast ? t('mast.rank', h.mlvl || 0) : t('mast.title')}</h3>${bar}</div>${rs}</div><p class="pg-intro">${t('mast.intro')}</p>`;
  const tiles = MASTERY.map((m) => {
    const r = h.mast?.[m.id] || 0, v = masteryValue(m, r, h.level), nx = masteryValue(m, r + 1, h.level) - v;
    const lab = m.id === 'well' ? (h.cls === 'warden' ? t('mast.well.f') : t('mast.well.d', resName())) : t('mast.' + m.id + '.d');
    const fill = Math.min(1, v / (m.per === 'lvl' ? m.max * h.level : m.max));
    return `<div class="pg-m ${r ? 'has' : ''} ${P.msel === m.id ? 'sel' : ''}" data-a="msel:${m.id}" style="--f:${(fill * 100).toFixed(1)}%">
      <div class="mh"><span class="ic">${ICON[m.icon] || ICON.star}</span><b>${t('mast.' + m.id)}</b><span class="rk">${r}</span></div>
      <div class="mv">${fmtMastery(m, v)}</div><div class="ml">${lab}</div>
      <div class="mf"><i></i></div>
      <div class="mn"><span class="muted">${fmtMastery(m, nx)}</span><button class="btn sm" data-a="mup:${m.id}:1" ${h.points > 0 ? '' : 'disabled'}>+1</button><button class="btn ghost sm" data-a="mup:${m.id}:5" ${h.points >= 5 ? '' : 'disabled'}>+5</button></div></div>`;
  }).join('');
  return `${top}<div class="pg-mg">${tiles}</div>`;
}

// ---------- actions (panels.js onClick); true when handled ----------
export function skillsClick(a, x, y, P) {
  const h = G.hero;
  switch (a) {
    case 'ptab': P.tab = +x; P.sure = false; return true;
    case 'psel': P.sel = x; return true;
    case 'prank': if (rankUp(h, x)) { refreshStats(); Audio.sfx('equip'); glow(); } else Audio.sfx('denied'); return true;
    case 'pslot': {
      const sk = SKILLS[h.cls].find((s) => s.id === P.sel), was = h.loadout.includes(sk?.id);
      if (sk && !sk.basic && h.level >= sk.lvl && setSlot(h, +x, sk.id)) {
        // out of town a skill brought onto the buttons comes in on its whole cooldown: the panel pauses the game, and
        // the four buttons stay the choice in a fight (one moved between two buttons keeps its own)
        const pl = G.player, ci = SKILLS[h.cls].indexOf(sk);
        if (!was && !inTown() && sk.cd && pl) pl.cds[ci] = Math.max(pl.cds[ci] || 0, sk.cd * (1 - G.stats.cdr / 100));
        Audio.sfx('equip'); emit('loadout');
      } else Audio.sfx('denied');
      return true;
    }
    case 'pvar': {
      const v = +y, own = !v || hasVariant(h, x, v);
      if (!own) { if (unlockVariant(h, x, v)) { Audio.sfx('equip'); Audio.sting?.('legendary'); emit('loadout'); } else Audio.sfx('denied'); return true; }
      if (!inTown()) { emit('toast', t('prog.townOnly')); Audio.sfx('denied'); return true; }
      if (setVariant(h, x, v)) { Audio.sfx('equip'); emit('loadout'); }
      return true;
    }
    case 'msel': P.msel = P.msel === x ? null : x; return true;
    case 'mup': { const n = masterUp(h, x, +y || 1); if (n) { refreshStats(); Audio.sfx('equip'); P.msel = x; } else Audio.sfx('denied'); return true; }
    case 'respec': {
      if (!P.sure) { P.sure = true; return true; }
      P.sure = false;
      if (respec(h)) { refreshStats(); emit('loadout'); emit('gold'); emit('toast', t('prog.respecDone', h.points)); Audio.sfx('gold'); } else { emit('toast', t('shop.noGold')); Audio.sfx('denied'); }
      return true;
    }
  }
  return false;
}
function glow() { const pl = G.player; if (pl) import('../gfx/fx.js').then((f) => f.glowBurst(pl.x, 1.4, pl.z, 0xffd070, 14, 2, 0.25, 0.5)); }
export { MASTERY_BY };
