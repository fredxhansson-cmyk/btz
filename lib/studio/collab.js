/**
 * Real-time collaboration — "Figma for audio".
 *
 * The project lives inside a Yjs CRDT document as nested shared types
 * (Y.Map/Y.Array), so concurrent edits merge FIELD-GRANULARLY: two people adding
 * notes to a pattern, moving different clips, or tweaking different channels all
 * combine without clobbering each other. Only the parts that actually changed
 * are written, so an untouched note a peer just added survives your edit.
 *
 * Transport is peer-to-peer WebRTC (no backend needed for the foundation) with
 * Yjs awareness for live presence. Opt-in per room; solo/offline until you join.
 * Yjs and the provider are lazy-loaded on first join (SSR-safe).
 *
 * Interface (unchanged for callers): joinRoom / leaveRoom / pushProject /
 * setPresence / onCollab / getStatus / isActive.
 */
let state = { doc: null, provider: null, room: null, awareness: null, root: null, Y: null, self: null, onRemote: null };
const listeners = new Set();

export function onCollab(cb) { listeners.add(cb); return () => listeners.delete(cb); }

export function getStatus() {
  const a = state.awareness;
  let peers = [];
  if (a) peers = [...a.getStates().entries()].map(([id, s]) => ({ id, self: id === a.clientID, view: s && s.view, sel: s && s.sel, ...(s && s.user ? s.user : {}) }));
  return { inRoom: !!state.room, room: state.room, connected: !!(state.provider && state.provider.connected), peers };
}
const emit = () => { const st = getStatus(); listeners.forEach((l) => { try { l(st); } catch (e) { /* noop */ } }); };

/* ---------------- field-granular reconcile between plain JS and Yjs ---------------- */

function yToPlain(v, Y) {
  if (v instanceof Y.Map) { const o = {}; v.forEach((val, k) => { o[k] = yToPlain(val, Y); }); return o; }
  if (v instanceof Y.Array) return v.toArray().map((x) => yToPlain(x, Y));
  return v;
}

function plainToY(v, Y) {
  if (Array.isArray(v)) { const a = new Y.Array(); reconcileArray(a, v, Y); return a; }
  if (v && typeof v === 'object') { const m = new Y.Map(); reconcileMap(m, v, Y); return m; }
  return v;
}

function reconcileMap(ymap, obj, Y) {
  for (const k of [...ymap.keys()]) if (!(k in obj)) ymap.delete(k);
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object') {
      const wantArr = Array.isArray(v);
      let child = ymap.get(k);
      if (!(child instanceof (wantArr ? Y.Array : Y.Map))) { child = wantArr ? new Y.Array() : new Y.Map(); ymap.set(k, child); }
      if (wantArr) reconcileArray(child, v, Y); else reconcileMap(child, v, Y);
    } else if (ymap.get(k) !== v) {
      ymap.set(k, v);
    }
  }
}

function reconcileArray(yarr, arr, Y) {
  const idKeyed = arr.length > 0 && arr.every((x) => x && typeof x === 'object' && x.id != null);
  if (idKeyed) {
    // Remove items whose id is gone.
    const want = new Set(arr.map((x) => x.id));
    for (let i = yarr.length - 1; i >= 0; i--) {
      const it = yarr.get(i);
      const id = it instanceof Y.Map ? it.get('id') : (it && it.id);
      if (!want.has(id)) yarr.delete(i, 1);
    }
    // Index the survivors by id.
    const byId = new Map();
    yarr.toArray().forEach((it) => { if (it instanceof Y.Map) byId.set(it.get('id'), it); });
    // Update existing, insert new — in the plain order.
    arr.forEach((item, idx) => {
      let child = byId.get(item.id);
      if (!(child instanceof Y.Map)) { child = new Y.Map(); byId.set(item.id, child); yarr.insert(Math.min(idx, yarr.length), [child]); }
      reconcileMap(child, item, Y);
    });
    return;
  }
  // Scalar / mixed array: replace only if it actually differs (index-based).
  const cur = yarr.toArray();
  const objChild = arr.some((x) => x && typeof x === 'object');
  const same = !objChild && cur.length === arr.length && cur.every((v, i) => v === arr[i]);
  if (!same) {
    if (yarr.length) yarr.delete(0, yarr.length);
    yarr.insert(0, arr.map((v) => ((v && typeof v === 'object') ? plainToY(v, Y) : v)));
  }
}

/* ----------------------------------- room lifecycle ----------------------------------- */

export async function joinRoom(roomId, user, onRemote) {
  leaveRoom();
  const Y = await import('yjs');
  const { WebrtcProvider } = await import('y-webrtc');
  const doc = new Y.Doc();
  // Offline persistence: the shared doc survives reloads (and merges back when
  // peers reconnect), so a session isn't lost if everyone briefly drops.
  let persistence = null;
  try { const { IndexeddbPersistence } = await import('y-indexeddb'); persistence = new IndexeddbPersistence(`fuse-room-${roomId}`, doc); } catch (e) { /* no idb */ }
  const signaling = (process.env.NEXT_PUBLIC_COLLAB_SIGNALING || '').split(',').map((s) => s.trim()).filter(Boolean);
  const provider = new WebrtcProvider(`fuse-room-${roomId}`, doc, signaling.length ? { signaling } : undefined);
  const root = doc.getMap('project');
  const awareness = provider.awareness;
  awareness.setLocalStateField('user', { name: user.name, color: user.color });

  state = { doc, provider, persistence, room: roomId, awareness, root, Y, self: user, onRemote };

  // Any change NOT written by us locally is a remote edit — rebuild the plain
  // project from the merged doc and hand it up.
  root.observeDeep((events, tr) => {
    if (tr && tr.origin === 'local') return;
    if (state.onRemote && root.size) state.onRemote(yToPlain(root, Y));
  });
  awareness.on('change', emit);
  provider.on('status', emit);
  provider.on('peers', emit);
  emit();
  return getStatus();
}

export function leaveRoom() {
  try { if (state.provider) state.provider.destroy(); } catch (e) { /* noop */ }
  try { if (state.persistence) state.persistence.destroy(); } catch (e) { /* noop */ }
  try { if (state.doc) state.doc.destroy(); } catch (e) { /* noop */ }
  state = { doc: null, provider: null, persistence: null, room: null, awareness: null, root: null, Y: null, self: null, onRemote: null };
  emit();
}

/** Merge the local project into the shared doc, field-granularly (samples stripped). */
export function pushProject(project) {
  if (!state.root || !state.doc || !state.Y) return;
  const { samples, ...light } = project || {};
  state.doc.transact(() => { reconcileMap(state.root, light, state.Y); }, 'local');
}

/** Share what the user is doing (view, selection) with the room. */
export function setPresence(patch) {
  if (!state.awareness) return;
  const cur = state.awareness.getLocalState() || {};
  state.awareness.setLocalState({ ...cur, ...patch });
}

export function isActive() { return !!state.room; }
