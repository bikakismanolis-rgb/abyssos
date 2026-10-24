// Co-op on screen: the lobby panel (host, join by code or from the list, who is in, start, leave), the party's frames
// under the hero's bars, names over the other heroes, the downed card and the revive ring.
import * as THREE from 'three';
import { G } from '../game/state.js';
import { NET } from '../net/state.js';
import { S, VER, hostGame, joinGame, leaveGame, startGame, party, nameOf, respawnNow, stale, canPlay } from '../net/coop.js';
import { TERMINAL } from '../net/transport.js';
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
const UI = { code: '', built: false, plates: new Map(), v: new THREE.Vector3(), shown: '', meterT: 0 };

export function initCoopUi() {
  EXTRA.coop = { avail: () => S.avail, render, click };
  document.addEventListener('input', (e) => { if (e.target?.id === 'coop-code') { e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4); UI.code = e.target.value; } });
  document.addEventListener('keydown', (e) => { if (e.target?.id === 'coop-code' && e.key === 'Enter') { e.preventDefault(); doJoin(UI.code); } });
  // (what changed while the code was being typed is shown when the field is left)
  document.addEventListener('focusout', (e) => { if (e.target?.id === 'coop-code') setTimeout(lobbyRender, 0); });
  on('netLobby', () => { hudBtn(); lobbyRender(); });
  on('netMode', hudBtn);
  on('netReady', (ok) => { if (ok) build(); });
  on('netDowned', (d) => downed(d));
  on('netRevive', (k, who) => reviveRing(k, who));
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
// (the open lobby panel drawn again as the room changes: at most four times a second, the last change always shown, and
// only when what it shows has changed: the meter is set in place, so the body keeps its scroll and a touch on it its
// button between presences)
let lobbyT = 0, lobbyTimer = 0;
function lobbyRender() {
  if (G.panel !== 'coop' || lobbyTimer) return;
  const wait = 250 - (performance.now() - lobbyT);
  if (wait > 0) { lobbyTimer = setTimeout(() => { lobbyTimer = 0; lobbyRender(); }, wait); return; }
  if (document.activeElement?.id === 'coop-code') return;
  lobbyT = performance.now();
  if (html()[0] === UI.shown) return;
  const top = document.querySelector('#panel .pn-b')?.scrollTop || 0;
  renderPanel();
  const b = document.querySelector('#panel .pn-b'); if (b && top) b.scrollTop = top;
}
const PARTY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M3 19c.6-3.4 2.8-5.2 5.5-5.2s4.9 1.8 5.5 5.2M14.4 14.2c.7-.3 1.4-.4 2.1-.4 2.3 0 4.1 1.5 4.6 4.6"/></svg>';

