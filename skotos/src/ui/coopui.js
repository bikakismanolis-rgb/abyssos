// Co-op on screen: the lobby panel (host, join by code or from the list, who is in, start, leave), the party's frames
// under the hero's bars, names over the other heroes, the downed card and the revive ring.
import * as THREE from 'three';
import { G } from '../game/state.js';
import { NET } from '../net/state.js';
import { S, hostGame, joinGame, leaveGame, startGame, party, nameOf, respawnNow } from '../net/coop.js';
import { EXTRA, open as openPanel, renderPanel } from './panels.js';
import { DIFFS } from '../game/data.js';
import { R } from '../gfx/gfx.js';
import { ICON } from './icons.js';
import { on, emit } from './bus.js';
import { t } from '../i18n/i18n.js';
import Audio from '../audio/audio.js';

const $ = (id) => document.getElementById(id);
const esc = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const clsIcon = (c) => ICON[c === 'ranger' ? 'bolt' : c === 'mage' ? 'flame' : 'shield'];
const UI = { code: '', built: false, plates: new Map(), v: new THREE.Vector3() };

export function initCoopUi() {
  EXTRA.coop = { avail: () => S.avail, render, click };
  document.addEventListener('input', (e) => { if (e.target?.id === 'coop-code') { e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4); UI.code = e.target.value; } });
  document.addEventListener('keydown', (e) => { if (e.target?.id === 'coop-code' && e.key === 'Enter') { e.preventDefault(); doJoin(UI.code); } });
  on('netLobby', () => { if (G.panel === 'coop' && document.activeElement?.id !== 'coop-code') renderPanel(); });
  on('netReady', (ok) => { if (ok) build(); });
  on('netDowned', (d) => downed(d));
  on('netRevive', (k) => reviveRing(k));
  // (the title's Co-op: the hero taken up, then the lobby)
  on('zoneEnter', () => { if (G.flags.coopOpen) { G.flags.coopOpen = false; setTimeout(() => { if (G.mode === 'play' && !G.panel) openPanel('coop'); }, 900); } });
  requestAnimationFrame(frame);
}
function build() {
  if (UI.built || !$('hud')) return;
  UI.built = true;
  const hud = $('hud');
  const party = document.createElement('div'); party.id = 'party'; party.hidden = true; hud.appendChild(party);
  const plates = document.createElement('div'); plates.id = 'plates'; hud.appendChild(plates);
  const dn = document.createElement('div'); dn.id = 'downed'; dn.hidden = true;
  dn.innerHTML = `<div class="h">${t('coop.downed')}</div><div class="s"></div><button class="btn ghost" id="dn-go">${t('coop.respawn')}</button>`;
  document.getElementById('app').appendChild(dn);
  $('dn-go').onclick = () => { Audio.sfx('click'); respawnNow(); };
  const rv = document.createElement('div'); rv.id = 'revive'; rv.hidden = true;
  rv.innerHTML = '<svg viewBox="0 0 48 48"><circle class="bg" cx="24" cy="24" r="20"/><circle class="fg" cx="24" cy="24" r="20"/></svg><b></b>';
  hud.appendChild(rv);
  // a party button beside the bag, the skills and the menu
  const btns = $('hud-btns');
  if (btns) { const b = document.createElement('button'); b.className = 'hbtn'; b.id = 'h-coop'; b.setAttribute('aria-label', 'co-op'); b.innerHTML = PARTY_ICON; b.onclick = () => { Audio.sfx('open'); openPanel('coop'); }; btns.insertBefore(b, btns.firstChild); }
}
const PARTY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M3 19c.6-3.4 2.8-5.2 5.5-5.2s4.9 1.8 5.5 5.2M14.4 14.2c.7-.3 1.4-.4 2.1-.4 2.3 0 4.1 1.5 4.6 4.6"/></svg>';

