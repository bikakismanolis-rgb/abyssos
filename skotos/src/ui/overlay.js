// 2D layer over the 3D view: damage numbers, health bars, names, loot labels.
import { R, toScreen } from '../gfx/gfx.js';
import { G } from '../game/state.js';
import { itemName, itemColor } from '../game/items.js';
import { t } from '../i18n/i18n.js';
import { npcName } from '../game/story.js';
import { COLD } from '../game/cold.js';
import { frostVignette } from '../gfx/fx.js';
import { on } from './bus.js';
import { fmtK } from '../core/util.js';

const OV = { c: null, g: null, nums: [], dpr: 1 };
const sp = { x: 0, y: 0, vis: false };
const FONT = '"Alegreya SC", "Alegreya", Georgia, serif';
// where a health bar floats over the low and the long (default: 2.2 m, big brutes 3.6 m)
const BAR_H = { spider: 1.5, warg: 1.5, spiderling: 0.8, rootling: 1.0, amberMoth: 2.0, amberBear: 2.5, heartroot: 2.3, rootwarden: 3.9 };

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

// ---------- Act V: the frost at the screen's edges ----------
// It grows in from the edges with the Cold (fx.js frostVignette: how far in, how strong) and flashes when she goes into the
// water or the frost bites; an Ice Memory holds it still around the scene (style.css, body.memory-ice). Made the first time
// it is wanted, at the screen's shape: hoarfrost as on a window, small six-armed crystals with branching needles, thick at
// the edges and thinning inward, over a white haze
const FR = { el: null, key: '', flash: 0, asp: 0 };
function frostDraw(c) {
  const W = 640, H = Math.max(220, Math.round((W * innerHeight) / Math.max(1, innerWidth)));
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const haze = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.55);
  haze.addColorStop(0, 'rgba(225,240,255,0)'); haze.addColorStop(0.6, 'rgba(215,235,252,0.16)'); haze.addColorStop(1, 'rgba(236,246,255,0.62)');
  g.fillStyle = haze; g.fillRect(0, 0, W, H);
  g.lineCap = 'round';
  // a needle that wanders a little and puts out side needles at sixty degrees
  const needle = (x, y, a, len, w, al, depth) => {
    let px = x, py = y;
    const n = Math.max(2, Math.round(len / 3));
    g.strokeStyle = `rgba(246,251,255,${al})`; g.lineWidth = w;
    g.beginPath(); g.moveTo(px, py);
    for (let k = 1; k <= n; k++) { a += (rnd() - 0.5) * 0.18; px += Math.cos(a) * (len / n); py += Math.sin(a) * (len / n); g.lineTo(px, py); }
    g.stroke();
    if (depth >= 2 || len < 5) return;
    for (let k = 1; k <= 3; k++) {
      if (rnd() < 0.35) continue;
      const t = k / 4, bx = x + (px - x) * t, by = y + (py - y) * t, l = len * (0.45 - t * 0.2);
      needle(bx, by, a + Math.PI / 3, l, w * 0.6, al * 0.8, depth + 1);
      needle(bx, by, a - Math.PI / 3, l, w * 0.6, al * 0.8, depth + 1);
    }
  };
  // crystals, most of them near an edge (the distance to the nearest edge drawn short far more often than long)
  for (let i = 0; i < 420; i++) {
    const e = (rnd() * 4) | 0, u = rnd(), d = Math.pow(rnd(), 2.2) * Math.min(W, H) * 0.42;
    const x = e === 0 ? u * W : e === 1 ? W - d : e === 2 ? u * W : d, y = e === 0 ? d : e === 1 ? u * H : e === 2 ? H - d : u * H;
    const near = 1 - d / (Math.min(W, H) * 0.42), size = 5 + rnd() * 16 * (0.5 + near), a0 = rnd() * Math.PI, al = 0.18 + 0.5 * near * rnd();
    for (let k = 0; k < 6; k++) needle(x, y, a0 + (k * Math.PI) / 3, size * (0.7 + rnd() * 0.5), 0.6 + near * 0.9, al, 1);
  }
  // long fronds grown in from the edges, as frost creeps across glass
  for (let i = 0; i < 46; i++) {
    const e = i % 4, u = rnd();
    const [x, y, a] = e === 0 ? [u * W, 0, Math.PI / 2] : e === 1 ? [W, u * H, Math.PI] : e === 2 ? [u * W, H, -Math.PI / 2] : [0, u * H, 0];
    needle(x, y, a + (rnd() - 0.5) * 1.1, 40 + rnd() * 70, 1.6, 0.42, 0);
  }
}
on('plunge', () => { FR.flash = 1; });
on('washOut', () => { FR.flash = Math.max(FR.flash, 0.7); });
on('frostbite', () => { FR.flash = 1; });
function frostTick(dt, act) {
  FR.flash = Math.max(0, FR.flash - dt * 1.1);
  const v = act ? Math.max(COLD.v, FR.flash > 0 ? 25 + 75 * FR.flash : 0) : 0, mem = document.body.classList.contains('memory-ice');
  // (made on the first frame in an Act V zone, under the zone's own entry, so it never costs a frame in a fight)
  if (!FR.el) {
    if (!act && !mem) return;
    FR.el = document.createElement('canvas'); FR.el.id = 'frost';
    document.getElementById('app').appendChild(FR.el);
  }
  // (drawn for the screen's shape: again if a phone is turned)
  const asp = innerWidth / Math.max(1, innerHeight);
  if (!FR.asp || Math.abs(asp / FR.asp - 1) > 0.25) { FR.asp = asp; frostDraw(FR.el); }
  const f = frostVignette(v), key = f.inner + '|' + f.outer + '|' + f.opacity;
  if (key === FR.key) return;
  FR.key = key;
  const st = FR.el.style;
  st.opacity = f.opacity; st.setProperty('--fi', f.inner + '%'); st.setProperty('--fo', f.outer + '%');
}

