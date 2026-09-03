// Generates the app icons procedurally (no image assets in the repo, per PLAN.md):
// the bathyscaphe from drawPlayer(), its searchlight cone, and the deep-sea gradient.
//   node scripts/make-icons.js   -> public/icons/*.png + public/icons/icon.svg
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const out = new URL('../public/icons/', import.meta.url);
await mkdir(out, { recursive: true });

// `pad` = fraction of the canvas kept clear around the vessel (maskable icons need a wide safe zone)
function svg(size, pad) {
  const s = size, c = s / 2;
  const r = s * (0.5 - pad) * 0.42;          // vessel radius, same proportions as P.r in the game
  const rot = -28;                           // nose up-right, as when diving forward
  const cone = r * 7;                        // searchlight reach
  const arc = 0.95;                          // half-angle of the cone in radians (lamp lv1 arc/2 ≈ 0.47, widened for the icon)
  const cx = Math.cos(arc) * cone, cy = Math.sin(arc) * cone;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#072d52"/><stop offset="1" stop-color="#03101b"/>
    </linearGradient>
    <radialGradient id="beam" cx="0" cy="0" r="${cone}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffdca0" stop-opacity="0.55"/>
      <stop offset="0.5" stop-color="#ffd296" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffc88c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#3ef2d0" stop-opacity="0.35"/><stop offset="1" stop-color="#3ef2d0" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hull" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2ca78"/><stop offset="0.5" stop-color="#c9953f"/><stop offset="1" stop-color="#6e4a1c"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#sea)"/>
  <circle cx="${c}" cy="${c}" r="${s * 0.46}" fill="url(#glow)"/>
  <g transform="translate(${c} ${c}) rotate(${rot})">
    <path d="M0 0 L${cx.toFixed(1)} ${(-cy).toFixed(1)} A${cone} ${cone} 0 0 1 ${cx.toFixed(1)} ${cy.toFixed(1)} Z" fill="url(#beam)"/>
    <line x1="${-r * 1.65}" y1="${-r * 0.5}" x2="${-r * 1.65}" y2="${r * 0.5}" stroke="#dcebff" stroke-opacity="0.7" stroke-width="${r * 0.15}" stroke-linecap="round"/>
    <path d="M${-r * 0.7} 0 L${-r * 1.5} ${-r * 0.8} L${-r * 1.5} ${r * 0.2} Z" fill="#b3833f"/>
    <ellipse rx="${r * 1.55}" ry="${r * 0.85}" fill="url(#hull)"/>
    <line x1="${-r * 1.1}" y1="0" x2="${r * 1.1}" y2="0" stroke="#3c230a" stroke-opacity="0.5" stroke-width="${r * 0.08}"/>
    <circle cx="${r * 0.2}" cy="${-r * 0.1}" r="${r * 0.36}" fill="#0b2a3c" stroke="#f6dfa8" stroke-width="${r * 0.11}"/>
    <circle cx="${r * 0.12}" cy="${-r * 0.2}" r="${r * 0.15}" fill="#82e6ff" fill-opacity="0.75"/>
    <circle cx="${r * 0.55}" cy="0" r="${r * 0.3}" fill="#8a6a34"/>
    <circle cx="${r * 0.9}" cy="0" r="${r * 0.3}" fill="#fff3cf"/>
    <circle cx="${r * 0.9}" cy="0" r="${r * 0.7}" fill="#ffebbe" fill-opacity="0.25"/>
  </g>
</svg>`;
}

const jobs = [
  ['icon-192.png', 192, 0.10],
  ['icon-512.png', 512, 0.10],
  ['icon-maskable-512.png', 512, 0.22],   // Android masks ~20% on each side
  ['apple-touch-icon-180.png', 180, 0.12]
];
for (const [name, size, pad] of jobs) {
  await sharp(Buffer.from(svg(size, pad))).png().toFile(fileURLToPath(new URL(name, out)));
  console.log('wrote', name);
}
await writeFile(new URL('icon.svg', out), svg(512, 0.10));
console.log('wrote icon.svg');
