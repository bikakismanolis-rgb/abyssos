// Cloud saves: the sync of this browser's heroes with a copy kept elsewhere (the claude.ai artifact's db, or the web
// build's Supabase project). No game module is imported here (tools/cloud/test-sync.mjs runs it in node with fakes);
// game/cloud.js gives it the save and the backend. docs/cloudsave/README.md.
//
// localStorage stays the hero's first copy: nothing here changes it but a cloud copy taken after its call came back, and
// whatever that replaces is kept first (backups). Each hero is compared three ways: the local record (as stored), the
// cloud's record, and the base, what this browser and the cloud last agreed on (the cloud's rev, the hero's sum). A hero
// changed on one side only goes to the other; one changed on both sides (or never agreed on) goes the way of the later
// `played` (the time it was last played), the other copy kept as a backup. A deleted hero leaves a tombstone, here and
// in the cloud, so neither side brings it back; only a copy played after the deletion outlives it.
//
// backend: { who, list() -> [{ id, rev, played, sum, del, at }], get(id) -> { id, rev, played, sum, del, at, data },
//            put(id, { data, sum, played }, rev) -> { rev }, remove(id, at, rev) -> { rev } }
//   data is the hero's JSON text, exactly as stored; rev the cloud's version of the record (null: none expected, a new
//   record); put and remove refuse { code: 'conflict' } when the cloud's rev is not the one given. Any other refusal
//   carries its code ('too_big', 'too_many', 'rate_limited', 'quota', 'offline', ...).
// store: { heroes() -> [hero], current() -> id | null, put(hero), drop(id), meta() -> object, setMeta(object),
//          backup(hero, why) }
//   heroes(): the records as stored now (not the page's copies); put/drop change the stored list (never the hero this
//   page plays: put and drop of it are refused, returning false); meta: this module's own record (base, tombstones).

export const MAX_HERO = 96 * 1024, MAX_HEROES = 12, MAX_TOMBS = 32;

