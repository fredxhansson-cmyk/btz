/**
 * High-quality AI stem separation (cloud tier). Runs a Demucs model on
 * Replicate when REPLICATE_API_TOKEN is set; otherwise returns { enabled:false }
 * and the client falls back to the built-in offline split.
 *
 * Flow (async so a long song never blocks past a function timeout):
 *   POST { audio: <data-uri> } -> { id }        (create prediction)
 *   GET  ?id=<id>              -> { status, output }  (client polls)
 *
 * Configure the model with REPLICATE_STEM_MODEL ("owner/name", default
 * ryan5453/demucs) or pin an exact REPLICATE_STEM_VERSION hash.
 */
export const config = { api: { bodyParser: { sizeLimit: '25mb' } } };

export default async function handler(req, res) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) { res.status(200).json({ enabled: false }); return; }
  const model = process.env.REPLICATE_STEM_MODEL || 'ryan5453/demucs';
  const version = process.env.REPLICATE_STEM_VERSION || '';
  const auth = { Authorization: `Bearer ${token}` };

  try {
    if (req.method === 'GET') {
      const { id } = req.query;
      if (!id) { res.status(200).json({ enabled: true }); return; } // availability probe
      const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, { headers: auth });
      const d = await r.json();
      res.status(200).json({ enabled: true, status: d.status, output: d.output || null, error: d.error || null });
      return;
    }
    if (req.method === 'POST') {
      const { audio } = req.body || {};
      if (!audio) { res.status(400).json({ error: 'audio (data URI) required' }); return; }
      const url = version
        ? 'https://api.replicate.com/v1/predictions'
        : `https://api.replicate.com/v1/models/${model}/predictions`;
      const body = version ? { version, input: { audio } } : { input: { audio } };
      const r = await fetch(url, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { res.status(200).json({ enabled: true, error: d.detail || d.title || 'Provider error' }); return; }
      res.status(200).json({ enabled: true, id: d.id, status: d.status });
      return;
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Stem provider failed' });
  }
}
