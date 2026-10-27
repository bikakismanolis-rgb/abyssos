// Cloud saves on the web build: the Supabase project's skotos schema (supabase/migrations/*_skotos_saves.sql), reached
// only through its SECURITY DEFINER functions. docs/cloudsave/README.md.
//
// Who: this browser signs in anonymously once and keeps the session in localStorage, under a key of its own
// ('skotos-save-auth'; co-op's session is each tab's own, in sessionStorage, so two tabs stay two co-op players while
// both save as one browser). The server ties the user to a player: the saves are the player's, and any user who gives
// the player's save code is tied to it too. The code is made by the server (80 random bits, sixteen letters and digits
// of Crockford's base 32, shown as XXXX-XXXX-XXXX-XXXX); the server keeps only its SHA-256, so the code is shown when it
// is made and kept on this device (localStorage, with the player it is the code of) to be shown again. Another device
// types it ("restore from a code") and from then on plays the same heroes. A device whose session is gone (its site
// data cleared but the code written down, or the anonymous user cleared from the project) signs in anew and takes its
// code again by itself. The code kept here is only ever replaced by one the server answered for: a claim of it that
// ends without a clear answer (offline, its answer lost, the tries spent) leaves it as it is, marked (PENDING_KEY), and
// the backend is not made (start() tries again later) until a claim is answered, or save_hello shows the user tied to
// another player than the one it had.
//
// The player is the page's to name: every call of the player's saves (list, get, put, delete, a new code) says which
// player the page means, and the server refuses 'moved' when it has the user on another one (a code taken in another tab
// of this browser, which shares the session; a claim whose answer was lost; the user let go by a new code made on
// another device). The backend then asks again (save_hello), takes the server's player, and the refusal ends the sync
// before it changed anything: the next one starts from that player's base and tombstones. The code is shown only once
// the server has said it is the player's (made, claimed or renewed with its answer here, or checked by save_hello).
const AUTH_KEY = 'skotos-save-auth', CODE_KEY = 'skotos.cloud.code', PENDING_KEY = 'skotos.cloud.claim', CALL_MS = 10000;
const coded = (c, d) => { const e = new Error(c); e.code = c; if (d) e.data = d; return e; };
const local = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } };
// a code as typed: letters upper case, Crockford's look-alikes read as the digits they stand for, separators dropped
export function normCode(s) { return String(s || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[^0-9A-Z]/g, ''); }
export const showCode = (c) => (c ? c.match(/.{1,4}/g).join('-') : '');
export const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{16}$/;
// the code kept in a storage: { player, code } (player null: a code kept before the player was kept with it), or null
export function keptCode(store) {
  let v = null;
  try { v = store?.getItem(CODE_KEY) ?? null; } catch (e) { v = null; }
  if (!v) return null;
  let k = null;
  try { k = JSON.parse(v); } catch (e) { k = null; }
  if (!k || typeof k !== 'object') k = { player: null, code: v };
  const c = normCode(k.code);
  return CODE_RE.test(c) ? { player: typeof k.player === 'string' ? k.player : null, code: c } : null;
}
// refusals that are a clear answer: nothing happened on the server
const CLEAR = new Set(['bad_code', 'rate_limited', 'quota', 'too_big', 'too_many', 'bad_data', 'invalid_argument', 'conflict']);

