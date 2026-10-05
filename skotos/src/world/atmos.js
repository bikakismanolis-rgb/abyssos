// Per-zone lighting and fog.
export const ATMOS = {
  town: { fog: 0x0e1424, density: 0.018, sky: 0x7a8cbe, ground: 0x2e2418, hemi: 1.15, moon: 0xb8c8ff, moonI: 1.5, exposure: 1.15, heroI: 18, heroRange: 13, zoom: 1.05 },
  forest: { fog: 0x0a1612, density: 0.028, sky: 0x5a7a7e, ground: 0x1a180e, hemi: 0.95, moon: 0xb0c8e8, moonI: 1.1, exposure: 1.25, heroI: 34, heroRange: 16, zoom: 1 },
  crypt: { fog: 0x020305, density: 0.045, sky: 0x2a3248, ground: 0x0c0a08, hemi: 0.22, moon: 0x8090b0, moonI: 0.0, exposure: 1.3, heroI: 34, heroRange: 13, zoom: 1 },
  pass: { fog: 0x1a2232, density: 0.022, sky: 0x8a9cc8, ground: 0x3a3a44, hemi: 1.05, moon: 0xc8d8ff, moonI: 1.6, exposure: 1.1, heroI: 26, heroRange: 14, zoom: 1.05 },
  halls: { fog: 0x0a0503, density: 0.034, sky: 0x3a2a24, ground: 0x140c08, hemi: 0.3, moon: 0xff9a60, moonI: 0.0, exposure: 1.3, heroI: 30, heroRange: 13, zoom: 1, heroColor: 0xffb070 },
  gate: { fog: 0x0a0612, density: 0.035, sky: 0x5a3a7a, ground: 0x120a10, hemi: 0.55, moon: 0xc0a0ff, moonI: 0.6, exposure: 1.2, heroI: 34, heroRange: 14, zoom: 1 }
};
