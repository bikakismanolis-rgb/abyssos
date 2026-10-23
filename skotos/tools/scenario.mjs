// Scenario runner: node tools/scenario.mjs <name> <outdir>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
import { watchBrowser, fatalFail } from './fatal.mjs';
const [, , name = 'combat', out = '/tmp', W = process.env.W || '1280', H = process.env.H || '720'] = process.argv;
const logs = [];
// Act IV: a dialog advances on Enter (the key finishes the line, then moves on), whatever the frame rate; what is said is
// recorded for the report
const A4 = {
  enter: (pg) => pg.evaluate(() => window.__D.emit('key', 'enter')),
  async dialogs(pg, n = 10, until) {
    for (let i = 0; i < n * 2 + 2; i++) {
      if (until && await pg.evaluate(until)) return;
      if (!(await pg.evaluate(() => !!document.querySelector('#dialog:not([hidden])')))) { if (!until) return; await pg.waitForTimeout(250); continue; }
      await A4.enter(pg); await pg.waitForTimeout(220);
    }
  },
  listen: (pg) => pg.evaluate(async () => { const B = await import('/src/ui/bus.js'); window.__says = []; B.on('say', (k) => window.__says.push(k)); }),
  // strike the boss down to frac of its life (null: to death), through a dark step, a daze or a burst floor
  async hit(pg, frac) {
    for (let i = 0; i < 10; i++) {
      const ok = await pg.evaluate((frac) => { const b = window.__G.zone.boss; if (!b || b.dead) return true; b.dazed = 0; b.hidden = false; b.invuln = 0; if (frac == null) b.hpFloor = 0; window.__D.kill(b); return frac == null ? b.dead : b.hp <= b.hpMax * frac + 1; }, frac);
      if (ok) return true;
      await pg.waitForTimeout(700);
    }
    return false;
  }
};
// ---------- Act V: what its scenarios share ----------
// The act's flags in the order the story saves them (each before its scene), after Act IV's; A5.state(pg, f, o) gives the
// hero the state just after flag f (its quest by the catch-up table, story.js enter5) and, with o.zone, builds that zone
// fresh; A5.reload saves, loads the page again and takes the hero up from the title (a hero taken up again starts in
// Whitecliff, at its waypoint); A5.until advances dialogs and waits scenes out until a condition holds
const A5 = {
  base: process.env.BASE || 'http://localhost:5199/',
  ACT4: ['act1', 'act2', 'act3', 'act4', 'after3', 'hart', 'autumn', 'weaver', 'lord', 'fireTaken', 'ivar', 'plug', 'karthax', 'crownUnmade', 'giftsTaken', 'unbound', 'newFire'],
  ORDER: ['alkyone', 'coastCall', 'cradle', 'coal', 'alkField', 'coastSeen', 'hearth', 'rite', 'tamMet', 'glaukosMet', 'light_grey', 'mem_i1', 'light_wreck', 'mem_i2', 'light_fall', 'mem_i3', 'towerWake', 'towerDown', 'frozen', 'farSeen', 'alkShip', 'hole0', 'hole1', 'hole2', 'ternSeen', 'skotosWake', 'skotosDown', 'selnaBack', 'seaLit', 'mem_i4', 'carved', 'homeSeen', 'toldChild'],
  Q: { alkyone: 24, coal: 25, rite: 26, towerWake: 27, frozen: 28, hole2: 29, carved: 30 },
  flagsTo(f) { return f ? A5.ORDER.slice(0, A5.ORDER.indexOf(f) + 1) : []; },
  questAt(f) { let q = 23; for (const k of A5.flagsTo(f)) q = A5.Q[k] || q; return q; },
  // the URL form (?auto=...&quest=&flags=): the flags up to f, Act IV's first
  url(f) { return 'quest=' + A5.questAt(f) + '&flags=' + [...A5.ACT4, ...A5.flagsTo(f)].join(','); },
  // the page keeps drawing frames with &norender (a page that paints nothing gets few): a tick of DOM
  tick: (pg) => pg.evaluate(() => { if (window.__tick5) return; window.__tick5 = true; const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;z-index:99;font-size:1px;color:#000'; document.body.appendChild(d); let k = 0; setInterval(() => { d.textContent = k++ % 2 ? '.' : ':'; }, 20); }),
  async state(pg, f, o = {}) {
    await pg.evaluate(async ({ flags, act4, q, o }) => {
      const G = window.__G, h = G.hero, F = h.flags;
      window.__immortal = o.immortal !== false;
      h.quest = o.quest ?? q; h.act1 = h.act2 = h.act3 = 1; h.act4 = o.act4 ?? 1; h.act5 = o.act5 ?? -1;
      h.boons = o.boons || ['ember', 'forge', 'amber', 'lantern'];
      if (o.lvl) { h.level = o.lvl; h.points = 0; }
      if (o.diff != null) h.diff = o.diff;
      for (const k of Object.keys(F)) delete F[k];
      for (const k of [...act4, ...flags]) if (!(o.drop || []).includes(k)) F[k] = true;
      F.heat = 3; F.gifts = { throne: 'refused', forge: 'refused', unfading: 'refused' }; F.hints = ['tide', 'ice', 'cold', 'louse'];
      F.lights5 = ['grey', 'wreck', 'fall'].filter((id) => F['light_' + id]);
      if (o.names) F.names = o.names.slice();
      Object.assign(F, o.flags || {});
      for (const w of ['ashfield', 'forge', ...(F.hearth ? ['coast'] : []), ...(F.farSeen ? ['farlight'] : [])]) if (!h.wps.includes(w)) h.wps.push(w);
      G.selnaBack = false;
      window.__D.refreshStats();
      if (o.zone) { const W = await import('/src/game/world.js'); await W.zoneReady(o.zone); window.__D.enterZone(o.zone, { fresh: true, at: o.at }); }
      (await import('/src/game/save.js')).writeSave();
    }, { flags: A5.flagsTo(f), act4: A5.ACT4, q: A5.questAt(f), o });
  },
  async reload(pg, o = {}) {
    if (o.write !== false) await pg.evaluate(async () => (await import('/src/game/save.js')).writeSave());
    await pg.goto(A5.base + '?' + (o.q || 'q=0&sim=4&norender'));
    await pg.waitForFunction(() => window.__ready && window.__G?.save, null, { timeout: 240000 });
    await pg.evaluate(() => { const S = window.__G.save; window.__D.emit('startHero', S.heroes.find((h) => h.id === S.last) || S.heroes[0], false); });
    await pg.waitForFunction(() => window.__G?.zone && window.__G.mode === 'play', null, { timeout: 240000 });
    await A5.tick(pg); await A4.listen(pg);
    await pg.evaluate((im) => { window.__immortal = im; }, o.immortal !== false);
  },
  async travel(pg, to, at) {
    await pg.evaluate(([to, at]) => window.__D.emit('travel', to, { at }), [to, at]);
    await pg.waitForFunction((to) => window.__G.zone?.id === to && !document.getElementById('fade').classList.contains('on'), to, { timeout: 300000 });
    await pg.waitForTimeout(400);
  },
  // dialogs advanced (Enter), scenes waited out, until fn() holds or ms of real time pass
  async until(pg, fn, ms = 120000, arg) {
    for (const t0 = Date.now(); Date.now() - t0 < ms;) {
      if (await pg.evaluate(fn, arg)) return true;
      if (await pg.evaluate(() => !!document.querySelector('#dialog:not([hidden])'))) await A4.enter(pg);
      await pg.waitForTimeout(250);
    }
    return false;
  },
  // the hero beside an interactable (found by an expression over the zone z) and it used, as a tap on its prompt
  use: (pg, find) => pg.evaluate((find) => { const G = window.__G, z = G.zone, it = new Function('z', 'G', 'return ' + find)(z, G); if (!it) return null; const f = z.map.nearestFloor(it.x, it.z + 1.2, 3); G.player.x = f.x; G.player.z = f.z; G.player.act = null; G.player.kx = G.player.kz = 0; it.use(); return it.kind + ':' + (it.id ?? it.npc ?? it.i ?? it.to ?? ''); }, find),
  // a boss struck down to frac of its life (null: dead) through any floor, gate or hiding its rules keep
  async hit(pg, frac) {
    for (let i = 0; i < 14; i++) {
      const ok = await pg.evaluate((frac) => { const b = window.__G.zone.boss; if (!b || b.dead) return true; b.dazed = 0; b.invuln = 0; b.under = false; b.hidden = false; if (frac == null) { b.hpFloor = 0; b.lockPhase = null; } if (frac == null) window.__D.kill(b); else { b.hp = Math.min(b.hp, b.hpMax * frac + 1); } return frac == null ? b.dead : b.hp <= b.hpMax * frac + 1; }, frac);
      if (ok) return true;
      await pg.waitForTimeout(700);
    }
    return false;
  },
  // (the tracker's text as the HUD would print it: with &norender the HUD is drawn only for a screenshot)
  quest: (pg) => pg.evaluate(async () => ({ q: window.__G.hero.quest, text: (await import('/src/game/story.js')).questText() })),
  // a soak of tools/soak5.mjs, with this runner's browser closed first (one headless browser at a time)
  async soak(which, out, env = {}) {
    const { spawnSync } = await import('node:child_process'), fs = await import('node:fs'), path = await import('node:path');
    const dir = path.join(out, 'soak5'); fs.mkdirSync(dir, { recursive: true });
    const r = spawnSync(process.execPath, [new URL('./soak5.mjs', import.meta.url).pathname, which, dir], { env: { ...process.env, BASE: A5.base, ...env }, encoding: 'utf8', maxBuffer: 64 << 20 });
    const file = path.join(dir, 'soak5-' + which + (env.SEED || process.env.SEED ? '-' + (env.SEED || process.env.SEED) : '') + '.json');
    let rep = null; try { rep = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { rep = { error: 'no report: ' + (r.stderr || '').slice(-600) }; }
    return rep;
  }
};
// The boss bot (in the page; C3's calibration bot): the reference build of her level (a rare of her level in every slot,
// every skill at rank 5, one blessing of each act before), then she fights on her own: skills at the boss (or its Hands),
// out of every harm telegraph (into a blue calm when one stands inside it), onto an islet when the tide comes, onto thin
// ice in the Tower's ice phase, its light on its flank, Selna remembered, the Farthest Light given its fire, a dark cairn
// lit in the Night. Her life is real: a potion under half; a "death" (under 30%) is counted and she is put back whole.
// window.BOT = { t, deaths, potions, low, phases, done, ... }; o.build false keeps her own gear
async function BOT5(o) {
  const M = (u) => import(u), FR = (n = 1) => new Promise((ok) => { let k = 0; const f = () => (++k >= n ? ok() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const It = await M('/src/game/items.js'), St = await M('/src/game/stats.js'), Sk = await M('/src/game/skills.js'), Fx = await M('/src/gfx/fx.js'), Bus = await M('/src/ui/bus.js'), I = await M('/src/game/ice.js'), D0 = await M('/src/game/data.js');
  const G = window.__G, h = G.hero, L = h.level, cls = h.cls, D = window.__D, IN = D.IN, SKILLS = D0.SKILLS;
  if (o.build !== false) {
    const W = { warden: 'sword', ranger: 'crossbow', mage: 'staff' }, OFF = { warden: 'shield', ranger: 'quiver', mage: 'orb' };
    const mk = (base) => It.makeItem(L, { rar: 2, base, cls });
    h.equip.weapon = mk(W[cls]); h.equip.offhand = mk(OFF[cls]);
    for (const s of ['helm', 'chest', 'gloves', 'boots', 'amulet']) h.equip[s] = mk(s);
    h.equip.ring1 = mk('ring'); h.equip.ring2 = mk('ring');
    h.boons = ['hearth', 'anvil', 'root', 'rest'];
    h.skills = {}; for (const sk of SKILLS[cls]) h.skills[sk.id] = 5;
  }
  St.refreshStats(); G.player.hp = G.player.hpMax; G.player.res = G.stats.resMax;
  const B = window.BOT = { t: 0, deaths: 0, hurt: 0, potions: 0, low: 1, phases: [], done: false, kind: o.kind, cls, L, life: G.player.hpMax, stop: false };
  Bus.on('hurt', (f) => { B.hurt += f; });
  const pl = G.player, z = G.zone, Lz = z.L, ranged = cls !== 'warden';
  const keys = (dx, dz) => { IN.keys.clear(); const l = Math.hypot(dx, dz); if (l < 0.35) return; const r = Math.round(Math.atan2(dx, dz) / (Math.PI / 4)), ux = Math.round(Math.sin(r * Math.PI / 4)), uz = Math.round(Math.cos(r * Math.PI / 4)); if (ux > 0) IN.keys.add('d'); if (ux < 0) IN.keys.add('a'); if (uz > 0) IN.keys.add('s'); if (uz < 0) IN.keys.add('w'); };
  const calm = (t) => { const c = t.m.material.uniforms.uColor.value; return c.b > c.r; };
  const _v = { x: 0, z: 0, r: 0 };
  function under(x, zz, pad = 0.6) {
    for (const t of Fx.FX.teles) {
      if (!t.alive || t.t > t.dur || calm(t)) continue;
      const m = t.m, u = m.material.uniforms, sh = u.uShape.value, dx = x - m.position.x, dz = zz - m.position.z, rot = m.rotation.y - Math.PI;
      if (sh < 0.5) { if (Math.hypot(dx, dz) < m.scale.x + pad) { _v.x = dx; _v.z = dz; _v.r = m.scale.x; _v.c = m.position; return _v; } }
      else if (sh < 1.5) { const d = Math.hypot(dx, dz), a = Math.atan2(dx, dz), da = Math.abs(((a - rot + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (d < m.scale.x + pad && da < u.uArc.value + 0.2) { _v.x = dx; _v.z = dz; _v.r = 0; return _v; } }
      else { const ux = Math.sin(rot), uz = Math.cos(rot), along = dx * ux + dz * uz, side = dx * uz - dz * ux; if (along > -0.6 && along < m.scale.z * 2 + 0.6 && Math.abs(side) < m.scale.x + pad) { _v.x = uz * Math.sign(side || 1); _v.z = -ux * Math.sign(side || 1); _v.r = 0; return _v; } }
    }
    return null;
  }
  // a blue calm inside a red circle (the Tower Bell's body, the Deep Cold's lights): the nearest one
  const calmIn = (c, big) => { let best = null, bd = 1e9; for (const t of Fx.FX.teles) { if (!t.alive || !calm(t) || t.m.material.uniforms.uShape.value > 0.5) continue; const p = t.m.position; if (!big && Math.hypot(p.x - c.x, p.z - c.z) > 1.2) continue; const d = Math.hypot(pl.x - p.x, pl.z - p.z) - t.m.scale.x; if (d < bd) { bd = d; best = { x: p.x, z: p.z, r: t.m.scale.x }; } } return best; };
  let skT = 0, lastPhase = -1;
  while (B.t < o.maxT && !B.stop) {
    await FR(1);
    const dt = 1 / 30 * (window.SIMK || 4), b = z.boss;
    if (!b || G.zone !== z) { keys(0, 0); continue; }
    if (b.dead) { B.done = true; B.phases.push(['dead', +B.t.toFixed(1)]); break; }
    B.t = b.awake ? (B.t0 ??= G.hero.stats.time, G.hero.stats.time - B.t0) : 0;
    if (G.mode !== 'play' || pl.dead) { keys(0, 0); continue; }
    if (b.phase !== lastPhase && b.awake) { lastPhase = b.phase; B.phases.push([b.phase, +B.t.toFixed(1)]); }
    if (pl.hp < pl.hpMax * 0.5 && !(pl.potionCd > 0) && !o.noHeal) { IN.events.push({ t: 'potion' }); B.potions++; }
    B.low = Math.min(B.low, pl.hp / pl.hpMax);
    if (!o.noHeal && pl.hp < pl.hpMax * 0.3) { B.deaths++; pl.hp = pl.hpMax; }
    const hands = G.actors.filter((a) => (a.kind === 'skotosHand' || a.kind === 'skotosCoil') && !a.dead && !a.removed && !a.under && !a.sinking);
    let tgt = b.under || b.hidden ? null : b;
    const hn = hands.sort((p, q) => Math.hypot(p.x - pl.x, p.z - pl.z) - Math.hypot(q.x - pl.x, q.z - pl.z))[0];
    if (hn && o.kind === 'skotos' && (b.ward > 0 || hn.kind === 'skotosCoil' || !tgt || Math.hypot(hn.x - pl.x, hn.z - pl.z) < 6)) tgt = hn;
    const T = b.tide;
    let goal = null;
    if (o.kind === 'tower') {
      if (b.phase === 0 && T && T.st !== 'low') { const isl = Lz.spots.bayIslets.slice().sort((p, q) => Math.hypot(p.x - pl.x, p.z - pl.z) - Math.hypot(q.x - pl.x, q.z - pl.z))[0]; goal = { x: isl.x, z: isl.z }; if (b.dazed > 0 && Math.hypot(b.x - isl.x, b.z - isl.z) < 6) goal = null; }
      if (b.st === 'island' && b.lightIt) { goal = { x: b.lightIt.x, z: b.lightIt.z }; if (Math.hypot(goal.x - pl.x, goal.z - pl.z) < 2.5 && !pl.act) b.lightIt.use(); }
      if (b.phase === 1 && b.st === 'fight' && !(b.dazed > 0)) { if (!B.icePt || Math.hypot(B.icePt.x - b.x, B.icePt.z - b.z) > 12 || (B.icePtT -= dt) <= 0 || I.iceAt(B.icePt.x, B.icePt.z) !== 'thin') { B.icePtT = 18; B.icePt = null; for (let r = 7; r < 10 && !B.icePt; r++) for (let k = 0; k < 16; k++) { const g = k * 0.39, x = b.x + Math.sin(g) * r, zz = b.z + Math.cos(g) * r; if (I.iceAt(x, zz) === 'thin' && I.stageAt(x, zz) < 2 && z.map.walkable(x, zz)) { B.icePt = { x, z: zz }; break; } } } if (B.icePt) goal = B.icePt; }
    } else if (o.kind === 'skotos') {
      if (z.remember && !pl.act) { goal = { x: z.remember.x, z: z.remember.z + 1.0 }; if (Math.hypot(goal.x - pl.x, goal.z - pl.z) < 1.6 && (!b.nb || b.nb.st === 'down' || b.nb.st === 'up')) z.remember.use(); }
      else if (z.giving && z.act5?.farIt && !pl.act) { const it = z.act5.farIt; goal = { x: it.x, z: it.z + 0.8 }; if (Math.hypot(goal.x - pl.x, goal.z - pl.z) < 1.6) it.use(); }
      else if (b.phase === 1) {
        // the Night: a cairn lit (the nearest dark one, when none burns), and while it is under, by the lit one, so that its
        // Breach comes up in the cairn's light (Seared), as Alkyone's hint says
        const cs = z.act5?.cairns || [], dc = (q) => Math.hypot(q.x - pl.x, q.z - pl.z), near = (f) => cs.filter(f).sort((p, q) => dc(p) - dc(q))[0];
        const lit = near((q) => q.lit), dark = near((q) => !q.lit);
        if (lit && (b.under || b.hidden)) { if (dc(lit) > 3) goal = { x: lit.x, z: lit.z + 1.4 }; }
        else if (!lit && dark && pl.act?.name !== 'touch' && tgt !== b) { goal = { x: dark.x, z: dark.z + 1.4 }; if (Math.hypot(goal.x - pl.x, goal.z - pl.z) < 2) dark.use(); }
        else if (dark && !tgt && pl.act?.name !== 'touch') { goal = { x: dark.x, z: dark.z + 1.4 }; if (Math.hypot(goal.x - pl.x, goal.z - pl.z) < 2) dark.use(); }
      }
    }
    if (!goal && tgt) { const d = Math.hypot(tgt.x - pl.x, tgt.z - pl.z), want = ranged ? 8 : tgt.radius + 1.0; if (d > want + 0.8) goal = { x: tgt.x, z: tgt.z }; else if (ranged && d < want - 3) goal = { x: pl.x * 2 - tgt.x, z: pl.z * 2 - tgt.z }; }
    const u = under(pl.x, pl.z);
    if (u) { const c = u.r > 0 && calmIn(u.c, u.r > 14); if (c) goal = { x: c.x, z: c.z }; else { const l = Math.hypot(u.x, u.z) || 1; goal = { x: pl.x + (u.x / l) * 4, z: pl.z + (u.z / l) * 4 }; } }
    if (goal) keys(goal.x - pl.x, goal.z - pl.z); else keys(0, 0);
    B.near = Math.min(B.near ?? 99, tgt === b && b ? Math.hypot(b.x - pl.x, b.z - pl.z) - b.radius : 99);
    if ((skT -= dt) <= 0 && tgt && !pl.pull && !(pl.act && pl.act.name === 'touch')) {
      skT = 0.2;
      const d = Math.hypot(tgt.x - pl.x, tgt.z - pl.z), aim = { x: tgt.x, z: tgt.z };
      let used = false;
      for (const i of [4, 3, 2, 1]) { if (Sk.canUse(i) || used) continue; const sk = SKILLS[cls][i]; const rg = (sk.range || (ranged ? 12 : 3)) + tgt.radius; if (sk.id === 'cry' || sk.id === 'wolf' || d < rg) { if (sk.id === 'whirl' && d > tgt.radius + 2.5) continue; if (sk.id === 'nova' && d > tgt.radius + 5) continue; IN.events.push({ t: 'skill', i, aim }); used = true; } }
      if (!used && d < (ranged ? 13 : tgt.radius + 2.6)) IN.events.push({ t: 'skill', i: 0, aim });
    }
  }
  keys(0, 0);
  B.end = true;
  return B;
}
const S = {
  combat: { q: 'auto=forest&sim=6&q=1', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; const p = G.zone.packs[1]; G.player.x = p.x; G.player.z = p.z + 5; G.player.hp = G.player.hpMax = 5000; });
    await pg.waitForTimeout(1200); await shot();
    for (let i = 0; i < 6; i++) { await pg.evaluate(() => window.__D.IN.events.push({ t: 'skill', i: 0, aim: null })); await pg.waitForTimeout(250); }
    await shot();
    await pg.evaluate(() => { const G = window.__G; G.hero.level = 7; window.__D.refreshStats(); G.player.res = 100; });
    for (const i of [1, 2, 3, 4]) { await pg.evaluate((i) => { window.__G.player.res = 100; window.__D.IN.events.push({ t: 'skill', i, aim: null }); }, i); await pg.waitForTimeout(700); await shot(); }
    await pg.waitForTimeout(2500); await shot();
    return pg.evaluate(() => { const G = window.__G; return { kills: G.hero.stats.kills, xp: G.hero.xp, lvl: G.hero.level, gold: G.hero.gold, pickups: G.pickups.map(p => p.kind + (p.item ? ':' + p.item.rar : '')), inv: G.hero.inv.filter(Boolean).length }; });
  } },
  ranger: { q: 'auto=forest&sim=6&q=1&cls=ranger&lvl=7', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; const p = G.zone.packs[1]; G.player.x = p.x; G.player.z = p.z + 7; G.player.hp = G.player.hpMax = 5000; });
    await pg.waitForTimeout(1200);
    for (let i = 0; i < 4; i++) { await pg.evaluate(() => window.__D.IN.events.push({ t: 'skill', i: 0, aim: null })); await pg.waitForTimeout(300); }
    await shot();
    for (const i of [1, 2, 3, 4]) { await pg.evaluate((i) => { window.__G.player.res = 100; window.__D.IN.events.push({ t: 'skill', i, aim: null }); }, i); await pg.waitForTimeout(600); await shot(); }
    await pg.waitForTimeout(2000); await shot();
    return pg.evaluate(() => { const G = window.__G; return { kills: G.hero.stats.kills, pets: G.actors.filter(a => a.pet).length }; });
  } },
  mage: { q: 'auto=forest&sim=6&q=1&cls=mage&lvl=7', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; const p = G.zone.packs[1]; G.player.x = p.x; G.player.z = p.z + 6; G.player.hp = G.player.hpMax = 5000; });
    await pg.waitForTimeout(1200);
    for (let i = 0; i < 4; i++) { await pg.evaluate(() => window.__D.IN.events.push({ t: 'skill', i: 0, aim: null })); await pg.waitForTimeout(300); }
    await shot();
    for (const i of [1, 2, 3, 4]) { await pg.evaluate((i) => { window.__G.player.res = 100; window.__D.IN.events.push({ t: 'skill', i, aim: null }); }, i); await pg.waitForTimeout(500); await shot(); }
    await pg.waitForTimeout(2000); await shot();
    return pg.evaluate(() => { const G = window.__G; return { kills: G.hero.stats.kills }; });
  } },
  panels: { q: 'auto=town&sim=2&q=1', run: async (pg, shot) => {
    await pg.evaluate(() => { const D = window.__D, G = window.__G; for (let i = 0; i < 10; i++) { const it = (window.__mk || (() => null))(); } });
    await pg.evaluate(async () => { const m = await import('/src/game/items.js'); const inv = await import('/src/game/inventory.js'); for (let i = 0; i < 14; i++) inv.addToBag(m.makeItem(8, { rar: i % 4 })); window.__G.hero.points = 3; window.__G.hero.level = 8; window.__D.refreshStats(); });
    await pg.evaluate(() => window.__D.openPanel('inventory')); await pg.waitForTimeout(500); await shot();
    await pg.click('.bag .cell.r3').catch(() => {}); await pg.waitForTimeout(400); await shot();
    await pg.evaluate(() => window.__D.openPanel('skills')); await pg.waitForTimeout(400); await shot();
    await pg.evaluate(() => window.__D.openPanel('vendor')); await pg.waitForTimeout(400); await shot();
    await pg.evaluate(() => window.__D.openPanel('waypoints')); await pg.waitForTimeout(400); await shot();
    await pg.evaluate(() => window.__D.openPanel('settings')); await pg.waitForTimeout(400); await shot();
    await pg.evaluate(() => window.__D.closePanel());
    await pg.evaluate(() => window.__D.emit('talk', 'wayfarer', {})); await pg.waitForTimeout(800); await shot();
    return 'ok';
  } },
  weaver: { q: 'auto=forest&sim=6&q=1&lvl=6', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; const b = G.zone.L.boss; G.player.x = b.x; G.player.z = b.z + 9; G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(2500); await shot();
    for (let k = 0; k < 40; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(400); if (k % 10 === 9) await shot(); }
    // software rendering under load runs few game frames per second: keep swinging until the boss falls, measured in game
    // time (a swing is dropped mid-leap, or misses while she blinks: the hero swings again as soon as she is free to)
    const swung = await pg.evaluate(async () => {
      const G = window.__G, b = G.zone.boss, p = G.player, t0 = G.hero.stats.time, w0 = performance.now();
      while (b && !b.dead && G.hero.stats.time - t0 < 20 && performance.now() - w0 < 300000) {
        if (!p.act && !window.__D.IN.events.some((e) => e.t === 'skill')) { b.hp = 1; p.x = b.x; p.z = b.z + b.radius + 1; window.__D.IN.events.push({ t: 'skill', i: 0, aim: { x: b.x, z: b.z } }); }
        await new Promise((ok) => setTimeout(ok, 250));
      }
      return !b || b.dead ? true : +(G.hero.stats.time - t0).toFixed(1);
    });
    // the hero's own swings never landed: the story still gets its kill, and the report says so (forced: the game seconds tried)
    if (swung !== true) await A4.hit(pg, null);
    await pg.waitForFunction(() => window.__G.hero.quest >= 2, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(1000); await shot();
    return pg.evaluate((forced) => { const G = window.__G, pa = G.player.act; return { act: pa && { name: pa.name, t: +pa.t.toFixed(2), dur: +pa.dur.toFixed(2) }, d: G.zone.boss && +Math.hypot(G.zone.boss.x - G.player.x, G.zone.boss.z - G.player.z).toFixed(2), boss: G.zone.boss?.dead, hp: G.zone.boss && Math.round(G.zone.boss.hp), flag: G.hero.flags.weaver, quest: G.hero.quest, pickups: G.pickups.map(p => p.kind + (p.item ? ':' + p.item.rar : '')), ...(forced != null ? { forced } : {}) }; }, swung === true ? null : swung);
  } },
  lord: { q: 'auto=crypt&sim=6&q=1&lvl=8&cls=mage', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; G.hero.flags.weaver = true; G.hero.quest = 3; const b = G.zone.L.boss; G.player.x = b.x; G.player.z = b.z + 9; G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(2500); await shot();
    for (let k = 0; k < 30; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 2, 3, 4][Math.floor(Math.random() * 5)], aim: null }); }); await pg.waitForTimeout(400); if (k % 10 === 9) await shot(); }
    await pg.evaluate(() => { const G = window.__G; const b = G.zone.boss; if (b && !b.dead) b.hp = 1; window.__D.IN.events.push({ t: 'skill', i: 3, aim: null }); });
    // (the blow lands in game time: on a loaded machine 5 s of real time can be a few frames)
    await pg.waitForTimeout(5000);
    await pg.waitForFunction(() => window.__G.zone.boss?.dead || (window.__D.IN.events.push({ t: 'skill', i: 0, aim: null }), false), null, { timeout: 60000, polling: 1000 }).catch(() => {});
    await pg.evaluate(() => { const G = window.__G; const s = G.pickups.find(p => p.kind === 'shard'); if (s) { G.player.x = s.x; G.player.z = s.z; } });
    await pg.waitForTimeout(2000); await shot();
    return pg.evaluate(() => { const G = window.__G; return { boss: G.zone.boss?.dead, quest: G.hero.quest, lordFlag: G.hero.flags.lord }; });
  } },
  ending: { q: 'auto=town&sim=3&q=1&norender&lvl=10', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; G.hero.quest = 4; });
    await pg.evaluate(() => window.__D.emit('talk', 'wayfarer', {}));
    // dialogs advance on Enter (it finishes the line, then moves on), whatever the frame rate
    const next = () => pg.evaluate(() => window.__D.emit('key', 'enter'));
    for (let i = 0; i < 30; i++) { if (await pg.evaluate(() => !!window.__G.cine)) break; await next(); await pg.waitForTimeout(300); }
    await pg.waitForFunction(() => !window.__G.cine || window.__G.cine.t >= 4.5, null, { timeout: 120000 }); await shot();
    await pg.waitForFunction(() => !window.__G.cine, null, { timeout: 120000 });
    for (let i = 0; i < 8; i++) { await next(); await pg.waitForTimeout(300); }
    await pg.waitForTimeout(1500); await shot();
    return pg.evaluate(() => { const G = window.__G; return { quest: G.hero.quest, act1: G.hero.act1, panel: G.panel, mode: G.mode }; });
  } },
  gate: { q: 'auto=town&sim=6&q=1&lvl=12&cls=warden', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; G.hero.quest = 5; G.player.hp = G.player.hpMax = 99999; window.__D.emit('startGate', 3); });
    await pg.waitForTimeout(4000); await shot();
    await pg.evaluate(() => { const G = window.__G; G.gate.progress = 0.99; const m = G.actors.find(a => a.team === 'foe' && !a.prop && !a.dead); if (m) { m.hp = 1; window.__D.emit('gateKill', m); } });
    await pg.waitForTimeout(3000); await shot();
    return pg.evaluate(() => { const G = window.__G; return { zone: G.zone.id, guardian: !!G.gate?.guardian, name: G.gate?.guardian?.name }; });
  } },
  // ---------- Act II ----------
  // walk the pass pack by pack with an unkillable hero, swinging, and report what died and what broke
  pass: { q: 'auto=pass&sim=6&q=1&norender&lvl=12&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    const n = await pg.evaluate(() => window.__G.zone.packs.length);
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 6))) {
      await pg.evaluate((i) => { const G = window.__G, p = G.zone.packs[i]; G.player.x = p.x; G.player.z = p.z + 4; const f = G.zone.map.nearestFloor(G.player.x, G.player.z); G.player.x = f.x; G.player.z = f.z; G.player.hp = G.player.hpMax = 99999; }, i);
      for (let k = 0; k < 12; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 0, 1, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(300); }
      await shot();
    }
    return pg.evaluate(() => { const G = window.__G, kinds = {}; for (const a of G.actors) if (a.team === 'foe' && !a.prop) kinds[a.kind] = (kinds[a.kind] || 0) + 1; return { kills: G.hero.stats.kills, lvl: G.hero.level, alive: kinds, quest: G.hero.quest }; });
  } },
  stonewarden: { q: 'auto=pass&sim=6&q=1&norender&lvl=12&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; window.__immortal = true; G.hero.quest = 6; const b = G.zone.L.boss; G.player.x = b.x; G.player.z = b.z + 9; G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(3000); await shot();
    for (let k = 0; k < 36; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(400); if (k % 9 === 8) await shot(); }
    const moves = await pg.evaluate(() => Object.keys(window.__G.zone.boss?.mcd || {}));
    await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; if (b && !b.dead) b.hp = 1; G.player.x = b.x; G.player.z = b.z + 2.5; window.__D.IN.events.push({ t: 'skill', i: 0, aim: { x: b.x, z: b.z } }); });
    await pg.waitForTimeout(6000); await shot();
    return pg.evaluate((moves) => { const G = window.__G; return { moves, boss: G.zone.boss?.dead, flag: G.hero.flags.stonewarden, quest: G.hero.quest, doors: G.zone.gateDoors?.userData.leaves.map((l) => +l.hinge.rotation.y.toFixed(2)) }; }, moves);
  } },
  halls: { q: 'auto=halls&sim=6&q=1&norender&lvl=14&cls=' + (process.env.CLS || 'mage'), run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; window.__immortal = true; G.hero.quest = 7; G.hero.flags.stonewarden = true; G.player.hp = G.player.hpMax = 99999; });
    await pg.waitForTimeout(1500); await shot();
    await pg.evaluate(() => window.__D.emit('talk', 'brokka', {}));
    for (let i = 0; i < 10; i++) { await pg.waitForTimeout(400); await pg.click('#dialog', { timeout: 800 }).catch(() => {}); }
    await pg.waitForTimeout(800); await shot();
    const n = await pg.evaluate(() => window.__G.zone.packs.length);
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 6))) {
      await pg.evaluate((i) => { const G = window.__G, p = G.zone.packs[i]; const f = G.zone.map.nearestFloor(p.x, p.z + 4); G.player.x = f.x; G.player.z = f.z; }, i);
      for (let k = 0; k < 12; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 2, 3, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(300); }
      await shot();
    }
    return pg.evaluate(() => { const G = window.__G, kinds = {}; for (const a of G.actors) if (a.team === 'foe' && !a.prop) kinds[a.kind] = (kinds[a.kind] || 0) + 1; return { kills: G.hero.stats.kills, quest: G.hero.quest, alive: kinds }; });
  } },
  king: { q: 'auto=halls&sim=6&q=1&norender&lvl=15&cls=' + (process.env.CLS || 'ranger'), run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; window.__immortal = true; G.hero.quest = 8; G.hero.flags.stonewarden = true; const b = G.zone.L.boss; G.player.x = b.x; G.player.z = b.z + 7; G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(3000); await shot();
    for (let k = 0; k < 40; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 2, 3, 4][Math.floor(Math.random() * 5)], aim: null }); }); await pg.waitForTimeout(400); if (k % 10 === 9) await shot(); }
    const mid = await pg.evaluate(() => { const b = window.__G.zone.boss; return { moves: Object.keys(b?.mcd || {}), hp: b && Math.round(b.hp / b.hpMax * 100), phase: b?.phase }; });
    for (let k = 0; k < 8; k++) {
      const dead = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; if (!b || b.dead) return true; window.__D.kill(b); G.player.x = b.x; G.player.z = b.z + b.radius + 1.5; return false; });
      if (dead) break;
      await pg.waitForTimeout(1500);
    }
    await pg.waitForTimeout(4000);
    await pg.evaluate(() => { const G = window.__G; const s = G.pickups.find((p) => p.kind === 'shard'); if (s) { G.player.x = s.x; G.player.z = s.z; } });
    await pg.waitForTimeout(2000); await shot();
    return pg.evaluate((mid) => { const G = window.__G, s = G.pickups.find((p) => p.kind === 'shard'); return { mid, boss: G.zone.boss?.dead, quest: G.hero.quest, king: G.hero.flags.king, shard: s && [s.x, s.z, s.y, s.t], pl: [G.player.x, G.player.z, G.player.dead], mode: G.mode, panel: G.panel }; }, mid);
  } },
  // Act II's cast lined up in the halls (no fighting): &zone=pass to see them in the snow
  cast2: { q: 'auto=' + (process.env.ZONE || 'halls') + '&sim=1&q=' + (process.env.Q || '1') + '&lvl=14&cls=warden', run: async (pg, shot) => {
    await pg.evaluate(() => {
      const G = window.__G; window.__immortal = true;
      for (const a of G.actors) if (a.team === 'foe' && !a.boss) a.dead = true;
      for (const p of G.zone.packs) p.spawned = true;
      const ids = ['magmaHound', 'stoneborn', 'stonebornArbalest', 'runepriest', 'caveBat', 'deepworm'];
      ids.forEach((id, i) => { const f = G.zone.map.nearestFloor(G.player.x - 5 + i * 2, G.player.z - 3); const m = window.__D.spawnMonster(id, f.x, f.z, {}); m.speed = 0; G.actors.push(m); });
    });
    await pg.waitForTimeout(1500); await shot();
    return pg.evaluate(() => window.__G.actors.filter((a) => a.team === 'foe' && !a.dead).map((a) => a.kind + ':' + a.avatar.kind));
  } },
  ending2: { q: 'auto=town&sim=3&q=1&norender&lvl=16', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; G.hero.quest = 9; G.hero.act1 = 1; });
    await pg.evaluate(() => window.__D.emit('talk', 'wayfarer', {}));
    for (let i = 0; i < 3; i++) { await pg.waitForTimeout(600); await pg.click('#dialog', { timeout: 800 }).catch(() => {}); await pg.click('#dialog', { timeout: 800 }).catch(() => {}); }
    await pg.waitForTimeout(2500); await shot();
    await pg.waitForTimeout(4000); await shot();
    await pg.waitForTimeout(6000);
    for (let i = 0; i < 5; i++) { await pg.click('#dialog', { timeout: 800 }).catch(() => {}); await pg.waitForTimeout(300); await pg.click('#dialog', { timeout: 800 }).catch(() => {}); await pg.waitForTimeout(300); }
    await pg.waitForTimeout(1500); await shot();
    return pg.evaluate(() => { const G = window.__G; return { quest: G.hero.quest, act2: G.hero.act2, panel: G.panel, mode: G.mode, extras: G.zone.extra.length }; });
  } },
  // the beacon's blessing after Act I, then an Act I veteran from before the blessings gets the Act II one on load
  boons: { q: 'auto=town&sim=3&q=1&norender&lvl=9', run: async (pg, shot) => {
    const before = await pg.evaluate(() => ({ dmg: window.__G.stats.dmgMult, life: window.__G.stats.lifeMax }));
    await pg.evaluate(() => { const G = window.__G; G.hero.act1 = 0; window.__D.emit('openPanel', 'boon', { act: 1 }); });
    await pg.waitForTimeout(800); await shot();
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(1500);
    const still = await pg.evaluate(() => window.__G.panel);
    await pg.click('[data-a="boon:ember"]'); await pg.waitForTimeout(1200); await shot();
    const after = await pg.evaluate(() => ({ dmg: window.__G.stats.dmgMult, life: window.__G.stats.lifeMax, boons: window.__G.hero.boons, panel: window.__G.panel }));
    await pg.evaluate(() => { const G = window.__G; G.hero.act2 = 0; window.__D.emit('actClosed'); });
    await pg.waitForTimeout(1500); await shot();
    const second = await pg.evaluate(() => ({ panel: window.__G.panel, timers: window.__G.timers.length, mode: window.__G.mode, act2: window.__G.hero.act2, boons: window.__G.hero.boons }));
    if (second.panel !== 'boon') return { before, still, after, second };
    await pg.click('[data-a="boon:anvil"]'); await pg.waitForTimeout(600);
    await pg.evaluate(() => window.__D.openPanel('inventory')); await pg.waitForTimeout(600); await shot();
    return pg.evaluate((o) => ({ ...o, final: window.__G.hero.boons, armor: window.__G.stats.armor }), { before, still, after, second });
  } },
  // ---------- Act III ----------
  // the Weeping Woods: what the zone holds, Elati's welcome, the three Tears of the Long Sorrow, then the packs one by one
  weep: { q: 'auto=weep&sim=6&q=1&norender&lvl=17&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    const info = await pg.evaluate(async () => {
      const G = window.__G, z = G.zone, B = await import('/src/world/build.js'); window.__immortal = true; G.hero.quest = 11; G.hero.flags.act2 = true; G.player.hp = G.player.hpMax = 99999; z.bossSpawned = true;
      return { tears: z.interact.filter((i) => i.kind === 'tear').map((i) => i.id), npcs: z.actors.filter((a) => a.npc).map((a) => a.npc), boss: z.bossSpot?.kind, wind: B.WIND.uWind.value, autumn: B.WIND.uAutumn.value, gate: z.act3?.gate?.userData.progress, voices: z.voices?.length, packs: z.packs.length, gateOpen: z.map.walkable(z.L.spots.rootGate.x, z.L.spots.rootGate.z) };
    });
    // Elati at the Lanternglade
    await pg.evaluate(() => { const G = window.__G, e = G.zone.L.spots.npcs.elati; G.player.x = e.x; G.player.z = e.z + 2; for (const p of G.zone.packs) p.spawned = true; window.__D.emit('talk', 'elati', G.actors.find((a) => a.npc === 'elati')); });
    for (let i = 0; i < 8; i++) { await pg.waitForTimeout(300); await pg.click('#dialog', { timeout: 600 }).catch(() => {}); }
    const q12 = await pg.evaluate(() => window.__G.hero.quest);
    await shot();
    // the three Tears: a memory each (sepia, a choir, the narrator), then the buff
    const tears = [];
    for (const id of ['planting', 'sorrow', 'breaking']) {
      await pg.evaluate((id) => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'tear' && i.id === id); const f = G.zone.map.nearestFloor(it.x, it.z + 1.6); G.player.x = f.x; G.player.z = f.z; it.use(); }, id);
      await pg.waitForTimeout(700);
      const mid = await pg.evaluate(() => ({ sepia: document.body.classList.contains('memory'), mode: window.__G.mode, who: document.querySelector('#dialog .who')?.textContent }));
      if (id === 'sorrow') await shot();
      for (let i = 0; i < 12; i++) { await pg.click('#dialog', { timeout: 600 }).catch(() => {}); await pg.waitForTimeout(200); }
      await pg.waitForTimeout(1500);
      tears.push(await pg.evaluate((id) => { const G = window.__G; return { id, mid: 0, flag: !!G.hero.flags['tear_' + id], buff: Math.round(G.player.buffs.memory || 0), sepia: document.body.classList.contains('memory'), mode: G.mode }; }, id));
      tears[tears.length - 1].mid = mid;
    }
    await pg.waitForTimeout(3000);
    const after = await pg.evaluate(() => ({ quest: window.__G.hero.quest }));
    // the packs
    const n = await pg.evaluate(() => { const z = window.__G.zone; for (const p of z.packs) p.spawned = false; z.bossSpawned = false; return z.packs.length; });
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 7))) {
      await pg.evaluate((i) => { const G = window.__G, p = G.zone.packs[i]; const f = G.zone.map.nearestFloor(p.x, p.z + 4); G.player.x = f.x; G.player.z = f.z; }, i);
      for (let k = 0; k < 12; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 0, 1, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(300); }
      await shot();
    }
    return pg.evaluate((o) => { const G = window.__G, kinds = {}; for (const a of G.actors) if (a.team === 'foe' && !a.prop && !a.dead) kinds[a.kind] = (kinds[a.kind] || 0) + 1; return { ...o, kills: G.hero.stats.kills, lvl: G.hero.level, alive: kinds }; }, { info, q12, tears, after });
  } },
  // Silverhorn in the Glade of Stones, fought to the end: the white tree, the Root Gate drawing back, quest 14
  hart: { q: 'auto=weep&sim=6&q=1&norender&lvl=18&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G, b = G.zone.L.boss; window.__immortal = true; G.hero.quest = 13; G.hero.flags.metElati = true; const f = G.zone.map.nearestFloor(b.x, b.z + 9); G.player.x = f.x; G.player.z = f.z; G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(3000); await shot();
    for (let k = 0; k < 36; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(400); if (k % 12 === 11) await shot(); }
    const mid = await pg.evaluate(() => { const b = window.__G.zone.boss; return b && { moves: Object.keys(b.mcd || {}), hp: Math.round(b.hp / b.hpMax * 100), phase: b.phase }; });
    for (let k = 0; k < 8; k++) {
      const dead = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; if (!b || b.dead) return true; b.hidden = false; b.invuln = 0; window.__D.kill(b); return b.dead; });
      if (dead) break;
      await pg.waitForTimeout(800);
    }
    await pg.waitForTimeout(6000); await shot();
    return pg.evaluate((mid) => { const G = window.__G, z = G.zone, s = z.L.spots.rootGate, A = z.act3; return { mid, boss: z.boss?.dead, hart: G.hero.flags.hart, at: G.hero.flags.hartAt, quest: G.hero.quest, gate: A.gate.userData.progress, open: s.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)), whiteTree: !!A.whiteTree, exit: z.interact.find((i) => i.to === 'heart')?.locked }; }, mid);
  } },
  // the Heartwood's three thorn walls, each withering when its Heartroot dies
  heart: { q: 'auto=heart&sim=6&q=1&norender&lvl=19&cls=' + (process.env.CLS || 'mage'), run: async (pg, shot) => {
    const info = await pg.evaluate(() => { const G = window.__G, z = G.zone; window.__immortal = true; G.hero.quest = 14; G.hero.flags.hart = true; G.player.hp = G.player.hpMax = 99999; return { walls: z.L.thorns.length, nodes: z.actors.filter((a) => a.kind === 'heartroot').map((a) => a.wall), shut: z.L.thorns.map((t) => t.cells.filter(([x, zz]) => !z.map.walkable(x + 0.5, zz + 0.5)).length), npcs: z.actors.filter((a) => a.npc).map((a) => a.npc), heart: !!z.heartProp, cocoons: z.act3.cocoons?.length, boss: z.bossSpot?.kind, text: document.querySelector('#quest')?.textContent }; });
    await pg.evaluate(() => window.__D.emit('talk', 'elati', window.__G.actors.find((a) => a.npc === 'elati')));
    for (let i = 0; i < 6; i++) { await pg.waitForTimeout(300); await pg.click('#dialog', { timeout: 600 }).catch(() => {}); }
    const shop = await pg.evaluate(() => window.__G.panel);
    await pg.evaluate(() => window.__D.closePanel());
    const steps = [];
    for (let i = 0; i < 3; i++) {
      await pg.evaluate((i) => { const G = window.__G, n = G.actors.find((a) => a.kind === 'heartroot' && a.wall === i && !a.dead); const f = G.zone.map.nearestFloor(n.x, n.z + 3); G.player.x = f.x; G.player.z = f.z; }, i);
      for (let k = 0; k < 6; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2][Math.floor(Math.random() * 4)], aim: null }); }); await pg.waitForTimeout(300); }
      await pg.evaluate((i) => { const n = window.__G.actors.find((a) => a.kind === 'heartroot' && a.wall === i && !a.dead); if (n) window.__D.kill(n); }, i);
      await pg.waitForTimeout(2500); await shot();
      steps.push(await pg.evaluate((i) => { const G = window.__G, z = G.zone, t = z.L.thorns[i]; return { i, flag: !!G.hero.flags['thorn' + i], open: t.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)), quest: document.querySelector('#quest')?.textContent }; }, i));
    }
    return { info, shop, steps };
  } },
  // the Lady: her three phases (the Heartroots at the alcoves, torn free, the Mourners), her fall, the First Autumn, the shard
  amaranthe: { q: 'auto=heart&sim=6&q=1&norender&lvl=20&cls=' + (process.env.CLS || 'ranger'), run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G, b = G.zone.L.boss; window.__immortal = true; G.hero.quest = 14; G.hero.flags.hart = true; for (const i of [0, 1, 2]) G.hero.flags['thorn' + i] = true; const f = G.zone.map.nearestFloor(b.x, b.z + 8); G.player.x = f.x; G.player.z = f.z; G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(3000); await shot();
    const swing = async (n) => { for (let k = 0; k < n; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(350); } };
    await swing(20);
    const p0 = await pg.evaluate(() => { const b = window.__G.zone.boss; return b && { hp: Math.round(b.hp / b.hpMax * 100), phase: b.phase, moves: Object.keys(b.mcd || {}) }; });
    // past the floor: she walks home and roots, and four Heartroots wake
    await pg.evaluate(() => { const b = window.__G.zone.boss; window.__D.kill(b); });
    await pg.waitForTimeout(5000); await shot();
    const p1 = await pg.evaluate(() => { const b = window.__G.zone.boss; return { hp: Math.round(b.hp / b.hpMax * 100), phase: b.phase, rooted: b.rooted, nodes: (b.nodes || []).length, music: window.__G.zone.id }; });
    for (let k = 0; k < 4; k++) { await pg.evaluate(() => { const b = window.__G.zone.boss, n = (b.nodes || []).find((x) => !x.dead); if (n) window.__D.kill(n); }); await pg.waitForTimeout(1200); }
    await pg.waitForTimeout(2500);
    const p2 = await pg.evaluate(() => { const b = window.__G.zone.boss; return { hp: Math.round(b.hp / b.hpMax * 100), phase: b.phase, rooted: b.rooted, dazed: b.dazed > 0 }; });
    await swing(14); await shot();
    for (let k = 0; k < 8; k++) {
      const dead = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; if (!b || b.dead) return true; b.invuln = 0; b.ward = 0; window.__D.kill(b); return b.dead; });
      if (dead) break;
      await pg.waitForTimeout(800);
    }
    // her lucid moment, then the Autumn
    await pg.waitForTimeout(2500);
    const words = await pg.evaluate(() => document.querySelector('#dialog .txt')?.textContent);
    for (let i = 0; i < 10; i++) { await pg.click('#dialog', { timeout: 600 }).catch(() => {}); await pg.waitForTimeout(250); }
    await pg.waitForTimeout(3000); await shot();
    await pg.waitForTimeout(8000);
    await pg.evaluate(() => { const G = window.__G, s = G.pickups.find((p) => p.kind === 'shard'); if (s) { G.player.x = s.x; G.player.z = s.z; } });
    await pg.waitForTimeout(2500); await shot();
    return pg.evaluate(async (o) => { const G = window.__G, z = G.zone, B = await import('/src/world/build.js'), F = await import('/src/gfx/fx.js'); return { ...o, boss: z.boss?.dead, autumn: G.hero.flags.autumn, quest: G.hero.quest, wind: +B.WIND.uWind.value.toFixed(2), dry: +B.WIND.uAutumn.value.toFixed(2), beat: +F.FX.beat.toFixed(2), sapling: !!z.act3.sapling, elati: z.actors.some((a) => a.npc === 'elati'), mode: G.mode, panel: G.panel, shardLeft: G.pickups.some((p) => p.kind === 'shard') }; }, { p0, p1, p2, words });
  } },
  // after the story: the white tree and the Lady's sapling each raise an amber echo of their boss, fought again without story
  echo: { q: 'auto=weep&sim=6&q=1&norender&lvl=20&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    const out = {};
    for (const zid of ['weep', 'heart']) {
      await pg.evaluate((zid) => { const G = window.__G; window.__immortal = true; G.hero.quest = 16; Object.assign(G.hero.flags, { hart: true, autumn: true, thorn0: true, thorn1: true, thorn2: true }); window.__D.enterZone(zid, { fresh: true }); G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; }, zid);
      await pg.waitForTimeout(1500);
      const before = await pg.evaluate(() => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'echo'); if (!it) return { echo: false }; const f = z.map.nearestFloor(it.x, it.z + 2); G.player.x = f.x; G.player.z = f.z; it.use(); it.use(); return { echo: it.boss, prompt: window.__D.t(it.prompt), extra: z.extra.length, foes: z.actors.filter((a) => a.boss).length }; });
      await pg.waitForTimeout(3500); await shot();
      const spawned = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; return b && { kind: b.kind, echo: b.echo, awake: b.awake, bar: G.bossActor === b, bosses: G.zone.actors.filter((a) => a.boss).length, d: +Math.hypot(b.x - G.player.x, b.z - G.player.z).toFixed(1) }; });
      for (let k = 0; k < 14; k++) {
        const st = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; if (!b || b.dead) return 'dead'; for (const n of b.nodes || []) if (!n.dead) { window.__D.kill(n); return 'node'; } b.hidden = false; b.ward = 0; if (!b.rooted && !b.goingHome) { b.invuln = 0; window.__D.kill(b); } return b.dead ? 'dead' : 'hit'; });
        if (st === 'dead') break;
        await pg.waitForTimeout(1200);
      }
      await pg.waitForTimeout(4000); await shot();
      out[zid] = await pg.evaluate((o) => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'echo'); return { ...o, dead: z.boss?.dead, bar: !!G.bossActor, quest: G.hero.quest, hart: G.hero.flags.hart, autumn: G.hero.flags.autumn, used: it?.used, extra: z.extra.length, shard: G.pickups.some((p) => p.kind === 'shard'), dialog: !document.querySelector('#dialog')?.hidden, mode: G.mode, loot: G.pickups.filter((p) => p.item).length }; }, { before, spawned });
    }
    return out;
  } },
  // the third shard on the beacon: the green-gold fire no hand lit, Isarn's lantern, his partial confession, the act panel, the blessing
  ending3: { q: 'auto=town&sim=1&q=1&norender&lvl=20', run: async (pg, shot) => {
    await pg.evaluate(() => { const G = window.__G; G.hero.quest = 15; G.hero.act1 = 1; G.hero.act2 = 1; G.hero.boons = ['ember', 'forge']; Object.assign(G.hero.flags, { act1: true, act2: true, hart: true, autumn: true }); });
    await pg.evaluate(() => window.__D.emit('talk', 'wayfarer', window.__G.actors.find((a) => a.npc === 'wayfarer')));
    // through Isarn's two lines into the beacon scene (game time: wait on the scene's own clock)
    // dialogs advance on Enter (the key handler finishes the line, then moves on), whatever the frame rate
    const next = () => pg.evaluate(() => window.__D.emit('key', 'enter'));
    for (let i = 0; i < 30; i++) { const c = await pg.evaluate(() => !!window.__G.cine); if (c) break; await next(); await pg.waitForTimeout(400); }
    const at = (t) => pg.waitForFunction((t) => !window.__G.cine || window.__G.cine.t >= t, t, { timeout: 180000 });
    await at(5.8); await shot();
    await at(8.6); const lean = await pg.evaluate(() => ({ t: +window.__G.cine?.t.toFixed(1), x: window.__G.cine?.x, far: window.__G.zone.extra.filter((e) => e.isSprite).length })); await shot();
    await pg.waitForFunction(() => !window.__G.cine, null, { timeout: 120000 });
    const lines = [];
    for (let i = 0; i < 8; i++) { await next(); await pg.waitForTimeout(200); lines.push(await pg.evaluate(() => document.querySelector('#dialog:not([hidden]) .txt')?.textContent?.slice(0, 40))); await next(); await pg.waitForTimeout(300); }
    await pg.waitForTimeout(1500); await shot();
    const act = await pg.evaluate(() => ({ panel: window.__G.panel, done: document.querySelector('.act-h')?.textContent, next: [...document.querySelectorAll('#panel .muted')].map((e) => e.textContent).pop() }));
    await pg.click('[data-a="close"]').catch(() => {}); await pg.waitForTimeout(3000); await shot();
    const boon = await pg.evaluate(() => ({ panel: window.__G.panel, title: document.querySelector('.act-h')?.textContent, cards: [...document.querySelectorAll('[data-a^="boon:"]')].map((e) => e.dataset.a) }));
    await pg.click('[data-a="boon:amber"]').catch(() => {}); await pg.waitForTimeout(1000);
    return pg.evaluate((o) => { const G = window.__G, h = G.hero; return { ...o, quest: h.quest, act3: h.act3, flag: h.flags.act3, boons: h.boons, regen: G.stats.regen, lifeOnHit: G.stats.lifeOnHit, extras: G.zone.extra.length, panel: G.panel }; }, { act, boon, lines, lean });
  } },
  // Act III's cast lined up in the Weeping Woods (no fighting); &ZONE=heart to see them in the root caves
  cast3: { q: 'auto=' + (process.env.ZONE || 'weep') + '&sim=1&q=' + (process.env.Q || '1') + '&lvl=17&cls=warden', run: async (pg, shot) => {
    await pg.evaluate(async () => {
      const G = window.__G, gfx = await import('/src/gfx/gfx.js'); window.__immortal = true;
      for (const a of G.actors) if (a.team === 'foe') a.dead = true;
      for (const p of G.zone.packs) p.spawned = true;
      G.zone.bossSpawned = true;
      const ids = ['hollowed', 'rootling', 'amberMoth', 'amberBear', 'rootsworn', 'rootswornArcher', 'rootwarden', 'mourner', 'heartroot', 'silverhorn', 'amaranthe'];
      const c = G.zone.L.spots.lanternglade || G.zone.L.spots.waypoint;
      ids.forEach((id, i) => { const f = G.zone.map.nearestFloor(c.x - 11 + i * 2.2, c.z - 2); const m = window.__D.spawnMonster(id, f.x, f.z, { surface: true }); m.dormant = true; m.disguised = false; m.under = false; m.y = 0; m.aggro = false; if (m.avatar) m.avatar.group.visible = true; m.rot = 0; G.actors.push(m); });
      const h = G.zone.map.nearestFloor(c.x, c.z + 5.5); G.player.x = h.x; G.player.z = h.z;
      gfx.R.cam.dist = 23; gfx.updateCamera(0, c.x, c.z + 2, true);
    });
    await pg.waitForTimeout(2500); await shot();
    return pg.evaluate(() => window.__G.actors.filter((a) => a.team === 'foe' && !a.dead).map((a) => a.kind + ':' + (a.avatar?.kind || '-')));
  } },
  // ---------- Act IV ----------
  // q17 in town (the rest of the truth, Brokka and the Cradle, the fire leaving), then the Field of Ash: the camp, the five
  // lamps and their memories (white ash), a lamp snuffed and lit again, the altars, the checkpoint, the packs
  ashfield: { q: 'auto=town&sim=4&q=1&norender&lvl=23&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    await A4.listen(pg);
    await pg.evaluate(() => { const G = window.__G, h = G.hero; window.__immortal = true; h.quest = 16; h.act1 = h.act2 = h.act3 = 1; h.boons = ['ember', 'forge', 'amber']; Object.assign(h.flags, { act1: true, act2: true, act3: true, hart: true, autumn: true }); });
    const talk = () => pg.evaluate(() => window.__D.emit('talk', 'wayfarer', window.__G.actors.find((a) => a.npc === 'wayfarer')));
    await talk(); await A4.dialogs(pg, 6);
    const q17 = await pg.evaluate(() => { const G = window.__G, p = G.panel; window.__D.closePanel(); return { quest: G.hero.quest, after3: G.hero.flags.after3, panel: p }; });
    // the e-lines, Brokka walking up with the Cradle, her lines, then the scene
    await talk();
    for (let i = 0; i < 80 && !(await pg.evaluate(() => !!window.__G.cine)); i++) { await A4.enter(pg); await pg.waitForTimeout(300); }
    await pg.waitForTimeout(3500); await shot();
    await pg.waitForFunction(() => !window.__G.cine, null, { timeout: 120000 });
    await A4.dialogs(pg, 6);
    await pg.waitForTimeout(1500); await shot();
    const town = await pg.evaluate(() => { const G = window.__G, z = G.zone, R = window.__R; return { quest: G.hero.quest, fireTaken: G.hero.flags.fireTaken, beaconOn: z.town?.beaconOn, beaconLight: [...R.sources].some((s) => s.key === 'beacon'), far: (z.town?.far || []).filter(Boolean).length, torches: z.actors.filter((a) => a.npc === 'villager' && a.avatar?.held.R).length, isarn: z.actors.some((a) => a.npc === 'wayfarer'), exitLocked: z.interact.find((i) => i.to === 'ashfield')?.locked }; });
    // down the north path to the Field
    await pg.evaluate(() => window.__G.zone.interact.find((i) => i.kind === 'exit' && i.to === 'ashfield').use());
    await pg.waitForFunction(() => window.__G.zone?.id === 'ashfield' && !document.getElementById('fade')?.classList.contains('on'), null, { timeout: 180000 });
    await pg.waitForTimeout(1500); await shot();
    const field = await pg.evaluate(() => { const G = window.__G, z = G.zone; for (const p of z.packs) p.spawned = true; z.bossSpawned = true; return { quest: G.hero.quest, npcs: z.actors.filter((a) => a.npc).map((a) => a.key), lamps: z.act4.lamps.map((l) => l.id + (l.lit ? '*' : '')), altars: z.act4.altars.length, braziers: z.act4.braziers.filter((b) => b.lit).length, voices: z.voices.length, light: window.__act4.heroLightR() }; });
    // Isarn and Brokka at the Dark Beacon
    await pg.evaluate(() => { const G = window.__G, a = G.actors.find((x) => x.key === 'isarn'); G.player.x = a.x; G.player.z = a.z + 2; window.__D.emit('talk', 'wayfarer', a); });
    await A4.dialogs(pg, 6);
    await pg.evaluate(() => { const G = window.__G; window.__D.emit('talk', 'brokka', G.actors.find((x) => x.key === 'brokka')); });
    await A4.dialogs(pg, 3); await pg.evaluate(() => window.__D.closePanel());
    // the five lamps: each a short touch, a pool of light, a place to wake, and a memory in white ash
    const lamps = [];
    for (const id of ['l1', 'l2', 'l3', 'l4', 'l5']) {
      await pg.evaluate((id) => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'waylamp' && i.id === id), f = G.zone.map.nearestFloor(it.x + 1.4, it.z + 1.4); G.player.x = f.x; G.player.z = f.z; it.use(); }, id);
      await pg.waitForFunction(() => !!window.__G.cine || document.querySelector('#dialog:not([hidden])'), null, { timeout: 30000 }).catch(() => {});
      await pg.waitForTimeout(1200);
      const mid = await pg.evaluate(() => ({ ash: document.body.classList.contains('memory-ash'), who: document.querySelector('#dialog .who')?.textContent, figs: window.__G.zone.actors.filter((a) => a.npc && ['isarnBoy', 'arna', 'arnaOld', 'ivarGhost'].includes(a.npc)).map((a) => a.npc) }));
      if (id === 'l5') await shot();
      await A4.dialogs(pg, 8);
      await pg.waitForFunction(() => !window.__G.cine, null, { timeout: 60000 });
      await pg.waitForTimeout(600);
      lamps.push(await pg.evaluate((id) => { const G = window.__G, F = G.hero.flags, it = G.zone.interact.find((i) => i.kind === 'waylamp' && i.id === id); return { id, mid: 0, lit: it.lit, lamp: !!F['lamp_' + id], mem: !!F['mem_' + id], pool: !!window.__act4.getLightPool('lamp:' + id), buff: Math.round(G.player.buffs.memory || 0), ash: document.body.classList.contains('memory-ash'), quest: G.hero.quest }; }, id));
      lamps[lamps.length - 1].mid = mid;
    }
    await pg.waitForTimeout(3000);
    const after = await pg.evaluate(() => { const G = window.__G, z = G.zone; return { quest: G.hero.quest, checkpoint: z.checkpoint && [+z.checkpoint.x.toFixed(1), +z.checkpoint.z.toFixed(1)], hook: z.actors.some((a) => a.key === 'isarnHook'), camp: z.actors.some((a) => a.key === 'isarn'), voices: z.voices.filter((v) => v.done).length }; });
    // a lamp put out (as a Smoke-eater would) and lit again by a touch
    const snuff = await pg.evaluate(() => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'waylamp' && i.id === 'l2'); it.snuff(); return { lit: it.lit, used: it.used, prompt: it.prompt, pool: !!window.__act4.getLightPool('lamp:l2') }; });
    await pg.evaluate(() => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'waylamp' && i.id === 'l2'), f = G.zone.map.nearestFloor(it.x + 1.4, it.z + 1.4); G.player.x = f.x; G.player.z = f.z; it.use(); });
    await pg.waitForTimeout(2200);
    snuff.relit = await pg.evaluate(() => { const it = window.__G.zone.interact.find((i) => i.kind === 'waylamp' && i.id === 'l2'); return { lit: it.lit, pool: !!window.__act4.getLightPool('lamp:l2') }; });
    // Isarn at the empty hook
    await pg.evaluate(() => { const G = window.__G, a = G.actors.find((x) => x.key === 'isarnHook'); if (a) window.__D.emit('talk', 'wayfarer', a); });
    await A4.dialogs(pg, 5);
    // the three altars: the Throne taken, the Forge and the Unfading refused
    const armor0 = await pg.evaluate(() => window.__G.stats.armor);
    const altars = [];
    for (const [id, pick] of [['throne', 'taken'], ['forge', 'refused'], ['unfading', 'refused']]) {
      await pg.evaluate((id) => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'altar' && i.id === id), f = G.zone.map.nearestFloor(it.x, it.z); G.player.x = f.x; G.player.z = f.z; it.use(); }, id);
      await A4.dialogs(pg, 3, () => window.__G.panel === 'altar');
      const panel = await pg.evaluate(() => ({ panel: window.__G.panel, cards: [...document.querySelectorAll('[data-a^="gift:"]')].map((e) => e.dataset.a) }));
      if (id === 'throne') await shot();
      await pg.click(`[data-a="gift:${pick}"]`).catch(() => {});
      await pg.waitForTimeout(600);
      altars.push(await pg.evaluate((id) => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'altar' && i.id === id); return { id, gift: G.hero.flags.gifts?.[id], state: it.mesh.userData.state, used: it.used }; }, id));
      altars[altars.length - 1].panel = panel;
    }
    const gifts = await pg.evaluate((a0) => ({ armor0: a0, armor: window.__G.stats.armor, unbound: !!window.__G.hero.flags.unbound }), armor0);
    // she falls: she wakes at the last lamp she lit
    await pg.evaluate(() => { const G = window.__G; window.__immortal = false; G.player.dead = true; window.__D.emit('respawn', false); });
    await pg.waitForFunction(() => window.__G.zone?.id === 'ashfield' && !document.getElementById('fade')?.classList.contains('on') && !window.__G.player.dead, null, { timeout: 60000 });
    await pg.waitForTimeout(800);
    const wake = await pg.evaluate(() => { const G = window.__G, c = G.zone.checkpoint; window.__immortal = true; return { d: +Math.hypot(G.player.x - c.x, G.player.z - c.z).toFixed(1) }; });
    // the packs (the Ash-Fallen line, the bowmen, the Lampless, the Smoke-eaters, the ticks, the Ashwing)
    const n = await pg.evaluate(() => { const z = window.__G.zone; for (const p of z.packs) p.spawned = false; return z.packs.length; });
    for (let i = 0; i < n; i += 2) {
      await pg.evaluate((i) => { const G = window.__G, p = G.zone.packs[i]; const f = G.zone.map.nearestFloor(p.x, p.z + 5); G.player.x = f.x; G.player.z = f.z; }, i);
      for (let k = 0; k < 10; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; G.player.hp = G.player.hpMax; window.__D.IN.events.push({ t: 'skill', i: [0, 0, 1, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(300); }
      if (i % 6 === 0) await shot();
    }
    return pg.evaluate((o) => { const G = window.__G, kinds = {}; for (const a of G.actors) if (a.team === 'foe' && !a.prop && !a.dead) kinds[a.kind] = (kinds[a.kind] || 0) + 1; return { ...o, kills: G.hero.stats.kills, lvl: G.hero.level, alive: kinds, says: window.__says.slice(0, 40) }; }, { q17, town, field, lamps, after, snuff, altars, gifts, wake });
  } },
  // Ivar at the Anvil Gate, fought to the end: his Dark (the braziers relit by hand), his son's light, the three falters, his
  // last words, the Last Lamp lit, the Lampless kneeling, the gate open, quest 20
  ivar: { q: 'auto=ashfield&sim=6&q=1&norender&lvl=24&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    await A4.listen(pg);
    await pg.evaluate(() => { const G = window.__G, h = G.hero; window.__immortal = true; h.quest = 19; for (const id of ['l1', 'l2', 'l3', 'l4', 'l5']) { h.flags['lamp_' + id] = true; h.flags['mem_' + id] = true; } Object.assign(h.flags, { act3: true, fireTaken: true }); window.__D.enterZone('ashfield', { fresh: true }); const z = G.zone, b = z.L.boss; for (const p of z.packs) p.spawned = true; const f = z.map.nearestFloor(b.x + 2.5, b.z + 3); G.player.x = f.x; G.player.z = f.z; G.player.hp = G.player.hpMax = 99999; });
    // (a little off the axis: the Last Lamp in the middle of the plaza would hide him from straight south)
    await pg.waitForTimeout(3500); await shot();
    const swing = async (n) => { for (let k = 0; k < n; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(350); } };
    await swing(16);
    const p0 = await pg.evaluate(() => { const b = window.__G.zone.boss; return b && { hp: Math.round(b.hp / b.hpMax * 100), phase: b.phase, awake: b.awake, moves: Object.keys(b.mcd || {}) }; });
    // past 60%: the Dark
    await A4.hit(pg, 0.6);
    await pg.waitForTimeout(2500);
    const p1 = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss, z = G.zone; return { phase: b.phase, shrouded: b.shrouded, light: window.__act4.heroLightR(), braziers: z.act4.braziers.filter((x) => x.lit).length }; });
    await shot();
    // the hero lights the three braziers again, one touch each
    for (let i = 0; i < 3; i++) {
      await pg.evaluate((i) => { const G = window.__G, it = G.zone.act4.braziers[i], f = G.zone.map.nearestFloor(it.x + 1.5, it.z + 1.5); G.player.x = f.x; G.player.z = f.z; G.player.act = null; it.use(); }, i);
      await pg.waitForTimeout(1600);
      await pg.evaluate((i) => { const it = window.__G.zone.act4.braziers[i]; if (!it.lit) it.relight(); }, i);
    }
    // (his Lantern Sweep may have put one out again meanwhile: all three burning at once is what blinds him)
    await pg.evaluate(() => { for (const it of window.__G.zone.act4.braziers) if (!it.lit) it.relight(); });
    await pg.waitForTimeout(500);
    const blind = await pg.evaluate(() => { const b = window.__G.zone.boss; return { allLit: b.allLit, dazed: b.dazed > 0, unshroud: b.unshroud > 0, braziers: window.__G.zone.act4.braziers.filter((x) => x.lit).length }; });
    // past 30%: Remembering. Isarn runs in from the Graves; his lantern ends the dark
    await A4.hit(pg, 0.3);
    await pg.waitForTimeout(6000); await shot();
    const p2 = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss, I = G.zone.ivarIsarn; return { phase: b.phase, dark: b.dark, gold: !!window.__act4.getLightPool('ivarGold'), light: window.__act4.heroLightR(), isarn: I && +Math.hypot(I.x - b.x, I.z - b.z).toFixed(1) }; });
    for (const f of [0.24, 0.17, 0.09]) { await pg.evaluate((f) => { const b = window.__G.zone.boss; b.dazed = 0; b.hp = b.hpMax * f; }, f); await pg.waitForTimeout(900); }
    const falters = await pg.evaluate(() => window.__G.zone.boss.falters);
    // his death: the twist, the lantern's laugh, the Last Lamp, the gate
    await A4.hit(pg, null);
    await pg.waitForFunction(() => !!window.__G.cine, null, { timeout: 20000 }).catch(() => {});
    await pg.waitForTimeout(2000); await shot();
    const words = [];
    for (let i = 0; i < 40; i++) { const w = await pg.evaluate(() => document.querySelector('#dialog:not([hidden]) .txt')?.textContent?.slice(0, 30)); if (w && words[words.length - 1] !== w) words.push(w); await A4.enter(pg); await pg.waitForTimeout(300); if (await pg.evaluate(() => !window.__G.cine && !document.querySelector('#dialog:not([hidden])') && window.__G.hero.flags.ivar)) break; }
    await pg.waitForFunction(() => !window.__G.cine && window.__G.hero.quest >= 20, null, { timeout: 90000 }).catch(() => {});
    await pg.waitForTimeout(1500); await shot();
    return pg.evaluate((o) => { const G = window.__G, z = G.zone, F = G.hero.flags, gate = z.L.gate; return { ...o, falters: o.falters, words: o.words.length, ivar: F.ivar, ivarDown: F.ivarDown, quest: G.hero.quest, gateOpen: gate.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)), gateProgress: +z.act4.gate.userData.progress.toFixed(2), lastLamp: z.act4.lastLampIt.lit, lampless: z.actors.filter((a) => a.kind === 'lampless' && !a.dead).length, isarn: z.actors.filter((a) => a.npc === 'wayfarer').length, echo: !!z.interact.find((i) => i.kind === 'echo'), exit: z.interact.find((i) => i.to === 'forge')?.locked, says: window.__says.filter((k) => /ivar|isarn|voice/.test(k)) }; }, { p0, p1, blind, p2, falters, words });
  } },
  // the Ashen Forge: the flues breathing, Brokka's camp, the three Great Bellows woken (a fire-pit snuffed and relit), the heat
  // rising, the slag plug melting, Elati at the camp, quest 21
  forge: { q: 'auto=forge&sim=6&q=1&norender&lvl=26&cls=' + (process.env.CLS || 'mage'), run: async (pg, shot) => {
    await A4.listen(pg);
    await pg.evaluate(() => { const G = window.__G, h = G.hero; window.__immortal = true; h.quest = 20; Object.assign(h.flags, { act3: true, fireTaken: true, ivar: true }); window.__D.enterZone('forge', { fresh: true }); G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; });
    await pg.waitForTimeout(1500);
    const B = await pg.evaluate(async () => { const G = window.__G, z = G.zone, Fg = await import('/src/game/forge.js'), Bd = await import('/src/world/build.js'); return { flues: (Fg.flues() || []).length, period: Fg.flues()?.[0] && Fg.fluePeriod(Fg.flues()[0]), heat: Bd.HEAT.k, bellows: z.act4.bellows.map((b) => b.id + (b.lit ? '*' : '')), npcs: z.actors.filter((a) => a.npc).map((a) => a.key), plug: !!z.act4.plug, boss: z.bossSpot?.kind || null }; });
    await pg.evaluate(() => { const G = window.__G, a = G.actors.find((x) => x.key === 'brokka'); G.player.x = a.x; G.player.z = a.z + 2; window.__D.emit('talk', 'brokka', a); });
    await A4.dialogs(pg, 4); await pg.evaluate(() => window.__D.closePanel());
    await shot();
    const runs = [];
    for (const id of [0, 1, 2]) {
      await pg.evaluate((id) => { const G = window.__G, z = G.zone, it = z.act4.bellows[id], f = z.map.nearestFloor(it.x, it.z); G.player.x = f.x; G.player.z = f.z; it.use(); }, id);
      await pg.waitForFunction(() => window.__G.zone.run?.ready, null, { timeout: 40000 }).catch(() => {});
      const r = await pg.evaluate(() => { const R0 = window.__G.zone.run; return R0 && { ready: R0.ready, t: +R0.t.toFixed(1), brokka: R0.it && +Math.hypot(window.__G.actors.find((a) => a.key === 'brokka').x - R0.b.pump.x, window.__G.actors.find((a) => a.key === 'brokka').z - R0.b.pump.z).toFixed(1) }; });
      if (id === 0) {
        // the fire-pit eaten: the hold waits until it burns again
        await pg.evaluate(() => window.__G.zone.run.it.snuff());
        await pg.waitForTimeout(800);
        await shot();
        r.out = await pg.evaluate(() => ({ paused: window.__G.zone.run.paused, out: window.__G.zone.run.out, ring: !document.getElementById('ring')?.hidden, label: document.querySelector('#ring b')?.textContent }));
        await pg.evaluate(() => { const G = window.__G, it = G.zone.run.it; G.player.act = null; it.use(); });
        await pg.waitForTimeout(1800);
        await pg.evaluate(() => { const it = window.__G.zone.run?.it; if (it && !it.lit) it.relight(); });
        r.relit = await pg.evaluate(() => window.__G.zone.run?.it.lit);
      }
      // the hold: she fights by the bellows, cuts down the Smoke-eaters that go for the fire-pit, lights it again if one
      // ate it, and (after the first seconds) the clock is moved on to the last breath
      const hold = (bump) => pg.evaluate((bump) => {
        const G = window.__G, z = G.zone, R0 = z.run, pl = G.player; if (!R0) return true;
        for (const a of z.actors) if (a.kind === 'smokeEater' && !a.dead && (a.lamp === R0.it || Math.hypot(a.x - R0.it.x, a.z - R0.it.z) < 5)) { window.__D.kill(a); window.__eaten = (window.__eaten || 0) + 1; }
        if (!R0.it.lit) { if (!pl.act) { const f = z.map.nearestFloor(R0.it.x, R0.it.z); pl.x = f.x; pl.z = f.z; R0.it.use(); } }
        else { pl.res = 100; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2][Math.floor(Math.random() * 4)], aim: null }); }
        if (bump) R0.t = Math.max(R0.t, 18.5);
        return false;
      }, bump);
      for (let k = 0; k < 6; k++) { await hold(false); await pg.waitForTimeout(450); }
      r.waves = await pg.evaluate(() => window.__G.zone.run?.wi);
      for (let k = 0; k < 80 && !(await hold(true)); k++) await pg.waitForTimeout(500);
      r.eatersCut = await pg.evaluate(() => window.__eaten || 0);
      await pg.waitForTimeout(4000);
      r.after = await pg.evaluate(async (id) => { const G = window.__G, Fg = await import('/src/game/forge.js'), Bd = await import('/src/world/build.js'); return { done: !!G.hero.flags['bellows' + id], heat: G.hero.flags.heat, heatK: +Bd.HEAT.k.toFixed(2), period: Fg.flues()?.[0] && Fg.fluePeriod(Fg.flues()[0]), quest: G.hero.quest }; }, id);
      runs.push(r);
    }
    await pg.waitForTimeout(5000); await shot();
    return pg.evaluate((o) => { const G = window.__G, z = G.zone, P0 = z.L.plug; return { ...o, plug: G.hero.flags.plug, open: P0.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)), quest: G.hero.quest, elati: z.actors.some((a) => a.key === 'elati'), boss: z.bossSpot?.kind || null, says: window.__says.filter((k) => /brokka|voice|forge/.test(k)) }; }, { B, runs });
  } },
  // Karthax at the Anvil of the Crown: his arrival (the brow-stone, the shards, the slag), the gifts taken back, the three
  // cages broken by his own Hammerfall, Isarn's light in the last fire, the beacon-keeper's answer, his death, the Unmaking
  karthax: { q: 'auto=forge&sim=6&q=1&norender&lvl=27&cls=' + (process.env.CLS || 'ranger'), run: async (pg, shot) => {
    await A4.listen(pg);
    await pg.evaluate(() => { const G = window.__G, h = G.hero; window.__immortal = window.__tough = true; h.quest = 21; Object.assign(h.flags, { act3: true, fireTaken: true, ivar: true, bellows0: true, bellows1: true, bellows2: true, heat: 3, plug: true, gifts: { throne: 'taken', forge: 'refused' } }); window.__D.refreshStats(); window.__D.enterZone('forge', { fresh: true }); const z = G.zone, b = z.L.boss; for (const p of z.packs) p.spawned = true; const f = z.map.nearestFloor(b.x, b.z + 15); G.player.x = f.x; G.player.z = f.z; G.player.hp = G.player.hpMax = 99999; });
    const armor0 = await pg.evaluate(() => window.__G.stats.armor);
    await pg.waitForTimeout(2000);
    // closer: Karthax pours himself out of the slag
    await pg.evaluate(() => { const G = window.__G, b = G.zone.L.boss, f = G.zone.map.nearestFloor(b.x, b.z + 8); G.player.x = f.x; G.player.z = f.z; });
    await pg.waitForFunction(() => !!window.__G.cine, null, { timeout: 30000 }).catch(() => {});
    const arrive = await pg.evaluate(() => { const b = window.__G.zone.boss; return { hidden: b?.hidden, hold: b?.holdWake }; });
    for (let i = 0; i < 40 && (await pg.evaluate(() => !!window.__G.cine)); i++) { await A4.enter(pg); await pg.waitForTimeout(400); if (i === 12) await shot(); }
    await pg.waitForTimeout(2500); await shot();
    arrive.after = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; return { hidden: b.hidden, hold: b.holdWake, awake: b.awake, y: b.y, browstone: G.hero.flags.browstone, lantern: G.zone.act4.npcs.isarn?.a.lantern }; });
    const swing = async (n) => { for (let k = 0; k < n; k++) { await pg.evaluate(() => { const G = window.__G; G.player.res = 100; window.__D.IN.events.push({ t: 'skill', i: [0, 1, 0, 2, 0, 4][Math.floor(Math.random() * 6)], aim: null }); }); await pg.waitForTimeout(350); } };
    await swing(12);
    // past 65%: the cages, the gifts taken back
    await A4.hit(pg, 0.65);
    await pg.waitForTimeout(4000); await shot();
    const cages = await pg.evaluate((a0) => { const G = window.__G, b = G.zone.boss; return { phase: b.phase, statues: (b.cages || []).map((s) => s.keeper + ':' + s.blows), giftsTaken: G.hero.flags.giftsTaken, armor0: a0, armor: G.stats.armor }; }, armor0);
    // stand by each statue until his Hammerfall breaks it
    for (let k = 0; k < 24; k++) {
      const left = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss, s = (b.cages || []).find((x) => !x.dead); if (!s) return 0; const a = Math.atan2(s.x - b.x, s.z - b.z), f = G.zone.map.nearestFloor(s.x - Math.sin(a) * 1.6, s.z - Math.cos(a) * 1.6); G.player.x = f.x; G.player.z = f.z; return (b.cages || []).filter((x) => !x.dead).length; });
      if (!left) break;
      await pg.waitForTimeout(2500);
    }
    const broken = await pg.evaluate(() => { const b = window.__G.zone.boss; return { cages: b.cages ? b.cages.filter((s) => !s.dead).length : 0, phase: b.phase, hp: Math.round(b.hp / b.hpMax * 100) }; });
    // the last fire: Isarn's lantern walks toward him
    await pg.evaluate(() => { const b = window.__G.zone.boss; if (b.cages) for (const s of b.cages) { s.dead = true; s.hp = 0; } b.dazed = 0; });
    await pg.waitForTimeout(6500); await shot();
    const last = await pg.evaluate(() => { const G = window.__G, z = G.zone, b = z.boss, I = z.act4.npcs.isarn?.a, P0 = window.__act4.getLightPool('isarn'); return { phase: b.phase, light: window.__act4.heroLightR(), pool: P0 && [+P0.x.toFixed(1), +P0.z.toFixed(1), P0.r], isarn: I && +Math.hypot(I.x - b.x, I.z - b.z).toFixed(1), ghosts: window.__act4.lightPools().filter((p) => p.tag === 'ghost').length }; });
    await pg.evaluate(() => { const b = window.__G.zone.boss; b.dazed = 0; b.hp = b.hpMax * 0.14; });
    await pg.waitForTimeout(5000);
    // his death, and the Unmaking
    await A4.hit(pg, null);
    await pg.waitForFunction(() => !!window.__G.cine, null, { timeout: 20000 }).catch(() => {});
    const words = [];
    for (let i = 0; i < 160; i++) {
      const w = await pg.evaluate(() => document.querySelector('#dialog:not([hidden]) .who')?.textContent);
      if (w && words[words.length - 1] !== w) words.push(w);
      await A4.enter(pg); await pg.waitForTimeout(400);
      if (i === 30 || i === 60) await shot();
      if (await pg.evaluate(() => window.__G.hero.flags.crownUnmade && !window.__G.cine)) break;
    }
    await pg.waitForTimeout(9000); await shot();
    return pg.evaluate(async (o) => { const G = window.__G, z = G.zone, F = G.hero.flags, Fg = await import('/src/game/forge.js'), Bd = await import('/src/world/build.js'); return { ...o, words: o.words, karthax: F.karthax, crownUnmade: F.crownUnmade, quest: G.hero.quest, heat: Bd.HEAT.k, flues: !!Fg.flues(), echo: !!z.interact.find((i) => i.kind === 'echo'), npcs: z.actors.filter((a) => a.npc && !a.removed).map((a) => a.npc), mode: G.mode, says: window.__says.filter((k) => /karthax|isarn|cage|u\.|k\./.test(k)) }; }, { arrive, cages, broken, last, words });
  } },
  // how long the Three Cages last (game seconds), the hero keeping by a standing statue as a player would. GIFTS=taken|refused
  // (all three); RUNS=n fights
  cagetime: { q: 'auto=forge&sim=6&q=1&norender&lvl=27&cls=' + (process.env.CLS || 'ranger'), run: async (pg) => {
    const gift = process.env.GIFTS || 'taken', out = [];
    for (let run = 0; run < +(process.env.RUNS || 3); run++) {
      await pg.evaluate((gift) => { const G = window.__G, h = G.hero; window.__immortal = window.__tough = true; h.quest = 21; Object.assign(h.flags, { act3: true, fireTaken: true, ivar: true, bellows0: true, bellows1: true, bellows2: true, heat: 3, plug: true, karthax: false, giftsTaken: false, gifts: { throne: gift, forge: gift, unfading: gift } }); window.__D.refreshStats(); window.__D.enterZone('forge', { fresh: true }); const z = G.zone, b = z.L.boss; for (const p of z.packs) p.spawned = true; const f = z.map.nearestFloor(b.x, b.z + 8); G.player.x = f.x; G.player.z = f.z; G.player.hp = G.player.hpMax = 99999; }, gift);
      await pg.waitForFunction(() => !!window.__G.cine, null, { timeout: 30000 }).catch(() => {});
      for (let i = 0; i < 40 && (await pg.evaluate(() => !!window.__G.cine || !!document.querySelector('#dialog:not([hidden])'))); i++) { await A4.enter(pg); await pg.waitForTimeout(300); }
      await pg.waitForFunction(() => window.__G.zone.boss?.awake, null, { timeout: 20000 }).catch(() => {});
      await A4.hit(pg, 0.65);
      await pg.waitForFunction(() => !!window.__G.zone.boss?.cages, null, { timeout: 20000 }).catch(() => {});
      for (let i = 0; i < 20 && (await pg.evaluate(() => !!document.querySelector('#dialog:not([hidden])'))); i++) { await A4.enter(pg); await pg.waitForTimeout(200); }
      const t0 = await pg.evaluate(() => window.__G.hero.stats.time);
      let r = null;
      for (let k = 0; k < 600; k++) {
        r = await pg.evaluate((t0) => { const G = window.__G, b = G.zone.boss, t = G.hero.stats.time - t0; if (!b.cages) return { t, done: true }; if (G.mode !== 'play') return { t };
          const pl = G.player, up = b.cages.filter((s) => !s.dead); let s = up.find((x) => x === window.__keepBy) || up.sort((p, q) => Math.hypot(p.x - pl.x, p.z - pl.z) - Math.hypot(q.x - pl.x, q.z - pl.z))[0]; window.__keepBy = s;
          if (Math.hypot(s.x - pl.x, s.z - pl.z) > 2.6) { const a = Math.atan2(s.x - b.x, s.z - b.z), f = G.zone.map.nearestFloor(s.x - Math.sin(a) * 1.8, s.z - Math.cos(a) * 1.8); pl.x = f.x; pl.z = f.z; }
          return { t, left: up.map((x) => x.keeper + x.blows).join(' ') }; }, t0);
        if (r.done || r.t > 150) break;
        await pg.waitForTimeout(250);
      }
      out.push(+r.t.toFixed(1));
    }
    return { gift, secs: out };
  } },
  // q22: the Night Without Fires in Whitecliff (the beacon cold, no far fires, the torches), Elianthe, the new fire lit from
  // Isarn's lantern, the far fires answering one by one (the fourth too), the act panel, the Unbound blessing, the staff
  ending4: { q: 'auto=town&sim=2&q=1&norender&lvl=27&cls=' + (process.env.CLS || 'ranger'), run: async (pg, shot) => {
    await A4.listen(pg);
    await pg.evaluate(() => { const G = window.__G, h = G.hero; window.__immortal = true; h.quest = 22; h.act1 = h.act2 = h.act3 = 1; h.boons = ['ember', 'forge', 'amber']; Object.assign(h.flags, { act1: true, act2: true, act3: true, after3: true, fireTaken: true, ivar: true, plug: true, heat: 3, karthax: true, crownUnmade: true, giftsTaken: true, gifts: { throne: 'refused', forge: 'refused', unfading: 'refused' }, unbound: true }); window.__D.refreshStats(); window.__D.enterZone('town', { fresh: true }); });
    await pg.waitForTimeout(1200);
    const night = await pg.evaluate(() => { const G = window.__G, z = G.zone, R = window.__R; return { beaconOn: z.town.beaconOn, beaconLight: [...R.sources].some((s) => s.key === 'beacon'), far: z.town.far.filter(Boolean).length, torches: z.actors.filter((a) => a.npc === 'villager' && a.avatar?.held.R).length, isarn: z.actors.some((a) => a.npc === 'wayfarer'), beacon: !!z.interact.find((i) => i.kind === 'beacon') }; });
    await pg.waitForTimeout(1500);
    const elianthe = await pg.evaluate(() => document.querySelector('#dialog:not([hidden]) .txt')?.textContent);
    await A4.dialogs(pg, 3); await shot();
    const crit0 = await pg.evaluate(() => window.__G.stats.critC);
    await pg.evaluate(() => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'beacon'); G.player.x = it.x; G.player.z = it.z + 1; it.use(); });
    await pg.waitForFunction(() => !!window.__G.cine, null, { timeout: 20000 });
    const at = (t) => pg.waitForFunction((t) => !window.__G.cine || window.__G.cine.t >= t, t, { timeout: 180000 });
    await at(3); await shot();
    await at(9); await shot();
    await pg.waitForFunction(() => !window.__G.cine, null, { timeout: 120000 });
    await pg.waitForTimeout(1500); await shot();
    const act = await pg.evaluate(() => ({ panel: window.__G.panel, done: document.querySelector('.act-h')?.textContent, sub: document.querySelector('#panel .pn-b p')?.textContent, next: [...document.querySelectorAll('#panel .muted')].map((e) => e.textContent).pop() }));
    await pg.click('[data-a="close"]').catch(() => {}); await pg.waitForTimeout(3000); await shot();
    const boon = await pg.evaluate(() => ({ panel: window.__G.panel, title: document.querySelector('.act-h')?.textContent, unbound: document.querySelector('.unbound-k')?.textContent, cards: [...document.querySelectorAll('[data-a^="boon:"]')].map((e) => e.dataset.a + ' ' + e.querySelector('p')?.textContent) }));
    await pg.click('[data-a="boon:lantern"]').catch(() => {}); await pg.waitForTimeout(1500);
    const lit = await pg.evaluate((c0) => { const G = window.__G, z = G.zone, R = window.__R; return { newFire: G.hero.flags.newFire, beaconLight: [...R.sources].some((s) => s.key === 'beacon'), far: z.town.far.filter(Boolean).length, torches: z.actors.filter((a) => a.npc === 'villager' && a.avatar?.held.R).length, staff: !!z.town.staff, crit0: +c0.toFixed(1), crit: +G.stats.critC.toFixed(1), boons: G.hero.boons, quest: G.hero.quest, act4: G.hero.act4, flag: G.hero.flags.act4 }; }, crit0);
    // the staff: «Rest.», and the Shadow Gates
    await pg.evaluate(() => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'staff'); G.player.x = it.x; G.player.z = it.z + 1.5; it.use(); });
    await pg.waitForTimeout(2500);
    lit.staffPanel = await pg.evaluate(() => window.__G.panel);
    return { night, elianthe, act, boon, lit, says: await pg.evaluate(() => window.__says) };
  } },
  // Act IV's cast lined up on the Field (no fighting); &ZONE=forge to see them in the Forge
  cast4: { q: 'auto=' + (process.env.ZONE || 'ashfield') + '&sim=1&q=' + (process.env.Q || '1') + '&lvl=23&cls=warden', run: async (pg, shot) => {
    await pg.evaluate(async () => {
      const G = window.__G, gfx = await import('/src/gfx/gfx.js'); window.__immortal = true;
      for (const a of G.actors) if (a.team === 'foe') a.dead = true;
      for (const p of G.zone.packs) p.spawned = true;
      G.zone.bossSpawned = true;
      const ids = ['lampless', 'ashSpear', 'ashDwarf', 'ashBow', 'smokeEater', 'ashwing', 'emberTick', 'ashsmith', 'hammerhorn', 'ivar', 'karthax'];
      const c = G.zone.L.spots.camp || G.zone.L.spots.waypoint;
      ids.forEach((id, i) => { const f = G.zone.map.nearestFloor(c.x - 12 + i * 2.4, c.z - 3); const m = window.__D.spawnMonster(id, f.x, f.z, { surface: true, free: true, dormant: false }); m.dormant = true; m.disguised = false; m.under = false; m.y = 0; m.airborne = false; m.aggro = false; if (m.avatar) m.avatar.group.visible = true; m.rot = 0; G.actors.push(m); });
      const h = G.zone.map.nearestFloor(c.x, c.z + 6); G.player.x = h.x; G.player.z = h.z;
      gfx.R.cam.dist = 25; gfx.updateCamera(0, c.x, c.z + 1, true);
    });
    await pg.waitForTimeout(2500); await shot();
    return pg.evaluate(() => window.__G.actors.filter((a) => a.team === 'foe' && !a.dead).map((a) => a.kind + ':' + (a.avatar?.modelName || '-')));
  } },
  // after the Unmaking: the Last Lamp raises an echo of Ivar, the cold Anvil one of Karthax; fought again, no story touched
  echo4: { q: 'auto=ashfield&sim=6&q=1&norender&lvl=27&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    await A4.listen(pg);
    const out = {};
    for (const zid of ['ashfield', 'forge']) {
      // (all four blessings chosen: an act done without one opens the blessing panel, which pauses the game)
      await pg.evaluate((zid) => { const G = window.__G, h = G.hero; window.__immortal = true; h.quest = 23; h.act1 = h.act2 = h.act3 = h.act4 = 1; h.boons = ['ember', 'forge', 'amber', 'lantern']; window.__D.closePanel(); Object.assign(h.flags, { act3: true, act4: true, fireTaken: true, ivar: true, bellows0: true, bellows1: true, bellows2: true, heat: 3, plug: true, karthax: true, crownUnmade: true, newFire: true, giftsTaken: true }); window.__D.enterZone(zid, { fresh: true }); G.player.hp = G.player.hpMax = 99999; for (const p of G.zone.packs) p.spawned = true; }, zid);
      await pg.waitForTimeout(1500);
      const before = await pg.evaluate(() => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'echo'); if (!it) return { echo: false }; const f = z.map.nearestFloor(it.x, it.z + 2); G.player.x = f.x; G.player.z = f.z; it.use(); it.use(); return { echo: it.boss, prompt: window.__D.t(it.prompt), foes: z.actors.filter((a) => a.boss).length, braziers: z.act4.braziers?.filter((b) => b.lit).length }; });
      await pg.waitForTimeout(3500); await shot();
      const spawned = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; return b && { kind: b.kind, echo: b.echo, awake: b.awake, bar: G.bossActor === b, d: +Math.hypot(b.x - G.player.x, b.z - G.player.z).toFixed(1), hold: !!b.holdWake }; });
      for (let k = 0; k < 18; k++) {
        const st = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; if (!b || b.dead) return 'dead'; b.dazed = 0; if (b.cages) { for (const s of b.cages) { s.dead = true; s.hp = 0; } return 'cages'; } b.hpFloor = 0; window.__D.kill(b); return b.dead ? 'dead' : 'hit'; });
        if (st === 'dead') break;
        await pg.waitForTimeout(1200);
      }
      await pg.waitForTimeout(4000); await shot();
      out[zid] = await pg.evaluate((o) => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'echo'); return { ...o, dead: z.boss?.dead, bar: !!G.bossActor, quest: G.hero.quest, crownUnmade: G.hero.flags.crownUnmade, ivar: G.hero.flags.ivar, used: it?.used, mode: G.mode, dialog: !document.querySelector('#dialog')?.hidden, loot: G.pickups.filter((p) => p.item).length, toast: [...document.querySelectorAll('.toast')].map((e) => e.textContent).pop() }; }, { before, spawned });
    }
    return out;
  } },
  // the progression panels (run at 844 390 for a phone): skills, a variant, the loadout, Mastery
  progpanel: { q: 'auto=town&sim=2&q=1&lvl=' + (process.env.LVL || 50) + '&mlvl=' + (process.env.MLVL || 12) + '&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    const P = () => pg.evaluate(() => { const h = window.__G.hero; return { pts: h.points, skills: h.skills, vars: h.vars, variant: h.variant, loadout: h.loadout, mast: h.mast }; });
    await pg.evaluate(() => { window.__G.hero.gold = 99999; window.__D.openPanel('skills'); }); await pg.waitForTimeout(500); await shot();
    const ids = await pg.evaluate(() => window.__G.hero.loadout.slice());
    // rank the first skill to 5, learn both variants, choose the second
    for (let k = 0; k < 4; k++) await pg.click(`[data-a="prank:${ids[0]}"]`).catch(() => {});
    const V = await pg.evaluate(async (id) => (await import('/src/game/data.js')).VARIANTS[id], ids[0]);
    await pg.click(`[data-a="pvar:${ids[0]}:1"]`); await pg.click(`[data-a="pvar:${ids[0]}:2"]`); await pg.waitForTimeout(200); await shot();
    await pg.click(`[data-a="pvar:${ids[0]}:2"]`); await pg.waitForTimeout(200); await shot();
    // a later skill on button 2
    const late = await pg.evaluate(async () => (await import('/src/game/data.js')).SKILLS[window.__G.hero.cls].filter((s) => s.lvl >= 20).map((s) => s.id));
    await pg.click(`[data-a="psel:${late[0]}"]`); await pg.click('[data-a="pslot:2"]'); await pg.waitForTimeout(200); await shot();
    await pg.click('[data-a="ptab:1"]'); await pg.waitForTimeout(200); await shot();
    await pg.click('[data-a="mup:might:5"]').catch(() => {}); await pg.click('[data-a="mup:vigor:1"]'); await pg.click('[data-a="mup:aim:1"]'); await pg.waitForTimeout(200); await shot();
    const before = await P();
    await pg.click('[data-a="respec"]'); await pg.click('[data-a="respec"]'); await pg.waitForTimeout(200); await shot();
    const after = await P();
    await pg.evaluate(() => window.__D.closePanel()); await pg.waitForTimeout(400); await shot();
    return { V, late, before, after };
  } },
  // every skill, variant and later skill of a class, cast at a ring of sturdy dummies (one shot each, at its peak), with the
  // damage each cast did to them: CLS=warden|ranger|mage, ONLY=id[.variant],... to pick
  skillsfx: { q: 'auto=forest&sim=4&q=1&lvl=45&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    const list = await pg.evaluate(async (only) => {
      const D = await import('/src/game/data.js'), G = window.__G, out = [];
      for (const sk of D.SKILLS[G.hero.cls]) { if (sk.basic) continue; out.push({ id: sk.id, v: 0 }); (D.VARIANTS[sk.id] || []).forEach((n, i) => out.push({ id: sk.id, v: i + 1, n })); }
      window.__wait = (sec) => new Promise((ok) => { const t0 = G.hero.stats.time, w0 = performance.now(); const f = () => (G.hero.stats.time - t0 >= sec || performance.now() - w0 > 400000 ? ok() : setTimeout(f, 20)); f(); });
      return only ? out.filter((e) => only.split(',').includes(e.n ? e.id + '.' + e.n : e.id)) : out;
    }, process.env.ONLY || '');
    await pg.evaluate(() => { window.__immortal = true; const G = window.__G; for (const p of G.zone.packs) p.spawned = true; for (const a of G.actors) if (a.team === 'foe') { a.dead = true; a.remove(); } });
    const res = {}, errs = [];
    for (const e of list) {
      await pg.evaluate((e) => {
        const G = window.__G, h = G.hero, pl = G.player;
        for (const a of G.actors) if (a.dummy || (a.pet && !a.dead)) { a.dead = true; a.remove(); }
        G.actors = G.actors.filter((a) => !a.removed);
        h.skills[e.id] = 5; h.vars[e.id] = 3; h.variant[e.id] = e.v; { const j = h.loadout.indexOf(e.id); if (j > 0) h.loadout[j] = h.loadout[0]; h.loadout[0] = e.id; }
        pl.res = G.stats.resMax; pl.cds.fill(0); pl.act = null; pl.twinT = 0; for (const k in pl.buffs) delete pl.buffs[k]; pl.shield = 0;
        const far = G.hero.cls === 'warden' ? 2.2 : 7, fx = pl.x + Math.sin(pl.rot) * far, fz = pl.z + Math.cos(pl.rot) * far;
        window.__dum = [];
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9, r = i ? (G.hero.cls === 'warden' ? 1.6 : 2.2) : 0, x = fx + Math.sin(a) * r, z = fz + Math.cos(a) * r;
          if (!G.zone.map.walkable(x, z)) continue;
          const m = window.__D.spawnMonster(i % 3 ? 'goblin' : 'skeleton', x, z, { level: 45 }); m.hp = m.hpMax = 1e7; m.dummy = true; m.status.stun = 99;
          G.actors.push(m); window.__dum.push(m);
        }
        window.__D.emit('loadout');
      }, e);
      await pg.evaluate(() => window.__wait(0.3));
      await pg.evaluate(() => { const G = window.__G, d = window.__dum[0]; window.__D.IN.events.push({ t: 'skill', i: 1, aim: d ? { x: d.x, z: d.z } : null }); });
      const at = { leap: 0.6, quake: 0.75, meteor: 1.15, rain: 0.9, wolf: 1.2, cry: 0.45, nova: 0.3, dawn: 1.25, bulwark: 1.0, trap: 1.0, hawks: 2.0, rift: 1.2, beam: 0.9, frostorb: 0.8, charge: 0.25, vault: 0.3, multi: 0.3, pierce: 0.4, fireball: 0.5, chain: 0.3, whirl: 0.8 }[e.id] ?? 0.4;
      await pg.evaluate((s) => window.__wait(s), at); await shot();
      // what follows the cast (a channel, a storm, a trap) plays out, then the books
      await pg.evaluate((s) => window.__wait(s), e.id === 'bulwark' ? 11 : e.id === 'hawks' ? 10 : e.id === 'wolf' ? 8 : 4);
      res[e.n ? e.id + '.' + e.n : e.id] = await pg.evaluate(() => { const d = window.__dum; return { dealt: Math.round(d.reduce((s, a) => s + (a.hpMax - Math.max(0, a.hp)), 0)), hit: d.filter((a) => a.hp < a.hpMax).length, n: d.length }; });
    }
    return res;
  } },
  // Act V with the progression: every skill and variant of a class (CLS) cast on the Farthest Light's thin ice, each time on
  // ice reset to stage 0 round her: the stages it adds in 3 s (less what her own weight adds standing there as long), the
  // stage under her after it, and for the Novas the stage-2 cells round her they heal; then the Cold under Ember Dance
  // against the plain Whirlwind (a fire that follows her never warms her) and a downed hero's following effects
  skills5: { q: 'auto=farlight&sim=4&q=0&norender&lvl=45&cls=' + (process.env.CLS || 'warden') + '&' + A5.url('alkShip'), run: async (pg) => {
    await A5.tick(pg);
    const list = await pg.evaluate(async () => {
      const D = await import('/src/game/data.js'), G = window.__G, out = [];
      for (const sk of D.SKILLS[G.hero.cls]) { if (sk.basic) continue; out.push({ id: sk.id, v: 0 }); (D.VARIANTS[sk.id] || []).forEach((n, i) => out.push({ id: sk.id, v: i + 1, n })); }
      window.__wait = (sec) => new Promise((ok) => { const t0 = G.hero.stats.time, w0 = performance.now(); const f = () => (G.hero.stats.time - t0 >= sec || performance.now() - w0 > 400000 ? ok() : setTimeout(f, 20)); f(); });
      window.__immortal = true;
      for (const p of G.zone.packs || []) p.spawned = true;
      for (const a of G.actors) if (a.team === 'foe' && !a.boss) { a.dead = true; a.remove(); }
      G.actors = G.actors.filter((a) => !a.removed);
      // a spot of thin ice 9 m round, out of lamp light, and a heading along it
      const L = G.zone.L, I = G.zone.ice, LT = await import('/src/game/light.js'), w = L.w;
      const thin = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z); return ix >= 0 && iz >= 0 && ix < w && iz < L.h && L.ice[iz * w + ix] && !L.thick?.[iz * w + ix] && !LT.lampLightAt(x, z); };
      let best = null;
      for (let i = 0; i < L.ice.length && !best; i += 3) {
        if (!L.ice[i]) continue;
        const x = i % w + 0.5, z = (i - i % w) / w + 0.5;
        let ok = thin(x, z);
        for (let k = 0; k < 16 && ok; k++) for (const r of [3, 6, 9]) if (!thin(x + Math.sin(k * 0.39) * r, z + Math.cos(k * 0.39) * r)) { ok = false; break; }
        if (ok) best = { x, z };
      }
      window.__spot = best;
      window.__reset = (st = 0) => { const S = window.__spot; for (let cz = Math.floor(S.z - 14); cz <= S.z + 14; cz++) for (let cx = Math.floor(S.x - 14); cx <= S.x + 14; cx++) { const i = cz * w + cx; if (cx < 0 || cz < 0 || cx >= w || cz >= L.h || !L.ice[i]) continue; I.stage[i] = Math.hypot(cx + 0.5 - S.x, cz + 0.5 - S.z) < 6 ? st : 0; I.load[i] = 0; I.fl[i] = 0; } I.dirty = true; I.live.length = 0; I.hit.length = 0; I.reo.length = 0; };
      window.__sum = () => { const S = window.__spot; let n = 0, hi = 0; for (let cz = Math.floor(S.z - 14); cz <= S.z + 14; cz++) for (let cx = Math.floor(S.x - 14); cx <= S.x + 14; cx++) { const i = cz * w + cx; if (cx < 0 || cz < 0 || cx >= w || cz >= L.h || !L.ice[i]) continue; const s = I.stage[i]; if (s >= 1 && s <= 4) { n += s; hi++; } } return { stages: n, cells: hi }; };
      return out;
    });
    const spot = await pg.evaluate(() => window.__spot);
    if (!spot) return { pass: false, error: 'no thin-ice spot' };
    const place = async (e) => { await pg.evaluate((e) => {
      const G = window.__G, h = G.hero, pl = G.player, S = window.__spot;
      for (const a of G.actors) if (a.pet && !a.dead) { a.dead = true; a.remove(); }
      for (const a of G.areas) if (a.team === 'hero') { if (a.kind === 'custom') a.done = true; else a.t = a.dur + 1; }
      for (const a of G.actors) if (a.dummy) { a.dead = true; a.remove(); }
      G.actors = G.actors.filter((a) => !a.removed);
      // (a sturdy dummy 6 m ahead, that the shots land on and the bolts are aimed at)
      const m = window.__D.spawnMonster('skeleton', S.x, S.z + 6, { level: 45 }); m.hp = m.hpMax = 1e8; m.dummy = true; m.status.stun = 99; G.actors.push(m);
      if (e) { h.skills[e.id] = 5; h.vars[e.id] = 3; h.variant[e.id] = e.v; const j = h.loadout.indexOf(e.id); if (j > 0) h.loadout[j] = h.loadout[0]; h.loadout[0] = e.id; window.__D.emit('loadout'); }
      pl.x = S.x; pl.z = S.z; pl.rot = 0; pl.y = 0; pl.res = G.stats.resMax; pl.cds.fill(0); pl.act = null; pl.twinT = 0; for (const k in pl.buffs) delete pl.buffs[k]; pl.shield = 0; pl.inWater = null;
    }, e);
    await pg.evaluate((pre) => window.__wait(0.15).then(() => window.__reset(pre)), e?.pre || 0); };
    const res = {};
    await place(null); await pg.evaluate(() => window.__wait(3)); const base = await pg.evaluate(() => window.__sum());
    for (const e of list) {
      e.pre = e.id === 'nova' ? 2 : 0;
      await place(e);
      const s0 = await pg.evaluate(() => window.__sum());
      await pg.evaluate(() => { const S = window.__spot; window.__D.IN.events.push({ t: 'skill', i: 1, aim: { x: S.x, z: S.z + 6 } }); });
      await pg.evaluate(() => window.__wait(3));
      const r = await pg.evaluate(() => { const G = window.__G, pl = G.player, I = (async () => 0)(); return { sum: window.__sum(), under: (G.zone.ice.stage[Math.floor(pl.z) * G.zone.L.w + Math.floor(pl.x)] || 0), moved: +Math.hypot(pl.x - window.__spot.x, pl.z - window.__spot.z).toFixed(1) }; });
      res[e.n ? e.id + '.' + e.n : e.id] = e.pre ? { healed: s0.cells - r.sum.cells, under: r.under } : { added: r.sum.stages - base.stages, cells: r.sum.cells, under: r.under, moved: r.moved };
    }
    // the Cold (Warden only): 3 s of each spin from Cold 50 on dry ice, no gust
    let cold = null;
    if (await pg.evaluate(() => window.__G.hero.cls === 'warden')) {
      cold = {};
      for (const v of [0, 2]) {
        await place({ id: 'whirl', v });
        cold[v ? 'ember' : 'whirl'] = await pg.evaluate(async () => {
          const C = await import('/src/game/cold.js'), G = window.__G; if (G.zone.gust) G.zone.gust.on = false;
          C.COLD.v = 50; window.__D.IN.events.push({ t: 'skill', i: 1, aim: null });
          await window.__wait(2.5); return +C.COLD.v.toFixed(1);
        });
      }
    }
    // a downed hero: what follows her ends with no burst (Bulwark for the Warden, Hawks for the Ranger, Blizzard for the Mage)
    const fol = { warden: { id: 'bulwark', v: 0 }, ranger: { id: 'hawks', v: 0 }, mage: { id: 'nova', v: 2 } }[await pg.evaluate(() => window.__G.hero.cls)];
    await place(fol);
    await pg.evaluate(() => window.__D.IN.events.push({ t: 'skill', i: 1, aim: null }));
    await pg.evaluate(() => window.__wait(1.2));
    const down = await pg.evaluate(async () => { const G = window.__G, pl = G.player, n0 = G.areas.filter((a) => a.kind === 'custom').length; window.__immortal = false; pl.dead = true; await window.__wait(0.5); const n1 = G.areas.filter((a) => a.kind === 'custom').length; pl.dead = false; window.__immortal = true; return { before: n0, after: n1, shield: pl.shield || 0 }; });
    const cracks = Object.entries(res).filter(([k, v]) => v.added != null);
    const zero = cracks.filter(([k, v]) => v.added <= 0).map(([k]) => k), selfBreak = Object.entries(res).filter(([k, v]) => v.under >= 4).map(([k]) => k);
    const novas = Object.entries(res).filter(([k, v]) => v.healed != null && v.healed < 20).map(([k]) => k);
    return { pass: !selfBreak.length && !novas.length && (!cold || cold.ember >= cold.whirl - 3) && down.after === 0, spot, base, res, cold, down, selfBreak, novasWeak: novas, noCrack: zero };
  } },
  // saves into this line: a version-13 hero (Acts I-IV with the progression: Mastery, variants, a later skill on a button,
  // no Act V field), an Act V hero of this line from before the progression (on the Skotos difficulty, the Farthest Light
  // reached), and one whose points disagree with its books; each taken up from the title, its panel opened
  save13: { q: 'q=0&sim=2&norender', run: async (pg) => {
    const now = Date.now(), base = (o) => Object.assign({ xp: 0, gold: 5000, inv: new Array(32).fill(null), equip: {}, stash: new Array(48).fill(null), wps: ['town', 'forest', 'crypt', 'pass', 'halls', 'weep', 'heart', 'ashfield', 'forge'], act1: 1, act2: 1, act3: 1, act4: 1, gateBest: 3, boons: ['ember', 'forge', 'amber', 'lantern'], stats: { kills: 5000, deaths: 9, time: 90000, legs: 4, elites: 120 }, created: now, played: now, seeds: {} }, o);
    const flags4 = Object.fromEntries(A5.ACT4.map((k) => [k, true])), flags5 = Object.fromEntries([...A5.ACT4, ...A5.flagsTo('alkShip')].map((k) => [k, true]));
    const heroes = [
      base({ id: 'hV13', cls: 'ranger', level: 50, diff: 3, quest: 23, flags: flags4, mlvl: 12, mxp: 5000, points: 61 - 28 - 4 - 15,
        skills: { multi: 5, rain: 5, wolf: 5, pierce: 5, trap: 5, vault: 5, hawks: 5 }, vars: { rain: 3, multi: 1 }, variant: { rain: 2, multi: 1 }, mast: { might: 10, leech: 5 }, loadout: ['hawks', 'rain', 'multi', 'vault'] }),
      base({ id: 'hAct5', cls: 'warden', level: 36, diff: 5, quest: 28, flags: flags5, act5: -1, points: 4, skills: { whirl: 5, leap: 5, cry: 5, quake: 5 }, wps: ['town', 'forest', 'crypt', 'pass', 'halls', 'weep', 'heart', 'ashfield', 'forge', 'coast', 'farlight'], boons: ['ember', 'forge', 'amber', 'lantern'] }),
      base({ id: 'hOdd', cls: 'mage', level: 30, diff: 1, quest: 23, flags: flags4, mlvl: 0, points: 99, skills: { fireball: 5, nova: 3 }, vars: { fireball: 2 }, variant: { fireball: 2 }, mast: { might: 3 }, loadout: ['fireball', 'nova', 'nova', 'bogus'] })
    ];
    // (the page keeps its own save in G.save and writes it as it goes: it is given this one too, or it writes its own over it)
    await pg.evaluate((heroes) => { const s = { heroes, settings: { helpSeen: true }, last: heroes[0].id }; localStorage.setItem('skotos.save.v1', JSON.stringify(s)); window.__G.save = JSON.parse(JSON.stringify(s)); }, heroes);
    const out = {};
    for (const h of heroes) {
      await pg.goto(A5.base + '?q=0&sim=2&norender');
      await pg.waitForFunction(() => window.__ready && window.__G?.save, null, { timeout: 240000 });
      await pg.evaluate((id) => window.__D.emit('startHero', window.__G.save.heroes.find((x) => x.id === id), false), h.id);
      await pg.waitForFunction(() => window.__G?.zone && window.__G.mode === 'play', null, { timeout: 240000 });
      await A5.tick(pg);
      out[h.id] = await pg.evaluate(async () => {
        const G = window.__G, h = G.hero, P = await import('/src/game/progression.js'), S = await import('/src/game/skills.js');
        window.__D.openPanel('skills'); await new Promise((r) => setTimeout(r, 600));
        const panel = !!document.querySelector('#panel .pg-tiles, #panel .pg-t, #panel .pn-b');
        window.__D.closePanel();
        return { cls: h.cls, level: h.level, diff: h.diff, act5: h.act5, quest: h.quest, mlvl: h.mlvl, points: h.points, earned: P.pointsEarned(h), spent: P.pointsSpent(h), loadout: h.loadout, slots: [1, 2, 3, 4].map((i) => S.skillOn(i)?.id || null), variant: { ...h.variant }, mast: { ...h.mast }, dmgPct: Math.round(G.stats.dmgPct ?? 0), lifeMax: G.stats.lifeMax, panel, cds: G.player.cds.length };
      });
    }
    const a = out.hV13, b = out.hAct5, c = out.hOdd;
    const ok13 = a.mlvl === 12 && a.loadout.join() === 'hawks,rain,multi,vault' && a.variant.rain === 2 && a.points === a.earned - a.spent && a.act5 === -1 && a.diff === 3 && a.cds === 8;
    const ok5 = b.loadout.join() === 'whirl,leap,cry,quake' && b.diff === 5 && b.quest === 28 && b.points === b.earned - b.spent && b.points === 35 - 16 && b.mlvl === 0;
    const okOdd = c.points === c.earned - c.spent && c.slots.every(Boolean) && !c.loadout.includes('bogus') && new Set(c.loadout).size === 4;
    return { pass: ok13 && ok5 && okOdd && a.panel && b.panel && c.panel, ok13, ok5, okOdd, out };
  } },
  // levels past the old skill cap, Mastery past 50, and a save from before the progression taken up from the title
  progress: { q: 'auto=town&sim=2&q=1&lvl=1&cls=' + (process.env.CLS || 'ranger'), run: async (pg, shot) => {
    const r = {};
    r.climb = await pg.evaluate(async () => {
      const C = await import('/src/game/combat.js'), D = await import('/src/game/data.js'), P = await import('/src/game/progression.js'), B = await import('/src/ui/bus.js');
      const G = window.__G, h = G.hero, ev = { lv: 0, m: 0, sk: [] };
      B.on('levelUp', (l, sk) => { ev.lv++; if (sk) ev.sk.push(l + ':' + sk.id); }); B.on('masteryUp', () => ev.m++);
      const at = {};
      while (h.level < 50) { C.gainXP(D.xpToNext(h.level) * 0.6); if ([17, 20, 30, 40, 50].includes(h.level) && !at[h.level]) at[h.level] = { pts: h.points, earned: P.pointsEarned(h) }; }
      for (let i = 0; i < 25; i++) C.gainXP(D.mxpToNext(h.mlvl) * 0.55);
      return { level: h.level, mlvl: h.mlvl, mxp: Math.round(h.mxp), xp: h.xp, points: h.points, earned: P.pointsEarned(h), ev, at };
    });
    await pg.waitForTimeout(800); await shot();
    // spend everything: every rank, every variant, the rest in Mastery
    r.spend = await pg.evaluate(async () => {
      const P = await import('/src/game/progression.js'), D = await import('/src/game/data.js'), G = window.__G, h = G.hero;
      for (const sk of D.SKILLS[h.cls]) while (P.rankUp(h, sk.id));
      for (const id in D.VARIANTS) if (D.SKILLS[h.cls].some((s) => s.id === id)) { P.unlockVariant(h, id, 1); P.unlockVariant(h, id, 2); }
      const left = h.points, ids = P.MASTERY.map((m) => m.id); let k = 0;
      while (h.points > 0) P.masterUp(h, ids[k++ % ids.length]);
      window.__D.refreshStats();
      return { left, spent: P.pointsSpent(h), earned: P.pointsEarned(h), dps: Math.round(G.stats.dps), life: G.stats.lifeMax, crit: G.stats.critC };
    });
    await pg.evaluate(() => window.__D.openPanel('skills', { tab: 1 })); await pg.waitForTimeout(400); await shot();
    await pg.evaluate(() => window.__D.closePanel());
    // an old save: a level 50 hero with the old cap's points left over and no loadout; the title's Continue takes it up
    await pg.evaluate(() => {
      const G = window.__G, old = JSON.parse(JSON.stringify(G.hero));
      for (const k of ['loadout', 'vars', 'variant', 'mast', 'mlvl', 'mxp']) delete old[k];
      old.id = 'hold'; old.level = 50; old.xp = 4321; old.skills = { multi: 5, rain: 5, wolf: 3, pierce: 5, bolt: 1 }; old.points = 49 - 13; old.cls = 'ranger';
      // (no more autosaves from this page over the planted save)
      G.save = null;
      localStorage.setItem('skotos.save.v1', JSON.stringify({ heroes: [old], settings: { helpSeen: true }, last: 'hold' }));
    });
    await pg.goto((process.env.BASE || 'http://localhost:5199/') + '?sim=1&q=1');
    await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
    await pg.waitForTimeout(1500); await pg.mouse.click(300, 200); await pg.waitForTimeout(1200);
    await pg.click('#m-cont'); await pg.waitForFunction(() => window.__G?.mode === 'play' && window.__G.player, null, { timeout: 180000 });
    await pg.waitForTimeout(1500);
    r.migrated = await pg.evaluate(() => { const h = window.__G.hero; return { level: h.level, xp: h.xp, points: h.points, skills: h.skills, loadout: h.loadout, mlvl: h.mlvl, mast: h.mast }; });
    await pg.evaluate(() => window.__D.openPanel('skills')); await pg.waitForTimeout(400); await shot();
    return r;
  } },
  // the runner's own check: a game timer that throws lands in #fatal, and the run must report pass: false with it
  fatalcheck: { q: 'auto=town&sim=2&q=0&norender', run: async (pg) => {
    await pg.evaluate(() => window.__G.timers.push({ t: 0.05, fn() { throw new Error('fatalcheck: a thrown timer'); } }));
    await pg.waitForTimeout(1500);
    return { pass: true, note: 'must come out pass: false with the fatal text' };
  } },
  title: { q: 'sim=1&q=' + (process.env.Q || '1'), run: async (pg, shot) => {
    await pg.waitForTimeout(2500); await shot();
    await pg.mouse.click(640, 360); await pg.waitForTimeout(1500); await shot();
    await pg.click('#m-new'); await pg.waitForTimeout(2500); await shot();
    await pg.click('.pcard[data-c="mage"]'); await pg.waitForTimeout(2500); await shot();
    await pg.click('#p-go'); await pg.waitForTimeout(3500); await shot();
    await pg.evaluate(() => document.getElementById('i-skip')?.click()); await pg.waitForTimeout(4000); await shot();
    return pg.evaluate(() => ({ mode: window.__G.mode, zone: window.__G.zone?.id, cls: window.__G.hero?.cls }));
  } },
  // Act V, the sea's draw order (on the world viewer: the coast's real build, the real telegraphs and light rings): a
  // telegraph, a light pool and the Cradle's ring stay visible over shallow water, and wading and closed water differ in
  // tone. Pixels are read in the frame they are drawn in, each with and without the decal. And a fire's halo (as on the
  // sea-lights, the hearth, the cairns) standing in front of closed water adds the same light with the sea behind it as
  // without it (halo: the ratio; the sea drawn over it would leave a twentieth)
  shallowtele: { q: 'world=coast&q=' + (process.env.Q || '1') + '&deep=1&seed=' + (process.env.SEED || '3'), run: async (pg, shot) => {
    const res = await pg.evaluate(async () => {
      const { R, toScreen, fx, B } = window.__v5;
      const L = window.__L, w = L.w, h = 0.6;
      // a patch of wading water (0.1-0.35 m deep at h, 5 x 3 cells round it) with closed water (0.6 m or more) 3-5 cells north
      const sh = (x, z) => { const i = z * w + x, d = h - L.bed[i]; return L.bed[i] < 9 && !L.ice[i] && !L.thick[i] && !L.deck[i] && d >= 0.1 && d <= 0.35; };
      let spot = null;
      for (let z = 8; z < L.h - 8 && !spot; z++) for (let x = 8; x < w - 8 && !spot; x++) {
        let ok = true;
        for (let dz = -1; dz <= 1 && ok; dz++) for (let dx = -2; dx <= 2 && ok; dx++) ok = sh(x + dx, z + dz);
        if (!ok) continue;
        for (let k = 3; k <= 5 && !spot; k++) { const j = (z - k) * w + x; if (L.bed[j] < 9 && h - L.bed[j] >= 0.6 && !L.ice[j] && !L.thick[j]) spot = { x: x + 0.5, z: z + 0.5, deep: { x: x + 0.5, z: z - k + 0.5 } }; }
      }
      if (!spot) return { error: 'no wading patch beside closed water at h 0.6' };
      window.__view(spot.x, spot.z + 2, { tide: h });
      const gl = R.renderer.getContext(), pr = R.renderer.getPixelRatio(), px = new Uint8Array(4), s = {};
      const read = (x, z) => { toScreen(x, 0.2, z, s); gl.readPixels(Math.round(s.x * pr), Math.round((R.h - s.y) * pr), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [px[0], px[1], px[2]]; };
      const ring = (x, z, r, n = 8) => Array.from({ length: n }, (_, k) => [x + Math.sin(k * 6.283 / n) * r, z + Math.cos(k * 6.283 / n) * r]);
      const mean = (pts) => { const c = [0, 0, 0]; for (const [x, z] of pts) { const v = read(x, z); for (let i = 0; i < 3; i++) c[i] += v[i] / pts.length; } return c; };
      const diff = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      const draw = () => window.__view(spot.x, spot.z + 2, { tide: h });
      // a telegraph, a light pool and the hero's ring, each on the wading water; each read with and without itself
      const tele = fx.teleCircle(spot.x + 1.4, spot.z, 0.7, 99);
      const pool = B.act4Prop('lightRing'); pool.userData.setColor(0xfff0d0); pool.scale.setScalar(0.7); pool.position.set(spot.x - 1.4, 0, spot.z); B.drape(pool, L); R.scene.add(pool);
      const cradle = B.act4Prop('lightRing'); cradle.scale.setScalar(0.6); cradle.position.set(spot.x, 0, spot.z + 0.2); B.drape(cradle, L); R.scene.add(cradle);
      const items = { tele: [tele.m, ring(spot.x + 1.4, spot.z, 0.66)], pool: [pool, ring(spot.x - 1.4, spot.z, 0.63)], cradle: [cradle, ring(spot.x, spot.z + 0.2, 0.54)] };
      const out = { spot };
      for (const k in items) {
        const [o, pts] = items[k];
        draw(); const on = mean(pts);
        o.visible = false; draw(); const off = mean(pts); o.visible = true;
        out[k] = +diff(on, off).toFixed(1);
      }
      for (const k in items) items[k][0].visible = false;
      draw(); out.tones = +diff(mean([[spot.x, spot.z], [spot.x + 0.3, spot.z + 0.2]]), mean([[spot.deep.x, spot.deep.z], [spot.deep.x + 0.3, spot.deep.z]])).toFixed(1);
      // the halo: 1.2 m over the closed water, read beside the flame (its own core is opaque)
      const fl = B.flameMesh(2, 0xffc070), hp = { x: spot.deep.x, y: 1.2, z: spot.deep.z }; fl.position.set(hp.x, hp.y - 0.36, hp.z); R.scene.add(fl);
      const hpts = [[0.45, 0], [-0.45, 0], [0, 0.45]];
      const hmean = () => { const c = [0, 0, 0]; for (const [dx, dy] of hpts) { toScreen(hp.x + dx, hp.y + dy, hp.z, s); gl.readPixels(Math.round(s.x * pr), Math.round((R.h - s.y) * pr), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); for (let i = 0; i < 3; i++) c[i] += px[i] / hpts.length; } return c; };
      const sea = R.scene.getObjectByName('sea'), hd = () => { draw(); const on = hmean(); fl.visible = false; draw(); const off = hmean(); fl.visible = true; return diff(on, off); };
      const withSea = hd(); sea.visible = false; const bare = hd(); sea.visible = true;
      out.halo = +(withSea / Math.max(bare, 1e-3)).toFixed(2); out.haloAdds = [+withSea.toFixed(1), +bare.toFixed(1)];
      R.scene.remove(fl);
      for (const k in items) items[k][0].visible = true;
      draw();
      out.pass = out.tele > 12 && out.pool > 12 && out.cradle > 12 && out.tones > 12 && out.halo > 0.75;
      return out;
    });
    await shot();
    return res;
  } },
  // Act V, the perf gate: frame time at quality 1 under phone emulation (915 x 412 at a pixel ratio of 1.5, a coarse
  // pointer, MSAA; adaptive resolution pinned at 1.0, the scale it would have picked reported beside it) in the Shallows at
  // high water and at low water (coastLow: the same spot, the open sea's floor shallowest under the water) and mid Ice
  // Road, against the Field of Ash measured the same way: each within the Field's + 15%. Quality 0
  // is measured too, as a floor (each spot no slower than at quality 1). One page travels between the three zones (fixed
  // seeds, the packs kept from spawning: the gate is the world's look, terrain, water, ice, props, FX), CYCLES times after
  // a first visit that builds them. Each visit: the hero and the camera placed, a few real frames (the game's own work in
  // each is timed: 'logic'), then the loop held, the particles run 12 s ahead, the tide's uniforms at high water, and K
  // frames drawn and waited for (render and a 1-pixel read-back: under a software GPU shared with other processes the rAF
  // interval swings tenfold, a drawn-and-waited frame does not). A visit's frame is its best of K plus its logic; each
  // cycle compares the zones with the Field drawn beside them, and the verdict is the median of those ratios.
  // Env: QS ('1,0'), CYCLES (5), K (3), SEEDS ('5,3,3': Field, coast, farlight), PACKS=1 lets the packs spawn
  perf5: { q: 'world=town&q=0&noenv', run: async (pg, shot) => {
    const browser = pg.context().browser(), base = process.env.BASE || 'http://localhost:5199/';
    await pg.goto('about:blank');
    const QS = (process.env.QS || '1,0').split(','), CYC = +(process.env.CYCLES || 5), K = +(process.env.K || 3), out = {};
    const seeds = (process.env.SEEDS || '5,3,3').split(',').map(Number), zones = ['ashfield', 'coast', 'coastLow', 'farlight'];
    const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    for (const Q of QS) {
      const ctx = await browser.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => logs.push('pageerror(perf5 q' + Q + '): ' + e.message));
      p.on('console', (m) => { if (m.type() === 'error') logs.push('perf5 q' + Q + ': ' + m.text()); });
      // (each frame of the game's loop timed, less the part of it spent in renderer.render: the game's logic)
      await p.addInitScript(() => {
        const raf = window.requestAnimationFrame.bind(window);
        window.__cb = []; window.__rn = 0;
        window.requestAnimationFrame = (f) => raf((t) => { const t0 = performance.now(), r0 = window.__rn; f(t); if (window.__rn !== r0) window.__cb.push(performance.now() - t0 - (window.__rn - r0)); if (window.__cb.length > 60) window.__cb.shift(); });
      });
      await p.goto(base + '?auto=ashfield&q=' + Q + '&lvl=30&seed=' + seeds[0]);
      try { await p.waitForFunction(() => window.__G?.player && window.__G.zone && window.__G.mode === 'play', null, { timeout: 400000 }); } catch (e) { out['q' + Q] = 'no zone'; await ctx.close(); continue; }
      await p.evaluate((seeds) => {
        window.__immortal = true;
        const h = window.__G.hero, F = h.flags, R = window.__R;
        for (const f of ['coastSeen', 'farSeen', 'hearth', 'rite', 'tamMet', 'glaukosMet', 'alkShip', 'ternSeen']) F[f] = true;
        h.seeds = Object.assign(h.seeds || {}, { ['coast@' + h.diff]: seeds[1], ['farlight@' + h.diff]: seeds[2] });
        const r0 = R.renderer.render.bind(R.renderer);
        R.renderer.render = (s, c) => { const t0 = performance.now(); r0(s, c); window.__rn += performance.now() - t0; };
      }, seeds);
      const visit = (zone) => p.evaluate(async ({ zone, K, packs }) => {
        const G = window.__G, R = window.__R, fx = await import('/src/gfx/fx.js'), gfx = await import('/src/gfx/gfx.js');
        const low = zone === 'coastLow'; if (low) zone = 'coast';
        G.hero.flags.frozen = zone === 'farlight';
        // (its packs, people and creatures loaded first, as a real journey waits for them: the rime pack's look is measured)
        if (G.zone.id !== zone) { await (await import('/src/game/world.js')).zoneReady(zone); window.__D.enterZone(zone); }
        const S = G.zone.L.spots;
        const v = zone === 'ashfield' ? { x: S.camp.x, z: S.camp.z - 8 } : zone === 'coast' ? { x: S.dalaro.x, z: S.dalaro.z + 4, tide: low ? 0 : 1.2 } : (() => { const s = S.poles[S.poles.length >> 1]; return { x: s.x, z: s.z }; })();
        if (!packs) { for (const pk of G.zone.packs) pk.spawned = true; for (const a of G.actors.slice()) if (a.team === 'foe') { a.remove?.(); G.actors.splice(G.actors.indexOf(a), 1); } G.zone.bossSpawned = true; }
        const f = G.zone.map.nearestFloor(v.x, v.z);
        G.player.x = f.x; G.player.z = f.z;
        const T = window.__act5?.tide?.TIDE, SEA = window.__act5?.sea;
        if (T) T.force = v.tide != null ? { h: v.tide, rate: 10 } : null;
        R.prScale = 1; R.renderer.setPixelRatio(R.basePR); R.renderer.setSize(R.w, R.h, false); R.lastResize = 1e15;
        window.__cb.length = 0;
        for (let i = 0; i < 6; i++) await new Promise((ok) => requestAnimationFrame(() => { gfx.updateCamera(0, G.player.x, G.player.z, true); ok(); }));
        const lg = window.__cb.slice(2).sort((a, b) => a - b), logic = lg[lg.length >> 1] ?? 0;
        const mode0 = G.mode; G.mode = 'hold'; R.lost = true;
        for (let i = 0; i < 120; i++) fx.updateFX(0.1, G.player.x, G.player.z);
        gfx.updateCamera(0, G.player.x, G.player.z, true); gfx.frame(0.016);
        if (v.tide != null && SEA) { SEA.uLevel.value = v.tide; SEA.uWetLevel.value = v.tide; }
        const gl = R.renderer.getContext(), px = new Uint8Array(4), r = [];
        const draw = () => { R.lost = false; R.skyHook?.(); R.renderer.render(R.scene, R.camera); R.lost = true; gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
        draw();
        for (let i = 0; i < K; i++) { const t0 = performance.now(); draw(); r.push(performance.now() - t0); }
        const info = R.renderer.info.render, best = Math.min(...r);
        R.lost = false; G.mode = mode0;
        return { ms: +(best + logic).toFixed(1), draw: +best.toFixed(1), logic: +logic.toFixed(1), calls: info.calls, tris: info.triangles, water: v.tide != null ? SEA?.uLevel.value : undefined, at: [+G.player.x.toFixed(1), +G.player.z.toFixed(1)], pr: R.renderer.getPixelRatio() };
      }, { zone, K, packs: process.env.PACKS === '1' });
      const S = {};
      for (let c = -1; c < CYC; c++) for (const z of zones) {
        const m = await visit(z);
        if (c < 0) { await p.waitForTimeout(300); await p.screenshot({ path: shot.dir + '/perf5-' + z + '-q' + Q + '.png', timeout: 240000 }).catch((e) => logs.push('perf5 shot ' + z + ': ' + e.message.split('\n')[0])); continue; }
        (S[z] ||= []).push(m);
        console.log('perf5 q' + Q + ' cycle ' + c + ' ' + z + ' ' + JSON.stringify(m));
      }
      for (const z of zones) {
        const ms = med(S[z].map((m) => m.ms)), last = S[z][S[z].length - 1];
        out[z + '@q' + Q] = { ms, draw: med(S[z].map((m) => m.draw)), logic: med(S[z].map((m) => m.logic)), calls: last.calls, tris: last.tris, water: last.water, pr: last.pr, wouldScale: ms > 21 ? 'down (to 0.55 at worst)' : ms < 14.5 ? 'up' : 'hold' };
      }
      for (const z of ['coast', 'coastLow', 'farlight']) {
        const o = out[z + '@q' + Q];
        o.ratios = S[z].map((m, i) => +(m.ms / S.ashfield[i].ms).toFixed(3)); o.vsField = med(o.ratios); o.pass = o.vsField <= 1.15;
      }
      await ctx.close();
    }
    // (the floor: at quality 0 each spot draws no slower than at quality 1)
    for (const z of zones) if (out[z + '@q0']?.ms && out[z + '@q1']?.ms) out[z + '@q0'].floor = out[z + '@q0'].ms <= out[z + '@q1'].ms * 1.05;
    out.pass = ['coast@q1', 'coastLow@q1', 'farlight@q1'].every((k) => out[k]?.pass) && zones.every((z) => out[z + '@q0']?.floor !== false);
    return out;
  } },
  // ---------- Act V (the design's scenario table; perf5 and shallowtele above) ----------
  // The way in, both of the design's cases. (a) From a q22 save: the Field visited first (cached before the new fire, its
  // Neck still plugged), home, the beacon lit and Act IV's blessing chosen; in the same session the stranger at the beacon
  // (q24), the fourth fire out, Halda and the Cradle, the coal (q25); back into the cached Field: the plug open and the
  // Anvil's Neck leading to the coast. (b) From an Act IV-end save in the shipped format (no act5, no Act V field): the
  // migration, the hook on entering Whitecliff, the same walk. PART=a|b (both by default)
  hook5: { q: 'auto=town&sim=4&q=0&norender&lvl=28&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    const out = {}, parts = (process.env.PART || 'ab').split('');
    await A5.tick(pg); await A4.listen(pg);
    // (where it is, for a run that stops: what the game shows then)
    const at = (step) => { out.step = step; console.log('hook5 step ' + step); };
    const where = () => pg.evaluate(() => { const G = window.__G, h = G?.hero; return h && { zone: G.zone?.id, mode: G.mode, panel: G.panel, cine: !!G.cine, dialog: !!document.querySelector('#dialog:not([hidden])'), quest: h.quest, act4: h.act4, flags: ['newFire', 'alkyone', 'coastCall', 'cradle', 'coal', 'alkField'].filter((f) => h.flags[f]), alk: !!G.zone?.p5?.alkyone, scene: G.zone?.p5?.alkyone?.scene }; }).catch((e) => ({ e: e.message }));
    const hook = async () => {
      at('hook: Alkyone at the beacon');
      await pg.waitForFunction(() => !!window.__G.zone.p5?.alkyone && !window.__G.zone.p5.alkyone.scene, null, { timeout: 240000 });
      const arrived = await pg.evaluate(() => { const G = window.__G, n = G.zone.p5.alkyone; return { quest: G.hero.quest, at: [+n.a.x.toFixed(1), +n.a.z.toFixed(1)], model: n.a.avatar.modelName, news: !n.it.used }; });
      await shot();
      await pg.evaluate(() => { const G = window.__G, it = G.zone.p5.alkyone.it; G.player.x = it.x; G.player.z = it.z + 1.4; it.use(); });
      await A4.dialogs(pg, 8, () => !!window.__G.cine);
      await pg.waitForFunction(() => !window.__G.cine || window.__G.cine.t >= 5, null, { timeout: 180000 }); await shot();
      await A5.until(pg, () => window.__G.hero.flags.cradle, 240000);
      const coal = await A5.use(pg, "z.interact.find((i) => i.kind === 'coal')");
      await A5.until(pg, () => window.__G.hero.quest >= 25, 120000);
      await pg.waitForTimeout(600); await shot();
      const end = await pg.evaluate(() => { const G = window.__G, F = G.hero.flags; return { quest: G.hero.quest, flags: ['alkyone', 'coastCall', 'cradle', 'coal'].filter((f) => F[f]), text: document.querySelector('#quest')?.textContent }; });
      return { arrived, coal, end };
    };
    // the Field (cached in a): the plug, the Neck; and through it to the coast
    const field = async () => {
      await A5.travel(pg, 'ashfield', 'town');
      const f = await pg.evaluate(() => { const G = window.__G, z = G.zone, N = z.L.neck, e = z.interact.find((i) => i.kind === 'exit' && i.to === 'coast'); return { cached: !!window.__fieldZ && window.__fieldZ === z, plugOpen: !!N && N.plug.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)), exit: e ? { locked: e.locked, open: !e.locked || !!G.hero.flags[e.locked] } : null }; });
      await A5.use(pg, "z.interact.find((i) => i.kind === 'exit' && i.to === 'coast')");
      await pg.waitForFunction(() => window.__G.zone?.id === 'coast' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 300000 }).catch(() => {});
      f.reached = await pg.evaluate(() => window.__G.zone?.id);
      await pg.waitForTimeout(1500); await shot();
      return f;
    };
    try {
    if (parts.includes('a')) {
      at('a: the q22 save, the Field');
      await A5.state(pg, null, { quest: 22, act4: -1, boons: ['ember', 'forge', 'amber'], drop: ['newFire', 'act4'], zone: 'ashfield' });
      const before = await pg.evaluate(() => { const z = window.__G.zone, N = z.L.neck; window.__fieldZ = z; return { plugOpen: !!N && N.plug.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)), exit: !!z.interact.find((i) => i.kind === 'exit' && i.to === 'coast') }; });
      await A5.travel(pg, 'town', 'ashfield');
      await A4.dialogs(pg, 4);
      await A5.use(pg, "z.interact.find((i) => i.kind === 'beacon')");
      await A5.until(pg, () => !window.__G.cine && window.__G.panel === 'act', 300000);
      await pg.click('[data-a="close"]').catch(() => {});
      await A5.until(pg, () => !!document.querySelector('[data-a="boon:lantern"]'), 60000);
      await pg.click('[data-a="boon:lantern"]').catch(() => {});
      const lit = await pg.evaluate(() => { const h = window.__G.hero; return { act4: h.act4, newFire: !!h.flags.newFire, quest: h.quest, boons: h.boons.slice() }; });
      out.a = { before, lit, ...(await hook()) };
      out.a.field = await field();
    }
    if (parts.includes('b')) {
      at('b: the shipped save');
      // the shipped save: a hero record as the published game writes it (no act5, no seeds of the coast), Act IV done
      await pg.evaluate((act4) => {
        const now = Date.now(), h = { id: 'hS' + now.toString(36), cls: 'warden', level: 28, xp: 0, gold: 900, diff: 1, skills: {}, points: 27, inv: new Array(32).fill(null), equip: {}, stash: new Array(48).fill(null), quest: 23, flags: {}, wps: ['town', 'forest', 'crypt', 'pass', 'halls', 'weep', 'heart', 'ashfield', 'ashfield@2', 'forge'], act1: 1, act2: 1, act3: 1, act4: 1, gateBest: 0, boons: ['ember', 'forge', 'amber', 'lantern'], stats: { kills: 900, deaths: 3, time: 30000, legs: 2, elites: 40 }, created: now, played: now, seeds: { forest: 11, crypt: 12, pass: 13, halls: 14, weep: 15, heart: 16, ashfield: 17, forge: 18 } };
        for (const k of act4) h.flags[k] = true;
        Object.assign(h.flags, { heat: 3, gifts: { throne: 'refused', forge: 'refused', unfading: 'refused' } });
        localStorage.setItem('skotos.save.v1', JSON.stringify({ heroes: [h], settings: { quality: 0, lang: 'el', helpSeen: true }, last: h.id }));
        // (and this page saves no more: its pagehide would write the hero it holds over the one just put there)
        const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'skotos.save.v1') return; return set.call(this, k, v); };
      }, A5.ACT4);
      await A5.reload(pg, { write: false });
      at('b: loaded');
      const mig = await pg.evaluate(() => { const h = window.__G.hero; return { id: h.id, act5: h.act5, quest: h.quest, zone: window.__G.zone.id, seaLit: !!h.flags.seaLit }; });
      out.b = { mig }; Object.assign(out.b, await hook());
      await pg.evaluate(() => { window.__fieldZ = null; });
      out.b.field = await field();
    }
    const ok = (r) => r.end.quest === 25 && r.end.flags.length === 4 && r.field.plugOpen && !!r.field.exit?.open && r.field.reached === 'coast';
    out.pass = [out.a, out.b].filter(Boolean).every(ok) && (!out.a || (!out.a.before.plugOpen && out.a.field.cached && out.a.lit.newFire)) && (!out.b || out.b.mig.act5 === -1);
    } catch (e) { out.error = e.message.split('\n')[0]; out.where = await where(); out.pass = false; await shot().catch(() => {}); return out; }
    out.says = await pg.evaluate(() => (window.__says || []).filter((k) => /alk|halda|coal|kindle|out\./.test(k)));
    return out;
  } },
  // Every row of the design's catch-up table: the state just after that flag's save, the page loaded again and the hero
  // taken up from the title (she starts in Whitecliff; the coast and the Farthest Light are reached by waypoint), then the
  // quest, the scene played again or caught up quietly, the memories seen. ROWS=a,b (ids) runs some
  catch5: { q: 'auto=town&sim=4&q=0&norender&lvl=30&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    const rows = [], only = process.env.ROWS ? process.env.ROWS.split(',') : null;
    await A5.tick(pg);
    const row = async (id, f, o, check) => {
      if (only && !only.includes(id)) return;
      const t0 = Date.now();
      let r;
      try {
        await A5.state(pg, f, o);
        await A5.reload(pg);
        if (o.go) await A5.travel(pg, o.go, 'waypoint');
        r = await check();
      } catch (e) { r = { pass: false, error: e.message.split('\n')[0] }; }
      r.id = id; r.secs = Math.round((Date.now() - t0) / 1000);
      rows.push(r); console.log('catch5 ' + JSON.stringify(r));
    };
    const ev = (fn) => pg.evaluate(fn);
    // alkyone -> 24 (she is at the beacon)
    await row('alkyone', 'alkyone', { quest: 23 }, async () => { await A5.until(pg, () => window.__G.hero.quest >= 24, 30000); const r = await ev(() => ({ q: window.__G.hero.quest, alk: !!window.__G.zone.p5?.alkyone })); r.pass = r.q === 24 && r.alk; return r; });
    // coastCall without coal: q24 stays; Halda's Cradle line, then the coal at the beacon; the Neck locked on the coal
    await row('coastCall', 'coastCall', { quest: 24 }, async () => {
      const r = await ev(() => ({ q: window.__G.hero.quest, coal0: !!window.__G.zone.interact.find((i) => i.kind === 'coal') }));
      await ev(() => { const G = window.__G, h = G.zone.townNpc?.smith?.a; if (h) { G.player.x = h.x; G.player.z = h.z + 1.4; window.__D.emit('talk', 'smith', h); } });
      r.line = await ev(() => document.querySelector('#dialog:not([hidden]) .txt')?.textContent?.slice(0, 40) || null);
      await A5.until(pg, () => window.__G.hero.flags.cradle, 20000);
      await ev(() => window.__D.closePanel());
      r.coal = await ev(() => !!window.__G.zone.interact.find((i) => i.kind === 'coal'));
      await A5.travel(pg, 'ashfield', 'town');
      await A5.use(pg, "z.interact.find((i) => i.kind === 'exit' && i.to === 'coast')");
      await pg.waitForTimeout(1500);
      r.neck = await ev(() => ({ zone: window.__G.zone.id, said: (window.__says || []).includes('d.coastShut') }));
      r.pass = r.q === 24 && !r.coal0 && r.coal && r.neck.zone === 'ashfield' && r.neck.said;
      return r;
    });
    await row('coal', 'coal', { quest: 24 }, async () => { const r = await ev(() => ({ q: window.__G.hero.quest })); r.pass = r.q === 25; return r; });
    // hearth without rite: the rite again, then 26
    await row('hearth', 'hearth', { quest: 25, go: 'coast' }, async () => { const ok = await A5.until(pg, () => window.__G.hero.flags.rite && !window.__G.cine && window.__G.hero.quest >= 26, 180000); const r = await ev(() => ({ q: window.__G.hero.quest, rite: (window.__says || []).length + (window.__G.hero.flags.rite ? 1 : 0) })); r.pass = ok && r.q === 26; return r; });
    // a light lit, its memory unseen: the window offers it ("Remember") and the goal points there; then it plays
    await row('memOwed', 'light_grey', { quest: 26, go: 'coast', flags: { mem_i1: false } }, async () => {
      const r = await ev(() => { const z = window.__G.zone, it = z.act5.lights.find((l) => l.id === 'grey'); return { offered: !!it && !it.win.used, prompt: it?.win.prompt }; });
      await A5.use(pg, "z.act5.lights.find((l) => l.id === 'grey').win");
      r.seen = await A5.until(pg, () => window.__G.hero.flags.mem_i1 && !window.__G.cine, 180000);
      r.pass = r.offered && r.seen;
      return r;
    });
    // all three lights and their memories: the Tower wakes, 27
    await row('lights', 'mem_i3', { quest: 26, go: 'coast' }, async () => { const ok = await A5.until(pg, () => window.__G.hero.flags.towerWake && !window.__G.cine && window.__G.hero.quest >= 27, 240000); const r = await ev(() => ({ q: window.__G.hero.quest, boss: window.__G.zone.boss?.kind })); r.pass = ok && r.q === 27 && r.boss === 'tower'; return r; });
    // towerDown without frozen: the Freeze again (and the coast built frozen), 28
    await row('towerDown', 'towerDown', { quest: 27, go: 'coast' }, async () => { const ok = await A5.until(pg, () => window.__G.hero.quest >= 28 && !window.__G.cine && window.__G.zone?.mode === 'frozen', 300000); const r = await ev(() => ({ q: window.__G.hero.quest, mode: window.__G.zone.mode, frozen: window.__G.hero.flags.frozen })); r.pass = ok && r.frozen; return r; });
    await row('frozen', 'frozen', { quest: 27 }, async () => { const r = await ev(() => ({ q: window.__G.hero.quest })); r.pass = r.q === 28; return r; });
    await row('holes', 'hole2', { quest: 28 }, async () => { const r = await ev(() => ({ q: window.__G.hero.quest })); r.pass = r.q === 29; return r; });
    // the fight left behind: her name hidden, the stair touched again, the Skotos rises again
    await row('skotosWake', 'skotosWake', { quest: 29, go: 'farlight' }, async () => {
      const r = await ev(async () => { const S = await import('/src/game/story.js'), z = window.__G.zone; return { name: S.npcName('selna'), selnaBack: !!window.__G.selnaBack, prompt: z.act5.farIt.prompt, used: z.act5.farIt.used }; });
      await A5.use(pg, 'z.act5.farIt');
      r.rose = await A5.until(pg, () => { const b = window.__G.zone.boss; return !!b && !b.holdWake && !b.hidden && !window.__G.cine; }, 180000);
      r.pass = r.name === '…' && !r.selnaBack && !r.used && r.rose;
      return r;
    });
    // named, the answer unseen: the card and the answer again
    await row('skotosDown', 'selnaBack', { quest: 29, go: 'farlight' }, async () => { const ok = await A5.until(pg, () => window.__G.hero.flags.seaLit && !window.__G.cine, 240000); const r = await ev(() => ({ q: window.__G.hero.quest, seaLit: !!window.__G.hero.flags.seaLit, title: (window.__says || []).includes('d.lit.1') })); r.pass = ok && r.seaLit; return r; });
    // seaLit without the carving: q.29b
    await row('seaLit', 'seaLit', { quest: 29 }, async () => { const r = await ev(async () => { const S = await import('/src/game/story.js'), I = await import('/src/i18n/i18n.js'); return { q: window.__G.hero.quest, text: S.questText(), want: I.t('q.29b') }; }); r.pass = r.q === 29 && r.text === r.want; return r; });
    await row('carved', 'carved', { quest: 29 }, async () => { const r = await ev(() => ({ q: window.__G.hero.quest })); r.pass = r.q === 30; return r; });
    // the child told but the act never closed: the act closes
    await row('toldChild', 'toldChild', { quest: 30, act5: -1 }, async () => { const ok = await A5.until(pg, () => (window.__G.hero.act5 ?? -1) >= 0, 60000); const r = await ev(() => ({ q: window.__G.hero.quest, act5: window.__G.hero.act5, panel: window.__G.panel })); r.pass = ok && r.q === 31; return r; });
    await shot();
    return { pass: rows.length > 0 && rows.every((r) => r.pass), failed: rows.filter((r) => !r.pass).map((r) => r.id), rows };
  } },
  // The coast's first steps: down the Anvil's Neck (the arrival scene), the hearth (the Landing's waypoint, the Saltborn
  // out of their houses) and the rite (the first «Σκότος»), the first sea-light (its beam, its memory); then the water
  // forced high, the coast left and entered again: the map is at low water
  coast: { q: 'auto=town&sim=4&q=0&norender&lvl=30&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    await A5.tick(pg); await A4.listen(pg);
    await A5.state(pg, 'alkField', { zone: 'ashfield' });
    await A5.use(pg, "z.interact.find((i) => i.kind === 'exit' && i.to === 'coast')");
    await pg.waitForFunction(() => window.__G.zone?.id === 'coast' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 300000 });
    await pg.waitForFunction(() => !!window.__G.cine, null, { timeout: 30000 }).catch(() => {});
    await pg.waitForFunction(() => !window.__G.cine || window.__G.cine.t >= 2.5, null, { timeout: 60000 }); await shot();
    await A5.until(pg, () => window.__G.hero.flags.coastSeen && !window.__G.cine, 240000);
    const arrival = await pg.evaluate(() => { const G = window.__G; return { coastSeen: !!G.hero.flags.coastSeen, quest: G.hero.quest, text: document.querySelector('#quest')?.textContent, says: (window.__says || []).filter((k) => /coast|skotos|alk\.c/.test(k)) }; });
    await A5.use(pg, 'z.act5.hearth');
    await A5.until(pg, () => window.__G.hero.flags.hearth, 30000);
    await pg.waitForTimeout(1500); await shot();
    const hearth = await pg.evaluate(() => { const G = window.__G, z = G.zone, A = z.act5; return { wp: G.hero.wps.includes('coast'), checkpoint: !!z.checkpoint, warm: !!window.__act5.warmAt(A.hearth.x + 2, A.hearth.z), shore: Object.keys(z.p5 || {}).filter((k) => k.startsWith('shore')).length }; });
    await A5.until(pg, () => !!window.__G.cine, 60000);
    await pg.waitForTimeout(2500); await shot();
    const riteOk = await A5.until(pg, () => window.__G.hero.flags.rite && !window.__G.cine && window.__G.hero.quest >= 26, 240000);
    const rite = await pg.evaluate((ok) => ({ ok, quest: window.__G.hero.quest }), riteOk);
    const which = await A5.use(pg, "z.act5.lights.find((l) => l.id === 'grey') || z.act5.lights[0]");
    await A5.until(pg, () => !!window.__G.cine, 30000);
    await pg.waitForFunction(() => !window.__G.cine || window.__G.cine.t >= 3, null, { timeout: 60000 }); await shot();
    const light = await pg.evaluate(() => { const A = window.__act5; return { beams: A.beams().length, beamTag: A.beams().map((b) => b.tag) }; });
    light.mem = await A5.until(pg, () => window.__G.hero.flags.mem_i1 && !window.__G.cine, 240000);
    Object.assign(light, await pg.evaluate(() => { const G = window.__G, F = G.hero.flags; return { which: F.lights5, buff: (G.player.buffs.memory || 0) > 0, checkpoint: !!G.zone.checkpoint, quest: G.hero.quest }; }));
    // the water high, then the coast left and entered again
    await pg.evaluate(() => { window.__act5.tide.TIDE.force = { h: 1.2, rate: 10 }; });
    await A5.until(pg, () => window.__act5.tide.TIDE.h >= 1.05, 90000);
    const tones = () => pg.evaluate(() => { const z = window.__G.zone, L = z.L, T = window.__act5.tide.TIDE, m = z.map, idx = z.tideC?.idx || []; let shut = 0, want = 0; for (const i of idx) { if (!m.cells[i]) shut++; if (T.h - L.bed[i] >= 0.45) want++; } return { h: +T.h.toFixed(2), phase: T.phase, force: !!T.force, tidal: idx.length, shut, want }; });
    const high = await tones(); await shot();
    await A5.travel(pg, 'town', 'waypoint');
    await A5.travel(pg, 'coast', 'waypoint');
    const low = await tones();
    await shot();
    const pass = arrival.coastSeen && hearth.wp && hearth.checkpoint && hearth.shore >= 1 && rite.ok && light.beams >= 1 && light.mem && light.buff && high.shut > low.shut && low.h === 0 && low.phase === 'low' && !low.force && low.shut === low.want;
    return { pass, arrival, hearth, rite, which, light, high, low };
  } },
  // The tide soak (tools/soak5.mjs tide: CYCLES 20, packs hunting her on the flats, her lane held and washed out along)
  tide: { child: async (out) => { const r = await A5.soak('tide', out, { CYCLES: process.env.CYCLES || '20' }); const t = r.tide?.res; return { pass: !!t?.pass, res: t && { cycles: t.cycles, steps: t.steps, washes: t.washes, closed: t.closed, stuck: t.stuck, snaps: t.snaps, jumps: t.jumps.length, maxJump: t.maxJump, offLane: t.offLane, wet: t.wet, verBumps: t.verBumps, laneTests: t.laneTests && { n: t.laneTests.n, washed: t.laneTests.washed, walkedOut: t.laneTests.walkedOut } }, logs: r.tide?.logs?.slice(0, 8), error: r.error }; } },
  // The ice soak (tools/soak5.mjs ice: MIN 10 minutes on the coast's Fall shelf and on the Ice Road; breaks, refreezes,
  // plunges, drownings, a big one baited through, map.ver bumps per second)
  ice: { child: async (out) => { const r = await A5.soak('ice', out, { MIN: process.env.MIN || '10' }); const pick = (x) => x?.res && { pass: x.res.pass, breaks: x.res.breaks, refreezes: x.res.refreezes, slushed: x.res.slushed, plunges: x.res.plunges, plungeMaxD: x.res.plungeMaxD, far: x.res.far.length, drowned: x.res.drowned, floundered: x.res.floundered, bumpsMaxPerSec: x.res.bumpsMaxPerSec, lowHp: x.res.lowHp.length, snaps: x.res.snaps, closed: x.res.closed, logs: x.logs?.slice(0, 6) }; const c = pick(r.iceCoast), f = pick(r.iceFarlight); return { pass: !!c?.pass && !!f?.pass, coast: c, farlight: f, error: r.error }; } },
  // Skerry, the Walking Tower, fought by the boss bot (the reference build of the zone's level, CLS): every phase; Beached,
  // Overturned and Blinded each seen; her blade in reach; inside the Bell's calm when it tolls; the crawl home and the
  // island where the skerry was; the time to kill against the curve (TTK=lo,hi seconds; the design's 3:30-5:00 is
  // reported beside it). DIFF=0 also checks Wanderer against Warden (not under 60% of its time: TTK0 its Warden time)
  tower: { q: 'auto=coast&sim=4&q=0&norender&lvl=' + (process.env.LVL || 30) + '&diff=' + (process.env.DIFF || 1) + '&cls=' + (process.env.CLS || 'warden') + '&' + A5.url('towerWake'), run: async (pg, shot) => {
    await A5.tick(pg); await A4.listen(pg);
    // (she is held up while the fight is set and its first look drawn: on a loaded machine that look can take seconds of
    // play in which she stands idle by the Tower; the bot's own rules hold from its first frame)
    const setup = await pg.evaluate(() => { const G = window.__G, z = G.zone, B = z.L.boss, f = z.map.nearestFloor(B.x + 2, B.z + 11, 4); window.__immortal = true; G.player.x = f.x; G.player.z = f.z; return { boss: B, sk: z.L.spots.skerry && { x: z.L.spots.skerry.x, z: z.L.spots.skerry.z } }; });
    await A5.until(pg, () => !!window.__G.zone.boss, 30000);
    await pg.evaluate(() => { const b = window.__G.zone.boss; window.__act5.damage(window.__G.player, b, 1, { crit: false }); });
    await A5.until(pg, () => window.__G.zone.boss?.awake, 60000);
    await shot();
    // (every blow that reached her life: the last ones are reported if she dies, which the run never means)
    await pg.evaluate(async () => { const Bus = await import('/src/ui/bus.js'), G = window.__G; window.__hurts = []; Bus.on('hurt', (f) => { const b = G.zone.boss, p = G.player; window.__hurts.push({ t: +G.hero.stats.time.toFixed(1), f: +f.toFixed(3), hp: +(p.hp / p.hpMax).toFixed(2), b: b && [b.st, b.phase, b.move?.id || (b.dash ? 'dash' : '')].join('/'), at: new Error().stack.split('\n').slice(3, 6).map((l) => l.trim().replace(/^at /, '').replace(/\(?https?:[^)]*\/src\//, '').replace(/\?[^:]*/, '')).join(' < ') }); if (window.__hurts.length > 40) window.__hurts.shift(); }); });
    await pg.evaluate((o) => { window.SIMK = 4; window.__immortal = false; window.__botP = (new Function('return ' + o.src)())({ kind: 'tower', maxT: o.maxT }).catch((e) => { window.__botErr = String(e.stack || e); }); }, { src: BOT5.toString(), maxT: +(process.env.MAXT || 900) });
    const seen = {}, shots = new Set();
    let last = null;
    for (const t0 = Date.now(); Date.now() - t0 < 120 * 60000;) {
      await pg.waitForTimeout(500);
      const s = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss, B = window.BOT, L = window.__act5.AI_LOG, pl = G.player; if (!b || !B) return window.__botErr ? { err: window.__botErr } : null; return { t: +B.t.toFixed(1), done: B.done, end: !!B.end, dead: b.dead, awake: !!b.awake, phase: b.phase, st: b.st, vulns: Object.keys(b.vulns || {}).filter((k) => b.vulns[k] > 0), hp: +(b.hp / b.hpMax).toFixed(3), bell: L['tower:bellRung'] || 0, d: +(Math.hypot(b.x - pl.x, b.z - pl.z) - b.radius).toFixed(1), cine: !!G.cine, mode: G.mode, panel: G.panel, php: +(pl.hp / pl.hpMax).toFixed(2), deaths: B.deaths, tide: b.tide?.st }; });
      if (!s) continue;
      if (s.err) { console.log('tower bot error: ' + s.err.slice(0, 600)); break; }
      if (Date.now() - (seen.logT || 0) > 30000) { seen.logT = Date.now(); console.log('tower ' + JSON.stringify(s)); }
      if (s.end) break;
      if (s.panel === 'dead') { seen.died = { t: s.t, phase: s.phase, st: s.st, hurts: await pg.evaluate(() => window.__hurts.slice(-8)) }; console.log('tower death ' + JSON.stringify(seen.died)); await shot(); break; }
      for (const v of s.vulns) if (!seen[v]) { seen[v] = s.t; if (!shots.has(v)) { shots.add(v); await shot(); } }
      if (last && s.phase !== last.phase && !shots.has('p' + s.phase)) { shots.add('p' + s.phase); await shot(); }
      if (s.bell > (last?.bell || 0)) (seen.bellD ||= []).push(s.d);
      last = s;
      if (s.done || s.dead) break;
    }
    const bot = await pg.evaluate(() => window.__botP);
    await pg.waitForTimeout(1500); await shot();
    // the crawl home and the island
    await A5.until(pg, () => { const b = window.__G.zone.boss; return !b || b.settled || window.__G.hero.flags.towerDown; }, 60000);
    await pg.waitForTimeout(5000);
    const home = await pg.evaluate((sk) => { const G = window.__G, z = G.zone, b = z.boss, S = z.L.spots.skerry, m = z.map; return { towerDown: !!G.hero.flags.towerDown, at: b && +Math.hypot(b.x - S.x, b.z - S.z).toFixed(1), closed: (S.cells || []).filter(([x, zz]) => !m.walkable(x + 0.5, zz + 0.5)).length, cells: (S.cells || []).length, heroIn: (S.cells || []).some(([x, zz]) => Math.floor(G.player.x) === x && Math.floor(G.player.z) === zz), checkpoint: !!z.checkpoint, beam: window.__act5.beams().map((x) => x.tag), log: Object.fromEntries(Object.entries(window.__act5.AI_LOG).filter(([k]) => k.startsWith('tower:'))) }; });
    await shot();
    const [lo, hi] = (process.env.TTK || '60,300').split(',').map(Number);
    const ttk = bot?.t ?? null, inBand = ttk != null && ttk >= lo && ttk <= hi;
    const bellIn = !seen.bellD || seen.bellD.some((d) => d <= 4.5);
    // (its windows, seen between two looks or told by its tally: at SIMK 4 a 3.5 s Beached lasts under a second)
    const lg = home.log, win = { beached: !!seen.beached || !!seen.stranded || lg['tower:beached'] > 0 || lg['tower:stranded'] > 0, overturned: !!seen.overturned || lg['tower:overturned'] > 0, blinded: !!seen.blinded || lg['tower:lit'] > 0 };
    const pass = !seen.died && !!bot?.done && win.beached && win.overturned && win.blinded && (bot.near ?? 99) <= 1.5 && bellIn && home.towerDown && home.at != null && home.at <= 2.5 && home.closed > 0 && !home.heroIn && inBand && (!process.env.TTK0 || +process.env.DIFF !== 0 || ttk >= 0.6 * +process.env.TTK0);
    return { pass, win, ttk, band: [lo, hi], design: [210, 300], diff: +(process.env.DIFF || 1), cls: process.env.CLS || 'warden', bot: bot && { t: bot.t, deaths: bot.deaths, potions: bot.potions, low: +bot.low.toFixed(2), phases: bot.phases, near: +(bot.near ?? 99).toFixed(2) }, seen, home, setup };
  } },
  // The Breathing-holes, sealed in turn (q28): the three lamps lit and the ring run; the Black Breath shielded (her in its
  // cone) and a lamp lost and lit again; the first hole's Sunken climbing out of the water, the second's Icemaw and lice,
  // the third's Ice Singer; the fail-safe (Alkyone holds the tongue's lamp); each seal's time against its ceiling
  // (SEAL=seconds, by difficulty). DIFF picks the difficulty
  holes: { q: 'auto=farlight&sim=4&q=0&norender&lvl=' + (process.env.LVL || 32) + '&diff=' + (process.env.DIFF || 1) + '&cls=' + (process.env.CLS || 'warden') + '&' + A5.url('alkShip'), run: async (pg, shot) => {
    await A5.tick(pg); await A4.listen(pg);
    await pg.evaluate(() => { window.__immortal = true; });
    const ceil = +(process.env.SEAL || [75, 90, 90, 100, 110, 120][+(process.env.DIFF || 1)]);
    const holes = [];
    const order = await pg.evaluate(() => window.__G.zone.L.spots.holes.map((h) => h.id));
    // (her blade, every frame of a seal: what comes out of the hole, what stands at it or within 16 m of her falls where it
    // stands, but the Sunken while they climb out (counted); the looks below only shield, relight and keep the time)
    await pg.evaluate(() => {
      const G = window.__G, D = window.__D;
      const f = () => {
        const z = G.zone, S = z?.seal, pl = G.player;
        if (S && pl) for (const a of G.actors) {
          if (a.team !== 'foe' || a.dead || a.prop || a.under || !(Math.hypot(a.x - S.ho.x, a.z - S.ho.z) < 22 || Math.hypot(a.x - pl.x, a.z - pl.z) < 16)) continue;
          if (a.kind === 'sunken' && a.rising > 0) { if (!a.roseSeen) { a.roseSeen = true; window.__rose = (window.__rose || 0) + 1; } continue; }
          if (a.kind === 'iceSinger' && a.state === 'song') { const w = window.__sealLive ||= {}; w.caught = (w.caught || 0) + 1; }
          D.kill(a);
          if (!a.dead) { const w = window.__sealLive ||= {}, k = a.kind + (a.hidden ? ':h' : '') + (a.airborne ? ':air' : '') + (a.invuln > 0 ? ':inv' : ''); w[k] = (w[k] || 0) + 1; }
        }
        requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    for (const k of order) {
      const r = { k };
      // to the hole: Alkyone there before her
      r.alk = await pg.evaluate((k) => { const G = window.__G, z = G.zone, ho = z.L.spots.holes.find((h) => h.id === k), a = z.p5?.alkyone?.a; return a ? +Math.hypot(a.x - ho.alk.x, a.z - ho.alk.z).toFixed(1) : null; }, k);
      const t0 = await pg.evaluate(() => window.__G.hero.stats.time);
      for (let i = 0; i < 3; i++) {
        await A5.use(pg, `z.act5.lamps.find((l) => l.hole === ${k} && l.i === ${i})`); await A5.until(pg, (a) => !!window.__G.zone.act5.lamps.find((l) => l.hole === a[0] && l.i === a[1])?.lit, 15000, [k, i]);
        // the fail-safe, once: on the second hole the clock is moved on past the minute as soon as its run begins
        if (k === order[1] && i === 0) { r.forced = true; await pg.evaluate(() => { const S = window.__G.zone.seal; if (S) S.t = Math.max(S.t, 60.5); }); }
      }
      r.started = await pg.evaluate(() => !!window.__G.zone.seal);
      if (k === order[0]) await shot();
      // the run: she shields a lamp the Breath turns on (the first), lets the next go out and lights it again, kills what
      // comes, keeps the others lit
      let shielded = 0, lost = 0, relit = 0, failsafe = false;
      for (const w0 = Date.now(); Date.now() - w0 < 20 * 60000;) {
        const s = await pg.evaluate(([k, shielded, lost]) => {
          const G = window.__G, z = G.zone, S = z.seal, pl = G.player;
          if (!S || S.ho.id !== k) return { done: !!G.hero.flags['hole' + k] };
          const ho = S.ho;
          if (S.tele && S.target) {
            const it = S.target;
            // (between the hole and the lamp: the first point on that line she can stand on, from the lamp in)
            if (shielded < 2 && !lost) { const dl = Math.hypot(it.x - ho.x, it.z - ho.z) || 1; let f = null; for (const k of [0.7, 0.4, 1.1, 0.15, 1.6]) { const x = it.x + (ho.x - it.x) / dl * k, zz = it.z + (ho.z - it.z) / dl * k; if (z.map.walkable(x, zz)) { f = { x, z: zz }; break; } } f ||= z.map.nearestFloor(it.x, it.z, 1.5); pl.x = f.x; pl.z = f.z; return { shield: it.i, ring: S.ring }; }
            const f = z.map.nearestFloor(ho.x - (it.x - ho.x) * 0.9, ho.z - (it.z - ho.z) * 0.9, 3); pl.x = f.x; pl.z = f.z;
            return { away: it.i, ring: S.ring };
          }
          const dark = z.act5.lamps.find((l) => l.hole === k && !l.lit);
          if (dark && !pl.act) { const f = z.map.nearestFloor(dark.x, dark.z + 1.2, 2); pl.x = f.x; pl.z = f.z; dark.use(); return { relight: dark.i, ring: S.ring, lost: S.lost }; }
          return { ring: +S.ring.toFixed(2), lost: S.lost, t: +S.t.toFixed(1), held: !!S.held };
        }, [k, shielded, lost]);
        if (s.done) break;
        if (s.shield != null) { await pg.waitForTimeout(1400); const ok = await pg.evaluate((i) => !!window.__G.zone.act5.lamps.find((l) => l.i === i && l.hole === window.__G.zone.seal?.ho.id)?.lit, s.shield); if (ok) shielded++; if (shielded === 1 && k === order[0]) await shot(); }
        if (s.away != null) { await pg.waitForTimeout(1400); lost++; }
        if (s.relight != null) { await pg.waitForTimeout(1200); relit++; }
        if (s.held) failsafe = true;
        await pg.waitForTimeout(300);
      }
      const t1 = await pg.evaluate(() => window.__G.hero.stats.time);
      // (the fail-safe seen as it is said, if it came and went between two looks)
      if (!failsafe && r.forced) failsafe = await pg.evaluate(() => (window.__says || []).includes('d.alk.s0'));
      Object.assign(r, { secs: +(t1 - t0).toFixed(1), shielded, lost, relit, failsafe, sealed: await pg.evaluate((k) => !!window.__G.hero.flags['hole' + k], k) });
      // (this hole's own: the tally less what it held before)
      r.adds = await pg.evaluate(() => { const L = window.__act5.AI_LOG, P = window.__adds0 || {}, o = {}; for (const key in L) if (/^(sunken|icemaw|hullLouse|iceSinger|skua):/.test(key) && L[key] - (P[key] || 0) > 0) o[key] = L[key] - (P[key] || 0); window.__adds0 = { ...L }; return o; });
      r.rose = await pg.evaluate(() => window.__rose || 0);
      r.live = await pg.evaluate(() => { const w = window.__sealLive; window.__sealLive = null; return w; });
      await A5.until(pg, () => !window.__G.cine, 60000);
      await shot();
      holes.push(r); console.log('holes ' + JSON.stringify(r));
      // the next hole: Alkyone gone ahead; she follows
      await pg.waitForTimeout(2500);
    }
    const end = await pg.evaluate(() => ({ quest: window.__G.hero.quest, holes: [0, 1, 2].filter((k) => window.__G.hero.flags['hole' + k]).length, markers: window.__G.zone.act5.markers.length, says: (window.__says || []).filter((k) => /alk\.s|skotos\.law/.test(k)), cp: window.__G.hero.flags.cp5?.farlight }));
    // the last hole sealed is where she wakes (the Skotos's retry), across a Continue as well
    await A5.reload(pg);
    await A5.travel(pg, 'farlight', 'waypoint');
    await pg.evaluate(() => { const G = window.__G; window.__immortal = false; G.player.hp = 0; window.__D.emit('heroDeath'); });
    await A5.until(pg, () => window.__G.panel === 'dead', 30000);
    await pg.evaluate(() => { window.__D.closePanel(); window.__D.emit('respawn', false); });
    await pg.waitForFunction(() => !window.__G.player.dead && !document.getElementById('fade').classList.contains('on'), null, { timeout: 240000 });
    await pg.waitForTimeout(800);
    end.woke = await pg.evaluate(() => { const G = window.__G, z = G.zone, ho = z.L.spots.holes.find((h) => h.id === 2), B = z.L.boss; return { zone: z.id, d: +Math.hypot(G.player.x - ho.alk.x, G.player.z - ho.alk.z).toFixed(1), toArena: +Math.hypot(G.player.x - B.x, G.player.z - B.z).toFixed(1) }; });
    await shot();
    const pass = holes.length === 3 && holes.every((r) => r.sealed && r.secs <= ceil) && holes.some((r) => r.shielded > 0) && holes.some((r) => r.relit > 0) && holes.some((r) => r.failsafe) && end.quest >= 29 && end.cp === 'hole2' && end.woke.zone === 'farlight' && end.woke.d < 3;
    return { pass, ceil, diff: +(process.env.DIFF || 1), holes, end };
  } },
  // The Skotos, fought by the boss bot: the three Remembers, a Breach beside a lit cairn (Seared), the relight, Smother;
  // its life held by its floors (never under 20% before the third Remember, nor under 10% before the relight); she dies
  // after the third Remember and comes back (her name hidden again, the Remembers played again, the Night's hold let go by
  // their count); the time to kill against the curve (TTK=lo,hi; the
  // design's 5:30-7:30 reported beside it, and the clean time without the retry). RETRY=0 skips the death
  skotos: { q: 'auto=farlight&sim=4&q=0&norender&lvl=' + (process.env.LVL || 34) + '&diff=' + (process.env.DIFF || 1) + '&cls=' + (process.env.CLS || 'warden') + '&' + A5.url('ternSeen'), run: async (pg, shot) => {
    await A5.tick(pg); await A4.listen(pg);
    await A5.use(pg, 'z.act5.farIt');
    await A5.until(pg, () => { const b = window.__G.zone.boss; return !!b && !b.holdWake && !b.hidden && !window.__G.cine; }, 240000);
    await shot();
    await pg.evaluate(() => { const b = window.__G.zone.boss; window.__act5.damage(window.__G.player, b, 1, { crit: false }); });
    // (every blow that reached her life: the last ones are reported if she dies when the run did not mean her to)
    await pg.evaluate(async () => { const Bus = await import('/src/ui/bus.js'), G = window.__G; window.__hurts = []; Bus.on('hurt', (f) => { const b = G.zone.boss; window.__hurts.push({ t: +G.hero.stats.time.toFixed(1), f: +f.toFixed(3), hp: +(G.player.hp / G.player.hpMax).toFixed(2), b: b && [b.st, b.phase, b.act?.name || b.state].join('/'), at: new Error().stack.split('\n').slice(3, 6).map((l) => l.trim().replace(/^at /, '').replace(/\(?https?:[^)]*\/src\//, '').replace(/\?[^:]*/, '')).join(' < ') }); if (window.__hurts.length > 40) window.__hurts.shift(); }); });
    await pg.evaluate((o) => { window.SIMK = 4; window.__botP = (new Function('return ' + o.src)())({ kind: 'skotos', maxT: o.maxT }).catch((e) => { window.__botErr = String(e.stack || e); }); }, { src: BOT5.toString(), maxT: +(process.env.MAXT || 1500) });
    const retry = process.env.RETRY !== '0', seen = { min: 1, minNight: 1 }, shots = new Set();
    // (the planned death is dealt in the page, the frame the third Remember is seen: a 1.5 s look can miss the moment
    // between it and the fire given)
    if (retry) await pg.evaluate(() => { const G = window.__G, f = () => { const b = G.zone.boss; if (b && !b.dead && G.selnaBack && b.phase >= 1 && !G.zone.relit && !G.player.dead) { window.__planned = { t: window.BOT?.t ?? 0 }; window.BOT.stop = false; G.player.hp = 0; window.__D.emit('heroDeath'); return; } requestAnimationFrame(f); }; requestAnimationFrame(f); });
    let last = null, died = null, back = null;
    for (const t0 = Date.now(); Date.now() - t0 < 150 * 60000;) {
      await pg.waitForTimeout(1500);
      const s = await pg.evaluate(() => { const G = window.__G, z = G.zone, b = z.boss, B = window.BOT, L = window.__act5.AI_LOG; if (!b || !B) return window.__botErr ? { err: window.__botErr } : null; return { t: +B.t.toFixed(1), done: B.done, end: !!B.end, dead: b.dead, phase: b.phase, rem: b.remembers || 0, back: !!G.selnaBack, relit: !!z.relit, hp: +(b.hp / b.hpMax).toFixed(3), seared: L['skotos:seared'] || 0, relitN: L['skotos:relit'] || 0, nightSeared: L['skotos:breachSeared'] || 0, smother: (L['skotos:smothered'] || 0) + (L['skotos:coil'] || 0), coil: L['skotos:coil'] || 0, night: L['skotos:night'] || 0, breach: L['skotos:breach'] || 0, wrap: L['skotos:wrap'] || 0, cameo: (z.cameoNpcs || []).length, mode: G.mode, panel: G.panel }; });
      if (!s) continue;
      if (s.err) { console.log('skotos bot error: ' + s.err.slice(0, 600)); break; }
      if (Date.now() - (seen.logT || 0) > 30000) { seen.logT = Date.now(); console.log('skotos ' + JSON.stringify(s)); }
      // (what the last look saw counts too: a Coil cast within 1.5 s of the end)
      for (const k of ['night', 'seared', 'wrap', 'smother', 'coil']) if (s[k] && !shots.has(k)) { shots.add(k); seen[k] = s.t; await shot(); }
      if (s.end && !(died && !back)) break;
      // (its floors: 20% while the Night waits for the third Remember, 10% under that until the relight, 10% at the least)
      if (!s.relit && !s.dead) seen.min = Math.min(seen.min, s.hp);
      if (s.phase <= 1 && s.rem < 3 && !s.dead) seen.minNight = Math.min(seen.minNight, s.hp);
      if (s.rem > (last?.rem || 0)) (seen.rem ||= []).push([s.rem, s.t]);
      if ((s.relit || s.relitN > (seen.relitN0 ?? s.relitN)) && !seen.relit) { seen.relit = s.t; await shot(); }
      seen.relitN0 ??= s.relitN;
      if (s.back && !seen.back) seen.back = s.t;
      // (a Breach in the Night beside a lit cairn: Seared; the beam's Sear is the third phase's)
      if (s.nightSeared && !seen.searedNight) { seen.searedNight = s.t; await shot(); }
      // she dies just after the third Remember; then up again at the light, and the fight goes on
      const planned = retry && !died && await pg.evaluate(() => window.__planned);
      if (planned) {
        died = { t: +planned.t.toFixed(1) };
        await A5.until(pg, () => window.__G.panel === 'dead', 30000);
        died.hidden = await pg.evaluate(async () => { const S = await import('/src/game/story.js'); return { name: S.npcName('selna'), selnaBack: !!window.__G.selnaBack }; });
        await pg.evaluate(() => { window.__D.closePanel(); window.__D.emit('respawn', false); });
        await pg.waitForFunction(() => window.__G.zone?.id === 'farlight' && !window.__G.player.dead && !document.getElementById('fade').classList.contains('on'), null, { timeout: 240000 });
        await pg.waitForTimeout(2000);
        died.after = await pg.evaluate(() => { const b = window.__G.zone.boss; return { rem: b.remembers || 0, hp: +(b.hp / b.hpMax).toFixed(3), phase: b.phase, lock: b.lockPhase, floor: +(b.hpFloor / b.hpMax).toFixed(3) }; });
        await pg.evaluate((o) => { window.BOT.stop = true; }, {});
        await pg.evaluate((o) => { window.__botP = (new Function('return ' + o.src)())({ kind: 'skotos', maxT: o.maxT, build: false }).catch((e) => { window.__botErr = String(e.stack || e); }); }, { src: BOT5.toString(), maxT: +(process.env.MAXT || 1500) });
        await shot();
        // (the new bot keeps its own clock: what follows is read on it)
        continue;
      }
      if (died && !back && s.back) back = { t: s.t };
      // a death the run did not mean: what struck her, then up again at the light (once; a second ends the run)
      if (s.panel === 'dead' && !(died && !died.after)) {
        const u = { t: s.t, phase: s.phase, rem: s.rem, hurts: await pg.evaluate(() => window.__hurts.slice(-8)) };
        (seen.unplanned ||= []).push(u); console.log('skotos unplanned death ' + JSON.stringify(u));
        if (seen.unplanned.length > 1) break;
        await pg.evaluate(() => { window.__D.closePanel(); window.__D.emit('respawn', false); });
        await pg.waitForFunction(() => window.__G.zone?.id === 'farlight' && !window.__G.player.dead && !document.getElementById('fade').classList.contains('on'), null, { timeout: 240000 });
      }
      last = s;
      if (s.done || s.dead) break;
    }
    const bot = await pg.evaluate(() => window.__botP);
    const end = await pg.evaluate(() => { const G = window.__G, z = G.zone, b = z.boss, L = window.__act5.AI_LOG; return { dead: !!b?.dead, skotosDown: !!G.hero.flags.skotosDown, log: Object.fromEntries(Object.entries(L).filter(([k]) => k.startsWith('skotos:'))), remembers: (window.__says || []).filter((k) => /^name\.|selna\.(self|p2)/.test(k)) }; });
    await A5.until(pg, () => !!window.__G.cine, 30000); await pg.waitForTimeout(2500); await shot();
    const [lo, hi] = (process.env.TTK || '90,420').split(',').map(Number);
    const ttk = last?.t ?? null, clean = died && back ? +(died.t + (ttk - back.t)).toFixed(1) : ttk, inBand = clean != null && clean >= lo && clean <= hi;
    const pass = !seen.unplanned && end.dead && end.skotosDown && (seen.rem || []).length >= 3 && !!seen.searedNight && !!seen.relit && (!!seen.smother || (end.log['skotos:smothered'] || 0) + (end.log['skotos:coil'] || 0) > 0) && seen.min >= 0.095 && seen.minNight >= 0.195 && (!retry || (died?.hidden?.name === '…' && !died.hidden.selnaBack && died.after.rem === 0 && died.after.hp >= 0.6 && !!back)) && inBand;
    return { pass, ttk, clean, band: [lo, hi], design: [330, 450], bot: bot && { deaths: bot.deaths, potions: bot.potions, low: +bot.low.toFixed(2), phases: bot.phases }, seen, died, back, end };
  } },
  // The Freeze: played to its end in one session (the coast built in the tide's reading is built again frozen, from its
  // seed); then the state before it again, the scene started on entry and the game quit mid-scene; loaded again: the quest
  // caught up, the coast built frozen from the same seed (the sea north of the bay frozen walkable, the road onto it thick,
  // the exit north open)
  freeze: { q: 'auto=town&sim=4&q=0&norender&lvl=30&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    await A5.tick(pg); await A4.listen(pg);
    const look = () => pg.evaluate(() => { const G = window.__G, z = G.zone, L = z.L, R = L.spots.iceRoad, e = z.interact.find((i) => i.kind === 'exit' && i.to === 'farlight'), B = L.boss; let bayIce = 0, northIce = 0; for (let dz = -14; dz <= 14; dz++) for (let dx = -14; dx <= 14; dx++) { const x = Math.floor(B.x + dx), zz = Math.floor(B.z + dz), i = zz * L.w + x; if (L.thick[i] || L.ice[i]) bayIce++; } for (let zz = 2; zz < B.z - 16; zz++) for (let x = Math.max(2, Math.floor(B.x) - 24); x < Math.min(L.w - 2, Math.floor(B.x) + 24); x++) { const i = zz * L.w + x; if ((L.ice[i] || L.thick[i]) && z.map.walkable(x + 0.5, zz + 0.5)) northIce++; } return { mode: z.mode, Lmode: L.mode, seed: z.seed, camp: [L.spots.camp.x, L.spots.camp.z], road: R ? R.cells.filter(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)).length + '/' + R.cells.length : null, exit: e ? (!e.locked || !!G.hero.flags[e.locked]) : null, bayIce, northIce }; });
    await A5.state(pg, 'towerDown', { quest: 27, zone: 'coast', at: 'waypoint' });
    const tide = await look(); await pg.evaluate(() => { window.__coastZ = window.__G.zone; });
    await A5.until(pg, () => !!window.__G.cine, 30000);
    await pg.waitForFunction(() => !window.__G.cine || window.__G.cine.t >= 6, null, { timeout: 120000 }); await shot();
    await A5.until(pg, () => window.__G.hero.quest >= 28 && window.__G.zone?.id === 'coast' && window.__G.zone.mode === 'frozen' && !window.__G.cine, 300000);
    await pg.waitForTimeout(1500); await shot();
    const played = { ...(await look()), rebuilt: await pg.evaluate(() => window.__G.zone !== window.__coastZ), quest: await pg.evaluate(() => window.__G.hero.quest) };
    // again, quit mid-scene
    await A5.state(pg, 'towerDown', { quest: 27, zone: 'coast', at: 'waypoint' });
    await A5.until(pg, () => !!window.__G.cine, 30000);
    await pg.waitForFunction(() => !window.__G.cine || window.__G.cine.t >= 6, null, { timeout: 120000 });
    const mid = await pg.evaluate(() => ({ frozen: !!window.__G.hero.flags.frozen, t: +(window.__G.cine?.t || 0).toFixed(1) }));
    await A5.reload(pg, { write: false });
    const after = { quest: await pg.evaluate(() => window.__G.hero.quest) };
    await A5.travel(pg, 'coast', 'waypoint');
    Object.assign(after, await look());
    await shot();
    const pass = tide.mode === 'tide' && played.mode === 'frozen' && played.rebuilt && played.seed === tide.seed && mid.frozen && after.quest === 28 && after.mode === 'frozen' && after.Lmode === 'frozen' && after.seed === tide.seed && after.camp.join() === played.camp.join() && after.exit === true && after.northIce > tide.northIce + 50 && after.road === played.road && /^(\d+)\/\1$/.test(after.road || '');
    return { pass, tide, played, mid, after };
  } },
  // The end of the act: the Skotos struck down (its Remembers given), the naming, the title card, the answer; the lantern
  // room and the carving (q30); home: the green over Whitecliff, the child told their names, the fourth fire and the three
  // sea-lights answering, the act panel, the blessings with the Coast's three. Selna's name back in the quest text
  ending5: { q: 'auto=farlight&sim=4&q=0&norender&lvl=34&cls=' + (process.env.CLS || 'mage') + '&' + A5.url('ternSeen'), run: async (pg, shot) => {
    await A5.tick(pg); await A4.listen(pg);
    await pg.evaluate(() => { window.__immortal = true; window.__G.hero.flags.names = ['keyx', 'thaleia', 'carriers', 'sailor']; window.__G.hero.flags.remembered = true; });
    // (a scene's clock stands while its dialog is open: the dialogs are advanced while it is waited for)
    const at = (t) => A5.until(pg, (t) => !window.__G.cine || window.__G.cine.t >= t, 180000, t);
    const step = (k) => console.log('ending5 step ' + k + ' ' + Date.now());
    const q0 = await A5.quest(pg);
    await A5.use(pg, 'z.act5.farIt');
    await A5.until(pg, () => { const b = window.__G.zone.boss; return !!b && !b.holdWake && !b.hidden && !window.__G.cine; }, 240000);
    // (the fight: its three Remembers given, then struck down)
    await pg.evaluate(async () => { const G = window.__G, b = G.zone.boss, Bus = await import('/src/ui/bus.js'); b.remembers = 3; Bus.emit('selnaRemembered', b, 2); });
    await pg.evaluate(async () => { window.__G.selnaBack = true; (await import('/src/ui/bus.js')).emit('quest'); });
    await pg.waitForTimeout(800);
    const q1 = { ...(await A5.quest(pg)), ...(await pg.evaluate(async () => { const S = await import('/src/game/story.js'), I = await import('/src/i18n/i18n.js'); return { name: S.npcName('selna'), want: I.t('npc.selna') }; })) };
    await A5.hit(pg, null);
    await A5.until(pg, () => !!window.__G.cine, 30000);
    await at(2); await shot();
    await A5.until(pg, () => !!document.querySelector('#titlecard'), 240000);
    await pg.waitForTimeout(1500); await shot();
    await A5.until(pg, () => window.__G.hero.flags.seaLit && !!window.__G.cine && window.__G.cine.t >= 6, 240000); await shot();
    await A5.until(pg, () => window.__G.hero.flags.seaLit && !window.__G.cine, 240000);
    const named = await pg.evaluate(() => { const F = window.__G.hero.flags; return { skotosDown: !!F.skotosDown, selnaBack: !!F.selnaBack, seaLit: !!F.seaLit, says: (window.__says || []).filter((k) => /naming|skotos\.die|lit\.|alk\.k/.test(k)) }; });
    step('lantern');
    // the lantern room (Ice Memory 4), the carving
    await A5.use(pg, 'z.act5.farIt');
    await A5.until(pg, () => window.__G.hero.flags.mem_i4 && !window.__G.cine, 240000);
    await A5.use(pg, 'z.act5.doorIt');
    await A5.until(pg, () => !!window.__G.cine, 30000); await at(3); await shot();
    await A5.until(pg, () => window.__G.hero.quest >= 30 && !window.__G.cine, 240000);
    const carved = await pg.evaluate(() => ({ quest: window.__G.hero.quest, carved: !!window.__G.hero.flags.carved, mem: !!window.__G.hero.flags.mem_i4 }));
    step('home');
    // home
    await A5.travel(pg, 'town', 'waypoint');
    await pg.waitForFunction(() => !!window.__G.cine, null, { timeout: 30000 }).catch(() => {});
    await at(3); await shot();
    await pg.waitForFunction(() => !window.__G.cine && !!window.__G.zone.p5?.child, null, { timeout: 180000 });
    step('child');
    const child = await pg.evaluate(() => { const n = window.__G.zone.p5.child; return { model: n.a.avatar.modelName, news: !n.it.used }; });
    await pg.evaluate(() => { const G = window.__G, it = G.zone.p5.child.it; G.player.x = it.x; G.player.z = it.z + 1.4; it.use(); });
    const told = await pg.evaluate(() => [...document.querySelectorAll('#dialog .txt')].map((e) => e.textContent).join(' '));
    await A4.dialogs(pg, 6, () => !!window.__G.cine);
    await at(4); await shot();
    await at(10); await shot();
    await A5.until(pg, () => !window.__G.cine && !!window.__G.panel, 180000);
    await pg.waitForTimeout(1200); await shot();
    step('act');
    const act = await pg.evaluate(() => ({ panel: window.__G.panel, done: document.querySelector('.act-h')?.textContent, sub: document.querySelector('#panel .pn-b p')?.textContent, next: [...document.querySelectorAll('#panel .muted')].map((e) => e.textContent).pop() }));
    await pg.click('[data-a="close"]').catch(() => {});
    await A5.until(pg, () => !!document.querySelector('[data-a^="boon:"]'), 60000);
    await pg.waitForTimeout(800); await shot();
    const boon = await pg.evaluate(() => ({ panel: window.__G.panel, title: document.querySelector('.act-h')?.textContent, note: document.querySelector('#panel .pn-b .muted')?.textContent, cards: [...document.querySelectorAll('[data-a^="boon:"]')].map((e) => e.dataset.a + ' ' + e.querySelector('p')?.textContent) }));
    const end = await pg.evaluate(() => { const G = window.__G, h = G.hero; return { act5: h.act5, flag: h.flags.act5, toldChild: h.flags.toldChild, quest: h.quest }; });
    const pass = named.skotosDown && named.selnaBack && named.seaLit && carved.quest === 30 && carved.carved && carved.mem && !child.news === false && end.act5 >= 0 && end.quest === 31 && boon.cards.length === 3 && q0.text.includes('…') && !q1.text.includes('…') && q1.name === q1.want;
    return { pass, q0, q1, named, carved, child, told, act, boon, end };
  } },
  // Act V's cast, real or stand-in: every new monster and person spawned and lined up, in a cold session that follows the
  // real route (Whitecliff, the Field, down the Neck) and in one that starts at the coast's waypoint; the Farthest Light's
  // (Selna, Tern, the keepers' memories) on the ice. Pass: none missing; on these routes none a stand-in
  cast5: { q: 'auto=town&sim=2&q=' + (process.env.Q || '0') + '&norender&lvl=30&cls=warden', run: async (pg, shot) => {
    await A5.tick(pg);
    const MON = ['sunken', 'harpooner', 'iceSinger', 'hullLouse', 'icemaw', 'reefback', 'rimeBear', 'skua', 'tower', 'skotos', 'skotosHand', 'skotosCoil'];
    const NPC = ['alkyone', 'selna', 'tern', 'tamarisk', 'glaukos', 'shorefolk', 'child', 'first', 'einarBoy', 'einar', 'arnaLast', 'keeperYoung'];
    const line = (o) => pg.evaluate(async ({ MON, NPC }) => {
      const G = window.__G, z = G.zone, A = window.__act5, gfx = await import('/src/gfx/gfx.js'), out = {};
      for (const a of G.actors) if (a.team === 'foe') { a.dead = true; a.remove?.(); }
      for (const p of z.packs) p.spawned = true; z.bossSpawned = true;
      const c = z.L.spots.camp || z.L.spots.waypoint || z.L.start;
      MON.forEach((id, i) => { const f = z.map.nearestFloor(c.x - 14 + i * 2.6, c.z - 4, 4); try { const m = A.spawnMonster(id, f.x, f.z, { surface: true, free: true, dormant: false }); m.dormant = true; m.hidden = false; m.under = false; m.aggro = false; if (m.avatar) m.avatar.group.visible = true; m.y = 0; m.rot = 0; G.actors.push(m); out[id] = (m.avatar?.modelName || '-') + (m.avatar?.standIn ? '*' : ''); } catch (e) { out[id] = 'ERR ' + e.message; } });
      NPC.forEach((k, i) => { const f = z.map.nearestFloor(c.x - 14 + i * 2.6, c.z + 2, 4); try { const a = A.spawnNpc(k, f.x, f.z, 0, {}); G.actors.push(a); out['npc:' + k] = (a.avatar?.modelName || '-') + (a.avatar?.standIn ? '*' : ''); } catch (e) { out['npc:' + k] = 'ERR ' + e.message; } });
      const h = z.map.nearestFloor(c.x, c.z + 8, 4); G.player.x = h.x; G.player.z = h.z;
      gfx.R.cam.dist = 30; gfx.updateCamera(0, c.x, c.z, true);
      return out;
    }, { MON, NPC });
    const out = {};
    // the real route: Whitecliff at q25, the Field, the Neck
    await A5.state(pg, 'alkField', {});
    await A5.travel(pg, 'ashfield', 'town');
    await A5.use(pg, "z.interact.find((i) => i.kind === 'exit' && i.to === 'coast')");
    await pg.waitForFunction(() => window.__G.zone?.id === 'coast' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 300000 });
    await A5.until(pg, () => window.__G.hero.flags.coastSeen && !window.__G.cine, 240000);
    out.route = await line(); await pg.waitForTimeout(2000); await shot();
    // cold, at the coast's waypoint (the Field never loaded)
    await A5.state(pg, 'rite', { quest: 26 });
    await A5.reload(pg, { q: 'q=' + (process.env.Q || '0') + '&sim=2&norender' });
    await A5.travel(pg, 'coast', 'waypoint');
    out.waypoint = await line(); await pg.waitForTimeout(2000); await shot();
    out.sets = await pg.evaluate(async () => { const P = await import('/src/gfx/people.js'); return ['frost', 'folk', 'grove', 'ash'].filter((s) => P.hasPerson({ frost: 'alkyone', folk: 'brokka', grove: 'elati', ash: 'ivar' }[s])); });
    const bad = (o) => Object.entries(o).filter(([, v]) => /ERR|^-$|\*$/.test(v)).map(([k, v]) => k + '=' + v);
    return { pass: !bad(out.route).length && !bad(out.waypoint).length, standIns: { route: bad(out.route), waypoint: bad(out.waypoint) }, ...out };
  } },
  // Both echoes, once the sea is lit: the Tower's on its island, the Skotos's at the ice edge; each raised, fought, put
  // down; the story untouched, loot, the toast
  echo5: { q: 'auto=coast&sim=4&q=0&norender&lvl=34&cls=' + (process.env.CLS || 'warden') + '&' + A5.url('toldChild') + ',act5', run: async (pg, shot) => {
    await A5.tick(pg); await A4.listen(pg);
    // (the loot: what lies on the ground and what she has already picked up where she stands)
    await pg.evaluate(async () => { const B = await import('/src/ui/bus.js'); window.__picked = 0; B.on('itemPicked', () => { window.__picked++; }); });
    const out = {};
    for (const zid of ['coast', 'farlight']) {
      await pg.evaluate(async (zid) => { const G = window.__G, h = G.hero; window.__immortal = true; h.quest = 31; h.act5 = 1; h.boons = ['ember', 'forge', 'amber', 'lantern', 'name']; window.__D.closePanel(); const W = await import('/src/game/world.js'); await W.zoneReady(zid); window.__D.enterZone(zid, { fresh: true }); for (const p of G.zone.packs) p.spawned = true; }, zid);
      await pg.waitForTimeout(1500);
      const before = await pg.evaluate(() => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'echo'); if (!it) return { echo: false }; const f = z.map.nearestFloor(it.x, it.z + 2, 3); G.player.x = f.x; G.player.z = f.z; it.use(); it.use(); return { echo: it.boss, prompt: window.__D.t(it.prompt), flags: Object.keys(G.hero.flags).length }; });
      await A5.until(pg, () => { const b = window.__G.zone.boss; return !!b && b.echo && !b.holdWake && !window.__G.cine; }, 60000);
      await pg.waitForTimeout(2500); await shot();
      const spawned = await pg.evaluate(() => { const G = window.__G, b = G.zone.boss; return b && { kind: b.kind, echo: b.echo, awake: b.awake, bar: G.bossActor === b, hidden: !!b.hidden }; });
      await pg.evaluate(() => { window.__picked = 0; });
      await A5.hit(pg, null);
      await pg.waitForTimeout(4000); await shot();
      out[zid] = await pg.evaluate((o) => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'echo'); return { ...o, dead: !!z.boss?.dead, bar: !!G.bossActor, quest: G.hero.quest, flags: Object.keys(G.hero.flags).length, used: it?.used, mode: G.mode, loot: G.pickups.filter((p) => p.item).length + (window.__picked || 0), toast: [...document.querySelectorAll('.toast')].map((e) => e.textContent).pop(), force: window.__act5.tide.TIDE?.force || null }; }, { before, spawned });
    }
    const ok = (r) => r.before.echo && r.spawned?.echo && r.dead && !r.bar && r.quest === 31 && r.loot > 0 && r.mode === 'play';
    return { pass: ok(out.coast) && ok(out.farlight) && !out.coast.force, ...out };
  } },
  // Act V's places to wake survive a Continue (as Act IV's waylamps do): a sea-light lit, the game loaded again, a death on
  // the coast: she wakes by that light; the Tower awake: by the bay's shore rock (its retry), again across a Continue
  cp5: { q: 'auto=town&sim=4&q=0&norender&lvl=30&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
    await A5.tick(pg); await A4.listen(pg);
    const die = async () => {
      await pg.evaluate(() => { const G = window.__G; window.__immortal = false; G.player.hp = 0; window.__D.emit('heroDeath'); });
      await A5.until(pg, () => window.__G.panel === 'dead', 30000);
      await pg.evaluate(() => { window.__D.closePanel(); window.__D.emit('respawn', false); });
      await pg.waitForFunction(() => !window.__G.player.dead && !document.getElementById('fade').classList.contains('on'), null, { timeout: 240000 });
      await pg.waitForTimeout(800);
    };
    const where = (k) => pg.evaluate((k) => { const G = window.__G, z = G.zone, S = z.L.spots, p = k === 'rock' ? S.npcs.rock : /^hole/.test(k) ? S.holes.find((h) => 'hole' + h.id === k)?.alk : z.act5.lights.find((l) => l.id === k), pl = G.player; return { zone: z.id, key: G.hero.flags.cp5?.[z.id], cp: !!z.checkpoint, d: p ? +Math.hypot(pl.x - p.x, pl.z - p.z).toFixed(1) : null }; }, k);
    // a sea-light lit (its memory seen), then a Continue: the coast built again, and a death there
    await A5.state(pg, 'rite', { quest: 26, zone: 'coast', at: 'waypoint' });
    await A5.use(pg, "z.act5.lights.find((l) => l.id === 'grey')");
    await A5.until(pg, () => window.__G.hero.flags.mem_i1 && !window.__G.cine, 240000);
    const lit = await where('grey');
    await A5.reload(pg);
    await A5.travel(pg, 'coast', 'waypoint');
    const back = await where('grey');
    await die();
    const woke = await where('grey'); await shot();
    // the Tower awake (the three lights, their memories): a retry by the bay's shore rock, across a Continue too
    // (when the Tower's waking and its checkpoint happen, which zone and scene: reported if the checkpoint is missed)
    await pg.evaluate(() => { const G = window.__G, F = G.hero.flags; window.__cpLog = []; for (const k of ['towerWake', 'cp5']) { let v = F[k]; delete F[k]; Object.defineProperty(F, k, { get() { return v; }, set(x) { v = x; window.__cpLog.push([k, JSON.stringify(x), +G.hero.stats.time.toFixed(1), G.zone?.id, !!G.cine, new Error().stack.split('\n').slice(2, 5).map((l) => l.trim().replace(/\(?https?:[^)]*\/src\//, '').replace(/\?[^:]*/, '')).join(' < ')]); }, configurable: true, enumerable: false }); } });
    await A5.state(pg, 'mem_i3', { quest: 26, zone: 'coast', at: 'waypoint' });
    // (on a loaded machine the waking scene can outlast four minutes: a wait that ran out is reported, not read as a miss)
    const waited = await A5.until(pg, () => window.__G.hero.flags.towerWake && !window.__G.cine, 600000);
    const tw = await where('rock');
    if (!waited) tw.timedOut = true;
    if (tw.key !== 'rock') tw.log = await pg.evaluate(() => window.__cpLog);
    await die();
    const woke2 = await where('rock'); await shot();
    await A5.reload(pg);
    await A5.travel(pg, 'coast', 'waypoint');
    await die();
    const woke3 = await where('rock'); await shot();
    // the third hole sealed, Tern met: the Skotos's retry by that hole, across a Continue too
    await A5.state(pg, 'ternSeen', { zone: 'farlight', at: 'waypoint', flags: { cp5: { coast: 'island', farlight: 'hole2' } } });
    const sk = await where('hole2');
    await die();
    const woke4 = await where('hole2'); await shot();
    await A5.reload(pg);
    await A5.travel(pg, 'farlight', 'waypoint');
    await die();
    const woke5 = { ...(await where('hole2')), toBoss: await pg.evaluate(() => { const G = window.__G, B = G.zone.L.boss; return +Math.hypot(G.player.x - B.x, G.player.z - B.z).toFixed(1); }) }; await shot();
    const pass = lit.key === 'grey' && back.key === 'grey' && back.cp && woke.d < 3.5 && tw.key === 'rock' && woke2.d < 3 && woke3.key === 'rock' && woke3.d < 3 && sk.key === 'hole2' && sk.cp && woke4.d < 3.5 && woke5.key === 'hole2' && woke5.d < 3.5;
    return { pass, lit, back, woke, tw, woke2, woke3, sk, woke4, woke5 };
  } },
  // Brokka and Elati walk on with the keepers in the Skotos's third phase, Deepstone's fire and the beacon-tree's in their
  // sea-lanterns, and set them to the Farthest Light with the keepers: the real people when their sets are loaded; their
  // stand-ins (the smith, the ranger) in a cold session where the two sets never come (their files refused)
  cameo: { q: 'auto=farlight&sim=4&q=0&norender&lvl=34&cls=' + (process.env.CLS || 'warden') + '&' + A5.url('ternSeen'), run: async (pg, shot) => {
    const run = async (p) => {
      await A5.tick(p); await A4.listen(p);
      await p.evaluate(() => { window.__immortal = true; });
      await A5.use(p, 'z.act5.farIt');
      await A5.until(p, () => { const b = window.__G.zone.boss; return !!b && !b.holdWake && !b.hidden && !window.__G.cine; }, 240000);
      // (phase 3: its Remembers given, struck to the third phase; the keepers walk on, and with them the two)
      await p.evaluate(async () => { const G = window.__G, b = G.zone.boss, Bus = await import('/src/ui/bus.js'); b.remembers = 3; G.selnaBack = true; Bus.emit('quest'); });
      await A5.hit(p, 0.5); await p.waitForTimeout(1500);
      await p.evaluate(() => { const b = window.__G.zone.boss; b.lockPhase = null; b.hpFloor = 0; b.hp = b.hpMax * 0.28; });
      await A5.until(p, () => (window.__G.zone.cameoNpcs || []).length >= 2, 120000);
      await p.waitForTimeout(3000); await shot(p);
      const walk = await p.evaluate(() => { const G = window.__G, z = G.zone, L = window.__act4; return z.cameoNpcs.map((a) => ({ kind: a.kind || a.npc, model: a.avatar?.modelName, standIn: !!a.avatar?.standIn, lamp: !!a.avatar?.held?.R, pool: !!L.getLightPool('keeper:' + (a.npc || a.kind)) })); });
      await A5.until(p, () => (window.__G.zone.cameoNpcs || []).every((a) => !a.walking), 90000);
      const keepers = await p.evaluate(() => { const z = window.__G.zone, K = z.L.spots.npcs.keepers; return z.cameoNpcs.map((a, i) => +Math.hypot(a.x - K[i ? 5 : 0].x, a.z - K[i ? 5 : 0].z).toFixed(1)); });
      // (the stair takes the fire in 2 s; a blow worth a tenth of her life breaks it: again)
      for (let i = 0; i < 10 && !(await p.evaluate(() => !!window.__G.zone.relit)); i++) { await A5.use(p, 'z.act5.farIt'); await A5.until(p, () => !!window.__G.zone.relit, 6000); }
      await p.waitForTimeout(2500); await shot(p);
      const says = await p.evaluate(() => (window.__says || []).filter((k) => /brokka|elati|relight/.test(k)));
      await A5.hit(p, null);
      await A5.until(p, () => window.__G.hero.flags.seaLit && !window.__G.cine, 300000);
      const gone = await p.evaluate(() => (window.__G.zone.cameoNpcs || []).every((a) => a.removed || a.fading || !a.avatar?.group.visible || a.dead));
      return { walk, keepers, says, gone };
    };
    const warm = await run(pg);
    // the cold session: the two sets refused (a failed load), a fresh page in a context of its own
    const ctx = await pg.context().browser().newContext({ viewport: { width: 1280, height: 720 } });
    const p2 = await ctx.newPage();
    p2.on('pageerror', (e) => logs.push('pageerror(cold): ' + e.message));
    await p2.route(/\/(folk|grove)\.glb/, (r) => r.abort());
    await p2.addInitScript(() => { setInterval(() => { const G = window.__G; if (G?.player && window.__immortal) { G.player.hp = G.player.hpMax; G.player.dead = false; } }, 50); });
    await p2.goto(A5.base + '?' + pg.url().split('?')[1]);
    await p2.waitForFunction(() => window.__ready && window.__G?.player && window.__G.mode === 'play', null, { timeout: 300000 });
    const shot2 = shot; let cold;
    try { cold = await run(p2); } finally { await ctx.close(); }
    void shot2;
    const real = (w) => w.length === 2 && w.every((a) => !a.standIn && a.lamp && a.pool);
    const stand = (w) => w.length === 2 && w.every((a) => a.standIn && a.lamp) && w.map((a) => a.model).sort().join() === 'ranger,smith';
    return { pass: real(warm.walk) && stand(cold.walk) && warm.keepers.every((d) => d < 2.5) && warm.says.length >= 2 && warm.gone, warm, cold };
  } },
  // The sixth difficulty: locked until Act V is finished on Ash (the waypoints' six chips, the locked toast), open after;
  // chosen: the zones dropped and disposed, an Act V zone on it with a seed of its own (coast@5) and HAZ5's values (the
  // tide's clock, the wash-out and plunge, the ice's load, the Cold, the boss cooldowns and adds), the monsters' scaling
  diff6: { q: 'auto=town&sim=2&q=0&lvl=40&cls=' + (process.env.CLS || 'ranger') + '&' + A5.url('toldChild') + ',act5', run: async (pg, shot) => {
    await A5.tick(pg);
    const out = {};
    const chips = () => pg.evaluate(() => [...document.querySelectorAll('[data-a^="diff:"]')].map((e) => e.dataset.a + (e.classList.contains('lock') ? ':lock' : '') + (e.classList.contains('on') ? ':on' : '')));
    // finished on Nightmare: the sixth is locked
    await pg.evaluate(() => { const h = window.__G.hero; h.act5 = 3; h.act4 = 4; h.diff = 4; window.__D.openPanel('waypoints'); });
    await pg.waitForTimeout(600);
    out.locked = { chips: await chips() };
    await pg.click('[data-a="diff:5"]').catch(() => {});
    await pg.waitForTimeout(500);
    out.locked.toast = await pg.evaluate(() => [...document.querySelectorAll('.toast')].map((e) => e.textContent).pop());
    out.locked.want = await pg.evaluate(async () => { const I = await import('/src/i18n/i18n.js'); return I.t('pick.locked5', I.t('diff.ash')); });
    out.locked.diff = await pg.evaluate(() => window.__G.hero.diff);
    await shot();
    // finished on Ash: open, chosen
    await pg.evaluate(() => { window.__D.closePanel(); const h = window.__G.hero; h.act5 = 4; h.seeds = Object.assign(h.seeds || {}, { 'coast@4': 777 }); window.__D.openPanel('waypoints'); });
    await pg.waitForTimeout(600);
    out.open = { chips: await chips() };
    await pg.evaluate(async () => { const W = await import('/src/game/world.js'); await W.zoneReady('coast'); window.__D.enterZone('coast', { at: 'waypoint' }); window.__coast4 = window.__G.zone; window.__D.enterZone('town', { at: 'waypoint' }); window.__D.openPanel('waypoints'); });
    await pg.waitForTimeout(600);
    await pg.click('[data-a="diff:5"]').catch(() => {});
    await pg.waitForTimeout(800);
    Object.assign(out.open, await pg.evaluate(() => ({ diff: window.__G.hero.diff, zones: Object.keys(window.__G.zones), disposed: !!window.__coast4?.disposed || !window.__G.zones.coast, chip: document.querySelector('[data-a="diff:5"]')?.style.color })));
    await shot();
    // an Act V zone on it
    await pg.evaluate(async () => { window.__D.closePanel(); const W = await import('/src/game/world.js'); await W.zoneReady('coast'); window.__D.enterZone('coast', { at: 'waypoint' }); });
    await pg.waitForTimeout(1500);
    out.zone = await pg.evaluate(async () => {
      const G = window.__G, h = G.hero, D = await import('/src/game/data.js'), A = window.__act5, T = A.tide.TIDE, H = D.HAZ5[h.diff];
      const c0 = A.cold.COLD.v; A.cold.coldAdd(10); const cold = +(A.cold.COLD.v - c0).toFixed(2); A.cold.resetCold();
      const m = A.spawnMonster('sunken', G.player.x + 4, G.player.z, {}); G.actors.push(m);
      const base = D.MONSTERS.sunken.hp;
      return { diff: h.diff, seeds: Object.keys(h.seeds).filter((k) => k.startsWith('coast@')), seed: G.zone.seed, seed4: h.seeds['coast@4'], haz: H, tideCycle: T && (T.cycle ?? T.len ?? null), cold, hpK: +(m.hpMax / base).toFixed(2), lvl: m.level };
    });
    await shot();
    const H = out.zone.haz || {};
    out.pass = out.locked.chips.length === 6 && out.locked.chips.includes('diff:5:lock') && out.locked.toast === out.locked.want && out.locked.diff === 4 && out.open.chips.includes('diff:5') && !out.open.chips.includes('diff:5:lock') && out.open.diff === 5 && out.open.disposed && out.zone.diff === 5 && out.zone.seeds.includes('coast@5') && out.zone.seed !== out.zone.seed4 && H.wash === 12 && H.plunge === 12 && H.frost === 8 && H.load === 0.9 && H.cold === 1.45 && H.bossCd === 0.8 && H.adds === 2 && Math.abs(out.zone.cold - 14.5) < 0.05;
    return out;
  } },
  // Act V from end to end in one session, as a Warden from an Act IV-end save in the shipped format (quest 23, no act5):
  // the hook, the coal, the Field and the Neck; the coast (the arrival, the hearth and the rite, its people, packs fought,
  // the three sea-lights and their memories, the Name-stones); the Walking Tower (the boss bot); the Freeze; the Farthest
  // Light (the ship, the three holes sealed, Tern); the Skotos (the boss bot: Selna remembered, the keepers and the two
  // fires, the relight); the naming and the answer; the lantern room and the carving; home, the child, the act's close and
  // the blessing. A screenshot at every beat. The fights are hers with the scenarios' help (sim=4; her packs fought with
  // her life kept full, the bosses by the bot with her life real and put back under 30%); LVL (30), CLS (warden)
  play5: { q: 'sim=4&q=' + (process.env.Q || '0') + '&norender', run: async (pg, shot) => {
    const beats = [], t0 = Date.now(), cls = process.env.CLS || 'warden', lvl = +(process.env.LVL || 30);
    const ev = (fn, a) => pg.evaluate(fn, a);
    const beat = async (name, ok, more = {}) => { const s = await ev(() => { const G = window.__G; return { q: G.hero.quest, zone: G.zone?.id, lvl: G.hero.level, hp: Math.round(G.player.hp / G.player.hpMax * 100), deaths: G.hero.stats.deaths, fatal: document.getElementById('fatal')?.textContent?.slice(0, 200) || undefined }; }); const b = { beat: name, ok: !!ok, min: +((Date.now() - t0) / 60000).toFixed(1), ...s, ...more }; beats.push(b); console.log('play5 ' + JSON.stringify(b)); await shot(); return b; };
    // (a scene's clock stands while its dialog is open: the dialogs are advanced while it is waited for)
    const at = (t) => A5.until(pg, (t) => !window.__G.cine || window.__G.cine.t >= t, 240000, t);
    const cineShot = async (t = 2.5) => { if (await A5.until(pg, () => !!window.__G.cine, 30000)) { await at(t); await shot(); } };
    const done = (fn, ms = 240000, arg) => A5.until(pg, fn, ms, arg);
    // her packs: beside each, her skills (her life kept full while she fights them)
    const fight = async (n, near) => {
      const r = await ev(([n, near]) => { const G = window.__G, z = G.zone, pl = G.player; const ps = z.packs.filter((p) => !p.cleared).map((p) => ({ p, d: Math.hypot(p.x - (near?.x ?? pl.x), p.z - (near?.z ?? pl.z)) })).sort((a, b) => a.d - b.d).slice(0, n).map((x) => z.packs.indexOf(x.p)); return ps; }, [n, near]);
      const kinds = {};
      for (const i of r) {
        await ev((i) => { const G = window.__G, p = G.zone.packs[i], f = G.zone.map.nearestFloor(p.x, p.z + 4, 4); G.player.x = f.x; G.player.z = f.z; window.__immortal = true; }, i);
        for (let k = 0; k < 14; k++) { await ev((k) => { const G = window.__G, pl = G.player, f = G.actors.filter((a) => a.team === 'foe' && !a.dead && !a.prop && !a.under && !a.hidden && Math.hypot(a.x - pl.x, a.z - pl.z) < 12).sort((a, b) => Math.hypot(a.x - pl.x, a.z - pl.z) - Math.hypot(b.x - pl.x, b.z - pl.z))[0]; pl.res = 100; window.__D.IN.events.push({ t: 'skill', i: [0, 0, 1, 2, 0, 3, 0, 4][k % 8], aim: f ? { x: f.x, z: f.z } : null }); }, k); await pg.waitForTimeout(260); if (k === 6 && i === r[0]) await shot(); }
        Object.assign(kinds, await ev((i) => { const o = {}; for (const a of window.__G.actors) if (a.packId != null && a.team === 'foe' && !a.prop) o[a.kind] = (o[a.kind] || 0) + (a.dead ? 1 : 0); return o; }, i));
      }
      await ev(() => { window.__immortal = false; });
      return { packs: r.length, kills: await ev(() => window.__G.hero.stats.kills), kinds };
    };
    const talk = async (key, until) => { const ok = await A5.use(pg, `z.p5?.${key}?.it`); await A4.dialogs(pg, 12, until); await ev(() => window.__D.closePanel()); return ok; };
    const bot = async (kind) => {
      await ev((o) => { window.SIMK = 4; window.__botP = (new Function('return ' + o.src)())({ kind: o.kind, maxT: 1500, build: false }).catch((e) => { window.__botErr = String(e.stack || e); }); }, { src: BOT5.toString(), kind });
      const seen = new Set();
      for (const w0 = Date.now(); Date.now() - w0 < 120 * 60000;) {
        await pg.waitForTimeout(2000);
        const s = await ev(() => { const z = window.__G.zone, b = z.boss, B = window.BOT; if (window.__botErr) return { err: window.__botErr }; return b && B && { t: +B.t.toFixed(0), end: !!B.end, phase: b.phase, hp: +(b.hp / b.hpMax).toFixed(2), dead: b.dead, done: B.done, v: Object.keys(b.vulns || {}).filter((k) => b.vulns[k] > 0).join(','), wrap: !!z.keepers, relit: !!z.relit, rem: b.remembers || 0 }; });
        if (!s) continue;
        if (s.err) { console.log('play5 bot error: ' + s.err.slice(0, 600)); break; }
        if (Date.now() - (seen.logT || 0) > 30000) { seen.logT = Date.now(); console.log('play5 ' + kind + ' ' + JSON.stringify(s)); }
        const key = 'p' + s.phase + (s.v ? ':' + s.v : '') + (s.wrap ? ':keepers' : '') + (s.relit ? ':relit' : '') + (s.rem ? ':r' + s.rem : '');
        if (!seen.has(key) && seen.size < 12) { seen.add(key); await shot(); }
        if (s.dead || s.done || s.end) break;
      }
      return ev(() => { const B = window.BOT; return B && { t: +B.t.toFixed(1), deaths: B.deaths, potions: B.potions, low: +B.low.toFixed(2), phases: B.phases }; });
    };
    await A5.tick(pg); await A4.listen(pg);
    // the shipped save: Act IV's end at quest 23, no act5
    await ev(([act4, cls, lvl]) => {
      const now = Date.now(), h = { id: 'hP' + now.toString(36), cls, level: lvl, xp: 0, gold: 2400, diff: 1, skills: {}, points: lvl - 1, inv: new Array(32).fill(null), equip: {}, stash: new Array(48).fill(null), quest: 23, flags: {}, wps: ['town', 'forest', 'crypt', 'pass', 'halls', 'weep', 'heart', 'ashfield', 'ashfield@2', 'forge'], act1: 1, act2: 1, act3: 1, act4: 1, gateBest: 2, boons: ['hearth', 'anvil', 'root', 'rest'], stats: { kills: 1400, deaths: 4, time: 36000, legs: 3, elites: 60 }, created: now, played: now, seeds: { forest: 11, crypt: 12, pass: 13, halls: 14, weep: 15, heart: 16, ashfield: 17, forge: 18 } };
      for (const k of act4) h.flags[k] = true;
      Object.assign(h.flags, { heat: 3, gifts: { throne: 'refused', forge: 'refused', unfading: 'refused' }, helpSeen: true });
      localStorage.setItem('skotos.save.v1', JSON.stringify({ heroes: [h], settings: { quality: 0, lang: 'el', helpSeen: true }, last: h.id }));
      // (and this page saves no more: its pagehide would write the hero it holds over the one just put there)
      const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'skotos.save.v1') return; return set.call(this, k, v); };
    }, [A5.ACT4, cls, lvl]);
    await A5.reload(pg, { write: false, immortal: false, q: 'sim=4&q=' + (process.env.Q || '0') + '&norender' });
    // (what she wears after Act IV: a rare of her level in every slot, her skills spent)
    await ev(async () => { const G = window.__G, h = G.hero, It = await import('/src/game/items.js'), D = await import('/src/game/data.js'); const W = { warden: 'sword', ranger: 'crossbow', mage: 'staff' }, OFF = { warden: 'shield', ranger: 'quiver', mage: 'orb' }, mk = (base) => It.makeItem(h.level, { rar: 2, base, cls: h.cls }); h.equip.weapon = mk(W[h.cls]); h.equip.offhand = mk(OFF[h.cls]); for (const s of ['helm', 'chest', 'gloves', 'boots', 'amulet']) h.equip[s] = mk(s); h.equip.ring1 = mk('ring'); h.equip.ring2 = mk('ring'); h.skills = {}; for (const sk of D.SKILLS[h.cls]) h.skills[sk.id] = 5; h.points = 0; window.__D.refreshStats(); G.player.hp = G.player.hpMax; });
    await beat('loaded', await ev(() => window.__G.hero.act5 === -1 && window.__G.zone.id === 'town'), { act5: await ev(() => window.__G.hero.act5) });
    // ---- q24: the stranger at the beacon ----
    await done(() => !!window.__G.zone.p5?.alkyone && !window.__G.zone.p5.alkyone.scene, 240000);
    await beat('q24 Alkyone at the beacon', await ev(() => window.__G.hero.quest === 24));
    await A5.use(pg, 'z.p5.alkyone.it');
    await A4.dialogs(pg, 10, () => !!window.__G.cine);
    await cineShot(5);
    await done(() => window.__G.hero.flags.cradle, 240000);
    await beat('Halda and the Cradle', true);
    await A5.use(pg, "z.interact.find((i) => i.kind === 'coal')");
    await done(() => window.__G.hero.quest >= 25, 120000);
    await beat('q25 the coal', await ev(() => window.__G.hero.flags.coal));
    // ---- the Field: Alkyone at the Last Lamp, the Neck ----
    await A5.travel(pg, 'ashfield', 'town');
    await done(() => !!window.__G.zone.p5?.alkyone, 30000);
    await talk('alkyone');
    await beat('the Field: Alkyone at the Last Lamp', await ev(() => !!window.__G.hero.flags.alkField));
    await A5.use(pg, "z.interact.find((i) => i.kind === 'exit' && i.to === 'coast')");
    await pg.waitForFunction(() => window.__G.zone?.id === 'coast' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 300000 });
    // ---- q25: the coast ----
    await cineShot(2.5);
    await done(() => window.__G.hero.flags.coastSeen && !window.__G.cine, 240000);
    await beat('the coast: the arrival', true);
    await A5.use(pg, 'z.act5.hearth');
    await done(() => window.__G.hero.flags.hearth, 30000);
    await pg.waitForTimeout(1500);
    await beat('the hearth', await ev(() => window.__G.hero.wps.includes('coast')));
    await cineShot(3);
    await done(() => window.__G.hero.flags.rite && !window.__G.cine && window.__G.hero.quest >= 26, 240000);
    await beat('q26 the rite', await ev(() => window.__G.hero.quest === 26));
    await done(() => !!window.__G.zone.p5?.glaukos && !!window.__G.zone.p5?.tamarisk, 20000);
    await talk('glaukos'); await talk('tamarisk');
    await beat('Glaukos and Tamarisk', await ev(() => window.__G.hero.flags.glaukosMet && window.__G.hero.flags.tamMet));
    // ---- q26: the sea-lights, the packs on the way, the Name-stones ----
    const lights = await ev(() => window.__G.zone.act5.lights.map((l) => l.id));
    for (const id of lights) {
      const near = await ev((id) => { const l = window.__G.zone.act5.lights.find((x) => x.id === id); return { x: l.x, z: l.z }; }, id);
      const f = await fight(2, near);
      await beat('packs by the ' + id + ' light', true, f);
      await A5.use(pg, `z.act5.lights.find((l) => l.id === '${id}')`);
      await cineShot(3);
      const n = await ev(() => (window.__G.hero.flags.lights5 || []).length);
      await done((n) => (window.__G.hero.flags.lights5 || []).length >= n && ['mem_i1', 'mem_i2', 'mem_i3'].filter((k) => window.__G.hero.flags[k]).length >= n && !window.__G.cine, 300000, n);
      await beat('the ' + id + ' light and its memory', await ev((id) => !!window.__G.hero.flags['light_' + id], id));
      if (id !== lights[lights.length - 1]) {
        const st = await ev(() => window.__G.zone.act5.stones.filter((s) => !s.lit).map((s) => s.id));
        for (const sid of st.slice(0, 2)) { await A5.use(pg, `z.act5.stones.find((s) => s.id === '${sid}')`); await pg.waitForTimeout(2500); }
        await beat('Name-stones', true, { names: await ev(() => (window.__G.hero.flags.names || []).length) });
      }
    }
    // (the Tower wakes after the third memory)
    await cineShot(3);
    await done(() => window.__G.hero.quest >= 27 && !window.__G.cine, 300000);
    await beat('q27 the Walking Tower wakes', await ev(() => window.__G.hero.flags.towerWake));
    // ---- q27: the Tower ----
    await ev(() => { const G = window.__G, b = G.zone.boss, f = G.zone.map.nearestFloor(b.x + 2, b.z + 11, 4); G.player.x = f.x; G.player.z = f.z; window.__act5.damage(G.player, b, 1, { crit: false }); });
    const tower = await bot('tower');
    await beat('the Tower down', await ev(() => !!window.__G.zone.boss?.dead), { tower });
    // ---- the Freeze, q28 ----
    await cineShot(6);
    await done(() => window.__G.hero.quest >= 28 && window.__G.zone?.mode === 'frozen' && !window.__G.cine, 300000);
    await beat('q28 the Freeze: the coast frozen', true);
    await A5.use(pg, "z.interact.find((i) => i.kind === 'exit' && i.to === 'farlight')");
    await pg.waitForFunction(() => window.__G.zone?.id === 'farlight' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 300000 });
    await cineShot(3);
    await done(() => window.__G.hero.flags.farSeen && !window.__G.cine, 120000);
    await beat('the Farthest Light: the arrival', true);
    await talk('alkyone', () => window.__G.hero.flags.alkShip);
    await beat('the Icebound Ship', await ev(() => window.__G.hero.flags.alkShip));
    // ---- the holes ----
    const holes = await ev(() => window.__G.zone.L.spots.holes.map((h) => h.id));
    for (const k of holes) {
      await fight(1, await ev((k) => window.__G.zone.L.spots.holes.find((h) => h.id === k).alk, k));
      await ev(() => { window.__immortal = true; });
      for (let i = 0; i < 3; i++) { await A5.use(pg, `z.act5.lamps.find((l) => l.hole === ${k} && l.i === ${i})`); await A5.until(pg, (a) => !!window.__G.zone.act5.lamps.find((l) => l.hole === a[0] && l.i === a[1])?.lit, 15000, [k, i]); }
      let shotDone = false;
      for (const w0 = Date.now(); Date.now() - w0 < 15 * 60000;) {
        const s = await ev((k) => { const G = window.__G, z = G.zone, S = z.seal, pl = G.player; if (!S) return { done: !!G.hero.flags['hole' + k] };
          for (const a of G.actors) if (a.team === 'foe' && !a.dead && !a.prop && !a.under && !a.hidden && Math.hypot(a.x - pl.x, a.z - pl.z) < 4) window.__D.IN.events.push({ t: 'skill', i: 0, aim: { x: a.x, z: a.z } });
          // (sim help: a singer is struck down where she stands, as a hero would run her down between two lamps)
          for (const a of G.actors) if (a.kind === 'iceSinger' && !a.dead && !a.under && a.state === 'song' && Math.hypot(a.x - pl.x, a.z - pl.z) < 16) window.__D.kill(a);
          if (S.tele && S.target) { const it = S.target, ho = S.ho, dl = Math.hypot(it.x - ho.x, it.z - ho.z) || 1; let f = null; for (const q of [0.7, 0.4, 1.1, 0.15, 1.6]) { const x = it.x + (ho.x - it.x) / dl * q, zz = it.z + (ho.z - it.z) / dl * q; if (z.map.walkable(x, zz)) { f = { x, z: zz }; break; } } f ||= z.map.nearestFloor(it.x, it.z, 1.5); pl.x = f.x; pl.z = f.z; return { breath: true }; }
          const dark = z.act5.lamps.find((l) => l.hole === k && !l.lit); if (dark && !pl.act) { const f = z.map.nearestFloor(dark.x, dark.z + 1.2, 2); pl.x = f.x; pl.z = f.z; dark.use(); }
          return { ring: S.ring }; }, k);
        if (s.done) break;
        if (s.breath && !shotDone) { shotDone = true; await pg.waitForTimeout(500); await shot(); }
        await pg.waitForTimeout(400);
      }
      await ev(() => { window.__immortal = false; });
      await done(() => !window.__G.cine, 60000);
      await beat('hole ' + k + ' sealed', await ev((k) => !!window.__G.hero.flags['hole' + k], k));
    }
    await done(() => window.__G.hero.quest >= 29, 60000);
    // ---- q29: Tern, the Skotos ----
    await ev(() => { const G = window.__G, B = G.zone.L.boss, f = G.zone.map.nearestFloor(B.x, B.z + 13, 4); G.player.x = f.x; G.player.z = f.z; });
    await cineShot(3);
    await done(() => window.__G.hero.flags.ternSeen && !window.__G.cine, 120000);
    await beat('q29 Tern on the road', await ev(() => window.__G.hero.quest === 29));
    await A5.use(pg, 'z.act5.farIt');
    await cineShot(5);
    await done(() => { const b = window.__G.zone.boss; return !!b && !b.holdWake && !b.hidden && !window.__G.cine; }, 240000);
    await beat('the Skotos rises', true);
    await ev(() => window.__act5.damage(window.__G.player, window.__G.zone.boss, 1, { crit: false }));
    const skotos = await bot('skotos');
    await beat('the Skotos struck down', await ev(() => !!window.__G.hero.flags.skotosDown), { skotos, cameo: await ev(() => (window.__G.zone.cameoNpcs || []).map((a) => a.avatar?.modelName)) });
    // ---- the naming, the card, the answer ----
    await cineShot(3);
    await done(() => (window.__says || []).includes('d.naming.you'), 240000); await shot();
    await done(() => window.__G.hero.flags.seaLit && !!window.__G.cine && window.__G.cine.t >= 7, 300000); await shot();
    await done(() => window.__G.hero.flags.seaLit && !window.__G.cine, 300000);
    await beat('the naming and the answer', await ev(() => window.__G.hero.flags.seaLit));
    await A5.use(pg, 'z.act5.farIt');
    await cineShot(1.5);
    await done(() => window.__G.hero.flags.mem_i4 && !window.__G.cine, 300000);
    await beat('the lantern room', true);
    await A5.use(pg, 'z.act5.doorIt');
    await cineShot(3);
    await done(() => window.__G.hero.quest >= 30 && !window.__G.cine, 240000);
    await beat('q30 the carving', await ev(() => window.__G.hero.flags.carved));
    // ---- home ----
    await A5.travel(pg, 'town', 'waypoint');
    await cineShot(3);
    await done(() => !window.__G.cine && !!window.__G.zone.p5?.child, 240000);
    await beat('home: the green over Whitecliff', true);
    await A5.use(pg, 'z.p5.child.it');
    await A4.dialogs(pg, 8, () => !!window.__G.cine);
    await cineShot(5);
    await done(() => !window.__G.cine && window.__G.panel === 'act', 240000);
    await beat('the act panel', await ev(() => (window.__G.hero.act5 ?? -1) >= 0));
    await pg.click('[data-a="close"]').catch(() => {});
    await done(() => !!document.querySelector('[data-a^="boon:"]'), 60000);
    await shot();
    await pg.click('[data-a="boon:name"]').catch(() => {});
    await pg.waitForTimeout(1500);
    const end = await ev(() => { const G = window.__G, h = G.hero; return { quest: h.quest, act5: h.act5, boons: h.boons.slice(), flags: ['seaLit', 'carved', 'toldChild', 'act5'].filter((f) => h.flags[f]), deaths: h.stats.deaths, lvl: h.level, minutes: Math.round(h.stats.time / 60) }; });
    await beat('the end: q31', end.quest === 31 && end.act5 >= 0, end);
    return { pass: beats.every((b) => b.ok) && end.quest === 31, failed: beats.filter((b) => !b.ok).map((b) => b.beat), end, tower, skotos, beats };
  } }
};
const sc = S[name];
// (a scenario run in a child process of its own, as the soaks: this runner's browser is never opened beside it)
if (sc.child) { let res; try { res = await sc.child(out); } catch (e) { res = { error: e.message }; } console.log(name, JSON.stringify(res)); process.exit(0); }
// (every page's #fatal text fails the run: tools/fatal.mjs)
const FATAL = [];
const browser = watchBrowser(await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }), FATAL);
// (TOUCH=1: a phone, touch and all, as the co-op ui scenario)
const page = await browser.newPage(process.env.TOUCH ? { viewport: { width: +W, height: +H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: +W, height: +H } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!t.includes('ERR_CERT')) logs.push(m.type() + ': ' + t); } });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
// the test hero never dies (levelling up resets the life pool, so keep topping it up; window.__tough also puts back the
// huge pool whenever the stats are recounted, as when Karthax takes the gifts back)
// (and with window.__immortal no single blow takes her under 1: her life cannot be set below it while it holds)
await page.addInitScript(() => { setInterval(() => { const G = window.__G; if (G?.player && !G.player.__hpTrap) { const p = G.player; let v = p.hp; Object.defineProperty(p, 'hp', { get() { return v; }, set(x) { v = window.__immortal && !(x >= 1) ? 1 : x; }, configurable: true, enumerable: true }); p.__hpTrap = true; } if (G?.player && window.__tough && G.player.hpMax < 99999) G.player.hpMax = 99999; if (G?.player && G.player.hpMax >= 99999) G.player.hp = G.player.hpMax; if (G?.player && window.__immortal) { G.player.hp = G.player.hpMax; G.player.dead = false; } }, 50); });
await page.goto((process.env.BASE || 'http://localhost:5199/') + '?' + sc.q);
page.setDefaultTimeout(120000);
// auto-start runs after __ready: wait for the hero too
await page.waitForFunction(() => window.__ready && (!location.search.includes('auto=') || window.__G?.player), null, { timeout: 180000 });
let n = 0;
// with &norender the game skips drawing; a screenshot asks for one drawn frame first
const shot = async (pg = page) => { await pg.evaluate(() => new Promise((ok) => { window.__shoot = true; requestAnimationFrame(() => requestAnimationFrame(() => { window.__shoot = false; ok(); })); })); await pg.screenshot({ path: `${out}/${name}-${n++}.png` }); };
shot.dir = out;
let res;
try { res = await sc.run(page, shot); } catch (e) { logs.push('scenario error: ' + e.message); }
await page.waitForTimeout(250).catch(() => {});
res = fatalFail(res, FATAL);
console.log(name, JSON.stringify(res));
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await browser.close();
