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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Is high-quality cloud (AI) stem separation configured? */
export async function cloudStemEnabled() {
  try { const r = await fetch('/api/stem'); const d = await r.json(); return !!d.enabled; } catch (e) { return false; }
}

/**
 * Separate an audio data-URI into stems via the cloud provider. Returns the
 * provider output (an object of {name:url} or an array of urls), or null on
 * failure/timeout so the caller can fall back to the offline split.
 */
export async function cloudSeparate(dataUri, onProgress) {
  try {
    const r = await fetch('/api/stem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio: dataUri }) });
    const d = await r.json();
    if (!d.enabled || d.error || !d.id) return null;
    for (let i = 0; i < 160; i++) { // ~7 min ceiling
      // eslint-disable-next-line no-await-in-loop
      await sleep(2600);
      // eslint-disable-next-line no-await-in-loop
      const s = await (await fetch(`/api/stem?id=${encodeURIComponent(d.id)}`)).json();
      if (onProgress) onProgress(s.status || 'processing');
      if (s.status === 'succeeded') return s.output || null;
      if (s.status === 'failed' || s.status === 'canceled') return null;
    }
    return null;
  } catch (e) { return null; }
}
