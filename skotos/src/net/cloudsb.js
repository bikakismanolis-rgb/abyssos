// Cloud saves on the web build: the Supabase project's skotos schema (supabase/migrations/*_skotos_saves.sql), reached
// only through its SECURITY DEFINER functions. docs/cloudsave/README.md.
//
// Who: this browser signs in anonymously once and keeps the session in localStorage, under a key of its own
// ('skotos-save-auth'; co-op's session is each tab's own, in sessionStorage, so two tabs stay two co-op players while
// both save as one browser). The server ties the user to a player: the saves are the player's, and any user who gives
// the player's save code is tied to it too. The code is made by the server (80 random bits, sixteen letters and digits
// of Crockford's base 32, shown as XXXX-XXXX-XXXX-XXXX); the server keeps only its SHA-256, so the code is shown when it
// is made and kept on this device (localStorage) to be shown again. Another device types it ("restore from a code") and
// from then on plays the same heroes. A device whose session is gone (its site data cleared but the code written down,
// or the anonymous user cleared from the project) signs in anew and takes its code again by itself. The code kept here
// is only ever replaced by one the server answered for: a claim of it that ends without a clear answer (offline, its
// answer lost, the tries spent) leaves it as it is, marked (PENDING_KEY), and the backend is not made (start() tries
// again later) until a claim is answered, or save_hello shows the user tied to another player than the one it had.
const AUTH_KEY = 'skotos-save-auth', CODE_KEY = 'skotos.cloud.code', PENDING_KEY = 'skotos.cloud.claim', CALL_MS = 10000;
const coded = (c) => { const e = new Error(c); e.code = c; return e; };
const local = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } };
// a code as typed: letters upper case, Crockford's look-alikes read as the digits they stand for, separators dropped
export function normCode(s) { return String(s || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[^0-9A-Z]/g, ''); }
export const showCode = (c) => (c ? c.match(/.{1,4}/g).join('-') : '');
export const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{16}$/;

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
      if (d && typeof d === 'object' && !Array.isArray(d) && typeof d.error === 'string') no(coded(d.error)); else ok(d);
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
  const getCode = () => { try { const c = normCode(store?.getItem(CODE_KEY)); return CODE_RE.test(c) ? c : null; } catch (e) { return null; } };
  const pending = () => { try { return store?.getItem(PENDING_KEY) || null; } catch (e) { return null; } };
  const setPending = (c) => { try { if (c) store?.setItem(PENDING_KEY, c); else store?.removeItem?.(PENDING_KEY); } catch (e) { /* the next start claims again only on a new player */ } };
  const setCode = (c) => { try { store?.setItem(CODE_KEY, c); } catch (e) { /* shown now only */ } setPending(null); };
  const B = { kind: 'supabase', who: null, player: null };
  const take = (r) => { if (!r || typeof r.player !== 'string') throw coded('unavailable'); B.player = r.player; B.who = 'sb:' + r.player; if (typeof r.code === 'string') setCode(normCode(r.code)); return r; };
  // (a new session with a code kept here: the code's player again, not a new one)
  const kept = getCode();
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
      if (h?.player) { let h2 = null; try { h2 = await rpc('save_hello'); } catch (x) { h2 = null; } if (typeof h2?.player === 'string' && h2.player !== h.player) { setPending(null); return take({ player: h2.player }); } }
      throw e;
    }
    const out = take({ player: r?.player });
    setPending(null);
    return out;
  };
  // (a device with nothing yet that takes another's code: that player at once, none made for it)
  if (o.claim != null) {
    const want = normCode(o.claim);
    if (!CODE_RE.test(want)) throw coded('bad_code');
    hello = take(await rpc('save_claim', { code: want })); setCode(want);
  }
  if (!hello && fresh && kept) hello = await claimKept(null);
  if (!hello) {
    // (a user the server tied to no player, with a code kept here (or one whose claim of it never got its answer): that
    // code's player, the one just made let go by it)
    const h = await rpc('save_hello');
    if (kept && !dead && (h?.new || pending() === kept)) hello = await claimKept(h);
    if (!hello) {
      hello = take(h);
      // (the kept code is no more, and this player's own code was never kept here: a new one for it, so that the code
      // shown is one that works)
      if (dead && typeof h?.code !== 'string') { try { const r = await rpc('save_new_code'); if (typeof r?.code === 'string') setCode(normCode(r.code)); } catch (e) { /* the old code shown until a new one is made */ } }
    }
  }
  Object.assign(B, {
    list: () => rpc('save_list').then((x) => (Array.isArray(x) ? x : [])),
    get: (id) => rpc('save_get', { hero_id: id }),
    put: (id, { data, sum, played }, rev) => rpc('save_put', { hero_id: id, data, sum, played: Math.round(played || 0), base_rev: rev ?? null }),
    remove: (id, at, rev) => rpc('save_delete', { hero_id: id, at: Math.round(at || 0), base_rev: rev ?? null }),
    code: getCode,
    // another device's code: this browser's saves are that player's from now on (game/cloud.js syncs both ways after)
    async claim(c) { const n = normCode(c); if (!CODE_RE.test(n)) throw coded('bad_code'); take({ player: (await rpc('save_claim', { code: n }))?.player }); setCode(n); return B.who; },
    // a new code for this player; the old one no longer works (one written where others may have seen it)
    async newCode() { const r = await rpc('save_new_code'); if (typeof r?.code !== 'string') throw coded('unavailable'); setCode(normCode(r.code)); return getCode(); }
  });
  return B;
}
