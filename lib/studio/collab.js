/**
 * Real-time collaboration foundation — "Figma for audio".
 *
 * A Yjs CRDT document is shared over a peer-to-peer WebRTC provider (no backend
 * required for the foundation), so several people in the same room see each
 * other (presence) and share one project. Opt-in per room; when you're not in a
 * room the app is exactly as before (solo, offline).
 *
 * This first foundation syncs the whole project as one CRDT value (last-writer-
 * wins, debounced, samples stripped to stay light) plus live awareness/presence.
 * The next iteration makes the merge field-granular (per note/clip) on top of
 * the same Y.Doc + provider wired up here.
 *
 * Yjs and the provider are lazy-loaded on first join so nothing browser-only
 * runs at import time (SSR-safe).
 */
let state = { doc: null, provider: null, room: null, awareness: null, ymap: null, self: null, applying: false, onRemote: null };
const listeners = new Set();

export function onCollab(cb) { listeners.add(cb); return () => listeners.delete(cb); }

export function getStatus() {
  const a = state.awareness;
  let peers = [];
  if (a) {
    peers = [...a.getStates().entries()].map(([id, s]) => ({ id, self: id === a.clientID, ...(s && s.user ? s.user : {}) }));
  }
  return {
    inRoom: !!state.room,
    room: state.room,
    connected: !!(state.provider && state.provider.connected),
    peers,
  };
}

const emit = () => { const st = getStatus(); listeners.forEach((l) => { try { l(st); } catch (e) { /* noop */ } }); };

export async function joinRoom(roomId, user, onRemote) {
  leaveRoom();
  const Y = await import('yjs');
  const { WebrtcProvider } = await import('y-webrtc');
  const doc = new Y.Doc();
  const signaling = (process.env.NEXT_PUBLIC_COLLAB_SIGNALING || '').split(',').map((s) => s.trim()).filter(Boolean);
  const provider = new WebrtcProvider(`fuse-room-${roomId}`, doc, signaling.length ? { signaling } : undefined);
  const ymap = doc.getMap('project');
  const awareness = provider.awareness;
  awareness.setLocalStateField('user', { name: user.name, color: user.color });

  state = { doc, provider, room: roomId, awareness, ymap, self: user, applying: false, onRemote };

  ymap.observe(() => {
    if (state.applying) return;
    const json = ymap.get('doc');
    if (json && state.onRemote) state.onRemote(json);
  });
  awareness.on('change', emit);
  provider.on('status', emit);
  provider.on('peers', emit);
  emit();
  return getStatus();
}

export function leaveRoom() {
  try { if (state.provider) state.provider.destroy(); } catch (e) { /* noop */ }
  try { if (state.doc) state.doc.destroy(); } catch (e) { /* noop */ }
  state = { doc: null, provider: null, room: null, awareness: null, ymap: null, self: null, applying: false, onRemote: null };
  emit();
}

/** Push the local project into the shared doc (samples stripped to stay light). */
export function pushProject(project) {
  if (!state.ymap || !state.doc) return;
  const { samples, ...light } = project || {};
  state.applying = true;
  try { state.doc.transact(() => { state.ymap.set('doc', light); }); } finally { state.applying = false; }
}

/** Share what the user is doing (view, selection) with the room. */
export function setPresence(patch) {
  if (!state.awareness) return;
  const cur = state.awareness.getLocalState() || {};
  state.awareness.setLocalState({ ...cur, ...patch });
}

export function isActive() { return !!state.room; }
