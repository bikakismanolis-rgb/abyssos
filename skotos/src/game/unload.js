// Acts II-IV let go when the hero goes on into an Act V or VI zone (docs/act6-contract.md, File ownership: engine;
// act6-design.md, Engine work 5; act5-briefs/engine.md 5.4). A long session holds every act's packs, people and creatures
// at once (Acts I-IV and V together are about 510 MB of phone texture); the cold, the sea and the dark below need none of
// Deepstone's stone and lava, the wood's, the cinder's, nor the dwarves, the Evergreen and the ash people, nor the Acts
// II-IV creatures. Going back to an older zone loads them again, under the travel fade as on a first visit.
//
// Two steps. At once, when the zone is readied (world.js zoneReady's hook, before anything of it is built): the assets
// leave the registries (env.js unloadPack, people.js unloadFolk, creatures.js unloadCreatures), so the zone about to be
// built takes only what a cold start would; and every cached zone that may draw them is dropped from G.zones (Acts II-IV's
// own, and any other but Whitecliff built while one of those packs was loaded, or with one of those people or creatures
// in it), to be built again on its next visit. Then, once the next zone is entered and nothing of them is on screen any
// more (the zone being left still draws under the fade), the dropped zones are disposed and the assets' GPU copies freed,
// after a last look over everything still drawn: a texture something still draws keeps its GPU copy (a pack's other
// textures go: Isarn's staff in Whitecliff carries the cinder pack's lantern when it was planted with the pack loaded).
// Kept: whatever the zone itself asks for; Brokka's and Elati's people (folk, grove) for as long as the Act V cameo can
// still call them (the keepers' walk in the Skotos's fight, before the sea is lit); a set or a creature file someone in
// Whitecliff is made from (its zone is never dropped: its people, its fires and its state stay as they are); Act I's
// creatures, and a creature file a group still loaded lists (Act V's bear is Act III's). &nounload turns it off (the same
// session as before, for measuring).
import { G } from './state.js';
import { ZONES, disposeZone } from './world.js';
import { unloadPack, packReady } from '../gfx/env.js';
import { unloadFolk, folkReady } from '../gfx/people.js';
import { unloadCreatures, groupReady } from '../gfx/creatures.js';
import { R } from '../gfx/gfx.js';
import { on } from '../ui/bus.js';

const OLD = { packs: ['deep', 'wood', 'cinder'], folk: ['folk', 'grove', 'ash'], groups: ['act2', 'act3', 'act4'] };
const OFF = typeof location !== 'undefined' && /[?&]nounload(&|=|$)/.test(location.search);
// what each unload let go and kept, newest last (the scenarios read it: unload6); pend: what waits for the next entry
export const UNLOAD = { log: [], off: OFF };
const pend = [];
// the packs of Acts II-IV loaded when each zone was built (its ground, walls and props were made from what was there)
const built = new WeakMap();