// ---------- the lobby panel ----------
function render() {
  const head = `<div class="pn-h"><h2>${t('coop.title')}</h2><button class="x" data-a="close">${ICON.close}</button></div>`;
  let body = '';
  if (!S.ready) body = `<p class="muted">${t('coop.looking')}</p>`;
  else if (!S.avail) body = `<p>${t('coop.none')}</p><p class="muted">${t('coop.noneHow')}</p>`;
  else if (!S.role) {
    const hosts = S.hosts.filter((h) => h.v === 1).map((h) => `<button class="slot coop-h" data-a="cjoin:${esc(h.c)}"><span>${clsIcon(h.cls)}</span><span class="nm">${esc(S.names[h.by] || t('class.' + (h.cls || 'warden')) + ' ' + (h.l | 0))}</span><span class="mt">${esc(t('zone.' + (h.z || 'town')))} · ${Math.min(4, h.n | 0)}/4 · ${esc(t('diff.' + (DIFFS[h.d | 0]?.id || 'warden')))}${h.on ? '' : ' · ' + t('coop.lobbyWait')}</span></button>`).join('');
    body = `<p>${t('coop.intro')}</p>
      <button class="btn" data-a="chost" style="width:100%">${t('coop.host')}</button>
      <div class="coop-join"><input id="coop-code" maxlength="4" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('coop.codePh')}" value="${esc(UI.code)}"><button class="btn ghost" data-a="cjoin">${t('coop.join')}</button></div>
      <h4>${t('coop.hosts')}</h4>${hosts || `<p class="muted">${t('coop.noHosts')}</p>`}
      ${S.status === 'error' ? `<p class="bad">${t('coop.error')}</p>` : S.status === 'connecting' ? `<p class="muted">${t('coop.connecting')}</p>` : ''}`;
  } else {
    const me = G.hero.__real || G.hero;
    const rows = [{ name: t('coop.you'), cls: me.cls, lvl: me.level, host: S.role === 'host', me: true }, ...party()].map((p) => `<div class="coop-p${p.me ? ' me' : ''}"><span>${clsIcon(p.cls)}</span><span class="nm">${esc(p.name)}</span><span class="mt">${t('hud.level', p.lvl)}${p.host ? ' · ' + t('coop.hostTag') : ''}${p.dead ? ' · ' + t('coop.downedTag') : ''}</span></div>`).join('');
    const net = S.ch?.meter?.rate?.();
    const meter = net ? `<p class="muted coop-meter">${t('coop.meter', net.msgsOut.toFixed(1), (net.bytesOut / 1024).toFixed(1), net.msgsIn.toFixed(1), (net.bytesIn / 1024).toFixed(1))}</p>` : '';
    if (S.role === 'host') body = `<p>${t('coop.yourCode')}</p><div class="coop-code">${esc(S.code.toUpperCase())}</div><p class="muted">${t('coop.share')}</p>
      <h4>${t('coop.who', 1 + S.roster.length)}</h4>${rows}
      ${S.started ? `<p class="muted">${t('coop.live')}</p>` : `<button class="btn" data-a="cstart" style="width:100%">${t('coop.start')}</button>`}
      <button class="btn ghost" data-a="cleave" style="width:100%">${t('coop.end')}</button>${meter}`;
    else body = `<div class="coop-code small">${esc(S.code.toUpperCase())}</div>
      <p class="muted">${S.zoneKey ? t('coop.inGame') : S.hostPeer ? t('coop.waitStart') : t('coop.waitHost')}</p>
      <h4>${t('coop.who', 1 + party().length)}</h4>${rows}<p class="muted">${t('coop.guestNote')}</p>
      <button class="btn ghost" data-a="cleave" style="width:100%">${t('coop.leave')}</button>${meter}`;
  }
  return `<div class="pn narrow coop">${head}<div class="pn-b">${body}</div></div>`;
}
function doJoin(code) {
  code = String(code || '').toLowerCase();
  if (!/^[a-z0-9]{4}$/.test(code)) { emit('toast', t('coop.badCode')); return; }
  joinGame(code).then((ok) => { if (!ok) emit('toast', t('coop.error')); renderPanel(); });
}
function click(a, x) {
  if (a === 'chost') { hostGame().then(() => renderPanel()); return true; }
  if (a === 'cjoin') { doJoin(x || UI.code || $('coop-code')?.value); return true; }
  if (a === 'cstart') { startGame(); renderPanel(); return true; }
  if (a === 'cleave') { leaveGame(S.role === 'host' ? null : 'coop.youLeft'); renderPanel(); return true; }
  return false;
}

