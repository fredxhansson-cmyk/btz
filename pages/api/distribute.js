/**
 * Distribution hand-off. Env-gated: with DISTRIBUTOR_API_TOKEN (+ _URL) set it
 * forwards the release metadata to your configured distributor; otherwise it
 * returns { enabled:false } and the app falls back to the export-bundle flow
 * (mastered MP3 + release sheet you upload to any distributor yourself).
 */
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(req, res) {
  const token = process.env.DISTRIBUTOR_API_TOKEN;
  if (!token) { res.status(200).json({ enabled: false }); return; }
  if (req.method === 'GET') { res.status(200).json({ enabled: true }); return; }
  if (req.method === 'POST') {
    const { userId } = (getAuth(req) || {});
    if (!userId) { res.status(401).json({ error: 'Sign in to distribute.' }); return; }
    const base = process.env.DISTRIBUTOR_API_URL;
    if (!base) { res.status(200).json({ ok: false, error: 'DISTRIBUTOR_API_URL not configured' }); return; }
    try {
      const r = await fetch(base, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(req.body || {}), userId }) });
      const d = await r.json().catch(() => ({}));
      res.status(200).json({ ok: r.ok, id: d.id || null, error: r.ok ? null : (d.error || 'Distributor error') });
    } catch (e) {
      res.status(200).json({ ok: false, error: e.message });
    }
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
}
