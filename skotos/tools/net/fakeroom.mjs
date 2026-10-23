// A faithful stand-in for the claude.ai artifact `room` capability (runtime contract 0.2.87), for the tests: one Hub is
// the server, hub.page() a page's `room` namespace. What it holds to, as the type definitions say:
// - emit: topic ^[a-z][a-z0-9_.-]{0,47}$, data <= 4 KiB of JSON (else rejects invalid_argument); dropped (resolves) while
//   disconnected; echo back to the sender's own page (isMe && sameTab); delivery not promised (hub.loss drops per receiver)
// - presence: merged per field (null removes), <= 4 KiB merged (else rejects invalid_argument, not applied), sent
//   coalesced at ~30 Hz
// - the budget: emits and presence sends share ~40 a second per page, burst 80; past it emits DROP (counted, reported
//   once) and presence waits
// - peers() a frozen snapshot, onPeers at most once a frame with joined/left/updated; join(name) -> NamedRoom (at most 16,
//   name ^[a-z0-9][a-z0-9_.-]{0,47}$), its send budget the lobby's; leave()
// - topics not opened at publish are admin-only: emits on them reject not_permitted for a non-admin page
const TOPIC = /^[a-z][a-z0-9_.-]{0,47}$/, NAME = /^[a-z0-9][a-z0-9_.-]{0,47}$/;
const bytes = (v) => Buffer.byteLength(JSON.stringify(v ?? null));
const err = (code, message = code) => Object.assign(new Error(message), { code });
const later = (fn, ms) => setTimeout(fn, ms);

export class Hub {
  constructor(o = {}) {
    this.loss = o.loss || 0; this.lag = o.lag ?? 20; this.topics = o.topics || null; this.rate = o.rate ?? 40; this.burst = o.burst ?? 80;
    this.rooms = new Map(); this.log = { emits: 0, delivered: 0, lost: 0, budgetDrops: 0, presSends: 0, rejects: {} };
    this.n = 0;
  }
  room(name) { let r = this.rooms.get(name); if (!r) this.rooms.set(name, (r = { name, members: new Map() })); return r; }
  page(o = {}) { return makePage(this, o); }
}
function reject(hub, code) { hub.log.rejects[code] = (hub.log.rejects[code] || 0) + 1; return Promise.reject(err(code)); }

