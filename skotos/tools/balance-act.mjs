// Simulated play, to measure how hard a zone or a boss is: a bot hero (to the nearest foe, attacks, skills on cooldown, out of
// red telegraphs, into blue safe circles, a potion under 35% life) with the gear a normal play-through would give fights a
// fixed route of packs (the N nearest the zone's start by walking distance) or a boss, and reports what it cost.
//
//   node tools/balance-act.mjs --zone ashfield --cls warden --lvl 23 --diff 1 --runs 3 [--packs 8] [--out f.jsonl]
//   node tools/balance-act.mjs --boss ivar --cls mage --lvl 23 --diff 0 --runs 5
//   node tools/balance-act.mjs --zone forest --cls warden --lvl 8 --coop 2 --runs 3   (co-op: a party of N such heroes, as one
//   bot: the world scaled as the host scales it for N (data.js COOP: life, packs, blows), the bot's damage x N (the party's)
//   and its life x N (the monsters' blows spread over N heroes); deaths and seconds are then the party's per hero)
//   node tools/balance-act.mjs --plan plan.json --out results.jsonl     (a list of jobs; jobs already in the output are skipped)
//   node tools/balance-act.mjs --zone coast --cls mage --lvl 34 --runs 2 / --boss skotos ... (Act V: the coast and the
//   Farthest Light with the story past their arrivals; the Walking Tower and the Skotos fought by their rules: an islet at
//   high water, the Tower's light, Selna remembered, the Farthest Light given its fire, a dark cairn lit in the Night)
//   node tools/balance-act.mjs --zone drained --cls warden --lvl 47 --runs 2 / --zone bottom / --boss ketos / --boss shade
//   (Act VI: both zones with the story past their arrivals, under the Carried Fire's rules: a foe out of light is Shrouded,
//   a Lampbearer first, out of a Falselight's tell, the coal lit again at a true lamp when it is Out; the Bottom's three
//   black lamps put out after its packs, then what they opened. The Ketos and the Shade by their own rules, as the
//   scenarios' bot plays them: the lanterns, the head and its stalk, the bells; the stones, the webs, the hanging ice, her
//   own shadow across the fire. job.lost: the seven named lamps of the Lost at the Hearth; job.lamp: the Lamplight
//   Mastery track's rank; job.darkStones: the Hearth's stones as she finds them, dark)
//   node tools/balance-act.mjs --zone thaw --cls ranger --lvl 50 --diff 1 --mlvl 4 --mast --runs 2 / --zone tarn / --boss
//   kallisto / --boss kelados [--dmgK 2]   (Act VII: each from its fixture, tools/fixtures7.mjs, with &nostory: the thaw with
//   the three weirs open (the Race at 0.3), the tarn after tarnSeen, Kallisto from weir3 at the Den, Kelados from keladosWake
//   at the Dam; a boss run ends at its rest (kallistoRest / keladosRest, bus 'bossRest'), never a death. The bot's Act VII
//   lessons: a white or blue lane is harm, the flue's cover in a lane with no way out, an armed sunlit chute kicked with a
//   loud skill on three foes (or a boss) in its lane, never her own lane, a Tremor's ring rolled through, Kallisto's charge
//   baited onto a stone, a lever pulled with Kelados in its channel, the arena hearth when it arms, an Icebound left in its
//   ice melted with the Cradle. Measures: under30S, worst3, heavy by move, byBand, slides, terrainKills)
//
// A job: { id, zone, boss, cls, lvl, diff, packs, seed, gearK, dmgK, mlvl, mast, skill, heat }. env BASE (default http://localhost:5199/), SIM (game
// steps per frame, default 8), SKILL (the bot's chance to notice a telegraph, default 0.6), REACT (seconds before it does, 0.45),
// HEAT (the Forge Heat of a forge zone run, 0-3, default 1; job.heat wins).
// The bot runs inside the game: it reads the frame's input from a getter on IN.events (takeEvents in updatePlayer), so it
// decides every fixed step, whatever the browser's frame rate. A death is counted, and the hero gets up where she fell.
// A page is reloaded after GROUP jobs (default 40) to keep memory down. --packs 99: every pack reachable from the start.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { fx7, flagsTo7, questAt7, ACT4 as FX_A4, ACT5 as FX_A5, ACT6 as FX_A6 } from './fixtures7.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const args = {};
for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i]; if (k.startsWith('--')) { const v = process.argv[i + 1]; if (v == null || v.startsWith('--')) args[k.slice(2)] = true; else { args[k.slice(2)] = v; i++; } } }
const BASE = process.env.BASE || 'http://localhost:5199/';
const SIM = +(process.env.SIM || 8);
const OUT = args.out || null;
const GROUP = +(process.env.GROUP || 40);

// the order the bosses fall in, where they live, and the story a normal hero has behind her when she meets them
export const BOSSES = ['weaver', 'barrowLord', 'stonewarden', 'moltenKing', 'silverhorn', 'amaranthe', 'ivar', 'karthax', 'tower', 'skotos', 'ketos', 'shade', 'kallisto', 'kelados'];
export const ZONES = { forest: 1, crypt: 4, pass: 10, halls: 13, weep: 16, heart: 19, ashfield: 22, forge: 25, coast: 28, farlight: 31, drained: 34, bottom: 37, thaw: 49, tarn: 49 };
export const BOSS_ZONE = { weaver: 'forest', barrowLord: 'crypt', stonewarden: 'pass', moltenKing: 'halls', silverhorn: 'weep', amaranthe: 'heart', ivar: 'ashfield', karthax: 'forge', tower: 'coast', skotos: 'farlight', ketos: 'drained', shade: 'bottom', kallisto: 'thaw', kelados: 'tarn' };
const ACT = { forest: 1, crypt: 1, pass: 2, halls: 2, weep: 3, heart: 3, ashfield: 4, forge: 4, coast: 5, farlight: 5, drained: 6, bottom: 6, thaw: 7, tarn: 7 };
// Act VII: each run's fixture (tools/fixtures7.mjs, the last flag of the chain it stands at). A zone run starts past its gates
// (the thaw with the three weirs open: the Race at 0.3, the whole zone in reach); a boss run at its own door
const A7UP = { thaw: 'weir3', tarn: 'tarnSeen', kallisto: 'weir3', kelados: 'keladosWake' };
const ACT7 = Object.fromEntries(Object.entries(A7UP).map(([k, up]) => [k, { up, quest: questAt7(up), flags: [...FX_A4, ...FX_A5, ...FX_A6, ...flagsTo7(up)] }]));

