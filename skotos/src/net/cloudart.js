// Cloud saves in claude.ai: the artifact's db, each viewer's own private documents (data/users/<id>/h-<hero id>), the id
// from the user capability. One document a hero: { k: 'hero', id, rev, played, sum, del, at, data } (data the hero's
// JSON text as stored, at most 96 KiB; a deleted hero's document is its tombstone, del true, data null). rev counts the
// document's writes: a write expects the rev it last saw (game/cloudsync.js) and is refused 'conflict' otherwise. The
// db has no transactions, so this is a read, a check, then a write, made under a short lease of the document (acquire,
// a holder of this page's own): one of this game's pages writes a hero at a time, and a page that finds the lease held
// is refused 'conflict' (the next sync tries again). A runtime without leases, or a lease that lapsed under a slow call,
// can still let two devices write the same rev + 1; the later write stands, and the sync tells it by the document's
// chain, the sums of its last revs (the cloud's record not written over the copy agreed on: weighed as changed on both
// sides, the copy further on kept). docs/cloudsave/README.md.
//
// claude.use('db') or claude.use('user') resolving null (signed out, an older viewer), or no id: null, and the game is
// as it was. A write refused invalid_argument is a view that may not write its own documents ('read_only': a Viewer or
// Commenter, and every visitor from outside the organization but an Editor invited by email while the artifact is not
// shared by link; they read their own documents, but the db refuses their writes).
const CODE = { invalid_argument: 'read_only', quota_exceeded: 'quota', resource_exhausted: 'rate_limited', revoked: 'revoked', not_granted: 'revoked', capability_disabled: 'revoked', capability_removed: 'revoked' };
const coded = (e) => { if (e?.mapped) return e; const c = typeof e?.code === 'string' ? e.code : 'unavailable'; const x = new Error(c); x.code = CODE[c] || (c === 'conflict' ? c : 'unavailable'); x.raw = c; x.mapped = true; return x; };
const conflict = () => { const x = new Error('conflict'); x.code = 'conflict'; x.mapped = true; return x; };
// (a lease covers a write's read, check and set (one that its page never finishes lapses by itself), and is shortened
// to the least there is once the write is done: the db has no release)
const LEASE_MS = 10000, LEASE_MIN = 1000;
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
// (chain: the sums of the document's last CHAIN revs, { rev: sum }, each write's own added to the one it was written
// over: a device that agreed on a rev whose write did not stand tells it however many writes came after (cloudsync.js
// forked))
const CHAIN = 16;
const chainOf = (cur, next, sum) => {
  const out = {}, prev = cur?.chain && typeof cur.chain === 'object' && !Array.isArray(cur.chain) ? cur.chain : {};
  for (const [k, v] of Object.entries(prev)) if (/^[0-9]{1,9}$/.test(k) && +k > next - CHAIN && +k < next && typeof v === 'string') out[k] = v;
  out[next] = sum;
  return out;
};
const head = (id, d) => ({ id, rev: num(d.rev), played: num(d.played), sum: typeof d.sum === 'string' ? d.sum : '', del: !!d.del, at: num(d.at), chain: d.chain && typeof d.chain === 'object' && !Array.isArray(d.chain) ? d.chain : null });

export async function artifactBackend(claude, o = {}) {
  if (!claude?.use) return null;
  let db = null, user = null;
  try { [db, user] = await Promise.all([claude.use('db'), claude.use('user')]); } catch (e) { return null; }
  if (!db || !user) return null;
  let uid = null;
  try { uid = await user.id(); } catch (e) { uid = null; }
  if (typeof uid !== 'string' || !uid) return null;
  let col;
  try { col = db.collection('data/users/' + uid); } catch (e) { return null; }
  const doc = (id) => col.doc('h-' + id);
  // (a call the platform never answers is given up: the sync ends and nothing changes)
  const ms = o.ms || 15000;
  const timed = (p) => new Promise((ok, no) => { const t = setTimeout(() => no(coded({ code: 'unavailable' })), ms); Promise.resolve(p).then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); no(coded(e)); }); });
  // (a document that is not a hero's, one a lease alone left say, is no hero)
  const read = async (id) => { const s = await timed(doc(id).get()); const x = s?.exists ? s.data() : null; return x && x.k === 'hero' ? x : null; };
  const holder = 'skotos:' + uid.slice(0, 40) + ':' + Math.random().toString(36).slice(2, 12);
  // the document leased to this page for a write; refused 'conflict' when another page holds it. A runtime with no
  // leases (acquire missing, or capability_removed): the write goes on without one
  const lease = async (id) => {
    const d = doc(id);
    if (typeof d.acquire !== 'function') return;
    let r;
    try { r = await timed(d.acquire({ holder, ttlMs: LEASE_MS })); } catch (e) { if (e?.raw === 'capability_removed') return; throw e; }
    if (r && r.acquired === false) throw conflict();
  };
  // (expect: the sum the caller agreed on at that rev; another one there is a write made from the same rev that landed
  // instead of the one the caller agreed on: refused too, and the sync weighs the two)
  const write = async (id, rev, body, expect) => {
    await lease(id);
    const cur = await read(id), now = cur ? num(cur.rev) : null;
    if ((now ?? null) !== (rev ?? null)) throw conflict();
    if (cur && typeof expect === 'string' && (typeof cur.sum === 'string' ? cur.sum : '') !== expect) throw conflict();
    const next = (now || 0) + 1;
    await timed(doc(id).set({ k: 'hero', id, rev: next, ...body, chain: chainOf(cur, next, body.sum) }));
    try { Promise.resolve(doc(id).acquire?.({ holder, ttlMs: LEASE_MIN })).catch(() => {}); } catch (e) { /* it lapses by itself */ }
    return { rev: next };
  };
  return {
    kind: 'artifact', who: 'art:' + uid,
    async list() {
      const s = await timed(col.get());
      return (s?.docs || []).filter((d) => d.exists && d.id.startsWith('h-')).map((d) => { const x = d.data() || {}; return x.k === 'hero' && x.id === d.id.slice(2) ? head(x.id, x) : null; }).filter(Boolean);
    },
    async get(id) { const x = await read(id); return x && x.id === id ? { ...head(id, x), data: typeof x.data === 'string' ? x.data : null } : null; },
    put: (id, { data, sum, played }, rev, expect) => write(id, rev, { played: num(played), sum, del: false, at: 0, data }, expect),
    remove: (id, at, rev, expect) => write(id, rev, { played: 0, sum: '', del: true, at: num(at), data: null }, expect)
  };
}
