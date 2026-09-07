/**
 * Publish a finished track to a public, shareable streaming link. Env-gated:
 * with BLOB_READ_WRITE_TOKEN set it stores the mastered MP3 + metadata in Vercel
 * Blob and returns a public URL anyone can open and play; without it, returns
 * { enabled:false } and the app falls back to the export bundle.
 *
 * This is a self-hosted "release" — a shareable link, not DSP distribution.
 * One-click distribution to Spotify/Apple needs a distributor (see
 * /api/distribute, docs/ACTIVATION.md).
 */
import { getAuth } from '@clerk/nextjs/server';

export const config = { api: { bodyParser: { sizeLimit: '25mb' } } };

async function blob() { return import('@vercel/blob'); }

const slugify = (s) => (s || 'track').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'track';

export default async function handler(req, res) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) { res.status(200).json({ enabled: false }); return; }
  if (req.method === 'GET') { res.status(200).json({ enabled: true }); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  let userId = 'anon';
  try { userId = (getAuth(req) || {}).userId || 'anon'; } catch (e) { /* Clerk not configured — allow anonymous */ }

  try {
    const { audioBase64, name, format, metadata } = req.body || {};
    if (!audioBase64) { res.status(400).json({ error: 'No audio supplied.' }); return; }
    const ext = format === 'wav' ? 'wav' : 'mp3';
    const ctype = ext === 'wav' ? 'audio/wav' : 'audio/mpeg';
    const bytes = Buffer.from(audioBase64, 'base64');
    if (bytes.length > 25 * 1024 * 1024) { res.status(200).json({ ok: false, error: 'Track too large (25MB max).' }); return; }

    const stamp = `${Date.now()}`;
    const base = `fuse-releases/${userId}/${slugify(name)}-${stamp}`;
    const { put } = await blob();
    const audio = await put(`${base}.${ext}`, bytes, { access: 'public', token, contentType: ctype, addRandomSuffix: false });
    const meta = await put(`${base}.json`, JSON.stringify({ ...(metadata || {}), audioUrl: audio.url, publishedAt: new Date().toISOString() }), {
      access: 'public', token, contentType: 'application/json', addRandomSuffix: false,
    });
    res.status(200).json({ ok: true, url: audio.url, metaUrl: meta.url });
  } catch (e) {
    res.status(200).json({ ok: false, error: e.message });
  }
}
