// Scenario runner: node tools/scenario.mjs <name> <outdir>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
import { watchFatal, fatalAll } from './fatal.mjs';
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
// Whitecliff, at its waypoint: the place a save keeps for Continue (hero.visit, game/wake.js) is taken off first, unless
// o.wake, so that these scenarios test what they were written for; scenario resume tests the wake); A5.until advances
// dialogs and waits scenes out until a condition holds
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
    if (!o.wake) await pg.evaluate(() => { for (const k of Object.keys(localStorage)) if (/^skotos\.save\.v1/.test(k)) { const d = JSON.parse(localStorage.getItem(k)); for (const h of d?.heroes || []) if (h) delete h.visit; localStorage.setItem(k, JSON.stringify(d)); } });
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
  // (the Tower: how far each cell lies from the thick ice it keeps to in its ice phase, in cells)
  let dThick = null;
  if (o.kind === 'tower' && Lz.thick) { const W = Lz.w, H = Lz.h, q = []; dThick = new Float32Array(W * H).fill(99); for (let i = 0; i < W * H; i++) if (Lz.thick[i]) { dThick[i] = 0; q.push(i); } for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, n = ny * W + nx; if (nx >= 0 && ny >= 0 && nx < W && ny < H && dThick[n] > dThick[i] + 1) { dThick[n] = dThick[i] + 1; q.push(n); } } } }
  const way = { x: 0, z: 0 };
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
      // the bait (the hint's own play: thin ice between them, she behind it). Where a Hammer Claw has webbed the thin ice
      // (stage 2), she stands 3 m beyond it so the next Shell Rush runs through it; else on unwebbed thin ice 8-14 m off,
      // as far from the thick as she can find (the Tower keeps to the thick in this phase, so it cannot close to its sweep),
      // past the Bell's 9.5 m if she can, and not far from where she stands; walked to by the map's own way, not a line.
      // (Baited 7-10 m from where the Tower stood and walked to in a line, she was caught on the land or the thick beside it,
      // dodging its sweeps, and a phase could end on its clock with no Overturn)
      // (the whole phase but its Overturn and a daze: while it turned or hauled itself back she went to strike it, and stayed)
      if (b.phase === 1 && b.st !== 'over' && !(b.dazed > 0)) {
        if ((B.webT = (B.webT || 0) - dt) <= 0) {
          B.webT = 0.25; B.webPt = null; let bd = 1e9;
          for (let r = 3; r <= 12; r++) for (let k = 0; k < 24; k++) {
            const g = k * 0.2618, x = b.x + Math.sin(g) * r, zz = b.z + Math.cos(g) * r;
            if (I.iceAt(x, zz) !== 'thin' || I.stageAt(x, zz) < 2) continue;
            for (const e of [3, 2.5, 3.5, 2, 4]) { const px = x + Math.sin(g) * e, pz = zz + Math.cos(g) * e, s2 = I.iceAt(px, pz); if (r + e < 7.5 || !z.map.walkable(px, pz) || s2 === 'water' || (s2 === 'thin' && I.stageAt(px, pz) >= 2)) continue; const sc = Math.hypot(px - pl.x, pz - pl.z) + Math.abs(r - 7); if (sc < bd) { bd = sc; B.webPt = { x: px, z: pz }; } break; }
          }
        }
        const dI = B.icePt && Math.hypot(B.icePt.x - b.x, B.icePt.z - b.z);
        if (!B.webPt && (!B.icePt || dI < 7.5 || dI > 16 || (B.icePtT -= dt) <= 0 || I.iceAt(B.icePt.x, B.icePt.z) !== 'thin')) {
          // (within 15 m, the Rush's reach; out to 20 m only if nothing nearer can be walked to: hauled back onto the thick far
          // from any thin ice, it comes over the thick toward her. Up to 6 cells from the thick: further, the thick cell
          // nearest her lay past the 14 m it looks, and it stood still. The old bait kept if nothing is found)
          B.icePtT = 12; let pick = null;
          for (let r = 8; r <= 20; r++) for (let k = 0; k < 24; k++) {
            const g = k * 0.2618, x = b.x + Math.sin(g) * r, zz = b.z + Math.cos(g) * r, i = Math.floor(zz) * Lz.w + Math.floor(x);
            if (I.iceAt(x, zz) !== 'thin' || I.stageAt(x, zz) >= 2 || !z.map.walkable(x, zz)) continue;
            const sc = Math.min(dThick ? dThick[i] : 0, 6) + (r >= 9.6 ? 2 : 0) - (r > 15 ? 20 : 0) - Math.hypot(x - pl.x, zz - pl.z) * 0.15;
            (B.cands ||= []).push([sc, x, zz]);
          }
          // (the best she can walk to: a patch of thin ice cut off by water or rock held her against its edge a whole phase)
          const cs = (B.cands || []).sort((p, q) => q[0] - p[0]); B.cands = null;
          for (let j = 0; j < Math.min(cs.length, 12) && !pick; j++) { const [, x, zz] = cs[j]; if (Math.hypot(x - pl.x, zz - pl.z) < 1.5 || z.map.stepToward({}, pl.x, pl.z, x, zz, way, 24)) pick = { x, z: zz }; }
          if (pick || (B.icePt && I.iceAt(B.icePt.x, B.icePt.z) !== 'thin')) B.icePt = pick;
        }
        if (B.webPt || B.icePt) { goal = B.webPt || B.icePt; goal.way = true; }
      }
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
    // (into a calm, or out of its ring if that is nearer: from the Tower's bait, 9 m off, the Bell's calm was 5 m away)
    if (u) { const c = u.r > 0 && calmIn(u.c, u.r > 14), du = Math.hypot(u.x, u.z), cc = c && Math.hypot(pl.x - c.x, pl.z - c.z) - c.r + 0.3, ok = (k) => z.map.walkable(pl.x + (u.x / (du || 1)) * k, pl.z + (u.z / (du || 1)) * k), out = u.r + 0.6 - du; if (c && !(u.r > 0 && out < cc && u.r <= 14 && ok(out * 0.5) && ok(out + 0.4))) goal = { x: c.x, z: c.z }; else { const l = Math.hypot(u.x, u.z) || 1; goal = { x: pl.x + (u.x / l) * 4, z: pl.z + (u.z / l) * 4 }; } }
    // (the Tower's ice phase, a line a second for the report when no Overturn came: time, its state, how far apart, the ice
    // under her and its stage, her bait (web, bait or none) and how far, a telegraph on her, its Rushes so far)
    if (o.kind === 'tower' && b.phase === 1 && (B.logT = (B.logT || 0) - dt) <= 0) { B.logT = 1; const f = (v) => +v.toFixed(1); (B.log ||= []).push([f(B.t), b.st, f(Math.hypot(b.x - pl.x, b.z - pl.z)), I.iceAt(pl.x, pl.z), I.stageAt(pl.x, pl.z), B.webPt ? 'web' : B.icePt ? 'bait' : '-', goal ? f(Math.hypot(goal.x - pl.x, goal.z - pl.z)) : null, !!u, b.rushes || 0, f(pl.x), f(pl.z), f(b.x), f(b.z)]); }
    // (the Tower's Bell: how far she stood from it the frame it rang; looked at from Node, she had walked on)
    if (o.kind === 'tower' && b) { const n = window.__act5.AI_LOG['tower:bellRung'] || 0; if (n > (B.bellN ??= n)) { const d = Math.hypot(b.x - pl.x, b.z - pl.z); (B.bellD ||= []).push(+d.toFixed(1)); if (d > 4.5 && d < 9 + pl.radius * 0.5) B.bellHit = (B.bellHit || 0) + 1; } B.bellN = n; }
    // (every goal but a dodge walked to by the map's own way, the Tower's: in a line, she stood 22 m off it across the water
    // a whole phase; a dodge straight)
    const wv = goal && !u && (goal.way || o.kind === 'tower') && Math.hypot(goal.x - pl.x, goal.z - pl.z) > 1.5 && z.map.stepToward(B.wayP ||= {}, pl.x, pl.z, goal.x, goal.z, way, 24);
    if (wv) keys(wv.x, wv.z); else if (goal) keys(goal.x - pl.x, goal.z - pl.z); else keys(0, 0);
    B.near = Math.min(B.near ?? 99, tgt === b && b ? Math.hypot(b.x - pl.x, b.z - pl.z) - b.radius : 99);
    // (no blow struck from inside the Tower's telegraphs: its swing held her where she stood, and the Bell caught her a step
    // short of its calm)
    if ((skT -= dt) <= 0 && tgt && !pl.pull && !(pl.act && pl.act.name === 'touch') && !(u && o.kind === 'tower')) {
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
  // the three great Tears told from the small ones, in the owner's wood (seed 780698361, difficulty 2): bigger and brighter
  // with a ring and a halo at their foot, their own prompt; a small Tear says it is no verse of the Long Sorrow while the
  // three are still to find (its blessing the same), never once they are known, nor the nursery's. Shots for the eye
  tears: { q: 'auto=weep&seed=780698361&diff=2&sim=6&q=1&norender&lvl=29&cls=mage', run: async (pg, shot) => {
    const r = {}, ok = {};
    await A5.tick(pg);
    await pg.evaluate(async () => {
      const G = window.__G, z = G.zone, B = await import('/src/ui/bus.js');
      window.__immortal = true; G.hero.quest = 12; G.hero.flags.metElati = true; G.player.hp = G.player.hpMax = 99999;
      for (const p of z.packs) p.spawned = true; z.bossSpawned = true;
      window.__toasts = []; B.on('toast', (m) => window.__toasts.push(m));
    });
    const look = () => pg.evaluate(() => window.__G.zone.interact.filter((i) => i.kind === 'tear').map((it) => { const u = it.mesh.userData; return { id: it.id, story: it.story, used: !!it.used, prompt: it.prompt, sy: +u.drop.scale.y.toFixed(3), glow: +u.drop.material.userData.u.uGlow.value.toFixed(3), cue: u.cue.length, cueOn: u.cue.filter((c) => c.visible).length }; }));
    r.look = await look();
    ok.look = ['planting', 'sorrow', 'breaking'].every((id) => r.look.some((l) => l.id === id && l.story)) && r.look.some((l) => l.id === 'm1') && r.look.some((l) => l.id === 'm2')
      && r.look.every((l) => (l.story ? l.prompt === 'tear.touchGreat' && l.sy === 1.3 && l.glow === 1.65 && l.cue === 2 && l.cueOn === 2 : l.prompt === 'tear.touch' && l.sy === 0.85 && l.glow === 1 && l.cue === 0));
    r.text = await pg.evaluate(async () => { const I = await import('/src/i18n/i18n.js'), el = [I.t('tear.touchGreat'), I.t('tear.small', 0)]; I.setLang('en'); const en = [I.t('tear.touchGreat'), I.t('tear.small', 0)]; I.setLang('el'); return { el, en }; });
    ok.text = r.text.el[0] === 'Άγγιξε το Μεγάλο Δάκρυ' && r.text.el[1] === 'Μικρό Δάκρυ, όχι στίχος του Μακρού Θρήνου (0/3)' && r.text.en[0] === 'Touch the Great Tear' && r.text.en[1] === 'A small Tear, not a verse of the Long Sorrow (0/3)';
    // (in front of it, away from its tree)
    const beside = (id) => pg.evaluate((id) => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'tear' && i.id === id), a = it.spot?.r || 0, f = z.map.nearestFloor(it.x - Math.sin(a) * 1.7, it.z - Math.cos(a) * 1.7); G.player.x = f.x; G.player.z = f.z; G.player.act = null; G.player.kx = G.player.kz = 0; return +Math.hypot(f.x - it.x, f.z - it.z).toFixed(2); }, id);
    r.hud = {};
    for (const id of ['planting', 'm2']) { r.hud[id + 'D'] = await beside(id); await pg.waitForTimeout(400); await shot(); r.hud[id] = await pg.evaluate(() => document.querySelector('#b-use span')?.textContent); }
    const T = await pg.evaluate(async () => { const I = await import('/src/i18n/i18n.js'); return { great: I.t('tear.touchGreat'), touch: I.t('tear.touch'), buff: I.t('tear.buff'), small: [0, 1, 2, 3].map((n) => I.t('tear.small', n)), tear: [1, 2, 3].map((n) => I.t('q.tear', n)) }; });
    ok.hud = r.hud.planting === T.great && r.hud.m2 === T.touch;
    // (and 2.5 s of game time after its memory, whatever the frame rate: the small Tear's word comes 1.2 s after it)
    const touch = async (id) => {
      await pg.evaluate(() => { window.__toasts = []; });
      await beside(id);
      await pg.evaluate((id) => window.__G.zone.interact.find((i) => i.kind === 'tear' && i.id === id).use(), id);
      const done = await A5.until(pg, (id) => !!window.__G.hero.flags['tear_' + id] && window.__G.mode === 'play', 90000, id);
      const t0 = await pg.evaluate(() => window.__G.hero.stats.time);
      await pg.waitForFunction((t0) => window.__G.hero.stats.time > t0 + 2.5, t0, { timeout: 60000 }).catch(() => {});
      return pg.evaluate(([id, done]) => { const G = window.__G, it = G.zone.interact.find((i) => i.kind === 'tear' && i.id === id), u = it.mesh.userData; return { done, toasts: window.__toasts.slice(), memory: Math.round(G.player.buffs.memory || 0), quest: G.hero.quest, glow: +u.drop.material.userData.u.uGlow.value.toFixed(2), cueOn: u.cue.filter((c) => c.visible).length }; }, [id, done]);
    };
    const small = (o) => o.toasts.filter((m) => T.small.includes(m));
    r.m1 = await touch('m1');
    ok.m1 = r.m1.done && r.m1.toasts.includes(T.buff) && r.m1.toasts.includes(T.small[0]) && r.m1.memory > 0 && r.m1.quest === 12 && r.m1.glow === 0.42;
    r.planting = await touch('planting');
    ok.planting = r.planting.done && r.planting.toasts.includes(T.tear[0]) && !small(r.planting).length && r.planting.cueOn === 0 && r.planting.glow === 0.42;
    r.sorrow = await touch('sorrow');
    r.breaking = await touch('breaking');
    r.breaking.q13 = await A5.until(pg, () => window.__G.hero.quest === 13, 10000);
    ok.verses = r.sorrow.done && r.breaking.done && !small(r.sorrow).length && !small(r.breaking).length && r.breaking.toasts.includes(T.tear[2]) && r.breaking.q13;
    r.m2 = await touch('m2');
    ok.m2 = r.m2.done && r.m2.toasts.includes(T.buff) && !small(r.m2).length;
    // the nursery (the Heartwood): never told a small Tear, even with a verse still to find (one taken back for the check)
    r.nursery = await pg.evaluate(async () => {
      const G = window.__G, W = await import('/src/game/world.js'); G.hero.quest = 14; G.hero.flags.hart = true; delete G.hero.flags.tear_planting;
      await W.zoneReady('heart'); window.__D.enterZone('heart', { fresh: true }); for (const p of G.zone.packs) p.spawned = true; G.zone.bossSpawned = true;
      const it = G.zone.interact.find((i) => i.kind === 'tear' && i.id === 'nursery');
      return it ? { prompt: it.prompt, cue: it.mesh.userData.cue.length, sy: +it.mesh.userData.drop.scale.y.toFixed(3) } : null;
    });
    if (r.nursery) Object.assign(r.nursery, await touch('nursery'));
    await pg.evaluate(() => { window.__G.hero.flags.tear_planting = true; });
    ok.nursery = !!r.nursery && r.nursery.done && r.nursery.prompt === 'tear.touch' && r.nursery.cue === 0 && !small(r.nursery).length && r.nursery.toasts.includes(T.buff);
    return { pass: Object.values(ok).every(Boolean), ok, r };
  } },
  // Continue where the last save left her (game/wake.js). PARTS=owner,verse,fall,lock,death,forest,crypt,pass,act4,act5
  // (default all). OWNER=<file>: the hero to play the owner's part with, read at run time and never copied; else one built
  // like it (a mage of 29 on difficulty 2, quest 12, two verses and both small Tears read, the owner's wood). Each part
  // plants its hero in a page that writes no more, and goes through the title and Continue as a player does
  resume: { q: 'q=0&sim=4&norender', run: async (pg, shot) => {
    const PARTS = (process.env.PARTS || 'owner,verse,fall,lock,death,forest,crypt,pass,act4,act5,tower,act6').split(',');
    const fs = await import('node:fs');
    const R = {}, OK = {}, base = A5.base, ev = (fn, arg) => pg.evaluate(fn, arg), wait = (ms) => pg.waitForTimeout(ms);
    const SEED = 780698361, KEYS = ['id', 'seed', 'diff', 'x', 'z', 'retry', 'stamp', 'layout', 'boss', 'packs', 'chests', 'shrines', 'tears', 'echoes', 'voices', 'greeted', 'seen'];
    const ownerLike = (o = {}) => {
      const now = Date.now(), flags = {};
      for (const k of ['metSmith', 'weaver', 'metHealer', 'lord', 'act1', 'stonewarden', 'king', 'act2', 'metElati', 'metLinden', 'tear_sorrow', 'tear_breaking', 'tear_m1', 'tear_m2', ...(o.flags || [])]) if (!(o.drop || []).includes(k)) flags[k] = true;
      return { id: o.id || 'hOwnr', cls: 'mage', level: 29, xp: 1200.5, gold: 24149, diff: 2, skills: {}, points: 28, inv: new Array(32).fill(null), equip: {}, stash: new Array(48).fill(null), quest: o.quest ?? 12, flags, wps: ['town', 'forest', 'crypt', 'pass', 'halls', 'weep'], act1: 1, act2: 1, act3: -1, act4: -1, act5: -1, gateBest: 0, boons: ['hearth', 'anvil'], stats: { kills: 591, deaths: 0, time: 2400, legs: 0, elites: 0 }, created: now, played: now, seeds: { weep: SEED } };
    };
    // (the stored record of the hero last played, as stored)
    const stored = () => ev(() => { const d = JSON.parse(localStorage.getItem('skotos.save.v1') || 'null'); return d?.heroes?.find((h) => h && h.id === d.last) || null; });
    const hide = (freeze) => ev((fr) => { window.dispatchEvent(new Event('pagehide')); if (fr) window.__G.save = null; }, !!freeze);
    // (this page writes no more, the store is emptied, and the hero is put in it alone)
    const plant = (h) => ev((h) => { window.__G.save = null; for (const k of Object.keys(localStorage)) if (k.startsWith('skotos.')) localStorage.removeItem(k); if (h) localStorage.setItem('skotos.save.v1', JSON.stringify({ heroes: [h], settings: { quality: 0, helpSeen: true }, last: h.id })); }, h);
    const listen = () => ev(async () => { if (window.__lis) return; window.__lis = true; const B = await import('/src/ui/bus.js'); window.__toasts = []; window.__says = []; B.on('toast', (m) => window.__toasts.push(m)); B.on('say', (k) => window.__says.push(k)); });
    const ready = async () => { await pg.waitForFunction(() => window.__ready && window.__G?.save, null, { timeout: 240000 }); await listen(); };
    const load = async (q = 'q=0&sim=4&norender') => { await pg.goto(base + '?' + q); await ready(); };
    // the title's menu (the tap screen first): what Continue says, and the place it names
    const menu = async () => {
      await pg.click('#screen'); await pg.waitForSelector('#m-cont', { timeout: 60000 }); await wait(600);
      return ev(() => ({ text: document.getElementById('m-cont').textContent, at: document.querySelector('#m-cont .m-at')?.textContent || null }));
    };
    const where = () => ev(() => { const G = window.__G, z = G.zone, pl = G.player, w = z.L.spots.waypoint, B = z.L.boss, f = (v) => +v.toFixed(2); return { zone: z.id, x: f(pl.x), z: f(pl.z), dWp: w ? f(Math.hypot(pl.x - w.x, pl.z - w.z - 2)) : null, dBoss: B ? f(Math.hypot(pl.x - B.x, pl.z - B.z)) : null, quest: G.hero.quest, dead: !!pl.dead, full: pl.hp >= pl.hpMax, floor: z.map.walkable(pl.x, pl.z), reachStart: z.map.reaches(pl.x, pl.z, [z.L.start]) }; });
    const cont = async () => {
      await pg.click('#m-cont');
      await pg.waitForFunction(() => window.__G?.zone && window.__G.mode === 'play' && window.__G.player && !document.getElementById('fade').classList.contains('on'), null, { timeout: 300000 });
      const w = await where();
      await A5.tick(pg); await ev(() => { window.__immortal = true; });
      return w;
    };
    const gameWait = async (s) => { const t0 = await ev(() => window.__G.hero.stats.time); await pg.waitForFunction(([t0, s]) => window.__G.hero.stats.time > t0 + s, [t0, s], { timeout: 180000 }).catch(() => {}); };
    // (every live foe within r of her struck down, until none is left)
    const calm = async (r = 35) => { for (let i = 0; i < 20; i++) { const n = await ev((r) => { const G = window.__G, pl = G.player; let n = 0; for (const a of G.zone.actors) if (a.team === 'foe' && !a.prop && !a.dead && !a.boss && Math.hypot(a.x - pl.x, a.z - pl.z) < r) { n++; a.hidden = false; a.under = false; a.buried = false; a.dormant = false; a.invuln = 0; window.__D.kill(a); } return n; }, r); if (!n) return true; await wait(300); } return false; };
    const put = (x, z) => ev(([x, z]) => { const G = window.__G, f = G.zone.map.nearestFloor(x, z); G.player.x = f.x; G.player.z = f.z; G.player.act = null; G.player.kx = G.player.kz = 0; return f; }, [x, z]);
    const tearIt = (id) => `z.interact.find((i) => i.kind === 'tear' && i.id === '${id}')`;
    const spentT = (id) => A5.until(pg, (id) => { const it = window.__G.zone.interact.find((i) => i.kind === 'tear' && i.id === id); return !!it?.spent && window.__G.mode === 'play'; }, 120000, id);
    const clearPack = async (id) => {
      const p = await ev((id) => { const p = window.__G.zone.packs.find((q) => q.id === id); return { x: p.x, z: p.z }; }, id);
      await put(p.x, p.z + 4);
      await pg.waitForFunction((id) => window.__G.zone.packs.find((q) => q.id === id)?.spawned, id, { timeout: 60000 });
      for (let i = 0; i < 30; i++) {
        const n = await ev((id) => { let n = 0; for (const a of window.__G.zone.actors) if (a.packId === id && !a.dead) { n++; a.hidden = false; a.under = false; a.buried = false; a.dormant = false; a.invuln = 0; window.__D.kill(a); } return n; }, id);
        if (!n) return true;
        await wait(300);
      }
      return false;
    };
    const chest = async (ci, take) => {
      await ev((ci) => window.__G.zone.interact.find((i) => i.kind === 'chest' && i.ci === ci).use(), ci);
      await pg.waitForFunction((ci) => window.__G.zone.interact.find((i) => i.kind === 'chest' && i.ci === ci).due === 0, ci, { timeout: 60000 });
      await gameWait(1);
      if (take) await ev(async () => (await import('/src/game/pickups.js')).gatherPickups());
    };
    const die = async (panel = true) => {
      await ev(() => { const G = window.__G; window.__immortal = false; G.player.hp = 0; window.__D.emit('heroDeath'); });
      if (panel) await pg.waitForFunction(() => window.__G.panel === 'dead', null, { timeout: 60000 });
    };
    // an owner-like hero planted, taken up (Whitecliff), and walked into her wood by its road
    const fresh = async (o) => {
      await plant(ownerLike(o)); await load(); await menu(); await cont();
      await A5.travel(pg, 'weep', 'town'); await calm();
    };
    const quit = async (before) => { const nav = pg.waitForNavigation({ timeout: 240000 }); const out = await ev(before || (() => null)); await ev(() => setTimeout(() => window.__D.emit('quit'), 0)); await nav; await ready(); return out; };
    const P = {};

    // ---- the owner's own case ----
    P.owner = async (r, k) => {
      const hero = process.env.OWNER ? JSON.parse(fs.readFileSync(process.env.OWNER, 'utf8')) : ownerLike();
      r.who = process.env.OWNER ? 'file' : 'built';
      await plant(hero); await load();
      // 1. an old hero (no visit): Whitecliff at its waypoint, as ever
      r.m1 = await menu(); r.c1 = await cont(); r.v1 = (await stored()).visit ?? null;
      k.old = !r.m1.at && r.c1.zone === 'town' && r.c1.dWp <= 3 && r.v1 === null;
      // 2. into the wood
      await A5.travel(pg, 'weep', 'town');
      const v2 = (await stored()).visit; r.v2 = v2 && { id: v2.id, seed: v2.seed, diff: v2.diff };
      k.inWood = !!v2 && v2.id === 'weep' && v2.seed === SEED && v2.diff === 2;
      // 3. progress: the two packs nearest the start, chest A looted, chest B's loot left lying, shrine 0, m2 seen through
      const packIds = await ev(() => { const z = window.__G.zone, s = z.L.start; return z.packs.map((p) => ({ id: p.id, d: Math.hypot(p.x - s.x, p.z - s.z) })).sort((a, b) => a.d - b.d).slice(0, 2).map((p) => p.id); });
      r.packs = packIds; r.cleared = [];
      for (const id of packIds) r.cleared.push(await clearPack(id));
      await chest(0, true); await chest(1, false);
      await ev(() => window.__G.zone.interact.find((i) => i.kind === 'shrine' && i.si === 0).use());
      await A5.use(pg, tearIt('m2')); r.m2 = await spentT('m2');
      // a memory cut off: m1 touched, the page hidden with its dialog open
      await A5.use(pg, tearIt('m1'));
      await pg.waitForFunction(() => !!document.querySelector('#dialog:not([hidden])'), null, { timeout: 60000 });
      await hide(); r.cut = (await stored()).visit?.tears ?? null;
      k.cut = JSON.stringify(r.cut) === '["m2"]';
      r.m1 = await spentT('m1');
      // 4. Save and quit, by the planting Tear
      r.kept = await quit(() => {
        const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'tear' && i.id === 'planting'), S = z.map.nearestFloor(it.x, it.z + 4);
        G.player.x = S.x; G.player.z = S.z; G.player.act = null; G.player.kx = G.player.kz = 0;
        const ex = []; z.map.explored.forEach((v, i) => { if (v) ex.push(i); });
        // (the voices as the last write saw them, the page's own on pagehide just before this: the frames before the reload
        // may let the clearing's voice by the Tear speak)
        window.addEventListener('pagehide', () => sessionStorage.setItem('__kept', JSON.stringify({ voices: (z.voices || []).map((v, i) => (v.done ? i : -1)).filter((i) => i >= 0), greeted: !!z.greeted })));
        return { S, ex };
      });
      Object.assign(r.kept, await ev(() => { const k = JSON.parse(sessionStorage.getItem('__kept') || '{}'); sessionStorage.removeItem('__kept'); return k; }));
      const S = r.kept.S, v4 = (await stored()).visit, idx = packIds.map((id) => +id.slice(4));
      r.v4 = { keys: Object.keys(v4 || {}), x: v4?.x, z: v4?.z, packs: v4?.packs, chests: v4?.chests, shrines: v4?.shrines, tears: v4?.tears, voices: v4?.voices, greeted: v4?.greeted, retry: v4?.retry, boss: v4?.boss, len: JSON.stringify(v4 || {}).length, seen: v4?.seen?.length, keptVoices: r.kept.voices, explored: r.kept.ex.length };
      r.v4.fits = await ev(async () => { const S = await import('/src/game/save.js'), d = JSON.parse(localStorage.getItem('skotos.save.v1')); return S.heroFits(d.heroes.find((h) => h.id === d.last)); });
      const strs = []; JSON.stringify(v4 || {}, (key, val) => { if (key) strs.push(key); if (typeof val === 'string') strs.push(val); return val; });
      r.v4.unsafe = strs.some((s) => /[<>"'`&\\]/.test(s));
      const keyIdx = r.v4.keys.map((x) => KEYS.indexOf(x));
      k.saved = !!v4 && keyIdx.every((i, j) => i >= 0 && (j === 0 || i > keyIdx[j - 1])) && v4.x * 2 === Math.round(v4.x * 2) && v4.z * 2 === Math.round(v4.z * 2) && Math.abs(v4.x - S.x) <= 0.5 && Math.abs(v4.z - S.z) <= 0.5
        && idx.every((i) => (v4.packs || []).includes(i)) && JSON.stringify(v4.chests) === '[0,1]' && JSON.stringify(v4.shrines) === '[0]' && JSON.stringify(v4.tears) === '["m1","m2"]'
        && JSON.stringify(v4.voices || []) === JSON.stringify(r.kept.voices) && v4.greeted === (r.kept.greeted ? 1 : undefined) && v4.retry === undefined && v4.boss === undefined
        && r.v4.len < 2048 && !r.v4.unsafe && r.v4.fits === null;
      // 5. the title names her wood; 6. Continue wakes her there, the visit laid on it
      r.m5 = await menu(); r.zoneName = await ev(() => window.__D.t('zone.weep'));
      k.title = (r.m5.at || '') === r.zoneName && r.m5.text.includes(r.zoneName);
      r.c6 = await cont();
      await gameWait(4);
      r.s6 = await ev(([kept, packIds]) => {
        const G = window.__G, z = G.zone, chest = (ci) => z.interact.find((i) => i.kind === 'chest' && i.ci === ci), open = (it) => !!it && !!it.used && (it.mesh?.userData.lid ? Math.abs(it.mesh.userData.lid.rotation.x + 1.9) < 1e-6 : Math.abs(it.mesh.rotation.x + 0.15) < 1e-6);
        const B = chest(1), tear = (id) => z.interact.find((i) => i.kind === 'tear' && i.id === id);
        return { packs: packIds.map((id) => ({ id, spawned: !!z.packs.find((p) => p.id === id)?.spawned, actors: z.actors.filter((a) => a.packId === id).length })),
          chests: [open(chest(0)), open(B)], lootAtB: G.pickups.filter((p) => p.kind === 'item' && Math.hypot(p.x - B.x, p.z - B.z) < 3).length,
          shrine0: !!z.interact.find((i) => i.kind === 'shrine' && i.si === 0)?.used,
          tears: ['m1', 'm2'].map((id) => ({ id, used: !!tear(id)?.used, glow: +tear(id)?.mesh.userData.drop.material.userData.u.uGlow.value.toFixed(2) })),
          explored: kept.ex.every((i) => z.map.explored[i]), voices: kept.voices.every((i) => z.voices[i]?.done), greeted: !!z.greeted,
          greet: (window.__says || []).filter((s) => /^d\.lady\.w1/.test(s)).length, quest: G.hero.quest, planting: !!G.hero.flags.tear_planting };
      }, [r.kept, packIds]);
      r.c6.d = +Math.hypot(r.c6.x - S.x, r.c6.z - S.z).toFixed(2);
      k.woke = r.c6.zone === 'weep' && r.c6.d <= 0.75 && r.s6.packs.every((p) => p.spawned && !p.actors) && r.s6.chests.every(Boolean) && !r.s6.lootAtB && r.s6.shrine0
        && r.s6.tears.every((t) => t.used && t.glow === 0.42) && r.s6.explored && r.s6.voices && r.s6.greeted && !r.s6.greet && r.s6.quest === 12 && !r.s6.planting;
      // 7. standing still writes the same visit; a walk moves only where she is, which is no work
      const spot = await ev((ids) => { const z = window.__G.zone, open = z.packs.filter((p) => !ids.includes(p.id)); for (const id of ids) { const p = z.packs.find((q) => q.id === id); if (!open.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 40)) return { x: p.x, z: p.z }; } const p = z.packs.find((q) => q.id === ids[0]); return { x: p.x, z: p.z }; }, packIds);
      await put(spot.x, spot.z); await calm(); await wait(500); await calm();
      const snap = () => ev(async () => { const C = await import('/src/game/cloudsync.js'), d = JSON.parse(localStorage.getItem('skotos.save.v1')), h = d.heroes.find((x) => x.id === d.last), h0 = JSON.parse(JSON.stringify(h)); h0.stats.time = 0; return { visit: JSON.stringify(h.visit), sum: C.heroSum(h), sum0: C.heroSum(h0), work: C.workSum(h) }; });
      await hide(); const a = await snap(); await wait(1000); await hide(); const b = await snap();
      await ev(() => { const G = window.__G, z = G.zone; for (const [dx, dz] of [[6, 0], [-6, 0], [0, 6], [0, -6]]) { const x = G.player.x + dx, zz = G.player.z + dz; if (z.map.walkable(x, zz) && z.map.clear(G.player.x, G.player.z, x, zz)) { G.player.x = x; G.player.z = zz; return; } } });
      await hide(); const c = await snap();
      r.idle = { same: a.visit === b.visit, work: a.work === b.work, sumNoClock: a.sum0 === b.sum0, sumRaw: a.sum === b.sum, walkVisit: c.visit !== b.visit, walkSum: c.sum0 !== b.sum0, walkWork: c.work === b.work };
      k.idle = r.idle.same && r.idle.work && r.idle.sumNoClock && r.idle.walkVisit && r.idle.walkSum && r.idle.walkWork;
      // 8. the planting Tear: the third verse, and the Glade wakes
      await ev(() => { window.__toasts = []; });
      await A5.use(pg, tearIt('planting'));
      await A5.until(pg, () => window.__G.hero.flags.tear_planting && window.__G.mode === 'play', 120000);
      const t8 = await ev(() => window.__G.hero.stats.time);
      await pg.waitForFunction((t0) => window.__G.hero.quest === 13 || window.__G.hero.stats.time > t0 + 10, t8, { timeout: 180000 }).catch(() => {});
      r.p8 = await ev(() => ({ quest: window.__G.hero.quest, toasts: window.__toasts.slice(), three: window.__D.t('q.tear', 3) }));
      k.planting = r.p8.quest === 13 && r.p8.toasts.includes(r.p8.three);
      // 9. a boss fight: a save beside the Hart wakes her at the retry spot; one broken off is left to its spot
      const B = await ev(() => window.__G.zone.L.boss);
      await put(B.x, B.z + 9);
      await pg.waitForFunction(() => window.__G.zone.boss && window.__G.bossActor, null, { timeout: 120000 });
      await hide(); r.b9 = { near: (await stored()).visit?.retry ?? null };
      r.b9.off = await ev(() => { const G = window.__G, w = G.zone.L.spots.waypoint, f = G.zone.map.nearestFloor(w.x, w.z + 2); G.player.x = f.x; G.player.z = f.z; window.dispatchEvent(new Event('pagehide')); const d = JSON.parse(localStorage.getItem('skotos.save.v1')); return d.heroes.find((h) => h.id === d.last).visit?.retry ?? null; });
      r.b9.back = await ev(() => { const G = window.__G, b = G.zone.boss, f = G.zone.map.nearestFloor(b.x, b.z + 6); G.player.x = f.x; G.player.z = f.z; window.dispatchEvent(new Event('pagehide')); G.save = null; const d = JSON.parse(localStorage.getItem('skotos.save.v1')); return d.heroes.find((h) => h.id === d.last).visit?.retry ?? null; });
      await load(); await menu(); r.c9 = await cont();
      k.bossFight = r.b9.near === 1 && r.b9.off === null && r.b9.back === 1 && r.c9.zone === 'weep' && r.c9.dWp <= 3 && r.c9.dBoss >= 40 && r.c9.quest === 13;
      // 10. the Hart killed: the gate open, and a wake at her spot finds the white tree and the echo
      await put(B.x, B.z + 9);
      await pg.waitForFunction(() => window.__G.zone.boss, null, { timeout: 120000 });
      await A5.hit(pg, null);
      await gameWait(7); await A5.until(pg, () => window.__G.mode === 'play' && !window.__G.cine, 60000);
      r.h10 = await ev(() => { const G = window.__G, z = G.zone, s = z.L.spots.rootGate; return { hart: !!G.hero.flags.hart, hartAt: !!G.hero.flags.hartAt, quest: G.hero.quest, open: s.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)), gate: z.act3.gate.userData.progress }; });
      await hide(true); const v10 = (await stored()).visit;
      await load(); await menu(); r.c10 = await cont();
      r.c10.d = +Math.hypot(r.c10.x - v10.x, r.c10.z - v10.z).toFixed(2); r.c10.retry = v10.retry ?? null;
      r.c10.after = await ev(() => { const G = window.__G, z = G.zone, s = z.L.spots.rootGate; return { open: s.cells.every(([x, zz]) => z.map.walkable(x + 0.5, zz + 0.5)), whiteTree: !!z.act3.whiteTree, echo: !!z.interact.find((i) => i.kind === 'echo' && i.boss === 'silverhorn') }; });
      k.hart = r.h10.hart && r.h10.hartAt && r.h10.quest === 14 && r.h10.open && r.c10.zone === 'weep' && r.c10.d <= 0.75 && r.c10.retry === null && r.c10.after.open && r.c10.after.whiteTree && r.c10.after.echo && r.c10.quest === 14;
      // 11. the echo: kept only once fought to its end
      await A5.use(pg, "z.interact.find((i) => i.kind === 'echo')");
      await hide(); r.e11 = { touched: (await stored()).visit?.echoes ?? null };
      await pg.waitForFunction(() => window.__G.zone.boss?.echo && !window.__G.zone.boss.dead, null, { timeout: 120000 });
      await hide(); r.e11.risen = (await stored()).visit?.echoes ?? null;
      await A5.hit(pg, null); await gameWait(1);
      r.e11.fought = (await stored()).visit?.echoes ?? null;
      await load(); await menu(); r.e11.c = await cont();
      r.e11.used = await ev(() => !!window.__G.zone.interact.find((i) => i.kind === 'echo')?.used);
      k.echo = r.e11.touched === null && r.e11.risen === null && JSON.stringify(r.e11.fought) === '["silverhorn"]' && r.e11.c.zone === 'weep' && r.e11.used;
    };

    // ---- the third verse read just before the quit: the Glade wakes at once on the wake, and she is kept from the Hart ----
    P.verse = async (r, k) => {
      await fresh({ flags: ['tear_planting'], drop: ['tear_breaking'] });
      await A5.use(pg, tearIt('breaking'));
      r.hidden = await A5.until(pg, () => { const G = window.__G; if (G.hero.flags.tear_breaking && G.mode === 'play') { window.dispatchEvent(new Event('pagehide')); G.save = null; return true; } return false; }, 120000);
      const v = (await stored()); r.saved = { quest: v.quest, flag: !!v.flags.tear_breaking, x: v.visit?.x, z: v.visit?.z };
      await load(); await menu(); r.c = await cont();
      r.c.dTear = await ev(([x, z]) => +Math.hypot(window.__G.player.x - x, window.__G.player.z - z).toFixed(1), [r.saved.x, r.saved.z]);
      await gameWait(6);
      r.after = await ev(() => { const G = window.__G, z = G.zone, pre = window.__D.t('q.new'); return { quest: G.hero.quest, newQ: window.__toasts.some((m) => m.startsWith(pre)), bellow: window.__says.some((s) => /^d\.linden\.bellow/.test(s)), hart: !!z.bossSpawned || z.actors.some((a) => a.kind === 'silverhorn') }; });
      k.verse = r.hidden && r.saved.quest === 12 && r.saved.flag && r.c.zone === 'weep' && r.c.dWp <= 3 && r.c.dTear > 5 && r.after.quest === 13 && r.after.newQ && r.after.bellow && !r.after.hart;
    };

    // ---- Whitecliff at its waypoint, as before, whenever the visit is not to be taken ----
    // (FALL=a,...,h: some of its cases; each one not run is stood in for by the state it would have left)
    P.fall = async (r, k) => {
      const CASES = (process.env.FALL || 'a,b,c,d,e,f,g,h').split(','), on = (c) => CASES.includes(c);
      const town = (c) => c.zone === 'town' && c.dWp <= 3;
      const inTown = async () => { await plant(ownerLike()); await load(); await menu(); await cont(); };
      const woken = async () => { await fresh(); await quit(); await menu(); return cont(); };
      if (on('a')) {
      // a. Return to town
      await fresh();
      await ev(() => window.__D.emit('townPortal'));
      await pg.waitForFunction(() => window.__G.zone?.id === 'town' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 120000 });
      await wait(400);
      r.a = { visit: (await stored()).visit ?? null };
      await load(); r.a.m = await menu(); r.a.c = await cont(); r.a.after = (await stored()).visit ?? null;
      k.a = r.a.visit === null && !r.a.m.at && town(r.a.c) && r.a.after === null;
      }
      if (on('b')) {
      if (!on('a')) await inTown();
      // b. a Shadow Gate
      await ev(() => window.__D.emit('startGate', 1));
      await pg.waitForFunction(() => window.__G.zone?.id === 'gate' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 120000 });
      await hide(); r.b = { visit: (await stored()).visit ?? null };
      await load(); r.b.m = await menu(); r.b.c = await cont();
      k.b = r.b.visit === null && !r.b.m.at && town(r.b.c) && (await stored()).visit === undefined;
      }
      if (on('c')) {
      // c. a visit not to be taken: each edit planted, the title and Continue
      await fresh(); await hide(true);
      const rec = await stored();
      const edits = { control: (h) => h, seed: (h) => { h.visit.seed += 1; }, diff: (h) => { h.visit.diff = 3; }, nowhere: (h) => { h.visit.id = 'nowhere'; }, gate: (h) => { h.visit.id = 'gate'; }, str: (h) => { h.visit = 'x'; }, arr: (h) => { h.visit = [1]; }, x: (h) => { h.visit.x = 'a'; }, stamp: (h) => { h.visit.stamp[3] += 1; } };
      r.c = {};
      for (const [name, f] of Object.entries(edits)) {
        const h = JSON.parse(JSON.stringify(rec)); f(h);
        await plant(h); await load();
        const m = await menu(), c = await cont(), after = (await stored()).visit ?? null;
        r.c[name] = { at: m.at, zone: c.zone, dWp: c.dWp, after: after && (typeof after === 'object' ? after.id : after) };
      }
      k.c = r.c.control.zone === 'weep' && !!r.c.control.at && Object.entries(r.c).every(([n, c]) => n === 'control' || (!c.at && town(c) && c.after === null));
      // (voices that are not all indices, as a file or a copy may bring: taken, the others passed over, the page untouched)
      const hv = JSON.parse(JSON.stringify(rec)); hv.visit.voices = ['__proto__', 'constructor', 'length', 0];
      await plant(hv); await load(); await menu(); const cv = await cont();
      r.voices = { zone: cv.zone, ...(await ev(() => ({ proto: [].done ?? null, ctor: Array.done ?? null, v0: !!window.__G.zone.voices?.[0]?.done, fail: window.__toasts.includes(window.__D.t('load.fail')) }))) };
      r.voices.after = (await stored()).visit?.id ?? null;
      k.voices = r.voices.zone === 'weep' && r.voices.proto === null && r.voices.ctor === null && r.voices.v0 && !r.voices.fail && r.voices.after === 'weep';
      }
      if (on('d')) {
      // d. her zone will not load (the network): Whitecliff, the visit held, and laid on the zone when she walks in
      await fresh();
      const pid = await ev(() => { const z = window.__G.zone, s = z.L.start; return z.packs.map((p) => ({ id: p.id, d: Math.hypot(p.x - s.x, p.z - s.z) })).sort((a, b) => a.d - b.d)[0].id; });
      r.d = { cleared: await clearPack(pid) }; await chest(0, true);
      await quit();
      // (the wood's files themselves refused, not the modules that name them: a page keeps a module import that failed, as
      // it would a chunk of the built game's, so a walk-in in that page could never fetch them again)
      const block = (u) => /\/src\/assets\/wood(\.glb|\/[^/]+\.webp)$/.test(u.pathname) && !u.search;
      await pg.route(block, (rt) => rt.abort());
      r.d.m = await menu(); r.d.c = await cont();
      const held = () => ev(async () => { const W = await import('/src/game/wake.js'), d = JSON.parse(localStorage.getItem('skotos.save.v1')), h = d.heroes.find((x) => x.id === d.last), v = W.wakeOf(h); return v && { id: v.id, packs: v.packs, chests: v.chests }; });
      r.d.fail = await ev(() => window.__toasts.includes(window.__D.t('load.fail')));
      r.d.held = await held();
      await ev(() => { window.__G.hero.gold += 7; }); await hide();
      r.d.held2 = await held();
      await pg.unroute(block);
      await A5.travel(pg, 'weep', 'town');
      r.d.walked = await ev((pid) => { const G = window.__G, z = G.zone, e = z.L.exits.find((x) => x.to === 'town'), c = z.interact.find((i) => i.kind === 'chest' && i.ci === 0), p = z.packs.find((q) => q.id === pid); return { zone: z.id, dExit: +Math.hypot(G.player.x - e.x, G.player.z - e.z).toFixed(1), pack: !!p.spawned && !z.actors.some((a) => a.packId === pid), chest: !!c.used }; }, pid);
      const vd = (await stored()).visit; r.d.now = vd && { id: vd.id, packs: vd.packs, chests: vd.chests };
      const pi = +pid.slice(4);
      k.d = r.d.cleared && town(r.d.c) && r.d.fail && !!r.d.m.at && r.d.held?.id === 'weep' && (r.d.held.packs || []).includes(pi) && JSON.stringify(r.d.held.chests) === '[0]' && r.d.held2?.id === 'weep'
        && r.d.walked.zone === 'weep' && r.d.walked.dExit < 6 && r.d.walked.pack && r.d.walked.chest && r.d.now?.id === 'weep' && (r.d.now.packs || []).includes(pi) && JSON.stringify(r.d.now.chests) === '[0]';
      // (and with the network there at the next Continue: she wakes where she was)
      const spotD = await quit(() => ({ x: window.__G.player.x, z: window.__G.player.z }));
      await menu(); r.d.c2 = await cont(); r.d.c2.d = +Math.hypot(r.d.c2.x - spotD.x, r.d.c2.z - spotD.z).toFixed(2);
      k.d2 = r.d.c2.zone === 'weep' && r.d.c2.d <= 0.75;
      }
      if (on('e')) {
      if (!on('d')) await woken();
      // e. a lost context, stuck (lost again at the lowest quality): no visit kept; a first loss keeps it and reloads
      await ev(() => { window.__mark = 1; sessionStorage.setItem('skotos.glLost', String(Date.now())); window.__R.renderer.getContext().getExtension('WEBGL_lose_context').loseContext(); });
      await wait(3500);
      r.e = await ev(() => ({ note: !!document.getElementById('gl-lost'), same: window.__mark === 1 }));
      r.e.visit = (await stored()).visit ?? null;
      await load(); await menu(); r.e.c = await cont();
      k.e = r.e.note && r.e.same && r.e.visit === null && town(r.e.c);
      await A5.travel(pg, 'weep', 'town'); await calm();
      await quit(); await menu(); r.e.c1 = await cont();
      const nav = pg.waitForNavigation({ timeout: 240000 });
      await ev(() => { sessionStorage.removeItem('skotos.glLost'); window.__R.renderer.getContext().getExtension('WEBGL_lose_context').loseContext(); });
      r.e.first = { visit: (await stored()).visit?.id ?? null };
      await nav; await ready();
      r.e.first.m = await menu(); r.e.first.c = await cont();
      k.e2 = r.e.c1.zone === 'weep' && r.e.first.visit === 'weep' && !!r.e.first.m.at && r.e.first.c.zone === 'weep';
      }
      if (on('f')) {
      if (!on('e')) await woken();
      // f. a fault soon after a wake: no visit kept for that page (this case sets off the #fatal box on purpose)
      r.allowFatal = ['resume test'];
      await ev(() => window.dispatchEvent(new ErrorEvent('error', { message: 'resume test' })));
      await hide(); r.f = { visit: (await stored()).visit ?? null };
      await load(); r.f.m = await menu(); r.f.c = await cont();
      k.f = r.f.visit === null && !r.f.m.at && town(r.f.c);
      }
      if (on('g')) {
      if (!on('f')) await inTown();
      // g. on the way out: a travel to Whitecliff, and the death panel's Respawn in town, in their fade
      await A5.travel(pg, 'weep', 'town'); await calm();
      r.g = { travel: await ev(() => { window.__D.emit('travel', 'town', { at: 'waypoint' }); window.dispatchEvent(new Event('pagehide')); const d = JSON.parse(localStorage.getItem('skotos.save.v1')); return d.heroes.find((h) => h.id === d.last).visit?.id ?? null; }) };
      await pg.waitForFunction(() => window.__G.zone?.id === 'town' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 120000 });
      await A5.travel(pg, 'weep', 'town'); await calm();
      await die();
      r.g.respawnTown = await ev(() => { window.__D.closePanel(); window.__D.emit('respawn', true); window.dispatchEvent(new Event('pagehide')); window.__immortal = true; const d = JSON.parse(localStorage.getItem('skotos.save.v1')); return d.heroes.find((h) => h.id === d.last).visit?.id ?? null; });
      await pg.waitForFunction(() => window.__G.zone?.id === 'town' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 120000 });
      k.g = r.g.travel === null && r.g.respawnTown === null;
      }
      if (on('h')) {
      if (!on('g')) await inTown();
      // h. the respawn's fade, in her zone: she is up already, and the visit says to wake at the retry spot
      await A5.travel(pg, 'weep', 'town'); await calm();
      const died = await ev(() => ({ x: window.__G.player.x, z: window.__G.player.z }));
      await die();
      r.h = await ev(() => { window.__D.closePanel(); window.__D.emit('respawn', false); window.dispatchEvent(new Event('pagehide')); window.__G.save = null; const d = JSON.parse(localStorage.getItem('skotos.save.v1')), v = d.heroes.find((h) => h.id === d.last).visit; return { retry: v?.retry ?? null, dead: window.__G.player.dead }; });
      await load(); await menu(); r.h.c = await cont(); r.h.c.dDied = +Math.hypot(r.h.c.x - died.x, r.h.c.z - died.z).toFixed(1);
      k.h = r.h.retry === 1 && !r.h.dead && r.h.c.zone === 'weep' && r.h.c.dWp <= 3 && r.h.c.dDied > 10;
      }
    };

    // ---- the soft-lock guard: a spot cut off from the start, the waypoint and every open exit ----
    P.lock = async (r, k) => {
      await fresh(); await hide(true);
      const rec = await stored();
      const north = await ev(() => { const z = window.__G.zone, g = z.L.spots.rootGate, f = z.map.nearestFloor(g.x, g.z - 2); return { x: f.x, z: f.z, cut: !z.map.reaches(f.x, f.z, [z.L.start]) }; });
      for (const [name, p] of [['north', north], ['rock', { x: 0.5, z: 0.5 }]]) {
        const h = JSON.parse(JSON.stringify(rec)); h.visit.x = p.x; h.visit.z = p.z;
        await plant(h); await load(); const m = await menu(), c = await cont();
        r[name] = { at: m.at, ...c, d: +Math.hypot(c.x - p.x, c.z - p.z).toFixed(1), cut: p.cut };
      }
      k.lock = r.north.cut && r.north.zone === 'weep' && r.north.dWp <= 3 && r.north.d > 3 && r.rock.zone === 'weep' && r.rock.floor && r.rock.reachStart;
    };

    // ---- dead at the save: up at the retry spot, alive and whole ----
    P.death = async (r, k) => {
      await fresh(); await die();
      await hide(true); r.retry = (await stored()).visit?.retry ?? null;
      await load(); await menu(); r.c = await cont();
      k.death = r.retry === 1 && r.c.zone === 'weep' && !r.c.dead && r.c.full && r.c.dWp <= 3;
    };

    // an auto hero of the test hook, written as the only hero (the auto page saves it)
    const auto = async (q) => { await plant(null); await pg.goto(base + '?' + q + '&sim=4&q=0&norender'); await pg.waitForFunction(() => window.__ready && window.__G?.player && window.__G.mode === 'play', null, { timeout: 300000 }); await listen(); await A5.tick(pg); await ev(() => { window.__immortal = true; }); };
    const killBoss = async () => {
      const s = await ev(() => { const z = window.__G.zone, s = z.bossSpot; return s && { x: s.x, z: s.z }; });
      await put(s.x, s.z + 7);
      await pg.waitForFunction(() => window.__G.zone.boss, null, { timeout: 120000 });
      return A5.hit(pg, null);
    };
    // ---- an Acts I-II boss killed this visit stays down on the wake; the forest's quest caught up ----
    P.forest = async (r, k) => {
      await auto('auto=forest&lvl=6&quest=1');
      r.killed = await killBoss();
      r.saved = await ev(() => { const G = window.__G, z = G.zone, s = z.L.boss, f = z.map.nearestFloor(s.x, s.z - 2); G.player.x = f.x; G.player.z = f.z; G.player.act = null; window.dispatchEvent(new Event('pagehide')); G.save = null; const d = JSON.parse(localStorage.getItem('skotos.save.v1')), h = d.heroes.find((x) => x.id === d.last); return { retry: h.visit?.retry ?? null, boss: h.visit?.boss ?? null, x: h.visit?.x, z: h.visit?.z, weaver: !!h.flags.weaver, quest: h.quest }; });
      await load(); r.m = await menu(); r.c = await cont(); r.c.d = +Math.hypot(r.c.x - r.saved.x, r.c.z - r.saved.z).toFixed(2);
      await gameWait(3);
      r.after = await ev(() => { const G = window.__G, z = G.zone; return { spot: z.bossSpot ?? null, spawned: !!z.bossSpawned, weaver: z.actors.some((a) => a.kind === 'weaver' && !a.dead), quest: G.hero.quest }; });
      await hide(); r.after.boss = (await stored()).visit?.boss ?? null;
      // (out by the portal and back by the waypoint after a reload: a walk-in from town meets it again, as ever)
      await ev(() => window.__D.emit('townPortal'));
      await pg.waitForFunction(() => window.__G.zone?.id === 'town' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 120000 });
      await load(); await menu(); r.back = await cont();
      await A5.travel(pg, 'forest', 'waypoint');
      r.back.spot = await ev(() => window.__G.zone.bossSpot?.kind ?? null);
      k.forest = r.killed && r.saved.retry === null && r.saved.boss === 1 && r.saved.weaver && r.saved.quest === 1 && r.c.zone === 'forest' && r.c.d <= 0.75 && r.after.spot === null && r.after.spawned && !r.after.weaver && r.after.quest === 2 && r.after.boss === 1 && r.back.zone === 'town' && r.back.spot === 'weaver';
    };
    // ---- the Barrow Lord's shard, not taken before the quit, lies by its spot again; taken, it does not ----
    P.crypt = async (r, k) => {
      for (const take of [false, true]) {
        const o = r[take ? 'taken' : 'left'] = {};
        await auto('auto=crypt&lvl=8&quest=3&flags=weaver,metSmith&cls=mage');
        o.killed = await killBoss();
        await pg.waitForFunction(() => window.__G.pickups.some((p) => p.kind === 'shard'), null, { timeout: 60000 }).catch(() => {});
        if (take) { await ev(() => { const G = window.__G, s = G.pickups.find((p) => p.kind === 'shard'); G.player.x = s.x; G.player.z = s.z; }); await pg.waitForFunction(() => window.__G.hero.quest === 4, null, { timeout: 60000 }).catch(() => {}); }
        else await ev(() => { const G = window.__G, s = G.pickups.find((p) => p.kind === 'shard'), f = G.zone.map.nearestFloor(s.x + 5, s.z + 3); G.player.x = f.x; G.player.z = f.z; });
        await gameWait(1);
        await hide(true); const h = await stored(); o.saved = { boss: h.visit?.boss ?? null, quest: h.quest };
        await load(); await menu(); o.c = await cont(); await gameWait(3);
        o.after = await ev(() => { const G = window.__G, B = G.zone.L.boss, sh = G.pickups.filter((p) => p.kind === 'shard'); return { lord: G.zone.actors.some((a) => a.kind === 'barrowLord' && !a.dead), shards: sh.length, d: sh[0] ? +Math.hypot(sh[0].x - B.x, sh[0].z - B.z - 1).toFixed(2) : null }; });
        if (!take && o.after.shards) {
          await ev(() => { window.__toasts = []; const G = window.__G, s = G.pickups.find((p) => p.kind === 'shard'); G.player.x = s.x; G.player.z = s.z; });
          await pg.waitForFunction(() => window.__G.hero.quest === 4, null, { timeout: 60000 }).catch(() => {});
          o.picked = await ev(() => ({ quest: window.__G.hero.quest, toast: window.__toasts.includes(window.__D.t('q.shard')) }));
        }
      }
      k.crypt = r.left.killed && r.left.saved.boss === 1 && r.left.saved.quest === 3 && r.left.c.zone === 'crypt' && !r.left.after.lord && r.left.after.shards === 1 && r.left.after.d <= 2 && r.left.picked?.quest === 4 && r.left.picked.toast
        && r.taken.saved.boss === 1 && r.taken.saved.quest === 4 && r.taken.c.zone === 'crypt' && !r.taken.after.lord && r.taken.after.shards === 0;
    };
    // ---- the Stonewarden killed, a save in the gateway: no Stonewarden there on the wake, the quest caught up ----
    P.pass = async (r, k) => {
      await auto('auto=pass&lvl=12&quest=6&flags=weaver,lord,metSmith,act1');
      r.killed = await killBoss();
      r.saved = await ev(() => { const G = window.__G, z = G.zone, g = z.L.gate, f = z.map.nearestFloor(g.x, g.z + 3); G.player.x = f.x; G.player.z = f.z; G.player.act = null; window.dispatchEvent(new Event('pagehide')); G.save = null; const d = JSON.parse(localStorage.getItem('skotos.save.v1')), h = d.heroes.find((x) => x.id === d.last); return { boss: h.visit?.boss ?? null, retry: h.visit?.retry ?? null, x: h.visit?.x, z: h.visit?.z, quest: h.quest, toBoss: +Math.hypot(f.x - z.L.boss.x, f.z - z.L.boss.z).toFixed(1) }; });
      await load(); await menu(); r.c = await cont(); r.c.d = +Math.hypot(r.c.x - r.saved.x, r.c.z - r.saved.z).toFixed(2);
      await gameWait(5);
      r.after = await ev(() => { const G = window.__G, z = G.zone, e = z.interact.find((i) => i.kind === 'exit' && i.to === 'halls'); return { warden: z.actors.some((a) => a.kind === 'stonewarden' && !a.dead), open: !e?.locked || !!G.hero.flags[e.locked], quest: G.hero.quest }; });
      k.pass = r.killed && r.saved.boss === 1 && r.saved.toBoss < 32 && r.c.zone === 'pass' && r.c.d <= 0.75 && !r.after.warden && r.after.open && r.after.quest === 7;
    };
    // ---- Act IV: dead in the Field, up by the last waylamp after the Continue ----
    P.act4 = async (r, k) => {
      await auto('auto=ashfield&lvl=24&quest=18&flags=act1,act2,act3,after3,hart,autumn,weaver,lord,fireTaken');
      r.cp = await ev(() => { const G = window.__G, it = G.zone.act4.lamps[0]; G.hero.flags['lamp_' + it.id] = true; G.hero.flags.lastLamp = it.id; window.__D.enterZone('ashfield', { fresh: true, at: 'start' }); const c = G.zone.checkpoint; return c ? { x: c.x, z: c.z } : null; });
      await die(); await hide(true); r.retry = (await stored()).visit?.retry ?? null;
      await load(); await menu(); r.c = await cont();
      r.c.cp = await ev(() => { const c = window.__G.zone.checkpoint; return c ? +Math.hypot(window.__G.player.x - c.x, window.__G.player.z - c.z).toFixed(2) : null; });
      k.act4 = !!r.cp && r.retry === 1 && r.c.zone === 'ashfield' && r.c.cp !== null && r.c.cp <= 1.5;
    };
    // ---- Act V: a spot on the skerry, shut again under the dead Tower; and a death by the island checkpoint ----
    P.act5 = async (r, k) => {
      await auto('auto=coast&lvl=30&cls=warden&' + A5.url('towerDown'));
      await A5.state(pg, 'towerDown', { zone: 'coast', at: 'waypoint', flags: { cp5: { coast: 'island' } } });
      await hide(true); const rec = await stored();
      const sk = await ev(() => { const s = window.__G.zone.L.spots.skerry; return { x: s.x, z: s.z }; });
      r.saved = { cp5: rec.flags.cp5, visit: rec.visit?.id ?? null };
      const h = JSON.parse(JSON.stringify(rec)); h.visit.x = sk.x; h.visit.z = sk.z;
      await plant(h); await load(); await menu(); r.c = await cont();
      r.c.onSkerry = await ev(() => { const G = window.__G, s = G.zone.L.spots.skerry, ix = Math.floor(G.player.x), iz = Math.floor(G.player.z); return s.cells.some(([x, z]) => x === ix && z === iz); });
      await die(false); await hide(true); r.retry = (await stored()).visit?.retry ?? null;
      await load(); await menu(); r.c2 = await cont();
      r.c2.cp = await ev(() => { const c = window.__G.zone.checkpoint; return c ? +Math.hypot(window.__G.player.x - c.x, window.__G.player.z - c.z).toFixed(2) : null; });
      k.act5 = r.saved.visit === 'coast' && r.c.zone === 'coast' && r.c.floor && !r.c.onSkerry && r.c.reachStart && r.retry === 1 && r.c2.zone === 'coast' && r.c2.cp !== null && r.c2.cp <= 2;
    };
    // ---- Act V: the Tower woken, not fought. A calm save near it wakes at her spot past the 24 m it rises at, or, closer
    // and out of its sight, at the waypoint: never at the shore rock (its fight's retry, inside those 24 m); a death does ----
    P.tower = async (r, k) => {
      // (TSEED=<seed>: the bay's layout; else one of chance)
      await auto('auto=coast&lvl=30&cls=warden&' + A5.url('towerWake') + (process.env.TSEED ? '&seed=' + process.env.TSEED : ''));
      await A5.state(pg, 'towerWake', { zone: 'coast', at: 'waypoint', flags: { cp5: { coast: 'rock' } } });
      await A5.until(pg, () => !window.__G.cine && window.__G.mode === 'play', 60000);
      // (cells reachable from the start at low water, off the skerry: one 27-31 m off its centre that sees it, else one there
      // that does not (the bowl's rim hides it from all of that band on about a quarter of seeds), and one within 22 m that
      // does not)
      r.pre = await ev(() => {
        const z = window.__G.zone, m = z.map, sk = z.L.spots.skerry, c = z.checkpoint, on = new Set(sk.cells.map(([x, zz]) => x + ',' + zz)), far = [], farHid = [], hid = [];
        for (let zz = 0; zz < z.L.h; zz++) for (let x = 0; x < z.L.w; x++) {
          const px = x + 0.5, pz = zz + 0.5, d = Math.hypot(px - sk.x, pz - sk.z);
          if (d > 31 || on.has(x + ',' + zz) || !m.walkable(px, pz)) continue;
          const see = m.los(px, pz, sk.x, sk.z);
          if (d >= 27) (see ? far : farHid).push({ x: px, z: pz, d, see }); else if (d < 22 && !see) hid.push({ x: px, z: pz, d });
        }
        const pick = (a, d0) => a.sort((p, q) => Math.abs(p.d - d0) - Math.abs(q.d - d0)).find((p) => m.reaches(p.x, p.z, [z.L.start])) || null;
        return { seed: z.seed, sk: { x: sk.x, z: sk.z }, cp: c && { x: c.x, z: c.z, d: +Math.hypot(c.x - sk.x, c.z - sk.z).toFixed(1) }, far: pick(far, 29) || pick(farHid, 29), hid: pick(hid, 16) };
      });
      await hide(true); const rec = await stored();
      r.saved = { visit: rec.visit?.id ?? null, cp5: rec.flags.cp5?.coast ?? null, wake: !!rec.flags.towerWake };
      const calm = () => ev(() => { const G = window.__G, b = G.zone.boss; return { spawned: !!b, awake: !!b?.awake, fight: !!G.bossActor }; });
      for (const [name, p, retry] of [['far', r.pre.far, 0], ['hid', r.pre.hid, 0], ['dead', r.pre.far, 1]]) {
        if (!p) { r[name] = null; continue; }
        const h = JSON.parse(JSON.stringify(rec)); h.visit.x = p.x; h.visit.z = p.z; delete h.visit.retry; if (retry) h.visit.retry = 1;
        await plant(h); await load(); await menu(); const c = await cont();
        const o = r[name] = { ...c, d: +Math.hypot(c.x - p.x, c.z - p.z).toFixed(2) };
        o.cp = await ev(() => { const c = window.__G.zone.checkpoint; return c ? +Math.hypot(window.__G.player.x - c.x, window.__G.player.z - c.z).toFixed(2) : null; });
        if (!retry) { await gameWait(3); o.after = await calm(); }
      }
      k.tower = r.saved.visit === 'coast' && r.saved.cp5 === 'rock' && r.saved.wake && r.pre.cp?.d < 24 && !!r.far && !!r.hid && !!r.dead
        && r.far.zone === 'coast' && r.far.d <= 0.75 && !r.far.after.awake && !r.far.after.fight
        && r.hid.zone === 'coast' && r.hid.dWp <= 3 && !r.hid.after.awake && !r.hid.after.fight
        && r.dead.zone === 'coast' && r.dead.cp !== null && r.dead.cp <= 2;
    };

    // ---- Act VI: the Mere and the Bottom wake her where she stood (the layout naming the zone's mode), and after a death at
    // the zone's checkpoint (flags.cp6, the camp from the first arrival) ----
    P.act6 = async (r, k) => {
      for (const id of ['drained', 'bottom']) {
        const o = r[id] = {};
        await auto('auto=' + id + '&lvl=36');
        await calm();
        o.saved = await ev(() => { const G = window.__G, z = G.zone, c = z.L.spots.camp || z.L.start, f = z.map.nearestFloor(c.x + 5, c.z + 5); G.player.x = f.x; G.player.z = f.z; G.player.act = null; return { x: f.x, z: f.z, mode: z.mode, cp6: G.hero.flags.cp6?.[z.id] ?? null }; });
        await hide(true); const rec = await stored();
        o.visit = rec.visit ? { id: rec.visit.id, layout: rec.visit.layout } : null;
        await plant(rec); await load(); o.m = await menu(); o.c = await cont(); o.c.d = +Math.hypot(o.c.x - o.saved.x, o.c.z - o.saved.z).toFixed(2);
        await die(false); await hide(true); o.retry = (await stored()).visit?.retry ?? null;
        await load(); await menu(); o.c2 = await cont();
        o.c2.cp = await ev(() => { const c = window.__G.zone.checkpoint; return c ? +Math.hypot(window.__G.player.x - c.x, window.__G.player.z - c.z).toFixed(2) : null; });
        k[id] = o.saved.cp6 === 'camp' && o.visit?.id === id && o.visit.layout?.length === 6 && o.visit.layout[5] === o.saved.mode && !!o.m.at
          && o.c.zone === id && o.c.d <= 0.75 && o.retry === 1 && o.c2.zone === id && o.c2.cp !== null && o.c2.cp <= 2;
      }
    };

    for (const p of PARTS) {
      const r = R[p] = {}, k = {};
      const t0 = Date.now();
      try { await P[p](r, k); } catch (e) { r.error = e.message.split('\n')[0]; k.error = false; }
      r.secs = Math.round((Date.now() - t0) / 1000);
      OK[p] = Object.keys(k).length > 0 && Object.values(k).every(Boolean); r.ok = k;
      console.error('[resume] ' + p + ' ' + (OK[p] ? 'ok' : 'FAIL') + ' ' + JSON.stringify(k) + ' ' + r.secs + 's');
    }
    return { pass: PARTS.every((p) => OK[p]), ok: OK, r: R, allowFatal: R.fall?.allowFatal };
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
  skillsfx: { q: 'auto=forest&sim=4&q=1&norender&lvl=45&cls=' + (process.env.CLS || 'warden'), run: async (pg, shot) => {
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
  // saves kept whole: a hero who took its weapon off keeps the chest and the shield it wears through Continue; two pages
  // of one browser (a co-op host and its guest in two tabs) each write their own hero and never the other's back stale;
  // a hero deleted on this page is not brought back by the other page's copy
  save14: { q: 'q=0&sim=2&norender', run: async (pg) => {
    await pg.evaluate(async () => {
      const I = await import('/src/game/items.js'), G = window.__G;
      const mk = (o) => I.makeItem(45, Object.assign({ cls: 'warden' }, o));
      const base = (o) => Object.assign({ xp: 0, gold: 100, inv: new Array(32).fill(null), equip: {}, stash: new Array(48).fill(null), wps: ['town'], act1: -1, act2: -1, act3: -1, act4: -1, act5: -1, flags: {}, quest: 1, diff: 0, skills: {}, points: 0, played: 1, stats: { kills: 0, deaths: 0, time: 0 } }, o);
      const bare = base({ id: 'hBare', name: 'Bare', cls: 'warden', level: 45, equip: { chest: mk({ base: 'chest', rar: 3, leg: 'vampiricMail' }), offhand: mk({ base: 'shield', rar: 3, leg: 'lastBastion' }) } });
      bare.inv[0] = mk({ base: 'sword', rar: 2 });
      const other = base({ id: 'hOther', name: 'Other', cls: 'mage', level: 20 });
      const s = { heroes: [bare, other], settings: { helpSeen: true }, last: 'hBare' };
      localStorage.setItem('skotos.save.v1', JSON.stringify(s)); G.save = JSON.parse(JSON.stringify(s));
    });
    await pg.goto(A5.base + '?q=0&sim=2&norender');
    await pg.waitForFunction(() => window.__ready && window.__G?.save, null, { timeout: 240000 });
    await pg.evaluate(() => window.__D.emit('startHero', window.__G.save.heroes.find((x) => x.id === 'hBare'), false));
    await pg.waitForFunction(() => window.__G?.zone && window.__G.mode === 'play', null, { timeout: 240000 });
    await A5.tick(pg);
    const gear = await pg.evaluate(() => { const e = window.__G.hero.equip, inv = window.__G.hero.inv.filter(Boolean); return { chest: e.chest?.leg, offhand: e.offhand?.leg, weapon: !!e.weapon, bagWeapon: inv.some((it) => it.base === 'sword') }; });
    // another page of this browser plays hOther and makes a hero of its own; then this page writes
    const two = await pg.evaluate(async () => {
      const SV = await import('/src/game/save.js'), G = window.__G;
      const disk = JSON.parse(localStorage.getItem('skotos.save.v1'));
      const o = disk.heroes.find((h) => h.id === 'hOther'); o.gold = 777; o.level = 21;
      disk.heroes.push(Object.assign(JSON.parse(JSON.stringify(o)), { id: 'hNew', name: 'New', gold: 5 }));
      localStorage.setItem('skotos.save.v1', JSON.stringify(disk));
      G.hero.gold = 4242; SV.writeSave();
      const a = JSON.parse(localStorage.getItem('skotos.save.v1'));
      const r1 = { me: a.heroes.find((h) => h.id === 'hBare')?.gold, other: a.heroes.find((h) => h.id === 'hOther')?.gold, otherLvl: a.heroes.find((h) => h.id === 'hOther')?.level, made: !!a.heroes.find((h) => h.id === 'hNew'), inMemory: G.save.heroes.find((h) => h.id === 'hOther')?.gold };
      // this page deletes hNew; the other page, still holding it, writes; this page writes again
      SV.deleteHero('hNew');
      const d2 = JSON.parse(localStorage.getItem('skotos.save.v1')); d2.heroes.push({ ...JSON.parse(JSON.stringify(d2.heroes.find((h) => h.id === 'hOther'))), id: 'hNew' }); localStorage.setItem('skotos.save.v1', JSON.stringify(d2));
      SV.writeSave();
      const b = JSON.parse(localStorage.getItem('skotos.save.v1'));
      return { ...r1, deletedStays: !b.heroes.some((h) => h.id === 'hNew'), count: b.heroes.length };
    });
    const pass = gear.chest === 'vampiricMail' && gear.offhand === 'lastBastion' && gear.weapon && gear.bagWeapon && two.me === 4242 && two.other === 777 && two.otherLvl === 21 && two.made && two.inMemory === 777 && two.deletedStays && two.count === 2;
    return { pass, gear, two };
  } },
  // cloud saves in claude.ai (game/cloud.js over net/cloudart.js), the artifact's db stood in for by a fake kept in the
  // page's localStorage ('__fakecloud', as the server: it outlives the game's own save). Heroes go up untouched; a new
  // device (the game's keys cleared) takes them from the title; a newer copy from another device replaces an idle hero
  // (the old kept as a backup), never the hero being played; a deletion goes up as a tombstone; Settings shows the
  // state and the backups; a signed-out view and a page with no claude.ai are the game as before
  cloud: { q: 'q=0&sim=2&norender', init: () => {
    const mode = localStorage.getItem('__fakecloud_mode');
    if (mode === 'none') return;
    const K = '__fakecloud', load = () => JSON.parse(localStorage.getItem(K) || '{}'), save = (d) => localStorage.setItem(K, JSON.stringify(d));
    const cp = (v) => JSON.parse(JSON.stringify(v));
    const snap = (id, v) => ({ id, exists: !!v, data: () => (v ? cp(v) : undefined), metadata: { fromCache: false, hasPendingWrites: false } });
    const doc = (path) => ({ id: path.split('/').pop(), path, async get() { return snap(path.split('/').pop(), load()[path]); }, async set(v) { const d = load(); d[path] = cp(v); save(d); window.__cloudSets = (window.__cloudSets || 0) + 1; }, async delete() { const d = load(); delete d[path]; save(d); } });
    const db = { doc, collection: (path) => ({ path, doc: (id) => doc(path + '/' + id), async get() { const d = load(), n = path.split('/').length + 1; const docs = Object.keys(d).filter((p) => p.startsWith(path + '/') && p.split('/').length === n).sort().map((p) => snap(p.split('/').pop(), d[p])); return { docs, size: docs.length, empty: !docs.length }; } }) };
    const user = { id: async () => 'u-test', canEdit: async () => true, can: async () => true };
    window.claude = { use: async (n) => (mode === 'out' ? null : n === 'db' ? db : n === 'user' ? user : null) };
  }, run: async (pg, shot) => {
    const base = A5.base, r = {};
    const ready = async (q = 'q=0&sim=2&norender') => { await pg.goto(base + '?' + q); await pg.waitForFunction(() => window.__ready && window.__G?.save, null, { timeout: 240000 }); };
    const cloudOn = () => pg.waitForFunction(async () => { const C = (await import('/src/game/cloud.js')).CLOUD; return C.state === 'on' && C.last > 0 && !C.busy; }, null, { timeout: 60000 });
    const sync = () => pg.evaluate(async () => { const r = await (await import('/src/game/cloud.js')).syncNow('test'); return r && { ok: r.ok, pushed: r.pushed, pulled: r.pulled, removed: r.removed, dropped: r.dropped, kept: r.kept, errors: r.errors, behind: r.behind }; });
    const docs = () => pg.evaluate(() => JSON.parse(localStorage.getItem('__fakecloud') || '{}'));
    const stored = () => pg.evaluate(() => JSON.parse(localStorage.getItem('skotos.save.v1') || 'null'));
    // two heroes as an older version left them (a field this version never heard of, Act V's fields absent)
    await pg.evaluate(() => {
      for (const k of Object.keys(localStorage)) if (k.startsWith('skotos.') || k.startsWith('__fakecloud')) localStorage.removeItem(k);
      const h = (id, cls, lvl, o) => Object.assign({ id, cls, level: lvl, xp: 0, gold: 100, diff: 0, skills: {}, points: lvl - 1, inv: new Array(32).fill(null), equip: {}, stash: new Array(48).fill(null), quest: 2, flags: {}, wps: ['town'], act1: -1, act2: -1, act3: -1, act4: -1, gateBest: 0, boons: [], stats: { kills: 3, deaths: 0, time: 60, legs: 0, elites: 0 }, created: 1, played: 1000, oldField: { keep: [1.5, 'x'] } }, o);
      localStorage.setItem('skotos.save.v1', JSON.stringify({ heroes: [h('hA', 'warden', 10), h('hB', 'mage', 4)], settings: { helpSeen: true }, last: 'hA' }));
      window.__G.save = null;
    });
    await ready(); await cloudOn();
    const d1 = await docs(), s1 = await stored();
    const up = (id) => d1['data/users/u-test/h-' + id];
    r.up = { docs: Object.keys(d1).sort(), untouched: ['hA', 'hB'].every((id) => up(id)?.data === JSON.stringify(s1.heroes.find((h) => h.id === id))) };
    // another device: the game's own keys gone, the cloud kept; the title fills from it
    await pg.evaluate(() => { window.__G.save = null; for (const k of Object.keys(localStorage)) if (k.startsWith('skotos.')) localStorage.removeItem(k); });
    await ready('sim=1&q=0&norender');
    await pg.waitForTimeout(1200); await pg.mouse.click(300, 200); await pg.waitForTimeout(800);
    await cloudOn();
    await pg.waitForFunction(() => window.__G.save.heroes.length === 2 && document.querySelectorAll('#screen .slot').length === 2, null, { timeout: 30000 }).catch(() => {});
    r.newDevice = await pg.evaluate(() => ({ heroes: window.__G.save.heroes.map((h) => h.id).sort(), slots: document.querySelectorAll('#screen .slot').length, cont: !!document.getElementById('m-cont'), oldField: JSON.parse(localStorage.getItem('skotos.save.v1')).heroes.find((h) => h.id === 'hA')?.oldField?.keep?.[0] }));
    await shot();
    // a newer copy of hA from another device: taken while hA rests, the old one kept as a backup
    // (written as another device's write is: its sum, and its chain)
    await pg.evaluate(async () => { const { heroSum } = await import('/src/game/cloudsync.js'); const d = JSON.parse(localStorage.getItem('__fakecloud')), p = 'data/users/u-test/h-hA', x = d[p], h = JSON.parse(x.data); h.gold = 999; h.played = Date.now() + 5000; x.data = JSON.stringify(h); x.played = h.played; x.sum = heroSum(h); x.rev++; x.chain = { ...(x.chain || {}), [x.rev]: x.sum }; localStorage.setItem('__fakecloud', JSON.stringify(d)); });
    r.newer = await sync();
    r.newerLocal = await pg.evaluate(async () => ({ gold: JSON.parse(localStorage.getItem('skotos.save.v1')).heroes.find((h) => h.id === 'hA').gold, mem: window.__G.save.heroes.find((h) => h.id === 'hA').gold, backups: (await import('/src/game/save.js')).backups().map((b) => [b.hero.id, b.hero.gold, b.why]) }));
    // play hA: its change goes up; a cloud copy arriving meanwhile is not taken under it
    await pg.evaluate(() => window.__D.emit('startHero', window.__G.save.heroes.find((h) => h.id === 'hA'), false));
    await pg.waitForFunction(() => window.__G?.zone && window.__G.mode === 'play', null, { timeout: 240000 });
    await A5.tick(pg);
    r.playGold = await pg.evaluate(() => window.__G.hero.gold);
    await pg.evaluate(async () => { window.__G.hero.gold = 4321; (await import('/src/game/save.js')).writeSave(); });
    r.pushPlay = await sync();
    r.pushedGold = JSON.parse((await docs())['data/users/u-test/h-hA'].data).gold;
    // the page going away: the hero played goes up on its own
    await pg.evaluate(async () => { window.__G.hero.gold = 5555; (await import('/src/game/save.js')).writeSave(); window.dispatchEvent(new Event('pagehide')); });
    await pg.waitForTimeout(800);
    r.flushGold = JSON.parse((await docs())['data/users/u-test/h-hA'].data).gold;
    await pg.evaluate(async () => { const { heroSum } = await import('/src/game/cloudsync.js'); const d = JSON.parse(localStorage.getItem('__fakecloud')), x = d['data/users/u-test/h-hA'], h = JSON.parse(x.data); h.gold = 1; h.played = Date.now() + 60000; x.data = JSON.stringify(h); x.played = h.played; x.sum = heroSum(h); x.rev++; x.chain = { ...(x.chain || {}), [x.rev]: x.sum }; localStorage.setItem('__fakecloud', JSON.stringify(d)); });
    r.whilePlayed = await sync();
    r.heroKept = await pg.evaluate(() => ({ gold: window.__G.hero.gold, stored: JSON.parse(localStorage.getItem('skotos.save.v1')).heroes.find((h) => h.id === 'hA').gold }));
    // (and the player is told: a word with the way back to the title, once)
    r.newerPanel = await pg.evaluate(() => ({ panel: window.__G.panel, quit: !!document.querySelector('#panel [data-a="quit"]'), stay: !!document.querySelector('#panel .pn-b [data-a="close"]') }));
    await shot();
    await pg.evaluate(() => window.__D.closePanel());
    r.newerOnce = await sync();
    r.newerOnce = { kept: r.newerOnce?.kept, panel: await pg.evaluate(() => window.__G.panel) };
    // a co-op guest's G.hero is a view over its own record: that record's id is the one being played
    r.guest = await pg.evaluate(async () => { const SV = await import('/src/game/save.js'), G = window.__G, real = G.hero; G.hero = Object.create(real); G.hero.__real = real; G.hero.id = 'hostsView'; const id = SV.playingId(); G.hero = real; return id; });
    // hB deleted here: its cloud copy becomes a tombstone, and a sync does not bring it back
    await pg.evaluate(async () => (await import('/src/game/save.js')).deleteHero('hB'));
    await pg.waitForTimeout(800);
    r.del = await sync();
    r.tomb = await pg.evaluate(() => { const x = JSON.parse(localStorage.getItem('__fakecloud'))['data/users/u-test/h-hB']; return { del: x?.del, data: x?.data }; });
    r.afterDel = (await stored()).heroes.map((h) => h.id);
    // Settings: the cloud row and its panel with the backups
    await pg.evaluate(() => window.__D.openPanel('settings')); await pg.waitForTimeout(300);
    r.row = await pg.evaluate(() => document.querySelector('#panel .cl-row')?.textContent || null);
    await pg.click('#panel .cl-row'); await pg.waitForTimeout(400);
    r.panel = await pg.evaluate(() => ({ state: document.getElementById('cl-state')?.textContent, backups: document.querySelectorAll('#panel .cl-bk').length, sync: !!document.querySelector('[data-a="clsync"]'), code: !!document.querySelector('[data-a="clcopy"]') }));
    await shot();
    await pg.click('[data-a="clsync"]'); await pg.waitForTimeout(800);
    r.syncMsg = await pg.evaluate(() => document.getElementById('cl-msg')?.textContent || null);
    // a backup taken back: two taps on hB's (named by hero and time); a backup added between the taps does not change which
    const bsel = await pg.evaluate(() => [...document.querySelectorAll('#panel [data-a^="clrestore:hB:"]')].map((b) => b.dataset.a)[0] || null);
    if (bsel) await pg.click(`[data-a="${bsel}"]`);
    await pg.evaluate(async () => { const SV = await import('/src/game/save.js'); SV.backupHero(Object.assign(JSON.parse(JSON.stringify(window.__G.hero)), { id: 'hZ', gold: 3 }), 'cloud'); (await import('/src/ui/bus.js')).emit('cloud', {}); });
    await pg.waitForTimeout(300);
    r.restoreRows = await pg.evaluate(() => document.querySelectorAll('#panel .cl-bk').length);
    if (bsel) await pg.click(`[data-a="${bsel}"]`);
    await pg.waitForTimeout(500);
    r.restore = await pg.evaluate(() => ({ sel: !!document.querySelector('[data-a^="clrestore:hB:"]'), msg: document.getElementById('cl-msg')?.textContent || null, stored: JSON.parse(localStorage.getItem('skotos.save.v1')).heroes.map((h) => h.id) }));
    r.restore.bsel = bsel;
    await pg.evaluate(() => window.__D.closePanel());
    // a signed-out view: no cloud, the game as before, the settings say so
    await pg.evaluate(() => localStorage.setItem('__fakecloud_mode', 'out'));
    await ready();
    await pg.waitForFunction(async () => (await import('/src/game/cloud.js')).CLOUD.state === 'unavailable', null, { timeout: 30000 }).catch(() => {});
    await pg.evaluate(() => window.__D.openPanel('settings')); await pg.waitForTimeout(300);
    r.out = await pg.evaluate(async () => ({ state: (await import('/src/game/cloud.js')).CLOUD.state, row: document.querySelector('#panel .cl-row')?.textContent || null, heroes: window.__G.save.heroes.length }));
    await pg.evaluate(() => window.__D.closePanel());
    // no claude.ai at all (the dev build): off, no row
    await pg.evaluate(() => localStorage.setItem('__fakecloud_mode', 'none'));
    await ready(); await pg.waitForTimeout(1500);
    await pg.evaluate(() => window.__D.openPanel('settings')); await pg.waitForTimeout(300);
    r.none = await pg.evaluate(async () => ({ state: (await import('/src/game/cloud.js')).CLOUD.state, row: !!document.querySelector('#panel .cl-row'), heroes: window.__G.save.heroes.length }));
    await pg.evaluate(() => { window.__D.closePanel(); for (const k of Object.keys(localStorage)) if (k.startsWith('__fakecloud')) localStorage.removeItem(k); });
    const checks = {
      up: r.up.untouched && r.up.docs.length === 2,
      newDevice: r.newDevice.heroes.join() === 'hA,hB' && r.newDevice.slots === 2 && r.newDevice.cont && r.newDevice.oldField === 1.5,
      newer: r.newer?.pulled?.includes('hA') && r.newerLocal.gold === 999 && r.newerLocal.mem === 999 && r.newerLocal.backups.some((b) => b[0] === 'hA' && b[1] === 100),
      play: r.playGold === 999 && r.pushPlay?.pushed?.includes('hA') && r.pushedGold === 4321,
      whilePlayed: r.whilePlayed?.kept?.includes('hA') && r.heroKept.gold === 5555 && r.heroKept.stored === 5555,
      newerTold: r.whilePlayed?.behind?.includes('hA') && r.newerPanel.panel === 'cloudNewer' && r.newerPanel.quit && r.newerPanel.stay && r.newerOnce.kept?.includes('hA') && !r.newerOnce.panel,
      restore: !!r.restore.bsel && r.restore.stored.includes('hB') && !!r.restore.msg && r.restoreRows >= 3,
      guest: r.guest === 'hA',
      tomb: r.tomb.del === true && r.tomb.data === null && !r.afterDel.includes('hB'),
      settings: !!r.row && r.panel.backups >= 1 && r.panel.sync && !r.panel.code && !!r.syncMsg,
      flush: r.flushGold === 5555,
      signedOut: r.out.state === 'unavailable' && !!r.out.row && r.out.heroes >= 1,
      none: r.none.state === 'off' && !r.none.row && r.none.heroes >= 1
    };
    return { pass: Object.values(checks).every(Boolean), checks, r };
  } },
  // cloud saves on the web build (net/cloudsb.js), the project stood in for by a fake supabase-js client in the page
  // (?cloud=fake: its server kept in localStorage '__fakesb', the rules of supabase/migrations/*_skotos_saves.sql in
  // short; the SQL itself: tools/cloud/test-saves.mjs). A hero goes up under a player whose code Settings shows; another
  // browser (the game's keys and the save session cleared) with no hero types the code in Settings and gets the hero
  cloudweb: { q: 'q=0&sim=2&norender&cloud=fake', init: () => {
    const S = () => JSON.parse(localStorage.getItem('__fakesb') || '{"players":{},"users":{},"saves":{}}'), W = (x) => localStorage.setItem('__fakesb', JSON.stringify(x));
    const A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ', mk = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => A[b & 31]).join('');
    const norm = (c) => String(c || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[^0-9A-Z]/g, '');
    // (every call of the player's saves names the player the page means: refused moved when it is not the user's)
    const moved = (uid, a, x) => (x.users[uid] && x.users[uid] === a.p_player ? null : { error: 'moved', player: x.users[uid] ?? null });
    const fns = {
      save_hello(uid, a, x) { if (x.users[uid]) { const p = x.users[uid]; return a.p_code ? { player: p, code_ok: x.players[p].code === norm(a.p_code) } : { player: p }; } const p = 'p' + mk(), code = mk(); x.players[p] = { code }; x.users[uid] = p; x.saves[p] = {}; return { player: p, code, new: true }; },
      save_claim(uid, a, x) { const c = norm(a.code), p = Object.keys(x.players).find((k) => x.players[k].code === c); if (!p) return { error: 'bad_code' }; x.users[uid] = p; return { player: p }; },
      save_new_code(uid, a, x) { const m = moved(uid, a, x); if (m) return m; const p = x.users[uid]; x.players[p].code = mk(); for (const u of Object.keys(x.users)) if (u !== uid && x.users[u] === p) delete x.users[u]; return { code: x.players[p].code }; },
      save_list(uid, a, x) { const m = moved(uid, a, x); if (m) return m; return Object.values(x.saves[x.users[uid]]).map(({ data, ...r }) => r); },
      save_get(uid, a, x) { const m = moved(uid, a, x); if (m) return m; return x.saves[x.users[uid]]?.[a.hero_id] || null; },
      save_put(uid, a, x) { const m = moved(uid, a, x); if (m) return m; const p = x.users[uid], r = x.saves[p][a.hero_id]; if ((r ? r.rev : null) !== (a.base_rev ?? null)) return { error: 'conflict' }; const rev = (r?.rev || 0) + 1; x.saves[p][a.hero_id] = { id: a.hero_id, rev, played: a.played, sum: a.sum, del: false, at: 0, data: a.data }; return { rev }; },
      save_delete(uid, a, x) { const m = moved(uid, a, x); if (m) return m; const p = x.users[uid], r = x.saves[p][a.hero_id]; if ((r ? r.rev : null) !== (a.base_rev ?? null)) return { error: 'conflict' }; const rev = (r?.rev || 0) + 1; x.saves[p][a.hero_id] = { id: a.hero_id, rev, played: 0, sum: '', del: true, at: a.at, data: null }; return { rev }; }
    };
    const createClient = async (url, key, opts) => {
      const st = opts.auth.storage, sk = opts.auth.storageKey, sess = () => JSON.parse(st.getItem(sk) || 'null');
      window.__saveAuth = { key: sk, local: st === localStorage };
      return {
        auth: { getSession: async () => ({ data: { session: sess() } }), signInAnonymously: async () => { const s = { user: { id: 'u' + mk() } }; st.setItem(sk, JSON.stringify(s)); return { data: { user: s.user, session: s }, error: null }; } },
        schema: () => ({ rpc: (fn, a) => { const pr = (async () => { const x = S(), uid = sess()?.user?.id; if (!uid) return { data: null, error: { message: 'not_signed_in' } }; const d = fns[fn](uid, a, x); W(x); return { data: d, error: null }; })(); pr.abortSignal = () => pr; return pr; } })
      };
    };
    window.__cloudFake = { url: 'https://fake.supabase.co', anonKey: 'k', createClient, stamped: true };
  }, run: async (pg, shot) => {
    const base = A5.base, r = {};
    const ready = async () => { await pg.goto(base + '?q=0&sim=2&norender&cloud=fake'); await pg.waitForFunction(() => window.__ready && window.__G?.save, null, { timeout: 240000 }); };
    const C = () => pg.evaluate(async () => { const c = (await import('/src/game/cloud.js')).CLOUD; return { state: c.state, kind: c.kind, code: c.code, last: c.last, err: c.err, busy: c.busy }; });
    await pg.evaluate(() => {
      for (const k of Object.keys(localStorage)) if (k.startsWith('skotos') || k.startsWith('__fake')) localStorage.removeItem(k);
      const h = { id: 'hW', cls: 'ranger', level: 7, xp: 0, gold: 321, diff: 0, skills: {}, points: 6, inv: new Array(32).fill(null), equip: {}, stash: new Array(48).fill(null), quest: 2, flags: {}, wps: ['town'], act1: -1, act2: -1, act3: -1, act4: -1, act5: -1, gateBest: 0, boons: [], stats: { kills: 3, deaths: 0, time: 60, legs: 0, elites: 0 }, created: 1, played: 1000 };
      localStorage.setItem('skotos.save.v1', JSON.stringify({ heroes: [h], settings: { helpSeen: true }, last: 'hW' })); window.__G.save = null;
    });
    await ready();
    await pg.waitForFunction(async () => { const c = (await import('/src/game/cloud.js')).CLOUD; return c.state === 'on' && c.last > 0 && !c.busy; }, null, { timeout: 60000 });
    r.one = await C();
    r.auth = await pg.evaluate(() => window.__saveAuth);
    r.upped = await pg.evaluate(() => { const x = JSON.parse(localStorage.getItem('__fakesb')), p = Object.values(x.users)[0]; return x.saves[p]?.hW?.data === JSON.stringify(JSON.parse(localStorage.getItem('skotos.save.v1')).heroes[0]); });
    await pg.evaluate(() => window.__D.openPanel('settings')); await pg.waitForTimeout(300);
    await pg.click('#panel .cl-row'); await pg.waitForTimeout(300);
    r.hidden = await pg.evaluate(() => document.getElementById('cl-code')?.textContent);
    await pg.click('[data-a="clshow"]'); await pg.waitForTimeout(300);
    r.shown = await pg.evaluate(() => document.getElementById('cl-code')?.textContent);
    await shot();
    await pg.click('[data-a="clcopy"]'); await pg.waitForTimeout(500);
    r.copyMsg = await pg.evaluate(() => document.getElementById('cl-msg')?.textContent);
    await pg.evaluate(() => window.__D.closePanel());
    // another browser: the game's keys and the save session gone, the server kept; nothing to play yet: no sign-in
    await pg.evaluate(() => { window.__G.save = null; for (const k of Object.keys(localStorage)) if (k.startsWith('skotos')) localStorage.removeItem(k); });
    await ready(); await pg.waitForTimeout(800);
    r.two = await C();
    await pg.evaluate(() => window.__D.openPanel('settings')); await pg.waitForTimeout(300);
    await pg.click('#panel .cl-row'); await pg.waitForTimeout(300);
    await pg.fill('#cl-in', r.shown.toLowerCase());
    await pg.click('[data-a="clclaim"]');
    await pg.waitForFunction(() => window.__G.save.heroes.some((h) => h.id === 'hW'), null, { timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(400);
    r.claimMsg = await pg.evaluate(() => document.getElementById('cl-msg')?.textContent);
    r.after = await pg.evaluate(() => ({ heroes: window.__G.save.heroes.map((h) => [h.id, h.gold]), stored: JSON.parse(localStorage.getItem('skotos.save.v1') || 'null')?.heroes?.map((h) => h.id) }));
    r.three = await C();
    await shot();
    await pg.evaluate(() => { window.__D.closePanel(); for (const k of Object.keys(localStorage)) if (k.startsWith('__fake') || k.startsWith('skotos.cloud') || k === 'skotos-save-auth') localStorage.removeItem(k); });
    const checks = {
      up: r.one.state === 'on' && r.one.kind === 'supabase' && /^[0-9A-Z]{16}$/.test(r.one.code || '') && r.upped,
      ownSession: r.auth?.key === 'skotos-save-auth' && r.auth.local === true,
      code: r.hidden.includes('•') && r.shown === r.one.code.match(/.{4}/g).join('-') && !!r.copyMsg,
      idle: r.two.state === 'idle',
      claimed: r.after.heroes.some(([id, g]) => id === 'hW' && g === 321) && r.after.stored?.includes('hW') && r.three.state === 'on' && r.three.code === r.one.code && !!r.claimMsg
    };
    return { pass: Object.values(checks).every(Boolean), checks, r };
  } },
  // heroes moved by hand between the claude.ai version and the web one (Settings › Cloud save › Move heroes): in
  // claude.ai (a stand-in kept in localStorage '__xfer' = 'art': its db, user and downloads) every hero out through the
  // downloads capability; on the web (no claude.ai) a plain download, then the claude.ai file in through the file picker:
  // the heroes added and on the title, the same file again changes nothing, the further copy kept on each hero, pasted
  // text taken as a file is, a file that is none refused; back in claude.ai the web's file in, and up to its cloud
  transfer: { q: 'q=0&sim=2&norender', init: () => {
    if (localStorage.getItem('__xfer') !== 'art') return;
    const K = '__fakecloud', load = () => JSON.parse(localStorage.getItem(K) || '{}'), save = (d) => localStorage.setItem(K, JSON.stringify(d));
    const cp = (v) => JSON.parse(JSON.stringify(v));
    const snap = (id, v) => ({ id, exists: !!v, data: () => (v ? cp(v) : undefined), metadata: { fromCache: false, hasPendingWrites: false } });
    const doc = (path) => ({ id: path.split('/').pop(), path, async get() { return snap(path.split('/').pop(), load()[path]); }, async set(v) { const d = load(); d[path] = cp(v); save(d); }, async delete() { const d = load(); delete d[path]; save(d); } });
    const db = { doc, collection: (path) => ({ path, doc: (id) => doc(path + '/' + id), async get() { const d = load(), n = path.split('/').length + 1; const docs = Object.keys(d).filter((p) => p.startsWith(path + '/') && p.split('/').length === n).sort().map((p) => snap(p.split('/').pop(), d[p])); return { docs, size: docs.length, empty: !docs.length }; } }) };
    const user = { id: async () => 'u-test', canEdit: async () => true, can: async () => true };
    const downloads = { async save(o) { window.__dl = { filename: o.filename, data: typeof o.data === 'string' ? o.data : null }; return { status: 'saved' }; } };
    window.claude = { use: async (n) => (n === 'db' ? db : n === 'user' ? user : n === 'downloads' ? downloads : null) };
  }, run: async (pg) => {
    const base = A5.base, r = {};
    const h = (id, cls, lvl, o) => Object.assign({ id, cls, level: lvl, xp: lvl * 100, gold: 100, diff: 0, skills: {}, points: lvl - 1, inv: new Array(32).fill(null), equip: {}, stash: new Array(48).fill(null), quest: 2, flags: {}, wps: ['town'], act1: -1, act2: -1, act3: -1, act4: -1, gateBest: 0, boons: [], stats: { kills: 3, deaths: 0, time: 60, legs: 0, elites: 0 }, created: 1, played: 1000 }, o);
    const as = async (mode, heroes) => {
      await pg.evaluate(([mode, heroes]) => {
        for (const k of Object.keys(localStorage)) if (k.startsWith('skotos.') || k.startsWith('__fakecloud')) localStorage.removeItem(k);
        localStorage.setItem('__xfer', mode);
        localStorage.setItem('skotos.save.v1', JSON.stringify({ heroes, settings: {}, last: heroes[0].id }));
      }, [mode, heroes]);
      await pg.goto(base + '?q=0&sim=2&norender');
      await pg.waitForFunction(() => window.__ready && window.__G?.save && window.__G.mode === 'title', null, { timeout: 240000 });
      await pg.evaluate(() => window.__D.openPanel('cloud')); await pg.waitForTimeout(300);
    };
    const msg = () => pg.evaluate(() => document.getElementById('cl-msg')?.textContent || '');
    const stored = () => pg.evaluate(() => JSON.parse(localStorage.getItem('skotos.save.v1')).heroes.map((x) => x.id + ':' + x.level).sort());
    // claude.ai: every hero out through the downloads capability
    await as('art', [h('hA', 'warden', 12), h('hB', 'mage', 20)]);
    await pg.waitForFunction(async () => (await import('/src/game/cloud.js')).CLOUD.state === 'on', null, { timeout: 60000 }).catch(() => {});
    await pg.click('[data-a="clexport"]');
    await pg.waitForFunction(() => window.__dl, null, { timeout: 20000 }).catch(() => {});
    const art = await pg.evaluate(() => window.__dl);
    const artFile = art?.data ? JSON.parse(art.data) : null;
    r.artOut = { name: art?.filename, n: artFile?.heroes?.length, k: artFile?.k, msg: await msg() };
    // the web: its own hero; out as a plain download
    await as('web', [h('hW', 'ranger', 7)]);
    const [dlw] = await Promise.all([pg.waitForEvent('download', { timeout: 20000 }).catch(() => null), pg.click('[data-a="clexport"]')]);
    let webText = null;
    if (dlw) { const fs = await import('node:fs'); webText = fs.readFileSync(await dlw.path(), 'utf8'); }
    r.webOut = { name: dlw?.suggestedFilename(), n: webText ? JSON.parse(webText).heroes.length : 0, msg: await msg() };
    // the claude.ai file in through the picker
    const [fc] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 20000 }), pg.click('[data-a="climport"]')]);
    await fc.setFiles({ name: art?.filename || 'heroes.json', mimeType: 'application/json', buffer: Buffer.from(art?.data || '') });
    await pg.waitForFunction(() => /Εισαγωγή\.|Import\./.test(document.getElementById('cl-msg')?.textContent || ''), null, { timeout: 20000 }).catch(() => {});
    r.in1 = { msg: await msg(), stored: await stored(), title: await pg.evaluate(() => window.__G.save.heroes.length), same: await pg.evaluate((t) => { const f = JSON.parse(t), d = JSON.parse(localStorage.getItem('skotos.save.v1')); return f.heroes.every((x) => JSON.stringify(d.heroes.find((y) => y.id === x.id)) === JSON.stringify(x)); }, art?.data || '{"heroes":[]}') };
    // the same file again, as pasted text: nothing to do
    await pg.click('[data-a="clpaste"]'); await pg.waitForTimeout(200);
    await pg.fill('#cl-paste', art?.data || ''); await pg.click('[data-a="clpastego"]'); await pg.waitForTimeout(300);
    r.in2 = { msg: await msg(), stored: await stored() };
    // played further here on hA, further in the file on hB
    await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem('skotos.save.v1')); d.heroes.find((x) => x.id === 'hA').level = 15; d.heroes.find((x) => x.id === 'hB').xp = 5; localStorage.setItem('skotos.save.v1', JSON.stringify(d)); });
    await pg.click('[data-a="clpaste"]'); await pg.waitForTimeout(200);
    await pg.fill('#cl-paste', art?.data || ''); await pg.click('[data-a="clpastego"]'); await pg.waitForTimeout(300);
    r.in3 = { msg: await msg(), stored: await stored(), bak: await pg.evaluate(() => JSON.parse(localStorage.getItem('skotos.cloud.bak.v1') || '[]').map((b) => b.why + ':' + b.hero.id)) };
    // not a heroes file
    await pg.click('[data-a="clpaste"]'); await pg.waitForTimeout(200);
    await pg.fill('#cl-paste', 'hello'); await pg.click('[data-a="clpastego"]'); await pg.waitForTimeout(300);
    r.bad = await msg();
    // back in claude.ai: the web's file in, then up to its cloud
    await as('art', [h('hA', 'warden', 12), h('hB', 'mage', 20)]);
    await pg.waitForFunction(async () => { const C = (await import('/src/game/cloud.js')).CLOUD; return C.state === 'on' && !C.busy; }, null, { timeout: 60000 }).catch(() => {});
    const [fc2] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 20000 }), pg.click('[data-a="climport"]')]);
    await fc2.setFiles({ name: 'web.json', mimeType: 'application/json', buffer: Buffer.from(webText || '') });
    await pg.waitForFunction(() => /Εισαγωγή\.|Import\./.test(document.getElementById('cl-msg')?.textContent || ''), null, { timeout: 20000 }).catch(() => {});
    await pg.evaluate(async () => (await import('/src/game/cloud.js')).syncNow('test'));
    r.back = { stored: await stored(), cloud: await pg.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('__fakecloud') || '{}')).map((k) => k.split('/').pop()).sort()) };
    await pg.evaluate(() => localStorage.removeItem('__xfer'));
    const checks = {
      artOut: /^skotos-heroes-\d{4}-\d\d-\d\d\.json$/.test(r.artOut.name || '') && r.artOut.n === 2 && r.artOut.k === 'skotos-heroes' && /2/.test(r.artOut.msg),
      webOut: /\.json$/.test(r.webOut.name || '') && r.webOut.n === 1,
      in1: r.in1.stored.join() === 'hA:12,hB:20,hW:7' && r.in1.title === 3 && r.in1.same && /2/.test(r.in1.msg),
      in2: r.in2.stored.join() === 'hA:12,hB:20,hW:7' && /0[^0-9]+2/.test(r.in2.msg),
      in3: r.in3.stored.join() === 'hA:15,hB:20,hW:7' && r.in3.bak.includes('imported:hA') && r.in3.bak.includes('conflict:hB'),
      bad: /Σκότους|Skotos/.test(r.bad),
      back: r.back.stored.join() === 'hA:12,hB:20,hW:7' && ['h-hA', 'h-hB', 'h-hW'].every((k) => r.back.cloud.includes(k))
    };
    return { pass: Object.values(checks).every(Boolean), checks, r };
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
      // (each read at six set moments of the shaders' clock, the mean: the rim's strength wanders with it as a flame's
      // does, so one moment, which the viewer's start decided, ranged 8 to 18)
      for (const k in items) {
        const [o, pts] = items[k];
        let sum = 0;
        for (let j = 0; j < 6; j++) {
          B.WIND.uTime.value = 10 + j * 0.83; draw(); const on = mean(pts);
          o.visible = false; B.WIND.uTime.value = 10 + j * 0.83; draw(); const off = mean(pts); o.visible = true;
          sum += diff(on, off);
        }
        out[k] = +(sum / 6).toFixed(1);
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
      // (the hero's ring is a thin flickering rim since look round 3: its mean over the six moments is 8.3-9.1, where one
      // moment read 7.8-18; its bar is set well under that mean, enough to catch the ring gone or dimmed, the others as before)
      out.pass = out.tele > 12 && out.pool > 12 && out.cradle > 6 && out.tones > 12 && out.halo > 0.75;
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
  tide: { child: async (out) => { const r = await A5.soak('tide', out, { CYCLES: process.env.CYCLES || '20' }); const t = r.tide?.res; return { pass: !!t?.pass, res: t && { cycles: t.cycles, steps: t.steps, washes: t.washes, closed: t.closed, stuck: t.stuck, snaps: t.snaps, jumps: t.jumps.length, maxJump: t.maxJump, offLane: t.offLane, wet: t.wet, verBumps: t.verBumps, laneTests: t.laneTests && { n: t.laneTests.n, inner: t.laneTests.inner, washed: t.laneTests.washed, walkedOut: t.laneTests.walkedOut } }, logs: r.tide?.logs?.slice(0, 8), error: r.error }; } },
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
    // (after a death the game holds on its panel and the bot's clock with it: stopped first, or this waited for ever)
    const bot = await pg.evaluate(() => { if (window.BOT) window.BOT.stop = true; return window.__botP; });
    await pg.waitForTimeout(1500); await shot();
    // the crawl home and the island
    await A5.until(pg, () => { const b = window.__G.zone.boss; return !b || b.settled || window.__G.hero.flags.towerDown; }, 60000);
    await pg.waitForTimeout(5000);
    const home = await pg.evaluate((sk) => { const G = window.__G, z = G.zone, b = z.boss, S = z.L.spots.skerry, m = z.map; return { towerDown: !!G.hero.flags.towerDown, at: b && +Math.hypot(b.x - S.x, b.z - S.z).toFixed(1), closed: (S.cells || []).filter(([x, zz]) => !m.walkable(x + 0.5, zz + 0.5)).length, cells: (S.cells || []).length, heroIn: (S.cells || []).some(([x, zz]) => Math.floor(G.player.x) === x && Math.floor(G.player.z) === zz), checkpoint: !!z.checkpoint, beam: window.__act5.beams().map((x) => x.tag), log: Object.fromEntries(Object.entries(window.__act5.AI_LOG).filter(([k]) => k.startsWith('tower:'))) }; });
    await shot();
    const [lo, hi] = (process.env.TTK || '60,300').split(',').map(Number);
    const ttk = bot?.t ?? null, inBand = ttk != null && ttk >= lo && ttk <= hi;
    // (the Bell read: she took one in its calm, or it never caught her, in the calm or out of the ring each time; read the
    // frame it rang)
    if (bot?.bellD) seen.bellD = bot.bellD;
    if (bot?.log && !(seen.overturned || (home.log || {})['tower:overturned'] > 0)) console.log('tower ice phase ' + JSON.stringify(bot.log));
    if (bot) delete bot.log;
    const bellIn = !seen.bellD || seen.bellD.some((d) => d <= 4.5) || (bot && !bot.bellHit);
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
        // the Black Breath, every frame (its warning is 1.2 s of play, a third of a second at this speed: looks from here
        // missed it): over the three holes she shields the first, steps away from the second and lets its lamp go out,
        // and shields the rest; each counted (per hole, B; over all, A) by what the Breath did once it landed
        const B = window.__breath ||= { shielded: 0, lost: 0, relit: 0, tele: null, it: null, shield: false }, A = window.__breathAll ||= { shielded: 0, lost: 0 };
        if (S && pl && S.tele && S.target && B.tele !== S.tele) {
          const it = S.target, ho = S.ho, m = z.map;
          B.tele = S.tele; B.it = it; B.shield = !A.shielded || A.lost > 0;
          let f = null;
          if (B.shield) { const dl = Math.hypot(it.x - ho.x, it.z - ho.z) || 1; for (const k of [0.7, 0.4, 1.1, 0.15, 1.6]) { const x = it.x + (ho.x - it.x) / dl * k, zz = it.z + (ho.z - it.z) / dl * k; if (m.walkable(x, zz)) { f = { x, z: zz }; break; } } f ||= m.nearestFloor(it.x, it.z, 1.5); }
          else f = m.nearestFloor(ho.x - (it.x - ho.x) * 0.9, ho.z - (it.z - ho.z) * 0.9, 3);
          pl.x = f.x; pl.z = f.z; pl.act = null; pl.kx = pl.kz = 0;
        } else if (B.tele && (!S || S.tele !== B.tele)) {
          if (S) { if (B.shield && B.it.lit) { B.shielded++; A.shielded++; } else if (!B.shield && !B.it.lit) { B.lost++; A.lost++; } }
          B.tele = null;
        } else if (window.__relight && S && pl && !S.tele && !pl.act) {
          // a lamp out (the Breath, the Ice Singer, a Skua) lit again at once, as the Breath is met: from the Node side
          // each took a look and a wait, game seconds at this speed with the ring stalled
          const dark = z.act5.lamps.find((l) => l.hole === S.ho.id && !l.lit);
          if (dark) { const q = z.map.nearestFloor(dark.x, dark.z + 1.2, 2); pl.x = q.x; pl.z = q.z; pl.kx = pl.kz = 0; dark.use(); B.relit++; }
        }
        requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    });
    for (const k of order) {
      const r = { k };
      // to the hole: Alkyone there before her
      r.alk = await pg.evaluate((k) => { const G = window.__G, z = G.zone, ho = z.L.spots.holes.find((h) => h.id === k), a = z.p5?.alkyone?.a; return a ? +Math.hypot(a.x - ho.alk.x, a.z - ho.alk.z).toFixed(1) : null; }, k);
      // (the page lights again any lamp of the seal that is dark, from the first: a Breath met while she lit the second or
      // third broke her touch, and a lamp left dark here stalled the ring for the whole wait below)
      const t0 = await pg.evaluate(() => { window.__relight = true; return window.__G.hero.stats.time; });
      for (let i = 0; i < 3; i++) {
        await A5.use(pg, `z.act5.lamps.find((l) => l.hole === ${k} && l.i === ${i})`); await A5.until(pg, (a) => !!window.__G.zone.act5.lamps.find((l) => l.hole === a[0] && l.i === a[1])?.lit, 15000, [k, i]);
        // the fail-safe, once: on the second hole the clock is moved on past the minute as soon as its run begins
        if (k === order[1] && i === 0) { r.forced = true; await pg.evaluate(() => { const S = window.__G.zone.seal; if (S) S.t = Math.max(S.t, 60.5); }); }
      }
      r.started = await pg.evaluate(() => !!window.__G.zone.seal);
      if (k === order[0]) await shot();
      // the run: she shields a lamp the Breath turns on (the first), lets the next go out and lights it again, kills what
      // comes, keeps the others lit
      let failsafe = false, shot1 = false;
      await pg.evaluate(() => { window.__breath = null; });
      for (const w0 = Date.now(); Date.now() - w0 < 20 * 60000;) {
        const s = await pg.evaluate((k) => {
          const G = window.__G, z = G.zone, S = z.seal, pl = G.player, B = window.__breath;
          if (!S || S.ho.id !== k) return { done: !!G.hero.flags['hole' + k] };
          // (the Breath and the relighting are the page's own, above)
          return { ring: +S.ring.toFixed(2), lost: S.lost, t: +S.t.toFixed(1), held: !!S.held, shielded: B?.shielded || 0 };
        }, k);
        if (s.done) break;
        if (s.shielded && !shot1 && k === order[0]) { shot1 = true; await shot(); }
        if (s.held) failsafe = true;
        await pg.waitForTimeout(300);
      }
      const t1 = await pg.evaluate(() => { window.__relight = false; return window.__G.hero.stats.time; });
      const { shielded, lost, relit } = await pg.evaluate(() => ({ shielded: window.__breath?.shielded || 0, lost: window.__breath?.lost || 0, relit: window.__breath?.relit || 0 }));
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
      // (and immortal again as soon as she is up: left mortal, a monster on the coast could kill her a second time, and
      // that death's panel, opening a moment later, held the game while the test waited for the Tower to wake)
      // (where she wakes is read as the fade lifts: a Sunken's hook could pull her metres in the moment after)
      await pg.evaluate(() => { window.__D.closePanel(); window.__D.emit('respawn', false); window.__immortal = true; });
      await pg.waitForFunction(() => { const ok = !window.__G.player.dead && !document.getElementById('fade').classList.contains('on'); if (ok) window.__woke = { x: window.__G.player.x, z: window.__G.player.z }; return ok; }, null, { timeout: 240000 });
      await pg.waitForTimeout(800);
    };
    const where = (k) => pg.evaluate((k) => { const G = window.__G, z = G.zone, S = z.L.spots, p = k === 'rock' ? S.npcs.rock : /^hole/.test(k) ? S.holes.find((h) => 'hole' + h.id === k)?.alk : z.act5.lights.find((l) => l.id === k), pl = window.__woke || G.player; window.__woke = null; return { zone: z.id, key: G.hero.flags.cp5?.[z.id], cp: !!z.checkpoint, d: p ? +Math.hypot(pl.x - p.x, pl.z - p.z).toFixed(1) : null }; }, k);
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
    // (installed after A5.state, which deletes every flag; enumerable, so the save keeps both: hidden from JSON, a Continue
    // lost the waking and the checkpoint, and the test passed only when the Tower woke again before its death)
    await A5.state(pg, 'mem_i3', { quest: 26, zone: 'coast', at: 'waypoint' });
    await pg.evaluate(() => { const G = window.__G, F = G.hero.flags; window.__cpLog = []; for (const k of ['towerWake', 'cp5']) { let v = F[k]; delete F[k]; Object.defineProperty(F, k, { get() { return v; }, set(x) { v = x; window.__cpLog.push([k, JSON.stringify(x), +G.hero.stats.time.toFixed(1), G.zone?.id, !!G.cine, new Error().stack.split('\n').slice(2, 5).map((l) => l.trim().replace(/\(?https?:[^)]*\/src\//, '').replace(/\?[^:]*/, '')).join(' < ')]); }, configurable: true, enumerable: true }); } });
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
  } },
  // Act VI: world
  // the save format and Act VI's fields (docs/act6-contract.md, Saves): an Act V-end hero of the shipped format (no act6,
  // no fmt, five blessings) migrates with fmt === SAVE_FMT, act6 -1, gateFound 0, quest 31 and the sea still lit; an Act
  // VI-end hero keeps its act6, quest 39, Lamplight rank and every blessing this build has (all six once BOONS[6] is in;
  // until then a sixth this build does not know is refused 'newer', never cut); a boss legendary a pre-Act VI page cut
  // comes back once, and not again (LEG_FROM.ketos, or Act V's Einar's Lantern stood in for it until combat's row is in);
  // a stored record made newer between the title and the tap is refused by startHero and not written; and with the real
  // save store over the fake artifact db, a cloud copy of a higher format is refused 'newer' and kept byte for byte while
  // this page's copy is further on and later played (no push, no pull)
  save15: { q: 'q=0&sim=2&norender&cloud=off', run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    const ev = (f, a) => pg.evaluate(f, a);
    const D = await ev(async () => { const M = await import('/src/game/data.js'); return { fmt: M.SAVE_FMT, nb: Object.keys(M.BOONS).length, b6: M.BOONS[6]?.[0]?.id || null, ketos: M.LEG_FROM.ketos || null }; });
    const now = Date.now(), flags5 = Object.fromEntries([...A5.ACT4, ...A5.flagsTo('toldChild'), 'act5'].map((k) => [k, true]));
    const base = (o) => Object.assign({ xp: 0, gold: 900, inv: new Array(32).fill(null), equip: {}, stash: new Array(48).fill(null), skills: { whirl: 5, leap: 5, cry: 5, quake: 5 }, points: 0, wps: ['town', 'forest', 'crypt', 'pass', 'halls', 'weep', 'heart', 'ashfield', 'forge', 'coast', 'farlight'], act1: 1, act2: 1, act3: 1, act4: 1, act5: 1, gateBest: 4, stats: { kills: 4000, deaths: 3, time: 80000, legs: 3, elites: 90 }, created: now, played: now, seeds: {} }, o);
    const v5 = base({ id: 'hV5', name: 'V5', cls: 'warden', level: 36, diff: 1, quest: 31, flags: { ...flags5 }, boons: ['ember', 'forge', 'amber', 'lantern', 'name'] });
    const v6 = base({ id: 'hV6', name: 'V6', cls: 'mage', level: 40, diff: 1, quest: 39, act6: 1, gateFound: 2, fmt: D.fmt, flags: { ...flags5, act6: true, ketosDown: true, keyxLamp: true, herFire: true, nameBack: true, homeGate: true }, boons: ['ember', 'forge', 'amber', 'lantern', 'name', ...(D.b6 ? [D.b6] : [])], mast: { lamp: 12, might: 3 }, mlvl: 20, skills: { fireball: 5, nova: 5 } });
    const legK = base({ id: 'hLeg', name: 'Leg', cls: 'ranger', level: 38, diff: 1, quest: 39, act6: 1, fmt: D.fmt, flags: { ...flags5, act6: true, legFrom_ketos: true }, boons: ['ember', 'forge', 'amber', 'lantern', 'name'], skills: { multi: 5 } });
    const six = base({ id: 'hSix', name: 'Six', cls: 'warden', level: 40, diff: 1, quest: 39, act6: 1, fmt: D.fmt, flags: { ...flags5, act6: true }, boons: ['ember', 'forge', 'amber', 'lantern', 'name', 'bearer6x'] });
    const put = (heroes, last) => ev(([heroes, last]) => { const s = { heroes, settings: { helpSeen: true }, last }; localStorage.clear(); localStorage.setItem('skotos.save.v1', JSON.stringify(s)); window.__G.save = JSON.parse(JSON.stringify(s)); }, [heroes, last]);
    const load = async (id, stand) => {
      await pg.goto(A5.base + '?q=0&sim=2&norender&cloud=off');
      await pg.waitForFunction(() => window.__ready && window.__G?.save, null, { timeout: 240000 });
      if (stand) await ev(async (s) => { (await import('/src/game/data.js')).LEG_FROM.ketos = s; }, stand);
      await ev((id) => window.__D.emit('startHero', window.__G.save.heroes.find((x) => x.id === id), false), id);
      await pg.waitForFunction(() => window.__G?.zone && window.__G.mode === 'play', null, { timeout: 240000 });
      await A5.tick(pg); await pg.waitForTimeout(2600);
      return ev(async (id) => {
        const G = window.__G, h = G.hero, st = JSON.parse(localStorage.getItem('skotos.save.v1')).heroes.find((x) => x.id === id), S = await import('/src/game/story.js');
        const legs = [...h.inv, ...h.stash, ...Object.values(h.equip)].filter((it) => it?.leg).map((it) => it.leg);
        return { fmt: h.fmt, act6: h.act6, act5: h.act5, gateFound: h.gateFound, quest: h.quest, q: S.questText(), seaLit: !!h.flags.seaLit, f6: !!h.flags.act6, boons: h.boons.slice(), lamp: h.mast?.lamp, legs, legBack: Object.keys(h.flags).filter((k) => k.startsWith('legBack_')), stored: st && { fmt: st.fmt, act6: st.act6, boons: st.boons, lamp: st.mast?.lamp } };
      }, id);
    };
    // ---- an Act V-end hero of the shipped format ----
    await put([v5], 'hV5');
    const a = await load('hV5');
    beat('Act V end: migrated, stamped', a.fmt === D.fmt && a.act6 === -1 && a.gateFound === 0 && a.quest === 31 && a.seaLit && !a.f6 && a.boons.join() === 'ember,forge,amber,lantern,name' && a.stored?.fmt === D.fmt && a.stored.act6 === -1 && a.q !== 'q.31', a);
    // ---- an Act VI-end hero ----
    await put([v6, six], 'hV6');
    const b = await load('hV6');
    beat('Act VI end: act6, quest 39, the Lamplight rank and every blessing this build has', b.fmt === D.fmt && b.act6 === 1 && b.f6 && b.quest === 39 && b.lamp === 12 && b.stored?.lamp === 12 && b.boons.length === 5 + (D.b6 ? 1 : 0) && b.stored.boons.length === b.boons.length, b);
    const sx = await ev(async () => { const SV = await import('/src/game/save.js'), d = JSON.parse(localStorage.getItem('skotos.save.v1')).heroes.find((x) => x.id === 'hSix'); return { fits: SV.heroFits(d), blocked: SV.heroBlocked(window.__G.save.heroes.find((x) => x.id === 'hSix')), boons: d.boons.length }; });
    beat('a sixth blessing this build does not know: refused newer, kept whole', sx.fits === 'newer' && sx.blocked === 'newer' && sx.boons === 6, sx);
    // ---- a boss legendary cut by an older page comes back once ----
    await put([legK], 'hLeg');
    const stand = D.ketos ? null : 'einarLantern', leg = D.ketos || stand;
    const c1 = await load('hLeg', stand), c2 = await load('hLeg', stand);
    beat('the Ketos\'s legendary back once, not again', c1.legs.filter((l) => l === leg).length === 1 && c1.legBack.includes('legBack_ketos') && c2.legs.filter((l) => l === leg).length === 1, { stand, c1: { legs: c1.legs, back: c1.legBack }, c2: c2.legs });
    // ---- a record made newer between the title and the tap ----
    await put([v5], 'hV5');
    await pg.goto(A5.base + '?q=0&sim=2&norender&cloud=off');
    await pg.waitForFunction(() => window.__ready && window.__G?.save && window.__G.mode === 'title', null, { timeout: 240000 });
    const nw = await ev(async (fmt) => {
      // (as a newer tab writes it: found by its id, the page before this one may have put its own hero back on leaving)
      const disk = JSON.parse(localStorage.getItem('skotos.save.v1')), rec = disk.heroes.find((x) => x.id === 'hV5'); rec.fmt = fmt + 1; rec.gold = 4242;
      const text = JSON.stringify(rec); localStorage.setItem('skotos.save.v1', JSON.stringify(disk));
      const toasts = []; (await import('/src/ui/bus.js')).on('toast', (t) => toasts.push(t));
      window.__D.emit('startHero', window.__G.save.heroes.find((x) => x.id === 'hV5'), false);
      await new Promise((r) => setTimeout(r, 2500));
      const after = JSON.stringify(JSON.parse(localStorage.getItem('skotos.save.v1')).heroes.find((x) => x.id === 'hV5'));
      return { mode: window.__G.mode, hero: !!window.__G.hero, same: after === text, toast: toasts.includes(window.__D.t('menu.newer')) };
    }, D.fmt);
    beat('made newer meanwhile: not taken up, not written', nw.mode === 'title' && !nw.hero && nw.same && nw.toast, nw);
    // ---- the cloud: a copy of a higher format is never written over ----
    await put([base({ id: 'hC', name: 'C', cls: 'warden', level: 30, diff: 1, quest: 31, flags: { ...flags5 }, fmt: D.fmt, boons: ['ember'] })], null);
    await pg.goto(A5.base + '?q=0&sim=2&norender&cloud=off');
    await pg.waitForFunction(() => window.__ready && window.__G?.save && window.__G.mode === 'title', null, { timeout: 240000 });
    const cl = await ev(async (fmt) => {
      const { syncAll } = await import('/src/game/cloudsync.js'), { artifactBackend } = await import('/src/net/cloudart.js'), F = await import('/tools/cloud/fakes.mjs'), SV = await import('/src/game/save.js');
      const store = { heroes: SV.storedHeroes, current: SV.playingId, put: SV.putStored, drop: SV.dropStored, meta: SV.cloudMeta, setMeta: SV.setCloudMeta, backup: SV.backupHero, check: SV.heroFits };
      const A = F.artifactDb(), B = await artifactBackend(A.claude('u1')), other = F.device(); other.B = await artifactBackend(A.claude('u1'));
      const r0 = await syncAll(B, store); await syncAll(other.B, other.store);
      other.play('hC', (h) => { h.fmt = fmt + 1; h.act6 = -1; h.gold = 7; }, Date.now() - 60000); await syncAll(other.B, other.store);
      const text = A.docs.get('data/users/u1/h-hC').data;
      const disk = JSON.parse(localStorage.getItem('skotos.save.v1')), h = disk.heroes.find((x) => x.id === 'hC'); h.level = 36; h.xp = 50; h.stats.kills += 900; h.played = Date.now();
      localStorage.setItem('skotos.save.v1', JSON.stringify(disk));
      const r = await syncAll(B, store);
      return { r0: r0.pushed, pushed: r.pushed, pulled: r.pulled, errors: r.errors, same: A.docs.get('data/users/u1/h-hC').data === text, local: SV.storedHeroes().find((x) => x.id === 'hC')?.level };
    }, D.fmt);
    beat('a cloud copy of a higher format: refused newer, kept byte for byte, this further copy kept here', cl.r0.includes('hC') && !cl.pushed.length && !cl.pulled.length && cl.errors.some((e) => e.id === 'hC' && e.code === 'newer') && cl.same && cl.local === 36, cl);
    return { pass: beats.every((x) => x.ok), D, failed: beats.filter((x) => !x.ok).map((x) => x.b), beats };
  } },
  // the way down and home (docs/act6-contract.md, Exits and Waypoints): ?auto=drained and ?auto=bottom load (light 'under',
  // z.cold and z.water, no ice); the rope hole on the Light's Skerry once Tamarisk has told of it (tam6), pushed once, on a
  // walkable cell clear of the door-stone and Selna's pad, shut until the coal (coal6: d.ropeShut); down to the rope's foot
  // and back up to the hole; the Well only in the drained reading (ketosDown: the zone built again), down to the Well's
  // Foot; the Gate ring shut until her fire (d.gateDark), then home within 3 m of Isarn's staff; both waypoints found and
  // listed with their places' names; the seeds one per difficulty
  way6: { q: 'auto=town&q=0&sim=2&norender&lvl=36&cloud=off', run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    const ev = (f, a) => pg.evaluate(f, a);
    const zoneOf = () => ev(async () => { const z = window.__G.zone, Lt = await import('/src/game/light.js'); return { id: z.id, mode: z.mode, cold: !!z.cold, water: !!z.water, act6: !!z.act6, ice: !!z.L.ice || !!z.lvl.ice, light: Lt.lightKind(), exits: z.L.exits.map((e) => e.to + (e.locked ? ':' + e.locked : '')) }; });
    for (const id of ['drained', 'bottom']) {
      await pg.goto(A5.base + '?auto=' + id + '&q=0&sim=2&norender&cloud=off');
      await pg.waitForFunction(() => window.__ready && window.__G?.player && window.__G.mode === 'play', null, { timeout: 240000 });
      await A5.tick(pg); await pg.waitForTimeout(800);
      const s = await zoneOf();
      beat('?auto=' + id + ' loads', s.id === id && s.cold && s.water && s.act6 && !s.ice && s.light === 'under', s);
    }
    await pg.goto(A5.base + '?' + 'auto=town&q=0&sim=2&norender&lvl=36&cloud=off');
    await pg.waitForFunction(() => window.__ready && window.__G?.player && window.__G.mode === 'play', null, { timeout: 240000 });
    await A5.tick(pg); await A4.listen(pg);
    await ev(() => { window.__immortal = true; const h = window.__G.hero, F = h.flags; for (const k of ['act1', 'act2', 'act3', 'act4', 'act5', 'fireTaken', 'crownUnmade', 'newFire', 'hearth', 'frozen', 'farSeen', 'hole0', 'hole1', 'hole2', 'skotosWake', 'skotosDown', 'selnaBack', 'seaLit', 'mem_i4', 'carved']) F[k] = true; h.act5 = h.diff; h.quest = 31; });
    const flag = (k) => ev((k) => { window.__G.hero.flags[k] = true; }, k);
    const exitIt = (to) => `z.interact.find((i) => i.kind === 'exit' && i.to === '${to}')`;
    const useExit = async (to, arrive) => {
      await ev((to) => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'exit' && i.to === to); const f = z.map.nearestFloor(it.x, it.z + 1.2, 3); G.player.x = f.x; G.player.z = f.z; window.__says.length = 0; it.use(); }, to);
      if (arrive) await pg.waitForFunction((id) => window.__G.zone?.id === id && !document.getElementById('fade').classList.contains('on'), arrive, { timeout: 240000 });
      await pg.waitForTimeout(500);
    };
    const near = (to, r) => ev(([to, r]) => { const G = window.__G, z = G.zone, e = z.L.exits.find((x) => x.to === to); return !!e && Math.hypot(G.player.x - e.x, G.player.z - e.z) <= r; }, [to, r]);
    // ---- the Light's Skerry ----
    await A5.travel(pg, 'farlight', 'waypoint');
    beat('no rope hole before tam6', await ev((q) => { const z = window.__G.zone; return !z.L.exits.some((e) => e.to === 'drained') && !new Function('z', 'return ' + q)(z); }, exitIt('drained')));
    await flag('tam6');
    await A5.travel(pg, 'farlight', 'waypoint'); await A5.travel(pg, 'farlight', 'waypoint');
    const hole = await ev(() => { const z = window.__G.zone, S = z.L.spots, e = z.L.exits.find((x) => x.to === 'drained'), d = S.farLight.door; return e && { n: z.L.exits.filter((x) => x.to === 'drained').length, it: z.interact.filter((i) => i.kind === 'exit' && i.to === 'drained').length, locked: e.locked, door: +Math.hypot(e.x - d.x - 1.2, e.z - d.z + 0.6).toFixed(2), pad: +Math.hypot(e.x - S.selnaPad.x, e.z - S.selnaPad.z).toFixed(2), core: +Math.hypot(e.x - S.core.x, e.z - S.core.z).toFixed(2), walk: z.map.walkable(e.x, e.z) }; });
    beat('the rope hole: once, on the core, clear of the door-stone and the pad', hole && hole.n === 1 && hole.it === 1 && hole.locked === 'coal6' && hole.door >= 2.5 && hole.pad >= 3 && hole.core <= 6.5 && hole.walk, hole);
    await useExit('drained');
    beat('shut until the coal: d.ropeShut', await ev(() => window.__G.zone.id === 'farlight' && window.__says.includes('d.ropeShut')));
    await flag('coal6');
    await useExit('drained', 'drained');
    const d1 = await zoneOf();
    beat('down the rope: the rope\'s foot, the Mere unbroken (no Well)', d1.mode === 'mere' && !d1.exits.some((e) => e.startsWith('bottom')) && await near('farlight', 4) && await ev(() => (window.__G.zone.voices || []).some((v) => v.key === 'd.wellShut')), d1);
    await useExit('farlight', 'farlight');
    beat('up the rope: at the hole', await near('drained', 4));
    // ---- the Drained Sea once the Ketos is down: the Well ----
    await flag('ketosDown');
    await A5.travel(pg, 'drained', 'waypoint');
    const d2 = await zoneOf();
    beat('the Ketos down: built again dry, the Well open', d2.mode === 'dry' && d2.exits.includes('bottom:ketosDown'), d2);
    await useExit('bottom', 'bottom');
    beat('down the Well: the Well\'s Foot', await near('drained', 4));
    await useExit('town');
    beat('the Gate ring shut until her fire: d.gateDark', await ev(() => window.__G.zone.id === 'bottom' && window.__says.includes('d.gateDark')));
    await flag('herFire');
    await A5.travel(pg, 'bottom', 'waypoint');
    beat('her fire: the Bottom built again lit', (await zoneOf()).mode === 'lit');
    await useExit('town', 'town');
    const home = await ev(() => { const G = window.__G, s = G.zone.L.spots.npcs.wayfarer; return +Math.hypot(G.player.x - s.x, G.player.z - s.z).toFixed(2); });
    beat('home beside Isarn\'s staff (within 3 m)', home <= 3, home);
    // ---- waypoints and seeds ----
    const wp = await ev(async () => { const G = window.__G, h = G.hero; window.__D.openPanel('waypoints'); await new Promise((r) => setTimeout(r, 400)); const html = document.getElementById('panel').innerHTML; window.__D.closePanel(); return { wps: h.wps.slice(), rope: html.includes(window.__D.t('wp.drained')), foot: html.includes(window.__D.t('wp.bottom')), seeds: Object.keys(h.seeds || {}), diff: h.diff }; });
    beat('both waypoints found and listed by their places', wp.wps.includes('drained') && wp.wps.includes('bottom') && wp.rope && wp.foot, wp);
    beat('the seeds one per difficulty', wp.seeds.includes('drained@' + wp.diff) && wp.seeds.includes('bottom@' + wp.diff) && !wp.seeds.includes('drained') && !wp.seeds.includes('bottom'), wp.seeds);
    await pg.evaluate(() => window.__D.emit('travel', 'bottom', { at: 'waypoint' }));
    await pg.waitForFunction(() => window.__G.zone?.id === 'bottom' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 240000 });
    beat('by the waypoint to the Well\'s Foot', true);
    return { pass: beats.every((x) => x.ok), failed: beats.filter((x) => !x.ok).map((x) => x.b), beats };
  } },
  // gen6's ground in the game (docs/act6-contract.md, The level object L): each zone in each reading built from its real
  // layout with no ice mesh, gen6's own faults empty on the zone's L, the hero walking (keys, collision and all) the
  // critical path from the camp: the Drained Sea's three hearths, the Heap's north gap and its three wreck lanterns, and in
  // the dry reading down the Well; the Bottom's barrow door, the ember's pane, the three black lamps, Leif's fire and the
  // glade, the Stair's head (its foot out of reach behind the walls), and once her fire burns the Stair's foot, the Hearth's
  // stones and the Gate ring home; a pack of a tag combat's PACKS does not hold yet spawning the Sunken, never goblins
  ground6: { q: 'auto=drained&q=0&sim=2&norender&lvl=36&cloud=off', run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    const ev = (f, a) => pg.evaluate(f, a);
    const ready = (id) => pg.waitForFunction((id) => window.__ready && window.__G?.player && window.__G.mode === 'play' && window.__G.zone?.id === id && !document.getElementById('fade').classList.contains('on'), id, { timeout: 240000 });
    await ready('drained'); await A5.tick(pg);
    // (SEED6B=<n>: the Bottom built from that seed, to run a failure again)
    if (process.env.SEED6B) await ev((s) => { const h = window.__G.hero; (h.seeds ||= {})['bottom@' + (h.diff || 0)] = s; }, +process.env.SEED6B);
    await ev(() => {
      window.__immortal = true;
      // (the walk: a 4-neighbour way over the zone's own map, steered with the movement keys toward a point a few cells on)
      window.__walk6 = async (tx, tz, maxT = 120) => {
        const G = window.__G, z = G.zone, m = z.map, { IN } = await import('/src/core/input.js'), w = m.w;
        for (const p of z.packs) p.spawned = true;
        // (and the foes already standing: an Act V or VI pack that lies in wait is made with the zone, and one woken on
        // the way would hold her in its arms, which is no fault of the ground)
        for (const a of z.actors) if (a.team === 'foe' && !a.prop && !a.dead) { a.hp = 0; a.dead = true; a.remove?.(); }
        const t0 = m.nearestFloor(tx, tz, 3), goal = Math.floor(t0.z) * w + Math.floor(t0.x), pl0 = G.player;
        const from = Math.floor(pl0.z) * w + Math.floor(pl0.x), par = new Int32Array(w * m.h).fill(-1), q = [from]; par[from] = from;
        for (let hd = 0; hd < q.length && par[goal] < 0; hd++) { const i = q[hd], x = i % w, zz = (i - x) / w; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Z = zz + dz, n = Z * w + X; if (X >= 0 && Z >= 0 && X < w && Z < m.h && m.cells[n] && par[n] < 0) { par[n] = i; q.push(n); } } }
        if (par[goal] < 0) return { ok: false, why: 'noWay' };
        const path = []; for (let i = goal; i !== from; i = par[i]) path.push({ x: i % w + 0.5, z: Math.floor(i / w) + 0.5 }); path.reverse();
        const dist = path.length;
        return await new Promise((res) => {
          let k = 0, gt = 0, best = -1, still = 0, last = performance.now();
          const keys = (x, zz) => { for (const c of ['w', 'a', 's', 'd']) IN.keys.delete(c); if (zz < -0.3) IN.keys.add('w'); if (zz > 0.3) IN.keys.add('s'); if (x < -0.3) IN.keys.add('a'); if (x > 0.3) IN.keys.add('d'); };
          const step = () => {
            // (the player as it is now: the zone's arrival may make her again)
            const pl = window.__G.player, now = performance.now(); gt += (now - last) / 1000 * 2; last = now;
            // (cell by cell, the nearest of the next few once she is within 0.45 m of it: round corners, never into them)
            let j = k; for (let q = k; q < Math.min(path.length, k + 8); q++) if (Math.hypot(path[q].x - pl.x, path[q].z - pl.z) < Math.hypot(path[j].x - pl.x, path[j].z - pl.z)) j = q;
            k = Math.hypot(path[j].x - pl.x, path[j].z - pl.z) < 0.45 ? Math.min(path.length - 1, j + 1) : j;
            const tgt = path[k], dx = tgt.x - pl.x, dz = tgt.z - pl.z, l = Math.hypot(dx, dz) || 1;
            const left = Math.hypot(t0.x - pl.x, t0.z - pl.z);
            if (k > best) { best = k; still = 0; } else still += 1;
            if (left < 1.2 || still > 300 || gt > maxT) { keys(0, 0); res({ ok: left < 1.2, left: +left.toFixed(2), cells: dist, k, stuck: still > 300, at: { x: +pl.x.toFixed(1), z: +pl.z.toFixed(1) } }); return; }
            keys(dx / l, dz / l); requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      };
    });
    const faults = () => ev(async () => { const z = window.__G.zone, g = await import('/src/world/gen6.js'); return { mode: z.mode, seed: z.seed, f: (z.id === 'drained' ? g.drainedFaults : g.bottomFaults)(z.L), ice: !!z.lvl.ice || !!z.L.ice, kids: z.lvl.group.children.length, props: z.L.props.length, packs: z.L.packs.length }; });
    const walk = (p, t) => ev(([p, t]) => window.__walk6(p.x, p.z, t), [p, t]);
    const spots = () => ev(() => { const S = window.__G.zone.L.spots; return JSON.parse(JSON.stringify({ hearths: S.hearths, gap: S.heap?.gap, lamps5: S.wreckLamps, well: S.well, mere: S.npcs?.mere, door: window.__G.zone.L.stamps?.[0]?.door, ember: S.ember, lamps: S.lamps, leif: S.leif?.fire, glade: S.glade, keyx: S.keyx, foot: S.stair?.foot, stones: S.hearth?.stones, ring: S.hearth?.ring })); });
    const go = async (name, p, t = 120) => { const r = await walk(p, t); beat('walk: ' + name, r.ok, r); return r.ok; };
    // ---- the Drained Sea, before the Ketos ----
    let f = await faults();
    beat('drained (mere): built, no ice mesh, gen6 holds on the zone\'s own L', f.mode === 'mere' && !f.ice && !f.f.length && f.kids > 3 && f.packs >= 10, f);
    let S = await spots();
    for (const hh of S.hearths) await go('hearth ' + hh.k, { x: hh.x, z: hh.z + 1.5 });
    await go('the Heap\'s north gap', S.gap);
    for (const l of S.lamps5) await go('wreck lantern ' + l.i, l);
    await go('Glaukos\'s place by the Mere', S.mere);
    // ---- the stand-in packs: an Act VI tag combat has not written yet spawns the Sunken ----
    const pk = await ev(async () => {
      const G = window.__G, z = G.zone, p = z.packs.find((q) => q.tag === 'heapLice' || q.tag === 'shoreFaded'); if (!p) return null;
      p.spawned = false; const n0 = z.actors.length; G.player.x = p.x; G.player.z = p.z + 1;
      await new Promise((r) => setTimeout(r, 1200));
      const got = z.actors.slice(n0).filter((a) => a.team === 'foe' && !a.prop).map((a) => a.kind);
      for (const a of z.actors.slice(n0)) if (!a.prop) { a.hp = 0; a.dead = true; a.remove?.(); }
      return { tag: p.tag, got };
    });
    beat('an unwritten Act VI pack spawns the Sunken, not goblins', pk && pk.got.length > 0 && pk.got.every((k) => k === 'sunken' || k === 'harpooner'), pk);
    // ---- the Drained Sea dry: down the Well ----
    await ev(() => { window.__G.hero.flags.ketosDown = true; window.__D.emit('travel', 'drained', { at: 'waypoint' }); });
    await pg.waitForTimeout(600); await ready('drained');
    f = await faults();
    beat('drained (dry): built again, the Well open, gen6 holds', f.mode === 'dry' && !f.f.length && !f.ice, f);
    S = await spots();
    if (await go('the Well\'s mouth', { x: S.well.x, z: S.well.z - 2.6 }, 160)) {
      await ev(() => { const z = window.__G.zone, it = z.interact.find((i) => i.kind === 'exit' && i.to === 'bottom'); it.use(); });
      await ready('bottom');
      beat('down the Well to the Bottom', true);
    } else await ev(() => window.__D.emit('travel', 'bottom', { at: 'start' }));
    await ready('bottom');
    // ---- the Bottom, dark ----
    f = await faults();
    beat('bottom (dark): built, no ice mesh, gen6 holds', f.mode === 'dark' && !f.ice && !f.f.length && f.kids > 3, f);
    S = await spots();
    await go('the barrow\'s door', S.door);
    await go('the ember\'s pane', S.ember.pane);
    for (const l of S.lamps) await go('black lamp ' + l.k + ' (' + l.place + ')', l, 160);
    await go('Leif\'s fire', S.leif);
    await go('the glade', S.glade);
    const shut = await walk(S.foot, 30);
    beat('the Stair\'s foot out of reach behind its walls', !shut.ok && shut.why === 'noWay', shut);
    // ---- the Bottom once her fire burns: the Stair, the Hearth, the ring home ----
    await ev(() => { const F = window.__G.hero.flags; F.blackLamp0 = F.blackLamp1 = F.blackLamp2 = true; F.herFire = true; window.__D.emit('travel', 'bottom', { at: 'waypoint' }); });
    await pg.waitForTimeout(600); await ready('bottom');
    f = await faults();
    beat('bottom (lit): built again, gen6 holds', f.mode === 'lit' && !f.f.length, f);
    S = await spots();
    await go('the Stair\'s foot', S.foot, 200);
    for (const st of S.stones) await go('hearthstone ' + st.i, st);
    if (await go('the Gate ring', { x: S.ring.x, z: S.ring.z - 1.5 })) {
      await ev(() => { const z = window.__G.zone, it = z.interact.find((i) => i.kind === 'exit' && i.to === 'town'); it.use(); });
      await ready('town');
      beat('through the ring home', true);
    }
    return { pass: beats.every((x) => x.ok), failed: beats.filter((x) => !x.ok).map((x) => x.b), beats };
  } },
  // the six peaks (docs/act6-contract.md, FAR_BEACONS): FAR_BEACONS 7-12 on the northern skyline, seed and orange, dark
  // in Whitecliff until Act VI is done (h.act6 >= 0), then lit on that entry and every one after (a Continue too), each a
  // sprite and its flames with no light of its own (no L.lights entry, no live source); put out and lit again without
  // touching the town's other lights; the hilltop far fires unchanged; the Saltborn's three lights hold their flash from
  // the call below the ice until her fire burns, and flash again after; from the home cine's camera over the beacon hill
  // no peak's core overlaps another far fire's (a shot for the eye)
  peaks6: { q: 'auto=town&q=0&sim=2&norender&lvl=36&cloud=off', run: async (pg, shot) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    const ev = (f, a) => pg.evaluate(f, a);
    await A5.tick(pg);
    const PEAKS = [7, 8, 9, 10, 11, 12];
    const fires = () => ev(async () => {
      const G = window.__G, z = G.zone, W = await import('/src/game/world.js'), { R } = await import('/src/gfx/gfx.js'), T = z.town || { far: [] };
      const far = W.FAR_BEACONS.map((F0, i) => { const f = T.far[i]; return f ? { i, light: !!f.light, inL: !!f.light && z.L.lights.includes(f.light), shown: f.spr.parent === R.scene, extra: z.extra.includes(f.spr), em: z.emit4.includes(f.em), flash: f.spr.userData.flash, col: f.spr.material.color.getHex() } : null; });
      const rows = W.FAR_BEACONS.map((F0) => ({ peak: !!F0.peak, seed: !!F0.seed, col: F0.color ?? null }));
      return { far, rows, keys: z.L.lights.filter((l) => /^far\d+$/.test(l.key || '')).map((l) => l.key).sort(), live: [...R.sources].filter((s) => /^far\d+$/.test(s.key || '')).map((s) => s.key).sort(), nL: z.L.lights.length, nX: z.extra.length, nE: z.emit4.length, hills: z.L.farFires.length };
    });
    const fireTown = (o) => ev(async (o) => { const G = window.__G, h = G.hero, W = await import('/src/game/world.js'); Object.assign(h.flags, o.flags || {}); if (o.act6 != null) h.act6 = o.act6; W.townFires(G.zone); }, o);
    // ---- Act V's end: the sea lit, the peaks dark ----
    const flags5 = Object.fromEntries([...A5.ACT4, ...A5.flagsTo('toldChild'), 'act5'].map((k) => [k, true]));
    await ev((f) => { window.__immortal = true; const h = window.__G.hero; Object.assign(h.flags, f); h.act1 = h.act2 = h.act3 = h.act4 = h.act5 = h.diff; h.act6 = -1; h.quest = 31; }, flags5);
    await fireTown({});
    let s = await fires();
    const row = s.rows;
    beat('FAR_BEACONS 7-12: thirteen rows, the six peaks seed and orange', s.rows.length === 13 && PEAKS.every((i) => row[i].peak && row[i].seed && row[i].col === null) && row.slice(0, 7).every((r) => !r.peak) && s.hills === 3, row.slice(7));
    beat('Act V\'s end: the seven fires lit, each with its light; the peaks dark', [0, 1, 2, 3, 4, 5, 6].every((i) => s.far[i]?.inL && s.far[i].shown) && PEAKS.every((i) => !s.far[i]) && s.keys.length === 7 && s.live.length === 7, { keys: s.keys, live: s.live });
    // ---- the call below the ice: the sea-lights hold their flash; her fire: they flash again ----
    await fireTown({ flags: { call6: true } });
    s = await fires();
    beat('the call: the Saltborn\'s lights held (flash 0), the fourth fire as it was', [4, 5, 6].every((i) => s.far[i]?.flash === 0) && s.far[3]?.flash === 0 && PEAKS.every((i) => !s.far[i]), [3, 4, 5, 6].map((i) => s.far[i]?.flash));
    await fireTown({ flags: { coal6: true, ketosDown: true, herFire: true, nameBack: true } });
    s = await fires();
    beat('her fire: they flash again in their 12 s beat', [4, 5, 6].every((i) => s.far[i]?.flash === 12), [4, 5, 6].map((i) => s.far[i]?.flash));
    const base = s;
    // ---- the act done: the six peaks catch ----
    await fireTown({ flags: { homeGate: true, act6: true }, act6: 1 });
    s = await fires();
    const pk = PEAKS.map((i) => s.far[i]);
    beat('Act VI done: the six peaks lit, sprite and flames, orange, no light of their own', pk.every((f) => f && !f.light && !f.inL && f.shown && f.extra && f.em && f.flash === 0 && f.col === 0xffa040) && s.keys.join() === base.keys.join() && s.live.join() === base.live.join() && s.nL === base.nL && s.nX === base.nX + 6 && s.nE === base.nE + 6, { pk, keys: s.keys, nL: [base.nL, s.nL], nX: [base.nX, s.nX], nE: [base.nE, s.nE] });
    // ---- one put out and lit again: the town's other lights untouched ----
    const cyc = await ev(async () => {
      const G = window.__G, z = G.zone, W = await import('/src/game/world.js'), { R } = await import('/src/gfx/gfx.js');
      const snap = () => ({ L: z.L.lights.slice(), n: R.sources.size, x: z.extra.length, e: z.emit4.length });
      const a = snap(); W.setFar(z, 9, false); const b = snap(); W.setFar(z, 9, true); const c = snap();
      const same = (u, v) => u.length === v.length && u.every((l, i) => l === v[i]);
      return { offL: same(a.L, b.L), onL: same(a.L, c.L), src: [a.n, b.n, c.n], x: [a.x, b.x, c.x], e: [a.e, b.e, c.e] };
    });
    beat('a peak put out and lit again: L.lights and the live sources untouched', cyc.offL && cyc.onL && cyc.src[0] === cyc.src[1] && cyc.src[1] === cyc.src[2] && cyc.x[1] === cyc.x[0] - 1 && cyc.x[2] === cyc.x[0] && cyc.e[1] === cyc.e[0] - 1 && cyc.e[2] === cyc.e[0], cyc);
    // ---- from the home cine's camera over the beacon hill: no peak's core on another far fire's ----
    const view = await ev(async () => {
      const G = window.__G, z = G.zone, b = z.L.beacon, W = await import('/src/game/world.js'), { R } = await import('/src/gfx/gfx.js');
      window.__D.emit('cine', { x: b.x, z: b.z - 16, dur: 60, zoom: 1.5, pitch: 0.28, steps: [] });
      await new Promise((r) => setTimeout(r, 4000));
      const c = R.camera; c.updateMatrixWorld(); const p = c.position, V = p.constructor;
      // (a far fire's core: where its glow is over half its brightness, 0.4 of the sprite's half-size, at the breath's top)
      const list = W.FAR_BEACONS.map((F0, i) => { if (!z.town.far[i]) return null; const q = new V(b.x + F0.dx, F0.y, b.z + F0.dz), d = q.clone().sub(p), dist = d.length(), sc = q.clone().project(c); return { i, peak: !!F0.peak, u: d.normalize(), dist: +dist.toFixed(1), ang: Math.atan((0.4 * 3.5 * 1.13) / dist), on: Math.abs(sc.x) <= 1 && Math.abs(sc.y) <= 1 && sc.z < 1, s: [+sc.x.toFixed(2), +sc.y.toFixed(2)] }; }).filter(Boolean);
      const pairs = [];
      for (let a = 0; a < list.length; a++) for (let k = a + 1; k < list.length; k++) { const A = list[a], B = list[k], sep = Math.acos(Math.min(1, A.u.dot(B.u))); pairs.push({ a: A.i, b: B.i, peak: A.peak || B.peak, r: +(sep / (A.ang + B.ang)).toFixed(2), deg: +(sep * 57.3).toFixed(1) }); }
      pairs.sort((u, v) => u.r - v.r);
      return { cam: { x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1) }, inView: list.filter((l) => l.on).map((l) => l.i), dist: list.map((l) => [l.i, l.dist]), screen: list.map((l) => [l.i, ...l.s]), closestPeak: pairs.filter((q) => q.peak).slice(0, 4), closestOld: pairs.filter((q) => !q.peak).slice(0, 2) };
    });
    await shot();
    await ev(() => { const c = window.__G.cine; if (c) c.t = c.dur; });
    beat('from the beacon hill: no peak\'s core overlaps another far fire\'s', view.closestPeak.length && view.closestPeak[0].r >= 1, view);
    // ---- a Continue: lit again on the first entry ----
    await A5.reload(pg, { q: 'q=0&sim=2&norender&cloud=off' });
    s = await fires();
    beat('a Continue: the six peaks lit on entry, still no light of their own', s.rows.length === 13 && PEAKS.every((i) => s.far[i] && !s.far[i].light && s.far[i].shown) && s.keys.length === 7 && s.live.length === 7 && [4, 5, 6].every((i) => s.far[i]?.flash === 12), { keys: s.keys, live: s.live, peaks: PEAKS.map((i) => !!s.far[i]) });
    return { pass: beats.every((x) => x.ok), failed: beats.filter((x) => !x.ok).map((x) => x.b), beats };
  } },
  // the places to wake and the way home (docs/act6-contract.md, Checkpoints, Waypoints, Exits): each zone's waypoint found
  // on the first arrival (the Rope down the rope, the Well's Foot down the Well) and kept in the save; the camp the place
  // to wake from that arrival (flags.cp6[zone], saved); every key of checkpoint6 refused until what it names holds, then
  // waking beside its spot on a walkable cell and kept in flags.cp6; a Continue builds the zone again and wakes there, and
  // so does a death; a key that no longer holds (the Heap's gap once the Ketos is down, the Stair's foot once the Shade is)
  // gives way to the camp on the next entry; the Gate ring one way: home by Isarn's staff, no way down from Whitecliff, an
  // arrival from the town (or the Bottom's waypoint) never at the ring
  wake6: { q: 'auto=town&q=0&sim=2&norender&lvl=36&cloud=off', run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    const ev = (f, a) => pg.evaluate(f, a);
    const Q = 'q=0&sim=2&norender&cloud=off';
    await A5.tick(pg);
    const listen = () => ev(async () => { window.__toasts = []; (await import('/src/ui/bus.js')).on('toast', (t) => window.__toasts.push(t)); });
    await listen();
    const flags5 = Object.fromEntries([...A5.ACT4, ...A5.flagsTo('toldChild'), 'act5', 'call6', 'tam6', 'coal6'].map((k) => [k, true]));
    await ev((f) => { window.__immortal = true; const h = window.__G.hero; Object.assign(h.flags, f); h.act1 = h.act2 = h.act3 = h.act4 = h.act5 = h.diff; h.act6 = -1; h.quest = 31; h.wps = h.wps.filter((w) => w !== 'drained' && w !== 'bottom'); }, flags5);
    // (where each key wakes her, against its spot: the camp's centre +2 m, a hearth's, a lantern's or a lost light's +2 m,
    // the Heap's gap and the Stair's foot as they are)
    const here = () => ev(() => { const G = window.__G, z = G.zone, h = G.hero, st = JSON.parse(localStorage.getItem('skotos.save.v1')).heroes.find((x) => x.id === h.id), c = z.checkpoint, S = z.L.spots; return { id: z.id, mode: z.mode, wps: h.wps.slice(), sWps: st?.wps || [], cp6: { ...(h.flags.cp6 || {}) }, sCp6: { ...(st?.flags?.cp6 || {}) }, found: window.__toasts.filter((t) => t === window.__D.t('hud.discovered')).length, cpCamp: c ? +Math.hypot(c.x - S.camp.x, c.z - S.camp.z - 2).toFixed(2) : null }; });
    const keys = (list) => ev(async (list) => {
      const G = window.__G, z = G.zone, F = G.hero.flags, S = z.L.spots, W = await import('/src/game/world.js'), out = [];
      const LOST = ['galini', 'twins', 'kranea', 'psamathe'];
      const spot = (key) => { const k = /^(hearth|wreck|lost)(\d)$/.exec(key); if (key === 'camp' || key === 'well') return { x: S.camp.x, z: S.camp.z + 2 }; if (key === 'heap') return S.heap?.gap; if (key === 'stair') return S.stair?.foot; const p = k[1] === 'hearth' ? S.hearths?.find((h) => h.k === +k[2]) : k[1] === 'wreck' ? S.wreckLamps?.find((l) => l.i === +k[2]) : S.lost?.find((l) => l.id === LOST[+k[2]])?.lamp; return p && { x: p.x, z: p.z + 2 }; };
      for (const [key, on, off] of list) {
        for (const f of Object.keys(on)) delete F[f];
        Object.assign(F, off || {});
        const before = F.cp6?.[z.id], no = W.checkpoint6(z, key);
        const refused = !no && F.cp6?.[z.id] === before;
        Object.assign(F, on);
        const ok = W.checkpoint6(z, key), c = z.checkpoint, p = spot(key);
        out.push({ key, refused, ok, saved: F.cp6?.[z.id] === key, d: c && p ? +Math.hypot(c.x - p.x, c.z - p.z).toFixed(2) : null, walk: !!c && z.map.walkable(c.x, c.z) });
      }
      return out;
    }, list);
    const good = (r, always) => r.ok && r.saved && r.walk && r.d != null && r.d <= 4 && (always || r.refused);
    // ---- the Drained Sea, first arrival down the rope ----
    await A5.travel(pg, 'drained', 'farlight');
    let h = await here();
    beat('drained: the Rope found on the first arrival, saved', h.id === 'drained' && h.wps.includes('drained') && h.sWps.includes('drained') && h.found === 1, h);
    beat('drained: the camp the place to wake from the first arrival, saved', h.cp6.drained === 'camp' && h.sCp6.drained === 'camp' && h.cpCamp <= 4, h);
    const kd = await keys([['camp', {}], ['hearth1', { hearth6_1: true }], ['hearth2', { hearth6_2: true }], ['hearth3', { hearth6_3: true }], ['wreck0', { wreck6: [0] }], ['wreck1', { wreck6: [0, 1] }], ['wreck2', { wreck6: [0, 1, 2] }],
      ['lost0', { lost0: true }], ['lost1', { lost1: true }], ['lost2', { lost2: true }], ['lost3', { lost3: true }], ['heap', { ketosWake: true }, { ketosDown: false }]]);
    beat('drained: every key refused until it holds, then beside its spot, kept in flags.cp6', kd.every((r) => good(r, r.key === 'camp')), kd);
    const nd = await keys([['well', {}], ['stair', { blackLamp0: true, blackLamp1: true, blackLamp2: true }]]);
    beat('drained: the Bottom\'s keys never wake her here', nd.every((r) => !r.ok), nd);
    await ev(() => { const F = window.__G.hero.flags; for (const k of ['blackLamp0', 'blackLamp1', 'blackLamp2']) delete F[k]; });
    // ---- a Continue, then a death: she wakes at the second hearth ----
    await ev(async () => { const G = window.__G, F = G.hero.flags, W = await import('/src/game/world.js'); delete F.ketosWake; F.hearth6_2 = true; W.checkpoint6(G.zone, 'hearth2'); (await import('/src/game/save.js')).writeSave(); });
    await A5.reload(pg, { q: Q }); await listen();
    h = await here();
    beat('a Continue: in Whitecliff, cp6 kept', h.id === 'town' && h.cp6.drained === 'hearth2', h.cp6);
    await A5.travel(pg, 'drained', 'waypoint');
    const cont = await ev(() => { const G = window.__G, z = G.zone, S = z.L.spots, c = z.checkpoint, hh = S.hearths.find((q) => q.k === 2); return { cp: G.hero.flags.cp6.drained, d: c ? +Math.hypot(c.x - hh.x, c.z - hh.z - 2).toFixed(2) : null, c }; });
    beat('the zone built again: the place to wake at the second hearth', cont.cp === 'hearth2' && cont.d != null && cont.d <= 4, cont);
    await ev(() => window.__D.emit('respawn', false));
    await pg.waitForFunction(() => window.__G.zone?.id === 'drained' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 240000 });
    await pg.waitForTimeout(500);
    const woke = await ev((c) => { const p = window.__G.player; return +Math.hypot(p.x - c.x, p.z - c.z).toFixed(2); }, cont.c);
    beat('a death: she wakes at the second hearth', woke <= 1.5, woke);
    // ---- a key that no longer holds: the Heap's gap once the Ketos is down ----
    await ev(async () => { const G = window.__G, F = G.hero.flags, W = await import('/src/game/world.js'); F.ketosWake = true; W.checkpoint6(G.zone, 'heap'); });
    await ev(() => { const F = window.__G.hero.flags; F.ketosDown = true; F.keyxLamp = true; });
    await A5.travel(pg, 'drained', 'waypoint');
    h = await here();
    beat('the Ketos down: the Heap\'s gap gives way to the camp', h.mode === 'dry' && h.cp6.drained === 'camp' && h.cpCamp <= 4, h);
    // ---- the Bottom, first arrival down the Well ----
    await A5.travel(pg, 'bottom', 'drained');
    h = await here();
    beat('bottom: the Well\'s Foot found on the first arrival, saved', h.id === 'bottom' && h.wps.includes('bottom') && h.sWps.includes('bottom') && h.found === 1, h);
    beat('bottom: the camp the place to wake, saved', h.cp6.bottom === 'camp' && h.sCp6.bottom === 'camp' && h.cp6.drained === 'camp' && h.cpCamp <= 4, h);
    const kb = await keys([['camp', {}], ['well', {}], ['stair', { blackLamp0: true, blackLamp1: true, blackLamp2: true }, { shadeDown: false }]]);
    beat('bottom: the Well\'s Foot always, the Stair\'s foot once the three lamps are out', kb.every((r) => good(r, r.key !== 'stair')), kb);
    const nb = await keys([['hearth1', { hearth6_1: true }], ['heap', { ketosWake: true }, { ketosDown: false }]]);
    beat('bottom: the Drained Sea\'s keys never wake her here', nb.every((r) => !r.ok), nb);
    await ev(async () => { const G = window.__G, F = G.hero.flags, W = await import('/src/game/world.js'); delete F.ketosWake; F.ketosDown = true; W.checkpoint6(G.zone, 'stair'); F.shadeWake = true; F.shadeDown = true; });
    await A5.travel(pg, 'bottom', 'waypoint');
    h = await here();
    beat('the Shade down: the Stair\'s foot gives way to the camp', h.mode === 'dark' && h.cp6.bottom === 'camp' && h.cpCamp <= 4, h);
    // ---- the Gate ring: one way ----
    await ev(() => { const F = window.__G.hero.flags; F.herFire = true; F.nameBack = true; });
    await A5.travel(pg, 'bottom', 'waypoint');
    const ring = await ev(() => { const z = window.__G.zone, e = z.L.exits.find((x) => x.to === 'town'); return { mode: z.mode, e: e && { x: e.x, z: e.z, at: e.at, locked: e.locked }, wp: z.L.spots.waypoint }; });
    await ev(() => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'exit' && i.to === 'town'), f = z.map.nearestFloor(it.x, it.z + 1.2, 3); G.player.x = f.x; G.player.z = f.z; it.use(); });
    await pg.waitForFunction(() => window.__G.zone?.id === 'town' && !document.getElementById('fade').classList.contains('on'), null, { timeout: 240000 });
    await pg.waitForTimeout(500);
    const town = await ev(() => { const G = window.__G, z = G.zone, s = z.L.spots.npcs.wayfarer; return { staff: +Math.hypot(G.player.x - s.x, G.player.z - s.z).toFixed(2), exits: z.L.exits.filter((e) => e.to === 'bottom').length, inter: z.interact.filter((i) => i.to === 'bottom').length }; });
    beat('through the ring: home by Isarn\'s staff, no way down from Whitecliff', ring.mode === 'lit' && ring.e?.at === 'staff' && town.staff <= 3 && !town.exits && !town.inter, { ring, town });
    const from = async (at) => {
      await A5.travel(pg, 'bottom', at);
      return ev(([e, w]) => { const p = window.__G.player; return { ring: +Math.hypot(p.x - e.x, p.z - e.z).toFixed(1), wp: +Math.hypot(p.x - w.x, p.z - w.z - 2).toFixed(1) }; }, [ring.e, ring.wp]);
    };
    const fromTown = await from('town'), fromWp = await from('waypoint');
    beat('an arrival from Whitecliff, or by the waypoint, never at the ring', fromTown.ring > 8 && fromWp.ring > 8 && fromWp.wp <= 1.5, { fromTown, fromWp });
    return { pass: beats.every((x) => x.ok), failed: beats.filter((x) => !x.ok).map((x) => x.b), beats };
  } },
  // Act VI: engine
  // unload6: the unload of Acts II-IV (game/unload.js; docs/act6-contract.md, File ownership: engine; act6-design.md,
  // Engine work 5 and 20). A hero walks from the Field of Ash (Act IV, the coal in hand) down to the coast and back up,
  // then goes below the ice once the sea is lit, revisits the Halls, the Lanternglade (the wood, after the act) and the
  // Forge, and comes back to the coast. On each way into an Act V or VI zone Acts II-IV's packs, people and creatures leave
  // and their textures are freed on the GPU (Brokka's and Elati's people stay until the sea is lit, for the cameo), the
  // zones that drew them are dropped; each older zone loads them again (a pack's layers into the same texture objects);
  // every texture drawn is alive (no white or untextured model, no GL error) and no person comes back as a stand-in.
  // Tamarisk's frost loads in the wood after the act. Then four cold starts (coast, farlight, drained, bottom) measure each
  // act's own phone texture: G1's bar for a cold start into Act VI (either of its zones) is 100 MB. (MB: the GPU bytes of
  // every texture the registries hold, each uploaded, read through a WebGL hook; quality 1 halves the large maps as a phone
  // does; renderer.info's count beside it.) COLD=0 skips the cold starts, TOUR=0 the tour (the cold starts alone)
  unload6: { q: 'auto=ashfield&q=1&lvl=24&cloud=off&' + A5.url('coastSeen'), init: () => {
    if (window.__texMem) return;
    const P = WebGL2RenderingContext.prototype, GLc = WebGL2RenderingContext, map = new Map(), st = new WeakMap();
    const S = (gl) => { let s = st.get(gl); if (!s) st.set(gl, (s = { unit: 0, b: {} })); return s; };
    const BPP = { [GLc.R8]: 1, [GLc.RG8]: 2, [GLc.RGBA16F]: 8, [GLc.RGBA32F]: 16, [GLc.R16F]: 2, [GLc.R32F]: 4, [GLc.RG16F]: 4, [GLc.RGB16F]: 8, [GLc.RGB32F]: 16, [GLc.DEPTH_COMPONENT16]: 2, [GLc.LUMINANCE]: 1, [GLc.ALPHA]: 1, [GLc.RED]: 1 };
    const bpp = (f) => BPP[f] ?? 4, tgt = (t) => (t >= GLc.TEXTURE_CUBE_MAP_POSITIVE_X && t <= GLc.TEXTURE_CUBE_MAP_NEGATIVE_Z ? GLc.TEXTURE_CUBE_MAP : t);
    const cur = (gl, t) => { const s = S(gl); return s.b[s.unit + ':' + tgt(t)]; };
    const ent = (tex) => { let e = map.get(tex); if (!e) map.set(tex, (e = { lv: {}, stor: 0, mip: false })); return e; };
    const wrap = (name, f) => { const o = P[name]; P[name] = function (...a) { try { f.call(this, a); } catch (e) { /* never in the game's way */ } return o.apply(this, a); }; };
    wrap('activeTexture', function ([u]) { S(this).unit = u; });
    wrap('bindTexture', function ([t, tex]) { S(this).b[S(this).unit + ':' + t] = tex; if (tex) ent(tex); });
    wrap('deleteTexture', function ([tex]) { map.delete(tex); });
    wrap('texStorage2D', function ([t, levels, f, w, h]) { const tex = cur(this, t); if (!tex) return; let b = 0; for (let l = 0; l < levels; l++) b += Math.max(1, w >> l) * Math.max(1, h >> l) * bpp(f); ent(tex).stor = b * (t === GLc.TEXTURE_CUBE_MAP ? 6 : 1); });
    wrap('texStorage3D', function ([t, levels, f, w, h, d]) { const tex = cur(this, t); if (!tex) return; let b = 0; for (let l = 0; l < levels; l++) b += Math.max(1, w >> l) * Math.max(1, h >> l) * d * bpp(f); ent(tex).stor = b; });
    wrap('texImage2D', function (a) { const tex = cur(this, a[0]); if (!tex) return; const src = a.length >= 9 ? null : a[5], w = a.length >= 9 ? a[3] : src?.width ?? src?.videoWidth ?? 0, h = a.length >= 9 ? a[4] : src?.height ?? src?.videoHeight ?? 0; ent(tex).lv[a[0] + ':' + a[1]] = w * h * bpp(a[2]); });
    wrap('generateMipmap', function ([t]) { const tex = cur(this, t); if (tex) ent(tex).mip = true; });
    const bytes = (e) => e.stor || Object.values(e.lv).reduce((s, v) => s + v, 0) * (e.mip ? 4 / 3 : 1);
    window.__texMem = { map, bytes, of: (tex) => { const e = tex && map.get(tex); return e ? bytes(e) : 0; }, total: () => { let s = 0; for (const e of map.values()) s += bytes(e); return s; } };
  }, run: async (pg, shot) => {
    const ev = (f, a) => pg.evaluate(f, a), beats = [], beat = (b, ok, v) => { beats.push({ b, ok: !!ok, v }); };
    let step = 'start';
    // every texture the registries hold, uploaded if it is not yet, its GPU bytes by owner (each GL texture once); the
    // GL textures kept by owner for gone() (MB)
    const MEM = async () => {
      const [{ ENV }, { PEOPLE }, { CREATURES }, { R }] = await Promise.all(['/src/gfx/env.js', '/src/gfx/people.js', '/src/gfx/creatures.js', '/src/gfx/gfx.js'].map((u) => import(u)));
      const SETS = { people: ['warden', 'ranger', 'mage', 'wayfarer', 'smith', 'healer', 'villager0', 'villager1', 'villager2'], folk: ['stoneborn', 'stonebornArb', 'runepriest', 'brokka', 'moltenKing'], grove: ['elati', 'linden', 'rootsworn', 'rootswornArcher', 'hollowed', 'mourner', 'amaranthe'], ash: ['lampless', 'ashSpear', 'ashDwarf', 'ashBow', 'ashsmith', 'ivar', 'arna', 'arnaOld', 'isarnBoy', 'hammerhorn', 'karthax'], frost: ['sunken', 'icesinger', 'alkyone', 'selna', 'tern', 'tamarisk', 'glaukos'] };
      const ACT = { act1: ['goblin', 'skeleton', 'wolf', 'spider', 'ashspawn', 'troll', 'wight', 'barrowlord'], act2: ['magmahound', 'bat', 'worm', 'golem'], act3: ['elk', 'bear', 'moth', 'mandrake', 'treeman'], act4: ['ashwing', 'smokeeater', 'embertick'], act5: ['crab', 'skotos', 'tentacle', 'icemaw', 'louse', 'skua', 'bear'] };
      const SL = ['map', 'normalMap', 'aoMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'alphaMap'], owner = new Map();
      const put = (t, who) => { if (t?.isTexture && !owner.has(t)) owner.set(t, who); };
      const mats = (m, who) => { for (const mm of [].concat(m || [])) for (const s of SL) put(mm[s], who); };
      for (const k in ENV.layers) { const i = k.indexOf('/'); if (i > 0) { put(ENV.layers[k].d, 'pack:' + k.slice(0, i)); put(ENV.layers[k].n, 'pack:' + k.slice(0, i)); } }
      for (const k in ENV.props) { const i = k.indexOf('/'); if (i > 0) for (const p of ENV.props[k]) mats(p.mat, 'pack:' + k.slice(0, i)); }
      for (const [set, names] of Object.entries(SETS)) for (const n of names) PEOPLE.scenes[n]?.traverse((o) => { if (o.isMesh) mats(o.material, 'set:' + set); });
      for (const f in CREATURES.tpl) { const g = 'cr:' + Object.keys(ACT).filter((a) => ACT[a].includes(f)).join('+'); CREATURES.tpl[f].scene.traverse((o) => { if (o.isMesh) mats(o.material, g); }); }
      const gl = R.renderer, P = gl.properties, H = window.__texMem;
      for (const t of owner.keys()) if (!P.get(t).__webglTexture && (t.image?.width || 0) > 1) { try { gl.initTexture(t); } catch (e) { /* a released image */ } }
      const by = {}, seen = new Set(), cap = {};
      for (const [t, who] of owner) { const w = P.get(t).__webglTexture; if (!w || seen.has(w)) continue; seen.add(w); const b = H.of(w); by[who] = (by[who] || 0) + b; (cap[who] ||= []).push([w, b]); }
      window.__u6 = Object.assign(window.__u6 || {}, { cap });
      const MB = (b) => +(b / 1048576).toFixed(2), BOOT = ['pack:env', 'pack:village', 'pack:trees', 'set:people', 'cr:act1'];
      const total = Object.values(by).reduce((s, v) => s + v, 0), boot = BOOT.reduce((s, k) => s + (by[k] || 0), 0);
      return { total: MB(total), own: MB(total - boot), gl: MB(H.total()), info: gl.info.memory.textures, by: Object.fromEntries(Object.entries(by).sort().map(([k, v]) => [k, MB(v)])) };
    };
    // of the GL textures MEM last saw for these owners: how many MB they were, how many are still allocated
    const gone = (owners) => ev((owners) => { const H = window.__texMem, cap = window.__u6?.cap || {}; let was = 0, held = 0, n = 0; for (const o of owners) for (const [w, b] of cap[o] || []) { was += b; if (H.map.has(w)) { held += H.bytes(H.map.get(w)); n++; } } return { was: +(was / 1048576).toFixed(2), held: +(held / 1048576).toFixed(2), n }; }, owners);
    // a few frames drawn, then every texture the scene draws: alive (on the GPU, or an image still there to upload), never a
    // pack's freed layer (its one-pixel stand-in); the GL error flag; the people and whether each is a stand-in (*)
    const AUDIT = async () => {
      for (let i = 0; i < 4; i++) await new Promise((r) => requestAnimationFrame(() => r()));
      await new Promise((r) => setTimeout(r, 500));
      const [{ R }, U] = await Promise.all([import('/src/gfx/gfx.js'), import('/src/game/unload.js')]);
      const gl = R.renderer, P = gl.properties, tex = U.drawn([R.scene]), bad = [];
      let dead = 0, flat = 0;
      for (const t of tex) {
        const img = t.image, w = img?.width ?? img?.videoWidth ?? 0, on = !!P.get(t).__webglTexture;
        if (typeof ImageData !== 'undefined' && img instanceof ImageData && w === 1) { flat++; bad.push('flat ' + (t.name || t.uuid.slice(0, 8))); }
        else if (!on && !w && !t.isRenderTargetTexture && !t.isDepthTexture) { dead++; bad.push('dead ' + (t.name || t.uuid.slice(0, 8))); }
      }
      const G = window.__G, npcs = G.zone.actors.filter((a) => a.npc && a.avatar && !a.removed).map((a) => a.npc + ':' + a.avatar.modelName + (a.avatar.standIn ? '*' : '')).sort();
      return { n: tex.size, dead, flat, bad: bad.slice(0, 8), err: gl.getContext().getError(), npcs };
    };
    const ST = () => ev(async () => {
      const [E, P, C, U] = await Promise.all(['/src/gfx/env.js', '/src/gfx/people.js', '/src/gfx/creatures.js', '/src/game/unload.js'].map((u) => import(u)));
      const G = window.__G;
      return { zone: G.zone.id, packs: ['deep', 'wood', 'cinder', 'rime'].filter(E.packReady), folk: ['folk', 'grove', 'ash', 'frost'].filter(P.folkReady), groups: ['act2', 'act3', 'act4', 'act5'].filter(C.groupReady), zones: Object.keys(G.zones).sort(), log: U.UNLOAD.log.slice(-1)[0] || null, nlog: U.UNLOAD.log.length };
    });
    const whole = (a) => a.dead === 0 && a.flat === 0 && a.err === 0 && !a.npcs.some((x) => x.endsWith('*'));
    // (no scene, no line and no fade on: a word said on arrival is let finish before she moves on)
    const calm = async () => { for (let i = 0; i < 240; i++) { const c = await ev(() => ({ d: !!document.querySelector('#dialog:not([hidden])'), busy: !!window.__G.cine || window.__G.mode !== 'play' || document.getElementById('fade').classList.contains('on') })); if (!c.d && !c.busy) return; if (c.d) await A4.enter(pg); await pg.waitForTimeout(250); } };
    const settle = async (id) => { await pg.waitForFunction((id) => window.__G?.zone?.id === id && !document.getElementById('fade').classList.contains('on'), id, { timeout: 300000 }); await pg.waitForTimeout(1200); await calm(); };
    const travel = async (to) => { await calm(); step = 'to ' + to; await ev((to) => window.__D.emit('travel', to, { at: 'waypoint' }), to); await settle(to); };
    // (on foot: through the zone's exit)
    const walk = async (to) => { await calm(); step = 'on foot to ' + to; await ev((to) => { const G = window.__G, z = G.zone, it = z.interact.find((i) => i.kind === 'exit' && i.to === to); const f = z.map.nearestFloor(it.x, it.z + 1.2, 3); G.player.x = f.x; G.player.z = f.z; it.use(); }, to); await settle(to); };
    const has = (l, xs) => xs.every((x) => l.includes(x)), none = (l, xs) => !xs.some((x) => l.includes(x));
    await ev(() => { window.__immortal = true; });
    const out = {};
    try {
    if (process.env.TOUR !== '0') {
    // ---- the Field of Ash, Act IV: what it holds ----
    await settle('ashfield');
    const s0 = await ST(), m0 = await ev(MEM), a0 = await ev(AUDIT);
    const lay = await ev(async () => { const { ENV } = await import('/src/gfx/env.js'); const k = Object.keys(ENV.layers).find((x) => x.startsWith('cinder/')); window.__u6.lay = { k, L: ENV.layers[k] }; return k; });
    beat('the Field holds Act IV and the people it brings', has(s0.packs, ['cinder']) && has(s0.folk, ['ash', 'folk', 'grove']) && has(s0.groups, ['act4']) && whole(a0), { s0, a0 });
    out.field = m0;
    // ---- on foot to the coast (Act V, the sea not lit) ----
    await walk('coast');
    const s1 = await ST(), g1 = await gone(['pack:cinder', 'set:ash', 'cr:act4']), a1 = await ev(AUDIT), m1 = await ev(MEM);
    const L1 = await ev(async () => { const { R } = await import('/src/gfx/gfx.js'), { L } = window.__u6.lay; return { gpu: !!R.renderer.properties.get(L.d).__webglTexture, w: L.d.image?.width }; });
    beat('the coast: Act IV let go, its zone dropped, freed at once', s1.log?.to === 'coast' && has(s1.log.packs, ['cinder']) && has(s1.log.folk, ['ash']) && has(s1.log.groups, ['act4']) && s1.log.freed && !s1.log.late.length && s1.log.zones.includes('ashfield') && !s1.zones.includes('ashfield') && none(s1.packs, ['cinder']), s1);
    beat('Brokka\'s and Elati\'s people kept for the cameo (the sea not lit)', has(s1.folk, ['folk', 'grove']) && none(s1.log?.folk || [], ['folk', 'grove']), s1.folk);
    beat('the textures disposed: none of Act IV\'s left on the GPU, the cinder layer holds its one-pixel stand-in', g1.n === 0 && g1.was >= 100 && !L1.gpu && L1.w === 1 && !s1.log.late.length, { g1, L1 });
    beat('the coast drawn whole: every texture alive, no GL error, no stand-in', whole(a1), a1);
    out.coast = m1; out.saved1 = g1.was;
    await shot();
    // ---- on foot back up to the Field ----
    await walk('ashfield');
    const s2 = await ST(), a2 = await ev(AUDIT), m2 = await ev(MEM);
    const L2 = await ev(async () => { const { R } = await import('/src/gfx/gfx.js'), { ENV } = await import('/src/gfx/env.js'), { k, L } = window.__u6.lay; return { same: ENV.layers[k] === L, gpu: !!R.renderer.properties.get(L.d).__webglTexture, w: L.d.image?.width || 0 }; });
    beat('the Field again: Act IV loaded again (the layer into the same objects)', has(s2.packs, ['cinder']) && has(s2.folk, ['ash']) && has(s2.groups, ['act4']) && L2.same && L2.gpu && L2.w !== 1, { s2, L2 });
    const back = ['pack:cinder', 'set:ash', 'cr:act4'].map((k) => [k, m0.by[k], m2.by[k]]);
    beat('the Field drawn whole: alive, no stand-in, the same people as before, Act IV\'s textures as large as they were', whole(a2) && a2.npcs.join() === a0.npcs.join() && back.every(([, a, b]) => a > 0 && Math.abs(a - b) < 0.5), { a2, back });
    await shot();
    // ---- the sea lit, the act over: below the ice ----
    await ev(() => { const G = window.__G, h = G.hero, F = h.flags; for (const k of ['hearth', 'frozen', 'farSeen', 'skotosDown', 'seaLit', 'carved', 'act5']) F[k] = true; h.act5 = 1; h.quest = 31; });
    await travel('drained');
    const s3 = await ST(), g3 = await gone(['pack:cinder', 'set:ash', 'set:folk', 'set:grove', 'cr:act4']), a3 = await ev(AUDIT);
    beat('below the ice (Act VI): Brokka\'s and Elati\'s people go too once the sea is lit', s3.log?.to === 'drained' && has(s3.log.folk, ['ash', 'folk', 'grove']) && has(s3.log.packs, ['cinder']) && s3.log.freed && !s3.log.late.length && none(s3.folk, ['ash', 'folk', 'grove']) && has(s3.folk, ['frost']) && has(s3.packs, ['rime']), s3);
    beat('freed on the GPU, the drained sea drawn whole', g3.n === 0 && whole(a3), { g3, a3 });
    // ---- the older zones again: the Halls, the Lanternglade (after the act: Tamarisk's frost), the Forge ----
    await travel('halls');
    const s4 = await ST(), a4 = await ev(AUDIT);
    beat('the Halls: the deep and the dwarves load, Brokka herself', has(s4.packs, ['deep']) && has(s4.folk, ['folk']) && has(s4.groups, ['act2']) && a4.npcs.includes('brokka:brokka') && whole(a4), { s4, a4 });
    await ev(() => { window.__G.hero.act6 = 1; window.__G.hero.flags.act6 = true; });
    await travel('weep');
    const s5 = await ST(), a5 = await ev(AUDIT), m5 = await ev(MEM);
    beat('the Lanternglade: the wood and the Evergreen load, Elati herself, and the frost set for Tamarisk after the act', has(s5.packs, ['wood']) && has(s5.folk, ['grove', 'frost']) && has(s5.groups, ['act3']) && a5.npcs.includes('elati:elati') && whole(a5), { s5, a5 });
    out.weep = m5;
    await shot();
    await travel('forge');
    const s6 = await ST(), a6 = await ev(AUDIT), m6 = await ev(MEM);
    beat('the Forge: cinder and deep, the ash people', has(s6.packs, ['cinder', 'deep']) && has(s6.folk, ['ash']) && has(s6.groups, ['act4']) && whole(a6), { s6, a6 });
    out.forge = m6;
    await shot();
    // ---- the forest and Whitecliff, built while all of it is loaded; then the coast once more: everything of Acts II-IV
    // goes, the forest is dropped (built again on its next visit), Whitecliff is kept as it stands ----
    await travel('forest'); await travel('town');
    await ev(() => { window.__G.zones.town.__u6 = true; });
    await travel('coast');
    const OLD = ['pack:deep', 'pack:wood', 'pack:cinder', 'set:folk', 'set:grove', 'set:ash', 'cr:act2', 'cr:act3', 'cr:act4'];
    const s7 = await ST(), g7 = await gone(OLD), a7 = await ev(AUDIT), m7 = await ev(MEM);
    // (Whitecliff, built here with every pack loaded, keeps what it draws: Isarn's staff carries the cinder pack's lantern)
    beat('the coast after the whole tour: every pack, set and group of Acts II-IV let go and freed, but the few textures Whitecliff draws', none(s7.packs, ['deep', 'wood', 'cinder']) && none(s7.folk, ['folk', 'grove', 'ash']) && none(s7.groups, ['act2', 'act3', 'act4']) && s7.log?.freed && !s7.log.kept.length && s7.log.late.every((x) => x.startsWith('pack:')) && g7.held <= 2 && g7.was - g7.held >= 300 && whole(a7), { s7, g7, a7 });
    beat('the forest dropped, Whitecliff kept', has(s7.log?.zones || [], ['halls', 'weep', 'forge', 'forest']) && !s7.log.zones.includes('town') && s7.zones.includes('town') && !s7.zones.includes('forest'), s7.log?.zones);
    out.coast2 = m7; out.saved2 = g7.was;
    await travel('town');
    const a8 = await ev(AUDIT), same = await ev(() => window.__G.zone.__u6 === true);
    beat('Whitecliff as it was (the same zone) and drawn whole', same && whole(a8), a8);
    await shot();
    }
    // ---- cold starts: each act's own phone texture ----
    const COLD = { coast: 'auto=coast&lvl=28&' + A5.url('coastSeen'), farlight: 'auto=farlight&lvl=31&' + A5.url('farSeen'), drained: 'auto=drained&lvl=34&' + A5.url('toldChild') + ',act5,tam6,call6,coal6', bottom: 'auto=bottom&lvl=37&' + A5.url('toldChild') + ',act5,tam6,call6,coal6,ketosWake,ketosDown' };
    if (process.env.COLD !== '0') {
      out.cold = {};
      for (const z of Object.keys(COLD)) {
        const ctx = await pg.context().browser().newContext({ viewport: { width: 1280, height: 720 } });
        try {
          const p = await ctx.newPage();
          p.on('pageerror', (e) => logs.push('pageerror(cold ' + z + '): ' + e.message));
          await p.addInitScript(S.unload6.init);
          await p.addInitScript(() => { setInterval(() => { const G = window.__G; if (G?.player) { G.player.hp = G.player.hpMax; G.player.dead = false; } }, 50); });
          await p.goto(A5.base + '?' + COLD[z] + '&q=1&cloud=off');
          await p.waitForFunction((z) => window.__G?.zone?.id === z && window.__G.mode === 'play', z, { timeout: 300000 });
          await p.waitForTimeout(2500);
          out.cold[z] = await p.evaluate(MEM);
          out.cold[z].audit = await p.evaluate(AUDIT);
        } finally { await ctx.close(); }
      }
      for (const z of ['drained', 'bottom']) beat('a cold start into Act VI (' + z + '): its own phone texture within 100 MB', out.cold[z].own <= 100 && whole(out.cold[z].audit), out.cold[z]);
    }
    return { pass: beats.every((b) => b.ok), failed: beats.filter((b) => !b.ok).map((b) => b.b), mem: out, beats };
    } catch (e) { return { pass: false, step, error: e.message, beats }; }
  } },
  // perf6, Act VI's perf gate (docs/act6-contract.md, Stages and gates G1, G2; act6-design.md, The look: "The perf gate,
  // perf6"): frame time at quality 1 under phone emulation, perf5's way to the letter (915 x 412 at a pixel ratio of 1.5, a
  // coarse pointer, MSAA, adaptive resolution pinned at 1.0 and the scale it would have picked beside it; each visit's
  // frame the best of K drawn-and-waited frames plus the game's own logic over a few real frames; the verdict the median
  // over CYCLES of each spot's ratio to the Field of Ash drawn in the same cycle), at the design's five spots, each within
  // the Field's x 1.00. Quality 0 is measured as a floor (each spot no slower than at quality 1, + 5%). The spots, on fixed
  // seeds, each the worst place of its part for the gameplay camera's view (its ground footprint, cast from the screen,
  // scored over every dry cell of the part):
  //   hollows   the Black Hollows at full black water (0.9 m), 25 actors: the most water on screen in x 54-104, z 40-104
  //   mere      the Black Mere in the Ketos's phase 1 (its level forced to 1.6), the Ketos risen in it, four Ketlings, the
  //             three wreck lanterns lit and the lure (a false pool and its one pooled light): the most water from its shore
  //   wood      the Drowned Wood at full black water, 20 actors: the most trees and water on screen in its window
  //   village   the Forgotten Village's square: the most houses on screen, the Faded at their chores (13), Keyx with his
  //             lantern and the black lamp in his hand
  //   hearth    the First's Hearth in the Shade's form 2: its body 4.5 m off, three webs, two Hands at the black pools, the
  //             four stones lit and the seven named lamps: the most of them on screen from inside the stones' ring (r 8.5)
  // The Field is perf5's own visit (seed 5, its camp, no packs: its frame is perf5's Field, the calibration), and in the
  // same visit the Field again with each spot's crowd standing round her as it stands at the spot (the same bodies at the
  // same offsets, on the Field's floor): a person-bodied actor costs SwiftShader about 37 ms a frame (its skinning; a Hull-
  // louse 4-8, an Icemaw 10-16), so 25 of them weigh as much as the Field's whole world, and a spot is held against the
  // Field with the same crowd. The lead's bar (2 November), at quality 1, each term the median over the cycles of its
  // per-cycle ratio: (1) 'vsField', the spot against the Field carrying the same crowd at the same offsets, within x 1.00;
  // (2) 'world', the spot's world alone (its crowd hidden) against the bare Field, draw only, within x 1.00 (the design's
  // estimate of 0.85-0.95 was of these terms); (3) 'crowd', reported for every spot: the crowd's own cost at the spot (its
  // draw less its world's) against the same crowd's on the Field (the Field with it less the bare Field), so an Act VI
  // actor is seen to cost what it costs in Acts I-V unless a named part of the zone's own design makes it dearer. Its
  // frames are drawn in rounds, the crowd shown and hidden back to back (a cycle's single frames swing 5-10% on this
  // machine, the crowd's whole cost at the Hearth); a crowd under half of PAD bodies is padded with itself to PAD (the
  // Hearth's and the Mere's are cheap bodies: at 12 their cost still swung 30-50% a round). 'pooled': every round
  // of every cycle, the ratio of the medians with its 98% interval, and 'dearer' when the whole interval is over 1.00
  // (the same bodies on the same pixels cost the same, so at a dry, open spot the term is 1.00 but for the machine: read
  // 'dearer', not the median's side of 1.00). With SOLO=1 each round again with all but the actors hidden: 'bodies' (the
  // bodies alone, one draw anywhere: the measurement's own spread about 1.00) and 'inWorld' (the crowd's cost over its
  // bodies' in the same round); with SPLIT=1 what each part of the spot adds to the crowd's cost (the black water over
  // wading legs, say). All at quality 1; at quality 0, a floor, one round of the crowd as it stands. Beside
  // them 'vsBare', the spot against the bare Field (the crowd counted on one side only), reported, not gated: the crowd's
  // size is combat's at stage B, and G2 runs this again with the real packs.
  // Stage A's stand-ins (combat's packs, the Ketos, the Faded and the Shade come at stage B and C; G2 runs this again with
  // the real ones): the Sunken for the Black Crews, the Faded and Keyx (his body people.glb's villager1), the Hull-lice, the
  // Icemaw for the pool hunters, the Ketos (x 3.4) and the Ketlings (x 0.96), the spider for the Falselights (x 1.28), the
  // Weaver for the Shade's form 2, the Skotos's Hand for the Hands; Act V's creature files loaded, which act6's group lists
  // (louse, icemaw, tentacle, skotos); the pools systems adds at stage B for what is lit at each spot (true light: a
  // trembling lamp pool with its light; the named lamps and Keyx's lantern without one; the skylights; the false pools of
  // the lure posts, the Falselights' lures and the black lamps, no light). The silt pack is not built yet: its layers'
  // chains stand in (rime). The black water stands at its level through the water's uniforms (its clock is systems').
  // Env: QS ('1,0'), CYCLES (5), K (3), SEEDS ('5,3,3': Field, drained, bottom), ONLY (spots, comma-separated), CREW=0 (the
  // world alone: no actors, no spot pools), SPLIT=1 (each spot's draw again with one part hidden at a time: actors, water,
  // ground, props, decals and fx, the pool's lights off, and what each part adds to the crowd's cost), NOUNLOAD=1 (the
  // Field kept between cycles: &nounload), CR (4: term 3's rounds), PAD (24: the bodies a small crowd is padded to for
  // term 3), SOLO=1 (term 3's rounds with the bodies alone too: 'bodies' and 'inWorld'; about a third longer). A full run
  // takes about 65 minutes here
  perf6: { q: 'world=town&q=0&noenv', run: async (pg, shot) => {
    const browser = pg.context().browser(), base = process.env.BASE || 'http://localhost:5199/';
    await pg.goto('about:blank');
    const QS = (process.env.QS || '1,0').split(','), CYC = +(process.env.CYCLES || 5), K = +(process.env.K || 3), CR = +(process.env.CR || 4), PAD = +(process.env.PAD || 24), SOLO = process.env.SOLO === '1', out = {};
    const seeds = (process.env.SEEDS || '5,3,3').split(',').map(Number), ALL = ['hollows', 'mere', 'wood', 'village', 'hearth'];
    const spots = process.env.ONLY ? ALL.filter((s) => process.env.ONLY.split(',').includes(s)) : ALL, zones = ['ashfield', ...spots];
    const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    for (const Q of QS) {
      // (term 3 in full at the bar's quality only: quality 0 is a floor, one round, no padding)
      const T3 = +Q >= 1;
      const ctx = await browser.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => logs.push('pageerror(perf6 q' + Q + '): ' + e.message));
      p.on('console', (m) => { if (m.type() === 'error') logs.push('perf6 q' + Q + ': ' + m.text()); });
      // (each frame of the game's loop timed, less the part of it spent in renderer.render: the game's logic; perf5's)
      await p.addInitScript(() => {
        const raf = window.requestAnimationFrame.bind(window);
        window.__cb = []; window.__rn = 0;
        window.requestAnimationFrame = (f) => raf((t) => { const t0 = performance.now(), r0 = window.__rn; f(t); if (window.__rn !== r0) window.__cb.push(performance.now() - t0 - (window.__rn - r0)); if (window.__cb.length > 60) window.__cb.shift(); });
      });
      await p.goto(base + '?auto=ashfield&q=' + Q + '&lvl=30&seed=' + seeds[0] + '&cloud=off' + (process.env.NOUNLOAD === '1' ? '&nounload' : ''));
      try { await p.waitForFunction(() => window.__G?.player && window.__G.zone && window.__G.mode === 'play', null, { timeout: 400000 }); } catch (e) { out['q' + Q] = 'no zone'; await ctx.close(); continue; }
      await p.evaluate(async (seeds) => {
        window.__immortal = true;
        const h = window.__G.hero, R = window.__R;
        h.seeds = Object.assign(h.seeds || {}, { ['drained@' + h.diff]: seeds[1], ['bottom@' + h.diff]: seeds[2] });
        // (the creatures act6's group lists that ship today: Act V's files)
        await (await import('/src/gfx/creatures.js')).loadCreatures('act5');
        const r0 = R.renderer.render.bind(R.renderer);
        R.renderer.render = (s, c) => { const t0 = performance.now(); r0(s, c); window.__rn += performance.now() - t0; };
      }, seeds);
      const visit = (spot, crowds, warm) => p.evaluate(async ({ spot, K, CR, PAD, solo, crew, split, crowds, warm }) => {
        const G = window.__G, R = window.__R, D = window.__D, fx = await import('/src/gfx/fx.js'), gfx = await import('/src/gfx/gfx.js');
        const W = await import('/src/game/world.js'), Lt = await import('/src/game/light.js'), Pj = await import('/src/game/projectiles.js'), { SEA } = await import('/src/world/sea.js'), Ac = await import('/src/game/actors.js');
        const zone = spot === 'ashfield' ? 'ashfield' : spot === 'hollows' || spot === 'mere' ? 'drained' : 'bottom';
        if (G.zone.id !== zone) { await W.zoneReady(zone); D.enterZone(zone); }
        const z = G.zone, L = z.L, S = L.spots, A = z.lvl.act6, w = L.w;
        // (no pack of the zone's own wakes; every foe standing goes; no boss)
        for (const pk of z.packs) pk.spawned = true;
        for (const a of G.actors.slice()) if (a.team === 'foe') { a.remove?.(); G.actors.splice(G.actors.indexOf(a), 1); }
        z.bossSpawned = true;
        // the black water at its spot's level: the pockets at the clock's top, the Mere forced (drained, phase 1)
        const lv = spot === 'ashfield' ? null : 0.9, bay = zone === 'drained' ? 1.6 : 0;
        // the gameplay camera's ground footprint: the screen cast onto the floor, as offsets from the hero (NX x NY points)
        const NX = 48, NY = 22, cam = R.camera, V3 = cam.position.constructor, foot = [];
        gfx.updateCamera(0, w / 2, L.h / 2, true); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
        for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
          const v = new V3(((i + 0.5) / NX) * 2 - 1, ((j + 0.5) / NY) * 2 - 1, 0.5).unproject(cam).sub(cam.position);
          if (v.y >= -1e-4) continue;
          const t = -cam.position.y / v.y; foot.push([cam.position.x + v.x * t - w / 2, cam.position.z + v.z * t - L.h / 2]);
        }
        const bb = foot.reduce((b, [dx, dz]) => [Math.min(b[0], dx), Math.max(b[1], dx), Math.min(b[2], dz), Math.max(b[3], dz)], [1e9, -1e9, 1e9, -1e9]);
        const cell = (x, zz) => { const cx = Math.floor(x), cz = Math.floor(zz); return cx < 0 || cz < 0 || cx >= w || cz >= L.h ? -1 : cz * w + cx; };
        const wetAt = (i) => i >= 0 && !!L.pocket?.[i] && L.bed[i] < (L.pocket[i] === 2 ? bay : lv) - 0.02;
        const wetIn = (x, zz) => { let n = 0; for (const [dx, dz] of foot) if (wetAt(cell(x + dx, zz + dz))) n++; return n / foot.length; };
        const inView = (x, zz, q, m = 1) => q.x >= x + bb[0] * m && q.x <= x + bb[1] * m && q.z >= zz + bb[2] * m && q.z <= zz + bb[3] * m;
        const dry = (i) => L.cells[i] && !L.pocket?.[i] && z.map.walkable(i % w + 0.5, Math.floor(i / w) + 0.5);
        // the spot: the best dry cell of its part by its score (the Field: perf5's)
        const best = (ok, score) => { let b = null; for (let i = 0; i < L.cells.length; i++) { if (!dry(i)) continue; const x = i % w + 0.5, zz = Math.floor(i / w) + 0.5; if (!ok(x, zz)) continue; const s = score(x, zz); if (!b || s > b.s) b = { x, z: zz, s }; } return b; };
        const hyp = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), TREE = new Set(['pine', 'oak', 'dead']);
        let v = null;
        if (spot === 'ashfield') v = { x: S.camp.x, z: S.camp.z - 8 };
        else if (spot === 'hollows') v = best((x, zz) => x >= 54 && x <= 104 && zz >= 40 && zz <= 104, wetIn);
        else if (spot === 'mere') v = best((x, zz) => { const d = Math.hypot(x - S.mere.x, zz - S.mere.z); return d > S.mere.r + 0.5 && d < S.heap.r - 3; }, wetIn);
        else if (spot === 'wood') {
          const st = L.stamps.find((s) => s.kind === 'forest'), trees = L.props.filter((q) => TREE.has(q.t));
          v = best((x, zz) => x >= st.x0 && x < st.x0 + st.w && zz >= st.z0 && zz < st.z0 + st.h, (x, zz) => wetIn(x, zz) * 4 + trees.filter((q) => inView(x, zz, q, 0.8)).length / 40);
        } else if (spot === 'village') v = best((x, zz) => hyp({ x, z: zz }, S.keyx.well) < 12, (x, zz) => S.houses.filter((q) => inView(x, zz, q, 0.8)).length + 0.05 * (S.chores || []).filter((q) => inView(x, zz, q, 0.8)).length);
        else if (spot === 'hearth') { const H = S.hearth; v = best((x, zz) => hyp({ x, z: zz }, H) < 8.5, (x, zz) => [...H.stones, ...H.niches, ...H.pools, H.fire].filter((q) => inView(x, zz, q, 0.8)).length - hyp({ x, z: zz }, H) * 0.01); }
        const f = z.map.nearestFloor(v.x, v.z);
        G.player.x = f.x; G.player.z = f.z;
        gfx.updateCamera(0, G.player.x, G.player.z, true);
        // ---- the timing (perf5's): a few real frames for the logic, then the loop held, the particles run 12 s ahead, the
        // water at its level, every stand-in standing (a lurker gone under or a louse in its shell come up) and put back on its
        // own place (the real frames let the crowd walk, each by its own map: on the Field two of the wood's Sunken walked off
        // the screen and spared their skinning there, so its crowd stood at the same offsets only when it was spawned), and
        // K frames drawn and waited for ----
        R.prScale = 1; R.renderer.setPixelRatio(R.basePR); R.renderer.setSize(R.w, R.h, false); R.lastResize = 1e15;
        const gl = R.renderer.getContext(), px = new Uint8Array(4);
        const draw = () => { R.lost = false; R.skyHook?.(); R.renderer.render(R.scene, R.camera); R.lost = true; gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
        const time = () => { draw(); const t = []; for (let i = 0; i < K; i++) { const t0 = performance.now(); draw(); t.push(performance.now() - t0); } return +Math.min(...t).toFixed(1); };
        const place = new Map(), spawn = (list) => list.map((c) => { const q = z.map.nearestFloor(c.x, c.z, 3), a = D.spawnMonster(c.kind, q.x, q.z, { dormant: false, ...c.o }); G.actors.push(a); place.set(a, c); return a; });
        const drop = (list) => { for (const a of list) { if (!a.removed) a.remove?.(); const i = G.actors.indexOf(a); if (i >= 0) G.actors.splice(i, 1); } };
        // (the crowd's own cost, term 3: CR rounds of frames drawn back to back, the crowd shown and hidden with its blob
        // shadows, and with SOLO the same again with everything but the actors hidden: [shown, hidden(, shown alone, hidden
        // alone)]. The bodies alone are the same draw wherever they stand, so the last two are the machine's own speed at that
        // moment, for the same work)
        const hide = (list, on) => { for (const a of list) { a.avatar.group.visible = !on; if (a.mesh) a.mesh.visible = !on; } Ac.updateShadows(); };
        const rounds = (list, both = solo, n = CR) => {
          const av = new Set(G.actors.concat(G.player).map((a) => a.avatar?.group).filter(Boolean)), rest = R.scene.children.filter((o) => o.visible && !av.has(o) && !o.isLight && !o.isCamera), r = [];
          for (let i = 0; i < n; i++) {
            hide(list, false); const on = time(); hide(list, true); const off = time();
            if (!both) { r.push([on, off]); continue; }
            rest.forEach((o) => { o.visible = false; }); hide(list, false); const aon = time(); hide(list, true); const aoff = time(); rest.forEach((o) => { o.visible = true; });
            r.push([on, off, aon, aoff]);
          }
          hide(list, false);
          return r;
        };
        const run = async (actors) => {
          window.__cb.length = 0;
          for (let i = 0; i < 6; i++) await new Promise((ok) => requestAnimationFrame(() => { gfx.updateCamera(0, G.player.x, G.player.z, true); ok(); }));
          const lg = window.__cb.slice(2).sort((a, b) => a - b), logic = lg[lg.length >> 1] ?? 0;
          const mode0 = G.mode; G.mode = 'hold'; R.lost = true;
          for (let i = 0; i < 120; i++) fx.updateFX(0.1, G.player.x, G.player.z);
          gfx.updateCamera(0, G.player.x, G.player.z, true); gfx.frame(0.016);
          if (lv != null) { SEA.uLevel.value = lv; SEA.uWetLevel.value = lv; SEA.uBayLevel.value = bay; }
          for (const a of actors) if (!a.removed && !a.dead && a.avatar) { const c = place.get(a) || a; a.under = false; a.hidden = false; a.x = c.x; a.z = c.z; a.y = 0; a.avatar.group.visible = true; a.avatar.group.position.set(c.x, 0, c.z); a.mesh?.position.set(c.x, a.mesh.position.y, c.z); }
          Ac.updateShadows();
          const d = time(), info = R.renderer.info.render;
          return { logic: +logic.toFixed(1), draw: d, calls: info.calls, tris: info.triangles, done: () => { R.lost = false; G.mode = mode0; } };
        };
        // ---- the Field: perf5's visit, then with each spot's crowd round her ----
        if (spot === 'ashfield') {
          const m = await run([]); m.done();
          const res = { ms: +(m.draw + m.logic).toFixed(1), draw: m.draw, logic: m.logic, calls: m.calls, tris: m.tris, wet: 0, actors: 0, pools: 0, lights: R.pool.filter((l) => l.intensity > 0).length, at: [+f.x.toFixed(1), +f.z.toFixed(1)], pr: R.renderer.getPixelRatio(), crowd: {} };
          for (const [k, list] of crowds) {
            // (a crowd also measured padded needs no rounds of its own: its frame is vsField's)
            const as = spawn(list.map((c) => ({ ...c, x: f.x + c.dx, z: f.z + c.dz }))), c = await run(as), vis = as.filter((a) => !a.removed && a.avatar?.group.visible), r = rounds(vis, solo, crowds.some(([q]) => q === k + '+') ? 0 : CR); c.done();
            res.crowd[k] = { ms: +(c.draw + c.logic).toFixed(1), draw: c.draw, logic: c.logic, calls: c.calls, actors: vis.length, rounds: r };
            drop(as);
          }
          return res;
        }
        // ---- a spot: what is lit there (pools), its crowd in view ----
        const P6 = { actors: [], pools: [], lights: [], lit: [], areas: [] };
        const pool = (q, r, o) => { const p0 = Lt.addLightPool(q.x, q.z, r, Infinity, 'perf6', o); P6.pools.push(p0); return p0; };
        const lit = (m) => { if (m?.userData.setLit) { m.userData.setLit(true); P6.lit.push(m); } };
        // (a true lamp: a trembling pool with its light; o: the pool's options over it)
        const lamp = (q, r, o = {}) => pool(q, r, { lamp: true, ...o });
        // (the places a body stands: cells on screen 2.5-11 m from her, a cell apart, in a fixed scatter)
        const places = [];
        if (crew) {
          const h = (i) => { let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); return (x ^ (x >>> 16)) >>> 0; };
          const cand = [];
          for (const [dx, dz] of foot) { const x = Math.floor(f.x + dx * 0.8) + 0.5, zz = Math.floor(f.z + dz * 0.8) + 0.5, d = Math.hypot(x - f.x, zz - f.z), i = cell(x, zz); if (i < 0 || d < 2.5 || d > 11 || !z.map.walkable(x, zz)) continue; cand.push({ x, z: zz, i, k: h(i) }); }
          cand.sort((a, b) => a.k - b.k);
          for (const c of cand) if (!places.some((q) => hyp(q, c) < 1.2)) places.push(c);
        }
        const list = [];
        let pi = 0;
        const put = (kind, n, o = {}) => { for (let k = 0; k < n && pi < places.length; k++) { const q = places[pi++]; list.push({ kind, x: q.x, z: q.z, o }); } };
        if (crew && zone === 'drained') {
          for (const s of S.sky || []) pool(s, s.r, { sky: true, light: false });
          for (const l of S.lures || []) pool(l.bait || l, 2.5, { fake: true, light: false });
        }
        if (crew && zone === 'bottom') {
          for (const l of S.lamps || []) pool(l, 4, { fake: true, light: false, core: 'dark' });
          for (const l of S.lures || []) pool(l.bait || l, 2.5, { fake: true, light: false });
        }
        if (crew && spot === 'hollows') {
          const h2 = A.hearths.slice().sort((a, b) => hyp(a, f) - hyp(b, f))[0]; if (h2) { lit(h2.mesh); lamp(h2, 6); }
          put('sunken', 10); put('harpooner', 5); put('hullLouse', 6); put('icemaw', 4);
        }
        if (crew && spot === 'mere') {
          for (const l of A.wrecks) { lit(l.mesh); lamp(l, 4); }
          const lu = S.mere.lure; pool(lu, 2.5, { fake: true, light: false }); P6.lights.push(gfx.addLight({ x: lu.x, y: 1.6, z: lu.z, color: 0xd8e0ff, intensity: 14, range: 8, flicker: 0 }));
          // the Ketos risen in the Mere, between its lure and her
          list.push({ kind: 'icemaw', x: S.mere.x + (f.x - S.mere.x) * 0.35, z: S.mere.z + (f.z - S.mere.z) * 0.35, o: { scale: 3.4 } });
          put('icemaw', 4, { scale: 0.96 });
        }
        if (crew && spot === 'wood') { put('sunken', 12); put('spider', 5, { scale: 1.28 }); put('icemaw', 3); }
        if (crew && spot === 'village') {
          list.push({ kind: 'sunken', x: S.keyx.x, z: S.keyx.z, o: { model: 'villager1' } });
          pool(S.keyx, 1.5, { tremble: true, light: false });
          for (const c of (S.chores || []).filter((q) => inView(f.x, f.z, q))) if (list.length < 14) list.push({ kind: 'sunken', x: c.x, z: c.z, o: {} });
          put('sunken', 14 - list.length);
        }
        if (crew && spot === 'hearth') {
          const H = S.hearth;
          for (const s of A.stones) { lit(s.mesh); lamp(s, 4); }
          for (const n of A.niches) { lit(n.mesh); lamp(n, 3, { light: false }); }
          // (the Shade 4.5 m from her toward her fire, or north of her; its webs between them; the Hands at the black pools)
          const d = hyp(f, H), sx = d > 2 ? f.x + (H.x - f.x) / d * 4.5 : f.x, sz = d > 2 ? f.z + (H.z - f.z) / d * 4.5 : f.z - 4.5;
          list.push({ kind: 'weaver', x: sx, z: sz, o: {} });
          for (const hp of H.pools.slice(0, 2)) list.push({ kind: 'skotosHand', x: hp.x, z: hp.z, o: {} });
          for (let k = 0; k < 3; k++) P6.areas.push(Pj.area('web', (f.x + sx) / 2 + (k - 1) * 3.5, (f.z + sz) / 2 + (k % 2) * 2 - 1, 2, 1e4, { team: 'foe' }));
        }
        P6.actors = spawn(list);
        const m = await run(P6.actors);
        const onPool = R.pool.filter((l) => l.intensity > 0).length;
        // the world alone: the crowd hidden (its draw only)
        // (one round of a crowd padded for term 3, or in the warm-up visit: its world's frame is term 2's)
        const padded = crew && list.length && list.length < PAD / 2, shown = P6.actors.filter((a) => !a.removed && a.avatar?.group.visible), r = rounds(shown, solo, padded || warm ? 1 : CR), bare = Math.min(...r.map((q) => q[1]));
        // SPLIT: where the frame goes, each part hidden in turn (its draw less the whole's); the lights' share with the pool's
        // intensities at 0 (the loop is compiled for the pool's length either way)
        let parts = null;
        if (split) {
          parts = {};
          const lvl = z.lvl.group, kids = lvl.children, av = new Set(G.actors.map((a) => a.avatar?.group).filter(Boolean));
          const gr = [z.lvl.ground].flat().filter(Boolean), sea = [z.lvl.sea].filter(Boolean);
          const sets = {
            actors: R.scene.children.filter((o) => av.has(o)),
            water: sea,
            ground: gr,
            props: kids.filter((o) => !gr.includes(o) && !sea.includes(o)),
            fxDecals: R.scene.children.filter((o) => o !== lvl && !av.has(o) && !o.isLight && !o.isCamera)
          };
          const whole = time();
          for (const [k, l] of Object.entries(sets)) { const vis = l.map((o) => o.visible); l.forEach((o) => { o.visible = false; }); parts[k] = { n: l.length, saves: +(whole - time()).toFixed(1) }; l.forEach((o, i) => { o.visible = vis[i]; }); }
          const I0 = R.pool.map((l) => l.intensity); R.pool.forEach((l) => { l.intensity = 0; }); parts.poolLights = { on: onPool, saves: +(whole - time()).toFixed(1) }; R.pool.forEach((l, i) => { l.intensity = I0[i]; });
          parts.whole = whole;
          // (what each part adds to the crowd's own cost, term 3's: the crowd's rounds with the part hidden, against its
          // rounds in the whole; the black water over wading legs, say)
          const dW = (rr) => rr.map((q) => q[0] - q[1]).sort((a, b) => a - b)[rr.length >> 1];
          parts.crowd = { whole: dW(r) };
          for (const [k, l] of Object.entries(sets)) { if (k === 'actors' || !l.length) continue; const vis = l.map((o) => o.visible); l.forEach((o) => { o.visible = false; }); const rr = rounds(shown, false); l.forEach((o, i) => { o.visible = vis[i]; }); parts.crowd[k] = { without: dW(rr), rounds: rr }; }
        }
        const wet = +wetIn(G.player.x, G.player.z).toFixed(3);
        m.done();
        // (term 3 for a crowd under PAD / 2 bodies (the Hearth's 3, the Mere's 5 cost a few tens of ms, inside a frame's own
        // swing): the same crowd again, whole, on the next free places, until it has PAD; the Field carries the same)
        let r3 = null, list3 = null;
        if (padded) {
          list3 = list.slice();
          for (let k = 0; list3.length < PAD && pi < places.length; k++) { const c = list[k % list.length], q = places[pi++]; list3.push({ kind: c.kind, x: q.x, z: q.z, o: c.o }); }
          const more = spawn(list3.slice(list.length)), all = P6.actors.concat(more);
          if (!warm) { const m3 = await run(all); r3 = rounds(all.filter((a) => !a.removed && a.avatar?.group.visible)); m3.done(); }
          drop(more);
        }
        window.__p6 = P6;
        const rel = (l) => l && l.map((c) => ({ kind: c.kind, dx: +(c.x - f.x).toFixed(2), dz: +(c.z - f.z).toFixed(2), o: c.o }));
        return { ms: +(m.draw + m.logic).toFixed(1), draw: m.draw, logic: m.logic, bare, rounds: r, rounds3: r3, calls: m.calls, tris: m.tris, wet, actors: shown.length, pools: P6.pools.length, lights: onPool, at: [+f.x.toFixed(1), +f.z.toFixed(1)], pr: R.renderer.getPixelRatio(), parts,
          crowd: rel(list), crowd3: rel(list3) };
      }, { spot, K, CR: T3 ? CR : 1, PAD: T3 ? PAD : 0, solo: T3 && SOLO, crew: process.env.CREW !== '0', split: process.env.SPLIT === '1', crowds, warm });
      // (the spot let go after its visit: its actors, pools, lights, lit props and webs)
      const undress = () => p.evaluate(async () => {
        const G = window.__G, P6 = window.__p6, gfx = await import('/src/gfx/gfx.js'), Lt = await import('/src/game/light.js'); if (!P6) return;
        for (const a of P6.actors) { if (!a.removed) a.remove?.(); const i = G.actors.indexOf(a); if (i >= 0) G.actors.splice(i, 1); }
        for (const q of P6.pools) Lt.removeLightPool(q);
        for (const s of P6.lights) gfx.removeLight(s);
        for (const m of P6.lit) m.userData.setLit(false);
        for (const a of P6.areas) { const i = G.areas.indexOf(a); if (i >= 0) { a.dispose?.(); G.areas.splice(i, 1); } }
        window.__p6 = null;
      });
      // (each spot's crowd as its first visit stood it, for the Field's like-for-like frames)
      const S = {}, crowds = {};
      for (let c = -1; c < CYC; c++) for (const z of zones) {
        const m = await visit(z, z === 'ashfield' ? Object.entries(crowds).filter(([, l]) => l.length) : [], c < 0);
        if (c < 0) { if (m.crowd && z !== 'ashfield') crowds[z] = m.crowd; if (m.crowd3) crowds[z + '+'] = m.crowd3; await p.waitForTimeout(300); await p.screenshot({ path: shot.dir + '/perf6-' + z + '-q' + Q + '.png', timeout: 240000 }).catch((e) => logs.push('perf6 shot ' + z + ': ' + e.message.split('\n')[0])); }
        await undress();
        if (c < 0) continue;
        (S[z] ||= []).push(m);
        console.log('perf6 q' + Q + ' cycle ' + c + ' ' + z + ' ' + JSON.stringify(z === 'ashfield' ? m : { ...m, crowd: m.crowd.length, crowd3: m.crowd3?.length }));
      }
      for (const z of zones) {
        const ms = med(S[z].map((m) => m.ms)), last = S[z][S[z].length - 1];
        out[z + '@q' + Q] = { ms, draw: med(S[z].map((m) => m.draw)), logic: med(S[z].map((m) => m.logic)), calls: last.calls, tris: last.tris, wet: last.wet, actors: last.actors, pools: last.pools, lights: last.lights, at: last.at, pr: last.pr, wouldScale: ms > 21 ? 'down (to 0.55 at worst)' : ms < 14.5 ? 'up' : 'hold' };
      }
      for (const z of spots) {
        const o = out[z + '@q' + Q], F = S.ashfield;
        o.bare = med(S[z].map((m) => m.bare));
        if (F[0].crowd[z]) { o.field = med(F.map((m) => m.crowd[z].ms)); o.ratios = S[z].map((m, i) => +(m.ms / F[i].crowd[z].ms).toFixed(3)); }
        else { o.field = med(F.map((m) => m.ms)); o.ratios = S[z].map((m, i) => +(m.ms / F[i].ms).toFixed(3)); }
        o.vsField = med(o.ratios);
        o.world = med(S[z].map((m, i) => +(m.bare / F[i].draw).toFixed(3)));
        o.vsBare = med(S[z].map((m, i) => +(m.ms / F[i].ms).toFixed(3)));
        // (3) the crowd's own cost, draws only: at the spot its draw less its world's, on the Field the Field with it less
        // the bare Field, each the median of its rounds (the two frames of a round drawn back to back); the term the median
        // of the per-cycle ratios. A crowd under PAD / 2 bodies is measured padded with itself (crowd3). Beside it, with SOLO: 'bodies',
        // the same with all but the actors hidden (one draw wherever it stands: 1.00 but for the machine, so its spread is
        // the measurement's own), and 'inWorld', each place's crowd cost over its bodies' cost in the same round (the
        // machine's speed taken out: what the world adds to or takes from the same bodies, the spot's against the Field's)
        const k3 = F[0].crowd[z + '+'] ? z + '+' : z;
        if (F[0].crowd[k3]) {
          const sr = (m) => (k3 === z ? m.rounds : m.rounds3), dW = (r) => med(r.map((q) => q[0] - q[1])), dA = (r) => med(r.map((q) => q[2] - q[3])), qW = (r) => med(r.map((q) => (q[0] - q[1]) / (q[2] - q[3])));
          const cr = S[z].map((m, i) => [dW(sr(m)), dW(F[i].crowd[k3].rounds)]);
          o.crowd = { n: F[0].crowd[k3].actors, padded: k3 !== z, spot: +med(cr.map((c) => c[0])).toFixed(1), field: +med(cr.map((c) => c[1])).toFixed(1), ratios: cr.map((c) => +(c[0] / c[1]).toFixed(3)) };
          o.crowd.term = med(o.crowd.ratios);
          // (every round of every cycle pooled: the ratio of the two medians and its 98% interval, resampled on a fixed
          // seed; 'dearer' when the whole interval is over 1.00, i.e. dearer than a frame's own swing explains: 1% a spot by
          // chance, about 5% for one of five)
          const pool = (f) => { const x = S[z].flatMap((m) => sr(m).map(f)), y = F.flatMap((m) => m.crowd[k3].rounds.map(f)), r = []; let h = 7;
            const rnd = () => { h = (Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) + 0x9e3779b9) | 0; return ((h ^ (h >>> 13)) >>> 0) / 4294967296; }, pick = (v) => med(v.map(() => v[Math.floor(rnd() * v.length)]));
            for (let i = 0; i < 1000; i++) r.push(pick(x) / pick(y));
            r.sort((u, v) => u - v); return [+(med(x) / med(y)).toFixed(3), +r[10].toFixed(3), +r[989].toFixed(3)]; };
          if (T3) { o.crowd.pooled = pool((q) => q[0] - q[1]); o.crowd.dearer = o.crowd.pooled[1] > 1; }
          if (T3 && SOLO) {
            o.crowd.bodiesR = S[z].map((m, i) => +(dA(sr(m)) / dA(F[i].crowd[k3].rounds)).toFixed(3)); o.crowd.bodies = med(o.crowd.bodiesR);
            o.crowd.inWorldR = S[z].map((m, i) => +(qW(sr(m)) / qW(F[i].crowd[k3].rounds)).toFixed(3)); o.crowd.inWorld = med(o.crowd.inWorldR);
            o.crowd.bodiesPooled = pool((q) => q[2] - q[3]);
          }
        }
        // (the lead's bar: vsField and world within x 1.00 at quality 1; the crowd term reported)
        o.pass = o.vsField <= 1.0 && o.world <= 1.0;
      }
      await ctx.close();
    }
    // (the floor: at quality 0 each spot draws no slower than at quality 1)
    for (const z of zones) if (out[z + '@q0']?.ms && out[z + '@q1']?.ms) out[z + '@q0'].floor = out[z + '@q0'].ms <= out[z + '@q1'].ms * 1.05;
    out.pass = spots.every((z) => out[z + '@q1']?.pass) && zones.every((z) => out[z + '@q0']?.floor !== false);
    return out;
  } },
  // Act VI: look
  // the look lane's stage A (docs/act6-contract.md, Visuals): on quality 0 and 1, the bench (src/debug/look6.js: a test
  // layout of each zone with the black water's pockets and the Mere, built through buildLevel) in the world viewer's page:
  // the ground is ground6 with the X6 set (G_WET on quality 1 only; no G_AUR, G_GLINT, G_WIN, G_EDGE), the water SEA_BLACK
  // over the pockets only, the Mere on its own level (bayCorners from L.pocket 2 in drained, none at the Bottom), the slush
  // crust from its texture, the vault drawn only while the camera looks low, every act6Prop kind built with its switches;
  // then both zones in the game (?auto=drained, ?auto=bottom) build with ground6 and act6Level, no ice mesh. Pictures of
  // the water at both levels, the slush, the Mere, the vault and every prop, on both qualities, into the out dir
  look6: { q: 'world=crypt&q=1&nohouses', run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    const ev = (f, a) => pg.evaluate(f, a), dir = process.argv[3] || '/tmp';
    const snap = (n) => pg.screenshot({ path: `${dir}/look6-${n}.png` });
    // (the compiled programs' defines: the ground's and the water's, from the GL's own source)
    const defs = () => ev(() => { const R = window.__R, gl = R.renderer.getContext(), out = {}; for (const p of R.renderer.info.programs) { const k = p.cacheKey || ''; const tag = k.includes('groundPBR|drained') ? 'groundD' : k.includes('groundPBR|bottom') ? 'groundB' : /sea\|tbh?2?(,|$|\|)/.test(k) ? 'black' : null; if (!tag) continue; const src = gl.getShaderSource(p.fragmentShader) || ''; (out[tag] ||= new Set()); for (const d of ['G_WET', 'G_AUR', 'G_GLINT', 'G_WIN', 'G_EDGE', 'SEA_BLACK', 'SEA_HI']) if (src.includes('#define ' + d)) out[tag].add(d); } for (const k in out) out[k] = [...out[k]]; return out; });
    for (const q of [0, 1]) {
      await pg.goto(A5.base + '?world=crypt&q=' + q + '&nohouses');
      await pg.waitForFunction(() => window.__ready, null, { timeout: 240000 });
      // ---- the Drained Sea's bench: the water, the Mere, the slush, the vault, every prop ----
      const d = await ev(async () => { const m = await import('/src/debug/look6.js'); window.__L6 = m; return m.show({ type: 'drained', props: true }); });
      beat(`q${q} drained bench built: ground6, the black water, the vault, every prop kind`, d.ground && d.groundKey.startsWith('groundPBR|drained') && d.sea && d.seaQuads > 0 && d.vault && d.keels >= 1 && d.sky === 3 && d.braziers === 3 && d.rope && d.props.length === 20, d);
      // (the First's marks: one instanced draw along the trail, shown only inside the hero's ring, FIRE_U; the vault's drips)
      const mk = await ev(() => {
        const L = window.__look6, m = L.lvl.act6.marks, tr = L.L.spots.trail, R = window.__R, gl = R.renderer.getContext(), pr = R.renderer.getPixelRatio(), px = new Uint8Array(4), V = new R.camera.position.constructor();
        // (a point off the screen reads nothing: a NaN, which fails the beat)
        const read = (p) => { V.set(p.x, 0.03, p.z).project(R.camera); const x = Math.round((V.x * 0.5 + 0.5) * R.w * pr), y = Math.round((V.y * 0.5 + 0.5) * R.h * pr); if (x < 0 || y < 0 || x >= R.w * pr || y >= R.h * pr) return [NaN, NaN, NaN]; px.fill(0); gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [px[0], px[1], px[2]]; };
        // (the camera on the twelfth mark: the eleventh 1.6 m behind it, the eighth 6.4 m up the screen, past the ring)
        const diff = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), at = tr[12], near = tr[11], far = tr[8], o = { dist: 11, pitch: 0.9, density: 0.03, lookY: 0.9 };
        window.__L6.view(at.x, at.z, o); const n1 = read(near), f1 = read(far); m.visible = false; window.__L6.view(at.x, at.z, o); const n0 = read(near), f0 = read(far); m.visible = true;
        window.__L6.view(at.x, at.z, { ...o, fireR: 10 }); const fw = read(far); window.__L6.view(at.x, at.z, o);
        return { near: +diff(n1, n0).toFixed(1), far: +diff(f1, f0).toFixed(1), farWide: +diff(fw, f0).toFixed(1), dNear: +Math.hypot(near.x - at.x, near.z - at.z).toFixed(1), dFar: +Math.hypot(far.x - at.x, far.z - at.z).toFixed(1) };
      });
      beat(`q${q} the First's marks: ${d.marks} in one draw, seen inside the hero's ring and not beyond it, a wider ring showing more; the vault's drips`, d.marks === 44 && d.drips === 1 && mk.near > 12 && mk.far < 2 && mk.farWide > 12, { ...mk, marks: d.marks, drips: d.drips });
      const tr = await ev(() => window.__look6.L.spots.trail[10]);
      await ev(([x, z]) => window.__L6.view(x, z, { dist: 11, pitch: 0.9, density: 0.03, lookY: 0.9 }), [tr.x, tr.z]); await snap(`q${q}-drained-marks`);
      await ev(([x, z]) => window.__L6.view(x, z, { dist: 11, pitch: 0.9, density: 0.03, lookY: 0.9, fireR: 7.5 }), [tr.x, tr.z]); await snap(`q${q}-drained-marks-wide`);
      const water = [['pockets', 44, 51, { level: 0.6, wet: 0.75, mere: 1.6, dist: 11, pitch: 0.9 }], ['pockets-low', 44, 51, { level: 0.15, wet: 0.6, mere: 1.6, dist: 11, pitch: 0.9 }],
        ['slush', 44, 51, { level: 0.6, mere: 1.6, dist: 11, pitch: 0.9, slush: [[42, 49], [43, 49], [42, 50], [43, 50], [44, 50], [43, 51], [44, 51], [45, 51]] }],
        ['mere16', 58, 141, { level: 0.3, mere: 1.6, dist: 16, pitch: 0.95 }], ['mere085', 58, 141, { level: 0.3, mere: 0.85, dist: 16, pitch: 0.95 }],
        ['vault', 56, 60, { level: 0.6, mere: 1.6, dist: 18, pitch: 0.12, density: 0.012, lookY: 6 }], ['keel-asger', 22, 107, { level: 0.3, dist: 12, pitch: 0.7, density: 0.03, lookY: 0.9 }],
        ['shack-side', 66, 28, { dist: 10, pitch: 0.85 }]];
      for (const [n, x, z, o] of water) { await ev(([x, z, o]) => window.__L6.view(x, z, o), [x, z, o]); await snap(`q${q}-drained-${n}`); }
      const vs = await ev(() => { const L = window.__look6, v = L.lvl.act6.vault; window.__L6.view(56, 60, { pitch: 0.12, lookY: 6, density: 0.012 }); const low = v.visible; window.__L6.view(56, 40, { pitch: 0.95, lookY: 0.9, density: 0.03 }); const t = L.L.tSlush; const by = L.L.bay5; let nb = 0; if (by) for (const k of by) if (k > 0) nb++; return { low, play: v.visible, slush: t ? Array.from(t.image.data).filter((b) => b).length : -1, bay: nb, black: /^sea\|tb/.test(L.lvl.sea.userData.mat.customProgramCacheKey()) }; });
      beat(`q${q} the vault shows only to a low camera; slush cells in its texture; the Mere's corners on its own level; the black water's material`, vs.low && !vs.play && vs.slush === 8 && vs.bay > 200 && vs.black, vs);
      const df = await defs();
      beat(`q${q} the X6 set: G_WET ${q ? 'on' : 'off'}, no aurora, glint, windows or edge; the water SEA_BLACK`, (q ? df.groundD?.includes('G_WET') : !df.groundD?.includes('G_WET')) && !['G_AUR', 'G_GLINT', 'G_WIN', 'G_EDGE'].some((k) => df.groundD?.includes(k)) && df.black?.includes('SEA_BLACK'), df);
      const props = await ev(() => window.__look6.props.map((p) => [p.k, p.x, p.z]));
      for (const [k, x, z] of props) {
        const far = { shadowWall: 13, neckArch: 13, keel: 12, gateRing: 10, skylight: 11, stiltFrame: 9, toppledLight: 14 }[k];
        await ev(([x, z, o]) => window.__L6.view(x, z, o), [x + (k === 'toppledLight' ? 4 : 0), z + (far ? 2 : 1), { dist: far || 6.5, pitch: k === 'keel' || k === 'gateRing' || k === 'skylight' ? 0.55 : 0.78, lookY: k === 'bird' || k === 'garland' ? 1.6 : 0.9, density: 0.03, level: 0.3, mere: 1.6 }]);
        await snap(`q${q}-prop-${k}`);
      }
      // (the switches: lit and out, a flare, the wall thinned away, the bell rung, the ring warm and cold, the pane out)
      const sw = await ev(async () => {
        const P = Object.fromEntries(window.__look6.props.map((p) => [p.k, p.m])), u = (k) => P[k].userData, out = {};
        for (const k of ['hearth6', 'brazier6', 'hearthStone', 'nameLamp', 'wreckLantern', 'toppledLight', 'keyxLantern', 'blackLamp']) { u(k).setLit(false); const a = !!u(k).lit; u(k).setLit(true); out[k] = !a && !!u(k).lit; }
        u('blackLamp').flare(1); u('blackLamp').flare(0); u('shipBell').ring(1); u('gateRing').setWarm(0); out.ring = u('gateRing').warm === 0; u('gateRing').setWarm(1);
        u('emberPane').setGlow(0); out.pane = u('emberPane').glow === 0; u('emberPane').setGlow(1); u('ropeWinch').setFire(false); out.winch = u('ropeWinch').fire === false; u('ropeWinch').setFire(true);
        u('skylight').dim(0.5); out.sky = u('skylight').k === 0.5; u('skylight').dim(1);
        out.thin = await new Promise((ok) => { u('shadowWall').thin(0.3, () => ok(!P.shadowWall.visible && u('shadowWall').open)); const t0 = performance.now(); const step = () => { window.__L6.view(79, 107, {}); if (performance.now() - t0 < 8000 && P.shadowWall.visible) requestAnimationFrame(step); }; step(); setTimeout(() => ok(false), 9000); });
        let flew = false; u('bird').fly([{ x: 90, y: 2, z: 97 }, { x: 94, y: 3, z: 94 }, { x: 98, y: 4, z: 92 }], 0.3, () => { flew = true; }); for (let i = 0; i < 40 && !flew; i++) { window.__L6.view(92, 98, {}); await new Promise((r) => setTimeout(r, 30)); } out.bird = flew;
        return out;
      });
      beat(`q${q} every prop's switches`, Object.values(sw).every(Boolean), sw);
      // ---- the Drained Sea dry: the Mere drained to its bed, the Well's mouth at its centre ----
      const dry = await ev(async () => window.__L6.show({ type: 'drained', mode: 'dry' }));
      beat(`q${q} drained dry: the Well's mouth`, dry.well && dry.ground, dry);
      await ev(() => window.__L6.view(58, 150, { level: 0.3, mere: 0, dist: 16, pitch: 0.95 })); await snap(`q${q}-drained-dry`);
      // ---- the Bottom's bench: its water, the glade's garlands, the village's sunk houses ----
      const b = await ev(async () => window.__L6.show({ type: 'bottom' }));
      beat(`q${q} bottom bench built: ground6, the black water, no Mere`, b.groundKey.startsWith('groundPBR|bottom') && b.sea && b.seaQuads > 0 && !(await ev(() => window.__look6.L.bay5)), b);
      for (const [n, x, z, o] of [['pockets', 44, 51, { level: 0.6, wet: 0.75, mere: 0, dist: 11, pitch: 0.9 }], ['glade', 38, 103, { dist: 12, pitch: 0.85 }], ['village', 66, 70, { dist: 14, pitch: 0.85 }]]) { await ev(([x, z, o]) => window.__L6.view(x, z, o), [x, z, o]); await snap(`q${q}-bottom-${n}`); }
      const db = await defs();
      beat(`q${q} the Bottom's ground: the X6 set`, (q ? db.groundB?.includes('G_WET') : !db.groundB?.includes('G_WET')) && !['G_AUR', 'G_GLINT', 'G_WIN', 'G_EDGE'].some((k) => db.groundB?.includes(k)), db);
      // ---- both zones in the game ----
      for (const id of ['drained', 'bottom']) {
        await pg.goto(A5.base + '?auto=' + id + '&q=' + q + '&sim=1&lvl=36&cloud=off');
        await pg.waitForFunction(() => window.__ready && window.__G?.player && window.__G.mode === 'play', null, { timeout: 240000 });
        await pg.waitForTimeout(2000);
        const g = await ev(() => { const z = window.__G.zone, l = z.lvl; return { id: z.id, ground: l.ground?.material.customProgramCacheKey?.().split('|').slice(0, 2).join('|'), ice: !!l.ice, act6: !!l.act6, vault: !!l.act6?.vault, fx5: !!z.L.pocket }; });
        beat(`q${q} ?auto=${id}: ground6 and act6Level, no ice mesh`, g.id === id && g.ground === 'groundPBR|' + id && !g.ice && g.act6 && g.vault, g);
        await snap(`q${q}-game-${id}`);
      }
    }
    return { pass: beats.every((x) => x.ok), failed: beats.filter((x) => !x.ok).map((x) => x.b), beats };
  } },
  // the tremble's luminance under WCAG's flash threshold (docs/act6-contract.md, Light: Photosensitivity), at quality 0 and 1:
  // in the Drained Sea at the gameplay camera (pitch 0.95, its own distance and zoom), a hearth lit 2 m north of the hero
  // with its r 6 pool (a lamp pool in an 'under' zone: true light, trembling by default), the loop held so nothing else on
  // the screen moves (no particles, water, flames, the hemisphere's drift, the hero's own light held at its mean). Each
  // frame is drawn and read back whole: each pixel's relative luminance (sRGB to linear, 0.2126 R + 0.7152 G + 0.0722 B; 1
  // the maximum), its swing max - min. The gate reads the tremble's full reach, the same on every run: the noise held at 21
  // values from -1 to +1 (light.js tickLight with the pool's trembler held, so its radius, intensity and light are the
  // game's own at each), every pixel's swing over them (a pixel's luminance rises with the noise, so this is the most any
  // stretch of it can swing). A 4 s run of the pool's own noise (a fixed seed, ticked at 60 Hz after 1 s run off) is
  // reported beside it: a random seed's 4 s reached the full reach on some runs and not on others (G1, 2 November).
  // Masks, from frames drawn with and without each part: the footprint (every pixel the pool, its disc and its light, adds
  // 0.004 or more to), the pool on the ground (the disc's own pixels, less the hearth's stones and the hero). WCAG 2.x: a
  // flash is a pair of opposing changes of 0.1 or more of the maximum relative luminance, the darker under 0.8, and a page
  // stays under the threshold while its flashing area at once is under 25% of any 10-degree field (WCAG's reference: 341 x
  // 256 px of a 1024 x 768 screen, so 2.78% of the screen). Passes, at the full reach: no pixel of the pool on the ground
  // swings by 0.1 (aim: 0.09 or less); the pixels anywhere that do (the light's foot on the hearth's stones, the hero's
  // armour) under 2.78% of the screen; both with 'reduce flicker' off and on. Reported: the worst pixel and where, the 99th
  // percentile, the pixels at or over 0.1, the footprint's mean luminance and its swing, the radius and intensity factors
  // seen. Then the noise itself (2^14 steps of gfx.js trembleStep, the share of its power in 3-7 Hz: 70% or more), two
  // seeds apart, and the Settings row (set.flicker: its chips set G.settings.flicker and it is saved). (What else moves while
  // the loop is held is the shipped Cradle's own halo on the hero's hip, a few pixels, counted in 'anywhere')
  tremble6: { q: 'world=crypt&q=0&nohouses', run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    const dir = process.argv[3] || '/tmp', out = {};
    for (const q of [0, 1]) {
      await pg.goto(A5.base + '?auto=drained&q=' + q + '&sim=1&lvl=36&cloud=off');
      await pg.waitForFunction(() => window.__ready && window.__G?.player && window.__G.mode === 'play', null, { timeout: 240000 });
      await pg.waitForTimeout(2500);
      const m = await pg.evaluate(async () => {
        const L = await import('/src/game/light.js'), Gf = await import('/src/gfx/gfx.js'), B6 = await import('/src/world/build6.js'), { groundY } = await import('/src/world/genlib.js');
        const G = window.__G, R = window.__R, pl = G.player, z = G.zone, hx = pl.x, hz = pl.z - 2;
        const prop = B6.act6Prop('hearth6'); prop.position.set(hx, groundY(z.L, hx, hz), hz); prop.userData.setLit(true); R.scene.add(prop);
        const pool = L.addLightPool(hx, hz, 6, Infinity, 'tremble6', { lamp: true, seed: 12345 });
        const lum = new Float32Array(256); for (let i = 0; i < 256; i++) { const c = i / 255; lum[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
        const gl = R.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, N = w * h, px = new Uint8Array(N * 4);
        const read = (y) => { gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); for (let i = 0, j = 0; i < N; i++, j += 4) y[i] = 0.2126 * lum[px[j]] + 0.7152 * lum[px[j + 1]] + 0.0722 * lum[px[j + 2]]; return y; };
        const drift = R.drift, hl = (R.heroLight.userData.base ?? 30) * 0.94, calm0 = G.settings.flicker;
        R.drift = 0;
        const draw = () => { R.heroLight.intensity = hl; Gf.frame(0); Gf.render(); };
        const step = () => { L.tickLight(1 / 60); draw(); };
        // (the noise held at n: the trembler's last two steps set to it and no time to step on, so tickLight reads n itself)
        const hold = (n) => { const T = pool.trem; T.y0 = T.y1 = n; T.acc = 0; L.tickLight(0); draw(); };
        const res = { trem: !!pool.trem, light: !!pool.light, w, h, amp: Gf.trembleAmp() }, av = pl.avatar?.group || pl.avatar?.root || null;
        const shot = () => { Gf.frame(0); Gf.render(); return read(new Float32Array(N)); };
        const at = (v, q) => +(v[Math.min(v.length - 1, Math.floor(v.length * q))] || 0).toFixed(4);
        // every pixel's swing over n frames, each set by set(f)
        const measure = (fp, gp, n, set) => {
          const mn = new Float32Array(fp.length).fill(9), mx = new Float32Array(fp.length).fill(-9), y = new Float32Array(N), means = [];
          let k0 = 9, k1 = -9, i0 = 9, i1 = -9;
          for (let f = 0; f < n; f++) {
            set(f); read(y);
            let sum = 0; for (let j = 0; j < fp.length; j++) { const v = y[fp[j]]; sum += v; if (v < mn[j]) mn[j] = v; if (v > mx[j]) mx[j] = v; }
            means.push(sum / fp.length); k0 = Math.min(k0, pool.k); k1 = Math.max(k1, pool.k); i0 = Math.min(i0, pool.ki); i1 = Math.max(i1, pool.ki);
          }
          const swAll = [], swG = []; let flash = 0, bright = 0, wj = -1;
          for (let j = 0; j < fp.length; j++) { const d = mx[j] - mn[j]; swAll.push(d); if (gp[fp[j]]) { swG.push(d); if (wj < 0 || d > mx[wj] - mn[wj]) wj = j; } if (d >= 0.1 && mn[j] < 0.8) flash++; bright = Math.max(bright, mx[j]); }
          swAll.sort((a, b) => a - b); swG.sort((a, b) => a - b);
          let msw = 0; for (let f = 1; f < means.length; f++) msw = Math.max(msw, Math.abs(means[f] - means[f - 1]));
          const wp = wj < 0 ? null : { x: fp[wj] % w, y: h - 1 - Math.floor(fp[wj] / w), lo: +mn[wj].toFixed(4), hi: +mx[wj].toFixed(4) };
          return { footprint: fp.length, footPct: +((fp.length / N) * 100).toFixed(1), worst: at(swAll, 1), p99: at(swAll, 0.99), p50: at(swAll, 0.5), over10: swAll.filter((v) => v >= 0.1).length,
            flashPx: flash, flashPct: +((flash / N) * 100).toFixed(4), pool: { px: swG.length, worst: at(swG, 1), p99: at(swG, 0.99), p50: at(swG, 0.5), over9: swG.filter((v) => v >= 0.09).length, at: wp },
            brightest: +bright.toFixed(3), meanY: +(means.reduce((a, b) => a + b, 0) / means.length).toFixed(4), meanSwing: +(Math.max(...means) - Math.min(...means)).toFixed(4), meanStep: +msw.toFixed(4),
            radius: [+(k0 - 1).toFixed(4), +(k1 - 1).toFixed(4)], intensity: [+(i0 - 1).toFixed(4), +(i1 - 1).toFixed(4)] };
        };
        for (const calm of [false, true]) {
          G.settings.flicker = calm;
          for (let i = 0; i < 60; i++) L.tickLight(1 / 60);
          step();
          const all = read(new Float32Array(N)), I0 = pool.light.intensity;
          prop.visible = false; if (av) av.visible = false; const bare = shot(); prop.visible = true; if (av) av.visible = true;
          pool.light.intensity = 0; const disc = shot(); pool.mesh.visible = false; const off = shot(); pool.mesh.visible = true; pool.light.intensity = I0;
          // (three frames drawn and let go after the masks: a flame's sway is set in its onBeforeRender, so the first frame a
          // prop is drawn again shows it at rest, a jump that is no tremble)
          for (let i = 0; i < 3; i++) step();
          const fp = [], gp = new Uint8Array(N);
          for (let i = 0; i < N; i++) if (all[i] - off[i] >= 0.004) { fp.push(i); if (disc[i] - off[i] >= 0.002 && Math.abs(all[i] - bare[i]) < 0.002) gp[i] = 1; }
          // the 4 s of its own noise (reported), then its full reach (the gate)
          const timed = measure(fp, gp, 240, step);
          res[calm ? 'calm' : 'full'] = { ...measure(fp, gp, 21, (f) => hold(-1 + f / 10)), timed };
        }
        G.settings.flicker = calm0; R.drift = drift;
        // (one frame left as the game shows it, for the picture)
        step();
        return res;
      });
      await pg.screenshot({ path: `${dir}/tremble6-q${q}.png` });
      out['q' + q] = m;
      const A = m.amp, F = m.full, C = m.calm, near = (v, x) => Math.abs(v[0] + x) < 2e-4 && Math.abs(v[1] - x) < 2e-4;
      beat(`q${q} the hearth's r 6 pool trembles (a lamp pool below the ice), its light its own`, m.trem && m.light, m);
      beat(`q${q} the tremble under the flash threshold at its full reach: no pixel of the pool on the ground swings by 0.1 of the maximum luminance (worst ${F?.pool.worst}; the 4 s run ${F?.timed.pool.worst}), the flashing pixels anywhere ${F?.flashPct}% of the screen (under 2.78%)`, F && F.pool.px > 10000 && F.pool.worst < 0.1 && F.flashPct < 2.78 && F.footprint > 1000 && F.timed.pool.worst <= F.pool.worst + 0.003, F);
      beat(`q${q} the radius trembles within +-${+(A.r * 100).toFixed(1)}% and the intensity within +-${+(A.i * 100).toFixed(1)}%: the full reach held is exactly that, the 4 s run within it and past half of it`, near(F.radius, A.r) && near(F.intensity, A.i) && F.timed.radius[0] >= -A.r - 1e-4 && F.timed.radius[1] <= A.r + 1e-4 && F.timed.intensity[0] >= -A.i - 1e-4 && F.timed.intensity[1] <= A.i + 1e-4 && F.timed.radius[1] - F.timed.radius[0] > A.r && F.timed.intensity[1] - F.timed.intensity[0] > A.i, { full: [F.radius, F.intensity], timed: [F.timed.radius, F.timed.intensity], amp: A });
      beat(`q${q} 'reduce flicker': +-3% radius, no intensity swing, a smaller luminance swing (the pool's worst ${C?.pool.worst}, anywhere ${C?.worst})`, C && near(C.radius, 0.03) && C.intensity[0] === 0 && C.intensity[1] === 0 && C.pool.worst < F.pool.worst && C.pool.worst < 0.1 && C.flashPct < 2.78 && C.meanSwing < F.meanSwing, C);
    }
    // the noise: its spectrum (a 2^14-point FFT, here in node), two seeds' correlation
    const ns = await pg.evaluate(async () => { const Gf = await import('/src/gfx/gfx.js'); const a = Gf.trembler(12345), b = Gf.trembler(777), n = 1 << 14, A = [], Bq = []; for (let i = 0; i < n; i++) { A.push(Gf.trembleStep(a, 1 / 60)); Bq.push(Gf.trembleStep(b, 1 / 60)); } return { A, B: Bq }; });
    const fft = (re, im) => { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } } for (let len = 2; len <= n; len <<= 1) { const an = (-2 * Math.PI) / len, wr = Math.cos(an), wi = Math.sin(an); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], j = i + k + len / 2, vr = re[j] * cr - im[j] * ci, vi = re[j] * ci + im[j] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[j] = ur - vr; im[j] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } } };
    const re = Float64Array.from(ns.A), im = new Float64Array(re.length); fft(re, im);
    let tot = 0, band = 0; for (let k = 1; k < re.length / 2; k++) { const f = (k * 60) / re.length, pw = re[k] ** 2 + im[k] ** 2; tot += pw; if (f >= 3 && f <= 7) band += pw; }
    const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length, ma = mean(ns.A), mb = mean(ns.B);
    let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < ns.A.length; i++) { sab += (ns.A[i] - ma) * (ns.B[i] - mb); saa += (ns.A[i] - ma) ** 2; sbb += (ns.B[i] - mb) ** 2; }
    const rms = Math.sqrt(saa / ns.A.length), corr = sab / Math.sqrt(saa * sbb), clip = ns.A.filter((v) => Math.abs(v) >= 0.999).length / ns.A.length;
    out.noise = { band: +(band / tot * 100).toFixed(1), rms: +rms.toFixed(3), clipped: +(clip * 100).toFixed(2), corr: +corr.toFixed(3) };
    beat(`the tremble is band-limited noise: ${out.noise.band}% of its power in 3-7 Hz, two seeds uncorrelated`, out.noise.band >= 70 && Math.abs(out.noise.corr) < 0.1 && out.noise.rms > 0.25, out.noise);
    // the Settings row: 'Reduce flicker', its chips, saved
    const st = await pg.evaluate(async () => {
      const G = window.__G; window.__D.openPanel('settings'); await new Promise((r) => setTimeout(r, 300));
      const row = [...document.querySelectorAll('.set-row')].find((r) => r.querySelector('[data-a="flk:1"]')), label = row?.querySelector('span')?.textContent;
      row?.querySelector('[data-a="flk:1"]').click(); await new Promise((r) => setTimeout(r, 100)); const on = G.settings.flicker === true && !!document.querySelector('[data-a="flk:1"].on');
      window.__D.closePanel(); await new Promise((r) => setTimeout(r, 200));
      const key = Object.keys(localStorage).find((k) => k.startsWith('skotos.save.v1')), saved = key ? JSON.parse(localStorage.getItem(key)).settings?.flicker : null;
      window.__D.openPanel('settings'); await new Promise((r) => setTimeout(r, 300)); document.querySelector('[data-a="flk:0"]')?.click(); await new Promise((r) => setTimeout(r, 100)); const off = G.settings.flicker === false; window.__D.closePanel();
      return { label, on, saved, off };
    });
    beat('the Settings row set.flicker: its On chip turns it on, it is saved, Off turns it off', st.label && st.on && st.saved === true && st.off, st);
    return { pass: beats.every((x) => x.ok), failed: beats.filter((x) => !x.ok).map((x) => x.b), ...out, beats };
  } },
  // Act V's shallowtele for this act (act6-design.md, Engine work 20; the contract's G2 list): at quality 0 and 1, on the
  // Drained Sea's silt in the hero's light and again under ATMOS.hearthDark (the Shade's last form), every tell the act adds
  // laid round the hero at the gameplay camera: the Black Flare (a 'dark' circle), a Lampbearer's Drink line (a 'dark'
  // line), the icicles' white circles, the Shade's grey-violet mirror move (an ordinary additive cone, 0x8a7aa8), the black
  // lamp's false pool (fake, its dark core) and a lure's (fake, cold), with a true pool (trembling) beside them. Each read by
  // contrast as shallowtele reads (the mean colour at points on it, drawn with it and without it, at six moments of the
  // dark's 2 Hz pulse): every one over 12 (of 255); the dark's cores darken the lit ground under them; the dark's rim
  // pulses; the 'dark' telegraph is premultiplied, the others stay additive; the false pools stay dead still and count
  // for nothing (lightAt, lampLightAt), the true one trembles. Pictures into the out dir
  darktele: { q: 'world=crypt&q=0&nohouses', run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    const dir = process.argv[3] || '/tmp', out = {};
    for (const q of [0, 1]) {
      await pg.goto(A5.base + '?auto=drained&q=' + q + '&sim=1&lvl=36&cloud=off');
      await pg.waitForFunction(() => window.__ready && window.__G?.player && window.__G.mode === 'play', null, { timeout: 240000 });
      await pg.waitForTimeout(2500);
      await pg.evaluate(async () => {
        const FXm = await import('/src/gfx/fx.js'), L = await import('/src/game/light.js'), G = window.__G, pl = G.player, x = pl.x, z = pl.z;
        // (the tells round the hero, at fixed offsets, held for the read)
        const T = window.__dt6 = { x, z, FXm, L, items: {} };
        T.items.flare = { m: FXm.teleCircle(x + 3.5, z - 3, 2, 99, 'dark').m, kind: 'circle', at: [x + 3.5, z - 3, 2] };
        T.items.icicle = { m: FXm.teleCircle(x - 3.5, z - 3, 1.2, 99, 0xe8f4ff).m, kind: 'circle', at: [x - 3.5, z - 3, 1.2] };
        T.items.drink = { m: FXm.teleLine(x - 2, z + 2.5, -Math.PI / 2, 4.5, 1, 99, 'dark').m, kind: 'line', at: [x - 2, z + 2.5, -Math.PI / 2, 4.5, 1] };
        T.items.mirror = { m: FXm.teleCone(x + 2, z + 2.5, Math.PI / 2, 3.5, 0.45, 99, 0x8a7aa8).m, kind: 'cone', at: [x + 2, z + 2.5, Math.PI / 2, 3.5, 0.45] };
        const core = L.addLightPool(x + 6.2, z - 0.5, 1.6, Infinity, 'dt6:core', { fake: true, core: 'dark', light: false });
        const lure = L.addLightPool(x - 6.2, z - 0.5, 2, Infinity, 'dt6:lure', { fake: true, light: false });
        const tru = L.addLightPool(x, z - 5.2, 1.8, Infinity, 'dt6:true', { lamp: true, light: false });
        T.items.core = { m: core.mesh, kind: 'pool', at: [x + 6.2, z - 0.5, 1.6], pool: core };
        T.items.lure = { m: lure.mesh, kind: 'pool', at: [x - 6.2, z - 0.5, 2], pool: lure };
        T.items.true = { m: tru.mesh, kind: 'pool', at: [x, z - 5.2, 1.8], pool: tru };
      });
      for (const atm of ['drained', 'hearthDark']) {
        const r = await pg.evaluate(async (atm) => {
          const T = window.__dt6, { L, FXm } = T, Gf = await import('/src/gfx/gfx.js'), { ATMOS } = await import('/src/world/atmos.js'), R = window.__R, G = window.__G;
          Gf.setAtmosphere(ATMOS[atm]); R.drift = 0;
          const hl = (R.heroLight.userData.base ?? 30) * 0.94, gl = R.renderer.getContext(), pr = R.renderer.getPixelRatio(), px = new Uint8Array(4), V = new R.camera.position.constructor();
          const draw = () => { R.heroLight.intensity = hl; L.tickLight(0); R.heroLight.intensity = hl; Gf.frame(0); Gf.render(); };
          const read = (x, z) => { V.set(x, 0.05, z).project(R.camera); gl.readPixels(Math.round((V.x * 0.5 + 0.5) * R.w * pr), Math.round((V.y * 0.5 + 0.5) * R.h * pr), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [px[0], px[1], px[2]]; };
          const lumOf = (c) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
          const mean = (pts) => { const c = [0, 0, 0]; for (const [x, z] of pts) { const v = read(x, z); for (let i = 0; i < 3; i++) c[i] += v[i] / pts.length; } return c; };
          const diff = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
          const ring = (cx, cz, r, n = 10) => Array.from({ length: n }, (_, k) => [cx + Math.sin((k * 6.283) / n) * r, cz + Math.cos((k * 6.283) / n) * r]);
          // (points on its rim and in its core, by its shape: the cone along its arc, the line along its edges and middle)
          const pts = (it) => { const a = it.at;
            if (it.kind === 'circle' || it.kind === 'pool') return { rim: ring(a[0], a[1], a[2] * 0.93), core: ring(a[0], a[1], a[2] * 0.4, 6) };
            if (it.kind === 'cone') { const rim = [], core = []; for (let k = -2; k <= 2; k++) { const an = a[2] + (k / 2) * a[4] * 0.8; rim.push([a[0] + Math.sin(an) * a[3] * 0.94, a[1] + Math.cos(an) * a[3] * 0.94]); core.push([a[0] + Math.sin(an) * a[3] * 0.5, a[1] + Math.cos(an) * a[3] * 0.5]); } return { rim, core }; }
            const sx = Math.sin(a[2]), cz = Math.cos(a[2]), rim = [], core = []; for (let k = 1; k <= 5; k++) { const d = (k / 6) * a[3]; for (const sd of [-1, 1]) rim.push([a[0] + sx * d + cz * sd * a[4] * 0.43, a[1] + cz * d - sx * sd * a[4] * 0.43]); core.push([a[0] + sx * d, a[1] + cz * d]); } return { rim, core }; };
          const res = {};
          for (const k in T.items) {
            const it = T.items[k], u = it.m.material.uniforms, P = pts(it);
            if (u.uP) u.uP.value = 0.6;
            let sum = 0, coreOn = 0, coreOff = 0, rimHi = 0, rimLo = 1e9;
            for (let j = 0; j < 6; j++) {
              if (u.uT) u.uT.value = 10 + j * 0.083; draw();
              const on = mean(P.rim), cOn = mean(P.core);
              it.m.visible = false; draw(); const off = mean(P.rim), cOff = mean(P.core); it.m.visible = true;
              const d = diff(on, off) * 0.6 + diff(cOn, cOff) * 0.4; sum += d; coreOn += lumOf(cOn) / 6; coreOff += lumOf(cOff) / 6;
              const rd = diff(on, off); rimHi = Math.max(rimHi, rd); rimLo = Math.min(rimLo, rd);
            }
            res[k] = { read: +(sum / 6).toFixed(1), coreOn: +coreOn.toFixed(4), coreOff: +coreOff.toFixed(4), rim: [+rimLo.toFixed(1), +rimHi.toFixed(1)] };
          }
          // (the blends: the dark's premultiplied, the rest additive)
          res.blend = { flare: T.items.flare.m.material.blendDst, icicle: T.items.icicle.m.material.blending, core: T.items.core.m.material.blendDst };
          draw();
          return res;
        }, atm);
        await pg.screenshot({ path: `${dir}/darktele-q${q}-${atm}.png` });
        out[`q${q}-${atm}`] = r;
        const low = Object.entries(r).filter(([k, v]) => k !== 'blend' && !(v.read > 12)).map(([k]) => k);
        beat(`q${q} ${atm}: every tell reads over 12 against its ground`, !low.length, { low, r });
        beat(`q${q} ${atm}: the dark's cores darken the ground under them (the Black Flare, the Drink line, the black lamp's pool)`, ['flare', 'drink', 'core'].every((k) => r[k].coreOn < r[k].coreOff), { flare: r.flare, drink: r.drink, core: r.core });
        beat(`q${q} ${atm}: the dark's rim pulses (2 Hz), the icicle's does not`, r.flare.rim[1] > r.flare.rim[0] * 1.25 && r.icicle.rim[1] - r.icicle.rim[0] < 2, { flare: r.flare.rim, icicle: r.icicle.rim });
        beat(`q${q} ${atm}: the 'dark' tell and the dark core premultiplied, the white circle additive`, r.blend.flare === 205 && r.blend.core === 205 && r.blend.icicle === 2, r.blend);
      }
      // the false pools stay dead still and count for nothing; the true one trembles
      const st = await pg.evaluate(async () => {
        const T = window.__dt6, { L } = T, it = T.items, uA = (k) => it[k].m.material.uniforms.uA.value, uK = (k) => it[k].m.material.uniforms.uK.value, seen = { core: new Set(), lure: new Set(), trueA: new Set(), trueK: new Set() };
        for (let i = 0; i < 30; i++) { L.tickLight(1 / 60); seen.core.add(uA('core').toFixed(5)); seen.lure.add(uA('lure').toFixed(5)); seen.trueA.add(uA('true').toFixed(5)); seen.trueK.add(uK('true').toFixed(5)); }
        const [lx, lz] = it.lure.at, [cx, cz] = it.core.at, p = it.lure.pool;
        const withLure = { at: L.lightAt(lx, lz, { ring: false }), lamp: !!L.lampLightAt(lx, lz), warm: !!L.warmAt(lx, lz), coreAt: L.lightAt(cx, cz, { ring: false }) };
        L.removeLightPool('dt6:lure'); L.removeLightPool('dt6:core');
        const without = { at: L.lightAt(lx, lz, { ring: false }), lamp: !!L.lampLightAt(lx, lz), warm: !!L.warmAt(lx, lz), coreAt: L.lightAt(cx, cz, { ring: false }) };
        return { core: seen.core.size, lure: seen.lure.size, trueA: seen.trueA.size, trueK: seen.trueK.size, withLure, without, lureLight: !!p.light, fake: !!p.fake };
      });
      beat(`q${q} false pools dead still (one intensity over 30 frames), the true one trembling`, st.core === 1 && st.lure === 1 && st.trueA > 20 && st.trueK > 20, st);
      beat(`q${q} false pools have no light of their own and count for nothing (lightAt, lampLightAt, warmAt the same without them)`, st.fake && !st.lureLight && JSON.stringify(st.withLure) === JSON.stringify(st.without), st);
    }
    return { pass: beats.every((x) => x.ok), failed: beats.filter((x) => !x.ok).map((x) => x.b), beats };
  } },
  // place6: the looks in the real zones (build6.js act6Level on gen6's layouts), on quality 0 and 1, in all four readings
  // (drained mere and dry, bottom dark and lit): every story prop stands at its gen6 spot and is handed to the zone in
  // z.lvl.act6 (hearths, lost lights with their fire at the lantern end's interact, lure posts, wreck lanterns, bells,
  // Asger's brazier; the black lamps, the shadow-walls over the shut bands, the ember's pane, Leif's dead fire, the
  // Hearth's fire (burning, with its light among the layout's), stones, niches and Gate ring; the neck only once the Mere
  // is dry), each in its first state for the reading, and the zone holding those same objects in z.act6 (world.js
  // act6Zone builds none of its own: no kind twice at a spot); the Mere's lure-rock blocked in both readings; the
  // atmosphere and ambient of the reading; the shore off the grid (sea.js shoreJit on gen6's layouts); no ring or pool
  // drawn up the vault's walls (build.js drape); a frame drawn at a spot of each (shots)
  place6: { q: 'auto=drained&q=1&lvl=36&cloud=off&seed=4242', run: async (pg) => {
    const beats = [], beat = (b, ok, x) => beats.push({ b, ok: !!ok, ...(x !== undefined ? { x } : {}) });
    const ev = (f, a) => pg.evaluate(f, a), dir = process.argv[3] || '/tmp';
    const base = process.env.BASE || 'http://localhost:5199/';
    const ready = (id) => pg.waitForFunction((id) => window.__ready && window.__G?.player && window.__G.mode === 'play' && window.__G.zone?.id === id && !document.getElementById('fade').classList.contains('on'), id, { timeout: 240000 });
    const READ = [['drained', ''], ['drained', 'ketosDown'], ['bottom', ''], ['bottom', 'blackLamp0,blackLamp1,blackLamp2,herFire']];
    for (const q of [1, 0]) for (const [zone, flags] of READ) {
      await pg.goto(base + `?auto=${zone}&q=${q}&lvl=36&cloud=off&seed=4242` + (flags ? '&flags=' + flags : ''));
      await ready(zone);
      const tag = `q${q} ${zone}${flags ? ' (' + (flags === 'ketosDown' ? 'dry' : 'lit') + ')' : ''}`;
      const r = await ev(async () => {
        const G = window.__G, z = G.zone, L = z.L, S = L.spots, A = z.lvl.act6, W = z.lvl.group.position.clone(), B = await import('/src/world/build.js'), { ATMOS } = await import('/src/world/atmos.js'), { FX } = await import('/src/gfx/fx.js');
        const at = (o, p, d = 0.6) => !!o && !!p && Math.hypot(o.position.x - p.x, o.position.z - p.z) < d && !!o.parent;
        const n = (l) => (l || []).length, bad = [];
        const each = (list, spots, key, chk = (e, s) => at(e.mesh, s)) => { if (n(list) !== n(spots)) bad.push(key + ' count ' + n(list) + '/' + n(spots)); for (const s of spots || []) { const e = list.find((q) => (q.k ?? q.i ?? q.id) === (s.k ?? s.i ?? s.id)); if (!e || !chk(e, s)) bad.push(key + ' ' + (s.k ?? s.i ?? s.id)); } };
        each(A.hearths, S.hearths, 'hearth');
        each(A.lost, S.lost, 'lost', (e, s) => { const la = e.mesh.userData.lampAt; if (!la) return false; e.mesh.updateWorldMatrix(true, false); const p = e.mesh.localToWorld(W.set(la.x, 0, la.z)); return Math.hypot(p.x - s.lamp.x, p.z - s.lamp.z) < 1.2; });
        each(A.lures.map((l, i) => ({ ...l, i })), (S.lures || []).map((l, i) => ({ ...l, i })), 'lure');
        each(A.wrecks, S.wreckLamps, 'wreck'); each(A.bells, S.bells, 'bell');
        each(A.lamps, S.lamps, 'blackLamp'); each(A.stones, S.hearth?.stones, 'stone'); each(A.niches, S.hearth?.niches, 'niche');
        if (n(A.walls) !== n(L.walls)) bad.push('walls ' + n(A.walls) + '/' + n(L.walls));
        if (S.asger && !at(A.asgerBrazier, S.asger.brazier)) bad.push('asgerBrazier');
        if (S.ember && !at(A.ember, S.ember.pane, 0.1)) bad.push('ember');
        if (S.leif && !at(A.leif, S.leif.fire, 0.1)) bad.push('leif');
        if (S.hearth && (!at(A.centre, S.hearth.fire, 0.1) || !at(A.ring, S.hearth.ring, 0.1))) bad.push('hearth centre or ring');
        const dry = L.mode === 'dry', lit = L.mode === 'lit';
        if (!!A.neck !== (z.id === 'drained' && dry)) bad.push('neck ' + !!A.neck);
        if (dry !== !!A.well) bad.push('well mouth');
        // (the zone holds the build's own props, never a second set: z.act6's lists and singles are z.lvl.act6's; no kind
        // stands twice within 0.6 m in the level)
        const held = ['hearths', 'lost', 'lures', 'wrecks', 'bells', 'lamps', 'walls', 'stones', 'niches', 'asgerBrazier', 'neck', 'ember', 'leif', 'centre', 'ring', 'rope'].filter((k) => z.act6?.[k] !== (A[k] ?? null));
        const kinds = [], P0 = W.clone(), P1 = W.clone(), twice = [];
        z.lvl.group.traverse((o) => { if (o !== z.lvl.group && o.userData?.kind) kinds.push(o); });
        for (let i = 0; i < kinds.length; i++) for (let j = i + 1; j < kinds.length; j++) if (kinds[i].userData.kind === kinds[j].userData.kind && kinds[i].getWorldPosition(P0).distanceTo(kinds[j].getWorldPosition(P1)) < 0.6) twice.push(kinds[i].userData.kind);
        // (her fire's light: one of the layout's lights at the Hearth's centre, live among the pooled lights' sources)
        const near = (l) => !!S.hearth && Math.hypot(l.x - S.hearth.fire.x, l.z - S.hearth.fire.z) < 0.5;
        const fire = { n: L.lights.filter(near).length, live: [...window.__R.sources].filter(near).map((s) => s.range) };
        // (the Mere's lure-rock a footprint in either reading: she walks round it, never through it)
        const lu = S.mere?.lure, rock = lu ? { cell: L.cells[Math.floor(lu.z) * L.w + Math.floor(lu.x)], walk: z.map.walkable(lu.x, lu.z) } : null;
        // (each in its first state for the reading)
        const st = {
          hearths: A.hearths.map((h) => !!h.mesh.userData.lit), lost: A.lost.map((h) => !!h.mesh.userData.lit), wrecks: A.wrecks.map((h) => !!h.mesh.userData.lit),
          lamps: A.lamps.map((h) => !!h.mesh.userData.lit), walls: A.walls.map((w) => w.mesh.visible), stones: A.stones.map((h) => !!h.mesh.userData.lit), niches: A.niches.map((h) => !!h.mesh.userData.lit),
          centre: A.centre ? !!A.centre.userData.lit : null, ring: A.ring ? A.ring.userData.warm : null, ember: A.ember ? A.ember.userData.glow ?? 1 : null
        };
        const off = (l) => l.every((v) => !v), on = (l) => l.every(Boolean);
        const okState = off(st.hearths) && off(st.lost) && off(st.wrecks) && on(st.lamps) && off(st.niches) && (lit ? off(st.walls) && on(st.stones) && st.ring === 1 : z.id !== 'bottom' || (on(st.walls) && off(st.stones) && st.ring === 0)) && (z.id !== 'bottom' || st.centre === true);
        // the reading's atmosphere and ambient (gfx.js keeps the scene's fog colour)
        const want = ATMOS[lit ? 'bottomLit' : z.id], fog = window.__R.scene.fog.color.getHex();
        const atm = { fog: fog.toString(16), want: want.fog.toString(16), amb: FX.ambient, wantAmb: lit ? 'thaw' : z.id };
        // the shore off the grid: the jitter on gen6's layout, some corners moved
        const J = L.jit5; let moved = 0; if (J) for (let i = 0; i < J.length; i++) if (J[i]) moved++;
        // no ring drawn up the vault's walls: a ring of 4.5 m laid at a floor cell whose wall rises 2 m within 4 m
        let drape = null;
        for (let i = 0; i < L.cells.length && !drape; i += 7) {
          if (!L.cells[i] || L.pocket[i]) continue;
          const x = i % L.w + 0.5, zz = Math.floor(i / L.w) + 0.5, g = (await import('/src/world/genlib.js')).groundY;
          if (Math.abs(g(L, x, zz)) > 0.05 || !(g(L, x + 3, zz) > 2 || g(L, x - 3, zz) > 2 || g(L, x, zz + 3) > 2 || g(L, x, zz - 3) > 2)) continue;
          const ring = B.act4Prop('lightRing'); ring.scale.setScalar(4.5); ring.position.set(x, 0, zz); ring.updateWorldMatrix(true, true); B.drape(ring, L);
          let top = -9; ring.updateWorldMatrix(true, true); ring.traverse((o) => { const P = o.geometry?.attributes.position; if (!P || !o.geometry.userData.drape) return; for (let k = 0; k < P.count; k++) top = Math.max(top, W.fromBufferAttribute(P, k).applyMatrix4(o.matrixWorld).y); });
          drape = { x, z: zz, top: +top.toFixed(2) };
        }
        return { mode: L.mode, bad, held, twice, fire, rock, st, okState, atm, moved, drape, kids: z.lvl.group.children.length };
      });
      beat(`${tag}: every story prop at its gen6 spot, handed over in z.lvl.act6`, !r.bad.length, { bad: r.bad, mode: r.mode });
      beat(`${tag}: the zone holds the build's own props (z.act6 is z.lvl.act6's), none built twice`, !r.held.length && !r.twice.length, { held: r.held, twice: r.twice });
      if (zone === 'bottom') beat(`${tag}: her fire burning with its light (one of L.lights at the Hearth's centre, r 5, live in the pooled lights)`, r.st.centre && r.fire.n === 1 && r.fire.live.length === 1 && r.fire.live[0] >= 10, r.fire);
      if (zone === 'drained') beat(`${tag}: the Mere's lure-rock a footprint (she walks round it)`, r.rock && !r.rock.cell && !r.rock.walk, r.rock);
      beat(`${tag}: each in its first state for the reading`, r.okState, r.st);
      beat(`${tag}: the reading's atmosphere and ambient`, r.atm.fog === r.atm.want && r.atm.amb === r.atm.wantAmb, r.atm);
      beat(`${tag}: the shore off the grid (shoreJit on gen6's layout)`, r.moved > 100, { moved: r.moved });
      beat(`${tag}: no ring laid up the vault's walls (at most 0.6 m over the floor)`, r.drape && r.drape.top < 0.6, r.drape);
      // a frame at the reading's place: the camera on its spot, drawn, shot
      await ev(async () => { const G = window.__G, z = G.zone, S = z.L.spots, p = z.L.mode === 'lit' ? { x: S.hearth.x, z: S.hearth.z - 4 } : z.L.mode === 'dry' ? { x: S.well.x, z: S.well.z - 5 } : z.id === 'bottom' ? S.keyx : S.hearths.find((h) => h.k === 2); const f = z.map.nearestFloor(p.x, p.z, 6); G.player.x = f.x; G.player.z = f.z; for (const a of z.actors) if (a.team === 'foe') { a.hp = 0; a.dead = true; a.remove?.(); } (await import('/src/gfx/gfx.js')).updateCamera(0, f.x, f.z, true); });
      await ev(() => new Promise((ok) => { let k = 0; const f = () => (++k >= 8 ? ok() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
      await pg.screenshot({ path: `${dir}/place6-q${q}-${zone}-${r.mode}.png` });
    }
    return { pass: beats.every((x) => x.ok), failed: beats.filter((x) => !x.ok).map((x) => x.b), beats };
  } }
};
const sc = S[name];
// (a scenario run in a child process of its own, as the soaks: this runner's browser is never opened beside it)
if (sc.child) { let res; try { res = await sc.child(out); } catch (e) { res = { error: e.message }; } console.log(name, JSON.stringify(res)); process.exit(0); }
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const FATAL = watchFatal(browser);
// (TOUCH=1: a phone, touch and all, as the co-op ui scenario)
const page = await browser.newPage(process.env.TOUCH ? { viewport: { width: +W, height: +H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: +W, height: +H } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!t.includes('ERR_CERT')) logs.push(m.type() + ': ' + t); } });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
// the test hero never dies (levelling up resets the life pool, so keep topping it up; window.__tough also puts back the
// huge pool whenever the stats are recounted, as when Karthax takes the gifts back)
// (and with window.__immortal no single blow takes her under 1: her life cannot be set below it while it holds)
await page.addInitScript(() => { setInterval(() => { const G = window.__G; if (G?.player && !G.player.__hpTrap) { const p = G.player; let v = p.hp; Object.defineProperty(p, 'hp', { get() { return v; }, set(x) { v = window.__immortal && !(x >= 1) ? 1 : x; }, configurable: true, enumerable: true }); p.__hpTrap = true; } if (G?.player && window.__tough && G.player.hpMax < 99999) G.player.hpMax = 99999; if (G?.player && G.player.hpMax >= 99999) G.player.hp = G.player.hpMax; if (G?.player && window.__immortal) { G.player.hp = G.player.hpMax; G.player.dead = false; } }, 50); });
// (a scenario's own script in every page it loads, before the game's: the cloud scenario's stand-in for claude.ai)
if (sc.init) await page.addInitScript(sc.init);
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
// (a runtime error on the game's #fatal box fails the scenario, whatever it checked)
let fatal = await fatalAll(browser, FATAL);
// (a fault a scenario sets off on purpose, named by its exact text: resume's fall f)
if (Array.isArray(res?.allowFatal)) fatal = fatal.filter((l) => !res.allowFatal.includes(l));
if (fatal.length) res = { ...(res && typeof res === 'object' ? res : { res }), pass: false, fatal: fatal.slice(0, 10) };
console.log(name, JSON.stringify(res));
if (fatal.length) console.log('FATAL ' + fatal.slice(0, 10).join('\nFATAL '));
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await browser.close();
if (fatal.length) process.exitCode = 1;