export function drawOverlay(dt) {
  const g = OV.g, d = OV.dpr;
  g.setTransform(d, 0, 0, d, 0, 0);
  g.clearRect(0, 0, innerWidth, innerHeight);
  frostTick(dt, (G.mode === 'play' || G.mode === 'cine') && !!G.zone?.act5);
  if (G.mode !== 'play' && G.mode !== 'cine') { OV.nums.length = 0; return; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  // loot on the ground (not over a cinematic: a boss's drop would label the scene of his death)
  for (const p of G.mode === 'cine' ? [] : G.pickups) {
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
    // nothing gives away what cannot be seen: an archer gone into the trees, a rootling underground, a Hollowed passing for dead wood
    if (!a.avatar.group.visible || a.disguised) continue;
    const show = a.hpShow > 0 || a.elite;
    if (!show) continue;
    a.hpShow -= dt;
    const h = (BAR_H[a.kind] ?? (a.def.big ? 3.6 : 2.2)) * (a.scale || 1);
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
    const nm = npcName(a.npc);
    g.font = `700 12px ${FONT}`; g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(nm, sp.x + 1, sp.y + 1);
    g.fillStyle = a.npc === 'villager' || a.npc === 'shorefolk' ? '#c8c0a8' : '#f0d890'; g.fillText(nm, sp.x, sp.y);
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
// the screen goes black and the game's own title stands in it, white, for dur s (the naming: the name you say to hold the
// dark); done() as it fades
export function titleCard(dur = 3, done) {
  const d = document.createElement('div');
  d.id = 'titlecard'; d.innerHTML = `<div class="logo">${t('game.title')}</div>`;
  document.getElementById('app').appendChild(d);
  requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('on')));
  setTimeout(() => d.classList.add('lit'), 900);
  setTimeout(() => { d.classList.remove('lit'); d.classList.add('out'); setTimeout(() => { d.remove(); done?.(); }, 1300); }, (dur + 0.9) * 1000);
}
