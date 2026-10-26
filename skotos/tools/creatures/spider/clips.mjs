// Procedural spider clips. Each clip: { dur, fps, loop, frame(t) -> solver spec, ground: 'feet' }
import { V3, Q, aa, euler, X, Y, Z, deg, clamp, lerp, smooth, smoother, frac, env, LEG_NAMES } from './lib.mjs';

// keyed track: keys [[t, v], ...], eased (smoothstep) between keys; v may be number or array
export function track(t, keys, ease = smooth) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, a] = keys[i - 1], [t1, b] = keys[i];
      const w = ease((t - t0) / (t1 - t0));
      return Array.isArray(a) ? a.map((x, k) => lerp(x, b[k], w)) : lerp(a, b, w);
    }
  }
  return keys[keys.length - 1][1];
}
const side = (n) => (n[0] === 'L' ? 1 : -1);
const num = (n) => +n[1];

export function makeClips(rig, P = {}) {
  const B0 = rig.bones[rig.B.body].p.clone();
  const STANCE_DY = P.stanceDy ?? -0.02;
  // neutral feet: bind tips pushed slightly outward, on the ground
  const N = {};
  for (const n of LEG_NAMES) {
    const t = rig.legs[n].J[4].clone();
    const out = t.clone().sub(V3(0, t.y, B0.z)).setY(0).normalize();
    N[n] = t.clone().addScaledVector(out, P.stanceOut ?? 0.02).setY(0);
  }
  // body pose helper: rotation about a pivot (default the body bone) + offset
  const body = ({ pitch = 0, yaw = 0, roll = 0, dx = 0, dy = 0, dz = 0, pivot = null } = {}) => {
    const q = euler(pitch, yaw, roll);
    const base = B0.clone().add(V3(0, STANCE_DY, 0));
    let p;
    if (pivot) { const pv = pivot.clone().add(V3(0, STANCE_DY, 0)); p = base.clone().sub(pv).applyQuaternion(q).add(pv); } else p = base;
    return { q, p: p.add(V3(dx, dy, dz)) };
  };
  // a foot carried by the body (body-relative) from its neutral spot plus an offset in body space
  const rel = (bp, n, off = V3()) => N[n].clone().add(off).sub(B0.clone().add(V3(0, STANCE_DY, 0))).applyQuaternion(bp.q).add(bp.p);
  const fangs = (open = 0, fwd = 0, asym = 0) => ({ fang_L: aa(Z, open + asym).multiply(aa(X, -fwd)), fang_R: aa(Z, -(open - asym)).multiply(aa(X, -fwd)) });
  const abd = (up = 0, yaw = 0, roll = 0) => aa(X, up).multiply(aa(Y, yaw)).multiply(aa(Z, roll));
  const planted = (extra = {}) => { const o = {}; for (const n of LEG_NAMES) o[n] = { foot: N[n].clone(), ...(extra[n] || {}) }; return o; };
  const clips = {};

  // ---------------- idle ----------------
  {
    const dur = 4;
    const shuffles = [ // leg, start, end, offset to (relative), [lift]
      { n: 'L1', t0: 0.5, t1: 0.95, d: V3(0.02, 0, 0.05), h: 0.06 },
      { n: 'L1', t0: 2.5, t1: 2.95, d: V3(-0.02, 0, -0.05), h: 0.04 },
      { n: 'R2', t0: 1.3, t1: 1.7, d: V3(-0.035, 0, 0.0), h: 0.04 },
      { n: 'R2', t0: 3.3, t1: 3.7, d: V3(0.035, 0, 0.0), h: 0.035 },
      { n: 'R1', t0: 1.9, t1: 2.25, d: V3(0, 0, 0), h: 0.05, tap: V3(-0.01, 0, 0.04) },
      { n: 'L4', t0: 3.0, t1: 3.35, d: V3(0, 0, 0), h: 0.03, tap: V3(0.02, 0, -0.02) }
    ];
    clips.idle = {
      dur, fps: 30, loop: true,
      frame(t) {
        const w = 2 * Math.PI * t / dur;
        const bp = body({ pitch: 1.2 * Math.sin(w + 0.5), yaw: 1.4 * Math.sin(w), roll: 0.7 * Math.sin(w + 1.2), dy: 0.006 * Math.sin(2 * w) - 0.004 });
        const legs = planted();
        for (const n of LEG_NAMES) { // accumulate shuffles
          const f = N[n].clone();
          for (const s of shuffles) {
            if (s.n !== n) continue;
            if (t >= s.t1) f.add(s.d);
            else if (t > s.t0) {
              const u = (t - s.t0) / (s.t1 - s.t0);
              f.addScaledVector(s.d, smoother(u));
              f.y += s.h * Math.sin(Math.PI * u);
              if (s.tap) f.addScaledVector(s.tap, Math.sin(Math.PI * u));
            }
          }
          legs[n] = { foot: f };
        }
        // a small idle fang twitch
        const tw = env(t, 1.45, 1.55, 1.7, 1.85) + 0.6 * env(t, 3.55, 3.62, 3.7, 3.8);
        return { body: bp, abdomen: abd(2.2 * Math.sin(2 * w) + 1.0 * Math.sin(w + 2), 2.2 * Math.sin(w + 1), 0), ...fangs(2 + 14 * tw + 1.5 * Math.sin(3 * w), 4 * tw), legs };
      }
    };
  }

  // ---------------- gait (walk / run) ----------------
  const GROUP = { L1: 0, R2: 0, L3: 0, R4: 0, R1: 0.5, L2: 0.5, R3: 0.5, L4: 0.5 };
  const gait = (o) => {
    const { T, duty, L, H } = o;
    const v = L / (duty * T);
    return {
      dur: T, fps: o.fps || 40, loop: true, speed: v,
      frame(t) {
        const w = 2 * Math.PI * t / T;
        const bp = body({ pitch: o.pitch + o.pitchA * Math.sin(2 * w + 0.6), yaw: o.yawA * Math.sin(w), roll: o.rollA * Math.sin(w + 0.4), dy: o.dy - o.bob * Math.cos(2 * w - 0.4), dz: o.dz || 0 });
        const legs = {};
        for (const n of LEG_NAMES) {
          const ph = frac(t / T - GROUP[n] - (num(n) - 1) * (o.meta || 0));
          const f = N[n].clone();
          if (o.wide) f.x += side(n) * o.wide;
          if (ph < duty) { const s = ph / duty; f.z += L / 2 - L * s; }
          else {
            const s = (ph - duty) / (1 - duty);
            f.z += -L / 2 + L * smoother(s);
            f.y += H * Math.pow(Math.sin(Math.PI * s), 0.75);
            f.x += side(n) * 0.015 * Math.sin(Math.PI * s);
          }
          legs[n] = { foot: f, tilt: o.tilt || 0 };
        }
        return { body: bp, abdomen: abd(o.abdUp + o.abdBob * Math.sin(2 * w - 1.2), -o.yawA * 1.6 * Math.sin(w - 0.7), 0), ...fangs(3 + 2 * Math.sin(w), 0), legs };
      }
    };
  };
  clips.walk = gait({ T: P.walkT ?? 0.6, duty: 0.6, L: P.walkL ?? 0.36, H: 0.075, pitch: -1, pitchA: 0.8, yawA: 1.8, rollA: 1.2, dy: 0, bob: 0.008, abdUp: 0, abdBob: 1.5, meta: 0.04, fps: 40 });
  clips.run = gait({ T: P.runT ?? 0.36, duty: 0.5, L: P.runL ?? 0.56, H: 0.11, pitch: -4, pitchA: 1.5, yawA: 2.2, rollA: 1.8, dy: -0.025, bob: 0.014, abdUp: 3, abdBob: 3, meta: 0.03, wide: 0.03, fps: 50 });

  // ---------------- attack: bite lunge ----------------
  {
    const dur = 1.0, HIT = 0.45;
    clips.attack = {
      dur, fps: 30, hit: HIT,
      frame(t) {
        const pitch = track(t, [[0, 0], [0.28, 13], [0.36, 10], [0.45, -11], [0.6, -8], [1.0, 0]]);
        const dz = track(t, [[0, 0], [0.28, -0.09], [0.35, -0.08], [0.45, 0.23], [0.6, 0.2], [1.0, 0]]);
        const dy = track(t, [[0, 0], [0.28, 0.05], [0.36, 0.04], [0.45, -0.035], [0.6, -0.03], [1.0, 0]]);
        const shake = env(t, 0.45, 0.48, 0.56, 0.62) * Math.sin((t - 0.45) * 60) * 3;
        const bp = body({ pitch, dz, dy, yaw: shake });
        const legs = planted();
        // front legs lift in the wind-up and slam forward with the lunge
        for (const n of ['L1', 'R1']) {
          const lift = track(t, [[0, 0], [0.26, 0.13], [0.36, 0.1], [0.43, 0], [1, 0]]);
          const fwd = track(t, [[0, 0], [0.26, 0.04], [0.36, 0.1], [0.43, 0.16], [0.62, 0.16], [0.8, 0.0], [1, 0]]);
          const step = env(t, 0.62, 0.7, 0.72, 0.8) * 0.05;
          const f = N[n].clone(); f.z += fwd; f.y += lift + step; f.x -= side(n) * 0.04 * env(t, 0.1, 0.3, 0.4, 0.5);
          legs[n] = { foot: f };
        }
        for (const n of ['L2', 'R2']) {
          const f = N[n].clone(); const fwd = track(t, [[0, 0], [0.42, 0], [0.5, 0.07], [0.78, 0.07], [0.9, 0], [1, 0]]); f.z += fwd; f.y += 0.04 * (env(t, 0.42, 0.46, 0.46, 0.5) + env(t, 0.78, 0.84, 0.84, 0.9)); legs[n] = { foot: f };
        }
        const open = track(t, [[0, 2], [0.3, 26], [0.38, 30], [0.44, -4], [0.6, -3], [1.0, 2]]);
        const fwd = track(t, [[0, 0], [0.3, 22], [0.38, 26], [0.44, -10], [0.6, -8], [1.0, 0]]);
        const aup = track(t, [[0, 0], [0.28, -5], [0.45, 7], [0.6, 4], [1, 0]]);
        return { body: bp, abdomen: abd(aup, 0, 0), ...fangs(open, fwd), legs };
      }
    };
  }

  // ---------------- attack2: front-leg stab ----------------
  {
    const dur = 1.1, HIT = 0.56;
    clips.attack2 = {
      dur, fps: 30, hit: HIT,
      frame(t) {
        const pitch = track(t, [[0, 0], [0.38, 20], [0.46, 18], [0.56, -9], [0.7, -7], [1.1, 0]]);
        const dz = track(t, [[0, 0], [0.38, -0.06], [0.56, 0.12], [0.7, 0.1], [1.1, 0]]);
        const dy = track(t, [[0, 0], [0.38, 0.07], [0.56, -0.03], [0.7, -0.02], [1.1, 0]]);
        const bp = body({ pitch, dz, dy, pivot: V3(0, 0.22, -0.16) });
        const legs = planted();
        for (const n of ['L1', 'R1']) {
          // raised high and wide, then stabbed down ahead
          const up = track(t, [[0, 0], [0.36, 0.42], [0.46, 0.46], [0.56, 0], [0.8, 0], [1.1, 0]]);
          const fwd = track(t, [[0, 0], [0.36, 0.02], [0.46, 0.05], [0.56, 0.3], [0.8, 0.3], [0.95, 0.06], [1.1, 0]]);
          const inw = track(t, [[0, 0], [0.36, -0.05], [0.46, -0.02], [0.56, 0.16], [0.8, 0.16], [0.95, 0.02], [1.1, 0]]);
          const f = N[n].clone(); f.y += up + 0.05 * env(t, 0.8, 0.88, 0.88, 0.96); f.z += fwd; f.x -= side(n) * inw;
          legs[n] = { foot: f, tilt: track(t, [[0, 0], [0.36, 30], [0.5, 10], [0.56, -10], [1.1, 0]]) };
        }
        for (const n of ['L2', 'R2']) {
          const f = N[n].clone(); const fwd = track(t, [[0, 0], [0.5, 0], [0.58, 0.08], [0.85, 0.08], [1.0, 0], [1.1, 0]]); f.z += fwd; f.y += 0.04 * (env(t, 0.5, 0.54, 0.54, 0.58) + env(t, 0.86, 0.93, 0.93, 1.0)); legs[n] = { foot: f };
        }
        const open = track(t, [[0, 2], [0.4, 22], [0.56, 30], [0.7, 10], [1.1, 2]]);
        return { body: bp, abdomen: abd(track(t, [[0, 0], [0.38, -8], [0.56, 6], [1.1, 0]])), ...fangs(open, open * 0.6), legs };
      }
    };
  }

  // ---------------- hit ----------------
  {
    const dur = 0.5;
    clips.hit = {
      dur, fps: 30,
      frame(t) {
        const k = track(t, [[0, 0], [0.07, 1], [0.2, 0.55], [0.34, -0.12], [0.5, 0]]);
        const bp = body({ pitch: 14 * k, dz: -0.12 * k, dy: 0.05 * k, roll: 9 * k, yaw: -12 * k });
        const legs = planted();
        const kp = Math.max(0, k);
        for (const n of ['L1', 'R1', 'L2', 'R2']) { const f = N[n].clone(); f.y += kp * (num(n) === 2 ? 0.04 : 0.12); f.z -= (num(n) === 2 ? 0.02 : 0.06) * kp; f.x += side(n) * 0.03 * kp; legs[n] = { foot: f }; }
        return { body: bp, abdomen: abd(4 * k, 12 * k, 0), ...fangs(2 + 26 * kp, 14 * k), legs };
      }
    };
  }

  // ---------------- rear: up on the back legs, front legs raised ----------------
  {
    const dur = 1.6, PEAK = 0.55;
    clips.rear = {
      dur, fps: 30, hit: PEAK,
      frame(t) {
        const k = track(t, [[0, 0], [0.12, -0.12], [0.5, 1], [1.12, 1], [1.5, 0], [1.6, 0]]);
        const kk = Math.max(0, k);
        const wav = env(t, 0.45, 0.6, 1.0, 1.15);
        const bp = body({ pitch: 36 * k + 2 * wav * Math.sin(t * 9), dy: 0.09 * kk - 0.03 * Math.max(0, -k) * 8, dz: -0.05 * kk, roll: 2 * wav * Math.sin(t * 6), pivot: V3(0, 0.2, -0.2) });
        const legs = planted();
        const raise = { L1: [0.5, 0.2, 0.06], R1: [0.5, 0.2, 0.06], L2: [0.32, 0.12, 0.1], R2: [0.32, 0.12, 0.1] };
        for (const [n, [up, fw, outw]] of Object.entries(raise)) {
          const ph = num(n) === 1 ? 0 : 1.4;
          const lift = track(t, [[0, 0], [0.1, 0], [0.42, 1], [1.12, 1], [1.42, 0], [1.6, 0]]);
          const wave = wav * (0.05 * Math.sin(t * 10 + ph + (side(n) > 0 ? 0 : 2)));
          // target in body space (follows the reared body) blended from the planted foot
          const air = rel(bp, n, V3(side(n) * outw, up + wave, fw - 0.0));
          const f = N[n].clone().lerp(air, lift);
          legs[n] = { foot: f, tilt: 40 * lift };
        }
        // third legs shuffle forward a touch to brace
        for (const n of ['L3', 'R3']) { const f = N[n].clone(); const fw = track(t, [[0, 0], [0.2, 0], [0.36, 0.06], [1.2, 0.06], [1.42, 0], [1.6, 0]]); f.z += fw; f.y += 0.04 * (env(t, 0.2, 0.28, 0.28, 0.36) + env(t, 1.2, 1.31, 1.31, 1.42)); legs[n] = { foot: f }; }
        const open = 4 + 26 * kk + 10 * wav * Math.max(0, Math.sin(t * 7));
        return { body: bp, abdomen: abd(-30 * kk, 3 * wav * Math.sin(t * 5)), ...fangs(open, 18 * kk), legs };
      }
    };
  }

  // ---------------- spit: rear slightly, jerk abdomen and fangs forward ----------------
  {
    const dur = 0.9, HIT = 0.45;
    clips.spit = {
      dur, fps: 30, hit: HIT,
      frame(t) {
        const pitch = track(t, [[0, 0], [0.32, 16], [0.4, 17], [0.46, -6], [0.58, -4], [0.9, 0]]);
        const dz = track(t, [[0, 0], [0.32, -0.05], [0.4, -0.055], [0.46, 0.07], [0.58, 0.05], [0.9, 0]]);
        const dy = track(t, [[0, 0], [0.32, 0.05], [0.46, 0.0], [0.9, 0]]);
        const bp = body({ pitch, dz, dy, pivot: V3(0, 0.2, -0.18) });
        const legs = planted();
        for (const n of ['L1', 'R1']) { const f = N[n].clone(); const up = track(t, [[0, 0], [0.3, 0.1], [0.44, 0.02], [0.5, 0], [0.9, 0]]); f.y += up; f.z += track(t, [[0, 0], [0.3, 0.02], [0.48, 0.08], [0.7, 0.08], [0.9, 0]]) ; f.x -= side(n) * 0.03 * up * 10; legs[n] = { foot: f }; }
        const aup = track(t, [[0, 0], [0.32, -14], [0.4, -16], [0.46, 16], [0.56, 10], [0.9, 0]]);
        const open = track(t, [[0, 2], [0.3, 10], [0.4, 8], [0.46, 34], [0.6, 26], [0.9, 2]]);
        const fwd = track(t, [[0, 0], [0.3, 4], [0.4, 0], [0.46, 30], [0.6, 22], [0.9, 0]]);
        return { body: bp, abdomen: abd(aup, 0, 0), ...fangs(open, fwd), legs };
      }
    };
  }

  // ---------------- leap (in place: the game carries it forward) ----------------
  {
    const dur = 1.2, TAKEOFF = 0.4, LAND = 0.84;
    clips.leap = {
      dur, fps: 30, hit: LAND, takeoff: TAKEOFF, land: LAND,
      frame(t) {
        let dy;
        if (t < TAKEOFF) dy = track(t, [[0, 0], [0.26, -0.09], [0.32, -0.09], [TAKEOFF, 0.1]]);
        else if (t < LAND) { const u = (t - TAKEOFF) / (LAND - TAKEOFF); dy = 0.1 + (0.0 - 0.1) * u + 4 * 0.42 * u * (1 - u); }
        else dy = track(t, [[LAND, 0], [0.92, -0.08], [1.05, -0.02], [1.2, 0]]);
        const pitch = track(t, [[0, 0], [0.28, -6], [TAKEOFF, 12], [0.6, 4], [LAND, -8], [0.95, -5], [1.2, 0]]);
        const bp = body({ pitch, dy });
        const legs = planted();
        // airborne pose: front legs reach forward/up, back legs trail
        const air = env(t, TAKEOFF - 0.03, 0.52, 0.72, LAND);
        const AIR = { 1: V3(0.03, 0.12, 0.24), 2: V3(0.06, 0.1, 0.12), 3: V3(0.06, 0.08, -0.04), 4: V3(0.02, 0.1, -0.16) };
        for (const n of LEG_NAMES) {
          // leaving: planted feet stay until the leg runs out of reach; then they follow the body
          const go = smooth((t - (TAKEOFF - 0.05)) / 0.12) * (1 - smooth((t - (LAND - 0.1 + (num(n) <= 2 ? 0 : 0.03))) / 0.1));
          const o = AIR[num(n)].clone(); o.x *= side(n);
          const a = rel(bp, n, o.clone().multiplyScalar(air));
          const f = N[n].clone().lerp(a, go);
          f.y = Math.max(f.y, 0);
          legs[n] = { foot: f, tilt: 25 * air };
        }
        const open = 3 + 22 * air + 18 * env(t, LAND - 0.04, LAND, LAND + 0.04, LAND + 0.15);
        return { body: bp, abdomen: abd(track(t, [[0, 0], [0.3, -4], [TAKEOFF, 8], [0.7, -6], [LAND, 6], [1.0, -2], [1.2, 0]])), ...fangs(open, open * 0.5), legs };
      }
    };
  }

  // ---------------- die: legs curl in, body sinks ----------------
  {
    const dur = 1.5;
    const CURL = { yaw: 0, a: P.curl || [22, 60, -148, -200] }; // death curl (absolute in-plane angles)
    clips.die = {
      dur, fps: 30, ground: 'lift',
      frame(t, ctx) {
        const drop = track(t, [[0, 0], [0.12, -0.03], [0.2, -0.02], [0.62, 1], [0.72, 0.94], [0.82, 1], [1.5, 1]], (w) => w * w * (3 - 2 * w));
        const dy = drop * (P.dieDrop ?? -0.17) + 0.03 * env(t, 0, 0.06, 0.08, 0.16);
        const bp = body({ pitch: track(t, [[0, 0], [0.1, 7], [0.62, -4], [0.75, -2], [1.5, -2.5]]), roll: track(t, [[0, 0], [0.1, -3], [0.62, 6], [1.5, 7]]), dy, dz: -0.02 * drop });
        const legs = {};
        const order = { 1: 0.0, 2: 0.08, 3: 0.04, 4: 0.12 };
        for (const n of LEG_NAMES) {
          const t0 = 0.12 + order[num(n)] + (side(n) > 0 ? 0 : 0.05);
          const c = smooth((t - t0) / 0.75);
          const tw = (n === 'R2' ? env(t, 1.08, 1.14, 1.16, 1.3) : n === 'L4' ? env(t, 1.22, 1.27, 1.29, 1.42) : 0) * 0.35;
          const splay = env(t, 0, 0.06, 0.1, 0.22);
          const ik = { foot: N[n].clone().add(V3(side(n) * 0.04 * splay, 0.03 * splay, 0)) };
          legs[n] = { mix: [ik, { ang: CURL }, clamp(c - tw, 0, 1)] };
        }
        return { body: bp, abdomen: abd(track(t, [[0, 0], [0.1, 8], [0.62, -6], [0.75, -3], [1.5, -4]]), 0, track(t, [[0, 0], [0.62, 4], [1.5, 5]])), ...fangs(track(t, [[0, 2], [0.1, 24], [0.6, 10], [1.0, -6], [1.5, -6]]), track(t, [[0, 0], [0.1, 12], [1.0, -12], [1.5, -12]])), legs };
      }
    };
  }
  return { clips, N };
}
