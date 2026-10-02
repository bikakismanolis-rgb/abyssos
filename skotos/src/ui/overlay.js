// 2D layer over the 3D view: damage numbers, health bars, names, loot labels.
import { R, toScreen } from '../gfx/gfx.js';
import { G } from '../game/state.js';
import { itemName, itemColor } from '../game/items.js';
import { t } from '../i18n/i18n.js';
import { fmtK } from '../core/util.js';

const OV = { c: null, g: null, nums: [], dpr: 1 };
const sp = { x: 0, y: 0, vis: false };
const FONT = '"Alegreya SC", "Alegreya", Georgia, serif';

export function initOverlay() {
  OV.c = document.createElement('canvas'); OV.c.id = 'ov';
  document.getElementById('stage').appendChild(OV.c);
  OV.g = OV.c.getContext('2d');
  const fit = () => { OV.dpr = Math.min(2, window.devicePixelRatio || 1); OV.c.width = innerWidth * OV.dpr; OV.c.height = innerHeight * OV.dpr; OV.c.style.width = innerWidth + 'px'; OV.c.style.height = innerHeight + 'px'; };
  fit(); window.addEventListener('resize', fit);
}

// kind: hit | crit | hurt | heal | dot | gold | text | xp
export function number(x, y, z, value, kind = 'hit', color) {
  if (kind === 'dot') return; // burns and poisons tick too often to read
  if (!G.settings.numbers && (kind === 'hit' || kind === 'crit')) return;
  if (OV.nums.length > 80) OV.nums.shift();
  OV.nums.push({ x, y, z, v: typeof value === 'number' ? fmtK(value) : value, kind, t: 0, dx: (Math.random() - 0.5) * 30, color });
}

function bar(g, x, y, w, h, frac, col, back = 'rgba(0,0,0,0.65)') {
  g.fillStyle = back; g.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
  g.fillStyle = col; g.fillRect(x - w / 2, y, w * Math.max(0, frac), h);
}

export function drawOverlay(dt) {
  const g = OV.g, d = OV.dpr;
  g.setTransform(d, 0, 0, d, 0, 0);
  g.clearRect(0, 0, innerWidth, innerHeight);
  if (G.mode !== 'play' && G.mode !== 'cine') { OV.nums.length = 0; return; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  // loot on the ground
  for (const p of G.pickups) {
    if (p.kind !== 'item' || p.y > 0.3) continue;
    toScreen(p.x, 0.35, p.z, sp); if (!sp.vis) continue;
    const name = itemName(p.item);
    g.font = `600 ${p.item.rar >= 2 ? 13 : 12}px ${FONT}`;
    const w = g.measureText(name).width + 12;
    g.fillStyle = 'rgba(6,6,10,0.72)'; g.fillRect(sp.x - w / 2, sp.y - 9, w, 18);
    g.fillStyle = itemColor(p.item); g.fillText(name, sp.x, sp.y + 1);
  }
  // health bars and names
  for (const a of G.actors) {
    if (a.dead || a.team !== 'foe' || !a.avatar || a.boss) continue;
    const show = a.hpShow > 0 || a.elite;
    if (!show) continue;
    a.hpShow -= dt;
    const h = (a.def.big ? 3.6 : a.kind === 'spider' || a.kind === 'warg' ? 1.5 : a.kind === 'spiderling' ? 0.8 : 2.2) * (a.scale || 1);
    toScreen(a.x, h, a.z, sp); if (!sp.vis) continue;
    const w = a.elite ? 64 : 40;
    bar(g, sp.x, sp.y, w, a.elite ? 5 : 4, a.hp / a.hpMax, a.elite === 'rare' ? '#e8b030' : a.elite === 'champion' ? '#5a80ff' : '#c02a20');
    if (a.elite && (a.name || a.elite === 'champion')) {
      g.font = `700 12px ${FONT}`;
      g.fillStyle = a.elite === 'rare' ? '#f2d24a' : '#8ab0ff';
      g.fillText(a.name || t('elite.champion'), sp.x, sp.y - 10);
      if (a.affixes.length) { g.font = `500 10px ${FONT}`; g.fillStyle = 'rgba(230,220,200,0.85)'; g.fillText(a.affixes.map((k) => t('aff.' + k)).join(' · '), sp.x, sp.y - 23); }
    }
  }
  // NPC names and interaction prompt
  for (const a of G.actors) {
    if (a.team !== 'npc' || !a.avatar) continue;
    toScreen(a.x, 2.35, a.z, sp); if (!sp.vis) continue;
    g.font = `700 12px ${FONT}`; g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(t('npc.' + a.npc), sp.x + 1, sp.y + 1);
    g.fillStyle = a.npc === 'villager' ? '#c8c0a8' : '#f0d890'; g.fillText(t('npc.' + a.npc), sp.x, sp.y);
    if (a.quest) { g.font = `800 20px ${FONT}`; g.fillStyle = '#ffcc40'; g.fillText('!', sp.x, sp.y - 20 + Math.sin(performance.now() / 200) * 3); }
  }
  // floating numbers
  for (let i = OV.nums.length - 1; i >= 0; i--) {
    const n = OV.nums[i]; n.t += dt;
    const life = n.kind === 'crit' ? 1.1 : n.kind === 'text' ? 1.6 : 0.85;
    if (n.t > life) { OV.nums.splice(i, 1); continue; }
    toScreen(n.x, n.y, n.z, sp); if (!sp.vis) continue;
    const k = n.t / life, rise = n.kind === 'hurt' ? 30 * k : 48 * Math.sqrt(k);
    const pop = n.kind === 'crit' ? 1 + Math.max(0, 0.6 - n.t * 4) : 1 + Math.max(0, 0.3 - n.t * 3);
    const size = (n.kind === 'crit' ? 24 : n.kind === 'text' ? 16 : n.kind === 'dot' ? 13 : 17) * pop;
    g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    g.font = `800 ${size | 0}px ${FONT}`;
    const col = n.color || { hit: '#f4ecdc', crit: '#ffd23a', hurt: '#ff4a3a', heal: '#5aff7a', dot: '#ff9a50', gold: '#ffd060', text: '#e8dcc0', xp: '#a080ff' }[n.kind];
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.75)';
    const x = sp.x + n.dx * k, y = sp.y - rise;
    g.strokeText(n.v, x, y); g.fillStyle = col; g.fillText(n.v, x, y);
    g.globalAlpha = 1;
  }
}
export function clearOverlay() { OV.nums.length = 0; }