// ---------- the lobby panel ----------
// why this view cannot host or join (the room's answer), else why the last try failed
// (the room's end for the page, whatever its code, only as co-op no longer here: who may play is the app's to say)
const WHY = { not_permitted: 'coop.noSend', full: 'coop.full' };
const why = (code) => WHY[code] || (TERMINAL.has(code) ? 'coop.off' : 'coop.error');
const meterText = () => { const net = S.ch?.meter?.rate?.(); return net ? t('coop.meter', net.msgsOut.toFixed(1), (net.bytesOut / 1024).toFixed(1), net.msgsIn.toFixed(1), (net.bytesIn / 1024).toFixed(1)) : ''; };
function render() { const [k, h] = html(); UI.shown = k; return h; }
// [what it shows but the meter, the panel]
function html() {
  const head = `<div class="pn-h"><h2>${t('coop.title')}</h2><button class="x" data-a="close">${ICON.close}</button></div>`;
  let body = '', meter = '';
  if (!S.ready) body = `<p class="muted">${t('coop.looking')}</p>`;
  // (a room that ended for this page: the single-player page, nothing said of access)
  else if (!S.avail) body = `<p>${t('coop.none')}</p>${S.dead ? '' : `<p class="muted">${t('coop.noneHow')}</p>`}`;
  // (a view the room lets in without sending: it plays alone, and is told why)
  else if (!S.role && !canPlay()) body = `<p>${t('coop.noSend')}</p><p class="muted">${t('coop.noneHow')}</p>`;
  else if (!S.role) {
    // (while a try is on its way nothing else can be tapped; a game its listing shows full cannot be)
    const busy = S.status === 'connecting' ? ' disabled' : '';
    // (each button names the peer of the listing it shows: a tap joins that peer, however the list has changed since)
    const hosts = S.hosts.filter((h) => h.v === VER).map((h) => `<button class="slot coop-h" data-a="cjoin:${esc(h.c)}:${esc(encodeURIComponent(h.peer))}"${busy || (h.n >= 4 ? ' disabled' : '')}><span>${clsIcon(h.cls)}</span><span class="nm">${esc(S.names[h.by] || t('class.' + (h.cls || 'warden')) + ' ' + (h.l | 0))}</span><span class="mt">${esc(t('zone.' + (h.z || 'town')))} · ${Math.min(4, h.n | 0)}/4 · ${esc(t('diff.' + (DIFFS[h.d | 0]?.id || 'warden')))}${h.on ? '' : ' · ' + t('coop.lobbyWait')}</span></button>`).join('');
    body = `<p>${t('coop.intro')}</p>
      <button class="btn" data-a="chost" style="width:100%"${busy}>${t('coop.host')}</button>
      <div class="coop-join"><input id="coop-code" maxlength="4" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${t('coop.codePh')}" value="${esc(UI.code)}"><button class="btn ghost" data-a="cjoin"${busy}>${t('coop.join')}</button></div>
      <h4>${t('coop.hosts')}</h4>${hosts || `<p class="muted">${t('coop.noHosts')}</p>`}
      ${S.status === 'error' ? `<p class="bad">${t(why(S.err))}</p>` : S.status === 'connecting' ? `<p class="muted">${t('coop.connecting')}</p>` : ''}`;
  } else {
    const me = G.hero.__real || G.hero;
    const rows = [{ name: t('coop.you'), cls: me.cls, lvl: me.level, host: S.role === 'host', me: true }, ...party()].map((p) => `<div class="coop-p${p.me ? ' me' : ''}"><span>${clsIcon(p.cls)}</span><span class="nm">${esc(p.name)}</span><span class="mt">${t('hud.level', p.lvl)}${p.host ? ' · ' + t('coop.hostTag') : ''}${p.dead ? ' · ' + t('coop.downedTag') : ''}</span></div>`).join('');
    meter = meterText();
    if (S.role === 'host') body = `<p>${t('coop.yourCode')}</p><div class="coop-code">${esc(S.code.toUpperCase())}</div><p class="muted">${t('coop.share')}</p>
      <h4>${t('coop.who', 1 + S.roster.length)}</h4>${rows}
      ${S.started ? `<p class="muted">${t('coop.live')}</p>` : `<button class="btn" data-a="cstart" style="width:100%">${t('coop.start')}</button>`}
      <button class="btn ghost" data-a="cleave" style="width:100%">${t('coop.end')}</button><p class="muted coop-meter"><!--m--></p>`;
    else body = `<div class="coop-code small">${esc(S.code.toUpperCase())}</div>
      <p class="muted">${S.zoneKey ? t('coop.inGame') : S.hostPeer ? t('coop.waitStart') : t('coop.waitHost')}</p>
      <h4>${t('coop.who', 1 + party().length)}</h4>${rows}<p class="muted">${t('coop.guestNote')}</p>
      <button class="btn ghost" data-a="cleave" style="width:100%">${t('coop.leave')}</button><p class="muted coop-meter"><!--m--></p>`;
  }
  const key = `<div class="pn narrow coop">${head}<div class="pn-b">${body}</div></div>`;
  return [key, key.replace('<!--m-->', esc(meter))];
}
// (peer: the host picked from the list, the one this game's host must be. null: nothing was done, a try on its way)
function doJoin(code, peer) {
  code = String(code || '').toLowerCase();
  if (!/^[a-z0-9]{4}$/.test(code)) { emit('toast', t('coop.badCode')); return; }
  joinGame(code, peer).then((ok) => { if (ok === false) emit('toast', t(why(S.err))); renderPanel(); });
  renderPanel();
}
function click(a, x, y) {
  if (a === 'chost') { hostGame().then((ok) => { if (ok === false) emit('toast', t(why(S.err))); renderPanel(); }); renderPanel(); return true; }
  if (a === 'cjoin') { let pr = null; try { pr = x && y ? decodeURIComponent(y) : null; } catch (e) { /* not a peer */ } doJoin(x || UI.code || $('coop-code')?.value, pr); return true; }
  if (a === 'cstart') { startGame(); renderPanel(); return true; }
  if (a === 'cleave') { leaveGame(S.role === 'host' ? null : 'coop.youLeft'); renderPanel(); return true; }
  return false;
}

