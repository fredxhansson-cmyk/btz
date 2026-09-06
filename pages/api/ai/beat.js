/**
 * Optional LLM refinement for the prompt→beat feature. The studio works fully
 * without this: if no API key is configured we return { enabled: false } and the
 * client falls back to its local, free parser. When OPENAI_API_KEY is set we ask
 * a small model to translate the prompt into a strict beat-spec JSON, which the
 * app's own synths then render — so the LLM only picks parameters, it never
 * generates audio. Keeps cost tiny and output fully editable.
 */
const KITS = ['tr808', 'tr909', 'acoustic', 'trap', 'lofi', 'techno', 'boombap', 'edm', 'minimal'];
const SCALES = ['minor', 'major', 'harmonic', 'dorian', 'phrygian', 'blues', 'pentaMinor', 'pentaMajor'];

const SYSTEM = `You translate a music prompt into a JSON beat spec for a browser DAW.
Return ONLY JSON, no prose, with exactly these fields:
{"kitId": one of ${JSON.stringify(KITS)},
 "bpm": integer 40-250,
 "scaleId": one of ${JSON.stringify(SCALES)},
 "root": integer 0-11 (0=C,1=C#,...,11=B),
 "density": number 0.4-1.9 (how busy),
 "addBass": boolean,
 "addChords": boolean}
Pick musically sensible values for the described genre, mood, key and tempo.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const key = process.env.OPENAI_API_KEY;
  const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.BTZ_AI_MODEL || 'gpt-4o-mini';
  if (!key) { res.status(200).json({ enabled: false }); return; }

  const prompt = (req.body && req.body.prompt ? String(req.body.prompt) : '').slice(0, 500);
  if (!prompt.trim()) { res.status(400).json({ error: 'empty prompt' }); return; }

  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!r.ok) { res.status(200).json({ enabled: true, spec: null, error: `upstream ${r.status}` }); return; }
    const data = await r.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content : '{}';
    let spec = null;
    try { spec = JSON.parse(content); } catch (e) { spec = null; }
    res.status(200).json({ enabled: true, spec });
  } catch (e) {
    // Never break the client — it will use the local parser.
    res.status(200).json({ enabled: true, spec: null, error: 'request failed' });
  }
}
