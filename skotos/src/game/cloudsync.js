// Cloud saves: the sync of this browser's heroes with a copy kept elsewhere (the claude.ai artifact's db, or the web
// build's Supabase project). No game module is imported here (tools/cloud/test-sync.mjs runs it in node with fakes);
// game/cloud.js gives it the save and the backend. docs/cloudsave/README.md.
//
// localStorage stays the hero's first copy: nothing here changes it but a cloud copy taken after its call came back, and
// whatever that replaces is kept first (backups). Each hero is compared three ways: the local record (as stored), the
// cloud's record, and the base, what this browser and the cloud last agreed on (the cloud's rev, the hero's sum). A hero
// changed on one side only goes to the other (a copy here that only sat open since, its clock running and nothing done,
// is unchanged); one changed on both sides (or never agreed on) goes the way of the copy further on (level, mastery, XP,
// kills: what only play raises, never `played` or the clock, which every autosave of an open page moves), then of the
// later `played`; the other copy is kept as a backup. A deleted hero leaves a tombstone, here and in the cloud, so
// neither side brings it back; only a copy played after the deletion outlives it. Tombstones are the account's that
// recorded them: another account's are kept aside for it, never told to this one.
//
// backend: { who, list() -> [{ id, rev, played, sum, del, at }], get(id) -> { id, rev, played, sum, del, at, data },
//            put(id, { data, sum, played }, rev) -> { rev }, remove(id, at, rev) -> { rev } }
//   data is the hero's JSON text, exactly as stored; rev the cloud's version of the record (null: none expected, a new
//   record); put and remove refuse { code: 'conflict' } when the cloud's rev is not the one given. Any other refusal
//   carries its code ('too_big', 'too_many', 'rate_limited', 'quota', 'offline', ...).
// store: { heroes() -> [hero], current() -> id | null, put(hero), drop(id), meta() -> object, setMeta(object),
//          backup(hero, why), check?(hero) -> null | code }
//   heroes(): the records as stored now (not the page's copies); put/drop change the stored list (never the hero this
//   page plays: put and drop of it are refused, returning false); meta: this module's own record (base, tombstones);
//   check: a cloud copy this page cannot keep as it is (one a newer version of the game wrote: 'newer') is not taken.
//
// Other pages of the browser change the stored heroes and this record while a sync waits on the cloud (a hero played and
// autosaved, deleted, a backup taken back). A sync reads the record after the heroes (a deletion recorded before the
// heroes were read is honoured), takes or drops a hero only while its stored record is still the one it read, and at its
// end puts only its own changes on the record as it is then: a base or tombstone another page changed meanwhile stands
// (a base marked lost, { lost: <a mark of its own> }, by a page that found its hero's record written over: game/save.js).

export const MAX_HERO = 96 * 1024, MAX_HEROES = 12, MAX_TOMBS = 32, MAX_AWAY = 4;

