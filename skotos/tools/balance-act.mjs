// Simulated play, to measure how hard a zone or a boss is: a bot hero (to the nearest foe, attacks, skills on cooldown, out of
// red telegraphs, into blue safe circles, a potion under 35% life) with the gear a normal play-through would give fights a
// fixed route of packs (the N nearest the zone's start by walking distance) or a boss, and reports what it cost.
//
//   node tools/balance-act.mjs --zone ashfield --cls warden --lvl 23 --diff 1 --runs 3 [--packs 8] [--out f.jsonl]
//   node tools/balance-act.mjs --boss ivar --cls mage --lvl 23 --diff 0 --runs 5
//   node tools/balance-act.mjs --plan plan.json --out results.jsonl     (a list of jobs; jobs already in the output are skipped)
//
// A job: { id, zone, boss, cls, lvl, diff, packs, seed, gearK, skill, heat }. env BASE (default http://localhost:5199/), SIM (game
// steps per frame, default 8), SKILL (the bot's chance to notice a telegraph, default 0.6), REACT (seconds before it does, 0.45),
// HEAT (the Forge Heat of a forge zone run, 0-3, default 1; job.heat wins).
// The bot runs inside the game: it reads the frame's input from a getter on IN.events (takeEvents in updatePlayer), so it
// decides every fixed step, whatever the browser's frame rate. A death is counted, and the hero gets up where she fell.
// A page is reloaded after GROUP jobs (default 40) to keep memory down. --packs 99: every pack reachable from the start.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const args = {};
for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i]; if (k.startsWith('--')) { const v = process.argv[i + 1]; if (v == null || v.startsWith('--')) args[k.slice(2)] = true; else { args[k.slice(2)] = v; i++; } } }
const BASE = process.env.BASE || 'http://localhost:5199/';
const SIM = +(process.env.SIM || 8);
const OUT = args.out || null;
const GROUP = +(process.env.GROUP || 40);

// the order the bosses fall in, where they live, and the story a normal hero has behind her when she meets them
export const BOSSES = ['weaver', 'barrowLord', 'stonewarden', 'moltenKing', 'silverhorn', 'amaranthe', 'ivar', 'karthax'];
export const ZONES = { forest: 1, crypt: 4, pass: 10, halls: 13, weep: 16, heart: 19, ashfield: 22, forge: 25 };
export const BOSS_ZONE = { weaver: 'forest', barrowLord: 'crypt', stonewarden: 'pass', moltenKing: 'halls', silverhorn: 'weep', amaranthe: 'heart', ivar: 'ashfield', karthax: 'forge' };
const ACT = { forest: 1, crypt: 1, pass: 2, halls: 2, weep: 3, heart: 3, ashfield: 4, forge: 4 };

