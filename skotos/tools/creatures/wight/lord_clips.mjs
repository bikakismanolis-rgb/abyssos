// Barrow lord clips: KayKit (CC0) two-handed sword set and UAL (CC0) locomotion / reactions, retargeted and reworked
// for a heavy, regal undead swordsman. Fills ctx.clips / ctx.hit / ctx.info, returns the first idle frame.
import { THREE, FPS, inPlace, closeLoop, cloneFrame, blendFrame, concat, timewarp, shiftHip, ease, qAxis, mpos } from './lib.mjs';
import { keyed, layer, amplify, damp, bend, plant, ground, tipTrack, speeds, argmax, meanFrame, gripWorld } from './anim.mjs';

export async function buildClips(ctx) {
  const { clips, hit, info, T, rig, R, SOLE, grips, curl, UPPER, LEGS, ARM, FING, SPINE, NECK, X, Yax, Zax, deg } = ctx;
  const BLADE = 1.1;   // greatsword: point ~1.1 m from the grip
  const restQ = (b) => T.RT.get(b).local.q;
  // both hands closed: right around the hilt, left nearly closed (second hand on the hilt / free fist)
  const fists = (fr, kl = 0.85) => { for (const f of fr) { for (const b of [...FING('r'), ...FING('l')]) f.get(b).q.copy(restQ(b)); curl(f, 'r', 1); curl(f, 'l', kl); } return fr; };
  const strikeAt = (fr, from = 0, to = fr.length) => { const sp = speeds(tipTrack(rig, fr, grips.r, BLADE)); const i = argmax(sp, from, to); return { i, t: +(i / FPS).toFixed(3), v: +sp[i].toFixed(2) }; };
  const body = (fr, fn) => { const ref = fr.map(cloneFrame); fr.forEach((f, i) => fn(f, i, i / FPS)); plant(rig, fr, ref); return fr; };
  // two-handed hold: the left fist goes on the hilt 13 cm below the right one (towards the pommel); when the left arm
  // cannot reach, the sword (right fist, same orientation) is drawn towards the left shoulder first. Two-bone arm IK.
  const gripLInv = new THREE.Matrix4().compose(grips.l.p, grips.l.q, new THREE.Vector3(1, 1, 1)).invert();
  const gripRInv = new THREE.Matrix4().compose(grips.r.p, grips.r.q, new THREE.Vector3(1, 1, 1)).invert();
  const RT = T.RT, armLen = (s) => RT.get('upperarm_' + s).wp.distanceTo(RT.get('lowerarm_' + s).wp) + RT.get('lowerarm_' + s).wp.distanceTo(RT.get('hand_' + s).wp);
  const maxL = armLen('l') * 0.97, maxR = armLen('r') * 0.97;
  const qOf = (m) => { const q = new THREE.Quaternion(); m.decompose(new THREE.Vector3(), q, new THREE.Vector3()); return q; };
  const twoHand = (fr, w = () => 1, gap = 0.13) => {
    let moved = 0;
    fr.forEach((f, i) => {
      const k = typeof w === 'function' ? w(i) : w; if (k <= 0) return;
      const W0 = rig.fk(f), G = gripWorld(rig, f, grips.r), yb = new THREE.Vector3().setFromMatrixColumn(G, 1).normalize();
      const shL = mpos(W0.get('upperarm_l')), shR = mpos(W0.get('upperarm_r'));
      const R0 = mpos(G), Rp = R0.clone();
      const wristL = (rp) => mpos(G.clone().setPosition(rp.clone().addScaledVector(yb, -gap)).multiply(gripLInv));
      for (let it = 0; it < 12; it++) {
        const wl = wristL(Rp), d = wl.clone().sub(shL), ex = d.length() - maxL;
        if (ex <= 0.001) break;
        Rp.addScaledVector(d.normalize(), -ex);
      }
      const shift = Rp.distanceTo(R0) * k; moved = Math.max(moved, shift);
      if (shift > 0.002) {
        const Gn = G.clone().setPosition(R0.clone().lerp(Rp, k)).multiply(gripRInv);
        rig.twoBone(f, 'upperarm_r', 'lowerarm_r', 'hand_r', mpos(Gn), qOf(Gn));
      }
      const G2 = gripWorld(rig, f, grips.r);
      const tgt = G2.clone().setPosition(mpos(G2).addScaledVector(yb, -gap)).multiply(gripLInv);
      const cur = rig.fk(f).get('hand_l');
      rig.twoBone(f, 'upperarm_l', 'lowerarm_l', 'hand_l', mpos(cur).lerp(mpos(tgt), k), qOf(cur).slerp(qOf(tgt), k));
    });
    return fr;
  };
  const wrap = (fr, I0, a = 0.15, b = 0.3) => [...keyed([[0, I0], [a, fr[0]]]).slice(0, -1), ...fr, ...keyed([[0, fr[fr.length - 1]], [b, I0]]).slice(1)];

  // idle: two-handed guard, slowed to a heavy breathing rhythm, back straightened, head level
  let idle = fists(R('ka', '2H_Melee_Idle'));
  inPlace(T, idle, { loop: true });
  idle = timewarp(idle, [[0, 0], [(idle.length - 1) / FPS, 2.4]]);
  bend(rig, idle, [['spine_01', 0.4], ['spine_02', 0.3], ['spine_03', 0.3]], X, () => deg(-6));
  closeLoop(idle); twoHand(idle); info.idle = ground(T, rig, idle, 'const', SOLE);
  clips.idle = idle;
  const I0 = idle[0], IM = meanFrame(idle);

  // walk: heavy measured stride (UAL walk), sword kept in guard
  {
    let w = R('u1', 'Walk_Loop');
    inPlace(T, w, { loop: true });
    w = layer(w, () => IM, UPPER, (i, b) => (/^(spine|neck|Head)/.test(b) ? 0.6 : 0.85));
    w = timewarp(w, [[0, 0], [(w.length - 1) / FPS, 1.55]]);
    fists(w); closeLoop(w); twoHand(w); info.walk = ground(T, rig, w, 'stance', SOLE);
    clips.walk = w;
  }
  // run: UAL jog, leaning in, sword held low across the body
  {
    let r = R('u1', 'Jog_Fwd_Loop');
    inPlace(T, r, { loop: true });
    r = layer(r, () => IM, UPPER, (i, b) => (/^(spine|neck|Head)/.test(b) ? 0.4 : 0.75));
    bend(rig, r, [['spine_01', 0.4], ['spine_02', 0.3], ['spine_03', 0.3]], X, () => deg(10));
    fists(r); closeLoop(r); twoHand(r); info.run = ground(T, rig, r, 'stance', SOLE);
    clips.run = r;
  }
  // attack: two-handed overhead chop (KayKit), bigger wind-up and the body thrown into the cut
  {
    let a = fists(R('ka', '2H_Melee_Attack_Chop'));
    inPlace(T, a, { keepXZ: 0.5 });
    a = amplify(a, a[0], 1.2, UPPER);
    const s0 = strikeAt(a);
    body(a, (f, i, t) => {
      const w = ease(t, s0.t - 0.3, s0.t) * (1 - ease(t, s0.t + 0.25, s0.t + 0.6)), wb = ease(t, 0.1, s0.t - 0.3) * (1 - ease(t, s0.t - 0.3, s0.t - 0.05));
      shiftHip(T, f, new THREE.Vector3(0, -0.07 * w, 0.12 * w - 0.05 * wb));
      bend(rig, [f], [['spine_01', 0.35], ['spine_02', 0.35], ['spine_03', 0.3]], X, () => deg(22 * w - 10 * wb));
    });
    a = wrap(a, I0, 0.12, 0.3); twoHand(a);
    info.attack = ground(T, rig, a, 'perframe', SOLE);
    const s = strikeAt(a); hit.attack = s.t; info.attackStrike = s;
    clips.attack = a;
  }
  // attack2: horizontal sweep (KayKit two-handed slice), hips and shoulders wound up harder
  {
    let a = fists(R('ka', '2H_Melee_Attack_Slice'));
    inPlace(T, a, { keepXZ: 0.5 });
    a = amplify(a, a[0], 1.25, [...SPINE, 'pelvis']);
    a = timewarp(a, [[0, 0], [0.3, 0.42], [(a.length - 1) / FPS, (a.length - 1) / FPS + 0.18]]);
    a = wrap(a, I0, 0.12, 0.3); twoHand(a);
    info.attack2 = ground(T, rig, a, 'perframe', SOLE);
    const s = strikeAt(a); hit.attack2 = s.t; info.attack2Strike = s;
    clips.attack2 = a;
  }
  // slam: leaping overhead smash (KayKit jump chop with a low, heavy hop) ending with the blade in the ground
  {
    let a = fists(R('kk', '1H_Melee_Attack_Jump_Chop', { hipScale: [0.3, 0.32, 0.3] }));
    inPlace(T, a, { keepXZ: 0.4 });
    // the free left hand joins the hilt during the smash
    a = amplify(a, a[0], 1.15, UPPER);
    {
      // the landing drives the blade down into the ground: torso folds forward, knees give
      const tips0 = tipTrack(rig, a, grips.r, BLADE), sp0 = speeds(tips0), i0 = argmax(sp0, Math.floor(a.length * 0.3)), ts = i0 / FPS + 0.05;
      body(a, (f, i, t) => {
        const w = ease(t, ts - 0.12, ts + 0.02) * (1 - ease(t, ts + 0.35, ts + 0.7));
        shiftHip(T, f, new THREE.Vector3(0, -0.12 * w, 0.08 * w));
        bend(rig, [f], [['spine_01', 0.35], ['spine_02', 0.35], ['spine_03', 0.3]], X, () => deg(28 * w));
        for (const s of ['r', 'l']) rig.rotateWorld(f, 'upperarm_' + s, qAxis(1, 0, 0, deg(18 * w)));
      });
    }
    a = wrap(a, I0, 0.12, 0.4); twoHand(a);
    info.slam = ground(T, rig, a, 'perframe', SOLE);
    // the strike lands where the blade tip is lowest after moving fastest
    const tips = tipTrack(rig, a, grips.r, BLADE), sp = speeds(tips);
    const iv = argmax(sp, Math.floor(a.length * 0.3)); let lo = iv; for (let i = iv; i < Math.min(a.length, iv + 8); i++) if (tips[i].y < tips[lo].y) lo = i;
    hit.slam = +(lo / FPS).toFixed(3); info.slamStrike = { fast: iv, low: lo, tipY: +tips[lo].y.toFixed(2) };
    clips.slam = a;
  }
  // cast: raises the sword arm to call the dead (KayKit raise), the head thrown back at the peak
  {
    let c = fists(R('kk', 'Spellcast_Raise'));
    inPlace(T, c, { keepXZ: 0 });
    const gy = c.map((f) => mpos(rig.fk(f).get('hand_r')).y), top = argmax(gy);
    bend(rig, c, [['neck_01', 0.5], ['Head', 0.5]], X, (i) => deg(-18 * ease(i / FPS, top / FPS - 0.4, top / FPS) * (1 - ease(i / FPS, top / FPS + 0.5, top / FPS + 0.9))));
    c = wrap(c, I0, 0.15, 0.3);
    info.cast = ground(T, rig, c, 'perframe', SOLE);
    hit.cast = +((top + Math.round(0.15 * FPS)) / FPS).toFixed(3);
    clips.cast = c;
  }
  // warcry: both arms flung up, chest out, head back
  {
    let c = fists(R('ka', 'Cheer'));
    inPlace(T, c, { keepXZ: 0 });
    c = timewarp(c, [[0, 0], [0.3, 0.38], [(c.length - 1) / FPS, (c.length - 1) / FPS + 0.3]]);
    const n = c.length;
    bend(rig, c, [['spine_02', 0.5], ['spine_03', 0.5]], X, (i) => deg(-12 * ease(i / FPS, 0.1, 0.45) * (1 - ease(i / FPS, (n - 1) / FPS - 0.4, (n - 1) / FPS))));
    bend(rig, c, [['neck_01', 0.5], ['Head', 0.5]], X, (i) => deg(-22 * ease(i / FPS, 0.15, 0.5) * (1 - ease(i / FPS, (n - 1) / FPS - 0.4, (n - 1) / FPS))));
    c = wrap(c, I0, 0.15, 0.35);
    info.warcry = ground(T, rig, c, 'perframe', SOLE);
    const gy = c.map((f) => mpos(rig.fk(f).get('hand_r')).y);
    hit.warcry = +(argmax(gy) / FPS).toFixed(3);
    clips.warcry = c;
  }
  // hit: recoil (UAL, exaggerated)
  {
    let h = fists(R('u1', 'Hit_Chest'));
    inPlace(T, h, { keepXZ: 0.5 });
    h = amplify(h, h[0], 2.0, UPPER);
    h = timewarp(h, [[0, 0], [0.1, 0.08], [(h.length - 1) / FPS, 0.45]]);
    h = wrap(h, I0, 0.06, 0.2); twoHand(h);
    info.hit = ground(T, rig, h, 'perframe', SOLE);
    clips.hit = h;
  }
  // die: falls to his knees and pitches forward (KayKit death B), never below the ground
  {
    let d = fists(R('ka', 'Death_B', { hipScale: [1, 1, 1] }));
    inPlace(T, d, { keepXZ: 0.6 });
    d = [...keyed([[0, I0], [0.15, d[0]]]).slice(0, -1), ...d];
    info.die = ground(T, rig, d, 'perframe', rig.VERTS.filter((v, i) => i % 2 === 0));
    clips.die = d;
  }
  return I0;
}
