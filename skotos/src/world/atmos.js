// Per-zone lighting and fog. Act V keys (missing keys read 0): aur, aurDark (the aurora's brightness, and how black it has
// gone: gfx.js hands them to sea.js), drift (0-1: the hemisphere light wanders toward the aurora's green), aurCol (the
// aurora's colour, [r, g, b] linear: the coast's green when missing; the true aurora greener and whiter).
import * as THREE from 'three';
export const ATMOS = {
  town: { fog: 0x0e1424, density: 0.018, sky: 0x7a8cbe, ground: 0x2e2418, hemi: 1.15, moon: 0xb8c8ff, moonI: 1.5, exposure: 1.15, heroI: 18, heroRange: 13, zoom: 1.05 },
  forest: { fog: 0x0a1612, density: 0.028, sky: 0x5a7a7e, ground: 0x1a180e, hemi: 0.95, moon: 0xb0c8e8, moonI: 1.1, exposure: 1.25, heroI: 34, heroRange: 16, zoom: 1 },
  crypt: { fog: 0x020305, density: 0.045, sky: 0x2a3248, ground: 0x0c0a08, hemi: 0.22, moon: 0x8090b0, moonI: 0.0, exposure: 1.3, heroI: 34, heroRange: 13, zoom: 1 },
  pass: { fog: 0x1a2232, density: 0.022, sky: 0x8a9cc8, ground: 0x3a3a44, hemi: 1.05, moon: 0xc8d8ff, moonI: 1.6, exposure: 1.1, heroI: 26, heroRange: 14, zoom: 1.05 },
  halls: { fog: 0x0a0503, density: 0.034, sky: 0x3a2a24, ground: 0x140c08, hemi: 0.3, moon: 0xff9a60, moonI: 0.0, exposure: 1.3, heroI: 30, heroRange: 13, zoom: 1, heroColor: 0xffb070 },
  // Act III: an autumn held still under a low gold sun; after the First Autumn the air clears and the light turns copper
  weep: { fog: 0x33280f, density: 0.024, sky: 0xd8b070, ground: 0x2e200e, hemi: 1.05, moon: 0xffd898, moonI: 1.55, exposure: 1.35, heroI: 22, heroRange: 13, zoom: 1.05 },
  weepAutumn: { fog: 0x302418, density: 0.021, sky: 0xc89a70, ground: 0x2c1c10, hemi: 1.05, moon: 0xffcc90, moonI: 1.6, exposure: 1.32, heroI: 22, heroRange: 13, zoom: 1.05 },
  // inside the First Oak: dark, warm and close; the channels and cocoons give the light
  heart: { fog: 0x0c0804, density: 0.038, sky: 0x6a4420, ground: 0x140c06, hemi: 0.42, moon: 0xffb060, moonI: 0.0, exposure: 1.4, heroI: 30, heroRange: 13, zoom: 1, heroColor: 0xffc890 },
  heartAutumn: { fog: 0x0e0a06, density: 0.034, sky: 0x7a5430, ground: 0x160e08, hemi: 0.48, moon: 0xffc890, moonI: 0.3, exposure: 1.4, heroI: 30, heroRange: 13, zoom: 1, heroColor: 0xffc890 },
  gate: { fog: 0x0a0612, density: 0.035, sky: 0x5a3a7a, ground: 0x120a10, hemi: 0.55, moon: 0xc0a0ff, moonI: 0.6, exposure: 1.2, heroI: 34, heroRange: 14, zoom: 1 },
  // Act IV: the Field of Ash under a dull red sun behind the ash (the Cradle is the light that matters); after the
  // Unmaking the sky clears to stars; at the new fire's dawn the light comes back warm
  ashfield: { fog: 0x1c1816, density: 0.028, sky: 0x5a4a46, ground: 0x1c1612, hemi: 0.62, moon: 0x9a5a48, moonI: 0.55, exposure: 1.28, heroI: 24, heroRange: 10, zoom: 1, heroColor: 0xffb070 },
  ashfieldStars: { fog: 0x0e121a, density: 0.022, sky: 0x46567a, ground: 0x12141a, hemi: 0.5, moon: 0x8aa4d8, moonI: 0.7, exposure: 1.28, heroI: 22, heroRange: 10, zoom: 1, heroColor: 0xffc890 },
  ashfieldDawn: { fog: 0x2c2a30, density: 0.018, sky: 0xc8a0a0, ground: 0x2a2420, hemi: 0.95, moon: 0xffd8a8, moonI: 1.3, exposure: 1.2, heroI: 20, heroRange: 13, zoom: 1.05 },
  // inside the Black Anvil: a banked forge, warming with each breath of the Great Bellows (heatAtmos); cold after the Unmaking
  forge: { fog: 0x0e0705, density: 0.032, sky: 0x4a2014, ground: 0x160b07, hemi: 0.42, moon: 0xff7a40, moonI: 0.12, exposure: 1.32, heroI: 26, heroRange: 11, zoom: 1, heroColor: 0xffb070 },
  forgeHot: { fog: 0x2a1206, density: 0.029, sky: 0x7a3016, ground: 0x24100a, hemi: 0.55, moon: 0xff8a40, moonI: 0.28, exposure: 1.34, heroI: 26, heroRange: 11, zoom: 1, heroColor: 0xffb070 },
  forgeCold: { fog: 0x1a1a1c, density: 0.03, sky: 0x40404a, ground: 0x121214, hemi: 0.45, moon: 0x9aa0b0, moonI: 0.15, exposure: 1.28, heroI: 26, heroRange: 11, zoom: 1, heroColor: 0xffc890 },
  // Act V: the Frozen Coast under the green aurora (its light drifting over the snow); the arrival with the horizon open;
  // the black aurora after the Freeze; the true aurora once the sea is lit
  coast: { fog: 0x0b1416, density: 0.02, sky: 0x4a6a78, ground: 0x1a2024, hemi: 0.85, moon: 0xb8d8c8, moonI: 1.0, exposure: 1.2, heroI: 22, heroRange: 11, zoom: 1.05, heroColor: 0xffe8c8, aur: 0.8, aurDark: 0, drift: 0.55 },
  // (after the Freeze the night itself is another: the sky gone violet-black, the moon cold and weak, the fog closing in
  // toward black; the hero's warm light, the lit hearth and the sea-lights are all the warmth there is)
  coastFrozen: { fog: 0x06070e, density: 0.027, sky: 0x2c2e4c, ground: 0x0e0e18, hemi: 0.5, moon: 0x8c96d8, moonI: 0.6, exposure: 1.08, heroI: 26, heroRange: 11.5, zoom: 1.05, heroColor: 0xffe0b8, aur: 0.35, aurDark: 1, drift: 0 },
  // the Farthest Light under the black aurora; the Skotos fight (closer), its Night; the true aurora after the naming
  farlight: { fog: 0x070a10, density: 0.026, sky: 0x2a3448, ground: 0x101418, hemi: 0.6, moon: 0x8a9ac8, moonI: 0.7, exposure: 1.3, heroI: 24, heroRange: 10, zoom: 1, heroColor: 0xffe8c8, aur: 0.3, aurDark: 1, drift: 0 },
  farlightNight: { fog: 0x020304, density: 0.05, sky: 0x1a2030, ground: 0x08090c, hemi: 0.2, moon: 0x6a7aa8, moonI: 0.1, exposure: 1.3, heroI: 24, heroRange: 10, zoom: 1.25, heroColor: 0xffe8c8, aur: 0, aurDark: 1, drift: 0 },
  farlightAurora: { fog: 0x0a1612, density: 0.018, sky: 0x5a8a78, ground: 0x121a18, hemi: 0.95, moon: 0xb8d8c8, moonI: 1.0, exposure: 1.25, heroI: 22, heroRange: 11, zoom: 1, heroColor: 0xffe8c8, aur: 1, aurDark: 0, drift: 0.6, aurCol: [0.32, 1.0, 0.62] }
};
ATMOS.coastCine = { ...ATMOS.coast, density: 0.008 };
// once the sea is lit: the true aurora, greener and whiter, its light on the snow (the hemisphere green)
ATMOS.coastAurora = { ...ATMOS.coast, sky: 0x5a9682, ground: 0x142420, fog: 0x0c1c18, hemi: 1.05, moon: 0xc4ecd6, moonI: 1.1, aur: 1, drift: 0.7, aurCol: [0.32, 1.0, 0.62] };
ATMOS.farlightFight = { ...ATMOS.farlight, zoom: 1.25 };
// Whitecliff once the sea is lit: the true aurora over the beacon hill (G_AUR at half), the hemisphere drifting green
ATMOS.townAurora = { ...ATMOS.town, aur: 0.5, drift: 0.45, aurCol: [0.32, 1.0, 0.62] };
// an atmosphere between a and b (k 0-1): colours in linear light, numbers straight (world.js eases with it)
const _ca = new THREE.Color(), _cb = new THREE.Color();
export function mixAtmos(a, b, k) {
  const o = {};
  for (const key in b) {
    const x = a[key] ?? b[key], y = b[key];
    if (typeof y !== 'number') o[key] = y;
    else if (key === 'fog' || key === 'sky' || key === 'ground' || key === 'moon' || key === 'heroColor') o[key] = _ca.set(x).lerp(_cb.set(y), k).getHex();
    else o[key] = x + (y - x) * k;
  }
  return o;
}
// the Forge at heat k (0 banked .. 3 full breath; fractions blend; below 0 the cold forge)
const mixHex = (a, b, t) => { let o = 0; for (const sh of [16, 8, 0]) o |= Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)) << sh; return o; };
export function heatAtmos(k) {
  if (k < 0) return ATMOS.forgeCold;
  const A = ATMOS.forge, B = ATMOS.forgeHot, t = Math.min(k, 3) / 3, o = {};
  for (const key in A) o[key] = typeof A[key] !== 'number' ? A[key] : /fog|sky|ground|moon$|Color/.test(key) ? mixHex(A[key], B[key], t) : A[key] + (B[key] - A[key]) * t;
  return o;
}
