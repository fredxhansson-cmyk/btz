import React, { useEffect, useRef, useState } from 'react';
import { useStudio } from '../../lib/studio/StudioContext';
import { keyName } from '../../lib/studio/constants';

// Landscape play mode for phones: flip the device sideways and a full-width
// performance surface appears — a piano keyboard, drum pads, or mixer faders —
// playing (and recording into) the selected channel live.
const WHITE = [0, 2, 4, 5, 7, 9, 11];
const BLACK = { 0: 1, 1: 3, 3: 6, 4: 8, 5: 10 }; // white-index -> black semitone offset

export default function PlaySurface() {
  const { ui, setUi, engine, project, dispatch, recordNote, finishRecordedNote } = useStudio();
  const [landscape, setLandscape] = useState(false);
  const [open, setOpen] = useState(false);
  const [octave, setOctave] = useState(3);
  const [mode, setMode] = useState('keys');
  const held = useRef(new Map());

  useEffect(() => {
    const check = () => setLandscape(typeof window !== 'undefined' && window.innerWidth > window.innerHeight);
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => { window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check); };
  }, []);

  if (!ui.touch || !landscape) return null;

  const ch = project.selectedChannel || (project.channels[0] && project.channels[0].id);
  const on = (key, vel = 0.9) => {
    try { engine.ensureContext(); engine.noteOn(ch, key, vel); } catch (e) { /* noop */ }
    const rec = (ui.recording && recordNote) ? recordNote(key, vel, ch) : null;
    held.current.set(key, rec);
  };
  const off = (key) => {
    try { engine.noteOff(ch, key); } catch (e) { /* noop */ }
    const rec = held.current.get(key); held.current.delete(key);
    if (rec && finishRecordedNote) finishRecordedNote(rec);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Play mode"
        style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 80, height: 44, padding: '0 16px', borderRadius: 999, border: '1px solid var(--accent)', background: 'var(--panel)', color: 'var(--accent)', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,.45)' }}
      >🎹 Play</button>
    );
  }

  const btn = (active) => ({ height: 38, padding: '0 14px', borderRadius: 'var(--r-sm)', border: `1px solid ${active ? 'var(--accent)' : 'var(--line-3)'}`, background: active ? 'var(--accent)' : 'transparent', color: active ? 'var(--accent-ink)' : 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' });

  // ----- Keys -----
  const renderKeys = () => {
    const octaves = 2;
    const whites = [];
    for (let o = 0; o < octaves; o++) for (const w of WHITE) whites.push((octave + o) * 12 + w);
    return (
      <div style={{ flex: 1, display: 'flex', position: 'relative', touchAction: 'none', overflow: 'hidden' }}>
        {whites.map((key, i) => (
          <div
            key={key}
            onPointerDown={(e) => { e.preventDefault(); on(key); e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerUp={() => off(key)}
            onPointerCancel={() => off(key)}
            style={{ flex: 1, borderLeft: i ? '1px solid rgba(0,0,0,.4)' : 'none', background: 'var(--pr-key-white, #eef2f9)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8, color: '#5b626c', fontSize: 10, fontFamily: 'var(--font-mono)', userSelect: 'none' }}
          >{key % 12 === 0 ? keyName(key) : ''}</div>
        ))}
        {/* black keys */}
        {whites.map((key, i) => {
          const wi = WHITE.indexOf(key % 12);
          const off2 = BLACK[wi];
          if (off2 == null) return null;
          const bk = Math.floor(key / 12) * 12 + off2;
          const leftPct = ((i + 0.68) / whites.length) * 100;
          return (
            <div
              key={`b${bk}`}
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); on(bk); e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerUp={(e) => { e.stopPropagation(); off(bk); }}
              onPointerCancel={() => off(bk)}
              style={{ position: 'absolute', top: 0, left: `${leftPct}%`, width: `${(100 / whites.length) * 0.62}%`, height: '62%', background: 'var(--pr-key-black, #1a2029)', borderRadius: '0 0 4px 4px', border: '1px solid #000', touchAction: 'none' }}
            />
          );
        })}
      </div>
    );
  };

  // ----- Pads (drum machine) -----
  const renderPads = () => (
    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${Math.min(8, Math.max(4, project.channels.length))}, 1fr)`, gap: 8, padding: 10, touchAction: 'none' }}>
      {project.channels.map((c) => (
        <button
          key={c.id}
          onPointerDown={(e) => { e.preventDefault(); dispatch({ type: 'select.channel', id: c.id }); try { engine.ensureContext(); engine.preview(c.id); } catch (er) { /* noop */ } const rec = (ui.recording && recordNote) ? recordNote(60, 1, c.id) : null; if (rec && finishRecordedNote) setTimeout(() => finishRecordedNote(rec), 90); }}
          style={{ borderRadius: 'var(--r-md)', border: `2px solid ${c.color || 'var(--accent)'}`, background: 'var(--panel-nested, var(--surface))', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, textAlign: 'center' }}
        >{c.name}</button>
      ))}
    </div>
  );

  // ----- Mixer faders -----
  const renderMixer = () => (
    <div style={{ flex: 1, display: 'flex', gap: 10, padding: 10, overflowX: 'auto', touchAction: 'pan-x' }}>
      {project.channels.map((c) => (
        <div key={c.id} style={{ flex: '0 0 62px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>{c.name}</span>
          <input
            type="range" min={0} max={1.2} step={0.01} value={c.vol == null ? 0.8 : c.vol}
            onChange={(e) => dispatch({ type: 'channel.update', id: c.id, patch: { vol: parseFloat(e.target.value) }, live: true, key: 'vol' })}
            style={{ writingMode: 'vertical-lr', direction: 'rtl', width: 28, flex: 1, accentColor: c.color || 'var(--accent)' }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" onClick={() => dispatch({ type: 'channel.update', id: c.id, patch: { mute: !c.mute } })} style={{ width: 26, height: 24, borderRadius: 4, border: 'none', background: c.mute ? 'var(--rec)' : 'var(--meter-track)', color: c.mute ? '#fff' : 'var(--text-4)', fontSize: 10, fontWeight: 700 }}>M</button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 85, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--line)', fontFamily: 'var(--font-ui)' }}>
        <button type="button" style={btn(mode === 'keys')} onClick={() => setMode('keys')}>🎹 Keys</button>
        <button type="button" style={btn(mode === 'pads')} onClick={() => setMode('pads')}>▦ Pads</button>
        <button type="button" style={btn(mode === 'mixer')} onClick={() => setMode('mixer')}>🎚 Mixer</button>
        {mode === 'keys' && (
          <>
            <button type="button" style={btn(false)} onClick={() => setOctave((v) => Math.max(0, v - 1))}>Oct −</button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)' }}>C{octave}</span>
            <button type="button" style={btn(false)} onClick={() => setOctave((v) => Math.min(7, v + 1))}>Oct +</button>
          </>
        )}
        <button type="button" title="Arm recording — play to capture into the pattern" style={{ ...btn(false), marginLeft: 'auto', borderColor: ui.recording ? 'var(--rec)' : 'var(--line-3)', background: ui.recording ? 'var(--rec)' : 'transparent', color: ui.recording ? '#fff' : 'var(--text-2)' }} onClick={() => setUi({ recording: !ui.recording })}>● Rec</button>
        <button type="button" style={btn(false)} onClick={() => setOpen(false)}>✕ Close</button>
      </div>
      {mode === 'keys' && renderKeys()}
      {mode === 'pads' && renderPads()}
      {mode === 'mixer' && renderMixer()}
    </div>
  );
}
