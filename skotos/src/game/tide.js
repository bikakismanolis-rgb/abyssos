// The Tide (Act V): the coast's water level and the walk grid that follows it. z.tide = { h, step, t, phase, force, wet,
// lane, laneT } lives on the zone; TIDE is the current zone's (null where there is no L.bed). A tidal cell has a bed below
// BED_DRY and no ice, thick ice, window or deck over it; deep (0.45 m or more) it is closed and low. Skerry Bay's own water
// (L.boss + 4) answers to the Walking Tower (TIDE.force), never to the clock.
// (So far the entry's reset: the clock, its steps, the bell, the escape lane and the wash-out, inWater and the flood waves
// are the next part.)
import { emit } from '../ui/bus.js';
import { wetAt } from '../world/genlib.js';
import { tidal } from '../world/gen5.js';

export let TIDE = null;
// on every entry (act5Enter): the clock at the start of low water, and every tidal cell as its bed has it at h = 0, in
// one batch (a hero who left at high water comes back to the map at low water, cached or fresh)
export function resetTide(z) {
  const L = z?.L;
  if (!L?.bed) { TIDE = null; return; }
  z.tide = Object.assign(z.tide || {}, { h: 0, step: 0, t: 0, phase: 'low', force: null, wet: 0, lane: null, laneT: 0 });
  TIDE = z.tide;
  const { w } = L, open = [], close = [];
  for (let i = 0; i < L.cells.length; i++) {
    if (!tidal(L, i)) continue;
    const want = wetAt(L.bed[i], 0) < 2;
    if (want && !L.cells[i]) open.push([i % w, (i - i % w) / w]);
    else if (!want && L.cells[i]) close.push([i % w, (i - i % w) / w]);
  }
  if (z.map.open(open) + z.map.close(close)) emit('mapChanged');
}
export function tickTide() {}