function jobsFromArgs() {
  if (args.plan) return JSON.parse(fs.readFileSync(args.plan, 'utf8'));
  const boss = args.boss || null, zone = boss ? BOSS_ZONE[boss] : args.zone || 'forest';
  const out = [];
  for (let r = 0; r < +(args.runs || 1); r++) out.push({ id: `${boss || zone}-${args.cls || 'warden'}-L${args.lvl || ZONES[zone] + 1}-d${args.diff ?? 1}-r${r}`, zone, boss, cls: args.cls || 'warden', lvl: +(args.lvl || ZONES[zone] + 1), diff: +(args.diff ?? 1), packs: +(args.packs || 8), seed: 1000 + r * 7919, gearK: +(args.gearK || 4), ...(args.heat != null ? { heat: +args.heat } : {}) });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// the page side: installed once per page (a self-contained function, serialised by Playwright)
async function installBot(cfg) {
  const G = window.__G, D = window.__D, IN = D.IN;
  const [data, items, stats, world, actors, fx, bus, hud, light, forge, state] = await Promise.all(['/src/game/data.js', '/src/game/items.js', '/src/game/stats.js', '/src/game/world.js', '/src/game/actors.js', '/src/gfx/fx.js', '/src/ui/bus.js', '/src/ui/hud.js', '/src/game/light.js', '/src/game/forge.js', '/src/game/state.js'].map((p) => import(p)));
  const { CLASSES, SKILLS, SLOTS, MONSTERS } = data;
  const B = window.__bal = { st: null, done: null, err: null, log: [] };
  const OWN = new Set([0xffb040, 0xffe0a0, 0xff6a20]);      // the hero's own telegraphs: leap, arrow rain, meteor
  const SAFE = 0x60c0ff;                                      // a blue safe circle (the Stonewarden's pulse, Ivar's nova, Karthax's dark)
  const angleTo = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);
  const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- the hero a normal player brings ----------
  const PRIO = { warden: ['whirl', 'leap', 'quake', 'cry'], ranger: ['multi', 'pierce', 'rain', 'wolf'], mage: ['fireball', 'meteor', 'chain', 'nova'] };
  function skillRanks(cls, lvl) {
    const sk = {}; let pts = lvl - 1;
    for (const id of PRIO[cls]) { const def = SKILLS[cls].find((s) => s.id === id); if (lvl < def.lvl) continue; sk[id] = 1; }
    for (const id of PRIO[cls]) { if (!sk[id]) continue; while (pts > 0 && sk[id] < 5) { sk[id]++; pts--; } }
    return { sk, pts };
  }
  const BOSS_LV = { weaver: 3, barrowLord: 7, stonewarden: 12, moltenKing: 16, silverhorn: 18, amaranthe: 22, ivar: 24, karthax: 28 };
  const BEFORE = { forest: [], crypt: ['weaver'], pass: ['weaver', 'barrowLord'], halls: ['weaver', 'barrowLord', 'stonewarden'], weep: ['weaver', 'barrowLord', 'stonewarden', 'moltenKing'], heart: ['weaver', 'barrowLord', 'stonewarden', 'moltenKing', 'silverhorn'], ashfield: ['weaver', 'barrowLord', 'stonewarden', 'moltenKing', 'silverhorn', 'amaranthe'], forge: ['weaver', 'barrowLord', 'stonewarden', 'moltenKing', 'silverhorn', 'amaranthe', 'ivar'] };
  // per slot: the best (by damage x toughness) of K drops round the item level a normal player wears there (job.ilvl, +-2;
  // default L-4..L), one of them an elite's, and the first-kill legendary of every boss already beaten (at that boss's
  // level: job.legLv, else BOSS_LV)
  function gear(h, job) {
    const L = h.level, cls = h.cls, C = CLASSES[cls], K = job.gearK ?? 4;
    const ilvl = () => Math.max(1, job.ilvl != null ? Math.round(job.ilvl + (Math.random() * 4 - 2)) : L - Math.floor(Math.random() * 5));
    const bases = { weapon: cls === 'warden' ? ['sword', 'axe', 'mace'] : [C.weapon], offhand: [C.off], helm: ['helm'], chest: ['chest'], gloves: ['gloves'], boots: ['boots'], amulet: ['amulet'], ring1: ['ring'], ring2: ['ring'] };
    const cand = {}; for (const s of SLOTS) cand[s] = [];
    for (const s of SLOTS) for (let k = 0; k < K + 1; k++) {
      const il = ilvl();
      cand[s].push(items.makeItem(il, { base: bases[s][Math.floor(Math.random() * bases[s].length)], cls, elite: k === K }));
    }
    const legs = [];
    for (const b of BEFORE[job.zone]) {
      const pool = data.LEGENDARIES.filter((l) => !l.cls || l.cls === cls), id = pool[Math.floor(Math.random() * pool.length)].id;
      const it = items.makeItem(Math.min(L + 1, job.legLv?.[b] ?? BOSS_LV[b]), { rar: 3, cls, leg: id });
      if (it.rar !== 3 || !items.usable(it, cls)) continue;
      legs.push(it.leg);
      for (const s of items.equipSlots(it)) cand[s].push(it);
    }
    const equip = {};
    const score = (e) => { const S = stats.computeStats(h, e); return Math.log(S.dps) + Math.log(S.toughness); };
    for (let pass = 0; pass < 2; pass++) for (const s of SLOTS) {
      let best = equip[s] || null, bs = -1e9;
      for (const it of cand[s]) { if ((s === 'ring1' && equip.ring2 === it) || (s === 'ring2' && equip.ring1 === it)) continue; const e = Object.assign({}, equip, { [s]: it }); const v = score(e); if (v > bs) { bs = v; best = it; } }
      equip[s] = best;
    }
    return { equip, legs };
  }

  const ZFLAGS = {
    forest: { quest: 1, acts: 0, flags: {} },
    crypt: { quest: 3, acts: 0, flags: { weaver: true } },
    pass: { quest: 6, acts: 1, flags: {} },
    halls: { quest: 8, acts: 1, flags: { stonewarden: true } },
    weep: { quest: 13, acts: 2, flags: { metElati: true } },
    heart: { quest: 14, acts: 2, flags: { metElati: true, hart: true, thorn0: true, thorn1: true, thorn2: true } },
    // a zone run clears the whole zone: the Anvil Gate and the Great Stair open (Ivar at rest, the slag plug melted), the
    // Forge's heat at its middle stage
    ashfield: { quest: 18, acts: 3, flags: { after3: true, fireTaken: true, ivar: true } },
    forge: { quest: 20, acts: 3, flags: { after3: true, fireTaken: true, ivar: true, bellows0: true, heat: 1, plug: true } }
  };
  const BFLAGS = {
    ivar: { quest: 19, flags: { ...Object.fromEntries(['l1', 'l2', 'l3', 'l4', 'l5'].flatMap((id) => [['lamp_' + id, true], ['mem_' + id, true]])), ivar: false, ivarDown: false } },
    karthax: { quest: 21, flags: { bellows0: true, bellows1: true, bellows2: true, heat: 3, plug: true, gifts: { throne: 'refused', forge: 'refused', unfading: 'refused' } } }
  };
  const BOONS = ['ember', 'forge', 'amber'];

  async function setupHero(job) {
    let h = G.hero;
    if (h.cls !== job.cls) {
      const nh = state.newHero(job.cls, job.diff);
      if (G.player?.avatar) { G.player.avatar.group.parent?.remove(G.player.avatar.group); }
      G.hero = h = nh; G.player = null;
    }
    const zf = ZFLAGS[job.zone], bf = job.boss ? BFLAGS[job.boss] : null;
    h.diff = job.diff; h.level = job.lvl; h.xp = 0;
    const R = skillRanks(h.cls, h.level); h.skills = R.sk; h.points = R.pts;
    h.quest = bf?.quest ?? zf.quest;
    h.flags = Object.assign({ tickHint: true, helpSeen: true }, zf.flags, bf?.flags || {});
    if (job.zone === 'forge' && !job.boss && job.heat != null) h.flags.heat = job.heat;
    for (let a = 1; a <= 3; a++) { h['act' + a] = a <= zf.acts ? 1 : -1; if (a <= zf.acts) h.flags['act' + a] = true; }
    h.act4 = -1;
    h.boons = BOONS.slice(0, zf.acts);
    h.seeds = {};
    h.inv = new Array(32).fill(null);
    const g = gear(h, job); h.equip = g.equip;
    stats.refreshStats();
    return g;
  }

  // ---------- the route ----------
  // walking distances from the start over the floor (8 ways, no corner cutting)
  function bfs(map, sx, sz) {
    const w = map.w, hh = map.h, d = new Int32Array(w * hh).fill(-1), q = new Int32Array(w * hh);
    const ix = Math.floor(sx), iz = Math.floor(sz); let head = 0, tail = 0;
    if (map.solid(ix, iz)) return d;
    d[iz * w + ix] = 0; q[tail++] = iz * w + ix;
    const DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1];
    while (head < tail) {
      const c = q[head++], cx = c % w, cz = (c - cx) / w;
      for (let k = 0; k < 8; k++) {
        const nx = cx + DX[k], nz = cz + DZ[k];
        if (nx < 0 || nz < 0 || nx >= w || nz >= hh || map.solid(nx, nz)) continue;
        if (k >= 4 && (map.solid(cx + DX[k], cz) || map.solid(cx, cz + DZ[k]))) continue;
        const n = nz * w + nx; if (d[n] >= 0) continue;
        d[n] = d[c] + 1; q[tail++] = n;
      }
    }
    return d;
  }
  // a point some cells back along the way from the start to (x, z)
  function backFrom(map, d, x, z, cells) {
    let f = map.nearestFloor(x, z, 6), cx = Math.floor(f.x), cz = Math.floor(f.z); const w = map.w;
    if (d[cz * w + cx] < 0) return null;
    const DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1];
    for (let s = 0; s < cells; s++) {
      let best = -1, bd = d[cz * w + cx];
      for (let k = 0; k < 8; k++) { const nx = cx + DX[k], nz = cz + DZ[k]; if (nx < 0 || nz < 0 || nx >= w || nz >= map.h) continue; const v = d[nz * w + nx]; if (v >= 0 && v < bd) { bd = v; best = k; } }
      if (best < 0) break; cx += DX[best]; cz += DZ[best];
    }
    return { x: cx + 0.5, z: cz + 0.5 };
  }

  // ---------- the bot ----------
  const seen = new WeakMap();      // telegraph -> noticed?
  function teles() {
    const red = [], blue = [], st = B.st, pl = G.player;
    const fl = forge.flues() || [], flueT = new Map();
    for (const f of fl) { if (f.tele) flueT.set(f.tele, f); if (f.sheet) flueT.set(f.sheet, f); }
    for (const t of fx.FX.teles) {
      if (!t.alive || t.t > t.dur + 0.05) continue;
      const m = t.m, u = m.material.uniforms, col = u.uColor.value.getHex(), shape = u.uShape.value;
      if (OWN.has(col)) continue;
      let s = seen.get(t);
      if (s == null) { s = Math.random() < st.skill; seen.set(t, s); }
      if (!s || t.t < st.react) continue;
      const x = m.position.x, z = m.position.z, rot = m.rotation.y - Math.PI, left = t.dur - t.t;
      // (the Forge's blue cover marks are safe from the Breath only, and the bot knows its cover already: inFlue's line of sight)
      if (shape < 0.5) { if (col === SAFE) { if (!fl.some((f) => f.cover?.some((c) => Math.abs(c.x - x) + Math.abs(c.z - z) < 0.05))) blue.push({ x, z, r: m.scale.x }); } else red.push({ k: 0, x, z, r: m.scale.x, left }); }
      else if (shape < 1.5) red.push({ k: 1, x, z, rot, range: m.scale.x, arc: u.uArc.value, left });
      else { const f = flueT.get(t); red.push({ k: 2, x, z, rot, len: m.scale.z * 2, w: m.scale.x * 2, left, flue: f }); }
    }
    // standing fire and the like (the foe's): walked out of, not rolled out of
    for (const a of G.areas) if ((a.team === 'foe' || a.team === 'all') && a.dmg > 0 && a.t < a.dur) red.push({ k: 0, x: a.x, z: a.z, r: a.r, left: 99, soft: true });
    return { red, blue, pl };
  }
  const PAD = 0.75;
  function inRed(r, x, z, pad = PAD) {
    if (r.k === 0) return Math.hypot(x - r.x, z - r.z) < r.r + pad;
    if (r.k === 1) { const d = Math.hypot(x - r.x, z - r.z); return d < r.range + pad && (d < pad || Math.abs(angDiff(r.rot, angleTo(r.x, r.z, x, z))) < r.arc + 0.12); }
    if (r.flue) return forge.inFlue(r.flue, x, z, pad);
    const ux = Math.sin(r.rot), uz = Math.cos(r.rot), dx = x - r.x, dz = z - r.z, u = dx * ux + dz * uz, v = dx * uz - dz * ux;
    return u > -0.5 - pad && u < r.len + pad && Math.abs(v) < r.w / 2 + pad;
  }
  const inBlue = (T, x, z) => T.blue.some((b) => Math.hypot(x - b.x, z - b.z) < b.r - 0.6);
  function danger(T, x, z, hardOnly = false) {
    if (T.blue.length && inBlue(T, x, z)) return null;
    let worst = null;
    for (const r of T.red) { if (hardOnly && r.soft) continue; if (inRed(r, x, z)) { if (!worst || r.left < worst.left) worst = r; } }
    return worst;
  }
  // the nearest place out of every telegraph that can be walked to in a straight line
  function escape(T, pl) {
    const map = G.zone.map; let best = null, bd = 1e9;
    for (const b of T.blue) { const d = Math.hypot(b.x - pl.x, b.z - pl.z); if (d < bd && map.walkable(b.x, b.z) && map.clear(pl.x, pl.z, b.x, b.z)) { bd = d - b.r * 0.5; best = { x: b.x + (pl.x - b.x) * 0.3, z: b.z + (pl.z - b.z) * 0.3 }; } }
    for (const rr of [1.2, 2, 3, 4.5, 6, 8, 11]) for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, x = pl.x + Math.sin(a) * rr, z = pl.z + Math.cos(a) * rr;
      if (rr >= bd) break;
      if (!map.walkable(x, z) || !map.clear(pl.x, pl.z, x, z) || danger(T, x, z)) continue;
      bd = rr; best = { x, z };
    }
    return best;
  }
  function attackable(a) { return !a.hidden && !a.airborne && !a.cling && !a.under && !a.disguised && !(a.invuln > 0) && !(a.bondT > 0) && !a.dormant && !(a.rising > 0); }
  function live(a) { return a.team === 'foe' && !a.dead && !a.removed && !a.prop && !a.keeper && !a.pet && !a.npc; }
  function count(x, z, r) { let n = 0; for (const a of G.actors) if (live(a) && attackable(a) && Math.hypot(a.x - x, a.z - z) < r + a.radius) n++; return n; }
  // (the Shroud holds in the ember zones only: Act V's shroudOn; the published Act IV code has lightOn alone)
  function shrouded(a) { return (a.def.shroud || a.shrouded) && !(a.unshroud > 0) && !(a.revealed > 0) && (light.shroudOn || light.lightOn)() && !light.lightAt(a.x, a.z); }
  // which foe: the boss's nodes or singers first when the boss cannot be hurt; then the nearest by the way there
  function pickTarget(st, pl) {
    const map = G.zone.map, b = G.zone.boss;
    let pool = G.actors.filter((a) => live(a) && (a.aggro || a.dormant || st.mode === 'boss' || (st.pack && a.packId === st.pack.id)) && Math.hypot(a.x - pl.x, a.z - pl.z) < 40);
    if (st.mode === 'pack') pool = pool.filter((a) => a.aggro || a.packId === st.pack?.id);
    if (b && !b.dead && b.mourners && b.ward > 0) { const m = b.mourners.filter((x) => live(x) && attackable(x)); if (m.length) pool = m; }
    pool = pool.filter((a) => !(st.skip.get(a) > st.t));
    let best = null, bs = 1e9, bestA = null, bsA = 1e9;
    for (const a of pool) {
      let d = Math.hypot(a.x - pl.x, a.z - pl.z) - a.radius;
      if (!map.los(pl.x, pl.z, a.x, a.z)) d += 6;
      if (a === st.target) d -= 2;
      if (attackable(a)) { if (d < bsA) { bsA = d; bestA = a; } }
      else if (d < bs) { bs = d; best = a; }
    }
    return bestA || best;
  }
  function ready(pl, i) { const sk = SKILLS[G.hero.cls][i]; return sk && G.hero.level >= (sk.lvl || 0) && pl.cds[i] <= 0 && pl.res >= (sk.cost || 0); }
  function chooseSkill(cls, pl, tg, d) {
    if (!tg || !attackable(tg)) return 0;
    if (cls === 'warden') {
      const n3 = count(pl.x, pl.z, 3.2), n6 = count(pl.x, pl.z, 6);
      if (ready(pl, 3) && n6 >= 1) return 3;
      if (ready(pl, 2) && d > 3.5 && d < 9) return 2;
      if (ready(pl, 4) && d < 7) return 4;
      if (ready(pl, 1) && pl.res >= 30 && n3 >= 3) return 1;
      if (ready(pl, 2) && d < 9 && count(tg.x, tg.z, 3.2) >= 3) return 2;
      return 0;
    }
    if (cls === 'ranger') {
      if (ready(pl, 3) && !G.actors.some((a) => a.kind === 'spiritWolf' && !a.dead)) return 3;
      if (ready(pl, 4)) return 4;
      if (ready(pl, 2) && (count(tg.x, tg.z, 3.6) >= 2 || tg.boss || tg.elite)) return 2;
      if (ready(pl, 1) && pl.res >= 60 && count(tg.x, tg.z, 5) >= 2) return 1;
      return 0;
    }
    if (ready(pl, 2) && count(pl.x, pl.z, 5) >= 1) return 2;
    if (ready(pl, 4) && d < 12) return 4;
    if (ready(pl, 3) && count(tg.x, tg.z, 9) >= 2) return 3;
    if (ready(pl, 1) && pl.res >= 60) return 1;
    return 0;
  }
  const dirT = { x: 0, z: 0 };
  function moveTo(st, pl, tx, tz) {
    const map = G.zone.map, d = Math.hypot(tx - pl.x, tz - pl.z);
    if (d < 0.3) { IN.mx = IN.mz = 0; return; }
    let dx = (tx - pl.x) / d, dz = (tz - pl.z) / d;
    if (!map.clear(pl.x, pl.z, tx, tz)) { const f = pathDir(st, map, pl, tx, tz); if (f) { dx = f.x; dz = f.z; } }
    IN.mx = dx; IN.mz = dz; st.wantMove = true;
  }
  // the way to (tx, tz) over the whole map: walking distances from the target's cell (kept while it stays in its cell
  // area and for a second), then downhill from the hero's cell
  function pathDir(st, map, pl, tx, tz) {
    const f = map.nearestFloor(tx, tz, 4), cx = Math.floor(f.x), cz = Math.floor(f.z), P = st.flow;
    if (!P || Math.abs(P.cx - cx) + Math.abs(P.cz - cz) > 2 || st.t - P.t > 1 || P.ver !== map.ver) st.flow = { cx, cz, t: st.t, ver: map.ver, d: bfs(map, f.x, f.z) };
    const D = st.flow.d, w = map.w, gx = Math.floor(pl.x), gz = Math.floor(pl.z);
    let best = D[gz * w + gx]; if (best < 0) best = 1e9;
    let bx = 0, bz = 0;
    const DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1];
    for (let k = 0; k < 8; k++) {
      const nx = gx + DX[k], nz = gz + DZ[k]; if (nx < 0 || nz < 0 || nx >= w || nz >= map.h) continue;
      if (k >= 4 && (map.solid(gx + DX[k], gz) || map.solid(gx, gz + DZ[k]))) continue;
      const v = D[nz * w + nx]; if (v >= 0 && v < best) { best = v; bx = DX[k]; bz = DZ[k]; }
    }
    if (!bx && !bz) return null;
    // aim at the next cell's centre, a little ahead (so the body clears corners)
    const ax = gx + bx + 0.5, az = gz + bz + 0.5, ddx = ax - pl.x, ddz = az - pl.z, l = Math.hypot(ddx, ddz) || 1;
    dirT.x = ddx / l; dirT.z = ddz / l; return dirT;
  }
  function push(ev) { evq.push(ev); }
  let evq = IN.events, lastStamp = -1;
  Object.defineProperty(IN, 'events', { configurable: true, get() { try { tick(); } catch (e) { B.err = String(e.stack || e).slice(0, 800); } return evq; }, set(v) { evq = v; } });

  function tick() {
    const st = B.st; if (!st || st.over) return;
    if (G.mode !== 'play' || G.panel || hud.dialogOpen()) return;
    const stamp = G.hero.stats.time; if (stamp === lastStamp) return;
    const dt = lastStamp < 0 ? 0 : Math.min(0.034, Math.max(0, stamp - lastStamp)); lastStamp = stamp;
    const pl = G.player; if (!pl) return;
    st.t += dt; st.phaseT += dt;
    if (st.job.trace && st.t - (st.lastTrace || 0) > (st.job.trace || 2)) {
      st.lastTrace = st.t; const b = G.zone.boss, tg = st.target;
      st.trace.push({ t: +st.t.toFixed(1), hp: +(pl.hp / pl.hpMax).toFixed(2), act: pl.act?.name || '', why: st.why, x: +pl.x.toFixed(1), z: +pl.z.toFixed(1), tg: tg ? tg.kind + ':' + +Math.hypot(tg.x - pl.x, tg.z - pl.z).toFixed(1) + (attackable(tg) ? '' : '!') : '-', b: b ? +(b.hp / b.hpMax).toFixed(3) + (b.hidden ? 'h' : '') + (b.invuln > 0 ? 'i' : '') + (b.ward > 0 ? 'w' : '') + (b.cages ? ' c' + b.cages.filter((q) => !q.dead).map((q) => q.blows + '@' + Math.round(Math.hypot(q.x - pl.x, q.z - pl.z))).join(',') + ' m' + b.misses : '') + (b.dark ? ' dark' : '') + (shrouded(b) ? ' sh' : '') : '-', res: Math.round(pl.res), n: G.actors.filter((a) => live(a)).length });
    }
    IN.mx = IN.mz = 0; st.wantMove = false;
    // the books: what the foes lost, the hero's lowest
    for (const a of G.actors) if (a.team === 'foe' && !a.prop && !a.keeper) { const h0 = st.hp.get(a); const h = Math.max(0, a.hp); if (h0 != null && h < h0 && st.counting) st.dealt += h0 - h; st.hp.set(a, h); }
    if (pl.dead) {
      if (!st.deadT) { st.deadT = st.t; }
      if (st.t - st.deadT > 1.0) { pl.dead = false; pl.hp = pl.hpMax; pl.status = actors.freshStatus(); pl.act = null; pl.iframes = 2.5; pl.res = G.hero.cls === 'warden' ? 0 : G.stats.resMax; D.emit('heroLook'); st.deadT = 0; }
      return;
    }
    if (st.counting) st.minHp = Math.min(st.minHp, pl.hp / pl.hpMax);
    if (st.step) { st.step(st, pl, dt); if (st.over) return; }
    // between packs (the walk to the next one) she still steps out of the red, the Breath's included, and does nothing else
    if (st.fight && st.counting) st.ct += dt;

    const T = teles(), cls = G.hero.cls, C = CLASSES[cls];
    const busy = pl.act && pl.act.name !== 'basic' && pl.act.name !== 'whirl';
    // a potion under 35%
    if (pl.hp < pl.hpMax * 0.35 && pl.potionCd <= 0) { push({ t: 'potion' }); st.potions++; }
    // an Ember Tick on her back: roll it off
    if (pl.cling?.length && pl.dodgeCd <= 0 && (st.clingT = (st.clingT || 0) + dt) > 0.4) { st.clingT = 0; const a = rnd(0, 6.28); IN.mx = Math.sin(a); IN.mz = Math.cos(a); push({ t: 'dodge' }); st.dodges++; return; }
    // out of the red
    let dz = danger(T, pl.x, pl.z);
    if (dz && dz.soft && pl.hp > pl.hpMax * 0.5 && st.target && live(st.target) && attackable(st.target) && Math.hypot(st.target.x - pl.x, st.target.z - pl.z) - st.target.radius < (cls === 'warden' ? 2.6 : C.range - 1)) dz = null;
    if (dz) {
      const e = escape(T, pl);
      if (e) {
        const dist = Math.hypot(e.x - pl.x, e.z - pl.z), walk = dist / Math.max(1, pl.speed) + (busy || pl.act?.name === 'basic' ? 0.25 : 0);
        moveTo(st, pl, e.x, e.z);
        if (!dz.soft && walk > dz.left - 0.08 && pl.dodgeCd <= 0 && pl.act?.name !== 'leap') { push({ t: 'dodge' }); st.dodges++; }
        st.evading += dt; st.why = 'evade' + (dz.soft ? 'S' : '');
        return;
      }
    }
    if (!st.fight) { st.why = 'idle'; return; }
    if (busy) { st.why = 'busy'; return; }
    // the fight's own rules
    const b = G.zone.boss;
    let goal = null;
    if (b && !b.dead && b.kind === 'ivar' && b.dark) {
      // his dark: the adds at her side first (a blow breaks the touch, a Smoke-eater eats the fire), then the nearest dark brazier
      const add = G.actors.filter((x) => live(x) && attackable(x) && x !== b && Math.hypot(x.x - pl.x, x.z - pl.z) < 7).sort((p, q) => Math.hypot(p.x - pl.x, p.z - pl.z) - Math.hypot(q.x - pl.x, q.z - pl.z))[0];
      const off = (G.zone.act4?.braziers || []).filter((x) => !x.lit).sort((p, q) => Math.hypot(p.x - pl.x, p.z - pl.z) - Math.hypot(q.x - pl.x, q.z - pl.z))[0];
      if (add) { st.target = add; st.retarget = 0.4; }
      else if (off) {
        if (Math.hypot(off.x - pl.x, off.z - pl.z) < off.r - 0.3) { if (!pl.act) { off.use(); st.touches++; } return; }
        goal = { x: off.x, z: off.z, near: off.r - 0.6 };
      }
    }
    if (!goal && b && !b.dead && b.cages) {
      const up = b.cages.filter((s) => !s.dead).sort((p, q) => Math.hypot(p.x - pl.x, p.z - pl.z) - Math.hypot(q.x - pl.x, q.z - pl.z));
      // 1.8 m from the statue on her side, round his body (the way there does not know him: on his side of it she was pinned
      // against him), and no shooting until she is there (4 m short of it she stood 5-6 m from the statue, out of the 4.5 m
      // blow, and each statue waited for the two-miss fail-safe)
      if (up.length) {
        const s = up[0], map = G.zone.map; let f = null, fs = 1e9;
        for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2, x = s.x + Math.sin(an) * 1.8, z = s.z + Math.cos(an) * 1.8; if (!map.walkable(x, z)) continue; const db = Math.hypot(x - b.x, z - b.z), sc = Math.hypot(x - pl.x, z - pl.z) + (db < b.radius + 1.6 ? 8 : 0) + (map.clear(pl.x, pl.z, x, z) ? 0 : 4); if (sc < fs) { fs = sc; f = { x, z }; } }
        f ||= map.nearestFloor(s.x, s.z, 3); goal = { x: f.x, z: f.z, near: 1.0, fight: true, fightIn: 1.6 };
      }
    }
    if (!goal && b && !b.dead && b.awake && shrouded(b)) {
      // a Shrouded boss takes full damage only in light: wait for it in the nearest pool
      const pools = light.lightPools().filter((p) => p.r > 1.5).sort((p, q) => Math.hypot(p.x - b.x, p.z - b.z) - Math.hypot(q.x - b.x, q.z - b.z));
      if (pools.length) { const p = pools[0], to = G.zone.map.nearestFloor(p.x + (b.x - p.x) * 0.25, p.z + (b.z - p.z) * 0.25, 3); goal = { x: to.x, z: to.z, near: Math.max(1, p.r * 0.45), fight: true }; }
    }
    // the target
    if (!st.target || !live(st.target) || st.retarget <= 0) { st.target = pickTarget(st, pl); st.retarget = 0.4; }
    st.retarget -= dt;
    const tg = st.target;
    if (goal && Math.hypot(goal.x - pl.x, goal.z - pl.z) > goal.near) {
      moveTo(st, pl, goal.x, goal.z); st.why = 'goal';
      // far from where the fight's rule wants her: on her way, no stopping to shoot
      if (!goal.fight || !tg || Math.hypot(goal.x - pl.x, goal.z - pl.z) > (goal.fightIn ?? 4)) { unstick(st, pl, dt); return; }
    }
    if (!tg) {
      if (st.walkTo) { moveTo(st, pl, st.walkTo.x, st.walkTo.z); st.why = 'walk'; st.walkS += dt; unstick(st, pl, dt); return; }
      st.why = 'none'; unstick(st, pl, dt); return;
    }
    const d = Math.hypot(tg.x - pl.x, tg.z - pl.z) - tg.radius;
    const los = G.zone.map.los(pl.x, pl.z, tg.x, tg.z);
    const ranged = cls !== 'warden';
    const want = !attackable(tg) ? 1.5 : ranged ? (shrouded(tg) ? 3.5 : 7.5) : 1.4;
    const reach = ranged ? (shrouded(tg) ? 5 : C.range - 1) : 2.2;
    // ranged: back away (a roll) from a melee foe at her side when hurting
    if (ranged && pl.dodgeCd <= 0 && pl.hp < pl.hpMax * 0.7) {
      const m = G.actors.find((a) => live(a) && attackable(a) && a.def.reach < 3 && Math.hypot(a.x - pl.x, a.z - pl.z) < 1.8 + a.radius);
      if (m) {
        const a = angleTo(m.x, m.z, pl.x, pl.z), x = pl.x + Math.sin(a) * 6, z = pl.z + Math.cos(a) * 6;
        if (G.zone.map.walkable(x, z) && !danger(T, x, z, true)) { IN.mx = Math.sin(a); IN.mz = Math.cos(a); push({ t: 'dodge' }); st.dodges++; return; }
      }
    }
    if (!goal || !goal.fight) {
      if (d > want || !los || !attackable(tg)) {
        if (!(pl.act?.name === 'basic' && pl.act.t < pl.act.dur * 0.7)) moveTo(st, pl, tg.x, tg.z);
        if (!(attackable(tg) && los && d <= reach)) { st.why = 'approach'; unstick(st, pl, dt); return; }
      }
    }
    if (!attackable(tg) || !los || d > reach + (ranged ? 0 : 0.6)) { st.why = 'noreach'; unstick(st, pl, dt); return; }
    st.stuckT = 0;
    if (pl.act && pl.act.name === 'whirl') { moveTo(st, pl, tg.x, tg.z); return; }
    if (pl.act) return;
    st.why = 'atk';
    const i = chooseSkill(cls, pl, tg, d);
    IN.mx = IN.mz = 0;
    push({ t: 'skill', i, aim: { x: tg.x, z: tg.z } });
    if (i) st.casts[i] = (st.casts[i] || 0) + 1;
  }
  // pinned against something on the way to a foe: a little nudge, and in the end that foe is left for a while
  function unstick(st, pl, dt) {
    if (!st.wantMove) { st.stuckT = 0; return; }
    if (!st.lastPos || Math.hypot(pl.x - st.lastPos.x, pl.z - st.lastPos.z) > 0.8) { st.lastPos = { x: pl.x, z: pl.z }; st.stuckT = 0; return; }
    st.stuckT += dt;
    const tg = st.target || st.walkTo;
    if (st.stuckT > 4 && tg) {
      st.stuck++; st.stuckT = 0;
      const a = angleTo(pl.x, pl.z, tg.x, tg.z), f = G.zone.map.nearestFloor(pl.x + Math.sin(a) * 2.5, pl.z + Math.cos(a) * 2.5, 4);
      if (st.stuck % 3 === 0 && st.target) st.skip.set(st.target, st.t + 10); else { pl.x = f.x; pl.z = f.z; }
    }
  }

  // (a diagnostic, job.hpTrace: where the boss's life goes, by the code that took it)
  function traceHp(st, b) {
    let v = b.hp; st.bossSrc = {};
    Object.defineProperty(b, 'hp', { configurable: true, get: () => v, set: (n) => {
      if (n < v) { let key = '?'; for (const l of (new Error().stack || '').split('\n').slice(2)) { const m = l.match(/at (?:Object\.)?([\w$.]+)? ?\(?.*?\/src\/(?:game|gfx)\/([a-z0-9]+)\.js[^:]*:(\d+)/); if (m && !/combat:(5\d|6\d|7\d)$/.test(m[2] + ':' + m[3]) && m[1] !== 'damage') { key = m[2] + ':' + m[3] + ' ' + (m[1] || ''); break; } } st.bossSrc[key] = Math.round((st.bossSrc[key] || 0) + (v - n)); }
      v = n; } });
  }
  // a zone walked as a player walks it: from the start to the nearest pack not yet cleared (by the way there), fighting
  // whatever comes on the way (the Forge's Breath, the slag, the Lampless's lanterns, the Ashwings included); every second
  // of it counts
  function walkZone(st, z, map, route) {
    const left = new Set(route), w = map.w, pl = G.player;
    let cur = null;
    st.fight = true; st.walkS = 0; st.passed = 0;
    const pickNext = () => {
      const dd = bfs(map, pl.x, pl.z); let best = null, bd = 1e9;
      for (const p of left) { const f = map.nearestFloor(p.x, p.z, 5), v = dd[Math.floor(f.z) * w + Math.floor(f.x)]; if (v >= 0 && v < bd) { bd = v; best = p; } }
      return best || left.values().next().value;
    };
    st.step = (st, pl, dt) => {
      if (st.t > cfg.zoneMax) { st.over = true; return; }
      if (!cur) {
        if (!left.size) { st.over = true; return; }
        cur = pickNext(); st.pack = cur; st.packT = 0; st.packStart = { taken: st.takenN, deaths: st.deaths, kills: st.kills };
      }
      st.packT += dt;
      // packs cleared on the way leave the list
      for (const p of left) if (p !== cur && p.spawned && !G.actors.some((a) => a.packId === p.id && live(a))) { left.delete(p); st.passed++; }
      const mine = G.actors.filter((a) => a.packId === cur.id && live(a));
      const near = G.actors.some((a) => live(a) && a.aggro && Math.hypot(a.x - pl.x, a.z - pl.z) < 22);
      if ((cur.spawned && !mine.length && !near) || st.packT > 240) {
        const s = st.packStart;
        st.packs.push({ tag: cur.tag, n: cur.n, elite: cur.elite || null, t: +st.packT.toFixed(1), life: +(st.takenN - s.taken).toFixed(2), deaths: st.deaths - s.deaths, kills: st.kills - s.kills, timeout: st.packT > 240 });
        left.delete(cur); cur = null; st.walkTo = null; st.target = null;
        return;
      }
      // to the pack; once it is up, to its nearest member (a Smoke-eater gone for a lamp, a patrol on its round)
      if (!mine.length) st.walkTo = { x: cur.x, z: cur.z };
      else { let m = mine[0], md = 1e9; for (const a of mine) { const d = Math.hypot(a.x - pl.x, a.z - pl.z); if (d < md) { md = d; m = a; } } st.walkTo = { x: m.x, z: m.z }; }
    };
  }
  // ---------- the books ----------
  const SRC = /\/src\/(?:game|gfx)\/([a-z0-9]+)\.js[^:]*:(\d+)/;
  bus.on('hurt', (frac) => {
    const st = B.st; if (!st || !st.counting) return;
    const pl = G.player, amt = frac * pl.hpMax;
    st.taken += amt; st.takenN += frac; st.hits++;
    st.maxHit = Math.max(st.maxHit, frac);
    // who: the first frame of the stack outside the bus and the damage code; and the nearest foe at work
    let key = '?';
    const lines = (new Error().stack || '').split('\n');
    for (const l of lines) { if ((/bus\.js|combat\.js|<anonymous>|hitHero/.test(l) && !/tickStatus|tickCling|tickBurst/.test(l)) || !/\/src\//.test(l)) continue; const m = l.match(/at (?:Object\.)?([\w$.]+)? ?\(?.*?\/src\/(?:game|gfx)\/([a-z0-9]+)\.js[^:]*:(\d+)/); if (m) { key = m[2] + ':' + m[3] + (m[1] ? ' ' + m[1] : ''); break; } }
    let who = null, wd = 1e9;
    for (const a of G.actors) { if (!live(a)) continue; const d = Math.hypot(a.x - pl.x, a.z - pl.z); const busy = a.state === 'attack' || a.move || a.dash ? 0 : 6; if (d + busy < wd && d < 16) { wd = d + busy; who = a; } }
    const k = (who ? who.kind + (who.elite ? '*' : '') : '-') + ' @' + key;
    const e = st.src[k] ||= { n: 0, life: 0 }; e.n++; e.life += frac;
    const bb = G.zone.boss; if (bb && st.mode === 'boss') st.byPhase[bb.phase ?? 0] = (st.byPhase[bb.phase ?? 0] || 0) + frac;
  });
  bus.on('kill', (a) => { const st = B.st; if (st?.counting && a.team === 'foe') { st.kills++; if (a.elite) st.eliteKills++; } });
  // a death: counted, and she gets up where she fell a second later (game time: updatePlayer does not run for the dead, so
  // the bot's own tick cannot do it)
  const revive = () => { const pl = G.player; if (!pl || !pl.dead || !B.st) return; pl.dead = false; pl.hp = pl.hpMax; pl.status = actors.freshStatus(); pl.act = null; pl.iframes = 2.5; pl.res = G.hero.cls === 'warden' ? 0 : G.stats.resMax; D.emit('heroLook'); B.st.deadT = 0; };
  bus.on('heroDeath', () => { const st = B.st; if (!st) return; if (st.counting) { st.deaths++; st.deathAt.push(+st.t.toFixed(1)); } st.diedAt = performance.now(); G.timers.push({ t: 1.0, fn: revive }); });
  bus.on('bossPhase', (a, ph) => { const st = B.st; if (st?.counting && a === G.zone.boss) st.phases.push([ph, +st.ct.toFixed(1)]); });

  // keep the game moving: dialogs advanced, the death panel and any other panel closed
  setInterval(() => {
    if (!B.st || B.st.over) return;
    if (hud.dialogOpen()) D.emit('key', 'enter');
    if (G.panel) D.closePanel();
    if (G.player?.dead && performance.now() - (B.st.diedAt || 0) > 2500) revive();
  }, 120);

  // ---------- a job ----------
  B.run = async (job) => {
    B.done = null; B.err = null; B.st = null;
    const g = await setupHero(job);
    await world.zoneReady(job.zone);
    G.timers.length = 0; G.cine = null; G.mode = 'play'; document.getElementById('letterbox')?.classList.remove('on');
    if (G.panel) D.closePanel();
    const z = world.enterZone(job.zone, { fresh: true, seed: job.seed });
    const pl = G.player;
    Object.assign(pl, { dead: false, hp: pl.hpMax, res: G.hero.cls === 'warden' ? 0 : G.stats.resMax, potionCd: 0, dodgeCd: 0, buffs: {}, status: actors.freshStatus(), act: null, iframes: 0, cling: [] });
    pl.cds = pl.cds.map(() => 0);
    D.emit('heroLook');
    const st = B.st = {
      job, mode: job.boss ? 'boss' : 'pack', skill: job.skill ?? cfg.skill, react: job.react ?? cfg.react, t: 0, ct: 0, phaseT: 0, counting: false, fight: false, over: false, hp: new Map(), skip: new Map(), path: {},
      trace: [], why: '', walkTo: null, walkS: 0, passed: 0, dealt: 0, taken: 0, takenN: 0, hits: 0, maxHit: 0, kills: 0, eliteKills: 0, deaths: 0, deathAt: [], potions: 0, dodges: 0, evading: 0, touches: 0, stuck: 0, stuckT: 0, casts: {}, src: {}, phases: [], byPhase: [],
      minHp: 1, target: null, retarget: 0, packs: [], step: null, gear: Object.fromEntries(Object.entries(g.equip).map(([s, it]) => [s, it ? it.rar + ':' + it.ilvl : '-'])), legs: g.legs,
      hero: { lvl: G.hero.level, life: G.stats.lifeMax, armor: G.stats.armor, red: +G.stats.red.toFixed(3), dps: Math.round(G.stats.dps), block: G.stats.block }
    };
    lastStamp = -1;
    const map = z.map, L = z.L;
    if (!job.boss) {
      z.bossSpawned = true;
      const d = bfs(map, L.start.x, L.start.z), w = map.w;
      const reach = z.packs.map((p) => { const f = map.nearestFloor(p.x, p.z, 5); return { p, d: d[Math.floor(f.z) * w + Math.floor(f.x)] }; }).filter((q) => q.d >= 0).sort((a, b) => a.d - b.d);
      const route = reach.slice(0, job.packs).map((q) => q.p);
      st.route = route.map((p) => ({ tag: p.tag, n: p.n, elite: p.elite || null, d: reach.find((q) => q.p === p).d }));
      if (job.walk) walkZone(st, z, map, route);
      let i = -1, wait = 0;
      const next = () => {
        i++;
        if (i >= route.length) { st.over = true; return; }
        const p = route[i], at = backFrom(map, d, p.x, p.z, 9) || map.nearestFloor(p.x, p.z + 7);
        pl.x = at.x; pl.z = at.z; pl.kx = pl.kz = 0;
        st.pack = p; st.packT = 0; st.packStart = { ct: st.ct, taken: st.takenN, dealt: st.dealt, deaths: st.deaths, kills: st.kills, min: 1 }; st.fight = true; st.target = null;
      };
      st.counting = true;
      if (!job.walk) st.step = (st, pl, dt) => {
        if (wait > 0) { wait -= dt; if (wait <= 0) next(); return; }
        if (i < 0) { next(); return; }
        st.packT += dt;
        const p = st.pack, mine = G.actors.filter((a) => a.packId === p.id && live(a));
        const near = G.actors.some((a) => live(a) && a.aggro && Math.hypot(a.x - pl.x, a.z - pl.z) < 22);
        if ((p.spawned && !mine.length && !near) || st.packT > 150) {
          const s = st.packStart;
          st.packs.push({ tag: p.tag, n: p.n, elite: p.elite || null, t: +st.packT.toFixed(1), life: +(st.takenN - s.taken).toFixed(2), deaths: st.deaths - s.deaths, kills: st.kills - s.kills, timeout: st.packT > 150 });
          st.fight = false; wait = cfg.walk; IN.mx = IN.mz = 0;
          if (i + 1 >= route.length) { st.over = true; }
        }
        if (st.t > cfg.zoneMax) st.over = true;
      };
    } else {
      for (const p of z.packs) p.spawned = true;
      z.bossSpawned = false;
      const c = z.bossSpot || L.boss, want = job.boss === 'karthax' ? 8 : 9;
      const db = bfs(map, map.nearestFloor(c.x, c.z, 6).x, map.nearestFloor(c.x, c.z, 6).z);
      let at = null, ad = 1e9;
      for (let k = 0; k < db.length; k++) { const v = db[k]; if (v < 0) continue; const x = (k % map.w) + 0.5, zz = Math.floor(k / map.w) + 0.5, e = Math.abs(Math.hypot(x - c.x, zz - c.z) - want) + Math.abs(v - want) * 0.5 + (zz < c.z ? 0.6 : 0); if (e < ad && map.los(x, zz, c.x, c.z)) { ad = e; at = { x, z: zz }; } }
      at ||= map.nearestFloor(c.x, c.z + want, 6);
      pl.x = at.x; pl.z = at.z;
      st.fight = true;
      if (!z.bossSpot) B.err = 'no boss spot (story flags?)';
      st.step = (st, pl, dt) => {
        const b = z.boss;
        if (st.t > cfg.bossMax + 120) st.over = true;
        if (!b) { if (st.t > 60) { B.err = 'the boss never came'; st.over = true; } return; }
        if (!st.counting && b.awake) { st.counting = true; st.bossLvl = b.level; st.bossHp = Math.round(b.hpMax); st.bossDmg = +b.dmg.toFixed(1); if (st.job.hpTrace) traceHp(st, b); }
        if (b.dead) { st.killed = true; st.over = true; }
        if (st.ct > cfg.bossMax || st.deaths >= cfg.maxDeaths) st.over = true;
        // still asleep (the Hart before its time, Karthax under the slag): walk up to it
        if (!b.awake && !b.holdWake && Math.hypot(b.x - pl.x, b.z - pl.z) > 10 && !st.counting) { st.target = b; }
      };
    }
    // wait for the end (real time), reporting
    const w0 = performance.now();
    await new Promise((ok) => { const iv = setInterval(() => { if (st.over || B.err || performance.now() - w0 > cfg.realMax * 1000) { clearInterval(iv); ok(); } }, 250); });
    st.over = true; IN.mx = IN.mz = 0;
    const min = Math.max(st.ct, 1e-6) / 60;
    const b = z.boss;
    const res = {
      ...job, ok: !B.err && (job.boss ? !!st.killed : true), err: B.err, realS: Math.round((performance.now() - w0) / 1000),
      hero: st.hero, endLvl: G.hero.level, gear: st.gear, legs: st.legs,
      combatS: +st.ct.toFixed(1), totalS: +st.t.toFixed(1), deaths: st.deaths, deathAt: st.deathAt, minLife: +st.minHp.toFixed(3),
      takenPerMin: Math.round(st.taken / min), lifePerMin: +(st.takenN / min).toFixed(2), dealtPerMin: Math.round(st.dealt / min), killsPerMin: +(st.kills / min).toFixed(2),
      kills: st.kills, eliteKills: st.eliteKills, potions: st.potions, dodges: st.dodges, evadingS: +st.evading.toFixed(1), touches: st.touches, stuck: st.stuck, hits: st.hits, maxHit: +st.maxHit.toFixed(3), lifeTaken: +st.takenN.toFixed(2),
      ...(job.trace ? { trace: st.trace } : {}), casts: st.casts, src: Object.fromEntries(Object.entries(st.src).sort((a, b) => b[1].life - a[1].life).slice(0, 14).map(([k, v]) => [k, { n: v.n, life: +v.life.toFixed(2) }])),
      ...(st.bossSrc ? { bossSrc: Object.fromEntries(Object.entries(st.bossSrc).sort((p, q) => q[1] - p[1]).slice(0, 15)) } : {}),
      ...(job.boss ? { killed: !!st.killed, killS: st.killed ? +st.ct.toFixed(1) : null, bossLvl: st.bossLvl, bossHp: st.bossHp, bossDmg: st.bossDmg, bossLeft: b && !b.dead ? +(b.hp / b.hpMax).toFixed(3) : 0, phases: st.phases, byPhase: st.byPhase.map((v) => +(v || 0).toFixed(3)) } : { route: st.route, packList: st.packs, packsDone: st.packs.length + (st.passed || 0), walk: !!job.walk, walkS: +(st.walkS || 0).toFixed(1), passed: st.passed || 0 })
    };
    B.st = null;
    return res;
  };
  return true;
}

// ---------------------------------------------------------------------------------------------------------------------
const jobs = jobsFromArgs();
const done = new Set();
// (a job whose page died under it is not done)
if (OUT && fs.existsSync(OUT)) for (const l of fs.readFileSync(OUT, 'utf8').split('\n')) { if (!l.trim()) continue; try { const r = JSON.parse(l); if (!String(r.err || '').startsWith('evaluate:')) done.add(r.id); } catch {} }
const todo = jobs.filter((j) => !done.has(j.id));
if (process.env.HEAT != null) for (const j of todo) j.heat ??= +process.env.HEAT;
console.error(`balance-act: ${todo.length} jobs (${jobs.length - todo.length} already done)`);
const cfg = { skill: +(process.env.SKILL || 0.6), react: +(process.env.REACT || 0.45), walk: +(process.env.WALK || 8), zoneMax: +(process.env.ZONEMAX || 1500), bossMax: +(process.env.BOSSMAX || 900), maxDeaths: +(process.env.MAXDEATHS || 12), realMax: +(process.env.REALMAX || 400) };
// a page for GROUP jobs (a job of another class makes a new hero in place)
const groups = [];
for (const j of todo) { const g = groups[groups.length - 1]; if (g && g.length < GROUP) g.push(j); else groups.push([j]); }
const launch = () => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
let browser = await launch();
try {
  const logs = [];
  const openPage = async (j0) => {
    // the browser itself gone (killed from outside, out of memory): a new one
    if (!browser.isConnected()) { console.error('  the browser died: a new one'); await browser.close().catch(() => {}); browser = await launch(); }
    const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
    page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') logs.push('console: ' + m.text().slice(0, 200)); });
    await page.goto(`${BASE}?auto=${j0.zone}&lvl=${j0.lvl}&cls=${j0.cls}&diff=${j0.diff}&sim=${SIM}&q=0&norender`);
    await page.waitForFunction(() => window.__ready && window.__G?.player, null, { timeout: 240000 });
    await page.evaluate(installBot, cfg);
    return page;
  };
  for (const grp of groups) {
    let page = await openPage(grp[0]).catch(async (e) => { console.error('  page failed: ' + e.message.slice(0, 120)); await browser.close().catch(() => {}); browser = await launch(); return openPage(grp[0]); });
    for (const job of grp) {
      const t0 = Date.now();
      let res;
      // a watchdog: what the page is doing when a job runs long
      const dog = setInterval(async () => {
        const w = await page.evaluate(() => { const G = window.__G, st = window.__bal.st, b = G.zone?.boss, pl = G.player; return { mode: G.mode, panel: G.panel, cine: !!G.cine, dialog: !document.querySelector('#dialog')?.hidden, t: st && +st.t.toFixed(1), ct: st && +st.ct.toFixed(1), fight: st?.fight, why: st?.why, boss: b && { kind: b.kind, hp: +(b.hp / b.hpMax).toFixed(3), awake: b.awake, hold: b.holdWake, hidden: b.hidden, d: +Math.hypot(b.x - pl.x, b.z - pl.z).toFixed(1) }, pl: pl && { x: +pl.x.toFixed(1), z: +pl.z.toFixed(1), dead: pl.dead, act: pl.act?.name }, err: window.__bal.err }; }).catch((e) => ({ e: e.message }));
        console.error('  watchdog', job.id, JSON.stringify(w));
      }, 60000);
      try {
        res = await page.evaluate((j) => window.__bal.run(j), job);
      } catch (e) { res = { ...job, ok: false, err: 'evaluate: ' + e.message.slice(0, 300) }; }
      clearInterval(dog);
      // the page died under the job (memory, a crash): a new page, and the job once more
      if (String(res.err || '').startsWith('evaluate:') && !job.retried) {
        console.error(`  ${job.id}: ${res.err.slice(0, 120)}; a new page`);
        await page.close().catch(() => {});
        page = await openPage(job).catch(async (e) => { console.error('  a new page failed: ' + e.message.slice(0, 120)); return openPage(grp[0]); });
        grp.splice(grp.indexOf(job) + 1, 0, { ...job, retried: true });
        continue;
      }
      res.wallS = Math.round((Date.now() - t0) / 1000);
      if (logs.length) { res.logs = logs.splice(0).slice(0, 6); }
      const line = JSON.stringify(res);
      if (OUT) fs.appendFileSync(OUT, line + '\n'); else console.log(line);
      console.error(`${job.id}: ${res.ok ? 'ok' : 'FAIL'} ${res.combatS}s deaths ${res.deaths} min ${res.minLife} life/min ${res.lifePerMin} kills/min ${res.killsPerMin}${job.boss ? ' kill ' + res.killS + 's left ' + res.bossLeft : ' packs ' + res.packsDone} (wall ${res.wallS}s)${res.err ? ' ERR ' + res.err.slice(0, 200) : ''}`);
    }
    await page.close();
  }
} finally { await browser.close(); }
