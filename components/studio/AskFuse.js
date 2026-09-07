import React, { useEffect, useRef, useState } from 'react';

// Fuse Assistant — a discreet, always-available AI you can ask about the
// platform. Uses the /api/ai/help LLM when a key is configured, otherwise a
// built-in offline knowledge base so it always answers.
const KB = [
  [/(make|start|begin|create).*(beat|track|song)|how.*(begin|start)/i, 'Two ways: press F8 for the Drum Machine (or F6 Instruments) and click the step cells to place hits, then Space to play. Or open Fuse Brain (✨, top-right) and describe the beat you want — it builds an editable pattern.'],
  [/(note|melody|chord|piano)/i, 'Open the Piano Roll (F7). With the Draw tool, click-and-drag on the grid to place a note and set its length in one motion. Drag a note to move it, drag its right edge to resize, and drag up/down to change pitch.'],
  [/(step|sequenc|drum|pad)/i, 'In Instruments (F6) each row is a channel — click the 16 step cells to program a pattern. Drag a lit step up/down to change its pitch. F8 opens the pad-based Drum Machine.'],
  [/(export|render|bounce|wav|mp3|aiff|stems|download)/i, 'File menu → Export full track (WAV / MP3 / AIFF) or Export stems. It renders offline so it stays fast and fully in your control.'],
  [/(mix|fader|volume|pan|bus|insert)/i, 'Open the Mixer (F9). Each channel has a fader, pan and Mute/Solo; add insert effects and route to buses. Only 3 accent colours are used so channels stay easy to read.'],
  [/(master|loud|lufs|limiter|finish)/i, 'Open Mastering (F11). Pick a target like "Streaming −14 LUFS" or hit Auto-master; the meter shows integrated loudness so you release at the right level.'],
  [/(record|mic|line|input|sing)/i, 'Click the 🎙 in the transport (or the Record tab) to capture mic / line input. Arm a channel and hit record; count-in is in the transport bar.'],
  [/(arrange|song|clip|timeline|section)/i, 'Open Arrangement (F5). Click a lane to drop the selected pattern as a clip, drag its right edge to lengthen, drag to move it (even across tracks). Switch PAT ▸ SONG in the transport to hear the whole song.'],
  [/(ai|brain|generate|prompt)/i, 'Open Fuse Brain (✨, top-right). Type a prompt like "dark trap 140 bpm" and it builds a full, editable beat — the AI only picks parameters, your synths render the sound.'],
  [/(save|project|load|open)/i, 'File → Save project (Ctrl+S), or open "My projects" to manage your saved library. Everything stays editable later — nothing is flattened.'],
  [/(shortcut|keyboard|key|hotkey)/i, 'F5 Arrangement · F6 Instruments · F7 Piano Roll · F8 Drums · F9 Mixer · F10 Automation · F11 Mastering · Space play/stop · ⌘K command bar.'],
  [/(sound|library|instrument|preset|browse|808|bass|lead)/i, 'Browse the sound library on the left. Click a sound to add it as a channel, or hit the ▶ to preview. There are 150+ presets across drums and instruments — all editable synth patches, no big downloads.'],
  [/(theme|dark|light|color)/i, 'Toggle light / dark with the ◐ / ☀ button in the bottom bar.'],
  [/(automation|envelope|volume line|keyframe)/i, 'Open Automation (F10) or use the Volume (pen) tool in Arrangement: click a clip to add volume keyframes, drag them to shape the level, shift/right-click to remove.'],
];

function localAnswer(q) {
  for (const [re, a] of KB) if (re.test(q)) return a;
  return 'Ask me how to make a beat, add notes, use the mixer, master your track, record, export, or find sounds — I’m here to help you use Fuse. Try: "how do I make a beat?"';
}

export default function AskFuse() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: 'ai', text: 'Hi! I’m Fuse Assistant. Ask me anything about using the studio.' }]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [msgs, open]);

  const ask = async () => {
    const question = q.trim();
    if (!question || busy) return;
    setMsgs((m) => [...m, { role: 'me', text: question }]);
    setQ('');
    setBusy(true);
    let answer = null;
    try {
      const r = await fetch('/api/ai/help', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) });
      const d = await r.json();
      if (d && d.enabled && d.answer) answer = d.answer;
    } catch (e) { /* offline / no key */ }
    if (!answer) answer = localAnswer(question);
    setMsgs((m) => [...m, { role: 'ai', text: answer }]);
    setBusy(false);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Ask Fuse — help with the studio"
          style={{
            position: 'fixed', right: 16, bottom: 64, zIndex: 70, height: 38, padding: '0 14px',
            borderRadius: 999, border: '1px solid var(--line-strong)', background: 'var(--panel)',
            color: 'var(--text-2)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 8px 24px rgba(0,0,0,.4)',
          }}
        >
          <span style={{ color: 'var(--accent)' }}>✦</span> Ask Fuse
        </button>
      )}
      {open && (
        <div
          style={{
            position: 'fixed', right: 16, bottom: 64, zIndex: 71, width: 'min(360px, 92vw)', height: 'min(460px, 70vh)',
            background: 'var(--panel)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-lg)',
            boxShadow: '0 20px 50px rgba(0,0,0,.55)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ color: 'var(--accent)' }}>✦</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Fuse Assistant</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>help &amp; how-to</span>
            <button type="button" onClick={() => setOpen(false)} title="Close" style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-3)', fontSize: 16, cursor: 'pointer' }}>×</button>
          </div>
          <div ref={bodyRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'me' ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
                <div style={{
                  padding: '9px 12px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.5,
                  background: m.role === 'me' ? 'var(--accent)' : 'var(--field)',
                  color: m.role === 'me' ? 'var(--accent-ink)' : 'var(--text)',
                  border: m.role === 'me' ? 'none' : '1px solid var(--line)',
                }}>{m.text}</div>
              </div>
            ))}
            {busy && <div style={{ alignSelf: 'flex-start', color: 'var(--muted)', fontSize: 12.5, padding: '0 4px' }}>thinking…</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--line)' }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
              placeholder="Ask about Fuse…"
              style={{ flex: 1, minWidth: 0, height: 38, padding: '0 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line-3)', background: 'var(--field)', color: 'var(--text)', fontSize: 13.5, fontFamily: 'var(--font-ui)' }}
            />
            <button type="button" onClick={ask} disabled={busy} style={{ height: 38, padding: '0 16px', borderRadius: 'var(--r-sm)', border: 'none', background: 'var(--accent)', color: 'var(--accent-ink)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Ask</button>
          </div>
        </div>
      )}
    </>
  );
}
