/**
 * Fuse Assistant — an in-app help AI you can ask about the platform.
 * If OPENAI_API_KEY is set it answers with a small model primed on how Fuse
 * works; otherwise it returns { enabled: false } and the client falls back to
 * a built-in offline knowledge base. Either way the user gets an answer.
 */
const SYSTEM = `You are Fuse Assistant, the friendly in-app help guide for Fuse — a browser-based AI music studio (drum machine, channel-rack step sequencer, piano roll, arrangement, mixer, mastering, recording, a big preset sound library, and an AI beat generator called "Fuse Brain"). Answer ONLY questions about using Fuse. Be concise and practical: 1–4 short sentences or a short numbered list of steps. Mention the relevant view (Instruments, Piano Roll, Arrangement, Mixer, Mastering) and any keyboard shortcut (F5 Arrangement, F6 Instruments, F7 Piano Roll, F8 Drum Machine, F9 Mixer, F10 Automation, F11 Mastering, Space play/stop, ⌘K command bar). If asked something unrelated to Fuse, gently steer back to the studio.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const key = process.env.OPENAI_API_KEY;
  const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.BTZ_AI_MODEL || 'gpt-4o-mini';
  if (!key) { res.status(200).json({ enabled: false }); return; }

  const question = (req.body && req.body.question ? String(req.body.question) : '').slice(0, 800);
  if (!question.trim()) { res.status(400).json({ error: 'empty question' }); return; }

  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 320,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: question },
        ],
      }),
    });
    if (!r.ok) { res.status(200).json({ enabled: false }); return; }
    const d = await r.json();
    const answer = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    res.status(200).json({ enabled: true, answer: (answer || '').trim() });
  } catch (e) {
    res.status(200).json({ enabled: false });
  }
}