function jobsFromArgs() {
  if (args.plan) return JSON.parse(fs.readFileSync(args.plan, 'utf8'));
  const boss = args.boss || null, zone = boss ? BOSS_ZONE[boss] : args.zone || 'forest';
  const out = [];
  for (let r = +(args.r0 || 0); r < +(args.r0 || 0) + +(args.runs || 1); r++) out.push({ id: `${boss || zone}-${args.cls || 'warden'}-L${args.lvl || ZONES[zone] + 1}-d${args.diff ?? 1}${args.dmgK ? '-k' + args.dmgK : ''}${args.coop > 1 ? '-c' + args.coop : ''}${args.tag ? '-' + args.tag : ''}-r${r}`, zone, boss, cls: args.cls || 'warden', lvl: +(args.lvl || ZONES[zone] + 1), diff: +(args.diff ?? 1), packs: +(args.packs || 8), seed: 1000 + r * 7919, gearK: +(args.gearK || 4), ...(args.dmgK ? { dmgK: +args.dmgK } : {}), ...(args.mlvl ? { mlvl: +args.mlvl } : {}), ...(args.mast ? { mast: true } : {}), ...(args.trace ? { trace: +args.trace } : {}), ...(args.probe ? { probe: args.probe, trials: +(args.trials || 12) } : {}), ...(args.skill ? { skill: +args.skill } : {}), ...(args.heat != null ? { heat: +args.heat } : {}), ...(args.coop > 1 ? { coop: +args.coop } : {}) });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// the page side: installed once per page (a self-contained function, serialised by Playwright)
async function installBot(cfg) {
  const G = window.__G, D = window.__D, IN = D.IN;
  const [data, items, stats, world, actors, fx, bus, hud, light, forge, state, gfx] = await Promise.all(['/src/game/data.js', '/src/game/items.js', '/src/game/stats.js', '/src/game/world.js', '/src/game/actors.js', '/src/gfx/fx.js', '/src/ui/bus.js', '/src/ui/hud.js', '/src/game/light.js', '/src/game/forge.js', '/src/game/state.js', '/src/gfx/gfx.js'].map((p) => import(p)));
  const { CLASSES, SKILLS, SLOTS, MONSTERS } = data;
  const prog = await import('/src/game/progression.js');
  const B = window.__bal = { st: null, done: null, err: null, log: [] };
  const OWN = new Set([0xffb040, 0xffe0a0, 0xff6a20]);      // the hero's own telegraphs: leap, arrow rain, meteor (and their variants)
  const SAFE = 0x60c0ff;                                      // a blue safe circle (the Stonewarden's pulse, Ivar's nova, Karthax's dark)
  const angleTo = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);
  const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ACT7Z = new Set(['thaw', 'tarn']);

  // ---------- the hero a normal player brings ----------
  const PRIO = { warden: ['whirl', 'leap', 'quake', 'cry'], ranger: ['multi', 'pierce', 'rain', 'wolf'], mage: ['fireball', 'meteor', 'chain', 'nova'] };
  function skillRanks(cls, lvl) {
    const sk = {}; let pts = lvl - 1;
    for (const id of PRIO[cls]) { const def = SKILLS[cls].find((s) => s.id === id); if (lvl < def.lvl) continue; sk[id] = 1; }
    for (const id of PRIO[cls]) { if (!sk[id]) continue; while (pts > 0 && sk[id] < 5) { sk[id]++; pts--; } }
    return { sk, pts };
  }
  const BOSS_LV = { weaver: 3, barrowLord: 7, stonewarden: 12, moltenKing: 16, silverhorn: 18, amaranthe: 22, ivar: 24, karthax: 28, tower: 30, skotos: 33, ketos: 36, shade: 40, kallisto: 50, kelados: 50 };
  const BEFORE = { forest: [], crypt: ['weaver'], pass: ['weaver', 'barrowLord'], halls: ['weaver', 'barrowLord', 'stonewarden'], weep: ['weaver', 'barrowLord', 'stonewarden', 'moltenKing'], heart: ['weaver', 'barrowLord', 'stonewarden', 'moltenKing', 'silverhorn'], ashfield: ['weaver', 'barrowLord', 'stonewarden', 'moltenKing', 'silverhorn', 'amaranthe'], forge: ['weaver', 'barrowLord', 'stonewarden', 'moltenKing', 'silverhorn', 'amaranthe', 'ivar'], coast: ['weaver', 'barrowLord', 'stonewarden', 'moltenKing', 'silverhorn', 'amaranthe', 'ivar', 'karthax'], farlight: ['weaver', 'barrowLord', 'stonewarden', 'moltenKing', 'silverhorn', 'amaranthe', 'ivar', 'karthax', 'tower'] };
  BEFORE.drained = Object.keys(BOSS_LV).slice(0, 10); BEFORE.bottom = [...BEFORE.drained, 'ketos'];
  // (Act VII: the Shade beaten before the Meltwaters, Kallisto before the Hanging Lake: her Claw worn there and never before)
  BEFORE.thaw = [...BEFORE.bottom, 'shade']; BEFORE.tarn = [...BEFORE.thaw, 'kallisto'];
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
      // (a boss's own legendary, LEG_FROM, comes from that boss's first kill and from nowhere else: never worn before it)
      const own = Object.values(data.LEG_FROM || {}), pool = data.LEGENDARIES.filter((l) => (!l.cls || l.cls === cls) && !own.includes(l.id)), id = data.LEG_FROM?.[b] || pool[Math.floor(Math.random() * pool.length)].id;
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

  const A4END = Object.fromEntries(['after3', 'fireTaken', 'ivar', 'plug', 'karthax', 'crownUnmade', 'giftsTaken', 'newFire'].map((f) => [f, true]));
  const C5 = ['alkyone', 'coastCall', 'cradle', 'coal', 'alkField', 'coastSeen', 'hearth', 'rite', 'tamMet', 'glaukosMet'];
  const F5 = [...C5, 'light_grey', 'mem_i1', 'light_wreck', 'mem_i2', 'light_fall', 'mem_i3', 'towerWake', 'towerDown', 'frozen', 'farSeen', 'alkShip'];
  const ACT5 = { coast: { ...A4END, heat: 3, ...Object.fromEntries(C5.map((f) => [f, true])) }, farlight: { ...A4END, heat: 3, ...Object.fromEntries(F5.map((f) => [f, true])), lights5: ['grey', 'wreck', 'fall'] } };
  // Act VI: Act V done (Selna back, the sea lit, the child told); the Drained Sea past its arrival, Glaukos's teaching and
  // the first names (q34); the Bottom past the Ketos, its arrival and Glaukos at the Well's Foot (q36)
  const on = (l) => Object.fromEntries(l.map((f) => [f, true]));
  const E5 = [...F5, 'hole0', 'hole1', 'hole2', 'ternSeen', 'skotosWake', 'skotosDown', 'selnaBack', 'seaLit', 'mem_i4', 'carved', 'homeSeen', 'toldChild'];
  const D6 = ['tam6', 'call6', 'coal6', 'drainedSeen', 'teach6', 'names6'], B6 = [...D6, 'gates6', 'ketosWake', 'ketosDown', 'keyxLamp', 'bottomSeen', 'glaukosB6'];
  const ACT6 = { drained: { ...A4END, heat: 3, ...on(E5), lights5: ['grey', 'wreck', 'fall'], ...on(D6) }, bottom: { ...A4END, heat: 3, ...on(E5), lights5: ['grey', 'wreck', 'fall'], ...on(B6) } };
  const LOST6 = ['galini', 'twins', 'kranea', 'psamathe', 'sailor', 'asger', 'leif'];
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
    forge: { quest: 20, acts: 3, flags: { after3: true, fireTaken: true, ivar: true, bellows0: true, heat: 1, plug: true } },
    // Act V: Act IV done (the new fire burning); the coast past its rite (q26), the Farthest Light past the Icebound Ship
    // (q28): no arrival scene holds the clock
    coast: { quest: 26, acts: 4, flags: ACT5.coast },
    farlight: { quest: 28, acts: 4, flags: ACT5.farlight },
    drained: { quest: 34, acts: 5, flags: ACT6.drained },
    bottom: { quest: 36, acts: 5, flags: ACT6.bottom },
    // Act VII (the fixtures' flags, node side: tools/fixtures7.mjs): the thaw with the three weirs open, the tarn after its
    // arrival; Act VI done (h.act6), the act not (h.act7 -1)
    ...(cfg.act7 ? { thaw: { quest: cfg.act7.thaw.quest, acts: 6, flags: on(cfg.act7.thaw.flags) }, tarn: { quest: cfg.act7.tarn.quest, acts: 6, flags: on(cfg.act7.tarn.flags) } } : {})
  };
  const BFLAGS = {
    tower: { quest: 27, flags: { light_grey: true, mem_i1: true, light_wreck: true, mem_i2: true, light_fall: true, mem_i3: true, lights5: ['grey', 'wreck', 'fall'], towerWake: true } },
    skotos: { quest: 29, flags: { hole0: true, hole1: true, hole2: true, ternSeen: true } },
    // (the Ketos: the Gates' word heard, the three wreck lanterns lit, as its scenario; the Shade: the three black lamps out)
    ketos: { quest: 35, flags: { gates6: true, wreck6: [0, 1, 2] } },
    shade: { quest: 37, flags: { blackLamp0: true, blackLamp1: true, blackLamp2: true, keyxFreed: true } },
    ivar: { quest: 19, flags: { ...Object.fromEntries(['l1', 'l2', 'l3', 'l4', 'l5'].flatMap((id) => [['lamp_' + id, true], ['mem_' + id, true]])), ivar: false, ivarDown: false } },
    karthax: { quest: 21, flags: { bellows0: true, bellows1: true, bellows2: true, heat: 3, plug: true, gifts: { throne: 'refused', forge: 'refused', unfading: 'refused' } } },
    // (Act VII: Kallisto from weir3 at the Den, Kelados from keladosWake at the Dam: the fixtures' chains)
    ...(cfg.act7 ? { kallisto: { quest: cfg.act7.kallisto.quest, flags: on(cfg.act7.kallisto.flags) }, kelados: { quest: cfg.act7.kelados.quest, flags: on(cfg.act7.kelados.flags) } } : {})
  };
  const BOONS = ['ember', 'forge', 'amber', 'lantern', 'einar', 'bearer'];

  async function setupHero(job) {
    let h = G.hero;
    if (h.cls !== job.cls) {
      const nh = state.newHero(job.cls, job.diff);
      if (G.player?.avatar) { G.player.avatar.group.parent?.remove(G.player.avatar.group); }
      G.hero = h = nh; G.player = null;
    }
    const zf = ZFLAGS[job.zone], bf = job.boss ? BFLAGS[job.boss] : null;
    h.diff = job.diff; h.level = job.lvl; h.xp = 0;
    // (run C's knob: what the bot deals, scaled; the heavy blows' tally starts clean)
    G.debugDmgK = job.dmgK || 0; G.tally7 = {};
    const R = skillRanks(h.cls, h.level); h.skills = R.sk; h.points = R.pts;
    // the progression (progression.js): job.mast spends what is left on Might and Vigor in turn (the most raw power a
    // spare point can buy); job.variant {skill: 1|2} plays those variants; job.loadout the four on the buttons
    h.mast = {}; h.vars = {}; h.variant = {}; h.mlvl = job.mlvl || 0; h.points += h.mlvl;
    h.loadout = job.loadout ? job.loadout.slice() : null;
    for (const id in job.variant || {}) { h.vars[id] = 3; h.variant[id] = job.variant[id]; if (h.points > 0) h.points--; }
    if (job.lamp) h.mast.lamp = job.lamp;
    if (job.mast) { let k = 0; while (h.points > 0) { const id = k++ % 2 ? 'vigor' : 'might'; h.mast[id] = (h.mast[id] || 0) + 1; h.points--; } }
    h.quest = bf?.quest ?? zf.quest;
    h.flags = Object.assign({ tickHint: true, helpSeen: true }, zf.flags, bf?.flags || {});
    if (job.zone === 'forge' && !job.boss && job.heat != null) h.flags.heat = job.heat;
    for (const k in h.flags) if (Array.isArray(h.flags[k])) h.flags[k] = h.flags[k].slice();
    if (job.lost) h.flags.lost6 = LOST6.slice(0, job.lost === true ? 7 : job.lost);
    for (let a = 1; a <= 6; a++) { h['act' + a] = a <= zf.acts ? 1 : -1; if (a <= zf.acts) h.flags['act' + a] = true; }
    h.act7 = -1; G.selnaBack = false; G.shadeRetry = null;
    // (no Names in runs A-C: none said, so none of their rules runs; no lookout's rank)
    if (zf.acts >= 6) { h.names = { learnt: (h.names?.learnt || []).slice(), said: [null, null, null], deep: [], slots: 1, free: 0 }; h.fires = []; h.rest = 0; }
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
    const breath = G.zone.seal?.tele;
    for (const t of fx.FX.teles) {
      if (!t.alive || t.t > t.dur + 0.05) continue;
      // (a seal's Black Breath is not harm to step out of: the seal rule stands in it to shield the lamp)
      if (t === breath) continue;
      const m = t.m, u = m.material.uniforms, col = u.uColor.value.getHex(), shape = u.uShape.value;
      if (OWN.has(col)) continue;
      let s = seen.get(t);
      // (Act VII: a chute she kicked herself she knows of; any other lane, white or blue, is noticed as a red one is)
      if (s == null) { const f0 = flueT.get(t); s = (f0 && f0.by === pl && pl) || Math.random() < st.skill; seen.set(t, !!s); }
      if (!s || t.t < st.react) continue;
      const x = m.position.x, z = m.position.z, rot = m.rotation.y - Math.PI, left = t.dur - t.t;
      // (the Forge's blue cover marks are safe from the Breath only, and the bot knows its cover already: inFlue's line of sight)
      if (shape < 0.5) { if (col === SAFE) { if (!fl.some((f) => f.cover?.some((c) => Math.abs(c.x - x) + Math.abs(c.z - z) < 0.05))) blue.push({ x, z, r: m.scale.x }); } else red.push({ k: 0, x, z, r: m.scale.x, left }); }
      else if (shape < 1.5) red.push({ k: 1, x, z, rot, range: m.scale.x, arc: u.uArc.value, left });
      else { const f = flueT.get(t); red.push({ k: 2, x, z, rot, len: m.scale.z * 2, w: m.scale.x * 2, left, flue: f }); }
    }
    // standing fire and the like (the foe's): walked out of, not rolled out of
    for (const a of G.areas) if ((a.team === 'foe' || a.team === 'all') && a.dmg > 0 && a.t < a.dur) red.push({ k: 0, x: a.x, z: a.z, r: a.r, left: 99, soft: true });
    // (Act VI: a Falselight's tell, its pool's rim gone sea-green for 0.8 s before the snap: noticed as a telegraph is)
    if (light.lightKind?.() === 'under') for (const q of light.lightPools()) {
      const o = q.owner; if (!q.fake || !o || o.dead) continue;
      if (o.l6 !== 'tell') { o.__bn = null; continue; }
      if (o.__bn == null) o.__bn = Math.random() < st.skill;
      if (o.__bn && (o.atkT6 || 0) >= Math.min(st.react, 0.4)) red.push({ k: 0, x: q.x, z: q.z, r: q.r, left: Math.max(0, (o.def.lure?.tell ?? 0.8) - (o.atkT6 || 0)) });
    }
    // (Act V: thin ice webbed to its last stage before a break, which she can see, is stepped off the same way: noticed as
    // a telegraph is, a cell at a time, again every 3 s)
    const I = G.zone.ice, L = G.zone.L;
    if (I && L?.ice && pl) { const cx = Math.floor(pl.x), cz = Math.floor(pl.z), ep = Math.floor(st.t / 3); for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const ix = cx + dx, iz = cz + dz; if (ix < 0 || iz < 0 || ix >= L.w || iz >= L.h) continue; const i = iz * L.w + ix; if (L.ice[i] && I.stage[i] === 3 && ((((i * 31 + ep) * 2654435761) >>> 0) / 4294967296) < st.skill) red.push({ k: 0, x: ix + 0.5, z: iz + 0.5, r: 0.75, left: 99, soft: true }); } }
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
    // (Act VII: a warned lane's cover, the blue circles the flue shows her: a spot behind something solid the slide cannot see)
    for (const r of T.red) if (r.flue?.cover?.length && inRed(r, pl.x, pl.z)) for (const c of r.flue.cover) {
      const d = Math.hypot(c.x - pl.x, c.z - pl.z);
      if (d < bd && d < 14 && map.walkable(c.x, c.z) && map.clear(pl.x, pl.z, c.x, c.z) && !danger(T, c.x, c.z)) { bd = d; best = { x: c.x, z: c.z, cover: r.flue }; }
    }
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
  // (and below the ice, Act VI: every unlit foe out of light)
  function shrouded(a) { return (a.def.shroud || a.shrouded || (a.def.unlit && light.lightKind?.() === 'under')) && !(a.unshroud > 0) && !(a.revealed > 0) && (light.shroudOn || light.lightOn)() && !light.lightAt(a.x, a.z); }
  // which foe: the boss's nodes or singers first when the boss cannot be hurt; then the nearest by the way there
  function pickTarget(st, pl) {
    const map = G.zone.map, b = G.zone.boss;
    let pool = G.actors.filter((a) => live(a) && (a.aggro || a.dormant || st.mode === 'boss' || (st.pack && a.packId === st.pack.id)) && Math.hypot(a.x - pl.x, a.z - pl.z) < 40);
    if (st.mode === 'pack') pool = pool.filter((a) => a.aggro || a.packId === st.pack?.id);
    if (b && !b.dead && b.mourners && b.ward > 0) { const m = b.mourners.filter((x) => live(x) && attackable(x)); if (m.length) pool = m; }
    // (the Skotos: its Hands and its Coil while it is warded, under the ice or out of reach)
    if (b && !b.dead && b.kind === 'skotos') { const m = G.actors.filter((x) => (x.kind === 'skotosHand' || x.kind === 'skotosCoil') && live(x) && attackable(x)); if (m.length && (b.ward > 0 || b.under || b.hidden || m.some((x) => x.kind === 'skotosCoil'))) pool = m; else pool = pool.filter((x) => x === b || Math.hypot(x.x - pl.x, x.z - pl.z) < 6); }
    pool = pool.filter((a) => !(st.skip.get(a) > st.t));
    let best = null, bs = 1e9, bestA = null, bsA = 1e9;
    for (const a of pool) {
      let d = Math.hypot(a.x - pl.x, a.z - pl.z) - a.radius;
      if (!map.los(pl.x, pl.z, a.x, a.z)) d += 6;
      if (a === st.target) d -= 2;
      if (a.def.drinker) d -= 3;      // (a Lampbearer first: its Drink takes her ring)
      if (attackable(a)) { if (d < bsA) { bsA = d; bestA = a; } }
      else if (d < bs) { bs = d; best = a; }
    }
    return bestA || best;
  }
  // (button i holds the loadout's skill: progression.js; cooldowns are kept by the skill's place in SKILLS)
  function ready(pl, i) { const sk = prog.slotSkill(i); return sk && G.hero.level >= (sk.lvl || 0) && pl.cds[SKILLS[G.hero.cls].indexOf(sk)] <= 0 && pl.res >= (sk.cost || 0); }
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
  // ---------- Act VII: the chutes (forge.js loud: a loud thing kicks every armed chute in sun whose horn-stone lies within
  // its reach, data.js LOUD, or whose lane it happened in; a cornice in shade only creaks) ----------
  const LOUDSK = { warden: [['quake', 'aim'], ['leap', 'land'], ['cry', 'self']], ranger: [['rain', 'aim']], mage: [['meteor', 'aim']] };
  const SELF = new Set(['cry', 'bulwark', 'dawn']);
  const snowF = () => (forge.flues() || []).filter((f) => f.kind === 'snow');
  const cornShade = (f) => { const z = G.zone, L = z.L, i = Math.floor(f.z) * L.w + Math.floor(f.x); return !!(L.shade && L.shade[i]) || !!z.cloudAt?.(f.x, f.z); };
  const kickable = (f) => f.kind === 'snow' && f.armed && f.st === 'idle' && !cornShade(f);
  // the chutes a loud thing at (x, z) with a reach of r would bring down
  const lanesAt = (x, z, r) => snowF().filter((f) => kickable(f) && ((f.horn && Math.hypot(f.horn.x - x, f.horn.z - z) <= r) || forge.inFlue(f, x, z, 0)));
  function slotOf(id) { for (let i = 1; i <= 4; i++) if (prog.slotSkill(i)?.id === id) return i; return 0; }
  // where a skill on button i aimed at (ax, az) makes its noise (skills.js resolveAim: the aim held to the skill's range), and
  // where she is then (a leap lands her there)
  function noiseAt(pl, i, ax, az) {
    const sk = prog.slotSkill(i), r = sk && data.LOUD?.[sk.id]; if (!r) return null;
    if (SELF.has(sk.id)) return { x: pl.x, z: pl.z, r, me: pl };
    const range = sk.range || CLASSES[G.hero.cls].range, d = Math.hypot(ax - pl.x, az - pl.z), k = d > range ? range / d : 1, x = pl.x + (ax - pl.x) * k, z = pl.z + (az - pl.z) * k;
    return { x, z, r, me: sk.id === 'leap' ? { x, z } : pl };
  }
  // would it bring a slide down on her? (the lesson: no loud skill from inside an armed lane unless a dodge is ready)
  function ownKick(pl, i, ax, az) {
    const n = noiseAt(pl, i, ax, az); if (!n) return false;
    return lanesAt(n.x, n.z, n.r).some((f) => forge.inFlue(f, pl.x, pl.z, 1.2) || forge.inFlue(f, n.me.x, n.me.z, 1.2));
  }
  // three foes or more (a boss counts for three) in an armed, sunlit lane and she out of every lane it would bring down: the
  // loudest ready skill at its horn-stone, or (out of range) at the lane itself
  function tryKick(st, pl, cls) {
    const fl = snowF(); if (!fl.length) return false;
    for (const f of fl) {
      if (!kickable(f) || forge.inFlue(f, pl.x, pl.z, 1.5)) continue;
      let n = 0; for (const a of G.actors) if (live(a) && !a.airborne && !a.def?.float && !a.under && !(a.dazed > 0) && forge.inFlue(f, a.x, a.z, a.radius * 0.5)) n += a.boss ? 3 : 1;
      if (n < 3) continue;
      for (const [id, how] of LOUDSK[cls] || []) {
        const i = slotOf(id); if (!i || !ready(pl, i)) continue;
        const sk = prog.slotSkill(i), r = data.LOUD[id], range = (sk.range || 99) - 0.3;
        const ux = Math.sin(f.dir), uz = Math.cos(f.dir), pts = [];
        if (how === 'self') { if (f.horn && Math.hypot(f.horn.x - pl.x, f.horn.z - pl.z) <= r - 0.3) pts.push({ x: pl.x, z: pl.z }); }
        else { if (f.horn) pts.push({ x: f.horn.x, z: f.horn.z }); for (let u = 0.3; u <= 0.95; u += 0.1) pts.push({ x: f.x + ux * f.len * u, z: f.z + uz * f.len * u }); }
        for (const p of pts) {
          if (how !== 'self' && Math.hypot(p.x - pl.x, p.z - pl.z) > range) continue;
          if (how === 'land' && !G.zone.map.walkable(p.x, p.z)) continue;
          const hit = lanesAt(p.x, p.z, r); if (!hit.includes(f)) continue;
          const me = how === 'land' ? p : pl;
          if (hit.some((g) => forge.inFlue(g, pl.x, pl.z, 1.2) || forge.inFlue(g, me.x, me.z, 1.2))) continue;
          push({ t: 'skill', i, aim: { x: p.x, z: p.z } }); st.casts[i] = (st.casts[i] || 0) + 1; st.kickTry = (st.kickTry || 0) + 1;
          return true;
        }
      }
    }
    return false;
  }
  // ---------- Act VII: Kelados's Tremor ring (ai.js ring7: from r 4 to r 14 at 9 m/s, 1.2 m thick, once its 1.2 s slam is
  // over). It is no fx telegraph, so it is read from the heavy moves' log (window.__act7.HEAVY7) the moment it starts, noticed
  // as a telegraph is; a player rolls or blinks through it as it comes (a rock or a block between stops it: map.los) ----------
  const A7 = () => window.__act7;
  function rings7(st, pl) {
    const A = A7(); if (!A) return null;
    const H = A.HEAVY7, b = G.zone.boss;
    let i = H.length - 1; while (i >= 0 && H[i] !== st.h7last) i--;
    for (let j = i + 1; j < H.length; j++) { const h = H[j]; if (h.kind === 'kelados' && h.move === 'tremor' && b?.kind === 'kelados') (st.rings ||= []).push({ x: b.x, z: b.z, t0: A.now(), seen: Math.random() < st.skill }); }
    st.h7last = H[H.length - 1];
    if (!st.rings?.length) return null;
    const now = A.now(); st.rings = st.rings.filter((g) => now - g.t0 < 10 / 9 + 0.1);
    for (const g of st.rings) {
      const r = 4 + 9 * (now - g.t0), d = Math.hypot(pl.x - g.x, pl.z - g.z);
      if (!g.seen || d < r - 0.6 || d > 14.6 || !G.zone.map.los(g.x, g.z, pl.x, pl.z)) continue;
      if ((d - 0.6 - r) / 9 < 0.1) return g;
    }
    return null;
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
      st.trace.push({ t: +st.t.toFixed(1), hp: +(pl.hp / pl.hpMax).toFixed(2), act: pl.act?.name || '', why: st.why, x: +pl.x.toFixed(1), z: +pl.z.toFixed(1), tg: tg ? tg.kind + ':' + +Math.hypot(tg.x - pl.x, tg.z - pl.z).toFixed(1) + (attackable(tg) ? '' : '!') : '-', b: b ? +(b.hp / b.hpMax).toFixed(3) + (b.hidden ? 'h' : '') + (b.invuln > 0 ? 'i' : '') + (b.ward > 0 ? 'w' : '') + (b.cages ? ' c' + b.cages.filter((q) => !q.dead).map((q) => q.blows + '@' + Math.round(Math.hypot(q.x - pl.x, q.z - pl.z))).join(',') + ' m' + b.misses : '') + (b.dark ? ' dark' : '') + (shrouded(b) ? ' sh' : '') : '-', res: Math.round(pl.res), n: G.actors.filter((a) => live(a)).length, ...(tg && ACT7Z.has(G.zone.id) && !tg.boss ? { ts: (tg.under ? 'U' : '') + (tg.dormant ? 'D' : '') + (tg.airborne ? 'A' : '') + ':' + (tg.state || '') + ':' + (+(tg.edgeT || 0)).toFixed(1) + ':' + (tg.surfaceT == null ? '-' : (+tg.surfaceT).toFixed(1)) + ':' + (tg.aggro ? 'ag' : '') + ':' + (A7()?.snow7?.(pl.x, pl.z) ? 'snow' : 'bare') + ':' + (A7()?.snow7?.(tg.x, tg.z) ? 'snow' : 'bare'), tp: [+tg.x.toFixed(1), +tg.z.toFixed(1)] } : {}), ...(b && ACT7Z.has(G.zone.id) ? { bp: [+b.x.toFixed(1), +b.z.toFixed(1)], bs: (b.status?.stun > 0 ? 'stun' : '') + (b.dazed > 0 ? 'daze' : '') + (b.rooted ? 'root' : '') + (b.move ? 'mv' : ''), fl: (forge.flues() || []).filter((f) => f.st !== 'idle').map((f) => f.kind[0] + f.id + f.st[0]).join(',') } : {}) });
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
    // (Act VII's measures: seconds under 30% of her life; the largest share lost in any 3 s, from the blows' own log)
    if (st.counting && pl.hp / pl.hpMax < 0.3) st.under30 = (st.under30 || 0) + dt;
    if (st.step) { st.step(st, pl, dt); if (st.over) return; }
    // between packs (the walk to the next one) she still steps out of the red, the Breath's included, and does nothing else
    if (st.fight && st.counting) st.ct += dt;

    const T = teles(), cls = G.hero.cls, C = CLASSES[cls];
    const busy = pl.act && pl.act.name !== 'basic' && pl.act.name !== 'whirl';
    // a potion under 35%
    if (pl.hp < pl.hpMax * 0.35 && pl.potionCd <= 0) { push({ t: 'potion' }); st.potions++; }
    // an Ember Tick on her back: roll it off
    if (pl.cling?.length && pl.dodgeCd <= 0 && (st.clingT = (st.clingT || 0) + dt) > 0.4) { st.clingT = 0; const a = rnd(0, 6.28); IN.mx = Math.sin(a); IN.mz = Math.cos(a); push({ t: 'dodge' }); st.dodges++; return; }
    // (Act VII: a Tremor's ring about to cross her, in the open: a roll or a blink through it, toward him)
    const ring = st.mode === 'boss' && G.zone.boss?.kind === 'kelados' ? rings7(st, pl) : null;
    if (ring && pl.dodgeCd <= 0 && !(pl.iframes > 0) && pl.act?.name !== 'leap') { const a = angleTo(pl.x, pl.z, ring.x, ring.z); IN.mx = Math.sin(a); IN.mz = Math.cos(a); push({ t: 'dodge' }); st.dodges++; st.ringDodges = (st.ringDodges || 0) + 1; ring.seen = false; st.why = 'ring'; return; }
    // out of the red
    let dz = danger(T, pl.x, pl.z);
    if (dz && st.lamp6 && pl.act?.name === 'touch') dz = null;      // (a black lamp's Flare is taken, not fled: the channel is 2 s)
    if (dz && dz.soft && pl.hp > pl.hpMax * 0.5 && st.target && live(st.target) && attackable(st.target) && Math.hypot(st.target.x - pl.x, st.target.z - pl.z) - st.target.radius < (cls === 'warden' ? 2.6 : C.range - 1)) dz = null;
    if (dz) {
      const e = escape(T, pl);
      if (e) {
        if (e.cover && st.coverOf !== e.cover.tele) { st.coverOf = e.cover.tele; st.covers = (st.covers || 0) + 1; }
        const dist = Math.hypot(e.x - pl.x, e.z - pl.z), walk = dist / Math.max(1, pl.speed) + (busy || pl.act?.name === 'basic' ? 0.25 : 0);
        moveTo(st, pl, e.x, e.z);
        if (!dz.soft && walk > dz.left - 0.08 && pl.dodgeCd <= 0 && pl.act?.name !== 'leap') { push({ t: 'dodge' }); st.dodges++; }
        st.evading += dt; st.why = 'evade' + (dz.soft ? 'S' : '');
        return;
      }
    }
    if (!st.fight) { st.why = 'idle'; return; }
    if (busy) { st.why = 'busy'; return; }
    // (Act VII: a chute with three foes or a boss in its lane, and she out of it, kicked with a loud skill)
    if (!pl.act && (st.kickT = (st.kickT || 0) - dt) <= 0) { st.kickT = 0.2; if (tryKick(st, pl, cls)) { st.why = 'kick'; IN.mx = IN.mz = 0; return; } }
    // the fight's own rules
    const b = G.zone.boss;
    let goal = null, a6 = false;
    st.own = false;
    // Act VI, the Ketos (the scenario bot's rules, as the hints say them): by a lit lantern, in its pool, when the line comes
    // (a dark one lit first); its head on the shore struck, the lure stalk's segments first; never waiting in the lure's
    // false pool; blind, a bell rung beside a lit lantern; a Ketling at her side fought; a ranged hero shoots the body half
    // out on the mud between the windows
    if (b && !b.dead && b.kind === 'ketos' && G.zone.act6?.mere) {
      const z = G.zone, K = z.act6.mere, H = K.head, M = z.L.spots.mere, rng = cls !== 'warden', dl = (q) => Math.hypot(q.x - pl.x, q.z - pl.z), byD = (p, q) => dl(p) - dl(q);
      a6 = true;
      const stalk = (K.stalks || []).filter((q) => !q.dead && !q.removed).sort(byD)[0];
      const ketl = G.actors.filter((x) => x !== b && x.kind !== 'ketosHead' && x.kind !== 'ketosStalk' && live(x) && attackable(x) && dl(x) < 7).sort(byD)[0];
      st.own = true; st.target = H ? stalk || H.h : ketl || (rng && !b.diving && b.phase === 1 ? b : null); st.retarget = 0.4;
      if (!H) {
        const lamps = K.lamps || [], lit = lamps.filter((q) => q.lit).sort(byD), dark = lamps.filter((q) => !q.lit).sort(byD);
        const spotBy = (it) => { const g = Math.atan2(it.x - M.x, it.z - M.z); return z.map.nearestFloor(it.x + Math.sin(g) * 2.0, it.z + Math.cos(g) * 2.0, 2); };
        const touch = (it) => { if (dl(it) < 2) { if (!pl.act) { it.use(); st.touches++; } return true; } goal = { x: it.x, z: it.z, near: 1.6, fight: !!ketl, fightIn: 99 }; return false; };
        if (b.phase === 2) {
          const bl = (K.bells || []).filter((q) => lamps[q.lamp]?.lit).sort(byD)[0];
          if (bl) { if (dl(bl) > 1.5) goal = { x: bl.x, z: bl.z, near: 1.5, fight: true, fightIn: 99 }; else if (!pl.act && !(bl.rungT > b.t - 10) && !K.bell) { bl.use(); st.touches++; } }
          else if (dark[0] && touch(dark[0])) return;
        } else if (!lit.length && dark[0]) { if (touch(dark[0])) return; }
        else if (lit[0]) { const q = spotBy(lit[0]); if (dl(q) > 1.0) goal = { x: q.x, z: q.z, near: 1.0, fight: true, fightIn: 99 }; if (dark[0] && dl(dark[0]) < 2.2 && !pl.act) { dark[0].use(); st.touches++; } }
        const Lr = K.lure; if (Lr && dl(Lr) < Lr.r + 0.5) { const g = Math.atan2(pl.x - Lr.x, pl.z - Lr.z); goal = { x: Lr.x + Math.sin(g) * (Lr.r + 1.5), z: Lr.z + Math.cos(g) * (Lr.r + 1.5), near: 0.4 }; }
      } else if (rng && st.target && dl(st.target) < 11) goal = { x: pl.x, z: pl.z, near: 1, fight: true };
    }
    // Act VI, the Shade (the scenario bot's rules): the fight inside a lit stone's pool, a dark stone lit when none burns; a
    // web on a stone near her cut; the troll baited under the hanging ice; her own shadow brought into a lit stone's light,
    // across the fire from it at 5.5 m; nothing struck in a turn
    if (b && !b.dead && b.def?.form && G.zone.act6?.shade) {
      const z = G.zone, S6 = z.act6.shade, Hh = z.L.spots.hearth, C = Hh.fire, form = b.def.form, rng = cls !== 'warden', dl = (q) => Math.hypot(q.x - pl.x, q.z - pl.z), byD = (p, q) => dl(p) - dl(q), db = dl(b);
      a6 = true;
      const stones = S6.stones || [], lit = stones.filter((q) => q.lit && !q.web).sort(byD), dark = stones.filter((q) => !q.lit && !q.web).sort(byD);
      const web = stones.filter((q) => q.web && !q.web.dead && !q.web.removed).sort(byD)[0];
      const touch = (it) => { if (dl(it) < 2.0) { if (!pl.act) { it.use(); st.touches++; } return true; } goal = { x: it.x, z: it.z, near: 1.6 }; return false; };
      if (b.turning > 0) { st.own = true; st.target = null; }
      else if (form === 4) {
        const far = lit.slice().sort((p, q) => dl(q) - dl(p))[0];
        if (!far) { if (dark[0] && touch(dark[0])) return; }
        else { const dx = C.x - far.x, dz = C.z - far.z, l = Math.hypot(dx, dz) || 1, q = z.map.nearestFloor(C.x + dx / l * 5.5, C.z + dz / l * 5.5, 2); if (dl(q) > 1.2 && !(b.holdT > 0 && !rng)) goal = { x: q.x, z: q.z, near: 1.2, fight: true, fightIn: 99 }; }
      } else {
        if (web && dl(web) < 7 && (form === 2 || db > 5)) { st.own = true; st.target = web.web; st.retarget = 0.4; }
        else if (!lit.length && dark[0] && db > 6) { if (touch(dark[0])) return; }
        else if (form === 3) { const v = (z.L.spots.vaults || []).filter((q) => Math.hypot(q.x - Hh.x, q.z - Hh.z) < 13).sort(byD)[0]; if (v && dl(v) > 1.5) goal = { x: v.x, z: v.z, near: 1.5, fight: true, fightIn: 99 }; }
        else if (lit[0] && dl(lit[0]) > 2.6 && (rng || Math.hypot(b.x - lit[0].x, b.z - lit[0].z) > 7)) goal = { x: lit[0].x, z: lit[0].z, near: 2.6, fight: true, fightIn: 99 };
        if (dark[0] && dl(dark[0]) < 2.2 && !pl.act && db > 5) { dark[0].use(); st.touches++; }
      }
    }
    // Act VII, the arena hearth flares (bus 'boss7Window': Kallisto's last phase, Kelados's first kneel): to it, and the Call
    // made (fires7.js 'callFire'); no hearth there yet is counted, not waited for
    if (!goal && b && !b.dead && st.hearthArm && !st.called) {
      const H = G.zone.L.spots.hearth, it = H && G.zone.interact.find((q) => q.kind === 'callFire' && Math.hypot(q.x - H.x, q.z - H.z) < 4);
      if (!it) { st.hearthMissing = true; st.called = true; }
      else if (Math.hypot(it.x - pl.x, it.z - pl.z) < (it.r || 2.4) - 0.3) { if (!pl.act) { it.use(); st.calls = (st.calls || 0) + 1; st.called = true; } IN.mx = IN.mz = 0; st.why = 'call'; return; }
      else goal = { x: it.x, z: it.z, near: (it.r || 2.4) - 0.5 };
    }
    // Act VII, Kelados: a lever that can be pulled (bare, not pulled this fight, its phase come) whose channel he stands in: to
    // it, 1 s at it (a blow that reaches her life breaks it, as the contract's channel does), then pulled (world.js lever7)
    if (!goal && b && !b.dead && b.kind === 'kelados' && b.awake && G.zone.act7?.levers) {
      const fl = forge.flues() || [], ok = (it) => !it.used && !b.levers?.has(it.k) && (it.k === 1 || (it.k === 2 && b.phase >= 1) || (it.k === 3 && b.phase >= 2));
      let pick = null, pd = 1e9;
      for (const it of G.zone.act7.levers) {
        if (!ok(it)) continue;
        const f = fl[it.spot?.channel ?? it.channel]; if (!f || f.st !== 'idle' || !forge.inFlue(f, b.x, b.z, b.radius * 0.5)) continue;
        const d = Math.hypot(it.x - pl.x, it.z - pl.z); if (d < pd) { pd = d; pick = it; }
      }
      if (pick) {
        const s = pick.spot?.stand || pick;
        if (Math.hypot(pick.x - pl.x, pick.z - pl.z) < (pick.r || 2.2) - 0.2) {
          if (st.leverOf !== pick) { st.leverOf = pick; st.leverT = 0; }
          if (!pl.act || pl.act.name === 'basic') { st.leverT += dt; IN.mx = IN.mz = 0; st.why = 'lever'; if (st.leverT >= 1) { pick.use(); st.levers = (st.levers || 0) + 1; st.leverOf = null; } return; }
        } else { st.leverOf = null; goal = { x: s.x, z: s.z, near: 0.6 }; }
      } else st.leverOf = null;
    }
    // Act VII, Kallisto (the bait): her charge nearly ready and she 6.5 m off or more, she stands with a boulder of the bowl (or
    // a rock of hers) 3.3 m behind her on the charge's line; the line's own telegraph moves her out of it (the red escape)
    // (nearer than 5 m she wheels away 9 m first and charges the moment she is there: the bait is read from where she wheels to)
    const wheel7 = b?.kind === 'kallisto' && b.wheel > 0 && b.wheelTo;
    if (!goal && b && !b.dead && b.kind === 'kallisto' && b.awake && ((b.mcd?.charge ?? 0) <= 2.5 || wheel7 || b.queue?.[0] === 'charge') && (!b.move || wheel7) && !b.dash && !(b.dazed > 0) && (!b.queue?.length || b.queue[0] === 'charge')) {
      const z = G.zone, map = z.map, c = z.L.boss, A = A7(), bx = wheel7 ? b.wheelTo.x : b.x, bz = wheel7 ? b.wheelTo.z : b.z;
      const stones = [...(z.L.spots.boulders || []).filter((q) => q.den || Math.hypot(q.x - c.x, q.z - c.z) < c.r + 2), ...((A?.ROCKS7 || []).filter((r) => r.zone === z && r.t > 3))];
      let best = null, bs = 1e9;
      for (const s of stones) {
        const dx = bx - s.x, dz2 = bz - s.z, l = Math.hypot(dx, dz2) || 1, ux = dx / l, uz = dz2 / l, dp = l - 3.3;
        if (dp < 6.5 || dp > 17) continue;
        const p = { x: s.x + ux * 3.3, z: s.z + uz * 3.3 }, pre = { x: s.x + ux * 1.5, z: s.z + uz * 1.5 };
        if (!map.walkable(p.x, p.z) || !map.clear(bx, bz, pre.x, pre.z) || danger(T, p.x, p.z)) continue;
        const sc = Math.hypot(p.x - pl.x, p.z - pl.z) + (map.clear(pl.x, pl.z, p.x, p.z) ? 0 : 5);
        if (sc < bs && sc < 12) { bs = sc; best = p; }
      }
      if (best) { goal = { x: best.x, z: best.z, near: 0.7, fight: true, fightIn: 1.0 }; st.baitS = (st.baitS || 0) + dt; }
    }
    // Act VI, a black lamp of the Bottom: put out by a channel from the Cradle once no foe stands at her side
    if (!goal && st.lamp6) {
      const it = st.lamp6, add = G.actors.some((x) => live(x) && attackable(x) && x.aggro && Math.hypot(x.x - pl.x, x.z - pl.z) < 6 + x.radius);
      if (!add) { if (Math.hypot(it.x - pl.x, it.z - pl.z) < 2.2) { if (!pl.act) { it.use(); st.touches++; } return; } goal = { x: it.x, z: it.z, near: 1.8 }; }
    }
    // Act VI, the Carried Fire Out: to the nearest true lamp's light (a second in it lights the coal again), fighting there
    if (!goal && light.fireOn?.() && light.FIRE.state === 'out') {
      st.outS = (st.outS || 0) + dt;
      const q = light.lightPools().filter((o) => o.lamp && !o.fake && o.r > 1.5 && Math.hypot(o.x - pl.x, o.z - pl.z) < 30).sort((o, u) => Math.hypot(o.x - pl.x, o.z - pl.z) - Math.hypot(u.x - pl.x, u.z - pl.z))[0];
      if (q) goal = { x: q.x, z: q.z, near: Math.max(0.8, q.r * 0.5), fight: true, fightIn: 99 };
    }
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
    // Act V: the Walking Tower (an islet while the tide is in, its light on its flank when it is an Island), the Skotos
    // (Selna's Remember, the Farthest Light given its fire, a dark cairn lit in the Night)
    // a Breathing-hole's seal: its dark lamps lit while no foe stands at her side, else what came out of it fought
    if (!goal && st.sealHole) {
      const ho = st.sealHole, S = G.zone.seal, dark = (G.zone.act5?.lamps || []).filter((l) => l.hole === ho.id && !l.lit).sort((p, q) => Math.hypot(p.x - pl.x, p.z - pl.z) - Math.hypot(q.x - pl.x, q.z - pl.z));
      // the Black Breath on a lamp (noticed as a telegraph is, after her reaction): between the hole and the lamp, to shield it
      if (S?.tele && S.target && S.ho === ho) {
        let s0 = seen.get(S.tele); if (s0 == null) { s0 = Math.random() < st.skill; seen.set(S.tele, s0); }
        if (s0 && S.tele && (1.2 - S.teleT) >= st.react) { const it = S.target, dl = Math.hypot(it.x - ho.x, it.z - ho.z) || 1; goal = { x: it.x + (ho.x - it.x) / dl * 0.7, z: it.z + (ho.z - it.z) / dl * 0.7, near: 0.4 }; moveTo(st, pl, goal.x, goal.z); st.why = 'shield'; st.shields = (st.shields || 0) + (st.lastShield === S.tele ? 0 : 1); st.lastShield = S.tele; return; }
      }
      const add = G.actors.some((x) => live(x) && attackable(x) && Math.hypot(x.x - pl.x, x.z - pl.z) < 4 + x.radius);
      if (dark.length && !add) { const it = dark[0]; if (Math.hypot(it.x - pl.x, it.z - pl.z) < 1.8) { if (!pl.act) { it.use(); st.touches++; } return; } goal = { x: it.x, z: it.z, near: 1.4 }; }
    }
    if (!goal && b && !b.dead && b.kind === 'tower') {
      const T = b.tide, L = G.zone.L;
      if (b.st === 'island' && b.lightIt && !b.lit) { const it = b.lightIt; if (Math.hypot(it.x - pl.x, it.z - pl.z) < 2.2) { if (!pl.act) { it.use(); st.touches++; } return; } goal = { x: it.x, z: it.z, near: 1.6 }; }
      else if (b.phase === 0 && T && T.st !== 'low' && !(b.dazed > 0)) { const isl = L.spots.bayIslets.slice().sort((p, q) => Math.hypot(p.x - pl.x, p.z - pl.z) - Math.hypot(q.x - pl.x, q.z - pl.z))[0]; if (isl) goal = { x: isl.x, z: isl.z, near: 1.4, fight: true }; }
    }
    if (!goal && b && !b.dead && b.kind === 'skotos') {
      const z = G.zone, A = z.act5;
      if (z.remember) { const it = z.remember; if (Math.hypot(it.x - pl.x, it.z - pl.z) < 1.8) { if (!pl.act && (!b.nb || b.nb.st === 'down' || b.nb.st === 'up')) { it.use(); st.touches++; } return; } goal = { x: it.x, z: it.z + 1.0, near: 1.2 }; }
      else if (z.giving && A?.farIt) { const it = A.farIt; if (Math.hypot(it.x - pl.x, it.z - pl.z) < 2.0) { if (!pl.act) { it.use(); st.touches++; } return; } goal = { x: it.x, z: it.z + 0.8, near: 1.2 }; }
      else if (b.phase === 1 && (b.under || b.hidden)) { const cr = (A?.cairns || []).filter((q) => !q.lit).sort((p, q) => Math.hypot(p.x - pl.x, p.z - pl.z) - Math.hypot(q.x - pl.x, q.z - pl.z))[0]; if (cr) { if (Math.hypot(cr.x - pl.x, cr.z - pl.z) < 2.2) { if (!pl.act) { cr.use(); st.touches++; } return; } goal = { x: cr.x, z: cr.z + 1.4, near: 1.6 }; } }
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
    if (!goal && !a6 && b && !b.dead && b.awake && shrouded(b)) {
      // a Shrouded boss takes full damage only in light: wait for it in the nearest pool
      const pools = light.lightPools().filter((p) => p.r > 1.5).sort((p, q) => Math.hypot(p.x - b.x, p.z - b.z) - Math.hypot(q.x - b.x, q.z - b.z));
      if (pools.length) { const p = pools[0], to = G.zone.map.nearestFloor(p.x + (b.x - p.x) * 0.25, p.z + (b.z - p.z) * 0.25, 3); goal = { x: to.x, z: to.z, near: Math.max(1, p.r * 0.45), fight: true }; }
    }
    // the target
    if (!st.own && (!st.target || !live(st.target) || st.retarget <= 0)) { st.target = pickTarget(st, pl); st.retarget = 0.4; }
    st.retarget -= dt;
    const tg = st.target;
    // Act VII, the Icebound: a pack still in its blue ice (statues woken by sun, a blow, fire or the Cradle, never by her
    // walking near): 6 s beside it for the sun to do it, then the Cradle held to the block (world.js iceMelt7, 1.5 s)
    if (!goal && tg && tg.icebound && tg.dormant && !tg.dead) {
      if (Math.hypot(tg.x - pl.x, tg.z - pl.z) < 5) st.ibT = (st.ibT || 0) + dt;
      const it = st.ibT > 6 && (G.zone.interact.find((q) => q.kind === 'iceMelt7' && q.a === tg && !q.used) || G.zone.interact.find((q) => q.kind === 'iceMelt7' && !q.used && q.a?.packId != null && q.a.packId === tg.packId));
      if (it) {
        st.why = 'melt';
        if (Math.hypot(it.x - pl.x, it.z - pl.z) < it.r - 0.4) { if (!pl.act) { it.use(); st.melts = (st.melts || 0) + 1; } IN.mx = IN.mz = 0; return; }
        moveTo(st, pl, it.x, it.z); unstick(st, pl, dt); return;
      }
    } else if (!tg?.icebound) st.ibT = 0;
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
    let i = chooseSkill(cls, pl, tg, d);
    // (Act VII: a loud skill that would bring a slide down on her is held back, unless a dodge is ready to take her out of it)
    if (i && pl.dodgeCd > 0 && ownKick(pl, i, tg.x, tg.z)) { i = 0; st.heldLoud = (st.heldLoud || 0) + 1; }
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
    { const W = (st.w3 ||= []); W.push([st.t, frac]); while (W.length && st.t - W[0][0] > 3) W.shift(); let sum = 0; for (const e of W) sum += e[1]; st.worst3 = Math.max(st.worst3 || 0, sum); }
    st.lastHurt = frac; st.lastHurtT = st.t;
    if (frac >= 0.04 && st.leverOf) st.leverT = 0;
    // (Act VII: a heavy blow is the one whose move the game's tally just counted, combat.js hurtHero; where she stood from
    // the boss: within its reach, beyond 8 m, or between)
    { const T7 = G.tally7 || {}, was = st.t7 || {}; let mv = null; for (const k in T7) if ((T7[k] || 0) > (was[k] || 0)) mv = k; st.t7 = { ...T7 };
      if (mv) { const bb = G.zone.boss; let band = null; if (bb && st.mode === 'boss' && !bb.dead) { const d = Math.hypot(bb.x - pl.x, bb.z - pl.z) - (bb.radius || 0); band = d <= (bb.def?.reach || 3) + 0.6 ? 'reach' : d > 8 ? 'far' : 'mid'; } (st.heavyLog ||= []).push([mv, +frac.toFixed(3), band]); } }
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
  bus.on('lampSnuffed', (it) => { const st = B.st; if (st?.sealHole && it?.hole === st.sealHole.id) st.sealLost = (st.sealLost || 0) + 1; });
  bus.on('kill', (a) => { const st = B.st; if (st?.counting && a.team === 'foe') { st.kills++; if (a.elite) st.eliteKills++; if (a.__slid7 != null && st.t - a.__slid7 <= 6) st.slideAssist = (st.slideAssist || 0) + 1; } });
  // (Act VII: a foe a slide struck and left standing, Dazed 1.5 s and open at x1.5: forge.js bury's 'dazeFoe'; dying within
  // 6 s of it, its death is counted as owed to the slide too)
  bus.on('dazeFoe', (a) => { const st = B.st; if (st?.counting && a && a.team === 'foe') a.__slid7 = st.t; });
  // a death: counted, and she gets up where she fell a second later (game time: updatePlayer does not run for the dead, so
  // the bot's own tick cannot do it)
  const revive = () => { const pl = G.player; if (!pl || !pl.dead || !B.st) return; pl.dead = false; pl.hp = pl.hpMax; pl.status = actors.freshStatus(); pl.act = null; pl.iframes = 2.5; pl.res = G.hero.cls === 'warden' ? 0 : G.stats.resMax; D.emit('heroLook'); B.st.deadT = 0; };
  bus.on('heroDeath', () => { const st = B.st; if (!st) return; if (st.counting) { st.deaths++; st.deathAt.push(+st.t.toFixed(1)); } st.diedAt = performance.now(); G.timers.push({ t: 1.0, fn: revive }); });
  bus.on('shadeForm', (a, f) => { const st = B.st; if (st?.counting) st.phases.push(['f' + f, +st.ct.toFixed(1)]); });
  bus.on('shadeReset', () => { const st = B.st; if (st) st.resets = (st.resets || 0) + 1; });
  bus.on('bossPhase', (a, ph) => { const st = B.st; if (st?.counting && a === G.zone.boss) st.phases.push([ph, +st.ct.toFixed(1)]); });
  // Act VII: the slides (forge.js: a chute's warning begins with 'flueInhale', its by the one who kicked or called it; a
  // slide or a sluice's water that reached her, 'flueHit'), the rests, the arena hearth's flare
  bus.on('flueInhale', (f) => { const st = B.st; if (!st?.counting || !f?.kind) return; const S = st.sl; if (f.kind === 'water') { S.sluices++; return; } if (f.by && f.by === G.player) S.her++; else if (f.by?.boss) S.boss++; else if (f.by && f.by.team === 'foe') S.foes++; else S.other++; });
  bus.on('flueHit', (f) => { const st = B.st; if (!st?.counting || !f?.kind) return; const S = st.sl, got = st.lastHurtT === st.t ? st.lastHurt || 0 : 0; if (f.kind === 'snow') { S.taken++; S.takenLife += got; } else { S.washed++; S.washLife += got; } });
  bus.on('bossRest', (kind) => { const st = B.st; if (st && st.mode === 'boss') st.rested = kind; });
  bus.on('boss7Window', () => { const st = B.st; if (st && st.mode === 'boss') st.hearthArm = true; });

  // keep the game moving: dialogs advanced, the death panel and any other panel closed
  setInterval(() => {
    if (!B.st || B.st.over) return;
    if (hud.dialogOpen()) D.emit('key', 'enter');
    if (G.panel) D.closePanel();
    if (G.player?.dead && performance.now() - (B.st.diedAt || 0) > 2500) revive();
  }, 120);

  // ---------- Act VII's lesson probes (job.probe; a zone with its packs gone, the bot fighting): each trial sets one scene
  // and lets the bot play it out ----------
  //   lane  she is put 40-75% down an armed chute's lane and the chute is run by nobody (fireFlue): was she struck, did she
  //         take the flue's cover, where did she end (job.skill 1: every telegraph noticed)
  //   kick  three goblins Stunned 30 s in an armed, sunlit lane, she 4-8 m from its horn-stone and out of every lane, her
  //         skills ready: did she kick it with a loud skill, and what did the slide do to them
  async function probe7(job, st, z) {
    const pl = G.player, map = z.map, R0 = window.__R || gfx.R;
    z.bossSpawned = true; for (const p of z.packs) p.spawned = true;
    const clearFoes = () => { for (const a of G.actors.slice()) if (a.team === 'foe' && !a.dead && !a.removed && !a.prop && !a.npc) { if (a.tele) a.tele.alive = false; a.remove?.(); } };
    clearFoes(); st.counting = true; st.fight = true;
    const gwait = (s) => new Promise((ok) => { const t0 = st.t, w0 = performance.now(); const iv = setInterval(() => { if (st.t - t0 >= s || performance.now() - w0 > s * 4000 + 20000) { clearInterval(iv); ok(); } }, 20); });
    const snow = (forge.flues() || []).filter((f) => f.kind === 'snow'), trials = [];
    const anyLane = (x, zz, pad) => snow.some((g) => forge.inFlue(g, x, zz, pad));
    for (let k = 0; k < (job.trials || 12); k++) {
      const pool = job.probe === 'kick' ? snow.filter((f) => f.horn && kickable(f)) : snow.filter((f) => f.st === 'idle');
      const f = pool[k % Math.max(1, pool.length)]; if (!f) { trials.push({ k, err: 'no lane' }); await gwait(2); continue; }
      const ux = Math.sin(f.dir), uz = Math.cos(f.dir), pts = [];
      for (let u = 0.3; u <= 0.85; u += 0.05) for (const v of [0, -1, 1]) { const x = f.x + ux * f.len * u - uz * v, zz = f.z + uz * f.len * u + ux * v; if (map.walkable(x, zz) && forge.inFlue(f, x, zz, 0)) pts.push({ x, z: zz, u }); }
      pl.hp = pl.hpMax; pl.cds = pl.cds.map(() => 0); pl.res = G.stats.resMax; pl.dodgeCd = 0; pl.act = null; pl.kx = pl.kz = 0; st.target = null;
      const s0 = { ...st.sl }, c0 = st.covers || 0, T0 = { ...forge.TALLY7 }, k0 = st.kickTry || 0;
      if (job.probe === 'lane') {
        const lp = pts.filter((p) => p.u >= 0.4 && p.u <= 0.75); const p = lp[Math.floor(Math.random() * lp.length)];
        if (!p) { trials.push({ k, f: f.i, err: 'no floor in the lane' }); continue; }
        pl.x = p.x; pl.z = p.z; f.armed = true; await gwait(0.3);
        forge.fireFlue(f.i, null); await gwait(4.4);
        trials.push({ k, f: f.i, area: f.area, u: +p.u.toFixed(2), struck: st.sl.taken - s0.taken, cover: (st.covers || 0) - c0, endInLane: forge.inFlue(f, pl.x, pl.z, 0), moved: +Math.hypot(pl.x - p.x, pl.z - p.z).toFixed(1) });
      } else if (job.probe === 'kick') {
        if (pts.length < 3) { trials.push({ k, f: f.i, err: 'lane too short' }); continue; }
        let at = null;
        for (const r of [4, 5, 6, 7, 8]) { for (let i = 0; i < 24 && !at; i++) { const g = (i / 24) * 6.283, x = f.horn.x + Math.sin(g) * r, zz = f.horn.z + Math.cos(g) * r; if (map.walkable(x, zz) && !anyLane(x, zz, 1.6)) at = { x, z: zz }; } if (at) break; }
        if (!at) { trials.push({ k, f: f.i, err: 'nowhere to stand' }); continue; }
        const gob = [];
        for (const q of [pts[Math.floor(pts.length * 0.2)], pts[Math.floor(pts.length * 0.5)], pts[Math.floor(pts.length * 0.8)]]) {
          const a = D.spawnMonster('goblin', q.x, q.z, { level: G.hero.level }); z.actors.push(a); if (a.avatar) R0.scene.add(a.avatar.group);
          a.status.stun = 30; a.aggro = false; gob.push({ a, hp0: a.hp, x0: a.x, z0: a.z });
        }
        pl.x = at.x; pl.z = at.z; await gwait(6);
        trials.push({ k, f: f.i, area: f.area, tries: (st.kickTry || 0) - k0, byHer: st.sl.her - s0.her, struck: gob.filter((g) => g.a.dead || g.a.hp < g.hp0 * 0.8).length, carried: (forge.TALLY7.carried || 0) - (T0.carried || 0), kills: (forge.TALLY7.kills || 0) - (T0.kills || 0), onHer: st.sl.taken - s0.taken, horn: +Math.hypot(at.x - f.horn.x, at.z - f.horn.z).toFixed(1) });
        clearFoes();
      }
      await gwait(0.5);
    }
    const good = trials.filter((t) => !t.err);
    B.st = null;
    return { ...job, ok: true, err: B.err, probe: job.probe, skill: st.skill, trials, sum: job.probe === 'lane' ? { n: good.length, struck: good.filter((t) => t.struck).length, cover: good.filter((t) => t.cover).length, endInLane: good.filter((t) => t.endInLane).length } : { n: good.length, kicked: good.filter((t) => t.byHer).length, struck3: good.filter((t) => t.struck === 3).length, onHer: good.filter((t) => t.onHer).length } };
  }

  // ---------- a job ----------
  // co-op (job.coop): the world scaled for the party; the bot carries the party's damage and the share of the blows
  const NS = await import('/src/net/state.js');
  if (!B.coopTrap) {
    B.coopTrap = true; let sv = G.stats;
    Object.defineProperty(G, 'stats', { configurable: true, get: () => sv, set: (v) => { sv = v; const n = B.coopN || 1; if (v && n > 1) { v.dmgMult *= n; v.lifeMax = Math.round(v.lifeMax * n); } } });
  }
  B.run = async (job) => {
    B.done = null; B.err = null; B.st = null;
    B.coopN = job.coop || 1; NS.NET.mode = B.coopN > 1 ? 'host' : null; NS.NET.n = B.coopN;
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
      hero: { lvl: G.hero.level, life: G.stats.lifeMax, armor: G.stats.armor, red: +G.stats.red.toFixed(3), dps: Math.round(G.stats.dps), block: G.stats.block },
      // (Act VII's books: slides kicked by her, by foes, by a boss, by the story; sluices; slides and wash-outs that reached her)
      sl: { her: 0, foes: 0, boss: 0, other: 0, sluices: 0, taken: 0, takenLife: 0, washed: 0, washLife: 0 }, t7: {},
      T70: { ...forge.TALLY7 }, LOG0: { ...(A7()?.AI_LOG || {}) }, h7last: A7()?.HEAVY7?.[A7().HEAVY7.length - 1] ?? null
    };
    lastStamp = -1;
    if (light.FIRE_LOG) Object.assign(light.FIRE_LOG, { drains: {}, fills: 0, relit: 0, outs: 0, dims: 0, min: Infinity });
    const map = z.map, L = z.L;
    if (job.probe) return probe7(job, st, z);
    if (!job.boss) {
      z.bossSpawned = true;
      const d = bfs(map, L.start.x, L.start.z), w = map.w;
      const reach = z.packs.map((p) => { const f = map.nearestFloor(p.x, p.z, 5); return { p, d: d[Math.floor(f.z) * w + Math.floor(f.x)] }; }).filter((q) => q.d >= 0).sort((a, b) => a.d - b.d);
      const route = reach.slice(0, job.packs).map((q) => q.p);
      st.route = route.map((p) => ({ tag: p.tag, n: p.n, elite: p.elite || null, d: reach.find((q) => q.p === p).d }));
      if (job.walk) walkZone(st, z, map, route);
      // the Farthest Light (Act V): what lies past a Breathing-hole is reached only once it is sealed, so the route is the
      // packs within reach, then the next hole's seal (its three lamps lit, what comes out of it fought, a dark lamp lit
      // again; Alkyone holds one after a minute), then the packs it opened, and so on (job.noSeal: the packs in reach only)
      const seals = job.zone === 'farlight' && !job.walk && !job.noSeal ? L.spots.holes.slice().sort((p, q) => p.id - q.id) : null;
      if (seals) {
        const seen = new Set(route);
        route.extend = () => {
          const dd = bfs(map, L.start.x, L.start.z), more = z.packs.filter((p) => !seen.has(p)).map((p) => { const f = map.nearestFloor(p.x, p.z, 5); return { p, d: dd[Math.floor(f.z) * w + Math.floor(f.x)] }; }).filter((q) => q.d >= 0).sort((a, b) => a.d - b.d).map((q) => q.p);
          for (const p of more) { seen.add(p); route.push(p); st.route.push({ tag: p.tag, n: p.n, elite: p.elite || null }); }
          return more.length;
        };
      }
      // the Bottom (Act VI): after its packs, the three black lamps in turn (the barrow's, the wood's, Keyx's: a channel from
      // the Cradle, its Black Flare taken), then what their shadow-walls kept (job.noSeal: the packs only)
      const lamps6 = job.zone === 'bottom' && !job.walk && !job.noSeal ? z.interact.filter((it) => it.kind === 'blackLamp' || it.kind === 'keyxGive').sort((p, q) => p.k - q.k) : null;
      // (what the lamps opened: the packs of the build no way led to before them; never a pack the black water raised later)
      const seen6 = new Set(reach.map((q) => q.p)), packs0 = z.packs.slice();
      let i = -1, wait = 0;
      const next = () => {
        i++;
        if (light.fireOn?.() && light.FIRE.state === 'out') light.fireRelight();      // (the walk between packs passes a true fire)
        if (i >= route.length && lamps6) {
          const it = lamps6.find((q) => !G.hero.flags['blackLamp' + q.k]);
          if (it) {
            const at = map.nearestFloor(it.x, it.z + 3, 3);
            pl.x = at.x; pl.z = at.z; pl.kx = pl.kz = 0;
            st.lamp6 = it; st.pack = { tag: 'lamp' + it.k, n: 0, id: 'lamp6', spawned: true }; st.packT = 0; st.packStart = { ct: st.ct, taken: st.takenN, dealt: st.dealt, deaths: st.deaths, kills: st.kills, min: 1 }; st.fight = true; st.target = null;
            i--; return;
          }
          const dd = bfs(map, L.start.x, L.start.z);
          for (const p of packs0) { if (seen6.has(p)) continue; const f = map.nearestFloor(p.x, p.z, 5); if (dd[Math.floor(f.z) * w + Math.floor(f.x)] < 0) continue; seen6.add(p); route.push(p); st.route.push({ tag: p.tag, n: p.n, elite: p.elite || null }); }
        }
        if (i >= route.length && seals) {
          route.extend();
          const ho = i >= route.length && seals.find((h) => !G.hero.flags['hole' + h.id]);
          if (ho) {
            const p0 = ho.lamps[0], at = map.nearestFloor(p0.x + (p0.x - ho.x) * 0.3, p0.z + (p0.z - ho.z) * 0.3, 3);
            pl.x = at.x; pl.z = at.z; pl.kx = pl.kz = 0;
            st.sealHole = ho; st.sealLost = 0; st.pack = { tag: 'seal' + ho.id, n: 0, id: 'seal', spawned: true }; st.packT = 0; st.packStart = { ct: st.ct, taken: st.takenN, dealt: st.dealt, deaths: st.deaths, kills: st.kills, min: 1 }; st.fight = true; st.target = null;
            i--; return;
          }
        }
        if (i >= route.length) { st.over = true; return; }
        const p = route[i];
        let at = backFrom(map, d, p.x, p.z, 9) || map.nearestFloor(p.x, p.z + 7);
        // (Act VII: a pack camped in an armed chute's lane, the weir 2 rule, is come at from beside the lane's horn-stone, out
        // of every lane, 8 m or more from it: where a player who reads the chute stands to kick it)
        if (ACT7Z.has(job.zone)) {
          const fl = snowF(), f = fl.find((g) => (p.lane != null && g.id === p.lane) || forge.inFlue(g, p.x, p.z, 1));
          if (f?.horn && f.armed) {
            let best = null, bd = 1e9;
            for (const r of [3, 4, 5, 6, 7]) for (let k = 0; k < 24; k++) {
              const g = (k / 24) * 6.283, x = f.horn.x + Math.sin(g) * r, zz = f.horn.z + Math.cos(g) * r;
              if (!map.walkable(x, zz) || fl.some((q) => forge.inFlue(q, x, zz, 1.6)) || d[Math.floor(zz) * w + Math.floor(x)] < 0) continue;
              const dp = Math.hypot(x - p.x, zz - p.z); if (dp < 8) continue;
              const sc = r + Math.abs(dp - 11) * 0.3; if (sc < bd) { bd = sc; best = { x, z: zz }; }
            }
            if (best) { at = best; st.hornWay = (st.hornWay || 0) + 1; }
          }
        }
        pl.x = at.x; pl.z = at.z; pl.kx = pl.kz = 0;
        st.pack = p; st.packT = 0; st.packStart = { ct: st.ct, taken: st.takenN, dealt: st.dealt, deaths: st.deaths, kills: st.kills, min: 1 }; st.fight = true; st.target = null;
      };
      st.counting = true;
      if (!job.walk) st.step = (st, pl, dt) => {
        // (the walk to the next pack: not begun, and not gone on with, while a woken foe is at her; she fights it. Idle, a
        // Gate-Fallen risen from its bones beside her, or a crew woken from the kelp, struck her the whole wait)
        if (wait > 0) {
          const foe = G.actors.some((a) => live(a) && a.aggro && !a.boss && Math.hypot(a.x - pl.x, a.z - pl.z) < 14);
          if (foe) { st.fight = true; st.between = (st.between || 0) + dt; if (st.between < 120) return; }
          st.fight = false; wait -= dt; if (wait <= 0) { st.between = 0; next(); } return;
        }
        if (i < 0) { next(); return; }
        st.packT += dt;
        // a black lamp: done when it is out (or after 3 minutes)
        if (st.lamp6) {
          const it = st.lamp6, out = !!G.hero.flags['blackLamp' + it.k];
          if (out || st.packT > 180) {
            const s = st.packStart;
            st.packs.push({ tag: 'lamp' + it.k, n: 0, elite: null, t: +st.packT.toFixed(1), life: +(st.takenN - s.taken).toFixed(2), deaths: st.deaths - s.deaths, kills: st.kills - s.kills, timeout: !out });
            if (!out) { G.hero.flags['blackLamp' + it.k] = true; world.act6Presence?.(z); }
            st.lamp6 = null; st.fight = false; wait = cfg.walk; IN.mx = IN.mz = 0;
          }
          if (st.t > cfg.zoneMax) st.over = true;
          return;
        }
        // a seal: done when the hole is (or after 5 minutes)
        if (st.sealHole) {
          const ho = st.sealHole;
          if (G.hero.flags['hole' + ho.id] || st.packT > 300) {
            const s = st.packStart;
            st.packs.push({ tag: 'seal' + ho.id, n: 0, elite: null, t: +st.packT.toFixed(1), life: +(st.takenN - s.taken).toFixed(2), deaths: st.deaths - s.deaths, kills: st.kills - s.kills, timeout: st.packT > 300, lost: st.sealLost || 0 });
            if (st.packT > 300) G.hero.flags['hole' + ho.id] = true;
            st.sealHole = null; st.fight = false; wait = cfg.walk; IN.mx = IN.mz = 0;
          }
          if (st.t > cfg.zoneMax) st.over = true;
          return;
        }
        const p = st.pack, mine = G.actors.filter((a) => a.packId === p.id && live(a));
        const near = G.actors.some((a) => live(a) && a.aggro && Math.hypot(a.x - pl.x, a.z - pl.z) < 22);
        if ((p.spawned && !mine.length && !near) || st.packT > 150) {
          const s = st.packStart;
          st.packs.push({ tag: p.tag, n: p.n, elite: p.elite || null, t: +st.packT.toFixed(1), life: +(st.takenN - s.taken).toFixed(2), deaths: st.deaths - s.deaths, kills: st.kills - s.kills, timeout: st.packT > 150 });
          st.fight = false; wait = cfg.walk; IN.mx = IN.mz = 0;
          if (i + 1 >= route.length && !seals && !lamps6) { st.over = true; }
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
      // Act VI (as the scenarios set them): the Ketos with the three wreck lanterns lit, she by the first; the Shade with the
      // Hearth's stones lit (job.darkStones: as she finds them), she by the first stone
      if (job.boss === 'ketos' && z.act6?.mere) { const K = z.act6.mere, H = L.spots.heap; for (const it of K.lamps) world.light6(z, it, true); const l0 = K.lamps.find((q) => q.i === 0) || K.lamps[0], g = Math.atan2(l0.x - H.x, l0.z - H.z); at = map.nearestFloor(l0.x + Math.sin(g) * 2, l0.z + Math.cos(g) * 2, 3); }
      if (job.boss === 'shade' && z.act6?.shade) { const S = z.act6.shade, H = L.spots.hearth; if (!job.darkStones) for (const it of S.stones) world.light6(z, it, true); const s0 = S.stones[0], g = Math.atan2(s0.x - H.x, s0.z - H.z); at = map.nearestFloor(s0.x + Math.sin(g) * 1.8, s0.z + Math.cos(g) * 1.8, 3); }
      // Act VII: until the world places the two itself (world.js act7Zone has no z.bossSpot for them yet), each is put down
      // the way its scenario does it (tools/scenario7.mjs setupBoss7.spawn): at L.spots.arena / L.spots.seat, level
      // max(40 + 2 / 43 + 3, hero + 1)
      if ((job.boss === 'kallisto' || job.boss === 'kelados') && !z.bossSpot) {
        const S = L.spots[job.boss === 'kallisto' ? 'arena' : 'seat'], p = map.nearestFloor(S.x, S.z, 4);
        const k = D.spawnMonster(job.boss, p.x, p.z, { level: Math.max(job.boss === 'kallisto' ? 42 : 46, G.hero.level + 1) });
        k.rot = Math.PI; z.actors.push(k); if (k.avatar) (window.__R || gfx.R).scene.add(k.avatar.group);
        z.boss = k; z.bossSpawned = true; st.spawn7 = 'scenario';
      }
      pl.x = at.x; pl.z = at.z;
      st.fight = true;
      if (!z.bossSpot && !st.spawn7) B.err = 'no boss spot (story flags?)';
      st.step = (st, pl, dt) => {
        const b = z.boss;
        if (st.t > cfg.bossMax + 120) st.over = true;
        if (!b) { if (st.t > 60) { B.err = 'the boss never came'; st.over = true; } return; }
        if (!st.counting && b.awake) { st.counting = true; st.bossLvl = b.level; st.bossHp = Math.round(b.hpMax); st.bossDmg = +b.dmg.toFixed(1); if (st.job.hpTrace) traceHp(st, b); }
        // (Act VII's two are not killed: the run ends at the rest, the flag or the bus's 'bossRest')
        if (b.dead || st.rested || (b.def?.spare && G.hero.flags[b.kind + 'Rest'])) { st.killed = true; st.over = true; }
        // (what holds the boss from its own AI: a fear runs flee() in its place, ai.js; a freeze; a stun)
        if (st.counting) { if (b.status?.fear > 0) st.bossFearS = (st.bossFearS || 0) + dt; if (b.status?.freeze > 0) st.bossFreezeS = (st.bossFreezeS || 0) + dt; if (b.status?.stun > 0) st.bossStunS = (st.bossStunS || 0) + dt; }
        if (st.ct > cfg.bossMax || st.deaths >= cfg.maxDeaths) st.over = true;
        // the Skotos waits under the ice edge until the Farthest Light is touched (story.js: it rises in a scene)
        if (st.job.boss === 'skotos' && !st.rose && G.mode === 'play' && G.zone.act5?.farIt) { st.rose = true; G.zone.act5.farIt.use(); }
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
    // Act VII's measures (the contract's new six): heavy blows landed by move and by range band; slides kicked by her, by
    // foes, by a boss, taken; the share of the monsters' deaths owed to a slide or a sluice (forge.js TALLY7 kills); the
    // lessons used; the AI's own tally for the act's kinds (ai.js AI_LOG)
    let r7 = {};
    if (ACT7Z.has(job.zone)) {
      const hv = st.heavyLog || [], T1 = forge.TALLY7, T0 = st.T70, LOG = A7()?.AI_LOG || {}, L0 = st.LOG0;
      const byBand = {}, heavyBy = {};
      for (const [mv, f, band] of hv) { const e = heavyBy[mv] ||= { n: 0, min: 1, max: 0 }; e.n++; e.min = Math.min(e.min, f); e.max = Math.max(e.max, f); if (band) { const q = byBand[band] ||= { n: 0, life: 0 }; q.n++; q.life = +(q.life + f).toFixed(3); } }
      const kills7 = (T1.kills || 0) - (T0.kills || 0), re = job.boss ? new RegExp('^' + job.boss + ':') : /^(hillWolf|goblinMarksman|chough|denBear|snowWorm|rockRoller|rockScorpion|goblin|goblinShaman):/;
      const ai7 = {}; for (const k in LOG) if (re.test(k) && (LOG[k] || 0) > (L0[k] || 0)) ai7[k] = LOG[k] - (L0[k] || 0);
      let brook = 0; for (const k in st.src) if (/@tide:/.test(k)) brook += st.src[k].life;
      r7 = { heavyN: hv.length, heavyLife: +hv.reduce((s, h) => s + h[1], 0).toFixed(3), heavyBy, byBand,
        slides: { ...st.sl, takenLife: +st.sl.takenLife.toFixed(3), washLife: +st.sl.washLife.toFixed(3), kills: kills7, carried: (T1.carried || 0) - (T0.carried || 0), creaks: (T1.creaks || 0) - (T0.creaks || 0), brookLife: +brook.toFixed(3) },
        terrainKills: st.kills ? +(kills7 / st.kills).toFixed(3) : 0, terrainOwed: st.kills ? +((kills7 + (st.slideAssist || 0)) / st.kills).toFixed(3) : 0, slideAssist: st.slideAssist || 0,
        lessons: { kicks: st.kickTry || 0, hornWay: st.hornWay || 0, heldLoud: st.heldLoud || 0, covers: st.covers || 0, ringDodges: st.ringDodges || 0, baitS: +(st.baitS || 0).toFixed(1), levers: st.levers || 0, calls: st.calls || 0, hearthMissing: !!st.hearthMissing, melts: st.melts || 0 },
        ai7, ...(st.spawn7 ? { spawn7: st.spawn7 } : {}), ...(job.boss ? { bossHeld: { fearS: +(st.bossFearS || 0).toFixed(1), freezeS: +(st.bossFreezeS || 0).toFixed(1), stunS: +(st.bossStunS || 0).toFixed(1) } } : {}) };
    }
    const res = {
      ...job, ok: !B.err && (job.boss ? !!st.killed : true), err: B.err, realS: Math.round((performance.now() - w0) / 1000),
      hero: st.hero, endLvl: G.hero.level, gear: st.gear, legs: st.legs,
      combatS: +st.ct.toFixed(1), totalS: +st.t.toFixed(1), deaths: st.deaths, deathAt: st.deathAt, minLife: +st.minHp.toFixed(3), under30S: +(st.under30 || 0).toFixed(1), worst3: +(st.worst3 || 0).toFixed(3), heavy: { ...(G.tally7 || {}) }, ...r7,
      takenPerMin: Math.round(st.taken / min), lifePerMin: +(st.takenN / min).toFixed(2), dealtPerMin: Math.round(st.dealt / min), killsPerMin: +(st.kills / min).toFixed(2),
      kills: st.kills, eliteKills: st.eliteKills, potions: st.potions, dodges: st.dodges, evadingS: +st.evading.toFixed(1), touches: st.touches, stuck: st.stuck, hits: st.hits, maxHit: +st.maxHit.toFixed(3), lifeTaken: +st.takenN.toFixed(2),
      ...(light.fireOn?.() ? { fire: { outs: light.FIRE_LOG.outs, dims: light.FIRE_LOG.dims, relit: light.FIRE_LOG.relit, outS: +(st.outS || 0).toFixed(1), drains: Object.fromEntries(Object.entries(light.FIRE_LOG.drains).map(([k, v]) => [k, +v.toFixed(1)])) } } : {}), ...(st.resets ? { resets: st.resets } : {}),
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
const cfg = { skill: +(process.env.SKILL || 0.6), react: +(process.env.REACT || 0.45), walk: +(process.env.WALK || 8), zoneMax: +(process.env.ZONEMAX || 1500), bossMax: +(process.env.BOSSMAX || 900), maxDeaths: +(process.env.MAXDEATHS || 12), realMax: +(process.env.REALMAX || 400), act7: ACT7 };
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
    // (Act VII: the page opens on the run's own fixture, with no story scene to hold the world)
    const q = ACT[j0.zone] === 7 ? `${fx7(A7UP[j0.boss || j0.zone], j0.zone, { lvl: j0.lvl })}&cls=${j0.cls}&diff=${j0.diff}&sim=${SIM}&q=0&norender&nostory` : `auto=${j0.zone}&lvl=${j0.lvl}&cls=${j0.cls}&diff=${j0.diff}&sim=${SIM}&q=0&norender`;
    await page.goto(`${BASE}?${q}`);
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
      if (res.probe) { console.error(`${job.id}: probe ${res.probe} skill ${res.skill} ${JSON.stringify(res.sum)} (wall ${res.wallS}s)${res.err ? ' ERR ' + res.err.slice(0, 200) : ''}`); continue; }
      console.error(`${job.id}: ${res.ok ? 'ok' : 'FAIL'} ${res.combatS}s deaths ${res.deaths} min ${res.minLife} life/min ${res.lifePerMin} kills/min ${res.killsPerMin}${job.boss ? ' kill ' + res.killS + 's left ' + res.bossLeft : ' packs ' + res.packsDone}${res.heavyN != null ? ` lives ${res.lifeTaken} u30 ${res.under30S} heavy ${res.heavyN} slides ${res.slides.her}/${res.slides.foes + res.slides.boss}/${res.slides.taken} tk ${res.terrainKills} lessons ${JSON.stringify(res.lessons)}` : ''} (wall ${res.wallS}s)${res.err ? ' ERR ' + res.err.slice(0, 200) : ''}`);
    }
    await page.close();
  }
} finally { await browser.close(); }