// a 53-bit hash of the hero as stored, its `played` left out (a hero only looked at, or autosaved unchanged, is the
// same hero): cyrb53
export function heroSum(h) {
  const { played, ...rest } = h || {};
  const s = JSON.stringify(rest);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
export const HERO_ID = /^[A-Za-z0-9_-]{1,40}$/;
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

// the module's record, made whole: { who, base: { id: { rev, sum, del } }, tomb: { id: at }, last }
export function cleanMeta(m) {
  m = m && typeof m === 'object' ? m : {};
  const base = m.base && typeof m.base === 'object' ? m.base : {}, tomb = m.tomb && typeof m.tomb === 'object' ? m.tomb : {};
  return { who: typeof m.who === 'string' ? m.who : null, base, tomb, last: num(m.last) };
}

// One sync, all heroes. Resolves a report { ok, pushed, pulled, removed, dropped, kept, errors: [{ id, code }], replaced:
// [ids a cloud copy replaced locally (a backup kept)] }; a call the backend failed ends it (ok false, code) with
// nothing changed locally that its answers had not already settled.
export async function syncAll(backend, store, o = {}) {
  const now = o.now || Date.now;
  const R = { ok: false, pushed: [], pulled: [], removed: [], dropped: [], kept: [], errors: [], replaced: [] };
  let meta = cleanMeta(store.meta());
  // (another account's base is no base here: a code taken on this device, a session of another user)
  if (meta.who !== backend.who) meta = { ...meta, who: backend.who, base: {} };
  const save = () => store.setMeta(meta);
  let cloud;
  try { cloud = await backend.list(); } catch (e) { R.code = e?.code || 'unavailable'; return R; }
  const C = new Map();
  for (const c of Array.isArray(cloud) ? cloud : []) if (c && HERO_ID.test(c.id)) C.set(c.id, c);
  const L = new Map();
  for (const h of store.heroes()) if (h && HERO_ID.test(h.id)) L.set(h.id, h);
  const ids = new Set([...L.keys(), ...C.keys(), ...Object.keys(meta.tomb)]);
  const fail = (id, e) => { R.errors.push({ id, code: e?.code || 'unavailable' }); };
  const agree = (id, rec, sum) => { meta.base[id] = rec.del ? { rev: rec.rev, del: true } : { rev: rec.rev, sum }; };
  let live = [...C.values()].filter((c) => !c.del).length;

  const push = async (id, h, c) => {
    const data = JSON.stringify(h), sum = heroSum(h);
    if (data.length > MAX_HERO) { fail(id, { code: 'too_big' }); return; }
    if (!c || c.del) { if (live >= MAX_HEROES) { fail(id, { code: 'too_many' }); return; } }
    try {
      const r = await backend.put(id, { data, sum, played: num(h.played) }, c ? c.rev : null);
      if (!c || c.del) live++;
      meta.base[id] = { rev: r.rev, sum }; R.pushed.push(id);
    } catch (e) { fail(id, e); }
  };
  // a cloud copy taken: only once its record is here, never over the hero this page plays (it is taken after it is put
  // down: the next sync), what it replaces kept first
  const pull = async (id, l, why) => {
    if (store.current() === id) { R.kept.push(id); return; }
    let c;
    try { c = await backend.get(id); } catch (e) { fail(id, e); return; }
    if (!c || c.del || typeof c.data !== 'string') { fail(id, { code: 'gone' }); return; }
    let h;
    try { h = JSON.parse(c.data); } catch (e) { h = null; }
    if (!h || typeof h !== 'object' || h.id !== id) { fail(id, { code: 'bad_data' }); return; }
    if (store.current() === id) { R.kept.push(id); return; }
    if (l) store.backup(l, why);
    if (store.put(h) === false) { R.kept.push(id); return; }
    agree(id, c, heroSum(h)); R.pulled.push(id);
    if (l) R.replaced.push(id);
  };

  for (const id of ids) {
    const l = L.get(id), c = C.get(id), b = meta.base[id], t = meta.tomb[id];
    const sumL = l ? heroSum(l) : null;
    if (t) {
      // deleted here: a copy played after it outlives it (another page of this browser still had it open)
      // (and so does a cloud copy played after it on another device: it comes back as any new hero)
      if ((l && num(l.played) > t) || (c && !c.del && num(c.played) > t)) { delete meta.tomb[id]; }
      else {
        if (l && store.current() !== id) { store.backup(l, 'deleted'); store.drop(id); }
        if (c && !c.del) {
          try { const r = await backend.remove(id, t, c.rev); meta.base[id] = { rev: r.rev, del: true }; R.removed.push(id); live--; } catch (e) { fail(id, e); }
        } else if (c) agree(id, c);
        else meta.base[id] = { rev: null, del: true };
        continue;
      }
    }
    if (c && c.del) {
      if (!l) { meta.tomb[id] = num(c.at) || now(); agree(id, c); continue; }
      // deleted on another device: a copy here played since then is the newer and goes up again; else it goes (kept as a
      // backup)
      if ((b && !b.del && sumL === b.sum) || num(l.played) <= num(c.at)) {
        if (store.current() === id) { R.kept.push(id); continue; }
        store.backup(l, 'deleted'); store.drop(id);
        meta.tomb[id] = num(c.at) || now(); agree(id, c); R.dropped.push(id);
      } else await push(id, l, c);
      continue;
    }
    if (l && !c) { await push(id, l, null); continue; }
    if (c && !l) { await pull(id, null, 'cloud'); continue; }
    if (!l || !c) continue;
    if (sumL === c.sum) { agree(id, c, sumL); continue; }
    const cloudSame = b && !b.del && b.rev === c.rev, localSame = b && !b.del && b.sum === sumL;
    if (cloudSame) { await push(id, l, c); continue; }
    if (localSame) { await pull(id, l, 'cloud'); continue; }
    // changed on both sides, or never agreed on: the later played wins; the other copy is kept as a backup
    if (num(c.played) > num(l.played)) await pull(id, l, 'conflict');
    else {
      try { const g = await backend.get(id); const h = g && typeof g.data === 'string' ? JSON.parse(g.data) : null; if (h && typeof h === 'object') store.backup(h, 'conflict'); } catch (e) { fail(id, e); continue; }
      await push(id, l, c);
    }
  }
  // (tombstones kept: the newest MAX_TOMBS, so a device that has not synced for long cannot bring many back)
  const ts = Object.entries(meta.tomb).sort((a, b) => b[1] - a[1]);
  if (ts.length > MAX_TOMBS) meta.tomb = Object.fromEntries(ts.slice(0, MAX_TOMBS));
  for (const id of Object.keys(meta.base)) if (!ids.has(id)) delete meta.base[id];
  meta.last = now();
  save();
  R.ok = true;
  return R;
}

// The hero this page plays, put up on its own, as the page goes away (best effort: no list, the base's rev as the one
// expected; a hero the cloud changed meanwhile is refused 'conflict' and left to the next sync)
export async function pushOne(backend, store, id) {
  const meta = cleanMeta(store.meta());
  if (meta.who !== backend.who) return false;
  const h = store.heroes().find((x) => x && x.id === id), b = meta.base[id];
  if (!h || !b || b.del) return false;
  const sum = heroSum(h);
  if (sum === b.sum) return false;
  const data = JSON.stringify(h);
  if (data.length > MAX_HERO) return false;
  const r = await backend.put(id, { data, sum, played: num(h.played) }, b.rev);
  const m2 = cleanMeta(store.meta());
  m2.base[id] = { rev: r.rev, sum };
  store.setMeta(m2);
  return true;
}

// has any stored hero changed since the cloud last agreed with it (or a deletion not yet told)? A sync is due only then,
// besides the timer that hears other devices
export function dirty(store, who) {
  const meta = cleanMeta(store.meta());
  if (meta.who !== who) return true;
  for (const [id, t] of Object.entries(meta.tomb)) if (!meta.base[id]?.del && t) return true;
  for (const h of store.heroes()) {
    if (!h || !HERO_ID.test(h.id)) continue;
    const b = meta.base[h.id];
    if (!b || b.del || b.sum !== heroSum(h)) return true;
  }
  return false;
}
