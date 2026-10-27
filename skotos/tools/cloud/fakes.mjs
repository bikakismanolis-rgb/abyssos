// Stand-ins for the cloud save tests (tools/cloud/test-sync.mjs, test-saves.mjs): a device's stored heroes (what
// game/save.js gives game/cloudsync.js), and the claude.ai artifact's db and user capabilities as db.d.ts and user.d.ts
// describe them (per-viewer private documents under data/users/<id>/, get/set, collection get; refusals as DbError codes).
const clone = (x) => JSON.parse(JSON.stringify(x));

// one device: its stored heroes, the cloud module's record, its backups, the hero it plays
export function device() {
  const D = { heroes: [], meta: {}, bak: [], cur: null };
  const store = {
    heroes: () => clone(D.heroes),
    current: () => D.cur,
    put(h) { if (h.id === D.cur) return false; const i = D.heroes.findIndex((x) => x.id === h.id); if (i >= 0) D.heroes[i] = clone(h); else D.heroes.push(clone(h)); return true; },
    drop(id) { if (id === D.cur) return false; D.heroes = D.heroes.filter((x) => x.id !== id); return true; },
    meta: () => clone(D.meta),
    setMeta(m) { D.meta = clone(m); },
    backup(h, why) { D.bak.unshift({ why, hero: clone(h) }); if (D.bak.length > 6) D.bak.length = 6; }
  };
  return {
    D, store,
    hero: (id) => D.heroes.find((h) => h.id === id),
    // a hero played here: changed, its played time later (as writeSave does)
    play(id, f = (h) => { h.gold += 1; }, at) { const h = D.heroes.find((x) => x.id === id); f(h); h.played = at ?? Date.now(); return h; },
    add(h) { D.heroes.push(clone(h)); },
    del(id) { D.heroes = D.heroes.filter((h) => h.id !== id); D.meta.tomb ||= {}; D.meta.tomb[id] = Date.now(); },
    snap: () => JSON.stringify({ h: D.heroes, m: D.meta, b: D.bak })
  };
}
export function hero(id, o = {}) {
  return Object.assign({ id, cls: 'warden', level: 5, xp: 0, gold: 100, diff: 0, skills: {}, points: 0, inv: new Array(32).fill(null), equip: {}, stash: new Array(48).fill(null), quest: 2, flags: {}, wps: ['town'], act1: -1, act2: -1, act3: -1, act4: -1, act5: -1, gateBest: 0, boons: [], stats: { kills: 3, deaths: 0, time: 60, legs: 0, elites: 0 }, created: 1, played: 1000 }, o);
}

// the artifact's db: one store shared by every viewer of the artifact; each viewer sees only its own data/users/<id>/.
// net: { offline, readOnly, failGet, calls } to make it fail
export function artifactDb() {
  const docs = new Map(), net = { offline: false, readOnly: false, failGet: 0, calls: 0, sets: 0 };
  const err = (code) => Object.assign(new Error(code), { code });
  const snap = (id, v) => ({ id, exists: !!v, data: () => (v ? clone(v) : undefined), metadata: { fromCache: false, hasPendingWrites: false } });
  const forViewer = (uid) => {
    const mine = (path) => path.startsWith('data/users/' + uid + '/');
    const check = () => { net.calls++; if (net.offline) throw err('unavailable'); };
    const docRef = (path) => {
      const segs = path.split('/');
      if (segs.length % 2) throw new TypeError('a document path has an even number of segments: ' + path);
      return {
        id: segs[segs.length - 1], path,
        async get() { check(); if (net.failGet > 0) { net.failGet--; throw err('unavailable'); } return snap(segs[segs.length - 1], mine(path) ? docs.get(path) : null); },
        async set(v) { check(); if (net.readOnly || !mine(path)) throw err('invalid_argument'); if (!v || typeof v !== 'object' || Array.isArray(v)) throw err('invalid_argument'); if (JSON.stringify(v).length > 256 * 1024) throw err('invalid_argument'); net.sets++; docs.set(path, clone(v)); },
        async delete() { check(); if (net.readOnly || !mine(path)) throw err('invalid_argument'); docs.delete(path); }
      };
    };
    return {
      doc: docRef,
      collection(path) {
        if (!(path.split('/').length % 2)) throw new TypeError('a collection path has an odd number of segments: ' + path);
        return {
          path,
          doc: (id) => docRef(path + '/' + id),
          async get() { check(); const out = []; for (const [p, v] of docs) if (p.startsWith(path + '/') && p.split('/').length === path.split('/').length + 1 && mine(p)) out.push(snap(p.split('/').pop(), v)); out.sort((a, b) => (a.id < b.id ? -1 : 1)); return { docs: out, size: out.length, empty: !out.length }; }
        };
      }
    };
  };
  // claude for a viewer: uid null (signed out: db and user null), or db null (an older viewer)
  const claude = (uid, o = {}) => ({ use: async (name) => (name === 'db' ? (uid && !o.noDb ? forViewer(uid) : null) : name === 'user' ? (uid ? { id: async () => uid } : null) : null) });
  return { docs, net, claude };
}
