/**
 * Client helpers for cloud project sync (see pages/api/projects.js).
 * All degrade gracefully: if cloud is off (no token) or the user isn't signed
 * in, they return a disabled/empty result and the app keeps using the local
 * library. Nothing here throws into the UI.
 */
export async function cloudStatus() {
  try {
    const r = await fetch('/api/projects');
    if (r.status === 401) return { enabled: true, signedIn: false, index: [] };
    const d = await r.json();
    return { enabled: !!d.enabled, signedIn: !!d.enabled, index: d.index || [] };
  } catch (e) {
    return { enabled: false, signedIn: false, index: [] };
  }
}

export async function cloudList() {
  const st = await cloudStatus();
  return st.enabled && st.signedIn ? st.index : null;
}

export async function cloudLoad(id) {
  try {
    const r = await fetch(`/api/projects?id=${encodeURIComponent(id)}`);
    const d = await r.json();
    return d && d.enabled ? d.data : null;
  } catch (e) { return null; }
}

export async function cloudSave(id, data) {
  try {
    const r = await fetch('/api/projects', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, data }) });
    return r.ok ? r.json() : null;
  } catch (e) { return null; }
}

export async function cloudDelete(id) {
  try { await fetch(`/api/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); } catch (e) { /* noop */ }
}
