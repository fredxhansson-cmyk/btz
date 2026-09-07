import React, { useEffect, useRef, useState } from 'react';
import s from '../../styles/studio.module.css';
import { useStudio } from '../../lib/studio/StudioContext';
import { peaks } from '../../lib/studio/samples';

// Sample from a URL: load a direct audio file, pick a region on the waveform and
// import that slice as a playable sampler channel. Direct audio files only — no
// YouTube/Spotify ripping — and you must have the rights to sample it.
export default function SamplePanel({ onClose }) {
  const { engine, setHint, decodeUrlAudio, addBufferChannel } = useStudio();
  const [url, setUrl] = useState('');
  const [buffer, setBuffer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const canvasRef = useRef(null);
  const srcRef = useRef(null);
  const dur = buffer ? buffer.duration : 0;

  const load = async () => {
    const u = url.trim();
    if (!u || busy) return;
    setBusy(true);
    try {
      const buf = await decodeUrlAudio(u);
      setBuffer(buf); setA(0); setB(buf.duration);
      setHint(`Loaded ${buf.duration.toFixed(1)}s of audio — drag the sliders to pick a section.`);
    } catch (e) { setHint(e.message || 'Could not load that URL.'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    const cv = canvasRef.current; if (!cv || !buffer) return;
    const w = cv.width = cv.clientWidth * 2; const h = cv.height = 130 * 2;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    const pk = peaks(buffer, Math.floor(w / 3));
    ctx.fillStyle = 'rgba(54,178,255,0.85)';
    for (let i = 0; i < pk.length; i++) { const v = pk[i] * (h * 0.46); const x = (i / pk.length) * w; ctx.fillRect(x, h / 2 - v, 2, v * 2); }
    // region shading
    const xa = (a / dur) * w; const xb = (b / dur) * w;
    ctx.fillStyle = 'rgba(255,116,110,0.16)';
    ctx.fillRect(xa, 0, xb - xa, h);
    ctx.strokeStyle = '#ff746e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xa, 0); ctx.lineTo(xa, h); ctx.moveTo(xb, 0); ctx.lineTo(xb, h); ctx.stroke();
  }, [buffer, a, b, dur]);

  const stop = () => { try { if (srcRef.current) srcRef.current.stop(); } catch (e) { /* noop */ } srcRef.current = null; };
  const preview = () => {
    if (!buffer) return; stop();
    const ctx = engine.ensureContext(); if (!ctx) return;
    const src = ctx.createBufferSource(); src.buffer = buffer; src.connect(ctx.destination);
    src.start(0, a, Math.max(0.02, b - a)); srcRef.current = src;
  };

  const importSel = async () => {
    if (!buffer) return;
    const ctx = engine.ensureContext(); const sr = buffer.sampleRate;
    const s0 = Math.floor(a * sr); const e0 = Math.max(s0 + 1, Math.floor(b * sr));
    const len = e0 - s0;
    const out = ctx.createBuffer(buffer.numberOfChannels, len, sr);
    for (let c = 0; c < buffer.numberOfChannels; c++) out.getChannelData(c).set(buffer.getChannelData(c).subarray(s0, e0));
    setBusy(true);
    try { await addBufferChannel(out, `Sample ${(b - a).toFixed(1)}s`); setHint('Sampled section added as a channel — pitch it in the piano roll.'); onClose(); }
    finally { setBusy(false); }
  };

  const field = { height: 40, padding: '0 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line-3)', background: 'var(--field)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-ui)' };

  return (
    <div className={s.modalBack} onPointerDown={onClose}>
      <div className={`${s.modal} ${s.settingsModal}`} onPointerDown={(e) => e.stopPropagation()} style={{ width: 'min(880px, 94vw)' }}>
        <div className={s.modalHead}>
          <span className={s.pluginTitle}>Sample from URL</span>
          <span className={s.dim}>load a direct audio file &amp; grab a section</span>
          <div className={s.spacer} />
          <button type="button" className={s.xBtn} onClick={onClose}>×</button>
        </div>
        <div className={s.settingsBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...field, flex: 1 }} placeholder="https://…/audio.mp3 (a direct audio file)" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
            <button type="button" className={`${s.btn} ${s.on}`} disabled={busy} onClick={load}>{busy ? 'Loading…' : 'Load'}</button>
          </div>

          {buffer && (
            <>
              <canvas ref={canvasRef} style={{ width: '100%', height: 130, background: 'var(--gridsurface)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 60px', gap: 8, alignItems: 'center' }}>
                <span className={s.dim}>Start</span>
                <input type="range" min={0} max={dur} step={0.01} value={a} onChange={(e) => setA(Math.min(parseFloat(e.target.value), b - 0.02))} style={{ accentColor: 'var(--accent)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right' }}>{a.toFixed(2)}s</span>
                <span className={s.dim}>End</span>
                <input type="range" min={0} max={dur} step={0.01} value={b} onChange={(e) => setB(Math.max(parseFloat(e.target.value), a + 0.02))} style={{ accentColor: 'var(--accent)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right' }}>{b.toFixed(2)}s</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={s.btn} onClick={preview}>▶ Preview selection</button>
                <button type="button" className={s.btn} onClick={stop}>■ Stop</button>
                <div className={s.spacer} />
                <button type="button" className={`${s.btn} ${s.on}`} disabled={busy} onClick={importSel}>＋ Import selection ({(b - a).toFixed(1)}s)</button>
              </div>
            </>
          )}

          <div className={s.helpBox}>
            Works with <b>direct audio files</b> (.mp3 / .wav / .ogg) you have the rights to sample — your own uploads, or royalty-free / Creative-Commons sources (e.g. Freesound). YouTube and Spotify can&apos;t be sampled here: it violates their terms and Spotify audio is DRM-protected. <b>You are responsible for the rights</b> to anything you sample.
          </div>
        </div>
      </div>
    </div>
  );
}
