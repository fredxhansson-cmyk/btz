/**
 * Audio-URL fetch proxy for the "Sample from URL" feature. Fetches a DIRECT
 * audio file server-side (so browser CORS doesn't block it) and streams the
 * bytes back. Deliberately NOT a page/stream ripper: it only returns responses
 * whose content-type is audio (or a known audio file extension), so YouTube
 * pages, Spotify streams (DRM), etc. are rejected. The user is responsible for
 * having the rights to sample whatever they load.
 */
export const config = { api: { responseLimit: false } };

const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)(\?|#|$)/i;
const AUDIO_CT = /^(audio\/|application\/ogg|application\/octet-stream)/i;
const MAX = 25 * 1024 * 1024;

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: 'A valid http(s) URL is required.' });
    return;
  }
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Fuse/1.0' } });
    if (!r.ok) { res.status(502).json({ error: `Source returned ${r.status}.` }); return; }
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if (!AUDIO_CT.test(ct) && !AUDIO_EXT.test(url)) {
      res.status(415).json({ error: 'That link is not a direct audio file. Paste a link to an actual .mp3 / .wav / .ogg file you have the rights to sample (not a YouTube/Spotify page).' });
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX) { res.status(413).json({ error: 'Audio file too large (max 25 MB).' }); return; }
    res.setHeader('Content-Type', ct && AUDIO_CT.test(ct) ? ct : 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).json({ error: 'Could not fetch that URL.' });
  }
}