function makePage(hub, o) {
  const pid = 'k' + (++hub.n).toString(36).padStart(4, '0') + Math.random().toString(36).slice(2, 8);
  const page = { pid, by: o.by ?? null, admin: !!o.admin, connected: true, tok: hub.burst, t0: Date.now(), reported: false, joined: new Map() };
  const take = () => { const t = Date.now(); page.tok = Math.min(hub.burst, page.tok + (t - page.t0) / 1000 * hub.rate); page.t0 = t; if (page.tok < 1) return false; page.tok--; return true; };
  const scope = (name) => {
    const R = hub.room(name), H = {}, PH = [], CH = [];
    const me = { peer: pid, by: page.by, kind: 'viewer', guest: !!o.guest, presence: Object.freeze({}), updatedAt: Date.now(), page };
    let snap = Object.freeze([]), pending = null, presWant = null, presT = 0, presTimer = null, gone = false;
    const cachedView = (m) => { let v = m.views.get(page); if (!v) m.views.set(page, (v = view(m))); return v; };
    const view = (m) => Object.freeze({ peer: m.peer, by: m.by, isMe: m.page === page, sameTab: m.page === page, kind: m.kind, guest: m.guest, presence: m.presence, updatedAt: m.updatedAt });
    const S = {
      me, H, PH, CH,
      // (the frame-batched delivery of room changes)
      note(kind, m) {
        pending ||= { joined: new Map(), left: new Map(), updated: new Map() };
        if (kind === 'left') { if (pending.joined.has(m.peer)) pending.joined.delete(m.peer); else pending.left.set(m.peer, m); pending.updated.delete(m.peer); }
        else if (kind === 'joined') pending.joined.set(m.peer, m);
        else if (!pending.joined.has(m.peer)) pending.updated.set(m.peer, m);
        if (!pending.t) pending.t = later(() => S.flush(), 16);
      },
      flush() {
        const p = pending; pending = null; if (gone || !p) return;
        snap = Object.freeze([...R.members.values()].map(cachedView));
        const pick = (map) => Object.freeze([...map.values()].map((m) => snap.find((v) => v.peer === m.peer) || view(m)));
        const ch = { peers: snap, joined: pick(p.joined), left: Object.freeze([...p.left.values()].map(view)), updated: pick(p.updated) };
        for (const fn of PH.slice()) fn(ch);
      }
    };
    // a member's view object is the same frozen object until its presence changes
    me.views = new Map();
    const api = {
      name,
      emit(topic, data) {
        if (gone) return reject(hub, 'invalid_argument');
        if (typeof topic !== 'string' || !TOPIC.test(topic)) return reject(hub, 'invalid_argument');
        let b; try { b = bytes(data); } catch (e) { return reject(hub, 'invalid_argument'); }
        if (b > 4096) return reject(hub, 'invalid_argument');
        if (hub.topics && !hub.topics[topic] && !page.admin) return reject(hub, 'not_permitted');
        if (!page.connected) return Promise.resolve();
        hub.log.emits++;
        if (!take()) { hub.log.budgetDrops++; if (!page.reported) { page.reported = true; } return Promise.resolve(); }
        const copy = JSON.parse(JSON.stringify(data ?? null));
        for (const m of R.members.values()) {
          if (m.page !== page && hub.loss && Math.random() < hub.loss) { hub.log.lost++; continue; }
          later(() => { const s = m.scope; if (!s || !m.page.connected) return; const l = s.H[topic]; if (!l) return; hub.log.delivered++; const msg = Object.freeze({ topic, data: copy, peer: pid, by: page.by, isMe: m.page === page, sameTab: m.page === page, kind: 'viewer', guest: !!o.guest }); for (const fn of l.slice()) fn(msg); }, hub.lag);
        }
        return Promise.resolve();
      },
      on(topic, fn, onError) {
        if (typeof fn !== 'function') throw new TypeError('handler');
        if (!TOPIC.test(topic)) { Promise.resolve().then(() => onError?.({ code: 'invalid_argument', message: 'topic' })); return () => {}; }
        (H[topic] ||= []).push(fn); return () => { const i = H[topic].indexOf(fn); if (i >= 0) H[topic].splice(i, 1); };
      },
      presence(patch) {
        if (gone) return reject(hub, 'invalid_argument');
        const next = Object.assign({}, presWant || me.presence);
        for (const k in patch) { if (patch[k] === null) delete next[k]; else next[k] = patch[k]; }
        let b; try { b = bytes(next); } catch (e) { return reject(hub, 'invalid_argument'); }
        if (b > 4096) return reject(hub, 'invalid_argument');
        presWant = next;
        const send = () => {
          presTimer = null; if (gone || !presWant) return;
          if (!page.connected) { presTimer = later(send, 100); return; }
          // (presence waits past the budget, it is never dropped)
          if (!take()) { presTimer = later(send, 40); return; }
          hub.log.presSends++; presT = Date.now();
          me.presence = Object.freeze(JSON.parse(JSON.stringify(presWant))); presWant = null; me.updatedAt = Date.now();
          me.views.clear(); for (const m of R.members.values()) later(() => m.scope && m.scope.note('updated', me), hub.lag);
        };
        if (!presTimer) presTimer = later(send, Math.max(0, 33 - (Date.now() - presT)));
        return Promise.resolve();
      },
      peers: () => snap,
      onPeers(fn, onError) { PH.push(fn); if (!S.first) { S.first = true; } later(() => { snap = Object.freeze([...R.members.values()].map(cachedView)); fn({ peers: snap, joined: snap, left: Object.freeze([]), updated: Object.freeze([]) }); }, 0); return () => { const i = PH.indexOf(fn); if (i >= 0) PH.splice(i, 1); }; },
      connected: () => page.connected && !gone,
      onConnection(fn, onError) { CH.push(fn); later(() => fn(page.connected), 0); return () => { const i = CH.indexOf(fn); if (i >= 0) CH.splice(i, 1); }; },
      leave() { if (gone) return Promise.resolve(); gone = true; R.members.delete(pid); page.joined.delete(name); for (const m of R.members.values()) later(() => m.scope && m.scope.note('left', me), hub.lag); return Promise.resolve(); }
    };
    me.scope = S;
    R.members.set(pid, me);
    for (const m of R.members.values()) if (m.page !== page) later(() => m.scope && m.scope.note('joined', me), hub.lag);
    snap = Object.freeze([...R.members.values()].map(cachedView));
    return api;
  };
  const lobby = scope('');
  const room = Object.freeze({
    ...lobby,
    join(name) {
      if (typeof name !== 'string' || !NAME.test(name)) return reject(hub, 'invalid_argument');
      if (page.joined.has(name)) return Promise.resolve(page.joined.get(name));
      if (page.joined.size >= 16) return reject(hub, 'limit_reached');
      const r = Object.freeze(scope(name)); page.joined.set(name, r);
      return new Promise((res) => later(() => res(r), hub.lag));
    },
    sendToClaudeSession: () => reject(hub, 'claude_unavailable'),
    canSendToClaudeSession: () => Promise.resolve('off')
  });
  page.room = room;
  // (the test's levers: a dropped and restored connection)
  page.setConnected = (v) => { page.connected = v; for (const R of hub.rooms.values()) { const m = R.members.get(pid); if (m) for (const fn of m.scope.CH.slice()) fn(v); } };
  return page;
}
