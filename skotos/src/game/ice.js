// The Cracking Ice (Act V): thin ice (L.ice) under load, stages 0 intact, 1 hairline, 2 web, 3 crazed, 4 broken (water,
// closed low), 5 slush. z.ice = { stage, load, t, warn, tex, dirty, upT, ring, floes } lives on the zone; thick ice and
// land never break.
// (So far the entry's heal: the load, the stages, the batches, the plunge, the crack texture and the floes are the next part.)
import { emit } from '../ui/bus.js';

export let ICE = null;
// on every entry (act5Enter): broken and slush cells back to thin ice at stage 0, every load cleared, one open batch
export function resetIce(z) {
  const L = z?.L;
  if (!L?.ice) { ICE = null; return; }
  const N = L.w * L.h;
  z.ice ||= { stage: new Uint8Array(N), load: new Float32Array(N), t: new Float32Array(N), warn: [], tex: null, dirty: true, upT: 0, ring: [], floes: [] };
  const I = ICE = z.ice, open = [];
  for (let i = 0; i < N; i++) {
    if (!L.ice[i]) continue;
    if (I.stage[i] >= 4) open.push([i % L.w, (i - i % L.w) / L.w]);
    I.stage[i] = 0; I.load[i] = 0; I.t[i] = 0;
  }
  I.warn.length = 0; I.dirty = true;
  if (z.map.open(open)) emit('mapChanged');
}
export function tickIce() {}