// cyrb53: a 53-bit hash of a text
function hash(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
// the hero as stored, its `played` left out (a hero only looked at, or autosaved unchanged, is the same hero)
export function heroSum(h) {
  const { played, ...rest } = h || {};
  return hash(JSON.stringify(rest));
}
// the same with its play time left out too: a page only left open on a hero (its clock running, nothing done) moves
// stats.time and nothing else, and that is no play
export function workSum(h) {
  const { played, stats, ...rest } = h || {};
  const st = stats && typeof stats === 'object' && !Array.isArray(stats) ? { ...stats, time: 0 } : stats ?? null;
  return hash(JSON.stringify(rest) + '|' + JSON.stringify(st));
}
export const HERO_ID = /^[A-Za-z0-9_-]{1,40}$/;
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
// how far a hero has come, by what only play raises: level, mastery, XP, kills (never `played` or the clock)
const progress = (h) => [num(h?.level), num(h?.mlvl), num(h?.xp), num(h?.mxp), num(h?.stats?.kills)];
// > 0: a is further on than b; 0: neither
export function further(a, b) {
  const p = progress(a), q = progress(b);
  for (let i = 0; i < p.length; i++) if (p[i] !== q[i]) return p[i] - q[i];
  return 0;
}
// is the cloud's record not one written over the copy agreed on (base b)? At the rev agreed on, another hero; or, where
// the record carries its chain (the artifact backend: the sums of its last revs), another hero at that rev: two writes
// made from the same rev (a db with no transactions), the other's landed, and what came after built on it
// (a base ahead of the cloud's record is one too. A rev the chain no longer reaches, 'unknown', proves neither: a device
// away for long, or one whose write did not stand long ago; its copy, if unchanged since, takes the cloud's as a routine
// change only when the cloud's is not behind it, else the two are weighed (syncAll): no further copy is ever replaced
// as a mere change, and no backup kept for a real conflict is pushed out by ones that were none)
export function forked(b, c) {
  if (b.rev === c.rev) return b.sum !== c.sum;
  if (typeof b.rev === 'number' && typeof c.rev === 'number' && b.rev > c.rev) return true;
  if (!c.chain || typeof c.chain !== 'object') return false;
  const ch = c.chain[b.rev];
  return typeof ch === 'string' ? ch !== b.sum : 'unknown';
}

// the module's record, made whole: { who, base: { id: { rev, sum, work } | { rev, del, at } | { lost: mark } }, tomb: { id:
// at }, away: { who: { tomb, at } }, last }. tomb is the account who's (the deletions made here while it was this
// browser's account, and those it told); away holds other accounts' tombstones, kept for them (a browser two accounts
// share)
export function cleanMeta(m) {
  m = obj(m);
  const away = {};
  for (const [w, a] of Object.entries(obj(m.away))) if (a && typeof a === 'object') away[w] = { tomb: { ...obj(a.tomb) }, at: num(a.at) };
  return { who: typeof m.who === 'string' ? m.who : null, base: obj(m.base), tomb: obj(m.tomb), away, last: num(m.last) };
}
// the record as another account finds it: no base (what this browser agreed with the other account is nothing to this
// one) but the marks of a base lost (a page found its hero's record written over: no base either, and one a sync must
// not put back), and that account's own tombstones (none for one new here), the other's put aside for it. Deletions made
// before this browser had any account are its own, and go to the first it syncs with
export function forAccount(meta, who, at = Date.now()) {
  meta = cleanMeta(meta);
  if (meta.who === who) return meta;
  const lost = Object.fromEntries(Object.entries(meta.base).filter(([, b]) => b && b.lost));
  const away = { ...meta.away };
  if (meta.who != null && Object.keys(meta.tomb).length) away[meta.who] = { tomb: meta.tomb, at };
  const mine = away[who]?.tomb || {};
  delete away[who];
  const tomb = meta.who == null ? { ...mine, ...meta.tomb } : { ...mine };
  const keep = Object.entries(away).sort((a, b) => b[1].at - a[1].at).slice(0, MAX_AWAY);
  return { ...meta, who, base: lost, tomb, away: Object.fromEntries(keep) };
}

// One sync, all heroes. Resolves a report { ok, pushed, pulled, removed, dropped, kept, errors: [{ id, code }], replaced:
// [ids a cloud copy replaced locally (a backup kept)], behind: [ids kept as they are only because this page plays them,
// a copy further on in the cloud] }; a call the backend failed ends it (ok false, code) with nothing changed locally
// that its answers had not already settled. o.readOnly: a view that may not write (no put, no remove; copies only taken)
export async function syncAll(backend, store, o = {}) {
  const now = o.now || Date.now, ro = !!o.readOnly;
  const R = { ok: false, pushed: [], pulled: [], removed: [], dropped: [], kept: [], errors: [], replaced: [], behind: [] };
  let cloud;
  try { cloud = await backend.list(); } catch (e) { R.code = e?.code || 'unavailable'; return R; }
  const C = new Map();
  for (const c of Array.isArray(cloud) ? cloud : []) if (c && HERO_ID.test(c.id)) C.set(c.id, c);
  const L = new Map();
  for (const h of store.heroes()) if (h && HERO_ID.test(h.id)) L.set(h.id, h);
  // (the record read after the heroes: a deletion recorded before they were read is honoured. Another account: a code
  // taken on this device, a session of another user. The account is the one the sync began with: a backend that learns
  // of another player meanwhile ('moved') does not make this sync's changes that player's)
  const who = backend.who;
  const meta0 = forAccount(store.meta(), who, now()), meta = cleanMeta(JSON.parse(JSON.stringify(meta0)));
  // (this sync's own changes, put on the record as it is now: a base or tombstone another page changed meanwhile stands)
  const save = () => {
    const m = forAccount(store.meta(), who, now());
    for (const k of ['base', 'tomb']) {
      for (const id of new Set([...Object.keys(meta0[k]), ...Object.keys(meta[k])])) {
        const was = JSON.stringify(meta0[k][id]);
        if (JSON.stringify(meta[k][id]) === was || JSON.stringify(m[k][id]) !== was) continue;
        if (meta[k][id] === undefined) delete m[k][id]; else m[k][id] = meta[k][id];
      }
    }
    // (tombstones kept: the newest MAX_TOMBS, so a device that has not synced for long cannot bring many back)
    const ts = Object.entries(m.tomb).sort((a, b) => b[1] - a[1]);
    if (ts.length > MAX_TOMBS) m.tomb = Object.fromEntries(ts.slice(0, MAX_TOMBS));
    m.last = meta.last;
    store.setMeta(m);
  };
  // (the stored record of a hero still the one this sync read, before it is replaced or dropped: another page may have
  // played, restored or deleted it meanwhile; then it is left to the next sync)
  const still = (id, l) => JSON.stringify(store.heroes().find((h) => h && h.id === id) ?? null) === JSON.stringify(l ?? null);
  const ids = new Set([...L.keys(), ...C.keys(), ...Object.keys(meta.tomb)]);
  // (a refusal that ends the sync: the backend's player is no longer the one the server has for this user, 'moved': the
  // backend has taken the new one, and the next sync starts from its base)
  let stop = null;
  const fail = (id, e) => { const code = e?.code || 'unavailable'; R.errors.push({ id, code }); if (code === 'moved') stop ||= code; };
  const agree = (id, rec, h) => { meta.base[id] = rec.del ? { rev: rec.rev, del: true, at: num(rec.at) } : { rev: rec.rev, sum: heroSum(h), work: workSum(h) }; };
  let live = [...C.values()].filter((c) => !c.del).length;

  const push = async (id, h, c) => {
    if (ro) return;
    const data = JSON.stringify(h), sum = heroSum(h);
    if (data.length > MAX_HERO) { fail(id, { code: 'too_big' }); return; }
    if (!c || c.del) { if (live >= MAX_HEROES) { fail(id, { code: 'too_many' }); return; } }
    try {
      const r = await backend.put(id, { data, sum, played: num(h.played) }, c ? c.rev : null, c ? c.sum : null);
      if (!c || c.del) live++;
      meta.base[id] = { rev: r.rev, sum, work: workSum(h) }; R.pushed.push(id);
    } catch (e) { fail(id, e); }
  };
  // the cloud's whole record: { rec, h } (the hero parsed), or null (the failure reported)
  const fetch = async (id) => {
    let c;
    try { c = await backend.get(id); } catch (e) { fail(id, e); return null; }
    if (!c || c.del || typeof c.data !== 'string') { fail(id, { code: 'gone' }); return null; }
    let h;
    try { h = JSON.parse(c.data); } catch (e) { h = null; }
    if (!h || typeof h !== 'object' || Array.isArray(h) || h.id !== id) { fail(id, { code: 'bad_data' }); return null; }
    return { rec: c, h };
  };
  // a cloud copy taken: only once its record is here, never over the hero this page plays (it is taken after it is put
  // down: the next sync; the page is told, behind), never one this page cannot keep as it is (check), what it replaces
  // kept first
  const pull = async (id, l, why, got = null) => {
    const held = () => { R.kept.push(id); if (l) R.behind.push(id); };
    if (store.current() === id) { held(); return; }
    got ||= await fetch(id);
    if (!got) return;
    const bad = store.check?.(got.h);
    if (bad) { fail(id, { code: bad }); return; }
    if (store.current() === id) { held(); return; }
    if (!still(id, l)) { R.kept.push(id); return; }
    if (l) store.backup(l, why);
    if (store.put(got.h) === false) { R.kept.push(id); return; }
    agree(id, got.rec, got.h); R.pulled.push(id);
    if (l) R.replaced.push(id);
  };

  for (const id of ids) {
    if (stop) break;
    const l = L.get(id), c = C.get(id), b = meta.base[id], t = meta.tomb[id];
    const sumL = l ? heroSum(l) : null;
    if (t) {
      // deleted here: a copy played after it outlives it (another page of this browser still had it open)
      // (and so does a cloud copy played after it on another device: it comes back as any new hero)
      if ((l && num(l.played) > t) || (c && !c.del && num(c.played) > t)) { delete meta.tomb[id]; }
      else {
        if (l && store.current() !== id) {
          if (!still(id, l)) { R.kept.push(id); continue; }
          store.backup(l, 'deleted'); store.drop(id);
        }
        if (c && !c.del) {
          if (!ro) try { const r = await backend.remove(id, t, c.rev, c.sum); meta.base[id] = { rev: r.rev, del: true, at: t }; R.removed.push(id); live--; } catch (e) { fail(id, e); }
        } else if (c) agree(id, c);
        else meta.base[id] = { rev: null, del: true, at: t };
        continue;
      }
    }
    if (c && c.del) {
      if (!l) { meta.tomb[id] = num(c.at) || now(); agree(id, c); continue; }
      // deleted on another device: a copy here played since then is the newer and goes up again; else it goes (kept as a
      // backup)
      if ((b && !b.del && sumL === b.sum) || num(l.played) <= num(c.at)) {
        if (store.current() === id || !still(id, l)) { R.kept.push(id); continue; }
        store.backup(l, 'deleted'); store.drop(id);
        meta.tomb[id] = num(c.at) || now(); agree(id, c); R.dropped.push(id);
      } else await push(id, l, c);
      continue;
    }
    if (l && !c) { await push(id, l, null); continue; }
    if (c && !l) { await pull(id, null, 'cloud'); continue; }
    if (!l || !c) continue;
    if (sumL === c.sum) { agree(id, c, l); continue; }
    // (the base: none (or lost: another page wrote over its record) says nothing. Nor does one the cloud's record was not
    // written over (forked: two writes made from the same rev, the other's landed); weighed then as changed on both
    // sides, never as a change of one side only)
    const fk = !!b && !b.del && typeof b.sum === 'string' ? forked(b, c) : true;
    const known = fk !== true;
    const cloudSame = known && b.rev === c.rev, localSame = known && b.sum === sumL;
    // (a copy here that only sat open since the cloud last agreed with it, its clock running and nothing done: the
    // same, whatever its autosaves did to `played`; and no change to put up, the clock goes with the next real one)
    const localIdle = known && typeof b.work === 'string' && b.work === workSum(l);
    if (cloudSame) { if (!localIdle) await push(id, l, c); continue; }
    if ((localSame || localIdle) && fk !== 'unknown') { await pull(id, l, 'cloud'); continue; }
    if (localSame || localIdle) {
      // (a base the chain no longer reaches: the cloud's copy taken as routine only if it is not behind this one)
      const got = await fetch(id);
      if (!got) continue;
      if (further(got.h, l) >= 0) await pull(id, l, 'cloud', got);
      else if (!ro) { store.backup(got.h, 'conflict'); await push(id, l, got.rec); }
      continue;
    }
    // changed on both sides, or never agreed on: the copy further on wins, then the later played (then the larger sum,
    // so that two devices choose alike); the other copy is kept as a backup. (A cloud copy that, like an open page's,
    // only moved its clock since the base is no change there: this one goes up over it)
    const got = await fetch(id);
    if (!got) continue;
    if (known && typeof b.work === 'string' && b.work === workSum(got.h)) { await push(id, l, got.rec); continue; }
    const d = further(got.h, l) || num(got.h.played) - num(l.played) || (heroSum(got.h) > sumL ? 1 : -1);
    if (d > 0) await pull(id, l, 'conflict', got);
    else if (!ro) { store.backup(got.h, 'conflict'); await push(id, l, got.rec); }
  }
  if (!stop) for (const id of Object.keys(meta.base)) if (!ids.has(id)) delete meta.base[id];
  if (!stop) meta.last = now();
  save();
  if (stop) { R.code = stop; return R; }
  R.ok = true;
  return R;
}

// The hero this page plays, put up on its own, as the page goes away (best effort: no list, the base's rev as the one
// expected; a hero the cloud changed meanwhile is refused 'conflict' and left to the next sync)
export async function pushOne(backend, store, id) {
  const meta = cleanMeta(store.meta());
  if (meta.who !== backend.who) return false;
  const h = store.heroes().find((x) => x && x.id === id), b = meta.base[id];
  if (!h || !b || b.del || typeof b.sum !== 'string') return false;
  const sum = heroSum(h);
  if (sum === b.sum) return false;
  const data = JSON.stringify(h);
  if (data.length > MAX_HERO) return false;
  const r = await backend.put(id, { data, sum, played: num(h.played) }, b.rev, b.sum);
  const m2 = cleanMeta(store.meta());
  m2.base[id] = { rev: r.rev, sum, work: workSum(h) };
  store.setMeta(m2);
  return true;
}

// has any stored hero changed since the cloud last agreed with it (or a deletion not yet told)? A sync is due only then,
// besides the timer that hears other devices. (A hero only left open since, its clock running and nothing done, has not:
// a page left open writes nothing)
export function dirty(store, who) {
  const meta = cleanMeta(store.meta());
  if (meta.who !== who) return true;
  for (const [id, t] of Object.entries(meta.tomb)) if (!meta.base[id]?.del && t) return true;
  for (const h of store.heroes()) {
    if (!h || !HERO_ID.test(h.id)) continue;
    const b = meta.base[h.id];
    if (!b || b.del || typeof b.sum !== 'string') return true;
    if (b.sum !== heroSum(h) && !(typeof b.work === 'string' && b.work === workSum(h))) return true;
  }
  return false;
}
