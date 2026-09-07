/** Client helpers for the sound-pack marketplace (see pages/api/market.js). */
export async function marketStatus() {
  try { const r = await fetch('/api/market'); const d = await r.json(); return { enabled: !!d.enabled, index: d.index || [] }; } catch (e) { return { enabled: false, index: [] }; }
}
export async function marketGet(id) {
  try { const r = await fetch(`/api/market?id=${encodeURIComponent(id)}`); const d = await r.json(); return d && d.enabled ? d.pack : null; } catch (e) { return null; }
}
export async function marketPublish(pack) {
  try {
    const r = await fetch('/api/market', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pack) });
    if (r.status === 401) return { error: 'signin' };
    return r.ok ? r.json() : { error: 'failed' };
  } catch (e) { return { error: 'failed' }; }
}