// ---------- the HUD: frames, names, the downed card, the revive ring ----------
let partyKey = '';
function frame() {
  requestAnimationFrame(frame);
  if (!UI.built) return;
  const on = !!NET.mode && G.mode !== 'title', P = on ? party() : [];
  const pe = $('party');
  pe.hidden = !on;
  if (on) {
    const key = P.map((p) => p.peer + p.name + p.cls + p.lvl + p.here).join('|') + S.code + S.role;
    if (key !== partyKey) {
      partyKey = key;
      pe.innerHTML = `<div class="ph">${t('coop.badge')} · ${esc((S.code || '').toUpperCase())} · ${1 + P.filter((p) => p.here).length}/4</div>` + P.map((p) => `<div class="pm${p.here ? '' : ' away'}" data-p="${esc(p.peer)}"><span class="ic">${clsIcon(p.cls)}</span><span class="nm">${esc(p.name)}</span><span class="lv">${p.lvl}</span><div class="b"><i></i></div></div>`).join('');
    }
    for (const p of P) {
      const el = pe.querySelector(`[data-p="${CSS.escape(p.peer)}"]`); if (!el) continue;
      el.querySelector('i').style.transform = `scaleX(${Math.max(0, Math.min(1, p.hp / Math.max(1, p.hpMax)))})`;
      el.classList.toggle('dead', p.dead);
    }
  }
  // names over the other heroes in this zone
  const pl = $('plates'), seen = new Set();
  if (on && R.camera) for (const p of P) {
    const a = p.actor; if (!a || a.removed || !a.avatar?.group.visible) continue;
    seen.add(p.peer);
    let el = UI.plates.get(p.peer);
    if (!el) { el = document.createElement('div'); el.className = 'plate'; pl.appendChild(el); UI.plates.set(p.peer, el); }
    const txt = p.name + (p.dead ? ' · ' + t('coop.downedTag') : '');
    if (el.textContent !== txt) el.textContent = txt;
    el.classList.toggle('dead', p.dead);
    UI.v.set(a.x, (a.y || 0) + 2.35, a.z).project(R.camera);
    const vis = UI.v.z < 1 && Math.abs(UI.v.x) < 1.1 && Math.abs(UI.v.y) < 1.1;
    el.style.display = vis ? '' : 'none';
    if (vis) el.style.transform = `translate(${((UI.v.x + 1) / 2 * innerWidth).toFixed(0)}px, ${((1 - UI.v.y) / 2 * innerHeight).toFixed(0)}px) translate(-50%, -100%)`;
  }
  for (const [k, el] of UI.plates) if (!seen.has(k)) { el.remove(); UI.plates.delete(k); }
  // the downed card's count
  const dn = $('downed');
  if (!dn.hidden && S.downed) dn.querySelector('.s').textContent = t('coop.downedSub', Math.ceil(S.downed.t));
}
function downed(d) { if (!UI.built) build(); const dn = $('downed'); if (dn) dn.hidden = !d; }
function reviveRing(k) {
  const rv = $('revive'); if (!rv) return;
  rv.hidden = !(k > 0);
  if (k > 0) { rv.querySelector('.fg').style.strokeDashoffset = String(125.7 * (1 - Math.min(1, k))); rv.querySelector('b').textContent = t('coop.revive'); }
}
export { nameOf };
