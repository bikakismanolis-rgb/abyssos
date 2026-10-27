// Cloud saves in claude.ai: the artifact's db, each viewer's own private documents (data/users/<id>/h-<hero id>), the id
// from the user capability. One document a hero: { k: 'hero', id, rev, played, sum, del, at, data } (data the hero's
// JSON text as stored, at most 96 KiB; a deleted hero's document is its tombstone, del true, data null). rev counts the
// document's writes: a write expects the rev it last saw (game/cloudsync.js) and is refused 'conflict' otherwise. The
// db has no transactions, so this is a read, a check, then a write: two devices writing the same hero within a moment
// can both pass, and the later write stands (the earlier device's copy is still its own, and its next sync sees the
// change). docs/cloudsave/README.md.
//
// claude.use('db') or claude.use('user') resolving null (signed out, a public-link viewer outside the organization, an
// older viewer), or no id: null, and the game is as it was. A write refused invalid_argument is a view that may not write
// its own documents (a Viewer or Commenter): 'read_only'.
const CODE = { invalid_argument: 'read_only', quota_exceeded: 'quota', resource_exhausted: 'rate_limited', revoked: 'revoked', not_granted: 'revoked', capability_disabled: 'revoked', capability_removed: 'revoked' };
const coded = (e) => { const c = typeof e?.code === 'string' ? e.code : 'unavailable'; const x = new Error(c); x.code = CODE[c] || (c === 'conflict' ? c : 'unavailable'); return x; };
const conflict = () => { const x = new Error('conflict'); x.code = 'conflict'; return x; };
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
const head = (id, d) => ({ id, rev: num(d.rev), played: num(d.played), sum: typeof d.sum === 'string' ? d.sum : '', del: !!d.del, at: num(d.at) });

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
  const read = async (id) => { const s = await timed(doc(id).get()); return s?.exists ? s.data() : null; };
  const write = async (id, rev, body) => {
    const cur = await read(id), now = cur ? num(cur.rev) : null;
    if ((now ?? null) !== (rev ?? null)) throw conflict();
    const next = (now || 0) + 1;
    await timed(doc(id).set({ k: 'hero', id, rev: next, ...body }));
    return { rev: next };
  };
  return {
    kind: 'artifact', who: 'art:' + uid,
    async list() {
      const s = await timed(col.get());
      return (s?.docs || []).filter((d) => d.exists && d.id.startsWith('h-')).map((d) => { const x = d.data() || {}; return x.k === 'hero' && x.id === d.id.slice(2) ? head(x.id, x) : null; }).filter(Boolean);
    },
    async get(id) { const x = await read(id); return x && x.id === id ? { ...head(id, x), data: typeof x.data === 'string' ? x.data : null } : null; },
    put: (id, { data, sum, played }, rev) => write(id, rev, { played: num(played), sum, del: false, at: 0, data }),
    remove: (id, at, rev) => write(id, rev, { played: 0, sum: '', del: true, at: num(at), data: null })
  };
}
