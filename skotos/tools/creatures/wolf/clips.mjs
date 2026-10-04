// Procedural wolf clips. Each clip = array of solver specs (one per frame at FPS) built from time functions.
import { V3, Q, deg, X, Y, Z, euler, smooth, smoother, lerp, clamp, frac, LEGS } from './lib.mjs';

export const FPS = 30;
const TAU = Math.PI * 2;
const sn = (x) => Math.sin(x * TAU), cs = (x) => Math.cos(x * TAU);
const bump = (t, a, b) => (t <= a || t >= b) ? 0 : Math.sin(Math.PI * (t - a) / (b - a)); // half-sine bump on [a,b]
const ramp = (t, a, b) => smooth((t - a) / (b - a));
const env = (t, a, b, c, d) => ramp(t, a, b) * (1 - ramp(t, c, d)); // rise a..b, hold, fall c..d
const gauss = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
// cubic hermite on [0,1] from 0 to 1 with end slopes m0, m1
const herm = (s, m0, m1) => { const s2 = s * s, s3 = s2 * s; return (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) + (s3 - s2) * m1; };

export function makeClips(rig, P = {}) {
  const R = (n) => rig.R(n);
  const REST = {}; for (const [k, L] of Object.entries(LEGS)) REST[k] = R(L.p).wp.clone();
  const HIP_Y = R('pelvis').wp.y;
  // ---- posture shared by everything: head carried lower, tail lower, ears a touch back ----
  const posture = (o = {}) => {
    const r = {
      neck_02: euler(o.n2 ?? -7), neck_03: euler(o.n3 ?? -8), head: euler(o.hd ?? 10),
      tail_01: euler(o.t1 ?? -14), tail_02: euler(o.t2 ?? 4), tail_03: euler(4), tail_04: euler(2),
      ear_l: euler(0, 0, 0), ear_r: euler(0, 0, 0),
      eyelid_l: euler(0, 0, o.sq ?? 10), eyelid_r: euler(0, 0, -(o.sq ?? 10))   // narrowed, menacing eyes
    };
    return r;
  };
  const mul = (r, bone, q) => { r[bone] = (r[bone] || Q()).clone().multiply(q); return r; };
  // jaw open (deg, + = open)
  const jaw = (r, a) => mul(r, 'jaw', euler(0, 0, 0).multiply(Q().setFromAxisAngle(X, a * deg)));
  // eyelids: close 0..1 (1 = shut)
  const lids = (r, c) => { if (c > 0) { mul(r, 'eyelid_l', Q().setFromAxisAngle(X, 30 * c * deg)); mul(r, 'eyelid_r', Q().setFromAxisAngle(X, 30 * c * deg)); } return r; };
  const blink = (t, at) => Math.max(0, 1 - Math.abs(t - at) / 0.07);

  // ---------------- gait generator ----------------
  // G: { T, duty, phase:{fl,fr,hl,hr}, stride (m slid during stance), zoff:{front,hind}, lift:{front,hind},
  //      tiltTD/LO/SW:{front,hind}, curlSW, body(t) -> {pos, body, rot} }
  const ROOTP = { fl: R('upperarm_l').wp, fr: R('upperarm_r').wp, hl: R('thigh_l').wp, hr: R('thigh_r').wp };
  const legAng = (k, ball, pos) => Math.atan2(ROOTP[k].z + (pos ? pos.z : 0) - ball.z, ROOTP[k].y + (pos ? pos.y : 0) - ball.y) / deg;
  const ANG0 = {}; for (const k of Object.keys(LEGS)) ANG0[k] = legAng(k, REST[k]);
  // G: { T, v (m/s), duty:{front,hind}, phase:{fl,fr,hl,hr}, zoff:{front,hind}, lift:{front,hind}, kTilt:{front,hind},
  //      heel:{front,hind} (extra metapodial tilt at lift-off), tiltTD, tiltSW (swing flexion), curlSW, rollCurl, scap }
  function gaitLegs(t, G, pos) {
    const legs = {};
    for (const [k, L] of Object.entries(LEGS)) {
      const fr = L.front ? 'front' : 'hind';
      const duty = G.duty[fr];
      const u = frac(t / G.T - G.phase[k]);
      const base = REST[k].clone(); base.z += G.zoff[fr]; base.x *= G.xs ?? 1;
      const Ls = G.v * duty * G.T;
      const out = { ball: base.clone(), plant: 1, tilt: 0, curl: 0, scap: 0 };
      let stanceTilt;
      if (u < duty) {
        const s = u / duty;
        out.ball.z = base.z + Ls / 2 - Ls * s;
        const a = legAng(k, out.ball, pos) - ANG0[k];
        out.tilt = G.kTilt[fr] * a + G.heel[fr] * smooth((s - 0.45) / 0.55) + (G.tiltTD[fr] ?? 0) * (1 - smooth(s / 0.4));
        // the paw rolls over the toes just before lift-off
        const roll = smooth((s - 0.8) / 0.2);
        out.plant = 1 - roll * 0.6; out.curl = roll * (G.rollCurl[fr] ?? 15);
      } else {
        const s = (u - duty) / (1 - duty);
        const vSt = Ls / duty, vSw = Ls / (1 - duty);
        const m = (G.swingSlope ?? 0.25) * vSt / vSw;
        out.ball.z = base.z - Ls / 2 + Ls * herm(s, -m, -m * 0.5);
        out.ball.y = base.y + G.lift[fr] * Math.sin(Math.PI * Math.pow(s, G.liftSkew?.[fr] ?? 0.8));
        // tilt: from the lift-off value, through the swing flexion, to the touch-down value
        const zLO = base.z - Ls / 2, zTD = base.z + Ls / 2;
        const aLO = G.kTilt[fr] * (legAng(k, V3(0, base.y, zLO), pos) - ANG0[k]) + G.heel[fr];
        const aTD = G.kTilt[fr] * (legAng(k, V3(0, base.y, zTD), pos) - ANG0[k]) + (G.tiltTD[fr] ?? 0);
        out.tilt = lerp(aLO, aTD, smooth((s - 0.45) / 0.5)) + G.tiltSW[fr] * Math.pow(bump(s, 0, 0.9), 1.3);
        out.curl = (G.curlSW[fr] ?? 40) * bump(s, 0.05, 0.92) + (G.rollCurl[fr] ?? 15) * (1 - smooth(s / 0.25));
        out.plant = 0.4 * (1 - smooth(s / 0.2)) + smooth((s - 0.82) / 0.18);
      }
      if (L.front) out.scap = (G.scap ?? 0) * (out.ball.z - base.z) / Math.max(0.01, Ls / 2);
      legs[k] = out;
    }
    return legs;
  }

  const C = {};
  // ===== idle (4 s loop): breathing, weight shifts, slow look-around, ear flicks, tail sway =====
  {
    const T = 4.0, n = Math.round(T * FPS);
    C.idle = { loop: true, frames: [] };
    for (let i = 0; i < n; i++) {
      const t = i / FPS, u = t / T;
      const r = posture();
      const br = sn(u * 3);                           // 3 breaths per loop
      mul(r, 'spine_02', euler(0.8 * br)); mul(r, 'spine_03', euler(-0.8 * br));
      const look = 14 * Math.sin(u * TAU) * smooth(Math.abs(Math.sin(u * TAU)) * 1.6);   // look left, then right
      mul(r, 'neck_02', euler(-2 + 2 * sn(u * 2 + 0.2), look * 0.35, 0)); mul(r, 'neck_03', euler(0, look * 0.35)); mul(r, 'head', euler(1.5 * sn(u * 2), look * 0.3, -look * 0.15));
      mul(r, 'ear_l', euler(0, 0, -10 * gauss(u, 0.3, 0.02))); mul(r, 'ear_r', euler(0, 0, 10 * gauss(u, 0.72, 0.02)));
      mul(r, 'tail_01', euler(0, 6 * sn(u * 2))); mul(r, 'tail_02', euler(0, 6 * sn(u * 2 - 0.1))); mul(r, 'tail_03', euler(0, 7 * sn(u * 2 - 0.2))); mul(r, 'tail_04', euler(0, 8 * sn(u * 2 - 0.3)));
      jaw(r, 1.5 + 1.5 * br);
      lids(r, Math.max(blink(t, 1.3), blink(t, 3.1), blink(t, 3.35)));
      const pos = V3(0.012 * sn(u), -0.012 - 0.004 * br, 0.008 * sn(u * 2));
      const legs = {}; for (const k of Object.keys(LEGS)) legs[k] = { ball: REST[k].clone(), plant: 1 };
      C.idle.frames.push({ pos, body: euler(0.4 * br, 0, -1.2 * sn(u)), rot: r, legs });
    }
  }

  // ===== walk: lateral-sequence walk =====
  {
    const G = {
      T: P.walkT ?? 1.0, v: P.walkV ?? 1.05, duty: { front: 0.63, hind: 0.63 }, phase: { hl: 0, fl: 0.25, hr: 0.5, fr: 0.75 },
      zoff: { front: P.wzf ?? 0.1, hind: P.wzh ?? 0.13 }, lift: { front: 0.15, hind: 0.11 }, kTilt: { front: 0.8, hind: 0.5 },
      heel: { front: 12, hind: 14 }, tiltTD: { front: 0, hind: -4 }, tiltSW: { front: 90, hind: 30 }, curlSW: { front: 30, hind: 45 },
      rollCurl: { front: 12, hind: 12 }, liftSkew: { front: 0.75, hind: 0.8 }, scap: 6
    };
    const n = Math.round(G.T * FPS);
    C.walk = { loop: true, frames: [], G };
    for (let i = 0; i < n; i++) {
      const t = i / FPS, u = t / G.T;
      const r = posture({ n2: -9, n3: -9, hd: 12 });
      // lateral spine flex follows the hind legs; shoulders/hips counter-roll
      mul(r, 'spine_01', euler(0, 2.5 * sn(u + 0.1))); mul(r, 'spine_02', euler(0, 2.0 * sn(u + 0.05))); mul(r, 'spine_03', euler(0, -2.5 * sn(u + 0.0), 2.5 * sn(u + 0.3)));
      mul(r, 'neck_02', euler(2.0 * sn(u * 2 + 0.1), -2 * sn(u), 0)); mul(r, 'head', euler(-2.5 * sn(u * 2 + 0.15), -2 * sn(u)));
      mul(r, 'tail_01', euler(0, 8 * sn(u + 0.2))); mul(r, 'tail_02', euler(0, 8 * sn(u + 0.1))); mul(r, 'tail_03', euler(0, 9 * sn(u))); mul(r, 'tail_04', euler(0, 10 * sn(u - 0.1)));
      jaw(r, 2);
      const pos = V3(0.012 * sn(u + 0.25), -(P.walkCrouch ?? 0.035) + 0.012 * cs(u * 2 + 0.1), 0);
      const legs = gaitLegs(t, G, pos);
      C.walk.frames.push({ pos, body: euler(1.2 * sn(u * 2 + 0.35), 2.0 * sn(u + 0.1), -2.5 * sn(u + 0.05)), rot: r, legs });
    }
    C.walk.speed = G.v;
  }

  // ===== run: rotary gallop =====
  {
    const G = {
      T: P.runT ?? 0.48, v: P.runV ?? 5.5, duty: { front: 0.27, hind: 0.27 }, phase: { hl: 0, hr: 0.09, fr: 0.4, fl: 0.5 },
      zoff: { front: P.rzf ?? 0.12, hind: P.rzh ?? 0.08 }, lift: { front: 0.24, hind: P.rlh ?? 0.13 }, kTilt: { front: 0.9, hind: 0.6 },
      heel: { front: 25, hind: 22 }, tiltTD: { front: 0, hind: -5 }, tiltSW: { front: 105, hind: P.rtsh ?? 22 }, curlSW: { front: 40, hind: 45 },
      rollCurl: { front: 20, hind: 20 }, liftSkew: { front: 0.7, hind: P.rskh ?? 1.0 }, scap: 8, swingSlope: 0.4
    };
    const n = Math.round(G.T * FPS);
    C.run = { loop: true, frames: [], G };
    for (let i = 0; i < n; i++) {
      const t = i / FPS, u = t / G.T;
      const r = posture({ n2: -12, n3: -8, hd: 10, t1: -24, t2: -4 });
      // spine: flexed (rounded) while the hind legs swing under (u ~ 0.8-1.0), extended at hind push-off (u ~ 0.4);
      // the pelvis takes half of the bend the other way, so the bend changes the back's shape more than its pitch
      const flex = cs(u - 0.92), F = P.runFlex ?? 5;   // +1 flexed, -1 extended
      mul(r, 'spine_01', euler(-F * flex)); mul(r, 'spine_02', euler(-F * flex)); mul(r, 'spine_03', euler(-0.6 * F * flex));
      const pitch = (P.runPitch ?? 4) * cs(u - 0.33);
      const pelvisPitch = pitch + 1.3 * F * flex, chest = pitch - 1.3 * F * flex;
      // head steadied against the chest pitch
      mul(r, 'neck_02', euler(-chest * 0.45)); mul(r, 'neck_03', euler(-chest * 0.3)); mul(r, 'head', euler(-chest * 0.25 + 2 * sn(u * 2)));
      mul(r, 'tail_01', euler(-5 * flex)); mul(r, 'tail_02', euler(5 * sn(u - 0.1))); mul(r, 'tail_03', euler(6 * sn(u - 0.2))); mul(r, 'tail_04', euler(7 * sn(u - 0.3)));
      mul(r, 'ear_l', euler(14, 0, -4)); mul(r, 'ear_r', euler(14, 0, 4));
      jaw(r, 8 + 4 * sn(u));
      const pos = V3(0, -(P.runCrouch ?? 0.09) + 0.02 * cs(u - 0.88) + 0.03 * cs(2 * (u - 0.38)), 0.03 * sn(u));
      const legs = gaitLegs(t, G, pos);
      C.run.frames.push({ pos, body: euler(pelvisPitch, 0, 0), rot: r, legs });
    }
    C.run.speed = G.v;
  }

  // ================= one-shots =================
  // keyframe track: keys [[t, v, ease?], ...]; ease of the segment ending at that key: 's' smooth (default), 'lin', 'in', 'out'
  const K = (keys) => (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1, e] = keys[i], w = (t - t0) / (t1 - t0);
      const ww = e === 'lin' ? w : e === 'in' ? w * w : e === 'out' ? 1 - (1 - w) * (1 - w) : smooth(w);
      return v0 + (v1 - v0) * ww;
    }
    return keys[keys.length - 1][1];
  };
  const STAND_Y = -0.012, STAND_JAW = 1.5;
  // the idle's first frame, as a base for one-shots (they start and end on it)
  const standRot = () => { const r = posture(); mul(r, 'neck_02', euler(-0.1)); return r; };
  // o: { pos:[x,y,z] (added to the stand offset), body:[p,y,r], rot:{bone:[p,y,r]}, jaw (added), legs:{k:{dx,dy,dz,tilt,curl,plant,rel,relOff,scap,pole}} }
  function shotSpec(o) {
    const r = standRot();
    for (const [b, e] of Object.entries(o.rot || {})) mul(r, b, euler(...e));
    jaw(r, STAND_JAW + (o.jaw || 0));
    if (o.lids) lids(r, o.lids);
    const pos = V3(...(o.pos || [0, 0, 0])); pos.y += STAND_Y;
    const legs = {};
    for (const k of Object.keys(LEGS)) {
      const l = (o.legs && o.legs[k]) || {};
      const ball = REST[k].clone().add(V3(l.dx || 0, l.dy || 0, l.dz || 0));
      legs[k] = { ball, tilt: l.tilt || 0, curl: l.curl || 0, plant: l.plant ?? 1, scap: l.scap || 0, rel: l.rel || 0, relOff: l.relOff ? V3(...l.relOff) : undefined, pole: l.pole || 0 };
    }
    return { pos, body: euler(...(o.body || [0, 0, 0])), rot: r, legs };
  }
  function shot(name, dur, fn, extra = {}) {
    if (name === 'die') extra.ground = 'lift';
    const n = Math.round(dur * FPS) + 1;
    C[name] = { loop: false, frames: [], ...extra };
    for (let i = 0; i < n; i++) C[name].frames.push(shotSpec(fn(i / FPS, i / (n - 1))));
  }
  const HIT = {};
  // paw step: lift arc between t0..t1 moving dz0 -> dz1
  const step = (t, t0, t1, dz0, dz1, h, tiltSw = 60, curlSw = 30) => {
    const s = clamp((t - t0) / (t1 - t0), 0, 1), air = bump(s, 0, 1);
    return { dz: lerp(dz0, dz1, smooth(s)), dy: h * air, tilt: tiltSw * Math.pow(air, 1.2), curl: curlSw * air, plant: 1 - air };
  };

  // ===== attack: lunge, snapping bite, tug, withdraw =====
  {
    const D = 1.0, hit = 0.42; HIT.attack = hit;
    const pz = K([[0, 0], [0.24, -0.07], [hit, 0.2, 'out'], [0.6, 0.16], [D, 0]]);
    const py = K([[0, 0], [0.24, -0.06], [hit, -0.05], [0.65, -0.03], [D, 0]]);
    const bp = K([[0, 0], [0.24, 4], [hit, -6, 'out'], [0.65, -3], [D, 0]]);
    const n2 = K([[0, 0], [0.24, 10], [hit, -14, 'out'], [0.62, -8], [D, 0]]);
    const n3 = K([[0, 0], [0.24, 8], [hit, -10, 'out'], [0.62, -6], [D, 0]]);
    const hd = K([[0, 0], [0.24, 10], [hit, 4], [0.62, 2], [D, 0]]);
    const jw = K([[0, 0], [0.2, 12], [0.36, 42, 'out'], [hit + 0.02, 2, 'in'], [0.62, 4], [D, 0]]);
    const ear = K([[0, 0], [0.2, 22], [0.75, 18], [D, 0]]);
    shot('attack', D, (t) => {
      const tug = bump(t, hit + 0.02, 0.72), sh = Math.sin((t - hit) * 2 * Math.PI * 4.5) * tug;
      return {
        pos: [0, py(t), pz(t)], body: [bp(t), 3 * sh, 0],
        rot: { neck_02: [n2(t), 6 * sh, 0], neck_03: [n3(t), 7 * sh, 4 * sh], head: [hd(t), 6 * sh, 8 * sh], ear_l: [ear(t), 0, 0], ear_r: [ear(t), 0, 0],
          spine_03: [0, -2 * sh, 0], tail_01: [-6 * env(t, 0, 0.2, 0.7, 1), 0, 0] },
        jaw: jw(t),
        legs: {
          fl: step(t, 0.27, hit + 0.02, 0, 0.2, 0.09), fr: step(t, 0.25, hit, 0, 0.17, 0.1),
          ...(t > 0.6 ? { fl: step(t, 0.68, 0.9, 0.2, 0, 0.07), fr: step(t, 0.62, 0.84, 0.17, 0, 0.07) } : {}),
          hl: step(t, 0.33, 0.48, 0, 0.1, 0.05, 25, 30), hr: step(t, 0.36, 0.5, 0, 0.08, 0.05, 25, 30),
          ...(t > 0.6 ? { hl: step(t, 0.7, 0.86, 0.1, 0, 0.05, 25, 30), hr: step(t, 0.74, 0.9, 0.08, 0, 0.05, 25, 30) } : {})
        }
      };
    });
  }
  // ===== attack2: rending side-slash bite (head whips from its right to its left), then a rip =====
  {
    const D = 0.9, hit = 0.36; HIT.attack2 = hit;
    const pz = K([[0, 0], [0.2, -0.04], [hit, 0.12, 'out'], [0.55, 0.08], [D, 0]]);
    const py = K([[0, 0], [0.2, -0.05], [hit, -0.04], [D, 0]]);
    const yaw = K([[0, 0], [0.2, -22], [hit, 18, 'out'], [0.5, 26], [0.7, 8], [D, 0]]);
    const roll = K([[0, 0], [0.2, 10], [hit, -12, 'out'], [0.5, -16], [D, 0]]);
    const n2 = K([[0, 0], [0.2, 6], [hit, -10, 'out'], [0.6, -6], [D, 0]]);
    const jw = K([[0, 0], [0.12, 16], [0.28, 40], [hit + 0.02, 3, 'in'], [0.6, 5], [D, 0]]);
    const ear = K([[0, 0], [0.15, 22], [0.7, 15], [D, 0]]);
    shot('attack2', D, (t) => ({
      pos: [0.03 * yaw(t) / 20, py(t), pz(t)], body: [0, yaw(t) * 0.18, roll(t) * 0.2],
      rot: { spine_02: [0, yaw(t) * 0.12, 0], spine_03: [0, yaw(t) * 0.15, 0], neck_02: [n2(t), yaw(t) * 0.35, 0], neck_03: [n2(t) * 0.6, yaw(t) * 0.3, roll(t) * 0.4],
        head: [4, yaw(t) * 0.2, roll(t)], ear_l: [ear(t), 0, 0], ear_r: [ear(t), 0, 0], tail_01: [0, -yaw(t) * 0.3, 0], tail_02: [0, -yaw(t) * 0.3, 0] },
      jaw: jw(t),
      legs: { fl: step(t, 0.18, 0.38, 0, 0.12, 0.08), ...(t > 0.5 ? { fl: step(t, 0.6, 0.8, 0.12, 0, 0.06) } : {}),
        fr: step(t, 0.2, 0.34, 0, 0.04, 0.05), ...(t > 0.5 ? { fr: step(t, 0.62, 0.78, 0.04, 0, 0.04) } : {}) }
    }));
  }
  // ===== pounce: quick gather, leap (in place: the game carries it forward between takeoff and landing), lands biting =====
  // timed for the game's leap (flight starts as the clip starts and lasts ~0.45 s): takeoff 0.14 s, landing 0.48 s
  {
    const D = 1.25, take = 0.14, land = 0.48, hit = 0.52; HIT.pounce = hit;
    C.pounceInfo = { takeoff: take, land, hit };
    const py = K([[0, 0], [0.12, -0.14], [take, -0.12], [0.3, 0.24, 'out'], [land - 0.02, 0.06, 'in'], [0.6, -0.1, 'out'], [0.85, -0.04], [D, 0]]);
    const pz = K([[0, 0], [0.12, -0.06], [0.3, 0.1], [land, 0.12], [0.7, 0.06], [D, 0]]);
    const bp = K([[0, 0], [0.12, -4], [0.21, 13, 'out'], [0.33, 1], [land, -10], [0.6, -7], [0.9, -2], [D, 0]]);
    const flex = K([[0, 0], [0.12, 5], [0.22, -6], [0.36, -5], [land, 2], [0.7, 1], [D, 0]]);
    const n2 = K([[0, 0], [0.12, -10], [0.24, -5], [land, -12], [hit, -17, 'out'], [0.75, -8], [D, 0]]);
    const hd = K([[0, 0], [0.12, 12], [0.24, 4], [land, 8], [hit, 0], [0.75, 2], [D, 0]]);
    const jw = K([[0, 0], [0.1, 8], [0.3, 38], [land, 42], [hit, 2, 'in'], [0.7, 5], [D, 0]]);
    const ear = K([[0, 0], [0.1, 12], [0.22, 24], [0.85, 18], [D, 0]]);
    const tl = K([[0, 0], [0.12, -12], [0.26, 8], [land, 10], [0.85, 0], [D, 0]]);
    // legs: front lift first, hind push off then trail; body-relative while airborne
    const fRel = K([[0, 0], [0.08, 0], [0.17, 1], [0.42, 1], [land, 0], [D, 0]]);
    const hRel = K([[0, 0], [0.17, 0], [0.25, 1], [0.48, 1], [0.6, 0], [D, 0]]);
    const fOffZ = K([[0, 0], [0.1, 0], [0.17, 0.02], [0.3, 0.34], [0.42, 0.3], [D, 0]]);
    const fOffY = K([[0, 0], [0.1, 0], [0.17, 0.24], [0.3, 0.08], [0.42, -0.02], [D, 0]]);
    const hOffZ = K([[0, 0], [0.2, 0], [0.26, -0.32], [0.38, -0.12], [0.5, 0.16], [D, 0]]);
    const hOffY = K([[0, 0], [0.26, 0.0], [0.38, 0.1], [0.5, 0.08], [D, 0]]);
    const fTilt = K([[0, 0], [0.1, 10], [0.17, 95], [0.25, 40], [0.36, -20], [land, -10], [0.6, 0], [D, 0]]);
    const hTilt = K([[0, 0], [0.12, -10], [0.19, 20], [0.26, 45], [0.38, 30], [0.55, 0], [0.62, 8], [D, 0]]);
    const fLandZ = K([[0, 0], [land, 0], [land + 0.001, 0.26], [0.6, 0.24], [1.0, 0], [D, 0]]);
    const hLandZ = K([[0, 0], [0.6, 0], [0.60001, 0.1], [1.05, 0], [D, 0]]);
    shot('pounce', D, (t) => {
      const lg = {};
      for (const k of ['fl', 'fr']) {
        const sd = k === 'fl' ? 0.015 : 0;
        lg[k] = { rel: fRel(t - sd), relOff: [0, fOffY(t - sd), fOffZ(t - sd)], dz: fLandZ(t - sd), tilt: fTilt(t - sd), curl: 40 * env(t, 0.1, 0.17, 0.26, 0.34), plant: 1 - fRel(t - sd), scap: 12 * env(t, 0.24, 0.3, 0.44, 0.56) };
      }
      for (const k of ['hl', 'hr']) {
        const sd = k === 'hl' ? 0.012 : 0;
        lg[k] = { rel: hRel(t - sd), relOff: [0, hOffY(t - sd), hOffZ(t - sd)], dz: hLandZ(t - sd), tilt: hTilt(t - sd), curl: 35 * env(t, 0.18, 0.26, 0.4, 0.5), plant: 1 - hRel(t - sd) };
      }
      return {
        pos: [0, py(t), pz(t)], body: [bp(t) + 1.3 * flex(t), 0, 0],
        rot: { spine_01: [-flex(t), 0, 0], spine_02: [-flex(t), 0, 0], spine_03: [-0.6 * flex(t), 0, 0], neck_02: [n2(t), 0, 0], neck_03: [n2(t) * 0.5, 0, 0], head: [hd(t), 0, 0],
          ear_l: [ear(t), 0, 0], ear_r: [ear(t), 0, 0], tail_01: [tl(t), 0, 0], tail_02: [tl(t) * 0.5, 0, 0] },
        jaw: jw(t), legs: lg
      };
    });
  }
  // ===== howl: head thrown back, long note, settles =====
  {
    const D = 3.4;
    const up = K([[0, 0], [0.7, 1], [2.7, 1.08, 'lin'], [3.3, 0], [D, 0]]);
    const jw = K([[0, 0], [0.55, 2], [0.95, 24], [1.6, 21], [2.2, 26], [2.6, 23], [3.0, 2], [D, 0]]);
    const crouch = K([[0, 0], [0.6, 1], [2.8, 1], [3.3, 0], [D, 0]]);
    shot('howl', D, (t) => {
      const u = up(t), c = crouch(t), trem = 0.8 * Math.sin(t * 2 * Math.PI * 5) * env(t, 0.9, 1.2, 2.5, 2.7);
      return {
        pos: [0, -0.05 * c, -0.04 * c], body: [5 * c, 0, 0],
        rot: { spine_02: [2 * c, 0, 0], spine_03: [4 * c, 0, 0], neck_01: [5 * u, 0, 0], neck_02: [20 * u + trem, 0, 0], neck_03: [16 * u + trem, 0, 0], head: [14 * u, 0, 0],
          ear_l: [16 * c, 0, -6 * c], ear_r: [16 * c, 0, 6 * c], tail_01: [-10 * c, 0, 0], tail_02: [-4 * c, 0, 0] },
        jaw: jw(t), lids: 0.55 * env(t, 0.7, 1.1, 2.6, 3.0),
        legs: { hl: { dz: 0.04 * c, tilt: -6 * c }, hr: { dz: 0.04 * c, tilt: -6 * c } }
      };
    });
  }
  // ===== hit: flinch from a blow to the head/shoulder =====
  {
    const D = 0.55;
    const a = K([[0, 0], [0.07, 1, 'out'], [0.2, 0.75], [D, 0]]);
    shot('hit', D, (t) => {
      const w = a(t);
      return {
        pos: [0.05 * w, -0.04 * w, -0.08 * w], body: [4 * w, -6 * w, 6 * w],
        rot: { spine_03: [3 * w, -6 * w, 0], neck_02: [10 * w, -12 * w, 0], neck_03: [6 * w, -8 * w, 6 * w], head: [8 * w, -10 * w, 10 * w],
          ear_l: [28 * w, 0, 0], ear_r: [28 * w, 0, 0], tail_01: [-14 * w, 0, 0] },
        jaw: 12 * Math.sin(Math.min(1, t / 0.3) * Math.PI), lids: 0.7 * w
      };
    });
  }
  // ===== die: recoil, legs buckle, rolls onto its right side, head drops, last breath =====
  {
    const D = 2.0;
    const roll = K([[0, 0], [0.3, 4], [0.85, 62, 'in'], [1.05, 92, 'out'], [1.2, 88], [D, 89]]);
    const py = K([[0, 0], [0.15, -0.03], [0.5, -0.22], [0.85, -0.5, 'in'], [1.05, P.dieY ?? -0.58, 'out'], [D, P.dieY ?? -0.58]]);
    const px = K([[0, 0], [0.5, -0.04], [1.05, P.dieX ?? -0.2], [D, P.dieX ?? -0.2]]);
    const pz = K([[0, 0], [0.15, -0.06], [0.6, 0.02], [1.05, 0.05], [D, 0.05]]);
    const bp = K([[0, 0], [0.12, 6], [0.5, -6], [0.9, -2], [D, -1]]);
    const rec = K([[0, 0], [0.1, 1, 'out'], [0.4, 0.3], [0.7, 0]]);
    const limp = K([[0, 0], [0.5, 0], [1.0, 1], [D, 1]]);
    const fold = K([[0, 0], [0.45, 0], [0.75, 1], [1.1, 0.3], [D, 0.3]]);
    const nk = K([[0, 0], [0.5, -10], [1.0, -6], [1.25, -14], [D, -12]]);
    const ny = K([[0, 0], [0.7, -4], [1.1, P.dieNy ?? -6], [1.35, P.dieNy2 ?? -9], [D, P.dieNy2 ?? -9]]);
    const jw = K([[0, 0], [0.1, 18], [0.5, 8], [1.05, 14], [1.4, 9], [D, 10]]);
    const breath = (t) => 2.5 * bump(t, 1.45, 1.9);
    const fdz = K([[0, 0], [0.3, 0.02], [0.6, -0.08], [D, -0.08]]);
    shot('die', D, (t) => {
      const r = rec(t), L = limp(t);
      const lg = {};
      // planted at first (buckling), then carried by the body as it rolls, loosely flexed
      const legRel = (k, front) => ({ rel: L, floor: REST[k].y, relOff: front ? [0, 0.08, 0.06] : [0, 0.1, -0.08], dz: front ? fdz(t) : 0, tilt: (front ? 35 : 25) * L + (front ? -10 : 0) * (1 - L), curl: 30 * L, plant: 1 - L,
        pole: 0 });
      lg.fl = legRel('fl', true); lg.fr = legRel('fr', true); lg.hl = legRel('hl', false); lg.hr = legRel('hr', false);
      // the upper (left) legs fall forward/over a little more loosely
      lg.fl.relOff = [(P.dieUf ?? -0.04) * L, 0.06, 0.12]; lg.hl.relOff = [(P.dieUh ?? -0.03) * L, 0.12, -0.02];
      // the lower (right) legs are pushed out from under the body (+X in body space = up once rolled)
      lg.fr.relOff = [(P.dieFx ?? 0.1) * L, 0.08, 0.04]; lg.hr.relOff = [(P.dieHx ?? 0.12) * L, 0.1, -0.1];
      const fo = fold(t); for (const k of ['fl', 'fr', 'hl', 'hr']) lg[k].relOff[1] += 0.25 * fo;
      return {
        pos: [px(t), py(t), pz(t)], body: [bp(t) + 6 * r, -4 * r, roll(t)],
        rot: { spine_02: [-3 * L - breath(t), 0, 0], spine_03: [-2 * L + breath(t), 0, 0], neck_02: [nk(t) + 12 * r, ny(t), 0], neck_03: [nk(t) * 0.5 + 8 * r, ny(t) * 0.6, 0],
          head: [-4 * L + 6 * r, ny(t) * 0.3, 10 * L], ear_l: [24 * r + 10 * L, 0, 0], ear_r: [24 * r + 40 * L, 0, 15 * L],
          tail_01: [-18 * L, -6 * L, 0], tail_02: [-6 * L, -8 * L, 0], tail_03: [0, -6 * L, 0] },
        jaw: jw(t), legs: lg, lids: 0.8 * env(t, 0.05, 0.12, 0.25, 0.4) + 0.65 * ramp(t, 1.0, 1.6)
      };
    });
  }
  C.HIT = HIT;
  return C;
}