// every texture what is under these roots draws: material maps and uniforms, and the uniforms a compiled material's own
// program took (build.js's world-projected stone and the ground give theirs in onBeforeCompile)
const SLOTS = ['map', 'normalMap', 'aoMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'bumpMap', 'lightMap', 'specularMap', 'displacementMap', 'envMap', 'gradientMap', 'matcap'];
export function drawn(roots, out = new Set()) {
  const props = R.renderer?.properties;
  const add = (v) => { if (v?.isTexture) out.add(v); else if (Array.isArray(v)) for (const x of v) if (x?.isTexture) out.add(x); };
  const mat = (m) => {
    for (const k of SLOTS) add(m[k]);
    if (m.uniforms) for (const k in m.uniforms) add(m.uniforms[k]?.value);
    const u = props?.get(m)?.uniforms;
    if (u) for (const k in u) add(u[k]?.value);
  };
  for (const r of roots) r?.traverse?.((o) => { for (const m of [].concat(o.material || [])) if (m) mat(m); });
  return out;
}
export const zoneRoots = (z) => [z.lvl?.group, ...(z.extra || []), ...(z.actors || []).flatMap((a) => [a.avatar?.group, a.mesh]), ...(z.pickups || []).flatMap((p) => [p.mesh, p.beam])].filter(Boolean);
const cached = () => [...new Set([...Object.values(G.zones || {}), G.zone].filter(Boolean))];
const any = (set, list) => { for (const t of list) if (set.has(t)) return true; return false; };

// world.js zoneReady: id the zone about to be entered; need what it loads ({ packs, folk, group })
export function unloadOld(id, need = {}) {
  if (OFF || !G.hero || (ZONES[id]?.act || 0) < 5) return null;
  const F = G.hero.flags || {};
  const keepFolk = new Set([...(need.folk || []), ...(F.seaLit ? [] : ['folk', 'grove'])]);
  const want = {
    packs: OLD.packs.filter((p) => packReady(p) && !(need.packs || []).includes(p)),
    folk: OLD.folk.filter((s) => folkReady(s) && !keepFolk.has(s)),
    groups: OLD.groups.filter((g) => groupReady(g) && g !== need.group)
  };
  if (!want.packs.length && !want.folk.length && !want.groups.length) return null;
  const t0 = performance.now();
  // the people and creatures that must stay: those of Whitecliff, and whatever is on screen outside every zone
  const zones = cached(), town = G.zones?.town, inZones = new Set(zones.flatMap(zoneRoots));
  const hold = drawn([...(town ? zoneRoots(town) : []), ...R.scene.children.filter((c) => !inZones.has(c))]);
  const busy = (tex) => any(hold, tex);
  const done = [], kept = [];
  for (const p of want.packs) { const r = unloadPack(p); if (r) done.push({ kind: 'pack', name: p, ...r }); else kept.push('pack:' + p); }
  for (const s of want.folk) { const r = unloadFolk(s, busy); if (r) done.push({ kind: 'folk', name: s, ...r }); else kept.push('folk:' + s); }
  for (const g of want.groups) { const r = unloadCreatures(g, need.group ? [need.group] : [], busy); if (r) done.push({ kind: 'group', name: g, ...r }); else kept.push('group:' + g); }
  if (!done.length) { UNLOAD.log.push({ to: id, packs: [], folk: [], groups: [], files: [], kept, zones: [], late: [], held: 0, freed: true }); return null; }
  // the zones that may draw them: Acts II-IV's, any other but Whitecliff built while one of the packs was loaded (or not
  // seen built), any with one of the people or creatures in it
  const packs = new Set(done.filter((r) => r.kind === 'pack').map((r) => r.name)), gone = new Set(done.flatMap((r) => [...r.tex]));
  const drop = zones.filter((z) => {
    if (z === town) return false;
    const act = ZONES[z.id]?.act || 0, snap = built.get(z);
    return (act >= 2 && act <= 4) || !snap || snap.some((p) => packs.has(p)) || any(gone, drawn(zoneRoots(z)));
  });
  for (const z of drop) if (G.zones[z.id] === z) delete G.zones[z.id];
  const entry = {
    to: id, at: Math.round(performance.now()),
    packs: done.filter((r) => r.kind === 'pack').map((r) => r.name), folk: done.filter((r) => r.kind === 'folk').map((r) => r.name),
    groups: done.filter((r) => r.kind === 'group').map((r) => r.name), files: done.flatMap((r) => r.files || []),
    kept, zones: drop.map((z) => z.id), late: [], held: 0, freed: false, tex: gone.size, ms: [Math.round(performance.now() - t0), 0]
  };
  UNLOAD.log.push(entry);
  pend.push({ entry, zones: drop, res: done });
  return entry;
}

// once the next zone is entered: the dropped zones disposed, the assets' GPU copies freed (what is still drawn keeps its own:
// entry.late names the assets, entry.held counts the textures)
function settle() {
  if (!pend.length) return;
  const dropped = new Set(pend.flatMap((p) => p.zones));
  // (still standing in a dropped zone: a travel that failed to load; the next entry settles it)
  if (dropped.has(G.zone)) return;
  const all = pend.splice(0), t0 = performance.now();
  // (every material just built compiled now, so the last look sees the uniforms its program takes)
  try { if (!R.lost) R.renderer.compile(R.scene, R.camera); } catch (e) { /* drawn() still reads the maps */ }
  const out = new Set([...dropped].flatMap(zoneRoots));
  const live = drawn([...cached().filter((z) => !dropped.has(z)).flatMap(zoneRoots), ...R.scene.children.filter((c) => !out.has(c))]);
  for (const z of dropped) if (G.zones[z.id] !== z) disposeZone(z);
  for (const p of all) {
    for (const r of p.res) {
      let n = 0; for (const t of r.tex) if (live.has(t)) n++;
      if (n) { p.entry.late.push(r.kind + ':' + r.name); p.entry.held += n; }
      r.free(live);
    }
    p.entry.freed = true; p.entry.ms[1] = Math.round(performance.now() - t0);
  }
}
on('zoneEnter', (id, z) => {
  if (z && !built.has(z)) built.set(z, OLD.packs.filter(packReady));
  settle();
});