// ---------- the HUD: frames, names, the downed card, the revive ring ----------
// (a plate's height and the gap between two stacked)
const PLATE_H = 19;
let partyKey = '';
function frame() {
  requestAnimationFrame(frame);
  if (!UI.built) return;
  hudBtn();
  // (a guest waiting for its host to start has its frame too: the code, and that it waits)
  const on = (!!NET.mode || !!S.role) && G.mode !== 'title', P = on ? party() : [];
  const pe = $('party');
  if (pe.hidden === on) { pe.hidden = !on; $('hud')?.classList.toggle('party', on); }
  if (on) {
    const wait = S.role === 'guest' && !S.zoneKey ? t(S.hostPeer ? 'coop.waitStart' : 'coop.waitHost') : '';
    const key = P.map((p) => p.peer + p.name + p.cls + p.lvl + p.here).join('|') + S.code + S.role + wait;
    if (key !== partyKey) {
      partyKey = key;
      pe.innerHTML = `<div class="ph">${t('coop.badge')} · ${esc((S.code || '').toUpperCase())} · ${1 + P.filter((p) => p.here).length}/4<span class="st"> · ${t('coop.stale')}</span></div>${wait ? `<div class="pw">${esc(wait)}</div>` : ''}` + P.map((p) => `<div class="pm${p.here ? '' : ' away'}" data-p="${esc(p.peer)}"><span class="ic">${clsIcon(p.cls)}</span><span class="nm">${esc(p.name)}</span><span class="lv">${p.lvl}</span><div class="b"><i></i></div></div>`).join('');
    }
    pe.classList.toggle('stale', stale());
    for (const p of P) {
      const el = pe.querySelector(`[data-p="${CSS.escape(p.peer)}"]`); if (!el) continue;
      el.querySelector('i').style.transform = `scaleX(${Math.max(0, Math.min(1, p.hp / Math.max(1, p.hpMax)))})`;
      el.classList.toggle('dead', p.dead);
    }
  }
  // names over the other heroes in this zone; names that would lie over one another are stacked, the one nearest the
  // bottom of the screen (the nearest the camera) where it is, the others above it
  const pl = $('plates'), seen = new Set(), put = [];
  if (on && R.camera) for (const p of P) {
    const a = p.actor; if (!a || a.removed || !a.avatar?.group.visible) continue;
    seen.add(p.peer);
    let N = UI.plates.get(p.peer);
    if (!N) { N = { el: document.createElement('div'), w: 0 }; N.el.className = 'plate'; pl.appendChild(N.el); UI.plates.set(p.peer, N); }
    const el = N.el, txt = p.name + (p.dead ? ' · ' + t('coop.downedTag') : '');
    if (el.textContent !== txt) { el.textContent = txt; N.w = 0; }
    el.classList.toggle('dead', p.dead);
    UI.v.set(a.x, (a.y || 0) + 2.35, a.z).project(R.camera);
    const vis = UI.v.z < 1 && Math.abs(UI.v.x) < 1.1 && Math.abs(UI.v.y) < 1.1;
    el.style.display = vis ? '' : 'none';
    // (its width measured once for each text, while it can be: under a hidden HUD, a cinematic's, it has none, and is
    // measured when it shows again)
    if (vis) { const w = N.w || (N.w = el.offsetWidth) || 60; put.push({ el, w, x: (UI.v.x + 1) / 2 * innerWidth, y: (1 - UI.v.y) / 2 * innerHeight }); }
  }
  put.sort((a, b) => b.y - a.y || a.x - b.x);
  for (let i = 0; i < put.length; i++) {
    const q = put[i];
    for (let k = 0; k < i; k++) { const o = put.find((o, j) => j < i && Math.abs(o.x - q.x) < (o.w + q.w) / 2 + 4 && Math.abs(o.y - q.y) < PLATE_H); if (!o) break; q.y = o.y - PLATE_H; }
    q.el.style.transform = `translate(${q.x.toFixed(0)}px, ${q.y.toFixed(0)}px) translate(-50%, -100%)`;
  }
  for (const [k, N] of UI.plates) if (!seen.has(k)) { N.el.remove(); UI.plates.delete(k); }
  // the downed card and the revive ring follow the state (whatever ended it, nothing leaves them up); the card's count
  const dn = $('downed'), down = !!S.downed && !!S.role;
  if (dn.hidden === down) dn.hidden = !down;
  if (down) { const s = t('coop.downedSub', Math.ceil(S.downed.t)), el = dn.querySelector('.s'); if (el.textContent !== s) el.textContent = s; }
  const rv = $('revive'); if (!S.rv && rv && !rv.hidden) rv.hidden = true;
  // the open lobby's meter, in place once a second
  if (G.panel === 'coop' && S.role && performance.now() - UI.meterT > 1000) { UI.meterT = performance.now(); const m = document.querySelector('#panel .coop-meter'); if (m) m.textContent = meterText(); }
}
// the party button only where a game can be played (the title's and the pause menu's Co-op say why not)
function hudBtn() { const hb = $('h-coop'), can = canPlay() || !!S.role; if (hb && hb.hidden === can) hb.hidden = !can; }
function downed(d) { if (!UI.built) build(); const dn = $('downed'); if (dn) dn.hidden = !d; }
function reviveRing(k, who) {
  const rv = $('revive'); if (!rv) return;
  rv.hidden = !(k > 0);
  if (k > 0) { rv.querySelector('.fg').style.strokeDashoffset = String(125.7 * (1 - Math.min(1, k))); const s = t('coop.revive', who || '…'), b = rv.querySelector('b'); if (b.textContent !== s) b.textContent = s; }
}
export { nameOf };
