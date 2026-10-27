// Cloud saves in Settings: a row with the state, and a panel of its own (the state, the last sync, Sync now; on the web
// build the save code, shown, copied, a new one, and another device's code taken; the backups of what a sync or a
// deletion replaced, each taken back with a tap, and those no longer kept). And a word when another device played the
// hero this page plays further on (back to the title to take that copy up). game/cloud.js, docs/cloudsave/README.md.
import { G } from '../game/state.js';
import { CLASSES, DIFFS } from '../game/data.js';
import { CLOUD, syncNow, claimCode, newCode } from '../game/cloud.js';
import { backups, backupsGone, restoreBackup } from '../game/save.js';
import { EXTRA, open as openPanel, renderPanel } from './panels.js';
import { ICON } from './icons.js';
import { on, emit } from './bus.js';
import { t, lang } from '../i18n/i18n.js';

const esc = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const when = (ms) => { if (!ms) return t('cloud.never'); const s = Math.max(0, Math.round((Date.now() - ms) / 1000)); if (s < 60) return t('cloud.justNow'); if (s < 3600) return t('cloud.minAgo', Math.round(s / 60)); return new Date(ms).toLocaleString(lang() === 'en' ? 'en-GB' : 'el-GR', { dateStyle: 'short', timeStyle: 'short' }); };
const errText = (c) => t('cloud.e.' + c) !== 'cloud.e.' + c ? t('cloud.e.' + c) : t('cloud.e.unavailable') + ' (' + esc(c) + ')';
const UI = { msg: null, shown: false, sure: null, bk: '' };
// (a backup is named by its hero and time, not its place in the list: a sync between two taps may add one before it)
const bkKey = (b) => b.hero.id + ':' + b.at;
const bkSig = () => backups().map(bkKey).join() + '|' + backupsGone().map((g) => g.id + ':' + g.at).join();
const heroLine = (h) => `${esc(t('class.' + h.cls))} · ${t('hud.level', esc(h.level))}${DIFFS[h.diff] ? ' · ' + t('diff.' + DIFFS[h.diff].id) : ''}`;
const whyText = (w) => (t('cloud.why.' + w) !== 'cloud.why.' + w ? t('cloud.why.' + w) : '');
// the state in a few words: what the settings row and the panel's first line say
export function cloudLine() {
  if (CLOUD.state === 'off') return t('cloud.off');
  if (CLOUD.state === 'idle') return t('cloud.idle');
  if (CLOUD.state === 'starting') return t('cloud.starting');
  if (CLOUD.state === 'unavailable') return t(CLOUD.kind === 'artifact' ? (CLOUD.why === 'read_only' ? 'cloud.na.readonly' : 'cloud.na.claude') : 'cloud.na.web');
  if (CLOUD.busy) return t('cloud.syncing');
  if (CLOUD.err) return t('cloud.errLine', errText(CLOUD.err));
  return t('cloud.onLine', when(CLOUD.last));
}
function render() {
  const sb = CLOUD.kind === 'supabase', on = CLOUD.state === 'on';
  const code = CLOUD.code ? CLOUD.code.match(/.{1,4}/g).join('-') : '';
  UI.bk = bkSig();
  const bk = backups().map((b) => { const h = b.hero, C = CLASSES[h.cls]; return `<div class="cl-bk"><span style="color:${C?.color || '#ccc'}">${heroLine(h)}</span><span class="muted">${whyText(b.why)} · ${when(b.at)}</span><button class="btn ghost sm" data-a="clrestore:${esc(bkKey(b))}">${t(UI.sure === bkKey(b) ? 'cloud.restoreAgain' : 'cloud.restore')}</button></div>`; }).join('');
  // (and what went for room: so that a copy no longer here is not looked for)
  const gone = backupsGone().slice(0, 3).map((g) => `<p class="muted">${t('cloud.dropped', heroLine(g), whyText(g.why), when(g.at))}</p>`).join('');
  return `<div class="pn narrow">${head()}<div class="pn-b">
    <p class="cl-state ${CLOUD.err ? 'bad' : ''}" id="cl-state">${esc(cloudLine())}</p>
    <p class="muted">${t(CLOUD.kind === 'artifact' ? 'cloud.about.claude' : sb ? 'cloud.about.web' : 'cloud.about.off')}</p>
    ${on ? `<button class="btn" data-a="clsync" style="width:100%">${t('cloud.syncNow')}</button>` : ''}
    ${sb && on ? `<h4>${t('cloud.code')}</h4><p class="muted">${t('cloud.code.d')}</p>
      <div class="cl-code"><span id="cl-code" class="${UI.shown ? '' : 'hide'}">${UI.shown ? esc(code) : '••••-••••-••••-••••'}</span><button class="btn ghost sm" data-a="clshow">${t(UI.shown ? 'cloud.hide' : 'cloud.show')}</button><button class="btn ghost sm" data-a="clcopy">${t('cloud.copy')}</button></div>
      <button class="btn ghost sm" data-a="clnew">${t('cloud.newCode')}</button>` : ''}
    ${sb && (on || CLOUD.state === 'idle') ? `<h4>${t('cloud.claim')}</h4><p class="muted">${t('cloud.claim.d')}</p>
      <div class="cl-code"><input id="cl-in" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="24" placeholder="XXXX-XXXX-XXXX-XXXX"><button class="btn sm" data-a="clclaim">${t('cloud.claimGo')}</button></div>` : ''}
    ${UI.msg ? `<p class="cl-msg" id="cl-msg">${esc(UI.msg)}</p>` : ''}
    <h4>${t('cloud.backups')}</h4><p class="muted">${t('cloud.backups.d')}</p>${bk || `<p class="muted">${t('cloud.noBackups')}</p>`}${gone}
    <button class="btn ghost" data-a="settings" style="width:100%">${t('pick.back')}</button></div></div>`;
}
const head = () => `<div class="pn-h"><h2>${t('cloud.title')}</h2><button class="x" data-a="close" aria-label="${t('panel.close')}">${ICON.close}</button></div>`;
function say(m) { UI.msg = m; if (G.panel === 'cloud') renderPanel(); }
function click(a, x, y) {
  if (a === 'clsync') { syncNow('manual').then((r) => say(r?.ok ? t('cloud.synced') : r === null ? null : errText(r?.code || CLOUD.err || 'unavailable'))); say(t('cloud.syncing')); return true; }
  if (a === 'clshow') { UI.shown = !UI.shown; renderPanel(); return true; }
  if (a === 'clcopy') {
    const c = CLOUD.code ? CLOUD.code.match(/.{1,4}/g).join('-') : '';
    const done = () => say(t('cloud.copied'));
    try { navigator.clipboard.writeText(c).then(done, () => { UI.shown = true; say(t('cloud.copyFail')); }); } catch (e) { UI.shown = true; say(t('cloud.copyFail')); }
    return true;
  }
  if (a === 'clnew') { if (UI.sureNew) { UI.sureNew = false; newCode().then((c) => { UI.shown = !!c; say(c ? t('cloud.newDone') : errText(CLOUD.err)); }); } else { UI.sureNew = true; say(t('cloud.newSure')); } return true; }
  if (a === 'clclaim') {
    const v = document.getElementById('cl-in')?.value || '';
    say(t('cloud.syncing'));
    claimCode(v).then((r) => say(r.ok ? t('cloud.claimed') : errText(r.code)));
    return true;
  }
  if (a === 'clrestore') {
    const key = x + ':' + y;
    if (UI.sure !== key) { UI.sure = key; say(t('cloud.restoreSure')); return true; }
    UI.sure = null;
    const ok = restoreBackup(x, +y);
    say(ok ? t('cloud.restored') : t('cloud.restoreFail'));
    if (ok) emit('cloudHeroes', {});
    return true;
  }
  return false;
}
// the hero this page plays is further on in the cloud (another device played it since): back to the title takes that
// copy up (this one goes to the backups); playing on keeps both (the next sync keeps the further one, the other backed up)
function renderNewer() {
  return `<div class="pn narrow"><div class="pn-h"><h2>${t('cloud.newer.title')}</h2><button class="x" data-a="close" aria-label="${t('panel.close')}">${ICON.close}</button></div><div class="pn-b">
    <p>${t('cloud.newer.d')}</p>
    <button class="btn" data-a="quit" style="width:100%">${t('cloud.newer.go')}</button>
    <button class="btn ghost" data-a="close" style="width:100%;margin-top:8px">${t('cloud.newer.stay')}</button></div></div>`;
}
export function initCloudUi() {
  EXTRA.cloud = { render, click, reset() { UI.msg = null; UI.shown = false; UI.sure = null; UI.sureNew = false; } };
  EXTRA.cloudNewer = { render: renderNewer, click: () => false };
  // (the settings row: the state, a tap opens the panel)
  EXTRA.cloudRow = () => (CLOUD.state === 'off' ? '' : `<div class="set-row"><span>${t('cloud.title')}</span><button class="btn ghost sm cl-row" data-a="cloud">${esc(cloudLine())}</button></div>`);
  on('cloud', () => {
    if (G.panel === 'cloud') {
      // (the backups changed under the panel: drawn again, so each button is the copy it shows)
      if (bkSig() !== UI.bk) { renderPanel(); return; }
      const el = document.getElementById('cl-state'); if (el) { el.textContent = cloudLine(); el.classList.toggle('bad', !!CLOUD.err); }
    }
    else if (G.panel === 'settings') { const b = document.querySelector('#panel .cl-row'); if (b) b.textContent = cloudLine(); else renderPanel(); }
  });
  // (once a hero and visit, while it is being played: a sync that finds it while the hero is still being taken up, or
  // in a scene, tells it at the next)
  const told = new Set();
  on('cloudBehind', (id) => {
    if (!G.hero || G.mode !== 'play' || told.has(id)) return;
    told.add(id);
    if (!G.panel) openPanel('cloudNewer'); else emit('toast', t('cloud.newer.toast'), 'big');
  });
}
export { openPanel };