export async function supabaseBackend(cfg, o = {}) {
  const make = cfg?.createClient;
  if (!cfg?.url || !cfg?.anonKey || !make) return null;
  const store = o.storage || local();
  const client = await make(cfg.url, cfg.anonKey, { auth: { storageKey: AUTH_KEY, storage: store || undefined, persistSession: !!store, autoRefreshToken: true, detectSessionInUrl: false } });
  const ms = o.ms || CALL_MS;
  // (each call has its deadline: a request that never settles is given up, 'offline', and nothing waits on it)
  const rpc = (fn, args) => new Promise((ok, no) => {
    let q = client.schema('skotos').rpc(fn, args || {}), ac = null;
    if (typeof q?.abortSignal === 'function' && typeof AbortController !== 'undefined') { ac = new AbortController(); q = q.abortSignal(ac.signal); }
    const t = setTimeout(() => { try { ac?.abort(); } catch (e) { /* gone */ } no(coded('offline')); }, ms);
    Promise.resolve(q).then((r) => {
      clearTimeout(t);
      if (r?.error) { no(coded(/fetch|network/i.test(String(r.error.message)) ? 'offline' : String(r.error.message || r.error.code || 'unavailable').slice(0, 64))); return; }
      const d = r?.data;
      if (d && typeof d === 'object' && !Array.isArray(d) && typeof d.error === 'string') no(coded(d.error, d)); else ok(d);
    }, () => { clearTimeout(t); no(coded('offline')); });
  });
  const a = client.auth;
  let user = null, fresh = false;
  try { user = (await a.getSession())?.data?.session?.user || null; } catch (e) { user = null; }
  if (!user) {
    const r = await a.signInAnonymously({ options: { data: { app: 'skotos-save' } } });
    if (r?.error) throw coded(/rate/i.test(String(r.error.message)) ? 'rate_limited' : 'no_sign_in');
    user = r?.data?.user || r?.data?.session?.user || null; fresh = true;
  }
  if (!user?.id) throw coded('no_sign_in');
  const pending = () => { try { return store?.getItem(PENDING_KEY) || null; } catch (e) { return null; } };
  const setPending = (c) => { try { if (c) store?.setItem(PENDING_KEY, c); else store?.removeItem?.(PENDING_KEY); } catch (e) { /* the next start claims again only on a new player */ } };
  // (a code kept as the player's (or none: setKept(null, null), a kept code the server says is not this player's))
  const setKept = (player, c) => { try { if (c) store?.setItem(CODE_KEY, JSON.stringify({ player, code: c })); else store?.removeItem?.(CODE_KEY); } catch (e) { /* shown now only */ } setPending(null); };
  const B = { kind: 'supabase', who: null, player: null };
  // sure: the server has said, this visit, that the code kept is B.player's; stale: B's player may not be the server's
  // (a claim or a new code whose answer never came, and asking again failed too): asked before the next call
  let sure = false, stale = false;
  const take = (r) => { if (!r || typeof r.player !== 'string') throw coded('unavailable'); B.player = r.player; B.who = 'sb:' + r.player; if (typeof r.code === 'string') { setKept(r.player, normCode(r.code)); sure = true; } return r; };
  // what save_hello said of the code c it was given: that player's (kept as its), or not (no longer kept: it is a dead
  // code, or another player's; Settings offers a new one)
  const verdict = (h, c) => {
    if (typeof h?.code === 'string' || !c) return;
    if (h.code_ok === true) { setKept(B.player, c); sure = true; }
    else if (h.code_ok === false) { if (keptCode(store)?.code === c) setKept(null, null); sure = false; }
  };
  // (a new session with a code kept here: the code's player again, not a new one)
  const kept = keptCode(store)?.code || null;
  let hello = null, dead = false;
  // the kept code claimed: its player (the code kept as it is), or null when the server says the code is no more
  // (bad_code: the player save_hello gives, with its own code, stands). Any other end leaves it unsettled: the code kept,
  // marked, and the start given up (thrown), unless save_hello now finds the user tied to another player than h's, the
  // claim having gone through with its answer lost
  const claimKept = async (h) => {
    let r;
    try { r = await rpc('save_claim', { code: kept }); } catch (e) {
      if (e.code === 'bad_code') { dead = true; setPending(null); return null; }
      setPending(kept);
      if (typeof h?.player === 'string') {
        let h2 = null; try { h2 = await rpc('save_hello', { p_code: kept }); } catch (x) { h2 = null; }
        if (typeof h2?.player === 'string' && h2.player !== h.player) { setPending(null); const out = take(h2); verdict(h2, kept); return out; }
      }
      throw e;
    }
    const out = take({ player: r?.player });
    setKept(B.player, kept); sure = true;
    return out;
  };
  // (a device with nothing yet that takes another's code: that player at once, none made for it)
  if (o.claim != null) {
    const want = normCode(o.claim);
    if (!CODE_RE.test(want)) throw coded('bad_code');
    hello = take(await rpc('save_claim', { code: want })); setKept(B.player, want); sure = true;
  }
  if (!hello && fresh && kept) hello = await claimKept(null);
  if (!hello) {
    // (a user the server tied to no player, with a code kept here (or one whose claim of it never got its answer): that
    // code's player, the one just made let go by it. With the project's players cap reached, save_hello makes none and
    // says player null: the kept code's claim needs none)
    const h = await rpc('save_hello', kept ? { p_code: kept } : {});
    if (kept && !dead && (h?.new || typeof h?.player !== 'string' || pending() === kept)) hello = await claimKept(h);
    if (!hello) {
      if (typeof h?.player !== 'string') throw coded(h?.quota ? 'quota' : 'unavailable');
      hello = take(h);
      verdict(h, kept);
      // (the kept code is no more, and this player's own code was never kept here: a new one for it, so that the code
      // shown is one that works)
      if (dead && typeof h?.code !== 'string') { try { const r = await rpc('save_new_code', { p_player: B.player }); if (typeof r?.code === 'string') { setKept(B.player, normCode(r.code)); sure = true; } } catch (e) { /* none shown until a new one is made */ } }
    }
  }
  // the server asked again which player this user is on: B takes it, and the kept code is shown again only if the server
  // says it is that player's (c: a code just claimed, checked first; then the one kept)
  let asking = null;
  const again = (c) => (asking ||= (async () => {
    try {
      const k = keptCode(store);
      const h = await rpc('save_hello', c || k ? { p_code: c || k.code } : {});
      if (typeof h?.player !== 'string') throw coded(h?.quota ? 'quota' : 'unavailable');
      take(h); stale = false;
      if (typeof h.code === 'string') return;
      if (h.code_ok === true || !c || !k || k.code === c) { verdict(h, c || k?.code); return; }
      // (not the code claimed: the claim never went through; the one kept checked as on any start)
      const h2 = await rpc('save_hello', { p_code: k.code });
      if (h2?.player === B.player) verdict(h2, k.code); else sure = false;
    } finally { asking = null; }
  })());
  // a call of the player's saves: the player named; refused 'moved' when the server has this user on another (B takes
  // it first: the refusal ends the sync)
  const mine = async (fn, args) => {
    if (stale) { try { await again(); } catch (e) { throw coded(e?.code || 'offline'); } }
    try { return await rpc(fn, { p_player: B.player, ...args }); } catch (e) {
      if (e.code !== 'moved' && e.code !== 'no_player') throw e;
      stale = true;
      try { await again(); } catch (x) { /* asked again before the next call */ }
      throw coded('moved');
    }
  };
  Object.assign(B, {
    list: () => mine('save_list').then((x) => (Array.isArray(x) ? x : [])),
    get: (id) => mine('save_get', { hero_id: id }),
    put: (id, { data, sum, played }, rev) => mine('save_put', { hero_id: id, data, sum, played: Math.round(played || 0), base_rev: rev ?? null }),
    remove: (id, at, rev) => mine('save_delete', { hero_id: id, at: Math.round(at || 0), base_rev: rev ?? null }),
    // the code shown: the one kept, once the server has said it is this player's
    code: () => { const k = keptCode(store); return sure && k && k.player === B.player ? k.code : null; },
    // another device's code: this browser's saves are that player's from now on (game/cloud.js syncs both ways after).
    // A claim with no clear answer: the server asked which player the user is on now (the claim went through when it is
    // the code's)
    async claim(c) {
      const n = normCode(c); if (!CODE_RE.test(n)) throw coded('bad_code');
      let r;
      try { r = await rpc('save_claim', { code: n }); } catch (e) {
        if (CLEAR.has(e.code)) throw e;
        stale = true;
        try { await again(n); } catch (x) { /* asked again before the next call */ }
        if (B.code() === n) return B.who;
        throw e;
      }
      take({ player: r?.player }); setKept(B.player, n); sure = true; return B.who;
    },
    // a new code for this player; the old one no longer works, and every other user tied to the player is let go (one
    // written where others may have seen it). One with no clear answer: the server asked whether the kept code still is
    // the player's (the new one was made when it is not: none shown until another is made)
    async newCode() {
      let r;
      try { r = await mine('save_new_code'); } catch (e) {
        if (!CLEAR.has(e.code) && e.code !== 'moved') { stale = true; try { await again(); } catch (x) { /* asked again later */ } }
        throw e;
      }
      if (typeof r?.code !== 'string') throw coded('unavailable');
      setKept(B.player, normCode(r.code)); sure = true; return B.code();
    }
  });
  return B;
}
